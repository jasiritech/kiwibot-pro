/**
 * 🥝 KiwiBot Pro - Analytics & Usage Tracker
 * Track usage, costs, and performance (UNIQUE!)
 */
import * as fs from 'fs';
import { logger } from '../utils/logger.js';
// Token costs per 1K tokens (approximate)
const TOKEN_COSTS = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'gemini-pro': { input: 0.0005, output: 0.0015 },
};
class AnalyticsTracker {
    events = [];
    userStats = new Map();
    dailyStats = new Map();
    storagePath;
    constructor() {
        this.storagePath = process.env.ANALYTICS_PATH || './.kiwibot/analytics.json';
        this.load();
        // Auto-save every 5 minutes
        setInterval(() => this.save(), 5 * 60 * 1000);
    }
    /**
     * Track a message event
     */
    trackMessage(userId, channel, model, tokens, latency, success = true, error) {
        const event = {
            timestamp: new Date(),
            type: 'message',
            userId,
            channel,
            details: { model, tokens, latency, success, error },
        };
        this.events.push(event);
        this.updateUserStats(userId, channel, 'message', tokens);
        this.updateDailyStats(model, tokens, latency, success);
    }
    /**
     * Track a command event
     */
    trackCommand(userId, channel, command) {
        const event = {
            timestamp: new Date(),
            type: 'command',
            userId,
            channel,
            details: { success: true },
        };
        this.events.push(event);
        this.updateUserStats(userId, channel, 'command');
    }
    /**
     * Track skill usage
     */
    trackSkill(userId, channel, skillName, success) {
        const event = {
            timestamp: new Date(),
            type: 'skill',
            userId,
            channel,
            details: { success },
        };
        this.events.push(event);
        // Update user skill stats
        const stats = this.userStats.get(userId);
        if (stats) {
            stats.skillsUsed[skillName] = (stats.skillsUsed[skillName] || 0) + 1;
        }
    }
    /**
     * Track API error
     */
    trackError(userId, channel, error) {
        const event = {
            timestamp: new Date(),
            type: 'error',
            userId,
            channel,
            details: { success: false, error },
        };
        this.events.push(event);
        const today = this.getDateKey();
        const daily = this.dailyStats.get(today);
        if (daily) {
            daily.errors++;
        }
    }
    /**
     * Update user statistics
     */
    updateUserStats(userId, channel, type, tokens) {
        let stats = this.userStats.get(userId);
        if (!stats) {
            stats = {
                totalMessages: 0,
                totalTokens: 0,
                totalCommands: 0,
                skillsUsed: {},
                favoriteChannel: channel,
                lastActive: new Date(),
                firstSeen: new Date(),
            };
            this.userStats.set(userId, stats);
        }
        stats.lastActive = new Date();
        if (type === 'message') {
            stats.totalMessages++;
            if (tokens) {
                stats.totalTokens += tokens.input + tokens.output;
            }
        }
        else if (type === 'command') {
            stats.totalCommands++;
        }
    }
    /**
     * Update daily statistics
     */
    updateDailyStats(model, tokens, latency, success) {
        const dateKey = this.getDateKey();
        let daily = this.dailyStats.get(dateKey);
        if (!daily) {
            daily = {
                date: dateKey,
                messages: 0,
                tokens: 0,
                users: new Set(),
                errors: 0,
                avgLatency: 0,
                modelUsage: {},
            };
            this.dailyStats.set(dateKey, daily);
        }
        daily.messages++;
        daily.tokens += tokens.input + tokens.output;
        daily.modelUsage[model] = (daily.modelUsage[model] || 0) + 1;
        // Update average latency
        daily.avgLatency = ((daily.avgLatency * (daily.messages - 1)) + latency) / daily.messages;
        if (!success) {
            daily.errors++;
        }
    }
    /**
     * Get usage summary
     */
    getSummary() {
        const today = this.getDateKey();
        const todayStats = this.dailyStats.get(today);
        // Calculate total cost
        let totalCost = 0;
        let todayCost = 0;
        let totalTokens = 0;
        let totalMessages = 0;
        for (const daily of this.dailyStats.values()) {
            totalMessages += daily.messages;
            totalTokens += daily.tokens;
            for (const [model, count] of Object.entries(daily.modelUsage)) {
                const rates = TOKEN_COSTS[model] || TOKEN_COSTS['gpt-4o-mini'];
                const avgTokensPerMessage = daily.tokens / daily.messages || 0;
                totalCost += (avgTokensPerMessage * count / 1000) * (rates.input + rates.output) / 2;
            }
        }
        if (todayStats) {
            for (const [model, count] of Object.entries(todayStats.modelUsage)) {
                const rates = TOKEN_COSTS[model] || TOKEN_COSTS['gpt-4o-mini'];
                const avgTokensPerMessage = todayStats.tokens / todayStats.messages || 0;
                todayCost += (avgTokensPerMessage * count / 1000) * (rates.input + rates.output) / 2;
            }
        }
        // Top users
        const topUsers = Array.from(this.userStats.entries())
            .map(([userId, stats]) => ({ userId, messages: stats.totalMessages }))
            .sort((a, b) => b.messages - a.messages)
            .slice(0, 10);
        // Model breakdown
        const modelBreakdown = {};
        for (const daily of this.dailyStats.values()) {
            for (const [model, count] of Object.entries(daily.modelUsage)) {
                modelBreakdown[model] = (modelBreakdown[model] || 0) + count;
            }
        }
        return {
            total: {
                messages: totalMessages,
                tokens: totalTokens,
                users: this.userStats.size,
                cost: Math.round(totalCost * 100) / 100,
            },
            today: {
                messages: todayStats?.messages || 0,
                tokens: todayStats?.tokens || 0,
                users: todayStats?.users.size || 0,
                cost: Math.round(todayCost * 100) / 100,
            },
            topUsers,
            modelBreakdown,
        };
    }
    /**
     * Get user statistics
     */
    getUserStats(userId) {
        return this.userStats.get(userId);
    }
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(days = 7) {
        const now = new Date();
        let totalLatency = 0;
        let totalMessages = 0;
        let totalErrors = 0;
        const hourCounts = new Array(24).fill(0);
        for (let i = 0; i < days; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const key = this.getDateKey(date);
            const daily = this.dailyStats.get(key);
            if (daily) {
                totalLatency += daily.avgLatency * daily.messages;
                totalMessages += daily.messages;
                totalErrors += daily.errors;
            }
        }
        // Analyze events for peak hours
        const recentEvents = this.events.filter(e => {
            const eventDate = new Date(e.timestamp);
            const daysDiff = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= days;
        });
        for (const event of recentEvents) {
            const hour = new Date(event.timestamp).getHours();
            hourCounts[hour]++;
        }
        const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
        return {
            avgLatency: totalMessages > 0 ? totalLatency / totalMessages : 0,
            errorRate: totalMessages > 0 ? (totalErrors / totalMessages) * 100 : 0,
            successRate: totalMessages > 0 ? ((totalMessages - totalErrors) / totalMessages) * 100 : 100,
            peakHour,
        };
    }
    /**
     * Export analytics to JSON
     */
    export() {
        return JSON.stringify({
            summary: this.getSummary(),
            performance: this.getPerformanceMetrics(),
            exportDate: new Date().toISOString(),
        }, null, 2);
    }
    /**
     * Get date key for daily stats
     */
    getDateKey(date = new Date()) {
        return date.toISOString().split('T')[0];
    }
    /**
     * Save analytics to disk
     */
    save() {
        try {
            const dir = this.storagePath.replace(/\/[^/]+$/, '');
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const data = {
                userStats: Array.from(this.userStats.entries()),
                dailyStats: Array.from(this.dailyStats.entries()).map(([k, v]) => [
                    k,
                    { ...v, users: Array.from(v.users) },
                ]),
                events: this.events.slice(-1000), // Keep last 1000 events
            };
            fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
            logger.debug('Analytics: Saved to disk');
        }
        catch (error) {
            logger.error(`Analytics: Save failed: ${error.message}`);
        }
    }
    /**
     * Load analytics from disk
     */
    load() {
        try {
            if (!fs.existsSync(this.storagePath))
                return;
            const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf-8'));
            this.userStats = new Map(data.userStats);
            this.dailyStats = new Map(data.dailyStats.map(([k, v]) => [
                k,
                { ...v, users: new Set(v.users) },
            ]));
            this.events = data.events || [];
            logger.info(`Analytics: Loaded ${this.events.length} events`);
        }
        catch (error) {
            logger.warn(`Analytics: Load failed: ${error.message}`);
        }
    }
    /**
     * Reset all analytics
     */
    reset() {
        this.events = [];
        this.userStats.clear();
        this.dailyStats.clear();
        this.save();
        logger.info('Analytics: Reset complete');
    }
    /**
     * Get tools for AI consumption
     */
    getTools() {
        return [
            {
                name: 'analytics_get_user_stats',
                description: 'Get statistics and usage history for a specific user',
                parameters: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string', description: 'The user ID to check' }
                    },
                    required: ['userId']
                },
                execute: async (params) => this.getUserStats(params.userId)
            },
            {
                name: 'analytics_get_summary',
                description: 'Get a global summary of bot usage and performance',
                parameters: {
                    type: 'object',
                    properties: {
                        days: { type: 'number', default: 7, description: 'Number of past days to include' }
                    }
                },
                execute: async (params) => this.getSummary()
            }
        ];
    }
}
export const analyticsTracker = new AnalyticsTracker();
//# sourceMappingURL=tracker.js.map