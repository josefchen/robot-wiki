'use client';

/**
 * Diffusion-policy denoising, the manipulation reference scene, drawn as a
 * denoising gauge (the isometric figure kit,
 * components/iso/figures/denoising-gauge.ts).
 *
 * A move is sixteen planned positions, Diffusion Policy's prediction
 * horizon, and each of two pin gauges holds one move: every pin's height is
 * one position, and a thread through the pins' ball heads is the move. A
 * bar the camera sees crosses both gauges. People demonstrated two good
 * ways past it: the thread arching over the bar, and sagging under it. In
 * training, noise is mixed into the demonstrations until the pins stand at
 * random heights; to act, the step dial clicks through ten clean-up steps
 * and every pin moves to the model's next height, guided by what the
 * camera sees. The front gauge's guess is followed; the back one starts
 * from another random guess. Each lands on a good move, one under the bar
 * and one over it, and neither on the straight average that would hit it.
 *
 * Every pin height is the model's (lib/denoising-gauge.ts). There is no
 * text in the drawing: the readout under it carries the numbers in words.
 */
import { useLayoutEffect, useRef } from 'react';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { AnimatedElement, AnimatedGroup } from '@/components/motion/animated';
import { useSceneTime, useStaticTime } from '@/components/motion/scene-context';
import { beatSpans, locate, type SceneDefinition } from '@/components/motion/timeline';
import { clamp01, smooth } from '@/components/motion/easing';
import { LegendItem } from '@/components/ui/instrument';
import { PartView } from '@/components/iso/part-view';
import { Dots } from '@/components/iso/react/draw';
import type { SolidPaths } from '@/components/iso/iso-kit';
import {
  BALL_PX,
  BEAM,
  BEAM_START,
  DIAL_HUB,
  LEFT_PINS,
  LENS_GLASS,
  PARTS,
  RIGHT_PINS,
  VIEW_BOX,
  ballAt,
  crankPin,
  dialPointer,
  leverAt,
  pinRod,
  threadKnots,
  threadPath,
  type Lane,
  type Slot,
} from '@/components/iso/figures/denoising-gauge';
import {
  DENOISING_STEPS,
  GUESSES,
  PIN_COUNT,
  cleanUp,
  distance,
  nearestMode,
  noiseOf,
  noisedMove,
  profileOf,
  signalLeft,
  stepTime,
  type Mode,
} from '@/lib/denoising-gauge';
import { SCENE_EQUATIONS } from '@/lib/motion-equations';

const SCENE: SceneDefinition = {
  id: 'diffusion-denoising',
  title: 'Diffusion policy: denoising actions',
  kicker: 'Diffusion policy',
  headline: 'From random noise to two good ways to move',
  beats: [
    {
      id: 'demos',
      caption:
        'Demonstrations: people showed the robot two different good ways to make the same move.',
    },
    {
      id: 'forward-noise',
      duration: 'long',
      caption:
        'In training, random noise is added to every demonstrated move until they all blur into one random cloud.',
    },
    {
      id: 'reverse-steps',
      duration: 'long',
      linear: true,
      caption:
        'To act, the robot starts from random guesses and cleans them up in ten small steps, guided by what it sees; follow one guess.',
    },
    {
      id: 'in-symbols',
      duration: 'long',
      caption:
        'Every guess ends on a good move: in symbols, a move a is drawn to fit what the robot sees, o.',
    },
    {
      id: 'recap',
      duration: 'long',
      caption:
        'Starting from random guesses and cleaning them up step by step lets the robot keep two different good moves instead of blurring them together.',
    },
  ],
};
/** The scene definition, exported for the player-level tests. */
export const DIFFUSION_SCENE = SCENE;
const SPANS = beatSpans(SCENE.beats);
const BEAT_WORDS = ['one', 'two', 'three', 'four', 'five', 'six'][SCENE.beats.length - 1];
const [DEMOS, NOISE, STEPS, SYMBOLS, RECAP] = SPANS.map((_, index) => index);

const beatProgress = (index: number) => (t: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);
const within = (k: number, from: number, to: number) => smooth(clamp01((k - from) / (to - from)));
const r2 = (value: number) => Number(value.toFixed(2));
const r3 = (value: number) => Number(value.toFixed(3));

