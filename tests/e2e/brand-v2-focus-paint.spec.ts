import { test, expect, brandV2Registry } from './brand-v2-static-fixture';
import { focusInstanceFailures, focusPaintFailures } from '../../lib/brand-v2-focus-paint';
import { measureFocusInstances, readFocusPaint, settleFocusPaint } from './helpers/focus-paint';
import { interactiveLedgerPlan } from '../../lib/brand-v2-interactive-ledger';
import { measureLedgerMount } from './helpers/interactive-ledger-driver';
import { decodePng } from '../../lib/png-decode';
import { PI_GENERATIONS } from '../../lib/pi-generations';

const styles = 'body{color:#1c1c1a;background:#fafaf8} :focus{outline:none} :focus-visible{outline:1px solid #1c1c1a;outline-offset:2px} button{margin:8px}';
const button = (id: string) => `<button id="${id}" data-brand-control-id="control:secondary-action">${id}</button>`;


// Use painted contrast, not near-exact RGB matching: antialiased 1 px borders
// can be clearly visible while their edge pixels differ from CanvasText.
function contrastingPixels(buffer: Buffer, canvas: string) {
  const image = decodePng(buffer);
  const luminance = (rgb: number[]) => rgb.reduce((sum, value, index) => {
    const channel = value / 255;
    return sum + (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index];
  }, 0);
  const background = luminance(canvas.match(/[\d.]+/g)!.slice(0, 3).map(Number));
  const pixels: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) {
    const at = (y * image.width + x) * 4;
    const foreground = luminance(Array.from(image.rgba.slice(at, at + 3)));
    if ((Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05) >= 3) pixels.push({ x, y });
  }
  return { width: image.width, height: image.height, pixels };
}

function rangeRaster(buffer: Buffer, canvas: string) {
  const image = contrastingPixels(buffer, canvas);
  const rows = Array<number>(image.height).fill(0);
  for (const { y } of image.pixels) rows[y] += 1;
  const middle = Math.floor(image.height / 2);
  const track = Math.max(...rows.slice(middle - 2, middle + 3));
  const thumb = image.pixels.filter(({ y }) => Math.abs(y - (image.height - 1) / 2) > 1.5);
  const bounds = thumb.length ? {
    width: Math.max(...thumb.map(({ x }) => x)) - Math.min(...thumb.map(({ x }) => x)) + 1,
    height: Math.max(...thumb.map(({ y }) => y)) - Math.min(...thumb.map(({ y }) => y)) + 1,
  } : { width: 0, height: 0 };
  return {
    width: image.width, track, thumbPixels: thumb.length, bounds,
    centroid: thumb.reduce((sum, { x }) => sum + x, 0) / thumb.length,
    // The 12 px hollow thumb interrupts the 1 px track. Allow only that gap
    // plus two raster-edge pixels; the thumb itself must remain 12 px ±1.
    visible: track >= image.width - 14 && thumb.length >= 16 &&
      bounds.width >= 11 && bounds.width <= 13 && bounds.height >= 11 && bounds.height <= 13,
  };
}

