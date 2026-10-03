import { expect, test } from '@playwright/test';
import { auditSceneElement } from '@/lib/motion-scene-audit';
import { openAdjustMore } from './helpers/figure-fold';

const scenes = [
  {
    id: 'jam-overhead',
    route: '/data-hardware/industrial-deployment/',
    captions: [/quick 15-second fixes/i, /each fix now takes 5 minutes/i, /months to pay back/i, /rarely fails/i],
  },
] as const;

for (const { id, route, captions } of scenes) {
  test(`${id} has four audited keyboard beats at both widths`, async ({ browser }) => {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: width === 375 ? 800 : 900 } });
      try {
        const page = await context.newPage();
        await page.goto(route, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const scene = page.locator(`[data-motion-scene="${id}"]`);
        await expect(scene.getByTestId('motion-poster')).toBeVisible();
        await expect(scene.getByTestId('motion-scrubber')).toHaveCount(0);
        await expect(scene.getByTestId('motion-caption')).toHaveText(captions[3]);
        const audit = async (state: string) => {
          const result = await scene.evaluate(auditSceneElement);
          expect(result.intersections, `${id} ${width} ${state}: text/mark overlap`).toEqual([]);
          expect(result.overflow, `${id} ${width} ${state}: stage overflow`).toEqual([]);
          expect(result.lowContrast, `${id} ${width} ${state}: control contrast`).toEqual([]);
          expect(result.markCount).toBeGreaterThan(0);
        };
        await audit('poster');
        await scene.getByTestId('motion-poster').click();
        const scrubber = scene.getByTestId('motion-scrubber');
        await expect(scrubber).toBeVisible();
        await page.keyboard.press('k');
        await page.keyboard.press('Home');
        for (let index = 0; index < captions.length; index += 1) {
          await page.keyboard.press('ArrowRight');
          await expect(scene.getByTestId('motion-beat-count')).toHaveText(`beat ${index + 1} / 4`);
          await expect(scene.getByTestId('motion-caption')).toHaveText(captions[index]);
          await expect(scrubber).toHaveAttribute('aria-valuetext', captions[index]);
          await audit(`beat ${index + 1}`);
        }
        const alternative = page.locator(`#${await scene.getAttribute('aria-describedby')}`);
        for (const caption of captions) await expect(alternative).toContainText(caption);
      } finally {
        await context.close();
      }
    }
  });

  test(`${id} keeps reduced-motion control at beat end states`, async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.goto(route, { waitUntil: 'networkidle' });
      const scene = page.locator(`[data-motion-scene="${id}"]`);
      await scene.getByTestId('motion-poster').click();
      await expect(scene.getByTestId('motion-scrubber')).toBeVisible();
      await expect(scene.getByTestId('motion-caption')).toHaveText(captions[3]);
      await openAdjustMore(scene);
      await scene.getByRole('button', { name: /step back one beat/i }).click();
      await expect(scene.getByTestId('motion-caption')).toHaveText(captions[2]);
      await openAdjustMore(scene);
      await scene.getByRole('button', { name: /step forward one beat/i }).click();
      await expect(scene.getByTestId('motion-caption')).toHaveText(captions[3]);
      await scene.getByTestId('motion-scrubber').fill('0');
      await expect(scene.getByTestId('motion-caption')).toHaveText(captions[0]);
    } finally {
      await context.close();
    }
  });
}

