import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import { api } from '../../../services/api';
import { SENTENCE_ANALYSIS_ENABLED, getAutoAnalysisEnabled } from '../../../services/config';

const NO_INSIGHT_TEXTS = new Set(['No insight', '暂无解析']);
const NO_TRANSLATION_TEXTS = new Set(['No translation', '暂无翻译']);

const hasInsight = (insight) => Boolean(insight?.text && !NO_INSIGHT_TEXTS.has(insight.text));
const hasTranslation = (translation) => Boolean(translation && !NO_TRANSLATION_TEXTS.has(translation));

function resolveSentenceIndex(paragraphId, activeSentenceId, sentenceCount) {
    if (sentenceCount <= 0) return null;
    const prefix = `${String(paragraphId)}::`;
    if (typeof activeSentenceId !== 'string' || !activeSentenceId.startsWith(prefix)) return 0;

    const rawIndex = Number.parseInt(activeSentenceId.slice(prefix.length), 10);
    if (!Number.isInteger(rawIndex) || rawIndex < 0 || rawIndex >= sentenceCount) return 0;
    return rawIndex;
}

function buildDisplayPayload(sentence) {
    const analysis = sentence?.analysis || {};
    return {
        knowledge: analysis.knowledge || [],
        insight: analysis.insight || { tag: 'Analysis', text: 'No insight' },
        translation: sentence?.translation || 'No translation',
        xray: analysis.xray || null,
        companion: analysis.companion || null
    };
}

export function useParagraphAnalysis({ id, data, isActive, isInView }) {
    const { updateBookData, bookData, activeSentenceId } = useApp();
    const { token } = useAuth();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const lastSyncedSentenceIdRef = useRef(null);

    // Auto-analyze when active
    useEffect(() => {
        const autoAnalysisEnabled = getAutoAnalysisEnabled();
        if (!SENTENCE_ANALYSIS_ENABLED || !autoAnalysisEnabled) {
            return;
        }

        const currentData = { ...data, ...(bookData[id] || {}) };
        const sentenceList = Array.isArray(currentData.sentences) ? currentData.sentences : [];
        const activeSentenceIndex = resolveSentenceIndex(id, activeSentenceId, sentenceList.length);
        const fallbackSentence = {
            id,
            content: currentData.text,
            translation: currentData.translation,
            analysis: {
                knowledge: currentData.knowledge || [],
                insight: currentData.insight || { tag: 'Analysis', text: 'No insight' },
                xray: currentData.xray || null,
                companion: currentData.companion || null
            }
        };
        const targetSentence = sentenceList.length > 0
            ? sentenceList[activeSentenceIndex ?? 0]
            : fallbackSentence;

        if (!targetSentence?.content?.trim()) return;

        const sentenceAnalysis = targetSentence.analysis || {};
        const hasKnowledge = (sentenceAnalysis.knowledge || []).length > 0;
        const hasInsightValue = hasInsight(sentenceAnalysis.insight);
        const hasTranslationValue = hasTranslation(targetSentence.translation);
        const targetSentenceId = targetSentence.id;

        if (targetSentenceId != null && String(lastSyncedSentenceIdRef.current) !== String(targetSentenceId)) {
            updateBookData(id, {
                ...buildDisplayPayload(targetSentence),
                sentences: sentenceList
            });
            lastSyncedSentenceIdRef.current = targetSentenceId;
        }

        // Trigger if:
        // 1. Active OR In View
        // 2. Not analyzing
        // 3. Missing data
        const shouldAnalyze = (isActive || isInView) && !isAnalyzing && (!hasKnowledge || !hasInsightValue || !hasTranslationValue);

        if (shouldAnalyze) {
            console.log(`[Paragraph ${id}] Triggering analysis for sentence ${targetSentenceId}... Missing:`, {
                hasKnowledge,
                hasInsight: hasInsightValue,
                hasTranslation: hasTranslationValue
            });
            const analyze = async () => {
                setIsAnalyzing(true);
                try {
                    const { aiService } = await import('../../../services/aiService');

                    // Step: analyze only the active sentence text (not the merged paragraph text).
                    const textToAnalyze = targetSentence.content;

                    console.log(`[Paragraph ${id}] Analyzing sentence ${targetSentenceId}...`);
                    const result = await aiService.analyzeSentence(textToAnalyze);

                    console.log(`[Paragraph ${id}] Sentence ${targetSentenceId} analysis success.`);

                    const updatedSentences = sentenceList.length > 0
                        ? sentenceList.map((item) => {
                            if (String(item.id) !== String(targetSentenceId)) return item;
                            return {
                                ...item,
                                translation: result.translation || item.translation || 'No translation',
                                analysis: {
                                    knowledge: result.knowledge || [],
                                    insight: result.insight || { tag: 'Analysis', text: 'No insight' },
                                    xray: result.xray || null,
                                    companion: result.companion || null
                                }
                            };
                        })
                        : sentenceList;

                    // 1. Update Context
                    updateBookData(id, {
                        knowledge: result.knowledge || [],
                        insight: result.insight || { tag: 'Analysis', text: 'No insight' },
                        translation: result.translation || 'No translation',
                        xray: result.xray || null,
                        companion: result.companion || null,
                        sentences: updatedSentences
                    });
                    if (targetSentenceId != null) {
                        lastSyncedSentenceIdRef.current = targetSentenceId;
                    }

                    // 2. Persist to Backend
                    if (token && typeof targetSentenceId === 'number') {
                        try {
                            await api.updateSentence(token, targetSentenceId, {
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
    }, [isActive, isInView, activeSentenceId, bookData, data, id, isAnalyzing, updateBookData, token]);

    return { isAnalyzing };
}
