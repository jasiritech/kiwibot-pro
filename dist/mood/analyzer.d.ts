/**
 * 🥝 KiwiBot Pro - Mood & Sentiment Analyzer
 * Track user mood and adapt responses (UNIQUE!)
 */
interface MoodState {
    current: Mood;
    confidence: number;
    history: {
        mood: Mood;
        timestamp: Date;
    }[];
    triggers: string[];
}
type Mood = 'happy' | 'excited' | 'neutral' | 'confused' | 'frustrated' | 'sad' | 'angry';
declare class MoodAnalyzer {
    private userMoods;
    /**
     * Analyze text and detect mood
     */
    analyze(text: string, userId?: string): {
        mood: Mood;
        confidence: number;
    };
    /**
     * Update user's mood history
     */
    private updateMoodHistory;
    /**
     * Get user's current mood
     */
    getUserMood(userId: string): MoodState | undefined;
    /**
     * Get mood-appropriate response modifier
     */
    getResponseModifier(mood: Mood): {
        tone: string;
        prefix?: string;
    };
    /**
     * Adapt response based on user's mood
     */
    adaptResponse(response: string, userId: string): string;
    /**
     * Get mood trend for user
     */
    getMoodTrend(userId: string): {
        trend: 'improving' | 'declining' | 'stable';
        dominant: Mood;
    };
    /**
     * Get mood emoji
     */
    getMoodEmoji(mood: Mood): string;
    /**
     * Generate mood-aware system prompt
     */
    generateSystemPrompt(userId: string): string;
    /**
     * Get tools for AI consumption
     */
    getTools(): {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                userId: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        execute: (params: any) => Promise<MoodState>;
    }[];
}
export declare const moodAnalyzer: MoodAnalyzer;
export {};
//# sourceMappingURL=analyzer.d.ts.map