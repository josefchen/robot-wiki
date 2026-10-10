'use client';

/**
 * Kalman filter, guess-measure-blend: the classical state-estimation
 * reference scene. One step of the seeded constant-velocity filter from
 * lib/kalman.ts (seed 1, matched beliefs sigma q 0.20, sigma r 1.00), drawn
 * along one line: a robot on a track and three bell curves for where it
 * might be. The robot's own guess (the predict step widens it), the sensor's
 * reading, and the blend the update makes of them, narrower than both and
 * the gain's fraction of the way toward the reading. During the blend the
 * camera closes in on the gap between the guess and the reading, where the
 * blend lands, and pulls back; the next beat writes the same step in the
 * filter's own numbers and turns them, glyph by glyph, into the update rule.
 * The camera is home at every beat end and the symbols leave before the
 * finished frame, so the poster is that frame. Position only; the velocity
 * half of the state is reported in the method fold. The curves are drawn to
 * scale from the real filter numbers.
 */
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { AnimatedElement, AnimatedGroup } from '@/components/motion/animated';
import { focusViewBox, laggedProgress, transformMatchingTex, type TexGlyph } from '@/components/motion/primitives';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { clamp01, smooth } from '@/components/motion/easing';
import {
  DEFAULT_SEED,
  DEFAULT_SETTINGS,
  generateEpisode,
  stepDetail,
  type Cov2,
  type KalmanStepDetail,
} from '@/lib/kalman';
import { KALMAN_GLYPHS, SCENE_EQUATIONS } from '@/lib/motion-equations';
import { MOTION_CAMERA, MOTION_UNCERTAINTY } from '@/lib/motion-tokens';

/** The demonstrated step: first measured step at or after t = 40, seed 1. */
const EPISODE = generateEpisode(DEFAULT_SEED);
const STEP = (() => {
  for (let t = 40; t < EPISODE.steps; t += 1) {
    if (EPISODE.measurements[t] !== null) return t;
  }
  return EPISODE.steps - 1;
})();
export const KALMAN_STEP_DETAIL: KalmanStepDetail = stepDetail(
  EPISODE,
  DEFAULT_SETTINGS,
  STEP,
);

/**
 * The seeded world uses Box-Muller, whose Math.log/Math.cos are not
 * bit-portable between the server runtime and the browser, so the filter's
 * doubles can differ by an ulp across the boundary and hydration would
 * flag a mismatch. Rounding the rendered numbers to nine decimals keeps
 * every displayed digit (the fold shows two) while making the server and
 * client agree exactly.
 */
const Q = (x: number): number => Number(x.toFixed(9));
const quantizeCov = (cov: Cov2): Cov2 => ({ p00: Q(cov.p00), p01: Q(cov.p01), p11: Q(cov.p11) });
const DETAIL: KalmanStepDetail = {
  t: KALMAN_STEP_DETAIL.t,
  prior: {
    mean: [Q(KALMAN_STEP_DETAIL.prior.mean[0]), Q(KALMAN_STEP_DETAIL.prior.mean[1])],
    cov: quantizeCov(KALMAN_STEP_DETAIL.prior.cov),
  },
  predicted: {
    mean: [Q(KALMAN_STEP_DETAIL.predicted.mean[0]), Q(KALMAN_STEP_DETAIL.predicted.mean[1])],
    cov: quantizeCov(KALMAN_STEP_DETAIL.predicted.cov),
  },
  measurement: KALMAN_STEP_DETAIL.measurement === null ? null : Q(KALMAN_STEP_DETAIL.measurement),
  posterior: {
    mean: [Q(KALMAN_STEP_DETAIL.posterior.mean[0]), Q(KALMAN_STEP_DETAIL.posterior.mean[1])],
    cov: quantizeCov(KALMAN_STEP_DETAIL.posterior.cov),
  },
  gain: Q(KALMAN_STEP_DETAIL.gain),
};

/** One bell curve over position: its centre and its spread. */
export interface Bump {
  mean: number;
  sigma: number;
}
const PRIOR: Bump = { mean: DETAIL.prior.mean[0], sigma: Q(Math.sqrt(DETAIL.prior.cov.p00)) };
const GUESS: Bump = { mean: DETAIL.predicted.mean[0], sigma: Q(Math.sqrt(DETAIL.predicted.cov.p00)) };
const READING: Bump = { mean: DETAIL.measurement as number, sigma: DEFAULT_SETTINGS.sigmaR };
const BLEND: Bump = { mean: DETAIL.posterior.mean[0], sigma: Q(Math.sqrt(DETAIL.posterior.cov.p00)) };
const GAIN = DETAIL.gain;
const GAIN_PERCENT = Math.round(GAIN * 100);
/** The four bells, exported for the tests that pin them to the filter. */
export const KALMAN_BUMPS = { prior: PRIOR, guess: GUESS, reading: READING, blend: BLEND } as const;

