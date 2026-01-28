/**
 * 🥝 KiwiBot Pro - SOUL.md Parser
 * Workspace personality files like Moltbot
 */
interface AgentsConfig {
    agents?: Array<{
        name: string;
        trigger: string;
        description: string;
        systemPrompt?: string;
    }>;
}
declare class WorkspacePersonality {
    private soulPath;
    private agentsPath;
    private soul;
    private agents;
    private watchInterval;
    constructor();
    /**
     * Load SOUL.md and AGENTS.md
     */
    load(): void;
    /**
     * Parse SOUL.md file
     */
    private loadSoul;
    /**
     * Parse AGENTS.md file
     */
    private loadAgents;
    /**
     * Parse SOUL.md markdown format
     */
    private parseSoulMarkdown;
    /**
     * Parse AGENTS.md markdown format
     */
    private parseAgentsMarkdown;
    /**
     * Parse markdown list
     */
    private parseList;
    /**
     * Parse examples from markdown
     */
    private parseExamples;
    /**
     * Get enhanced system prompt
     */
    getSystemPrompt(base: string): string;
    /**
     * Get available tools from SOUL.md
     */
    getAvailableTools(): string[];
    /**
     * Get custom agents from AGENTS.md
     */
    getAgents(): AgentsConfig['agents'];
    /**
     * Find agent by trigger
     */
    findAgentByTrigger(text: string): (typeof this.agents)['agents'] extends (infer T)[] ? T : never | undefined;
    /**
     * Get soul name
     */
    getName(): string | undefined;
    /**
     * Check if SOUL.md exists
     */
    hasSoul(): boolean;
    /**
     * Start watching for file changes
     */
    private startWatching;
    /**
     * Create default SOUL.md
     */
    createDefaultSoul(name?: string): void;
    /**
     * Create default AGENTS.md
     */
    createDefaultAgents(): void;
}
export declare const workspacePersonality: WorkspacePersonality;
export {};
//# sourceMappingURL=workspace.d.ts.map