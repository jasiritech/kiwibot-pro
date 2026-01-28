/**
 * 🥝 KiwiBot Pro - Gemini AI Provider
 * Google Gemini integration (User requested!)
 */
declare class GeminiProvider {
    private apiKey;
    private baseUrl;
    private model;
    constructor();
    /**
     * Check if Gemini is available
     */
    isAvailable(): boolean;
    /**
     * Generate chat completion
     */
    chat(messages: {
        role: 'user' | 'assistant' | 'system';
        content: string;
    }[], options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
    }): Promise<{
        content: string;
        tokens: {
            input: number;
            output: number;
        };
    }>;
    /**
     * Stream chat completion
     */
    streamChat(messages: {
        role: 'user' | 'assistant' | 'system';
        content: string;
    }[], options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
    }): AsyncGenerator<string>;
    /**
     * Generate embeddings
     */
    embed(text: string): Promise<number[]>;
    /**
     * Count tokens
     */
    countTokens(text: string): Promise<number>;
    /**
     * List available models
     */
    listModels(): Promise<string[]>;
    /**
     * Set model
     */
    setModel(model: string): void;
    /**
     * Get current model
     */
    getModel(): string;
}
export declare const geminiProvider: GeminiProvider;
export {};
//# sourceMappingURL=gemini.d.ts.map