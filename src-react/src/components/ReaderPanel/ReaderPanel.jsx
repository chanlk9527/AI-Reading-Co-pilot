import { useRef, useEffect, useState, useCallback } from 'react';
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
    const { mode, activeId, activeSentenceId, setActiveId, setActiveSentenceId } = useApp();
    const containerRef = useRef(null);
    const [localPage, setLocalPage] = useState(1);
    const [markerStyle, setMarkerStyle] = useState({ top: 0, height: 0, opacity: 0 });
    const [flowPaginationVisible, setFlowPaginationVisible] = useState(true);
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef(null);
    const flowPaginationTimerRef = useRef(null);
    const paginationHoverRef = useRef(false);

    const isServerPaging = typeof onPageChange === 'function';
    const safeServerPage = Number.isInteger(page) ? Math.max(1, page) : 1;
    const safeServerTotalPages = Number.isInteger(totalPages) ? Math.max(1, totalPages) : 1;
    const currentPage = isServerPaging ? safeServerPage : localPage;
    const currentTotalPages = isServerPaging
        ? safeServerTotalPages
        : Math.max(1, Math.ceil(paragraphs.length / ITEMS_PER_PAGE));

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

    // Keep an active sentence for the current active paragraph.
    useEffect(() => {
        if (!activeId || !containerRef.current) return;

        const activeParagraphPrefix = `${String(activeId)}::`;
        if (typeof activeSentenceId === 'string' && activeSentenceId.startsWith(activeParagraphPrefix)) {
            return;
        }

        const activeParagraphEl = containerRef.current.querySelector(`.paragraph[data-id="${activeId}"]`);
        if (!activeParagraphEl) return;

        const firstSentenceEl = activeParagraphEl.querySelector('.sentence-unit');
        const firstSentenceId = firstSentenceEl?.getAttribute('data-sentence-id');
        if (firstSentenceId) {
            setActiveSentenceId(firstSentenceId);
        }
    }, [activeId, activeSentenceId, currentPage, paragraphs, setActiveSentenceId]);

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
            let bestElement = null;
            let minDist = Infinity;

            const paraElements = container.querySelectorAll('.paragraph');
            paraElements.forEach(el => {
                const rect = el.getBoundingClientRect();
                const center = rect.top + (rect.height / 2);
                const dist = Math.abs(center - targetY);

                if (dist < minDist) {
                    minDist = dist;
                    bestId = el.getAttribute('data-id');
                    bestElement = el;
                }
            });

            if (bestId && bestId !== activeId) {
                isScrollingRef.current = true;
                setActiveId(bestId);
            }

            if (!bestElement) return;

            let bestSentenceId = null;
            let sentenceMinDist = Infinity;
            const sentenceElements = bestElement.querySelectorAll('.sentence-unit');

            sentenceElements.forEach((sentenceEl) => {
                const rect = sentenceEl.getBoundingClientRect();
                const center = rect.top + (rect.height / 2);
                const dist = Math.abs(center - targetY);

                if (dist < sentenceMinDist) {
                    sentenceMinDist = dist;
                    bestSentenceId = sentenceEl.getAttribute('data-sentence-id');
                }
            });

            if (bestSentenceId && bestSentenceId !== activeSentenceId) {
                setActiveSentenceId(bestSentenceId);
            }
        }, 100);
    };

    useEffect(() => {
        const handleSentenceKeyNav = (event) => {
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

            const targetTag = event.target?.tagName?.toLowerCase();
            const isEditable = event.target?.isContentEditable
                || targetTag === 'input'
                || targetTag === 'textarea'
                || targetTag === 'select';
            if (isEditable) return;

            const container = containerRef.current;
            if (!container) return;

            const sentenceElements = Array.from(container.querySelectorAll('.sentence-unit'));
            if (sentenceElements.length === 0) return;

            event.preventDefault();

            const direction = event.key === 'ArrowDown' ? 1 : -1;
            let currentIndex = sentenceElements.findIndex(
                (el) => el.getAttribute('data-sentence-id') === String(activeSentenceId)
            );

            if (currentIndex === -1) {
                currentIndex = direction > 0 ? -1 : sentenceElements.length;
            }

            let nextIndex = currentIndex + direction;
            nextIndex = Math.max(0, Math.min(sentenceElements.length - 1, nextIndex));
            if (nextIndex === currentIndex) return;

            const nextSentenceEl = sentenceElements[nextIndex];
            if (!nextSentenceEl) return;

            const nextSentenceId = nextSentenceEl.getAttribute('data-sentence-id');
            const nextParagraphId = nextSentenceEl.getAttribute('data-paragraph-id');

            if (nextSentenceId) {
                setActiveSentenceId(nextSentenceId);
            }

            if (nextParagraphId && String(nextParagraphId) !== String(activeId)) {
                isScrollingRef.current = true;
                setActiveId(nextParagraphId);
            }

            nextSentenceEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        };

        window.addEventListener('keydown', handleSentenceKeyNav);
        return () => window.removeEventListener('keydown', handleSentenceKeyNav);
    }, [activeSentenceId, activeId, setActiveId, setActiveSentenceId]);

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

    const clearFlowPaginationTimer = useCallback(() => {
        if (flowPaginationTimerRef.current) {
            clearTimeout(flowPaginationTimerRef.current);
            flowPaginationTimerRef.current = null;
        }
    }, []);

    const scheduleFlowPaginationHide = useCallback((delayMs = 1200) => {
        if (mode !== 'flow') return;
        clearFlowPaginationTimer();
        flowPaginationTimerRef.current = setTimeout(() => {
            if (!paginationHoverRef.current) {
                setFlowPaginationVisible(false);
            }
        }, delayMs);
    }, [mode, clearFlowPaginationTimer]);

    useEffect(() => {
        if (mode !== 'flow') {
            clearFlowPaginationTimer();
            setFlowPaginationVisible(true);
            return;
        }

        const isCoarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches;
        if (isCoarsePointer) {
            clearFlowPaginationTimer();
            setFlowPaginationVisible(true);
            return;
        }

        setFlowPaginationVisible(false);

        const handleMouseMove = (event) => {
            const nearBottom = event.clientY >= window.innerHeight - 120;
            if (!nearBottom) return;
            setFlowPaginationVisible(true);
            scheduleFlowPaginationHide(1000);
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearFlowPaginationTimer();
            paginationHoverRef.current = false;
        };
    }, [mode, scheduleFlowPaginationHide, clearFlowPaginationTimer]);

    useEffect(() => {
        return () => clearFlowPaginationTimer();
    }, [clearFlowPaginationTimer]);

    const showPagination = currentTotalPages > 1;
    const prevDisabled = pageLoading || currentPage <= 1;
    const nextDisabled = pageLoading || currentPage >= currentTotalPages;
    const paginationVisible = mode !== 'flow' || flowPaginationVisible;

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
                <div
                    className={`reader-pagination ${paginationVisible ? 'is-visible' : 'is-hidden'}`}
                    onMouseEnter={() => {
                        paginationHoverRef.current = true;
                        if (mode === 'flow') {
                            setFlowPaginationVisible(true);
                            clearFlowPaginationTimer();
                        }
                    }}
                    onMouseLeave={() => {
                        paginationHoverRef.current = false;
                        if (mode === 'flow') {
                            scheduleFlowPaginationHide(180);
                        }
                    }}
                >
                    <button
                        onClick={goPrev}
                        disabled={prevDisabled}
                        className="reader-pagination-btn"
                        aria-label="Previous page"
                    >
                        &#8592;
                    </button>

                    <span className="reader-pagination-text">
                        {currentPage} / {currentTotalPages}
                    </span>

                    <button
                        onClick={goNext}
                        disabled={nextDisabled}
                        className="reader-pagination-btn"
                        aria-label="Next page"
                    >
                        &#8594;
                    </button>
                </div>
            )}
        </div>
    );
}
