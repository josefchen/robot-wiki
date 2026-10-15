'use client';

/**
 * Kalman filter, guess-measure-blend: the classical state-estimation
 * reference scene. One step of the seeded constant-velocity filter from
 * lib/kalman.ts (seed 1, matched beliefs sigma q 0.20, sigma r 1.00), shown
 * on an estimating rail (the isometric figure kit,
 * components/iso/figures/kalman-rail.ts).
 *
 * A cart rides a track. In front of it run three calipers, one per belief
 * about where the cart is: each carriage stands at the estimate and its
 * jaws stand one spread to either side, so a narrower gap is a surer
 * estimate. The cart tows the guess caliper and its odometer drum counts
 * the roll (the predict step), while the jaws open. A rangefinder at the
 * end of the track drives the reading caliper to its noisy measurement.
 * The blend caliper copies the guess, then runs along a share rule laid
 * from the guess to the reading and stops at the gain's share of the way,
 * its jaws closer than both; the next beat measures that share out along
 * the rule. Every position and spread is the filter's own number, drawn to
 * scale (one filter unit is U world units). Position only; the velocity
 * half of the state is reported in the method fold. There is no text in
 * the drawing: the readout under it carries the numbers in words.
 */
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { AnimatedElement, AnimatedGroup } from '@/components/motion/animated';
import { beatSpans, locate, type SceneDefinition } from '@/components/motion/timeline';
import { clamp01, smooth } from '@/components/motion/easing';
import { LegendItem } from '@/components/ui/instrument';
import { PartView } from '@/components/iso/part-view';
import { Dots, Solid } from '@/components/iso/react/draw';
import type { SolidPaths } from '@/components/iso/iso-kit';
import {
  BEAM_START,
  CARRIAGES,
  CART_PARTS,
  DRUM_JOINS,
  DRUM_NEAR,
  DRUM_PATHS,
  FRONT_WHEELS,
  JAWS,
  JAW_MIN,
  LENS_PARTS,
  PARK,
  PARTS,
  U,
  VIEW_BOX,
  bandPath,
  beamPath,
  drumMarks,
  pointAt,
  screwPaths,
  shareParts,
  shiftX,
  wheelSpokes,
  wheelTurn,
  xOf,
  type DrawnPart,
  type LaneName,
  type Slot,
} from '@/components/iso/figures/kalman-rail';
import {
  DEFAULT_SEED,
  DEFAULT_SETTINGS,
  generateEpisode,
  stepDetail,
  type Cov2,
  type KalmanStepDetail,
} from '@/lib/kalman';
import { SCENE_EQUATIONS } from '@/lib/motion-equations';
import { MOTION_UNCERTAINTY } from '@/lib/motion-tokens';

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

/** One belief about the cart's position: its centre and its spread (one standard deviation). */
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
/** The four beliefs, exported for the tests that pin them to the filter. */
export const KALMAN_BUMPS = { prior: PRIOR, guess: GUESS, reading: READING, blend: BLEND } as const;
/** Where the reading and blend calipers wait, closed, before their beats: at the left end of their lanes. */
export const KALMAN_PARKED = {
  reading: { mean: PARK.reading, sigma: JAW_MIN / U },
  blend: { mean: PARK.blend, sigma: JAW_MIN / U },
} as const;

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
const [GUESS_BEAT, MEASURE_BEAT, BLEND_BEAT, SYMBOLS_BEAT] = SPANS.map((_, index) => index);

const beatProgress = (index: number) => (t: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);
/** The share of a beat between two of its fractions, eased. */
const within = (k: number, from: number, to: number) => smooth(clamp01((k - from) / (to - from)));
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const mixBump = (a: Bump, b: Bump, k: number): Bump => ({
  mean: mix(a.mean, b.mean, k),
  sigma: mix(a.sigma, b.sigma, k),
});
const r3 = (value: number) => Number(value.toFixed(3));

/**
 * Inside the blend beat: the blend caliper runs from its park to the guess
 * and opens to the guess's jaws by 22%, its band showing as an exact copy
 * from 16% to 22%; the share rule is laid from 24% to 34%; the blend then
 * runs to the update and closes its jaws from 34% to 80%; and from 80% the
 * guess's and reading's bands step back to 70% ink.
 */
export const BLEND_TIMING = { copy: 0.22, shownFrom: 0.16, shownTo: 0.22, ruleFrom: 0.24, ruleTo: 0.34, slideTo: 0.8 } as const;

