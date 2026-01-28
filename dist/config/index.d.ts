/**
 * 🥝 KiwiBot Pro - Configuration Manager
 * Hot-reloadable configuration system
 */
import { EventEmitter } from 'events';
import type { KiwiConfig, GatewayConfig, AIConfig, ChannelsConfig } from '../types/index.js';
declare class ConfigManager extends EventEmitter {
    private config;
    private configPath;
    private watchEnabled;
    constructor();
    private getDefaultConfig;
    private getDefaultSystemPrompt;
    private loadConfig;
    private mergeConfig;
    enableWatch(): void;
    get(): KiwiConfig;
    getGateway(): GatewayConfig;
    getAI(): AIConfig;
    getChannels(): ChannelsConfig;
    set(path: string, value: unknown): void;
}
export declare const configManager: ConfigManager;
export declare const kiwiConfig: KiwiConfig;
export {};
//# sourceMappingURL=index.d.ts.map