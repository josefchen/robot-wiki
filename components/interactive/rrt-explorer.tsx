'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Pause, Play } from '@phosphor-icons/react';
import { ChartDescription } from '@/components/ui';
import {
  RRT_SCENE,
  buildRrt,
  edgesUpTo,
  formatLength,
  nodesUpTo,
  pathIfReached,
  playbackCadence,
} from '@/lib/rrt';
import { cx } from '@/lib/utils';

/**
 * RrtExplorer: watch a rapidly-exploring random tree grow toward a goal.
 *
 * The scene is a 100x64 planning world with a partial wall and four
 * circular obstacles between the start (left) and the goal (right). The
 * full tree is precomputed from a fixed seed, so the growth is identical
 * on every load; the controls only reveal it: Run plays the growth on an
 * interval, Step adds one iteration, the slider scrubs, Reset clears back
 * to the bare scene. Once the tree connects to the goal, the start-to-goal
 * path is highlighted in amber with its length in the readout.
 *
 * Interactive contract: deterministic render, native buttons and range
 * input (keyboard-accessible), visible monospace readouts, reset control,
 * fixed SVG viewport (no layout shift). Playback runs on an interval (not
 * rAF) and degrades to coarse discrete jumps under prefers-reduced-motion.
 */

/** World units per SVG pixel: 100x64 world maps to 640x409.6. */
const SCALE = 6.4;
const WIDTH = 640;
const HEIGHT = 410;

const f = (v: number) => Number((v * SCALE).toFixed(2));

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function statusText(iteration: number, goalIteration: number | null): string {
  if (goalIteration !== null && iteration >= goalIteration) {
    return `goal reached at iteration ${goalIteration}`;
  }
  if (iteration <= 0) return 'tree not started';
  return 'exploring free space';
}

