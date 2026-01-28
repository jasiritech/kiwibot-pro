/**
 * 🥝 KiwiBot Pro - Gemini AI Provider
 * Google Gemini integration (User requested!)
 */
import { logger } from '../utils/logger.js';
class GeminiProvider {
    apiKey;
    baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    model = 'gemini-1.5-pro';
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || '';
        if (this.apiKey) {
            logger.info('Gemini: Provider initialized ✓');
        }
    }
    /**
     * Check if Gemini is available
     */
    isAvailable() {
        return !!this.apiKey;
    }
    /**
     * Generate chat completion
     */
    async chat(messages, options = {}) {
        if (!this.apiKey) {
            throw new Error('Gemini API key not configured');
        }
        const model = options.model || this.model;
        // Convert messages to Gemini format
        const geminiMessages = [];
        let systemInstruction = '';
        for (const msg of messages) {
            if (msg.role === 'system') {
                systemInstruction += msg.content + '\n';
            }
            else {
                geminiMessages.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }],
                });
            }
        }
        const requestBody = {
            contents: geminiMessages,
            generationConfig: {
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxTokens ?? 2048,
                topP: 0.95,
                topK: 40,
            },
        };
        // Add system instruction if present
        if (systemInstruction) {
            requestBody.systemInstruction = {
                parts: [{ text: systemInstruction }],
            };
        }
        const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Gemini API error: ${response.status} - ${error}`);
            }
            const data = await response.json();
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('No response from Gemini');
            }
            const content = data.candidates[0].content.parts
                .map(p => p.text)
                .join('');
            return {
                content,
                tokens: {
                    input: data.usageMetadata?.promptTokenCount || 0,
                    output: data.usageMetadata?.candidatesTokenCount || 0,
                },
            };
        }
        catch (error) {
            logger.error(`Gemini: API call failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Stream chat completion
     */
    async *streamChat(messages, options = {}) {
        if (!this.apiKey) {
            throw new Error('Gemini API key not configured');
        }
        const model = options.model || this.model;
        // Convert messages
        const geminiMessages = [];
        let systemInstruction = '';
        for (const msg of messages) {
            if (msg.role === 'system') {
                systemInstruction += msg.content + '\n';
            }
            else {
                geminiMessages.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }],
                });
            }
        }
        const requestBody = {
            contents: geminiMessages,
            generationConfig: {
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxTokens ?? 2048,
            },
        };
        if (systemInstruction) {
            requestBody.systemInstruction = {
                parts: [{ text: systemInstruction }],
            };
        }
        const url = `${this.baseUrl}/models/${model}:streamGenerateContent?key=${this.apiKey}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                throw new Error(`Gemini stream error: ${response.status}`);
            }
            const reader = response.body?.getReader();
            if (!reader)
                throw new Error('No response body');
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                // Parse JSON chunks
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.trim().startsWith('{')) {
                        try {
                            const chunk = JSON.parse(line);
                            if (chunk.candidates?.[0]?.content?.parts) {
                                for (const part of chunk.candidates[0].content.parts) {
                                    if (part.text) {
                                        yield part.text;
                                    }
                                }
                            }
                        }
                        catch {
                            // Skip invalid JSON
                        }
                    }
                }
            }
        }
        catch (error) {
            logger.error(`Gemini: Stream failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Generate embeddings
     */
    async embed(text) {
        if (!this.apiKey) {
            throw new Error('Gemini API key not configured');
        }
        const url = `${this.baseUrl}/models/text-embedding-004:embedContent?key=${this.apiKey}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: {
                        parts: [{ text }],
                    },
                }),
            });
            if (!response.ok) {
                throw new Error(`Gemini embed error: ${response.status}`);
            }
            const data = await response.json();
            return data.embedding.values;
        }
        catch (error) {
            logger.error(`Gemini: Embed failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Count tokens
     */
    async countTokens(text) {
        if (!this.apiKey) {
            return Math.ceil(text.length / 4); // Rough estimate
        }
        const url = `${this.baseUrl}/models/${this.model}:countTokens?key=${this.apiKey}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text }] }],
                }),
            });
            if (!response.ok) {
                return Math.ceil(text.length / 4);
            }
            const data = await response.json();
            return data.totalTokens;
        }
        catch {
            return Math.ceil(text.length / 4);
        }
    }
    /**
     * List available models
     */
    async listModels() {
        if (!this.apiKey)
            return [];
        const url = `${this.baseUrl}/models?key=${this.apiKey}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.models
                ?.filter((m) => m.name.includes('gemini'))
                .map((m) => m.name.replace('models/', '')) || [];
        }
        catch {
            return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'];
        }
    }
    /**
     * Set model
     */
    setModel(model) {
        this.model = model;
        logger.info(`Gemini: Model set to ${model}`);
    }
    /**
     * Get current model
     */
    getModel() {
        return this.model;
    }
}
export const geminiProvider = new GeminiProvider();
//# sourceMappingURL=gemini.js.map