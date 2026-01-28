/**
 * 🥝 KiwiBot Pro - File Processor
 * Process PDFs, Word docs, Excel, and more (UNIQUE!)
 */
interface ProcessedFile {
    filename: string;
    type: string;
    size: number;
    content: string;
    summary?: string;
    metadata?: Record<string, any>;
}
interface FileAnalysis {
    summary: string;
    keyPoints: string[];
    entities: string[];
    sentiment?: string;
    wordCount: number;
}
declare class FileProcessor {
    private openai?;
    private anthropic?;
    private tempDir;
    constructor();
    /**
     * Process a file from path or URL
     */
    process(source: string): Promise<ProcessedFile>;
    /**
     * Analyze file content with AI
     */
    analyze(fileOrContent: string | ProcessedFile): Promise<FileAnalysis>;
    /**
     * Extract specific information from file
     */
    extract(file: string | ProcessedFile, query: string): Promise<string>;
    /**
     * Process CSV file
     */
    private processCSV;
    /**
     * Process PDF (basic text extraction)
     */
    private processPDF;
    /**
     * Process Word document
     */
    private processWord;
    /**
     * Process Excel file
     */
    private processExcel;
    /**
     * Process image (with OCR/vision)
     */
    private processImage;
    /**
     * Download file from URL
     */
    private download;
    /**
     * Get supported file types
     */
    getSupportedTypes(): string[];
    /**
     * Get tools for AI consumption
     */
    getTools(): ({
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                filePath: {
                    type: string;
                    description: string;
                };
                content?: undefined;
                format?: undefined;
            };
            required: string[];
        };
        execute: (params: any) => Promise<ProcessedFile>;
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                content: {
                    type: string;
                    description: string;
                };
                format: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                filePath?: undefined;
            };
            required: string[];
        };
        execute: (params: any) => Promise<FileAnalysis>;
    })[];
}
export declare const fileProcessor: FileProcessor;
export {};
//# sourceMappingURL=processor.d.ts.map