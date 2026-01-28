/**
 * 🥝 KiwiBot Pro - Memory System with RAG
 * Long-term memory with vector embeddings (UNIQUE!)
 */

import * as fs from 'fs';
import * as crypto from 'crypto';
import { logger } from '../utils/logger.js';

interface Memory {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {
    userId: string;
    channel: string;
    timestamp: Date;
    type: 'fact' | 'preference' | 'conversation' | 'instruction';
    importance: number; // 1-10
  };
}

interface MemorySearchResult {
  memory: Memory;
  score: number;
}

class MemorySystem {
  private memories: Map<string, Memory> = new Map();
  private userMemories: Map<string, Set<string>> = new Map();
  private storagePath: string;

  constructor() {
    this.storagePath = process.env.MEMORY_PATH || './.kiwibot/memories.json';
    this.load();
  }

  /**
   * Store a new memory
   */
  async remember(
    content: string,
    userId: string,
    channel: string,
    type: Memory['metadata']['type'] = 'conversation',
    importance: number = 5
  ): Promise<Memory> {
    const id = crypto.randomUUID();
    
    const memory: Memory = {
      id,
      content,
      metadata: {
        userId,
        channel,
        timestamp: new Date(),
        type,
        importance,
      },
    };

    // Generate simple embedding (in production, use OpenAI embeddings)
    memory.embedding = this.simpleEmbed(content);

    this.memories.set(id, memory);

    // Track user memories
    if (!this.userMemories.has(userId)) {
      this.userMemories.set(userId, new Set());
    }
    this.userMemories.get(userId)!.add(id);

    this.save();
    logger.debug(`Memory: Stored "${content.slice(0, 50)}..." for ${userId}`);

    return memory;
  }

  /**
   * Search memories by similarity
   */
  async recall(
    query: string,
    userId?: string,
    limit: number = 5
  ): Promise<MemorySearchResult[]> {
    const queryEmbedding = this.simpleEmbed(query);
    const results: MemorySearchResult[] = [];

    for (const memory of this.memories.values()) {
      // Filter by user if specified
      if (userId && memory.metadata.userId !== userId) continue;

      // Calculate cosine similarity
      const score = this.cosineSimilarity(queryEmbedding, memory.embedding || []);
      
      results.push({ memory, score });
    }

    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get user facts and preferences
   */
  getUserProfile(userId: string): Memory[] {
    const memoryIds = this.userMemories.get(userId);
    if (!memoryIds) return [];

    return Array.from(memoryIds)
      .map(id => this.memories.get(id)!)
      .filter(m => m.metadata.type === 'fact' || m.metadata.type === 'preference')
      .sort((a, b) => b.metadata.importance - a.metadata.importance);
  }

  /**
   * Extract facts from conversation
   */
  extractFacts(text: string): string[] {
    const facts: string[] = [];
    
    // Patterns for fact extraction
    const patterns = [
      /my name is (\w+)/i,
      /i am (\w+)/i,
      /i live in (.+)/i,
      /i work (?:at|for) (.+)/i,
      /i like (.+)/i,
      /i prefer (.+)/i,
      /my favorite (.+) is (.+)/i,
      /jina langu ni (\w+)/i, // Kiswahili
      /ninaishi (.+)/i,
      /napenda (.+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        facts.push(match[0]);
      }
    }

    return facts;
  }

  /**
   * Forget a specific memory
   */
  forget(memoryId: string): boolean {
    const memory = this.memories.get(memoryId);
    if (!memory) return false;

    this.memories.delete(memoryId);
    this.userMemories.get(memory.metadata.userId)?.delete(memoryId);
    this.save();

    return true;
  }

  /**
   * Forget all memories for a user
   */
  forgetUser(userId: string): number {
    const memoryIds = this.userMemories.get(userId);
    if (!memoryIds) return 0;

    let count = 0;
    for (const id of memoryIds) {
      this.memories.delete(id);
      count++;
    }

    this.userMemories.delete(userId);
    this.save();

    return count;
  }

  /**
   * Build context from memories for AI
   */
  async buildContext(query: string, userId: string): Promise<string> {
    const relevant = await this.recall(query, userId, 3);
    const profile = this.getUserProfile(userId).slice(0, 5);

    const lines: string[] = [];

    if (profile.length > 0) {
      lines.push('USER PROFILE:');
      for (const m of profile) {
        lines.push(`- ${m.content}`);
      }
      lines.push('');
    }

    if (relevant.length > 0) {
      lines.push('RELEVANT MEMORIES:');
      for (const { memory, score } of relevant) {
        if (score > 0.3) {
          lines.push(`- ${memory.content}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Simple text embedding (placeholder for real embeddings)
   */
  private simpleEmbed(text: string): number[] {
    // Simple bag-of-words style embedding
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(128).fill(0);

    for (const word of words) {
      const hash = this.hashString(word);
      embedding[hash % 128] += 1;
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  /**
   * Cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  /**
   * Simple string hash
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Save memories to disk
   */
  private save(): void {
    try {
      const dir = this.storagePath.replace(/\/[^/]+$/, '');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        memories: Array.from(this.memories.entries()),
        userMemories: Array.from(this.userMemories.entries()).map(([k, v]) => [k, Array.from(v)]),
      };

      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
    } catch (error: any) {
      logger.error(`Memory: Save failed: ${error.message}`);
    }
  }

  /**
   * Load memories from disk
   */
  private load(): void {
    try {
      if (!fs.existsSync(this.storagePath)) return;

      const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf-8'));
      
      this.memories = new Map(data.memories);
      this.userMemories = new Map(
        data.userMemories.map(([k, v]: [string, string[]]) => [k, new Set(v)])
      );

      logger.info(`Memory: Loaded ${this.memories.size} memories`);
    } catch (error: any) {
      logger.warn(`Memory: Load failed: ${error.message}`);
    }
  }

  /**
   * Get stats
   */
  getStats(): { total: number; users: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    
    for (const memory of this.memories.values()) {
      byType[memory.metadata.type] = (byType[memory.metadata.type] || 0) + 1;
    }

    return {
      total: this.memories.size,
      users: this.userMemories.size,
      byType,
    };
  }

  /**
   * Get tools for AI consumption
   */
  getTools() {
    return [
      {
        name: 'memory_remember',
        description: 'Save an important preference, fact, or instruction to long-term memory',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The information to remember' },
            userId: { type: 'string', description: 'The user ID this memory belongs to' },
            type: { type: 'string', enum: ['fact', 'preference', 'instruction'], default: 'fact' },
            importance: { type: 'number', minimum: 1, maximum: 10, default: 5 }
          },
          required: ['content', 'userId']
        },
        execute: async (params: any) => this.remember(params.content, params.userId, 'system', params.type, params.importance)
      },
      {
        name: 'memory_recall',
        description: 'Search long-term memory for relevant information about a topic or user',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
            userId: { type: 'string', description: 'The user ID to search for' },
            limit: { type: 'number', default: 3 }
          },
          required: ['query', 'userId']
        },
        execute: async (params: any) => this.recall(params.query, params.userId, params.limit)
      }
    ];
  }
}

export const memorySystem = new MemorySystem();
