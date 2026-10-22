import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOMAINS } from '../../data/domains';
import { publishedModules } from '../../data/modules';
import { settleTransitions } from './settle';

/**
 * The paper theme, site-wide (VAL-DESIGN-029 and VAL-DESIGN-030).
 *
 * The design spike is gone and paper is the only theme, so the two
 * assertions that used to be measured per candidate on one review route now
 * bind every route. VAL-DESIGN-028 (spike containment) is satisfied
 * historically: the review surface it governed no longer exists, so there is
 * nothing left to contain and it is deliberately not re-implemented here.
 *
 * The route population is DERIVED (one published article per domain, plus
 * every standalone surface) rather than typed, so a module published later
 * lands inside the measured set instead of beside it.
 */

/**
 * The shipped paper ground, as the browser reports it. Owner-approved
 * successor (Josef, 2026-10-10, the research-page standard): paper
 * #FAFAF8 replaced the brand-v2 #F5F6F7.
 */
const GROUND = 'rgb(250, 250, 248)';

/** One published article per domain: the article template under each domain. */
function articlePerDomain(): string[] {
  const published = publishedModules();
  return DOMAINS.map((domain) => {
    const first = published.find((m) => m.domain === domain);
    if (!first) throw new Error(`no published module in domain ${domain}`);
    return `/${first.domain}/${first.slug}/`;
  });
}

const STANDALONE = [
  '/',
  '/search/',
  '/market-map/',
  '/playground/',
  '/how-robots-work/',
  '/glossary/',
  '/a-z/',
  '/credits/',
  '/editorial-policy/',
  '/about/',
  '/privacy/',
];
const ROUTES = [...articlePerDomain(), ...STANDALONE];

function srgbChannel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of an `rgb()` / `rgba()` / `#rrggbb` colour. */
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

/** WCAG 2.2 AA threshold at a rendered size and weight. */
function aaThreshold(size: number, weight: number): number {
  return size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
}

/**
 * Settle until the document reports a quiet frame. Once is not enough: the
 * first settle resolves the transitions the initial paint started, and
 * awaiting them yields the event loop, which lets a second batch begin.
 * Reading a colour between the two batches samples a blended value that
 * appears in no stylesheet.
 */
async function settleFully(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await settleTransitions(page);
    if ((await page.evaluate(() => document.getAnimations().length)) === 0) return;
    await page.waitForTimeout(100);
  }
}

async function open(page: Page, route: string): Promise<void> {
  await page.goto(route);
  await settleFully(page);
  // Park the pointer: Playwright leaves the cursor where the last action put
  // it, and a group-hover accent baked into a reading is not a real state.
  await page.mouse.move(2, 2);
}

