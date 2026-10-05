'use client';

import { AnimatedCircle, AnimatedGroup, AnimatedPath } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import {
  DEFAULT_ENVS,
  MAX_ENVS,
  MIN_ENVS,
  formatEnvs,
  wallClockSeconds,
} from '@/lib/parallel-sim';

/**
 * Batch scale: the same amount of practice, run by more virtual robots at
 * once. A square of dots grows with the robot count (one dot per 64 robots)
 * while a lime dot slides down the training-time curve; the dashed curve
 * adds the assumed per-robot work on the main computer and flattens.
 */
export const BATCH_SCALE_SCENE: SceneDefinition = {
  id: 'batch-scale',
  title: 'Parallel rollouts change a fixed training budget',
  kicker: 'Parallel simulation',
  headline: 'Running thousands of copies at once speeds training, with limits',
  beats: [
    { id: 'one-batch', caption: 'With 64 virtual robots practising at once, the same amount of practice takes hours.' },
    { id: 'scale', duration: 'long', linear: true, caption: 'With 4,096 robots side by side on one graphics chip, the same practice finishes in minutes.' },
    { id: 'cpu', caption: 'Some work for each robot still runs on the main computer, so with that overhead the dashed line flattens.' },
    { id: 'recap', caption: 'Robots need huge amounts of practice; a graphics chip running 16,384 virtual robots side by side finishes it in minutes.' },
  ],
};

const SPANS = beatSpans(BATCH_SCALE_SCENE.beats);
const eased = (t: number, index: number) =>
  smooth(clamp01((t - SPANS[index].start) / SPANS[index].duration));
const linear = (t: number, index: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);

/** The two curves come directly from the same fixed-transition lab. */
export function batchScaleFrame(t: number) {
  const environments = t < SPANS[1].start
    ? MIN_ENVS
    : t < SPANS[3].start
      ? Math.round(2 ** (Math.log2(MIN_ENVS) +
          (Math.log2(DEFAULT_ENVS) - Math.log2(MIN_ENVS)) * linear(t, 1)))
      : Math.round(2 ** (Math.log2(DEFAULT_ENVS) +
          (Math.log2(MAX_ENVS) - Math.log2(DEFAULT_ENVS)) * eased(t, 3)));
  return {
    environments,
    wallSeconds: wallClockSeconds(environments, false),
    cpuSeconds: wallClockSeconds(environments, true),
    cpuVisible: eased(t, 2),
    recap: eased(t, 3),
  };
}

