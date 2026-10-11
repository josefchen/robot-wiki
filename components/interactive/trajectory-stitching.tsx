'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage, PresetGroup, type Preset } from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  DirectLabel,
  LineTrace,
  StageAnnotation,
  roleColour,
  type ChartPoint,
} from '@/components/motion/chart';
import { usePlayback } from '@/components/motion/use-eased-value';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * TrajectoryStitching: why offline reinforcement learning can beat copying
 * when the data holds pieces of a solution. Two recorded runs cross. Run 1
 * leaves the robot's start and stops short of the goal; run 2 reaches the
 * goal from another start. Copying the run that leaves the start repeats
 * run 1's miss. A value learner rates each place by what can follow it, so
 * at the crossing it switches to run 2's second half and reaches the goal.
 *
 * The one control is how the robot learns from the two runs. Choosing one
 * replays the robot's path as it draws in on the motion curve; reduced
 * motion and the served HTML show the finished path. The map is
 * illustrative; the conditions (rewards, suboptimal data, composable long
 * runs) are Kumar and colleagues', and COG is the real-robot case.
 */

type LearnerId = 'copy' | 'join';
const LEARNERS: readonly Preset<LearnerId>[] = [
  { id: 'copy', label: 'Copy one run' },
  { id: 'join', label: 'Join useful pieces' },
];
export const DEFAULT_LEARNER: LearnerId = 'join';

const WIDTH = 340;
const HEIGHT = 206;
const START: ChartPoint = [30, 150];
const OTHER_START: ChartPoint = [34, 40];
const CROSSING: ChartPoint = [168, 112];
const GOAL: ChartPoint = [304, 52];
const RUN_1_END: ChartPoint = [292, 176];

const f = (v: number) => Number(v.toFixed(2));

/** A quadratic curve from p0 to p1 bending toward c, as 24 points. */
function bend(p0: ChartPoint, c: ChartPoint, p1: ChartPoint): ChartPoint[] {
  return Array.from({ length: 25 }, (_, k) => {
    const t = k / 24;
    const u = 1 - t;
    return [f(u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0]), f(u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1])] as ChartPoint;
  });
}

const RUN_1_FIRST = bend(START, [96, 150], CROSSING);
const RUN_1_SECOND = bend(CROSSING, [232, 188], RUN_1_END);
const RUN_2_FIRST = bend(OTHER_START, [92, 104], CROSSING);
const RUN_2_SECOND = bend(CROSSING, [232, 44], GOAL);

export const PATHS: Record<LearnerId, readonly ChartPoint[]> = {
  copy: [...RUN_1_FIRST, ...RUN_1_SECOND.slice(1)],
  join: [...RUN_1_FIRST, ...RUN_2_SECOND.slice(1)],
};

export const reachesGoal = (learner: LearnerId) => {
  const end = PATHS[learner].at(-1)!;
  return end[0] === GOAL[0] && end[1] === GOAL[1];
};

/** The first `progress` (0 to 1) of a path by length, ending exactly at the cut. */
export function pathUpTo(points: readonly ChartPoint[], progress: number): ChartPoint[] {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let left = Math.max(0, Math.min(1, progress)) * lengths.reduce((a, b) => a + b, 0);
  const out: ChartPoint[] = [points[0]];
  for (let i = 0; i < lengths.length; i++) {
    if (left >= lengths[i]) {
      out.push(points[i + 1]);
      left -= lengths[i];
      continue;
    }
    const t = lengths[i] === 0 ? 0 : left / lengths[i];
    out.push([f(points[i][0] + (points[i + 1][0] - points[i][0]) * t), f(points[i][1] + (points[i + 1][1] - points[i][1]) * t)]);
    break;
  }
  return out;
}

const STATEMENT: Record<LearnerId, string> = {
  copy: 'Copying the only recorded run that leaves the robot\'s start repeats run 1 and stops short of the goal',
  join: 'Rating each place by what can follow it, the learner leaves run 1 at the crossing and follows run 2 to the goal',
};

function describe(learner: LearnerId): string {
  return `${STATEMENT[learner]}; the map holds 2 recorded runs, and neither goes from this start to the goal on its own.`;
}

function Flag({ at }: { at: ChartPoint }) {
  const [x, y] = at;
  return (
    <g data-scene-part="goal" fill="none" stroke={CHART_STRUCTURE.label} strokeWidth={CHART_STROKE.structure}>
      <line x1={x} y1={y} x2={x} y2={y - 22} />
      <path d={`M${x} ${y - 22} L${x + 13} ${y - 17} L${x} ${y - 12}`} fill={MOTION_STAGE.background} />
      <circle cx={x} cy={y} r={3} fill={MOTION_STAGE.background} />
    </g>
  );
}

function Spot({ at, part }: { at: ChartPoint; part: string }) {
  return (
    <circle
      data-scene-part={part}
      cx={at[0]}
      cy={at[1]}
      r={4}
      fill={MOTION_STAGE.background}
      stroke={CHART_STRUCTURE.label}
      strokeWidth={CHART_STROKE.structure}
    />
  );
}