// ---------------------------------------------------------------- the model
/** The two guesses: what each was noised from, its random guess, and every clean-up step. */
const RUNS = GUESSES.map(({ seed, demo }) => {
  const noise = noiseOf(seed);
  const states = cleanUp(noise);
  return { demo, noise, states, lands: nearestMode(states[DENOISING_STEPS]).mode };
});
/** Where each guess ends: the front one under the bar, the back one over it. */
export const DIFFUSION_LANDINGS: readonly Mode[] = RUNS.map((run) => run.lands);
/** The guess the scene follows: the front gauge. */
export const FOLLOWED: Lane = 0;
/** Where the pins wait before the demonstrations are set: low in their guides. */
const DOWN = -1.6;

/** The followed guess's distance from the move it lands on, at its random start and at the end. */
export const WORKED_DISTANCES = {
  start: distance(RUNS[FOLLOWED].noise, profileOf(RUNS[FOLLOWED].lands)),
  end: distance(RUNS[FOLLOWED].states[DENOISING_STEPS], profileOf(RUNS[FOLLOWED].lands)),
} as const;
/** Both guesses' mean distance from the move each lands on, before and after the ten steps. */
export const GUESS_DISTANCES = {
  start: RUNS.reduce((sum, run) => sum + distance(run.noise, profileOf(run.lands)), 0) / RUNS.length,
  end: RUNS.reduce((sum, run) => sum + distance(run.states[DENOISING_STEPS], profileOf(run.lands)), 0) / RUNS.length,
} as const;

/** Inside a clean-up step's slot, the pins move during the first share and then hold, like a ratchet click. */
const CLICK = 0.6;

/** The clean-up steps done at scene time t, 0 to 10, as the dial shows it. */
export function diffusionStepAt(t: number): number {
  if (t < SPANS[STEPS].start) return 0;
  return Math.min(DENOISING_STEPS, Math.floor(beatProgress(STEPS)(t) * DENOISING_STEPS + 1e-9));
}

/** How far through the clean-up the pins are, in steps (fractional while a click moves them). */
function stepsMoved(t: number): number {
  if (t <= SPANS[STEPS].start) return 0;
  if (t >= SPANS[STEPS].end) return DENOISING_STEPS;
  const k = beatProgress(STEPS)(t) * DENOISING_STEPS;
  const done = Math.floor(k + 1e-9);
  return Math.min(DENOISING_STEPS, done + smooth(clamp01((k - done) / CLICK)));
}

/**
 * The pin heights of one gauge at scene time t, in arch heights, a pure
 * function: rising into the demonstration, noised along the training
 * schedule, then stepped through the model's ten clean-up states. Tests pin
 * this to the model.
 */
export function diffusionPinsAt(lane: Lane, t: number): number[] {
  const run = RUNS[lane];
  if (t < SPANS[NOISE].start) {
    const k = beatProgress(DEMOS)(t);
    const demo = profileOf(run.demo);
    return demo.map((height, i) => DOWN + (height - DOWN) * within(k, 0.04 * i, 0.04 * i + 0.4));
  }
  if (t < SPANS[STEPS].start) return noisedMove(run.demo, run.noise, beatProgress(NOISE)(t));
  if (t >= SPANS[STEPS].end) return run.states[DENOISING_STEPS];
  const moved = stepsMoved(t);
  const done = Math.floor(moved);
  if (done >= DENOISING_STEPS) return run.states[DENOISING_STEPS];
  const k = moved - done;
  const from = run.states[done];
  const to = run.states[done + 1];
  return from.map((height, i) => height + (to[i] - height) * k);
}

/** How settled the pins look, 0 (random) to 1 (a good move): the square of the signal left in them, so a ball turns ink only once its pin has nearly settled. */
export function diffusionCleanAt(t: number): number {
  if (t < SPANS[NOISE].start) return 1;
  if (t < SPANS[STEPS].start) return r3(signalLeft(beatProgress(NOISE)(t)) ** 2);
  if (t >= SPANS[STEPS].end) return 1;
  return r3(signalLeft(stepTime(stepsMoved(t))) ** 2);
}

