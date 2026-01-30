import { bookData } from './data.js';

// --- 2. 状态管理 ---
let state = {
    mode: 'flow', // 'flow' | 'learn'
    level: 2,     // Scaffolding Level (1-3)
    vocabLevel: 'A2', // Vocabulary Proficiency (A1-C2)
    activeId: null,
    revealedKeys: []
};

const vocabMap = {
    'A1': 1,
    'A2': 2,
    'B1': 3,
    'B2': 4,
    'C1': 5,
    'C2': 6
};

const levelDescs = [
    "Support: Full Translation",
    "Scaffold: English Hints",
    "Challenge: Pronunciation Only"
];

function updateCollapsedLabel() {
    const modeLabel = state.mode === 'flow' ? 'Flow' : 'Learn';
    const levelLabel = 'Lv' + state.level;
    const vocabLabel = state.vocabLevel;
    const el = document.getElementById('collapsedLabel');
    if (el) el.innerText = `${modeLabel} • ${levelLabel} • ${vocabLabel}`;
}

// --- 3. 核心逻辑 ---

// 新增功能：切换模式
window.switchMode = function (modeName) {
    state.mode = modeName;

    // 1. 更新 Body Class (触发 CSS 变量切换)
    document.body.className = `mode-${modeName}`;

    // 2. 更新按钮状态
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.id === `btn-${modeName}`);
    });

    // 3. 重新渲染 Dashboard (内容完全不同)
    if (state.activeId) {
        renderDashboard(state.activeId);
        syncHighlightsInText(state.activeId);
    }
    updateCollapsedLabel();
}

window.changeLevel = function (lv) {
    state.level = lv;
    document.getElementById('levelCapsule').setAttribute('data-active', lv);
    document.getElementById('levelDesc').innerText = levelDescs[lv - 1];

    document.querySelectorAll('.capsule-btn').forEach((btn, idx) => {
        if (idx + 1 === lv) btn.classList.add('active-text');
        else btn.classList.remove('active-text');
    });

    // 翻译控制
    const allTrans = document.querySelectorAll('.inline-trans');
    const allToggles = document.querySelectorAll('.trans-toggle');
    if (lv === 1) {
        allTrans.forEach(el => el.classList.add('show'));
        allToggles.forEach(el => el.style.opacity = '1');
    } else {
        allTrans.forEach(el => el.classList.remove('show'));
        allToggles.forEach(el => el.style.opacity = '');
    }

    // 更新界面
    if (state.activeId) {
        renderDashboard(state.activeId);
        syncHighlightsInText(state.activeId);
    }
    updateCollapsedLabel();
}

window.changeVocabLevel = function (vLevel) {
    state.vocabLevel = vLevel;

    // Update active highlights
    if (state.activeId) {
        renderDashboard(state.activeId);
        syncHighlightsInText(state.activeId);
    }
    updateCollapsedLabel();
}

// 更新光标位置
function updateMarkerPosition() {
    if (!state.activeId) return;
    const p = document.querySelector(`.paragraph[data-id="${state.activeId}"]`);
    const marker = document.getElementById('focusMarker');

    if (p && marker) {
        marker.style.top = p.offsetTop + 'px';
        marker.style.height = p.offsetHeight + 'px';
        marker.style.opacity = '1';
        marker.classList.add('active');
        // 光标颜色也跟随变量
        marker.style.backgroundColor = 'var(--theme-primary)';
        marker.style.boxShadow = '0 0 15px var(--theme-primary)';
    }
}

// 渲染 Dashboard (核心分流逻辑)
function renderDashboard(id) {
    const data = bookData[id];
    if (!data) return;
    const dashboard = document.getElementById('dashboard');
    let html = '';

    // ================= FLOW MODE =================
    // ================= FLOW MODE =================
    if (state.mode === 'flow') {
        // Empty dashboard for Flow mode (Panel is hidden via CSS)
        dashboard.innerHTML = '';
        return;
    }

    // ================= LEARN MODE =================
    // Removed 'else' because we return early for flow mode creates a cleaner flow
    // Filter by Vocabulary Level (NOT Scaffolding Level)
    const threshold = vocabMap[state.vocabLevel] || 1;
    const activePoints = data.knowledge.filter(k => k.diff >= threshold);


    // Knowledge Cards
    if (activePoints.length > 0) {
        let cardsHtml = activePoints.map(k => {
            // New Mapping:
            // Lv 1: Reveal Mode (Show all)
            // Lv 2 & 3: Guess Mode (Hide defs)

            const isGuessMode = (state.level >= 2) && !state.revealedKeys.includes(k.key);
            const modeClass = isGuessMode ? 'k-guess-mode' : 'k-reveal-mode';

            return `
                    <div class="knowledge-item ${modeClass}" onclick="revealCard(this, '${k.key}')" onmouseenter="highlightWord('${k.key}')" onmouseleave="unhighlightWord('${k.key}')">
                        <div class="k-top">
                            <span class="k-word">${k.word}</span>
                            <span class="k-ipa">${k.ipa}</span>
                        </div>
                        <div class="k-clue">${k.clue}</div>
                        <div class="k-def">${k.def}</div>
                        <div class="k-context">${k.context}</div>
                    </div>
                `;
        }).join('');

        html += `
                <div class="module-card">
                    <div class="module-header">🧠 Knowledge Scaffolding <span>${activePoints.length}</span></div>
                    <div>${cardsHtml}</div>
                </div>
            `;
    }

    // Insight Card
    html += `
            <div class="module-card">
                <div class="module-header">💡 AI Coach Insight</div>
                <div class="insight-body">
                    <span class="insight-tag">${data.insight.tag}</span><br>
                    ${data.insight.text}
                </div>
            </div>
        `;


    dashboard.innerHTML = html;
}