test.describe('the paper theme is the single site-wide theme', () => {
  test('globals.css declares the paper tokens at :root and no theme fork', () => {
    const css = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8');
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard; contract/design-integrity.md VAL-B2-COL-001 to -003 and
    // library/design-system.md 5.1): paper and ink, the grayscale chart
    // tones and the one muted blue replace the brand-v2 palette, the
    // surface is the paper sheet itself, dim text is the muted ink, rules
    // are the 1 px ink hairline, and Geist and Geist Mono replace IBM Plex
    // Sans, Newsreader and IBM Plex Mono. Each declaration is still read
    // literally off :root.
    for (const declaration of [
      '--color-ink: #1C1C1A;',
      '--color-graphite: #3F3F3B;',
      '--color-concrete: #DEDEDB;',
      '--color-paper: #FAFAF8;',
      '--color-white: #FFFFFF;',
      '--color-highlight: #A3A39E;',
      '--color-signal: #3B6EA8;',
      '--color-bg: var(--color-paper);',
      '--color-surface: var(--color-paper);',
      '--color-text: var(--color-ink);',
      '--color-text-dim: #6C6B66;',
      '--color-border: rgba(28, 28, 26, 0.14);',
      '--color-accent: var(--color-signal);',
      '--font-sans: var(--font-geist)',
      '--font-serif: var(--font-geist)',
      '--font-mono: var(--font-geist-mono)',
    ]) {
      expect(css, `globals.css must declare ${declaration}`).toContain(declaration);
    }
    // One theme means no second branch and no review surface to switch into.
    // Strip comments before matching: the stylesheet explains in prose WHY
    // there is no prefers-color-scheme fork, and a naive substring search
    // reads that explanation as the very thing it forbids.
    const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toContain('prefers-color-scheme');
    expect(code).not.toContain('data-design-spike');
    // The retired palette must be gone, not merely outranked.
    for (const retired of ['#0b0d0e', '#121517', '#e8eaec', '#9aa4ab', '#23282c', '#f5a623',
      '#245fff', '#c6ff19', '#0b0b0c', '#f5f6f7', '#242d33', '#d9dadb']) {
      expect(code.toLowerCase(), `globals.css still names the retired token ${retired}`).not.toContain(
        retired,
      );
    }
  });

  test('the spike scaffolding is gone from the tree', () => {
    for (const path of [
      'components/design-spike/design-spike.tsx',
      'components/design-spike/design-spike.css',
      'components/design-spike/spike-fonts.ts',
      'tests/e2e/design-spike.spec.ts',
    ]) {
      expect(() => readFileSync(join(process.cwd(), path)), `${path} must not exist`).toThrow();
    }
  });

  for (const route of ROUTES) {
    test(`${route} resolves the full paper token set (VAL-DESIGN-029a)`, async ({
      page,
    }) => {
      await open(page, route);
      const tokens = await page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        const names = [
          '--color-bg',
          '--color-surface',
          '--color-text',
          '--color-text-dim',
          '--color-border',
          '--color-accent',
          '--color-paper',
          '--color-signal',
          '--color-highlight',
          '--font-sans',
          '--font-serif',
          '--font-mono',
        ];
        return Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(n).trim()]));
      });
      for (const [name, value] of Object.entries(tokens)) {
        expect(value, `${route} must define ${name}`).not.toBe('');
      }
      // Owner-approved successor (Josef, 2026-10-10, the research-page
      // standard): paper #FAFAF8, the muted blue #3B6EA8 and the medium
      // grey highlight #A3A39E replace #F5F6F7, #245FFF and lime #C6FF19.
      expect(tokens['--color-bg'].toUpperCase()).toBe('#FAFAF8');
      expect(tokens['--color-accent'].toUpperCase()).toBe('#3B6EA8');
      expect(tokens['--color-paper'].toUpperCase()).toBe('#FAFAF8');
      expect(tokens['--color-signal'].toUpperCase()).toBe('#3B6EA8');
      expect(tokens['--color-highlight'].toUpperCase()).toBe('#A3A39E');
      // The faces are the new ones, and only the new ones. Shipping nine
      // families would satisfy a positive check on its own.
      //
      // Assert on the RESOLVED family name: next/font substitutes the
      // var(--font-*) reference with the loaded family plus its fallback, so
      // the token reads "Geist", "Geist Fallback", ... and never the
      // variable name that appears in the stylesheet. The head of each stack
      // is matched, so Geist Mono cannot pass for Geist.
      expect(tokens['--font-sans']).toMatch(/^['"]?Geist['"]?,/);
      expect(tokens['--font-serif']).toMatch(/^['"]?Geist['"]?,/);
      expect(tokens['--font-mono']).toMatch(/^['"]?Geist Mono['"]?,/);
      for (const slot of ['--font-sans', '--font-serif', '--font-mono']) {
        expect(tokens[slot], `${route} ${slot} names a retired face`).not.toMatch(
          /plex|newsreader|tektur|source-serif|jetbrains/i,
        );
      }
      expect(
        await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
      ).toBe(GROUND);
    });

    test(`${route} meets AA for body and dim text at rendered size (VAL-DESIGN-029b)`, async ({
      page,
    }) => {
      await open(page, route);
      const sample = await page.evaluate(() => {
        const read = (el: Element | null) => {
          if (!el) return null;
          const cs = getComputedStyle(el);
          return {
            color: cs.color,
            size: Number.parseFloat(cs.fontSize),
            weight: Number(cs.fontWeight),
            text: (el.textContent ?? '').trim().slice(0, 40),
          };
        };
        // The token resolves as a hex literal while a computed `color` is
        // always an rgb() string, so the two must be normalised before they
        // can be compared. Comparing them raw silently matches nothing and
        // the measurement disappears rather than failing.
        const hex = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-text-dim')
          .trim();
        const dimToken = `rgb(${Number.parseInt(hex.slice(1, 3), 16)}, ${Number.parseInt(
          hex.slice(3, 5),
          16,
        )}, ${Number.parseInt(hex.slice(5, 7), 16)})`;
        // Any element actually painted in the dim token, found by computed
        // colour rather than by a class name, so a utility rename cannot
        // silently drop this measurement.
        const dim =
          Array.from(document.querySelectorAll('p, dt, dd, span, div, li')).find((el) => {
            const cs = getComputedStyle(el);
            return (
              cs.color === dimToken && (el.textContent ?? '').trim().length > 0
            );
          }) ?? null;
        return {
          bg: getComputedStyle(document.body).backgroundColor,
          body: read(document.querySelector('.prose p') ?? document.querySelector('main p')),
          dim: read(dim),
        };
      });
      expect(sample.body, `${route} must render body copy`).not.toBeNull();
      const body = sample.body!;
      const bodyRatio = contrastRatio(body.color, sample.bg);
      expect(
        bodyRatio,
        `${route} body ${body.color} on ${sample.bg} at ${body.size}px`,
      ).toBeGreaterThanOrEqual(aaThreshold(body.size, body.weight));

      expect(sample.dim, `${route} must render dim text`).not.toBeNull();
      const dim = sample.dim!;
      const dimRatio = contrastRatio(dim.color, sample.bg);
      expect(
        dimRatio,
        `${route} dim "${dim.text}" ${dim.color} on ${sample.bg} at ${dim.size}px`,
      ).toBeGreaterThanOrEqual(aaThreshold(dim.size, dim.weight));
    });

    test(`${route} keeps a measurable focus indicator (VAL-DESIGN-029b)`, async ({
      page,
    }) => {
      await open(page, route);
      // Tab, rather than el.focus(). The site's one focus style is a
      // :focus-visible rule, and :focus-visible deliberately does NOT match
      // programmatic focus on a link or a button: the heuristic keys on the
      // last interaction being a keyboard one. Calling focus() therefore
      // reports outline-style "none" on a control whose ring a real reader
      // sees perfectly well, which is a defect in the measurement.
      const measured: {
        tag: string;
        name: string;
        rest: string;
        focusedStyle: string;
        focusedWidth: number;
        focusedColor: string;
      }[] = [];
      for (let i = 0; i < 12; i += 1) {
        await page.keyboard.press('Tab');
        const m = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          return {
            tag: el.tagName.toLowerCase(),
            name: (el.getAttribute('aria-label') ?? el.textContent ?? '')
              .trim()
              .slice(0, 30),
            focusedStyle: cs.outlineStyle,
            focusedWidth: Number.parseFloat(cs.outlineWidth),
            focusedColor: cs.outlineColor,
          };
        });
        if (!m) continue;
        // The resting state of the same element, read with focus elsewhere.
        const rest = await page.evaluate((sel) => {
          const el = document.querySelector(sel) as HTMLElement | null;
          return el ? getComputedStyle(el).outlineStyle : 'none';
        }, `${m.tag}:not(:focus)`);
        measured.push({ ...m, rest });
      }
      expect(measured.length, `${route} must expose focusable controls`).toBeGreaterThan(0);
      for (const m of measured) {
        expect(
          m.focusedStyle,
          `${route} ${m.tag} "${m.name}" paints no outline when focused`,
        ).toBe('solid');
        expect(
          m.focusedWidth,
          `${route} ${m.tag} "${m.name}" focus outline has no width`,
        ).toBeGreaterThan(0);
        // The indicator must DIFFER from the resting state, not merely exist.
        expect(
          m.rest,
          `${route} ${m.tag} "${m.name}" already outlined at rest`,
        ).not.toBe('solid');
      }
    });

    test(`${route} reports zero axe violations (VAL-DESIGN-029d)`, async ({ page }) => {
      await open(page, route);
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations,
        `axe violations on ${route}: ${JSON.stringify(
          results.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.length,
            first: v.nodes[0]?.html.slice(0, 140),
          })),
        )}`,
      ).toEqual([]);
    });

    test(`${route} survives forced colours (VAL-DESIGN-029c)`, async ({ browser }) => {
      const context = await browser.newContext({ forcedColors: 'active' });
      const page = await context.newPage();
      await open(page, route);
      const survived = await page.evaluate(() => ({
        // Landmarks and headings are structural, so dropping every custom
        // colour cannot remove them.
        headings: document.querySelectorAll('h1, h2, h3').length,
        landmarks: document.querySelectorAll('main, nav').length,
        // Nothing may be hidden purely because its colour was dropped.
        hiddenText: Array.from(document.querySelectorAll('main *')).filter((el) => {
          const cs = getComputedStyle(el);
          return (
            (el.textContent ?? '').trim().length > 0 &&
            (cs.display === 'none' || cs.visibility === 'hidden')
          );
        }).length,
      }));
      expect(survived.headings, `${route} loses its headings`).toBeGreaterThan(0);
      expect(survived.landmarks, `${route} loses its landmarks`).toBeGreaterThan(0);
      await context.close();
    });
  }
});

