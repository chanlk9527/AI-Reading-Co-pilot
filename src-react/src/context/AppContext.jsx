import { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

// Vocabulary level mapping
const VOCAB_MAP = {
    'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6
};

// Level descriptions
const LEVEL_DESCS = [
    "Support: Full Translation",
    "Scaffold: English Hints",
    "Challenge: Pronunciation Only"
];

export function AppProvider({ children }) {
    const [mode, setMode] = useState('flow'); // 'flow' | 'learn'
    const [level, setLevel] = useState(2);     // Scaffolding Level (1-3)
    const [vocabLevel, setVocabLevel] = useState('A2'); // Vocabulary Proficiency
    const [activeId, setActiveId] = useState(null);
    const [activeSentenceId, setActiveSentenceId] = useState(null);
    const [revealedKeys, setRevealedKeys] = useState([]);
    const [bookData, setBookData] = useState({});

    const switchMode = useCallback((newMode) => {
        setMode(newMode);
    }, []);

    const changeLevel = useCallback((newLevel) => {
        setLevel(newLevel);
    }, []);

    const changeVocabLevel = useCallback((newVocabLevel) => {
        setVocabLevel(newVocabLevel);
    }, []);

    const revealKey = useCallback((key) => {
        setRevealedKeys(prev =>
            prev.includes(key) ? prev : [...prev, key]
        );
    }, []);

    const updateBookData = useCallback((id, data) => {
        setBookData(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || {}),
                ...(data || {})
            }
        }));
    }, []);

    const clearBookData = useCallback(() => {
        setBookData({});
    }, []);

    const value = {
        // State
        mode,
        level,
        vocabLevel,
        activeId,
        activeSentenceId,
        revealedKeys,
        bookData,

        // Constants
        VOCAB_MAP,
        LEVEL_DESCS,

        // Actions
        switchMode,
        changeLevel,
        changeVocabLevel,
        setActiveId,
        setActiveSentenceId,
        revealKey,
        updateBookData,
        clearBookData
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
}
