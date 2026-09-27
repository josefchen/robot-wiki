'use client';

/**
 * Kalman predict and update — the classical state-estimation reference
 * scene. One step of the seeded constant-velocity filter from lib/kalman.ts
 * (seed 1, matched beliefs sigma q 0.20, sigma r 1.00), drawn in the
 * position-velocity belief space: the prior belief, the predict step that
 * moves the mean and grows the ellipse, the arriving measurement, the
 * update that fuses them with the gain K indicated, and the recap with the
 * recursion written out. The numbers are the real filter recursion, not a
 * drawing; the belief-space picture is a schematic.
 */
import { SceneMount } from '@/components/motion/scene-mount';
import { StageGrid, StageSvg, type PlotArea } from '@/components/motion/stage';
import { AnimatedCircle, AnimatedEllipse, AnimatedElement, AnimatedGroup, AnimatedLine } from '@/components/motion/animated';
import { Indicate } from '@/components/motion/primitives';
import { SceneEquation } from '@/components/motion/scene-equation';
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
import { MOTION_UNCERTAINTY } from '@/lib/motion-tokens';
import { LegendItem } from '@/components/ui/instrument';

const WIDTH = 340;
const HEIGHT = 240;
const PLOT: PlotArea = { left: 58, right: 288, top: 57, bottom: 184 };
const X_DOMAIN = { min: -3.4, max: 3.8 };
const V_DOMAIN = { min: -1.4, max: 1.65 };
const FONT = 14;
const TICK_FONT = 10;

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
 * every displayed digit (the readout shows two) while making the server
 * and client agree exactly.
 */
const Q = (x: number): number => Number(x.toFixed(9));
const quantizeDetail = (detail: KalmanStepDetail): KalmanStepDetail => ({
  t: detail.t,
  prior: {
    mean: [Q(detail.prior.mean[0]), Q(detail.prior.mean[1])],
    cov: {
      p00: Q(detail.prior.cov.p00),
      p01: Q(detail.prior.cov.p01),
      p11: Q(detail.prior.cov.p11),
    },
  },
  predicted: {
    mean: [Q(detail.predicted.mean[0]), Q(detail.predicted.mean[1])],
    cov: {
      p00: Q(detail.predicted.cov.p00),
      p01: Q(detail.predicted.cov.p01),
      p11: Q(detail.predicted.cov.p11),
    },
  },
  measurement: detail.measurement === null ? null : Q(detail.measurement),
  posterior: {
    mean: [Q(detail.posterior.mean[0]), Q(detail.posterior.mean[1])],
    cov: {
      p00: Q(detail.posterior.cov.p00),
      p01: Q(detail.posterior.cov.p01),
      p11: Q(detail.posterior.cov.p11),
    },
  },
  gain: Q(detail.gain),
});
const DETAIL = quantizeDetail(KALMAN_STEP_DETAIL);

const SCENE: SceneDefinition = {
  id: 'kalman-predict-update',
  title: 'Kalman filter: predict and update',
  beats: [
    {
      id: 'prior',
      caption:
        'The prior belief: a state estimate in position and velocity, carried by its own two-sigma uncertainty ellipse.',
    },
    {
      id: 'predict',
      duration: 'long',
      caption:
        'Predict: the constant-velocity model moves the mean one step along, and process noise grows the ellipse.',
    },
    {
      id: 'measurement',
      caption:
        'A measurement arrives: the position reading z is noisier than the prediction and constrains position only.',
    },
    {
      id: 'update',
      duration: 'long',
      caption:
        'Update: the gain K slides the estimate toward z, and the two beliefs combine into a narrower posterior.',
    },
    {
      id: 'recap',
      duration: 'long',
      caption:
        'The step, written out: the posterior becomes the next prior, and K decides how far the reading moves it.',
    },
  ],
};
/** The scene definition, exported for the player-level tests. */
export const KALMAN_SCENE = SCENE;
const SPANS = beatSpans(SCENE.beats);

const beatProgress = (index: number) => (t: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);