/**
 * The whole scene as a pure function of scene time: each caliper's centre
 * and spread (in filter units), how far each band and the share rule have
 * faded in, how far the share is measured out, where the cart is and how
 * far it has rolled, and the rangefinder's beam. Tests pin this determinism.
 */
export function kalmanFrameAt(t: number) {
  const guessing = smooth(beatProgress(GUESS_BEAT)(t));
  const measure = beatProgress(MEASURE_BEAT)(t);
  const blendBeat = beatProgress(BLEND_BEAT)(t);
  const symbols = beatProgress(SYMBOLS_BEAT)(t);
  const guess = mixBump(PRIOR, GUESS, guessing);
  const running = within(measure, 0.1, 0.75);
  const reading = mixBump(KALMAN_PARKED.reading, READING, running);
  const copy = within(blendBeat, 0, BLEND_TIMING.copy);
  const slide = within(blendBeat, BLEND_TIMING.ruleTo, BLEND_TIMING.slideTo);
  const blend = slide > 0 ? mixBump(GUESS, BLEND, slide) : mixBump(KALMAN_PARKED.blend, GUESS, copy);
  return {
    guess,
    reading,
    blend,
    /** The cart tows the guess caliper: it stands where the guess is. */
    cart: guess.mean,
    /** World units the cart has rolled since the start, for its wheels and odometer. */
    rolled: r3((guess.mean - PRIOR.mean) * U),
    readingShown: r3(within(measure, 0.55, 0.8)),
    /** The blend starts as an exact copy of the guess, so it can appear at full ink. */
    blendShown: r3(within(blendBeat, BLEND_TIMING.shownFrom, BLEND_TIMING.shownTo)),
    share: r3(within(blendBeat, BLEND_TIMING.ruleFrom, BLEND_TIMING.ruleTo)),
    /** How much of the share rule is measured out, from the guess toward the reading. */
    measured: r3(GAIN * within(symbols, 0.15, 0.75)),
    /** The guess and the reading step back once the blend has landed. */
    settled: r3(within(blendBeat, BLEND_TIMING.slideTo, 0.98)),
    beam: r3(within(measure, 0, 0.12) * (1 - within(measure, 0.82, 1))),
  };
}

type Frame = ReturnType<typeof kalmanFrameAt>;
/** Every binding of a frame reads the same frame, so it is computed once per moment. */
const frameCache: { t: number; frame: Frame | null } = { t: Number.NaN, frame: null };
const frameAt = (t: number): Frame => {
  if (t !== frameCache.t || !frameCache.frame) {
    frameCache.frame = kalmanFrameAt(t);
    frameCache.t = t;
  }
  return frameCache.frame;
};

/** The one lit part, beat by beat: the odometer while it predicts, the rangefinder while it measures, then the share rule. */
export function kalmanLitAt(t: number): 'odometer' | 'rangefinder' | 'share' {
  const beat = locate(SPANS, t).index;
  return beat === GUESS_BEAT ? 'odometer' : beat === MEASURE_BEAT ? 'rangefinder' : 'share';
}

/** A caliper's jaws in world units: the inner faces stand one spread either side of the centre. */
export function jawFaces(bump: Bump) {
  return { left: xOf(bump.mean) - bump.sigma * U, centre: xOf(bump.mean), right: xOf(bump.mean) + bump.sigma * U };
}

const fixed = (value: number) => value.toFixed(2);
/** The worked step's numbers as the readout and the fold write them; tests pin them to the filter. */
export const KALMAN_WORKED_NUMBERS = {
  blend: fixed(BLEND.mean),
  guess: fixed(GUESS.mean),
  gain: fixed(GAIN),
  reading: fixed(READING.mean),
} as const;

/** The readout under the drawing, one line per beat, in plain words. */
export const KALMAN_READOUTS = [
  `Guess ${fixed(GUESS.mean)} · jaws open from ${fixed(PRIOR.sigma)} to ${fixed(GUESS.sigma)} either side`,
  `Reading ${fixed(READING.mean)} · jaws ${fixed(READING.sigma)} either side`,
  `Blend ${fixed(BLEND.mean)} · jaws ${fixed(BLEND.sigma)} either side, closer than both`,
  `${KALMAN_WORKED_NUMBERS.guess} plus ${GAIN_PERCENT}% of the way to ${KALMAN_WORKED_NUMBERS.reading} is ${KALMAN_WORKED_NUMBERS.blend}`,
  `Jaws either side: guess ${fixed(GUESS.sigma)} · reading ${fixed(READING.sigma)} · blend ${fixed(BLEND.sigma)}`,
] as const;

