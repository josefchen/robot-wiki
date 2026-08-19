'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { ChartDescription } from '@/components/ui';
import { citationLabel, getCitation } from '@/data/citations';
import {
  GENERALIST_RELEASES,
  PROVENANCE_TIERS,
  filterReleases,
  isVendorReported,
  provenanceLabel,
  type GeneralistRelease,
  type OpenFilter,
  type ProvenanceTier,
} from '@/lib/generalist-policies';
import { cx } from '@/lib/utils';

/**
 * GeneralistReleaseTimeline: every current generalist policy on one time
 * axis, Feb 2025 to Jul 2026. Node color encodes open vs closed weights
 * (amber vs dim); node shape encodes provenance (circle paper, square repo
 * notes, triangle lab blog, diamond press release). A segmented filter
 * hides the non-matching side. Selecting a node (click or arrow keys) shows
 * its capability annotation, provenance tier, and primary source below.
 *
 * Interactive contract: deterministic render, keyboard-accessible selection
 * with arrow keys, visible detail readout, filter + reset controls,
 * fixed-height SVG (no layout shift), no auto-playing motion.
 */
type GeneralistReleaseTimelineProps = {
  /** Initially selected release id. Default 'helix' (first chronologically). */
  defaultSelected?: string;
  className?: string;
};

const WIDTH = 720;
const HEIGHT = 230;
const AXIS_Y = 116;
const AXIS_LEFT = 40;
const AXIS_RIGHT = WIDTH - 16;

/** Time axis bounds (month precision), slightly padded past the data. */
const AXIS_MIN = '2025-01';
const AXIS_MAX = '2026-09';

/** Horizontal spread between releases sharing a month. */
const CLUSTER_GAP = 30;

function monthIndex(ym: string): number {
  const [year, month] = ym.split('-').map(Number);
  return (year - 2025) * 12 + (month - 1);
}

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function dateToX(ym: string): number {
  const span = monthIndex(AXIS_MAX) - monthIndex(AXIS_MIN);
  return f(
    AXIS_LEFT +
      ((monthIndex(ym) - monthIndex(AXIS_MIN)) / span) * (AXIS_RIGHT - AXIS_LEFT),
  );
}

/** Short node labels: full names collide in the Mar 2025 / Apr 2026 clusters. */
const SHORT_NAME: Record<string, string> = {
  'Gemini Robotics 1.0': 'GR 1.0',
  'Gemini Robotics 1.5': 'GR 1.5',
  'Gemini Robotics 2': 'GR 2',
  'AgiBot GO-1': 'GO-1',
  'AgiBot GO-2': 'GO-2',
  'Skild Brain': 'Skild',
};

const FILTERS: readonly { id: OpenFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'closed', label: 'Closed' },
];

/** Node glyph per provenance tier: circle, square, triangle, diamond. */
function TierGlyph({
  tier,
  x,
  y,
  size,
  selected,
  open,
}: {
  tier: ProvenanceTier;
  x: number;
  y: number;
  size: number;
  selected: boolean;
  open: boolean;
}) {
  const fill = open ? 'var(--color-accent)' : 'var(--color-surface-2)';
  const stroke = selected
    ? 'var(--color-accent)'
    : open
      ? 'var(--color-accent)'
      : 'var(--color-text-dim)';
  const common = {
    fill,
    stroke,
    strokeWidth: selected ? 2 : 1,
  } as const;
  if (tier === 'paper') {
    return <circle cx={x} cy={y} r={size} {...common} />;
  }
  if (tier === 'docs') {
    return (
      <rect x={f(x - size)} y={f(y - size)} width={size * 2} height={size * 2} {...common} />
    );
  }
  if (tier === 'blog') {
    return (
      <polygon
        points={`${f(x)},${f(y - size - 1)} ${f(x + size + 1)},${f(y + size)} ${f(x - size - 1)},${f(y + size)}`}
        {...common}
      />
    );
  }
  return (
    <polygon
      points={`${f(x)},${f(y - size - 1)} ${f(x + size + 1)},${f(y)} ${f(x)},${f(y + size + 1)} ${f(x - size - 1)},${f(y)}`}
      {...common}
    />
  );
}

