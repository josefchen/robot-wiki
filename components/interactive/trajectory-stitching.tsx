'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PresetGroup, type Preset } from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { LiveSolid, writeSolid } from '@/components/iso/live-solid';
import {
  CAR_END_GAP,
  GOAL,
  HEIGHT,
  PARTS,
  ROUTES,
  TOE_X,
  WIDTH,
  bladesAt,
  carAt,
  leverAt,
  rodAt,
  signalAt,
  trailTo,
  type CarPaths,
  type Group,
  type LiveId,
  type Part,
} from '@/components/iso/figures/junction-layout';

/**
 * TrajectoryStitching: why offline reinforcement learning can beat copying
 * when the data holds pieces of a solution, drawn as a junction on a model
 * railway layout.
 *
 * Each recorded run is a track. Run 1 leaves the robot's platform and ends
 * at a buffer stop short of the goal; run 2 reaches the goal from another
 * start. The two runs meet once, on a shared stretch between two turnouts.
 * The car is the robot and the one lit part. Copying, as behavior cloning
 * does, leaves the points set for run 1, so the car repeats run 1's miss. A
 * value learner rates each place by what can follow it, so the shared
 * stretch inherits run 2's success: the lever throws the points, the
 * junction signal clears run 2, and the car follows run 2 to the goal.
 *
 * The one control is how the robot learns from the two runs. Choosing one
 * throws the lever and runs the car again from the platform; reduced
 * motion and the served HTML show the finished run. The layout is
 * illustrative; the conditions (rewards, suboptimal data, composable long
 * runs) are Kumar and colleagues', and COG is the real-robot case.
 */

type LearnerId = 'copy' | 'join';
const LEARNERS: readonly Preset<LearnerId>[] = [
  { id: 'copy', label: 'Copy one run' },
  { id: 'join', label: 'Join useful pieces' },
];
export const DEFAULT_LEARNER: LearnerId = 'join';

export type ChartPoint = [number, number];

/** The car's route under each way of learning, on the board, from the robot's platform to where it stops. */
export const PATHS: Record<LearnerId, readonly ChartPoint[]> = ROUTES;

export const reachesGoal = (learner: LearnerId) => {
  const end = PATHS[learner].at(-1)!;
  return end[0] === GOAL[0] && end[1] === GOAL[1];
};

const f = (v: number) => Number(v.toFixed(2));

/** The first `progress` (0 to 1) of a path by length, ending exactly at the cut. */
export function pathUpTo(points: readonly ChartPoint[], progress: number): ChartPoint[] {
  if (progress >= 1) return [...points];
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

const lengthOf = (points: readonly ChartPoint[]) => points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]), 0);

/** The point `along` route units from a route's start (clamped to the route). */
function pointAt(points: readonly ChartPoint[], along: number): ChartPoint {
  return pathUpTo(points, along / lengthOf(points)).at(-1)!;
}

/**
 * The car on a route at `progress` (0 at the robot's platform, 1 stopped at the far end): where its
 * centre is, which way it heads (the chord over the car's wheelbase) and how far it has come.
 */
export function carOn(learner: LearnerId, progress: number) {
  const route = PATHS[learner];
  const travel = lengthOf(route) - 2 * CAR_END_GAP;
  const along = CAR_END_GAP + travel * Math.max(0, Math.min(1, progress));
  const centre = pointAt(route, along);
  const behind = pointAt(route, along - 8.5);
  const ahead = pointAt(route, along + 8.5);
  const length = Math.hypot(ahead[0] - behind[0], ahead[1] - behind[1]) || 1;
  return { centre, heading: [(ahead[0] - behind[0]) / length, (ahead[1] - behind[1]) / length] as ChartPoint, along };
}

/** Where the car is, in words: before the shared stretch it is on run 1, after it on the run it took. */
export function stretchOf(learner: LearnerId, x: number): string {
  if (x < -TOE_X) return 'on run 1';
  if (x <= TOE_X) return 'where the runs meet';
  return learner === 'join' ? 'on run 2' : 'on run 1';
}