export function RrtExplorer({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const result = useMemo(() => buildRrt(RRT_SCENE), []);
  const total = result.nodes.length - 1;
  const [iteration, setIteration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);
  // Mirror of `iteration` for the interval callback, so the timer does not
  // have to be recreated on every tick just to read the latest count.
  const iterationRef = useRef(iteration);
  useEffect(() => {
    iterationRef.current = iteration;
  }, [iteration]);

  const nodes = nodesUpTo(result, iteration);
  const edges = edgesUpTo(result, iteration);
  const path = pathIfReached(result, iteration);
  const goalReached = path.length > 0;

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Interval playback: advances the iteration count on the cadence for the
  // current motion preference, stopping on its own at the final iteration.
  // The tick counter is closure-local (seeded from the ref mirror on
  // resume) so batched timers never read a stale count. Cleanup on pause
  // or unmount.
  useEffect(() => {
    if (!playing) return;
    const { tickMs, nodesPerTick } = playbackCadence(prefersReducedMotion());
    let current = iterationRef.current;
    timerRef.current = window.setInterval(() => {
      current = Math.min(total, current + nodesPerTick);
      setIteration(current);
      if (current >= total) {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setPlaying(false);
      }
    }, tickMs);
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing, total]);

  const scrub = (next: number) => {
    stopTimer();
    setPlaying(false);
    setIteration(Math.min(total, Math.max(0, next)));
  };

  const reset = () => scrub(0);

  const status = statusText(iteration, result.goalNodeId);
  const buttonBase =
    'rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label
            htmlFor="rrt-iteration"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Exploration iteration
            <span className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text">
              {iteration} / {total}
            </span>
          </label>
          <input
            id="rrt-iteration"
            type="range"
            min={0}
            max={total}
            step={1}
            value={iteration}
            onChange={(e) => scrub(Number(e.target.value))}
            aria-label={`Exploration iteration, currently ${iteration} of ${total}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <div className="flex gap-2">
          <button
            data-pagefind-ignore
            type="button"
            onClick={() => setPlaying((p) => !p)}
            disabled={!playing && iteration >= total}
            aria-label={
              playing ? 'Pause the exploration' : 'Run the exploration'
            }
            className={cx(buttonBase, 'inline-flex items-center gap-1.5')}
          >
            {playing ? (
              <Pause size={12} weight="bold" aria-hidden />
            ) : (
              <Play size={12} weight="bold" aria-hidden />
            )}
            {playing ? 'Pause' : 'Run'}
          </button>
          <button
            data-pagefind-ignore
            type="button"
            onClick={() => scrub(iteration + 1)}
            disabled={iteration >= total}
            className={buttonBase}
          >
            Step forward
          </button>
          <button data-pagefind-ignore type="button" onClick={reset} className={buttonBase}>
            Reset
          </button>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`RRT exploration of a 2D planning scene with ${RRT_SCENE.obstacles.length} obstacles between a start on the left and a goal on the right. Iteration ${iteration} of ${total}, ${nodes.length} nodes. Status: ${status}.`}
        aria-describedby={descriptionId}
        data-testid="rrt-scene"
        className="mt-4 block w-full"
      >
        {/* World frame */}
        <rect
          x={0.5}
          y={0.5}
          width={WIDTH - 1}
          height={f(RRT_SCENE.height) - 1}
          fill="var(--color-surface-2)"
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        {/* Obstacles */}
        {RRT_SCENE.obstacles.map((obstacle, i) =>
          obstacle.kind === 'circle' ? (
            <circle
              key={i}
              data-testid={`rrt-obstacle-${i}`}
              cx={f(obstacle.x)}
              cy={f(obstacle.y)}
              r={f(obstacle.r)}
              fill="var(--color-border)"
              stroke="var(--color-border-strong)"
              strokeWidth={1}
            />
          ) : (
            <rect
              key={i}
              data-testid={`rrt-obstacle-${i}`}
              x={f(obstacle.x)}
              y={f(obstacle.y)}
              width={f(obstacle.w)}
              height={f(obstacle.h)}
              fill="var(--color-border)"
              stroke="var(--color-border-strong)"
              strokeWidth={1}
            />
          ),
        )}
        {/* Tree edges, revealed up to the current iteration */}
        <g data-testid="rrt-tree">
          {edges.map((edge) => (
            <line
              key={edge.to.id}
              x1={f(edge.from.x)}
              y1={f(edge.from.y)}
              x2={f(edge.to.x)}
              y2={f(edge.to.y)}
              stroke="var(--color-text-dim)"
              strokeWidth={1}
              opacity={0.55}
            />
          ))}
        </g>
        {/* Goal region + marker */}
        <circle
          cx={f(RRT_SCENE.goal.x)}
          cy={f(RRT_SCENE.goal.y)}
          r={f(RRT_SCENE.goalRadius)}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.5}
        />
        <g data-testid="rrt-goal">
          <circle
            cx={f(RRT_SCENE.goal.x)}
            cy={f(RRT_SCENE.goal.y)}
            r={5}
            fill={goalReached ? 'var(--color-accent)' : 'none'}
            stroke="var(--color-accent)"
            strokeWidth={1.5}
          />
          <text
            x={f(RRT_SCENE.goal.x) - 8}
            y={f(RRT_SCENE.goal.y) - 12}
            textAnchor="end"
            fill="var(--color-text)"
            fontSize={11}
            fontFamily="var(--font-mono)"
          >
            goal
          </text>
        </g>
        {/* Highlighted start-to-goal path once connected */}
        {goalReached ? (
          <polyline
            data-testid="rrt-path"
            points={path.map((p) => `${f(p.x)},${f(p.y)}`).join(' ')}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {/* Start marker (drawn last so the tree never covers it) */}
        <g data-testid="rrt-start">
          <circle
            cx={f(RRT_SCENE.start.x)}
            cy={f(RRT_SCENE.start.y)}
            r={5}
            fill="var(--color-ok)"
          />
          <text
            x={f(RRT_SCENE.start.x) + 10}
            y={f(RRT_SCENE.start.y) - 10}
            fill="var(--color-text)"
            fontSize={11}
            fontFamily="var(--font-mono)"
          >
            start
          </text>
        </g>
      </svg>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">iteration</span>{' '}
        <span data-testid="rrt-iteration-readout" className="text-accent">
          {iteration} / {total}
        </span>{' '}
        <span className="text-text-dim">nodes</span>{' '}
        <span data-testid="rrt-node-readout" className="text-text">
          {nodes.length}
        </span>{' '}
        <span data-testid="rrt-status-readout" className="text-text-dim">
          {status}
        </span>{' '}
        <span className="text-text-dim">path length</span>{' '}
        <span
          data-testid="rrt-path-readout"
          className={goalReached ? 'text-accent' : 'text-text-dim'}
        >
          {goalReached ? `${formatLength(result.pathLength)} units` : 'n/a'}
        </span>
      </p>
      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="state"
        summary="Current RRT tree state"
        description={`The RRT tree is at iteration ${iteration} of ${total} with ${nodes.length} ${nodes.length === 1 ? 'node' : 'nodes'} and status ${status}; path length is ${goalReached ? `${formatLength(result.pathLength)} units` : 'n/a'} until a branch first reaches the goal.`}
        states={[
          { label: 'iteration', value: `${iteration} / ${total}` },
          { label: 'nodes', value: String(nodes.length) },
          { label: 'status', value: status },
          {
            label: 'path length',
            value: goalReached ? `${formatLength(result.pathLength)} units` : 'n/a',
          },
        ]}
      />
      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        One accepted extension per iteration from a fixed seed, so the growth
        is identical on every load. Each step samples a random point (2% of
        the time the goal itself), finds the nearest tree node, and extends a
        fixed length toward it, keeping the branch only when the segment
        stays clear of the obstacles. The bias toward unexplored space is why
        the canopy spreads first and the goal connection arrives late.
      </p>
    </div>
  );
}
