'use client';

import { useId, useRef, useState } from 'react';
import { ChartDescription } from '@/components/ui';
import { citationLabel, getCitation } from '@/data/citations';
import {
  PI_GENERATIONS,
  generationsBehind,
  openWeightsFrontier,
  type PiGeneration,
} from '@/lib/pi-generations';
import { cx } from '@/lib/utils';

/**
 * PiGenerationTimeline: the pi0 to pi0.7 release line with the open/closed
 * split drawn on it. Each generation is a node on a time axis; open-weights
 * generations are amber, closed ones are dim, and a dashed divider after
 * pi0.5 marks where openpi stops. Selecting a generation (click or arrow
 * keys) shows its backbone, contribution, and primary source below.
 *
 * Interactive contract: deterministic render, keyboard-accessible selection
 * with arrow keys, visible detail readout, reset control, fixed-height SVG
 * (no layout shift), no auto-playing motion.
 */
type PiGenerationTimelineProps = {
  /** Initially selected generation id. Default 'pi0'. */
  defaultSelected?: string;
  className?: string;
};

const WIDTH = 640;
const HEIGHT = 190;
const AXIS_Y = 96;
const AXIS_LEFT = 44;
const AXIS_RIGHT = WIDTH - 16;

/** Time axis bounds (month precision), slightly padded past the data. */
const AXIS_MIN = '2024-09';
const AXIS_MAX = '2026-07';

function monthIndex(ym: string): number {
  const [year, month] = ym.split('-').map(Number);
  return (year - 2024) * 12 + (month - 1);
}

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function dateToX(ym: string): number {
  const span = monthIndex(AXIS_MAX) - monthIndex(AXIS_MIN);
  return f(AXIS_LEFT + ((monthIndex(ym) - monthIndex(AXIS_MIN)) / span) * (AXIS_RIGHT - AXIS_LEFT));
}

