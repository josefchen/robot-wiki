import type { BrowserContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPublicRouteExecutionPlan } from '../../lib/brand-v2-runners';
import {
  brandV2Registry,
  expect,
  test,
} from './brand-v2-static-fixture';
import { documentOverflow } from './helpers/document-overflow';
import { RELEASE_TEXT_ONLY_SELECTORS } from '../../lib/brand-v2-release-text';
import { readFocusPaint, settleFocusPaint } from './helpers/focus-paint';
import { focusPaintFailures } from '../../lib/brand-v2-focus-paint';

async function sweepContext(
  context: BrowserContext,
  staticBase: string,
  routes: string[],
  profileId: string,
  failures: string[],
  swept: string[],
): Promise<void> {
  const page = await context.newPage();
  try {
    for (const route of routes) {
      await page.goto(`${staticBase}${route}`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('main')).toBeVisible();
      const overflow = await documentOverflow(page);
      if (overflow > 0) failures.push(`${profileId}:${route}:${overflow}px`);
      swept.push(`${profileId}:${route}`);
    }
  } finally {
    await page.close();
  }
}

test.describe('brand-v2-reflow-320-200', () => {
  test('enforces route loading, zoom-equivalent, and text-only profiles for every route', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const routes = brandV2Registry.routes.public.map(({ path }) => path);
    const plan = buildPublicRouteExecutionPlan(brandV2Registry, routes);
    expect(plan.members.length).toBeGreaterThan(5);
    const failures: string[] = [];
    const swept: string[] = [];

    const reflow = await browser.newContext({
      viewport: { width: 320, height: 800 },
      deviceScaleFactor: 1,
    });
    await sweepContext(reflow, staticBase, routes, 'reflow-320', failures, swept);
    await reflow.close();

    const zoomEquivalent = await browser.newContext({
      viewport: { width: 720, height: 450 },
      deviceScaleFactor: 2,
    });
    await sweepContext(
      zoomEquivalent,
      staticBase,
      routes,
      'zoom-equivalent-200',
      failures,
      swept,
    );
    await zoomEquivalent.close();
    expect(swept).toEqual([
      ...routes.map((route) => `reflow-320:${route}`),
      ...routes.map((route) => `zoom-equivalent-200:${route}`),
    ]);

    const textOnly = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await textOnly.newPage();
    try {
      for (const route of routes) {
        await page.goto(`${staticBase}${route}`);
        await page.evaluate(() => document.fonts.ready);
        const sizes = await page.evaluate((selectors) => {
          const nodes = [
            ...document.querySelectorAll<HTMLElement>(
              selectors.join(','),
            ),
          ].filter((node) => node.getClientRects().length > 0);
          return nodes.map((node, index) => {
            node.dataset.brandV2TextProbe = String(index);
            return {
              index,
              baseline: Number.parseFloat(getComputedStyle(node).fontSize),
            };
          });
        },[...RELEASE_TEXT_ONLY_SELECTORS]);
        expect(sizes.length, `${route} text population`).toBeGreaterThan(0);
        await page.addStyleTag({
          content: sizes
            .map(
              ({ index, baseline }) =>
                `[data-brand-v2-text-probe="${index}"]{font-size:${baseline * 2}px!important}`,
            )
            .join('\n'),
        });
        const sizeFailures = await page.evaluate((expected) => {
          return expected.flatMap(({ index, baseline }) => {
            const node = document.querySelector<HTMLElement>(
              `[data-brand-v2-text-probe="${index}"]`,
            );
            const actual = node
              ? Number.parseFloat(getComputedStyle(node).fontSize)
              : Number.NaN;
            return Number.isFinite(actual) &&
              Math.abs(actual - baseline * 2) <= 0.5
              ? []
              : [`${index}:${baseline}px→${actual}px`];
          });
        }, sizes);
        failures.push(
          ...sizeFailures.map(
            (failure) => `text-only-200:${route}:${failure}`,
          ),
        );
        const overflow = await documentOverflow(page);
        if (overflow > 0) {
          failures.push(`text-only-200:${route}:${overflow}px`);
        }
      }
    } finally {
      await page.close();
      await textOnly.close();
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  // VAL-B2-EVID-011 no longer archives 320px drift: the sweep above enforces
  // zero overflow on every route, and no expected-red entry may reopen it.
  test('all public routes reach zero 320px overflow', () => {
    const archive = JSON.parse(
      readFileSync(
        join(process.cwd(), 'evidence', 'brand-v2', 'expected-red-v1.json'),
        'utf8',
      ),
    ) as { failures: Array<{ suite: string; assertionId: string }> };
    expect(
      archive.failures.filter(
        ({ suite, assertionId }) =>
          suite === 'brand-v2-reflow-320-200' || assertionId === 'VAL-B2-EVID-011',
      ),
    ).toEqual([]);
  });
});


function sliderRowReadings(frame: Element) {
  const box = (element: Element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
  };
  const frameBox = box(frame);
  return [...frame.querySelectorAll<HTMLElement>('[data-figure-control-row]')]
    .filter((row) => row.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
    .map((row) => {
      const input = row.querySelector<HTMLInputElement>('input[type="range"]')!;
      const value = row.querySelector<HTMLElement>('[data-figure-control-value]')!;
      const text = document.createRange();
      text.selectNodeContents(value);
      return {
        frame: frameBox, row: box(row), input: box(input), value: box(value),
        valueRects: [...text.getClientRects()].map((rect) => ({ left: rect.left, right: rect.right })),
        visible: input.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
        label: row.querySelector('label')?.textContent?.trim() ?? '',
        range: { min: input.min, max: input.max, step: input.step, value: input.value },
        readout: value.textContent?.trim() ?? '',
      };
    });
}

function sliderRowFits(reading: ReturnType<typeof sliderRowReadings>[number]) {
  const inside = (box: { left: number; right: number }) => box.left >= reading.row.left - 0.5 && box.right <= reading.row.right + 0.5;
  return reading.visible && reading.row.width > 0 && reading.input.height === 32 &&
    reading.row.left >= reading.frame.left - 0.5 && reading.row.right <= reading.frame.right + 0.5 &&
    reading.input.width >= Math.min(160, reading.row.width) - 0.5 &&
    inside(reading.input) && inside(reading.value) && reading.valueRects.every(inside);
}

test('registered SliderRows fit the required narrow zoom profile and reject restored fixed minimums', async ({ browser, staticBase }) => {
  test.setTimeout(180_000);
  const registry = JSON.parse(readFileSync(join(process.cwd(), 'contract/reader-first-registry.json'), 'utf8')) as {
    figures: Array<{ figure: string; route: string; sources: string[] }>;
  };
  const mounts = registry.figures.filter(({ sources }) => sources.some((source) =>
    source.startsWith('components/interactive/') && source.endsWith('.tsx') &&
    /<SliderRow[\s>]/.test(readFileSync(join(process.cwd(), source), 'utf8')),
  ));
  expect(mounts).toHaveLength(14);
  expect(new Set(mounts.map(({ figure, route }) => `${route}:${figure}`)).size).toBe(14);
  const context = await browser.newContext({ viewport: { width: 187, height: 406 }, deviceScaleFactor: 2 });
  let measuredInputs = 0;
  try {
    for (const mount of mounts) {
      const page = await context.newPage();
      try {
        const session = await context.newCDPSession(page);
        await session.send('Emulation.setDeviceMetricsOverride', { width: 187, height: 406, deviceScaleFactor: 2, mobile: false });
        await page.goto(`${staticBase}${mount.route}`);
        await page.evaluate(() => document.fonts.ready);
        const frame = page.locator(`[data-figure-frame="${mount.figure}"]`);
        await expect(frame).toBeVisible();
        await expect.poll(() => frame.evaluate((element) => Object.keys(element).some((key) => key.startsWith('__reactProps')))).toBe(true);
        const handle = (await frame.elementHandle())!;
        const timeOrigin = await page.evaluate(() => performance.timeOrigin);
        const binding = async () => {
          expect(await handle.evaluate((element, expectedOrigin) => element.isConnected &&
            element === document.querySelector(`[data-figure-frame="${element.getAttribute('data-figure-frame')}"]`) &&
            performance.timeOrigin === expectedOrigin, timeOrigin)).toBe(true);
          expect(await page.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio }))).toEqual({ width: 187, dpr: 2 });
        };
        const before = await frame.evaluate(sliderRowReadings);
        expect(before.length, mount.figure).toBeGreaterThan(0);
        expect(before.every(sliderRowFits), JSON.stringify({ mount: mount.figure, before })).toBe(true);
        for (const reading of before) {
          expect(reading.label).not.toBe('');
          expect(reading.readout).not.toBe('');
        }
        const inputs = frame.locator('[data-figure-control-row] input[type="range"]').filter({ visible: true });
        measuredInputs += await inputs.count();
        for (const input of await inputs.all()) {
          await input.focus();
          await page.keyboard.press('Shift+Tab');
          await expect(input).not.toBeFocused();
          await page.keyboard.press('Tab');
          await expect(input).toBeFocused();
          await settleFocusPaint(page);
          expect(focusPaintFailures(await input.evaluate(readFocusPaint), true)).toEqual([]);
          const initial = await input.inputValue();
          const forward = Number(initial) < Number(await input.getAttribute('max')) ? 'ArrowRight' : 'ArrowLeft';
          await page.keyboard.press(forward);
          expect(await input.inputValue()).not.toBe(initial);
          await page.keyboard.press(forward === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight');
          await expect(input).toHaveValue(initial);
        }
        const semanticValues = (readings: ReturnType<typeof sliderRowReadings>) => readings.map(({ range, readout, label }) => ({ range, readout, label }));
        expect(semanticValues(await frame.evaluate(sliderRowReadings))).toEqual(semanticValues(before));
        await binding();
        const mutant = await page.addStyleTag({ content: `[data-figure-frame="${mount.figure}"] [data-figure-control-row] > div, [data-figure-frame="${mount.figure}"] [data-figure-control-row] input[type="range"] { min-width:160px!important; }` });
        try {
          await settleFocusPaint(page);
          const broken = await frame.evaluate(sliderRowReadings);
          expect(broken.some((reading) => !sliderRowFits(reading)), mount.figure).toBe(true);
          expect(semanticValues(broken)).toEqual(semanticValues(before));
          await binding();
        } finally {
          await mutant.evaluate((element) => element.parentNode?.removeChild(element));
        }
        await settleFocusPaint(page);
        expect((await frame.evaluate(sliderRowReadings)).every(sliderRowFits), mount.figure).toBe(true);
        expect(semanticValues(await frame.evaluate(sliderRowReadings))).toEqual(semanticValues(before));
        await binding();
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
  }
  // KinematicTwin has two independently labelled sliders; every other mount has one.
  expect(measuredInputs).toBe(15);
});

function narrowFieldReading(field: Element) {
  const box = (element: Element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
  };
  const input = field.querySelector<HTMLInputElement>('input[type="range"]')!;
  const texts: Array<{ left: number; right: number }> = [];
  const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    texts.push(...[...range.getClientRects()].map((rect) => ({ left: rect.left, right: rect.right })));
  }
  return {
    frame: box(field.closest('[data-figure-frame]')!), field: box(field), input: box(input), texts,
    range: { min: input.min, max: input.max, step: input.step, value: input.value },
    text: field.textContent, readout: field.querySelector('[data-figure-control-value]')?.textContent,
  };
}

function narrowFieldFits(reading: ReturnType<typeof narrowFieldReading>) {
  const inside = (rect: { left: number; right: number }) => rect.left >= reading.field.left - 0.5 && rect.right <= reading.field.right + 0.5;
  return reading.field.left >= reading.frame.left && reading.field.right <= reading.frame.right &&
    reading.input.height === 32 && reading.input.width >= Math.min(160, reading.field.width) - 0.5 &&
    inside(reading.input) && reading.texts.every(inside);
}

function narrowStatReading(stat: Element) {
  const box = (element: Element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: rect.width };
  };
  const value = stat.children[0];
  const text = value.firstChild!;
  const words = [...(value.textContent ?? '').matchAll(/\S+/g)].map((match) => {
    const range = document.createRange();
    range.setStart(text, match.index ?? 0);
    range.setEnd(text, (match.index ?? 0) + match[0].length);
    return { word: match[0], rects: [...range.getClientRects()].map((rect) => ({ left: rect.left, right: rect.right })) };
  });
  return {
    strip: box(stat.parentElement!), stat: box(stat), words,
    fontSize: getComputedStyle(value).fontSize,
    content: { value: value.textContent, label: stat.children[1]?.textContent, note: stat.children[2]?.textContent },
  };
}

function narrowStatFits(reading: ReturnType<typeof narrowStatReading>) {
  return Math.abs(reading.stat.left - reading.strip.left) <= 0.5 &&
    Math.abs(reading.stat.right - reading.strip.right) <= 0.5 && reading.fontSize === '24px' &&
    reading.words.every(({ rects }) => rects.length === 1 && rects.every((rect) =>
      rect.left >= reading.stat.left - 0.5 && rect.right <= reading.stat.right + 0.5));
}

test('narrow zoom keeps the four residual routes readable and rejects field-floor and stat-column regressions', async ({ browser, staticBase }) => {
  test.setTimeout(120_000);
  const cases = [
    { route: '/classical/scene-representation/', figure: 'scene-representation-ladder', input: '[data-testid="scene-resolution-slider"]', range: { min: '0', max: '3', step: '1', value: '1' } },
    { route: '/frontier/safety-and-assurance/', figure: 'collaborative-operation-modes', input: '#safety-robot-speed', range: { min: '0', max: '2', step: '0.05', value: '1' } },
    { route: '/rl-sim2real/humanoid-wbc/', figure: 'wbc-decomposition', stat: { value: '200,000+', label: 'S0 training fleet', note: 'parallel sim environments' } },
    { route: '/data-hardware/teleop-rigs/', figure: 'kinematic-twin', stat: { value: 'not disclosed', label: 'workstation USD total', note: "the ACT paper's $18k ALOHA build cost is not a vendor quote" } },
  ];
  const context = await browser.newContext({ viewport: { width: 187, height: 406 }, deviceScaleFactor: 2 });
  await context.addInitScript(() => {
    Reflect.set(window, '__residualTestDocument', crypto.randomUUID());
  });
  try {
    for (const entry of cases) {
      const page = await context.newPage();
      try {
        const session = await context.newCDPSession(page);
        await session.send('Emulation.setDeviceMetricsOverride', { width: 187, height: 406, deviceScaleFactor: 2, mobile: false });
        await page.goto(`${staticBase}${entry.route}`);
        await page.evaluate(() => document.fonts.ready);
        const frame = page.locator(`[data-figure-frame="${entry.figure}"]`);
        await expect(frame).toBeVisible();
        await expect.poll(() => frame.evaluate((element) => Object.keys(element).some((key) => key.startsWith('__reactProps')))).toBe(true);
        const handle = (await frame.elementHandle())!;
        const identity = await page.evaluate(() => ({
          uuid: Reflect.get(window, '__residualTestDocument'),
          timeOrigin: performance.timeOrigin,
        }));
        expect(identity.uuid).toMatch(/^[0-9a-f-]{36}$/);
        const binding = async () => {
          expect(await handle.evaluate((element, expected) => element.isConnected &&
            element === document.querySelector(`[data-figure-frame="${element.getAttribute('data-figure-frame')}"]`) &&
            performance.timeOrigin === expected.timeOrigin &&
            Reflect.get(window, '__residualTestDocument') === expected.uuid, identity)).toBe(true);
          expect(await page.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio }))).toEqual({ width: 187, dpr: 2 });
        };
        expect(await documentOverflow(page), entry.route).toBe(0);
        if (entry.input) {
          const input = frame.locator(entry.input);
          const field = input.locator('xpath=ancestor::*[@data-figure-control-field]');
          const before = await field.evaluate(narrowFieldReading);
          expect(before.range).toEqual(entry.range);
          expect(narrowFieldFits(before), JSON.stringify(before)).toBe(true);
          await input.focus();
          await page.keyboard.press('Shift+Tab');
          await expect(input).not.toBeFocused();
          await page.keyboard.press('Tab');
          await expect(input).toBeFocused();
          await settleFocusPaint(page);
          expect(focusPaintFailures(await input.evaluate(readFocusPaint), true)).toEqual([]);
          await page.keyboard.press('ArrowRight');
          expect(await input.inputValue()).not.toBe(before.range.value);
          await page.keyboard.press('ArrowLeft');
          const restored = await field.evaluate(narrowFieldReading);
          expect(restored.range).toEqual(before.range);
          expect(restored.text).toBe(before.text);
          const mutant = await page.addStyleTag({ content: `[data-figure-frame="${entry.figure}"] [data-figure-control-field] { min-width:176px!important; } [data-figure-frame="${entry.figure}"] [data-figure-control-field] input[type="range"] { min-width:160px!important; }` });
          try {
            await settleFocusPaint(page);
            const broken = await field.evaluate(narrowFieldReading);
            expect(narrowFieldFits(broken)).toBe(false);
            expect(await documentOverflow(page)).toBeGreaterThan(0);
            expect(broken.range).toEqual(before.range);
            expect(broken.text).toBe(before.text);
            await binding();
          } finally {
            await mutant.evaluate((element) => element.parentNode?.removeChild(element));
          }
          await settleFocusPaint(page);
          expect(narrowFieldFits(await field.evaluate(narrowFieldReading))).toBe(true);
        } else {
          const stat = page.locator('[data-stat]').filter({ has: page.getByText(entry.stat!.value, { exact: true }) });
          await expect(stat).toHaveCount(1);
          const before = await stat.evaluate(narrowStatReading);
          expect(before.content).toEqual(entry.stat);
          expect(narrowStatFits(before), JSON.stringify(before)).toBe(true);
          const allContent = await page.locator('[data-stat]').evaluateAll((stats) => stats.map((element) => element.textContent));
          const mutant = await page.addStyleTag({ content: '[data-stat] { grid-column:auto!important; } [data-stat] > :first-child { overflow-wrap:normal!important; }' });
          try {
            await settleFocusPaint(page);
            const broken = await stat.evaluate(narrowStatReading);
            expect(narrowStatFits(broken)).toBe(false);
            expect(await documentOverflow(page)).toBeGreaterThan(0);
            expect(broken.content).toEqual(before.content);
            await binding();
          } finally {
            await mutant.evaluate((element) => element.parentNode?.removeChild(element));
          }
          await settleFocusPaint(page);
          expect(narrowStatFits(await stat.evaluate(narrowStatReading))).toBe(true);
          expect(await page.locator('[data-stat]').evaluateAll((stats) => stats.map((element) => element.textContent))).toEqual(allContent);
        }
        expect(await documentOverflow(page), entry.route).toBe(0);
        await binding();
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
  }
});
