import { bookData } from './data.js';

// --- 2. 状态管理 ---
let state = {
    mode: 'flow', // 'flow' | 'learn'
    level: 3,     // Scaffolding Level (1-5)
    vocabLevel: 'B1', // Vocabulary Proficiency (A1-C2)
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
    "Novice: Full Translation",
    "Beginner: Basic Vocab",
    "Intermediate: Socratic Hints",
    "Advanced: Hard Words Only",
    "Expert: Master Class"
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
            const isGuessMode = (state.level === 3 || state.level === 4) && !state.revealedKeys.includes(k.key);
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
                tip.innerText = k.def.split('；')[0]; // Simple Def
                span.appendChild(tip);
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
};
window.onresize = updateMarkerPosition;
