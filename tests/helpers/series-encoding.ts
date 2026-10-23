import {
  geometryClassOf,
  nonColourDistinct,
  type MarkGeometry,
  type MarkObservation,
} from '@/lib/brand-v2-interactive-data';

/**
 * The series evidence the interactive-data gate collects in a browser
 * (tests/e2e/brand-v2-interactive-data.spec.ts, VAL-B2-VIZ-002/004), read in
 * jsdom from the rendered SVG attributes. jsdom resolves no SVG
 * presentation attributes into computed style, so fill and dash are read
 * from the mark or the nearest ancestor that sets them, the way the
 * browser inherits them, and an unset fill is the SVG default (black, so
 * filled).
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

export function seriesEncodings(root: ParentNode): Record<string, SeriesEncoding> {
  const series: Record<string, SeriesEncoding> = {};
  for (const svg of Array.from(root.querySelectorAll('svg'))) {
    for (const holder of Array.from(svg.querySelectorAll('[data-series]'))) {
      const seriesId = holder.getAttribute('data-series');
      if (!seriesId) continue;
      const shapes = holder.matches(SHAPES) ? [holder] : Array.from(holder.querySelectorAll(SHAPES));
      if (shapes.length === 0) continue;
      const row = (series[seriesId] ??= { geometries: [], labelled: false, pattern: false, marks: 0 });
      const labelled = holder.hasAttribute('data-series-labelled') || Boolean(holder.querySelector('text'));
      for (const el of shapes) {
        const tag = el.tagName.toLowerCase();
        const fill = inherited(el, 'fill', 'fill');
        const dash = inherited(el, 'stroke-dasharray', 'stroke-dasharray');
        const geometry: MarkGeometry =
          tag === 'polygon'
            ? 'band'
            : geometryClassOf({ tag, dashed: Boolean(dash && dash !== 'none'), filled: isPaint(fill) });
        row.marks += 1;
        row.labelled ||= labelled;
        row.pattern ||= Boolean(fill?.startsWith('url('));
        if (!row.geometries.includes(geometry)) row.geometries.push(geometry);
      }
    }
  }
  return series;
}

export function legendSeriesIds(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll('[data-instrument-legend] [data-legend-item]'))
    .map((item) => item.getAttribute('data-legend-series'))
    .filter((id): id is string => Boolean(id));
}

/**
 * Every series with neither a legend entry nor an in-plot label, and every
 * pair told apart by colour alone, as the browser gate words them.
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
