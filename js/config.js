export const AI_CONFIG = {
    // -----------------------------------------------------------
    // ⚠️ SECURITY WARNING:
    // Storing API Keys in client-side JavaScript is NOT SECURE.
    // Ideally, these calls should go through a backend server.
    // For this DEMO ONLY, we will call APIs directly from the browser.
    // -----------------------------------------------------------

    // Select which provider to use: 'aliyun' or 'google'
    provider: 'google',

    aliyun: {
        // Get Key: https://dashscope.console.aliyun.com/apiKey
        apiKey: "",
        model: "qwen-turbo" // Options: qwen-turbo, qwen-plus, qwen-max
    },

    google: {
        // Get Key: https://aistudio.google.com/app/apikey
        apiKey: "AIzaSyB1lL02IDdWvJgSz83XTF-ok3dvMQj6dpQ",
        model: "gemini-2.5-flash-lite"
    }
};
