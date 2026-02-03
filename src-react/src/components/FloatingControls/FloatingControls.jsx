import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function FloatingControls({ onImport }) {
    const { mode, level, vocabLevel, switchMode, changeLevel, changeVocabLevel, LEVEL_DESCS } = useApp();
    const navigate = useNavigate();

    const getModeLabel = () => mode === 'flow' ? 'Flow' : 'Learn';
    const getLevelLabel = () => 'Lv' + level;

    const backBtnStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 600,
        color: '#555',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s'
    };

    return (
        <div className="floating-controls">
            {/* Back to Library Button - Always visible */}
            <button
                style={backBtnStyle}
                onClick={() => navigate('/library')}
                onMouseOver={(e) => {
                    e.currentTarget.style.background = '#667eea';
                    e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                    e.currentTarget.style.color = '#555';
                }}
            >
                <span>←</span>
                <span>返回书库</span>
            </button>

            <div className="control-collapsed-view" id="collapsedLabel">
                {getModeLabel()} • {getLevelLabel()} • {vocabLevel}
            </div>

            <div className="control-expanded-content">
                <div className="control-inner">
                    {/* Mode Switcher */}
                    <div className="mode-switcher compact">
                        <button
                            className={`mode-btn ${mode === 'flow' ? 'active' : ''}`}
                            onClick={() => switchMode('flow')}
                        >
                            Flow
                        </button>
                        <button
                            className={`mode-btn ${mode === 'learn' ? 'active' : ''}`}
                            onClick={() => switchMode('learn')}
                        >
                            Learn
                        </button>
                    </div>

                    {/* Import Button */}
                    <button className="import-btn" onClick={onImport} title="Import Content">
                        📥
                    </button>

                    {/* Level Capsule */}
                    <div className="level-capsule small" data-active={level}>
                        <div className="capsule-indicator"></div>
                        <button
                            className={`capsule-btn ${level === 1 ? 'active-text' : ''}`}
                            onClick={() => changeLevel(1)}
                        >
                            1
                        </button>
                        <button
                            className={`capsule-btn ${level === 2 ? 'active-text' : ''}`}
                            onClick={() => changeLevel(2)}
                        >
                            2
                        </button>
                        <button
                            className={`capsule-btn ${level === 3 ? 'active-text' : ''}`}
                            onClick={() => changeLevel(3)}
                        >
                            3
                        </button>
                    </div>

                    {/* Vocab Level Dropdown */}
                    <select
                        className="vocab-select"
                        value={vocabLevel}
                        onChange={(e) => changeVocabLevel(e.target.value)}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid #E0E0E0',
                            background: '#F0F2F5',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <option value="A1">A1</option>
                        <option value="A2">A2</option>
                        <option value="B1">B1</option>
                        <option value="B2">B2</option>
                        <option value="C1">C1</option>
                        <option value="C2">C2</option>
                    </select>
                </div>
                <div className="level-info" style={{ textAlign: 'right', paddingRight: '5px' }}>
                    {LEVEL_DESCS[level - 1]}
                </div>
            </div>
        </div>
    );
}
