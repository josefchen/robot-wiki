import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOGO_IMAGES } from '../../data/logo-images';
import { companyLogoIds } from '../../data/logos';
import { tileSheet } from '../../lib/visual-capture';
import { mapInOwnContext } from './helpers/per-route-context';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * The figure system on the static export: one tile for every company mark
 * (VAL-OPUS-010) and one crop, caption style and width for every
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
  key: string; file: string; background: string; padding: string; filter: string;
  rendered: string; opaque: number; share: number;
};

/**
 * Draw each mark with its computed filter and count the opaque pixels that
 * clear 3:1 against the computed tile colour. The mark is drawn at its own
 * resolution (long side capped at 600 px): on the market map's 36 px tile a
 * wide wordmark renders a few pixels tall, nearly every pixel there is a
 * semi-transparent edge, and that measures the size rather than the tile
 * treatment. The rendered size is recorded next to each share.
 */
async function readMarks(page: Page, route: string, tiles: string, keyAttr: string): Promise<MarkReading[]> {
  await page.goto(`http://localhost:${server.port}${route}`, { waitUntil: 'networkidle' });
  return page.evaluate(async ({ selector, attr }) => {
    const lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const lum = (c: number[]) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const rows = [];
    for (const tile of document.querySelectorAll<HTMLElement>(selector)) {
      const img = tile instanceof HTMLImageElement ? tile : tile.querySelector('img')!;
      img.loading = 'eager';
      await img.decode();
      const tileStyle = getComputedStyle(tile);
      // A mark without a tile sits on whatever its nearest painted ancestor paints.
      let painted: Element | null = tile;
      const paints = (el: Element) => !/rgba\(.*,\s*0\)$|transparent/.test(getComputedStyle(el).backgroundColor);
      while (painted && !paints(painted)) painted = painted.parentElement;
      const background = getComputedStyle(painted ?? document.documentElement).backgroundColor;
      const plate = background.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
      const box = img.getBoundingClientRect();
      const scale = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const g = canvas.getContext('2d')!;
      g.filter = getComputedStyle(img).filter;
      g.drawImage(img, 0, 0, w, h);
      const data = g.getImageData(0, 0, w, h).data;
      const plateL = lum(plate);
      let opaque = 0; let clear = 0;
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3] / 255;
        if (a < 0.5) continue;
        opaque++;
        const l = lum([0, 1, 2].map((j) => data[i + j] * a + plate[j] * (1 - a)));
        if ((Math.max(l, plateL) + 0.05) / (Math.min(l, plateL) + 0.05) >= 3) clear++;
      }
      const key = (tile.closest(`[${attr}]`) ?? tile).getAttribute(attr) ?? '';
      rows.push({
        key, file: img.getAttribute('src') ?? '', background,
        padding: tileStyle.padding, filter: getComputedStyle(img).filter,
        rendered: `${Math.round(box.width)}x${Math.round(box.height)}`,
        opaque, share: opaque ? Math.round((clear / opaque) * 1000) / 1000 : 0,
      });
    }
    return rows;
  }, { selector: tiles, attr: keyAttr });
}

// The second arm reads a pre-tile export, where each mark sat bare in its figure.
const CREDITS_TILES = 'main [data-logo-tile], main figure[data-figure-kind="official-mark"]:not(:has([data-logo-tile])) > img';
const MARKET_TILES = 'main [data-company-logo][data-logo-state="image"]';

test('every company mark sits on one tile and clears 3:1 against it (VAL-OPUS-010)', async ({ page }, info) => {
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
  const treatments = new Set([...credits, ...market].map((r) => `${r.background} | ${r.padding} | ${r.filter}`));
  writeEvidence(info.outputDir, 'logo-contrast.json', {
    treatment: [...treatments],
    whiteMarks: WHITE_MARKS.map((mark) => credits.find((r) => r.key.startsWith(mark))),
    credits, marketMap: market,
  });

  expect(credits.map((r) => r.key).sort()).toEqual(LOGO_IMAGES.map((i) => i.id).sort());
  expect(market).toHaveLength(companyLogoIds().length);
  expect(new Set(market.map((r) => r.file))).toEqual(new Set(credits.map((r) => r.file)));
  expect([...treatments], 'one tile treatment on both pages').toHaveLength(1);
  // A square tile drew the widest wordmarks 2 px high.
  const thin = market.filter((r) => Number(r.rendered.split('x')[1]) < 6).map((r) => `${r.key} ${r.rendered}`);
  expect(thin, 'market-map marks drawn under 6 px high').toEqual([]);

  const low = [...credits.map((r) => ['/credits/', r] as const), ...market.map((r) => ['/market-map/', r] as const)]
    .filter(([, r]) => r.opaque === 0 || r.share < 0.5)
    .map(([route, r]) => `${route} ${r.key} ${r.share}`);
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
