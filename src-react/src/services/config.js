/**
 * AI Service Configuration
 * Reads API keys from localStorage for security
 * Default to Aliyun with preset key
 */
export const AI_CONFIG = {
    provider: localStorage.getItem('AI_PROVIDER') || 'aliyun',
    aliyun: {
        apiKey: localStorage.getItem('ALIYUN_API_KEY') || "sk-beca0b70649540348826dd433986fe54",
        model: "qwen-plus"
    },
    google: {
        apiKey: localStorage.getItem('GOOGLE_API_KEY') || "",
        model: "gemini-2.5-flash-lite"
    }
};

const parsePositiveInt = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const n = Number.parseInt(String(value), 10);
    return Number.isInteger(n) && n > 0 ? n : null;
};

const parseBoolean = (value) => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return null;
};

// Toggle sentence-level analysis (auto-analysis + reanalyze button).
// Default is ON; can still be overridden by localStorage/env for testing.
export const SENTENCE_ANALYSIS_ENABLED = (() => {
    const localOverride = localStorage.getItem('ENABLE_SENTENCE_ANALYSIS');
    if (localOverride !== null) {
        return localOverride === 'true';
    }

    const envValue = import.meta.env.VITE_ENABLE_SENTENCE_ANALYSIS;
    if (typeof envValue === 'string') {
        return envValue.toLowerCase() === 'true';
    }

    return true;
})();

export const AUTO_ANALYSIS_STORAGE_KEY = 'ENABLE_AUTO_ANALYSIS';

export const getAutoAnalysisEnabled = () => {
    const localOverride = parseBoolean(localStorage.getItem(AUTO_ANALYSIS_STORAGE_KEY));
    if (localOverride !== null) return localOverride;

    const envValue = parseBoolean(import.meta.env.VITE_ENABLE_AUTO_ANALYSIS);
    if (envValue !== null) return envValue;

    // Backward-compatible fallback to the old global sentence analysis switch.
    return SENTENCE_ANALYSIS_ENABLED;
};

export const setAutoAnalysisEnabled = (enabled) => {
    localStorage.setItem(AUTO_ANALYSIS_STORAGE_KEY, String(Boolean(enabled)));
};

// Global safeguard for analysis requests.
// Meaning: at most M analysis requests in N seconds.
export const ANALYSIS_RATE_LIMIT_WINDOW_SECONDS = (() => {
    const localOverride = parsePositiveInt(localStorage.getItem('ANALYSIS_RATE_LIMIT_WINDOW_SECONDS'));
    if (localOverride !== null) return localOverride;

    const envValue = parsePositiveInt(import.meta.env.VITE_ANALYSIS_RATE_LIMIT_WINDOW_SECONDS);
    if (envValue !== null) return envValue;

    return 20;
})();

export const ANALYSIS_RATE_LIMIT_MAX_REQUESTS = (() => {
    const localOverride = parsePositiveInt(localStorage.getItem('ANALYSIS_RATE_LIMIT_MAX_REQUESTS'));
    if (localOverride !== null) return localOverride;

    const envValue = parsePositiveInt(import.meta.env.VITE_ANALYSIS_RATE_LIMIT_MAX_REQUESTS);
    if (envValue !== null) return envValue;

    return 6;
})();
