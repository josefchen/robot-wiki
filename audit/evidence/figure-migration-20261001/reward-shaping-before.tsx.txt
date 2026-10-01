'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Pause, Play } from '@phosphor-icons/react';
import {
  ChartDescription,
  ControlLabel,
  InstrumentFrame,
  InstrumentReset,
  PlotStage,
} from '@/components/ui';
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
import { cx } from '@/lib/utils';

/**
 * RewardShaping: the weighted-sum reality of locomotion rewards. Twelve
 * sliders set illustrative weights, not a pinned simulator configuration.
 * A stick quadruped shows the local teaching model categories, not learned
 * policy rollouts: freeze when
 * torque dominates, prance when foot air time dominates, chatter when the
 * action-rate penalty collapses). A monospace readout reports the
 * weighted sum of fixed illustrative per-term magnitudes.
 *
 * The classification is an illustrative teaching model, labeled as such
 * in the surrounding prose.
 *
 * Interactive contract: deterministic initial render (default weights,
 * balanced trot, paused), native range inputs (keyboard-accessible),
 * visible monospace readouts, reset control, fixed SVG viewport (no
 * layout shift). Playback runs on an interval (not rAF) and degrades to
 * discrete jumps under prefers-reduced-motion.
 */

const WIDTH = 640;
const HEIGHT = 280;
const GROUND_Y = 232;
const BODY_Y = 158;
const BODY_LEFT = 246;
const BODY_RIGHT = 398;
const HIP_FRONT_X = 384;
const HIP_HIND_X = 262;

const f = (v: number) => Number(v.toFixed(2));

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const TONE_TEXT: Record<'ok' | 'warn' | 'err', string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  err: 'text-err',
};

