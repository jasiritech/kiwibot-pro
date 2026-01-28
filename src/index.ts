/**
 * 🥝 KiwiBot Pro - Main Entry Point
 * Advanced Personal AI Assistant with Gateway Architecture
 * BETTER than Clawdbot! 🔥
 */

import { Gateway } from './gateway/server.js';
import { sessionManager } from './sessions/manager.js';
import { aiService } from './ai/service.js';
import { channelRouter } from './channels/router.js';
import { skillManager } from './skills/manager.js';
import { webDashboard } from './web/dashboard.js';
import { logger } from './utils/logger.js';
import { eventBus } from './utils/events.js';
import { kiwiConfig, configManager } from './config/index.js';

// Channel implementations
import { DiscordChannel } from './channels/discord.js';
import { TelegramChannel } from './channels/telegram.js';
import { WhatsAppChannel } from './channels/whatsapp.js';

// Advanced features (like Moltbot!)
import { talkMode } from './voice/talk.js';
import { browserControl } from './tools/browser.js';
import { automationManager } from './automation/cron.js';
import { doctor } from './tools/doctor.js';
import { typingManager } from './utils/typing.js';
import { dmSecurity } from './security/dm.js';
import { modelFailover } from './ai/failover.js';
import { thinkManager } from './ai/think.js';
import { agentCollaboration } from './ai/agents.js';
import { workspacePersonality } from './personality/workspace.js';

class KiwiBotPro {
  private gateway: Gateway;
  private isShuttingDown = false;

  constructor() {
    this.gateway = new Gateway();
    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      logger.info(`\n🛑 Received ${signal}, shutting down gracefully...`);

      try {
        await this.stop();
        logger.info('✅ KiwiBot Pro stopped successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
    });
  }

  async start(): Promise<void> {
    this.printBanner();

    logger.info('🚀 Starting KiwiBot Pro...');

    // Initialize AI service
    logger.info('🤖 Initializing AI service...');
    const providers = await aiService.checkProviders();
    logger.info(`   Available providers: ${providers.join(', ') || 'none'}`);

    // Load skills
    logger.info('⚡ Loading skills...');
    const skills = skillManager.list();
    logger.info(`   Loaded ${skills.length} skills`);

    // Initialize channels
    logger.info('📡 Initializing channels...');
    await this.initializeChannels();

    // Start Gateway
    logger.info('🌐 Starting Gateway server...');
    await this.gateway.start();

    // Start Web Dashboard
    if (kiwiConfig.web.enabled) {
      logger.info('🖥️  Starting Web Dashboard...');
      await webDashboard.start();
    }

    // Setup event logging
    this.setupEventLogging();

    logger.info('');
    logger.info('═══════════════════════════════════════════');
    logger.info('  🥝 KiwiBot Pro is running!');
    logger.info('═══════════════════════════════════════════');
    logger.info(`  Gateway:   ws://localhost:${kiwiConfig.gateway.port}`);
    if (kiwiConfig.web.enabled) {
      logger.info(`  Dashboard: http://localhost:${kiwiConfig.web.port}`);
    }
    logger.info(`  Model:     ${kiwiConfig.ai.model}`);
    logger.info(`  Failover:  ${modelFailover.getCurrentProvider() || 'auto'}`);
    if (workspacePersonality.hasSoul()) {
      logger.info(`  Soul:      ${workspacePersonality.getName()}`);
    }
    logger.info('═══════════════════════════════════════════');
    logger.info('');
    logger.info('🔥 Advanced Features (Better than Clawdbot!):');
    logger.info('   • Voice/Talk Mode with STT/TTS');
    logger.info('   • Browser Control (Puppeteer)');
    logger.info('   • Cron Jobs & Webhooks');
    logger.info('   • Model Failover & Circuit Breaker');
    logger.info('   • DM Security & Pairing');
    logger.info('   • Think Levels (/think off|low|medium|high|max)');
    logger.info('   • Agent-to-Agent Collaboration');
    logger.info('   • SOUL.md & AGENTS.md Personality');
    logger.info('   • Doctor Diagnostics (kiwi doctor)');
    logger.info('');
  }

