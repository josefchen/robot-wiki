'use client';

import { useId, useMemo, useState } from 'react';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageNumber, StageReadout, StageStatus } from '@/components/motion/figure-frame';
import {
  Bar,
  ChartAxes,
  ConstraintHatch,
  DirectLabel,
  LegendSwatch,
  StageAnnotation,
  roleColour,
  CHART_STROKE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
} from '@/components/motion/chart';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  AMORTIZATION_MONTHS,
  DEFAULT_INPUTS,
  INPUT_RANGES,
  PAYBACK_TARGET_MONTHS,
  ROBOT_HOURS_PER_MONTH,
  SECONDS_PER_HOUR,
  computeEconomics,
  paysBackWithinTarget,
  type EconomicsInputs,
} from '@/lib/deployment-economics';
import { MOTION_STAGE_TYPE } from '@/lib/motion-tokens';

/**
 * DeploymentEconomics: the payback calculator for a robotic pick cell.
 *
 * Two controls stay in view: how often a pick fails (two presets) and the
 * time a person needs to fix each jam. The other five inputs, the raw
 * per-pick success slider and the reset sit in "Adjust more". The stage
 * draws months to pay back against the time to fix each jam for both
 * failure rates, so the settle frame already shows that slow fixes only
 * hurt once failures are common, and under it the hour bar of the current
 * case. The selected case is the ring, not the line weight. Pure arithmetic lives in lib/deployment-economics.ts.
 *
 * Interactive contract: typed props, deterministic render, visible
 * numeric readouts, reset control, keyboard-accessible native sliders, no
 * auto-playing motion, no layout shift (both plots keep fixed axes per
 * state).
 */

type DeploymentEconomicsProps = {
  className?: string;
};

type ControlKey = keyof EconomicsInputs;

type ControlSpec = {
  key: ControlKey;
  /** The visible label, in plain words. */
  label: string;
  /** The model's name for the input, kept in the accessible name. */
  term: string;
  /** Formats the current value for the label and aria text. */
  format: (v: number) => string;
  /** Plain words for the two slider ends. */
  ends: [string, string];
  /** Sourcing note under the slider; every default is sourced or an
   * explicitly labelled assumption (VAL-DATA-034). */
  note: string;
};

function formatSeconds(v: number): string {
  if (v < 90) return `${Math.round(v)} ${Math.round(v) === 1 ? 'second' : 'seconds'}`;
  const minutes = v / 60;
  const rounded = Number.isInteger(minutes) ? `${minutes}` : minutes.toFixed(1);
  return `${rounded} minutes`;
}

const JAM_CONTROL: ControlSpec = {
  key: 'jamClearSeconds',
  label: 'Time to fix each jam',
  term: 'jam-clearing time',
  format: formatSeconds,
  ends: ['5 seconds', '5 minutes'],
  note: 'Assumption: seconds of human attention per failed pick; this dial is the whole argument.',
};

const SUCCESS_CONTROL: ControlSpec = {
  key: 'successRatePercent',
  label: 'Picks that succeed',
  term: 'per-pick success',
  format: (v) => `${v.toFixed(1)}%`,
  ends: ['90%', '99.9%'],
  note: 'Assumption: the policy headline number; the demonstration teaching step drops this to 99.',
};

