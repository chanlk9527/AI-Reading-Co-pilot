import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { marked } from 'marked';
import { PROMPTS } from '../../services/prompts';

export default function Paragraph({ id, data, isActive }) {
    const { mode, level, vocabLevel, VOCAB_MAP, revealedKeys, revealKey, updateBookData, bookData } = useApp();
    const { token } = useAuth();
    const [showTrans, setShowTrans] = useState(false);
    const [showAskBubble, setShowAskBubble] = useState(false);
    const [askHistory, setAskHistory] = useState([]);
    const [askInput, setAskInput] = useState('');
    const [revealedWords, setRevealedWords] = useState([]);
    const [toggledWords, setToggledWords] = useState({}); // Track toggled words for Lv2
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isInView, setIsInView] = useState(false);

    // Intersection Observer for auto-trigger
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '100px' }
        );

        if (paragraphRef.current) {
            observer.observe(paragraphRef.current);
        }

        return () => observer.disconnect();
    }, []);
    const inputRef = useRef(null);

    // Merge props data with context data (context is fresher)
    const effectiveData = { ...data, ...(bookData[id] || {}) };

    const threshold = VOCAB_MAP[vocabLevel] || 1;
    const activePoints = (effectiveData.knowledge || []).filter(k => k.diff >= threshold);

    // Auto-analyze when active
    useEffect(() => {
        const currentData = { ...data, ...(bookData[id] || {}) };

        const hasKnowledge = currentData.knowledge?.length > 0;
        const hasInsight = currentData.insight?.text && currentData.insight.text !== 'No insight' && currentData.insight.text !== '暂无解析';
        const hasTranslation = currentData.translation && currentData.translation !== 'No translation' && currentData.translation !== '暂无翻译';

        // STRICT CHECK: If we already have data, DO NOT run analysis.
        if (hasKnowledge && hasInsight && hasTranslation) {
            return;
        }

        // Trigger if:
        // 1. Active OR In View
        // 2. Not analyzing
        // 3. Missing data
        const shouldAnalyze = (isActive || isInView) && !isAnalyzing && (!hasKnowledge || !hasInsight || !hasTranslation);

        if (shouldAnalyze) {
            console.log(`[Paragraph ${id}] Triggering analysis... Missing:`, { hasKnowledge, hasInsight, hasTranslation });
            const analyze = async () => {
                setIsAnalyzing(true);
                try {
                    const { aiService } = await import('../../services/aiService');

                    // Step: Content Analysis
                    const textToAnalyze = currentData.text;

                    console.log(`[Paragraph ${id}] Analyzing content...`);
                    const result = await aiService.analyzeSentence(textToAnalyze);

                    console.log(`[Paragraph ${id}] Analysis success.`);

                    // 1. Update Context
                    updateBookData(id, {
                        knowledge: result.knowledge || [],
                        insight: result.insight || { tag: 'Analysis', text: 'No insight' },
                        translation: result.translation || 'No translation'
                    });

                    // 2. Persist to Backend
                    if (token && typeof id === 'number') {
                        try {
                            await api.updateSentence(token, id, {
                                translation: result.translation,
                                analysis: {
                                    knowledge: result.knowledge || [],
                                    insight: result.insight
                                }
                            });
                        } catch (e) {
                            console.error(`[Paragraph ${id}] Failed to persist analysis:`, e);
                        }
                    }

                } catch (err) {
                    console.error(`[Paragraph ${id}] Analysis failed:`, err);
                } finally {
                    setIsAnalyzing(false); // Stop loop
                }
            };
            analyze();
        }
    }, [isActive, isInView, bookData, data, id, isAnalyzing, updateBookData, token]);

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
        let html = effectiveData.text || '';
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
                    // Lv2: Default English clue, Toggle -> Chinese def
                    tooltipContent = toggledWords[k.key] ? k.def.split('；')[0] : (k.clue || 'Hint?');
                } else {
                    // Lv3: English clue (was IPA)
                    tooltipContent = k.clue || 'Hint?';
                }
                // Add click-to-toggle hint class if Lv2
                const extraClass = level === 2 ? ' interactive-word' : '';
                replacement = `<span class="smart-word has-card${extraClass}" data-key="${k.key}">$1<div class="peek-tooltip">${tooltipContent}</div></span>`;
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

    const paragraphRef = useRef(null);
    const BUBBLE_WIDTH = 320; // 300px bubble + 20px margin

    const toggleAsk = (e) => {
        e.stopPropagation();
        if (!showAskBubble && askHistory.length === 0) {
            setAskHistory([{ role: 'ai', text: '有什么我可以帮您的？' }]);
        }
        const newState = !showAskBubble;
        setShowAskBubble(newState);

        // Adaptive layout shift: only shift if not enough space on the right
        if (newState) {
            requestAnimationFrame(() => {
                const para = paragraphRef.current;
                if (para) {
                    const paraRect = para.getBoundingClientRect();
                    const viewportWidth = window.innerWidth;
                    const spaceOnRight = viewportWidth - paraRect.right;

                    // Only add ask-mode class if there's not enough space for the bubble
                    if (spaceOnRight < BUBBLE_WIDTH) {
                        document.body.classList.add('ask-mode');
                    }
                }
            });
        } else {
            document.body.classList.remove('ask-mode');
        }

        setTimeout(() => inputRef.current?.focus(), 100);
    };

    // Clean up ask-mode class when component unmounts
    useEffect(() => {
        return () => {
            document.body.classList.remove('ask-mode');
        };
    }, []);

    // Also handle window resize to re-evaluate space
    useEffect(() => {
        if (!showAskBubble) return;

        const handleResize = () => {
            const para = paragraphRef.current;
            if (para) {
                const paraRect = para.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const spaceOnRight = viewportWidth - paraRect.right;

                if (spaceOnRight < BUBBLE_WIDTH) {
                    document.body.classList.add('ask-mode');
                } else {
                    document.body.classList.remove('ask-mode');
                }
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [showAskBubble]);



    const handleAskInput = async (e) => {
        if (e.key === 'Enter' && askInput.trim()) {
            const text = askInput.trim();
            setAskInput('');
            setAskHistory(prev => [...prev, { role: 'user', text }]);

            // Add a placeholder for the streaming response
            const aiMsgIndex = askHistory.length + 1; // user msg just added
            setAskHistory(prev => [...prev, { role: 'ai', text: '▌', isStreaming: true }]);

            try {
                const { aiService } = await import('../../services/aiService');
                const systemPrompt = PROMPTS.CHAT.SYSTEM(effectiveData.text);

                await aiService.chatStream(systemPrompt, text, (chunk, fullText) => {
                    setAskHistory(prev => {
                        const updated = [...prev];
                        const lastIdx = updated.length - 1;
                        if (updated[lastIdx]?.isStreaming) {
                            updated[lastIdx] = { role: 'ai', text: fullText + '▌', isStreaming: true };
                        }
                        return updated;
                    });
                });

                // Finalize - remove cursor
                setAskHistory(prev => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (updated[lastIdx]?.isStreaming) {
                        updated[lastIdx] = { role: 'ai', text: updated[lastIdx].text.replace('▌', '') };
                    }
                    return updated;
                });
            } catch (err) {
                console.error(err);
                setAskHistory(prev => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    updated[lastIdx] = { role: 'ai', text: "Error: " + err.message };
                    return updated;
                });
            }
        }
    };

    const chips = PROMPTS.CHIPS;

    const handleChipClick = async (chipPrompt) => {
        setAskHistory(prev => [...prev, { role: 'user', text: chipPrompt }]);
        // Add streaming placeholder
        setAskHistory(prev => [...prev, { role: 'ai', text: '▌', isStreaming: true }]);

        try {
            const { aiService } = await import('../../services/aiService');
            const systemPrompt = PROMPTS.CHAT.SYSTEM(effectiveData.text);

            await aiService.chatStream(systemPrompt, chipPrompt, (chunk, fullText) => {
                setAskHistory(prev => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (updated[lastIdx]?.isStreaming) {
                        updated[lastIdx] = { role: 'ai', text: fullText + '▌', isStreaming: true };
                    }
                    return updated;
                });
            });

            // Finalize
            setAskHistory(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (updated[lastIdx]?.isStreaming) {
                    updated[lastIdx] = { role: 'ai', text: updated[lastIdx].text.replace('▌', '') };
                }
                return updated;
            });
        } catch (err) {
            setAskHistory(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                updated[lastIdx] = { role: 'ai', text: "Error: " + err.message };
                return updated;
            });
        }
    };

    // Handle word clicks for Lv2 toggling
    const handleWordClick = (e) => {
        // Only active in Flow Mode Level 2
        if (mode !== 'flow' || level !== 2) return;

        const target = e.target.closest('.smart-word');
        if (target) {
            const key = target.dataset.key;
            if (key) {
                e.preventDefault();
                e.stopPropagation();
                setToggledWords(prev => ({
                    ...prev,
                    [key]: !prev[key]
                }));
            }
        }
    };

    return (
        <div
            ref={paragraphRef}
            className={`paragraph ${isActive ? 'active' : ''}`}
            data-id={id}
        >
            <div
                className="para-text"
                dangerouslySetInnerHTML={{ __html: getTextHtml() }}
                onClick={handleWordClick}
            />

            {/* Translation */}
            <div className={`inline-trans ${showTrans || level === 1 ? 'show' : ''}`} id={`trans-${id}`}>
                {effectiveData.translation || 'Translation not available.'}
            </div>

            {/* Analyzing Indicator */}
            {isAnalyzing && (
                <div style={{
                    fontSize: '0.85rem',
                    color: 'var(--theme-primary)',
                    marginTop: '8px',
                    fontStyle: 'italic',
                    opacity: 0.8
                }}>
                    AI analyzing...
                </div>
            )}

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
                <div className="ask-bubble-header">
                    <span>✨ AI 助手</span>
                    <button
                        className="ask-bubble-close"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowAskBubble(false);
                            document.body.classList.remove('ask-mode');
                        }}
                        title="关闭"
                    >
                        ×
                    </button>
                </div>
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
