/**
 * 🥝 KiwiBot Pro - Typing Indicators
 * Show "typing..." status in channels (like Moltbot)
 */
interface TypingState {
    channelType: string;
    channelId: string;
    userId: string;
    startedAt: Date;
    timeout: NodeJS.Timeout;
}
type TypingCallback = (channelId: string, show: boolean) => Promise<void>;
declare class TypingManager {
    private activeTyping;
    private callbacks;
    private typingDuration;
    /**
     * Register a typing callback for a channel type
     */
    registerChannel(channelType: string, callback: TypingCallback): void;
    /**
     * Start showing typing indicator
     */
    startTyping(channelType: string, channelId: string, userId: string): Promise<void>;
    /**
     * Stop showing typing indicator
     */
    stopTyping(channelType: string, channelId: string): void;
    /**
     * Stop all typing indicators
     */
    stopAll(): void;
    /**
     * Check if typing is active
     */
    isTyping(channelType: string, channelId: string): boolean;
    /**
     * Get all active typing states
     */
    getActive(): TypingState[];
    /**
     * Wrap an async function with typing indicator
     */
    withTyping<T>(channelType: string, channelId: string, userId: string, fn: () => Promise<T>): Promise<T>;
}
export declare const typingManager: TypingManager;
export {};
//# sourceMappingURL=typing.d.ts.map