'use client';

import { useState } from 'react';
import {
  DEFAULT_CANDIDATES,
  GOALS,
  INITIAL_STATE,
  MAX_CANDIDATES,
  MAX_STEPS,
  MIN_CANDIDATES,
  type LatentPoint,
  type PlanStepResult,
  goalDistance,
  planStep,
} from '@/lib/jepa-planning';
import { cx } from '@/lib/utils';

/**
 * JepaPlanning: goal-conditioned planning in embedding space.
 *
 * V-JEPA 2-AC plans without ever decoding pixels: the goal image is encoded
 * once, candidate action sequences are scored by the predicted distance of
 * their final latent to the goal latent, the winner's first action executes,
 * and planning repeats from the new observation. This interactive runs that
 * loop in a 2-D projection of the embedding space. Each Plan step click is
 * one model-predictive-control iteration: the candidate fan shows the
 * searched sequences, the amber path is the winner, and the goal-embedding
 * distance readout contracts as steps execute.
 *
 * The predictor is imperfect on purpose (a small deterministic wobble
 * between predicted and executed states), and the search aligns better with
 * the true goal direction as the search budget grows, which is why a larger
 * budget reaches the goal in fewer steps.
 *
 * Interactive contract: typed props, deterministic render, monospace
 * numeric readouts, reset control, native keyboard-accessible inputs, fixed
 * chart geometry (no layout shift). Step-driven only, no auto-playing or
 * JS-driven motion, so it is reduced-motion safe by construction.
 */
type JepaPlanningProps = {
  /** Initial search budget in candidate action sequences. Default 24. */
  defaultCandidates?: number;
  className?: string;
};

const PLANE_W = 560;
const PLANE_H = 360;
const PLANE_PAD = 30;
const TRACE_W = 560;
const TRACE_H = 64;
const TRACE_PAD = { top: 14, right: 16, bottom: 22, left: 56 };

const MONO = 'var(--font-mono)';
const DIM = 'var(--color-text-dim)';
const ACCENT = 'var(--color-accent)';
const OK = 'var(--color-ok)';
const BORDER = 'var(--color-border)';
const BORDER_STRONG = 'var(--color-border-strong)';

function px(x: number): number {
  return PLANE_PAD + x * (PLANE_W - 2 * PLANE_PAD);
}

function py(y: number): number {
  return PLANE_PAD + (1 - y) * (PLANE_H - 2 * PLANE_PAD);
}

function formatDistance(value: number): string {
  return value.toFixed(3);
}

/** Crossed-out frame: the visual marker that no pixel decoder is involved. */
function CrossedFrame() {
  return (
    <svg viewBox="0 0 88 56" aria-hidden="true" className="block w-24 shrink-0">
      <rect
        x={0}
        y={0}
        width={88}
        height={56}
        fill="none"
        stroke={BORDER_STRONG}
        strokeWidth={1}
      />
      <line x1={0} y1={0} x2={88} y2={56} stroke={BORDER_STRONG} strokeWidth={1} />
      <line x1={88} y1={0} x2={0} y2={56} stroke={BORDER_STRONG} strokeWidth={1} />
      <text
        x={44}
        y={66}
        textAnchor="middle"
        fill={DIM}
        fontSize={8}
        fontFamily={MONO}
      >
        no pixels
      </text>
    </svg>
  );
}

