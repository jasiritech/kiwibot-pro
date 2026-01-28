/**
 * 🥝 KiwiBot Pro - Channel Router
 * Routes messages between channels and the AI agent
 */

import { eventBus } from '../utils/events.js';
import { logger } from '../utils/logger.js';
import { aiService } from '../ai/service.js';
import { skillManager } from '../skills/manager.js';
import { sessionManager } from '../sessions/manager.js';
import type { Message, ChannelType, Channel, ChannelStatus, BotResponse } from '../types/index.js';

// Channel handler interface
export interface ChannelHandler {
  type: ChannelType;
  name: string;
  
  start(): Promise<void>;
  stop(): Promise<void>;
  send(to: string, content: string, options?: unknown): Promise<void>;
  getStatus(): ChannelStatus;
  isReady(): boolean;
}

class ChannelRouter {
  private channels: Map<ChannelType, ChannelHandler> = new Map();
  private messageQueue: Message[] = [];
  private processing = false;

  /**
   * Register a channel handler
   */
  register(handler: ChannelHandler): void {
    this.channels.set(handler.type, handler);
    logger.info(`Channel registered: ${handler.type}`);
  }

  /**
   * Unregister a channel
   */
  unregister(type: ChannelType): void {
    this.channels.delete(type);
  }

  /**
   * Get a channel handler
   */
  get(type: ChannelType): ChannelHandler | undefined {
    return this.channels.get(type);
  }

  /**
   * Start all registered channels
   */
  async startAll(): Promise<void> {
    const startPromises: Promise<void>[] = [];

    for (const [type, handler] of this.channels) {
      startPromises.push(
        handler.start().catch(error => {
          logger.error(`Failed to start channel ${type}`, error);
          eventBus.emitEvent('channel:error', type, error);
        })
      );
    }

    await Promise.all(startPromises);
  }

  /**
   * Stop all channels
   */
  async stopAll(): Promise<void> {
    const stopPromises: Promise<void>[] = [];

    for (const [type, handler] of this.channels) {
      stopPromises.push(
        handler.stop().catch(error => {
          logger.error(`Failed to stop channel ${type}`, error);
        })
      );
    }

    await Promise.all(stopPromises);
  }

  /**
   * Route an incoming message to the AI agent
   */
  async routeIncoming(message: Message): Promise<string> {
    logger.debug(`Routing message from ${message.channel}:${message.author.id}`);
    eventBus.emitEvent('message:received', message);

    try {
      // Check for commands first
      if (message.content.startsWith('/')) {
        const [command, ...args] = message.content.slice(1).split(' ');
        const skillResult = await skillManager.handleCommand(command, args, message);
        
        if (skillResult) {
          return skillResult.content || '';
        }
      }

      // Check for skill triggers
      const skillResult = await skillManager.handleTriggers(message);
      if (skillResult?.stopPropagation) {
        return skillResult.content || '';
      }

      // Route to AI
      const response = await aiService.chat(message);
      
      // Track the response
      const responseMessage: Message = {
        ...message,
        id: `${message.id}-response`,
        content: response,
        author: { id: 'kiwi', name: 'Kiwi', isBot: true },
        timestamp: new Date(),
      };
      eventBus.emitEvent('message:sent', responseMessage);

      return response;
    } catch (error: any) {
      logger.error(`Error routing message: ${error.message}`);
      return `❌ Samahani, kuna tatizo: ${error.message}`;
    }
  }

  /**
   * Send a message to a specific channel
   */
  async send(channel: ChannelType, to: string, content: string): Promise<void> {
    const handler = this.channels.get(channel);
    
    if (!handler) {
      throw new Error(`Channel not registered: ${channel}`);
    }

    if (!handler.isReady()) {
      throw new Error(`Channel not ready: ${channel}`);
    }

    await handler.send(to, content);
    logger.debug(`Message sent via ${channel} to ${to}`);
  }

  /**
   * Broadcast a message to all channels
   */
  async broadcast(content: string, targets: Map<ChannelType, string[]>): Promise<void> {
    const sendPromises: Promise<void>[] = [];

    for (const [channel, recipients] of targets) {
      for (const to of recipients) {
        sendPromises.push(this.send(channel, to, content));
      }
    }

    await Promise.all(sendPromises);
  }

  /**
   * Get status of all channels
   */
  getStatus(): Record<ChannelType, ChannelStatus> {
    const status: Record<string, ChannelStatus> = {};

    for (const [type, handler] of this.channels) {
      status[type] = handler.getStatus();
    }

    return status as Record<ChannelType, ChannelStatus>;
  }

  /**
   * Get list of channels
   */
  list(): Channel[] {
    const channels: Channel[] = [];

    for (const [type, handler] of this.channels) {
      channels.push({
        type,
        name: handler.name,
        enabled: true,
        status: handler.getStatus(),
        config: {},
        stats: {
          messagesReceived: 0,
          messagesSent: 0,
          errors: 0,
          uptime: 0,
        },
      });
    }

    return channels;
  }
}

export const channelRouter = new ChannelRouter();
