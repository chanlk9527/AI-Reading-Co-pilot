import { bookData } from './data.js';
import { aiService } from './ai.js';

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
            // Lv 1 & 2: Reveal Mode (Show all) - Learn Mode Lv2 now shows full details
            // Lv 3: Guess Mode (Socratic Blur) - Only Lv3 hides defs

            const isGuessMode = (state.level >= 3) && !state.revealedKeys.includes(k.key);
            const modeClass = isGuessMode ? 'k-guess-mode' : 'k-reveal-mode';

            return `
                    <div class="knowledge-item ${modeClass}" data-key="${k.key}" onclick="revealCard(this, '${k.key}')" onmouseenter="highlightWord('${k.key}')" onmouseleave="unhighlightWord('${k.key}')">
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
                // Reverse Highlighting: Hover Text -> Highlight Card
                span.onmouseenter = () => highlightCard(k.key);
                span.onmouseleave = () => unhighlightCard(k.key);

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

window.highlightCard = function (key) {
    if (state.mode !== 'learn') return;
    // Find the card in the dashboard? Dashboard is rebuilt often but usually stable when reading.
    // We need to match by something? Wait, `renderDashboard` creates cards but key isn't stored in attribute?
    // Let's check `renderDashboard`. It passes `key` to `onclick` but maybe add `data-key` attribute to `.knowledge-item`?
    // Since I can't easily change renderDashboard in this tool call without replacing it all, 
    // I will assume I need to ADD data-key to renderDashboard first or try to find by onclick content? 
    // No, better to update renderDashboard.
    // BUT, I can select by onclick attribute as a hack or better yet, I should update `renderDashboard` separately.
    // For now, I'll add the functions and placeholder logic, then update renderDashboard in next step.
    const card = document.querySelector(`.knowledge-item[data-key="${key}"]`);
    if (card) {
        card.classList.add('active-card-highlight');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Auto-scroll to card!
    }
}
window.unhighlightCard = function (key) {
    if (state.mode !== 'learn') return;
    const card = document.querySelector(`.knowledge-item[data-key="${key}"]`);
    if (card) card.classList.remove('active-card-highlight');
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

    // Modal Click Outside
    document.getElementById('importModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('importModal')) closeImportModal();
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

        // If empty history, add greeting and chips
        const history = document.getElementById(`ask-history-${id}`);
        if (history.innerHTML === '') {
            addMsg(id, 'ai', "有什么我可以帮您的？");
            addSuggestionChips(id);
        }
    }
}

// Chips Data
const suggestionChips = [
    { label: "👶 简单解释", prompt: "请像给5岁孩子讲故事一样，简单解释这段话在说什么。" },
    { label: "🤯 深度解析", prompt: "请深度解析这段话的逻辑和语境，帮我建立 mental model。" },
    { label: "📐 语法拆解", prompt: "请用中文分析这段话的语法结构，拆解长难句。" },
    { label: "💎 地道表达", prompt: "这段话里有哪些值得积累的地道表达或搭配？" }
];

function addSuggestionChips(id) {
    const history = document.getElementById(`ask-history-${id}`);
    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'suggestion-chips';

    suggestionChips.forEach(chip => {
        const btn = document.createElement('button');
        btn.className = 'ask-chip';
        btn.innerText = chip.label;
        btn.onclick = (e) => {
            e.stopPropagation(); // Prevent closing the bubble
            handleChipClick(id, chip.prompt);
        }
        chipsContainer.appendChild(btn);
    });

    history.appendChild(chipsContainer);
    // Scroll to bottom
    history.scrollTop = history.scrollHeight;
}

window.handleChipClick = function (id, text) {
    // 1. Remove the chips container (optional, or keep it? usually remove to declutter)
    // Let's remove ONLY the chips container to transform it into the user message
    const history = document.getElementById(`ask-history-${id}`);
    const chips = history.querySelector('.suggestion-chips');
    if (chips) chips.remove();

    // 2. Treat as user input via handleAskInput simulation
    // We can reuse the logic in handleAskInput but it expects an event. 
    // Let's extract the core logic of handleAskInput into `processUserQ`
    processUserQuestion(id, text);
}

// Refactored from handleAskInput to support direct calls
function processUserQuestion(id, text) {
    addMsg(id, 'user', text);

    // Get context (Paragraph text)
    const pText = document.querySelector(`.paragraph[data-id="${id}"] .para-text`).innerText;
    const systemPrompt = `You are an expert reading coach. The user is reading a paragraph. 
    Context Paragraph: "${pText}".
    Answer the user's question briefly and helpfully using **Chinese** (you may use English for specific terms or examples). 
    **Constraint: Keep your answer under 80 words and very concise.**
    Focus on vocabulary, nuance, and comprehension.`;

    // Call AI Service
    aiService.chat(systemPrompt, text)
        .then(reply => {
            addMsg(id, 'ai', reply);
        })
        .catch(err => {
            console.error(err);
            if (err.message.includes("Key is missing")) {
                addMsg(id, 'ai', "⚠️ Please set your API Key in `js/config.js` to enable real AI features.");
            } else {
                addMsg(id, 'ai', "Sorry, I encountered an error: " + err.message);
            }
        });
}

window.handleAskInput = function (e, id) {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
        const text = e.target.value.trim();
        processUserQuestion(id, text);
        e.target.value = '';
    }
}

function addMsg(id, role, text) {
    const history = document.getElementById(`ask-history-${id}`);
    const div = document.createElement('div');
    div.className = role === 'user' ? 'msg-user' : 'msg-ai';

    // Use Marked to parse Markdown if available, otherwise fallback to text
    if (typeof marked !== 'undefined' && role === 'ai') {
        div.innerHTML = marked.parse(text);
    } else {
        div.innerText = text;
    }

    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
}

function removeThinking(id) {
    const history = document.getElementById(`ask-history-${id}`);
    const thinking = history.querySelector('.msg-thinking');
    if (thinking) thinking.remove();
}

// --- Import Logic ---
window.openImportModal = function () {
    const modal = document.getElementById('importModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
};

window.closeImportModal = function () {
    const modal = document.getElementById('importModal');
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
};

window.switchTab = function (tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    const btns = document.querySelectorAll('.tab-btn');
    if (tab === 'text') btns[0].classList.add('active');
    else btns[1].classList.add('active');

    document.getElementById(`tab-${tab}`).classList.add('active');
};

window.processImport = function () {
    const isText = document.getElementById('tab-text').classList.contains('active');
    const loading = document.getElementById('importLoading');

    loading.classList.remove('hidden');

    // Simulation delay
    setTimeout(() => {
        loading.classList.add('hidden');
        closeImportModal();

        if (isText) {
            const rawText = document.getElementById('importText').value;
            if (rawText.trim()) loadTextContent(rawText);
        } else {
            // URL Mode (Mock)
            loadUrlContent();
        }
    }, 600);
};

function loadTextContent(text) {
    const reader = document.querySelector('.reader-content');
    reader.innerHTML = '';

    const paragraphs = text.split(/\n+/).filter(p => p.trim() !== '');

    paragraphs.forEach((pText, index) => {
        const id = `user-p${index}`;
        const div = document.createElement('div');
        div.className = 'paragraph';
        div.setAttribute('data-id', id);

        // Mock Scaffolding: highlight random words from a small dict
        const enrichedHTML = mockClientInfo(pText, id);

        div.innerHTML = `
             <div class="para-text">${enrichedHTML}</div>
             <!-- No pre-translated Chinese for user content in this demo -->
        `;
        reader.appendChild(div);
    });

    // Re-inject dependencies
    injectAskTriggers();
    updateMarkerPosition();
    // Scroll to top
    window.scrollTo(0, 0);

    // Notify
    alert("Content Imported! AI Scaffolding applied (Demo Mode).");
}

function loadUrlContent() {
    // In a real app, this would fetch. Here we load a "Steve Jobs" demo.
    const reader = document.querySelector('.reader-content');
    reader.innerHTML = '';

    // Static demo content for "Steve Jobs Commencement Speech"
    const demoData = [
        { id: "sj1", text: "I am honored to be with you today at your commencement from one of the finest universities in the world." },
        { id: "sj2", text: "I never graduated from college. Truth be told, this is the closest I've ever gotten to a college graduation." },
        { id: "sj3", text: "Today I want to tell you three stories from my life. That's it. No big deal. Just three stories." }
    ];

    demoData.forEach(item => {
        const div = document.createElement('div');
        div.className = 'paragraph';
        div.setAttribute('data-id', item.id);

        // Use the same mock highlighter
        const enrichedHTML = mockClientInfo(item.text, item.id);
        div.innerHTML = `<div class="para-text">${enrichedHTML}</div>`;
        reader.appendChild(div);
    });

    injectAskTriggers();
    updateMarkerPosition();
    window.scrollTo(0, 0);
}

// Simple Client-side Dictionary for Demo
const demoDict = {
    "honored": { def: "荣幸", clue: "Privileged / Proud" },
    "commencement": { def: "毕业典礼", clue: "Graduation ceremony" },
    "universities": { def: "大学", clue: "Higher education institutions" },
    "graduated": { def: "毕业", clue: "Finished school" },
    "truth": { def: "真相", clue: "Fact" },
    "closest": { def: "最接近的", clue: "Nearest" },
    "graduation": { def: "毕业", clue: "Completing a degree" },
    "stories": { def: "故事", clue: "Tales / Narratives" }
};

function mockClientInfo(text, pid) {
    let html = text;
    // Basic replace - Case insensitive
    Object.keys(demoDict).forEach(word => {
        const regex = new RegExp(`\\b(${word})\\b`, 'gi');
        html = html.replace(regex, (match) => {
            // Register Knowledge
            if (!bookData[pid]) bookData[pid] = { knowledge: [], insight: null };

            // Check if already registered
            const exists = bookData[pid].knowledge.find(k => k.key === word);
            if (!exists) {
                bookData[pid].knowledge.push({
                    key: word,
                    diff: 2, // Default med
                    word: match, // Preserve case
                    ipa: "/.../",
                    def: demoDict[word].def,
                    clue: demoDict[word].clue,
                    context: "Context..."
                });
            }

            return `<span class="smart-word" data-key="${word}">${match}</span>`;
        });
    });
    return html;
}
