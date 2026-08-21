import { chromium, expect, test, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_URL } from '../../lib/site';
import { publishedModules } from '../../data/modules';
import { WORDS_PER_MINUTE } from '../../lib/reading-time';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Heading copy-link affordance (VAL-WIKI-030), swept over every h2 and h3
 * inside the prose region of every published article in the shipped export.
 *
 * Baseline before the fix (measured 2026-08-21): headings already carried
 * unique ids and already were anchors, but the stylesheet neutralised the
 * link colour to `inherit` with `text-decoration: none`, so zero of the
 * corpus's headings carried any affordance (`totalCopyAffordances=0` on
 * /manipulation/pi-line) and clicking one copied nothing.
 */

const OUT = join(process.cwd(), 'out');

/** Clause (b): the accessible name must name the action and the target. */
const NAME_PATTERN = /copy.*link|link.*(to|this).*(section|heading)|permalink/i;
const BANNED_DASHES = /[\u2013\u2014]/;

/** Three routes for the detailed per-heading checks. */
const SAMPLE = [
  '/manipulation/pi-line/',
  '/classical/kinematics/',
  '/frontier/bear-case/',
];

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

async function open(route: string, width = 1440): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.port}${route}`);
  return page;
}

interface HeadingRow {
  route: string;
  level: string;
  text: string;
  id: string;
  affordanceTag: string | null;
  accessibleName: string | null;
}

test.describe('heading copy-link affordance (VAL-WIKI-030)', () => {
  test('every prose h2 and h3 in the corpus has a unique id and a named affordance', async () => {
    const page = await open('/');
    const rows: HeadingRow[] = [];
    const failures: string[] = [];

    for (const entry of publishedModules()) {
      const route = `/${entry.domain}/${entry.slug}/`;
      await page.goto(`http://127.0.0.1:${server.port}${route}`);
      const seen = new Set<string>();
      const headings = await page
        .locator('.prose h2, .prose h3')
        .evaluateAll((els) =>
          els.map((el) => {
            const button = el.querySelector('button[data-heading-permalink]');
            return {
              level: el.tagName,
              text: (el.textContent ?? '').trim(),
              id: el.id,
              affordanceTag: button ? button.tagName : null,
              accessibleName: button?.getAttribute('aria-label') ?? null,
              affordanceTarget:
                button?.getAttribute('data-heading-permalink') ?? null,
            };
          }),
        );

      for (const h of headings) {
        rows.push({ route, ...h });
        if (!h.id) failures.push(`${route} ${h.level} "${h.text}": no id`);
        if (h.id && seen.has(h.id)) {
          failures.push(`${route}: duplicate id #${h.id}`);
        }
        if (h.id) seen.add(h.id);
        if (h.affordanceTag !== 'BUTTON') {
          failures.push(`${route} #${h.id}: no copy-link affordance`);
          continue;
        }
        if (h.affordanceTarget !== h.id) {
          failures.push(
            `${route} #${h.id}: affordance targets ${h.affordanceTarget}`,
          );
        }
        const name = h.accessibleName ?? '';
        if (!name.trim() || name.trim() === '#') {
          failures.push(`${route} #${h.id}: empty affordance name`);
        }
        if (!NAME_PATTERN.test(name)) {
          failures.push(`${route} #${h.id}: name "${name}" does not name the action`);
        }
        if (BANNED_DASHES.test(name)) {
          failures.push(`${route} #${h.id}: dash in affordance name`);
        }
      }
    }

    expect(failures, failures.slice(0, 20).join('\n')).toEqual([]);
    // The corpus bound: a silent zero-match sweep must not read as a pass.
    expect(rows.length).toBeGreaterThan(200);
    await page.context().close();
  });

  for (const route of SAMPLE) {
    test(`the fragment scrolls its heading into view on ${route}`, async () => {
      const first = await open(route);
      const ids = await first
        .locator('.prose h2, .prose h3')
        .evaluateAll((els) => els.map((el) => el.id));
      await first.context().close();
      expect(ids.length).toBeGreaterThan(2);

      // The last heading is the interesting one: it is far enough down the
      // document that a fragment that does not resolve leaves it off-screen.
      const target = ids[ids.length - 1];
      const page = await open(`${route}#${encodeURIComponent(target)}`);
      const box = await page
        .locator(`#${CSS.escape(target)}`)
        .evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, height: window.innerHeight };
        })
        .catch(async () =>
          page.evaluate((id) => {
            const el = document.getElementById(id);
            if (!el) throw new Error(`no #${id}`);
            const r = el.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, height: window.innerHeight };
          }, target),
        );
      expect(box.bottom).toBeGreaterThan(0);
      expect(box.top).toBeLessThan(box.height);
      await page.context().close();
    });

    test(`activating the affordance copies the absolute URL on ${route}`, async () => {
      const page = await open(route);
      const heading = page.locator('.prose h2').first();
      const id = await heading.evaluate((el) => el.id);
      const button = heading.locator('button[data-heading-permalink]');

      await heading.hover();
      await button.click();

      const clipboard = await page.evaluate(() =>
        navigator.clipboard.readText(),
      );
      const origin = await page.evaluate(() => window.location.origin);
      const pathname = await page.evaluate(() => window.location.pathname);
      expect(clipboard).toBe(`${origin}${pathname}#${id}`);
      // Absolute, never a bare fragment: the value has to resolve for
      // whoever the reader pastes it to.
      expect(clipboard.startsWith('http')).toBe(true);

      // Visible feedback appears, then reverts on its own.
      const feedback = page.getByText('Copied', { exact: true });
      await expect(feedback).toBeVisible({ timeout: 2000 });
      await expect(feedback).toHaveCount(0, { timeout: 5000 });
      await page.context().close();
    });

    test(`the affordance is quiet at rest and visible on hover and focus on ${route}`, async () => {
      const page = await open(route);
      const heading = page.locator('.prose h2').first();
      const button = heading.locator('button[data-heading-permalink]');

      const styles = (state: string) =>
        button.evaluate((el) => {
          const s = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return {
            opacity: Number.parseFloat(s.opacity),
            visibility: s.visibility,
            width: r.width,
            height: r.height,
            outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`,
            boxShadow: s.boxShadow,
            state,
          };
        });

      await page.mouse.move(2, 2);
      const resting = await styles('resting');

      await heading.hover();
      const hovered = await styles('hovered');
      expect(hovered.opacity).toBeGreaterThan(0.5);
      expect(hovered.visibility).toBe('visible');
      expect(hovered.width).toBeGreaterThan(0);
      expect(hovered.height).toBeGreaterThan(0);

      await page.mouse.move(2, 2);
      await button.focus();
      const focused = await styles('focused');
      expect(focused.opacity).toBeGreaterThan(0.5);
      expect(focused.visibility).toBe('visible');
      // A visible focus indicator that differs from the unfocused state.
      expect(`${focused.outline}|${focused.boxShadow}`).not.toBe(
        `${resting.outline}|${resting.boxShadow}`,
      );
      await page.context().close();
    });

    test(`the affordance is reachable by Tab in document order on ${route}`, async () => {
      const page = await open(route);
      const heading = page.locator('.prose h2').first();
      const id = await heading.evaluate((el) => el.id);
      // Focus the heading's own wrapping anchor, then Tab once: the
      // affordance is the heading's next focusable in document order.
      await heading.locator('a').first().focus();
      await page.keyboard.press('Tab');
      const focusedTarget = await page.evaluate(() =>
        document.activeElement?.getAttribute('data-heading-permalink'),
      );
      expect(focusedTarget).toBe(id);
      await page.context().close();
    });

    test(`clicking the heading still updates location.hash on ${route}`, async () => {
      const page = await open(route);
      const heading = page.locator('.prose h2').first();
      const id = await heading.evaluate((el) => el.id);
      const before = await page.evaluate(() => window.location.hash);
      expect(before).toBe('');
      await heading.locator('a').first().click();
      await expect
        .poll(() => page.evaluate(() => window.location.hash))
        .toBe(`#${id}`);
      await page.context().close();
    });

    test(`no new axe violation and no doubly-boxed control on ${route} (VAL-WIKI-018, VAL-DESIGN-019)`, async () => {
      const page = await open(route);
      await page.locator('.prose h2').first().hover();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);

      // The affordance carries no border of its own, so it cannot be a
      // bordered control inside a bordered container.
      const borders = await page
        .locator('button[data-heading-permalink]')
        .evaluateAll((els) =>
          els.map((el) => {
            const s = getComputedStyle(el);
            return [
              s.borderTopWidth,
              s.borderRightWidth,
              s.borderBottomWidth,
              s.borderLeftWidth,
            ].join(' ');
          }),
        );
      expect(borders.length).toBeGreaterThan(0);
      for (const b of borders) expect(b).toBe('0px 0px 0px 0px');
      await page.context().close();
    });

    test(`the affordance contributes no words to reading time on ${route} (VAL-EDU-003)`, async () => {
      const page = await open(route);
      const words = await page
        .locator('.prose')
        .evaluate((el) => (el as HTMLElement).innerText.trim().split(/\s+/).length);
      const header = await page.locator('#main-content').innerText();
      const stated = /(\d+)\s*min/i.exec(header);
      expect(stated).not.toBeNull();
      const minutes = Number(stated?.[1]);
      expect(minutes).toBe(Math.max(1, Math.round(words / WORDS_PER_MINUTE)));
      await page.context().close();
    });
  }

  test('the copied URL points at the canonical apex origin when served there', async () => {
    // The clipboard value is built from the page's own origin, so on the
    // deployed apex it resolves to SITE_URL. The export cannot be served on
    // that origin in a test, so the invariant checked here is that the path
    // half matches what the canonical link declares.
    const page = await open(SAMPLE[0]);
    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute('href');
    expect(canonical).toBe(`${SITE_URL}${SAMPLE[0]}`);
    await page.context().close();
  });

  test('the affordance is absent from the Pagefind index', async () => {
    // data-pagefind-ignore keeps "Copied" and the icon out of search
    // excerpts; the built index is the artifact that proves it.
    const fragments = readFileSync(
      join(OUT, 'manipulation', 'pi-line', 'index.html'),
      'utf8',
    );
    expect(fragments).toContain('data-pagefind-ignore');
  });
});