const xScale = (v: number) =>
  PLOT.left + ((v - X_DOMAIN.min) / (X_DOMAIN.max - X_DOMAIN.min)) * (PLOT.right - PLOT.left);
const yScale = (v: number) =>
  PLOT.bottom - ((v - V_DOMAIN.min) / (V_DOMAIN.max - V_DOMAIN.min)) * (PLOT.bottom - PLOT.top);

interface Belief {
  mean: [number, number];
  cov: Cov2;
}

const mixNumber = (a: number, b: number, k: number) => a + (b - a) * k;

function mixBelief(a: Belief, b: Belief, k: number): Belief {
  return {
    mean: [mixNumber(a.mean[0], b.mean[0], k), mixNumber(a.mean[1], b.mean[1], k)],
    cov: {
      p00: mixNumber(a.cov.p00, b.cov.p00, k),
      p01: mixNumber(a.cov.p01, b.cov.p01, k),
      p11: mixNumber(a.cov.p11, b.cov.p11, k),
    },
  };
}

/** The 2-sigma ellipse of a 2x2 covariance, in stage units. */
export function covarianceEllipse(cov: Cov2): {
  rx: number;
  ry: number;
  angleDeg: number;
} {
  const trace = cov.p00 + cov.p11;
  const diff = cov.p00 - cov.p11;
  const discriminant = Math.sqrt(diff * diff + 4 * cov.p01 * cov.p01);
  const major = (trace + discriminant) / 2;
  const minor = (trace - discriminant) / 2;
  const angle = Math.atan2(2 * cov.p01, diff) / 2;
  // atan2 and sqrt are not bit-portable across runtimes; rounding the
  // ellipse parameters keeps the server and client transforms identical.
  const round = (value: number) => Number(value.toFixed(9));
  return {
    rx: round(2 * Math.sqrt(Math.max(major, 0))),
    ry: round(2 * Math.sqrt(Math.max(minor, 0))),
    angleDeg: round((angle * 180) / Math.PI),
  };
}

const PRIOR: Belief = {
  mean: DETAIL.prior.mean,
  cov: DETAIL.prior.cov,
};
const PREDICTED: Belief = {
  mean: DETAIL.predicted.mean,
  cov: DETAIL.predicted.cov,
};
const POSTERIOR: Belief = {
  mean: DETAIL.posterior.mean,
  cov: DETAIL.posterior.cov,
};
const READING = DETAIL.measurement as number;
const GAIN = DETAIL.gain;

/**
 * The whole scene as a pure function of scene time: which belief the main
 * object holds, and where every mark sits. Tests pin this determinism.
 */
export function kalmanFrameAt(t: number) {
  const p1 = smooth(beatProgress(1)(t));
  const p3 = smooth(beatProgress(3)(t));
  let belief = PRIOR;
  if (t >= SPANS[1].end) belief = PREDICTED;
  if (t >= SPANS[3].end) belief = POSTERIOR;
  if (t >= SPANS[1].start && t < SPANS[1].end) belief = mixBelief(PRIOR, PREDICTED, p1);
  if (t >= SPANS[3].start && t < SPANS[3].end) {
    belief = mixBelief(PREDICTED, POSTERIOR, p3);
  }
  return { belief };
}

const priorEllipse = covarianceEllipse(PRIOR.cov);
const predictedEllipse = covarianceEllipse(PREDICTED.cov);

const priorX = xScale(PRIOR.mean[0]);
const priorY = yScale(PRIOR.mean[1]);
const predX = xScale(PREDICTED.mean[0]);
const readingX = xScale(READING);
const readingY = yScale(PREDICTED.mean[1]);
const gainPointX = predX + GAIN * (readingX - predX);