export function TrajectoryStitching({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const conditions = citationFor('offline-rl-vs-bc-2022');
  const cog = citationFor('cog-2020');
  const [learner, setLearner] = useState<LearnerId>(DEFAULT_LEARNER);
  const [progress, play] = usePlayback();
  const accent = roleColour('highlight');
  const drawn = pathUpTo(PATHS[learner], progress);
  const head = drawn.at(-1)!;
  const success = reachesGoal(learner);
  const done = progress >= 1;

  const choose = (id: LearnerId) => {
    setLearner(id);
    play();
  };

  return (
    <InstrumentFigure
      figureId="trajectory-stitching"
      className={className}
      kicker="Trajectory stitching"
      heading="Offline RL joins two old runs into one success"
      controls={
        <PresetGroup label="The robot learns by" presets={LEARNERS} value={learner} onChange={choose} testId="stitching-learner" />
      }
      stage={
        <FigureStage footer={<StageStatus>Illustrative map</StageStatus>}>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`A map with two recorded runs that cross. ${success ? 'The robot follows run 1 to the crossing, then run 2 to the goal.' : 'The robot copies run 1 and stops short of the goal.'}`}
            aria-describedby={descriptionId}
            data-testid="stitching-stage"
          >
            <g data-series="recorded">
              <LineTrace points={RUN_1_FIRST} role="reference" />
              <LineTrace points={RUN_1_SECOND} role="reference" />
              <LineTrace points={RUN_2_FIRST} role="reference" />
              <LineTrace points={RUN_2_SECOND} role="reference" />
            </g>
            <Spot at={START} part="start" />
            <Spot at={OTHER_START} part="other-start" />
            <Spot at={RUN_1_END} part="run-1-end" />
            <Flag at={GOAL} />
            <DirectLabel x={START[0] - 4} y={START[1] + 20}>
              robot starts here
            </DirectLabel>
            <DirectLabel x={OTHER_START[0] + 10} y={OTHER_START[1] - 10}>
              run 2 started here
            </DirectLabel>
            <DirectLabel x={RUN_1_END[0] + 6} y={RUN_1_END[1] + 22} anchor="end">
              run 1 ended here
            </DirectLabel>
            <DirectLabel x={GOAL[0] + 13} y={GOAL[1] - 30} anchor="end">
              goal
            </DirectLabel>
            <g data-testid="stitching-path" data-learner={learner} data-chart-role="highlight">
              <path
                d={drawn.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')}
                fill="none"
                stroke={accent}
                strokeWidth={CHART_STROKE.trace + 0.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx={head[0]} cy={head[1]} r={CHART_STROKE.markerRadius + 1.5} fill={accent} />
            </g>
            {done ? (
              success ? (
                <StageAnnotation x={210} y={96} lines={['Reaches the goal by', 'joining two runs']} />
              ) : (
                <StageAnnotation x={330} y={118} anchor="end" lines={['Copies run 1 and', 'misses the goal']} />
              )
            ) : null}
          </PlotStage>
        </FigureStage>
      }
      caption="Neither recorded run reaches the goal from here; offline RL joins their useful halves, copying cannot."
      method={
        <>
          <div>
            The map holds two recorded runs. Run 1 leaves the robot&apos;s start and stops short of the goal; run 2
            reaches the goal from somewhere else. They cross once. Copying, as behavior cloning does, follows the run
            that leaves the start and repeats its miss. A value learner rates every place by the reward that can
            follow it, so the crossing inherits run 2&apos;s success and the robot switches runs there.
          </div>
          <div>
            Kumar and colleagues favor offline reinforcement learning over cloning for sparse rewards, suboptimal or
            noisy data, and long tasks whose runs can be joined. On a real robot, COG chained four skills under a
            reward of 1 for success and 0 otherwise, from prior data that never solved the new task. The map is
            illustrative.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Where each way of learning takes the robot"
            description={describe(learner)}
            rowHeader="the robot learns by"
            columns={[{ header: 'recorded runs used' }, { header: 'reaches the goal' }]}
            rows={LEARNERS.map((l) => ({
              label: l.label,
              values: [l.id === 'copy' ? 'run 1' : 'run 1, then run 2', reachesGoal(l.id) ? 'yes' : 'no'],
            }))}
          />
        </>
      }
      source={
        <span data-testid="stitching-source">
          {conditions ? (
            <a data-brand-control-id="control:link-focus" href={conditions.url} target="_blank" rel="noopener" className="underline-offset-2">
              {conditions.label}
            </a>
          ) : (
            'Kumar and colleagues'
          )}
          ;{' '}
          {cog ? (
            <a data-brand-control-id="control:link-focus" href={cog.url} target="_blank" rel="noopener" className="underline-offset-2">
              {cog.label}
            </a>
          ) : (
            'COG'
          )}
          .
        </span>
      }
    />
  );
}
