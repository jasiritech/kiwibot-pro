/**
 * 🥝 KiwiBot Pro - Typing Indicators
 * Show "typing..." status in channels (like Moltbot)
 */
import { logger } from '../utils/logger.js';
import { eventBus } from '../utils/events.js';
class TypingManager {
    activeTyping = new Map();
    callbacks = new Map();
    typingDuration = 5000; // Reset typing every 5s
    /**
     * Register a typing callback for a channel type
     */
    registerChannel(channelType, callback) {
        this.callbacks.set(channelType, callback);
        logger.debug(`Typing: Registered handler for ${channelType}`);
    }
    /**
     * Start showing typing indicator
     */
    async startTyping(channelType, channelId, userId) {
        const key = `${channelType}:${channelId}`;
        // Clear existing
        this.stopTyping(channelType, channelId);
        const callback = this.callbacks.get(channelType);
        if (!callback)
            return;
        try {
            // Show typing
            await callback(channelId, true);
            // Set up auto-refresh (most platforms stop showing after ~5s)
            const timeout = setInterval(async () => {
                try {
                    await callback(channelId, true);
                }
                catch {
                    this.stopTyping(channelType, channelId);
                }
            }, this.typingDuration);
            this.activeTyping.set(key, {
                channelType,
                channelId,
                userId,
                startedAt: new Date(),
                timeout,
            });
            eventBus.emitEvent('typing:started', channelType, channelId);
        }
        catch (error) {
            logger.debug(`Typing: Failed to start for ${key}: ${error.message}`);
        }
    }
    /**
     * Stop showing typing indicator
     */
    stopTyping(channelType, channelId) {
        const key = `${channelType}:${channelId}`;
        const state = this.activeTyping.get(key);
        if (state) {
            clearInterval(state.timeout);
            this.activeTyping.delete(key);
            eventBus.emitEvent('typing:stopped', channelType, channelId);
        }
    }
    /**
     * Stop all typing indicators
     */
    stopAll() {
        for (const [key, state] of this.activeTyping) {
            clearInterval(state.timeout);
        }
        this.activeTyping.clear();
    }
    /**
     * Check if typing is active
     */
    isTyping(channelType, channelId) {
        const key = `${channelType}:${channelId}`;
        return this.activeTyping.has(key);
    }
    /**
     * Get all active typing states
     */
    getActive() {
        return Array.from(this.activeTyping.values());
    }
    /**
     * Wrap an async function with typing indicator
     */
    async withTyping(channelType, channelId, userId, fn) {
        await this.startTyping(channelType, channelId, userId);
        try {
            return await fn();
        }
        finally {
            this.stopTyping(channelType, channelId);
        }
    }
}
export const typingManager = new TypingManager();
//# sourceMappingURL=typing.js.map