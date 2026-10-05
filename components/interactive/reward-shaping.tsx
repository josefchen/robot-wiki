'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Pause, Play } from '@phosphor-icons/react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
  PresetGroup,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_VIEW_WIDTH,
  LegendSwatch,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
import { RobotDog, type DogFeet } from '@/components/motion/robot-dog';
import { type LegId } from '@/lib/gait';
import {
  ATTRACTOR_DOMINANCE_RATIO,
  ATTRACTOR_WEIGHT_MIN,
  BEHAVIORS,
  STRIDE_PX,
  TERMS,
  WEIGHT_MAX,
  WEIGHT_MIN,
  classifyBehavior,
  defaultWeights,
  formatTotal,
  formatWeight,
  playbackCadence,
  quadrupedPose,
  weightedTotal,
  type BehaviorId,
  type QuadPose,
  type Weights,
} from '@/lib/reward-shaping';

/**
 * RewardShaping: how the scoring rule picks the walk. Four named scoring
 * rules change one weight each from the balanced score; the robot dog shows
 * the gait the local teaching model selects, with the balanced trot as a
 * faint ghost behind it once the walk has changed. The twelve weight
 * sliders, the step control and Reset sit in "Adjust more".
 *
 * The classification is an illustrative teaching model, not learned policy
 * rollouts, and is labelled as such in the surrounding prose.
 *
 * Interactive contract: deterministic initial render (default weights,
 * balanced trot, paused), native range inputs (keyboard-accessible),
 * visible readouts, reset control, fixed SVG viewport (no layout shift).
 * Playback runs on an interval (not rAF) and degrades to discrete jumps
 * under prefers-reduced-motion.
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 168;
const GROUND_Y = 132;
const HIP_Y = 96;
const DOG_REAR = 178;
const DOG_FRONT = 250;
const DOG_LEG = 22;
/** The faint balanced-score robot, to the left of the live one. */
const GHOST_SHIFT = -136;
const LABEL_Y = 158;
/** Enough ground ticks to cover the stage while they scroll by a stride. */
const GROUND_TICKS = Math.ceil((WIDTH + STRIDE_PX) / STRIDE_PX);

const f = (v: number) => Number(v.toFixed(2));

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const PHASE_STEP = 0.05;

/** Slider values are integers 0..40, one tenth of a weight unit each. */
function toSlider(weight: number): number {
  return Math.round(weight * 10);
}

function fromSlider(value: number): number {
  return value / 10;
}

type PresetId = 'balanced' | 'effort' | 'high-steps' | 'jerky';

/** Each named scoring rule changes one weight of the balanced score to an end of its slider. */
const PRESETS: { id: PresetId; label: string; change: Partial<Weights> }[] = [
  { id: 'balanced', label: 'Balanced score', change: {} },
  { id: 'effort', label: 'Too strict on effort', change: { torque: WEIGHT_MAX } },
  { id: 'high-steps', label: 'Loves high steps', change: { airTime: WEIGHT_MAX } },
  { id: 'jerky', label: 'Ignores jerky moves', change: { actionRate: WEIGHT_MIN } },
];

const presetWeights = (id: PresetId): Weights => ({
  ...defaultWeights(),
  ...PRESETS.find((p) => p.id === id)!.change,
});

function presetFor(weights: Weights): PresetId | null {
  const match = PRESETS.find((p) => {
    const target = presetWeights(p.id);
    return TERMS.every((term) => toSlider(target[term.id]) === toSlider(weights[term.id]));
  });
  return match?.id ?? null;
}

/** The stage note: what the score rewards and what the robot does about it. */
const NOTE: Record<BehaviorId, readonly string[]> = {
  balanced: ['Change one rule in the score,', 'and the walk changes'],
  frozen: ['Effort costs too much:', 'it stands still'],
  prancing: ['High steps pay too much:', 'it bounces in place'],
  chatter: ['Jerky moves cost nothing:', 'its legs jitter'],
};

/** The walk in plain words, for the live readout. */
const WALK: Record<BehaviorId, string> = {
  balanced: 'Steady trot',
  frozen: 'Stands still',
  prancing: 'Bounces in place',
  chatter: 'Legs jitter',
};

