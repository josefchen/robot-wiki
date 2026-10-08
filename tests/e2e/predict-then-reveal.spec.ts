import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { figureFold, openAdjustMore } from './helpers/figure-fold';
import { forEachInOwnContext } from './helpers/per-route-context';
import { waitForHydration } from './interaction-ready';
import { settleTransitions } from './settle';

/**
 * Prediction-step contract (VAL-EDU-011..020) over the five placement
 * routes, plus the checked-in half of VAL-EDU-015: existing mounts of the
 * components that gained initial-state props keep their exact default
 * readouts and control values (the pre-change baseline was captured before
 * the props landed; pixel boxes are compared in the feature's evidence,
 * the deterministic text is pinned here).
 */

const CORPUS_SWEEP_TIMEOUT_MS = 180_000;

interface Placement {
  route: string;
  figure: string;
  /** Regex matching the primary control's accessible name. */
  primaryControl: RegExp;
  /** A readout string that proves the figure mounted at the hint's config. */
  mountedReadout: RegExp;
  /** The primary control sits in the figure's "Adjust more" fold, not the main view. */
  primaryControlInAdjust?: true;
}

const PLACEMENTS: Placement[] = [
  {
    route: '/data-hardware/evaluation-crisis/',
    figure: 'ReliabilityCompounding',
    // The per-step slider moved into "Adjust more"; the job-length slider
    // is the visible control the hint names.
    primaryControl: /episode length in steps/i,
    mountedReadout: /48\.8%/,
  },
  {
    route: '/classical/control/',
    figure: 'PendulumController',
    primaryControl: /proportional gain kp/i,
    mountedReadout: /9\.5/,
    // The main view offers the "How hard the motor pushes back" presets and a push;
    // the three gain sliders moved into "Adjust more".
    primaryControlInAdjust: true,
  },
  {
    route: '/frontier/generalization/',
    figure: 'EgoScaleScaling',
    primaryControl: /hours of video/i,
    mountedReadout: /250k h/,
    // The main view offers "How much video?" presets; the raw horizon
    // slider moved into "Adjust more".
    primaryControlInAdjust: true,
  },
  {
    route: '/data-hardware/data-bottleneck/',
    figure: 'DataScaleChart',
    primaryControl: /teleoperation rigs/i,
    mountedReadout: /143 years/,
  },
  {
    route: '/manipulation/bc-foundations/',
    figure: 'CompoundingError',
    // The horizon slider mounts at its max (240), so the error slider is
    // the control the keyboard probe drives. The main view offers the
    // task-length and how-it's-run presets; both sliders moved into
    // "Adjust more".
    primaryControl: /per-step error/i,
    mountedReadout: /1505/,
    primaryControlInAdjust: true,
  },
];

/** Whitespace/case normalisation, per the contract's definitions. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Digit-bearing tokens of a text, per the contract's definition. A token
 *  carries the VALUE the hint names, not the sentence punctuation that
 *  happens to follow it: "RTC 100%." must match a readout rendering
 *  "100%", so trailing [.,;:!?] is trimmed before containment. Percent
 *  signs and brackets are part of the value and stay. */
function digitTokens(text: string): string[] {
  return text
    .split(/\s+/)
    .filter((t) => /[0-9]/.test(t))
    .map((t) => t.replace(/[.,;:!?]+$/, ''));
}

async function region(page: Page) {
  return page.locator('[data-predict]');
}

