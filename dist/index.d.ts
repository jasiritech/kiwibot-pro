/**
 * 🥝 KiwiBot Pro - Main Entry Point
 * Advanced Personal AI Assistant with Gateway Architecture
 * BETTER than Clawdbot! 🔥
 */
declare class KiwiBotPro {
    private gateway;
    private isShuttingDown;
    constructor();
    private setupSignalHandlers;
    start(): Promise<void>;
    private registerProTools;
    private initializeChannels;
    private setupEventLogging;
    stop(): Promise<void>;
    private printBanner;
}
export declare const kiwiBotPro: KiwiBotPro;
export {};
//# sourceMappingURL=index.d.ts.map