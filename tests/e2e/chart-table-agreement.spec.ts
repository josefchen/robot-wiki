import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { publishedModules } from '../../data/modules';
import {
  checkClauseA,
  checkClauseB,
  inferSliderTransform,
  numbersIn,
  parseNumericToken,
  sliderMatchesRowAxis,
  tokenDecimals,
  type ChartSnapshot,
  type SliderInfo,
} from './helpers/table-agreement';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * VAL-EDU-023: the sampled table agrees with the chart it describes.
 *
 * "For every chart data disclosure whose form is `table`, the sampled
 * values agree with the chart a reader sees. Three checks. (a) The first
 * and last row of the table carry the endpoint x-values of the plotted
 * range, matching the first and last x-axis tick labels rendered in the
 * SVG, or lying inside them with no rendered tick outside the table's
 * range. (b) Wherever the description and the table both name a value at
 * the same x-value, the two agree to the precision printed in the table
 * ... Prose citing a raw measured value where the table prints the fitted
 * one at the same x-value is such a disagreement, not a difference of
 * rendering. A digit-bearing token whose x-value the table does not
 * sample is not a divergence by itself ... record that token as unsampled
 * and carry on rather than failing on it. (c) On every chart whose
 * primary control sets the x-value, setting that control to the x-value
 * of at least two sampled rows makes the interactive's readout show that
 * row's value, to the precision printed in the table."
 * (contract/educational-ux.md, clause (b) as clarified after
 * user-testing round 1: explicitly two-branch.)
 *
 * Population: DERIVED from the rendered export. Every route in the module
 * registry plus the home page is walked, and every
 * `details[data-chart-data][data-chart-form="table"]` disclosure found in
 * the rendered DOM is graded. No chart list is typed here. The pinned
 * total (27) is the round-1 enumeration; the walk is registry-derived, so
 * a newly published table-form chart is always visited, and the pin only
 * makes the population change a conscious review point.
 *
 * Matching rules live in tests/e2e/helpers/table-agreement.ts and are
 * unit-tested against captured fixtures in tests/unit/table-agreement.
 * test.ts, including the pre-fix EgoScale table as the red-phase
 * fixture (clause (b) fails it) and the six carve-out families
 * (ReliabilityCompounding, CompoundingError lab, ControlLoopBudget
 * predict mount, TrainingTimeChart, GaitDiagram, latent-dynamics) whose
 * descriptions legitimately cite values at unsampled x-values.
 */

let BASE: string;
let server: StaticExportServer | null = null;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the chart-table-agreement spec',
  ).toBe(true);
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

interface CapturedSlider extends SliderInfo {
  index: number;
}

interface CapturedChart extends ChartSnapshot {
  sliderDefaults?: string[];
  sliders: CapturedSlider[];
  aDetail: string;
  bViolations: string[];
  bRecords: Array<{ token: string; row: string; outcome: string }>;
}

function slash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

const ROUTES = ['/', ...publishedModules().map((m) => slash(`/${m.domain}/${m.slug}`))];

async function captureCharts(page: import('@playwright/test').Page): Promise<Omit<CapturedChart, 'route'>[]> {
  const raw = await page.evaluate((): Array<{
    desc: string;
    headers: string[];
    rows: Array<{ label: string; cells: string[] }>;
    ticks: string[];
    sliders: Array<{
      index: number;
      label: string;
      min: number;
      max: number;
      step: number;
      value: number;
    }>;
    sliderDefaults: string[];
  }> => {
    const digitTextsOf = (svg: Element) =>
      Array.from(svg.querySelectorAll('text')).map((t) => ({
        content: (t.textContent ?? '').trim(),
        x: parseFloat(t.getAttribute('x') ?? '0'),
        y: parseFloat(t.getAttribute('y') ?? '0'),
      }));
    const vLinesOf = (svg: Element) =>
      Array.from(svg.querySelectorAll('line'))
        .filter((l) => l.getAttribute('x1') === l.getAttribute('x2'))
        .map((l) => parseFloat(l.getAttribute('x1') ?? '0'));

    const out: Array<{
      desc: string;
      headers: string[];
      rows: Array<{ label: string; cells: string[] }>;
      ticks: string[];
      sliders: Array<{
        index: number;
        label: string;
        min: number;
        max: number;
        step: number;
        value: number;
      }>;
      sliderDefaults: string[];
    }> = [];
    document
      .querySelectorAll('details[data-chart-data][data-chart-form="table"]')
      .forEach((d) => {
        const wrapper = d.parentElement!;
        const desc = wrapper.querySelector('[data-chart-description]');
        const descId = desc?.id ?? null;
        const svg = descId
          ? document.querySelector(`svg[aria-describedby="${descId}"]`)
          : null;
        let panel: Element | null = wrapper;
        while (panel && !/rounded-md/.test(panel.getAttribute('class') ?? '')) {
          panel = panel.parentElement;
        }
        const sliders = Array.from(
          panel?.querySelectorAll<HTMLInputElement>('input[type="range"]') ?? [],
        );
        out.push({
          desc: (desc?.textContent ?? '').replace(/\s+/g, ' ').trim(),
          headers: Array.from(d.querySelectorAll('thead th')).map((h) =>
            (h.textContent ?? '').trim(),
          ),
          rows: Array.from(d.querySelectorAll('tbody tr')).map((tr) =>
            Array.from(tr.querySelectorAll('th,td')).map((c) => (c.textContent ?? '').trim()),
          ).map((cells) => ({ label: cells[0] ?? '', cells: cells.slice(1) })),
          ticks: svg ? extractInPage(digitTextsOf(svg), vLinesOf(svg)) : [],
          sliders: sliders.map((r, i) => ({
            index: i,
            label: r.getAttribute('aria-label') ?? '',
            min: parseFloat(r.min),
            max: parseFloat(r.max),
            step: parseFloat(r.step || '1'),
            value: parseFloat(r.value),
          })),
          sliderDefaults: sliders.map((r) => r.value),
        });
        // expose the tick extractor (pure fn is not serializable across
        // evaluate, so a copy runs in page; see helper for the tested one)
        function extractInPage(
          texts: Array<{ content: string; x: number; y: number }>,
          vLines: number[],
        ): string[] {
          const digit = texts.filter((t) => /\d/.test(t.content));
          if (!digit.length) return [];
          const maxY = Math.max(...digit.map((t) => t.y));
          return digit
            .filter((t) => t.y >= maxY - 14)
            .filter((t) => vLines.some((lx) => Math.abs(lx - t.x) <= 2.5))
            .map((t) => t.content);
        }
      });
    return out;
  });
  return raw.map((c) => ({ ...c, aDetail: '', bViolations: [], bRecords: [] }));
}

