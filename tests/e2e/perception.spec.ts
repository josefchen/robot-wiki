import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { setSlider } from './slider';

/**
 * Perception for Manipulation (VAL-CLASS-039 through VAL-CLASS-045).
 *
 * The article is a pipeline, so the section-scoped assertions below check
 * that each named stage carries its own evidence rather than that the page
 * mentions a word somewhere: a citation chip in a sibling section would
 * satisfy a page-wide text match and still leave the stage unsourced.
 */

const ROUTE = '/classical/perception/';

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/**
 * Visible article text. KaTeX mirrors its TeX source into a screen-reader
 * MathML annotation, which textContent would include, so raw-math checks
 * have to drop those nodes to test what a reader actually sees.
 */
async function visibleArticleText(page: Page): Promise<string> {
  return page.locator('#main-content').evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    for (const node of Array.from(clone.querySelectorAll('.katex-mathml'))) {
      node.remove();
    }
    return clone.textContent ?? '';
  });
}

/**
 * The prose from one h2 up to the next, as text plus the citation ids that
 * live inside it. Sections are flat siblings in the rendered prose, so the
 * walk collects following siblings until the next h2.
 */
async function sections(
  page: Page,
): Promise<Array<{ heading: string; text: string; citeIds: string[] }>> {
  return page.locator('div.prose[data-pagefind-body]').evaluate((prose) => {
    const out: Array<{ heading: string; text: string; citeIds: string[] }> = [];
    for (const h2 of Array.from(prose.querySelectorAll('h2'))) {
      const parts: Element[] = [];
      let node = h2.nextElementSibling;
      while (node !== null && node.tagName !== 'H2') {
        parts.push(node);
        node = node.nextElementSibling;
      }
      const text = parts.map((p) => p.textContent ?? '').join(' ');
      const citeIds = parts.flatMap((p) =>
        Array.from(p.querySelectorAll('[data-cite-id]')).map(
          (c) => c.getAttribute('data-cite-id') ?? '',
        ),
      );
      out.push({
        heading: (h2.textContent ?? '').replace(/\s+/g, ' ').trim(),
        text,
        citeIds,
      });
    }
    return out;
  });
}

/**
 * The section that OWNS a subject. A heading match wins over a body match,
 * because the budget section names every stage as a chart label and would
 * otherwise capture subjects that belong to the stage sections themselves.
 */
function sectionMatching(
  all: Array<{ heading: string; text: string; citeIds: string[] }>,
  pattern: RegExp,
): { heading: string; text: string; citeIds: string[] } | undefined {
  return (
    all.find((s) => pattern.test(s.heading)) ??
    all.find((s) => pattern.test(s.text))
  );
}

async function readout(page: Page, id: string): Promise<string> {
  return ((await page.getByTestId(id).textContent()) ?? '').trim();
}

async function totalMm(page: Page): Promise<number> {
  const text = await readout(page, 'perception-total-readout');
  const value = Number.parseFloat(text.replace(/[^0-9.]/g, ''));
  expect(Number.isFinite(value), `parsed total from "${text}"`).toBe(true);
  return value;
}

function slider(page: Page, name: string): Locator {
  return page.getByTestId(`perception-${name}-slider`);
}

