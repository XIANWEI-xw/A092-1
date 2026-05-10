// js/worldbook-app.js · A0nynx_3i World Book
(function () {
    'use strict';

    var built = false;

    /* ══════════════════════════════════════
       Storage
    ══════════════════════════════════════ */
    function loadBooks() {
        try { return JSON.parse(localStorage.getItem('wb-books') || '[]'); } catch(e) { return []; }
    }
    function saveBooks(b) { localStorage.setItem('wb-books', JSON.stringify(b)); }
    function loadEntries() {
        try { return JSON.parse(localStorage.getItem('wb-entries') || '[]'); } catch(e) { return []; }
    }
    function saveEntries(e) { localStorage.setItem('wb-entries', JSON.stringify(e)); }

    var books   = [];
    var entries = [];

    /* ══════════════════════════════════════
       Injection helper
       位置映射到聊天系统中 system prompt 组装点
    ══════════════════════════════════════ */
    window.WB = {
        /* 返回给定 entId 在本次对话中应注入的文本，按 position+depth 排序 */
        getInjection: function (entId, position) {
            var relevant = entries.filter(function(e) {
                return e.enabled && e.charIds && e.charIds.indexOf(entId) !== -1
                    && e.position === position;
            });
            relevant.sort(function(a,b){ return (a.insertionOrder||0)-(b.insertionOrder||0); });
            return relevant.map(function(e){ return e.content; }).join('\n\n');
        },
        /* 注入到 buildSystemPrompt 前调用 */
        injectBefore: function(entId) { return this.getInjection(entId, 'before_char'); },
        injectAfter:  function(entId) { return this.getInjection(entId, 'after_char');  },
        injectEnd:    function(entId) { return this.getInjection(entId, 'after_prompt');}
    };

    /* ══════════════════════════════════════
       CSS
    ══════════════════════════════════════ */
    function buildCSS() {
        return [
            '#wbApp{position:fixed;inset:0;z-index:180;font-family:"Space Grotesk",sans-serif;display:flex;flex-direction:column;overflow:hidden}',
            '#wbApp.hidden{display:none}',

            /* vars */
            '#wbApp{--ink:#1a1c1e;--ink70:rgba(26,28,30,.70);--ink45:rgba(26,28,30,.45);--ink20:rgba(26,28,30,.20);--ink10:rgba(26,28,30,.10);--ink05:rgba(26,28,30,.05);--red:#7a2a20;--reddim:rgba(122,42,32,.10);--glass:rgba(238,240,242,.78);--panel:rgba(248,249,250,.96);--bd:rgba(26,28,30,.11);--sh:0 2px 16px rgba(26,28,30,.06),0 1px 3px rgba(26,28,30,.04);--rlg:22px;--rmd:14px;--rsm:10px;--tr:all .38s cubic-bezier(.16,1,.3,1)}',

            /* bg */
            '#wbApp .wb-bg{position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse at 15% 8%,rgba(122,42,32,.045) 0%,transparent 42%),radial-gradient(ellipse at 88% 85%,rgba(26,28,30,.028) 0%,transparent 42%),linear-gradient(168deg,#eff1f3 0%,#e8eaec 100%)}',
            '#wbApp .wb-noise{position:absolute;inset:0;z-index:0;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.82\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'.016\'/%3E%3C/svg%3E")}',

            /* watermarks */
            '#wbApp .wb-wm-layer{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}',
            '#wbApp .wm{position:absolute;font-family:"Playfair Display",serif;font-style:italic;color:rgba(26,28,30,.028);letter-spacing:-3px;white-space:nowrap;line-height:1}',
            '#wbApp .wm1{font-size:180px;top:12%;left:-5%;transform:rotate(-6deg)}',
            '#wbApp .wm2{font-size:110px;top:52%;right:-2%;transform:rotate(8deg);letter-spacing:-2px;color:rgba(26,28,30,.022)}',
            '#wbApp .wm3{font-size:240px;bottom:-8%;left:-10%;transform:rotate(-3deg);color:rgba(26,28,30,.018)}',
            '#wbApp .wmen{position:absolute;font-family:"IM Fell English",serif;font-style:italic;color:rgba(26,28,30,.032);white-space:nowrap;line-height:1.2}',
            '#wbApp .wmen1{font-size:13px;top:22%;left:4%;letter-spacing:2px;transform:rotate(-90deg);transform-origin:left top}',
            '#wbApp .wmen2{font-size:11px;bottom:30%;right:5%;letter-spacing:1.5px;transform:rotate(90deg);transform-origin:right top;color:rgba(26,28,30,.025)}',
            '#wbApp .wmen3{font-size:9px;top:65%;left:50%;letter-spacing:3px;color:rgba(26,28,30,.020)}',
            '#wbApp .wmen4{font-size:10px;top:8%;right:18%;letter-spacing:2px}',

            /* sig strip */
            '#wbApp .wb-sig{position:absolute;bottom:0;right:0;top:0;width:28px;z-index:1;pointer-events:none;display:flex;flex-direction:column;align-items:center;padding:90px 0 80px}',
            '#wbApp .slt{flex:1;width:1px;background:linear-gradient(to bottom,transparent,rgba(122,42,32,.18),rgba(122,42,32,.25))}',
            '#wbApp .slb{flex:1;width:1px;background:linear-gradient(to top,transparent,rgba(122,42,32,.18),rgba(122,42,32,.22))}',
            '#wbApp .sig-txt{font-family:"Playfair Display",serif;font-style:italic;font-size:11px;color:rgba(122,42,32,.52);letter-spacing:3px;writing-mode:vertical-rl;padding:16px 0;-webkit-font-smoothing:antialiased;filter:drop-shadow(0 0 6px rgba(122,42,32,.15))}',
            '#wbApp .sig-dot{width:3px;height:3px;border-radius:50%;background:rgba(122,42,32,.35)}',
            '#wbApp .wb-left-strip{position:absolute;left:0;top:0;bottom:0;width:3px;z-index:1;pointer-events:none;background:linear-gradient(to bottom,transparent 0%,rgba(122,42,32,.06) 20%,rgba(122,42,32,.22) 50%,rgba(122,42,32,.06) 80%,transparent 100%)}',

            /* status bar */
            '#wbApp .wb-sb{position:relative;z-index:10;height:44px;padding:0 36px 0 18px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}',
            '#wbApp .wb-time{font-family:"Syncopate",sans-serif;font-size:12px;font-weight:700;color:var(--ink);letter-spacing:1px}',
            '#wbApp .wb-sb-icons{display:flex;gap:5px;align-items:center}',
            '#wbApp .wb-sb-icons svg{width:15px;height:15px}',

            /* header */
            '#wbApp .wb-hdr{position:relative;z-index:10;padding:2px 36px 14px 18px;flex-shrink:0}',
            '#wbApp .wb-hdr-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}',
            '#wbApp .wb-back{width:36px;height:36px;border-radius:50%;background:var(--glass);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--bd);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:var(--sh);transition:var(--tr)}',
            '#wbApp .wb-back:active{transform:scale(.88)}',
            '#wbApp .wb-back svg{width:16px;height:16px;stroke:var(--ink70);fill:none;stroke-width:1.8;stroke-linecap:round}',
            '#wbApp .wb-badge{font-family:"Syncopate",sans-serif;font-size:8px;letter-spacing:2px;color:var(--ink45);text-transform:uppercase;background:var(--glass);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--bd);border-radius:50px;padding:5px 12px;box-shadow:var(--sh)}',
            '#wbApp .wb-action{width:36px;height:36px;border-radius:50%;background:var(--ink);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 14px rgba(26,28,30,.20);transition:var(--tr)}',
            '#wbApp .wb-action:active{transform:scale(.88)}',
            '#wbApp .wb-action svg{width:15px;height:15px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round}',

            '#wbApp .wb-plaque-wrap{padding:0 4px;display:flex;align-items:flex-start;gap:12px}',
            '#wbApp .wb-wire-wrap{display:flex;flex-direction:column;align-items:center;padding-top:2px;gap:2px}',
            '#wbApp .wb-wire-line{width:1px;height:18px;background:linear-gradient(to bottom,rgba(122,42,32,.25),rgba(122,42,32,.08))}',
            '#wbApp .wb-plaque{flex:1;border-left:2.5px solid rgba(122,42,32,.40);padding-left:12px}',
            '#wbApp .wb-eyebrow{font-family:"Syncopate",sans-serif;font-size:7px;letter-spacing:3px;color:var(--ink45);text-transform:uppercase;margin-bottom:4px}',
            '#wbApp .wb-title{font-family:"Playfair Display",serif;font-size:26px;font-style:italic;color:var(--ink);line-height:1;-webkit-font-smoothing:antialiased;display:flex;align-items:baseline;gap:10px}',
            '#wbApp .wb-title-sig{font-family:"Playfair Display",serif;font-style:italic;font-size:13px;color:rgba(122,42,32,.55);letter-spacing:2px;filter:drop-shadow(0 0 4px rgba(122,42,32,.12))}',
            '#wbApp .wb-subtitle{font-family:"Cormorant Garamond",serif;font-size:13px;font-style:italic;color:var(--ink45);margin-top:3px;letter-spacing:.3px}',

            /* tabs */
            '#wbApp .wb-tab-wrap{position:relative;z-index:10;padding:0 36px 12px 18px;flex-shrink:0}',
            '#wbApp .wb-tabs{display:flex;gap:5px;background:rgba(26,28,30,.06);border-radius:50px;padding:3px}',
            '#wbApp .wb-tab{flex:1;padding:8px 0;border-radius:50px;text-align:center;font-family:"Space Grotesk",sans-serif;font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:var(--ink45);cursor:pointer;transition:var(--tr)}',
            '#wbApp .wb-tab.active{background:var(--panel);color:var(--ink);box-shadow:0 2px 8px rgba(26,28,30,.08)}',

            /* body */
            '#wbApp .wb-body{flex:1;overflow-y:auto;padding:0 52px 120px 18px;position:relative;z-index:5;scrollbar-width:none}',
            '#wbApp .wb-body::-webkit-scrollbar{display:none}',

            /* section label */
            '#wbApp .sec-lbl{display:flex;align-items:center;gap:10px;margin:18px 0 10px}',
            '#wbApp .sec-lbl-txt{font-family:"IM Fell English",serif;font-style:italic;font-size:11px;color:var(--ink45);letter-spacing:2px;white-space:nowrap}',
            '#wbApp .sec-lbl-line{flex:1;height:1px;background:var(--ink10)}',
            '#wbApp .sec-lbl-num{font-family:"Syncopate",sans-serif;font-size:8px;letter-spacing:1px;color:var(--ink45)}',

            /* entry icon with conic ring */
            '#wbApp .e-icon{width:44px;height:44px;border-radius:var(--rsm);flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;background:rgba(26,28,30,.09)}',
            '#wbApp .e-icon::before{content:"";position:absolute;inset:0;border-radius:inherit;background:conic-gradient(from 0deg,rgba(26,28,30,.55) 0deg,rgba(26,28,30,.55) 30deg,transparent 30deg,transparent 50deg,rgba(26,28,30,.40) 50deg,rgba(26,28,30,.40) 75deg,transparent 75deg,transparent 100deg,rgba(26,28,30,.60) 100deg,rgba(26,28,30,.60) 140deg,transparent 140deg,transparent 170deg,rgba(26,28,30,.35) 170deg,rgba(26,28,30,.35) 200deg,transparent 200deg,transparent 230deg,rgba(26,28,30,.55) 230deg,rgba(26,28,30,.55) 270deg,transparent 270deg,transparent 300deg,rgba(26,28,30,.42) 300deg,rgba(26,28,30,.42) 340deg,transparent 340deg,transparent 360deg);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;padding:1px;border-radius:inherit}',
            '#wbApp .e-icon img{width:100%;height:100%;object-fit:cover;position:relative;z-index:1}',
            '#wbApp .e-icon-letter{font-family:"Playfair Display",serif;font-size:18px;font-style:italic;color:rgba(26,28,30,.75);position:relative;z-index:1}',

            /* entry card */
            '#wbApp .e-card{background:var(--panel);border-radius:var(--rlg);border:1px solid var(--bd);margin-bottom:9px;overflow:hidden;box-shadow:var(--sh);transition:var(--tr);cursor:pointer}',
            '#wbApp .e-card:active{transform:scale(.984)}',
            '#wbApp .e-head{padding:15px 16px;display:flex;align-items:flex-start;gap:12px}',
            '#wbApp .e-main{flex:1;min-width:0}',
            '#wbApp .e-name{font-family:"Space Grotesk",sans-serif;font-size:13px;font-weight:700;color:var(--ink);letter-spacing:.2px;margin-bottom:3px;display:flex;align-items:center;gap:7px;flex-wrap:wrap}',
            '#wbApp .e-name-txt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
            '#wbApp .e-tag{font-family:"Syncopate",sans-serif;font-size:7px;letter-spacing:1px;padding:2px 7px;border-radius:50px;text-transform:uppercase;flex-shrink:0}',
            '#wbApp .tag-before{background:var(--reddim);color:var(--red)}',
            '#wbApp .tag-after{background:rgba(26,28,30,.07);color:var(--ink45)}',
            '#wbApp .tag-char{background:rgba(50,80,160,.08);color:#3450a0}',
            '#wbApp .tag-world{background:rgba(70,50,130,.08);color:#4a3282}',
            '#wbApp .e-kw{font-family:"Space Grotesk",sans-serif;font-size:11px;color:var(--ink45);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:4px}',
            '#wbApp .e-prev{font-family:"Noto Serif SC",serif;font-size:12px;color:var(--ink45);line-height:1.65;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
            '#wbApp .e-right{display:flex;flex-direction:column;align-items:flex-end;gap:9px;flex-shrink:0}',
            '#wbApp .e-toggle{width:36px;height:20px;border-radius:10px;background:var(--ink20);position:relative;cursor:pointer;transition:background .22s}',
            '#wbApp .e-toggle.on{background:var(--ink)}',
            '#wbApp .e-toggle::after{content:"";position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.14);transition:transform .25s cubic-bezier(.16,1,.3,1)}',
            '#wbApp .e-toggle.on::after{transform:translateX(16px)}',
            '#wbApp .e-depth{font-family:"Syncopate",sans-serif;font-size:7px;letter-spacing:1px;color:var(--ink45);text-transform:uppercase;text-align:right;white-space:nowrap}',

            /* expanded body */
            '#wbApp .e-body{padding:0 16px;max-height:0;overflow:hidden;transition:max-height .45s cubic-bezier(.16,1,.3,1),padding .3s}',
            '#wbApp .e-body.open{max-height:380px;padding:0 16px 15px}',
            '#wbApp .e-content::-webkit-scrollbar{display:none}',
            '#wbApp .e-div{height:1px;background:var(--ink05);margin-bottom:13px}',
            '#wbApp .e-content{font-family:"Noto Serif SC",serif;font-size:12px;color:var(--ink70);line-height:1.9;letter-spacing:.2px;margin-bottom:13px}',
            '#wbApp .e-meta-row{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}',
            '#wbApp .e-pill{display:inline-flex;align-items:center;gap:5px;background:var(--ink05);border:1px solid var(--ink10);border-radius:50px;padding:4px 10px;font-family:"Space Grotesk",sans-serif;font-size:10px;color:var(--ink45);font-weight:500}',
            '#wbApp .e-pill svg{width:11px;height:11px;stroke:var(--ink45);fill:none;stroke-width:1.8;flex-shrink:0}',
            '#wbApp .e-acts{display:flex;gap:6px}',
            '#wbApp .ea-btn{flex:1;padding:9px 0;border-radius:var(--rsm);border:1px solid var(--bd);background:transparent;font-family:"Space Grotesk",sans-serif;font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--ink45);cursor:pointer;transition:var(--tr);text-align:center}',
            '#wbApp .ea-btn:active{transform:scale(.95)}',
            '#wbApp .ea-btn.primary{background:var(--ink);color:#fff;border-color:var(--ink)}',
            '#wbApp .ea-btn.danger{border-color:rgba(122,42,32,.22);color:var(--red)}',

            /* char card */
            '#wbApp .c-card{background:var(--panel);border-radius:var(--rlg);border:1px solid var(--bd);margin-bottom:9px;box-shadow:var(--sh);padding:15px 16px;display:flex;align-items:center;gap:13px;cursor:pointer;transition:var(--tr)}',
            '#wbApp .c-card:active{transform:scale(.984)}',
            '#wbApp .c-av{width:44px;height:44px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#2a2c2e,#42464a);display:flex;align-items:center;justify-content:center;font-family:"Playfair Display",serif;font-size:18px;font-style:italic;color:#fff;position:relative}',
            '#wbApp .c-av::before{content:"";position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 20deg,rgba(255,255,255,.55) 0deg,rgba(255,255,255,.55) 28deg,transparent 28deg,transparent 55deg,rgba(255,255,255,.38) 55deg,rgba(255,255,255,.38) 85deg,transparent 85deg,transparent 120deg,rgba(255,255,255,.60) 120deg,rgba(255,255,255,.60) 158deg,transparent 158deg,transparent 195deg,rgba(255,255,255,.32) 195deg,rgba(255,255,255,.32) 228deg,transparent 228deg,transparent 268deg,rgba(255,255,255,.52) 268deg,rgba(255,255,255,.52) 308deg,transparent 308deg,transparent 360deg);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;padding:1.2px}',
            '#wbApp .c-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;z-index:1}',
            '#wbApp .c-info{flex:1;min-width:0}',
            '#wbApp .c-name{font-family:"Space Grotesk",sans-serif;font-size:13px;font-weight:700;color:var(--ink);margin-bottom:3px}',
            '#wbApp .c-books{font-family:"Space Grotesk",sans-serif;font-size:11px;color:var(--ink45)}',
            '#wbApp .c-right{display:flex;flex-direction:column;align-items:flex-end;gap:7px}',
            '#wbApp .c-count{font-family:"Syncopate",sans-serif;font-size:9px;font-weight:700;color:var(--ink);background:var(--ink05);border-radius:50px;padding:4px 10px}',

            /* char book picker (expanded) */
            '#wbApp .c-bk-pick{padding:0 16px;max-height:0;overflow:hidden;transition:max-height .4s cubic-bezier(.16,1,.3,1),padding .3s}',
            '#wbApp .c-bk-pick.open{max-height:400px;padding:0 16px 14px}',
            '#wbApp .c-bk-div{height:1px;background:var(--ink05);margin-bottom:12px}',
            '#wbApp .c-bk-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--ink05)}',
            '#wbApp .c-bk-row:last-child{border-bottom:none}',
            '#wbApp .c-bk-name{font-family:"Space Grotesk",sans-serif;font-size:12px;font-weight:600;color:var(--ink)}',
            '#wbApp .c-bk-pos{font-family:"Syncopate",sans-serif;font-size:7px;letter-spacing:1px;color:var(--ink45);text-transform:uppercase;margin-top:2px}',

            /* import tab */
            '#wbApp .wb-upload{margin:0 0 12px;border:1.5px dashed var(--ink10);border-radius:var(--rmd);padding:20px;text-align:center;cursor:pointer;transition:var(--tr)}',
            '#wbApp .wb-upload:active{background:var(--ink05)}',
            '#wbApp .up-icon{margin:0 auto 9px;width:34px;height:34px;border-radius:50%;background:var(--ink05);display:flex;align-items:center;justify-content:center}',
            '#wbApp .up-icon svg{width:16px;height:16px;stroke:var(--ink70);fill:none;stroke-width:1.8;stroke-linecap:round}',
            '#wbApp .up-txt{font-family:"Space Grotesk",sans-serif;font-size:12px;color:var(--ink70);font-weight:500}',
            '#wbApp .up-sub{font-family:"Space Grotesk",sans-serif;font-size:10px;color:var(--ink45);margin-top:2px}',

            /* fab */
            '#wbApp .wb-fab{position:absolute;bottom:30px;right:20px;z-index:50;display:flex;flex-direction:column;align-items:flex-end;gap:9px}',
            '#wbApp .fab-main{width:52px;height:52px;border-radius:50%;background:var(--ink);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 28px rgba(26,28,30,.24);transition:var(--tr)}',
            '#wbApp .fab-main:active{transform:scale(.88)}',
            '#wbApp .fab-main svg{width:19px;height:19px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round}',
            '#wbApp .fab-sub{display:flex;flex-direction:column;align-items:flex-end;gap:7px;animation:wbFabIn .35s cubic-bezier(.16,1,.3,1) both}',
            '@keyframes wbFabIn{from{opacity:0;transform:translateY(14px) scale(.95)}to{opacity:1;transform:none}}',
            '#wbApp .fab-sub.hidden{display:none}',
            '#wbApp .fab-row{display:flex;align-items:center;gap:9px}',
            '#wbApp .fab-label{font-family:"Space Grotesk",sans-serif;font-size:11px;font-weight:700;letter-spacing:.4px;color:var(--ink);background:var(--glass);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--bd);border-radius:50px;padding:6px 14px;box-shadow:var(--sh);white-space:nowrap}',
            '#wbApp .fab-mini{width:40px;height:40px;border-radius:50%;background:var(--panel);display:flex;align-items:center;justify-content:center;cursor:pointer;border:1px solid var(--bd);box-shadow:var(--sh);transition:var(--tr)}',
            '#wbApp .fab-mini:active{transform:scale(.88)}',
            '#wbApp .fab-mini svg{width:16px;height:16px;stroke:var(--ink70);fill:none;stroke-width:1.8;stroke-linecap:round}',

            /* modal */
            '#wbApp .wb-modal{position:absolute;inset:0;z-index:100;background:rgba(26,28,30,.28);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:flex-end;opacity:0;pointer-events:none;transition:opacity .35s}',
            '#wbApp .wb-modal.open{opacity:1;pointer-events:auto}',
            '#wbApp .wb-sheet{width:100%;background:var(--panel);border-radius:22px 22px 0 0;padding:0 0 44px;box-shadow:0 -6px 32px rgba(26,28,30,.10);transform:translateY(100%);transition:transform .45s cubic-bezier(.16,1,.3,1);max-height:92vh;overflow-y:auto;scrollbar-width:none}',
            '#wbApp .wb-sheet::-webkit-scrollbar{display:none}',
            '#wbApp .wb-modal.open .wb-sheet{transform:translateY(0)}',
            '#wbApp .m-handle{width:34px;height:4px;border-radius:2px;background:var(--ink10);margin:13px auto 18px}',
            '#wbApp .m-hdr{padding:0 22px 18px;border-left:2.5px solid rgba(122,42,32,.38);margin:0 22px 20px}',
            '#wbApp .m-title-en{font-family:"IM Fell English",serif;font-style:italic;font-size:10px;letter-spacing:3px;color:var(--ink45);text-transform:uppercase;margin-bottom:5px}',
            '#wbApp .m-title{font-family:"Playfair Display",serif;font-size:22px;font-style:italic;color:var(--ink);display:flex;align-items:baseline;gap:10px}',
            '#wbApp .m-title-sig{font-family:"Playfair Display",serif;font-style:italic;font-size:12px;color:rgba(122,42,32,.50);letter-spacing:2px;filter:drop-shadow(0 0 4px rgba(122,42,32,.10))}',
            '#wbApp .m-sub{font-family:"Space Grotesk",sans-serif;font-size:12px;color:var(--ink45);margin-top:3px}',
            '#wbApp .m-av-pick{display:flex;align-items:center;gap:16px;margin:0 22px 20px;padding:14px 16px;background:var(--ink05);border-radius:var(--rmd);border:1px solid var(--ink10)}',
            '#wbApp .map-av{width:56px;height:56px;border-radius:var(--rsm);background:rgba(26,28,30,.09);display:flex;align-items:center;justify-content:center;font-family:"Playfair Display",serif;font-size:22px;font-style:italic;color:rgba(26,28,30,.72);flex-shrink:0;position:relative;cursor:pointer;overflow:hidden;transition:var(--tr)}',
            '#wbApp .map-av::before{content:"";position:absolute;inset:0;border-radius:inherit;background:conic-gradient(from 0deg,rgba(26,28,30,.50) 0deg,rgba(26,28,30,.50) 30deg,transparent 30deg,transparent 52deg,rgba(26,28,30,.38) 52deg,rgba(26,28,30,.38) 78deg,transparent 78deg,transparent 105deg,rgba(26,28,30,.55) 105deg,rgba(26,28,30,.55) 145deg,transparent 145deg,transparent 178deg,rgba(26,28,30,.32) 178deg,rgba(26,28,30,.32) 210deg,transparent 210deg,transparent 245deg,rgba(26,28,30,.50) 245deg,rgba(26,28,30,.50) 288deg,transparent 288deg,transparent 322deg,rgba(26,28,30,.40) 322deg,rgba(26,28,30,.40) 360deg);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;padding:1px;border-radius:inherit;z-index:2}',
            '#wbApp .map-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1}',
            '#wbApp .map-av-badge{position:absolute;inset:0;background:rgba(26,28,30,.42);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;z-index:3}',
            '#wbApp .map-av:hover .map-av-badge,#wbApp .map-av:active .map-av-badge{opacity:1}',
            '#wbApp .map-av-badge svg{width:18px;height:18px;stroke:#fff;fill:none;stroke-width:1.8}',
            '#wbApp .map-info{flex:1}',
            '#wbApp .map-lbl{font-family:"Space Grotesk",sans-serif;font-size:12px;font-weight:600;color:var(--ink);margin-bottom:3px}',
            '#wbApp .map-sub{font-family:"Space Grotesk",sans-serif;font-size:11px;color:var(--ink45)}',
            '#wbApp .map-change{padding:7px 14px;border-radius:50px;border:1px solid var(--bd);background:transparent;font-family:"Syncopate",sans-serif;font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink45);cursor:pointer;transition:var(--tr);white-space:nowrap}',
            '#wbApp .map-change:active{transform:scale(.95)}',
            '#wbApp .m-field{margin:0 22px 15px}',
            '#wbApp .m-label{font-family:"Syncopate",sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--ink45);margin-bottom:7px;display:block}',
            '#wbApp .m-input{width:100%;border:1px solid var(--bd);border-radius:var(--rsm);background:rgba(26,28,30,.04);padding:12px 14px;font-family:"Space Grotesk",sans-serif;font-size:14px;color:var(--ink);outline:none;transition:border-color .2s,background .2s}',
            '#wbApp .m-input:focus{border-color:var(--ink45);background:rgba(248,249,250,.98)}',
            '#wbApp .m-input::placeholder{color:var(--ink45)}',
            '#wbApp .m-ta{height:88px;resize:none;font-family:"Noto Serif SC",serif;font-size:13px;line-height:1.7}',
            '#wbApp .m-seg{display:flex;gap:5px;margin:0 22px 15px}',
            '#wbApp .seg-item{flex:1;padding:9px 0;border-radius:var(--rsm);text-align:center;border:1px solid var(--bd);background:transparent;cursor:pointer;font-family:"Syncopate",sans-serif;font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink45);transition:var(--tr)}',
            '#wbApp .seg-item.sel{background:var(--ink);color:#fff;border-color:var(--ink)}',
            '#wbApp .m-upload{margin:0 22px 15px;border:1.5px dashed var(--ink10);border-radius:var(--rmd);padding:20px;text-align:center;cursor:pointer;transition:var(--tr)}',
            '#wbApp .m-upload:active{background:var(--ink05)}',
            '#wbApp .m-depth{margin:0 22px 15px}',
            '#wbApp .m-depth-lbls{display:flex;justify-content:space-between;margin-bottom:6px}',
            '#wbApp .m-depth-lbl{font-family:"Syncopate",sans-serif;font-size:8px;letter-spacing:1px;color:var(--ink45);text-transform:uppercase}',
            '#wbApp .m-depth-val{font-family:"Syncopate",sans-serif;font-size:10px;font-weight:700;color:var(--ink)}',
            '#wbApp .m-slider{width:100%;height:4px;background:var(--ink10);border-radius:2px;outline:none;-webkit-appearance:none}',
            '#wbApp .m-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--ink);cursor:pointer;box-shadow:0 2px 8px rgba(26,28,30,.18)}',
            '#wbApp .m-btn{margin:18px 22px 0;width:calc(100% - 44px);padding:14px;border-radius:var(--rmd);border:none;background:var(--ink);color:#fff;font-family:"Syncopate",sans-serif;font-size:10px;letter-spacing:2px;font-weight:700;text-transform:uppercase;cursor:pointer;transition:var(--tr);display:block}',
            '#wbApp .m-btn:active{transform:scale(.97)}',

            /* toast */
            '#wbApp .wb-toast{position:absolute;bottom:100px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--ink);color:#fff;font-family:"Space Grotesk",sans-serif;font-size:11px;font-weight:600;padding:8px 18px;border-radius:50px;opacity:0;pointer-events:none;transition:all .3s;white-space:nowrap;z-index:200}',
            '#wbApp .wb-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}',

            /* empty */
            '#wbApp .wb-empty{text-align:center;padding:60px 30px}',
            '#wbApp .wb-empty-icon{width:60px;height:60px;border-radius:50%;background:var(--ink05);margin:0 auto 16px;display:flex;align-items:center;justify-content:center}',
            '#wbApp .wb-empty-icon svg{width:26px;height:26px;stroke:var(--ink45);fill:none;stroke-width:1.5;stroke-linecap:round}',
            '#wbApp .wb-empty-title{font-family:"Playfair Display",serif;font-size:18px;font-style:italic;color:var(--ink);margin-bottom:6px}',
            '#wbApp .wb-empty-sub{font-family:"Space Grotesk",sans-serif;font-size:12px;color:var(--ink45);line-height:1.6}',
        ].join('');
    }

    /* ══════════════════════════════════════
       Build HTML
    ══════════════════════════════════════ */
    function buildHTML() {
        if (!document.getElementById('wb-fonts')) {
            var lk = document.createElement('link');
            lk.id = 'wb-fonts'; lk.rel = 'stylesheet';
            lk.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@200;300;400;700&family=Syncopate:wght@400;700&family=Cormorant+Garamond:ital,wght@0,300;1,400&family=Space+Grotesk:wght@300;400;500;700&family=Playfair+Display:ital,wght@1,400;1,700&family=IM+Fell+English:ital@0;1&display=swap';
            document.head.appendChild(lk);
        }

        var el = document.createElement('div');
        el.id = 'wbApp'; el.className = 'hidden';
        el.innerHTML =
            '<style>' + buildCSS() + '</style>' +
            '<div class="wb-bg"></div>' +
            '<div class="wb-noise"></div>' +
            '<div class="wb-wm-layer">' +
                '<div class="wm wm1">Lore</div>' +
                '<div class="wm wm2">Archive</div>' +
                '<div class="wm wm3">World</div>' +
                '<div class="wmen wmen1">NARRATIVE · STRUCTURE · LORE · WORLD · CODEX</div>' +
                '<div class="wmen wmen2">ENTRIES · PERSONA · SCENARIO · DEPTH</div>' +
                '<div class="wmen wmen3">INJECTION · ORDER · KEYWORDS · BEFORE · AFTER</div>' +
                '<div class="wmen wmen4">CODEX · LORE · ARCHIVE</div>' +
            '</div>' +
            '<div class="wb-left-strip"></div>' +
            '<div class="wb-sig"><div class="slt"></div><div class="sig-dot"></div><div class="sig-txt">Lore Archive</div><div class="sig-dot"></div><div class="slb"></div></div>' +

            '<div class="wb-sb"><div class="wb-time" id="wbClock">09:41</div><div class="wb-sb-icons"><svg viewBox="0 0 24 24" fill="none"><path d="M2 22h20V2z" fill="#1a1c1e" opacity=".65"/></svg></div></div>' +

            '<div class="wb-hdr">' +
                '<div class="wb-hdr-top">' +
                    '<div class="wb-back" id="wbBackBtn"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>' +
                    '<div class="wb-badge">A0nynx_3i · Codex</div>' +
                    '<div class="wb-action" id="wbAddBtn"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>' +
                '</div>' +
                '<div class="wb-plaque-wrap">' +
                    '<div class="wb-wire-wrap"><div class="wb-wire-line"></div></div>' +
                    '<div class="wb-plaque">' +
                        '<div class="wb-eyebrow">World Book</div>' +
                        '<div class="wb-title">Lore Archive <span class="wb-title-sig">Codex</span></div>' +
                        '<div class="wb-subtitle">全局叙事结构 · 角色世界设定</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            '<div class="wb-tab-wrap">' +
                '<div class="wb-tabs">' +
                    '<div class="wb-tab active" data-tab="entries">条目</div>' +
                    '<div class="wb-tab" data-tab="chars">角色携带</div>' +
                    '<div class="wb-tab" data-tab="import">导入</div>' +
                '</div>' +
            '</div>' +

            '<div class="wb-body">' +
                '<div id="wbTabEntries"></div>' +
                '<div id="wbTabChars" style="display:none"></div>' +
                '<div id="wbTabImport" style="display:none">' +
                    '<div class="sec-lbl"><div class="sec-lbl-txt">Import Format</div><div class="sec-lbl-line"></div></div>' +
                    '<div class="wb-upload" id="wbImportUpload">' +
                        '<div class="up-icon"><svg viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg></div>' +
                        '<div class="up-txt">上传世界书文件</div>' +
                        '<div class="up-sub">.json · .txt · .md · .docx — 支持标准世界书格式</div>' +
                    '</div>' +
                    '<input type="file" id="wbImportFile" style="display:none">' +
                    '<div class="e-card" style="cursor:default">' +
                        '<div class="e-head">' +
                            '<div class="e-icon"><span class="e-icon-letter">J</span></div>' +
                            '<div class="e-main">' +
                                '<div class="e-name" style="margin-bottom:6px"><span class="e-name-txt">JSON 格式说明</span></div>' +
                                '<div class="e-prev" style="-webkit-line-clamp:4">标准世界书 JSON 字段：name（条目名）、content（内容）、keys（关键词数组）、insertion_order（插入顺序）、position（before_char / after_char / after_prompt）、depth（0–10）。</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            /* fab */
            '<div class="wb-fab">' +
                '<div class="fab-sub hidden" id="wbFabSub">' +
                    '<div class="fab-row"><div class="fab-label">新建条目</div><div class="fab-mini" id="wbFabNew"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg></div></div>' +
                    '<div class="fab-row"><div class="fab-label">从文件导入</div><div class="fab-mini" id="wbFabImport"><svg viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg></div></div>' +
                '</div>' +
                '<div class="fab-main" id="wbFabMain"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>' +
            '</div>' +

            /* modal */
            '<div class="wb-modal" id="wbModal">' +
                '<div class="wb-sheet">' +
                    '<div class="m-handle"></div>' +
                    '<div class="m-hdr">' +
                        '<div class="m-title-en" id="wbModalTitleEn">New Entry · 新建条目</div>' +
                        '<div class="m-title">Lore Entry <span class="m-title-sig">Archive</span></div>' +
                        '<div class="m-sub" id="wbModalSub">创建一个新的世界书条目</div>' +
                    '</div>' +
                    '<div class="m-av-pick">' +
                        '<div class="map-av" id="wbMapAv" onclick="document.getElementById(\'wbMapFile\').click()">' +
                            '<span class="e-icon-letter" id="wbMapLetter">W</span>' +
                            '<div class="map-av-badge"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>' +
                        '</div>' +
                        '<input type="file" id="wbMapFile" accept="image/*" style="display:none">' +
                        '<div class="map-info"><div class="map-lbl">条目头像</div><div class="map-sub">上传图片或使用字母头像</div></div>' +
                        '<div class="map-change" onclick="document.getElementById(\'wbMapFile\').click()">上传</div>' +
                    '</div>' +
                    '<div class="m-field"><label class="m-label">条目名称</label><input class="m-input" id="wbMName" placeholder="例：世界背景 / 阵营设定…" type="text"></div>' +
                    '<div class="m-field"><label class="m-label">触发关键词</label><input class="m-input" id="wbMKeys" placeholder="逗号分隔，例：世界, 背景, 设定" type="text"></div>' +
                    '<div class="m-field"><label class="m-label">条目内容</label><textarea class="m-input m-ta" id="wbMContent" placeholder="在此输入世界书内容…"></textarea></div>' +
                    '<div class="m-field"><label class="m-label" style="margin-bottom:8px">插入位置</label></div>' +
                    '<div class="m-seg" id="wbMSeg">' +
                        '<div class="seg-item sel" data-pos="before_char">提示词前</div>' +
                        '<div class="seg-item" data-pos="after_char">角色卡后</div>' +
                        '<div class="seg-item" data-pos="after_prompt">提示词后</div>' +
                    '</div>' +
                    '<div class="m-depth">' +
                        '<div class="m-depth-lbls"><span class="m-depth-lbl">插入深度</span><span class="m-depth-val" id="wbDepthVal">0</span></div>' +
                        '<input type="range" class="m-slider" id="wbDepthSlider" min="0" max="10" value="0">' +
                    '</div>' +
                    '<div class="m-upload" id="wbMUpload">' +
                        '<div class="up-icon"><svg viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg></div>' +
                        '<div class="up-txt" id="wbMUploadTxt">附加文件内容（可选）</div>' +
                        '<div class="up-sub">.txt · .md · .docx · .pdf · .json</div>' +
                    '</div>' +
                    '<input type="file" id="wbMFile" accept=".txt,.md,.docx,.pdf,.json" style="display:none">' +
                    '<button class="m-btn" id="wbMSaveBtn">创建条目</button>' +
                '</div>' +
            '</div>' +

            '<div class="wb-toast" id="wbToast"></div>';

        document.body.appendChild(el);
    }

    /* ══════════════════════════════════════
       Render helpers
    ══════════════════════════════════════ */
    var currentTab = 'entries';
    var fabOpen    = false;
    var editId     = null;

    function posLabel(p) {
        return p === 'before_char' ? '提示词前' : p === 'after_char' ? '角色卡后' : '提示词后';
    }
    function posTag(p) {
        return p === 'before_char' ? 'before' : p === 'after_char' ? 'char' : 'after';
    }

    function renderEntries() {
        var container = document.getElementById('wbTabEntries');
        var active   = entries.filter(function(e){ return e.enabled; });
        var inactive = entries.filter(function(e){ return !e.enabled; });

        if (entries.length === 0) {
            container.innerHTML =
                '<div class="wb-empty">' +
                    '<div class="wb-empty-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
                    '<div class="wb-empty-title">暂无条目</div>' +
                    '<div class="wb-empty-sub">点击右下角 + 创建第一个世界书条目</div>' +
                '</div>';
            return;
        }

        var html = '';
        if (active.length) {
            html += '<div class="sec-lbl"><div class="sec-lbl-txt">Active Entries</div><div class="sec-lbl-line"></div><div class="sec-lbl-num">' + String(active.length).padStart(2,'0') + '</div></div>';
            active.forEach(function(e){ html += entryCardHTML(e); });
        }
        if (inactive.length) {
            html += '<div class="sec-lbl"><div class="sec-lbl-txt">Inactive</div><div class="sec-lbl-line"></div><div class="sec-lbl-num">' + String(inactive.length).padStart(2,'0') + '</div></div>';
            inactive.forEach(function(e){ html += entryCardHTML(e, true); });
        }
        container.innerHTML = html;

        container.querySelectorAll('.e-card').forEach(function(card) {
            card.addEventListener('click', function() {
                var body = card.querySelector('.e-body');
                if (body) body.classList.toggle('open');
            });
        });
        container.querySelectorAll('.e-toggle').forEach(function(tog) {
            tog.addEventListener('click', function(ev) {
                ev.stopPropagation();
                var id = tog.dataset.id;
                var ent = entries.find(function(x){ return x.id === id; });
                if (!ent) return;
                ent.enabled = !ent.enabled;
                saveEntries(entries);
                renderEntries();
            });
        });
        container.querySelectorAll('.ea-edit').forEach(function(btn) {
            btn.addEventListener('click', function(ev) {
                ev.stopPropagation();
                openEditModal(btn.dataset.id);
            });
        });
        container.querySelectorAll('.ea-copy').forEach(function(btn) {
            btn.addEventListener('click', function(ev) {
                ev.stopPropagation();
                var id  = btn.dataset.id;
                var src = entries.find(function(x){ return x.id === id; });
                if (!src) return;
                var copy = JSON.parse(JSON.stringify(src));
                copy.id   = 'wb_' + Date.now();
                copy.name = copy.name + ' (副本)';
                entries.push(copy);
                saveEntries(entries);
                renderEntries();
                showToast('条目已复制');
            });
        });
        container.querySelectorAll('.ea-del').forEach(function(btn) {
            btn.addEventListener('click', function(ev) {
                ev.stopPropagation();
                var id = btn.dataset.id;
                entries = entries.filter(function(x){ return x.id !== id; });
                saveEntries(entries);
                renderEntries();
                showToast('条目已删除');
            });
        });
    }

    var PINYIN_MAP = {
        '啊':'A','阿':'A','爱':'A','安':'A','暗':'A','昂':'A','奥':'A',
        '巴':'B','把':'B','白':'B','百':'B','班':'B','半':'B','宝':'B','悲':'B','北':'B','本':'B','笔':'B','边':'B','标':'B','冰':'B','并':'B','薄':'B','不':'B',
        '才':'C','参':'C','草':'C','层':'C','茶':'C','长':'C','超':'C','沉':'C','成':'C','城':'C','持':'C','赤':'C','出':'C','春':'C','纯':'C','从':'C',
        '大':'D','代':'D','单':'D','当':'D','道':'D','的':'D','灯':'D','地':'D','点':'D','顶':'D','东':'D','动':'D','独':'D','断':'D','对':'D','多':'D',
        '恶':'E','耳':'E','二':'E',
        '发':'F','法':'F','凡':'F','繁':'F','方':'F','飞':'F','风':'F','峰':'F','封':'F','凤':'F','佛':'F','伏':'F','浮':'F','复':'F',
        '该':'G','高':'G','歌':'G','格':'G','工':'G','宫':'G','古':'G','固':'G','光':'G','鬼':'G','国':'G',
        '寒':'H','好':'H','和':'H','黑':'H','红':'H','后':'H','花':'H','华':'H','画':'H','皇':'H','灰':'H','魂':'H','火':'H',
        '迹':'J','极':'J','集':'J','及':'J','间':'J','江':'J','将':'J','角':'J','剑':'J','今':'J','金':'J','静':'J','境':'J','九':'J','久':'J','就':'J','剧':'J','军':'J',
        '开':'K','看':'K','可':'K','空':'K','困':'K',
        '来':'L','兰':'L','冷':'L','离':'L','力':'L','连':'L','两':'L','林':'L','灵':'L','流':'L','龙':'L','楼':'L','路':'L','绿':'L','乱':'L','落':'L',
        '马':'M','美':'M','梦':'M','迷':'M','命':'M','莫':'M','默':'M','目':'M',
        '那':'N','南':'N','你':'N','年':'N','女':'N',
        '怕':'P','旁':'P','飘':'P','平':'P',
        '七':'Q','奇':'Q','气':'Q','千':'Q','情':'Q','清':'Q','轻':'Q','秋':'Q','全':'Q',
        '然':'R','热':'R','人':'R','日':'R','柔':'R','如':'R',
        '三':'S','散':'S','森':'S','山':'S','上':'S','深':'S','生':'S','声':'S','时':'S','世':'S','书':'S','水':'S','死':'S','素':'S',
        '太':'T','天':'T','铁':'T','同':'T','痛':'T','图':'T',
        '万':'W','王':'W','望':'W','微':'W','危':'W','文':'W','无':'W','武':'W',
        '西':'X','息':'X','细':'X','夏':'X','先':'X','仙':'X','香':'X','想':'X','小':'X','心':'X','星':'X','雄':'X','血':'X','寻':'X',
        '烟':'Y','颜':'Y','阳':'Y','夜':'Y','一':'Y','影':'Y','忧':'Y','幽':'Y','雨':'Y','月':'Y','云':'Y',
        '灾':'Z','战':'Z','张':'Z','真':'Z','正':'Z','之':'Z','中':'Z','终':'Z','重':'Z','朱':'Z','竹':'Z','主':'Z','追':'Z','紫':'Z','自':'Z','尊':'Z'
    };

    function getInitialLetter(name) {
        if (!name) return 'W';
        var first = name.charAt(0);
        var code = first.charCodeAt(0);
        if (code < 128) return first.toUpperCase();
        if (PINYIN_MAP[first]) return PINYIN_MAP[first];
        return first.toUpperCase();
    }

    function entryCardHTML(e, dim) {
        var letter = getInitialLetter(e.name);
        var avInner = e.avatar
            ? '<img src="' + e.avatar + '">'
            : '<span class="e-icon-letter">' + letter + '</span>';
        var tag    = posTag(e.position);
        var tagLbl = posLabel(e.position);
        var filePill = e.fileName
            ? '<div class="e-pill"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' + esc(e.fileName) + '</div>'
            : '';
        var contentPreview = esc(String(e.content || '').substring(0, 60));

        return '<div class="e-card"' + (dim ? ' style="opacity:.50"' : '') + '>' +
            '<div class="e-head">' +
                '<div class="e-icon">' + avInner + '</div>' +
                '<div class="e-main">' +
                    '<div class="e-name"><span class="e-name-txt">' + esc(e.name) + '</span><span class="e-tag tag-' + tag + '">' + tagLbl.toUpperCase() + '</span></div>' +
                    '<div class="e-kw">' + esc((e.keywords || []).join(' · ')) + '</div>' +
                    '<div class="e-prev">' + contentPreview + '</div>' +
                '</div>' +
                '<div class="e-right">' +
                    '<div class="e-toggle' + (e.enabled ? ' on' : '') + '" data-id="' + e.id + '"></div>' +
                    '<div class="e-depth">DEPTH · ' + (e.depth || 0) + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="e-body">' +
                '<div class="e-div"></div>' +
                '<div class="e-content" style="max-height:160px;overflow-y:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch">' + esc(e.content || '') + '</div>' +
                '<div class="e-meta-row">' +
                    '<div class="e-pill"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h7"/></svg>' + tagLbl + '</div>' +
                    '<div class="e-pill"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>深度 ' + (e.depth || 0) + '</div>' +
                    filePill +
                '</div>' +
                '<div class="e-acts">' +
                    '<div class="ea-btn ea-edit" data-id="' + e.id + '">编辑</div>' +
                    '<div class="ea-btn primary ea-copy" data-id="' + e.id + '">复制</div>' +
                    '<div class="ea-btn danger ea-del" data-id="' + e.id + '">删除</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

       function loadEntitiesDirect(cb) {
        try {
            var req = indexedDB.open('CoutureOS_ChatDB');
            req.onsuccess = function(e) {
                var db = e.target.result;
                if (!db.objectStoreNames.contains('entities')) { cb([]); return; }
                var tx = db.transaction(['entities','avatars'], 'readonly');
                var entReq = tx.objectStore('entities').getAll();
                entReq.onsuccess = function(ev) {
                    var entsLoaded = ev.target.result || [];
                    if (!entsLoaded.length) { cb([]); return; }
                    var avStore = tx.objectStore('avatars');
                    var remaining = entsLoaded.length;
                    entsLoaded.forEach(function(ent) {
                        var avReq = avStore.get(ent.id);
                        avReq.onsuccess = function(e2) {
                            var av = e2.target.result;
                            if (av && av.data) ent.avatar = av.data;
                            if (--remaining === 0) cb(entsLoaded);
                        };
                        avReq.onerror = function() {
                            if (--remaining === 0) cb(entsLoaded);
                        };
                    });
                };
                entReq.onerror = function() { cb([]); };
            };
            req.onerror = function() { cb([]); };
        } catch(err) { cb([]); }
    }

    function renderChars() {
        var container = document.getElementById('wbTabChars');
        loadEntitiesDirect(function(loaded) {
            doRenderChars(container, loaded || []);
        });
    }

    function doRenderChars(container, ents) {
        if (ents.length === 0) {
            container.innerHTML = '<div class="wb-empty"><div class="wb-empty-icon"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div class="wb-empty-title">暂无角色</div><div class="wb-empty-sub">在聊天应用中创建角色后再来配置世界书携带。</div></div>';
            return;
        }

        var html = '<div class="sec-lbl"><div class="sec-lbl-txt">Characters</div><div class="sec-lbl-line"></div><div class="sec-lbl-num">' + String(ents.length).padStart(2,'0') + '</div></div>';
        ents.forEach(function(ent) {
            var dispName = ent.nickname || ent.name;
            var letter   = (dispName || '?').charAt(0).toUpperCase();
            var attached = entries.filter(function(e){ return e.enabled && e.charIds && e.charIds.indexOf(ent.id) !== -1; });
            var avInner  = ent.avatar
                ? '<img src="' + ent.avatar + '">'
                : letter;
            var countTxt = attached.length ? attached.length + ' Books' : '0 Books';
            var bkRows   = '';
            entries.filter(function(e){ return e.enabled; }).forEach(function(e) {
                var has = e.charIds && e.charIds.indexOf(ent.id) !== -1;
                bkRows += '<div class="c-bk-row">' +
                    '<div><div class="c-bk-name">' + esc(e.name) + '</div><div class="c-bk-pos">' + posLabel(e.position) + ' · DEPTH ' + (e.depth||0) + '</div></div>' +
                    '<div class="e-toggle' + (has ? ' on' : '') + '" data-eid="' + e.id + '" data-cid="' + ent.id + '"></div>' +
                '</div>';
            });

            html += '<div class="c-card" data-cid="' + ent.id + '">' +
                '<div class="c-av">' + avInner + '</div>' +
                '<div class="c-info">' +
                    '<div class="c-name">' + esc(dispName) + '</div>' +
                    '<div class="c-books">' + (attached.length ? attached.map(function(e){ return esc(e.name); }).join(' · ') : '未携带任何世界书') + '</div>' +
                '</div>' +
                '<div class="c-right">' +
                    '<div class="c-count" style="' + (attached.length ? '' : 'color:var(--ink45)') + '">' + countTxt + '</div>' +
                '</div>' +
            '</div>' +
            (entries.filter(function(e){ return e.enabled; }).length
                ? '<div class="c-bk-pick" id="cbk-' + ent.id + '"><div class="c-bk-div"></div>' + bkRows + '</div>'
                : '');
        });

        container.innerHTML = html;

        container.querySelectorAll('.c-card').forEach(function(card) {
            card.addEventListener('click', function() {
                var cid  = card.dataset.cid;
                var pick = document.getElementById('cbk-' + cid);
                if (pick) pick.classList.toggle('open');
            });
        });

        container.querySelectorAll('.c-bk-pick .e-toggle').forEach(function(tog) {
            tog.addEventListener('click', function(ev) {
                ev.stopPropagation();
                var eid = tog.dataset.eid;
                var cid = tog.dataset.cid;
                var ent = entries.find(function(x){ return x.id === eid; });
                if (!ent) return;
                ent.charIds = ent.charIds || [];
                var idx = ent.charIds.indexOf(cid);
                if (idx === -1) ent.charIds.push(cid);
                else ent.charIds.splice(idx, 1);
                saveEntries(entries);
                renderChars();
            });
        });
    }

    function renderAll() {
        renderEntries();
        if (currentTab === 'chars') renderChars();
    }

    /* ══════════════════════════════════════
       Modal
    ══════════════════════════════════════ */
    var pendingAvatar = null;
    var pendingFileContent = null;
    var pendingFileName = null;

    function openNewModal() {
        editId          = null;
        pendingAvatar   = null;
        pendingFileContent = null;
        pendingFileName = null;

        document.getElementById('wbModalTitleEn').textContent = 'New Entry · 新建条目';
        document.getElementById('wbModalSub').textContent = '创建一个新的世界书条目';
        document.getElementById('wbMName').value    = '';
        document.getElementById('wbMKeys').value    = '';
        document.getElementById('wbMContent').value = '';
        document.getElementById('wbDepthSlider').value = '0';
        document.getElementById('wbDepthVal').textContent = '0';
        document.getElementById('wbMUploadTxt').textContent = '附加文件内容（可选）';
        document.getElementById('wbMapLetter').textContent = 'W';
        document.getElementById('wbMapLetter').style.display = '';
        var oldImg = document.querySelector('#wbMapAv img');
        if (oldImg) oldImg.remove();

        document.getElementById('wbMSaveBtn').textContent = '创建条目';
        document.querySelectorAll('#wbMSeg .seg-item').forEach(function(s){ s.classList.remove('sel'); if(s.dataset.pos === 'before_char') s.classList.add('sel'); });
        document.getElementById('wbModal').classList.add('open');
    }

    function openEditModal(id) {
        var ent = entries.find(function(x){ return x.id === id; });
        if (!ent) return;
        editId = id;
        pendingAvatar      = ent.avatar || null;
        pendingFileContent = ent.fileContent || null;
        pendingFileName    = ent.fileName || null;

        document.getElementById('wbModalTitleEn').textContent = 'Edit Entry · 编辑条目';
        document.getElementById('wbModalSub').textContent = '修改条目内容与设置';
        document.getElementById('wbMName').value    = ent.name || '';
        document.getElementById('wbMKeys').value    = (ent.keywords || []).join(', ');
        document.getElementById('wbMContent').value = ent.content || '';
        document.getElementById('wbDepthSlider').value = String(ent.depth || 0);
        document.getElementById('wbDepthVal').textContent = String(ent.depth || 0);
        document.getElementById('wbMUploadTxt').textContent = ent.fileName ? ('已附加：' + ent.fileName) : '附加文件内容（可选）';
        document.getElementById('wbMapLetter').textContent = (ent.name || 'W').charAt(0).toUpperCase();
        var oldImg = document.querySelector('#wbMapAv img');
        if (oldImg) oldImg.remove();
        if (ent.avatar) {
            var img = document.createElement('img');
            img.src = ent.avatar;
            document.getElementById('wbMapAv').insertBefore(img, document.querySelector('#wbMapAv .map-av-badge'));
            document.getElementById('wbMapLetter').style.display = 'none';
        } else {
            document.getElementById('wbMapLetter').style.display = '';
        }
        document.getElementById('wbMSaveBtn').textContent = '保存修改';
        document.querySelectorAll('#wbMSeg .seg-item').forEach(function(s){
            s.classList.toggle('sel', s.dataset.pos === (ent.position || 'before_char'));
        });
        document.getElementById('wbModal').classList.add('open');
    }

    function closeModal() { document.getElementById('wbModal').classList.remove('open'); }

    function saveEntry() {
        var name    = document.getElementById('wbMName').value.trim();
        var keys    = document.getElementById('wbMKeys').value.trim();
        var content = document.getElementById('wbMContent').value.trim();
        var depth   = parseInt(document.getElementById('wbDepthSlider').value, 10);
        var selPos  = document.querySelector('#wbMSeg .seg-item.sel');
        var pos     = selPos ? selPos.dataset.pos : 'before_char';

        if (!name) {
            document.getElementById('wbMName').focus();
            showToast('请填写条目名称');
            return;
        }

        var kwArr = keys ? keys.split(/[,，]/).map(function(k){ return k.trim(); }).filter(Boolean) : [];

        if (editId) {
            var ent = entries.find(function(x){ return x.id === editId; });
            if (ent) {
                ent.name     = name;
                ent.keywords = kwArr;
                ent.content  = content;
                ent.depth    = depth;
                ent.position = pos;
                ent.insertionOrder = depth;
                if (pendingAvatar !== null) ent.avatar = pendingAvatar;
                if (pendingFileContent !== null) { ent.fileContent = pendingFileContent; ent.fileName = pendingFileName; }
            }
            showToast('条目已更新');
        } else {
            var newEnt = {
                id:             'wb_' + Date.now(),
                name:           name,
                keywords:       kwArr,
                content:        content,
                depth:          depth,
                insertionOrder: depth,
                position:       pos,
                enabled:        true,
                charIds:        [],
                avatar:         pendingAvatar || '',
                fileContent:    pendingFileContent || '',
                fileName:       pendingFileName || ''
            };
            entries.push(newEnt);
            showToast('条目已创建');
        }

        saveEntries(entries);
        closeModal();
        if (currentTab === 'entries') renderEntries();
    }

    /* ══════════════════════════════════════
       Import JSON
    ══════════════════════════════════════ */
    function importJSON(text, fileName) {
        var trimmed = (text || '').trim();
        if (!trimmed) { showToast('文件内容为空'); return; }
        var baseName = (fileName || 'Imported').replace(/\.[^.]+$/, '');

        if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') {
            try {
                var obj = JSON.parse(trimmed);
                var arr = [];

                if (Array.isArray(obj)) {
                    arr = obj;
                } else if (obj.entries) {
                    if (Array.isArray(obj.entries)) {
                        arr = obj.entries;
                    } else if (typeof obj.entries === 'object') {
                        arr = Object.values(obj.entries);
                    }
                } else if (obj.worldInfo && Array.isArray(obj.worldInfo)) {
                    arr = obj.worldInfo;
                } else if (obj.items && Array.isArray(obj.items)) {
                    arr = obj.items;
                } else if (obj.data && Array.isArray(obj.data)) {
                    arr = obj.data;
                } else if (obj.content || obj.text || obj.body || obj.comment || obj.lore) {
                    arr = [obj];
                } else {
                    var vals = Object.values(obj);
                    if (vals.length && typeof vals[0] === 'object' && vals[0] !== null) {
                        arr = vals;
                    } else if (vals.length && typeof vals[0] === 'string') {
                        arr = Object.keys(obj).map(function(k) { return { name: k, content: obj[k] }; });
                    } else {
                        arr = [obj];
                    }
                }

                var added = 0;
                arr.forEach(function(item, idx) {
                    if (!item) return;

                    if (typeof item === 'string') {
                        entries.push({
                            id: 'wb_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).slice(2,5),
                            name: baseName + '_' + (idx + 1),
                            keywords: [], content: item, depth: 0,
                            insertionOrder: idx, position: 'before_char',
                            enabled: true, charIds: [], avatar: '', fileContent: '', fileName: ''
                        });
                        added++;
                        return;
                    }

                    if (typeof item !== 'object') return;

                    var name = item.comment || item.name || item.title || item.label ||
                               item.memo || item.header || item.subject || item.topic ||
                               (baseName + (arr.length > 1 ? ' · ' + (idx + 1) : ''));

                    var content = item.content || item.text || item.body || item.lore ||
                                  item.description || item.value || item.data || item.info || '';
                    if (typeof content !== 'string') {
                        try { content = JSON.stringify(content); } catch(e) { content = String(content); }
                    }

                    if (!content) {
                        Object.keys(item).forEach(function(k) {
                            if (!content && typeof item[k] === 'string' && item[k].length > 20) {
                                if (['comment','name','title','label','memo','comment'].indexOf(k) === -1) {
                                    content = item[k];
                                }
                            }
                        });
                    }

                    var kw = item.key || item.keys || item.keywords || item.triggers || item.keyword || [];
                    if (typeof kw === 'string') kw = kw.split(/[,，]/).map(function(k) { return k.trim(); }).filter(Boolean);
                    if (!Array.isArray(kw)) kw = [];

                    var posMap = {
                        0: 'before_char', 1: 'after_char', 2: 'after_prompt', 4: 'before_char',
                        'before_char': 'before_char', 'after_char': 'after_char', 'after_prompt': 'after_prompt'
                    };
                    var pos = (item.position !== undefined && posMap[item.position] !== undefined)
                        ? posMap[item.position] : 'before_char';

                    var enabled = true;
                    if (item.disable !== undefined) enabled = !item.disable;
                    else if (item.disabled !== undefined) enabled = !item.disabled;
                    else if (item.enabled !== undefined) enabled = item.enabled !== false;
                    else if (item.active !== undefined) enabled = !!item.active;

                    entries.push({
                        id:             'wb_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).slice(2,5),
                        name:           String(name),
                        keywords:       kw,
                        content:        content,
                        depth:          parseInt(item.depth, 10) || 0,
                        insertionOrder: parseInt(item.order, 10) || parseInt(item.insertion_order, 10) || parseInt(item.depth, 10) || idx,
                        position:       pos,
                        enabled:        enabled,
                        charIds:        [],
                        avatar:         '',
                        fileContent:    '',
                        fileName:       ''
                    });
                    added++;
                });

                if (added > 0) {
                    saveEntries(entries);
                    renderAll();
                    showToast('已导入 ' + added + ' 条条目');
                    return;
                }
            } catch(ex) {
                /* fall through to plain text */
            }
        }
        importPlainText(trimmed, fileName);
    }

    function importPlainText(text, fileName) {
        if (!text || !text.trim()) { showToast('文件内容为空'); return; }
        var baseName = (fileName || 'Imported').replace(/\.[^.]+$/, '');

        var headerRegex = /^#{1,3}\s+(.+)/;
        var lines = text.split('\n');
        var sections = [];
        var cur = null;

        lines.forEach(function(line) {
            var m = line.match(headerRegex);
            if (m) {
                if (cur && cur.content.trim()) sections.push(cur);
                cur = { name: m[1].trim(), content: '' };
            } else {
                if (!cur) cur = { name: baseName, content: '' };
                cur.content += line + '\n';
            }
        });
        if (cur && cur.content.trim()) sections.push(cur);

        if (sections.length > 1) {
            sections.forEach(function(sec, idx) {
                entries.push({
                    id:             'wb_' + Date.now() + '_' + idx,
                    name:           sec.name,
                    keywords:       [],
                    content:        sec.content.trim(),
                    depth:          0,
                    insertionOrder: idx,
                    position:       'before_char',
                    enabled:        true,
                    charIds:        [],
                    avatar:         '',
                    fileContent:    sec.content.trim(),
                    fileName:       fileName || ''
                });
            });
            saveEntries(entries);
            renderAll();
            showToast('已导入 ' + sections.length + ' 条条目（按章节分割）');
        } else {
            entries.push({
                id:             'wb_' + Date.now(),
                name:           baseName,
                keywords:       [],
                content:        text.trim(),
                depth:          0,
                insertionOrder: 0,
                position:       'before_char',
                enabled:        true,
                charIds:        [],
                avatar:         '',
                fileContent:    text.trim(),
                fileName:       fileName || ''
            });
            saveEntries(entries);
            renderAll();
            showToast('已导入文件：' + baseName);
        }
    }

    /* ══════════════════════════════════════
       Toast
    ══════════════════════════════════════ */
    var toastTimer = null;
    function showToast(msg) {
        var el = document.getElementById('wbToast');
        if (!el) return;
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function(){ el.classList.remove('show'); }, 2000);
    }

    function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    /* ══════════════════════════════════════
       Clock
    ══════════════════════════════════════ */
    function tickClock() {
        var el = document.getElementById('wbClock');
        if (!el) return;
        var d = new Date();
        el.textContent = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    }

    /* ══════════════════════════════════════
       Bind events
    ══════════════════════════════════════ */
    function bindAll() {
        document.getElementById('wbBackBtn').addEventListener('click', function() {
            var app = document.getElementById('wbApp');
            app.classList.add('hidden');
        });

        document.getElementById('wbAddBtn').addEventListener('click', openNewModal);

        /* tabs */
        document.querySelectorAll('#wbApp .wb-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                document.querySelectorAll('#wbApp .wb-tab').forEach(function(t){ t.classList.remove('active'); });
                tab.classList.add('active');
                currentTab = tab.dataset.tab;
                document.getElementById('wbTabEntries').style.display = currentTab === 'entries' ? 'block' : 'none';
                document.getElementById('wbTabChars').style.display   = currentTab === 'chars'   ? 'block' : 'none';
                document.getElementById('wbTabImport').style.display  = currentTab === 'import'  ? 'block' : 'none';
                if (currentTab === 'chars') renderChars();
            });
        });

        /* fab */
        document.getElementById('wbFabMain').addEventListener('click', function() {
            fabOpen = !fabOpen;
            var sub = document.getElementById('wbFabSub');
            var svg = document.querySelector('#wbFabMain svg');
            if (fabOpen) {
                sub.classList.remove('hidden');
                svg.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
            } else {
                sub.classList.add('hidden');
                svg.innerHTML = '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>';
            }
        });
        document.getElementById('wbFabNew').addEventListener('click', function() {
            fabOpen = false;
            document.getElementById('wbFabSub').classList.add('hidden');
            document.querySelector('#wbFabMain svg').innerHTML = '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>';
            openNewModal();
        });
        document.getElementById('wbFabImport').addEventListener('click', function() {
            document.getElementById('wbImportFile').click();
        });

        /* modal close on overlay */
        document.getElementById('wbModal').addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });

        /* seg */
        document.getElementById('wbMSeg').addEventListener('click', function(e) {
            var item = e.target.closest('.seg-item');
            if (!item) return;
            document.querySelectorAll('#wbMSeg .seg-item').forEach(function(s){ s.classList.remove('sel'); });
            item.classList.add('sel');
        });

        /* depth slider */
        document.getElementById('wbDepthSlider').addEventListener('input', function() {
            document.getElementById('wbDepthVal').textContent = this.value;
        });

        /* save */
        document.getElementById('wbMSaveBtn').addEventListener('click', saveEntry);

        /* avatar upload in modal */
        document.getElementById('wbMapFile').addEventListener('change', function(e) {
            var file = e.target.files[0]; if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                pendingAvatar = ev.target.result;
                var av = document.getElementById('wbMapAv');
                var old = av.querySelector('img'); if (old) old.remove();
                document.getElementById('wbMapLetter').style.display = 'none';
                var img = document.createElement('img');
                img.src = pendingAvatar;
                av.insertBefore(img, av.querySelector('.map-av-badge'));
            };
            reader.readAsDataURL(file);
            this.value = '';
        });

        /* entry name → letter sync */
        document.getElementById('wbMName').addEventListener('input', function() {
            var v = this.value.trim();
            document.getElementById('wbMapLetter').textContent = v ? getInitialLetter(v) : 'W';
        });

        /* attach file */
        document.getElementById('wbMUpload').addEventListener('click', function() {
            document.getElementById('wbMFile').click();
        });
        document.getElementById('wbMFile').addEventListener('change', function(e) {
            var file = e.target.files[0]; if (!file) return;
            pendingFileName = file.name;
            var reader = new FileReader();
            reader.onload = function(ev) {
                pendingFileContent = ev.target.result;
                document.getElementById('wbMUploadTxt').textContent = '已附加：' + file.name;
                showToast('文件已读取');
            };
            reader.onerror = function() { showToast('文件读取失败'); };
            if (file.name.endsWith('.docx')) {
                pendingFileContent = '[DOCX file attached: ' + file.name + ']';
                document.getElementById('wbMUploadTxt').textContent = '已附加：' + file.name;
                showToast('已附加 .docx 文件');
            } else {
                reader.readAsText(file);
            }
            this.value = '';
        });

        /* import file */
        document.getElementById('wbImportFile').addEventListener('change', function(e) {
            var file = e.target.files[0]; if (!file) return;
            var name = file.name.toLowerCase();
            var self = this;

            if (name.endsWith('.json') || name.endsWith('.txt') || name.endsWith('.md')) {
                var reader = new FileReader();
                reader.onload = function(ev) { importJSON(ev.target.result, file.name); };
                reader.onerror = function() { showToast('文件读取失败'); };
                reader.readAsText(file);
            } else if (name.endsWith('.docx')) {
                if (typeof window.mammoth !== 'undefined') {
                    var arrReader = new FileReader();
                    arrReader.onload = function(ev) {
                        window.mammoth.extractRawText({ arrayBuffer: ev.target.result })
                            .then(function(result) { importPlainText(result.value, file.name); })
                            .catch(function() { showToast('docx 解析失败'); });
                    };
                    arrReader.readAsArrayBuffer(file);
                } else {
                    var s = document.createElement('script');
                    s.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js';
                    s.onload = function() {
                        var arrReader2 = new FileReader();
                        arrReader2.onload = function(ev) {
                            window.mammoth.extractRawText({ arrayBuffer: ev.target.result })
                                .then(function(result) { importPlainText(result.value, file.name); })
                                .catch(function() { showToast('docx 解析失败'); });
                        };
                        arrReader2.readAsArrayBuffer(file);
                    };
                    s.onerror = function() { showToast('mammoth.js 加载失败，请检查网络'); };
                    document.head.appendChild(s);
                }
            } else {
                var fallback = new FileReader();
                fallback.onload = function(ev) {
                    var text = ev.target.result;
                    if (text && text.trim().charAt(0) === '{' || text.trim().charAt(0) === '[') {
                        importJSON(text, file.name);
                    } else {
                        importPlainText(text, file.name);
                    }
                };
                fallback.onerror = function() { showToast('文件读取失败'); };
                fallback.readAsText(file);
            }
            self.value = '';
        });
        document.getElementById('wbImportUpload').addEventListener('click', function() {
            document.getElementById('wbImportFile').click();
        });
    }

    /* ══════════════════════════════════════
       Public entry point
    ══════════════════════════════════════ */
    window.openWorldBook = function() {
        if (!built) {
            buildHTML();
            bindAll();
            setInterval(tickClock, 1000);
            built = true;
        }
        books   = loadBooks();
        entries = loadEntries();
        tickClock();
        renderAll();
        document.getElementById('wbApp').classList.remove('hidden');
    };

})();
