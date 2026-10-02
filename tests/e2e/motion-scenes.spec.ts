import { expect, test, type Locator } from '@playwright/test';
import { auditSceneElement } from '@/lib/motion-scene-audit';
import { MOTION_STAGE_TYPE } from '@/lib/motion-tokens';
import { openAdjustMore } from './helpers/figure-fold';

/**
 * Motion-language scenes, end to end (VAL-MOTION-007..010, 012, 013).
 *
 * One spec per scene: every beat is stepped by keyboard from the top, the
 * caption under the stage names the beat the reader arrives at, the
 * scrubber's aria-valuetext is that caption, the text alternative is the
 * captions in order, and the reduced-motion path keeps the poster still
 * and steps between end-states.
 */

const SCENES = [
  {
    id: 'kalman-predict-update',
    route: '/classical/state-estimation/',
    title: /kalman filter/i,
    axes: ['position x', 'velocity v'],
    beats: [
      /prior belief/i,
      /predict/i,
      /measurement arrives/i,
      /update/i,
      /written out/i,
    ],
  },
  {
    id: 'diffusion-denoising',
    route: '/manipulation/diffusion-policy/',
    title: /diffusion policy/i,
    axes: ['a1', 'a2'],
    beats: [/demonstrations/i, /noising/i, /ten denoising steps/i, /recap/i],
  },
] as const;

/**
 * Click the poster into the player. The click only lands once hydration
 * has attached the activation handler, so a first click that races
 * hydration is retried once instead of failing the step. The mounted
 * player is recognized by its scrubber: the poster frame carries the same
 * chrome (caption, legend, readout) statically.
 */
async function activate(scope: Locator): Promise<Locator> {
  const poster = scope.getByTestId('motion-poster');
  await poster.click();
  const scrubber = scope.getByTestId('motion-scrubber');
  try {
    await expect(scrubber).toBeVisible({ timeout: 4_000 });
  } catch {
    await poster.click();
    await expect(scrubber).toBeVisible({ timeout: 10_000 });
  }
  return scope.getByTestId('motion-caption');
}

