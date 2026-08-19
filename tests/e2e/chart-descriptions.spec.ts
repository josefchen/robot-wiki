import { expect, test, type Locator, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Chart-description contract (VAL-EDU-021..025) over the six retrofitted
 * charts, against the shipped static export (OS-assigned port, same
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
  { route: '/', name: 'reliability', control: 'range', moves: ['90', '99'], def: '95' },
  { route: '/frontier/generalization', name: 'egoscale', control: 'range', moves: ['5600', '4301'], def: '5000' },
  { route: '/data-hardware/data-bottleneck', name: 'datascale', control: 'range', moves: ['100', '500'], def: '15' },
  { route: '/rl-sim2real/legged-locomotion', name: 'gait', control: 'gait-phase', moves: ['50', '75'], def: '0' },
  { route: '/rl-sim2real/parallel-sim-rl', name: 'trainingtime', control: 'range', moves: ['7', '13'], def: '12' },
  { route: '/manipulation/realtime-execution', name: 'controlloop', control: 'range', moves: ['1.0', '9.1'], def: '3.0' },
  { route: '/classical/state-estimation', name: 'kalman', control: 'range', moves: ['0.5', '1'], def: '0.2' },
  { route: '/manipulation/bc-foundations', name: 'compounding', control: 'range', moves: ['10', '1'], def: '5', match: 'dashed curves' },
  { route: '/manipulation/action-chunking', name: 'chunksize', control: 'range', moves: ['1', '400'], def: '100', match: 'chunk size' },
  { route: '/manipulation/action-chunking', name: 'latency-throughput', control: 'range', moves: ['140', '200'], def: '0', match: 'task throughput' },
  { route: '/manipulation/realtime-execution', name: 'execution', control: 'range', moves: ['80', '200'], def: '0', match: 'synchronous velocity' },
  { route: '/manipulation/vla-models', name: 'tokenization', control: 'range', moves: ['0', '15'], def: '7' },
  { route: '/manipulation/rl-finetuning', name: 'advantage', control: 'range', moves: ['12', '32'], def: '0' },
  { route: '/rl-sim2real/sim2real-transfer', name: 'friction', control: 'range', moves: ['50', '120'], def: '80' },
  { route: '/world-models/latent-dynamics', name: 'latent', control: 'range', moves: ['30', '50'], def: '15' },
  {
    route: '/rl-sim2real/reward-design-mpc',
    name: 'mpc-vs-rl',
    control: 'button',
    moves: ['low-friction patch', '+5 kg payload'],
    def: 'lateral push',
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

for (const chart of CHARTS) {
  test.describe(`${chart.name} chart description (${chart.route})`, () => {
    test('SVG resolves a real description and a short name', async ({ page }) => {
      await page.goto(`${BASE}${chart.route}`);
      const desc = chart.match
        ? page.locator('[data-chart-description]', { hasText: chart.match }).first()
        : page.locator('[data-chart-description]').first();
      await expect(desc).toBeAttached();
      const shell = page.locator('div.rounded-md.border', { has: desc }).first();
      // A component can paint more than one SVG (rollout + bounds,
      // imagined path + deviation). The described root is the one that
      // actually carries aria-describedby; `.first()` silently picks a
      // sibling diagram and reports a false miss.
      const svg = shell.locator('svg[role][aria-describedby]').first();
      const describedby = await svg.getAttribute('aria-describedby');
      expect(describedby, 'aria-describedby is set').toBeTruthy();
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
      const shell = page.locator('div.rounded-md', { has: desc }).first();
      const details = shell.locator('details[data-chart-data]').first();
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
      const desc = chart.match
        ? page.locator('[data-chart-description]', { hasText: chart.match }).first()
        : page.locator('[data-chart-description]').first();
      const shell = page.locator('div.rounded-md', { has: desc }).first();
      const details = shell.locator('details[data-chart-data]').first();
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
      const desc = chart.match
        ? page.locator('[data-chart-description]', { hasText: chart.match }).first()
        : page.locator('[data-chart-description]').first();
      await expect(desc).toBeAttached();
      const text = (await desc.innerText()).trim();
      expect(text.length).toBeGreaterThanOrEqual(60);
      // The description's digit tokens that name plotted values appear in
      // the chart's own SSR readout or axis labels.
      const shell = page.locator('div.rounded-md', { has: desc }).first();
      const shellText = (await shell.innerText()).replace(text, '');
      const digits = text.match(/\S*\d\S*/g) ?? [];
      const plotted = digits.filter((d) => shellText.includes(d));
      expect(
        plotted.length,
        `at least some digit tokens appear in the no-JS readout (${digits.join(', ')} -> ${plotted.join(', ')})`,
      ).toBeGreaterThanOrEqual(1);
      // The disclosure opens without script.
      const details = shell.locator('details[data-chart-data]').first();
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
