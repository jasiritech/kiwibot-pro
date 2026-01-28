/**
 * 🥝 KiwiBot Pro - WhatsApp Channel Handler
 */
import { ChannelHandler } from './router.js';
import type { ChannelStatus } from '../types/index.js';
declare class WhatsAppChannel implements ChannelHandler {
    type: "whatsapp";
    name: string;
    private client?;
    private status;
    constructor();
    private setupHandlers;
    private handleMessage;
    start(): Promise<void>;
    stop(): Promise<void>;
    send(to: string, content: string): Promise<void>;
    getStatus(): ChannelStatus;
    isReady(): boolean;
}
export { WhatsAppChannel };
export declare const whatsappChannel: WhatsAppChannel;
//# sourceMappingURL=whatsapp.d.ts.map