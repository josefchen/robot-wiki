'use client';

import { useId, useMemo, useState } from 'react';
import { compoundingCurve, compoundedSuccessRate } from '@/lib/reliability';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PlotStage,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageReadout, StageStatus } from '@/components/motion/figure-frame';
import {
  ChartAxes,
  DirectLabel,
  StageAnnotation,
  roleColour,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
} from '@/components/motion/chart';
import { MOTION_STAGE_TYPE } from '@/lib/motion-tokens';

/**
 * ReliabilityCompounding: the compounding cost of per-step error.
 *
 * A job of n steps finishes only if every step goes right, so its chance is
 * p^n. The stage draws that chance against the number of steps, rings the
 * current job, and under the curve fills 100 job tiles with the ones that
 * would finish. The main view offers three per-step presets and the job
 * length; the full per-step slider and Reset sit in "Adjust more". The
 * evaluation-crisis and reliability-gap modules mount it with different
 * defaults, and the headline and caption follow the mount.
 */
type ReliabilityCompoundingPreset = {
  /** Per-step success probability in [0, 1]. */
  perStep: number;
  /** Episode length in steps. */
  steps: number;
};

/**
 * Named preset sets. `per-step-thresholds` is the reliability-gap bar: 95%,
 * 99% and 99.9% per step over one fixed 30-step episode, so pressing a
 * preset also sets the job to 30 steps.
 */
const PRESET_SETS = {
  'per-step-thresholds': [
    { perStep: 0.95, steps: 30 },
    { perStep: 0.99, steps: 30 },
    { perStep: 0.999, steps: 30 },
  ],
} as const satisfies Record<string, ReadonlyArray<ReliabilityCompoundingPreset>>;

/** The per-step presets every mount shows, in plain words. */
const PER_STEP_PRESETS = [
  { id: '95', percent: 95, label: '95 in 100' },
  { id: '99', percent: 99, label: '99 in 100' },
  { id: '99.9', percent: 99.9, label: '999 in 1,000' },
] as const;
type PerStepPresetId = (typeof PER_STEP_PRESETS)[number]['id'];

type Variant = 'home' | 'evaluation' | 'reliability' | 'prediction';

type ReliabilityCompoundingProps = {
  /** Initial per-step success probability in [0, 1]. Default 0.95. */
  defaultPerStep?: number;
  /** Initial episode length in steps. Default 30. */
  defaultSteps?: number;
  /** Longest episode the chart draws. Default 100. */
  maxSteps?: number;
  /**
   * Lowest selectable per-step success, in percent. Default 50; the
   * evaluation-crisis module passes 0 so the 0% boundary is reachable.
   */
  minPerStepPercent?: number;
  /**
   * Highest selectable per-step success, in percent. Default 99.9; the
   * evaluation-crisis module passes 100 so perfect reliability is reachable.
   */
  maxPerStepPercent?: number;
  /** A named set of settings the per-step presets jump to. */
  presets?: keyof typeof PRESET_SETS;
  /**
   * Distinguishes reused mounts so VAL-EDU-036 takeaways stay structurally
   * different after digit-run normalisation; also picks the headline.
   */
  descriptionVariant?: Variant;
  className?: string;
};

const HEADLINES: Record<Variant, string> = {
  evaluation: 'At 95% per step, half of 14-step jobs fail',
  prediction: 'At 95% per step, half of 14-step jobs fail',
  reliability: 'Get each step 95% right, and long jobs mostly fail',
  home: 'Get each step 95% right, and long jobs mostly fail',
};

const CAPTIONS: Record<Variant, string> = {
  evaluation:
    'A long job only works if every step works, so a robot that rarely slips still fails long tasks.',
  prediction:
    'A long job only works if every step works, so a robot that rarely slips still fails long tasks.',
  reliability:
    'Even a robot that rarely slips usually fails a long chore, which is why each step must be almost perfect.',
  home: 'Even a robot that rarely slips usually fails a long chore, which is why each step must be almost perfect.',
};

const WIDTH = CHART_VIEW_WIDTH;
/** Stage units per CSS pixel of text on the narrowest full-size stage. */
const TEXT_UNITS = CHART_VIEW_WIDTH / MOTION_STAGE_TYPE.fullSizeMinStagePx;
const TEXT_H = CHART_TYPE.labelPx * TEXT_UNITS;
const LINE = TEXT_H * 1.25;
const LABEL_ASCENT = TEXT_H * CHART_TYPE.ascent;
const CHART_HEIGHT = 196;
const PAD = { top: 30, right: 14, bottom: 46, left: 44 };

const PLOT = {
  left: PAD.left,
  right: WIDTH - PAD.right,
  top: PAD.top,
  bottom: CHART_HEIGHT - PAD.bottom,
};

