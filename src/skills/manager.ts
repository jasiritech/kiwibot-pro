/**
 * 🥝 KiwiBot Pro - Skill Manager
 * Advanced plugin system with triggers, permissions, and context
 */

import { v4 as uuid } from 'uuid';
import { eventBus } from '../utils/events.js';
import { logger } from '../utils/logger.js';
import { aiService } from '../ai/service.js';
import { sessionManager } from '../sessions/manager.js';
import type { 
  Skill, 
  SkillTrigger, 
  SkillContext, 
  SkillResult, 
  Message,
  GatewayClient,
} from '../types/index.js';

class SkillManager {
  private skills: Map<string, Skill> = new Map();
  private commandMap: Map<string, string> = new Map(); // command -> skillId

  constructor() {
    this.registerBuiltinSkills();
  }

  /**
   * Register a skill
   */
  register(skill: Skill): void {
    this.skills.set(skill.id, skill);

    // Map command triggers
    for (const trigger of skill.triggers) {
      if (trigger.type === 'command') {
        this.commandMap.set(trigger.pattern.toString().toLowerCase(), skill.id);
      }
    }

    eventBus.emitEvent('skill:loaded', skill.id);
    logger.skill(skill.id, `Registered: ${skill.name}`);
  }

  /**
   * Unregister a skill
   */
  unregister(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;

    // Remove command mappings
    for (const trigger of skill.triggers) {
      if (trigger.type === 'command') {
        this.commandMap.delete(trigger.pattern.toString().toLowerCase());
      }
    }

    this.skills.delete(skillId);
    return true;
  }

  /**
   * Handle a command (e.g., /help)
   */
  async handleCommand(command: string, args: string[], message: Message): Promise<SkillResult | null> {
    const skillId = this.commandMap.get(command.toLowerCase());
    if (!skillId) return null;

    const skill = this.skills.get(skillId);
    if (!skill) return null;

    return this.executeSkill(skill, message, args);
  }

  /**
   * Check all triggers for a message
   */
  async handleTriggers(message: Message): Promise<SkillResult | null> {
    // Sort skills by trigger priority
    const sortedSkills = Array.from(this.skills.values()).sort((a, b) => {
      const aPriority = Math.max(...a.triggers.map(t => t.priority || 0));
      const bPriority = Math.max(...b.triggers.map(t => t.priority || 0));
      return bPriority - aPriority;
    });

    for (const skill of sortedSkills) {
      for (const trigger of skill.triggers) {
        if (trigger.type === 'keyword') {
          if (message.content.toLowerCase().includes(trigger.pattern.toString().toLowerCase())) {
            const result = await this.executeSkill(skill, message, []);
            if (result?.stopPropagation) return result;
          }
        } else if (trigger.type === 'regex' && trigger.pattern instanceof RegExp) {
          const matches = message.content.match(trigger.pattern);
          if (matches) {
            const result = await this.executeSkill(skill, message, [], matches);
            if (result?.stopPropagation) return result;
          }
        }
      }
    }

    return null;
  }

  /**
   * Execute a skill
   */
  private async executeSkill(
    skill: Skill,
    message: Message,
    args: string[],
    matches?: RegExpMatchArray
  ): Promise<SkillResult> {
    const session = sessionManager.getOrCreate(
      message.author.id,
      message.channel,
      message.channelId
    );

    const context: SkillContext = {
      message,
      session,
      args,
      matches,
      gateway: null as any, // Will be injected
    };

    try {
      const result = await skill.execute(context);
      eventBus.emitEvent('skill:executed', skill.id, result);
      return result;
    } catch (error: any) {
      logger.error(`Skill ${skill.id} error: ${error.message}`);
      eventBus.emitEvent('skill:error', skill.id, error);
      return { content: `❌ Skill error: ${error.message}` };
    }
  }

