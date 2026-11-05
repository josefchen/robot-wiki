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

// The historical seven-selector route sweep above is unchanged. These
// comparisons also contain definition rows and explicitly sized text leaves;
// resize those HTML labels together, including visible operator glyphs.
test('figure comparison labels reflow at twice their original text size', async ({ browser, staticBase }, testInfo) => {
  test.setTimeout(180_000);
  const figures = [
    { route: '/manipulation/pi-line/', figure: 'pi-generation-timeline', definitions: 2 },
    { route: '/classical/scene-representation/', figure: 'scene-representation-ladder' },
    { route: '/frontier/safety-and-assurance/', figure: 'safety-filter-fence' },
    { route: '/manipulation/action-spaces/', figure: 'impedance-press' },
    { route: '/manipulation/comparison-matrix/', figure: 'chunk-buffer' },
    { route: '/frontier/safety-and-assurance/', figure: 'safety-rules-timeline', definitions: 3 },
    { route: '/adjacent/autonomous-vehicles/', figure: 'av-safety-miles', definitions: 2 },
    { route: '/world-models/world-models-vs-simulators/', figure: 'world-model-output-times' },
  ];
  for (const width of [1440, 375]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    try {
      for (const entry of figures) {
        const page = await context.newPage();
        try {
          await page.goto(`${staticBase}${entry.route}`);
          await page.evaluate(() => document.fonts.ready);
          const frame = page.locator(`[data-figure-frame="${entry.figure}"]`);
          await expect(frame).toBeVisible();
          await expect.poll(() => frame.evaluate((element) => Object.keys(element).some((key) => key.startsWith('__reactProps')))).toBe(true);
          const handle = (await frame.elementHandle())!;
          const timeOrigin = await page.evaluate(() => performance.timeOrigin);
          // R23 keeps the complete original analogy in the existing method fold.
          // Open it natively so its previous text population remains measured.
          if (entry.figure === 'impedance-press') {
            const method = frame.locator('details[data-figure-fold="method"]');
            const summary = method.locator(':scope > summary');
            await expect(method).toHaveJSProperty('open', false);
            await expect(summary).toHaveText('How this was made');
            await summary.focus(); await summary.press('Enter');
            await expect(method).toHaveJSProperty('open', true);
            await expect(frame.getByTestId('press-drawing')).toBeVisible();
            await expect(frame.getByTestId('press-gap-key')).toBeVisible();
          }
          const sizes = await frame.evaluate((element, selectors) => {
            const hasScreenReaderOnlyAncestor = (node: HTMLElement) => {
              for (let current: HTMLElement | null = node; current; current = current.parentElement) {
                const style = getComputedStyle(current);
                const box = current.getBoundingClientRect();
                if (style.clipPath === 'inset(50%)' && box.width <= 1 && box.height <= 1) return true;
                if (current === element) break;
              }
              return false;
            };
            return [...element.querySelectorAll<HTMLElement>('*')]
              .filter((node) => node instanceof HTMLElement &&
                !node.closest('.sr-only,[hidden]') &&
                !hasScreenReaderOnlyAncestor(node) &&
                node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
                (node.matches([...selectors, 'dt', 'dd'].join(',')) || [...node.childNodes].some((child) =>
                  child.nodeType === Node.TEXT_NODE && child.textContent?.trim())))
              .map((node, index) => {
                node.dataset.comparisonTextProbe = String(index);
                return {
                  index, baseline: Number.parseFloat(getComputedStyle(node).fontSize), tag: node.localName,
                  definitionText: Boolean(node.closest('dt')) && [...node.childNodes].some((child) =>
                    child.nodeType === Node.TEXT_NODE && child.textContent?.trim()),
                };
              });
          }, [...RELEASE_TEXT_ONLY_SELECTORS]);
          expect(sizes.length, `${entry.figure}:${width} visible HTML text`).toBeGreaterThan(0);
          if (entry.definitions !== undefined) {
            expect(sizes.filter(({ tag }) => tag === 'dt'), `${entry.figure} definition terms`).toHaveLength(entry.definitions);
            expect(sizes.filter(({ tag }) => tag === 'dd'), `${entry.figure} definition values`).toHaveLength(entry.definitions);
          }
          // Snapshot every baseline before setting any size, so nested labels
          // reach 200% rather than inheriting repeated multiplication.
          await page.addStyleTag({ content: sizes.map(({ index, baseline }) =>
            `[data-comparison-text-probe="${index}"]{font-size:${baseline * 2}px!important}`).join('\n') });
          await settleFocusPaint(page);
          const readings = async () => frame.evaluate((element, expected) => {
            const bounds = element.getBoundingClientRect();
            return expected.map(({ index, baseline, tag }) => {
              const node = element.querySelector<HTMLElement>(`[data-comparison-text-probe="${index}"]`)!;
              const rects = [...node.childNodes].filter((child) =>
                child.nodeType === Node.TEXT_NODE && child.textContent?.trim()).flatMap((child) => {
                const range = document.createRange();
                range.selectNodeContents(child);
                return [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0).map((rect) => ({
                  left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
                }));
              });
              return {
                index, tag, baseline, actual: Number.parseFloat(getComputedStyle(node).fontSize),
                visible: node.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
                text: node.textContent?.trim(), rects,
                fits: rects.every((rect) => rect.left >= bounds.left - 0.5 && rect.right <= bounds.right + 0.5 &&
                  rect.top >= bounds.top - 0.5 && rect.bottom <= bounds.bottom + 0.5),
              };
            });
          }, sizes);
          const sizeFailures = (rows: Awaited<ReturnType<typeof readings>>) => rows.filter(({ actual, baseline }) =>
            !Number.isFinite(actual) || Math.abs(actual - baseline * 2) > 0.5);
          const resized = await readings();
          const screenshot = testInfo.outputPath(`${entry.figure}-${width}-text-200.png`);
          await frame.screenshot({
            path: screenshot, animations: 'disabled',
            // As in the reader captures, suppress only fixed page chrome
            // while photographing the frame; layout assertions run unaltered.
            style: 'header.sticky, .skip-link { visibility: hidden !important; }',
          });
          await testInfo.attach(`${entry.figure}-${width}-text-200`, { path: screenshot, contentType: 'image/png' });
          expect.soft(sizeFailures(resized), `${entry.figure}:${width} resized labels`).toEqual([]);
          expect.soft(resized.filter(({ visible, fits }) => !visible || !fits), `${entry.figure}:${width} text stays inside its frame`).toEqual([]);
          expect.soft(await documentOverflow(page), `${entry.figure}:${width} document overflow`).toBe(0);

          // An actual missed definition term must fail the same size predicate.
          if (entry.definitions !== undefined) {
            const term = sizes.find(({ definitionText }) => definitionText)!;
            expect(term, `${entry.figure} visible definition text`).toBeDefined();
            const mutant = await page.addStyleTag({ content:
              `[data-comparison-text-probe="${term.index}"]{font-size:${term.baseline}px!important}` });
            try {
              const failed = sizeFailures(await readings());
              expect(failed.map(({ index }) => index)).toEqual([term.index]);
              expect(failed[0].actual).toBe(term.baseline);
            } finally {
              await mutant.evaluate((element) => element.parentNode?.removeChild(element));
            }
            await settleFocusPaint(page);
            expect(sizeFailures(await readings())).toEqual([]);
          }
          expect(await handle.evaluate((element, origin) => element.isConnected &&
            element === document.querySelector(`[data-figure-frame="${element.getAttribute('data-figure-frame')}"]`) &&
            performance.timeOrigin === origin, timeOrigin)).toBe(true);
          expect(await page.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio }))).toEqual({ width, dpr: 1 });
        } finally {
          await page.close();
        }
      }
    } finally {
      await context.close();
    }
  }
});


// The guide is HTML above an unchanged SVG. A nonzero SVG rectangle alone
// cannot detect an opaque overlay or an untraceable white-on-white leader.
test('press gap guide preserves measured endpoints and forced-colour visibility', async ({ browser, staticBase }, testInfo) => {
  test.setTimeout(180_000);
  const observations: unknown[] = [];
  const modes = [
    { id: 'normal', forcedColors: 'none', colorScheme: 'light' },
    { id: 'forced-light', forcedColors: 'active', colorScheme: 'light' },
    { id: 'forced-dark', forcedColors: 'active', colorScheme: 'dark' },
  ] as const;
  try {
    for (const width of [1280, 375]) for (const mode of modes) {
      const context = await browser.newContext({
        viewport: { width, height: width === 375 ? 812 : 900 },
        forcedColors: mode.forcedColors, colorScheme: mode.colorScheme, reducedMotion: 'reduce',
      });
      try {
        const page = await context.newPage();
        await page.goto(`${staticBase}/manipulation/action-spaces/`);
        await page.evaluate(() => document.fonts.ready);
        const frame = page.locator('[data-figure-frame="impedance-press"]');
        await expect(frame.getByTestId('press-gap-guide')).toBeAttached();
        await expect.poll(() => frame.evaluate(el => Object.keys(el).some(key => key.startsWith('__reactFiber$')))).toBe(true);
        const original = await frame.elementHandle();
        const timeOrigin = await page.evaluate(() => performance.timeOrigin);
        // Measure the retained original scene only after its native disclosure opens.
        const method = frame.locator('details[data-figure-fold="method"]');
        const summary = method.locator(':scope > summary');
        await expect(method).toHaveJSProperty('open', false);
        await expect(summary).toHaveText('How this was made');
        await summary.focus(); await summary.press('Enter');
        await expect(method).toHaveJSProperty('open', true);
        await expect(frame.getByTestId('press-drawing')).toBeVisible();
        await expect(frame.getByTestId('press-gap-guide')).toBeVisible();
        const probe = (target: number) => frame.evaluate((el, requested) => {
          const required = <T extends Element>(selector: string) => {
            const node = el.querySelector<T>(selector);
            if (!node) throw new Error(`Missing measured guide member: ${selector}`);
            return node;
          };
          const svg = required<SVGSVGElement>('[data-testid="press-drawing"] svg');
          const guide = required<HTMLElement>('[data-testid="press-gap-guide"]');
          const tool = required<HTMLElement>('[data-testid="press-gap-tool-line"]');
          const targetLine = el.querySelector<HTMLElement>('[data-testid="press-gap-target-line"]');
          const bracket = required<HTMLElement>('[data-testid="press-gap-bracket"]');
          const stage = required<HTMLElement>('[data-figure-stage]');
          const errors: string[] = [];
          const close = (name: string, actual: number, expected: number, tolerance = 0.15) => {
            if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) errors.push(name);
          };
          // Independently pinned from the original camera, pan and ruler; never
          // derive expected positions from the new guide helper or its attributes.
          const x = 362.8953269648107;
          const toolY = 388.50778791731744 + Math.min(requested, 0) * 17.23930896091765;
          const targetY = 388.50778791731744 + requested * 17.23930896091765;
          const gap = Math.max(requested, 0);
          const sb = svg.getBoundingClientRect(), gb = guide.getBoundingClientRect();
          const tb = tool.getBoundingClientRect(), ab = targetLine?.getBoundingClientRect(), bb = bracket.getBoundingClientRect();
          if (svg.getAttribute('viewBox') !== '0 0 600 666') errors.push('original viewBox');
          for (const key of ['left', 'top', 'width', 'height'] as const) close(`overlay ${key}`, gb[key], sb[key]);
          close('tool x', tb.left, sb.left + x / 600 * sb.width);
          close('tool y', tb.top, sb.top + toolY / 666 * sb.height);
          close('bracket x', bb.left, sb.left + 0.94 * sb.width);
          close('bracket y', bb.top, sb.top + toolY / 666 * sb.height);
          close('bracket span', bb.height, (targetY - toolY) / 666 * sb.height);
          close('requested pose', Number(guide.dataset.guideTarget), requested, 1e-9);
          close('marked gap', Number(guide.dataset.gap), gap, 1e-9);
          const gs = getComputedStyle(guide), toolStyle = getComputedStyle(tool);
          if (gs.backgroundImage !== 'none' || (gs.backgroundColor !== 'transparent' && !/^rgba\([^)]*,\s*0\)$/.test(gs.backgroundColor))) errors.push('opaque overlay');
          if (gs.pointerEvents !== 'none' || guide.getAttribute('aria-hidden') !== 'true') errors.push('overlay interaction');
          if (toolStyle.borderTopStyle !== 'solid') errors.push('tool identity');
          if (gap > 0) {
            if (!targetLine || !ab) errors.push('missing target level');
            else {
              close('target x', ab.left, sb.left + x / 600 * sb.width);
              close('target y', ab.top, sb.top + targetY / 666 * sb.height);
              if (getComputedStyle(targetLine).borderTopStyle !== 'dashed') errors.push('target identity');
            }
          } else if (targetLine || bb.height !== 0) errors.push('nonzero collapsed gap');
          const forced = matchMedia('(forced-colors: active)').matches;
          const canvas = getComputedStyle(stage).backgroundColor;
          const paint = [tool, ...(targetLine ? [targetLine] : []), bracket].map(mark => {
            const css = getComputedStyle(mark);
            const id = mark.dataset.testid!;
            if (forced) {
              if (mark === bracket && gap === 0) {
                if (parseFloat(css.outlineWidth) > 0 && css.outlineStyle !== 'none') errors.push('painted zero bracket');
              } else if (css.outlineWidth !== '1px' || css.outlineStyle !== 'solid' || css.outlineColor !== canvas) errors.push(`clearing edge:${id}`);
            }
            return { id, outline: css.outline, border: css.borderTop, color: css.color };
          });
          return { requested, gap, errors, forced, canvas, paint, background: gs.backgroundColor, svg: sb.toJSON(), overlay: gb.toJSON(), tool: tb.toJSON(), target: ab?.toJSON(), bracket: bb.toJSON() };
        }, target);
        // The existing reduced-motion rule keeps a 0.01ms CSS transition.
        // A committed React attribute can precede its painted style by a frame.
        const settlePaint = () => page.evaluate(() => new Promise<void>(resolve => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }));
        const slider = frame.getByRole('slider', { name: 'Target', exact: true });
        for (const target of [-2, 0, 0.5, 3, 2]) {
          await slider.focus(); await slider.press('Home');
          for (let step = 0; step < (target + 2) / 0.5; step++) await slider.press('ArrowRight');
          await expect(slider).toHaveValue(String(target));
          await expect(frame.getByTestId('press-gap-guide')).toHaveAttribute('data-guide-target', String(target));
          await settlePaint();
          const result = await probe(target);
          observations.push({ width, mode: mode.id, kind: 'native', ...result });
          expect(result.errors, `${mode.id}/${width}/${target}`).toEqual([]);
          if (target < 0) await expect(frame.getByTestId('press-gap-key')).not.toContainText(/stopped/i);
        }
        const guide = frame.getByTestId('press-gap-guide'), tool = frame.getByTestId('press-gap-tool-line');
        for (const mutation of ['opaque', 'shifted', ...(mode.forcedColors === 'active' ? ['uncleared'] : [])]) {
          const node = mutation === 'opaque' ? guide : tool;
          const originalStyle = await node.getAttribute('style');
          try {
            await node.evaluate((element, kind) => {
              element.style.setProperty(kind === 'opaque' ? 'background-color' : kind === 'shifted' ? 'top' : 'outline-style', kind === 'opaque' ? 'Canvas' : kind === 'shifted' ? '0px' : 'none', 'important');
            }, mutation);
            await settlePaint();
            const result = await probe(2);
            observations.push({ width, mode: mode.id, kind: 'negative witness', mutation, ...result });
            expect(result.errors).toContain(mutation === 'opaque' ? 'opaque overlay' : mutation === 'shifted' ? 'tool y' : 'clearing edge:press-gap-tool-line');
          } finally {
            await node.evaluate((element, style) => style === null ? element.removeAttribute('style') : element.setAttribute('style', style), originalStyle);
          }
          await settlePaint();
          expect((await probe(2)).errors, 'exact native recovery after the DOM mutant').toEqual([]);
        }
        expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
        expect(await original!.evaluate(el => el.isConnected && el === document.querySelector('[data-figure-frame="impedance-press"]'))).toBe(true);
        if (mode.id === 'forced-dark') {
          const path = testInfo.outputPath(`press-guide-${width}-forced-dark.png`);
          await frame.screenshot({ path, animations: 'disabled', style: 'header.sticky,.skip-link{visibility:hidden!important}' });
          await testInfo.attach(`press-guide-${width}-forced-dark`, { path, contentType: 'image/png' });
        }
      } finally { await context.close(); }
    }
    expect(observations.filter(row => (row as { kind: string }).kind === 'native')).toHaveLength(30);
    expect(observations.filter(row => (row as { kind: string }).kind === 'negative witness')).toHaveLength(16);
  } finally {
    await testInfo.attach('press-gap-source-and-paint-observations', { body: Buffer.from(JSON.stringify(observations, null, 2)), contentType: 'application/json' });
  }
});


