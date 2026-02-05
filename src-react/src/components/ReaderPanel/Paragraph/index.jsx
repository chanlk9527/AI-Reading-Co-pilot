import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { useSmartText } from './useSmartText';
import { useParagraphAnalysis } from './useAnalysis';
import AskBubble from './AskBubble';

export default function Paragraph({ id, data, isActive }) {
    const { mode, level, vocabLevel, VOCAB_MAP, bookData } = useApp();
    const [showTrans, setShowTrans] = useState(false);
    const [showAskBubble, setShowAskBubble] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const paragraphRef = useRef(null);

    const effectiveData = { ...data, ...(bookData[id] || {}) };
    const threshold = VOCAB_MAP[vocabLevel] || 1;
    const activePoints = (effectiveData.knowledge || []).filter(k => k.diff >= threshold);

    // Hooks
    const { isAnalyzing } = useParagraphAnalysis({ id, data, isActive, isInView });
    const { html, handleWordClick } = useSmartText({
        text: effectiveData.text,
        activePoints,
        mode,
        level
    });

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

    // Auto-set translation visibility based on level change
    useEffect(() => {
        setShowTrans(level === 1);
    }, [level]);

    const toggleTrans = (e) => {
        e.stopPropagation();
        if (level === 1) return;
        setShowTrans(!showTrans);
    };

    const BUBBLE_WIDTH = 320;

    const toggleAsk = (e) => {
        e.stopPropagation();
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

    return (
        <div
            ref={paragraphRef}
            className={`paragraph ${isActive ? 'active' : ''}`}
            data-id={id}
        >
            <div
                className="para-text"
                dangerouslySetInnerHTML={{ __html: html }}
                onClick={handleWordClick}
            />

            {/* Translation */}
            <div className={`inline-trans ${showTrans ? 'show' : ''}`} id={`trans-${id}`}>
                {effectiveData.translation || 'Translation not available.'}
            </div>

            {/* AI Companion */}
            {effectiveData.companion && effectiveData.companion.text && (
                <div className="ai-companion">
                    <span className="companion-icon">🎙️</span>
                    <span className="companion-text">{effectiveData.companion.text}</span>
                </div>
            )}

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
            <AskBubble
                isVisible={showAskBubble}
                onClose={() => {
                    setShowAskBubble(false);
                    document.body.classList.remove('ask-mode');
                }}
                contextText={effectiveData.text}
            />
        </div>
    );
}
