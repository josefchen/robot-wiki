/**
 * Path resampling for the transform primitive.
 *
 * A transform morphs one shape into another by resampling both paths to the
 * same number of cubic Bezier segments distributed by arc length, aligning
 * their start points, and interpolating the control points. The object
 * keeps its identity: same React key, same colour role, unless the meaning
 * changes.
 */

export interface Point {
  x: number;
  y: number;
}

export interface CubicSegment {
  kind: 'C';
  from: Point;
  p1: Point;
  p2: Point;
  to: Point;
}

const NUMBER = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

function numbers(rest: string): number[] {
  return [...rest.matchAll(NUMBER)].map((m) => Number.parseFloat(m[0]));
}

export function toPathData(segments: CubicSegment[]): string {
  return [
    `M ${fmt(segments[0].from.x)} ${fmt(segments[0].from.y)}`,
    ...segments.map(segmentPathData),
  ].join(' ');
}

/** One segment as path data, without the leading moveto. */
export function segmentPathData(segment: CubicSegment): string {
  return `C ${fmt(segment.p1.x)} ${fmt(segment.p1.y)} ${fmt(
    segment.p2.x,
  )} ${fmt(segment.p2.y)} ${fmt(segment.to.x)} ${fmt(segment.to.y)}`;
}

const fmt = (value: number): string =>
  Number.isFinite(value) ? String(Number(value.toFixed(3))) : '0';

function reflect(control: Point | null, origin: Point): Point {
  if (control === null) return origin;
  return { x: 2 * origin.x - control.x, y: 2 * origin.y - control.y };
}

/**
 * Parses path data into cubic segments. Supports M, L, H, V, C, S, Q, T, Z
 * in absolute and relative form. Arc commands are rejected: transform
 * resamples cubics, and ellipsePath already approximates ellipses exactly
 * the way transform needs.
 */
