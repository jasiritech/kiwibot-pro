/**
 * 🥝 KiwiBot Pro - Event Bus
 * Centralized event system for the gateway
 */
import { EventEmitter } from 'events';
import type { Message, Session, ChannelType } from '../types/index.js';
interface KiwiEvents {
    'message:received': (message: Message) => void;
    'message:sent': (message: Message) => void;
    'session:created': (session: Session) => void;
    'session:updated': (session: Session) => void;
    'session:cleared': (sessionId: string) => void;
    'channel:connected': (channel: ChannelType) => void;
    'channel:disconnected': (channel: ChannelType, reason?: string) => void;
    'channel:error': (channel: ChannelType, error: Error) => void;
    'gateway:started': (port: number) => void;
    'gateway:stopped': (reason?: string) => void;
    'gateway:client:connected': (clientId: string) => void;
    'gateway:client:disconnected': (clientId: string) => void;
    'agent:start': (sessionId: string, message: string) => void;
    'agent:chunk': (sessionId: string, chunk: string) => void;
    'agent:complete': (sessionId: string, response: string) => void;
    'agent:error': (sessionId: string, error: Error) => void;
    'agent:message': (data: unknown) => void;
    'skill:loaded': (skillId: string) => void;
    'skill:executed': (data: {
        skill: string;
        result: unknown;
    }) => void;
    'skill:error': (skillId: string, error: Error) => void;
    'config:reload': (changes: unknown) => void;
    'typing:started': (data: unknown) => void;
    'typing:stopped': (data: unknown) => void;
    'dm:allowed': (data: unknown) => void;
    'failover:allFailed': (data: unknown) => void;
    'failover:circuitBreaker': (data: unknown) => void;
    'cron:executed': (data: unknown) => void;
}
declare class EventBus extends EventEmitter {
    private static instance;
    private constructor();
    static getInstance(): EventBus;
    emitEvent<K extends keyof KiwiEvents>(event: K, ...args: any[]): boolean;
    onEvent<K extends keyof KiwiEvents>(event: K, listener: (...args: any[]) => void): this;
    offEvent<K extends keyof KiwiEvents>(event: K, listener: (...args: any[]) => void): this;
    onceEvent<K extends keyof KiwiEvents>(event: K, listener: (...args: any[]) => void): this;
    logAllEvents(): void;
}
export declare const eventBus: EventBus;
export {};
//# sourceMappingURL=events.d.ts.map