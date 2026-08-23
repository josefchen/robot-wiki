'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui';
import { citationLabel, getCitation } from '@/data/citations';
import {
  EEF_SPACE_DIMS,
  EMBODIMENT_ORDER,
  LATENT_DIMS,
  SHARED_WIDTH,
  STRATEGIES,
  STRATEGY_ORDER,
  embodimentById,
  rowSummary,
  slotRow,
  type SlotState,
  type StrategyId,
} from '@/lib/cross-embodiment';
import { cx } from '@/lib/utils';

/**
 * CrossEmbodimentStrategies: one task, three robots plus a human-hand data
 * source, viewed through the three published strategies for sharing one
 * policy across heterogeneous bodies. A toggle switches the representation:
 *
 * - Padded shared vector (pi0 family, Octo): every robot fills the leading
 *   dims of one shared vector and zero-pads the tail; the human hand has
 *   no slot.
 * - Motion transfer (Gemini Robotics 1.5): each robot routes through a
 *   shared motion latent. The mechanism is named but not disclosed, so
 *   the latent is drawn schematic and the mode carries an explicit
 *   under-specified flag.
 * - Shared relative end-effector space (GR00T N1.7): every embodiment,
 *   human hand included, acts in the same delta space, which is what lets
 *   20K hours of EgoScale egocentric video enter pretraining directly.
 *
 * All three strategies render at identical strip geometry (32 slots), so
 * switching modes changes structure, not layout. The strip widths are
 * illustrative; the sourced numbers (humanoid 29 dims, 20K EgoScale
 * hours) are marked in the notes.
 *
 * Interactive contract: deterministic render, native toggle buttons with
 * aria-pressed (keyboard-focusable), visible monospace readouts per row,
 * a summary readout with aria-live, a reset control, fixed row count
 * (no layout shift across modes), no auto-playing motion.
 */

const STRIP = {
  width: 640,
  height: 30,
  padX: 4,
  gap: 2,
};

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

/*
 * Slot fills. Driven dims are the one primary series (signal blue). The
 * shared-latent slots are a schematic for an undisclosed representation, so
 * they get neutral hatching rather than a colour: green and amber are
 * semantic state colours, and "schematic" is not a success state. The
 * hatch is also the non-colour channel that keeps latent slots distinct
 * from active ones without relying on hue (VAL-CHART-002).
 */
const SLOT_FILL: Record<SlotState, string> = {
  active: 'var(--color-accent)',
  latent: 'latent-hatch',
  zeroed: 'transparent',
  blocked: 'transparent',
};

const SLOT_OPACITY: Record<SlotState, number> = {
  active: 0.85,
  latent: 1,
  zeroed: 1,
  blocked: 1,
};

function slotAria(state: SlotState): string {
  switch (state) {
    case 'active':
      return 'driven dim';
    case 'latent':
      return 'shared latent dim (schematic)';
    case 'zeroed':
      return 'zero-padded dim';
    case 'blocked':
      return 'unused dim';
  }
}

