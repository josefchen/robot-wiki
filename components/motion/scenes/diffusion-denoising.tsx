'use client';

/**
 * Diffusion-policy denoising, the manipulation reference scene. Sixty
 * possible moves from an illustrative action-space model (two demonstrated
 * ways to make the same move, the Diffusion Policy paper's 10-step DDIM
 * schedule) drawn as motion: the two demonstrated moves, the training noise
 * that blurs every move into one random cloud, the ten clean-up steps that
 * carry the cloud back onto the two moves, guided by what the robot sees,
 * and the finished frame. The poster is that finished frame, with faint
 * trails back to each guess's random start, so the two separate moves show
 * before Play. The sample positions are the model's own; the picture is
 * schematic, with no axes, and the relation a ~ p(a | o) sits in "How this
 * was made".
 */
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg, type PlotArea } from '@/components/motion/stage';
import {
  AnimatedCircle,
  AnimatedElement,
  AnimatedGroup,
} from '@/components/motion/animated';
import { Create, laggedProgress } from '@/components/motion/primitives';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { clamp01, smooth } from '@/components/motion/easing';
import {
  DENOISING_STEPS,
  MODE_CENTERS,
  SAMPLE_COUNT,
  generateDenoisingTrajectory,
  meanDistanceToMode,
} from '@/lib/denoising';
import { SCENE_EQUATIONS } from '@/lib/motion-equations';
import { MOTION_LAG } from '@/lib/motion-tokens';
import { LegendItem } from '@/components/ui/instrument';

const WIDTH = 340;
const HEIGHT = 240;
/**
 * The band the samples move in. Every random start and every finished move
 * stays inside it, so the labels above, below and beside it never meet a
 * sample at any moment of the scene.
 */
const PLOT: PlotArea = { left: 96, right: 244, top: 56, bottom: 208 };
const X_DOMAIN = { min: -3.1, max: 2.7 };
const Y_DOMAIN = { min: -2.75, max: 2.85 };
const FONT = 14;
const DOT_R = 2.8;

const TRAJECTORY = generateDenoisingTrajectory();
/**
 * Box-Muller's Math.log/Math.cos are not bit-portable between the server
 * runtime and the browser, so the sample doubles can differ by an ulp and
 * hydration would flag the geometry. Rounding to nine decimals (the
 * readout shows two) makes both sides agree exactly.
 */
const Q = (x: number): number => Number(x.toFixed(9));
const SAMPLES = TRAJECTORY.targets.map((target, index) => ({
  target: {
    x: Q(target.x),
    y: Q(target.y),
    mode: target.mode,
  },
  noise: {
    x: Q(TRAJECTORY.noise[index].x),
    y: Q(TRAJECTORY.noise[index].y),
  },
}));
const NOISE_DISPERSION = meanDistanceToMode(
  SAMPLES.map((sample) => ({ ...sample.noise, mode: sample.target.mode })),
);
const FINAL_DISPERSION = meanDistanceToMode(SAMPLES.map((sample) => sample.target));

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
        'To act, the robot starts from random guesses and cleans them up in ten small steps, guided by what it sees.',
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

const beatProgress = (index: number) => (t: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);

const xScale = (v: number) =>
  PLOT.left + ((v - X_DOMAIN.min) / (X_DOMAIN.max - X_DOMAIN.min)) * (PLOT.right - PLOT.left);
const yScale = (v: number) =>
  PLOT.bottom - ((v - Y_DOMAIN.min) / (Y_DOMAIN.max - Y_DOMAIN.min)) * (PLOT.bottom - PLOT.top);

/** The model's convergence curve, continuous in the beat's progress. */
const convergence = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
const mixNumber = (a: number, b: number, k: number) => a + (b - a) * k;

const ORIGIN: [number, number] = [xScale(0), yScale(0)];
const MODE_POINTS = MODE_CENTERS.map(
  (center) => [xScale(center.x), yScale(center.y)] as [number, number],
);