for (const scene of SCENES) {
  test.describe(`motion scene ${scene.id}`, () => {
    test('every beat and poster has clear geometry and legible controls at both widths', async ({ browser }) => {
      for (const width of [375, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: width === 375 ? 800 : 900 } });
        try {
          const page = await context.newPage();
          await page.goto(scene.route, { waitUntil: 'networkidle' });
          await page.evaluate(() => document.fonts.ready);
          const scope = page.locator(`[data-motion-scene="${scene.id}"]`);
          const assertAudit = async (beat: string) => {
            const result = await scope.evaluate(auditSceneElement);
            expect(result.textCount).toBeGreaterThan(3);
            expect(result.markCount).toBeGreaterThan(1);
            expect(result.intersections, `${scene.id} ${width} ${beat} intersections`).toEqual([]);
            expect(result.overflow, `${scene.id} ${width} ${beat} stage margin`).toEqual([]);
            expect(result.lowContrast, `${scene.id} ${width} ${beat} control contrast: ${JSON.stringify(result.contrast)}`).toEqual([]);
            expect(result.contrast.length).toBeGreaterThanOrEqual(4);
          };
          await assertAudit('poster');
          await activate(scope);
          await page.keyboard.press('k');
          await page.keyboard.press('Home');
          for (let index = 0; index < scene.beats.length; index += 1) {
            await page.keyboard.press('ArrowRight');
            await expect(scope.getByTestId('motion-beat-count')).toHaveText(`beat ${index + 1} / ${scene.beats.length}`);
            await assertAudit(`beat ${index + 1}`);
          }
        } finally {
          await context.close();
        }
      }
    });

    test('the audit detects planted overlap, overflow and low contrast', async ({ page }) => {
      await page.goto(scene.route, { waitUntil: 'networkidle' });
      const scope = page.locator(`[data-motion-scene="${scene.id}"]`);
      await activate(scope);
      await page.keyboard.press('k');
      await page.keyboard.press('End');
      const svg = scope.locator('[data-motion-stage] svg');
      await svg.evaluate((node) => {
        const label = node.querySelector('text');
        if (!label) throw new Error('expected an axis label');
        const overlapping = label.cloneNode(true) as SVGTextElement;
        overlapping.setAttribute('data-scene-label', 'planted-overlap');
        node.append(overlapping);
        const overflow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        overflow.setAttribute('cx', '1');
        overflow.setAttribute('cy', '1');
        overflow.setAttribute('r', '5');
        overflow.setAttribute('data-scene-mark', 'planted-overflow');
        node.append(overflow);
      });
      await scope.getByTestId('motion-play').evaluate((node) => {
        (node as HTMLElement).style.color = 'white';
        (node as HTMLElement).style.backgroundColor = 'white';
      });
      const planted = await scope.evaluate(auditSceneElement);
      expect(planted.intersections.some((item) => item.includes('planted-overlap'))).toBe(true);
      expect(planted.overflow.some((item) => item.includes('planted-overflow'))).toBe(true);
      expect(planted.lowContrast.some((item) => item.includes('Play'))).toBe(true);
    });

    test('equations and stage labels have the right typography', async ({ browser }) => {
      // 600 px is the width where the stretched viewBox used to paint
      // labels at about twice the UI size.
      for (const width of [375, 600, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        try {
          const page = await context.newPage();
          await page.goto(scene.route, { waitUntil: 'networkidle' });
          await page.evaluate(() => document.fonts.ready);
          const scope = page.locator(`[data-motion-scene="${scene.id}"]`);
          const svg = scope.locator('[data-motion-stage] svg');
          const roles = await svg.evaluate((node) => {
            const equation = node.querySelector('[data-scene-equation]');
            const role = (el: Element) => (['tick', 'axis', 'note', 'readout']
              .find((name) => el.hasAttribute(`data-scene-${name}`)) ?? 'label');
            return {
              math: equation?.querySelector('.katex .mord') !== null,
              mathml: equation?.querySelector('math annotation[encoding="application/x-tex"]') !== null,
              mathColor: equation ? getComputedStyle(equation.querySelector('.katex')!).color : '',
              text: [...node.querySelectorAll<SVGTextElement>('text')].map((el) => {
                const style = getComputedStyle(el);
                const matrix = el.getScreenCTM()!;
                return {
                  text: el.textContent ?? '',
                  role: role(el),
                  family: style.fontFamily,
                  painted: parseFloat(style.fontSize) * Math.hypot(matrix.a, matrix.b),
                };
              }),
            };
          });
          expect(roles.math).toBe(true);
          expect(roles.mathml).toBe(true);
          expect(roles.mathColor).toBe('rgb(255, 255, 255)');
          const of = (name: string) => roles.text.filter((item) => item.role === name);
          expect(of('label').length, `${width} object labels`).toBeGreaterThan(0);
          expect(of('axis').map((item) => item.text).sort(), `${width} axis names`).toEqual(scene.axes);
          expect(of('tick').length, `${width} ticks`).toBeGreaterThan(0);
          expect(of('tick').length, `${width} ticks stay sparse`).toBeLessThanOrEqual(6);
          const sizes = {
            label: MOTION_STAGE_TYPE.labelPx,
            axis: MOTION_STAGE_TYPE.axisPx,
            note: MOTION_STAGE_TYPE.axisPx,
            tick: MOTION_STAGE_TYPE.tickPx,
            readout: MOTION_STAGE_TYPE.readoutPx,
          } as Record<string, number>;
          for (const item of roles.text) {
            const name = `${width} ${item.role} ${item.text}`;
            expect(item.family, name).toContain(item.role === 'readout' ? 'IBM Plex Mono' : 'IBM Plex Sans');
            if (item.role !== 'readout') expect(item.family, name).not.toContain('Mono');
            expect(item.painted, name).toBeGreaterThanOrEqual(Math.max(sizes[item.role], MOTION_STAGE_TYPE.minPx));
            expect(item.painted, name).toBeLessThan(sizes[item.role] + 0.1);
          }
          const smallest = (name: string) => Math.min(...of(name).map((item) => item.painted));
          const largest = (name: string) => Math.max(...of(name).map((item) => item.painted));
          expect(largest('tick'), `${width} ticks under axis names`).toBeLessThan(smallest('axis'));
          expect(largest('tick'), `${width} ticks under object labels`).toBeLessThan(smallest('label'));
        } finally {
          await context.close();
        }
      }
    });

    test('poster never autoplays; the click steps every beat by keyboard with captions and aria', async ({
      page,
    }) => {
      await page.goto(scene.route, { waitUntil: 'networkidle' });
      const scope = page.locator(`[data-motion-scene="${scene.id}"]`);
      await expect(scope).toBeVisible();

      // The poster is the prerendered final beat inside the full
      // instrument chrome, with no live controls before the click.
      const poster = scope.getByTestId('motion-poster');
      await expect(poster).toBeVisible();
      await expect(poster).toHaveAccessibleName(
        new RegExp(`play the motion scene: ${scene.title.source}`, 'i'),
      );
      await expect(scope.getByTestId('motion-scrubber')).toHaveCount(0);
      await expect(scope.locator('[data-motion-stage] svg').first()).toBeVisible();
      // The poster caption is the final beat's caption: the still the
      // reader is looking at.
      await expect(scope.getByTestId('motion-caption')).toHaveText(
        scene.beats[scene.beats.length - 1],
      );

      // Zero layout shift on activation: the stage the reader is looking
      // at keeps its exact box (the frame grows only below it, where the
      // live scrubber appears). Pin the frame to the viewport top first,
      // so the activation click itself cannot scroll the page.
      await scope.evaluate((node) => node.scrollIntoView({ block: 'start' }));
      const stageBox = () =>
        scope.locator('[data-motion-stage] svg').first().boundingBox();
      const before = await stageBox();
      const caption = await activate(scope);
      const after = await stageBox();
      expect(after?.width).toBe(before?.width);
      expect(after?.x).toBe(before?.x);
      expect(after?.y).toBe(before?.y);

      // The activation click focused the play control, so the keyboard
      // contract works immediately: pause, return to the top, step.
      await page.keyboard.press('k');
      await page.keyboard.press('Home');
      await expect(caption).toHaveText(scene.beats[0]);
      await expect(scope.getByTestId('motion-beat-count')).toHaveText(
        `beat 1 / ${scene.beats.length}`,
      );
      // Each stepped end-state is captioned by the beat it completes: the
      // first step finishes beat 1, the second beat 2, and so on.
      for (let index = 0; index < scene.beats.length; index += 1) {
        await page.keyboard.press('ArrowRight');
        await expect(caption).toHaveText(scene.beats[index]);
        await expect(scope.getByTestId('motion-beat-count')).toHaveText(
          `beat ${index + 1} / ${scene.beats.length}`,
        );
      }
      // Step back walks the end-states the other way; End and Home land on
      // the summarizing still and the opening beat.
      await page.keyboard.press('ArrowLeft');
      await expect(caption).toHaveText(scene.beats[scene.beats.length - 2]);
      await page.keyboard.press('End');
      await expect(caption).toHaveText(scene.beats[scene.beats.length - 1]);
      await page.keyboard.press('Home');
      await expect(caption).toHaveText(scene.beats[0]);

      // The scrubber is a labelled slider whose valuetext is the caption.
      const scrubber = scope.getByTestId('motion-scrubber');
      await expect(scrubber).toHaveAttribute('aria-label', 'Scene timeline');
      await expect(scrubber).toHaveAttribute(
        'aria-valuetext',
        (await caption.textContent()) ?? '',
      );
      // Scrubbing moves the clock and the caption with it (a value on the
      // scrubber's 50 ms step grid).
      await scrubber.focus();
      await scrubber.fill('3500');
      await expect(caption).toHaveText(scene.beats[2]);

      // The captions together are the text alternative.
      const alternative = page.locator(
        `#${await scope.getAttribute('aria-describedby')}`,
      );
      await expect(alternative).toHaveClass(/sr-only/);
      for (const beat of scene.beats) {
        await expect(alternative).toContainText(beat);
      }
    });

    test('reduced motion: the poster stays still and stepping jumps end-states', async ({
      browser,
    }) => {
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(scene.route, { waitUntil: 'networkidle' });
      const scope = page.locator(`[data-motion-scene="${scene.id}"]`);
      const poster = scope.getByTestId('motion-poster');
      await expect(poster).toBeVisible();
      const caption = await activate(scope);

      // No autoplay under reduced motion: the poster beat holds.
      await expect(
        scope.getByRole('button', { name: /^play the scene$/i }),
      ).toBeVisible();
      await expect(caption).toHaveText(scene.beats[scene.beats.length - 1]);

      // Stepping jumps between beat end-states, no tweening.
      await openAdjustMore(scope);
      await scope
        .getByRole('button', { name: /step back one beat/i })
        .click();
      await expect(caption).toHaveText(scene.beats[scene.beats.length - 2]);
      // The scrubber still works.
      const scrubber = scope.getByTestId('motion-scrubber');
      await scrubber.focus();
      await scrubber.fill('0');
      await expect(caption).toHaveText(scene.beats[0]);
      await context.close();
    });
  });
}
