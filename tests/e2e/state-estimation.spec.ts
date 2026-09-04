import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { extractXAxis } from './helpers/table-agreement';

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

async function readout(page: Page, id: string): Promise<string> {
  return (await page.getByTestId(id).textContent()) ?? '';
}

/**
 * Advance the tracker deterministically through the Step control.
 *
 * The previous shape here was run, waitForTimeout, pause: it slept on the
 * wall clock and then assumed the tracker was still running so that a
 * pause control existed. Under full-suite load that assumption breaks at
 * both ends (the run can complete and revert the control to Run, or the
 * label swap can lag behind the click), and the pause locator never
 * resolves. The Step control advances the same pure filter one step per
 * click with no timers involved, so the helper is state-driven end to
 * end. The first advance is pinned on the step readout to prove the
 * control is live before the remaining clicks.
 */
async function advanceSteps(page: Page, count: number) {
  const stepButton = page.getByRole('button', {
    name: /step the tracker/i,
  });
  await stepButton.click();
  await expect(page.getByTestId('kalman-step-readout')).toHaveText(
    '61 / 600',
  );
  for (let i = 1; i < count; i++) await stepButton.click();
}

async function captureRun(page: Page) {
  return [
    await readout(page, 'kalman-step-readout'),
    await readout(page, 'kalman-sigma-readout'),
    await readout(page, 'kalman-gain-readout'),
    await readout(page, 'kalman-rms-readout'),
    await page.getByTestId('kalman-truth-line').getAttribute('points'),
  ];
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

    // Sidebar shows the module active under the classical domain.
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'State Estimation', exact: true }),
    ).toHaveAttribute('aria-current', 'page');

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
    expect(visibleText).not.toContain('<KalmanTracker');
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
      main.getByRole('link', { name: 'McGee 1985' }).first(),
    ).toHaveAttribute(
      'href',
      'https://ntrs.nasa.gov/citations/19860003843',
    );
    await expect(
      main.getByRole('link', { name: 'Thrun 2005' }).first(),
    ).toHaveAttribute(
      'href',
      'https://mitpress.mit.edu/9780262201629/probabilistic-robotics/',
    );
    await expect(
      main.getByRole('link', { name: 'Kschischang 2001' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1109/18.910572');
    await expect(
      main.getByRole('link', { name: 'Dellaert 2006' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1177/0278364906072768');
    await expect(
      main.getByRole('link', { name: 'Kaess 2012' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1177/0278364911430419');
    await expect(
      main.getByRole('link', { name: 'Cadena 2016' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/1606.05830');
    await expect(
      main.getByRole('link', { name: 'Forster 2017' }).first(),
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

  test('Kalman tracker renders series, band, sliders, and readouts (VAL-CLASS-024)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const scene = page.getByTestId('kalman-scene');
    await expect(scene).toBeVisible();
    await expect(page.getByTestId('kalman-band')).toBeVisible();
    await expect(page.getByTestId('kalman-truth-line')).toBeVisible();
    await expect(page.getByTestId('kalman-estimate-line')).toBeVisible();
    await expect(
      page.getByRole('slider', { name: /process noise/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('slider', { name: /measurement noise/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /run the tracker/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /reseed/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /reset/i })).toBeVisible();
    // Initial readouts: the tracker opens paused mid-run at the known
    // opening step of the default seeded world, so all three series and the
    // band are visible before any interaction.
    await expect(page.getByTestId('kalman-step-readout')).toHaveText(
      '60 / 600',
    );
    await expect(page.getByTestId('kalman-seed-readout')).toHaveText('1');
    await expect(page.getByTestId('kalman-sigma-readout')).toHaveText(/\d/);

    // No layout shift: the scene box is stable before and after interaction.
    const before = await scene.boundingBox();
    await page.getByRole('button', { name: /run the tracker/i }).click();
    const after = await scene.boundingBox();
    expect(after?.width).toBe(before?.width);
    expect(after?.height).toBe(before?.height);
    await page.getByRole('button', { name: /pause the tracker/i }).click();
  });

  test('noise sliders drive the band and gain live; reset restores (VAL-CLASS-025)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    // Advance deterministically past the filter's initialization
    // transient: 60 Step-control clicks from the opening step, no timers.
    await advanceSteps(page, 60);
    await expect(page.getByTestId('kalman-step-readout')).toHaveText(
      '120 / 600',
    );

    const bandPoints = () =>
      page.getByTestId('kalman-band').getAttribute('points');
    const sigma = async () =>
      Number.parseFloat(await readout(page, 'kalman-sigma-readout'));
    const gain = async () =>
      Number.parseFloat(await readout(page, 'kalman-gain-readout'));

    const baseBand = await bandPoints();
    const baseSigma = await sigma();
    const baseGain = await gain();

    // Raise the assumed measurement noise: the band widens and the gain
    // falls (the estimate trusts the sensor less).
    const rSlider = page.getByRole('slider', { name: /measurement noise/i });
    await rSlider.focus();
    await rSlider.press('End');
    await expect(page.getByTestId('kalman-sigmar-value')).toHaveText('3.00');
    expect(await sigma()).toBeGreaterThan(baseSigma);
    expect(await gain()).toBeLessThan(baseGain);
    expect(await bandPoints()).not.toBe(baseBand);

    // Lower the assumed measurement noise below default: band narrows.
    await rSlider.press('Home');
    await expect(page.getByTestId('kalman-sigmar-value')).toHaveText('0.20');
    expect(await sigma()).toBeLessThan(baseSigma);

    // Raise the assumed process noise: the gain climbs (the estimate hugs
    // each reading).
    const qSlider = page.getByRole('slider', { name: /process noise/i });
    await qSlider.focus();
    await qSlider.press('End');
    await expect(page.getByTestId('kalman-sigmaq-value')).toHaveText('1.00');
    expect(await gain()).toBeGreaterThan(baseGain);

    // Reset restores the default world, settings, and the opening step.
    await page.getByRole('button', { name: /reset/i }).click();
    await expect(page.getByTestId('kalman-step-readout')).toHaveText(
      '60 / 600',
    );
    await expect(page.getByTestId('kalman-sigmar-value')).toHaveText('1.00');
    await expect(page.getByTestId('kalman-sigmaq-value')).toHaveText('0.20');
    await expect(
      page.getByRole('button', { name: /run the tracker/i }),
    ).toBeVisible();
  });

  test('runs are reproducible: reset replays the identical run (VAL-CLASS-032)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const initial = await captureRun(page);

    // Deterministic replay: the Step button advances the tracker without
    // wall-clock timers, so the same number of steps from the same seed
    // must reproduce every readout and the trajectory exactly.
    const stepTen = async () => {
      const stepButton = page.getByRole('button', {
        name: /step the tracker/i,
      });
      for (let i = 0; i < 10; i++) await stepButton.click();
    };
    await stepTen();
    const first = await captureRun(page);
    await expect(page.getByTestId('kalman-step-readout')).toHaveText(
      '70 / 600',
    );

    // Reseed changes the world and restarts at the known opening step.
    await page.getByRole('button', { name: /reseed/i }).click();
    await expect(page.getByTestId('kalman-seed-readout')).toHaveText('2');
    await expect(page.getByTestId('kalman-step-readout')).toHaveText(
      '60 / 600',
    );
    expect(
      await page.getByTestId('kalman-truth-line').getAttribute('points'),
    ).not.toBe(first[4]);

    // Reset returns to the default seed; replaying the same ten steps
    // reproduces the identical readouts and the identical trajectory.
    await page.getByRole('button', { name: /reset/i }).click();
    await expect(page.getByTestId('kalman-seed-readout')).toHaveText('1');
    await stepTen();
    const second = await captureRun(page);
    expect(second).toEqual(first);

    // A fresh page load lands on the identical initial state.
    await page.reload();
    expect(await captureRun(page)).toEqual(initial);
  });

  test('the interactive is keyboard-operable', async ({ page }) => {
    await page.goto(ROUTE);
    const qSlider = page.getByRole('slider', { name: /process noise/i });
    await qSlider.focus();
    await expect(qSlider).toBeFocused();
    await qSlider.press('ArrowRight');
    await expect(page.getByTestId('kalman-sigmaq-value')).toHaveText('0.25');
    // The step control advances exactly one step from the keyboard.
    const step = page.getByRole('button', { name: /step the tracker/i });
    await step.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('kalman-step-readout')).toHaveText(
      '61 / 600',
    );
  });

  test('reduced motion: no advance before the first coarse tick, then 4-step jumps', async ({
    browser,
  }) => {
    // The previous shape polled the step readout for greaterThan(10), but
    // the tracker OPENS paused at step 60, so the poll passed instantly
    // and proved nothing about reduced-motion gating. This rewrite pins
    // the gate itself, in two halves:
    //   1. Absence of smooth advance: after Run, inside a window that
    //      comfortably spans a smooth-cadence tick (80 ms) but stays well
    //      inside the coarse first tick (320 ms), the readout must still
    //      read exactly 60. Timers never fire early, so load can only
    //      push the coarse tick later, never flake this half red.
    //   2. Coarse advancement: the readout then leaves 60 in multiples of
    //      the 4-step coarse jump, proving the gate selects the coarse
    //      cadence rather than disabling playback.
    // Mutation-checked: forcing playbackCadence onto the smooth cadence
    // (gate disabled) makes half 1 fail immediately (step 61 at 80 ms).
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(ROUTE);
    const stepReadout = page.getByTestId('kalman-step-readout');
    await expect(stepReadout).toHaveText('60 / 600');
    await page.getByRole('button', { name: /run the tracker/i }).click();
    // One immediate read, deliberately NOT an auto-retrying assertion:
    // absence-of-advance must be measured once, inside the window.
    await page.waitForTimeout(150);
    expect(await stepReadout.textContent()).toBe('60 / 600');
    await expect
      .poll(async () => (await stepReadout.textContent()) ?? '', {
        timeout: 5_000,
      })
      .not.toBe('60 / 600');
    const advanced = Number.parseInt(
      (await stepReadout.textContent()) ?? '60',
      10,
    );
    expect(advanced - 60).toBeGreaterThanOrEqual(4);
    expect((advanced - 60) % 4).toBe(0);
    await context.close();
  });

  test('x-axis tick labels span the plotted window and agree with the sampled table (VAL-EDU-023 clause (a))', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const scene = page.getByTestId('kalman-scene');
    // Tick row via the shared table-agreement extractor (which handles
    // this chart's gridline-less case), not a hand-rolled y>340 geometry
    // filter: the standing convention is that module specs import the
    // helper for tick-row assertions so a fix to the extractor reaches
    // every spec, not only the corpus gate. Collection mirrors
    // chart-table-agreement.spec.ts; the pure helper runs in Node.
    const ticks = async () => {
      const captured = await scene.evaluate((svg: SVGElement) => ({
        texts: Array.from(svg.querySelectorAll('text')).map((t) => ({
          content: (t.textContent ?? '').trim(),
          x: parseFloat(t.getAttribute('x') ?? '0'),
          y: parseFloat(t.getAttribute('y') ?? '0'),
        })),
        vLineXs: Array.from(svg.querySelectorAll('line'))
          .filter((l) => l.getAttribute('x1') === l.getAttribute('x2'))
          .map((l) => parseFloat(l.getAttribute('x1') ?? '0')),
      }));
      return extractXAxis(captured.texts, captured.vLineXs).ticks;
    };
    // First and last th of the KALMAN chart's sampled table, reached
    // through the scene's own aria-describedby chain instead of a
    // document-wide details[data-chart-form="table"] query: the document-
    // wide form was correct only while this route carried a single
    // table-form disclosure, and a second one would silently cross-pair
    // tables.
    const tableEndLabels = () =>
      scene.evaluate((svg: SVGElement) => {
        const descId = svg.getAttribute('aria-describedby');
        const desc = descId ? document.getElementById(descId) : null;
        const rows = (desc?.parentElement ?? document).querySelectorAll(
          'details[data-chart-data][data-chart-form="table"] tbody tr',
        );
        return [
          rows[0]?.querySelector('th')?.textContent?.trim() ?? '',
          rows[rows.length - 1]?.querySelector('th')?.textContent?.trim() ?? '',
        ];
      });

    // Opening state: the plotted range is steps 0 through 60 and the
    // table samples exactly that range, so endpoint ticks and endpoint
    // rows agree.
    await expect(page.getByTestId('kalman-step-readout')).toHaveText(
      '60 / 600',
    );
    expect(await ticks()).toEqual(['0', '30', '60']);
    expect(await tableEndLabels()).toEqual(['0', '60']);
    // The axis carries a unit note naming the row-axis quantity.
    await expect(scene.getByText('steps')).toBeVisible();

    // Past the 120-step window the frame slides: the endpoint ticks
    // still carry the plotted range the table samples.
    await advanceSteps(page, 60);
    await expect(page.getByTestId('kalman-step-readout')).toHaveText(
      '120 / 600',
    );
    expect(await ticks()).toEqual(['1', '61', '120']);
    expect(await tableEndLabels()).toEqual(['1', '120']);
  });

  test('the noise labels render sigma glyphs, not uppercased lookalikes', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    // The slider labels keep the uppercase convention for their Latin text
    // while the σq/σr symbols are exempted inside a normal-case span.
    // innerText reflects the RENDERED text (text-transform applied), which
    // textContent-based assertions cannot see: pre-fix these read "ΣQ ..."
    // and "ΣR ..." even though the DOM always held σq/σr.
    for (const [forId, glyph, lookalike, words] of [
      ['kalman-sigmaQ', 'σq', 'ΣQ', 'PROCESS NOISE'],
      ['kalman-sigmaR', 'σr', 'ΣR', 'MEASUREMENT NOISE'],
    ] as const) {
      const label = page.locator(`label[for="${forId}"]`);
      await expect(label).toHaveCSS('text-transform', 'uppercase');
      const rendered = await label.evaluate(
        (el) => (el as HTMLElement).innerText,
      );
      expect(rendered).toContain(glyph);
      expect(rendered).not.toContain(lookalike);
      expect(rendered).toContain(words);
    }
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
