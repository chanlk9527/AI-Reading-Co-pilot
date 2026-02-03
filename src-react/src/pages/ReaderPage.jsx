import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import FloatingControls from '../components/FloatingControls/FloatingControls';
import ReaderPanel from '../components/ReaderPanel/ReaderPanel';
import CopilotPanel from '../components/CopilotPanel/CopilotPanel';
import ImportModal from '../components/ImportModal/ImportModal';
import { demoParagraphs, demoBookData } from '../data/demoData';

export default function ReaderPage() {
    const { textId } = useParams();
    const { token } = useAuth();
    const { mode, level, vocabLevel, activeId, updateBookData, setActiveId, switchMode, changeLevel, changeVocabLevel } = useApp();
    const [paragraphs, setParagraphs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [textTitle, setTextTitle] = useState('');

    // Config Sync Debounce
    const syncTimeoutRef = useRef(null);
    // Removed [saving, setSaving] state as saveScaffolding is removed

    // Apply mode class to body element
    useEffect(() => {
        document.body.className = `mode-${mode}`;
        return () => {
            document.body.className = '';
        };
    }, [mode]);

    // Load content based on textId
    useEffect(() => {
        const loadContent = async () => {
            setLoading(true);

            if (textId) {
                // Load from backend
                try {
                    // 1. Get Text Info
                    const text = await api.getTextById(token, textId);
                    setTextTitle(text.title);

                    // Restore Reading Progress & Settings
                    if (text.reading_mode) switchMode(text.reading_mode);
                    if (text.scaffold_level) changeLevel(text.scaffold_level);
                    if (text.vocab_level) changeVocabLevel(text.vocab_level);
                    if (text.current_paragraph_id) setActiveId(text.current_paragraph_id);

                    // 2. Get Sentences (Flat list)
                    const paras = await api.getSentences(token, textId);

                    const mappedParas = paras.map(p => {
                        // Populate Context with latest data
                        const analysis = p.analysis || {};
                        updateBookData(p.id, {
                            knowledge: analysis.knowledge || [],
                            insight: analysis.insight || { tag: '分析', text: '暂无解析' },
                            translation: p.translation || '暂无翻译'
                        });

                        return {
                            id: p.id,
                            text: p.content,
                            sentence_index: p.sentence_index,
                            knowledge: analysis.knowledge || [],
                            insight: analysis.insight,
                            translation: p.translation
                        };
                    });

                    setParagraphs(mappedParas);
                } catch (err) {
                    console.error('Failed to load text:', err);
                    loadDemoContent();
                }
            } else {
                loadDemoContent();
            }

            setLoading(false);
        };

        const loadDemoContent = () => {
            setTextTitle('Demo: Pride and Prejudice');
            Object.entries(demoBookData).forEach(([id, data]) => {
                updateBookData(id, data);
            });
            setParagraphs(demoParagraphs);
        };

        loadContent();
    }, [textId, token, updateBookData, switchMode, changeLevel, changeVocabLevel, setActiveId]);

    // Sync Progress & Settings to Backend
    useEffect(() => {
        if (!textId || !token) return;

        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

        syncTimeoutRef.current = setTimeout(() => {
            api.updateProgress(token, textId, {
                reading_mode: mode,
                scaffold_level: level,
                vocab_level: vocabLevel,
                current_paragraph_id: activeId
            }).catch(err => console.error("Failed to sync progress:", err));
        }, 2000); // 2s debounce

        return () => clearTimeout(syncTimeoutRef.current);
    }, [mode, level, vocabLevel, activeId, textId, token]);

    const handleImport = async (newParagraphs) => {
        const formatted = newParagraphs.map((p, index) => {
            const id = `import-p${index}`;
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

        // Removed saveScaffolding call as it's no longer needed/available.
        // If import needs to be saved, it should be handled by a specific API call.
    };

    // Split functionality removed (Backend Spacy Import)

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontSize: '1.2rem',
                color: '#64748b'
            }}>
                正在加载...
            </div>
        );
    }

    return (
        <>
            <FloatingControls onImport={() => setImportModalOpen(true)} />

            <div className="app-container" id="appContainer">
                <ReaderPanel paragraphs={paragraphs} title={textTitle} />
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
