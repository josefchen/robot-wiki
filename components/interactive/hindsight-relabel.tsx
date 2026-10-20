'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PresetGroup, type Preset } from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, Line, Solid } from '@/components/iso/react/draw';
import { Stage, asksForStillness } from '@/components/iso/react/live';
import { HEIGHT, PARTS, WIDTH, movingAt, poseFrom, type TablePart } from '@/components/iso/figures/puck-push-table';
import { GIVEN_GOAL, PUCK_END, sparseReward, type TablePoint } from '@/lib/hindsight-push';

/**
 * HindsightRelabel: hindsight experience replay. A robot pushes a puck
 * toward a goal and misses. Under a sparse reward, 1 for reaching the goal
 * and 0 otherwise, the push teaches nothing. HER also stores the push
 * under a goal it did reach, the spot where the puck ended, and recomputes
 * the reward for that goal, so the same push becomes a success to learn
 * from.
 *
 * The stage is a puck-push test table (components/iso/figures/puck-push-
 * table.ts): a robot arm at one end has pushed a puck across the felt,
 * leaving a chalk trail; the goal it was given is printed on the felt and
 * marked by a pin; the goal the push is judged against is a hoop a gantry
 * holds just above the felt, the one lit part. The one control picks that
 * goal: the gantry carries the hoop from the pin to where the puck ended,
 * and the reward flag on its carriage rises once the hoop settles round the
 * puck.
 * Reduced motion jumps. The push is illustrative; the relabelling rule is
 * the paper's.
 */

type GoalId = 'given' | 'reached';
const GOALS: readonly Preset<GoalId>[] = [
  { id: 'given', label: 'The given goal' },
  { id: 'reached', label: 'Where the puck ended' },
];
export const DEFAULT_GOAL: GoalId = 'given';

const goalAt = (goal: GoalId): TablePoint => (goal === 'given' ? GIVEN_GOAL : PUCK_END);
/** The sparse reward: 1 when the puck stopped inside the goal ring, 0 otherwise. */
export function reward(goal: GoalId): 0 | 1 {
  return sparseReward(PUCK_END, goalAt(goal));
}

const STATEMENT: Record<GoalId, string> = {
  given: 'Missed the goal: reward 0, nothing to learn',
  reached: 'Same push, new goal: reward 1, a success',
};

function describe(goal: GoalId): string {
  return goal === 'given'
    ? `Judged against the goal it was given, the recorded push misses and earns a reward of ${reward('given')}; relabelled with the spot where the puck ended, the same push earns ${reward('reached')}, so 1 missed push also yields 1 success to learn from.`
    : `Relabelled with the spot where the puck ended, the recorded push earns a reward of ${reward('reached')}; against the goal it was given it earned ${reward('given')}, and hindsight experience replay stores it both ways.`;
}

/** How long the gantry takes to carry the ring between the two goals, and the flag to swing, seconds. */
const CARRY_SECONDS = 0.9;
const FLAG_SECONDS = 0.35;
const smooth = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};

function PartView({ part }: { part: TablePart }): ReactNode {
  if (part.kind === 'solid') {
    return <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <g dangerouslySetInnerHTML={{ __html: part.inner }} /> : undefined} />;
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  // The chalk the push left on the felt: a shade, not a part.
  if (part.kind === 'face') return <path className="iso-shade" data-shade={part.fill} d={part.d} />;
  return <Dots points={part.points} size={part.size} tone={part.tone} />;
}

const tenth = (value: number) => Math.round(value * 10) / 10;

