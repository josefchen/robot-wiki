'use client';

import { useId, useState } from 'react';
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
import { cx } from '@/lib/utils';

/**
 * DeploymentEconomics: the payback calculator for a robotic pick cell.
 *
 * Seven controls (robot cost, integration multiple, cycle time, uptime,
 * per-pick success, jam-clearing time, displaced wage) drive cost per
 * pick, payback in months, an explicit where-the-hour-goes breakdown, and
 * a verdict readout against the buyer's horizon. Pure arithmetic lives in
 * lib/deployment-economics.ts; this component only renders it.
 *
 * Interactive contract: typed props, deterministic render, visible
 * numeric readouts, reset control, keyboard-accessible native sliders, no
 * auto-playing motion, no layout shift (fixed-height breakdown bars).
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
    note: 'Assumption: list price for a mid-range industrial arm; EVST places arm prices at $25k-$80k.',
  },
  {
    key: 'integrationMultiple',
    label: 'Integration multiple',
    format: (v) => `${v.toFixed(1)}x`,
    note: 'Sourced: EVST guides quote complete cells at 2-3x the arm price, robot a third to half of total.',
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

export function DeploymentEconomics({ className }: DeploymentEconomicsProps) {
  const uid = useId();
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

  const breakdownTotal =
    out.timeBreakdown.productive +
    out.timeBreakdown.jamClearing +
    out.timeBreakdown.downtime;
  const pct = (v: number) =>
    breakdownTotal > 0 ? `${((v / breakdownTotal) * 100).toFixed(1)}%` : '0%';

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-medium text-text">Cell economics calculator</p>
        <button
          data-pagefind-ignore
          type="button"
          onClick={reset}
          className="rounded-sm bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {CONTROLS.map(({ key, label, format, note }) => {
          const id = `${uid}-${key}`;
          const range = INPUT_RANGES[key];
          const value = inputs[key];
          return (
            <div key={key}>
              <label
                htmlFor={id}
                className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
              >
                {label}
                <span className="font-mono text-xs normal-case tracking-normal text-text">
                  {format(value)}
                </span>
              </label>
              <input
                id={id}
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={value}
                onChange={(e) => set(key, Number(e.target.value))}
                aria-label={`${label}, currently ${format(value)}`}
                className="mt-2 w-full accent-accent"
              />
              <p className="mt-1 text-[11px] leading-snug text-text-dim">{note}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
        <div>
          <p className="text-[13px] font-medium text-text-dim">Cost per pick</p>
          <p className="mt-1 font-mono text-sm text-text">
            <span data-testid="cost-per-pick">
              {out.costPerPickUsd.toFixed(3)}
            </span>{' '}
            <span className="text-text-dim">
              USD over {AMORTIZATION_MONTHS / 12} yr
            </span>
          </p>
        </div>
        <div>
          <p className="text-[13px] font-medium text-text-dim">Payback</p>
          <p className="mt-1 font-mono text-sm text-text">
            <span data-testid="payback-months" className="text-accent">
              {paybackText}
            </span>
          </p>
        </div>
        <div>
          <p className="text-[13px] font-medium text-text-dim">Verdict</p>
          <p
            data-testid="payback-verdict"
            className="mt-1 font-mono text-sm"
            aria-live="polite"
          >
            {verdictPass ? (
              <span className="text-accent">
                Pays back inside {PAYBACK_TARGET_MONTHS} months
              </span>
            ) : (
              <span className="text-text">
                Outside a {PAYBACK_TARGET_MONTHS}-month horizon
              </span>
            )}
          </p>
        </div>
        <div className="sm:col-span-3">
          <p className="text-[11px] leading-snug text-text-dim">
            Cell cost {formatMoney(out.totalCellCost)};{' '}
            {out.netPicksPerHour.toFixed(0)} good picks per up-hour and{' '}
            {out.monthlyPicks.toLocaleString('en-US', { maximumFractionDigits: 0 })}{' '}
            per {ROBOT_HOURS_PER_MONTH}-hour month; jam rate{' '}
            {out.jamRatePercent.toFixed(2)}%. All seven defaults are
            assumptions or vendor-guide figures, labelled under each slider;
            none is a measured deployment result.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[13px] font-medium text-text-dim">
          Where each elapsed hour goes
        </p>
        {/* Fixed-height stacked bar: the three shares always fill the same
            box, so dragging a control never shifts layout. */}
        <div
          data-testid="time-breakdown"
          className="mt-2 flex h-8 w-full overflow-hidden rounded-sm border border-border"
          role="img"
          aria-label={`Time breakdown per elapsed hour: ${pct(
            out.timeBreakdown.productive,
          )} productive cycles, ${pct(
            out.timeBreakdown.jamClearing,
          )} jam clearing, ${pct(out.timeBreakdown.downtime)} downtime`}
        >
          <div
            className="bg-accent/80"
            style={{ width: pct(out.timeBreakdown.productive) }}
            title="Productive cycles"
          />
          <div
            className="bg-accent/40"
            style={{ width: pct(out.timeBreakdown.jamClearing) }}
            title="Jam clearing"
          />
          <div
            className="bg-border-strong"
            style={{ width: pct(out.timeBreakdown.downtime) }}
            title="Downtime"
          />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[11px] text-text-dim">
          <span data-testid="breakdown-productive">
            productive {out.timeBreakdown.productive.toFixed(0)} s
          </span>
          <span data-testid="breakdown-jams">
            jam clearing {out.timeBreakdown.jamClearing.toFixed(0)} s
          </span>
          <span data-testid="breakdown-downtime">
            downtime {out.timeBreakdown.downtime.toFixed(0)} s
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-text-dim">
          One elapsed hour is {SECONDS_PER_HOUR} seconds; the three shares
          sum to it at every control setting.
        </p>
      </div>
    </div>
  );
}
