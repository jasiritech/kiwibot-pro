/**
 * 🥝 KiwiBot Pro - Vision Analyzer
 * Image analysis and OCR (UNIQUE!)
 */
interface VisionResult {
    description: string;
    objects: string[];
    text?: string;
    faces?: number;
    colors?: string[];
    confidence: number;
}
declare class VisionAnalyzer {
    private openai?;
    private anthropic?;
    constructor();
    /**
     * Analyze an image from URL or base64
     */
    analyze(imageSource: string, prompt?: string): Promise<VisionResult>;
    /**
     * Analyze with Claude Vision
     */
    private analyzeWithClaude;
    /**
     * Analyze with GPT-4 Vision
     */
    private analyzeWithGPT;
    /**
     * Extract text from image (OCR)
     */
    extractText(imageSource: string): Promise<string>;
    /**
     * Compare two images
     */
    compare(image1: string, image2: string): Promise<{
        similar: boolean;
        similarity: number;
        differences: string[];
    }>;
    /**
     * Generate image caption
     */
    caption(imageSource: string, style?: 'short' | 'detailed' | 'funny'): Promise<string>;
    /**
     * Download image from URL
     */
    private downloadImage;
    /**
     * Get tools for AI consumption
     */
    getTools(): {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                imageSource: {
                    type: string;
                    description: string;
                };
                prompt: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        execute: (params: any) => Promise<VisionResult>;
    }[];
}
export declare const visionAnalyzer: VisionAnalyzer;
export {};
//# sourceMappingURL=analyzer.d.ts.map