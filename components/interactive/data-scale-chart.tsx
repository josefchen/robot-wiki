'use client';

import { useId, useState } from 'react';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  LegendSwatch,
  roleColour,
} from '@/components/motion/chart';
import { FigureStage } from '@/components/motion/figure-frame';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import {
  COLLECTION_RATES,
  DEFAULT_RIGS,
  FRONTIER_HOURS,
  LLM_POINTS,
  MAX_RIGS,
  MIN_RIGS,
  OXE_SCALE_HOURS,
  OXE_DURATION,
  ROBOT_POINTS,
  formatDuration,
  formatHours,
  formatRigs,
  hoursPerYear,
  rateById,
  yearsToTarget,
  type CollectionRateId,
} from '@/lib/data-scaling';

/**
 * DataScaleChart: robot and human demonstration hours against LLM
 * pretraining tokens on one log-log plane, plus a teleop-farm projection.
 *
 * Neither family has a value on the other axis, so each sits outside the
 * other's domain: datasets in rows under the 10^9-token line, read off the
 * hours axis, and language corpora in a lane left of 10^0 h, read off the
 * tokens axis. The plane between them stays empty; the dashed gap line
 * crosses it from the largest dataset's column to the largest corpus. No
 * hour-to-token exchange rate is drawn, because no honest one exists.
 *
 * The farm slider keeps two authored hypothetical rates (1,000 and 7
 * productive hours per rig-year) and targets (10,000 and 1,000,000 hours);
 * neither is a measured DROID rate or an OXE-equivalent duration. OXE stays
 * in the source line as a source-scoped unknown, never on the hours axis.
 */

const VIEW_H = 320;
/** The y axis; its tick labels sit to the left. */
const AXIS_X = 42;
/** The corpus lane, left of the hours domain. */
const LLM_X = 52;
/** x of 10^0 h and 10^6 h. */
const HOURS_X = [111, 322] as const;
/**
 * y of 10^14 and 10^9 tokens: 18 units a decade, so the stacked 12 px tick
 * labels keep a gap at a 375 px phone.
 */
const TOKENS_Y = [38, 128] as const;
/** The first dataset row, just under the token domain. */
const ROW_TOP = 138;
/**
 * One 13 px label line plus a hair, measured at a 375 px phone, where the
 * stage is 299 px wide and the frozen type scale paints the most viewBox
 * units per glyph.
 */
const ROW_PITCH = 20.5;
const AXIS_Y = 272;
/**
 * Axis-name baselines. The hours name clears the tick labels at the phone
 * type size, which paints each glyph about an eighth taller in view units.
 */
const Y_NAME_Y = 19;
const X_NAME_Y = AXIS_Y + 38;
const TICK = CHART_STROKE.tickLength;
const AXIS_STROKE = {
  stroke: CHART_STRUCTURE.axes,
  strokeWidth: CHART_STROKE.structure,
  opacity: CHART_STRUCTURE.axesOpacity,
};
const GRID_STROKE = {
  stroke: CHART_STRUCTURE.grid,
  strokeWidth: CHART_STROKE.structure,
  opacity: CHART_STRUCTURE.gridOpacity,
};
/** Marker centre to the near edge of its label. */
const LABEL_GAP = 7;
/**
 * Past this x the longest farm label (500,000 h/yr) would run off the right
 * edge at the phone type size, so the label moves left of the marker.
 */
const FARM_LABEL_FLIP_X = 186;

const HOURS_LOG = [0, 6] as const;
const TOKENS_LOG = [9, 14] as const;
const X_TICK_EXPS = [0, 1, 2, 3, 4, 5, 6] as const;
const Y_TICK_EXPS = [9, 10, 11, 12, 13, 14] as const;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function xFor(hours: number): number {
  const t = (Math.log10(hours) - HOURS_LOG[0]) / (HOURS_LOG[1] - HOURS_LOG[0]);
  return f(HOURS_X[0] + t * (HOURS_X[1] - HOURS_X[0]));
}

function yFor(tokens: number): number {
  const t = (Math.log10(tokens) - TOKENS_LOG[0]) / (TOKENS_LOG[1] - TOKENS_LOG[0]);
  return f(TOKENS_Y[1] - t * (TOKENS_Y[1] - TOKENS_Y[0]));
}

