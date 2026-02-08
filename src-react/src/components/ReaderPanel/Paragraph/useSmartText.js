import { useState, useMemo, useCallback } from 'react';

const FALLBACK_SENTENCE_REGEX = /[^.!?。！？\n]+[.!?。！？]+(?:["'”’)\]]+)?|[^.!?。！？\n]+$/g;

function splitIntoSentences(inputText) {
    const rawText = String(inputText || '').replace(/\r\n/g, '\n');
    if (!rawText.trim()) return [];

    const lines = rawText
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) return [];

    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
        try {
            const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
            const intlSegments = lines.flatMap((line) =>
                Array.from(segmenter.segment(line), ({ segment }) => segment.trim()).filter(Boolean)
            );
            if (intlSegments.length > 0) {
                return intlSegments;
            }
        } catch {
            // Fallback regex will be used.
        }
    }

    return lines.flatMap((line) => {
        const matches = line.match(FALLBACK_SENTENCE_REGEX);
        if (!matches || matches.length === 0) return [line];
        return matches.map((item) => item.trim()).filter(Boolean);
    });
}

export function useSmartText({
    text,
    activePoints,
    mode,
    level,
    paragraphId,
    activeSentenceId,
    sentenceContents = null
}) {
    const [toggledWords, setToggledWords] = useState({});

    // Helper function to build the replacement HTML
    const buildReplacement = useCallback((k, matchGroup) => {
        // Build different markup based on mode and level
        let replacement = '';

        // Note: toggledWords dependency is handled by re-execution when state changes

        if (mode === 'flow') {
            // Flow Mode tooltips based on level
            let tooltipContent = '';
            if (level === 1) {
                tooltipContent = k.def.split('；')[0];
            } else if (level === 2) {
                // Lv2: Default English clue, Toggle -> Chinese def
                // We access the current toggledWords state here. 
                // Since this runs during render (via useMemo), we need to ensure toggledWords is up to date in closure.
                // But useMemo depends on toggledWords, so it should be fine.

                // However, k.key access on toggledWords
                tooltipContent = toggledWords[k.key] ? k.def.split('；')[0] : (k.clue || 'Hint?');
            } else {
                // Lv3: English clue (was IPA)
                tooltipContent = k.clue || 'Hint?';
            }
            // Add click-to-toggle hint class if Lv2
            const extraClass = level === 2 ? ' interactive-word' : '';
            replacement = `<span class="smart-word has-card${extraClass}" data-key="${k.key}">${matchGroup}<div class="peek-tooltip">${tooltipContent}</div></span>`;
        } else {
            // Learn Mode
            if (level === 1) {
                // Inline definition tag
                replacement = `<span class="smart-word has-card" data-key="${k.key}">${matchGroup}<span class="inline-def-tag"> ${k.def.split('；')[0]}</span></span>`;
            } else if (level === 2) {
                // Hover tooltip
                replacement = `<span class="smart-word has-card" data-key="${k.key}">${matchGroup}<div class="peek-tooltip">${k.def.split('；')[0]}</div></span>`;
            } else {
                // Level 3: Simple highlight only
                replacement = `<span class="smart-word has-card" data-key="${k.key}">${matchGroup}</span>`;
            }
        }

        return replacement;
    }, [mode, level, toggledWords]);

    const buildSmartWordHtml = useCallback((segmentText) => {
        let currentHtml = segmentText || '';
        if (!activePoints || activePoints.length === 0) return currentHtml;

        const sortedKeys = [...activePoints].sort((a, b) => b.word.length - a.word.length);

        sortedKeys.forEach(k => {
            // Strategy: Try to match words with inflections
            // 1. First, try using the 'context' field which often contains the actual word form
            // 2. Fall back to the base word with optional common suffixes

            let matched = false;

            // Strategy 1: Extract key words from context and try to match them
            if (k.context && !matched) {
                // The context often contains the actual inflected form
                // e.g., context: "craning over garden fences" for word: "crane"
                const contextWords = k.context.split(/\s+/);

                // For single base words, find the word in context that looks like an inflection
                if (!k.word.includes(' ')) {
                    const baseWord = k.word.toLowerCase();
                    for (const ctxWord of contextWords) {
                        const cleanCtxWord = ctxWord.replace(/[.,!?;:'"]/g, '').toLowerCase();
                        // Check if context word is an inflection of base word
                        // e.g., "craning" starts with "cran" (crane without 'e')
                        const stemBase = baseWord.replace(/e$/, ''); // Remove trailing 'e' for verbs like "crane"
                        if (cleanCtxWord.startsWith(stemBase) || cleanCtxWord.startsWith(baseWord)) {
                            const safeCtxWord = ctxWord.replace(/[.,!?;:'"]/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const ctxRegex = new RegExp(`\\b(${safeCtxWord})\\b`, 'gi');
                            if (ctxRegex.test(currentHtml)) {
                                currentHtml = currentHtml.replace(ctxRegex, buildReplacement(k, '$1'));
                                matched = true;
                                break;
                            }
                        }
                    }
                } else {
                    // For multi-word phrases, try to match the context directly if it exists in text
                    const safeContext = k.context.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const ctxRegex = new RegExp(`(${safeContext})`, 'gi');
                    if (ctxRegex.test(currentHtml)) {
                        currentHtml = currentHtml.replace(ctxRegex, buildReplacement(k, '$1'));
                        matched = true;
                    }
                }
            }

            // Strategy 2: Try the base word with common suffixes
            if (!matched) {
                const safeWord = k.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                if (k.word.includes(' ')) {
                    // Multi-word phrase: try exact match first, then with 's' suffix on last word
                    const wordParts = k.word.split(' ').map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                    const lastWord = wordParts[wordParts.length - 1];
                    const phrasePattern = wordParts.slice(0, -1).join('\\s+') + '\\s+' + lastWord + '(?:s|es)?';
                    const regex = new RegExp(`(${phrasePattern})`, 'gi');
                    currentHtml = currentHtml.replace(regex, buildReplacement(k, '$1'));
                } else {
                    // Single word: match with common inflection suffixes
                    // Handle verbs ending in 'e' (crane -> craning, not crane + ing)
                    const endsWithE = k.word.endsWith('e');
                    let pattern;
                    if (endsWithE) {
                        // For words like "crane": match crane, cranes, craning
                        const stem = safeWord.slice(0, -1); // Remove the 'e'
                        pattern = `${stem}(?:e|es|ed|ing)`;
                    } else {
                        // For regular words: match with optional suffixes
                        pattern = `${safeWord}(?:s|es|ed|ing)?`;
                    }
                    const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');
                    currentHtml = currentHtml.replace(regex, buildReplacement(k, '$1'));
                }
            }
        });

        return currentHtml;
    }, [activePoints, buildReplacement]);

    const html = useMemo(() => {
        const sourceText = text || '';
        if (!sourceText) return '';

        const normalizedSentenceContents = Array.isArray(sentenceContents)
            ? sentenceContents.map((item) => String(item || '').trim()).filter(Boolean)
            : [];
        const segments = splitIntoSentences(sourceText);
        const sentenceList = normalizedSentenceContents.length > 0
            ? normalizedSentenceContents
            : (segments.length > 0 ? segments : [sourceText]);
        const paragraphKey = String(paragraphId);

        return sentenceList.map((segment, index) => {
            const sentenceId = `${paragraphKey}::${index}`;
            const activeClass = String(activeSentenceId) === sentenceId ? ' active-sentence' : '';
            const sentenceHtml = buildSmartWordHtml(segment);

            return `<span class="sentence-unit${activeClass}" data-sentence-id="${sentenceId}" data-paragraph-id="${paragraphKey}" data-sentence-index="${index}">${sentenceHtml}</span>`;
        }).join(' ');
    }, [text, sentenceContents, paragraphId, activeSentenceId, buildSmartWordHtml]);

    const handleWordClick = useCallback((e) => {
        // Only active in Flow Mode Level 2
        if (mode !== 'flow' || level !== 2) return;

        const target = e.target.closest('.smart-word');
        if (target) {
            const key = target.dataset.key;
            if (key) {
                e.preventDefault();
                e.stopPropagation();
                setToggledWords(prev => ({
                    ...prev,
                    [key]: !prev[key]
                }));
            }
        }
    }, [mode, level]);

    return { html, handleWordClick };
}
