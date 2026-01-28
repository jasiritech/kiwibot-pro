/**
 * 🥝 KiwiBot Pro - Telegram Channel Handler
 */
import { ChannelHandler } from './router.js';
import type { ChannelStatus } from '../types/index.js';
declare class TelegramChannel implements ChannelHandler {
    type: "telegram";
    name: string;
    private bot?;
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
export { TelegramChannel };
export declare const telegramChannel: TelegramChannel;
//# sourceMappingURL=telegram.d.ts.map