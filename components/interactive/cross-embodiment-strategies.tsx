'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { StageStatusChip } from '@/components/ui/stage-status-chip';
import { FigureStage } from '@/components/motion/figure-frame';
import { CHART_STROKE, CHART_STRUCTURE, CHART_TYPE, CHART_VIEW_WIDTH, roleColour } from '@/components/motion/chart';
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

/**
 * Original deterministic slot-layout illustration, not a published architecture.
 * Three robot examples and one human-data row keep the existing geometry.
 * Readouts separate source-reported transfer recipes from unmodelled toy adapters.
 * Native toggles, shared accessible descriptions, live readouts and reset remain.
 * The default is the shared relative end-effector space, the one account
 * that populates the human-hand row.
 */

const STRIP = {
  width: CHART_VIEW_WIDTH,
  height: 20,
  padX: 2,
  gap: 2,
};

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

/*
 * Slot fills. Driven dims are action dims, so they take the action role.
 * The shared-latent slots are a schematic for an undisclosed
 * representation, so they get a neutral structure hatch rather than a
 * colour: status colours are reserved, and "schematic" is not a success
 * state. The hatch is also the non-colour channel that keeps latent slots
 * distinct from active ones without relying on hue (VAL-CHART-002).
 */
const SLOT_FILL: Record<SlotState, string> = {
  active: roleColour('action'),
  latent: 'latent-hatch',
  zeroed: 'transparent',
  blocked: 'transparent',
};

