/**
 * AI Service Configuration
 * Reads API keys from localStorage for security
 */
export const AI_CONFIG = {
    provider: localStorage.getItem('AI_PROVIDER') || 'google',
    aliyun: {
        apiKey: localStorage.getItem('ALIYUN_API_KEY') || "",
        model: "qwen-turbo"
    },
    google: {
        apiKey: localStorage.getItem('GOOGLE_API_KEY') || "",
        model: "gemini-2.5-flash-lite"
    }
};