function attractorTakeaway(
  behaviorId: BehaviorId,
  weights: Weights,
  total: string,
): string {
  const n = TERMS.length;
  if (behaviorId === 'frozen') {
    return `The ${n} weighted reward terms give an illustrative total of ${total} per step, and the preview is the freeze attractor: torque ${formatWeight(weights.torque)} now outweighs velocity tracking, so the chosen rule draws a stationary pose, not a trained optimum.`;
  }
  if (behaviorId === 'prancing') {
    return `The ${n} weighted reward terms give an illustrative total of ${total} per step, and the preview is the prance attractor: foot air time ${formatWeight(weights.airTime)} now outweighs velocity tracking, so the chosen rule draws bouncing in place, not a trained policy.`;
  }
  if (behaviorId === 'chatter') {
    return `The ${n} weighted reward terms give an illustrative total of ${total} per step, and the preview is the chatter attractor: action-rate is only ${formatWeight(weights.actionRate)}, so the chosen rule draws vibration, not a measured control frequency.`;
  }
  // The balanced regime's real exit condition is relative: a term leaves
  // balanced only when it BOTH clears ATTRACTOR_WEIGHT_MIN and reaches
  // ATTRACTOR_DOMINANCE_RATIO x velTrack. High velTrack keeps heavy
  // penalties balanced, so an absolute "below 2.5" claim would be false.
  return `The ${n} weighted reward terms give an illustrative total of ${total} per step, and the preview is a balanced trot: neither torque ${formatWeight(weights.torque)} nor air time ${formatWeight(weights.airTime)} clears the ${ATTRACTOR_WEIGHT_MIN} attractor bar and ${ATTRACTOR_DOMINANCE_RATIO}x the ${formatWeight(weights.velTrack)} velocity-tracking weight together, so the chosen rule draws a trot instead of freezing, prancing, or chattering.`;
}

/** Feet in the robot dog's drawing order: back far, back near, front far, front near. */
const FOOT_ORDER: readonly LegId[] = ['rh', 'lh', 'rf', 'lf'];
const FOOT_HIP_X = [DOG_REAR + 3, DOG_REAR, DOG_FRONT + 3, DOG_FRONT];

function dogFeet(pose: QuadPose): DogFeet {
  return FOOT_ORDER.map((id, i) => [
    f(FOOT_HIP_X[i] + pose.legs[id].footDx),
    f(GROUND_Y - pose.legs[id].footDy),
  ]) as unknown as DogFeet;
}

const pawDown = (pose: QuadPose, i: number) => pose.legs[FOOT_ORDER[i]].footDy <= 0.5;

/**
 * Where in its cycle each walk is drawn when the preview phase is 0, so the
 * first frame already shows the walk: the bounce at its top, the jitter at
 * its widest. Freeze has no cycle and the trot reads at any phase.
 */
const DRAWN_PHASE_OFFSET: Record<BehaviorId, number> = {
  balanced: 0,
  frozen: 0,
  prancing: 0.25,
  chatter: 1 / 32,
};

