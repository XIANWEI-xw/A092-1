// js/chat-db.js · Unified Storage Engine v2
// 统一存储引擎：内存缓存 + 批量异步写入 + 大数据分离

var ChatDB = (function () {
    'use strict';

    var DB_NAME    = 'CoutureOS_ChatDB';
    var DB_VERSION = 2;
    var db         = null;
    var dbReady    = false;
    var dbQueue    = [];

    /* ══════════════════════════════════════
       内存缓存层 — 所有读取优先走内存
    ══════════════════════════════════════ */
    var _cache = {
        entities:      null,   // Array | null
        avatars:       {},     // id -> base64
        conversations: {},     // id -> Array
        convLoaded:    false
    };

    /* ══════════════════════════════════════
       写入队列 — 防抖批量落盘
    ══════════════════════════════════════ */
    var _writeQ = {
        entities: {},   // id -> {data, cb}
        avatars:  {},   // id -> {data, cb}  (null data = delete)
        convs:    {},   // id -> {messages, cb}
        entTimer: null,
        convTimer: null,
        DELAY: 120
    };

    /* ══════════════════════════════════════
       DB 初始化
    ══════════════════════════════════════ */
    function open(cb) {
        if (dbReady && db) { cb(db); return; }
        if (db === 'opening') { dbQueue.push(cb); return; }
        db = 'opening';

        var req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = function (e) {
            var d = e.target.result;
            var oldV = e.oldVersion;

            if (!d.objectStoreNames.contains('entities')) {
                d.createObjectStore('entities', { keyPath: 'id' });
            }
            if (!d.objectStoreNames.contains('conversations')) {
                d.createObjectStore('conversations', { keyPath: 'id' });
            }
            if (!d.objectStoreNames.contains('avatars')) {
                d.createObjectStore('avatars', { keyPath: 'id' });
            }
            // v2: 大型二进制 store（背景图、音频元数据等）
            if (!d.objectStoreNames.contains('blobs')) {
                d.createObjectStore('blobs', { keyPath: 'id' });
            }
            // v2: 通用 kv store 替代 localStorage
            if (!d.objectStoreNames.contains('kv')) {
                d.createObjectStore('kv', { keyPath: 'k' });
            }
        };

        req.onsuccess = function (e) {
            db = e.target.result;
            dbReady = true;

            db.onerror = function (ev) {
                console.warn('[ChatDB] DB error', ev.target.error);
            };

            // 处理等待队列
            var q = dbQueue.slice(); dbQueue = [];
            q.forEach(function (fn) { fn(db); });
            cb(db);
        };

        req.onerror = function (e) {
            console.warn('[ChatDB] open failed:', e.target.error);
            db = null; dbReady = false;
            var q = dbQueue.slice(); dbQueue = [];
            q.forEach(function (fn) { fn(null); });
            cb(null);
        };

        req.onblocked = function () {
            console.warn('[ChatDB] open blocked — close other tabs');
        };
    }

    /* ══════════════════════════════════════
       低层 CRUD（内部用）
    ══════════════════════════════════════ */
    function _put(storeName, data, cb) {
        open(function (d) {
            if (!d) { if (cb) cb(); return; }
            try {
                var tx = d.transaction(storeName, 'readwrite');
                tx.objectStore(storeName).put(data);
                tx.oncomplete = function () { if (cb) cb(); };
                tx.onerror    = function () { if (cb) cb(); };
            } catch(e) { if (cb) cb(); }
        });
    }

    function _get(storeName, id, cb) {
        open(function (d) {
            if (!d) { cb(null); return; }
            try {
                var tx  = d.transaction(storeName, 'readonly');
                var req = tx.objectStore(storeName).get(id);
                req.onsuccess = function () { cb(req.result || null); };
                req.onerror   = function () { cb(null); };
            } catch(e) { cb(null); }
        });
    }

    function _getAll(storeName, cb) {
        open(function (d) {
            if (!d) { cb([]); return; }
            try {
                var tx  = d.transaction(storeName, 'readonly');
                var req = tx.objectStore(storeName).getAll();
                req.onsuccess = function () { cb(req.result || []); };
                req.onerror   = function () { cb([]); };
            } catch(e) { cb([]); }
        });
    }

    function _del(storeName, id, cb) {
        open(function (d) {
            if (!d) { if (cb) cb(); return; }
            try {
                var tx = d.transaction(storeName, 'readwrite');
                tx.objectStore(storeName).delete(id);
                tx.oncomplete = function () { if (cb) cb(); };
                tx.onerror    = function () { if (cb) cb(); };
            } catch(e) { if (cb) cb(); }
        });
    }

    function _clearStore(storeName, cb) {
        open(function (d) {
            if (!d) { if (cb) cb(); return; }
            try {
                var tx = d.transaction(storeName, 'readwrite');
                tx.objectStore(storeName).clear();
                tx.oncomplete = function () { if (cb) cb(); };
                tx.onerror    = function () { if (cb) cb(); };
            } catch(e) { if (cb) cb(); }
        });
    }

    /* ══════════════════════════════════════
       批量写入 flush
    ══════════════════════════════════════ */
    function _flushEntities() {
        _writeQ.entTimer = null;
        var queue = _writeQ.entities;
        _writeQ.entities = {};
        var ids = Object.keys(queue);
        if (!ids.length) return;

        open(function (d) {
            if (!d) return;
            try {
                var tx      = d.transaction(['entities', 'avatars'], 'readwrite');
                var entSt   = tx.objectStore('entities');
                var avSt    = tx.objectStore('avatars');
                var cbs     = [];

                ids.forEach(function (id) {
                    var item = queue[id];
                    entSt.put(item.data);
                    if (item.avatar) {
                        avSt.put({ id: id, data: item.avatar });
                    } else {
                        avSt.delete(id);
                    }
                    if (item.cb) cbs.push(item.cb);
                });

                tx.oncomplete = function () { cbs.forEach(function (fn) { fn(); }); };
                tx.onerror    = function () { cbs.forEach(function (fn) { fn(); }); };
            } catch(e) {}
        });
    }

    function _flushConvs() {
        _writeQ.convTimer = null;
        var queue = _writeQ.convs;
        _writeQ.convs = {};
        var ids = Object.keys(queue);
        if (!ids.length) return;

        open(function (d) {
            if (!d) return;
            try {
                var tx    = d.transaction('conversations', 'readwrite');
                var store = tx.objectStore('conversations');
                var cbs   = [];

                ids.forEach(function (id) {
                    store.put({ id: id, messages: queue[id].messages });
                    if (queue[id].cb) cbs.push(queue[id].cb);
                });

                tx.oncomplete = function () { cbs.forEach(function (fn) { fn(); }); };
                tx.onerror    = function () { cbs.forEach(function (fn) { fn(); }); };
            } catch(e) {}
        });
    }

    /* ══════════════════════════════════════
       高层 API — Entity
    ══════════════════════════════════════ */
    function saveEntity(ent, cb) {
        var data = {};
        for (var k in ent) {
            if (k !== 'avatar') data[k] = ent[k];
        }

        // 同步更新内存缓存
        if (_cache.entities) {
            var idx = -1;
            for (var i = 0; i < _cache.entities.length; i++) {
                if (_cache.entities[i].id === ent.id) { idx = i; break; }
            }
            var cached = JSON.parse(JSON.stringify(data));
            cached.avatar = ent.avatar || _cache.avatars[ent.id] || '';
            if (idx === -1) _cache.entities.push(cached);
            else _cache.entities[idx] = cached;
        }
        if (ent.avatar) _cache.avatars[ent.id] = ent.avatar;

        // 入队落盘
        _writeQ.entities[ent.id] = { data: data, avatar: ent.avatar || null, cb: cb };
        if (_writeQ.entTimer) clearTimeout(_writeQ.entTimer);
        _writeQ.entTimer = setTimeout(_flushEntities, _writeQ.DELAY);
    }

    function loadEntities(cb) {
        // 内存命中
        if (_cache.entities !== null) {
            cb(_cache.entities.slice());
            return;
        }

        _getAll('entities', function (ents) {
            if (!ents.length) {
                _cache.entities = [];
                cb([]);
                return;
            }

            var remaining = ents.length;
            ents.forEach(function (ent) {
                // 先从内存avatar缓存查
                if (_cache.avatars[ent.id]) {
                    ent.avatar = _cache.avatars[ent.id];
                    remaining--;
                    if (remaining === 0) _finishLoadEntities(ents, cb);
                    return;
                }
                _get('avatars', ent.id, function (av) {
                    if (av && av.data) {
                        ent.avatar = av.data;
                        _cache.avatars[ent.id] = av.data;
                    }
                    remaining--;
                    if (remaining === 0) _finishLoadEntities(ents, cb);
                });
            });
        });
    }

    function _finishLoadEntities(ents, cb) {
        _cache.entities = ents.slice();
        cb(ents);
    }

    function deleteEntity(id, cb) {
        // 从内存缓存移除
        if (_cache.entities) {
            _cache.entities = _cache.entities.filter(function (e) { return e.id !== id; });
        }
        delete _cache.avatars[id];
        delete _cache.conversations[id];

        // 从写入队列移除
        delete _writeQ.entities[id];
        delete _writeQ.convs[id];

        _del('entities', id, function () {
            _del('avatars', id, function () {
                _del('conversations', id, cb);
            });
        });
    }

    /* ══════════════════════════════════════
       高层 API — Conversation
    ══════════════════════════════════════ */
    function saveConversation(id, msgs, cb) {
        // 同步更新内存缓存
        _cache.conversations[id] = msgs ? msgs.slice() : [];

        // 入队落盘
        _writeQ.convs[id] = { messages: _cache.conversations[id], cb: cb };
        if (_writeQ.convTimer) clearTimeout(_writeQ.convTimer);
        _writeQ.convTimer = setTimeout(_flushConvs, _writeQ.DELAY);
    }

    function loadConversation(id, cb) {
        if (_cache.conversations[id] !== undefined) {
            cb(_cache.conversations[id].slice());
            return;
        }
        _get('conversations', id, function (data) {
            var msgs = data ? data.messages : [];
            _cache.conversations[id] = msgs;
            cb(msgs);
        });
    }

    function loadAllConversations(cb) {
        if (_cache.convLoaded) {
            var result = {};
            Object.keys(_cache.conversations).forEach(function (k) {
                result[k] = _cache.conversations[k].slice();
            });
            cb(result);
            return;
        }

        _getAll('conversations', function (all) {
            var result = {};
            all.forEach(function (item) {
                result[item.id] = item.messages || [];
                _cache.conversations[item.id] = item.messages || [];
            });
            _cache.convLoaded = true;
            cb(result);
        });
    }

    /* ══════════════════════════════════════
       高层 API — KV（替代 localStorage 大数据）
    ══════════════════════════════════════ */
    function kvSet(key, value, cb) {
        _put('kv', { k: key, v: value }, cb);
    }

    function kvGet(key, cb) {
        _get('kv', key, function (row) {
            cb(row ? row.v : null);
        });
    }

    function kvDel(key, cb) {
        _del('kv', key, cb);
    }

    /* ══════════════════════════════════════
       高层 API — Blob（大型二进制，背景图等）
    ══════════════════════════════════════ */
    function blobSet(key, data, cb) {
        _put('blobs', { id: key, data: data }, cb);
    }

    function blobGet(key, cb) {
        _get('blobs', key, function (row) {
            cb(row ? row.data : null);
        });
    }

    function blobDel(key, cb) {
        _del('blobs', key, cb);
    }

    /* ══════════════════════════════════════
       clearAll
    ══════════════════════════════════════ */
    function clearAll(cb) {
        // 清内存
        _cache.entities      = null;
        _cache.avatars       = {};
        _cache.conversations = {};
        _cache.convLoaded    = false;
        _writeQ.entities     = {};
        _writeQ.convs        = {};
        if (_writeQ.entTimer)  clearTimeout(_writeQ.entTimer);
        if (_writeQ.convTimer) clearTimeout(_writeQ.convTimer);

        _clearStore('entities', function () {
            _clearStore('conversations', function () {
                _clearStore('avatars', function () {
                    _clearStore('blobs', function () {
                        _clearStore('kv', cb);
                    });
                });
            });
        });
    }

    /* ══════════════════════════════════════
       缓存预热 — 应用启动时一次性全量加载
       调用后所有读取走内存，几乎零延迟
    ══════════════════════════════════════ */
    function warmup(cb) {
        loadAllConversations(function () {
            loadEntities(function () {
                if (cb) cb();
            });
        });
    }

    /* ══════════════════════════════════════
       暴露接口
    ══════════════════════════════════════ */
    return {
        // 原有接口（向后兼容）
        open:                 open,
        saveEntity:           saveEntity,
        loadEntities:         loadEntities,
        deleteEntity:         deleteEntity,
        saveConversation:     saveConversation,
        loadConversation:     loadConversation,
        loadAllConversations: loadAllConversations,
        clearAll:             clearAll,
        // 新增接口
        kvSet:   kvSet,
        kvGet:   kvGet,
        kvDel:   kvDel,
        blobSet: blobSet,
        blobGet: blobGet,
        blobDel: blobDel,
        warmup:  warmup
    };
})();
