import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser, Locator } from '@playwright/test';
import { brandV2Registry, expect, test } from './brand-v2-static-fixture';
import { forEachInOwnContext } from './helpers/per-route-context';
import { mountRoots } from './helpers/interactive-mount-roots';
import { buildInteractiveExecutionPlan } from '../../lib/brand-v2-runners';
import {
  INTERACTIVE_DATA_CLASSIFICATION,
  STATUS_LABEL_EXCEPTIONS,
  NA_CELL_FAMILIES,
  STATUS_LABEL_VOCABULARY,
  classifyLegendText,
  classifyResolvedPaint,
  nonColourDistinct,
  tableSortCensus,
  type MarkObservation,
  type TableSortKind,
} from '../../lib/brand-v2-interactive-data';
import { ACT_CHUNK_ANCHORS, successAtChunkSize } from '../../lib/chunk-size';
import { COMPLETION_POINTS } from '../../lib/egoscale-law';
import { chunkScaleX, chunkScaleY } from '../../components/interactive/chunk-size-curve';
import {
  BAR_THICKNESS,
  GROUPS,
  MAX_TRIALS,
  METHODS,
  barLength,
  barTop,
  panelLeft,
} from '../../components/interactive/expo-ft-results';
import { xFor } from '../../components/interactive/egoscale-scaling';
import { CHART_STROKE } from '../../components/motion/chart/chart-tokens';

/**
 * The interactive data/legend gates (VAL-B2-VIZ-002/003/004/005/006/013/015,
 * VAL-B2-COL-010, VAL-B2-COMP-009/010).
 *
 * The population is the registry's own execution plan: every mount of every
 * registered interactive source, bound by tests/e2e/helpers/
 * interactive-mount-roots.ts to the instrument frame that names its
 * component (the ordinal-th such frame on its route), or for a plain prose
 * table to its unframed table. Paused motion scenes and clips share the frame
 * primitive but own separate contracts, so they are not in this corpus. The
 * binding asserts one frame per framed mount and every frame bound exactly
 * once, so a route whose frames drift from its mounts fails instead of
 * handing a mount its neighbour's instrument.
 * Evidence is observed in the live DOM - computed paints, dash arrays,
 * geometry tags, legend swatches, table cells - and classified by the pure
 * predicates in lib/brand-v2-interactive-data.ts, which a unit test keeps
 * reconciled with the registry's interactive sources. The VIZ-013
 * expectations are recomputed from the scales and constants the components
 * themselves export, never copied from rendered geometry.
 *
 * The sweep runs once and is memoized (the brand-v2 runner is single
 * worker); every assertion below reads the same evidence.
 */
const VIEWPORT = { width: 1440, height: 900 } as const;

type ExecutionPlan = ReturnType<typeof buildInteractiveExecutionPlan>;

/**
 * The identities `mountRoots` binds by. A registry mount records its source,
 * not its component, so the component comes from that source.
 */
function mountIdentities(plan: ExecutionPlan, mounts: readonly ExecutionPlan['mounts'][number][]) {
  const sourceById = new Map(plan.sources.map((source) => [source.id, source]));
  return mounts.map(({ id, sourceId, ordinal }) => ({
    id,
    sourceId,
    component: sourceById.get(sourceId)?.component ?? sourceId,
    ordinal,
  }));
}

/**
 * The sortable-table census (VAL-B2-COMP-009): the registered sources whose
 * modules sort a table, read by the predicate the unit suite pins.
 */
function sortableTableCensus() {
  return tableSortCensus(brandV2Registry.interactive.sources, (path) =>
    readFileSync(join(process.cwd(), path), 'utf8'),
  );
}

const TOKEN_VARS = [
  '--color-accent',
  '--color-highlight',
  '--color-error',
  '--color-warn',
  '--color-ok',
  '--color-text',
  '--color-text-dim',
  '--color-border',
  '--color-border-strong',
  '--color-surface',
  '--color-surface-2',
  '--color-bg',
] as const;

const DATA_TOKENS = new Set([
  'accent',
  'highlight',
  'error',
  'warn',
  'ok',
  'text',
  'text-dim',
  'pattern',
]);

type LegendSwatch = {
  tag: string;
  stroke: string | null;
  fill: string | null;
  dash: string | null;
  strokeWidth: string | null;
};

type LegendEntry = {
  text: string;
  seriesId: string | null;
  swatch: LegendSwatch | null;
};

type SeriesEvidence = {
  paints: string[];
  geometries: string[];
  labelled: boolean;
  marks: number;
};

type LimeMark = { paint: string; geometry: string; selection: boolean };

type CircleEvidence = { cx: number; cy: number; r: number };

type TableEvidence = {
  headers: string[];
  thCount: number;
  scopedThCount: number;
  sortable: boolean;
  ariaSortCount: number;
  naCells: Array<{ column: string }>;
  notDisclosedColumns: string[];
  notDisclosedCount: number;
  blankCellCount: number;
  approxCellCount: number;
  numericColumns: Array<{ header: string; rightAligned: boolean }>;
};

type FrameEvidence = {
  route: string;
  mountId: string;
  sourceId: string;
  routeText: string;
  legend: LegendEntry[];
  series: Record<string, SeriesEvidence>;
  limeMarks: LimeMark[];
  canvasCount: number;
  circles: CircleEvidence[];
  seriesRects: Array<{ seriesId: string; x: number; y: number; width: number; height: number }>;
  text: string;
  tables: TableEvidence[];
};

type SweepEvidence = {
  frames: FrameEvidence[];
  routesVisited: number;
  routeCanvasCounts: Array<{ route: string; count: number }>;
  playground: { canvasCount: number; canvasHasTextAlternative: boolean };
};

