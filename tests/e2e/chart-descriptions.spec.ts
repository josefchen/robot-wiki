import { expect, test, type Locator, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Chart-description contract (VAL-EDU-021..025) over the retrofitted
 * series charts, against the shipped static export (OS-assigned port, same
 * convention as the article-header spec).
 *
 * Per route: the SVG carries aria-describedby resolving to a visible
 * takeaway paragraph (>= 60 chars) plus a short non-identical aria-label;
 * the disclosure declares a table form and renders a real sampled table
 * (5-10 rows, scoped headers, no empty cells); moving the primary control
 * changes the description's digit tokens and returning to the default
 * restores the original text exactly; and with JavaScript disabled the
 * description renders and the disclosure opens with numbers matching the
 * no-JS readout.
 *
 * CompoundingError mounts two roots in one shell (bounds table + rollout
 * state). Series assertions select the table disclosure by form, never
 * `.first()` on a bare `[data-chart-data]`. The rollout state root has
 * its own assertion at the bottom of this file.
 */

let BASE: string;
let server: StaticExportServer | null = null;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the chart-descriptions spec',
  ).toBe(true);
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

const CHARTS: Array<{
  route: string;
  name: string;
  control: 'range' | 'gait-phase' | 'button';
  /** Two non-default values for the primary control, then the default. */
  moves: string[];
  def: string;
  /** When set, pick the description whose text contains this substring. */
  match?: string;
}> = [
  // The home front page's only figure is the featured scene, so the
  // reliability chart is graded on the reliability-gap calculator.
  { route: '/frontier/reliability-gap', name: 'reliability', control: 'range', moves: ['90', '99'], def: '95' },
  // EgoScale and the data-scale chart mount once, inside their prediction
  // steps, so the defaults are the hint's configuration (250k h, 10 rigs).
  { route: '/frontier/generalization', name: 'egoscale', control: 'range', moves: ['5600', '4301'], def: '5398' },
  { route: '/data-hardware/data-bottleneck', name: 'datascale', control: 'range', moves: ['100', '500'], def: '10' },
  // No gait or trainingtime rows: legged-locomotion and parallel-sim-rl
  // keep their scenes, and GaitDiagram and TrainingTimeChart mount on no
  // route (lib/chart-descriptions.ts marks both unmounted).
  { route: '/manipulation/realtime-execution', name: 'controlloop', control: 'range', moves: ['1.0', '9.1'], def: '3.0' },
  // No kalman row: /classical/state-estimation no longer mounts a chart.
  // The Kalman tracker was replaced by the kalman-predict-update motion
  // scene, whose text alternative and beats are covered by
  // state-estimation.spec.ts and motion-scenes.spec.ts.
  { route: '/manipulation/bc-foundations', name: 'compounding', control: 'range', moves: ['10', '1'], def: '5', match: 'dashed curves' },
  { route: '/manipulation/action-chunking', name: 'chunksize', control: 'range', moves: ['1', '400'], def: '100', match: 'chunk size' },
  // The delay figure opens on the larger tested setting, +200 ms.
  { route: '/manipulation/action-chunking', name: 'latency-throughput', control: 'range', moves: ['140', '0'], def: '200', match: 'normalized toy scores' },
  // The hand-off figure opens on the 0.2 second delay preset.
  { route: '/manipulation/realtime-execution', name: 'execution', control: 'range', moves: ['80', '0'], def: '200', match: 'synchronous velocity' },
  { route: '/manipulation/vla-models', name: 'tokenization', control: 'range', moves: ['0', '15'], def: '7' },
  // The advantage figure settles at the end of its 40-second episode.
  { route: '/manipulation/rl-finetuning', name: 'advantage', control: 'range', moves: ['12', '32'], def: '40' },
  { route: '/rl-sim2real/sim2real-transfer', name: 'friction', control: 'range', moves: ['50', '120'], def: '80', match: 'selected friction' },
  { route: '/world-models/latent-dynamics', name: 'latent', control: 'range', moves: ['30', '50'], def: '15', match: 'shaded band' },
  // The planner-or-reflex figure opens on the slippery patch.
  {
    route: '/rl-sim2real/reward-design-mpc',
    name: 'mpc-vs-rl',
    control: 'button',
    moves: ['Sideways shove', 'Heavy backpack'],
    def: 'Slippery patch',
    match: 'MPC base-height',
  },
];

