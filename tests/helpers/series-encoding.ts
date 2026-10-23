import {
  geometryClassOf,
  labelledSeriesIds,
  nonColourDistinct,
  seriesLabelNames,
  type MarkGeometry,
  type MarkObservation,
  type SeriesLabelEvidence,
} from '@/lib/brand-v2-interactive-data';

/**
 * The series evidence the interactive-data gate collects in a browser
 * (tests/e2e/brand-v2-interactive-data.spec.ts, VAL-B2-VIZ-002/004), read in
 * jsdom from the rendered SVG attributes. jsdom resolves no SVG
 * presentation attributes into computed style, so fill and dash are read
 * from the mark or the nearest ancestor that sets them, the way the
 * browser inherits them, and an unset fill is the SVG default (black, so
 * filled). The figure kit's `data-dashed` and `data-dotted` lines are
 * read as dashed, because components/iso/iso.css draws them that way.
 *
 * A series is labelled only by visible text that names it: text tied to it
 * by `data-series-label-for`, or a legend entry whose `data-legend-series`
 * names it, judged by the same rule as the browser (`seriesLabelNames`).
 * jsdom lays nothing out, so here visibility is read from the markup
 * (aria-hidden, hidden, sr-only, display, visibility, opacity, an unpainted
 * or zero-size text); the browser gate also measures each run's box against
 * the frame.
 */
const SHAPES = 'line, path, polyline, polygon, rect, circle, ellipse';

export type SeriesEncoding = {
  geometries: MarkGeometry[];
  labelled: boolean;
  pattern: boolean;
  marks: number;
};

function inherited(el: Element, attribute: string, property: string): string | null {
  for (let node: Element | null = el; node && node.tagName.toLowerCase() !== 'foreignobject'; node = node.parentElement) {
    const value =
      node.getAttribute(attribute) ??
      ((node as SVGElement).style?.getPropertyValue(property) || null);
    if (value !== null && value !== '') return value;
    if (node.tagName.toLowerCase() === 'svg') break;
  }
  return null;
}

function isPaint(value: string | null): boolean {
  if (value === null) return true;
  const trimmed = value.trim();
  return trimmed !== 'none' && trimmed !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(trimmed);
}

function styleOf(node: Element, attribute: string, property: string): string | null {
  return node.getAttribute(attribute) ?? ((node as HTMLElement).style?.getPropertyValue(property) || null);
}

/** Why a rendered run inside `el` cannot be seen, read from the markup up to `root`. */
function hiddenBy(el: Element, root: ParentNode): string | null {
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (node.getAttribute('aria-hidden') === 'true') return 'aria-hidden';
    if (node.hasAttribute('hidden')) return 'hidden';
    if (node.classList.contains('sr-only')) return 'screen-reader only';
    if (styleOf(node, 'display', 'display') === 'none') return 'not displayed';
    const opacity = styleOf(node, 'opacity', 'opacity');
    if (opacity !== null && Number(opacity) === 0) return 'opacity 0';
    if (node === root) break;
  }
  const visibility = inherited(el, 'visibility', 'visibility');
  if (visibility === 'hidden' || visibility === 'collapse') return 'visibility hidden';
  return null;
}

function unrendered(parent: Element): string | null {
  if (!parent.closest('svg')) return null;
  const size = inherited(parent, 'font-size', 'font-size');
  if (size !== null && parseFloat(size) === 0) return 'no box';
  const fill = inherited(parent, 'fill', 'fill');
  const stroke = inherited(parent, 'stroke', 'stroke');
  if (!isPaint(fill) && (stroke === null || !isPaint(stroke))) return 'unpainted';
  return null;
}

function readLabel(el: Element, root: ParentNode): Omit<SeriesLabelEvidence, 'seriesIds' | 'via'> {
  const runs: string[] = [];
  const hidden: string[] = [];
  let inPlot = true;
  const walker = el.ownerDocument.createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const parent = node.parentElement;
    if (!parent || parent.closest('title, desc, style, script, defs')) {
      hidden.push(`"${text}": not rendered`);
      continue;
    }
    const reason = hiddenBy(parent, root) ?? unrendered(parent);
    if (reason) {
      hidden.push(`"${text}": ${reason}`);
      continue;
    }
    runs.push(text);
    if (!parent.closest('svg')) inPlot = false;
  }
  return { visibleText: runs.join(' '), inPlot: runs.length > 0 && inPlot, hidden };
}

