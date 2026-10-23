import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser, Locator } from '@playwright/test';
import { brandV2Registry, expect, test } from './brand-v2-static-fixture';
import { forEachInOwnContext } from './helpers/per-route-context';
import { mountRoots } from './helpers/interactive-mount-roots';
import { ACCENT_ROLE_PROPERTIES } from './helpers/figure-light-stage';
import { buildInteractiveExecutionPlan } from '../../lib/brand-v2-runners';
import {
  INTERACTIVE_DATA_CLASSIFICATION,
  RETIRED_PAINTS,
  STATUS_LABEL_EXCEPTIONS,
  NA_CELL_FAMILIES,
  STATUS_LABEL_VOCABULARY,
  classifyLegendText,
  classifyResolvedPaint,
  labelledSeriesIds,
  nonColourDistinct,
  tableSortCensus,
  type MarkObservation,
  type SeriesLabelEvidence,
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

const DATA_TOKENS = new Set([
  'accent',
  'retired',
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

/**
 * One geometry painted in the accent (#3B6EA8, at any opacity): the
 * `data-series` holder it sits in, and whether the paint follows one of
 * ACCENT_ROLE_PROPERTIES.
 */
type AccentMark = { seriesId: string | null; onRole: boolean; at: string };

/** One geometry painted in a RETIRED_PAINTS colour, at any opacity. */
type RetiredMark = { paint: string; at: string };

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
  labels: SeriesLabelEvidence[];
  legend: LegendEntry[];
  series: Record<string, SeriesEvidence>;
  accentMarks: AccentMark[];
  retiredMarks: RetiredMark[];
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
 * One frame's evidence, with each series marked labelled only when visible
 * in-plot text names it, by the judgement the jsdom helper
 * (tests/helpers/series-encoding.ts) applies too.
 */
async function collectFrame(
  frame: Locator,
): Promise<Omit<FrameEvidence, 'route' | 'routeText' | 'mountId' | 'sourceId'>> {
  const evidence = await observeFrame(frame);
  const inPlot = labelledSeriesIds(evidence.labels, 'label-for');
  for (const [seriesId, row] of Object.entries(evidence.series)) row.labelled = inPlot.has(seriesId);
  return evidence;
}

/**
 * The in-page observer. Playwright serializes this function into the page,
 * so it must close over nothing: the accent role properties and the retired
 * paints are passed in. It resolves every mark's computed paint, geometry
 * tag and dash state, the visible runs of every text that names a series,
 * plus the legend swatches, table cells, circles, and per-series rect
 * geometry the parity anchors compare against, and every geometry drawn in
 * the accent or a retired paint.
 */
function observeFrame(
  frame: Locator,
): Promise<Omit<FrameEvidence, 'route' | 'routeText' | 'mountId' | 'sourceId'>> {
  return frame.evaluate((frameElement, { accentRoles, retired }) => {
    const hexOf = (value: string): string | null => {
      const srgb = /^color\(srgb\s+([^)]*)\)$/.exec(value);
      const functional = srgb ?? /^rgba?\(([^)]*)\)$/.exec(value);
      if (!functional) return null;
      const parts = functional[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      if (parts.length < 3 || parts[3] === 0) return null;
      return `#${parts
        .slice(0, 3)
        .map((channel) => Math.round(channel * (srgb ? 255 : 1)).toString(16).padStart(2, '0'))
        .join('')}`.toUpperCase();
    };
    // The one muted accent is the runtime signal token (VAL-B2-COL-002), as
    // tests/e2e/helpers/figure-light-stage.ts reads it.
    const accent = (() => {
      const probe = document.createElement('span');
      probe.style.display = 'none';
      probe.style.color = 'var(--color-signal)';
      frameElement.appendChild(probe);
      const colour = hexOf(getComputedStyle(probe).color);
      probe.remove();
      return colour;
    })();
    if (!accent) throw new Error('--color-signal does not resolve');
    const retiredHexes = new Set(retired.map((colour: string) => colour.toUpperCase()));
    const describe = (el: Element) => {
      const data = [...el.attributes]
        .filter((attribute) => attribute.name.startsWith('data-'))
        .slice(0, 2)
        .map((attribute) => `${attribute.name}="${attribute.value.slice(0, 40)}"`);
      return `<${[el.tagName.toLowerCase(), ...data].join(' ')}>`;
    };
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
          // The swatch's mark is the first shape it draws: a pattern tile
          // in its defs is part of a fill, and a structure line framing the
          // mark is not the series.
          const mark = Array.from(
            svg.querySelectorAll('line, path, polyline, polygon, rect, circle, ellipse'),
          ).find(
            (shape) =>
              !shape.closest('defs, pattern, clipPath, mask') &&
              !shape.hasAttribute('data-scene-structure'),
          );
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
    const accentMarks: Array<{ seriesId: string | null; onRole: boolean; at: string }> = [];
    const retiredMarks: Array<{ paint: string; at: string }> = [];
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
        // is counted twice. `closest` starts at the holder itself, so the
        // search starts at its parent.
        if (holder.parentElement?.closest('[data-series]')) continue;
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
    }

    // The accent and retired sweep is mark-level, tagged or not, legend
    // swatches included. Which accent paints come through an allowed role is
    // read the way figure-light-stage reads it: each role property is set
    // inline on every element of the frame to a sentinel no figure uses, a
    // paint that follows it came through that property, and everything is
    // put back before the paints are read.
    const shapes = Array.from(frameElement.querySelectorAll<SVGElement>(`svg :is(${SHAPES})`));
    const SENTINEL = 'rgb(1, 2, 3)';
    const planted: Array<[HTMLElement | SVGElement, string]> = [];
    for (const el of [frameElement, ...frameElement.querySelectorAll('*')] as Array<
      HTMLElement | SVGElement
    >) {
      for (const name of accentRoles) {
        if (el.style.getPropertyValue(name)) continue;
        el.style.setProperty(name, SENTINEL);
        planted.push([el, name]);
      }
    }
    const onRole = shapes.map((el) => {
      const cs = getComputedStyle(el);
      return { stroke: cs.stroke === SENTINEL, fill: cs.fill === SENTINEL };
    });
    for (const [el, name] of planted) el.style.removeProperty(name);
    // A mark belongs to its outermost holder, as the series rows count it.
    const seriesOf = (el: Element) => {
      let holder: Element | null = null;
      for (
        let node = el.closest('[data-series]');
        node;
        node = node.parentElement?.closest('[data-series]') ?? null
      ) {
        holder = node;
      }
      return holder?.getAttribute('data-series') ?? null;
    };
    shapes.forEach((el, index) => {
      const cs = getComputedStyle(el);
      for (const [kind, value] of [
        ['stroke', cs.stroke],
        ['fill', cs.fill],
      ] as const) {
        if (!isPaint(value)) continue;
        const hex = hexOf(value);
        if (hex && retiredHexes.has(hex)) {
          retiredMarks.push({ paint: hex, at: `${describe(el)} ${kind}` });
        }
        if (hex === accent) {
          accentMarks.push({
            seriesId: seriesOf(el),
            onRole: onRole[index][kind],
            at: `${describe(el)} ${kind}`,
          });
        }
      }
    });

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

    // The labels that name series (VAL-B2-VIZ-004): text tied to a series
    // by data-series-label-for and every legend entry with a series id,
    // each kept to the runs a reader can see. A series drawn in a closed
    // fold is seen only once the fold opens, so its labels are measured
    // with the frame's folds open and the folds are closed again after.
    const labels: Array<{
      seriesIds: string[];
      via: 'label-for' | 'legend';
      visibleText: string;
      inPlot: boolean;
      hidden: string[];
    }> = [];
    const closedFolds = Array.from(frameElement.querySelectorAll('details')).filter(
      (fold) => !fold.open,
    );
    for (const fold of closedFolds) fold.open = true;
    try {
      const frameBox = frameElement.getBoundingClientRect();
      // Only a fourth (alpha) component of 0 is transparent: rgb(0, 0, 0) is opaque black.
      const zeroAlpha = (value: string) => {
        const trimmed = value.trim();
        if (trimmed === 'none' || trimmed === 'transparent') return true;
        const channels = trimmed.match(/^rgba?\(([^)]*)\)$/)?.[1].split(/[\s,/]+/).filter(Boolean);
        return channels?.length === 4 && parseFloat(channels[3]) === 0;
      };
      const hiddenBy = (el: Element): string | null => {
        for (let node: Element | null = el; node; node = node.parentElement) {
          if (node.getAttribute('aria-hidden') === 'true') return 'aria-hidden';
          if (node.classList.contains('sr-only')) return 'screen-reader only';
          const cs = getComputedStyle(node);
          if (cs.display === 'none') return 'not displayed';
          if (Number(cs.opacity) === 0) return 'opacity 0';
          if (/^inset\(50%/.test(cs.clipPath) || (cs.position === 'absolute' && cs.clip.startsWith('rect('))) {
            return 'clipped away';
          }
          if (node instanceof HTMLElement && cs.overflow !== 'visible') {
            const box = node.getBoundingClientRect();
            if (box.width <= 1 || box.height <= 1) return 'clipped to a pixel';
          }
          if (node === frameElement) break;
        }
        return getComputedStyle(el).visibility === 'visible' ? null : 'visibility hidden';
      };
      const unrendered = (node: Text, parent: Element): string | null => {
        const cs = getComputedStyle(parent);
        if (parent instanceof SVGElement) {
          const filled = !zeroAlpha(cs.fill) && Number(cs.fillOpacity) > 0;
          const stroked = !zeroAlpha(cs.stroke) && Number(cs.strokeOpacity) > 0 && parseFloat(cs.strokeWidth) > 0;
          if (!filled && !stroked) return 'unpainted';
        } else if (zeroAlpha(cs.color)) {
          return 'unpainted';
        }
        let box: DOMRect;
        if (parent instanceof SVGElement) {
          box = parent.getBoundingClientRect();
        } else {
          const range = document.createRange();
          range.selectNodeContents(node);
          box = range.getBoundingClientRect();
        }
        if (box.width < 1 || box.height < 1) return 'no box';
        if (
          box.left < frameBox.left - 1 ||
          box.right > frameBox.right + 1 ||
          box.top < frameBox.top - 1 ||
          box.bottom > frameBox.bottom + 1
        ) {
          return 'outside the frame';
        }
        return null;
      };
      const read = (el: Element) => {
        const runs: string[] = [];
        const hidden: string[] = [];
        let inPlot = true;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
          const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
          if (!text) continue;
          const parent = node.parentElement;
          if (!parent || parent.closest('title, desc, style, script, defs')) {
            hidden.push(`"${text}": not rendered`);
            continue;
          }
          const reason = hiddenBy(parent) ?? unrendered(node, parent);
          if (reason) {
            hidden.push(`"${text}": ${reason}`);
            continue;
          }
          runs.push(text);
          if (!parent.closest('svg')) inPlot = false;
        }
        return { visibleText: runs.join(' '), inPlot: runs.length > 0 && inPlot, hidden };
      };
      for (const el of Array.from(frameElement.querySelectorAll('[data-series-label-for]'))) {
        labels.push({
          seriesIds: (el.getAttribute('data-series-label-for') ?? '').split(/\s+/).filter(Boolean),
          via: 'label-for',
          ...read(el),
        });
      }
      for (const band of Array.from(frameElement.querySelectorAll('[data-instrument-legend]'))) {
        for (const item of Array.from(band.querySelectorAll('[data-legend-item]'))) {
          const seriesId = item.getAttribute('data-legend-series');
          if (seriesId) labels.push({ seriesIds: [seriesId], via: 'legend', ...read(item) });
        }
      }
    } finally {
      for (const fold of closedFolds) fold.open = false;
    }

    return {
      labels,
      legend,
      series,
      accentMarks,
      retiredMarks,
      canvasCount: frameElement.querySelectorAll('canvas').length,
      circles,
      seriesRects,
      text: (frameElement.textContent ?? '').replace(/\s+/g, ' ').trim(),
      tables,
    };
  }, { accentRoles: [...ACCENT_ROLE_PROPERTIES], retired: [...RETIRED_PAINTS] });
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
          evidence.labels.push(...state.labels);
          for (const entry of state.legend) {
            const key = `${entry.seriesId ?? ''}:${entry.text}`;
            if (!evidence.legend.some((existing) => `${existing.seriesId ?? ''}:${existing.text}` === key)) {
              evidence.legend.push(entry);
            }
          }
          evidence.accentMarks.push(...state.accentMarks);
          evidence.retiredMarks.push(...state.retiredMarks);
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

/**
 * The VAL-B2-VIZ-004 judgement, one list per clause:
 * - `naming`: a legend entry whose words are colour names alone;
 * - `dangling`: a legend entry naming a series that renders no marks;
 * - `unexplained`: a series that no visible text names, neither in-plot
 *   text tied to it by data-series-label-for nor a legend entry whose
 *   data-legend-series names it (`labelledSeriesIds`). Each line lists the
 *   label runs that were dropped as unseen, so a failure says why.
 */
function viz004Violations(frames: readonly FrameEvidence[]) {
  const found = { naming: [] as string[], dangling: [] as string[], unexplained: [] as string[] };
  for (const frame of frames) {
    for (const entry of frame.legend) {
      const classification = classifyLegendText(entry.text);
      if (classification !== 'named') {
        found.naming.push(`${frame.mountId}: legend entry "${entry.text}" is ${classification}`);
      }
      if (entry.seriesId && !frame.series[entry.seriesId]) {
        found.dangling.push(
          `${frame.mountId}: legend entry "${entry.text}" names series "${entry.seriesId}" which renders no marks`,
        );
      }
    }
    const named = labelledSeriesIds(frame.labels);
    for (const seriesId of Object.keys(frame.series)) {
      if (named.has(seriesId)) continue;
      const unseen = frame.labels
        .filter((label) => label.seriesIds.includes(seriesId))
        .flatMap((label) => label.hidden);
      found.unexplained.push(
        `${frame.mountId}: series "${seriesId}" has neither a legend entry nor an in-plot label${
          unseen.length > 0 ? ` (unseen: ${unseen.join('; ')})` : ''
        }`,
      );
    }
  }
  return found;
}

/**
 * The VAL-B2-VIZ-003 judgement (contract/design-integrity.md), one list per
 * clause:
 * - `retired`: a geometry painted in a retired paint, at any opacity;
 * - `offRole`: an accent geometry whose paint does not come through
 *   ACCENT_ROLE_PROPERTIES;
 * - `offLead`: an accent-painted series other than the source's registered
 *   lead or, where none is registered, a second accent-painted series. A
 *   mark outside every series (an annotation leader, a marker) is held to
 *   the role clause only;
 * - `lead`: a registered lead series with no marks, or resolving a
 *   data-bearing paint its row does not register. The grayscale chart tones
 *   are not data-bearing, so the lead is never required to carry the accent.
 */
function viz003Violations(frames: readonly FrameEvidence[]) {
  const found = {
    lead: [] as string[],
    offLead: [] as string[],
    offRole: [] as string[],
    retired: [] as string[],
  };
  for (const frame of frames) {
    for (const mark of frame.retiredMarks) {
      found.retired.push(`${frame.mountId}: ${mark.at} paints the retired ${mark.paint}`);
    }
    for (const mark of frame.accentMarks) {
      if (!mark.onRole) {
        found.offRole.push(
          `${frame.mountId}: ${mark.at} paints the accent outside ${ACCENT_ROLE_PROPERTIES.join(', ')}`,
        );
      }
    }
    const spec = INTERACTIVE_DATA_CLASSIFICATION[frame.sourceId];
    const lead = spec?.leadSeriesId;
    const accentSeries = [
      ...new Set(
        frame.accentMarks
          .map(({ seriesId }) => seriesId)
          .filter((seriesId): seriesId is string => seriesId !== null),
      ),
    ];
    const offLead = lead
      ? accentSeries.filter((seriesId) => seriesId !== lead)
      : accentSeries.slice(1);
    for (const seriesId of offLead) {
      found.offLead.push(
        lead
          ? `${frame.mountId}: series "${seriesId}" carries the accent, which marks only the lead "${lead}"`
          : `${frame.mountId}: series "${seriesId}" carries the accent beside "${accentSeries[0]}"`,
      );
    }
    if (!lead) continue;
    const row = frame.series[lead];
    if (!row) {
      found.lead.push(`${frame.mountId}: lead series "${lead}" carries no data-series marks`);
      continue;
    }
    const allowed: readonly string[] = spec.leadPaints ?? ['accent'];
    for (const paint of row.paints) {
      const token = classifyResolvedPaint(paint);
      if (DATA_TOKENS.has(token) && !allowed.includes(token)) {
        found.lead.push(
          `${frame.mountId}: lead series "${lead}" resolves ${token} (${paint}); allowed: ${allowed.join(', ')}`,
        );
      }
    }
  }
  return found;
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

  test('VAL-B2-VIZ-003 the accent marks only the lead series through its role and no retired paint is drawn', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const { frames } = await sweep(browser, staticBase);
    const leadRows = Object.entries(INTERACTIVE_DATA_CLASSIFICATION).filter(
      ([, spec]) => spec.leadSeriesId,
    );
    expect(
      leadRows.length,
      'the classification registers lead-series charts (population is not vacuous)',
    ).toBeGreaterThanOrEqual(3);
    for (const [sourceId] of leadRows) {
      expect(
        frameFor(sourceId, frames).length,
        `${sourceId} lead series has a rendered mount`,
      ).toBeGreaterThan(0);
    }
    // The sweep reads the accent where the corpus draws it, and the role
    // probe recognises it there, so the clauses below judge real paints.
    expect(
      frames.filter(({ accentMarks }) => accentMarks.some(({ onRole }) => onRole)).length,
      'frames whose accent the role probe traced to an allowed role',
    ).toBeGreaterThanOrEqual(50);
    const found = viz003Violations(frames);
    expect(found.lead, 'lead-series paint violations').toEqual([]);
    expect(found.offLead, 'the accent on a series other than the lead').toEqual([]);
    expect(found.offRole, 'the accent outside the highlight role and the lit part').toEqual([]);
    expect(found.retired, 'a retired paint on an instrument geometry').toEqual([]);

    // The same collector and judgement fail on planted marks: an off-role
    // accent, an accent series beside the registered lead and two retired
    // paints, while the accent through the highlight role on the lead
    // passes and a holder nested in another holder counts once.
    const plan = buildInteractiveExecutionPlan(brandV2Registry);
    const route = '/manipulation/rl-finetuning/';
    const mounts = plan.mounts.filter((mount) => mount.route === route);
    const index = mounts.findIndex((mount) => mount.sourceId === 'interactive:ExpoFtResults');
    expect(index, 'the EXPO-FT results mount, whose lead series is registered').toBeGreaterThanOrEqual(0);
    const context = await browser.newContext({ viewport: VIEWPORT });
    try {
      const page = await context.newPage();
      await page.goto(`${staticBase}${route}`);
      const frame = (await mountRoots(page, route, mountIdentities(plan, mounts)))[index];
      const judge = async () => {
        const evidence = await collectFrame(frame);
        return {
          evidence,
          found: viz003Violations([
            {
              ...evidence,
              route,
              routeText: '',
              mountId: mounts[index].id,
              sourceId: mounts[index].sourceId,
            },
          ]),
        };
      };
      const before = await judge();
      expect(before.found, 'the unplanted frame passes').toEqual({
        lead: [],
        offLead: [],
        offRole: [],
        retired: [],
      });
      const planted = await frame.evaluate((root) => {
        const stage = root.querySelector('[data-figure-stage]') ?? root;
        stage.insertAdjacentHTML(
          'beforeend',
          `<svg data-planted="drawing" viewBox="0 0 200 20" width="200" height="20" role="img" aria-label="planted marks">
            <rect data-planted="off-role" x="0" y="0" width="10" height="10" fill="#3B6EA8" />
            <g data-series="planted-other"><rect data-planted="off-lead" x="20" y="0" width="10" height="10" style="fill: var(--role-highlight-graphic)" /></g>
            <rect data-planted="retired-blue" x="40" y="0" width="10" height="10" fill="#245FFF" />
            <line data-planted="retired-lime" x1="60" y1="5" x2="80" y2="5" stroke="#C6FF19" />
            <g data-series="expo-ft"><rect data-planted="lead-role" x="100" y="0" width="10" height="10" style="fill: var(--role-highlight-graphic)" /></g>
            <g data-series="planted-outer"><rect data-planted="outer" x="120" y="0" width="10" height="10" fill="#3F3F3B" /><g data-series="planted-inner"><rect data-planted="inner" x="140" y="0" width="10" height="10" fill="#3F3F3B" /></g></g>
          </svg>`,
        );
        return Boolean(root.querySelector('[data-planted="drawing"]'));
      });
      expect(planted, 'the planted drawing sits in the frame').toBe(true);
      const after = await judge();
      const named = (list: string[]) =>
        list.map((at) => at.match(/data-planted="([^"]+)"/)?.[1] ?? at).sort();
      // Each clause fails on its own planted mark and on nothing else.
      expect(named(after.found.retired)).toEqual(['retired-blue', 'retired-lime']);
      expect(named(after.found.offRole)).toEqual(['off-role']);
      expect(after.found.offLead).toEqual([
        `${mounts[index].id}: series "planted-other" carries the accent, which marks only the lead "expo-ft"`,
      ]);
      // The accent through the highlight role on the lead itself passes.
      expect(after.found.lead).toEqual([]);
      expect(
        after.evidence.accentMarks.some(({ at, onRole }) => at.includes('lead-role') && onRole),
      ).toBe(true);
      // A holder inside another holder adds no series and counts no mark
      // twice: both rects belong to the outer series.
      expect(after.evidence.series['planted-inner']).toBeUndefined();
      expect(after.evidence.series['planted-outer']?.marks).toBe(2);
    } finally {
      await context.close();
    }
  });

  test('VAL-B2-VIZ-004 legends map bijectively to marks and name things, not colours', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const { frames } = await sweep(browser, staticBase);
    const found = viz004Violations(frames);
    expect(found.naming, 'legend entries that rely on colour words alone').toEqual([]);
    expect(found.dangling, 'legend entries with no marks').toEqual([]);
    expect(found.unexplained, 'plotted series with no legend and no label').toEqual([]);
    expect(
      frames.filter((frame) => labelledSeriesIds(frame.labels, 'label-for').size > 0).length,
      'frames whose series visible in-plot text names',
    ).toBeGreaterThanOrEqual(15);

    // The same collector and judgement fail a series that carries a marker
    // attribute and no visible text, and every label a reader cannot see,
    // while visible in-plot text and a visible legend entry pass.
    const plan = buildInteractiveExecutionPlan(brandV2Registry);
    const route = '/classical/motion-planning/';
    const mounts = plan.mounts.filter((mount) => mount.route === route);
    const index = mounts.findIndex((mount) => mount.sourceId === 'interactive:RrtExplorer');
    expect(index, 'the RRT explorer mount').toBeGreaterThanOrEqual(0);
    const context = await browser.newContext({ viewport: VIEWPORT });
    try {
      const page = await context.newPage();
      await page.goto(`${staticBase}${route}`);
      const frame = (await mountRoots(page, route, mountIdentities(plan, mounts)))[index];
      const judge = async () => {
        const evidence = await collectFrame(frame);
        return viz004Violations([
          { ...evidence, route, routeText: '', mountId: 'planted', sourceId: mounts[index].sourceId },
        ]).unexplained;
      };
      expect(await judge(), 'the unplanted frame passes').toEqual([]);
      const planted = await frame.evaluate((root) => {
        const stage = root.querySelector('[data-figure-stage]') ?? root;
        const mark = '<line x1="0" y1="10" x2="20" y2="10" stroke="#3F3F3B" />';
        stage.insertAdjacentHTML(
          'beforeend',
          `<svg data-planted="drawing" viewBox="0 0 400 40" width="400" height="40" role="img" aria-label="planted series">
            <g data-series="attribute-only" data-series-labelled="">${mark}</g>
            <g data-series="aria-hidden">${mark}<text data-series-label-for="aria-hidden" aria-hidden="true" x="30" y="14" font-size="12">aria hidden</text></g>
            <g data-series="screen-reader-only">${mark}<text data-series-label-for="screen-reader-only" class="sr-only" x="30" y="14" font-size="12">screen reader only</text></g>
            <g data-series="no-box">${mark}<text data-series-label-for="no-box" x="30" y="14" font-size="0">no box</text></g>
            <g data-series="unpainted">${mark}<text data-series-label-for="unpainted" fill="none" x="30" y="14" font-size="12">unpainted</text></g>
            <g data-series="outside">${mark}<text data-series-label-for="outside" x="30" y="-4000" font-size="12">outside the frame</text></g>
            <g data-series="title-only">${mark}<title data-series-label-for="title-only">title only</title></g>
            <g data-series="numeral-only">${mark}<text data-series-label-for="numeral-only" x="30" y="14" font-size="12">0.5</text></g>
            <g data-series="contained-only">${mark}<text x="30" y="14" font-size="12">contained only</text></g>
            <g data-series="in-plot">${mark}<text data-series-label-for="in-plot" x="200" y="14" font-size="12">named in the plot</text></g>
            <g data-series="legend-named">${mark}</g>
            <g data-series="legend-hidden">${mark}</g>
          </svg>
          <div data-instrument-legend="" data-planted="legend">
            <span data-legend-item="" data-legend-series="legend-named">named in the legend</span>
            <span data-legend-item="" data-legend-series="legend-hidden" class="sr-only">hidden legend entry</span>
          </div>`,
        );
        return Boolean(root.querySelector('[data-planted="drawing"]'));
      });
      expect(planted, 'the planted drawing sits in the frame').toBe(true);
      const unnamed = (await judge()).map((line) => line.match(/series "([^"]+)"/)?.[1] ?? line).sort();
      expect(unnamed).toEqual(
        [
          'attribute-only',
          'aria-hidden',
          'screen-reader-only',
          'no-box',
          'unpainted',
          'outside',
          'title-only',
          'numeral-only',
          'contained-only',
          'legend-hidden',
        ].sort(),
      );
    } finally {
      await context.close();
    }
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
