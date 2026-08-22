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
  QT_OPT_STEPS_PER_ROBOT_SECOND,
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
 * SampleEfficiencyLedger: one environment-step budget, converted into
 * wall-clock time under three samplers, on one shared log timeline.
 *
 * The teaching move is the source selector rather than the budget slider.
 * A budget that is minutes of GPU simulation is months or years of a real
 * robot's life, and the verdict readout names what that costs: below the
 * feasibility line the on-policy family is simply unavailable, whatever
 * its other merits. Sample efficiency is a constraint on which algorithms
 * exist for you, and the reader derives that by switching sources.
 *
 * Honesty of the drawing, per the house precedent set by
 * training-time-chart and control-loop-budget: the anchor marks are
 * measured figures from papers, each with a visible label and a citation
 * chip in the caption. The three source lanes are MODELLED conversions of
 * one rate, labelled as such on the chart itself, because a constant rate
 * is an idealisation of every campaign in the anchor set.
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
    'rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]';

  // One row per anchor, ordered along the timeline, so no two labels can
  // overlap regardless of how close their marks sit. Cheaper and more
  // legible than packing them and hoping the widths cooperate.
  const anchorsByTime = [...ANCHORS].sort((a, b) => a.seconds - b.seconds);
  const anchorRow = (i: number) => ANCHOR_TOP + i * ANCHOR_ROW_H;

  return (
    <div
      data-testid="sample-efficiency"
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
        aria-label={`Wall-clock time to spend ${formatSteps(ledger.budgetSteps)} environment steps under each data source, on a shared logarithmic timeline against measured anchor runs. Selected source: ${ledger.selected.label} at ${formatDuration(ledger.selected.seconds)}.`}
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
          opacity={0.08}
        />

        {/* Measured anchors: a tick down from the top plus a visible label. */}
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
          measured runs, from the papers
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
        <span className="text-text-dim">wall clock</span>{' '}
        <span data-testid="sample-wallclock-readout" className="text-text">
          {formatDuration(ledger.selected.seconds)}
        </span>{' '}
        <span className="text-text-dim">slower than sim</span>{' '}
        <span data-testid="sample-slowdown-readout" className="text-text">
          {ledger.slowdownVsSim < 10
            ? `${ledger.slowdownVsSim.toFixed(1)}x`
            : `${Math.round(ledger.slowdownVsSim).toLocaleString('en-US')}x`}
        </span>{' '}
        <span className="text-text-dim">verdict</span>{' '}
        <span data-testid="sample-verdict-readout" className={verdictTone}>
          {ledger.selected.verdict.label}
        </span>
      </p>

      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        <span data-testid="sample-provenance-note">
          Spending {formatSteps(ledger.budgetSteps)} steps through{' '}
          {ledger.selected.label} at{' '}
          {formatRate(ledger.selected.stepsPerSecond)} takes{' '}
          {formatDuration(ledger.selected.seconds)}, which admits{' '}
          {ledger.selected.verdict.exemplars}.
        </span>
      </p>

      <p
        data-testid="sample-simplification-label"
        className="mt-2 font-sans text-xs leading-relaxed text-text-dim"
      >
        What is modelled rather than measured, stated rather than hidden:
        the anchor marks along the top are wall-clock figures the papers
        report, but the three lanes are conversions of one constant
        collection rate per source, so anything between two anchors is the
        model talking, not a measurement. Fleet scaling is the most
        optimistic part of it. Multiplying one robot&apos;s rate by N assumes
        perfect parallelism, and the largest real campaign in the anchor
        set ran at about {QT_OPT_STEPS_PER_ROBOT_SECOND.toFixed(1)} steps
        per robot-second against the{' '}
        {Math.round(ROBOT_STEPS_PER_SECOND)} steps per second the
        single-robot lane uses, because episodic grasping carries reset and
        handling overhead that continuous walking does not. The two verdict
        boundaries, one hour and{' '}
        {OFFLINE_ONLY_ABOVE_HOURS} hours, are editorial thresholds drawn
        from what the literature actually attempted, not results.
      </p>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="table"
        summary="Wall-clock cost of this budget under each source"
        rowHeader="data source"
        columns={[
          { header: 'steps/s', numeric: true },
          { header: 'wall clock', numeric: true },
          { header: 'admits' },
        ]}
        rows={ledger.rows.map((row) => ({
          label: row.label,
          values: [
            formatRate(row.stepsPerSecond),
            formatDuration(row.seconds),
            row.verdict.label,
          ],
        }))}
        description={`A budget of ${formatSteps(ledger.budgetSteps)} environment steps costs ${formatDuration(ledger.rows[0]!.seconds)} of wall clock in massively parallel simulation and ${formatDuration(ledger.rows[1]!.seconds)} on a single real robot, a factor of ${Math.round(SIM_STEPS_PER_SECOND / ROBOT_STEPS_PER_SECOND).toLocaleString('en-US')} apart at every budget, so the experiment the simulator runs in the ${ledger.rows[0]!.verdict.family} regime leaves the hardware in the ${ledger.rows[1]!.verdict.family} regime instead; a fleet of ${params.fleetSize} robots lands at ${formatDuration(ledger.rows[2]!.seconds)}, still ${ledger.rows[2]!.verdict.family}.`}
      />

      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        Anchors, left to right: ANYmal flat terrain in under four minutes
        and uneven terrain in twenty, both at 4,096 parallel environments on
        one workstation GPU <CiteRef id="rudin-2021" />; an A1 quadruped
        learning to roll over, stand and walk in one hour of real-world
        training with no simulator and no resets{' '}
        <CiteRef id="daydreamer-2022" />; a Minitaur learning to walk from
        160,000 control steps, about two hours of real-world time{' '}
        <CiteRef id="haarnoja-walk-2019" />; QT-Opt&apos;s 580,000 grasp
        attempts across seven robots in about 800 robot hours{' '}
        <CiteRef id="qt-opt-2018" />; and 800,000 grasps collected over two
        months on between 6 and 14 arms{' '}
        <CiteRef id="levine-hand-eye-2018" />. Worth trying: park the budget
        where the simulation lane sits inside the first hour, then switch to
        a single real robot and watch the same experiment cross into years.
        Then raise the fleet to 100 and see how little of that it buys back.
      </p>
    </div>
  );
}
