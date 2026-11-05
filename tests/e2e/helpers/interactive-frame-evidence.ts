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
  points?: string | null;
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
  sortStates?: Array<{ column: string; direction: string }>;
  naCells: Array<{ column: string }>;
  notDisclosedColumns: string[];
  notDisclosedCount: number;
  blankCellCount: number;
  approxCellCount: number;
  numericColumns: Array<{ header: string; rightAligned: boolean }>;
  cells: Array<{ row: string; column: string; text: string }>;
};

export type FrameEvidence = {
  route: string;
  mountId: string;
  sourceId: string;
  routeText: string;
  labels: SeriesLabelEvidence[];
  legend: LegendEntry[];
  series: Record<string, SeriesEvidence>;
  seriesDeclarations?: string[];
  accentMarks: AccentMark[];
  retiredMarks: RetiredMark[];
  canvasCount: number;
  circles: CircleEvidence[];
  seriesRects: Array<{ seriesId: string; x: number; y: number; width: number; height: number }>;
  text: string;
  sourceBindings: Array<{ citationId: string | null; href: string; label: string }>;
  controls: Array<{index:number;tag:string;type:string;id:string;testId:string;label:string;group?:string;value:string|null;min:string|null;max:string|null;step:string|null;checked:boolean|null;pressed:string|null;selected:string|null;disabled:boolean}>;
  readouts: Array<{key:string;text:string;visible:boolean}>;
  svgMarks: Array<{tag:string;seriesId:string|null;testId:string;id:string;ownerTestId?:string;overviewCell?:string;effectiveOpacity?:number;displayed?:boolean;plotTransform?:{a:number;b:number;c:number;d:number;e:number;f:number}|null;attrs:Record<string,string>;viewBox:string}>;
  svgTexts: Array<{seriesId:string|null;text:string;x:number|null;y:number|null;testId:string;ownerTestId?:string;overviewCell?:string;dy?:string|null;painted?:boolean;paintFailures?:string[]}>;
  htmlMarks?: Array<{seriesId:string|null;ownerTestId:string;tag:string;box:{x:number;y:number;width:number;height:number};parentBox:{x:number;y:number;width:number;height:number};widthStyle:string;opacity:number}>;
  methodCards?: Array<{id:string;text:string;visible:boolean;paintFailures?:string[]}>;
  physicalNeedles?: Array<{id:'pendulum-gravity-arrow'|'pendulum-push-arrow';topPaths:string[];visible:boolean}>;
  declaredBindings: Array<{element:string;attributes:Record<string,string>}>;
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
      swatch: { tag: string; stroke: string | null; fill: string | null; dash: string | null; strokeWidth: string | null; points?: string | null } | null;
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
              points: mark.getAttribute('points'),
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
    const planted = new Map<HTMLElement | SVGElement, string | null>();
    let onRole: Array<{ stroke: boolean; fill: boolean }>;
    try {
      for (const el of [frameElement, ...frameElement.querySelectorAll('*')] as Array<
        HTMLElement | SVGElement
      >) {
        for (const name of accentRoles) {
          if (el.style.getPropertyValue(name)) continue;
          if (!planted.has(el)) planted.set(el, el.getAttribute('style'));
          el.style.setProperty(name, SENTINEL);
        }
      }
      onRole = shapes.map((el) => {
        const cs = getComputedStyle(el);
        return { stroke: cs.stroke === SENTINEL, fill: cs.fill === SENTINEL };
      });
    } finally {
      for (const [el, style] of planted) {
        // Materialize pending CSSOM writes before removing an originally absent attribute.
        el.setAttribute('style', style ?? '');
        if (style === null) el.removeAttribute('style');
      }
    }
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
      sortStates?: Array<{ column: string; direction: string }>;
      naCells: Array<{ column: string }>;
      notDisclosedColumns: string[];
      notDisclosedCount: number;
      blankCellCount: number;
      approxCellCount: number;
      numericColumns: Array<{ header: string; rightAligned: boolean }>;
      cells: Array<{ row: string; column: string; text: string }>;
    }> = [];
    for (const table of frameElement.querySelectorAll('table')) {
      const ths = Array.from(table.querySelectorAll('thead th'));
      const headers = ths.map((th) => (th.textContent ?? '').trim());
      const naCells: Array<{ column: string }> = [];
      const notDisclosedColumns: string[] = [];
      let notDisclosedCount = 0;
      let blankCellCount = 0;
      let approxCellCount = 0;
      const observedCells: Array<{ row: string; column: string; text: string }> = [];
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
          const clone=cell.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('[data-sidenote],sup.cite-mark,.sr-only,[aria-hidden="true"]').forEach(n=>n.remove());
          observedCells.push({row:(row.querySelector('th,td')?.textContent??'').trim(),column,text:(clone.textContent??'').replace(/\s+/g,' ').trim()});
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
        sortStates: ths.filter((th) => th.hasAttribute('aria-sort')).map(th => ({ column: (th.textContent ?? '').replace(/\s+/g, ' ').trim(), direction: th.getAttribute('aria-sort')! })),
        naCells,
        notDisclosedColumns,
        notDisclosedCount,
        blankCellCount,
        approxCellCount,
        numericColumns,
        cells: observedCells,
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

    // Paint and semantic exposure are different observations. This check
    // deliberately ignores aria-hidden, but retains CSS clipping, every
    // painted text run and the figure boundary. The source oracle may use
    // it only with an exact, independently verified semantic alternative.
    const textPaintFailures = (element: Element): string[] => {
      const failures: string[] = [], frameBox = frameElement.getBoundingClientRect();
      const transparent = (value: string) => {
        if (value === 'transparent' || value === 'none') return true;
        const channels = value.match(/^(?:rgba?|color)\((?:srgb\s+)?([^)]*)\)$/)?.[1].split(/[\s,/]+/).filter(Boolean);
        return channels?.length === 4 && parseFloat(channels[3]) === 0;
      };
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      for (let text = walker.nextNode() as Text | null; text; text = walker.nextNode() as Text | null) {
        if (!(text.textContent ?? '').trim()) continue;
        const parent = text.parentElement;
        if (!parent) { failures.push('missing text owner'); continue; }
        const style = getComputedStyle(parent);
        const filled = !transparent(style.fill) && Number(style.fillOpacity) > 0;
        const stroked = !transparent(style.stroke) && Number(style.strokeOpacity) > 0 && parseFloat(style.strokeWidth) > 0;
        if (parent instanceof SVGElement ? !filled && !stroked : transparent(style.color)) failures.push('unpainted text');
        const range = document.createRange(); range.selectNodeContents(text);
        const box = parent instanceof SVGElement ? parent.getBoundingClientRect() : range.getBoundingClientRect();
        if (box.width < 1 || box.height < 1) failures.push('text has no box');
        if (box.left < frameBox.left - 1 || box.right > frameBox.right + 1 || box.top < frameBox.top - 1 || box.bottom > frameBox.bottom + 1) failures.push('text outside figure');
        for (let node: Element | null = parent; node; node = node.parentElement) {
          const css = getComputedStyle(node);
          if (css.display === 'none' || css.visibility !== 'visible' || Number(css.opacity) === 0) failures.push('text hidden by CSS');
          if (node.classList.contains('sr-only') || /^inset\(50%/.test(css.clipPath) || (css.position === 'absolute' && css.clip.startsWith('rect('))) failures.push('text clipped away');
          if (node instanceof HTMLElement && /hidden|clip|auto|scroll/.test(css.overflowX + css.overflowY)) {
            const clip = node.getBoundingClientRect();
            const clipX = /hidden|clip|auto|scroll/.test(css.overflowX), clipY = /hidden|clip|auto|scroll/.test(css.overflowY);
            if (clip.width <= 1 || clip.height <= 1 || clipX && (box.left < clip.left - 1 || box.right > clip.right + 1) || clipY && (box.top < clip.top - 1 || box.bottom > clip.bottom + 1)) failures.push('text outside scroll clip');
          }
          if (node === frameElement) break;
        }
      }
      return [...new Set(failures)];
    };

    // This source-bound chart's local attributes alone cannot reveal transforms.
    const outputTimesPlot = frameElement.querySelector<SVGSVGElement>('svg[data-testid="world-model-output-times-stage"]');
    const outputTimesTransform = (node: Element) => {
      const plot = outputTimesPlot?.getScreenCTM(), mark = (node as SVGGraphicsElement).getScreenCTM();
      if (!plot || !mark || plot.a * plot.d - plot.b * plot.c === 0) return null;
      const matrix = plot.inverse().multiply(mark);
      const values = { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f };
      return Object.values(values).every(Number.isFinite) ? values : null;
    };

    return {
      labels,
      legend: legend.map((entry, index) => ({
        ...entry,
        paintFailures: textPaintFailures([...frameElement.querySelectorAll('[data-instrument-legend]')]
          .flatMap(band => [...band.querySelectorAll('[data-legend-item]')])[index]),
      })),
      physicalNeedles: [...frameElement.querySelectorAll('[data-testid="pendulum-gravity-arrow"],[data-testid="pendulum-push-arrow"]')].map(node => {
        const caps = [...node.querySelectorAll<SVGPathElement>('path.iso-top')];
        return {
          id: node.getAttribute('data-testid') as 'pendulum-gravity-arrow' | 'pendulum-push-arrow',
          topPaths: caps.map(path => path.getAttribute('d') ?? ''),
          visible: node.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && caps.length > 0 && caps.every(path => {
            const box = path.getBoundingClientRect(), style = getComputedStyle(path);
            return path.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && box.width > 0 && box.height > 0 && isPaint(style.fill) && Number(style.fillOpacity) > 0;
          }),
        };
      }),
      series,
      seriesDeclarations: [...new Set([...frameElement.querySelectorAll('[data-series]')].map(node => node.getAttribute('data-series')!).filter(Boolean))],
      accentMarks,
      retiredMarks,
      canvasCount: frameElement.querySelectorAll('canvas').length,
      circles,
      seriesRects,
      text: (frameElement.textContent ?? '').replace(/\s+/g, ' ').trim(),
      tables,
      sourceBindings: [...frameElement.querySelectorAll('a[href]')].map(a=>({citationId:a.closest('[data-cite-id]')?.getAttribute('data-cite-id')??null,href:a.getAttribute('href')??'',label:(a.textContent??'').trim()})),
      controls: [...frameElement.querySelectorAll('button,input,select,textarea,summary,[role=slider],[role=tab],[aria-pressed],[aria-selected]')].map((node,index)=>{
        const ids=(node.getAttribute('aria-labelledby')??'').split(/\s+/).filter(Boolean);
        const native=node instanceof HTMLInputElement||node instanceof HTMLSelectElement||node instanceof HTMLTextAreaElement;
        const label=ids.map(id=>document.getElementById(id)?.textContent??'').join(' ').trim()||node.getAttribute('aria-label')||(native?[...(node.labels??[])].map(label=>label.textContent??'').join(' '):(node.textContent??''));
        const groupNode=node.closest('[role=group],[role=radiogroup]');
        const group=groupNode?.getAttribute('aria-label')??(groupNode?.getAttribute('aria-labelledby')??'').split(/\s+/).filter(Boolean).map(id=>document.getElementById(id)?.textContent??'').join(' ');
        return {index,tag:node.tagName.toLowerCase(),type:node.getAttribute('type')??'',id:node.id,testId:node.getAttribute('data-testid')??'',label:label.replace(/\s+/g,' ').trim(),...(group?{group:group.replace(/\s+/g,' ').trim()}:{}),value:native?node.value:node.getAttribute('aria-valuenow'),min:node.getAttribute('min')??node.getAttribute('aria-valuemin'),max:node.getAttribute('max')??node.getAttribute('aria-valuemax'),step:node.getAttribute('step'),checked:node instanceof HTMLInputElement?node.checked:node.getAttribute('aria-checked')==='true'?true:node.getAttribute('aria-checked')==='false'?false:null,pressed:node.getAttribute('aria-pressed'),selected:node.getAttribute('aria-selected'),disabled:node.matches(':disabled')||node.getAttribute('aria-disabled')==='true'};
      }),
      readouts:[...frameElement.querySelectorAll('[data-readout],[data-figure-readout],[data-scene-readout],[data-chart-readout],[data-figure-control-value],[data-testid$="-readout"],[data-testid^="term-"],[data-testid="force-limited-speed"]')].map((node,index)=>({key:node.getAttribute('data-readout')||node.getAttribute('data-testid')||node.id||String(index),text:(node.textContent??'').replace(/\s+/g,' ').trim(),visible:node.checkVisibility({visibilityProperty:true,opacityProperty:true})&&node.getClientRects().length>0})),
      svgMarks:[...frameElement.querySelectorAll('svg path,svg line,svg rect,svg circle,svg ellipse,svg polyline,svg polygon')].filter(node=>(node.closest('[data-series]')||node.hasAttribute('data-chart-mark'))&&!node.closest('defs,clipPath,mask,pattern')).map(node=>({...((outputTimesPlot?.contains(node))?{plotTransform:outputTimesTransform(node)}:{}),displayed:node.checkVisibility({visibilityProperty:true,opacityProperty:true}),effectiveOpacity:(()=>{let opacity=1;for(let parent:Element|null=node;parent;parent=parent.parentElement){opacity*=Number(getComputedStyle(parent).opacity);if(parent===frameElement)break;}return opacity;})(),tag:node.tagName.toLowerCase(),seriesId:node.closest('[data-series]')?.getAttribute('data-series')??null,testId:node.getAttribute('data-testid')??'',id:node.id,...(node.parentElement?.closest('[data-testid]')?{ownerTestId:node.parentElement.closest('[data-testid]')!.getAttribute('data-testid')!}:{}),...(node.closest('[data-overview-cell]')?{overviewCell:node.closest('[data-overview-cell]')!.getAttribute('data-overview-cell')!}:{}),attrs:Object.fromEntries(['x','y','x1','y1','x2','y2','cx','cy','r','rx','ry','width','height','d','points','transform','class','opacity','fill-opacity','fill','stroke','data-chart-role','data-chart-mark','data-lit-tile','data-method-dot'].flatMap(attribute=>node.hasAttribute(attribute)?[[attribute,node.getAttribute(attribute)!]]:[])),viewBox:node.closest('svg')?.getAttribute('viewBox')??''})),
      svgTexts:[...frameElement.querySelectorAll('svg text')].filter(node=>!node.closest('defs,clipPath,mask,pattern')).map(node=>{const coordinate=(name:string)=>{const value=node.getAttribute(name);return value!==null&&Number.isFinite(Number(value))?Number(value):null;};const paintFailures=textPaintFailures(node);return {painted:paintFailures.length===0,paintFailures,seriesId:node.closest('[data-series]')?.getAttribute('data-series')??null,dy:node.getAttribute('dy'),...(node.parentElement?.closest('[data-testid]')?{ownerTestId:node.parentElement.closest('[data-testid]')!.getAttribute('data-testid')!}:{}),...(node.closest('[data-overview-cell]')?{overviewCell:node.closest('[data-overview-cell]')!.getAttribute('data-overview-cell')!}:{}),text:(node.textContent??'').replace(/\s+/g,' ').trim(),x:coordinate('x'),y:coordinate('y'),testId:node.getAttribute('data-testid')??''};}),
      htmlMarks:[...frameElement.querySelectorAll<HTMLElement>('[data-chart-mark]')].filter(node=>!node.closest('svg')).map(node=>{const rect=(element:Element)=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};return {seriesId:node.closest('[data-series]')?.getAttribute('data-series')??null,ownerTestId:node.closest('[data-testid]')?.getAttribute('data-testid')??'',tag:node.getAttribute('data-chart-mark')??'',box:rect(node),parentBox:rect(node.parentElement!),widthStyle:node.style.width,opacity:Number(getComputedStyle(node).opacity)};}),
      methodCards:[...frameElement.querySelectorAll('[data-method-card]')].map(node=>{const paintFailures=textPaintFailures(node);return {id:node.getAttribute('data-method-card')!,text:(node.textContent??'').replace(/\s+/g,' ').trim(),paintFailures,visible:paintFailures.length===0&&node.checkVisibility({visibilityProperty:true,opacityProperty:true})&&node.getClientRects().length>0&&!node.closest('[aria-hidden=true],[inert]')};}),
      declaredBindings:[frameElement,...frameElement.querySelectorAll('*')].flatMap(node=>{const attributes=Object.fromEntries([...node.attributes].filter(attribute=>/^data-(?:source|assumption)(?:-|$)/.test(attribute.name)).map(attribute=>[attribute.name,attribute.value]));return Object.keys(attributes).length?[{element:node.tagName.toLowerCase()+(node.id?'#'+node.id:''),attributes}]:[];}),
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
