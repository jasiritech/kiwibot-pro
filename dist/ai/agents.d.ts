/**
 * 🥝 KiwiBot Pro - Agent-to-Agent Sessions
 * Let multiple AI agents collaborate (like Moltbot)
 */
interface Agent {
    id: string;
    name: string;
    role: string;
    personality: string;
    provider: 'openai' | 'anthropic';
    model: string;
    systemPrompt: string;
    temperature: number;
}
interface AgentMessage {
    id: string;
    agentId: string;
    agentName: string;
    content: string;
    timestamp: Date;
    thinking?: string;
}
interface CollaborationSession {
    id: string;
    agents: Agent[];
    messages: AgentMessage[];
    topic: string;
    status: 'active' | 'paused' | 'completed';
    createdAt: Date;
    maxTurns: number;
    currentTurn: number;
    moderator: string;
}
declare const AGENT_TEMPLATES: Record<string, Partial<Agent>>;
declare class AgentCollaboration {
    private sessions;
    /**
     * Create a collaboration session
     */
    createSession(topic: string, agentConfigs: Array<{
        template?: string;
        custom?: Partial<Agent>;
    }>, options?: {
        maxTurns?: number;
        moderatorTemplate?: string;
    }): CollaborationSession;
    /**
     * Get session
     */
    getSession(sessionId: string): CollaborationSession | undefined;
    /**
     * Build context for agent's turn
     */
    buildAgentContext(session: CollaborationSession, agent: Agent): string;
    /**
     * Add message to session
     */
    addMessage(sessionId: string, agentId: string, content: string, thinking?: string): AgentMessage | null;
    /**
     * Get next agent to speak
     */
    getNextAgent(sessionId: string): Agent | null;
    /**
     * Pause session
     */
    pauseSession(sessionId: string): boolean;
    /**
     * Resume session
     */
    resumeSession(sessionId: string): boolean;
    /**
     * Get session summary
     */
    getSummary(sessionId: string): string;
    /**
     * Get all sessions
     */
    listSessions(): CollaborationSession[];
    /**
     * Get available templates
     */
    getTemplates(): typeof AGENT_TEMPLATES;
}
export declare const agentCollaboration: AgentCollaboration;
export { AGENT_TEMPLATES };
//# sourceMappingURL=agents.d.ts.map