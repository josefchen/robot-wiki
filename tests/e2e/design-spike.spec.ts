import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { publishedModules } from '../../data/modules';
import { settleTransitions } from './settle';

/**
 * The visual-elevation design spike (VAL-DESIGN-028/029/030).
 *
 * Three candidate treatments live on one article route behind ?theme=.
 * These assertions are the containment and quality gates the spike must
 * hold while the owner chooses between them: the candidates change nothing
 * outside their review surface, each is a complete and legible theme, and
 * the dot texture stays inside its measured subtlety bounds.
 */

const REVIEW_ROUTE = '/manipulation/bc-foundations/';
const CANDIDATES = ['paper', 'blueprint', 'oxide'] as const;

/**
 * The two article surfaces where the shipped theme must be observed
 * unchanged. `article > hr` is the element the spike repaints, so it is
 * measured separately from the prose region it divides.
 */
const REGIONS = {
  body: 'body',
  prose: '[data-prose-column]',
  rail: 'aside',
} as const;

const MEASURED_PROPERTIES = [
  'background-color',
  'color',
  'font-family',
  'font-size',
  'border-color',
] as const;

type RegionStyles = Record<string, Record<string, string> | null>;

async function openCandidate(page: Page, candidate: string): Promise<void> {
  await page.goto(`${REVIEW_ROUTE}?theme=${candidate}`);
  await page.waitForFunction(
    (c) => document.documentElement.dataset.designSpike === c,
    candidate,
  );
  // Settling once is not enough here. The first settle resolves the
  // transitions the initial paint started; awaiting them yields the event
  // loop, and the attribute flip that mounts the candidate starts a second
  // batch (every `transition-colors` element in the chrome) which a single
  // settle has already stopped watching. Reading a colour or an animation
  // count between the two batches samples a blended value that appears in
  // no stylesheet. Settle until the document reports a quiet frame.
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await settleTransitions(page);
    const running = await page.evaluate(() => document.getAnimations().length);
    if (running === 0) return;
    await page.waitForTimeout(100);
  }
  throw new Error(`animations never settled for candidate ${candidate}`);
}

async function readRegions(page: Page): Promise<RegionStyles> {
  return page.evaluate(
    ({ regions, props }) => {
      const out: Record<string, Record<string, string> | null> = {};
      for (const [name, selector] of Object.entries(regions)) {
        const el = document.querySelector(selector as string);
        if (!el) {
          out[name] = null;
          continue;
        }
        const cs = getComputedStyle(el);
        out[name] = Object.fromEntries(
          (props as string[]).map((p) => [p, cs.getPropertyValue(p)]),
        );
      }
      return out;
    },
    { regions: REGIONS, props: MEASURED_PROPERTIES as unknown as string[] },
  );
}

function srgbChannel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of a `rgb()` / `rgba()` / `#rrggbb` colour. */
function relativeLuminance(color: string): number {
  let r: number;
  let g: number;
  let b: number;
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    r = Number.parseInt(hex.slice(0, 2), 16);
    g = Number.parseInt(hex.slice(2, 4), 16);
    b = Number.parseInt(hex.slice(4, 6), 16);
  } else {
    const parts = color.match(/-?[\d.]+/g);
    if (!parts || parts.length < 3) throw new Error(`unparsable colour: ${color}`);
    [r, g, b] = parts.slice(0, 3).map(Number);
  }
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

