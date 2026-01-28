/**
 * 🥝 KiwiBot Pro - Think Levels
 * Control AI reasoning depth per session (like Moltbot)
 */
export type ThinkLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'max';
interface ThinkConfig {
    level: ThinkLevel;
    tokenBudget: number;
    systemPromptAddition: string;
    temperature: number;
    reasoningEnabled: boolean;
}
declare const THINK_CONFIGS: Record<ThinkLevel, ThinkConfig>;
declare class ThinkManager {
    private sessionLevels;
    private defaultLevel;
    constructor();
    /**
     * Get think config for session
     */
    getConfig(sessionId: string): ThinkConfig;
    /**
     * Get think level for session
     */
    getLevel(sessionId: string): ThinkLevel;
    /**
     * Set think level for session
     */
    setLevel(sessionId: string, level: ThinkLevel): ThinkConfig;
    /**
     * Reset session to default level
     */
    resetLevel(sessionId: string): void;
    /**
     * Modify system prompt based on think level
     */
    enhanceSystemPrompt(sessionId: string, basePrompt: string): string;
    /**
     * Get adjusted temperature for session
     */
    getTemperature(sessionId: string): number;
    /**
     * Check if extended thinking is enabled
     */
    isReasoningEnabled(sessionId: string): boolean;
    /**
     * Get token budget for reasoning
     */
    getTokenBudget(sessionId: string): number;
    /**
     * Parse /think command
     */
    parseThinkCommand(text: string): {
        level: ThinkLevel;
        valid: boolean;
    } | null;
    /**
     * Get formatted status for session
     */
    getStatus(sessionId: string): string;
    /**
     * Get all levels info
     */
    getAllLevels(): string;
}
export declare const thinkManager: ThinkManager;
export { THINK_CONFIGS };
//# sourceMappingURL=think.d.ts.map