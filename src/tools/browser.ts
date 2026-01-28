/**
 * 🥝 KiwiBot Pro - Browser Control
 * CDP-based browser automation (like Moltbot's browser tool)
 */

import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer';
import { logger } from '../utils/logger.js';
import { eventBus } from '../utils/events.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface BrowserConfig {
  enabled: boolean;
  headless: boolean;
  userDataDir?: string;
  viewport: { width: number; height: number };
  timeout: number;
}

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

class BrowserControl {
  private browser: Browser | null = null;
  private pages: Map<string, Page> = new Map();
  private config: BrowserConfig;

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
  async launch(): Promise<void> {
    if (this.browser) return;

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
    } catch (error: any) {
      logger.error('Browser launch error:', error.message);
      throw error;
    }
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
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
  async getPage(id: string = 'main'): Promise<Page> {
    if (!this.browser) {
      await this.launch();
    }

    let page = this.pages.get(id);
    if (!page || page.isClosed()) {
      page = await this.browser!.newPage();
      page.setDefaultTimeout(this.config.timeout);
      this.pages.set(id, page);
    }

    return page;
  }

  /**
   * Navigate to URL
   */
  async goto(url: string, pageId: string = 'main'): Promise<PageInfo> {
    const page = await this.getPage(pageId);

    try {
      await page.goto(url, { waitUntil: 'networkidle2' });

      const title = await page.title();
      
      logger.debug(`Browser: Navigated to ${url}`);

      return { url, title };
    } catch (error: any) {
      logger.error(`Browser navigation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Take screenshot
   */
  async screenshot(
    pageId: string = 'main',
    options: ScreenshotOptions = {}
  ): Promise<Buffer> {
    const page = await this.getPage(pageId);

    const screenshot = await page.screenshot({
      fullPage: options.fullPage ?? false,
      type: options.type ?? 'png',
      quality: options.type === 'png' ? undefined : options.quality ?? 80,
    });

    if (options.path) {
      await fs.writeFile(options.path, screenshot);
    }

    logger.debug('Browser: Screenshot captured');

    return screenshot as Buffer;
  }

  /**
   * Get page content (text)
   */
  async getContent(pageId: string = 'main'): Promise<string> {
    const page = await this.getPage(pageId);

    const content = await page.evaluate(() => {
      // Remove scripts, styles, etc.
      const clone = document.body.cloneNode(true) as HTMLElement;
      const scripts = clone.querySelectorAll('script, style, noscript');
      scripts.forEach(el => el.remove());
      return clone.innerText;
    });

    return content;
  }

  /**
   * Get page HTML
   */
  async getHTML(pageId: string = 'main'): Promise<string> {
    const page = await this.getPage(pageId);
    return await page.content();
  }

  /**
   * Click element
   */
  async click(selector: string, pageId: string = 'main'): Promise<ActionResult> {
    const page = await this.getPage(pageId);

    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.click(selector);
      
      logger.debug(`Browser: Clicked ${selector}`);
      return { success: true, message: `Clicked ${selector}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Type text
   */
  async type(
    selector: string,
    text: string,
    pageId: string = 'main'
  ): Promise<ActionResult> {
    const page = await this.getPage(pageId);

    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.type(selector, text);

      logger.debug(`Browser: Typed in ${selector}`);
      return { success: true, message: `Typed "${text}" in ${selector}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Fill form field (clears first)
   */
  async fill(
    selector: string,
    value: string,
    pageId: string = 'main'
  ): Promise<ActionResult> {
    const page = await this.getPage(pageId);

    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      
      // Clear existing value
      await page.$eval(selector, (el) => {
        (el as HTMLInputElement).value = '';
      });
      
      await page.type(selector, value);

      return { success: true, message: `Filled ${selector} with "${value}"` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Press key
   */
  async press(key: string, pageId: string = 'main'): Promise<ActionResult> {
    const page = await this.getPage(pageId);

    try {
      await page.keyboard.press(key as any);
      return { success: true, message: `Pressed ${key}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Select option
   */
  async select(
    selector: string,
    values: string[],
    pageId: string = 'main'
  ): Promise<ActionResult> {
    const page = await this.getPage(pageId);

    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.select(selector, ...values);

      return { success: true, message: `Selected ${values.join(', ')}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Wait for selector
   */
  async waitFor(
    selector: string,
    pageId: string = 'main',
    timeout: number = 5000
  ): Promise<ActionResult> {
    const page = await this.getPage(pageId);

    try {
      await page.waitForSelector(selector, { timeout });
      return { success: true, message: `Found ${selector}` };
    } catch (error: any) {
      return { success: false, message: `Timeout waiting for ${selector}` };
    }
  }

  /**
   * Execute JavaScript in page
   */
  async evaluate<T>(
    fn: string | ((...args: any[]) => T),
    pageId: string = 'main',
    ...args: any[]
  ): Promise<T> {
    const page = await this.getPage(pageId);
    return await page.evaluate(fn, ...args);
  }

  /**
   * Get element info
   */
  async getElement(
    selector: string,
    pageId: string = 'main'
  ): Promise<{ text: string; attributes: Record<string, string> } | null> {
    const page = await this.getPage(pageId);

    try {
      const element = await page.$(selector);
      if (!element) return null;

      const result = await page.evaluate((el) => {
        const attrs: Record<string, string> = {};
        for (const attr of el.attributes) {
          attrs[attr.name] = attr.value;
        }
        return {
          text: el.textContent || '',
          attributes: attrs,
        };
      }, element);

      return result;
    } catch {
      return null;
    }
  }

  /**
   * Scroll page
   */
  async scroll(
    direction: 'up' | 'down' | 'top' | 'bottom',
    pageId: string = 'main'
  ): Promise<ActionResult> {
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
  listPages(): string[] {
    return Array.from(this.pages.keys());
  }

  /**
   * Close a page
   */
  async closePage(pageId: string): Promise<void> {
    const page = this.pages.get(pageId);
    if (page && !page.isClosed()) {
      await page.close();
      this.pages.delete(pageId);
    }
  }

  /**
   * Check if browser is running
   */
  isRunning(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(pageId: string = 'main'): Promise<string> {
    const page = await this.getPage(pageId);
    return page.url();
  }
}

export const browserControl = new BrowserControl();
