'use client';

import { useId, useState } from 'react';
import {
  ANCHORS,
  BUDGET_SPEC,
  DATA_SOURCES,
  DEFAULT_PARAMS,
  FLEET_SPEC,
  OFFLINE_ONLY_ABOVE_HOURS,
  ON_POLICY_MAX_HOURS,
  ROBOT_STEPS_PER_SECOND,
  SIM_STEPS_PER_SECOND,
  computeLedger,
  formatDuration,
  formatRate,
  formatSteps,
  timeFraction,
  type LedgerParams,
  type SourceId,
} from '@/lib/sample-efficiency';
import { ChartDescription } from '@/components/ui';
import { CiteRef } from '@/components/mdx/cite-ref';
import { cx } from '@/lib/utils';

/**
 * Constant-rate budget illustration. The lanes and family bands are toy
 * outputs, not measured campaign times or algorithm-eligibility rules.
 * Paper anchors retain their original units, bounds and setup qualifiers.
 */

const WIDTH = 660;
const HEIGHT = 286;
const PAD_L = 14;
const PAD_R = 14;
const AXIS_Y = 254;
const ANCHOR_TOP = 26;
const ANCHOR_ROW_H = 13;
const LANE_TOP = 138;
const LANE_STEP = 34;

/** Round every rendered geometry value so SSR HTML and hydration agree. */
const f = (v: number) => Number(v.toFixed(2));

/** Approximate advance width of the 9.5px mono label face, per character. */
const LABEL_CHAR_PX = 5.4;

/**
 * Place a label beside its mark on whichever side it fits. A label that
 * would run past the right edge is drawn to the LEFT of the mark instead
 * of being clipped there, which is what a fixed clamp produced: the two
 * late anchors sit about three quarters along a log timeline, so there is
 * never room to their right for a forty-character label.
 */
function labelPlacement(
  markX: number,
  text: string,
): { x: number; anchor: 'start' | 'end' } {
  const fitsRight = markX + 5 + text.length * LABEL_CHAR_PX <= WIDTH - PAD_R;
  return fitsRight
    ? { x: markX + 5, anchor: 'start' }
    : { x: markX - 5, anchor: 'end' };
}

/** Decade ticks on the log timeline, in seconds, with reader-facing labels. */
const TICKS: ReadonlyArray<{ seconds: number; label: string }> = [
  { seconds: 1, label: '1 s' },
  { seconds: 60, label: '1 min' },
  { seconds: 3600, label: '1 h' },
  { seconds: 86_400, label: '1 d' },
  { seconds: 604_800, label: '1 wk' },
  { seconds: 2_592_000, label: '30 d' },
  { seconds: 31_557_600, label: '1 yr' },
  { seconds: 315_576_000, label: '10 yr' },
];

