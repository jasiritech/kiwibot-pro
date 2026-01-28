/**
 * 🥝 KiwiBot Pro - Session Manager
 * Conversation memory and context management
 */

import { v4 as uuid } from 'uuid';
import { eventBus } from '../utils/events.js';
import { logger } from '../utils/logger.js';
import { kiwiConfig } from '../config/index.js';
import type { 
  Session, 
  Message, 
  ConversationMessage, 
  SessionContext,
  ChannelType,
  MemoryItem 
} from '../types/index.js';

interface SessionStore {
  [sessionId: string]: Session;
}

class SessionManager {
  private sessions: SessionStore = {};
  private maxMessagesPerSession = 50;
  private sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Clean up old sessions periodically
    setInterval(() => this.cleanup(), 60 * 60 * 1000); // Every hour
  }

  /**
   * Get or create a session for a user/channel combination
   */
  getOrCreate(userId: string, channel: ChannelType, channelId: string): Session {
    const sessionId = this.generateSessionId(userId, channel, channelId);
    
    if (this.sessions[sessionId]) {
      this.sessions[sessionId].lastActivity = new Date();
      return this.sessions[sessionId];
    }

    const session: Session = {
      id: sessionId,
      userId,
      channel,
      channelId,
      messages: [],
      context: this.getDefaultContext(),
      createdAt: new Date(),
      lastActivity: new Date(),
      metadata: {},
    };

    this.sessions[sessionId] = session;
    eventBus.emitEvent('session:created', session);
    logger.debug(`Session created: ${sessionId}`);

    return session;
  }

  /**
   * Get a session by ID
   */
  get(sessionId: string): Session | null {
    return this.sessions[sessionId] || null;
  }

  /**
   * Add a message to a session
   */
  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): void {
    const session = this.sessions[sessionId];
    if (!session) return;

    const message: ConversationMessage = {
      role,
      content,
      timestamp: new Date(),
    };

    session.messages.push(message);
    session.lastActivity = new Date();

    // Trim messages if exceeding limit
    if (session.messages.length > this.maxMessagesPerSession) {
      // Keep system message and last N messages
      const systemMessages = session.messages.filter(m => m.role === 'system');
      const recentMessages = session.messages
        .filter(m => m.role !== 'system')
        .slice(-this.maxMessagesPerSession + systemMessages.length);
      
      session.messages = [...systemMessages, ...recentMessages];
    }

    eventBus.emitEvent('session:updated', session);
  }

  /**
   * Get conversation history for AI
   */
  getHistory(sessionId: string): ConversationMessage[] {
    const session = this.sessions[sessionId];
    if (!session) return [];
    return session.messages;
  }

  /**
   * Clear a session's messages
   */
  clear(sessionId: string): boolean {
    const session = this.sessions[sessionId];
    if (!session) return false;

    session.messages = [];
    session.lastActivity = new Date();
    
    eventBus.emitEvent('session:cleared', sessionId);
    logger.debug(`Session cleared: ${sessionId}`);
    
    return true;
  }

  /**
   * Delete a session completely
   */
  delete(sessionId: string): boolean {
    if (this.sessions[sessionId]) {
      delete this.sessions[sessionId];
      return true;
    }
    return false;
  }

  /**
   * Update session context
   */
  updateContext(sessionId: string, updates: Partial<SessionContext>): void {
    const session = this.sessions[sessionId];
    if (!session) return;

    session.context = { ...session.context, ...updates };
    session.lastActivity = new Date();
    
    eventBus.emitEvent('session:updated', session);
  }

  /**
   * Set memory item in session
   */
  setMemory(sessionId: string, key: string, value: string, ttl?: number): void {
    const session = this.sessions[sessionId];
    if (!session) return;

    if (!session.context.memory) {
      session.context.memory = [];
    }

    // Remove existing item with same key
    session.context.memory = session.context.memory.filter(m => m.key !== key);

    // Add new item
    session.context.memory.push({
      key,
      value,
      timestamp: new Date(),
      ttl,
    });

    session.lastActivity = new Date();
  }

  /**
   * Get memory item from session
   */
  getMemory(sessionId: string, key: string): string | null {
    const session = this.sessions[sessionId];
    if (!session?.context.memory) return null;

    const item = session.context.memory.find(m => m.key === key);
    if (!item) return null;

    // Check TTL
    if (item.ttl) {
      const age = Date.now() - item.timestamp.getTime();
      if (age > item.ttl * 1000) {
        // Expired
        session.context.memory = session.context.memory.filter(m => m.key !== key);
        return null;
      }
    }

    return item.value;
  }

  /**
   * List all sessions
   */
  list(): Session[] {
    return Object.values(this.sessions);
  }

  /**
   * Get session count
   */
  count(): number {
    return Object.keys(this.sessions).length;
  }

  /**
   * Get stats
   */
  getStats(): { sessions: number; totalMessages: number } {
    const sessions = Object.values(this.sessions);
    return {
      sessions: sessions.length,
      totalMessages: sessions.reduce((sum, s) => sum + s.messages.length, 0),
    };
  }

  /**
   * Compact a session (summarize old messages)
   */
  async compact(sessionId: string, summarizer: (messages: ConversationMessage[]) => Promise<string>): Promise<void> {
    const session = this.sessions[sessionId];
    if (!session || session.messages.length < 20) return;

    // Keep last 10 messages, summarize the rest
    const toSummarize = session.messages.slice(0, -10);
    const toKeep = session.messages.slice(-10);

    try {
      const summary = await summarizer(toSummarize);
      
      session.messages = [
        { role: 'system', content: `Previous conversation summary: ${summary}`, timestamp: new Date() },
        ...toKeep,
      ];

      logger.debug(`Session compacted: ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to compact session: ${sessionId}`, error);
    }
  }

  private generateSessionId(userId: string, channel: ChannelType, channelId: string): string {
    return `${channel}:${channelId}:${userId}`;
  }

  private getDefaultContext(): SessionContext {
    return {
      model: kiwiConfig.ai.defaultModel,
      temperature: kiwiConfig.ai.defaultTemperature,
      maxTokens: kiwiConfig.ai.maxTokens,
      systemPrompt: kiwiConfig.ai.systemPrompt,
      tools: [],
      memory: [],
    };
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of Object.entries(this.sessions)) {
      const age = now - session.lastActivity.getTime();
      if (age > this.sessionTimeout) {
        delete this.sessions[sessionId];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired sessions`);
    }
  }
}

export const sessionManager = new SessionManager();