export function HindsightRelabel({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const source = citationFor('her-2017');
  const [goal, setGoal] = useState<GoalId>(DEFAULT_GOAL);
  const relabelled = goal === 'reached';
  /** The table as drawn: how far the ring has come from the given goal (0) to the puck (1), and the flag's rise. */
  const [shown, setShown] = useState<{ share: number; flag: number }>(() => ({ share: goal === 'reached' ? 1 : 0, flag: reward(goal) }));
  const live = useRef({ share: shown.share, flag: shown.flag, from: shown.share, fromFlag: shown.flag, target: shown.share, start: 0 });
  const frame = useRef(0);
  const settled = useRef(goal);

  const tick = useCallback(function step(now: number) {
    const s = live.current;
    const t = (now - s.start) / 1000;
    // A flag that is up drops first; one that will rise goes up once the ring has settled round the puck.
    const down = s.fromFlag > 0 && s.target < 1;
    const carry = smooth((t - (down ? FLAG_SECONDS : 0)) / CARRY_SECONDS);
    s.share = s.from + (s.target - s.from) * carry;
    s.flag = down ? s.fromFlag * (1 - smooth(t / FLAG_SECONDS)) : s.target === 1 ? smooth((t - CARRY_SECONDS) / FLAG_SECONDS) : 0;
    setShown({ share: s.share, flag: s.flag });
    const total = CARRY_SECONDS + FLAG_SECONDS;
    frame.current = t < total ? requestAnimationFrame(step) : 0;
  }, []);

  useEffect(() => {
    if (settled.current === goal) return;
    settled.current = goal;
    const s = live.current;
    s.target = goal === 'reached' ? 1 : 0;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness()) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      s.share = s.target;
      s.flag = s.target;
      setShown({ share: s.share, flag: s.flag });
      return;
    }
    s.from = s.share;
    s.fromFlag = s.flag;
    s.start = performance.now();
    if (!frame.current) frame.current = requestAnimationFrame(tick);
  }, [goal, tick]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const moving = movingAt(poseFrom({ share: shown.share, flag: shown.flag, relabelled }));

  return (
    <InstrumentFigure
      figureId="hindsight-relabel"
      className={className}
      kicker="Hindsight experience replay"
      heading="Relabelled with where it ended, a miss still teaches"
      controls={<PresetGroup label="Judge the push against" presets={GOALS} value={goal} onChange={setGoal} testId="her-goal" />}
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint={<span data-figure-annotation="">{STATEMENT[goal]}</span>}
          readout={
            <>
              {relabelled ? 'Judged against where the puck ended' : 'Judged against the given goal'} · <span data-testid="her-reward">{`reward ${reward(goal)}`}</span>
            </>
          }
          status="Illustrative push; rule cited"
          data-testid="her-stage-frame"
        >
          <Stage className="iso-stage">
            <svg
              className="iso-svg"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              focusable="false"
              aria-label={`Seen from above, a robot pushed a puck that stopped short of its goal. Judged against ${relabelled ? 'the spot where the puck ended' : 'the goal it was given'}, the push earns a reward of ${reward(goal)}.`}
              aria-describedby={descriptionId}
              data-testid="her-stage"
              data-goal={goal}
              data-reward={reward(goal)}
              data-share={tenth(shown.share)}
              data-flag={tenth(shown.flag)}
            >
              {PARTS.map((part, index) => {
                if (part.kind !== 'slot') return <PartView key={index} part={part} />;
                const children = moving[part.slot].map((child, n) => <PartView key={n} part={child} />);
                if (part.slot === 'witness') {
                  return children.length ? (
                    <g key={part.slot} data-testid="her-given-goal">
                      {children}
                    </g>
                  ) : null;
                }
                return (
                  <g key={part.slot} data-part={part.slot} data-testid={part.slot === 'ringFront' ? 'her-goal-ring' : undefined}>
                    {children}
                  </g>
                );
              })}
            </svg>
          </Stage>
        </AnatomyStage>
      }
      caption="Hindsight experience replay relabels a missed push with where the puck stopped, turning reward 0 into a success."
      method={
        <>
          <div>
            With a sparse reward, 1 for reaching the goal and 0 otherwise, a robot that has never reached the goal
            has nothing to learn from. Hindsight experience replay stores each step under its original goal and
            under goals the robot did reach, recomputing the reward for each. Its simplest version uses the spot
            reached at the end of the episode, as here; its future version samples spots reached later in the same
            episode.
          </div>
          <div>
            Andrychowicz and colleagues trained a simulated seven-joint Fetch arm on pushing, sliding and
            pick-and-place; with the future version it learned all three, where the same learner without
            relabelling did not. Relabelling needs a reward that can be recomputed for any goal. The push drawn here
            is illustrative.
          </div>
          <div>
            The drawing is a push test table. A robot arm at one end has pushed the puck across the felt, leaving a
            chalk trail from the start mark to where it stopped. The goal the robot was given is printed on the felt
            and marked by a pin. The goal the push is judged against is the lit hoop a gantry holds just above the
            felt; the flag on the gantry&apos;s carriage stands up when the puck lies inside the hoop, a reward of 1.
            Relabelling carries the hoop from the pin to the puck; the pin and its printed circle stay where the
            given goal was.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="The same push, judged against two goals"
            description={describe(goal)}
            rowHeader="judged against"
            columns={[{ header: 'reward (0 or 1)', numeric: true }, { header: 'what the robot learns' }]}
            rows={GOALS.map((g) => ({
              label: g.label,
              values: [String(reward(g.id)), reward(g.id) === 1 ? 'how to push the puck to this spot' : 'nothing'],
            }))}
          />
        </>
      }
      source={
        <span data-testid="her-source">
          {source ? (
            <a data-brand-control-id="control:link-focus" href={source.url} target="_blank" rel="noopener" className="underline-offset-2">
              {source.label}
            </a>
          ) : (
            'Andrychowicz and colleagues'
          )}
          .
        </span>
      }
    />
  );
}
