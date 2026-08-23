'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui';
import { citationLabel, getCitation } from '@/data/citations';
import {
  HIERARCHY_SYSTEMS,
  HORIZON_MS,
  displayTicks,
  fastestLane,
  laneTickRatio,
  lastUpdateAt,
  slowestPeriodicLane,
  updateCountAt,
  type TimescaleSystem,
} from '@/lib/hierarchy-timescales';
import { cx } from '@/lib/utils';

/**
 * HierarchyTimescales: one horizontal wall-clock timeline per system, with
 * one lane per level of its control hierarchy. A scrub slider moves a
 * playhead across 2 seconds; each lane lights the updates that have fired
 * by then, so the reader sees how many times the selected system's own
 * fastest lane ticks per update of its slowest periodic lane. System
 * overlays (pi0.5, Gemini Robotics 1.5, Helix 02, GO-2) swap the lane
 * structure so the same pattern can be compared across four 2025-2026
 * stacks.
 *
 * Rates marked "schematic" are not in the primary source; the lane exists
 * because the architectural split is disclosed, but the rate is our
 * rendering choice and is labeled as such.
 *
 * Interactive contract: deterministic render, native range slider (keyboard
 * arrows step the playhead), visible numeric readouts, system selector +
 * reset controls, dynamic SVG height only across system switches (all
 * systems currently have four lanes, so no layout shift), no auto-playing
 * motion.
 */
type HierarchyTimescalesProps = {
  /** Initially selected system id. Default 'pi05'. */
  defaultSystem?: string;
  className?: string;
};

const WIDTH = 720;
const LABEL_GUTTER = 176;
const RIGHT_PAD = 12;
const TOP_PAD = 8;
const LANE_HEIGHT = 34;
const AXIS_AREA = 22;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function x(tMs: number): number {
  const span = WIDTH - LABEL_GUTTER - RIGHT_PAD;
  return f(LABEL_GUTTER + (tMs / HORIZON_MS) * span);
}

function laneCenterY(index: number): number {
  return TOP_PAD + index * LANE_HEIGHT + LANE_HEIGHT / 2;
}