const ROLE_STAGE = {
  state: 'var(--role-state-stage)',
  measurement: 'var(--role-measurement-stage)',
  highlight: 'var(--role-highlight-stage)',
} as const;

/** A solid whose shape changes with scene time, drawn as the kit's Solid draws it. */
function LiveSolid({ build, tone, edgeTone }: { build: (t: number) => SolidPaths; tone: string; edgeTone?: (t: number) => string }) {
  const at = (t: number) => build(t);
  return (
    <g className="iso-solid">
      <AnimatedElement as="path" className="iso-fill" bindings={{ d: (t) => at(t).fill }} />
      {[0, 1, 2, 3].map((shade) => (
        <AnimatedElement key={shade} as="path" className="iso-shade" data-shade={shade} bindings={{ d: (t) => at(t).shades[shade] || 'M0 0' }} />
      ))}
      <AnimatedElement as="path" className="iso-top" bindings={{ d: (t) => at(t).top }} />
      <AnimatedElement as="path" className="iso-line iso-crease" data-tone="faint" bindings={{ d: (t) => at(t).crease || 'M0 0' }} />
      <AnimatedElement as="path" className="iso-line iso-bevel" data-tone="faint" bindings={{ d: (t) => at(t).bevel || 'M0 0' }} />
      <AnimatedElement as="path" className="iso-line iso-edge" data-tone={tone} bindings={edgeTone ? { d: (t) => at(t).outline, 'data-tone': edgeTone } : { d: (t) => at(t).outline }} />
    </g>
  );
}

/** One built-once screw per caliper and moment, so its four paths share one rebuild. */
function screwBuilder(lane: LaneName, bump: (frame: Frame) => Bump) {
  const cache: { t: number; paths: SolidPaths | null } = { t: Number.NaN, paths: null };
  return (t: number) => {
    if (t !== cache.t || !cache.paths) {
      const b = bump(frameAt(t));
      cache.paths = screwPaths(lane, xOf(b.mean), b.sigma * U);
      cache.t = t;
    }
    return cache.paths;
  };
}

const parts = (list: readonly DrawnPart[]) => list.map((part, index) => <PartView key={index} part={part} />);

/** A caliper: the band between its jaws (the mark), the left jaw, the screw, the carriage and the right jaw. */
function Caliper({
  lane,
  bump,
  shown,
  dim,
  role,
  strokeWidth,
}: {
  lane: LaneName;
  bump: (frame: Frame) => Bump;
  shown: (frame: Frame) => number;
  dim: (frame: Frame) => number;
  role: 'state' | 'measurement';
  strokeWidth: number;
}) {
  const band = (t: number) => {
    const b = bump(frameAt(t));
    return bandPath(lane, xOf(b.mean), b.sigma * U);
  };
  const ink = (t: number) => r3(shown(frameAt(t)) * dim(frameAt(t)));
  const series = lane === 'reading' ? 'reading' : lane;
  return (
    <g data-scene-part={`${lane}-caliper`}>
      <AnimatedElement
        as="path"
        data-scene-mark={`${lane}-area`}
        data-legend-series={series}
        fill={ROLE_STAGE[role]}
        fillOpacity={MOTION_UNCERTAINTY.fillAlpha}
        stroke="none"
        bindings={{ d: band, opacity: ink }}
      />
      <AnimatedElement
        as="path"
        data-scene-mark={`${lane}-curve`}
        data-legend-series={series}
        fill="none"
        stroke={ROLE_STAGE[role]}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        bindings={{ d: band, opacity: ink }}
      />
      <AnimatedGroup bindings={{ transform: (t) => shiftX(jawFaces(bump(frameAt(t))).left) }}>{parts(JAWS[lane].left)}</AnimatedGroup>
      <LiveSolid build={screwBuilder(lane, bump)} tone="mid" />
      <AnimatedGroup bindings={{ transform: (t) => shiftX(jawFaces(bump(frameAt(t))).centre) }}>{parts(CARRIAGES[lane])}</AnimatedGroup>
      <AnimatedGroup bindings={{ transform: (t) => shiftX(jawFaces(bump(frameAt(t))).right) }}>{parts(JAWS[lane].right)}</AnimatedGroup>
    </g>
  );
}

