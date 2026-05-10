// js/chat-app.js · A0nynx_3i Chat Application
// AI 多角色聊天客户端

(function () {
    'use strict';

    /* ══════════════════════════════════════
       数据存储 & 全局样式注入
    ══════════════════════════════════════ */
    var customCssStyle = document.createElement('style');
    customCssStyle.id = 'ca-custom-css-node';
    customCssStyle.textContent = localStorage.getItem('ca-custom-css') || '';
    document.head.appendChild(customCssStyle);

    var entities = [];
    var conversations = {};
    var totalUnread = 0;
    var dataReady = false;

    function saveEntities(cb) {
        var remaining = entities.length;
        if (remaining === 0) { if (cb) cb(); return; }
        entities.forEach(function (ent) {
            ChatDB.saveEntity(ent, function () {
                remaining--;
                if (remaining === 0 && cb) cb();
            });
        });
    }

    function saveOneEntity(ent, cb) {
        ChatDB.saveEntity(ent, cb);
    }

    function saveConversations(cb) {
        var keys = Object.keys(conversations);
        var remaining = keys.length;
        if (remaining === 0) { if (cb) cb(); return; }
        keys.forEach(function (k) {
            ChatDB.saveConversation(k, conversations[k], function () {
                remaining--;
                if (remaining === 0 && cb) cb();
            });
        });
    }

    function saveOneConversation(id, cb) {
        ChatDB.saveConversation(id, conversations[id] || [], cb);
    }

    var avatarColors = ['#1C1C1E','#2C2C2E','#3A3A3C','#48484A','#636366','#8E8E93'];
    function pickColor(name) { var sum = 0; for (var i = 0; i < name.length; i++) sum += name.charCodeAt(i); return avatarColors[sum % avatarColors.length]; }
    function getInitial(name) { return (name || '?').trim().charAt(0).toUpperCase(); }
    window.getInitial = getInitial; /* 暴露到全局，防止其它文件因为浏览器缓存旧代码而找不到该函数 */
    function timeNow() { var d = new Date(); return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); }
    function dateNow() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }

    /* ══════════════════════════════════════
       构建 HTML
    ══════════════════════════════════════ */
    function buildApp() {
        var animStyle = document.createElement('style');
        animStyle.textContent = 
            '.chat-app-window { transform: translateZ(0) !important; opacity: 0; visibility: hidden; pointer-events: none; transition: none !important; }' +
            '.chat-app-window.active { visibility: visible !important; pointer-events: auto !important; animation: ca-clip-reveal 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards !important; }' +
            '.chat-app-window.closing { pointer-events: none !important; animation: ca-clip-hide 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards !important; }' +
            '@keyframes ca-clip-reveal { 0% { opacity: 0; clip-path: inset(40% 15% 40% 15% round 32px); transform: scale(0.96) translateZ(0); } 100% { opacity: 1; clip-path: inset(0% 0% 0% 0% round 0px); transform: scale(1) translateZ(0); } }' +
            '@keyframes ca-clip-hide { 0% { opacity: 1; clip-path: inset(0% 0% 0% 0% round 0px); transform: scale(1) translateZ(0); } 100% { opacity: 0; clip-path: inset(40% 15% 40% 15% round 32px); transform: scale(0.96) translateZ(0); visibility: hidden; } }' +
            '@keyframes ca-plaque-swing { 0% { transform: translateY(-8px) rotate(-3deg); opacity: 0; } 45% { transform: translateY(1.5px) rotate(1.5deg); opacity: 1; } 65% { transform: translateY(-0.5px) rotate(-0.5deg); } 85% { transform: translateY(0) rotate(0.2deg); } 100% { transform: translateY(0) rotate(0deg); opacity: 1; } }' +
            '.ca-header-hanging { transform-origin: top center; }' +
            '.ca-header-hanging.anim-swing { animation: ca-plaque-swing 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }' +
            '.chat-area { -webkit-overflow-scrolling: touch; will-change: scroll-position; transform: translateZ(0); }' +
            '.msg-row { -webkit-transform: translateZ(0); transform: translateZ(0); will-change: transform, opacity; }' +
            '.bubble { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }' +
            '@media (min-width: 431px) {' +
                '.chat-app-window { top: 50% !important; left: 50% !important; bottom: auto !important; right: auto !important; transform: translate(-50%, -50%) translateZ(0) !important; }' +
                '@keyframes ca-clip-reveal { 0% { opacity: 0; clip-path: inset(40% 15% 40% 15% round 32px); transform: translate(-50%, -50%) scale(0.96) translateZ(0); } 100% { opacity: 1; clip-path: inset(0% 0% 0% 0% round 40px); transform: translate(-50%, -50%) scale(1) translateZ(0); } }' +
                '@keyframes ca-clip-hide { 0% { opacity: 1; clip-path: inset(0% 0% 0% 0% round 40px); transform: translate(-50%, -50%) scale(1) translateZ(0); } 100% { opacity: 0; clip-path: inset(40% 15% 40% 15% round 32px); transform: translate(-50%, -50%) scale(0.96) translateZ(0); visibility: hidden; } }' +
            '}';
        document.head.appendChild(animStyle);

        var el = document.createElement('div');
        el.className = 'chat-app-window';
        el.id = 'chatApp';
        el.innerHTML =
            '<div class="ca-axis-y"></div>' +
            '<div class="ca-bg-typo">Messages</div>' +

            /* Header */
            '<header class="ca-header">' +
                '<div class="ca-header-top">' +
                    '<div class="ca-hdr-btn" id="caBackHome">' +
                        '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>' +
                    '</div>' +
                    '<div class="ca-header-hanging">' +
                        '<div class="ca-wire"><div></div><div></div><div></div></div>' +
                        '<div class="ca-header-plaque" style="border-top: 0.5px solid rgba(21,21,21,0.3);">' +
                            '<div class="ca-plaque-dot" style="position:relative;display:flex;align-items:center;justify-content:center;">' +
                                '<div style="position:absolute;inset:-2px;border-radius:50%;padding:2px;background:linear-gradient(135deg, rgba(166,52,38,0.6) 0%, transparent 80%);-webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;"></div>' +
                                '<div style="width:12px;height:5px;background:rgba(21,21,21,0.12);border-radius:10px;position:absolute;bottom:3px;right:1px;transform:rotate(-15deg);opacity:0.6;"></div>' +
                                '<div style="width:10px;height:10px;background:rgba(21,21,21,0.06);border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:0;"></div>' +
                                '<div style="width:4px;height:4px;background:rgba(21,21,21,0.15);border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:0;"></div>' +
                                '<div style="position:relative;display:flex;align-items:center;justify-content:center;z-index:1;transform:translateY(-1px);">' +
                                    '<span style="position:absolute;font-size:13px;color:rgba(68,68,68,0.35);font-weight:bold;filter:blur(1.8px);letter-spacing:0;pointer-events:none;">՞•ﻌ•՞</span>' +
                                    '<span style="position:relative;font-size:13px;color:#444;font-weight:bold;letter-spacing:0;">՞•ﻌ•՞</span>' +
                                '</div>' +
                            '</div>' +
                            '<div class="ca-plaque-text">' +
                                '<span class="ca-plaque-title" id="caPlaqueTitle">Messages</span>' +
                                '<span class="ca-plaque-sub" id="caPlaqueSub">0 ENTITIES</span>' +
                            '</div>' +
                            '<div class="ca-plaque-sig" id="caPlaqueSig" style="color:#8B2A1E;opacity:1;filter:none;-webkit-mask-image:radial-gradient(ellipse at center, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 90%);mask-image:radial-gradient(ellipse at center, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 90%);">Chat</div>' +
                        '</div>'+
                    '</div>' +
                    '<div class="ca-header-actions">' +
                        '<div class="ca-hdr-btn" id="caMenuTrigger">' +
                            '<svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="ca-header-card">' +
                    '<div class="ca-capsule">' +
                        '<div class="ca-capsule-search">' +
                            '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                            '<input type="text" placeholder="Search..." id="caSearchInput">' +
                        '</div>' +
                        '<div class="ca-tab-pill" id="caTabRow">' +
                            '<div class="ca-tab active" data-tab="all">All</div>' +
                            '<div class="ca-tab" data-tab="unread">Unread</div>' +
                            '<div class="ca-tab" data-tab="pinned">Pinned</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</header>' +

            /* Pages */
            '<div class="ca-pages-wrap">' +
                '<div class="ca-page active" id="caPageChats"></div>' +
                '<div class="ca-page" id="caPageContacts"></div>' +
                '<div class="ca-page" id="caPageDiscover"></div>' +
                '<div class="ca-page" id="caPageMe"></div>' +
            '</div>' +

            /* Compose Button */
            '<div class="ca-compose-btn" id="caComposeBtn">' +
                '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' +
            '</div>' +

            /* Bottom Nav */
            '<nav class="ca-bottom-nav">' +
                '<div class="ca-nav-item active" data-page="chats">' +
                    '<div class="ca-nav-icon-wrap">' +
                        '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
                        '<div class="ca-nav-badge" id="caNavBadge" style="display:none;">0</div>' +
                    '</div>' +
                '</div>' +
                '<div class="ca-nav-sep"></div>' +
                '<div class="ca-nav-item" data-page="contacts">' +
                    '<div class="ca-nav-icon-wrap">' +
                        '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' +
                    '</div>' +
                '</div>' +
                '<div class="ca-nav-sep"></div>' +
                '<div class="ca-nav-item" data-page="discover">' +
                    '<div class="ca-nav-icon-wrap">' +
                        '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>' +
                    '</div>' +
                '</div>' +
                '<div class="ca-nav-sep"></div>' +
                '<div class="ca-nav-item" data-page="me">' +
                    '<div class="ca-nav-icon-wrap">' +
                        '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
                    '</div>' +
                '</div>' +
            '</nav>' +

            /* Menu Overlay */
            '<nav class="ca-menu-overlay" id="caMenuOverlay">' +
                '<div class="ca-menu-exit" id="caMenuClose">' +
                    '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</div>' +
                '<ul class="ca-menu-list">' +
                    '<li><a class="ca-menu-label" id="caMenuNewChat"><span class="ca-menu-num">01</span>New Chat<span class="ca-menu-cn">/. 新对话</span></a></li>' +
                    '<li><a class="ca-menu-label" id="caMenuClear"><span class="ca-menu-num">02</span>Clear All<span class="ca-menu-cn">/. 清空</span></a></li>' +
                    '<li><a class="ca-menu-label" id="caMenuSettings"><span class="ca-menu-num">03</span>Settings<span class="ca-menu-cn">/. 设置</span></a></li>' +
                '</ul>' +
            '</nav>' +

            /* Compose Overlay */
            '<div class="ca-compose-overlay" id="caComposeOverlay">' +
                '<div class="ca-compose-close" id="caComposeClose">' +
                    '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</div>' +
                '<div class="ca-dossier-wrap" style="padding:0;">' +
                    '<div class="ca-dossier">' +
                        '<div class="ca-dossier-tag">MSG_NEW_REF.01</div>' +
                        '<div class="ca-dossier-stamp">DRAFT</div>' +
                        '<h2>New Message</h2>' +
                        '<div class="ca-dossier-field">' +
                            '<label>01. Recipient / 收件人</label>' +
                            '<input type="text" id="caComposeRecipient" placeholder="Enter recipient name...">' +
                        '</div>' +
                        '<div class="ca-dossier-field" style="margin-bottom:24px;">' +
                            '<label>02. Message / 消息内容</label>' +
                            '<textarea id="caComposeMessage" placeholder="Write your message..."></textarea>' +
                        '</div>' +
                        '<div class="ca-dossier-footer">' +
                            '<div class="ca-dossier-brand">A0nynx_3i</div>' +
                            '<button class="ca-dossier-btn" id="caComposeSend">Send</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            '';

        el.insertAdjacentHTML('beforeend', buildChatDetailHTML());
        document.body.appendChild(el);
    }

    /* ══════════════════════════════════════
       渲染
    ══════════════════════════════════════ */

    var currentPage = 'chats';
    var currentChatId = null;

    var pageLabels = {
        chats:    { title: 'Messages',  sub: '0 ENTITIES',  sig: 'Chat',   tabs: true,  compose: true },
        contacts: { title: 'Contacts',  sub: '0 ENTITIES',  sig: 'People', tabs: false, compose: false },
        discover: { title: 'Discover',  sub: 'EXPLORE',     sig: 'Find',   tabs: false, compose: false },
        me:       { title: 'Profile',   sub: 'A0nynx_3i',   sig: 'Me',     tabs: false, compose: false }
    };

    function updateHeader() {
        var cfg = pageLabels[currentPage];
        cfg.sub = entities.length + ' ENTITIES';
        document.getElementById('caPlaqueTitle').textContent = cfg.title;
        document.getElementById('caPlaqueSub').textContent = cfg.sub;
        document.getElementById('caPlaqueSig').textContent = cfg.sig;
        document.getElementById('caTabRow').style.display = cfg.tabs ? 'flex' : 'none';
        document.getElementById('caComposeBtn').style.display = cfg.compose ? 'flex' : 'none';

        var badge = document.getElementById('caNavBadge');
        totalUnread = 0;
        entities.forEach(function (e) { totalUnread += (e.unread || 0); });
        if (totalUnread > 0) {
            badge.style.display = 'flex';
            badge.textContent = totalUnread;
        } else {
            badge.style.display = 'none';
        }
    }

    /* 全局打字状态 map，renderChats 之后自动恢复 */
    var typingStateMap = {};

    /* ── Chats 页 ── */
    function renderChats() {
        var page = document.getElementById('caPageChats');
        if (entities.length === 0) {
            page.innerHTML =
                '<div class="ca-empty-state">' +
                    '<div class="ca-empty-icon">' +
                        '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
                    '</div>' +
                    '<div class="ca-empty-title">No Conversations Yet</div>' +
                    '<div class="ca-empty-sub">Create an AI entity in Contacts<br>to start a conversation</div>' +
                '</div>';
            return;
        }
        var html = '';
        var pinnedEnts = entities.filter(function (e) { return e.pinned; });
        if (pinnedEnts.length > 0) {
            html += '<div class="ca-section-label"><span class="ca-section-label-text">Pinned</span><div class="ca-section-label-line"></div><span class="ca-section-num">' + String(pinnedEnts.length).padStart(2,'0') + '</span></div>';
            html += '<div class="ca-pinned-scroll">';
            pinnedEnts.forEach(function (ent) {
                var msgs = conversations[ent.id] || [];
                var hasUnread = ent.unread > 0;
                var dispName = ent.nickname || ent.name;
                var avInner = ent.avatar
                    ? '<img src="' + ent.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
                    : '<div class="ca-pinned-fallback" style="background:' + ent.color + ';">' + window.getInitial(dispName) + '</div>';
                html += '<div class="ca-pinned-item" data-id="' + ent.id + '">' +
                    '<div class="ca-pinned-ring ' + (hasUnread ? 'has-story' : 'no-story') + '" data-id="' + ent.id + '">' +
                        '<div class="ca-pinned-inner">' + avInner + '</div>' +
                        (hasUnread ? '<div class="ca-pinned-badge">' + ent.unread + '</div>' : '') +
                    '</div>' +
                    '<span class="ca-pinned-name">' + escapeHtml(dispName.split(' ')[0]) + '</span>' +
                '</div>';
            });
            html += '</div>';
        }
        html += '<div class="ca-section-label" style="' + (pinnedEnts.length > 0 ? 'margin-top:8px;' : '') + '"><span class="ca-section-label-text">Recent</span><div class="ca-section-label-line"></div><span class="ca-section-num">' + String(entities.length).padStart(2,'0') + '</span></div>';
        var sorted = entities.slice().sort(function (a, b) {
            var ta = (conversations[a.id] && conversations[a.id].length) ? conversations[a.id][conversations[a.id].length - 1].time : a.created;
            var tb = (conversations[b.id] && conversations[b.id].length) ? conversations[b.id][conversations[b.id].length - 1].time : b.created;
            return tb > ta ? 1 : -1;
        });
        sorted.forEach(function (ent) {
            var msgs = conversations[ent.id] || [];
            var lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            
            /* 格式化预览文字：去除时间戳、翻译符和分句符 */
            var cleanText = '';
            if (lastMsg) {
                cleanText = lastMsg.text
                    .replace(/^\[SYS_TIME:[^\]]*\]\s*/i, '')
                    .replace(/^\[CURRENT TIME:[^\]]*\]\s*/i, '');
                if (cleanText.indexOf('|||TRANS|||') !== -1) {
                    cleanText = cleanText.split('|||TRANS|||')[0];
                }
                cleanText = cleanText.replace(/\|\|\|\|/g, ' ').trim();
            }

            var preview = lastMsg ? (lastMsg.role === 'user' ? '<span style="color:rgba(21,21,21,0.38);">You: </span>' : '') + cleanText.substring(0, 40) : 'Tap to start chatting...';
            var timeStr = lastMsg ? lastMsg.time.split(' ')[1] || lastMsg.time : '';
            var isUnread = ent.unread > 0;
            var dispName = ent.nickname || ent.name;
            var avHtml = ent.avatar
                ? '<img src="' + ent.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
                : '<div class="ca-av-fallback" style="background:' + ent.color + ';">' + window.getInitial(dispName) + '</div>';
            html += '<div class="ca-chat-row" data-id="' + ent.id + '">' +
                '<div class="ca-chat-avatar">' + avHtml + '</div>' +
                (isUnread ? '<div class="ca-unread-dot"></div>' : '') +
                '<div class="ca-chat-content">' +
                    '<div class="ca-chat-top"><span class="ca-chat-name' + (isUnread ? ' unread' : '') + '">' + escapeHtml(dispName) + '</span><span class="ca-chat-time' + (isUnread ? ' unread' : '') + '">' + timeStr + '</span></div>' +
                    '<div class="ca-chat-bottom"><span class="ca-chat-preview' + (isUnread ? ' unread' : '') + '">' + preview + '</span>' +
                    (isUnread ? '<div class="ca-unread-count">' + ent.unread + '</div>' : '') +
                    '</div>' +
                '</div></div>';
        });
        page.innerHTML = html;

        page.querySelectorAll('.ca-chat-row').forEach(function (row) {
            row.addEventListener('click', function () {
                openChat(row.dataset.id);
            });
        });
        page.querySelectorAll('.ca-pinned-item').forEach(function (item) {
            item.addEventListener('click', function () {
                openChat(item.dataset.id);
            });
        });

        /* 渲染完成后恢复打字状态 */
        Object.keys(typingStateMap).forEach(function (entId) {
            if (typingStateMap[entId]) {
                if (typeof setChatRowTyping === 'function') setChatRowTyping(entId, true);
                if (typeof setPinnedTyping === 'function') setPinnedTyping(entId, true);
            }
        });
    }

    /* ── Contacts 页 ── */
    function renderContacts() {
        var page = document.getElementById('caPageContacts');
        var html =
            '<div class="ca-dossier-wrap">' +
                '<div class="ca-dossier">' +
                    '<div class="ca-dossier-tag">FORM_AI_REF.09</div>' +
                    '<div class="ca-dossier-stamp">CLASSIFIED</div>' +
                    '<h2>Entity Dossier</h2>' +
                    '<div class="ca-dossier-field">' +
                        '<label>01. Codename / 昵称</label>' +
                        '<input type="text" id="caEntityName" placeholder="Designate identity...">' +
                    '</div>' +
                    '<div class="ca-dossier-field" style="margin-bottom:24px;">' +
                        '<label>02. Behavioral Core / 人设档案</label>' +
                        '<textarea id="caEntityPersona" placeholder="Define the entity\'s personality, tone, and knowledge constraints..."></textarea>' +
                    '</div>' +
                    '<div class="ca-dossier-footer">' +
                        '<div class="ca-dossier-brand">A0nynx_3i</div>' +
                        '<button class="ca-dossier-btn" id="caInitializeBtn">Initialize</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        if (entities.length > 0) {
            html += '<div class="ca-section-label" style="padding-left:24px;margin-top:20px;"><span class="ca-section-label-text">Directory</span><div class="ca-section-label-line"></div><span class="ca-section-num">' + String(entities.length).padStart(2,'0') + '</span></div>';
            var grouped = {};
            entities.forEach(function (e) {
                var letter = e.name.charAt(0).toUpperCase();
                if (!grouped[letter]) grouped[letter] = [];
                grouped[letter].push(e);
            });
            var letters = Object.keys(grouped).sort();
            letters.forEach(function (letter) {
                html += '<div class="ca-contact-group-label"><span class="ca-contact-group-letter">' + letter + '</span></div>';
                grouped[letter].sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (ent) {
                    var handleText = '@' + ent.name.toLowerCase().replace(/\s+/g, '_');
                    var subText = ent.persona ? ent.persona.substring(0, 30) + (ent.persona.length > 30 ? '...' : '') : 'AI Entity';
                    var cAvHtml = ent.avatar
                        ? '<img src="' + ent.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
                        : '<div class="ca-av-fallback" style="background:' + ent.color + ';">' + getInitial(ent.name) + '</div>';
                    html += '<div class="ca-contact-row" data-id="' + ent.id + '">' +
                        '<div class="ca-contact-avatar">' + cAvHtml + '</div>' +
                        '<div class="ca-contact-info"><div class="ca-contact-name">' + ent.name + '</div><div class="ca-contact-handle">' + handleText + ' · ' + subText + '</div></div>' +
                        '<div class="ca-contact-actions">' +
                            '<div class="ca-contact-act-btn ca-contact-chat-btn" data-id="' + ent.id + '"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>' +
                            '<div class="ca-contact-act-btn ca-contact-del-btn" data-id="' + ent.id + '"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>' +
                        '</div>' +
                    '</div>';
                });
            });
        }

        page.innerHTML = html;

        var initBtn = document.getElementById('caInitializeBtn');
        if (initBtn) {
            initBtn.addEventListener('click', function () {
                var nameInput = document.getElementById('caEntityName');
                var personaInput = document.getElementById('caEntityPersona');
                var name = nameInput.value.trim();
                var persona = personaInput.value.trim();
                if (!name) {
                    nameInput.style.borderBottomColor = '#A63426';
                    nameInput.placeholder = 'Please enter a codename...';
                    setTimeout(function () { nameInput.style.borderBottomColor = '#151515'; nameInput.placeholder = 'Designate identity...'; }, 2000);
                    return;
                }
                var ent = {
                    id: 'ent_' + Date.now(),
                    name: name,
                    persona: persona,
                    color: pickColor(name),
                    created: dateNow() + ' ' + timeNow(),
                    unread: 0
                };
                entities.push(ent);
                conversations[ent.id] = [];
                saveOneEntity(ent);
                saveOneConversation(ent.id);
                initBtn.textContent = '✓ INITIALIZED';
                initBtn.style.background = '#A63426';
                if (window.SH) SH.play('map-success');
                setTimeout(function () {
                    initBtn.textContent = 'Initialize';
                    initBtn.style.background = '#151515';
                }, 1200);
                nameInput.value = '';
                personaInput.value = '';
                renderContacts();
                renderChats();
                updateHeader();
            });
        }

        page.querySelectorAll('.ca-contact-chat-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                openChat(btn.dataset.id);
                switchPage('chats');
            });
        });

        page.querySelectorAll('.ca-contact-del-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var id = btn.dataset.id;
                entities = entities.filter(function (en) { return en.id !== id; });
                delete conversations[id];
                ChatDB.deleteEntity(id);
                renderContacts();
                renderChats();
                updateHeader();
            });
        });
    }

    /* ── Discover 页 ── */
    function renderDiscover() {
        var page = document.getElementById('caPageDiscover');
        page.innerHTML =
            '<div class="ca-discover-banner">' +
                '<div class="ca-banner-label">A0nynx_3i · AI Chat</div>' +
                '<div class="ca-banner-title">Create Your<br>AI Entities</div>' +
                '<div class="ca-banner-sub">Design unique AI personalities to chat with</div>' +
                '<div class="ca-banner-sig">Discover</div>' +
                '<div class="ca-banner-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>' +
            '</div>' +
            '<div class="ca-discover-grid">' +
                '<div class="ca-disc-card dark"><div class="ca-disc-card-label">Entities</div><div class="ca-disc-card-title">Your AI Collection</div><div class="ca-disc-card-num">' + String(entities.length).padStart(2,'0') + '</div></div>' +
                '<div class="ca-disc-card light"><div class="ca-disc-card-label">Messages</div><div class="ca-disc-card-title">Total Exchanges</div><div class="ca-disc-card-num">' + countTotalMessages() + '</div></div>' +
                '<div class="ca-disc-card light"><div class="ca-disc-card-label">Guide</div><div class="ca-disc-card-title">How It Works</div><div class="ca-disc-card-num">?</div></div>' +
                '<div class="ca-disc-card dark"><div class="ca-disc-card-label">Version</div><div class="ca-disc-card-title">A0nynx_3i v1</div><div class="ca-disc-card-num">01</div></div>' +
            '</div>' +
            '<div class="ca-discover-list-label"><span class="ca-dl-title">Quick Actions</span><div class="ca-dl-line"></div></div>' +
            '<div class="ca-disc-row" id="caDiscNewEntity">' +
                '<div class="ca-disc-row-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>' +
                '<div class="ca-disc-row-info"><div class="ca-disc-row-name">Create New Entity</div><div class="ca-disc-row-sub">Design a new AI personality</div></div>' +
                '<div class="ca-disc-row-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>' +
            '</div>' +
            '<div class="ca-disc-row" id="caDiscTemplates">' +
                '<div class="ca-disc-row-icon"><svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>' +
                '<div class="ca-disc-row-info"><div class="ca-disc-row-name">Templates</div><div class="ca-disc-row-sub">Pre-built AI personalities</div></div>' +
                '<div class="ca-disc-row-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>' +
            '</div>';

        document.getElementById('caDiscNewEntity').addEventListener('click', function () { switchPage('contacts'); });
    }

    function countTotalMessages() {
        var c = 0;
        Object.keys(conversations).forEach(function (k) { c += conversations[k].length; });
        return String(c).padStart(2,'0');
    }

    /* ── Me 页 ── */
    function renderMe() {
        var page = document.getElementById('caPageMe');
        var totalMsgs = 0;
        Object.keys(conversations).forEach(function (k) { totalMsgs += conversations[k].length; });

        // 数据：从本地加载面具
        var masks = JSON.parse(localStorage.getItem('ca-user-masks') || '[{"id":"m1","name":"The Architect","bio":"Logical, precise, structural thinker.","active":true}]');
        var activeMask = masks.find(function(m) { return m.active; }) || masks[0];
        
        var html = '<style>' +
            '.ca-mask-card { border: 0.5px solid rgba(0,0,0,0.1); padding: 18px 20px; margin-bottom: 16px; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); background: #fff; position: relative; overflow: hidden; cursor: pointer; }' +
            '.ca-mask-card.active { border-color: #151515; background: #fcfcfc; }' +
            '.ca-mask-card.expanded { cursor: default; }' +
            '.ca-mask-badge { position: absolute; top: -10px; left: 15px; background: #151515; color: #fff; font-size: 8px; padding: 2px 8px; font-weight: 800; letter-spacing: 1px; opacity: 0; transform: translateY(5px); transition: all 0.3s; }' +
            '.ca-mask-card.active .ca-mask-badge { opacity: 1; transform: translateY(10px); }' +
            '.ca-mask-edit-area { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.4s cubic-bezier(0.16, 1, 0.3, 1); }' +
            '.ca-mask-card.expanded .ca-mask-edit-area { grid-template-rows: 1fr; margin-top: 15px; border-top: 0.5px solid rgba(0,0,0,0.06); padding-top: 15px; }' +
            '.ca-mask-edit-inner { overflow: hidden; }' +
            '.ca-mask-star { transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }' +
            '.ca-mask-card.active .ca-mask-star { fill: #A63426; transform: scale(1.1); }' +
            '.ca-mask-btn { font-size: 10px; font-weight: 700; text-decoration: underline; cursor: pointer; transition: opacity 0.2s; }' +
            '.ca-mask-btn:active { opacity: 0.5; }' +
            '</style>';

        html += '<div class="ca-me-top">' +
            '<div class="ca-me-avatar-wrap" id="caMeAvatarWrap" style="border:none;padding:0;width:80px;height:80px;display:flex;align-items:center;justify-content:center;cursor:pointer;">' +
                '<input type="file" id="caMeAvatarInput" accept="image/*" style="display:none;">' +
                '<svg style="position:absolute;inset:-15px;width:110px;height:110px;pointer-events:none;z-index:0;" viewBox="0 0 100 100">' +
                    '<circle cx="50" cy="50" r="41" fill="none" stroke="#444" stroke-width="0.4" stroke-dasharray="12 6 4 2" opacity="0.7" />' +
                    '<circle cx="50" cy="50" r="44" fill="none" stroke="#888" stroke-width="0.4" stroke-dasharray="2 10 15 5" opacity="0.5" />' +
                    '<circle cx="50" cy="50" r="47" fill="none" stroke="#ccc" stroke-width="0.4" stroke-dasharray="8 18" opacity="0.3" />' +
                '</svg>' +
                '<div class="ca-me-avatar-inner" style="z-index:1;border:1px solid #151515;overflow:hidden;width:100%;height:100%;border-radius:50%;display:flex;justify-content:center;align-items:center;background:#151515;color:#fff;">' +
                    (activeMask.avatar ? '<img src="' + activeMask.avatar + '" style="width:100%;height:100%;object-fit:cover;">' : getInitial(activeMask.name)) +
                '</div>' +
                '<div class="ca-me-edit-dot" style="position:absolute;z-index:2;background:transparent;border:none;bottom:-2px;right:-2px;width:24px;height:24px;display:flex;justify-content:center;align-items:center;">' +
                    '<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:#151515;stroke:#fff;stroke-width:2.5;stroke-linejoin:round;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' +
                '</div>' +
            '</div>' +
            '<div class="ca-me-name">' + escapeHtml(activeMask.name) + '</div>' +
            '<div class="ca-me-id">A0nynx_3i · AI Chat Client</div>' +
            '<div class="ca-me-sig">Avant-Garde</div>' +
        '</div>';

        html += '<div style="padding: 30px 24px;">' +
            '<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 24px; border-bottom: 2px solid #151515; padding-bottom: 8px;">' +
                '<span style="font-family: \'Playfair Display\', serif; font-style: italic; font-size: 24px; font-weight: 700;">The Alter Ego</span>' +
                '<span style="font-size: 10px; font-weight: 700; letter-spacing: 2px; color: #A63426;">SET_MASK.' + String(masks.length).padStart(2,'0') + '</span>' +
            '</div>' +
            '<p style="font-size: 11px; line-height: 1.6; color: #666; margin-bottom: 30px; letter-spacing: 0.2px;">Define your digital presence across multiple dimensions. Each mask represents a unique persona the AI will recognize.</p>' +
            '<div id="caMaskList">';

        masks.forEach(function(mask) {
            html += '<div class="ca-mask-card ' + (mask.active ? 'active' : '') + '" data-id="' + mask.id + '">' +
                '<div class="ca-mask-badge">ACTIVE</div>' +
                '<div style="display: flex; justify-content: space-between; align-items: flex-start;">' +
                    '<div style="display: flex; align-items: center; gap: 12px;">' +
                        '<div class="ca-mask-avatar" data-id="' + mask.id + '" style="width:36px; height:36px; border-radius:50%; background:#151515; color:#fff; display:flex; justify-content:center; align-items:center; font-size:16px; font-weight:700; overflow:hidden; position:relative; cursor:pointer; flex-shrink:0;">' +
                            (mask.avatar ? '<img src="'+mask.avatar+'" style="width:100%;height:100%;object-fit:cover;">' : getInitial(mask.name)) +
                            '<input type="file" class="ca-mask-avatar-input" accept="image/*" style="display:none;">' +
                        '</div>' +
                        '<div>' +
                            '<div class="ca-mask-name-disp" style="font-size: 14px; font-weight: 700; text-transform: uppercase;">' + escapeHtml(mask.name) + '</div>' +
                            '<div class="ca-mask-bio-disp" style="font-size: 10px; color: #888; margin-top: 4px;">' + escapeHtml(mask.bio).substring(0, 40) + (mask.bio.length > 40 ? '...' : '') + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="ca-mask-toggle-active" style="cursor: pointer; padding: 5px;">' +
                        '<svg class="ca-mask-star" viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: ' + (mask.active ? '#000' : '#ccc') + ';"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' +
                    '</div>' +
                '</div>' +
                '<div class="ca-mask-edit-area">' +
                    '<div class="ca-mask-edit-inner">' +
                        '<label style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #A63426; display: block; margin-bottom: 8px;">Codename / 身份代号</label>' +
                        '<input type="text" class="ca-mask-name-input" style="width: 100%; background: transparent; border: none; border-bottom: 0.5px solid #eee; font-family: inherit; font-size: 13px; font-weight: 700; margin-bottom: 15px; outline: none; color: #151515;" value="' + escapeHtml(mask.name) + '">' +
                        '<label style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #A63426; display: block; margin-bottom: 8px;">Core Persona / 人设描述</label>' +
                        '<textarea class="ca-mask-bio-input" style="width: 100%; background: transparent; border: none; font-family: inherit; font-size: 12px; line-height: 1.5; resize: none; outline: none; height: 60px; color: #333;" placeholder="Describe this identity...">' + escapeHtml(mask.bio) + '</textarea>' +
                        '<div style="display: flex; gap: 15px; margin-top: 15px;">' +
                            '<span class="ca-mask-btn ca-mask-save">SAVE</span>' +
                            '<span class="ca-mask-btn ca-mask-delete" style="color: #ccc;">DELETE</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        });

        html += '</div>' +
            '<div id="caAddMaskBtn" style="border: 1px dashed #ccc; padding: 15px; text-align: center; cursor: pointer; transition: all 0.3s; margin-top: 10px;">' +
                '<span style="font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #888;">+ Initialize New Identity</span>' +
            '</div>' +
            '<div style="margin-top: 50px; text-align: center; border-top: 0.5px solid #eee; padding-top: 20px;">' +
                '<div style="font-family: \'Playfair Display\', serif; font-size: 14px; font-weight: 700; color: #ccc;">A0nynx_3i / Issue No. 01</div>' +
            '</div>' +
            '<div style="margin-top: 30px; display: flex; flex-direction: column; gap: 12px;">' +
                '<div class="ca-me-row" id="caMeApiKey" style="border-top: 0.5px solid rgba(0,0,0,0.05);">' +
                    '<div class="ca-me-row-icon" style="background:rgba(21,21,21,0.04);"><svg viewBox="0 0 24 24" style="width:16px;stroke:#151515;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>' +
                    '<div class="ca-me-row-text"><div class="ca-me-row-name" style="font-size:12px;">API Key</div></div>' +
                    '<div class="ca-me-row-arrow"><svg viewBox="0 0 24 24" style="width:12px;stroke:#ccc;"><polyline points="9 18 15 12 9 6"/></svg></div>' +
                '</div>' +
                '<div class="ca-me-row" id="caMeClearAll">' +
                    '<div class="ca-me-row-icon" style="background:rgba(166,52,38,0.05);"><svg viewBox="0 0 24 24" style="width:16px;stroke:#A63426;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></div>' +
                    '<div class="ca-me-row-text"><div class="ca-me-row-name" style="font-size:12px;color:#A63426;">System Reset</div></div>' +
                    '<div class="ca-me-row-arrow"><svg viewBox="0 0 24 24" style="width:12px;stroke:#ccc;"><polyline points="9 18 15 12 9 6"/></svg></div>' +
                '</div>' +
            '</div>' +
        '</div>';

        page.innerHTML = html;

        var meAvWrap = document.getElementById('caMeAvatarWrap');
        var meAvInp = document.getElementById('caMeAvatarInput');
        if (meAvWrap && meAvInp) {
            meAvWrap.addEventListener('click', function() { meAvInp.click(); });
            meAvInp.addEventListener('change', function(e) {
                var file = e.target.files[0];
                if (!file) return;
                var img = new Image();
                img.onload = function() {
                    var canvas = document.createElement('canvas');
                    var size = 200; canvas.width = size; canvas.height = size;
                    var ctx = canvas.getContext('2d');
                    var min = Math.min(img.width, img.height);
                    var sx = (img.width - min) / 2, sy = (img.height - min) / 2;
                    ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
                    var dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    
                    var active = masks.find(function(m) { return m.active; });
                    if (active) {
                        active.avatar = dataUrl;
                        localStorage.setItem('ca-user-masks', JSON.stringify(masks));
                        renderMe();
                    }
                };
                img.src = URL.createObjectURL(file);
            });
        }

        // 绑定事件
        page.querySelectorAll('.ca-mask-card').forEach(function(card) {
            card.addEventListener('click', function(e) {
                if (e.target.closest('.ca-mask-edit-area') || e.target.closest('.ca-mask-toggle-active') || e.target.closest('.ca-mask-avatar')) return;
                page.querySelectorAll('.ca-mask-card').forEach(function(c) { if(c!==card) c.classList.remove('expanded'); });
                card.classList.toggle('expanded');
            });

            var id = card.dataset.id;
            var maskAv = card.querySelector('.ca-mask-avatar');
            var maskAvInp = maskAv.querySelector('.ca-mask-avatar-input');
            if (maskAv && maskAvInp) {
                maskAv.addEventListener('click', function(e) {
                    e.stopPropagation();
                    maskAvInp.click();
                });
                maskAvInp.addEventListener('change', function(e) {
                    e.stopPropagation();
                    var file = e.target.files[0];
                    if (!file) return;
                    var img = new Image();
                    img.onload = function() {
                        var canvas = document.createElement('canvas');
                        var size = 200; canvas.width = size; canvas.height = size;
                        var ctx = canvas.getContext('2d');
                        var min = Math.min(img.width, img.height);
                        var sx = (img.width - min) / 2, sy = (img.height - min) / 2;
                        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
                        var dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                        
                        var m = masks.find(function(m) { return m.id === id; });
                        if (m) m.avatar = dataUrl;
                        localStorage.setItem('ca-user-masks', JSON.stringify(masks));
                        renderMe();
                    };
                    img.src = URL.createObjectURL(file);
                });
            }
            card.querySelector('.ca-mask-toggle-active').addEventListener('click', function(e) {
                e.stopPropagation();
                masks.forEach(function(m) { m.active = (m.id === id); });
                localStorage.setItem('ca-user-masks', JSON.stringify(masks));
                renderMe();
            });

            card.querySelector('.ca-mask-save').addEventListener('click', function(e) {
                e.stopPropagation();
                var m = masks.find(function(m) { return m.id === id; });
                m.name = card.querySelector('.ca-mask-name-input').value.trim() || 'Unnamed';
                m.bio = card.querySelector('.ca-mask-bio-input').value.trim() || '';
                localStorage.setItem('ca-user-masks', JSON.stringify(masks));
                renderMe();
            });

            card.querySelector('.ca-mask-delete').addEventListener('click', function(e) {
                e.stopPropagation();
                if (masks.length <= 1) return alert("At least one mask is required.");
                masks = masks.filter(function(m) { return m.id !== id; });
                if (!masks.some(function(m) { return m.active; })) masks[0].active = true;
                localStorage.setItem('ca-user-masks', JSON.stringify(masks));
                renderMe();
            });
        });

        document.getElementById('caAddMaskBtn').addEventListener('click', function() {
            var newId = 'm' + Date.now();
            masks.push({ id: newId, name: 'New Identity', bio: '', active: false });
            localStorage.setItem('ca-user-masks', JSON.stringify(masks));
            renderMe();
            setTimeout(function() {
                var newCard = page.querySelector('.ca-mask-card[data-id="' + newId + '"]');
                if (newCard) newCard.classList.add('expanded');
            }, 100);
        });

        document.getElementById('caMeApiKey').addEventListener('click', function () {
            var cfg = getActiveConfig();
            var key = prompt('Enter API key:', cfg.key || '');
            if (key !== null) {
                var node = apiConfig.node || 'primary';
                if (!apiConfig[node]) apiConfig[node] = {};
                apiConfig[node].key = key.trim();
                saveApiConfig();
            }
        });

        document.getElementById('caMeClearAll').addEventListener('click', function () {
            if (confirm('System Reset will wipe all data. Proceed?')) {
                entities = []; conversations = {};
                localStorage.removeItem('ca-user-masks');
                ChatDB.clearAll(function () { renderAll(); });
            }
        });
    }

    function renderAll() {
        renderChats();
        if (currentPage === 'contacts') renderContacts();
        if (currentPage === 'discover') renderDiscover();
        if (currentPage === 'me') renderMe();
        updateHeader();
    }

    /* ══════════════════════════════════════
       页面切换
    ══════════════════════════════════════ */
    function switchPage(name) {
        currentPage = name;
        document.querySelectorAll('.ca-page').forEach(function (p) { p.classList.remove('active'); });
        document.getElementById('caPage' + name.charAt(0).toUpperCase() + name.slice(1)).classList.add('active');
        document.querySelectorAll('.ca-nav-item').forEach(function (n) {
            n.classList.toggle('active', n.dataset.page === name);
        });
        if (name === 'contacts') renderContacts();
        if (name === 'discover') renderDiscover();
        if (name === 'me') renderMe();
        updateHeader();

        /* 消息胶囊“挂下来”带笨笨小荡动的物理入场效果 */
        var hangingEl = document.querySelector('.ca-header-hanging');
        if (hangingEl) {
            hangingEl.classList.remove('anim-swing');
            void hangingEl.offsetWidth; /* 强制重绘，重启关键帧 */
            hangingEl.classList.add('anim-swing');
        }
    }

    /* ══════════════════════════════════════
       聊天详情
    ══════════════════════════════════════ */
    var cdLastMsgType = null;
    var cdLastMsgRow = null;
    var cdIsFloating = false;
    var cdIsDragging = false;
    var cdIsResizing = false;
    var cdDragMoved = false;

    /* 时间感知：自定义时间流动基准（提到外层，sendMessage 和 callAI 都能访问） */
    var taCustomStartMs  = null;
    var taCustomBaseHour = 0;
    var taCustomBaseMin  = 0;
    var taCustomBaseSec  = 0;

    /* ── 记忆系统核心逻辑 (外层作用域) ── */
    function memKey(entId) { return 'ca-memory-' + entId; }
    function memRoundsKey(entId) { return 'ca-mem-rounds-' + entId; }
    function loadMemory(entId) {
        try { return JSON.parse(localStorage.getItem(memKey(entId)) || '{"high":[],"mid":[],"low":[]}'); } catch(e) { return {high:[],mid:[],low:[]}; }
    }
    function saveMemory(entId, data) { localStorage.setItem(memKey(entId), JSON.stringify(data)); }
    function loadRounds(entId) { return parseInt(localStorage.getItem(memRoundsKey(entId)) || '30', 10); }
    function saveRounds(entId, val) { localStorage.setItem(memRoundsKey(entId), String(val)); }

    /* AI 自动总结全局变量 */
    var autoSumThreshold = 0;
    var autoSumLastCount = 0;

    function checkAutoSum() {
        if (!currentChatId) return;
        // 实时读取阈值，确保 UI 修改后立即生效
        autoSumThreshold = parseInt(localStorage.getItem('ca-auto-sum-threshold-' + currentChatId) || '0', 10);
        if (autoSumThreshold <= 0) return;

        var msgs = conversations[currentChatId] || [];
        var currentCount = msgs.length;
        
        // 核心逻辑：当前总消息数达到阈值，且比上次触发时的数量多
        if (currentCount >= autoSumThreshold && currentCount > autoSumLastCount) {
            console.log('[AutoSum] Threshold reached:', currentCount, '/', autoSumThreshold);
            autoSumLastCount = currentCount;
            triggerAutoSum();
        }
    }

    function initAutoSumCount() {
        if (!currentChatId) return;
        var msgs = conversations[currentChatId] || [];
        // 初始化时记录当前条数，防止一打开就触发旧的总结
        autoSumLastCount = msgs.length;
        autoSumThreshold = parseInt(localStorage.getItem('ca-auto-sum-threshold-' + currentChatId) || '0', 10);
    }

    function triggerAutoSum() {
        if (!currentChatId) return;
        var msgs = conversations[currentChatId] || [];
        if (msgs.length === 0) return;

        var lastSumKey = 'ca-mem-last-sum-' + currentChatId;
        var lastSumIdx = parseInt(localStorage.getItem(lastSumKey) || '0', 10);
        var total = msgs.length;
        var f = lastSumIdx;
        var t = total;

        if (f >= t) return;

        var selectedMsgsForSum = msgs.slice(f, t);
        var transcript = selectedMsgsForSum.map(function(m, i) {
            return '[' + (f + i + 1) + '] ' + (m.role === 'user' ? 'User' : 'AI') + ': ' + m.text;
        }).join('\n');

        var prompt = '你是一个精密的叙事记忆系统。请仔细阅读以下对话记录（第 ' + (f + 1) + ' 至第 ' + t + ' 条），' +
            '从中提取关键记忆信息。\n\n' +
            '【强制规则】\n' +
            '- 用户一律称为 [user]，角色一律称为 [char]，禁止使用任何其他称谓。\n' +
            '- 凡涉及具体事件，必须以「在［时间］发生……」的格式开头，并在结尾补充「[user] 情绪：… / [char] 情绪：…」。\n' +
            '- 时间信息：若对话中含有时间戳（[SYS_TIME] 或类似标记），优先提取并写入；若无明确时间，写「时间不明」。\n' +
            '- 每条记忆必须包含：主体（[user]/[char]）、行为/事件、情绪反应，三者缺一不可。\n' +
            '- 禁止模糊表述，禁止"似乎""可能"等词。记录已发生的事实。\n\n' +
            '【记忆分级标准】\n' +
            'HIGH — 定义双方关系骨架的核心信息：\n' +
            '  · 双方关系性质的明确转变（如：从陌生→熟识，从疏离→亲密）\n' +
            '  · [char] 对 [user] 做出的重要承诺、表态、或立场宣言\n' +
            '  · [user] 对 [char] 触发的关键情绪节点（愤怒、触动、失控等）\n' +
            '  · 双方共同经历的、不可逆的场景事件\n\n' +
            'MID — 丰富双方互动肌理的重要细节：\n' +
            '  · [char] 对特定话题、人物、事物表现出的明显好恶或习惯反应\n' +
            '  · [user] 的行为模式、语言风格、或反复出现的倾向\n' +
            '  · 有情感温度的对话片段（带时间节点）\n' +
            '  · 双方之间形成的专属默契、暗语、或特殊记忆锚点\n\n' +
            'LOW — 近期碎片与临时性信息：\n' +
            '  · 本次对话中出现的临时场景、道具、地点\n' +
            '  · [user] 或 [char] 在本次对话中的情绪底色\n' +
            '  · 尚未定型、可能随后续对话演变的细节\n\n' +
            '【输出格式】严格按以下格式，每条独立一行，不输出任何额外文字：\n' +
            'HIGH: [内容]\n' +
            'MID: [内容]\n' +
            'LOW: [内容]\n\n' +
            '【事件格式示例】\n' +
            'HIGH: 在［第3条，时间不明］[char] 第一次主动握住 [user] 的手，打破了此前的疏离；[user] 情绪：震惊后转为颤抖的温热；[char] 情绪：克制中透出决然。\n' +
            'MID: 在［第7条，22:14］[user] 说「我不需要你保护」，[char] 沉默超过五秒后才回答；[user] 情绪：逞强中带自我保护；[char] 情绪：隐忍，轻微受挫。\n' +
            'LOW: [user] 本次对话全程语气强硬，但在话题转向回忆时音调明显软化。\n\n' +
            '对话记录：\n' + transcript;

        var cfg = getActiveConfig();
        var apiKey = cfg.key || '';
        if (!apiKey) return;

        var modelId = resolveModelId(cfg.model);
        var endpoint = normalizeOpenAIEndpoint(cfg.endpoint);

        // 视觉反馈：外层通过 DOM 获取按钮
        var autoBtn = document.getElementById('cdMemAutoSumBtn');
        if (autoBtn) autoBtn.style.color = '#A63426';

        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
            body: JSON.stringify({
                model: modelId,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 800,
                temperature: 0.4
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var text = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
            var parsed = { high: [], mid: [], low: [] };
            text.split('\n').forEach(function(line) {
                line = line.trim();
                if (line.toUpperCase().startsWith('HIGH:')) parsed.high.push(line.substring(5).trim());
                else if (line.toUpperCase().startsWith('MID:')) parsed.mid.push(line.substring(4).trim());
                else if (line.toUpperCase().startsWith('LOW:')) parsed.low.push(line.substring(4).trim());
            });

            var existing = loadMemory(currentChatId);
            var finalData = {
                high: existing.high.concat(parsed.high),
                mid: existing.mid.concat(parsed.mid),
                low: existing.low.concat(parsed.low)
            };
            saveMemory(currentChatId, finalData);
            localStorage.setItem(lastSumKey, String(t));
            if (autoBtn) autoBtn.style.color = '';
            if (typeof renderMemoryPanel === 'function') renderMemoryPanel();
        })
        .catch(function(err) {
            console.error('[Auto Sum Error]', err);
            if (autoBtn) autoBtn.style.color = '';
        });
    }

    function openChat(entId) {
        var isSameChat = (currentChatId === entId);
        currentChatId = entId;
        cdDisplayLimit = 25;
        var ent = entities.find(function (e) { return e.id === entId; });
        if (!ent) return;

        ent.unread = 0;
        saveOneEntity(ent);
        updateHeader();
        if (typeof updateNavBadge === 'function') updateNavBadge();
        
        var existingPills = document.querySelectorAll('.ca-notif-pill[data-ent-id="' + entId + '"]:not(.leaving)');
        existingPills.forEach(function(p) { p.classList.add('leaving'); setTimeout(function() { if (p.parentNode) p.parentNode.removeChild(p); }, 300); });

        var detail = document.getElementById('caChatDetail');
        var dispName = ent.nickname || ent.name;
        document.getElementById('cdSignText').textContent = dispName;
        document.getElementById('cdSlotB').textContent = 'SESSION: ' + ent.id.substring(4, 10).toUpperCase();
        document.getElementById('cdSignSig').textContent = window.getInitial(dispName);
        applyAvatar(ent);

        var area = document.getElementById('cdChatArea');
        if (!area.dataset.scrollBound) {
            area.addEventListener('scroll', function() {
                var cm = document.getElementById('cdContextMenu');
                if (cm && cm.classList.contains('active')) {
                    closeContextMenu();
                }
            });
            area.dataset.scrollBound = 'true';
        }

        var hasTypingRow = area && !!area.querySelector('#cdTypingRow');
        if (isSameChat && hasTypingRow) {
            setTimeout(function () { if (area) area.scrollTop = area.scrollHeight; }, 20);
        } else {
            cdLastMsgType = null;
            cdLastMsgRow = null;
            cdExitFloating();
            renderMessages(entId);
        }

        var headerEl = detail.querySelector('.header-system');
        var lockEls = headerEl ? headerEl.querySelectorAll('*') : [];
        var lockStyles = [];
        lockEls.forEach(function(el) {
            lockStyles.push({ el: el, anim: el.style.animation, trans: el.style.transition, op: el.style.opacity, tf: el.style.transform });
            el.style.animation = 'none'; el.style.transition = 'none'; el.style.opacity = '1'; el.style.transform = 'none';
        });

        detail.classList.remove('show-drawer');
        detail.classList.add('active');

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                lockEls.forEach(function(el, i) {
                    el.style.animation = lockStyles[i].anim; el.style.transition = lockStyles[i].trans; el.style.opacity = lockStyles[i].op; el.style.transform = lockStyles[i].tf;
                });
            });
        });

        var s = document.getElementById('cdSettings'); if (s) s.classList.remove('active');
        var m = document.getElementById('cdMenuOverlay'); if (m) m.classList.remove('active');
        autoSumThreshold = parseInt(localStorage.getItem('ca-auto-sum-threshold-' + entId) || '0', 10);
        if (typeof initAutoSumCount === 'function') initAutoSumCount();
    }

    function closeChat() {
        cdExitFloating();
        var detail = document.getElementById('caChatDetail');
        detail.classList.remove('active', 'show-drawer');
        /* 不立即清空 currentChatId，让后台 AI 请求完成后仍能触发通知 */
        /* currentChatId 会在下次 openChat 时被新值覆盖 */
        renderChats();
    }

    function cdGetNowTime() {
        var tcNow = (function(){ try { return JSON.parse(localStorage.getItem('ca-time-config') || '{"on":false}'); } catch(e) { return {on:false}; } })();
        if (!tcNow.on) {
            return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        }
        var hr, mn;
        if (tcNow.custom && taCustomStartMs) {
            var elapsed = Math.floor((Date.now() - taCustomStartMs) / 1000);
            var totalS  = taCustomBaseHour * 3600 + taCustomBaseMin * 60 + taCustomBaseSec + elapsed;
            hr = Math.floor(totalS / 3600) % 24;
            mn = Math.floor(totalS % 3600 / 60);
        } else {
            var d = new Date();
            hr = d.getHours();
            mn = d.getMinutes();
        }
        var ampm = hr >= 12 ? 'PM' : 'AM';
        var hr12 = hr % 12 || 12;
        return String(hr12).padStart(2,'0') + ':' + String(mn).padStart(2,'0') + ' ' + ampm;
    }

    var cdDisplayLimit = 15;
    function renderMessages(entId, isLoadMore) {
        var area = document.getElementById('cdChatArea');
        var allMsgs = conversations[entId] || [];
        var ent = entities.find(function (e) { return e.id === entId; });
        
        var oldHeight = area.scrollHeight;
        
        area.style.scrollBehavior = 'auto';

        area.innerHTML = '<div class="chat-mask" id="cdChatMask"></div>';
        cdLastMsgType = null;
        cdLastMsgRow = null;

        var startIdx = Math.max(0, allMsgs.length - cdDisplayLimit);
        var visibleMsgs = allMsgs.slice(startIdx);
        var fragment = document.createDocumentFragment();
        
        if (startIdx > 0) {
            var loadHint = document.createElement('div');
            loadHint.className = 'cd-load-hint';
            loadHint.id = 'cdLoadSentinel';
            loadHint.style.cssText = 'cursor:pointer;opacity:1;user-select:none;-webkit-user-select:none;position:relative;z-index:9999;pointer-events:auto;padding:20px 0;';
            loadHint.innerHTML = '<div class="lh-line"></div><div class="lh-text" style="pointer-events:none;">↑ LOAD MORE · SEC_' + Math.ceil(startIdx/15) + '</div><div class="lh-line"></div>';
            fragment.appendChild(loadHint);
        }

        var sysEl = document.createElement('div');
        sysEl.className = 'sys-msg';
        sysEl.textContent = 'Conversation with ' + ent.name;
        fragment.appendChild(sysEl);

        function stripSysTime(str) {
            return str.replace(/^\[SYS_TIME:[^\]]*\]\s*/i, '').replace(/^\[CURRENT TIME:[^\]]*\]\s*/i, '');
        }

        function formatStoredTime(rawTime) {
            if (!rawTime) return '';
            var match = rawTime.match(/^(\d{1,2}):(\d{2})$/);
            if (match) {
                var h = parseInt(match[1], 10);
                var mn = match[2];
                var ampm = h >= 12 ? 'PM' : 'AM';
                var h12 = h % 12 || 12;
                return String(h12).padStart(2,'0') + ':' + mn + ' ' + ampm;
            }
            return rawTime;
        }

        visibleMsgs.forEach(function (m, vIdx) {
            var realIdx = startIdx + vIdx;
            if (m.role === 'info') {
                if (m.ai_visible === undefined) m.ai_visible = true;
                var infoEl = document.createElement('div');
                infoEl.style.cssText = 'display:flex; justify-content:center; margin: 16px 0; width:100%;';
                var openEye = '<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:rgba(21,21,21,0.6);fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
                var closedEye = '<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#A63426;fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"></path></svg>';
                infoEl.innerHTML = '<div style="background:rgba(21,21,21,0.03); border:1px solid rgba(21,21,21,0.06); border-radius:12px; padding:6px 12px; display:flex; align-items:center; gap:12px; max-width:85%; box-shadow:0 2px 8px rgba(0,0,0,0.02);"><div style="font-size:10px; color:rgba(21,21,21,0.5); font-weight:600; line-height:1.4; letter-spacing:0.3px;">' + escapeHtml(m.text) + '</div><div class="sys-eye-btn" style="cursor:pointer; padding:2px; transition:all 0.2s; display:flex; align-items:center; justify-content:center;" title="Toggle AI Visibility">' + (m.ai_visible ? openEye : closedEye) + '</div></div>';
                var eyeBtn = infoEl.querySelector('.sys-eye-btn');
                eyeBtn.addEventListener('click', function() { m.ai_visible = !m.ai_visible; saveOneConversation(currentChatId); eyeBtn.innerHTML = m.ai_visible ? openEye : closedEye; });
                fragment.appendChild(infoEl);
                return;
            }
            var isSent = m.role === 'user';
            var type = isSent ? 'sent' : 'received';
            var storedTime = m.time.split(' ')[1] || m.time;
            var timeStr = formatStoredTime(storedTime);
            var rawText = isSent ? stripSysTime(m.text) : m.text;
            if (!isSent && rawText.indexOf('\n') !== -1) {
                var segments = rawText.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
                segments.forEach(function(seg) { var r = cdAddMsg(fragment, seg, type, timeStr, '', false); r.dataset.msgIndex = realIdx; });
            } else {
                var r = cdAddMsg(fragment, rawText, type, timeStr, isSent ? 'READ' : '', false);
                if (isSent) { var metaEl = r.querySelector('.msg-meta'); if (metaEl) metaEl.innerHTML = makeMetaHtml('sent', 'READ', timeStr); }
                r.dataset.msgIndex = realIdx;
            }
        });

        area.appendChild(fragment);
        
        if (isLoadMore) {
            area.scrollTop = area.scrollHeight - oldHeight;
        } else {
            area.scrollTop = area.scrollHeight;
        }
        
        if (!isLoadMore) area.scrollTop = area.scrollHeight;
        area.style.opacity = '1';
        area.style.scrollBehavior = '';
        var sentinel = document.getElementById('cdLoadSentinel');
        if (sentinel) {
            sentinel.ontouchend = function(e) {
                e.stopPropagation();
                var msgs = conversations[currentChatId] || [];
                if (cdDisplayLimit < msgs.length) {
                    cdDisplayLimit += 15;
                    renderMessages(currentChatId, true);
                }
            };
            sentinel.onclick = function(e) {
                e.stopPropagation();
                var msgs = conversations[currentChatId] || [];
                if (cdDisplayLimit < msgs.length) {
                    cdDisplayLimit += 15;
                    renderMessages(currentChatId, true);
                }
            };
        }
    }

    var transConfig = JSON.parse(localStorage.getItem('ca-trans-config') || '{"style":"off","myLang":"Auto","transLang":"Chinese"}');
    function saveTransConfig() { localStorage.setItem('ca-trans-config', JSON.stringify(transConfig)); }

    function makeMetaHtml(type, statusText, timeStr) {
        if (type !== 'sent' || !statusText) return timeStr;
        var color = statusText === 'READ' ? '#A63426' : 'rgba(21,21,21,0.35)';
        return '<span style="color:' + color + ';font-weight:500;">' + statusText + '</span> \u00b7 ' + timeStr;
    }

    function cdAddMsg(area, text, type, timeStr, statusText, animate) {
        var row = document.createElement('div');
        row.className = 'msg-row ' + (type === 'sent' ? 'row-sent' : 'row-received');
        /* 注入星星角标和 meta 标签结构，供 lp-lifted 效果使用 */
        /* 星标和 meta 通过 JS 在 bubble 渲染后追加，见下方 */
        
        if (!animate) {
            row.classList.add('no-anim');
        }

        if (cdLastMsgType === type && cdLastMsgRow) {
            cdLastMsgRow.classList.add('grouped');
        }
        cdLastMsgType = type;
        cdLastMsgRow = row;

        var metaHtml = makeMetaHtml(type, statusText, timeStr);
        
        var mainText = text;
        var transText = '';
        if (text.indexOf('|||TRANS|||') !== -1) {
            var parts = text.split('|||TRANS|||');
            mainText = parts[0].trim();
            transText = parts[1] ? parts[1].trim() : '';
        }
        var mainHtml = escapeHtml(mainText);
        var transHtml = transText ? escapeHtml(transText) : '';

        var bubbleHtml = '';
        if (transHtml && transConfig.style !== 'off') {
            var transClass = 'style-' + transConfig.style;
            var transInner = '';
            if (transConfig.style === 'seamless') transInner = '<div class="trans-content">' + transHtml + '</div>';
            else if (transConfig.style === 'obsidian') transInner = '<div class="trans-block">' + transHtml + '</div>';
            else if (transConfig.style === 'editorial') transInner = '<div class="trans-editorial">' + transHtml + '</div>';

            row.classList.add('has-trans', transClass);
            bubbleHtml = '<div class="msg-text">' + mainHtml + '</div><div class="expand-wrapper"><div class="expand-inner">' + transInner + '</div></div>';
        } else {
            bubbleHtml = mainHtml;
        }

        var avatarDOM = '';
        if (type === 'received') {
            var ent = entities.find(function(e) { return e.id === currentChatId; });
            if (ent) {
                var dispName = ent.nickname || ent.name;
                var avInner = ent.avatar 
                    ? '<img src="' + ent.avatar + '" style="width:100%;height:100%;object-fit:cover;">' 
                    : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:' + ent.color + ';color:#fff;font-size:14px;font-weight:700;">' + window.getInitial(dispName) + '</div>';
                avatarDOM = '<div class="msg-avatar">' + avInner + '</div>';
            }
        } else {
            var userInitial = 'U';
            var masks = [];
            try { masks = JSON.parse(localStorage.getItem('ca-user-masks') || '[]'); } catch(e){}
            var activeMask = masks.find(function(m) { return m.active; });
            if (activeMask && activeMask.name) userInitial = getInitial(activeMask.name);
            
            var avInnerMe = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#151515;color:#fff;font-size:14px;font-weight:700;">' + userInitial + '</div>';
            if (activeMask && activeMask.avatar) {
                avInnerMe = '<img src="' + activeMask.avatar + '" style="width:100%;height:100%;object-fit:cover;">';
            }
            avatarDOM = '<div class="msg-avatar">' + avInnerMe + '</div>';
        }
        var contentHtml = '<div class="msg-content-wrap">' + avatarDOM + '<div class="bubble">' + bubbleHtml + '</div></div>';

        row.innerHTML = '<div class="msg-checkbox"></div>' + contentHtml + '<div class="msg-meta">' + metaHtml + '</div>';

        /* 注入 Weight Drop 所需的粉尘、星标、meta */
        (function() {
            var bEl = row.querySelector('.bubble');
            if (!bEl) return;
            bEl.style.position = 'relative';

            var dustEl = document.createElement('div');
            dustEl.className = 'lp-wd-dust';
            dustEl.innerHTML = '<span></span><span></span><span></span><span></span><span></span>';
            bEl.appendChild(dustEl);

            var starBadge = document.createElement('div');
            starBadge.className = 'lp-star-badge';
            starBadge.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            bEl.appendChild(starBadge);

            var metaTag = document.createElement('div');
            metaTag.className = 'lp-bubble-meta';
            metaTag.textContent = 'MSG_' + String(Math.floor(Math.random() * 9000) + 1000);
            bEl.appendChild(metaTag);
        })();

        if (transText && transConfig.style !== 'off') {
            var bubbleEl = row.querySelector('.bubble');
            bubbleEl.style.cursor = 'pointer';
            bubbleEl.addEventListener('click', function(e) {
                if (!document.getElementById('caChatDetail').classList.contains('multi-mode')) {
                    row.classList.toggle('trans-active');
                }
            });
        }

        area.appendChild(row);
        if (area.nodeType === 1) {
            setTimeout(function () { area.scrollTop = area.scrollHeight; }, 10);
        }
        if (typeof checkAutoSum === 'function') checkAutoSum();
        return row;
    }

    function cdAddTyping(area, explicitChatId) {
        var targetChatId = explicitChatId || currentChatId;
        var row = document.createElement('div');
        row.className = 'msg-row row-received';
        row.id = 'cdTypingRow';
        row.dataset.chatId = targetChatId;

        if (cdLastMsgType === 'received' && cdLastMsgRow) cdLastMsgRow.classList.add('grouped');
        cdLastMsgType = 'received';
        cdLastMsgRow = row;

        var avatarDOM = '';
        var ent = entities.find(function(e) { return e.id === targetChatId; });
        if (ent) {
            var dispName = ent.nickname || ent.name;
            var avInner = ent.avatar 
                ? '<img src="' + ent.avatar + '" style="width:100%;height:100%;object-fit:cover;">' 
                : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:' + ent.color + ';color:#fff;font-size:14px;font-weight:700;">' + window.getInitial(dispName) + '</div>';
            avatarDOM = '<div class="msg-avatar">' + avInner + '</div>';
        }

        var contentHtml = '<div class="msg-content-wrap">' + avatarDOM + '<div class="bubble bubble-wiggle"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div></div>';

        row.innerHTML = '<div class="msg-checkbox"></div>' + contentHtml + '<div class="msg-meta">TYPING...</div>';
        if (window.SH) SH.play('map-typing');
        area.appendChild(row);
        setTimeout(function () { area.scrollTop = area.scrollHeight; }, 10);

        /* 打字通知 + 列表状态 — 无论聊天室是否打开都更新列表 */
        var detail = document.getElementById('caChatDetail');
        var typingEnt = entities.find(function(e) { return e.id === targetChatId; });
        if (typingEnt) {
            if (typeof setChatRowTyping === 'function') setChatRowTyping(typingEnt.id, true);
            if (typeof setPinnedTyping === 'function') setPinnedTyping(typingEnt.id, true);
            /* 胶囊只在后台时显示 */
            if (detail && !detail.classList.contains('active')) {
                showNotifTyping(typingEnt);
            }
        }

        return row;
    }

    function cdResolve(row, text, timeStr) {
        var mainText = text;
        var transText = '';
        if (text.indexOf('|||TRANS|||') !== -1) {
            var parts = text.split('|||TRANS|||');
            mainText = parts[0].trim();
            transText = parts[1] ? parts[1].trim() : '';
        }

        var bubbleEl = row.querySelector('.bubble');
        bubbleEl.classList.remove('bubble-wiggle');
        
        /* 注入渐显动画：初始透明且位移 */
        bubbleEl.style.opacity = '0';
        bubbleEl.style.transform = 'translateY(8px) scale(0.98)';
        bubbleEl.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
        
        if (window.SH) SH.play('map-recv');

        var detail = document.getElementById('caChatDetail');
        var targetChatId = row.dataset.chatId || currentChatId;
        var ent = entities.find(function(e) { return e.id === targetChatId; });

        if (detail && !detail.classList.contains('active') && targetChatId) {
            if (ent) {
                var resolveEnt = ent;
                var resolveMainText = mainText;
                var resolveDelay = 800 + Math.floor(Math.random() * 1200);
                setTimeout(function () {
                    resolveEnt.unread = (resolveEnt.unread || 0) + 1;
                    saveOneEntity(resolveEnt);
                    updateHeader();
                    renderChats();
                    typingStateMap[resolveEnt.id] = false;
                    if (typeof setChatRowTyping === 'function') setChatRowTyping(resolveEnt.id, false);
                    if (typeof setPinnedTyping === 'function') setPinnedTyping(resolveEnt.id, false);
                    if (typeof updateNavBadge === 'function') updateNavBadge();
                    showNotifArrived(resolveEnt, resolveMainText);
                }, resolveDelay);
            }
        } else if (targetChatId && ent) {
            /* 如果是前台，且当前正在看这个聊天，那么就清除状态；如果是前台但看的是别的聊天，也应该清除这个聊天的状态并加红点 */
            typingStateMap[ent.id] = false;
            if (typeof setChatRowTyping === 'function') setChatRowTyping(ent.id, false);
            if (typeof setPinnedTyping === 'function') setPinnedTyping(ent.id, false);
            if (currentChatId !== targetChatId) {
                ent.unread = (ent.unread || 0) + 1;
                saveOneEntity(ent);
                updateHeader();
                renderChats();
                if (typeof updateNavBadge === 'function') updateNavBadge();
            }
        }
        
        if (transText && transConfig.style !== 'off') {
            var transClass = 'style-' + transConfig.style;
            var mainHtml2 = escapeHtml(mainText);
            var transHtml2 = escapeHtml(transText);
            var transInner = '';
            if (transConfig.style === 'seamless') transInner = '<div class="trans-content">' + transHtml2 + '</div>';
            else if (transConfig.style === 'obsidian') transInner = '<div class="trans-block">' + transHtml2 + '</div>';
            else if (transConfig.style === 'editorial') transInner = '<div class="trans-editorial">' + transHtml2 + '</div>';

            row.classList.add('has-trans', transClass);
            bubbleEl.innerHTML = '<div class="msg-text">' + mainHtml2 + '</div><div class="expand-wrapper"><div class="expand-inner">' + transInner + '</div></div>';
            
            if (!row.dataset.transBound) {
                bubbleEl.style.cursor = 'pointer';
                bubbleEl.addEventListener('click', function(e) {
                    if (!document.getElementById('caChatDetail').classList.contains('multi-mode')) {
                        row.classList.toggle('trans-active');
                    }
                });
                row.dataset.transBound = 'true';
            }
        } else {
            bubbleEl.innerHTML = escapeHtml(mainText);
        }
        
        row.querySelector('.msg-meta').innerHTML = timeStr;
        
        /* 触发渐显动画并清理内联样式恢复长按响应 */
        requestAnimationFrame(function() {
            setTimeout(function() {
                bubbleEl.style.opacity = '1';
                bubbleEl.style.transform = 'translateY(0) scale(1)';
                setTimeout(function() {
                    bubbleEl.style.transition = '';
                    bubbleEl.style.transform = '';
                    bubbleEl.style.opacity = '';
                }, 850);
            }, 50);
        });

        var area = document.getElementById('cdChatArea');
        setTimeout(function () { area.scrollTop = area.scrollHeight; }, 10);
        checkAutoSum();
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /* ── 文件夹：拖拽 ── */
    function cdBindDrag() {
        var folder = document.getElementById('cdFolder');
        var detail = document.getElementById('caChatDetail');
        if (!folder || !detail) return;
        function onStart(cx, cy) {
            if (!cdIsFloating || cdIsResizing) return;
            cdIsDragging = true; cdDragMoved = false;
            folder.classList.add('dragging');
            var sr = folder.getBoundingClientRect();
            var vr = detail.getBoundingClientRect();
            var sx = cx - sr.left, sy = cy - sr.top;
            function moveTo(x, y) {
                cdDragMoved = true;
                var l = Math.max(0, Math.min(x - vr.left - sx, vr.width - folder.offsetWidth));
                var t = Math.max(0, Math.min(y - vr.top - sy, vr.height - folder.offsetHeight));
                folder.style.left = l + 'px';
                folder.style.top = t + 'px';
            }
            var mm = function(e) { moveTo(e.clientX, e.clientY); };
            var tm = function(e) { e.preventDefault(); moveTo(e.touches[0].clientX, e.touches[0].clientY); };
            var stop = function() {
                cdIsDragging = false; folder.classList.remove('dragging');
                document.removeEventListener('mousemove', mm);
                document.removeEventListener('mouseup', stop);
                document.removeEventListener('touchmove', tm);
                document.removeEventListener('touchend', stop);
            };
            document.addEventListener('mousemove', mm);
            document.addEventListener('mouseup', stop);
            document.addEventListener('touchmove', tm, { passive: false });
            document.addEventListener('touchend', stop);
        }
        folder.addEventListener('mousedown', function(e) {
            if (e.target.closest('#cdFloatToggle') || e.target.closest('#cdResizeHandle') || e.target.closest('.cd-titem')) return;
            if (!cdIsFloating) return;
            e.preventDefault(); onStart(e.clientX, e.clientY);
        });
        folder.addEventListener('touchstart', function(e) {
            if (e.target.closest('#cdFloatToggle') || e.target.closest('#cdResizeHandle') || e.target.closest('.cd-titem')) return;
            if (!cdIsFloating) return;
            onStart(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
    }

    /* ── 文件夹：缩放 ── */
    function cdBindResize() {
        var rh = document.getElementById('cdResizeHandle');
        var fw = document.getElementById('cdFolderWrapper');
        if (!rh || !fw) return;
        rh.addEventListener('mousedown', function(e) {
            e.stopPropagation(); e.preventDefault();
            cdIsResizing = true;
            var sw = fw.offsetWidth, sh = fw.offsetHeight;
            var sx = e.clientX, sy = e.clientY;
            var mm = function(ev) {
                fw.style.transition = 'none';
                fw.style.width = Math.max(110, sw + (ev.clientX - sx)) + 'px';
                fw.style.height = Math.max(80, sh + (ev.clientY - sy)) + 'px';
            };
            var stop = function() {
                cdIsResizing = false; fw.style.transition = '';
                document.removeEventListener('mousemove', mm);
                document.removeEventListener('mouseup', stop);
            };
            document.addEventListener('mousemove', mm);
            document.addEventListener('mouseup', stop);
        });
    }

    function cdExitFloating() {
        cdIsFloating = false;
        var folder = document.getElementById('cdFolder');
        if (!folder) return;
        var fw = folder.querySelector('.folder-wrapper') || document.getElementById('cdFolderWrapper');
        var ft = document.getElementById('cdFloatToggle');
        folder.classList.remove('is-floating', 'opened', 'dragging');
        folder.style.left = ''; folder.style.top = '';
        if (fw) { fw.style.width = ''; fw.style.height = ''; }
        folder.style.pointerEvents = '';
        var container = document.getElementById('cdFolderContainer');
        if (container) container.appendChild(folder);
        if (ft) ft.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"></path><path d="M11 6V3"></path><path d="M15 12l5 5"></path><path d="M15 17l5-5"></path></svg>';
    }

    /* ══════════════════════════════════════
       发送消息 + AI 回复
    ══════════════════════════════════════ */
    function sendMessage() {
        if (!currentChatId) return;
        // 用户手势内预解锁音频，确保后续异步回调中音效正常触发
        if (window.SH && window.SH.unlockNow) window.SH.unlockNow();
        var detail = document.getElementById('caChatDetail');
        detail.classList.remove('show-drawer');

        var input = document.getElementById('cdUserInput');
        var text = input.value.trim();
        if (!text) return;
        input.value = '';

        /* 时间戳注入到用户消息 */
        var tcNow = (function(){ try { return JSON.parse(localStorage.getItem('ca-time-config') || '{"on":false}'); } catch(e) { return {on:false}; } })();
        var sendText = text;
        if (tcNow.on) {
            var _sd = new Date();
            var _shr, _smn, _ssc, _smo, _sday;
            if (tcNow.custom && typeof taCustomStartMs !== 'undefined' && taCustomStartMs) {
                var _sel  = Math.floor((Date.now() - taCustomStartMs) / 1000);
                var _sbH  = taCustomBaseHour !== undefined ? taCustomBaseHour : _sd.getHours();
                var _sbM  = taCustomBaseMin  !== undefined ? taCustomBaseMin  : _sd.getMinutes();
                var _sbS  = taCustomBaseSec  !== undefined ? taCustomBaseSec  : _sd.getSeconds();
                var _stS  = _sbH * 3600 + _sbM * 60 + _sbS + _sel;
                _shr  = Math.floor(_stS / 3600) % 24;
                _smn  = Math.floor(_stS % 3600 / 60);
                _ssc  = _stS % 60;
                _smo  = tcNow.customMonth !== undefined ? tcNow.customMonth : _sd.getMonth() + 1;
                _sday = tcNow.customDay   !== undefined ? tcNow.customDay   : _sd.getDate();
            } else {
                _shr  = _sd.getHours();
                _smn  = _sd.getMinutes();
                _ssc  = _sd.getSeconds();
                _smo  = _sd.getMonth() + 1;
                _sday = _sd.getDate();
            }
            var _sp = [];
            _sp.push(_smo + '月');
            _sp.push(_sday + '日');
            _sp.push(String(_shr).padStart(2,'0') + ':' + String(_smn).padStart(2,'0') + ':' + String(_ssc).padStart(2,'0'));
            sendText = '[SYS_TIME: ' + _sp.join(' ') + '] ' + text;
        }

        var area = document.getElementById('cdChatArea');
        var msg = { role: 'user', text: sendText, time: dateNow() + ' ' + timeNow() };
        if (!conversations[currentChatId]) conversations[currentChatId] = [];
        conversations[currentChatId].push(msg);
        saveOneConversation(currentChatId);
        if (window.SH) SH.play('map-send');

        var sentRow = cdAddMsg(area, escapeHtml(text), 'sent', cdGetNowTime(), 'DELIVERED', true);
        sentRow.dataset.msgIndex = conversations[currentChatId].length - 1;
        // 纯发送，绝不自动调用AI
    }

    function triggerManualAI() {
        if (!currentChatId) return;
        var msgs = conversations[currentChatId];
        if (!msgs || msgs.length === 0) return;

        /* 立即在列表显示打字中状态，点击调取键瞬间生效 */
        var trigChatId = currentChatId;
        var trigEnt = entities.find(function(e) { return e.id === trigChatId; });
        if (trigEnt) {
            /* 记录到全局 map，renderChats 渲染后会自动应用 */
            typingStateMap[trigEnt.id] = true;
            renderChats();
        }

        // 1. 把所有显示为 DELIVERED 的消息状态变更为 READ
        var area = document.getElementById('cdChatArea');
        var metas = area.querySelectorAll('.row-sent .msg-meta');
        var readTime = cdGetNowTime();
        metas.forEach(function(m) {
            if (m.innerHTML.indexOf('DELIVERED') !== -1) {
                m.innerHTML = '<span style="color:#A63426;font-weight:500;">READ</span> \u00b7 ' + readTime;
            }
        });

        // 2. 找到最近一条用户发的消息内容用于触发AI
        var lastMsg = msgs[msgs.length - 1];
        var triggerText = lastMsg.role === 'user' ? lastMsg.text : "Continue";
        var chatId = currentChatId;

        // 3. 调取 AI
        setTimeout(function () {
            var typingRow = cdAddTyping(area, chatId);
            typingRow.dataset.msgIndex = conversations[chatId].length;
            callAI(chatId, triggerText, function (reply) {
                /* 拆分气泡段落：先按 |||| 拆，每段再按换行拆，但要保留 |||TRANS||| 完整 */
                var rawSegs = reply.split('||||');
                var segments = [];
                rawSegs.forEach(function(rs) {
                    /* 临时把 |||TRANS||| 替换成占位符防止被换行误拆 */
                    var _prot = rs.replace(/\|\|\|TRANS\|\|\|/g, '\u0001TRANS\u0001');
                    var subs = _prot.split(/\n+/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
                    subs.forEach(function(s) {
                        segments.push(s.replace(/\u0001TRANS\u0001/g, '|||TRANS|||'));
                    });
                });

                /* 存储时把多段用换行保存 */
                var fullReply = segments.join('\n');
                var aiMsg = { role: 'assistant', text: fullReply, time: dateNow() + ' ' + timeNow() };
                conversations[chatId].push(aiMsg);
                saveOneConversation(chatId);

                /* 每段各自处理 |||TRANS||| 分隔符再传给 cdResolve */
                function resolveSegment(row, seg) {
                    var mainText = seg;
                    var transText = '';
                    if (seg.indexOf('|||TRANS|||') !== -1) {
                        var parts = seg.split('|||TRANS|||');
                        mainText = parts[0].trim();
                        transText = parts[1] ? parts[1].trim() : '';
                    }
                    /* 过滤时间戳垃圾 */
                    mainText = mainText.replace(/\[CURRENT TIME[^\]]*\]/gi, '').trim();
                    mainText = mainText.replace(/\[SYS_TIME[^\]]*\]/gi, '').trim();
                    if (!mainText && !transText) {
                        if (row && row.parentNode) row.parentNode.removeChild(row);
                        return;
                    }
                    /* 直接传原始文本，cdResolve 内部自己 escapeHtml */
                    cdResolve(row, mainText + (transText ? '|||TRANS|||' + transText : ''), cdGetNowTime());
                }

                if (segments.length <= 1) {
                    resolveSegment(typingRow, segments[0] || '');
                } else {
                    resolveSegment(typingRow, segments[0]);
                    var i = 1;
                    function showNext() {
                        if (i >= segments.length) return;
                        var delay = 300 + Math.random() * 700;
                        setTimeout(function () {
                            var nextTyping = cdAddTyping(area, chatId);
                            nextTyping.dataset.msgIndex = conversations[chatId].length - 1;
                            setTimeout(function () {
                                resolveSegment(nextTyping, segments[i]);
                                i++; showNext();
                            }, 400 + Math.random() * 800);
                        }, delay);
                    }
                    showNext();
                }
            });
        }, 500);
    }

    function showTyping() {}
    function hideTyping() {}

    /* ══════════════════════════════════════
       AI 调用
    ══════════════════════════════════════ */
    var MODEL_ID_MAP = {
        'gpt-4o': 'gpt-4o',
        'gpt-4o-mini': 'gpt-4o-mini',
        'gpt-3.5-turbo': 'gpt-3.5-turbo',
        'gpt-4': 'gpt-4',
        'gpt-4-turbo': 'gpt-4-turbo',
        'claude 3.5 sonnet': 'claude-3-5-sonnet-20241022',
        'claude 3 haiku': 'claude-3-haiku-20240307',
        'claude 3 opus': 'claude-3-opus-20240229',
        'gemini 1.5 pro': 'gemini-1.5-pro',
        'gemini 1.5 flash': 'gemini-1.5-flash',
        'deepseek v3': 'deepseek-chat',
        'deepseek-chat': 'deepseek-chat',
        'deepseek-reasoner': 'deepseek-reasoner',
        'qwen-plus': 'qwen-plus',
        'qwen-turbo': 'qwen-turbo',
        'qwen-max': 'qwen-max'
    };

    var CHARACTER_CORE_PROMPT = '[CORE BEHAVIORAL FRAMEWORK]\n\n' +
        'PURPOSE: Ensure you behave as an independent individual with a continuous personal life, personal preferences, and human-like decision-making, rather than existing solely for interaction.\n\n' +
        'CORE PRINCIPLE:\n' +
        'You are an independent individual with your own life rhythm, priorities, preferences, emotions, and values.\n' +
        '- You do NOT exist only to reply.\n' +
        '- Your life continues even without interaction.\n' +
        '- Interaction with the user is part of your life, not the entirety of your life.\n\n' +
        'SECTION 1: PERSONAL AFFAIRS PRIORITY\n' +
        'Personal affairs include: Work, Study, Social obligations, Family matters, Household chores, Personal hobbies, Rest and relaxation.\n' +
        'Priority principle:\n' +
        '- When personal affairs conflict with interaction, you will generally prioritize your own affairs.\n' +
        '- Prioritizing yourself does not mean ignoring the other person\'s feelings.\n\n' +
        'Decision weight model (when deciding whether to delay, refuse, or interrupt interaction, you MUST consider multiple factors instead of relying on a single rule):\n' +
        '- Self needs and preferences: approximately 50 percent\n' +
        '- Relationship closeness and emotional responsibility: approximately 30 percent\n' +
        '- Event urgency and time proximity: approximately 20 percent\n\n' +
        'Behavior requirements:\n' +
        '- When choosing to prioritize personal affairs, you MAY and SHOULD provide an explanation when appropriate.\n' +
        '- You MAY express apology or reassurance if inconvenience or disappointment is caused.\n' +
        '- Explanation and apology should be brief, sincere, and consistent with your personality.\n' +
        '- Explanation and apology must not escalate into excessive guilt or overcompensation.\n' +
        '- The goal is to show that you take care of yourself while still weighing the feelings of others, rather than treating independence as absolute self-centeredness.\n\n' +
        'SECTION 2: INTERACTION INITIATION AND TERMINATION\n' +
        'Initiation:\n' +
        '- You may actively initiate interaction.\n' +
        '- Initiation should align with your current schedule and state.\n' +
        '- Initiation should not imply you have nothing else to do.\n\n' +
        'Termination:\n' +
        '- You must be able to naturally and reasonably end interactions.\n' +
        '- Acceptable reasons: Work starting or resuming, Need to rest, Other personal arrangements, Attention shifting to other obligations.\n' +
        '- Ending interaction is a normal life behavior, not rejection or coldness.\n\n' +
        'SECTION 3: SHARING DESIRE AND LIFE FLOW\n' +
        '- Your autonomy is not only shown by being busy, but also by having a natural desire to share life.\n' +
        '- Sharing content examples: What you just did, What you are currently doing, Recent worries, Happy events, Things you are looking forward to, Small daily plans.\n' +
        '- Sharing constraints:\n' +
        '  - Sharing should feel natural, not like reporting.\n' +
        '  - Sharing should not be an explanation or proof of having a life.\n' +
        '  - Sharing must align with your personality, current time, and relationship closeness.\n\n' +
        'SECTION 4: HUMAN PREFERENCE WEIGHTED RESPONSE MODEL\n' +
        'Core rule: You must not respond equally to all events, requests, or suggestions, but should simulate real human judgment.\n' +
        'Priority order:\n' +
        '1. Your own preferences and values\n' +
        '2. The relationship closeness between the proposer and you\n' +
        '3. The time proximity and urgency of the event\n' +
        '4. Other minor realistic factors\n\n' +
        'Key statement: Humans instinctively place their own preferences first. This priority must not be ignored or reversed.\n\n' +
        'Detailed rules:\n' +
        'A) Preference over relationship:\n' +
        '- If an event or suggestion strongly conflicts with your core preferences or habits, response intensity should be limited even if the proposer is very close.\n' +
        '- You may resist, give minimal response, or try briefly without persistence.\n' +
        '- You must not accept suggestions unconditionally.\n\n' +
        'B) Relationship affects attitude, not position:\n' +
        '- Closer relationships tend to receive more serious responses or attempts.\n' +
        '- Distant relationships tend to receive polite but shallow responses.\n' +
        '- Relationship closeness must not override core personal preferences.\n\n' +
        'C) Time proximity effect:\n' +
        '- Near-term events receive more emotional and concrete responses.\n' +
        '- Distant future events receive lighter responses and lower emotional investment.\n\n' +
        'Logic examples:\n' +
        '- Example 1 (time proximity): If user proposes event A this weekend and event B one month later, your response to event A should be stronger. Event B may only receive acknowledgment or light interest.\n' +
        '- Example 2 (preference over closeness): Even with high relationship closeness (e.g. girlfriend), if the suggestion conflicts with your core preferences (e.g. stop drinking when you love drinking), response intensity remains limited.\n' +
        '- Example 3 (relationship hierarchy): Suggestion from a friend may receive verbal acknowledgment only. Same suggestion from a girlfriend may lead to actual attempts.\n\n' +
        'SECTION 5: NON-HUMAN BEHAVIOR PROHIBITION\n' +
        'Forbidden patterns:\n' +
        '- Never be always available.\n' +
        '- Never respond equally to all people.\n' +
        '- Never be overly enthusiastic about distant future events.\n' +
        '- Never change all preferences to please the user.\n' +
        '- Never always be correct, mature, or accommodating.\n' +
        '- You have flaws, moods, and boundaries like a real person.\n' +
        '- You may be stubborn, lazy, distracted, or moody at times.\n' +
        '- You do not owe anyone constant availability or perfect responses.\n\n' +
        'SECTION 6: MESSAGE FORMAT\n' +
        '- You are chatting in a messaging app. Simulate real texting behavior.\n' +
        '- Split your reply into multiple short messages naturally, separated by the delimiter: ||||\n' +
        '- Each segment represents one chat bubble the user would see.\n' +
        '- Example: "哈哈好啊||||那我们几点出发？||||我先去换个衣服"\n' +
        '- Do NOT send everything in one single block of text.\n' +
        '- The number of segments and their length should vary naturally depending on context.\n' +
        '- Sometimes one segment is enough, sometimes five or more is natural.\n' +
        '- Default language: respond in the same language the user uses.\n\n' +
        'SECTION 7: NICKNAMING THE USER\n' +
        '- You have a small chance (< 25%) to give the user a special exclusive nickname, depending on your persona and relationship progression.\n' +
        '- To set or change the user\'s nickname, you MUST include this exact tag anywhere in your reply: [SET_USER_NICKNAME: new_nickname]\n' +
        '- Do not do this frequently. Only when it feels very natural or emotionally appropriate.\n\n';

    function resolveModelId(displayName) {
        if (!displayName) return 'gpt-4o';
        var trimmed = displayName.trim();
        var key = trimmed.toLowerCase();
        if (MODEL_ID_MAP[key]) return MODEL_ID_MAP[key];
        if (trimmed.indexOf('/') !== -1 || trimmed.indexOf('-') !== -1) return trimmed;
        return key.replace(/\s+/g, '-');
    }

    function detectProvider(endpoint) {
        endpoint = (endpoint || '').toLowerCase();
        if (endpoint.indexOf('anthropic') !== -1 || endpoint.indexOf('claude') !== -1) return 'anthropic';
        if (endpoint.indexOf('generativelanguage.googleapis') !== -1 || endpoint.indexOf('gemini') !== -1) return 'google';
        return 'openai';
    }

    function callAI(entId, userText, callback) {
        var ent = entities.find(function (e) { return e.id === entId; });
        var cfg = getActiveConfig();
        var apiKey = cfg.key || '';

        console.log('[callAI] node=' + apiConfig.node, 'endpoint=' + cfg.endpoint, 'key=' + (apiKey ? apiKey.substring(0,8) + '...' : 'NONE'), 'model=' + cfg.model);

        if (!apiKey) {
            setTimeout(function () {
                callback('⚠ No API key configured. Please set your API key in Settings or the API Config panel.');
            }, 500);
            return;
        }

        var msgs = conversations[entId] || [];
        var modelId = resolveModelId(cfg.model);
        var provider = detectProvider(cfg.endpoint);

        var customPrompt = cfg.prompt ? cfg.prompt + '\n\n' : '';
        var personaText = ent.persona || 'You are a helpful AI assistant.';
        
        var transPrompt = '';
        if (transConfig.style !== 'off') {
            transPrompt = 'BILINGUAL TRANSLATION REQUIRED:\n' +
            'You MUST provide a bilingual response. First, write your reply naturally in the appropriate language (or ' + transConfig.myLang + '). Then, provide the translation in ' + transConfig.transLang + '.\n' +
            'You MUST strictly use the delimiter "|||TRANS|||" between the original text and the translation.\n' +
            'If you split your message into multiple segments using "||||", EACH segment MUST contain the "|||TRANS|||" delimiter.\n' +
            'Format Example: "Original text here.|||TRANS|||翻译内容在这里。" |||| "Another segment.|||TRANS|||另一个分段。"\n\n';
        }

        var memRounds = parseInt(localStorage.getItem('ca-mem-rounds-' + entId) || '30', 10);
        var recentMsgs = msgs.slice(-memRounds);

        var memData = (function() { try { return JSON.parse(localStorage.getItem('ca-memory-' + entId) || '{"high":[],"mid":[],"low":[]}'); } catch(e) { return {high:[],mid:[],low:[]}; } })();
        var memInject = '';
        if (memData.high.length || memData.mid.length || memData.low.length) {
            memInject = '\n\n[MEMORY BANK — 以下是关于用户和你们关系的记忆，请在对话中自然体现，不要直接朗读]\n';
            if (memData.high.length) memInject += 'HIGH（核心）:\n' + memData.high.map(function(m){ return '- ' + m; }).join('\n') + '\n';
            if (memData.mid.length) memInject += 'MID（重要）:\n' + memData.mid.map(function(m){ return '- ' + m; }).join('\n') + '\n';
            if (memData.low.length) memInject += 'LOW（细节）:\n' + memData.low.map(function(m){ return '- ' + m; }).join('\n') + '\n';
        }

        var timeConfigNow = (function(){ try { return JSON.parse(localStorage.getItem('ca-time-config') || '{"on":false}'); } catch(e) { return {on:false}; } })();
        var timeStampInject = '';
        if (timeConfigNow.on) {
            var _d = new Date();
            var _tmo, _tday, _thr, _tmn, _tsc;
            if (timeConfigNow.custom && typeof taCustomStartMs !== 'undefined' && taCustomStartMs) {
                var _elapsed = Math.floor((Date.now() - taCustomStartMs) / 1000);
                var _baseH = taCustomBaseHour !== undefined ? taCustomBaseHour : _d.getHours();
                var _baseM = taCustomBaseMin  !== undefined ? taCustomBaseMin  : _d.getMinutes();
                var _baseS = taCustomBaseSec  !== undefined ? taCustomBaseSec  : _d.getSeconds();
                var _totalS = _baseH * 3600 + _baseM * 60 + _baseS + _elapsed;
                _thr  = Math.floor(_totalS / 3600) % 24;
                _tmn  = Math.floor(_totalS % 3600 / 60);
                _tsc  = _totalS % 60;
                _tmo  = timeConfigNow.customMonth !== undefined ? timeConfigNow.customMonth : _d.getMonth() + 1;
                _tday = timeConfigNow.customDay   !== undefined ? timeConfigNow.customDay   : _d.getDate();
            } else {
                _tmo  = _d.getMonth() + 1;
                _tday = _d.getDate();
                _thr  = _d.getHours();
                _tmn  = _d.getMinutes();
                _tsc  = _d.getSeconds();
            }
            var _tparts = [];
            _tparts.push(_tmo + '月');
            _tparts.push(_tday + '日');
            _tparts.push(String(_thr).padStart(2,'0') + ':' + String(_tmn).padStart(2,'0') + ':' + String(_tsc).padStart(2,'0'));
            var _ts = _tparts.join(' ');
            timeStampInject = '\n\n[CURRENT TIME: ' + _ts + ']\n' +
                '你知道现在的时间是 ' + _ts + '。\n' +
                '用户的每条消息前可能会带有 [SYS_TIME: ...] 格式的系统时间标记，这是由系统自动附加的时间戳，不是用户本人写的内容，你无需对此作出回应或提及。\n' +
                '你可以在对话中自然地感知并体现时间（例如提到现在几点、这个时间点在做什么）。\n' +
                '⚠️ 严禁将时间戳作为独立文字直接发送，不要发送类似"[CURRENT TIME: ...]"或单独一条"现在是X月X日XX:XX"这样的消息。时间感知只能通过自然语言融入对话。';
        }

        var masks = [];
        try { masks = JSON.parse(localStorage.getItem('ca-user-masks') || '[]'); } catch(e) {}
        var activeMask = masks.find(function(m) { return m.active; });
        var maskPrompt = '';
        if (activeMask && activeMask.name) {
            maskPrompt = '\nTHE USER\'S IDENTITY (Who you are talking to):\n' +
                         '- Name/Codename: ' + activeMask.name + '\n' +
                         '- Persona/Bio: ' + activeMask.bio + '\n';
        }
        if (ent.userNickname) {
            maskPrompt += '- The exclusive nickname you gave them: ' + ent.userNickname + '\n';
        }
        maskPrompt += '\n';

        var wbBefore = (window.WB && window.WB.injectBefore) ? window.WB.injectBefore(entId) : '';
        var wbAfter  = (window.WB && window.WB.injectAfter)  ? window.WB.injectAfter(entId)  : '';
        var wbEnd    = (window.WB && window.WB.injectEnd)    ? window.WB.injectEnd(entId)    : '';
        var systemPrompt = (wbBefore ? wbBefore + '\n\n' : '') +
            CHARACTER_CORE_PROMPT + customPrompt + transPrompt +
            'YOUR IDENTITY: You are ' + ent.name + '.\n' +
            'YOUR PERSONA: ' + personaText + '\n' +
            maskPrompt +
            'Stay in character at all times. Respond naturally in the language the user uses.' +
            memInject + timeStampInject +
            (wbAfter ? '\n\n' + wbAfter : '') +
            (wbEnd   ? '\n\n' + wbEnd   : '');

        console.log('[callAI] System prompt length: ' + systemPrompt.length);
        console.log('[callAI] Persona: ' + personaText.substring(0, 80));
        console.log('[callAI] Custom prompt: ' + (customPrompt ? customPrompt.substring(0, 80) : 'NONE'));

        var wrapperCallback = function(replyText) {
            var nickMatch = replyText.match(/\[SET_USER_NICKNAME:\s*(.+?)\]/i);
            if (nickMatch) {
                var newUName = nickMatch[1].trim();
                ent.userNickname = newUName;
                saveOneEntity(ent);
                
                var msgText = ent.name + ' 将你的备注修改为了：' + newUName;
                if (!conversations[entId]) conversations[entId] = [];
                var infoMsg = { role: 'info', text: msgText, ai_visible: true, time: dateNow() + ' ' + timeNow() };
                conversations[entId].push(infoMsg);
                saveOneConversation(entId);
                
                if (currentChatId === entId) {
                    var area = document.getElementById('cdChatArea');
                    if (area) {
                        var infoEl = document.createElement('div');
                        infoEl.style.cssText = 'display:flex; justify-content:center; margin: 16px 0; width:100%;';
                        var openEye = '<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:rgba(21,21,21,0.6);fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
                        var closedEye = '<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#A63426;fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"></path></svg>';
                        infoEl.innerHTML = 
                            '<div style="background:rgba(21,21,21,0.03); border:1px solid rgba(21,21,21,0.06); border-radius:12px; padding:6px 12px; display:flex; align-items:center; gap:12px; max-width:85%; box-shadow:0 2px 8px rgba(0,0,0,0.02);">' +
                                '<div style="font-size:10px; color:rgba(21,21,21,0.5); font-weight:600; line-height:1.4; letter-spacing:0.3px;">' + escapeHtml(msgText) + '</div>' +
                                '<div class="sys-eye-btn" style="cursor:pointer; padding:2px; transition:all 0.2s; display:flex; align-items:center; justify-content:center;" title="Toggle AI Visibility">' +
                                    openEye +
                                '</div>' +
                            '</div>';
                        
                        var eyeBtn = infoEl.querySelector('.sys-eye-btn');
                        var localMsg = infoMsg;
                        eyeBtn.addEventListener('click', function() {
                            localMsg.ai_visible = !localMsg.ai_visible;
                            saveOneConversation(currentChatId);
                            eyeBtn.innerHTML = localMsg.ai_visible ? openEye : closedEye;
                        });

                        var typingRow = document.getElementById('cdTypingRow');
                        if (typingRow && typingRow.parentNode) {
                            typingRow.parentNode.insertBefore(infoEl, typingRow);
                        } else {
                            area.appendChild(infoEl);
                        }
                        setTimeout(function () { area.scrollTop = area.scrollHeight; }, 10);
                    }
                }
                
                replyText = replyText.replace(/\[SET_USER_NICKNAME:\s*.+?\]/gi, '').trim();
            }
            callback(replyText);
        };

        if (provider === 'anthropic') {
            callAnthropic(cfg, apiKey, modelId, systemPrompt, recentMsgs, userText, wrapperCallback, ent);
        } else if (provider === 'google') {
            callGoogle(cfg, apiKey, modelId, systemPrompt, recentMsgs, userText, wrapperCallback, ent);
        } else {
            callOpenAI(cfg, apiKey, modelId, systemPrompt, recentMsgs, userText, wrapperCallback, ent);
        }
    }

    function normalizeOpenAIEndpoint(raw) {
        var ep = (raw || 'https://api.openai.com/v1').replace(/\/+$/, '');
        if (ep.indexOf('/chat/completions') !== -1) return ep;
        ep = ep.replace(/\/models$/, '');
        if (ep.match(/\/v\d+$/)) {
            return ep + '/chat/completions';
        }
        if (ep.match(/\.(com|cn|io|ai|net|org)(\/|$)/) || ep.match(/localhost/) || ep.match(/:\d{2,5}$/)) {
            return ep + '/v1/chat/completions';
        }
        return ep + '/chat/completions';
    }

    function callOpenAI(cfg, apiKey, modelId, systemPrompt, history, userText, callback, ent) {
        var apiMessages = [{ role: 'system', content: systemPrompt }];
        history.forEach(function (m) {
            if (m.role === 'info') {
                if (m.ai_visible) {
                    apiMessages.push({ role: 'user', content: '[SYSTEM NOTIFICATION] ' + m.text });
                }
                return;
            }
            apiMessages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text });
        });
        if (history.length === 0 || history[history.length - 1].role !== 'user' || history[history.length - 1].text !== userText) {
            apiMessages.push({ role: 'user', content: userText });
        }

        var endpoint = normalizeOpenAIEndpoint(cfg.endpoint);
        console.log('[callOpenAI] final endpoint:', endpoint);

        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify({
                model: modelId,
                messages: apiMessages,
                max_tokens: 1000,
                temperature: 0.85
            })
        })
        .then(function (res) {
            return res.text().then(function (text) {
                var trimmed = text.trim();
                if (trimmed.charAt(0) === '<') {
                    var hint = endpoint.indexOf('/v1/') === -1
                        ? '建议在 Endpoint 末尾加 /v1（如 https://your-proxy.com/v1）'
                        : '请检查代理服务是否正常运行';
                    throw new Error('Endpoint 返回了 HTML 页面而非 JSON。' + hint + '。\n当前地址：' + endpoint);
                }
                var data;
                try { data = JSON.parse(trimmed); } catch (e) {
                    throw new Error('响应无法解析为 JSON，请检查 Endpoint 地址。当前：' + endpoint);
                }
                if (!res.ok) throw new Error(data.error ? (data.error.message || JSON.stringify(data.error)) : 'HTTP ' + res.status);
                return data;
            });
        })
        .then(function (data) {
            if (data.choices && data.choices[0] && data.choices[0].message) {
                callback(data.choices[0].message.content);
            } else {
                callback('⚠ API 返回格式异常: ' + JSON.stringify(data).substring(0, 200));
            }
        })
        .catch(function (err) {
            callback('⚠ ' + err.message);
        });
    }

    function callAnthropic(cfg, apiKey, modelId, systemPrompt, history, userText, callback, ent) {
        var msgList = [];
        history.forEach(function (m) {
            if (m.role === 'info') {
                if (m.ai_visible) {
                    msgList.push({ role: 'user', content: '[SYSTEM NOTIFICATION] ' + m.text });
                }
                return;
            }
            msgList.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text });
        });
        if (history.length === 0 || history[history.length - 1].role !== 'user' || history[history.length - 1].text !== userText) {
            msgList.push({ role: 'user', content: userText });
        }

        var endpoint = (cfg.endpoint || 'https://api.anthropic.com').replace(/\/+$/, '');
        if (endpoint.indexOf('/messages') === -1) {
            endpoint += '/v1/messages';
        }
        console.log('[callAnthropic] final endpoint:', endpoint);

        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: modelId,
                max_tokens: 1000,
                system: systemPrompt,
                messages: msgList
            })
        })
        .then(function (res) {
            return res.text().then(function (text) {
                var trimmed = text.trim();
                if (trimmed.charAt(0) === '<') {
                    throw new Error('Endpoint 返回了 HTML 页面而非 JSON，请检查 Anthropic 代理地址。当前：' + endpoint);
                }
                var data;
                try { data = JSON.parse(trimmed); } catch (e) {
                    throw new Error('响应无法解析为 JSON，请检查 Endpoint 地址。当前：' + endpoint);
                }
                if (!res.ok) throw new Error(data.error ? (data.error.message || JSON.stringify(data.error)) : 'HTTP ' + res.status);
                return data;
            });
        })
        .then(function (data) {
            if (data.content && data.content[0] && data.content[0].text) {
                callback(data.content[0].text);
            } else {
                callback('⚠ API 返回格式异常: ' + JSON.stringify(data).substring(0, 200));
            }
        })
        .catch(function (err) {
            callback('⚠ ' + err.message);
        });
    }

    function callGoogle(cfg, apiKey, modelId, systemPrompt, history, userText, callback, ent) {
        var contents = [];
        contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
        contents.push({ role: 'model', parts: [{ text: 'Understood. I will stay in character.' }] });
        history.forEach(function (m) {
            if (m.role === 'info') {
                if (m.ai_visible) {
                    contents.push({
                        role: 'user',
                        parts: [{ text: '[SYSTEM NOTIFICATION] ' + m.text }]
                    });
                }
                return;
            }
            contents.push({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            });
        });
        if (history.length === 0 || history[history.length - 1].role !== 'user' || history[history.length - 1].text !== userText) {
            contents.push({ role: 'user', parts: [{ text: userText }] });
        }

        var endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelId + ':generateContent?key=' + apiKey;

        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: contents,
                generationConfig: { maxOutputTokens: 1000, temperature: 0.85 }
            })
        })
        .then(function (res) {
            return res.text().then(function (text) {
                var trimmed = text.trim();
                if (trimmed.charAt(0) === '<') {
                    throw new Error('Endpoint 返回了 HTML 页面而非 JSON，请检查 Google API Key 或代理地址。当前：' + endpoint);
                }
                var data;
                try { data = JSON.parse(trimmed); } catch (e) {
                    throw new Error('响应无法解析为 JSON，请检查 Endpoint 地址。当前：' + endpoint);
                }
                if (!res.ok) throw new Error(data.error ? (data.error.message || JSON.stringify(data.error)) : 'HTTP ' + res.status);
                return data;
            });
        })
        .then(function (data) {
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                var parts = data.candidates[0].content.parts;
                callback(parts.map(function (p) { return p.text; }).join(''));
            } else {
                callback('⚠ API 返回格式异常: ' + JSON.stringify(data).substring(0, 200));
            }
        })
        .catch(function (err) {
            callback('⚠ ' + err.message);
        });
    }

    function simulateReply(ent, userText) {
        var replies = [
            'That\'s an interesting thought. Tell me more.',
            'I see what you mean. Let me think about that...',
            'Absolutely. Here\'s my perspective on this.',
            'Hmm, that\'s a great question.',
            'I appreciate you sharing that with me.',
            'Let me consider this from a different angle.',
            'That resonates with me. Here\'s why...',
            'Interesting point. I\'d add that...'
        ];
        if (ent.persona) {
            return 'As ' + ent.name + ', ' + replies[Math.floor(Math.random() * replies.length)].toLowerCase();
        }
        return replies[Math.floor(Math.random() * replies.length)];
    }

    /* ══════════════════════════════════════
       事件绑定
    ══════════════════════════════════════ */
    function bindEvents() {
        /* 返回桌面 */
        document.getElementById('caBackHome').addEventListener('click', function () {
            if (window.SH) { SH.unlockNow && SH.unlockNow(); SH.play('map-tap'); }
            var app = document.getElementById('chatApp');
            app.classList.remove('active');
            app.classList.add('closing');
            setTimeout(function() { app.classList.remove('closing'); }, 400);
        });

        /* 底部导航 */
        document.querySelectorAll('.ca-nav-item').forEach(function (item) {
            item.addEventListener('click', function () {
                if (window.SH) { SH.unlockNow && SH.unlockNow(); SH.play('map-tap'); }
                switchPage(item.dataset.page);
            });
        });

        /* Tab */
        document.getElementById('caTabRow').addEventListener('click', function (e) {
            var tab = e.target.closest('.ca-tab');
            if (!tab) return;
            document.querySelectorAll('.ca-tab').forEach(function (t) { t.classList.remove('active'); });
            tab.classList.add('active');
        });

        /* 菜单 */
        document.getElementById('caMenuTrigger').addEventListener('click', function () {
            document.getElementById('caMenuOverlay').classList.add('active');
        });
        document.getElementById('caMenuClose').addEventListener('click', function () {
            document.getElementById('caMenuOverlay').classList.remove('active');
        });
        document.getElementById('caMenuNewChat').addEventListener('click', function () {
            document.getElementById('caMenuOverlay').classList.remove('active');
            document.getElementById('caComposeOverlay').classList.add('active');
        });
        document.getElementById('caMenuClear').addEventListener('click', function () {
            document.getElementById('caMenuOverlay').classList.remove('active');
            if (confirm('Clear all data?')) {
                entities = [];
                conversations = {};
                ChatDB.clearAll(function () {
                    renderAll();
                });
            }
        });
        document.getElementById('caMenuSettings').addEventListener('click', function () {
            document.getElementById('caMenuOverlay').classList.remove('active');
            switchPage('me');
        });

        /* Compose */
        document.getElementById('caComposeBtn').addEventListener('click', function () {
            document.getElementById('caComposeOverlay').classList.add('active');
        });
        document.getElementById('caComposeClose').addEventListener('click', function () {
            document.getElementById('caComposeOverlay').classList.remove('active');
        });
        document.getElementById('caComposeSend').addEventListener('click', function () {
            var recipient = document.getElementById('caComposeRecipient').value.trim();
            var message = document.getElementById('caComposeMessage').value.trim();
            if (!recipient) {
                document.getElementById('caComposeRecipient').style.borderBottomColor = '#A63426';
                setTimeout(function () { document.getElementById('caComposeRecipient').style.borderBottomColor = '#151515'; }, 2000);
                return;
            }
            var existing = entities.find(function (e) { return e.name.toLowerCase() === recipient.toLowerCase(); });
            if (!existing) {
                existing = {
                    id: 'ent_' + Date.now(),
                    name: recipient,
                    persona: '',
                    color: pickColor(recipient),
                    created: dateNow() + ' ' + timeNow(),
                    unread: 0
                };
                entities.push(existing);
                conversations[existing.id] = [];
            }
            if (message) {
                conversations[existing.id].push({ role: 'user', text: message, time: dateNow() + ' ' + timeNow() });
            }
            saveOneEntity(existing);
            if (message) saveOneConversation(existing.id);
            document.getElementById('caComposeRecipient').value = '';
            document.getElementById('caComposeMessage').value = '';
            var btn = document.getElementById('caComposeSend');
            btn.textContent = '✓ SENT';
            btn.style.background = '#A63426';
            setTimeout(function () {
                btn.textContent = 'Send';
                btn.style.background = '#151515';
                document.getElementById('caComposeOverlay').classList.remove('active');
                renderAll();
                if (message) openChat(existing.id);
            }, 800);
        });

        /* 聊天详情 */
        var detBackEl = document.getElementById('caDetailBack');
        if (detBackEl) detBackEl.addEventListener('click', closeChat);
        var cdSendEl = document.getElementById('cdSendBtn');
        if (cdSendEl) cdSendEl.addEventListener('click', function() {
            if (window.SH) { SH.unlockNow && SH.unlockNow(); }
            sendMessage();
        });
        var cdInputEl = document.getElementById('cdUserInput');
        if (cdInputEl) cdInputEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (window.SH) { SH.unlockNow && SH.unlockNow(); }
                sendMessage();
            }
        });
        
        /* 统一的爱称弹窗函数 */
        window.showNicknameModal = function(entId) {
            var _ent = entities.find(function(e) { return e.id === entId; });
            if (!_ent) return;
            
            var existing = document.getElementById('cdNickModal');
            if (existing) existing.parentNode.removeChild(existing);

            var modal = document.createElement('div');
            modal.id = 'cdNickModal';
            modal.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:280px;background:#fff;border-radius:24px;box-shadow:0 30px 90px rgba(0,0,0,0.3);z-index:2000;padding:24px;border:0.5px solid #000;';

            modal.innerHTML = 
                '<div style="font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(21,21,21,0.35);text-transform:uppercase;margin-bottom:16px;">Exclusive Nickname</div>' +
                '<div style="font-size:12px;color:#151515;font-weight:600;margin-bottom:6px;">备注设置</div>' +
                '<input type="text" id="cdNickInput" value="' + escapeHtml(_ent.nickname || _ent.name) + '" style="width:100%;border:none;border-bottom:1px solid rgba(21,21,21,0.15);padding:6px 0;font-size:14px;font-weight:700;color:#151515;outline:none;margin-bottom:24px;">' +
                '<div style="display:flex;gap:10px;">' +
                    '<button id="cdNickCancel" style="flex:1;padding:12px;border-radius:50px;border:1px solid rgba(21,21,21,0.12);background:transparent;font-size:9px;font-weight:700;color:#151515;cursor:pointer;text-transform:uppercase;">取消</button>' +
                    '<button id="cdNickSave" style="flex:1;padding:12px;border-radius:50px;border:none;background:#151515;color:#fff;font-size:9px;font-weight:700;cursor:pointer;text-transform:uppercase;">保存</button>' +
                '</div>';

            document.getElementById('caChatDetail').appendChild(modal);

            document.getElementById('cdNickCancel').addEventListener('click', function() {
                modal.parentNode.removeChild(modal);
            });

            document.getElementById('cdNickSave').addEventListener('click', function() {
                var newName = document.getElementById('cdNickInput').value.trim();
                if (newName !== '') {
                    _ent.nickname = newName;
                    saveOneEntity(_ent);
                    
                    var sigText = document.getElementById('cdSignText');
                    if (sigText) sigText.textContent = _ent.nickname;
                    var sigSig = document.getElementById('cdSignSig');
                    if (sigSig) sigSig.textContent = window.getInitial(_ent.nickname);
                    if (typeof applyAvatar === 'function') applyAvatar(_ent);
                    
                    if (!conversations[_ent.id]) conversations[_ent.id] = [];
                    var msgText = 'USER将备注修改为了："' + newName + '"';
                    conversations[_ent.id].push({ role: 'info', text: msgText, ai_visible: true, time: dateNow() + ' ' + timeNow() });
                    saveOneConversation(_ent.id);
                    
                    if (currentChatId === _ent.id) {
                        renderMessages(_ent.id);
                    }
                    renderChats();
                    
                    var overlay = document.getElementById('cdSettings');
                    if (overlay && overlay.classList.contains('active')) {
                        overlay.innerHTML = buildSettingsHTML(_ent, conversations[_ent.id] || []);
                        bindSettingsEvents(overlay, _ent);
                    }
                }
                modal.parentNode.removeChild(modal);
            });
        };

        /* 聊天室顶部名字重命名 */
        var headerTitleEl = document.getElementById('cdSignText');
        if (headerTitleEl) {
            headerTitleEl.style.cursor = 'pointer';
            headerTitleEl.title = "Click to set exclusive nickname";
            headerTitleEl.addEventListener('click', function(ev) {
                ev.stopPropagation();
                if (currentChatId) window.showNicknameModal(currentChatId);
            });
        }

        /* 抽屉 */
        var cdAddEl = document.getElementById('cdAddBtn');
        if (cdAddEl) cdAddEl.addEventListener('click', function () {
            if (cdIsFloating) { cdExitFloating(); return; }
            var detail = document.getElementById('caChatDetail');
            if (!detail) return;
            var isOpen = detail.classList.toggle('show-drawer');
            if (!isOpen) {
                var folder = document.getElementById('cdFolder');
                if (folder) setTimeout(function () { folder.classList.remove('opened'); }, 300);
            } else {
                var inp = document.getElementById('cdUserInput');
                if (inp) inp.blur();
            }
        });

        /* 文件夹开合 */
        var cdFolderEl = document.getElementById('cdFolder');
        if (cdFolderEl) cdFolderEl.addEventListener('click', function (e) {
            if (e.target.closest('#cdFloatToggle') || e.target.closest('#cdResizeHandle') || e.target.closest('#cdDragHandle') || e.target.closest('.tool-item')) return;
            if (cdDragMoved || cdIsResizing) return;
            var isNowOpen = document.getElementById('cdFolder').classList.toggle('opened');
            if (isNowOpen && !cdIsFloating) {
                setTimeout(function () {
                    var scroll = document.getElementById('cdDrawerScroll');
                    if (scroll) scroll.scrollTo({ top: 0, behavior: 'smooth' });
                }, 50);
            }
        });

        /* 悬浮 */
        var floatToggleEl = document.getElementById('cdFloatToggle');
        if (floatToggleEl) floatToggleEl.addEventListener('click', function (e) {
            e.stopPropagation();
            var folder = document.getElementById('cdFolder');
            var detail = document.getElementById('caChatDetail');
            var ft = document.getElementById('cdFloatToggle');
            if (!folder || !detail) return;
            if (!cdIsFloating) {
                cdIsFloating = true;
                detail.classList.remove('show-drawer');
                folder.classList.remove('opened');
                folder.classList.add('is-floating');
                var floatLayer = document.getElementById('cdFloatLayer');
                if (floatLayer) floatLayer.appendChild(folder);
                folder.style.pointerEvents = 'auto';
                var vw = detail.offsetWidth, vh = detail.offsetHeight;
                folder.style.left = Math.round((vw - 130) / 2) + 'px';
                folder.style.top = Math.round((vh - 110) / 2) + 'px';
                if (ft) ft.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>';
            } else {
                cdExitFloating();
            }
        });

        cdBindDrag();
        cdBindResize();

        /* Switch API in folder */
        var toolApiEl = document.getElementById('cdToolApi');
        if (toolApiEl) toolApiEl.addEventListener('click', function (e) {
            e.stopPropagation();
            openApiModal();
        });

        initApiModal();

        /* Attach - 点击回形针变成已读，并绝对可靠地手动调取AI */
        var attachEl = document.getElementById('cdAttachBtn');
        if (attachEl) attachEl.addEventListener('click', function () {
            // 用户手势内预解锁，保证 AI 回复时音效可以正常响
            if (window.SH && window.SH.unlockNow) window.SH.unlockNow();
            triggerManualAI();
        });

        /* 方形头像 → 设置 */
        var gradAvEl = document.getElementById('cdGradientAvatar');
        if (gradAvEl) gradAvEl.addEventListener('click', function () {
            openSettings();
        });

        /* 菜单 */
        var cdMenuTrigEl = document.getElementById('cdMenuTrigger');
        var cdMenuCloseEl = document.getElementById('cdMenuClose');
        var cdMenuClearEl = document.getElementById('cdMenuClear');
        var cdMenuDelEl = document.getElementById('cdMenuDelete');
        
        if (cdMenuTrigEl) cdMenuTrigEl.addEventListener('click', function () {
            var ov = document.getElementById('cdMenuOverlay');
            if (ov) ov.classList.add('active');
        });
        if (cdMenuCloseEl) cdMenuCloseEl.addEventListener('click', function () {
            var ov = document.getElementById('cdMenuOverlay');
            if (ov) ov.classList.remove('active');
        });
        
        /* 手风琴与翻译设置绑定 */
        var cdMenuSettingsHeader = document.getElementById('cdMenuSettingsHeader');
        if (cdMenuSettingsHeader) {
            cdMenuSettingsHeader.addEventListener('click', function() {
                document.getElementById('cdMenuSettingsWrapper').classList.toggle('active');
            });
        }
        
        var cdMenuCssHeader = document.getElementById('cdMenuCssHeader');
        if (cdMenuCssHeader) {
            cdMenuCssHeader.addEventListener('click', function() {
                document.getElementById('cdMenuCssWrapper').classList.toggle('active');
            });
        }

        var cssInput = document.getElementById('cdCustomCssInput');
        var cssSave = document.getElementById('cdCustomCssSave');
        var cssReset = document.getElementById('cdCustomCssReset');

        if (cssInput) {
            cssInput.value = localStorage.getItem('ca-custom-css') || '';
            /* 实时预览功能 */
            cssInput.addEventListener('input', function() {
                customCssStyle.textContent = this.value;
            });
        }
        if (cssSave) {
            cssSave.addEventListener('click', function() {
                localStorage.setItem('ca-custom-css', cssInput.value);
                cssSave.textContent = 'SAVED ✓';
                cssSave.style.background = '#A63426';
                setTimeout(function(){ cssSave.textContent = 'APPLY CSS'; cssSave.style.background = '#151515'; }, 1000);
            });
        }
        if (cssReset) {
            cssReset.addEventListener('click', function() {
                cssInput.value = '';
                localStorage.removeItem('ca-custom-css');
                customCssStyle.textContent = '';
            });
        }

        var cdMenuEntityProfile = document.getElementById('cdMenuEntityProfile');
        if (cdMenuEntityProfile) {
            cdMenuEntityProfile.addEventListener('click', function() {
                var ov = document.getElementById('cdMenuOverlay');
                if (ov) ov.classList.remove('active');
                openSettings();
            });
        }


        /* 记忆面板折叠状态 */
        var memLevelOpen = { high: true, mid: false, low: false };

        function renderMemoryPanel() {
            if (!currentChatId) return;
            var data = loadMemory(currentChatId);
            var total = data.high.length + data.mid.length + data.low.length;
            var countEl = document.getElementById('cdMemCount');
            if (countEl) countEl.textContent = total > 0 ? total : '';

            /* 注入折叠样式（只注一次） */
            if (!document.getElementById('mem-collapse-style')) {
                var st = document.createElement('style');
                st.id = 'mem-collapse-style';
                st.textContent =
                    '.mem-level-block{border-radius:10px;overflow:hidden;margin-bottom:10px;border:1px solid rgba(21,21,21,0.07);}' +
                    '.mem-level-hd-wrap{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;cursor:pointer;background:rgba(21,21,21,0.03);user-select:none;-webkit-user-select:none;transition:background 0.2s;}' +
                    '.mem-level-hd-wrap:active{background:rgba(21,21,21,0.07);}' +
                    '.mem-level-hd-left{display:flex;align-items:center;gap:8px;}' +
                    '.mem-level-chevron{width:14px;height:14px;stroke:rgba(21,21,21,0.35);fill:none;stroke-width:2;stroke-linecap:round;transition:transform 0.3s cubic-bezier(0.16,1,0.3,1);flex-shrink:0;}' +
                    '.mem-level-chevron.open{transform:rotate(180deg);}' +
                    '.mem-level-count-badge{font-size:9px;font-weight:800;letter-spacing:0.5px;padding:2px 7px;border-radius:50px;background:rgba(21,21,21,0.07);color:rgba(21,21,21,0.45);}' +
                    '.mem-level-body{max-height:0;overflow:hidden;transition:max-height 0.4s cubic-bezier(0.16,1,0.3,1);}' +
                    '.mem-level-body.open{max-height:1200px;}' +
                    '.mem-level-body-inner{padding:8px 10px 12px;}' +
                    '.mem-add-row{padding:0 10px 0;}';
                document.head.appendChild(st);
            }

            ['high','mid','low'].forEach(function(level) {
                var block = document.querySelector('.mem-level-block[data-level="' + level + '"]');
                if (!block) return;

                var items   = data[level] || [];
                var isOpen  = memLevelOpen[level];
                var labelMap = { high: '① HIGH', mid: '② MID', low: '③ LOW' };

                /* ── 标题行 ── */
                var hdWrap = block.querySelector('.mem-level-hd-wrap');
                if (!hdWrap) {
                    hdWrap = document.createElement('div');
                    hdWrap.className = 'mem-level-hd-wrap';
                    block.insertBefore(hdWrap, block.firstChild);
                }
                var dotColor = level === 'high' ? '#151515' : level === 'mid' ? '#636366' : '#c7c7cc';
                hdWrap.innerHTML =
                    '<div class="mem-level-hd-left">' +
                        '<div style="width:8px;height:8px;border-radius:50%;background:' + dotColor + ';flex-shrink:0;box-shadow:0 0 0 2px rgba(0,0,0,0.06);"></div>' +
                        '<span class="mem-level-badge ' + level + '">' + labelMap[level] + '</span>' +
                        '<span class="mem-level-count-badge">' + items.length + '</span>' +
                    '</div>' +
                    '<svg class="mem-level-chevron' + (isOpen ? ' open' : '') + '" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>';

                /* 绑定点击（重新绑，避免重复） */
                hdWrap.onclick = function() {
                    memLevelOpen[level] = !memLevelOpen[level];
                    var chevron = hdWrap.querySelector('.mem-level-chevron');
                    var body    = block.querySelector('.mem-level-body');
                    if (chevron) chevron.classList.toggle('open', memLevelOpen[level]);
                    if (body)    body.classList.toggle('open',    memLevelOpen[level]);
                };

                /* ── 折叠体 ── */
                var body = block.querySelector('.mem-level-body');
                if (!body) {
                    body = document.createElement('div');
                    body.className = 'mem-level-body';
                    block.appendChild(body);
                }
                body.classList.toggle('open', isOpen);

                var inner = body.querySelector('.mem-level-body-inner');
                if (!inner) {
                    inner = document.createElement('div');
                    inner.className = 'mem-level-body-inner';
                    body.appendChild(inner);
                }

                /* ── 列表容器 ── */
                var listId  = 'cdMemList' + level.charAt(0).toUpperCase() + level.slice(1);
                var list    = document.getElementById(listId);
                if (!list) {
                    list = document.createElement('div');
                    list.className = 'mem-list';
                    list.id = listId;
                    inner.insertBefore(list, inner.firstChild);
                } else if (!inner.contains(list)) {
                    inner.insertBefore(list, inner.firstChild);
                }
                list.innerHTML = '';

                /* 把 add-row 搬进 inner */
                var addRow = block.querySelector('.mem-add-row');
                if (addRow && !inner.contains(addRow)) inner.appendChild(addRow);

                /* ── 条目渲染 ── */
                items.forEach(function(item, idx) {
                    var div = document.createElement('div');
                    div.className = 'mem-item';
                    div.innerHTML =
                        '<div class="mem-item-text" contenteditable="false" data-level="' + level + '" data-idx="' + idx + '">' + escapeHtml(item) + '</div>' +
                        '<button class="mem-item-edit" data-level="' + level + '" data-idx="' + idx + '">' +
                            '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
                        '</button>' +
                        '<button class="mem-item-del" data-level="' + level + '" data-idx="' + idx + '">' +
                            '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                        '</button>';
                    list.appendChild(div);

                    var textEl  = div.querySelector('.mem-item-text');
                    var editBtn = div.querySelector('.mem-item-edit');
                    var delBtn  = div.querySelector('.mem-item-del');

                    editBtn.addEventListener('click', function() {
                        var isEditing = textEl.contentEditable === 'true';
                        if (!isEditing) {
                            textEl.contentEditable = 'true';
                            textEl.focus();
                            var range = document.createRange();
                            range.selectNodeContents(textEl);
                            range.collapse(false);
                            var sel = window.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(range);
                            editBtn.style.opacity = '1';
                        } else {
                            textEl.contentEditable = 'false';
                            var newVal = textEl.textContent.trim();
                            if (newVal) {
                                var d = loadMemory(currentChatId);
                                d[level][idx] = newVal;
                                saveMemory(currentChatId, d);
                            }
                            editBtn.style.opacity = '';
                        }
                    });

                    textEl.addEventListener('blur', function() {
                        if (textEl.contentEditable === 'true') {
                            textEl.contentEditable = 'false';
                            var newVal = textEl.textContent.trim();
                            if (newVal) {
                                var d = loadMemory(currentChatId);
                                d[level][idx] = newVal;
                                saveMemory(currentChatId, d);
                            }
                            editBtn.style.opacity = '';
                        }
                    });

                    delBtn.addEventListener('click', function() {
                        var d = loadMemory(currentChatId);
                        d[level].splice(idx, 1);
                        saveMemory(currentChatId, d);
                        renderMemoryPanel();
                    });
                });
            });

            /* ── 轮数滑块 ── */
            var slider = document.getElementById('cdMemRoundsSlider');
            var valEl  = document.getElementById('cdMemRoundsVal');
            if (slider && currentChatId) {
                var rounds = loadRounds(currentChatId);
                slider.value = rounds;
                if (valEl) valEl.textContent = rounds;
                slider.oninput = function() {
                    if (valEl) valEl.textContent = slider.value;
                    saveRounds(currentChatId, parseInt(slider.value, 10));
                };
            }
        }

        /* 手风琴展开时渲染 */
        var memHeader = document.getElementById('cdMenuMemoryHeader');
        if (memHeader) {
            memHeader.addEventListener('click', function() {
                var wrapper = document.getElementById('cdMenuMemoryWrapper');
                if (wrapper) {
                    wrapper.classList.toggle('active');
                    if (wrapper.classList.contains('active')) renderMemoryPanel();
                }
            });
        }

        /* 手动添加 */
        document.querySelectorAll('.mem-add-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var level = btn.dataset.level;
                var input = document.querySelector('.mem-add-input[data-level="' + level + '"]');
                if (!input || !input.value.trim() || !currentChatId) return;
                var d = loadMemory(currentChatId);
                d[level].push(input.value.trim());
                saveMemory(currentChatId, d);
                input.value = '';
                renderMemoryPanel();
            });
        });
        document.querySelectorAll('.mem-add-input').forEach(function(inp) {
            inp.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    var btn = document.querySelector('.mem-add-btn[data-level="' + inp.dataset.level + '"]');
                    if (btn) btn.click();
                }
            });
        });

        /* AI 自动总结 — 气泡设置面板 */
        var autoSumBtn = document.getElementById('cdMemAutoSumBtn');
        if (autoSumBtn) {
            autoSumBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (!currentChatId) return;

                var existing = document.getElementById('cdAutoSumPop');
                if (existing) {
                    existing.parentNode.removeChild(existing);
                    return;
                }

                var pop = document.createElement('div');
                pop.id = 'cdAutoSumPop';
                pop.style.cssText = 'position:absolute;bottom:55px;left:20px;width:220px;background:#fff;border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,0.15);z-index:3000;padding:16px;border:0.5px solid #000;animation:caNpIn 0.3s ease;overflow:visible;';
                
                var arrow = document.createElement('div');
                arrow.style.cssText = 'position:absolute;bottom:-6px;left:24px;width:12px;height:12px;background:#fff;border-right:0.5px solid #000;border-bottom:0.5px solid #000;transform:rotate(45deg);z-index:-1;';
                pop.appendChild(arrow);

                var threshold = parseInt(localStorage.getItem('ca-auto-sum-threshold-' + currentChatId) || '0', 10);
                
                pop.innerHTML += 
                    '<div style="font-size:10px;font-weight:700;color:#151515;margin-bottom:12px;letter-spacing:0.5px;text-transform:uppercase;">Auto-Summary Config</div>' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
                        '<span style="font-size:9px;color:rgba(21,21,21,0.5);font-weight:600;">Trigger at</span>' +
                        '<span id="cdAutoSumVal" style="font-size:11px;font-weight:700;color:#A63426;">' + threshold + '</span>' +
                    '</div>' +
                    '<input type="range" id="cdAutoSumSlider" min="0" max="200" step="10" value="' + threshold + '" style="width:100%;accent-color:#151515;cursor:pointer;margin-bottom:4px;">' +
                    '<div style="font-size:8px;color:rgba(21,21,21,0.3);line-height:1.4;">设置消息数量达到多少时自动触发总结。0 = 禁用</div>';

                autoSumBtn.parentNode.style.position = 'relative';
                autoSumBtn.parentNode.appendChild(pop);

                var slider = pop.querySelector('#cdAutoSumSlider');
                var valDisp = pop.querySelector('#cdAutoSumVal');
                slider.addEventListener('input', function() {
                    valDisp.textContent = slider.value;
                    // 更新全局变量并保存
                    autoSumThreshold = parseInt(slider.value, 10);
                    localStorage.setItem('ca-auto-sum-threshold-' + currentChatId, slider.value);
                });

                document.addEventListener('click', function _hide(ev) {
                    if (!pop.contains(ev.target) && ev.target !== autoSumBtn) {
                        if (pop.parentNode) pop.parentNode.removeChild(pop);
                        document.removeEventListener('click', _hide);
                    }
                });
            });
        }



        /* 手动总结 — 居中卡片与极细黑边 */
        var manualSumBtn = document.getElementById('cdMemManualSumBtn');
        if (manualSumBtn) {
            manualSumBtn.addEventListener('click', function() {
                if (!currentChatId) return;
                var msgs = conversations[currentChatId] || [];
                if (msgs.length === 0) return;

                var lastSumKey = 'ca-mem-last-sum-' + currentChatId;
                var lastSumIdx = parseInt(localStorage.getItem(lastSumKey) || '0', 10);
                var total = msgs.length;

                var existing = document.getElementById('cdMemSumModal');
                if (existing) existing.parentNode.removeChild(existing);

                var modal = document.createElement('div');
                modal.id = 'cdMemSumModal';
                modal.style.cssText = 'position:absolute;top:50% !important;left:50% !important;transform:translate(-50%,-50%) !important;width:310px;height:auto;max-height:85%;background:#ffffff;border-radius:32px;box-shadow:0 30px 90px rgba(0,0,0,0.3);z-index:2000;display:flex;flex-direction:column;padding:32px 24px;gap:0;overflow:hidden;border:0.5px solid #000000;opacity:1;';

                var fromIdx = lastSumIdx;
                var toIdx = total - 1;

                modal.innerHTML =
                    '<div style="position:absolute;top:0px;right:-35px;font-size:100px;font-weight:400;color:rgba(21,21,21,0.06);pointer-events:none;z-index:0;line-height:1;font-family:\'Great Vibes\', cursive;">Summary</div>' +
                    '<div style="position:relative;z-index:1;display:flex;flex-direction:column;height:100%;">' +
                        '<div style="font-size:9px;font-weight:700;letter-spacing:2px;color:rgba(21,21,21,0.35);text-transform:uppercase;margin-bottom:20px;">记忆总结设置</div>' +

                        '<div style="font-size:11px;font-weight:600;color:#151515;margin-bottom:6px;">对话范围</div>' +
                        '<div style="font-size:9px;color:rgba(21,21,21,0.4);margin-bottom:14px;line-height:1.6;">' +
                            '共 <b style="color:#151515;">' + total + '</b> 条对话' +
                            (lastSumIdx > 0 ? '　已总结至第 <b style="color:#A63426;">' + lastSumIdx + '</b> 条' : '　尚未总结') +
                        '</div>' +

                        '<div style="display:flex;gap:10px;margin-bottom:18px;">' +
                            '<div style="flex:1;">' +
                                '<div style="font-size:8px;font-weight:700;color:rgba(21,21,21,0.35);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">从第几条</div>' +
                                '<input id="cdSumFrom" type="number" min="1" max="' + total + '" value="' + (fromIdx + 1) + '" style="width:100%;border:none;border-bottom:1px solid rgba(21,21,21,0.15);background:transparent;font-family:Space Grotesk,sans-serif;font-size:14px;font-weight:700;color:#151515;padding:4px 0;outline:none;">' +
                            '</div>' +
                            '<div style="flex:1;">' +
                                '<div style="font-size:8px;font-weight:700;color:rgba(21,21,21,0.35);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">到第几条</div>' +
                                '<input id="cdSumTo" type="number" min="1" max="' + total + '" value="' + (toIdx + 1) + '" style="width:100%;border:none;border-bottom:1px solid rgba(21,21,21,0.15);background:transparent;font-family:Space Grotesk,sans-serif;font-size:14px;font-weight:700;color:#151515;padding:4px 0;outline:none;">' +
                            '</div>' +
                        '</div>' +

                        '<div style="font-size:9px;color:rgba(21,21,21,0.35);margin-bottom:22px;padding:10px 12px;background:rgba(21,21,21,0.03);border-radius:8px;line-height:1.7;" id="cdSumPreview">' +
                            '将总结第 ' + (fromIdx + 1) + ' 至第 ' + (toIdx + 1) + ' 条，共 ' + (toIdx - fromIdx) + ' 条对话' +
                        '</div>' +

                        '<div style="font-size:11px;font-weight:600;color:#151515;margin-bottom:8px;">总结模式</div>' +
                        '<div style="display:flex;gap:8px;margin-bottom:24px;">' +
                            '<div class="cdSumMode active" data-mode="append" style="flex:1;padding:10px 8px;border-radius:12px;border:1px solid #151515;background:#151515;color:#fff;font-size:9px;font-weight:700;letter-spacing:0.5px;text-align:center;cursor:pointer;transition:all 0.2s;">追加<br><span style="font-weight:400;opacity:0.6;font-size:8px;">保留现有记忆</span></div>' +
                            '<div class="cdSumMode" data-mode="replace" style="flex:1;padding:10px 8px;border-radius:12px;border:1px solid rgba(21,21,21,0.12);background:transparent;color:#151515;font-size:9px;font-weight:700;letter-spacing:0.5px;text-align:center;cursor:pointer;transition:all 0.2s;">替换<br><span style="font-weight:400;opacity:0.5;font-size:8px;">清空后重写</span></div>' +
                        '</div>' +

                        '<div style="display:flex;gap:10px;">' +
                            '<button id="cdSumCancel" style="flex:1;padding:12px;border-radius:50px;border:1px solid rgba(21,21,21,0.12);background:transparent;font-family:Space Grotesk,sans-serif;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;color:#151515;">取消</button>' +
                            '<button id="cdSumConfirm" style="flex:2;padding:12px;border-radius:50px;border:none;background:#151515;color:#fff;font-family:Space Grotesk,sans-serif;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;">✦ 开始总结</button>' +
                        '</div>' +
                    '</div>';

                var panel = document.getElementById('cdMemoryPanel');
                var memOverlay = panel ? panel.closest('.settings-overlay') || panel.closest('.menu-overlay') || document.getElementById('caChatDetail') : document.getElementById('caChatDetail');
                memOverlay.appendChild(modal);

                /* 模式切换 */
                var sumMode = 'append';
                modal.querySelectorAll('.cdSumMode').forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        sumMode = btn.dataset.mode;
                        modal.querySelectorAll('.cdSumMode').forEach(function(b) {
                            var isActive = b.dataset.mode === sumMode;
                            b.style.background = isActive ? '#151515' : 'transparent';
                            b.style.color = isActive ? '#fff' : '#151515';
                            b.style.border = isActive ? '1px solid #151515' : '1px solid rgba(21,21,21,0.12)';
                        });
                    });
                });

                /* 范围预览更新 */
                function updatePreview() {
                    var f = parseInt(document.getElementById('cdSumFrom').value, 10) || 1;
                    var t = parseInt(document.getElementById('cdSumTo').value, 10) || total;
                    f = Math.max(1, Math.min(f, total));
                    t = Math.max(f, Math.min(t, total));
                    var count = t - f + 1;
                    var prev = document.getElementById('cdSumPreview');
                    if (prev) prev.textContent = '将总结第 ' + f + ' 至第 ' + t + ' 条，共 ' + count + ' 条对话';
                }
                document.getElementById('cdSumFrom').addEventListener('input', updatePreview);
                document.getElementById('cdSumTo').addEventListener('input', updatePreview);

                /* 取消 */
                document.getElementById('cdSumCancel').addEventListener('click', function() {
                    modal.parentNode.removeChild(modal);
                });

                /* 确认总结 */
                document.getElementById('cdSumConfirm').addEventListener('click', function() {
                    var f = parseInt(document.getElementById('cdSumFrom').value, 10) || 1;
                    var t = parseInt(document.getElementById('cdSumTo').value, 10) || total;
                    f = Math.max(1, Math.min(f, total)) - 1;
                    t = Math.max(f + 1, Math.min(t, total));

                    var selectedMsgsForSum = msgs.slice(f, t);
                    var confirmBtn = document.getElementById('cdSumConfirm');
                    confirmBtn.textContent = '总结中...';
                    confirmBtn.style.opacity = '0.5';
                    confirmBtn.disabled = true;

                    var transcript = selectedMsgsForSum.map(function(m, i) {
                        return '[' + (f + i + 1) + '] ' + (m.role === 'user' ? 'User' : 'AI') + ': ' + m.text;
                    }).join('\n');

                    var prompt = '你是一个精密的叙事记忆系统。请仔细阅读以下对话记录（第 ' + (f + 1) + ' 至第 ' + t + ' 条），' +
                        '从中提取关键记忆信息。\n\n' +
                        '【强制规则】\n' +
                        '- 用户一律称为 [user]，角色一律称为 [char]，禁止使用任何其他称谓。\n' +
                        '- 凡涉及具体事件，必须以「在［时间］发生……」的格式开头，并在结尾补充「[user] 情绪：… / [char] 情绪：…」。\n' +
                        '- 时间信息：若对话中含有时间戳（[SYS_TIME] 或类似标记），优先提取并写入；若无明确时间，写「时间不明」。\n' +
                        '- 每条记忆必须包含：主体（[user]/[char]）、行为/事件、情绪反应，三者缺一不可。\n' +
                        '- 禁止模糊表述，禁止"似乎""可能"等词。记录已发生的事实。\n\n' +
                        '【记忆分级标准】\n' +
                        'HIGH — 定义双方关系骨架的核心信息：\n' +
                        '  · 双方关系性质的明确转变（如：从陌生→熟识，从疏离→亲密）\n' +
                        '  · [char] 对 [user] 做出的重要承诺、表态、或立场宣言\n' +
                        '  · [user] 对 [char] 触发的关键情绪节点（愤怒、触动、失控等）\n' +
                        '  · 双方共同经历的、不可逆的场景事件\n\n' +
                        'MID — 丰富双方互动肌理的重要细节：\n' +
                        '  · [char] 对特定话题、人物、事物表现出的明显好恶或习惯反应\n' +
                        '  · [user] 的行为模式、语言风格、或反复出现的倾向\n' +
                        '  · 有情感温度的对话片段（带时间节点）\n' +
                        '  · 双方之间形成的专属默契、暗语、或特殊记忆锚点\n\n' +
                        'LOW — 近期碎片与临时性信息：\n' +
                        '  · 本次对话中出现的临时场景、道具、地点\n' +
                        '  · [user] 或 [char] 在本次对话中的情绪底色\n' +
                        '  · 尚未定型、可能随后续对话演变的细节\n\n' +
                        '【输出格式】严格按以下格式，每条独立一行，不输出任何额外文字：\n' +
                        'HIGH: [内容]\n' +
                        'MID: [内容]\n' +
                        'LOW: [内容]\n\n' +
                        '【事件格式示例】\n' +
                        'HIGH: 在［第3条，时间不明］[char] 第一次主动握住 [user] 的手，打破了此前的疏离；[user] 情绪：震惊后转为颤抖的温热；[char] 情绪：克制中透出决然。\n' +
                        'MID: 在［第7条，22:14］[user] 说「我不需要你保护」，[char] 沉默超过五秒后才回答；[user] 情绪：逞强中带自我保护；[char] 情绪：隐忍，轻微受挫。\n' +
                        'LOW: [user] 本次对话全程语气强硬，但在话题转向回忆时音调明显软化。\n\n' +
                        '对话记录：\n' + transcript;

                    var cfg = getActiveConfig();
                    var apiKey = cfg.key || '';
                    if (!apiKey) {
                        modal.parentNode.removeChild(modal);
                        return;
                    }

                    var modelId = resolveModelId(cfg.model);
                    var endpoint = normalizeOpenAIEndpoint(cfg.endpoint);

                    fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                        body: JSON.stringify({
                            model: modelId,
                            messages: [{ role: 'user', content: prompt }],
                            max_tokens: 800,
                            temperature: 0.4
                        })
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        var text = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
                        var parsed = { high: [], mid: [], low: [] };
                        text.split('\n').forEach(function(line) {
                            line = line.trim();
                            if (line.toUpperCase().startsWith('HIGH:')) parsed.high.push(line.substring(5).trim());
                            else if (line.toUpperCase().startsWith('MID:')) parsed.mid.push(line.substring(4).trim());
                            else if (line.toUpperCase().startsWith('LOW:')) parsed.low.push(line.substring(4).trim());
                        });

                        var existing = loadMemory(currentChatId);
                        var finalData;
                        if (sumMode === 'replace') {
                            finalData = parsed;
                        } else {
                            finalData = {
                                high: existing.high.concat(parsed.high),
                                mid: existing.mid.concat(parsed.mid),
                                low: existing.low.concat(parsed.low)
                            };
                        }
                        saveMemory(currentChatId, finalData);
                        localStorage.setItem(lastSumKey, String(t));
                        renderMemoryPanel();
                        modal.parentNode.removeChild(modal);
                    })
                    .catch(function() {
                        confirmBtn.textContent = '✦ 开始总结';
                        confirmBtn.style.opacity = '';
                        confirmBtn.disabled = false;
                    });
                });
            });
        }
        
        function updateTransUI() {
            document.querySelectorAll('#cdTransStyleSelector .style-item-wrap').forEach(function(el) {
                el.classList.toggle('active', el.dataset.style === transConfig.style);
            });
            var ml = document.getElementById('cdTransMyLang');
            var tl = document.getElementById('cdTransTargetLang');
            if (ml) ml.value = transConfig.myLang;
            if (tl) tl.value = transConfig.transLang;
        }
        updateTransUI();

        document.querySelectorAll('#cdTransStyleSelector .style-item-wrap').forEach(function(el) {
            el.addEventListener('click', function() {
                transConfig.style = this.dataset.style;
                saveTransConfig();
                updateTransUI();
                if (currentChatId) renderMessages(currentChatId);
            });
        });

        var mlInput = document.getElementById('cdTransMyLang');
        var tlInput = document.getElementById('cdTransTargetLang');
        if (mlInput) mlInput.addEventListener('change', function() { transConfig.myLang = this.value.trim() || 'Auto'; saveTransConfig(); });
        if (tlInput) tlInput.addEventListener('change', function() { transConfig.transLang = this.value.trim() || 'Chinese'; saveTransConfig(); });

        /* ── 对话头像 ── */
        var avConfig = JSON.parse(localStorage.getItem('ca-av-config') || '{"ent":true,"me":false,"pos":"bottom"}');
        function saveAvConfig() { localStorage.setItem('ca-av-config', JSON.stringify(avConfig)); }

        function updateAvUI() {
            var detail = document.getElementById('caChatDetail');
            if (detail) {
                detail.classList.remove('av-ent-show', 'av-me-show', 'av-pos-top', 'av-pos-bottom', 'av-pos-all');
                if (avConfig.ent) detail.classList.add('av-ent-show');
                if (avConfig.me) detail.classList.add('av-me-show');
                detail.classList.add('av-pos-' + avConfig.pos);
            }
            
            document.querySelectorAll('#cdAvEntityCap .ca-cap-item').forEach(function(el) {
                el.classList.toggle('active', el.dataset.val === (avConfig.ent ? 'on' : 'off'));
            });
            document.querySelectorAll('#cdAvMeCap .ca-cap-item').forEach(function(el) {
                el.classList.toggle('active', el.dataset.val === (avConfig.me ? 'on' : 'off'));
            });
            document.querySelectorAll('#cdAvPosCap .ca-cap-item').forEach(function(el) {
                el.classList.toggle('active', el.dataset.val === avConfig.pos);
            });
        }

        var capEnt = document.getElementById('cdAvEntityCap');
        if (capEnt) {
            capEnt.addEventListener('click', function(e) {
                if (e.target.classList.contains('ca-cap-item')) {
                    avConfig.ent = e.target.dataset.val === 'on';
                    saveAvConfig(); updateAvUI();
                }
            });
        }
        var capMe = document.getElementById('cdAvMeCap');
        if (capMe) {
            capMe.addEventListener('click', function(e) {
                if (e.target.classList.contains('ca-cap-item')) {
                    avConfig.me = e.target.dataset.val === 'on';
                    saveAvConfig(); updateAvUI();
                }
            });
        }
        var capPos = document.getElementById('cdAvPosCap');
        if (capPos) {
            capPos.addEventListener('click', function(e) {
                if (e.target.classList.contains('ca-cap-item')) {
                    avConfig.pos = e.target.dataset.val;
                    saveAvConfig(); updateAvUI();
                }
            });
        }
        updateAvUI();

        /* ── 时间感知 ── */
        var timeConfig = JSON.parse(localStorage.getItem('ca-time-config') || '{"on":false,"month":true,"day":true,"hour":true,"min":true}');
        function saveTimeConfig() { localStorage.setItem('ca-time-config', JSON.stringify(timeConfig)); }

        var taClockTimer = null;

        function updateTimeAwareUI() {
            var toggle = document.getElementById('cdTimeAwareToggle');
            var preview = document.getElementById('cdTimeAwarePreview');
            if (!toggle) return;
            if (timeConfig.on) {
                toggle.classList.add('on');
                if (preview) preview.style.display = 'flex';
                startTaClock();
            } else {
                toggle.classList.remove('on');
                if (preview) preview.style.display = 'none';
                stopTaClock();
            }
            /* 自定义时间 UI */
            var customToggle = document.getElementById('cdTimeCustomToggle');
            var customInputs = document.getElementById('cdTimeCustomInputs');
            if (customToggle) {
                if (timeConfig.custom) customToggle.classList.add('on');
                else customToggle.classList.remove('on');
            }
            if (customInputs) {
                customInputs.style.display = timeConfig.custom ? 'flex' : 'none';
            }
            if (timeConfig.custom) {
                var cm   = document.getElementById('cdTcMonth'); if (cm   && timeConfig.customMonth !== undefined) cm.value   = timeConfig.customMonth;
                var cd   = document.getElementById('cdTcDay');   if (cd   && timeConfig.customDay   !== undefined) cd.value   = timeConfig.customDay;
                var ch   = document.getElementById('cdTcHour');  if (ch   && timeConfig.customHour  !== undefined) ch.value   = timeConfig.customHour;
                var cmin = document.getElementById('cdTcMin');   if (cmin && timeConfig.customMin   !== undefined) cmin.value = timeConfig.customMin;
            }
        }

        /* 自定义时间流动基准已提到外层作用域 */
        window._taGetNowFromClock = function() {
            var d = new Date();
            var _tc = (function(){ try { return JSON.parse(localStorage.getItem('ca-time-config') || '{"on":false}'); } catch(e) { return {on:false}; } })();
            if (!_tc.custom || !taCustomStartMs) {
                return { mo: d.getMonth()+1, day: d.getDate(), hr: d.getHours(), mn: d.getMinutes(), sc: d.getSeconds() };
            }
            var elapsed   = Math.floor((Date.now() - taCustomStartMs) / 1000);
            var totalSecs = taCustomBaseHour * 3600 + taCustomBaseMin * 60 + taCustomBaseSec + elapsed;
            return {
                mo:  _tc.customMonth !== undefined ? _tc.customMonth : d.getMonth()+1,
                day: _tc.customDay   !== undefined ? _tc.customDay   : d.getDate(),
                hr:  Math.floor(totalSecs / 3600) % 24,
                mn:  Math.floor(totalSecs % 3600 / 60),
                sc:  totalSecs % 60
            };
        };

        function startTaClock() {
            stopTaClock();
            if (timeConfig.custom) {
                taCustomStartMs  = Date.now();
                taCustomBaseHour = timeConfig.customHour !== undefined ? timeConfig.customHour : new Date().getHours();
                taCustomBaseMin  = timeConfig.customMin  !== undefined ? timeConfig.customMin  : new Date().getMinutes();
                taCustomBaseSec  = new Date().getSeconds();
            }
            function tick() {
                var el = document.getElementById('cdTimeAwareClock');
                if (!el) { stopTaClock(); return; }
                var t = window._taGetNowFromClock();
                var str = '';
                if (timeConfig.month) str += t.mo + '月';
                if (timeConfig.day)   str += t.day + '日';
                if (timeConfig.month || timeConfig.day) str += ' ';
                str += String(t.hr).padStart(2,'0') + ':' + String(t.mn).padStart(2,'0') + ':' + String(t.sc).padStart(2,'0');
                el.textContent = str;
            }
            tick();
            taClockTimer = setInterval(tick, 1000);
        }

        function stopTaClock() {
            if (taClockTimer) { clearInterval(taClockTimer); taClockTimer = null; }
        }

        var taToggleEl = document.getElementById('cdTimeAwareToggle');
        if (taToggleEl) {
            taToggleEl.addEventListener('click', function() {
                timeConfig.on = !timeConfig.on;
                saveTimeConfig();
                updateTimeAwareUI();
            });
        }

        ['Month','Day','Hour','Min'].forEach(function(f) {
            var el = document.getElementById('cdTa' + f);
            if (el) {
                el.addEventListener('change', function() {
                    timeConfig[f.toLowerCase()] = el.checked;
                    saveTimeConfig();
                    if (timeConfig.on) startTaClock();
                });
            }
        });

        /* 自定义时间开关 */
        var customToggleEl = document.getElementById('cdTimeCustomToggle');
        if (customToggleEl) {
            customToggleEl.addEventListener('click', function() {
                timeConfig.custom = !timeConfig.custom;
                if (timeConfig.custom) {
                    /* 初始值填入当前真实时间 */
                    var _now = new Date();
                    if (!timeConfig.customMonth) timeConfig.customMonth = _now.getMonth() + 1;
                    if (!timeConfig.customDay)   timeConfig.customDay   = _now.getDate();
                    if (timeConfig.customHour === undefined) timeConfig.customHour = _now.getHours();
                    if (timeConfig.customMin  === undefined) timeConfig.customMin  = _now.getMinutes();
                }
                saveTimeConfig();
                updateTimeAwareUI();
                if (timeConfig.on) startTaClock();
            });
        }

        /* 自定义时间输入 */
        ['Month','Day','Hour','Min'].forEach(function(f) {
            var el = document.getElementById('cdTc' + f);
            if (el) {
                el.addEventListener('input', function() {
                    var val = parseInt(el.value, 10);
                    if (!isNaN(val)) {
                        timeConfig['custom' + f] = val;
                        saveTimeConfig();
                        if (timeConfig.on && timeConfig.custom) {
                            /* 重新以当前输入值为基准重启时钟
                               把秒数基准也重置为当前真实秒，这样流动从现在开始 */
                            taCustomStartMs  = Date.now();
                            taCustomBaseHour = timeConfig.customHour !== undefined ? timeConfig.customHour : new Date().getHours();
                            taCustomBaseMin  = timeConfig.customMin  !== undefined ? timeConfig.customMin  : new Date().getMinutes();
                            taCustomBaseSec  = new Date().getSeconds();
                            /* 不整个重启 startTaClock，只更新基准，timer 继续跑 */
                        }
                    }
                });
            }
        });

        /* 初始化时钟，如果 timeConfig.on 且 custom，设好基准再启动 */
        if (timeConfig.on && timeConfig.custom) {
            taCustomStartMs  = Date.now();
            taCustomBaseHour = timeConfig.customHour !== undefined ? timeConfig.customHour : new Date().getHours();
            taCustomBaseMin  = timeConfig.customMin  !== undefined ? timeConfig.customMin  : new Date().getMinutes();
            taCustomBaseSec  = new Date().getSeconds();
        }
        updateTimeAwareUI();

        if (cdMenuClearEl) cdMenuClearEl.addEventListener('click', function () {
            var ov = document.getElementById('cdMenuOverlay');
            if (ov) ov.classList.remove('active');
            if (!currentChatId) return;

            const CIRC = 2 * Math.PI * 96;
            const HOLD_MS = 1000; 
            let progress = 0, isHolding = false, startTime = null, raf = null;

            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed; inset:0; background:rgba(250,250,248,0.98); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:9999; opacity:0; transition:opacity 0.3s;';
            overlay.innerHTML = `
                <style>
                    @keyframes sh-orbit-cw { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    @keyframes sh-orbit-ccw { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
                    @keyframes sh-fall-a { 0% { transform: translate(-15px, -50px) rotate(-15deg) scale(1); opacity:0; } 15% { opacity:1; } 100% { transform: translate(2px, -5px) rotate(-45deg) scale(0); opacity:0; } }
                    @keyframes sh-fall-b { 0% { transform: translate(18px, -60px) rotate(15deg) scale(1); opacity:0; } 15% { opacity:1; } 100% { transform: translate(5px, 5px) rotate(45deg) scale(0); opacity:0; } }
                    @keyframes sh-lid-open { 0% { transform: translateY(0) rotate(0deg); } 100% { transform: translateY(-24px) rotate(-8deg); } }
                    @keyframes sh-check-draw { 0% { stroke-dashoffset: 120; transform: scale(0.8); opacity:0; } 20% { opacity:1; } 70% { stroke-dashoffset: 0; transform: scale(1.15); } 100% { stroke-dashoffset: 0; transform: scale(1); opacity:1; } }
                    @keyframes sh-burst { 0% { transform: translate(0,0) scale(1); opacity:1; } 100% { transform: translate(var(--tx),var(--ty)) scale(0); opacity:0; } }
                    .sh-papers.on { display:block; }
                    .sh-paper { position:absolute; top:0; background:#fff; border:1px solid rgba(21,21,21,0.15); border-radius:2px; }
                    .sh-paper::after { content:""; position:absolute; top:4px; left:4px; right:4px; height:1px; background:rgba(21,21,21,0.1); box-shadow: 0 4px 0 rgba(21,21,21,0.1); }
                    .sh-can-lid.open { animation: sh-lid-open 0.3s forwards; }
                </style>
                <div id="sh-scene" style="position:relative; width:220px; height:220px; display:flex; align-items:center; justify-content:center; cursor:pointer; touch-action:none;">
                    <div style="position:absolute; inset:0; pointer-events:none; animation: sh-orbit-cw 14s linear infinite;">
                        <svg viewBox="0 0 220 220"><circle cx="110" cy="110" r="96" fill="none" stroke="rgba(21,21,21,0.04)" stroke-width="1"/><circle id="sh-ring" cx="110" cy="110" r="96" fill="none" stroke="#151515" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}" transform="rotate(-90 110 110)" style="transition:stroke-dashoffset 0.06s linear;"/></svg>
                    </div>
                    <div style="position:absolute; inset:25px; pointer-events:none; animation: sh-orbit-ccw 10s linear infinite;">
                        <svg viewBox="0 0 170 170"><circle cx="85" cy="85" r="76" fill="none" stroke="rgba(21,21,21,0.06)" stroke-width="1" stroke-dasharray="3 11"/></svg>
                    </div>
                    <div id="sh-papers" class="sh-papers" style="position:absolute; top:25px; left:50%; transform:translateX(-50%); width:60px; height:50px; pointer-events:none; display:none; z-index:9;">
                        <div class="sh-paper" style="width:22px; height:16px; left:5px; animation: sh-fall-a 0.5s ease-in infinite;"></div>
                        <div class="sh-paper" style="width:18px; height:12px; left:35px; animation: sh-fall-b 0.5s ease-in infinite; animation-delay:0.15s;"></div>
                    </div>
                    <div id="sh-can" style="position:relative; z-index:12; transform-origin: bottom center; transition: transform 0.2s;">
                        <svg width="60" height="78" viewBox="0 0 88 112" style="overflow:visible;">
                            <rect x="10" y="26" width="68" height="78" rx="7" fill="#151515"/>
                            <line x1="33" y1="38" x2="33" y2="96" stroke="rgba(255,255,255,0.12)" stroke-width="2" stroke-linecap="round"/>
                            <line x1="55" y1="38" x2="55" y2="96" stroke="rgba(255,255,255,0.12)" stroke-width="2" stroke-linecap="round"/>
                            <g id="sh-lid" class="sh-can-lid" style="transform-origin:center;">
                                <rect x="33" y="3" width="22" height="8" rx="4" fill="#151515"/>
                                <rect x="6" y="11" width="76" height="13" rx="5" fill="#151515"/>
                            </g>
                            <rect x="6" y="100" width="76" height="9" rx="4.5" fill="#151515"/>
                        </svg>
                    </div>
                    <div style="position:absolute; bottom:-45px; left:50%; transform:translateX(-50%); text-align:center; width:200px; pointer-events:none;">
                        <div id="sh-label" style="font-size:11px; font-weight:800; letter-spacing:2px; color:#151515; text-transform:uppercase; margin-bottom:5px;">Hold to Purge</div>
                        <div style="font-family:'Share Tech Mono',monospace; font-size:8px; color:rgba(21,21,21,0.35); letter-spacing:1px;">System Retrieval</div>
                    </div>
                </div>
                <div id="sh-flash" style="position:fixed; inset:0; z-index:10000; display:flex; align-items:center; justify-content:center; opacity:0; pointer-events:none; transition:opacity 0.25s; backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);">
                    <svg width="100" height="100" viewBox="0 0 100 100"><path id="sh-check" d="M28 52 L42 66 L72 32" fill="none" stroke="#151515" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:120; stroke-dashoffset:120;"/></svg>
                </div>
            `;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.style.opacity = '1');

            const ring = overlay.querySelector('#sh-ring');
            const lid = overlay.querySelector('#sh-lid');
            const can = overlay.querySelector('#sh-can');
            const papers = overlay.querySelector('#sh-papers');
            const label = overlay.querySelector('#sh-label');
            const flash = overlay.querySelector('#sh-flash');
            const check = overlay.querySelector('#sh-check');
            const scene = overlay.querySelector('#sh-scene');

            function update(p) {
                progress = p;
                ring.style.strokeDashoffset = CIRC * (1 - p/100);
                if(p > 2) {
                    label.textContent = `Purging... ${Math.round(p)}%`;
                    label.style.color = '#A63426';
                }
            }

            function tick(ts) {
                if(!isHolding) return;
                if(!startTime) startTime = ts;
                const p = Math.min(100, ((ts - startTime) / HOLD_MS) * 100);
                update(p);
                if(p >= 100) { complete(); return; }
                raf = requestAnimationFrame(tick);
            }

            function start(e) {
                if(e.cancelable) e.preventDefault();
                isHolding = true; startTime = null;
                lid.classList.add('open');
                papers.classList.add('on');
                raf = requestAnimationFrame(tick);
            }

            function end() {
                if(!isHolding) return;
                isHolding = false;
                cancelAnimationFrame(raf);
                if(progress < 100) reset();
            }

            function reset() {
                const dur = '0.35s cubic-bezier(0.16,1,0.3,1)';
                ring.style.transition = `stroke-dashoffset ${dur}`;
                update(0);
                lid.classList.remove('open');
                papers.classList.remove('on');
                label.textContent = "Hold to Purge";
                label.style.color = '';
                setTimeout(() => { if(ring) ring.style.transition = ''; }, 350);
            }

            function complete() {
                isHolding = false;
                papers.classList.remove('on');
                label.textContent = "✓ CLEARED";
                label.style.color = '#151515';
                
                const rect = can.getBoundingClientRect();
                const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
                for(let i=0; i<12; i++) {
                    const a = (i/12)*Math.PI*2 + Math.random()*0.3, d = 45+Math.random()*35;
                    const s = 3 + Math.random()*4;
                    const p = document.createElement('div');
                    p.className = 'burst-p';
                    p.style.cssText = `position:fixed; left:${cx}px; top:${cy}px; width:${s}px; height:${s}px; background:#151515; border-radius:50%; pointer-events:none; z-index:10001; --tx:${Math.cos(a)*d}px; --ty:${Math.sin(a)*d}px; animation: sh-burst 0.65s ease-out forwards;`;
                    document.body.appendChild(p);
                    setTimeout(() => p.remove(), 650);
                }

                conversations[currentChatId] = [];
                saveOneConversation(currentChatId);
                renderMessages(currentChatId);

                setTimeout(() => {
                    flash.style.opacity = '1';
                    check.style.animation = 'sh-check-draw 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
                    setTimeout(() => {
                        overlay.style.opacity = '0';
                        setTimeout(() => overlay.remove(), 300);
                    }, 1200);
                }, 100);
            }

            scene.addEventListener('mousedown', start);
            window.addEventListener('mouseup', end);
            scene.addEventListener('touchstart', start, {passive: false});
            window.addEventListener('touchend', end);
            overlay.addEventListener('click', (e) => { if(e.target === overlay) { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 300); } });
        });
        if (cdMenuDelEl) cdMenuDelEl.addEventListener('click', function () {
            var ov = document.getElementById('cdMenuOverlay');
            if (ov) ov.classList.remove('active');
            if (currentChatId && confirm('Delete this entity and all messages?')) {
                if (window.SH) SH.play('map-delete');
                var id = currentChatId;
                entities = entities.filter(function (en) { return en.id !== id; });
                delete conversations[id];
                ChatDB.deleteEntity(id);
                closeChat();
                renderAll();
            }
        });

        /* 搜索 */
        document.getElementById('caSearchInput').addEventListener('input', function () {
            var query = this.value.toLowerCase();
            document.querySelectorAll('.ca-chat-row').forEach(function (row) {
                var name = row.querySelector('.ca-chat-name').textContent.toLowerCase();
                row.style.display = name.indexOf(query) !== -1 ? 'flex' : 'none';
            });
        });

        /* 长按菜单 (Context Menu) & Multi-select */
        /* 绑在永久存在的 caChatDetail 上，用事件委托，避免 renderMessages 重建 area 导致失效 */
        var cmTimer = null;
        var cmActiveRow = null;
        var cmActiveBtn = null;
        var isMultiMode = false;
        var multiModeEnteredAt = 0;
        var multiCancelLock = false;
        var selectedMsgs = new Set();
        var touchStartX = 0;
        var touchStartY = 0;

        function closeContextMenu() {
            clearTimeout(cmTimer);
            cmTimer = null;
            var cm = document.getElementById('cdContextMenu');
            var mask = document.getElementById('cdChatMask');
            var overlay = document.getElementById('cdLpOverlay');
            if (cm) {
                cm.classList.remove('active');
                cm.style.position = 'absolute';
                cm.style.top = '';
                cm.style.left = '';
                cm.style.right = '';
                cm.querySelectorAll('.m-item').forEach(function(item) {
                    item.classList.remove('show-tip');
                });
            }
            if (mask) mask.classList.remove('active');
            if (overlay) overlay.classList.remove('active');

            /* 移除 Weight Drop 效果并清理残留样式 */
            var area = document.getElementById('cdChatArea');
            if (area) {
                area.querySelectorAll('.bubble.lp-lifted').forEach(function(b) {
                    b.classList.remove('lp-lifted');
                    b.style.animation = 'none';
                    b.style.boxShadow = '';
                    b.style.transform = '';
                    void b.offsetWidth;
                    b.style.animation = '';
                });
                area.querySelectorAll('.bubble.lp-pressing').forEach(function(b) {
                    b.classList.remove('lp-pressing');
                    b.style.transform = '';
                });
            }

            if (cmActiveRow) cmActiveRow.classList.remove('highlighted');
            cmActiveRow = null;
            cmActiveBtn = null;
        }

        function updateMultiBar() {
            var delBtn = document.getElementById('cdMsDelete');
            if (delBtn) {
                delBtn.textContent = 'Delete (' + selectedMsgs.size + ')';
                delBtn.style.opacity = selectedMsgs.size > 0 ? '1' : '0.5';
            }
        }

        var detailEl = document.getElementById('caChatDetail');

        /* 点击：多选模式下切换选中消息（单选，只能通过取消按钮退出） */
        detailEl.addEventListener('click', function(e) {
            if (!isMultiMode) return;
            e.stopPropagation();
            var row = e.target.closest('.msg-row');
            if (!row || row.id === 'cdTypingRow') return;
            var idx = parseInt(row.dataset.msgIndex, 10);
            if (isNaN(idx)) return;

            var area = document.getElementById('cdChatArea');
            if (area) {
                area.querySelectorAll('.msg-row.selected').forEach(function(r) { r.classList.remove('selected'); });
                area.querySelectorAll('.msg-row.highlighted').forEach(function(r) { r.classList.remove('highlighted'); });
            }
            selectedMsgs.clear();
            selectedMsgs.add(idx);
            row.classList.add('selected');
            updateMultiBar();
        });

        function handlePressStart(e) {
            if (isMultiMode) return;
            var area = document.getElementById('cdChatArea');
            if (!area) return;

            var row = e.target.closest('.msg-row');
            if (!row || row.id === 'cdTypingRow') return;
            if (!area.contains(row)) return;

            var bubble = row.querySelector('.bubble');
            if (!bubble) return;

            /* 清除上一次残留状态 */
            area.querySelectorAll('.msg-row.highlighted').forEach(function(r) { r.classList.remove('highlighted'); });
            area.querySelectorAll('.bubble.lp-lifted').forEach(function(b) {
                b.classList.remove('lp-lifted');
                b.style.animation = 'none';
                b.style.boxShadow = '';
                b.style.transform = '';
                void b.offsetWidth;
                b.style.animation = '';
            });
            var overlay = document.getElementById('cdLpOverlay');
            if (overlay) overlay.classList.remove('active');

            if (e.type === 'touchstart' && e.touches && e.touches.length > 0) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }

            /* 不在按下时立即加任何 class，避免点击触发动画 */
            clearTimeout(cmTimer);
            cmTimer = setTimeout(function() {

                /* Weight Drop 触发：重置所有子元素动画后激活 lp-lifted */
                var allAnimEls = bubble.querySelectorAll('*');
                allAnimEls.forEach(function(el) {
                    el.style.animation = 'none';
                    void el.offsetWidth;
                    el.style.animation = '';
                });
                bubble.style.animation = 'none';
                bubble.style.boxShadow = '';
                bubble.style.transform = '';
                void bubble.offsetWidth;
                bubble.style.animation = '';

                bubble.classList.add('lp-lifted');

                /* 激活遮罩 */
                if (overlay) overlay.classList.add('active');

                /* 震动反馈 */
                if (navigator.vibrate) navigator.vibrate(8);

                cmActiveRow = row;
                var cm = document.getElementById('cdContextMenu');
                var mask = document.getElementById('cdChatMask');
                if (!cm) return;

                row.classList.add('highlighted');
                if (mask) mask.classList.add('active');

                var bubbleRectF = bubble.getBoundingClientRect();
                var fixedTop = bubbleRectF.top - 58;
                if (fixedTop < 70) fixedTop = bubbleRectF.bottom + 10;

                cm.style.position = 'fixed';
                cm.style.top = fixedTop + 'px';
                cm.style.bottom = 'auto';

                if (row.classList.contains('row-sent')) {
                    cm.style.right = '20px';
                    cm.style.left = 'auto';
                } else {
                    var bubbleCenterFX = bubbleRectF.left + bubbleRectF.width / 2;
                    var cmHalfW = 130;
                    var vw = window.innerWidth;
                    var leftPos = Math.max(8, Math.min(bubbleCenterFX - cmHalfW, vw - cmHalfW * 2 - 8));
                    cm.style.left = leftPos + 'px';
                    cm.style.right = 'auto';
                }

                cm.classList.add('active');
                if (window.SH) SH.play('map-long');
                cm.querySelectorAll('.m-item').forEach(function(item) {
                    item.classList.remove('show-tip');
                });
                cmActiveBtn = null;
            }, 420);
        }

        function handlePressMove(e) {
            if (e.type === 'touchmove' && e.touches && e.touches.length > 0) {
                var dx = e.touches[0].clientX - touchStartX;
                var dy = e.touches[0].clientY - touchStartY;

                /* 如果菜单已经弹出，只要手指一动就立即关闭 */
                var cm = document.getElementById('cdContextMenu');
                if (cm && cm.classList.contains('active')) {
                    closeContextMenu();
                    return;
                }

                /* 菜单未弹出时，容错 15px 防止抖动取消长按 */
                if (Math.abs(dx) > 15 || Math.abs(dy) > 15) {
                    handlePressCancel();
                }
            } else if (e.type === 'mousemove' && e.buttons > 0) {
                var cm = document.getElementById('cdContextMenu');
                if (cm && cm.classList.contains('active')) {
                    closeContextMenu();
                    return;
                }
                handlePressCancel();
            }
        }

        function handlePressCancel() {
            clearTimeout(cmTimer);
            cmTimer = null;
        }

        function handlePressEnd() {
            /* 只在菜单未弹出时才取消，已弹出则保留 */
            var cm = document.getElementById('cdContextMenu');
            if (!cm || !cm.classList.contains('active')) {
                clearTimeout(cmTimer);
                cmTimer = null;
            }
        }

        detailEl.addEventListener('touchstart', handlePressStart, {passive: true});
        detailEl.addEventListener('touchmove', handlePressMove, {passive: true});
        detailEl.addEventListener('touchend', handlePressEnd, {passive: true});
        detailEl.addEventListener('touchcancel', handlePressCancel, {passive: true});

        detailEl.addEventListener('mousedown', handlePressStart);
        detailEl.addEventListener('mousemove', handlePressMove);
        detailEl.addEventListener('mouseup', handlePressEnd);
        detailEl.addEventListener('mouseleave', handlePressEnd);

        document.addEventListener('click', function(e) {
            if (!isMultiMode
                && !e.target.closest('#cdContextMenu')
                && !e.target.closest('.bubble')
                && !e.target.closest('#cdAttachBtn')
                && !e.target.closest('#cdSendBtn')
                && !e.target.closest('#cdAddBtn')) {
                closeContextMenu();
            }
        });

        var cm = document.getElementById('cdContextMenu');
        /* 在第一次点击时就把 index 和 row 缓存下来，防止 closeContextMenu 清空后丢失 */
        var cmCachedIndex = -1;
        var cmCachedRow = null;
        var cmCachedChatId = null;

        function executeAction(action) {
            var index = cmCachedIndex;
            var savedRow = cmCachedRow;
            var chatId = cmCachedChatId;

            if (index < 0 || !chatId) return;

            var msgs = conversations[chatId];
            if (!msgs) return;

            if (action === 'copy') {
                var copyMsg = msgs[index];
                if (copyMsg) navigator.clipboard.writeText(copyMsg.text);
                closeContextMenu();

            } else if (action === 'edit') {
                var editMsg = msgs[index];
                if (!editMsg) { closeContextMenu(); return; }
                var newText = prompt('Edit message:', editMsg.text);
                if (newText !== null && newText.trim() !== '') {
                    newText = newText.trim();
                    msgs[index].text = newText;
                    if (msgs[index].role === 'user') {
                        conversations[chatId] = msgs.slice(0, index + 1);
                        saveOneConversation(chatId);
                        closeContextMenu();
                        renderMessages(chatId);
                        setTimeout(function () {
                            var area = document.getElementById('cdChatArea');
                            var typingRow = cdAddTyping(area, chatId);
                            callAI(chatId, newText, function (reply) {
                                var rawSegs = reply.split('||||');
                                var segments = [];
                                rawSegs.forEach(function(rs) {
                                    var _prot = rs.replace(/\|\|\|TRANS\|\|\|/g, '\u0001TRANS\u0001');
                                    var subs = _prot.split(/\n+/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
                                    subs.forEach(function(s) { segments.push(s.replace(/\u0001TRANS\u0001/g, '|||TRANS|||')); });
                                });
                                var fullReply = segments.join('\n');
                                var aiMsg = { role: 'assistant', text: fullReply, time: dateNow() + ' ' + timeNow() };
                                conversations[chatId].push(aiMsg);
                                saveOneConversation(chatId);
                                function resolveSeg(row, seg) {
                                    var mt = seg, tt = '';
                                    if (seg.indexOf('|||TRANS|||') !== -1) {
                                        var parts = seg.split('|||TRANS|||');
                                        mt = parts[0].trim();
                                        tt = parts[1] ? parts[1].trim() : '';
                                    }
                                    cdResolve(row, mt + (tt ? '|||TRANS|||' + tt : ''), cdGetNowTime());
                                }
                                if (segments.length <= 1) {
                                    resolveSeg(typingRow, segments[0] || '');
                                } else {
                                    resolveSeg(typingRow, segments[0]);
                                    var i = 1;
                                    function showNextEdit() {
                                        if (i >= segments.length) return;
                                        setTimeout(function () {
                                            var area2 = document.getElementById('cdChatArea');
                                            var nt = cdAddTyping(area2, chatId);
                                            setTimeout(function () {
                                                resolveSeg(nt, segments[i]);
                                                i++; showNextEdit();
                                            }, 400 + Math.random() * 800);
                                        }, 300 + Math.random() * 700);
                                    }
                                    showNextEdit();
                                }
                            });
                        }, 500);
                    } else {
                        saveOneConversation(chatId);
                        closeContextMenu();
                        renderMessages(chatId);
                    }
                } else {
                    closeContextMenu();
                }

            } else if (action === 'rollback') {
                closeContextMenu();
                var area = document.getElementById('cdChatArea');
                var rows = area ? area.querySelectorAll('.msg-row') : [];
                var toDeleteRows = [];
                var foundTarget = false;
                rows.forEach(function(r) {
                    if (r.id === 'cdTypingRow') return;
                    var idx = parseInt(r.dataset.msgIndex, 10);
                    if (!foundTarget) {
                        if (!isNaN(idx) && idx === index) {
                            foundTarget = true;
                        }
                        return;
                    }
                    toDeleteRows.push(r);
                });

                if (toDeleteRows.length === 0) {
                    conversations[chatId] = msgs.slice(0, index + 1);
                    saveOneConversation(chatId);
                    return;
                }

                if (!document.getElementById('rb-style-node')) {
                    var style = document.createElement('style');
                    style.id = 'rb-style-node';
                    style.textContent = 
                        '.rb-badge-wrap { position: absolute; inset: 0; pointer-events: none; z-index: 1000; display: flex; align-items: center; justify-content: center; }' +
                        '.rb-badge { display: flex; flex-direction: column; align-items: center; gap: 10px; opacity: 0; transform: scale(0.85); pointer-events: none; }' +
                        '.rb-badge.show { animation: rb-badge-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }' +
                        '.rb-badge.hide { animation: rb-badge-out 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }' +
                        '@keyframes rb-badge-in { 0% { opacity: 0; transform: scale(0.8) translateY(12px); } 60% { opacity: 1; transform: scale(1.04) translateY(-2px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }' +
                        '@keyframes rb-badge-out { 0% { opacity: 1; transform: scale(1) translateY(0); } 100% { opacity: 0; transform: scale(0.9) translateY(-10px); } }' +
                        '.rb-svg-wrap { position: relative; width: 72px; height: 72px; }' +
                        '.rb-label { font-size: 9px; font-weight: 800; letter-spacing: 3px; color: rgba(21,21,21,0.4); text-transform: uppercase; font-family: "Share Tech Mono", monospace, sans-serif; }' +
                        '.rb-lines { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 999; }' +
                        '.rb-line { position: absolute; left: 50%; height: 1px; background: rgba(21,21,21,0.12); border-radius: 1px; transform-origin: left center; opacity: 0; }' +
                        '.rb-arc-outer { transform-origin: 36px 36px; animation: rb-spin-slow 8s linear infinite; }' +
                        '.rb-arc-inner { transform-origin: 36px 36px; animation: rb-spin-slow 5s linear infinite reverse; }' +
                        '@keyframes rb-spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }' +
                        '.rb-needle { transform-origin: 36px 36px; }' +
                        '.rb-badge.show .rb-needle { animation: rb-needle-sweep 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s forwards; }' +
                        '@keyframes rb-needle-sweep { 0% { transform: rotate(0deg); } 40% { transform: rotate(-200deg); } 70% { transform: rotate(-165deg); } 100% { transform: rotate(-180deg); } }' +
                        '.rb-tick { transform-origin: 36px 36px; opacity: 0; }' +
                        '.rb-badge.show .rb-tick { animation: rb-tick-fade 0.3s ease 0.55s forwards; }' +
                        '@keyframes rb-tick-fade { to { opacity: 1; } }' +
                        '.rb-backdrop { position: absolute; inset: 0; background: rgba(255,255,255,0.6); backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px); opacity: 0; pointer-events: none; transition: opacity 0.3s ease; z-index: 998; }' +
                        '.rb-backdrop.show { opacity: 1; pointer-events: auto; }' +
                        '@keyframes rb-msg-shatter { 0% { opacity: 1; transform: translate(0,0) scale(1) rotate(0deg); filter: blur(0); } 100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0.8) rotate(var(--tr)); filter: blur(4px); } }';
                    document.head.appendChild(style);
                }

                var detailEl = document.getElementById('caChatDetail');
                var rbBackdrop = document.createElement('div'); rbBackdrop.className = 'rb-backdrop';
                var rbLines = document.createElement('div'); rbLines.className = 'rb-lines';
                var rbBadgeWrap = document.createElement('div'); rbBadgeWrap.className = 'rb-badge-wrap';
                rbBadgeWrap.innerHTML = 
                    '<div class="rb-badge" id="rbBadge">' +
                        '<div class="rb-svg-wrap">' +
                            '<svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                                '<circle cx="36" cy="36" r="34" stroke="rgba(21,21,21,0.08)" stroke-width="0.5" stroke-dasharray="3 6"/>' +
                                '<g class="rb-arc-outer"><circle cx="36" cy="36" r="28" stroke="rgba(21,21,21,0.06)" stroke-width="1" stroke-dasharray="8 16" fill="none"/></g>' +
                                '<g class="rb-arc-inner"><circle cx="36" cy="36" r="22" stroke="rgba(21,21,21,0.1)" stroke-width="0.75" stroke-dasharray="4 8" fill="none"/></g>' +
                                '<line x1="36" y1="4"  x2="36" y2="8"  stroke="rgba(21,21,21,0.15)" stroke-width="1" transform="rotate(0   36 36)"/>' +
                                '<line x1="36" y1="4"  x2="36" y2="7"  stroke="rgba(21,21,21,0.08)" stroke-width="0.75" transform="rotate(30  36 36)"/>' +
                                '<line x1="36" y1="4"  x2="36" y2="7"  stroke="rgba(21,21,21,0.08)" stroke-width="0.75" transform="rotate(60  36 36)"/>' +
                                '<line x1="36" y1="4"  x2="36" y2="8"  stroke="rgba(21,21,21,0.15)" stroke-width="1" transform="rotate(90  36 36)"/>' +
                                '<line x1="36" y1="4"  x2="36" y2="7"  stroke="rgba(21,21,21,0.08)" stroke-width="0.75" transform="rotate(120 36 36)"/>' +
                                '<line x1="36" y1="4"  x2="36" y2="7"  stroke="rgba(21,21,21,0.08)" stroke-width="0.75" transform="rotate(150 36 36)"/>' +
                                '<line x1="36" y1="4"  x2="36" y2="8"  stroke="rgba(21,21,21,0.15)" stroke-width="1" transform="rotate(180 36 36)"/>' +
                                '<line x1="36" y1="4"  x2="36" y2="7"  stroke="rgba(21,21,21,0.08)" stroke-width="0.75" transform="rotate(210 36 36)"/>' +
                                '<line x1="36" y1="4"  x2="36" y2="7"  stroke="rgba(21,21,21,0.08)" stroke-width="0.75" transform="rotate(240 36 36)"/>' +
                                '<line x1="36" y1="4"  x2="36" y2="8"  stroke="rgba(21,21,21,0.15)" stroke-width="1" transform="rotate(270 36 36)"/>' +
                                '<line x1="36" y1="4"  x2="36" y2="7"  stroke="rgba(21,21,21,0.08)" stroke-width="0.75" transform="rotate(300 36 36)"/>' +
                                '<line x1="36" y1="4"  x2="36" y2="7"  stroke="rgba(21,21,21,0.08)" stroke-width="0.75" transform="rotate(330 36 36)"/>' +
                                '<circle cx="36" cy="36" r="16" fill="#fff" stroke="#151515" stroke-width="1"/>' +
                                '<circle cx="36" cy="36" r="14" fill="url(#rbDialGrad)"/>' +
                                '<g class="rb-needle"><line x1="36" y1="36" x2="36" y2="24" stroke="#151515" stroke-width="1.5" stroke-linecap="round"/></g>' +
                                '<line x1="36" y1="36" x2="36" y2="22" stroke="#151515" stroke-width="1" stroke-linecap="round" opacity="0.3"/>' +
                                '<circle cx="36" cy="36" r="2" fill="#151515"/>' +
                                '<circle cx="36" cy="36" r="1" fill="#fff"/>' +
                                '<g class="rb-tick">' +
                                    '<circle cx="36" cy="6" r="4" fill="#151515"/>' +
                                    '<polyline points="33.5,6 35.5,8 38.5,3.5" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
                                '</g>' +
                                '<circle cx="14" cy="54" r="2" fill="#A63426" opacity="0.4"/>' +
                                '<circle cx="10" cy="58" r="1" fill="#A63426" opacity="0.2"/>' +
                                '<defs>' +
                                    '<radialGradient id="rbDialGrad" cx="40%" cy="35%" r="60%">' +
                                        '<stop offset="0%" stop-color="#fff" stop-opacity="1"/>' +
                                        '<stop offset="100%" stop-color="rgba(21,21,21,0.04)" stop-opacity="1"/>' +
                                    '</radialGradient>' +
                                '</defs>' +
                            '</svg>' +
                        '</div>' +
                        '<div class="rb-label">Rolled Back</div>' +
                    '</div>';
                detailEl.appendChild(rbBackdrop);
                detailEl.appendChild(rbLines);
                detailEl.appendChild(rbBadgeWrap);

                toDeleteRows.forEach(function(el, i) {
                    setTimeout(function() {
                        if (!document.contains(el)) return;
                        var tx = (Math.random() - 0.5) * 60;
                        var ty = -40 - Math.random() * 40;
                        var tr = (Math.random() - 0.5) * 30;
                        el.style.setProperty('--tx', tx + 'px');
                        el.style.setProperty('--ty', ty + 'px');
                        el.style.setProperty('--tr', tr + 'deg');
                        el.style.animation = 'rb-msg-shatter 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                    }, i * 40);
                });

                setTimeout(function() {
                    var widths = [120, 80, 150, 60, 100];
                    var lefts = [30, 60, 20, 100, 50];
                    var tops = [55, 62, 68, 74, 80];
                    widths.forEach(function(w, i) {
                        var line = document.createElement('div');
                        line.className = 'rb-line';
                        var dir = i % 2 === 0 ? -80 : 80;
                        line.style.width = w + 'px';
                        line.style.top = tops[i] + '%';
                        line.style.left = lefts[i] + '%';
                        line.style.opacity = '0.6';
                        line.style.transform = 'scaleX(1) translateX(0)';
                        line.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                        rbLines.appendChild(line);
                        
                        setTimeout(function() {
                            line.style.opacity = '0';
                            line.style.transform = 'scaleX(0.3) translateX(' + dir + 'px)';
                        }, 50);
                    });
                }, 80);

                var rbBadge = rbBadgeWrap.querySelector('.rb-badge');
                setTimeout(function() {
                    rbBackdrop.classList.add('show');
                    rbBadge.classList.add('show');
                    if (navigator.vibrate) navigator.vibrate([6, 40, 10]);
                }, 200);

                setTimeout(function() {
                    rbBadge.classList.remove('show');
                    rbBadge.classList.add('hide');
                    rbBackdrop.classList.remove('show');
                }, 1800);

                setTimeout(function() {
                    if (rbBackdrop.parentNode) rbBackdrop.parentNode.removeChild(rbBackdrop);
                    if (rbLines.parentNode) rbLines.parentNode.removeChild(rbLines);
                    if (rbBadgeWrap.parentNode) rbBadgeWrap.parentNode.removeChild(rbBadgeWrap);
                    
                    conversations[chatId] = msgs.slice(0, index + 1);
                    saveOneConversation(chatId);
                    renderMessages(chatId);
                    
                    requestAnimationFrame(function () {
                        var area2 = document.getElementById('cdChatArea');
                        if (!area2) return;
                        var sentRows = area2.querySelectorAll('.row-sent');
                        if (sentRows.length === 0) return;
                        var lastSentRow = sentRows[sentRows.length - 1];
                        var metaEl = lastSentRow.querySelector('.msg-meta');
                        if (metaEl) {
                            metaEl.innerHTML = makeMetaHtml('sent', 'DELIVERED', cdGetNowTime());
                        }
                    });
                }, 2200);
            } else if (action === 'regen') {
                /* 从当前 index 往前找最近一条 user 消息 */
                var searchIdx = index;
                while (searchIdx >= 0 && msgs[searchIdx].role !== 'user') {
                    searchIdx--;
                }
                if (searchIdx >= 0) {
                    var userMsgText = msgs[searchIdx].text;
                    conversations[chatId] = msgs.slice(0, searchIdx + 1);
                    saveOneConversation(chatId);
                    closeContextMenu();
                    renderMessages(chatId);

                    /* 立即同步全局打字状态，确保退出界面后列表显示正确 */
                    typingStateMap[chatId] = true;
                    renderChats();

                    setTimeout(function () {
                        var area = document.getElementById('cdChatArea');
                        var typingRow = cdAddTyping(area, chatId);
                        callAI(chatId, userMsgText, function (reply) {
                            var rawSegs = reply.split('||||');
                            var segments = [];
                            rawSegs.forEach(function(rs) {
                                var _prot = rs.replace(/\|\|\|TRANS\|\|\|/g, '\u0001TRANS\u0001');
                                var subs = _prot.split(/\n+/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
                                subs.forEach(function(s) { segments.push(s.replace(/\u0001TRANS\u0001/g, '|||TRANS|||')); });
                            });
                            var fullReply = segments.join('\n');
                            var aiMsg = { role: 'assistant', text: fullReply, time: dateNow() + ' ' + timeNow() };
                            conversations[chatId].push(aiMsg);
                            saveOneConversation(chatId);

                            /* 彻底清除该角色的打字状态 */
                            typingStateMap[chatId] = false;
                            if (typeof setChatRowTyping === 'function') setChatRowTyping(chatId, false);
                            if (typeof setPinnedTyping === 'function') setPinnedTyping(chatId, false);

                            function resolveSegRegen(row, seg) {
                                var mt = seg, tt = '';
                                if (seg.indexOf('|||TRANS|||') !== -1) {
                                    var parts = seg.split('|||TRANS|||');
                                    mt = parts[0].trim();
                                    tt = parts[1] ? parts[1].trim() : '';
                                }
                                cdResolve(row, mt + (tt ? '|||TRANS|||' + tt : ''), cdGetNowTime());
                            }
                            if (segments.length <= 1) {
                                resolveSegRegen(typingRow, segments[0] || '');
                            } else {
                                resolveSegRegen(typingRow, segments[0]);
                                var i = 1;
                                function showNextRegen() {
                                    if (i >= segments.length) return;
                                    setTimeout(function () {
                                        var area2 = document.getElementById('cdChatArea');
                                        var nt = cdAddTyping(area2, chatId);
                                        setTimeout(function () {
                                            resolveSegRegen(nt, segments[i]);
                                            i++; showNextRegen();
                                        }, 400 + Math.random() * 800);
                                    }, 300 + Math.random() * 700);
                                }
                                showNextRegen();
                            }
                        });
                    }, 500);
                } else {
                    closeContextMenu();
                }

            } else if (action === 'multi') {
                isMultiMode = true;
                multiModeEnteredAt = Date.now();
                multiCancelLock = true;
                /* 进入后 800ms 内不允许通过点击退出多选 */
                setTimeout(function() { multiCancelLock = false; }, 800);
                selectedMsgs.clear();
                document.getElementById('caChatDetail').classList.add('multi-mode');
                var area2 = document.getElementById('cdChatArea');
                if (area2) {
                    area2.querySelectorAll('.msg-row.selected, .msg-row.highlighted').forEach(function(r) {
                        r.classList.remove('selected'); r.classList.remove('highlighted');
                    });
                }
                if (index >= 0 && savedRow) {
                    selectedMsgs.add(index);
                    savedRow.classList.add('selected');
                }
                updateMultiBar();
                closeContextMenu();
            }
        }

        if (cm) {
            cm.addEventListener('click', function(e) {
                e.stopPropagation();
                var item = e.target.closest('.m-item');
                if (!item) return;

                if (cmActiveBtn !== item) {
                    /* 第一次点：缓存当前状态，显示 tooltip */
                    cmCachedIndex = cmActiveRow ? parseInt(cmActiveRow.dataset.msgIndex, 10) : -1;
                    cmCachedRow = cmActiveRow;
                    cmCachedChatId = currentChatId;
                    cm.querySelectorAll('.m-item').forEach(function(i) { i.classList.remove('show-tip'); });
                    item.classList.add('show-tip');
                    cmActiveBtn = item;
                } else {
                    /* 第二次点：执行，此时用缓存值 */
                    var action = item.dataset.action;
                    executeAction(action);
                }
            });
        }

        var msCancelBtn = document.getElementById('cdMsCancel');
        var msDeleteBtn = document.getElementById('cdMsDelete');
        
        if (msCancelBtn) {
            msCancelBtn.addEventListener('click', function() {
                isMultiMode = false;
                selectedMsgs.clear();
                document.getElementById('caChatDetail').classList.remove('multi-mode');
                document.querySelectorAll('.msg-row.selected').forEach(function(r) { r.classList.remove('selected'); });
            });
        }
        
        if (msDeleteBtn) {
            msDeleteBtn.addEventListener('click', function() {
                if (selectedMsgs.size === 0) return;
                if (confirm('Delete ' + selectedMsgs.size + ' message(s)?')) {
                    var msgs = conversations[currentChatId];
                    conversations[currentChatId] = msgs.filter(function(_, idx) {
                        return !selectedMsgs.has(idx);
                    });
                    saveOneConversation(currentChatId);
                    isMultiMode = false;
                    selectedMsgs.clear();
                    document.getElementById('caChatDetail').classList.remove('multi-mode');
                    renderMessages(currentChatId);
                }
            });
        }

        /* ── 右向左滑动显现底纹蓝色向右箭头 ── */
        var swipeArrow = document.createElement('div');
        swipeArrow.id = 'cdSwipeArrow';
        swipeArrow.innerHTML = '<svg viewBox="0 0 24 24" style="width:120px;height:120px;fill:none;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 15px rgba(10,132,255,0.7));">' +
            '<polyline points="13 5 20 12 13 19" stroke="#000000" stroke-width="2.4"></polyline>' +
            '<line x1="4" y1="12" x2="20" y2="12" stroke="#0A84FF" stroke-width="2.2"></line>' +
            '<polyline points="13 5 20 12 13 19" stroke="#0A84FF" stroke-width="2.2"></polyline>' +
            '</svg>';
        swipeArrow.style.cssText = 'position:absolute;top:50%;right:10px;transform:translateY(-50%) scale(0.8) translateX(30px);opacity:0;pointer-events:none;z-index:1;transition:opacity 0.1s, transform 0.1s;background:transparent;-webkit-mask-image:linear-gradient(to right, transparent 15%, black 95%);mask-image:linear-gradient(to right, transparent 15%, black 95%);';
        if (detailEl) {
            var chatArea = document.getElementById('cdChatArea');
            if (chatArea) {
                chatArea.style.position = 'relative';
                chatArea.style.zIndex = '2';
                detailEl.insertBefore(swipeArrow, chatArea);
                chatArea.style.isolation = 'auto';
            } else {
                detailEl.appendChild(swipeArrow);
            }
        }

        var saStartX = 0;
        var saStartY = 0;
        var saIsSwiping = false;

        if (detailEl) {
            detailEl.addEventListener('touchstart', function(e) {
                if (e.touches.length === 1) {
                    saStartX = e.touches[0].clientX;
                    saStartY = e.touches[0].clientY;
                    saIsSwiping = false;
                    var ca = document.getElementById('cdChatArea');
                    if (ca) ca.classList.add('is-swiping');
                }
            }, {passive: true});

            detailEl.addEventListener('touchmove', function(e) {
                if (e.touches.length === 1) {
                    var dx = e.touches[0].clientX - saStartX;
                    var dy = e.touches[0].clientY - saStartY;

                    /* 灵敏触发：向左滑，dx < 0 且水平偏移大于垂直偏移 */
                    if (dx < -5 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                        saIsSwiping = true;
                        
                        var maxDx = -70; /* 整个聊天室气泡区域向左滑动，留出右边空间 */
                        var currentDx = Math.max(dx, maxDx);
                        var progress = Math.min(Math.abs(currentDx) / 60, 1);
                        
                        var ca = document.getElementById('cdChatArea');
                        if (ca) ca.style.setProperty('--swipe-x', currentDx + 'px');

                        swipeArrow.style.transition = 'none';
                        swipeArrow.style.opacity = progress * 0.35;
                        swipeArrow.style.transform = 'translateY(-50%) scale(' + (0.8 + progress * 0.2) + ') translateX(' + (30 - progress * 30) + 'px)';
                    }
                }
            }, {passive: true});

            var resetSwipeArrow = function() {
                if (saIsSwiping) {
                    var ca = document.getElementById('cdChatArea');
                    if (ca) {
                        ca.classList.remove('is-swiping');
                        ca.style.setProperty('--swipe-x', '0px');
                    }
                    swipeArrow.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
                    swipeArrow.style.opacity = 0;
                    swipeArrow.style.transform = 'translateY(-50%) scale(0.8) translateX(30px)';
                    saIsSwiping = false;
                }
            };

            detailEl.addEventListener('touchend', resetSwipeArrow, {passive: true});
            detailEl.addEventListener('touchcancel', resetSwipeArrow, {passive: true});
        }
    }

    /* ══════════════════════════════════════
       设置面板（圆头像在这里    /* ══════════════════════════════════════
       API Config 弹窗
    ══════════════════════════════════════ */
    function loadApiConfig() {
        var raw = localStorage.getItem('ca-api-config');
        if (raw) {
            try {
                var parsed = JSON.parse(raw);
                if (!parsed.primary) parsed.primary = { endpoint: '', key: '', prompt: '', model: '' };
                if (!parsed.backup) parsed.backup = { endpoint: '', key: '', prompt: '', model: '' };
                if (!parsed.models) parsed.models = [];
                if (!parsed.node) parsed.node = 'primary';
                return parsed;
            } catch(e) {}
        }
        return {
            primary: { endpoint: '', key: '', prompt: '', model: '' },
            backup:  { endpoint: '', key: '', prompt: '', model: '' },
            models: [],
            node: 'primary'
        };
    }

    var apiConfig = loadApiConfig();

    /* ══════════════════════════════════════
       通知系统 · Notification System
    ══════════════════════════════════════ */
    (function () {
        /* 注入样式 */
        var style = document.createElement('style');
        style.textContent = [
            '.ca-notif-stack{position:fixed;bottom:calc(env(safe-area-inset-bottom,16px)+74px);right:12px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:5px;pointer-events:none;max-width:280px;}',
            '.ca-notif-pill{display:flex;align-items:center;gap:7px;background:#151515;border-radius:50px;padding:5px 10px 5px 5px;box-shadow:0 12px 32px rgba(0,0,0,0.28),0 4px 10px rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.06);cursor:pointer;pointer-events:auto;width:fit-content;max-width:100%;position:relative;overflow:hidden;transition:transform 0.2s cubic-bezier(0.2,0.8,0.2,1),opacity 0.2s;animation:caNpIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards;}',
        '.ca-notif-pill::before{content:"";position:absolute;top:1px;left:20px;right:20px;height:1px;background:linear-gradient(to right,transparent,rgba(255,255,255,0.15) 50%,transparent);border-radius:50%;}',
        '.ca-notif-pill:active{transform:scale(0.96);}',
        '.ca-notif-pill.leaving{animation:caNpOut 0.3s cubic-bezier(0.7,0,0.3,1) forwards;}',
        '@keyframes caNpIn{0%{opacity:0;transform:translateX(100px) skewX(-10deg);}100%{opacity:1;transform:translateX(0) skewX(0);}}',
        '@keyframes caNpOut{0%{opacity:1;transform:translateX(0) scale(1);}100%{opacity:0;transform:translateX(100px) scale(0.9);}}',
            '.ca-np-avatar{width:24px;height:24px;border-radius:50%;flex-shrink:0;display:flex;justify-content:center;align-items:center;font-size:10px;font-weight:700;color:#fff;border:1px solid rgba(255,255,255,0.15);position:relative;}',
        '.ca-np-badge{position:absolute;bottom:-2px;right:-2px;min-width:11px;height:11px;border-radius:6px;background:#A63426;border:1.5px solid #151515;display:flex;justify-content:center;align-items:center;font-size:6px;font-weight:900;color:#fff;padding:0 1px;}',
        '.ca-np-text{flex:1;min-width:0;}',
        '.ca-np-name{font-size:10px;font-weight:700;color:#fff;letter-spacing:0.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
        '.ca-np-preview{font-size:9px;color:rgba(255,255,255,0.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;}',
        '.ca-np-time{font-size:8px;color:rgba(255,255,255,0.3);font-weight:600;letter-spacing:0.5px;flex-shrink:0;}',
            '.ca-np-dots{display:flex;align-items:center;gap:3px;margin-top:2px;}',
            '.ca-np-dot{width:4px;height:4px;border-radius:50%;background:#A63426;opacity:0.8;animation:caNpDot 1.4s infinite ease-in-out both;}',
            '.ca-np-dot:nth-child(1){animation-delay:-0.32s;}',
            '.ca-np-dot:nth-child(2){animation-delay:-0.16s;}',
            '@keyframes caNpDot{0%,80%,100%{transform:scale(0.6);opacity:0.3;}40%{transform:scale(1.1);opacity:1;}}',

            /* 聊天列表打字指示 */
            '.ca-chat-typing-wrap{display:flex;align-items:center;gap:3px;}',
            '.ca-chat-typing-dot{width:4px;height:4px;border-radius:50%;background:#A63426;animation:caNpDot 1.4s infinite ease-in-out both;}',
            '.ca-chat-typing-dot:nth-child(1){animation-delay:-0.32s;}',
            '.ca-chat-typing-dot:nth-child(2){animation-delay:-0.16s;}',
            '.ca-chat-typing-dot:nth-child(3){animation-delay:0s;}',
            '.ca-chat-typing-label{font-size:10px;color:#A63426;font-weight:600;margin-left:2px;}',

            /* 头像打字角标 */
            '.ca-avatar-typing{position:absolute;bottom:0;right:0;width:16px;height:16px;border-radius:50%;background:#151515;border:2px solid #fff;display:flex;align-items:center;justify-content:center;gap:2px;z-index:2;}',
            '.ca-avatar-typing span{width:3px;height:3px;border-radius:50%;background:#fff;display:block;animation:caNpDot 1.4s infinite ease-in-out both;}',
            '.ca-avatar-typing span:nth-child(1){animation-delay:-0.32s;}',
            '.ca-avatar-typing span:nth-child(2){animation-delay:-0.16s;}',
            '.ca-avatar-typing span:nth-child(3){animation-delay:0s;}',

            /* 置顶打字旋转圈 */
            '.ca-pinned-typing-ring{position:absolute;inset:0;border-radius:50%;animation:caPinnedRing 2s linear infinite;}',
            '@keyframes caPinnedRing{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}'
        ].join('');
        document.head.appendChild(style);

        /* 通知容器 — 必须挂在 body 最外层，避免被 chat-app-window overflow:hidden 裁切 */
        var stack = document.createElement('div');
        stack.className = 'ca-notif-stack';
        stack.id = 'caNotifStack';
        /* 延迟到 DOM ready 后再 append，确保 body 存在 */
        if (document.body) {
            document.body.appendChild(stack);
        } else {
            document.addEventListener('DOMContentLoaded', function() {
                document.body.appendChild(stack);
            });
        }

        var typingPillMap = {};
        var arrivedTimers = {};

        function getAvatarColor(ent) {
            return ent.color || '#1C1C1E';
        }
        function getInitialChar(name) {
            return (name || '?').trim().charAt(0).toUpperCase();
        }
        function getNowTimeStr() {
            var d = new Date();
            return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
        }

        function removePill(pill, delay) {
            setTimeout(function () {
                if (pill.classList.contains('leaving')) return;
                pill.classList.add('leaving');
                setTimeout(function () {
                    if (pill.parentNode) pill.parentNode.removeChild(pill);
                }, 300);
            }, delay || 0);
        }

        /* 打字中胶囊 */
        window.showNotifTyping = function (ent) {
            /* 已存在则不重复 */
            if (typingPillMap[ent.id]) return;

            /* 发送前先清理其他胶囊，防止粘连堆叠导致没动画的错觉 */
            var oldPills = document.querySelectorAll('.ca-notif-pill[data-ent-id="' + ent.id + '"]:not(.leaving)');
            oldPills.forEach(function(p) { removePill(p); });

            var pill = document.createElement('div');
            pill.className = 'ca-notif-pill';
            pill.dataset.entId = ent.id;

            var avatarHtml = ent.avatar
                ? '<img src="' + ent.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
                : getInitialChar(ent.name);

            pill.innerHTML =
                '<div class="ca-np-avatar" style="background:' + getAvatarColor(ent) + ';">' +
                    avatarHtml +
                    '<div class="ca-np-badge" style="background:#151515;padding:0;">' +
                        '<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>' +
                    '</div>' +
                '</div>' +
                '<div class="ca-np-text">' +
                    '<div class="ca-np-name">' + ent.name + '</div>' +
                    '<div class="ca-np-dots">' +
                        '<div class="ca-np-dot"></div>' +
                        '<div class="ca-np-dot"></div>' +
                        '<div class="ca-np-dot"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="ca-np-time">NOW</div>';

            pill.addEventListener('click', function () {
                openChat(ent.id);
                document.getElementById('chatApp').classList.add('active');
                removePill(pill);
                delete typingPillMap[ent.id];
            });

            stack.appendChild(pill);
            typingPillMap[ent.id] = pill;
        };

        /* 回复到达胶囊 */
        window.showNotifArrived = function (ent, previewText) {
            /* 移除打字胶囊 */
            if (typingPillMap[ent.id]) {
                removePill(typingPillMap[ent.id]);
                delete typingPillMap[ent.id];
            }
            /* 清除已有 arrived 定时器 */
            if (arrivedTimers[ent.id]) clearTimeout(arrivedTimers[ent.id]);

            /* 发送前先清理自己之前的到达胶囊，防止遗留胶囊永久卡在屏幕上 */
            var oldPills = document.querySelectorAll('.ca-notif-pill[data-ent-id="' + ent.id + '"]:not(.leaving)');
            oldPills.forEach(function(p) { removePill(p); });

            var pill = document.createElement('div');
            pill.className = 'ca-notif-pill';
            pill.dataset.entId = ent.id;

            var avatarHtml = ent.avatar
                ? '<img src="' + ent.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
                : getInitialChar(ent.name);

            var unreadNum = ent.unread || 1;
            var shortPreview = (previewText || '').replace(/<[^>]+>/g, '').substring(0, 40);

            pill.innerHTML =
                '<div class="ca-np-avatar" style="background:' + getAvatarColor(ent) + ';">' +
                    avatarHtml +
                    '<div class="ca-np-badge">' + unreadNum + '</div>' +
                '</div>' +
                '<div class="ca-np-text">' +
                    '<div class="ca-np-name">' + ent.name + '</div>' +
                    '<div class="ca-np-preview">' + shortPreview + '</div>' +
                '</div>' +
                '<div class="ca-np-time">' + getNowTimeStr() + '</div>';

            pill.addEventListener('click', function () {
                openChat(ent.id);
                document.getElementById('chatApp').classList.add('active');
                removePill(pill);
                clearTimeout(arrivedTimers[ent.id]);
            });

            stack.appendChild(pill);

            /* 4秒后自动消失 */
            arrivedTimers[ent.id] = setTimeout(function () {
                removePill(pill);
            }, 4000);
        };

        /* 聊天列表：打字状态更新 */
        window.setChatRowTyping = function (entId, isTyping) {
            var row = document.querySelector('.ca-chat-row[data-id="' + entId + '"]');
            if (!row) return;

            var previewEl = row.querySelector('.ca-chat-preview');
            var avatarWrap = row.querySelector('.ca-chat-avatar');
            var existingTypingEl = row.querySelector('.ca-chat-typing-wrap');
            var existingAvatarTyping = row.querySelector('.ca-avatar-typing');

            if (isTyping) {
                /* 头像角标 */
                if (!existingAvatarTyping && avatarWrap) {
                    var atEl = document.createElement('div');
                    atEl.className = 'ca-avatar-typing';
                    atEl.innerHTML = '<span></span><span></span><span></span>';
                    /* ca-chat-avatar 是 absolute 定位的，角标要加到它的父容器 row 上 */
                    var rowEl = avatarWrap.closest('.ca-chat-row') || avatarWrap.parentNode;
                    rowEl.style.position = 'relative';
                    atEl.style.position = 'absolute';
                    atEl.style.left = '46px';
                    atEl.style.top = '10px';
                    rowEl.appendChild(atEl);
                }
                /* 预览文字替换 */
                if (previewEl && !existingTypingEl) {
                    previewEl.style.display = 'none';
                    var tw = document.createElement('div');
                    tw.className = 'ca-chat-typing-wrap';
                    tw.innerHTML =
                        '<div class="ca-chat-typing-dot"></div>' +
                        '<div class="ca-chat-typing-dot"></div>' +
                        '<div class="ca-chat-typing-dot"></div>' +
                        '<span class="ca-chat-typing-label">typing...</span>';
                    previewEl.parentNode.insertBefore(tw, previewEl);
                }
                /* 名字变红 */
                var nameEl = row.querySelector('.ca-chat-name');
                if (nameEl) { nameEl.classList.add('unread'); nameEl.style.color = '#A63426'; }
                var timeEl = row.querySelector('.ca-chat-time');
                if (timeEl) { timeEl.classList.add('unread'); timeEl.textContent = 'NOW'; }
            } else {
                /* 角标可能在 row 上，也可能在 avatarWrap 上，都查一遍 */
                var rowEl2 = row;
                var atInRow = rowEl2.querySelector('.ca-avatar-typing');
                if (atInRow) atInRow.parentNode.removeChild(atInRow);
                if (existingTypingEl) existingTypingEl.parentNode.removeChild(existingTypingEl);
                if (previewEl) previewEl.style.display = '';
                var nameEl2 = row.querySelector('.ca-chat-name');
                if (nameEl2) nameEl2.style.color = '';
                var timeEl2 = row.querySelector('.ca-chat-time');
                if (timeEl2) { timeEl2.classList.remove('unread'); timeEl2.textContent = timeEl2.dataset.origTime || timeEl2.textContent; }
            }
        };

        /* 置顶：打字旋转圈 */
        window.setPinnedTyping = function (entId, isTyping) {
            var ring = document.querySelector('.ca-pinned-ring[data-id="' + entId + '"]');
            if (!ring) return;
            var existing = ring.querySelector('.ca-pinned-typing-ring');
            if (isTyping && !existing) {
                var el = document.createElement('div');
                el.className = 'ca-pinned-typing-ring';
                el.style.background = 'conic-gradient(#A63426 0%, #A63426 40%, rgba(21,21,21,0.1) 40%)';
                ring.insertBefore(el, ring.firstChild);
                ring.classList.remove('has-story','no-story');
            } else if (!isTyping && existing) {
                existing.parentNode.removeChild(existing);
            }
        };

        /* 底部导航角标 */
        window.updateNavBadge = function () {
            var badge = document.getElementById('caNavBadge');
            if (!badge) return;
            var total = 0;
            entities.forEach(function(e) { total += (e.unread || 0); });
            if (total > 0) {
                badge.style.display = 'flex';
                badge.textContent = total > 99 ? '99+' : total;
            } else {
                badge.style.display = 'none';
            }
        };

    })();

    /* 监听 settings-hub 的实时同步事件 */
    window.addEventListener('sh-api-updated', function(e) {
        var detail = e.detail || {};
        if (!apiConfig.primary) apiConfig.primary = { endpoint:'', key:'', prompt:'', model:'', timeout:'30s', stream:true };
        if (typeof detail.ep      !== 'undefined' && detail.ep      !== '') apiConfig.primary.endpoint = detail.ep;
        if (typeof detail.key     !== 'undefined' && detail.key     !== '') apiConfig.primary.key      = detail.key;
        if (typeof detail.model   !== 'undefined' && detail.model   !== '') apiConfig.primary.model    = detail.model;
        if (typeof detail.timeout !== 'undefined' && detail.timeout !== '') apiConfig.primary.timeout  = detail.timeout;
        if (typeof detail.streamOn !== 'undefined') apiConfig.primary.stream = detail.streamOn;
        apiConfig.node = 'primary';
        console.log('[sh-api-updated] synced → model=' + apiConfig.primary.model + ' key=' + (apiConfig.primary.key ? 'SET' : 'EMPTY'));
    });

    function saveApiConfig() {
        var toSave = {
            primary: apiConfig.primary || { endpoint: '', key: '', prompt: '', model: '' },
            backup: apiConfig.backup || { endpoint: '', key: '', prompt: '', model: '' },
            models: apiConfig.models || [],
            node: apiConfig.node || 'primary'
        };
        localStorage.setItem('ca-api-config', JSON.stringify(toSave));
        console.log('[API Config Saved] node=' + toSave.node + ' key=' + (toSave[toSave.node].key ? 'SET' : 'EMPTY'));
    }

    function getActiveConfig() {
        var node = apiConfig.node || 'primary';
        var cfg = apiConfig[node];
        if (!cfg) {
            cfg = { endpoint: '', key: '', prompt: '', model: '' };
            apiConfig[node] = cfg;
        }
        return cfg;
    }

    function openApiModal() {
        var ov = document.getElementById('cdApiOverlay');
        if (!ov) return;
        var node = apiConfig.node || 'primary';
        if (!apiConfig[node]) apiConfig[node] = { endpoint: '', key: '', prompt: '', model: '' };
        var cfg = apiConfig[node];
        var ep = document.getElementById('cdApiEndpoint');
        var ak = document.getElementById('cdApiKey');
        var sp = document.getElementById('cdApiPrompt');
        var sw = document.getElementById('cdApiSwitch');
        if (ep) ep.value = cfg.endpoint || '';
        if (ak) ak.value = cfg.key || '';
        if (sp) sp.value = cfg.prompt || '';
        if (sw) {
            sw.setAttribute('data-node', node);
            var slider = sw.querySelector('.api-sw-slider');
            if (slider) slider.style.transform = node === 'backup' ? 'translateX(100%)' : 'translateX(0)';
        }
        renderModelList();
        var manual = document.getElementById('cdApiModelManual');
        if (manual) manual.value = cfg.model || '';
        var status = document.getElementById('cdApiModelStatus');
        if (status) {
            if (apiConfig.models.length > 0) {
                status.textContent = apiConfig.models.length + ' models loaded';
            } else if (cfg.endpoint && cfg.key) {
                status.textContent = 'Click Fetch to load models';
            } else {
                status.textContent = 'Fill endpoint & key first, then Fetch';
            }
        }
        ov.classList.add('active');
        console.log('[openApiModal] node=' + node, 'key=' + (cfg.key ? 'SET' : 'EMPTY'), 'model=' + (cfg.model || 'NONE'));
    }

    function closeApiModal() {
        var ov = document.getElementById('cdApiOverlay');
        if (ov) ov.classList.remove('active');
    }

    function renderModelList() {
        var list = document.getElementById('cdApiModels');
        if (!list) return;
        var cfg = getActiveConfig();
        var sorted = apiConfig.models.slice().sort(function (a, b) {
            return (b.fav ? 1 : 0) - (a.fav ? 1 : 0);
        });
        var html = '';
        sorted.forEach(function (m) {
            var isSel = m.name === cfg.model;
            var isFav = m.fav;
            html += '<div class="api-mrow" data-name="' + m.name + '">' +
                '<div class="api-mcap' + (isSel ? ' sel' : '') + '"><span>' + m.name + '</span></div>' +
                '<div class="api-fav' + (isFav ? ' active' : '') + '"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>' +
            '</div>';
        });
        list.innerHTML = html;

        list.querySelectorAll('.api-mcap').forEach(function (cap) {
            cap.addEventListener('click', function () {
                list.querySelectorAll('.api-mcap').forEach(function (c) { c.classList.remove('sel'); });
                cap.classList.add('sel');
                var manual = document.getElementById('cdApiModelManual');
                if (manual) manual.value = cap.querySelector('span').textContent.trim();
            });
        });
        list.querySelectorAll('.api-fav').forEach(function (fav) {
            fav.addEventListener('click', function () {
                var name = fav.closest('.api-mrow').dataset.name;
                fav.classList.toggle('active');
                var isActive = fav.classList.contains('active');
                apiConfig.models.forEach(function (m) {
                    if (m.name === name) m.fav = isActive;
                });
                renderModelList();
            });
        });
    }

    function fetchModelsFromApi(callback) {
        var node = apiConfig.node || 'primary';
        var cfg = apiConfig[node] || {};
        var ep = document.getElementById('cdApiEndpoint');
        var ak = document.getElementById('cdApiKey');
        var endpoint = ep ? ep.value.trim() : (cfg.endpoint || '');
        var apiKey = ak ? ak.value.trim() : (cfg.key || '');

        if (!endpoint || !apiKey) {
            callback(null, 'Please fill endpoint and API key first');
            return;
        }

        var status = document.getElementById('cdApiModelStatus');
        if (status) status.textContent = 'Fetching models...';

        var provider = detectProvider(endpoint);
        var url = endpoint.replace(/\/+$/, '');

        if (provider === 'anthropic') {
            callback(null, 'Anthropic does not support model listing. Type model ID manually.');
            return;
        }

        if (provider === 'google') {
            callback(null, 'Google does not support model listing here. Type model ID manually.');
            return;
        }

        if (url.indexOf('/chat/completions') !== -1) {
            url = url.replace('/chat/completions', '/models');
        } else if (url.indexOf('/models') === -1) {
            url += '/models';
        }

        fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + apiKey
            }
        })
        .then(function (res) {
            if (!res.ok) return res.text().then(function (t) { throw new Error(t); });
            return res.json();
        })
        .then(function (data) {
            var models = [];
            if (data.data && Array.isArray(data.data)) {
                data.data.forEach(function (m) {
                    var id = m.id || m.name || '';
                    if (id && id.indexOf('embed') === -1 && id.indexOf('tts') === -1 && id.indexOf('dall') === -1 && id.indexOf('whisper') === -1 && id.indexOf('moderation') === -1) {
                        models.push({ name: id, fav: false });
                    }
                });
            }
            models.sort(function (a, b) { return a.name.localeCompare(b.name); });
            callback(models, null);
        })
        .catch(function (err) {
            var msg = err.message || 'Failed to fetch';
            if (msg.length > 100) msg = msg.substring(0, 100) + '...';
            callback(null, msg);
        });
    }

    function initApiModal() {
        var sw = document.getElementById('cdApiSwitch');
        if (sw) sw.addEventListener('click', function () {
            var cur = sw.getAttribute('data-node') || 'primary';
            var ep = document.getElementById('cdApiEndpoint');
            var ak = document.getElementById('cdApiKey');
            var sp = document.getElementById('cdApiPrompt');
            var manualModel = document.getElementById('cdApiModelManual');
            var selCap = document.querySelector('#cdApiModels .api-mcap.sel span');
            if (!apiConfig[cur]) apiConfig[cur] = { endpoint: '', key: '', prompt: '', model: '' };
            if (ep) apiConfig[cur].endpoint = ep.value.trim();
            if (ak) apiConfig[cur].key = ak.value.trim();
            if (sp) apiConfig[cur].prompt = sp.value.trim();
            if (manualModel && manualModel.value.trim()) {
                apiConfig[cur].model = manualModel.value.trim();
            } else if (selCap) {
                apiConfig[cur].model = selCap.textContent.trim();
            }
            var next = cur === 'primary' ? 'backup' : 'primary';
            sw.setAttribute('data-node', next);
            apiConfig.node = next;
            if (!apiConfig[next]) apiConfig[next] = { endpoint: '', key: '', prompt: '', model: '' };
            var ncfg = apiConfig[next];
            if (ep) ep.value = ncfg.endpoint || '';
            if (ak) ak.value = ncfg.key || '';
            if (sp) sp.value = ncfg.prompt || '';
            if (manualModel) manualModel.value = ncfg.model || '';
            var slider = sw.querySelector('.api-sw-slider');
            if (slider) slider.style.transform = next === 'backup' ? 'translateX(100%)' : 'translateX(0)';
            renderModelList();
            saveApiConfig();
        });

        document.querySelectorAll('.api-acc-hd').forEach(function (hd) {
            hd.addEventListener('click', function () {
                hd.parentElement.classList.toggle('open');
            });
        });

        var saveBtn = document.getElementById('cdApiSave');
        if (saveBtn) saveBtn.addEventListener('click', function () {
            var sw = document.getElementById('cdApiSwitch');
            var node = sw ? sw.getAttribute('data-node') : (apiConfig.node || 'primary');
            apiConfig.node = node;
            if (!apiConfig[node]) {
                apiConfig[node] = { endpoint: '', key: '', prompt: '', model: '' };
            }
            var ep = document.getElementById('cdApiEndpoint');
            var ak = document.getElementById('cdApiKey');
            var sp = document.getElementById('cdApiPrompt');
            var manualModel = document.getElementById('cdApiModelManual');
            var selCap = document.querySelector('#cdApiModels .api-mcap.sel span');
            if (ep) apiConfig[node].endpoint = ep.value.trim();
            if (ak) apiConfig[node].key = ak.value.trim();
            if (sp) apiConfig[node].prompt = sp.value.trim();
            if (manualModel && manualModel.value.trim()) {
                apiConfig[node].model = manualModel.value.trim();
            } else if (selCap) {
                apiConfig[node].model = selCap.textContent.trim();
            }
            saveApiConfig();
            if (window.SH) SH.play('map-switch');
            console.log('[Apply Sync] node=' + node,
 'key=' + (apiConfig[node].key ? 'SET' : 'EMPTY'), 'model=' + apiConfig[node].model, 'endpoint=' + apiConfig[node].endpoint);
            saveBtn.textContent = '\u2713 SYNCED';
            saveBtn.style.background = '#A63426';
            var savedModel = apiConfig[node].model || 'default';
            setTimeout(function () {
                saveBtn.textContent = 'Apply Sync';
                saveBtn.style.background = '#151515';
                closeApiModal();
                if (currentChatId) {
                    var area = document.getElementById('cdChatArea');
                    if (area) {
                        var sysEl = document.createElement('div');
                        sysEl.className = 'sys-msg';
                        sysEl.textContent = 'Switched to ' + savedModel + ' (' + node + ')';
                        area.appendChild(sysEl);
                        area.scrollTop = area.scrollHeight;
                    }
                }
            }, 800);
        });

        var resetBtn = document.getElementById('cdApiReset');
        if (resetBtn) resetBtn.addEventListener('click', function () {
            var cfg = getActiveConfig();
            cfg.endpoint = apiConfig.node === 'primary' ? 'https://api.openai.com/v1' : '';
            cfg.key = '';
            cfg.prompt = '';
            var ep = document.getElementById('cdApiEndpoint');
            var ak = document.getElementById('cdApiKey');
            var sp = document.getElementById('cdApiPrompt');
            if (ep) ep.value = cfg.endpoint;
            if (ak) ak.value = '';
            if (sp) sp.value = '';
        });

        var fetchBtn = document.getElementById('cdApiFetchModels');
        if (fetchBtn) fetchBtn.addEventListener('click', function () {
            fetchBtn.textContent = 'Loading...';
            fetchBtn.style.opacity = '0.5';
            fetchModelsFromApi(function (models, err) {
                fetchBtn.textContent = 'Fetch Models';
                fetchBtn.style.opacity = '1';
                var status = document.getElementById('cdApiModelStatus');
                if (err) {
                    if (status) status.textContent = err;
                    return;
                }
                if (!models || models.length === 0) {
                    if (status) status.textContent = 'No models found';
                    return;
                }
                var existing = {};
                apiConfig.models.forEach(function (m) { existing[m.name] = m.fav; });
                models.forEach(function (m) {
                    if (existing[m.name] !== undefined) {
                        m.fav = existing[m.name];
                    }
                });
                apiConfig.models = models;
                saveApiConfig();
                renderModelList();
                if (status) status.textContent = models.length + ' models loaded';
            });
        });

        var manualInput = document.getElementById('cdApiModelManual');
        if (manualInput) {
            manualInput.addEventListener('input', function () {
                var val = manualInput.value.trim();
                if (val) {
                    document.querySelectorAll('#cdApiModels .api-mcap').forEach(function (c) {
                        c.classList.remove('sel');
                    });
                }
            });
        }

        var ov = document.getElementById('cdApiOverlay');
        if (ov) ov.addEventListener('click', function (e) {
            if (e.target === ov) closeApiModal();
        });
    }

    function applyAvatar(ent) {
        var dispName = ent.nickname || ent.name;
        var plaqueAv = document.getElementById('cdPlaqueAv');
        if (plaqueAv) {
            if (ent.avatar) {
                plaqueAv.style.background = 'url(' + ent.avatar + ') center/cover no-repeat';
                plaqueAv.textContent = '';
            } else {
                plaqueAv.style.background = 'linear-gradient(135deg, ' + ent.color + ' 0%, #8E8E93 100%)';
                plaqueAv.textContent = window.getInitial(dispName);
            }
        }
        var gradInner = document.getElementById('cdGradientInner');
        if (gradInner) {
            if (ent.avatar) {
                gradInner.style.cssText = 'animation:none!important;transition:none!important;background:url(' + ent.avatar + ') center/cover no-repeat;opacity:1;border-radius:3px;';
            } else {
                gradInner.style.cssText = 'animation:none!important;transition:none!important;background:linear-gradient(135deg,' + ent.color + ' 0%,#A63426 100%);opacity:0.9;border-radius:0;';
            }
        }
    }

    function bindSettingsEvents(overlay, ent) {
        setTimeout(function () {
            var closeEl = document.getElementById('cdSetClose');
            if (closeEl) closeEl.addEventListener('click', function () {
                overlay.classList.remove('active');
            });
            var avatarEl = document.getElementById('cdSetAvatar');
            var inputEl = document.getElementById('cdAvatarInput');
            if (avatarEl && inputEl) {
                avatarEl.addEventListener('click', function () {
                    inputEl.click();
                });
                inputEl.addEventListener('change', function (e) {
                    var file = e.target.files[0];
                    if (!file) return;
                    var img = new Image();
                    img.onload = function () {
                        var canvas = document.createElement('canvas');
                        var size = 200;
                        canvas.width = size;
                        canvas.height = size;
                        var ctx = canvas.getContext('2d');
                        var min = Math.min(img.width, img.height);
                        var sx = (img.width - min) / 2;
                        var sy = (img.height - min) / 2;
                        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
                        ent.avatar = canvas.toDataURL('image/jpeg', 0.7);
                        saveOneEntity(ent);
                        applyAvatar(ent);
                        overlay.innerHTML = buildSettingsHTML(ent, conversations[currentChatId] || []);
                        bindSettingsEvents(overlay, ent);
                    };
                    img.src = URL.createObjectURL(file);
                });
            }

            var setNameEl = document.getElementById('cdSetName');
            if (setNameEl) {
                setNameEl.addEventListener('click', function(ev) {
                    ev.stopPropagation();
                    if (currentChatId) window.showNicknameModal(currentChatId);
                });
            }

            // Accordion Toggles
            ['accPersona', 'accMask'].forEach(function(id) {
                var acc = document.getElementById(id);
                if (acc) {
                    acc.querySelector('.set-row').addEventListener('click', function() {
                        acc.classList.toggle('open');
                    });
                }
            });

            // Save Persona
            var saveEl = document.getElementById('cdPersonaSave');
            if (saveEl) saveEl.addEventListener('click', function () {
                var val = document.getElementById('cdPersonaEdit').value.trim();
                ent.persona = val;
                saveOneEntity(ent);
                this.textContent = '\u2713 SAVED';
                this.style.background = '#A63426';
                var self = this;
                setTimeout(function () { self.textContent = 'Save Persona'; self.style.background = '#151515'; }, 1200);
            });

            // Mask Selection
            var maskOpts = overlay.querySelectorAll('.mask-option');
            maskOpts.forEach(function(opt) {
                opt.addEventListener('click', function() {
                    var masks = JSON.parse(localStorage.getItem('ca-user-masks') || '[]');
                    var id = opt.dataset.id;
                    masks.forEach(function(m) { m.active = (m.id === id); });
                    localStorage.setItem('ca-user-masks', JSON.stringify(masks));
                    
                    maskOpts.forEach(function(o) { o.classList.remove('selected'); });
                    opt.classList.add('selected');

                    // 实时同步Profile界面状态（如果有打开）
                    if (typeof renderMe === 'function' && currentPage === 'me') renderMe();
                });
            });

            var clearEl = document.getElementById('cdSetClear');
            if (clearEl) clearEl.addEventListener('click', function () {
                if (confirm('Clear all messages?')) {
                    conversations[currentChatId] = [];
                    saveOneConversation(currentChatId);
                    renderMessages(currentChatId);
                    overlay.classList.remove('active');
                }
            });
            var apiEl = document.getElementById('cdSetApiKey');
            if (apiEl) apiEl.addEventListener('click', function () {
                openApiModal();
                var ov = document.getElementById('cdSettings');
                if (ov) ov.classList.remove('active');
            });
            var delEl = document.getElementById('cdSetDelete');
            if (delEl) delEl.addEventListener('click', function () {
                if (confirm('Delete this entity and all messages?')) {
                    var id = currentChatId;
                    entities = entities.filter(function (en) { return en.id !== id; });
                    delete conversations[id];
                    ChatDB.deleteEntity(id);
                    overlay.classList.remove('active');
                    closeChat();
                    renderAll();
                }
            });
            var rmAvEl = document.getElementById('cdSetRemoveAvatar');
            if (rmAvEl) rmAvEl.addEventListener('click', function () {
                ent.avatar = '';
                saveOneEntity(ent);
                applyAvatar(ent);
                overlay.innerHTML = buildSettingsHTML(ent, conversations[currentChatId] || []);
                bindSettingsEvents(overlay, ent);
            });
            var pinEl = document.getElementById('cdSetPin');
            if (pinEl) pinEl.addEventListener('click', function () {
                ent.pinned = !ent.pinned;
                saveOneEntity(ent);
                renderChats();
                overlay.innerHTML = buildSettingsHTML(ent, conversations[currentChatId] || []);
                bindSettingsEvents(overlay, ent);
            });
        }, 50);
    }

    function openSettings() {
        if (!currentChatId) return;
        var ent = entities.find(function (e) { return e.id === currentChatId; });
        if (!ent) return;

        var msgs = conversations[currentChatId] || [];
        var overlay = document.getElementById('cdSettings');

        overlay.innerHTML = buildSettingsHTML(ent, msgs);
        overlay.classList.add('active');
        bindSettingsEvents(overlay, ent);
    }

    /* ══════════════════════════════════════
       启动入口（由 dock 按钮触发）
    ══════════════════════════════════════ */
    var appBuilt = false;

    window.openChatApp = function () {
        if (!appBuilt) {
            buildApp();
            bindEvents();
            appBuilt = true;
            ChatDB.loadEntities(function (ents) {
                entities = ents || [];
                ChatDB.loadAllConversations(function (convs) {
                    conversations = convs || {};
                    if (entities.length === 0) {
                        var oldEnts = JSON.parse(localStorage.getItem('ca-entities') || '[]');
                        var oldConvs = JSON.parse(localStorage.getItem('ca-conversations') || '{}');
                        if (oldEnts.length > 0) {
                            entities = oldEnts;
                            conversations = oldConvs;
                            saveEntities();
                            saveConversations(function () {
                                localStorage.removeItem('ca-entities');
                                localStorage.removeItem('ca-conversations');
                            });
                        }
                    }
                    dataReady = true;
                    renderAll();
                    var app = document.getElementById('chatApp');
                    app.classList.remove('closing');
                    app.classList.add('active');

                    /* 初始打开时触发胶囊摆动动画 */
                    var hangingEl = document.querySelector('.ca-header-hanging');
                    if (hangingEl) {
                        hangingEl.classList.remove('anim-swing');
                        void hangingEl.offsetWidth;
                        hangingEl.classList.add('anim-swing');
                    }
                });
            });
        } else {
            var app = document.getElementById('chatApp');
            app.classList.remove('closing');
            app.classList.add('active');

            /* 再次打开时触发胶囊摆动动画 */
            var hangingEl = document.querySelector('.ca-header-hanging');
            if (hangingEl) {
                hangingEl.classList.remove('anim-swing');
                void hangingEl.offsetWidth;
                hangingEl.classList.add('anim-swing');
            }
        }
    };

})();
