import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { setSlider } from './slider';

const route = '/data-hardware/evaluation-crisis/';
const manuscript = fs.readFileSync(
  new URL('../../content/data-hardware/evaluation-crisis.mdx', import.meta.url), 'utf8',
);
const selected = [
  { component: 'Cite', attribute: 'data-cite-id', ids: [
    'libero-2023', 'simpler-2024', 'roboarena-2025', 'robochallenge-2025',
  ] },
  { component: 'Term', attribute: 'data-term-id', ids: ['system-identification', 'success-rate'] },
];
const positions = ['reading', 'upper-edge', 'lower-edge'] as const;
const methods = ['hover', 'keyboard'] as const;

for (const width of [375, 1440]) {
  // 900px preserves the predecessor's actual 180 case identities.
  // This is not the full reference/reflow/zoom accessibility matrix.
  test.describe(`evaluation benchmark readers at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.beforeEach(async ({ context, page }) => {
      await context.route('**/*', async (request) => {
        const url = new URL(request.request().url());
        if (['127.0.0.1', 'localhost'].includes(url.hostname)) await request.continue();
        else await request.abort('blockedbyclient');
      });
      await context.addInitScript(() => {
        const style = document.createElement('style');
        style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
        const install = () => {
          if (document.documentElement && !style.isConnected) document.documentElement.appendChild(style);
        };
        install();
        new MutationObserver(install).observe(document, { childList: true, subtree: true });
      });
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
    });

    test('every scoped tooltip identity is contained at reading and both edges', async ({ page }, info) => {
      const observations = [];
      const failures: string[] = [];
      const expected: string[] = [];
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const group of selected) {
        for (const id of group.ids) {
          // Discover independently from authored sites, not the DOM annotation
          // whose omission this test must reject.
          const sourceCount = [...manuscript.matchAll(
            new RegExp(`<${group.component}\\s+id=["']${id}["']`, 'g'),
          )].length;
          expect(sourceCount, `${id} source population`).toBeGreaterThan(0);
          const roots = page.locator(`div.prose [${group.attribute}="${id}"]`);
          await expect(roots).toHaveCount(sourceCount);
          for (let occurrence = 0; occurrence < sourceCount; occurrence++) {
            const root = roots.nth(occurrence);
            const source = root.locator('a').first();
            const tooltip = root.getByRole('tooltip');
            for (const position of positions) {
              for (const method of methods) {
                const identity = [width, id, occurrence, position, method, 'containment'].join(':');
                expected.push(identity);
                await page.mouse.move(0, 0);
                await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
                await root.evaluate((element, placement) => {
                  const target = placement === 'reading' ? 500 : placement === 'upper-edge' ? 100 : innerHeight - 80;
                  window.scrollBy(0, element.getBoundingClientRect().top - target);
                }, position);
                if (method === 'hover') await source.hover();
                else {
                  await source.focus();
                  await page.keyboard.press('Tab');
                  await page.keyboard.press('Shift+Tab');
                }
                await page.evaluate(() => new Promise<void>(resolve =>
                  requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
                const measurement = await tooltip.evaluate(element => {
                  const box = element.getBoundingClientRect();
                  const style = getComputedStyle(element);
                  const link = element.parentElement!.querySelector('a')!;
                  const trigger = link.getBoundingClientRect();
                  return {
                    left: box.left, right: box.right, top: box.top, bottom: box.bottom,
                    visible: box.width > 0 && box.height > 0 && style.display !== 'none' &&
                      style.visibility !== 'hidden' && Number(style.opacity) > 0,
                    activeIsSource: document.activeElement === link,
                    sourceHovered: link.matches(':hover'),
                    triggerTop: trigger.top,
                    triggerHit: link.contains(document.elementFromPoint(
                      trigger.left + trigger.width / 2, trigger.top + trigger.height / 2,
                    )),
                  };
                });
                const receivedInput = method === 'hover' ? measurement.sourceHovered : measurement.activeIsSource;
                const contained = measurement.visible && measurement.left >= 0 && measurement.right <= width &&
                  measurement.top >= 0 && measurement.bottom <= 900;
                observations.push({ identity, measurement, receivedInput, contained });
                if (!contained || !receivedInput || !measurement.triggerHit) failures.push(identity);
                if (occurrence === 0 && method === 'hover' &&
                    (position === 'reading' || position === 'upper-edge' && id === 'libero-2023')) {
                  await page.screenshot({ path: info.outputPath(`${id}-${position}.png`) });
                }
              }
            }
          }
        }
      }
      await info.attach('tooltip-identities', {
        body: JSON.stringify({ expected, observations, failures, errors }, null, 2),
        contentType: 'application/json',
      });
      expect(observations.map(o => o.identity)).toEqual(expected);
      expect(new Set(expected).size).toBe(expected.length);
      expect(errors).toEqual([]);
      // Deliberately enforcing: never expected-fail, skip, shrink the population,
      // or bless the inherited shared-Cite upper-edge failures as acceptance.
      expect(failures.length, `Uncontained/input-obscured identities: ${failures.join(', ')}`).toBe(0);
    });

    test('both actual choice groups retain all six independently operable options', async ({ page }, info) => {
      const groups = [
        { selector: '[data-predict]', component: 'PredictThenReveal',
          values: ['two-hundred', 'fifty', 'fourteen'] },
        { selector: '[data-self-check]', component: 'SelfCheck',
          values: ['b-signals', 'equal', 'b-more-efficient'] },
      ];
      const names = [];
      for (const group of groups) {
        expect([...manuscript.matchAll(new RegExp(`<${group.component}\\s`, 'g'))]).toHaveLength(1);
        const region = page.locator(group.selector);
        await expect(region).toHaveCount(1);
        const radios = region.getByRole('radio');
        await expect(radios).toHaveCount(group.values.length);
        expect(await radios.evaluateAll(elements => elements.map(e => (e as HTMLInputElement).value)))
          .toEqual(group.values);
        names.push(await radios.first().getAttribute('name'));
        await expect(region.locator('details[data-reveal]')).not.toHaveAttribute('open');
        for (const value of group.values) {
          const radio = region.locator(`input[type="radio"][value="${value}"]`);
          await radio.focus();
          await page.keyboard.press('Space');
          await expect(radio).toBeChecked();
          await expect(region.locator('input[type="radio"]:checked')).toHaveCount(1);
          await expect(region.locator(`[data-reason="${value}"]`)).toHaveAttribute('data-selected', 'true');
          await expect(region.locator('details[data-reveal]')).toHaveAttribute('open');
        }
        await page.screenshot({ path: info.outputPath(`${group.component}-selected.png`) });
      }
      expect(new Set(names).size).toBe(groups.length);
      await expect(page.getByRole('radio')).toHaveCount(groups.reduce((n, group) => n + group.values.length, 0));
      const calculator = page.locator('div.prose > div.rounded-md:has(svg[aria-label^="Line chart of episode success"]), div.prose > div.rounded-none:has(svg[aria-label^="Line chart of episode success"])');
      await setSlider(calculator.getByRole('slider', { name: /per-step success/i }), 0);
      await expect(calculator.getByTestId('episode-success-readout')).toHaveText('0.0%');
      await calculator.getByRole('button', { name: /reset/i }).click();
      await expect(calculator.getByTestId('episode-success-readout')).toHaveText('21.5%');
      const prediction = page.locator('[data-predict]');
      await expect(prediction.getByTestId('episode-success-readout')).toHaveText('48.8%');
    });

    test('References and glossary Back follow actual URLs without certifying focus restoration', async ({ page }, info) => {
      const history = [];
      for (const id of selected[0].ids) {
        const root = page.locator(`[data-cite-id="${id}"]`).first();
        const sourceURL = await root.locator('a').first().getAttribute('href');
        const beforeURL = page.url();
        await root.locator('a[href^="#ref-"]').focus();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new RegExp(`#ref-${id}$`));
        await expect(page.locator(`#ref-${id} [data-reference-source-link]`)).toHaveAttribute('href', sourceURL!);
        await page.goBack();
        await expect(page).toHaveURL(beforeURL);
        history.push({ id, beforeURL, afterURL: page.url(),
          activeTag: await page.evaluate(() => document.activeElement?.tagName) });
      }
      const term = page.locator('[data-term-id="system-identification"] a').first();
      const beforeURL = page.url();
      const target = new URL((await term.getAttribute('href'))!, beforeURL).href;
      await term.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(target);
      await expect(page.locator('[data-glossary-term="system-identification"]')).toBeVisible();
      await page.goBack();
      await expect(page).toHaveURL(beforeURL);
      history.push({ id: 'system-identification', beforeURL, afterURL: page.url(),
        activeTag: await page.evaluate(() => document.activeElement?.tagName) });
      await info.attach('navigation-history', {
        body: JSON.stringify({ history, focusRestorationAccepted: false }, null, 2),
        contentType: 'application/json',
      });
      // BODY on Back is inherited discovery/history debt, not a focus pass.
    });
  });
}
