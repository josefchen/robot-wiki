import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { forEachInOwnContext } from './helpers/per-route-context';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';
import { readStages, type StageRow } from './helpers/figure-light-stage';

/**
 * Every figure belongs to the page (owner decision 2026-10-02, which replaced
 * the graphite stage of VAL-OPUS-132). On the static export of every Sitemap
 * URL except `/` and `/playground/`, at 375 and 1440 px and at settle, each
 * figure's stage resolves to the page ground (paper, white or a light token),
 * and nothing inside the frame that covers a tenth of the stage or more paints
 * a dark surface, unless it is a data mark in its role colour. The JSDOM
 * figure-system check cannot see a panel painted with a token, so this reads
 * computed styles and boxes in the browser and screenshots any image, canvas
 * or video that large. Rows go to FIGURE_SYSTEM_EVIDENCE_OUT, or the test's
 * output folder, before the assertions run, so a run over an older export
 * (FIGURE_SYSTEM_EXPORT_ROOT) still records them.
 */
const EXPORT_ROOT = process.env.FIGURE_SYSTEM_EXPORT_ROOT ?? 'out';
const LIMIT = 0.1;
const tokens = JSON.parse(readFileSync('motion-tokens.json', 'utf8')) as {
  stage: { background: string };
  roles: Record<string, { stage: string }>;
};
const PAPER = tokens.stage.background.toUpperCase();
const ROLES = Object.values(tokens.roles).map((role) => role.stage.toUpperCase());
/** Light page grounds a stage may resolve to: paper, white and the light surface tints. */
const PAGE_GROUNDS = new Set([PAPER, '#FFFFFF']);

let server: StaticExportServer;
test.beforeAll(async () => {
  server = await startStaticExportServer(EXPORT_ROOT);
});
test.afterAll(async () => {
  await server.stop();
});

async function settle(page: Page) {
  // A closed disclosure lays out its figure but never paints it; a reader opens it with one click.
  await page.evaluate(() => document.querySelectorAll('main details:not([open])').forEach((d) => { (d as HTMLDetailsElement).open = true; }));
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.evaluate(() => document.fonts.ready);
}

/** The share of an image, canvas or video, by area of the stage, whose pixels are dark. */
async function rasterShare(page: Page, id: string, area: number): Promise<number | null> {
  const shot = await page.locator(`[data-light-probe="${id}"]`).screenshot({ timeout: 10_000 }).catch(() => null);
  if (!shot) return null;
  const { data, info } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const linear = (v: number) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  let dark = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (0.2126 * linear(data[i]) + 0.7152 * linear(data[i + 1]) + 0.0722 * linear(data[i + 2]) <= 0.1) dark++;
  }
  return Math.round((dark / (info.width * info.height)) * area * 1000) / 1000;
}

for (const width of [375, 1440]) {
  test(`every figure draws on the page ground at ${width}px`, async ({ browser }, info) => {
    test.setTimeout(30 * 60_000);
    const sitemap = [...readFileSync(join(EXPORT_ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => new URL(m[1]).pathname);
    // The playground's WebGL canvas is an instrument with its own rows.
    const routes = sitemap.filter((route) => route !== '/' && route !== '/playground/');
    const rows: (StageRow & { route: string })[] = [];
    const failures: string[] = [];
    await forEachInOwnContext(browser, routes, async (page, route) => {
      try {
        await page.goto(`http://localhost:${server.port}${route}`, { waitUntil: 'networkidle', timeout: 60_000 });
        await settle(page);
        const found = await page.evaluate(readStages, { limit: LIMIT, roles: ROLES });
        for (const row of found) {
          for (const raster of row.rasters) raster.dark = await rasterShare(page, raster.id, raster.area);
          rows.push({ route, ...row });
        }
      } catch (error) {
        failures.push(`${route}: ${String(error).slice(0, 160)}`);
      }
    }, { viewport: { width, height: 900 }, deviceScaleFactor: 1 });

    const dir = process.env.FIGURE_SYSTEM_EVIDENCE_OUT ?? info.outputDir;
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `light-stage-${width}.json`), `${JSON.stringify({ width, limit: LIMIT, stage: PAPER, routes: routes.length, figures: rows.length, failures, rows }, null, 1)}\n`);

    expect(failures, 'routes that did not load').toEqual([]);
    expect(sitemap, 'the instrument route this sweep leaves to its own rows').toContain('/playground/');
    expect(rows.length, 'figures probed').toBeGreaterThan(0);
    const shown = rows.filter((row) => row.stageArea > 0);
    const problems = shown.flatMap((row) => {
      const found: string[] = [];
      if (!PAGE_GROUNDS.has(row.stage ?? '') && row.stage !== 'raster') found.push(`stage ${row.stage}`);
      if (row.dark && row.dark.share >= LIMIT) found.push(`${row.dark.at} paints ${row.dark.colour} over ${row.dark.share} of the stage`);
      for (const raster of row.rasters) if (raster.dark == null || raster.dark >= LIMIT) found.push(`raster ${raster.id} dark share ${raster.dark ?? 'not measured'}`);
      return found.length ? [{ key: `${row.route} ${row.figure}`, found }] : [];
    });
    expect(problems.map(({ key, found }) => `${key}: ${found.join('; ')}`), 'stages off the page ground, and dark areas of a tenth of the stage or more').toEqual([]);
    expect(shown.flatMap((row) => row.signal.map((at) => `${row.route} ${row.figure} ${at}`)), 'signal blue on a data mark').toEqual([]);
  });
}
