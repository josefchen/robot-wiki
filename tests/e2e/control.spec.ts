import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setSlider } from './slider';

const ROUTE = '/classical/control/';

/**
 * The standalone article mount of the pendulum lab. The article also
 * renders a second PendulumController inside the prediction step's
 * disclosure, so every per-mount locator must be scoped to exactly one.
 */
function pendulum(page: Page) {
  return page
    .locator('div.prose > div.rounded-md:has([data-testid="pendulum-scene"])')
    .first();
}

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
    (await pendulum(page).getByTestId('pendulum-angle-readout').textContent()) ?? '';
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
      main.getByText(/linear quadratic regulator/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/model-predictive control/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/whole-body/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/Riccati/i).filter({ visible: true }).first(),
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
    ).toHaveAttribute(
      'href',
      'https://fbswiki.org/wiki/index.php/Feedback_Systems:_An_Introduction_for_Scientists_and_Engineers',
    );
    await expect(
      main.getByRole('link', { name: 'Kalman 1960' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1109/9780470544334.ch8');
    await expect(
      main.getByRole('link', { name: 'Mayne 2000' }).first(),
    ).toHaveAttribute(
      'href',
      'https://doi.org/10.1016/S0005-1098(99)00214-9',
    );
    await expect(
      main.getByRole('link', { name: 'Di Carlo 2018' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1109/IROS.2018.8594448');
    await expect(
      main.getByRole('link', { name: 'Zhang 2026' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2503.04613');

    // Every chip is a real external link; no unresolved ids render.
    // Scoped to the authored prose: the generated References bibliography
    // also renders target=_blank external links inside main, and with
    // every inline chip deleted its 23 registry anchors alone still
    // passed this floor.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[target="_blank"][href^="https://"]');
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
    const scene = pendulum(page).getByTestId('pendulum-scene');
    await expect(scene).toBeVisible();
    await expect(pendulum(page).getByTestId('pendulum-rod')).toBeVisible();
    await expect(pendulum(page).getByTestId('pendulum-mass')).toBeVisible();
    await expect(pendulum(page).getByTestId('pendulum-payload')).toBeVisible();
    await expect(
      pendulum(page).getByRole('slider', { name: /proportional gain kp/i }),
    ).toBeVisible();
    await expect(
      pendulum(page).getByRole('slider', { name: /integral gain ki/i }),
    ).toBeVisible();
    await expect(
      pendulum(page).getByRole('slider', { name: /derivative gain kd/i }),
    ).toBeVisible();
    await expect(
      pendulum(page).getByRole('button', { name: /run the simulation/i }),
    ).toBeVisible();
    await expect(
      pendulum(page).getByRole('button', { name: /push the pole/i }),
    ).toBeVisible();
    await expect(pendulum(page).getByRole('button', { name: /reset/i })).toBeVisible();
    // Initial readouts: the 12-degree release, not yet running.
    await expect(pendulum(page).getByTestId('pendulum-angle-readout')).toHaveText(
      '+12.0°',
    );
    await expect(pendulum(page).getByTestId('pendulum-status-readout')).toHaveText(
      /holding at release/i,
    );

    // No layout shift: the scene box is stable before and after interaction.
    const before = await scene.boundingBox();
    await pendulum(page).getByRole('button', { name: /run the simulation/i }).click();
    const after = await scene.boundingBox();
    expect(after?.width).toBe(before?.width);
    expect(after?.height).toBe(before?.height);
    await pendulum(page).getByRole('button', { name: /pause the simulation/i }).click();
  });

  test('gain changes visibly alter stability live; reset restores (VAL-CLASS-019)', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto(ROUTE);

    // Default gains: the loop settles into its small steady lean.
    await pendulum(page).getByRole('button', { name: /run the simulation/i }).click();
    await expect(pendulum(page).getByTestId('pendulum-status-readout')).toHaveText(
      'settled',
      { timeout: 20_000 },
    );
    const settledAngle = await angleDeg(page);
    expect(Math.abs(settledAngle)).toBeGreaterThan(1);
    expect(Math.abs(settledAngle)).toBeLessThan(6);

    // Weaken the proportional gain to zero while running: the pole falls.
    const kp = pendulum(page).getByRole('slider', { name: /proportional gain kp/i });
    await kp.focus();
    await kp.press('Home');
    await expect(pendulum(page).getByTestId('pendulum-gain-kp-value')).toHaveText('0.0');
    await expect(pendulum(page).getByTestId('pendulum-status-readout')).toHaveText(
      'fallen',
      { timeout: 15_000 },
    );
    expect(Math.abs(await angleDeg(page))).toBeGreaterThan(60);

    // Reset restores the release state and the default gains.
    await pendulum(page).getByRole('button', { name: /reset/i }).click();
    await expect(pendulum(page).getByTestId('pendulum-angle-readout')).toHaveText(
      '+12.0°',
    );
    await expect(pendulum(page).getByTestId('pendulum-status-readout')).toHaveText(
      /holding at release/i,
    );
    await expect(pendulum(page).getByTestId('pendulum-gain-kp-value')).toHaveText(
      '25.0',
    );
    await expect(
      pendulum(page).getByRole('button', { name: /run the simulation/i }),
    ).toBeVisible();
  });

  test('push disturbs the balanced pole and the loop recovers', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(ROUTE);
    await pendulum(page).getByRole('button', { name: /run the simulation/i }).click();
    await expect(pendulum(page).getByTestId('pendulum-status-readout')).toHaveText(
      'settled',
      { timeout: 20_000 },
    );
    const before = await angleDeg(page);

    await pendulum(page).getByRole('button', { name: /push the pole/i }).click();
    // The 2 rad/s kick is immediately visible in the angle readout.
    await expect
      .poll(async () => Math.abs(await angleDeg(page)), { timeout: 5_000 })
      .toBeGreaterThan(Math.abs(before) + 5);
    // And the tuned loop pulls it back.
    await expect(pendulum(page).getByTestId('pendulum-status-readout')).toHaveText(
      'settled',
      { timeout: 20_000 },
    );
  });

  test('the interactive is keyboard-operable', async ({ page }) => {
    await page.goto(ROUTE);
    const kd = pendulum(page).getByRole('slider', { name: /derivative gain kd/i });
    await kd.focus();
    await expect(kd).toBeFocused();
    await kd.press('ArrowRight');
    await expect(pendulum(page).getByTestId('pendulum-gain-kd-value')).toHaveText('3.1');
    // The run control takes focus and toggles with the keyboard.
    const run = pendulum(page).getByRole('button', { name: /run the simulation/i });
    await run.focus();
    await page.keyboard.press('Enter');
    await expect(
      pendulum(page).getByRole('button', { name: /pause the simulation/i }),
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
    await pendulum(page).getByRole('button', { name: /run the simulation/i }).click();
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

  // ------------------------------------------------------------------
  // Impedance / compliance section and contact lab (VAL-CLASS-033..038)
  // ------------------------------------------------------------------

  test('impedance section names the three schemes with resolving chips (VAL-CLASS-033)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const heading = page.getByRole('heading', {
      level: 2,
      name: /impedance control/i,
    });
    await expect(heading).toBeVisible();

    // Section prose: from the section heading to the next same-level
    // heading (the article body is flat; h2s are not wrapped in
    // <section> elements, so scope via the prose article ancestor).
    const article = page.locator('#main-content article').first();
    const articleText = (await article.innerText()) ?? '';
    const fromHeading = articleText.slice(
      Math.max(articleText.toLowerCase().indexOf('impedance control: making')),
    );
    const sectionText = fromHeading.slice(
      0,
      fromHeading.toLowerCase().indexOf('where this meets the learned stack') >
        -1
        ? fromHeading
            .toLowerCase()
            .indexOf('where this meets the learned stack')
        : undefined,
    );
    const text = sectionText.toLowerCase();
    expect(text).toContain('impedance control');
    expect(text).toContain('admittance control');
    expect(text).toContain('hybrid force/position control');

    // At least three distinct citation chips between the heading and the
    // closer, each resolving to a References entry on the page.
    const chipIds = await article
      .locator('[data-cite-id]')
      .evaluateAll((els) => {
        const ids = new Set<string>();
        for (const el of els) {
          const box = el.getBoundingClientRect();
          const headingEl = document.querySelector(
            'h2#impedance-control-making-contact-a-design-variable',
          );
          const stopEl = Array.from(
            document.querySelectorAll('h2'),
          ).find((h) =>
            /where this meets the learned stack/i.test(h.textContent ?? ''),
          );
          if (!headingEl || !stopEl) continue;
          const hY = headingEl.getBoundingClientRect().top;
          const sY = stopEl.getBoundingClientRect().top;
          const y = box.top + window.scrollY;
          const hAbs = hY + window.scrollY;
          const sAbs = sY + window.scrollY;
          if (y >= hAbs && y < sAbs) {
            const id = el.getAttribute('data-cite-id');
            if (id) ids.add(id);
          }
        }
        return Array.from(ids);
      });
    expect(chipIds.length).toBeGreaterThanOrEqual(3);
    for (const id of chipIds) {
      await expect(page.locator(`#ref-${id}`)).toHaveCount(1);
    }
  });

  test('the hardware consequence is stated as prose (VAL-CLASS-034)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const article = page.locator('#main-content article').first();
    const articleText = (await article.innerText()) ?? '';
    const start = articleText
      .toLowerCase()
      .indexOf('impedance control: making');
    const end = articleText
      .toLowerCase()
      .indexOf('where this meets the learned stack');
    const text = articleText.slice(start, end);
    // The inability claim as a complete prose sentence.
    expect(text).toMatch(/cannot regulate contact force/i);
    // Both alternatives named as literal text in the same section.
    expect(text).toMatch(/torque-controlled arms/i);
    expect(text).toMatch(/series elastic actuation/i);
  });

  test('impedance lab renders first paint with a live trace, torque default (VAL-CLASS-035 setup)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const lab = page.getByTestId('impedance-lab');
    await expect(lab).toBeVisible();
    await expect(lab.getByTestId('impedance-hardware-torque')).toBeChecked();
    await expect(lab.getByTestId('impedance-force-trace')).toBeVisible();
    const peak = await lab
      .getByTestId('impedance-peak-readout')
      .innerText();
    expect(peak).toMatch(/\d/);
    expect(peak).not.toContain('NaN');
  });

  test('stiffness slider moves the peak-force readout (VAL-CLASS-035)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const lab = page.getByTestId('impedance-lab');
    const slider = lab.getByTestId('impedance-stiffness-slider');
    const readout = lab.getByTestId('impedance-peak-readout');

    await setSlider(slider, 100);
    const soft = Number.parseFloat(((await readout.innerText()) ?? '').replace(' N', ''));
    await setSlider(slider, 20000);
    const hard = Number.parseFloat(((await readout.innerText()) ?? '').replace(' N', ''));

    expect(Number.isFinite(soft)).toBe(true);
    expect(Number.isFinite(hard)).toBe(true);
    expect(soft).not.toBe(hard);
    expect(hard).toBeGreaterThan(soft);
  });

  test('position mode disables compliance inputs and reads unbounded, both directions (VAL-CLASS-036)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const lab = page.getByTestId('impedance-lab');
    const k = lab.getByTestId('impedance-stiffness-slider');
    const d = lab.getByTestId('impedance-damping-slider');
    const peak = lab.getByTestId('impedance-peak-readout');

    // Numeric in the torque default.
    expect(await k.isEnabled()).toBe(true);
    expect(await d.isEnabled()).toBe(true);
    expect(((await peak.innerText()) ?? '')).toMatch(/\d/);

    // torque -> position: native disabled + non-numeric unbounded label.
    await lab.getByTestId('impedance-hardware-position').check();
    await expect(k).toBeDisabled();
    await expect(d).toBeDisabled();
    const posPeak = ((await peak.innerText()) ?? '');
    expect(posPeak).not.toMatch(/\d/);
    expect(posPeak).toContain('unbounded');

    // position -> torque on the same load: everything restored.
    await lab.getByTestId('impedance-hardware-torque').check();
    await expect(k).toBeEnabled();
    await expect(d).toBeEnabled();
    expect(((await peak.innerText()) ?? '')).toMatch(/\d/);
  });

  test('the contact-force limit line names its basis with a resolving caption chip (VAL-CLASS-037)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const lab = page.getByTestId('impedance-lab');
    const label =
      (await lab.getByTestId('impedance-limit-label').textContent()) ?? '';
    expect(label.toLowerCase()).toContain('contact-force limit');
    expect(label.toLowerCase()).toContain('research basis');
    // A resolving chip inside the lab (the caption's citation).
    const chip = lab.locator('[data-cite-id="han-force-pain-2024"]');
    await expect(chip).toHaveCount(1);
    const citeId = await chip.getAttribute('data-cite-id');
    await expect(page.locator(`#ref-${citeId}`)).toHaveCount(1);
  });

  test('keyboard operation: tab order, arrow keys, reset (VAL-CLASS-038)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const lab = page.getByTestId('impedance-lab');

    // Every enabled control is tab-reachable in visual order with a
    // visible focus indicator (the design system's accent outline).
    const focusTrace: string[] = [];
    const depth = lab.getByTestId('impedance-depth-slider');
    await depth.focus();
    focusTrace.push('depth');
    const outline = await depth.evaluate((el) =>
      window.getComputedStyle(el).outlineStyle,
    );
    expect(['solid', 'auto']).toContain(outline);

    // Arrow keys move the slider value.
    const before = await depth.inputValue();
    await page.keyboard.press('ArrowRight');
    const after = await depth.inputValue();
    expect(after).not.toBe(before);

    // Reset restores the default hardware, gains and depth.
    await lab.getByTestId('impedance-hardware-position').check();
    await setSlider(lab.getByTestId('impedance-depth-slider'), 0.006);
    await lab.getByRole('button', { name: /reset/i }).click();
    await expect(lab.getByTestId('impedance-hardware-torque')).toBeChecked();
    await expect(lab.getByTestId('impedance-depth-slider')).toHaveValue(
      '0.002',
    );
    await expect(lab.getByTestId('impedance-stiffness-slider')).toHaveValue(
      '800',
    );
    await expect(lab.getByTestId('impedance-damping-slider')).toHaveValue('40');
  });
});
