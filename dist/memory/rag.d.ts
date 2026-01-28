/**
 * 🥝 KiwiBot Pro - Memory System with RAG
 * Long-term memory with vector embeddings (UNIQUE!)
 */
interface Memory {
    id: string;
    content: string;
    embedding?: number[];
    metadata: {
        userId: string;
        channel: string;
        timestamp: Date;
        type: 'fact' | 'preference' | 'conversation' | 'instruction';
        importance: number;
    };
}
interface MemorySearchResult {
    memory: Memory;
    score: number;
}
declare class MemorySystem {
    private memories;
    private userMemories;
    private storagePath;
    constructor();
    /**
     * Store a new memory
     */
    remember(content: string, userId: string, channel: string, type?: Memory['metadata']['type'], importance?: number): Promise<Memory>;
    /**
     * Search memories by similarity
     */
    recall(query: string, userId?: string, limit?: number): Promise<MemorySearchResult[]>;
    /**
     * Get user facts and preferences
     */
    getUserProfile(userId: string): Memory[];
    /**
     * Extract facts from conversation
     */
    extractFacts(text: string): string[];
    /**
     * Forget a specific memory
     */
    forget(memoryId: string): boolean;
    /**
     * Forget all memories for a user
     */
    forgetUser(userId: string): number;
    /**
     * Build context from memories for AI
     */
    buildContext(query: string, userId: string): Promise<string>;
    /**
     * Simple text embedding (placeholder for real embeddings)
     */
    private simpleEmbed;
    /**
     * Cosine similarity between two vectors
     */
    private cosineSimilarity;
    /**
     * Simple string hash
     */
    private hashString;
    /**
     * Save memories to disk
     */
    private save;
    /**
     * Load memories from disk
     */
    private load;
    /**
     * Get stats
     */
    getStats(): {
        total: number;
        users: number;
        byType: Record<string, number>;
    };
    /**
     * Get tools for AI consumption
     */
    getTools(): ({
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                content: {
                    type: string;
                    description: string;
                };
                userId: {
                    type: string;
                    description: string;
                };
                type: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                importance: {
                    type: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                query?: undefined;
                limit?: undefined;
            };
            required: string[];
        };
        execute: (params: any) => Promise<Memory>;
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                query: {
                    type: string;
                    description: string;
                };
                userId: {
                    type: string;
                    description: string;
                };
                limit: {
                    type: string;
                    default: number;
                };
                content?: undefined;
                type?: undefined;
                importance?: undefined;
            };
            required: string[];
        };
        execute: (params: any) => Promise<MemorySearchResult[]>;
    })[];
}
export declare const memorySystem: MemorySystem;
export {};
//# sourceMappingURL=rag.d.ts.map