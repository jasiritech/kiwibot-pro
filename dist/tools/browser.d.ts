/**
 * 🥝 KiwiBot Pro - Browser Control
 * CDP-based browser automation (like Moltbot's browser tool)
 */
import type { Page } from 'puppeteer';
interface ScreenshotOptions {
    fullPage?: boolean;
    type?: 'png' | 'jpeg' | 'webp';
    quality?: number;
    path?: string;
}
interface PageInfo {
    url: string;
    title: string;
    content?: string;
    screenshot?: Buffer;
}
interface ActionResult {
    success: boolean;
    message: string;
    data?: any;
}
declare class BrowserControl {
    private browser;
    private pages;
    private config;
    constructor();
    /**
     * Launch browser if not running
     */
    launch(): Promise<void>;
    /**
     * Close browser
     */
    close(): Promise<void>;
    /**
     * Get or create a page
     */
    getPage(id?: string): Promise<Page>;
    /**
     * Navigate to URL
     */
    goto(url: string, pageId?: string): Promise<PageInfo>;
    /**
     * Take screenshot
     */
    screenshot(pageId?: string, options?: ScreenshotOptions): Promise<Buffer>;
    /**
     * Get page content (text)
     */
    getContent(pageId?: string): Promise<string>;
    /**
     * Get page HTML
     */
    getHTML(pageId?: string): Promise<string>;
    /**
     * Click element
     */
    click(selector: string, pageId?: string): Promise<ActionResult>;
    /**
     * Type text
     */
    type(selector: string, text: string, pageId?: string): Promise<ActionResult>;
    /**
     * Fill form field (clears first)
     */
    fill(selector: string, value: string, pageId?: string): Promise<ActionResult>;
    /**
     * Press key
     */
    press(key: string, pageId?: string): Promise<ActionResult>;
    /**
     * Select option
     */
    select(selector: string, values: string[], pageId?: string): Promise<ActionResult>;
    /**
     * Wait for selector
     */
    waitFor(selector: string, pageId?: string, timeout?: number): Promise<ActionResult>;
    /**
     * Execute JavaScript in page
     */
    evaluate<T>(fn: string | ((...args: any[]) => T), pageId?: string, ...args: any[]): Promise<T>;
    /**
     * Get element info
     */
    getElement(selector: string, pageId?: string): Promise<{
        text: string;
        attributes: Record<string, string>;
    } | null>;
    /**
     * Scroll page
     */
    scroll(direction: 'up' | 'down' | 'top' | 'bottom', pageId?: string): Promise<ActionResult>;
    /**
     * Get all open pages
     */
    listPages(): string[];
    /**
     * Close a page
     */
    closePage(pageId: string): Promise<void>;
    /**
     * Check if browser is running
     */
    isRunning(): boolean;
    /**
     * Get current URL
     */
    getCurrentUrl(pageId?: string): Promise<string>;
    /**
     * Get tools for AI consumption
     */
    getTools(): ({
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                url: {
                    type: string;
                    description: string;
                };
                wait: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                fullPage?: undefined;
                selector?: undefined;
                text?: undefined;
            };
            required: string[];
        };
        execute: (params: any) => Promise<PageInfo>;
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                fullPage: {
                    type: string;
                    description: string;
                };
                url?: undefined;
                wait?: undefined;
                selector?: undefined;
                text?: undefined;
            };
            required?: undefined;
        };
        execute: (params: any) => Promise<Buffer<ArrayBufferLike>>;
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                selector: {
                    type: string;
                    description: string;
                };
                url?: undefined;
                wait?: undefined;
                fullPage?: undefined;
                text?: undefined;
            };
            required: string[];
        };
        execute: (params: any) => Promise<ActionResult>;
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                selector: {
                    type: string;
                    description: string;
                };
                text: {
                    type: string;
                    description: string;
                };
                url?: undefined;
                wait?: undefined;
                fullPage?: undefined;
            };
            required: string[];
        };
        execute: (params: any) => Promise<ActionResult>;
    })[];
}
export declare const browserControl: BrowserControl;
export {};
//# sourceMappingURL=browser.d.ts.map