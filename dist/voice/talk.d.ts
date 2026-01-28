/**
 * 🥝 KiwiBot Pro - Voice/Talk Mode
 * Speech-to-Text and Text-to-Speech support
 * Inspired by Moltbot's Voice Wake + Talk Mode
 */
import { EventEmitter } from 'events';
type VoiceProvider = 'openai' | 'elevenlabs' | 'system';
interface VoiceConfig {
    enabled: boolean;
    provider: VoiceProvider;
    ttsVoice: string;
    sttModel: string;
    wakeWord?: string;
    language: string;
}
interface SpeechResult {
    text: string;
    confidence: number;
    language?: string;
    duration: number;
}
interface TTSOptions {
    voice?: string;
    speed?: number;
    format?: 'mp3' | 'opus' | 'aac' | 'flac';
}
declare class TalkMode extends EventEmitter {
    private openai?;
    private config;
    private isListening;
    private wakeWordActive;
    constructor();
    private initProviders;
    /**
     * Transcribe audio to text (Speech-to-Text)
     */
    transcribe(audioBuffer: Buffer, format?: string): Promise<SpeechResult>;
    /**
     * Convert text to speech (Text-to-Speech)
     */
    speak(text: string, options?: TTSOptions): Promise<Buffer>;
    /**
     * Stream TTS audio
     */
    speakStream(text: string, options?: TTSOptions): AsyncGenerator<Buffer>;
    /**
     * Check for wake word in transcription
     */
    checkWakeWord(text: string): boolean;
    /**
     * Process voice input (STT -> AI -> TTS)
     */
    processVoice(audioBuffer: Buffer, processMessage: (text: string) => Promise<string>): Promise<{
        text: string;
        audio: Buffer;
    }>;
    /**
     * Available TTS voices
     */
    getVoices(): string[];
    /**
     * Set wake word activation
     */
    setWakeWordActive(active: boolean): void;
    /**
     * Check if voice is enabled
     */
    isEnabled(): boolean;
    /**
     * Get current config
     */
    getConfig(): VoiceConfig;
}
export declare const talkMode: TalkMode;
export {};
//# sourceMappingURL=talk.d.ts.map