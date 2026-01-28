/**
 * 🥝 KiwiBot Pro - Adaptive Learning System
 * Bot learns from corrections and feedback (UNIQUE!)
 */

import * as fs from 'fs';
import { logger } from '../utils/logger.js';

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
  pattern: string; // Regex pattern
  correction: string;
  confidence: number;
  usageCount: number;
  lastUsed: Date;
  createdFrom: string[]; // Correction IDs that led to this rule
}

interface UserFeedback {
  userId: string;
  messageId: string;
  rating: 'positive' | 'negative';
  comment?: string;
  timestamp: Date;
}

class AdaptiveLearningSystem {
  private corrections: Map<string, Correction> = new Map();
  private rules: Map<string, LearningRule> = new Map();
  private feedback: UserFeedback[] = [];
  private storagePath: string;

  constructor() {
    this.storagePath = process.env.LEARNING_PATH || './.kiwibot/learning.json';
    this.load();
  }

  /**
   * Record a correction from user
   */
  recordCorrection(
    userId: string,
    originalQuery: string,
    botResponse: string,
    correction: string,
    category: string = 'general'
  ): Correction {
    const id = crypto.randomUUID();
    
    const correctionEntry: Correction = {
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
  private analyzeForRule(correction: Correction): void {
    // Find similar corrections
    const similar = Array.from(this.corrections.values()).filter(c => 
      c.id !== correction.id &&
      this.similarity(c.originalQuery, correction.originalQuery) > 0.7
    );

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
  private extractPattern(corrections: Correction[]): string | null {
    // Simple: find common words/phrases
    const queries = corrections.map(c => c.originalQuery.toLowerCase());
    
    // Find common words
    const wordCounts: Map<string, number> = new Map();
    
    for (const query of queries) {
      const words = query.split(/\s+/);
      const seen = new Set<string>();
      
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
  applyLearning(query: string, response: string, userId: string): string {
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
      } catch {
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
  recordFeedback(
    userId: string,
    messageId: string,
    rating: 'positive' | 'negative',
    comment?: string
  ): void {
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
  getStats(): {
    corrections: number;
    rules: number;
    feedbackPositive: number;
    feedbackNegative: number;
    avgConfidence: number;
  } {
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
  getUserStats(userId: string): {
    corrections: number;
    feedbackGiven: number;
    satisfactionRate: number;
  } {
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
  private similarity(a: string, b: string): number {
    const setA = new Set(a.toLowerCase().split(/\s+/));
    const setB = new Set(b.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    
    return intersection.size / union.size;
  }

  /**
   * Teach the bot explicitly
   */
  teach(pattern: string, response: string, confidence: number = 0.8): LearningRule {
    const id = crypto.randomUUID();
    
    const rule: LearningRule = {
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
  removeRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      this.save();
    }
    return deleted;
  }

  /**
   * Get top rules
   */
  getTopRules(limit: number = 10): LearningRule[] {
    return Array.from(this.rules.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Save to disk
   */
  private save(): void {
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
    } catch (error: any) {
      logger.error(`Learning: Save failed: ${error.message}`);
    }
  }

  /**
   * Load from disk
   */
  private load(): void {
    try {
      if (!fs.existsSync(this.storagePath)) return;

      const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf-8'));
      
      this.corrections = new Map(data.corrections || []);
      this.rules = new Map(data.rules || []);
      this.feedback = data.feedback || [];

      logger.info(`Learning: Loaded ${this.rules.size} rules, ${this.corrections.size} corrections`);
    } catch (error: any) {
      logger.warn(`Learning: Load failed: ${error.message}`);
    }
  }

  /**
   * Export learning data
   */
  export(): string {
    return JSON.stringify({
      stats: this.getStats(),
      rules: Array.from(this.rules.values()),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Reset learning data
   */
  reset(): void {
    this.corrections.clear();
    this.rules.clear();
    this.feedback = [];
    this.save();
    logger.info('Learning: Reset complete');
  }
}

export const adaptiveLearning = new AdaptiveLearningSystem();
