import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setSlider } from './slider';

const ROUTE = '/classical/grasp-planning/';

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/**
 * The article's visible text. KaTeX keeps the original TeX source inside a
 * screen-reader MathML annotation (.katex-mathml), which textContent would
 * include; raw-math checks must exclude those annotations to test what a
 * user actually sees.
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

async function readout(page: Page, id: string): Promise<string> {
  return (await page.getByTestId(id).textContent()) ?? '';
}

test.describe('classical grasp-planning module', () => {
  test('renders full prose on contact mechanics, quality metrics, and force closure (VAL-CLASS-026)', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    const response = await page.goto(ROUTE);
    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Grasp Planning' }),
    ).toBeVisible();

    // Sidebar shows the module active under the classical domain.
    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Grasp Planning', exact: true }),
    ).toHaveAttribute('aria-current', 'page');

    const main = page.locator('#main-content');
    // The required strands are all present as rendered prose. The glossary
    // <Term> markup duplicates its text into a hidden tooltip, so match the
    // VISIBLE copy, not the first DOM hit.
    await expect(
      main.getByText(/friction cone/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/Coulomb/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/force closure/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/form closure/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/antipodal/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/Ferrari and Canny/i).filter({ visible: true }).first(),
    ).toBeVisible();

    // Substantive long-form body: several hundred words at minimum.
    const visibleText = await visibleArticleText(page);
    expect(visibleText.split(/\s+/).filter(Boolean).length).toBeGreaterThan(
      800,
    );

    // No raw MDX or component source leaks into the rendered page.
    expect(visibleText).not.toContain('import {');
    expect(visibleText).not.toContain('<Cite');
    expect(visibleText).not.toContain('<GraspWrenchLab');
    expect(errors).toEqual([]);
  });

  test('citation chips resolve and link externally (VAL-CLASS-027, VAL-CLASS-028)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');

    // Primary sources for the main strands, each with its exact href.
    await expect(
      main.getByRole('link', { name: 'Nguyen 1988' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1177/027836498800700301');
    await expect(
      main.getByRole('link', { name: 'Ferrari 1992' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1109/ROBOT.1992.219918');
    await expect(
      main.getByRole('link', { name: 'Murray 1994' }).first(),
    ).toHaveAttribute(
      'href',
      'https://www.cds.caltech.edu/~murray/books/MLS/pdf/mls94-complete.pdf',
    );
    await expect(
      main.getByRole('link', { name: 'Mishra 1987' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1007/BF01840373');
    await expect(
      main.getByRole('link', { name: 'Markenscoff 1990' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1177/027836499000900102');
    await expect(
      main.getByRole('link', { name: 'Cutkosky 1989' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1109/70.34763');
    await expect(
      main.getByRole('link', { name: 'Bicchi 1995' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1177/027836499501400402');
    await expect(
      main.getByRole('link', { name: 'Bicchi 2000' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1109/ROBOT.2000.844081');
    await expect(
      main.getByRole('link', { name: 'Prattichizzo 2016' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1007/978-3-319-32552-1_38');
    await expect(
      main.getByRole('link', { name: 'Roa 2015' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1007/s10514-014-9402-3');
    await expect(
      main.getByRole('link', { name: 'Mahler 2017' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/1703.09312');

    // Every chip is a real external link; no unresolved ids render.
    const chips = main.locator('a[target="_blank"][href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(11);
    expect(await main.getByText('missing citation:').count()).toBe(0);

    // A chip is keyboard-focusable and reveals its metadata on focus. The
    // source is cited several times on the page, so scope the tooltip to
    // the focused chip's own group (the tooltip is its following sibling).
    const nguyenChip = main.getByRole('link', { name: 'Nguyen 1988' }).first();
    await nguyenChip.focus();
    const tooltip = nguyenChip.locator(
      'xpath=../following-sibling::span[@role="tooltip"]',
    );
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Force-Closure');
  });

  test('KaTeX renders with no raw math delimiters (VAL-CLASS-029)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    // Coulomb cone bound, the wrench stack, the hull construction, the
    // strict-interior closure condition, and the epsilon metric all ship
    // as rendered KaTeX.
    expect(await page.locator('.katex').count()).toBeGreaterThan(8);
    expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(
      5,
    );

    const visibleText = await visibleArticleText(page);
    expect(visibleText).not.toContain('$$');
    expect(visibleText).not.toContain('\\operatorname');
    expect(visibleText).not.toContain('\\varepsilon');
    expect(visibleText).not.toContain('\\arctan');
  });

  test('wrench-space lab renders both views, controls, and readouts (VAL-CLASS-030)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const objectView = page.getByTestId('grasp-object-view');
    const wrenchView = page.getByTestId('grasp-wrench-view');
    await expect(objectView).toBeVisible();
    await expect(wrenchView).toBeVisible();

    await expect(
      page.getByRole('slider', { name: /friction coefficient/i }),
    ).toBeVisible();
    for (const i of [1, 2, 3]) {
      await expect(
        page.getByRole('slider', { name: new RegExp(`contact ${i} position`, 'i') }),
      ).toBeVisible();
    }
    await expect(
      page.getByRole('button', { name: /add a contact/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /remove the last contact/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /reset/i })).toBeVisible();

    // Initial readouts of the default three-contact grasp at mu 0.70.
    await expect(page.getByTestId('grasp-contacts-readout')).toHaveText('3');
    await expect(page.getByTestId('grasp-mu-value')).toHaveText('0.70');
    await expect(page.getByTestId('grasp-closure-readout')).toHaveText('yes');
    await expect(page.getByTestId('grasp-epsilon-readout')).toHaveText(
      '0.444',
    );

    // The wrench hull drew facets and the origin marker is present.
    expect(await wrenchView.locator('polygon').count()).toBeGreaterThan(4);

    // No layout shift: both view boxes are stable before and after input.
    const beforeObj = await objectView.boundingBox();
    const beforeWr = await wrenchView.boundingBox();
    const muSlider = page.getByRole('slider', { name: /friction coefficient/i });
    await muSlider.focus();
    await muSlider.press('ArrowRight');
    const afterObj = await objectView.boundingBox();
    const afterWr = await wrenchView.boundingBox();
    expect(afterObj?.width).toBe(beforeObj?.width);
    expect(afterObj?.height).toBe(beforeObj?.height);
    expect(afterWr?.width).toBe(beforeWr?.width);
    expect(afterWr?.height).toBe(beforeWr?.height);
  });

  test('edits update the hull and readouts in the theoretically correct direction; reset restores (VAL-CLASS-031)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const wrenchView = page.getByTestId('grasp-wrench-view');
    const hullHtml = () => wrenchView.innerHTML();
    const epsilon = async () =>
      Number.parseFloat(await readout(page, 'grasp-epsilon-readout'));

    const baseHull = await hullHtml();
    const baseEpsilon = await epsilon();
    expect(baseEpsilon).toBeCloseTo(0.444, 3);

    // Lower friction: the hull shrinks and epsilon falls, but this
    // symmetric tripod stays force closure (its normals concur).
    const muSlider = page.getByRole('slider', { name: /friction coefficient/i });
    await muSlider.focus();
    await muSlider.press('Home');
    await expect(page.getByTestId('grasp-mu-value')).toHaveText('0.05');
    expect(await epsilon()).toBeGreaterThan(0);
    expect(await epsilon()).toBeLessThan(baseEpsilon);
    expect(await hullHtml()).not.toBe(baseHull);
    await muSlider.press('End');
    await expect(page.getByTestId('grasp-mu-value')).toHaveText('1.00');
    expect(await epsilon()).toBeGreaterThan(baseEpsilon);

    // Remove the third contact: top + right is not antipodal (45 degrees
    // beats arctan(1.00)), so closure breaks and the hull re-renders.
    await page.getByRole('button', { name: /remove the last contact/i }).click();
    await expect(page.getByTestId('grasp-contacts-readout')).toHaveText('2');
    await expect(page.getByTestId('grasp-closure-readout')).toHaveText('no');
    await expect(page.getByTestId('grasp-epsilon-readout')).toHaveText(
      '0.000',
    );
    expect(await hullHtml()).not.toBe(baseHull);

    // Slide contact 2 onto the bottom edge: the pair is antipodal, the
    // shared normal lies strictly inside both cones, and closure recovers.
    const contact2 = page.getByRole('slider', { name: /contact 2 position/i });
    await setSlider(contact2, 0.63);
    await expect(page.getByTestId('grasp-closure-readout')).toHaveText('yes');
    expect(await epsilon()).toBeGreaterThan(0);

    // Reset restores the default grasp and the exact initial readouts.
    await page.getByRole('button', { name: /reset/i }).click();
    await expect(page.getByTestId('grasp-contacts-readout')).toHaveText('3');
    await expect(page.getByTestId('grasp-mu-value')).toHaveText('0.70');
    await expect(page.getByTestId('grasp-closure-readout')).toHaveText('yes');
    await expect(page.getByTestId('grasp-epsilon-readout')).toHaveText(
      '0.444',
    );
    expect(await hullHtml()).toBe(baseHull);
  });

  test('the interactive is keyboard-operable', async ({ page }) => {
    await page.goto(ROUTE);
    const muSlider = page.getByRole('slider', { name: /friction coefficient/i });
    await muSlider.focus();
    await expect(muSlider).toBeFocused();
    await muSlider.press('ArrowRight');
    await expect(page.getByTestId('grasp-mu-value')).toHaveText('0.75');

    // Contact sliders take keyboard focus and input too. The default 0.125
    // sits between step grid points; one ArrowRight lands past 0.13 either
    // way (browser step snapping or raw addition), displaying 0.14.
    const contact1 = page.getByRole('slider', { name: /contact 1 position/i });
    await contact1.focus();
    await expect(contact1).toBeFocused();
    await contact1.press('ArrowRight');
    await expect(page.getByTestId('grasp-contact-1-value')).toHaveText('0.14');

    // The add/remove/reset controls activate from the keyboard.
    const add = page.getByRole('button', { name: /add a contact/i });
    await add.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('grasp-contacts-readout')).toHaveText('4');
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

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
