import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { marked } from 'marked';

export default function Paragraph({ id, data, isActive }) {
    const { mode, level, vocabLevel, VOCAB_MAP, revealedKeys, revealKey } = useApp();
    const [showTrans, setShowTrans] = useState(false);
    const [showAskBubble, setShowAskBubble] = useState(false);
    const [askHistory, setAskHistory] = useState([]);
    const [askInput, setAskInput] = useState('');
    const [revealedWords, setRevealedWords] = useState([]);
    const inputRef = useRef(null);

    const threshold = VOCAB_MAP[vocabLevel] || 1;
    const activePoints = (data.knowledge || []).filter(k => k.diff >= threshold);

    // Level 1: Auto-show translations
    useEffect(() => {
        if (level === 1) {
            setShowTrans(true);
        } else {
            setShowTrans(false);
        }
    }, [level]);

    // Generate HTML content with keyword spans and level-specific behavior
    const getTextHtml = () => {
        let html = data.text || '';
        const sortedKeys = [...activePoints].sort((a, b) => b.word.length - a.word.length);

        sortedKeys.forEach(k => {
            const safeWord = k.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b(${safeWord})\\b`, 'gi');

            // Build different markup based on mode and level
            let replacement = '';

            if (mode === 'flow') {
                // Flow Mode tooltips based on level
                let tooltipContent = '';
                if (level === 1) {
                    tooltipContent = k.def.split('；')[0];
                } else if (level === 2) {
                    tooltipContent = k.clue || 'Hint?';
                } else {
                    tooltipContent = k.ipa || '...';
                }
                replacement = `<span class="smart-word has-card" data-key="${k.key}">$1<div class="peek-tooltip">${tooltipContent}</div></span>`;
            } else {
                // Learn Mode
                if (level === 1) {
                    // Inline definition tag
                    replacement = `<span class="smart-word has-card" data-key="${k.key}">$1<span class="inline-def-tag"> ${k.def.split('；')[0]}</span></span>`;
                } else if (level === 2) {
                    // Hover tooltip
                    replacement = `<span class="smart-word has-card" data-key="${k.key}">$1<div class="peek-tooltip">${k.def.split('；')[0]}</div></span>`;
                } else {
                    // Level 3: Simple highlight only
                    replacement = `<span class="smart-word has-card" data-key="${k.key}">$1</span>`;
                }
            }

            html = html.replace(regex, replacement);
        });

        return html;
    };

    const toggleTrans = (e) => {
        e.stopPropagation();
        // Level 1 always shows translation
        if (level === 1) return;
        setShowTrans(!showTrans);
    };

    const toggleAsk = (e) => {
        e.stopPropagation();
        if (!showAskBubble && askHistory.length === 0) {
            setAskHistory([{ role: 'ai', text: '有什么我可以帮您的？' }]);
        }
        setShowAskBubble(!showAskBubble);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleAskInput = async (e) => {
        if (e.key === 'Enter' && askInput.trim()) {
            const text = askInput.trim();
            setAskInput('');
            setAskHistory(prev => [...prev, { role: 'user', text }]);

            try {
                const { aiService } = await import('../../services/aiService');
                const systemPrompt = `You are an expert reading coach. The user is reading a paragraph. 
                    Context Paragraph: "${data.text}".
                    Answer the user's question briefly and helpfully using **Chinese** (you may use English for specific terms or examples). 
                    **Constraint: Keep your answer under 80 words and very concise.**
                    Focus on vocabulary, nuance, and comprehension.`;

                const reply = await aiService.chat(systemPrompt, text);
                setAskHistory(prev => [...prev, { role: 'ai', text: reply }]);
            } catch (err) {
                console.error(err);
                if (err.message.includes("Key is missing")) {
                    const key = prompt("⚠️ API Key Missing. Enter your Google Gemini API Key:");
                    if (key?.trim()) {
                        localStorage.setItem('GOOGLE_API_KEY', key.trim());
                        alert("Key saved! Reloading...");
                        window.location.reload();
                    }
                } else {
                    setAskHistory(prev => [...prev, { role: 'ai', text: "Error: " + err.message }]);
                }
            }
        }
    };

    const chips = [
        { label: "👶 简单解释", prompt: "请像给5岁孩子讲故事一样，简单解释这段话在说什么。" },
        { label: "🤯 深度解析", prompt: "请深度解析这段话的逻辑和语境，帮我建立 mental model。" },
        { label: "📐 语法拆解", prompt: "请用中文分析这段话的语法结构，拆解长难句。" },
        { label: "💎 地道表达", prompt: "这段话里有哪些值得积累的地道表达或搭配？" }
    ];

    const handleChipClick = async (chipPrompt) => {
        setAskHistory(prev => [...prev, { role: 'user', text: chipPrompt }]);

        try {
            const { aiService } = await import('../../services/aiService');
            const systemPrompt = `You are an expert reading coach. The user is reading a paragraph. 
                Context Paragraph: "${data.text}".
                Answer the user's question briefly and helpfully using **Chinese**.
                **Constraint: Keep your answer under 80 words and very concise.**`;

            const reply = await aiService.chat(systemPrompt, chipPrompt);
            setAskHistory(prev => [...prev, { role: 'ai', text: reply }]);
        } catch (err) {
            setAskHistory(prev => [...prev, { role: 'ai', text: "Error: " + err.message }]);
        }
    };

    return (
        <div
            className={`paragraph ${isActive ? 'active' : ''}`}
            data-id={id}
        >
            <div
                className="para-text"
                dangerouslySetInnerHTML={{ __html: getTextHtml() }}
            />

            {/* Translation */}
            <div className={`inline-trans ${showTrans || level === 1 ? 'show' : ''}`} id={`trans-${id}`}>
                {data.translation || 'Translation not available.'}
            </div>

            {/* Translation Toggle - always visible in Level 1, normal behavior otherwise */}
            <div
                className="trans-toggle"
                onClick={toggleTrans}
                title="Toggle Translation"
                style={{ opacity: level === 1 ? 1 : undefined }}
            >
                译
            </div>

            {/* Ask AI Trigger */}
            <div className="ask-trigger" onClick={toggleAsk} title="Ask AI">
                ✨
            </div>

            {/* Ask Bubble */}
            <div className={`ask-bubble ${showAskBubble ? 'show' : ''}`}>
                <div className="ask-history">
                    {askHistory.map((msg, i) => (
                        <div
                            key={i}
                            className={msg.role === 'user' ? 'msg-user' : 'msg-ai'}
                            dangerouslySetInnerHTML={
                                msg.role === 'ai'
                                    ? { __html: marked.parse(msg.text) }
                                    : undefined
                            }
                        >
                            {msg.role === 'user' ? msg.text : null}
                        </div>
                    ))}

                    {/* Suggestion Chips */}
                    {askHistory.length === 1 && (
                        <div className="suggestion-chips">
                            {chips.map((chip, i) => (
                                <button
                                    key={i}
                                    className="ask-chip"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleChipClick(chip.prompt);
                                    }}
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    className="ask-input"
                    placeholder="Ask anything..."
                    value={askInput}
                    onChange={(e) => setAskInput(e.target.value)}
                    onKeyDown={handleAskInput}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </div>
    );
}
