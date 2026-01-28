/**
 * 🥝 KiwiBot Pro - Voice/Talk Mode
 * Speech-to-Text and Text-to-Speech support
 * Inspired by Moltbot's Voice Wake + Talk Mode
 */
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { kiwiConfig } from '../config/index.js';
import OpenAI from 'openai';
class TalkMode extends EventEmitter {
    openai;
    config;
    isListening = false;
    wakeWordActive = false;
    constructor() {
        super();
        this.config = {
            enabled: process.env.VOICE_ENABLED === 'true',
            provider: process.env.VOICE_PROVIDER || 'openai',
            ttsVoice: process.env.TTS_VOICE || 'alloy',
            sttModel: process.env.STT_MODEL || 'whisper-1',
            wakeWord: process.env.WAKE_WORD || 'hey kiwi',
            language: process.env.VOICE_LANGUAGE || 'sw', // Kiswahili
        };
        if (this.config.enabled) {
            this.initProviders();
        }
    }
    initProviders() {
        const apiKey = kiwiConfig.ai.providers.openai?.apiKey;
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
            logger.info('Voice: OpenAI Whisper + TTS initialized');
        }
    }
    /**
     * Transcribe audio to text (Speech-to-Text)
     */
    async transcribe(audioBuffer, format = 'webm') {
        if (!this.openai) {
            throw new Error('OpenAI not configured for voice');
        }
        const startTime = Date.now();
        try {
            // Create a File-like object for the API
            const file = await OpenAI.toFile(audioBuffer, `audio.${format}`);
            const response = await this.openai.audio.transcriptions.create({
                file,
                model: this.config.sttModel,
                language: this.config.language,
                response_format: 'verbose_json',
            });
            const duration = Date.now() - startTime;
            logger.debug(`Voice: Transcribed "${response.text}" in ${duration}ms`);
            return {
                text: response.text,
                confidence: 1.0, // Whisper doesn't return confidence
                language: response.language,
                duration,
            };
        }
        catch (error) {
            logger.error('Voice transcription error:', error.message);
            throw error;
        }
    }
    /**
     * Convert text to speech (Text-to-Speech)
     */
    async speak(text, options = {}) {
        if (!this.openai) {
            throw new Error('OpenAI not configured for voice');
        }
        try {
            const voice = options.voice || this.config.ttsVoice;
            const format = options.format || 'mp3';
            const speed = options.speed || 1.0;
            const response = await this.openai.audio.speech.create({
                model: 'tts-1',
                voice: voice,
                input: text,
                response_format: format,
                speed,
            });
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = Buffer.from(arrayBuffer);
            logger.debug(`Voice: Generated ${audioBuffer.length} bytes of audio`);
            return audioBuffer;
        }
        catch (error) {
            logger.error('Voice TTS error:', error.message);
            throw error;
        }
    }
    /**
     * Stream TTS audio
     */
    async *speakStream(text, options = {}) {
        if (!this.openai) {
            throw new Error('OpenAI not configured for voice');
        }
        const voice = options.voice || this.config.ttsVoice;
        const format = options.format || 'mp3';
        const response = await this.openai.audio.speech.create({
            model: 'tts-1-hd',
            voice: voice,
            input: text,
            response_format: format,
        });
        // Stream the response
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body');
        }
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            yield Buffer.from(value);
        }
    }
    /**
     * Check for wake word in transcription
     */
    checkWakeWord(text) {
        if (!this.config.wakeWord)
            return true;
        const normalized = text.toLowerCase().trim();
        const wakeWord = this.config.wakeWord.toLowerCase();
        return normalized.startsWith(wakeWord) ||
            normalized.includes(wakeWord);
    }
    /**
     * Process voice input (STT -> AI -> TTS)
     */
    async processVoice(audioBuffer, processMessage) {
        // Transcribe
        const transcription = await this.transcribe(audioBuffer);
        // Check wake word if active
        if (this.wakeWordActive && !this.checkWakeWord(transcription.text)) {
            return { text: '', audio: Buffer.alloc(0) };
        }
        // Remove wake word from text
        let userText = transcription.text;
        if (this.config.wakeWord) {
            userText = userText.replace(new RegExp(this.config.wakeWord, 'gi'), '').trim();
        }
        // Process with AI
        const responseText = await processMessage(userText);
        // Convert response to speech
        const audio = await this.speak(responseText);
        this.emit('voice:processed', {
            input: userText,
            output: responseText,
            inputDuration: transcription.duration,
        });
        return { text: responseText, audio };
    }
    /**
     * Available TTS voices
     */
    getVoices() {
        return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    }
    /**
     * Set wake word activation
     */
    setWakeWordActive(active) {
        this.wakeWordActive = active;
        logger.info(`Voice: Wake word ${active ? 'enabled' : 'disabled'}`);
    }
    /**
     * Check if voice is enabled
     */
    isEnabled() {
        return this.config.enabled && !!this.openai;
    }
    /**
     * Get current config
     */
    getConfig() {
        return { ...this.config };
    }
}
export const talkMode = new TalkMode();
//# sourceMappingURL=talk.js.map