import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { forEachInOwnContext } from './helpers/per-route-context';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';
import { ACCENT_ROLE_PROPERTIES, readStages, type StageRow } from './helpers/figure-light-stage';

/**
 * Every figure belongs to the page (owner decision 2026-10-02, which replaced
 * the graphite stage of VAL-OPUS-132). On the static export of every Sitemap
 * URL except `/`, at 375 and 1440 px and at settle, each figure's stage
 * resolves to the page ground (paper, white or a light token),
 * and nothing inside the frame that covers a tenth of the stage or more paints
 * a dark surface, unless it is a data mark in its role colour. The JSDOM
 * figure-system check cannot see a panel painted with a token, so this reads
 * computed styles and boxes in the browser and screenshots any image, canvas
 * or video that large.
 *
 * Accent marks (successor of 19 October 2026 to the 1 to 2 October check
 * that kept the bright signal blue off data marks; contract/design-integrity.md
 * VAL-B2-VIZ-003): the owner decision of 10 October made #3B6EA8 the one muted
 * accent, the runtime signal token, and the isometric directive of 12 October
 * gives each such figure one lit part. So no figure geometry, links included,
 * may paint a retired signal blue (#245FFF of the brand-v2 palette, #245EDB of
 * VAL-B2-RES-003), and the accent may reach a figure geometry only through
 * the highlight role (--role-highlight-*) or the kit's lit part
 * (--anatomy-lit). The planted test at the end proves each clause fails when
 * a mark breaks it. Rows go to FIGURE_SYSTEM_EVIDENCE_OUT, or the test's
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
/** The retired signal blues: the brand-v2 signal and the earlier value VAL-B2-RES-003 retires. */
const RETIRED = ['#245FFF', '#245EDB'];
const STAGE_ARGS = { limit: LIMIT, roles: ROLES, retired: RETIRED, accentRoles: ACCENT_ROLE_PROPERTIES };
/**
 * The page's own paper, from app/globals.css. The research-page standard of
 * 2026-10-10 made it #FAFAF8 while the motion stage stayed white, and a
 * figure drawn straight on the page resolves to it.
 */
const PAGE_PAPER = readFileSync('app/globals.css', 'utf8').match(/--color-paper:\s*(#[0-9A-Fa-f]{6});/)?.[1]?.toUpperCase();
if (!PAGE_PAPER) throw new Error('--color-paper is not declared in app/globals.css');
/** Light page grounds a stage may resolve to: the page paper, the motion stage's paper and white. */
const PAGE_GROUNDS = new Set([PAGE_PAPER, PAPER, '#FFFFFF']);

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
    // The playground's WebGL canvas is held to the same light page ground
    // (owner request of 2026-10-19, which retired the graphite instrument of
    // VAL-B2-PLAY-001 in favour of the explainers' light clay stage).
    const routes = sitemap.filter((route) => route !== '/');
    const rows: (StageRow & { route: string })[] = [];
    const failures: string[] = [];
    await forEachInOwnContext(browser, routes, async (page, route) => {
      try {
        await page.goto(`http://localhost:${server.port}${route}`, { waitUntil: 'networkidle', timeout: 60_000 });
        if (route === '/playground/') {
          // Probe the canvas with the arm drawn on it, not the empty stage.
          await expect(page.getByTestId('playground')).toHaveAttribute('data-playground-state', 'ready', { timeout: 60_000 });
          await expect(page.getByTestId('playground-viewport')).toHaveAttribute('data-scene-ready', 'true', { timeout: 30_000 });
        }
        await settle(page);
        const found = await page.evaluate(readStages, STAGE_ARGS);
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
    expect(sitemap).toContain('/playground/');
    const playground = rows.filter((row) => row.route === '/playground/' && row.stage === 'raster');
    expect(playground.length, 'the playground canvas is probed as a raster stage').toBeGreaterThan(0);
    expect(playground.every((row) => row.rasters.every((raster) => raster.dark != null)), 'the playground canvas was measured').toBe(true);
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
    expect(shown.flatMap((row) => row.retired.map((at) => `${row.route} ${row.figure} ${at}`)), 'a retired signal blue on a figure mark').toEqual([]);
    expect(shown.flatMap((row) => row.offRoleAccent.map((at) => `${row.route} ${row.figure} ${at}`)), 'the accent outside the highlight role and the lit part').toEqual([]);
  });
}

test('a planted retired blue and a planted off-role accent each fail, and the two allowed accent paints pass', async ({ browser }) => {
  for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(`http://localhost:${server.port}/rl-sim2real/reward-design-mpc/`, { waitUntil: 'networkidle', timeout: 60_000 });
    // One drawing in a real figure frame: the retired blue, the accent as a
    // literal, the accent through the alias the signal token feeds, and the
    // two allowed paints, each mark named by its data attribute.
    const planted = await page.evaluate(() => {
      const frame = document.querySelector('main [data-figure-frame]');
      const stage = frame?.querySelector('[data-figure-stage]') ?? frame;
      if (!stage) return false;
      stage.insertAdjacentHTML('beforeend', `
        <svg data-planted="drawing" viewBox="0 0 200 100" width="200" height="100" role="img" aria-label="planted marks">
          <rect data-planted="retired-fill" x="0" y="0" width="20" height="20" fill="#245FFF" />
          <line data-planted="retired-stroke" x1="0" y1="30" x2="40" y2="30" stroke="#245EDB" />
          <rect data-planted="literal-accent" x="30" y="0" width="20" height="20" fill="#3B6EA8" />
          <rect data-planted="alias-accent" x="60" y="0" width="20" height="20" style="fill: var(--color-accent)" />
          <rect data-planted="highlight-role" x="90" y="0" width="20" height="20" style="fill: var(--role-highlight-stage)" />
          <g class="iso"><path data-planted="lit-part" d="M120 0 L140 0 L140 20 Z" style="fill: none; stroke: var(--anatomy-lit)" /></g>
        </svg>`);
      return true;
    });
    expect(planted, 'a figure frame to plant into').toBe(true);
    const rows = await page.evaluate(readStages, STAGE_ARGS);
    const row = rows.find((candidate) => candidate.retired.some((at) => at.includes('data-planted')) || candidate.offRoleAccent.some((at) => at.includes('data-planted')));
    expect(row, 'the frame holding the planted drawing was read').toBeDefined();
    const named = (list: string[]) => list.filter((at) => at.includes('data-planted')).map((at) => at.match(/data-planted="([^"]+)"/)![1]).sort();
    // Clause (a): both retired blues fail, as fill and as stroke.
    expect(named(row!.retired)).toEqual(['retired-fill', 'retired-stroke']);
    // Clause (b): the accent as a literal and through the signal alias fails;
    // the highlight role and the lit part are the only paints that pass.
    expect(named(row!.offRoleAccent)).toEqual(['alias-accent', 'literal-accent']);
    expect(row!.roleAccent).toBeGreaterThanOrEqual(2);
    await context.close();
  }
});
