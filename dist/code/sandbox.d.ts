/**
 * 🥝 KiwiBot Pro - Code Execution Sandbox
 * Safe code execution with isolation (UNIQUE!)
 */
interface ExecutionResult {
    success: boolean;
    output: string;
    error?: string;
    executionTime: number;
    language: string;
}
interface SandboxOptions {
    timeout?: number;
    maxOutput?: number;
    allowNetwork?: boolean;
    allowFileSystem?: boolean;
}
declare class CodeSandbox {
    private tempDir;
    constructor();
    /**
     * Execute code in a sandboxed environment
     */
    execute(code: string, language: string, options?: SandboxOptions): Promise<ExecutionResult>;
    /**
     * Execute JavaScript with Node.js
     */
    private executeJavaScript;
    /**
     * Execute Python
     */
    private executePython;
    /**
     * Execute TypeScript
     */
    private executeTypeScript;
    /**
     * Execute Bash
     */
    private executeBash;
    /**
     * Run a process with timeout and output capture
     */
    private runProcess;
    /**
     * Sandbox JavaScript code
     */
    private sandboxJavaScript;
    /**
     * Sandbox Python code
     */
    private sandboxPython;
    /**
     * Create a temporary file
     */
    private createTempFile;
    /**
     * Cleanup temporary file
     */
    private cleanupFile;
    /**
     * Detect language from code
     */
    detectLanguage(code: string): string;
    /**
     * Format code for display
     */
    formatResult(result: ExecutionResult): string;
    /**
     * Get tools for AI consumption
     */
    getTools(): {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                code: {
                    type: string;
                    description: string;
                };
                language: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                options: {
                    type: string;
                    properties: {
                        timeout: {
                            type: string;
                            description: string;
                        };
                        allowNetwork: {
                            type: string;
                            description: string;
                        };
                    };
                };
            };
            required: string[];
        };
        execute: (params: any) => Promise<ExecutionResult>;
    }[];
}
export declare const codeSandbox: CodeSandbox;
export {};
//# sourceMappingURL=sandbox.d.ts.map