export function parsePath(d: string): CubicSegment[] {
  const segments: CubicSegment[] = [];
  const commands = d.match(/[a-zA-Z][^a-zA-Z]*/g) ?? [];
  let current: Point | null = null;
  let start: Point | null = null;
  let lastControl: Point | null = null;
  let lastWasQuadratic = false;

  const push = (
    p1: Point,
    p2: Point,
    to: Point,
    quadraticControl?: Point,
  ): void => {
    if (current === null) {
      throw new Error(
        'path data must begin with a moveto before any drawing command',
      );
    }
    segments.push({ kind: 'C', from: current, p1, p2, to });
    lastControl = quadraticControl ?? p2;
    current = to;
  };
  const pushQuadratic = (
    from: Point,
    control: Point,
    to: Point,
  ): void => {
    const p1 = {
      x: from.x + (2 / 3) * (control.x - from.x),
      y: from.y + (2 / 3) * (control.y - from.y),
    };
    const p2 = {
      x: to.x + (2 / 3) * (control.x - to.x),
      y: to.y + (2 / 3) * (control.y - to.y),
    };
    push(p1, p2, to, control);
  };

  for (const command of commands) {
    const letter = command[0];
    const args = numbers(command.slice(1));
    const relative = letter === letter.toLowerCase();
    const at = (): Point => {
      if (current === null) throw new Error('path data draws before moving');
      return current;
    };
    const resolve = (x: number, y: number): Point =>
      relative ? { x: at().x + x, y: at().y + y } : { x, y };
    switch (letter.toLowerCase()) {
      case 'm': {
        for (let i = 0; i + 1 < args.length; i += 2) {
          const target = resolve(args[i], args[i + 1]);
          current = target;
          if (start === null) start = target;
        }
        lastWasQuadratic = false;
        break;
      }
      case 'l': {
        for (let i = 0; i + 1 < args.length; i += 2) {
          const target = resolve(args[i], args[i + 1]);
          const from = at();
          push(from, target, target);
        }
        lastWasQuadratic = false;
        break;
      }
      case 'h': {
        for (const x of args) {
          const target = relative
            ? { x: at().x + x, y: at().y }
            : { x, y: at().y };
          const from = at();
          push(from, target, target);
        }
        lastWasQuadratic = false;
        break;
      }
      case 'v': {
        for (const y of args) {
          const target = relative
            ? { x: at().x, y: at().y + y }
            : { x: at().x, y };
          const from = at();
          push(from, target, target);
        }
        lastWasQuadratic = false;
        break;
      }
      case 'c': {
        for (let i = 0; i + 5 < args.length; i += 6) {
          const p1 = resolve(args[i], args[i + 1]);
          const p2 = resolve(args[i + 2], args[i + 3]);
          const to = resolve(args[i + 4], args[i + 5]);
          push(p1, p2, to);
        }
        lastWasQuadratic = false;
        break;
      }
      case 's': {
        for (let i = 0; i + 3 < args.length; i += 4) {
          const from = at();
          // S reflects the previous command's control: the quadratic
          // control after Q/T (pushQuadratic stores it), else the previous
          // cubic's second control.
          const p1 = reflect(lastControl, from);
          const p2 = resolve(args[i], args[i + 1]);
          const to = resolve(args[i + 2], args[i + 3]);
          push(p1, p2, to);
        }
        lastWasQuadratic = false;
        break;
      }
      case 'q': {
        for (let i = 0; i + 3 < args.length; i += 4) {
          const control = resolve(args[i], args[i + 1]);
          const to = resolve(args[i + 2], args[i + 3]);
          pushQuadratic(at(), control, to);
        }
        lastWasQuadratic = true;
        break;
      }
      case 't': {
        for (let i = 0; i + 1 < args.length; i += 2) {
          const from = at();
          const control = lastWasQuadratic
            ? reflect(lastControl, from)
            : from;
          const to = resolve(args[i], args[i + 1]);
          pushQuadratic(from, control, to);
        }
        lastWasQuadratic = true;
        break;
      }
      case 'a':
        throw new Error(
          'arc commands are not supported by transform; approximate arcs with cubics (ellipsePath does)',
        );
      case 'z': {
        if (start !== null && current !== null) {
          const from = at();
          if (
            Math.abs(from.x - start.x) > 1e-9 ||
            Math.abs(from.y - start.y) > 1e-9
          ) {
            push(from, start, start);
          }
          current = start;
        }
        break;
      }
      default:
        throw new Error(`unsupported path command: ${letter}`);
    }
  }
  if (segments.length === 0) {
    throw new Error('path data contains no drawable segments');
  }
  return segments;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function cubicAt(segment: CubicSegment, t: number): Point {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return {
    x:
      w0 * segment.from.x +
      w1 * segment.p1.x +
      w2 * segment.p2.x +
      w3 * segment.to.x,
    y:
      w0 * segment.from.y +
      w1 * segment.p1.y +
      w2 * segment.p2.y +
      w3 * segment.to.y,
  };
}

/** Dense polyline approximation used only to measure arc length. */
function samplePolyline(segments: CubicSegment[], perSegment = 24): Point[] {
  const points: Point[] = [segments[0].from];
  for (const segment of segments) {
    for (let i = 1; i <= perSegment; i += 1) {
      points.push(cubicAt(segment, i / perSegment));
    }
  }
  return points;
}

export function pathLength(segments: CubicSegment[]): number {
  const polyline = samplePolyline(segments);
  let total = 0;
  for (let i = 1; i < polyline.length; i += 1) {
    total += distance(polyline[i - 1], polyline[i]);
  }
  return total;
}

/**
 * Resamples a path into exactly `count` cubic segments distributed by arc
 * length, estimating tangents from the arc-length parameterized polyline so
 * the resampled curve stays visually the same curve.
 */
export function resamplePath(
  segments: CubicSegment[],
  count: number,
): CubicSegment[] {
  const n = Math.max(1, Math.round(count));
  const samples = samplePolyline(segments);
  const cumulative: number[] = [0];
  for (let i = 1; i < samples.length; i += 1) {
    cumulative.push(cumulative[i - 1] + distance(samples[i - 1], samples[i]));
  }
  const total = cumulative[cumulative.length - 1];
  if (total <= 0) {
    // Degenerate path: hold the final point so the count contract holds.
    const result = segments.slice(0, n);
    while (result.length < n) {
      const last = result[result.length - 1];
      result.push({ kind: 'C', from: last.to, p1: last.to, p2: last.to, to: last.to });
    }
    return result;
  }

  const pointAt = (s: number): Point => {
    const target = Math.min(Math.max(s, 0), 1) * total;
    let i = 1;
    while (i < cumulative.length - 1 && cumulative[i] < target) i += 1;
    const span = cumulative[i] - cumulative[i - 1] || 1;
    const local = (target - cumulative[i - 1]) / span;
    const a = samples[i - 1];
    const b = samples[i];
    return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
  };
  const tangentAt = (s: number): Point => {
    const a = pointAt(Math.max(0, s - 0.01));
    const b = pointAt(Math.min(1, s + 0.01));
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const norm = Math.hypot(dx, dy) || 1;
    return { x: dx / norm, y: dy / norm };
  };

  const result: CubicSegment[] = [];
  for (let i = 0; i < n; i += 1) {
    const s0 = i / n;
    const s1 = (i + 1) / n;
    const from = pointAt(s0);
    const to = pointAt(s1);
    const t0 = tangentAt(s0);
    const t1 = tangentAt(s1);
    const chord = distance(from, to) / 3 || 1e-6;
    result.push({
      kind: 'C',
      from,
      p1: { x: from.x + t0.x * chord, y: from.y + t0.y * chord },
      p2: { x: to.x - t1.x * chord, y: to.y - t1.y * chord },
      to,
    });
  }
  return result;
}

/**
 * Rotates the second path's segments so both start at their nearest points.
 * Closed shapes otherwise morph through their interiors depending on where
 * each author happened to start drawing.
 */
export function alignStart(
  a: CubicSegment[],
  b: CubicSegment[],
): CubicSegment[] {
  const startA = a[0].from;
  const sampled = resamplePath(b, Math.max(b.length * 2, 64));
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < sampled.length; i += 1) {
    const d = distance(sampled[i].from, startA);
    if (d < bestDistance) {
      bestDistance = d;
      bestIndex = i;
    }
  }
  if (bestIndex === 0) return b;
  const head = sampled.slice(0, bestIndex);
  const tail = sampled.slice(bestIndex);
  const rotated = [...tail, ...head];
  // Close the loop back to the new start point, then drop the segment that
  // merely repeated the old start.
  const last = rotated[rotated.length - 1];
  const first = rotated[0];
  if (
    Math.abs(last.to.x - first.from.x) > 1e-6 ||
    Math.abs(last.to.y - first.from.y) > 1e-6
  ) {
    rotated.push({
      kind: 'C',
      from: last.to,
      p1: last.to,
      p2: first.from,
      to: first.from,
    });
    rotated.shift();
  }
  return rotated;
}

