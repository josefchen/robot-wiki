'use client';

import { useSyncExternalStore } from 'react';
import { AnimatedCircle, AnimatedPath } from '@/components/motion/animated';
import { useSceneTime, useStaticTime } from '@/components/motion/scene-context';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { clamp01, smooth } from '@/components/motion/easing';
import { LegendItem } from '@/components/ui/instrument';
import { RRT_SCENE, buildRrt, edgesUpTo, pathIfReached } from '@/lib/rrt';

const RESULT = buildRrt(RRT_SCENE);
const GOAL_ITERATION = RESULT.goalNodeId ?? RESULT.nodes.length - 1;
const EARLY = Math.max(1, Math.floor(GOAL_ITERATION / 5));
const x = (world: number) => Number((30 + world * 2.8).toFixed(2));
const y = (world: number) => Number((35 + world * 2.55).toFixed(2));

export const RRT_GROWTH_SCENE: SceneDefinition = {
  id: 'rrt-growth',
  title: 'A seeded tree finds a path around obstacles',
  beats: [
    { id: 'world', caption: 'A fixed-seed authored planning world places a start, a goal and obstacles in the same 2D space as the lab.' },
    { id: 'explore', duration: 'long', linear: true, caption: 'Accepted extensions grow outward from the start; the same seeded tree is revealed in linear model time.' },
    { id: 'connect', duration: 'long', linear: true, caption: `The growing tree works around the partial wall; its goal connection occurs only at accepted extension ${GOAL_ITERATION}.` },
    { id: 'path', caption: 'Only after a goal connection exists does the selected start-to-goal route appear along tree edges.' },
  ],
};

const SPANS = beatSpans(RRT_GROWTH_SCENE.beats);
const progress = (t: number, beat: number) =>
  clamp01((t - SPANS[beat].start) / SPANS[beat].duration);

/** Accepted iterations, not rejected samples or a manufactured traversal. */
export function rrtGrowthFrame(t: number) {
  const iteration = t < SPANS[2].start
    ? Math.round(EARLY * progress(t, 1))
    : Math.round(EARLY + (GOAL_ITERATION - EARLY) * progress(t, 2));
  return {
    iteration,
    edges: edgesUpTo(RESULT, iteration),
    goalReached: RESULT.goalNodeId !== null && iteration >= RESULT.goalNodeId,
    path: progress(t, 3) > 0 ? pathIfReached(RESULT, iteration) : [],
    routeOpacity: smooth(progress(t, 3)),
  };
}

function RrtConnectionReadout() {
  const time = useSceneTime();
  const poster = useStaticTime();
  // Only the reached/not-reached boundary changes the React snapshot.
  // The path and accepted tree still follow the same scene clock in SVG.
  const reached = useSyncExternalStore(
    (notify) => time ? time.on('change', notify) : () => {},
    () => rrtGrowthFrame(time?.get() ?? poster).goalReached,
    () => rrtGrowthFrame(poster).goalReached,
  );
  return <><span className="text-text-dim">authored world</span> {RRT_SCENE.width} × {RRT_SCENE.height} {reached ? <><span className="text-text-dim">goal connection</span> {GOAL_ITERATION} accepted extensions</> : null}</>;
}

const treePath = (t: number) => rrtGrowthFrame(t).edges.map(({ from, to }) =>
  `M${x(from.x)} ${y(from.y)}L${x(to.x)} ${y(to.y)}`).join('');
const routePath = (t: number) => rrtGrowthFrame(t).path.map((point, i) =>
  `${i === 0 ? 'M' : 'L'}${x(point.x)} ${y(point.y)}`).join('');

function RrtGrowthStage() {
  return (
    <StageSvg viewBox="0 0 340 240">
      <defs>
        <pattern id="rrt-constraint-hatch" width="6" height="6" patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)">
          <line data-scene-structure="hatch" x1="0" y1="0" x2="0" y2="6"
            stroke="var(--role-constraint-stage)" strokeWidth="2" opacity="0.65" />
        </pattern>
      </defs>
      <text x={30} y={24} fontSize={13} fill="var(--motion-stage-label)">accepted extensions</text>
      <text x={30} y={222} fontSize={13} fill="var(--motion-stage-label-secondary)">start △</text>
      <text x={244} y={222} fontSize={13} fill="var(--motion-stage-label-secondary)">goal ○</text>
      <g data-scene-structure="planning-world">
        <rect x={30} y={35} width={280} height={163.2}
          fill="none" stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
      </g>
      {RRT_SCENE.obstacles.map((obstacle, index) => obstacle.kind === 'circle'
        ? <circle key={index} data-scene-mark={`obstacle-${index}`}
            cx={x(obstacle.x)} cy={y(obstacle.y)} r={obstacle.r * 2.55}
            fill="url(#rrt-constraint-hatch)" stroke="var(--role-constraint-stage)" strokeWidth={1.3} />
        : <rect key={index} data-scene-mark={`obstacle-${index}`}
            x={x(obstacle.x)} y={y(obstacle.y)}
            width={obstacle.w * 2.8} height={obstacle.h * 2.55}
            fill="url(#rrt-constraint-hatch)" stroke="var(--role-constraint-stage)" strokeWidth={1.3} />)}
      <AnimatedPath data-scene-mark="accepted-tree" fill="none"
        stroke="var(--role-state-stage)" strokeWidth={1}
        bindings={{ d: treePath }} />
      <AnimatedPath data-scene-mark="selected-route" fill="none"
        stroke="var(--role-highlight-stage)" strokeWidth={2.5}
        bindings={{ d: routePath, opacity: (t) => rrtGrowthFrame(t).routeOpacity }} />
      <path data-scene-mark="start" d={`M${x(RRT_SCENE.start.x)} ${y(RRT_SCENE.start.y) - 6}l6 11h-12Z`}
        fill="var(--role-state-stage)" />
      <AnimatedCircle data-scene-mark="goal-region"
        cx={x(RRT_SCENE.goal.x)} cy={y(RRT_SCENE.goal.y)}
        r={RRT_SCENE.goalRadius * 2.55} fill="none"
        stroke="var(--role-reference-stage)" strokeWidth={1.5} strokeDasharray="4 3" />
    </StageSvg>
  );
}

export function RrtGrowth({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={RRT_GROWTH_SCENE}
      stage={<RrtGrowthStage />}
      className={className}
      legend={<>
        <LegendItem series="rrt-tree" swatch={<span aria-hidden className="inline-block h-0.5 w-4" style={{ backgroundColor: 'var(--role-state-graphic)' }} />}>accepted tree</LegendItem>
        <LegendItem series="rrt-obstacle" swatch={<span aria-hidden className="inline-block h-2.5 w-3 border" style={{ borderColor: 'var(--role-constraint-graphic)' }} />}>obstacle</LegendItem>
        <LegendItem series="rrt-route" swatch={<span aria-hidden className="inline-block h-0.5 w-4" style={{ backgroundColor: 'var(--role-highlight-graphic)' }} />}>selected route</LegendItem>
      </>}
      readout={() => <RrtConnectionReadout />}
      statusLine="Authored fixed-seed planning scene, not a published benchmark. The route is one feasible result, not an optimality or success-rate claim. The lab below retains the exact controls and sampling settings."
      textAlternative={`${RRT_GROWTH_SCENE.title}. ${RRT_GROWTH_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')}`}
    />
  );
}

export default RrtGrowth;
