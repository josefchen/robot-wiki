import { chromium, expect, test, type Browser } from '@playwright/test';
import { join } from 'node:path';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Search placeholder fit (VAL-DESIGN-023), measured on the shipped artifact
 * in out/.
 *
 * The measurement is the text advance of the placeholder string in the
 * input's own computed font against the input's own content box, not
 * `scrollWidth`: a placeholder is not part of the input's value, so
 * scrollWidth reports no overflow at all and a naive check passes on a
 * placeholder that is visibly cut mid-word.
 *
 * Baseline before the fix (measured 2026-08-21 on the then-current export):
 * the 38-character placeholder needed 262.56px in the sidebar's 187px content
 * box, overflowing by 75.56px at 1024, 1280 and 1440; by 42.56px in the
 * drawer at 390px and 43.56px at 375px; and by 25.06px on /search at 375px.
 */

const OUT = join(process.cwd(), 'out');

/** The assertion's own bound on a replacement placeholder. */
const MAX_CHARS = 22;
const BANNED_DASHES = /[\u2013\u2014]/;
const BARE_INSTRUCTION = /^(search|find|type|enter)\b/i;

interface Surface {
  name: string;
  route: string;
  selector: string;
  widths: number[];
  openDrawer?: boolean;
}

const SURFACES: Surface[] = [
  {
    name: 'sidebar search input',
    route: '/manipulation/pi-line/',
    selector: '#sidebar-search-input',
    widths: [1024, 1280, 1440],
  },
  {
    name: 'drawer search input',
    route: '/manipulation/pi-line/',
    selector: '#drawer-search-input',
    widths: [390, 375],
    openDrawer: true,
  },
  {
    name: 'search page input',
    route: '/search/',
    selector: '#search-page-input',
    widths: [390, 375, 1440],
  },
];

interface Measurement {
  clientWidth: number;
  paddingLeft: number;
  paddingRight: number;
  borderLeft: number;
  borderRight: number;
  contentBox: number;
  font: string;
  placeholder: string;
  chars: number;
  advance: number;
  overflow: number;
}

let server: StaticExportServer;
let browser: Browser;

test.beforeAll(async () => {
  server = await startStaticExportServer(OUT);
  browser = await chromium.launch();
});

test.afterAll(async () => {
  await browser?.close();
  await server?.stop();
});

async function measure(
  surface: Surface,
  width: number,
): Promise<Measurement> {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.port}${surface.route}`);
  if (surface.openDrawer) {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await expect(page.locator(surface.selector)).toBeVisible();
  }
  const measurement = await page
    .locator(surface.selector)
    .evaluate((element) => {
      const input = element as HTMLInputElement;
      const style = getComputedStyle(input);
      const paddingLeft = Number.parseFloat(style.paddingLeft);
      const paddingRight = Number.parseFloat(style.paddingRight);
      // clientWidth already excludes borders, so the content box is
      // clientWidth minus padding only.
      const contentBox = input.clientWidth - paddingLeft - paddingRight;
      const canvas = document.createElement('canvas');
      const context2d = canvas.getContext('2d');
      if (!context2d) throw new Error('no 2d context for text measurement');
      context2d.font = style.font;
      const advance = context2d.measureText(input.placeholder).width;
      return {
        clientWidth: input.clientWidth,
        paddingLeft,
        paddingRight,
        borderLeft: Number.parseFloat(style.borderLeftWidth),
        borderRight: Number.parseFloat(style.borderRightWidth),
        contentBox,
        font: style.font,
        placeholder: input.placeholder,
        chars: input.placeholder.length,
        advance,
        overflow: advance - contentBox,
      };
    });
  await context.close();
  return measurement;
}

test.describe('search placeholder fit (VAL-DESIGN-023)', () => {
  for (const surface of SURFACES) {
    for (const width of surface.widths) {
      test(`${surface.name} at ${width}px renders its placeholder in full`, async () => {
        const m = await measure(surface, width);
        // 1px of subpixel-rounding tolerance, and no more.
        expect(
          m.overflow,
          `${surface.name} @${width}px: "${m.placeholder}" (${m.chars} chars) ` +
            `advance ${m.advance.toFixed(2)}px in a ${m.contentBox.toFixed(2)}px ` +
            `content box (clientWidth ${m.clientWidth}, padding ` +
            `${m.paddingLeft}/${m.paddingRight}, border ${m.borderLeft}/${m.borderRight}, ` +
            `font ${m.font})`,
        ).toBeLessThanOrEqual(1);
      });
    }

    test(`${surface.name} keeps a useful placeholder within the bound`, async () => {
      const m = await measure(surface, surface.widths[0]);
      expect(m.chars).toBeLessThanOrEqual(MAX_CHARS);
      // An example query, not an instruction: the placeholder's job is to
      // show what a query looks like on this site.
      expect(m.placeholder).not.toMatch(BARE_INSTRUCTION);
      expect(m.placeholder.trim()).not.toBe('Search');
      expect(m.placeholder.trim()).not.toBe('Search the wiki');
      expect(m.placeholder).not.toMatch(BANNED_DASHES);
    });
  }

  test('all three surfaces advertise the same example query', async () => {
    const placeholders: string[] = [];
    for (const surface of SURFACES) {
      placeholders.push((await measure(surface, surface.widths[0])).placeholder);
    }
    expect(new Set(placeholders).size).toBe(1);
  });

  test('the search page input keeps its label and accessible name (VAL-SEARCH-001)', async () => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.port}/search/`);
    await expect(
      page.getByRole('searchbox', { name: 'Search the wiki' }),
    ).toBeVisible();
    await context.close();
  });

  test('the shell search entry point still reaches /search (VAL-NAV-017)', async () => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.port}/manipulation/pi-line/`);
    const input = page.locator('#sidebar-search-input');
    await input.fill('chunk size');
    await input.press('Enter');
    await page.waitForURL(/\/search\/?\?q=chunk\+size|\/search\/?\?q=chunk%20size/);
    await expect(page.locator('#search-page-input')).toHaveValue('chunk size');
    await context.close();
  });
});
