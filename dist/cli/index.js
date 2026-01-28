#!/usr/bin/env node
/**
 * 🥝 KiwiBot Pro - CLI Interface
 * Command-line interface like `moltbot` CLI
 */
import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import ora from 'ora';
import inquirer from 'inquirer';
import { gateway } from '../gateway/server.js';
import { kiwiConfig, configManager } from '../config/index.js';
import { sessionManager } from '../sessions/manager.js';
import { aiService } from '../ai/service.js';
import { skillManager } from '../skills/manager.js';
import { channelRouter, discordChannel, telegramChannel, whatsappChannel } from '../channels/index.js';
const program = new Command();
// Banner
function showBanner() {
    const banner = figlet.textSync('KiwiBot Pro', { font: 'Small' });
    console.log(gradient.pastel.multiline(banner));
    console.log(chalk.gray('  Personal AI Assistant with Gateway Architecture'));
    console.log(chalk.gray(`  Version: 2026.1.28\n`));
}
// Gateway command
program
    .command('gateway')
    .description('Start the KiwiBot Gateway server')
    .option('-p, --port <port>', 'Port to listen on', '18789')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('--force', 'Force start (kill existing processes)')
    .action(async (options) => {
    showBanner();
    const spinner = ora('Starting Gateway...').start();
    try {
        // Update config if port specified
        if (options.port) {
            configManager.set('gateway.port', parseInt(options.port));
        }
        // Register channels
        if (kiwiConfig.channels.discord?.enabled) {
            channelRouter.register(discordChannel);
        }
        if (kiwiConfig.channels.telegram?.enabled) {
            channelRouter.register(telegramChannel);
        }
        if (kiwiConfig.channels.whatsapp?.enabled) {
            channelRouter.register(whatsappChannel);
        }
        // Start gateway
        await gateway.start();
        spinner.succeed(chalk.green('Gateway started'));
        // Start channels
        const channelSpinner = ora('Connecting channels...').start();
        await channelRouter.startAll();
        channelSpinner.succeed(chalk.green('Channels connected'));
        console.log('\n' + chalk.cyan('━'.repeat(50)));
        console.log(chalk.bold('  Gateway Info:'));
        console.log(`  • WebSocket: ws://${kiwiConfig.gateway.host}:${kiwiConfig.gateway.port}`);
        console.log(`  • Health: http://${kiwiConfig.gateway.host}:${kiwiConfig.gateway.port}/health`);
        console.log(chalk.cyan('━'.repeat(50)));
        console.log(chalk.gray('\n  Press Ctrl+C to stop\n'));
        // Handle shutdown
        const shutdown = async () => {
            console.log(chalk.yellow('\n  Shutting down...'));
            await channelRouter.stopAll();
            await gateway.stop();
            console.log(chalk.green('  Goodbye! 🥝\n'));
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
    catch (error) {
        spinner.fail(chalk.red(`Failed: ${error.message}`));
        process.exit(1);
    }
});
// Status command
program
    .command('status')
    .description('Check Gateway status')
    .action(async () => {
    const spinner = ora('Checking status...').start();
    try {
        const response = await fetch(`http://${kiwiConfig.gateway.host}:${kiwiConfig.gateway.port}/status`);
        const status = await response.json();
        spinner.stop();
        console.log(chalk.bold('\n🥝 KiwiBot Pro Status\n'));
        console.log(`  Gateway: ${chalk.green('Running')}`);
        console.log(`  Port: ${status.port}`);
        console.log(`  Clients: ${status.clients}`);
        console.log(`  Uptime: ${Math.floor(status.uptime / 1000)}s`);
        console.log(`  Messages: ${status.stats?.messagesReceived || 0} received, ${status.stats?.messagesSent || 0} sent`);
        console.log();
    }
    catch (error) {
        spinner.fail(chalk.red('Gateway not running'));
    }
});
// Health command
program
    .command('health')
    .description('Check Gateway health')
    .action(async () => {
    try {
        const response = await fetch(`http://${kiwiConfig.gateway.host}:${kiwiConfig.gateway.port}/health`);
        const health = await response.json();
        console.log(chalk.bold('\n🥝 KiwiBot Pro Health\n'));
        console.log(`  Status: ${chalk.green(health.status)}`);
        console.log(`  Version: ${health.version}`);
        console.log(`  Clients: ${health.clients}`);
        console.log(`  Channels:`);
        for (const [channel, status] of Object.entries(health.channels || {})) {
            const icon = status === 'connected' ? '✅' : status === 'configured' ? '⚙️' : '❌';
            console.log(`    ${icon} ${channel}: ${status}`);
        }
        console.log();
    }
    catch (error) {
        console.log(chalk.red('\n  Gateway not running\n'));
    }
});
// Agent command (send message to AI)
program
    .command('agent')
    .description('Send a message to the AI agent')
    .option('-m, --message <message>', 'Message to send')
    .option('--model <model>', 'AI model to use')
    .action(async (options) => {
    let message = options.message;
    if (!message) {
        const answers = await inquirer.prompt([{
                type: 'input',
                name: 'message',
                message: 'Enter your message:',
            }]);
        message = answers.message;
    }
    const spinner = ora('Thinking...').start();
    try {
        const msg = {
            id: Date.now().toString(),
            content: message,
            author: { id: 'cli', name: 'CLI User', isBot: false },
            channel: 'cli',
            channelId: 'cli',
            sessionId: 'cli:cli:cli',
            timestamp: new Date(),
        };
        const response = await aiService.chat(msg);
        spinner.stop();
        console.log(chalk.bold('\n🥝 Response:\n'));
        console.log(response);
        console.log();
    }
    catch (error) {
        spinner.fail(chalk.red(error.message));
    }
});
// Sessions command
program
    .command('sessions')
    .description('List active sessions')
    .action(() => {
    const sessions = sessionManager.list();
    console.log(chalk.bold(`\n🥝 Active Sessions (${sessions.length})\n`));
    if (sessions.length === 0) {
        console.log(chalk.gray('  No active sessions\n'));
        return;
    }
    for (const session of sessions) {
        console.log(`  ${chalk.cyan(session.id)}`);
        console.log(`    Channel: ${session.channel}`);
        console.log(`    Messages: ${session.messages.length}`);
        console.log(`    Last Activity: ${session.lastActivity.toLocaleString()}`);
        console.log();
    }
});
// Skills command
program
    .command('skills')
    .description('List available skills')
    .action(() => {
    const skills = skillManager.list();
    console.log(chalk.bold(`\n🥝 Available Skills (${skills.length})\n`));
    for (const skill of skills) {
        const triggers = skill.triggers
            .filter(t => t.type === 'command')
            .map(t => `/${t.pattern}`)
            .join(', ');
        console.log(`  ${chalk.cyan(skill.name)} v${skill.version}`);
        console.log(`    ${skill.description}`);
        if (triggers)
            console.log(`    Commands: ${triggers}`);
        console.log();
    }
});
// Config command
program
    .command('config')
    .description('Show current configuration')
    .action(() => {
    console.log(chalk.bold('\n🥝 Configuration\n'));
    console.log(chalk.gray(JSON.stringify(kiwiConfig, null, 2)));
    console.log();
});
// Setup/Onboard command
program
    .command('setup')
    .alias('onboard')
    .description('Interactive setup wizard')
    .action(async () => {
    showBanner();
    console.log(chalk.cyan('  Welcome to KiwiBot Pro Setup!\n'));
    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'aiProvider',
            message: 'Choose your AI provider:',
            choices: [
                { name: 'OpenAI (GPT-4o)', value: 'openai' },
                { name: 'Anthropic (Claude)', value: 'anthropic' },
                { name: 'Both', value: 'both' },
            ],
        },
        {
            type: 'input',
            name: 'openaiKey',
            message: 'Enter your OpenAI API key:',
            when: (a) => a.aiProvider === 'openai' || a.aiProvider === 'both',
        },
        {
            type: 'input',
            name: 'anthropicKey',
            message: 'Enter your Anthropic API key:',
            when: (a) => a.aiProvider === 'anthropic' || a.aiProvider === 'both',
        },
        {
            type: 'checkbox',
            name: 'channels',
            message: 'Select channels to enable:',
            choices: [
                { name: 'Discord', value: 'discord' },
                { name: 'Telegram', value: 'telegram' },
                { name: 'WhatsApp', value: 'whatsapp' },
            ],
        },
        {
            type: 'input',
            name: 'discordToken',
            message: 'Enter your Discord bot token:',
            when: (a) => a.channels.includes('discord'),
        },
        {
            type: 'input',
            name: 'telegramToken',
            message: 'Enter your Telegram bot token:',
            when: (a) => a.channels.includes('telegram'),
        },
    ]);
    console.log(chalk.green('\n  ✅ Setup complete!\n'));
    console.log(chalk.gray('  Add these to your .env file:\n'));
    if (answers.openaiKey) {
        console.log(`  OPENAI_API_KEY=${answers.openaiKey}`);
    }
    if (answers.anthropicKey) {
        console.log(`  ANTHROPIC_API_KEY=${answers.anthropicKey}`);
    }
    if (answers.discordToken) {
        console.log(`  DISCORD_ENABLED=true`);
        console.log(`  DISCORD_TOKEN=${answers.discordToken}`);
    }
    if (answers.telegramToken) {
        console.log(`  TELEGRAM_ENABLED=true`);
        console.log(`  TELEGRAM_TOKEN=${answers.telegramToken}`);
    }
    if (answers.channels.includes('whatsapp')) {
        console.log(`  WHATSAPP_ENABLED=true`);
    }
    console.log(chalk.cyan('\n  Then run: kiwi gateway\n'));
});
// Version
program.version('2026.1.28', '-V, --version');
// Default action - show help
program
    .name('kiwi')
    .description('🥝 KiwiBot Pro - Personal AI Assistant')
    .action(() => {
    showBanner();
    program.help();
});
program.parse();
//# sourceMappingURL=index.js.map