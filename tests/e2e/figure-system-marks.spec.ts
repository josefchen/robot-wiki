import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOGO_IMAGES } from '../../data/logo-images';
import { companyLogoIds } from '../../data/logos';
import { WITHHELD_MARKS } from '../../lib/market-map-marks';
import { tileSheet } from '../../lib/visual-capture';
import { mapInOwnContext } from './helpers/per-route-context';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * The figure system on the static export: one plate-less, single-ink
 * treatment for every company mark (VAL-OPUS-010, successor of 19 October
 * 2026) and one crop, caption style and width for every
 * photograph (VAL-OPUS-012). Each test writes its measured table, and the
 * mark test a contact sheet of each page's tiles, to
 * FIGURE_SYSTEM_EVIDENCE_OUT (or the test's output folder) before it
 * asserts, so a run over an older export (FIGURE_SYSTEM_EXPORT_ROOT)
 * still records what that export shows.
 */
const EXPORT_ROOT = process.env.FIGURE_SYSTEM_EXPORT_ROOT ?? 'out';
let server: StaticExportServer;
test.beforeAll(async () => {
  server = await startStaticExportServer(EXPORT_ROOT);
});
test.afterAll(async () => {
  await server.stop();
});

function evidenceDir(outputDir: string): string {
  const dir = process.env.FIGURE_SYSTEM_EVIDENCE_OUT ?? outputDir;
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeEvidence(outputDir: string, name: string, data: unknown) {
  writeFileSync(join(evidenceDir(outputDir), name), `${JSON.stringify(data, null, 1)}\n`);
}

/** The marks the owner audit named as invisible on their old tile. */
const WHITE_MARKS = ['ubtech', 'skild', 'dyna', 'leju', 'paxini', 'coco', 'knightscope', 'diligent', 'brain-corp'];

type MarkReading = {
  key: string; file: string; mode: string; background: string; padding: string; border: string; filter: string;
  ink: string; ground: string; contrast: number; rendered: string; opaque: number; share: number;
};

/**
 * Read each mark as the page draws it: the outer box must paint nothing
 * (no background, padding, border or filter), the only paint is the ink
 * layer's background shown through the mask, and every pixel the mask
 * lets through is that one ink. So the share of the mask's opaque pixels
 * that clear 3:1 against the ground the mark sits on is the ink's contrast
 * with that ground, for all of them or none. The mask is read from the file
 * at its own resolution (long side capped at 600 px) by its recorded mode
 * (alpha; luminance; alpha less luminance), and its opaque count recorded,
 * so a file that masks nothing is caught.
 */
async function readMarks(page: Page, route: string, tiles: string, keyAttr: string): Promise<MarkReading[]> {
  await page.goto(`http://localhost:${server.port}${route}`, { waitUntil: 'networkidle' });
  return page.evaluate(async ({ selector, attr }) => {
    const lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const lum = (c: number[]) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const rgb = (value: string) => value.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
    const rows = [];
    for (const mark of document.querySelectorAll<HTMLElement>(selector)) {
      const inkEl = mark.querySelector<HTMLElement>('[data-logo-ink]')!;
      const outer = getComputedStyle(mark);
      const inner = getComputedStyle(inkEl);
      // The ground: the nearest painted ancestor.
      let painted: Element | null = mark.parentElement;
      const paints = (el: Element) => !/rgba\(.*,\s*0\)$|transparent/.test(getComputedStyle(el).backgroundColor);
      while (painted && !paints(painted)) painted = painted.parentElement;
      const ground = getComputedStyle(painted ?? document.documentElement).backgroundColor;
      const inkL = lum(rgb(inner.backgroundColor));
      const groundL = lum(rgb(ground));
      const contrast = (Math.max(inkL, groundL) + 0.05) / (Math.min(inkL, groundL) + 0.05);
      const file = mark.getAttribute('data-logo-src') ?? '';
      const mode = mark.getAttribute('data-logo-ink-mode') ?? 'alpha';
      const img = new Image();
      img.src = file;
      await img.decode();
      const scale = Math.min(1, 600 / Math.max(img.naturalWidth || 600, img.naturalHeight || 600));
      const w = Math.max(1, Math.round((img.naturalWidth || 600) * scale));
      const h = Math.max(1, Math.round((img.naturalHeight || 600) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const g = canvas.getContext('2d')!;
      g.drawImage(img, 0, 0, w, h);
      const data = g.getImageData(0, 0, w, h).data;
      let opaque = 0;
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3] / 255;
        const l = (0.2125 * data[i] + 0.7154 * data[i + 1] + 0.0721 * data[i + 2]) / 255;
        const m = mode === 'light' ? l * a : mode === 'dark' ? a * (1 - l * a) : a;
        if (m >= 0.5) opaque++;
      }
      const box = mark.getBoundingClientRect();
      rows.push({
        key: (mark.closest(`[${attr}]`) ?? mark).getAttribute(attr) ?? '', file, mode,
        background: outer.backgroundColor, padding: outer.padding,
        border: [outer.borderTopWidth, outer.borderRightWidth, outer.borderBottomWidth, outer.borderLeftWidth].join(' '),
        filter: [outer.filter, inner.filter].join(' '), ink: inner.backgroundColor, ground,
        contrast: Math.round(contrast * 100) / 100,
        rendered: `${Math.round(box.width)}x${Math.round(box.height)}`,
        opaque, share: opaque && contrast >= 3 ? 1 : 0,
      });
    }
    return rows;
  }, { selector: tiles, attr: keyAttr });
}

const CREDITS_TILES = 'main [data-logo-mark]';
const MARKET_TILES = 'main [data-company-logo][data-logo-state="image"]';

test('every company mark is drawn plate-less in one ink that clears 3:1 (VAL-OPUS-010)', async ({ page }, info) => {
  test.setTimeout(180_000);
  const sheet = async (name: string, selector: string, labelAttr: string) => {
    if (await page.evaluate(tileSheet, { selector, labelAttr })) {
      await page.locator('#tile-sheet').screenshot({ path: join(evidenceDir(info.outputDir), name), type: 'jpeg', quality: 80 });
    }
  };
  const credits = await readMarks(page, '/credits/', CREDITS_TILES, 'data-image-id');
  await sheet('logo-sheet-credits.jpg', CREDITS_TILES, 'data-image-id');
  const market = await readMarks(page, '/market-map/', MARKET_TILES, 'data-company-logo');
  await sheet('logo-sheet-market-map.jpg', MARKET_TILES, 'data-company-logo');
  const treatments = new Set([...credits, ...market].map((r) => `${r.background} | ${r.padding} | ${r.border} | ${r.filter} | ${r.ink}`));
  writeEvidence(info.outputDir, 'logo-contrast.json', {
    treatment: [...treatments],
    whiteMarks: WHITE_MARKS.map((mark) => credits.find((r) => r.key.startsWith(mark))),
    credits, marketMap: market,
  });

  // A withheld file (it shows another company's artwork) is drawn on
  // neither page: /credits leaves it out, the map shows the name.
  const withheld = Object.keys(WITHHELD_MARKS);
  expect(credits.map((r) => r.key).sort()).toEqual(
    LOGO_IMAGES.map((i) => i.id).filter((id) => !withheld.includes(id)).sort(),
  );
  expect(market).toHaveLength(companyLogoIds().length - withheld.length);
  await page.goto(`http://localhost:${server.port}/credits/`, { waitUntil: 'networkidle' });
  for (const id of withheld) {
    await expect(page.locator(`[data-credits-entry="${id}"]`)).toHaveCount(0);
    const file = LOGO_IMAGES.find((image) => image.id === id)!.file;
    await expect(page.locator(`img[src="${file}"], [data-logo-src="${file}"]`)).toHaveCount(0);
  }
  expect(new Set(market.map((r) => r.file))).toEqual(new Set(credits.map((r) => r.file)));
  // One treatment on both pages: no plate, padding, border or filter, and
  // the ink is the secondary ink token.
  expect([...treatments], 'one mark treatment on both pages').toEqual([
    'rgba(0, 0, 0, 0) | 0px | 0px 0px 0px 0px | none none | rgb(108, 107, 102)',
  ]);
  // A square tile drew the widest wordmarks 2 px high, the fixed 96 x 36
  // tile Apptronik's 7 px high; every mark now draws at least 10 px.
  const thin = market.filter((r) => Number(r.rendered.split('x')[1]) < 10).map((r) => `${r.key} ${r.rendered}`);
  expect(thin, 'market-map marks drawn under 10 px high').toEqual([]);

  const low = [...credits.map((r) => ['/credits/', r] as const), ...market.map((r) => ['/market-map/', r] as const)]
    .filter(([, r]) => r.opaque === 0 || r.share < 0.5)
    .map(([route, r]) => `${route} ${r.key} ${r.share} ${r.contrast}`);
  expect(low, 'marks with under half their pixels at 3:1').toEqual([]);

  for (const mark of WHITE_MARKS) {
    const hits = credits.filter((r) => r.key.startsWith(mark));
    expect(hits, `named white mark ${mark}`).toHaveLength(1);
  }
});

const exportRoutes = [...readFileSync(join(EXPORT_ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => new URL(m[1]).pathname);
const photoRoutes = exportRoutes.filter((route) =>
  readFileSync(join(EXPORT_ROOT, route, 'index.html'), 'utf8').includes('data-figure-kind="photograph"'));

for (const width of [375, 1440]) {
  test(`every photograph takes one 3:2 crop, caption style and width at ${width}px (VAL-OPUS-012)`, async ({ browser }, info) => {
    test.setTimeout(120_000);
    expect(photoRoutes.length).toBeGreaterThan(0);
    const perRoute = await mapInOwnContext(browser, photoRoutes, async (page, route) => {
      await page.goto(`http://localhost:${server.port}${route}`, { waitUntil: 'networkidle' });
      return page.evaluate((path) => [...document.querySelectorAll('main figure[data-figure-kind="photograph"]')].map((figure) => {
        const img = figure.querySelector('img')!;
        // Before the crop frame existed the photograph was its own box.
        const frameEl = figure.querySelector('[data-photo-frame]') ?? img;
        const frame = frameEl.getBoundingClientRect();
        const caption = getComputedStyle(figure.querySelector('figcaption')!);
        const box = img.getBoundingClientRect();
        return {
          route: path, id: figure.getAttribute('data-image-id'), width: Math.round(figure.getBoundingClientRect().width),
          ratio: Math.round((frame.width / frame.height) * 1000) / 1000, fit: getComputedStyle(img).objectFit,
          // The padding box, so the check holds wherever the hairline border sits.
          fills: Math.abs(box.width - frameEl.clientWidth) < 1 && Math.abs(box.height - frameEl.clientHeight) < 1,
          caption: `${caption.fontFamily.split(',')[0]} ${caption.fontSize}/${caption.lineHeight} ${caption.color}`,
          credited: !!figure.querySelector('[data-image-credit]'),
        };
      }), route);
    }, { viewport: { width, height: 900 } });
    const rows = perRoute.flat();
    writeEvidence(info.outputDir, `photos-${width}.json`, rows);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Math.abs(row.ratio - 1.5), `${row.route} ${row.id} ratio`).toBeLessThanOrEqual(0.015);
      expect([row.fit, row.fills, row.credited], `${row.route} ${row.id}`).toEqual(['cover', true, true]);
    }
    expect(new Set(rows.map((r) => r.caption)).size, 'one caption style').toBe(1);
    expect(new Set(rows.map((r) => r.width)).size, 'one photo width').toBe(1);
  });
}
