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
    /**
     * Analyze text for Reading Coach (Smart Import).
     * Returns structured JSON with segmentation, keywords, and insights.
     */
    async analyzeText(rawText) {
        const systemPrompt = `You are a linguistic engine for an English learning app. 
        Analyze the user's text. 
        1. Split the text into INDIVIDUAL SENTENCES. However, if a sentence is very short (less than 6 words), merge it with the previous or next sentence to keep flow.
        2. Return a VALID JSON object (no markdown formatting, just raw JSON).
        Structure:
        {
          "paragraphs": [
            {
              "text": "Sentence text...",
              "translation": "Full Chinese translation of this paragraph.",
              "insight": { "tag": "Short Theme (e.g. Irony)", "text": "Deep analysis..." },
              "knowledge": [
                { 
                  "key": "unique_id_for_word", 
                  "word": "Display Word", 
                  "ipa": "IPA", 
                  "def": "Chinese Definition", 
                  "clue": "English Hint/Synonym", 
                  "diff": 1-6 (Integer, 1=A1, 6=C2), 
                  "context": "Short sentence context or collocation" 
                }
              ]
            }
          ]
        }
        Do not include \`\`\`json blocks. Just the raw JSON string.`;

        // We use the same chat interface but with a different prompt
        // Note: For large texts, we might need chunking, but for demo we assume reasonable length.
        const responseText = await this.chat(systemPrompt, rawText);

        console.log("Raw AI Response:", responseText); // Debug log

        // Clean up response if it contains markdown code blocks
        // Regex to capture content inside ```json ... ``` or just ``` ... ```
        let jsonStr = responseText;
        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1];
        }

        jsonStr = jsonStr.trim();

        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error("AI JSON Parse Error:", e, jsonStr);
            // Fallback: try to find start and end of JSON array/object
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
}

export const aiService = new AIService();
