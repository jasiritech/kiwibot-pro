/**
 * 🥝 KiwiBot Pro - Logger
 * Structured logging with levels and formatting
 */

import chalk from 'chalk';
import { kiwiConfig } from '../config/index.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: unknown;
}

class Logger {
  private level: LogLevel;
  private context: string;
  private static levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private static colors: Record<LogLevel, (s: string) => string> = {
    debug: chalk.gray,
    info: chalk.blue,
    warn: chalk.yellow,
    error: chalk.red,
  };

  private static icons: Record<LogLevel, string> = {
    debug: '🔍',
    info: 'ℹ️ ',
    warn: '⚠️ ',
    error: '❌',
  };

  constructor(context = 'Kiwi') {
    this.level = kiwiConfig.logging.level;
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    return Logger.levels[level] >= Logger.levels[this.level];
  }

  private formatTimestamp(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
  }

  private formatMessage(entry: LogEntry): string {
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

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: this.context,
      data,
    };

    if (kiwiConfig.logging.json) {
      console.log(JSON.stringify(entry));
    } else {
      console.log(this.formatMessage(entry));
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }

  // Gateway-specific log methods
  gateway(message: string, data?: unknown): void {
    this.info(`[Gateway] ${message}`, data);
  }

  channel(type: string, message: string, data?: unknown): void {
    this.info(`[${type}] ${message}`, data);
  }

  agent(message: string, data?: unknown): void {
    this.info(`[Agent] ${message}`, data);
  }

  skill(name: string, message: string, data?: unknown): void {
    this.debug(`[Skill:${name}] ${message}`, data);
  }
}

export const logger = new Logger('Kiwi');
export { Logger };
