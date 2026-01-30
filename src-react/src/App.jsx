import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import FloatingControls from './components/FloatingControls/FloatingControls';
import ReaderPanel from './components/ReaderPanel/ReaderPanel';
import CopilotPanel from './components/CopilotPanel/CopilotPanel';
import ImportModal from './components/ImportModal/ImportModal';
import { demoParagraphs, demoBookData } from './data/demoData';

function AppContent() {
    const { mode, updateBookData } = useApp();
    const [paragraphs, setParagraphs] = useState(demoParagraphs);
    const [importModalOpen, setImportModalOpen] = useState(false);

    // Apply mode class to body element
    useEffect(() => {
        document.body.className = `mode-${mode}`;
    }, [mode]);

    // Initialize demo data on mount
    useEffect(() => {
        Object.entries(demoBookData).forEach(([id, data]) => {
            updateBookData(id, data);
        });
    }, [updateBookData]);

    const handleImport = (newParagraphs) => {
        // Convert AI response paragraphs to our format
        const formatted = newParagraphs.map((p, index) => {
            const id = `import-p${index}`;
            // Update bookData for each paragraph
            updateBookData(id, {
                knowledge: p.knowledge || [],
                insight: p.insight || { tag: 'Analysis', text: 'No insight available.' },
                ambient: null,
                translation: p.translation || 'Translation not available.'
            });
            return {
                id,
                text: p.text,
                knowledge: p.knowledge || [],
                insight: p.insight,
                translation: p.translation
            };
        });
        setParagraphs(formatted);
    };

    return (
        <>
            <FloatingControls onImport={() => setImportModalOpen(true)} />

            <div className="app-container" id="appContainer">
                <ReaderPanel paragraphs={paragraphs} />
                <CopilotPanel />
            </div>

            <ImportModal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onImport={handleImport}
            />
        </>
    );
}

export default function App() {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
}
