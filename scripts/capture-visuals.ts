/**
 * The capture test: every visual on every Sitemap URL of the static export,
 * screenshotted, with a per-visual manifest, per-route DOM counts and
 * contact sheets. Ported from the owner's visual-audit capture script.
 *
 *   node scripts/capture-visuals.ts --root out --out <dir> [--width 1440] [--port 3201] [--routes /,/credits/]
 *   node scripts/capture-visuals.ts --before <dir> --after <dir> --out <dir> [--routes /,/credits/]
 *
 * The first form exits 1 on a route that fails to load, a screenshot that
 * fails or comes out blank, or a route whose settled DOM count differs
 * from its manifest. The second form writes before/after pair sheets: for
 * the named routes, or else every pair whose screenshots differ.
 */
import { chromium, type Browser } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  censusVisuals,
  imageSpread,
  serveExport,
  sitemapRoutes,
  tokenPalette,
  type VisualEntry,
} from '../lib/visual-capture.ts';
import { pairHtml, pairVisuals, sheetHtml } from '../lib/visual-capture-sheets.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};
const out = resolve(option('--out', 'tmp/capture'));
const routeList = option('--routes', '');
const PER_SHEET = 24;
const PAIRS_PER_SHEET = 10;

function chunks<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
}

async function screenshotSheets(browser: Browser, sheets: { name: string; html: string }[]) {
  const dir = join(out, 'sheets');
  mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const { name, html } of sheets) {
    const file = join(dir, `${name}.html`);
    writeFileSync(file, html);
    await page.goto(`file://${file}`, { waitUntil: 'load' });
    await page.screenshot({ path: join(dir, `${name}.jpg`), fullPage: true, type: 'jpeg', quality: 80 });
  }
  await page.close();
}

async function settle(page: import('playwright').Page) {
  // A closed disclosure (the reasoning under a prediction) still lays out
  // its visuals but never paints them, so they could not be screenshotted;
  // the reader opens it with one click, and the capture does the same.
  await page.evaluate(() => document.querySelectorAll('main details:not([open])').forEach((d) => { (d as HTMLDetailsElement).open = true; }));
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await page.evaluate(() => document.fonts.ready);
}

async function capture() {
  const root = resolve(option('--root', 'out'));
  const width = Number(option('--width', '1440'));
  const routes = routeList ? routeList.split(',') : sitemapRoutes(root);
  const { server, base } = await serveExport(root, Number(option('--port', '0')));
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  mkdirSync(join(out, 'shots'), { recursive: true });
  const manifest: VisualEntry[] = [];
  const counts: Record<string, { dom: number; manifest: number }> = {};
  const failures: string[] = [];
  let palette: string[] = [];
  for (const route of routes) {
    const slug = route.replace(/^\/|\/$/g, '').replace(/\//g, '__') || 'home';
    const page = await context.newPage();
    try {
      await page.goto(base + route, { waitUntil: 'networkidle', timeout: 120_000 });
      await settle(page);
      if (!palette.length) palette = await page.evaluate(tokenPalette);
      const visuals = (await page.evaluate(censusVisuals, true)).filter((v) => v.kind !== 'table');
      for (const v of visuals) {
        const file = `${slug}__${String(v.idx).padStart(2, '0')}.png`;
        try {
          const shot = await page.locator(`[data-audit-id="${v.idx}"]`).screenshot({ path: join(out, 'shots', file), timeout: 15_000 });
          const spread = await page.evaluate(imageSpread, `data:image/png;base64,${shot.toString('base64')}`);
          if (spread < 1) throw new Error(`blank screenshot (luminance spread ${spread.toFixed(2)})`);
          v.file = file;
        } catch (error) {
          v.error = String(error).slice(0, 160);
          failures.push(`${route} #${v.idx}: ${v.error}`);
        }
        v.route = route;
        v.offpal = [...new Set(Object.keys(v.colours).map((c) => c.split('@')[0]))].filter((c) => !palette.includes(c));
        manifest.push(v);
      }
      const settled = (await page.evaluate(censusVisuals, false)).filter((v) => v.kind !== 'table').length;
      counts[route] = { dom: settled, manifest: visuals.filter((v) => v.file).length };
      if (settled !== counts[route].manifest) failures.push(`${route}: DOM ${settled} vs manifest ${counts[route].manifest}`);
      console.log(`${route} ${visuals.length}`);
    } catch (error) {
      failures.push(`${route}: ${String(error).slice(0, 160)}`);
    }
    await page.close();
  }
  writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 1)}\n`);
  writeFileSync(join(out, 'counts.json'), `${JSON.stringify({ width, routes: routes.length, counts, palette, failures }, null, 1)}\n`);
  const prefix = `file://${join(out, 'shots')}/`;
  await screenshotSheets(browser, chunks(manifest, PER_SHEET).map((entries, i) => ({
    name: `sheet-${String(i + 1).padStart(2, '0')}`,
    html: sheetHtml(`Capture at ${width}px, sheet ${i + 1}`, entries, prefix),
  })));
  await browser.close();
  server.close();
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exit(1);
  }
}

async function pair() {
  const beforeDir = resolve(option('--before', ''));
  const afterDir = resolve(option('--after', ''));
  const read = (dir: string) => JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as VisualEntry[];
  const [before, after] = [read(beforeDir), read(afterDir)];
  const digest = (dir: string, entry: VisualEntry | undefined) =>
    entry?.file ? createHash('sha256').update(readFileSync(join(dir, 'shots', entry.file))).digest('hex') : null;
  // Without --routes, every route of either run, keeping only the pairs whose pixels differ.
  const routes = routeList ? routeList.split(',') : [...new Set([...before, ...after].map((v) => v.route ?? ''))];
  const rows = routes.flatMap((route) =>
    pairVisuals(before.filter((v) => v.route === route), after.filter((v) => v.route === route)).map(([b, a]) => ({
      route, b, a, changed: digest(beforeDir, b) !== digest(afterDir, a),
    }))).filter((row) => routeList || row.changed);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'pairs.json'), `${JSON.stringify(rows.map(({ route, b, a, changed }) => ({
    route, changed,
    before: b ? { idx: b.idx, label: b.label, file: b.file } : null, after: a ? { idx: a.idx, label: a.label, file: a.file } : null,
  })), null, 1)}\n`);
  const sheets = chunks(rows, PAIRS_PER_SHEET).map((sheet) =>
    [...new Set(sheet.map((row) => row.route))].map((route) => ({
      route, pairs: sheet.filter((row) => row.route === route).map(({ b, a }) => [b, a] as [VisualEntry | undefined, VisualEntry | undefined]),
    })));
  const browser = await chromium.launch();
  await screenshotSheets(browser, sheets.map((groups, i) => ({
    name: `pairs-${String(i + 1).padStart(2, '0')}`,
    html: pairHtml(`Before and after, sheet ${i + 1}`, groups, `file://${beforeDir}/shots/`, `file://${afterDir}/shots/`),
  })));
  await browser.close();
}

await (args.includes('--before') ? pair() : capture());
