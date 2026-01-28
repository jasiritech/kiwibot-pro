/**
 * 🥝 KiwiBot Pro - AI Service
 * Multi-provider AI with streaming, tools, and advanced features
 * Supports: OpenAI, Anthropic, Google Gemini
 */
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { kiwiConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { eventBus } from '../utils/events.js';
import { sessionManager } from '../sessions/manager.js';
// Available models
const MODELS = {
    'gpt-4o': {
        id: 'gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        maxOutput: 16384,
        inputPrice: 2.5,
        outputPrice: 10,
        capabilities: ['chat', 'vision', 'tools', 'json'],
    },
    'gpt-4-turbo': {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        contextWindow: 128000,
        maxOutput: 4096,
        inputPrice: 10,
        outputPrice: 30,
        capabilities: ['chat', 'vision', 'tools', 'json'],
    },
    'gpt-3.5-turbo': {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        contextWindow: 16385,
        maxOutput: 4096,
        inputPrice: 0.5,
        outputPrice: 1.5,
        capabilities: ['chat', 'tools', 'json'],
    },
    'claude-3-5-sonnet-20241022': {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        maxOutput: 8192,
        inputPrice: 3,
        outputPrice: 15,
        capabilities: ['chat', 'vision', 'tools'],
    },
    'claude-3-opus-20240229': {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        contextWindow: 200000,
        maxOutput: 4096,
        inputPrice: 15,
        outputPrice: 75,
        capabilities: ['chat', 'vision', 'tools'],
    },
    'claude-sonnet-4-20250514': {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        contextWindow: 200000,
        maxOutput: 16384,
        inputPrice: 3,
        outputPrice: 15,
        capabilities: ['chat', 'vision', 'tools', 'extended-thinking'],
    },
    'claude-opus-4-5-20250514': {
        id: 'claude-opus-4-5-20250514',
        name: 'Claude Opus 4.5',
        contextWindow: 200000,
        maxOutput: 32768,
        inputPrice: 15,
        outputPrice: 75,
        capabilities: ['chat', 'vision', 'tools', 'extended-thinking'],
    },
    // Google Gemini Models
    'gemini-2.0-flash': {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        contextWindow: 1000000,
        maxOutput: 8192,
        inputPrice: 0.075,
        outputPrice: 0.30,
        capabilities: ['chat', 'vision', 'tools', 'json'],
    },
    'gemini-2.0-flash-thinking': {
        id: 'gemini-2.0-flash-thinking',
        name: 'Gemini 2.0 Flash Thinking',
        contextWindow: 1000000,
        maxOutput: 8192,
        inputPrice: 0.075,
        outputPrice: 0.30,
        capabilities: ['chat', 'vision', 'tools', 'extended-thinking'],
    },
    'gemini-3-flash-preview': {
        id: 'gemini-3-flash-preview',
        name: 'Gemini 3 Flash (Preview)',
        contextWindow: 1000000,
        maxOutput: 65536,
        inputPrice: 0,
        outputPrice: 0,
        capabilities: ['chat', 'vision', 'tools', 'json', 'extended-thinking'],
    },
    'gemini-1.5-pro': {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        contextWindow: 2000000,
        maxOutput: 8192,
        inputPrice: 1.25,
        outputPrice: 5.0,
        capabilities: ['chat', 'vision', 'tools', 'json'],
    },
    'gemini-1.5-flash': {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        contextWindow: 1000000,
        maxOutput: 8192,
        inputPrice: 0.075,
        outputPrice: 0.30,
        capabilities: ['chat', 'vision', 'tools'],
    },
};
class AIService {
    openai;
    anthropic;
    gemini;
    geminiModel;
    tools = new Map();
    constructor() {
        this.initProviders();
    }
    initProviders() {
        const providers = kiwiConfig.ai.providers;
        if (providers.openai?.apiKey) {
            this.openai = new OpenAI({ apiKey: providers.openai.apiKey });
            logger.info('OpenAI provider initialized');
        }
        if (providers.anthropic?.apiKey) {
            this.anthropic = new Anthropic({ apiKey: providers.anthropic.apiKey });
            logger.info('Anthropic provider initialized');
        }
        // Initialize Gemini
        const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (geminiKey) {
            this.gemini = new GoogleGenerativeAI(geminiKey);
            const modelId = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
            this.geminiModel = this.gemini.getGenerativeModel({ model: modelId });
            logger.info(`Gemini provider initialized (${modelId})`);
        }
        if (!this.openai && !this.anthropic && !this.gemini) {
            logger.warn('No AI providers configured! Add API keys to .env');
        }
    }
    /**
     * Register a tool that can be called by the AI
     */
    registerTool(tool) {
        this.tools.set(tool.name, tool);
        logger.debug(`Registered AI tool: ${tool.name}`);
    }
    /**
     * Main chat function - handles full conversation
     */
    async chat(message) {
        const session = sessionManager.getOrCreate(message.author.id, message.channel, message.channelId);
        // Add user message to session
        sessionManager.addMessage(session.id, 'user', message.content);
        // Get conversation history
        const history = sessionManager.getHistory(session.id);
        // Build options
        const options = {
            model: session.context.model,
            temperature: session.context.temperature,
            maxTokens: session.context.maxTokens,
            systemPrompt: session.context.systemPrompt,
            tools: Array.from(this.tools.values()),
        };
        eventBus.emitEvent('agent:start', session.id, message.content);
        try {
            let response;
            if (this.isGeminiModel(options.model)) {
                response = await this.chatWithGemini(history, options);
            }
            else if (this.isAnthropicModel(options.model)) {
                response = await this.chatWithAnthropic(history, options);
            }
            else {
                response = await this.chatWithOpenAI(history, options);
            }
            // Handle tool calls if any
            if (response.toolCalls && response.toolCalls.length > 0) {
                const toolResults = await this.executeToolCalls(response.toolCalls);
                // Continue conversation with tool results
                // (simplified - in production would loop)
            }
            // Add response to session
            sessionManager.addMessage(session.id, 'assistant', response.content);
            eventBus.emitEvent('agent:complete', session.id, response.content);
            return response.content;
        }
        catch (error) {
            logger.error(`AI chat error: ${error.message}`);
            eventBus.emitEvent('agent:error', session.id, error);
            throw error;
        }
    }
    /**
     * Stream chat response
     */
    async *stream(message) {
        const session = sessionManager.getOrCreate(message.author.id, message.channel, message.channelId);
        sessionManager.addMessage(session.id, 'user', message.content);
        const history = sessionManager.getHistory(session.id);
        const options = {
            model: session.context.model,
            temperature: session.context.temperature,
            maxTokens: session.context.maxTokens,
            systemPrompt: session.context.systemPrompt,
            stream: true,
        };
        eventBus.emitEvent('agent:start', session.id, message.content);
        let fullResponse = '';
        try {
            if (this.isGeminiModel(options.model)) {
                for await (const chunk of this.streamGemini(history, options)) {
                    fullResponse += chunk;
                    eventBus.emitEvent('agent:chunk', session.id, chunk);
                    yield chunk;
                }
            }
            else if (this.isAnthropicModel(options.model)) {
                for await (const chunk of this.streamAnthropic(history, options)) {
                    fullResponse += chunk;
                    eventBus.emitEvent('agent:chunk', session.id, chunk);
                    yield chunk;
                }
            }
            else {
                for await (const chunk of this.streamOpenAI(history, options)) {
                    fullResponse += chunk;
                    eventBus.emitEvent('agent:chunk', session.id, chunk);
                    yield chunk;
                }
            }
            sessionManager.addMessage(session.id, 'assistant', fullResponse);
            eventBus.emitEvent('agent:complete', session.id, fullResponse);
        }
        catch (error) {
            eventBus.emitEvent('agent:error', session.id, error);
            throw error;
        }
    }
    /**
     * OpenAI chat completion
     */
    async chatWithOpenAI(messages, options) {
        if (!this.openai)
            throw new Error('OpenAI not configured');
        const chatMessages = [];
        if (options.systemPrompt) {
            chatMessages.push({ role: 'system', content: options.systemPrompt });
        }
        for (const msg of messages) {
            chatMessages.push({
                role: msg.role,
                content: msg.content,
            });
        }
        const completion = await this.openai.chat.completions.create({
            model: options.model,
            messages: chatMessages,
            max_tokens: options.maxTokens,
            temperature: options.temperature,
        });
        const choice = completion.choices[0];
        return {
            content: choice.message?.content || '',
            model: options.model,
            usage: {
                promptTokens: completion.usage?.prompt_tokens || 0,
                completionTokens: completion.usage?.completion_tokens || 0,
                totalTokens: completion.usage?.total_tokens || 0,
            },
            finishReason: choice.finish_reason,
        };
    }
    /**
     * OpenAI streaming
     */
    async *streamOpenAI(messages, options) {
        if (!this.openai)
            throw new Error('OpenAI not configured');
        const chatMessages = [];
        if (options.systemPrompt) {
            chatMessages.push({ role: 'system', content: options.systemPrompt });
        }
        for (const msg of messages) {
            chatMessages.push({
                role: msg.role,
                content: msg.content,
            });
        }
        const stream = await this.openai.chat.completions.create({
            model: options.model,
            messages: chatMessages,
            max_tokens: options.maxTokens,
            temperature: options.temperature,
            stream: true,
        });
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                yield content;
            }
        }
    }
    /**
     * Anthropic chat completion
     */
    async chatWithAnthropic(messages, options) {
        if (!this.anthropic)
            throw new Error('Anthropic not configured');
        const anthropicMessages = messages.map(m => ({
            role: m.role,
            content: m.content,
        }));
        const response = await this.anthropic.messages.create({
            model: options.model,
            max_tokens: options.maxTokens || 4096,
            system: options.systemPrompt,
            messages: anthropicMessages,
        });
        const textBlock = response.content.find(b => b.type === 'text');
        return {
            content: textBlock?.type === 'text' ? textBlock.text : '',
            model: options.model,
            usage: {
                promptTokens: response.usage.input_tokens,
                completionTokens: response.usage.output_tokens,
                totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            },
            finishReason: response.stop_reason,
        };
    }
    /**
     * Anthropic streaming
     */
    async *streamAnthropic(messages, options) {
        if (!this.anthropic)
            throw new Error('Anthropic not configured');
        const anthropicMessages = messages.map(m => ({
            role: m.role,
            content: m.content,
        }));
        const stream = this.anthropic.messages.stream({
            model: options.model,
            max_tokens: options.maxTokens || 4096,
            system: options.systemPrompt,
            messages: anthropicMessages,
        });
        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                yield event.delta.text;
            }
        }
    }
    /**
     * Execute tool calls
     */
    async executeToolCalls(toolCalls) {
        const results = [];
        for (const call of toolCalls) {
            const tool = this.tools.get(call.name);
            if (tool) {
                try {
                    const result = await tool.execute(call.arguments);
                    results.push({ id: call.id, result });
                }
                catch (error) {
                    results.push({ id: call.id, error: error.message });
                }
            }
        }
        return results;
    }
    isAnthropicModel(model) {
        return model.startsWith('claude');
    }
    isGeminiModel(model) {
        return model.startsWith('gemini');
    }
    /**
     * Gemini chat completion
     */
    async chatWithGemini(messages, options) {
        if (!this.gemini)
            throw new Error('Gemini not configured');
        // Get the appropriate model
        const modelId = options.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        const model = this.gemini.getGenerativeModel({
            model: modelId,
            generationConfig: {
                temperature: options.temperature,
                maxOutputTokens: options.maxTokens,
            },
        });
        // Build chat history for Gemini format
        const history = messages.slice(0, -1).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));
        // Start chat with history
        const chat = model.startChat({
            history,
            systemInstruction: options.systemPrompt
                ? { role: 'system', parts: [{ text: options.systemPrompt }] }
                : undefined,
        });
        // Get last message
        const lastMessage = messages[messages.length - 1];
        const result = await chat.sendMessage(lastMessage.content);
        const response = result.response;
        return {
            content: response.text(),
            model: modelId,
            usage: {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
            },
            finishReason: 'stop',
        };
    }
    /**
     * Stream Gemini responses
     */
    async *streamGemini(messages, options) {
        if (!this.gemini)
            throw new Error('Gemini not configured');
        const modelId = options.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        const model = this.gemini.getGenerativeModel({
            model: modelId,
            generationConfig: {
                temperature: options.temperature,
                maxOutputTokens: options.maxTokens,
            },
        });
        const history = messages.slice(0, -1).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));
        const chat = model.startChat({
            history,
            systemInstruction: options.systemPrompt
                ? { role: 'system', parts: [{ text: options.systemPrompt }] }
                : undefined,
        });
        const lastMessage = messages[messages.length - 1];
        const result = await chat.sendMessageStream(lastMessage.content);
        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text)
                yield text;
        }
    }
    /**
     * Get available models
     */
    getModels() {
        const available = [];
        if (this.openai) {
            available.push(MODELS['gpt-4o'], MODELS['gpt-4-turbo'], MODELS['gpt-3.5-turbo']);
        }
        if (this.anthropic) {
            available.push(MODELS['claude-3-5-sonnet-20241022'], MODELS['claude-3-opus-20240229'], MODELS['claude-sonnet-4-20250514'], MODELS['claude-opus-4-5-20250514']);
        }
        if (this.gemini) {
            available.push(MODELS['gemini-3-flash-preview'], MODELS['gemini-2.0-flash'], MODELS['gemini-2.0-flash-thinking'], MODELS['gemini-1.5-pro'], MODELS['gemini-1.5-flash']);
        }
        return available;
    }
    /**
     * Check if a provider is available
     */
    hasProvider(provider) {
        if (provider === 'openai')
            return !!this.openai;
        if (provider === 'anthropic')
            return !!this.anthropic;
        if (provider === 'gemini')
            return !!this.gemini;
        return false;
    }
    /**
     * Get list of available providers
     */
    async checkProviders() {
        const available = [];
        if (this.openai)
            available.push('openai');
        if (this.anthropic)
            available.push('anthropic');
        if (this.gemini)
            available.push('gemini');
        return available;
    }
}
export const aiService = new AIService();
//# sourceMappingURL=service.js.map