test.describe('prediction step (PredictThenReveal)', () => {
  test('exactly the five placement routes render one prediction step each', async ({ page }) => {
    for (const { route } of PLACEMENTS) {
      await page.goto(route);
      await expect(page.locator('[data-predict]')).toHaveCount(1);
      // Not a self-check: the region hook is data-predict only.
      await expect(page.locator('[data-predict][data-self-check]')).toHaveCount(0);
      const inProse = await page
        .locator('div[data-pagefind-body] [data-predict]')
        .count();
      expect(inProse, `${route}: outside the prose region`).toBe(1);
      const order = await page.evaluate(() => {
        const predict = document.querySelector('[data-predict]');
        const article = predict?.closest('article');
        const hr = article?.querySelector('hr');
        if (!predict || !hr) return `missing:${!predict ? 'predict' : 'hr'}`;
        return predict.compareDocumentPosition(hr) & Node.DOCUMENT_POSITION_FOLLOWING
          ? 'before-hr'
          : 'after-hr';
      });
      expect(order, `${route}: must precede the hairline`).toBe('before-hr');
    }
  });

  for (const placement of PLACEMENTS) {
    test(`${placement.route}: hooks, native contract, mounted figure`, async ({ page }) => {
      await page.goto(placement.route);
      const root = await region(page);

      // Native grouped control: one fieldset, legend prompt, three
      // same-name radios, no hand-rolled radiogroup, no submit control.
      const fieldset = root.locator('fieldset');
      await expect(fieldset).toHaveCount(1);
      await expect(fieldset.locator('legend')).toBeVisible();
      const radios = fieldset.locator('input[type="radio"]');
      await expect(radios).toHaveCount(3);
      const names = await radios.evaluateAll((els) =>
        Array.from(new Set(els.map((e) => (e as HTMLInputElement).name))),
      );
      expect(names).toHaveLength(1);
      await expect(root.locator('[role="radiogroup"]')).toHaveCount(0);
      await expect(
        root.locator('button[type="submit"], input[type="submit"]'),
      ).toHaveCount(0);

      // Stable hooks: reveal, reveal hint, takeaway, three reasons keyed
      // by option value, one marked correct.
      const reveal = root.locator(':scope > details[data-reveal]');
      await expect(reveal).toHaveCount(1);
      await expect(root.locator('[data-reveal-hint]')).toHaveCount(1);
      await expect(root.locator('[data-takeaway]')).toHaveCount(1);
      const reasons = root.locator('[data-reason]');
      await expect(reasons).toHaveCount(3);
      await expect(root.locator('[data-reason][data-correct="true"]')).toHaveCount(1);
      const reasonKeys = await reasons.evaluateAll((els) =>
        els.map((e) => (e as HTMLElement).dataset.reason),
      );
      const optionValues = await radios.evaluateAll((els) =>
        els.map((e) => (e as HTMLInputElement).value),
      );
      expect([...reasonKeys].sort()).toEqual([...optionValues].sort());

      // "Guess first": the hint and the figure sit in one block between the
      // question and the reasoning, outside the disclosure, so the chart is
      // shown whether or not the reader answers.
      const predictFigure = root.locator(':scope > [data-predict-figure]');
      await expect(predictFigure).toHaveCount(1);
      await expect(predictFigure.locator(':scope > [data-reveal-hint]')).toHaveCount(1);
      await expect(reveal.locator('[data-reveal-hint]')).toHaveCount(0);
      await expect(reveal.locator('[data-figure-frame]')).toHaveCount(0);
      await expect(reveal.locator('svg')).toHaveCount(0);
      const order = await root.evaluate((el) => {
        const fieldsetEl = el.querySelector(':scope > fieldset');
        const figureEl = el.querySelector(':scope > [data-predict-figure]');
        const revealEl = el.querySelector(':scope > details[data-reveal]');
        if (!fieldsetEl || !figureEl || !revealEl) return 'missing';
        const follows = (a: Element, b: Element) =>
          Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
        return follows(fieldsetEl, figureEl) && follows(figureEl, revealEl)
          ? 'question-figure-reasoning'
          : 'out-of-order';
      });
      expect(order, `${placement.route}: question, then figure, then reasoning`).toBe(
        'question-figure-reasoning',
      );

      // VAL-EDU-011a: the reasoning is closed on load; no blur/visibility/
      // opacity gate on the reveal, the figure, or any ancestor up to body.
      await expect(reveal).not.toHaveAttribute('open');
      const gateStyles = await root.evaluate((el) => {
        const bad: string[] = [];
        const starts = [
          el.querySelector(':scope > details[data-reveal]'),
          el.querySelector(':scope > [data-predict-figure]'),
        ];
        for (const start of starts) {
          let node = start as HTMLElement | null;
          while (node && node !== document.body) {
            const cs = getComputedStyle(node);
            if (cs.filter.includes('blur(')) bad.push('blur');
            if (cs.visibility === 'hidden') bad.push('visibility');
            if (cs.opacity === '0') bad.push('opacity');
            node = node.parentElement;
          }
        }
        return bad;
      });
      expect(gateStyles).toEqual([]);

      // VAL-EDU-011b: the served HTML ships the figure's svg after the hint
      // and before the closed disclosure, and the disclosure carries none of
      // the figure (it holds only the reasoning and the takeaway).
      const html = await page.request.get(placement.route).then((r) => r.text());
      const figureAt = html.indexOf('data-predict-figure');
      expect(figureAt).toBeGreaterThan(-1);
      const revealAt = html.indexOf('data-reveal=', figureAt);
      expect(revealAt).toBeGreaterThan(figureAt);
      const figureSlice = html.slice(figureAt, revealAt);
      expect(figureSlice).toContain('data-reveal-hint');
      expect(figureSlice).toContain('<svg');
      const revealSlice = html.slice(revealAt, html.indexOf('</details>', revealAt));
      expect(revealSlice).toContain('data-takeaway');
      expect(revealSlice).not.toContain('data-figure-frame');
      const openingTag = html.slice(Math.max(0, revealAt - 100), html.indexOf('>', revealAt));
      expect(openingTag).not.toMatch(/\bopen\b/);
      await expect(reveal.locator('[data-figure-frame]')).toHaveCount(0);

      // The figure is mounted at the configuration the hint names: the
      // interactive root (a figure frame) is the element directly after the
      // hint, and its chart is visible at settle without answering.
      // textContent for the readout: a figure may keep its exact readout in
      // its own closed "How this was made" fold. The drawing is read from
      // the stage, since an icon inside the closed "Adjust more" fold can
      // come first in document order.
      const figure = predictFigure.locator(':scope > [data-reveal-hint] + *');
      await expect(figure).toBeVisible();
      await expect(figure.locator('[data-figure-stage] svg').first()).toBeVisible();
      const figureText = await figure.textContent();
      expect(figureText, `${placement.route}: figure missing under the hint`).toMatch(
        placement.mountedReadout,
      );
      await expect(reveal).not.toHaveAttribute('open');
    });

    test(`${placement.route}: no-JS reader sees the figure without opening anything`, async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(placement.route);
      const root = await region(page);
      const reveal = root.locator(':scope > details[data-reveal]');
      await expect(reveal).not.toHaveAttribute('open');
      // The figure is drawn with the reasoning still closed.
      const figure = root.locator(':scope > [data-predict-figure] > [data-reveal-hint] + *');
      const svg = figure.locator('[data-figure-stage] svg').first();
      await expect(svg).toBeVisible();
      const box = await svg.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThan(0);
      expect(box?.height ?? 0).toBeGreaterThan(0);
      await expect(reveal).not.toHaveAttribute('open');
      const text = await figure.textContent();
      expect(text).toMatch(placement.mountedReadout);
      // The reasoning stays one native click away without script.
      await reveal.locator(':scope > summary').click();
      await expect(reveal).toHaveAttribute('open');
      await expect(reveal.locator('[data-takeaway]')).toBeVisible();
      await expect(svg).toBeVisible();
      await context.close();
    });

    test(`${placement.route}: summary opens by Enter and by Space without marking an answer`, async ({ page }) => {
      for (const key of ['Enter', 'Space']) {
        await page.goto(placement.route);
        const root = await region(page);
        const reveal = root.locator(':scope > details[data-reveal]');
        const summary = reveal.locator(':scope > summary');
        const figureSvg = root
          .locator(':scope > [data-predict-figure] > [data-reveal-hint] + *')
          .locator('[data-figure-stage] svg')
          .first();
        // The figure is already shown before the reader opens anything.
        await expect(figureSvg).toBeVisible();
        await expect(reveal).not.toHaveAttribute('open');
        // Tab-reachability: the summary follows the radio group and the
        // figure's own controls in tab order; tabbing on from the group
        // reaches it.
        const lastRadio = root.locator('fieldset input[type="radio"]').last();
        await lastRadio.focus();
        let focused = false;
        const strayStops: string[] = [];
        for (let presses = 0; presses < 40 && !focused; presses += 1) {
          await page.keyboard.press('Tab');
          focused = await summary.evaluate((el) => document.activeElement === el);
          if (!focused) {
            const stray = await root.evaluate((el) => {
              const active = document.activeElement;
              const figureEl = el.querySelector(':scope > [data-predict-figure]');
              return active && figureEl?.contains(active) ? null : (active?.outerHTML.slice(0, 80) ?? 'none');
            });
            if (stray) strayStops.push(stray);
          }
        }
        expect(focused, `${key}: summary must be reachable by Tab`).toBe(true);
        // Between the question and the summary, Tab visits only the figure.
        expect(strayStops, `${key}: tab stops outside the figure`).toEqual([]);
        await page.keyboard.press(key);
        await expect(reveal).toHaveAttribute('open');
        await expect(figureSvg).toBeVisible();
        // Takeaway and every option's reasoning render.
        await expect(root.locator('[data-takeaway]')).toBeVisible();
        await expect(root.locator('[data-reason]').first()).toBeVisible();
        await expect(root.locator('[data-reason]')).toHaveCount(3);
        // No radio checked, no option marked chosen, no sibling style drift.
        const after = await root.evaluate((el) => {
          const radios = Array.from(el.querySelectorAll('input[type="radio"]'));
          const chosen = el.querySelectorAll('[data-chosen], [data-selected]');
          const labels = Array.from(el.querySelectorAll('fieldset label'));
          const colors = labels.map((l) => getComputedStyle(l).color);
          return {
            checked: radios.filter((r) => (r as HTMLInputElement).checked).length,
            chosen: chosen.length,
            sameColor: new Set(colors).size === 1,
          };
        });
        expect(after.checked).toBe(0);
        expect(after.chosen).toBe(0);
        expect(after.sameColor).toBe(true);
      }
    });

    test(`${placement.route}: takeaway satisfies the content rules on both paths`, async ({ page }) => {
      await page.goto(placement.route);
      const root = await region(page);

      // Path 1: the escape summary.
      await root.locator(':scope > details[data-reveal] > summary').click();
      const takeawayBySummary = await root.locator('[data-takeaway]').innerText();

      // Path 2: a committed option.
      await page.goto(placement.route);
      // Settle the client bundle before committing: a radio change that
      // lands before hydration reaches no onChange handler, the reveal
      // stays shut, and the failure reads as a product defect when it is
      // a driver race. Same convention as self-check.spec.ts.
      await page.waitForLoadState('networkidle');
      const root2 = await region(page);
      const values = await root2
        .locator('fieldset input[type="radio"]')
        .evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
      await root2
        .locator(`fieldset input[type="radio"][value="${values[0]}"]`)
        .check();
      const reveal = root2.locator('details[data-reveal]');
      await expect(reveal).toHaveAttribute('open');
      // The figure stays where it was, outside the opened reasoning.
      const svgBox = await root2
        .locator(':scope > [data-predict-figure] > [data-reveal-hint] + * svg')
        .first()
        .boundingBox();
      expect(svgBox?.width ?? 0).toBeGreaterThan(0);
      expect(svgBox?.height ?? 0).toBeGreaterThan(0);
      const takeawayByCommit = await root2.locator('[data-takeaway]').innerText();

      // At least 10 words, byte-identical across paths.
      expect(takeawayBySummary.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(10);
      expect(takeawayByCommit).toBe(takeawayBySummary);

      // Not the prompt, not any option label (normalised).
      const promptText = await root2.locator('fieldset legend').innerText();
      const labelTexts = await root2.locator('fieldset label').allInnerTexts();
      const normalizedTakeaway = normalize(takeawayBySummary);
      expect(normalizedTakeaway).not.toBe(normalize(promptText));
      for (const label of labelTexts) {
        expect(normalizedTakeaway).not.toBe(normalize(label));
      }
    });

    test(`${placement.route}: hint tokens match the mounted figure and the control stays live`, async ({ page }) => {
      await page.goto(placement.route);
      await page.waitForLoadState('networkidle');
      const root = await region(page);
      const reveal = root.locator(':scope > details[data-reveal]');
      // No answer and no opened disclosure: the hint and the figure are
      // read at settle.
      await expect(reveal).not.toHaveAttribute('open');

      const hint = await root.locator(':scope > [data-predict-figure] > [data-reveal-hint]').innerText();
      const figureRoot = root.locator(':scope > [data-predict-figure] > [data-reveal-hint] + *').first();
      await expect(figureRoot).toBeVisible();
      const figureText = await figureRoot.innerText();

      // Every digit-bearing token of the hint appears in the figure's own
      // controls or readout at mount.
      for (const token of digitTokens(hint)) {
        expect(figureText, `hint token ${token} missing at mount`).toContain(token);
      }

      // The primary control still works by keyboard and moves a readout.
      // Where it lives in the closed "Adjust more" fold, the reader opens
      // that fold first; the reasoning disclosure stays shut either way.
      if (placement.primaryControlInAdjust) {
        await expect(figureFold(figureRoot, 'adjust')).toHaveJSProperty('open', false);
        await openAdjustMore(figureRoot);
        await expect(reveal).not.toHaveAttribute('open');
      }
      const control = figureRoot.getByRole('slider', {
        name: placement.primaryControl,
      });
      // A native range moves its own value without script, but the
      // React-rendered readout only tracks it once hydrated, so an
      // unhydrated ArrowRight changes no digit-bearing token. Network idle
      // can arrive before hydration on a loaded dev server.
      await waitForHydration(control);
      await control.focus();
      const before = await figureRoot.innerText();
      await page.keyboard.press('ArrowRight');
      const after = await figureRoot.innerText();
      const beforeDigits = new Set(digitTokens(before));
      const changed = digitTokens(after).some((t) => !beforeDigits.has(t));
      expect(changed, 'keyboard move must change a digit-bearing readout token').toBe(true);
    });

    test(`${placement.route}: axe clean in both states, no console errors, 375px no overflow`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(String(err)));
      await page.goto(placement.route);
      const root = await region(page);
      const unanswered = await new AxeBuilder({ page })
        .exclude('.katex-display')
        .analyze();
      expect(unanswered.violations).toEqual([]);

      await root.locator('fieldset input[type="radio"]').first().check();
      const answered = await new AxeBuilder({ page })
        .exclude('.katex-display')
        .analyze();
      expect(answered.violations).toEqual([]);
      expect(consoleErrors).toEqual([]);

      await page.setViewportSize({ width: 375, height: 800 });
      const scroll = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(scroll).toBeLessThanOrEqual(0);
    });
  }

  /**
   * VAL-EDU-015, checked-in half: the pre-existing mounts of the
   * components that gained initial-state props render at their previous
   * default configuration (identical readout text and control values to
   * the pre-change baseline; the bounding-box-within-1px half is
   * evidenced against the captured baseline in the feature handoff).
   * The standalone PendulumController and EgoScaleScaling mounts left
   * their pages under one visual per concept (VAL-OPUS-131); each page's
   * one remaining instance is its prediction-step mount, which the
   * placement tests above pin at the hint's configuration.
   */
  test('existing mounts keep their pre-change defaults (VAL-EDU-015)', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err)));

    // /frontier/reliability-gap/ : ReliabilityCompounding at its default
    // configuration (its markup was touched for useId-derived input ids).
    // Home mounted it the same way until the front page dropped it under
    // the approved delta opus-homepage-20260930-mounts-home-reliability-compounding.
    await page.goto('/frontier/reliability-gap/');
    const reliabilityFigure = page
      .locator('[data-figure-frame]')
      .filter({
        has: page.locator('svg[aria-label^="Line chart of episode success"]'),
      })
      .first();
    // The full per-step slider sits in the frame's "Adjust more" fold. A fold
    // opened before hydration makes React report an `open` mismatch.
    await waitForHydration(reliabilityFigure.locator('[data-figure-fold="adjust"] > summary'));
    await openAdjustMore(reliabilityFigure);
    await expect(
      reliabilityFigure.getByRole('slider', { name: /per-step success probability/i }),
    ).toHaveValue('95');
    await expect(
      reliabilityFigure.getByRole('slider', { name: /episode length in steps/i }),
    ).toHaveValue('30');
    await expect(reliabilityFigure.getByTestId('episode-success-readout')).toHaveText('21.5%');

    // /manipulation/realtime-execution/ : the standalone ControlLoopBudget
    // mount, the page's one instance since its prediction step left.
    await page.goto('/manipulation/realtime-execution/');
    const clbStandalone = page
      .locator('[data-figure-frame]')
      .filter({
        has: page.locator('svg[aria-label^="Control-loop timeline"]'),
      })
      .first();
    // The model-size slider and its readouts sit in the frame's "Adjust more" fold.
    await waitForHydration(clbStandalone.locator('[data-figure-fold="adjust"] > summary'));
    await openAdjustMore(clbStandalone);
    await expect(
      clbStandalone.getByRole('slider', { name: /model size in billions/i }),
    ).toHaveValue('3');
    await expect(clbStandalone.getByTestId('params-readout')).toHaveText('3.0B params');
    await expect(clbStandalone.getByTestId('latency-readout')).toHaveText('52.6 ms');
    await expect(clbStandalone.getByTestId('hz-readout')).toHaveText('19 Hz');
    await expect(clbStandalone.getByTestId('verdict-readout')).toHaveText(
      'does not close at 50 Hz',
    );
    await expect(clbStandalone.getByTestId('missed-readout')).toHaveText('2');

    expect(consoleErrors).toEqual([]);

    // Axe on every modified-component route.
    for (const route of [
      '/frontier/reliability-gap/',
      '/manipulation/realtime-execution/',
      '/classical/control/',
      '/frontier/generalization/',
    ]) {
      await page.goto(route);
      await settleTransitions(page);
      const axe = await new AxeBuilder({ page })
        .exclude('.katex-display')
        .analyze();
      expect(axe.violations, `${route}: axe violations`).toEqual([]);
    }
  });
  /**
   * VAL-EDU-016 corpus half: sweeping every published article route,
   * exactly 5 render a prediction step and none renders two. The route
   * list is derived from the module registry, not hardcoded.
   */
  test('corpus sweep: exactly 5 published routes render a prediction step (VAL-EDU-016)', async ({ browser }) => {
    // Every published route in its own context on the dev server runs past
    // the 30 s default; the site-wide sweeps in chart-coverage-sweep.spec.ts
    // take the same budget.
    test.setTimeout(CORPUS_SWEEP_TIMEOUT_MS);
    const { publishedModules } = await import('../../data/modules');
    const routes = publishedModules().map((m) => `/${m.domain}/${m.slug}/`);
    // Registry-derived: no literal published count is pinned (it drifted
    // 42 -> 43 -> 47 -> 57 across publishes); non-zero cardinality only.
    expect(routes.length).toBeGreaterThan(0);
    const carriers: Array<{ route: string; predicts: number; selfChecks: number }> = [];
    await forEachInOwnContext(browser, routes, async (page, route) => {
      await page.goto(route);
      const predicts = await page.locator('[data-predict]').count();
      const selfChecks = await page.locator('[data-self-check]').count();
      expect(predicts, `${route}: more than one prediction step`).toBeLessThanOrEqual(1);
      if (predicts === 1) carriers.push({ route, predicts, selfChecks });
    });
    expect(carriers.length).toBe(5);
    // On routes carrying both regions, the two are distinct elements with
    // distinct radio name values.
    await forEachInOwnContext(
      browser,
      carriers.filter((c) => c.selfChecks > 0),
      async (page, { route }) => {
        await page.goto(route);
        const names = await page.evaluate(() => {
          const collect = (root: Element | null) =>
            root
              ? Array.from(root.querySelectorAll('fieldset input[type="radio"]')).map(
                  (e) => (e as HTMLInputElement).name,
                )
              : [];
          const predict = collect(document.querySelector('[data-predict]'));
          const check = collect(document.querySelector('[data-self-check]'));
          return { predict, check };
        });
        expect(new Set([...names.predict]).size, `${route}: predict radios share no single name`).toBe(1);
        expect(new Set([...names.check]).size, `${route}: self-check radios share no single name`).toBe(1);
        expect(names.predict[0], `${route}: regions share a radio name`).not.toBe(names.check[0]);
      },
    );
  });

  /**
   * VAL-EDU-017 + VAL-EDU-041 corpus half: across every prediction step
   * and every self-check, option sets are non-degenerate and do not leak
   * the answer by shape. The route list is derived from the module
   * registry, not hardcoded, so a region added on any published route is
   * visited here; the per-kind counts at the end are the drift guard.
   */
  test('corpus sweep: option sets across all 14 regions (VAL-EDU-017, VAL-EDU-041)', async ({ browser }) => {
    test.setTimeout(CORPUS_SWEEP_TIMEOUT_MS);
    const HEDGE = /\b(only|could|may|might|unless|depends|typically|generally|usually|tends to|at least|roughly|approximately)\b/i;
    const FILLER = /\ball of the (above|these)\b|\bnone of the\b/i;
    const { publishedModules } = await import('../../data/modules');
    const routes = publishedModules().map((m) => `/${m.domain}/${m.slug}/`);
    expect(routes.length, 'no published routes derived from the registry').toBeGreaterThan(0);
    const hist: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    const predictHist: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    const selfCheckHist: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    let longestCount = 0;
    let regionCount = 0;
    let predictCount = 0;
    let selfCheckCount = 0;
    const predictRoutes: string[] = [];
    const selfCheckRoutes: string[] = [];
    await forEachInOwnContext(browser, routes, async (page, route) => {
      await page.goto(route);
      const regions = page.locator('[data-predict], [data-self-check]');
      const count = await regions.count();
      for (let i = 0; i < count; i += 1) {
        const region = regions.nth(i);
        const kind = (await region.getAttribute('data-predict')) === '' ? 'predict' : 'self-check';
        const radios = region.locator('fieldset input[type="radio"]');
        await expect(radios).toHaveCount(3);
        const correctValue = await region
          .locator('[data-reason][data-correct="true"]')
          .getAttribute('data-reason');
        const labels = await region.locator('fieldset label span').allInnerTexts();
        const values = await radios.evaluateAll((els) =>
          els.map((e) => (e as HTMLInputElement).value),
        );
        const answerIdx = values.indexOf(correctValue ?? '');
        expect(answerIdx, `${route} ${kind}: no single correct option`).toBeGreaterThanOrEqual(0);
        // Non-degenerate: 3+ words or digit token, no filler, no dupes.
        for (const label of labels) {
          const words = label.trim().split(/\s+/).filter(Boolean);
          expect(words.length >= 3 || /\d/.test(label), `${route} ${kind}: thin label`).toBe(true);
          expect(FILLER.test(label), `${route} ${kind}: filler option`).toBe(false);
        }
        const normalized = labels.map((l) => normalize(l));
        expect(new Set(normalized).size, `${route} ${kind}: duplicated labels`).toBe(3);
        // Shape: length ratio, longest, hedging, ordinal.
        const correct = labels[answerIdx];
        const distractors = labels.filter((_, idx) => idx !== answerIdx);
        const maxD = Math.max(...distractors.map((l) => l.length));
        expect(
          correct.length / maxD,
          `${route} ${kind}: correct label exceeds 1.5x longest distractor`,
        ).toBeLessThanOrEqual(1.5);
        if (correct.length > maxD) longestCount += 1;
        const correctHedged = HEDGE.test(correct);
        const anyDistractorHedged = distractors.some((l) => HEDGE.test(l));
        expect(
          !correctHedged || anyDistractorHedged,
          `${route} ${kind}: correct option is the only hedged label`,
        ).toBe(true);
        hist[answerIdx + 1] += 1;
        if (kind === 'predict') {
          predictHist[answerIdx + 1] += 1;
        } else {
          selfCheckHist[answerIdx + 1] += 1;
        }
        regionCount += 1;
        if (kind === 'predict') {
          predictCount += 1;
          predictRoutes.push(route);
        } else {
          selfCheckCount += 1;
          selfCheckRoutes.push(route);
        }
      }
    });
    // Non-zero cardinality before the property assertions: a sweep that
    // matched zero regions fails here rather than passing vacuously.
    expect(regionCount, 'sweep visited no regions on any published route').toBeGreaterThan(0);
    // Drift guard replacing the old fixed total: per-kind oracles over the
    // registry-derived walk. They currently protect 5 prediction steps and
    // 16 self-checks; a region added on ANY published route changes one of
    // them and the failure names the carrying routes. When a region is
    // added on purpose, re-derive both literals from content/ and update
    // them together.
    expect(predictCount, `prediction steps found on: ${predictRoutes.join(', ')}`).toBe(5);
    expect(selfCheckCount, `self-checks found on: ${selfCheckRoutes.join(', ')}`).toBe(16);
    expect(regionCount, 'discovered regions vs regions the walk visited').toBe(
      predictCount + selfCheckCount,
    );
    expect(
      longestCount,
      `correct-is-longest exceeds half of ${regionCount}`,
    ).toBeLessThanOrEqual(Math.floor(regionCount / 2));
    for (const pos of [1, 2, 3]) {
      expect(
        hist[pos],
        `ordinal position ${pos} exceeds half of ${regionCount}`,
      ).toBeLessThanOrEqual(Math.floor(regionCount / 2));
    }
    // Per-kind ordinal-position band (VAL-EDU-041, tightened 2026-08-20).
    // The aggregate histogram can hide opposite per-kind habits by
    // cancellation: predict placements sat at 6/1/1 while self-checks sat
    // at 0/5/1, an aggregate of 6/6/2 that read as uniform. A reader who
    // learns "pick first on a prediction, second on a self-check" scored
    // 11 of 14 against a 1-in-3 base rate. The band is loose because the
    // per-kind corpora are small: every position is used at least once,
    // and no position holds more than half of that kind's placements
    // (matching the contract's aggregate "more than half" rule at the
    // per-kind granularity). Bounds are derived from each kind's own
    // count so the gate scales as placements are added. No chi-square
    // threshold: at n=8 even a single added placement can swing it.
    const perKindBands: Array<[string, Record<number, number>, number]> = [
      ['prediction steps', predictHist, predictCount],
      ['self-checks', selfCheckHist, selfCheckCount],
    ];
    for (const [kindName, kindHist, kindCount] of perKindBands) {
      expect(kindCount, `per-kind band walked zero ${kindName}`).toBeGreaterThan(0);
      for (const pos of [1, 2, 3]) {
        expect(
          kindHist[pos],
          `${kindName}: ordinal position ${pos} unused (floor is 1 of ${kindCount})`,
        ).toBeGreaterThanOrEqual(1);
        expect(
          kindHist[pos],
          `${kindName}: ordinal position ${pos} exceeds half of ${kindCount} (${kindHist[pos]}/${kindCount})`,
        ).toBeLessThanOrEqual(Math.floor(kindCount / 2));
      }
    }
  });

  /**
   * VAL-EDU-018: each correct option's reasoning carries a citation chip
   * or an in-page anchor. A chip renders as #ref-<registry id>, an in-page
   * href, so the chip check is a two-hop: the id must resolve to this
   * article's References entry, and that entry's outbound link must be an
   * absolute http(s) url matching the citation registry entry for the id.
   * An in-page anchor passes by resolving to an element on the same route.
   * And VAL-EDU-019: digit-normalised prompts, takeaways and reasoning
   * texts are pairwise distinct across all 24 regions. Routes are derived
   * from the module registry, not hardcoded, and the per-kind counts at
   * the end catch a region added on any published route.
   */
  test('corpus sweep: cited answers and non-templated text (VAL-EDU-018, VAL-EDU-019)', async ({ browser }) => {
    test.setTimeout(CORPUS_SWEEP_TIMEOUT_MS);
    const { publishedModules } = await import('../../data/modules');
    const { getCitation } = await import('../../data/citations');
    const routes = publishedModules().map((m) => `/${m.domain}/${m.slug}/`);
    expect(routes.length, 'no published routes derived from the registry').toBeGreaterThan(0);
    const digitNormalize = (text: string) => text.replace(/\d+/g, '#');
    const prompts = new Map<string, string>();
    const takeaways = new Map<string, string>();
    const reasonings = new Map<string, string>();
    let predictCount = 0;
    let selfCheckCount = 0;
    const predictRoutes: string[] = [];
    const selfCheckRoutes: string[] = [];
    await forEachInOwnContext(browser, routes, async (page, route) => {
      await page.goto(route);
      const regions = page.locator('[data-predict], [data-self-check]');
      const count = await regions.count();
      for (let i = 0; i < count; i += 1) {
        const region = regions.nth(i);
        const isPredict = (await region.getAttribute('data-predict')) === '';
        if (isPredict) {
          predictCount += 1;
          predictRoutes.push(route);
        } else {
          selfCheckCount += 1;
          selfCheckRoutes.push(route);
        }
        const correctReason = region.locator('[data-reason][data-correct="true"]');
        // Cardinality first: exactly one reasoning element is marked
        // correct, so the link checks below cannot pass on zero matches.
        await expect(correctReason).toHaveCount(1);
        const links = await correctReason.locator('a').evaluateAll((els) =>
          els.map((e) => ({ href: (e as HTMLAnchorElement).getAttribute('href') ?? '' })),
        );
        // VAL-EDU-018, chip half (the two-hop): every #ref-<id> chip
        // resolves to this page's References entry, and that entry's
        // outbound link is an absolute http(s) url that IS the registry
        // entry's url for the id.
        const chipIds = links
          .filter((l) => l.href.startsWith('#ref-'))
          .map((l) => l.href.slice('#ref-'.length));
        for (const id of chipIds) {
          const citation = getCitation(id);
          expect(citation, `${route}: cite id ${id} is absent from the citation registry`).toBeTruthy();
          const outbound = await page.evaluate((target) => {
            const entry = document.getElementById(target);
            const link = entry?.querySelector('a[href]');
            return link ? (link as HTMLAnchorElement).href : null;
          }, `ref-${id}`);
          expect(
            outbound,
            `${route}: #ref-${id} does not resolve to a References entry with a link`,
          ).toBeTruthy();
          expect(
            outbound,
            `${route}: #ref-${id} outbound link is not absolute http(s)`,
          ).toMatch(/^https?:\/\//);
          expect(
            outbound,
            `${route}: #ref-${id} outbound link differs from the registry url`,
          ).toBe(citation?.url);
        }
        // VAL-EDU-018, anchor half: a plain in-page anchor resolves to an
        // element that exists on this route.
        const anchors = links.filter(
          (l) => l.href.startsWith('#') && !l.href.startsWith('#ref-'),
        );
        let anchorResolves = false;
        for (const a of anchors) {
          const id = a.href.slice(1);
          if (
            id &&
            (await page.evaluate(
              (target) => document.getElementById(target) !== null,
              id,
            ))
          ) {
            anchorResolves = true;
            break;
          }
        }
        if (isPredict) {
          // Cardinality before the union: a prediction step whose correct
          // reasoning carries no link at all fails here, not vacuously in
          // both branches.
          expect(links.length, `${route}: correct reasoning carries no link`).toBeGreaterThan(0);
          expect(chipIds.length > 0 || anchorResolves, `${route}: uncited correct answer`).toBe(true);
        }

        // VAL-EDU-019: digit-normalised uniqueness. innerText is empty
        // inside a closed disclosure, so open the reveal before reading.
        await region.locator(':scope > details[data-reveal] > summary').click();
        const prompt = await region.locator('fieldset legend').innerText();
        const takeaway = await region.locator('[data-takeaway]').innerText();
        const reasoning = await correctReason.innerText();
        for (const [text, set, kind] of [
          [prompt, prompts, 'prompt'],
          [takeaway, takeaways, 'takeaway'],
          [reasoning, reasonings, 'reasoning'],
        ] as Array<[string, Map<string, string>, string]>) {
          const key = digitNormalize(normalize(text));
          expect(
            set.has(key),
            `${route}: digit-normalised ${kind} duplicates ${set.get(key)}`,
          ).toBe(false);
          set.set(key, route);
        }
      }
    });
    // Non-zero cardinality before the totals: a sweep that matched zero
    // regions fails here rather than passing vacuously.
    expect(
      prompts.size + takeaways.size + reasonings.size,
      'sweep visited no regions on any published route',
    ).toBeGreaterThan(0);
    // Same drift guard as the option-set sweep: per-kind oracles over the
    // registry-derived walk, currently protecting 5 prediction steps and
    // 16 self-checks. Re-derive both literals from content/ when a region
    // is added on purpose.
    expect(predictCount, `prediction steps found on: ${predictRoutes.join(', ')}`).toBe(5);
    expect(selfCheckCount, `self-checks found on: ${selfCheckRoutes.join(', ')}`).toBe(16);
    expect(prompts.size + takeaways.size + reasonings.size).toBe(21 * 3);
  });
});
