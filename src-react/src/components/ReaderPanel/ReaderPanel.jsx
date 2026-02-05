import { useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import Paragraph from './Paragraph';

export default function ReaderPanel({ paragraphs }) {
    const { activeId, setActiveId } = useApp();
    const containerRef = useRef(null);
    const isInitialScroll = useRef(true);

    // Internal scroll handler to update active state
    const handleScroll = () => {
        if (!containerRef.current) return;

        // Simple active detection: find paragraph closest to 30% from top
        const container = containerRef.current;
        const checkPoint = container.getBoundingClientRect().top + (window.innerHeight * 0.35);

        const nodes = container.querySelectorAll('.paragraph');
        let activeEl = null;
        let minDist = Infinity;

        nodes.forEach(node => {
            const rect = node.getBoundingClientRect();
            // Check if this node overlaps the checkpoint
            if (rect.top <= checkPoint && rect.bottom >= checkPoint) {
                activeEl = node;
            } else {
                // If not overlapping, find closest
                const dist = Math.min(Math.abs(rect.top - checkPoint), Math.abs(rect.bottom - checkPoint)); // Distance to block
                if (dist < minDist) {
                    minDist = dist;
                    if (!activeEl) activeEl = node;
                }
            }
        });

        if (activeEl) {
            const newId = activeEl.getAttribute('data-id');
            // Ensure we parse to same type (string vs number)
            if (newId && String(newId) !== String(activeId)) {
                // We use a debounce or just set it? 
                // Setting state on scroll can be heavy, but for just ID it's usually fine.
                // To avoid too many renders/updates to context, we might check if it's the same.
                // The check `String(newId) !== String(activeId)` handles that.
                setActiveId(Number(newId)); // Assuming IDs are numbers based on data
            }
        }
    };

    // Scroll to active paragraph on load / when activeId changes EXTERNALLY (e.g. sidebar click)
    // We need to distinguish between "scroll caused by user" and "scroll caused by activeId prop change"
    // Usually, we only auto-scroll if it's an initial load or a distinct navigation action.
    // But here activeId drives the view? 
    // If user scrolls, activeId updates. If we then scroll TO that ID, we fight the user.
    // So ONLY scroll if the change didn't come from our own detector?
    // A simple way is to track "last detected ID".

    useEffect(() => {
        if (isInitialScroll.current && paragraphs.length > 0 && activeId && containerRef.current) {
            const el = containerRef.current.querySelector(`.paragraph[data-id="${activeId}"]`);
            if (el) {
                el.scrollIntoView({ block: 'center', behavior: 'auto' });
                isInitialScroll.current = false;
            } else if (!activeId) {
                // No active ID? Set first as active
                if (paragraphs[0]) setActiveId(paragraphs[0].id);
                isInitialScroll.current = false;
            }
        }
    }, [paragraphs, activeId, setActiveId]);

    return (
        <div
            className="reader-panel"
            ref={containerRef}
            onScroll={handleScroll}
            style={{
                height: '100vh',
                overflowY: 'auto',
                width: '100%',
                scrollBehavior: 'smooth'
            }}
        >
            <div className="reader-content" style={{
                maxWidth: '800px', // Standard pleasant reading width
                margin: '0 auto',
                padding: '40px 20px',
                paddingBottom: '50vh' // Allow scrolling last item up
            }}>
                {paragraphs.map((para, index) => (
                    <Paragraph
                        key={para.id}
                        id={para.id}
                        data={para}
                        isActive={String(activeId) === String(para.id)}
                    />
                ))}
            </div>
        </div>
    );
}
