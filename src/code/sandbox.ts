/**
 * 🥝 KiwiBot Pro - Code Execution Sandbox
 * Safe code execution with isolation (UNIQUE!)
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { logger } from '../utils/logger.js';

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  language: string;
}

interface SandboxOptions {
  timeout?: number;       // Max execution time in ms
  maxOutput?: number;     // Max output length
  allowNetwork?: boolean; // Allow network access
  allowFileSystem?: boolean; // Allow file operations
}

const DEFAULT_OPTIONS: SandboxOptions = {
  timeout: 10000,    // 10 seconds
  maxOutput: 10000,  // 10KB
  allowNetwork: false,
  allowFileSystem: false,
};

class CodeSandbox {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'kiwibot-sandbox');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Execute code in a sandboxed environment
   */
  async execute(
    code: string,
    language: string,
    options: SandboxOptions = {}
  ): Promise<ExecutionResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    try {
      switch (language.toLowerCase()) {
        case 'javascript':
        case 'js':
          return await this.executeJavaScript(code, opts);
        
        case 'python':
        case 'py':
          return await this.executePython(code, opts);
        
        case 'bash':
        case 'sh':
        case 'shell':
          return await this.executeBash(code, opts);
        
        case 'typescript':
        case 'ts':
          return await this.executeTypeScript(code, opts);

        default:
          return {
            success: false,
            output: '',
            error: `Unsupported language: ${language}`,
            executionTime: Date.now() - startTime,
            language,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message,
        executionTime: Date.now() - startTime,
        language,
      };
    }
  }

  /**
   * Execute JavaScript with Node.js
   */
  private async executeJavaScript(
    code: string,
    options: SandboxOptions
  ): Promise<ExecutionResult> {
    // Wrap code to prevent dangerous operations
    const safeCode = this.sandboxJavaScript(code, options);
    
    const filename = this.createTempFile(safeCode, '.js');
    
    try {
      return await this.runProcess('node', [filename], options, 'javascript');
    } finally {
      this.cleanupFile(filename);
    }
  }

  /**
   * Execute Python
   */
  private async executePython(
    code: string,
    options: SandboxOptions
  ): Promise<ExecutionResult> {
    // Add safety imports
    const safeCode = this.sandboxPython(code, options);
    
    const filename = this.createTempFile(safeCode, '.py');
    
    try {
      return await this.runProcess('python', [filename], options, 'python');
    } finally {
      this.cleanupFile(filename);
    }
  }

  /**
   * Execute TypeScript
   */
  private async executeTypeScript(
    code: string,
    options: SandboxOptions
  ): Promise<ExecutionResult> {
    // Use tsx or ts-node if available, otherwise transpile first
    const safeCode = this.sandboxJavaScript(code, options);
    const filename = this.createTempFile(safeCode, '.ts');
    
    try {
      // Try tsx first
      return await this.runProcess('npx', ['tsx', filename], options, 'typescript');
    } catch {
      // Fall back to ts-node
      try {
        return await this.runProcess('npx', ['ts-node', filename], options, 'typescript');
      } finally {
        this.cleanupFile(filename);
      }
    }
  }

  /**
   * Execute Bash
   */
  private async executeBash(
    code: string,
    options: SandboxOptions
  ): Promise<ExecutionResult> {
    // Heavily restrict bash commands
    const dangerousCommands = ['rm', 'mv', 'dd', 'mkfs', 'fdisk', 'format', 'del', 'shutdown', 'reboot'];
    
    for (const cmd of dangerousCommands) {
      if (code.includes(cmd)) {
        return {
          success: false,
          output: '',
          error: `Dangerous command not allowed: ${cmd}`,
          executionTime: 0,
          language: 'bash',
        };
      }
    }

    const filename = this.createTempFile(code, '.sh');
    
    try {
      const shell = process.platform === 'win32' ? 'powershell' : 'bash';
      return await this.runProcess(shell, [filename], options, 'bash');
    } finally {
      this.cleanupFile(filename);
    }
  }

  /**
   * Run a process with timeout and output capture
   */
  private runProcess(
    command: string,
    args: string[],
    options: SandboxOptions,
    language: string
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let output = '';
      let errorOutput = '';
      let killed = false;

      const proc: ChildProcess = spawn(command, args, {
        timeout: options.timeout,
        env: options.allowNetwork ? process.env : {
          ...process.env,
          HTTP_PROXY: '',
          HTTPS_PROXY: '',
          NO_PROXY: '*',
        },
      });

      // Set timeout
      const timer = setTimeout(() => {
        killed = true;
        proc.kill('SIGKILL');
      }, options.timeout!);

      proc.stdout?.on('data', (data) => {
        output += data.toString();
        if (output.length > options.maxOutput!) {
          output = output.slice(0, options.maxOutput!) + '\n... (output truncated)';
          proc.kill();
        }
      });

      proc.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        
        const executionTime = Date.now() - startTime;

        if (killed) {
          resolve({
            success: false,
            output: output.trim(),
            error: `Execution timed out after ${options.timeout}ms`,
            executionTime,
            language,
          });
          return;
        }

        resolve({
          success: code === 0,
          output: output.trim(),
          error: errorOutput.trim() || undefined,
          executionTime,
          language,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          success: false,
          output: '',
          error: err.message,
          executionTime: Date.now() - startTime,
          language,
        });
      });
    });
  }

  /**
   * Sandbox JavaScript code
   */
  private sandboxJavaScript(code: string, options: SandboxOptions): string {
    const restrictions = [];
    
    if (!options.allowFileSystem) {
      restrictions.push(`
        const _fs = require;
        require = (mod) => {
          if (['fs', 'path', 'child_process'].includes(mod)) {
            throw new Error('Module not allowed in sandbox: ' + mod);
          }
          return _fs(mod);
        };
      `);
    }

    if (!options.allowNetwork) {
      restrictions.push(`
        global.fetch = () => { throw new Error('Network access not allowed'); };
      `);
    }

    return `
      // Sandbox restrictions
      ${restrictions.join('\n')}
      
      // User code
      ${code}
    `;
  }

  /**
   * Sandbox Python code
   */
  private sandboxPython(code: string, options: SandboxOptions): string {
    const restrictions = [];

    if (!options.allowFileSystem) {
      restrictions.push(`
import builtins
_original_import = builtins.__import__
def _safe_import(name, *args, **kwargs):
    blocked = ['os', 'shutil', 'subprocess', 'sys']
    if name in blocked:
        raise ImportError(f"Module {name} not allowed in sandbox")
    return _original_import(name, *args, **kwargs)
builtins.__import__ = _safe_import
      `);
    }

    return `
# Sandbox restrictions
${restrictions.join('\n')}

# User code
${code}
    `;
  }

  /**
   * Create a temporary file
   */
  private createTempFile(content: string, extension: string): string {
    const filename = path.join(
      this.tempDir,
      `${crypto.randomUUID()}${extension}`
    );
    fs.writeFileSync(filename, content);
    return filename;
  }

  /**
   * Cleanup temporary file
   */
  private cleanupFile(filename: string): void {
    try {
      if (fs.existsSync(filename)) {
        fs.unlinkSync(filename);
      }
    } catch (error) {
      logger.warn(`Sandbox: Failed to cleanup ${filename}`);
    }
  }

  /**
   * Detect language from code
   */
  detectLanguage(code: string): string {
    // Simple heuristics
    if (code.includes('def ') && code.includes(':')) return 'python';
    if (code.includes('function ') || code.includes('=>')) return 'javascript';
    if (code.includes('interface ') || code.includes(': string')) return 'typescript';
    if (code.startsWith('#!') || code.includes('echo ')) return 'bash';
    
    return 'javascript'; // Default
  }

  /**
   * Format code for display
   */
  formatResult(result: ExecutionResult): string {
    const lines = [`\`\`\`${result.language}`];
    
    if (result.output) {
      lines.push(result.output);
    }
    
    if (result.error) {
      lines.push(`\nError: ${result.error}`);
    }
    
    lines.push('```');
    lines.push(`\n⏱️ Execution time: ${result.executionTime}ms`);
    lines.push(result.success ? '✅ Success' : '❌ Failed');
    
    return lines.join('\n');
  }

  /**
   * Get tools for AI consumption
   */
  getTools() {
    return [
      {
        name: 'code_execute',
        description: 'Execute code safely in a sandbox (JS, TS, Python, Bash)',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'The code snippet to execute' },
            language: { type: 'string', enum: ['javascript', 'typescript', 'python', 'bash'], default: 'javascript' },
            options: {
              type: 'object',
              properties: {
                timeout: { type: 'number', description: 'Timeout in ms' },
                allowNetwork: { type: 'boolean', description: 'Allow internet access' }
              }
            }
          },
          required: ['code', 'language']
        },
        execute: async (params: any) => this.execute(params.code, params.language, params.options)
      }
    ];
  }
}

export const codeSandbox = new CodeSandbox();
