/**
 * Screenshots for the five-second reader test: each registered figure's
 * frame at settle, with both folds closed, at 1280 px and at 375 px wide
 * (touch), written beside its record under evidence/reader-first/.
 *
 *   node scripts/capture-reader-first.ts --capture <file.json> [--out out] [--ids a,b] [--port 0]
 *
 * The registered sources must be committed: the screenshots belong to the
 * commit they were taken at, and --capture records that commit and each
 * figure's source digest for scripts/record-reader-first.ts.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { serveExport } from '../lib/visual-capture.ts';
import { RECORD_DIR, readRegistry, screenshotPath, sourceDigest } from '../lib/reader-first.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};
const capturePath = option('--capture', '');
if (!capturePath) throw new Error('capture-reader-first: --capture <file.json> is required');
const ids = option('--ids', '').split(',').filter(Boolean);
const registry = readRegistry('.');
const entries = registry.figures.filter((entry) => ids.length === 0 || ids.includes(entry.id));
if (ids.length && entries.length !== ids.length) throw new Error('capture-reader-first: an --ids value is not registered');

const sources = [...new Set(entries.flatMap((entry) => entry.sources))];
const dirty = execFileSync('git', ['status', '--porcelain', '--', ...sources], { encoding: 'utf8' }).trim();
if (dirty) throw new Error(`capture-reader-first: commit the registered sources first:\n${dirty}`);
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

const VIEWPORTS = [
  { width: 1280, height: 900, touch: false },
  { width: 375, height: 812, touch: true },
] as const;

const { server, base } = await serveExport(resolve(option('--out', 'out')), Number(option('--port', '0')));
const browser = await chromium.launch();
mkdirSync(RECORD_DIR, { recursive: true });
const captured: { id: string; sourceDigest: string }[] = [];
try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      hasTouch: viewport.touch,
      isMobile: viewport.touch,
      reducedMotion: 'no-preference',
    });
    for (const entry of entries) {
      const page = await context.newPage();
      await page.goto(base + entry.route, { waitUntil: 'networkidle', timeout: 120_000 });
      await page.evaluate(() => document.fonts.ready);
      const frame = page.locator(`main [data-figure-frame="${entry.figure}"]`).first();
      await frame.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      const open = await frame.evaluate((el) => [...el.querySelectorAll('[data-figure-fold]')]
        .filter((fold) => (fold as HTMLDetailsElement).open).length);
      if (open) throw new Error(`${entry.route} [${entry.figure}]: a fold is open at settle`);
      await frame.screenshot({ path: screenshotPath(entry.id, viewport.width), animations: 'disabled' });
      await page.close();
      console.log(`${viewport.width} ${entry.id}`);
    }
    await context.close();
  }
  for (const entry of entries) captured.push({ id: entry.id, sourceDigest: sourceDigest('.', entry.sources) });
} finally {
  await browser.close();
  server.close();
}
writeFileSync(capturePath, `${JSON.stringify({ commit, captured }, null, 2)}\n`);
console.log(`capture-reader-first: ${entries.length} figure(s) at ${commit.slice(0, 10)} -> ${capturePath}`);
