/**
 * 🥝 KiwiBot Pro - Typing Indicators
 * Show "typing..." status in channels (like Moltbot)
 */

import { logger } from '../utils/logger.js';
import { eventBus } from '../utils/events.js';

interface TypingState {
  channelType: string;
  channelId: string;
  userId: string;
  startedAt: Date;
  timeout: NodeJS.Timeout;
}

type TypingCallback = (channelId: string, show: boolean) => Promise<void>;

class TypingManager {
  private activeTyping: Map<string, TypingState> = new Map();
  private callbacks: Map<string, TypingCallback> = new Map();
  private typingDuration = 5000; // Reset typing every 5s

  /**
   * Register a typing callback for a channel type
   */
  registerChannel(channelType: string, callback: TypingCallback): void {
    this.callbacks.set(channelType, callback);
    logger.debug(`Typing: Registered handler for ${channelType}`);
  }

  /**
   * Start showing typing indicator
   */
  async startTyping(channelType: string, channelId: string, userId: string): Promise<void> {
    const key = `${channelType}:${channelId}`;

    // Clear existing
    this.stopTyping(channelType, channelId);

    const callback = this.callbacks.get(channelType);
    if (!callback) return;

    try {
      // Show typing
      await callback(channelId, true);

      // Set up auto-refresh (most platforms stop showing after ~5s)
      const timeout = setInterval(async () => {
        try {
          await callback(channelId, true);
        } catch {
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

    } catch (error: any) {
      logger.debug(`Typing: Failed to start for ${key}: ${error.message}`);
    }
  }

  /**
   * Stop showing typing indicator
   */
  stopTyping(channelType: string, channelId: string): void {
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
  stopAll(): void {
    for (const [key, state] of this.activeTyping) {
      clearInterval(state.timeout);
    }
    this.activeTyping.clear();
  }

  /**
   * Check if typing is active
   */
  isTyping(channelType: string, channelId: string): boolean {
    const key = `${channelType}:${channelId}`;
    return this.activeTyping.has(key);
  }

  /**
   * Get all active typing states
   */
  getActive(): TypingState[] {
    return Array.from(this.activeTyping.values());
  }

  /**
   * Wrap an async function with typing indicator
   */
  async withTyping<T>(
    channelType: string,
    channelId: string,
    userId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    await this.startTyping(channelType, channelId, userId);
    try {
      return await fn();
    } finally {
      this.stopTyping(channelType, channelId);
    }
  }
}

export const typingManager = new TypingManager();
