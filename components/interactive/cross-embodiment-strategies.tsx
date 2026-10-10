'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
  PresetGroup,
} from '@/components/ui/instrument';
import { StageStatusChip } from '@/components/ui/stage-status-chip';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
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
  type EmbodimentId,
  type SlotState,
  type StrategyId,
} from '@/lib/cross-embodiment';

/**
 * CrossEmbodimentStrategies: why describing where the hand goes lets a
 * model learn from people on video. The main view is a small grid: the
 * four bodies (one arm, two arms, a humanoid, a person on video) down the
 * side, the three ways of fitting them into one action list across the
 * top, and in each cell a bar for the model's 32 action slots. The human
 * row is empty, empty, then filled, and the one note says so. The presets
 * pick a column to bring forward; "Adjust more" holds the full 32-slot
 * strips for the chosen way, their readouts, the source detail and Reset.
 *
 * Original deterministic slot-layout illustration, not a published
 * architecture: the 8-, 16- and 29-coordinate robot rows and the strip
 * widths are toy choices (lib/cross-embodiment.ts). The default is the
 * shared relative end-effector space, the one account that populates the
 * human-hand row.
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
    <div data-testid={`row-${embodimentId}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-sans text-[13px] leading-snug">
        <span className="text-text">{body.label}</span>
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

/** The presets and column heads in plain words; the strategy labels stay in the readouts. */
const PLAIN_STRATEGY: Record<StrategyId, { label: string; head: readonly string[] }> = {
  padded: { label: "Pad each robot's own list", head: ['Pad each', "robot's own", 'list'] },
  'motion-transfer': { label: 'Translate between bodies', head: ['Translate', 'between', 'bodies'] },
  'relative-eef': { label: 'Describe where the hand goes', head: ['Describe', 'where the', 'hand goes'] },
};

const PLAIN_BODY: Record<EmbodimentId, [string, string?]> = {
  arm: ['One arm'],
  bimanual: ['Two arms'],
  humanoid: ['Humanoid'],
  'human-hand': ['Person', 'on video'],
};

const OVERVIEW = {
  width: CHART_VIEW_WIDTH,
  left: 4,
  labelW: 88,
  headY: 12,
  rowTop: 46,
  rowH: 34,
  barH: 8,
  colPad: 5,
};
const COL_W = f((OVERVIEW.width - OVERVIEW.left - OVERVIEW.labelW) / STRATEGY_ORDER.length);
const colX = (i: number) => f(OVERVIEW.left + OVERVIEW.labelW + i * COL_W);
const rowY = (i: number) => OVERVIEW.rowTop + i * OVERVIEW.rowH;
const OVERVIEW_GRID_BOTTOM = rowY(EMBODIMENT_ORDER.length);
const NOTE_Y = OVERVIEW_GRID_BOTTOM + 16;
const OVERVIEW_HEIGHT = Math.ceil(NOTE_Y + CHART_TYPE.labelPx * 1.25 * 2 + 8);

/** One cell's bar: the 32 slots drawn as runs, in slot order. */
function MiniBar({
  strategy,
  embodimentId,
  x,
  y,
  width,
  hatchId,
}: {
  strategy: StrategyId;
  embodimentId: EmbodimentId;
  x: number;
  y: number;
  width: number;
  hatchId: string;
}) {
  const slots = slotRow(strategy, embodimentId);
  const unit = width / SHARED_WIDTH;
  const runs: Array<{ state: SlotState; from: number; to: number }> = [];
  for (const slot of slots) {
    const last = runs[runs.length - 1];
    if (last && last.state === slot.state) last.to = slot.index + 1;
    else runs.push({ state: slot.state, from: slot.index, to: slot.index + 1 });
  }
  const empty = runs.every((run) => run.state === 'blocked');
  return (
    <g data-overview-cell={`${strategy}:${embodimentId}`} data-filled={empty ? 'false' : 'true'}>
      <rect
        x={x}
        y={y}
        width={width}
        height={OVERVIEW.barH}
        fill="none"
        stroke={CHART_STRUCTURE.axes}
        strokeOpacity={CHART_STRUCTURE.axesOpacity}
        strokeWidth={CHART_STROKE.structure}
      />
      {runs.map((run) =>
        run.state === 'blocked' ? null : (
          <rect
            key={run.from}
            data-series={run.state}
            x={f(x + run.from * unit)}
            y={y}
            width={f((run.to - run.from) * unit)}
            height={OVERVIEW.barH}
            fill={run.state === 'latent' ? `url(#${hatchId})` : SLOT_FILL[run.state]}
            stroke={CHART_STRUCTURE.axes}
            strokeOpacity={SLOT_STROKE_OPACITY[run.state]}
            strokeWidth={CHART_STROKE.structure}
            strokeDasharray={run.state === 'zeroed' ? '2 2' : undefined}
          />
        ),
      )}
      {empty ? (
        <text
          x={f(x + width / 2)}
          y={f(y + OVERVIEW.barH / 2 + 4)}
          textAnchor="middle"
          fontSize={CHART_TYPE.tickPx}
          fill={CHART_STRUCTURE.labelSecondary}
        >
          no way in
        </text>
      ) : null}
    </g>
  );
}

