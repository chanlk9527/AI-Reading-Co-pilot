import { bookData } from './data.js';
import { aiService } from './ai.js';
import { ttsService } from './tts.js';
import { textService, authService } from './auth.js';

// --- 2. 状态管理 ---
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
    console.log("Browser scroll restoration disabled.");
}

const state = {
    mode: 'flow', // 'flow' | 'learn'
    level: 2,     // Scaffolding Level (1-3)
    vocabLevel: 'B1', // Vocabulary Proficiency (A1-C2)
    activeId: null,
    revealedKeys: [],
    isInitializing: true // Flag to prevent progress overwrite during load
};

// --- Persistence Helpers ---
function getDocId() {
    return new URLSearchParams(window.location.search).get('id');
}

function persistState() {
    if (state.isInitializing) return;
    const docId = getDocId();
    if (!docId) return;

    // Sync to Backend
    // Convert activeId (e.g., 'db-123') to DB ID (123)
    let currentParaId = null;
    if (state.activeId && state.activeId.startsWith('db-')) {
        currentParaId = parseInt(state.activeId.replace('db-', ''), 10);
    }

    textService.updateProgress(docId, {
        reading_mode: state.mode,
        scaffold_level: state.level,
        vocab_level: state.vocabLevel,
        current_paragraph_id: currentParaId
    });

    console.log(`Synced state to DB for ${docId}:`, state.activeId);
}

// function loadSavedState() -> Removed, logic moved to data fetching

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
    persistState();

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
    persistState();
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
    persistState();

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

    // Ambient Image Card (Flow Mode)
    if (state.mode === 'flow' && data.ambient) {
        html += `
            <div class="ambient-card">
                <img src="${data.ambient.image}" class="ambient-img">
                <div class="ambient-info">
                    <div class="ambient-title">${data.ambient.title}</div>
                    <div class="ambient-desc">${data.ambient.desc}</div>
                    <div style="margin-top:5px; font-size:0.8rem; color:#888;">${data.ambient.mood}</div>
                </div>
            </div>
        `;
    }

    // ================= FLOW MODE =================
    if (state.mode === 'flow' && !data.ambient) {
        // Keep empty if no ambient data, or maybe show a default?
        // dashboard.innerHTML = ''; 
        // Actually, if we want ambient image to show, we must NOT return early above.
        // Let's refactor: Flow mode CAN show ambient card.
    } else if (state.mode === 'flow') {
        // If we have content (ambient), let it render.
        // But we need to clear previous content if any? 
        dashboard.innerHTML = html;
        if (!html) dashboard.innerHTML = '';
        return;
    }

    // ================= LEARN MODE =================
    // Filter by Vocabulary Level
    const threshold = vocabMap[state.vocabLevel] || 1;
    const activePoints = data.knowledge.filter(k => k.diff >= threshold);


    // Knowledge Cards
    if (activePoints.length > 0) {
        let cardsHtml = activePoints.map(k => {
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

                if (state.level === 1) {
                    // Support: Direct Chinese
                    tip.innerText = k.def.split('；')[0];
                } else if (state.level === 2) {
                    // Scaffold: Hint / Clue
                    tip.innerText = k.clue || "Hint?";
                    span.onclick = (e) => {
                        e.stopPropagation();
                        tip.innerText = k.def.split('；')[0];
                        span.classList.add('revealed-temporarily');
                    };
                } else if (state.level === 3) {
                    // Challenge: IPA Only
                    tip.innerText = k.ipa || "...";
                    span.ondblclick = (e) => {
                        e.stopPropagation();
                        tip.innerText = k.def.split('；')[0];
                    };
                }

                span.appendChild(tip);
            }

            // Learn Mode: Special Text Handlers
            if (state.mode === 'learn') {
                span.onmouseenter = () => highlightCard(k.key);
                span.onmouseleave = () => unhighlightCard(k.key);

                if (span.querySelector('.inline-def-tag')) span.querySelector('.inline-def-tag').remove();
                if (span.querySelector('.peek-tooltip')) span.querySelector('.peek-tooltip').remove();


                if (state.level === 1) {
                    const defTag = document.createElement('span');
                    defTag.className = 'inline-def-tag';
                    defTag.innerText = ` ${k.def.split('；')[0]}`;
                    span.appendChild(defTag);
                } else if (state.level === 2) {
                    const tip = document.createElement('div');
                    tip.className = 'peek-tooltip';
                    tip.innerText = k.def.split('；')[0];
                    span.appendChild(tip);
                }
            }
        }
    });

    setTimeout(updateMarkerPosition, 50);
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
    const card = document.querySelector(`.knowledge-item[data-key="${key}"]`);
    if (card) {
        card.classList.add('active-card-highlight');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

// --- Audio Player Logic with Karaoke Mode ---
// Feature flag: set to true to enable karaoke word highlighting
const KARAOKE_ENABLED = false;

let currentAudio = null;
let currentAudioQueue = [];
let currentQueueIndex = 0;
let karaokeInterval = null;
let karaokeWords = [];
let karaokeWordIndex = 0;
let currentPlayingId = null;

// Speed control
const speedSlider = document.getElementById('speedSlider');
const speedLabel = document.getElementById('speedLabel');
const speedControl = document.getElementById('speedControl');

if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
        const rate = parseFloat(e.target.value);
        speedLabel.textContent = rate + 'x';
        if (currentAudio) {
            currentAudio.playbackRate = rate;
        }
    });
}