/** Set a range input the way React's controlled component sees it. */
async function setRange(page: Page, input: Locator, value: string) {
  await input.evaluate((el, v) => {
    const target = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )!.set!;
    setter.call(target, String(v));
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await page.waitForTimeout(150);
}

/** Drive the chart's primary control: range, gait-phase, or perturbation buttons. */
async function setControl(
  page: Page,
  shell: Locator,
  chart: (typeof CHARTS)[number],
  value: string,
) {
  if (chart.control === 'button') {
    await shell.getByRole('button', { name: value, exact: true }).click();
    await page.waitForTimeout(150);
    return;
  }
  const control = shell
    .locator(chart.control === 'gait-phase' ? '#gait-phase' : 'input[type="range"]')
    .first();
  await setRange(page, control, value);
}

/** The disclosure that belongs to this takeaway, not every one in the shell. */
function disclosureFor(desc: Locator) {
  return desc.locator('xpath=../details[@data-chart-data]');
}

/**
 * Open every prediction-step reveal and every figure fold. Where a page's
 * one chart sits inside its prediction step, or a figure keeps its
 * description in its "How this was made" fold, the closed disclosure gives
 * the text no rendered innerText, so the text checks read it after it opens.
 */
async function openReveals(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll('details[data-reveal], details[data-figure-fold]').forEach((d) => {
      (d as HTMLDetailsElement).open = true;
    });
  });
}

for (const chart of CHARTS) {
  test.describe(`${chart.name} chart description (${chart.route})`, () => {
    test('SVG resolves a real description and a short name', async ({ page }) => {
      await page.goto(`${BASE}${chart.route}`);
      const desc = chart.match
        ? page.locator('[data-chart-description]', { hasText: chart.match }).first()
        : page.locator('[data-chart-description]').first();
      await expect(desc).toBeAttached();
      const shell = page.locator('[data-figure-frame]', { has: desc }).first();
      // Bind the SVG to the takeaway we selected. `.first()` on
      // svg[role][aria-describedby] silently picks CompoundingError's
      // rollout root when the test meant the bounds series.
      const descId = await desc.getAttribute('id');
      expect(descId, 'description has an id').toBeTruthy();
      // Bind by describedby so a sibling root is not checked. Several
      // panels may share one takeaway (the ExecutionModes small multiples
      // are role="img" groups in one SVG); take the first of those matches
      // rather than requiring uniqueness.
      const svg = shell
        .locator(`svg[role][aria-describedby="${descId}"], svg g[role][aria-describedby="${descId}"]`)
        .first();
      await expect(svg).toBeAttached();
      const describedby = await svg.getAttribute('aria-describedby');
      expect(describedby, 'aria-describedby is set').toBe(descId);
      // The id resolves, inside this shell, to the takeaway paragraph.
      // Resolved via getElementById (a CSS-escaped selector would also
      // work, but the id contains useId colons).
      const resolved = await shell.evaluate(
        (el, id) => {
          const target = el.querySelector(`[id="${id}"]`);
          if (!target) return null;
          return {
            tag: target.tagName,
            text: (target.textContent ?? '').trim(),
            hidden:
              target.closest('[aria-hidden="true"]') !== null ||
              target.getAttribute('aria-hidden') === 'true',
          };
        },
        describedby!,
      );
      expect(resolved, 'describedby target exists in the shell').toBeTruthy();
      expect(resolved!.tag.toLowerCase()).toBe('p');
      expect(resolved!.hidden).toBe(false);
      const text = resolved!.text;
      expect(text.length, 'description >= 60 chars').toBeGreaterThanOrEqual(60);
      const label = await svg.getAttribute('aria-label');
      expect(label, 'aria-label is set and short').toBeTruthy();
      // VAL-EDU-021: a short name, not a second copy of the description.
      // A fixed 200-char cap falsely failed the latency-throughput label
      // (212) which is still well shorter than its takeaway paragraph.
      expect(label!.trim()).not.toBe(text);
      expect(label!.length).toBeLessThan(text.length);
    });

    test('disclosure declares a table form with a scoped, non-empty sample', async ({ page }) => {
      await page.goto(`${BASE}${chart.route}`);
      const desc = chart.match
        ? page.locator('[data-chart-description]', { hasText: chart.match }).first()
        : page.locator('[data-chart-description]').first();
      const details = disclosureFor(desc);
      await expect(details).toBeAttached();
      await expect(details).toHaveAttribute('data-chart-form', 'table');
      await details.evaluate((el) => (el as HTMLDetailsElement).open = true);
      const table = details.locator('table');
      await expect(table).toHaveCount(1);
      const rowCount = await details.locator('tbody tr').count();
      expect(rowCount).toBeGreaterThanOrEqual(5);
      expect(rowCount).toBeLessThanOrEqual(10);
      // Column headers carry scope=col; row headers scope=row.
      await expect(details.locator('thead th[scope="col"]').first()).toBeAttached();
      await expect(details.locator('tbody th[scope="row"]').first()).toBeAttached();
      // No empty cells.
      const empty = await details
        .locator('td, th')
        .evaluateAll((cells) =>
          cells.filter((c) => (c.textContent ?? '').trim() === '').length,
        );
      expect(empty).toBe(0);
    });

    test('description tracks the primary control and restores exactly', async ({ page }) => {
      await page.goto(`${BASE}${chart.route}`);
      await openReveals(page);
      const desc = chart.match
        ? page.locator('[data-chart-description]', { hasText: chart.match }).first()
        : page.locator('[data-chart-description]').first();
      const shell = page.locator('[data-figure-frame]', { has: desc }).first();
      const details = disclosureFor(desc);
      await details.evaluate((el) => (el as HTMLDetailsElement).open = true);
      const original = (await desc.innerText()).trim();
      const digit = (s: string) => (s.match(/\S*\d\S*/g) ?? []).join(' ');
      let previous = original;
      for (const value of chart.moves) {
        await setControl(page, shell, chart, value);
        const moved = (await desc.innerText()).trim();
        expect(
          digit(moved) !== digit(previous),
          `digits change at control=${value}`,
        ).toBe(true);
        const rowText = await details
          .locator('tbody tr')
          .evaluateAll((rows) => rows.map((r) => r.textContent ?? '').join('|'));
        expect(
          rowText.includes('NaN') || rowText.includes('undefined'),
          'no NaN or undefined leaks into the table',
        ).toBe(false);
        previous = moved;
      }
      await setControl(page, shell, chart, chart.def);
      await expect
        .poll(async () => (await desc.innerText()).trim())
        .toBe(original);
    });

    test('description renders without JavaScript and the disclosure opens', async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(`${BASE}${chart.route}`);
      await openReveals(page);
      const desc = chart.match
        ? page.locator('[data-chart-description]', { hasText: chart.match }).first()
        : page.locator('[data-chart-description]').first();
      await expect(desc).toBeAttached();
      const text = (await desc.innerText()).trim();
      expect(text.length).toBeGreaterThanOrEqual(60);
      // The description's digit tokens that name plotted values appear in
      // the chart's own SSR readout or axis labels.
      const shell = page.locator('[data-figure-frame]', { has: desc }).first();
      const shellText = (await shell.innerText()).replace(text, '');
      const digits = text.match(/\S*\d\S*/g) ?? [];
      const plotted = digits.filter((d) => shellText.includes(d));
      expect(
        plotted.length,
        `at least some digit tokens appear in the no-JS readout (${digits.join(', ')} -> ${plotted.join(', ')})`,
      ).toBeGreaterThanOrEqual(1);
      // The disclosure opens without script.
      const details = disclosureFor(desc);
      const opened = await details.evaluate((el) => {
        const d = el as HTMLDetailsElement;
        d.open = true;
        return d.open && d.querySelector('table') !== null;
      });
      expect(opened).toBe(true);
      await context.close();
    });
  });
}

