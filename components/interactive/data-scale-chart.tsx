'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  COLLECTION_RATES,
  DEFAULT_RIGS,
  FRONTIER_HOURS,
  LLM_POINTS,
  MAX_RIGS,
  MIN_RIGS,
  OXE_SCALE_HOURS,
  ROBOT_POINTS,
  formatDuration,
  formatHours,
  formatRigs,
  hoursPerYear,
  rateById,
  yearsToTarget,
  type CollectionRateId,
} from '@/lib/data-scaling';
import { cx } from '@/lib/utils';

/**
 * DataScaleChart: robot demonstration hours against LLM pretraining tokens
 * on one log-log plane, plus a teleop-farm time projection.
 *
 * The two series hug their own axes: robot and human demonstration data sit
 * on the bottom lane read off the hours axis (DROID 350 h up to EgoScale
 * 20,854 h), language corpora sit on the left lane read off the tokens
 * axis (GPT-3 300B, Llama 3 15T). The dashed diagonal connects the two
 * largest entries across eight-plus orders of magnitude of empty plane; that
 * emptiness is the argument. No exchange rate between an hour and a token is
 * drawn, because no honest one exists.
 *
 * The teleop-farm slider projects a fleet's yearly throughput (signal-blue marker
 * and dashed vertical): a dedicated-farm assumption (1,000 productive hours
 * per rig-year, labeled as an assumption) or the measured DROID rate (350 h
 * from 50 collectors in 12 months, 7 h per collector-year). Readouts report
 * projected hours per year and the years to reach OXE scale (~10k h) and a
 * 100x-OXE frontier target (1M h).
 *
 * Interactive contract: deterministic initial render, native range input and
 * aria-pressed rate toggles (keyboard-accessible), visible monospace
 * readouts, reset control, fixed SVG viewport (no layout shift), no
 * JS-driven motion (scrub-only, so reduced-motion safe by construction).
 */

const WIDTH = 640;
const HEIGHT = 420;
const PLOT = { left: 72, right: 624, top: 24, bottom: 368 } as const;
const ROBOT_LANE_Y = 330;
const LLM_LANE_X = 104;

const HOURS_LOG_MIN = 0; // 10^0 = 1 h
const HOURS_LOG_MAX = 6; // 10^6 = 1M h
const TOKENS_LOG_MIN = 9; // 10^9
const TOKENS_LOG_MAX = 14; // 10^14

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function xFor(hours: number): number {
  const t =
    (Math.log10(hours) - HOURS_LOG_MIN) / (HOURS_LOG_MAX - HOURS_LOG_MIN);
  return f(PLOT.left + t * (PLOT.right - PLOT.left));
}

function yFor(tokens: number): number {
  const t =
    (Math.log10(tokens) - TOKENS_LOG_MIN) / (TOKENS_LOG_MAX - TOKENS_LOG_MIN);
  return f(PLOT.bottom - t * (PLOT.bottom - PLOT.top));
}

const SUPERSCRIPTS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
function sup(exp: number): string {
  return String(exp)
    .split('')
    .map((d) => SUPERSCRIPTS[Number(d)])
    .join('');
}

const X_TICK_EXPS = [0, 1, 2, 3, 4, 5, 6] as const;
const Y_TICK_EXPS = [9, 10, 11, 12, 13, 14] as const;

/**
 * Label tier per marker. Three tiers rather than a simple above/below
 * alternation because the 1,700-3,700 h cluster (TRI LBM, AgiBot World,
 * Ego4D) packs four markers into ~30 px of log space, closer than any two
 * labels are wide.
 */
