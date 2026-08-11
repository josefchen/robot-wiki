import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GLOSSARY, getTerm, glossaryTermsAlphabetical } from '../../data/glossary';
import { getCitation } from '../../data/citations';
import { modules } from '../../data/modules';
import { inlineTermIds } from '../../lib/glossary';
import { moduleBody } from '../../lib/references';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Glossary and inline <Term> definitions (VAL-GLOSS-001 through VAL-GLOSS-011).
 * Verified against the shipped artifact: the static export served on :3201
 * (the validation surface per AGENTS.md), not the dev server.
 */

const PORT = 3201;
const BASE = `http://localhost:${PORT}`;

// Articles carrying the demo markup: every seeded term id appears inline in
// at least one of these (first-use sites only).
const DEMO_ARTICLES = [
  '/classical/kinematics/',
  '/manipulation/action-chunking/',
  '/rl-sim2real/sim2real-transfer/',
  '/data-hardware/data-bottleneck/',
  '/manipulation/bc-foundations/',
] as const;

let server: StaticExportServer | null = null;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the glossary spec',
  ).toBe(true);
  server = await startStaticExportServer(outDir, PORT);
});

test.afterAll(async () => {
  await server?.stop();
});

/** The term link inside a <Term> occurrence. */
function termLink(page: Page, id: string) {
  return page.locator(`[data-term-id="${id}"] a.term-link`).first();
}

/** The tooltip element wired to a term link via aria-describedby. */
async function tooltipFor(page: Page, id: string) {
  const describedBy = await termLink(page, id).getAttribute('aria-describedby');
  expect(describedBy, `term ${id} carries aria-describedby`).toBeTruthy();
  // Attribute selector: React useId values contain colons, and CSS.escape
  // does not exist in the Node test runner.
  return page.locator(`[id="${describedBy!}"]`);
}

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

test.describe('Glossary page', () => {
  test('/glossary lists every term alphabetically with a real definition and a visible count (VAL-GLOSS-001)', async ({
    page,
  }) => {
    const response = await page.goto(`${BASE}/glossary/`);
    expect(response?.ok()).toBe(true);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Glossary' }),
    ).toBeVisible();
    await expect(page.getByText(`${GLOSSARY.length} terms`).first()).toBeVisible();

    const entries = page.locator('[data-glossary-term]');
    expect(await entries.count()).toBe(GLOSSARY.length);

    // Alphabetical by display term, matching the registry sort.
    const expected = glossaryTermsAlphabetical();
    for (let i = 0; i < expected.length; i += 1) {
      const entry = entries.nth(i);
      expect(await entry.getAttribute('data-glossary-term')).toBe(expected[i].id);
      await expect(entry.locator('h2')).toHaveText(expected[i].term);
      // A full sentence of real prose, verbatim from the registry.
      const definition = normalize(
        (await entry.locator('p').first().textContent()) ?? '',
      );
      expect(definition).toBe(normalize(expected[i].definition));
      expect(definition.length).toBeGreaterThan(40);
      expect(definition.endsWith('.')).toBe(true);
    }
  });

  test('every entry links to at least one external primary source from the registry (VAL-GLOSS-002)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/glossary/`);
    for (const term of GLOSSARY) {
      const entry = page.locator(`[data-glossary-term="${term.id}"]`);
      const links = entry.locator('a[target="_blank"]');
      expect(await links.count(), `${term.id} source count`).toBe(term.citations.length);
      for (let i = 0; i < term.citations.length; i += 1) {
        const citation = getCitation(term.citations[i]);
        expect(citation, `registry entry ${term.citations[i]}`).toBeDefined();
        const href = await links.nth(i).getAttribute('href');
        expect(href).toBe(citation!.url);
        expect(href ?? '').toMatch(/^https:\/\//);
      }
    }
  });

  test('reachable by clicking the site chrome at 1440px, with an active state (VAL-GLOSS-003)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/`);
    const link = page.locator('aside').getByRole('link', { name: 'Glossary' });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(`${BASE}/glossary/`);
    await expect(link).toHaveAttribute('aria-current', 'page');
  });

  test('reachable from the mobile drawer at 375px (VAL-GLOSS-003)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/`);
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    const drawer = page.getByRole('dialog', { name: 'Site navigation' });
    const link = drawer.getByRole('link', { name: 'Glossary' });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(`${BASE}/glossary/`);
    // The drawer closes after navigating.
    await expect(drawer).toHaveCount(0);
    // The entry point shows the active state on /glossary.
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Site navigation' }).getByRole('link', { name: 'Glossary' }),
    ).toHaveAttribute('aria-current', 'page');
  });
});

