import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Self-check contract (VAL-EDU-004..010). One self-check per content
 * domain, six routes, each authored as the last block of the article
 * prose inside [data-pagefind-body].
 */
const ROUTES: Array<{ route: string; domain: string }> = [
  { route: '/classical/control/', domain: 'classical' },
  { route: '/manipulation/bc-foundations/', domain: 'manipulation' },
  { route: '/rl-sim2real/sim2real-transfer/', domain: 'rl-sim2real' },
  { route: '/world-models/taxonomy/', domain: 'world-models' },
  { route: '/data-hardware/evaluation-crisis/', domain: 'data-hardware' },
  { route: '/frontier/reliability-gap/', domain: 'frontier' },
];

test.describe('self-check (CommitToReveal)', () => {
  test('exactly six routes render one self-check, one per domain', async ({ page }) => {
    const found: string[] = [];
    for (const { route, domain } of ROUTES) {
      await page.goto(route);
      const checks = page.locator('[data-self-check]');
      await expect(checks).toHaveCount(1);
      // Inside the prose region, before the template hairline, last block.
      const inProse = await page
        .locator('[data-pagefind-body] [data-self-check]')
        .count();
      expect(inProse, `${route}: self-check outside prose region`).toBe(1);
      const order = await page.evaluate(() => {
        const check = document.querySelector('[data-self-check]');
        const article = check?.closest('article');
        const hr = article?.querySelector('hr');
        if (!check || !hr) return `missing:${!check ? 'check' : 'hr'}`;
        return check.compareDocumentPosition(hr) & Node.DOCUMENT_POSITION_FOLLOWING
          ? 'before-hr'
          : 'after-hr';
      });
      expect(order, `${route}: self-check must precede the hairline`).toBe('before-hr');
      const lastBlock = await page.evaluate(() => {
        // The header also carries data-pagefind-body; the prose region is
        // the div.prose one.
        const prose = Array.from(
          document.querySelectorAll('[data-pagefind-body]'),
        ).find((e) => e.tagName === 'DIV')!;
        const blocks = Array.from(prose.children);
        return blocks[blocks.length - 1].hasAttribute('data-self-check')
          ? 'self-check'
          : 'other';
      });
      expect(lastBlock, `${route}: self-check must be the last prose block`).toBe('self-check');
      found.push(domain);
    }
    expect(found).toHaveLength(6);
    expect(new Set(found).size).toBe(6);
  });

  for (const { route } of ROUTES) {
    test(`${route}: native grouped control, closed reveal, commit loop, a11y`, async ({ page }) => {
      await page.goto(route);
      const region = page.locator('[data-self-check]');
      await expect(region).toHaveCount(1);

      // VAL-EDU-004: one fieldset, legend prompt, 3 same-name radios,
      // no hand-rolled radiogroup, no submit control.
      const fieldset = region.locator('fieldset');
      await expect(fieldset).toHaveCount(1);
      await expect(fieldset.locator('legend')).toBeVisible();
      const radios = fieldset.locator('input[type="radio"]');
      await expect(radios).toHaveCount(3);
      const names = await radios.evaluateAll((els) =>
        Array.from(new Set(els.map((e) => (e as HTMLInputElement).name))),
      );
      expect(names).toHaveLength(1);
      expect(names[0].length).toBeGreaterThan(0);
      expect(await region.locator('[role="radiogroup"]').count()).toBe(0);
      // Scoped to the self-check: the site chrome (search) carries its own
      // submit control, which is not this component's.
      expect(await region.locator('button[type="submit"], input[type="submit"]').count()).toBe(0);

      // Stable hooks: reveal, takeaway, three reasons keyed by option value.
      const reveal = region.locator('details[data-reveal]');
      await expect(reveal).toHaveCount(1);
      await expect(region.locator('[data-takeaway]')).toHaveCount(1);
      const reasons = region.locator('[data-reason]');
      await expect(reasons).toHaveCount(3);
      const reasonKeys = await reasons.evaluateAll((els) =>
        els.map((e) => (e as HTMLElement).dataset.reason),
      );
      const optionValues = await radios.evaluateAll((els) =>
        els.map((e) => (e as HTMLInputElement).value),
      );
      expect([...reasonKeys].sort()).toEqual([...optionValues].sort());

      // VAL-EDU-005: closed on load; reasoning in the document but not
      // readable; no blur/visibility/opacity gate up the tree.
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

      // VAL-EDU-006: wrong commit reveals own + correct reasoning; a
      // second selection re-reveals; nothing locks.
      const correctValue = await region
        .locator('[data-reason][data-correct="true"]')
        .getAttribute('data-reason');
      expect(correctValue).toBeTruthy();
      // Pick the first radio that is not the correct one.
      const wrongRadio = radios.nth(
        optionValues.findIndex((v) => v !== correctValue),
      );
      await wrongRadio.check();
      await expect(reveal).toHaveAttribute('open');
      await expect(
        region.locator(`[data-reason="${optionValues.find((v) => v !== correctValue)}"]`),
      ).toBeVisible();
      await expect(
        region.locator(`[data-reason="${correctValue}"]`),
      ).toBeVisible();
      // Correct commit.
      const correctRadio = radios.nth(optionValues.findIndex((v) => v === correctValue));
      await correctRadio.check();
      await expect(
        region.locator(`[data-reason="${correctValue}"]`),
      ).toBeVisible();
      // Nothing disabled or read-only.
      const states = await radios.evaluateAll((els) =>
        els.map((e) => (e as HTMLInputElement).disabled || (e as HTMLInputElement).readOnly),
      );
      expect(states.every((s) => !s)).toBe(true);

      // VAL-EDU-008: no persistence, URL unchanged, no score strings.
      const clean = await page.evaluate(() => ({
        local: window.localStorage.length,
        session: window.sessionStorage.length,
        cookie: document.cookie,
      }));
      expect(clean.local).toBe(0);
      expect(clean.session).toBe(0);
      expect(clean.cookie).toBe('');
      const text = await region.innerText();
      expect(text).not.toMatch(/\b(score|streak|badge|points|XP)\b/i);

      // Reload restores the unanswered state.
      await page.reload();
      await expect(page.locator('[data-self-check] details[data-reveal]')).not.toHaveAttribute('open');

      // VAL-EDU-009: aria-live polite wraps the reveal content.
      const live = await page
        .locator('[data-self-check] [data-takeaway]')
        .evaluate((el) => el.closest('[aria-live="polite"]') !== null);
      expect(live).toBe(true);

      // VAL-EDU-010: axe at 1440px, unanswered state.
      const axeUnanswered = await new AxeBuilder({ page })
        .exclude('.katex-display')
        .analyze();
      expect(axeUnanswered.violations).toEqual([]);
    });

    test(`${route}: keyboard operation, focus stays on the radio, axe after answer, 375px width`, async ({ page }) => {
      await page.goto(route);
      const region = page.locator('[data-self-check]');
      const radios = region.locator('fieldset input[type="radio"]');
      const first = radios.first();

      // Keyboard: focus the group, arrow to move, selection commits.
      await first.focus();
      await page.keyboard.press('ArrowRight');
      const focusedIsRadio = await page.evaluate(
        () =>
          document.activeElement instanceof HTMLInputElement &&
          document.activeElement.type === 'radio',
      );
      expect(focusedIsRadio).toBe(true);
      // Visible focus indicator on the focused radio.
      const indicator = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const cs = getComputedStyle(el);
        return (
          (parseFloat(cs.outlineWidth) >= 1 && cs.outlineColor.includes('0, 0, 0, 0') === false) ||
          cs.boxShadow !== 'none'
        );
      });
      expect(indicator).toBe(true);
      // Commit via keyboard (Space on the already-focused radio).
      await page.keyboard.press('Space');
      const reveal = region.locator('details[data-reveal]');
      await expect(reveal).toHaveAttribute('open');
      // Focus never moved programmatically.
      const activeStillRadio = await page.evaluate(
        () =>
          document.activeElement instanceof HTMLInputElement &&
          document.activeElement.type === 'radio',
      );
      expect(activeStillRadio).toBe(true);

      // Summary reachable by Tab and after the fieldset in document order.
      const summaryAfterFieldset = await page.evaluate(() => {
        const fieldset = document.querySelector('[data-self-check] fieldset')!;
        const summary = document.querySelector('[data-self-check] details[data-reveal] summary')!;
        return (
          summary.compareDocumentPosition(fieldset) & Node.DOCUMENT_POSITION_FOLLOWING
        ) === 0 || (fieldset.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      });
      expect(summaryAfterFieldset).toBe(true);

      // VAL-EDU-010: axe answered state + 375px no horizontal scroll in
      // both states.
      const axeAnswered = await new AxeBuilder({ page })
        .exclude('.katex-display')
        .analyze();
      expect(axeAnswered.violations).toEqual([]);

      await page.setViewportSize({ width: 375, height: 800 });
      const answeredScroll = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(answeredScroll).toBeLessThanOrEqual(0);
      await page.goto(route);
      await page.setViewportSize({ width: 375, height: 800 });
      const unansweredScroll = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(unansweredScroll).toBeLessThanOrEqual(0);
    });
  }

  test('no-JS: prompt, labels and reasoning reachable through the summary', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    for (const { route } of ROUTES) {
      await page.goto(route);
      const region = page.locator('[data-self-check]');
      await expect(region.locator('fieldset legend')).toBeVisible();
      await expect(region.locator('fieldset input[type="radio"]')).toHaveCount(3);
      // All three option labels render.
      const labels = region.locator('fieldset label');
      await expect(labels).toHaveCount(3);
      for (let i = 0; i < 3; i += 1) {
        await expect(labels.nth(i)).toBeVisible();
      }
      // The reveal ships closed with all reasoning inside.
      const reveal = region.locator('details[data-reveal]');
      await expect(reveal).not.toHaveAttribute('open');
      await expect(reveal.locator('[data-reason]')).toHaveCount(3);
      await expect(reveal.locator('[data-takeaway]')).toHaveCount(1);
      // Activating the summary opens it without script.
      await reveal.locator('summary').click();
      await expect(reveal.locator('[data-reason]').first()).toBeVisible();
      await expect(reveal.locator('[data-takeaway]')).toBeVisible();
    }
    await context.close();
  });
});
