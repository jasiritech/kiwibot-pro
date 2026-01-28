/**
 * 🥝 KiwiBot Pro - Model Failover
 * Automatic provider switching when one fails (like Moltbot)
 */
type ProviderStatus = 'online' | 'degraded' | 'offline';
interface ProviderHealth {
    provider: string;
    status: ProviderStatus;
    lastCheck: Date;
    lastError?: string;
    successRate: number;
    avgLatency: number;
    failureCount: number;
    successCount: number;
}
declare class ModelFailover {
    private providers;
    private preferredOrder;
    private currentProvider;
    private config;
    constructor();
    /**
     * Initialize provider health tracking
     */
    private initializeProviders;
    /**
     * Get the best available provider
     */
    getBestProvider(): string | null;
    /**
     * Get current active provider
     */
    getCurrentProvider(): string | null;
    /**
     * Set preferred provider order
     */
    setProviderOrder(order: string[]): void;
    /**
     * Execute with automatic failover
     */
    executeWithFailover<T>(fn: (provider: string) => Promise<T>, options?: {
        providers?: string[];
    }): Promise<T>;
    /**
     * Record successful call
     */
    recordSuccess(provider: string, latency: number): void;
    /**
     * Record failed call
     */
    recordFailure(provider: string, error: string): void;
    /**
     * Get health status for all providers
     */
    getHealth(): ProviderHealth[];
    /**
     * Get health status for specific provider
     */
    getProviderHealth(provider: string): ProviderHealth | undefined;
    /**
     * Force provider status
     */
    setProviderStatus(provider: string, status: ProviderStatus): void;
    /**
     * Health report for diagnostics
     */
    getHealthReport(): string;
    /**
     * Utility delay
     */
    private delay;
}
export declare const modelFailover: ModelFailover;
export {};
//# sourceMappingURL=failover.d.ts.map