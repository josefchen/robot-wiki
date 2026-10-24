import type { Locator } from '@playwright/test';
import { ACCENT_ROLE_PROPERTIES } from './figure-light-stage';
import {
  RETIRED_PAINTS,
  classifyResolvedPaint,
  labelledSeriesIds,
  nonColourDistinct,
  type MarkObservation,
  type SeriesLabelEvidence,
} from '../../../lib/brand-v2-interactive-data';

/**
 * What an instrument frame draws, read out of the live DOM: every series'
 * resolved paints and geometry classes, the in-plot text that names a
 * series, the legend, the accent and retired paints, circles, per-series
 * rects and table cells. Shared by the interactive data gates
 * (brand-v2-interactive-data.spec.ts) and the keyboard transition ledger
 * (brand-v2-interactive-states.spec.ts), so both judge series by one reading.
 */

export const DATA_TOKENS = new Set([
  'accent',
  'retired',
  'error',
  'warn',
  'ok',
  'text',
  'text-dim',
  'pattern',
]);

export type LegendSwatch = {
  tag: string;
  stroke: string | null;
  fill: string | null;
  dash: string | null;
  strokeWidth: string | null;
};

export type LegendEntry = {
  text: string;
  seriesId: string | null;
  swatch: LegendSwatch | null;
};

export type SeriesEvidence = {
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
export type AccentMark = { seriesId: string | null; onRole: boolean; at: string };

/** One geometry painted in a RETIRED_PAINTS colour, at any opacity. */
export type RetiredMark = { paint: string; at: string };

export type CircleEvidence = { cx: number; cy: number; r: number };

export type TableEvidence = {
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

export type FrameEvidence = {
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

/**
 * One frame's evidence, with each series marked labelled only when visible
 * in-plot text names it, by the judgement the jsdom helper
 * (tests/helpers/series-encoding.ts) applies too.
 */
export async function collectFrame(
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
export function observeFrame(
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

export function observationOf(frame: Pick<FrameEvidence, 'series'>, seriesId: string): MarkObservation | null {
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

/**
 * Every pair of the frame's series, judged by `nonColourDistinct`: a pair
 * that shares its geometry and carries no in-plot label is told apart by
 * colour alone.
 */
export function seriesComparison(frame: Pick<FrameEvidence, 'series'>): {
  count: number;
  pairs: number;
  violations: string[];
} {
  const ids = Object.keys(frame.series);
  const violations: string[] = [];
  let pairs = 0;
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = observationOf(frame, ids[i]);
      const b = observationOf(frame, ids[j]);
      if (!a || !b) continue;
      pairs += 1;
      if (!nonColourDistinct(a, b)) {
        violations.push(
          `"${ids[i]}" vs "${ids[j]}" share geometry [${a.geometries.join(', ')}] and neither carries an in-plot label`,
        );
      }
    }
  }
  return { count: ids.length, pairs, violations };
}