const TONE_FILL: Record<'ok' | 'warn' | 'err', string> = {
  ok: 'var(--color-ok)',
  warn: 'var(--color-warn)',
  err: 'var(--color-err)',
};

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

  const buttonBase =
    'rounded-sm border px-2.5 py-1.5 font-sans text-xs transition-colors active:translate-y-[1px]';
  const buttonIdle =
    'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text';

  const bodyY = f(BODY_Y + pose.bodyY);
  const hipY = f(bodyY + 10);

  return (
    <InstrumentFrame className={className}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          data-brand-control-id="control:secondary-action"
          data-pagefind-ignore
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause rollout preview' : 'Play rollout preview'}
          className={cx(buttonBase, buttonIdle, 'inline-flex items-center gap-1.5')}
        >
          {playing ? (
            <Pause size={12} weight="bold" aria-hidden />
          ) : (
            <Play size={12} weight="bold" aria-hidden />
          )}
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          data-brand-control-id="control:secondary-action"
          data-pagefind-ignore
          type="button"
          onClick={() => setPhase((p) => f((p + PHASE_STEP) % 1))}
          aria-label="Step the preview forward"
          className={cx(buttonBase, buttonIdle)}
        >
          Step
        </button>
        <InstrumentReset onClick={reset} />
        <span
          data-testid="behavior-status"
          className={cx('font-mono text-xs', TONE_TEXT[behavior.tone])}
        >
          {behavior.status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs">
        <span className="text-text-dim">
          Weighted total:{' '}
          <span data-testid="total-readout" className="text-accent">
            {formatTotal(total)} / step
          </span>
        </span>
        <span className="text-text-dim">
          Terms: <span className="text-text">{TERMS.length}</span>
        </span>
        <span className="text-text-dim">
          Preview phase:{' '}
          <span className="text-text">{Math.round(phase * 100)}%</span>
        </span>
      </div>

      <PlotStage
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        data-testid="quad-preview"
        aria-label={`Rollout preview: ${behavior.status}. ${behavior.description}`}
        aria-describedby={descriptionId}
        className="mt-3"
      >
        {/* Status annotation in the guaranteed-empty sky region */}
        <text
          x={16}
          y={24}
          fill={TONE_FILL[behavior.tone]}
          fontSize={11}
          fontFamily="var(--font-mono)"
        >
          {behavior.name}
        </text>
        <text
          x={WIDTH - 16}
          y={24}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {behaviorId === 'balanced'
            ? 'ground scrolls: forward progress'
            : 'no forward progress'}
        </text>

        {/* Ground line with scrolling ticks */}
        <line
          x1={0}
          x2={WIDTH}
          y1={GROUND_Y}
          y2={GROUND_Y}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />
        {Array.from({ length: 22 }, (_, i) => {
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
              stroke="var(--color-border)"
              strokeWidth={1}
            />
          );
        })}

        {/* Far-side legs (dimmer, behind the body) */}
        {(['rf', 'rh'] as LegId[]).map((id) => {
          const hipX = id === 'rf' ? HIP_FRONT_X : HIP_HIND_X;
          const leg = pose.legs[id];
          const footX = f(hipX - 7 + leg.footDx);
          const footY = f(GROUND_Y - leg.footDy);
          const kneeX = f(hipX - 7 + leg.footDx * 0.5 + 8);
          const kneeY = f((hipY + footY) / 2 - 10);
          return (
            <g key={id} opacity={0.4}>
              <polyline
                points={`${f(hipX - 7)},${hipY} ${kneeX},${kneeY} ${footX},${footY}`}
                fill="none"
                stroke="var(--color-text-dim)"
                strokeWidth={2}
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        {/* Body */}
        <rect
          x={BODY_LEFT}
          y={bodyY}
          width={BODY_RIGHT - BODY_LEFT}
          height={22}
          rx={3}
          fill="var(--color-surface-2)"
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />
        <rect
          x={BODY_RIGHT}
          y={f(bodyY - 6)}
          width={20}
          height={16}
          rx={3}
          fill="var(--color-surface-2)"
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />

        {/* Near-side legs */}
        {(['lf', 'lh'] as LegId[]).map((id) => {
          const hipX = id === 'lf' ? HIP_FRONT_X : HIP_HIND_X;
          const leg = pose.legs[id];
          const footX = f(hipX + leg.footDx);
          const footY = f(GROUND_Y - leg.footDy);
          const kneeX = f(hipX + leg.footDx * 0.5 + 8);
          const kneeY = f((hipY + footY) / 2 - 10);
          return (
            <g key={id}>
              <polyline
                points={`${hipX},${hipY} ${kneeX},${kneeY} ${footX},${footY}`}
                fill="none"
                stroke="var(--color-text)"
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
              <circle
                cx={footX}
                cy={footY}
                r={3}
                fill={
                  leg.footDy > 0.5
                    ? 'var(--color-surface)'
                    : 'var(--color-accent)'
                }
                stroke={
                  leg.footDy > 0.5
                    ? 'var(--color-text-dim)'
                    : 'var(--color-accent)'
                }
                strokeWidth={1}
              />
            </g>
          );
        })}

        {/* Hip markers */}
        {[HIP_FRONT_X, HIP_HIND_X].map((x) => (
          <circle
            key={x}
            cx={x}
            cy={hipY}
            r={2.5}
            fill="var(--color-text-dim)"
          />
        ))}

        <text
          x={16}
          y={HEIGHT - 8}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          illustrative terms and weights, not a source configuration
        </text>
      </PlotStage>

      <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {TERMS.map((term) => (
          <div key={term.id}>
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
              className="mt-1.5 w-full accent-accent"
            />
          </div>
        ))}
      </div>

      <p className="mt-4 font-sans text-sm leading-relaxed text-text">
        Local teaching model: twelve illustrative terms and weights, not the paper reward or a source configuration. No policy is trained here.
      </p>
      <p className="mt-4 font-sans text-xs leading-relaxed text-text-dim" aria-live="polite">
        <span className={TONE_TEXT[behavior.tone]}>{behavior.status}.</span>{' '}
        {behavior.description}
      </p>
      <ChartDescription
        id={descriptionId}
        className="mt-3"
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
    </InstrumentFrame>
  );
}
