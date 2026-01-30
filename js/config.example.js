export const AI_CONFIG = {
    // -----------------------------------------------------------
    // ⚠️ SECURITY WARNING:
    // Storing API Keys in client-side JavaScript is NOT SECURE.
    // Ideally, these calls should go through a backend server.
    // For this DEMO ONLY, we will call APIs directly from the browser.
    // -----------------------------------------------------------

    // Select which provider to use: 'aliyun' or 'google'
    provider: 'aliyun',

    aliyun: {
        // Get Key: https://dashscope.console.aliyun.com/apiKey
        apiKey: "YOUR_ALIYUN_KEY",
        model: "qwen-turbo" // Options: qwen-turbo, qwen-plus, qwen-max
    },

    google: {
        // Get Key: https://aistudio.google.com/app/apikey
        apiKey: "YOUR_GOOGLE_KEY",
        model: "gemini-1.5-flash"
    }
};