export function JepaPlanning({
  defaultCandidates = DEFAULT_CANDIDATES,
  className,
}: JepaPlanningProps) {
  const [candidateCount, setCandidateCount] = useState(defaultCandidates);
  const [goalIndex, setGoalIndex] = useState(0);
  const [history, setHistory] = useState<LatentPoint[]>([INITIAL_STATE]);
  const [lastPlan, setLastPlan] = useState<PlanStepResult | null>(null);

  const goal = GOALS[goalIndex];
  const state = history[history.length - 1];
  const steps = history.length - 1;
  const distance = goalDistance(state, goal.point);
  const initialDistance = goalDistance(INITIAL_STATE, goal.point);
  const reached = distance <= 0.03;
  const exhausted = steps >= MAX_STEPS;

  function plan() {
    if (reached || exhausted) return;
    const result = planStep({
      state,
      goal: goal.point,
      stepIndex: steps,
      candidateCount,
    });
    setHistory((h) => [...h, result.next]);
    setLastPlan(result);
  }

  function selectGoal(index: number) {
    setGoalIndex(index);
    setHistory([INITIAL_STATE]);
    setLastPlan(null);
  }

  function reset() {
    setCandidateCount(defaultCandidates);
    setGoalIndex(0);
    setHistory([INITIAL_STATE]);
    setLastPlan(null);
  }

  const trace = {
    plotW: TRACE_W - TRACE_PAD.left - TRACE_PAD.right,
    plotH: TRACE_H - TRACE_PAD.top - TRACE_PAD.bottom,
    yMax: initialDistance * 1.08,
  };
  const traceX = (t: number) =>
    TRACE_PAD.left + (t / MAX_STEPS) * trace.plotW;
  const traceY = (d: number) =>
    TRACE_PAD.top + trace.plotH - (d / trace.yMax) * trace.plotH;
  const distances = history.map((p) => goalDistance(p, goal.point));
  const tracePath = distances
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${traceX(i).toFixed(1)},${traceY(d).toFixed(1)}`)
    .join(' ');

  const toggleBase =
    'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]';
  const toggleOn = 'border-accent text-accent';
  const toggleOff =
    'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text';

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <label
            htmlFor="jp-budget"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Search budget
            <span className="font-mono text-xs normal-case tracking-normal text-text">
              {candidateCount} sequences
            </span>
          </label>
          <input
            id="jp-budget"
            type="range"
            min={MIN_CANDIDATES}
            max={MAX_CANDIDATES}
            step={4}
            value={candidateCount}
            onChange={(e) => setCandidateCount(Number(e.target.value))}
            aria-label={`Search budget in candidate action sequences, currently ${candidateCount}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <div role="group" aria-label="Goal" className="flex gap-2">
          {GOALS.map((g, i) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={goalIndex === i}
              onClick={() => selectGoal(i)}
              className={cx(toggleBase, goalIndex === i ? toggleOn : toggleOff)}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            data-pagefind-ignore
            type="button"
            onClick={plan}
            disabled={reached || exhausted}
            className={cx(
              'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
              reached || exhausted
                ? 'cursor-not-allowed border-border bg-surface-2 text-text-dim opacity-50'
                : 'border-accent text-accent hover:bg-surface-2',
            )}
          >
            Plan step
          </button>
          <button
            data-pagefind-ignore
            type="button"
            onClick={reset}
            className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
          >
            Reset
          </button>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${PLANE_W} ${PLANE_H}`}
        role="img"
        aria-label={`Latent space planning view. The current latent is at distance ${formatDistance(distance)} from the goal latent after ${steps} planning steps toward ${goal.label}.`}
        className="mt-4 block w-full"
      >
        <text x={PLANE_PAD} y={16} fill={DIM} fontSize={10} fontFamily={MONO}>
          embedding space (2-D projection): goal and state as latents
        </text>
        {[0.25, 0.5, 0.75].map((f) => (
          <g key={f}>
            <line
              x1={px(f)}
              x2={px(f)}
              y1={py(0)}
              y2={py(1)}
              stroke={BORDER}
              strokeWidth={1}
            />
            <line
              x1={px(0)}
              x2={px(1)}
              y1={py(f)}
              y2={py(f)}
              stroke={BORDER}
              strokeWidth={1}
            />
          </g>
        ))}
        <rect
          x={px(0)}
          y={py(1)}
          width={px(1) - px(0)}
          height={py(0) - py(1)}
          fill="none"
          stroke={BORDER_STRONG}
          strokeWidth={1}
        />

        {/* executed path through the embedding space */}
        {history.length > 1 && (
          <polyline
            points={history.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')}
            fill="none"
            stroke={ACCENT}
            strokeWidth={1.5}
            opacity={0.6}
          />
        )}

        {/* candidate fan from the latest planning step */}
        {lastPlan && (
          <g data-testid="candidate-fan">
            {lastPlan.candidates.map((c, i) => {
              const sx = px(state.x);
              const sy = py(state.y);
              const mx = (sx + px(c.endpoint.x)) / 2;
              const my = (sy + py(c.endpoint.y)) / 2;
              const nx = -(py(c.endpoint.y) - sy);
              const ny = px(c.endpoint.x) - sx;
              const nlen = Math.hypot(nx, ny) || 1;
              const bx = mx + (nx / nlen) * c.bend * (PLANE_W - 2 * PLANE_PAD);
              const by = my + (ny / nlen) * c.bend * (PLANE_H - 2 * PLANE_PAD);
              const chosen = i === lastPlan.chosenIndex;
              return (
                <polyline
                  key={i}
                  data-testid="candidate-sequence"
                  points={`${sx},${sy} ${bx.toFixed(1)},${by.toFixed(1)} ${px(c.endpoint.x)},${py(c.endpoint.y)}`}
                  fill="none"
                  stroke={chosen ? ACCENT : DIM}
                  strokeWidth={chosen ? 2 : 1}
                  opacity={chosen ? 1 : 0.3}
                />
              );
            })}
          </g>
        )}

        {/* energy connector between current latent and goal latent */}
        <line
          x1={px(state.x)}
          y1={py(state.y)}
          x2={px(goal.point.x)}
          y2={py(goal.point.y)}
          stroke={DIM}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <text
          x={(px(state.x) + px(goal.point.x)) / 2}
          y={(py(state.y) + py(goal.point.y)) / 2 - 6}
          textAnchor="middle"
          fill={DIM}
          fontSize={9}
          fontFamily={MONO}
        >
          d = {formatDistance(distance)}
        </text>

        {/* goal latent (the encoded goal image) */}
        <circle
          cx={px(goal.point.x)}
          cy={py(goal.point.y)}
          r={8}
          fill="none"
          stroke={OK}
          strokeWidth={1.5}
        />
        <circle cx={px(goal.point.x)} cy={py(goal.point.y)} r={3} fill={OK} />
        <text
          x={px(goal.point.x)}
          y={py(goal.point.y) - 14}
          textAnchor="middle"
          fill={OK}
          fontSize={9}
          fontFamily={MONO}
        >
          z_goal
        </text>

        {/* current latent state */}
        <circle
          cx={px(state.x)}
          cy={py(state.y)}
          r={6}
          fill="var(--color-bg)"
          stroke={ACCENT}
          strokeWidth={2}
        />
        <text
          x={px(state.x)}
          y={py(state.y) - 12}
          textAnchor="middle"
          fill={ACCENT}
          fontSize={9}
          fontFamily={MONO}
        >
          z_t
        </text>
      </svg>

      <svg
        viewBox={`0 0 ${TRACE_W} ${TRACE_H}`}
        role="img"
        aria-label={`Goal-embedding distance per planning step. The distance falls from ${formatDistance(initialDistance)} at step 0 to ${formatDistance(distance)} at step ${steps}.`}
        className="mt-2 block w-full"
      >
        <text
          x={TRACE_PAD.left}
          y={10}
          fill={DIM}
          fontSize={10}
          fontFamily={MONO}
        >
          goal-embedding distance vs planning step
        </text>
        {[0, 1].map((f) => {
          const y = TRACE_PAD.top + f * trace.plotH;
          return (
            <g key={f}>
              <line
                x1={TRACE_PAD.left}
                x2={TRACE_PAD.left + trace.plotW}
                y1={y}
                y2={y}
                stroke={BORDER}
                strokeWidth={1}
              />
              <text
                x={TRACE_PAD.left - 8}
                y={y + 4}
                textAnchor="end"
                fill={DIM}
                fontSize={10}
                fontFamily={MONO}
              >
                {formatDistance(trace.yMax * (1 - f))}
              </text>
            </g>
          );
        })}
        {[0, MAX_STEPS].map((t) => (
          <text
            key={t}
            x={traceX(t)}
            y={TRACE_H - 6}
            textAnchor={t === MAX_STEPS ? 'end' : 'middle'}
            fill={DIM}
            fontSize={10}
            fontFamily={MONO}
          >
            {t}
          </text>
        ))}
        {distances.length > 1 && (
          <path
            data-testid="distance-trace"
            d={tracePath}
            fill="none"
            stroke={ACCENT}
            strokeWidth={2}
          />
        )}
        <circle
          cx={traceX(steps)}
          cy={traceY(distance)}
          r={4.5}
          fill="var(--color-bg)"
          stroke={ACCENT}
          strokeWidth={2}
        />
      </svg>

      <div data-testid="no-decoder-note" className="mt-3 flex items-start gap-3">
        <CrossedFrame />
        <p className="font-sans text-xs leading-relaxed text-text-dim">
          No pixel decoder anywhere in the loop. The goal is an image encoded
          once into the same embedding space, and planning compares embeddings
          directly: candidate sequences are scored by the predicted distance
          between their final latent and the goal latent, and nothing is ever
          rendered back to pixels.
        </p>
      </div>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">d(z_t, z_goal) =</span>{' '}
        <span data-testid="distance-readout" className="text-accent">
          {formatDistance(distance)}
        </span>{' '}
        <span className="text-text-dim">after planning step</span>{' '}
        <span data-testid="step-readout">{steps}</span>
        {reached && (
          <>
            {' '}
            <span data-testid="goal-reached" className="text-ok">
              goal reached
            </span>
          </>
        )}
      </p>
    </div>
  );
}