window.revealCard = function (el, key) {
    if (!state.revealedKeys.includes(key)) {
        state.revealedKeys.push(key);
        renderDashboard(state.activeId); // Redraw to update classes cleanly
    }
}

// 文本高亮联动
function syncHighlightsInText(id) {
    const data = bookData[id];
    const para = document.querySelector(`.paragraph[data-id="${id}"]`);

    // Reset
    document.querySelectorAll('.smart-word').forEach(s => {
        s.classList.remove('has-card', 'highlighted');
        // remove old tooltips if any
        const tip = s.querySelector('.peek-tooltip');
        if (tip) tip.remove();
        const inlineDef = s.querySelector('.inline-def-tag');
        if (inlineDef) inlineDef.remove();
    });

    const threshold = vocabMap[state.vocabLevel] || 1;
    const activePoints = data.knowledge.filter(k => k.diff >= threshold);

    activePoints.forEach(k => {
        const span = para.querySelector(`.smart-word[data-key="${k.key}"]`);
        if (span) {
            span.classList.add('has-card');

            // Flow Mode: Add Instant Peek Tooltip
            if (state.mode === 'flow') {
                const tip = document.createElement('div');
                tip.className = 'peek-tooltip';

                // Logic based on Scaffolding Level (1-3)
                // Lv 1: Support - Chinese Definition
                // Lv 2: Scaffold - English Hint (Click to Reveal Chinese)
                // Lv 3: Challenge - IPA Only (Double Click to Reveal Chinese)

                if (state.level === 1) {
                    // Support: Direct Chinese
                    tip.innerText = k.def.split('；')[0];
                } else if (state.level === 2) {
                    // Scaffold: Hint / Clue
                    tip.innerText = k.clue || "Hint?";
                    // Click to reveal logic needs to happen on the SPAN trigger
                    span.onclick = (e) => {
                        e.stopPropagation();
                        tip.innerText = k.def.split('；')[0];
                        span.classList.add('revealed-temporarily');
                    };
                } else if (state.level === 3) {
                    // Challenge: IPA Only
                    tip.innerText = k.ipa || "...";
                    // Double click to reveal
                    span.ondblclick = (e) => {
                        e.stopPropagation();
                        tip.innerText = k.def.split('；')[0];
                    };
                    // Single click might just play audio (mock) or do nothing
                }

                span.appendChild(tip);
            }

            // Learn Mode: Special Text Handlers
            if (state.mode === 'learn') {
                // Remove any existing inline defs first to be safe (handled by general reset above, but innerHTML might persist if appended)
                // Actually the reset above "remove 'has-card'" doesn't remove appended children. 
                // We need to ensure we don't duplicate.
                if (span.querySelector('.inline-def-tag')) span.querySelector('.inline-def-tag').remove();
                if (span.querySelector('.peek-tooltip')) span.querySelector('.peek-tooltip').remove();


                if (state.level === 1) {
                    // Lv 1: Show Chinese Definition IN PLACE (Inline)
                    const defTag = document.createElement('span');
                    defTag.className = 'inline-def-tag';
                    defTag.innerText = ` ${k.def.split('；')[0]}`;
                    span.appendChild(defTag);
                } else if (state.level === 2) {
                    // Lv 2: Show Chinese Definition ON HOVER
                    const tip = document.createElement('div');
                    tip.className = 'peek-tooltip'; // Reuse tooltip style
                    tip.innerText = k.def.split('；')[0];
                    span.appendChild(tip);
                }
                // Lv 3 (Default): Highlight only, interact via Dashboard (No inline/hover text needed, or maybe just IPA?)
                // Keeping Lv 3 clean for now as per "Immersion" logic.
            }
        }
    });

    setTimeout(updateMarkerPosition, 50); // Ensure layout is settled
}

window.highlightWord = function (key) {
    if (state.mode !== 'learn') return;
    const span = document.querySelector(`.paragraph.active .smart-word[data-key="${key}"]`);
    if (span) span.classList.add('highlighted');
}
window.unhighlightWord = function (key) {
    if (state.mode !== 'learn') return;
    const span = document.querySelector(`.paragraph.active .smart-word[data-key="${key}"]`);
    if (span) span.classList.remove('highlighted');
}

