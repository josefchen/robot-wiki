'use client';

import { useId, useState } from 'react';
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
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  Bar,
  ChartAxes,
  ConstraintHatch,
  LegendSwatch,
  roleColour,
  CHART_VIEW_WIDTH,
} from '@/components/motion/chart';
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

/**
 * DeploymentEconomics: the payback calculator for a robotic pick cell.
 *
 * Seven controls (robot cost, integration multiple, cycle time, uptime,
 * per-pick success, jam-clearing time, displaced wage) drive cost per
 * pick, payback in months, the where-the-hour-goes bar, and a verdict
 * readout against the buyer's horizon. Pure arithmetic lives in
 * lib/deployment-economics.ts; this component only renders it.
 *
 * Interactive contract: typed props, deterministic render, visible
 * numeric readouts, reset control, keyboard-accessible native sliders, no
 * auto-playing motion, no layout shift (the hour bar always spans the
 * same axis).
 */

type DeploymentEconomicsProps = {
  className?: string;
};

type ControlKey = keyof EconomicsInputs;

const CONTROLS: Array<{
  key: ControlKey;
  label: string;
  /** Formats the current value for the label and aria text. */
  format: (v: number) => string;
  /** Sourcing note shown under the slider; every default is sourced or an
   * explicitly labelled assumption (VAL-DATA-034). */
  note: string;
}> = [
  {
    key: 'robotCost',
    label: 'Robot cost',
    format: (v) => `$${(v / 1000).toFixed(0)}k`,
    note: 'Assumption: $80k is a chosen example, not a sourced arm-price quote. EVST gives complete-cell budgets, not fixed list prices.',
  },
  {
    key: 'integrationMultiple',
    label: 'Integration multiple',
    format: (v) => `${v.toFixed(1)}x`,
    note: 'Assumption: 2.5x is chosen within EVST’s 2-3x complete-cell guidance, not a measured cell.',
  },
  {
    key: 'cycleTimeSeconds',
    label: 'Cycle time',
    format: (v) => `${v.toFixed(1)} s`,
    note: 'Assumption: a paced piece-picking cycle; drag it to match any quoted cell.',
  },
  {
    key: 'uptimePercent',
    label: 'Uptime',
    format: (v) => `${v.toFixed(1)}%`,
    note: 'Assumption: availability net of maintenance and faults; 95% is a working figure, not a vendor claim.',
  },
  {
    key: 'successRatePercent',
    label: 'Per-pick success',
    format: (v) => `${v.toFixed(1)}%`,
    note: 'Assumption: the policy headline number; the demonstration teaching step drops this to 99.',
  },
  {
    key: 'jamClearSeconds',
    label: 'Jam-clearing time',
    format: (v) => `${v.toFixed(0)} s`,
    note: 'Assumption: seconds of human attention per failed pick; this dial is the whole argument.',
  },
  {
    key: 'wageUsdPerHour',
    label: 'Displaced wage',
    format: (v) => `$${v.toFixed(0)}/h`,
    note: 'Assumption: fully loaded picker wage; set it to your own facility number.',
  },
];