/* The job tiles: 100 jobs in 5 rows of 20 under the chart. */
const TILE_COLS = 20;
const TILE_ROWS = 5;
const TILE_LEFT = 14;
const TILE_PITCH = (WIDTH - TILE_LEFT - PAD.right) / TILE_COLS;
const TILE_SIZE = TILE_PITCH - 3;
const TILE_TITLE_Y = CHART_HEIGHT + 12 + LABEL_ASCENT;
const TILE_TOP = TILE_TITLE_Y + LINE * 0.6;
const HEIGHT = Number((TILE_TOP + TILE_ROWS * TILE_PITCH + 6).toFixed(2));

const PLAYHEAD_RADIUS = CHART_STROKE.markerRadius + 2;

/** Bounds on a semibold stage character's advance, in ems, for the note. */
const NOTE_CHAR_EM_MAX = 0.52;
const NOTE_CHAR_EM_MIN = 0.42;
/** The widest stage an article column gives a figure, in CSS px. */
const WIDEST_STAGE_PX = 760;

function scaleX(n: number, maxSteps: number): number {
  return PLOT.left + (n / maxSteps) * (PLOT.right - PLOT.left);
}

function scaleY(p: number): number {
  return PLOT.bottom - p * (PLOT.bottom - PLOT.top);
}

const DEFAULT_MIN_PER_STEP_PERCENT = 50;
const DEFAULT_MAX_PER_STEP_PERCENT = 99.9;

function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** A per-step percent as the stage writes it: 95%, 99%, 99.9%. */
function perStepWords(percent: number): string {
  return `${Number.isInteger(percent) ? percent.toFixed(0) : percent.toFixed(1)}%`;
}

function stepWord(n: number): string {
  return n === 1 ? 'step' : 'steps';
}

function reliabilityTakeaway(args: {
  variant: Variant;
  perStepPercent: number;
  steps: number;
  maxSteps: number;
  successPct: string;
  endPct: string;
  crossSteps: number;
}): string {
  const { variant, perStepPercent, steps, maxSteps, successPct, endPct, crossSteps } =
    args;
  if (variant === 'prediction') {
    return `The evaluation-crisis prediction panel is seeded at ${steps} steps so episode success sits at ${successPct} when per-step success is ${perStepPercent.toFixed(1)} percent, and the curve still ends at ${endPct} by step ${maxSteps} after crossing 50 percent near step ${crossSteps}.`;
  }
  if (variant === 'reliability') {
    return `On the reliability-gap calculator a ${perStepPercent.toFixed(1)} percent per-step policy yields ${successPct} episode success at ${steps} steps and only ${endPct} at the ${maxSteps}-step far end, with the 50 percent crossing near step ${crossSteps}.`;
  }
  if (variant === 'evaluation') {
    return `The evaluation calculator at ${perStepPercent.toFixed(1)} percent per-step success reports ${successPct} episode success after ${steps} decisions and ${endPct} at the ${maxSteps}-step end of the range, crossing half only around step ${crossSteps}.`;
  }
  return `At ${perStepPercent.toFixed(1)} percent per-step success, episode success is ${successPct} at ${steps} steps and ${endPct} at the ${maxSteps}-step end of the plotted range, crossing 50 percent at ${crossSteps} steps as the per-step odds compound over the episode length.`;
}