test.describe('design spike containment (VAL-DESIGN-028)', () => {
  test('no :root token default changed in globals.css', () => {
    const css = readFileSync(
      join(process.cwd(), 'app', 'globals.css'),
      'utf8',
    );
    // The shipped defaults. A candidate may only define tokens under its
    // own scoped selector, so these exact declarations must survive.
    const shipped = [
      '--color-bg: #0b0d0e;',
      '--color-surface: #121517;',
      '--color-text: #e8eaec;',
      '--color-text-dim: #9aa4ab;',
      '--color-border: #23282c;',
      '--color-accent: #f5a623;',
      '--font-sans: var(--font-geist-sans)',
      '--font-serif: var(--font-source-serif)',
      '--font-mono: var(--font-jetbrains-mono)',
    ];
    for (const declaration of shipped) {
      expect(css, `globals.css must still declare ${declaration}`).toContain(
        declaration,
      );
    }
    expect(css).not.toContain('data-design-spike');
  });

  test('the review route renders the shipped theme with no query string', async ({
    page,
  }) => {
    await page.goto(REVIEW_ROUTE);
    await settleTransitions(page);
    expect(
      await page.evaluate(() => document.documentElement.dataset.designSpike),
    ).toBeUndefined();
    const body = await readRegions(page);
    expect(body.body?.['background-color']).toBe('rgb(11, 13, 14)');
  });

  test('an unknown ?theme value mounts nothing', async ({ page }) => {
    await page.goto(`${REVIEW_ROUTE}?theme=not-a-candidate`);
    await settleTransitions(page);
    expect(
      await page.evaluate(() => document.documentElement.dataset.designSpike),
    ).toBeUndefined();
  });

  test('no route other than the review surface can mount a candidate', async ({
    page,
  }) => {
    // Derived from the registry rather than a typed list, so a module
    // published later is measured too.
    const others = publishedModules()
      .filter((m) => `/${m.domain}/${m.slug}/` !== REVIEW_ROUTE)
      .map((m) => `/${m.domain}/${m.slug}/`);
    const routes = ['/', '/a-z/', '/glossary/', '/market-map/', ...others];
    expect(routes.length).toBeGreaterThan(12);

    for (const route of routes) {
      await page.goto(`${route}?theme=paper`);
      await settleTransitions(page);
      expect(
        await page.evaluate(() => document.documentElement.dataset.designSpike),
        `${route} must not mount a spike candidate`,
      ).toBeUndefined();
      expect(
        await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
        `${route} must keep the shipped ground`,
      ).toBe('rgb(11, 13, 14)');
    }
  });

  test('site navigation never links into a candidate', async ({ page }) => {
    await page.goto(REVIEW_ROUTE);
    await settleTransitions(page);
    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]')).map((a) =>
        a.getAttribute('href') ?? '',
      ),
    );
    expect(hrefs.length).toBeGreaterThan(20);
    expect(hrefs.filter((h) => h.includes('theme='))).toEqual([]);
  });

  test('the shipped presentation of a sibling route is unchanged by the spike', async ({
    page,
  }) => {
    // Mount a candidate, then navigate away: the effect cleanup must
    // restore the document element, so a client-side navigation cannot
    // carry a candidate onto another route.
    await openCandidate(page, 'oxide');
    await page.getByRole('link', { name: 'Diffusion Policy' }).first().click();
    await page.waitForURL('**/diffusion-policy/');
    await settleTransitions(page);
    expect(
      await page.evaluate(() => document.documentElement.dataset.designSpike),
    ).toBeUndefined();
    const regions = await readRegions(page);
    expect(regions.body?.['background-color']).toBe('rgb(11, 13, 14)');
    expect(regions.prose?.['font-size']).toBeTruthy();
  });
});