const LABEL_TIER: Record<string, 0 | 1 | 2> = {
  droid: 0,
  agibot: 0,
  egoscale: 0,
  egodex: 1,
  ego4d: 1,
  'tri-lbm': 2,
  oxe: 2,
};
/** Label and value baseline offsets from the robot lane, per tier. */
const TIER_OFFSETS: Record<0 | 1 | 2, { label: number; value: number }> = {
  0: { label: 16, value: 27 },
  1: { label: -24, value: -13 },
  2: { label: -46, value: -35 },
};

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
  // useId-derived input id: this component legitimately renders twice on
  // one page (article prose plus a prediction-step figure), and a
  // hardcoded id would duplicate and cross-bind labels between the mounts.
  const rigsId = `${useId()}-rigs`;
  const descriptionId = `${useId()}-description`;
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
  const oxeYears = yearsToTarget(rigs, rateId, OXE_SCALE_HOURS);
  const frontierYears = yearsToTarget(rigs, rateId, FRONTIER_HOURS);

  const farmX = xFor(Math.max(perYear, 1));
  const farmLabelX = Math.min(Math.max(farmX, 190), 554);

  const robotMax = ROBOT_POINTS[ROBOT_POINTS.length - 1];
  const llmMax = LLM_POINTS[LLM_POINTS.length - 1];
  const gapFrom = { x: xFor(robotMax.magnitude), y: ROBOT_LANE_Y };
  const gapTo = { x: LLM_LANE_X, y: yFor(llmMax.magnitude) };
  const gapMid = { x: f((gapFrom.x + gapTo.x) / 2), y: f((gapFrom.y + gapTo.y) / 2) };
  const gapAngle = f(
    (Math.atan2(gapFrom.y - gapTo.y, gapFrom.x - gapTo.x) * 180) / Math.PI,
  );
  // Offset the gap label perpendicular to the diagonal so it sits in the
  // empty plane above the line, not on top of it.
  const gapLen = Math.hypot(gapFrom.x - gapTo.x, gapFrom.y - gapTo.y);
  const gapNormal = {
    x: f((gapFrom.y - gapTo.y) / gapLen),
    y: f(-(gapFrom.x - gapTo.x) / gapLen),
  };
  const gapLabel = {
    x: f(gapMid.x + gapNormal.x * 12),
    y: f(gapMid.y + gapNormal.y * 12),
  };
  const gapDecades = Math.round(Math.log10(llmMax.magnitude / robotMax.magnitude));

  function reset() {
    setRigs(defaultRigs);
    setRateId(defaultRate);
  }

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label
            htmlFor={rigsId}
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Teleoperation rigs
            <span className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text">
              {formatRigs(rigs)} rigs
            </span>
          </label>
          <input
            id={rigsId}
            type="range"
            min={MIN_RIGS}
            max={MAX_RIGS}
            step={1}
            value={rigs}
            onChange={(e) => setRigs(Number(e.target.value))}
            aria-label={`Teleoperation rigs, currently ${formatRigs(rigs)}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <button
          data-pagefind-ignore
          type="button"
          onClick={reset}
          className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
      </div>

      <div
        className="mt-3 flex flex-wrap gap-2"
        role="group"
        aria-label="Collection rate assumption"
      >
        {COLLECTION_RATES.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={rateId === r.id}
            onClick={() => setRateId(r.id)}
            className={cx(
              'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
              rateId === r.id
                ? 'border-accent text-text'
                : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
            )}
          >
            {r.label} ({r.hoursPerRigYear.toLocaleString('en-US')} h/rig/yr)
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs">
        <span className="text-text-dim">
          fleet:{' '}
          <span data-testid="rigs-readout" className="text-text">
            {formatRigs(rigs)}
          </span>
        </span>
        <span className="text-text-dim">
          throughput:{' '}
          <span data-testid="hours-readout" className="text-accent">
            {formatHours(perYear)}/yr
          </span>
        </span>
        <span className="text-text-dim">
          to OXE scale:{' '}
          <span data-testid="oxe-years-readout" className="text-text">
            {formatDuration(oxeYears)}
          </span>
        </span>
        <span className="text-text-dim">
          to 100x OXE:{' '}
          <span data-testid="frontier-years-readout" className="text-text">
            {formatDuration(frontierYears)}
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Demonstration hours against pretraining tokens, ${formatRigs(rigs)}-rig farm projection`}
        aria-describedby={descriptionId}
        className="mt-3 block w-full"
      >
        <text
          x={PLOT.left}
          y={12}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          LLM pretraining tokens (log)
        </text>
        {/* Horizontal gridlines and y tick labels (tokens). */}
        {Y_TICK_EXPS.map((exp) => (
          <g key={exp}>
            <line
              x1={PLOT.left}
              x2={PLOT.right}
              y1={yFor(10 ** exp)}
              y2={yFor(10 ** exp)}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              data-testid={`y-tick-${exp}`}
              x={PLOT.left - 8}
              y={f(yFor(10 ** exp) + 3)}
              textAnchor="end"
              fill="var(--color-text-dim)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {`10${sup(exp)}`}
            </text>
          </g>
        ))}
        {/* Vertical gridlines and x tick labels (hours). */}
        {X_TICK_EXPS.map((exp) => (
          <g key={exp}>
            <line
              x1={xFor(10 ** exp)}
              x2={xFor(10 ** exp)}
              y1={PLOT.top}
              y2={PLOT.bottom}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              data-testid={`x-tick-${exp}`}
              x={xFor(10 ** exp)}
              y={f(PLOT.bottom + 16)}
              textAnchor="middle"
              fill="var(--color-text-dim)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {`10${sup(exp)}`}
            </text>
          </g>
        ))}
        <text
          x={f((PLOT.left + PLOT.right) / 2)}
          y={HEIGHT - 10}
          textAnchor="middle"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          demonstration hours (log)
        </text>

        {/* Teleop-farm projection vertical, drawn first so dataset labels
            render on top of it where they cross. */}
        <line
          x1={farmX}
          x2={farmX}
          y1={PLOT.top}
          y2={ROBOT_LANE_Y}
          stroke="var(--color-accent)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />

        {/* The gap: dashed diagonal between the two largest entries. */}
        <line
          data-testid="gap-line"
          x1={gapFrom.x}
          y1={gapFrom.y}
          x2={gapTo.x}
          y2={gapTo.y}
          stroke="var(--color-border-strong)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <text
          x={gapLabel.x}
          y={gapLabel.y}
          textAnchor="middle"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
          transform={`rotate(${gapAngle} ${gapLabel.x} ${gapLabel.y})`}
        >
          {`${gapDecades} orders of magnitude apart`}
        </text>

        {/* LLM corpora on the left lane. */}
        {LLM_POINTS.map((p) => {
          const y = yFor(p.magnitude);
          return (
            <g key={p.id} data-testid={`llm-marker-${p.id}`}>
              <path
                d={`M ${LLM_LANE_X},${f(y - 6)} L ${f(LLM_LANE_X + 6)},${y} L ${LLM_LANE_X},${f(y + 6)} L ${f(LLM_LANE_X - 6)},${y} Z`}
                fill="var(--color-bg)"
                stroke="var(--color-text)"
                strokeWidth={1.5}
              />
              <text
                x={LLM_LANE_X + 14}
                y={f(y - 2)}
                fill="var(--color-text)"
                fontSize={10}
                fontFamily="var(--font-mono)"
              >
                {p.label}
              </text>
              <text
                x={LLM_LANE_X + 14}
                y={f(y + 10)}
                fill="var(--color-text-dim)"
                fontSize={9}
                fontFamily="var(--font-mono)"
              >
                {p.value}
              </text>
            </g>
          );
        })}

        {/* Robot and human datasets on the bottom lane. */}
        {ROBOT_POINTS.map((p) => {
          const x = xFor(p.magnitude);
          const offsets = TIER_OFFSETS[LABEL_TIER[p.id] ?? 0];
          return (
            <g key={p.id} data-testid={`robot-marker-${p.id}`}>
              <circle
                cx={x}
                cy={ROBOT_LANE_Y}
                r={5}
                fill={
                  p.kind === 'robot' ? 'var(--color-text)' : 'var(--color-bg)'
                }
                stroke="var(--color-text)"
                strokeWidth={1.5}
              />
              <text
                x={x}
                y={ROBOT_LANE_Y + offsets.label}
                textAnchor="middle"
                fill="var(--color-text)"
                fontSize={10}
                fontFamily="var(--font-mono)"
              >
                {p.label}
              </text>
              <text
                x={x}
                y={ROBOT_LANE_Y + offsets.value}
                textAnchor="middle"
                fill="var(--color-text-dim)"
                fontSize={9}
                fontFamily="var(--font-mono)"
              >
                {p.value}
              </text>
            </g>
          );
        })}

        {/* Farm marker and label, drawn last so nothing covers them. */}
        <circle
          data-testid="projection-marker"
          cx={farmX}
          cy={ROBOT_LANE_Y}
          r={6}
          fill="var(--color-accent)"
          stroke="var(--color-bg)"
          strokeWidth={1.5}
        />
        <text
          x={farmLabelX}
          y={f(PLOT.top + 10)}
          textAnchor="middle"
          fill="var(--color-accent)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {`your farm: ${formatHours(perYear)}/yr`}
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-text-dim">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: 'var(--color-text)' }}
          />
          robot data
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full border"
            style={{ borderColor: 'var(--color-text)' }}
          />
          human video
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rotate-45 border"
            style={{ borderColor: 'var(--color-text)' }}
          />
          LLM corpus
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: 'var(--color-accent)' }}
          />
          your farm
        </span>
        <span>~ = estimated hours, not a published count</span>
      </div>

      <p
        data-testid="projection-summary"
        className="mt-3 font-mono text-sm text-text"
        aria-live="polite"
      >
        <span className="text-text-dim">{formatRigs(rigs)} rigs:</span>{' '}
        <span className="text-accent">{formatHours(perYear)}/yr</span>{' '}
        <span className="text-text-dim">projected, OXE scale in</span>{' '}
        <span className="text-text">{formatDuration(oxeYears)}</span>
        <span className="text-text-dim">, 100x OXE in</span>{' '}
        <span className="text-text">{formatDuration(frontierYears)}</span>
      </p>
      <p
        data-testid="rate-explanation"
        className="mt-2 font-sans text-xs leading-relaxed text-text-dim"
      >
        {rate.note} Hours marked ~ are estimates; everything else is a
        published count from the cited source.
      </p>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="table"
        summary="Datasets and corpora by scale, with the farm projection"
        rowHeader="dataset"
        columns={[
          { header: 'demonstration hours', numeric: true },
          { header: 'pretraining tokens', numeric: true },
        ]}
        rows={[
          // A robot dataset has no token count and a language corpus has
          // no demonstration hours: the value is genuinely inapplicable
          // (the house "n/a", not a withheld "not disclosed").
          ...ROBOT_POINTS.map((p) => ({
            label: p.label,
            values: [p.value, 'n/a'] as Array<string>,
          })),
          ...LLM_POINTS.map((p) => ({
            label: p.label,
            values: ['n/a', p.value] as Array<string>,
          })),
          {
            label: `your farm (${formatRigs(rigs)} rigs)`,
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
            3), {gapDecades} orders of magnitude apart with no honest hour-to-token
            exchange rate between the lanes; your {formatRigs(rigs)}-rig farm at the{' '}
            {rate.label.toLowerCase()} rate projects {formatHours(perYear)} per year,
            reaching OXE scale in {formatDuration(oxeYears)} and 100x OXE in{' '}
            {formatDuration(frontierYears)}.
          </>
        }
      />
    </div>
  );
}