const SCENE: SceneDefinition = {
  id: 'kalman-predict-update',
  title: 'Kalman filter: guess, measure, blend',
  kicker: 'Kalman filter',
  headline: 'Blend a guess and a noisy reading: sharper than either',
  beats: [
    {
      id: 'guess',
      duration: 'long',
      caption:
        'Guess: from where it was and how fast it was going, the robot predicts where it is now, and the guess spreads out.',
    },
    {
      id: 'measure',
      caption:
        'Measure: a sensor also reports the position, but it is noisy, so the reading could be off in either direction.',
    },
    {
      id: 'blend',
      duration: 'long',
      caption:
        'Blend: the robot mixes guess and reading, trusting the less spread-out one more, and the blend is narrower than either.',
    },
    {
      id: 'in-symbols',
      duration: 'long',
      caption:
        'The same step in numbers, then in symbols: the blend is the guess plus a share K of the gap to the reading z.',
    },
    {
      id: 'recap',
      caption:
        'A robot never knows exactly where it is, so it keeps mixing its own prediction with each new sensor reading.',
    },
  ],
};
/** The scene definition, exported for the player-level tests. */
export const KALMAN_SCENE = SCENE;
const SPANS = beatSpans(SCENE.beats);
const [GUESS_BEAT, MEASURE_BEAT, BLEND_BEAT, SYMBOLS_BEAT, RECAP_BEAT] = SPANS.map((_, index) => index);

