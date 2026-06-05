import { chromium } from 'playwright';
import { buildCandidateUrls } from './candidates';

export interface ScrapedPage {
  url: string;
  status: number;
  html: string;
}

export interface ScrapeResult {
  homepage: string;
  pages: ScrapedPage[];
  errors: { url: string; error: string }[];
}

/**
 * Visit homepage + likely pricing/services/specials pages with a real browser.
 * Single entry point used by both the first-report flow on signup and the monthly cron.
 */
export async function scrapeCompetitor(homepage: string): Promise<ScrapeResult> {
  const urls = buildCandidateUrls(homepage);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
  });
  const page = await context.newPage();

  const pages: ScrapedPage[] = [];
  const errors: { url: string; error: string }[] = [];

  for (const url of urls) {
    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
      });
      const status = response?.status() ?? 0;
      if (status >= 200 && status < 400) {
        const html = await page.content();
        pages.push({ url, status, html: cleanHtml(html) });
      }
    } catch (e) {
      errors.push({ url, error: e instanceof Error ? e.message : String(e) });
    }
  }

  await browser.close();
  return { homepage, pages, errors };
}

/**
 * Strip scripts / styles / SVG so the LLM only sees content, not markup noise.
 * Keeps things cheap and focused on what actually matters for extraction.
 */
function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 120_000);
}
