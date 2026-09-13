import { expect, test, type Locator, type Page } from './servo-apollo-fixture';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
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

  test('visual servoing separates IBVS/PBVS and states local convergence and visibility limits', async ({ page }) => {
    await page.goto(ROUTE);
    const servo = sectionMatching(await sections(page), /visual servoing/i);
    expect(servo).toBeDefined();
    expect(servo!.text).toMatch(/image-based visual servoing \(IBVS\)/i);
    expect(servo!.text).toMatch(/position-based visual servoing \(PBVS\)/i);
    expect(servo!.text).toMatch(/local asymptotic stability/i);
    expect(servo!.text).toMatch(/full rank/i);
    expect(servo!.text).toMatch(/positivity condition/i);
    expect(servo!.text).toMatch(/local minima or singularities/i);
    expect(servo!.text).toMatch(/Visibility requirements depend on the chosen measurements/);
    expect(servo!.text).toMatch(/observed in both images/);
    expect(servo!.text).toMatch(/matches between the current and desired images/);
    expect(servo!.text).toMatch(/Part I[\s\S]*performance and stability/);
    expect(servo!.citeIds).toContain('chaumette-hutchinson-2006');
    expect(servo!.citeIds).toContain('chaumette-hutchinson-2007');
    expect(servo!.text).not.toMatch(/deletes the pose-estimation term|final image error still converges to zero|must stay in view for the whole motion/);
    const term = page.locator('[data-term-id="visual-servoing"]').first();
    await term.locator('a, button').first().focus();
    const tooltip = term.locator('[role="tooltip"]');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('local stability conditions');
    await expect(tooltip).not.toContainText('skips pose estimation entirely');
  });

  test('depth failure examples retain source-specific conditions (VAL-CLASS-041)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const depth = sectionMatching(await sections(page), /depth sensing/i);
    expect(depth, 'the depth-sensing section').toBeDefined();
    for (const text of ['D410/D415 and D43x', 'up to 2 m', '80%', 'HD resolution',
      'valid pixels', 'ground truth', 'PhoXi 3D Scanner L', '0.200 mm (1 σ)',
      '0.190 mm (1 σ)', '870 to 2150 mm', '250 to 2750 ms',
      'May cause image saturation', 'D400f', 'Saturation mitigated',
      'Mitigated does not mean eliminated']) expect(depth!.text).toContain(text);
    expect(depth!.text).not.toMatch(/Three families of depth sensor|accurate option and the slow one|rules out closing a control loop/);
    await expect(page.getByTestId('perception-target-note')).toContainText(
      'not a material-specific accuracy guarantee',
    );
    // Keep all named topics; do not certify five universal failure classes.
    for (const topic of [/transparent/i, /specular/i, /dark surfaces/i, /thin objects/i, /self-occlusion/i]) {
      expect(depth!.text).toMatch(topic);
    }
    expect(depth!.citeIds).toContain('realsense-tuning-2026');
    expect(depth!.citeIds).toContain('azure-kinect-depth-docs-2026');
    expect(depth!.text).toMatch(/D415 and D435/);
    expect(depth!.text).toMatch(/staying outside the minimum operating distance, MinZ/);
    for (const cause of ['outside the active IR illumination mask', 'saturated IR signal', 'low IR signal', 'filter outlier', 'multi-path interference']) {
      expect(depth!.text.toLowerCase()).toContain(cause.toLowerCase());
    }
    expect(depth!.text).toMatch(/not a measured zero-distance surface/);
    expect(depth!.text).toMatch(/underexposure and overexposure/);
    expect(depth!.text).toMatch(/leaving the projector on/);
    expect(depth!.text).toMatch(/not necessarily two exactly equal matches/);
    expect(depth!.text).toMatch(/not a blanket failure claim for every thin object/);
    expect(depth!.text).toMatch(/not a demonstration about generic self-occlusion/);
    expect(depth!.text).not.toMatch(/which is why multi-view capture is a standard answer|return never clears the noise floor/);
    // Preserved unassigned row34 display oracle, not source acceptance of absence.
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
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
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


for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test(`pose source corrections render at ${viewport.width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    const denied: string[] = [];
    const captures: object[] = [];
    const equationProof: object[] = [];
    const inputPath = process.env.ROBOT_WIKI_GATE_INPUTS;
    const inputSha256 = inputPath ? createHash('sha256').update(readFileSync(inputPath)).digest('hex') : null;
    const saveState = () => writeFileSync(testInfo.outputPath('reader-state.json'), JSON.stringify({
      url: page.url(), viewport, inputPath, inputSha256, errors, denied, equationProof, captures,
    }, null, 2));
    const capture = async (name: string, state: object = {}) => {
      const path = testInfo.outputPath(`${name}.png`);
      await page.screenshot({ path, animations: 'disabled' });
      captures.push({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
        utc: new Date().toISOString(), url: page.url(), viewport, state, inputPath, inputSha256 });
      saveState();
    };
    const position = async (element: Locator) => {
      await element.scrollIntoViewIfNeeded();
      await element.evaluate(el => window.scrollBy(0, el.getBoundingClientRect().top - 100));
    };
    const bounds = async (element: Locator) => {
      const box = await element.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      return box!;
    };
    const captureText = async (element: Locator, name: string) => {
      await position(element);
      const box = await bounds(element);
      for (let offset = 0, part = 1; offset < box.height; offset += viewport.height - 180, part++) {
        await element.evaluate((el, y) => window.scrollBy(0, el.getBoundingClientRect().top - 100 + y), offset);
        await capture(`${name}-${part}`, { subject: name, textOffset: offset, elementHeight: box.height });
      }
    };
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.context().route('**/*', route => {
      const url = new URL(route.request().url());
      if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return route.continue();
      denied.push(url.href);
      return route.abort();
    });
    await page.context().addInitScript(() => {
      const install = () => {
        if (!document.documentElement) return;
        const style = document.createElement('style');
        style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
        document.documentElement.appendChild(style);
        observer.disconnect();
      };
      const observer = new MutationObserver(install);
      observer.observe(document, { childList: true, subtree: true });
      install();
    });
    await page.setViewportSize(viewport);
    const response = await page.goto(ROUTE);
    expect(response?.status()).toBe(200);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el =>
      Object.keys(el).some(key => key.startsWith('__reactFiber$'))));
    await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
    const prose = page.locator('div.prose[data-pagefind-body]');
    await expect(prose).toContainText('Equality counts as correct');
    await expect(prose).toContainText('strict correctness test');
    await expect(prose).toContainText('0 to 100 scale');
    await expect(prose).toContainText('comparable, not identical');
    await expect(prose).not.toContainText('Three years erased');
    await expect(prose.locator('[data-cite-id="hinterstoisser-2012"]')).toHaveCount(4);
    await expect(prose.locator('[data-cite-id="bop-challenge-2023"]')).toHaveCount(3);

    // Exercise the visible taxonomy, never the hidden desktop navigation at 375px.
    const menu = page.getByRole('button', { name: 'Open navigation menu' });
    if (viewport.width === 375) {
      await expect(menu).toBeVisible();
      await menu.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      const close = dialog.getByRole('button', { name: 'Close navigation menu' });
      await expect(close).toBeFocused();
      const nav = dialog.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
      await expect(nav.getByRole('link', { name: 'Perception for Manipulation', exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
      await expect(page.locator('#main-content').locator('xpath=ancestor-or-self::*[@inert]').first()).toBeAttached();
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
      await close.focus();
      await page.keyboard.press('Shift+Tab');
      // The dialog also contains the dismissing scrim, outside the trapped
      // panel. Assert actual wrap behavior, not that scrim's DOM ordering.
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
      await expect(close).not.toBeFocused();
      await page.keyboard.press('Tab');
      await expect(close).toBeFocused();
      await capture('mobile-drawer', { currentPage: ROUTE, backgroundInert: true, tabTrapBothDirections: true });
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(menu).toBeFocused();
      await expect(page.locator('[inert]')).toHaveCount(0);
      await capture('mobile-drawer-escape', { focusReturned: true, inertRemoved: true });
    } else {
      await expect(menu).not.toBeVisible();
      const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
      await expect(nav.getByRole('link', { name: 'Perception for Manipulation', exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    }

    const formulas = page.locator('.katex-display').filter({ hasText: /operatorname.*avg/ });
    await expect(formulas).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      const formula = formulas.nth(i);
      await expect(formula).toHaveAttribute('role', 'region');
      await expect(formula).toHaveAttribute('aria-label', `Display equation ${i + 2}`);
      await expect(formula).toHaveAttribute('tabindex', '0');
      // Derive the actual preceding visible tab stop; citation ordering is
      // not keyboard ordering (a citation can follow its display equation).
      const keyboardEntry = await formula.evaluate(el => {
        const stops = [...document.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])')];
        const previous = stops.filter(stop => !el.contains(stop) &&
          Boolean(stop.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) &&
          stop.getClientRects().length > 0 && getComputedStyle(stop).visibility !== 'hidden' &&
          !stop.closest('[inert]')).at(-1);
        if (!previous) throw new Error('No preceding visible keyboard stop');
        previous.focus();
        return { tag: previous.tagName, text: previous.textContent, href: previous.getAttribute('href') };
      });
      const keyboardPath: Array<{ tag: string; label: string | null; text: string | null }> = [];
      for (let tab = 0; tab < 4; tab++) {
        await page.keyboard.press('Tab');
        keyboardPath.push(await page.evaluate(() => ({
          tag: document.activeElement!.tagName,
          label: document.activeElement!.getAttribute('aria-label'),
          text: document.activeElement!.textContent,
        })));
        if (await formula.evaluate(el => el === document.activeElement)) break;
      }
      await expect(formula).toBeFocused();
      await position(formula);
      await bounds(formula);
      const geometry = await formula.evaluate(el => {
        const region = el as HTMLElement;
        const origin = region.getBoundingClientRect();
        const glyphs: Array<{ text: string; left: number; right: number }> = [];
        const walker = document.createTreeWalker(region.querySelector('.katex-html')!, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          for (let c = 0; c < (node.textContent?.length ?? 0); c++) {
            if (!node.textContent![c].trim()) continue;
            const range = document.createRange();
            range.setStart(node, c); range.setEnd(node, c + 1);
            const rect = range.getBoundingClientRect();
            if (rect.width > 0) glyphs.push({ text: node.textContent![c], left: rect.left - origin.left + region.scrollLeft, right: rect.right - origin.left + region.scrollLeft });
          }
        }
        // KaTeX draws norm delimiters and accents with SVGs, not text nodes.
        for (const svg of region.querySelectorAll('.katex-html svg')) {
          const rect = svg.getBoundingClientRect();
          if (rect.width > 0) glyphs.push({ text: '[SVG delimiter/accent]', left: rect.left - origin.left + region.scrollLeft, right: rect.right - origin.left + region.scrollLeft });
        }
        const style = getComputedStyle(region);
        return { width: region.clientWidth, scrollWidth: region.scrollWidth, scrollLeft: region.scrollLeft,
          glyphs, outline: style.outline, outlineOffset: style.outlineOffset };
      });
      expect(geometry.glyphs.length).toBeGreaterThan(20);
      expect(geometry.scrollLeft).toBe(0);
      const windows = [{ left: 0, right: geometry.width }];
      await capture(`equation-${i + 1}-start`, { ...geometry, glyphs: undefined, keyboardFocused: true });
      const max = geometry.scrollWidth - geometry.width;
      let previous = 0;
      while (previous < max - 1) {
        await page.keyboard.press('ArrowRight');
        await expect.poll(() => formula.evaluate(el => el.scrollLeft)).toBeGreaterThan(previous);
        previous = await formula.evaluate(el => el.scrollLeft);
      }
      if (max > 1) {
        await expect(formula).toBeFocused();
        windows.push({ left: previous, right: previous + geometry.width });
        await capture(`equation-${i + 1}-end`, { scrollLeft: previous, maxScrollLeft: max, keyboardFocused: true });
      }
      // Every glyph, including both ends of the unsquared norm, must be
      // entirely readable in at least one actual captured keyboard state.
      const unreachable = geometry.glyphs.filter(glyph => !windows.some(window => glyph.left >= window.left - 1 && glyph.right <= window.right + 1));
      expect(unreachable).toEqual([]);
      while (previous > 0) {
        await page.keyboard.press('ArrowLeft');
        await expect.poll(() => formula.evaluate(el => el.scrollLeft)).toBeLessThan(previous);
        previous = await formula.evaluate(el => el.scrollLeft);
      }
      await page.keyboard.press('Tab');
      await expect(formula).not.toBeFocused();
      equationProof.push({ equation: i + 1, keyboardEntry, keyboardPath, geometry, windows, unreachable, keyboardReturnedToStart: true, keyboardExited: true });
      saveState();
    }
    const tex = await prose.locator('annotation').allTextContents();
    expect(tex.some(value => value.includes('m \\leq k_m d'))).toBe(true);
    expect(tex.some(value => value.includes('e < \\theta_e'))).toBe(true);
    const term = prose.locator('[data-term-id="add-s-metric"]');
    await position(term);
    await term.locator('a, button').first().focus();
    await expect(term.locator('[role="tooltip"]')).toBeVisible();
    await expect(term.locator('[role="tooltip"]')).not.toContainText('BOP');
    await bounds(term.locator('[role="tooltip"]'));
    await capture('glossary-focus', { term: 'add-s-metric' });
    await page.keyboard.press('Escape');
    await page.keyboard.press('Tab');
    for (const id of ['hinterstoisser-2012', 'bop-challenge-2023']) {
      const cites = prose.locator(`[data-cite-id="${id}"]`);
      for (let occurrence = 0; occurrence < await cites.count(); occurrence++) {
      const cite = cites.nth(occurrence);
      await position(cite);
      await cite.evaluate(el => window.scrollBy(0, el.getBoundingClientRect().top - 350));
      await cite.locator('a').first().hover();
      const hoverBox = await bounds(cite.getByRole('tooltip'));
      expect(hoverBox.y).toBeGreaterThanOrEqual(54);
      expect(hoverBox.y + hoverBox.height).toBeLessThanOrEqual(viewport.height);
      await page.mouse.move(viewport.width - 1, viewport.height - 1);
      await cite.locator('a').first().focus();
      await expect(cite.getByRole('tooltip')).toBeVisible();
      const focusBox = await bounds(cite.getByRole('tooltip'));
      expect(focusBox.y).toBeGreaterThanOrEqual(54);
      expect(focusBox.y + focusBox.height).toBeLessThanOrEqual(viewport.height);
      await capture(`${id}-source-focus-${occurrence + 1}`, { citation: id, occurrence: occurrence + 1, hoverBox, focusBox });
      await page.keyboard.press('Escape');
      await page.keyboard.press('Tab');
      }
    }
    // Leave the last citation's second link before unobscured prose captures.
    await page.keyboard.press('Tab');
    await expect(prose.getByRole('tooltip')).toHaveCount(0);
    for (const [text, name] of [
      ['The paper counts the detection', 'inclusive-threshold'],
      ['The BOP Challenge 2023 report uses', 'bop-protocol'],
      ['In the report’s retrospective', 'bop-retrospective'],
      ['For unseen objects, GenFlow', 'bop-unseen'],
    ]) await captureText(prose.locator('p').filter({ hasText: text }), name);
    for (const [id, authors] of [
      ['hinterstoisser-2012', ['Stefan Hinterstoisser', 'Vincent Lepetit', 'Slobodan Ilic', 'Stefan Holzer', 'Gary Bradski', 'Kurt Konolige', 'Nassir Navab']],
      ['bop-challenge-2023', ['Tomas Hodan', 'Martin Sundermeyer', 'Yann Labbé', 'Van Nguyen Nguyen', 'Gu Wang', 'Eric Brachmann', 'Bertram Drost', 'Vincent Lepetit', 'Carsten Rother', 'Jiri Matas']],
    ] as const) {
      const reference = page.locator(`ol [data-reference-id="${id}"]`);
      const expand = reference.getByRole('button', { name: /Show all/ });
      if (await expand.count()) { await expand.focus(); await page.keyboard.press('Enter'); }
      const text = await reference.innerText();
      let previous = -1;
      for (const author of authors) { const index = text.indexOf(author); expect(index).toBeGreaterThan(previous); previous = index; }
      if (id === 'bop-challenge-2023') await expect(reference.getByRole('link', { name: /^BOP Challenge/ })).toHaveAttribute('href', 'https://arxiv.org/abs/2403.09799');
      await captureText(reference, `${id}-byline`);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
    expect(denied).toEqual([]);
    saveState();
    await testInfo.attach('reader-state', { path: testInfo.outputPath('reader-state.json'), contentType: 'application/json' });
  });
}