  private async initializeChannels(): Promise<void> {
    const channelConfigs = kiwiConfig.channels;

    // Discord
    if (channelConfigs.discord.enabled) {
      try {
        const discord = new DiscordChannel();
        await channelRouter.register('discord', discord);
        logger.info('   ✅ Discord channel registered');
      } catch (error) {
        logger.warn('   ⚠️  Discord channel failed:', error);
      }
    }

    // Telegram
    if (channelConfigs.telegram.enabled) {
      try {
        const telegram = new TelegramChannel();
        await channelRouter.register('telegram', telegram);
        logger.info('   ✅ Telegram channel registered');
      } catch (error) {
        logger.warn('   ⚠️  Telegram channel failed:', error);
      }
    }

    // WhatsApp
    if (channelConfigs.whatsapp.enabled) {
      try {
        const whatsapp = new WhatsAppChannel();
        await channelRouter.register('whatsapp', whatsapp);
        logger.info('   ✅ WhatsApp channel registered');
      } catch (error) {
        logger.warn('   ⚠️  WhatsApp channel failed:', error);
      }
    }
  }

  private setupEventLogging(): void {
    eventBus.onEvent('message:received', (msg) => {
      logger.debug(`📥 Message from ${msg.author.name} via ${msg.channel}`);
    });

    eventBus.onEvent('message:sent', (msg) => {
      logger.debug(`📤 Response sent via ${msg.channel}`);
    });

    eventBus.onEvent('session:created', (session) => {
      logger.debug(`📝 New session: ${session.id}`);
    });

    eventBus.onEvent('channel:connected', (channel) => {
      logger.info(`✅ Channel connected: ${channel}`);
    });

    eventBus.onEvent('channel:disconnected', (channel) => {
      logger.warn(`⚠️  Channel disconnected: ${channel}`);
    });

    eventBus.onEvent('skill:executed', ({ skill, result }) => {
      logger.debug(`⚡ Skill executed: ${skill} -> ${result.status}`);
    });
  }

  async stop(): Promise<void> {
    logger.info('Stopping services...');

    // Stop channels
    await channelRouter.stopAll();

    // Stop web dashboard
    if (kiwiConfig.web.enabled) {
      await webDashboard.stop();
    }

    // Stop gateway
    await this.gateway.stop();

    // Clear sessions
    sessionManager.clearAll();

    logger.info('All services stopped');
  }

  private printBanner(): void {
    console.log('');
    console.log('\x1b[32m╔═══════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[32m║\x1b[0m                                                           \x1b[32m║\x1b[0m');
    console.log('\x1b[32m║\x1b[0m   🥝  \x1b[1m\x1b[32mKIWIBOT PRO\x1b[0m                                        \x1b[32m║\x1b[0m');
    console.log('\x1b[32m║\x1b[0m   \x1b[90mAdvanced Personal AI Assistant\x1b[0m                         \x1b[32m║\x1b[0m');
    console.log('\x1b[32m║\x1b[0m   \x1b[90mv1.0.0 | Multi-Channel | Gateway Architecture\x1b[0m          \x1b[32m║\x1b[0m');
    console.log('\x1b[32m║\x1b[0m                                                           \x1b[32m║\x1b[0m');
    console.log('\x1b[32m╚═══════════════════════════════════════════════════════════╝\x1b[0m');
    console.log('');
  }
}

// Export for programmatic use
export const kiwiBotPro = new KiwiBotPro();

// CLI entry point
if (process.argv[1]?.includes('index')) {
  kiwiBotPro.start().catch((error) => {
    console.error('Failed to start KiwiBot Pro:', error?.message || error);
    if (error?.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}