/** The one lit part, beat by beat. */
export function diffusionLitAt(t: number): 'none' | 'shaker' | 'followed' | 'camera' | 'moves' {
  const beat = locate(SPANS, t).index;
  return (['none', 'shaker', 'followed', 'camera', 'moves'] as const)[beat];
}

/** Every binding of a moment reads the same frame, so it is computed once per moment. */
type Frame = { heights: number[][]; rods: SolidPaths[][]; clean: number };
const frameCache: { t: number; frame: Frame | null } = { t: Number.NaN, frame: null };
function frameAt(t: number): Frame {
  if (t !== frameCache.t || !frameCache.frame) {
    const heights = ([0, 1] as const).map((lane) => diffusionPinsAt(lane, t));
    frameCache.frame = {
      heights,
      rods: heights.map((list, lane) => list.map((height, i) => pinRod(lane as Lane, i, height))),
      clean: diffusionCleanAt(t),
    };
    frameCache.t = t;
  }
  return frameCache.frame;
}

const fixed = (value: number) => value.toFixed(2);
const WHERE: Record<Mode, string> = { over: 'over the bar', under: 'under the bar' };

/** The readout under the drawing at scene time t, in plain words. */
export function diffusionReadoutAt(t: number): string {
  const beat = locate(SPANS, t).index;
  if (beat === DEMOS) return 'Two demonstrations: one over the bar, one under it';
  if (beat === NOISE) {
    const noise = Math.round((1 - signalLeft(beatProgress(NOISE)(t))) * 100);
    return noise >= 100 ? 'Training: all noise, nothing of the moves left' : `Training: ${noise}% noise mixed in`;
  }
  if (beat === STEPS) {
    const heights = diffusionPinsAt(FOLLOWED, t);
    const gap = distance(heights, profileOf(RUNS[FOLLOWED].lands));
    return `Step ${diffusionStepAt(t)} of ${DENOISING_STEPS} · the lit guess is ${fixed(gap)} from a good move`;
  }
  if (beat === SYMBOLS) {
    return `Both fit what the camera sees: one ${WHERE[RUNS[0].lands]}, one ${WHERE[RUNS[1].lands]}`;
  }
  return 'Two random guesses, two good moves · neither hits the bar';
}

// ---------------------------------------------------------------- drawing
/** A pin's rod, rebuilt each moment: fill, the four side shades, top and outline. */
function Rod({ lane, i }: { lane: Lane; i: number }) {
  const rod = (t: number) => frameAt(t).rods[lane][i];
  return (
    <g className="iso-solid">
      <AnimatedElement as="path" className="iso-fill" bindings={{ d: (t) => rod(t).fill }} />
      {[0, 1, 2, 3].map((shade) => (
        <AnimatedElement key={shade} as="path" className="iso-shade" data-shade={shade} bindings={{ d: (t) => rod(t).shades[shade] || 'M0 0' }} />
      ))}
      <AnimatedElement as="path" className="iso-top" bindings={{ d: (t) => rod(t).top }} />
      <AnimatedElement as="path" className="iso-line iso-edge" data-tone="mid" bindings={{ d: (t) => rod(t).outline }} />
    </g>
  );
}

/** A pin's ball head: a grey ball while random, an ink ball once it is set, crossfaded. */
function Ball({ lane, i }: { lane: Lane; i: number }) {
  const n = lane * PIN_COUNT + i;
  const cx = (t: number) => r2(ballAt(lane, i, frameAt(t).heights[lane][i])[0]);
  const cy = (t: number) => r2(ballAt(lane, i, frameAt(t).heights[lane][i])[1]);
  return (
    <>
      <AnimatedElement
        as="circle"
        data-scene-mark={`noise-${n}`}
        data-legend-series="diffusion-noise"
        r={r2(BALL_PX)}
        fill="var(--role-reference-stage)"
        bindings={{ cx, cy, opacity: (t) => r3(1 - frameAt(t).clean) }}
      />
      <AnimatedElement
        as="circle"
        data-scene-mark={`action-${n}`}
        data-legend-series="diffusion-action"
        r={r2(BALL_PX)}
        fill="var(--role-action-stage)"
        bindings={{ cx, cy, opacity: (t) => frameAt(t).clean }}
      />
      {/* The ball's shine, up toward the light, so it reads round. */}
      <AnimatedElement
        as="circle"
        data-scene-structure="ball-shine"
        r={r2(BALL_PX * 0.3)}
        fill="var(--paper)"
        opacity={0.55}
        bindings={{ cx: (t) => r2(cx(t) - BALL_PX * 0.32), cy: (t) => r2(cy(t) - BALL_PX * 0.36) }}
      />
    </>
  );
}

