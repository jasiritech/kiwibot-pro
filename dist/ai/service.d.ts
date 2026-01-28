/**
 * 🥝 KiwiBot Pro - AI Service
 * Multi-provider AI with streaming, tools, and advanced features
 * Supports: OpenAI, Anthropic, Google Gemini
 */
import type { Message, AIModel, AITool } from '../types/index.js';
declare class AIService {
    private openai?;
    private anthropic?;
    private gemini?;
    private geminiModel?;
    private tools;
    constructor();
    private initProviders;
    /**
     * Register a tool that can be called by the AI
     */
    registerTool(tool: AITool): void;
    /**
     * Main chat function - handles full conversation
     */
    chat(message: Message): Promise<string>;
    /**
     * Stream chat response
     */
    stream(message: Message): AsyncGenerator<string>;
    /**
     * OpenAI chat completion
     */
    private chatWithOpenAI;
    /**
     * OpenAI streaming
     */
    private streamOpenAI;
    /**
     * Anthropic chat completion
     */
    private chatWithAnthropic;
    /**
     * Anthropic streaming
     */
    private streamAnthropic;
    /**
     * Execute tool calls
     */
    private executeToolCalls;
    private isAnthropicModel;
    private isGeminiModel;
    /**
     * Gemini chat completion
     */
    private chatWithGemini;
    /**
     * Stream Gemini responses
     */
    private streamGemini;
    /**
     * Get available models
     */
    getModels(): AIModel[];
    /**
     * Check if a provider is available
     */
    hasProvider(provider: 'openai' | 'anthropic' | 'gemini'): boolean;
    /**
     * Get list of available providers
     */
    checkProviders(): Promise<string[]>;
}
export declare const aiService: AIService;
export {};
//# sourceMappingURL=service.d.ts.map