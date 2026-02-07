import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import FloatingControls from '../components/FloatingControls/FloatingControls';
import ReaderPanel from '../components/ReaderPanel/ReaderPanel';
import CopilotPanel from '../components/CopilotPanel/CopilotPanel';
import ImportModal from '../components/ImportModal/ImportModal';
import { demoParagraphs, demoBookData } from '../data/demoData';
import { SENTENCE_ANALYSIS_ENABLED } from '../services/config';

export default function ReaderPage() {
    const ITEMS_PER_PAGE = 20;
    const { textId } = useParams();
    const { token } = useAuth();
    const { mode, level, vocabLevel, activeId, updateBookData, setActiveId, switchMode, changeLevel, changeVocabLevel } = useApp();
    const [paragraphs, setParagraphs] = useState([]);
    const [readerPage, setReaderPage] = useState(1);
    const [totalReaderPages, setTotalReaderPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [pageLoading, setPageLoading] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [textTitle, setTextTitle] = useState('');

    // Config Sync Debounce
    const syncTimeoutRef = useRef(null);
    // Removed [saving, setSaving] state as saveScaffolding is removed

    const buildParagraphsFromSentences = useCallback((sentences) => {
        const groups = new Map();

        sentences.forEach((sentence) => {
            const paragraphIndex = Number.isInteger(sentence.paragraph_index)
                ? sentence.paragraph_index
                : sentence.sentence_index;
            const existing = groups.get(paragraphIndex);

            if (!existing) {
                groups.set(paragraphIndex, {
                    paragraph_index: paragraphIndex,
                    id: sentence.id,
                    textParts: [sentence.content],
                    translationParts: sentence.translation ? [sentence.translation] : [],
                    knowledge: sentence.analysis?.knowledge || [],
                    insight: sentence.analysis?.insight || { tag: '分析', text: '暂无解析' },
                    xray: sentence.analysis?.xray || null,
                    companion: sentence.analysis?.companion || null
                });
                return;
            }

            existing.textParts.push(sentence.content);
            if (sentence.translation) existing.translationParts.push(sentence.translation);
            if (!existing.xray && sentence.analysis?.xray) existing.xray = sentence.analysis.xray;
            if (!existing.companion && sentence.analysis?.companion) existing.companion = sentence.analysis.companion;
            if (existing.insight?.text === '暂无解析' && sentence.analysis?.insight) {
                existing.insight = sentence.analysis.insight;
            }

            const incomingKnowledge = sentence.analysis?.knowledge || [];
            if (incomingKnowledge.length) {
                const merged = [...existing.knowledge];
                incomingKnowledge.forEach((item) => {
                    if (!merged.some((k) => k.key === item.key)) {
                        merged.push(item);
                    }
                });
                existing.knowledge = merged;
            }
        });

        return Array.from(groups.values())
            .sort((a, b) => a.paragraph_index - b.paragraph_index)
            .map((group) => ({
                id: group.id,
                paragraph_index: group.paragraph_index,
                text: group.textParts.join(' ').replace(/\s+/g, ' ').trim(),
                translation: group.translationParts.join(' ').replace(/\s+/g, ' ').trim() || '暂无翻译',
                knowledge: group.knowledge,
                insight: group.insight,
                xray: group.xray,
                companion: group.companion
            }));
    }, []);

    const hydrateParagraphsToBookData = useCallback((mappedParas) => {
        mappedParas.forEach((p) => {
            updateBookData(p.id, {
                text: p.text,
                knowledge: p.knowledge || [],
                insight: p.insight || { tag: '分析', text: '暂无解析' },
                translation: p.translation || '暂无翻译',
                xray: p.xray || null,
                companion: p.companion || null
            });
        });
    }, [updateBookData]);

    const applySentencePayload = useCallback((items, paging) => {
        const mappedParas = buildParagraphsFromSentences(items);
        hydrateParagraphsToBookData(mappedParas);
        setParagraphs(mappedParas);
        setReaderPage(paging?.page || 1);
        setTotalReaderPages(Math.max(1, paging?.totalPages || 1));
        return mappedParas;
    }, [buildParagraphsFromSentences, hydrateParagraphsToBookData]);

    // Apply mode class to body element
    useEffect(() => {
        document.body.className = `mode-${mode}`;
        return () => {
            document.body.className = '';
        };
    }, [mode]);

    // Load content based on textId
    useEffect(() => {
        let cancelled = false;

        const loadDemoContent = () => {
            setTextTitle('Demo: Pride and Prejudice');
            // Include text in bookData for CopilotPanel preview support
            demoParagraphs.forEach(p => {
                updateBookData(p.id, {
                    ...demoBookData[p.id],
                    text: p.text  // Include text for CopilotPanel
                });
            });
            setParagraphs(demoParagraphs);
            setReaderPage(1);
            setTotalReaderPages(1);
        };

        const loadContent = async () => {
            setLoading(true);

            if (textId) {
                // Load from backend
                try {
                    // 1. Get Text Info
                    const text = await api.getTextById(token, textId);
                    if (cancelled) return;
                    setTextTitle(text.title);

                    // Restore Reading Progress & Settings
                    if (text.reading_mode) switchMode(text.reading_mode);
                    if (text.scaffold_level) changeLevel(text.scaffold_level);
                    if (text.vocab_level) changeVocabLevel(text.vocab_level);
                    // 2. Load current paragraph page only (avoid loading whole book at once)
                    const currentSentenceId = Number(text.current_paragraph_id);
                    const sentenceQuery = Number.isInteger(currentSentenceId) && currentSentenceId > 0
                        ? { paragraphPageSize: ITEMS_PER_PAGE, aroundSentenceId: currentSentenceId }
                        : { paragraphPageSize: ITEMS_PER_PAGE, paragraphPage: 1 };

                    const { items, paging } = await api.getSentences(token, textId, sentenceQuery);
                    if (cancelled) return;
                    const mappedParas = applySentencePayload(items, paging);

                    if (text.current_paragraph_id && mappedParas.some((p) => String(p.id) === String(text.current_paragraph_id))) {
                        setActiveId(text.current_paragraph_id);
                    } else if (mappedParas.length > 0) {
                        setActiveId(mappedParas[0].id);
                    } else {
                        setActiveId(null);
                    }
                } catch (err) {
                    console.error('Failed to load text:', err);
                    loadDemoContent();
                }
            } else {
                loadDemoContent();
            }

            if (!cancelled) {
                setLoading(false);
            }
        };

        loadContent();
        return () => {
            cancelled = true;
        };
    }, [
        textId,
        token,
        updateBookData,
        switchMode,
        changeLevel,
        changeVocabLevel,
        setActiveId,
        applySentencePayload,
        ITEMS_PER_PAGE
    ]);

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

    const handlePageChange = useCallback(async (nextPage) => {
        if (!textId || !token || pageLoading) return;
        if (!Number.isInteger(nextPage) || nextPage < 1) return;
        if (nextPage === readerPage) return;

        setPageLoading(true);
        try {
            const { items, paging } = await api.getSentences(token, textId, {
                paragraphPage: nextPage,
                paragraphPageSize: ITEMS_PER_PAGE
            });
            const mappedParas = applySentencePayload(items, paging);
            const hasCurrentActive = mappedParas.some((p) => String(p.id) === String(activeId));
            if (!hasCurrentActive) {
                setActiveId(mappedParas.length > 0 ? mappedParas[0].id : null);
            }
        } catch (err) {
            console.error('Failed to switch paragraph page:', err);
        } finally {
            setPageLoading(false);
        }
    }, [
        textId,
        token,
        pageLoading,
        readerPage,
        ITEMS_PER_PAGE,
        applySentencePayload,
        activeId,
        setActiveId
    ]);

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
        setReaderPage(1);
        setTotalReaderPages(1);

        // Removed saveScaffolding call as it's no longer needed/available.
        // If import needs to be saved, it should be handled by a specific API call.
    };

    // Re-analyze handler
    const handleReanalyze = async (paragraphId) => {
        if (!SENTENCE_ANALYSIS_ENABLED) return;
        if (!paragraphId) return;

        // Use loose comparison (==) because activeId from getAttribute is a string
        // but paragraph.id from backend is a number
        const paragraph = paragraphs.find(p => p.id == paragraphId);
        if (!paragraph) return;

        console.log(`[ReaderPage] Reanalyzing paragraph ${paragraphId}...`);

        try {
            const { aiService } = await import('../services/aiService');

            // Call AI for fresh analysis
            const result = await aiService.analyzeSentence(paragraph.text);

            console.log(`[ReaderPage] Reanalysis complete for paragraph ${paragraphId}`);

            // 1. Update Context 
            updateBookData(paragraphId, {
                knowledge: result.knowledge || [],
                insight: result.insight || { tag: 'Analysis', text: 'No insight' },
                translation: result.translation || 'No translation',
                xray: result.xray || null,
                companion: result.companion || null
            });

            // 2. Persist to Backend (if using real backend)
            if (token && typeof paragraphId === 'number') {
                try {
                    await api.updateSentence(token, paragraphId, {
                        translation: result.translation,
                        analysis: {
                            knowledge: result.knowledge || [],
                            insight: result.insight,
                            xray: result.xray,
                            companion: result.companion || null
                        }
                    });
                    console.log(`[ReaderPage] Persisted reanalysis to backend`);
                } catch (e) {
                    console.error(`[ReaderPage] Failed to persist reanalysis:`, e);
                }
            }

        } catch (err) {
            console.error(`[ReaderPage] Reanalysis failed:`, err);
            throw err; // Re-throw for CopilotPanel to handle
        }
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
                <ReaderPanel
                    paragraphs={paragraphs}
                    title={textTitle}
                    page={readerPage}
                    totalPages={totalReaderPages}
                    onPageChange={textId ? handlePageChange : null}
                    pageLoading={pageLoading}
                />
                <CopilotPanel
                    onReanalyze={handleReanalyze}
                    sentenceAnalysisEnabled={SENTENCE_ANALYSIS_ENABLED}
                />
            </div>

            <ImportModal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onImport={handleImport}
            />
        </>
    );
}