/** An arrowhead triangle plus where its shaft should stop. */
function arrowhead(from: readonly [number, number], to: readonly [number, number]) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const headLen = 10;
  const halfWidth = 4.2;
  const tip: [number, number] = [to[0] + ux * headLen * 0.55, to[1] + uy * headLen * 0.55];
  const base: [number, number] = [
    to[0] - ux * headLen * 0.45,
    to[1] - uy * headLen * 0.45,
  ];
  const px = -uy;
  const py = ux;
  return {
    lineEnd: base,
    points: `${tip[0].toFixed(1)},${tip[1].toFixed(1)} ${(base[0] + px * halfWidth).toFixed(1)},${(
      base[1] + py * halfWidth
    ).toFixed(1)} ${(base[0] - px * halfWidth).toFixed(1)},${(base[1] - py * halfWidth).toFixed(1)}`,
  };
}

const ARROWS = MODE_POINTS.map((to) => ({
  head: arrowhead(ORIGIN, to),
  shaft: `M ${ORIGIN[0].toFixed(1)} ${ORIGIN[1].toFixed(1)} L ${arrowhead(ORIGIN, to).lineEnd[0].toFixed(1)} ${arrowhead(
    ORIGIN,
    to,
  ).lineEnd[1].toFixed(1)}`,
}));

/** Arrow i of the demonstration pair draws on during the first beat. */
const arrowProgress = (index: number) => (t: number) =>
  clamp01(beatProgress(0)(t) * 2.4 - index * 0.7);

/**
 * Sample i's position at scene time t, a pure function: clustered for the
 * demonstrations, jittered to its noise draw through the lagged start, and
 * transported back along the model's convergence curve. Tests pin this.
 */
export function diffusionSampleAt(index: number, t: number): [number, number] {
  const { target, noise } = SAMPLES[index];
  if (t < SPANS[1].start) return [target.x, target.y];
  if (t < SPANS[1].end) {
    const k = laggedProgress(
      beatProgress(1)(t),
      index,
      SAMPLE_COUNT,
      MOTION_LAG.dense,
    );
    return [mixNumber(target.x, noise.x, k), mixNumber(target.y, noise.y, k)];
  }
  if (t < SPANS[2].end) {
    const k = convergence(beatProgress(2)(t));
    return [mixNumber(noise.x, target.x, k), mixNumber(noise.y, target.y, k)];
  }
  return [target.x, target.y];
}

/** The reverse-process step the clock is showing, 0..10. */
export function diffusionStepAt(t: number): number {
  if (t < SPANS[2].start) return 0;
  return Math.min(DENOISING_STEPS, Math.round(beatProgress(2)(t) * DENOISING_STEPS));
}

/** Round rendered geometry so server HTML and hydrated DOM agree. */
const r2 = (v: number) => Number(v.toFixed(2));

const [MODE_ONE, MODE_TWO] = MODE_POINTS;
/** The top edge of each finished cluster, where the note's leaders land. */
const clusterTop = (mode: number) =>
  Math.min(...SAMPLES.filter((sample) => sample.target.mode === mode).map((sample) => yScale(sample.target.y))) -
  DOT_R;
const clusterEdge = (mode: number, side: 'left' | 'right') => {
  const xs = SAMPLES.filter((sample) => sample.target.mode === mode).map((sample) => xScale(sample.target.x));
  return side === 'left' ? Math.min(...xs) - DOT_R - 3 : Math.max(...xs) + DOT_R + 3;
};

const STATUS_Y = 21;
const NOTE_LINE = 18;
const LABEL_Y = 229;

