/**
 * 🥝 KiwiBot Pro - Cron Jobs & Webhooks
 * Scheduled tasks and external triggers (like Moltbot)
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { eventBus } from '../utils/events.js';
import { aiService } from '../ai/service.js';
import { sessionManager } from '../sessions/manager.js';
import express from 'express';
import { v4 as uuid } from 'uuid';

// Cron job definition
interface CronJob {
  id: string;
  name: string;
  schedule: string; // cron expression or simple format
  command: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  createdAt: Date;
}

// Webhook definition
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

// Simple cron patterns
const SIMPLE_SCHEDULES: Record<string, number> = {
  '@every1m': 60 * 1000,
  '@every5m': 5 * 60 * 1000,
  '@every15m': 15 * 60 * 1000,
  '@every30m': 30 * 60 * 1000,
  '@hourly': 60 * 60 * 1000,
  '@daily': 24 * 60 * 60 * 1000,
  '@weekly': 7 * 24 * 60 * 60 * 1000,
};

class AutomationManager extends EventEmitter {
  private jobs: Map<string, CronJob> = new Map();
  private webhooks: Map<string, Webhook> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private webhookRouter: express.Router;

  constructor() {
    super();
    this.webhookRouter = express.Router();
    this.setupDefaultWebhooks();
  }

  // ═══════════════════════════════════════════════════════════════
  // CRON JOBS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new cron job
   */
  createJob(name: string, schedule: string, command: string): CronJob {
    const job: CronJob = {
      id: uuid(),
      name,
      schedule,
      command,
      enabled: true,
      runCount: 0,
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);
    this.scheduleJob(job);

    logger.info(`Cron: Created job "${name}" (${schedule})`);

    return job;
  }

  /**
   * Schedule a job
   */
  private scheduleJob(job: CronJob): void {
    // Clear existing timer
    const existingTimer = this.timers.get(job.id);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    if (!job.enabled) return;

    // Parse schedule
    let intervalMs: number;

    if (SIMPLE_SCHEDULES[job.schedule]) {
      intervalMs = SIMPLE_SCHEDULES[job.schedule];
    } else if (job.schedule.startsWith('@every')) {
      // Parse @every format: @every30s, @every5m, @every1h
      const match = job.schedule.match(/@every(\d+)([smhd])/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        const multipliers: Record<string, number> = {
          s: 1000,
          m: 60 * 1000,
          h: 60 * 60 * 1000,
          d: 24 * 60 * 60 * 1000,
        };
        intervalMs = value * multipliers[unit];
      } else {
        logger.warn(`Cron: Invalid schedule "${job.schedule}"`);
        return;
      }
    } else {
      // For now, default to hourly for complex cron expressions
      logger.warn(`Cron: Complex expressions not fully supported, using hourly`);
      intervalMs = 60 * 60 * 1000;
    }

    // Calculate next run
    job.nextRun = new Date(Date.now() + intervalMs);

    // Create timer
    const timer = setInterval(() => this.runJob(job.id), intervalMs);
    this.timers.set(job.id, timer);
  }

  /**
   * Run a job
   */
  async runJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.enabled) return;

    logger.info(`Cron: Running job "${job.name}"`);

    try {
      job.lastRun = new Date();
      job.runCount++;

      // Execute the command through AI
      const session = sessionManager.getOrCreate('cron', 'system', job.id);
      
      // Add the command as a user message
      sessionManager.addMessage(session.id, 'user', job.command);
      
      const response = await aiService.chat({
        id: uuid(),
        content: job.command,
        author: { id: 'cron', name: 'Cron Job', isBot: true },
        channel: 'system',
        channelId: job.id,
        sessionId: session.id,
        timestamp: new Date(),
      });

      this.emit('job:completed', { job, response });
      eventBus.emitEvent('cron:executed', job.id, response);

    } catch (error: any) {
      logger.error(`Cron: Job "${job.name}" failed:`, error.message);
      this.emit('job:error', { job, error });
    }
  }

  /**
   * Enable/disable job
   */
  setJobEnabled(jobId: string, enabled: boolean): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = enabled;
      if (enabled) {
        this.scheduleJob(job);
      } else {
        const timer = this.timers.get(jobId);
        if (timer) {
          clearInterval(timer);
          this.timers.delete(jobId);
        }
      }
    }
  }

  /**
   * Delete job
   */
  deleteJob(jobId: string): boolean {
    const timer = this.timers.get(jobId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(jobId);
    }
    return this.jobs.delete(jobId);
  }

  /**
   * List all jobs
   */
  listJobs(): CronJob[] {
    return Array.from(this.jobs.values());
  }

  // ═══════════════════════════════════════════════════════════════
  // WEBHOOKS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a webhook
   */
  createWebhook(
    name: string,
    path: string,
    action: string,
    options: { method?: 'GET' | 'POST' | 'PUT'; secret?: string } = {}
  ): Webhook {
    const webhook: Webhook = {
      id: uuid(),
      name,
      path: path.startsWith('/') ? path : `/${path}`,
      action,
      method: options.method || 'POST',
      secret: options.secret,
      enabled: true,
      triggerCount: 0,
    };

    this.webhooks.set(webhook.id, webhook);
    this.registerWebhookRoute(webhook);

    logger.info(`Webhook: Created "${name}" at ${webhook.path}`);

    return webhook;
  }

  /**
   * Register webhook route
   */
  private registerWebhookRoute(webhook: Webhook): void {
    const handler = async (req: express.Request, res: express.Response) => {
      if (!webhook.enabled) {
        return res.status(503).json({ error: 'Webhook disabled' });
      }

      // Verify secret if set
      if (webhook.secret) {
        const providedSecret = 
          req.headers['x-webhook-secret'] || 
          req.query.secret;
        
        if (providedSecret !== webhook.secret) {
          return res.status(401).json({ error: 'Invalid secret' });
        }
      }

      webhook.lastTriggered = new Date();
      webhook.triggerCount++;

      logger.info(`Webhook: "${webhook.name}" triggered`);

      try {
        // Build context from request
        const context = {
          body: req.body,
          query: req.query,
          headers: req.headers,
        };

        // Execute action through AI
        const prompt = `${webhook.action}\n\nContext: ${JSON.stringify(context, null, 2)}`;
        
        const session = sessionManager.getOrCreate('webhook', 'system', webhook.id);
        
        const response = await aiService.chat({
          id: uuid(),
          content: prompt,
          author: { id: 'webhook', name: webhook.name, isBot: true },
          channel: 'system',
          channelId: webhook.id,
          sessionId: session.id,
          timestamp: new Date(),
        });

        this.emit('webhook:triggered', { webhook, context, response });

        res.json({ success: true, response });
      } catch (error: any) {
        logger.error(`Webhook: "${webhook.name}" error:`, error.message);
        res.status(500).json({ error: error.message });
      }
    };

    switch (webhook.method) {
      case 'GET':
        this.webhookRouter.get(webhook.path, handler);
        break;
      case 'PUT':
        this.webhookRouter.put(webhook.path, handler);
        break;
      default:
        this.webhookRouter.post(webhook.path, handler);
    }
  }

  /**
   * Setup default webhooks
   */
  private setupDefaultWebhooks(): void {
    // Health check
    this.webhookRouter.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        jobs: this.jobs.size,
        webhooks: this.webhooks.size,
      });
    });

    // List webhooks
    this.webhookRouter.get('/list', (req, res) => {
      res.json({
        webhooks: this.listWebhooks().map(w => ({
          id: w.id,
          name: w.name,
          path: w.path,
          method: w.method,
          enabled: w.enabled,
          triggerCount: w.triggerCount,
        })),
      });
    });
  }

  /**
   * Enable/disable webhook
   */
  setWebhookEnabled(webhookId: string, enabled: boolean): void {
    const webhook = this.webhooks.get(webhookId);
    if (webhook) {
      webhook.enabled = enabled;
    }
  }

  /**
   * Delete webhook
   */
  deleteWebhook(webhookId: string): boolean {
    // Note: Express doesn't support removing routes dynamically
    // The route will remain but return 503 when disabled
    const webhook = this.webhooks.get(webhookId);
    if (webhook) {
      webhook.enabled = false;
    }
    return this.webhooks.delete(webhookId);
  }

  /**
   * List all webhooks
   */
  listWebhooks(): Webhook[] {
    return Array.from(this.webhooks.values());
  }

  /**
   * Get the Express router for webhooks
   */
  getRouter(): express.Router {
    return this.webhookRouter;
  }

  // ═══════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════

  /**
   * Stop all jobs and cleanup
   */
  shutdown(): void {
    for (const [id, timer] of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();
    logger.info('Automation: Shutdown complete');
  }
}

export const automationManager = new AutomationManager();
