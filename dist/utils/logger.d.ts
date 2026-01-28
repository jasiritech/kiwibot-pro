/**
 * 🥝 KiwiBot Pro - Logger
 * Structured logging with levels and formatting
 */
declare class Logger {
    private level;
    private context;
    private static levels;
    private static colors;
    private static icons;
    constructor(context?: string);
    private shouldLog;
    private formatTimestamp;
    private formatMessage;
    private log;
    debug(message: string, data?: unknown): void;
    info(message: string, data?: unknown): void;
    warn(message: string, data?: unknown): void;
    error(message: string, data?: unknown): void;
    child(context: string): Logger;
    gateway(message: string, data?: unknown): void;
    channel(type: string, message: string, data?: unknown): void;
    agent(message: string, data?: unknown): void;
    skill(name: string, message: string, data?: unknown): void;
}
export declare const logger: Logger;
export { Logger };
//# sourceMappingURL=logger.d.ts.map