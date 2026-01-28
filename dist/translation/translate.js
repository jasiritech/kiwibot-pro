/**
 * 🥝 KiwiBot Pro - Translation Service
 * Multi-language translation with Kiswahili support (UNIQUE!)
 */
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';
// Common language codes
const LANGUAGE_NAMES = {
    en: 'English',
    sw: 'Kiswahili',
    fr: 'French',
    es: 'Spanish',
    de: 'German',
    pt: 'Portuguese',
    ar: 'Arabic',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    hi: 'Hindi',
    ru: 'Russian',
    it: 'Italian',
    nl: 'Dutch',
    pl: 'Polish',
    tr: 'Turkish',
    th: 'Thai',
    vi: 'Vietnamese',
    id: 'Indonesian',
    ms: 'Malay',
    tl: 'Tagalog',
    am: 'Amharic',
    ha: 'Hausa',
    yo: 'Yoruba',
    zu: 'Zulu',
    xh: 'Xhosa',
    lg: 'Luganda',
    rw: 'Kinyarwanda',
    ny: 'Chichewa',
};
// Kiswahili sheng/slang translations
const KISWAHILI_SLANG = {
    'sawa': 'okay',
    'poa': 'cool/fine',
    'fiti': 'fine',
    'safi': 'clean/great',
    'buda': 'dude/guy',
    'maze': 'man/dude',
    'niaje': 'what\'s up',
    'mambo': 'how are you',
    'vipi': 'how',
    'uko fiti': 'you\'re fine',
    'hakuna matata': 'no worries',
    'pole': 'sorry',
    'asante': 'thank you',
    'tafadhali': 'please',
    'karibu': 'welcome',
    'kwaheri': 'goodbye',
    'habari': 'news/how are you',
    'nzuri': 'good/fine',
    'mbaya': 'bad',
    'sana': 'very',
    'kidogo': 'a little',
};
class TranslationService {
    openai;
    anthropic;
    constructor() {
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
        if (process.env.ANTHROPIC_API_KEY) {
            this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        }
    }
    /**
     * Translate text between languages
     */
    async translate(text, targetLanguage, sourceLanguage) {
        const detected = sourceLanguage || await this.detectLanguage(text);
        const targetName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
        const sourceName = LANGUAGE_NAMES[detected] || detected;
        const prompt = `Translate the following text from ${sourceName} to ${targetName}. 
Only return the translation, nothing else.

Text: ${text}`;
        try {
            let translated;
            if (this.anthropic) {
                const response = await this.anthropic.messages.create({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: prompt }],
                });
                translated = response.content[0].type === 'text' ? response.content[0].text : '';
            }
            else if (this.openai) {
                const response = await this.openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 1024,
                });
                translated = response.choices[0].message.content || '';
            }
            else {
                throw new Error('No translation provider available');
            }
            return {
                original: text,
                translated: translated.trim(),
                sourceLanguage: detected,
                targetLanguage,
                confidence: 0.95,
            };
        }
        catch (error) {
            logger.error(`Translation: Failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Detect language of text
     */
    async detectLanguage(text) {
        // Quick check for Kiswahili
        const swahiliWords = ['na', 'ya', 'wa', 'ni', 'kwa', 'la', 'za', 'au', 'ili', 'hii'];
        const words = text.toLowerCase().split(/\s+/);
        const swahiliCount = words.filter(w => swahiliWords.includes(w)).length;
        if (swahiliCount > words.length * 0.2) {
            return 'sw';
        }
        // Check for slang
        for (const slang of Object.keys(KISWAHILI_SLANG)) {
            if (text.toLowerCase().includes(slang)) {
                return 'sw';
            }
        }
        // Use AI for detection
        const prompt = `Detect the language of this text and return only the 2-letter ISO language code (e.g., en, sw, fr, es):

"${text}"`;
        try {
            let code;
            if (this.anthropic) {
                const response = await this.anthropic.messages.create({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 10,
                    messages: [{ role: 'user', content: prompt }],
                });
                code = response.content[0].type === 'text' ? response.content[0].text : 'en';
            }
            else if (this.openai) {
                const response = await this.openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 10,
                });
                code = response.choices[0].message.content || 'en';
            }
            else {
                return 'en';
            }
            return code.trim().toLowerCase().slice(0, 2);
        }
        catch {
            return 'en';
        }
    }
    /**
     * Translate Kiswahili slang/sheng
     */
    translateSlang(text) {
        let result = text;
        for (const [slang, meaning] of Object.entries(KISWAHILI_SLANG)) {
            const regex = new RegExp(`\\b${slang}\\b`, 'gi');
            result = result.replace(regex, `${slang} (${meaning})`);
        }
        return result;
    }
    /**
     * Get supported languages
     */
    getSupportedLanguages() {
        return Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({ code, name }));
    }
    /**
     * Translate and respond in user's language
     */
    async respondInLanguage(userMessage, response, targetLanguage) {
        if (!targetLanguage) {
            targetLanguage = await this.detectLanguage(userMessage);
        }
        // Don't translate if already in target language or English
        const responseLanguage = await this.detectLanguage(response);
        if (responseLanguage === targetLanguage) {
            return response;
        }
        const translated = await this.translate(response, targetLanguage);
        return translated.translated;
    }
    /**
     * Multi-language greeting
     */
    getGreeting(language) {
        const greetings = {
            en: 'Hello! How can I help you today?',
            sw: 'Habari! Naweza kukusaidia vipi leo?',
            fr: 'Bonjour! Comment puis-je vous aider aujourd\'hui?',
            es: '¡Hola! ¿Cómo puedo ayudarte hoy?',
            de: 'Hallo! Wie kann ich Ihnen heute helfen?',
            ar: 'مرحبا! كيف يمكنني مساعدتك اليوم؟',
            zh: '你好！今天我能帮你什么？',
            ja: 'こんにちは！今日はどのようにお手伝いできますか？',
            pt: 'Olá! Como posso ajudá-lo hoje?',
            ru: 'Привет! Как я могу помочь вам сегодня?',
        };
        return greetings[language] || greetings.en;
    }
    /**
     * Get tools for AI consumption
     */
    getTools() {
        return [
            {
                name: 'translate_text',
                description: 'Translate text between any languages, with special support for Kiswahili and Sheng (slang).',
                parameters: {
                    type: 'object',
                    properties: {
                        text: { type: 'string', description: 'The text to translate' },
                        targetLanguage: { type: 'string', description: 'The 2-letter target language code (e.g., sw, fr, es)' },
                        sourceLanguage: { type: 'string', description: 'Optional source language code' },
                        includeSlang: { type: 'boolean', description: 'Whether to preserve/explain slang terms' }
                    },
                    required: ['text', 'targetLanguage']
                },
                execute: async (params) => this.translate(params.text, params.targetLanguage, params.sourceLanguage)
            }
        ];
    }
}
export const translationService = new TranslationService();
//# sourceMappingURL=translate.js.map