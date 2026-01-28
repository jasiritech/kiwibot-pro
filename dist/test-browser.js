/**
 * 🧪 Test 🥝 KiwiBot Pro - Browser Control
 * Run: npx tsx src/test-browser.ts
 */
import { browserControl } from './tools/browser.js';
import * as dotenv from 'dotenv';
// Load environment variables
dotenv.config();
async function testBrowser() {
    console.log('🥝 Browser Control Test Starting...\n');
    try {
        // 1. Launch & Navigate
        console.log('🌐 1. Navigating to Google...');
        const info = await browserControl.goto('https://www.google.com');
        console.log(`✅ Success: ${info.title} (${info.url})`);
        // 2. Take Screenshot
        console.log('\n📸 2. Taking screenshot...');
        const result = await browserControl.screenshot({ path: 'google-test.png' });
        console.log(`✅ Screenshot saved to: ${result.data?.path || 'google-test.png'}`);
        // 3. Search (Simulate typing and clicking)
        console.log('\n🔍 3. Searching for "KiwiBot Pro AI"...');
        await browserControl.type('textarea[name="q"]', 'KiwiBot Pro AI');
        await browserControl.click('input[name="btnK"]'); // This might trigger navigation
        // Wait a bit for results
        await new Promise(r => setTimeout(r, 3000));
        const currentUrl = await browserControl.getCurrentUrl();
        console.log(`✅ Current URL after search: ${currentUrl}`);
        // Close
        await browserControl.close();
        console.log('\n🏁 Test complete! Browser closed.');
    }
    catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.message.includes('Puppeteer not installed')) {
            console.log('\n💡 Fix: npm install puppeteer');
        }
    }
}
testBrowser();
//# sourceMappingURL=test-browser.js.map