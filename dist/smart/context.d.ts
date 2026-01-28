/**
 * 🥝 KiwiBot Pro - Smart Context Manager
 * Automatic context compression & summarization (UNIQUE!)
 */
interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
}
interface ContextConfig {
    maxTokens: number;
    targetTokens: number;
    keepRecentCount: number;
    autoCompress: boolean;
}
declare class SmartContextManager {
    private contexts;
    private config;
    private openai?;
    private anthropic?;
    constructor(config?: Partial<ContextConfig>);
    /**
     * Add a message to the context
     */
    addMessage(sessionId: string, message: Message): Promise<void>;
    /**
     * Get messages with smart context management
     */
    getMessages(sessionId: string): Message[];
    /**
     * Compress the context by summarizing old messages
     */
    compress(sessionId: string): Promise<void>;
    /**
     * Summarize messages
     */
    private summarize;
    /**
     * Get context summary
     */
    getSummary(sessionId: string): string | undefined;
    /**
     * Get context statistics
     */
    getStats(sessionId: string): {
        messageCount: number;
        tokenCount: number;
        hasSummary: boolean;
        compressedAt?: Date;
    } | undefined;
    /**
     * Build optimized context for API call
     */
    buildContext(sessionId: string, maxTokens: number): Message[];
    /**
     * Search context for relevant information
     */
    search(sessionId: string, query: string): Message[];
    /**
     * Clear context for a session
     */
    clear(sessionId: string): void;
    /**
     * Estimate token count (rough approximation)
     */
    private estimateTokens;
    /**
     * Export context for backup
     */
    export(sessionId: string): string | null;
    /**
     * Import context from backup
     */
    import(sessionId: string, data: string): boolean;
}
export declare const smartContext: SmartContextManager;
export {};
//# sourceMappingURL=context.d.ts.map