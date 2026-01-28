/**
 * 🥝 KiwiBot Pro - Think Levels
 * Control AI reasoning depth per session (like Moltbot)
 */

import { logger } from '../utils/logger.js';

// Think level definitions (inspired by Moltbot)
export type ThinkLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'max';

interface ThinkConfig {
  level: ThinkLevel;
  tokenBudget: number;
  systemPromptAddition: string;
  temperature: number;
  reasoningEnabled: boolean;
}

const THINK_CONFIGS: Record<ThinkLevel, ThinkConfig> = {
  off: {
    level: 'off',
    tokenBudget: 500,
    systemPromptAddition: 'Respond directly and concisely. No reasoning.',
    temperature: 0.7,
    reasoningEnabled: false,
  },
  minimal: {
    level: 'minimal',
    tokenBudget: 1000,
    systemPromptAddition: 'Brief internal check, then respond directly.',
    temperature: 0.6,
    reasoningEnabled: false,
  },
  low: {
    level: 'low',
    tokenBudget: 2000,
    systemPromptAddition: 'Think briefly before responding. Show key reasoning.',
    temperature: 0.5,
    reasoningEnabled: true,
  },
  medium: {
    level: 'medium',
    tokenBudget: 4000,
    systemPromptAddition: 'Think step-by-step. Show your reasoning process.',
    temperature: 0.4,
    reasoningEnabled: true,
  },
  high: {
    level: 'high',
    tokenBudget: 8000,
    systemPromptAddition: 'Think deeply and methodically. Explore multiple angles. Show comprehensive reasoning.',
    temperature: 0.3,
    reasoningEnabled: true,
  },
  max: {
    level: 'max',
    tokenBudget: 16000,
    systemPromptAddition: 'Maximum reasoning mode. Think exhaustively. Consider all possibilities. Show complete chain of thought.',
    temperature: 0.2,
    reasoningEnabled: true,
  },
};

class ThinkManager {
  private sessionLevels: Map<string, ThinkLevel> = new Map();
  private defaultLevel: ThinkLevel;

  constructor() {
    this.defaultLevel = (process.env.DEFAULT_THINK_LEVEL as ThinkLevel) || 'medium';
  }

  /**
   * Get think config for session
   */
  getConfig(sessionId: string): ThinkConfig {
    const level = this.sessionLevels.get(sessionId) || this.defaultLevel;
    return THINK_CONFIGS[level];
  }

  /**
   * Get think level for session
   */
  getLevel(sessionId: string): ThinkLevel {
    return this.sessionLevels.get(sessionId) || this.defaultLevel;
  }

  /**
   * Set think level for session
   */
  setLevel(sessionId: string, level: ThinkLevel): ThinkConfig {
    if (!THINK_CONFIGS[level]) {
      throw new Error(`Invalid think level: ${level}. Use: ${Object.keys(THINK_CONFIGS).join(', ')}`);
    }

    this.sessionLevels.set(sessionId, level);
    logger.info(`Think: Session ${sessionId} set to level: ${level}`);

    return THINK_CONFIGS[level];
  }

  /**
   * Reset session to default level
   */
  resetLevel(sessionId: string): void {
    this.sessionLevels.delete(sessionId);
  }

  /**
   * Modify system prompt based on think level
   */
  enhanceSystemPrompt(sessionId: string, basePrompt: string): string {
    const config = this.getConfig(sessionId);
    
    if (config.level === 'off') {
      return basePrompt;
    }

    return `${basePrompt}

<thinking_mode level="${config.level}">
${config.systemPromptAddition}
Token budget for reasoning: ${config.tokenBudget}
</thinking_mode>`;
  }

  /**
   * Get adjusted temperature for session
   */
  getTemperature(sessionId: string): number {
    return this.getConfig(sessionId).temperature;
  }

  /**
   * Check if extended thinking is enabled
   */
  isReasoningEnabled(sessionId: string): boolean {
    return this.getConfig(sessionId).reasoningEnabled;
  }

  /**
   * Get token budget for reasoning
   */
  getTokenBudget(sessionId: string): number {
    return this.getConfig(sessionId).tokenBudget;
  }

  /**
   * Parse /think command
   */
  parseThinkCommand(text: string): { level: ThinkLevel; valid: boolean } | null {
    const match = text.match(/^\/think\s+(off|minimal|low|medium|high|max)$/i);
    if (!match) return null;

    const level = match[1].toLowerCase() as ThinkLevel;
    return { level, valid: !!THINK_CONFIGS[level] };
  }

  /**
   * Get formatted status for session
   */
  getStatus(sessionId: string): string {
    const level = this.getLevel(sessionId);
    const config = THINK_CONFIGS[level];

    const levelBar = {
      off: '○○○○○○',
      minimal: '●○○○○○',
      low: '●●○○○○',
      medium: '●●●○○○',
      high: '●●●●○○',
      max: '●●●●●●',
    }[level];

    return `🧠 **Think Level: ${level}**
${levelBar}

Temperature: ${config.temperature}
Token Budget: ${config.tokenBudget}
Reasoning: ${config.reasoningEnabled ? 'Enabled' : 'Disabled'}

_Use \`/think <level>\` to change_
Levels: off, minimal, low, medium, high, max`;
  }

  /**
   * Get all levels info
   */
  getAllLevels(): string {
    const lines = ['🧠 **Think Levels**', ''];

    for (const [level, config] of Object.entries(THINK_CONFIGS)) {
      const emoji = {
        off: '💨',
        minimal: '💭',
        low: '🤔',
        medium: '🧐',
        high: '🔬',
        max: '🧪',
      }[level];

      lines.push(`${emoji} **${level}** - ${config.systemPromptAddition.slice(0, 50)}...`);
      lines.push(`   Tokens: ${config.tokenBudget}, Temp: ${config.temperature}`);
      lines.push('');
    }

    return lines.join('\n');
  }
}

export const thinkManager = new ThinkManager();
export { THINK_CONFIGS };
