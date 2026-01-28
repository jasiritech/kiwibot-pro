/**
 * 🥝 KiwiBot Pro - Analytics & Usage Tracker
 * Track usage, costs, and performance (UNIQUE!)
 */
interface UserStats {
    totalMessages: number;
    totalTokens: number;
    totalCommands: number;
    skillsUsed: Record<string, number>;
    favoriteChannel: string;
    lastActive: Date;
    firstSeen: Date;
}
declare class AnalyticsTracker {
    private events;
    private userStats;
    private dailyStats;
    private storagePath;
    constructor();
    /**
     * Track a message event
     */
    trackMessage(userId: string, channel: string, model: string, tokens: {
        input: number;
        output: number;
    }, latency: number, success?: boolean, error?: string): void;
    /**
     * Track a command event
     */
    trackCommand(userId: string, channel: string, command: string): void;
    /**
     * Track skill usage
     */
    trackSkill(userId: string, channel: string, skillName: string, success: boolean): void;
    /**
     * Track API error
     */
    trackError(userId: string, channel: string, error: string): void;
    /**
     * Update user statistics
     */
    private updateUserStats;
    /**
     * Update daily statistics
     */
    private updateDailyStats;
    /**
     * Get usage summary
     */
    getSummary(): {
        total: {
            messages: number;
            tokens: number;
            users: number;
            cost: number;
        };
        today: {
            messages: number;
            tokens: number;
            users: number;
            cost: number;
        };
        topUsers: {
            userId: string;
            messages: number;
        }[];
        modelBreakdown: Record<string, number>;
    };
    /**
     * Get user statistics
     */
    getUserStats(userId: string): UserStats | undefined;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(days?: number): {
        avgLatency: number;
        errorRate: number;
        successRate: number;
        peakHour: number;
    };
    /**
     * Export analytics to JSON
     */
    export(): string;
    /**
     * Get date key for daily stats
     */
    private getDateKey;
    /**
     * Save analytics to disk
     */
    private save;
    /**
     * Load analytics from disk
     */
    private load;
    /**
     * Reset all analytics
     */
    reset(): void;
    /**
     * Get tools for AI consumption
     */
    getTools(): ({
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                userId: {
                    type: string;
                    description: string;
                };
                days?: undefined;
            };
            required: string[];
        };
        execute: (params: any) => Promise<UserStats>;
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                days: {
                    type: string;
                    default: number;
                    description: string;
                };
                userId?: undefined;
            };
            required?: undefined;
        };
        execute: (params: any) => Promise<{
            total: {
                messages: number;
                tokens: number;
                users: number;
                cost: number;
            };
            today: {
                messages: number;
                tokens: number;
                users: number;
                cost: number;
            };
            topUsers: {
                userId: string;
                messages: number;
            }[];
            modelBreakdown: Record<string, number>;
        }>;
    })[];
}
export declare const analyticsTracker: AnalyticsTracker;
export {};
//# sourceMappingURL=tracker.d.ts.map