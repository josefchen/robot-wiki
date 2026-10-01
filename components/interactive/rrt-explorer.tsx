'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Pause, Play } from '@phosphor-icons/react';
import { ChartDescription } from '@/components/ui';
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
import { FigureStage, StageNumber } from '@/components/motion/figure-frame';
import {
  CHART_HATCH,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_VIEW_WIDTH,
  LegendSwatch,
  roleColour,
} from '@/components/motion/chart';
import {
  RRT_SCENE,
  buildRrt,
  edgesUpTo,
  formatLength,
  nodesUpTo,
  pathIfReached,
  playbackCadence,
} from '@/lib/rrt';

/**
 * RrtExplorer: watch a rapidly-exploring random tree grow toward a goal.
 *
 * The scene is a 100x64 planning world with a partial wall and four
 * circular obstacles between the start (left) and the goal (right). The
 * full tree is precomputed from a fixed seed, so the growth is identical
 * on every load; the controls only reveal it: Run plays the growth on an
 * interval, Step adds one iteration, the slider scrubs, Reset clears back
 * to the bare scene. Once the tree connects to the goal, the start-to-goal
 * path is highlighted with its length in the readout.
 *
 * Interactive contract: deterministic render, native buttons and range
 * input (keyboard-accessible), visible readouts, reset control, fixed SVG
 * viewport (no layout shift). Playback runs on an interval (not rAF) and
 * degrades to coarse discrete jumps under prefers-reduced-motion.
 */

const WIDTH = CHART_VIEW_WIDTH;
/** Stage units per world unit: the 100x64 world maps to 320x204.8. */
const SCALE = 3.2;
const INSET_X = 10;
const INSET_Y = 8;
const HEIGHT = 221;
const HATCH_ID = 'rrt-explorer-hatch';

const px = (v: number) => Number((INSET_X + v * SCALE).toFixed(2));
const py = (v: number) => Number((INSET_Y + v * SCALE).toFixed(2));
const len = (v: number) => Number((v * SCALE).toFixed(2));

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