const SUPERSCRIPTS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
function sup(exp: number): string {
  return String(exp)
    .split('')
    .map((d) => SUPERSCRIPTS[Number(d)])
    .join('');
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** Largest first, so the gap line leaves the top row. */
const ROWS = [...ROBOT_POINTS].sort((a, b) => b.magnitude - a.magnitude);
const FARM_Y = f(ROW_TOP + ROWS.length * ROW_PITCH);
const rowY = (index: number) => f(ROW_TOP + index * ROW_PITCH);

const MARKER_R = CHART_STROKE.markerRadius;
const DIAMOND_R = f(MARKER_R * 1.35);
const STAGE_GROUND = 'var(--color-instrument)';
const MEASUREMENT = roleColour('measurement');
const VALUE = roleColour('value');
const REFERENCE = roleColour('reference');

/** Plot text knocks the gridlines out behind it. */
const HALO = {
  stroke: STAGE_GROUND,
  strokeWidth: 3,
  strokeLinejoin: 'round' as const,
  paintOrder: 'stroke',
};

function diamondPath(x: number, y: number, r: number): string {
  return `M ${f(x)},${f(y - r)} L ${f(x + r)},${f(y)} L ${f(x)},${f(y + r)} L ${f(x - r)},${f(y)} Z`;
}

function ShapeSwatch({ shape }: { shape: 'ring' | 'diamond' }) {
  const h = CHART_TYPE.tickPx;
  const outline = {
    fill: 'none',
    stroke: MEASUREMENT,
    strokeWidth: CHART_STROKE.reference,
  };
  return (
    <svg aria-hidden="true" focusable="false" width={h * 2} height={h} viewBox={`0 0 ${h * 2} ${h}`} className="shrink-0">
      {shape === 'ring' ? (
        <circle cx={h} cy={h / 2} r={MARKER_R} {...outline} />
      ) : (
        <path d={diamondPath(h, h / 2, h / 2 - CHART_STROKE.reference)} {...outline} />
      )}
    </svg>
  );
}

const ROBOT_MAX = ROWS[0];
const LLM_MAX = LLM_POINTS.reduce((a, b) => (b.magnitude > a.magnitude ? b : a));
const GAP_DECADES = Math.round(Math.log10(LLM_MAX.magnitude / ROBOT_MAX.magnitude));
const LLM_MAX_Y = yFor(LLM_MAX.magnitude);
const ROBOT_MAX_X = xFor(ROBOT_MAX.magnitude);
/**
 * The gap line runs from the largest corpus to the token floor above the
 * largest dataset. Ending on the floor rather than the marker keeps the
 * line clear of that dataset's label, which sits left of its marker.
 */
const GAP_SLOPE = (TOKENS_Y[1] - LLM_MAX_Y) / (ROBOT_MAX_X - LLM_X);
const gapY = (x: number) => f(LLM_MAX_Y + (x - LLM_X) * GAP_SLOPE);
const GAP_X = [f(LLM_X + DIAMOND_R + 2), ROBOT_MAX_X] as const;
/**
 * The gap label rides above the gap line, starting just right of the
 * stacked GPT-3 label as the phone type size sets it, and still ending
 * inside the stage there.
 */
const GAP_LABEL_X = 148;
const GAP_LABEL_Y = f(gapY(GAP_LABEL_X) - 8);

const CAPTION = `Demonstration datasets top out at ${ROBOT_MAX.magnitude.toLocaleString('en-US')} hours while LLM corpora reach ${(LLM_MAX.magnitude / 1e12).toLocaleString('en-US')} trillion tokens, ${NUMBER_WORDS[GAP_DECADES] ?? GAP_DECADES} orders of magnitude apart.`;

export function DataScaleChart({
  defaultRigs = DEFAULT_RIGS,
  defaultRate = 'dedicated',
  className,
}: {
  defaultRigs?: number;
  /** Initial collection-rate assumption; a prediction step mounts the
   *  chart at the rate that answers its prompt. */
  defaultRate?: CollectionRateId;
  className?: string;
}) {
  // useId-derived ids: a hardcoded id would duplicate and cross-bind the
  // labels whenever the chart mounts more than once on a page.
  const baseId = useId();
  const rigsId = `${baseId}-rigs`;
  const descriptionId = `${baseId}-description`;
  const [rigs, setRigs] = useState(defaultRigs);
  const [rateId, setRateId] = useState<CollectionRateId>(defaultRate);
  // Derive state during render when the initial prop changes (the repo
  // pattern, never useEffect): compare against the previous prop value
  // and resync before painting.
  const [prevDefaultRate, setPrevDefaultRate] = useState(defaultRate);
  if (defaultRate !== prevDefaultRate) {
    setPrevDefaultRate(defaultRate);
    setRateId(defaultRate);
  }

  const rate = rateById(rateId);
  const perYear = hoursPerYear(rigs, rateId);
  const targetYears = yearsToTarget(rigs, rateId, OXE_SCALE_HOURS);
  const largerTargetYears = yearsToTarget(rigs, rateId, FRONTIER_HOURS);
  const farmX = xFor(Math.max(perYear, 1));
  const farmLabelRight = farmX <= FARM_LABEL_FLIP_X;

  function reset() {
    setRigs(defaultRigs);
    setRateId(defaultRate);
  }

  return (
    <InstrumentFigure
      figureId="data-scale-chart"
      className={className}
      heading="Robot hours against LLM tokens"
      controls={
        <>
          <ControlField>
            <ControlLabel htmlFor={rigsId} value={`${formatRigs(rigs)} rigs`}>
              Teleoperation rigs
            </ControlLabel>
            <input
              id={rigsId}
              type="range"
              data-brand-control-id="control:input"
              min={MIN_RIGS}
              max={MAX_RIGS}
              step={1}
              value={rigs}
              onChange={(e) => setRigs(Number(e.target.value))}
              aria-label={`Teleoperation rigs, currently ${formatRigs(rigs)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          <div
            role="group"
            aria-label="Collection rate assumption"
            className="flex flex-wrap items-center gap-1"
          >
            {COLLECTION_RATES.map((r) => (
              <button
                key={r.id}
                type="button"
                data-brand-control-id="control:selection"
                aria-pressed={rateId === r.id}
                onClick={() => setRateId(r.id)}
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {r.label} ({r.hoursPerRigYear.toLocaleString('en-US')} h/rig/yr)
              </button>
            ))}
          </div>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="robot-data" swatch={<LegendSwatch role="measurement" mark="dot" />}>
                  robot data
                </LegendItem>
                <LegendItem series="human-video" swatch={<ShapeSwatch shape="ring" />}>
                  human video
                </LegendItem>
                <LegendItem series="llm-corpus" swatch={<ShapeSwatch shape="diamond" />}>
                  LLM corpus
                </LegendItem>
                <LegendItem series="farm-projection" swatch={<LegendSwatch role="value" mark="dot" />}>
                  your farm
                </LegendItem>
                <span>~ = estimated hours, not a published count</span>
              </InstrumentLegend>
              <InstrumentReadout data-testid="projection-summary" className="basis-full">
                <span data-testid="rigs-readout" style={{ color: roleColour('highlight') }}>
                  {formatRigs(rigs)}
                </span>{' '}
                rigs:{' '}
                <span data-testid="hours-readout" style={{ color: VALUE }}>
                  {formatHours(perYear)}/yr
                </span>{' '}
                hypothetical, 10,000 h in{' '}
                <span data-testid="oxe-years-readout">{formatDuration(targetYears)}</span>, 1,000,000 h
                in <span data-testid="frontier-years-readout">{formatDuration(largerTargetYears)}</span>
              </InstrumentReadout>
              <div
                data-testid="rate-explanation"
                className="basis-full font-sans text-[13px] leading-snug text-text-dim"
              >
                {rate.note} The 10,000-hour and 1,000,000-hour targets are authored hypothetical
                inputs, not OXE totals or measured frontier requirements. Hours marked ~ on dataset
                points are estimates.
              </div>
              <ChartDescription
                id={descriptionId}
                form="table"
                summary="Datasets and corpora by scale, with the farm projection"
                rowHeader="dataset"
                columns={[
                  { header: 'demonstration hours', numeric: true },
                  { header: 'pretraining tokens', numeric: true },
                ]}
                rows={[
                  // A dataset has no token count and a corpus no demonstration
                  // hours: the house "n/a" (inapplicable), not "not disclosed".
                  ...ROBOT_POINTS.map((p) => ({ label: p.label, values: [p.value, 'n/a'] })),
                  { label: OXE_DURATION.label, values: [OXE_DURATION.value, 'n/a'] },
                  ...LLM_POINTS.map((p) => ({ label: p.label, values: ['n/a', p.value] })),
                  {
                    label: `your hypothetical farm (${formatRigs(rigs)} rigs)`,
                    values: [`${formatHours(perYear)}/yr`, 'n/a'],
                  },
                ]}
                description={
                  <>
                    Demonstration hours span {ROBOT_POINTS[0].value} (DROID) to{' '}
                    {ROBOT_POINTS[ROBOT_POINTS.length - 1].value} (EgoScale) across{' '}
                    {ROBOT_POINTS.length} robot and human datasets, while pretraining tokens
                    span {LLM_POINTS[0].value.replace(' tokens', '')} (GPT-3) to{' '}
                    {LLM_POINTS[LLM_POINTS.length - 1].value.replace(' tokens', '')} (Llama
                    3), {GAP_DECADES} orders of magnitude apart with no honest hour-to-token
                    exchange rate between the lanes; your {formatRigs(rigs)}-rig farm at the{' '}
                    {rate.label.toLowerCase()} rate projects {formatHours(perYear)} per year,
                    reaching the authored 10,000-hour target in {formatDuration(targetYears)}
                    {' '}and the authored 1,000,000-hour target in {formatDuration(largerTargetYears)}.
                    {' '}No OXE hour estimate is supplied or plotted here.
                  </>
                }
              />
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${CHART_VIEW_WIDTH} ${VIEW_H}`}
            aria-label={`Demonstration hours against pretraining tokens, ${formatRigs(rigs)}-rig hypothetical farm projection`}
            aria-describedby={descriptionId}
          >
            <g data-chart-axes="">
              {Y_TICK_EXPS.map((exp) => {
                const y = yFor(10 ** exp);
                return (
                  <g key={`y-${exp}`}>
                    <line data-chart-grid="" x1={AXIS_X} x2={HOURS_X[1]} y1={y} y2={y} {...GRID_STROKE} />
                    <line x1={AXIS_X - TICK} x2={AXIS_X} y1={y} y2={y} {...AXIS_STROKE} />
                    <text
                      data-scene-tick=""
                      data-testid={`y-tick-${exp}`}
                      x={AXIS_X - TICK - TICK / 2}
                      y={y}
                      dominantBaseline="middle"
                      textAnchor="end"
                      fontSize={CHART_TYPE.tickPx}
                      fill={CHART_STRUCTURE.labelSecondary}
                    >
                      10{sup(exp)}
                    </text>
                  </g>
                );
              })}
              {X_TICK_EXPS.map((exp) => {
                const x = xFor(10 ** exp);
                return (
                  <g key={`x-${exp}`}>
                    <line data-chart-grid="" x1={x} x2={x} y1={TOKENS_Y[0]} y2={AXIS_Y} {...GRID_STROKE} />
                    <line x1={x} x2={x} y1={AXIS_Y} y2={AXIS_Y + TICK} {...AXIS_STROKE} />
                    <text
                      data-scene-tick=""
                      data-testid={`x-tick-${exp}`}
                      x={x}
                      y={AXIS_Y + TICK + CHART_TYPE.tickPx}
                      textAnchor="middle"
                      fontSize={CHART_TYPE.tickPx}
                      fill={CHART_STRUCTURE.labelSecondary}
                    >
                      10{sup(exp)}
                    </text>
                  </g>
                );
              })}
              <line x1={AXIS_X} x2={AXIS_X} y1={TOKENS_Y[0]} y2={TOKENS_Y[1]} {...AXIS_STROKE} />
              <line x1={HOURS_X[0]} x2={HOURS_X[1]} y1={AXIS_Y} y2={AXIS_Y} {...AXIS_STROKE} />
              <text data-scene-axis="" x={AXIS_X} y={Y_NAME_Y} fontSize={CHART_TYPE.axisPx} fill={CHART_STRUCTURE.labelSecondary}>
                pretraining tokens
              </text>
              <text
                data-scene-axis=""
                x={HOURS_X[1]}
                y={X_NAME_Y}
                textAnchor="end"
                fontSize={CHART_TYPE.axisPx}
                fill={CHART_STRUCTURE.labelSecondary}
              >
                demonstration hours
              </text>
            </g>

            <path
              data-testid="gap-line"
              data-chart-role="reference"
              d={`M ${GAP_X[0]},${gapY(GAP_X[0])} L ${GAP_X[1]},${gapY(GAP_X[1])}`}
              fill="none"
              stroke={REFERENCE}
              strokeWidth={CHART_STROKE.reference}
              strokeDasharray={CHART_STROKE.dash}
            />
            <text
              data-scene-note=""
              x={GAP_LABEL_X}
              y={GAP_LABEL_Y}
              fontSize={CHART_TYPE.axisPx}
              fill={REFERENCE}
              {...HALO}
            >
              {`${GAP_DECADES} orders of magnitude apart`}
            </text>

            {LLM_POINTS.map((p) => {
              const y = yFor(p.magnitude);
              // The gap line leaves the largest corpus down and to the right,
              // so its label sits above the line; the others stack name over
              // value beside the diamond, clear of the line.
              const above = p.id === LLM_MAX.id;
              return (
                <g key={p.id} data-testid={`llm-marker-${p.id}`} data-series="llm-corpus">
                  <path
                    data-chart-mark="diamond"
                    data-chart-role="measurement"
                    d={diamondPath(LLM_X, y, DIAMOND_R)}
                    fill={STAGE_GROUND}
                    stroke={MEASUREMENT}
                    strokeWidth={CHART_STROKE.reference}
                  />
                  {above ? (
                    <text
                      data-scene-note=""
                      x={LLM_X + LABEL_GAP}
                      y={f(y - DIAMOND_R - 1)}
                      fontSize={CHART_TYPE.axisPx}
                      fill={CHART_STRUCTURE.label}
                      {...HALO}
                    >
                      {p.label} <tspan fill={CHART_STRUCTURE.labelSecondary}>{p.value}</tspan>
                    </text>
                  ) : (
                    <text
                      data-scene-note=""
                      x={f(LLM_X + LABEL_GAP + 1)}
                      y={y}
                      dominantBaseline="middle"
                      fontSize={CHART_TYPE.axisPx}
                      fill={CHART_STRUCTURE.label}
                      {...HALO}
                    >
                      <tspan>{p.label}</tspan>
                      <tspan x={f(LLM_X + LABEL_GAP + 1)} dy="1.2em" fill={CHART_STRUCTURE.labelSecondary}>
                        {p.value}
                      </tspan>
                    </text>
                  )}
                </g>
              );
            })}

            {ROWS.map((p, index) => {
              const x = xFor(p.magnitude);
              const y = rowY(index);
              const human = p.kind === 'human-video';
              return (
                <g
                  key={p.id}
                  data-testid={`robot-marker-${p.id}`}
                  data-series={human ? 'human-video' : 'robot-data'}
                >
                  <circle
                    data-chart-mark={human ? 'ring' : 'dot'}
                    data-chart-role="measurement"
                    cx={x}
                    cy={y}
                    r={human ? f(MARKER_R - CHART_STROKE.reference / 2) : MARKER_R}
                    fill={human ? STAGE_GROUND : MEASUREMENT}
                    stroke={human ? MEASUREMENT : undefined}
                    strokeWidth={human ? CHART_STROKE.reference : undefined}
                  />
                  <text
                    data-scene-note=""
                    x={f(x - LABEL_GAP)}
                    y={y}
                    dominantBaseline="middle"
                    textAnchor="end"
                    fontSize={CHART_TYPE.axisPx}
                    fill={CHART_STRUCTURE.label}
                    {...HALO}
                  >
                    {p.label} <tspan fill={CHART_STRUCTURE.labelSecondary}>{p.value}</tspan>
                  </text>
                </g>
              );
            })}

            {/* The farm label must follow its marker: the role probes read it as the marker's next sibling. */}
            <circle
              data-testid="projection-marker"
              data-series="farm-projection"
              data-chart-mark="dot"
              data-chart-role="value"
              cx={farmX}
              cy={FARM_Y}
              r={MARKER_R + 1}
              fill={VALUE}
            />
            <text
              data-scene-note=""
              x={farmLabelRight ? f(farmX + LABEL_GAP + 1) : f(farmX - LABEL_GAP - 1)}
              y={FARM_Y}
              dominantBaseline="middle"
              textAnchor={farmLabelRight ? 'start' : 'end'}
              fontSize={CHART_TYPE.axisPx}
              fill={VALUE}
              {...HALO}
            >
              {`your farm: ${formatHours(perYear)}/yr`}
            </text>
          </PlotStage>
        </FigureStage>
      }
      caption={CAPTION}
      source={
        <span data-testid="oxe-duration-note">
          <a
            data-brand-control-id="control:link-focus"
            href={OXE_DURATION.sourceUrl}
            rel="noopener noreferrer"
            className="text-link underline"
          >
            OXE
          </a>
          : 1M+ trajectories across 22 robot embodiments. This chart supplies no hour estimate and
          does not plot OXE on the hours axis.
        </span>
      }
    />
  );
}
