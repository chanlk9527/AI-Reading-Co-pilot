import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function CopilotPanel({ onReanalyze, sentenceAnalysisEnabled = true }) {
    const { mode, level, vocabLevel, activeId, bookData, VOCAB_MAP, revealedKeys, revealKey } = useApp();
    const [isReanalyzing, setIsReanalyzing] = useState(false);

    // In Flow mode, panel is hidden
    if (mode === 'flow') {
        return <div className="copilot-panel" id="copilotPanel"></div>;
    }

    const data = bookData[activeId];
    if (!data) {
        return (
            <div className="copilot-panel" id="copilotPanel">
                <div className="dashboard-content" id="dashboard">
                    <div className="module-card">
                        <div className="module-header">📚 Select a paragraph</div>
                    </div>
                </div>
            </div>
        );
    }

    const threshold = VOCAB_MAP[vocabLevel] || 1;
    const activePoints = (data.knowledge || []).filter(k => k.diff >= threshold);

    const handleReveal = (key) => {
        revealKey(key);
    };

    const handleReanalyze = async () => {
        if (!sentenceAnalysisEnabled || !onReanalyze || isReanalyzing) return;

        setIsReanalyzing(true);
        try {
            await onReanalyze(activeId);
        } catch (err) {
            console.error('Reanalyze failed:', err);
        } finally {
            setIsReanalyzing(false);
        }
    };

    // Get current paragraph text preview
    const getTextPreview = () => {
        // Try to get text from data or find in bookData
        if (data.text) {
            return data.text.length > 60 ? data.text.slice(0, 60) + '...' : data.text;
        }
        return '当前段落';
    };

    // X-Ray display logic based on level
    const renderXRay = () => {
        const xray = data.xray;
        if (!xray || !xray.pattern) return null;

        return (
            <div className="module-card xray-card">
                <div className="module-header">
                    <span>🔍 句子X光</span>
                </div>
                <div className="xray-body">
                    {/* Pattern - Always show */}
                    <div className="xray-pattern">
                        <span className="xray-pattern-label">📐 结构类型</span>
                        <span className="xray-pattern-value">{xray.pattern}</span>
                    </div>

                    {/* Breakdown - Show if exists */}
                    {xray.breakdown && (
                        <div className="xray-breakdown">
                            {xray.breakdown}
                        </div>
                    )}

                    {/* Key Words - Show if exists */}
                    {xray.keyWords && xray.keyWords.length > 0 && (
                        <div className="xray-keywords">
                            <span className="xray-keywords-label">🔗 关键连接</span>
                            {xray.keyWords.map((kw, i) => (
                                <div key={i} className="xray-keyword-item">
                                    <span className="xray-keyword-word">{kw.word}</span>
                                    <span className="xray-keyword-role">{kw.role}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Explanation - Lv1 & Lv2 show, Lv3 hides */}
                    {level < 3 && xray.explanation && (
                        <div className="xray-explanation">
                            <span className="xray-explanation-icon">💡</span>
                            <span className="xray-explanation-text">{xray.explanation}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="copilot-panel" id="copilotPanel">
            <div className="dashboard-content" id="dashboard">
                {/* Dashboard Header with Reanalyze - NEW */}
                <div className="dashboard-header">
                    <div className="current-para-info">
                        <div className="para-preview">{getTextPreview()}</div>
                    </div>
                    <button
                        className="btn-reanalyze-global"
                        onClick={handleReanalyze}
                        disabled={isReanalyzing || !sentenceAnalysisEnabled}
                        title={sentenceAnalysisEnabled ? "重新分析整个段落（词汇+翻译+结构）" : "句子分析已临时关闭"}
                    >
                        {sentenceAnalysisEnabled
                            ? (isReanalyzing ? '⏳ 分析中...' : '🔄 重新分析')
                            : '⏸ 分析已关闭'}
                    </button>
                </div>

                {/* Sentence X-Ray */}
                {renderXRay()}

                {/* Knowledge Cards */}
                {activePoints.length > 0 && (
                    <div className="module-card">
                        <div className="module-header">
                            📚 生词脚手架 <span>{activePoints.length}</span>
                        </div>
                        <div>
                            {activePoints.map(k => {
                                const isGuessMode = level >= 3 && !revealedKeys.includes(k.key);
                                const modeClass = isGuessMode ? 'k-guess-mode' : 'k-reveal-mode';

                                return (
                                    <div
                                        key={k.key}
                                        className={`knowledge-item ${modeClass}`}
                                        data-key={k.key}
                                        onClick={() => handleReveal(k.key)}
                                    >
                                        <div className="k-top">
                                            <span className="k-word">{k.word}</span>
                                            <span className="k-ipa">{k.ipa}</span>
                                        </div>
                                        <div className="k-clue">{k.clue}</div>
                                        <div className="k-def">{k.def}</div>
                                        <div className="k-context">{k.context}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Insight Card - Replaced by X-Ray, keeping for backward compat */}
                {data.insight && !data.xray && (
                    <div className="module-card">
                        <div className="module-header">💡 AI Coach Insight</div>
                        <div className="insight-body">
                            <span className="insight-tag">{data.insight.tag}</span><br />
                            {data.insight.text}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
