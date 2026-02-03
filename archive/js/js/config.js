export const AI_CONFIG = {
    // -----------------------------------------------------------
    // ⚠️ SECURITY NOTE:
    // We now use LocalStorage to persist keys so they are not hardcoded.
    // -----------------------------------------------------------

    // Select which provider to use: 'aliyun' or 'google'
    // Default to 'google' if not set
    provider: localStorage.getItem('AI_PROVIDER') || 'aliyun',

    aliyun: {
        // Get Key: https://dashscope.console.aliyun.com/apiKey
        apiKey: localStorage.getItem('ALIYUN_API_KEY') || "sk-beca0b70649540348826dd433986fe54",
        model: "qwen-plus"
    },

    google: {
        // Get Key: https://aistudio.google.com/app/apikey
        apiKey: localStorage.getItem('GOOGLE_API_KEY') || "",
        model: "gemini-2.5-flash-lite"
    }
};
