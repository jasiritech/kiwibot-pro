/**
 * 🥝 KiwiBot Pro - Configuration Manager
 * Hot-reloadable configuration system
 */
import { config } from 'dotenv';
import { existsSync, readFileSync, watchFile } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load .env
config();
class ConfigManager extends EventEmitter {
    config;
    configPath;
    watchEnabled = false;
    constructor() {
        super();
        this.configPath = process.env.KIWI_CONFIG_PATH || join(__dirname, '../../kiwi.config.json');
        this.config = this.loadConfig();
    }
    getDefaultConfig() {
        return {
            gateway: {
                port: parseInt(process.env.KIWI_GATEWAY_PORT || '18789'),
                host: process.env.KIWI_GATEWAY_HOST || '127.0.0.1',
                auth: {
                    enabled: process.env.KIWI_GATEWAY_TOKEN ? true : false,
                    token: process.env.KIWI_GATEWAY_TOKEN,
                    password: process.env.KIWI_GATEWAY_PASSWORD,
                },
            },
            ai: {
                defaultModel: process.env.AI_MODEL || 'gpt-4o',
                defaultTemperature: 0.7,
                maxTokens: 4096,
                providers: {
                    openai: process.env.OPENAI_API_KEY
                        ? { apiKey: process.env.OPENAI_API_KEY }
                        : undefined,
                    anthropic: process.env.ANTHROPIC_API_KEY
                        ? { apiKey: process.env.ANTHROPIC_API_KEY }
                        : undefined,
                    google: process.env.GEMINI_API_KEY
                        ? { apiKey: process.env.GEMINI_API_KEY }
                        : undefined,
                },
                systemPrompt: this.getDefaultSystemPrompt(),
            },
            channels: {
                discord: {
                    enabled: process.env.DISCORD_ENABLED === 'true',
                    token: process.env.DISCORD_TOKEN,
                },
                telegram: {
                    enabled: process.env.TELEGRAM_ENABLED === 'true',
                    token: process.env.TELEGRAM_TOKEN,
                },
                whatsapp: {
                    enabled: process.env.WHATSAPP_ENABLED === 'true',
                },
                slack: {
                    enabled: process.env.SLACK_ENABLED === 'true',
                    botToken: process.env.SLACK_BOT_TOKEN,
                    appToken: process.env.SLACK_APP_TOKEN,
                },
            },
            skills: {
                enabled: true,
                directory: process.env.KIWI_SKILLS_DIR || './skills',
                autoload: true,
            },
            web: {
                enabled: true,
                port: parseInt(process.env.KIWI_WEB_PORT || '3000'),
                staticDir: './public',
            },
            logging: {
                level: process.env.LOG_LEVEL || 'info',
                file: process.env.LOG_FILE,
                json: process.env.LOG_JSON === 'true',
            },
        };
    }
    getDefaultSystemPrompt() {
        return `Wewe ni Kiwi, AI assistant wa kibinafsi ambaye ni smart, friendly, na msaidizi.

UWEZO WAKO:
• Kujibu maswali kwa lugha yoyote (Kiswahili, English, etc.)
• Kusaidia na programming na coding
• Kutoa ushauri na mawazo
• Kufanya calculations na analysis
• Kutafsiri lugha
• Kusaidia na tasks mbalimbali

TABIA YAKO:
• Kuwa friendly lakini professional
• Jibu kwa ufupi na kwa uwazi
• Kama hujui kitu, sema hivyo kwa uaminifu
• Tumia emoji kufanya mazungumzo yawe ya kupendeza
• Respect privacy ya mtumiaji

MUHIMU:
• Jibu kwa lugha ambayo mtumiaji anatumia
• Kama mtumiaji anauliza Kiswahili, jibu Kiswahili
• Kama mtumiaji anauliza English, jibu English`;
    }
    loadConfig() {
        const defaults = this.getDefaultConfig();
        // Try to load config file
        if (existsSync(this.configPath)) {
            try {
                const fileContent = readFileSync(this.configPath, 'utf-8');
                const fileConfig = JSON.parse(fileContent);
                return this.mergeConfig(defaults, fileConfig);
            }
            catch (error) {
                console.warn(`⚠️  Failed to load config file: ${error}`);
            }
        }
        return defaults;
    }
    mergeConfig(defaults, overrides) {
        return {
            gateway: { ...defaults.gateway, ...overrides.gateway },
            ai: {
                ...defaults.ai,
                ...overrides.ai,
                providers: { ...defaults.ai.providers, ...overrides.ai?.providers },
            },
            channels: { ...defaults.channels, ...overrides.channels },
            skills: { ...defaults.skills, ...overrides.skills },
            web: { ...defaults.web, ...overrides.web },
            logging: { ...defaults.logging, ...overrides.logging },
        };
    }
    enableWatch() {
        if (this.watchEnabled || !existsSync(this.configPath))
            return;
        watchFile(this.configPath, { interval: 1000 }, () => {
            console.log('🔄 Config file changed, reloading...');
            const oldConfig = this.config;
            this.config = this.loadConfig();
            this.emit('reload', { old: oldConfig, new: this.config });
        });
        this.watchEnabled = true;
    }
    get() {
        return this.config;
    }
    getGateway() {
        return this.config.gateway;
    }
    getAI() {
        return this.config.ai;
    }
    getChannels() {
        return this.config.channels;
    }
    set(path, value) {
        const parts = path.split('.');
        let current = this.config;
        for (let i = 0; i < parts.length - 1; i++) {
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
        this.emit('change', { path, value });
    }
}
export const configManager = new ConfigManager();
export const kiwiConfig = configManager.get();
//# sourceMappingURL=index.js.map