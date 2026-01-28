/**
 * 🥝 KiwiBot Pro - Channel Router
 * Routes messages between channels and the AI agent
 */
import type { Message, ChannelType, Channel, ChannelStatus } from '../types/index.js';
export interface ChannelHandler {
    type: ChannelType;
    name: string;
    start(): Promise<void>;
    stop(): Promise<void>;
    send(to: string, content: string, options?: unknown): Promise<void>;
    getStatus(): ChannelStatus;
    isReady(): boolean;
}
declare class ChannelRouter {
    private channels;
    private messageQueue;
    private processing;
    /**
     * Register a channel handler
     */
    register(handler: ChannelHandler): void;
    /**
     * Unregister a channel
     */
    unregister(type: ChannelType): void;
    /**
     * Get a channel handler
     */
    get(type: ChannelType): ChannelHandler | undefined;
    /**
     * Start all registered channels
     */
    startAll(): Promise<void>;
    /**
     * Stop all channels
     */
    stopAll(): Promise<void>;
    /**
     * Route an incoming message to the AI agent
     */
    routeIncoming(message: Message): Promise<string>;
    /**
     * Send a message to a specific channel
     */
    send(channel: ChannelType, to: string, content: string): Promise<void>;
    /**
     * Broadcast a message to all channels
     */
    broadcast(content: string, targets: Map<ChannelType, string[]>): Promise<void>;
    /**
     * Get status of all channels
     */
    getStatus(): Record<ChannelType, ChannelStatus>;
    /**
     * Get list of channels
     */
    list(): Channel[];
}
export declare const channelRouter: ChannelRouter;
export {};
//# sourceMappingURL=router.d.ts.map