function Pins({ lane, which }: { lane: Lane; which: readonly number[] }) {
  return (
    <g data-scene-part={`gauge-${lane}-pins`}>
      {which.map((i) => (
        <g key={i}>
          <Rod lane={lane} i={i} />
          <Ball lane={lane} i={i} />
        </g>
      ))}
    </g>
  );
}

/**
 * A gauge's thread, the move: a thin line always, the demonstration in
 * action ink while it is set, the followed guess lit while it is cleaned
 * up, and both moves lit in the recap.
 */
function Thread({ lane }: { lane: Lane }) {
  const d = (t: number) => threadPath(lane, frameAt(t).heights[lane]);
  const demoShare = (t: number) => {
    if (t >= SPANS[STEPS].start) return 0;
    if (t < SPANS[NOISE].start) return r3(within(beatProgress(DEMOS)(t), 0.5, 1));
    return r3(signalLeft(beatProgress(NOISE)(t)) ** 2);
  };
  const settled = (t: number) => (t >= SPANS[STEPS].end ? 1 : 0);
  const recap = (t: number) => r3(within(beatProgress(RECAP)(t), 0, 0.3));
  const followed = (t: number) => {
    if (t < SPANS[STEPS].start || t >= SPANS[SYMBOLS].start) return 0;
    return r3(within(beatProgress(STEPS)(t), 0, 0.06));
  };
  return (
    <g data-scene-part={`gauge-${lane}-thread`}>
      <AnimatedElement as="path" className="iso-line" data-tone="lo" bindings={{ d }} />
      <AnimatedElement
        as="path"
        data-scene-mark={`demonstration-${lane}`}
        fill="none"
        stroke="var(--role-action-stage)"
        strokeWidth={1.1}
        strokeLinejoin="round"
        bindings={{ d, opacity: demoShare }}
      />
      <AnimatedElement as="path" className="iso-line" data-tone="hi" style={{ strokeWidth: 1.1 }} bindings={{ d, opacity: (t) => r3(settled(t) * (1 - recap(t))) }} />
      {lane === FOLLOWED ? (
        <AnimatedElement
          as="path"
          data-scene-mark="worked-guess"
          data-legend-series="followed"
          fill="none"
          stroke="var(--role-highlight-stage)"
          strokeWidth={1.3}
          strokeLinejoin="round"
          bindings={{ d, opacity: followed }}
        />
      ) : null}
      <AnimatedElement as="path" className="iso-line" data-tone="lit" style={{ strokeWidth: 1.3 }} bindings={{ d, opacity: recap }} />
      {/* The knots that tie the thread to the start and end posts. */}
      <Dots points={threadKnots(lane)} size={0.75} tone="hi" />
    </g>
  );
}

/** The step dial's pointer, turned one tick per clean-up step. */
function Dial() {
  return (
    <g data-scene-part="step-dial">
      <AnimatedElement as="path" className="iso-line" data-tone="hi" data-free="" bindings={{ d: (t) => dialPointer(stepsMoved(t)) }} />
      <path className="iso-line" data-tone="lo" d={DIAL_HUB} />
    </g>
  );
}

/** The shaker's crank pin: it orbits the cam while training noises the pins. */
function Shaker() {
  const turn = (t: number) => 0.6 + beatProgress(NOISE)(t) * Math.PI * 2 * 5;
  const pin = (t: number) => crankPin(turn(t));
  return (
    <g className="iso-solid" data-scene-part="shaker">
      <AnimatedElement as="path" className="iso-fill" bindings={{ d: (t) => pin(t).fill }} />
      {[0, 1, 2, 3].map((shade) => (
        <AnimatedElement key={shade} as="path" className="iso-shade" data-shade={shade} bindings={{ d: (t) => pin(t).shades[shade] || 'M0 0' }} />
      ))}
      <AnimatedElement as="path" className="iso-top" bindings={{ d: (t) => pin(t).top }} />
      <AnimatedElement
        as="path"
        className="iso-line iso-edge"
        bindings={{ d: (t) => pin(t).outline, 'data-tone': (t) => (diffusionLitAt(t) === 'shaker' ? 'lit' : 'hi') }}
      />
    </g>
  );
}