/** The fixed world: its boundary, the hatched obstacles and the goal region. */
function PlanningWorld() {
  const constraint = roleColour('constraint');
  const hatchedObstacle = {
    fill: `url(#${HATCH_ID})`,
    stroke: constraint,
    strokeWidth: CHART_HATCH.width,
  };
  return (
    <>
      <defs>
        <pattern
          id={HATCH_ID}
          width={CHART_HATCH.spacing}
          height={CHART_HATCH.spacing}
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${CHART_HATCH.angle})`}
        >
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={CHART_HATCH.spacing}
            stroke={constraint}
            strokeWidth={CHART_HATCH.width}
          />
        </pattern>
      </defs>
      <g data-scene-structure="planning-world">
        <rect
          x={px(0)}
          y={py(0)}
          width={len(RRT_SCENE.width)}
          height={len(RRT_SCENE.height)}
          fill="none"
          stroke={CHART_STRUCTURE.axes}
          strokeWidth={CHART_STROKE.structure}
          opacity={CHART_STRUCTURE.axesOpacity}
        />
      </g>
      <g data-series="rrt-obstacles" data-chart-role="constraint">
        {RRT_SCENE.obstacles.map((obstacle, i) =>
          obstacle.kind === 'circle' ? (
            <circle
              key={i}
              data-testid={`rrt-obstacle-${i}`}
              cx={px(obstacle.x)}
              cy={py(obstacle.y)}
              r={len(obstacle.r)}
              {...hatchedObstacle}
            />
          ) : (
            <rect
              key={i}
              data-testid={`rrt-obstacle-${i}`}
              x={px(obstacle.x)}
              y={py(obstacle.y)}
              width={len(obstacle.w)}
              height={len(obstacle.h)}
              {...hatchedObstacle}
            />
          ),
        )}
      </g>
      <g data-testid="rrt-goal" data-series="rrt-goal" data-chart-role="reference">
        <circle
          cx={px(RRT_SCENE.goal.x)}
          cy={py(RRT_SCENE.goal.y)}
          r={len(RRT_SCENE.goalRadius)}
          fill="none"
          stroke={roleColour('reference')}
          strokeWidth={CHART_STROKE.reference}
          strokeDasharray={CHART_STROKE.dash}
        />
      </g>
    </>
  );
}

export function RrtExplorer({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const result = useMemo(() => buildRrt(RRT_SCENE), []);
  const total = result.nodes.length - 1;
  const [iteration, setIteration] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Track the live preference so a change after mount, including during
  // playback, rebuilds the timer instead of leaving a smooth cadence
  // captured from a one-shot read.
  const [reducedMotion, setReducedMotion] = useState(false);
  const timerRef = useRef<number | null>(null);
  const playbackGenerationRef = useRef(0);
  const cadenceSignalRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

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
      playbackGenerationRef.current += 1;
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Interval playback: advances the iteration count on the cadence for the
  // current motion preference, stopping on its own at the final iteration.
  // The tracked preference rebuilds the timer on a mid-run change, while a
  // fresh read makes the accessible coarse cadence win if the media state
  // changes between render and effect. The tick counter is closure-local
  // (seeded from the ref mirror on resume) so batched timers never read a
  // stale count. Cleanup on pause, cadence change, or unmount.
  useEffect(() => {
    if (!playing) {
      if (cadenceSignalRef.current) {
        cadenceSignalRef.current.dataset.playbackCadence = 'idle';
      }
      return;
    }
    const useCoarseCadence = reducedMotion || prefersReducedMotion();
    const { tickMs, nodesPerTick } = playbackCadence(useCoarseCadence);
    const playbackGeneration = ++playbackGenerationRef.current;
    let current = iterationRef.current;
    // This state is the deterministic transition signal used by browser
    // tests. React runs the previous effect's cleanup before this setup, so
    // publishing it means the old interval has been cleared. The generation
    // guard also makes an already-queued callback from that interval inert.
    if (cadenceSignalRef.current) {
      cadenceSignalRef.current.dataset.playbackCadence = useCoarseCadence
        ? 'coarse'
        : 'smooth';
    }
    timerRef.current = window.setInterval(() => {
      if (playbackGenerationRef.current !== playbackGeneration) return;
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
      stopTimer();
    };
  }, [playing, total, reducedMotion]);

  const scrub = (next: number) => {
    stopTimer();
    setPlaying(false);
    setIteration(Math.min(total, Math.max(0, next)));
  };

  const reset = () => scrub(0);

  const status = statusText(iteration, result.goalNodeId);
  // The path clause has two honest forms: before the connection the
  // length does not exist yet, and after it the sentence reports the
  // measurement instead of asserting it is still pending.
  const goalIteration = result.goalNodeId;
  const pathClause =
    goalReached && goalIteration !== null
      ? `the highlighted start-to-goal path measures ${formatLength(result.pathLength)} units after a branch first reached the goal at iteration ${goalIteration}`
      : 'path length is n/a until a branch first reaches the goal';
  const state = roleColour('state');
  const highlight = roleColour('highlight');

  return (
    <InstrumentFigure
      figureId="rrt-explorer"
      className={className}
      heading="Rapidly-exploring random tree"
      controls={
        <>
          <ControlField>
            <ControlLabel htmlFor="rrt-iteration" value={`${iteration} / ${total}`}>
              Exploration iteration
            </ControlLabel>
            <input
              id="rrt-iteration"
              type="range"
              data-brand-control-id="control:input"
              min={0}
              max={total}
              step={1}
              value={iteration}
              onChange={(e) => scrub(Number(e.target.value))}
              aria-label={`Exploration iteration, currently ${iteration} of ${total}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={() => setPlaying((p) => !p)}
            disabled={!playing && iteration >= total}
            aria-label={
              playing ? 'Pause the exploration' : 'Run the exploration'
            }
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {playing ? (
              <Pause size={14} weight="bold" aria-hidden />
            ) : (
              <Play size={14} weight="bold" aria-hidden />
            )}
            {playing ? 'Pause' : 'Run'}
          </button>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={() => scrub(iteration + 1)}
            disabled={iteration >= total}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Step forward
          </button>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="rrt-tree" swatch={<LegendSwatch role="state" mark="line" />}>
                  tree
                </LegendItem>
                <LegendItem swatch={<LegendSwatch role="state" mark="dot" />}>start</LegendItem>
                <LegendItem series="rrt-obstacles" swatch={<LegendSwatch role="constraint" mark="hatch" />}>
                  obstacle
                </LegendItem>
                <LegendItem series="rrt-goal" swatch={<LegendSwatch role="reference" mark="dash" />}>
                  goal region
                </LegendItem>
                <LegendItem swatch={<LegendSwatch role="highlight" mark="line" />}>
                  highlighted start-to-goal path
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout className="flex flex-wrap gap-x-3">
                <span>
                  iteration{' '}
                  <span ref={cadenceSignalRef} data-testid="rrt-iteration-readout">
                    <StageNumber>
                      {iteration} / {total}
                    </StageNumber>
                  </span>
                </span>
                <span>
                  nodes <StageNumber data-testid="rrt-node-readout">{nodes.length}</StageNumber>
                </span>
                <span data-testid="rrt-status-readout">{status}</span>
                <span>
                  path length{' '}
                  <span
                    data-testid="rrt-path-readout"
                    style={goalReached ? { color: highlight } : undefined}
                  >
                    {goalReached ? `${formatLength(result.pathLength)} units` : 'n/a'}
                  </span>
                </span>
              </InstrumentReadout>
              <ChartDescription
                id={descriptionId}
                form="state"
                summary="Current RRT tree state"
                description={`The RRT tree is at iteration ${iteration} of ${total} with ${nodes.length} ${nodes.length === 1 ? 'node' : 'nodes'} and status ${status}; ${pathClause}.`}
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
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`RRT exploration of a 2D planning scene with ${RRT_SCENE.obstacles.length} obstacles between a start on the left and a goal on the right. Iteration ${iteration} of ${total}, ${nodes.length} nodes. Status: ${status}.`}
            aria-describedby={descriptionId}
            data-testid="rrt-scene"
          >
            <PlanningWorld />
            <g data-testid="rrt-tree" data-series="rrt-tree" data-chart-role="state">
              {edges.map((edge) => (
                <line
                  key={edge.to.id}
                  x1={px(edge.from.x)}
                  y1={py(edge.from.y)}
                  x2={px(edge.to.x)}
                  y2={py(edge.to.y)}
                  stroke={state}
                  strokeWidth={CHART_STROKE.structure}
                  strokeLinecap="round"
                />
              ))}
            </g>
            {goalReached ? (
              <polyline
                data-testid="rrt-path"
                data-chart-role="highlight"
                data-selection="start-to-goal path"
                points={path.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')}
                fill="none"
                stroke={highlight}
                strokeWidth={CHART_STROKE.trace * 1.25}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {/* The start is the tree's root, so it joins the tree series; it
                is drawn last so neither the tree nor the path covers it. */}
            <g data-testid="rrt-start" data-series="rrt-tree" data-chart-role="state">
              <circle
                cx={px(RRT_SCENE.start.x)}
                cy={py(RRT_SCENE.start.y)}
                r={CHART_STROKE.markerRadius + 1}
                fill={state}
              />
            </g>
          </PlotStage>
        </FigureStage>
      }
      caption="Each accepted step grows from the tree node nearest a random sample, so the tree spreads into open space."
      source="Authored fixed-seed scene. Each sampling attempt selects the goal with probability 1.5% and otherwise samples uniformly; steps are capped at 2 world units."
    />
  );
}
