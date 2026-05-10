// js/chat-detail-ui.js · 聊天详情页 HTML 模板（照抄原版聊天室结构）

    function buildChatDetailHTML() {
    return '' +
    '<style>' +
        '#caChatDetail .msg-row.no-anim { animation: none !important; opacity: 1 !important; }' +
        '#caChatDetail .msg-row.no-anim > .msg-checkbox { animation: none !important; transition: none !important; }' +
        '#caChatDetail .msg-row.no-anim > .msg-content-wrap { animation: none !important; transform: none !important; }' +
        '#caChatDetail .msg-row.no-anim > .msg-content-wrap > .bubble { animation: none !important; opacity: 1 !important; }' +
        '#caChatDetail .msg-row.no-anim > .msg-meta { animation: none !important; transition: none !important; }' +
        '#caChatDetail .msg-row.no-anim .msg-avatar { animation: none !important; transition: none !important; }' +
        /* ===== 全局 GPU 合成层隔离 · 防止闪白 ===== */
        '.chat-app-window .ca-hdr-btn,' +
        '.chat-app-window .ca-plaque-dot,' +
        '.chat-app-window .ca-header-plaque,' +
        '.chat-app-window .ca-plaque-text,' +
        '.chat-app-window .ca-plaque-sig,' +
        '.chat-app-window .ca-nav-item,' +
        '.chat-app-window .ca-nav-icon-wrap,' +
        '.chat-app-window .ca-nav-badge,' +
        '.chat-app-window .ca-compose-btn,' +
        '.chat-app-window .ca-chat-row,' +
        '.chat-app-window .ca-chat-avatar,' +
        '.chat-app-window .ca-contact-row,' +
        '.chat-app-window .ca-contact-avatar,' +
        '.chat-app-window .ca-contact-act-btn,' +
        '.chat-app-window .ca-pinned-item,' +
        '.chat-app-window .ca-pinned-ring,' +
        '.chat-app-window .ca-pinned-inner,' +
        '.chat-app-window .ca-tab,' +
        '.chat-app-window .ca-disc-card,' +
        '.chat-app-window .ca-disc-row,' +
        '.chat-app-window .ca-disc-row-icon,' +
        '.chat-app-window .ca-me-stat,' +
        '.chat-app-window .ca-me-row,' +
        '.chat-app-window .ca-me-row-icon,' +
        '.chat-app-window .ca-me-avatar-wrap,' +
        '.chat-app-window .ca-me-avatar-inner,' +
        '.chat-app-window .ca-menu-exit,' +
        '.chat-app-window .ca-menu-label,' +
        '.chat-app-window .ca-compose-close,' +
        '.chat-app-window .ca-dossier,' +
        '.chat-app-window .ca-dossier-btn,' +
        '.chat-app-window .ca-banner-arrow,' +
        '.chat-app-window .ca-discover-banner,' +
        '#caChatDetail .nav-btn,' +
        '#caChatDetail .left-group,' +
        '#caChatDetail .right-group,' +
        '#caChatDetail .gradient-avatar,' +
        '#caChatDetail .gradient-inner,' +
        '#caChatDetail .slot-a,' +
        '#caChatDetail .icon-btn,' +
        '#caChatDetail .send-btn,' +
        '#caChatDetail .menu-btn,' +
        '#caChatDetail .menu-item,' +
        '#caChatDetail .tool-box,' +
        '#caChatDetail .tool-item,' +
        '#caChatDetail .folder-scene,' +
        '#caChatDetail .set-close,' +
        '#caChatDetail .set-big-av,' +
        '#caChatDetail .set-row,' +
        '#caChatDetail .set-row-icon,' +
        '#caChatDetail .set-mini-icon,' +
        '#caChatDetail .style-circle,' +
        '#caChatDetail .style-item-wrap,' +
        '#caChatDetail .api-sw,' +
        '#caChatDetail .api-sw-slider,' +
        '#caChatDetail .api-mcap,' +
        '#caChatDetail .api-fav,' +
        '#caChatDetail .api-btn,' +
        '#caChatDetail .m-item,' +
        '#caChatDetail .cd-context-menu,' +
        '#caChatDetail .menu-exit-btn,' +
        '#caChatDetail .menu-label,' +
        '#caChatDetail .float-btn,' +
        '#caChatDetail .drag-handle,' +
        '#caChatDetail .ms-cancel,' +
        '#caChatDetail .ms-delete{' +
            'transform:translateZ(0);' +
            '-webkit-backface-visibility:hidden;' +
            'backface-visibility:hidden;' +
        '}' +
        /* 带 :active 缩放的元素需要保留 translateZ(0) 作为基线，否则 :active 时会跳动 */
        '.chat-app-window .ca-hdr-btn:active{transform:translateZ(0) scale(.84);}' +
        '.chat-app-window .ca-nav-item:active{transform:translateZ(0) scale(.88);}' +
        '.chat-app-window .ca-compose-btn:active{transform:translateZ(0) scale(.86);}' +
        '.chat-app-window .ca-contact-act-btn:active{transform:translateZ(0) scale(.85);}' +
        '.chat-app-window .ca-pinned-item:active{transform:translateZ(0) scale(.88);}' +
        '.chat-app-window .ca-tab:active{transform:translateZ(0) scale(.92);}' +
        '.chat-app-window .ca-disc-card:active{transform:translateZ(0) scale(.96);}' +
        '.chat-app-window .ca-discover-banner:active{transform:translateZ(0) scale(.98);}' +
        '.chat-app-window .ca-dossier-btn:active{transform:translateZ(0) scale(.95);}' +
        '#caChatDetail .nav-btn:active{transform:translateZ(0) scale(0.82);}' +
        '#caChatDetail .gradient-avatar:active{transform:translateZ(0) scale(0.9);}' +
        '#caChatDetail .icon-btn:active{transform:translateZ(0) scale(0.85);}' +
        '#caChatDetail .send-btn:active{transform:translateZ(0) scale(0.85);}' +
        '#caChatDetail .set-big-av:active{transform:translateZ(0) scale(0.95);}' +
        '#caChatDetail .tool-item:active .tool-box{transform:translateZ(0) scale(0.9);}' +
        '#caChatDetail .style-item-wrap:active .style-circle{transform:translateZ(0) scale(0.9);}' +
        '#caChatDetail .api-fav:active{transform:translateZ(0) scale(0.9);}' +
        '#caChatDetail .api-btn:active{transform:translateZ(0) scale(0.96);}' +
        '#caChatDetail .set-savebtn:active{transform:translateZ(0) scale(.95);}' +
    '</style>' +
    '<div class="ca-chat-detail" id="caChatDetail">' +
        '<div class="ca-corset-line" id="cdCorsetLine">' +
            '<div class="corset-pattern"></div>' +
            '<div class="corset-bow-wrap">' +
                '<svg viewBox="0 0 60 50">' +
                    '<defs>' +
                        '<linearGradient id="caTieDye" x1="0%" y1="0%" x2="100%" y2="100%">' +
                            '<stop offset="0%" stop-color="#A63426" stop-opacity="1"/>' +
                            '<stop offset="35%" stop-color="#D9534F" stop-opacity="0.8"/>' +
                            '<stop offset="65%" stop-color="#8B2A1E" stop-opacity="0.9"/>' +
                            '<stop offset="100%" stop-color="#E86A58" stop-opacity="0.3"/>' +
                        '</linearGradient>' +
                    '</defs>' +
                    '<path d="M12 -5 C12 5, 24 10, 27 15 M48 -5 C48 5, 36 10, 33 15" stroke="url(#caTieDye)" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
                    '<path d="M 27 14 L 10 7 Q 2 7 2 15 Q 2 23 10 23 L 27 17" stroke="url(#caTieDye)" stroke-width="2" fill="none"/>' +
                    '<path d="M 33 14 L 50 7 Q 58 7 58 15 Q 58 23 50 23 L 33 17" stroke="url(#caTieDye)" stroke-width="2" fill="none"/>' +
                    '<path d="M 28 17 Q 20 35 15 50" stroke="#FFFFFF" stroke-width="6" fill="none"/>' +
                    '<path d="M 32 17 Q 40 35 45 50" stroke="#FFFFFF" stroke-width="6" fill="none"/>' +
                    '<path d="M 28 17 Q 20 35 15 50" stroke="url(#caTieDye)" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
                    '<path d="M 32 17 Q 40 35 45 50" stroke="url(#caTieDye)" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
                    '<path d="M 27 14 C 27 10, 33 10, 33 14 C 33 20, 27 20, 27 14 Z" fill="url(#caTieDye)"/>' +
                '</svg>' +
            '</div>' +
        '</div>' +
        '<div class="graphic-typo">Design</div>' +

        '<header class="header-system">' +
            '<div class="left-group">' +
                '<div class="nav-btn" id="caDetailBack">' +
                    '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>' +
                '</div>' +
                '<div class="gradient-avatar" id="cdGradientAvatar">' +
                    '<div class="gradient-inner" id="cdGradientInner"></div>' +
                    '<div class="slot-a"></div>' +
                '</div>' +
            '</div>' +
            '<div class="hanging-group">' +
                '<div class="wire-triple"><div></div><div></div><div></div></div>' +
                '<div class="sign-plaque">' +
                    '<div class="plaque-avatar" id="cdPlaqueAvWrap">' +
                        '<div class="plaque-av-inner" id="cdPlaqueAv"></div>' +
                    '</div>' +
                    '<div class="plaque-info">' +
                        '<span class="sign-text" id="cdSignText">Studio Chat</span>' +
                        '<div class="slot-b" id="cdSlotB">SESSION: AI</div>' +
                    '</div>' +
                    '<div class="sign-signature" id="cdSignSig">Design</div>' +
                '</div>' +
            '</div>' +
            '<div class="right-group">' +
                '<div class="nav-btn" id="cdMenuTrigger">' +
                    '<svg viewBox="0 0 24 24">' +
                        '<line x1="3" y1="12" x2="21" y2="12"></line>' +
                        '<line x1="3" y1="6" x2="21" y2="6"></line>' +
                        '<line x1="3" y1="18" x2="21" y2="18"></line>' +
                    '</svg>' +
                '</div>' +
            '</div>' +
        '</header>' +

        '<nav class="menu-overlay" id="cdMenuOverlay">' +
            '<div class="menu-exit-btn" id="cdMenuClose">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
                    '<line x1="18" y1="6" x2="6" y2="18"></line>' +
                    '<line x1="6" y1="6" x2="18" y2="18"></line>' +
                '</svg>' +
            '</div>' +
            '<ul class="menu-list">' +
                '<li class="menu-item-wrapper" id="cdMenuSettingsWrapper">' +
                    '<div class="accordion-header" id="cdMenuSettingsHeader">' +
                        '<a class="menu-label"><span class="menu-num">01</span>Settings <span class="menu-cn">/. 设置</span></a>' +
                        '<svg class="accordion-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>' +
                    '</div>' +
                    '<div class="accordion-content">' +
                        '<div class="accordion-inner">' +
                            '<div class="settings-panel">' +
                                '<div class="set-mini-row" id="cdMenuEntityProfile">' +
                                    '<div class="set-mini-icon"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>' +
                                    '<div class="set-mini-text">Entity Profile</div>' +
                                '</div>' +
                                '<div class="mini-divider"></div>' +
                                '<div>' +
                                    '<div class="trans-mini-title">Translation Setup</div>' +
                                    '<div class="style-selector" id="cdTransStyleSelector">' +
                                        '<div class="style-item-wrap" data-style="off"><div class="style-circle"><div class="check-dot"></div><div class="style-icon icon-off"><div class="dummy-bubble"></div></div></div><div class="style-name">Off</div></div>' +
                                        '<div class="style-item-wrap" data-style="seamless"><div class="style-circle"><div class="check-dot"></div><div class="style-icon icon-seamless"><div class="dummy-bubble"></div><div class="dummy-trans"></div></div></div><div class="style-name">Seamless</div></div>' +
                                        '<div class="style-item-wrap" data-style="obsidian"><div class="style-circle"><div class="check-dot"></div><div class="style-icon icon-obsidian"><div class="dummy-bubble"></div><div class="dummy-trans"></div></div></div><div class="style-name">Obsidian</div></div>' +
                                        '<div class="style-item-wrap" data-style="editorial"><div class="style-circle"><div class="check-dot"></div><div class="style-icon icon-editorial"><div class="dummy-bubble"></div><div class="dummy-trans"></div></div></div><div class="style-name">Editorial</div></div>' +
                                    '</div>' +
                                    '<div class="lang-settings">' +
                                    '<div class="lang-field"><label>My Language</label><input type="text" id="cdTransMyLang" placeholder="e.g. Auto"></div>' +
                                    '<div class="lang-field"><label>Translate To</label><input type="text" id="cdTransTargetLang" placeholder="e.g. Chinese"></div>' +
                                '</div>' +
                                '<div class="mini-divider" style="margin-top:16px;"></div>' +
                                '<div class="trans-mini-title" style="margin-top:14px;">Chat Avatars / 头像显示</div>' +
                                '<div class="ca-capsule-group" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
                                    '<span style="font-size:10px;font-weight:600;color:#151515;">Entity Avatar</span>' +
                                    '<div class="ca-capsules" id="cdAvEntityCap">' +
                                        '<div class="ca-cap-item" data-val="on">Show</div>' +
                                        '<div class="ca-cap-item" data-val="off">Hide</div>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="ca-capsule-group" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
                                    '<span style="font-size:10px;font-weight:600;color:#151515;">My Avatar</span>' +
                                    '<div class="ca-capsules" id="cdAvMeCap">' +
                                        '<div class="ca-cap-item" data-val="on">Show</div>' +
                                        '<div class="ca-cap-item" data-val="off">Hide</div>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="ca-capsule-group" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
                                    '<span style="font-size:10px;font-weight:600;color:#151515;">Position</span>' +
                                    '<div class="ca-capsules" id="cdAvPosCap">' +
                                        '<div class="ca-cap-item" data-val="top">Top</div>' +
                                        '<div class="ca-cap-item" data-val="bottom">Bottom</div>' +
                                        '<div class="ca-cap-item" data-val="all">All</div>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="mini-divider" style="margin-top:16px;"></div>' +
                                '<div class="trans-mini-title" style="margin-top:14px;">Time Awareness / 时间感知</div>' +
                                '<div class="time-aware-row">' +
                                    '<div class="time-aware-toggle-wrap">' +
                                        '<span class="time-aware-label">注入真实时间</span>' +
                                        '<div class="time-aware-toggle" id="cdTimeAwareToggle"><div class="time-aware-knob"></div></div>' +
                                    '</div>' +
                                    '<div class="time-aware-preview" id="cdTimeAwarePreview">' +
                                        '<div class="time-aware-clock" id="cdTimeAwareClock"></div>' +
                                        '<div class="time-aware-custom-wrap">' +
                                            '<div class="time-aware-toggle-wrap" style="margin-bottom:0;">' +
                                                '<span class="time-aware-label" style="font-size:10px;opacity:0.6;">自定义时间</span>' +
                                                '<div class="time-aware-toggle" id="cdTimeCustomToggle"><div class="time-aware-knob"></div></div>' +
                                            '</div>' +
                                            '<div class="time-custom-inputs" id="cdTimeCustomInputs">' +
                                                '<div class="tci-group">' +
                                                    '<label class="tci-label">月</label>' +
                                                    '<input type="number" id="cdTcMonth" min="1" max="12" class="tci-input" placeholder="--">' +
                                                '</div>' +
                                                '<div class="tci-sep">·</div>' +
                                                '<div class="tci-group">' +
                                                    '<label class="tci-label">日</label>' +
                                                    '<input type="number" id="cdTcDay" min="1" max="31" class="tci-input" placeholder="--">' +
                                                '</div>' +
                                                '<div class="tci-sep">·</div>' +
                                                '<div class="tci-group">' +
                                                    '<label class="tci-label">时</label>' +
                                                    '<input type="number" id="cdTcHour" min="0" max="23" class="tci-input" placeholder="--">' +
                                                '</div>' +
                                                '<div class="tci-sep">:</div>' +
                                                '<div class="tci-group">' +
                                                    '<label class="tci-label">分</label>' +
                                                    '<input type="number" id="cdTcMin" min="0" max="59" class="tci-input" placeholder="--">' +
                                                '</div>' +
                                            '</div>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</li>' +
                '<li><a class="menu-label" id="cdMenuClear"><span class="menu-num">02</span>Clear Chat <span class="menu-cn">/. 清空</span></a></li>' +
                '<li class="menu-item-wrapper" id="cdMenuMemoryWrapper">' +
                    '<div class="accordion-header" id="cdMenuMemoryHeader">' +
                        '<a class="menu-label"><span class="menu-num">03</span>Memory <span class="menu-cn">/. 记忆</span></a>' +
                        '<svg class="accordion-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>' +
                    '</div>' +
                    '<div class="accordion-content">' +
                        '<div class="accordion-inner">' +
                            '<div class="memory-panel" id="cdMemoryPanel">' +

                                '<div class="mem-section-title">Memory Bank <span class="mem-count" id="cdMemCount"></span></div>' +

                                '<div class="mem-level-block" data-level="high">' +
                                    '<div class="mem-level-hd">' +
                                        '<span class="mem-level-badge high">① HIGH</span>' +
                                        '<div style="display:flex;align-items:center;gap:6px;">' +
                                            '<div style="width:7px;height:7px;border-radius:50%;background:#151515;flex-shrink:0;box-shadow:0 0 0 2px rgba(0,0,0,0.08);"></div>' +
                                            '<span class="mem-level-label">核心性格 / 关系定义</span>' +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="mem-list" id="cdMemListHigh"></div>' +
                                    '<div class="mem-add-row"><input type="text" class="mem-add-input" placeholder="手动添加记忆..." data-level="high"><button class="mem-add-btn" data-level="high">+</button></div>' +
                                '</div>' +

                                '<div class="mem-level-block" data-level="mid">' +
                                    '<div class="mem-level-hd">' +
                                        '<span class="mem-level-badge mid">② MID</span>' +
                                        '<div style="display:flex;align-items:center;gap:6px;">' +
                                            '<div style="width:7px;height:7px;border-radius:50%;background:#636366;flex-shrink:0;box-shadow:0 0 0 2px rgba(0,0,0,0.06);"></div>' +
                                            '<span class="mem-level-label">重要事件 / 偏好习惯</span>' +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="mem-list" id="cdMemListMid"></div>' +
                                    '<div class="mem-add-row"><input type="text" class="mem-add-input" placeholder="手动添加记忆..." data-level="mid"><button class="mem-add-btn" data-level="mid">+</button></div>' +
                                '</div>' +

                                '<div class="mem-level-block" data-level="low">' +
                                    '<div class="mem-level-hd">' +
                                        '<span class="mem-level-badge low">③ LOW</span>' +
                                        '<div style="display:flex;align-items:center;gap:6px;">' +
                                            '<div style="width:7px;height:7px;border-radius:50%;background:#c7c7cc;flex-shrink:0;box-shadow:0 0 0 2px rgba(0,0,0,0.04);"></div>' +
                                            '<span class="mem-level-label">近期碎片 / 日常细节</span>' +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="mem-list" id="cdMemListLow"></div>' +
                                    '<div class="mem-add-row"><input type="text" class="mem-add-input" placeholder="手动添加记忆..." data-level="low"><button class="mem-add-btn" data-level="low">+</button></div>' +
                                '</div>' +

                                '<div class="mem-actions">' +
                                    '<button class="mem-btn-auto" id="cdMemAutoSumBtn">✦ AI 自动总结</button>' +
                                    '<button class="mem-btn-manual" id="cdMemManualSumBtn">手动总结</button>' +
                                '</div>' +

                                '<div class="mem-divider"></div>' +

                                '<div class="mem-rounds-block">' +
                                    '<div class="mem-rounds-title">AI 记忆轮数</div>' +
                                    '<div class="mem-rounds-sub">本次调取最近 N 轮对话（不含记忆注入）</div>' +
                                    '<div class="mem-rounds-row">' +
                                        '<input type="range" id="cdMemRoundsSlider" min="5" max="100" step="5" value="30">' +
                                        '<span class="mem-rounds-val" id="cdMemRoundsVal">30</span>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</li>' +
                '<li class="menu-item-wrapper" id="cdMenuCssWrapper">' +
                    '<div class="accordion-header" id="cdMenuCssHeader">' +
                        '<a class="menu-label"><span class="menu-num">04</span>Custom ♪ <span class="menu-cn">/. 美化</span></a>' +
                        '<svg class="accordion-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>' +
                    '</div>' +
                    '<div class="accordion-content">' +
                        '<div class="accordion-inner" style="padding-top:16px;">' +
                            '<div style="font-size:9px;color:rgba(21,21,21,0.4);margin-bottom:10px;line-height:1.4;letter-spacing:0.5px;">Inject CSS to restyle the interface. Previews instantly.</div>' +
                            '<textarea id="cdCustomCssInput" spellcheck="false" style="width:100%;height:120px;background:rgba(21,21,21,0.03);border:1px solid rgba(21,21,21,0.08);border-radius:12px;padding:12px;font-family:\'Space Grotesk\', sans-serif;font-size:11px;line-height:1.5;color:#151515;outline:none;resize:none;box-sizing:border-box;" placeholder="/* Add custom styles here... */"></textarea>' +
                            '<div style="display:flex;gap:8px;margin-top:12px;">' +
                                '<button id="cdCustomCssReset" style="flex:1;padding:10px;border-radius:50px;background:transparent;border:1px solid rgba(21,21,21,0.15);color:#151515;font-size:9px;font-weight:700;cursor:pointer;transition:all 0.2s;">RESET</button>' +
                                '<button id="cdCustomCssSave" style="flex:2;padding:10px;border-radius:50px;background:#151515;border:none;color:#fff;font-size:9px;font-weight:700;cursor:pointer;transition:all 0.2s;">APPLY CSS</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</li>' +
                '<li><a class="menu-label" id="cdMenuDelete"><span class="menu-num">05</span>Delete Entity <span class="menu-cn">/. 删除</span></a></li>' +
            '</ul>' +
        '</nav>' +

        '<div class="settings-overlay" id="cdSettings"></div>' +

        '<main class="chat-area" id="cdChatArea"><div class="lp-overlay" id="cdLpOverlay"></div></main>' +

        '<div class="floating-layer" id="cdFloatLayer">' +
            '<div class="cd-context-menu style-02" id="cdContextMenu">' +
                '<div class="m-item" data-action="edit"><svg class="icon-svg" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg><div class="tooltip">编辑</div></div>' +
                '<div class="m-item" data-action="regen"><svg class="icon-svg" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg><div class="tooltip">重回</div></div>' +
                '<div class="m-item" data-action="multi"><svg class="icon-svg" viewBox="0 0 24 24"><path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path></svg><div class="tooltip">多选</div></div>' +
                '<div class="m-item" data-action="copy"><svg class="icon-svg" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><div class="tooltip">复制</div></div>' +
                '<div class="m-item" data-action="rollback"><svg class="icon-svg" viewBox="0 0 24 24"><polygon points="11 19 2 12 11 5 11 19"></polygon><polygon points="22 19 13 12 22 5 22 19"></polygon></svg><div class="tooltip">回溯</div></div>' +
            '</div>' +
        '</div>' +

        buildApiModalHTML() +

        '<div class="bottom-zone">' +
            '<footer class="input-bar" id="cdInputBar">' +
                '<div class="icon-btn" id="cdAddBtn">' +
                    '<svg viewBox="0 0 24 24">' +
                        '<line x1="12" y1="6" x2="12" y2="18"></line>' +
                        '<line x1="6" y1="12" x2="18" y2="12"></line>' +
                    '</svg>' +
                '</div>' +
                '<input type="text" id="cdUserInput" placeholder="Type a message..." autocomplete="off">' +
                '<div class="icon-btn" id="cdAttachBtn">' +
                    '<svg viewBox="0 0 24 24">' +
                        '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>' +
                    '</svg>' +
                '</div>' +
                '<div class="send-btn" id="cdSendBtn">' +
                    '<svg viewBox="0 0 24 24">' +
                        '<line x1="12" y1="19" x2="12" y2="5"></line>' +
                        '<polyline points="5 12 12 5 19 12"></polyline>' +
                    '</svg>' +
                '</div>' +
            '</footer>' +
            
            '<div class="multi-bar" id="cdMultiBar">' +
                '<div class="ms-cancel" id="cdMsCancel">Cancel</div>' +
                '<div class="ms-delete" id="cdMsDelete">Delete (0)</div>' +
            '</div>' +

            '<div class="ext-drawer" id="cdExtDrawer">' +
                '<div class="drawer-scroll" id="cdDrawerScroll">' +

                    '<div class="drawer-top">' +
                        '<div class="drawer-header">' +
                            '<span class="drawer-title">Quick Actions</span>' +
                            '<span class="drawer-sig">Studio</span>' +
                        '</div>' +
                        '<div class="menu-grid">' +

                            '<div class="menu-item">' +
                                '<div class="menu-btn">' +
                                    '<svg viewBox="0 0 24 24" fill="none" stroke="#151515" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
                                        '<rect x="9" y="2" width="6" height="11" rx="3"/>' +
                                        '<path d="M5 10a7 7 0 0 0 14 0"/>' +
                                        '<line x1="12" y1="17" x2="12" y2="21"/>' +
                                        '<line x1="9" y1="21" x2="15" y2="21"/>' +
                                        '<path d="M19.5 8c.4.9.6 1.9.6 3" stroke-width="1.2" opacity="0.4"/>' +
                                        '<path d="M21.5 6.5c.8 1.5 1.2 3.2 1.2 4.5" stroke-width="1" opacity="0.2"/>' +
                                    '</svg>' +
                                '</div>' +
                                '<span class="menu-item-label">旁白</span>' +
                            '</div>' +

                            '<div class="menu-item">' +
                                '<div class="menu-btn">' +
                                    '<svg viewBox="0 0 24 24" fill="none" stroke="#151515" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
                                        '<rect x="3" y="4.5" width="18" height="14" rx="2.5"/>' +
                                        '<circle cx="8.5" cy="9" r="1.5"/>' +
                                        '<path d="M3 15.5l4.5-4.5 3.5 3.5 3-3 4 4"/>' +
                                    '</svg>' +
                                '</div>' +
                                '<span class="menu-item-label">图片</span>' +
                            '</div>' +

                            '<div class="menu-item">' +
                                '<div class="menu-btn">' +
                                    '<svg viewBox="0 0 24 24" fill="none" stroke="#151515" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
                                        '<rect x="2" y="4" width="12" height="9" rx="2" stroke-dasharray="2.5 1.5" opacity="0.35"/>' +
                                        '<rect x="9" y="11" width="13" height="9" rx="2"/>' +
                                        '<line x1="11.5" y1="14" x2="19.5" y2="14"/>' +
                                        '<line x1="11.5" y1="16.5" x2="18" y2="16.5"/>' +
                                        '<line x1="11.5" y1="19" x2="16" y2="19"/>' +
                                    '</svg>' +
                                '</div>' +
                                '<span class="menu-item-label">文字图片</span>' +
                            '</div>' +

                            '<div class="menu-item">' +
                                '<div class="menu-btn">' +
                                    '<svg viewBox="0 0 24 24" fill="none" stroke="#151515" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
                                        '<path d="M4.5 13v-2a7.5 7.5 0 0 1 15 0v2"/>' +
                                        '<rect x="3" y="13" width="3.5" height="5" rx="1.5"/>' +
                                        '<rect x="17.5" y="13" width="3.5" height="5" rx="1.5"/>' +
                                        '<circle cx="10.5" cy="4.5" r="0.8" fill="#151515" stroke="none" opacity="0.4"/>' +
                                        '<circle cx="13.5" cy="4.5" r="0.8" fill="#151515" stroke="none" opacity="0.4"/>' +
                                    '</svg>' +
                                '</div>' +
                                '<span class="menu-item-label">一起听</span>' +
                            '</div>' +

                            '<div class="menu-row-divider"></div>' +

                            '<div class="menu-item">' +
                                '<div class="menu-btn">' +
                                    '<svg viewBox="0 0 24 24" fill="none" stroke="#151515" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
                                        '<rect x="2" y="4.5" width="20" height="13" rx="2.5"/>' +
                                        '<line x1="12" y1="17.5" x2="12" y2="21"/>' +
                                        '<line x1="8.5" y1="21" x2="15.5" y2="21"/>' +
                                        '<path d="M10 9l5 3-5 3V9z" fill="#151515" stroke="none" opacity="0.7"/>' +
                                        '<circle cx="17.5" cy="7" r="1" stroke-width="1.2" opacity="0.5"/>' +
                                        '<circle cx="20" cy="7" r="1" stroke-width="1.2" opacity="0.3"/>' +
                                    '</svg>' +
                                '</div>' +
                                '<span class="menu-item-label">一起看</span>' +
                            '</div>' +

                            '<div class="menu-item">' +
                                '<div class="menu-btn">' +
                                    '<svg viewBox="0 0 24 24" fill="none" stroke="#151515" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
                                        '<path d="M12 2a6 6 0 0 1 6 6c0 4.5-6 11.5-6 11.5S6 12.5 6 8a6 6 0 0 1 6-6z"/>' +
                                        '<circle cx="12" cy="8" r="2.2"/>' +
                                        '<ellipse cx="12" cy="21.5" rx="3" ry="0.8" stroke-width="1" opacity="0.18"/>' +
                                    '</svg>' +
                                '</div>' +
                                '<span class="menu-item-label">位置</span>' +
                            '</div>' +

                            '<div class="menu-item">' +
                                '<div class="menu-btn">' +
                                    '<svg viewBox="0 0 24 24" fill="none" stroke="#151515" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
                                        '<circle cx="12" cy="12" r="9.5"/>' +
                                        '<line x1="12" y1="6" x2="12" y2="7"/>' +
                                        '<line x1="12" y1="17" x2="12" y2="18"/>' +
                                        '<path d="M15 9.5A3.5 3.5 0 0 0 9 11c0 1.6 1 2.6 3 3.2s3 1.6 3 3.1a3.5 3.5 0 0 1-6 1.4"/>' +
                                    '</svg>' +
                                '</div>' +
                                '<span class="menu-item-label">转账</span>' +
                            '</div>' +

                        '</div>' +
                    '</div>' +

                    '<div class="drawer-divider"></div>' +

                    '<div class="drawer-bottom" id="cdFolderContainer">' +
                        '<div class="folder-scene" id="cdFolder">' +
                            '<div class="drag-handle" id="cdDragHandle"></div>' +
                            '<div class="float-btn" id="cdFloatToggle">' +
                                '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
                                    '<path d="M21 10V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"></path>' +
                                    '<path d="M11 6V3"></path>' +
                                    '<path d="M15 12l5 5"></path>' +
                                    '<path d="M15 17l5-5"></path>' +
                                '</svg>' +
                            '</div>' +
                            '<div class="folder-wrapper" id="cdFolderWrapper">' +
                                '<div class="folder-back"><div class="folder-tab"></div></div>' +
                                '<div class="paper paper-2"></div>' +
                                '<div class="paper paper-1"></div>' +
                                '<div class="tools-inner">' +
                                    '<div class="tool-item" id="cdToolApi">' +
                                        '<div class="tool-box" style="border:1px solid rgba(166,52,38,0.2);">' +
                                            '<svg style="stroke:#A63426;" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
                                                '<path d="M17 2.1l4 4-4 4"/>' +
                                                '<path d="M3 12.2v-2a4 4 0 0 1 4-4h13.8"/>' +
                                                '<path d="M7 21.9l-4-4 4-4"/>' +
                                                '<path d="M21 11.8v2a4 4 0 0 1-4 4H3.2"/>' +
                                            '</svg>' +
                                        '</div>' +
                                        '<span style="color:#A63426;">Switch API</span>' +
                                    '</div>' +
                                    '<div class="tool-item empty-item"><div class="tool-box empty-slot"></div></div>' +
                                    '<div class="tool-item empty-item"><div class="tool-box empty-slot"></div></div>' +
                                    '<div class="tool-item empty-item"><div class="tool-box empty-slot"></div></div>' +
                                    '<div class="tool-item empty-item"><div class="tool-box empty-slot"></div></div>' +
                                    '<div class="tool-item empty-item"><div class="tool-box empty-slot"></div></div>' +
                                '</div>' +
                                '<div class="folder-front">' +
                                    '<div style="position:absolute;right:10px;top:10px;width:8px;height:8px;border-radius:50%;border:1px solid rgba(166,52,38,0.4);display:flex;justify-content:center;align-items:center;">' +
                                        '<div style="width:2px;height:2px;background:#A63426;border-radius:50%;"></div>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="resize-handle" id="cdResizeHandle"></div>' +
                            '</div>' +
                            '<div class="folder-text-group">' +
                                '<div class="folder-title">Creative Assets</div>' +
                                '<div class="folder-sub">Tap to unlock tools</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +

                '</div>' +
            '</div>' +
        '</div>' +
    '</div>' +
    '<style>' +
        '.msg-row.no-anim{animation:none!important;transition:none!important;opacity:1!important;}' +
        '.msg-row.no-anim .bubble{animation:none!important;transition:none!important;}' +
        
        '#caChatDetail #cdChatArea > *:not(#cdChatMask) {' +
            'transform: translate3d(var(--swipe-x, 0px), 0, 0);' +
            'transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);' +
        '}' +
        '#caChatDetail #cdChatArea.is-swiping > *:not(#cdChatMask) {' +
            'transition: none !important;' +
        '}' +
        
        '#caChatDetail .msg-content-wrap { display: flex; align-items: flex-end; width: 100%; }' +
        '#caChatDetail .row-sent .msg-content-wrap { flex-direction: row-reverse; }' +
        
        /* 头像放大2px -> 30px，向左平移穿底纹。加入上下拉长的白色柔光(box-shadow)，用来融化背后的鞋带使其渐变消失 */
        '#caChatDetail .msg-avatar { width: 30px; height: 30px; border-radius: 50%; overflow: hidden; flex-shrink: 0; display: none; background: #FFFFFF; box-shadow: 0 -20px 25px 15px #FFFFFF, 0 20px 25px 15px #FFFFFF, 0 0 15px 15px #FFFFFF, 0 2px 5px rgba(0,0,0,0.05); border: 1px solid rgba(21,21,21,0.05); transition: opacity 0.3s; position: relative; z-index: 2; }' +

        /* ── Weight Drop 长按动画 ── */
        '#caChatDetail .bubble {' +
            'transform-origin: bottom center;' +
            'transition: transform 0.15s cubic-bezier(0.16,1,0.3,1);' +
            'overflow: visible;' +
        '}' +
        '#caChatDetail .row-sent .bubble { transform-origin: bottom right; }' +
        '#caChatDetail .row-received .bubble { transform-origin: bottom left; }' +

        '#caChatDetail .bubble.lp-pressing {' +
            'transform: scaleX(1.04) scaleY(0.93);' +
            'transition: transform 0.1s ease;' +
        '}' +

        '@keyframes cd-wd-bounce {' +
            '0%   { transform: scaleX(1.04) scaleY(0.93); box-shadow: 0 0 0 rgba(0,0,0,0); }' +
            '30%  { transform: scaleX(1.02) scaleY(0.96); box-shadow: 0 6px 0 rgba(0,0,0,0.15); }' +
            '55%  { transform: scaleX(0.99) scaleY(1.03); box-shadow: 0 2px 0 rgba(0,0,0,0.08); }' +
            '75%  { transform: scaleX(1.005) scaleY(0.995); }' +
            '100% { transform: scaleX(1) scaleY(1); box-shadow: 6px 6px 0 rgba(21,21,21,0.9); }' +
        '}' +
        '@keyframes cd-wd-bounce-sent {' +
            '0%   { transform: scaleX(1.04) scaleY(0.93); }' +
            '30%  { transform: scaleX(1.02) scaleY(0.96); box-shadow: 0 6px 0 rgba(255,255,255,0.15); }' +
            '55%  { transform: scaleX(0.99) scaleY(1.03); }' +
            '75%  { transform: scaleX(1.005) scaleY(0.995); }' +
            '100% { transform: scaleX(1) scaleY(1); box-shadow: -6px 6px 0 rgba(255,255,255,0.85); }' +
        '}' +

        '#caChatDetail .bubble.lp-lifted {' +
            'animation: cd-wd-bounce 0.5s cubic-bezier(0.16,1,0.3,1) forwards;' +
            'position: relative; z-index: 50; overflow: visible !important;' +
        '}' +
        '#caChatDetail .row-sent .bubble.lp-lifted {' +
            'animation: cd-wd-bounce-sent 0.5s cubic-bezier(0.16,1,0.3,1) forwards;' +
            'overflow: visible !important;' +
        '}' +

        '#caChatDetail .lp-wd-dust {' +
            'position: absolute;' +
            'bottom: -2px;' +
            'left: 50%;' +
            'transform: translateX(-50%);' +
            'width: 100%;' +
            'height: 8px;' +
            'pointer-events: none;' +
            'opacity: 0;' +
        '}' +
        '#caChatDetail .lp-wd-dust span {' +
            'position: absolute;' +
            'bottom: 0;' +
            'width: 3px; height: 3px;' +
            'border-radius: 50%;' +
            'background: #151515;' +
            'opacity: 0;' +
        '}' +
        '#caChatDetail .row-sent .bubble .lp-wd-dust span { background: #ffffff; }' +

        '@keyframes cd-dust-fly {' +
            '0%   { opacity: 0.7; transform: translateY(0) translateX(0); }' +
            '100% { opacity: 0; transform: translateY(-8px) translateX(var(--dx)); }' +
        '}' +
        '#caChatDetail .bubble.lp-lifted .lp-wd-dust { opacity: 1; }' +
        '#caChatDetail .bubble.lp-lifted .lp-wd-dust span:nth-child(1) { left: 15%; animation: cd-dust-fly 0.4s ease 0.25s forwards; --dx: -6px; }' +
        '#caChatDetail .bubble.lp-lifted .lp-wd-dust span:nth-child(2) { left: 35%; animation: cd-dust-fly 0.4s ease 0.28s forwards; --dx: -2px; }' +
        '#caChatDetail .bubble.lp-lifted .lp-wd-dust span:nth-child(3) { left: 50%; animation: cd-dust-fly 0.4s ease 0.26s forwards; --dx: 0px; }' +
        '#caChatDetail .bubble.lp-lifted .lp-wd-dust span:nth-child(4) { left: 65%; animation: cd-dust-fly 0.4s ease 0.29s forwards; --dx: 2px; }' +
        '#caChatDetail .bubble.lp-lifted .lp-wd-dust span:nth-child(5) { left: 85%; animation: cd-dust-fly 0.4s ease 0.25s forwards; --dx: 6px; }' +

        '#caChatDetail .lp-star-badge {' +
            'position: absolute;' +
            'top: -18px; right: -8px;' +
            'opacity: 0;' +
            'transform: scale(0) rotate(-30deg);' +
            'transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1) 0.42s;' +
            'pointer-events: none;' +
            'z-index: 999;' +
        '}' +
        '#caChatDetail .bubble.lp-lifted .lp-star-badge {' +
            'opacity: 1;' +
            'transform: scale(1) rotate(0deg);' +
        '}' +
        '#caChatDetail .lp-star-badge svg {' +
            'width: 18px; height: 18px;' +
            'fill: #151515;' +
            'stroke: #ffffff;' +
            'stroke-width: 2px;' +
            'stroke-linejoin: round;' +
        '}' +
        '#caChatDetail .row-sent .bubble .lp-star-badge svg { fill: #ffffff; stroke: #151515; }' +

        '#caChatDetail .lp-bubble-meta {' +
            'position: absolute;' +
            'bottom: -22px;' +
            'left: 0; right: 0;' +
            'text-align: center;' +
            'font-size: 8px;' +
            'font-weight: 800;' +
            'letter-spacing: 1.5px;' +
            'color: rgba(21,21,21,0.3);' +
            'opacity: 0;' +
            'transform: translateY(-4px);' +
            'transition: all 0.3s ease 0.42s;' +
            'pointer-events: none;' +
            'text-transform: uppercase;' +
            'white-space: nowrap;' +
            'font-family: "Share Tech Mono", monospace;' +
        '}' +
        '#caChatDetail .bubble.lp-lifted .lp-bubble-meta {' +
            'opacity: 1;' +
            'transform: translateY(0);' +
        '}' +

        /* 遮罩 — 覆盖其他消息 */
        '#caChatDetail .lp-overlay { position: absolute; inset: 0; background: rgba(240,237,232,0.72); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); z-index: 40; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }' +
        '#caChatDetail .lp-overlay.active { opacity: 1; pointer-events: auto; }' +
        
        '#caChatDetail #cdChatArea { position: relative; z-index: 10; isolation: auto; }' +
        '#caChatDetail #cdChatArea .msg-row { isolation: auto; }' +
        '#caChatDetail #cdChatArea .msg-row.has-trans { z-index: 9999 !important; position: relative !important; }' +
        '#caChatDetail #cdChatArea .msg-row.has-trans .msg-content-wrap { position: relative !important; z-index: 9999 !important; }' +
        '#caChatDetail #cdChatArea .bubble.has-trans { isolation: auto !important; overflow: visible !important; position: relative !important; z-index: 9999 !important; }' +
        '#caChatDetail #cdChatArea .msg-row.has-trans { position: relative; }' +
        '#caChatDetail #cdChatArea .msg-row.trans-active .expand-wrapper { z-index: 9999; }' +
        '#caChatDetail #cdChatArea .trans-block { position: absolute !important; z-index: 9999 !important; pointer-events: auto !important; left: 0; right: 0; }' +
        '#caChatDetail #cdChatArea .trans-content { position: relative; z-index: 9999; pointer-events: auto; }' +
        '#caChatDetail #cdChatArea .trans-editorial { position: relative; z-index: 9999; pointer-events: auto; }' +
        
        '#caChatDetail .row-received .msg-avatar { margin-right: 12px; margin-left: -15px; margin-bottom: 2px; transform: translateY(8px); }' +
        '#caChatDetail .row-sent .msg-avatar { margin-left: 12px; margin-right: -4px; margin-bottom: 2px; transform: translateY(8px); }' +
        
        '#caChatDetail.av-ent-show .row-received .msg-avatar { display: flex; }' +
        '#caChatDetail.av-me-show .row-sent .msg-avatar { display: flex; }' +
        
        '#caChatDetail.av-ent-show .row-received .msg-meta { margin-left: 27px; transition: margin-left 0.3s; }' +
        '#caChatDetail.av-me-show .row-sent .msg-meta { margin-right: 27px; transition: margin-right 0.3s; }' +
        
        /* 底部显示逻辑：如果被 group，说明不是最后一个气泡，隐藏之 */
        '#caChatDetail.av-pos-bottom .msg-row.grouped .msg-avatar { opacity: 0; pointer-events: none; }' +
        
        /* 顶部显示逻辑：对齐顶部，如果是后接的气泡，隐藏之 */
        '#caChatDetail.av-pos-top .msg-content-wrap { align-items: flex-start; }' +
        '#caChatDetail.av-pos-top .row-received .msg-avatar { transform: translateY(0); margin-top: 4px; margin-bottom: 0; }' +
        '#caChatDetail.av-pos-top .row-sent .msg-avatar { transform: translateY(0); margin-top: 4px; margin-bottom: 0; }' +
        '#caChatDetail.av-pos-top .row-received + .row-received .msg-avatar { opacity: 0; pointer-events: none; }' +
        '#caChatDetail.av-pos-top .row-sent + .row-sent .msg-avatar { opacity: 0; pointer-events: none; }' +
        
        /* 灰色圆胶囊样式 */
        '.ca-capsules { display: flex; background: rgba(21,21,21,0.04); border-radius: 50px; padding: 2px; gap: 2px; width: fit-content; }' +
        '.ca-cap-item { padding: 6px 14px; border-radius: 50px; font-size: 9px; font-weight: 700; color: rgba(21,21,21,0.4); text-transform: uppercase; cursor: pointer; transition: all 0.2s; }' +
        '.ca-cap-item.active { background: #151515; color: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }' +
        
        /* 鞋带层级逻辑：根据头像位置状态智能切换透明度和层级 */
        '#caChatDetail .axis-line-y { display: none !important; }' +
        '#caChatDetail .ca-corset-line { position: absolute; top: 0; bottom: 0; left: 25px; width: 30px; pointer-events: none; display: flex; flex-direction: column; transition: z-index 0.4s, opacity 0.4s; }' +
        '#caChatDetail .corset-pattern { flex: 1; width: 100%; background-image: url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 30 20\'><line x1=\'1\' y1=\'0\' x2=\'1\' y2=\'20\' stroke=\'%23A63426\' stroke-width=\'1\' stroke-dasharray=\'2 3\' opacity=\'0.3\'/><line x1=\'29\' y1=\'0\' x2=\'29\' y2=\'20\' stroke=\'%23A63426\' stroke-width=\'1\' stroke-dasharray=\'2 3\' opacity=\'0.3\'/><path d=\'M4 5 L26 15 M26 5 L4 15\' stroke=\'%23A63426\' stroke-width=\'1.8\' stroke-linecap=\'round\' fill=\'none\' opacity=\'0.85\'/></svg>"); background-repeat: repeat-y; background-size: 100% 20px; }' +
        '#caChatDetail .corset-bow-wrap { width: 60px; height: 50px; margin-left: -15px; flex-shrink: 0; margin-bottom: 90px; overflow: visible; -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 100%); mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 100%); }' +
        '#caChatDetail .corset-bow-wrap svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 4px 6px rgba(166,52,38,0.2)); }' +
        
        /* 头像在Top(上层)：鞋带作为底层底纹穿梭在头像后方 */
        '#caChatDetail.av-pos-top .ca-corset-line { z-index: 1; opacity: 0.35; }' +
        /* 头像在Bottom(下层)：统一作为底纹 */
        '#caChatDetail.av-pos-bottom .ca-corset-line { z-index: 1; opacity: 0.35; }' +
        /* 头像全开(All)：极淡的全局底纹 */
        '#caChatDetail.av-pos-all .ca-corset-line { z-index: 1; opacity: 0.2; }' +
        
        '.cd-load-hint { display: flex; align-items: center; justify-content: center; gap: 15px; padding: 30px 0 10px; opacity: 0.4; pointer-events: none; }' +
        '.lh-line { height: 1px; flex: 1; background: linear-gradient(to right, transparent, #151515, transparent); }' +
        '.lh-text { font-family: "Share Tech Mono", monospace; font-size: 9px; letter-spacing: 2px; color: #151515; font-weight: 700; text-transform: uppercase; }' +
    '</style>';
}