const SHARE = shareParts(xOf(GUESS.mean), xOf(READING.mean));
/** The measured part of the share rule's top, from the guess's stop toward the reading's. */
const measuredPath = (t: number) => {
  const { measured } = frameAt(t);
  const to = xOf(GUESS.mean) + measured * (xOf(READING.mean) - xOf(GUESS.mean));
  return shareParts(xOf(GUESS.mean), Math.max(to, xOf(GUESS.mean) + 0.01)).top;
};

function SlotView({ slot }: { slot: Slot }) {
  switch (slot) {
    case 'beam':
      // The rangefinder's beam, from its lens to the cart, while it measures.
      return (
        <AnimatedGroup data-scene-part="rangefinder-beam" bindings={{ opacity: (t) => frameAt(t).beam }}>
          <path className="iso-line" data-tone="lit" d={beamPath(xOf(GUESS.mean))} />
          {/* The emitter's spot on the lens glass, where the beam leaves. */}
          <Dots points={[BEAM_START]} size={0.9} tone="hi" />
        </AnimatedGroup>
      );
    case 'cart':
      return (
        <AnimatedGroup data-scene-part="cart" bindings={{ transform: (t) => shiftX(xOf(frameAt(t).cart)) }}>
          {parts(CART_PARTS)}
          <LiveSolid
            build={() => DRUM_PATHS}
            tone="hi"
            edgeTone={(t) => (kalmanLitAt(t) === 'odometer' ? 'lit' : 'hi')}
          />
          <AnimatedElement as="path" className="iso-line" data-tone="lo" d={DRUM_JOINS} />
          <AnimatedElement as="path" className="iso-line" data-tone="mid" bindings={{ d: (t) => drumMarks(frameAt(t).rolled) }} />
          {parts(DRUM_NEAR)}
          {parts(FRONT_WHEELS)}
          <AnimatedElement as="path" className="iso-line" data-tone="lo" bindings={{ d: (t) => wheelSpokes(wheelTurn(frameAt(t).rolled)) }} />
        </AnimatedGroup>
      );
    case 'guess':
      return <Caliper lane="guess" bump={(f) => f.guess} shown={() => 1} dim={(f) => 1 - 0.3 * f.settled} role="state" strokeWidth={1.25} />;
    case 'reading':
      return <Caliper lane="reading" bump={(f) => f.reading} shown={(f) => f.readingShown} dim={(f) => 1 - 0.3 * f.settled} role="measurement" strokeWidth={1.25} />;
    case 'share':
      // The share rule from the guess's stop to the reading's, laid in the blend beat.
      return (
        <AnimatedGroup data-scene-part="share-rule" bindings={{ opacity: (t) => frameAt(t).share }}>
          <Solid paths={SHARE.bar} tone="mid" />
          {/* One mark: the rule's outline, and the part of it measured out from the guess's stop. */}
          <g data-scene-mark="blend-share" data-legend-series="share" fill={ROLE_STAGE.highlight} stroke={ROLE_STAGE.highlight}>
            <path d={SHARE.top} fill="none" strokeWidth={1.25} strokeLinejoin="round" />
            <AnimatedElement as="path" data-scene-part="share-measured" stroke="none" bindings={{ d: measuredPath }} />
          </g>
          {parts(SHARE.stops)}
        </AnimatedGroup>
      );
    case 'blend':
      return (
        <>
          <Caliper lane="blend" bump={(f) => f.blend} shown={(f) => f.blendShown} dim={() => 1} role="state" strokeWidth={2} />
          {/* The blend's pointer tip on the share rule. */}
          <AnimatedElement
            as="circle"
            data-scene-mark="blend-point"
            data-legend-series="share"
            r={2.4}
            fill={ROLE_STAGE.highlight}
            bindings={{
              cx: (t) => pointAt(xOf(frameAt(t).blend.mean))[0].toFixed(2),
              cy: (t) => pointAt(xOf(frameAt(t).blend.mean))[1].toFixed(2),
              opacity: (t) => frameAt(t).share,
            }}
          />
        </>
      );
    default:
      return null;
  }
}

/** The lens barrel's parts, with the barrel's edge lit while the rangefinder measures. */
function Lens() {
  return (
    <g data-scene-part="rangefinder-lens">
      {LENS_PARTS.map((part, index) =>
        index === 1 && part.kind === 'solid' ? (
          <LiveSolid key={index} build={() => part.paths} tone="hi" edgeTone={(t) => (kalmanLitAt(t) === 'rangefinder' ? 'lit' : 'hi')} />
        ) : (
          <PartView key={index} part={part} />
        ),
      )}
    </g>
  );
}

