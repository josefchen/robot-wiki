import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/classical/control/';

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

async function angleDeg(page: Page): Promise<number> {
  const text =
    (await page.getByTestId('pendulum-angle-readout').textContent()) ?? '';
  const value = Number.parseFloat(text.replace('°', ''));
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

test.describe('classical control module', () => {
  test('renders full prose on PID, LQR, MPC, and whole-body QP (VAL-CLASS-014)', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    const response = await page.goto(ROUTE);
    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Control' }),
    ).toBeVisible();

    // Sidebar shows the module active under the classical domain.
    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Control', exact: true }),
    ).toHaveAttribute('aria-current', 'page');

    const main = page.locator('#main-content');
    // The required strands are all present as rendered prose. The glossary
    // <Term> markup duplicates its text into a hidden tooltip, so match the
    // VISIBLE copy, not the first DOM hit.
    await expect(
      main.getByText(/PID/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main
        .getByText(/linear quadratic regulator/i)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expect(
      main
        .getByText(/model-predictive control/i)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expect(
      main
        .getByText(/whole-body/i)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expect(
      main
        .getByText(/Riccati/i)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();

    // Substantive long-form body: several hundred words at minimum.
    const visibleText = await visibleArticleText(page);
    expect(visibleText.split(/\s+/).filter(Boolean).length).toBeGreaterThan(
      800,
    );

    // No raw MDX or component source leaks into the rendered page.
    expect(visibleText).not.toContain('import {');
    expect(visibleText).not.toContain('<Cite');
    expect(visibleText).not.toContain('<PendulumController');
    expect(errors).toEqual([]);
  });

  test('citation chips resolve and link externally (VAL-CLASS-015, VAL-CLASS-016)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');

    // Primary sources for the main strands, each with its exact href.
    await expect(
      main.getByRole('link', { name: 'Åström 2008' }).first(),
    ).toHaveAttribute('href', 'https://fbsbook.org/');
    await expect(
      main.getByRole('link', { name: 'Kalman 1960' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1109/9780470544334.ch8');
    await expect(
      main.getByRole('link', { name: 'Mayne 2000' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1016/S0005-1098(99)00214-9');
    await expect(
      main.getByRole('link', { name: 'Di Carlo 2018' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1109/IROS.2018.8594448');
    await expect(
      main.getByRole('link', { name: 'Zhang 2026' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2503.04613');

    // Every chip is a real external link; no unresolved ids render.
    const chips = main.locator('a[target="_blank"][href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(12);
    expect(await main.getByText('missing citation:').count()).toBe(0);

    // A chip is keyboard-focusable and reveals its metadata on focus. The
    // source is cited several times on the page, so scope the tooltip to
    // the focused chip's own group (the tooltip is its following sibling).
    const pidChip = main.getByRole('link', { name: 'Åström 2008' }).first();
    await pidChip.focus();
    const tooltip = pidChip.locator(
      'xpath=../following-sibling::span[@role="tooltip"]',
    );
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Feedback Systems');
  });

  test('KaTeX renders with no raw math delimiters (VAL-CLASS-017)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    // PID law, pendulum dynamics, LQR cost and Riccati equation, the MPC
    // program, the operational-space equation, and the whole-body QP all
    // ship as rendered KaTeX, display and inline.
    expect(await page.locator('.katex').count()).toBeGreaterThan(10);
    expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(
      6,
    );

    const visibleText = await visibleArticleText(page);
    expect(visibleText).not.toContain('$$');
    expect(visibleText).not.toContain('\\ddot');
    expect(visibleText).not.toContain('\\top');
    expect(visibleText).not.toContain('\\Lambda');
  });

  test('pendulum controller renders scene, sliders, and readouts (VAL-CLASS-018)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const scene = page.getByTestId('pendulum-scene');
    await expect(scene).toBeVisible();
    await expect(page.getByTestId('pendulum-rod')).toBeVisible();
    await expect(page.getByTestId('pendulum-mass')).toBeVisible();
    await expect(page.getByTestId('pendulum-payload')).toBeVisible();
    await expect(
      page.getByRole('slider', { name: /proportional gain kp/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('slider', { name: /integral gain ki/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('slider', { name: /derivative gain kd/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /run the simulation/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /push the pole/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /reset/i })).toBeVisible();
    // Initial readouts: the 12-degree release, not yet running.
    await expect(page.getByTestId('pendulum-angle-readout')).toHaveText(
      '+12.0°',
    );
    await expect(page.getByTestId('pendulum-status-readout')).toHaveText(
      /holding at release/i,
    );

    // No layout shift: the scene box is stable before and after interaction.
    const before = await scene.boundingBox();
    await page.getByRole('button', { name: /run the simulation/i }).click();
    const after = await scene.boundingBox();
    expect(after?.width).toBe(before?.width);
    expect(after?.height).toBe(before?.height);
    await page.getByRole('button', { name: /pause the simulation/i }).click();
  });

  test('gain changes visibly alter stability live; reset restores (VAL-CLASS-019)', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto(ROUTE);

    // Default gains: the loop settles into its small steady lean.
    await page.getByRole('button', { name: /run the simulation/i }).click();
    await expect(page.getByTestId('pendulum-status-readout')).toHaveText(
      'settled',
      { timeout: 20_000 },
    );
    const settledAngle = await angleDeg(page);
    expect(Math.abs(settledAngle)).toBeGreaterThan(1);
    expect(Math.abs(settledAngle)).toBeLessThan(6);

    // Weaken the proportional gain to zero while running: the pole falls.
    const kp = page.getByRole('slider', { name: /proportional gain kp/i });
    await kp.focus();
    await kp.press('Home');
    await expect(page.getByTestId('pendulum-gain-kp-value')).toHaveText('0.0');
    await expect(page.getByTestId('pendulum-status-readout')).toHaveText(
      'fallen',
      { timeout: 15_000 },
    );
    expect(Math.abs(await angleDeg(page))).toBeGreaterThan(60);

    // Reset restores the release state and the default gains.
    await page.getByRole('button', { name: /reset/i }).click();
    await expect(page.getByTestId('pendulum-angle-readout')).toHaveText(
      '+12.0°',
    );
    await expect(page.getByTestId('pendulum-status-readout')).toHaveText(
      /holding at release/i,
    );
    await expect(page.getByTestId('pendulum-gain-kp-value')).toHaveText('25.0');
    await expect(
      page.getByRole('button', { name: /run the simulation/i }),
    ).toBeVisible();
  });

  test('push disturbs the balanced pole and the loop recovers', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(ROUTE);
    await page.getByRole('button', { name: /run the simulation/i }).click();
    await expect(page.getByTestId('pendulum-status-readout')).toHaveText(
      'settled',
      { timeout: 20_000 },
    );
    const before = await angleDeg(page);

    await page.getByRole('button', { name: /push the pole/i }).click();
    // The 2 rad/s kick is immediately visible in the angle readout.
    await expect
      .poll(async () => Math.abs(await angleDeg(page)), { timeout: 5_000 })
      .toBeGreaterThan(Math.abs(before) + 5);
    // And the tuned loop pulls it back.
    await expect(page.getByTestId('pendulum-status-readout')).toHaveText(
      'settled',
      { timeout: 20_000 },
    );
  });

  test('the interactive is keyboard-operable', async ({ page }) => {
    await page.goto(ROUTE);
    const kd = page.getByRole('slider', { name: /derivative gain kd/i });
    await kd.focus();
    await expect(kd).toBeFocused();
    await kd.press('ArrowRight');
    await expect(page.getByTestId('pendulum-gain-kd-value')).toHaveText('3.1');
    // The run control takes focus and toggles with the keyboard.
    const run = page.getByRole('button', { name: /run the simulation/i });
    await run.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('button', { name: /pause the simulation/i }),
    ).toBeVisible();
    // Stop it again so the spec leaves no timer running.
    await page.keyboard.press('Enter');
  });

  test('reduced motion still advances the sim in coarse jumps', async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(ROUTE);
    await page.getByRole('button', { name: /run the simulation/i }).click();
    // Coarse ticks at 320 ms: within 4 s the pole has visibly moved in from
    // the 12-degree release.
    await expect
      .poll(async () => Math.abs(await angleDeg(page)), { timeout: 8_000 })
      .toBeLessThan(10);
    await context.close();
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
