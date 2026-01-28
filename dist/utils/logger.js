/**
 * 🥝 KiwiBot Pro - Logger
 * Structured logging with levels and formatting
 */
import chalk from 'chalk';
import { kiwiConfig } from '../config/index.js';
class Logger {
    level;
    context;
    static levels = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
    };
    static colors = {
        debug: chalk.gray,
        info: chalk.blue,
        warn: chalk.yellow,
        error: chalk.red,
    };
    static icons = {
        debug: '🔍',
        info: 'ℹ️ ',
        warn: '⚠️ ',
        error: '❌',
    };
    constructor(context = 'Kiwi') {
        this.level = kiwiConfig.logging.level;
        this.context = context;
    }
    shouldLog(level) {
        return Logger.levels[level] >= Logger.levels[this.level];
    }
    formatTimestamp() {
        return new Date().toISOString().replace('T', ' ').slice(0, 19);
    }
    formatMessage(entry) {
        const timestamp = chalk.gray(this.formatTimestamp());
        const icon = Logger.icons[entry.level];
        const levelStr = Logger.colors[entry.level](entry.level.toUpperCase().padEnd(5));
        const context = chalk.cyan(`[${entry.context}]`);
        let msg = `${timestamp} ${icon} ${levelStr} ${context} ${entry.message}`;
        if (entry.data) {
            msg += '\n' + chalk.gray(JSON.stringify(entry.data, null, 2));
        }
        return msg;
    }
    log(level, message, data) {
        if (!this.shouldLog(level))
            return;
        const entry = {
            level,
            message,
            timestamp: new Date(),
            context: this.context,
            data,
        };
        if (kiwiConfig.logging.json) {
            console.log(JSON.stringify(entry));
        }
        else {
            console.log(this.formatMessage(entry));
        }
    }
    debug(message, data) {
        this.log('debug', message, data);
    }
    info(message, data) {
        this.log('info', message, data);
    }
    warn(message, data) {
        this.log('warn', message, data);
    }
    error(message, data) {
        this.log('error', message, data);
    }
    child(context) {
        return new Logger(`${this.context}:${context}`);
    }
    // Gateway-specific log methods
    gateway(message, data) {
        this.info(`[Gateway] ${message}`, data);
    }
    channel(type, message, data) {
        this.info(`[${type}] ${message}`, data);
    }
    agent(message, data) {
        this.info(`[Agent] ${message}`, data);
    }
    skill(name, message, data) {
        this.debug(`[Skill:${name}] ${message}`, data);
    }
}
export const logger = new Logger('Kiwi');
export { Logger };
//# sourceMappingURL=logger.js.map