import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setSlider } from './slider';

const ROUTE = '/classical/kinematics/';

const BASE = { name: /base joint/i };
const ELBOW = { name: /elbow joint/i };
const WRIST = { name: /wrist joint/i };

/** Parse a signed FK readout like "+0.42" / "-1.03" into a number. */
async function eeValue(page: Page, axis: 'x' | 'y'): Promise<number> {
  const text = (await page.getByTestId(`fk-ee-${axis}`).textContent()) ?? '';
  expect(text).not.toContain('NaN');
  const value = Number.parseFloat(text);
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/**
 * Range sliders are driven through the shared setSlider helper
 * (tests/e2e/slider.ts): fill() can leave React's change tracking one
 * event behind under load (quirk 9).
 */

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

test.describe('classical kinematics module', () => {
  test('renders full prose on FK, DH, IK, and the Jacobian (VAL-CLASS-001)', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Kinematics' }),
    ).toBeVisible();

    // Sidebar shows the module active under the classical domain.
    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Kinematics' }),
    ).toHaveAttribute('aria-current', 'page');

    const main = page.locator('#main-content');
    // The four required strands are all present as rendered prose. The
    // glossary <Term> markup adds hidden-at-rest tooltip copies of the
    // FK/IK definitions to the DOM, so match the VISIBLE text, not the
    // first DOM hit.
    await expect(main.getByText(/forward kinematics/i).filter({ visible: true }).first()).toBeVisible();
    await expect(main.getByText(/Denavit/i).filter({ visible: true }).first()).toBeVisible();
    await expect(main.getByText(/Hartenberg/i).filter({ visible: true }).first()).toBeVisible();
    await expect(main.getByText(/Jacobian/i).filter({ visible: true }).first()).toBeVisible();
    await expect(main.getByText(/inverse kinematics/i).filter({ visible: true }).first()).toBeVisible();
    await expect(main.getByText(/singularit/i).filter({ visible: true }).first()).toBeVisible();

    // Substantive long-form body: several hundred words at minimum.
    const visibleText = await visibleArticleText(page);
    expect(visibleText.split(/\s+/).filter(Boolean).length).toBeGreaterThan(800);

    // No raw MDX or component source leaks into the rendered page.
    expect(visibleText).not.toContain('import {');
    expect(visibleText).not.toContain('<Cite');
    expect(visibleText).not.toContain('<PlanarFkArm');
    expect(errors).toEqual([]);
  });

  test('citation chips resolve and link externally (VAL-CLASS-002, VAL-CLASS-003)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');

    // Primary sources for the four topic areas, each with its exact href.
    await expect(
      main.getByRole('link', { name: 'Denavit 1955' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1115/1.4011045');
    await expect(
      main.getByRole('link', { name: 'Whitney 1969' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1109/TMMS.1969.299896');
    await expect(
      main.getByRole('link', { name: 'Wampler 1986' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1109/TSMC.1986.289285');
    await expect(
      main.getByRole('link', { name: 'Levenberg 1944' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1090/qam/10666');
    await expect(
      main.getByRole('link', { name: 'Marquardt 1963' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1137/0111030');
    await expect(
      main.getByRole('link', { name: 'Lynch 2017' }).first(),
    ).toHaveAttribute('href', 'https://modernrobotics.northwestern.edu/');

    // Every chip is a real external link; no unresolved ids render.
    const chips = main.locator('a[target="_blank"][href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(9);
    expect(await main.getByText('missing citation:').count()).toBe(0);

    // A chip is keyboard-focusable and reveals its metadata on focus.
    const dhChip = main.getByRole('link', { name: 'Denavit 1955' }).first();
    await dhChip.focus();
    await expect(
      main
        .locator('span[role="tooltip"]')
        .filter({ hasText: 'A Kinematic Notation for Lower-Pair Mechanisms' }),
    ).toBeVisible();
  });

  test('KaTeX renders with no raw math delimiters (VAL-CLASS-004)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    // Transform matrices, the DH convention, and the Jacobian equations all
    // ship as rendered KaTeX, both display and inline.
    expect(await page.locator('.katex').count()).toBeGreaterThan(20);
    expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(6);

    // No raw math source is visible anywhere in the article body.
    const visibleText = await visibleArticleText(page);
    expect(visibleText).not.toContain('$$');
    expect(visibleText).not.toContain('\\frac');
    expect(visibleText).not.toContain('\\theta');
    expect(visibleText).not.toContain('\\lambda');
  });

  test('2D FK visualizer renders sliders, readout, and reset (VAL-CLASS-005)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    for (const joint of [BASE, ELBOW, WRIST]) {
      const slider = page.getByRole('slider', joint);
      await expect(slider).toBeVisible();
      await expect(slider).toHaveAttribute('min', '-180');
      await expect(slider).toHaveAttribute('max', '180');
    }
    await expect(page.getByTestId('fk-theta-1')).toBeVisible();
    await expect(page.getByTestId('fk-theta-2')).toBeVisible();
    await expect(page.getByTestId('fk-theta-3')).toBeVisible();
    await expect(page.getByTestId('fk-ee-x')).toBeVisible();
    await expect(page.getByTestId('fk-ee-y')).toBeVisible();
    await expect(page.getByRole('button', { name: /reset/i })).toBeVisible();
    // The arm itself renders as SVG links with the effector marker.
    await expect(page.getByTestId('fk-link-1')).toBeVisible();
    await expect(page.getByTestId('fk-link-3')).toBeVisible();
    await expect(page.getByTestId('fk-effector-marker')).toBeVisible();
  });

  test('joint sliders drive the arm and readout live (VAL-CLASS-006)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const base = page.getByRole('slider', BASE);
    const elbow = page.getByRole('slider', ELBOW);
    const theta1 = page.getByTestId('fk-theta-1');

    // Default pose: theta1 = 110 degrees.
    await expect(theta1).toHaveText('110°');
    const initialX = await eeValue(page, 'x');
    const initialY = await eeValue(page, 'y');

    // One slider change re-poses the arm and updates both readouts.
    await setSlider(base, 160);
    await expect(theta1).toHaveText('160°');
    expect(await eeValue(page, 'x')).not.toBeCloseTo(initialX, 1);
    expect(await eeValue(page, 'y')).not.toBeCloseTo(initialY, 1);

    // Base-joint sweep with the other joints fixed: the arm rotates rigidly
    // about the base, so x moves monotonically across this range.
    const xs: number[] = [];
    for (const angle of [60, 75, 90, 105, 120]) {
      await setSlider(base, angle);
      xs.push(await eeValue(page, 'x'));
    }
    for (let i = 1; i < xs.length; i += 1) {
      expect(xs[i]).toBeLessThan(xs[i - 1]);
    }

    // A middle joint moves the downstream links and the effector.
    const yBefore = await eeValue(page, 'y');
    await setSlider(elbow, 40);
    expect(await eeValue(page, 'y')).not.toBeCloseTo(yBefore, 1);

    // Keyboard operation: arrow keys on a focused slider move the readout.
    await setSlider(base, 100);
    await expect(theta1).toHaveText('100°');
    await base.focus();
    await page.keyboard.press('ArrowDown');
    await expect(theta1).toHaveText('99°');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(theta1).toHaveText('101°');

    // Reset restores the initial pose and readout values.
    await page.getByRole('button', { name: /reset/i }).click();
    await expect(theta1).toHaveText('110°');
    expect(await eeValue(page, 'x')).toBeCloseTo(initialX, 2);
    expect(await eeValue(page, 'y')).toBeCloseTo(initialY, 2);
  });

  test('playground link works and the arm loads (VAL-CLASS-007, VAL-PLAY-036, VAL-CROSS-005)', async ({
    page,
  }) => {
    // The playground's first frame can take >10s under SwiftShader.
    test.setTimeout(60_000);
    const errors = collectPageErrors(page);
    await page.goto(ROUTE);

    const link = page
      .locator('#main-content')
      .getByRole('link', { name: /3D kinematics playground/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /\/playground\/?$/);

    await link.click();
    await page.waitForURL(/\/playground\/$/);

    // The playground renders its canvas and the SO-101 arm with joint controls.
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    const status = page.getByTestId('robot-status');
    await expect(status).not.toHaveText(/loading/i, { timeout: 20_000 });
    await expect(status).toContainText(/so-101/i);
    const sliders = page.getByRole('slider', { name: /joint angle, degrees/ });
    expect(await sliders.count()).toBeGreaterThanOrEqual(6);
    expect(errors).toEqual([]);
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