export function GeneralistReleaseTimeline({
  defaultSelected = 'helix',
  className,
}: GeneralistReleaseTimelineProps) {
  const descriptionId = `${useId()}-description`;
  const [filter, setFilter] = useState<OpenFilter>('all');
  const [selectedId, setSelectedId] = useState(defaultSelected);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const visible = filterReleases(filter);
  const selected: GeneralistRelease =
    visible.find((r) => r.id === selectedId) ?? visible[0];
  const citation = getCitation(selected.citationId);

  // Spread releases that share a month so every node stays visible.
  const nodeX = (r: GeneralistRelease): number => {
    const base = dateToX(r.released);
    const siblings = GENERALIST_RELEASES.filter(
      (other) => other.released === r.released,
    );
    if (siblings.length === 1) return base;
    const position = siblings.findIndex((other) => other.id === r.id);
    return f(base + (position - (siblings.length - 1) / 2) * CLUSTER_GAP);
  };

  function applyFilter(next: OpenFilter) {
    setFilter(next);
    const nextVisible = filterReleases(next);
    if (!nextVisible.some((r) => r.id === selectedId)) {
      setSelectedId(nextVisible[0].id);
    }
  }

  function select(index: number) {
    const clamped = Math.min(visible.length - 1, Math.max(0, index));
    setSelectedId(visible[clamped].id);
    buttonRefs.current[clamped]?.focus();
  }

  function reset() {
    setFilter('all');
    setSelectedId(defaultSelected);
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
        aria-label="Filter by weight availability"
        className="flex flex-wrap items-center gap-1.5"
      >
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => applyFilter(id)}
            className={cx(
              'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
              filter === id
                ? 'border-accent text-text'
                : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
            )}
          >
            {label}
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
        <span
          data-testid="provenance-legend"
          className="ml-auto flex flex-wrap items-center gap-3 font-mono text-[10px] text-text-dim"
        >
          {PROVENANCE_TIERS.map((tier) => (
            <span key={tier} className="flex items-center gap-1.5">
              <svg width={12} height={12} aria-hidden="true">
                <TierGlyph tier={tier} x={6} y={6} size={3.5} selected={false} open={false} />
              </svg>
              {provenanceLabel(tier)}
            </span>
          ))}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Release timeline of generalist robot policies from ${GENERALIST_RELEASES[0].dateLabel} to ${GENERALIST_RELEASES[GENERALIST_RELEASES.length - 1].dateLabel}. Amber nodes are open weights, dim nodes are closed. Node shape encodes provenance: circle for papers, square for repo release notes, triangle for lab blogs, diamond for press releases. Currently showing ${visible.length} of ${GENERALIST_RELEASES.length} releases.`}
        aria-describedby={descriptionId}
        className="mt-3 block w-full"
      >
        {/* Time axis */}
        <line
          x1={AXIS_LEFT}
          x2={AXIS_RIGHT}
          y1={AXIS_Y}
          y2={AXIS_Y}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />
        {['2025-07', '2026-01', '2026-07'].map((ym) => (
          <g key={ym}>
            <line
              x1={dateToX(ym)}
              x2={dateToX(ym)}
              y1={AXIS_Y - 4}
              y2={AXIS_Y + 4}
              stroke="var(--color-border-strong)"
              strokeWidth={1}
            />
          </g>
        ))}
        {['2025', '2026'].map((year) => (
          <text
            key={year}
            x={dateToX(`${year}-07`)}
            y={HEIGHT - 8}
            textAnchor="middle"
            fill="var(--color-text-dim)"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            {year}
          </text>
        ))}

        {/* Release nodes. Labels alternate above/below by index and stagger
            near/far within each side, so the dense Mar 2025 and Apr 2026
            clusters never overlap. */}
        {visible.map((r, i) => {
          const x = nodeX(r);
          const above = i % 2 === 0;
          const far = Math.floor(i / 2) % 2 === 1;
          const labelY = above
            ? far
              ? AXIS_Y - 64
              : AXIS_Y - 38
            : far
              ? AXIS_Y + 74
              : AXIS_Y + 46;
          const isSelected = r.id === selected.id;
          return (
            <g key={r.id}>
              <line
                x1={x}
                x2={x}
                y1={above ? labelY + 12 : AXIS_Y + 8}
                y2={above ? AXIS_Y - 8 : labelY - 10}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              <TierGlyph
                tier={r.provenance}
                x={x}
                y={AXIS_Y}
                size={isSelected ? 6 : 4.5}
                selected={isSelected}
                open={r.openWeights}
              />
              <text
                x={x}
                y={labelY}
                textAnchor="middle"
                fill={isSelected ? 'var(--color-text)' : 'var(--color-text-dim)'}
                fontSize={10}
                fontFamily="var(--font-mono)"
              >
                {SHORT_NAME[r.name] ?? r.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        data-testid="release-track"
        role="group"
        aria-label="Select a release"
        className="mt-3 flex flex-wrap items-center gap-1.5"
      >
        {visible.map((r, i) => (
          <button
            key={r.id}
            ref={(el) => {
              buttonRefs.current[i] = el;
            }}
            type="button"
            data-status={r.openWeights ? 'open' : 'closed'}
            data-provenance={r.provenance}
            aria-label={r.name}
            aria-pressed={r.id === selected.id}
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
              r.id === selected.id
                ? 'border-accent text-text'
                : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
            )}
          >
            <span>{r.name}</span>
            <span className="text-[10px] text-text-dim">{r.dateLabel}</span>
            <span
              className={cx(
                'text-[10px]',
                r.openWeights ? 'text-accent' : 'text-text-dim',
              )}
            >
              {r.openWeights ? 'open' : 'closed'}
            </span>
          </button>
        ))}
        <span className="ml-auto font-mono text-[10px] text-text-dim">
          {visible.length} of {GENERALIST_RELEASES.length} shown
        </span>
      </div>

      <div
        data-testid="release-detail"
        aria-live="polite"
        className="mt-3 rounded-sm border border-border bg-surface-2 px-3 py-2.5"
      >
        <p className="font-mono text-sm text-text">
          <span className="text-accent">{selected.name}</span>{' '}
          <span className="text-text-dim">{selected.org}</span>{' '}
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
          Provenance: {provenanceLabel(selected.provenance)}
        </p>
        <p className="mt-1.5 font-sans text-xs leading-relaxed text-text">
          {selected.capability}
        </p>
        {selected.context && (
          <p className="mt-1.5 font-mono text-xs text-text-dim">
            Cross-reference: full treatment in{' '}
            <Link
              href="/manipulation/pi-line"
              className="text-accent underline decoration-border-strong underline-offset-2 transition-colors hover:decoration-accent"
            >
              The Pi Line
            </Link>
            .
          </p>
        )}
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
            {isVendorReported(selected) && (
              <span className="text-text-dim"> (vendor-reported)</span>
            )}
          </p>
        )}
      </div>
      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="state"
        summary="Current generalist release"
        description={`${visible.length} of ${GENERALIST_RELEASES.length} generalist policies sit on a ${GENERALIST_RELEASES[0].dateLabel} to ${GENERALIST_RELEASES[GENERALIST_RELEASES.length - 1].dateLabel} axis; selected is ${selected.name} from ${selected.org} (${selected.openWeights ? 'open' : 'closed'}, ${provenanceLabel(selected.provenance)}) and amber nodes mark open weights while dim nodes mark closed ones.`}
        states={[
          { label: 'selected', value: selected.name },
          { label: 'org', value: selected.org },
          { label: 'released', value: selected.dateLabel },
          { label: 'weights', value: selected.openWeights ? 'open' : 'closed' },
          { label: 'shown', value: `${visible.length} of ${GENERALIST_RELEASES.length}` },
        ]}
      />
    </div>
  );
}
