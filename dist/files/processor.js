/**
 * 🥝 KiwiBot Pro - File Processor
 * Process PDFs, Word docs, Excel, and more (UNIQUE!)
 */
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';
class FileProcessor {
    openai;
    anthropic;
    tempDir;
    constructor() {
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
        if (process.env.ANTHROPIC_API_KEY) {
            this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        }
        this.tempDir = './.kiwibot/files';
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }
    /**
     * Process a file from path or URL
     */
    async process(source) {
        let filePath;
        let shouldCleanup = false;
        if (source.startsWith('http')) {
            filePath = await this.download(source);
            shouldCleanup = true;
        }
        else {
            filePath = source;
        }
        try {
            const stats = fs.statSync(filePath);
            const filename = path.basename(filePath);
            const ext = path.extname(filePath).toLowerCase();
            let content;
            let type;
            switch (ext) {
                case '.txt':
                case '.md':
                case '.json':
                case '.js':
                case '.ts':
                case '.py':
                case '.html':
                case '.css':
                case '.xml':
                case '.yaml':
                case '.yml':
                    content = fs.readFileSync(filePath, 'utf-8');
                    type = 'text';
                    break;
                case '.csv':
                    content = await this.processCSV(filePath);
                    type = 'csv';
                    break;
                case '.pdf':
                    content = await this.processPDF(filePath);
                    type = 'pdf';
                    break;
                case '.docx':
                case '.doc':
                    content = await this.processWord(filePath);
                    type = 'word';
                    break;
                case '.xlsx':
                case '.xls':
                    content = await this.processExcel(filePath);
                    type = 'excel';
                    break;
                case '.jpg':
                case '.jpeg':
                case '.png':
                case '.gif':
                case '.webp':
                    content = await this.processImage(filePath);
                    type = 'image';
                    break;
                default:
                    content = 'Unsupported file type';
                    type = 'unknown';
            }
            return {
                filename,
                type,
                size: stats.size,
                content,
            };
        }
        finally {
            if (shouldCleanup && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }
    /**
     * Analyze file content with AI
     */
    async analyze(fileOrContent) {
        let content;
        if (typeof fileOrContent === 'string') {
            if (fs.existsSync(fileOrContent)) {
                const processed = await this.process(fileOrContent);
                content = processed.content;
            }
            else {
                content = fileOrContent;
            }
        }
        else {
            content = fileOrContent.content;
        }
        // Truncate if too long
        const maxLength = 15000;
        if (content.length > maxLength) {
            content = content.slice(0, maxLength) + '\n... (content truncated)';
        }
        const prompt = `Analyze this document and provide:
1. A brief summary (2-3 sentences)
2. Key points (bullet list)
3. Important entities (names, places, organizations)
4. Overall sentiment (positive/negative/neutral)

Document content:
${content}

Respond in JSON format:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "entities": ["...", "..."],
  "sentiment": "positive/negative/neutral"
}`;
        try {
            let response;
            if (this.anthropic) {
                const result = await this.anthropic.messages.create({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: prompt }],
                });
                response = result.content[0].type === 'text' ? result.content[0].text : '';
            }
            else if (this.openai) {
                const result = await this.openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 1024,
                });
                response = result.choices[0].message.content || '';
            }
            else {
                return {
                    summary: 'No AI provider available for analysis',
                    keyPoints: [],
                    entities: [],
                    wordCount: content.split(/\s+/).length,
                };
            }
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    ...parsed,
                    wordCount: content.split(/\s+/).length,
                };
            }
            return {
                summary: response,
                keyPoints: [],
                entities: [],
                wordCount: content.split(/\s+/).length,
            };
        }
        catch (error) {
            logger.error(`File analysis failed: ${error.message}`);
            return {
                summary: 'Analysis failed',
                keyPoints: [],
                entities: [],
                wordCount: content.split(/\s+/).length,
            };
        }
    }
    /**
     * Extract specific information from file
     */
    async extract(file, query) {
        let content;
        if (typeof file === 'string') {
            const processed = await this.process(file);
            content = processed.content;
        }
        else {
            content = file.content;
        }
        const prompt = `Based on this document, answer the following question:

Question: ${query}

Document:
${content.slice(0, 10000)}

Provide a direct, concise answer based only on information in the document.`;
        try {
            if (this.anthropic) {
                const result = await this.anthropic.messages.create({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 512,
                    messages: [{ role: 'user', content: prompt }],
                });
                return result.content[0].type === 'text' ? result.content[0].text : '';
            }
            else if (this.openai) {
                const result = await this.openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 512,
                });
                return result.choices[0].message.content || '';
            }
            return 'No AI provider available';
        }
        catch (error) {
            return `Error: ${error.message}`;
        }
    }
    /**
     * Process CSV file
     */
    async processCSV(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        // Parse headers
        const headers = lines[0].split(',').map(h => h.trim());
        // Build table representation
        const table = [headers.join(' | ')];
        table.push(headers.map(() => '---').join(' | '));
        for (let i = 1; i < Math.min(lines.length, 50); i++) {
            if (lines[i].trim()) {
                table.push(lines[i].split(',').map(c => c.trim()).join(' | '));
            }
        }
        if (lines.length > 50) {
            table.push(`... (${lines.length - 50} more rows)`);
        }
        return `CSV Data (${lines.length - 1} rows):\n\n${table.join('\n')}`;
    }
    /**
     * Process PDF (basic text extraction)
     */
    async processPDF(filePath) {
        // In a real implementation, use pdf-parse or similar
        // For now, return placeholder
        return `PDF file: ${path.basename(filePath)}\n\n[PDF parsing requires pdf-parse package. Install with: npm install pdf-parse]`;
    }
    /**
     * Process Word document
     */
    async processWord(filePath) {
        // In a real implementation, use mammoth or similar
        return `Word document: ${path.basename(filePath)}\n\n[Word parsing requires mammoth package. Install with: npm install mammoth]`;
    }
    /**
     * Process Excel file
     */
    async processExcel(filePath) {
        // In a real implementation, use xlsx or similar
        return `Excel file: ${path.basename(filePath)}\n\n[Excel parsing requires xlsx package. Install with: npm install xlsx]`;
    }
    /**
     * Process image (with OCR/vision)
     */
    async processImage(filePath) {
        const buffer = fs.readFileSync(filePath);
        const base64 = buffer.toString('base64');
        const ext = path.extname(filePath).toLowerCase();
        const mediaType = ext === '.png' ? 'image/png' : 'image/jpeg';
        try {
            if (this.anthropic) {
                const result = await this.anthropic.messages.create({
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
                                        data: base64,
                                    },
                                },
                                {
                                    type: 'text',
                                    text: 'Describe this image and extract any text visible in it.',
                                },
                            ],
                        },
                    ],
                });
                return result.content[0].type === 'text' ? result.content[0].text : '';
            }
        }
        catch (error) {
            return `Image: ${path.basename(filePath)} (Vision API unavailable: ${error.message})`;
        }
        return `Image: ${path.basename(filePath)}`;
    }
    /**
     * Download file from URL
     */
    download(url) {
        return new Promise((resolve, reject) => {
            const filename = path.join(this.tempDir, `download-${Date.now()}${path.extname(url) || '.tmp'}`);
            const file = fs.createWriteStream(filename);
            const client = url.startsWith('https') ? https : http;
            client.get(url, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302) {
                    const redirectUrl = response.headers.location;
                    if (redirectUrl) {
                        this.download(redirectUrl).then(resolve).catch(reject);
                        return;
                    }
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve(filename);
                });
            }).on('error', (err) => {
                fs.unlink(filename, () => { });
                reject(err);
            });
        });
    }
    /**
     * Get supported file types
     */
    getSupportedTypes() {
        return [
            'Text: .txt, .md, .json, .xml, .yaml, .yml',
            'Code: .js, .ts, .py, .html, .css',
            'Data: .csv, .xlsx, .xls',
            'Documents: .pdf, .docx, .doc',
            'Images: .jpg, .jpeg, .png, .gif, .webp',
        ];
    }
    /**
     * Get tools for AI consumption
     */
    getTools() {
        return [
            {
                name: 'file_process',
                description: 'Extract content and analyze a file (PDF, DOCX, CSV, Excel, etc.) from a URL or path',
                parameters: {
                    type: 'object',
                    properties: {
                        filePath: { type: 'string', description: 'The absolute URL or local path to the file' }
                    },
                    required: ['filePath']
                },
                execute: async (params) => this.process(params.filePath)
            },
            {
                name: 'file_summarize',
                description: 'Generate a smart summary and extract key entities from a file',
                parameters: {
                    type: 'object',
                    properties: {
                        content: { type: 'string', description: 'The text content to summarize' },
                        format: { type: 'string', enum: ['bullets', 'paragraph', 'table'], default: 'bullets' }
                    },
                    required: ['content']
                },
                execute: async (params) => this.analyze(params.content)
            }
        ];
    }
}
export const fileProcessor = new FileProcessor();
//# sourceMappingURL=processor.js.map