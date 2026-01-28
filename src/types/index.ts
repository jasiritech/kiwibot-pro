/**
 * 🥝 KiwiBot Pro - Core Types
 * Advanced type definitions for the gateway architecture
 */

// ============================================
// MESSAGE TYPES
// ============================================

export interface Message {
  id: string;
  content: string;
  author: Author;
  channel: ChannelType;
  channelId: string;
  sessionId: string;
  timestamp: Date;
  replyTo?: string;
  attachments?: Attachment[];
  metadata?: Record<string, unknown>;
}

export interface Author {
  id: string;
  name: string;
  isBot: boolean;
  avatar?: string;
  metadata?: Record<string, unknown>;
}

export interface Attachment {
  type: 'image' | 'audio' | 'video' | 'file' | 'voice';
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
  duration?: number; // for audio/video
}

export type ChannelType = 'discord' | 'telegram' | 'whatsapp' | 'slack' | 'web' | 'cli' | 'system';

// ============================================
// GATEWAY PROTOCOL TYPES
// ============================================

export interface GatewayRequest {
  type: 'req';
  id: string;
  method: GatewayMethod;
  params?: Record<string, unknown>;
}

export interface GatewayResponse {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: GatewayError;
}

export interface GatewayEvent {
  type: 'event';
  event: EventType;
  payload: unknown;
  seq?: number;
  timestamp: number;
}

export interface GatewayError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}

export type GatewayMethod = 
  | 'connect'
  | 'health'
  | 'status'
  | 'send'
  | 'agent'
  | 'session.list'
  | 'session.get'
  | 'session.clear'
  | 'channel.list'
  | 'channel.status'
  | 'skill.list'
  | 'skill.invoke'
  | 'presence';

export type EventType = 
  | 'agent'
  | 'message'
  | 'presence'
  | 'tick'
  | 'shutdown'
  | 'channel.connected'
  | 'channel.disconnected'
  | 'session.updated';

// ============================================
// SESSION TYPES
// ============================================

export interface Session {
  id: string;
  userId: string;
  channel: ChannelType;
  channelId: string;
  messages: ConversationMessage[];
  context: SessionContext;
  createdAt: Date;
  lastActivity: Date;
  metadata?: Record<string, unknown>;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
}

export interface SessionContext {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  tools?: string[];
  memory?: MemoryItem[];
}

export interface MemoryItem {
  key: string;
  value: string;
  timestamp: Date;
  ttl?: number;
}

// ============================================
// CHANNEL TYPES
// ============================================

export interface Channel {
  type: ChannelType;
  name: string;
  enabled: boolean;
  status: ChannelStatus;
  config: ChannelConfig;
  stats: ChannelStats;
}

export type ChannelStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface ChannelConfig {
  token?: string;
  allowedUsers?: string[];
  allowedGroups?: string[];
  dmPolicy?: 'open' | 'pairing' | 'allowlist';
  groupPolicy?: 'mention' | 'always' | 'never';
  rateLimit?: RateLimit;
}

export interface RateLimit {
  messages: number;
  window: number; // seconds
}

export interface ChannelStats {
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  lastMessage?: Date;
  uptime: number;
}

// ============================================
// SKILL/PLUGIN TYPES
// ============================================

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  triggers: SkillTrigger[];
  permissions?: string[];
  config?: Record<string, unknown>;
  execute: SkillExecutor;
}

export interface SkillTrigger {
  type: 'command' | 'keyword' | 'regex' | 'event';
  pattern: string | RegExp;
  priority?: number;
}

export type SkillExecutor = (context: SkillContext) => Promise<SkillResult>;

export interface SkillContext {
  message: Message;
  session: Session;
  args: string[];
  matches?: RegExpMatchArray;
  gateway: GatewayClient;
}

export interface SkillResult {
  content?: string;
  attachments?: Attachment[];
  actions?: SkillAction[];
  stopPropagation?: boolean;
}

export interface SkillAction {
  type: 'reply' | 'react' | 'typing' | 'memory.set' | 'memory.get' | 'session.update';
  payload: unknown;
}

// ============================================
// AI PROVIDER TYPES
// ============================================

export interface AIProvider {
  id: string;
  name: string;
  models: AIModel[];
  chat: (messages: ConversationMessage[], options: AIOptions) => Promise<AIResponse>;
  stream?: (messages: ConversationMessage[], options: AIOptions) => AsyncGenerator<string>;
}

export interface AIModel {
  id: string;
  name: string;
  contextWindow: number;
  maxOutput: number;
  inputPrice: number;  // per 1M tokens
  outputPrice: number; // per 1M tokens
  capabilities: string[];
}

export interface AIOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: AITool[];
  stream?: boolean;
}

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: unknown) => Promise<unknown>;
}

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'tool_calls';
  toolCalls?: AIToolCall[];
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// ============================================
// GATEWAY CLIENT TYPES
// ============================================

export interface GatewayClient {
  id: string;
  type: 'operator' | 'node' | 'webchat';
  name: string;
  connectedAt: Date;
  lastActivity: Date;
  capabilities: string[];
  
  // Methods
  send: (method: GatewayMethod, params?: unknown) => Promise<GatewayResponse>;
  emit: (event: EventType, payload: unknown) => void;
  disconnect: (reason?: string) => void;
}

export interface ClientAuth {
  token?: string;
  password?: string;
  userId?: string;
}

// ============================================
// CONFIG TYPES
// ============================================

export interface KiwiConfig {
  gateway: GatewayConfig;
  ai: AIConfig;
  channels: ChannelsConfig;
  skills: SkillsConfig;
  web: WebConfig;
  logging: LoggingConfig;
}

export interface GatewayConfig {
  port: number;
  host: string;
  auth: {
    enabled: boolean;
    token?: string;
    password?: string;
  };
  ssl?: {
    enabled: boolean;
    cert: string;
    key: string;
  };
}

export interface AIConfig {
  defaultModel: string;
  defaultTemperature: number;
  maxTokens: number;
  providers: {
    openai?: { apiKey: string };
    anthropic?: { apiKey: string };
    google?: { apiKey: string };
  };
  systemPrompt: string;
}

export interface ChannelsConfig {
  discord?: { enabled: boolean; token?: string };
  telegram?: { enabled: boolean; token?: string };
  whatsapp?: { enabled: boolean };
  slack?: { enabled: boolean; botToken?: string; appToken?: string };
}

export interface SkillsConfig {
  enabled: boolean;
  directory: string;
  autoload: boolean;
}

export interface WebConfig {
  enabled: boolean;
  port: number;
  staticDir: string;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  file?: string;
  json: boolean;
}

// ============================================
// BOT RESPONSE TYPE
// ============================================

export interface BotResponse {
  content: string;
  attachments?: Attachment[];
  metadata?: Record<string, unknown>;
}

// ============================================
// PRESENCE TYPES
// ============================================

export interface Presence {
  clients: ClientPresence[];
  channels: ChannelPresence[];
  gateway: GatewayPresence;
}

export interface ClientPresence {
  id: string;
  type: string;
  name: string;
  connectedAt: Date;
  lastActivity: Date;
}

export interface ChannelPresence {
  type: ChannelType;
  status: ChannelStatus;
  connectedAt?: Date;
  error?: string;
}

export interface GatewayPresence {
  version: string;
  uptime: number;
  startedAt: Date;
  sessions: number;
  messages: {
    received: number;
    sent: number;
  };
}
