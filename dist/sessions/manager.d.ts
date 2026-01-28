/**
 * 🥝 KiwiBot Pro - Session Manager
 * Conversation memory and context management
 */
import type { Session, ConversationMessage, SessionContext, ChannelType } from '../types/index.js';
declare class SessionManager {
    private sessions;
    private maxMessagesPerSession;
    private sessionTimeout;
    constructor();
    /**
     * Get or create a session for a user/channel combination
     */
    getOrCreate(userId: string, channel: ChannelType, channelId: string): Session;
    /**
     * Get a session by ID
     */
    get(sessionId: string): Session | null;
    /**
     * Add a message to a session
     */
    addMessage(sessionId: string, role: 'user' | 'assistant', content: string): void;
    /**
     * Get conversation history for AI
     */
    getHistory(sessionId: string): ConversationMessage[];
    /**
     * Clear a session's messages
     */
    clear(sessionId: string): boolean;
    /**
     * Delete a session completely
     */
    delete(sessionId: string): boolean;
    /**
     * Update session context
     */
    updateContext(sessionId: string, updates: Partial<SessionContext>): void;
    /**
     * Set memory item in session
     */
    setMemory(sessionId: string, key: string, value: string, ttl?: number): void;
    /**
     * Get memory item from session
     */
    getMemory(sessionId: string, key: string): string | null;
    /**
     * List all sessions
     */
    list(): Session[];
    /**
     * Get session count
     */
    count(): number;
    /**
     * Get stats
     */
    getStats(): {
        sessions: number;
        totalMessages: number;
    };
    /**
     * Compact a session (summarize old messages)
     */
    compact(sessionId: string, summarizer: (messages: ConversationMessage[]) => Promise<string>): Promise<void>;
    private generateSessionId;
    private getDefaultContext;
    private cleanup;
}
export declare const sessionManager: SessionManager;
export {};
//# sourceMappingURL=manager.d.ts.map