window.playAudio = async function (e, id) {
    e.stopPropagation();

    // Stop any existing audio
    stopAudio();

    currentPlayingId = id;
    const btn = e.currentTarget;
    btn.classList.add('playing');

    // Show speed control
    if (speedControl) speedControl.classList.add('show');

    // Prepare karaoke words from paragraph text (if enabled)
    if (KARAOKE_ENABLED) {
        const paraEl = document.querySelector(`.paragraph[data-id="${id}"] .para-text`);
        if (paraEl) {
            prepareKaraokeWords(paraEl);
        }
    }

    // Extract text from paragraph
    const paraEl = document.querySelector(`.paragraph[data-id="${id}"] .para-text`);
    if (!paraEl) {
        alert("Could not find paragraph text.");
        btn.classList.remove('playing');
        return;
    }

    // Get clean text (remove translation toggles and inline elements)
    const textContent = extractCleanText(paraEl);

    try {
        // Try real-time TTS first
        const isServerAvailable = await ttsService.isAvailable();

        if (isServerAvailable) {
            // Use real-time TTS
            currentAudio = await ttsService.speak(textContent, 'narrator');
            currentAudio.playbackRate = parseFloat(speedSlider?.value || 1);

            currentAudio.addEventListener('loadedmetadata', () => {
                startKaraokeSync(currentAudio.duration);
            });

            currentAudio.onended = () => {
                stopKaraoke();
                btn.classList.remove('playing');
                if (speedControl) speedControl.classList.remove('show');
                currentAudio = null;
                currentPlayingId = null;
            };

            currentAudio.play();
        } else {
            // Fallback to pre-generated audio if available
            const data = bookData[id];
            if (data && data.audio) {
                if (Array.isArray(data.audio)) {
                    currentAudioQueue = data.audio;
                    currentQueueIndex = 0;
                    playQueueWithKaraoke(btn, id);
                } else {
                    playOneFileWithKaraoke(data.audio, btn, id);
                }
            } else {
                alert("TTS server unavailable. Please start the server with ./start_server.sh");
                btn.classList.remove('playing');
                if (speedControl) speedControl.classList.remove('show');
            }
        }
    } catch (error) {
        console.error('Audio playback error:', error);
        alert("Failed to play audio: " + error.message);
        btn.classList.remove('playing');
        if (speedControl) speedControl.classList.remove('show');
    }
};

// Helper function to extract clean text from paragraph
function extractCleanText(paraEl) {
    // Clone to avoid modifying the original
    const clone = paraEl.cloneNode(true);

    // Remove translation toggles and inline translations
    clone.querySelectorAll('.trans-toggle, .inline-trans, .peek-tooltip, .inline-def-tag').forEach(el => el.remove());

    // Get text content and clean up whitespace
    return clone.textContent.replace(/\s+/g, ' ').trim();
}