// Exact at the endpoints so a transform at t = 0 or t = 1 is the source
// path bit-for-bit, not a float reconstruction of it.
const mix = (a: number, b: number, t: number): number =>
  t <= 0 ? a : t >= 1 ? b : a + (b - a) * t;

/**
 * Resamples both paths to `count` segments, aligns their starts, and
 * interpolates every control point. `t` is expected already eased.
 */
export function interpolatePaths(
  a: CubicSegment[],
  b: CubicSegment[],
  t: number,
  count = 32,
): CubicSegment[] {
  const left = resamplePath(a, count);
  const right = resamplePath(alignStart(a, b), count);
  return left.map((segment, i) => ({
    kind: 'C' as const,
    from: {
      x: mix(segment.from.x, right[i].from.x, t),
      y: mix(segment.from.y, right[i].from.y, t),
    },
    p1: {
      x: mix(segment.p1.x, right[i].p1.x, t),
      y: mix(segment.p1.y, right[i].p1.y, t),
    },
    p2: {
      x: mix(segment.p2.x, right[i].p2.x, t),
      y: mix(segment.p2.y, right[i].p2.y, t),
    },
    to: {
      x: mix(segment.to.x, right[i].to.x, t),
      y: mix(segment.to.y, right[i].to.y, t),
    },
  }));
}

/** A closed four-arc cubic approximation of an ellipse, as path data. */
export function ellipsePath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation = 0,
): string {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const p = (x: number, y: number): Point => ({
    x: cx + x * cos - y * sin,
    y: cy + x * sin + y * cos,
  });
  // k is the standard cubic-arc constant for a quarter circle.
  const k = 0.5522847498307936;
  const kx = rx * k;
  const ky = ry * k;
  return [
    `M ${fmt(p(rx, 0).x)} ${fmt(p(rx, 0).y)}`,
    `C ${fmt(p(rx, ky).x)} ${fmt(p(rx, ky).y)} ${fmt(p(rx - kx, ry).x)} ${fmt(
      p(rx - kx, ry).y,
    )} ${fmt(p(0, ry).x)} ${fmt(p(0, ry).y)}`,
    `C ${fmt(p(-kx, ry).x)} ${fmt(p(-kx, ry).y)} ${fmt(
      p(-rx, ry - ky).x,
    )} ${fmt(p(-rx, ry - ky).y)} ${fmt(p(-rx, 0).x)} ${fmt(p(-rx, 0).y)}`,
    `C ${fmt(p(-rx, -ky).x)} ${fmt(p(-rx, -ky).y)} ${fmt(
      p(-kx, -ry).x,
    )} ${fmt(p(-kx, -ry).y)} ${fmt(p(0, -ry).x)} ${fmt(p(0, -ry).y)}`,
    `C ${fmt(p(kx, -ry).x)} ${fmt(p(kx, -ry).y)} ${fmt(
      p(rx, -ry + ky).x,
    )} ${fmt(p(rx, -ry + ky).y)} ${fmt(p(rx, 0).x)} ${fmt(p(rx, 0).y)}`,
    'Z',
  ].join(' ');
}
