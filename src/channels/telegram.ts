/**
 * 🥝 KiwiBot Pro - Telegram Channel Handler
 */

import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { kiwiConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { eventBus } from '../utils/events.js';
import { channelRouter, ChannelHandler } from './router.js';
import type { Message, ChannelStatus } from '../types/index.js';

class TelegramChannel implements ChannelHandler {
  type = 'telegram' as const;
  name = 'Telegram';
  
  private bot?: Telegraf;
  private status: ChannelStatus = 'disconnected';

  constructor() {
    const token = kiwiConfig.channels.telegram?.token;
    if (token) {
      this.bot = new Telegraf(token);
      this.setupHandlers();
    }
  }

  private setupHandlers(): void {
    if (!this.bot) return;

    this.bot.on(message('text'), async (ctx) => {
      await this.handleMessage(ctx);
    });

    this.bot.command('start', async (ctx) => {
      await ctx.reply(
        `🥝 Habari! Mimi ni KiwiBot Pro!\n\n` +
        `AI assistant yako wa kibinafsi. Niulize chochote!\n\n` +
        `Commands:\n` +
        `/new - Anza mazungumzo mapya\n` +
        `/help - Ona msaada\n` +
        `/status - Hali ya bot\n` +
        `/model - Badilisha AI model`
      );
    });
  }

  private async handleMessage(ctx: Context & { message: { text: string } }): Promise<void> {
    const text = ctx.message.text;
    
    // Skip non-command messages that start with /
    if (text.startsWith('/') && !text.startsWith('/start')) {
      // Commands will be handled by the router
    }

    const message: Message = {
      id: ctx.message.message_id.toString(),
      content: text,
      author: {
        id: ctx.from!.id.toString(),
        name: ctx.from!.first_name || 'User',
        isBot: false,
      },
      channel: 'telegram',
      channelId: ctx.chat!.id.toString(),
      sessionId: `telegram:${ctx.chat!.id}:${ctx.from!.id}`,
      timestamp: new Date(ctx.message.date * 1000),
    };

    try {
      await ctx.sendChatAction('typing');
      
      const response = await channelRouter.routeIncoming(message);
      
      // Split long messages
      if (response.length > 4096) {
        const chunks = this.splitMessage(response, 4096);
        for (const chunk of chunks) {
          await ctx.reply(chunk, { parse_mode: 'Markdown' });
        }
      } else {
        await ctx.reply(response, { parse_mode: 'Markdown' });
      }
    } catch (error: any) {
      logger.error('Telegram message error', error);
      await ctx.reply(`❌ Error: ${error.message}`);
    }
  }

  private splitMessage(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      let splitIndex = remaining.lastIndexOf('\n', maxLength);
      if (splitIndex === -1) splitIndex = maxLength;

      chunks.push(remaining.slice(0, splitIndex));
      remaining = remaining.slice(splitIndex).trim();
    }

    return chunks;
  }

  async start(): Promise<void> {
    if (!this.bot) {
      logger.channel('Telegram', 'No token provided, skipping');
      return;
    }

    this.status = 'connecting';

    try {
      await this.bot.launch();
      const botInfo = await this.bot.telegram.getMe();
      this.status = 'connected';
      logger.channel('Telegram', `Connected as @${botInfo.username}`);
      eventBus.emitEvent('channel:connected', 'telegram');
    } catch (error: any) {
      this.status = 'error';
      logger.error('Telegram launch failed', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.bot) {
      this.bot.stop('SIGTERM');
      this.status = 'disconnected';
      eventBus.emitEvent('channel:disconnected', 'telegram');
      logger.channel('Telegram', 'Disconnected');
    }
  }

  async send(to: string, content: string): Promise<void> {
    if (this.bot) {
      await this.bot.telegram.sendMessage(to, content);
    }
  }

  getStatus(): ChannelStatus {
    return this.status;
  }

  isReady(): boolean {
    return this.status === 'connected';
  }
}

export { TelegramChannel };
export const telegramChannel = new TelegramChannel();