export function PiGenerationTimeline({
  defaultSelected = 'pi0',
  className,
}: PiGenerationTimelineProps) {
  const descriptionId = `${useId()}-description`;
  const [selectedId, setSelectedId] = useState(defaultSelected);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selected: PiGeneration =
    PI_GENERATIONS.find((g) => g.id === selectedId) ?? PI_GENERATIONS[0];
  const citation = getCitation(selected.citationId);
  const frontier = openWeightsFrontier();
  const behind = generationsBehind();

  // The divider sits midway between the last open and first closed release.
  const firstClosed = PI_GENERATIONS.find((g) => !g.openWeights);
  const dividerX = f(
    (dateToX(frontier.released) + dateToX(firstClosed?.released ?? AXIS_MAX)) / 2,
  );

  // pi0.6 and pi*0.6 share a release month; nudge the second node right by
  // half a month so both circles stay visible (labels stay honest).
  const nodeX = (g: PiGeneration, index: number): number => {
    const base = dateToX(g.released);
    const collision = PI_GENERATIONS.findIndex(
      (other) => other.released === g.released,
    );
    return collision === index ? base : f(base + 13);
  };

  function select(index: number) {
    const clamped = Math.min(PI_GENERATIONS.length - 1, Math.max(0, index));
    setSelectedId(PI_GENERATIONS[clamped].id);
    buttonRefs.current[clamped]?.focus();
  }

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Timeline of Physical Intelligence model generations from ${PI_GENERATIONS[0].dateLabel} to ${PI_GENERATIONS[PI_GENERATIONS.length - 1].dateLabel}. Open weights stop at ${frontier.name}; the ${behind} newer generations are closed.`}
        aria-describedby={descriptionId}
        className="block w-full"
      >
        {/* Closed-weights region */}
        <rect
          x={dividerX}
          y={20}
          width={f(AXIS_RIGHT - dividerX)}
          height={AXIS_Y - 8}
          fill="var(--color-surface-2)"
          opacity={0.5}
        />
        {/* Divider: open weights stop here */}
        <line
          x1={dividerX}
          x2={dividerX}
          y1={26}
          y2={AXIS_Y + 22}
          stroke="var(--color-accent)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <text
          x={dividerX}
          y={20}
          textAnchor="middle"
          fill="var(--color-accent)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          open weights stop at {frontier.name}
        </text>
        <text
          x={AXIS_RIGHT - 4}
          y={34}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {behind} closed generations since the last openpi release
        </text>

        {/* Time axis */}
        <line
          x1={AXIS_LEFT}
          x2={AXIS_RIGHT}
          y1={AXIS_Y}
          y2={AXIS_Y}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />
        {['2025', '2026'].map((year) => (
          <g key={year}>
            <line
              x1={dateToX(`${year}-01`)}
              x2={dateToX(`${year}-01`)}
              y1={AXIS_Y - 4}
              y2={AXIS_Y + 4}
              stroke="var(--color-border-strong)"
              strokeWidth={1}
            />
            <text
              x={dateToX(`${year}-01`)}
              y={AXIS_Y + 56}
              textAnchor="middle"
              fill="var(--color-text-dim)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {year}
            </text>
          </g>
        ))}

        {/* Generation nodes */}
        {PI_GENERATIONS.map((g, i) => {
          const cx = nodeX(g, i);
          const above = i % 2 === 0;
          const labelY = above ? AXIS_Y - 30 : AXIS_Y + 38;
          const isSelected = g.id === selected.id;
          return (
            <g key={g.id}>
              <line
                x1={cx}
                x2={cx}
                y1={above ? labelY + 14 : AXIS_Y + 6}
                y2={above ? AXIS_Y - 6 : labelY - 12}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              <circle
                cx={cx}
                cy={AXIS_Y}
                r={isSelected ? 6 : 4.5}
                fill={
                  g.openWeights
                    ? 'var(--color-accent)'
                    : 'var(--color-surface-2)'
                }
                stroke={
                  isSelected
                    ? 'var(--color-accent)'
                    : g.openWeights
                      ? 'var(--color-accent)'
                      : 'var(--color-text-dim)'
                }
                strokeWidth={isSelected ? 2 : 1}
              />
              <text
                x={cx}
                y={labelY}
                textAnchor="middle"
                fill={isSelected ? 'var(--color-text)' : 'var(--color-text-dim)'}
                fontSize={11}
                fontFamily="var(--font-mono)"
              >
                {g.name}
              </text>
              <text
                x={cx}
                y={labelY + 12}
                textAnchor="middle"
                fill="var(--color-text-dim)"
                fontSize={9}
                fontFamily="var(--font-mono)"
              >
                {g.dateLabel}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        data-testid="generation-track"
        role="group"
        aria-label="Select a generation"
        className="mt-3 flex flex-wrap gap-1.5"
      >
        {PI_GENERATIONS.map((g, i) => (
          <button
            key={g.id}
            ref={(el) => {
              buttonRefs.current[i] = el;
            }}
            type="button"
            data-status={g.openWeights ? 'open' : 'closed'}
            aria-label={g.name}
            aria-pressed={g.id === selected.id}
            onClick={() => select(i)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                select(i + 1);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                select(i - 1);
              }
            }}
            className={cx(
              'flex items-baseline gap-2 rounded-sm border px-2.5 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
              g.id === selected.id
                ? 'border-accent text-text'
                : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
            )}
          >
            <span>{g.name}</span>
            <span className="text-[10px] text-text-dim">{g.dateLabel}</span>
            <span
              className={cx(
                'text-[10px]',
                g.openWeights ? 'text-accent' : 'text-text-dim',
              )}
            >
              {g.openWeights ? 'open' : 'closed'}
            </span>
          </button>
        ))}
        <button
          data-pagefind-ignore
          type="button"
          onClick={() => select(PI_GENERATIONS.findIndex((g) => g.id === defaultSelected))}
          className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
      </div>

      <div
        data-testid="generation-detail"
        aria-live="polite"
        className="mt-3 rounded-sm border border-border bg-surface-2 px-3 py-2.5"
      >
        <p className="font-mono text-sm text-text">
          <span className="text-accent">{selected.name}</span>{' '}
          <span className="text-text-dim">{selected.dateLabel}</span>{' '}
          <span
            className={cx(
              'whitespace-nowrap text-xs',
              selected.openWeights ? 'text-accent' : 'text-text-dim',
            )}
          >
            {selected.openWeights ? 'open weights' : 'closed weights'}
          </span>
        </p>
        <p className="mt-1 font-mono text-xs text-text-dim">
          {selected.backbone}
        </p>
        <p className="mt-1.5 font-sans text-xs leading-relaxed text-text">
          {selected.contribution}
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
      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="state"
        summary="Current π generation"
        description={`The π line places ${PI_GENERATIONS.length} generations from ${PI_GENERATIONS[0].dateLabel} to ${PI_GENERATIONS[PI_GENERATIONS.length - 1].dateLabel}, with the dashed divider after ${frontier.name} marking where openpi stops; selected now is ${selected.name} (${selected.backbone}, ${selected.openWeights ? 'open' : 'closed'} weights) and ${behind} later generations are closed.`}
        states={[
          { label: 'selected', value: selected.name },
          { label: 'released', value: selected.dateLabel },
          { label: 'weights', value: selected.openWeights ? 'open' : 'closed' },
          { label: 'generations', value: String(PI_GENERATIONS.length) },
          { label: 'closed since openpi', value: String(behind) },
        ]}
      />
    </div>
  );
}
