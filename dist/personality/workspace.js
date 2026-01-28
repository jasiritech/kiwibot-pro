/**
 * 🥝 KiwiBot Pro - SOUL.md Parser
 * Workspace personality files like Moltbot
 */
import * as fs from 'fs';
import { logger } from '../utils/logger.js';
class WorkspacePersonality {
    soulPath;
    agentsPath;
    soul = null;
    agents = null;
    watchInterval = null;
    constructor() {
        this.soulPath = process.env.SOUL_PATH || './SOUL.md';
        this.agentsPath = process.env.AGENTS_PATH || './AGENTS.md';
        this.load();
        this.startWatching();
    }
    /**
     * Load SOUL.md and AGENTS.md
     */
    load() {
        this.loadSoul();
        this.loadAgents();
    }
    /**
     * Parse SOUL.md file
     */
    loadSoul() {
        try {
            if (!fs.existsSync(this.soulPath)) {
                logger.debug('WorkspacePersonality: No SOUL.md found');
                return;
            }
            const content = fs.readFileSync(this.soulPath, 'utf-8');
            this.soul = this.parseSoulMarkdown(content);
            logger.info(`WorkspacePersonality: Loaded SOUL.md (name: ${this.soul.name || 'unnamed'})`);
        }
        catch (error) {
            logger.warn(`WorkspacePersonality: Could not load SOUL.md: ${error.message}`);
        }
    }
    /**
     * Parse AGENTS.md file
     */
    loadAgents() {
        try {
            if (!fs.existsSync(this.agentsPath)) {
                logger.debug('WorkspacePersonality: No AGENTS.md found');
                return;
            }
            const content = fs.readFileSync(this.agentsPath, 'utf-8');
            this.agents = this.parseAgentsMarkdown(content);
            logger.info(`WorkspacePersonality: Loaded AGENTS.md (${this.agents.agents?.length || 0} agents)`);
        }
        catch (error) {
            logger.warn(`WorkspacePersonality: Could not load AGENTS.md: ${error.message}`);
        }
    }
    /**
     * Parse SOUL.md markdown format
     */
    parseSoulMarkdown(content) {
        const soul = {};
        // Parse # Name
        const nameMatch = content.match(/^#\s+(.+)$/m);
        if (nameMatch)
            soul.name = nameMatch[1].trim();
        // Parse ## Personality
        const personalityMatch = content.match(/##\s+Personality\s*\n([\s\S]*?)(?=\n##|$)/i);
        if (personalityMatch)
            soul.personality = personalityMatch[1].trim();
        // Parse ## Role
        const roleMatch = content.match(/##\s+Role\s*\n([\s\S]*?)(?=\n##|$)/i);
        if (roleMatch)
            soul.role = roleMatch[1].trim();
        // Parse ## Guidelines (list)
        const guidelinesMatch = content.match(/##\s+Guidelines\s*\n([\s\S]*?)(?=\n##|$)/i);
        if (guidelinesMatch) {
            soul.guidelines = this.parseList(guidelinesMatch[1]);
        }
        // Parse ## Tools (list)
        const toolsMatch = content.match(/##\s+Tools\s*\n([\s\S]*?)(?=\n##|$)/i);
        if (toolsMatch) {
            soul.tools = this.parseList(toolsMatch[1]);
        }
        // Parse ## Restrictions (list)
        const restrictionsMatch = content.match(/##\s+Restrictions\s*\n([\s\S]*?)(?=\n##|$)/i);
        if (restrictionsMatch) {
            soul.restrictions = this.parseList(restrictionsMatch[1]);
        }
        // Parse ## Examples
        const examplesMatch = content.match(/##\s+Examples\s*\n([\s\S]*?)(?=\n##|$)/i);
        if (examplesMatch) {
            soul.examples = this.parseExamples(examplesMatch[1]);
        }
        return soul;
    }
    /**
     * Parse AGENTS.md markdown format
     */
    parseAgentsMarkdown(content) {
        const config = { agents: [] };
        // Match each ## Agent Name section
        const agentBlocks = content.split(/(?=^##\s)/m).filter(b => b.trim());
        for (const block of agentBlocks) {
            const nameMatch = block.match(/^##\s+(.+)$/m);
            if (!nameMatch)
                continue;
            const name = nameMatch[1].trim();
            // Parse trigger
            const triggerMatch = block.match(/trigger:\s*`?(.+?)`?\s*$/im);
            const trigger = triggerMatch ? triggerMatch[1] : `@${name.toLowerCase()}`;
            // Parse description
            const descMatch = block.match(/description:\s*(.+)$/im);
            const description = descMatch ? descMatch[1] : '';
            // Parse system prompt (everything after ---)
            const promptMatch = block.match(/---\s*\n([\s\S]*)$/);
            const systemPrompt = promptMatch ? promptMatch[1].trim() : undefined;
            config.agents?.push({ name, trigger, description, systemPrompt });
        }
        return config;
    }
    /**
     * Parse markdown list
     */
    parseList(text) {
        return text
            .split('\n')
            .filter(line => line.match(/^[-*]\s/))
            .map(line => line.replace(/^[-*]\s+/, '').trim());
    }
    /**
     * Parse examples from markdown
     */
    parseExamples(text) {
        const examples = [];
        const blocks = text.split(/(?=>\s*\*\*User\*\*)/i);
        for (const block of blocks) {
            const userMatch = block.match(/>\s*\*\*User\*\*:\s*(.+)$/im);
            const assistantMatch = block.match(/>\s*\*\*Assistant\*\*:\s*(.+)$/im);
            if (userMatch && assistantMatch) {
                examples.push({
                    user: userMatch[1],
                    assistant: assistantMatch[1],
                });
            }
        }
        return examples;
    }
    /**
     * Get enhanced system prompt
     */
    getSystemPrompt(base) {
        if (!this.soul)
            return base;
        const parts = [base];
        if (this.soul.name) {
            parts.push(`\nYour name is ${this.soul.name}.`);
        }
        if (this.soul.personality) {
            parts.push(`\nPERSONALITY:\n${this.soul.personality}`);
        }
        if (this.soul.role) {
            parts.push(`\nROLE:\n${this.soul.role}`);
        }
        if (this.soul.guidelines?.length) {
            parts.push(`\nGUIDELINES:\n${this.soul.guidelines.map(g => `- ${g}`).join('\n')}`);
        }
        if (this.soul.restrictions?.length) {
            parts.push(`\nRESTRICTIONS:\n${this.soul.restrictions.map(r => `- ${r}`).join('\n')}`);
        }
        if (this.soul.examples?.length) {
            parts.push(`\nEXAMPLES:`);
            for (const ex of this.soul.examples) {
                parts.push(`User: ${ex.user}`);
                parts.push(`Assistant: ${ex.assistant}`);
            }
        }
        return parts.join('\n');
    }
    /**
     * Get available tools from SOUL.md
     */
    getAvailableTools() {
        return this.soul?.tools || [];
    }
    /**
     * Get custom agents from AGENTS.md
     */
    getAgents() {
        return this.agents?.agents || [];
    }
    /**
     * Find agent by trigger
     */
    findAgentByTrigger(text) {
        if (!this.agents?.agents)
            return undefined;
        for (const agent of this.agents.agents) {
            if (text.toLowerCase().includes(agent.trigger.toLowerCase())) {
                return agent;
            }
        }
        return undefined;
    }
    /**
     * Get soul name
     */
    getName() {
        return this.soul?.name;
    }
    /**
     * Check if SOUL.md exists
     */
    hasSoul() {
        return this.soul !== null;
    }
    /**
     * Start watching for file changes
     */
    startWatching() {
        this.watchInterval = setInterval(() => {
            const soulExists = fs.existsSync(this.soulPath);
            const agentsExists = fs.existsSync(this.agentsPath);
            if (soulExists || agentsExists) {
                this.load();
            }
        }, 30000); // Check every 30 seconds
    }
    /**
     * Create default SOUL.md
     */
    createDefaultSoul(name = 'KiwiBot') {
        const content = `# ${name}

## Personality

You are a friendly, knowledgeable assistant. You're helpful but not overly formal.
You use emoji occasionally and try to make interactions pleasant.

## Role

Personal AI assistant helping with tasks, questions, and creative work.

## Guidelines

- Be helpful and accurate
- Ask clarifying questions when needed
- Admit when you don't know something
- Use code blocks for code
- Be concise but thorough

## Tools

- web_search
- calculator
- weather
- reminder

## Restrictions

- Don't share personal information
- Don't generate harmful content
- Don't pretend to be a specific person

## Examples

> **User**: What's the weather like?
> **Assistant**: Let me check the weather for you! 🌤️

> **User**: Help me write a poem
> **Assistant**: I'd love to help! What would you like the poem to be about?
`;
        fs.writeFileSync(this.soulPath, content);
        this.load();
        logger.info(`WorkspacePersonality: Created default SOUL.md`);
    }
    /**
     * Create default AGENTS.md
     */
    createDefaultAgents() {
        const content = `# Agents

## CodeReviewer

trigger: \`@reviewer\`
description: Reviews code for best practices and issues

---

You are a code reviewer. When asked to review code:
1. Check for bugs and errors
2. Suggest improvements
3. Evaluate readability
4. Check security concerns
5. Provide specific, actionable feedback

## Writer

trigger: \`@writer\`
description: Creative writing and content generation

---

You are a creative writer. Help with:
- Blog posts and articles
- Stories and narratives
- Marketing copy
- Technical documentation
- Email drafts

Focus on engaging, clear prose.
`;
        fs.writeFileSync(this.agentsPath, content);
        this.load();
        logger.info(`WorkspacePersonality: Created default AGENTS.md`);
    }
}
export const workspacePersonality = new WorkspacePersonality();
//# sourceMappingURL=workspace.js.map