/** Which of the status lines above the samples is showing at time t. */
function statusShare(variant: 'demo' | 'noise' | number, t: number): number {
  if (variant === 'demo') return t <= SPANS[0].end ? 1 : 0;
  if (variant === 'noise') return t > SPANS[0].end && t <= SPANS[1].end ? 1 : 0;
  if (t > SPANS[1].end && t <= SPANS[2].end) return diffusionStepAt(t) === variant ? 1 : 0;
  // The last count gives way to the note early in the final beat.
  if (t > SPANS[2].end && variant === DENOISING_STEPS) {
    return r2(1 - clamp01(beatProgress(3)(t) / 0.4));
  }
  return 0;
}

const noteShare = (t: number) => r2(smooth(clamp01((beatProgress(3)(t) - 0.4) / 0.6)));

function DiffusionStage() {
  const dotsIn = (t: number) => smooth(clamp01((beatProgress(0)(t) - 0.7) / 0.3));
  const actionShare = (t: number) => {
    if (t < SPANS[1].start) return 1;
    if (t < SPANS[1].end) return 1 - smooth(beatProgress(1)(t));
    return convergence(beatProgress(2)(t));
  };
  const leaderShare = (t: number) => r2(0.7 * actionShare(t) * dotsIn(t));

  return (
    <StageSvg viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      {/* Always painted, so it is the stage's first text: the observed state
          every move is chosen given. Its leader and dot are drawn below. */}
      <text
        x={r2(ORIGIN[0])}
        y={LABEL_Y}
        textAnchor="middle"
        fontSize={FONT}
        fill="var(--role-state-stage)"
      >
        what the robot sees
      </text>
      {/* Status line above the samples: one sentence per beat. */}
      <AnimatedElement
        as="text"
        x={WIDTH / 2}
        y={STATUS_Y}
        textAnchor="middle"
        fontSize={FONT}
        fill="var(--motion-stage-label)"
        bindings={{ opacity: (t) => statusShare('demo', t) }}
      >
        Two demonstrated moves
      </AnimatedElement>
      <AnimatedElement
        as="text"
        x={WIDTH / 2}
        y={STATUS_Y}
        textAnchor="middle"
        fontSize={FONT}
        fill="var(--motion-stage-label)"
        bindings={{ opacity: (t) => statusShare('noise', t) }}
      >
        Random guesses
      </AnimatedElement>
      {Array.from({ length: DENOISING_STEPS + 1 }, (_, k) => (
        <AnimatedElement
          as="text"
          key={`step-${k}`}
          x={WIDTH / 2}
          y={STATUS_Y}
          textAnchor="middle"
          fontSize={FONT}
          fill="var(--motion-stage-label)"
          bindings={{ opacity: (t) => statusShare(k, t) }}
        >
          {`Clean-up step ${k} of ${DENOISING_STEPS}`}
        </AnimatedElement>
      ))}

      {/* Faint trails from each random start to where it finished. */}
      <AnimatedGroup
        data-scene-structure="denoising-trails"
        bindings={{ opacity: (t) => r2(0.5 * smooth(beatProgress(3)(t))) }}
      >
        {SAMPLES.map((sample, index) => (
          <line
            key={`trail-${index}`}
            x1={r2(xScale(sample.noise.x))}
            y1={r2(yScale(sample.noise.y))}
            x2={r2(xScale(sample.target.x))}
            y2={r2(yScale(sample.target.y))}
            stroke="var(--role-reference-stage)"
            strokeWidth={0.8}
          />
        ))}
      </AnimatedGroup>

      {/* What the robot sees: every move is chosen given this. */}
      <line
        data-scene-structure="observed-state-leader"
        x1={r2(ORIGIN[0])}
        y1={LABEL_Y - 16}
        x2={r2(ORIGIN[0])}
        y2={r2(ORIGIN[1] + 7)}
        stroke="var(--role-state-stage)"
        strokeWidth={1}
        opacity={0.6}
      />
      <AnimatedCircle
        data-scene-mark="observed-state"
        cx={r2(ORIGIN[0])}
        cy={r2(ORIGIN[1])}
        r={4.5}
        fill="var(--role-state-stage)"
        bindings={{ opacity: (t) => Number(smooth(clamp01(beatProgress(0)(t) * 3)).toFixed(3)) }}
      />

      {/* Demonstration arrows: action-coloured while clean, dashed
          reference outlines while the cloud is noised or denoising. */}
      {ARROWS.map((arrow, index) => (
        <g key={`demo-${index}`}>
          <AnimatedGroup
            bindings={{ opacity: (t) => Number(actionShare(t).toFixed(3)) }}
          >
            <Create
              data-scene-mark={`demonstration-${index}`}
              d={arrow.shaft}
              progress={arrowProgress(index)}
              roleVar="var(--role-action-stage)"
              strokeWidth={2}
            />
            <AnimatedElement
              as="polygon"
              data-scene-mark={`action-arrow-${index}`}
              points={arrow.head.points}
              fill="var(--role-action-stage)"
              bindings={{
                opacity: (t) =>
                  Number(clamp01((arrowProgress(index)(t) - 0.75) / 0.25).toFixed(3)),
              }}
            />
          </AnimatedGroup>
          <AnimatedElement
            as="polygon"
            data-scene-mark={`reference-arrow-${index}`}
            points={arrow.head.points}
            fill="var(--role-reference-stage)"
            bindings={{
              opacity: (t) => Number(((1 - actionShare(t)) * 0.55).toFixed(3)),
            }}
          />
        </g>
      ))}

      {/* The samples: one gray and one action dot per sample, crossfaded
          so colour tracks meaning without interpolating hex channels. */}
      {SAMPLES.map((_sample, index) => {
        const cx = (t: number) => Number(xScale(diffusionSampleAt(index, t)[0]).toFixed(2));
        const cy = (t: number) => Number(yScale(diffusionSampleAt(index, t)[1]).toFixed(2));
        return (
          <g key={`sample-${index}`}>
            <AnimatedCircle
              data-scene-mark={`noise-${index}`}
              r={DOT_R}
              fill="var(--role-reference-stage)"
              bindings={{
                cx,
                cy,
                opacity: (t) => Number((dotsIn(t) * (1 - actionShare(t))).toFixed(3)),
              }}
            />
            <AnimatedCircle
              data-scene-mark={`action-${index}`}
              r={DOT_R}
              fill="var(--role-action-stage)"
              bindings={{
                cx,
                cy,
                opacity: (t) => Number((dotsIn(t) * actionShare(t)).toFixed(3)),
              }}
            />
          </g>
        );
      })}

      {/* The two moves, named beside the clusters they finish in. */}
      <AnimatedElement
        as="line"
        data-scene-structure="move-one-leader"
        x1={PLOT.left - 6}
        y1={r2(MODE_ONE[1])}
        x2={r2(clusterEdge(0, 'left'))}
        y2={r2(MODE_ONE[1])}
        stroke="var(--motion-stage-label-secondary)"
        strokeWidth={1}
        bindings={{ opacity: leaderShare }}
      />
      <text
        x={PLOT.left - 8}
        y={r2(MODE_ONE[1] + 5)}
        textAnchor="end"
        fontSize={FONT}
        fill="var(--motion-stage-label)"
      >
        move one
      </text>
      <AnimatedElement
        as="line"
        data-scene-structure="move-two-leader"
        x1={r2(clusterEdge(1, 'right'))}
        y1={r2(MODE_TWO[1])}
        x2={PLOT.right + 6}
        y2={r2(MODE_TWO[1])}
        stroke="var(--motion-stage-label-secondary)"
        strokeWidth={1}
        bindings={{ opacity: leaderShare }}
      />
      <text
        x={PLOT.right + 8}
        y={r2(MODE_TWO[1] + 5)}
        textAnchor="start"
        fontSize={FONT}
        fill="var(--motion-stage-label)"
      >
        move two
      </text>

      {/* The one highlight note, pointing at both finished clusters. */}
      <AnimatedElement as="g" data-figure-annotation="" bindings={{ opacity: noteShare }}>
        <g data-scene-structure="note-leaders" stroke="var(--role-highlight-stage)" strokeWidth={1.5}>
          <line x1={r2(MODE_ONE[0])} y1={STATUS_Y + NOTE_LINE + 8} x2={r2(MODE_ONE[0])} y2={r2(clusterTop(0) - 3)} />
          <line x1={r2(MODE_TWO[0])} y1={STATUS_Y + NOTE_LINE + 8} x2={r2(MODE_TWO[0])} y2={r2(clusterTop(1) - 3)} />
        </g>
        <text
          x={WIDTH / 2}
          y={STATUS_Y}
          textAnchor="middle"
          fontSize={FONT}
          fontWeight={600}
          fill="var(--role-highlight-stage)"
        >
          <tspan x={WIDTH / 2} dy={0}>Two valid moves, kept apart</tspan>
          <tspan x={WIDTH / 2} dy={NOTE_LINE}>instead of averaged into one</tspan>
        </text>
      </AnimatedElement>
    </StageSvg>
  );
}

