/**
 * 🥝 KiwiBot Pro - WhatsApp Channel Handler
 */

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { kiwiConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { eventBus } from '../utils/events.js';
import { channelRouter, ChannelHandler } from './router.js';
import type { Message, ChannelStatus } from '../types/index.js';

class WhatsAppChannel implements ChannelHandler {
  type = 'whatsapp' as const;
  name = 'WhatsApp';
  
  private client?: pkg.Client;
  private status: ChannelStatus = 'disconnected';

  constructor() {
    if (kiwiConfig.channels.whatsapp?.enabled) {
      this.client = new Client({
        authStrategy: new LocalAuth({ clientId: 'kiwibot-pro' }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      });

      this.setupHandlers();
    }
  }

  private setupHandlers(): void {
    if (!this.client) return;

    this.client.on('qr', (qr) => {
      logger.channel('WhatsApp', 'Scan QR code to login:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      this.status = 'connected';
      logger.channel('WhatsApp', 'Connected!');
      eventBus.emitEvent('channel:connected', 'whatsapp');
    });

    this.client.on('authenticated', () => {
      logger.channel('WhatsApp', 'Authenticated');
    });

    this.client.on('auth_failure', (msg) => {
      this.status = 'error';
      logger.error('WhatsApp auth failed', msg);
    });

    this.client.on('disconnected', (reason) => {
      this.status = 'disconnected';
      logger.channel('WhatsApp', `Disconnected: ${reason}`);
      eventBus.emitEvent('channel:disconnected', 'whatsapp', reason);
    });

    this.client.on('message', async (msg) => {
      await this.handleMessage(msg);
    });
  }

  private async handleMessage(waMsg: pkg.Message): Promise<void> {
    if (waMsg.fromMe) return;
    if (waMsg.from === 'status@broadcast') return;

    const contact = await waMsg.getContact();
    const chat = await waMsg.getChat();

    // For groups, only respond if mentioned or name is called
    if (chat.isGroup) {
      const botNumber = this.client!.info.wid._serialized;
      const mentions = await waMsg.getMentions();
      const isMentioned = mentions.some(m => m.id._serialized === botNumber);
      const namesCalled = ['kiwi', 'kiwibot'].some(n => 
        waMsg.body.toLowerCase().includes(n)
      );
      
      if (!isMentioned && !namesCalled) return;
    }

    const message: Message = {
      id: waMsg.id.id,
      content: waMsg.body,
      author: {
        id: waMsg.from,
        name: contact.pushname || contact.name || 'User',
        isBot: false,
      },
      channel: 'whatsapp',
      channelId: chat.id._serialized,
      sessionId: `whatsapp:${chat.id._serialized}:${waMsg.from}`,
      timestamp: new Date(waMsg.timestamp * 1000),
    };

    try {
      await chat.sendStateTyping();
      
      const response = await channelRouter.routeIncoming(message);
      await waMsg.reply(response);
    } catch (error: any) {
      logger.error('WhatsApp message error', error);
      await waMsg.reply(`❌ Error: ${error.message}`);
    }
  }

  async start(): Promise<void> {
    if (!this.client) {
      logger.channel('WhatsApp', 'Disabled in config');
      return;
    }

    this.status = 'connecting';
    logger.channel('WhatsApp', 'Starting (wait for QR code)...');

    try {
      await this.client.initialize();
    } catch (error: any) {
      this.status = 'error';
      logger.error('WhatsApp initialization failed', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.status = 'disconnected';
      eventBus.emitEvent('channel:disconnected', 'whatsapp');
      logger.channel('WhatsApp', 'Disconnected');
    }
  }

  async send(to: string, content: string): Promise<void> {
    if (this.client) {
      await this.client.sendMessage(to, content);
    }
  }

  getStatus(): ChannelStatus {
    return this.status;
  }

  isReady(): boolean {
    return this.status === 'connected';
  }
}

export { WhatsAppChannel };
export const whatsappChannel = new WhatsAppChannel();
