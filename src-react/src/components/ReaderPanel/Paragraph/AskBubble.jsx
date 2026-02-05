import { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import { PROMPTS } from '../../../services/prompts';

export default function AskBubble({ isVisible, onClose, contextText }) {
    const [askHistory, setAskHistory] = useState([]);
    const [askInput, setAskInput] = useState('');
    const inputRef = useRef(null);

    const chips = PROMPTS.CHIPS;

    // Focus input when shown
    useEffect(() => {
        if (isVisible) {
            // Initialize history if empty
            if (askHistory.length === 0) {
                setAskHistory([{ role: 'ai', text: '有什么我可以帮您的？' }]);
            }
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isVisible]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAskInput = async (e) => {
        if (e.key === 'Enter' && askInput.trim()) {
            const text = askInput.trim();
            setAskInput('');
            setAskHistory(prev => [...prev, { role: 'user', text }]);

            // Add a placeholder for the streaming response
            const aiMsgIndex = askHistory.length + 1; // user msg just added
            setAskHistory(prev => [...prev, { role: 'ai', text: '▌', isStreaming: true }]);

            try {
                const { aiService } = await import('../../../services/aiService');
                const systemPrompt = PROMPTS.CHAT.SYSTEM(contextText);

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

    const handleChipClick = async (chipPrompt) => {
        setAskHistory(prev => [...prev, { role: 'user', text: chipPrompt }]);
        // Add streaming placeholder
        setAskHistory(prev => [...prev, { role: 'ai', text: '▌', isStreaming: true }]);

        try {
            const { aiService } = await import('../../../services/aiService');
            const systemPrompt = PROMPTS.CHAT.SYSTEM(contextText);

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

    return (
        <div className={`ask-bubble ${isVisible ? 'show' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="ask-bubble-header">
                <span>✨ AI 助手</span>
                <button
                    className="ask-bubble-close"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
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
    );
}
