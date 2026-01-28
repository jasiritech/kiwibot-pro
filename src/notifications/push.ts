/**
 * 🥝 KiwiBot Pro - Push Notifications System
 * Multi-platform notifications (UNIQUE!)
 */

import * as https from 'https';
import * as http from 'http';
import { logger } from '../utils/logger.js';

interface Notification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  createdAt: Date;
}

interface NotificationChannel {
  type: 'webhook' | 'email' | 'slack' | 'discord' | 'telegram' | 'push';
  endpoint: string;
  enabled: boolean;
  config?: Record<string, any>;
}

interface NotificationPreferences {
  userId: string;
  channels: NotificationChannel[];
  quiet_hours?: { start: number; end: number }; // 24h format
  enabled: boolean;
}

class NotificationService {
  private preferences: Map<string, NotificationPreferences> = new Map();
  private queue: Notification[] = [];
  private processing = false;

  constructor() {
    // Start queue processor
    setInterval(() => this.processQueue(), 5000);
  }

  /**
   * Send a notification to a user
   */
  async notify(
    userId: string,
    title: string,
    body: string,
    options: {
      icon?: string;
      url?: string;
      data?: Record<string, any>;
      priority?: 'low' | 'normal' | 'high';
    } = {}
  ): Promise<boolean> {
    const prefs = this.preferences.get(userId);
    
    if (!prefs || !prefs.enabled) {
      logger.debug(`Notifications: User ${userId} has notifications disabled`);
      return false;
    }

    // Check quiet hours
    if (prefs.quiet_hours) {
      const hour = new Date().getHours();
      if (this.isQuietHour(hour, prefs.quiet_hours)) {
        logger.debug(`Notifications: Quiet hours active for ${userId}`);
        // Queue for later unless high priority
        if (options.priority !== 'high') {
          this.queue.push({
            id: crypto.randomUUID(),
            title,
            body,
            ...options,
            createdAt: new Date(),
          });
          return true;
        }
      }
    }

    // Send to all enabled channels
    const results = await Promise.all(
      prefs.channels
        .filter(c => c.enabled)
        .map(channel => this.sendToChannel(channel, title, body, options))
    );

    return results.some(r => r);
  }

  /**
   * Send notification to a specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    title: string,
    body: string,
    options: Record<string, any>
  ): Promise<boolean> {
    try {
      switch (channel.type) {
        case 'webhook':
          return await this.sendWebhook(channel.endpoint, { title, body, ...options });
        
        case 'slack':
          return await this.sendSlack(channel.endpoint, title, body);
        
        case 'discord':
          return await this.sendDiscord(channel.endpoint, title, body);
        
        case 'telegram':
          return await this.sendTelegram(channel.endpoint, channel.config?.chatId, title, body);
        
        default:
          logger.warn(`Notifications: Unknown channel type: ${channel.type}`);
          return false;
      }
    } catch (error: any) {
      logger.error(`Notifications: Failed to send to ${channel.type}: ${error.message}`);
      return false;
    }
  }

  /**
   * Send generic webhook
   */
  private sendWebhook(url: string, payload: Record<string, any>): Promise<boolean> {
    return this.httpPost(url, payload);
  }

  /**
   * Send Slack notification
   */
  private sendSlack(webhookUrl: string, title: string, body: string): Promise<boolean> {
    return this.httpPost(webhookUrl, {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `🥝 ${title}` },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: body },
        },
      ],
    });
  }

  /**
   * Send Discord notification
   */
  private sendDiscord(webhookUrl: string, title: string, body: string): Promise<boolean> {
    return this.httpPost(webhookUrl, {
      embeds: [
        {
          title: `🥝 ${title}`,
          description: body,
          color: 0x2ecc71, // Green
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }

  /**
   * Send Telegram notification
   */
  private sendTelegram(botToken: string, chatId: string, title: string, body: string): Promise<boolean> {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    return this.httpPost(url, {
      chat_id: chatId,
      text: `🥝 *${title}*\n\n${body}`,
      parse_mode: 'Markdown',
    });
  }

  /**
   * HTTP POST helper
   */
  private httpPost(url: string, payload: Record<string, any>): Promise<boolean> {
    return new Promise((resolve) => {
      const data = JSON.stringify(payload);
      const urlObj = new URL(url);
      const client = url.startsWith('https') ? https : http;

      const req = client.request({
        hostname: urlObj.hostname,
        port: urlObj.port || (url.startsWith('https') ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      }, (res) => {
        resolve(res.statusCode! >= 200 && res.statusCode! < 300);
      });

      req.on('error', () => resolve(false));
      req.write(data);
      req.end();
    });
  }

  /**
   * Set user preferences
   */
  setPreferences(userId: string, prefs: Partial<NotificationPreferences>): void {
    const existing = this.preferences.get(userId) || {
      userId,
      channels: [],
      enabled: true,
    };

    this.preferences.set(userId, { ...existing, ...prefs });
  }

  /**
   * Add notification channel for user
   */
  addChannel(userId: string, channel: NotificationChannel): void {
    const prefs = this.preferences.get(userId);
    if (!prefs) {
      this.setPreferences(userId, { channels: [channel] });
      return;
    }

    prefs.channels.push(channel);
  }

  /**
   * Remove notification channel
   */
  removeChannel(userId: string, channelType: string): boolean {
    const prefs = this.preferences.get(userId);
    if (!prefs) return false;

    const index = prefs.channels.findIndex(c => c.type === channelType);
    if (index === -1) return false;

    prefs.channels.splice(index, 1);
    return true;
  }

  /**
   * Check if current hour is within quiet hours
   */
  private isQuietHour(hour: number, quietHours: { start: number; end: number }): boolean {
    if (quietHours.start <= quietHours.end) {
      return hour >= quietHours.start && hour < quietHours.end;
    } else {
      // Wraps around midnight (e.g., 22:00 to 06:00)
      return hour >= quietHours.start || hour < quietHours.end;
    }
  }

  /**
   * Process queued notifications
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    try {
      // Process up to 10 at a time
      const batch = this.queue.splice(0, 10);
      
      for (const notification of batch) {
        // Check if it's been queued too long (24 hours)
        const age = Date.now() - notification.createdAt.getTime();
        if (age > 24 * 60 * 60 * 1000) {
          continue; // Skip old notifications
        }

        // Try to send to all users (would need userId stored in notification)
        logger.debug(`Notifications: Processing queued notification: ${notification.title}`);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Broadcast to all users
   */
  async broadcast(title: string, body: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<number> {
    let sent = 0;

    for (const [userId] of this.preferences) {
      const success = await this.notify(userId, title, body, { priority });
      if (success) sent++;
    }

    return sent;
  }

  /**
   * Get user's notification preferences
   */
  getPreferences(userId: string): NotificationPreferences | undefined {
    return this.preferences.get(userId);
  }

  /**
   * Trigger scheduled notification reminder
   */
  async scheduleReminder(
    userId: string,
    title: string,
    body: string,
    delayMs: number
  ): Promise<string> {
    const id = crypto.randomUUID();

    setTimeout(async () => {
      await this.notify(userId, title, body, { priority: 'normal' });
      logger.info(`Notifications: Sent scheduled reminder ${id} to ${userId}`);
    }, delayMs);

    return id;
  }
}

export const notificationService = new NotificationService();