test.describe('compounding rollout state description (/manipulation/bc-foundations)', () => {
  test('rollout root declares a state-form dl with labelled pairs and no table', async ({
    page,
  }) => {
    await page.goto(`${BASE}/manipulation/bc-foundations`);
    await openReveals(page);
    const desc = page
      .locator('[data-chart-description]', { hasText: 'Per-timestep prediction' })
      .first();
    await expect(desc).toBeAttached();
    const shell = page.locator('[data-figure-frame]', { has: desc }).first();
    const descId = await desc.getAttribute('id');
    expect(descId, 'description has an id').toBeTruthy();
    const svg = shell.locator(`svg[role][aria-describedby="${descId}"]`).first();
    await expect(svg).toBeAttached();

    const details = desc.locator('xpath=../details[@data-chart-data]');
    await expect(details).toHaveAttribute('data-chart-form', 'state');
    await details.evaluate((el) => {
      (el as HTMLDetailsElement).open = true;
    });
    await expect(details.locator('table')).toHaveCount(0);
    await expect(details.locator('dl')).toHaveCount(1);
    const terms = details.locator('dt');
    const values = details.locator('dd');
    const termCount = await terms.count();
    expect(termCount).toBeGreaterThanOrEqual(3);
    expect(await values.count()).toBe(termCount);
    let rich = 0;
    for (let i = 0; i < termCount; i += 1) {
      const term = ((await terms.nth(i).innerText()) ?? '').trim();
      const value = ((await values.nth(i).innerText()) ?? '').trim();
      expect(term.length, 'term non-empty').toBeGreaterThan(0);
      expect(value.length, 'value non-empty').toBeGreaterThan(0);
      if (/\d/.test(value) || /[A-Za-z]{3,}/.test(value)) rich += 1;
    }
    expect(rich, 'at least 2 digit or named-regime values').toBeGreaterThanOrEqual(2);

    await expect(shell.locator('details[data-chart-data][data-chart-form="table"]')).toHaveCount(1);
    await expect(shell.locator('details[data-chart-data][data-chart-form="state"]')).toHaveCount(1);
  });
});