function prepareKaraokeWords(paraEl) {
    // Clear previous highlights
    clearKaraokeHighlights();

    // Get existing word spans or wrap text in spans
    karaokeWords = [];

    // Walk through the paragraph and collect all words
    const walker = document.createTreeWalker(paraEl, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    // For each text node, wrap words in spans
    textNodes.forEach(node => {
        const text = node.textContent;
        const words = text.split(/(\s+)/); // Keep whitespace

        if (words.length > 1 || (words.length === 1 && words[0].trim())) {
            const fragment = document.createDocumentFragment();
            words.forEach(word => {
                if (word.trim()) {
                    const span = document.createElement('span');
                    span.className = 'karaoke-word';
                    span.textContent = word;
                    fragment.appendChild(span);
                    karaokeWords.push(span);
                } else {
                    fragment.appendChild(document.createTextNode(word));
                }
            });
            node.parentNode.replaceChild(fragment, node);
        }
    });
}

function playOneFileWithKaraoke(url, btn, id) {
    currentAudio = new Audio(url);
    currentAudio.playbackRate = parseFloat(speedSlider?.value || 1);

    currentAudio.addEventListener('loadedmetadata', () => {
        startKaraokeSync(currentAudio.duration);
    });

    currentAudio.onended = () => {
        stopKaraoke();
        btn.classList.remove('playing');
        if (speedControl) speedControl.classList.remove('show');
        currentAudio = null;
        currentPlayingId = null;
    };

    currentAudio.play();
}

function playQueueWithKaraoke(btn, id) {
    if (currentQueueIndex >= currentAudioQueue.length) {
        stopKaraoke();
        btn.classList.remove('playing');
        if (speedControl) speedControl.classList.remove('show');
        currentAudioQueue = [];
        currentPlayingId = null;
        return;
    }

    const url = currentAudioQueue[currentQueueIndex];
    currentAudio = new Audio(url);
    currentAudio.playbackRate = parseFloat(speedSlider?.value || 1);

    // For queue, we need to estimate words per segment
    // Simplification: divide remaining words by remaining segments
    currentAudio.addEventListener('loadedmetadata', () => {
        const remainingSegments = currentAudioQueue.length - currentQueueIndex;
        const wordsPerSegment = Math.ceil((karaokeWords.length - karaokeWordIndex) / remainingSegments);
        const segmentWords = karaokeWords.slice(karaokeWordIndex, karaokeWordIndex + wordsPerSegment);
        startKaraokeSync(currentAudio.duration, segmentWords);
    });

    currentAudio.onended = () => {
        currentQueueIndex++;
        playQueueWithKaraoke(btn, id);
    };

    currentAudio.play();
}

function startKaraokeSync(duration, wordSubset = null) {
    const words = wordSubset || karaokeWords;
    if (words.length === 0) return;

    const baseInterval = (duration * 1000) / words.length;
    let localIndex = 0;

    // Clear any existing interval
    if (karaokeInterval) clearInterval(karaokeInterval);

    // Highlight first word immediately
    if (words[0]) words[0].classList.add('karaoke-highlight');

    karaokeInterval = setInterval(() => {
        const rate = currentAudio?.playbackRate || 1;
        const adjustedInterval = baseInterval / rate;

        // Remove highlight from current word
        if (words[localIndex]) {
            words[localIndex].classList.remove('karaoke-highlight');
        }

        localIndex++;
        karaokeWordIndex++;

        // Highlight next word
        if (localIndex < words.length && words[localIndex]) {
            words[localIndex].classList.add('karaoke-highlight');

            // Scroll word into view if needed
            words[localIndex].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }

        if (localIndex >= words.length) {
            clearInterval(karaokeInterval);
            karaokeInterval = null;
        }
    }, baseInterval);
}

function stopKaraoke() {
    if (karaokeInterval) {
        clearInterval(karaokeInterval);
        karaokeInterval = null;
    }
    clearKaraokeHighlights();
    karaokeWords = [];
    karaokeWordIndex = 0;
}

function clearKaraokeHighlights() {
    document.querySelectorAll('.karaoke-highlight').forEach(el => {
        el.classList.remove('karaoke-highlight');
    });
}

function stopAudio() {
    stopKaraoke();
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    if (speedControl) speedControl.classList.remove('show');
    document.querySelectorAll('.play-btn').forEach(b => b.classList.remove('playing'));
    currentPlayingId = null;
}

// --- Mobile Bottom Bar Logic ---
const mobilePlayBtn = document.getElementById('mobilePlayBtn');
const mobileAiBtn = document.getElementById('mobileAiBtn');
const mobilePanelBtn = document.getElementById('mobilePanelBtn');
const mobileSpeedSlider = document.getElementById('mobileSpeedSlider');
const mobileSettingsBtn = document.getElementById('mobileSettingsBtn');

// Mobile Play Button - plays current active paragraph
if (mobilePlayBtn) {
    mobilePlayBtn.addEventListener('click', () => {
        if (!state.activeId) return;

        // Create a mock event for playAudio
        const playBtn = document.querySelector(`.paragraph[data-id="${state.activeId}"] .play-btn`);
        if (playBtn) {
            playBtn.click();
        }
    });
}

// Mobile AI Button - opens AI chat for current paragraph
if (mobileAiBtn) {
    mobileAiBtn.addEventListener('click', () => {
        if (!state.activeId) return;

        const askTrigger = document.querySelector(`.paragraph[data-id="${state.activeId}"] .ask-trigger`);
        if (askTrigger) {
            askTrigger.click();
        }
    });
}

// Mobile Panel Button - toggles Learn mode
if (mobilePanelBtn) {
    mobilePanelBtn.addEventListener('click', () => {
        if (state.mode === 'flow') {
            switchMode('learn');
            mobilePanelBtn.classList.add('active');
        } else {
            switchMode('flow');
            mobilePanelBtn.classList.remove('active');
        }
    });
}

// Mobile Speed Slider
if (mobileSpeedSlider) {
    mobileSpeedSlider.addEventListener('input', (e) => {
        const rate = parseFloat(e.target.value);
        if (currentAudio) {
            currentAudio.playbackRate = rate;
        }
        // Sync with desktop slider
        if (speedSlider) {
            speedSlider.value = rate;
            speedLabel.textContent = rate + 'x';
        }
    });
}

// Mobile Settings Button - show/hide floating controls (as modal on mobile)
if (mobileSettingsBtn) {
    mobileSettingsBtn.addEventListener('click', () => {
        // Toggle a settings modal or the floating controls visibility
        const controls = document.querySelector('.floating-controls');
        if (controls) {
            controls.style.display = controls.style.display === 'none' ? 'flex' : 'none';
        }
    });
}


const readerPanel = document.getElementById('readerPanel');

readerPanel.addEventListener('scroll', () => {
    if (state.isInitializing) return; // Ignore scrolls during restoration

    const checkPoint = window.innerHeight * 0.35;
    let activeEl = null;

    const currentParagraphs = document.querySelectorAll('.paragraph');
    if (currentParagraphs.length === 0) return;

    currentParagraphs.forEach(p => {
        const rect = p.getBoundingClientRect();
        if (rect.top <= checkPoint && rect.bottom >= checkPoint) {
            activeEl = p;
        }
    });

    if (!activeEl) {
        const firstPara = currentParagraphs[0];
        const lastPara = currentParagraphs[currentParagraphs.length - 1];
        const firstRect = firstPara.getBoundingClientRect();
        const lastRect = lastPara.getBoundingClientRect();

        if (firstRect.top > checkPoint) {
            activeEl = firstPara;
        }
        else if (lastRect.bottom < checkPoint) {
            activeEl = lastPara;
        }
        else {
            let minDist = Infinity;
            currentParagraphs.forEach(p => {
                const rect = p.getBoundingClientRect();
                const dist = Math.min(Math.abs(rect.top - checkPoint), Math.abs(rect.bottom - checkPoint));
                if (dist < minDist) {
                    minDist = dist;
                    activeEl = p;
                }
            });
        }
    }

    if (activeEl && activeEl.getAttribute('data-id') !== state.activeId) {
        state.activeId = activeEl.getAttribute('data-id');
        persistState(); // 记录进度
        currentParagraphs.forEach(p => p.classList.remove('active'));
        activeEl.classList.add('active');

        renderDashboard(state.activeId);
        syncHighlightsInText(state.activeId);
        updateMarkerPosition();
    } else if (state.activeId) {
        updateMarkerPosition();
    }
});

window.onload = async () => {
    document.body.className = 'mode-flow';
    state.mode = 'flow';

    updateCollapsedLabel();
    injectAskTriggers();

    // Check URL Params
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');
    const isNew = urlParams.get('new');

    if (isNew) {
        // Clear default content securely
        document.querySelector('.reader-content').innerHTML = '';
        openImportModal();
    } else if (docId) {
        try {
            // Load Text Metadata & Progress
            const textData = await textService.getText(docId);
            document.querySelector('.book-title').innerText = textData.title;

            // Apply Saved State from DB
            if (textData.reading_mode) state.mode = textData.reading_mode;
            if (textData.scaffold_level) state.level = textData.scaffold_level;
            if (textData.vocab_level) state.vocabLevel = textData.vocab_level;
            if (textData.current_paragraph_id) {
                state.activeId = `db-${textData.current_paragraph_id}`;
            }
            console.log("Loaded state from DB:", state);

            // Load Paragraphs (Lazy Loading)
            const paragraphs = await textService.getParagraphs(docId);
            renderReader(paragraphs);

            // Apply loaded mode/level/vocab to UI
            switchMode(state.mode);
            changeLevel(state.level);
            if (document.getElementById('vocabSelect')) {
                document.getElementById('vocabSelect').value = state.vocabLevel;
            }

        } catch (e) {
            console.error("Failed to load text:", e);
            if (e.message.includes('401') || e.message.includes('Failed')) {
                if (confirm("Authentication required. Go to login?")) {
                    window.location.href = '/login.html';
                }
            }
        }
    } else {
        // Default Logic (Pride and Prejudice)
        state.activeId = 'p1';
        const p1 = document.querySelector('[data-id="p1"]');
        if (p1) p1.classList.add('active');
        renderDashboard('p1');
        syncHighlightsInText('p1');
        setTimeout(updateMarkerPosition, 100);
    }

    setTimeout(updateMarkerPosition, 100);

    document.addEventListener('click', (e) => {
        const bubble = document.querySelector('.ask-bubble.show');
        if (bubble && !bubble.contains(e.target) && !e.target.closest('.ask-trigger')) {
            bubble.classList.remove('show');
            document.body.classList.remove('ask-mode');
        }
    });

    document.getElementById('importModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('importModal')) closeImportModal();
    });
};
window.onresize = updateMarkerPosition;

