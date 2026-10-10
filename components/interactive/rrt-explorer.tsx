'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
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
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageNumber, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_UNCERTAINTY,
  CHART_VIEW_WIDTH,
  LegendSwatch,
  StageAnnotation,
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
  type RrtResult,
} from '@/lib/rrt';

/**
 * RrtExplorer: a rapidly-exploring random tree grown toward a goal.
 *
 * The scene is a 100x64 planning world with a partial wall and four
 * circular obstacles between the start (left) and the goal (right). The
 * full tree is precomputed from a fixed seed, so the growth is identical
 * on every load; the controls only reveal it. The figure opens on the
 * finished tree with the found path lit, because that frame is the point.
 * "Grow the tree" replays the growth from the start (or resumes it from
 * a scrubbed iteration), the slider scrubs, and Step forward and Reset sit
 * in "Adjust more"; Reset returns to the finished tree.
 *
 * Interactive contract: deterministic render, native buttons and range
 * input (keyboard-accessible), readouts in the fold, reset control, fixed
 * SVG viewport (no layout shift). Playback runs on an interval (not rAF)
 * and degrades to coarse discrete jumps under prefers-reduced-motion.
 */

const WIDTH = CHART_VIEW_WIDTH;
/** Stage units per world unit: the 100x64 world maps to 320x204.8. */
const SCALE = 3.2;
const INSET_X = 10;
/** The world sits under a band that holds the stage note. */
const INSET_Y = 44;
const HEIGHT = Number((INSET_Y + RRT_SCENE.height * SCALE + 8).toFixed(1));
/** Baseline of the note's last line, and where its leader leaves the band. */
const NOTE_LAST_Y = 34;
const NOTE_LEADER_Y = 39;
const NOTE_X = 12;
const LINE_STEP = CHART_TYPE.labelPx * 1.25;
const STAGE_GROUND = 'var(--motion-stage)';

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

/**
 * The one stage note and the point it names: the found path once a branch
 * reaches the goal, otherwise the newest branch tip, or the start before
 * the tree has grown.
 */
function stageNote(result: RrtResult, iteration: number, goalReached: boolean) {
  if (goalReached) {
    // The path's highest point is where it slips over the wall.
    const over = result.path.reduce((top, p) => (p.y < top.y ? p : top));
    return { lines: ['The first branch to reach the goal', 'becomes the path'], at: over };
  }
  if (iteration <= 0) return { lines: ['The tree grows from the start'], at: RRT_SCENE.start };
  return {
    lines: ['New branches reach toward random spots,', 'so they fill open space first'],
    at: result.nodes[Math.min(iteration, result.nodes.length - 1)],
  };
}

/** A word on the stage, haloed so it reads over the branches. */
function StageWord({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={CHART_TYPE.labelPx}
      fontWeight={600}
      fill={CHART_STRUCTURE.label}
      stroke={STAGE_GROUND}
      strokeWidth={3}
      strokeLinejoin="round"
      paintOrder="stroke"
    >
      {children}
    </text>
  );
}

/** The fixed world: its boundary, the soft obstacles and the flagged goal. */
function PlanningWorld() {
  const constraint = roleColour('constraint');
  const reference = roleColour('reference');
  const softObstacle = {
    fill: constraint,
    fillOpacity: CHART_UNCERTAINTY.fillAlpha,
    stroke: constraint,
    strokeWidth: CHART_STROKE.structure,
    strokeOpacity: 0.6,
  };
  const gx = px(RRT_SCENE.goal.x);
  const gy = py(RRT_SCENE.goal.y);
  return (
    <>
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
              {...softObstacle}
            />
          ) : (
            <rect
              key={i}
              data-testid={`rrt-obstacle-${i}`}
              x={px(obstacle.x)}
              y={py(obstacle.y)}
              width={len(obstacle.w)}
              height={len(obstacle.h)}
              {...softObstacle}
            />
          ),
        )}
      </g>
      <g data-testid="rrt-goal" data-series="rrt-goal" data-chart-role="reference">
        <circle
          cx={gx}
          cy={gy}
          r={len(RRT_SCENE.goalRadius)}
          fill="none"
          stroke={reference}
          strokeWidth={CHART_STROKE.reference}
        />
        <line x1={gx} y1={gy} x2={gx} y2={gy - 17} stroke={reference} strokeWidth={CHART_STROKE.reference} strokeLinecap="round" />
        <path d={`M${gx} ${gy - 17} L${gx + 10} ${gy - 13.5} L${gx} ${gy - 10} Z`} fill={reference} />
      </g>
    </>
  );
}

