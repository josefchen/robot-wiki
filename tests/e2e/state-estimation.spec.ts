import { expect, test, type Page } from './helpers/state-smoothing-fixture';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/classical/state-estimation/';

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

test.describe('classical state-estimation module', () => {
  test('renders full prose on the Kalman filter, EKF, and factor graphs (VAL-CLASS-020)', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    const response = await page.goto(ROUTE);
    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole('heading', { level: 1, name: 'State Estimation' }),
    ).toBeVisible();

    // Compact navigation is intentionally hidden until its real drawer opens.
    const compact = page.viewportSize()!.width < 1024;
    if (compact) await page.getByRole('button', { name: 'Open navigation menu' }).click();
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'State Estimation', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    if (compact) {
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeFocused();
    }

    const main = page.locator('#main-content');
    // The required strands are all present as rendered prose. The glossary
    // <Term> markup duplicates its text into a hidden tooltip, so match the
    // VISIBLE copy, not the first DOM hit.
    await expect(
      main.getByText(/Kalman filter/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/extended Kalman filter/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/factor graph/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/Bayes filter/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/Riccati|sum-product/i).filter({ visible: true }).first(),
    ).toBeVisible();

    // Substantive long-form body: several hundred words at minimum.
    const visibleText = await visibleArticleText(page);
    expect(visibleText.split(/\s+/).filter(Boolean).length).toBeGreaterThan(
      800,
    );

    // No raw MDX or component source leaks into the rendered page.
    expect(visibleText).not.toContain('import {');
    expect(visibleText).not.toContain('<Cite');
    expect(visibleText).not.toContain('<KalmanPredictUpdate');
    expect(errors).toEqual([]);
  });

  test('citation chips resolve and link externally (VAL-CLASS-021, VAL-CLASS-022)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');

    // Primary sources for the main strands, each with its exact href.
    await expect(
      main.getByRole('link', { name: 'Kalman 1960' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1115/1.3662552');
    await expect(
      main.getByRole('link', { name: 'McGee et al. 1985' }).first(),
    ).toHaveAttribute(
      'href',
      'https://ntrs.nasa.gov/citations/19860003843',
    );
    await expect(
      main.getByRole('link', { name: 'Thrun et al. 2005' }).first(),
    ).toHaveAttribute(
      'href',
      'https://mitpress.mit.edu/9780262201629/probabilistic-robotics/',
    );
    await expect(
      main.getByRole('link', { name: 'Kschischang et al. 2001' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1109/18.910572');
    await expect(
      main.getByRole('link', { name: 'Dellaert et al. 2006' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1177/0278364906072768');
    await expect(
      main.getByRole('link', { name: 'Kaess et al. 2012' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1177/0278364911430419');
    await expect(
      main.getByRole('link', { name: 'Cadena et al. 2016' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/1606.05830');
    await expect(
      main.getByRole('link', { name: 'Forster et al. 2017' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/1512.02363');

    // Every chip is a real external link; no unresolved ids render.
    // Scoped to the authored prose: the generated References bibliography
    // also renders target=_blank external links inside main, and with every inline chip deleted its 12 registry anchors alone still passed this floor.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[target="_blank"][href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(12);
    expect(await main.getByText('missing citation:').count()).toBe(0);

    // A chip is keyboard-focusable and reveals its metadata on focus. The
    // source is cited several times on the page, so scope the tooltip to
    // the focused chip's own group (the tooltip is its following sibling).
    const kfChip = main.getByRole('link', { name: 'Kalman 1960' }).first();
    await kfChip.focus();
    const tooltip = kfChip.locator(
      'xpath=../following-sibling::span[@role="tooltip"]',
    );
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Linear Filtering');
  });

  test('KaTeX renders with no raw math delimiters (VAL-CLASS-023)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    // Bayes filter predict/update, the linear-Gaussian model, the Kalman
    // predict and update blocks, the EKF linearization, and the two
    // factor-graph equations all ship as rendered KaTeX.
    expect(await page.locator('.katex').count()).toBeGreaterThan(10);
    expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(
      7,
    );

    const visibleText = await visibleArticleText(page);
    expect(visibleText).not.toContain('$$');
    expect(visibleText).not.toContain('\\bar');
    expect(visibleText).not.toContain('\\overline');
    expect(visibleText).not.toContain('\\propto');
  });

  test('motion scene poster renders and never autoplays (VAL-CLASS-024)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const scene = page.locator('[data-motion-scene="kalman-predict-update"]');
    await expect(scene).toBeVisible();
    // The poster is the prerendered final beat inside the instrument
    // chrome, wrapped in the click that plays. No live controls.
    const poster = scene.getByTestId('motion-poster');
    await expect(poster).toBeVisible();
    await expect(poster).toHaveAccessibleName(
      /play the motion scene: kalman filter/i,
    );
    await expect(scene.getByTestId('motion-scrubber')).toHaveCount(0);
    await expect(scene.locator('[data-motion-stage] svg').first()).toBeVisible();
    // The poster caption is the recap beat's caption.
    await expect(scene.getByTestId('motion-caption')).toHaveText(/written out/i);
  });

  test('activation steps the five predict-update beats with honest numbers (VAL-CLASS-025)', async ({
    page,
  }) => {
    await page.goto(ROUTE, { waitUntil: 'networkidle' });
    const scene = page.locator('[data-motion-scene="kalman-predict-update"]');
    const poster = scene.getByTestId('motion-poster');

    // The stage keeps its exact box across activation; the frame grows
    // only below it, where the live scrubber appears. Pin the frame to
    // the viewport top first, so the activation click itself cannot
    // scroll the page; a click that races hydration is retried once.
    await scene.evaluate((node) => node.scrollIntoView({ block: 'start' }));
    const stageBox = () =>
      scene.locator('[data-motion-stage] svg').first().boundingBox();
    const before = await stageBox();
    await poster.click();
    let mounted = false;
    for (let attempt = 0; attempt < 2 && !mounted; attempt += 1) {
      try {
        await expect(scene.getByTestId('motion-scrubber')).toBeVisible({
          timeout: attempt === 0 ? 4_000 : 10_000,
        });
        mounted = true;
      } catch {
        await poster.click();
      }
    }
    expect(mounted).toBe(true);
    const after = await stageBox();
    expect(after?.width).toBe(before?.width);
    expect(after?.x).toBe(before?.x);
    expect(after?.y).toBe(before?.y);
    const caption = scene.getByTestId('motion-caption');

    // Pause the activation autoplay, then walk every beat by keyboard
    // from the top; the caption names each beat the reader arrives at.
    await page.keyboard.press('k');
    await page.keyboard.press('Home');
    await expect(caption).toHaveText(/prior belief/i);
    await expect(scene.getByTestId('motion-beat-count')).toHaveText(
      'beat 1 / 5',
    );
    for (const [step, pattern] of [
      [1, /prior belief/i],
      [2, /predict/i],
      [3, /measurement arrives/i],
      [4, /update/i],
      [5, /written out/i],
    ] as const) {
      await page.keyboard.press('ArrowRight');
      await expect(caption).toHaveText(pattern);
      await expect(scene.getByTestId('motion-beat-count')).toHaveText(
        `beat ${step} / 5`,
      );
    }

    // The readout carries the filter's own numbers for the demonstrated
    // step: the gain and the reading, and the sigma walk.
    await expect(scene.getByTestId('kalman-gain-value')).toHaveText('0.62');
    const readout = await scene.getByTestId('motion-readout').textContent();
    expect(readout).toContain('0.94');
    expect(readout).toContain('1.27');
    expect(readout).toContain('0.79');

    // The scrubber is a labelled slider whose valuetext is the caption.
    const scrubber = scene.getByTestId('motion-scrubber');
    await expect(scrubber).toHaveAttribute('aria-label', 'Scene timeline');
    await expect(scrubber).toHaveAttribute(
      'aria-valuetext',
      (await caption.textContent()) ?? '',
    );

    // Reset returns to the poster still.
    await scene
      .getByRole('button', { name: /reset the scene to its poster still/i })
      .click();
    await expect(caption).toHaveText(/written out/i);
  });

  test('runs are reproducible: reload lands on the identical poster still (VAL-CLASS-032)', async ({
    page,
  }) => {
    await page.goto(ROUTE, { waitUntil: 'networkidle' });
    const scene = page.locator('[data-motion-scene="kalman-predict-update"]');
    const posterSvg = () =>
      scene.locator('[data-motion-stage] svg').first().innerHTML();
    const initial = await posterSvg();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(scene.getByTestId('motion-poster')).toBeVisible();
    expect(await posterSvg()).toBe(initial);
  });

  test('reduced motion: activation stays on the poster, stepping jumps end-states', async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(ROUTE, { waitUntil: 'networkidle' });
    const scene = page.locator('[data-motion-scene="kalman-predict-update"]');
    const poster = scene.getByTestId('motion-poster');
    await expect(poster).toBeVisible();
    await poster.click();
    try {
      await expect(scene.getByTestId('motion-scrubber')).toBeVisible({
        timeout: 4_000,
      });
    } catch {
      await poster.click();
      await expect(scene.getByTestId('motion-scrubber')).toBeVisible({
        timeout: 10_000,
      });
    }
    const caption = scene.getByTestId('motion-caption');
    // No autoplay under reduced motion: still the poster beat.
    await expect(
      scene.getByRole('button', { name: /play the scene/i }),
    ).toBeVisible();
    await expect(caption).toHaveText(/written out/i);
    // Stepping jumps between beat end-states with no tweening.
    await scene
      .getByRole('button', { name: /step back one beat/i })
      .click();
    await expect(caption).toHaveText(/update/i);
    // The scrubber still works.
    const scrubber = scene.getByTestId('motion-scrubber');
    await scrubber.focus();
    await scrubber.fill('1000');
    await expect(caption).toHaveText(/prior belief/i);
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