/** The step lever: it rocks forward and back with every click. */
function Lever() {
  const tilt = (t: number) => {
    const moved = stepsMoved(t);
    const k = moved - Math.floor(moved);
    return -0.32 + 0.6 * Math.sin(Math.PI * k);
  };
  const lever = (t: number) => leverAt(tilt(t));
  return (
    <g data-scene-part="step-lever">
      <g className="iso-solid">
        <AnimatedElement as="path" className="iso-fill" bindings={{ d: (t) => lever(t).arm.fill }} />
        {[0, 1, 2, 3].map((shade) => (
          <AnimatedElement key={shade} as="path" className="iso-shade" data-shade={shade} bindings={{ d: (t) => lever(t).arm.shades[shade] || 'M0 0' }} />
        ))}
        <AnimatedElement as="path" className="iso-top" bindings={{ d: (t) => lever(t).arm.top }} />
        <AnimatedElement as="path" className="iso-line iso-edge" data-tone="mid" bindings={{ d: (t) => lever(t).arm.outline }} />
      </g>
      <AnimatedElement as="circle" className="iso-fill" r={r2(leverAt(0).knobR)} bindings={{ cx: (t) => r2(lever(t).knob[0]), cy: (t) => r2(lever(t).knob[1]) }} />
      <AnimatedElement as="circle" className="iso-line" data-tone="hi" fill="none" r={r2(leverAt(0).knobR)} bindings={{ cx: (t) => r2(lever(t).knob[0]), cy: (t) => r2(lever(t).knob[1]) }} />
    </g>
  );
}

function SlotView({ slot }: { slot: Slot }) {
  switch (slot) {
    case 'pins-0-left':
      return <Pins lane={0} which={LEFT_PINS} />;
    case 'pins-0-right':
      return <Pins lane={0} which={RIGHT_PINS} />;
    case 'pins-1-left':
      return <Pins lane={1} which={LEFT_PINS} />;
    case 'pins-1-right':
      return <Pins lane={1} which={RIGHT_PINS} />;
    case 'thread-0':
      return <Thread lane={0} />;
    case 'thread-1':
      return <Thread lane={1} />;
    case 'lens':
      // The camera's lens glass: what the robot sees, the observation every move is drawn for.
      return <path data-scene-mark="observed-state" d={LENS_GLASS} fill="var(--role-state-stage)" />;
    case 'beam':
      // The camera's sight line to the bar, lit while the scene says what the move is drawn for.
      return (
        <AnimatedGroup data-scene-part="sight-line" bindings={{ opacity: (t) => r3(diffusionLitAt(t) === 'camera' ? within(beatProgress(SYMBOLS)(t), 0, 0.15) : 0) }}>
          <path className="iso-line" data-tone="lit" style={{ strokeWidth: 1.1 }} d={BEAM} />
          {/* The emitter's spot on the lens glass, where the sight line leaves. */}
          <Dots points={[BEAM_START]} size={0.9} tone="hi" />
        </AnimatedGroup>
      );
    case 'dial':
      return <Dial />;
    case 'shaker':
      return <Shaker />;
    case 'lever':
      return <Lever />;
    default:
      return null;
  }
}

/** The stage alone, so tests can render any frame inside a static-time provider. */
export function DiffusionStage() {
  return (
    <div className="iso" data-anatomy-drawing="">
      <StageSvg viewBox={VIEW_BOX} className="iso-svg">
        {PARTS.map((part, index) => (part.kind === 'slot' ? <SlotView key={part.slot} slot={part.slot} /> : <PartView key={index} part={part} />))}
      </StageSvg>
    </div>
  );
}

/** The readout follows the scene clock without re-rendering; it is not a live region. */
function DiffusionReadout() {
  const time = useSceneTime();
  const poster = useStaticTime();
  const node = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!time) return;
    const apply = (t: number) => {
      if (node.current) node.current.textContent = diffusionReadoutAt(t);
    };
    apply(time.get());
    return time.on('change', apply);
  }, [time]);
  return <span aria-live="off" ref={node}>{diffusionReadoutAt(poster)}</span>;
}