function KalmanStage() {
  const beliefEllipse = (t: number) => {
    const { belief } = kalmanFrameAt(t);
    const ellipse = covarianceEllipse(belief.cov);
    return {
      cx: xScale(belief.mean[0]),
      cy: yScale(belief.mean[1]),
      rx: (ellipse.rx / (X_DOMAIN.max - X_DOMAIN.min)) * (PLOT.right - PLOT.left),
      ry: (ellipse.ry / (V_DOMAIN.max - V_DOMAIN.min)) * (PLOT.bottom - PLOT.top),
      angleDeg: ellipse.angleDeg,
    };
  };

  return (
    <StageSvg viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <StageGrid
        plot={PLOT}
        xTicks={[-2, 0, 2]}
        yTicks={[-1, 0, 1]}
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
      {[-1, 0, 1].map((tick) => (
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
        velocity v
      </text>
      <text
        x={PLOT.right}
        y={HEIGHT - 12}
        fontSize={13}
        fill="var(--motion-stage-label-secondary)"
        textAnchor="end"
      >
        position x
      </text>

      {/* Ghost outlines mark where the belief was before each move. */}
      <AnimatedGroup
        fill="none"
        stroke="var(--role-reference-stage)"
        strokeWidth={1.5}
        strokeDasharray="5 4"
        bindings={{
          opacity: (t) => Number((0.55 * smooth(clamp01(beatProgress(1)(t) * 1.6))).toFixed(3)),
        }}
      >
        <ellipse
          data-scene-mark="prior-outline"
          cx={priorX}
          cy={priorY}
          rx={(priorEllipse.rx / (X_DOMAIN.max - X_DOMAIN.min)) * (PLOT.right - PLOT.left)}
          ry={(priorEllipse.ry / (V_DOMAIN.max - V_DOMAIN.min)) * (PLOT.bottom - PLOT.top)}
          transform={`rotate(${priorEllipse.angleDeg} ${priorX} ${priorY})`}
        />
      </AnimatedGroup>
      <AnimatedGroup
        fill="none"
        stroke="var(--role-reference-stage)"
        strokeWidth={1.5}
        strokeDasharray="5 4"
        bindings={{
          opacity: (t) => Number((0.55 * smooth(beatProgress(3)(t))).toFixed(3)),
        }}
      >
        <ellipse
          data-scene-mark="predicted-outline"
          cx={predX}
          cy={priorY}
          rx={(predictedEllipse.rx / (X_DOMAIN.max - X_DOMAIN.min)) * (PLOT.right - PLOT.left)}
          ry={(predictedEllipse.ry / (V_DOMAIN.max - V_DOMAIN.min)) * (PLOT.bottom - PLOT.top)}
          transform={`rotate(${predictedEllipse.angleDeg} ${predX} ${priorY})`}
        />
      </AnimatedGroup>

      {/* The motion model moves the mean; the arrow stays as its record. */}
      <AnimatedLine
        data-scene-mark="model-motion"
        x1={priorX}
        y1={priorY}
        stroke="var(--role-state-stage)"
        strokeWidth={2}
        bindings={{
          x2: (t) => {
            const { belief } = kalmanFrameAt(t);
            return Number(xScale(belief.mean[0]).toFixed(2));
          },
          y2: (t) => {
            const { belief } = kalmanFrameAt(t);
            return Number(yScale(belief.mean[1]).toFixed(2));
          },
          opacity: (t) => (t >= SPANS[1].end ? 0.45 : 1),
        }}
      />

      {/* The measurement and its position-only uncertainty. */}
      <AnimatedGroup
        bindings={{
          opacity: (t) => Number(smooth(beatProgress(2)(t)).toFixed(3)),
        }}
      >
        <ellipse
          data-scene-mark="measurement-uncertainty"
          cx={readingX}
          cy={readingY}
          rx={(2 * DEFAULT_SETTINGS.sigmaR / (X_DOMAIN.max - X_DOMAIN.min)) * (PLOT.right - PLOT.left)}
          ry={(PLOT.bottom - PLOT.top) / 2 - 6}
          fill="var(--role-measurement-stage)"
          fillOpacity={MOTION_UNCERTAINTY.fillAlpha}
          stroke="var(--role-measurement-stage)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
        <line
          data-scene-mark="measurement-cross-horizontal"
          x1={readingX - 7}
          x2={readingX + 7}
          y1={readingY}
          y2={readingY}
          stroke="var(--role-measurement-stage)"
          strokeWidth={2.5}
        />
        <line
          data-scene-mark="measurement-cross-vertical"
          x1={readingX}
          x2={readingX}
          y1={readingY - 7}
          y2={readingY + 7}
          stroke="var(--role-measurement-stage)"
          strokeWidth={2.5}
        />
        <text
          x={252}
          y={49}
          fontSize={FONT}
          fill="var(--role-measurement-stage)"
        >
          reading z
        </text>
        <line data-scene-structure="reading-leader" x1={257} y1={52} x2={readingX} y2={readingY - 10} stroke="var(--role-measurement-stage)" strokeWidth={1} opacity={0.6} />
      </AnimatedGroup>

      {/* The update segment and the gain point on it. */}
      <AnimatedGroup bindings={{ opacity: (t) => Number(smooth(beatProgress(3)(t)).toFixed(3)) }}>
        <line
          data-scene-mark="update-segment"
          x1={predX}
          y1={readingY}
          x2={readingX}
          y2={readingY}
          stroke="var(--role-reference-stage)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
      </AnimatedGroup>
      <Indicate
        cx={gainPointX}
        cy={readingY}
        progress={(t) => clamp01((beatProgress(3)(t) - 0.45) / 0.55)}
      >
        <AnimatedCircle
          data-scene-mark="gain-point"
          r={4}
          cy={readingY}
          fill="var(--role-state-stage)"
          bindings={{
            cx: (t) => Number(mixNumber(predX, gainPointX, smooth(beatProgress(3)(t))).toFixed(2)),
          }}
        />
      </Indicate>
      <AnimatedElement
        as="text"
        fontSize={FONT}
        fill="var(--motion-stage-label)"
        x={195}
        y={49}
        bindings={{
          opacity: (t) => Number((smooth(beatProgress(3)(t)) * (1 - smooth(beatProgress(4)(t)))).toFixed(3)),
        }}
      >
        gain K
      </AnimatedElement>
      <AnimatedLine
        data-scene-structure="gain-leader"
        x1={199}
        y1={52}
        x2={gainPointX}
        y2={readingY - 8}
        stroke="var(--role-state-stage)"
        strokeWidth={1}
        bindings={{ opacity: (t) => Number((0.6 * smooth(beatProgress(3)(t)) * (1 - smooth(beatProgress(4)(t)))).toFixed(3)) }}
      />

      {/* The belief itself: one dot and one ellipse, transforming. */}
      <AnimatedEllipse
        data-scene-mark="belief-uncertainty"
        fill="var(--role-state-stage)"
        fillOpacity={MOTION_UNCERTAINTY.fillAlpha}
        stroke="var(--role-state-stage)"
        strokeWidth={2}
        strokeDasharray="6 4"
        bindings={{
          cx: (t) => Number(beliefEllipse(t).cx.toFixed(2)),
          cy: (t) => Number(beliefEllipse(t).cy.toFixed(2)),
          rx: (t) => Number(beliefEllipse(t).rx.toFixed(2)),
          ry: (t) => Number(beliefEllipse(t).ry.toFixed(2)),
          transform: (t) =>
            `rotate(${beliefEllipse(t).angleDeg.toFixed(2)} ${beliefEllipse(t).cx.toFixed(2)} ${beliefEllipse(t).cy.toFixed(2)})`,
        }}
      />
      <AnimatedCircle
        data-scene-mark="belief-mean"
        r={5}
        fill="var(--role-state-stage)"
        bindings={{
          cx: (t) => Number(beliefEllipse(t).cx.toFixed(2)),
          cy: (t) => Number(beliefEllipse(t).cy.toFixed(2)),
        }}
      />
      <AnimatedElement
        as="text"
        fontSize={FONT}
        fill="var(--motion-stage-label)"
        x={63}
        y={49}
        bindings={{
          opacity: (t) =>
            Number(
              (
                smooth(beatProgress(0)(t)) *
                (1 - smooth(beatProgress(2)(t)))
              ).toFixed(3),
            ),
        }}
      >
        estimate
      </AnimatedElement>
      <AnimatedLine
        data-scene-structure="estimate-leader"
        x1={71}
        y1={52}
        x2={priorX}
        y2={priorY - 8}
        stroke="var(--role-state-stage)"
        strokeWidth={1}
        bindings={{ opacity: (t) => Number((0.6 * smooth(beatProgress(0)(t)) * (1 - smooth(beatProgress(2)(t)))).toFixed(3)) }}
      />

      {/* Recap: the recursion written out, K indicated once. */}
      <SceneEquation equation="kalman" x={38} width={264} progress={(t) => Number(smooth(beatProgress(4)(t)).toFixed(3))} />
    </StageSvg>
  );
}

const SIGMA_PRIOR = Math.sqrt(PRIOR.cov.p00);
const SIGMA_PRED = Math.sqrt(PREDICTED.cov.p00);
const SIGMA_POST = Math.sqrt(POSTERIOR.cov.p00);

export function KalmanPredictUpdate({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={SCENE}
      className={className}
      stage={<KalmanStage />}
      legend={
        <>
          <LegendItem
            series="kalman-estimate"
            swatch={
              <svg width={16} height={10} aria-hidden className="shrink-0">
                <circle cx={8} cy={5} r={3} fill="var(--role-state-graphic)" />
              </svg>
            }
          >
            estimate
          </LegendItem>
          <LegendItem
            series="kalman-reading"
            swatch={
              <svg width={14} height={14} aria-hidden className="shrink-0">
                <line x1={2} y1={7} x2={12} y2={7} stroke="var(--role-measurement-graphic)" strokeWidth={2} />
                <line x1={7} y1={2} x2={7} y2={12} stroke="var(--role-measurement-graphic)" strokeWidth={2} />
              </svg>
            }
          >
            reading z
          </LegendItem>
          <LegendItem
            series="kalman-prior"
            swatch={
              <svg width={16} height={4} aria-hidden className="shrink-0">
                <line
                  x1={0}
                  y1={2}
                  x2={16}
                  y2={2}
                  stroke="var(--role-reference-graphic)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
              </svg>
            }
          >
            prior outline
          </LegendItem>
          <LegendItem
            series="kalman-gain"
            swatch={
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: 'var(--role-highlight-graphic)' }}
              />
            }
          >
            gain K (Indicate)
          </LegendItem>
        </>
      }
      readout={() => (
        <>
          <span className="text-text-dim">
            {'\u03c3'} {SIGMA_PRIOR.toFixed(2)} {'\u2192'} {SIGMA_PRED.toFixed(2)}{' '}
            {'\u2192'} {SIGMA_POST.toFixed(2)}
          </span>{' '}
          <span className="text-text-dim">K</span>{' '}
          <span className="text-text" data-testid="kalman-gain-value">
            {GAIN.toFixed(2)}
          </span>{' '}
          <span className="text-text-dim">z</span>{' '}
          <span className="text-text">{READING.toFixed(2)}</span>
        </>
      )}
      statusLine={
        <>
          Schematic of step {STEP} of the seeded constant-velocity filter
          (seed {DEFAULT_SEED}, {'\u03c3'}q {DEFAULT_SETTINGS.sigmaQ.toFixed(2)},{' '}
          {'\u03c3'}r {DEFAULT_SETTINGS.sigmaR.toFixed(2)}): the belief-space
          picture is drawn, the algebra is the real filter recursion.
        </>
      }
      textAlternative={`${SCENE.title}. A five-beat scene in the position-velocity belief space. ${SCENE.beats
        .map((beat, index) => `Beat ${index + 1}: ${beat.caption}`)
        .join(' ')} Posterior position sigma ${SIGMA_POST.toFixed(2)} against the predicted ${SIGMA_PRED.toFixed(2)}, gain K ${GAIN.toFixed(2)}, reading z ${READING.toFixed(2)}.`}
    />
  );
}

export default KalmanPredictUpdate;