function EmbodimentRow({
  strategy,
  embodimentId,
  describedBy,
}: {
  strategy: StrategyId;
  embodimentId: (typeof EMBODIMENT_ORDER)[number];
  describedBy: string;
}) {
  const body = embodimentById(embodimentId);
  const summary = rowSummary(strategy, embodimentId);
  const slots = slotRow(strategy, embodimentId);
  // Per-row pattern id: the component can mount more than once on a page,
  // and two SVGs sharing one id would make every latent slot resolve
  // against the first mount's pattern.
  const hatchId = `${useId().replace(/[^a-zA-Z0-9-]/g, '')}-latent-hatch`;

  const slotW = f((STRIP.width - STRIP.padX * 2 - STRIP.gap * (SHARED_WIDTH - 1)) / SHARED_WIDTH);
  const x = (i: number) => f(STRIP.padX + i * (slotW + STRIP.gap));
  const fill = (state: SlotState) =>
    state === 'latent' ? `url(#${hatchId})` : SLOT_FILL[state];

  return (
    <div data-testid={`row-${embodimentId}`} className="py-2">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-mono text-xs text-text">{body.label}</span>
        <span className="font-mono text-[10px] text-text-dim">{body.note}</span>
        <span
          data-testid={`readout-${embodimentId}`}
          className={cx(
            'ml-auto font-mono text-[11px]',
            summary.sharesSpace ? 'text-accent' : 'text-text-dim',
          )}
        >
          {summary.note}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${STRIP.width} ${STRIP.height}`}
        role="img"
        aria-label={`Action-space slot strip for ${body.label} under the ${STRATEGIES[strategy].label} strategy. ${summary.note}.`}
        aria-describedby={describedBy}
        className="mt-1 block w-full"
      >
        <defs>
          <pattern
            id={hatchId}
            width={4}
            height={4}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={4}
              stroke="var(--color-text-dim)"
              strokeWidth={1}
            />
          </pattern>
        </defs>
        {slots.map((slot) => (
          <rect
            key={slot.index}
            x={x(slot.index)}
            y={3}
            width={slotW}
            height={STRIP.height - 6}
            rx={1}
            fill={fill(slot.state)}
            fillOpacity={SLOT_OPACITY[slot.state]}
            stroke={
              slot.state === 'blocked'
                ? 'var(--color-border)'
                : slot.state === 'zeroed'
                  ? 'var(--color-border-strong)'
                  : 'none'
            }
            strokeWidth={1}
            strokeDasharray={slot.state === 'zeroed' ? '2 2' : undefined}
          >
            <title>{`dim ${slot.index + 1}: ${slotAria(slot.state)}`}</title>
          </rect>
        ))}
      </svg>
    </div>
  );
}

export function CrossEmbodimentStrategies({
  defaultStrategy = 'padded',
  className,
}: {
  defaultStrategy?: StrategyId;
  className?: string;
}) {
  const descriptionId = `${useId()}-description`;
  const [strategyId, setStrategyId] = useState<StrategyId>(defaultStrategy);
  const strategy = STRATEGIES[strategyId];
  const citation = getCitation(strategy.citationId);

  function reset() {
    setStrategyId(defaultStrategy);
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
        aria-label="Select a cross-embodiment strategy"
        className="flex flex-wrap items-center gap-1.5"
      >
        {STRATEGY_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={id === strategyId}
            onClick={() => setStrategyId(id)}
            className={cx(
              'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
              id === strategyId
                ? 'border-accent text-text'
                : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
            )}
          >
            {STRATEGIES[id].label}
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
          {strategy.proponent}
        </span>
      </div>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">{strategy.label}:</span>{' '}
        <span
          data-testid="human-video-readout"
          className={
            strategyId === 'relative-eef' ? 'text-ok' : 'text-warn'
          }
        >
          {strategy.humanVideoVerdict}
        </span>
      </p>

      <div className="mt-2 divide-y divide-border">
        {EMBODIMENT_ORDER.map((id) => (
          <EmbodimentRow
            key={id}
            strategy={strategyId}
            embodimentId={id}
            describedBy={descriptionId}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <span className="font-mono text-[10px] text-text-dim">
          <span className="text-accent">blue</span>: dims this source drives
        </span>
        <span className="font-mono text-[10px] text-text-dim">
          dashed outline: zero-padding
        </span>
        <span className="font-mono text-[10px] text-text-dim">
          hatched: shared latent (schematic)
        </span>
        <span className="font-mono text-[10px] text-text-dim">
          faint outline: unused
        </span>
      </div>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="state"
        summary="Current cross-embodiment mapping"
        description={
          strategyId === 'padded'
            ? `Padded shared vector leaves human video unable to enter this space directly: the ${SHARED_WIDTH}-slot strips zero-pad unused dims on each of the ${EMBODIMENT_ORDER.length} bodies and leave the human hand with no slot at all.`
            : strategyId === 'motion-transfer'
              ? `Motion transfer routes every body through a ${LATENT_DIMS}-dim shared latent that is publicly under-specified; human-video path not disclosed, so the hatched slots on the ${SHARED_WIDTH}-slot strips are schematic rather than a published mapping.`
              : `Shared relative end-effector space lets human video enter directly: 20,000 hours of EgoScale, because every embodiment including the human hand acts in the same ${EEF_SPACE_DIMS}-dim delta space.`
        }
        states={[
          { label: 'strategy', value: strategy.label },
          { label: 'human video', value: strategy.humanVideoVerdict },
          { label: 'embodiments', value: String(EMBODIMENT_ORDER.length) },
          {
            label: 'strip width',
            value: `${SHARED_WIDTH} slots`,
          },
        ]}
      />

      <div
        data-testid="strategy-detail"
        className="mt-3 rounded-sm border border-border bg-surface-2 px-3 py-2.5"
      >
        {strategy.underSpecified && (
          <p
            data-testid="underspecified-flag"
            className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-warn"
          >
            publicly under-specified
          </p>
        )}
        <p className="font-sans text-xs leading-relaxed text-text">
          {strategy.mechanism}
        </p>
        <p className="mt-1.5 font-sans text-xs leading-relaxed text-text-dim">
          {strategy.caveat}
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

      <p className="mt-3 font-sans text-xs leading-relaxed text-text-dim">
        The strip widths are illustrative renderings, not published
        architectures: the pi0 report specifies the padding and
        normalization scheme but not a slot width, and Gemini does not
        disclose the motion-transfer representation at all. The sourced
        figures are the humanoid&apos;s 29 dims (GR00T N1) and the 20,000
        hours of EgoScale video (GR00T N1.7 README).
      </p>
    </div>
  );
}