test.describe('Inline <Term>', () => {
  test('renders as a focusable marked-up affordance wired to its definition (VAL-GLOSS-004)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/classical/kinematics/`);
    for (const id of ['forward-kinematics', 'inverse-kinematics']) {
      const link = termLink(page, id);
      await expect(link).toBeVisible();
      // A link to the glossary anchor, not a bare styled span. The static
      // export normalizes trailing slashes, hence /glossary/#id.
      await expect(link).toHaveAttribute('href', `/glossary/#${id}`);
      // Visually distinguishable: the term-link class carries the dotted
      // underline treatment.
      const underlineStyle = await link.evaluate(
        (el) => getComputedStyle(el).textDecorationStyle,
      );
      expect(underlineStyle).toBe('dotted');
      // aria-describedby resolves to a non-empty element holding THIS term's
      // registry definition.
      const tooltip = await tooltipFor(page, id);
      expect(normalize((await tooltip.textContent()) ?? '')).toContain(
        normalize(getTerm(id)!.definition),
      );
    }
  });

  test('hover reveals the definition for that term, and leaving hides it (VAL-GLOSS-005)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/classical/kinematics/`);
    const link = termLink(page, 'forward-kinematics');
    const tooltip = await tooltipFor(page, 'forward-kinematics');

    await expect(tooltip).toBeHidden();
    await link.hover();
    await expect(tooltip).toBeVisible();
    expect(normalize((await tooltip.textContent()) ?? '')).toContain(
      normalize(getTerm('forward-kinematics')!.definition),
    );
    // Not the neighbouring term's definition.
    expect(normalize((await tooltip.textContent()) ?? '')).not.toContain(
      normalize(getTerm('inverse-kinematics')!.definition),
    );

    await page.locator('article h1').first().hover();
    await expect(tooltip).toBeHidden();
  });

  test('keyboard focus reveals the same definition as hover, on three terms across articles (VAL-GLOSS-006)', async ({
    page,
  }) => {
    const cases: Array<{ route: string; id: string }> = [
      { route: '/classical/kinematics/', id: 'forward-kinematics' },
      { route: '/manipulation/action-chunking/', id: 'temporal-ensembling' },
      { route: '/rl-sim2real/sim2real-transfer/', id: 'domain-randomization' },
    ];
    for (const { route, id } of cases) {
      await page.goto(`${BASE}${route}`);
      const link = termLink(page, id);
      const tooltip = await tooltipFor(page, id);

      // Hover text, captured with the pointer.
      await link.hover();
      await expect(tooltip).toBeVisible();
      const hoverText = normalize((await tooltip.textContent()) ?? '');
      await page.locator('article h1').first().hover();
      await expect(tooltip).toBeHidden();

      // Focus text, no pointer involved. preventScroll keeps the page (and
      // the resting mouse position) exactly where the hover step left it,
      // so only keyboard focus can be revealing the tooltip.
      await link.evaluate((el) => (el as HTMLElement).focus({ preventScroll: true }));
      expect(await link.evaluate((el) => document.activeElement === el)).toBe(true);
      await expect(tooltip).toBeVisible();
      const focusText = normalize((await tooltip.textContent()) ?? '');
      expect(focusText).toBe(hoverText);
      expect(focusText).toContain(normalize(getTerm(id)!.definition));

      // Moving focus away hides it again. The mouse first parks in the
      // corner: Tab scrolls the page to the next tab stop, and without
      // parking, the content sliding under the resting pointer can
      // legitimately re-trigger hover on the group.
      await page.mouse.move(2, 2);
      await page.keyboard.press('Tab');
      await expect(tooltip).toBeHidden();
    }
  });

  test('terms are reachable by Tab from the top of the article (VAL-GLOSS-006)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/classical/kinematics/`);
    // Walk the tab order until a term link holds focus (bounded so a
    // regression fails loudly instead of hanging). The first term in tab
    // order is whichever jargon the article uses first (the wiki-wide
    // backfill added teleoperation ahead of forward-kinematics), so the
    // contract is that SOME term is keyboard-reachable and its tooltip
    // opens on focus, not a specific id.
    let focused: string | null = null;
    for (let i = 0; i < 120; i += 1) {
      await page.keyboard.press('Tab');
      focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.classList.contains('term-link')
          ? el.closest('[data-term-id]')?.getAttribute('data-term-id') ?? null
          : null;
      });
      if (focused) break;
    }
    expect(focused, 'a term link receives keyboard focus').not.toBeNull();
    const tooltip = await tooltipFor(page, focused ?? '');
    await expect(tooltip).toBeVisible();
  });

  for (const viewport of [
    { width: 375, height: 812 },
    { width: 1440, height: 900 },
  ]) {
    test(`tooltips stay inside the viewport, unclipped, with zero reflow at ${viewport.width}px (VAL-GLOSS-007)`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);

      for (const route of ['/classical/kinematics/', '/data-hardware/data-bottleneck/']) {
        await page.goto(`${BASE}${route}`);
        // Every term occurrence on the page, wherever the line breaks put
        // it: start of line, end of line, first and last paragraphs.
        const occurrences = page.locator('[data-term-id] a.term-link');
        const count = await occurrences.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i += 1) {
          const link = occurrences.nth(i);
          await link.scrollIntoViewIfNeeded();
          await link.focus();
          const tooltip = page.locator(
            `[id="${(await link.getAttribute('aria-describedby'))!}"]`,
          );
          await expect(tooltip).toBeVisible();

          const box = await tooltip.boundingBox();
          expect(box, `tooltip ${i} on ${route} has a box`).toBeTruthy();
          if (box) {
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.y).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
            expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
          }

          // Zero page-level horizontal scroll while the tooltip is open.
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          );
          expect(overflow).toBeLessThanOrEqual(0);
        }
      }

      // The end-of-line case at 375px: covariate shift sits well past the
      // middle of the column, so the tooltip shifts left of the term's left
      // edge instead of overflowing the viewport (and stays inside it).
      if (viewport.width === 375) {
        await page.goto(`${BASE}/data-hardware/data-bottleneck/`);
        const link = termLink(page, 'covariate-shift');
        await link.scrollIntoViewIfNeeded();
        await link.focus();
        const tooltip = await tooltipFor(page, 'covariate-shift');
        await expect(tooltip).toBeVisible();
        const [tip, term] = await Promise.all([tooltip.boundingBox(), link.boundingBox()]);
        expect(tip && term).toBeTruthy();
        if (tip && term) {
          expect(tip.x).toBeLessThan(term.x);
          expect(tip.x).toBeGreaterThanOrEqual(0);
          expect(tip.x + tip.width).toBeLessThanOrEqual(viewport.width);
        }
      }

      // No reflow: revealing a definition never moves surrounding prose.
      // Positions are document-relative, so the browser scrolling to the
      // focused term does not register as layout shift.
      await page.goto(`${BASE}/classical/kinematics/`);
      const paragraph = termLink(page, 'forward-kinematics').locator('xpath=ancestor::p[1]');
      const referencesHeading = page.getByRole('heading', {
        level: 2,
        name: 'References',
      });
      const documentY = (locator: typeof paragraph) =>
        locator.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
      const before = {
        paragraph: await documentY(paragraph),
        references: await documentY(referencesHeading),
      };
      const link = termLink(page, 'forward-kinematics');
      await link.focus();
      const tooltip = await tooltipFor(page, 'forward-kinematics');
      await expect(tooltip).toBeVisible();
      const after = {
        paragraph: await documentY(paragraph),
        references: await documentY(referencesHeading),
      };
      expect(after.paragraph).toBeCloseTo(before.paragraph, 1);
      expect(after.references).toBeCloseTo(before.references, 1);
    });
  }

  test('inline definitions match the glossary entry for every term id used inline (VAL-GLOSS-009, VAL-GLOSS-010)', async ({
    page,
  }) => {
    // The distinct term ids used across published articles, from source.
    const usedIds = new Set<string>();
    for (const m of modules.filter((mod) => mod.status === 'published')) {
      const source = readFileSync(
        join(process.cwd(), 'content', m.domain, `${m.slug}.mdx`),
        'utf8',
      );
      for (const id of inlineTermIds(moduleBody(source))) usedIds.add(id);
    }
    expect(usedIds.size).toBeGreaterThan(0);

    // Every inline id has a glossary entry (subset check).
    await page.goto(`${BASE}/glossary/`);
    const renderedIds = await page
      .locator('[data-glossary-term]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-glossary-term')));
    for (const id of usedIds) {
      expect(renderedIds).toContain(id);
    }

    // The glossary text for each id, straight from the page.
    const glossaryText = new Map<string, string>();
    for (const id of usedIds) {
      const entry = page.locator(`[data-glossary-term="${id}"]`);
      glossaryText.set(
        id,
        normalize((await entry.locator('p').first().textContent()) ?? ''),
      );
    }

    // The inline tooltip text for the same id is identical (one source of
    // truth, no divergent second copy).
    for (const route of DEMO_ARTICLES) {
      await page.goto(`${BASE}${route}`);
      const idsHere = await page
        .locator('[data-term-id]')
        .evaluateAll((els) => [
          ...new Set(els.map((el) => el.getAttribute('data-term-id') ?? '')),
        ]);
      for (const id of idsHere) {
        const tooltip = await tooltipFor(page, id);
        const text = normalize((await tooltip.textContent()) ?? '');
        expect(text).toContain(glossaryText.get(id)!);
      }
    }
  });
});

test.describe('Accessibility', () => {
  test('zero axe violations on /glossary (VAL-GLOSS-011)', async ({ page }) => {
    await page.goto(`${BASE}/glossary/`);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('zero axe violations on an article with a definition revealed via keyboard focus (VAL-GLOSS-011)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/classical/kinematics/`);
    // Default state first.
    const resting = await new AxeBuilder({ page }).analyze();
    expect(resting.violations).toEqual([]);

    // Revealed state: keyboard focus on a term, tooltip open.
    const link = termLink(page, 'forward-kinematics');
    await link.focus();
    const tooltip = await tooltipFor(page, 'forward-kinematics');
    await expect(tooltip).toBeVisible();
    const revealed = await new AxeBuilder({ page }).analyze();
    expect(revealed.violations).toEqual([]);
  });
});
