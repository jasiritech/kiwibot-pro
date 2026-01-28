/**
 * 🥝 KiwiBot Pro - Discord Channel Handler
 */
import { Client, GatewayIntentBits, Events, Partials } from 'discord.js';
import { kiwiConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { eventBus } from '../utils/events.js';
import { channelRouter } from './router.js';
class DiscordChannel {
    type = 'discord';
    name = 'Discord';
    client;
    status = 'disconnected';
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
            ],
            partials: [Partials.Channel, Partials.Message],
        });
        this.setupHandlers();
    }
    setupHandlers() {
        this.client.once(Events.ClientReady, (c) => {
            this.status = 'connected';
            logger.channel('Discord', `Connected as ${c.user.tag}`);
            eventBus.emitEvent('channel:connected', 'discord');
        });
        this.client.on(Events.MessageCreate, async (msg) => {
            await this.handleMessage(msg);
        });
        this.client.on('error', (error) => {
            this.status = 'error';
            logger.error('Discord error', error);
            eventBus.emitEvent('channel:error', 'discord', error);
        });
    }
    async handleMessage(discordMsg) {
        if (discordMsg.author.bot)
            return;
        const isMentioned = discordMsg.mentions.has(this.client.user);
        const isDM = !discordMsg.guild;
        if (!isMentioned && !isDM)
            return;
        let content = discordMsg.content
            .replace(new RegExp(`<@!?${this.client.user.id}>`, 'g'), '')
            .trim();
        if (!content && !isDM)
            return;
        const message = {
            id: discordMsg.id,
            content,
            author: {
                id: discordMsg.author.id,
                name: discordMsg.author.displayName || discordMsg.author.username,
                isBot: false,
                avatar: discordMsg.author.avatarURL() || undefined,
            },
            channel: 'discord',
            channelId: discordMsg.channel.id,
            sessionId: `discord:${discordMsg.channel.id}:${discordMsg.author.id}`,
            timestamp: discordMsg.createdAt,
        };
        try {
            if ('sendTyping' in discordMsg.channel) {
                await discordMsg.channel.sendTyping();
            }
            const response = await channelRouter.routeIncoming(message);
            // Split long messages
            if (response.length > 2000) {
                const chunks = this.splitMessage(response, 2000);
                for (const chunk of chunks) {
                    await discordMsg.reply(chunk);
                }
            }
            else {
                await discordMsg.reply(response);
            }
        }
        catch (error) {
            logger.error('Discord message error', error);
            await discordMsg.reply(`❌ Error: ${error.message}`);
        }
    }
    splitMessage(text, maxLength) {
        const chunks = [];
        let remaining = text;
        while (remaining.length > 0) {
            if (remaining.length <= maxLength) {
                chunks.push(remaining);
                break;
            }
            let splitIndex = remaining.lastIndexOf('\n', maxLength);
            if (splitIndex === -1 || splitIndex < maxLength / 2) {
                splitIndex = remaining.lastIndexOf(' ', maxLength);
            }
            if (splitIndex === -1)
                splitIndex = maxLength;
            chunks.push(remaining.slice(0, splitIndex));
            remaining = remaining.slice(splitIndex).trim();
        }
        return chunks;
    }
    async start() {
        const token = kiwiConfig.channels.discord?.token;
        if (!token) {
            logger.channel('Discord', 'No token provided, skipping');
            return;
        }
        this.status = 'connecting';
        try {
            await this.client.login(token);
        }
        catch (error) {
            this.status = 'error';
            logger.error('Discord login failed', error);
            throw error;
        }
    }
    async stop() {
        await this.client.destroy();
        this.status = 'disconnected';
        eventBus.emitEvent('channel:disconnected', 'discord');
        logger.channel('Discord', 'Disconnected');
    }
    async send(to, content) {
        const channel = await this.client.channels.fetch(to);
        if (channel?.isTextBased()) {
            await channel.send(content);
        }
    }
    getStatus() {
        return this.status;
    }
    isReady() {
        return this.status === 'connected';
    }
}
export { DiscordChannel };
export const discordChannel = new DiscordChannel();
//# sourceMappingURL=discord.js.map