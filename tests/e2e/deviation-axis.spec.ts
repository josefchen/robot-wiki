import { expect, test, type Locator, type Page } from '@playwright/test';
import { DEVIATION_AXIS_TICKS, deviationAxisFraction } from '../../lib/compounding-error';
import { setSlider } from './slider';

/**
 * VAL-MAN-067: the accumulated-deviation plot makes the chunking drop
 * legible without flattening the sliders.
 *
 * Geometry is measured from the rendered SVG, in the contract's terms:
 * plot height is the distance from the chart's zero baseline (the tick
 * labelled 0) to its topmost gridline, and marker height is the distance
 * from that baseline to the marker's centre, as a percentage of plot
 * height. Both mounts on /manipulation/bc-foundations are graded: the
 * article's lab and the one seeded inside the prediction step.
 *
 * Why the bounds cut both ways: an axis fitted to whatever is currently
 * plotted satisfies (a) and (b) trivially and destroys (c) and (d),
 * because the marker then sits at a near-constant height and both
 * sliders read as no-ops. The fix has to move the marker on the mode
 * toggle AND keep it climbing with error and horizon.
 */

const ROUTE = '/manipulation/bc-foundations/';
const VIEWPORT = { width: 1440, height: 900 };

interface Geometry {
  /** Marker centre height above the zero baseline, as a % of plot height. */
  markerPercent: number;
  /** Tick label text with the y coordinate it is drawn at. */
  ticks: Array<{ label: string; y: number }>;
  readout: string;
}

/**
 * The bounds chart of one CompoundingError mount: the SVG whose
 * accessible name names the regret bounds.
 */
function boundsChart(mount: Locator): Locator {
  return mount.locator('svg[role="img"][aria-label*="regret bounds"]');
}

async function readGeometry(mount: Locator): Promise<Geometry> {
  const svg = boundsChart(mount);
  const geo = await svg.evaluate((el) => {
    const svgEl = el as SVGSVGElement;
    // Tick labels are the end-anchored texts in the left gutter; the
    // gridline they annotate shares their y. Bind to the label text so
    // the measurement cannot silently read the x-axis row instead.
    const texts = Array.from(svgEl.querySelectorAll('text')).filter(
      (t) => t.getAttribute('text-anchor') === 'end',
    );
    const ticks = texts
      .map((t) => ({
        label: (t.textContent ?? '').trim(),
        y: parseFloat(t.getAttribute('y') ?? '0'),
      }))
      .filter((t) => /^\d+$/.test(t.label))
      .sort((a, b) => b.y - a.y);
    const marker = svgEl.querySelector('circle');
    return {
      ticks,
      markerCy: marker ? parseFloat(marker.getAttribute('cy') ?? 'NaN') : NaN,
    };
  });
  expect(geo.ticks.length, 'no y tick labels found on the bounds chart').toBeGreaterThanOrEqual(2);
  expect(Number.isFinite(geo.markerCy), 'no position marker on the bounds chart').toBe(true);
  const zero = geo.ticks[0];
  expect(zero.label, 'the lowest y tick must be the zero baseline').toBe('0');
  const top = geo.ticks[geo.ticks.length - 1];
  const plotHeight = zero.y - top.y;
  expect(plotHeight, 'degenerate plot height').toBeGreaterThan(20);
  const readout = (
    await mount.getByTestId('accumulated-deviation-readout').textContent()
  )?.trim();
  return {
    markerPercent: (100 * (zero.y - geo.markerCy)) / plotHeight,
    ticks: geo.ticks,
    readout: readout ?? '',
  };
}

/** The lab mount (article prose) and the seeded prediction-step mount. */
async function mounts(page: Page): Promise<{ lab: Locator; predict: Locator }> {
  const predict = page.locator('[data-predict]');
  await expect(predict).toHaveCount(1);
  // Open the prediction step so its seeded figure is measurable.
  await predict.locator('details[data-reveal] > summary').click();
  const all = page.locator('svg[aria-label*="regret bounds"]');
  await expect(all).toHaveCount(2);
  // The lab is the mount NOT inside the prediction step.
  const lab = page
    .locator('[data-pagefind-body] > div')
    .filter({ has: page.locator('svg[aria-label*="regret bounds"]') })
    .first();
  return { lab, predict };
}

async function setEpsilon(mount: Locator, percent: number): Promise<void> {
  const slider = mount.getByRole('slider', { name: /per-step error/i });
  await setSlider(slider, percent);
}

async function setHorizon(mount: Locator, steps: number): Promise<void> {
  const slider = mount.getByRole('slider', { name: /episode horizon/i });
  await setSlider(slider, steps);
}

