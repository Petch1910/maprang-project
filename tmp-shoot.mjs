import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';

const pages = ['home','creation','ai-creator','creative-plaza','creators','favorites','history','works','announcements','notifications','points','settings','support'];
const outDir = process.argv[2] || 'tmp-ref-shots';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
for (const p of pages) {
  try {
    await page.goto(`http://127.0.0.1:8899/${p}`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${outDir}/${p}.png`, fullPage: true });
    console.log('shot', p);
  } catch (e) {
    console.log('FAIL', p, e.message);
  }
}
await browser.close();
