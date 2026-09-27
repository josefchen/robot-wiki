'use client';

/**
 * The motion-language vocabulary as TS primitives.
 *
 * Each primitive is a pure function of scene time composed with SVG: a
 * progress selector (0..1 over the beat) drives stroke draws, morphs,
 * reveals and indications. Easing comes from the tokens (smooth), lag
 * ratios from the tokens, durations from the token ladder. Simulation
 * time stays linear: pass a raw progress selector for physics.
 */
import type { ReactNode, SVGProps } from 'react';
import { clamp01, smooth, thereAndBack } from './easing';
import {
  interpolatePaths,
  parsePath,
  toPathData,
  type CubicSegment,
} from './paths';
import { MOTION_LAG, MOTION_TIMING } from '@/lib/motion-tokens';
import {
  AnimatedElement,
  AnimatedGroup,
  AnimatedPath,
  type AnimatedBindings,
} from './animated';

export type Progress = (t: number) => number;

/**
 * The lagged-start progress of item i of count, given the group's overall
 * progress. Items complete one by one after the lag window; the ratio comes
 * from the tokens and tightens for dense groups.
 */
export function laggedProgress(
  progress: number,
  index: number,
  count: number,
  lag = count > MOTION_LAG.denseThreshold
    ? MOTION_LAG.dense
    : MOTION_LAG.default,
): number {
  if (count <= 1) return clamp01(progress);
  const span = 1 - lag;
  const local = (clamp01(progress) * count - index) / Math.max(1, count * span);
  return clamp01(local);
}

/**
 * create(path): the stroke draws on by pathLength, then the fill fades in
 * over the last 30% of the draw.
 */
export function Create({
  d,
  progress,
  roleVar,
  strokeWidth = 2,
  ...rest
}: {
  d: string;
  progress: Progress;
  /** CSS colour reference for the stroke, from the role tokens. */
  roleVar: string;
  strokeWidth?: number;
} & Omit<SVGProps<SVGPathElement>, 'd' | 'strokeWidth'>) {
  const bindings: AnimatedBindings = {
    strokeDashoffset: (t) => Number((1 - smooth(progress(t))).toFixed(4)),
    fillOpacity: (t) => {
      const draw = smooth(progress(t));
      const tail = MOTION_TIMING.createFillTail;
      return Number(clamp01((draw - (1 - tail)) / tail).toFixed(4));
    },
  };
  return (
    <AnimatedPath
      d={d}
      pathLength={1}
      strokeDasharray={1}
      stroke={roleVar}
      strokeWidth={strokeWidth}
      fill="none"
      bindings={bindings}
      {...rest}
    />
  );
}

/**
 * write(text | tex): glyph strokes draw on with LaggedStart, then their
 * fill arrives. Glyphs may carry a baseline shift and scale for
 * sub/superscripts, so equations keep real notation.
 */
export interface WriteGlyph {
  ch: string;
  /** Baseline shift in stage units; positive is down (subscript). */
  dy?: number;
  /** Font scale; 1 is the line size, about 0.72 for sub/superscripts. */
  scale?: number;
}

const GLYPH_ADVANCE = 0.62;

export function Write({
  text,
  x,
  y,
  fontSize,
  roleVar,
  progress,
  indicate,
}: {
  text: string | WriteGlyph[];
  x: number;
  y: number;
  fontSize: number;
  roleVar: string;
  progress: Progress;
  /** Pulse one glyph (by index) to the highlight role, out and back. */
  indicate?: { glyphIndex: number; progress: Progress };
} & Omit<SVGProps<SVGTextElement>, 'x' | 'y' | 'fontSize' | 'fontFamily'>) {
  const glyphs: WriteGlyph[] =
    typeof text === 'string' ? [...text].map((ch) => ({ ch })) : text;
  const lag = MOTION_LAG.default;
  const perGlyph = (index: number): Progress => (t) => {
    const p = clamp01(progress(t));
    const span = 1 - lag;
    return clamp01(
      (p * (1 + lag * (glyphs.length - 1)) - index * lag) / Math.max(span, 1e-6),
    );
  };
  // Left edge of each glyph, accumulated without mutating render state.
  const lefts = glyphs.reduce<number[]>((edges, glyph) => {
    const previous = edges.length === 0 ? 0 : edges[edges.length - 1];
    return [...edges, previous + fontSize * GLYPH_ADVANCE * (glyph.scale ?? 1)];
  }, []);
  const placed = glyphs.map((glyph, index) => ({
    glyph,
    x: x + lefts[index],
    y: y + (glyph.dy ?? 0),
    size: fontSize * (glyph.scale ?? 1),
  }));
  return (
    <g fontFamily="var(--motion-stage-label-font)">
      {placed.map(({ glyph, x: glyphX, y: glyphY, size }, index) => {
        const reveal = perGlyph(index);
        const indicated = indicate !== undefined && indicate.glyphIndex === index;
        return (
          <AnimatedElement
            as="text"
            key={`${index}-${glyph.ch}`}
            x={glyphX}
            y={glyphY}
            fontSize={size}
            bindings={{
              fillOpacity: (t) => Number(smooth(reveal(t)).toFixed(3)),
              fill: indicated
                ? (t) =>
                    thereAndBack(indicate.progress(t)) > 0.15
                      ? 'var(--role-highlight-stage)'
                      : roleVar
                : () => roleVar,
            }}
          >
            {glyph.ch}
          </AnimatedElement>
        );
      })}
    </g>
  );
}

