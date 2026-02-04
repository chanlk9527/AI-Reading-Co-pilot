import { AI_CONFIG } from './config.js';
import { PROMPTS } from './prompts.js';

const API_BASE_URL = 'http://localhost:8000';

/**
 * Unified AI Service - uses backend proxy with streaming support
 */
class AIService {
    constructor() {
        this.config = AI_CONFIG;
    }

    getToken() {
        return localStorage.getItem('access_token');
    }

    /**
     * Send a query to the AI with streaming response
     * @param {string} systemPrompt 
     * @param {string} userQuery 
     * @param {function} onChunk - Callback for each chunk received
     * @returns {Promise<string>} Full response text
     */
    async chatStream(systemPrompt, userQuery, onChunk) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                system_prompt: systemPrompt,
                user_query: userQuery,
                provider: this.config.provider,
                api_key: this.config[this.config.provider]?.apiKey || null
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'AI request failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Parse SSE events
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);

                    if (data === '[DONE]') {
                        continue;
                    }

                    if (data.startsWith('[ERROR]')) {
                        throw new Error(data.slice(7));
                    }

                    fullText += data;
                    if (onChunk) {
                        onChunk(data, fullText);
                    }
                }
            }
        }

        return fullText;
    }

    /**
     * Non-streaming chat (for backward compatibility)
     */
    async chat(systemPrompt, userQuery) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/ai/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                system_prompt: systemPrompt,
                user_query: userQuery,
                provider: this.config.provider,
                api_key: this.config[this.config.provider]?.apiKey || null
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'AI request failed');
        }

        const data = await response.json();
        return data.content;
    }

    // ... existing code ...

    /**
     * Analyze text for Reading Coach (Smart Import).
     */
    async analyzeText(rawText) {
        const systemPrompt = PROMPTS.ANALYSIS.SYSTEM;

        // Use non-streaming for JSON parsing
        const responseText = await this.chat(systemPrompt, rawText);
        console.log("Raw AI Response:", responseText);

        let jsonStr = responseText;
        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1];
        }

        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error("AI JSON Parse Error:", e, jsonStr);
            // Fallback: Try to find valid JSON object
            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                try {
                    return JSON.parse(jsonStr.substring(firstBrace, lastBrace + 1));
                } catch (e2) {
                    throw new Error("Failed to parse AI response. " + e.message);
                }
            }
            throw new Error("Failed to parse AI response. " + e.message);
        }
    }

    /* splitText removed - replaced by backend Spacy Sentencizer */

    /**
     * Analyze a single sentence/paragraph (content analysis).
     */
    async analyzeSentence(rawText) {
        const systemPrompt = PROMPTS.ANALYSIS.SYSTEM;
        const responseText = await this.chat(systemPrompt, rawText);

        let jsonStr = responseText;
        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1];
        }

        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error("AI Analysis Parse Error:", e, jsonStr);
            throw new Error("Failed to parse analysis.");
        }
    }
}

export const aiService = new AIService();
