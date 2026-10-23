'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChartDescription } from '@/components/ui';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  SliderEnds,
} from '@/components/ui/instrument';
import { StageNumber } from '@/components/motion/figure-frame';
import { roleColour } from '@/components/motion/chart';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { PartView } from '@/components/iso/part-view';
import { Dots, Line } from '@/components/iso/react/draw';
import { Stage } from '@/components/iso/react/live';
import {
  PARK,
  PARTS,
  VIEW_BOX,
  WIDTH,
  branchInk,
  gantryParts,
  inkPoint,
  pathInk,
  standingParts,
  type Part,
} from '@/components/iso/figures/rrt-plotter';
import {
  RRT_SCENE,
  buildRrt,
  edgesUpTo,
  formatLength,
  nodesUpTo,
  pathIfReached,
  playbackCadence,
  type RrtResult,
  type Vec2,
} from '@/lib/rrt';

/**
 * RrtExplorer: a rapidly-exploring random tree grown toward a goal, drawn
 * as a gantry plotter over the planning map (components/iso/figures/rrt-plotter.ts).
 *
 * The scene is a 100x64 planning world with a partial wall and four
 * circular obstacles between the start (left) and the goal (right), each a
 * block standing on the plotter's board. The pen inks every accepted
 * branch and dots its node, and when a branch reaches the goal ring the
 * path back to the start peg is inked in the lit pen. The
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
 * The one stage hint and where the pen stands: once a branch reaches the
 * goal the path is inked and the gantry parks clear of the map, otherwise
 * the pen stands on the newest branch tip, or on the start before the tree
 * has grown.
 */
export function stageNote(result: RrtResult, iteration: number, goalReached: boolean): { text: string; at: Vec2 } {
  if (goalReached) return { text: 'The first branch to reach the goal becomes the path', at: PARK };
  if (iteration <= 0) return { text: 'The tree grows from the start', at: RRT_SCENE.start };
  return {
    text: 'New branches reach toward random spots, so they fill open space first',
    at: result.nodes[Math.min(iteration, result.nodes.length - 1)],
  };
}

/** The stage readout in plain words; the exact counts and the path's length sit in the fold. */
export function readoutFor(iteration: number, goalReached: boolean): string {
  if (iteration <= 0) return 'No branches yet';
  const grown = `${iteration} ${iteration === 1 ? 'branch' : 'branches'}`;
  return goalReached ? `${grown} · the path is found` : `${grown} · still exploring`;
}

/** How quickly the gantry glides to the pen's next place, in seconds. */
const GLIDE_S = 0.07;

/**
 * The pen's drawn place, gliding toward `target` so the gantry follows the
 * growing tree calmly instead of jumping from tick to tick; reduced motion
 * jumps. The target is the model's; only the drawing lags it.
 */
function useEasedPen(target: Vec2, still: boolean): Vec2 {
  const [shown, setShown] = useState<Vec2>(target);
  const drawn = useRef<Vec2>(target);
  useEffect(() => {
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      const k = still || prefersReducedMotion() ? 1 : 1 - Math.exp(-dt / GLIDE_S);
      const { x, y } = drawn.current;
      let next = { x: x + (target.x - x) * k, y: y + (target.y - y) * k };
      const done = Math.hypot(target.x - next.x, target.y - next.y) < 0.02;
      if (done) next = target;
      drawn.current = next;
      setShown(next);
      if (!done) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, still]);
  return shown;
}

const sameParts = (parts: Part[]) => parts.map((part, n) => (part.kind === 'slot' || part.kind === 'wire' ? null : <PartView key={n} part={part} />));

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
  const highlight = roleColour('highlight');
  const note = stageNote(result, iteration, goalReached);
  const pen = useEasedPen(note.at, reducedMotion);
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
            onClick={iteration >= total ? undefined : () => scrub(iteration + 1)}
            aria-disabled={iteration >= total || undefined}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Step forward
          </button>
          <InstrumentReset onClick={reset} />
          {/* Quiet while the tree grows, which rewrites it every tick; the stage speaks where it stops. */}
          <InstrumentReadout aria-live={playing ? 'off' : 'polite'} className="flex basis-full flex-wrap gap-x-3">
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
        <AnatomyStage
          viewWidth={WIDTH}
          hint={note.text}
          readout={readoutFor(iteration, goalReached)}
          status="Illustrative: one run on a made-up map"
          data-testid="rrt-stage-frame"
        >
          <Stage className="iso-stage">
            <svg
              className="iso-svg"
              viewBox={VIEW_BOX}
              role="img"
              focusable="false"
              aria-label={`RRT exploration of a 2D planning scene with ${RRT_SCENE.obstacles.length} obstacles between a start on the left and a goal on the right. Iteration ${iteration} of ${total}, ${nodes.length} nodes. Status: ${status}.`}
              aria-describedby={descriptionId}
              data-testid="rrt-scene"
            >
              {PARTS.map((part, index) => {
                if (part.kind !== 'slot') return part.kind === 'wire' ? null : <PartView key={index} part={part} />;
                if (part.slot === 'ink') {
                  return (
                    <g key="ink" data-part="ink">
                      {/* The drawing carries no words; every stage hint and readout under it names the tree or its branches. */}
                      <g data-testid="rrt-tree" data-series="rrt-tree" data-series-labelled="">
                        {edges.map((edge) => {
                          const [a, b] = branchInk(edge.from, edge.to);
                          return (
                            <line
                              key={edge.to.id}
                              className="iso-line"
                              data-tone="lo"
                              x1={a[0].toFixed(1)}
                              y1={a[1].toFixed(1)}
                              x2={b[0].toFixed(1)}
                              y2={b[1].toFixed(1)}
                            />
                          );
                        })}
                        <Dots points={nodes.map(inkPoint)} size={0.55} tone="mid" />
                      </g>
                      {goalReached ? (
                        <g data-testid="rrt-path" data-selection="start-to-goal path" data-length={formatLength(result.pathLength)}>
                          <Line d={pathInk(path)} tone="lit" />
                          <Dots points={path.map(inkPoint)} size={0.8} tone="hi" />
                        </g>
                      ) : null}
                    </g>
                  );
                }
                if (part.slot === 'standing') {
                  return (
                    <g key="standing" data-part="standing">
                      {standingParts(pen, goalReached).map(({ id, parts }) => (
                        <g key={id} data-testid={id === 'pen-nib' ? 'rrt-pen' : `rrt-${id}`} data-at={id === 'pen-nib' ? `${note.at.x.toFixed(2)} ${note.at.y.toFixed(2)}` : undefined}>
                          {sameParts(parts)}
                        </g>
                      ))}
                    </g>
                  );
                }
                return (
                  <g key="gantry" data-part="gantry">
                    {sameParts(gantryParts(pen))}
                  </g>
                );
              })}
            </svg>
          </Stage>
        </AnatomyStage>
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
