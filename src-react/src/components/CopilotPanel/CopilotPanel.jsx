import { useApp } from '../../context/AppContext';

export default function CopilotPanel() {
    const { mode, level, vocabLevel, activeId, bookData, VOCAB_MAP, revealedKeys, revealKey } = useApp();

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

    return (
        <div className="copilot-panel" id="copilotPanel">
            <div className="dashboard-content" id="dashboard">
                {/* Knowledge Cards */}
                {activePoints.length > 0 && (
                    <div className="module-card">
                        <div className="module-header">
                            🧠 Knowledge Scaffolding <span>{activePoints.length}</span>
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

                {/* Insight Card */}
                {data.insight && (
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
