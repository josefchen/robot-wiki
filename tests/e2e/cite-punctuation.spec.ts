import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Citation-chip punctuation orphans. Chromium allows a line break between
 * the atomic inline-block <Cite> chip and a following plain-text punctuation
 * node, so a line could begin with a lone "." or "," — viewport-dependent,
 * measured corpus-wide at 647 chip-plus-punctuation cluster-ends across all
 * 35 articles (2026-08-14). The U+2060 word joiner was measured NOT to
 * suppress the break and CSS on the chip cannot bind it to a sibling text
 * node (library/content-pipeline.md), so lib/rehype-cite-punctuation.mjs
 * wraps each chip cluster and its trailing punctuation in one
 * whitespace-nowrap span at build time. The 32 hand-written wrappers that
 * preceded it in content/frontier/dexterity.mdx are removed; the plugin is
 * the only mechanism.
 *
 * The assertions are rendered line-box measurements, not DOM text: the
 * markup is identical either way and only the line breaking differs. A chip
 * whose trailing punctuation's range rect starts below the chip's own line
 * box is an orphan. The pre-fix build showed 142 orphan sightings across an
 * 85-width sweep of the four worst articles; the fixed build shows zero
 * (same detector, same widths). dexterity.mdx is included as the regression
 * control: its punctuation must stay bound with the hand-wrappers gone.
 *
 * Verified against the shipped artifact (static export on an OS-assigned
 * port, see static-export-server.ts) because the plugin only runs at build
 * time; the dev server and the export share the MDX pipeline, but the spec
 * convention for build-pipeline features is to test what ships.
 */

const WORST_ARTICLES = [
  '/rl-sim2real/sim2real-transfer/',
  '/rl-sim2real/reward-design-mpc/',
  '/rl-sim2real/humanoid-wbc/',
  '/rl-sim2real/parallel-sim-rl/',
  '/frontier/dexterity/',
] as const;

let server: StaticExportServer | null = null;
let BASE: string;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'index.html')),
    'out/ is missing: run `npm run build` before the cite-punctuation spec',
  ).toBe(true);
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

type OrphanFinding = {
  id: string | null;
  punct: string;
  chipTop: number;
  punctTop: number;
};

/**
 * Structural + rendered measurement in one pass. For every chip whose
 * following text node begins with sentence punctuation: (a) the chip must
 * sit directly inside a whitespace-nowrap wrapper, and (b) the punctuation
 * glyph's range rect must start on the chip's own line.
 */
function measure(page: Page) {
  return page.evaluate(() => {
    const chips = [...document.querySelectorAll('span[data-cite-id]')];
    const unwrapped: string[] = [];
    const orphans: OrphanFinding[] = [];
    let punctuated = 0;
    for (const chip of chips) {
      const next = chip.nextSibling;
      if (!next || next.nodeType !== Node.TEXT_NODE) continue;
      const value = next.nodeValue ?? '';
      const m = value.match(/^\s*[.,;:!?]/);
      if (!m) continue;
      punctuated++;
      const id = chip.getAttribute('data-cite-id');
      if (!chip.parentElement?.classList.contains('whitespace-nowrap')) {
        unwrapped.push(id ?? '(unknown)');
      }
      const off = m[0].length - 1;
      const range = document.createRange();
      range.setStart(next, off);
      range.setEnd(next, off + 1);
      const r = range.getClientRects()[0];
      const c = chip.getBoundingClientRect();
      if (r && r.top > c.top + c.height * 0.6) {
        orphans.push({
          id,
          punct: value[off],
          chipTop: Math.round(c.top),
          punctTop: Math.round(r.top),
        });
      }
    }
    return { punctuated, unwrapped, orphans };
  });
}

test.describe('cite punctuation binding', () => {
  for (const route of WORST_ARTICLES) {
    for (const width of [1440, 375]) {
      test(`${route} keeps punctuation on the chip's line at ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(BASE + route, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const { punctuated, unwrapped, orphans } = await measure(page);
        // Every cluster is plugin-wrapped (structure) ...
        expect(
          unwrapped,
          `punctuated chips outside a whitespace-nowrap wrapper: ${unwrapped.join(', ')}`,
        ).toEqual([]);
        // ... and the article actually carries clusters, so the structural
        // assertion cannot pass vacuously.
        expect(punctuated).toBeGreaterThan(10);
        // ... and no punctuation glyph renders on a lower line (rendered).
        expect(
          orphans,
          `orphaned punctuation: ${JSON.stringify(orphans)}`,
        ).toEqual([]);
      });
    }
  }

  test('sim2real-transfer stays orphan-free across a viewport sweep', async ({
    page,
  }) => {
    await page.goto(`${BASE}/rl-sim2real/sim2real-transfer/`, {
      waitUntil: 'networkidle',
    });
    await page.evaluate(() => document.fonts.ready);
    const sightings: Array<{ width: number; orphans: OrphanFinding[] }> = [];
    for (let width = 375; width <= 1440; width += 40) {
      await page.setViewportSize({ width, height: 900 });
      const { orphans } = await measure(page);
      if (orphans.length > 0) sightings.push({ width, orphans });
    }
    expect(
      sightings,
      `orphans at widths: ${JSON.stringify(sightings)}`,
    ).toEqual([]);
  });

  test('dexterity renders exactly the 32 plugin wrappers that replaced the hand-fix', async ({
    page,
  }) => {
    await page.goto(`${BASE}/frontier/dexterity/`, { waitUntil: 'networkidle' });
    const count = await page.evaluate(
      () =>
        // Count wrapper spans, not chips: a stacked cluster holds two chips
        // in one wrapper, and dexterity has three of those.
        [...document.querySelectorAll('span.whitespace-nowrap')].filter(
          (s) => s.querySelector(':scope > span[data-cite-id]'),
        ).length,
    );
    // The 32 hand-written wrappers were stripped from the MDX; the plugin
    // regenerates exactly one wrapper per cluster-end (32 on this article).
    expect(count).toBe(32);
  });
});