const LENS_SET = new Set<DrawnPart>(LENS_PARTS);

/** The stage alone, so tests can render any frame inside a static-time provider. */
export function KalmanStage() {
  return (
    <div className="iso" data-anatomy-drawing="">
      <StageSvg viewBox={VIEW_BOX} className="iso-svg">
        {PARTS.map((part, index) => {
          if (part.kind === 'slot') return <SlotView key={part.slot} slot={part.slot} />;
          if (LENS_SET.has(part)) return part === LENS_PARTS[0] ? <Lens key="lens" /> : null;
          return <PartView key={index} part={part} />;
        })}
      </StageSvg>
    </div>
  );
}

const swatch = (style: Record<string, string>, className: string) => (
  <span aria-hidden className={`inline-block ${className}`} style={style} />
);

export function KalmanPredictUpdate({ className }: { className?: string }) {
  const { html } = SCENE_EQUATIONS.kalman;
  return (
    <SceneMount
      scene={SCENE}
      className={className}
      stage={<KalmanStage />}
      legend={
        <>
          <LegendItem series="guess" swatch={swatch({ borderColor: 'var(--role-state-graphic)' }, 'h-2.5 w-4 border')}>
            the cart&rsquo;s guess
          </LegendItem>
          <LegendItem series="reading" swatch={swatch({ borderColor: 'var(--role-measurement-graphic)' }, 'h-2.5 w-4 border')}>
            the sensor&rsquo;s reading
          </LegendItem>
          <LegendItem series="blend" swatch={swatch({ borderColor: 'var(--role-state-graphic)' }, 'h-2.5 w-4 border-2')}>
            the blend
          </LegendItem>
          <LegendItem series="share" swatch={swatch({ backgroundColor: 'var(--role-highlight-graphic)' }, 'h-1 w-4')}>
            its share of the way to the reading
          </LegendItem>
        </>
      }
      readout={({ beatIndex }) => KALMAN_READOUTS[beatIndex] ?? KALMAN_READOUTS[KALMAN_READOUTS.length - 1]}
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
            {fixed(BLEND.mean)}, so {KALMAN_WORKED_NUMBERS.blend} = {KALMAN_WORKED_NUMBERS.guess} +{' '}
            {KALMAN_WORKED_NUMBERS.gain} &times; ({KALMAN_WORKED_NUMBERS.reading} &minus; {KALMAN_WORKED_NUMBERS.guess}). The
            spread of the position estimate (one standard deviation) goes from {fixed(PRIOR.sigma)} to{' '}
            {fixed(GUESS.sigma)} in the predict step and to {fixed(BLEND.sigma)} after the update; the
            reading&rsquo;s spread is {fixed(READING.sigma)}.
          </p>
          <p>
            The drawing is an estimating rail. The cart tows the guess&rsquo;s caliper while its odometer
            counts the roll, a rangefinder drives the reading&rsquo;s caliper, and the blend&rsquo;s caliper
            runs along a share rule from the guess to the reading. Each caliper&rsquo;s jaws stand one
            spread either side of its estimate, so closer jaws mean surer. The numbers are step {STEP} of
            the seeded constant-velocity filter (seed {DEFAULT_SEED}, process noise{' '}
            {fixed(DEFAULT_SETTINGS.sigmaQ)}, reading noise {fixed(DEFAULT_SETTINGS.sigmaR)}, beliefs
            matched to the world), drawn to scale. The drawing shows position only; the filter also
            tracks velocity. The rail is an illustration.
          </p>
          <p>The steps, in order:</p>
          <ol>
            {SCENE.beats.map((beat) => (
              <li key={beat.id}>{beat.caption}</li>
            ))}
          </ol>
        </>
      }
      textAlternative={`${SCENE.title}. A five-beat scene: a cart on a track and three calipers whose jaws stand one spread either side of where the cart might be. ${SCENE.beats
        .map((beat, index) => `Beat ${index + 1}: ${beat.caption}`)
        .join(' ')} In filter terms, the posterior position equals the predicted position plus gain K (${fixed(GAIN)}) times the gap between reading z (${fixed(READING.mean)}) and the predicted position (${fixed(GUESS.mean)}). The spread of the position estimate goes from ${fixed(PRIOR.sigma)} to ${fixed(GUESS.sigma)} in the predict step and to ${fixed(BLEND.sigma)} after the update.`}
    />
  );
}

export default KalmanPredictUpdate;
