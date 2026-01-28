/**
 * 🥝 KiwiBot Pro - Adaptive Learning System
 * Bot learns from corrections and feedback (UNIQUE!)
 */
import * as fs from 'fs';
import { logger } from '../utils/logger.js';
class AdaptiveLearningSystem {
    corrections = new Map();
    rules = new Map();
    feedback = [];
    storagePath;
    constructor() {
        this.storagePath = process.env.LEARNING_PATH || './.kiwibot/learning.json';
        this.load();
    }
    /**
     * Record a correction from user
     */
    recordCorrection(userId, originalQuery, botResponse, correction, category = 'general') {
        const id = crypto.randomUUID();
        const correctionEntry = {
            id,
            userId,
            originalQuery,
            botResponse,
            correction,
            category,
            timestamp: new Date(),
            applied: false,
        };
        this.corrections.set(id, correctionEntry);
        // Try to create a learning rule
        this.analyzeForRule(correctionEntry);
        this.save();
        logger.info(`Learning: Recorded correction from ${userId}`);
        return correctionEntry;
    }
    /**
     * Analyze correction and potentially create a rule
     */
    analyzeForRule(correction) {
        // Find similar corrections
        const similar = Array.from(this.corrections.values()).filter(c => c.id !== correction.id &&
            this.similarity(c.originalQuery, correction.originalQuery) > 0.7);
        if (similar.length >= 2) {
            // Multiple similar corrections - create a rule
            const pattern = this.extractPattern([correction, ...similar]);
            if (pattern) {
                const ruleId = crypto.randomUUID();
                this.rules.set(ruleId, {
                    id: ruleId,
                    pattern,
                    correction: correction.correction,
                    confidence: 0.5 + (similar.length * 0.1),
                    usageCount: 0,
                    lastUsed: new Date(),
                    createdFrom: [correction.id, ...similar.map(s => s.id)],
                });
                logger.info(`Learning: Created rule from ${similar.length + 1} corrections`);
            }
        }
    }
    /**
     * Extract a pattern from similar queries
     */
    extractPattern(corrections) {
        // Simple: find common words/phrases
        const queries = corrections.map(c => c.originalQuery.toLowerCase());
        // Find common words
        const wordCounts = new Map();
        for (const query of queries) {
            const words = query.split(/\s+/);
            const seen = new Set();
            for (const word of words) {
                if (!seen.has(word) && word.length > 2) {
                    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
                    seen.add(word);
                }
            }
        }
        // Find words that appear in most queries
        const commonWords = Array.from(wordCounts.entries())
            .filter(([_, count]) => count >= queries.length * 0.7)
            .map(([word]) => word);
        if (commonWords.length >= 2) {
            // Create a loose pattern
            return commonWords.map(w => `(?=.*\\b${w}\\b)`).join('') + '.*';
        }
        return null;
    }
    /**
     * Apply learned corrections to a response
     */
    applyLearning(query, response, userId) {
        // Check rules
        for (const rule of this.rules.values()) {
            try {
                const regex = new RegExp(rule.pattern, 'i');
                if (regex.test(query)) {
                    rule.usageCount++;
                    rule.lastUsed = new Date();
                    // Boost confidence based on usage
                    if (rule.usageCount > 5 && rule.confidence < 0.9) {
                        rule.confidence = Math.min(0.9, rule.confidence + 0.05);
                    }
                    // Apply correction with high confidence
                    if (rule.confidence >= 0.7) {
                        logger.debug(`Learning: Applied rule ${rule.id} to response`);
                        this.save();
                        return response + `\n\n*[Learned adjustment]*: ${rule.correction}`;
                    }
                }
            }
            catch {
                // Invalid regex, skip
            }
        }
        // Check user-specific corrections
        const userCorrections = Array.from(this.corrections.values())
            .filter(c => c.userId === userId && !c.applied)
            .filter(c => this.similarity(c.originalQuery, query) > 0.8);
        if (userCorrections.length > 0) {
            const correction = userCorrections[0];
            correction.applied = true;
            this.save();
            logger.debug(`Learning: Applied user correction to response`);
            return response + `\n\n*[Based on your previous feedback]*: ${correction.correction}`;
        }
        return response;
    }
    /**
     * Record user feedback (thumbs up/down)
     */
    recordFeedback(userId, messageId, rating, comment) {
        this.feedback.push({
            userId,
            messageId,
            rating,
            comment,
            timestamp: new Date(),
        });
        // Keep last 1000 feedback entries
        if (this.feedback.length > 1000) {
            this.feedback = this.feedback.slice(-1000);
        }
        this.save();
        logger.debug(`Learning: Recorded ${rating} feedback from ${userId}`);
    }
    /**
     * Get learning statistics
     */
    getStats() {
        const positiveCount = this.feedback.filter(f => f.rating === 'positive').length;
        const negativeCount = this.feedback.filter(f => f.rating === 'negative').length;
        const rules = Array.from(this.rules.values());
        const avgConfidence = rules.length > 0
            ? rules.reduce((sum, r) => sum + r.confidence, 0) / rules.length
            : 0;
        return {
            corrections: this.corrections.size,
            rules: this.rules.size,
            feedbackPositive: positiveCount,
            feedbackNegative: negativeCount,
            avgConfidence: Math.round(avgConfidence * 100) / 100,
        };
    }
    /**
     * Get user-specific stats
     */
    getUserStats(userId) {
        const userCorrections = Array.from(this.corrections.values())
            .filter(c => c.userId === userId);
        const userFeedback = this.feedback.filter(f => f.userId === userId);
        const positive = userFeedback.filter(f => f.rating === 'positive').length;
        return {
            corrections: userCorrections.length,
            feedbackGiven: userFeedback.length,
            satisfactionRate: userFeedback.length > 0
                ? Math.round((positive / userFeedback.length) * 100)
                : 100,
        };
    }
    /**
     * Simple string similarity (Jaccard)
     */
    similarity(a, b) {
        const setA = new Set(a.toLowerCase().split(/\s+/));
        const setB = new Set(b.toLowerCase().split(/\s+/));
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        return intersection.size / union.size;
    }
    /**
     * Teach the bot explicitly
     */
    teach(pattern, response, confidence = 0.8) {
        const id = crypto.randomUUID();
        const rule = {
            id,
            pattern,
            correction: response,
            confidence,
            usageCount: 0,
            lastUsed: new Date(),
            createdFrom: ['manual'],
        };
        this.rules.set(id, rule);
        this.save();
        logger.info(`Learning: Added manual rule: ${pattern}`);
        return rule;
    }
    /**
     * Remove a rule
     */
    removeRule(ruleId) {
        const deleted = this.rules.delete(ruleId);
        if (deleted) {
            this.save();
        }
        return deleted;
    }
    /**
     * Get top rules
     */
    getTopRules(limit = 10) {
        return Array.from(this.rules.values())
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, limit);
    }
    /**
     * Save to disk
     */
    save() {
        try {
            const dir = this.storagePath.replace(/\/[^/]+$/, '');
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const data = {
                corrections: Array.from(this.corrections.entries()),
                rules: Array.from(this.rules.entries()),
                feedback: this.feedback,
            };
            fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
        }
        catch (error) {
            logger.error(`Learning: Save failed: ${error.message}`);
        }
    }
    /**
     * Load from disk
     */
    load() {
        try {
            if (!fs.existsSync(this.storagePath))
                return;
            const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf-8'));
            this.corrections = new Map(data.corrections || []);
            this.rules = new Map(data.rules || []);
            this.feedback = data.feedback || [];
            logger.info(`Learning: Loaded ${this.rules.size} rules, ${this.corrections.size} corrections`);
        }
        catch (error) {
            logger.warn(`Learning: Load failed: ${error.message}`);
        }
    }
    /**
     * Export learning data
     */
    export() {
        return JSON.stringify({
            stats: this.getStats(),
            rules: Array.from(this.rules.values()),
            exportedAt: new Date().toISOString(),
        }, null, 2);
    }
    /**
     * Reset learning data
     */
    reset() {
        this.corrections.clear();
        this.rules.clear();
        this.feedback = [];
        this.save();
        logger.info('Learning: Reset complete');
    }
}
export const adaptiveLearning = new AdaptiveLearningSystem();
//# sourceMappingURL=adaptive.js.map