test('VAL-EDU-023: every table-form disclosure agrees with its chart', async ({ page }) => {
  const charts: CapturedChart[] = [];
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(150);
    for (const c of await captureCharts(page)) {
      const snap: ChartSnapshot = { route, desc: c.desc, headers: c.headers, rows: c.rows, ticks: c.ticks };
      const a = checkClauseA(snap);
      const b = checkClauseB(snap);
      charts.push({
        ...c,
        route,
        sliders: c.sliders,
        aDetail: `${a.status}: ${a.detail}`,
        bViolations: b.violations,
        bRecords: b.records.map((r) => ({
          token: r.token,
          row: r.row,
          outcome: r.outcome,
        })),
      });
    }
  }

  // Population: derived, non-empty, pinned to the round-1 enumeration.
  expect(charts.length, 'table-form disclosure population').toBeGreaterThanOrEqual(1);
  expect(
    charts.length,
    'table-form disclosures across the registry walk (round 1 enumerated 27; ' +
      'a change here means a chart was added, removed or re-declared form)',
  ).toBe(27);

  // Clause (a): endpoint agreement with rendered tick labels (graded only
  // where the SVG x-axis measures the table's row quantity; recorded
  // otherwise).
  const aFails = charts.filter((c) => checkClauseA(c).status === 'fail');
  const aGraded = charts.filter((c) => checkClauseA(c).status === 'pass');
  expect(
    aFails.map((c) => `${c.route} :: ${checkClauseA(c).detail}`),
    'clause (a): rendered ticks must not fall outside the sampled range',
  ).toEqual([]);
  // Clause (b): description tokens vs table rows, per quantity, sampled
  // x-values only. This is the clause EgoScaleScaling failed in round 1.
  const bFails = charts.filter((c) => c.bViolations.length > 0);
  expect(
    bFails.map((c) => `${c.route} :: ${c.bViolations.join('; ')}`),
    'clause (b): description and table must agree at sampled x-values',
  ).toEqual([]);

  // The two-branch rule must actually exercise both branches somewhere in
  // the corpus: at least one token recorded unsampled (carve-out branch)
  // and at least one graded attachment at a sampled row.
  const unsampled = charts.filter((c) =>
    c.bRecords.some((r) => r.outcome === 'unsampled'),
  );
  const sampledGraded = charts.filter((c) =>
    c.bRecords.some((r) => r.outcome === 'match' || r.outcome === 'mismatch'),
  );
  expect(unsampled.length, 'unsampled carve-out branch exercised').toBeGreaterThanOrEqual(4);
  expect(sampledGraded.length, 'sampled-agreement branch exercised').toBeGreaterThanOrEqual(4);

  // Clause (a) coverage guard: enough charts must have a comparable axis
  // that the endpoint rule is actually exercised (round 1 graded 10 of 27;
  // this matcher's stricter shared-value comparability check grades fewer).
  expect(aGraded.length, 'clause (a) graded population').toBeGreaterThanOrEqual(5);
});

