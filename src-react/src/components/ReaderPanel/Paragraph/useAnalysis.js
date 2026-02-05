import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import { api } from '../../../services/api';

export function useParagraphAnalysis({ id, data, isActive, isInView }) {
    const { updateBookData, bookData } = useApp();
    const { token } = useAuth();
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Auto-analyze when active
    useEffect(() => {
        const currentData = { ...data, ...(bookData[id] || {}) };

        const hasKnowledge = currentData.knowledge?.length > 0;
        const hasInsight = currentData.insight?.text && currentData.insight.text !== 'No insight' && currentData.insight.text !== '暂无解析';
        const hasTranslation = currentData.translation && currentData.translation !== 'No translation' && currentData.translation !== '暂无翻译';

        // STRICT CHECK: If we already have data, DO NOT run analysis.
        if (hasKnowledge && hasInsight && hasTranslation) {
            return;
        }

        // Trigger if:
        // 1. Active OR In View
        // 2. Not analyzing
        // 3. Missing data
        const shouldAnalyze = (isActive || isInView) && !isAnalyzing && (!hasKnowledge || !hasInsight || !hasTranslation);

        if (shouldAnalyze) {
            console.log(`[Paragraph ${id}] Triggering analysis... Missing:`, { hasKnowledge, hasInsight, hasTranslation });
            const analyze = async () => {
                setIsAnalyzing(true);
                try {
                    const { aiService } = await import('../../../services/aiService');

                    // Step: Content Analysis
                    const textToAnalyze = currentData.text;

                    console.log(`[Paragraph ${id}] Analyzing content...`);
                    const result = await aiService.analyzeSentence(textToAnalyze);

                    console.log(`[Paragraph ${id}] Analysis success.`);

                    // 1. Update Context
                    updateBookData(id, {
                        knowledge: result.knowledge || [],
                        insight: result.insight || { tag: 'Analysis', text: 'No insight' },
                        translation: result.translation || 'No translation',
                        xray: result.xray || null,
                        companion: result.companion || null
                    });

                    // 2. Persist to Backend
                    if (token && typeof id === 'number') {
                        try {
                            await api.updateSentence(token, id, {
                                translation: result.translation,
                                analysis: {
                                    knowledge: result.knowledge || [],
                                    insight: result.insight,
                                    xray: result.xray,
                                    companion: result.companion || null
                                }
                            });
                        } catch (e) {
                            console.error(`[Paragraph ${id}] Failed to persist analysis:`, e);
                        }
                    }

                } catch (err) {
                    console.error(`[Paragraph ${id}] Analysis failed:`, err);
                } finally {
                    setIsAnalyzing(false); // Stop loop
                }
            };
            analyze();
        }
    }, [isActive, isInView, bookData, data, id, isAnalyzing, updateBookData, token]);

    return { isAnalyzing };
}
