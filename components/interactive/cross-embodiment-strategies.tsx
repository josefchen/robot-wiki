'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import {
  ChartDescription,
  InstrumentFrame,
  InstrumentHeader,
  InstrumentLegend,
  InstrumentReadout,
  LegendItem,
  InstrumentReset,
  PlotStage,
} from '@/components/ui';
import {
  EEF_SPACE_DIMS,
  EMBODIMENT_ORDER,
  LATENT_DIMS,
  RELATIVE_EEF_CONTEXT_CITATION_ID,
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
 * Original deterministic slot-layout illustration, not a published architecture.
 * Three robot examples and one human-data row keep the existing geometry.
 * Readouts separate source-reported transfer recipes from unmodelled toy adapters.
 * Native toggles, shared accessible descriptions, live readouts and reset remain.
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
      return 'illustrative link slot (not a model dimension)';
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
      <PlotStage
        viewBox={`0 0 ${STRIP.width} ${STRIP.height}`}
        aria-label={`Action-space slot strip for ${body.label} under the ${STRATEGIES[strategy].label} strategy. ${summary.note}.`}
        aria-describedby={describedBy}
        className="mt-1"
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
            data-series={slot.state}
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
      </PlotStage>
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
  const citationFor = useCitationLookup();
  const citation = citationFor(strategy.citationId);
  const extraCitation =
    strategyId === 'relative-eef' ? citationFor(RELATIVE_EEF_CONTEXT_CITATION_ID) : undefined;

  function reset() {
    setStrategyId(defaultStrategy);
  }

  return (
    <InstrumentFrame className={className}>
      <InstrumentHeader
        role="group"
        aria-label="Select a cross-embodiment strategy"
        className="gap-1.5"
        meta={strategy.proponent}
      >
        {STRATEGY_ORDER.map((id) => (
          <button
            data-brand-control-id="control:selection"
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
        <InstrumentReset onClick={reset} />
      </InstrumentHeader>

      <InstrumentReadout>
        <span className="text-text-dim">{strategy.label}:</span>{' '}
        <span
          data-testid="human-video-readout"
          className={
            strategyId === 'relative-eef' ? 'text-ok' : 'text-warn'
          }
        >
          {strategy.humanVideoVerdict}
        </span>
      </InstrumentReadout>

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

      <InstrumentLegend className="mt-2">
        <LegendItem
          series="active"
          swatch={
            <svg width={10} height={10} aria-hidden className="shrink-0">
              <rect
                width={10}
                height={10}
                fill="var(--color-accent)"
                fillOpacity={0.85}
              />
            </svg>
          }
        >
          driven by this source
        </LegendItem>
        <LegendItem
          series="zeroed"
          swatch={
            <svg width={10} height={10} aria-hidden className="shrink-0">
              <rect
                width={9}
                height={9}
                x={0.5}
                y={0.5}
                fill="none"
                stroke="var(--color-border-strong)"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
            </svg>
          }
        >
          zero-padding
        </LegendItem>
        <LegendItem
          series="latent"
          swatch={
            <svg width={10} height={10} aria-hidden className="shrink-0">
              <defs>
                <pattern
                  id="legend-latent-hatch"
                  width={4}
                  height={4}
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <line x1={0} y1={0} x2={0} y2={4} stroke="var(--color-text-dim)" strokeWidth={1} />
                </pattern>
              </defs>
              <rect width={10} height={10} fill="url(#legend-latent-hatch)" />
            </svg>
          }
        >
          hatched: illustrative link, not model dimensions
        </LegendItem>
        <LegendItem
          series="blocked"
          swatch={
            <svg width={10} height={10} aria-hidden className="shrink-0">
              <rect
                width={9}
                height={9}
                x={0.5}
                y={0.5}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth={1}
              />
            </svg>
          }
        >
          unused
        </LegendItem>
      </InstrumentLegend>
        <p className="mt-1 font-sans text-xs text-text-dim">
          Signal <span className="text-accent">blue</span> carries the dims a
          source drives; the swatches above repeat each rendered mark.
        </p>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="state"
        summary="Current cross-embodiment mapping"
        description={
          strategyId === 'padded'
            ? `Padded shared vector is an illustrative ${SHARED_WIDTH}-slot layout across ${EMBODIMENT_ORDER.length} rows. Robot rows zero-pad unused coordinates; the human row has no adapter modelled in this toy.`
            : strategyId === 'motion-transfer'
              ? `Motion Transfer is described as alignment and shared knowledge across robots. These ${SHARED_WIDTH}-slot strips add ${LATENT_DIMS} hatched link slots as an illustration, not a model latent. The empty hand row leaves its mapping unspecified; it does not establish that human video is unusable.`
              : `Shared relative end-effector space is illustrated with ${EEF_SPACE_DIMS} shared slots. N1.7 reports 20K hours of EgoScale human video; EgoScale separately uses wrist deltas, hand joint targets and aligned mid-training. These operations are not implemented by the strips.`
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
        data-brand-surface-id="surface:flat"
        className="mt-3 rounded-sm border border-border bg-surface-2 px-3 py-2.5"
      >
        {strategy.underSpecified && (
          <p
            data-testid="underspecified-flag"
            className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-warn"
          >
            internal layout not specified
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
              data-brand-control-id="control:link-focus"
              href={citation.url}
              target="_blank"
              rel="noopener"
              className="text-accent underline decoration-border-strong underline-offset-2 transition-colors hover:decoration-accent"
            >
              Source context: {citation.label}
            </a>
          </p>
        )}
        {extraCitation && (
          <p className="mt-1.5 font-mono text-xs">
            <a
              data-brand-control-id="control:link-focus"
              href={extraCitation.url}
              target="_blank"
              rel="noopener"
              className="text-accent underline decoration-border-strong underline-offset-2 transition-colors hover:decoration-accent"
            >
              Source context: {extraCitation.label}
            </a>
          </p>
        )}
      </div>

      <p className="mt-3 font-sans text-xs leading-relaxed text-text-dim">
        Every strip width is illustrative, not a published architecture or
        hardware specification. The 8-, 16-, and 29-coordinate robot examples
        are unchanged toy choices. NVIDIA&apos;s N1.7 README describes model
        state/action dimensions changing from 29 to 132 relative to N1.6,
        and reports 20K hours of EgoScale human video. It does not turn the
        29-coordinate toy into a humanoid DoF specification.
      </p>
    </InstrumentFrame>
  );
}