/** The resting readout: the way of learning and where the car ends up. */
export const stillReadout = (learner: LearnerId) =>
  `${learner === 'join' ? 'Join useful pieces' : 'Copy one run'} · ${reachesGoal(learner) ? 'reaches the goal' : 'stops short of the goal'}`;

/** The running readout, from the same instant as the drawing. */
export const runReadout = (learner: LearnerId, progress: number) =>
  `${stretchOf(learner, carOn(learner, progress).centre[0])} · ${Math.round(Math.max(0, Math.min(1, progress)) * 100)}% of the way`;

const STATEMENT: Record<LearnerId, string> = {
  copy: 'Copying the only recorded run that leaves the robot\'s start repeats run 1 and stops short of the goal',
  join: 'Rating each place by what can follow it, the learner leaves run 1 at the crossing and follows run 2 to the goal',
};

function describe(learner: LearnerId): string {
  return `${STATEMENT[learner]}; the map holds 2 recorded runs, and neither goes from this start to the goal on its own.`;
}

/** The points' throw for each way of learning: set for run 1 (0) or thrown for run 2 (1). */
export const throwOf = (learner: LearnerId) => (learner === 'join' ? 1 : 0);
/** Seconds for the car's whole run, and for the lever before it. */
const RUN_SECONDS = 4.6;
const LEVER_SECONDS = 0.7;

/** The finished run for a way of learning: what the server and the first client render draw. */
function restOf(learner: LearnerId) {
  const car = carOn(learner, 1);
  const thrown = throwOf(learner);
  return {
    thrown,
    car: carAt(car.centre, car.heading),
    trail: trailTo(PATHS[learner], car.along),
    blades: bladesAt(thrown),
    signal: signalAt(thrown),
    lever: leverAt(thrown),
    rod: rodAt(thrown),
    readout: stillReadout(learner),
  };
}

function PartView({ part }: { part: Part }) {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        crease={part.crease}
        inner={part.inner ? <Line d={part.inner} tone={part.innerTone ?? 'faint'} /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.kind === 'fill') return <path className="iso-shade" data-shade={part.shade} d={part.d} />;
  return null;
}

/** Consecutive parts of one group, so the moving point rod is one translated <g>. */
const RUNS: Array<{ group: Group; parts: Part[] }> = [];
for (const part of PARTS) {
  const last = RUNS[RUNS.length - 1];
  if (last && last.group === part.group) last.parts.push(part);
  else RUNS.push({ group: part.group, parts: [part] });
}

/** The route so far: a line a little heavier than the drawing's own, in the accent. */
const TRAIL_STYLE = { strokeWidth: 1.3 } as const;

type CarRefs = { wheels: (SVGGElement | null)[]; rear: (SVGGElement | null)[]; frame: SVGGElement | null; body: SVGGElement | null; windows: SVGPathElement | null; roof: SVGGElement | null; lamp: SVGGElement | null; front: (SVGGElement | null)[] };
type Refs = {
  trail: SVGPathElement | null;
  blades: (SVGGElement | null)[];
  signal: (SVGGElement | null)[];
  lever: { bar: SVGGElement | null; catch: SVGGElement | null; grip: SVGGElement | null };
  rod: SVGGElement | null;
  car: CarRefs;
};

function writeCar(refs: CarRefs, car: CarPaths) {
  car.wheels.forEach((paths, index) => writeSolid(refs.wheels[index] ?? null, paths));
  car.rearBuffers.forEach((paths, index) => writeSolid(refs.rear[index] ?? null, paths));
  writeSolid(refs.frame, car.frame);
  writeSolid(refs.body, car.body);
  refs.windows?.setAttribute('d', car.windows);
  writeSolid(refs.roof, car.roof);
  writeSolid(refs.lamp, car.lamp);
  car.frontBuffers.forEach((paths, index) => writeSolid(refs.front[index] ?? null, paths));
}

