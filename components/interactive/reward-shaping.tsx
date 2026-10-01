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
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  LegendSwatch,
  roleColour,
} from '@/components/motion/chart';
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
  type Weights,
} from '@/lib/reward-shaping';

/**
 * RewardShaping: the weighted-sum reality of locomotion rewards. Twelve
 * sliders set illustrative weights, not a pinned simulator configuration.
 * A stick quadruped shows the local teaching model categories, not learned
 * policy rollouts: freeze when
 * torque dominates, prance when foot air time dominates, chatter when the
 * action-rate penalty collapses). A readout reports the weighted sum of
 * fixed illustrative per-term magnitudes.
 *
 * The classification is an illustrative teaching model, labeled as such
 * in the surrounding prose.
 *
 * Interactive contract: deterministic initial render (default weights,
 * balanced trot, paused), native range inputs (keyboard-accessible),
 * visible readouts, reset control, fixed SVG viewport (no layout shift).
 * Playback runs on an interval (not rAF) and degrades to discrete jumps
 * under prefers-reduced-motion.
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 140;
const GROUND_Y = 122;
const BODY_Y = 48;
const BODY_LEFT = 84;
const BODY_RIGHT = 236;
const HIP_FRONT_X = BODY_RIGHT - 14;
const HIP_HIND_X = BODY_LEFT + 16;
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

/** The legend swatch for a foot in swing: the hollow marker the stage draws. */
function SwingFootSwatch() {
  const h = CHART_TYPE.tickPx;
  return (
    <svg aria-hidden="true" focusable="false" width={h * 2} height={h} viewBox={`0 0 ${h * 2} ${h}`} className="shrink-0">
      <circle
        cx={h}
        cy={h / 2}
        r={CHART_STROKE.markerRadius}
        fill="none"
        stroke={roleColour('state')}
        strokeWidth={CHART_STROKE.reference}
      />
    </svg>
  );
}

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
  const pose = quadrupedPose(behaviorId, phase);

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

  const bodyY = f(BODY_Y + pose.bodyY);
  const hipY = f(bodyY + 10);
  const robot = roleColour('state');

  return (
    <InstrumentFigure
      figureId="reward-shaping"
      className={className}
      heading="Reward weights and the gait they select"
      controls={
        <>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause rollout preview' : 'Play rollout preview'}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {playing ? (
              <Pause size={14} weight="bold" aria-hidden />
            ) : (
              <Play size={14} weight="bold" aria-hidden />
            )}
            {playing ? 'Pause' : 'Play'}
          </button>
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
                  foot in contact
                </LegendItem>
                <LegendItem swatch={<SwingFootSwatch />}>foot in swing</LegendItem>
              </InstrumentLegend>
              <InstrumentReadout className="flex flex-wrap gap-x-4 gap-y-1">
                <span data-testid="behavior-status">{behavior.status}</span>
                <span>
                  Weighted total:{' '}
                  <span data-testid="total-readout" style={{ color: roleColour('value') }}>
                    {formatTotal(total)} / step
                  </span>
                </span>
              </InstrumentReadout>
              {/* Outside the live readout: during playback the phase moves
                  every tick, too often for a polite region to announce. */}
              <span className="font-sans text-[13px] leading-snug tabular-nums text-text-dim">
                Preview phase: <span>{Math.round(phase * 100)}%</span>
              </span>
              <ChartDescription
                id={descriptionId}
                form="state"
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
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            data-testid="quad-preview"
            aria-label={`Rollout preview: ${behavior.status}. ${behavior.description}`}
            aria-describedby={descriptionId}
          >
            <text data-scene-note="" x={12} y={20} fill={CHART_STRUCTURE.labelSecondary}>
              {behaviorId === 'balanced'
                ? 'ground scrolls: forward progress'
                : 'no forward progress'}
            </text>

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
                return (
                  <line
                    key={i}
                    x1={x}
                    x2={x}
                    y1={GROUND_Y}
                    y2={GROUND_Y + 6}
                    stroke={CHART_STRUCTURE.axes}
                    strokeWidth={CHART_STROKE.structure}
                  />
                );
              })}
            </g>

            <g data-series="robot">
              {/* Far-side legs, dimmer, behind the body */}
              {(['rf', 'rh'] as LegId[]).map((id) => {
                const hipX = id === 'rf' ? HIP_FRONT_X : HIP_HIND_X;
                const leg = pose.legs[id];
                const footX = f(hipX - 7 + leg.footDx);
                const footY = f(GROUND_Y - leg.footDy);
                const kneeX = f(hipX - 7 + leg.footDx * 0.5 + 8);
                const kneeY = f((hipY + footY) / 2 - 10);
                return (
                  <polyline
                    key={id}
                    points={`${f(hipX - 7)},${hipY} ${kneeX},${kneeY} ${footX},${footY}`}
                    fill="none"
                    stroke={robot}
                    strokeOpacity={0.45}
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                );
              })}

              <rect
                x={BODY_LEFT}
                y={bodyY}
                width={BODY_RIGHT - BODY_LEFT}
                height={22}
                rx={3}
                fill={robot}
                fillOpacity={0.18}
                stroke={robot}
                strokeWidth={CHART_STROKE.reference}
              />
              <rect
                x={BODY_RIGHT}
                y={f(bodyY - 6)}
                width={20}
                height={16}
                rx={3}
                fill={robot}
                fillOpacity={0.18}
                stroke={robot}
                strokeWidth={CHART_STROKE.reference}
              />

              {/* Near-side legs; a foot on the ground is filled, a foot in
                  swing is hollow */}
              {(['lf', 'lh'] as LegId[]).map((id) => {
                const hipX = id === 'lf' ? HIP_FRONT_X : HIP_HIND_X;
                const leg = pose.legs[id];
                const footX = f(hipX + leg.footDx);
                const footY = f(GROUND_Y - leg.footDy);
                const kneeX = f(hipX + leg.footDx * 0.5 + 8);
                const kneeY = f((hipY + footY) / 2 - 10);
                const swing = leg.footDy > 0.5;
                return (
                  <g key={id}>
                    <polyline
                      points={`${hipX},${hipY} ${kneeX},${kneeY} ${footX},${footY}`}
                      fill="none"
                      stroke={robot}
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                    />
                    <circle
                      cx={footX}
                      cy={footY}
                      r={CHART_STROKE.markerRadius}
                      fill={swing ? 'none' : robot}
                      stroke={robot}
                      strokeWidth={CHART_STROKE.reference}
                    />
                  </g>
                );
              })}

              {[HIP_FRONT_X, HIP_HIND_X].map((x) => (
                <circle key={x} cx={x} cy={hipY} r={2.5} fill={robot} />
              ))}
            </g>
          </PlotStage>
        </FigureStage>
      }
      caption="A dominant torque or air-time weight, or a near-zero action-rate weight, moves the drawn gait off its balanced trot."
      source="Local teaching model: twelve illustrative terms and weights, not a source configuration or the paper reward. No policy is trained here."
    />
  );
}