test.describe('accumulated-deviation axis (VAL-MAN-067)', () => {
  test.use({ viewport: VIEWPORT });

  test('(a) and (b): defaults are legible and the mode toggle moves the marker', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const { lab } = await mounts(page);
    const atDefaults = await readGeometry(lab);
    expect(
      atDefaults.markerPercent,
      `(a) marker at the article defaults: ${atDefaults.markerPercent.toFixed(1)}% of plot height, readout ${atDefaults.readout}`,
    ).toBeGreaterThanOrEqual(20);

    await lab.getByRole('button', { name: /chunk of 25 actions/i }).click();
    const chunked = await readGeometry(lab);
    const drop = atDefaults.markerPercent - chunked.markerPercent;
    expect(
      drop,
      `(b) mode-toggle drop: ${atDefaults.markerPercent.toFixed(1)}% to ${chunked.markerPercent.toFixed(1)}% (readouts ${atDefaults.readout} to ${chunked.readout})`,
    ).toBeGreaterThanOrEqual(25);
  });

  test('(c): raising the per-step error still visibly increases divergence', async ({ page }) => {
    await page.goto(ROUTE);
    const { lab } = await mounts(page);
    await setHorizon(lab, 240);
    const heights: number[] = [];
    for (const percent of [2.5, 5.0, 10.0, 15.0]) {
      await setEpsilon(lab, percent);
      const geo = await readGeometry(lab);
      heights.push(geo.markerPercent);
    }
    for (let i = 1; i < heights.length; i += 1) {
      expect(
        heights[i],
        `(c) not strictly increasing at sample ${i}: ${heights.map((h) => h.toFixed(1)).join(' / ')}`,
      ).toBeGreaterThan(heights[i - 1]);
    }
    expect(
      heights[heights.length - 1] - heights[0],
      `(c) total rise: ${heights.map((h) => h.toFixed(1)).join(' / ')}`,
    ).toBeGreaterThanOrEqual(20);
  });

  test('(d): raising the horizon still visibly increases divergence', async ({ page }) => {
    await page.goto(ROUTE);
    const { lab } = await mounts(page);
    const heights: number[] = [];
    for (const steps of [60, 120, 180, 240]) {
      await setHorizon(lab, steps);
      const geo = await readGeometry(lab);
      heights.push(geo.markerPercent);
    }
    for (let i = 1; i < heights.length; i += 1) {
      expect(
        heights[i],
        `(d) not strictly increasing at sample ${i}: ${heights.map((h) => h.toFixed(1)).join(' / ')}`,
      ).toBeGreaterThan(heights[i - 1]);
    }
    expect(
      heights[heights.length - 1] - heights[0],
      `(d) total rise: ${heights.map((h) => h.toFixed(1)).join(' / ')}`,
    ).toBeGreaterThanOrEqual(20);
  });

  test('(e): the seeded prediction-step mount clears the same bounds', async ({ page }) => {
    await page.goto(ROUTE);
    const { predict } = await mounts(page);
    // Seeded configuration, unchanged: 5.0% error over 240 steps. The
    // hint names it, so this must pass without touching the seed.
    await expect(predict.getByRole('slider', { name: /episode horizon/i })).toHaveValue('240');
    await expect(predict.getByRole('slider', { name: /per-step error/i })).toHaveValue('5');
    const seeded = await readGeometry(predict);
    expect(
      seeded.markerPercent,
      `(e) seeded marker: ${seeded.markerPercent.toFixed(1)}% (readout ${seeded.readout})`,
    ).toBeGreaterThanOrEqual(20);

    await setHorizon(predict, 120);
    const pulled = await readGeometry(predict);
    expect(
      seeded.markerPercent - pulled.markerPercent,
      `(e) horizon drop: ${seeded.markerPercent.toFixed(1)}% to ${pulled.markerPercent.toFixed(1)}%`,
    ).toBeGreaterThanOrEqual(20);
  });

  test('(f): every tick label is the value its gridline carries, in every state', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const { lab } = await mounts(page);
    const DASHES = /[\u2013\u2014]/;

    // The scale is non-linear, so it must say so in rendered chart text
    // of at least three characters.
    const chartText = await boundsChart(lab).evaluate((el) =>
      Array.from(el.querySelectorAll('text'))
        .map((t) => (t.textContent ?? '').trim())
        .join(' | '),
    );
    const scaleLabel = chartText
      .split(' | ')
      .find((t) => /log/i.test(t) && t.length >= 3);
    expect(scaleLabel, `(f) no scale marker in chart text: ${chartText}`).toBeTruthy();
    expect(DASHES.test(chartText), `(f) dash in chart text: ${chartText}`).toBe(false);

    // Ticks are checked against the plotted domain at three settings.
    // A fixed domain means they must not move, which is exactly the
    // claim: the label is honest because the mapping never changes.
    const states: Array<() => Promise<void>> = [
      async () => {},
      async () => {
        await setEpsilon(lab, 15);
        await setHorizon(lab, 240);
      },
      async () => {
        await lab.getByRole('button', { name: /chunk of 25 actions/i }).click();
        await lab.getByRole('button', { name: /dagger relabeling/i }).click();
      },
    ];
    for (const [i, apply] of states.entries()) {
      await apply();
      const geo = await readGeometry(lab);
      const zeroY = geo.ticks[0].y;
      const topY = geo.ticks[geo.ticks.length - 1].y;
      const plotHeight = zeroY - topY;
      expect(
        geo.ticks.map((t) => Number(t.label)),
        `(f) tick label set changed in state ${i}`,
      ).toEqual([...DEVIATION_AXIS_TICKS]);
      for (const tick of geo.ticks) {
        const rendered = (zeroY - tick.y) / plotHeight;
        const expected = deviationAxisFraction(Number(tick.label));
        expect(
          rendered,
          `(f) state ${i}: tick "${tick.label}" is drawn at ${(100 * rendered).toFixed(2)}% where the plotted domain maps it to ${(100 * expected).toFixed(2)}%`,
        ).toBeCloseTo(expected, 3);
      }
    }
  });
});