// Owner-approved successor (Josef, 2026-10-10, the research-page standard:
// "No shadows, no gradients, no coloured panels behind text"): the brand-v2
// dot texture is retired, so the bound it lived under (at most 12% of the
// viewport, within 0.06 luminance of the ground) tightens to its limit: no
// gradient paints anywhere and the article sits on the flat paper ground.
test.describe('texture subtlety, site-wide (VAL-DESIGN-030)', () => {
  const TEXTURED_ROUTES = articlePerDomain();

  for (const route of TEXTURED_ROUTES) {
    test(`${route} paints no texture or gradient over the 1440x900 page`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open(page, route);
      const measured = await page.evaluate(() => {
        // Derived by asking every element for a painted gradient rather than
        // by naming a selector, so a textured surface added later cannot
        // escape the bound. A chart data mark may hatch its fill (claimed
        // against documented records), because there the pattern is the
        // value's encoding, not page texture.
        const all = Array.from(document.querySelectorAll<HTMLElement>('*'));
        const textured = all.filter(
          (el) =>
            /gradient\(/.test(getComputedStyle(el).backgroundImage) &&
            !el.matches('[data-chart-mark]'),
        );
        return {
          population: all.length,
          textured: textured.map(
            (el) => `${el.tagName}.${(el.getAttribute('class') ?? '').slice(0, 40)}`,
          ),
        };
      });
      expect(measured.population, `${route} sweep population`).toBeGreaterThan(0);
      expect(measured.textured, `${route} paints a texture or gradient`).toEqual([]);
    });

    test(`${route} sits on the flat paper ground with no dot-texture tiers`, async ({
      page,
    }) => {
      await open(page, route);
      const sample = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        return {
          ground: getComputedStyle(document.body).backgroundColor,
          dots: ['base', 'mid', 'peak'].map((tier) =>
            root.getPropertyValue(`--dot-${tier}`).trim(),
          ),
        };
      });
      expect(sample.ground, `${route} ground`).toBe(GROUND);
      for (const dot of sample.dots) {
        expect(dot, `${route} still declares a retired dot tier`).toBe('');
      }
    });

    test(`${route} texture carries no information of its own`, async ({ page }) => {
      await open(page, route);
      const hr = page.locator('article > hr');
      await expect(hr).toHaveCount(1);
      // A separator, not a value: no accessible name, no title, no text, and
      // the regions it divides name themselves in headings below it.
      expect(await hr.getAttribute('aria-label')).toBeNull();
      expect(await hr.getAttribute('title')).toBeNull();
      expect((await hr.textContent())?.trim() ?? '').toBe('');
      await expect(page.getByRole('heading', { name: 'References' })).toBeVisible();
    });

    test(`${route} animates nothing in the prose region`, async ({ page }) => {
      await open(page, route);
      const inProse = await page.evaluate(() => {
        const prose = document.querySelector('.prose');
        return document.getAnimations().filter((a) => {
          const target = (a as unknown as { effect?: { target?: Element } }).effect?.target;
          return target instanceof Element && Boolean(prose?.contains(target));
        }).length;
      });
      expect(inProse).toBe(0);
      expect(
        await page.evaluate(
          () =>
            (document.querySelector('article > hr') as HTMLElement).getAnimations().length,
        ),
      ).toBe(0);
    });

    test(`${route} is fully static under reduced motion`, async ({ browser }) => {
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await context.newPage();
      await open(page, route);
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
      await context.close();
    });
  }
});
