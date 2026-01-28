/**
 * 🥝 KiwiBot Pro - Skill Manager
 * Advanced plugin system with triggers, permissions, and context
 */
import type { Skill, SkillResult, Message } from '../types/index.js';
declare class SkillManager {
    private skills;
    private commandMap;
    constructor();
    /**
     * Register a skill
     */
    register(skill: Skill): void;
    /**
     * Unregister a skill
     */
    unregister(skillId: string): boolean;
    /**
     * Handle a command (e.g., /help)
     */
    handleCommand(command: string, args: string[], message: Message): Promise<SkillResult | null>;
    /**
     * Check all triggers for a message
     */
    handleTriggers(message: Message): Promise<SkillResult | null>;
    /**
     * Execute a skill
     */
    private executeSkill;
    /**
     * List all skills
     */
    list(): Skill[];
    /**
     * Get a skill by ID
     */
    get(skillId: string): Skill | undefined;
    /**
     * Register built-in skills
     */
    private registerBuiltinSkills;
}
export declare const skillManager: SkillManager;
export {};
//# sourceMappingURL=manager.d.ts.map