/**
 * The in-page observer. Playwright serializes this function into the page,
 * so it must close over nothing: the palette variables are passed in.
 * It resolves every mark's computed paint, geometry tag, dash state, and
 * label presence, plus the legend swatches, table cells, circles, and
 * per-series rect geometry the parity anchors compare against.
 */
async function collectFrame(
  frame: Locator,
): Promise<Omit<FrameEvidence, 'route' | 'routeText' | 'mountId' | 'sourceId'>> {
  return frame.evaluate((frameElement, tokenVars) => {
    const interesting: string[] = [];
    {
      const probe = document.createElement('span');
      probe.style.display = 'none';
      frameElement.appendChild(probe);
      const dataVarNames = tokenVars.filter((name: string) =>
        /--color-(accent|highlight|error|warn|ok|text)$/.test(name),
      );
      for (const name of dataVarNames) {
        probe.style.color = `var(${name}, none)`;
        interesting.push(getComputedStyle(probe).color.replace(/\s+/g, ''));
      }
      probe.remove();
    }
    const geometryClassOf = (obs: { tag: string; dashed: boolean; filled: boolean }) => {
      switch (obs.tag) {
        case 'polyline':
          return obs.dashed ? 'dashed-line' : 'line';
        case 'path':
          return obs.dashed ? 'dashed-line' : obs.filled ? 'band' : 'line';
        case 'circle':
        case 'ellipse':
          return obs.filled ? 'dot' : 'ring';
        case 'polygon':
          return 'band';
        default:
          return obs.filled ? 'bar' : obs.dashed ? 'dashed-outline' : 'outline';
      }
    };

    const isPaint = (value: string) => {
      if (value === 'none' || value === '' || value === 'transparent') return false;
      const transparentRgba = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*0(?:\.0+)?\)$/.exec(value);
      return !transparentRgba;
    };

    const legend: Array<{
      text: string;
      seriesId: string | null;
      swatch: { tag: string; stroke: string | null; fill: string | null; dash: string | null; strokeWidth: string | null } | null;
    }> = [];
    for (const band of frameElement.querySelectorAll('[data-instrument-legend]')) {
      for (const item of Array.from(band.querySelectorAll('[data-legend-item]'))) {
        const svg = item.querySelector('svg');
        let swatch: (typeof legend)[number]['swatch'] = null;
        if (svg) {
          const mark = svg.querySelector('line, path, polyline, polygon, rect, circle, ellipse');
          if (mark) {
            const cs = getComputedStyle(mark);
            swatch = {
              tag: mark.tagName.toLowerCase(),
              stroke: isPaint(cs.stroke) ? cs.stroke.replace(/\s+/g, '') : null,
              fill: isPaint(cs.fill) ? cs.fill.replace(/\s+/g, '') : null,
              dash:
                cs.strokeDasharray && cs.strokeDasharray !== 'none'
                  ? cs.strokeDasharray
                  : null,
              strokeWidth: cs.strokeWidth,
            };
          }
        }
        legend.push({
          text: (item.textContent ?? '').trim(),
          seriesId: item.getAttribute('data-legend-series'),
          swatch,
        });
      }
    }

    const series: Record<
      string,
      { paints: string[]; geometries: string[]; labelled: boolean; marks: number }
    > = {};
    const limeMarks: Array<{ paint: string; geometry: string; selection: boolean }> = [];
    const circles: Array<{ cx: number; cy: number; r: number }> = [];
    const seriesRects: Array<{
      seriesId: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];
    const SHAPES = 'line, path, polyline, polygon, rect, circle, ellipse';

    for (const svg of frameElement.querySelectorAll('svg')) {
      // Every circle in the plot, for the parity anchors.
      for (const circle of Array.from(svg.querySelectorAll<SVGCircleElement>('circle'))) {
        const box = circle.getBBox();
        circles.push({
          cx: box.x + box.width / 2,
          cy: box.y + box.height / 2,
          r: box.width / 2,
        });
      }

      for (const holder of Array.from(svg.querySelectorAll<SVGElement>('[data-series]'))) {
        // A mark tagged directly and a group tagged around its marks are
        // both holders; skip holders nested in another holder so no mark
        // is counted twice.
        if (holder.closest('[data-series]') !== holder) continue;
        const seriesId = holder.getAttribute('data-series');
        if (!seriesId) continue;
        const shapes = holder.matches(SHAPES)
          ? [holder]
          : Array.from(holder.querySelectorAll<SVGElement>(SHAPES));
        if (shapes.length === 0) continue;
        const row = (series[seriesId] ??= {
          paints: [],
          geometries: [],
          labelled: false,
          marks: 0,
        });
        // A visible in-plot label: the holder is marked as labelled, or it
        // contains a rendered text node beside its marks.
        const labelled =
          holder.hasAttribute('data-series-labelled') ||
          Boolean(holder.querySelector('text'));
        for (const el of shapes) {
          const cs = getComputedStyle(el);
          const tag = el.tagName.toLowerCase();
          const stroke = isPaint(cs.stroke) ? cs.stroke.replace(/\s+/g, '') : null;
          const fill = isPaint(cs.fill) ? cs.fill.replace(/\s+/g, '') : null;
          const geometry = geometryClassOf({
            tag,
            dashed: Boolean(cs.strokeDasharray && cs.strokeDasharray !== 'none'),
            filled: isPaint(cs.fill),
          });
          row.marks += 1;
          row.labelled = row.labelled || labelled;
          if (!row.geometries.includes(geometry)) row.geometries.push(geometry);
          for (const paint of [stroke, fill]) {
            if (paint && !row.paints.includes(paint)) row.paints.push(paint);
          }
          if (tag === 'rect') {
            const box = (el as SVGRectElement).getBBox();
            seriesRects.push({
              seriesId,
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height,
            });
          }
        }
      }

      // The lime sweep stays mark-level: any highlight-painted mark must
      // carry selection semantics, tagged or not.
      for (const el of Array.from(svg.querySelectorAll<SVGElement>(SHAPES))) {
        const cs = getComputedStyle(el);
        const tag = el.tagName.toLowerCase();
        for (const value of [cs.stroke, cs.fill]) {
          if (!isPaint(value)) continue;
          const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value);
          if (
            m &&
            Math.abs(Number(m[1]) - 198) < 2 &&
            Math.abs(Number(m[2]) - 255) < 2 &&
            Math.abs(Number(m[3]) - 25) < 2
          ) {
            limeMarks.push({
              paint: value.replace(/\s+/g, ''),
              geometry: geometryClassOf({
                tag,
                dashed: Boolean(cs.strokeDasharray && cs.strokeDasharray !== 'none'),
                filled: isPaint(cs.fill),
              }),
              selection: Boolean(
                el.closest('[aria-selected], [aria-pressed], [aria-checked], [data-selection]'),
              ),
            });
          }
        }
      }
    }

    const tables: Array<{
      headers: string[];
      thCount: number;
      scopedThCount: number;
      sortable: boolean;
      ariaSortCount: number;
      naCells: Array<{ column: string }>;
      notDisclosedColumns: string[];
      notDisclosedCount: number;
      blankCellCount: number;
      approxCellCount: number;
      numericColumns: Array<{ header: string; rightAligned: boolean }>;
    }> = [];
    for (const table of frameElement.querySelectorAll('table')) {
      const ths = Array.from(table.querySelectorAll('thead th'));
      const headers = ths.map((th) => (th.textContent ?? '').trim());
      const naCells: Array<{ column: string }> = [];
      const notDisclosedColumns: string[] = [];
      let notDisclosedCount = 0;
      let blankCellCount = 0;
      let approxCellCount = 0;
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      // Header alignment: when every body row opens with a row header, the
      // first thead column names that label column and td[k] belongs to
      // headers[k + 1], not headers[k].
      const labelColumnOffset = rows.every(
        (row) => row.firstElementChild?.tagName.toLowerCase() === 'th',
      )
        ? 1
        : 0;
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td'));
        cells.forEach((cell, index) => {
          const value = (cell.textContent ?? '').trim();
          const column = headers[index + labelColumnOffset] ?? `column ${index}`;
          if (value === 'n/a') {
            naCells.push({ column });
          }
          if (value === 'not disclosed') {
            notDisclosedCount += 1;
            notDisclosedColumns.push(column);
          }
          if (value === '' && cells.some((other) => (other.textContent ?? '').trim() !== '')) {
            blankCellCount += 1;
          }
          if (value.startsWith('~')) approxCellCount += 1;
        });
      }
      const numericColumns: Array<{ header: string; rightAligned: boolean }> = [];
      for (let index = 0; index < headers.length - labelColumnOffset; index += 1) {
        const columnCells = rows
          .map((row) => row.querySelectorAll('td')[index])
          .filter((cell): cell is HTMLTableCellElement => Boolean(cell));
        if (columnCells.length < 2) continue;
        const numeric = columnCells.filter((cell) =>
          /^[$~]?[\d.,]+%?$/.test((cell.textContent ?? '').trim()),
        );
        if (numeric.length === columnCells.length) {
          numericColumns.push({
            header: headers[index + labelColumnOffset] ?? `column ${index}`,
            rightAligned: columnCells.every(
              (cell) => getComputedStyle(cell).textAlign === 'right',
            ),
          });
        }
      }
      tables.push({
        headers,
        thCount: ths.length,
        scopedThCount: ths.filter((th) => th.hasAttribute('scope')).length,
        sortable: ths.some((th) => th.querySelector('button')),
        ariaSortCount: ths.filter((th) => th.hasAttribute('aria-sort')).length,
        naCells,
        notDisclosedColumns,
        notDisclosedCount,
        blankCellCount,
        approxCellCount,
        numericColumns,
      });
    }

    return {
      legend,
      series,
      limeMarks,
      canvasCount: frameElement.querySelectorAll('canvas').length,
      circles,
      seriesRects,
      text: (frameElement.textContent ?? '').replace(/\s+/g, ' ').trim(),
      tables,
    };
  }, [...TOKEN_VARS]);
}