export function RewardShaping({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const [weights, setWeights] = useState<Weights>(() => defaultWeights());
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Reduced motion tracked reactively, not read once at play time. A
  // one-shot read can be stale when playback starts (the media setting
  // lands after hydration), and a cadence captured from it would keep
  // animating smoothly under prefers-reduced-motion for the rest of the
  // playback with nothing to correct it.
  const [reducedMotion, setReducedMotion] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Sync reduced-motion state to the live media query so the playback
  // cadence re-derives when the setting changes, including mid-playback.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const behaviorId: BehaviorId = classifyBehavior(weights);
  const behavior = BEHAVIORS[behaviorId];
  const total = weightedTotal(weights);
  const pose = quadrupedPose(behaviorId, phase + DRAWN_PHASE_OFFSET[behaviorId]);
  const ghost = behaviorId === 'balanced' ? null : quadrupedPose('balanced', phase);

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Interval playback, matching the gait-diagram convention. The cadence
  // combines the tracked state with a fresh read at timer start (the
  // most current value available), and the tracked state sits in the
  // deps so a mid-playback media change rebuilds the timer at the
  // correct cadence; stale-smooth is unreachable by construction.
  // Cleanup on pause, cadence change, or unmount.
  useEffect(() => {
    if (!playing) return;
    const { tickMs, phasePerTick } = playbackCadence(
      reducedMotion || prefersReducedMotion(),
    );
    timerRef.current = window.setInterval(() => {
      setPhase((p) => (p + phasePerTick >= 1 ? 0 : f(p + phasePerTick)));
    }, tickMs);
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing, reducedMotion]);

  const setWeight = (id: keyof Weights, sliderValue: number) => {
    setWeights((w) => ({ ...w, [id]: fromSlider(sliderValue) }));
  };

  const reset = () => {
    stopTimer();
    setPlaying(false);
    setWeights(defaultWeights());
    setPhase(0);
  };

  const hipY = f(HIP_Y + pose.bodyY);
  const pawColour = roleColour('state');

  return (
    <InstrumentFigure
      figureId="reward-shaping"
      className={className}
      kicker="Reward design"
      heading="How you score a robot shapes how it walks"
      controls={
        <>
          <PresetGroup<PresetId>
            label="Scoring rule"
            presets={PRESETS}
            value={presetFor(weights)}
            onChange={(id) => setWeights(presetWeights(id))}
            testId="rs-preset"
          />
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause rollout preview' : 'Play rollout preview'}
            className={`${INSTRUMENT_SECONDARY_CONTROL_CLASS} self-end`}
          >
            {playing ? (
              <Pause size={14} weight="bold" aria-hidden />
            ) : (
              <Play size={14} weight="bold" aria-hidden />
            )}
            {playing ? 'Pause' : 'Play'}
          </button>
        </>
      }
      adjust={
        <>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={() => setPhase((p) => f((p + PHASE_STEP) % 1))}
            aria-label="Step the preview forward"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Step
          </button>
          <InstrumentReset onClick={reset} />
          <div className="grid basis-full grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
            {TERMS.map((term) => (
              <ControlField key={term.id}>
                <ControlLabel
                  htmlFor={`rs-${term.id}`}
                  value={formatWeight(weights[term.id])}
                >
                  {term.label}
                </ControlLabel>
                <input
                  id={`rs-${term.id}`}
                  type="range"
                  data-brand-control-id="control:input"
                  min={toSlider(WEIGHT_MIN)}
                  max={toSlider(WEIGHT_MAX)}
                  step={1}
                  value={toSlider(weights[term.id])}
                  onChange={(e) => setWeight(term.id, Number(e.target.value))}
                  aria-label={`${term.label} weight`}
                  className={INSTRUMENT_SLIDER_CLASS}
                />
              </ControlField>
            ))}
          </div>
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem swatch={<LegendSwatch role="state" mark="dot" />}>
                  paw on the ground
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                <span data-testid="walk-readout">{WALK[behaviorId]}</span>
              </InstrumentReadout>
              <StageStatus>Illustrative teaching model. No policy is trained here.</StageStatus>
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            data-testid="quad-preview"
            aria-label={`Rollout preview: ${behavior.status}. ${behavior.description}`}
            aria-describedby={descriptionId}
          >
            <StageAnnotation x={8} y={18} lines={NOTE[behaviorId]} />

            <g data-scene-structure="" opacity={CHART_STRUCTURE.axesOpacity}>
              <line
                x1={0}
                x2={WIDTH}
                y1={GROUND_Y}
                y2={GROUND_Y}
                stroke={CHART_STRUCTURE.axes}
                strokeWidth={CHART_STROKE.structure}
              />
              {Array.from({ length: GROUND_TICKS }, (_, i) => {
                const x = f(
                  ((i * STRIDE_PX - pose.groundOffset) % (WIDTH + STRIDE_PX) +
                    WIDTH +
                    STRIDE_PX) %
                    (WIDTH + STRIDE_PX) -
                    STRIDE_PX / 2,
                );
                // A slanted tick reaches 5 units left of its top; keep it on the stage.
                if (x < 5 || x > WIDTH) return null;
                return (
                  <line
                    key={i}
                    x1={x}
                    x2={f(x - 5)}
                    y1={GROUND_Y + 1}
                    y2={GROUND_Y + 7}
                    stroke={CHART_STRUCTURE.axes}
                    strokeWidth={CHART_STROKE.structure}
                  />
                );
              })}
            </g>

            {ghost ? (
              <>
                <g data-series="balanced-ghost" opacity={0.3} transform={`translate(${GHOST_SHIFT} 0)`}>
                  <RobotDog
                    rear={DOG_REAR}
                    front={DOG_FRONT}
                    hipY={HIP_Y}
                    feet={dogFeet(ghost)}
                    segment={DOG_LEG}
                    testId="robot-dog-ghost"
                  />
                </g>
                <text x={f((DOG_REAR + DOG_FRONT) / 2 + GHOST_SHIFT)} y={LABEL_Y} textAnchor="middle"
                  fill={CHART_STRUCTURE.labelSecondary}>balanced score</text>
                <text x={(DOG_REAR + DOG_FRONT) / 2} y={LABEL_Y} textAnchor="middle"
                  fill={CHART_STRUCTURE.label}>this score</text>
              </>
            ) : null}
            <g data-series="robot">
              <RobotDog
                rear={DOG_REAR}
                front={DOG_FRONT}
                hipY={hipY}
                feet={dogFeet(pose)}
                segment={DOG_LEG}
                footFill={(i) => (pawDown(pose, i) ? pawColour : undefined)}
              />
            </g>
          </PlotStage>
        </FigureStage>
      }
      caption="Robots learning by trial and error do whatever earns points; the scoring rules, not hand-written steps, decide what kind of walk emerges."
      method={
        <>
          <p>
            This is a local teaching model, not a trained robot. Its score adds up twelve illustrative reward terms:
            each term has a fixed size and a weight, rewards count up and penalties count down, and the sum is the
            weighted total per step. The terms, weights and sizes are teaching choices, not a source configuration or
            the paper reward.
          </p>
          <InstrumentReadout className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              Selected category: <span data-testid="behavior-status">{behavior.status}</span>
            </span>
            <span>
              Weighted total:{' '}
              <span data-testid="total-readout" style={{ color: roleColour('value') }}>
                {formatTotal(total)} / step
              </span>
            </span>
          </InstrumentReadout>
          {/* Outside the live readout: during playback the phase moves
              every tick, too often for a polite region to announce. */}
          <span className="block tabular-nums">
            Preview phase: <span>{Math.round(phase * 100)}%</span>
          </span>
          <p>
            Three rules pick a failure category, checked in this order. Chatter (the legs jitter) when the
            action-rate penalty is near zero. Freeze (the robot stands still) when the torque penalty reaches{' '}
            {ATTRACTOR_WEIGHT_MIN} and also {ATTRACTOR_DOMINANCE_RATIO} times the velocity-tracking weight. Prance (it
            bounces in place) when foot air time passes the same two bars. Otherwise the robot trots. These are
            chosen classification rules and drawn poses, not trained policies, measured control frequencies or
            actuator-damage predictions. The preview phase is how far the drawing is through one stride; Play loops
            it and Step moves it on by {Math.round(PHASE_STEP * 100)} percent. At phase 0 the bounce is drawn at its top
            and the jitter at its widest, so a changed walk shows before Play. Once the walk changes, the balanced
            score&rsquo;s trot is drawn faintly on the left for comparison.
          </p>
          <p>
            The four scoring rules each change one weight of the balanced score: &ldquo;Too strict on effort&rdquo;
            sets the torque penalty to {formatWeight(WEIGHT_MAX)}, &ldquo;Loves high steps&rdquo; sets foot air time
            to {formatWeight(WEIGHT_MAX)}, and &ldquo;Ignores jerky moves&rdquo; sets the action-rate penalty to{' '}
            {formatWeight(WEIGHT_MIN)}.
          </p>
          <ul className="m-0! grid list-none gap-0.5 p-0!">
            {TERMS.map((term) => (
              <li key={term.id}>
                {term.label}: default weight {formatWeight(term.defaultWeight)}. {term.blurb}
              </li>
            ))}
          </ul>
          <ChartDescription
            id={descriptionId}
            form="state"
            open
            summary="Current reward-weight attractor"
            description={attractorTakeaway(behaviorId, weights, formatTotal(total))}
            states={[
              { label: 'attractor', value: behavior.name },
              { label: 'total', value: `${formatTotal(total)} / step` },
              { label: 'torque', value: formatWeight(weights.torque) },
              { label: 'air time', value: formatWeight(weights.airTime) },
              { label: 'action-rate', value: formatWeight(weights.actionRate) },
            ]}
          />
        </>
      }
    />
  );
}
