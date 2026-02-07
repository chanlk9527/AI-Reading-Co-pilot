import { useRef, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import Paragraph from './Paragraph';

const ITEMS_PER_PAGE = 20;

export default function ReaderPanel({
    paragraphs,
    page = 1,
    totalPages = 1,
    onPageChange = null,
    pageLoading = false
}) {
    const { activeId, setActiveId } = useApp();
    const containerRef = useRef(null);
    const [localPage, setLocalPage] = useState(1);
    const [inputPage, setInputPage] = useState(1);
    const [markerStyle, setMarkerStyle] = useState({ top: 0, height: 0, opacity: 0 });
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef(null);

    const isServerPaging = typeof onPageChange === 'function';
    const safeServerPage = Number.isInteger(page) ? Math.max(1, page) : 1;
    const safeServerTotalPages = Number.isInteger(totalPages) ? Math.max(1, totalPages) : 1;
    const currentPage = isServerPaging ? safeServerPage : localPage;
    const currentTotalPages = isServerPaging
        ? safeServerTotalPages
        : Math.max(1, Math.ceil(paragraphs.length / ITEMS_PER_PAGE));

    // Sync input when page changes
    useEffect(() => {
        setInputPage(currentPage);
    }, [currentPage]);

    // Calculate visible paragraphs
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const visibleParagraphs = isServerPaging
        ? paragraphs
        : paragraphs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Auto-scroll when active paragraph changes
    useEffect(() => {
        if (!activeId) return;

        if (!isServerPaging) {
            const index = paragraphs.findIndex(p => String(p.id) === String(activeId));
            if (index !== -1) {
                const targetPage = Math.floor(index / ITEMS_PER_PAGE) + 1;
                if (targetPage !== currentPage) {
                    setLocalPage(targetPage);
                    if (containerRef.current) containerRef.current.scrollTop = 0;
                    return;
                }
            }
        }

        if (isScrollingRef.current) {
            isScrollingRef.current = false;
            return;
        }

        setTimeout(() => {
            const el = containerRef.current?.querySelector(`.paragraph[data-id="${activeId}"]`);
            if (el) el.scrollIntoView({ block: 'center', behavior: 'auto' });
        }, 80);
    }, [activeId, paragraphs, isServerPaging, currentPage]);

    // Focus Marker Position Logic
    useEffect(() => {
        if (!activeId || !containerRef.current) {
            setMarkerStyle(s => ({ ...s, opacity: 0 }));
            return;
        }

        requestAnimationFrame(() => {
            const activeEl = containerRef.current?.querySelector(`.paragraph[data-id="${activeId}"]`);
            if (activeEl) {
                setMarkerStyle({
                    top: activeEl.offsetTop,
                    height: activeEl.offsetHeight,
                    opacity: 1
                });
            } else {
                setMarkerStyle(s => ({ ...s, opacity: 0 }));
            }
        });
    }, [activeId, currentPage, paragraphs]);

    // Scroll to top when page changes
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, [currentPage]);

    // Scroll Spy Logic
    const handleScroll = () => {
        if (scrollTimeoutRef.current) return;

        scrollTimeoutRef.current = setTimeout(() => {
            scrollTimeoutRef.current = null;

            if (!containerRef.current) return;

            const container = containerRef.current;
            const containerRect = container.getBoundingClientRect();
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
                isScrollingRef.current = true;
                setActiveId(bestId);
            }
        }, 100);
    };

    const goToPage = (targetPage) => {
        if (pageLoading) return;
        if (!Number.isInteger(targetPage)) return;
        if (targetPage < 1 || targetPage > currentTotalPages) return;

        if (isServerPaging) {
            onPageChange(targetPage);
        } else {
            setLocalPage(targetPage);
        }
    };

    const goPrev = () => goToPage(currentPage - 1);
    const goNext = () => goToPage(currentPage + 1);

    const handlePageSubmit = (e) => {
        if (e?.preventDefault) e.preventDefault();
        const parsed = parseInt(inputPage, 10);
        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= currentTotalPages) {
            goToPage(parsed);
        } else {
            setInputPage(currentPage);
        }
    };

    const showPagination = currentTotalPages > 1;
    const prevDisabled = pageLoading || currentPage <= 1;
    const nextDisabled = pageLoading || currentPage >= currentTotalPages;

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
                position: 'relative'
            }}
        >
            <div className="reader-content" style={{
                maxWidth: '800px',
                margin: '0 auto',
                padding: '40px 20px',
                paddingBottom: showPagination ? '160px' : '80px'
            }}>

                <div
                    className={`focus-marker ${activeId ? 'active' : ''}`}
                    style={{
                        top: markerStyle.top,
                        height: markerStyle.height,
                        opacity: markerStyle.opacity
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

                {pageLoading && (
                    <div style={{
                        marginTop: '24px',
                        color: '#64748b',
                        fontSize: '0.95rem',
                        textAlign: 'center'
                    }}>
                        正在加载当前页...
                    </div>
                )}
            </div>

            {showPagination && (
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
                        disabled={prevDisabled}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: 'none',
                            background: prevDisabled ? '#eee' : 'var(--theme-primary, #007bff)',
                            color: prevDisabled ? '#999' : '#fff',
                            cursor: prevDisabled ? 'default' : 'pointer'
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
                            disabled={pageLoading}
                            style={{
                                width: '50px',
                                textAlign: 'center',
                                padding: '4px',
                                borderRadius: '4px',
                                border: '1px solid #ddd',
                                fontSize: '0.9rem'
                            }}
                        />
                        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>of {currentTotalPages}</span>
                    </form>

                    <button
                        onClick={goNext}
                        disabled={nextDisabled}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: 'none',
                            background: nextDisabled ? '#eee' : 'var(--theme-primary, #007bff)',
                            color: nextDisabled ? '#999' : '#fff',
                            cursor: nextDisabled ? 'default' : 'pointer'
                        }}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