/** Training time in words: seconds, minutes or hours, to one decimal above a minute. */
export function trainingTimeWords(seconds: number): string {
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)} hours`;
  if (seconds >= 60) return `${(seconds / 60).toFixed(1)} minutes`;
  return `${Math.round(seconds)} seconds`;
}

const r = (v: number) => Number(v.toFixed(2));
const LEFT = 62;
const RIGHT = 234;
const TOP = 36;
const BOTTOM = 160;
/** The time axis runs on a log scale from one minute to four hours. */
const MIN_MINUTES = 1;
const MAX_MINUTES = 240;
const x = (envs: number) => r(LEFT + (Math.log2(envs / MIN_ENVS) / Math.log2(MAX_ENVS / MIN_ENVS)) * (RIGHT - LEFT));
const y = (seconds: number) => r(BOTTOM - Math.log10(seconds / 60 / MIN_MINUTES) /
  Math.log10(MAX_MINUTES / MIN_MINUTES) * (BOTTOM - TOP));
const TIME_TICKS = [
  { minutes: 2, label: '2 min' },
  { minutes: 10, label: '10 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 240, label: '4 hours' },
];
const ENV_TICKS = [MIN_ENVS, 1024, MAX_ENVS];

/**
 * A curve as short separate segments, each its own path, so the note can sit
 * in the empty corner under the curves without touching any segment's box.
 * Each segment carries its distance along the curve so a dash pattern runs on
 * unbroken across the joins.
 */
const SEGMENTS = 32;
function segments(cpuBound: boolean): { d: string; offset: number }[] {
  const at = (i: number) => {
    const envs = MIN_ENVS * (MAX_ENVS / MIN_ENVS) ** (i / SEGMENTS);
    return [x(envs), y(wallClockSeconds(envs, cpuBound))] as const;
  };
  let travelled = 0;
  return Array.from({ length: SEGMENTS }, (_, i) => {
    const [x0, y0] = at(i);
    const [x1, y1] = at(i + 1);
    const segment = { d: `M${x0} ${y0} L${x1} ${y1}`, offset: r(-travelled) };
    travelled += Math.hypot(x1 - x0, y1 - y0);
    return segment;
  });
}
const gpuSegments = segments(false);
const cpuSegments = segments(true);

/** One dot per 64 robots, filled in growing squares: 1 dot, then 8 by 8, then 16 by 16. */
const DOT_PITCH = 4;
const DOT_SIZE = 3;
const GRID_X = 266;
const GRID_Y = 34;
const ROBOTS_PER_DOT = 64;
const DOT_ORDER = Array.from({ length: (MAX_ENVS / ROBOTS_PER_DOT) }, (_, i) => [Math.floor(i / 16), i % 16] as const)
  .sort((a, b) => Math.max(...a) - Math.max(...b) || a[0] - b[0] || a[1] - b[1]);
function dotGrid(envs: number): string {
  const count = Math.max(1, Math.round(envs / ROBOTS_PER_DOT));
  return DOT_ORDER.slice(0, count)
    .map(([row, col]) => `M${GRID_X + col * DOT_PITCH} ${GRID_Y + row * DOT_PITCH}h${DOT_SIZE}v${DOT_SIZE}h-${DOT_SIZE}z`)
    .join('');
}

const INK = 'var(--motion-stage-label)';
const DIM = 'var(--motion-stage-label-secondary)';
const finalSeconds = wallClockSeconds(MAX_ENVS, false);

function BatchScaleStage() {
  const gpuEnd = y(finalSeconds);
  return (
    <StageSvg viewBox="0 0 340 240">
      <text data-scene-stage-label="time-axis" data-scene-axis x={8} y={20} fontSize={14} fill={INK}>training time</text>
      <text x={332} y={24} textAnchor="end" fontSize={14} fill={DIM}>each dot: 64 robots</text>

      <g data-scene-structure="axes" stroke="var(--motion-stage-axes)">
        {TIME_TICKS.map((tick) => (
          <line key={tick.minutes} x1={LEFT - 4} x2={LEFT} y1={y(tick.minutes * 60)} y2={y(tick.minutes * 60)} />
        ))}
        {ENV_TICKS.map((envs) => <line key={envs} x1={x(envs)} x2={x(envs)} y1={BOTTOM} y2={BOTTOM + 4} />)}
        <line x1={LEFT} y1={TOP} x2={LEFT} y2={BOTTOM} />
        <line x1={LEFT} y1={BOTTOM} x2={RIGHT} y2={BOTTOM} />
      </g>
      {TIME_TICKS.map((tick) => (
        <text key={tick.minutes} data-scene-stage-label="axis-tick" data-scene-tick x={LEFT - 6} y={r(y(tick.minutes * 60) + 5)}
          textAnchor="end" fontSize={14} fill={DIM}>{tick.label}</text>
      ))}
      {ENV_TICKS.map((envs) => (
        <text key={envs} data-scene-stage-label="axis-tick" data-scene-tick x={envs === MAX_ENVS ? x(envs) + 8 : x(envs)} y={184}
          textAnchor={envs === MIN_ENVS ? 'start' : envs === MAX_ENVS ? 'end' : 'middle'} fontSize={14} fill={DIM}>{formatEnvs(envs)}</text>
      ))}
      <text data-scene-stage-label="axis-caption" data-scene-axis x={(LEFT + RIGHT) / 2} y={206} textAnchor="middle" fontSize={14} fill={INK}>
        virtual robots practising at once
      </text>

      <g data-scene-mark="fixed-budget-time" fill="none" stroke="var(--role-value-stage)" strokeWidth={2.4} strokeLinecap="round">
        {gpuSegments.map(({ d }) => <path key={d} d={d} />)}
      </g>
      <AnimatedGroup data-scene-mark="cpu-cost-time" fill="none" stroke="var(--role-constraint-stage)" strokeWidth={2}
        strokeDasharray="6 4" bindings={{ opacity: (t) => batchScaleFrame(t).cpuVisible }}>
        {cpuSegments.map(({ d, offset }) => <path key={d} d={d} strokeDashoffset={offset} />)}
      </AnimatedGroup>
      <AnimatedGroup bindings={{ opacity: (t) => batchScaleFrame(t).cpuVisible }}>
        <text data-scene-stage-label="cpu-label" x={RIGHT + 6} y={116} fontSize={14} fill={INK}>with computer</text>
        <text data-scene-stage-label="cpu-label" x={RIGHT + 6} y={138} fontSize={14} fill={INK}>overhead</text>
      </AnimatedGroup>
      <text data-scene-stage-label="gpu-label" x={RIGHT + 6} y={160} fontSize={14} fill={INK}>no overhead</text>

      <AnimatedPath data-robot-dots="" fill={DIM}
        bindings={{ d: (t) => dotGrid(batchScaleFrame(t).environments) }} />

      <AnimatedCircle data-scene-mark="selected-environment-count" r={5}
        fill="var(--role-highlight-stage)" stroke="var(--motion-stage)" strokeWidth={1.5}
        bindings={{
          cx: (t) => x(batchScaleFrame(t).environments),
          cy: (t) => y(batchScaleFrame(t).wallSeconds),
          opacity: (t) => eased(t, 0),
        }} />

      {/* The settle note sits in the empty corner under the curves, led to the lime dot. */}
      <AnimatedGroup data-figure-annotation="" bindings={{ opacity: (t) => batchScaleFrame(t).recap }}>
        <text data-scene-stage-label="annotation" x={68} y={136} fontSize={14} fontWeight={600} fill={INK}>
          16,384 at once:
        </text>
        <text data-scene-stage-label="annotation" x={68} y={158} fontSize={14} fontWeight={600} fill={INK}>
          about {trainingTimeWords(finalSeconds)}
        </text>
        <g data-scene-structure="annotation-leader">
          <line x1={200} y1={r(gpuEnd)} x2={r(RIGHT - 7)} y2={r(gpuEnd)} stroke={INK} strokeWidth={1} />
        </g>
      </AnimatedGroup>
    </StageSvg>
  );
}

export function BatchScale({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={BATCH_SCALE_SCENE}
      stage={<BatchScaleStage />}
      className={className}
      legend={<>
        <LegendItem series="batch-time" swatch={<span aria-hidden className="inline-block h-0.5 w-4" style={{ backgroundColor: 'var(--role-value-graphic)' }} />}>training time</LegendItem>
        <LegendItem series="batch-cpu" swatch={<span aria-hidden className="inline-block h-0.5 w-4 border-t border-dashed" style={{ borderColor: 'var(--role-constraint-graphic)' }} />}>with computer overhead</LegendItem>
        <LegendItem series="batch-selected" swatch={<span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--role-highlight-graphic)' }} />}>robots shown</LegendItem>
      </>}
      readout={({ beatIndex }) => {
        const frame = batchScaleFrame(SPANS[beatIndex].end);
        return <>{formatEnvs(frame.environments)} robots at once:{' '}
          <span className="text-text">{trainingTimeWords(frame.wallSeconds)}</span> of training</>;
      }}
      statusLine="An illustrative calculation, not a measured training curve"
      method={<>
        <p>
          Both curves hold the amount of practice fixed: the same total number of simulated steps, a fixed-transition
          budget, however many robots share it. Each training round runs every robot for a short burst, then updates
          the network once, so more robots means fewer rounds. Each round also carries fixed costs: the learning update,
          moving data between the graphics chip and the main computer, and the Python loop. The dashed curve adds an
          assumed cost on the main computer for every robot, which grows with the robot count and flattens the curve.
        </p>
        <p>
          These are illustrative calculations, not measured training curves: the robot counts, times and the
          main-computer cost are authored for this lab. The reported Rudin time bounds, their separate protocols and
          the CPU benchmark that motivates the dashed curve are in the article text. The time axis is logarithmic,
          from one minute to four hours.
        </p>
        <p>
          The lab&apos;s times along the solid curve: {formatEnvs(MIN_ENVS)} robots, {trainingTimeWords(wallClockSeconds(MIN_ENVS, false))};{' '}
          {formatEnvs(DEFAULT_ENVS)} robots, {trainingTimeWords(wallClockSeconds(DEFAULT_ENVS, false))};{' '}
          {formatEnvs(MAX_ENVS)} robots, {trainingTimeWords(wallClockSeconds(MAX_ENVS, false))}. Along the dashed
          curve: {trainingTimeWords(wallClockSeconds(MIN_ENVS, true))}, {trainingTimeWords(wallClockSeconds(DEFAULT_ENVS, true))}{' '}
          and {trainingTimeWords(wallClockSeconds(MAX_ENVS, true))}.
        </p>
        <ol className="list-decimal pl-5">
          {BATCH_SCALE_SCENE.beats.map((beat) => <li key={beat.id}>{beat.caption}</li>)}
        </ol>
      </>}
      textAlternative={`${BATCH_SCALE_SCENE.title}. ${BATCH_SCALE_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')}`}
    />
  );
}

export default BatchScale;