test('VAL-EDU-023 clause (c): control probes move the readout to the sampled rows', async ({ page }) => {
  test.setTimeout(240_000);
  const probes: Array<{ route: string; desc: string; slider: string; row: string; pass: boolean | string }> = [];
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(150);
    const caps = await captureCharts(page);
    for (let ci = 0; ci < caps.length; ci += 1) {
      const c = caps[ci];
      const rowXs = c.rows.map((r) => parseNumericToken(r.label));
      // Primary control selection: the slider whose label names the row
      // axis; when none does, a slider is still accepted if it is the
      // only one that maps onto the sampled grid.
      const labelled = c.sliders.filter((s) => sliderMatchesRowAxis(s.label, c.headers[0] ?? ''));
      const inferred = c.sliders
        .map((s) => ({ s, inf: inferSliderTransform(rowXs as number[], s) }))
        .filter((e) => e.inf != null);
      const chosen =
        labelled.map((s) => ({
          s,
          inf: inferSliderTransform(rowXs as number[], s),
        })).find((e) => e.inf != null) ??
        (inferred.length === 1 ? inferred[0] : null);
      if (!chosen || !chosen.inf) continue;
      const { s, inf } = chosen;

      const rows = inf.rows.slice(0, 2);
      for (const x of rows) {
        const rowIdx = rowXs.findIndex((r) => r != null && r === x);
        const sv = inf.toSlider(x);
        const result = await page.evaluate(
          async ({ ci: chartIdx, sliderIndex, sv: sliderValue }) => {
            const d = document.querySelectorAll(
              'details[data-chart-data][data-chart-form="table"]',
            )[chartIdx] as HTMLElement | undefined;
            if (!d) return 'disclosure-missing';
            let panel: Element | null = d.parentElement;
            while (panel && !/rounded-md/.test(panel.getAttribute('class') ?? '')) {
              panel = panel.parentElement;
            }
            if (!panel) return 'panel-missing';
            const range = panel.querySelectorAll('input[type="range"]')[sliderIndex] as
              | HTMLInputElement
              | undefined;
            if (!range) return 'range-missing';
            const setter = Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype,
              'value',
            )!.set!;
            setter.call(range, String(sliderValue));
            range.dispatchEvent(new Event('input', { bubbles: true }));
            range.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise((res) => setTimeout(res, 150));
            // Readout text excludes the disclosure itself: the table
            // echoes its own row, so counting it would grade nothing.
            const clone = panel.cloneNode(true) as Element;
            clone.querySelectorAll('details').forEach((dd) => dd.remove());
            return (clone.textContent ?? '').replace(/\s+/g, ' ');
          },
          { ci, sliderIndex: s.index, sv },
        );
        if (typeof result !== 'string') continue;
        if (result === 'ok' || true) {
          const cells = c.rows[rowIdx].cells;
          const panelNums = numbersIn(result).map(Number);
          const numericCells = cells.some((cell) =>
            cell.split('/').some((part) => parseNumericToken(part) != null),
          );
          const pass = numericCells
            ? cells.some((cell) => {
                for (const part of cell.split('/')) {
                  const n = parseNumericToken(part);
                  if (n == null) continue;
                  const tol = 0.5 * 10 ** -tokenDecimals(part) + 1e-9;
                  if (panelNums.some((pn) => Math.abs(pn - n) <= tol)) return true;
                }
                return false;
              })
            : // A row whose printed values are non-numeric (gait footfall
              // names) is graded by the readout showing the row's own x
              // label: the control demonstrably reached that row.
              result.includes(c.rows[rowIdx].label);
          probes.push({
            route,
            desc: c.desc.slice(0, 50),
            slider: s.label.slice(0, 50),
            row: c.rows[rowIdx].label,
            pass,
          });
        }
      }
      // restore the default
      await page.evaluate(
        ({ ci: chartIdx, sliderIndex, value }) => {
          const d = document.querySelectorAll(
            'details[data-chart-data][data-chart-form="table"]',
          )[chartIdx];
          if (!d) return;
          let panel: Element | null = d.parentElement;
          while (panel && !/rounded-md/.test(panel.getAttribute('class') ?? '')) {
            panel = panel.parentElement;
          }
          const range = panel?.querySelectorAll('input[type="range"]')[sliderIndex] as
            | HTMLInputElement
            | undefined;
          if (!range) return;
          const setter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            'value',
          )!.set!;
          setter.call(range, String(value));
          range.dispatchEvent(new Event('input', { bubbles: true }));
          range.dispatchEvent(new Event('change', { bubbles: true }));
        },
        { ci, sliderIndex: s.index, value: s.value },
      );
    }
  }
  expect(probes.length, 'charts probed by the control clause').toBeGreaterThanOrEqual(6);
  const failed = probes.filter((p) => !p.pass);
  expect(
    failed.map((p) => `${p.route} [${p.slider}] row "${p.row}" (${p.desc}...)`),
    'clause (c): the readout must show the sampled row value to the printed precision',
  ).toEqual([]);
});