/** Every control past the two in view, in the order the model lists them. */
const FOLD_CONTROLS: ControlSpec[] = [
  {
    key: 'robotCost',
    label: 'Robot price',
    term: 'robot cost',
    format: (v) => `$${(v / 1000).toFixed(0)}k`,
    ends: ['$20k', '$250k'],
    note: 'Assumption: $80k is a chosen example, not a sourced arm-price quote. EVST gives complete-cell budgets, not fixed list prices.',
  },
  {
    key: 'integrationMultiple',
    label: 'Whole cell cost, in robot prices',
    term: 'integration multiple',
    format: (v) => `${v.toFixed(1)}x`,
    ends: ['1 robot price', '5 robot prices'],
    note: 'Assumption: 2.5x is chosen within EVST’s 2-3x complete-cell guidance, not a measured cell.',
  },
  {
    key: 'cycleTimeSeconds',
    label: 'Seconds per pick',
    term: 'cycle time',
    format: (v) => `${v.toFixed(1)} s`,
    ends: ['2 seconds', '20 seconds'],
    note: 'Assumption: a paced piece-picking cycle; drag it to match any quoted cell.',
  },
  {
    key: 'uptimePercent',
    label: 'Share of time the cell runs',
    term: 'uptime',
    format: (v) => `${v.toFixed(1)}%`,
    ends: ['80%', '100%'],
    note: 'Assumption: availability net of maintenance and faults; 95% is a working figure, not a vendor claim.',
  },
  SUCCESS_CONTROL,
  {
    key: 'wageUsdPerHour',
    label: 'Hourly wage of the picker it replaces',
    term: 'displaced wage',
    format: (v) => `$${v.toFixed(0)}/h`,
    ends: ['$10', '$80'],
    note: 'Assumption: fully loaded picker wage; set it to your own facility number.',
  },
];