test.describe('classical perception module', () => {
  test('the article names all six pipeline stages, each with a citation chip inside its own section (VAL-CLASS-040)', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    const response = await page.goto(ROUTE);
    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Perception for Manipulation' }),
    ).toBeVisible();

    const all = await sections(page);
    expect(all.length).toBeGreaterThanOrEqual(6);

    // The six required subjects. Each is a heading or a named subject inside
    // a section, and each of those sections carries its own evidence.
    const STAGES: ReadonlyArray<readonly [string, RegExp]> = [
      ['camera calibration', /calibration/i],
      ['hand-eye calibration', /hand-eye calibration/i],
      ['depth sensing', /depth sensing|time of flight|structured light/i],
      ['segmentation', /segmentation/i],
      ['6-DoF pose estimation', /pose estimation/i],
      ['visual servoing', /visual servoing/i],
    ];
    for (const [name, pattern] of STAGES) {
      const section = sectionMatching(all, pattern);
      expect(section, `a section naming ${name}`).toBeDefined();
      expect(
        section!.citeIds.length,
        `${name} (in "${section!.heading}") carries an in-section citation chip`,
      ).toBeGreaterThan(0);
    }

    // Long-form body, and no MDX or component source leaks.
    const visible = await visibleArticleText(page);
    expect(visible.split(/\s+/).filter(Boolean).length).toBeGreaterThan(1200);
    expect(visible).not.toContain('import {');
    expect(visible).not.toContain('<Cite');
    expect(visible).not.toContain('<PerceptionErrorBudget');
    expect(visible).not.toContain('$$');
    expect(await page.getByText('missing citation:').count()).toBe(0);
    expect(errors).toEqual([]);
  });

  test('at least four depth failure surface classes are named with a chip in the same section (VAL-CLASS-041)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const all = await sections(page);
    const depth = sectionMatching(all, /depth sensing/i);
    expect(depth, 'the depth-sensing section').toBeDefined();

    for (const surface of [
      /transparent/i,
      /specular/i,
      /dark/i,
      /thin/i,
      /self-occluded/i,
    ]) {
      expect(depth!.text, `${surface} named in the depth section`).toMatch(
        surface,
      );
    }
    expect(depth!.citeIds.length).toBeGreaterThan(0);

    // "not disclosed" rather than "n/a" for a figure no datasheet publishes.
    expect(depth!.text).toMatch(/not disclosed/i);
  });

  test('the composed error grows with working distance at a non-zero hand-eye angle, and is flat at zero (VAL-CLASS-042)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(page.getByTestId('perception-budget')).toBeVisible();

    // A non-zero angular error makes distance the driver: three sampled
    // positions from minimum to maximum must strictly increase.
    await setSlider(slider(page, 'handeye'), 1.5);
    await expect(page.getByTestId('perception-handeye-value')).toHaveText('1.5');

    const samples: number[] = [];
    for (const d of [0.15, 0.8, 1.5]) {
      await setSlider(slider(page, 'distance'), d);
      await expect(page.getByTestId('perception-distance-value')).toHaveText(
        d.toFixed(2),
      );
      samples.push(await totalMm(page));
    }
    expect(samples[1]).toBeGreaterThan(samples[0]);
    expect(samples[2]).toBeGreaterThan(samples[1]);

    // With the angular term at zero, nothing else in the budget depends on
    // range, so the same sweep leaves the readout unchanged.
    await setSlider(slider(page, 'handeye'), 0);
    await expect(page.getByTestId('perception-handeye-value')).toHaveText('0.0');
    const flat: number[] = [];
    for (const d of [0.15, 0.8, 1.5]) {
      await setSlider(slider(page, 'distance'), d);
      await expect(page.getByTestId('perception-distance-value')).toHaveText(
        d.toFixed(2),
      );
      flat.push(await totalMm(page));
    }
    expect(flat[1]).toBe(flat[0]);
    expect(flat[2]).toBe(flat[0]);
  });

  test('the range-independence simplification is disclosed in visible text, with its reason (VAL-CLASS-042)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const label = page.getByTestId('perception-simplification-label');
    await expect(label).toBeVisible();
    const text = (await label.textContent()) ?? '';
    // What is simplified.
    expect(text).toMatch(/range-independent/i);
    // And why, including what the faithful model would do instead.
    expect(text).toMatch(/square of distance/i);
    expect(text).toMatch(/compose/i);
  });

  test('switching the target from opaque to transparent changes the depth and verdict readouts (VAL-CLASS-043)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const opaqueDepth = await readout(page, 'perception-depth-readout');
    const opaqueVerdict = await readout(page, 'perception-verdict-readout');
    const opaqueNote = await readout(page, 'perception-target-note');
    expect(opaqueVerdict.length).toBeGreaterThan(0);

    // Every slider untouched: only the target changes.
    await page.getByTestId('perception-target-transparent').check();

    const transparentDepth = await readout(page, 'perception-depth-readout');
    const transparentVerdict = await readout(page, 'perception-verdict-readout');
    expect(transparentDepth).not.toBe(opaqueDepth);
    expect(transparentVerdict).not.toBe(opaqueVerdict);
    // Both are visible text, not attribute-only state.
    await expect(page.getByTestId('perception-depth-readout')).toBeVisible();
    await expect(page.getByTestId('perception-verdict-readout')).toBeVisible();
    expect(await readout(page, 'perception-target-note')).not.toBe(opaqueNote);
  });

  test('reset restores all four sliders and the target selection (VAL-CLASS-043)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const values = async () => ({
      handEye: await readout(page, 'perception-handeye-value'),
      distance: await readout(page, 'perception-distance-value'),
      depth: await readout(page, 'perception-depth-value'),
      pose: await readout(page, 'perception-pose-value'),
    });
    const opening = await values();
    await expect(page.getByTestId('perception-target-opaque')).toBeChecked();

    await setSlider(slider(page, 'handeye'), 2.4);
    await setSlider(slider(page, 'distance'), 1.35);
    await setSlider(slider(page, 'depth'), 12);
    await setSlider(slider(page, 'pose'), 9);
    await page.getByTestId('perception-target-specular').check();
    expect(await values()).not.toEqual(opening);

    await page.getByRole('button', { name: /reset the error budget/i }).click();
    expect(await values()).toEqual(opening);
    await expect(page.getByTestId('perception-target-opaque')).toBeChecked();
    await expect(page.getByTestId('perception-target-specular')).not.toBeChecked();
  });

  test('the closing section makes the end-to-end argument and links to a live manipulation module (VAL-CLASS-044)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const all = await sections(page);
    const closer = all[all.length - 1];
    expect(closer.heading).toMatch(/end-to-end/i);

    // The argument itself, as article prose.
    expect(closer.text).toMatch(/explicit pipeline/i);
    expect(closer.text).toMatch(/replaced/i);

    // An inline internal link inside that section, resolving to a real page.
    const prose = page.locator('div.prose[data-pagefind-body]');
    const link = prose
      .locator('a[href^="/manipulation/"]')
      .filter({ visible: true })
      .last();
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toBeTruthy();
    const response = await page.request.get(href as string);
    expect(response.status()).toBe(200);
    // trailingSlash: true, so the navigated URL is the slashed form of the
    // authored href.
    const expected = (href as string).endsWith('/') ? href : `${href}/`;
    await link.click();
    await expect(page).toHaveURL(expected as string);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('the wiki apparatus renders: breadcrumbs, See also, Linked from, References (VAL-CLASS-045)', async ({
    page,
  }) => {
    await page.goto(ROUTE);

    // Three-level breadcrumbs, the trailing crumb not a link.
    const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(crumbs).toBeVisible();
    await expect(crumbs.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(crumbs.getByRole('link')).toHaveCount(2);
    await expect(crumbs.getByText('Perception for Manipulation')).toBeVisible();

    // See also: 2 to 4 entries.
    const seeAlso = page.locator('section[data-section="see-also"]');
    await expect(seeAlso).toBeVisible();
    const seeAlsoCount = await seeAlso.getByRole('link').count();
    expect(seeAlsoCount).toBeGreaterThanOrEqual(2);
    expect(seeAlsoCount).toBeLessThanOrEqual(4);

    // Linked from: at least the state-estimation inbound edge.
    const linkedFrom = page.locator('section[data-section="linked-from"]');
    await expect(linkedFrom).toBeVisible();
    expect(await linkedFrom.getByRole('link').count()).toBeGreaterThanOrEqual(1);
    await expect(
      linkedFrom.getByRole('link', { name: /state estimation/i }),
    ).toBeVisible();

    // References: one entry per declared citation, in declaration order.
    const source = readFileSync(
      join(process.cwd(), 'content', 'classical', 'perception.mdx'),
      'utf8',
    );
    const declared = [
      ...new Set((matter(source).data as { citations?: string[] }).citations ?? []),
    ];
    await expect(
      page.getByRole('heading', { level: 2, name: 'References' }),
    ).toBeVisible();
    const rendered = await page
      .locator('ol [data-reference-id]')
      .evaluateAll((els) =>
        els.map((el) => el.getAttribute('data-reference-id') ?? ''),
      );
    expect(rendered).toEqual(declared);
  });

  test('an inline Term reveals its definition on keyboard focus (VAL-CLASS-045)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const term = page
      .locator('div.prose[data-pagefind-body] [data-term-id]')
      .first();
    await expect(term).toBeVisible();
    const trigger = term.locator('a, button').first();
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await expect(term.locator('[role="tooltip"]')).toBeVisible();
  });

  test('the module is discoverable from the sidebar with the active-route highlight (VAL-CLASS-039)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Perception for Manipulation', exact: true }),
    ).toHaveAttribute('aria-current', 'page');

    // The domain landing and the A-Z index both carry it.
    await page.goto('/classical/');
    await expect(
      page
        .locator('#main-content')
        .getByRole('link', { name: /Perception for Manipulation/ })
        .first(),
    ).toBeVisible();
    await page.goto('/a-z/');
    await expect(
      page
        .locator('#main-content')
        .getByRole('link', { name: /Perception for Manipulation/ })
        .first(),
    ).toBeVisible();
  });

  test('no horizontal page scroll at 375px', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await page.goto(ROUTE);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await context.close();
  });

  test('zero axe violations and zero console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const pageErrors = collectPageErrors(page);
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
