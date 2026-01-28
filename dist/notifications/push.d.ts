/**
 * 🥝 KiwiBot Pro - Push Notifications System
 * Multi-platform notifications (UNIQUE!)
 */
interface NotificationChannel {
    type: 'webhook' | 'email' | 'slack' | 'discord' | 'telegram' | 'push';
    endpoint: string;
    enabled: boolean;
    config?: Record<string, any>;
}
interface NotificationPreferences {
    userId: string;
    channels: NotificationChannel[];
    quiet_hours?: {
        start: number;
        end: number;
    };
    enabled: boolean;
}
declare class NotificationService {
    private preferences;
    private queue;
    private processing;
    constructor();
    /**
     * Send a notification to a user
     */
    notify(userId: string, title: string, body: string, options?: {
        icon?: string;
        url?: string;
        data?: Record<string, any>;
        priority?: 'low' | 'normal' | 'high';
    }): Promise<boolean>;
    /**
     * Send notification to a specific channel
     */
    private sendToChannel;
    /**
     * Send generic webhook
     */
    private sendWebhook;
    /**
     * Send Slack notification
     */
    private sendSlack;
    /**
     * Send Discord notification
     */
    private sendDiscord;
    /**
     * Send Telegram notification
     */
    private sendTelegram;
    /**
     * HTTP POST helper
     */
    private httpPost;
    /**
     * Set user preferences
     */
    setPreferences(userId: string, prefs: Partial<NotificationPreferences>): void;
    /**
     * Add notification channel for user
     */
    addChannel(userId: string, channel: NotificationChannel): void;
    /**
     * Remove notification channel
     */
    removeChannel(userId: string, channelType: string): boolean;
    /**
     * Check if current hour is within quiet hours
     */
    private isQuietHour;
    /**
     * Process queued notifications
     */
    private processQueue;
    /**
     * Broadcast to all users
     */
    broadcast(title: string, body: string, priority?: 'low' | 'normal' | 'high'): Promise<number>;
    /**
     * Get user's notification preferences
     */
    getPreferences(userId: string): NotificationPreferences | undefined;
    /**
     * Trigger scheduled notification reminder
     */
    scheduleReminder(userId: string, title: string, body: string, delayMs: number): Promise<string>;
}
export declare const notificationService: NotificationService;
export {};
//# sourceMappingURL=push.d.ts.map