/** What the scene is and is not: the method note under "How this was made". */
export const DIFFUSION_METHOD_NOTE = `The sample positions come from an illustrative two-move model with a fixed random seed: ${SAMPLE_COUNT} samples run through the ${DENOISING_STEPS}-step DDIM inference schedule used in the Diffusion Policy paper (Chi et al., 2023, arXiv 2303.04137). The cloud, the arrows and the trails are a schematic, not a trained network\u2019s outputs.`;

export function DiffusionDenoising({ className }: { className?: string }) {
  const { html } = SCENE_EQUATIONS.diffusion;
  return (
    <SceneMount
      scene={SCENE}
      className={className}
      stage={<DiffusionStage />}
      legend={
        <>
          <LegendItem
            series="diffusion-action"
            swatch={
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: 'var(--role-action-graphic)' }}
              />
            }
          >
            possible move
          </LegendItem>
          <LegendItem
            series="diffusion-noise"
            swatch={
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: 'var(--role-reference-graphic)' }}
              />
            }
          >
            random guess
          </LegendItem>
        </>
      }
      readout={() => (
        <>
          {SAMPLE_COUNT} random guesses, cleaned up in {DENOISING_STEPS} steps
        </>
      )}
      statusLine="Illustrative: a drawn model of the idea, not a trained robot’s output."
      method={
        <>
          <p>
            In symbols, the policy samples{' '}
            <span data-scene-equation="diffusion" dangerouslySetInnerHTML={{ __html: html }} />
            : an action a is drawn from a distribution of actions conditioned on what the robot
            observes, o. Over the {DENOISING_STEPS} clean-up steps the average distance from a
            sample to its move falls from{' '}
            <span data-testid="diffusion-dispersion">
              {NOISE_DISPERSION.toFixed(2)} {'\u2192'} {FINAL_DISPERSION.toFixed(2)}
            </span>
            .
          </p>
          <p>{DIFFUSION_METHOD_NOTE}</p>
          <p>The four steps, in order:</p>
          <ol>
            {SCENE.beats.map((beat) => (
              <li key={beat.id}>{beat.caption}</li>
            ))}
          </ol>
        </>
      }
      textAlternative={`${SCENE.title}. A four-beat scene among possible robot moves. ${SCENE.beats.map(
        (beat, index) => `Beat ${index + 1}: ${beat.caption}`,
      ).join(
        ' ',
      )} The relation a ~ p(a | o) means an action a is sampled from a distribution of actions conditioned on the observed state o. Mean distance from a sample to its mode falls from ${NOISE_DISPERSION.toFixed(2)} to ${FINAL_DISPERSION.toFixed(2)} over the ten steps.`}
    />
  );
}

export default DiffusionDenoising;
