'use client';

/**
 * Diffusion-policy denoising — the manipulation reference scene. The
 * illustrative action-space model from lib/denoising.ts (60 samples, the
 * paper's 10-step DDIM schedule, two demonstration modes) drawn as motion:
 * the clean demonstration arrows, the forward noising that jitters every
 * action into one Gaussian cloud, the ten reverse steps that transport the
 * cloud back onto the modes while conditioned on the observed state, and
 * the recap still. The sample positions are the model's own; the picture
 * is schematic. Status: illustrative.
 */
import { SceneMount } from '@/components/motion/scene-mount';
import { StageGrid, StageSvg, type PlotArea } from '@/components/motion/stage';
import {
  AnimatedCircle,
  AnimatedElement,
  AnimatedGroup,
  AnimatedLine,
} from '@/components/motion/animated';
import { Create, laggedProgress } from '@/components/motion/primitives';
import { SceneEquation } from '@/components/motion/scene-equation';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { clamp01, smooth } from '@/components/motion/easing';
import {
  DENOISING_STEPS,
  MODE_CENTERS,
  SAMPLE_COUNT,
  generateDenoisingTrajectory,
  meanDistanceToMode,
} from '@/lib/denoising';
import { MOTION_LAG } from '@/lib/motion-tokens';
import { LegendItem } from '@/components/ui/instrument';