const beatProgress = (index: number) => (t: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const mixBump = (a: Bump, b: Bump, k: number): Bump => ({
  mean: mix(a.mean, b.mean, k),
  sigma: mix(a.sigma, b.sigma, k),
});
const r2 = (value: number) => Number(value.toFixed(2));
const r3 = (value: number) => Number(value.toFixed(3));

/**
 * Within the blend beat: the labels step aside by 10%, the camera is in by
 * 30%, holds to 60% and is home by 85%; only then do the labels return.
 * Labels sit at stage positions while the bells scale, so neither may move
 * while the other is on stage.
 */
const CAMERA = { inStart: 0.1, inEnd: 0.3, outStart: 0.6, outEnd: 0.85 } as const;

/**
 * How far the camera has closed in on the gap between the guess and the
 * reading, 0 (home) to 1. It moves only inside the blend beat and is home
 * at every beat end.
 */
export function kalmanCameraAt(t: number): number {
  if (t <= SPANS[BLEND_BEAT].start || t >= SPANS[BLEND_BEAT].end) return 0;
  const k = beatProgress(BLEND_BEAT)(t);
  if (k < CAMERA.inStart) return 0;
  if (k < CAMERA.inEnd) return (k - CAMERA.inStart) / (CAMERA.inEnd - CAMERA.inStart);
  if (k < CAMERA.outStart) return 1;
  return clamp01((CAMERA.outEnd - k) / (CAMERA.outEnd - CAMERA.outStart));
}

/** Labels pinned to stage positions step aside while the camera is away. */
function labelShare(t: number): number {
  if (t <= SPANS[BLEND_BEAT].start || t >= SPANS[BLEND_BEAT].end) return 1;
  const k = beatProgress(BLEND_BEAT)(t);
  if (k < 0.5) return r2(1 - smooth(clamp01(k / CAMERA.inStart)));
  return r2(smooth(clamp01((k - CAMERA.outEnd) / (1 - CAMERA.outEnd))));
}

/**
 * The whole scene as a pure function of scene time: the robot's guess
 * (the prior widening into the prediction), the reading rising out of the
 * track, the blend (the guess sliding and sharpening toward the reading
 * while the camera holds on the gap), where the robot is drawn, and how far
 * each later element has faded in. Tests pin this determinism.
 */
export function kalmanFrameAt(t: number) {
  const guessing = smooth(beatProgress(GUESS_BEAT)(t));
  const measure = beatProgress(MEASURE_BEAT)(t);
  const blendBeat = beatProgress(BLEND_BEAT)(t);
  const blending = smooth(clamp01((blendBeat - CAMERA.inEnd) / (CAMERA.outStart - CAMERA.inEnd)));
  const recap = beatProgress(RECAP_BEAT)(t);
  const guess = mixBump(PRIOR, GUESS, guessing);
  const blend = mixBump(GUESS, BLEND, blending);
  const labels = labelShare(t);
  return {
    guess,
    blend,
    robot: t < SPANS[BLEND_BEAT].start ? guess.mean : blend.mean,
    /** The reading's bell rises out of the track, then its label follows, one lag apart. */
    rise: r3(smooth(laggedProgress(measure, 0, 2))),
    sensor: r3(smooth(laggedProgress(measure, 1, 2)) * labels),
    guessLabel: labels,
    /** The blend starts as an exact copy of the guess, so it can appear at full ink. */
    blendShown: r3(smooth(clamp01((blendBeat - 0.2) / 0.1))),
    blendLabel: r3(smooth(clamp01((blendBeat - CAMERA.outEnd) / (1 - CAMERA.outEnd)))),
    /** The bracket from the guess to the reading draws while the camera closes in. */
    bracket: r3(smooth(clamp01((blendBeat - CAMERA.inStart) / (CAMERA.inEnd - CAMERA.inStart)))),
    /** The guess and the reading step back once the camera has let go of the blend. */
    settled: r3(smooth(clamp01((blendBeat - CAMERA.outStart) / (CAMERA.outEnd - CAMERA.outStart)))),
    annotation: r3(smooth(clamp01((recap - 0.3) / 0.5))),
  };
}

/*
 * Stage geometry. Text paints at 14 CSS px at every width, so at the
 * narrowest stage (299 px) a label is about 16 view units tall and "the
 * sensor says" about 130 wide; the two label rows sit above every bell's
 * box and the annotation sits under the bracket at that size too.
 */
const WIDTH = 340;
const HEIGHT = 226;
const FONT = 14;
const PLOT_LEFT = 14;
const PLOT_RIGHT = 326;
/** Wide enough for every bell out to about two and a half spreads. */
const X_MIN = -2.9;
const X_MAX = 3.1;
const ROW_ONE = 24;
const ROW_TWO = 46;
/** The line the bells stand on, the rail the robot rides, the bracket. */
const BASE = 140;
const RAIL = 170;
const BRACKET = 186;
const NOTE_Y = 212;
/**
 * The note centres a little left of the bracket's middle: at the narrowest
 * stage its one line is about 300 units wide and must clear both edges.
 */
const NOTE_X = 172;
/** The blend's peak height; every bell keeps the same area, so a narrower one stands taller. */
const PEAK = 84;
const SEGMENTS = 48;

const fade = (value: number) => Number(value.toFixed(3));
const xScale = (v: number) => PLOT_LEFT + ((v - X_MIN) / (X_MAX - X_MIN)) * (PLOT_RIGHT - PLOT_LEFT);
/** Height of a bell above its base line, in view units, at position v. */
export const bumpHeight = (bump: Bump, v: number) =>
  PEAK * (BLEND.sigma / bump.sigma) * Math.exp(-((v - bump.mean) ** 2) / (2 * bump.sigma ** 2));
const curveY = (bump: Bump, x: number) =>
  BASE - bumpHeight(bump, X_MIN + ((x - PLOT_LEFT) / (PLOT_RIGHT - PLOT_LEFT)) * (X_MAX - X_MIN));

/** A bell's outline; `lift` scales its height, so a bell can rise out of its base line. */
function bumpPoints(bump: Bump, lift = 1): Array<[number, number]> {
  const lo = Math.max(bump.mean - 2.5 * bump.sigma, X_MIN);
  const hi = Math.min(bump.mean + 2.5 * bump.sigma, X_MAX);
  return Array.from({ length: SEGMENTS + 1 }, (_, index) => {
    const v = lo + ((hi - lo) * index) / SEGMENTS;
    return [r2(xScale(v)), r2(BASE - lift * bumpHeight(bump, v))];
  });
}
const curvePath = (bump: Bump, lift = 1) =>
  `M${bumpPoints(bump, lift).map(([x, y]) => `${x} ${y}`).join(' L')}`;
function areaPath(bump: Bump, lift = 1) {
  const points = bumpPoints(bump, lift);
  return `${curvePath(bump, lift)} L${points[points.length - 1][0]} ${BASE} L${points[0][0]} ${BASE} Z`;
}

const X_GUESS = r2(xScale(GUESS.mean));
const X_READING = r2(xScale(READING.mean));
const X_BLEND = r2(xScale(BLEND.mean));

/**
 * The camera window stays 6 units inside the stage, so a mark it cuts keeps
 * the 4 px margin on stages drawn narrower than 1:1.
 */
const WINDOW_INSET = 6;
export const CAMERA_WINDOW = {
  x: WINDOW_INSET,
  y: WINDOW_INSET,
  width: WIDTH - 2 * WINDOW_INSET,
  height: HEIGHT - 2 * WINDOW_INSET,
} as const;
/**
 * The detail the camera closes in on: the three peaks over the gap from the
 * guess to the reading, from the blend's final peak down to the bracket, so
 * the reader watches the blend climb and slide while the point rides the bracket.
 */
export const FOCUS_BOX = (() => {
  const pad = 30;
  const top = BASE - PEAK - 4;
  return { x: X_GUESS - pad, y: top, width: X_READING - X_GUESS + 2 * pad, height: BRACKET + 6 - top };
})();
/** As close as the camera window still holds the whole focus box, never past the token. */
export const FOCUS_ZOOM = Math.min(
  MOTION_CAMERA.focusMaxZoom,
  CAMERA_WINDOW.width / FOCUS_BOX.width,
  CAMERA_WINDOW.height / FOCUS_BOX.height,
);

/** The camera as a transform on the track layer, eased by focusViewBox. */
export function kalmanCameraTransform(t: number): string {
  const share = kalmanCameraAt(t);
  if (share === 0) return 'translate(0 0) scale(1)';
  const [x, y, width] = focusViewBox({ x: 0, y: 0, width: WIDTH, height: HEIGHT }, FOCUS_BOX, share, FOCUS_ZOOM)
    .split(' ')
    .map(Number);
  const scale = WIDTH / width;
  return `translate(${r2(-x * scale)} ${r2(-y * scale)}) scale(${r3(scale)})`;
}

const fixed = (value: number) => value.toFixed(2);
/** The worked step's numbers as the stage writes them; tests pin them to the filter. */
export const KALMAN_WORKED_NUMBERS = {
  blend: fixed(BLEND.mean),
  guess: fixed(GUESS.mean),
  gain: fixed(GAIN),
  reading: fixed(READING.mean),
} as const;

type GlyphName =
  | 'kalmanBlend' | 'kalmanGuess' | 'kalmanGain' | 'kalmanReading'
  | 'equals' | 'plus' | 'minus' | 'lparen' | 'rparen' | 'xhat' | 'xprior' | 'gain' | 'z';
/** A number such as 0.52: three KaTeX Main digits and a point. */
const NUMBER_EM = 3 * 0.5 + 0.27778;
/**
 * Advance widths in em, from KaTeX's Main and Math-Italic metrics; an italic
 * letter carries its italic correction, and x̂⁻ adds the minus at script size
 * (0.7) plus KaTeX's script space.
 */
const GLYPH_EM: Record<GlyphName, number> = {
  kalmanBlend: NUMBER_EM,
  kalmanGuess: NUMBER_EM,
  kalmanGain: NUMBER_EM,
  kalmanReading: NUMBER_EM,
  equals: 0.77778,
  plus: 0.77778,
  minus: 0.77778,
  lparen: 0.38889,
  rparen: 0.38889,
  xhat: 0.57153,
  xprior: 0.57153 + 0.7 * 0.77778 + 0.05,
  gain: 0.84931 + 0.07153,
  z: 0.46505 + 0.04398,
};
/** KaTeX sets a relation between two thick spaces and a binary sign between two medium ones. */
const SPACE_EM: Partial<Record<GlyphName, number>> = { equals: 5 / 18, plus: 4 / 18, minus: 4 / 18 };
/** The stage's equation size: 16 px text at KaTeX's own 1.21 em. */
const GLYPH_PX = 16 * 1.21;
/** The formula row under the bracket; the recap note takes it once the symbols have left. */
const GLYPH_Y = 196;
const GLYPH_H = 24;
type Slot = { id: string; glyph: GlyphName };
const WORKED: Slot[] = [
  { id: 'blend', glyph: 'kalmanBlend' },
  { id: 'equals', glyph: 'equals' },
  { id: 'guess', glyph: 'kalmanGuess' },
  { id: 'plus', glyph: 'plus' },
  { id: 'gain', glyph: 'kalmanGain' },
  { id: 'open', glyph: 'lparen' },
  { id: 'reading', glyph: 'kalmanReading' },
  { id: 'minus', glyph: 'minus' },
  { id: 'guess-again', glyph: 'kalmanGuess' },
  { id: 'close', glyph: 'rparen' },
];
const GENERAL: Slot[] = [
  { id: 'estimate', glyph: 'xhat' },
  WORKED[1],
  { id: 'prediction', glyph: 'xprior' },
  WORKED[3],
  { id: 'gain-symbol', glyph: 'gain' },
  WORKED[5],
  { id: 'reading-symbol', glyph: 'z' },
  WORKED[7],
  { id: 'prediction-again', glyph: 'xprior' },
  WORKED[9],
];
const GLYPH_OF = new Map([...WORKED, ...GENERAL].map((slot) => [slot.id, slot.glyph]));

/** Glyph left edges, centred on the stage, spaced as KaTeX spaces them. */
function layoutGlyphs(slots: readonly Slot[]): TexGlyph[] {
  let cursor = 0;
  const lefts = slots.map(({ glyph }) => {
    cursor += SPACE_EM[glyph] ?? 0;
    const left = cursor;
    cursor += GLYPH_EM[glyph] + (SPACE_EM[glyph] ?? 0);
    return left;
  });
  const start = WIDTH / 2 - (cursor * GLYPH_PX) / 2;
  return slots.map((slot, index) => ({ id: slot.id, x: start + lefts[index] * GLYPH_PX, y: GLYPH_Y }));
}
const MORPH = transformMatchingTex(layoutGlyphs(WORKED), layoutGlyphs(GENERAL));

/** The formula is written in the symbols beat and leaves early in the recap. */
function formulaShare(t: number): number {
  if (t <= SPANS[SYMBOLS_BEAT].start) return 0;
  if (t <= SPANS[SYMBOLS_BEAT].end) return 1;
  return r2(1 - smooth(clamp01(beatProgress(RECAP_BEAT)(t) / 0.3)));
}

/**
 * Every glyph of the formula at scene time t. The worked step is written
 * left to right, one lag apart; its numbers leave, the shared signs slide
 * to their places in the general rule, and the symbols arrive one lag apart
 * where the numbers stood. Phases never overlap, so no two glyphs share
 * ink. Tests pin this.
 */
export function kalmanGlyphsAt(t: number) {
  const progress = beatProgress(SYMBOLS_BEAT)(t);
  const shown = formulaShare(t);
  const write = clamp01(progress / 0.25);
  const leave = clamp01((progress - 0.4) / 0.15);
  const slide = smooth(clamp01((progress - 0.55) / 0.2));
  const arrive = clamp01((progress - 0.75) / 0.2);
  const order = (id: string) => WORKED.findIndex((slot) => slot.id === id);
  const width = (id: string) => r2(GLYPH_EM[GLYPH_OF.get(id) as GlyphName] * GLYPH_PX);
  const written = (id: string) => smooth(laggedProgress(write, order(id), WORKED.length));
  return [
    ...MORPH.matched.map(({ id, from, to }) => ({
      id, glyph: GLYPH_OF.get(id) as GlyphName, x: r2(from.x + (to.x - from.x) * slide), width: width(id),
      opacity: r2(shown * written(id)), matched: true,
    })),
    ...MORPH.fadeOut.map(({ id, x }, index) => ({
      id, glyph: GLYPH_OF.get(id) as GlyphName, x: r2(x), width: width(id),
      opacity: r2(shown * written(id) * (1 - smooth(laggedProgress(leave, index, MORPH.fadeOut.length)))),
      matched: false,
    })),
    ...MORPH.fadeIn.map(({ id, x }, index) => ({
      id, glyph: GLYPH_OF.get(id) as GlyphName, x: r2(x), width: width(id),
      opacity: r2(shown * smooth(laggedProgress(arrive, index, MORPH.fadeIn.length))),
      matched: false,
    })),
  ];
}
const GLYPH_IDS = kalmanGlyphsAt(0).map((item) => item.id);
const glyphAt = (id: string, t: number) => kalmanGlyphsAt(t).find((item) => item.id === id)!;
const GLYPH_INK: Partial<Record<GlyphName, string>> = {
  kalmanBlend: 'var(--role-state-stage)',
  xhat: 'var(--role-state-stage)',
  kalmanGuess: 'var(--role-state-stage)',
  xprior: 'var(--role-state-stage)',
  kalmanReading: 'var(--role-measurement-stage)',
  z: 'var(--role-measurement-stage)',
  kalmanGain: 'var(--role-highlight-stage)',
  gain: 'var(--role-highlight-stage)',
};
/**
 * Article math styles resize and recolour every `.katex`, so each glyph pins
 * its own size (the layout's advance widths assume it) and its role colour.
 */
const glyphMarkup = (glyph: GlyphName) =>
  KALMAN_GLYPHS[glyph].html.replace(
    '<span class="katex">',
    `<span class="katex" style="font-size:${r2(GLYPH_PX)}px;color:${GLYPH_INK[glyph] ?? 'var(--motion-stage-label)'}">`,
  );
/**
 * The two flank labels are right-aligned, so their leaders drop from a
 * point under the label at every text size: the guess's left flank, where
 * it is the top curve, and the reading's right flank, where it is.
 */
const GUESS_LABEL_END = 128;
const GUESS_LEADER_X = 112;
const READING_LABEL_END = 332;
const READING_LEADER_X = 290;

const ROLE_STAGE = {
  state: 'var(--role-state-stage)',
  measurement: 'var(--role-measurement-stage)',
} as const;

/** A small wheeled robot with a sensor on a mast, drawn where it believes it is. */
function Robot() {
  const ink = 'var(--motion-stage-label-secondary)';
  return (
    <AnimatedGroup
      data-scene-structure="robot"
      bindings={{ transform: (t) => `translate(${r2(xScale(kalmanFrameAt(t).robot))} 0)` }}
    >
      <rect x={-11} y={RAIL - 17} width={22} height={10} fill="var(--color-surface)" stroke={ink} strokeWidth={1.25} />
      <line x1={3} y1={RAIL - 17} x2={3} y2={RAIL - 21} stroke={ink} strokeWidth={1} />
      <rect x={-1} y={RAIL - 26} width={9} height={5} fill="var(--color-surface)" stroke={ink} strokeWidth={1} />
      <circle cx={-6} cy={RAIL - 4} r={3.5} fill="var(--color-surface)" stroke={ink} strokeWidth={1.25} />
      <circle cx={6} cy={RAIL - 4} r={3.5} fill="var(--color-surface)" stroke={ink} strokeWidth={1.25} />
    </AnimatedGroup>
  );
}

/** The floor the robot rides: one plain line, which first-time readers took ties under it for marks. */
function Track() {
  return (
    <g data-scene-structure="track" stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)">
      <line x1={PLOT_LEFT} y1={RAIL} x2={PLOT_RIGHT} y2={RAIL} strokeWidth={1.5} />
    </g>
  );
}