/**
 * transform(a, b): resamples both paths to the same number of cubic
 * segments, aligns their start points, and interpolates. The object keeps
 * its identity: the caller preserves the React key and the colour role.
 */
export function Transform({
  from,
  to,
  progress,
  segments = 32,
  ...rest
}: {
  from: string;
  to: string;
  progress: Progress;
  segments?: number;
} & Omit<SVGProps<SVGPathElement>, 'd'>) {
  const a = parsePath(from);
  const b = parsePath(to);
  const bindings: AnimatedBindings = {
    d: (t) => toPathData(interpolatePaths(a, b, smooth(progress(t)), segments)),
  };
  return <AnimatedPath bindings={bindings} {...rest} />;
}

/**
 * indicate(el): scale to 1.2 and switch to the highlight role, eased out
 * and back. The caller wraps the indicated element; the non-colour cue is
 * the thicker stroke that rises and falls with the same curve.
 */
export function Indicate({
  cx,
  cy,
  progress,
  children,
  ...rest
}: {
  cx: number;
  cy: number;
  progress: Progress;
  children: ReactNode;
} & Omit<SVGProps<SVGGElement>, 'transform'>) {
  const bindings: AnimatedBindings = {
    transform: (t) => {
      const pulse = thereAndBack(progress(t));
      const scale = 1 + 0.2 * pulse;
      return `translate(${cx} ${cy}) scale(${scale.toFixed(4)}) translate(${-cx} ${-cy})`;
    },
    stroke: (t) =>
      thereAndBack(progress(t)) > 0.15 ? 'var(--role-highlight-stage)' : 'none',
  };
  return (
    <AnimatedGroup fill="none" bindings={bindings} {...rest}>
      {children}
    </AnimatedGroup>
  );
}

/**
 * fadeIn / fadeOut: opacity plus a shift of at most 8% of the stage.
 * direction is the unit shift vector; magnitude is scaled by progress.
 */
export function Fade({
  progress,
  shift = [0, -1] as readonly [number, number],
  stageWidth = 340,
  stageHeight = 240,
  mode = 'in',
  children,
  ...rest
}: {
  progress: Progress;
  /** Unit shift vector for the move; magnitude is capped at 8%. */
  shift?: readonly [number, number];
  stageWidth?: number;
  stageHeight?: number;
  mode?: 'in' | 'out';
  children: ReactNode;
} & Omit<SVGProps<SVGGElement>, 'opacity' | 'transform'>) {
  const shiftMax = 0.08;
  const span = Math.hypot(stageWidth, stageHeight) * shiftMax;
  const norm = Math.hypot(shift[0], shift[1]) || 1;
  const dx = (shift[0] / norm) * span;
  const dy = (shift[1] / norm) * span;
  const bindings: AnimatedBindings = {
    opacity: (t) => {
      const p = smooth(progress(t));
      return Number((mode === 'in' ? p : 1 - p).toFixed(3));
    },
    transform: (t) => {
      const p = smooth(progress(t));
      const shift = mode === 'in' ? 1 - p : p;
      return `translate(${(dx * shift).toFixed(2)} ${(dy * shift).toFixed(2)})`;
    },
  };
  return (
    <AnimatedGroup bindings={bindings} {...rest}>
      {children}
    </AnimatedGroup>
  );
}

/**
 * focus(bbox): camera pan and zoom to a region, bounded by the token's
 * maximum zoom. Use it sparingly; the stage never scrolls.
 */
export function focusViewBox(
  base: { x: number; y: number; width: number; height: number },
  target: { x: number; y: number; width: number; height: number },
  progress: number,
  maxZoom = 2.5,
): string {
  const p = smooth(clamp01(progress));
  const zoom = 1 + (maxZoom - 1) * p;
  const cx =
    base.x + base.width / 2 + (target.x + target.width / 2 - base.x - base.width / 2) * p;
  const cy =
    base.y + base.height / 2 + (target.y + target.height / 2 - base.y - base.height / 2) * p;
  const width = base.width / zoom;
  const height = base.height / zoom;
  return `${(cx - width / 2).toFixed(2)} ${(cy - height / 2).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;
}

/**
 * transformMatchingTex(a, b): match glyphs by id. Matched glyphs move to
 * their counterparts; unmatched ones fade out or in. Pure geometry, so the
 * caller stays in charge of rendering.
 */
export interface TexGlyph {
  id: string;
  x: number;
  y: number;
}

export function transformMatchingTex(
  a: readonly TexGlyph[],
  b: readonly TexGlyph[],
): {
  matched: Array<{ id: string; from: TexGlyph; to: TexGlyph }>;
  fadeOut: TexGlyph[];
  fadeIn: TexGlyph[];
} {
  const byId = new Map(b.map((glyph) => [glyph.id, glyph]));
  const matched: Array<{ id: string; from: TexGlyph; to: TexGlyph }> = [];
  const fadeOut: TexGlyph[] = [];
  const consumed = new Set<string>();
  for (const glyph of a) {
    const to = byId.get(glyph.id);
    if (to) {
      matched.push({ id: glyph.id, from: glyph, to });
      consumed.add(glyph.id);
    } else {
      fadeOut.push(glyph);
    }
  }
  const fadeIn = b.filter((glyph) => !consumed.has(glyph.id));
  return { matched, fadeOut, fadeIn };
}

/** Cubic segment passthrough for scenes that compose transforms by hand. */
export type { CubicSegment };
export { interpolatePaths, parsePath, toPathData };