const WIDTH = 340;
const HEIGHT = 240;
const PLOT: PlotArea = { left: 58, right: 288, top: 57, bottom: 184 };
const X_DOMAIN = { min: -3.5, max: 3.5 };
const Y_DOMAIN = { min: -3.2, max: 3.2 };
const FONT = 14;
const TICK_FONT = 10;

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
  beats: [
    {
      id: 'demos',
      caption:
        'Demonstrations: from the observed state o, two clean action trajectories, one per strategy.',
    },
    {
      id: 'forward-noise',
      duration: 'long',
      caption:
        'Forward noising: each demonstrated action is jittered into one shared Gaussian cloud.',
    },
    {
      id: 'reverse-steps',
      duration: 'long',
      linear: true,
      caption:
        'Reverse: conditioned on the observed state o, ten denoising steps transport the cloud back onto the two modes.',
    },
    {
      id: 'recap',
      duration: 'long',
      caption:
        'Recap: ten steps of denoising conditioned on o recover both action modes; the samples stay in two clusters.',
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

function DiffusionStage() {
  const dotsIn = (t: number) => smooth(clamp01((beatProgress(0)(t) - 0.7) / 0.3));
  const actionShare = (t: number) => {
    if (t < SPANS[1].start) return 1;
    if (t < SPANS[1].end) return 1 - smooth(beatProgress(1)(t));
    return convergence(beatProgress(2)(t));
  };

  return (
    <StageSvg viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <StageGrid
        plot={PLOT}
        xTicks={[-2, 0, 2]}
        yTicks={[-2, 0, 2]}
        xScale={xScale}
        yScale={yScale}
      />
      {[-2, 0, 2].map((tick) => (
        <text
          key={`tx-${tick}`}
          x={xScale(tick)}
          y={PLOT.bottom + 13}
          textAnchor="middle"
          fontSize={TICK_FONT}
          fontFamily="var(--font-mono)"
          data-scene-tick
          fill="var(--motion-stage-label-secondary)"
        >
          {tick}
        </text>
      ))}
      {[-2, 0, 2].map((tick) => (
        <text
          key={`ty-${tick}`}
          x={PLOT.left - 6}
          y={yScale(tick) + 4}
          textAnchor="end"
          fontSize={TICK_FONT}
          fontFamily="var(--font-mono)"
          data-scene-tick
          fill="var(--motion-stage-label-secondary)"
        >
          {tick}
        </text>
      ))}
      <text
        x={19}
        y={(PLOT.top + PLOT.bottom) / 2}
        fontSize={13}
        fill="var(--motion-stage-label-secondary)"
        transform={`rotate(-90 19 ${(PLOT.top + PLOT.bottom) / 2})`}
        textAnchor="middle"
      >
        a2
      </text>
      <text
        x={PLOT.right}
        y={HEIGHT - 12}
        fontSize={13}
        fill="var(--motion-stage-label-secondary)"
        textAnchor="end"
      >
        a1
      </text>

      {/* The observed state every action is conditioned on. */}
      <AnimatedCircle
        data-scene-mark="observed-state"
        cx={ORIGIN[0]}
        cy={ORIGIN[1]}
        r={4.5}
        fill="var(--role-state-stage)"
        bindings={{ opacity: (t) => Number(smooth(beatProgress(0)(t)).toFixed(3)) }}
      />
      <AnimatedElement
        as="text"
        x={63}
        y={49}
        fontSize={FONT}
        fill="var(--role-state-stage)"
        bindings={{ opacity: (t) => Number(smooth(beatProgress(0)(t)).toFixed(3)) }}
      >
        observed state
      </AnimatedElement>
      <AnimatedLine
        data-scene-structure="observed-state-leader"
        x1={72}
        y1={52}
        x2={ORIGIN[0] - 7}
        y2={ORIGIN[1] - 7}
        stroke="var(--role-state-stage)"
        strokeWidth={1}
        bindings={{ opacity: (t) => Number((0.6 * smooth(beatProgress(0)(t))).toFixed(3)) }}
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
              r={2.6}
              fill="var(--role-reference-stage)"
              bindings={{
                cx,
                cy,
                opacity: (t) => Number((dotsIn(t) * (1 - actionShare(t))).toFixed(3)),
              }}
            />
            <AnimatedCircle
              data-scene-mark={`action-${index}`}
              r={2.6}
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

      {/* Reverse-process step counter: only the current step's label. */}
      {Array.from({ length: DENOISING_STEPS + 1 }, (_, k) => (
        <AnimatedElement
          as="text"
          key={`step-${k}`}
          x={216}
          y={49}
          fontSize={FONT}
          fontFamily="var(--font-mono)"
          data-scene-readout
          fill="var(--motion-stage-label)"
          bindings={{
            opacity: (t) => (t >= SPANS[2].start && diffusionStepAt(t) === k ? 1 : 0),
          }}
        >
          {`step ${k} / ${DENOISING_STEPS}`}
        </AnimatedElement>
      ))}

      <SceneEquation equation="diffusion" x={92} width={156} progress={(t) => Number(smooth(beatProgress(3)(t)).toFixed(3))} />
    </StageSvg>
  );
}

export function DiffusionDenoising({ className }: { className?: string }) {
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
              <svg width={18} height={10} aria-hidden className="shrink-0">
                <line
                  x1={0}
                  y1={5}
                  x2={12}
                  y2={5}
                  stroke="var(--role-action-graphic)"
                  strokeWidth={2}
                />
                <polygon points="18,5 11,1.8 11,8.2" fill="var(--role-action-graphic)" />
              </svg>
            }
          >
            action sample
          </LegendItem>
          <LegendItem
            series="diffusion-state"
            swatch={
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: 'var(--role-state-graphic)' }}
              />
            }
          >
            observed state o
          </LegendItem>
          <LegendItem
            series="diffusion-noise"
            swatch={
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: 'var(--role-reference-graphic)' }}
              />
            }
          >
            noised points
          </LegendItem>
          <LegendItem
            series="diffusion-recap"
            swatch={
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: 'var(--role-highlight-graphic)' }}
              />
            }
          >
            recap (Indicate)
          </LegendItem>
        </>
      }
      readout={() => (
        <>
          <span className="text-text-dim">samples</span>{' '}
          <span className="text-text">{SAMPLE_COUNT}</span>{' '}
          <span className="text-text-dim">steps</span>{' '}
          <span className="text-text">{DENOISING_STEPS}</span>{' '}
          <span className="text-text-dim">dispersion</span>{' '}
          <span data-testid="diffusion-dispersion" className="text-text">
            {NOISE_DISPERSION.toFixed(2)} {'\u2192'} {FINAL_DISPERSION.toFixed(2)}
          </span>
        </>
      )}
      statusLine={
        <>
          Illustrative action-space model (status: illustrative): the sample
          positions and the 10-step schedule come from the denoising model
          in lib/denoising.ts, after the DDIM inference configuration of the
          Diffusion Policy paper (arXiv:2303.04137); the cloud and arrows
          are a schematic, not a trained network{'\u2019'}s outputs.
        </>
      }
      textAlternative={`${SCENE.title}. A four-beat scene in a two-dimensional action space. ${SCENE.beats.map(
        (beat, index) => `Beat ${index + 1}: ${beat.caption}`,
      ).join(
        ' ',
      )} The relation a ~ p(a | o) means an action a is sampled from a distribution of actions conditioned on the observed state o. Mean distance from a sample to its mode falls from ${NOISE_DISPERSION.toFixed(2)} to ${FINAL_DISPERSION.toFixed(2)} over the ten steps.`}
    />
  );
}

export default DiffusionDenoising;