const SLOT_STROKE_OPACITY: Record<SlotState, number> = {
  active: 0,
  latent: 0,
  zeroed: 0.9,
  blocked: CHART_STRUCTURE.axesOpacity,
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

const SLOT_W = f((STRIP.width - STRIP.padX * 2 - STRIP.gap * (SHARED_WIDTH - 1)) / SHARED_WIDTH);
const slotX = (i: number) => f(STRIP.padX + i * (SLOT_W + STRIP.gap));

/** The neutral hatch the latent slots and their legend swatch share. */
function LatentHatch({ id }: { id: string }) {
  return (
    <pattern id={id} width={4} height={4} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1={0} y1={0} x2={0} y2={4} stroke={CHART_STRUCTURE.labelSecondary} strokeWidth={CHART_STROKE.structure} />
    </pattern>
  );
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
  const fill = (state: SlotState) =>
    state === 'latent' ? `url(#${hatchId})` : SLOT_FILL[state];

  return (
    <div data-testid={`row-${embodimentId}`} className="py-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-sans text-[13px] leading-snug">
        <span className="font-medium text-text">{body.label}</span>
        <span className="text-text-dim">{body.note}</span>
        <span
          data-testid={`readout-${embodimentId}`}
          className={summary.sharesSpace ? 'ml-auto text-text' : 'ml-auto text-text-dim'}
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
          <LatentHatch id={hatchId} />
        </defs>
        {slots.map((slot) => (
          <rect
            key={slot.index}
            data-series={slot.state}
            x={slotX(slot.index)}
            y={2}
            width={SLOT_W}
            height={STRIP.height - 4}
            fill={fill(slot.state)}
            stroke={CHART_STRUCTURE.axes}
            strokeOpacity={SLOT_STROKE_OPACITY[slot.state]}
            strokeWidth={CHART_STROKE.structure}
            strokeDasharray={slot.state === 'zeroed' ? '2 2' : undefined}
          >
            <title>{`dim ${slot.index + 1}: ${slotAria(slot.state)}`}</title>
          </rect>
        ))}
      </PlotStage>
    </div>
  );
}

/** A legend swatch drawn with the slot's own fill, outline and dash. */
function SlotSwatch({ state, hatchId }: { state: SlotState; hatchId?: string }) {
  const h = CHART_TYPE.tickPx;
  return (
    <svg aria-hidden="true" focusable="false" width={h} height={h} viewBox={`0 0 ${h} ${h}`} className="shrink-0">
      {hatchId ? (
        <defs>
          <LatentHatch id={hatchId} />
        </defs>
      ) : null}
      <rect
        x={0.5}
        y={0.5}
        width={h - 1}
        height={h - 1}
        fill={hatchId ? `url(#${hatchId})` : SLOT_FILL[state]}
        stroke={CHART_STRUCTURE.axes}
        strokeOpacity={SLOT_STROKE_OPACITY[state]}
        strokeWidth={CHART_STROKE.structure}
        strokeDasharray={state === 'zeroed' ? '2 2' : undefined}
      />
    </svg>
  );
}

const STAGE_LINK = 'underline-offset-2';

export function CrossEmbodimentStrategies({
  defaultStrategy = 'relative-eef',
  className,
}: {
  defaultStrategy?: StrategyId;
  className?: string;
}) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const legendHatchId = `${uid.replace(/[^a-zA-Z0-9-]/g, '')}-legend-hatch`;
  const [strategyId, setStrategyId] = useState<StrategyId>(defaultStrategy);
  const strategy = STRATEGIES[strategyId];
  const citationFor = useCitationLookup();
  const citation = citationFor(strategy.citationId);
  const extraCitation =
    strategyId === 'relative-eef' ? citationFor(RELATIVE_EEF_CONTEXT_CITATION_ID) : undefined;

  function reset() {
    setStrategyId(defaultStrategy);
  }

  const sourceLink = (record: { url: string; label: string }) => (
    <div className="mt-1.5">
      <a
        data-brand-control-id="control:link-focus"
        href={record.url}
        target="_blank"
        rel="noopener"
        className={STAGE_LINK}
      >
        Source context: {record.label}
      </a>
    </div>
  );

  return (
    <InstrumentFigure
      figureId="cross-embodiment-strategies"
      className={className}
      heading="One action vector, four bodies"
      controls={
        <div
          role="group"
          aria-label="Select a cross-embodiment strategy"
          className="flex flex-wrap items-center gap-1"
        >
          {STRATEGY_ORDER.map((id) => (
            <button
              data-brand-control-id="control:selection"
              key={id}
              type="button"
              aria-pressed={id === strategyId}
              onClick={() => setStrategyId(id)}
              className={INSTRUMENT_TOGGLE_CLASS}
            >
              {STRATEGIES[id].label}
            </button>
          ))}
          <InstrumentReset onClick={reset} />
        </div>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="active" swatch={<SlotSwatch state="active" />}>
                  driven by this source
                </LegendItem>
                <LegendItem series="zeroed" swatch={<SlotSwatch state="zeroed" />}>
                  zero-padding
                </LegendItem>
                <LegendItem series="latent" swatch={<SlotSwatch state="latent" hatchId={legendHatchId} />}>
                  hatched: illustrative link, not model dimensions
                </LegendItem>
                <LegendItem series="blocked" swatch={<SlotSwatch state="blocked" />}>
                  unused
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout className="basis-full">
                <span className="text-text-dim">{strategy.label}:</span>{' '}
                <span data-testid="human-video-readout">{strategy.humanVideoVerdict}</span>
              </InstrumentReadout>
              <div
                data-testid="strategy-detail"
                className="basis-full border-t border-border-strong pt-3 font-sans text-[13px]"
              >
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="text-sm font-medium text-text">{strategy.label}</span>
                  <span className="text-text-dim">{strategy.proponent}</span>
                  {strategy.underSpecified && (
                    <span data-testid="underspecified-flag">
                      <StageStatusChip variant="warn" line="dashed">
                        internal layout not specified
                      </StageStatusChip>
                    </span>
                  )}
                </div>
                <p className="mt-1.5 max-w-[65ch] leading-relaxed text-text">{strategy.mechanism}</p>
                <p className="mt-1.5 max-w-[65ch] leading-relaxed text-text-dim">{strategy.caveat}</p>
                {citation && sourceLink(citation)}
                {extraCitation && sourceLink(extraCitation)}
              </div>
              <ChartDescription
                id={descriptionId}
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
            </>
          }
        >
          <div className="divide-y divide-border-strong px-3 pt-2">
            {EMBODIMENT_ORDER.map((id) => (
              <EmbodimentRow
                key={id}
                strategy={strategyId}
                embodimentId={id}
                describedBy={descriptionId}
              />
            ))}
          </div>
        </FigureStage>
      }
      caption="Three ways to fit four bodies into one 32-slot action vector; only shared relative EEF populates the human-hand row."
      source="Original slot illustrations; strip widths and the 8-, 16- and 29-coordinate robot rows are toy choices."
    />
  );
}
