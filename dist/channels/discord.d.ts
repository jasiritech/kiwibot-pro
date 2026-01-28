/**
 * 🥝 KiwiBot Pro - Discord Channel Handler
 */
import { ChannelHandler } from './router.js';
import type { ChannelStatus } from '../types/index.js';
declare class DiscordChannel implements ChannelHandler {
    type: "discord";
    name: string;
    private client;
    private status;
    constructor();
    private setupHandlers;
    private handleMessage;
    private splitMessage;
    start(): Promise<void>;
    stop(): Promise<void>;
    send(to: string, content: string): Promise<void>;
    getStatus(): ChannelStatus;
    isReady(): boolean;
}
export { DiscordChannel };
export declare const discordChannel: DiscordChannel;
//# sourceMappingURL=discord.d.ts.map