window.toggleTrans = function (e, id) {
    e.stopPropagation();
    const transEl = document.getElementById('trans-' + id);
    transEl.classList.toggle('show');
    setTimeout(updateMarkerPosition, 300);
}

// 滚动监听
const readerPanel = document.getElementById('readerPanel');
const paragraphs = document.querySelectorAll('.paragraph');

readerPanel.addEventListener('scroll', () => {
    const checkPoint = window.innerHeight * 0.35;
    let activeEl = null;

    paragraphs.forEach(p => {
        const rect = p.getBoundingClientRect();
        if (rect.top <= checkPoint && rect.bottom >= checkPoint) {
            activeEl = p;
        }
    });

    if (activeEl && activeEl.getAttribute('data-id') !== state.activeId) {
        state.activeId = activeEl.getAttribute('data-id');
        paragraphs.forEach(p => p.classList.remove('active'));
        activeEl.classList.add('active');

        renderDashboard(state.activeId);
        syncHighlightsInText(state.activeId);
        updateMarkerPosition();
    } else if (state.activeId) {
        updateMarkerPosition();
    }
});

// Init
window.onload = () => {
    // IMPORTANT: Set body class FIRST to trigger CSS layout
    document.body.className = 'mode-flow';

    // Then initialize state and UI
    state.mode = 'flow';
    state.activeId = 'p1';
    document.querySelector('[data-id="p1"]').classList.add('active');

    // Render initial content
    renderDashboard('p1');
    syncHighlightsInText('p1');

    // Ensure marker updates after layout settles
    setTimeout(updateMarkerPosition, 100);
    updateCollapsedLabel();
    injectAskTriggers();

    // Global click listener to close Ask Bubble
    document.addEventListener('click', (e) => {
        const bubble = document.querySelector('.ask-bubble.show');
        if (bubble && !bubble.contains(e.target) && !e.target.closest('.ask-trigger')) {
            bubble.classList.remove('show');
            // Reset layout
            document.body.classList.remove('ask-mode');
        }
    });
};
window.onresize = updateMarkerPosition;

// --- Ask AI Logic ---
function injectAskTriggers() {
    document.querySelectorAll('.paragraph').forEach(p => {
        // Prevent double injection
        if (p.querySelector('.ask-trigger')) return;

        const id = p.getAttribute('data-id');

        // Trigger Button
        const btn = document.createElement('div');
        btn.className = 'ask-trigger';
        btn.innerHTML = '✨';
        btn.title = "Ask AI about this paragraph";
        btn.onclick = (e) => toggleAsk(e, id);

        // Chat Bubble Container
        const bubble = document.createElement('div');
        bubble.className = 'ask-bubble';
        bubble.id = `ask-bubble-${id}`;
        bubble.innerHTML = `
            <div class="ask-history" id="ask-history-${id}"></div>
            <input type="text" class="ask-input" placeholder="Ask anything..." onkeydown="handleAskInput(event, '${id}')">
        `;

        p.appendChild(btn);
        p.appendChild(bubble);
    });
}

window.toggleAsk = function (e, id) {
    e.stopPropagation();

    // Check if clicking the same trigger again (to close)
    const targetBubble = document.getElementById(`ask-bubble-${id}`);
    const wasOpen = targetBubble.classList.contains('show');

    // Close all
    document.querySelectorAll('.ask-bubble.show').forEach(b => b.classList.remove('show'));
    document.body.classList.remove('ask-mode');

    if (!wasOpen) {
        // Open Target
        targetBubble.classList.add('show');
        document.body.classList.add('ask-mode');

        const input = targetBubble.querySelector('input');
        setTimeout(() => input.focus(), 100);

        // If empty history, add greeting
        const history = document.getElementById(`ask-history-${id}`);
        if (history.innerHTML === '') {
            addMsg(id, 'ai', "Any questions about this paragraph? I'm listening.");
        }
    }
}

window.handleAskInput = function (e, id) {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
        const text = e.target.value.trim();
        addMsg(id, 'user', text);
        e.target.value = '';

        // Mock AI Response
        setTimeout(() => {
            const responses = [
                "That's a great question! In this context, it implies...",
                "Notice the subtle irony here. The author is suggesting...",
                "Historically, this represents the social norms of the era.",
                "Yes, exactly! It highlights the character's motivation."
            ];
            const randomResp = responses[Math.floor(Math.random() * responses.length)];
            addMsg(id, 'ai', randomResp);
        }, 800);
    }
}

function addMsg(id, role, text) {
    const history = document.getElementById(`ask-history-${id}`);
    const div = document.createElement('div');
    div.className = role === 'user' ? 'msg-user' : 'msg-ai';
    div.innerText = text;
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
}