/** What the scene is and is not: the method note under "How this was made". */
export const DIFFUSION_METHOD_NOTE = `The pin heights come from an illustrative model with fixed random seeds. Each move is ${PIN_COUNT} planned positions, the prediction horizon of the Diffusion Policy paper (Chi et al., 2023, arXiv 2303.04137); training mixes in noise on improved DDPM's square-cosine schedule, and acting runs the ${DENOISING_STEPS} deterministic DDIM steps the paper uses on real robots. The denoiser is the ideal one for a training set of just the two demonstrations, not a trained network’s output.`;

const swatch = (style: Record<string, string>, className: string) => (
  <span aria-hidden className={`inline-block ${className}`} style={style} />
);

export function DiffusionDenoising({ className }: { className?: string }) {
  const { html } = SCENE_EQUATIONS.diffusion;
  return (
    <SceneMount
      scene={SCENE}
      className={className}
      stage={<DiffusionStage />}
      legend={
        <>
          <LegendItem series="diffusion-action" swatch={swatch({ backgroundColor: 'var(--role-action-graphic)' }, 'h-2.5 w-2.5 rounded-full')}>
            pin set to a good move
          </LegendItem>
          <LegendItem series="diffusion-noise" swatch={swatch({ backgroundColor: 'var(--role-reference-graphic)' }, 'h-2.5 w-2.5 rounded-full')}>
            pin still random
          </LegendItem>
          <LegendItem series="followed" swatch={swatch({ backgroundColor: 'var(--role-highlight-graphic)' }, 'h-0.5 w-4')}>
            thread through the pins: the move
          </LegendItem>
        </>
      }
      readout={() => <DiffusionReadout />}
      statusLine="Illustrative: a drawn model of the idea, not a trained robot’s output."
      method={
        <>
          <p>
            In symbols, the policy samples{' '}
            <span data-scene-equation="diffusion" dangerouslySetInnerHTML={{ __html: html }} />
            : an action a is drawn from a distribution of actions conditioned on what the robot
            observes, o. Over the {DENOISING_STEPS} clean-up steps the two guesses&rsquo; average
            distance from the move each lands on falls from{' '}
            <span data-testid="diffusion-dispersion">
              {fixed(GUESS_DISTANCES.start)} {'→'} {fixed(GUESS_DISTANCES.end)}
            </span>
            , measured in arch heights.
          </p>
          <p>
            The guess the scene follows starts {fixed(WORKED_DISTANCES.start)} from its move and ends{' '}
            {fixed(WORKED_DISTANCES.end)} away.
          </p>
          <p>{DIFFUSION_METHOD_NOTE}</p>
          <p>
            The drawing is a pin gauge, two of them side by side. Each pin&rsquo;s height is one planned
            position, and the thread through the pins is the move. The bar is what the camera sees.
            A demonstration arches the thread over the bar or sags it under; a thread pulled straight,
            the average of the two, would run into it. The gauge, the bar and the camera are an
            illustration.
          </p>
          <p>The {BEAT_WORDS} steps, in order:</p>
          <ol>
            {SCENE.beats.map((beat) => (
              <li key={beat.id}>{beat.caption}</li>
            ))}
          </ol>
        </>
      }
      textAlternative={`${SCENE.title}. A ${BEAT_WORDS}-beat scene on two pin gauges, where each pin is one planned position of a move and a thread through the pins is the move, passing a bar the robot's camera sees. ${SCENE.beats
        .map((beat, index) => `Beat ${index + 1}: ${beat.caption}`)
        .join(
          ' ',
        )} The relation a ~ p(a | o) means an action a is sampled from a distribution of actions conditioned on the observed state o. The guess the scene follows starts ${fixed(WORKED_DISTANCES.start)} from its move and ends ${fixed(WORKED_DISTANCES.end)} away; one guess ends ${WHERE[RUNS[0].lands]} and the other ${WHERE[RUNS[1].lands]}, and neither on the straight average that would hit the bar.`}
    />
  );
}

export default DiffusionDenoising;