// --- Ask AI Logic ---
function injectAskTriggers() {
    document.querySelectorAll('.paragraph').forEach(p => {
        // Prevent double injection of play button
        if (p.querySelector('.play-btn')) return;

        const id = p.getAttribute('data-id');

        // Play Button (Audio) 🔊
        const playBtn = document.createElement('div');
        playBtn.className = 'play-btn';
        playBtn.innerHTML = '🔊';
        playBtn.title = "Play Audio (Emotional TTS)";
        playBtn.onclick = (e) => playAudio(e, id);

        // Ask Trigger Button (AI) ✨
        if (!p.querySelector('.ask-trigger')) {
            const btn = document.createElement('div');
            btn.className = 'ask-trigger';
            btn.innerHTML = '✨';
            btn.title = "Ask AI about this paragraph";
            btn.onclick = (e) => toggleAsk(e, id);

            const bubble = document.createElement('div');
            bubble.className = 'ask-bubble';
            bubble.id = `ask-bubble-${id}`;
            bubble.innerHTML = `
                <div class="ask-history" id="ask-history-${id}"></div>
                <input type="text" class="ask-input" placeholder="Ask anything..." onkeydown="handleAskInput(event, '${id}')">
            `;
            p.appendChild(btn);
            p.appendChild(bubble);
        }

        p.appendChild(playBtn);
    });
}