export function SampleEfficiencyLedger({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const [params, setParams] = useState<LedgerParams>(DEFAULT_PARAMS);

  const ledger = computeLedger(params);
  const plotW = WIDTH - PAD_L - PAD_R;
  const x = (seconds: number) => PAD_L + timeFraction(seconds) * plotW;

  const setParam = <K extends keyof LedgerParams>(key: K, value: LedgerParams[K]) =>
    setParams((p) => ({ ...p, [key]: value }));
  const reset = () => setParams(DEFAULT_PARAMS);

  const verdictTone =
    ledger.selected.verdict.family === 'on-policy'
      ? 'text-accent'
      : ledger.selected.verdict.family === 'off-policy'
        ? 'text-warn'
        : 'text-err';

  const buttonBase =
    'rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-sans text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]';

  // One row per anchor, ordered along the timeline, so no two labels can
  // overlap regardless of how close their marks sit. Cheaper and more
  // legible than packing them and hoping the widths cooperate.
  const anchorsByTime = [...ANCHORS].sort((a, b) => a.seconds - b.seconds);
  const anchorRow = (i: number) => ANCHOR_TOP + i * ANCHOR_ROW_H;

  return (
    <div
      data-testid="sample-efficiency"
      data-brand-surface-id="surface:flat"
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div>
        <label
          htmlFor={`${uid}-budget`}
          className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
        >
          environment-step budget
          <span
            className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text"
            data-testid="sample-budget-value"
          >
            {formatSteps(ledger.budgetSteps)} steps
          </span>
        </label>
        <input
          id={`${uid}-budget`}
          type="range"
          data-brand-control-id="control:input"
          min={BUDGET_SPEC.min}
          max={BUDGET_SPEC.max}
          step={BUDGET_SPEC.step}
          value={params.budgetExponent}
          onChange={(e) => setParam('budgetExponent', Number(e.target.value))}
          aria-label={`Environment-step budget, currently ${formatSteps(ledger.budgetSteps)} steps`}
          data-testid="sample-budget-slider"
          className="mt-2 w-full accent-accent"
        />
      </div>

      <fieldset className="mt-4 border-0 p-0">
        <legend className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim">
          where the steps come from
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {DATA_SOURCES.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-start gap-2 font-sans text-xs text-text"
            >
              <input
                type="radio"
                data-brand-control-id="control:selection"
                name={`${uid}-source`}
                value={option.id}
                checked={params.source === option.id}
                onChange={() => setParam('source', option.id as SourceId)}
                aria-label={option.label}
                data-testid={`sample-source-${option.id}`}
                className="mt-0.5 accent-accent"
              />
              <span>
                {option.label}
                <span className="block text-[11px] leading-snug text-text-dim">
                  {formatRate(
                    option.id === 'fleet'
                      ? ROBOT_STEPS_PER_SECOND * params.fleetSize
                      : option.id === 'sim'
                        ? SIM_STEPS_PER_SECOND
                        : ROBOT_STEPS_PER_SECOND,
                  )}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4">
        <label
          htmlFor={`${uid}-fleet`}
          className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
        >
          robots in the fleet
          <span
            className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text"
            data-testid="sample-fleet-value"
          >
            {params.fleetSize}
          </span>
        </label>
        <input
          id={`${uid}-fleet`}
          type="range"
          data-brand-control-id="control:input"
          min={FLEET_SPEC.min}
          max={FLEET_SPEC.max}
          step={FLEET_SPEC.step}
          value={params.fleetSize}
          onChange={(e) => setParam('fleetSize', Number(e.target.value))}
          aria-label={`Robots in the fleet, currently ${params.fleetSize}`}
          data-testid="sample-fleet-slider"
          className="mt-2 w-full accent-accent"
        />
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Modelled wall-clock time for ${formatSteps(ledger.budgetSteps)} environment steps under constant-rate assumptions. Paper anchors include different units, bounds and approximate durations, not matched benchmark runs. Selected model: ${ledger.selected.label} at ${formatDuration(ledger.selected.seconds)}.`}
        aria-describedby={descriptionId}
        data-testid="sample-chart"
        className="mt-4 block w-full"
      >
        {/* The on-policy band, left of the one-hour line, and the
            offline-only band past one month. */}
        <rect
          x={PAD_L}
          y={LANE_TOP - 8}
          width={f(x(ON_POLICY_MAX_HOURS * 3600) - PAD_L)}
          height={f(AXIS_Y - LANE_TOP + 8)}
          fill="var(--color-accent)"
          opacity={0.09}
        />
        <rect
          x={f(x(OFFLINE_ONLY_ABOVE_HOURS * 3600))}
          y={LANE_TOP - 8}
          width={f(WIDTH - PAD_R - x(OFFLINE_ONLY_ABOVE_HOURS * 3600))}
          height={f(AXIS_Y - LANE_TOP + 8)}
          fill="var(--color-err)"
          fillOpacity={0.08}
          stroke="var(--color-err)"
          strokeWidth={1}
          strokeDasharray="5 3"
        />
        <text
          x={f(x(OFFLINE_ONLY_ABOVE_HOURS * 3600) + 6)}
          y={LANE_TOP + 4}
          fill="var(--color-err)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          toy offline band
        </text>

        {/* Paper anchors: numeric placement with original units and bounds in labels/caption. */}
        {anchorsByTime.map((anchor, i) => {
          const markX = x(anchor.seconds);
          const placement = labelPlacement(markX, anchor.label);
          return (
            <g key={anchor.id}>
              <line
                x1={f(markX)}
                y1={f(anchorRow(i) + 3)}
                x2={f(markX)}
                y2={AXIS_Y}
                stroke="var(--color-border-strong)"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              <circle
                cx={f(markX)}
                cy={f(anchorRow(i))}
                r={2.5}
                fill="var(--color-text-dim)"
              />
              <text
                data-testid={`sample-anchor-${anchor.id}`}
                x={f(placement.x)}
                y={f(anchorRow(i) + 3.5)}
                textAnchor={placement.anchor}
                fill="var(--color-text-dim)"
                fontSize={9.5}
                fontFamily="var(--font-mono)"
              >
                {anchor.label}
              </text>
            </g>
          );
        })}

        <text
          data-testid="sample-measured-label"
          x={PAD_L}
          y={12}
          fill="var(--color-text-dim)"
          fontSize={9.5}
          fontFamily="var(--font-mono)"
        >
          paper-reported durations and bounds
        </text>

        {/* One lane per source: a bar from 1 s to the converted wall-clock. */}
        {ledger.rows.map((row, i) => {
          const y = LANE_TOP + i * LANE_STEP;
          const isSelected = row.id === params.source;
          const end = x(row.seconds);
          const label = `${formatDuration(row.seconds)} ${row.label}`;
          return (
            <g key={row.id}>
              {/* Label above its own bar, left-aligned. Chasing the bar's
                  tip puts it wherever the log axis happens to end, which
                  either overlaps the next lane or falls off the right
                  edge; sitting on the bar makes both illegible. */}
              <text
                x={PAD_L}
                y={f(y + 8)}
                textAnchor="start"
                fill={isSelected ? 'var(--color-text)' : 'var(--color-text-dim)'}
                fontSize={10}
                fontFamily="var(--font-mono)"
              >
                {label}
              </text>
              <rect
                data-testid={`sample-lane-${row.id}`}
                x={PAD_L}
                y={f(y + 13)}
                width={f(Math.max(end - PAD_L, 2))}
                height={10}
                fill={
                  isSelected
                    ? 'var(--color-accent)'
                    : 'var(--color-border-strong)'
                }
                opacity={isSelected ? 1 : 0.55}
              />
            </g>
          );
        })}

        <text
          data-testid="sample-modelled-label"
          x={PAD_L}
          y={f(LANE_TOP - 12)}
          fill="var(--color-text-dim)"
          fontSize={9.5}
          fontFamily="var(--font-mono)"
        >
          modelled conversions at a constant rate, not measured
        </text>

        <line
          x1={PAD_L}
          y1={AXIS_Y}
          x2={WIDTH - PAD_R}
          y2={AXIS_Y}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        {TICKS.map((tick, i) => (
          <g key={tick.label}>
            <line
              x1={f(x(tick.seconds))}
              y1={AXIS_Y}
              x2={f(x(tick.seconds))}
              y2={AXIS_Y + 4}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={f(x(tick.seconds))}
              y={AXIS_Y + 16}
              textAnchor={i === 0 ? 'start' : i === TICKS.length - 1 ? 'end' : 'middle'}
              fill="var(--color-text-dim)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {tick.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          data-brand-control-id="control:secondary-action"
          data-pagefind-ignore
          type="button"
          onClick={reset}
          aria-label="Reset the budget and data source to their opening values"
          className={buttonBase}
        >
          Reset
        </button>
      </div>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">model wall clock</span>{' '}
        <span data-testid="sample-wallclock-readout" className="text-text">
          {formatDuration(ledger.selected.seconds)}
        </span>{' '}
        <span className="text-text-dim">slower than sim</span>{' '}
        <span data-testid="sample-slowdown-readout" className="text-text">
          {ledger.slowdownVsSim < 10
            ? `${ledger.slowdownVsSim.toFixed(1)}x`
            : `${Math.round(ledger.slowdownVsSim).toLocaleString('en-US')}x`}
        </span>{' '}
        <span className="text-text-dim">toy band</span>{' '}
        <span data-testid="sample-verdict-readout" className={verdictTone}>
          {ledger.selected.verdict.label}
        </span>
      </p>

      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        <span data-testid="sample-provenance-note">
          In this toy, {formatSteps(ledger.budgetSteps)} steps through{' '}
          {ledger.selected.label} at{' '}
          {formatRate(ledger.selected.stepsPerSecond)} takes{' '}
          {formatDuration(ledger.selected.seconds)}. Illustration: {' '}
          {ledger.selected.verdict.exemplars}.
        </span>
      </p>

      <p
        data-testid="sample-simplification-label"
        className="mt-2 font-sans text-xs leading-relaxed text-text-dim"
      >
        What is modelled rather than measured: the three lanes use constant
        illustrative rates. The simulation constant is 122,880 steps/s,
        computed at Rudin&apos;s 1,200-second boundary; the reported run
        implies a strictly greater end-to-end average, not an exact measured
        rate of 122,880. The single-robot constant is approximately 22.2
        steps/s from Minitaur&apos;s whole training process, not its rollout
        control rate. Neither constant predicts arbitrary tasks or robots.
        Fleet scaling assumes perfect parallelism. QT-Opt&apos;s evaluation
        protocol allows up to 20 steps per grasp attempt; that cap is not a
        measured mean and does not establish a campaign step rate from
        grasp totals and robot-hours. No QT-Opt steps-per-robot-second value
        is presented here as measured. Robot-hours are not parallel wall time.
        The one-hour and {OFFLINE_ONLY_ABOVE_HOURS}-hour boundaries are
        editorial thresholds for this toy, not scientific algorithm-eligibility
        limits. The bands do not rule algorithms in or out.
      </p>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="table"
        summary="Modelled wall-clock cost of this budget under each source"
        rowHeader="data source"
        columns={[
          { header: 'model steps/s', numeric: true },
          { header: 'model wall clock', numeric: true },
          { header: 'toy band' },
        ]}
        rows={ledger.rows.map((row) => ({
          label: row.label,
          values: [
            formatRate(row.stepsPerSecond),
            formatDuration(row.seconds),
            row.verdict.label,
          ],
        }))}
        description={`In the constant-rate toy, ${formatSteps(ledger.budgetSteps)} environment steps take ${formatDuration(ledger.rows[0]!.seconds)} of model wall clock in massively parallel simulation, ${formatDuration(ledger.rows[1]!.seconds)} on one robot and ${formatDuration(ledger.rows[2]!.seconds)} on a fleet of ${params.fleetSize}. The single-robot-to-simulation duration ratio is ${Math.round(SIM_STEPS_PER_SECOND / ROBOT_STEPS_PER_SECOND).toLocaleString('en-US')}. Their toy bands are ${ledger.rows[0]!.verdict.family}, ${ledger.rows[1]!.verdict.family} and ${ledger.rows[2]!.verdict.family}; these are editorial categories, not algorithm eligibility.`}
      />

      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        Paper-reported durations, with different settings and units: Rudin
        reports ANYmal flat-terrain training in under four minutes and uneven
        terrain in twenty minutes on one workstation GPU. The separately
        described simulation/deployment policy used 4,096 environments,
        98,304 samples per update and 1,500 updates in under twenty minutes
        on an i9-11900k CPU and RTX A6000 GPU <CiteRef id="rudin-2021" />;
        DayDreamer reports one A1 run learning to roll over, stand and walk
        in one hour without a simulator, with physical interventions at the
        training-area boundary that preserved joint configuration and
        orientation <CiteRef id="daydreamer-2022" />; Minitaur walking
        required 160,000 control steps over about two hours of whole-process
        training time <CiteRef id="haarnoja-walk-2019" />; QT-Opt reports
        a 580,000-grasp off-policy dataset from seven robots over about
        800 robot hours, separate from approximately 28,000 additional
        on-policy fine-tuning grasps <CiteRef id="qt-opt-2018" />; and
        section 5.2 of Levine&apos;s 2016 preprint reports about 800,000
        grasp attempts over two months using 6–14 robots. Its abstract says
        “over 800,000” and its introduction says “several months”
        <CiteRef id="levine-hand-eye-2016" />. Robot-hours are not parallel
        wall time. Bounds and approximate durations are plotted at their
        stated numeric anchors; two months is drawn as 60 days for placement,
        not as a measured elapsed-time conversion. These are not matched
        benchmarks. Keep the modelled budget fixed while switching sources
        or changing fleet size to inspect the toy assumptions.
      </p>
    </div>
  );
}