/** One bell: a soft fill and its outline, each bound to the scene clock. */
function Bell({
  mark,
  role,
  bump,
  shown,
  fillAlpha,
  strokeWidth,
  dashed = false,
  lift = () => 1,
}: {
  mark: string;
  role: 'state' | 'measurement';
  bump: (t: number) => Bump;
  /** Opacity of the whole bell as a function of scene time. */
  shown: (t: number) => number;
  fillAlpha: number;
  strokeWidth: number;
  dashed?: boolean;
  /** How far the bell has risen out of its base line, 0 to 1. */
  lift?: (t: number) => number;
}) {
  const color = ROLE_STAGE[role];
  return (
    <>
      <AnimatedElement
        as="path"
        data-scene-mark={`${mark}-area`}
        fill={color}
        fillOpacity={fillAlpha}
        stroke="none"
        bindings={{ d: (t) => areaPath(bump(t), lift(t)), opacity: (t) => fade(shown(t)) }}
      />
      <AnimatedElement
        as="path"
        data-scene-mark={`${mark}-curve`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeDasharray={dashed ? '5 4' : undefined}
        bindings={{ d: (t) => curvePath(bump(t), lift(t)), opacity: (t) => fade(shown(t)) }}
      />
    </>
  );
}

const LEADER_GAP = 2;
const LEADER_HEAD = 6;
/** A downward arrowhead whose tip stops just above the curve at `curve`. */
const leaderHead = (x: number, curve: number) => {
  const tip = r2(curve - LEADER_GAP);
  const base = r2(tip - LEADER_HEAD);
  return `${r2(x - 3.5)},${base} ${r2(x + 3.5)},${base} ${x},${tip}`;
};

/** A label in its bell's colour, with an optional leader down to the curve. */
function BellLabel({
  children,
  role,
  x,
  y,
  anchor,
  shown,
  leader,
}: {
  children: string;
  role: 'state' | 'measurement';
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  shown: (t: number) => number;
  leader?: { x: number; to: (t: number) => number };
}) {
  const color = ROLE_STAGE[role];
  return (
    <AnimatedGroup bindings={{ opacity: (t) => fade(shown(t)) }}>
      <text x={x} y={y} textAnchor={anchor} fontSize={FONT} fontWeight={500} fill={color}>
        {children}
      </text>
      {leader ? (
        <g data-scene-structure="label-leader" stroke={color} strokeWidth={1.25}>
          <AnimatedElement
            as="line"
            x1={leader.x}
            x2={leader.x}
            y1={y + 8}
            bindings={{ y2: (t) => r2(leader.to(t) - LEADER_GAP - LEADER_HEAD) }}
          />
          {/* An arrowhead, so the leader reads as "this curve" and never as a mark of its own. */}
          <AnimatedElement
            as="polygon"
            data-scene-structure="label-leader-head"
            fill={color}
            stroke="none"
            bindings={{ points: (t) => leaderHead(leader.x, leader.to(t)) }}
          />
        </g>
      ) : null}
    </AnimatedGroup>
  );
}


const CAMERA_CLIP = 'kalman-predict-update-camera';
const SHARE_PATH = `M${X_GUESS} ${BRACKET - 4} V${BRACKET + 4} M${X_GUESS} ${BRACKET} H${X_READING} M${X_READING} ${BRACKET - 4} V${BRACKET + 4}`;

/** Everything drawn on the track's own scale: it moves with the camera. */
function TrackLayer() {
  return (
    <>
      <Track />
      <Bell
        mark="guess"
        role="state"
        bump={(t) => kalmanFrameAt(t).guess}
        shown={(t) => 1 - 0.5 * kalmanFrameAt(t).settled}
        fillAlpha={MOTION_UNCERTAINTY.fillAlpha}
        strokeWidth={1.5}
      />
      <Bell
        mark="reading"
        role="measurement"
        bump={() => READING}
        shown={(t) => (kalmanFrameAt(t).rise > 0 ? 1 - 0.5 * kalmanFrameAt(t).settled : 0)}
        lift={(t) => kalmanFrameAt(t).rise}
        fillAlpha={MOTION_UNCERTAINTY.fillAlpha}
        strokeWidth={1.5}
      />
      <Bell
        mark="blend"
        role="state"
        bump={(t) => kalmanFrameAt(t).blend}
        shown={(t) => kalmanFrameAt(t).blendShown}
        fillAlpha={MOTION_UNCERTAINTY.fillAlpha}
        strokeWidth={2}
      />
      <Robot />
      {/* The bracket from the guess to the reading, with the blend riding along it. */}
      <AnimatedGroup bindings={{ opacity: (t) => fade(kalmanFrameAt(t).bracket) }}>
        <path data-scene-mark="blend-share" d={SHARE_PATH} fill="none" stroke="var(--role-highlight-stage)" strokeWidth={1.25} />
        <AnimatedElement
          as="circle"
          data-scene-mark="blend-point"
          cy={BRACKET}
          r={3.5}
          fill="var(--role-highlight-stage)"
          bindings={{ cx: (t) => r2(xScale(kalmanFrameAt(t).blend.mean)) }}
        />
      </AnimatedGroup>
    </>
  );
}

/** The formula row: the worked step in numbers, then the rule in symbols, glyph by glyph. */
function FormulaRow() {
  return (
    <g data-scene-formula="kalman">
      {GLYPH_IDS.map((id) => {
        const glyph = GLYPH_OF.get(id) as GlyphName;
        const { width } = glyphAt(id, 0);
        return (
          <AnimatedGroup
            key={`glyph-${id}`}
            bindings={{
              transform: (t) => `translate(${glyphAt(id, t).x} 0)`,
              opacity: (t) => glyphAt(id, t).opacity,
            }}
          >
            <foreignObject x={0} y={GLYPH_Y} width={r2(width - 0.4)} height={GLYPH_H} overflow="visible" data-scene-glyph={id}>
              <div
                {...{ xmlns: 'http://www.w3.org/1999/xhtml' }}
                className="whitespace-nowrap text-center leading-[24px]"
                dangerouslySetInnerHTML={{ __html: glyphMarkup(glyph) }}
              />
            </foreignObject>
          </AnimatedGroup>
        );
      })}
    </g>
  );
}

/** The stage alone, so tests can render any frame inside a static-time provider. */
export function KalmanStage() {
  return (
    <StageSvg viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <defs data-scene-structure="camera-clip">
        <clipPath id={CAMERA_CLIP}>
          <rect {...CAMERA_WINDOW} />
        </clipPath>
      </defs>
      {/* The camera: the track, the bells, the robot and the bracket move with it. */}
      <g clipPath={`url(#${CAMERA_CLIP})`}>
        <AnimatedGroup data-scene-camera="" bindings={{ transform: kalmanCameraTransform }}>
          <TrackLayer />
        </AnimatedGroup>
      </g>

      <BellLabel
        role="state"
        x={GUESS_LABEL_END}
        y={ROW_TWO}
        anchor="end"
        shown={(t) => kalmanFrameAt(t).guessLabel}
        leader={{ x: GUESS_LEADER_X, to: (t) => curveY(kalmanFrameAt(t).guess, GUESS_LEADER_X) }}
      >
        my guess
      </BellLabel>
      <BellLabel
        role="measurement"
        x={READING_LABEL_END}
        y={ROW_ONE}
        anchor="end"
        shown={(t) => kalmanFrameAt(t).sensor}
        leader={{ x: READING_LEADER_X, to: () => curveY(READING, READING_LEADER_X) }}
      >
        the sensor says
      </BellLabel>
      <BellLabel
        role="state"
        x={X_BLEND}
        y={ROW_TWO}
        anchor="middle"
        shown={(t) => kalmanFrameAt(t).blendLabel}
      >
        best blend
      </BellLabel>
      {/* The key to every bell, on the first row's free left end. */}
      <AnimatedElement
        as="text"
        data-scene-key="bell-width"
        x={PLOT_LEFT}
        y={ROW_ONE}
        fontSize={FONT}
        fill="var(--motion-stage-label-secondary)"
        bindings={{ opacity: (t) => fade(kalmanFrameAt(t).guessLabel) }}
      >
        narrower bell: surer
      </AnimatedElement>

      <FormulaRow />

      {/* The one highlight note: how far the blend moved toward the reading. */}
      <AnimatedElement
        as="g"
        data-figure-annotation=""
        bindings={{ opacity: (t) => fade(kalmanFrameAt(t).annotation) }}
      >
        <text
          x={NOTE_X}
          y={NOTE_Y}
          textAnchor="middle"
          fontSize={FONT}
          fontWeight={600}
          fill="var(--role-highlight-stage)"
        >
          {GAIN_PERCENT}% of the way from guess to sensor
        </text>
      </AnimatedElement>
    </StageSvg>
  );
}

export function KalmanPredictUpdate({ className }: { className?: string }) {
  const { html } = SCENE_EQUATIONS.kalman;
  return (
    <SceneMount
      scene={SCENE}
      className={className}
      stage={<KalmanStage />}
      statusLine="Illustrative: one step of a simulated robot, drawn to scale."
      method={
        <>
          <p>
            In symbols, the update is{' '}
            <span data-scene-equation="kalman" dangerouslySetInnerHTML={{ __html: html }} />: the new
            estimate (the posterior) is the predicted estimate plus the gain K times the gap between
            the reading z and the predicted position.
          </p>
          <p>
            Here the gain is <span data-testid="kalman-gain-value">{fixed(GAIN)}</span>, the reading is{' '}
            {fixed(READING.mean)}, the predicted position {fixed(GUESS.mean)} and the blend{' '}
            {fixed(BLEND.mean)}, so the fourth beat writes {KALMAN_WORKED_NUMBERS.blend} ={' '}
            {KALMAN_WORKED_NUMBERS.guess} + {KALMAN_WORKED_NUMBERS.gain} &times; ({KALMAN_WORKED_NUMBERS.reading}{' '}
            &minus; {KALMAN_WORKED_NUMBERS.guess}) before it turns into the rule. The spread of the position
            estimate (one standard deviation) goes from {fixed(PRIOR.sigma)} to {fixed(GUESS.sigma)} in the
            predict step and to {fixed(BLEND.sigma)} after the update; the reading&rsquo;s spread is{' '}
            {fixed(READING.sigma)}.
          </p>
          <p>
            The bells are step {STEP} of the seeded constant-velocity filter (seed {DEFAULT_SEED},
            process noise {fixed(DEFAULT_SETTINGS.sigmaQ)}, reading noise {fixed(DEFAULT_SETTINGS.sigmaR)},
            the filter&rsquo;s beliefs matched to the world), drawn to scale. The filter tracks
            position and velocity; the scene draws position only. The robot and its track are an
            illustration.
          </p>
          <p>The steps, in order:</p>
          <ol>
            {SCENE.beats.map((beat) => (
              <li key={beat.id}>{beat.caption}</li>
            ))}
          </ol>
        </>
      }
      textAlternative={`${SCENE.title}. A five-beat scene: a robot on a track and bell curves for where it might be. ${SCENE.beats
        .map((beat, index) => `Beat ${index + 1}: ${beat.caption}`)
        .join(' ')} In filter terms, the posterior position equals the predicted position plus gain K (${fixed(GAIN)}) times the gap between reading z (${fixed(READING.mean)}) and the predicted position (${fixed(GUESS.mean)}). The spread of the position estimate goes from ${fixed(PRIOR.sigma)} to ${fixed(GUESS.sigma)} in the predict step and to ${fixed(BLEND.sigma)} after the update.`}
    />
  );
}

export default KalmanPredictUpdate;