function requestApiKey() {
    const key = prompt("⚠️ Safety Alert: API Key Missing.\n\nTo use AI features without a backend, please enter your Google Gemini API Key below.\nIt will be saved securely in your browser's LocalStorage.");
    if (key && key.trim()) {
        localStorage.setItem('GOOGLE_API_KEY', key.trim());
        alert("Key saved! Reloading page to apply...");
        window.location.reload();
    }
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
                requestApiKey();
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

window.processImport = async function () {
    const isText = document.getElementById('tab-text').classList.contains('active');
    const loading = document.getElementById('importLoading');
    loading.classList.remove('hidden');

    if (isText) {
        const rawText = document.getElementById('importText').value;
        if (!rawText.trim()) {
            loading.classList.add('hidden');
            return;
        }

        try {
            // New Lazy Loading Logic: Just save text and redirect
            if (textService && authService.isLoggedIn()) {
                const title = rawText.split('\n')[0].substring(0, 50).trim() || "New Import";
                const savedText = await textService.createText(title, rawText);

                // Redirect/Refresh to load with new lazy logic
                loading.classList.add('hidden');
                closeImportModal();

                const newUrl = `${window.location.pathname}?id=${savedText.id}`;
                window.location.href = newUrl;
            } else {
                alert("Please log in to import texts.");
                loading.classList.add('hidden');
            }
        } catch (err) {
            loading.classList.add('hidden');
            console.error(err);
            alert("Error: " + (err.message || "Unknown error"));
        }
    } else {
        // URL Mode (Mock)
        setTimeout(() => {
            loading.classList.add('hidden');
            closeImportModal();
            loadUrlContent();
        }, 600);
    }
};

// --- 3. Reader Render Logic (Lazy Loading) ---

let lazyObserver = null;

function renderReader(paragraphs) {
    const reader = document.querySelector('.reader-content');
    reader.innerHTML = '';

    // Re-create Focus Marker
    const marker = document.createElement('div');
    marker.className = 'focus-marker';
    marker.id = 'focusMarker';
    reader.appendChild(marker);

    // Initial Active ID
    const firstId = paragraphs.length > 0 ? `db-${paragraphs[0].id}` : 'import-p0';
    state.activeId = firstId;

    // Reset Observer
    if (lazyObserver) lazyObserver.disconnect();
    lazyObserver = new IntersectionObserver(handleLazyLoad, {
        root: reader.parentElement,
        rootMargin: '100px 0px 100px 0px', // Preload 100px ahead
        threshold: 0.1
    });

    paragraphs.forEach((p, index) => {
        const id = `db-${p.id}`; // Frontend ID prefix

        // 1. Update Global Data
        bookData[id] = {
            knowledge: p.analysis ? p.analysis.knowledge : [],
            insight: p.analysis ? p.analysis.insight : null,
            translation: p.translation || "Translation loading..."
        };

        // 2. Render DOM
        const div = document.createElement('div');
        div.className = 'paragraph';
        div.setAttribute('data-id', id);
        div.setAttribute('data-db-id', p.id);
        div.setAttribute('data-raw-text', p.content);
        div.setAttribute('data-analyzed', p.analysis ? 'true' : 'false');

        // If analyzed, render smart content; else raw text
        const pText = document.createElement('div');
        pText.className = 'para-text';

        if (p.analysis) {
            pText.innerHTML = generateSmartText(p.content, p.analysis.knowledge);
        } else {
            pText.innerText = p.content; // Raw text placeholder
            div.classList.add('pending-analysis');
        }

        div.appendChild(pText);

        // Add Translation (Hidden by default)
        const transDiv = document.createElement('div');
        transDiv.className = 'inline-trans';
        transDiv.id = `trans-${id}`;
        transDiv.innerText = p.translation || "";
        div.appendChild(transDiv);

        // Add Controls
        const transBtn = document.createElement('div');
        transBtn.className = 'trans-toggle';
        transBtn.innerHTML = '译';
        transBtn.onclick = (e) => toggleTrans(e, id);
        div.appendChild(transBtn);

        // Ask Trigger & Bubble will be injected by injectAskTriggers later 
        // OR we can do it here. Let's rely on injectAskTriggers called after render.
        // Actually injectAskTriggers looks for .paragraph, so we can call it once after render.
        // But for consistency let's just add basic structure here or let the global init do it.
        // Global init `onload` calls `injectAskTriggers`, but that's only for initial static content.
        // So we should add controls here manually as we are generating dynamic content.

        // ... (Reusing logic from injectAskTriggers to avoid duplication is better, 
        // but for now let's inline essentially what injectAskTriggers does)

        // Ask Trigger
        const btn = document.createElement('div');
        btn.className = 'ask-trigger';
        btn.innerHTML = '✨';
        btn.onclick = (e) => toggleAsk(e, id);
        div.appendChild(btn);

        // Bubble
        const bubble = document.createElement('div');
        bubble.className = 'ask-bubble';
        bubble.id = `ask-bubble-${id}`;
        bubble.innerHTML = `
            <div class="ask-history" id="ask-history-${id}"></div>
            <input type="text" class="ask-input" placeholder="Ask anything..." onkeydown="handleAskInput(event, '${id}')">
        `;
        div.appendChild(bubble);

        // Play Button
        const playBtn = document.createElement('div');
        playBtn.className = 'play-btn';
        playBtn.innerHTML = '🔊';
        playBtn.onclick = (e) => playAudio(e, id);
        div.appendChild(playBtn);

        reader.appendChild(div);

        // Observe for Lazy Loading
        if (!p.analysis) {
            lazyObserver.observe(div);
        }
    });

    // Add Spacer
    const bottomSpacer = document.createElement('div');
    bottomSpacer.style.height = '60vh';
    reader.appendChild(bottomSpacer);

    // Initial Post-Render Setup
    let activePara = null;
    const savedId = state.activeId;
    console.log("Restoring state for ID:", savedId);

    if (savedId) {
        // Try to find exact match
        activePara = reader.querySelector(`.paragraph[data-id="${savedId}"]`);
    }

    if (activePara) {
        console.log("Found active paragraph:", savedId);
        activePara.classList.add('active');

        // Scroll to restored position with slightly longer delay to ensure layout stability
        setTimeout(() => {
            activePara.scrollIntoView({ behavior: 'auto', block: 'center' });

            // Allow persistence after scroll is definitely done
            setTimeout(() => {
                state.isInitializing = false;
                console.log("Restoration complete, persistence enabled.");
            }, 300); // Increased safety buffer
        }, 100);
    } else {
        console.warn("Could not find saved paragraph, falling back to start.");
        activePara = reader.querySelector('.paragraph');
        if (activePara) {
            state.activeId = activePara.getAttribute('data-id');
            activePara.classList.add('active');
        }
        // Enable persistence immediately if we just defaulted
        state.isInitializing = false;
    }

    renderDashboard(state.activeId);
    syncHighlightsInText(state.activeId);
    updateMarkerPosition();
}

function generateSmartText(rawText, knowledge) {
    let htmlContent = rawText;
    const sortedKeys = [...(knowledge || [])].sort((a, b) => b.word.length - a.word.length);
    sortedKeys.forEach(k => {
        const safeWord = k.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b(${safeWord})\\b`, 'gi');
        htmlContent = htmlContent.replace(regex, `<span class="smart-word" data-key="${k.key}">$1</span>`);
    });
    return htmlContent;
}

// Lazy Load Handler
function handleLazyLoad(entries, observer) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const div = entry.target;
            const dbId = div.getAttribute('data-db-id');
            const rawText = div.getAttribute('data-raw-text');

            // Trigger Analysis
            analyzeParagraph(div, dbId, rawText);

            // Stop observing immediately to prevent double calls
            observer.unobserve(div);
        }
    });
}

async function analyzeParagraph(div, dbId, rawText) {
    // Show loading state
    div.classList.add('analyzing');

    try {
        console.log(`Analyzing paragraph ${dbId}...`);
        const data = await aiService.analyzeText(rawText);

        if (data && data.paragraphs && data.paragraphs.length > 0) {
            // MERGE Logic: Handle case where AI splits one DB paragraph into multiple sentences
            const pData = data.paragraphs.reduce((acc, curr, index) => {
                if (index === 0) return { ...curr }; // Clone first
                return {
                    text: acc.text + ' ' + curr.text,
                    translation: acc.translation + ' ' + curr.translation,
                    knowledge: [...(acc.knowledge || []), ...(curr.knowledge || [])],
                    insight: acc.insight // Keep first insight as main theme
                };
            }, {});

            // 1. Save to Backend
            await textService.updateParagraph(dbId, pData, pData.translation);

            // 2. Update DOM
            const id = div.getAttribute('data-id');

            // Update Global Data
            bookData[id] = {
                knowledge: pData.knowledge || [],
                insight: pData.insight || null,
                translation: pData.translation
            };

            // Update Text HTML
            const pText = div.querySelector('.para-text');
            // Use original rawText if pData.text is different/shorter? 
            // Better use pData.text as it might have corrected spacing, but rawText is safer for matching.
            // Actually, we should use rawText but apply knowledge.
            pText.innerHTML = generateSmartText(pData.text || rawText, pData.knowledge);

            // Update Translation
            const transDiv = div.querySelector('.inline-trans');
            transDiv.innerText = pData.translation || "";

            // Remove pending state
            div.classList.remove('pending-analysis');
            div.setAttribute('data-analyzed', 'true');

            // Refresh Dashboard if this is active
            if (state.activeId === id) {
                renderDashboard(id);
            }
        }
    } catch (err) {
        console.error("Analysis Failed:", err);
        // Retry logic could go here
    } finally {
        div.classList.remove('analyzing');
    }
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