function formatMoney(v: number): string {
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

const WIDTH = CHART_VIEW_WIDTH;
const PAD = { top: 8, right: 24, bottom: 46, left: 14 };
const BAR_HEIGHT = 32;
const HEIGHT = PAD.top + BAR_HEIGHT + PAD.bottom;
const PLOT = {
  left: PAD.left,
  right: WIDTH - PAD.right,
  top: PAD.top,
  bottom: PAD.top + BAR_HEIGHT,
};
const X_TICKS = [0, 0.25, 0.5, 0.75, 1].map((f) => f * SECONDS_PER_HOUR);

function scaleX(seconds: number): number {
  return PLOT.left + (seconds / SECONDS_PER_HOUR) * (PLOT.right - PLOT.left);
}

/** The three shares of the hour bar, in drawing order. */
const SEGMENTS = [
  { key: 'productive', title: 'Productive cycles', series: 'economics-productive' },
  { key: 'jamClearing', title: 'Jam clearing', series: 'economics-jam-clearing' },
  { key: 'downtime', title: 'Downtime', series: 'economics-downtime' },
] as const;

export function DeploymentEconomics({ className }: DeploymentEconomicsProps) {
  const uid = useId();
  const hatchId = `economics-jam-hatch-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const captionId = `${uid}-economics-caption`;
  const [inputs, setInputs] = useState<EconomicsInputs>(DEFAULT_INPUTS);
  const out = computeEconomics(inputs);

  function set(key: ControlKey, value: number) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setInputs(DEFAULT_INPUTS);
  }

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
    const x = scaleX(start);
    const width = scaleX(start + seconds(segment.key)) - x;
    return { ...segment, x, width, share: pct(breakdown[segment.key]) };
  });

  return (
    <InstrumentFigure
      figureId="deployment-economics"
      className={className}
      heading="Cell economics calculator"
      controls={
        <>
          <div className="grid w-full basis-full gap-x-6 gap-y-3 sm:grid-cols-2">
            {CONTROLS.map(({ key, label, format, note }) => {
              const id = `${uid}-${key}`;
              const range = INPUT_RANGES[key];
              const current = inputs[key];
              return (
                <ControlField key={key} className="content-start">
                  <ControlLabel htmlFor={id} value={format(current)}>
                    {label}
                  </ControlLabel>
                  <input
                    id={id}
                    type="range"
                    data-brand-control-id="control:input"
                    min={range.min}
                    max={range.max}
                    step={range.step}
                    value={current}
                    onChange={(e) => set(key, Number(e.target.value))}
                    aria-label={`${label}, currently ${format(current)}`}
                    className={INSTRUMENT_SLIDER_CLASS}
                  />
                  <div data-control-note="" className="font-sans text-xs leading-snug text-text-dim">
                    {note}
                  </div>
                </ControlField>
              );
            })}
          </div>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="economics-productive" swatch={<LegendSwatch role="value" mark="bar" />}>
                  <span data-testid="breakdown-productive" style={{ color: roleColour('value') }}>productive {breakdown.productive.toFixed(0)} s</span>
                </LegendItem>
                <LegendItem series="economics-jam-clearing" swatch={<LegendSwatch role="constraint" mark="hatch" />}>
                  <span data-testid="breakdown-jams">jam clearing {breakdown.jamClearing.toFixed(0)} s</span>
                </LegendItem>
                <LegendItem series="economics-downtime" swatch={<LegendSwatch role="reference" mark="bar" />}>
                  <span data-testid="breakdown-downtime">downtime {breakdown.downtime.toFixed(0)} s</span>
                </LegendItem>
              </InstrumentLegend>
              <div className="grid gap-x-6 gap-y-2 font-sans sm:grid-cols-3">
                <div>
                  <div className="text-xs text-text-dim">Cost per pick</div>
                  <div className="text-[13px] tabular-nums text-text">
                    <span data-testid="cost-per-pick">{out.costPerPickUsd.toFixed(3)}</span>{' '}
                    <span className="text-text-dim">USD over {AMORTIZATION_MONTHS / 12} yr</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-dim">Payback</div>
                  <div className="text-[13px] tabular-nums text-text">
                    <span data-testid="payback-months">{paybackText}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-dim">Verdict</div>
                  <InstrumentReadout data-testid="payback-verdict">
                    {verdictPass
                      ? `Pays back inside ${PAYBACK_TARGET_MONTHS} months`
                      : `Outside a ${PAYBACK_TARGET_MONTHS}-month horizon`}
                  </InstrumentReadout>
                </div>
              </div>
              <div className="font-sans text-xs leading-snug text-text-dim">
                Cell cost {formatMoney(out.totalCellCost)}; {out.netPicksPerHour.toFixed(0)} modeled picks per elapsed hour and{' '}
                {out.monthlyPicks.toLocaleString('en-US', { maximumFractionDigits: 0 })} per {ROBOT_HOURS_PER_MONTH}-hour month; jam rate{' '}
                {out.jamRatePercent.toFixed(2)}%.
              </div>
            </>
          }
        >
          <PlotStage
            data-testid="time-breakdown"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Time breakdown per elapsed hour: ${pct(
              breakdown.productive,
            )} productive cycles, ${pct(
              breakdown.jamClearing,
            )} jam clearing, ${pct(breakdown.downtime)} downtime`}
            aria-describedby={captionId}
          >
            <ChartAxes
              plot={PLOT}
              x={scaleX}
              y={() => PLOT.bottom}
              xTicks={X_TICKS}
              grid={false}
              yAxis={false}
              xLabel="seconds of one elapsed hour"
            />
            {segments.map((segment) => (
              <g
                key={segment.key}
                data-series={segment.series}
                data-breakdown-segment={segment.title}
                data-share={segment.share}
              >
                {segment.key === 'jamClearing' ? (
                  <ConstraintHatch id={hatchId} x={segment.x} y={PLOT.top} width={segment.width} height={BAR_HEIGHT} />
                ) : (
                  <Bar
                    x={segment.x}
                    y={PLOT.top}
                    width={segment.width}
                    height={BAR_HEIGHT}
                    role={segment.key === 'productive' ? 'value' : 'reference'}
                  />
                )}
              </g>
            ))}
          </PlotStage>
        </FigureStage>
      }
      caption="Every failed pick takes human clearing time out of the hour, which lowers modeled output and lengthens payback."
      captionProps={{ id: captionId }}
      source="All seven defaults and slider ranges are authored assumptions; EVST’s guide supplies context, not exact inputs; none is a measured deployment result."
    />
  );
}
