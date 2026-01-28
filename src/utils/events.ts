/**
 * 🥝 KiwiBot Pro - Event Bus
 * Centralized event system for the gateway
 */

import { EventEmitter } from 'events';
import type { EventType, Message, Session, ChannelType, ChannelStatus } from '../types/index.js';

interface KiwiEvents {
  // Message events
  'message:received': (message: Message) => void;
  'message:sent': (message: Message) => void;
  
  // Session events
  'session:created': (session: Session) => void;
  'session:updated': (session: Session) => void;
  'session:cleared': (sessionId: string) => void;
  
  // Channel events
  'channel:connected': (channel: ChannelType) => void;
  'channel:disconnected': (channel: ChannelType, reason?: string) => void;
  'channel:error': (channel: ChannelType, error: Error) => void;
  
  // Gateway events
  'gateway:started': (port: number) => void;
  'gateway:stopped': (reason?: string) => void;
  'gateway:client:connected': (clientId: string) => void;
  'gateway:client:disconnected': (clientId: string) => void;
  
  // Agent events
  'agent:start': (sessionId: string, message: string) => void;
  'agent:chunk': (sessionId: string, chunk: string) => void;
  'agent:complete': (sessionId: string, response: string) => void;
  'agent:error': (sessionId: string, error: Error) => void;
  'agent:message': (data: unknown) => void;
  
  // Skill events
  'skill:loaded': (skillId: string) => void;
  'skill:executed': (data: { skill: string; result: unknown }) => void;
  'skill:error': (skillId: string, error: Error) => void;
  
  // Config events
  'config:reload': (changes: unknown) => void;

  // Typing events
  'typing:started': (data: unknown) => void;
  'typing:stopped': (data: unknown) => void;

  // DM Security events
  'dm:allowed': (data: unknown) => void;

  // Failover events
  'failover:allFailed': (data: unknown) => void;
  'failover:circuitBreaker': (data: unknown) => void;

  // Cron events
  'cron:executed': (data: unknown) => void;
}

class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  // Type-safe event methods
  emitEvent<K extends keyof KiwiEvents>(
    event: K,
    ...args: any[]
  ): boolean {
    return this.emit(event, ...args);
  }

  onEvent<K extends keyof KiwiEvents>(
    event: K,
    listener: (...args: any[]) => void
  ): this {
    return this.on(event, listener);
  }

  offEvent<K extends keyof KiwiEvents>(
    event: K,
    listener: (...args: any[]) => void
  ): this {
    return this.off(event, listener);
  }

  onceEvent<K extends keyof KiwiEvents>(
    event: K,
    listener: (...args: any[]) => void
  ): this {
    return this.once(event, listener);
  }

  // Debug helper
  logAllEvents(): void {
    const originalEmit = this.emit.bind(this);
    this.emit = (event: string | symbol, ...args: any[]) => {
      console.log(`[EventBus] ${String(event)}`, args);
      return originalEmit(event, ...args);
    };
  }
}

export const eventBus = EventBus.getInstance();
