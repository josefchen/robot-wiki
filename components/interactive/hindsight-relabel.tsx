'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage, PresetGroup, type Preset } from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  DirectLabel,
  LineTrace,
  StageAnnotation,
  roleColour,
  type ChartPoint,
} from '@/components/motion/chart';
import { useEasedValue } from '@/components/motion/use-eased-value';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * HindsightRelabel: hindsight experience replay. A robot pushes a puck
 * toward a goal and misses. Under a sparse reward, 1 for reaching the goal
 * and 0 otherwise, the push teaches nothing. HER also stores the push
 * under a goal it did reach, the spot where the puck ended, and recomputes
 * the reward for that goal, so the same push becomes a success to learn
 * from.
 *
 * The one control picks the goal the push is judged against. The goal
 * ring glides from the goal the robot was given to where the puck ended
 * on the motion curve, and the reward is recomputed; reduced motion jumps.
 * The push is illustrative; the relabelling rule is the paper's.
 */

type GoalId = 'given' | 'reached';
const GOALS: readonly Preset<GoalId>[] = [
  { id: 'given', label: 'The given goal' },
  { id: 'reached', label: 'Where the puck ended' },
];
export const DEFAULT_GOAL: GoalId = 'given';

const WIDTH = 340;
const HEIGHT = 186;
const TABLE = { left: 4, top: 30, right: 336, bottom: 182 } as const;
const PUCK_START: ChartPoint = [52, 128];
const PUCK_END: ChartPoint = [196, 112];
const GIVEN_GOAL: ChartPoint = [292, 68];
const GOAL_RADIUS = 12;
const PUCK = 12;
const f = (v: number) => Number(v.toFixed(2));

/** The recorded push, a gentle curve from the start to where the puck stopped. */
const PUSH: ChartPoint[] = Array.from({ length: 25 }, (_, k) => {
  const t = k / 24;
  const u = 1 - t;
  const c: ChartPoint = [124, 146];
  return [f(u * u * PUCK_START[0] + 2 * u * t * c[0] + t * t * PUCK_END[0]), f(u * u * PUCK_START[1] + 2 * u * t * c[1] + t * t * PUCK_END[1])];
});

const goalAt = (goal: GoalId): ChartPoint => (goal === 'given' ? GIVEN_GOAL : PUCK_END);
/** The sparse reward: 1 when the puck stopped inside the goal ring, 0 otherwise. */
export function reward(goal: GoalId): 0 | 1 {
  const [gx, gy] = goalAt(goal);
  return Math.hypot(PUCK_END[0] - gx, PUCK_END[1] - gy) <= GOAL_RADIUS ? 1 : 0;
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

export function HindsightRelabel({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const source = citationFor('her-2017');
  const [goal, setGoal] = useState<GoalId>(DEFAULT_GOAL);
  const t = useEasedValue(goal === 'reached' ? 1 : 0);
  const accent = roleColour('highlight');
  const ring: ChartPoint = [f(GIVEN_GOAL[0] + (PUCK_END[0] - GIVEN_GOAL[0]) * t), f(GIVEN_GOAL[1] + (PUCK_END[1] - GIVEN_GOAL[1]) * t)];
  const relabelled = goal === 'reached';

  return (
    <InstrumentFigure
      figureId="hindsight-relabel"
      className={className}
      kicker="Hindsight experience replay"
      heading="Relabelled with where it ended, a miss still teaches"
      controls={<PresetGroup label="Judge the push against" presets={GOALS} value={goal} onChange={setGoal} testId="her-goal" />}
      stage={
        <FigureStage footer={<StageStatus>Illustrative push; rule cited</StageStatus>}>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Seen from above, a robot pushed a puck that stopped short of its goal. Judged against ${relabelled ? 'the spot where the puck ended' : 'the goal it was given'}, the push earns a reward of ${reward(goal)}.`}
            aria-describedby={descriptionId}
            data-testid="her-stage"
            data-goal={goal}
            data-reward={reward(goal)}
          >
            <StageAnnotation x={TABLE.left} y={16} lines={[STATEMENT[goal]]} />
            <rect
              x={TABLE.left}
              y={TABLE.top}
              width={TABLE.right - TABLE.left}
              height={TABLE.bottom - TABLE.top}
              fill="none"
              stroke={CHART_STRUCTURE.grid}
              strokeWidth={CHART_STROKE.structure}
            />
            <g data-series="push">
              <LineTrace points={PUSH} role="reference" />
            </g>
            <rect
              x={PUCK_START[0] - PUCK / 2}
              y={PUCK_START[1] - PUCK / 2}
              width={PUCK}
              height={PUCK}
              fill="none"
              stroke={CHART_STRUCTURE.labelSecondary}
              strokeWidth={CHART_STROKE.structure}
              strokeDasharray="2 2"
            />
            <DirectLabel x={PUCK_START[0] - PUCK / 2} y={PUCK_START[1] - 14}>
              pushed from here
            </DirectLabel>
            <rect
              data-testid="her-puck"
              x={PUCK_END[0] - PUCK / 2}
              y={PUCK_END[1] - PUCK / 2}
              width={PUCK}
              height={PUCK}
              fill={CHART_STRUCTURE.label}
            />
            <DirectLabel x={PUCK_END[0]} y={PUCK_END[1] + 32} anchor="middle" role={relabelled ? 'highlight' : undefined}>
              {relabelled ? 'new goal: where the puck ended' : 'where the puck ended'}
            </DirectLabel>
            {relabelled ? (
              <g data-testid="her-given-goal" data-chart-role="reference">
                <circle
                  cx={GIVEN_GOAL[0]}
                  cy={GIVEN_GOAL[1]}
                  r={GOAL_RADIUS}
                  fill="none"
                  stroke={roleColour('reference')}
                  strokeWidth={CHART_STROKE.reference}
                  strokeDasharray={CHART_STROKE.dash}
                />
              </g>
            ) : null}
            <text
              x={GIVEN_GOAL[0] + GOAL_RADIUS + 6}
              y={GIVEN_GOAL[1] - GOAL_RADIUS - 8}
              textAnchor="end"
              fontSize={CHART_TYPE.labelPx}
              fill={relabelled ? 'var(--role-reference-text)' : accent}
            >
              given goal
            </text>
            <g data-testid="her-goal-ring" data-chart-role="highlight" data-at={ring.join(',')}>
              <circle cx={ring[0]} cy={ring[1]} r={GOAL_RADIUS} fill="none" stroke={accent} strokeWidth={CHART_STROKE.trace} />
              <circle cx={ring[0]} cy={ring[1]} r={2} fill={accent} stroke={MOTION_STAGE.background} strokeWidth={0.5} />
            </g>
            <text
              data-testid="her-reward"
              x={TABLE.right - 8}
              y={TABLE.bottom - 10}
              textAnchor="end"
              fontSize={CHART_TYPE.readoutPx}
              fill={CHART_STRUCTURE.label}
            >
              {`reward ${reward(goal)}`}
            </text>
          </PlotStage>
        </FigureStage>
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