export function HierarchyTimescales({
  defaultSystem = 'pi05',
  className,
}: HierarchyTimescalesProps) {
  const descriptionId = `${useId()}-description`;
  const [systemId, setSystemId] = useState(defaultSystem);
  const [playhead, setPlayhead] = useState(0);

  const system: TimescaleSystem =
    HIERARCHY_SYSTEMS.find((s) => s.id === systemId) ?? HIERARCHY_SYSTEMS[0];
  const citation = getCitation(system.citationId);
  const height = TOP_PAD + system.lanes.length * LANE_HEIGHT + AXIS_AREA;
  const updatesFired = system.lanes.reduce(
    (n, lane) => n + updateCountAt(lane, playhead),
    0,
  );
  // The trailing clause is derived from the selected system's own lanes:
  // its real fastest lane, its real slowest periodic lane, and the ratio
  // between them. Never a fixed sentence, which is how the old copy
  // claimed a 1 kHz lane on systems that have none.
  const fastest = fastestLane(system);
  const slowest = slowestPeriodicLane(system);
  const ratio = laneTickRatio(system);
  const ratioText = Number.isInteger(ratio) ? String(ratio) : ratio.toFixed(1);

  function reset() {
    setSystemId(defaultSystem);
    setPlayhead(0);
  }

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div
        role="group"
        aria-label="Select a system overlay"
        className="flex flex-wrap items-center gap-1.5"
      >
        {HIERARCHY_SYSTEMS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={s.id === system.id}
            onClick={() => setSystemId(s.id)}
            className={cx(
              'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
              s.id === system.id
                ? 'border-accent text-text'
                : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
            )}
          >
            {s.name}
          </button>
        ))}
        <button
          data-pagefind-ignore
          type="button"
          onClick={reset}
          className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
        <span className="ml-auto font-mono text-[10px] text-text-dim">
          {system.org}
        </span>
      </div>

      <div className="mt-3">
        <label
          htmlFor="hierarchy-playhead"
          className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
        >
          Playhead
          <span
            data-testid="playhead-readout"
            aria-live="polite"
            className="font-mono text-xs normal-case tracking-normal text-text"
          >
            t = {playhead} ms
          </span>
        </label>
        <input
          id="hierarchy-playhead"
          type="range"
          min={0}
          max={HORIZON_MS}
          step={20}
          value={playhead}
          aria-label={`Playhead position in milliseconds, currently ${playhead}`}
          aria-valuetext={`${playhead} milliseconds`}
          onChange={(e) => setPlayhead(Number(e.target.value))}
          className="mt-2 w-full accent-accent"
        />
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={`Timescale lanes for ${system.name} by ${system.org}. Four lanes run at different rates from a single task instruction down to motor commands. The playhead is at ${playhead} of ${HORIZON_MS} milliseconds; lanes light up only when their own update rate has elapsed.`}
        aria-describedby={descriptionId}
        className="mt-2 block w-full"
      >
        {/* Lane baselines, labels, and update ticks. */}
        {system.lanes.map((lane, i) => {
          const cy = laneCenterY(i);
          const ticks = displayTicks(lane);
          return (
            <g key={lane.id}>
              <text
                x={LABEL_GUTTER - 8}
                y={cy - 2}
                textAnchor="end"
                fill="var(--color-text)"
                fontSize={10}
                fontFamily="var(--font-mono)"
              >
                {lane.label}
              </text>
              <text
                x={LABEL_GUTTER - 8}
                y={cy + 9}
                textAnchor="end"
                fill={
                  lane.disclosed
                    ? 'var(--color-text-dim)'
                    : 'var(--color-warn)'
                }
                fontSize={9}
                fontFamily="var(--font-mono)"
              >
                {lane.disclosed ? lane.rate : `${lane.rate} (schematic)`}
              </text>
              <line
                x1={LABEL_GUTTER}
                x2={WIDTH - RIGHT_PAD}
                y1={cy}
                y2={cy}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              {ticks.map((t) => (
                <line
                  key={t}
                  x1={x(t)}
                  x2={x(t)}
                  y1={cy - 5}
                  y2={cy + 5}
                  stroke={
                    t <= playhead
                      ? 'var(--color-accent)'
                      : 'var(--color-border-strong)'
                  }
                  strokeWidth={t <= playhead ? 2 : 1}
                />
              ))}
            </g>
          );
        })}

        {/* Playhead */}
        <line
          x1={x(playhead)}
          x2={x(playhead)}
          y1={TOP_PAD}
          y2={TOP_PAD + system.lanes.length * LANE_HEIGHT}
          stroke="var(--color-accent)"
          strokeWidth={1.5}
        />

        {/* Time axis labels. Rightmost label anchors end so the viewBox
            never clips it. */}
        {[0, 500, 1000, 1500, HORIZON_MS].map((t) => (
          <text
            key={t}
            x={x(t)}
            y={height - 6}
            textAnchor={t === HORIZON_MS ? 'end' : t === 0 ? 'start' : 'middle'}
            fill="var(--color-text-dim)"
            fontSize={9}
            fontFamily="var(--font-mono)"
          >
            {t === 0 ? '0 ms' : t === HORIZON_MS ? '2000 ms' : `${t}`}
          </text>
        ))}
      </svg>

      <p className="mt-1 font-mono text-[10px] text-text-dim">
        blue ticks: updates fired at or before the playhead. dim ticks:
        pending. Rates tagged (schematic) are not stated in the primary
        source.
      </p>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="state"
        summary="Current timescale playhead"
        description={`${system.name} by ${system.org} at playhead ${playhead} ms of ${HORIZON_MS} ms has ${system.lanes.length} timescale lanes with ${updatesFired} ${updatesFired === 1 ? 'update' : 'updates'} fired; the ${fastest.rate}${fastest.disclosed ? '' : ' (schematic)'} ${fastest.label} lane ticks ${ratioText} times${fastest.disclosed && slowest.disclosed ? '' : ' (schematic)'} per ${slowest.rate}${slowest.disclosed ? '' : ' (schematic)'} ${slowest.label} update.`}
        states={[
          { label: 'system', value: system.name },
          { label: 'playhead', value: `${playhead} ms` },
          { label: 'lanes', value: String(system.lanes.length) },
          { label: 'updates fired', value: String(updatesFired) },
        ]}
      />

      <ul className="mt-3 divide-y divide-border">
        {system.lanes.map((lane) => {
          const last = lastUpdateAt(lane, playhead);
          const count = updateCountAt(lane, playhead);
          return (
            <li
              key={lane.id}
              data-testid={`lane-row-${lane.id}`}
              className="py-2"
            >
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-mono text-xs text-text">
                  {lane.label}
                </span>
                <span className="font-mono text-[10px] text-text-dim">
                  {lane.rate}
                </span>
                {!lane.disclosed && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-warn">
                    schematic
                  </span>
                )}
                <span className="ml-auto font-mono text-xs text-text-dim">
                  {last === null ? (
                    'waiting for first update'
                  ) : (
                    <>
                      <span className="text-text">{count}</span>
                      {count === 1 ? ' update' : ' updates'}, last update:{' '}
                      <span className="text-accent">{last} ms</span>
                    </>
                  )}
                </span>
              </div>
              <p className="mt-0.5 font-sans text-xs leading-relaxed text-text-dim">
                {lane.note}
              </p>
            </li>
          );
        })}
      </ul>

      <div
        data-testid="system-detail"
        className="mt-3 rounded-sm border border-border bg-surface-2 px-3 py-2.5"
      >
        <p className="font-sans text-xs leading-relaxed text-text">
          {system.pattern}
        </p>
        {citation && (
          <p className="mt-1.5 font-mono text-xs">
            <a
              href={citation.url}
              target="_blank"
              rel="noopener"
              className="text-accent underline decoration-border-strong underline-offset-2 transition-colors hover:decoration-accent"
            >
              Source: {citationLabel(citation)}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