test.describe('candidate completeness and legibility (VAL-DESIGN-029)', () => {
  for (const candidate of CANDIDATES) {
    test(`${candidate} resolves all nine tokens and is genuinely distinct`, async ({
      page,
    }) => {
      await openCandidate(page, candidate);
      const tokens = await page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        const names = [
          '--color-bg',
          '--color-surface',
          '--color-text',
          '--color-text-dim',
          '--color-border',
          '--color-accent',
          '--font-sans',
          '--font-serif',
          '--font-mono',
        ];
        return Object.fromEntries(
          names.map((n) => [n, cs.getPropertyValue(n).trim()]),
        );
      });
      for (const [name, value] of Object.entries(tokens)) {
        expect(value, `${candidate} must define ${name}`).not.toBe('');
      }
      // Not the shipped system: a candidate identical to it is not a candidate.
      expect(tokens['--color-bg']).not.toBe('#0b0d0e');
      expect(tokens['--color-accent']).not.toBe('#f5a623');
      expect(tokens['--font-sans']).not.toContain('geist');
      expect(tokens['--font-serif']).not.toContain('source-serif');
      expect(tokens['--font-mono']).not.toContain('jetbrains');
    });

    test(`${candidate} meets AA for body and dim text at rendered size`, async ({
      page,
    }) => {
      await openCandidate(page, candidate);
      const sample = await page.evaluate(() => {
        const prose = document.querySelector('.prose p') as HTMLElement;
        const dim = document.querySelector(
          'article header dl dt',
        ) as HTMLElement;
        const bg = getComputedStyle(document.body).backgroundColor;
        const read = (el: HTMLElement) => {
          const cs = getComputedStyle(el);
          return {
            color: cs.color,
            size: Number.parseFloat(cs.fontSize),
            weight: Number(cs.fontWeight),
          };
        };
        return { bg, prose: read(prose), dim: read(dim) };
      });
      const threshold = (size: number, weight: number) =>
        size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;

      const bodyRatio = contrastRatio(sample.prose.color, sample.bg);
      expect(
        bodyRatio,
        `${candidate} body ${sample.prose.color} on ${sample.bg} at ${sample.prose.size}px`,
      ).toBeGreaterThanOrEqual(threshold(sample.prose.size, sample.prose.weight));

      const dimRatio = contrastRatio(sample.dim.color, sample.bg);
      expect(
        dimRatio,
        `${candidate} dim ${sample.dim.color} on ${sample.bg} at ${sample.dim.size}px`,
      ).toBeGreaterThanOrEqual(threshold(sample.dim.size, sample.dim.weight));
    });

    test(`${candidate} keeps a measurable focus indicator on three controls`, async ({
      page,
    }) => {
      await openCandidate(page, candidate);
      const selectors = [
        'article a[href]',
        'button[aria-pressed]',
        'input[type="range"]',
      ];
      for (const selector of selectors) {
        const measured = await page.evaluate(async (sel) => {
          const el = document.querySelector(sel) as HTMLElement | null;
          if (!el) return null;
          const read = () => {
            const cs = getComputedStyle(el);
            return {
              style: cs.outlineStyle,
              width: cs.outlineWidth,
              color: cs.outlineColor,
            };
          };
          const rest = read();
          el.focus();
          await new Promise((r) => setTimeout(r, 80));
          const focused = read();
          el.blur();
          return { rest, focused };
        }, selector);
        expect(measured, `${selector} must exist on the review route`).not.toBeNull();
        expect(
          measured?.rest.style,
          `${candidate} ${selector} must not paint an outline at rest`,
        ).toBe('none');
        expect(
          measured?.focused.style,
          `${candidate} ${selector} must paint an outline when focused`,
        ).toBe('solid');
        expect(Number.parseFloat(measured?.focused.width ?? '0')).toBeGreaterThan(0);
      }
    });

    test(`${candidate} keeps its information under forced colours`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ forcedColors: 'active' });
      const page = await context.newPage();
      await openCandidate(page, candidate);
      const survived = await page.evaluate(() => {
        const headings = Array.from(
          document.querySelectorAll('article > section > h2'),
        ).map((h) => h.textContent?.trim() ?? '');
        const pressed = document.querySelector('button[aria-pressed]');
        const hr = document.querySelector('article > hr') as HTMLElement;
        return {
          headings,
          pressed: pressed?.getAttribute('aria-pressed'),
          hrDisplayed: getComputedStyle(hr).display !== 'none',
        };
      });
      // The texture divides two regions that also name themselves, so
      // dropping every custom colour loses no information.
      expect(survived.headings).toContain('See also');
      expect(survived.headings).toContain('References');
      expect(survived.pressed).toBeTruthy();
      expect(survived.hrDisplayed).toBe(true);
      await context.close();
    });

    test(`${candidate} reports zero axe violations once transitions settle`, async ({
      page,
    }) => {
      await openCandidate(page, candidate);
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations,
        `axe violations for ${candidate}: ${JSON.stringify(
          results.violations.map((v) => ({ id: v.id, nodes: v.nodes.length })),
        )}`,
      ).toEqual([]);
    });

    test(`${candidate} does not scroll horizontally at 375px`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 900 });
      await openCandidate(page, candidate);
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    });
  }
});