test.describe('literal focus proof mutations', () => {
  test('measures every structural instance even when resting styles are identical', async ({ page }) => {
    await page.setContent(`<style>${styles} #second:focus-visible{outline-color:#245fff}</style>${button('first')}${button('second')}`);
    const reading = await measureFocusInstances(page, '/fixture/', '1440x900');
    expect(reading.expected).toHaveLength(2);
    expect(reading.instances[0].method).toBe('Tab');
    expect(focusInstanceFailures(reading.instances[0])).toEqual([]);
    expect(focusInstanceFailures(reading.instances[1]).join(' ')).toMatch(/retired|colour/);
  });
  test('a tabindex minus one control cannot acquire a reach witness through programmatic focus', async ({ page }) => {
    await page.setContent(`<style>${styles}</style>${button('first')}<button tabindex="-1" data-brand-control-id="control:secondary-action">Lost</button>`);
    const reading = await measureFocusInstances(page, '/fixture/', '1440x900');
    expect(reading.instances[1].method).toBe('unreached');
    expect(focusInstanceFailures(reading.instances[1])).toContain('not reached by actual Tab/arrow input');
  });
  test('the census reaches beyond thirty stops and includes initially closed disclosure controls', async ({ page }) => {
    await page.setContent(`<style>${styles} #last:focus-visible{outline-width:4px}</style>${Array.from({ length: 35 }, (_, i) => button(`item-${i}`)).join('')}<details><summary data-brand-control-id="control:secondary-action">More</summary>${button('last')}</details>`);
    const reading = await measureFocusInstances(page, '/fixture/', '1440x900');
    expect(reading.instances).toHaveLength(37);
    expect(reading.instances.at(-1)?.method).toBe('Tab');
    expect(focusInstanceFailures(reading.instances.at(-1)!).join(' ')).toMatch(/width 4px/);
  });
  test('native radios receive actual arrow witnesses and pointer inputs retain actual focus-visible matches', async ({ page }) => {
    await page.setContent(`<style>${styles}</style><input type="radio" name="choice" checked data-brand-control-id="control:selection"><input type="radio" name="choice" data-brand-control-id="control:selection"><input aria-label="Text" data-brand-control-id="control:input">`);
    const reading = await measureFocusInstances(page, '/fixture/', '1440x900');
    expect(reading.instances.map(({ method }) => method)).toEqual(['Tab', 'arrow', 'Tab']);
    expect(reading.instances.flatMap(focusInstanceFailures)).toEqual([]);
    expect(reading.instances[2].pointer?.matched).toBe(true);
  });
  test('focus-only pointer paint and wrong offset fail independently', async ({ page }) => {
    await page.setContent(`<style>${styles} #first:focus{outline:1px solid #1c1c1a;outline-offset:2px} #second:focus-visible{outline-offset:0}</style>${button('first')}${button('second')}`);
    const reading = await measureFocusInstances(page, '/fixture/', '1440x900');
    expect(reading.instances[0].pointer?.matched).toBe(false);
    expect(focusInstanceFailures(reading.instances[0])).toContain('focus paint appears without :focus-visible');
    expect(focusInstanceFailures(reading.instances[1]).join(' ')).toMatch(/offset/);
  });
  test('the nonmoving reader rejects a hidden or unrelated chart ring', async ({ page }) => {
    await page.setContent(`<svg width="300" height="150"><circle id="mark" tabindex="0" role="button" cx="50" cy="50" r="12" style="outline:none"/><circle data-focus-ring cx="50" cy="50" r="16" fill="none" stroke="#3b6ea8" stroke-width="2"/></svg>`);
    await page.keyboard.press('Tab');
    const target = page.locator('#mark');
    expect(focusPaintFailures(await target.evaluate(readFocusPaint), true)).toEqual([]);
    await page.locator('[data-focus-ring]').evaluate((ring) => ring.setAttribute('cx', '120'));
    expect(focusPaintFailures(await target.evaluate(readFocusPaint), true)).toContain('no visible focus ring');
    await page.locator('[data-focus-ring]').evaluate((ring) => { ring.setAttribute('cx', '50'); ring.setAttribute('opacity', '0'); });
    expect(focusPaintFailures(await target.evaluate(readFocusPaint), true)).toContain('no visible focus ring');
  });
  test('a selected-state focus regression is measured after the real key changes state', async ({ page }) => {
    await page.setContent(`<style>${styles} button[aria-pressed="true"]:focus-visible{outline-width:3px}</style><button aria-pressed="false" onclick="this.setAttribute('aria-pressed','true')">Select</button>`);
    await page.keyboard.press('Tab');
    expect(focusPaintFailures(await page.locator('button').evaluate(readFocusPaint), true)).toEqual([]);
    await page.keyboard.press('Enter');
    expect(focusPaintFailures(await page.locator('button').evaluate(readFocusPaint), true).join(' ')).toMatch(/width 3px/);
  });
  test('records the browser native system focus colour without moving focus in a forced-colours profile', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.setContent(`<style>${styles} input:focus-visible{outline-color:Highlight}</style><input type="search" aria-label="Find">`);
    await page.keyboard.press('Tab');
    const paint = await page.locator(':focus').evaluate(readFocusPaint);
    expect(paint.forcedColors).toBe(true);
    expect(paint.systemFocus).toBe(paint.color);
    expect(focusPaintFailures(paint, true)).toEqual([]);
    expect(await page.locator('input').evaluate((element) => document.activeElement === element)).toBe(true);
  });

  test('the real ledger persists literal paint for reached controls and every operated state', async ({ browser, staticBase }) => {
    test.setTimeout(180_000);
    const plan = interactiveLedgerPlan(brandV2Registry);
    const mount = plan.mounts.find(({ mountId }) => mountId === 'mount:/adjacent/surgical/:MotionPantograph:1')!;
    const observed: string[] = [];
    const reading = await measureLedgerMount(browser, staticBase, plan, mount, undefined, async (_page, state) => { observed.push(state.id); });
    const controls = reading.controls.filter(({ disabled }) => !disabled);
    expect(controls.length).toBeGreaterThan(0);
    expect(controls.every(({ reached }) => reached)).toBe(true);
    expect(controls.flatMap(({ ring }) => focusPaintFailures(ring, true))).toEqual([]);
    expect(reading.transitions.length).toBeGreaterThan(0);
    expect(reading.transitions.flatMap(({ focus }) => focusPaintFailures(focus.paint, true))).toEqual([]);
    expect(reading.transitions.flatMap(({ pointer }) => 'paint' in pointer ? focusPaintFailures(pointer.paint, false) : [])).toEqual([]);
    expect(observed.filter((id) => id.startsWith('transition:'))).toHaveLength(reading.transitions.length);
  });


  test('a native disclosure uses measured system focus and keeps keyboard and ring geometry checks', async ({ page }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ forcedColors: 'active', colorScheme });
      await page.setContent(`<style>${styles}</style>${button('start')}<details><summary data-brand-control-id="control:secondary-action">More</summary><p>Details</p></details>`);
      await page.keyboard.press('Tab');
      await expect(page.locator('#start')).toBeFocused();
      await page.keyboard.press('Tab');
      const summary = page.locator('summary');
      await expect(summary).toBeFocused();
      const paint = await summary.evaluate(readFocusPaint);
      expect(paint.forcedColors).toBe(true);
      expect(paint.systemFocus).not.toBe('');
      expect(paint.color).toBe(paint.systemFocus);
      expect(focusPaintFailures(paint, true)).toEqual([]);
      await page.keyboard.press('Enter');
      await expect(page.locator('details')).toHaveAttribute('open', '');
      await page.keyboard.press('Enter');
      await expect(page.locator('details')).not.toHaveAttribute('open', '');
      try {
        await summary.evaluate((element) => { element.style.outlineWidth = '3px'; });
        expect(focusPaintFailures(await summary.evaluate(readFocusPaint), true).join(' ')).toMatch(/width 3px/);
      } finally {
        await summary.evaluate((element) => { element.style.removeProperty('outline-width'); });
      }
      expect(focusPaintFailures(await summary.evaluate(readFocusPaint), true)).toEqual([]);
    }
  });

  test('the real forced-colour slider paints its track and moving thumb, and rejects invisible or oversized mutants', async ({ page, staticBase }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ forcedColors: 'active', colorScheme });
      await page.goto(`${staticBase}/classical/scene-representation/`);
      await page.evaluate(() => document.fonts.ready);
      const slider = page.locator('[data-figure-frame="scene-representation-ladder"] input[type="range"]');
      await expect(slider).toBeVisible();
      await expect.poll(() => slider.evaluate((element) => Object.keys(element).some((key) => key.startsWith('__reactProps')))).toBe(true);
      const canvas = await slider.evaluate(() => {
        const probe = document.createElement('span');
        probe.style.backgroundColor = 'Canvas';
        document.body.append(probe);
        const color = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return color;
      });
      expect(await slider.evaluate((element) => getComputedStyle(element).height)).toBe('32px');
      for (const [key, value] of [['Home', '0'], ['End', '3']] as const) {
        // Anchor locally, then prove real backwards/forwards keyboard travel.
        // Inserting a sentinel into React-owned children can disrupt hydration.
        await slider.focus();
        await page.keyboard.press('Shift+Tab');
        await expect(slider).not.toBeFocused();
        await page.keyboard.press('Tab');
        await expect(slider).toBeFocused();
        await settleFocusPaint(page);
        expect(focusPaintFailures(await slider.evaluate(readFocusPaint), true)).toEqual([]);
        await page.keyboard.press(key);
        await expect(slider).toHaveValue(value);
        await page.keyboard.press('Tab'); // A focus outline cannot stand in for the thumb.
        await expect(slider).not.toBeFocused();
        const reading = rangeRaster(await slider.screenshot(), canvas);
        expect(reading.visible, JSON.stringify(reading)).toBe(true);
        expect(key === 'Home' ? reading.centroid <= 8 : reading.centroid >= reading.width - 9).toBe(true);
      }
      for (const declaration of ['border:0!important;background:transparent!important', 'width:20px!important;height:20px!important']) {
        const mutant = await page.addStyleTag({ content: `[data-figure-frame="scene-representation-ladder"] input[type="range"]::-webkit-slider-thumb{${declaration}} [data-figure-frame="scene-representation-ladder"] input[type="range"]::-moz-range-thumb{${declaration}}` });
        try {
          expect(rangeRaster(await slider.screenshot(), canvas).visible).toBe(false);
        } finally {
          await mutant.evaluate((element) => element.parentNode?.removeChild(element));
        }
        expect(rangeRaster(await slider.screenshot(), canvas).visible).toBe(true);
      }
      const missingTrack = await page.addStyleTag({ content: '[data-figure-frame="scene-representation-ladder"] input[type="range"]::-webkit-slider-runnable-track{border:0!important;background:transparent!important} [data-figure-frame="scene-representation-ladder"] input[type="range"]::-moz-range-track{border:0!important;background:transparent!important}' });
      try {
        expect(rangeRaster(await slider.screenshot(), canvas).visible).toBe(false);
      } finally {
        await missingTrack.evaluate((element) => element.parentNode?.removeChild(element));
      }
      expect(rangeRaster(await slider.screenshot(), canvas).visible).toBe(true);
    }
  });

  test('real scene label halos preserve glyph pixels and reject foreground-coloured halo mutants', async ({ page, staticBase }) => {
    test.setTimeout(120_000);
    const fixtures = [
      { route: '/classical/scene-representation/', selector: '[data-figure-frame="scene-representation-ladder"] text[data-scene-note][paint-order="stroke"]', count: 5 },
      { route: '/adjacent/autonomous-vehicles/', selector: '[data-figure-frame="av-safety-miles"] text[data-scene-readout]', count: 3 },
      { route: '/frontier/safety-and-assurance/', selector: '[data-figure-frame="safety-rules-timeline"] [data-testid^="safety-rule-"] text', count: 8 },
      { route: '/world-models/world-models-vs-simulators/', selector: '[data-figure-frame="world-model-output-times"] [data-testid^="output-time-"] text', count: 15 },
    ] as const;
    for (const fixture of fixtures) {
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ forcedColors: 'active', colorScheme });
        await page.goto(`${staticBase}${fixture.route}`);
        await page.evaluate(() => document.fonts.ready);
        const labels = page.locator(fixture.selector);
        expect(await labels.count()).toBe(fixture.count);
        await expect.poll(() => labels.first().evaluate((element) => Object.keys(element).some((key) => key.startsWith('__reactProps')))).toBe(true);
        for (const label of await labels.all()) {
          // Isolate the actual label with a known line behind it: the halo must
          // clear that line without thickening the glyphs. Keep glyph geometry.
          const canvas = await label.evaluate((element) => {
            const original = element as SVGTextElement;
            const bounds = original.getBBox();
            const host = document.createElement('div');
            host.id = 'halo-raster-witness';
            host.setAttribute('data-figure-stage', '');
            host.style.cssText = 'position:fixed;left:20px;top:20px;z-index:99999;background:Canvas';
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', String(Math.ceil(bounds.width + 12)));
            svg.setAttribute('height', String(Math.ceil(bounds.height + 12)));
            svg.setAttribute('viewBox', `${bounds.x - 6} ${bounds.y - 6} ${Math.ceil(bounds.width + 12)} ${Math.ceil(bounds.height + 12)}`);
            const clone = original.cloneNode(true) as SVGTextElement;
            const style = getComputedStyle(original);
            clone.style.font = style.font;
            clone.style.letterSpacing = style.letterSpacing;
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            line.setAttribute('x', String(bounds.x - 6));
            line.setAttribute('y', String(bounds.y + bounds.height / 2));
            line.setAttribute('width', String(Math.ceil(bounds.width + 12)));
            line.setAttribute('height', '1');
            line.setAttribute('fill', 'CanvasText');
            svg.append(line);
            svg.append(clone);
            host.append(svg);
            document.body.append(host);
            return getComputedStyle(host).backgroundColor;
          });
          const host = page.locator('#halo-raster-witness');
          const svg = host.locator('svg');
          const clone = svg.locator('text');
          try {
            const actual = contrastingPixels(await svg.screenshot(), canvas).pixels;
            await clone.evaluate((element) => { element.style.stroke = 'Canvas'; });
            const reference = contrastingPixels(await svg.screenshot(), canvas).pixels;
            expect(reference.length).toBeGreaterThan(0);
            expect(actual).toEqual(reference);
            await clone.evaluate((element) => { element.style.stroke = 'none'; });
            expect(contrastingPixels(await svg.screenshot(), canvas).pixels).not.toEqual(reference);
            await clone.evaluate((element) => { element.style.stroke = 'CanvasText'; });
            const obscured = contrastingPixels(await svg.screenshot(), canvas).pixels;
            expect(obscured.length).toBeGreaterThan(reference.length);
            expect(obscured).not.toEqual(reference);
            await clone.evaluate((element) => { element.style.removeProperty('stroke'); });
            expect(contrastingPixels(await svg.screenshot(), canvas).pixels).toEqual(reference);
          } finally {
            await host.evaluate((element) => element.remove());
          }
        }
      }
    }
  });

  test('forced-colors keep foreground data markers visible and reject invisible paint', async ({ page, staticBase }) => {
    test.setTimeout(120_000);
    const fixtures = [
      { route: '/adjacent/autonomous-vehicles/', figure: 'av-safety-miles', count: 2 },
      { route: '/frontier/safety-and-assurance/', figure: 'safety-rules-timeline', count: 4 },
      { route: '/world-models/world-models-vs-simulators/', figure: 'world-model-output-times', count: 4 },
    ] as const;
    for (const colorScheme of ['light', 'dark'] as const) for (const fixture of fixtures) {
      await page.emulateMedia({ forcedColors: 'active', colorScheme });
      await page.goto(`${staticBase}${fixture.route}`);
      await page.evaluate(() => document.fonts.ready);
      const points = page.locator(`[data-figure-frame="${fixture.figure}"] circle[data-chart-role="measurement"]`);
      expect(await points.count()).toBe(fixture.count);
      await expect.poll(() => points.first().evaluate((element) => Object.keys(element).some((key) => key.startsWith('__reactProps')))).toBe(true);
      for (const [index, point] of (await points.all()).entries()) {
        const originalMarkup = await point.evaluate((element) => element.outerHTML);
        const paint = await point.evaluate((element) => {
          const original = element as SVGCircleElement;
          const bounds = original.getBBox();
          const style = getComputedStyle(original);
          let opacity = 1;
          for (let ancestor: Element | null = original; ancestor; ancestor = ancestor.parentElement) {
            opacity *= Number(getComputedStyle(ancestor).opacity);
          }
          const host = document.createElement('div');
          host.id = 'marker-raster-witness';
          host.setAttribute('data-figure-stage', '');
          host.style.cssText = 'position:fixed;left:20px;top:20px;z-index:99999;background:Canvas';
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('width', String(Math.ceil(bounds.width + 12)));
          svg.setAttribute('height', String(Math.ceil(bounds.height + 12)));
          svg.setAttribute('viewBox', `${bounds.x - 6} ${bounds.y - 6} ${Math.ceil(bounds.width + 12)} ${Math.ceil(bounds.height + 12)}`);
          const clone = original.cloneNode(true) as SVGCircleElement;
          // Resolve actual paint and ancestor opacity before isolating the
          // real mark from grid lines, which must not supply its contrast.
          clone.style.fill = style.fill;
          clone.style.fillOpacity = style.fillOpacity;
          clone.style.stroke = style.stroke;
          clone.style.strokeOpacity = style.strokeOpacity;
          clone.style.strokeWidth = style.strokeWidth;
          clone.style.opacity = String(opacity);
          svg.append(clone);
          host.append(svg);
          document.body.append(host);
          return { canvas: getComputedStyle(host).backgroundColor, fill: style.fill, stroke: style.stroke };
        });
        const host = page.locator('#marker-raster-witness');
        const svg = host.locator('svg');
        const clone = svg.locator('circle');
        try {
          const actual = contrastingPixels(await svg.screenshot(), paint.canvas).pixels;
          expect(actual.length, `${fixture.figure} point ${index} at 3:1 contrast`).toBeGreaterThan(0);
          await clone.evaluate((element) => {
            element.style.fill = 'Canvas';
            element.style.stroke = 'Canvas';
          });
          expect(contrastingPixels(await svg.screenshot(), paint.canvas).pixels).toHaveLength(0);
          await clone.evaluate((element, before) => {
            element.style.fill = before.fill;
            element.style.stroke = before.stroke;
          }, paint);
          expect(contrastingPixels(await svg.screenshot(), paint.canvas).pixels).toEqual(actual);
          if (fixture.figure === 'av-safety-miles' && index === 0) {
            // A companion colour fixture covers the other foreground roles
            // without claiming these synthetic colours are observed data.
            for (const role of ['state', 'measurement', 'action', 'value', 'constraint']) {
              await clone.evaluate((element, role) => { element.style.fill = `var(--role-${role}-stage)`; }, role);
              expect(contrastingPixels(await svg.screenshot(), paint.canvas).pixels.length, `${role} foreground at 3:1 contrast`).toBeGreaterThan(0);
            }
          }
        } finally {
          await host.evaluate((element) => element.remove());
        }
        expect(await point.evaluate((element) => element.outerHTML)).toBe(originalMarkup);
      }
    }
  });

  test('forced-colors preserve filled and hollow download-status dots and reject reversed paint', async ({ page, staticBase }) => {
    test.setTimeout(120_000);
    const months = [...new Set(PI_GENERATIONS.flatMap((generation) => generation.released ? [generation.released] : []))];
    expect(months).toHaveLength(5);
    expect(months.filter((month) => PI_GENERATIONS.some((generation) => generation.released === month && generation.openWeights === true))).toHaveLength(3);
    for (const width of [1280, 375]) for (const colorScheme of ['light', 'dark'] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ forcedColors: 'active', colorScheme });
      await page.goto(`${staticBase}/manipulation/pi-line/`);
      await page.evaluate(() => document.fonts.ready);
      const figure = page.locator('[data-figure-frame="pi-generation-timeline"]');
      const points = figure.locator('[data-generation-dot] > circle:not([data-generation-selected])');
      await expect(points).toHaveCount(months.length);
      await expect.poll(() => points.first().evaluate((element) => Object.keys(element).some((key) => key.startsWith('__reactProps')))).toBe(true);
      for (const month of months) {
        const downloadable = PI_GENERATIONS.some((generation) => generation.released === month && generation.openWeights === true);
        const point = figure.locator(`[data-generation-dot="${month}"] > circle:not([data-generation-selected])`);
        const originalMarkup = await point.evaluate((element) => element.outerHTML);
        const paint = await point.evaluate((element) => {
          const original = element as SVGCircleElement;
          const bounds = original.getBBox();
          const style = getComputedStyle(original);
          let opacity = 1;
          for (let ancestor: Element | null = original; ancestor; ancestor = ancestor.parentElement) opacity *= Number(getComputedStyle(ancestor).opacity);
          const host = document.createElement('div');
          host.id = 'download-marker-raster-witness';
          host.setAttribute('data-figure-stage', '');
          host.style.cssText = 'position:fixed;left:20px;top:20px;z-index:99999;background:Canvas';
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('width', String(Math.ceil(bounds.width + 12)));
          svg.setAttribute('height', String(Math.ceil(bounds.height + 12)));
          svg.setAttribute('viewBox', `${bounds.x - 6} ${bounds.y - 6} ${Math.ceil(bounds.width + 12)} ${Math.ceil(bounds.height + 12)}`);
          const clone = original.cloneNode(true) as SVGCircleElement;
          // Isolate the actual dot paint so the axis or selection ring
          // cannot supply its outline or disguise a wrongly filled centre.
          clone.style.fill = style.fill;
          clone.style.fillOpacity = style.fillOpacity;
          clone.style.stroke = style.stroke;
          clone.style.strokeOpacity = style.strokeOpacity;
          clone.style.strokeWidth = style.strokeWidth;
          clone.style.opacity = String(opacity);
          svg.append(clone);
          host.append(svg);
          document.body.append(host);
          return { canvas: getComputedStyle(host).backgroundColor, fill: style.fill, stroke: style.stroke };
        });
        const host = page.locator('#download-marker-raster-witness');
        const svg = host.locator('svg');
        const clone = svg.locator('circle');
        const readMarker = async () => {
          const raster = contrastingPixels(await svg.screenshot(), paint.canvas);
          const centre = raster.pixels.filter(({ x, y }) => Math.abs(x - (raster.width - 1) / 2) <= 1 && Math.abs(y - (raster.height - 1) / 2) <= 1);
          return { pixels: raster.pixels, filled: centre.length > 0 };
        };
        try {
          const actual = await readMarker();
          expect(actual.pixels.length, `${month} visible marker outline`).toBeGreaterThan(0);
          expect(actual.filled, `${month} confirmed download status at ${width}px/${colorScheme}`).toBe(downloadable);
          await clone.evaluate((element, replacement) => { element.style.fill = replacement; }, downloadable ? paint.canvas : paint.stroke);
          expect((await readMarker()).filled, `${month} reversed-status mutant`).toBe(!downloadable);
          await clone.evaluate((element, fill) => { element.style.fill = fill; }, paint.fill);
          expect(await readMarker()).toEqual(actual);
        } finally {
          await host.evaluate((element) => element.remove());
        }
        expect(await point.evaluate((element) => element.outerHTML)).toBe(originalMarkup);
      }
    }
  });

});
