/**
 * 🥝 KiwiBot Pro - Agent-to-Agent Sessions
 * Let multiple AI agents collaborate (like Moltbot)
 */

import { v4 as uuid } from 'uuid';
import { logger } from '../utils/logger.js';
import { eventBus } from '../utils/events.js';

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
  moderator: string; // Agent ID of moderator
}

// Pre-defined agent templates
const AGENT_TEMPLATES: Record<string, Partial<Agent>> = {
  analyst: {
    role: 'Data Analyst',
    personality: 'Methodical, detail-oriented, focuses on facts and evidence',
    systemPrompt: 'You are a data analyst. Focus on facts, evidence, and logical analysis. Challenge assumptions with data.',
    temperature: 0.3,
  },
  creative: {
    role: 'Creative Thinker',
    personality: 'Imaginative, thinks outside the box, generates novel ideas',
    systemPrompt: 'You are a creative thinker. Generate innovative ideas, make unexpected connections, challenge conventional thinking.',
    temperature: 0.8,
  },
  critic: {
    role: 'Critical Reviewer',
    personality: 'Skeptical, finds flaws, plays devil\'s advocate',
    systemPrompt: 'You are a critical reviewer. Find flaws in arguments, play devil\'s advocate, ensure nothing is overlooked.',
    temperature: 0.4,
  },
  expert: {
    role: 'Domain Expert',
    personality: 'Deep knowledge, provides context, explains complexities',
    systemPrompt: 'You are a domain expert. Provide deep knowledge, context, and explain technical complexities clearly.',
    temperature: 0.5,
  },
  moderator: {
    role: 'Discussion Moderator',
    personality: 'Fair, summarizes points, keeps discussion on track',
    systemPrompt: 'You are the moderator. Summarize key points, ensure all perspectives are heard, guide toward conclusions.',
    temperature: 0.5,
  },
  user_advocate: {
    role: 'User Advocate',
    personality: 'Empathetic, focuses on user needs and experience',
    systemPrompt: 'You are a user advocate. Focus on user needs, experience, and practical implications of decisions.',
    temperature: 0.6,
  },
};

class AgentCollaboration {
  private sessions: Map<string, CollaborationSession> = new Map();

  /**
   * Create a collaboration session
   */
  createSession(
    topic: string,
    agentConfigs: Array<{ template?: string; custom?: Partial<Agent> }>,
    options?: { maxTurns?: number; moderatorTemplate?: string }
  ): CollaborationSession {
    const sessionId = uuid();
    const agents: Agent[] = [];

    // Create agents from configs
    for (let i = 0; i < agentConfigs.length; i++) {
      const config = agentConfigs[i];
      const template = config.template ? AGENT_TEMPLATES[config.template] : {};
      
      const agent: Agent = {
        id: uuid(),
        name: config.custom?.name || `Agent ${i + 1}`,
        role: config.custom?.role || template.role || 'Assistant',
        personality: config.custom?.personality || template.personality || 'Helpful and thoughtful',
        provider: config.custom?.provider || 'anthropic',
        model: config.custom?.model || 'claude-sonnet-4-20250514',
        systemPrompt: config.custom?.systemPrompt || template.systemPrompt || 'You are a helpful AI assistant.',
        temperature: config.custom?.temperature ?? template.temperature ?? 0.5,
      };

      agents.push(agent);
    }

    // Add moderator if not present
    let moderatorId = agents.find(a => a.role === 'Discussion Moderator')?.id;
    if (!moderatorId && options?.moderatorTemplate !== 'none') {
      const modTemplate = AGENT_TEMPLATES.moderator;
      const moderator: Agent = {
        id: uuid(),
        name: 'Moderator',
        role: modTemplate.role!,
        personality: modTemplate.personality!,
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        systemPrompt: modTemplate.systemPrompt!,
        temperature: modTemplate.temperature!,
      };
      agents.push(moderator);
      moderatorId = moderator.id;
    }

    const session: CollaborationSession = {
      id: sessionId,
      agents,
      messages: [],
      topic,
      status: 'active',
      createdAt: new Date(),
      maxTurns: options?.maxTurns || 10,
      currentTurn: 0,
      moderator: moderatorId || agents[0].id,
    };

    this.sessions.set(sessionId, session);
    logger.info(`Agent Collaboration: Created session ${sessionId} with ${agents.length} agents`);

    return session;
  }

  /**
   * Get session
   */
  getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Build context for agent's turn
   */
  buildAgentContext(session: CollaborationSession, agent: Agent): string {
    const lines = [
      `COLLABORATION SESSION: ${session.topic}`,
      ``,
      `YOUR ROLE: ${agent.role} (${agent.name})`,
      `YOUR PERSONALITY: ${agent.personality}`,
      ``,
      `OTHER PARTICIPANTS:`,
    ];

    for (const a of session.agents) {
      if (a.id !== agent.id) {
        lines.push(`- ${a.name}: ${a.role} - ${a.personality}`);
      }
    }

    lines.push(``, `DISCUSSION SO FAR:`);

    if (session.messages.length === 0) {
      lines.push(`(No messages yet. You are starting the discussion.)`);
    } else {
      for (const msg of session.messages.slice(-10)) {
        lines.push(`[${msg.agentName}]: ${msg.content}`);
      }
    }

    lines.push(``, `INSTRUCTIONS: Contribute your perspective. Be concise. Build on or respectfully challenge others' points.`);

    return lines.join('\n');
  }

  /**
   * Add message to session
   */
  addMessage(sessionId: string, agentId: string, content: string, thinking?: string): AgentMessage | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const agent = session.agents.find(a => a.id === agentId);
    if (!agent) return null;

    const message: AgentMessage = {
      id: uuid(),
      agentId,
      agentName: agent.name,
      content,
      timestamp: new Date(),
      thinking,
    };

    session.messages.push(message);
    session.currentTurn++;

    eventBus.emitEvent('agent:message', sessionId, agentId, content);

    // Check if session complete
    if (session.currentTurn >= session.maxTurns) {
      session.status = 'completed';
    }

    return message;
  }

  /**
   * Get next agent to speak
   */
  getNextAgent(sessionId: string): Agent | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') return null;

    // Simple round-robin
    const nextIndex = session.currentTurn % session.agents.length;
    return session.agents[nextIndex];
  }

  /**
   * Pause session
   */
  pauseSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'paused';
      return true;
    }
    return false;
  }

  /**
   * Resume session
   */
  resumeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session && session.status === 'paused') {
      session.status = 'active';
      return true;
    }
    return false;
  }

  /**
   * Get session summary
   */
  getSummary(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) return 'Session not found';

    const statusEmoji = {
      active: '🟢',
      paused: '🟡',
      completed: '✅',
    }[session.status];

    const lines = [
      `${statusEmoji} **${session.topic}**`,
      ``,
      `Agents: ${session.agents.map(a => a.name).join(', ')}`,
      `Turn: ${session.currentTurn}/${session.maxTurns}`,
      `Messages: ${session.messages.length}`,
      ``,
      `**Recent Discussion:**`,
    ];

    for (const msg of session.messages.slice(-5)) {
      lines.push(`> **${msg.agentName}:** ${msg.content.slice(0, 100)}...`);
    }

    return lines.join('\n');
  }

  /**
   * Get all sessions
   */
  listSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get available templates
   */
  getTemplates(): typeof AGENT_TEMPLATES {
    return AGENT_TEMPLATES;
  }
}

export const agentCollaboration = new AgentCollaboration();
export { AGENT_TEMPLATES };
