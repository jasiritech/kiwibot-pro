/**
 * 🥝 KiwiBot Pro - Smart Context Manager
 * Automatic context compression & summarization (UNIQUE!)
 */
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';
const DEFAULT_CONFIG = {
    maxTokens: 100000,
    targetTokens: 50000,
    keepRecentCount: 10,
    autoCompress: true,
};
class SmartContextManager {
    contexts = new Map();
    config;
    openai;
    anthropic;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
        if (process.env.ANTHROPIC_API_KEY) {
            this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        }
    }
    /**
     * Add a message to the context
     */
    async addMessage(sessionId, message) {
        let context = this.contexts.get(sessionId);
        if (!context) {
            context = {
                messages: [],
                tokenCount: 0,
            };
            this.contexts.set(sessionId, context);
        }
        message.timestamp = new Date();
        context.messages.push(message);
        context.tokenCount += this.estimateTokens(message.content);
        // Auto-compress if needed
        if (this.config.autoCompress && context.tokenCount > this.config.maxTokens) {
            await this.compress(sessionId);
        }
    }
    /**
     * Get messages with smart context management
     */
    getMessages(sessionId) {
        const context = this.contexts.get(sessionId);
        if (!context)
            return [];
        // If we have a summary, prepend it as a system message
        if (context.summary) {
            return [
                {
                    role: 'system',
                    content: `Previous conversation summary:\n${context.summary}`,
                },
                ...context.messages,
            ];
        }
        return context.messages;
    }
    /**
     * Compress the context by summarizing old messages
     */
    async compress(sessionId) {
        const context = this.contexts.get(sessionId);
        if (!context || context.messages.length <= this.config.keepRecentCount) {
            return;
        }
        logger.info(`Context: Compressing session ${sessionId}`);
        // Split messages into old (to summarize) and recent (to keep)
        const splitIndex = context.messages.length - this.config.keepRecentCount;
        const oldMessages = context.messages.slice(0, splitIndex);
        const recentMessages = context.messages.slice(splitIndex);
        // Generate summary of old messages
        const summary = await this.summarize(oldMessages, context.summary);
        // Update context
        context.messages = recentMessages;
        context.summary = summary;
        context.tokenCount = this.estimateTokens(summary) +
            recentMessages.reduce((sum, m) => sum + this.estimateTokens(m.content), 0);
        context.compressedAt = new Date();
        logger.info(`Context: Compressed to ${context.tokenCount} tokens`);
    }
    /**
     * Summarize messages
     */
    async summarize(messages, existingSummary) {
        const conversationText = messages
            .map(m => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n\n');
        const prompt = existingSummary
            ? `Existing summary of earlier conversation:
${existingSummary}

New conversation to add to summary:
${conversationText}

Create an updated, comprehensive summary that captures all key information, decisions, and context. Keep it concise but complete.`
            : `Summarize this conversation, capturing:
1. Key topics discussed
2. Important information shared
3. Decisions made
4. User preferences revealed
5. Any pending questions or tasks

Conversation:
${conversationText}

Create a concise summary (max 500 words).`;
        try {
            if (this.anthropic) {
                const response = await this.anthropic.messages.create({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: prompt }],
                });
                return response.content[0].type === 'text' ? response.content[0].text : '';
            }
            else if (this.openai) {
                const response = await this.openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 1024,
                });
                return response.choices[0].message.content || '';
            }
        }
        catch (error) {
            logger.error(`Context: Summarization failed: ${error.message}`);
        }
        // Fallback: simple truncation
        return `Previous conversation included ${messages.length} messages about: ${messages.slice(0, 3).map(m => m.content.slice(0, 50)).join(', ')}...`;
    }
    /**
     * Get context summary
     */
    getSummary(sessionId) {
        return this.contexts.get(sessionId)?.summary;
    }
    /**
     * Get context statistics
     */
    getStats(sessionId) {
        const context = this.contexts.get(sessionId);
        if (!context)
            return undefined;
        return {
            messageCount: context.messages.length,
            tokenCount: context.tokenCount,
            hasSummary: !!context.summary,
            compressedAt: context.compressedAt,
        };
    }
    /**
     * Build optimized context for API call
     */
    buildContext(sessionId, maxTokens) {
        const context = this.contexts.get(sessionId);
        if (!context)
            return [];
        const messages = [];
        let currentTokens = 0;
        // Add summary if exists
        if (context.summary) {
            const summaryTokens = this.estimateTokens(context.summary);
            if (summaryTokens < maxTokens * 0.3) { // Summary should be max 30% of context
                messages.push({
                    role: 'system',
                    content: `Previous conversation summary:\n${context.summary}`,
                });
                currentTokens += summaryTokens;
            }
        }
        // Add messages from most recent, fitting within budget
        const reversed = [...context.messages].reverse();
        const toAdd = [];
        for (const msg of reversed) {
            const tokens = this.estimateTokens(msg.content);
            if (currentTokens + tokens > maxTokens)
                break;
            toAdd.unshift(msg);
            currentTokens += tokens;
        }
        return [...messages, ...toAdd];
    }
    /**
     * Search context for relevant information
     */
    search(sessionId, query) {
        const context = this.contexts.get(sessionId);
        if (!context)
            return [];
        const queryWords = query.toLowerCase().split(/\s+/);
        return context.messages.filter(msg => {
            const contentLower = msg.content.toLowerCase();
            return queryWords.some(word => contentLower.includes(word));
        });
    }
    /**
     * Clear context for a session
     */
    clear(sessionId) {
        this.contexts.delete(sessionId);
        logger.debug(`Context: Cleared session ${sessionId}`);
    }
    /**
     * Estimate token count (rough approximation)
     */
    estimateTokens(text) {
        // Rough estimate: ~4 characters per token
        return Math.ceil(text.length / 4);
    }
    /**
     * Export context for backup
     */
    export(sessionId) {
        const context = this.contexts.get(sessionId);
        if (!context)
            return null;
        return JSON.stringify({
            messages: context.messages,
            summary: context.summary,
            exportedAt: new Date().toISOString(),
        }, null, 2);
    }
    /**
     * Import context from backup
     */
    import(sessionId, data) {
        try {
            const parsed = JSON.parse(data);
            this.contexts.set(sessionId, {
                messages: parsed.messages,
                summary: parsed.summary,
                tokenCount: parsed.messages.reduce((sum, m) => sum + this.estimateTokens(m.content), 0) + (parsed.summary ? this.estimateTokens(parsed.summary) : 0),
            });
            return true;
        }
        catch {
            return false;
        }
    }
}
export const smartContext = new SmartContextManager();
//# sourceMappingURL=context.js.map