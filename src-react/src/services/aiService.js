import {
    AI_CONFIG,
    ANALYSIS_RATE_LIMIT_WINDOW_SECONDS,
    ANALYSIS_RATE_LIMIT_MAX_REQUESTS
} from './config.js';
import { PROMPTS } from './prompts.js';

const API_BASE_URL = 'http://localhost:8000';
const analysisRequestTimestamps = [];

const buildApiError = async (response, fallbackMessage = 'AI request failed') => {
    let payload = null;
    let message = fallbackMessage;

    try {
        payload = await response.json();
        if (typeof payload?.detail === 'string' && payload.detail.trim()) {
            message = payload.detail;
        } else if (payload?.detail && typeof payload.detail === 'object') {
            message = payload.detail.message || payload.detail.code || fallbackMessage;
        }
    } catch {
        try {
            const text = await response.text();
            if (text && text.trim()) message = text.trim();
        } catch {
            // ignore parse errors
        }
    }

    const err = new Error(message);
    err.status = response.status;
    if (payload !== null) err.payload = payload;
    if (payload?.detail !== undefined) err.detail = payload.detail;
    return err;
};

const pruneAnalysisWindow = (now) => {
    const windowMs = ANALYSIS_RATE_LIMIT_WINDOW_SECONDS * 1000;
    while (analysisRequestTimestamps.length > 0 && (now - analysisRequestTimestamps[0]) >= windowMs) {
        analysisRequestTimestamps.shift();
    }
};

const consumeAnalysisSlot = () => {
    const now = Date.now();
    pruneAnalysisWindow(now);

    if (analysisRequestTimestamps.length >= ANALYSIS_RATE_LIMIT_MAX_REQUESTS) {
        const windowMs = ANALYSIS_RATE_LIMIT_WINDOW_SECONDS * 1000;
        const oldest = analysisRequestTimestamps[0];
        const retryAfterMs = Math.max(0, windowMs - (now - oldest));
        const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
        const err = new Error(
            `Analysis rate limited: max ${ANALYSIS_RATE_LIMIT_MAX_REQUESTS} requests in `
            + `${ANALYSIS_RATE_LIMIT_WINDOW_SECONDS}s. Retry in ~${retryAfterSeconds}s.`
        );
        err.code = 'ANALYSIS_RATE_LIMITED';
        err.retryAfterSeconds = retryAfterSeconds;
        throw err;
    }

    analysisRequestTimestamps.push(now);
};

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
    async chatStream(systemPrompt, userQuery, onChunk, requestType = 'chat') {
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
                api_key: this.config[this.config.provider]?.apiKey || null,
                request_type: requestType
            })
        });

        if (!response.ok) {
            throw await buildApiError(response, 'AI request failed');
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
    async chat(systemPrompt, userQuery, requestType = 'chat') {
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
                api_key: this.config[this.config.provider]?.apiKey || null,
                request_type: requestType
            })
        });

        if (!response.ok) {
            throw await buildApiError(response, 'AI request failed');
        }

        const data = await response.json();
        return data.content;
    }

    // ... existing code ...

    /**
     * Analyze text for Reading Coach (Smart Import).
     */
    async analyzeText(rawText) {
        consumeAnalysisSlot();
        const systemPrompt = PROMPTS.ANALYSIS.SYSTEM;

        // Use non-streaming for JSON parsing
        const responseText = await this.chat(systemPrompt, rawText, 'analysis');
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
        consumeAnalysisSlot();
        const systemPrompt = PROMPTS.ANALYSIS.SYSTEM;
        const responseText = await this.chat(systemPrompt, rawText, 'analysis');

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