test('paired data/hardware labs retain semantic roles under both schemes and changed controls', async ({ browser }) => {
  test.setTimeout(150_000);
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ colorScheme, viewport: { width, height: 900 } });
      try {
        const page = await context.newPage();
        // Figures paint on the page stage, which maps every role to its stage
        // colour, so a stage mark is compared with a probe inside it.
        const stageRole = (name: string, anchor: string) => page.evaluate(([value, selector]) => {
          const probe = document.createElement('span');
          probe.style.color = `var(--role-${value})`;
          document.querySelector(selector)!.closest('[data-figure-stage]')!.append(probe);
          const result = getComputedStyle(probe).color;
          probe.remove();
          return result;
        }, [name, anchor] as const);
        const style = (selector: string, property: string) =>
          page.locator(selector).first().evaluate((node, field) =>
            getComputedStyle(node).getPropertyValue(field), property);

        await page.goto('/data-hardware/industrial-deployment/', { waitUntil: 'networkidle' });
        const bar = '[data-testid="time-breakdown"]';
        const jam = `${bar} [data-breakdown-segment="Jam clearing"] pattern line`;
        expect(await style(`${bar} [data-breakdown-segment="Productive cycles"] rect`, 'fill')).toBe(await stageRole('value-graphic', bar));
        expect(await style(jam, 'stroke')).toBe(await stageRole('constraint-graphic', bar));
        // The hour legend names the bar's parts; only robot picking takes the value colour.
        expect(await style('[data-testid="hour-legend-productive"]', 'color')).toBe(await stageRole('value-text', bar));
        expect(await style('[data-testid="hour-legend-jams"]', 'color')).not.toBe(await stageRole('value-text', bar));
        await page.getByRole('slider', { name: /jam-clearing time/i }).fill('45');
        expect(await style(jam, 'stroke')).toBe(await stageRole('constraint-graphic', bar));
        await expect(page.getByTestId('breakdown-jams')).toContainText('jam clearing');

        await page.goto('/data-hardware/data-bottleneck/', { waitUntil: 'networkidle' });
        // The page's one data-scale chart is the reveal of its prediction step.
        await page.locator('[data-predict]:has([data-testid="projection-marker"]) details[data-reveal] > summary').click();
        const marker = '[data-testid="projection-marker"]';
        expect(await style(marker, 'fill')).toBe(await stageRole('value-graphic', marker));
        expect(await style(`${marker} + text`, 'fill')).toBe(await stageRole('value-text', marker));
        expect(await style('[data-figure-frame="data-scale-chart"] [data-legend-series="farm-projection"] svg circle', 'fill'))
          .toBe(await stageRole('value-graphic', marker));
        expect(await style('[data-testid="hours-readout"]', 'color')).toBe(await stageRole('value-text', marker));
        // Lime is kept for the stage note; the robot count reads as plain readout text.
        expect(await style('[data-testid="rigs-readout"]', 'color')).toBe(await style('[data-testid="projection-summary"]', 'color'));
        expect(await style('[data-figure-frame="data-scale-chart"] [data-figure-annotation] text', 'fill'))
          .toBe(await stageRole('highlight-graphic', marker));
        await page.getByRole('slider', { name: /teleoperation rigs/i }).fill('11');
        expect(await style(marker, 'fill')).toBe(await stageRole('value-graphic', marker));
        await expect(page.getByTestId('rigs-readout').first()).toHaveText('11');

        await page.goto('/data-hardware/evaluation-crisis/', { waitUntil: 'networkidle' });
        // The page's one calculator is the reveal of its prediction step.
        await page.locator('[data-predict]:has([data-testid="episode-success-readout"]) details[data-reveal] > summary').click();
        const lab = page.locator('[data-brand-module-signature="instrument-frame"]:has([data-testid="episode-success-readout"])').first();
        const trace = 'path[data-series="episode-success"]';
        expect(await lab.locator(trace).evaluate((node) => getComputedStyle(node).stroke))
          .toBe(await stageRole('value-graphic', trace));
        expect(await lab.getByTestId('episode-success-readout').evaluate((node) => getComputedStyle(node).color))
          .toBe(await stageRole('value-text', trace));
        await lab.getByRole('slider', { name: /per-step success probability/i }).fill('99');
        expect(await lab.locator(trace).evaluate((node) => getComputedStyle(node).stroke))
          .toBe(await stageRole('value-graphic', trace));
        await expect(lab.getByTestId('episode-success-readout')).not.toBeEmpty();
      } finally {
        await context.close();
      }
    }
  }
});
