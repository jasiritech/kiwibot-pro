/**
 * 🥝 KiwiBot Pro - Translation Service
 * Multi-language translation with Kiswahili support (UNIQUE!)
 */
interface TranslationResult {
    original: string;
    translated: string;
    sourceLanguage: string;
    targetLanguage: string;
    confidence: number;
}
declare class TranslationService {
    private openai?;
    private anthropic?;
    constructor();
    /**
     * Translate text between languages
     */
    translate(text: string, targetLanguage: string, sourceLanguage?: string): Promise<TranslationResult>;
    /**
     * Detect language of text
     */
    detectLanguage(text: string): Promise<string>;
    /**
     * Translate Kiswahili slang/sheng
     */
    translateSlang(text: string): string;
    /**
     * Get supported languages
     */
    getSupportedLanguages(): {
        code: string;
        name: string;
    }[];
    /**
     * Translate and respond in user's language
     */
    respondInLanguage(userMessage: string, response: string, targetLanguage?: string): Promise<string>;
    /**
     * Multi-language greeting
     */
    getGreeting(language: string): string;
    /**
     * Get tools for AI consumption
     */
    getTools(): {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                text: {
                    type: string;
                    description: string;
                };
                targetLanguage: {
                    type: string;
                    description: string;
                };
                sourceLanguage: {
                    type: string;
                    description: string;
                };
                includeSlang: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        execute: (params: any) => Promise<TranslationResult>;
    }[];
}
export declare const translationService: TranslationService;
export {};
//# sourceMappingURL=translate.d.ts.map