/** Draw the junction with the points at `thrown` (0 to 1) and the car at `progress` on `learner`'s route. */
function drawLayout(refs: Refs, learner: LearnerId, thrown: number, progress: number) {
  bladesAt(thrown).forEach((paths, index) => writeSolid(refs.blades[index] ?? null, paths));
  signalAt(thrown).forEach((paths, index) => writeSolid(refs.signal[index] ?? null, paths));
  const lever = leverAt(thrown);
  writeSolid(refs.lever.bar, lever.bar);
  writeSolid(refs.lever.catch, lever.catch);
  writeSolid(refs.lever.grip, lever.grip);
  refs.rod?.setAttribute('transform', rodAt(thrown));
  const car = carOn(learner, progress);
  refs.trail?.setAttribute('d', trailTo(PATHS[learner], car.along));
  writeCar(refs.car, carAt(car.centre, car.heading));
}

export function TrajectoryStitching({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const conditions = citationFor('offline-rl-vs-bc-2022');
  const cog = citationFor('cog-2020');
  const [learner, setLearner] = useState<LearnerId>(DEFAULT_LEARNER);
  // The opening pose, fixed for the life of the figure: the live loop moves the parts from here.
  const [rest] = useState(() => restOf(learner));
  const [runs, setRuns] = useState(0);
  const success = reachesGoal(learner);

  const refs = useRef<Refs>({
    trail: null,
    blades: [],
    signal: [],
    lever: { bar: null, catch: null, grip: null },
    rod: null,
    car: { wheels: [], rear: [], frame: null, body: null, windows: null, roof: null, lamp: null, front: [] },
  });
  const stageRef = useRef<HTMLDivElement>(null);
  const shown = useRef({ thrown: rest.thrown });

  const readoutEl = useCallback(() => stageRef.current?.closest('[data-anatomy-stage]')?.querySelector<HTMLElement>('[data-readout]') ?? null, []);

  // Each choice runs the car again: the lever eases over to the chosen setting, then the car leaves the
  // platform and rolls the route to its end. Reduced motion draws the finished run at once.
  useEffect(() => {
    if (runs === 0) return;
    const calm = asksForStillness();
    const goal = throwOf(learner);
    const readout = readoutEl();
    let frame = 0;
    let last = performance.now();
    let clock = 0;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      clock += dt;
      const s = shown.current;
      s.thrown = calm || Math.abs(goal - s.thrown) < 0.002 ? goal : s.thrown + (goal - s.thrown) * (1 - Math.exp(-dt / 0.14));
      const t = calm ? 1 : Math.max(0, Math.min(1, (clock - LEVER_SECONDS) / RUN_SECONDS));
      const progress = 0.5 - 0.5 * Math.cos(Math.PI * t);
      drawLayout(refs.current, learner, s.thrown, progress);
      const done = t >= 1 && s.thrown === goal;
      if (readout) readout.textContent = done ? stillReadout(learner) : runReadout(learner, progress);
      frame = done ? 0 : requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [runs, learner, readoutEl]);

  const choose = (id: LearnerId) => {
    setLearner(id);
    setRuns((count) => count + 1);
  };

  const r = refs.current;
  const liveView = (id: LiveId) => {
    if (id === 'trail') {
      return (
        <path
          key={id}
          ref={(el) => void (r.trail = el)}
          className="iso-line"
          data-tone="lit"
          style={TRAIL_STYLE}
          d={rest.trail}
        />
      );
    }
    if (id === 'blades') {
      return (
        <g key={id} data-part="switch-blades">
          {rest.blades.map((paths, index) => (
            <LiveSolid key={index} ref={(el) => void (r.blades[index] = el)} paths={paths} tone="mid" />
          ))}
        </g>
      );
    }
    if (id === 'signal') {
      return (
        <g key={id} data-part="signal-arms">
          {rest.signal.map((paths, index) => (
            <LiveSolid key={index} ref={(el) => void (r.signal[index] = el)} paths={paths} tone="hi" />
          ))}
        </g>
      );
    }
    if (id === 'lever') {
      return (
        <g key={id} data-part="lever">
          <LiveSolid ref={(el) => void (r.lever.bar = el)} paths={rest.lever.bar} tone="mid" />
          <LiveSolid ref={(el) => void (r.lever.catch = el)} paths={rest.lever.catch} tone="mid" />
          <LiveSolid ref={(el) => void (r.lever.grip = el)} paths={rest.lever.grip} tone="hi" />
        </g>
      );
    }
    return (
      <g key={id} data-part="car">
        {rest.car.wheels.map((paths, index) => (
          <LiveSolid key={`wheel-${index}`} ref={(el) => void (r.car.wheels[index] = el)} paths={paths} tone="mid" />
        ))}
        {rest.car.rearBuffers.map((paths, index) => (
          <LiveSolid key={`rear-${index}`} ref={(el) => void (r.car.rear[index] = el)} paths={paths} tone="mid" />
        ))}
        <LiveSolid ref={(el) => void (r.car.frame = el)} paths={rest.car.frame} tone="mid" />
        <LiveSolid ref={(el) => void (r.car.body = el)} paths={rest.car.body} lit />
        <path ref={(el) => void (r.car.windows = el)} className="iso-line" data-tone="lo" d={rest.car.windows} />
        <LiveSolid ref={(el) => void (r.car.roof = el)} paths={rest.car.roof} lit />
        <LiveSolid ref={(el) => void (r.car.lamp = el)} paths={rest.car.lamp} tone="mid" />
        {rest.car.frontBuffers.map((paths, index) => (
          <LiveSolid key={`front-${index}`} ref={(el) => void (r.car.front[index] = el)} paths={paths} tone="mid" />
        ))}
      </g>
    );
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
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Lit car: the robot, with its route so far"
          readout={rest.readout}
          status="Illustrative layout; conditions cited"
          data-testid="stitching-stage"
          data-outcome={success ? 'reaches' : 'short'}
        >
          <div ref={stageRef}>
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              label={`A model railway, a map with two recorded runs that meet once on a shared stretch of track. ${success ? 'The robot\'s car follows run 1 to the shared stretch, the points send it onto run 2, and it reaches the goal.' : 'The robot\'s car copies run 1 and stops short of the goal.'}`}
              describedBy={descriptionId}
            >
              <g data-testid="stitching-path" data-learner={learner}>
                {RUNS.map((run, index) => {
                  const body = run.parts.map((part, k) => (part.kind === 'live' ? liveView(part.id) : <PartView key={k} part={part} />));
                  if (run.group === 'static') return <g key={index}>{body}</g>;
                  return (
                    <g key={index} ref={(el) => void (r.rod = el)} transform={rest.rod} data-part="point-rod">
                      {body}
                    </g>
                  );
                })}
              </g>
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="Neither recorded run reaches the goal from here; offline RL joins their useful halves, copying cannot."
      method={
        <>
          <div>
            The layout holds two recorded runs as two tracks. Run 1 leaves the robot&apos;s start and stops short of
            the goal; run 2 reaches the goal from somewhere else. They meet once, on a shared stretch. Copying, as
            behavior cloning does, follows the run that leaves the start and repeats its miss. A value learner rates
            every place by the reward that can follow it, so the shared stretch inherits run 2&apos;s success and the
            points send the robot onto run 2 there.
          </div>
          <div>
            Kumar and colleagues favor offline reinforcement learning over cloning for sparse rewards, suboptimal or
            noisy data, and long tasks whose runs can be joined. On a real robot, COG chained four skills under a
            reward of 1 for success and 0 otherwise, from prior data that never solved the new task. The layout is
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