export function ReliabilityCompounding({
  defaultPerStep = 0.95,
  defaultSteps = 30,
  maxSteps = 100,
  minPerStepPercent = DEFAULT_MIN_PER_STEP_PERCENT,
  maxPerStepPercent = DEFAULT_MAX_PER_STEP_PERCENT,
  presets,
  descriptionVariant = 'home',
  className,
}: ReliabilityCompoundingProps) {
  // useId-derived ids: this component can render twice on one page, and a
  // hardcoded id would duplicate and cross-bind the labels.
  const uid = useId();
  const perStepId = `${uid}-rc-per-step`;
  const stepsId = `${uid}-rc-steps`;
  const descriptionId = `${uid}-rc-description`;
  const [perStepPercent, setPerStepPercent] = useState(defaultPerStep * 100);
  const [steps, setSteps] = useState(defaultSteps);

  const perStep = perStepPercent / 100;
  const episodeSuccess = compoundedSuccessRate(perStep, steps);
  const presetSet: ReadonlyArray<ReliabilityCompoundingPreset> | null = presets
    ? PRESET_SETS[presets]
    : null;
  const activePreset =
    PER_STEP_PRESETS.find((preset) => Math.abs(perStepPercent - preset.percent) < 0.05)?.id ??
    null;

  function choosePreset(id: PerStepPresetId) {
    const preset = PER_STEP_PRESETS.find((p) => p.id === id)!;
    setPerStepPercent(preset.percent);
    const linked = presetSet?.find((p) => Math.abs(p.perStep * 100 - preset.percent) < 0.05);
    if (linked) setSteps(linked.steps);
  }

  const { path, marker, sampleRows } = useMemo(() => {
    const curve = compoundingCurve(perStep, maxSteps);
    const d = curve
      .map((p, n) => `${n === 0 ? 'M' : 'L'}${scaleX(n, maxSteps).toFixed(2)},${scaleY(p).toFixed(2)}`)
      .join(' ');
    // The sampled table is derived from the same curve the path is drawn
    // from, so the two can never disagree (VAL-EDU-023) and the sample
    // moves with the per-step control (VAL-EDU-024).
    const sample = [0, 10, 25, 50, 75, maxSteps].map((n) => ({
      label: `${n} step${n === 1 ? '' : 's'}`,
      values: [
        `${(compoundedSuccessRate(perStep, n) * 100).toFixed(1)}%`,
      ],
    }));
    return {
      path: d,
      marker: { cx: scaleX(steps, maxSteps), cy: scaleY(compoundedSuccessRate(perStep, steps)) },
      sampleRows: sample,
    };
  }, [perStep, steps, maxSteps]);

  const successPct = formatPercent(episodeSuccess);
  const finished = Math.round(episodeSuccess * 100);
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxSteps));
  const value = roleColour('value');

  function reset() {
    setPerStepPercent(defaultPerStep * 100);
    setSteps(defaultSteps);
  }

  // The note sits in whichever band the curve leaves clear: along the top
  // when the curve falls, along the bottom when it stays high.
  const curveStaysHigh = compoundedSuccessRate(perStep, Math.round(maxSteps * 0.6)) > 0.5;
  const annotationLines = [
    `${steps} ${stepWord(steps)}, each ${perStepWords(perStepPercent)} reliable:`,
    `${finished < 50 ? 'only ' : ''}${finished} in 100 jobs finish`,
  ];
  // Stage text keeps one on-screen size, so the note is widest in stage
  // units on the narrowest stage and narrowest on the widest. Its left edge
  // is fixed so the widest case still ends inside the plot, and the leader
  // leaves from a point the text covers at every width, nearest the ring.
  const longest = Math.max(...annotationLines.map((line) => line.length));
  const noteWidest = longest * NOTE_CHAR_EM_MAX * TEXT_H;
  const noteNarrowest = longest * NOTE_CHAR_EM_MIN * CHART_TYPE.labelPx * (WIDTH / WIDEST_STAGE_PX);
  const noteY = curveStaysHigh
    ? PLOT.bottom - LINE - 10
    : PLOT.top + LABEL_ASCENT + 4;
  // The note's second line sits one annotation line-height below the first.
  const noteLineHeight = CHART_TYPE.labelPx * 1.25;
  // A falling curve still crosses the top band near the left; the note
  // starts where the curve has dropped below its second line.
  const noteBottom = noteY + noteLineHeight + TEXT_H * 0.3 + 4;
  let curveClearStep = 0;
  while (curveClearStep < maxSteps && scaleY(compoundedSuccessRate(perStep, curveClearStep)) < noteBottom) {
    curveClearStep += 1;
  }
  const noteX = curveStaysHigh
    ? PLOT.left + 8
    : Math.max(PLOT.left + 4, PLOT.right - noteWidest, scaleX(curveClearStep, maxSteps) + 4);
  const fromX = Math.min(Math.max(marker.cx, noteX + 4), noteX + noteNarrowest - 4);
  const noteFrom: [number, number] = curveStaysHigh
    ? [fromX, noteY - TEXT_H]
    : [fromX, noteY + noteLineHeight + TEXT_H * 0.45];

  return (
    <InstrumentFigure
      figureId="reliability-compounding"
      className={className}
      kicker="Compounding error"
      heading={HEADLINES[descriptionVariant]}
      controls={
        <>
          <PresetGroup<PerStepPresetId>
            label="How often each step goes right"
            presets={PER_STEP_PRESETS.map(({ id, label }) => ({ id, label }))}
            value={activePreset}
            onChange={choosePreset}
            testId="per-step-preset"
          />
          <ControlField>
            <ControlLabel htmlFor={stepsId} value={`${steps} ${stepWord(steps)}`}>
              How many steps the job has
            </ControlLabel>
            <input
              id={stepsId}
              type="range"
              data-brand-control-id="control:input"
              min={1}
              max={maxSteps}
              step={1}
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              aria-label={`How many steps the job has (episode length in steps), currently ${steps}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="1 step" high={`${maxSteps} steps`} />
          </ControlField>
        </>
      }
      adjust={
        <>
          <ControlField>
            <ControlLabel htmlFor={perStepId} value={`${perStepPercent.toFixed(1)}%`}>
              How often each step goes right
            </ControlLabel>
            <input
              id={perStepId}
              type="range"
              data-brand-control-id="control:input"
              min={minPerStepPercent}
              max={maxPerStepPercent}
              step={0.1}
              value={perStepPercent}
              onChange={(e) => setPerStepPercent(Number(e.target.value))}
              aria-label={`How often each step goes right (per-step success probability in percent), currently ${perStepPercent.toFixed(1)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds
              low={`${perStepWords(minPerStepPercent)} of the time`}
              high={`${perStepWords(maxPerStepPercent)} of the time`}
            />
          </ControlField>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <StageReadout>
                At <span data-testid="per-step-readout">{perStepPercent.toFixed(1)}%</span> per
                step, a {steps}-step job goes right{' '}
                <span data-testid="episode-success-readout" style={{ color: value }}>
                  {successPct}
                </span>{' '}
                of the time
              </StageReadout>
              <StageStatus>Illustrative: a simple model, not a measured robot.</StageStatus>
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Line chart of episode success against episode length at ${perStepPercent.toFixed(1)} percent per-step success: a ${steps}-step job finishes ${successPct} of the time, ${finished} of 100 jobs`}
            aria-describedby={descriptionId}
          >
            <ChartAxes
              plot={PLOT}
              x={(n) => scaleX(n, maxSteps)}
              y={scaleY}
              xTicks={xTicks}
              yTicks={[0, 0.5, 1]}
              formatY={(p) => `${Math.round(p * 100)}%`}
              xLabel="steps in the job"
              yLabel="chance the whole job goes right"
            />
            <path
              data-series="episode-success"
              d={path}
              fill="none"
              stroke={value}
              strokeWidth={CHART_STROKE.trace}
              strokeLinejoin="round"
            />
            <circle
              data-chart-mark="playhead"
              data-chart-role="highlight"
              data-selection=""
              cx={marker.cx}
              cy={marker.cy}
              r={PLAYHEAD_RADIUS}
              fill="none"
              stroke={roleColour('highlight')}
              strokeWidth={CHART_STROKE.trace}
            />
            <StageAnnotation
              x={noteX}
              y={noteY}
              lines={annotationLines}
              from={noteFrom}
              target={[marker.cx, marker.cy]}
            />
            <g data-testid="job-tiles" data-finished={finished}>
              <DirectLabel x={TILE_LEFT} y={TILE_TITLE_Y}>
                {`100 jobs like this: ${finished} finish`}
              </DirectLabel>
              {Array.from({ length: TILE_COLS * TILE_ROWS }, (_, i) => {
                const done = i < finished;
                return (
                  <rect
                    key={i}
                    data-chart-mark="tile"
                    data-chart-role={done ? 'value' : 'reference'}
                    x={Number((TILE_LEFT + (i % TILE_COLS) * TILE_PITCH).toFixed(2))}
                    y={Number((TILE_TOP + Math.floor(i / TILE_COLS) * TILE_PITCH).toFixed(2))}
                    width={Number(TILE_SIZE.toFixed(2))}
                    height={Number(TILE_SIZE.toFixed(2))}
                    rx={1.5}
                    fill={done ? value : CHART_STRUCTURE.axes}
                    fillOpacity={done ? 1 : 0.18}
                  />
                );
              })}
            </g>
          </PlotStage>
        </FigureStage>
      }
      caption={CAPTIONS[descriptionVariant]}
      method={
        <>
          <p>
            This is an illustrative probability model, computed rather than measured on a robot. A
            job (an episode) is a chain of steps (decisions), and it finishes only if every step
            goes right. If each step succeeds with the same probability p, independently of the
            others, a job of n steps finishes with probability p^n. At the current setting that is
            ({perStep.toFixed(3)})^{steps} = {successPct}. Real failures are rarely independent,
            so treat the curve as a teaching model, not a forecast.
          </p>
          <p>
            The tiles round the same number to whole jobs out of 100. Working backwards, a job
            that must finish with probability q over n steps needs each step to succeed with
            probability q^(1/n).
          </p>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Sampled episode success by episode length"
            rowHeader="episode length"
            columns={[{ header: 'episode success', numeric: true }]}
            rows={sampleRows}
            description={reliabilityTakeaway({
              variant: descriptionVariant,
              perStepPercent,
              steps,
              maxSteps,
              successPct,
              endPct: formatPercent(compoundedSuccessRate(perStep, maxSteps)),
              crossSteps: Math.max(
                1,
                Math.round(Math.log(0.5) / Math.log(perStep)),
              ),
            })}
          />
        </>
      }
    />
  );
}
