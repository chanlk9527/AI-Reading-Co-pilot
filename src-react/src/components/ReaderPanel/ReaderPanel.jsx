import { useRef, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import Paragraph from './Paragraph';

export default function ReaderPanel({ paragraphs }) {
    const { activeId, setActiveId } = useApp();
    const containerRef = useRef(null);
    const [page, setPage] = useState(1);
    const [inputPage, setInputPage] = useState(1);
    const [markerStyle, setMarkerStyle] = useState({ top: 0, height: 0, opacity: 0 });
    const isScrollingRef = useRef(false);

    const ITEMS_PER_PAGE = 20;
    const totalPages = Math.ceil(paragraphs.length / ITEMS_PER_PAGE);

    // Sync input when page changes
    useEffect(() => {
        setInputPage(page);
    }, [page]);

    // Calculate visible paragraphs
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const visibleParagraphs = paragraphs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Auto-switch page when activeId changes externally (e.g. sidebar click)
    useEffect(() => {
        if (!activeId) return;

        const index = paragraphs.findIndex(p => String(p.id) === String(activeId));
        if (index !== -1) {
            const targetPage = Math.floor(index / ITEMS_PER_PAGE) + 1;
            if (targetPage !== page) {
                setPage(targetPage);
                // Optional: scroll to top of container when page changes via external nav
                if (containerRef.current) containerRef.current.scrollTop = 0;
            } else {
                // If the change came from scrolling (scroll spy), DO NOT scrollIntoView
                // as this causes fighting/bouncing.
                if (isScrollingRef.current) {
                    isScrollingRef.current = false;
                    return;
                }

                // Same page, just scroll to it after render
                setTimeout(() => {
                    const el = containerRef.current?.querySelector(`.paragraph[data-id="${activeId}"]`);
                    // improved behavior: auto usually feels better than smooth for programmatic jumps during reading
                    if (el) el.scrollIntoView({ block: 'center', behavior: 'auto' });
                }, 100);
            }
        }
    }, [activeId, paragraphs]); // Depend on activeId changes

    // Focus Marker Position Logic
    useEffect(() => {
        if (!activeId || !containerRef.current) {
            setMarkerStyle(s => ({ ...s, opacity: 0 }));
            return;
        }

        // We need to wait for render
        requestAnimationFrame(() => {
            const activeEl = containerRef.current.querySelector(`.paragraph[data-id="${activeId}"]`);
            const contentEl = containerRef.current.querySelector('.reader-content');

            if (activeEl && contentEl) {
                // Calculate position relative to .reader-content
                // We use offsetTop because both are in the same relative container context usually,
                // but checking getBoundingClientRect is safer for nested complexities.
                // However, since .reader-content is relative, simple offsetTop of paragraph might work 
                // IF paragraph is direct child. Yes it is.

                setMarkerStyle({
                    top: activeEl.offsetTop,
                    height: activeEl.offsetHeight,
                    opacity: 1
                });
            }
        });
    }, [activeId, page, paragraphs]);

    // Scroll to top when page manually changes
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, [page]);

    // Scroll Spy Logic
    const scrollTimeoutRef = useRef(null);
    const handleScroll = () => {
        if (scrollTimeoutRef.current) return;

        scrollTimeoutRef.current = setTimeout(() => {
            scrollTimeoutRef.current = null;

            if (!containerRef.current) return;

            const container = containerRef.current;
            const containerRect = container.getBoundingClientRect();
            // Target the center of the viewport (or slightly above center for reading focus)
            const targetY = containerRect.top + (containerRect.height * 0.4);

            let bestId = null;
            let minDist = Infinity;

            const paraElements = container.querySelectorAll('.paragraph');

            paraElements.forEach(el => {
                const rect = el.getBoundingClientRect();
                const center = rect.top + (rect.height / 2);
                const dist = Math.abs(center - targetY);

                if (dist < minDist) {
                    minDist = dist;
                    bestId = el.getAttribute('data-id');
                }
            });

            if (bestId && bestId !== activeId) {
                isScrollingRef.current = true; // Mark as scroll-triggered
                setActiveId(bestId);
            }
        }, 100); // 100ms throttle
    };

    const goPrev = () => setPage(p => Math.max(1, p - 1));
    const goNext = () => setPage(p => Math.min(totalPages, p + 1));

    const handlePageSubmit = (e) => {
        e.preventDefault();
        const p = parseInt(inputPage, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
            setPage(p);
        } else {
            setInputPage(page); // Reset if invalid
        }
    };

    return (
        <div
            className="reader-panel"
            ref={containerRef}
            onScroll={handleScroll}
            style={{
                height: '100vh',
                overflowY: 'auto',
                width: '100%',
                scrollBehavior: 'smooth',
                position: 'relative' // For absolute positioning of controls if needed
            }}
        >
            <div className="reader-content" style={{
                maxWidth: '800px',
                margin: '0 auto',
                padding: '40px 20px',
                paddingBottom: '160px' // Increased space for footer controls
            }}>

                <div
                    className={`focus-marker ${activeId ? 'active' : ''}`}
                    style={{
                        top: markerStyle.top,
                        height: markerStyle.height,
                        opacity: markerStyle.opacity,
                        // Transitions are handled in CSS
                    }}
                />
                {visibleParagraphs.map((para) => (
                    <Paragraph
                        key={para.id}
                        id={para.id}
                        data={para}
                        isActive={String(activeId) === String(para.id)}
                    />
                ))}
            </div>

            {/* Floating Pagination Controls */}
            <div style={{
                position: 'fixed',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--bg-paper, #fff)',
                border: '1px solid var(--border-color, #ccc)',
                borderRadius: '50px',
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100
            }}>
                <button
                    onClick={goPrev}
                    disabled={page === 1}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: 'none',
                        background: page === 1 ? '#eee' : 'var(--theme-primary, #007bff)',
                        color: page === 1 ? '#999' : '#fff',
                        cursor: page === 1 ? 'default' : 'pointer'
                    }}
                >
                    Prev
                </button>

                <form
                    onSubmit={handlePageSubmit}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Page</span>
                    <input
                        type="number"
                        value={inputPage}
                        onChange={(e) => setInputPage(e.target.value)}
                        onBlur={handlePageSubmit}
                        style={{
                            width: '50px',
                            textAlign: 'center',
                            padding: '4px',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            fontSize: '0.9rem'
                        }}
                    />
                    <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>of {totalPages}</span>
                </form>

                <button
                    onClick={goNext}
                    disabled={page === totalPages}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: 'none',
                        background: page === totalPages ? '#eee' : 'var(--theme-primary, #007bff)',
                        color: page === totalPages ? '#999' : '#fff',
                        cursor: page === totalPages ? 'default' : 'pointer'
                    }}
                >
                    Next
                </button>
            </div>
        </div>
    );
}
