// js/chat-db.js · IndexedDB 无限存储引擎

var ChatDB = (function () {
    'use strict';

    var DB_NAME = 'CoutureOS_ChatDB';
    var REQUIRED_STORES = ['entities', 'conversations', 'avatars'];
    var db = null;

    function ensureStores(d, cb) {
        var missing = REQUIRED_STORES.filter(function(s) { return !d.objectStoreNames.contains(s); });
        if (missing.length === 0) { cb(d); return; }
        var nextVer = d.version + 1;
        d.close();
        var upReq = indexedDB.open(DB_NAME, nextVer);
        upReq.onupgradeneeded = function(e) {
            var d2 = e.target.result;
            REQUIRED_STORES.forEach(function(s) {
                if (!d2.objectStoreNames.contains(s)) d2.createObjectStore(s, { keyPath: 'id' });
            });
        };
        upReq.onsuccess = function(e) { db = e.target.result; cb(db); };
        upReq.onerror = function() { console.warn('IndexedDB upgrade failed'); cb(null); };
    }

    function open(callback) {
        if (db) { callback(db); return; }
        var req = indexedDB.open(DB_NAME);
        req.onupgradeneeded = function (e) {
            var d = e.target.result;
            REQUIRED_STORES.forEach(function(s) {
                if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' });
            });
        };
        req.onsuccess = function (e) {
            db = e.target.result;
            ensureStores(db, callback);
        };
        req.onerror = function () {
            console.warn('IndexedDB failed, using localStorage fallback');
            callback(null);
        };
    }

    function put(store, data, callback) {
        open(function (d) {
            if (!d) { if (callback) callback(); return; }
            var tx = d.transaction(store, 'readwrite');
            var s = tx.objectStore(store);
            s.put(data);
            tx.oncomplete = function () { if (callback) callback(); };
            tx.onerror = function () { if (callback) callback(); };
        });
    }

    function get(store, id, callback) {
        open(function (d) {
            if (!d) { callback(null); return; }
            var tx = d.transaction(store, 'readonly');
            var s = tx.objectStore(store);
            var req = s.get(id);
            req.onsuccess = function () { callback(req.result || null); };
            req.onerror = function () { callback(null); };
        });
    }

    function getAll(store, callback) {
        open(function (d) {
            if (!d) { callback([]); return; }
            var tx = d.transaction(store, 'readonly');
            var s = tx.objectStore(store);
            var req = s.getAll();
            req.onsuccess = function () { callback(req.result || []); };
            req.onerror = function () { callback([]); };
        });
    }

    function del(store, id, callback) {
        open(function (d) {
            if (!d) { if (callback) callback(); return; }
            var tx = d.transaction(store, 'readwrite');
            var s = tx.objectStore(store);
            s.delete(id);
            tx.oncomplete = function () { if (callback) callback(); };
        });
    }

    function clearStore(store, callback) {
        open(function (d) {
            if (!d) { if (callback) callback(); return; }
            var tx = d.transaction(store, 'readwrite');
            var s = tx.objectStore(store);
            s.clear();
            tx.oncomplete = function () { if (callback) callback(); };
        });
    }

    /* ── 高层API ── */

    var _entityWriteQueue = {};
    var _entityWriteTimer = null;
    var _convWriteQueue = {};
    var _convWriteTimer = null;

    function flushEntityQueue() {
        _entityWriteTimer = null;
        var queue = _entityWriteQueue;
        _entityWriteQueue = {};
        var ids = Object.keys(queue);
        if (ids.length === 0) return;
        open(function (d) {
            if (!d) return;
            var tx = d.transaction(['entities', 'avatars'], 'readwrite');
            var entStore = tx.objectStore('entities');
            var avStore = tx.objectStore('avatars');
            ids.forEach(function (id) {
                var item = queue[id];
                var data = item.data;
                var avatar = item.avatar;
                entStore.put(data);
                if (avatar) {
                    avStore.put({ id: id, data: avatar });
                } else {
                    avStore.delete(id);
                }
            });
            tx.oncomplete = function () {
                ids.forEach(function (id) {
                    var cb = queue[id].cb;
                    if (cb) cb();
                });
            };
            tx.onerror = function () {};
        });
    }

    function flushConvQueue() {
        _convWriteTimer = null;
        var queue = _convWriteQueue;
        _convWriteQueue = {};
        var ids = Object.keys(queue);
        if (ids.length === 0) return;
        open(function (d) {
            if (!d) return;
            var tx = d.transaction('conversations', 'readwrite');
            var store = tx.objectStore('conversations');
            ids.forEach(function (id) {
                store.put({ id: id, messages: queue[id].messages });
            });
            tx.oncomplete = function () {
                ids.forEach(function (id) {
                    var cb = queue[id].cb;
                    if (cb) cb();
                });
            };
            tx.onerror = function () {};
        });
    }

    function saveEntity(ent, cb) {
        var data = {};
        for (var k in ent) {
            if (k !== 'avatar') data[k] = ent[k];
        }
        _entityWriteQueue[ent.id] = { data: data, avatar: ent.avatar || null, cb: cb };
        if (_entityWriteTimer) clearTimeout(_entityWriteTimer);
        _entityWriteTimer = setTimeout(flushEntityQueue, 80);
    }

    function loadEntities(cb) {
        getAll('entities', function (ents) {
            var remaining = ents.length;
            if (remaining === 0) { cb([]); return; }
            ents.forEach(function (ent) {
                get('avatars', ent.id, function (av) {
                    if (av && av.data) ent.avatar = av.data;
                    remaining--;
                    if (remaining === 0) cb(ents);
                });
            });
        });
    }

    function deleteEntity(id, cb) {
        del('entities', id, function () {
            del('avatars', id, function () {
                del('conversations', id, cb);
            });
        });
    }

    function saveConversation(id, msgs, cb) {
        _convWriteQueue[id] = { messages: msgs, cb: cb };
        if (_convWriteTimer) clearTimeout(_convWriteTimer);
        _convWriteTimer = setTimeout(flushConvQueue, 80);
    }

    function loadConversation(id, cb) {
        get('conversations', id, function (data) {
            cb(data ? data.messages : []);
        });
    }

    function loadAllConversations(cb) {
        getAll('conversations', function (all) {
            var result = {};
            all.forEach(function (item) {
                result[item.id] = item.messages;
            });
            cb(result);
        });
    }

    function clearAll(cb) {
        clearStore('entities', function () {
            clearStore('conversations', function () {
                clearStore('avatars', cb);
            });
        });
    }

    return {
        saveEntity: saveEntity,
        loadEntities: loadEntities,
        deleteEntity: deleteEntity,
        saveConversation: saveConversation,
        loadConversation: loadConversation,
        loadAllConversations: loadAllConversations,
        clearAll: clearAll,
        open: open
    };
})();
