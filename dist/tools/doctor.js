/**
 * 🥝 KiwiBot Pro - Doctor Command
 * Diagnostics and health checking (like Moltbot's doctor)
 */
import { kiwiConfig } from '../config/index.js';
import { aiService } from '../ai/service.js';
import { channelRouter } from '../channels/router.js';
import { sessionManager } from '../sessions/manager.js';
import { gateway } from '../gateway/server.js';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
class Doctor {
    /**
     * Run full diagnostic check
     */
    async diagnose() {
        const checks = [];
        // Run all checks
        checks.push(await this.checkNodeVersion());
        checks.push(await this.checkEnvFile());
        checks.push(await this.checkAIProviders());
        checks.push(await this.checkGateway());
        checks.push(await this.checkChannels());
        checks.push(await this.checkDMPolicy());
        checks.push(await this.checkDiskSpace());
        checks.push(await this.checkMemory());
        checks.push(await this.checkSessions());
        checks.push(await this.checkConfig());
        // Calculate summary
        const summary = {
            passed: checks.filter(c => c.status === 'pass').length,
            warnings: checks.filter(c => c.status === 'warn').length,
            failed: checks.filter(c => c.status === 'fail').length,
        };
        return {
            timestamp: new Date(),
            version: '2026.1.28',
            system: this.getSystemInfo(),
            checks,
            summary,
        };
    }
    /**
     * Get system information
     */
    getSystemInfo() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        return {
            os: os.platform(),
            osVersion: os.release(),
            nodeVersion: process.version,
            architecture: os.arch(),
            cpus: os.cpus().length,
            memory: {
                total: this.formatBytes(totalMem),
                free: this.formatBytes(freeMem),
                used: this.formatBytes(usedMem),
            },
            uptime: this.formatUptime(os.uptime()),
        };
    }
    /**
     * Check Node.js version
     */
    async checkNodeVersion() {
        const version = process.version;
        const major = parseInt(version.slice(1).split('.')[0]);
        if (major >= 22) {
            return {
                name: 'Node.js Version',
                status: 'pass',
                message: `Node.js ${version} ✓`,
            };
        }
        else if (major >= 20) {
            return {
                name: 'Node.js Version',
                status: 'warn',
                message: `Node.js ${version} - Recommend v22+`,
            };
        }
        else {
            return {
                name: 'Node.js Version',
                status: 'fail',
                message: `Node.js ${version} - Requires v22+`,
            };
        }
    }
    /**
     * Check .env file
     */
    async checkEnvFile() {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            return {
                name: 'Environment File',
                status: 'pass',
                message: '.env file found',
            };
        }
        else {
            return {
                name: 'Environment File',
                status: 'warn',
                message: '.env file not found - using defaults',
            };
        }
    }
    /**
     * Check AI providers
     */
    async checkAIProviders() {
        const providers = await aiService.checkProviders();
        if (providers.length === 0) {
            return {
                name: 'AI Providers',
                status: 'fail',
                message: 'No AI providers configured - add API keys',
                details: { configured: [] },
            };
        }
        else if (providers.length === 1) {
            return {
                name: 'AI Providers',
                status: 'warn',
                message: `Only ${providers[0]} configured - recommend adding backup`,
                details: { configured: providers },
            };
        }
        else {
            return {
                name: 'AI Providers',
                status: 'pass',
                message: `${providers.length} providers: ${providers.join(', ')}`,
                details: { configured: providers },
            };
        }
    }
    /**
     * Check gateway status
     */
    async checkGateway() {
        try {
            const clients = gateway.getClientCount();
            return {
                name: 'Gateway',
                status: 'pass',
                message: `Running on port ${kiwiConfig.gateway.port} (${clients} clients)`,
                details: { port: kiwiConfig.gateway.port, clients },
            };
        }
        catch {
            return {
                name: 'Gateway',
                status: 'warn',
                message: 'Gateway not running',
            };
        }
    }
    /**
     * Check channels
     */
    async checkChannels() {
        const status = channelRouter.getStatus();
        const channels = Object.entries(status);
        const connected = channels.filter(([_, s]) => s === 'connected').length;
        const configured = channels.filter(([_, s]) => s !== 'disconnected').length;
        if (connected === 0 && configured > 0) {
            return {
                name: 'Channels',
                status: 'warn',
                message: `${configured} configured, none connected`,
                details: status,
            };
        }
        else if (connected > 0) {
            return {
                name: 'Channels',
                status: 'pass',
                message: `${connected}/${configured} channels connected`,
                details: status,
            };
        }
        else {
            return {
                name: 'Channels',
                status: 'warn',
                message: 'No channels configured',
                details: status,
            };
        }
    }
    /**
     * Check DM policy (security)
     */
    async checkDMPolicy() {
        const channels = kiwiConfig.channels;
        const issues = [];
        // Check each channel's security
        if (channels.discord.enabled && !process.env.DISCORD_ALLOWLIST) {
            issues.push('Discord: No allowlist configured');
        }
        if (channels.telegram.enabled && !process.env.TELEGRAM_ALLOWLIST) {
            issues.push('Telegram: No allowlist configured');
        }
        if (channels.whatsapp.enabled && !process.env.WHATSAPP_ALLOWLIST) {
            issues.push('WhatsApp: No allowlist configured');
        }
        if (issues.length === 0) {
            return {
                name: 'DM Security',
                status: 'pass',
                message: 'DM policies configured',
            };
        }
        else {
            return {
                name: 'DM Security',
                status: 'warn',
                message: `${issues.length} channel(s) without allowlist`,
                details: { issues },
            };
        }
    }
    /**
     * Check disk space
     */
    async checkDiskSpace() {
        // Simple check for low disk warning
        try {
            const stats = fs.statfsSync(process.cwd());
            const freeBytes = stats.bfree * stats.bsize;
            const totalBytes = stats.blocks * stats.bsize;
            const freePercent = (freeBytes / totalBytes) * 100;
            if (freePercent < 5) {
                return {
                    name: 'Disk Space',
                    status: 'fail',
                    message: `Critical: ${freePercent.toFixed(1)}% free`,
                    details: { free: this.formatBytes(freeBytes) },
                };
            }
            else if (freePercent < 20) {
                return {
                    name: 'Disk Space',
                    status: 'warn',
                    message: `Low: ${freePercent.toFixed(1)}% free`,
                    details: { free: this.formatBytes(freeBytes) },
                };
            }
            else {
                return {
                    name: 'Disk Space',
                    status: 'pass',
                    message: `${freePercent.toFixed(1)}% free (${this.formatBytes(freeBytes)})`,
                };
            }
        }
        catch {
            return {
                name: 'Disk Space',
                status: 'warn',
                message: 'Could not check disk space',
            };
        }
    }
    /**
     * Check memory usage
     */
    async checkMemory() {
        const usage = process.memoryUsage();
        const heapUsed = usage.heapUsed;
        const heapTotal = usage.heapTotal;
        const heapPercent = (heapUsed / heapTotal) * 100;
        if (heapPercent > 90) {
            return {
                name: 'Memory',
                status: 'fail',
                message: `Critical: ${heapPercent.toFixed(1)}% heap used`,
                details: { used: this.formatBytes(heapUsed), total: this.formatBytes(heapTotal) },
            };
        }
        else if (heapPercent > 70) {
            return {
                name: 'Memory',
                status: 'warn',
                message: `High: ${heapPercent.toFixed(1)}% heap used`,
                details: { used: this.formatBytes(heapUsed), total: this.formatBytes(heapTotal) },
            };
        }
        else {
            return {
                name: 'Memory',
                status: 'pass',
                message: `${this.formatBytes(heapUsed)} / ${this.formatBytes(heapTotal)} heap`,
            };
        }
    }
    /**
     * Check sessions
     */
    async checkSessions() {
        const count = sessionManager.count();
        const sessions = sessionManager.list();
        // Count sessions with high message counts
        const largeSessions = sessions.filter(s => (s.messageCount || s.messages?.length || 0) > 100).length;
        if (largeSessions > 0) {
            return {
                name: 'Sessions',
                status: 'warn',
                message: `${count} sessions (${largeSessions} need compaction)`,
                details: { count, largeSessions },
            };
        }
        else {
            return {
                name: 'Sessions',
                status: 'pass',
                message: `${count} active sessions`,
                details: { count },
            };
        }
    }
    /**
     * Check config validity
     */
    async checkConfig() {
        const issues = [];
        // Check required config
        if (!kiwiConfig.gateway.port) {
            issues.push('Gateway port not configured');
        }
        if (issues.length === 0) {
            return {
                name: 'Configuration',
                status: 'pass',
                message: 'Config valid',
            };
        }
        else {
            return {
                name: 'Configuration',
                status: 'fail',
                message: `${issues.length} config issue(s)`,
                details: { issues },
            };
        }
    }
    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let unitIndex = 0;
        let value = bytes;
        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex++;
        }
        return `${value.toFixed(1)} ${units[unitIndex]}`;
    }
    /**
     * Format uptime to human readable
     */
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const parts = [];
        if (days > 0)
            parts.push(`${days}d`);
        if (hours > 0)
            parts.push(`${hours}h`);
        if (minutes > 0)
            parts.push(`${minutes}m`);
        return parts.join(' ') || '< 1m';
    }
    /**
     * Print report to console
     */
    printReport(report) {
        console.log('\n🥝 KiwiBot Pro Doctor\n');
        console.log('═══════════════════════════════════════════\n');
        // System info
        console.log('📊 System Information:');
        console.log(`   OS: ${report.system.os} ${report.system.osVersion}`);
        console.log(`   Node: ${report.system.nodeVersion}`);
        console.log(`   Arch: ${report.system.architecture}`);
        console.log(`   CPUs: ${report.system.cpus}`);
        console.log(`   Memory: ${report.system.memory.used} / ${report.system.memory.total}`);
        console.log(`   Uptime: ${report.system.uptime}`);
        console.log('');
        // Checks
        console.log('🔍 Diagnostic Checks:\n');
        for (const check of report.checks) {
            const icon = check.status === 'pass' ? '✅' :
                check.status === 'warn' ? '⚠️' : '❌';
            console.log(`   ${icon} ${check.name}: ${check.message}`);
        }
        console.log('');
        // Summary
        console.log('═══════════════════════════════════════════');
        console.log(`Summary: ✅ ${report.summary.passed} passed | ⚠️ ${report.summary.warnings} warnings | ❌ ${report.summary.failed} failed`);
        console.log('═══════════════════════════════════════════\n');
    }
}
export const doctor = new Doctor();
//# sourceMappingURL=doctor.js.map