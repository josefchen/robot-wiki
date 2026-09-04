import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { setSlider } from './slider';
import { publishedModules } from '../../data/modules';

/**
 * Scene Representation and Mapping (VAL-CLASS-046 through VAL-CLASS-051).
 *
 * The article is a ladder, so the representation assertions are
 * SECTION-SCOPED: a citation chip in a neighbouring section would satisfy
 * a page-wide text match while leaving the rung it is supposed to support
 * unsourced. The instrument assertions read the capability indicators as
 * a SET, because the contract is about two representations disagreeing
 * rather than about any single indicator's value.
 */

const ROUTE = '/classical/scene-representation/';

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function visibleArticleText(page: Page): Promise<string> {
  return page.locator('#main-content').evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    for (const node of Array.from(clone.querySelectorAll('.katex-mathml'))) {
      node.remove();
    }
    return clone.textContent ?? '';
  });
}

/** Prose from one heading (h2 or h3) to the next, with its citation ids. */
async function sections(
  page: Page,
): Promise<Array<{ heading: string; text: string; citeIds: string[] }>> {
  return page.locator('div.prose[data-pagefind-body]').evaluate((prose) => {
    const out: Array<{ heading: string; text: string; citeIds: string[] }> = [];
    const headings = Array.from(prose.querySelectorAll('h2, h3'));
    for (const heading of headings) {
      const parts: Element[] = [];
      let node = heading.nextElementSibling;
      while (node !== null && node.tagName !== 'H2' && node.tagName !== 'H3') {
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
        heading: (heading.textContent ?? '').replace(/\s+/g, ' ').trim(),
        text,
        citeIds,
      });
    }
    return out;
  });
}

/** The section that OWNS a subject: a heading match beats a body match. */
function sectionMatching(
  all: Array<{ heading: string; text: string; citeIds: string[] }>,
  pattern: RegExp,
): { heading: string; text: string; citeIds: string[] } | undefined {
  return (
    all.find((s) => pattern.test(s.heading)) ??
    all.find((s) => pattern.test(s.text))
  );
}

const CAPABILITY_IDS = ['free-space', 'contact-normal', 'novel-view'] as const;

async function capabilityStates(page: Page): Promise<string[]> {
  const states: string[] = [];
  for (const id of CAPABILITY_IDS) {
    const value = await page
      .getByTestId(`scene-capability-${id}`)
      .getAttribute('data-state');
    states.push(value ?? '');
  }
  return states;
}

/** The footprint readout in bytes, parsed from its rendered unit. */
async function footprintBytes(page: Page): Promise<number> {
  const text = (
    (await page.getByTestId('scene-footprint-readout').textContent()) ?? ''
  ).trim();
  const value = Number.parseFloat(text);
  expect(Number.isFinite(value), `parsed footprint from "${text}"`).toBe(true);
  const unit = /GB/.test(text)
    ? 1024 ** 3
    : /MB/.test(text)
      ? 1024 ** 2
      : /KB/.test(text)
        ? 1024
        : 1;
  return value * unit;
}

function slider(page: Page): Locator {
  return page.getByTestId('scene-resolution-slider');
}