  /**
   * List all skills
   */
  list(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get a skill by ID
   */
  get(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  /**
   * Register built-in skills
   */
  private registerBuiltinSkills(): void {
    // Help command
    this.register({
      id: 'builtin:help',
      name: 'Help',
      description: 'Ona list ya commands zote',
      version: '1.0.0',
      triggers: [
        { type: 'command', pattern: 'help' },
        { type: 'command', pattern: 'msaada' },
      ],
      execute: async () => {
        const skills = this.list();
        const commands = skills
          .filter(s => s.triggers.some(t => t.type === 'command'))
          .map(s => {
            const cmds = s.triggers
              .filter(t => t.type === 'command')
              .map(t => `/${t.pattern}`)
              .join(', ');
            return `• ${cmds} - ${s.description}`;
          })
          .join('\n');

        return {
          content: `🥝 **KiwiBot Pro - Commands**\n\n${commands}\n\n💬 Au niulize chochote bila command!`,
        };
      },
    });

    // Status command
    this.register({
      id: 'builtin:status',
      name: 'Status',
      description: 'Angalia hali ya bot',
      version: '1.0.0',
      triggers: [
        { type: 'command', pattern: 'status' },
        { type: 'command', pattern: 'hali' },
        { type: 'command', pattern: 'ping' },
      ],
      execute: async () => {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const memory = process.memoryUsage();

        return {
          content:
            `🥝 **KiwiBot Pro Status**\n\n` +
            `✅ Status: Online\n` +
            `⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s\n` +
            `💾 Memory: ${Math.round(memory.heapUsed / 1024 / 1024)}MB\n` +
            `📊 Sessions: ${sessionManager.count()}\n` +
            `🔌 Skills: ${this.skills.size}`,
        };
      },
    });

    // New/Reset command
    this.register({
      id: 'builtin:new',
      name: 'New Session',
      description: 'Anza mazungumzo mapya',
      version: '1.0.0',
      triggers: [
        { type: 'command', pattern: 'new' },
        { type: 'command', pattern: 'reset' },
        { type: 'command', pattern: 'clear' },
        { type: 'command', pattern: 'futa' },
      ],
      execute: async (ctx) => {
        sessionManager.clear(ctx.session.id);
        return {
          content: '🔄 Mazungumzo yamefutwa! Tuanze upya. 😊',
          stopPropagation: true,
        };
      },
    });

    // Model command
    this.register({
      id: 'builtin:model',
      name: 'Model',
      description: 'Badilisha au angalia AI model',
      version: '1.0.0',
      triggers: [{ type: 'command', pattern: 'model' }],
      execute: async (ctx) => {
        if (ctx.args.length === 0) {
          const models = aiService.getModels();
          const modelList = models.map(m => `• ${m.id} - ${m.name}`).join('\n');
          return {
            content:
              `🤖 **Current Model**: ${ctx.session.context.model}\n\n` +
              `**Available Models:**\n${modelList}\n\n` +
              `Badilisha: \`/model <model-id>\``,
          };
        }

        const newModel = ctx.args[0];
        sessionManager.updateContext(ctx.session.id, { model: newModel });
        return {
          content: `✅ Model imebadilishwa kuwa: **${newModel}**`,
          stopPropagation: true,
        };
      },
    });

    // Time command
    this.register({
      id: 'builtin:time',
      name: 'Time',
      description: 'Angalia saa',
      version: '1.0.0',
      triggers: [
        { type: 'command', pattern: 'time' },
        { type: 'command', pattern: 'saa' },
      ],
      execute: async () => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('sw-TZ', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        const dateStr = now.toLocaleDateString('sw-TZ', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        return {
          content: `🕐 **Saa**: ${timeStr}\n📅 **Tarehe**: ${dateStr}`,
          stopPropagation: true,
        };
      },
    });

    // Translate command
    this.register({
      id: 'builtin:translate',
      name: 'Translate',
      description: 'Tafsiri maneno',
      version: '1.0.0',
      triggers: [
        { type: 'command', pattern: 'translate' },
        { type: 'command', pattern: 'tafsiri' },
      ],
      execute: async (ctx) => {
        if (ctx.args.length < 2) {
          return {
            content: '📝 Tumia: `/translate <lugha> <maneno>`\nMfano: `/translate english habari yako`',
          };
        }

        const targetLang = ctx.args[0];
        const text = ctx.args.slice(1).join(' ');

        const translateMsg: Message = {
          ...ctx.message,
          id: uuid(),
          content: `Translate to ${targetLang}: "${text}". Reply with ONLY the translation.`,
        };

        const translation = await aiService.chat(translateMsg);
        return {
          content: `🌍 **${targetLang}**: ${translation}`,
          stopPropagation: true,
        };
      },
    });

    // Memory set
    this.register({
      id: 'builtin:remember',
      name: 'Remember',
      description: 'Kumbuka kitu',
      version: '1.0.0',
      triggers: [
        { type: 'command', pattern: 'remember' },
        { type: 'command', pattern: 'kumbuka' },
      ],
      execute: async (ctx) => {
        if (ctx.args.length < 2) {
          return {
            content: '📝 Tumia: `/remember <key> <value>`\nMfano: `/remember jina John`',
          };
        }

        const key = ctx.args[0];
        const value = ctx.args.slice(1).join(' ');
        sessionManager.setMemory(ctx.session.id, key, value);

        return {
          content: `✅ Nimekumbuka: **${key}** = "${value}"`,
          stopPropagation: true,
        };
      },
    });

    // Memory get
    this.register({
      id: 'builtin:recall',
      name: 'Recall',
      description: 'Kumbuka kitu kilichohifadhiwa',
      version: '1.0.0',
      triggers: [
        { type: 'command', pattern: 'recall' },
        { type: 'command', pattern: 'kumbukumbu' },
      ],
      execute: async (ctx) => {
        if (ctx.args.length === 0) {
          const memory = ctx.session.context.memory || [];
          if (memory.length === 0) {
            return { content: '📭 Hakuna kumbukumbu.' };
          }
          const list = memory.map(m => `• **${m.key}**: ${m.value}`).join('\n');
          return { content: `🧠 **Kumbukumbu:**\n${list}` };
        }

        const key = ctx.args[0];
        const value = sessionManager.getMemory(ctx.session.id, key);

        if (value) {
          return { content: `🧠 **${key}**: ${value}`, stopPropagation: true };
        } else {
          return { content: `❓ Sikumbuki "${key}"`, stopPropagation: true };
        }
      },
    });

    // Compact session
    this.register({
      id: 'builtin:compact',
      name: 'Compact',
      description: 'Punguza historia ya mazungumzo',
      version: '1.0.0',
      triggers: [{ type: 'command', pattern: 'compact' }],
      execute: async (ctx) => {
        await sessionManager.compact(ctx.session.id, async (messages) => {
          const summary = messages.map(m => `${m.role}: ${m.content}`).join('\n');
          const summaryMsg: Message = {
            ...ctx.message,
            id: uuid(),
            content: `Summarize this conversation in 2-3 sentences:\n${summary}`,
          };
          return await aiService.chat(summaryMsg);
        });

        return {
          content: '📦 Mazungumzo yamecompactwa!',
          stopPropagation: true,
        };
      },
    });
  }
}

export const skillManager = new SkillManager();