let sweepPromise: Promise<SweepEvidence> | null = null;

function sweep(browser: Browser, staticBase: string): Promise<SweepEvidence> {
  sweepPromise ??= runSweep(browser, staticBase);
  return sweepPromise;
}

async function runSweep(browser: Browser, staticBase: string): Promise<SweepEvidence> {
  const plan = buildInteractiveExecutionPlan(brandV2Registry);
  const sourceById = new Map(plan.sources.map((source) => [source.id, source]));
  const mountsByRoute = Map.groupBy(plan.mounts, (mount) => mount.route);
  const frames: FrameEvidence[] = [];
  const routeCanvasCounts: SweepEvidence['routeCanvasCounts'] = [];

  // One browser context per route: a sweep that walks the corpus on one
  // shared page retains every document it leaves and can kill a later
  // test (see tests/e2e/helpers/per-route-context.ts).
  await forEachInOwnContext(
    browser,
    [...mountsByRoute].sort(([a], [b]) => a.localeCompare(b)),
    async (page, [route, mounts]) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto(`${staticBase}${route}`);
    const routeText = (await page.locator('main').innerText()).replace(/\s+/g, ' ').trim();
    const roots = await mountRoots(page, route, mountIdentities(plan, mounts));
    routeCanvasCounts.push({
      route,
      count: await page.locator('canvas').count(),
    });
    for (let index = 0; index < roots.length; index += 1) {
      const mount = mounts[index];
      const source = sourceById.get(mount.sourceId);
      expect(source, `${mount.id} resolves to a source`).toBeTruthy();
      const frameLocator = roots[index];
      const evidence = await collectFrame(frameLocator);
      // A legend may name series that only other control states render
      // (a strategy that zeroes, links or blocks different slots). When
      // the default state leaves legend entries without marks, exercise
      // the frame's own state controls once each and merge what renders,
      // so the bijection is judged over the instrument's states, not one
      // snapshot of it.
      const missingByDefault = evidence.legend
        .map((entry) => entry.seriesId)
        .filter((seriesId): seriesId is string => Boolean(seriesId))
        .filter((seriesId) => !evidence.series[seriesId]);
      if (missingByDefault.length > 0) {
        await page.waitForFunction(() =>
          [...document.querySelectorAll('button')].some((element) =>
            Object.keys(element).some((key) => key.startsWith('__reactFiber$')),
          ),
        );
        // State controls can sit in the frame's closed "Adjust more" fold
        // (the JEPA planning lab's goal presets do). Open it through its
        // summary, as a reader does, so every state control is clickable.
        const adjustFolds = frameLocator.locator('[data-figure-fold="adjust"]');
        const adjustCount = await adjustFolds.count();
        for (let fold = 0; fold < adjustCount; fold += 1) {
          const adjust = adjustFolds.nth(fold);
          if (!(await adjust.evaluate((element) => (element as HTMLDetailsElement).open))) {
            await adjust.locator(':scope > summary').click();
          }
        }
        const stateButtons = frameLocator.locator('[aria-pressed]');
        const stateCount = Math.min(await stateButtons.count(), 8);
        for (let button = 0; button < stateCount; button += 1) {
          await stateButtons.nth(button).click();
          const state = await collectFrame(frameLocator);
          for (const [seriesId, row] of Object.entries(state.series)) {
            const target = (evidence.series[seriesId] ??= {
              paints: [],
              geometries: [],
              labelled: false,
              marks: 0,
            });
            target.labelled = target.labelled || row.labelled;
            target.marks += row.marks;
            for (const geometry of row.geometries) {
              if (!target.geometries.includes(geometry)) target.geometries.push(geometry);
            }
            for (const paint of row.paints) {
              if (!target.paints.includes(paint)) target.paints.push(paint);
            }
          }
          for (const entry of state.legend) {
            const key = `${entry.seriesId ?? ''}:${entry.text}`;
            if (!evidence.legend.some((existing) => `${existing.seriesId ?? ''}:${existing.text}` === key)) {
              evidence.legend.push(entry);
            }
          }
        }
      }
      frames.push({
        ...evidence,
        route,
        routeText,
        mountId: mount.id,
        sourceId: source?.id ?? mount.sourceId,
      });
    }
    },
    { viewport: VIEWPORT },
  );

  let playgroundCanvasCount = 0;
  let canvasHasTextAlternative = false;
  await forEachInOwnContext(
    browser,
    ['/playground/'],
    async (page, route) => {
      await page.goto(`${staticBase}${route}`);
      await page.waitForFunction(
        () =>
          document.querySelectorAll('canvas').length > 0 ||
          /WebGL is not available/i.test(document.body.innerText ?? ''),
        undefined,
        { timeout: 15_000 },
      );
      const playgroundCanvases = page.locator('canvas');
      playgroundCanvasCount = await playgroundCanvases.count();
      canvasHasTextAlternative = playgroundCanvasCount === 0;
      for (let index = 0; index < playgroundCanvasCount; index += 1) {
        const canvas = playgroundCanvases.nth(index);
        const described = await canvas.evaluate((element) => {
          const self =
            element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby');
          const region = element.closest('[aria-label], [aria-labelledby], [role="img"]');
          const siblingText = element.parentElement
            ? (element.parentElement.textContent ?? '').trim().length > 0
            : false;
          return self || Boolean(region) || siblingText;
        });
        canvasHasTextAlternative = canvasHasTextAlternative || described;
      }
    },
  );

  return {
    frames,
    routesVisited: mountsByRoute.size,
    routeCanvasCounts,
    playground: { canvasCount: playgroundCanvasCount, canvasHasTextAlternative },
  };
}

