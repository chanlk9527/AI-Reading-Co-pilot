import { useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import Paragraph from './Paragraph';

export default function ReaderPanel({ paragraphs }) {
    const { activeId, setActiveId, mode } = useApp();
    const panelRef = useRef(null);
    const markerRef = useRef(null);

    // Initialize first paragraph as active on mount
    useEffect(() => {
        if (paragraphs.length > 0 && !activeId) {
            const firstId = paragraphs[0].id || 'p-0';
            setActiveId(firstId);
        }
    }, [paragraphs, activeId, setActiveId]);

    // Update marker position function
    const updateMarkerPosition = useCallback(() => {
        if (!activeId || !markerRef.current || !panelRef.current) return;

        const contentEl = panelRef.current.querySelector('.reader-content');
        const p = panelRef.current.querySelector(`.paragraph[data-id="${activeId}"]`);
        const marker = markerRef.current;

        if (p && marker && contentEl) {
            // Use offsetTop relative to reader-content
            marker.style.top = p.offsetTop + 'px';
            marker.style.height = p.offsetHeight + 'px';
            marker.style.opacity = '1';
            marker.classList.add('active');
            marker.style.backgroundColor = 'var(--theme-primary)';
            marker.style.boxShadow = '0 0 15px var(--theme-primary)';
        }
    }, [activeId]);

    // Update marker when activeId changes
    useEffect(() => {
        updateMarkerPosition();
    }, [activeId, updateMarkerPosition]);

    // Scroll detection
    useEffect(() => {
        const panel = panelRef.current;
        if (!panel) return;

        const handleScroll = () => {
            const checkPoint = window.innerHeight * 0.35;
            let activeEl = null;
            const paras = panel.querySelectorAll('.paragraph');

            if (paras.length === 0) return;

            paras.forEach(p => {
                const rect = p.getBoundingClientRect();
                if (rect.top <= checkPoint && rect.bottom >= checkPoint) {
                    activeEl = p;
                }
            });

            // Edge case handling for top/bottom scroll positions
            if (!activeEl) {
                const firstPara = paras[0];
                const lastPara = paras[paras.length - 1];
                const firstRect = firstPara.getBoundingClientRect();
                const lastRect = lastPara.getBoundingClientRect();

                // At top of scroll - first paragraph is below checkpoint
                if (firstRect.top > checkPoint) {
                    activeEl = firstPara;
                }
                // At bottom of scroll - last paragraph is above checkpoint
                else if (lastRect.bottom < checkPoint) {
                    activeEl = lastPara;
                }
                // Fallback: find closest paragraph
                else {
                    let minDist = Infinity;
                    paras.forEach(p => {
                        const rect = p.getBoundingClientRect();
                        const dist = Math.min(
                            Math.abs(rect.top - checkPoint),
                            Math.abs(rect.bottom - checkPoint)
                        );
                        if (dist < minDist) {
                            minDist = dist;
                            activeEl = p;
                        }
                    });
                }
            }

            if (activeEl) {
                const newId = activeEl.getAttribute('data-id');
                if (newId !== activeId) {
                    setActiveId(newId);
                }
            }

            updateMarkerPosition();
        };

        panel.addEventListener('scroll', handleScroll);

        // Trigger initial scroll detection after a short delay to ensure DOM is ready
        const timer = setTimeout(() => {
            handleScroll();
        }, 100);

        return () => {
            panel.removeEventListener('scroll', handleScroll);
            clearTimeout(timer);
        };
    }, [activeId, setActiveId, updateMarkerPosition]);

    return (
        <div className="reader-panel" id="readerPanel" ref={panelRef}>
            <div className="reader-content">
                <div className="focus-marker" id="focusMarker" ref={markerRef}></div>

                {paragraphs.length > 0 && (
                    <div className="book-title">Pride and Prejudice</div>
                )}

                {paragraphs.map((para, index) => (
                    <Paragraph
                        key={para.id || `p-${index}`}
                        id={para.id || `p-${index}`}
                        data={para}
                        isActive={activeId === (para.id || `p-${index}`)}
                    />
                ))}

                {/* Bottom spacer for scroll padding */}
                <div style={{ height: '60vh' }}></div>
            </div>
        </div>
    );
}
