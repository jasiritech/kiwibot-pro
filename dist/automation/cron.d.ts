/**
 * 🥝 KiwiBot Pro - Cron Jobs & Webhooks
 * Scheduled tasks and external triggers (like Moltbot)
 */
import { EventEmitter } from 'events';
import express from 'express';
interface CronJob {
    id: string;
    name: string;
    schedule: string;
    command: string;
    enabled: boolean;
    lastRun?: Date;
    nextRun?: Date;
    runCount: number;
    createdAt: Date;
}
interface Webhook {
    id: string;
    name: string;
    path: string;
    secret?: string;
    method: 'GET' | 'POST' | 'PUT';
    action: string;
    enabled: boolean;
    lastTriggered?: Date;
    triggerCount: number;
}
declare class AutomationManager extends EventEmitter {
    private jobs;
    private webhooks;
    private timers;
    private webhookRouter;
    constructor();
    /**
     * Create a new cron job
     */
    createJob(name: string, schedule: string, command: string): CronJob;
    /**
     * Schedule a job
     */
    private scheduleJob;
    /**
     * Run a job
     */
    runJob(jobId: string): Promise<void>;
    /**
     * Enable/disable job
     */
    setJobEnabled(jobId: string, enabled: boolean): void;
    /**
     * Delete job
     */
    deleteJob(jobId: string): boolean;
    /**
     * List all jobs
     */
    listJobs(): CronJob[];
    /**
     * Create a webhook
     */
    createWebhook(name: string, path: string, action: string, options?: {
        method?: 'GET' | 'POST' | 'PUT';
        secret?: string;
    }): Webhook;
    /**
     * Register webhook route
     */
    private registerWebhookRoute;
    /**
     * Setup default webhooks
     */
    private setupDefaultWebhooks;
    /**
     * Enable/disable webhook
     */
    setWebhookEnabled(webhookId: string, enabled: boolean): void;
    /**
     * Delete webhook
     */
    deleteWebhook(webhookId: string): boolean;
    /**
     * List all webhooks
     */
    listWebhooks(): Webhook[];
    /**
     * Get the Express router for webhooks
     */
    getRouter(): express.Router;
    /**
     * Stop all jobs and cleanup
     */
    shutdown(): void;
}
export declare const automationManager: AutomationManager;
export {};
//# sourceMappingURL=cron.d.ts.map