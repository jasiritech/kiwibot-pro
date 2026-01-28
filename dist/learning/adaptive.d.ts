/**
 * 🥝 KiwiBot Pro - Adaptive Learning System
 * Bot learns from corrections and feedback (UNIQUE!)
 */
interface Correction {
    id: string;
    userId: string;
    originalQuery: string;
    botResponse: string;
    correction: string;
    category: string;
    timestamp: Date;
    applied: boolean;
}
interface LearningRule {
    id: string;
    pattern: string;
    correction: string;
    confidence: number;
    usageCount: number;
    lastUsed: Date;
    createdFrom: string[];
}
declare class AdaptiveLearningSystem {
    private corrections;
    private rules;
    private feedback;
    private storagePath;
    constructor();
    /**
     * Record a correction from user
     */
    recordCorrection(userId: string, originalQuery: string, botResponse: string, correction: string, category?: string): Correction;
    /**
     * Analyze correction and potentially create a rule
     */
    private analyzeForRule;
    /**
     * Extract a pattern from similar queries
     */
    private extractPattern;
    /**
     * Apply learned corrections to a response
     */
    applyLearning(query: string, response: string, userId: string): string;
    /**
     * Record user feedback (thumbs up/down)
     */
    recordFeedback(userId: string, messageId: string, rating: 'positive' | 'negative', comment?: string): void;
    /**
     * Get learning statistics
     */
    getStats(): {
        corrections: number;
        rules: number;
        feedbackPositive: number;
        feedbackNegative: number;
        avgConfidence: number;
    };
    /**
     * Get user-specific stats
     */
    getUserStats(userId: string): {
        corrections: number;
        feedbackGiven: number;
        satisfactionRate: number;
    };
    /**
     * Simple string similarity (Jaccard)
     */
    private similarity;
    /**
     * Teach the bot explicitly
     */
    teach(pattern: string, response: string, confidence?: number): LearningRule;
    /**
     * Remove a rule
     */
    removeRule(ruleId: string): boolean;
    /**
     * Get top rules
     */
    getTopRules(limit?: number): LearningRule[];
    /**
     * Save to disk
     */
    private save;
    /**
     * Load from disk
     */
    private load;
    /**
     * Export learning data
     */
    export(): string;
    /**
     * Reset learning data
     */
    reset(): void;
}
export declare const adaptiveLearning: AdaptiveLearningSystem;
export {};
//# sourceMappingURL=adaptive.d.ts.map