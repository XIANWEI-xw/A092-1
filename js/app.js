// js/app.js · A0nynx_3i
// 框架已就绪，内容从 page1 开始填

window.onload = function () {
    updateClock();
    setInterval(updateClock, 1000);
    initDesktopSwiper();
    renderPage1();
    // 预热存储缓存，后续所有读取走内存
    ChatDB.warmup(function () {
        console.log('✅ A0nynx_3i 启动 · 存储缓存就绪');
    });
};

/* ── 时钟 ── */
function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const el = document.getElementById('desktop-clock');
    if (el) el.innerText = `${h}:${m}`;
}

/* ── 分页滑动 ── */
function initDesktopSwiper() {
    const swiper = document.getElementById('swiper');
    const dot1   = document.getElementById('dot1');
    const dot2   = document.getElementById('dot2');
    if (!swiper) return;

    swiper.addEventListener('scroll', () => {
        const ratio = swiper.scrollLeft / swiper.clientWidth;
        dot1.classList.toggle('active', ratio < 0.5);
        dot2.classList.toggle('active', ratio >= 0.5);
    }, { passive: true });
}

/* ── Page 1 内容渲染 ── */
function renderPage1() {
    const page = document.getElementById('page1');
    if (!page) return;

    page.innerHTML = `
        <style>
            .texture-noise {
                position: absolute; inset: 0; z-index: 1; pointer-events: none;
                background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.02'/%3E%3C/svg%3E");
            }
            .architectural-light {
                position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                z-index: 0; pointer-events: none;
                background: linear-gradient(105deg, rgba(255,255,255,0) 20%, rgba(255,255,255,0.9) 35%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.9) 65%, rgba(255,255,255,0) 80%);
                filter: blur(25px);
                animation: light-drift 20s ease-in-out infinite alternate;
            }
            @keyframes light-drift {
                0% { transform: translateY(-10%) translateX(-10%) rotate(0deg); }
                100% { transform: translateY(10%) translateX(10%) rotate(5deg); }
            }
            .bg-watermark {
                position: absolute; top: 35%; left: -15%;
                font-family: 'Playfair Display', serif; font-size: 220px; font-weight: 900; font-style: italic;
                color: rgba(21, 21, 23, 0.02); z-index: 2; pointer-events: none;
                transform: rotate(-90deg) translateY(-50%); letter-spacing: -5px;
            }
        </style>

        <!-- 背景层（跟随页面） -->
        <div class="architectural-light"></div>
        <div class="texture-noise"></div>
        <div class="bg-watermark">Aesthetic</div>

        <!-- Editorial 日期组件 -->
        <div class="widget-editorial" style="margin-top:80px;">
            <div class="date-watermark-signature">Signature</div>
            <div class="widget-date">24 <span>Nov.</span></div>
            <div class="widget-date" style="font-size:28px;color:#555;margin-top:-2px;">Friday</div>
            <div class="widget-sub">
                <span>Vol. 01 / Paris</span>
                <div class="barcode"></div>
            </div>
            <div class="signature-break">Avant-Garde</div>
        </div>

        <!-- 门票 Music Card -->
        <div class="ticket-wrapper">
            <div class="ticket-body">
                <div class="ticket-accent-bar"></div>
                <div class="ticket-left">
                    <div class="t-header">
                        <span class="t-badge">PLAYING</span>
                        <span class="t-id">TKT. #001</span>
                    </div>
                    <div class="t-title">Nocturne in E-flat</div>
                    <div class="t-artist">Frederic Chopin</div>
                    <div class="t-progress-wrapper">
                        <span class="t-time">02:14</span>
                        <div class="t-bar">
                            <div class="t-bar-fill"></div>
                            <div class="t-bar-dot"></div>
                        </div>
                    </div>
                </div>
                <div class="ticket-tear-line"></div>
                <div class="ticket-right">
                    <div class="t-vinyl">
                        <div class="t-label"><div class="t-hole"></div></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 分割线 -->
        <div class="ticket-divider"></div>

        <!-- App 图标网格 -->
        <div class="app-grid">
            <div class="app-item" onclick="if(window.openChatApp) window.openChatApp();">
                <div class="app-icon light">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--icon-color)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 9.5a6.5 6.5 0 0 0-11.8-3.4 6.5 6.5 0 0 0-1.7 6.4L2 16l3.5-1.1A6.5 6.5 0 0 0 17 9.5Z" fill="rgba(28,28,30,0.08)" stroke="none"/>
                        <path d="M21 13.5a6.5 6.5 0 0 1-1.7 4.4L22 21l-3.5-1.1a6.5 6.5 0 1 1 2.5-6.4Z"/>
                    </svg>
                </div>
                <span class="app-label">Chat</span>
            </div>
            <div class="app-item" onclick="if(window.openWorldBook) window.openWorldBook();">
                <div class="app-icon dark">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M7 3h10a1 1 0 0 1 1 1v8H6V4a1 1 0 0 1 1-1z" fill="rgba(255,255,255,0.15)" stroke="none"/>
                        <path d="M4 5h5l2 2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="rgba(255,255,255,0.05)"/>
                        <path d="M2 12.5l20-3v8.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5.5z"/>
                    </svg>
                </div>
                <span class="app-label">Folder</span>
            </div>
            <div class="app-item" onclick="if(window.openSettingsHub) window.openSettingsHub();">
                <div class="app-icon light">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--icon-color)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="6" y1="20" x2="6" y2="4" stroke-opacity="0.3"/>
                        <line x1="12" y1="20" x2="12" y2="4" stroke-opacity="0.3"/>
                        <line x1="18" y1="20" x2="18" y2="4" stroke-opacity="0.3"/>
                        <rect x="3" y="12" width="6" height="4" rx="1" fill="rgba(28,28,30,0.1)"/>
                        <rect x="9" y="6" width="6" height="4" rx="1" fill="rgba(28,28,30,0.1)"/>
                        <rect x="15" y="14" width="6" height="4" rx="1" fill="rgba(28,28,30,0.1)"/>
                    </svg>
                </div>
                <span class="app-label">Config</span>
            </div>
            <div class="app-item" onclick="if(window.openLensApp) window.openLensApp();">
                <div class="app-icon dark">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="6" width="18" height="12" rx="3" fill="rgba(255,255,255,0.08)"/>
                        <circle cx="12" cy="12" r="3.5"/>
                        <circle cx="12" cy="12" r="1.5"/>
                    </svg>
                </div>
                <span class="app-label">Lens</span>
            </div>
            <div class="app-item">
                <div class="app-icon light">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--icon-color)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="4" y="4" width="12" height="12" rx="2" fill="rgba(28,28,30,0.15)" stroke="none"/>
                        <rect x="8" y="8" width="12" height="12" rx="2" fill="var(--glass-panel)"/>
                        <path d="M8 16l3-3 2 2 3-3 2 2"/>
                    </svg>
                </div>
                <span class="app-label">Gallery</span>
            </div>
            <div class="app-item">
                <div class="app-icon dark">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="3" x2="12" y2="4"/>
                        <line x1="12" y1="20" x2="12" y2="21"/>
                        <line x1="3" y1="12" x2="4" y2="12"/>
                        <line x1="20" y1="12" x2="21" y2="12"/>
                        <circle cx="12" cy="12" r="1.5" fill="rgba(255,255,255,0.8)"/>
                        <line x1="12" y1="12" x2="12" y2="7"/>
                        <line x1="12" y1="12" x2="15.5" y2="13.5"/>
                    </svg>
                </div>
                <span class="app-label">Time</span>
            </div>
            <div class="app-item">
                <div class="app-icon dark">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
                        <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" fill="rgba(255,255,255,0.08)"/>
                        <line x1="9" y1="13" x2="15" y2="13"/>
                        <line x1="9" y1="17" x2="13" y2="17"/>
                    </svg>
                </div>
                <span class="app-label">Notes</span>
            </div>
            <div class="app-item">
                <div class="app-icon light">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--icon-color)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 3c0 4.5-4.5 9-9 9 4.5 0 9 4.5 9 9 0-4.5 4.5-9 9-9-4.5 0-9-4.5-9-9z" fill="rgba(28,28,30,0.08)"/>
                    </svg>
                </div>
                <span class="app-label">Idea</span>
            </div>
        </div>

        <!-- Dock 栏 -->
        <div class="dock-bar">
            <div class="dock-item">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <defs>
                        <linearGradient id="g-phone" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                            <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.95"/>
                            <stop offset="100%" stop-color="#888888" stop-opacity="0.55"/>
                        </linearGradient>
                    </defs>
                    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.57 21 3 13.43 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.26.2 2.47.57 3.6.1.33.03.7-.24.97L6.6 10.8z"
                          fill="url(#g-phone)" stroke="rgba(255,255,255,0.2)" stroke-width="0.4"/>
                </svg>
            </div>
            <div class="dock-sep"></div>
            <div class="dock-item" id="dockChatApp" onclick="openChatApp()">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <defs>
                        <linearGradient id="g-mail-bg" x1="2" y1="5" x2="22" y2="19" gradientUnits="userSpaceOnUse">
                            <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.14"/>
                            <stop offset="100%" stop-color="#ffffff" stop-opacity="0.04"/>
                        </linearGradient>
                        <linearGradient id="g-mail-v" x1="2" y1="6" x2="22" y2="14" gradientUnits="userSpaceOnUse">
                            <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.95"/>
                            <stop offset="100%" stop-color="#aaaaaa" stop-opacity="0.5"/>
                        </linearGradient>
                    </defs>
                    <rect x="2" y="5" width="20" height="15" rx="2.5"
                          fill="url(#g-mail-bg)" stroke="rgba(255,255,255,0.22)" stroke-width="0.8"/>
                    <path d="M2 7.5 L12 14 L22 7.5"
                          stroke="url(#g-mail-v)" stroke-width="1.15"
                          stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <div class="dock-sep"></div>
            <div class="dock-item">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <defs>
                        <linearGradient id="g-pin" x1="6" y1="2" x2="18" y2="17" gradientUnits="userSpaceOnUse">
                            <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.92"/>
                            <stop offset="100%" stop-color="#777777" stop-opacity="0.55"/>
                        </linearGradient>
                    </defs>
                    <path d="M12 2C8.69 2 6 4.69 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.31-2.69-6-6-6z"
                          fill="url(#g-pin)" stroke="rgba(255,255,255,0.18)" stroke-width="0.5"/>
                    <circle cx="12" cy="8" r="2.4"
                            fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
                </svg>
            </div>
            <div class="dock-sep"></div>
            <div class="dock-item" id="dockSettings" onclick="openSettingsHub()">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <defs>
                        <linearGradient id="g-gear"
 x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                            <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.9"/>
                            <stop offset="100%" stop-color="#888888" stop-opacity="0.5"/>
                        </linearGradient>
                    </defs>
                    <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58z"
                          fill="rgba(255,255,255,0.07)" stroke="url(#g-gear)" stroke-width="0.9" stroke-linejoin="round"/>
                    <circle cx="12" cy="12" r="3"
                            fill="rgba(0,0,0,0.45)" stroke="url(#g-gear)" stroke-width="0.9"/>
                </svg>
            </div>
        </div>
    `;
}