/** Every label that claims to name a series in `root`, with only its visible runs. */
export function seriesLabels(root: ParentNode): SeriesLabelEvidence[] {
  const labels: SeriesLabelEvidence[] = [];
  for (const el of Array.from(root.querySelectorAll('[data-series-label-for]'))) {
    const seriesIds = (el.getAttribute('data-series-label-for') ?? '').split(/\s+/).filter(Boolean);
    labels.push({ seriesIds, via: 'label-for', ...readLabel(el, root) });
  }
  for (const item of Array.from(root.querySelectorAll('[data-instrument-legend] [data-legend-item]'))) {
    const seriesId = item.getAttribute('data-legend-series');
    if (seriesId) labels.push({ seriesIds: [seriesId], via: 'legend', ...readLabel(item, root) });
  }
  return labels;
}

/** For each series a visible label names, the words that name it, in document order. */
export function seriesNames(root: ParentNode): Record<string, string[]> {
  const names: Record<string, string[]> = {};
  for (const label of seriesLabels(root)) {
    if (!seriesLabelNames(label)) continue;
    for (const id of label.seriesIds) (names[id] ??= []).push(label.visibleText);
  }
  return names;
}

export function seriesEncodings(root: ParentNode): Record<string, SeriesEncoding> {
  const series: Record<string, SeriesEncoding> = {};
  const inPlot = labelledSeriesIds(seriesLabels(root), 'label-for');
  for (const svg of Array.from(root.querySelectorAll('svg'))) {
    for (const holder of Array.from(svg.querySelectorAll('[data-series]'))) {
      const seriesId = holder.getAttribute('data-series');
      if (!seriesId) continue;
      const shapes = holder.matches(SHAPES) ? [holder] : Array.from(holder.querySelectorAll(SHAPES));
      if (shapes.length === 0) continue;
      const row = (series[seriesId] ??= { geometries: [], labelled: inPlot.has(seriesId), pattern: false, marks: 0 });
      for (const el of shapes) {
        const tag = el.tagName.toLowerCase();
        const fill = inherited(el, 'fill', 'fill');
        const dash =
          inherited(el, 'stroke-dasharray', 'stroke-dasharray') ??
          (el.matches('.iso-line[data-dashed], .iso-line[data-dotted]') ? 'iso-kit' : null);
        const geometry: MarkGeometry =
          tag === 'polygon'
            ? 'band'
            : geometryClassOf({ tag, dashed: Boolean(dash && dash !== 'none'), filled: isPaint(fill) });
        row.marks += 1;
        row.pattern ||= Boolean(fill?.startsWith('url('));
        if (!row.geometries.includes(geometry)) row.geometries.push(geometry);
      }
    }
  }
  return series;
}

/** The series a visible legend entry names. */
export function legendSeriesIds(root: ParentNode): string[] {
  return [...labelledSeriesIds(seriesLabels(root), 'legend')];
}

/**
 * Every series with neither a visible legend entry nor a visible in-plot
 * label, and every pair told apart by colour alone, as the browser gate
 * words them.
 */
export function seriesEncodingViolations(root: ParentNode): string[] {
  const series = seriesEncodings(root);
  const legend = new Set(legendSeriesIds(root));
  const violations: string[] = [];
  const ids = Object.keys(series);
  for (const id of ids) {
    if (!series[id].labelled && !legend.has(id)) {
      violations.push(`series "${id}" has neither a legend entry nor an in-plot label`);
    }
  }
  const observation = (id: string): MarkObservation => ({
    paint: series[id].pattern ? 'pattern' : 'neutral',
    geometries: series[id].geometries,
    labelled: series[id].labelled,
  });
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      if (!nonColourDistinct(observation(ids[i]), observation(ids[j]))) {
        violations.push(
          `"${ids[i]}" vs "${ids[j]}" share geometry [${series[ids[i]].geometries.join(', ')}] and neither carries an in-plot label`,
        );
      }
    }
  }
  return violations;
}