test.describe('classical scene-representation module', () => {
  test('the ladder names four representations, each cited inside its own section (VAL-CLASS-047)', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    const response = await page.goto(ROUTE);
    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Scene Representation and Mapping',
      }),
    ).toBeVisible();

    const all = await sections(page);
    expect(all.length).toBeGreaterThanOrEqual(4);

    const RUNGS: ReadonlyArray<readonly [string, RegExp]> = [
      ['occupancy grids', /occupancy grid/i],
      ['signed-distance fields', /signed[- ]distance field/i],
      ['neural radiance fields', /neural radiance field|NeRF/i],
      ['Gaussian splatting', /Gaussian splat/i],
    ];
    const idsAcrossRungs = new Set<string>();
    for (const [name, pattern] of RUNGS) {
      const section = sectionMatching(all, pattern);
      expect(section, `a section naming ${name}`).toBeDefined();
      expect(
        section!.citeIds.length,
        `${name} (in "${section!.heading}") carries an in-section citation chip`,
      ).toBeGreaterThan(0);
      for (const id of section!.citeIds) idsAcrossRungs.add(id);
    }
    // Not all four rungs leaning on one source (VAL-CLASS-047).
    expect(idsAcrossRungs.size).toBeGreaterThanOrEqual(4);

    // Long-form body, and no MDX or component source leaks.
    const visible = await visibleArticleText(page);
    expect(visible.split(/\s+/).filter(Boolean).length).toBeGreaterThan(1200);
    expect(visible).not.toContain('import {');
    expect(visible).not.toContain('<Cite');
    expect(visible).not.toContain('<SceneRepresentationLadder');
    expect(visible).not.toContain('$$');
    expect(await page.getByText('missing citation:').count()).toBe(0);
    expect(errors).toEqual([]);
  });

  test('SLAM is covered as a system: both front-end families, loop closure, place recognition (VAL-CLASS-048)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const visible = await visibleArticleText(page);
    expect(visible).toMatch(/loop closure/i);
    expect(visible).toMatch(/place recognition/i);

    // Both front-end families named inside ONE section that distinguishes
    // them, not scattered across the article.
    const all = await sections(page);
    const frontEnd = all.find(
      (s) => /feature-based/i.test(s.text) && /\bdirect\b/i.test(s.text),
    );
    expect(
      frontEnd,
      'one section naming both feature-based and direct front ends',
    ).toBeDefined();
    expect(frontEnd!.text).toMatch(/photometric/i);
    expect(frontEnd!.citeIds.length).toBeGreaterThan(0);

    // An inline internal link to state estimation, resolving to a real page.
    const prose = page.locator('div.prose[data-pagefind-body]');
    const link = prose
      .locator('a[href^="/classical/state-estimation"]')
      .filter({ visible: true })
      .first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    const status = (await page.request.get(href as string)).status();
    expect(status).toBe(200);
  });

  test('the renderer-versus-simulator verdict is stated and cross-referenced (VAL-CLASS-049)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const visible = await visibleArticleText(page).then((t) =>
      t.replace(/\s+/g, ' '),
    );
    // The verdict, as rendered article prose.
    expect(visible).toMatch(/radiance field is geometry for rendering/i);
    expect(visible).toMatch(
      /rendering weight rather than an occupancy probability/i,
    );
    expect(visible).toMatch(/no surface anywhere in the store/i);

    // An inline internal link to a published world-models module.
    const prose = page.locator('div.prose[data-pagefind-body]');
    const link = prose
      .locator('a[href^="/world-models/"]')
      .filter({ visible: true })
      .first();
    await expect(link).toBeVisible();
    const href = (await link.getAttribute('href')) as string;
    const label = ((await link.textContent()) ?? '').trim();
    expect(label.length).toBeGreaterThan(0);
    expect((await page.request.get(href)).status()).toBe(200);

    await link.click();
    await expect(page).toHaveURL(href.endsWith('/') ? href : `${href}/`);
    const h1 = ((await page.getByRole('heading', { level: 1 }).textContent()) ?? '')
      .trim();
    // The destination's own h1 is the registry title for the route the link
    // pointed at, derived rather than named, so retitling a module cannot
    // leave this asserting a string no page carries.
    const slug = href.replace(/^\/world-models\//, '').replace(/\/$/, '');
    const destination = publishedModules().find(
      (m) => m.domain === 'world-models' && m.slug === slug,
    );
    expect(destination, `${href} is a published world-models module`).toBeDefined();
    expect(h1).toBe(destination!.title);
  });

  test('two representations yield different capability sets, one negative on contact (VAL-CLASS-050)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(page.getByTestId('scene-ladder')).toBeVisible();

    await page.getByTestId('scene-select-occupancy-grid').click();
    const grid = await capabilityStates(page);
    await page.getByTestId('scene-select-gaussian-splat').click();
    const splat = await capabilityStates(page);
    expect(splat).not.toEqual(grid);

    // The negative contact-normal state, readable as visible text AND as
    // an indicator with an accessible name.
    const contact = page.getByTestId('scene-capability-contact-normal');
    await expect(contact).toBeVisible();
    await expect(contact).toHaveAttribute('data-state', 'no');
    await expect(contact).toContainText(/no/i);
    await expect(contact).toHaveAttribute(
      'aria-label',
      /surface normal for contact:\s*no/i,
    );

    // And a rung that is positive on the same capability, so "no" is a
    // graded verdict rather than the only thing the widget can say.
    await page.getByTestId('scene-select-tsdf').click();
    await expect(
      page.getByTestId('scene-capability-contact-normal'),
    ).toHaveAttribute('data-state', 'yes');
  });

  test('the footprint rises strictly with resolution while the indicators hold (VAL-CLASS-051)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const max = Number(await slider(page).getAttribute('max'));
    expect(max).toBeGreaterThanOrEqual(2);

    const before = await capabilityStates(page);
    const readings: number[] = [];
    for (let i = 0; i <= max; i += 1) {
      await setSlider(slider(page), i);
      readings.push(await footprintBytes(page));
      expect(await capabilityStates(page), `indicators at step ${i}`).toEqual(
        before,
      );
    }
    expect(readings.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < readings.length; i += 1) {
      expect(
        readings[i],
        `footprint at step ${i} exceeds step ${i - 1}`,
      ).toBeGreaterThan(readings[i - 1]!);
    }
  });

  test('the resolution slider moves under the keyboard and reset restores both controls', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const opening = await page
      .getByTestId('scene-resolution-value')
      .textContent();

    await slider(page).focus();
    await expect(slider(page)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('scene-resolution-value')).not.toHaveText(
      opening ?? '',
    );

    await page.getByTestId('scene-select-mesh').click();
    await expect(page.getByTestId('scene-select-mesh')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page
      .getByRole('button', { name: /reset the representation and resolution/i })
      .click();
    await expect(page.getByTestId('scene-resolution-value')).toHaveText(
      opening ?? '',
    );
    await expect(
      page.getByTestId('scene-select-occupancy-grid'),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('scene-select-mesh')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('the wiki apparatus renders: breadcrumbs, See also, Linked from, References (VAL-CLASS-051)', async ({
    page,
  }) => {
    await page.goto(ROUTE);

    const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(crumbs).toBeVisible();
    await expect(crumbs.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(crumbs.getByRole('link')).toHaveCount(2);
    await expect(
      crumbs.getByText('Scene Representation and Mapping'),
    ).toBeVisible();

    const seeAlso = page.locator('section[data-section="see-also"]');
    await expect(seeAlso).toBeVisible();
    const seeAlsoCount = await seeAlso.getByRole('link').count();
    expect(seeAlsoCount).toBeGreaterThanOrEqual(2);
    expect(seeAlsoCount).toBeLessThanOrEqual(4);

    // The inbound edge added at publish time.
    const linkedFrom = page.locator('section[data-section="linked-from"]');
    await expect(linkedFrom).toBeVisible();
    expect(await linkedFrom.getByRole('link').count()).toBeGreaterThanOrEqual(1);
    // Named by its registry title rather than its slug: the backlink renders
    // the article's title, and world-models/taxonomy is titled for the
    // question it answers.
    const inbound = publishedModules().find(
      (m) => m.domain === 'world-models' && m.slug === 'taxonomy',
    );
    expect(inbound, 'world-models/taxonomy is published').toBeDefined();
    await expect(
      linkedFrom.getByRole('link', { name: inbound!.title }),
    ).toBeVisible();

    // References: one entry per declared citation, in declaration order.
    const source = readFileSync(
      join(process.cwd(), 'content', 'classical', 'scene-representation.mdx'),
      'utf8',
    );
    const declared = [
      ...new Set(
        (matter(source).data as { citations?: string[] }).citations ?? [],
      ),
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

  test('an inline Term reveals its definition on keyboard focus (VAL-CLASS-051)', async ({
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

  test('the module is discoverable from the sidebar, the domain landing and A-Z (VAL-CLASS-046)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    await expect(
      nav.getByRole('link', {
        name: 'Scene Representation and Mapping',
        exact: true,
      }),
    ).toHaveAttribute('aria-current', 'page');

    await page.goto('/classical/');
    await expect(
      page
        .locator('#main-content')
        .getByRole('link', { name: /Scene Representation and Mapping/ })
        .first(),
    ).toBeVisible();
    await page.goto('/a-z/');
    await expect(
      page
        .locator('#main-content')
        .getByRole('link', { name: /Scene Representation and Mapping/ })
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

  // Proportion regression guard: at reader width the diagram is the
  // instrument's teaching centrepiece, so it must not be the smaller
  // element beside its own controls, and its panel box must not carry
  // empty space equal to the drawing. Both defects shipped green through
  // every behavioral assertion (SVG 228x167 against a 272px control
  // column, fill 50-56%), which is why the geometry is pinned here.
  test('the diagram is not the smaller element at 1440px', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(ROUTE);
    const geometry = await page.evaluate(() => {
      const svg = document.querySelector(
        '[data-testid="scene-ladder"] svg[data-testid^="scene-panel-"]',
      );
      const panel = svg?.parentElement ?? null;
      const controls = document
        .querySelector('[data-testid="scene-capabilities"]')
        ?.closest('div.grid > div:last-child') ?? null;
      const r = (el: Element | null) =>
        el ? (el as HTMLElement).getBoundingClientRect() : null;
      return {
        svgWidth: r(svg)?.width ?? 0,
        panelWidth: r(panel)?.width ?? 0,
        panelHeight: r(panel)?.height ?? 0,
        controlsWidth: r(controls)?.width ?? 0,
      };
    });
    expect(geometry.svgWidth).toBeGreaterThan(0);
    expect(geometry.controlsWidth).toBeGreaterThan(0);
    // The diagram is wider than the control column beside it.
    expect(geometry.svgWidth).toBeGreaterThan(geometry.controlsWidth);
    // The drawing fills its own panel box (no half-empty frame).
    const aspect = 220 / 300; // viewBox height/width incl. title band
    const expectedHeight = geometry.svgWidth * aspect;
    expect(geometry.panelHeight).toBeLessThan(expectedHeight * 1.25);
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