export function RrtExplorer({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const result = useMemo(() => buildRrt(RRT_SCENE), []);
  const total = result.nodes.length - 1;
  const [iteration, setIteration] = useState(total);
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
  // have to be recreated on every tick just to read the latest count. It
  // is declared before the playback effect so a replay that rewinds to 0
  // and starts in one batch seeds the timer from 0.
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

  const reset = () => scrub(total);

  const grow = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (iteration >= total) setIteration(0);
    setPlaying(true);
  };

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
  const note = stageNote(result, iteration, goalReached);
  const target: [number, number] = [px(note.at.x), py(note.at.y)];
  const pathLengthText = goalReached ? `${formatLength(result.pathLength)} units` : 'n/a';

  return (
    <InstrumentFigure
      figureId="rrt-explorer"
      className={className}
      kicker="Rapidly-exploring random tree (RRT)"
      heading="Random branches feel their way around obstacles to the goal"
      controls={
        <>
          <button
            data-testid="rrt-grow"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={grow}
            aria-label={playing ? 'Pause the growth' : undefined}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {playing ? 'Pause' : 'Grow the tree'}
          </button>
          <ControlField>
            <ControlLabel htmlFor="rrt-iteration">How far the search has grown</ControlLabel>
            <input
              id="rrt-iteration"
              type="range"
              data-brand-control-id="control:input"
              min={0}
              max={total}
              step={1}
              value={iteration}
              onChange={(e) => scrub(Number(e.target.value))}
              aria-label={`How far the search has grown: exploration iteration ${iteration} of ${total}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="beginning" high="path found" />
          </ControlField>
        </>
      }
      adjust={
        <>
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
          <InstrumentReadout className="flex basis-full flex-wrap gap-x-3">
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
              <span data-testid="rrt-path-readout" style={goalReached ? { color: highlight } : undefined}>
                {pathLengthText}
              </span>
            </span>
          </InstrumentReadout>
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="rrt-tree" swatch={<LegendSwatch role="state" mark="line" />}>
                  tree branches
                </LegendItem>
                <LegendItem series="rrt-obstacles" swatch={<LegendSwatch role="constraint" mark="band" />}>
                  obstacle
                </LegendItem>
                <LegendItem swatch={<LegendSwatch role="highlight" mark="line" />}>path found</LegendItem>
              </InstrumentLegend>
              <StageStatus>Illustrative: one run on a made-up map</StageStatus>
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
            <g data-testid="rrt-tree" data-series="rrt-tree" data-chart-role="state" strokeOpacity={0.5}>
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
                is drawn after the tree so neither the tree nor the path covers it. */}
            <g data-testid="rrt-start" data-series="rrt-tree" data-chart-role="state">
              <circle
                cx={px(RRT_SCENE.start.x)}
                cy={py(RRT_SCENE.start.y)}
                r={CHART_STROKE.markerRadius + 1}
                fill={state}
              />
            </g>
            <StageWord x={px(RRT_SCENE.start.x)} y={py(RRT_SCENE.start.y) + 22}>Start</StageWord>
            {/* Nudged left so the two words stay inside the stage at 375 px. */}
            <StageWord x={px(RRT_SCENE.goal.x) - 12} y={py(RRT_SCENE.goal.y) + len(RRT_SCENE.goalRadius) + 18}>
              Goal area
            </StageWord>
            <StageAnnotation
              x={NOTE_X}
              y={NOTE_LAST_Y - LINE_STEP * (note.lines.length - 1)}
              lines={note.lines}
              target={target}
              from={[Math.min(Math.max(target[0], NOTE_X + 8), 140), NOTE_LEADER_Y]}
              pointer="arrow"
            />
          </PlotStage>
        </FigureStage>
      }
      caption="Rather than check every route, the robot's search grows random branches into open space until one reaches the goal."
      method={
        <>
          <p>
            Authored fixed-seed scene. Each sampling attempt selects the goal with probability 1.5% and otherwise
            samples uniformly; steps are capped at 2 world units. Each accepted step grows from the tree node
            nearest a random sample, so the tree spreads into open space. Every iteration adds one node; with this
            seed a branch first reaches the goal at iteration {goalIteration ?? total}, and the path it gives
            measures {formatLength(result.pathLength)} units.
          </p>
          <ChartDescription
            id={descriptionId}
            form="state"
            summary="Current RRT tree state"
            description={`The RRT tree is at iteration ${iteration} of ${total} with ${nodes.length} ${nodes.length === 1 ? 'node' : 'nodes'} and status ${status}; ${pathClause}.`}
            states={[
              { label: 'iteration', value: `${iteration} / ${total}` },
              { label: 'nodes', value: String(nodes.length) },
              { label: 'status', value: status },
              { label: 'path length', value: pathLengthText },
            ]}
          />
        </>
      }
    />
  );
}
