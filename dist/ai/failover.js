/**
 * 🥝 KiwiBot Pro - Model Failover
 * Automatic provider switching when one fails (like Moltbot)
 */
import { logger } from '../utils/logger.js';
import { eventBus } from '../utils/events.js';
class ModelFailover {
    providers = new Map();
    preferredOrder = [];
    currentProvider = null;
    config;
    constructor() {
        this.config = {
            maxRetries: parseInt(process.env.FAILOVER_MAX_RETRIES || '3'),
            retryDelay: parseInt(process.env.FAILOVER_RETRY_DELAY || '1000'),
            circuitBreakerThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5'),
            circuitBreakerResetTime: parseInt(process.env.CIRCUIT_BREAKER_RESET || '60000'),
            healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
        };
        // Default provider order
        this.preferredOrder = ['anthropic', 'openai', 'groq', 'ollama'];
        this.initializeProviders();
    }
    /**
     * Initialize provider health tracking
     */
    initializeProviders() {
        for (const provider of this.preferredOrder) {
            this.providers.set(provider, {
                provider,
                status: 'online',
                lastCheck: new Date(),
                successRate: 100,
                avgLatency: 0,
                failureCount: 0,
                successCount: 0,
            });
        }
        // Set initial provider
        this.currentProvider = this.preferredOrder[0];
    }
    /**
     * Get the best available provider
     */
    getBestProvider() {
        for (const provider of this.preferredOrder) {
            const health = this.providers.get(provider);
            if (health && health.status !== 'offline') {
                return provider;
            }
        }
        return null;
    }
    /**
     * Get current active provider
     */
    getCurrentProvider() {
        return this.currentProvider;
    }
    /**
     * Set preferred provider order
     */
    setProviderOrder(order) {
        this.preferredOrder = order;
        logger.info(`Failover: Provider order set to ${order.join(' → ')}`);
    }
    /**
     * Execute with automatic failover
     */
    async executeWithFailover(fn, options) {
        const providers = options?.providers || this.preferredOrder;
        let lastError = null;
        for (const provider of providers) {
            const health = this.providers.get(provider);
            // Skip offline providers
            if (health && health.status === 'offline') {
                continue;
            }
            for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
                try {
                    const startTime = Date.now();
                    const result = await fn(provider);
                    const latency = Date.now() - startTime;
                    // Record success
                    this.recordSuccess(provider, latency);
                    this.currentProvider = provider;
                    return result;
                }
                catch (error) {
                    lastError = error;
                    // Record failure
                    this.recordFailure(provider, error.message);
                    logger.warn(`Failover: ${provider} attempt ${attempt}/${this.config.maxRetries} failed: ${error.message}`);
                    // Wait before retry (exponential backoff)
                    if (attempt < this.config.maxRetries) {
                        await this.delay(this.config.retryDelay * attempt);
                    }
                }
            }
            logger.warn(`Failover: ${provider} exhausted retries, trying next provider`);
        }
        // All providers failed
        eventBus.emitEvent('failover:allFailed');
        throw lastError || new Error('All providers failed');
    }
    /**
     * Record successful call
     */
    recordSuccess(provider, latency) {
        const health = this.providers.get(provider);
        if (!health)
            return;
        health.successCount++;
        health.lastCheck = new Date();
        health.lastError = undefined;
        // Update success rate
        const total = health.successCount + health.failureCount;
        health.successRate = (health.successCount / total) * 100;
        // Update average latency
        health.avgLatency = (health.avgLatency + latency) / 2;
        // Reset status if was degraded
        if (health.status === 'degraded') {
            health.status = 'online';
            logger.info(`Failover: ${provider} recovered, status: online`);
        }
        // Reset failure count on success
        health.failureCount = 0;
        this.providers.set(provider, health);
    }
    /**
     * Record failed call
     */
    recordFailure(provider, error) {
        const health = this.providers.get(provider);
        if (!health)
            return;
        health.failureCount++;
        health.lastCheck = new Date();
        health.lastError = error;
        // Update success rate
        const total = health.successCount + health.failureCount;
        health.successRate = (health.successCount / total) * 100;
        // Check circuit breaker threshold
        if (health.failureCount >= this.config.circuitBreakerThreshold) {
            health.status = 'offline';
            logger.error(`Failover: ${provider} circuit breaker tripped, status: offline`);
            eventBus.emitEvent('failover:circuitBreaker', provider);
            // Schedule reset
            setTimeout(() => {
                const h = this.providers.get(provider);
                if (h && h.status === 'offline') {
                    h.status = 'degraded';
                    h.failureCount = 0;
                    logger.info(`Failover: ${provider} circuit breaker reset, status: degraded`);
                }
            }, this.config.circuitBreakerResetTime);
        }
        else if (health.failureCount >= 2) {
            health.status = 'degraded';
        }
        this.providers.set(provider, health);
    }
    /**
     * Get health status for all providers
     */
    getHealth() {
        return Array.from(this.providers.values());
    }
    /**
     * Get health status for specific provider
     */
    getProviderHealth(provider) {
        return this.providers.get(provider);
    }
    /**
     * Force provider status
     */
    setProviderStatus(provider, status) {
        const health = this.providers.get(provider);
        if (health) {
            health.status = status;
            health.lastCheck = new Date();
            this.providers.set(provider, health);
            logger.info(`Failover: ${provider} manually set to ${status}`);
        }
    }
    /**
     * Health report for diagnostics
     */
    getHealthReport() {
        const lines = ['📊 **Provider Health Report**', ''];
        for (const health of this.providers.values()) {
            const statusEmoji = {
                online: '🟢',
                degraded: '🟡',
                offline: '🔴',
            }[health.status];
            lines.push(`${statusEmoji} **${health.provider}** - ${health.status}`);
            lines.push(`   Success Rate: ${health.successRate.toFixed(1)}%`);
            lines.push(`   Avg Latency: ${health.avgLatency.toFixed(0)}ms`);
            if (health.lastError) {
                lines.push(`   Last Error: ${health.lastError}`);
            }
            lines.push('');
        }
        const current = this.currentProvider;
        lines.push(`🎯 Active Provider: **${current || 'none'}**`);
        return lines.join('\n');
    }
    /**
     * Utility delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
export const modelFailover = new ModelFailover();
//# sourceMappingURL=failover.js.map