test.describe('texture subtlety (VAL-DESIGN-030)', () => {
  for (const candidate of CANDIDATES) {
    test(`${candidate} texture stays under 12% of the 1440x900 viewport`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await openCandidate(page, candidate);
      const measured = await page.evaluate(() => {
        // Every element the spike stylesheet textures. Derived by asking
        // for a painted background-image rather than by naming a selector,
        // so a second textured surface cannot escape the bound.
        const textured = Array.from(document.querySelectorAll('*')).filter(
          (el) => {
            const cs = getComputedStyle(el);
            return cs.backgroundImage.includes('radial-gradient');
          },
        ) as HTMLElement[];
        return {
          count: textured.length,
          area: textured.reduce((sum, el) => {
            const r = el.getBoundingClientRect();
            return sum + r.width * r.height;
          }, 0),
          viewport: window.innerWidth * window.innerHeight,
        };
      });
      expect(measured.count).toBeGreaterThan(0);
      const coverage = measured.area / measured.viewport;
      expect(
        coverage,
        `${candidate} texture covers ${(coverage * 100).toFixed(3)}% of the viewport`,
      ).toBeLessThanOrEqual(0.12);
    });

    test(`${candidate} texture sits within 0.06 luminance of its ground`, async ({
      page,
    }) => {
      await openCandidate(page, candidate);
      const sample = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        return {
          ground: getComputedStyle(document.body).backgroundColor,
          dots: ['base', 'mid', 'peak'].map((tier) =>
            root.getPropertyValue(`--spike-dot-${tier}`).trim(),
          ),
        };
      });
      const groundLuminance = relativeLuminance(sample.ground);
      for (const dot of sample.dots) {
        expect(dot, `${candidate} must declare every dot tier`).not.toBe('');
        const delta = Math.abs(relativeLuminance(dot) - groundLuminance);
        expect(
          delta,
          `${candidate} dot ${dot} is ${delta.toFixed(4)} from ground ${sample.ground}`,
        ).toBeLessThanOrEqual(0.06);
      }
    });

    test(`${candidate} texture carries no information of its own`, async ({
      page,
    }) => {
      await openCandidate(page, candidate);
      const hr = page.locator('article > hr');
      await expect(hr).toHaveCount(1);
      // A separator, not a value: no accessible name, no role, no text,
      // and the regions it divides name themselves in headings below it.
      expect(await hr.getAttribute('aria-label')).toBeNull();
      expect(await hr.getAttribute('title')).toBeNull();
      expect((await hr.textContent())?.trim() ?? '').toBe('');
      await expect(page.getByRole('heading', { name: 'See also' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'References' })).toBeVisible();
    });

    test(`${candidate} animates nothing in the prose region`, async ({ page }) => {
      await openCandidate(page, candidate);
      const inProse = await page.evaluate(() => {
        const prose = document.querySelector('.prose');
        return document.getAnimations().filter((a) => {
          const target = (a as unknown as { effect?: { target?: Element } }).effect
            ?.target;
          return target instanceof Element && Boolean(prose?.contains(target));
        }).length;
      });
      expect(inProse).toBe(0);
      expect(
        await page.evaluate(
          () =>
            (document.querySelector('article > hr') as HTMLElement).getAnimations()
              .length,
        ),
      ).toBe(0);
    });

    test(`${candidate} is fully static under reduced motion`, async ({ browser }) => {
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await context.newPage();
      await openCandidate(page, candidate);
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
      await context.close();
    });
  }
});
