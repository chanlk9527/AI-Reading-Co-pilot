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