function formatMoney(v: number): string {
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

type FailurePreset = 'rare' | 'common';
const PRESET_SUCCESS: Record<FailurePreset, number> = { rare: 99.9, common: 99 };

const WIDTH = CHART_VIEW_WIDTH;
/** Stage text height in stage units on the narrowest full-size stage. */
const TEXT_UNITS = CHART_VIEW_WIDTH / MOTION_STAGE_TYPE.fullSizeMinStagePx;
const LINE = CHART_TYPE.labelPx * TEXT_UNITS * 1.25;
const ASCENT = CHART_TYPE.labelPx * TEXT_UNITS * CHART_TYPE.ascent;

/** The payback chart: months to pay back against minutes to fix a jam. */
const CHART = { left: 40, right: WIDTH - 14, top: 22 + LINE * 3, bottom: 22 + LINE * 3 + 96 };
const AXIS_BAND = LINE * 2 + 10;
/** The hour bar of the current case, under the chart. */
const BAR_TOP = CHART.bottom + AXIS_BAND + LINE + 10;
const BAR_HEIGHT = 26;
const BAR = { left: 14, right: WIDTH - 14, top: BAR_TOP, bottom: BAR_TOP + BAR_HEIGHT };
const HEIGHT = BAR.bottom + AXIS_BAND;

const JAM_RANGE = INPUT_RANGES.jamClearSeconds;
const JAM_SAMPLES = Array.from(
  { length: (JAM_RANGE.max - JAM_RANGE.min) / JAM_RANGE.step + 1 },
  (_, i) => JAM_RANGE.min + i * JAM_RANGE.step,
);
/** y-axis tops with their tick step: never more than five labelled ticks. */
const Y_SCALES: ReadonlyArray<[number, number]> = [
  [12, 3], [18, 6], [24, 6], [30, 10], [36, 12], [48, 12], [60, 15], [120, 30],
  [240, 60], [480, 120], [1200, 300], [2400, 600], [6000, 1500],
];

function scaleJam(seconds: number): number {
  return CHART.left + (seconds / JAM_RANGE.max) * (CHART.right - CHART.left);
}

function scaleHour(seconds: number): number {
  return BAR.left + (seconds / SECONDS_PER_HOUR) * (BAR.right - BAR.left);
}

/** The three shares of the hour bar, in drawing order. */
const SEGMENTS = [
  { key: 'productive', title: 'Productive cycles', series: 'economics-productive' },
  { key: 'jamClearing', title: 'Jam clearing', series: 'economics-jam-clearing' },
  { key: 'downtime', title: 'Downtime', series: 'economics-downtime' },
] as const;

/** A person, drawn small beside the jam label: the one who fixes it. */
function PersonIcon({ x, y, colour }: { x: number; y: number; colour: string }) {
  return (
    <g data-chart-mark="person" aria-hidden="true" fill="none" stroke={colour} strokeWidth={1.4} strokeLinecap="round">
      <circle cx={x} cy={y - 9} r={2.6} fill={colour} stroke="none" />
      <path d={`M${x} ${y - 6} V${y - 1} M${x - 3.5} ${y - 4.5} L${x + 3.5} ${y - 4.5} M${x} ${y - 1} L${x - 3} ${y + 4} M${x} ${y - 1} L${x + 3} ${y + 4}`} />
    </g>
  );
}

export function DeploymentEconomics({ className }: DeploymentEconomicsProps) {
  const uid = useId();
  const hatchId = `economics-jam-hatch-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const captionId = `${uid}-economics-caption`;
  const descriptionId = `${uid}-economics-description`;
  const [inputs, setInputs] = useState<EconomicsInputs>(DEFAULT_INPUTS);
  const out = computeEconomics(inputs);

  function set(key: ControlKey, value: number) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setInputs(DEFAULT_INPUTS);
  }

  const preset: FailurePreset | null =
    inputs.successRatePercent === PRESET_SUCCESS.rare
      ? 'rare'
      : inputs.successRatePercent === PRESET_SUCCESS.common
        ? 'common'
        : null;

  const verdictPass = paysBackWithinTarget(out.paybackMonths);
  const paybackText =
    out.paybackMonths === null
      ? 'never'
      : `${out.paybackMonths.toFixed(1)} months`;

  const breakdown = out.timeBreakdown;
  const breakdownTotal = breakdown.productive + breakdown.jamClearing + breakdown.downtime;
  const pct = (v: number) =>
    breakdownTotal > 0 ? `${((v / breakdownTotal) * 100).toFixed(1)}%` : '0%';
  const seconds = (key: (typeof SEGMENTS)[number]['key']) =>
    breakdownTotal > 0 ? (breakdown[key] / breakdownTotal) * SECONDS_PER_HOUR : 0;
  const segments = SEGMENTS.map((segment, index) => {
    const start = SEGMENTS.slice(0, index).reduce((sum, prior) => sum + seconds(prior.key), 0);
    const x = scaleHour(start);
    const width = scaleHour(start + seconds(segment.key)) - x;
    return { ...segment, x, width, share: pct(breakdown[segment.key]) };
  });

  // Payback against fix time, for both failure presets and, when a fold
  // control moved success off both, for the current rate too.
  const curves = useMemo(() => {
    const curveFor = (successRatePercent: number) =>
      JAM_SAMPLES.map((jam) => {
        const months = computeEconomics({ ...inputs, successRatePercent, jamClearSeconds: jam }).paybackMonths;
        return [jam, months ?? Number.POSITIVE_INFINITY] as const;
      });
    const common = curveFor(PRESET_SUCCESS.common);
    const rare = curveFor(PRESET_SUCCESS.rare);
    const current = preset === null ? curveFor(inputs.successRatePercent) : null;
    return { common, rare, current };
  }, [inputs, preset]);

  const finite = [...curves.common, ...curves.rare, ...(curves.current ?? [])]
    .map(([, m]) => m)
    .filter((m) => Number.isFinite(m));
  const peak = Math.max(...finite, 1);
  const [yMax, yStep] = Y_SCALES.find(([top]) => top >= peak * 1.6) ?? Y_SCALES[Y_SCALES.length - 1];
  const yTicks = Array.from({ length: Math.round(yMax / yStep) + 1 }, (_, i) => i * yStep);
  const scaleMonths = (m: number) =>
    CHART.bottom - (Math.min(m, yMax) / yMax) * (CHART.bottom - CHART.top);
  const pathOf = (curve: ReadonlyArray<readonly [number, number]>) =>
    curve
      .map(([jam, m], i) => `${i === 0 ? 'M' : 'L'}${scaleJam(jam).toFixed(2)} ${scaleMonths(m).toFixed(2)}`)
      .join(' ');

  const commonEnd = curves.common[curves.common.length - 1];
  const commonQuick = computeEconomics({ ...inputs, successRatePercent: PRESET_SUCCESS.common, jamClearSeconds: DEFAULT_INPUTS.jamClearSeconds }).paybackMonths;
  const rareEnd = curves.rare[curves.rare.length - 1];
  // The annotation names the steep line, so it alone is drawn at full
  // emphasis whichever case is selected; the ring marks the selection.
  const roleFor = (curve: FailurePreset) => (curve === 'common' ? 'value' : 'reference');
  const marker = {
    x: scaleJam(inputs.jamClearSeconds),
    y: scaleMonths(out.paybackMonths ?? yMax),
  };
  const endTarget: [number, number] = [scaleJam(commonEnd[0]), scaleMonths(commonEnd[1])];
  const annotationLines = [
    'When 1 pick in 100 fails and fixes',
    `take 5 minutes: ${commonEnd[1].toFixed(1)} months to pay back`,
  ];
  const noteX = CHART.right;
  const noteY = 22 + ASCENT * 0.2;
  const noteFrom: [number, number] = [endTarget[0] - 6, noteY + LINE + 6];

  const jamSegment = segments[1];
  const jamCentre = jamSegment.x + jamSegment.width / 2;
  const jamLabelY = BAR.top - 8;
  const constraint = roleColour('constraint');

  const sampleRows = JAM_SAMPLES.filter((jam) => jam === 5 || jam % 60 === 0 || jam === 15).map((jam) => {
    const rare = computeEconomics({ ...inputs, successRatePercent: PRESET_SUCCESS.rare, jamClearSeconds: jam }).paybackMonths;
    const common = computeEconomics({ ...inputs, successRatePercent: PRESET_SUCCESS.common, jamClearSeconds: jam }).paybackMonths;
    return {
      label: `${jam}`,
      values: [rare === null ? 'never' : rare.toFixed(2), common === null ? 'never' : common.toFixed(2)],
    };
  });

  function sliderField(spec: ControlSpec, visible: boolean) {
    const id = `${uid}-${spec.key}`;
    const range = INPUT_RANGES[spec.key];
    const current = inputs[spec.key];
    return (
      <ControlField key={spec.key} className="content-start">
        <ControlLabel htmlFor={id} value={spec.format(current)}>
          {spec.label}
        </ControlLabel>
        <input
          id={id}
          type="range"
          data-brand-control-id="control:input"
          min={range.min}
          max={range.max}
          step={range.step}
          value={current}
          onChange={(e) => set(spec.key, Number(e.target.value))}
          aria-label={`${spec.label} (${spec.term}), currently ${spec.format(current)}`}
          className={INSTRUMENT_SLIDER_CLASS}
        />
        <SliderEnds low={spec.ends[0]} high={spec.ends[1]} />
        {/* In view, the note is for assistive technology only; it is
            repeated, with the others, in "How this was made". */}
        <div data-control-note="" className={visible ? 'sr-only' : 'font-sans text-sm leading-snug text-text-dim'}>
          {spec.note}
        </div>
      </ControlField>
    );
  }

  return (
    <InstrumentFigure
      figureId="deployment-economics"
      className={className}
      kicker="Cell economics calculator"
      heading="Slow jam fixes delay when a picking robot pays off"
      controls={
        <>
          <PresetGroup<FailurePreset>
            label="How often a pick fails"
            presets={[
              { id: 'rare', label: '1 in 1,000' },
              { id: 'common', label: '1 in 100' },
            ]}
            value={preset}
            onChange={(id) => set('successRatePercent', PRESET_SUCCESS[id])}
            testId="economics-failure-preset"
          />
          {sliderField(JAM_CONTROL, true)}
        </>
      }
      adjust={
        <>
          <div className="grid w-full basis-full gap-x-6 gap-y-3 sm:grid-cols-2">
            {FOLD_CONTROLS.map((spec) => sliderField(spec, false))}
          </div>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <StageReadout>
                Pays for itself in{' '}
                <StageNumber data-testid="payback-months" style={{ color: roleColour('value') }}>
                  {paybackText}
                </StageNumber>
              </StageReadout>
              <InstrumentReadout data-testid="payback-verdict" className="text-text-dim">
                {verdictPass
                  ? `Pays back inside ${PAYBACK_TARGET_MONTHS} months`
                  : `Outside a ${PAYBACK_TARGET_MONTHS}-month horizon`}
              </InstrumentReadout>
              <InstrumentLegend className="basis-full">
                <LegendItem series="economics-productive" swatch={<LegendSwatch role="value" mark="bar" />}>
                  <span data-testid="hour-legend-productive" style={{ color: roleColour('value') }}>robot picking</span>
                </LegendItem>
                <LegendItem series="economics-jam-clearing" swatch={<LegendSwatch role="constraint" mark="hatch" />}>
                  <span data-testid="hour-legend-jams">a person fixing jams</span>
                </LegendItem>
                <LegendItem series="economics-downtime" swatch={<LegendSwatch role="reference" mark="bar" />}>
                  <span data-testid="hour-legend-downtime">stopped for upkeep</span>
                </LegendItem>
              </InstrumentLegend>
              <StageStatus>Illustrative: chosen inputs, not a measured cell.</StageStatus>
            </>
          }
        >
          <PlotStage
            data-testid="time-breakdown"
            viewBox={`0 0 ${WIDTH} ${HEIGHT.toFixed(1)}`}
            aria-label={`Time breakdown per elapsed hour: ${pct(
              breakdown.productive,
            )} productive cycles, ${pct(
              breakdown.jamClearing,
            )} jam clearing, ${pct(breakdown.downtime)} downtime`}
            aria-describedby={`${captionId} ${descriptionId}`}
          >
            <DirectLabel x={BAR.left} y={CHART.top - 12}>months to pay back</DirectLabel>
            <ChartAxes
              plot={CHART}
              x={scaleJam}
              y={scaleMonths}
              xTicks={[60, 120, 180, 240, 300]}
              yTicks={yTicks}
              formatX={(s) => `${s / 60}`}
              xLabel="minutes to fix each jam"
            />
            <g data-series="payback-rare" data-curve="rare">
              <path
                data-chart-mark="line"
                data-chart-role={roleFor('rare')}
                d={pathOf(curves.rare)}
                fill="none"
                stroke={roleColour(roleFor('rare'))}
                strokeWidth={roleFor('rare') === 'value' ? CHART_STROKE.trace : CHART_STROKE.reference}
                strokeDasharray={roleFor('rare') === 'value' ? undefined : CHART_STROKE.dash}
                strokeLinejoin="round"
              />
              <DirectLabel
                x={CHART.right}
                y={scaleMonths(rareEnd[1]) + LINE}
                anchor="end"
                role={roleFor('rare')}
              >
                1 in 1,000 picks fail
              </DirectLabel>
            </g>
            <g data-series="payback-common" data-curve="common">
              <path
                data-chart-mark="line"
                data-chart-role={roleFor('common')}
                d={pathOf(curves.common)}
                fill="none"
                stroke={roleColour(roleFor('common'))}
                strokeWidth={roleFor('common') === 'value' ? CHART_STROKE.trace : CHART_STROKE.reference}
                strokeDasharray={roleFor('common') === 'value' ? undefined : CHART_STROKE.dash}
                strokeLinejoin="round"
              />
            </g>
            {curves.current ? (
              <g data-series="payback-current" data-curve="current">
                <path
                  data-chart-mark="line"
                  data-chart-role="reference"
                  d={pathOf(curves.current)}
                  fill="none"
                  stroke={roleColour('reference')}
                  strokeWidth={CHART_STROKE.reference}
                  strokeLinejoin="round"
                />
              </g>
            ) : null}
            <circle
              data-chart-mark="playhead"
              data-chart-role="highlight"
              cx={marker.x}
              cy={marker.y}
              r={CHART_STROKE.markerRadius + 2}
              fill="none"
              stroke={roleColour('highlight')}
              strokeWidth={CHART_STROKE.trace}
            />
            <StageAnnotation
              x={noteX}
              y={noteY}
              anchor="end"
              lines={annotationLines}
              from={noteFrom}
              target={endTarget}
            />

            {/* The hour bar of the current case. */}
            <g data-series="economics-jam-label">
              <PersonIcon x={jamCentre} y={jamLabelY - 2} colour={constraint} />
              <DirectLabel x={jamCentre - 8} y={jamLabelY} anchor="end">
                {`fixing jams: ${formatSeconds(breakdown.jamClearing)}`}
              </DirectLabel>
              <line
                x1={jamCentre}
                x2={jamCentre}
                y1={jamLabelY + 5}
                y2={BAR.top}
                stroke={constraint}
                strokeWidth={CHART_STROKE.structure * 2}
              />
            </g>
            {segments.map((segment) => (
              <g
                key={segment.key}
                data-series={segment.series}
                data-breakdown-segment={segment.title}
                data-share={segment.share}
              >
                {segment.key === 'jamClearing' ? (
                  <ConstraintHatch id={hatchId} x={segment.x} y={BAR.top} width={segment.width} height={BAR_HEIGHT} />
                ) : (
                  <Bar
                    x={segment.x}
                    y={BAR.top}
                    width={segment.width}
                    height={BAR_HEIGHT}
                    role={segment.key === 'productive' ? 'value' : 'reference'}
                  />
                )}
              </g>
            ))}
            <ChartAxes
              plot={BAR}
              x={scaleHour}
              y={() => BAR.bottom}
              xTicks={[0, 900, 1800, 2700, 3600]}
              formatX={(s) => `${s / 60}`}
              grid={false}
              yAxis={false}
              xLabel="minutes of one working hour"
            />
          </PlotStage>
        </FigureStage>
      }
      caption="Every failed pick pulls a person over, and how long that takes decides when the robot earns back its price."
      captionProps={{ id: captionId }}
      method={
        <>
          <p>
            The calculator values a robotic pick cell by the picker wages its output replaces. Cell
            cost is robot price times the integration multiple ({formatMoney(out.totalCellCost)} now).
            Each failed pick is a jam a person clears, so every good pick carries the jam rate times
            the clearing time on top of its cycle. Payback divides cell cost by the monthly labour
            value of the modeled picks; the verdict compares it with a chosen{' '}
            {PAYBACK_TARGET_MONTHS}-month horizon.
          </p>
          <p>
            Current case: payback <span>{paybackText}</span>; capital cost per pick{' '}
            <span data-testid="cost-per-pick">{out.costPerPickUsd.toFixed(3)}</span> USD over{' '}
            {AMORTIZATION_MONTHS / 12} yr. Cell cost {formatMoney(out.totalCellCost)};{' '}
            {out.netPicksPerHour.toFixed(0)} modeled picks per elapsed hour and{' '}
            {out.monthlyPicks.toLocaleString('en-US', { maximumFractionDigits: 0 })} per{' '}
            {ROBOT_HOURS_PER_MONTH}-hour month; jam rate {out.jamRatePercent.toFixed(2)}%.
          </p>
          <p>
            Where the elapsed hour goes:{' '}
            <span data-testid="breakdown-productive">productive {breakdown.productive.toFixed(0)} s</span>,{' '}
            <span data-testid="breakdown-jams">jam clearing {breakdown.jamClearing.toFixed(0)} s</span>,{' '}
            <span data-testid="breakdown-downtime">downtime {breakdown.downtime.toFixed(0)} s</span>{' '}
            of {SECONDS_PER_HOUR} s.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {[JAM_CONTROL, ...FOLD_CONTROLS].map((spec) => (
              <li key={spec.key}>
                {spec.label} ({spec.term}, default {spec.format(DEFAULT_INPUTS[spec.key])}): {spec.note}
              </li>
            ))}
          </ul>
          <p>
            All seven defaults and slider ranges are authored assumptions; EVST’s guide supplies
            context, not exact inputs; none is a measured deployment result. The chart&rsquo;s lines
            hold every other input at its current value and vary only the clearing time, at 99.9%
            (1 failed pick in 1,000) and 99% (1 in 100) per-pick success. The hour bar spends 3,600
            elapsed seconds on productive cycles, jam clearing and downtime.
          </p>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Months to pay back by jam-clearing time"
            rowHeader="jam-clearing seconds"
            columns={[
              { header: 'payback at 99.9% success', numeric: true },
              { header: 'payback at 99% success', numeric: true },
            ]}
            rows={sampleRows}
            description={`Months to pay back rise with jam-clearing time. At 99% per-pick success they go from ${commonQuick === null ? 'never' : commonQuick.toFixed(1)} months with ${DEFAULT_INPUTS.jamClearSeconds}-second clearing to ${commonEnd[1].toFixed(1)} months with 300-second clearing; at 99.9% they reach ${rareEnd[1].toFixed(1)} months at 300 seconds. The current case pays back in ${paybackText}.`}
          />
        </>
      }
    />
  );
}
