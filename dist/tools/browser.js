/**
 * 🥝 KiwiBot Pro - Browser Control
 * CDP-based browser automation (like Moltbot's browser tool)
 */
import { logger } from '../utils/logger.js';
import * as fs from 'fs/promises';
// Dynamic import for puppeteer (optional dependency)
let puppeteer;
try {
    // @ts-ignore - might not be installed
    puppeteer = await import('puppeteer');
}
catch {
    logger.warn('Browser: Puppeteer not installed. Browser control disabled.');
}
class BrowserControl {
    browser = null;
    pages = new Map();
    config;
    constructor() {
        this.config = {
            enabled: process.env.BROWSER_ENABLED === 'true',
            headless: process.env.BROWSER_HEADLESS !== 'false',
            userDataDir: process.env.BROWSER_DATA_DIR,
            viewport: {
                width: parseInt(process.env.BROWSER_WIDTH || '1280'),
                height: parseInt(process.env.BROWSER_HEIGHT || '720'),
            },
            timeout: parseInt(process.env.BROWSER_TIMEOUT || '30000'),
        };
    }
    /**
     * Launch browser if not running
     */
    async launch() {
        if (this.browser)
            return;
        try {
            this.browser = await puppeteer.launch({
                headless: this.config.headless,
                userDataDir: this.config.userDataDir,
                defaultViewport: this.config.viewport,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                ],
            });
            logger.info('Browser: Launched successfully');
            this.browser.on('disconnected', () => {
                this.browser = null;
                this.pages.clear();
                logger.warn('Browser: Disconnected');
            });
        }
        catch (error) {
            logger.error('Browser launch error:', error.message);
            throw error;
        }
    }
    /**
     * Close browser
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.pages.clear();
            logger.info('Browser: Closed');
        }
    }
    /**
     * Get or create a page
     */
    async getPage(id = 'main') {
        if (!this.browser) {
            await this.launch();
        }
        let page = this.pages.get(id);
        if (!page || page.isClosed()) {
            page = await this.browser.newPage();
            page.setDefaultTimeout(this.config.timeout);
            this.pages.set(id, page);
        }
        return page;
    }
    /**
     * Navigate to URL
     */
    async goto(url, pageId = 'main') {
        const page = await this.getPage(pageId);
        try {
            await page.goto(url, { waitUntil: 'networkidle2' });
            const title = await page.title();
            logger.debug(`Browser: Navigated to ${url}`);
            return { url, title };
        }
        catch (error) {
            logger.error(`Browser navigation error: ${error.message}`);
            throw error;
        }
    }
    /**
     * Take screenshot
     */
    async screenshot(pageIdOrOptions = 'main', maybeOptions) {
        const pageId = typeof pageIdOrOptions === 'string' ? pageIdOrOptions : 'main';
        const options = typeof pageIdOrOptions === 'object' ? pageIdOrOptions : maybeOptions || {};
        const page = await this.getPage(pageId);
        const type = options.type || 'png';
        const screenshotOptions = {
            fullPage: options.fullPage ?? false,
            type: type,
        };
        if (type !== 'png') {
            screenshotOptions.quality = options.quality ?? 80;
        }
        const screenshot = await page.screenshot(screenshotOptions);
        if (options.path) {
            await fs.writeFile(options.path, screenshot);
        }
        logger.debug('Browser: Screenshot captured');
        return {
            success: true,
            message: 'Screenshot captured',
            data: { path: options.path, type: type }
        };
    }
    /**
     * Get page content (text)
     */
    async getContent(pageId = 'main') {
        const page = await this.getPage(pageId);
        const content = await page.evaluate(() => {
            // Remove scripts, styles, etc.
            const clone = document.body.cloneNode(true);
            const scripts = clone.querySelectorAll('script, style, noscript');
            scripts.forEach(el => el.remove());
            return clone.innerText;
        });
        return content;
    }
    /**
     * Get page HTML
     */
    async getHTML(pageId = 'main') {
        const page = await this.getPage(pageId);
        return await page.content();
    }
    /**
     * Click element
     */
    async click(selector, pageId = 'main') {
        const page = await this.getPage(pageId);
        try {
            await page.waitForSelector(selector, { timeout: 5000 });
            await page.click(selector);
            logger.debug(`Browser: Clicked ${selector}`);
            return { success: true, message: `Clicked ${selector}` };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    /**
     * Type text
     */
    async type(selector, text, pageId = 'main') {
        const page = await this.getPage(pageId);
        try {
            await page.waitForSelector(selector, { timeout: 5000 });
            await page.type(selector, text);
            logger.debug(`Browser: Typed in ${selector}`);
            return { success: true, message: `Typed "${text}" in ${selector}` };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    /**
     * Fill form field (clears first)
     */
    async fill(selector, value, pageId = 'main') {
        const page = await this.getPage(pageId);
        try {
            await page.waitForSelector(selector, { timeout: 5000 });
            // Clear existing value
            await page.$eval(selector, (el) => {
                el.value = '';
            });
            await page.type(selector, value);
            return { success: true, message: `Filled ${selector} with "${value}"` };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    /**
     * Press key
     */
    async press(key, pageId = 'main') {
        const page = await this.getPage(pageId);
        try {
            await page.keyboard.press(key);
            return { success: true, message: `Pressed ${key}` };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    /**
     * Select option
     */
    async select(selector, values, pageId = 'main') {
        const page = await this.getPage(pageId);
        try {
            await page.waitForSelector(selector, { timeout: 5000 });
            await page.select(selector, ...values);
            return { success: true, message: `Selected ${values.join(', ')}` };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    /**
     * Wait for selector
     */
    async waitFor(selector, pageId = 'main', timeout = 5000) {
        const page = await this.getPage(pageId);
        try {
            await page.waitForSelector(selector, { timeout });
            return { success: true, message: `Found ${selector}` };
        }
        catch (error) {
            return { success: false, message: `Timeout waiting for ${selector}` };
        }
    }
    /**
     * Execute JavaScript in page
     */
    async evaluate(fn, pageId = 'main', ...args) {
        const page = await this.getPage(pageId);
        return await page.evaluate(fn, ...args);
    }
    /**
     * Get element info
     */
    async getElement(selector, pageId = 'main') {
        const page = await this.getPage(pageId);
        try {
            const element = await page.$(selector);
            if (!element)
                return null;
            const result = await page.evaluate((el) => {
                const attrs = {};
                for (const attr of el.attributes) {
                    attrs[attr.name] = attr.value;
                }
                return {
                    text: el.textContent || '',
                    attributes: attrs,
                };
            }, element);
            return result;
        }
        catch {
            return null;
        }
    }
    /**
     * Scroll page
     */
    async scroll(direction, pageId = 'main') {
        const page = await this.getPage(pageId);
        await page.evaluate((dir) => {
            switch (dir) {
                case 'up':
                    window.scrollBy(0, -window.innerHeight);
                    break;
                case 'down':
                    window.scrollBy(0, window.innerHeight);
                    break;
                case 'top':
                    window.scrollTo(0, 0);
                    break;
                case 'bottom':
                    window.scrollTo(0, document.body.scrollHeight);
                    break;
            }
        }, direction);
        return { success: true, message: `Scrolled ${direction}` };
    }
    /**
     * Get all open pages
     */
    listPages() {
        return Array.from(this.pages.keys());
    }
    /**
     * Close a page
     */
    async closePage(pageId) {
        const page = this.pages.get(pageId);
        if (page && !page.isClosed()) {
            await page.close();
            this.pages.delete(pageId);
        }
    }
    /**
     * Check if browser is running
     */
    isRunning() {
        return this.browser !== null && this.browser.isConnected();
    }
    /**
     * Get current URL
     */
    async getCurrentUrl(pageId = 'main') {
        const page = await this.getPage(pageId);
        return page.url();
    }
    /**
     * Get tools for AI consumption
     */
    getTools() {
        return [
            {
                name: 'browser_navigate',
                description: 'Navigate to a URL in the browser',
                parameters: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: 'The URL to navigate to' },
                        wait: { type: 'string', enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'], default: 'networkidle2' }
                    },
                    required: ['url']
                },
                execute: async (params) => this.goto(params.url)
            },
            {
                name: 'browser_screenshot',
                description: 'Take a screenshot of the current page',
                parameters: {
                    type: 'object',
                    properties: {
                        fullPage: { type: 'boolean', description: 'Capture full page or just viewport' }
                    }
                },
                execute: async (params) => this.screenshot(params)
            },
            {
                name: 'browser_click',
                description: 'Click on an element using a CSS selector',
                parameters: {
                    type: 'object',
                    properties: {
                        selector: { type: 'string', description: 'The CSS selector to click' }
                    },
                    required: ['selector']
                },
                execute: async (params) => this.click(params.selector)
            },
            {
                name: 'browser_type',
                description: 'Type text into an input field',
                parameters: {
                    type: 'object',
                    properties: {
                        selector: { type: 'string', description: 'The CSS selector for the input' },
                        text: { type: 'string', description: 'The text to type' }
                    },
                    required: ['selector', 'text']
                },
                execute: async (params) => this.type(params.selector, params.text)
            }
        ];
    }
}
export const browserControl = new BrowserControl();
//# sourceMappingURL=browser.js.map