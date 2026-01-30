import { AI_CONFIG } from './config.js';

/**
 * Unified AI Service to handle requests to different providers.
 */
export class AIService {

    constructor() {
        this.config = AI_CONFIG;
    }

    /**
     * Send a query to the configured AI provider.
     * @param {string} systemPrompt - The system instruction (context, role).
     * @param {string} userQuery - The user's question or input.
     * @returns {Promise<string>} - The AI's response text.
     */
    async chat(systemPrompt, userQuery) {
        const provider = this.config.provider;

        if (provider === 'aliyun') {
            return this._callAliyun(systemPrompt, userQuery);
        } else if (provider === 'google') {
            return this._callGoogle(systemPrompt, userQuery);
        } else {
            throw new Error(`Unknown provider: ${provider}`);
        }
    }

    /**
     * Call Alibaba Cloud DashScope API (Qwen)
     */
    async _callAliyun(systemPrompt, userQuery) {
        const { apiKey, model } = this.config.aliyun;
        if (!apiKey) throw new Error("Aliyun API Key is missing in js/config.js");

        const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                input: {
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userQuery }
                    ]
                },
                parameters: {
                    result_format: 'message'
                }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`Aliyun Error: ${err.message || response.statusText}`);
        }

        const data = await response.json();
        return data.output.choices[0].message.content;
    }

    /**
     * Call Google Gemini API
     */
    async _callGoogle(systemPrompt, userQuery) {
        const { apiKey, model } = this.config.google;
        if (!apiKey) throw new Error("Google API Key is missing in js/config.js");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Gemini doesn"t verify have a strict "system" role in the 1.0 endpoint same way, 
        // but we can merge it or use the new structure. 
        // For simplicity/compatibility, we concatenate.
        const combinedPrompt = `${systemPrompt}\n\nUser Query: ${userQuery}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: combinedPrompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`Google Error: ${err.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
}

export const aiService = new AIService();
