/**
 * 🥝 KiwiBot Pro - Vision Analyzer
 * Image analysis and OCR (UNIQUE!)
 */
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { logger } from '../utils/logger.js';
class VisionAnalyzer {
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
     * Analyze an image from URL or base64
     */
    async analyze(imageSource, prompt = 'Describe this image in detail') {
        // Convert to base64 if URL
        let base64Image;
        let mediaType = 'image/jpeg';
        if (imageSource.startsWith('http')) {
            const result = await this.downloadImage(imageSource);
            base64Image = result.base64;
            mediaType = result.mediaType;
        }
        else if (imageSource.startsWith('data:')) {
            // Data URL
            const parts = imageSource.split(',');
            base64Image = parts[1];
            mediaType = parts[0].split(':')[1].split(';')[0];
        }
        else if (fs.existsSync(imageSource)) {
            // File path
            const buffer = fs.readFileSync(imageSource);
            base64Image = buffer.toString('base64');
            const ext = imageSource.split('.').pop()?.toLowerCase();
            mediaType = ext === 'png' ? 'image/png' : 'image/jpeg';
        }
        else {
            // Assume it's already base64
            base64Image = imageSource;
        }
        try {
            // Try Anthropic Claude first (better vision)
            if (this.anthropic) {
                return await this.analyzeWithClaude(base64Image, mediaType, prompt);
            }
            // Fall back to OpenAI
            if (this.openai) {
                return await this.analyzeWithGPT(base64Image, mediaType, prompt);
            }
            throw new Error('No vision provider available');
        }
        catch (error) {
            logger.error(`Vision: Analysis failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Analyze with Claude Vision
     */
    async analyzeWithClaude(base64Image, mediaType, prompt) {
        const response = await this.anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mediaType,
                                data: base64Image,
                            },
                        },
                        {
                            type: 'text',
                            text: `${prompt}

Please respond in this JSON format:
{
  "description": "detailed description",
  "objects": ["list", "of", "objects"],
  "text": "any text visible in the image",
  "faces": number of faces detected,
  "colors": ["dominant", "colors"]
}`,
                        },
                    ],
                },
            ],
        });
        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    ...parsed,
                    confidence: 0.9,
                };
            }
        }
        catch {
            // Parse failed, return raw description
        }
        return {
            description: text,
            objects: [],
            confidence: 0.8,
        };
    }
    /**
     * Analyze with GPT-4 Vision
     */
    async analyzeWithGPT(base64Image, mediaType, prompt) {
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:${mediaType};base64,${base64Image}`,
                            },
                        },
                        {
                            type: 'text',
                            text: `${prompt}

Please respond in this JSON format:
{
  "description": "detailed description",
  "objects": ["list", "of", "objects"],
  "text": "any text visible in the image",
  "faces": number of faces detected,
  "colors": ["dominant", "colors"]
}`,
                        },
                    ],
                },
            ],
            max_tokens: 1024,
        });
        const text = response.choices[0].message.content || '';
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    ...parsed,
                    confidence: 0.85,
                };
            }
        }
        catch {
            // Parse failed
        }
        return {
            description: text,
            objects: [],
            confidence: 0.75,
        };
    }
    /**
     * Extract text from image (OCR)
     */
    async extractText(imageSource) {
        const result = await this.analyze(imageSource, 'Extract and return ALL text visible in this image, preserving formatting. Only return the text, nothing else.');
        return result.text || result.description;
    }
    /**
     * Compare two images
     */
    async compare(image1, image2) {
        // This would ideally use embeddings, but we'll use description comparison
        const [desc1, desc2] = await Promise.all([
            this.analyze(image1, 'List the main elements in this image'),
            this.analyze(image2, 'List the main elements in this image'),
        ]);
        const objects1 = new Set(desc1.objects.map(o => o.toLowerCase()));
        const objects2 = new Set(desc2.objects.map(o => o.toLowerCase()));
        const intersection = new Set([...objects1].filter(x => objects2.has(x)));
        const union = new Set([...objects1, ...objects2]);
        const similarity = union.size > 0 ? intersection.size / union.size : 0;
        const differences = [
            ...Array.from(objects1).filter(x => !objects2.has(x)).map(x => `Image 1 has: ${x}`),
            ...Array.from(objects2).filter(x => !objects1.has(x)).map(x => `Image 2 has: ${x}`),
        ];
        return {
            similar: similarity > 0.7,
            similarity,
            differences,
        };
    }
    /**
     * Generate image caption
     */
    async caption(imageSource, style = 'short') {
        const prompts = {
            short: 'Give a brief, one-sentence caption for this image.',
            detailed: 'Write a detailed description of this image including all visible elements.',
            funny: 'Write a funny, witty caption for this image.',
        };
        const result = await this.analyze(imageSource, prompts[style]);
        return result.description;
    }
    /**
     * Download image from URL
     */
    downloadImage(url) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            client.get(url, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302) {
                    // Follow redirect
                    const redirectUrl = response.headers.location;
                    if (redirectUrl) {
                        this.downloadImage(redirectUrl).then(resolve).catch(reject);
                        return;
                    }
                }
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    const contentType = response.headers['content-type'] || 'image/jpeg';
                    resolve({
                        base64: buffer.toString('base64'),
                        mediaType: contentType,
                    });
                });
                response.on('error', reject);
            }).on('error', reject);
        });
    }
    /**
     * Get tools for AI consumption
     */
    getTools() {
        return [
            {
                name: 'vision_analyze',
                description: 'Analyze an image from a URL or provided source. Can describe contents, read text (OCR), and recognize objects.',
                parameters: {
                    type: 'object',
                    properties: {
                        imageSource: { type: 'string', description: 'The absolute URL or source identifier of the image' },
                        prompt: { type: 'string', description: 'Specific question or focus for the analysis' }
                    },
                    required: ['imageSource']
                },
                execute: async (params) => this.analyze(params.imageSource, params.prompt)
            }
        ];
    }
}
export const visionAnalyzer = new VisionAnalyzer();
//# sourceMappingURL=analyzer.js.map