// The settled maximum has only two digits. Native Run also exposes 10.4–11.6:
// canonical text resizing doubles its p glyphs without doubling parent ch tracks.
test('press fractional equation stays readable during native Run at narrow text and zoom profiles', async ({ browser, staticBase }, testInfo) => {
  test.setTimeout(120_000);
  const { captureTextPopulation } = await import('./helpers/release-text-profile');
  const { installReleaseActivityObserver, takeReleaseActivity } = await import('./helpers/release-activity');
  const sourcePaths = [
    'components/interactive/impedance-press.tsx',
    'lib/impedance-press.ts',
    'components/iso/figures/spring-press.ts',
    'components/iso/iso-kit.ts',
    'components/iso/iso.css',
    'lib/brand-v2-release-text.ts',
    'tests/e2e/helpers/release-text-profile.ts',
  ];
  const sources = sourcePaths.map((path) => ({ path, bytes: readFileSync(join(process.cwd(), path)) }));
  const observations: unknown[] = [];
  const profiles = [
    { id: 'canonical-text-200-375', width: 375, height: 812, dpr: 1, textScale: 2 },
    { id: 'zoom-equivalent-200-187', width: 187, height: 406, dpr: 2, textScale: 1 },
  ];
  try {
    for (const profile of profiles) {
      const context = await browser.newContext({
        viewport: { width: profile.width, height: profile.height },
        deviceScaleFactor: profile.dpr, reducedMotion: 'no-preference',
      });
      try {
        await context.addInitScript(installReleaseActivityObserver);
        const page = await context.newPage();
        await page.goto(`${staticBase}/manipulation/action-spaces/`);
        await page.evaluate(() => document.fonts.ready);
        const frame = page.locator('[data-figure-frame="impedance-press"]');
        await expect(frame).toBeVisible();
        await expect.poll(() => frame.evaluate((element) => Object.keys(element).some((key) => key.startsWith('__reactFiber$')))).toBe(true);
        const original = (await frame.elementHandle())!;
        const timeOrigin = await page.evaluate(() => performance.timeOrigin);
        await expect(frame.locator('details[data-figure-fold="method"]')).toHaveJSProperty('open', false);
        await expect(frame.getByTestId('press-drawing')).toBeHidden();
        await expect(frame.getByTestId('press-position-diagram')).toBeVisible();
        await expect(frame.getByTestId('press-equation')).toBeVisible();
        await expect(frame.getByTestId('press-value-descriptions')).toBeVisible();
        const parentFont = await frame.getByTestId('press-equation').evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
        // The canonical census is deliberately unchanged: expanding it to divs
        // would grow the old ch tracks and conceal this particular failure.
        const census = await page.evaluate(captureTextPopulation, [...RELEASE_TEXT_ONLY_SELECTORS]);
        if (profile.textScale === 2) {
          await page.addStyleTag({ content: census.map(({ baselinePx }, index) =>
            `[data-release-text-probe="${index}"]{font-size:${baselinePx * 2}px!important}`).join('\n') });
        }
        const stiff = frame.getByRole('button', { name: 'Stiff', exact: true });
        const run = frame.getByTestId('press-run');
        await stiff.focus();
        await stiff.press('Enter');
        await expect(stiff).toHaveAttribute('aria-pressed', 'true');
        await expect(run).toHaveText('Run the press');

        // Observe real animation frames from before Enter through completion.
        // The first four-character fractional push is sampled, including failures;
        // neither layout success nor a separately timed screenshot selects it.
        const sampling = original.evaluate((element, input) => {
          const required = <T extends HTMLElement>(selector: string) => {
            const node = element.querySelector<T>(selector);
            if (!node) throw new Error(`Missing fractional press member: ${selector}`);
            return node;
          };
          const byId = (id: string) => required<HTMLElement>(`[data-testid="${id}"]`);
          const calculation = byId('press-calculation'), equation = byId('press-equation');
          const descriptions = byId('press-value-descriptions'), drawing = byId('press-drawing');
          const guide = byId('press-gap-guide'), button = byId('press-run');
          const position = byId('press-position-diagram'), marks = byId('press-position-marks'), positionLabels = byId('press-position-labels');
          const actionPacket = byId('press-action-packet'), chosenLabel = byId('press-chosen-settings');
          const contactProduct = byId('press-contact-product'), condition = byId('press-position-condition');
          const chosenReadout = byId('press-target'), shownReadout = byId('press-shown-target');
          const method = required<HTMLDetailsElement>('details[data-figure-fold="method"]');
          const nativeSlider = required<HTMLInputElement>('input[type="range"]');
          const kinds = ['stiffness', 'multiply', 'gap', 'equals', 'push'];
          const leaves = [...equation.querySelectorAll<HTMLElement>('[data-operation-value],[data-operation-symbol]')];
          const nativeDocument = element.ownerDocument;
          const originalNodes = [calculation, equation, descriptions, drawing, guide, button, ...leaves];
          originalNodes.push(position, marks, positionLabels, actionPacket, chosenLabel, chosenReadout, shownReadout);
          originalNodes.push(contactProduct, condition, ...['press-stiffness-product-row', 'press-gap-product-row', 'press-push-product-row',
            'press-gap-product-operator', 'press-push-product-operator', 'press-stiffness-description', 'press-gap-description', 'press-push-description'].map(byId));
          originalNodes.push(...['press-primary-takeaway', 'press-action-clause', 'press-contact-clause', 'press-general-rule', 'press-send-path', 'press-send-connector', 'press-sent-rule', 'press-product-rule', 'press-gap-output-connector', 'press-result-with-dial', 'press-ruler', 'press-push-dial', 'press-dial-needle'].map(byId));
          originalNodes.push(...element.querySelectorAll<HTMLElement>('[data-action-value]'), ...element.querySelectorAll<HTMLElement>('[data-dial-mark],[data-dial-label],[data-ruler-mark]'));
          const originalSelectors = originalNodes.map((node) => node.dataset.testid
            ? `[data-testid="${node.dataset.testid}"]`
            : node.dataset.actionValue ? `[data-action-value="${node.dataset.actionValue}"]`
              : node.dataset.dialMark !== undefined ? `[data-dial-mark="${node.dataset.dialMark}"]`
                : node.dataset.dialLabel !== undefined ? `[data-dial-label="${node.dataset.dialLabel}"]`
                  : node.dataset.rulerMark !== undefined ? `[data-ruler-mark="${node.dataset.rulerMark}"]`
                    : `[data-operation-${node.dataset.operationValue ? 'value' : 'symbol'}="${node.dataset.operationValue ?? node.dataset.operationSymbol}"]`);
          const state = () => ({
            shown: Number(drawing.dataset.target), rawShown: Number(guide.dataset.guideTarget),
            physicalPush: Number(drawing.dataset.push), spring: drawing.dataset.spring,
            displayedGap: Math.max(Math.round(Number(drawing.dataset.target) * 10) / 10, 0),
            runText: button.textContent?.trim(),
            chosenTarget: Number(nativeSlider.value), chosenText: chosenReadout.textContent?.trim(), shownText: shownReadout.textContent?.trim(),
          });
          const measure = () => {
            const before = state(), errors: string[] = [], tolerance = 0.3;
            const box = (node: Element) => {
              const rect = node.getBoundingClientRect();
              return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
            };
            type Bounds = ReturnType<typeof box>;
            const insideX = (a: Bounds, b: Bounds) => a.left >= b.left - tolerance && a.right <= b.right + tolerance;
            const inside = (a: Bounds, b: Bounds) => insideX(a, b) && a.top >= b.top - tolerance && a.bottom <= b.bottom + tolerance;
            const overlaps = (a: Bounds, b: Bounds) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > tolerance &&
              Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > tolerance;
            const rangeBoxes = (range: Range): Bounds[] => [...range.getClientRects()]
              .filter((rect) => rect.width > 0 && rect.height > 0)
              .map(({ left, right, top, bottom, width, height }) => ({ left, right, top, bottom, width, height }));
            const frameBox = box(element), calculationBox = box(calculation), equationBox = box(equation), descriptionsBox = box(descriptions);
            const expectedPush = Number((4 * before.displayedGap).toFixed(1));
            const expected = ['4', '×', String(before.displayedGap), '=', String(expectedPush)];
            const values = leaves.map((node, index) => {
              const range = document.createRange(); range.selectNodeContents(node);
              const css = getComputedStyle(node), rect = box(node), operand = box(node.parentElement!);
              const probeIndex = Number(node.dataset.releaseTextProbe), baseline = input.census[probeIndex]?.baselinePx;
              const glyphs = rangeBoxes(range), kind = node.dataset.operationValue ?? node.dataset.operationSymbol;
              if (kind !== kinds[index] || node.textContent?.trim() !== expected[index]) errors.push(`equation value:${kind}`);
              if (!node.checkVisibility({ opacityProperty: true, visibilityProperty: true })) errors.push(`hidden value:${kind}`);
              if (!Number.isFinite(baseline) || Math.abs(parseFloat(css.fontSize) - baseline * input.profile.textScale) > 0.5) errors.push(`text size:${kind}`);
              if (!inside(rect, equationBox) || !inside(rect, calculationBox) || !inside(rect, frameBox)) errors.push(`value containment:${kind}`);
              if (glyphs.length !== 1) errors.push(`wrapped value:${kind}`);
              for (const glyph of glyphs) {
                for (const [name, bounds] of [['value', rect], ['operand', operand], ['equation', equationBox], ['calculation', calculationBox], ['frame', frameBox]] as const) {
                  if (!insideX(glyph, bounds)) errors.push(`glyph containment:${kind}:${name}`);
                }
              }
              return { kind, text: node.textContent?.trim(), box: rect, operand, glyphs, baseline, fontSize: parseFloat(css.fontSize), fontWeight: css.fontWeight };
            });
            if (values.length !== 5) errors.push('equation member count');
            if (Math.max(...values.map((value) => value.box.top)) - Math.min(...values.map((value) => value.box.top)) > tolerance) errors.push('equation row alignment');
            if (values.some((value) => value.fontSize !== values[0].fontSize || value.fontWeight !== values[0].fontWeight)) errors.push('equation typography agreement');
            for (let i = 0; i < values.length; i++) for (let j = i + 1; j < values.length; j++) {
              if (values[i].glyphs.some((a) => values[j].glyphs.some((b) => overlaps(a, b)))) errors.push(`glyph overlap:${values[i].kind}:${values[j].kind}`);
            }
            if (!inside(equationBox, calculationBox) || !inside(descriptionsBox, calculationBox) || !inside(calculationBox, frameBox)) errors.push('calculation containment');
            if (overlaps(equationBox, descriptionsBox)) errors.push('equation/descriptor overlap');
            if (Math.abs(parseFloat(getComputedStyle(equation).fontSize) - input.parentFont) > 0.5) errors.push('canonical profile changed parent font');
            const primary = leaves.filter((node) => node.hasAttribute('data-operation-value'));
            const repeated = [...descriptions.querySelectorAll<HTMLElement>('[data-description-value]')];
            if (primary.length !== 3 || repeated.length !== 3) errors.push('primary/descriptor count');
            const descriptorReadings = repeated.map((value, index) => {
              const main = primary[index], description = value.parentElement!, kind = value.dataset.descriptionValue;
              const text = description.textContent?.replace(/\s+/g, ' ').trim();
              const words = kind === 'stiffness' ? `sent stiffness: ${main?.textContent}` : kind === 'gap'
                ? `target gap: ${main?.textContent} ruler marks` : `push: ${main?.textContent} dial marks`;
              if (!main || kind !== main.dataset.operationValue || value.textContent !== main.textContent || text !== words ||
                document.getElementById(main.getAttribute('aria-describedby') ?? '') !== description) errors.push(`descriptor agreement:${kind}`);
              if (!description.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || !inside(box(description), descriptionsBox)) errors.push(`descriptor containment:${kind}`);
              const wordReadings: Array<{ word: string; rects: Bounds[] }> = [];
              const walker = document.createTreeWalker(description, NodeFilter.SHOW_TEXT);
              for (let node = walker.nextNode(); node; node = walker.nextNode()) for (const match of (node.textContent ?? '').matchAll(/\S+/g)) {
                const range = document.createRange();
                range.setStart(node, match.index); range.setEnd(node, match.index + match[0].length);
                const rects = rangeBoxes(range);
                if (rects.length !== 1 || rects.some((rect) => !insideX(rect, box(description)))) errors.push(`descriptor word:${kind}:${match[0]}`);
                wordReadings.push({ word: match[0], rects });
              }
              return { kind, text, box: box(description), words: wordReadings };
            });
            for (let i = 0; i < descriptorReadings.length; i++) for (let j = i + 1; j < descriptorReadings.length; j++) {
              if (overlaps(descriptorReadings[i].box, descriptorReadings[j].box)) errors.push('descriptor overlap');
            }
            const namedRowIds = ['press-stiffness-product-row', 'press-gap-product-row', 'press-push-product-row'];
            const namedKinds = ['stiffness', 'gap', 'push'];
            const namedValues = [String(4), String(before.displayedGap), String(expectedPush)];
            const namedOperators = [null, 'press-gap-product-operator', 'press-push-product-operator'];
            const namedOperatorTexts = [null, '× times', '= equals'];
            const namedRows = namedRowIds.map((id) => byId(id));
            const namedParagraphNodes = namedRows.flatMap((row) => [...row.querySelectorAll<HTMLElement>('p')]);
            const positiveBounds = (rect: Bounds) => ['left', 'right', 'top', 'bottom', 'width', 'height']
              .every((key) => Number.isFinite(rect[key as keyof Bounds])) && rect.width > 0 && rect.height > 0;
            const productText = (node: HTMLElement, containers: Array<[string, Bounds]>, label: string) => {
              const id = node.dataset.testid, rect = box(node), css = getComputedStyle(node);
              const baseline = input.census[Number(node.dataset.releaseTextProbe)]?.baselinePx;
              const visible = node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
                !node.closest('details:not([open]),[hidden],[aria-hidden="true"]');
              if (!visible) errors.push(label + ' hidden:' + id);
              if (node.tagName !== 'P' || node.querySelector('p')) errors.push(label + ' paragraph identity:' + id);
              const expectedBase = id === 'press-sent-rule' || id === 'press-chosen-settings' ? 16 : label === 'named product' ? 16 : label === 'combined primary' ? 20 : 14;
              const expectedWeight = id === 'press-sent-rule' ? '400' : label === 'combined primary' || id?.endsWith('-operator') ? '600' : '400';
              if (!Number.isFinite(baseline) || Math.abs(baseline - expectedBase) > 0.5 || css.fontWeight !== expectedWeight) errors.push(label + ' source typography:' + id);
              const leafTypography: Array<{ text: string; paragraph: string | undefined; baseline: number; fontSize: number; fontWeight: string; visible: boolean }> = [];
              if (!Number.isFinite(baseline) || Math.abs(parseFloat(css.fontSize) - baseline * input.profile.textScale) > 0.5) errors.push(label + ' canonical text size:' + id);
              if (!positiveBounds(rect) || containers.some(([, container]) => !inside(rect, container))) errors.push(label + ' paragraph containment:' + id);
              const glyphs: Bounds[] = [], words: Array<{ word: string; rects: Bounds[] }> = [];
              const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
              for (let text = walker.nextNode(); text; text = walker.nextNode()) {
                if (!(text.textContent ?? '').trim()) continue;
                const leaf = text.parentElement!, leafCss = getComputedStyle(leaf), paragraph = leaf.closest('p');
                const emphasized = id !== 'press-sent-rule' && (label === 'combined primary' || leaf.closest('[data-operation-label],[data-testid="press-gap-product-operator"],[data-testid="press-push-product-operator"]'));
                const leafVisible = leaf.checkVisibility({ opacityProperty: true, visibilityProperty: true });
                if (paragraph !== node || !leafVisible || Math.abs(parseFloat(leafCss.fontSize) - baseline * input.profile.textScale) > 0.5 ||
                leafCss.fontWeight !== (emphasized ? '600' : '400')) errors.push(label + ' leaf inherited typography:' + id);
                leafTypography.push({ text: text.textContent!.trim(), paragraph: (paragraph as HTMLElement | null)?.dataset.testid, baseline, fontSize: parseFloat(leafCss.fontSize), fontWeight: leafCss.fontWeight, visible: leafVisible });
                const full = document.createRange(); full.selectNodeContents(text);
                const rangeBoxes = (range: Range): Bounds[] => [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0)
                  .map(({ left, right, top, bottom, width, height }) => ({ left, right, top, bottom, width, height }));
                glyphs.push(...rangeBoxes(full));
                for (const match of (text.textContent ?? '').matchAll(/\S+/g)) {
                  const range = document.createRange(); range.setStart(text, match.index); range.setEnd(text, match.index + match[0].length);
                  const rects = rangeBoxes(range);
                  if (rects.length !== 1 || rects.some((r) => !inside(r, rect) || containers.some(([, container]) => !inside(r, container)))) errors.push(label + ' whole word:' + id + ':' + match[0]);
                  words.push({ word: match[0], rects });
                }
              }
              if (!glyphs.length || glyphs.some((r) => !positiveBounds(r) || !inside(r, rect) || containers.some(([, container]) => !inside(r, container)))) errors.push(label + ' glyph containment:' + id);
              return { id, tag: node.tagName, text: node.textContent?.replace(/\s+/g, ' ').trim(), box: rect, baseline,
                fontSize: parseFloat(css.fontSize), fontWeight: css.fontWeight, visible, leafTypography, glyphs, words };
            };
            if (JSON.stringify([...descriptions.children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(namedRowIds) ||
              namedParagraphNodes.length !== 5 || descriptions.parentElement !== calculation || equation.parentElement !== calculation ||
              JSON.stringify([...calculation.children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-value-descriptions', 'press-equation'])) errors.push('named product row/calculation identity');
            if (box(descriptions).bottom > box(equation).top + tolerance) errors.push('named product before numeric equation');
            const namedProduct = namedRows.map((row, index) => {
              const kind = namedKinds[index], rowBox = box(row), description = byId('press-' + kind + '-description');
              const operatorId = namedOperators[index], operator = operatorId ? byId(operatorId) : null;
              const expectedChildren = operatorId ? [operatorId, 'press-' + kind + '-description'] : ['press-' + kind + '-description'];
              if (row.parentElement !== descriptions || JSON.stringify([...row.children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(expectedChildren) ||
                description.parentElement !== row || operator && (operator.parentElement !== row || operator.nextElementSibling !== description)) errors.push('named product sibling identity:' + kind);
              if (!row.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || !positiveBounds(rowBox) ||
                !inside(rowBox, box(descriptions)) || !inside(rowBox, box(calculation)) || !inside(rowBox, frameBox)) errors.push('named product row containment:' + kind);
              const main = equation.querySelector<HTMLElement>('[data-operation-value="' + kind + '"]');
              const copy = description.querySelector<HTMLElement>('[data-description-value="' + kind + '"]');
              const expectedText = kind === 'stiffness' ? 'sent stiffness: ' + namedValues[index] : kind === 'gap'
                ? 'target gap: ' + namedValues[index] + ' ruler marks' : 'push: ' + namedValues[index] + ' dial marks';
              if (!main || main.textContent?.trim() !== namedValues[index] || copy?.textContent?.trim() !== namedValues[index] ||
                description.textContent?.replace(/\s+/g, ' ').trim() !== expectedText ||
                document.getElementById(main?.getAttribute('aria-describedby') ?? '') !== description) errors.push('named product value/description agreement:' + kind);
              const containers: Array<[string, Bounds]> = [['row', rowBox], ['descriptions', box(descriptions)], ['calculation', box(calculation)], ['frame', frameBox]];
              const descriptor = productText(description, containers, 'named product');
              const operation = operator ? productText(operator, containers, 'named product') : null;
              if (operation && operation.text !== namedOperatorTexts[index]) errors.push('named product operator text:' + kind);
              if (operation && (overlaps(operation.box, descriptor.box) || operation.glyphs.some((a) => descriptor.glyphs.some((b) => overlaps(a, b))))) errors.push('named product operator/descriptor overlap:' + kind);
              if (index && (box(namedRows[index - 1]).bottom > rowBox.top + tolerance || overlaps(box(namedRows[index - 1]), rowBox))) errors.push('named product vertical row order:' + kind);
              return { kind, id: row.dataset.testid, box: rowBox, descriptor, operator: operation,
                primaryValue: main?.textContent, descriptionValue: copy?.textContent, primaryDescriptionId: main?.getAttribute('aria-describedby'), descriptionId: description.id };
            });
            // The full original analogy is a hidden model reference here. Only
            // the default visible position diagram supplies painted geometry.
            const positionBox = box(position), marksBox = box(marks), labelsBox = box(positionLabels);
            const surface = byId('press-position-surface'), toolMark = byId('press-position-tool');
            const targetMark = byId('press-position-target'), gapMark = byId('press-position-gap');
            const gapKey = byId('press-position-gap-key'), gapDescription = byId('press-gap-description');
            const surfaceBox = box(surface), toolBox = box(toolMark), targetBox = box(targetMark), gapBox = box(gapMark);
            const displayedTarget = Math.round(before.shown * 10) / 10;
            const expectedTool = Math.min(displayedTarget, 0), expectedGap = Math.max(displayedTarget, 0);
            const expectedY = (value: number) => marksBox.top + (value + 2) / 5 * marksBox.height;
            const near = (actual: number, expected: number) => Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
            for (const [name, actual, expectedValue] of [
              ['target', Number(position.dataset.target), displayedTarget], ['tool', Number(position.dataset.tool), expectedTool],
              ['gap', Number(position.dataset.gap), expectedGap], ['push', Number(position.dataset.push), expectedPush],
              ['surface y', surfaceBox.top, expectedY(0)], ['target y', targetBox.top, expectedY(displayedTarget)],
              ['tool y', (toolBox.top + toolBox.bottom) / 2, expectedY(expectedTool)],
              ['gap top', gapBox.top, expectedY(expectedTool)], ['gap span', gapBox.height, expectedGap / 5 * marksBox.height],
            ] as const) if (!near(actual, expectedValue)) errors.push(`visible position:${name}`);
            for (const node of [actionPacket, position, marks, positionLabels, calculation, equation, descriptions, surface, toolMark, targetMark, gapMark]) {
              if (!node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || node.closest('details:not([open]),[hidden]')) errors.push(`hidden primary:${node.dataset.testid}`);
            }
            if (method.open || drawing.closest('details') !== method || guide.closest('details') !== method) errors.push('method model reference is not closed');
            if (!nativeSlider.isConnected || nativeSlider !== element.querySelector('input[type="range"]') || !actionPacket.contains(nativeSlider) || !actionPacket.contains(button)) errors.push('native chosen-setting identity');
            if (chosenLabel.textContent?.trim() !== `Action: target ${displayedTarget > 0 ? '+' : ''}${displayedTarget} and stiffness 4.` ||
              chosenReadout.textContent?.trim() !== `${before.chosenTarget} marks past surface` ||
              shownReadout.textContent?.trim() !== `Shown target: ${displayedTarget} marks past surface`) errors.push('chosen/shown label agreement');
            if (byId('press-position-condition').textContent?.trim() !== 'The surface stops the tool.') errors.push('visible contact condition');
            if (getComputedStyle(surface).borderTopStyle !== 'solid' || getComputedStyle(targetMark).borderTopStyle !== 'dashed' ||
              !(toolBox.width > 0 && toolBox.height > 0) || getComputedStyle(toolMark).backgroundColor !== getComputedStyle(marks).color) errors.push('visible position paint');
            const gapKeyBox = box(gapKey), gapKeyStyle = getComputedStyle(gapKey);
            if (gapKey.parentElement !== gapDescription || gapKey.nextElementSibling !== gapDescription.querySelector('[data-operation-label="gap"]') ||
              gapKey.getAttribute('aria-hidden') !== 'true') errors.push('gap legend descriptor binding');
            if (!gapKey.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || !inside(gapKeyBox, box(gapDescription)) ||
              !near(gapKeyBox.width, gapBox.width) || !near(gapKeyBox.height, 12) ||
              [gapKeyStyle.borderTopStyle, gapKeyStyle.borderRightStyle, gapKeyStyle.borderBottomStyle].some((style) => style !== 'solid') ||
              [gapKeyStyle.borderTopWidth, gapKeyStyle.borderRightWidth, gapKeyStyle.borderBottomWidth].some((width) => parseFloat(width) !== 1) ||
              parseFloat(gapKeyStyle.borderLeftWidth) !== 0 ||
              [gapKeyStyle.borderTopColor, gapKeyStyle.borderRightColor, gapKeyStyle.borderBottomColor].some((color) => color !== getComputedStyle(marks).color)) errors.push('visible gap legend paint');
            if (!(marksBox.width > 0 && marksBox.height > 0) || !inside(positionBox, frameBox) || !inside(labelsBox, positionBox)) errors.push('visible position containment');
            for (const rect of [surfaceBox, toolBox, targetBox, gapBox]) if (!inside(rect, positionBox) || !inside(rect, frameBox)) errors.push('visible mark containment');
            if (overlaps(marksBox, labelsBox)) errors.push('visible marks/labels overlap');
            const positionWords: Array<{ word: string; rects: Bounds[] }> = [];
            const positionWalker = document.createTreeWalker(positionLabels, NodeFilter.SHOW_TEXT);
            for (let node = positionWalker.nextNode(); node; node = positionWalker.nextNode()) for (const match of (node.textContent ?? '').matchAll(/\S+/g)) {
              const range = document.createRange(); range.setStart(node, match.index); range.setEnd(node, match.index + match[0].length);
              const rects = rangeBoxes(range);
              if (rects.length !== 1 || rects.some((rect) => !insideX(rect, labelsBox) || !insideX(rect, positionBox) || !insideX(rect, frameBox))) errors.push(`visible position word:${match[0]}`);
              positionWords.push({ word: match[0], rects });
            }
            // The condition used to be traversed inside positionLabels. Its
            // exact text remains checked above; preserve and strengthen its
            // paint, font and whole-word geometry at its new actual owner.
            const productBox = box(contactProduct), conditionBox = box(condition);
            const conditionReading = productText(condition, [['contact product', productBox], ['frame', frameBox]], 'moved condition');
            if (condition.parentElement !== contactProduct || byId('press-position-tool-key').parentElement !== condition ||
              condition.previousElementSibling !== byId('press-response-label') || condition.nextElementSibling !== byId('press-response-diagram') ||
              !inside(conditionBox, productBox) || overlaps(conditionBox, box(byId('press-general-rule'))) ||
              [...positionLabels.querySelectorAll('p')].some((node) => overlaps(conditionBox, box(node)))) errors.push('moved condition owner/geometry');
            const sentTarget = Math.round(before.shown * 10) / 10, sentRate = 4;
            const sentTargetText = (sentTarget > 0 ? '+' : '') + String(sentTarget);
            const sentActionText = 'An action sends target and stiffness;';
            const sentPrimaryText = `${sentActionText} once the surface stops the tool, push equals stiffness times target gap.`;
            const primarySentence = byId('press-primary-takeaway'), action = byId('press-action-clause'), rule = byId('press-general-rule');
            const primaryReading = productText(primarySentence, [['frame', frameBox]], 'combined primary');
            const primaryCss = getComputedStyle(primarySentence);
            if (primarySentence.textContent?.replace(/\s+/g, ' ').trim() !== sentPrimaryText ||
              action.parentElement !== primarySentence || rule.parentElement !== byId('press-product-rule') || rule.tagName !== 'SPAN' ||
              getComputedStyle(action).display !== 'inline' || getComputedStyle(rule.parentElement!).display !== 'inline' ||
              !(action.compareDocumentPosition(rule) & Node.DOCUMENT_POSITION_FOLLOWING) ||
              !rule.checkVisibility({ opacityProperty: true, visibilityProperty: true }) ||
              !inside(box(rule), box(byId('press-primary-takeaway'))) || primaryCss.fontWeight !== '600') errors.push('combined primary ownership/copy/font');
            /** Browser observer template for the new R31 dial. It is injected unchanged into
             * both existing native probes after the designer freezes the source contract.
             * Its expectation is derived from each probe's original independent model. */
            function readPushDial(frame: Element, expectedPush: number, expectedInk: string, tolerance: number) {
              type DialBox = { left: number; right: number; top: number; bottom: number; width: number; height: number };
              const errors: string[] = [];
              const dial = frame.querySelector<SVGSVGElement>('[data-testid="press-push-dial"]');
              if (!dial) return { errors: ['dial missing'], expectedPush, missing: true };
              const bounds = (node: Element): DialBox => {
                const { left, right, top, bottom, width, height } = node.getBoundingClientRect();
                return { left, right, top, bottom, width, height };
              };
              const positive = (r: DialBox) => Object.values(r).every(Number.isFinite) && r.width > 0 && r.height > 0;
              const inside = (a: DialBox, b: DialBox) => a.left >= b.left - tolerance && a.right <= b.right + tolerance && a.top >= b.top - tolerance && a.bottom <= b.bottom + tolerance;
              const near = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
              const visible = (node: Element) => node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
                !node.closest('details:not([open]),[hidden]') && getComputedStyle(node).opacity === '1';
              const number = (node: Element, name: string) => Number(node.getAttribute(name));
              const point = (node: SVGGraphicsElement, x: number, y: number) => {
                const matrix = node.getScreenCTM();
                if (!matrix) { errors.push('dial missing screen transform'); return { x: Number.NaN, y: Number.NaN }; }
                const result = new DOMPoint(x, y).matrixTransform(matrix);
                return { x: result.x, y: result.y };
              };
              const angle = (push: number) => (-135 + 270 * Math.max(0, Math.min(push, 12)) / 12) * Math.PI / 180;
              const polar = (push: number, radius: number) => ({ x: 56 + Math.sin(angle(push)) * radius, y: 50 - Math.cos(angle(push)) * radius });
              const samePoint = (a: { x: number; y: number }, b: { x: number; y: number }) => near(a.x, b.x) && near(a.y, b.y);
              const stroke = (node: Element, width: number) => {
                const css = getComputedStyle(node);
                return visible(node) && css.stroke === expectedInk && css.strokeOpacity === '1' && near(parseFloat(css.strokeWidth), width);
              };
              const dialBox = bounds(dial), frameBox = bounds(frame), css = getComputedStyle(dial);
              if (!visible(dial)) errors.push('dial hidden');
              if (!positive(dialBox) || !inside(dialBox, frameBox)) errors.push('dial containment');
              if (dial.getAttribute('viewBox') !== '0 0 112 112' || dial.getAttribute('data-min') !== '0' || dial.getAttribute('data-max') !== '12') errors.push('dial scale identity');
              if (dial.getAttribute('data-push') !== String(expectedPush) || css.color !== expectedInk) errors.push('dial model/ink basis');
              const description = frame.querySelector<HTMLElement>('[data-testid="press-push-description"]');
              const references = (dial.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
              const scaleDescription = dial.querySelector('desc');
              if (dial.getAttribute('role') !== 'img' || dial.getAttribute('aria-label') !== 'Push dial' ||
                references.length !== 2 || !description || !scaleDescription || scaleDescription.textContent?.replace(/\s+/g, ' ').trim() !== 'Schematic push scale from 0 to 12 dial marks, without physical units.' || !references.includes(description.id) || !references.includes(scaleDescription.id) ||
                references.some(id => document.getElementById(id) !== (id === description?.id ? description : scaleDescription)) ||
                description.querySelector('[data-description-value="push"]')?.textContent?.trim() !== String(expectedPush)) errors.push('dial accessible/value binding');
              const face = dial.querySelectorAll<SVGCircleElement>(':scope > circle');
              if (face.length !== 2 || number(face[0], 'cx') !== 56 || number(face[0], 'cy') !== 50 || number(face[0], 'r') !== 34 ||
                !stroke(face[0], 1) || getComputedStyle(face[0]).fill !== 'none' ||
                !samePoint(point(face[0], 56, 50), point(dial, 56, 50)) || !samePoint(point(face[0], 90, 50), point(dial, 90, 50)) || !samePoint(point(face[0], 56, 84), point(dial, 56, 84)) ||
                number(face[1], 'cx') !== 56 || number(face[1], 'cy') !== 50 || number(face[1], 'r') !== 2 ||
                !visible(face[1]) || getComputedStyle(face[1]).fill !== expectedInk) errors.push('dial face/pivot geometry or paint');
              const marks = [...dial.querySelectorAll<SVGGElement>('[data-dial-mark]')];
              if (JSON.stringify(marks.map(node => node.getAttribute('data-dial-mark'))) !== JSON.stringify(Array.from({ length: 13 }, (_, index) => String(index)))) errors.push('dial tick population');
              const tickReadings = marks.map((mark, index) => {
                const line = mark.querySelector<SVGLineElement>('line'), label = mark.querySelector<SVGTextElement>('text'), major = index % 4 === 0;
                const inner = polar(index, major ? 27 : 30), outer = polar(index, 34), labelPoint = polar(index, 46);
                if (!line || mark.querySelectorAll('line').length !== 1) { errors.push('dial tick identity:' + index); return { index, missing: true }; }
                const start = point(line, number(line, 'x1'), number(line, 'y1')), end = point(line, number(line, 'x2'), number(line, 'y2'));
                if (!near(number(line, 'x1'), inner.x) || !near(number(line, 'y1'), inner.y) || !near(number(line, 'x2'), outer.x) || !near(number(line, 'y2'), outer.y) ||
                  !samePoint(start, point(dial, inner.x, inner.y)) || !samePoint(end, point(dial, outer.x, outer.y))) errors.push('dial tick geometry:' + index);
                if (!stroke(line, 1)) errors.push('dial tick paint:' + index);
                let labelReading: Record<string, unknown> | null = null;
                if (major) {
                  if (!label || mark.querySelectorAll('text').length !== 1) errors.push('dial label missing:' + index);
                  else {
                    const labelCss = getComputedStyle(label), labelBox = bounds(label), range = document.createRange();
                    range.selectNodeContents(label);
                    const glyphs = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0)
                      .map(({ left, right, top, bottom, width, height }) => ({ left, right, top, bottom, width, height }));
                    if (label.textContent?.trim() !== String(index) || label.getAttribute('data-dial-label') !== String(index)) errors.push('dial label text:' + index);
                    if (label.childNodes.length !== 1 || label.firstChild?.nodeType !== Node.TEXT_NODE || label.firstChild?.textContent !== String(index)) errors.push('dial label leaf identity:' + index);
                    // SVG labels are outside the unchanged canonical P/text selector.
                    // Their declared 14px scene readout remains explicitly measured.
                    if (!near(parseFloat(labelCss.fontSize), 14) || !label.hasAttribute('data-scene-readout')) errors.push('dial label font:' + index);
                    if (!visible(label) || labelCss.fill !== expectedInk || labelCss.fillOpacity !== '1') errors.push('dial label paint:' + index);
                    if (!near(number(label, 'x'), labelPoint.x) || !near(number(label, 'y'), labelPoint.y) ||
                      label.getAttribute('text-anchor') !== 'middle' || label.getAttribute('dominant-baseline') !== 'central' ||
                      !samePoint(point(label, number(label, 'x'), number(label, 'y')), point(dial, labelPoint.x, labelPoint.y))) errors.push('dial label position:' + index);
                    if (!positive(labelBox) || !inside(labelBox, dialBox) || !inside(labelBox, frameBox) || glyphs.length !== 1 ||
                      glyphs.some(glyph => !positive(glyph) || !inside(glyph, dialBox) || !inside(glyph, frameBox))) errors.push('dial label glyph containment:' + index);
                    labelReading = { text: label.textContent?.trim(), box: labelBox, glyphs, fontSize: parseFloat(labelCss.fontSize), fill: labelCss.fill,
                      childNodes: [...label.childNodes].map(child => ({ nodeType: child.nodeType, nodeName: child.nodeName, text: child.textContent })) };
                  }
                } else if (label) errors.push('dial unexpected minor label:' + index);
                return { index, major, start, end, label: labelReading };
              });
              const needle = dial.querySelector<SVGLineElement>('[data-testid="press-dial-needle"]'), tip = polar(expectedPush, 25);
              let needleReading: Record<string, unknown> | null = null;
              if (!needle) errors.push('dial needle missing');
              else {
                const start = point(needle, number(needle, 'x1'), number(needle, 'y1')), end = point(needle, number(needle, 'x2'), number(needle, 'y2'));
                if (number(needle, 'x1') !== 56 || number(needle, 'y1') !== 50 || !near(number(needle, 'x2'), tip.x) || !near(number(needle, 'y2'), tip.y) ||
                  !samePoint(start, point(dial, 56, 50)) || !samePoint(end, point(dial, tip.x, tip.y))) errors.push('dial needle geometry');
                if (!stroke(needle, 2)) errors.push('dial needle paint');
                needleReading = { expectedPush, start, end, expectedStart: point(dial, 56, 50), expectedEnd: point(dial, tip.x, tip.y), stroke: getComputedStyle(needle).stroke };
              }
              return { expectedPush, modelPush: number(dial, 'data-push'), errors, box: dialBox, viewBox: dial.getAttribute('viewBox'),
                role: dial.getAttribute('role'), name: dial.getAttribute('aria-label'), references, ink: css.color, ticks: tickReadings, needle: needleReading };
            }


            /** Pure browser measurements for the new causal arrow, input line and ruler. */
            function readCausalMarks(frame: Element, expectedInk: string, tolerance: number) {
              const errors: string[] = [];
              const q = (id: string) => frame.querySelector<HTMLElement>('[data-testid="' + id + '"]')!;
              const box = (node: Element) => {
                const { left, right, top, bottom, width, height } = node.getBoundingClientRect();
                return { left, right, top, bottom, width, height };
              };
              type MarkBox = ReturnType<typeof box>;
              const inside = (a: MarkBox, b: MarkBox) => a.left >= b.left - tolerance && a.right <= b.right + tolerance && a.top >= b.top - tolerance && a.bottom <= b.bottom + tolerance;
              const near = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
              const positive = (r: MarkBox) => Object.values(r).every(Number.isFinite) && r.width > 0 && r.height > 0;
              const visible = (node: Element) => node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
                !node.closest('details:not([open]),[hidden]') && getComputedStyle(node).opacity === '1';
              const frameBox = box(frame), sent = q('press-chosen-settings'), message = q('press-action-message'), inputCss = getComputedStyle(message);
              if (!visible(message) || !positive(box(message)) || !inside(box(message), box(sent)) ||
                inputCss.borderBottomStyle !== 'solid' || parseFloat(inputCss.borderBottomWidth) !== 1 || inputCss.borderBottomColor !== expectedInk) errors.push('sent action input-rule paint');
              const arrow = frame.querySelector<SVGSVGElement>('[data-testid="press-send-connector"]')!, path = arrow.querySelector<SVGPathElement>('path');
              const arrowBox = box(arrow), arrowCss = getComputedStyle(arrow);
              if (arrow.tagName.toLowerCase() !== 'svg' || arrow.getAttribute('viewBox') !== '0 0 20 32' || arrow.getAttribute('aria-hidden') !== 'true' ||
                arrow.getAttribute('data-from') !== 'press-action-message' || arrow.getAttribute('data-to') !== 'press-controller-output' ||
                arrow.querySelectorAll('path').length !== 1 || !path || path.getAttribute('d') !== 'M10 0V28m-5-5 5 5 5-5') errors.push('sent SVG arrow identity');
              if (!visible(arrow) || !positive(arrowBox) || !inside(arrowBox, box(q('press-send-path'))) || !inside(arrowBox, frameBox) || arrowCss.color !== expectedInk) errors.push('sent SVG arrow containment/paint');
              if (path) {
                const css = getComputedStyle(path), pathBox = box(path);
                if (!visible(path) || !positive(pathBox) || !inside(pathBox, arrowBox) || !inside(pathBox, frameBox) ||
                  css.stroke !== expectedInk || css.strokeOpacity !== '1' || parseFloat(css.strokeWidth) !== 1 || css.fill !== 'none') errors.push('sent SVG arrow path paint');
              }
              const marks = q('press-position-marks'), ruler = q('press-ruler'), diagram = q('press-position-diagram');
              const marksBox = box(marks), rulerBox = box(ruler), rulerCss = getComputedStyle(ruler);
              if (ruler.parentElement !== marks || marks.firstElementChild !== ruler || marks.getAttribute('aria-hidden') !== 'true' ||
                !visible(ruler) || !near(rulerBox.left, marksBox.left) || !near(rulerBox.top, marksBox.top) || !near(rulerBox.height, marksBox.height) ||
                rulerCss.borderLeftStyle !== 'solid' || parseFloat(rulerCss.borderLeftWidth) !== 1 || rulerCss.borderLeftColor !== expectedInk ||
                !inside(rulerBox, box(diagram)) || !inside(rulerBox, frameBox)) errors.push('linear ruler geometry/paint');
              const ticks = [...marks.querySelectorAll<HTMLElement>('[data-ruler-mark]')];
              if (JSON.stringify(ticks.map(node => node.dataset.rulerMark)) !== JSON.stringify(['-2', '-1', '0', '1', '2', '3'])) errors.push('linear ruler tick population');
              const tickReadings = ticks.map((node, index) => {
                const value = index - 2, rect = box(node), css = getComputedStyle(node), expectedY = marksBox.top + (value + 2) / 5 * marksBox.height;
                if (node.parentElement !== marks || !visible(node) || !near(rect.left, marksBox.left) || !near(rect.top, expectedY) || !near(rect.width, 4) ||
                  css.borderTopStyle !== 'solid' || parseFloat(css.borderTopWidth) !== 1 || css.borderTopColor !== expectedInk ||
                  !inside(rect, box(diagram)) || !inside(rect, frameBox)) errors.push('linear ruler tick geometry/paint:' + value);
                return { value, box: rect, expectedY, ink: css.borderTopColor };
              });
              return { errors, inputRule: { box: box(message), ink: inputCss.borderBottomColor }, arrow: { box: arrowBox, path: path?.getAttribute('d'), ink: arrowCss.color }, ruler: { box: rulerBox, ticks: tickReadings } };
            }

            const dialReading = readPushDial(element, expectedPush, getComputedStyle(marks).color, tolerance);
            const causalMarks = readCausalMarks(element, getComputedStyle(marks).color, tolerance);
            errors.push(...dialReading.errors, ...causalMarks.errors);
            const combinedPrimary = byId('press-primary-takeaway');
            const combinedIds = ['press-action-clause', 'press-contact-clause', 'press-general-rule'];
            const combinedTexts = [sentActionText, 'The surface stops the tool.', 'once the surface stops the tool, push equals stiffness times target gap.'];
            const sentOwner = byId('press-chosen-settings');
            const sentReading = productText(sentOwner, [['native controls', box(byId('press-native-controls'))], ['frame', frameBox]], 'sent pair');
            const clauseParagraphs = [combinedPrimary, byId('press-position-condition'), combinedPrimary];
            const clauseOwners = [combinedPrimary, byId('press-position-condition'), byId('press-product-rule')];
            const clauseBases = [20, 14, 20], clauseWeights = ['600', '400', '600'];
            const lawReading = productText(byId('press-sent-rule'), [['contact product', box(byId('press-contact-product'))], ['frame', frameBox]], 'combined primary');
            if (lawReading.text !== '↓ Shown calculation') errors.push('separated law paragraph copy');
            if (combinedPrimary.tagName !== 'P' || JSON.stringify([...combinedPrimary.children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-action-clause', 'press-product-rule']) ||
              combinedPrimary.parentElement !== byId('press-relationship') ||
              combinedPrimary.nextElementSibling !== byId('press-native-controls') ||
              byId('press-native-controls').parentElement !== byId('press-relationship') ||
              byId('press-native-controls').nextElementSibling !== byId('press-controller-output') ||
              byId('press-controller-output').parentElement !== byId('press-relationship') ||
              JSON.stringify([...byId('press-relationship').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-primary-takeaway', 'press-native-controls', 'press-controller-output']) ||
              byId('press-relationship').parentElement !== byId('press-action-packet') ||
              JSON.stringify([...byId('press-action-packet').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-relationship']) ||
              JSON.stringify([...byId('press-controller-output').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-send-path', 'press-contact-product']) ||
              JSON.stringify([...byId('press-send-path').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-send-connector', 'press-controller-heading']) ||
              byId('press-send-path').tagName !== 'DIV' || byId('press-send-path').parentElement !== byId('press-controller-output') ||
              JSON.stringify([...byId('press-contact-product').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-response-label', 'press-position-condition', 'press-response-diagram', 'press-sent-rule', 'press-result-with-dial', 'press-scale-definitions']) ||
              byId('press-response-label').parentElement !== byId('press-contact-product') || byId('press-response-label').previousElementSibling !== null || byId('press-response-label').nextElementSibling !== byId('press-position-condition') ||
              JSON.stringify([...byId('press-position-condition').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-position-tool-key', 'press-contact-clause']) ||
              JSON.stringify([...byId('press-response-diagram').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-position-diagram', 'press-push-dial']) ||
              byId('press-sent-rule').tagName !== 'P' || byId('press-sent-rule').parentElement !== byId('press-contact-product') ||
              JSON.stringify([...byId('press-sent-rule').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-gap-output-connector', null]) ||
              byId('press-sent-rule').lastElementChild?.tagName !== 'SPAN' || byId('press-sent-rule').lastElementChild?.textContent?.trim() !== 'Shown calculation' ||
              byId('press-product-rule').tagName !== 'SPAN' || JSON.stringify([...byId('press-product-rule').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-general-rule']) ||
              byId('press-product-rule').parentElement !== combinedPrimary ||
              byId('press-result-with-dial').parentElement !== byId('press-contact-product') || byId('press-result-with-dial').children.length !== 1 || byId('press-result-with-dial').firstElementChild !== calculation ||
              descriptions.parentElement !== calculation || descriptions.nextElementSibling !== equation ||
              byId('press-send-connector').getAttribute('data-from') !== 'press-action-message' ||
              byId('press-send-connector').getAttribute('data-to') !== 'press-controller-output' ||
              !(combinedPrimary.compareDocumentPosition(byId('press-send-path')) & Node.DOCUMENT_POSITION_FOLLOWING)) errors.push('combined clause sibling order');
            const gapArrow = byId('press-gap-output-connector');
            if (gapArrow.textContent?.trim() !== '↓' || gapArrow.getAttribute('aria-hidden') !== 'true' || gapArrow.getAttribute('data-from') !== 'press-position-gap' ||
              gapArrow.getAttribute('data-to') !== 'press-calculation' || gapArrow.parentElement !== byId('press-sent-rule')) errors.push('gap-to-product arrow binding');
            const sentMessage = byId('press-action-message'), sentLabel = byId('press-action-label');
            const sentFields = [...sentMessage.querySelectorAll<HTMLElement>('[data-action-field]')];
            const sentValues = [...sentMessage.querySelectorAll<HTMLElement>('[data-action-value]')];
            if (sentMessage.parentElement !== sentOwner || sentLabel.parentElement !== byId('press-action-clause') ||
              sentOwner.parentElement !== byId('press-native-controls') || sentOwner.nextElementSibling !== byId('press-settings') ||
              sentOwner.firstElementChild !== sentMessage || sentOwner.children.length !== 1 ||
              sentReading.text !== `Action: target ${sentTargetText} and stiffness ${sentRate}.` ||
              sentLabel.tagName !== 'SPAN' || sentLabel.hasAttribute('aria-label') || sentLabel.hasAttribute('role') ||
              byId('press-settings').getAttribute('role') !== 'group' ||
              byId('press-settings').getAttribute('aria-label') !== 'An action sends two settings: target and stiffness' ||
              byId('press-settings').hasAttribute('aria-labelledby') ||
              sentLabel.id !== `${nativeSlider.id}-settings` ||
              JSON.stringify(sentFields.map((node) => node.dataset.actionField)) !== JSON.stringify(['target', 'stiffness']) ||
              JSON.stringify(sentValues.map((node) => node.dataset.actionValue)) !== JSON.stringify(['target', 'stiffness']) ||
              JSON.stringify(sentFields.map((node) => node.textContent?.replace(/\s+/g, ' ').trim())) !== JSON.stringify([`target ${sentTargetText}`, `stiffness ${sentRate}.`]) ||
              JSON.stringify(sentValues.map((node) => node.textContent?.trim())) !== JSON.stringify([sentTargetText, String(sentRate)]) ||
              sentValues.some((node, index) => node.parentElement !== sentFields[index]) ||
              byId('press-send-connector').tagName.toLowerCase() !== 'svg' || byId('press-send-connector').getAttribute('aria-hidden') !== 'true') errors.push('sent action values and accessible binding');
            for (const node of [...sentFields, ...sentValues]) {
              const css = getComputedStyle(node), rect = box(node);
              if (!node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || !inside(rect, sentReading.box) || !inside(rect, frameBox) ||
                Math.abs(parseFloat(css.fontSize) - sentReading.baseline * input.profile.textScale) > 0.5 || css.fontWeight !== '400') errors.push('sent action value visibility/font/containment');
            }
            const combinedClauses = combinedIds.map((id, index) => {
              const node = byId(id), rect = box(node), css = getComputedStyle(node), owner = clauseOwners[index], ownerBox = box(owner), paragraphNode = clauseParagraphs[index], clauseBaseline = input.census[Number(paragraphNode.dataset.releaseTextProbe)]?.baselinePx;
              const finitePositive = (r: Bounds) => ['left', 'right', 'top', 'bottom', 'width', 'height']
                .every((key) => Number.isFinite(r[key as keyof Bounds])) && r.width > 0 && r.height > 0;
              const visible = node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && !node.closest('details:not([open]),[hidden],[aria-hidden="true"]');
              if (!visible) errors.push('combined clause hidden:' + id);
              if (node.tagName !== 'SPAN' || node.parentElement !== owner || node.textContent?.replace(/\s+/g, ' ').trim() !== combinedTexts[index] || node.children.length !== (index === 0 ? 1 : 0)) errors.push('combined clause identity/copy:' + id);
              if (!finitePositive(rect) || !finitePositive(ownerBox) || !inside(rect, ownerBox) || !inside(rect, frameBox)) errors.push('combined clause containment:' + id);
              const paragraphs = [paragraphNode].map((paragraph) => {
                const paragraphCss = getComputedStyle(paragraph), paragraphBox = box(paragraph), baseline = clauseBaseline;
                const paragraphVisible = paragraph.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && !paragraph.closest('details:not([open]),[hidden],[aria-hidden="true"]');
                if (paragraph.tagName !== 'P' || !Number.isFinite(baseline) || Math.abs(baseline - clauseBases[index]) > 0.5 ||
                  Math.abs(parseFloat(paragraphCss.fontSize) - baseline * input.profile.textScale) > 0.5 || paragraphCss.fontWeight !== clauseWeights[index] ||
                  Math.abs(parseFloat(css.fontSize) - baseline * input.profile.textScale) > 0.5 || css.fontWeight !== clauseWeights[index]) errors.push('combined clause inherited font:' + id);
                if (!paragraphVisible) errors.push('combined clause hidden:' + id);
                if (!finitePositive(paragraphBox) || !inside(ownerBox, paragraphBox) || !inside(paragraphBox, frameBox)) errors.push('combined clause paragraph containment:' + id);
                return { id: paragraph.dataset.testid, tag: paragraph.tagName, box: paragraphBox, baseline, fontSize: parseFloat(paragraphCss.fontSize), fontWeight: paragraphCss.fontWeight, visible: paragraphVisible };
              });
              if (paragraphs.length !== 1) errors.push('combined clause paragraph population:' + id);
              const glyphs: Bounds[] = [], words: Array<{ word: string; rects: Bounds[] }> = [];
              const leafTypography: Array<{ text: string; paragraph: string | undefined; baseline: number | undefined; fontSize: number; fontWeight: string; visible: boolean }> = [];
              const ranges = (range: Range): Bounds[] => [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0)
                .map(({ left, right, top, bottom, width, height }) => ({ left, right, top, bottom, width, height }));
              const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
              for (let text = walker.nextNode(); text; text = walker.nextNode()) {
                if (!(text.textContent ?? '').trim()) continue;
                const leaf = text.parentElement!, paragraph = leaf.closest('p'), leafCss = getComputedStyle(leaf), baseline = clauseBaseline;
                const leafVisible = leaf.checkVisibility({ opacityProperty: true, visibilityProperty: true });
                if (!leafVisible) errors.push('combined clause hidden:' + id);
                if (paragraph !== paragraphNode || !Number.isFinite(baseline) || Math.abs(parseFloat(leafCss.fontSize) - baseline * input.profile.textScale) > 0.5 ||
                  leafCss.fontWeight !== clauseWeights[index]) errors.push('combined clause inherited font:' + id);
                const paragraphBox = paragraph ? box(paragraph) : ownerBox;
                leafTypography.push({ text: text.textContent!.trim(), paragraph: (paragraph as HTMLElement | null)?.dataset.testid, baseline, fontSize: parseFloat(leafCss.fontSize), fontWeight: leafCss.fontWeight, visible: leafVisible });
                const full = document.createRange(); full.selectNodeContents(text); glyphs.push(...ranges(full));
                for (const match of (text.textContent ?? '').matchAll(/\S+/g)) {
                  const range = document.createRange(); range.setStart(text, match.index); range.setEnd(text, match.index + match[0].length);
                  const rects = ranges(range);
                  if (rects.length !== 1 || rects.some((r) => !finitePositive(r) || !inside(r, rect) || !inside(r, ownerBox) || !inside(r, paragraphBox) || !inside(r, frameBox))) errors.push('combined clause whole word:' + id + ':' + match[0]);
                  words.push({ word: match[0], rects });
                }
                if (ranges(full).some((r) => !inside(r, paragraphBox))) errors.push('combined clause glyph containment:' + id);
              }
              if (!glyphs.length || glyphs.some((r) => !finitePositive(r) || !inside(r, rect) || !inside(r, ownerBox) || !inside(r, frameBox))) errors.push('combined clause glyph containment:' + id);
              return { id, tag: node.tagName, text: node.textContent?.replace(/\s+/g, ' ').trim(), box: rect, owner: { id: owner.dataset.testid, tag: owner.tagName, box: ownerBox }, visible,
                opacity: css.opacity, visibility: css.visibility, fontSize: parseFloat(css.fontSize), fontWeight: css.fontWeight, paragraphs, leafTypography, glyphs, words };
            });
            for (let i = 0; i < combinedClauses.length; i++) for (let j = i + 1; j < combinedClauses.length; j++) {
              if (combinedClauses[i].glyphs.some((a) => combinedClauses[j].glyphs.some((b) => overlaps(a, b)))) errors.push('combined clause glyph overlap');
            }
            if (before.spring !== 'stiff' || Math.round(before.rawShown * 100) / 100 !== before.shown ||
              Math.abs(before.physicalPush - Math.round(4 * before.shown * 100) / 100) > 1e-9) errors.push('native model basis');
            const identity = element.isConnected && element === document.querySelector('[data-figure-frame="impedance-press"]') &&
              element.ownerDocument === nativeDocument && performance.timeOrigin === input.timeOrigin &&
              originalNodes.every((node, index) => node.isConnected && node === element.querySelector(originalSelectors[index]));
            if (!identity) errors.push('document/frame/native member identity');
            if (innerWidth !== input.profile.width || devicePixelRatio !== input.profile.dpr || matchMedia('(prefers-reduced-motion: reduce)').matches) errors.push('native viewport or motion profile');
            const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
            if (overflow !== 0) errors.push(`document overflow:${overflow}`);
            const after = state();
            if (JSON.stringify(before) !== JSON.stringify(after)) errors.push('state changed within atomic geometry sample');
            return { before, after, expected, expectedPush, errors, identity, values, descriptors: descriptorReadings, namedProduct, condition: conditionReading, primary: primaryReading, law: lawReading, dial: dialReading, causalMarks, combinedClauses,
              frame: frameBox, calculation: calculationBox, equation: equationBox, descriptions: descriptionsBox, overflow,
              position: { box: positionBox, marks: marksBox, labels: labelsBox, surface: surfaceBox, tool: toolBox, target: targetBox, gap: gapBox, words: positionWords } };
          };
          return new Promise<{
            finishedBecause: string; trace: Array<ReturnType<typeof state> & { atMs: number }>;
            fractional: ReturnType<typeof measure> | null; settled: ReturnType<typeof measure> | null;
          }>((resolve) => {
            const trace: Array<ReturnType<typeof state> & { atMs: number }> = [];
            let fractional: ReturnType<typeof measure> | null = null, settled: ReturnType<typeof measure> | null = null;
            let sawRunning = false, frameId = 0;
            const started = performance.now();
            const finish = (finishedBecause: string) => {
              cancelAnimationFrame(frameId); clearTimeout(deadline);
              resolve({ finishedBecause, trace, fractional, settled });
            };
            const deadline = setTimeout(() => finish('timed out observing native Run'), 12_000);
            const observe = () => {
              const current = state();
              trace.push({ ...current, atMs: performance.now() - started });
              if (current.runText === 'Stop the press') sawRunning = true;
              // Eligibility uses the actual shown model basis and independent
              // rate-four arithmetic, never rendered correctness or geometry.
              const shownPush = Number((4 * current.displayedGap).toFixed(1));
              const fourCharacterFraction = String(current.displayedGap).length === 3 && String(shownPush).length === 4 &&
                !Number.isInteger(shownPush) && shownPush > 10 && shownPush < 12;
              if (!fractional && current.spring === 'stiff' && current.runText === 'Stop the press' && fourCharacterFraction) fractional = measure();
              if (sawRunning && current.runText === 'Run the press' && current.shown === 3) {
                settled = measure(); finish('native Run completed'); return;
              }
              frameId = requestAnimationFrame(observe);
            };
            frameId = requestAnimationFrame(observe);
          });
        }, { census, profile, parentFont, timeOrigin });
        await run.focus();
        await run.press('Enter');
        const result = await sampling;
        const activity = await page.evaluate(takeReleaseActivity);
        const nativeActions = activity.operations.filter((operation) => operation.kind === 'keydown' && operation.key === 'Enter');
        observations.push({ profile, selectors: RELEASE_TEXT_ONLY_SELECTORS, parentFont, census, ...result, nativeActions });
        expect(result.finishedBecause, profile.id).toBe('native Run completed');
        expect(nativeActions.map(({ trusted, target }) => ({ trusted, id: target.testId })), profile.id).toEqual([
          { trusted: true, id: 'press-spring-stiff' }, { trusted: true, id: 'press-run' },
        ]);
        expect(result.fractional, `${profile.id}: native Run must expose a four-character high fractional push; every observed frame is attached`).not.toBeNull();
        const fractional = result.fractional!, shownGap = fractional.before.displayedGap;
        const expectedPush = Number((4 * shownGap).toFixed(1));
        expect(fractional.before.chosenTarget, 'Run preserves the original chosen target while the shown target moves').toBe(2);
        expect(fractional.before.chosenTarget).not.toBe(shownGap);
        expect(result.settled!.before.chosenTarget, 'natural completion commits the maximum chosen target').toBe(3);
        expect(String(shownGap)).toHaveLength(3);
        expect(String(expectedPush)).toHaveLength(4);
        expect(Number.isInteger(expectedPush)).toBe(false);
        expect(expectedPush).toBeGreaterThan(10);
        expect(expectedPush).toBeLessThan(12);
        expect(fractional.values.map(({ text }) => text)).toEqual(['4', '×', String(shownGap), '=', String(expectedPush)]);
        expect(fractional.errors, `${profile.id}: first fractional sample`).toEqual([]);
        expect(result.settled!.values.map(({ text }) => text)).toEqual(['4', '×', '3', '=', '12']);
        expect(result.settled!.errors, `${profile.id}: native settled maximum`).toEqual([]);
        expect(await original.evaluate((element, origin) => element.isConnected &&
          element === document.querySelector('[data-figure-frame="impedance-press"]') && performance.timeOrigin === origin, timeOrigin)).toBe(true);
      } finally { await context.close(); }
    }
  } finally {
    const preserved = sources.map(({ path, bytes }) => ({ path, sameBytes: readFileSync(join(process.cwd(), path)).equals(bytes) }));
    await testInfo.attach('press-fractional-native-geometry', {
      body: Buffer.from(JSON.stringify({ observations, preserved }, null, 2)), contentType: 'application/json',
    });
    expect(preserved.filter(({ sameBytes }) => !sameBytes), 'press source and canonical text helpers stay unchanged during the regression').toEqual([]);
  }
});


// The default controller diagram has its own independently pinned linear
// [-2, 3] ruler. The retained isometric press is checked separately above.
test('press default position diagram preserves native boundaries, labels and paint in every narrow and forced profile', async ({ browser, staticBase }, testInfo) => {
  test.setTimeout(180_000);
  const { captureTextPopulation } = await import('./helpers/release-text-profile');
  const { installReleaseActivityObserver, takeReleaseActivity } = await import('./helpers/release-activity');
  const sourcePaths = ['components/interactive/impedance-press.tsx', 'lib/impedance-press.ts', 'components/iso/figures/spring-press.ts', 'components/iso/iso-kit.ts', 'components/iso/iso.css', 'lib/brand-v2-release-text.ts', 'tests/e2e/helpers/release-text-profile.ts'];
  const sources = sourcePaths.map((path) => ({ path, bytes: readFileSync(join(process.cwd(), path)) }));
  const observations: unknown[] = [];
  const profiles = [
    { id: 'desktop', width: 1280, height: 900, dpr: 1, scale: 1, forcedColors: 'none', colorScheme: 'light' },
    { id: 'phone', width: 375, height: 812, dpr: 1, scale: 1, forcedColors: 'none', colorScheme: 'light' },
    { id: 'desktop-forced-light', width: 1280, height: 900, dpr: 1, scale: 1, forcedColors: 'active', colorScheme: 'light' },
    { id: 'phone-forced-light', width: 375, height: 812, dpr: 1, scale: 1, forcedColors: 'active', colorScheme: 'light' },
    { id: 'desktop-forced-dark', width: 1280, height: 900, dpr: 1, scale: 1, forcedColors: 'active', colorScheme: 'dark' },
    { id: 'phone-forced-dark', width: 375, height: 812, dpr: 1, scale: 1, forcedColors: 'active', colorScheme: 'dark' },
    { id: 'canonical-text-200-375', width: 375, height: 812, dpr: 1, scale: 2, forcedColors: 'none', colorScheme: 'light' },
    { id: 'zoom-equivalent-200-187', width: 187, height: 406, dpr: 2, scale: 1, forcedColors: 'none', colorScheme: 'light' },
  ] as const;
  try {
    for (const profile of profiles) {
      const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height },
        deviceScaleFactor: profile.dpr, forcedColors: profile.forcedColors, colorScheme: profile.colorScheme, reducedMotion: 'reduce' });
      try {
        await context.addInitScript(installReleaseActivityObserver);
        const page = await context.newPage();
        await page.goto(`${staticBase}/manipulation/action-spaces/`);
        await page.evaluate(() => document.fonts.ready);
        const frame = page.locator('[data-figure-frame="impedance-press"]');
        await expect(frame).toBeVisible();
        await expect.poll(() => frame.evaluate((element) => Object.keys(element).some((key) => key.startsWith('__reactFiber$')))).toBe(true);
        const original = (await frame.elementHandle())!, timeOrigin = await page.evaluate(() => performance.timeOrigin);
        const census = await page.evaluate(captureTextPopulation, [...RELEASE_TEXT_ONLY_SELECTORS]);
        if (profile.scale === 2) await page.addStyleTag({ content: census.map(({ baselinePx }, index) =>
          `[data-release-text-probe="${index}"]{font-size:${baselinePx * 2}px!important}`).join('\n') });
        const method = frame.locator('details[data-figure-fold="method"]'), summary = method.locator(':scope > summary');
        await expect(frame.locator('details')).toHaveCount(1);
        await expect(method).toHaveJSProperty('open', false);
        await expect(summary).toHaveText('How this was made');
        await expect(frame.getByTestId('press-drawing')).toBeHidden();
        await expect(frame.getByTestId('press-chosen-settings')).toHaveText('Action: target +2 and stiffness 2.');
        const slider = frame.getByRole('slider', { name: 'Target', exact: true });
        await expect(slider).toHaveAttribute('min', '-2');
        await expect(slider).toHaveAttribute('max', '3');
        await expect(slider).toHaveAttribute('step', '0.5');
        await expect(slider).toHaveValue('2');
        await expect(frame.getByTestId('press-spring-medium')).toHaveAttribute('aria-pressed', 'true');
        const settle = () => page.evaluate(() => new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }));
        const probe = (target: number, spring: string, rate: number) => original.evaluate((element, input) => {
          const required = <T extends HTMLElement>(selector: string) => {
            const node = element.querySelector<T>(selector);
            if (!node) throw new Error(`Missing default position member: ${selector}`);
            return node;
          };
          const q = (id: string) => required<HTMLElement>(`[data-testid="${id}"]`);
          const packet = q('press-action-packet'), diagram = q('press-position-diagram'), marks = q('press-position-marks');
          const labels = q('press-position-labels'), condition = q('press-position-condition'), shown = q('press-shown-target');
          const surface = q('press-position-surface'), tool = q('press-position-tool'), targetLine = q('press-position-target'), gapMark = q('press-position-gap');
          const toolKey = q('press-position-tool-key');
          const gapKey = q('press-position-gap-key'), gapDescription = q('press-gap-description');
          const fold = required<HTMLDetailsElement>('details[data-figure-fold="method"]');
          const slider = required<HTMLInputElement>('input[type="range"]'), run = q('press-run');
          const errors: string[] = [], tolerance = 0.3;
          const bounds = (node: Element) => {
            const { left, right, top, bottom, width, height } = node.getBoundingClientRect();
            return { left, right, top, bottom, width, height };
          };
          type Bounds = ReturnType<typeof bounds>;
          const insideX = (a: Bounds, b: Bounds) => a.left >= b.left - tolerance && a.right <= b.right + tolerance;
          const inside = (a: Bounds, b: Bounds) => insideX(a, b) && a.top >= b.top - tolerance && a.bottom <= b.bottom + tolerance;
          const overlaps = (a: Bounds, b: Bounds) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > tolerance && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > tolerance;
          const close = (name: string, actual: number, expected: number) => {
            if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) errors.push(name);
          };
          const fb = bounds(element), db = bounds(diagram), mb = bounds(marks), lb = bounds(labels);
          const sb = bounds(surface), tb = bounds(tool), ab = bounds(targetLine), gb = bounds(gapMark);
          const expectedTool = Math.min(input.target, 0), expectedGap = Math.max(input.target, 0), expectedPush = Number((input.rate * expectedGap).toFixed(1));
          // Independent coordinate convention: zero is two fifths down a ruler
          // that runs from -2 to 3; positive targets cannot move the tool past 0.
          const y = (value: number) => mb.top + (value + 2) / 5 * mb.height;
          close('surface y', sb.top, y(0)); close('target y', ab.top, y(input.target));
          close('tool y', (tb.top + tb.bottom) / 2, y(expectedTool));
          close('gap top', gb.top, y(expectedTool)); close('gap span', gb.height, expectedGap / 5 * mb.height);
          if (!(mb.width > 0 && mb.height > 0 && tb.width > 0 && tb.height > 0)) errors.push('empty visible geometry');
          for (const [name, actual, expected] of [['target', Number(diagram.dataset.target), input.target], ['tool', Number(diagram.dataset.tool), expectedTool],
            ['gap', Number(diagram.dataset.gap), expectedGap], ['push', Number(diagram.dataset.push), expectedPush]] as const) {
            if (actual !== expected) errors.push(`model value:${name}`);
          }
          if (Number(slider.value) !== input.target || q('press-drawing').dataset.spring !== input.spring ||
            q(`press-spring-${input.spring}`).getAttribute('aria-pressed') !== 'true') errors.push('native chosen settings');
          const targetWords = input.target === 0 ? 'on the surface' : `${Math.abs(input.target)} ${Math.abs(input.target) === 1 ? 'mark' : 'marks'} ${input.target < 0 ? 'short of surface' : 'past surface'}`;
          if (q('press-target').textContent?.trim() !== targetWords || shown.textContent?.trim() !== `Shown target: ${targetWords}`) errors.push('chosen/shown wording');
          const expectedCondition = input.target > 0 ? 'The surface stops the tool.' : input.target < 0
            ? 'Before contact, the tool follows its target without pushing.' : 'Tool and target meet the surface without pushing.';
          if (condition.textContent?.trim() !== expectedCondition) errors.push('contact/free/zero semantics');
          const sentTarget = input.target, sentRate = input.rate;
          const sentTargetText = (sentTarget > 0 ? '+' : '') + String(sentTarget);
          const sentActionText = 'An action sends target and stiffness;';
          const sentPrimaryText = `${sentActionText} once the surface stops the tool, push equals stiffness times target gap.`;
          const primary = q('press-primary-takeaway'), controller = q('press-controller-output'), settings = q('press-settings');
          const rule = q('press-general-rule'), responseDiagram = q('press-response-diagram');
          const response = q('press-response-label'), calculation = q('press-calculation');
          const product = q('press-contact-product'), descriptions = q('press-value-descriptions'), equation = q('press-equation');
          const follows = (before: Element, after: Element) => Boolean(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING);
          const sendPath = q('press-send-path'), contactClause = q('press-contact-clause'), connector = q('press-send-connector');
          const controllerHeading = q('press-controller-heading');
          if (q('press-chosen-settings').textContent?.trim() !== `Action: target ${sentTargetText} and stiffness ${sentRate}.` || !packet.contains(slider) || !packet.contains(run) ||
            !packet.contains(primary) || !packet.contains(controller) || !controller.contains(calculation) ||
            !follows(primary, controller) || !follows(q('press-chosen-settings'), controller) ||
            !follows(q('press-chosen-settings'), settings) || !follows(settings, run) ||
            !controller.contains(responseDiagram) || !responseDiagram.contains(diagram) ||
            !primary.contains(rule) || !follows(primary, sendPath) || !follows(sendPath, response) || !follows(response, condition) ||
            !follows(rule, equation) || !follows(condition, responseDiagram) || !follows(responseDiagram, q('press-sent-rule')) || !follows(q('press-sent-rule'), calculation) ||
            !follows(calculation, q('press-scale-definitions')) || !follows(controllerHeading, response)) errors.push('action packet and controller order');
          if (JSON.stringify([...product.children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify([
            'press-response-label', 'press-position-condition', 'press-response-diagram', 'press-sent-rule', 'press-result-with-dial', 'press-scale-definitions']) ||
            condition.parentElement !== product || toolKey.parentElement !== condition ||
            JSON.stringify([...controller.children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-send-path', 'press-contact-product']) ||
            JSON.stringify([...sendPath.children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-send-connector', 'press-controller-heading']) ||
            contactClause.parentElement !== condition || response.parentElement !== product || sendPath.parentElement !== controller ||
            connector.getAttribute('data-from') !== 'press-action-message' || connector.getAttribute('data-to') !== 'press-controller-output') errors.push('exact response condition/law/product/diagram order');
          const action = q('press-action-clause');
          if (primary.tagName !== 'P' || action.parentElement !== primary || rule.tagName !== 'SPAN' || rule.parentElement !== q('press-product-rule') ||
            getComputedStyle(action).display !== 'inline' || getComputedStyle(rule.parentElement!).display !== 'inline' ||
            !follows(action, rule) || primary.querySelector('button,input,details') || controller.querySelector('button,input,details') ||
            !controller.contains(condition) || !follows(rule, condition)) errors.push('connected action and product statement');
          if (primary.textContent?.replace(/\s+/g, ' ').trim() !== sentPrimaryText ||
            rule.textContent?.trim() !== 'once the surface stops the tool, push equals stiffness times target gap.') errors.push('complete visible action mechanism');
          if (!inside(bounds(action), bounds(primary)) || !inside(bounds(rule), bounds(q('press-primary-takeaway'))) ||
            getComputedStyle(primary).fontWeight !== '600' || getComputedStyle(action).fontWeight !== getComputedStyle(primary).fontWeight) errors.push('combined primary containment/weight');
          const stage = required<HTMLElement>('[data-figure-stage]'), drawingOwner = diagram.closest<HTMLElement>('[data-anatomy-drawing]');
          const nativeControls = q('press-native-controls');
          if (element.querySelectorAll('[data-figure-stage]').length !== 1 || !drawingOwner ||
            drawingOwner.parentElement !== stage || !drawingOwner.classList.contains('iso') ||
            stage.querySelectorAll('[data-anatomy-drawing]').length !== 1 ||
            !drawingOwner.contains(primary) || !drawingOwner.contains(controller) || !drawingOwner.contains(nativeControls) ||
            responseDiagram.hasAttribute('data-anatomy-drawing') || responseDiagram.classList.contains('iso')) errors.push('response diagram scientific drawing context');
          if (element.querySelectorAll('[data-figure-controls]').length !== 1 || !nativeControls.hasAttribute('data-figure-controls') ||
            !nativeControls.contains(q('press-chosen-settings')) || !nativeControls.contains(settings) || !nativeControls.contains(run) ||
            nativeControls.querySelectorAll('button,input').length !== 5 || !follows(primary, nativeControls) || !follows(nativeControls, controller)) errors.push('stage native control ownership');
          const nativeRow = slider.closest<HTMLElement>('[data-figure-control-row]')!;
          const nativeValue = nativeRow.querySelector<HTMLElement>('[data-figure-control-value]')!;
          const sliderBounds = bounds(slider), valueBounds = bounds(nativeValue);
          const outlineStyle = getComputedStyle(slider);
          // A wrapped value must leave room for the registered 1px keyboard
          // outline and 2px offset; its forced Canvas must not overpaint it.
          const wrappedValue = valueBounds.top >= sliderBounds.bottom - tolerance &&
            Math.min(valueBounds.right, sliderBounds.right) > Math.max(valueBounds.left, sliderBounds.left);
          const minimumFocusClearance = Math.max(3, parseFloat(outlineStyle.outlineWidth) + parseFloat(outlineStyle.outlineOffset));
          const focusClearance = { wrappedValue, gap: valueBounds.top - sliderBounds.bottom, minimum: minimumFocusClearance,
            focusVisible: slider.matches(':focus-visible'), outlineWidth: outlineStyle.outlineWidth, outlineOffset: outlineStyle.outlineOffset,
            rowGap: getComputedStyle(nativeRow).rowGap, slider: sliderBounds, value: valueBounds };
          if (wrappedValue && focusClearance.gap < minimumFocusClearance - tolerance) errors.push('native focus clearance');
          const role = q('press-controller-role');
          if (role.textContent?.trim() !== 'uses these settings to make the tool act like a spring.' ||
            document.getElementById(controller.getAttribute('aria-describedby') ?? '') !== role ||
            response.textContent?.trim() !== 'Shown response' || !follows(role, response) || !follows(response, calculation)) errors.push('controller role and shown response');
          const scale = q('press-scale-definitions');
          if (scale.textContent?.trim() !== 'Ruler: target gap. Dial: push.' ||
            !controller.contains(scale) || !follows(calculation, scale) || !follows(q('press-chosen-settings'), scale)) errors.push('adjacent scale definitions');
          for (const node of [primary, controller, role, response, responseDiagram, diagram, condition, rule, calculation, scale]) {
            if (!node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || node.closest('details:not([open]),[hidden]')) errors.push(`hidden connected explanation:${node.dataset.testid}`);
          }
          if (fold.open || q('press-drawing').closest('details') !== fold || q('press-gap-guide').closest('details') !== fold) errors.push('closed method reference');
          if (marks.getAttribute('aria-hidden') !== 'true' || getComputedStyle(marks).pointerEvents !== 'none') errors.push('decorative marks interaction');
          const labelParagraphs = [...labels.querySelectorAll<HTMLElement>('p')];
          if (labelParagraphs.length !== 2 || labelParagraphs[0].textContent?.trim() !== 'Surface stops tool' || labelParagraphs[1] !== shown || labels.contains(condition)) errors.push('surface label');
          if (getComputedStyle(labelParagraphs[0].querySelector('span')!).borderTopStyle !== 'solid' ||
            getComputedStyle(shown.querySelector('span')!).borderTopStyle !== 'dashed') errors.push('legend stroke identity');
          const surfaceCss = getComputedStyle(surface), targetCss = getComputedStyle(targetLine), toolCss = getComputedStyle(tool), gapCss = getComputedStyle(gapMark);
          const ink = getComputedStyle(marks).color, canvas = getComputedStyle(required('[data-figure-stage]')).backgroundColor;
          if (surfaceCss.borderTopStyle !== 'solid' || parseFloat(surfaceCss.borderTopWidth) <= 0 || surfaceCss.borderTopColor !== ink) errors.push('surface paint');
          if (targetCss.borderTopStyle !== 'dashed' || parseFloat(targetCss.borderTopWidth) <= 0 || targetCss.borderTopColor !== ink) errors.push('target paint');
          if (toolCss.backgroundColor !== ink) errors.push('tool paint');
          if (toolKey.getAttribute('aria-hidden') !== 'true' || getComputedStyle(toolKey).backgroundColor !== toolCss.backgroundColor ||
            bounds(toolKey).width !== tb.width || bounds(toolKey).height !== tb.height) errors.push('tool legend identity');
          // A constant bracket key labels the existing gap descriptor even at
          // zero; only the physical bracket collapses with the modelled gap.
          const gapKeyBox = bounds(gapKey), gapKeyCss = getComputedStyle(gapKey);
          const gapPrimary = q('press-equation').querySelector<HTMLElement>('[data-operation-value="gap"]')!;
          if (gapKey.parentElement !== gapDescription || gapKey.nextElementSibling !== gapDescription.querySelector('[data-operation-label="gap"]') ||
            gapKey.getAttribute('aria-hidden') !== 'true' || document.getElementById(gapPrimary.getAttribute('aria-describedby') ?? '') !== gapDescription ||
            gapDescription.textContent?.replace(/\s+/g, ' ').trim() !== `target gap: ${expectedGap} ruler marks`) errors.push('gap legend descriptor binding');
          close('gap legend width', gapKeyBox.width, gb.width); close('gap legend height', gapKeyBox.height, 12);
          if (!gapKey.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || !inside(gapKeyBox, bounds(gapDescription)) ||
            [gapKeyCss.borderTopStyle, gapKeyCss.borderRightStyle, gapKeyCss.borderBottomStyle].some((style) => style !== 'solid') ||
            [gapKeyCss.borderTopWidth, gapKeyCss.borderRightWidth, gapKeyCss.borderBottomWidth].some((width) => parseFloat(width) !== 1) ||
            parseFloat(gapKeyCss.borderLeftWidth) !== 0 ||
            [gapKeyCss.borderTopColor, gapKeyCss.borderRightColor, gapKeyCss.borderBottomColor].some((color) => color !== ink)) errors.push('gap legend paint');
          if (expectedGap === 0) {
            if (gb.height !== 0 || ['borderTopWidth', 'borderBottomWidth', 'borderRightWidth'].some((key) => parseFloat(gapCss[key as 'borderTopWidth']) !== 0)) errors.push('painted zero gap');
          } else if (gapCss.borderRightStyle !== 'solid' || parseFloat(gapCss.borderRightWidth) <= 0 || gapCss.borderRightColor !== ink) errors.push('gap paint');
          const forced = matchMedia('(forced-colors: active)').matches;
          if (forced !== (input.profile.forcedColors === 'active') || forced && (ink === canvas || toolCss.backgroundColor === canvas)) errors.push('forced-colour contrast');
          for (const node of [packet, diagram, labels, marks, surface, targetLine, tool, condition, shown, q('press-calculation')]) {
            if (!node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || node.closest('details:not([open]),[hidden]')) errors.push(`hidden default member:${node.dataset.testid}`);
          }
          // At the standard phone profile the complete annotated diagram,
          // connected claim and every native control fit in the first frame.
          if (input.profile.width === 375 && input.profile.scale === 1) {
            for (const node of [primary, controller, settings, run, diagram]) {
              const rect = bounds(node);
              if (rect.top < fb.top - tolerance || rect.bottom - fb.top > input.profile.height + tolerance) errors.push(`phone first-screen member:${node.dataset.testid}`);
            }
          }
          for (const node of [primary, controller, responseDiagram, diagram, rule, calculation, scale, nativeControls]) {
            if (!inside(bounds(node), bounds(stage)) || !drawingOwner || !inside(bounds(node), bounds(drawingOwner))) errors.push(`stage containment:${node.dataset.testid}`);
          }
          for (const rect of [db, sb, tb, ab, gb, lb]) if (!inside(rect, fb)) errors.push('frame containment');
          for (const rect of [sb, tb, ab, gb, lb]) if (!inside(rect, db)) errors.push('diagram containment');
          if (overlaps(mb, lb)) errors.push('marks/labels overlap');
          for (let i = 0; i < labelParagraphs.length; i++) for (let j = i + 1; j < labelParagraphs.length; j++) {
            if (overlaps(bounds(labelParagraphs[i]), bounds(labelParagraphs[j]))) errors.push('label paragraph overlap');
          }
          const namedRowIds = ['press-stiffness-product-row', 'press-gap-product-row', 'press-push-product-row'];
          const namedKinds = ['stiffness', 'gap', 'push'];
          const namedValues = [String(input.rate), String(expectedGap), String(expectedPush)];
          const namedOperators = [null, 'press-gap-product-operator', 'press-push-product-operator'];
          const namedOperatorTexts = [null, '× times', '= equals'];
          const namedRows = namedRowIds.map((id) => q(id));
          const namedParagraphNodes = namedRows.flatMap((row) => [...row.querySelectorAll<HTMLElement>('p')]);
          const positiveBounds = (rect: Bounds) => ['left', 'right', 'top', 'bottom', 'width', 'height']
            .every((key) => Number.isFinite(rect[key as keyof Bounds])) && rect.width > 0 && rect.height > 0;
          const productText = (node: HTMLElement, containers: Array<[string, Bounds]>, label: string) => {
            const id = node.dataset.testid, rect = bounds(node), css = getComputedStyle(node);
            const baseline = input.census[Number(node.dataset.releaseTextProbe)]?.baselinePx;
            const visible = node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
              !node.closest('details:not([open]),[hidden],[aria-hidden="true"]');
            if (!visible) errors.push(label + ' hidden:' + id);
            if (node.tagName !== 'P' || node.querySelector('p')) errors.push(label + ' paragraph identity:' + id);
            const expectedBase = id === 'press-sent-rule' || id === 'press-chosen-settings' ? 16 : label === 'named product' ? 16 : label === 'combined primary' ? 20 : 14;
            const expectedWeight = id === 'press-sent-rule' ? '400' : label === 'combined primary' || id?.endsWith('-operator') ? '600' : '400';
            if (!Number.isFinite(baseline) || Math.abs(baseline - expectedBase) > 0.5 || css.fontWeight !== expectedWeight) errors.push(label + ' source typography:' + id);
            const leafTypography: Array<{ text: string; paragraph: string | undefined; baseline: number; fontSize: number; fontWeight: string; visible: boolean }> = [];
            if (!Number.isFinite(baseline) || Math.abs(parseFloat(css.fontSize) - baseline * input.profile.scale) > 0.5) errors.push(label + ' canonical text size:' + id);
            if (!positiveBounds(rect) || containers.some(([, container]) => !inside(rect, container))) errors.push(label + ' paragraph containment:' + id);
            const glyphs: Bounds[] = [], words: Array<{ word: string; rects: Bounds[] }> = [];
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
            for (let text = walker.nextNode(); text; text = walker.nextNode()) {
              if (!(text.textContent ?? '').trim()) continue;
              const leaf = text.parentElement!, leafCss = getComputedStyle(leaf), paragraph = leaf.closest('p');
              const emphasized = id !== 'press-sent-rule' && (label === 'combined primary' || leaf.closest('[data-operation-label],[data-testid="press-gap-product-operator"],[data-testid="press-push-product-operator"]'));
              const leafVisible = leaf.checkVisibility({ opacityProperty: true, visibilityProperty: true });
              if (paragraph !== node || !leafVisible || Math.abs(parseFloat(leafCss.fontSize) - baseline * input.profile.scale) > 0.5 ||
              leafCss.fontWeight !== (emphasized ? '600' : '400')) errors.push(label + ' leaf inherited typography:' + id);
              leafTypography.push({ text: text.textContent!.trim(), paragraph: (paragraph as HTMLElement | null)?.dataset.testid, baseline, fontSize: parseFloat(leafCss.fontSize), fontWeight: leafCss.fontWeight, visible: leafVisible });
              const full = document.createRange(); full.selectNodeContents(text);
              const rangeBoxes = (range: Range): Bounds[] => [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0)
                .map(({ left, right, top, bottom, width, height }) => ({ left, right, top, bottom, width, height }));
              glyphs.push(...rangeBoxes(full));
              for (const match of (text.textContent ?? '').matchAll(/\S+/g)) {
                const range = document.createRange(); range.setStart(text, match.index); range.setEnd(text, match.index + match[0].length);
                const rects = rangeBoxes(range);
                if (rects.length !== 1 || rects.some((r) => !inside(r, rect) || containers.some(([, container]) => !inside(r, container)))) errors.push(label + ' whole word:' + id + ':' + match[0]);
                words.push({ word: match[0], rects });
              }
            }
            if (!glyphs.length || glyphs.some((r) => !positiveBounds(r) || !inside(r, rect) || containers.some(([, container]) => !inside(r, container)))) errors.push(label + ' glyph containment:' + id);
            return { id, tag: node.tagName, text: node.textContent?.replace(/\s+/g, ' ').trim(), box: rect, baseline,
              fontSize: parseFloat(css.fontSize), fontWeight: css.fontWeight, visible, leafTypography, glyphs, words };
          };
          if (JSON.stringify([...descriptions.children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(namedRowIds) ||
            namedParagraphNodes.length !== 5 || descriptions.parentElement !== calculation || equation.parentElement !== calculation ||
            JSON.stringify([...calculation.children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-value-descriptions', 'press-equation'])) errors.push('named product row/calculation identity');
          if (bounds(descriptions).bottom > bounds(equation).top + tolerance) errors.push('named product before numeric equation');
          const namedProduct = namedRows.map((row, index) => {
            const kind = namedKinds[index], rowBox = bounds(row), description = q('press-' + kind + '-description');
            const operatorId = namedOperators[index], operator = operatorId ? q(operatorId) : null;
            const expectedChildren = operatorId ? [operatorId, 'press-' + kind + '-description'] : ['press-' + kind + '-description'];
            if (row.parentElement !== descriptions || JSON.stringify([...row.children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(expectedChildren) ||
              description.parentElement !== row || operator && (operator.parentElement !== row || operator.nextElementSibling !== description)) errors.push('named product sibling identity:' + kind);
            if (!row.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || !positiveBounds(rowBox) ||
              !inside(rowBox, bounds(descriptions)) || !inside(rowBox, bounds(calculation)) || !inside(rowBox, fb)) errors.push('named product row containment:' + kind);
            const main = equation.querySelector<HTMLElement>('[data-operation-value="' + kind + '"]');
            const copy = description.querySelector<HTMLElement>('[data-description-value="' + kind + '"]');
            const expectedText = kind === 'stiffness' ? 'sent stiffness: ' + namedValues[index] : kind === 'gap'
              ? 'target gap: ' + namedValues[index] + ' ruler marks' : 'push: ' + namedValues[index] + ' dial marks';
            if (!main || main.textContent?.trim() !== namedValues[index] || copy?.textContent?.trim() !== namedValues[index] ||
              description.textContent?.replace(/\s+/g, ' ').trim() !== expectedText ||
              document.getElementById(main?.getAttribute('aria-describedby') ?? '') !== description) errors.push('named product value/description agreement:' + kind);
            const containers: Array<[string, Bounds]> = [['row', rowBox], ['descriptions', bounds(descriptions)], ['calculation', bounds(calculation)], ['frame', fb]];
            const descriptor = productText(description, containers, 'named product');
            const operation = operator ? productText(operator, containers, 'named product') : null;
            if (operation && operation.text !== namedOperatorTexts[index]) errors.push('named product operator text:' + kind);
            if (operation && (overlaps(operation.box, descriptor.box) || operation.glyphs.some((a) => descriptor.glyphs.some((b) => overlaps(a, b))))) errors.push('named product operator/descriptor overlap:' + kind);
            if (index && (bounds(namedRows[index - 1]).bottom > rowBox.top + tolerance || overlaps(bounds(namedRows[index - 1]), rowBox))) errors.push('named product vertical row order:' + kind);
            return { kind, id: row.dataset.testid, box: rowBox, descriptor, operator: operation,
              primaryValue: main?.textContent, descriptionValue: copy?.textContent, primaryDescriptionId: main?.getAttribute('aria-describedby'), descriptionId: description.id };
          });
          const conditionBox = bounds(condition), productBox = bounds(product);
          const conditionReading = productText(condition, [['contact product', productBox], ['frame', fb]], 'moved condition');
          const primaryReading = productText(primary, [['stage', bounds(stage)], ['frame', fb]], 'combined primary');
          if (!inside(conditionBox, productBox) || !inside(conditionBox, bounds(stage)) ||
            overlaps(conditionBox, bounds(rule)) || overlaps(conditionBox, bounds(response)) ||
            labelParagraphs.some((node) => overlaps(conditionBox, bounds(node)))) errors.push('moved condition owner/geometry');
          /** Browser observer template for the new R31 dial. It is injected unchanged into
           * both existing native probes after the designer freezes the source contract.
           * Its expectation is derived from each probe's original independent model. */
          function readPushDial(frame: Element, expectedPush: number, expectedInk: string, tolerance: number) {
            type DialBox = { left: number; right: number; top: number; bottom: number; width: number; height: number };
            const errors: string[] = [];
            const dial = frame.querySelector<SVGSVGElement>('[data-testid="press-push-dial"]');
            if (!dial) return { errors: ['dial missing'], expectedPush, missing: true };
            const bounds = (node: Element): DialBox => {
              const { left, right, top, bottom, width, height } = node.getBoundingClientRect();
              return { left, right, top, bottom, width, height };
            };
            const positive = (r: DialBox) => Object.values(r).every(Number.isFinite) && r.width > 0 && r.height > 0;
            const inside = (a: DialBox, b: DialBox) => a.left >= b.left - tolerance && a.right <= b.right + tolerance && a.top >= b.top - tolerance && a.bottom <= b.bottom + tolerance;
            const near = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
            const visible = (node: Element) => node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
              !node.closest('details:not([open]),[hidden]') && getComputedStyle(node).opacity === '1';
            const number = (node: Element, name: string) => Number(node.getAttribute(name));
            const point = (node: SVGGraphicsElement, x: number, y: number) => {
              const matrix = node.getScreenCTM();
              if (!matrix) { errors.push('dial missing screen transform'); return { x: Number.NaN, y: Number.NaN }; }
              const result = new DOMPoint(x, y).matrixTransform(matrix);
              return { x: result.x, y: result.y };
            };
            const angle = (push: number) => (-135 + 270 * Math.max(0, Math.min(push, 12)) / 12) * Math.PI / 180;
            const polar = (push: number, radius: number) => ({ x: 56 + Math.sin(angle(push)) * radius, y: 50 - Math.cos(angle(push)) * radius });
            const samePoint = (a: { x: number; y: number }, b: { x: number; y: number }) => near(a.x, b.x) && near(a.y, b.y);
            const stroke = (node: Element, width: number) => {
              const css = getComputedStyle(node);
              return visible(node) && css.stroke === expectedInk && css.strokeOpacity === '1' && near(parseFloat(css.strokeWidth), width);
            };
            const dialBox = bounds(dial), frameBox = bounds(frame), css = getComputedStyle(dial);
            if (!visible(dial)) errors.push('dial hidden');
            if (!positive(dialBox) || !inside(dialBox, frameBox)) errors.push('dial containment');
            if (dial.getAttribute('viewBox') !== '0 0 112 112' || dial.getAttribute('data-min') !== '0' || dial.getAttribute('data-max') !== '12') errors.push('dial scale identity');
            if (dial.getAttribute('data-push') !== String(expectedPush) || css.color !== expectedInk) errors.push('dial model/ink basis');
            const description = frame.querySelector<HTMLElement>('[data-testid="press-push-description"]');
            const references = (dial.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
            const scaleDescription = dial.querySelector('desc');
            if (dial.getAttribute('role') !== 'img' || dial.getAttribute('aria-label') !== 'Push dial' ||
              references.length !== 2 || !description || !scaleDescription || scaleDescription.textContent?.replace(/\s+/g, ' ').trim() !== 'Schematic push scale from 0 to 12 dial marks, without physical units.' || !references.includes(description.id) || !references.includes(scaleDescription.id) ||
              references.some(id => document.getElementById(id) !== (id === description?.id ? description : scaleDescription)) ||
              description.querySelector('[data-description-value="push"]')?.textContent?.trim() !== String(expectedPush)) errors.push('dial accessible/value binding');
            const face = dial.querySelectorAll<SVGCircleElement>(':scope > circle');
            if (face.length !== 2 || number(face[0], 'cx') !== 56 || number(face[0], 'cy') !== 50 || number(face[0], 'r') !== 34 ||
              !stroke(face[0], 1) || getComputedStyle(face[0]).fill !== 'none' ||
              !samePoint(point(face[0], 56, 50), point(dial, 56, 50)) || !samePoint(point(face[0], 90, 50), point(dial, 90, 50)) || !samePoint(point(face[0], 56, 84), point(dial, 56, 84)) ||
              number(face[1], 'cx') !== 56 || number(face[1], 'cy') !== 50 || number(face[1], 'r') !== 2 ||
              !visible(face[1]) || getComputedStyle(face[1]).fill !== expectedInk) errors.push('dial face/pivot geometry or paint');
            const marks = [...dial.querySelectorAll<SVGGElement>('[data-dial-mark]')];
            if (JSON.stringify(marks.map(node => node.getAttribute('data-dial-mark'))) !== JSON.stringify(Array.from({ length: 13 }, (_, index) => String(index)))) errors.push('dial tick population');
            const tickReadings = marks.map((mark, index) => {
              const line = mark.querySelector<SVGLineElement>('line'), label = mark.querySelector<SVGTextElement>('text'), major = index % 4 === 0;
              const inner = polar(index, major ? 27 : 30), outer = polar(index, 34), labelPoint = polar(index, 46);
              if (!line || mark.querySelectorAll('line').length !== 1) { errors.push('dial tick identity:' + index); return { index, missing: true }; }
              const start = point(line, number(line, 'x1'), number(line, 'y1')), end = point(line, number(line, 'x2'), number(line, 'y2'));
              if (!near(number(line, 'x1'), inner.x) || !near(number(line, 'y1'), inner.y) || !near(number(line, 'x2'), outer.x) || !near(number(line, 'y2'), outer.y) ||
                !samePoint(start, point(dial, inner.x, inner.y)) || !samePoint(end, point(dial, outer.x, outer.y))) errors.push('dial tick geometry:' + index);
              if (!stroke(line, 1)) errors.push('dial tick paint:' + index);
              let labelReading: Record<string, unknown> | null = null;
              if (major) {
                if (!label || mark.querySelectorAll('text').length !== 1) errors.push('dial label missing:' + index);
                else {
                  const labelCss = getComputedStyle(label), labelBox = bounds(label), range = document.createRange();
                  range.selectNodeContents(label);
                  const glyphs = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0)
                    .map(({ left, right, top, bottom, width, height }) => ({ left, right, top, bottom, width, height }));
                  if (label.textContent?.trim() !== String(index) || label.getAttribute('data-dial-label') !== String(index)) errors.push('dial label text:' + index);
                  if (label.childNodes.length !== 1 || label.firstChild?.nodeType !== Node.TEXT_NODE || label.firstChild?.textContent !== String(index)) errors.push('dial label leaf identity:' + index);
                  // SVG labels are outside the unchanged canonical P/text selector.
                  // Their declared 14px scene readout remains explicitly measured.
                  if (!near(parseFloat(labelCss.fontSize), 14) || !label.hasAttribute('data-scene-readout')) errors.push('dial label font:' + index);
                  if (!visible(label) || labelCss.fill !== expectedInk || labelCss.fillOpacity !== '1') errors.push('dial label paint:' + index);
                  if (!near(number(label, 'x'), labelPoint.x) || !near(number(label, 'y'), labelPoint.y) ||
                    label.getAttribute('text-anchor') !== 'middle' || label.getAttribute('dominant-baseline') !== 'central' ||
                    !samePoint(point(label, number(label, 'x'), number(label, 'y')), point(dial, labelPoint.x, labelPoint.y))) errors.push('dial label position:' + index);
                  if (!positive(labelBox) || !inside(labelBox, dialBox) || !inside(labelBox, frameBox) || glyphs.length !== 1 ||
                    glyphs.some(glyph => !positive(glyph) || !inside(glyph, dialBox) || !inside(glyph, frameBox))) errors.push('dial label glyph containment:' + index);
                  labelReading = { text: label.textContent?.trim(), box: labelBox, glyphs, fontSize: parseFloat(labelCss.fontSize), fill: labelCss.fill,
                    childNodes: [...label.childNodes].map(child => ({ nodeType: child.nodeType, nodeName: child.nodeName, text: child.textContent })) };
                }
              } else if (label) errors.push('dial unexpected minor label:' + index);
              return { index, major, start, end, label: labelReading };
            });
            const needle = dial.querySelector<SVGLineElement>('[data-testid="press-dial-needle"]'), tip = polar(expectedPush, 25);
            let needleReading: Record<string, unknown> | null = null;
            if (!needle) errors.push('dial needle missing');
            else {
              const start = point(needle, number(needle, 'x1'), number(needle, 'y1')), end = point(needle, number(needle, 'x2'), number(needle, 'y2'));
              if (number(needle, 'x1') !== 56 || number(needle, 'y1') !== 50 || !near(number(needle, 'x2'), tip.x) || !near(number(needle, 'y2'), tip.y) ||
                !samePoint(start, point(dial, 56, 50)) || !samePoint(end, point(dial, tip.x, tip.y))) errors.push('dial needle geometry');
              if (!stroke(needle, 2)) errors.push('dial needle paint');
              needleReading = { expectedPush, start, end, expectedStart: point(dial, 56, 50), expectedEnd: point(dial, tip.x, tip.y), stroke: getComputedStyle(needle).stroke };
            }
            return { expectedPush, modelPush: number(dial, 'data-push'), errors, box: dialBox, viewBox: dial.getAttribute('viewBox'),
              role: dial.getAttribute('role'), name: dial.getAttribute('aria-label'), references, ink: css.color, ticks: tickReadings, needle: needleReading };
          }


          /** Pure browser measurements for the new causal arrow, input line and ruler. */
          function readCausalMarks(frame: Element, expectedInk: string, tolerance: number) {
            const errors: string[] = [];
            const q = (id: string) => frame.querySelector<HTMLElement>('[data-testid="' + id + '"]')!;
            const box = (node: Element) => {
              const { left, right, top, bottom, width, height } = node.getBoundingClientRect();
              return { left, right, top, bottom, width, height };
            };
            type MarkBox = ReturnType<typeof box>;
            const inside = (a: MarkBox, b: MarkBox) => a.left >= b.left - tolerance && a.right <= b.right + tolerance && a.top >= b.top - tolerance && a.bottom <= b.bottom + tolerance;
            const near = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
            const positive = (r: MarkBox) => Object.values(r).every(Number.isFinite) && r.width > 0 && r.height > 0;
            const visible = (node: Element) => node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
              !node.closest('details:not([open]),[hidden]') && getComputedStyle(node).opacity === '1';
            const frameBox = box(frame), sent = q('press-chosen-settings'), message = q('press-action-message'), inputCss = getComputedStyle(message);
            if (!visible(message) || !positive(box(message)) || !inside(box(message), box(sent)) ||
              inputCss.borderBottomStyle !== 'solid' || parseFloat(inputCss.borderBottomWidth) !== 1 || inputCss.borderBottomColor !== expectedInk) errors.push('sent action input-rule paint');
            const arrow = frame.querySelector<SVGSVGElement>('[data-testid="press-send-connector"]')!, path = arrow.querySelector<SVGPathElement>('path');
            const arrowBox = box(arrow), arrowCss = getComputedStyle(arrow);
            if (arrow.tagName.toLowerCase() !== 'svg' || arrow.getAttribute('viewBox') !== '0 0 20 32' || arrow.getAttribute('aria-hidden') !== 'true' ||
              arrow.getAttribute('data-from') !== 'press-action-message' || arrow.getAttribute('data-to') !== 'press-controller-output' ||
              arrow.querySelectorAll('path').length !== 1 || !path || path.getAttribute('d') !== 'M10 0V28m-5-5 5 5 5-5') errors.push('sent SVG arrow identity');
            if (!visible(arrow) || !positive(arrowBox) || !inside(arrowBox, box(q('press-send-path'))) || !inside(arrowBox, frameBox) || arrowCss.color !== expectedInk) errors.push('sent SVG arrow containment/paint');
            if (path) {
              const css = getComputedStyle(path), pathBox = box(path);
              if (!visible(path) || !positive(pathBox) || !inside(pathBox, arrowBox) || !inside(pathBox, frameBox) ||
                css.stroke !== expectedInk || css.strokeOpacity !== '1' || parseFloat(css.strokeWidth) !== 1 || css.fill !== 'none') errors.push('sent SVG arrow path paint');
            }
            const marks = q('press-position-marks'), ruler = q('press-ruler'), diagram = q('press-position-diagram');
            const marksBox = box(marks), rulerBox = box(ruler), rulerCss = getComputedStyle(ruler);
            if (ruler.parentElement !== marks || marks.firstElementChild !== ruler || marks.getAttribute('aria-hidden') !== 'true' ||
              !visible(ruler) || !near(rulerBox.left, marksBox.left) || !near(rulerBox.top, marksBox.top) || !near(rulerBox.height, marksBox.height) ||
              rulerCss.borderLeftStyle !== 'solid' || parseFloat(rulerCss.borderLeftWidth) !== 1 || rulerCss.borderLeftColor !== expectedInk ||
              !inside(rulerBox, box(diagram)) || !inside(rulerBox, frameBox)) errors.push('linear ruler geometry/paint');
            const ticks = [...marks.querySelectorAll<HTMLElement>('[data-ruler-mark]')];
            if (JSON.stringify(ticks.map(node => node.dataset.rulerMark)) !== JSON.stringify(['-2', '-1', '0', '1', '2', '3'])) errors.push('linear ruler tick population');
            const tickReadings = ticks.map((node, index) => {
              const value = index - 2, rect = box(node), css = getComputedStyle(node), expectedY = marksBox.top + (value + 2) / 5 * marksBox.height;
              if (node.parentElement !== marks || !visible(node) || !near(rect.left, marksBox.left) || !near(rect.top, expectedY) || !near(rect.width, 4) ||
                css.borderTopStyle !== 'solid' || parseFloat(css.borderTopWidth) !== 1 || css.borderTopColor !== expectedInk ||
                !inside(rect, box(diagram)) || !inside(rect, frameBox)) errors.push('linear ruler tick geometry/paint:' + value);
              return { value, box: rect, expectedY, ink: css.borderTopColor };
            });
            return { errors, inputRule: { box: box(message), ink: inputCss.borderBottomColor }, arrow: { box: arrowBox, path: path?.getAttribute('d'), ink: arrowCss.color }, ruler: { box: rulerBox, ticks: tickReadings } };
          }

          const dialReading = readPushDial(element, expectedPush, ink, tolerance);
          const causalMarks = readCausalMarks(element, ink, tolerance);
          errors.push(...dialReading.errors, ...causalMarks.errors);
          const combinedPrimary = q('press-primary-takeaway');
          const combinedIds = ['press-action-clause', 'press-contact-clause', 'press-general-rule'];
          const combinedTexts = [sentActionText, expectedCondition, 'once the surface stops the tool, push equals stiffness times target gap.'];
          const sentOwner = q('press-chosen-settings');
          const sentReading = productText(sentOwner, [['native controls', bounds(q('press-native-controls'))], ['frame', fb]], 'sent pair');
          const clauseParagraphs = [combinedPrimary, q('press-position-condition'), combinedPrimary];
          const clauseOwners = [combinedPrimary, q('press-position-condition'), q('press-product-rule')];
          const clauseBases = [20, 14, 20], clauseWeights = ['600', '400', '600'];
          const lawReading = productText(q('press-sent-rule'), [['contact product', bounds(q('press-contact-product'))], ['frame', fb]], 'combined primary');
          if (lawReading.text !== '↓ Shown calculation') errors.push('separated law paragraph copy');
          if (combinedPrimary.tagName !== 'P' || JSON.stringify([...combinedPrimary.children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-action-clause', 'press-product-rule']) ||
            combinedPrimary.parentElement !== q('press-relationship') ||
            combinedPrimary.nextElementSibling !== q('press-native-controls') ||
            q('press-native-controls').parentElement !== q('press-relationship') ||
            q('press-native-controls').nextElementSibling !== q('press-controller-output') ||
            q('press-controller-output').parentElement !== q('press-relationship') ||
            JSON.stringify([...q('press-relationship').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-primary-takeaway', 'press-native-controls', 'press-controller-output']) ||
            q('press-relationship').parentElement !== q('press-action-packet') ||
            JSON.stringify([...q('press-action-packet').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-relationship']) ||
            JSON.stringify([...q('press-controller-output').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-send-path', 'press-contact-product']) ||
            JSON.stringify([...q('press-send-path').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-send-connector', 'press-controller-heading']) ||
            q('press-send-path').tagName !== 'DIV' || q('press-send-path').parentElement !== q('press-controller-output') ||
            JSON.stringify([...q('press-contact-product').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-response-label', 'press-position-condition', 'press-response-diagram', 'press-sent-rule', 'press-result-with-dial', 'press-scale-definitions']) ||
            q('press-response-label').parentElement !== q('press-contact-product') || q('press-response-label').previousElementSibling !== null || q('press-response-label').nextElementSibling !== q('press-position-condition') ||
            JSON.stringify([...q('press-position-condition').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-position-tool-key', 'press-contact-clause']) ||
            JSON.stringify([...q('press-response-diagram').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-position-diagram', 'press-push-dial']) ||
            q('press-sent-rule').tagName !== 'P' || q('press-sent-rule').parentElement !== q('press-contact-product') ||
            JSON.stringify([...q('press-sent-rule').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-gap-output-connector', null]) ||
            q('press-sent-rule').lastElementChild?.tagName !== 'SPAN' || q('press-sent-rule').lastElementChild?.textContent?.trim() !== 'Shown calculation' ||
            q('press-product-rule').tagName !== 'SPAN' || JSON.stringify([...q('press-product-rule').children].map((node) => (node as HTMLElement).dataset.testid)) !== JSON.stringify(['press-general-rule']) ||
            q('press-product-rule').parentElement !== combinedPrimary ||
            q('press-result-with-dial').parentElement !== q('press-contact-product') || q('press-result-with-dial').children.length !== 1 || q('press-result-with-dial').firstElementChild !== calculation ||
            descriptions.parentElement !== calculation || descriptions.nextElementSibling !== equation ||
            q('press-send-connector').getAttribute('data-from') !== 'press-action-message' ||
            q('press-send-connector').getAttribute('data-to') !== 'press-controller-output' ||
            !(combinedPrimary.compareDocumentPosition(q('press-send-path')) & Node.DOCUMENT_POSITION_FOLLOWING)) errors.push('combined clause sibling order');
          const gapArrow = q('press-gap-output-connector');
          if (gapArrow.textContent?.trim() !== '↓' || gapArrow.getAttribute('aria-hidden') !== 'true' || gapArrow.getAttribute('data-from') !== 'press-position-gap' ||
            gapArrow.getAttribute('data-to') !== 'press-calculation' || gapArrow.parentElement !== q('press-sent-rule')) errors.push('gap-to-product arrow binding');
          const sentMessage = q('press-action-message'), sentLabel = q('press-action-label');
          const sentFields = [...sentMessage.querySelectorAll<HTMLElement>('[data-action-field]')];
          const sentValues = [...sentMessage.querySelectorAll<HTMLElement>('[data-action-value]')];
          if (sentMessage.parentElement !== sentOwner || sentLabel.parentElement !== q('press-action-clause') ||
            sentOwner.parentElement !== q('press-native-controls') || sentOwner.nextElementSibling !== q('press-settings') ||
            sentOwner.firstElementChild !== sentMessage || sentOwner.children.length !== 1 ||
            sentReading.text !== `Action: target ${sentTargetText} and stiffness ${sentRate}.` ||
            sentLabel.tagName !== 'SPAN' || sentLabel.hasAttribute('aria-label') || sentLabel.hasAttribute('role') ||
            q('press-settings').getAttribute('role') !== 'group' ||
            q('press-settings').getAttribute('aria-label') !== 'An action sends two settings: target and stiffness' ||
            q('press-settings').hasAttribute('aria-labelledby') ||
            sentLabel.id !== `${slider.id}-settings` ||
            JSON.stringify(sentFields.map((node) => node.dataset.actionField)) !== JSON.stringify(['target', 'stiffness']) ||
            JSON.stringify(sentValues.map((node) => node.dataset.actionValue)) !== JSON.stringify(['target', 'stiffness']) ||
            JSON.stringify(sentFields.map((node) => node.textContent?.replace(/\s+/g, ' ').trim())) !== JSON.stringify([`target ${sentTargetText}`, `stiffness ${sentRate}.`]) ||
            JSON.stringify(sentValues.map((node) => node.textContent?.trim())) !== JSON.stringify([sentTargetText, String(sentRate)]) ||
            sentValues.some((node, index) => node.parentElement !== sentFields[index]) ||
            q('press-send-connector').tagName.toLowerCase() !== 'svg' || q('press-send-connector').getAttribute('aria-hidden') !== 'true') errors.push('sent action values and accessible binding');
          for (const node of [...sentFields, ...sentValues]) {
            const css = getComputedStyle(node), rect = bounds(node);
            if (!node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || !inside(rect, sentReading.box) || !inside(rect, fb) ||
              Math.abs(parseFloat(css.fontSize) - sentReading.baseline * input.profile.scale) > 0.5 || css.fontWeight !== '400') errors.push('sent action value visibility/font/containment');
          }
          const combinedClauses = combinedIds.map((id, index) => {
            const node = q(id), rect = bounds(node), css = getComputedStyle(node), owner = clauseOwners[index], ownerBox = bounds(owner), paragraphNode = clauseParagraphs[index], clauseBaseline = input.census[Number(paragraphNode.dataset.releaseTextProbe)]?.baselinePx;
            const finitePositive = (r: Bounds) => ['left', 'right', 'top', 'bottom', 'width', 'height']
              .every((key) => Number.isFinite(r[key as keyof Bounds])) && r.width > 0 && r.height > 0;
            const visible = node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && !node.closest('details:not([open]),[hidden],[aria-hidden="true"]');
            if (!visible) errors.push('combined clause hidden:' + id);
            if (node.tagName !== 'SPAN' || node.parentElement !== owner || node.textContent?.replace(/\s+/g, ' ').trim() !== combinedTexts[index] || node.children.length !== (index === 0 ? 1 : 0)) errors.push('combined clause identity/copy:' + id);
            if (!finitePositive(rect) || !finitePositive(ownerBox) || !inside(rect, ownerBox) || !inside(rect, fb)) errors.push('combined clause containment:' + id);
            const paragraphs = [paragraphNode].map((paragraph) => {
              const paragraphCss = getComputedStyle(paragraph), paragraphBox = bounds(paragraph), baseline = clauseBaseline;
              const paragraphVisible = paragraph.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && !paragraph.closest('details:not([open]),[hidden],[aria-hidden="true"]');
              if (paragraph.tagName !== 'P' || !Number.isFinite(baseline) || Math.abs(baseline - clauseBases[index]) > 0.5 ||
                Math.abs(parseFloat(paragraphCss.fontSize) - baseline * input.profile.scale) > 0.5 || paragraphCss.fontWeight !== clauseWeights[index] ||
                Math.abs(parseFloat(css.fontSize) - baseline * input.profile.scale) > 0.5 || css.fontWeight !== clauseWeights[index]) errors.push('combined clause inherited font:' + id);
              if (!paragraphVisible) errors.push('combined clause hidden:' + id);
              if (!finitePositive(paragraphBox) || !inside(ownerBox, paragraphBox) || !inside(paragraphBox, fb)) errors.push('combined clause paragraph containment:' + id);
              return { id: paragraph.dataset.testid, tag: paragraph.tagName, box: paragraphBox, baseline, fontSize: parseFloat(paragraphCss.fontSize), fontWeight: paragraphCss.fontWeight, visible: paragraphVisible };
            });
            if (paragraphs.length !== 1) errors.push('combined clause paragraph population:' + id);
            const glyphs: Bounds[] = [], words: Array<{ word: string; rects: Bounds[] }> = [];
            const leafTypography: Array<{ text: string; paragraph: string | undefined; baseline: number | undefined; fontSize: number; fontWeight: string; visible: boolean }> = [];
            const ranges = (range: Range): Bounds[] => [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0)
              .map(({ left, right, top, bottom, width, height }) => ({ left, right, top, bottom, width, height }));
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
            for (let text = walker.nextNode(); text; text = walker.nextNode()) {
              if (!(text.textContent ?? '').trim()) continue;
              const leaf = text.parentElement!, paragraph = leaf.closest('p'), leafCss = getComputedStyle(leaf), baseline = clauseBaseline;
              const leafVisible = leaf.checkVisibility({ opacityProperty: true, visibilityProperty: true });
              if (!leafVisible) errors.push('combined clause hidden:' + id);
              if (paragraph !== paragraphNode || !Number.isFinite(baseline) || Math.abs(parseFloat(leafCss.fontSize) - baseline * input.profile.scale) > 0.5 ||
                leafCss.fontWeight !== clauseWeights[index]) errors.push('combined clause inherited font:' + id);
              const paragraphBox = paragraph ? bounds(paragraph) : ownerBox;
              leafTypography.push({ text: text.textContent!.trim(), paragraph: (paragraph as HTMLElement | null)?.dataset.testid, baseline, fontSize: parseFloat(leafCss.fontSize), fontWeight: leafCss.fontWeight, visible: leafVisible });
              const full = document.createRange(); full.selectNodeContents(text); glyphs.push(...ranges(full));
              for (const match of (text.textContent ?? '').matchAll(/\S+/g)) {
                const range = document.createRange(); range.setStart(text, match.index); range.setEnd(text, match.index + match[0].length);
                const rects = ranges(range);
                if (rects.length !== 1 || rects.some((r) => !finitePositive(r) || !inside(r, rect) || !inside(r, ownerBox) || !inside(r, paragraphBox) || !inside(r, fb))) errors.push('combined clause whole word:' + id + ':' + match[0]);
                words.push({ word: match[0], rects });
              }
              if (ranges(full).some((r) => !inside(r, paragraphBox))) errors.push('combined clause glyph containment:' + id);
            }
            if (!glyphs.length || glyphs.some((r) => !finitePositive(r) || !inside(r, rect) || !inside(r, ownerBox) || !inside(r, fb))) errors.push('combined clause glyph containment:' + id);
            return { id, tag: node.tagName, text: node.textContent?.replace(/\s+/g, ' ').trim(), box: rect, owner: { id: owner.dataset.testid, tag: owner.tagName, box: ownerBox }, visible,
              opacity: css.opacity, visibility: css.visibility, fontSize: parseFloat(css.fontSize), fontWeight: css.fontWeight, paragraphs, leafTypography, glyphs, words };
          });
          for (let i = 0; i < combinedClauses.length; i++) for (let j = i + 1; j < combinedClauses.length; j++) {
            if (combinedClauses[i].glyphs.some((a) => combinedClauses[j].glyphs.some((b) => overlaps(a, b)))) errors.push('combined clause glyph overlap');
          }
          const textReadings = [q('press-primary-takeaway'), q('press-contact-clause'), q('press-response-label'), q('press-scale-definitions'), q('press-chosen-settings'), ...labelParagraphs, condition, ...namedParagraphNodes].map((node) => {
            const censusNode = node === contactClause ? condition : node;
            const baseline = input.census[Number(censusNode.dataset.releaseTextProbe)]?.baselinePx, fontSize = parseFloat(getComputedStyle(node).fontSize);
            if (!Number.isFinite(baseline) || Math.abs(fontSize - baseline * input.profile.scale) > 0.5) errors.push(`text size:${node.dataset.testid ?? 'Surface'}`);
            const words: Array<{ word: string; rects: Bounds[] }> = [], walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
            for (let text = walker.nextNode(); text; text = walker.nextNode()) for (const match of (text.textContent ?? '').matchAll(/\S+/g)) {
              const range = document.createRange(); range.setStart(text, match.index); range.setEnd(text, match.index + match[0].length);
              const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0)
                .map(({ left, right, top, bottom, width, height }) => ({ left, right, top, bottom, width, height }));
              if (rects.length !== 1 || rects.some((rect) => !insideX(rect, bounds(node)) || !insideX(rect, fb))) errors.push(`whole label word:${match[0]}`);
              words.push({ word: match[0], rects });
            }
            return { text: node.textContent?.trim(), baseline, fontSize, box: bounds(node), words };
          });
          const actualEquation = [...q('press-equation').querySelectorAll('[data-operation-value],[data-operation-symbol]')].map((node) => node.textContent?.trim());
          if (JSON.stringify(actualEquation) !== JSON.stringify([String(input.rate), '×', String(expectedGap), '=', String(expectedPush)])) errors.push('visible equation basis');
          const identity = element.isConnected && element === document.querySelector('[data-figure-frame="impedance-press"]') && performance.timeOrigin === input.timeOrigin;
          if (!identity || innerWidth !== input.profile.width || devicePixelRatio !== input.profile.dpr) errors.push('document/frame/profile identity');
          const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          if (overflow !== 0) errors.push(`document overflow:${overflow}`);
          return { target: input.target, spring: input.spring, rate: input.rate, expectedTool, expectedGap, expectedPush, actualEquation, errors,
            identity, forced, ink, canvas, overflow, focusClearance, bounds: { frame: fb, diagram: db, marks: mb, labels: lb, surface: sb, tool: tb, target: ab, gap: gb },
            text: textReadings, combinedClauses, namedProduct, condition: conditionReading, primary: primaryReading, law: lawReading, dial: dialReading, causalMarks, paint: { surface: surfaceCss.borderTop, target: targetCss.borderTop, tool: toolCss.backgroundColor, gap: gapCss.borderRight } };
        }, { target, spring, rate, profile, census, timeOrigin });
        await settle();
        const initial = await probe(2, 'medium', 2);
        observations.push({ profile: profile.id, kind: 'default', ...initial });
        expect(initial.errors, `${profile.id}: default`).toEqual([]);
        for (const [spring, rate] of [['soft', 1], ['medium', 2], ['stiff', 4]] as const) {
          const preset = frame.getByTestId(`press-spring-${spring}`);
          await preset.focus(); await preset.press('Enter');
          await expect(preset).toHaveAttribute('aria-pressed', 'true');
          for (const target of [-2, 0, 0.5, 3, 2]) {
            await slider.focus(); await slider.press('Home');
            for (let step = 0; step < (target + 2) / 0.5; step++) await slider.press('ArrowRight');
            await expect(slider).toHaveValue(String(target));
            await expect(frame.getByTestId('press-position-diagram')).toHaveAttribute('data-target', String(target));
            await settle();
            const result = await probe(target, spring, rate);
            observations.push({ profile: profile.id, kind: 'native', ...result });
            expect(result.errors, `${profile.id}/${spring}/${target}`).toEqual([]);
          }
        }
        // Real CSS faults must trip the same geometry/paint observer; the
        // native model and controls are never assigned or substituted.
        for (const mutation of [
          { id: 'press-position-target', property: 'top', value: '0px', expected: 'target y' },
          { id: 'press-position-surface', property: 'border-top-style', value: 'none', expected: 'surface paint' },
          { id: 'press-position-gap', property: 'height', value: '0px', expected: 'gap span' },
        ]) {
          const node = frame.getByTestId(mutation.id), saved = await node.getAttribute('style');
          try {
            await node.evaluate((element, change) => element.style.setProperty(change.property, change.value, 'important'), mutation);
            await settle();
            const result = await probe(2, 'stiff', 4);
            observations.push({ profile: profile.id, kind: 'negative witness', mutation, ...result });
            expect(result.errors).toContain(mutation.expected);
          } finally {
            await node.evaluate((element, originalStyle) => originalStyle === null ? element.removeAttribute('style') : element.setAttribute('style', originalStyle), saved);
          }
          await settle();
          expect((await probe(2, 'stiff', 4)).errors, `${profile.id}: restored original style`).toEqual([]);
        }
        // Additional named-product fault, separate from the original three
        // diagram faults and the conditional native-focus clearance witness.
        const namedOperator = frame.getByTestId('press-push-product-operator'), namedOperatorStyle = await namedOperator.getAttribute('style');
        try {
          await namedOperator.evaluate((node) => node.style.setProperty('display', 'none', 'important'));
          await settle();
          const brokenNamedProduct = await probe(2, 'stiff', 4);
          observations.push({ profile: profile.id, kind: 'named product negative witness', mutation: { id: 'press-push-product-operator', property: 'display', value: 'none' }, ...brokenNamedProduct });
          expect(brokenNamedProduct.errors).toContain('named product hidden:press-push-product-operator');
        } finally {
          await namedOperator.evaluate((node, saved) => saved === null ? node.removeAttribute('style') : node.setAttribute('style', saved), namedOperatorStyle);
        }
        await settle();
        expect(await namedOperator.getAttribute('style'), 'exact named operator style restoration').toBe(namedOperatorStyle);
        const restoredNamedProduct = await probe(2, 'stiff', 4);
        observations.push({ profile: profile.id, kind: 'named product restoration', ...restoredNamedProduct });
        expect(restoredNamedProduct.errors, 'restored original named-product paint').toEqual([]);
        // The stopped-contact qualification must remain painted even when its
        // textContent and range geometry are unchanged by an opacity fault.
        const contactClause = frame.getByTestId('press-contact-clause'), contactStyle = await contactClause.getAttribute('style');
        try {
          await contactClause.evaluate((node) => node.style.setProperty('opacity', '0', 'important'));
          await settle();
          const hiddenContact = await probe(2, 'stiff', 4);
          observations.push({ profile: profile.id, kind: 'contact clause negative witness', ...hiddenContact });
          expect(hiddenContact.errors).toContain('combined clause hidden:press-contact-clause');
        } finally {
          await contactClause.evaluate((node, saved) => saved === null ? node.removeAttribute('style') : node.setAttribute('style', saved), contactStyle);
        }
        await settle();
        expect(await contactClause.getAttribute('style'), 'exact contact clause style restoration').toBe(contactStyle);
        const restoredContact = await probe(2, 'stiff', 4);
        observations.push({ profile: profile.id, kind: 'contact clause restoration', ...restoredContact });
        expect(restoredContact.errors, 'restored original contact clause paint').toEqual([]);
        const focusBaseline = await probe(2, 'stiff', 4);
        observations.push({ profile: profile.id, kind: 'focus clearance eligibility', ...focusBaseline.focusClearance });
        if (focusBaseline.focusClearance.wrappedValue) {
          await expect(slider).toBeFocused();
          expect(focusBaseline.focusClearance.focusVisible).toBe(true);
          const nativeRow = frame.locator('[data-figure-control-row]');
          await expect(nativeRow).toHaveCount(1);
          const savedStyle = await nativeRow.getAttribute('style');
          try {
            await nativeRow.evaluate((node) => node.style.setProperty('row-gap', '2px', 'important'));
            await settle();
            const broken = await probe(2, 'stiff', 4);
            observations.push({ profile: profile.id, kind: 'focus clearance negative witness', ...broken });
            expect(broken.errors).toContain('native focus clearance');
          } finally {
            await nativeRow.evaluate((node, saved) => saved === null ? node.removeAttribute('style') : node.setAttribute('style', saved), savedStyle);
          }
          await settle();
          expect((await probe(2, 'stiff', 4)).errors, `${profile.id}: restored focus clearance`).toEqual([]);
        }
        await summary.focus(); await summary.press('Enter');
        await expect(method).toHaveJSProperty('open', true);
        await expect(frame.getByTestId('press-drawing')).toBeVisible();
        await expect(frame.getByTestId('press-position-diagram')).toBeVisible();
        await expect(frame.getByTestId('press-equation')).toBeVisible();
        await summary.press('Enter');
        await expect(method).toHaveJSProperty('open', false);
        await expect(frame.getByTestId('press-drawing')).toBeHidden();
        await settle();
        expect((await probe(2, 'stiff', 4)).errors, `${profile.id}: native fold round trip`).toEqual([]);
        const activity = await page.evaluate(takeReleaseActivity);
        observations.push({ profile: profile.id, kind: 'native actions', operations: activity.operations });
        expect(activity.operations.filter(({ kind }) => kind === 'keydown').every(({ trusted }) => trusted), `${profile.id}: trusted keyboard actions`).toBe(true);
        expect(await original.evaluate((element, origin) => element.isConnected && element === document.querySelector('[data-figure-frame="impedance-press"]') && performance.timeOrigin === origin, timeOrigin)).toBe(true);
        // Additive dial faults change only the rendered instrument and restore
        // its exact original text/attributes/style. Native/model state is untouched.
        for (const mutation of [
          { selector: '[data-testid="press-push-dial"]', mode: 'attribute', property: 'aria-label', value: 'Push dial: 7 dial marks', expected: 'dial accessible/value binding' },
          { selector: '[data-testid="press-dial-needle"]', mode: 'attribute', property: 'x2', value: '56', expected: 'dial needle geometry' },
          { selector: '[data-testid="press-push-dial"] [data-dial-label="12"]', mode: 'style', property: 'font-size', value: '8px', expected: 'dial label font:12' },
          { selector: '[data-testid="press-push-dial"]', mode: 'style', property: 'opacity', value: '0', expected: 'dial hidden' },
          { selector: '[data-testid="press-push-dial"] [data-dial-label="12"]', mode: 'text', property: 'textContent', value: '11', expected: 'dial label text:12' },
        ] as const) {
          const node = frame.locator(mutation.selector);
          const saved = await node.evaluate((element, change) => ({
            style: element.getAttribute('style'), text: element.textContent,
            attribute: change.mode === 'attribute' ? element.getAttribute(change.property) : null,
          }), mutation);
          try {
            await node.evaluate((element, change) => {
              if (change.mode === 'style') (element as HTMLElement | SVGElement).style.setProperty(change.property, change.value, 'important');
              else if (change.mode === 'attribute') element.setAttribute(change.property, change.value);
              else element.textContent = change.value;
            }, mutation);
            await settle();
            const brokenDial = await probe(2, 'stiff', 4);
            observations.push({ profile: profile.id, kind: 'dial negative witness', mutation, ...brokenDial });
            expect(brokenDial.errors, profile.id + ': dial ' + mutation.expected).toContain(mutation.expected);
          } finally {
            await node.evaluate((element, input) => {
              if (input.change.mode === 'style') {
                if (input.saved.style === null) element.removeAttribute('style');
                else element.setAttribute('style', input.saved.style);
              } else if (input.change.mode === 'attribute') {
                if (input.saved.attribute === null) element.removeAttribute(input.change.property);
                else element.setAttribute(input.change.property, input.saved.attribute);
              } else element.textContent = input.saved.text;
            }, { change: mutation, saved });
          }
          await settle();
          expect(await node.evaluate((element, change) => ({
            style: element.getAttribute('style'), text: element.textContent,
            attribute: change.mode === 'attribute' ? element.getAttribute(change.property) : null,
          }), mutation), 'exact dial mutation restoration').toEqual(saved);
          const restoredDial = await probe(2, 'stiff', 4);
          observations.push({ profile: profile.id, kind: 'dial restoration', mutation, ...restoredDial });
          expect(restoredDial.errors, profile.id + ': restored dial ' + mutation.expected).toEqual([]);
        }

        // Separate additive leaf faults retain the original five dial faults.
        for (const mutation of [
          { kind: 'tiny tspan', fontSize: '8px', dx: null },
          { kind: 'shifted tspan', fontSize: null, dx: '4' },
        ] as const) {
          const label = frame.locator('[data-testid="press-push-dial"] [data-dial-label="12"]');
          const originalMarkup = await label.innerHTML();
          try {
            await label.evaluate((element, change) => {
              const leaf = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
              leaf.textContent = element.textContent;
              if (change.fontSize !== null) leaf.style.fontSize = change.fontSize;
              if (change.dx !== null) leaf.setAttribute('dx', change.dx);
              element.replaceChildren(leaf);
            }, mutation);
            await settle();
            const brokenLeaf = await probe(2, 'stiff', 4);
            observations.push({ profile: profile.id, kind: 'dial leaf negative witness', mutation, ...brokenLeaf });
            expect(brokenLeaf.errors, profile.id + ': ' + mutation.kind).toContain('dial label leaf identity:12');
          } finally {
            await label.evaluate((element, markup) => { element.innerHTML = markup; }, originalMarkup);
          }
          await settle();
          expect(await label.innerHTML(), 'exact dial leaf markup restoration').toBe(originalMarkup);
          const restoredLeaf = await probe(2, 'stiff', 4);
          observations.push({ profile: profile.id, kind: 'dial leaf restoration', mutation, ...restoredLeaf });
          expect(restoredLeaf.errors, profile.id + ': restored ' + mutation.kind).toEqual([]);
        }

      } finally { await context.close(); }
    }
    expect(observations.filter((row) => (row as { kind: string }).kind === 'default')).toHaveLength(8);
    expect(observations.filter((row) => (row as { kind: string }).kind === 'native')).toHaveLength(120);
    expect(observations.filter((row) => (row as { kind: string }).kind === 'negative witness')).toHaveLength(24);
    const focusRows = observations.filter((row) => (row as { kind: string }).kind === 'focus clearance eligibility') as Array<{ wrappedValue: boolean }>;
    expect(focusRows).toHaveLength(8);
    expect(focusRows.some((row) => row.wrappedValue)).toBe(true);
    expect(observations.filter((row) => (row as { kind: string }).kind === 'focus clearance negative witness')).toHaveLength(focusRows.filter((row) => row.wrappedValue).length);
    expect(observations.filter((row) => (row as { kind: string }).kind === 'named product negative witness')).toHaveLength(8);
    expect(observations.filter((row) => (row as { kind: string }).kind === 'named product restoration')).toHaveLength(8);
    expect(observations.filter((row) => (row as { kind: string }).kind === 'contact clause negative witness')).toHaveLength(8);
    expect(observations.filter((row) => (row as { kind: string }).kind === 'contact clause restoration')).toHaveLength(8);
    expect(observations.filter((row) => (row as { kind: string }).kind === 'dial negative witness')).toHaveLength(40);
    expect(observations.filter((row) => (row as { kind: string }).kind === 'dial restoration')).toHaveLength(40);
    expect(observations.filter((row) => (row as { kind: string }).kind === 'dial leaf negative witness')).toHaveLength(16);
    expect(observations.filter((row) => (row as { kind: string }).kind === 'dial leaf restoration')).toHaveLength(16);
  } finally {
    const preserved = sources.map(({ path, bytes }) => ({ path, sameBytes: readFileSync(join(process.cwd(), path)).equals(bytes) }));
    await testInfo.attach('press-default-position-native-geometry', { body: Buffer.from(JSON.stringify({ observations, preserved }, null, 2)), contentType: 'application/json' });
    expect(preserved.filter(({ sameBytes }) => !sameBytes), 'press geometry sources and canonical text helper stay unchanged').toEqual([]);
  }
});