/** The main view: every body under every way, with the chosen way brought forward. */
function Overview({ selected, describedBy }: { selected: StrategyId; describedBy: string }) {
  const hatchId = `${useId().replace(/[^a-zA-Z0-9-]/g, '')}-overview-hatch`;
  const barW = f(COL_W - 2 * OVERVIEW.colPad);
  const handRow = EMBODIMENT_ORDER.indexOf('human-hand');
  const eefCol = STRATEGY_ORDER.indexOf('relative-eef');
  const target: [number, number] = [
    f(colX(eefCol) + OVERVIEW.colPad + barW / 2),
    f(rowY(handRow) + (OVERVIEW.rowH - OVERVIEW.barH) / 2 + OVERVIEW.barH),
  ];
  return (
    <PlotStage
      viewBox={`0 0 ${OVERVIEW.width} ${OVERVIEW_HEIGHT}`}
      aria-label={`Four bodies under three ways of sharing one action list; ${STRATEGIES[selected].label} is selected. Only the shared relative end-effector space fills the human-hand row.`}
      aria-describedby={describedBy}
    >
      <defs>
        <LatentHatch id={hatchId} />
      </defs>
      {STRATEGY_ORDER.map((id, c) => {
        const on = id === selected;
        return (
          <g key={id} data-overview-column={id} data-selected={on ? 'true' : 'false'}>
            {/* The chosen way reads like a chosen tab: its head in ink and its
                bars at full strength, the others muted. No panel behind it. */}
            <text
              x={f(colX(c) + COL_W / 2)}
              y={OVERVIEW.headY}
              textAnchor="middle"
              fontSize={CHART_TYPE.tickPx}
              fill={on ? CHART_STRUCTURE.label : CHART_STRUCTURE.labelSecondary}
            >
              {PLAIN_STRATEGY[id].head.map((line, i) => (
                <tspan key={line} x={f(colX(c) + COL_W / 2)} dy={i === 0 ? 0 : '1.15em'}>
                  {line}
                </tspan>
              ))}
            </text>
            <g opacity={on ? 1 : 0.45}>
              {EMBODIMENT_ORDER.map((body, r) => (
                <MiniBar
                  key={body}
                  strategy={id}
                  embodimentId={body}
                  x={f(colX(c) + OVERVIEW.colPad)}
                  y={f(rowY(r) + (OVERVIEW.rowH - OVERVIEW.barH) / 2)}
                  width={barW}
                  hatchId={hatchId}
                />
              ))}
            </g>
          </g>
        );
      })}
      {EMBODIMENT_ORDER.map((body, r) => {
        const [first, second] = PLAIN_BODY[body];
        const cy = rowY(r) + OVERVIEW.rowH / 2;
        return (
          <g key={body} data-overview-body={body}>
            <text
              x={OVERVIEW.left}
              y={f(cy + (second ? -1 : 4))}
              fontSize={CHART_TYPE.tickPx}
              fill={CHART_STRUCTURE.label}
            >
              <tspan x={OVERVIEW.left}>{first}</tspan>
              {second ? (
                <tspan x={OVERVIEW.left} dy="1.15em">
                  {second}
                </tspan>
              ) : null}
            </text>
          </g>
        );
      })}
      <StageAnnotation
        x={OVERVIEW.width - 4}
        y={NOTE_Y}
        anchor="end"
        lines={["Only this way can a person's", "video fill the robot's slots"]}
        target={target}
        from={[target[0], NOTE_Y - CHART_TYPE.labelPx]}
      />
    </PlotStage>
  );
}

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
      kicker="Cross-embodiment"
      heading="Describe hand motion, not joints, and human videos become usable"
      controls={
        <PresetGroup<StrategyId>
          label="Way to share one action list"
          presets={STRATEGY_ORDER.map((id) => ({ id, label: PLAIN_STRATEGY[id].label }))}
          value={strategyId}
          onChange={setStrategyId}
          testId="ce-strategy"
        />
      }
      adjust={
        <>
          <div className="font-sans text-sm text-text-dim">
            All 32 slots for: <span className="text-text">{strategy.label}</span>
          </div>
          <div className="grid gap-2">
            {EMBODIMENT_ORDER.map((id) => (
              <EmbodimentRow
                key={id}
                strategy={strategyId}
                embodimentId={id}
                describedBy={descriptionId}
              />
            ))}
          </div>
          <InstrumentReadout className="basis-full">
            <span className="text-text-dim">{strategy.label}:</span>{' '}
            <span data-testid="human-video-readout">{strategy.humanVideoVerdict}</span>
          </InstrumentReadout>
          <div data-testid="strategy-detail" className="basis-full font-sans text-[13px]">
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
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
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
          }
        >
          <Overview selected={strategyId} describedBy={descriptionId} />
        </FigureStage>
      }
      caption="Robots have different bodies; describing actions as where the hand moves lets one model learn from many robots and from people on video."
      method={
        <>
          <p>
            A model trained on many robots needs one action list that every body can write into.
            Each bar here is an illustrative 32-slot vector. The robot rows use toy widths: 8
            coordinates for a 7-DoF arm (seven joint targets and a gripper; DoF counts the joints
            that move independently), 16 for two arms with two grippers, and 29 for a humanoid,
            which is not its hardware DoF count. A person on video has no joint targets at all,
            only 3D hand keypoints tracked from the footage.
          </p>
          <p>
            Padding gives each robot its own leading slots and fills the rest with zeros; this toy
            models no adapter for human data. Motion transfer, in the Gemini Robotics 1.5 report,
            aligns embodiments during training; the {LATENT_DIMS} hatched slots are an illustrative
            link, not a disclosed latent. A shared relative end-effector (EEF) space describes
            where the hand or gripper moves relative to where it is, so a tracked human hand can
            fill the same {EEF_SPACE_DIMS} slots. NVIDIA&apos;s GR00T N1.7 README reports
            relative EEF actions shared across robot data and 20K hours of EgoScale human video;
            the EgoScale paper (Zheng 2026) separately uses wrist deltas, retargeted hand joint
            actions and aligned human-robot mid-training. The strips do not implement those
            adapters.
          </p>
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
      source="Original slot illustrations; strip widths and the 8-, 16- and 29-coordinate robot rows are toy choices."
    />
  );
}
