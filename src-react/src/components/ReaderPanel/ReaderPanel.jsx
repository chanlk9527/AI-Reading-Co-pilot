import { useRef, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import Paragraph from './Paragraph';

export default function ReaderPanel({ paragraphs }) {
    const { activeId, setActiveId } = useApp();
    const containerRef = useRef(null);
    const [page, setPage] = useState(1);
    const [inputPage, setInputPage] = useState(1);

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
                // Same page, just scroll to it after render
                setTimeout(() => {
                    const el = containerRef.current?.querySelector(`.paragraph[data-id="${activeId}"]`);
                    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }, 100);
            }
        }
    }, [activeId, paragraphs]); // Depend on activeId changes

    // Scroll to top when page manually changes
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, [page]);

    // Simple active detection acts different in page mode.
    // We can just rely on manual selection or click for now, OR keep the scroll spy for just this page.
    const handleScroll = () => {
        // (Omitted for brevity/stability: relying on click/manual active for now improves stability)
        // If user wants scroll-spy within the page, we can re-add it strictly for visibleParagraphs.
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
            // onScroll={handleScroll} 
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
                paddingBottom: '120px' // Space for footer controls
            }}>
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
