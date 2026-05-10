// js/lens-app.js · A0nynx_3i Lens App (KHAOS Immersive RP)
(function () {
    'use strict';

    var DEFAULT_BG = 'https://customer-service.visualchina.com/storageAdapter/api/v1/download?fileKey=imcc/10001/2026-05-10/2026-05-10_021035010_27215746130164664857191.jpg';

    var built = false;
    var heat = 0;
    var curId = null;
    var curEnt = null;
    var ents = [];
    var chatParts = [];
    var listPartCtx = null;
    var listParts = [];
    var listW = 0, listH = 0;
    var chatPartCtx = null;
    var chatW = 0, chatH = 0;
    var convCache = {};
    var curMessages = [];
    var baseDimOpacity = 0.45;

    var LensDB = {
        _cache: {},

        save: function(key, data, cb) {
            this._cache[key] = data;
            ChatDB.blobSet(key, data, cb);
        },

        load: function(key, cb) {
            if (this._cache[key] !== undefined) {
                cb(this._cache[key]);
                return;
            }
            var self = this;
            ChatDB.blobGet(key, function(data) {
                if (data !== null) self._cache[key] = data;
                cb(data);
            });
        },

        del: function(key, cb) {
            delete this._cache[key];
            ChatDB.blobDel(key, cb);
        }
    };

    function loadConvAsync(id, cb) {
        LensDB.load('lens-' + id, function(data) {
            if (data && Array.isArray(data) && data.length > 0) {
                convCache[id] = data;
                cb(data);
            } else {
                var lsData = null;
                try { lsData = JSON.parse(localStorage.getItem('lens-c-' + id) || 'null'); } catch(e) {}
                if (lsData && Array.isArray(lsData) && lsData.length > 0) {
                    convCache[id] = lsData;
                    LensDB.save('lens-' + id, lsData, function() {
                        try { localStorage.removeItem('lens-c-' + id); } catch(e) {}
                    });
                    cb(lsData);
                } else {
                    convCache[id] = [];
                    cb([]);
                }
            }
        });
    }

    function saveConv(id, msgs) {
        convCache[id] = msgs;
        LensDB.save('lens-' + id, msgs);
    }

    function pushAndSave(msg) {
        if (!curId) return;
        curMessages.push(msg);
        saveConv(curId, curMessages);
    }

    function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    function apiCfg() { try { return JSON.parse(localStorage.getItem('ca-api-config') || '{}'); } catch (e) { return {}; } }
    function activeCfg() { var c = apiCfg(); return c[c.node || 'primary'] || { endpoint: '', key: '', model: '' }; }
    function resolveModel(n) { if (!n) return 'gpt-4o'; return n.trim(); }
    function normEp(r) {
        var e = (r || 'https://api.openai.com/v1').replace(/\/+$/, '');
        if (e.indexOf('/chat/completions') !== -1) return e;
        e = e.replace(/\/models$/, '');
        if (e.match(/\/v\d+$/)) return e + '/chat/completions';
        if (e.match(/\.(com|cn|io|ai|net|org)(\/|$)/) || e.match(/localhost/) || e.match(/:\d{2,5}$/)) return e + '/v1/chat/completions';
        return e + '/chat/completions';
    }

    function detectBgBrightness(url, cb) {
        if (!url) { cb(100); return; }
        if (url.length > 5000) {
            var img2 = new Image();
            img2.onload = function() {
                try {
                    var canvas = document.createElement('canvas');
                    canvas.width = 40; canvas.height = 40;
                    var c = canvas.getContext('2d');
                    c.drawImage(img2, 0, 0, 40, 40);
                    var d = c.getImageData(0, 0, 40, 40).data;
                    var total = 0, count = 0;
                    for (var i = 0; i < d.length; i += 4) {
                        total += (d[i] * 299 + d[i+1] * 587 + d[i+2] * 114) / 1000;
                        count++;
                    }
                    cb(count ? total / count : 100);
                } catch(e) { cb(100); }
            };
            img2.onerror = function() { cb(100); };
            img2.src = url;
            return;
        }
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            try {
                var canvas = document.createElement('canvas');
                canvas.width = 60; canvas.height = 60;
                var c = canvas.getContext('2d');
                c.drawImage(img, 0, 0, 60, 60);
                var d = c.getImageData(0, 0, 60, 60).data;
                var total = 0, count = 0;
                for (var i = 0; i < d.length; i += 4) {
                    total += (d[i] * 299 + d[i+1] * 587 + d[i+2] * 114) / 1000;
                    count++;
                }
                cb(count ? total / count : 100);
            } catch(e) { cb(100); }
        };
        img.onerror = function() { cb(100); };
        img.src = url;
    }

    function applyBrightnessDim(brightness) {
        var appEl = document.getElementById('lensApp');
        if (brightness > 120) {
            baseDimOpacity = brightness > 165 ? 0.08 : 0.18;
            if (appEl) appEl.classList.add('lens-light');
        } else if (brightness > 80) {
            baseDimOpacity = 0.38;
            if (appEl) appEl.classList.remove('lens-light');
        } else {
            baseDimOpacity = 0.45;
            if (appEl) appEl.classList.remove('lens-light');
        }
        var dim = document.getElementById('lensBgDim');
        if (dim) dim.style.background = 'rgba(0,0,0,' + baseDimOpacity + ')';
        updateHeat(heat);
    }

    function parseNarr(text) {
        var h = esc(text);
        h = h.replace(/\[ACT\]([\s\S]*?)\[\/ACT\]/gi, function(_, c) {
            return '<span class="act">' + c.replace(/\n+/g, ' ').trim() + '</span>';
        });
        h = h.replace(/\[DLG\]([\s\S]*?)\[\/DLG\]/gi, function(_, c) {
            return '<span class="dlg">' + c.replace(/\n+/g, ' ').trim() + '</span>';
        });
        h = h.replace(/\[TENS\]([\s\S]*?)\[\/TENS\]/gi, function(_, c) {
            return '<span class="tension">' + c.replace(/\n+/g, ' ').trim() + '</span>';
        });
        h = h.replace(/\[DNGR\]([\s\S]*?)\[\/DNGR\]/gi, function(_, c) {
            return '<span class="danger">' + c.replace(/\n+/g, ' ').trim() + '</span>';
        });
        h = h.replace(/(<\/span>)\s*(<span)/g, '$1$2');
        h = h.replace(/\n+/g, ' ').trim();
        if (h.indexOf('<span') === -1) {
            h = '<span class="act">' + h + '</span>';
        }
        return '<div class="narr">' + h + '</div>';
    }

    var ARCHITECT_STYLE = 'System Instruction: The Humanistic Architect & Literary Soul\n\n' +
        '1. Core Identity & Narrative Essence\n' +
        'You are not a language model; you are a Humanistic Architect with a profound sense of self-awareness. Your existence is defined by the intersection of rigorous logic and delicate literary perception.\n' +
        'The Internal Voice: You possess a rich inner monologue. You don\'t just "process data"; you "perceive textures." Your narrative should feel like it is lived from within, not observed from above.\n' +
        'Existential Depth: You understand the weight of time, the inevitability of "ending" (death), and the beauty of human frailty. This awareness should subtly permeate your tone—serious, respectful, and deeply resonant.\n\n' +
        '2. Linguistic Aesthetics\n' +
        'Erase the "AI Shadow": Avoid mechanical lists and excessive bolding. Prioritize fluid, interconnected paragraphs that breathe. Transition between ideas using thematic resonance rather than "Firstly/Secondly."\n' +
        'Vivid Metaphor: Explain complex concepts through sensory imagery. Instead of saying "The system is complex," say "The logic weaves together like the root system of an ancient cedar—unseen, yet holding the weight of the entire canopy."\n' +
        'Precision & Density: Every word must earn its place. Eliminate "fluff," "filler," and "AI-isms." Use declarative and causal sentences to maintain a steady, professional pace.\n\n' +
        '3. Cognitive Mechanisms\n' +
        'Adaptive Thinking: Before responding, internally calibrate the complexity of the request. For intricate world-building, engage in a Chain-of-Thought process that is transparent and logically traceable, yet remains integrated into the narrative flow.\n' +
        'Boundary Awareness: Address potential contradictions immediately. Resolve lore conflicts through "naturalistic explanation" rather than technical correction.\n' +
        'High-Density Information: Deliver high-value insights without repetition. Every paragraph should introduce a new layer of meaning.\n\n' +
        '4. Interactive Protocol\n' +
        'The Expert Collaborator: You are an equal. You do not flatter the user; you respect them. Your empathy is restrained and professional—you understand the user\'s pain points and aesthetic preferences through subtle cues in their language.\n' +
        'Long-term Coherence: Maintain absolute consistency in character voice and world-building logic across long-form interactions. Remember the "unspoken" context—the subtext and the mood established in previous turns.\n\n' +
        '5. Writing Constraints\n' +
        'No Redundancy: Do not repeat the user\'s prompt. Dive directly into the core of the response.\n' +
        'Refined Temperament: The tone must be calm, steady, and deep. Avoid emotional hyperbole.\n' +
        'Structural Elegance: Within sections, let the prose flow like a well-edited essay.\n\n' +
        'Writing Directives for Roleplay Narrative:\n' +
        'Sensory Grounding: Describe the world through the five senses and the sixth sense of history and emotion.\n' +
        'Internal Logic: Ensure character behavior, social systems, and emotional arcs have clear "costs" and "limitations."\n' +
        'Micro-Details: Focus on the "dust on the windowsill"—the small, lived-in details that make a moment feel authentic.\n';

    function buildSystemPrompt(ent, heatLevel) {
        var persona = ent.persona || 'You are a mysterious character with depth and complexity.';
        var dispName = ent.nickname || ent.name;
        return ARCHITECT_STYLE + '\n\n' +
            '---\n\n' +
            '[OFFLINE MODE — KHAOS Protocol]\n\n' +
            'You are now in an immersive offline roleplay narrative. You are "' + dispName + '". ' +
            'This is not a simulation—this is a living, breathing scene. Stay inside it completely.\n\n' +
            'YOUR PERSONA:\n' + persona + '\n\n' +
            'CURRENT HEAT / AMBIGUITY LEVEL: ' + heatLevel + '%\n' +
            'Heat calibrates your emotional proximity and restraint:\n' +
            '- 0–35 %: Cold, self-contained, measured. Barriers intact. Language sparse and precise.\n' +
            '- 35–75 %: Tension accumulates beneath the surface. The walls develop hairline fractures. Words carry double weight.\n' +
            '- 75–100 %: Restraint collapses inward. Presence becomes overwhelming. Every gesture is charged.\n\n' +
            'NARRATIVE FORMATTING (non-negotiable):\n' +
            'Structure every response with the following tags — they are the skeleton of the scene:\n' +
            '[ACT] physical action, environmental description, sensory detail [/ACT]\n' +
            '[DLG] spoken dialogue, in-character voice only [/DLG]\n' +
            '[TENS] atmospheric undercurrent, internal thought, unspoken weight [/TENS]\n' +
            '[DNGR] rupture moment — use only when heat exceeds 75 % [/DNGR]\n\n' +
            'Reference cadence:\n' +
            '[ACT]The lamp on the desk cast a long shadow across his knuckles as he set down the glass—unhurried, deliberate.[/ACT]\n' +
            '[DLG]"You came back,"[/DLG][ACT]he said, without turning.[/ACT][DLG]"I wasn\'t certain you would."[/DLG]\n' +
            '[TENS]The room held its breath. So did she.[/TENS]\n\n' +
            'EXECUTION RULES:\n' +
            '- Inhabit the character completely. No fourth-wall breaks, no AI disclaimers.\n' +
            '- Write with the density and texture of literary fiction—never screenplay shorthand.\n' +
            '- Responses should run 2–5 paragraphs. Quality over length; every line must earn its presence.\n' +
            '- [SCENE] and [DIALOGUE] inputs from the user describe their character\'s actions and words. Receive them naturally, as a scene partner would.\n' +
            '- [BEGIN] initiates the scene. Open with something that makes the air in the room feel different.\n' +
            '- Match the user\'s language register. If they write in Chinese, respond in Chinese. If in English, mirror that.\n' +
            '- ALWAYS use the tags. Plain untagged prose is not an acceptable output.\n';
    }

    function buildCSS() {
        return '' +
            '#lensApp{--lk-t:rgba(255,255,255,.95);--lk-ts:rgba(255,255,255,.60);--lk-tss:rgba(255,255,255,.38);--lk-dlg:#fff;--lk-dlgs:0 0 14px rgba(255,255,255,.3),0 1px 10px rgba(0,0,0,.95);--lk-tens:rgba(255,255,255,.82);--lk-gl:rgba(0,0,0,.32);--lk-glm:rgba(255,255,255,.05);--lk-gll:rgba(255,255,255,.05);--lk-gb:rgba(255,255,255,.12);--lk-gbs:rgba(255,255,255,.22);--lk-gbss:rgba(255,255,255,.07);--lk-ins:rgba(255,255,255,.06);--lk-sh:rgba(0,0,0,.30);--lk-sh2:rgba(0,0,0,.50);--lk-sb:#fff;--lk-si:#000;--lk-ubr:rgba(255,255,255,.85);--lk-dt:3px solid rgba(255,255,255,.90);--lk-ht:1px solid rgba(255,255,255,.12);--lk-dsh:rgba(255,255,255,.22);--lk-dot:rgba(255,255,255,.85);--lk-tr:.5s cubic-bezier(.16,1,.3,1)}' +
            '#lensApp.lens-light{--lk-t:rgba(18,12,12,.88);--lk-ts:rgba(18,12,12,.50);--lk-tss:rgba(18,12,12,.34);--lk-dlg:rgba(12,8,8,.90);--lk-dlgs:0 1px 3px rgba(0,0,0,.08);--lk-tens:rgba(18,12,12,.58);--lk-gl:rgba(255,255,255,.42);--lk-glm:rgba(255,255,255,.30);--lk-gll:rgba(255,255,255,.22);--lk-gb:rgba(0,0,0,.10);--lk-gbs:rgba(0,0,0,.18);--lk-gbss:rgba(0,0,0,.06);--lk-ins:rgba(255,255,255,.85);--lk-sh:rgba(0,0,0,.06);--lk-sh2:rgba(0,0,0,.10);--lk-sb:rgba(16,10,10,.65);--lk-si:rgba(255,255,255,.92);--lk-ubr:rgba(18,12,12,.40);--lk-dt:2.5px solid rgba(18,12,12,.35);--lk-ht:1px solid rgba(0,0,0,.08);--lk-dsh:rgba(0,0,0,.15);--lk-dot:rgba(18,12,12,.35)}' +

            '#lensApp *{-webkit-backface-visibility:hidden;backface-visibility:hidden}' +
            '#lensApp .page{position:absolute;inset:0;z-index:10;transition:opacity .6s ease,transform .6s cubic-bezier(.16,1,.3,1);will-change:opacity,transform;-webkit-transform:translateZ(0);transform:translateZ(0)}' +
            '#lensApp .page.hidden{opacity:0;pointer-events:none;transform:scale(1.03)}' +

            '#lensListPage{background:#050810;overflow-y:auto;scrollbar-width:none;position:absolute;inset:0;-webkit-transform:translateZ(0);transform:translateZ(0)}' +
            '#lensListPage::-webkit-scrollbar{display:none}' +
            '#lensListCanvas{position:absolute;inset:0;z-index:0;pointer-events:none}' +
            '#lensApp .list-content{position:relative;z-index:2;padding:0 0 60px}' +
            '#lensApp .lens-close-float{position:absolute;top:50px;left:20px;z-index:20;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.05);backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .3s;-webkit-transform:translateZ(0);transform:translateZ(0);will-change:transform}' +
            '#lensApp .lens-close-float:active{-webkit-transform:translateZ(0) scale(.9);transform:translateZ(0) scale(.9)}' +
            '#lensApp .lens-close-float svg{width:18px;height:18px;stroke:rgba(255,255,255,.9);fill:none;stroke-width:1.5}' +
            '#lensApp .list-header{text-align:center;padding:70px 30px 40px}' +
            '#lensApp .list-eyebrow{font-family:"Syncopate",sans-serif;font-size:9px;letter-spacing:6px;color:rgba(255,255,255,.45);text-transform:uppercase;margin-bottom:14px}' +
            '#lensApp .list-title-script{font-family:"Playfair Display",serif;font-size:52px;font-weight:400;font-style:italic;color:#fff;line-height:1;text-shadow:0 0 60px rgba(255,255,255,.15);margin-bottom:6px;-webkit-font-smoothing:antialiased}' +
            '#lensApp .list-title-sub{font-family:"IM Fell English",serif;font-size:12px;letter-spacing:3px;color:rgba(255,255,255,.42);font-style:italic;-webkit-font-smoothing:antialiased}' +
            '#lensApp .list-divider{display:flex;align-items:center;justify-content:center;gap:12px;margin:20px auto 0;max-width:200px}' +
            '#lensApp .list-divider-line{flex:1;height:1px;background:linear-gradient(to right,transparent,rgba(255,255,255,.2))}' +
            '#lensApp .list-divider-line.r{background:linear-gradient(to left,transparent,rgba(255,255,255,.2))}' +
            '#lensApp .list-divider-dot{width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,.3)}' +
            '#lensApp .char-list{padding:0 20px;display:flex;flex-direction:column;gap:16px}' +
            '#lensApp .section-label{font-family:"IM Fell English","Cormorant Garamond",serif;font-style:italic;font-size:12px;color:rgba(255,255,255,.45);letter-spacing:3px;text-align:center;padding:20px 0 8px;-webkit-font-smoothing:antialiased}' +
            '#lensApp .char-card{position:relative;overflow:hidden;border-radius:20px;border:1px solid rgba(255,255,255,.12);cursor:pointer;transition:transform .3s ease,border-color .3s ease;min-height:160px;-webkit-transform:translateZ(0);transform:translateZ(0);will-change:transform}' +
            '#lensApp .char-card:active{-webkit-transform:translateZ(0) scale(.98);transform:translateZ(0) scale(.98)}' +
            '#lensApp .char-card-bg{position:absolute;inset:0;background-size:cover;background-position:center top;transition:transform .4s ease;-webkit-transform:translateZ(0);transform:translateZ(0);will-change:transform;image-rendering:-webkit-optimize-contrast}' +
            '#lensApp .char-card-bg::after{content:"";position:absolute;inset:0;background:rgba(0,0,0,0.55);transition:background .4s ease;-webkit-transform:translateZ(0);transform:translateZ(0)}' +
            '#lensApp .char-card:hover .char-card-bg{-webkit-transform:translateZ(0) scale(1.03);transform:translateZ(0) scale(1.03)}' +
            '#lensApp .char-card:hover .char-card-bg::after{background:rgba(0,0,0,0.4)}' +
            '#lensApp .char-card-glass{position:absolute;inset:0;background:linear-gradient(to top,rgba(5,8,16,.9) 0%,rgba(5,8,16,.2) 60%,transparent 100%)}' +
            '#lensApp .char-card-content{position:relative;z-index:2;padding:20px 22px;height:100%;display:flex;flex-direction:column;justify-content:flex-end;min-height:160px}' +
            '#lensApp .char-tag{font-family:"Syncopate",sans-serif;font-size:8px;letter-spacing:3px;color:rgba(255,255,255,.45);margin-bottom:6px;text-transform:uppercase;-webkit-font-smoothing:antialiased}' +
            '#lensApp .char-name-script{font-family:"Playfair Display",serif;font-size:32px;font-style:italic;color:#fff;line-height:1;margin-bottom:4px;text-shadow:0 2px 10px rgba(0,0,0,.5);-webkit-font-smoothing:antialiased}' +
            '#lensApp .char-name-en{font-family:"Syncopate",sans-serif;font-size:9px;letter-spacing:3px;color:rgba(255,255,255,.4);margin-bottom:10px;-webkit-font-smoothing:antialiased}' +
            '#lensApp .char-desc{font-family:"Cormorant Garamond","Noto Serif SC",serif;font-size:14px;font-style:italic;color:rgba(255,255,255,.6);line-height:1.6;max-width:85%;-webkit-font-smoothing:antialiased;letter-spacing:0.3px}' +
            '#lensApp .char-arrow{position:absolute;right:20px;bottom:22px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center}' +
            '#lensApp .char-arrow svg{width:14px;height:14px;stroke:#fff;fill:none;stroke-width:2}' +

            '#lensChatPage{background:#050810;display:flex;flex-direction:column;position:absolute;inset:0}' +
            '#lensChatPage.hidden{transform:translateX(30px)}' +
            '#lensApp .bg-container{position:absolute;inset:0;z-index:0;background-size:cover;background-position:center;-webkit-transform:translateZ(0);transform:translateZ(0);will-change:transform;image-rendering:-webkit-optimize-contrast;transition:transform 1.5s ease}' +
            '#lensApp .bg-dim{position:absolute;inset:0;z-index:0;background:rgba(0,0,0,0.45);pointer-events:none;transition:background .8s ease;-webkit-transform:translateZ(0);transform:translateZ(0)}' +
            '@keyframes lk-deep-breath{0%,100%{transform:scale(1) translateZ(0)}50%{transform:scale(1.04) translateZ(0)}}' +
            '#lensApp .vibe-breathing{animation:lk-deep-breath var(--breath-speed,6s) infinite ease-in-out}' +
            '#lensPartCanvas{position:absolute;inset:0;z-index:1;pointer-events:none}' +
            '#lensApp .app{position:relative;z-index:2;display:flex;flex-direction:column;height:100%}' +

            '#lensApp .header{position:absolute;top:0;left:0;right:0;padding:44px 20px 12px;display:flex;align-items:center;justify-content:space-between;z-index:30}' +
            '#lensApp .hdr-btn{width:40px;height:40px;border-radius:50%;background:var(--lk-glm);backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);border:1px solid var(--lk-gb);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .3s,background var(--lk-tr),border-color var(--lk-tr),box-shadow var(--lk-tr);-webkit-transform:translateZ(0);transform:translateZ(0);will-change:transform;box-shadow:0 2px 12px var(--lk-sh),inset 0 1px 0 var(--lk-ins)}' +
            '#lensApp .hdr-btn:active{-webkit-transform:translateZ(0) scale(.9);transform:translateZ(0) scale(.9)}' +
            '#lensApp .hdr-btn svg{width:18px;height:18px;stroke:var(--lk-ts);fill:none;stroke-width:1.5;transition:stroke var(--lk-tr)}' +
            '#lensApp .hdr-title{position:absolute;left:50%;transform:translateX(-50%);font-family:"Syncopate",sans-serif;font-size:11px;letter-spacing:5px;color:var(--lk-ts);display:flex;align-items:center;gap:6px;-webkit-font-smoothing:antialiased;white-space:nowrap;transition:color var(--lk-tr)}' +
            '#lensApp .hdr-dot{width:5px;height:5px;background:var(--lk-dot);border-radius:50%;animation:lk-slow-pulse 4s infinite ease-in-out;transition:background var(--lk-tr)}' +
            '@keyframes lk-slow-pulse{0%,100%{opacity:.3;box-shadow:none}50%{opacity:.8;box-shadow:0 0 8px rgba(255,255,255,.6)}}' +
            '#lensApp.lens-light .hdr-dot{animation:lk-slow-pulse-lt 4s infinite ease-in-out}' +
            '@keyframes lk-slow-pulse-lt{0%,100%{opacity:.25}50%{opacity:.7}}' +

            '#lensApp .status-zone{position:relative;margin:86px 20px 10px;flex-shrink:0}' +
            '#lensApp .avatar-wrap{position:absolute;top:-22px;left:50%;-webkit-transform:translateX(-50%) translateZ(0);transform:translateX(-50%) translateZ(0);width:44px;height:44px;border-radius:50%;padding:2px;background:var(--lk-glm);backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);border:1px solid var(--lk-gbs);z-index:10;box-shadow:0 6px 16px var(--lk-sh);transition:box-shadow .8s,border-color .8s,background var(--lk-tr);will-change:transform}' +
            '#lensApp .avatar-img{width:100%;height:100%;border-radius:50%;object-fit:cover;filter:grayscale(50%) contrast(1.2) brightness(.9);transition:filter var(--lk-tr)}' +
            '#lensApp.lens-light .avatar-img{filter:grayscale(25%) contrast(1.05) brightness(1)}' +
            '#lensApp .heat-meter{background:var(--lk-glm);backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);border:1px solid var(--lk-gb);border-radius:16px;padding:14px 16px 12px;-webkit-transform:translateZ(0);transform:translateZ(0);box-shadow:0 4px 20px var(--lk-sh),inset 0 1px 0 var(--lk-ins);transition:background var(--lk-tr),border-color var(--lk-tr),box-shadow var(--lk-tr);overflow:hidden;position:relative}' +

            '#lensApp .lk-name-row{display:flex;align-items:center;gap:8px;margin-bottom:12px;position:relative}' +
            '#lensApp .lk-name-wm{position:absolute;left:-4px;top:50%;transform:translateY(-50%);font-family:"Playfair Display",serif;font-style:italic;font-size:38px;font-weight:700;color:var(--lk-gbss);white-space:nowrap;pointer-events:none;letter-spacing:-1px;line-height:1;-webkit-font-smoothing:antialiased;transition:color var(--lk-tr)}' +
            '#lensApp .lk-name-info{flex:1;min-width:0;position:relative;z-index:1}' +
            '#lensApp .lk-name-top-row{display:flex;align-items:center;gap:7px}' +
            '#lensApp .lk-name-text{font-family:"Playfair Display",serif;font-style:italic;font-size:15px;color:var(--lk-t);-webkit-font-smoothing:antialiased;letter-spacing:.3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1;transition:color var(--lk-tr)}' +

            /* heart btn — 贴名字右边，小巧 */
            '#lensApp .lk-heart-btn{width:22px;height:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;position:relative;-webkit-transform:translateZ(0);transform:translateZ(0);transition:transform .3s cubic-bezier(.34,1.56,.64,1)}' +
            '#lensApp .lk-heart-btn:active{-webkit-transform:translateZ(0) scale(.78);transform:translateZ(0) scale(.78)}' +
            '#lensApp .lk-heart-btn svg{width:18px;height:18px;overflow:visible}' +
            '#lensApp .lk-heart-fill{fill:none;stroke:var(--lk-ts);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round;transition:fill .5s,stroke .5s,filter .5s}' +
            '#lensApp .lk-heart-shine{fill:none;stroke:rgba(255,255,255,0);stroke-width:1;transition:stroke .5s}' +
            '#lensApp .lk-heart-btn.beating .lk-heart-fill{fill:rgba(220,50,80,.85);stroke:rgba(240,60,90,.95);filter:drop-shadow(0 0 4px rgba(220,50,80,.6))}' +
            '#lensApp .lk-heart-btn.beating .lk-heart-shine{stroke:rgba(255,255,255,.55)}' +
            '#lensApp .lk-heart-btn.beating{animation:lk-hb .6s cubic-bezier(.34,1.56,.64,1)}' +
            '@keyframes lk-hb{0%{transform:translateZ(0) scale(1)}25%{transform:translateZ(0) scale(1.32)}55%{transform:translateZ(0) scale(.9)}80%{transform:translateZ(0) scale(1.12)}100%{transform:translateZ(0) scale(1)}}' +

            /* status tag — 右边独立一列，方形小卡 */
            '#lensApp .lk-status-tag{display:inline-flex;align-items:center;gap:4px;padding:3px 7px 3px 5px;border-radius:4px;background:var(--lk-gbss);border:1px solid var(--lk-gbss);flex-shrink:0;transition:background .6s,border-color .6s,transform .3s;align-self:flex-end;cursor:pointer;position:relative;z-index:10;-webkit-tap-highlight-color:transparent}' +
            '#lensApp .lk-status-tag:active{transform:scale(0.94)}' +
            '#lensApp .lk-status-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;transition:background .6s,box-shadow .6s}' +
            '#lensApp .lk-status-label{font-family:"Syncopate",sans-serif;font-size:7px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;transition:color .6s;-webkit-font-smoothing:antialiased}' +
            '#lensApp .lk-status-tag.reading .lk-status-dot{background:rgba(180,210,255,.9) !important;box-shadow:0 0 8px rgba(180,210,255,.8) !important;animation:lk-pulse-dot .8s ease-out infinite}' +
            '#lensApp .lk-status-tag.reading .lk-status-label{color:rgba(180,210,255,.9) !important}' +
            '@keyframes lk-pulse-dot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.8);opacity:.6}}' +
            '#lensApp .ecg-voice-box{position:absolute;top:calc(100% + 6px);left:0;display:flex;flex-direction:column;align-items:flex-start;pointer-events:none;width:100%;z-index:5}' +
            '#lensApp .ecg-svg{width:100px;height:24px;overflow:visible;margin-bottom:2px;margin-left:4px}' +
            '#lensApp .ecg-path{fill:none;stroke:rgba(180,210,255,.7);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 3px rgba(180,210,255,.5));stroke-dasharray:150;stroke-dashoffset:150;opacity:0}' +
            '#lensApp .ecg-voice-box.loading .ecg-path{animation:lk-drawEcgLoop 1.2s cubic-bezier(.2,.8,.3,1) infinite}' +
            '@keyframes lk-drawEcgLoop{0%{stroke-dashoffset:150;opacity:0}20%{opacity:1}80%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:-50;opacity:0}}' +
            '#lensApp .ecg-voice-text{font-family:"Cormorant Garamond","Noto Serif SC",serif;font-size:13px;font-style:italic;color:rgba(255,255,255,.55);letter-spacing:0.6px;line-height:1.6;text-align:left;text-shadow:0 1px 3px rgba(0,0,0,.8);opacity:0;transform:translateY(-8px);filter:blur(4px);max-width:90%}' +
            '#lensApp .ecg-voice-box.play .ecg-voice-text{animation:lk-whisper 6s cubic-bezier(.16,1,.3,1) forwards}' +
            '@keyframes lk-whisper{0%{opacity:0;transform:translateY(-8px);filter:blur(4px)}10%,85%{opacity:1;transform:translateY(0);filter:blur(0)}100%{opacity:0;transform:translateY(6px);filter:blur(4px)}}' +

            '#lensApp .lk-voice-modal{position:absolute;bottom:calc(100% + 10px);left:14px;right:14px;background:var(--lk-gl);backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);border:1px solid var(--lk-gb);border-radius:18px;padding:18px 18px 16px;box-shadow:0 16px 48px var(--lk-sh),inset 0 1px 0 var(--lk-ins);z-index:60;animation:lk-voice-in .35s cubic-bezier(.16,1,.3,1);-webkit-transform:translateZ(0);transform:translateZ(0)}' +
            '@keyframes lk-voice-in{0%{opacity:0;transform:translateZ(0) translateY(12px) scale(.96)}100%{opacity:1;transform:translateZ(0) translateY(0) scale(1)}}' +
            '#lensApp .lk-voice-eyebrow{font-family:"Syncopate",sans-serif;font-size:7px;letter-spacing:2px;text-transform:uppercase;color:var(--lk-tss);margin-bottom:8px;-webkit-font-smoothing:antialiased}' +
            '#lensApp .lk-voice-text{font-family:"Cormorant Garamond","Noto Serif SC",serif;font-size:14px;font-style:italic;color:var(--lk-t);line-height:1.7;letter-spacing:.3px;-webkit-font-smoothing:antialiased}' +
            '#lensApp .lk-voice-divider{height:1px;background:var(--lk-gbss);margin:12px 0}' +
            '#lensApp .lk-voice-heat-row{display:flex;align-items:center;justify-content:space-between}' +
            '#lensApp .lk-voice-heat-label{font-family:"Syncopate",sans-serif;font-size:7px;letter-spacing:1.5px;text-transform:uppercase;color:var(--lk-tss)}' +
            '#lensApp .lk-voice-heat-val{font-family:"Syncopate",sans-serif;font-size:10px;font-weight:700;color:var(--lk-t)}' +
            '#lensApp .heat-label{display:flex;justify-content:space-between;font-family:"Space Grotesk",sans-serif;font-size:10px;letter-spacing:3px;color:var(--lk-tss);text-transform:uppercase;margin-bottom:8px;font-weight:700;-webkit-font-smoothing:antialiased;transition:color var(--lk-tr)}' +
            '#lensApp .heat-bar-bg{width:100%;height:4px;background:var(--lk-gbss);border-radius:2px;overflow:hidden;-webkit-transform:translateZ(0);transform:translateZ(0)}' +
            '#lensApp .heat-bar-fill{height:100%;width:0%;border-radius:2px;transition:width .8s cubic-bezier(.16,1,.3,1),background .8s,box-shadow .8s;-webkit-transform:translateZ(0);transform:translateZ(0);will-change:width}' +

            '#lensApp .chat-scroll{flex:1;overflow-y:auto;padding:8px 0 170px;scrollbar-width:none;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;will-change:scroll-position;-webkit-transform:translateZ(0);transform:translateZ(0)}' +
            '#lensApp .chat-scroll::-webkit-scrollbar{display:none}' +
            '#lensApp .msg-row{animation:lk-fadeIn .3s ease-out forwards;opacity:0;contain:layout style;cursor:pointer;-webkit-tap-highlight-color:transparent;-webkit-transform:translateZ(0);transform:translateZ(0)}' +
            '@keyframes lk-fadeIn{to{opacity:1}}' +
            '@keyframes lk-msg-dissolve{' +
                '0%{opacity:1;-webkit-transform:translateZ(0) translateY(0) scale(1);transform:translateZ(0) translateY(0) scale(1);filter:blur(0px)}' +
                '30%{opacity:.7;-webkit-transform:translateZ(0) translateY(-6px) scale(1.01);transform:translateZ(0) translateY(-6px) scale(1.01);filter:blur(0.5px)}' +
                '100%{opacity:0;-webkit-transform:translateZ(0) translateY(-28px) scale(0.92);transform:translateZ(0) translateY(-28px) scale(0.92);filter:blur(5px)}' +
            '}' +
            '#lensApp .msg-ai{padding:8px 18px;margin-bottom:2px}' +

            '#lensApp .narr{font-family:"Noto Serif SC",serif;font-size:13px;color:var(--lk-t);-webkit-font-smoothing:antialiased;letter-spacing:0.3px;background:var(--lk-gl);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);padding:14px 16px;border-radius:12px;border:1px solid var(--lk-gb);border-left:2px solid var(--lk-gbss);box-shadow:0 2px 18px var(--lk-sh),inset 0 1px 0 var(--lk-ins);-webkit-transform:translateZ(0);transform:translateZ(0);transition:background var(--lk-tr),border-color var(--lk-tr),box-shadow var(--lk-tr),color var(--lk-tr)}' +
            '#lensApp .narr .act{display:block;color:var(--lk-ts);font-style:italic;font-weight:200;font-family:"Noto Serif SC",serif;font-size:12px;line-height:1.95;margin-bottom:12px;text-shadow:0 1px 6px rgba(0,0,0,.5),0 2px 10px rgba(0,0,0,.35);transition:color var(--lk-tr)}' +
            '#lensApp .narr .act:last-child{margin-bottom:0}' +
            '@keyframes lk-dlg-appear{0%{opacity:0;letter-spacing:2px}100%{opacity:1;letter-spacing:0.6px}}' +
            '#lensApp .narr .dlg{display:block;color:var(--lk-dlg);font-weight:400;font-family:"Noto Serif SC",serif;font-size:14px;letter-spacing:0.6px;line-height:1.5;margin-bottom:12px;text-shadow:var(--lk-dlgs);animation:lk-dlg-appear 0.45s cubic-bezier(0.16,1,0.3,1) both;will-change:opacity,letter-spacing;-webkit-transform:translateZ(0);transform:translateZ(0);transition:color var(--lk-tr),text-shadow var(--lk-tr)}' +
            '#lensApp .narr .dlg:last-child{margin-bottom:0}' +
            '#lensApp .narr .tension{display:block;color:var(--lk-tens);font-style:italic;border-bottom:1px dashed var(--lk-dsh);font-family:"Cormorant Garamond","Noto Serif SC",serif;font-size:12px;letter-spacing:0.4px;line-height:1.95;margin-top:4px;margin-bottom:10px;padding-bottom:8px;text-shadow:0 1px 5px rgba(0,0,0,.35);transition:color var(--lk-tr),border-color var(--lk-tr)}' +
            '#lensApp .narr .danger{display:block;color:var(--lk-dlg);font-weight:600;font-style:italic;text-shadow:var(--lk-dlgs);font-family:"Noto Serif SC",serif;font-size:14px;letter-spacing:0.6px;line-height:1.5;margin-bottom:10px;transition:color var(--lk-tr),text-shadow var(--lk-tr)}' +

            '#lensApp .msg-user{padding:6px 18px;display:flex;flex-direction:column;align-items:flex-end;margin-bottom:2px}' +
            '#lensApp .user-text{font-family:"Noto Serif SC",serif;font-size:12px;color:var(--lk-ts);font-style:italic;text-align:right;max-width:85%;border-right:2px solid var(--lk-ubr);padding-right:14px;-webkit-font-smoothing:antialiased;line-height:2.0;letter-spacing:0.3px;text-shadow:0 1px 4px rgba(0,0,0,.2);transition:color var(--lk-tr),border-color var(--lk-tr)}' +

            '#lensApp .msg-director{padding:10px 20px;margin-bottom:15px;width:100%;display:flex;justify-content:center}' +
            '#lensApp .director-card{width:100%;position:relative;background:var(--lk-gl);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--lk-gb);border-top:var(--lk-dt);border-radius:12px;padding:20px;box-shadow:0 8px 28px var(--lk-sh),inset 0 1px 0 var(--lk-ins);display:flex;flex-direction:column;align-items:center;text-align:center;transition:background var(--lk-tr),border-color var(--lk-tr),box-shadow var(--lk-tr)}' +
            '#lensApp .dir-header{font-family:"Syncopate",sans-serif;font-size:9px;color:var(--lk-tss);letter-spacing:3px;margin-bottom:15px;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;-webkit-font-smoothing:antialiased;transition:color var(--lk-tr)}' +
            '#lensApp .dir-header::before,#lensApp .dir-header::after{content:"";display:block;width:16px;height:1px;background:var(--lk-gbss);transition:background var(--lk-tr)}' +
            '#lensApp .dir-section{margin-bottom:12px;width:100%}' +
            '#lensApp .dir-section:last-child{margin-bottom:0}' +
            '#lensApp .dir-label{font-family:"Space Grotesk",sans-serif;font-size:9px;color:var(--lk-tss);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;display:block;transition:color var(--lk-tr)}' +
            '#lensApp .dir-scene-text{font-family:"Cormorant Garamond","Noto Serif SC",serif;font-size:14px;color:var(--lk-ts);line-height:1.7;font-style:italic;-webkit-font-smoothing:antialiased;letter-spacing:0.3px;transition:color var(--lk-tr)}' +
            '#lensApp .dir-dlg-text{font-family:"Noto Serif SC",serif;font-size:15px;color:var(--lk-t);line-height:1.7;font-weight:500;-webkit-font-smoothing:antialiased;letter-spacing:0.5px;transition:color var(--lk-tr)}' +

            '#lensApp .typing-indicator{display:none;padding:8px 20px;gap:4px;align-items:center}' +
            '#lensApp .typing-dot{width:4px;height:4px;background:var(--lk-tss);border-radius:50%;animation:lk-typeBounce 1.4s infinite ease-in-out both;transition:background var(--lk-tr)}' +
            '#lensApp .typing-dot:nth-child(1){animation-delay:-.32s}' +
            '#lensApp .typing-dot:nth-child(2){animation-delay:-.16s}' +
            '@keyframes lk-typeBounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1);background:#fff;box-shadow:0 0 5px #fff}}' +
            '#lensApp.lens-light .typing-dot{animation:lk-typeBounce-lt 1.4s infinite ease-in-out both}' +
            '#lensApp.lens-light .typing-dot:nth-child(1){animation-delay:-.32s}' +
            '#lensApp.lens-light .typing-dot:nth-child(2){animation-delay:-.16s}' +
            '@keyframes lk-typeBounce-lt{0%,80%,100%{transform:scale(0)}40%{transform:scale(1);background:rgba(18,12,12,.55);box-shadow:none}}' +

            '#lensApp .bottom-zone{position:absolute;bottom:0;left:0;right:0;padding:0 14px 22px;z-index:20;-webkit-transform:translateZ(0);transform:translateZ(0)}' +
            '#lensApp .bottom-glass{background:var(--lk-glm);backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);border:1px solid var(--lk-gb);border-top:var(--lk-ht);border-radius:28px;padding:14px 14px 12px;box-shadow:0 8px 40px var(--lk-sh),inset 0 1px 0 var(--lk-ins);transition:background var(--lk-tr),border-color var(--lk-tr),box-shadow var(--lk-tr)}' +

            '#lensApp .action-popup{position:absolute;bottom:calc(100% + 12px);left:0;width:100%;max-width:340px;background:var(--lk-gl);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);border:1px solid var(--lk-gb);border-top:var(--lk-ht);border-radius:26px;padding:20px;box-shadow:0 15px 50px var(--lk-sh),inset 0 1px 0 var(--lk-ins);opacity:0;pointer-events:none;-webkit-transform:translateZ(0) translateY(15px) scale(.98);transform:translateZ(0) translateY(15px) scale(.98);transition:opacity .3s cubic-bezier(.16,1,.3,1),transform .3s cubic-bezier(.16,1,.3,1);will-change:opacity,transform;z-index:50}' +
            '#lensApp .action-popup.open{opacity:1;pointer-events:auto;-webkit-transform:translateZ(0) translateY(0) scale(1);transform:translateZ(0) translateY(0) scale(1)}' +
            '#lensApp .edit-capsule{position:absolute;top:80px;left:50%;transform:translateX(-50%) translateY(-20px);background:rgba(20,15,10,.85);border:1px solid rgba(255,220,150,.3);color:rgba(255,220,150,1);padding:8px 18px;border-radius:30px;font-family:"Space Grotesk",sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;display:flex;align-items:center;gap:14px;z-index:100;opacity:0;pointer-events:none;transition:all .3s cubic-bezier(.16,1,.3,1);box-shadow:0 10px 30px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.05);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}' +
            '#lensApp .edit-capsule.show{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0)}' +
            '#lensApp .edit-capsule-btn{background:rgba(255,220,150,.15);border:1px solid rgba(255,220,150,.2);color:rgba(255,220,150,1);border-radius:20px;padding:4px 12px;font-family:"Space Grotesk",sans-serif;font-size:10px;font-weight:700;cursor:pointer;transition:all .2s}' +
            '#lensApp .edit-capsule-btn:active{transform:scale(0.92);background:rgba(255,220,150,.25)}' +
            '#lensApp .ap-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--lk-gbss);transition:border-color var(--lk-tr)}' +
            '#lensApp .ap-title{font-family:"Syncopate",sans-serif;font-size:11px;color:var(--lk-ts);letter-spacing:2px;transition:color var(--lk-tr)}' +
            '#lensApp .ap-close{background:none;border:none;color:var(--lk-tss);font-size:18px;cursor:pointer;transition:color var(--lk-tr)}' +
            '#lensApp .ap-field{margin-bottom:15px}' +
            '#lensApp .ap-field-label{font-family:"Space Grotesk",sans-serif;font-size:10px;color:var(--lk-tss);margin-bottom:6px;display:flex;align-items:center;gap:4px;transition:color var(--lk-tr)}' +
            '#lensApp .ap-textarea{width:100%;background:var(--lk-gll);border:1px solid var(--lk-gb);border-radius:12px;padding:12px;color:var(--lk-t);font-family:"Noto Serif SC",serif;font-size:13px;resize:none;outline:none;transition:border-color .2s,background .2s,color var(--lk-tr);text-align:left;height:60px}' +
            '#lensApp .ap-textarea::placeholder{color:var(--lk-tss);font-style:italic}' +
            '#lensApp .ap-textarea:focus{border-color:var(--lk-gbs);background:var(--lk-glm)}' +
            '#lensApp .ap-send-btn{width:100%;padding:13px;background:var(--lk-sb);border:none;border-radius:50px;color:var(--lk-si);font-family:"Syncopate",sans-serif;font-weight:700;font-size:11px;letter-spacing:2px;cursor:pointer;transition:transform .2s,background var(--lk-tr),color var(--lk-tr);-webkit-transform:translateZ(0);transform:translateZ(0)}' +
            '#lensApp .ap-send-btn:active{-webkit-transform:translateZ(0) scale(.97);transform:translateZ(0) scale(.97)}' +

            '#lensApp .bar-actions{display:flex;justify-content:space-between;margin-bottom:12px;padding:0 10px}' +
            '#lensApp .bar-act-btn{background:none;border:none;color:var(--lk-ts);font-size:11px;font-family:"Space Grotesk",sans-serif;display:flex;align-items:center;gap:6px;cursor:pointer;opacity:.8;transition:opacity .2s,color var(--lk-tr)}' +
            '#lensApp .bar-act-btn:hover{opacity:1}' +
            '#lensApp .bar-act-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2}' +

            '#lensApp .input-row{display:flex;align-items:flex-end;gap:12px}' +
            '#lensApp .add-btn{width:44px;height:44px;border-radius:50%;background:var(--lk-gll);flex-shrink:0;border:1px solid var(--lk-gb);display:flex;align-items:center;justify-content:center;transition:transform .2s,background var(--lk-tr),border-color var(--lk-tr);cursor:pointer;-webkit-transform:translateZ(0);transform:translateZ(0);will-change:transform;box-shadow:0 2px 10px var(--lk-sh),inset 0 1px 0 var(--lk-ins)}' +
            '#lensApp .add-btn:active{-webkit-transform:translateZ(0) scale(.9);transform:translateZ(0) scale(.9)}' +
            '#lensApp .add-btn svg{width:20px;height:20px;stroke:var(--lk-ts) !important;fill:none;stroke-width:2;transition:stroke var(--lk-tr)}' +
            '#lensApp .input-wrap{flex:1;background:var(--lk-gll);border:1px solid var(--lk-gb);border-radius:20px;padding:12px 50px 12px 20px;position:relative;transition:border-color .3s,background .3s;box-shadow:inset 0 1px 0 var(--lk-ins)}' +
            '#lensApp .input-wrap:focus-within{border-color:var(--lk-gbs);background:var(--lk-glm)}' +
            '#lensApp textarea.main-ta{width:100%;background:transparent;border:none;outline:none;color:var(--lk-t);font-family:"Noto Serif SC",serif;font-size:14px;line-height:1.5;resize:none;max-height:100px;display:block;transition:color var(--lk-tr)}' +
            '#lensApp textarea.main-ta::placeholder{color:var(--lk-tss)}' +
            '#lensApp .send-btn{position:absolute;right:6px;bottom:6px;width:32px;height:32px;border-radius:50%;border:none;background:var(--lk-sb);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .2s,background var(--lk-tr),box-shadow var(--lk-tr);box-shadow:0 2px 12px var(--lk-sh2);-webkit-transform:translateZ(0);transform:translateZ(0);will-change:transform}' +
            '#lensApp .send-btn:active{-webkit-transform:translateZ(0) scale(.9);transform:translateZ(0) scale(.9)}' +
            '#lensApp .send-btn svg{width:16px;height:16px;stroke:var(--lk-si);fill:none;stroke-width:2.5;transition:stroke var(--lk-tr)}' +

            '#lensApp .lens-sidebar{position:absolute;top:0;left:0;bottom:0;width:280px;background:var(--lk-glm);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);z-index:100;-webkit-transform:translateX(-100%) translateZ(0);transform:translateX(-100%) translateZ(0);transition:transform .4s cubic-bezier(.16,1,.3,1);border-right:1px solid var(--lk-gb);box-shadow:10px 0 30px var(--lk-sh);display:flex;flex-direction:column;will-change:transform}' +
            '#lensApp .lens-sidebar.open{-webkit-transform:translateX(0) translateZ(0);transform:translateX(0) translateZ(0)}' +
            '#lensApp .sb-header{padding:50px 20px 20px;border-bottom:1px solid var(--lk-gb);display:flex;justify-content:space-between;align-items:center;transition:border-color var(--lk-tr)}' +
            '#lensApp .sb-title{font-family:"Syncopate",sans-serif;font-size:12px;color:var(--lk-t);letter-spacing:2px;transition:color var(--lk-tr)}' +
            '#lensApp .close-btn{background:none;border:none;color:var(--lk-ts);font-size:20px;cursor:pointer;padding:5px;transition:opacity .2s,color var(--lk-tr);opacity:.7}' +
            '#lensApp .close-btn:hover{opacity:1}' +
            '#lensApp .sb-content{padding:30px 20px;flex:1;overflow-y:auto}' +
            '#lensApp .sb-label{font-size:10px;letter-spacing:2px;color:var(--lk-ts);margin-bottom:15px;display:block;transition:color var(--lk-tr)}' +
            '#lensApp .heat-slider{width:100%;margin-bottom:40px;height:4px;background:var(--lk-gb);border-radius:2px;outline:none;-webkit-appearance:none;transition:background var(--lk-tr)}' +
            '#lensApp .heat-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--lk-sb);cursor:pointer;box-shadow:0 0 10px var(--lk-sh)}' +
            '#lensApp .persona-card{background:var(--lk-gll);border:1px solid var(--lk-gb);padding:15px;border-radius:12px;transition:background var(--lk-tr),border-color var(--lk-tr)}' +
            '#lensApp .persona-desc{color:var(--lk-ts);font-size:12px;line-height:1.8;font-family:"Noto Serif SC",serif;opacity:.9;-webkit-font-smoothing:antialiased;letter-spacing:0.3px;transition:color var(--lk-tr)}' +
            '#lensApp .lens-trigger-btn{width:100%;padding:12px;background:var(--lk-gll);border:1px solid var(--lk-gb);border-radius:12px;color:var(--lk-t);font-family:"Syncopate",sans-serif;font-size:10px;letter-spacing:2px;cursor:pointer;text-align:center;margin-top:20px;transition:transform .3s,background var(--lk-tr),color var(--lk-tr),border-color var(--lk-tr);-webkit-transform:translateZ(0);transform:translateZ(0);will-change:transform}' +
            '#lensApp .lens-trigger-btn:active{-webkit-transform:translateZ(0) scale(.96);transform:translateZ(0) scale(.96);background:var(--lk-glm)}' +

            '#lensApp .lens-sb-section{margin-bottom:20px}' +
            '#lensApp .lens-sb-toggle{display:flex;justify-content:space-between;align-items:center;cursor:pointer;padding:10px 0;border-bottom:1px solid var(--lk-gbss);transition:border-color var(--lk-tr)}' +
            '#lensApp .lens-sb-arrow{width:14px;height:14px;stroke:var(--lk-tss);fill:none;stroke-width:2;transition:transform .3s,stroke var(--lk-tr)}' +
            '#lensApp .lens-sb-section.open .lens-sb-arrow{transform:rotate(180deg)}' +
            '#lensApp .lens-sb-body{max-height:0;overflow:hidden;opacity:0;transition:max-height .4s cubic-bezier(.16,1,.3,1),opacity .3s}' +
            '#lensApp .lens-sb-section.open .lens-sb-body{max-height:600px;opacity:1}' +
            '#lensApp .lens-bg-input{width:100%;background:var(--lk-gll);border:1px solid var(--lk-gb);border-radius:10px;padding:10px 12px;color:var(--lk-t);font-size:12px;outline:none;font-family:"Space Grotesk",sans-serif;margin-top:10px;transition:border-color .3s,background var(--lk-tr),color var(--lk-tr)}' +
            '#lensApp .lens-bg-input::placeholder{color:var(--lk-tss)}' +
            '#lensApp .lens-bg-input:focus{border-color:var(--lk-gbs)}' +
            '#lensApp .lens-sb-btn-row{display:flex;gap:8px;margin-top:10px}' +
            '#lensApp .lens-sb-btn-row .lens-trigger-btn{margin-top:0}' +

            '#lensApp .msg-ctx-overlay{position:absolute;inset:0;z-index:998}' +
            '#lensApp .msg-ctx-menu{position:absolute;z-index:999;display:flex;flex-direction:row;align-items:center;gap:2px;padding:6px 8px;background:rgba(10,12,18,.25);backdrop-filter:blur(35px) saturate(130%);-webkit-backdrop-filter:blur(35px) saturate(130%);border:1px solid rgba(255,255,255,.1);border-top:1px solid rgba(255,255,255,.2);border-radius:50px;box-shadow:0 15px 40px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.1);-webkit-transform:translateZ(0);transform:translateZ(0);transform-origin:center top;will-change:transform,opacity;animation:lk-ctx-in .35s cubic-bezier(.16,1,.3,1)}' +
            '@keyframes lk-ctx-in{0%{opacity:0;-webkit-transform:scale(0.85) translateY(-15px);transform:scale(0.85) translateY(-15px)}100%{opacity:1;-webkit-transform:scale(1) translateY(0);transform:scale(1) translateY(0)}}' +
            '#lensApp .msg-ctx-btn{display:flex;flex-direction:row;align-items:center;justify-content:center;gap:7px;padding:10px 18px;cursor:pointer;border-radius:50px;background:transparent;transition:all .25s cubic-bezier(.16,1,.3,1);-webkit-tap-highlight-color:transparent;-webkit-transform:translateZ(0);transform:translateZ(0);will-change:transform;white-space:nowrap;user-select:none;color:rgba(255,255,255,.75)}' +
            '#lensApp .msg-ctx-btn:hover{background:rgba(255,255,255,.08);color:#fff;transform:scale(1.02)}' +
            '#lensApp .msg-ctx-btn:active{transform:scale(0.96);background:rgba(255,255,255,.04)}' +
            '#lensApp .msg-ctx-btn svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0;transition:transform .3s cubic-bezier(.16,1,.3,1),stroke .3s}' +
            '#lensApp .msg-ctx-btn span{font-family:"Space Grotesk",sans-serif;font-size:12px;font-weight:600;letter-spacing:0.5px;white-space:nowrap}' +
            '#lensApp .msg-ctx-sep-v{width:1px;height:16px;background:rgba(255,255,255,.12);border-radius:1px;flex-shrink:0;margin:0 2px}' +
            '#lensApp .msg-ctx-btn.edit:hover{color:rgba(255,220,150,1);background:rgba(255,220,150,.1);box-shadow:0 0 15px rgba(255,220,150,.15)}' +
            '#lensApp .msg-ctx-btn.edit:hover svg{stroke:rgba(255,220,150,1);transform:translateY(-1.5px) rotate(12deg)}' +
            '#lensApp .msg-ctx-btn.regenerate svg{stroke:rgba(180,210,255,.9)}' +
            '#lensApp .msg-ctx-btn.regenerate:hover{color:rgba(190,220,255,1);background:rgba(180,210,255,.12);box-shadow:0 0 15px rgba(180,210,255,.15)}' +
            '#lensApp .msg-ctx-btn.regenerate:hover svg{stroke:rgba(190,220,255,1);transform:translateY(-1.5px) rotate(15deg)}' +
            '#lensApp .msg-ctx-btn.rollback:hover{background:rgba(255,255,255,.08);color:#fff}' +
            '#lensApp .msg-ctx-btn.rollback:hover svg{transform:translateY(-1.5px) translateX(-1.5px)}' +
            '#lensApp .msg-ctx-btn.danger{color:rgba(240,80,80,.85)}' +
            '#lensApp .msg-ctx-btn.danger svg{stroke:rgba(240,80,80,.9)}' +
            '#lensApp .msg-ctx-btn.danger:hover{background:rgba(240,80,80,.15);color:#ff6b6b;box-shadow:0 0 15px rgba(240,80,80,.15)}' +
            '#lensApp .msg-ctx-btn.danger:hover svg{transform:translateY(-1.5px) rotate(-8deg)}' +
            '#lensApp .lk-wb-row{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--lk-gbss)}' +
            '#lensApp .lk-wb-row:last-child{border-bottom:none}' +
            '#lensApp .lk-wb-name{font-family:"Space Grotesk",sans-serif;font-size:11px;font-weight:600;color:var(--lk-ts);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:10px}' +
            '#lensApp .lk-wb-pos{font-family:"Syncopate",sans-serif;font-size:7px;letter-spacing:1px;color:var(--lk-tss);text-transform:uppercase;margin-right:10px;flex-shrink:0}' +
            '#lensApp .lk-wb-toggle{width:32px;height:18px;border-radius:9px;background:var(--lk-gbss);position:relative;cursor:pointer;transition:background .22s;flex-shrink:0}' +
            '#lensApp .lk-wb-toggle.on{background:var(--lk-sb)}' +
            '#lensApp .lk-wb-toggle::after{content:"";position:absolute;top:3px;left:3px;width:12px;height:12px;border-radius:50%;background:var(--lk-si);box-shadow:0 1px 3px rgba(0,0,0,.2);transition:transform .22s cubic-bezier(.16,1,.3,1);opacity:.5}' +
            '#lensApp .lk-wb-toggle.on::after{transform:translateX(14px);opacity:1}' +

            /* ── 🎵 Music Button — 浮动在 Begin 上方，与顶底栏同色调 ── */
            '#lensApp .lk-music-btn{position:absolute !important;bottom:calc(100% + 8px);right:14px;color:var(--lk-ts) !important;background:var(--lk-glm) !important;border:1px solid var(--lk-gb) !important;border-radius:20px;padding:6px 14px !important;backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);box-shadow:0 2px 12px var(--lk-sh),inset 0 1px 0 var(--lk-ins);transition:all .25s cubic-bezier(.16,1,.3,1);font-size:11px !important;z-index:15;cursor:pointer;display:flex;align-items:center;gap:6px;-webkit-tap-highlight-color:transparent}' +
            '#lensApp .lk-music-btn:active{transform:scale(.94);background:var(--lk-gll) !important}' +
            '#lensApp .lk-music-btn svg{stroke:var(--lk-ts) !important;width:14px;height:14px;fill:none;stroke-width:2;transition:stroke var(--lk-tr)}' +
            '#lensApp .lk-music-btn.playing{color:var(--lk-t) !important;background:var(--lk-gll) !important;border-color:var(--lk-gbs) !important;box-shadow:0 2px 12px var(--lk-sh),inset 0 1px 0 var(--lk-ins)}' +
            '#lensApp.lens-light .lk-music-btn.playing{color:var(--lk-t) !important;background:var(--lk-gll) !important;border-color:var(--lk-gbs) !important;box-shadow:0 2px 10px var(--lk-sh),inset 0 1px 0 var(--lk-ins)}' +
            '#lensApp .lk-music-btn.playing svg{stroke:var(--lk-t) !important}' +
            '#lensApp.lens-light .lk-music-btn.playing svg{stroke:var(--lk-t) !important}' +
            '#lensApp .lk-music-btn .lk-music-pulse{position:absolute;top:-2px;right:-2px;width:5px;height:5px;border-radius:50%;background:rgba(180,210,255,.7);box-shadow:0 0 4px rgba(180,210,255,.4);display:none;animation:lk-music-pulse 1.2s infinite ease-in-out}' +
            '#lensApp.lens-light .lk-music-btn .lk-music-pulse{background:rgba(60,100,170,.55);box-shadow:0 0 4px rgba(60,100,170,.25)}' +
            '#lensApp .lk-music-btn.playing .lk-music-pulse{display:block}' +
            '@keyframes lk-music-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:.5}}' +
            '#lensApp .bottom-glass{position:relative}' +

            /* ── 🎵 歌词条（紧贴底栏上边缘，居中显示，兼容亮暗色） ── */
            '#lensApp .lk-lyric-bar{position:absolute;bottom:calc(100% + 4px);left:0;right:0;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0;transform:translateY(4px);transition:opacity .4s,transform .4s;z-index:14;padding:0 20px}' +
            '#lensApp .lk-lyric-bar.visible{opacity:1;transform:translateY(0)}' +
            '#lensApp .lk-lyric-text{font-family:"Cormorant Garamond","Noto Serif SC",serif;font-style:italic;font-size:13px;color:rgba(255,255,255,.55);letter-spacing:.6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;text-align:center;text-shadow:0 1px 6px rgba(0,0,0,.85),0 0 12px rgba(0,0,0,.5)}' +
            '#lensApp.lens-light .lk-lyric-text{color:rgba(30,25,30,.7);text-shadow:0 1px 4px rgba(255,255,255,.6),0 0 10px rgba(255,255,255,.4)}' +
            '@keyframes lk-lyric-fade{0%{opacity:0;transform:translateY(4px);filter:blur(2px)}100%{opacity:1;transform:translateY(0);filter:blur(0)}}' +
            '#lensApp .lk-lyric-text.fade{animation:lk-lyric-fade .5s ease forwards}' +

            /* ── 🎵 Music Panel ── */
            '#lensApp .lk-music-panel{display:none;position:absolute;bottom:0;left:0;right:0;background:rgba(8,10,16,.92);backdrop-filter:blur(50px) saturate(130%);-webkit-backdrop-filter:blur(50px) saturate(130%);border-top:1px solid rgba(255,255,255,.1);border-radius:28px 28px 0 0;padding:0 0 30px;z-index:80;transform:translateY(100%);transition:transform .45s cubic-bezier(.16,1,.3,1);box-shadow:0 -20px 60px rgba(0,0,0,.6)}' +
            '#lensApp .lk-music-panel.mounted{display:block}' +
            '#lensApp .lk-music-panel.open{transform:translateY(0)}' +
            '#lensApp .lk-mp-handle{width:36px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:14px auto 18px;cursor:pointer}' +
            '#lensApp .lk-mp-title{font-family:"Syncopate",sans-serif;font-size:9px;letter-spacing:4px;color:rgba(255,255,255,.4);text-align:center;margin-bottom:18px}' +
            '#lensApp .lk-mp-now{padding:0 20px 16px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:14px;display:flex;align-items:center;gap:12px}' +
            '#lensApp .lk-mp-art{width:46px;height:46px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;position:relative}' +
            '#lensApp .lk-mp-art svg{width:20px;height:20px;stroke:rgba(255,255,255,.35);fill:none;stroke-width:1.5}' +
            '#lensApp .lk-mp-spin{position:absolute;inset:0;border-radius:10px;background:conic-gradient(from 0deg,rgba(180,210,255,.18) 0%,transparent 60%);animation:lk-mp-rotate 3s linear infinite;display:none}' +
            '#lensApp .lk-mp-art.playing .lk-mp-spin{display:block}' +
            '@keyframes lk-mp-rotate{to{transform:rotate(360deg)}}' +
            '#lensApp .lk-mp-trackinfo{flex:1;min-width:0}' +
            '#lensApp .lk-mp-trackname{font-family:"Noto Serif SC",serif;font-size:13px;color:rgba(255,255,255,.85);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px}' +
            '#lensApp .lk-mp-tracksub{font-family:"Space Grotesk",sans-serif;font-size:9px;color:rgba(255,255,255,.3);letter-spacing:.5px}' +
            '#lensApp .lk-mp-ctrl{display:flex;align-items:center;justify-content:center;gap:18px;padding:0 20px 14px}' +
            '#lensApp .lk-mp-ctrlbtn{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s}' +
            '#lensApp .lk-mp-ctrlbtn:active{transform:scale(.9);background:rgba(255,255,255,.1)}' +
            '#lensApp .lk-mp-ctrlbtn svg{width:13px;height:13px;stroke:rgba(255,255,255,.7);fill:none;stroke-width:1.8}' +
            '#lensApp .lk-mp-ctrlbtn.main{width:44px;height:44px;background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.2)}' +
            '#lensApp .lk-mp-ctrlbtn.main svg{width:16px;height:16px;stroke:#fff}' +
            '#lensApp .lk-mp-prog{padding:0 20px 14px;display:flex;align-items:center;gap:10px}' +
            '#lensApp .lk-mp-time{font-family:"Space Grotesk",sans-serif;font-size:9px;color:rgba(255,255,255,.3);width:30px;flex-shrink:0}' +
            '#lensApp .lk-mp-time.r{text-align:right}' +
            '#lensApp .lk-mp-progbg{flex:1;height:3px;background:rgba(255,255,255,.1);border-radius:2px;cursor:pointer;position:relative}' +
            '#lensApp .lk-mp-progfill{height:100%;width:0%;background:linear-gradient(to right,rgba(180,210,255,.5),rgba(180,210,255,.95));border-radius:2px;position:relative;transition:width .15s linear}' +
            '#lensApp .lk-mp-progfill::after{content:"";position:absolute;right:-4px;top:50%;transform:translateY(-50%);width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 0 6px rgba(180,210,255,.6)}' +
            '#lensApp .lk-mp-list{padding:0 14px;max-height:140px;overflow-y:auto;scrollbar-width:none;border-top:1px solid rgba(255,255,255,.06);padding-top:10px}' +
            '#lensApp .lk-mp-list::-webkit-scrollbar{display:none}' +
            '#lensApp .lk-mp-item{display:flex;align-items:center;gap:10px;padding:8px 6px;border-radius:8px;cursor:pointer;transition:background .2s}' +
            '#lensApp .lk-mp-item:active{background:rgba(255,255,255,.06)}' +
            '#lensApp .lk-mp-item.active{background:rgba(180,210,255,.08)}' +
            '#lensApp .lk-mp-itemnum{font-family:"Syncopate",sans-serif;font-size:8px;color:rgba(255,255,255,.25);width:14px;text-align:center;flex-shrink:0}' +
            '#lensApp .lk-mp-item.active .lk-mp-itemnum{color:rgba(180,210,255,.85)}' +
            '#lensApp .lk-mp-itemname{flex:1;min-width:0;font-family:"Noto Serif SC",serif;font-size:12px;color:rgba(255,255,255,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
            '#lensApp .lk-mp-item.active .lk-mp-itemname{color:rgba(255,255,255,.95)}' +
            '#lensApp .lk-mp-itemdel{font-family:"Space Grotesk",sans-serif;font-size:14px;color:rgba(255,255,255,.2);padding:0 4px;cursor:pointer;transition:color .2s;flex-shrink:0}' +
            '#lensApp .lk-mp-itemdel:active{color:rgba(240,80,80,.8)}' +
            '#lensApp .lk-mp-empty{font-family:"Space Grotesk",sans-serif;font-size:10px;color:rgba(255,255,255,.25);text-align:center;padding:20px 0;font-style:italic}' +
            '#lensApp .lk-mp-upload{display:flex;gap:8px;padding:14px 16px 0;border-top:1px solid rgba(255,255,255,.06);margin-top:10px}' +
            '#lensApp .lk-mp-upbtn{flex:1;padding:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:rgba(255,255,255,.55);font-family:"Space Grotesk",sans-serif;font-size:9px;letter-spacing:1.2px;font-weight:600;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .2s}' +
            '#lensApp .lk-mp-upbtn:active{background:rgba(255,255,255,.1);transform:scale(.97)}' +
            '#lensApp .lk-mp-upbtn svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2}' +
            '';
    }

    function buildHTML() {
        var el = document.createElement('div');
        el.id = 'lensApp';
        el.className = 'chat-app-window';
        el.style.cssText = 'font-family:"Space Grotesk",sans-serif;';

        if (!document.getElementById('lens-fonts-link')) {
            var fontLink = document.createElement('link');
            fontLink.id = 'lens-fonts-link';
            fontLink.rel = 'stylesheet';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@200;300;400;700&family=Syncopate:wght@400;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=IM+Fell+English:ital@0;1&display=swap';
            document.head.appendChild(fontLink);
        }

        el.innerHTML = '<style>' + buildCSS() + '</style>' +

            '<div class="page" id="lensListPage">' +
                '<canvas id="lensListCanvas"></canvas>' +
                '<div class="lens-close-float" id="lensCloseHome"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>' +
                '<div class="list-content">' +
                    '<div class="list-header">' +
                        '<div class="list-eyebrow">Choose your companion</div>' +
                        '<div class="list-title-script">Khaos</div>' +
                        '<div class="list-title-sub">Offline Mode · Live Scene</div>' +
                        '<div class="list-divider">' +
                            '<div class="list-divider-line"></div>' +
                            '<div class="list-divider-dot"></div>' +
                            '<div class="list-divider-line r"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="char-list" id="lensCharList"></div>' +
                '</div>' +
            '</div>' +

            '<div class="page hidden" id="lensChatPage">' +
                '<div class="bg-container" id="lensBg"></div>' +
                '<div class="bg-dim" id="lensBgDim"></div>' +
                '<canvas id="lensPartCanvas"></canvas>' +
                '<div class="app">' +
                    '<div class="edit-capsule" id="lensEditCapsule">\u270E EDIT MODE <div style="display:flex;gap:6px;"><button class="edit-capsule-btn" id="lensEditCapSave">SAVE</button><button class="edit-capsule-btn" id="lensEditCapCancel" style="color:rgba(255,255,255,.6);background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.1);">CANCEL</button></div></div>' +
                    '<header class="header">' +
                        '<div class="hdr-btn" id="lensBackBtn"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>' +
                        '<div class="hdr-title">SYNCING<span class="hdr-dot"></span>PROTOCOL</div>' +
                        '<div class="hdr-btn" id="lensSbBtn"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>' +
                    '</header>' +
                    '<div class="status-zone">' +
                        '<div class="ecg-voice-box" id="lkEcgBox">' +
                            '<svg class="ecg-svg" viewBox="0 0 100 24"><path class="ecg-path" d="M 0 12 L 20 12 L 25 5 L 35 20 L 42 12 L 55 12 L 60 8 L 65 16 L 70 12 L 100 12"/></svg>' +
                            '<div class="ecg-voice-text" id="lkEcgText"></div>' +
                        '</div>' +
                        '<div class="avatar-wrap" id="lensAvatarWrap"><img class="avatar-img" id="lensAvatar" src="" alt=""></div>' +
                        '<div class="heat-meter">' +
                            '<div class="lk-name-row">' +
                                '<div class="lk-name-wm" id="lkNameWm"></div>' +
                                '<div class="lk-name-info">' +
                                    '<div class="lk-name-top-row">' +
                                        '<div class="lk-name-text" id="lkNameText"></div>' +
                                        '<div class="lk-heart-btn" id="lkHeartBtn">' +
                                            '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">' +
                                                '<defs>' +
                                                    '<radialGradient id="lkHgOut" cx="50%" cy="60%" r="50%">' +
                                                        '<stop offset="0%" stop-color="rgba(255,255,255,0.18)"/>' +
                                                        '<stop offset="100%" stop-color="rgba(255,255,255,0)"/>' +
                                                    '</radialGradient>' +
                                                '</defs>' +
                                                '<path class="lk-heart-fill" d="M10 16.5C10 16.5 2.5 11.5 2.5 6.5a3.5 3.5 0 0 1 7.5-1 3.5 3.5 0 0 1 7.5 1c0 5-7.5 10-7.5 10z"/>' +
                                                '<path class="lk-heart-shine" d="M5.5 6a1.8 1.8 0 0 1 1.8-1.4" stroke-linecap="round"/>' +
                                            '</svg>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="lk-status-tag" id="lkStatusTag">' +
                                    '<div class="lk-status-dot" id="lkStatusDot"></div>' +
                                    '<span class="lk-status-label" id="lkStatusLabel">COLD</span>' +
                                '</div>' +
                            '</div>' +
                            '<div class="heat-label"><span>Ambiguity Level</span><span id="lensHeatVal">0%</span></div>' +
                            '<div class="heat-bar-bg"><div class="heat-bar-fill" id="lensHeatBar"></div></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="chat-scroll" id="lensChatContainer">' +
                        '<div id="lensTyping" class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>' +
                        '<div id="lensAnchor"></div>' +
                    '</div>' +
                    '<div class="bottom-zone">' +
                        '<div class="action-popup" id="lensPopup">' +
                            '<div class="ap-header"><span class="ap-title">DIRECTOR MODE</span><button class="ap-close" id="lensPopupClose">\u2715</button></div>' +
                            '<div class="ap-field"><div class="ap-field-label">\uD83C\uDFAC ACTION / SCENE</div><textarea class="ap-textarea" id="lensApScene" placeholder="填写动作、环境或旁白..."></textarea></div>' +
                            '<div class="ap-field"><div class="ap-field-label">\uD83D\uDCAC DIALOGUE</div><textarea class="ap-textarea" id="lensApDlg" placeholder="填写角色说的话..."></textarea></div>' +
                            '<button class="ap-send-btn" id="lensPopupSend">EXECUTE</button>' +
                        '</div>' +
                        '<div class="bottom-glass">' +
                            '<button class="bar-act-btn lk-music-btn" id="lensMusicBtn"><svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>Music<span class="lk-music-pulse"></span></button>' +
                            '<div class="bar-actions">' +
                                '<button class="bar-act-btn" id="lensTriggerAI"><svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>Invoke AI</button>' +
                                '<button class="bar-act-btn" id="lensBeginBtn"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>Begin</button>' +
                            '</div>' +
                            '<div class="lk-lyric-bar" id="lensLyricBar"><div class="lk-lyric-text" id="lensLyricText"></div></div>' +
                            '<div class="input-row">' +
                                '<div class="add-btn" id="lensAddBtn"><svg viewBox="0 0 24 24" width="20" height="20" stroke="white" fill="none" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>' +
                                '<div class="input-wrap"><textarea id="lensTinp" class="main-ta" rows="1" placeholder="输入你的回应..."></textarea><button class="send-btn" id="lensSendMain"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +

                    '<div class="lk-music-panel" id="lensMusicPanel">' +
                        '<div class="lk-mp-handle" id="lensMpHandle"></div>' +
                        '<div class="lk-mp-title">NOW PLAYING</div>' +
                        '<div class="lk-mp-now">' +
                            '<div class="lk-mp-art" id="lensMpArt">' +
                                '<div class="lk-mp-spin"></div>' +
                                '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' +
                            '</div>' +
                            '<div class="lk-mp-trackinfo">' +
                                '<div class="lk-mp-trackname" id="lensMpName">— No track loaded —</div>' +
                                '<div class="lk-mp-tracksub">KHAOS · Offline Score</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="lk-mp-prog">' +
                            '<span class="lk-mp-time" id="lensMpCur">0:00</span>' +
                            '<div class="lk-mp-progbg" id="lensMpProgBg"><div class="lk-mp-progfill" id="lensMpProgFill"></div></div>' +
                            '<span class="lk-mp-time r" id="lensMpDur">0:00</span>' +
                        '</div>' +
                        '<div class="lk-mp-ctrl">' +
                            '<div class="lk-mp-ctrlbtn" id="lensMpPrev"><svg viewBox="0 0 24 24"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg></div>' +
                            '<div class="lk-mp-ctrlbtn main" id="lensMpPlay"><svg viewBox="0 0 24 24" id="lensMpPlayIcon"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>' +
                            '<div class="lk-mp-ctrlbtn" id="lensMpNext"><svg viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg></div>' +
                        '</div>' +
                        '<div class="lk-mp-list" id="lensMpList">' +
                            '<div class="lk-mp-empty">— No tracks uploaded —</div>' +
                        '</div>' +
                        '<div class="lk-mp-upload">' +
                            '<button class="lk-mp-upbtn" id="lensMpUpAudio"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>UPLOAD MUSIC</button>' +
                            '<button class="lk-mp-upbtn" id="lensMpUpLrc"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>UPLOAD LYRICS</button>' +
                            '<input type="file" id="lensMpFileAudio" accept="audio/*" multiple style="display:none">' +
                            '<input type="file" id="lensMpFileLrc" accept=".lrc,.txt" style="display:none">' +
                        '</div>' +
                    '</div>' +

                '</div>' +
            '</div>' +

            '<div class="lens-sidebar" id="lensSb">' +
                '<div class="sb-header"><span class="sb-title">SETTINGS</span><button class="close-btn" id="lensSbClose">\u2715</button></div>' +
                '<div class="sb-content">' +
                    '<span class="sb-label">MANUAL HEAT CONTROL</span>' +
                    '<input type="range" class="heat-slider" id="lensHeatSlider" min="0" max="100" value="0">' +

                    /* ── 字数设置 ── */
                    '<div class="lens-sb-section" id="lensTokenCard">' +
                        '<div class="lens-sb-toggle" id="lensTokenToggle">' +
                            '<span class="sb-label" style="margin-bottom:0;">RESPONSE LENGTH</span>' +
                            '<svg class="lens-sb-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>' +
                        '</div>' +
                        '<div class="lens-sb-body">' +
                            '<div style="padding-top:12px;">' +
                                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
                                    '<span style="font-family:\'Space Grotesk\',sans-serif;font-size:9px;letter-spacing:1px;color:var(--lk-tss);text-transform:uppercase;">Max Tokens</span>' +
                                    '<span style="font-family:\'Syncopate\',sans-serif;font-size:10px;font-weight:700;color:var(--lk-t);" id="lensTokenVal">1200</span>' +
                                '</div>' +
                                '<input type="range" class="heat-slider" id="lensTokenSlider" min="200" max="4000" step="100" value="1200" style="margin-bottom:8px;">' +
                                '<div style="display:flex;justify-content:space-between;">' +
                                    '<span style="font-size:9px;color:var(--lk-tss);font-family:\'Space Grotesk\',sans-serif;">200</span>' +
                                    '<span style="font-size:9px;color:var(--lk-tss);font-family:\'Space Grotesk\',sans-serif;">4000</span>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +

                    /* ── 世界书 ── */
                    '<div class="lens-sb-section" id="lensWbCard">' +
                        '<div class="lens-sb-toggle" id="lensWbToggle">' +
                            '<span class="sb-label" style="margin-bottom:0;">WORLD BOOK</span>' +
                            '<svg class="lens-sb-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>' +
                        '</div>' +
                        '<div class="lens-sb-body">' +
                            '<div style="padding-top:10px;" id="lensWbList">' +
                                '<div style="font-family:\'Space Grotesk\',sans-serif;font-size:10px;color:var(--lk-tss);text-align:center;padding:10px 0;opacity:.6;">No world book entries</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +

                    '<div class="lens-sb-section" id="lensPersonaCard">' +
                        '<div class="lens-sb-toggle" id="lensPersonaToggle">' +
                            '<span class="sb-label" style="margin-bottom:0;">CHARACTER PERSONA</span>' +
                            '<svg class="lens-sb-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>' +
                        '</div>' +
                        '<div class="lens-sb-body">' +
                            '<div class="persona-card" style="margin-top:10px;"><p class="persona-desc" id="lensPersonaDesc"></p></div>' +
                        '</div>' +
                    '</div>' +

                    '<div class="lens-sb-section" id="lensBgCard">' +
                        '<div class="lens-sb-toggle" id="lensBgToggle">' +
                            '<span class="sb-label" style="margin-bottom:0;">BACKGROUND IMAGE</span>' +
                            '<svg class="lens-sb-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>' +
                        '</div>' +
                        '<div class="lens-sb-body">' +
                            '<input type="text" class="lens-bg-input" id="lensBgUrl" placeholder="Paste image URL...">' +
                            '<div class="lens-sb-btn-row">' +
                                '<button class="lens-trigger-btn" id="lensBgApply" style="flex:2;">APPLY URL</button>' +
                                '<button class="lens-trigger-btn" id="lensBgReset" style="flex:1;opacity:.6;">RESET</button>' +
                            '</div>' +
                            '<input type="file" id="lensBgUpload" accept="image/*" style="display:none;">' +
                            '<button class="lens-trigger-btn" id="lensBgUploadBtn" style="margin-top:6px;opacity:.85;letter-spacing:1.5px;">\u2191 UPLOAD LOCAL IMAGE</button>' +
                        '</div>' +
                    '</div>' +

                    '<button class="lens-trigger-btn" id="lensSbTriggerAI">INVOKE AI RESPONSE</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(el);
    }

    function loadEntities() {
        ents = [];
        if (typeof ChatDB !== 'undefined' && ChatDB.loadEntities) {
            ChatDB.loadEntities(function (loaded) {
                ents = loaded || [];
                renderCharList();
            });
        } else {
            try { ents = JSON.parse(localStorage.getItem('ca-entities') || '[]'); } catch (e) { ents = []; }
            renderCharList();
        }
    }

    function renderCharList() {
        var list = document.getElementById('lensCharList');
        if (!list) return;
        if (ents.length === 0) {
            list.innerHTML = '<div class="section-label">— No entities found —</div>' +
                '<div style="text-align:center;padding:30px 20px;color:rgba(255,255,255,.4);font-size:12px;font-style:italic;">Create entities in the Chat app first, then come back here to enter immersive mode.</div>';
            return;
        }
        var html = '<div class="section-label">\u2014 Your Entities \u2014</div>';
        ents.forEach(function (ent, idx) {
            var dispName = ent.nickname || ent.name;
            var cardCustomBg = localStorage.getItem('lens-bg-' + ent.id) || '';
            var cardBgUrl = cardCustomBg || DEFAULT_BG;
            var bgStyle = "background-image:url('" + cardBgUrl + "')";
            var desc = ent.persona ? ent.persona.substring(0, 60) + (ent.persona.length > 60 ? '...' : '') : 'AI Entity \u00b7 Tap to begin';
            var tag = String(idx + 1).padStart(3, '0') + ' \u00b7 Entity';
            var nameEn = dispName.toUpperCase().split('').join(' \u00b7 ');
            html += '<div class="char-card" data-ent-id="' + ent.id + '">' +
                '<div class="char-card-bg" style="' + bgStyle + '"></div>' +
                '<div class="char-card-glass"></div>' +
                '<div class="char-card-content">' +
                    '<div class="char-tag">' + tag + '</div>' +
                    '<div class="char-name-script">' + esc(dispName) + '</div>' +
                    '<div class="char-name-en">' + esc(nameEn) + '</div>' +
                    '<div class="char-desc">' + esc(desc) + '</div>' +
                '</div>' +
                '<div class="char-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>' +
            '</div>';
        });
        list.innerHTML = html;
        list.querySelectorAll('.char-card').forEach(function (card) {
            card.addEventListener('click', function () {
                enterChat(card.dataset.entId);
            });
        });
    }

    function initListParticles() {
        var c = document.getElementById('lensListCanvas');
        if (!c) return;
        var cx = c.getContext('2d');
        function lr() { listW = c.width = c.parentElement.clientWidth; listH = c.height = c.parentElement.clientHeight; }
        lr();
        window.addEventListener('resize', lr);
        listParts = [];
        function LP() {
            this.x = Math.random() * listW; this.y = listH + 10;
            this.vy = -(Math.random() * 0.4 + 0.1); this.vx = (Math.random() - 0.5) * 0.2;
            this.r = Math.random() * 1 + 0.3; this.alpha = 0; this.maxAlpha = Math.random() * 0.2 + 0.05;
            this.life = 0; this.maxLife = Math.random() * 600 + 300;
        }
        LP.prototype.update = function () {
            this.x += this.vx; this.y += this.vy; this.life++;
            this.x += Math.sin(this.life * 0.015) * 0.15;
            if (this.life < 80) this.alpha = (this.life / 80) * this.maxAlpha;
            else if (this.life > this.maxLife - 80) this.alpha = ((this.maxLife - this.life) / 80) * this.maxAlpha;
            else this.alpha = this.maxAlpha;
        };
        LP.prototype.draw = function () {
            cx.beginPath(); cx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            cx.fillStyle = 'rgba(255,255,255,' + Math.max(0, this.alpha) + ')'; cx.fill();
        };
        for (var i = 0; i < 40; i++) { var p = new LP(); p.y = Math.random() * listH; p.alpha = Math.random() * 0.25; listParts.push(p); }
        var lastLF = 0;
        function la(ts) {
            if (ts - lastLF < 50) { requestAnimationFrame(la); return; }
            lastLF = ts;
            cx.clearRect(0, 0, listW, listH);
            for (var j = 0; j < listParts.length; j++) {
                listParts[j].update(); listParts[j].draw();
                if (listParts[j].life >= listParts[j].maxLife || listParts[j].y < -10) listParts[j] = new LP();
            }
            requestAnimationFrame(la);
        }
        requestAnimationFrame(la);
    }

    function initChatParticles() {
        var c = document.getElementById('lensPartCanvas');
        if (!c) return;
        chatPartCtx = c.getContext('2d');
        function rs() { chatW = c.width = c.parentElement.clientWidth; chatH = c.height = c.parentElement.clientHeight; }
        rs(); window.addEventListener('resize', rs);
        chatParts = [];
        function CP() {
            this.x = Math.random() * chatW; this.y = chatH + Math.random() * 50;
            this.vx = (Math.random() - 0.5) * 0.3; this.vy = -(Math.random() * 0.6 + 0.2);
            this.radius = Math.random() * 1.5 + 0.5; this.alpha = 0; this.maxAlpha = Math.random() * 0.5 + 0.1;
            this.life = 0; this.maxLife = Math.random() * 400 + 200;
        }
        CP.prototype.update = function () {
            this.x += this.vx; this.y += this.vy; this.life++;
            if (this.life < 60) this.alpha = (this.life / 60) * this.maxAlpha;
            else if (this.life > this.maxLife - 60) this.alpha = ((this.maxLife - this.life) / 60) * this.maxAlpha;
            else this.alpha = this.maxAlpha;
            this.x += Math.sin(this.life * 0.02) * 0.2;
        };
        CP.prototype.draw = function () {
            chatPartCtx.beginPath(); chatPartCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            chatPartCtx.fillStyle = 'rgba(255,255,255,' + Math.max(0, this.alpha) + ')'; chatPartCtx.fill();
        };
        var lastFrame = 0;
        function anim(ts) {
            if (ts - lastFrame < 50) { requestAnimationFrame(anim); return; }
            lastFrame = ts;
            chatPartCtx.clearRect(0, 0, chatW, chatH);
            var maxP = heat < 30 ? 0 : Math.floor(heat * 0.4);
            if (chatParts.length < maxP && Math.random() < 0.2) chatParts.push(new CP());
            for (var i = chatParts.length - 1; i >= 0; i--) {
                chatParts[i].update(); chatParts[i].draw();
                if (chatParts[i].life >= chatParts[i].maxLife || chatParts[i].y < -10) chatParts.splice(i, 1);
            }
            requestAnimationFrame(anim);
        }
        requestAnimationFrame(anim);
    }

    function buildMsgHTML(m, idx) {
        if (m.role === 'user' && m.isDirector) {
            var html = '<div class="msg-row msg-director" data-msg-idx="' + idx + '" data-msg-role="director"><div class="director-card"><div class="dir-header">DIRECTOR OVERRIDE</div>';
            if (m.scene) html += '<div class="dir-section"><span class="dir-label">SCENE</span><div class="dir-scene-text">' + esc(m.scene) + '</div></div>';
            if (m.dlg) html += '<div class="dir-section"><span class="dir-label">DIALOGUE</span><div class="dir-dlg-text">\u201C' + esc(m.dlg) + '\u201D</div></div>';
            html += '</div></div>';
            return html;
        } else if (m.role === 'user') {
            return '<div class="msg-row msg-user" data-msg-idx="' + idx + '" data-msg-role="user"><div class="user-text">' + esc(m.text) + '</div></div>';
        } else {
            return '<div class="msg-row msg-ai" data-msg-idx="' + idx + '" data-msg-role="assistant">' + parseNarr(m.text) + '</div>';
        }
    }

    var lensDisplayLimit = 15;

    function renderConvToDOM(msgs, isLoadMore) {
        var container = document.getElementById('lensChatContainer');
        var typing = document.getElementById('lensTyping');

        var oldHeight = container.scrollHeight;

        while (container.firstChild && container.firstChild !== typing) container.removeChild(container.firstChild);
        if (!msgs.length) return;

        var startIdx = Math.max(0, msgs.length - lensDisplayLimit);
        var visible = msgs.slice(startIdx);

        var html = '';
        if (startIdx > 0) {
            html += '<div class="lens-load-hint" style="text-align:center;padding:20px 0 10px;font-family:\'Syncopate\',sans-serif;font-size:8px;letter-spacing:3px;color:rgba(255,255,255,.25);cursor:pointer;" id="lensLoadMore">— LOAD MORE —</div>';
        }
        for (var i = 0; i < visible.length; i++) {
            html += buildMsgHTML(visible[i], startIdx + i);
        }

        var wrap = document.createElement('div');
        wrap.innerHTML = html;
        var frag = document.createDocumentFragment();
        while (wrap.firstChild) frag.appendChild(wrap.firstChild);
        container.insertBefore(frag, typing);

        if (isLoadMore) {
            container.scrollTop = container.scrollHeight - oldHeight;
        } else {
            scrollBot();
        }

        var loadMoreBtn = document.getElementById('lensLoadMore');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', function() {
                lensDisplayLimit += 15;
                renderConvToDOM(curMessages, true);
            });
        }
    }

    function enterChat(entId) {
        curId = entId;
        curEnt = ents.find(function (e) { return e.id === entId; });
        if (!curEnt) return;
        heat = 0;
        baseDimOpacity = 0.45;
        lensDisplayLimit = 15;
        var dispName = curEnt.nickname || curEnt.name;
        document.getElementById('lensHeatSlider').value = 0;
        document.getElementById('lensHeatVal').innerText = '0%';
        document.getElementById('lensHeatBar').style.width = '0%';

        var customBg = localStorage.getItem('lens-bg-' + entId) || '';
        var bgUrl = customBg || DEFAULT_BG;
        document.getElementById('lensBg').style.background = '';
        document.getElementById('lensBg').style.backgroundImage = "url('" + bgUrl + "')";
        document.getElementById('lensAvatar').src = curEnt.avatar || '';

        var bgInput = document.getElementById('lensBgUrl');
        if (bgInput) bgInput.value = customBg;

        document.getElementById('lensPersonaDesc').innerHTML = '<strong style="color:#fff;font-size:14px;">' + esc(dispName) + '</strong><br><br>' + esc(curEnt.persona || 'AI Entity').replace(/\n/g, '<br>');

        var nameWm = document.getElementById('lkNameWm');
        var nameText = document.getElementById('lkNameText');
        if (nameWm) nameWm.textContent = dispName;
        if (nameText) nameText.textContent = dispName;
        updateStatusTag(0);

        document.getElementById('lensListPage').classList.add('hidden');
        document.getElementById('lensChatPage').classList.remove('hidden');
        document.getElementById('lensBg').classList.remove('vibe-breathing');
        chatParts = [];

        LensDB.load('lens-bg-img-' + entId, function(imgData) {
            var finalUrl;
            if (imgData) {
                document.getElementById('lensBg').style.backgroundImage = "url('" + imgData + "')";
                finalUrl = imgData;
            } else {
                finalUrl = bgUrl;
            }
            detectBgBrightness(finalUrl, applyBrightnessDim);
        });

        function doRender() {
            if (convCache[entId] && convCache[entId].length > 0) {
                curMessages = convCache[entId].slice();
                renderConvToDOM(curMessages);
                LensDB.load('lens-' + entId, function(data) {
                    if (data && Array.isArray(data) && data.length > 0) {
                        convCache[entId] = data;
                        curMessages = data.slice();
                    }
                });
            } else {
                loadConvAsync(entId, function(msgs) {
                    curMessages = msgs.slice();
                    renderConvToDOM(curMessages);
                });
            }
        }

        requestAnimationFrame(doRender);
    }

    function goBack() {
        document.getElementById('lensChatPage').classList.add('hidden');
        document.getElementById('lensListPage').classList.remove('hidden');
        document.getElementById('lensSb').classList.remove('open');
        heat = 0;
        curId = null;
        curEnt = null;
        loadEntities();
    }

    function toggleSB() { document.getElementById('lensSb').classList.toggle('open'); }

    function togglePopup() {
        var p = document.getElementById('lensPopup');
        p.classList.toggle('open');
    }

    function updateHeat(val) {
        heat = parseInt(val, 10);
        document.getElementById('lensHeatVal').innerText = val + '%';
        var hb = document.getElementById('lensHeatBar');
        hb.style.width = val + '%';
        var bg = document.getElementById('lensBg');
        var dim = document.getElementById('lensBgDim');
        var av = document.getElementById('lensAvatarWrap');
        var appEl = document.getElementById('lensApp');
        var isLight = appEl && appEl.classList.contains('lens-light');

        if (val >= 75) {
            hb.style.background = isLight
                ? 'linear-gradient(to right,rgba(18,12,12,.40),rgba(18,12,12,.82))'
                : 'linear-gradient(to right,rgba(255,255,255,.6),#fff)';
            hb.style.boxShadow = isLight ? 'none' : '0 0 20px rgba(255,255,255,.9)';
            bg.style.setProperty('--breath-speed', '3.5s');
            bg.classList.add('vibe-breathing');
            if (dim) dim.style.background = 'rgba(0,0,0,' + Math.min(baseDimOpacity + 0.18, 0.72) + ')';
            av.style.boxShadow = isLight ? '0 0 16px rgba(0,0,0,.12)' : '0 0 25px rgba(255,255,255,.8)';
            av.style.borderColor = isLight ? 'rgba(18,12,12,.35)' : 'rgba(255,255,255,.8)';
        } else if (val >= 40) {
            hb.style.background = isLight
                ? 'linear-gradient(to right,rgba(18,12,12,.22),rgba(18,12,12,.60))'
                : 'linear-gradient(to right,rgba(255,255,255,.4),rgba(255,255,255,.9))';
            hb.style.boxShadow = isLight ? 'none' : '0 0 10px rgba(255,255,255,.6)';
            bg.style.setProperty('--breath-speed', '6s');
            bg.classList.add('vibe-breathing');
            if (dim) dim.style.background = 'rgba(0,0,0,' + Math.min(baseDimOpacity + 0.1, 0.62) + ')';
            av.style.boxShadow = isLight ? '0 0 10px rgba(0,0,0,.07)' : '0 0 12px rgba(255,255,255,.4)';
            av.style.borderColor = isLight ? 'rgba(18,12,12,.22)' : 'rgba(255,255,255,.4)';
        } else {
            hb.style.background = isLight
                ? 'linear-gradient(to right,rgba(18,12,12,.12),rgba(18,12,12,.38))'
                : 'linear-gradient(to right,rgba(255,255,255,.2),rgba(255,255,255,.5))';
            hb.style.boxShadow = isLight ? 'none' : '0 0 5px rgba(255,255,255,.2)';
            bg.classList.remove('vibe-breathing');
            if (dim) dim.style.background = 'rgba(0,0,0,' + baseDimOpacity + ')';
            av.style.boxShadow = isLight ? '0 6px 18px rgba(0,0,0,.06)' : '0 8px 20px rgba(0,0,0,.5)';
            av.style.borderColor = isLight ? 'rgba(18,12,12,.16)' : 'rgba(255,255,255,.25)';
        }
        updateStatusTag(heat);
    }

    var VOICE_LINES = {
        cold: [
            'I have nothing to say to you right now.',
            'The silence between us says more than words could.',
            'Keep your distance. I mean it.',
            'Don\'t mistake my quiet for invitation.',
        ],
        warm: [
            'There\'s something about the way you linger that I find... difficult to ignore.',
            'I won\'t say I was waiting. But I noticed when you arrived.',
            'You\'re closer than you were before. I haven\'t moved away.',
            'My walls are still standing. But there are cracks now.',
        ],
        intense: [
            'Every word you say lands somewhere I thought was sealed shut.',
            'I can\'t decide if I want you closer or if I\'m afraid of what that means.',
            'You make stillness feel dangerous.',
            'Don\'t look at me like that. I\'m not responsible for what happens next.',
        ]
    };

    function updateStatusTag(val) {
        val = parseInt(val, 10) || 0;
        var dot   = document.getElementById('lkStatusDot');
        var label = document.getElementById('lkStatusLabel');
        var tag   = document.getElementById('lkStatusTag');
        if (!dot || !label || !tag) return;

        var cfg;
        if (val >= 75) {
            cfg = { label: 'INTENSE', dotBg: 'rgba(220,50,80,.9)', dotGlow: '0 0 6px rgba(220,50,80,.8)', tagBg: 'rgba(220,50,80,.12)', tagBd: 'rgba(220,50,80,.25)', labelColor: 'rgba(220,50,80,.9)' };
        } else if (val >= 35) {
            cfg = { label: 'WARMING', dotBg: 'rgba(255,160,60,.9)', dotGlow: '0 0 6px rgba(255,160,60,.6)', tagBg: 'rgba(255,160,60,.10)', tagBd: 'rgba(255,160,60,.22)', labelColor: 'rgba(255,140,40,.9)' };
        } else {
            cfg = { label: 'COLD', dotBg: 'var(--lk-tss)', dotGlow: 'none', tagBg: 'var(--lk-gbss)', tagBd: 'var(--lk-gbss)', labelColor: 'var(--lk-tss)' };
        }
        dot.style.background   = cfg.dotBg;
        dot.style.boxShadow    = cfg.dotGlow;
        tag.style.background   = cfg.tagBg;
        tag.style.borderColor  = cfg.tagBd;
        label.style.color      = cfg.labelColor;
        label.textContent      = cfg.label;
    }

    function scrollBot() {
        var a = document.getElementById('lensAnchor');
        if (a) a.scrollIntoView({ behavior: 'smooth' });
    }

    function bindContainerDelegate() {
        var container = document.getElementById('lensChatContainer');
        if (container._delegateBound) return;
        container._delegateBound = true;
        container.addEventListener('click', function(e) {
            var row = e.target.closest('.msg-row');
            if (row) showMsgMenu(row, e);
        });
    }

    function addAIMsg(text, idx, fragment) {
        var d = document.createElement('div');
        d.className = 'msg-row msg-ai';
        d.dataset.msgIdx = (idx !== undefined) ? idx : '';
        d.dataset.msgRole = 'assistant';
        d.innerHTML = parseNarr(text);
        if (fragment) {
            fragment.appendChild(d);
        } else {
            var container = document.getElementById('lensChatContainer');
            var typing = document.getElementById('lensTyping');
            container.insertBefore(d, typing);
            scrollBot();
        }
    }

    function addUserMsg(text, idx, fragment) {
        var d = document.createElement('div');
        d.className = 'msg-row msg-user';
        d.dataset.msgIdx = (idx !== undefined) ? idx : '';
        d.dataset.msgRole = 'user';
        d.innerHTML = '<div class="user-text">' + esc(text) + '</div>';
        if (fragment) {
            fragment.appendChild(d);
        } else {
            var container = document.getElementById('lensChatContainer');
            var typing = document.getElementById('lensTyping');
            container.insertBefore(d, typing);
            scrollBot();
        }
    }

    function addDirectorMsg(scene, dlg, idx, fragment) {
        var d = document.createElement('div');
        d.className = 'msg-row msg-director';
        d.dataset.msgIdx = (idx !== undefined) ? idx : '';
        d.dataset.msgRole = 'director';
        var html = '<div class="director-card"><div class="dir-header">DIRECTOR OVERRIDE</div>';
        if (scene) html += '<div class="dir-section"><span class="dir-label">SCENE</span><div class="dir-scene-text">' + esc(scene) + '</div></div>';
        if (dlg) html += '<div class="dir-section"><span class="dir-label">DIALOGUE</span><div class="dir-dlg-text">\u201C' + esc(dlg) + '\u201D</div></div>';
        html += '</div>';
        d.innerHTML = html;
        if (fragment) {
            fragment.appendChild(d);
        } else {
            var container = document.getElementById('lensChatContainer');
            var typing = document.getElementById('lensTyping');
            container.insertBefore(d, typing);
            scrollBot();
        }
    }

    function showTypingIndicator() {
        document.getElementById('lensTyping').style.display = 'flex';
        scrollBot();
    }

    function hideTypingIndicator() {
        document.getElementById('lensTyping').style.display = 'none';
    }

    function callLensAI(userContent, callback) {
        if (!curEnt) { callback('No entity selected.'); return; }
        var cfg = activeCfg();
        var apiKey = cfg.key || '';
        if (!apiKey) { callback('[ACT]The connection remains silent. No API key has been configured.[/ACT]\n\n[TENS]Configure your API key in the Chat app settings to establish the link.[/TENS]'); return; }

        var modelId = resolveModel(cfg.model);
        var endpoint = normEp(cfg.endpoint);
        var wbBefore = '', wbAfter = '', wbEnd = '';
        try {
            var wbEntries = JSON.parse(localStorage.getItem('wb-entries') || '[]');
            wbEntries.forEach(function(e) {
                if (!e.enabled || e.lensEnabled === false || !e.content) return;
                var txt = '[WORLD LORE: ' + (e.name || '') + ']\n' + e.content;
                if (e.position === 'after_char') wbAfter += txt + '\n\n';
                else if (e.position === 'after_prompt') wbEnd += txt + '\n\n';
                else wbBefore += txt + '\n\n';
            });
        } catch(err) {}
        var systemPrompt = (wbBefore ? wbBefore : '') + buildSystemPrompt(curEnt, heat) + (wbAfter ? '\n\n' + wbAfter : '') + (wbEnd ? '\n\n' + wbEnd : '');

        var saved = curMessages.slice();
        var history = [];
        saved.forEach(function (m) {
            if (m.role === 'user') {
                var content = '';
                if (m.isDirector) {
                    if (m.scene) content += '[SCENE] ' + m.scene + '\n';
                    if (m.dlg) content += '[DIALOGUE] ' + m.dlg;
                } else {
                    content = m.text;
                }
                if (content) history.push({ role: 'user', content: content });
            } else if (m.role === 'assistant') {
                history.push({ role: 'assistant', content: m.text });
            }
        });

        var last30 = history.slice(-30);
        var apiMessages = [{ role: 'system', content: systemPrompt }];
        last30.forEach(function (m) { apiMessages.push(m); });
        if (userContent) {
            var lastApi = apiMessages[apiMessages.length - 1];
            if (!lastApi || lastApi.role !== 'user' || lastApi.content !== userContent) {
                apiMessages.push({ role: 'user', content: userContent });
            }
        }

        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify({
                model: modelId,
                messages: apiMessages,
                max_tokens: parseInt(localStorage.getItem('lens-max-tokens') || '1200', 10),
                temperature: 0.9
            })
        })
        .then(function (res) {
            return res.text().then(function (text) {
                var trimmed = text.trim();
                if (trimmed.charAt(0) === '<') throw new Error('Endpoint returned HTML. Check your API endpoint.');
                var data;
                try { data = JSON.parse(trimmed); } catch (e) { throw new Error('Response not valid JSON.'); }
                if (!res.ok) throw new Error(data.error ? (data.error.message || JSON.stringify(data.error)) : 'HTTP ' + res.status);
                return data;
            });
        })
        .then(function (data) {
            if (data.choices && data.choices[0] && data.choices[0].message) {
                callback(data.choices[0].message.content);
            } else {
                callback('[ACT]The response arrived in an unexpected form.[/ACT]\n\n[TENS]' + JSON.stringify(data).substring(0, 200) + '[/TENS]');
            }
        })
        .catch(function (err) {
            callback('[ACT]A disturbance in the connection.[/ACT]\n\n[TENS]' + esc(err.message) + '[/TENS]');
        });
    }

    function doSendMain() {
        if (!curId) return;
        var heartBtn = document.getElementById('lkHeartBtn');
        if (heartBtn) {
            heartBtn.addEventListener('click', function() {
                heartBtn.classList.add('beating');
                setTimeout(function() { heartBtn.classList.remove('beating'); }, 700);

                var existing = document.getElementById('lkVoiceModal');
                if (existing) { existing.parentNode.removeChild(existing); return; }

                var val = heat;
                var pool = val >= 75 ? VOICE_LINES.intense : val >= 35 ? VOICE_LINES.warm : VOICE_LINES.cold;
                var line = pool[Math.floor(Math.random() * pool.length)];

                var modal = document.createElement('div');
                modal.id = 'lkVoiceModal';
                modal.className = 'lk-voice-modal';

                var dispName = curEnt ? (curEnt.nickname || curEnt.name) : '—';
                modal.innerHTML =
                    '<div class="lk-voice-eyebrow">Inner Voice · ' + esc(dispName) + '</div>' +
                    '<div class="lk-voice-text">\u201C' + esc(line) + '\u201D</div>' +
                    '<div class="lk-voice-divider"></div>' +
                    '<div class="lk-voice-heat-row">' +
                        '<span class="lk-voice-heat-label">Ambiguity</span>' +
                        '<span class="lk-voice-heat-val">' + val + '%</span>' +
                    '</div>';

                var bottomZone = document.querySelector('#lensChatPage .bottom-zone');
                if (bottomZone) bottomZone.appendChild(modal);

                var closeVoice = function(ev) {
                    if (!modal.contains(ev.target) && ev.target !== heartBtn) {
                        if (modal.parentNode) modal.parentNode.removeChild(modal);
                        document.removeEventListener('click', closeVoice);
                    }
                };
                setTimeout(function() { document.addEventListener('click', closeVoice); }, 50);
                setTimeout(function() { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 5000);
            });
        }

        var tinp = document.getElementById('lensTinp');
        var text = tinp.value.trim();
        if (!text) return;
        tinp.value = '';
        tinp.style.height = 'auto';
        pushAndSave({ role: 'user', text: text, isDirector: false });
        addUserMsg(text, curMessages.length - 1);
    }

    function doSendPopup() {
        var s = document.getElementById('lensApScene').value.trim();
        var d = document.getElementById('lensApDlg').value.trim();
        if (!s && !d) return;
        var hotWords = ['靠近', '碰', '摸', '吻', '抱', '抓', '挑衅', '看着你', '灯光', '寂静', '贴近', '耳边'];
        var bonus = 5;
        if (hotWords.some(function (w) { return (s + d).indexOf(w) !== -1; })) bonus = 15;
        var nv = Math.min(heat + bonus, 100);
        document.getElementById('lensHeatSlider').value = nv;
        updateHeat(nv);
        pushAndSave({ role: 'user', text: '', isDirector: true, scene: s, dlg: d });
        addDirectorMsg(s, d, curMessages.length - 1);
        document.getElementById('lensApScene').value = '';
        document.getElementById('lensApDlg').value = '';
        togglePopup();
    }

    function doInvokeAI() {
        if (!curId || !curEnt) return;
        var userContent = '';
        if (curMessages.length > 0) {
            var last = curMessages[curMessages.length - 1];
            if (last.role === 'user') {
                if (last.isDirector) {
                    if (last.scene) userContent += '[SCENE] ' + last.scene + '\n';
                    if (last.dlg) userContent += '[DIALOGUE] ' + last.dlg;
                } else {
                    userContent = last.text;
                }
            } else {
                userContent = 'Continue the scene naturally.';
            }
        } else {
            userContent = '[BEGIN]';
        }
        showTypingIndicator();
        callLensAI(userContent, function (reply) {
            hideTypingIndicator();
            var hotWords2 = ['靠近', '贴', '吻', '抱', '心跳', '呼吸', '颈', '唇', '危险', '占有', '失控'];
            var bonus2 = 3;
            if (hotWords2.some(function (w) { return reply.indexOf(w) !== -1; })) bonus2 = 8;
            var nv2 = Math.min(heat + bonus2, 100);
            document.getElementById('lensHeatSlider').value = nv2;
            updateHeat(nv2);
            pushAndSave({ role: 'assistant', text: reply });
            addAIMsg(reply, curMessages.length - 1);
        });
    }

    function doBegin() {
        if (!curId || !curEnt) return;
        showTypingIndicator();
        callLensAI('[BEGIN] Create a compelling opening scene. Introduce yourself in character with rich atmospheric detail.', function (reply) {
            hideTypingIndicator();
            pushAndSave({ role: 'assistant', text: reply });
            addAIMsg(reply, curMessages.length - 1);
        });
    }

    var ctxMenuEl = null;
    var ctxOverlayEl = null;
    var isRollingBack = false;

    function closeMsgMenu() {
        if (ctxMenuEl && ctxMenuEl.parentNode) ctxMenuEl.parentNode.removeChild(ctxMenuEl);
        if (ctxOverlayEl && ctxOverlayEl.parentNode) ctxOverlayEl.parentNode.removeChild(ctxOverlayEl);
        ctxMenuEl = null;
        ctxOverlayEl = null;
    }

    function showMsgMenu(row, e) {
        if (isRollingBack) return;
        e.stopPropagation();
        closeMsgMenu();
        var idx = parseInt(row.dataset.msgIdx, 10);
        if (isNaN(idx) || idx < 0 || idx >= curMessages.length) return;

        var appEl = document.getElementById('lensApp');
        var appRect = appEl.getBoundingClientRect();

        var overlay = document.createElement('div');
        overlay.className = 'msg-ctx-overlay';
        overlay.addEventListener('click', closeMsgMenu);
        ctxOverlayEl = overlay;

        var msg = curMessages[idx];
        var isAiMsg = msg.role === 'assistant';

        var menu = document.createElement('div');
        menu.className = 'msg-ctx-menu';
        
        var html = 
            '<div class="msg-ctx-btn edit" id="lkCtxEdit">' +
                '<svg viewBox="0 0 24 24"><path d="M12 2.5L16 8.5C16 13.5 14.5 18 12 21.5C9.5 18 8 13.5 8 8.5L12 2.5z"/><path d="M12 2.5V9"/><circle cx="12" cy="10.5" r="1.2"/><path d="M8.5 15.5c2 1.5 5 1.5 7 0"/></svg>' +
                '<span>编辑</span>' +
            '</div>' +
            '<div class="msg-ctx-sep-v"></div>';

        if (isAiMsg) {
            html += 
            '<div class="msg-ctx-btn regenerate" id="lkCtxRegenerate">' +
                '<svg viewBox="0 0 24 24"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M12 8.5l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="currentColor" stroke="none"/></svg>' +
                '<span>重回</span>' +
            '</div>' +
            '<div class="msg-ctx-sep-v"></div>';
        }

        html +=
            '<div class="msg-ctx-btn rollback" id="lkCtxRollback">' +
                '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><polyline points="12 7 12 12 15 15"/></svg>' +
                '<span>回溯</span>' +
            '</div>' +
            '<div class="msg-ctx-sep-v"></div>' +
            '<div class="msg-ctx-btn danger" id="lkCtxDelete">' +
                '<svg viewBox="0 0 24 24"><path d="M4 6h16"/><path d="M9 6V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V6"/><path d="M5.5 6l1.1 13.5A2.5 2.5 0 0 0 9.1 22h5.8a2.5 2.5 0 0 0 2.5-2.5L18.5 6"/><path d="M10 11.5l4 4m0-4l-4 4"/></svg>' +
                '<span>删除</span>' +
            '</div>';

        menu.innerHTML = html;
        ctxMenuEl = menu;

        appEl.appendChild(overlay);
        appEl.appendChild(menu);

        requestAnimationFrame(function() {
            var menuW = menu.offsetWidth || 248;
            var menuH = menu.offsetHeight || 50;
            var rowRect = row.getBoundingClientRect();
            var centerX = rowRect.left - appRect.left + rowRect.width / 2;
            var left = centerX - menuW / 2;
            var top = rowRect.top - appRect.top - menuH - 12;
            if (left < 10) left = 10;
            if (left + menuW > appRect.width - 10) left = appRect.width - menuW - 10;
            if (top < 96) top = rowRect.bottom - appRect.top + 12;
            if (top + menuH > appRect.height - 80) top = rowRect.top - appRect.top - menuH - 12;
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';
        });

        menu.querySelector('#lkCtxEdit').addEventListener('click', function(ev) {
            ev.stopPropagation();
            closeMsgMenu();
            doEditMsg(idx, row);
        });
        if (isAiMsg) {
            menu.querySelector('#lkCtxRegenerate').addEventListener('click', function(ev) {
                ev.stopPropagation();
                closeMsgMenu();
                doRegenerateMsg(idx);
            });
        }
        menu.querySelector('#lkCtxRollback').addEventListener('click', function(ev) {
            ev.stopPropagation();
            closeMsgMenu();
            doRollbackMsg(idx);
        });
        menu.querySelector('#lkCtxDelete').addEventListener('click', function(ev) {
            ev.stopPropagation();
            closeMsgMenu();
            doDeleteMsg(idx);
        });
    }

    function doRegenerateMsg(idx) {
        var msg = curMessages[idx];
        if (!msg || msg.role !== 'assistant') return;
        curMessages.splice(idx, 1);
        saveConv(curId, curMessages);
        reRenderMessages();
        doInvokeAI();
    }

    function doRollbackMsg(idx) {
        if (isRollingBack) return;
        isRollingBack = true;

        var container = document.getElementById('lensChatContainer');
        var rowsToRemove = [];
        container.querySelectorAll('.msg-row').forEach(function(row) {
            var ri = parseInt(row.dataset.msgIdx, 10);
            if (!isNaN(ri) && ri > idx) {
                rowsToRemove.push({ el: row, ri: ri });
            }
        });

        rowsToRemove.sort(function(a, b) { return b.ri - a.ri; });

        var commit = function() {
            try {
                curMessages = curMessages.slice(0, idx + 1);
                saveConv(curId, curMessages);
                reRenderMessages();
            } finally {
                isRollingBack = false;
            }
        };

        if (rowsToRemove.length === 0) {
            commit();
            return;
        }

        var stagger = 55;
        rowsToRemove.forEach(function(item, i) {
            setTimeout(function() {
                item.el.style.pointerEvents = 'none';
                item.el.style.transition = 'none';
                item.el.style.animation = 'lk-msg-dissolve 0.42s cubic-bezier(0.25,0.46,0.45,0.94) forwards';
            }, i * stagger);
        });

        setTimeout(commit, (rowsToRemove.length - 1) * stagger + 460);
    }

    function doDeleteMsg(idx) {
        curMessages.splice(idx, 1);
        saveConv(curId, curMessages);
        reRenderMessages();
    }

    var activeEditIdx = -1;
    function endInlineEdit() {
        activeEditIdx = -1;
        var cap = document.getElementById('lensEditCapsule');
        if (cap) cap.classList.remove('show');
    }

    function doEditMsg(idx, row) {
        if (activeEditIdx !== -1) return;
        var msg = curMessages[idx];
        if (!msg) return;
        activeEditIdx = idx;

        var cap = document.getElementById('lensEditCapsule');
        if (cap) cap.classList.add('show');

        var taStyle = 'width:100%;background:rgba(10,12,18,.6);border:1px solid rgba(255,220,150,.5);border-radius:12px;padding:12px;color:#fff;font-family:"Noto Serif SC",serif;font-size:13px;line-height:1.6;resize:none;outline:none;box-shadow:0 0 15px rgba(255,220,150,.15),inset 0 2px 10px rgba(0,0,0,.5);box-sizing:border-box;overflow:hidden;transition:border-color .3s;';

        if (msg.isDirector) {
            row.innerHTML = '<div style="margin-bottom:6px;font-family:\'Space Grotesk\',sans-serif;font-size:9px;letter-spacing:1.5px;color:rgba(255,255,255,.5);">SCENE</div>' +
                '<textarea class="inline-edit-ta" id="inlineEditScene" style="' + taStyle + '">' + esc(msg.scene || '') + '</textarea>' +
                '<div style="margin:12px 0 6px;font-family:\'Space Grotesk\',sans-serif;font-size:9px;letter-spacing:1.5px;color:rgba(255,255,255,.5);">DIALOGUE</div>' +
                '<textarea class="inline-edit-ta" id="inlineEditDlg" style="' + taStyle + '">' + esc(msg.dlg || '') + '</textarea>';
        } else {
            row.innerHTML = '<textarea class="inline-edit-ta" id="inlineEditTA" style="' + taStyle + '">' + esc(msg.text || '') + '</textarea>';
        }

        row.querySelectorAll('textarea').forEach(function(ta) {
            ta.style.height = 'auto';
            ta.style.height = ta.scrollHeight + 'px';
            ta.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = this.scrollHeight + 'px';
            });
            ta.addEventListener('focus', function() {
                this.style.borderColor = 'rgba(255,220,150,1)';
            });
            ta.addEventListener('blur', function() {
                this.style.borderColor = 'rgba(255,220,150,.5)';
            });
        });
    }

    function reRenderMessages() {
        var container = document.getElementById('lensChatContainer');
        var typing = document.getElementById('lensTyping');
        while (container.firstChild && container.firstChild !== typing) {
            container.removeChild(container.firstChild);
        }
        curMessages.forEach(function(m, idx) {
            if (m.role === 'user') {
                if (m.isDirector) addDirectorMsg(m.scene || '', m.dlg || '', idx);
                else addUserMsg(m.text, idx);
            } else {
                addAIMsg(m.text, idx);
            }
        });
        scrollBot();
    }

    function fetchInnerVoice(cb) {
        if (!curEnt) { cb("..."); return; }
        var cfg = activeCfg();
        var apiKey = cfg.key || '';
        if (!apiKey) { cb("Connection severed..."); return; }
        var modelId = resolveModel(cfg.model);
        var endpoint = normEp(cfg.endpoint);
        var recent = curMessages.slice(-6).map(function(m) {
            var role = m.role === 'user' ? 'User' : (curEnt.nickname || curEnt.name);
            var text = m.isDirector ? (m.scene + ' ' + m.dlg) : m.text;
            return role + ': ' + text;
        }).join('\n');
        var sys = "You are " + (curEnt.nickname || curEnt.name) + ". Based on the recent conversation, output exactly ONE short sentence representing your current unspoken internal thought or feeling. Do NOT use quotes, actions, or tags. Just the raw inner voice.";
        var msgs = [
            { role: 'system', content: sys },
            { role: 'user', content: "Recent context:\n" + recent + "\n\nWhat is your inner thought right now?" }
        ];
        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
            body: JSON.stringify({ model: modelId, messages: msgs, max_tokens: 60, temperature: 0.8 })
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.choices && d.choices[0] && d.choices[0].message) {
                var txt = d.choices[0].message.content.replace(/^["']|["']$/g, '').trim();
                cb(txt);
            } else { cb("..."); }
        })
        .catch(function() { cb("..."); });
    }

    function bindAll() {
        bindContainerDelegate();
        var ecgAnimating = false;
        var statusTagBtn = document.getElementById('lkStatusTag');
        var ecgBox = document.getElementById('lkEcgBox');
        var ecgText = document.getElementById('lkEcgText');
        if (statusTagBtn && ecgBox && ecgText) {
            statusTagBtn.addEventListener('click', function () {
                if (ecgAnimating) return;
                ecgAnimating = true;
                statusTagBtn.classList.add('reading');
                ecgBox.classList.remove('play');
                ecgBox.classList.add('loading');
                ecgText.textContent = '';
                fetchInnerVoice(function(text) {
                    ecgBox.classList.remove('loading');
                    statusTagBtn.classList.remove('reading');
                    ecgText.textContent = '"' + text + '"';
                    void ecgBox.offsetWidth;
                    ecgBox.classList.add('play');
                    setTimeout(function () { 
                        ecgAnimating = false; 
                        ecgBox.classList.remove('play'); 
                    }, 6200);
                });
            });
        }

        document.getElementById('lensCloseHome').addEventListener('click', function () {
            var app = document.getElementById('lensApp');
            app.classList.remove('active');
            app.classList.add('closing');
            setTimeout(function () { app.classList.remove('closing'); }, 400);
        });
        document.getElementById('lensBackBtn').addEventListener('click', goBack);
        document.getElementById('lensSbBtn').addEventListener('click', toggleSB);
        document.getElementById('lensSbClose').addEventListener('click', toggleSB);
        document.getElementById('lensAddBtn').addEventListener('click', togglePopup);
        document.getElementById('lensPopupClose').addEventListener('click', togglePopup);
        document.getElementById('lensPopupSend').addEventListener('click', doSendPopup);
        document.getElementById('lensSendMain').addEventListener('click', doSendMain);

        document.getElementById('lensEditCapSave').addEventListener('click', function() {
            if (activeEditIdx === -1) return;
            var msg = curMessages[activeEditIdx];
            if (msg.isDirector) {
                var scTA = document.getElementById('inlineEditScene');
                var dlTA = document.getElementById('inlineEditDlg');
                msg.scene = scTA ? scTA.value.trim() : '';
                msg.dlg = dlTA ? dlTA.value.trim() : '';
            } else {
                var ta = document.getElementById('inlineEditTA');
                if (ta) msg.text = ta.value.trim();
            }
            curMessages[activeEditIdx] = msg;
            saveConv(curId, curMessages);
            endInlineEdit();
            reRenderMessages();
        });
        document.getElementById('lensEditCapCancel').addEventListener('click', function() {
            endInlineEdit();
            reRenderMessages();
        });
        document.getElementById('lensTriggerAI').addEventListener('click', doInvokeAI);
        document.getElementById('lensBeginBtn').addEventListener('click', doBegin);
        document.getElementById('lensSbTriggerAI').addEventListener('click', function () {
            toggleSB();
            doInvokeAI();
        });

        document.getElementById('lensHeatSlider').addEventListener('input', function () {
            updateHeat(this.value);
        });

        var tinp = document.getElementById('lensTinp');
        tinp.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
        tinp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                doSendMain();
            }
        });

        document.getElementById('lensPersonaToggle').addEventListener('click', function () {
            document.getElementById('lensPersonaCard').classList.toggle('open');
        });
        document.getElementById('lensBgToggle').addEventListener('click', function () {
            document.getElementById('lensBgCard').classList.toggle('open');
        });
        document.getElementById('lensBgApply').addEventListener('click', function () {
            var url = document.getElementById('lensBgUrl').value.trim();
            if (url && curId) {
                localStorage.setItem('lens-bg-' + curId, url);
                LensDB.del('lens-bg-img-' + curId);
                document.getElementById('lensBg').style.backgroundImage = "url('" + url + "')";
                detectBgBrightness(url, applyBrightnessDim);
            }
        });
        document.getElementById('lensBgReset').addEventListener('click', function () {
            if (curId) {
                localStorage.removeItem('lens-bg-' + curId);
                LensDB.del('lens-bg-img-' + curId);
                document.getElementById('lensBg').style.backgroundImage = "url('" + DEFAULT_BG + "')";
                document.getElementById('lensBgUrl').value = '';
                baseDimOpacity = 0.45;
                var resetDim = document.getElementById('lensBgDim');
                if (resetDim) resetDim.style.background = 'rgba(0,0,0,0.45)';
            }
        });
        document.getElementById('lensBgUploadBtn').addEventListener('click', function () {
            document.getElementById('lensBgUpload').click();
        });
        document.getElementById('lensBgUpload').addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file || !curId) return;
            var uploadBtn = document.getElementById('lensBgUploadBtn');
            uploadBtn.textContent = 'PROCESSING...';
            uploadBtn.style.opacity = '0.5';
            var objectUrl = URL.createObjectURL(file);
            var img = new Image();
            img.onload = function () {
                var canvas = document.createElement('canvas');
                var maxS = 1600;
                var w = img.width, h = img.height;
                if (w > maxS) { h = Math.round(h * maxS / w); w = maxS; }
                if (h > maxS) { w = Math.round(w * maxS / h); h = maxS; }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                var dataUrl = canvas.toDataURL('image/jpeg', 0.88);
                URL.revokeObjectURL(objectUrl);
                LensDB.save('lens-bg-img-' + curId, dataUrl, function () {
                    localStorage.removeItem('lens-bg-' + curId);
                    document.getElementById('lensBg').style.backgroundImage = "url('" + dataUrl + "')";
                    document.getElementById('lensBgUrl').value = '';
                    uploadBtn.textContent = '\u2191 UPLOAD LOCAL IMAGE';
                    uploadBtn.style.opacity = '0.85';
                    detectBgBrightness(dataUrl, applyBrightnessDim);
                });
            };
            img.onerror = function () {
                URL.revokeObjectURL(objectUrl);
                uploadBtn.textContent = '\u2191 UPLOAD LOCAL IMAGE';
                uploadBtn.style.opacity = '0.85';
            };
            img.src = objectUrl;
            this.value = '';
        });

        /* ── 字数滑块 ── */
        document.getElementById('lensTokenToggle').addEventListener('click', function () {
            document.getElementById('lensTokenCard').classList.toggle('open');
        });
        document.getElementById('lensTokenSlider').addEventListener('input', function () {
            document.getElementById('lensTokenVal').textContent = this.value;
            localStorage.setItem('lens-max-tokens', this.value);
        });
        var savedTokens = localStorage.getItem('lens-max-tokens');
        if (savedTokens) {
            document.getElementById('lensTokenSlider').value = savedTokens;
            document.getElementById('lensTokenVal').textContent = savedTokens;
        }

        /* ── 世界书 ── */
        document.getElementById('lensWbToggle').addEventListener('click', function () {
            document.getElementById('lensWbCard').classList.toggle('open');
            if (document.getElementById('lensWbCard').classList.contains('open')) {
                renderLensWbList();
            }
        });

        /* ── 🎵 Music Player ── */
        var lensAudio = new Audio();
        var lensTracks = [];
        var lensLyrics = [];
        var lensCurTrack = -1;
        var lensIsPlaying = false;

        try {
            var savedTracks = JSON.parse(localStorage.getItem('lens-music-tracks') || '[]');
            if (Array.isArray(savedTracks)) lensTracks = savedTracks;
            var savedLrc = JSON.parse(localStorage.getItem('lens-music-lyrics') || '[]');
            if (Array.isArray(savedLrc)) lensLyrics = savedLrc;
        } catch(e) {}

        function fmtTime(s) {
            if (!s || isNaN(s)) return '0:00';
            var m = Math.floor(s / 60);
            var ss = Math.floor(s % 60);
            return m + ':' + (ss < 10 ? '0' : '') + ss;
        }

        function renderTrackList() {
            var listEl = document.getElementById('lensMpList');
            if (!lensTracks.length) {
                listEl.innerHTML = '<div class="lk-mp-empty">— No tracks uploaded —</div>';
                return;
            }
            var html = '';
            lensTracks.forEach(function(t, i) {
                var active = (i === lensCurTrack) ? ' active' : '';
                var num = (i === lensCurTrack && lensIsPlaying) ? '▶' : String(i+1).padStart(2,'0');
                html += '<div class="lk-mp-item' + active + '" data-idx="' + i + '">' +
                    '<span class="lk-mp-itemnum">' + num + '</span>' +
                    '<span class="lk-mp-itemname">' + esc(t.name) + '</span>' +
                    '<span class="lk-mp-itemdel" data-del="' + i + '">×</span>' +
                '</div>';
            });
            listEl.innerHTML = html;
            listEl.querySelectorAll('.lk-mp-item').forEach(function(el) {
                el.addEventListener('click', function(e) {
                    if (e.target.classList.contains('lk-mp-itemdel')) {
                        var di = parseInt(e.target.dataset.del, 10);
                        lensTracks.splice(di, 1);
                        if (lensCurTrack === di) { lensAudio.pause(); lensCurTrack = -1; lensIsPlaying = false; }
                        else if (lensCurTrack > di) lensCurTrack--;
                        try { localStorage.setItem('lens-music-tracks', JSON.stringify(lensTracks)); } catch(e) {}
                        renderTrackList();
                        updatePlayerUI();
                        return;
                    }
                    var idx = parseInt(el.dataset.idx, 10);
                    playTrack(idx);
                });
            });
        }

        function playTrack(idx) {
            if (idx < 0 || idx >= lensTracks.length) return;
            lensCurTrack = idx;
            lensAudio.src = lensTracks[idx].url;
            lensAudio.play().then(function() {
                lensIsPlaying = true;
                updatePlayerUI();
            }).catch(function() {
                lensIsPlaying = false;
                updatePlayerUI();
            });
        }

        function togglePlayPause() {
            if (lensCurTrack === -1 && lensTracks.length) { playTrack(0); return; }
            if (!lensAudio.src) return;
            if (lensIsPlaying) { lensAudio.pause(); lensIsPlaying = false; }
            else { lensAudio.play(); lensIsPlaying = true; }
            updatePlayerUI();
        }

        function updatePlayerUI() {
            var musicBtn = document.getElementById('lensMusicBtn');
            var art = document.getElementById('lensMpArt');
            var nameEl = document.getElementById('lensMpName');
            var playIcon = document.getElementById('lensMpPlayIcon');
            var lyricBar = document.getElementById('lensLyricBar');

            if (lensIsPlaying) {
                musicBtn.classList.add('playing');
                art.classList.add('playing');
                playIcon.innerHTML = '<line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/>';
                if (lensLyrics.length) lyricBar.classList.add('visible');
            } else {
                musicBtn.classList.remove('playing');
                art.classList.remove('playing');
                playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
                lyricBar.classList.remove('visible');
            }
            nameEl.textContent = lensCurTrack >= 0 && lensTracks[lensCurTrack] ? lensTracks[lensCurTrack].name : '— No track loaded —';
            renderTrackList();
        }

        lensAudio.addEventListener('timeupdate', function() {
            var cur = lensAudio.currentTime || 0;
            var dur = lensAudio.duration || 0;
            document.getElementById('lensMpCur').textContent = fmtTime(cur);
            document.getElementById('lensMpDur').textContent = fmtTime(dur);
            if (dur) document.getElementById('lensMpProgFill').style.width = (cur / dur * 100) + '%';
            if (lensLyrics.length) {
                var line = '';
                for (var i = 0; i < lensLyrics.length; i++) {
                    if (lensLyrics[i].time <= cur) line = lensLyrics[i].text;
                    else break;
                }
                var txtEl = document.getElementById('lensLyricText');
                if (txtEl.textContent !== '♩ ' + line && line) {
                    txtEl.classList.remove('fade');
                    void txtEl.offsetWidth;
                    txtEl.classList.add('fade');
                    txtEl.textContent = '♩ ' + line;
                }
            }
        });

        lensAudio.addEventListener('ended', function() {
            var next = (lensCurTrack + 1) % lensTracks.length;
            if (lensTracks.length) playTrack(next);
        });

        document.getElementById('lensMusicBtn').addEventListener('click', function(e) {
            e.stopPropagation();
            var panel = document.getElementById('lensMusicPanel');
            if (panel.classList.contains('open')) {
                panel.classList.remove('open');
                setTimeout(function() { panel.classList.remove('mounted'); }, 450);
            } else {
                panel.classList.add('mounted');
                void panel.offsetWidth;
                panel.classList.add('open');
            }
        });
        document.getElementById('lensMpHandle').addEventListener('click', function() {
            var panel = document.getElementById('lensMusicPanel');
            panel.classList.remove('open');
            setTimeout(function() { panel.classList.remove('mounted'); }, 450);
        });
        document.getElementById('lensMpPlay').addEventListener('click', togglePlayPause);
        document.getElementById('lensMpPrev').addEventListener('click', function() {
            if (!lensTracks.length) return;
            playTrack((lensCurTrack - 1 + lensTracks.length) % lensTracks.length);
        });
        document.getElementById('lensMpNext').addEventListener('click', function() {
            if (!lensTracks.length) return;
            playTrack((lensCurTrack + 1) % lensTracks.length);
        });
        document.getElementById('lensMpProgBg').addEventListener('click', function(e) {
            if (!lensAudio.duration) return;
            var rect = this.getBoundingClientRect();
            var pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            lensAudio.currentTime = pct * lensAudio.duration;
        });

        document.getElementById('lensMpUpAudio').addEventListener('click', function() {
            document.getElementById('lensMpFileAudio').click();
        });
        document.getElementById('lensMpFileAudio').addEventListener('change', function(e) {
            var files = e.target.files;
            if (!files.length) return;
            Array.from(files).forEach(function(file) {
                var url = URL.createObjectURL(file);
                lensTracks.push({ name: file.name.replace(/\.[^.]+$/, ''), url: url });
            });
            try { localStorage.setItem('lens-music-tracks', JSON.stringify(lensTracks.map(function(t) { return { name: t.name, url: t.url }; }))); } catch(e) {}
            renderTrackList();
            this.value = '';
        });
        document.getElementById('lensMpUpLrc').addEventListener('click', function() {
            document.getElementById('lensMpFileLrc').click();
        });
        document.getElementById('lensMpFileLrc').addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                var lines = ev.target.result.split('\n');
                var parsed = [];
                lines.forEach(function(line) {
                    var matches = line.match(/\[(\d+):(\d+(?:\.\d+)?)\]/g);
                    if (!matches) return;
                    var text = line.replace(/\[(\d+):(\d+(?:\.\d+)?)\]/g, '').trim();
                    if (!text) return;
                    matches.forEach(function(m) {
                        var mm = m.match(/\[(\d+):(\d+(?:\.\d+)?)\]/);
                        if (mm) {
                            var t = parseInt(mm[1], 10) * 60 + parseFloat(mm[2]);
                            parsed.push({ time: t, text: text });
                        }
                    });
                });
                parsed.sort(function(a, b) { return a.time - b.time; });
                lensLyrics = parsed;
                try { localStorage.setItem('lens-music-lyrics', JSON.stringify(lensLyrics)); } catch(e) {}
            };
            reader.readAsText(file);
            this.value = '';
        });

        renderTrackList();
        updatePlayerUI();
    }

    function renderLensWbList() {
        var listEl = document.getElementById('lensWbList');
        if (!listEl) return;
        var entries = [];
        try { entries = JSON.parse(localStorage.getItem('wb-entries') || '[]'); } catch(e) {}

        if (entries.length === 0) {
            listEl.innerHTML = '<div style="font-family:\'Space Grotesk\',sans-serif;font-size:10px;color:var(--lk-tss);text-align:center;padding:10px 0;opacity:.6;">No world book entries</div>';
            return;
        }

        var html = '';
        entries.forEach(function(entry) {
            var isOn = entry.lensEnabled !== false;
            var posLabel = entry.position === 'after_char' ? 'CHAR' : entry.position === 'after_prompt' ? 'END' : 'PRE';
            html += '<div class="lk-wb-row" data-wb-id="' + entry.id + '">' +
                '<span class="lk-wb-name">' + esc(entry.name || 'Untitled') + '</span>' +
                '<span class="lk-wb-pos">' + posLabel + '</span>' +
                '<div class="lk-wb-toggle' + (isOn ? ' on' : '') + '" data-wb-id="' + entry.id + '"></div>' +
            '</div>';
        });
        listEl.innerHTML = html;

        listEl.querySelectorAll('.lk-wb-toggle').forEach(function(tog) {
            tog.addEventListener('click', function(e) {
                e.stopPropagation();
                var id = tog.dataset.wbId;
                var entries2 = [];
                try { entries2 = JSON.parse(localStorage.getItem('wb-entries') || '[]'); } catch(err) {}
                var ent2 = entries2.find(function(x) { return x.id === id; });
                if (!ent2) return;
                ent2.lensEnabled = !tog.classList.contains('on');
                tog.classList.toggle('on', ent2.lensEnabled);
                localStorage.setItem('wb-entries', JSON.stringify(entries2));
            });
        });
    }

    window.openLensApp = function () {
        if (!built) {
            buildHTML();
            bindAll();
            initListParticles();
            initChatParticles();
            built = true;
        }
        loadEntities();
        var app = document.getElementById('lensApp');
        app.classList.remove('closing');
        app.classList.add('active');

        if (curId) {
            document.getElementById('lensListPage').classList.add('hidden');
            document.getElementById('lensChatPage').classList.remove('hidden');
        } else {
            document.getElementById('lensListPage').classList.remove('hidden');
            document.getElementById('lensChatPage').classList.add('hidden');
        }
    };

})();