function frameFor(sourceId: string, frames: FrameEvidence[]): FrameEvidence[] {
  return frames.filter((frame) => frame.sourceId === sourceId);
}

function observationOf(frame: FrameEvidence, seriesId: string): MarkObservation | null {
  const row = frame.series[seriesId];
  if (!row) return null;
  const paints = row.paints
    .map((paint) => classifyResolvedPaint(paint))
    .filter((token) => DATA_TOKENS.has(token));
  // Pattern beats colour as the representative: a hatched series is a
  // pattern series whichever solid colours it also paints.
  const representative = paints.includes('pattern')
    ? 'pattern'
    : (paints[0] ?? 'neutral');
  return {
    paint: representative,
    geometries: row.geometries as MarkObservation['geometries'],
    labelled: row.labelled,
  };
}

function near(actual: number, expected: number, tolerance = 0.75): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

test.describe('brand-v2 interactive data legends and render parity', () => {
  test('VAL-B2-VIZ-002 every plotted series stays distinguishable without colour', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const { frames } = await sweep(browser, staticBase);
    const violations: string[] = [];
    let compared = 0;
    let multiSeriesFrames = 0;
    for (const frame of frames) {
      const ids = Object.keys(frame.series);
      if (ids.length < 2) continue;
      multiSeriesFrames += 1;
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) {
          const a = observationOf(frame, ids[i]);
          const b = observationOf(frame, ids[j]);
          if (!a || !b) continue;
          compared += 1;
          if (!nonColourDistinct(a, b)) {
            violations.push(
              `${frame.mountId}: "${ids[i]}" vs "${ids[j]}" share geometry [${a.geometries.join(", ")}] and neither carries an in-plot label`,
            );
          }
        }
      }
    }
    expect(
      multiSeriesFrames,
      'the sweep found multi-series frames to compare (population is not vacuous)',
    ).toBeGreaterThanOrEqual(5);
    expect(compared, 'series pairs were actually compared').toBeGreaterThan(10);
    expect(violations, 'colour-only series pairs').toEqual([]);
  });

  test('VAL-B2-VIZ-003 the lead series carries the signal paint and lime stays selection-only', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const { frames } = await sweep(browser, staticBase);
    const leadRows = Object.entries(INTERACTIVE_DATA_CLASSIFICATION).filter(
      ([, spec]) => spec.leadSeriesId,
    );
    const violations: string[] = [];
    for (const [sourceId, spec] of leadRows) {
      const leadId = spec.leadSeriesId!;
      const allowed = spec.leadPaints ?? ['accent'];
      const mountedFrames = frameFor(sourceId, frames);
      expect(
        mountedFrames.length,
        `${sourceId} lead series has a rendered mount`,
      ).toBeGreaterThan(0);
      for (const frame of mountedFrames) {
        const row = frame.series[leadId];
        if (!row) {
          violations.push(`${frame.mountId}: lead series "${leadId}" carries no data-series marks`);
          continue;
        }
        for (const paint of row.paints) {
          const token = classifyResolvedPaint(paint);
          if (!DATA_TOKENS.has(token)) continue;
          if (!allowed.includes(token as never)) {
            violations.push(
              `${frame.mountId}: lead series "${leadId}" resolves ${token} (${paint}); allowed: ${allowed.join(', ')}`,
            );
          }
        }
      }
    }
    expect(
      leadRows.length,
      'the classification registers lead-series charts (population is not vacuous)',
    ).toBeGreaterThanOrEqual(3);

    const limeViolations: string[] = [];
    for (const frame of frames) {
      for (const mark of frame.limeMarks) {
        const entry = frame.legend.find((item) =>
          /(select|highlight|current|chosen|you|your)/i.test(item.text),
        );
        if (!mark.selection && !entry) {
          limeViolations.push(
            `${frame.mountId}: a ${mark.geometry} mark resolves highlight lime with no selection semantics`,
          );
        }
      }
    }
    expect(violations, 'lead-series paint violations').toEqual([]);
    expect(limeViolations, 'decorative lime marks').toEqual([]);
  });

  test('VAL-B2-VIZ-004 legends map bijectively to marks and name things, not colours', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const { frames } = await sweep(browser, staticBase);
    const naming: string[] = [];
    const dangling: string[] = [];
    const unexplained: string[] = [];
    for (const frame of frames) {
      for (const entry of frame.legend) {
        const classification = classifyLegendText(entry.text);
        if (classification !== 'named') {
          naming.push(`${frame.mountId}: legend entry "${entry.text}" is ${classification}`);
        }
        if (entry.seriesId && !frame.series[entry.seriesId]) {
          dangling.push(
            `${frame.mountId}: legend entry "${entry.text}" names series "${entry.seriesId}" which renders no marks`,
          );
        }
      }
      for (const seriesId of Object.keys(frame.series)) {
        const row = frame.series[seriesId];
        const hasLegendEntry = frame.legend.some((item) => item.seriesId === seriesId);
        if (!hasLegendEntry && !row.labelled) {
          unexplained.push(
            `${frame.mountId}: series "${seriesId}" has neither a legend entry nor an in-plot label`,
          );
        }
      }
    }
    expect(naming, 'legend entries that rely on colour words alone').toEqual([]);
    expect(dangling, 'legend entries with no marks').toEqual([]);
    expect(unexplained, 'plotted series with no legend and no label').toEqual([]);
  });

  test('VAL-B2-COL-010 legend swatches repeat the rendered marks exactly', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const { frames } = await sweep(browser, staticBase);
    const violations: string[] = [];
    for (const frame of frames) {
      for (const entry of frame.legend) {
        if (!entry.seriesId || !entry.swatch) continue;
        const row = frame.series[entry.seriesId];
        if (!row) continue;
        const swatchPaints = [entry.swatch.stroke, entry.swatch.fill].filter(
          (paint): paint is string => Boolean(paint),
        );
        const markPaints = row.paints;
        for (const swatchPaint of swatchPaints) {
          const swatchToken = classifyResolvedPaint(swatchPaint);
          if (swatchToken === 'pattern') continue;
          if (!DATA_TOKENS.has(swatchToken)) continue;
          const agrees = markPaints.some(
            (markPaint) => classifyResolvedPaint(markPaint) === swatchToken,
          );
          if (!agrees) {
            violations.push(
              `${frame.mountId}: legend swatch for "${entry.seriesId}" paints ${swatchToken} (${swatchPaint}); the marks paint ${markPaints.join(' | ')}`,
            );
          }
        }
        if (entry.swatch.dash) {
          const dashedGeometry = row.geometries.some((geometry) => geometry.includes('dashed'));
          if (!dashedGeometry) {
            violations.push(
              `${frame.mountId}: legend swatch for "${entry.seriesId}" is dashed but the marks are not`,
            );
          }
        }
      }
    }
    let checked = 0;
    for (const frame of frames) {
      checked += frame.legend.filter((entry) => entry.seriesId && entry.swatch).length;
    }
    expect(checked, 'swatch/mark agreements were actually compared').toBeGreaterThanOrEqual(10);
    expect(violations, 'legend swatch drift').toEqual([]);
  });

  test('VAL-B2-VIZ-005 unknowns stay unknown and estimates stay qualified', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const { frames } = await sweep(browser, staticBase);
    const registered = new Set(NA_CELL_FAMILIES.map((family) => family.column));
    const rendered = new Map<string, string[]>();
    for (const frame of frames) {
      for (const table of frame.tables) {
        for (const cell of table.naCells) {
          const key = cell.column;
          rendered.set(key, [...(rendered.get(key) ?? []), frame.mountId]);
        }
      }
    }
    const missing = [...registered].filter((column) => !rendered.has(column));
    const unregistered = [...rendered.keys()].filter((column) => !registered.has(column));
    expect(
      missing,
      'registered honest n/a families whose cells vanished from the render',
    ).toEqual([]);
    expect(
      unregistered,
      'rendered n/a cells with no recorded justification',
    ).toEqual([]);

    const unqualified: string[] = [];
    for (const frame of frames) {
      const approxCells = frame.tables.reduce(
        (total, table) => total + table.approxCellCount,
        0,
      );
      if (approxCells === 0) continue;
      const qualified =
        /(estimate|not a published|interpolat|extrapolat|approximat|approx\.|about |roughly)/i.test(
          frame.text,
        );
      if (!qualified) {
        unqualified.push(
          `${frame.mountId}: ${approxCells} "~" estimated cells with no qualification in the frame text`,
        );
      }
    }
    expect(unqualified, 'unqualified estimates').toEqual([]);
  });

  test('VAL-B2-VIZ-006 schematics and generated signals label what they are', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const { frames } = await sweep(browser, staticBase);
    const violations: string[] = [];
    const frozen: string[] = [];
    let labelled = 0;
    for (const frame of frames) {
      const spec = INTERACTIVE_DATA_CLASSIFICATION[frame.sourceId];
      if (!spec || spec.kind === 'source-data') continue;
      if (STATUS_LABEL_VOCABULARY.source.test(frame.text)) {
        labelled += 1;
        continue;
      }
      const exception = STATUS_LABEL_EXCEPTIONS[frame.sourceId];
      const proseRoute =
        exception?.reason === 'labelled-in-adjacent-prose' &&
        (exception.routes ?? []).includes(frame.route);
      if (proseRoute) {
        expect(
          exception.adjacentProse,
          `${frame.mountId}: adjacent-prose exception names its sentence`,
        ).toBeTruthy();
        if (exception.adjacentProse!.test(frame.routeText)) {
          labelled += 1;
          continue;
        }
        violations.push(
          `${frame.mountId}: the adjacent-prose label the exception records is no longer on the route`,
        );
        continue;
      }
      if (exception) {
        frozen.push(frame.sourceId);
        continue;
      }
      violations.push(
        `${frame.mountId}: classified ${spec.kind} but no rendered self-label matches the status vocabulary`,
      );
    }
    expect(
      violations,
      'schematic/authored-model frames without a self-label',
    ).toEqual([]);
    expect(
      new Set(frozen),
      'the only unlabelled schematics are the recorded audit-frozen boundary',
    ).toEqual(
      new Set(
        Object.entries(STATUS_LABEL_EXCEPTIONS)
          .filter(([, exception]) => exception.reason === 'audit-frozen')
          .map(([sourceId]) => sourceId),
      ),
    );
    expect(
      labelled,
      'the sweep found labelled non-source-data frames (population is not vacuous)',
    ).toBeGreaterThanOrEqual(15);
  });

  test('VAL-B2-VIZ-013 rendered coordinates recompute from the source scales', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const { frames } = await sweep(browser, staticBase);
    const violations: string[] = [];
    let anchorsChecked = 0;

    // EXPO-FT: every horizontal bar starts at its task panel, sits in its
    // method row, and its length recomputes from barLength(trials).
    for (const frame of frameFor('interactive:ExpoFtResults', frames)) {
      GROUPS.forEach((group, groupIndex) => {
        for (const [methodIndex, method] of METHODS.entries()) {
          const trials = method.values[groupIndex];
          const expectedX = panelLeft(groupIndex);
          const expectedY = barTop(methodIndex);
          const expectedWidth = barLength(trials);
          const rect = frame.seriesRects.find(
            (candidate) =>
              candidate.seriesId === method.id &&
              near(candidate.x, expectedX, 1) &&
              near(candidate.y, expectedY, 1),
          );
          if (!rect) {
            violations.push(
              `${frame.mountId}: no bar for ${method.id} at the recomputed x ${expectedX.toFixed(2)}, y ${expectedY.toFixed(2)} (${group})`,
            );
            continue;
          }
          anchorsChecked += 1;
          if (!near(rect.width, expectedWidth) || !near(rect.height, BAR_THICKNESS)) {
            violations.push(
              `${frame.mountId}: ${method.id} bar for ${group} renders w=${rect.width.toFixed(2)} h=${rect.height.toFixed(2)}; source expects w=${expectedWidth.toFixed(2)} h=${BAR_THICKNESS} (${trials}/30)`,
            );
          }
        }
      });
    }

    // Chunk-size curve: the playhead marker and the measured anchors
    // recompute from chunkScaleX/chunkScaleY over the ACT data. The two
    // radii that tell them apart come from the chart's marker token, the
    // way the coordinates come from its scales: a data point is
    // CHART_STROKE.markerRadius and the playhead ring two units wider.
    // Successor of the literal 3.5 and 4.5 pins, which the research-page
    // restyle (2c66acda, owner decision of 10 October 2026) superseded
    // when it set the marker radius from twice the trace to trace + 1.
    const anchorRadius = CHART_STROKE.markerRadius;
    const playheadRadius = CHART_STROKE.markerRadius + 2;
    for (const frame of frameFor('interactive:ChunkSizeCurve', frames)) {
      const marker = frame.circles.find((circle) => Math.abs(circle.r - playheadRadius) < 0.5);
      if (!marker) {
        violations.push(`${frame.mountId}: playhead marker circle not found`);
      } else {
        anchorsChecked += 1;
        const expectedX = chunkScaleX(100);
        const expectedY = chunkScaleY(successAtChunkSize(100));
        if (!near(marker.cx, expectedX) || !near(marker.cy, expectedY)) {
          violations.push(
            `${frame.mountId}: marker renders (${marker.cx.toFixed(2)}, ${marker.cy.toFixed(2)}); source expects (${expectedX.toFixed(2)}, ${expectedY.toFixed(2)})`,
          );
        }
      }
      for (const anchor of ACT_CHUNK_ANCHORS) {
        const circle = frame.circles.find(
          (candidate) =>
            Math.abs(candidate.r - anchorRadius) < 0.5 &&
            near(candidate.cx, chunkScaleX(anchor.k), 1.5),
        );
        if (!circle) {
          violations.push(
            `${frame.mountId}: measured anchor at k=${anchor.k} not found near x=${chunkScaleX(anchor.k).toFixed(2)}`,
          );
          continue;
        }
        anchorsChecked += 1;
        if (!near(circle.cy, chunkScaleY(anchor.success))) {
          violations.push(
            `${frame.mountId}: anchor k=${anchor.k} renders cy=${circle.cy.toFixed(2)}; source expects ${chunkScaleY(anchor.success).toFixed(2)}`,
          );
        }
      }
    }

    // Ego-scale: every measured point sits at xFor(hours).
    for (const frame of frameFor('interactive:EgoScaleScaling', frames)) {
      for (const point of COMPLETION_POINTS) {
        const expectedX = xFor(point.hours);
        const circle = frame.circles.find((candidate) => near(candidate.cx, expectedX, 1.5));
        if (!circle) {
          violations.push(
            `${frame.mountId}: measured point at ${point.hours} hours not found near x=${expectedX.toFixed(2)}`,
          );
          continue;
        }
        anchorsChecked += 1;
      }
    }

    expect(
      anchorsChecked,
      'source-to-render coordinate anchors were actually compared',
    ).toBeGreaterThanOrEqual(20);
    expect(violations, 'rendered geometry that disagrees with the source scales').toEqual([]);
    expect(MAX_TRIALS).toBe(30);
  });

  test('VAL-B2-VIZ-015 canvas semantics stay registered and instrument frames stay canvas-free', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const { frames, routeCanvasCounts, playground } = await sweep(browser, staticBase);
    const frameCanvases = frames.filter((frame) => frame.canvasCount > 0);
    expect(
      frameCanvases.map((frame) => `${frame.mountId}: ${frame.canvasCount}`),
      'instrument frames that render a canvas',
    ).toEqual([]);
    const canvasRoutes = routeCanvasCounts.filter((route) => route.count > 0);
    expect(
      canvasRoutes.map((route) => `${route.route}: ${route.count}`),
      'canvas-bearing interactive routes outside the registered playground',
    ).toEqual([]);
    expect(
      playground.canvasCount,
      'the playground renders its registered WebGL canvas',
    ).toBeGreaterThanOrEqual(1);
    expect(
      playground.canvasHasTextAlternative,
      'the playground canvas carries a textual alternative',
    ).toBe(true);
  });

  test('VAL-B2-COMP-009 instrument tables expose scope, sort state, and numeric alignment', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const { frames } = await sweep(browser, staticBase);
    const violations: string[] = [];
    // The sortable population is the census of registered sources that
    // sort a table (lib/brand-v2-interactive-data.ts tableSortCensus),
    // reconciled with the rendered frames in both directions. Successor of
    // a bare "at least five tables with header sort buttons" count, fixed
    // on 26 September 2026 before the reader-first figure rewrite (owner
    // decision of 2 October 2026, library/design-system.md 13.4) moved the
    // hand comparison's sort out of its table headers into a visible
    // "Sort by" preset group, with the table in "How this was made". The
    // floor of five stays; the census now names which five, and a
    // control-sorted table must expose its sort state on one header.
    const census = sortableTableCensus();
    const { mounts } = buildInteractiveExecutionPlan(brandV2Registry);
    const censusMounts = (kind: TableSortKind) =>
      mounts
        .filter((mount) => census.get(mount.sourceId) === kind)
        .map((mount) => mount.id)
        .sort();
    const headerSorted = new Set<string>();
    const controlSorted = new Set<string>();
    for (const frame of frames) {
      for (const table of frame.tables) {
        if (table.thCount > 0 && table.scopedThCount !== table.thCount) {
          violations.push(
            `${frame.mountId}: ${table.thCount - table.scopedThCount} of ${table.thCount} header cells lack scope`,
          );
        }
        for (const column of table.numericColumns) {
          if (!column.rightAligned) {
            violations.push(
              `${frame.mountId}: numeric column "${column.header}" is not right-aligned`,
            );
          }
        }
        if (table.sortable) headerSorted.add(frame.mountId);
        if (census.get(frame.sourceId) === 'control-sort') {
          if (table.ariaSortCount === 1) {
            controlSorted.add(frame.mountId);
          } else {
            violations.push(
              `${frame.mountId}: a control-sorted table exposes its sort state on ${table.ariaSortCount} headers, not one`,
            );
          }
        }
      }
    }
    expect(
      [...headerSorted].sort(),
      'the tables with header sort buttons are exactly the census header-sort mounts',
    ).toEqual(censusMounts('header-sort'));
    expect(
      [...controlSorted].sort(),
      'the control-sorted tables are exactly the census control-sort mounts',
    ).toEqual(censusMounts('control-sort'));
    expect(
      headerSorted.size + controlSorted.size,
      'the sweep found sortable instrument tables (population is not vacuous)',
    ).toBeGreaterThanOrEqual(5);
    expect(violations, 'static table-semantics violations').toEqual([]);
  });

  test('VAL-B2-COMP-010 sorting announces itself and n/a never substitutes for a value', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const { frames } = await sweep(browser, staticBase);
    const violations: string[] = [];

    // The honest n/a set reconciles with the registry in both directions.
    const renderedNa = new Set<string>();
    for (const frame of frames) {
      for (const table of frame.tables) {
        for (const cell of table.naCells) {
          renderedNa.add(`${frame.sourceId} :: ${cell.column}`);
        }
      }
    }
    const registeredNa = new Set(
      NA_CELL_FAMILIES.map((family) => `${family.sourceId} :: ${family.column}`),
    );
    const missingNa = [...registeredNa].filter((key) => !renderedNa.has(key));
    const unregisteredNa = [...renderedNa].filter((key) => !registeredNa.has(key));
    if (missingNa.length > 0) {
      violations.push(`registered n/a families not rendered: ${missingNa.join('; ')}`);
    }
    if (unregisteredNa.length > 0) {
      violations.push(`unregistered n/a cells: ${unregisteredNa.join('; ')}`);
    }

    for (const frame of frames) {
      for (const table of frame.tables) {
        if (table.blankCellCount > 0) {
          violations.push(
            `${frame.mountId}: ${table.blankCellCount} blank cells in a populated row`,
          );
        }
        const mixed = table.naCells
          .map((cell) => cell.column)
          .filter((column) => table.notDisclosedColumns.includes(column));
        if (mixed.length > 0) {
          violations.push(
            `${frame.mountId}: column(s) ${[...new Set(mixed)].join(', ')} mix "n/a" with "not disclosed"; n/a means the field does not apply to the row, not disclosed means it exists but its owner has not published it`,
          );
        }
      }
    }
    expect(violations, 'table honesty violations').toEqual([]);
  });

  test('VAL-B2-COMP-009 sorting a sortable instrument table announces the sort column', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const plan = buildInteractiveExecutionPlan(brandV2Registry);
    const sourceById = new Map(plan.sources.map((source) => [source.id, source]));
    const mountsByRoute = Map.groupBy(plan.mounts, (mount) => mount.route);
    // Every census mount is sorted the way a reader sorts it, and its
    // table header announces the new order. Successor of "click the first
    // visible 'Sort by' header button on at least five frames", fixed on
    // 26 September 2026 before the reader-first figure rewrite (owner
    // decision of 2 October 2026, library/design-system.md 13.4) put the
    // comparison matrix's sortable table in its closed "Adjust more" fold
    // and moved the hand comparison's sort into a visible "Sort by" preset
    // group over a table in "How this was made". A header-sort table is
    // reached by opening the fold that holds it; a control-sort table is
    // reordered by a preset it is not already on. The floor of five stays,
    // and the exercised set must equal the census.
    const census = sortableTableCensus();
    const sortableRoutes: string[] = [];
    await forEachInOwnContext(
      browser,
      [...mountsByRoute].sort(([a], [b]) => a.localeCompare(b)),
      async (page, [route, mounts]) => {
        await page.setViewportSize(VIEWPORT);
        await page.goto(`${staticBase}${route}`);
        await page.waitForFunction(() =>
          [...document.querySelectorAll('button')].some((element) =>
            Object.keys(element).some((key) => key.startsWith('__reactFiber$')),
          ),
        );
        const roots = await mountRoots(page, route, mountIdentities(plan, mounts));
        for (let index = 0; index < mounts.length; index += 1) {
          const frame = roots[index];
          const mountId = mounts[index].id;
          const kind = census.get(mounts[index].sourceId);
          if (kind === 'control-sort') {
            sortableRoutes.push(mountId);
            const preset = frame
              .getByRole('group', { name: 'Sort by', exact: true })
              .locator('button[aria-pressed="false"]')
              .first();
            const sortState = () =>
              frame.evaluate((root) =>
                [...root.querySelectorAll('table thead th')]
                  .map((th) => `${(th.textContent ?? '').trim()}=${th.getAttribute('aria-sort') ?? ''}`)
                  .join('|'),
              );
            const before = await sortState();
            const name = await preset.innerText();
            await preset.click();
            await expect
              .poll(sortState, {
                message: `${mountId}: choosing "${name}" moves the table's aria-sort (before: ${before})`,
                timeout: 5_000,
              })
              .not.toBe(before);
            expect(
              await frame.locator('table thead th[aria-sort]').count(),
              `${mountId}: one header carries the sort after choosing "${name}"`,
            ).toBe(1);
            continue;
          }
          if (kind === 'header-sort') {
            const closedFolds = frame.locator('details:not([open])').filter({
              has: page.locator('th button'),
            });
            const toOpen = await closedFolds.count();
            for (let opened = 0; opened < toOpen; opened += 1) {
              await closedFolds.first().locator('summary').first().click();
            }
            await expect(
              closedFolds,
              `${mountId}: every fold holding a sortable table opens`,
            ).toHaveCount(0);
          }
          const sortButtons = frame.getByRole('button', { name: /^Sort by / });
          const buttonCount = await sortButtons.count();
          if (buttonCount === 0) continue;
          sortableRoutes.push(mountId);
          const button = sortButtons.first();
          const th = button.locator('xpath=ancestor::th[1]');
          const before = await th.getAttribute('aria-sort');
          await button.click();
          await expect
            .poll(() => th.getAttribute('aria-sort'), {
              message: `${mountId}: clicking a sort header sets aria-sort (before: ${before})`,
              timeout: 5_000,
            })
            .not.toBe(before);
        }
      },
      { viewport: VIEWPORT },
    );
    expect(
      sortableRoutes.length,
      'sortable instrument tables were actually exercised',
    ).toBeGreaterThanOrEqual(5);
    expect(
      new Set(sortableRoutes).size,
      'each sortable instrument exercised once',
    ).toBe(sortableRoutes.length);
    expect(
      [...sortableRoutes].sort(),
      'the exercised instruments are exactly the sortable-table census',
    ).toEqual(
      plan.mounts
        .filter((mount) => census.has(mount.sourceId))
        .map((mount) => mount.id)
        .sort(),
    );
    expect(sourceById.size, 'the plan resolves its sources').toBeGreaterThan(0);
  });
});
