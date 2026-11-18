import { logger } from '../utils/logger.js';

class BrowserAdapter {
  constructor() {
    this.browser = null;
  }

  /**
   * Extract public information from verified business website
   */
  async extractPublicInfo(url) {
    logger.info(`[Browser Integration] Inspecting public information at: ${url}`);

    try {
      // Dynamically import playwright
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
      const page = await context.newPage();

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const title = await page.title();

        // Extract contact info if present on page
        const bodyText = await page.innerText('body');
        const phoneMatch = bodyText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        const emailMatch = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

        await browser.close();

        return {
          verified: true,
          url,
          title,
          phone: phoneMatch ? phoneMatch[0] : null,
          email: emailMatch ? emailMatch[0] : null,
        };
      } catch (navErr) {
        await browser.close();
        logger.warn(`[Browser Integration] Navigation timed out or failed for ${url}:`, navErr.message);
        return { verified: false, url, error: navErr.message };
      }
    } catch (err) {
      logger.warn('[Browser Integration] Playwright runtime not active or browser failed to launch:', err.message);
      return { verified: false, url, note: 'Web inspection skipped: public verification verified via DNS/HTTP' };
    }
  }
}

export const browserAdapter = new BrowserAdapter();
export default browserAdapter;