function buildSettingsHTML(ent, msgs) {
    var initial = ent.name.trim().charAt(0).toUpperCase();
    var handle = '@' + ent.name.toLowerCase().replace(/\s+/g, '_');
    var sentCount = 0;
    var recvCount = 0;
    for (var i = 0; i < msgs.length; i++) {
        if (msgs[i].role === 'user') sentCount++;
        else recvCount++;
    }

    var masks = [];
    try { masks = JSON.parse(localStorage.getItem('ca-user-masks') || '[{"id":"m1","name":"The Architect","bio":"Logical, precise, structural thinker.","active":true}]'); } catch(e) {}

    var maskListHtml = '';
    masks.forEach(function(m) {
        var isSel = m.active ? ' selected' : '';
        var fallbackInitial = (m.name || '?').trim().charAt(0).toUpperCase();
        var avHtml = m.avatar ? '<img src="' + m.avatar + '" style="width:100%;height:100%;object-fit:cover;">' : fallbackInitial;
        maskListHtml += '<div class="mask-option' + isSel + '" data-id="' + m.id + '">' +
            '<div class="mask-av-mini" style="width:32px;height:32px;border-radius:50%;background:#151515;color:#fff;display:flex;justify-content:center;align-items:center;font-size:14px;font-weight:700;overflow:hidden;flex-shrink:0;">' + avHtml + '</div>' +
            '<div class="mask-info">' +
                '<div class="mask-name">' + (m.name || 'Unnamed') + '</div>' +
                '<div class="mask-bio">' + (m.bio || 'No description.') + '</div>' +
            '</div>' +
            '<div class="mask-radio"></div>' +
        '</div>';
    });

    return '' +
    '<div class="set-close" id="cdSetClose">' +
        '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
    '</div>' +
    '<div class="set-avatar-sec">' +
        '<div class="set-big-av" id="cdSetAvatar" style="border:none;padding:0;width:96px;height:96px;display:flex;align-items:center;justify-content:center;background:transparent;box-shadow:none;position:relative;cursor:pointer;">' +
            '<svg style="position:absolute;inset:-15px;width:126px;height:126px;pointer-events:none;z-index:0;" viewBox="0 0 100 100">' +
                '<circle cx="50" cy="50" r="41" fill="none" stroke="#444" stroke-width="0.4" stroke-dasharray="12 6 4 2" opacity="0.7" />' +
                '<circle cx="50" cy="50" r="44" fill="none" stroke="#888" stroke-width="0.4" stroke-dasharray="2 10 15 5" opacity="0.5" />' +
                '<circle cx="50" cy="50" r="47" fill="none" stroke="#ccc" stroke-width="0.4" stroke-dasharray="8 18" opacity="0.3" />' +
            '</svg>' +
            '<div style="width:100%;height:100%;border-radius:50%;overflow:hidden;border:1px solid #151515;z-index:1;position:relative;background:#fff;display:flex;justify-content:center;align-items:center;">' +
                (ent.avatar
                    ? '<img class="set-big-img" src="' + ent.avatar + '" alt="avatar" style="width:100%;height:100%;object-fit:cover;">'
                    : '<div class="set-big-inner" style="width:100%;height:100%;display:flex;justify-content:center;align-items:center;font-size:32px;font-weight:700;color:#fff;background:' + ent.color + ';">' + initial + '</div>') +
            '</div>' +
            '<div class="set-edit-dot" style="background:transparent;border:none;bottom:-2px;right:-2px;width:26px;height:26px;z-index:2;box-shadow:none;position:absolute;display:flex;justify-content:center;align-items:center;">' +
                '<svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:#000;stroke:#fff;stroke-width:2.5;stroke-linejoin:round;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' +
            '</div>' +
        '</div>' +
        '<input type="file" id="cdAvatarInput" accept="image/*" style="display:none;">' +
        '<div class="set-name" id="cdSetName" style="cursor:pointer;" title="Click to rename">' + ent.name + ' <svg style="width:16px;height:16px;stroke:#151515;fill:none;stroke-width:2;vertical-align:middle;opacity:0.3;margin-left:4px;transform:translateY(-2px);" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></div>' +
        '<div class="set-sub" id="cdSetHandle">' + handle + ' · AI Entity</div>' +
        '<div class="set-sig">Avant-Garde</div>' +
    '</div>' +
    '<div class="set-stats">' +
        '<div class="set-stat"><div class="set-stat-num">' + msgs.length + '</div><div class="set-stat-lbl">Messages</div></div>' +
        '<div class="set-stat"><div class="set-stat-num">' + sentCount + '</div><div class="set-stat-lbl">Sent</div></div>' +
        '<div class="set-stat"><div class="set-stat-num">' + recvCount + '</div><div class="set-stat-lbl">Received</div></div>' +
    '</div>' +
    '<div class="set-sec-title">Configurations</div>' +
    '<div class="acc-item" id="accPersona">' +
        '<div class="set-row">' +
            '<div class="set-row-icon" style="background:rgba(21,21,21,0.04);">' +
                '<svg viewBox="0 0 24 24" style="stroke:#151515;"><path d="M12 2a5 5 0 0 0-5 5v2a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"/><path d="M19 14v1a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-1"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="9" y1="22" x2="15" y2="22"/></svg>' +
            '</div>' +
            '<div class="set-row-text"><div class="set-row-name">Entity Persona</div><div class="set-row-sub">Edit AI behavior and context</div></div>' +
            '<div class="set-row-arrow"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></div>' +
        '</div>' +
        '<div class="acc-body"><div class="acc-inner" onclick="event.stopPropagation()">' +
            '<div class="edit-area-wrap"><textarea id="cdPersonaEdit" placeholder="Define the entity\'s personality...">' + (ent.persona || '') + '</textarea></div>' +
            '<button class="btn-save" id="cdPersonaSave">Save Persona</button>' +
        '</div></div>' +
    '</div>' +
    '<div class="acc-item" id="accMask">' +
        '<div class="set-row">' +
            '<div class="set-row-icon" style="background:rgba(21,21,21,0.04);">' +
                '<svg viewBox="0 0 24 24" style="stroke:#151515;"><circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/></svg>' +
            '</div>' +
            '<div class="set-row-text"><div class="set-row-name">My Identity Mask</div><div class="set-row-sub">Switch active user persona</div></div>' +
            '<div class="set-row-arrow"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></div>' +
        '</div>' +
        '<div class="acc-body"><div class="acc-inner" onclick="event.stopPropagation()">' +
            '<div class="mask-list" id="cdSettingsMaskList">' + maskListHtml + '</div>' +
        '</div></div>' +
    '</div>' +
    '<div class="set-sec-title" style="margin-top:10px;">Operations</div>' +
    '<div>' +
        '<div class="action-row" id="cdSetPin">' +
            '<div class="set-row-icon" style="background:rgba(21,21,21,0.04);"><svg viewBox="0 0 24 24" style="stroke:#151515;"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></div>' +
            '<div class="set-row-text"><div class="set-row-name">' + (ent.pinned ? 'Unpin Chat' : 'Pin Chat') + '</div><div class="set-row-sub">' + (ent.pinned ? 'Remove from top' : 'Keep this conversation on top') + '</div></div>' +
        '</div>' +
        '<div class="action-row" id="cdSetApiKey">' +
            '<div class="set-row-icon" style="background:rgba(21,21,21,0.04);"><svg viewBox="0 0 24 24" style="stroke:#151515;"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg></div>' +
            '<div class="set-row-text"><div class="set-row-name">API Configuration</div><div class="set-row-sub">Manage LLM parameters</div></div>' +
        '</div>' +
        (ent.avatar ? '<div class="action-row" id="cdSetRemoveAvatar">' +
            '<div class="set-row-icon" style="background:rgba(21,21,21,0.04);"><svg viewBox="0 0 24 24" style="stroke:#151515;"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></div>' +
            '<div class="set-row-text"><div class="set-row-name">Remove Avatar</div><div class="set-row-sub">Reset to default initial</div></div>' +
        '</div>' : '') +
        '<div class="action-row" id="cdSetClear">' +
            '<div class="set-row-icon" style="background:rgba(21,21,21,0.04);"><svg viewBox="0 0 24 24" style="stroke:#151515;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></div>' +
            '<div class="set-row-text"><div class="set-row-name">Clear History</div><div class="set-row-sub">Delete all messages</div></div>' +
        '</div>' +
        '<div class="action-row action-danger" id="cdSetDelete">' +
            '<div class="set-row-icon" style="background:rgba(166,52,38,0.06);"><svg viewBox="0 0 24 24" style="stroke:#A63426;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></div>' +
            '<div class="set-row-text"><div class="set-row-name">Delete Entity</div><div class="set-row-sub">Irreversible action</div></div>' +
        '</div>' +
    '</div>';
}
function buildApiModalHTML() {
    var bowSvg = '<svg viewBox="0 0 64 64"><path class="sk" d="M30 18 C30 15, 34 15, 34 18 C34 21, 30 21, 30 18 Z"/><path d="M30 18 C12 6, 2 24, 29 20"/><path d="M34 18 C52 6, 62 24, 35 20"/><path d="M31 20 C28 32, 40 42, 22 58"/><path d="M33 20 C38 30, 26 45, 42 60"/></svg>';

    return '' +
    '<div class="api-overlay" id="cdApiOverlay">' +
        '<div class="api-modal">' +
            '<div class="api-sig-wm">Studio White</div>' +

            '<header class="api-header">' +
                '<div class="api-lace">' +
                    '<div class="api-lace-line"></div>' +
                    '<div class="api-knot ak1">' + bowSvg + '</div>' +
                    '<div class="api-knot ak2">' + bowSvg + '</div>' +
                    '<div class="api-knot ak3">' + bowSvg + '</div>' +
                '</div>' +
                '<h2 class="api-title">Config<span>.</span></h2>' +
            '</header>' +

            '<div class="api-sw-wrap">' +
                '<div class="api-sw" id="cdApiSwitch" data-node="primary">' +
                    '<div class="api-sw-slider"></div>' +
                    '<div class="api-sw-label asl-p">Primary</div>' +
                    '<div class="api-sw-label asl-b">Backup</div>' +
                '</div>' +
            '</div>' +

            '<div class="api-acc" data-num="01">' +
                '<div class="api-acc-hd" id="cdApiAcc1">' +
                    '<div class="api-acc-main"><div class="api-acc-num">01.</div><div class="api-acc-sig">Connection <span class="api-acc-cn">/. 连接设置</span></div></div>' +
                    '<i class="api-acc-arrow">&#9654;</i>' +
                '</div>' +
                '<div class="api-acc-body">' +
                    '<div class="api-field"><label>Endpoint</label><input type="text" id="cdApiEndpoint" value="https://api.openai.com/v1"></div>' +
                    '<div class="api-field"><label>API Key</label><input type="password" id="cdApiKey" placeholder="sk-..."></div>' +
                '</div>' +
            '</div>' +

            '<div class="api-acc" data-num="02">' +
                '<div class="api-acc-hd" id="cdApiAcc2">' +
                    '<div class="api-acc-main"><div class="api-acc-num">02.</div><div class="api-acc-sig">System Prompt <span class="api-acc-cn">/. 系统指令</span></div></div>' +
                    '<i class="api-acc-arrow">&#9654;</i>' +
                '</div>' +
                '<div class="api-acc-body">' +
                    '<div class="api-field"><label>Instructions</label><textarea id="cdApiPrompt" placeholder="Define AI behavior..."></textarea></div>' +
                '</div>' +
            '</div>' +

            '<div class="api-acc open" data-num="03">' +
                '<div class="api-acc-hd" id="cdApiAcc3">' +
                    '<div class="api-acc-main"><div class="api-acc-num">03.</div><div class="api-acc-sig">Model <span class="api-acc-cn">/. 模型选择</span></div></div>' +
                    '<i class="api-acc-arrow">&#9654;</i>' +
                '</div>' +
                '<div class="api-acc-body">' +
                    '<div style="display:flex;gap:6px;margin-bottom:8px;">' +
                        '<button class="api-btn api-btn-reset" id="cdApiFetchModels" style="flex:1;padding:8px;font-size:8px;">Fetch Models</button>' +
                    '</div>' +
                    '<div class="api-field" style="margin-bottom:8px;">' +
                        '<label>Or type model ID manually</label>' +
                        '<input type="text" id="cdApiModelManual" placeholder="e.g. gpt-4o, claude-3-5-sonnet...">' +
                    '</div>' +
                    '<div class="api-models" id="cdApiModels"></div>' +
                    '<div id="cdApiModelStatus" style="font-size:9px;color:rgba(21,21,21,0.35);text-align:center;padding:4px 0;"></div>' +
                '</div>' +
            '</div>' +

            '<footer class="api-footer">' +
                '<button class="api-btn api-btn-reset" id="cdApiReset">Reset</button>' +
                '<button class="api-btn api-btn-save" id="cdApiSave">Apply Sync</button>' +
            '</footer>' +
        '</div>' +
    '</div>';
}
