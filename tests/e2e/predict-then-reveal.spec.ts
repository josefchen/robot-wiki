import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Prediction-step contract (VAL-EDU-011..014) over the three placement
 * routes, plus the checked-in half of VAL-EDU-015: existing mounts of the
 * three components that gained initial-state props keep their exact
 * default readouts and control values (the pre-change baseline was
 * captured before the props landed; pixel boxes are compared in the
 * feature's evidence, the deterministic text is pinned here).
 */

interface Placement {
  route: string;
  figure: string;
  /** Regex matching the primary control's accessible name. */
  primaryControl: RegExp;
  /** A readout string that proves the figure mounted at the hint's config. */
  mountedReadout: RegExp;
}

const PLACEMENTS: Placement[] = [
  {
    route: '/data-hardware/evaluation-crisis/',
    figure: 'ReliabilityCompounding',
    primaryControl: /per-step success probability/i,
    mountedReadout: /48\.8%/,
  },
  {
    route: '/manipulation/action-chunking/',
    figure: 'LatencyComparison',
    primaryControl: /injected inference delay/i,
    mountedReadout: /0%\s*failed/,
  },
  {
    route: '/manipulation/realtime-execution/',
    figure: 'ControlLoopBudget',
    primaryControl: /model size in billions/i,
    mountedReadout: /closes at 50 Hz/,
  },
];

/** Whitespace/case normalisation, per the contract's definitions. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Digit-bearing tokens of a text, per the contract's definition. */
function digitTokens(text: string): string[] {
  return text.split(/\s+/).filter((t) => /[0-9]/.test(t));
}

async function region(page: Page) {
  return page.locator('[data-predict]');
}

test.describe('prediction step (PredictThenReveal)', () => {
  test('exactly the three placement routes render one prediction step each', async ({ page }) => {
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
      const reveal = root.locator('details[data-reveal]');
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

      // VAL-EDU-011a: closed on load; no blur/visibility/opacity gate on
      // the reveal or any ancestor up to body.
      await expect(reveal).not.toHaveAttribute('open');
      const gateStyles = await reveal.evaluate((el) => {
        const bad: string[] = [];
        let node = el as HTMLElement | null;
        while (node && node !== document.body) {
          const cs = getComputedStyle(node);
          if (cs.filter.includes('blur(')) bad.push('blur');
          if (cs.visibility === 'hidden') bad.push('visibility');
          if (cs.opacity === '0') bad.push('opacity');
          node = node.parentElement;
        }
        return bad;
      });
      expect(gateStyles).toEqual([]);

      // VAL-EDU-011b: the served HTML ships the figure's svg inside the
      // closed disclosure (gating is disclosure state, not absence).
      const html = await page.request.get(placement.route).then((r) => r.text());
      const revealAt = html.indexOf('data-reveal');
      expect(revealAt).toBeGreaterThan(-1);
      const revealSlice = html.slice(revealAt, html.indexOf('</details>', revealAt));
      expect(revealSlice).toContain('<svg');
      const openingTag = html.slice(Math.max(0, revealAt - 100), html.indexOf('>', revealAt));
      expect(openingTag).not.toMatch(/\bopen\b/);

      // The figure is mounted at the configuration the hint names: the
      // interactive root is the div directly after the reveal hint.
      // textContent, not innerText: the disclosure is still closed, and a
      // closed disclosure's content has no rendered innerText.
      const figure = reveal.locator('[data-reveal-hint] + div');
      await expect(figure.locator('svg').first()).toBeAttached();
      const figureText = await figure.textContent();
      expect(figureText, `${placement.route}: figure missing under the hint`).toMatch(
        placement.mountedReadout,
      );
    });

    test(`${placement.route}: no-JS reader opens the disclosure and sees the figure`, async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(placement.route);
      const root = await region(page);
      const reveal = root.locator('details[data-reveal]');
      await expect(reveal).not.toHaveAttribute('open');
      await reveal.locator('summary').click();
      await expect(reveal).toHaveAttribute('open');
      const svg = reveal.locator('svg').first();
      await expect(svg).toBeVisible();
      const box = await svg.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThan(0);
      expect(box?.height ?? 0).toBeGreaterThan(0);
      const text = await reveal.innerText();
      expect(text).toMatch(placement.mountedReadout);
      await context.close();
    });

    test(`${placement.route}: summary opens by Enter and by Space without marking an answer`, async ({ page }) => {
      for (const key of ['Enter', 'Space']) {
        await page.goto(placement.route);
        const root = await region(page);
        const reveal = root.locator('details[data-reveal]');
        const summary = reveal.locator('summary');
        // Tab-reachability: the radio group is the tab stop before the
        // summary; Tab from the group lands on the summary.
        const lastRadio = root.locator('fieldset input[type="radio"]').last();
        await lastRadio.focus();
        await page.keyboard.press('Tab');
        const focused = await summary.evaluate(
          (el) => document.activeElement === el,
        );
        expect(focused, `${key}: summary must be reachable by Tab`).toBe(true);
        await page.keyboard.press(key);
        await expect(reveal).toHaveAttribute('open');
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
      await root.locator('details[data-reveal] summary').click();
      const takeawayBySummary = await root.locator('[data-takeaway]').innerText();

      // Path 2: a committed option.
      await page.goto(placement.route);
      const root2 = await region(page);
      const values = await root2
        .locator('fieldset input[type="radio"]')
        .evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
      await root2
        .locator(`fieldset input[type="radio"][value="${values[0]}"]`)
        .check();
      const reveal = root2.locator('details[data-reveal]');
      await expect(reveal).toHaveAttribute('open');
      const svgBox = await reveal.locator('svg').first().boundingBox();
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
      const root = await region(page);
      const reveal = root.locator('details[data-reveal]');
      await root.locator('details[data-reveal] summary').click();
      await expect(reveal).toHaveAttribute('open');

      const hint = await root.locator('[data-reveal-hint]').innerText();
      const figureRoot = reveal.locator('[data-reveal-hint] + div').first();
      await expect(figureRoot).toBeVisible();
      const figureText = await figureRoot.innerText();

      // Every digit-bearing token of the hint appears in the figure's own
      // controls or readout at mount.
      for (const token of digitTokens(hint)) {
        expect(figureText, `hint token ${token} missing at mount`).toContain(token);
      }

      // The primary control still works by keyboard and moves a readout.
      const control = figureRoot.getByRole('slider', {
        name: placement.primaryControl,
      });
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
   * VAL-EDU-015, checked-in half: the pre-existing mounts of the three
   * components that gained initial-state props render at their previous
   * default configuration (identical readout text and control values to
   * the pre-change baseline; the bounding-box-within-1px half is
   * evidenced against the captured baseline in the feature handoff).
   */
  test('existing mounts keep their pre-change defaults (VAL-EDU-015)', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err)));

    // / : ReliabilityCompounding (home page mount; its markup was touched
    // for useId-derived input ids).
    await page.goto('/');
    const homeFigure = page
      .locator('div.rounded-md')
      .filter({
        has: page.locator('svg[aria-label^="Line chart of episode success"]'),
      })
      .first();
    await expect(
      homeFigure.getByRole('slider', { name: /per-step success probability/i }),
    ).toHaveValue('95');
    await expect(
      homeFigure.getByRole('slider', { name: /episode length in steps/i }),
    ).toHaveValue('30');
    await expect(page.getByTestId('episode-success-readout')).toHaveText('21.5%');

    // /manipulation/realtime-execution/ : the standalone ControlLoopBudget
    // mount (document order puts it before the wrapped prediction figure).
    await page.goto('/manipulation/realtime-execution/');
    const clbStandalone = page
      .locator('div.rounded-md')
      .filter({
        has: page.locator('svg[aria-label^="Control-loop timeline"]'),
      })
      .first();
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

    // /classical/control/ : PendulumController.
    await page.goto('/classical/control/');
    await expect(page.getByTestId('pendulum-gain-kp-value')).toHaveText('25.0');
    await expect(page.getByTestId('pendulum-gain-ki-value')).toHaveText('0.0');
    await expect(page.getByTestId('pendulum-gain-kd-value')).toHaveText('3.0');
    await expect(page.getByTestId('pendulum-angle-readout')).toHaveText('+12.0°');
    await expect(page.getByTestId('pendulum-status-readout')).toHaveText(
      'holding at release',
    );

    // /frontier/generalization/ : EgoScaleScaling.
    await page.goto('/frontier/generalization/');
    const egsSlider = page.getByRole('slider', {
      name: /extrapolation horizon in hours/i,
    });
    await expect(egsSlider).toHaveValue('5000');
    await expect(page.getByTestId('horizon-readout')).toHaveText('100k h');
    await expect(page.getByTestId('loss-readout')).toHaveText(
      '0.0102 holds / 0.0150 plateau',
    );
    await expect(page.getByTestId('completion-readout')).toHaveText(
      '0.89 holds / 0.71 plateau, below the solved bar',
    );

    expect(consoleErrors).toEqual([]);

    // Axe on every modified-component route, including /.
    for (const route of [
      '/',
      '/manipulation/realtime-execution/',
      '/classical/control/',
      '/frontier/generalization/',
    ]) {
      await page.goto(route);
      const axe = await new AxeBuilder({ page })
        .exclude('.katex-display')
        .analyze();
      expect(axe.violations, `${route}: axe violations`).toEqual([]);
    }
  });
});
