/**
 * 🥝 KiwiBot Pro - Mood & Sentiment Analyzer
 * Track user mood and adapt responses (UNIQUE!)
 */

import { logger } from '../utils/logger.js';

interface MoodState {
  current: Mood;
  confidence: number;
  history: { mood: Mood; timestamp: Date }[];
  triggers: string[];
}

type Mood = 
  | 'happy' 
  | 'excited' 
  | 'neutral' 
  | 'confused' 
  | 'frustrated' 
  | 'sad' 
  | 'angry';

// Mood indicators for detection
const MOOD_PATTERNS: Record<Mood, { words: string[]; emojis: string[]; patterns: RegExp[] }> = {
  happy: {
    words: ['thanks', 'thank you', 'great', 'awesome', 'love', 'amazing', 'perfect', 'excellent', 'wonderful', 'asante', 'nzuri', 'poa', 'safi'],
    emojis: ['😊', '😄', '🙂', '😃', '❤️', '💕', '👍', '🎉', '✨'],
    patterns: [/haha/i, /lol/i, /:\)/],
  },
  excited: {
    words: ['wow', 'omg', 'amazing', 'incredible', 'fantastic', 'brilliant', 'ajabu', 'kabisa'],
    emojis: ['🤩', '🔥', '💯', '🚀', '⚡', '🎊', '🎉'],
    patterns: [/!{2,}/, /can't wait/i, /so excited/i],
  },
  neutral: {
    words: ['okay', 'ok', 'sure', 'fine', 'alright', 'sawa', 'haya'],
    emojis: ['🙂', '👌', '👍'],
    patterns: [],
  },
  confused: {
    words: ['what', 'huh', 'confused', "don't understand", 'unclear', 'sifahamu', 'sielewi', 'nini'],
    emojis: ['🤔', '❓', '😕', '🧐'],
    patterns: [/\?{2,}/, /what do you mean/i, /I don't get it/i],
  },
  frustrated: {
    words: ['ugh', 'annoying', 'frustrating', 'doesn\'t work', 'broken', 'wrong', 'problem', 'tatizo', 'mbaya'],
    emojis: ['😤', '😠', '🙄', '😒'],
    patterns: [/!{3,}/, /this is ridiculous/i, /come on/i],
  },
  sad: {
    words: ['sad', 'unfortunately', 'disappointed', 'sorry', 'miss', 'lonely', 'huzuni', 'pole'],
    emojis: ['😢', '😭', '😔', '💔', '😞'],
    patterns: [/i wish/i, /if only/i],
  },
  angry: {
    words: ['angry', 'hate', 'terrible', 'awful', 'worst', 'stupid', 'ridiculous', 'hasira', 'chuki'],
    emojis: ['😡', '🤬', '💢', '👎'],
    patterns: [/WTF/i, /WHAT THE/i, /so stupid/i],
  },
};

// Response adjustments based on mood
const MOOD_RESPONSES: Record<Mood, { tone: string; phrases: string[] }> = {
  happy: {
    tone: 'upbeat and friendly',
    phrases: ['Great to hear!', "That's wonderful!", '😊'],
  },
  excited: {
    tone: 'enthusiastic and energetic',
    phrases: ['How exciting!', "Let's go!", '🚀'],
  },
  neutral: {
    tone: 'balanced and professional',
    phrases: ['Understood.', 'Got it.', 'Sure thing.'],
  },
  confused: {
    tone: 'patient and clear',
    phrases: ['Let me explain...', 'To clarify...', "Here's what I mean:"],
  },
  frustrated: {
    tone: 'empathetic and solution-focused',
    phrases: ['I understand this is frustrating.', 'Let me help fix this.', "I'm sorry for the trouble."],
  },
  sad: {
    tone: 'gentle and supportive',
    phrases: ["I'm sorry to hear that.", 'That must be difficult.', 'I\'m here if you need to talk.'],
  },
  angry: {
    tone: 'calm and understanding',
    phrases: ['I understand your frustration.', 'Let me make this right.', 'I apologize for this experience.'],
  },
};

class MoodAnalyzer {
  private userMoods: Map<string, MoodState> = new Map();

  /**
   * Analyze text and detect mood
   */
  analyze(text: string, userId?: string): { mood: Mood; confidence: number } {
    const scores: Record<Mood, number> = {
      happy: 0,
      excited: 0,
      neutral: 0,
      confused: 0,
      frustrated: 0,
      sad: 0,
      angry: 0,
    };

    const textLower = text.toLowerCase();

    // Check each mood's indicators
    for (const [mood, patterns] of Object.entries(MOOD_PATTERNS) as [Mood, typeof MOOD_PATTERNS[Mood]][]) {
      // Check words
      for (const word of patterns.words) {
        if (textLower.includes(word.toLowerCase())) {
          scores[mood] += 1;
        }
      }

      // Check emojis
      for (const emoji of patterns.emojis) {
        if (text.includes(emoji)) {
          scores[mood] += 2; // Emojis are strong indicators
        }
      }

      // Check patterns
      for (const pattern of patterns.patterns) {
        if (pattern.test(text)) {
          scores[mood] += 1.5;
        }
      }
    }

    // Check for ALL CAPS (usually frustration or excitement)
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5 && text.length > 10) {
      scores.frustrated += 1;
      scores.angry += 1;
      scores.excited += 0.5;
    }

    // Find highest score
    let maxMood: Mood = 'neutral';
    let maxScore = 0;

    for (const [mood, score] of Object.entries(scores) as [Mood, number][]) {
      if (score > maxScore) {
        maxScore = score;
        maxMood = mood;
      }
    }

    // Calculate confidence
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? maxScore / totalScore : 0.5;

    // Default to neutral if no strong signal
    if (maxScore < 1) {
      maxMood = 'neutral';
    }

    // Update user's mood history
    if (userId) {
      this.updateMoodHistory(userId, maxMood, confidence);
    }

    return { mood: maxMood, confidence };
  }

  /**
   * Update user's mood history
   */
  private updateMoodHistory(userId: string, mood: Mood, confidence: number): void {
    let state = this.userMoods.get(userId);

    if (!state) {
      state = {
        current: mood,
        confidence,
        history: [],
        triggers: [],
      };
      this.userMoods.set(userId, state);
    }

    state.current = mood;
    state.confidence = confidence;
    state.history.push({ mood, timestamp: new Date() });

    // Keep last 50 entries
    if (state.history.length > 50) {
      state.history = state.history.slice(-50);
    }
  }

  /**
   * Get user's current mood
   */
  getUserMood(userId: string): MoodState | undefined {
    return this.userMoods.get(userId);
  }

  /**
   * Get mood-appropriate response modifier
   */
  getResponseModifier(mood: Mood): { tone: string; prefix?: string } {
    const moodResponse = MOOD_RESPONSES[mood];
    const prefix = moodResponse.phrases[Math.floor(Math.random() * moodResponse.phrases.length)];

    return {
      tone: moodResponse.tone,
      prefix: mood !== 'neutral' ? prefix : undefined,
    };
  }

  /**
   * Adapt response based on user's mood
   */
  adaptResponse(response: string, userId: string): string {
    const state = this.userMoods.get(userId);
    if (!state || state.current === 'neutral') {
      return response;
    }

    const modifier = this.getResponseModifier(state.current);
    
    // Only add prefix for strong mood detection
    if (state.confidence > 0.6 && modifier.prefix) {
      return `${modifier.prefix} ${response}`;
    }

    return response;
  }

  /**
   * Get mood trend for user
   */
  getMoodTrend(userId: string): { trend: 'improving' | 'declining' | 'stable'; dominant: Mood } {
    const state = this.userMoods.get(userId);
    if (!state || state.history.length < 3) {
      return { trend: 'stable', dominant: 'neutral' };
    }

    // Get mood values (higher = more positive)
    const moodValues: Record<Mood, number> = {
      happy: 3,
      excited: 3,
      neutral: 2,
      confused: 1,
      frustrated: 0,
      sad: 0,
      angry: -1,
    };

    const recent = state.history.slice(-5);
    const older = state.history.slice(-10, -5);

    const recentAvg = recent.reduce((sum, h) => sum + moodValues[h.mood], 0) / recent.length;
    const olderAvg = older.length > 0 
      ? older.reduce((sum, h) => sum + moodValues[h.mood], 0) / older.length 
      : recentAvg;

    // Count dominant mood
    const moodCounts: Record<Mood, number> = {
      happy: 0, excited: 0, neutral: 0, confused: 0, frustrated: 0, sad: 0, angry: 0,
    };
    for (const h of state.history) {
      moodCounts[h.mood]++;
    }

    const dominant = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])[0][0] as Mood;

    const diff = recentAvg - olderAvg;
    const trend = diff > 0.5 ? 'improving' : diff < -0.5 ? 'declining' : 'stable';

    return { trend, dominant };
  }

  /**
   * Get mood emoji
   */
  getMoodEmoji(mood: Mood): string {
    const emojis: Record<Mood, string> = {
      happy: '😊',
      excited: '🤩',
      neutral: '🙂',
      confused: '🤔',
      frustrated: '😤',
      sad: '😢',
      angry: '😠',
    };
    return emojis[mood];
  }

  /**
   * Generate mood-aware system prompt
   */
  generateSystemPrompt(userId: string): string {
    const state = this.userMoods.get(userId);
    if (!state) return '';

    const modifier = this.getResponseModifier(state.current);
    const trend = this.getMoodTrend(userId);

    let prompt = `The user's current mood appears to be ${state.current}. `;
    prompt += `Adjust your tone to be ${modifier.tone}. `;

    if (trend.trend === 'declining') {
      prompt += 'The user\'s mood has been declining - be extra supportive and helpful. ';
    } else if (trend.trend === 'improving') {
      prompt += 'The user\'s mood has been improving - maintain the positive momentum. ';
    }

    return prompt;
  }

  /**
   * Get tools for AI consumption
   */
  getTools() {
    return [
      {
        name: 'mood_get_state',
        description: 'Get the user current mood state and sentiment history',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'The user ID to check' }
          },
          required: ['userId']
        },
        execute: async (params: any) => this.getUserMood(params.userId)
      }
    ];
  }
}

export const moodAnalyzer = new MoodAnalyzer();
