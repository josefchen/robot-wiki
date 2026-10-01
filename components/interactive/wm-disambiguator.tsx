'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  Bar,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  roleColour,
  type ChartRole,
} from '@/components/motion/chart';
import {
  DEFAULT_PARADIGM,
  WM_PARADIGMS,
  WM_USES,
  paradigmById,
  type WmParadigm,
  type WmParadigmId,
} from '@/lib/world-model-taxonomy';
import { cx } from '@/lib/utils';

/**
 * WmDisambiguator: the article's six example groups of world model. Each
 * group is drawn on the stage as two columns, what the model reads now and
 * what it predicts, with rows that line up across groups: the decoded-frame
 * row is where the pixel question shows. The values drawn are illustrative.
 */

const W = CHART_VIEW_WIDTH;
const H = 200;
/** Left edges of the row names, the current-step column and the predicted column. */
const NAME_X = 12;
const NOW_X = 96;
const NEXT_X = 222;
/** The transition arrow between the columns; an action input enters it from below. */
const STEP = { from: 186, to: 214, mid: 200 } as const;
const HEAD_Y = 16;
const CELL = 13;
const CELL_GAP = 3;
const BAR_MAX = 64;
const FRAME_COLS = 6;
const FRAME_ROWS = 5;

/** Fixed activations, so every render draws the same vectors. */
const LATENT_NOW = [0.95, 0.4, 0.75, 0.25, 0.6];
const LATENT_NEXT = [0.7, 0.55, 0.95, 0.3, 0.45];

/** Cell intensities of a coarse frame: a lit 2 by 2 object above a floor row. */
function frameLevels(col: number, row: number): number[] {
  return Array.from({ length: FRAME_COLS * FRAME_ROWS }, (_, i) => {
    const c = i % FRAME_COLS;
    const r = Math.floor(i / FRAME_COLS);
    if (c >= col && c < col + 2 && r >= row && r < row + 2) return 0.95;
    return r === FRAME_ROWS - 1 ? 0.5 : 0.14;
  });
}

const FRAME_NOW = frameLevels(1, 2);
const FRAME_NEXT = frameLevels(2, 1);
/** A decoder's reconstruction of the predicted frame: the same scene at low contrast. */
const FRAME_DECODED = FRAME_NEXT.map((level) => 0.2 + level * 0.35);

type TextProps = {
  x: number;
  y: number;
  anchor?: 'start' | 'middle' | 'end';
  colour?: string;
  children: ReactNode;
};

function Note({ x, y, anchor = 'start', colour = CHART_STRUCTURE.label, children }: TextProps) {
  return (
    <text
      data-scene-note=""
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
      fontSize={CHART_TYPE.axisPx}
      fill={colour}
    >
      {children}
    </text>
  );
}

function Tick({ x, y, anchor = 'start', colour = CHART_STRUCTURE.labelSecondary, children }: TextProps) {
  return (
    <text
      data-scene-tick=""
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
      fontSize={CHART_TYPE.tickPx}
      fill={colour}
    >
      {children}
    </text>
  );
}

function ColumnHeads() {
  return (
    <>
      <Tick x={NOW_X} y={HEAD_Y}>now</Tick>
      <Tick x={NEXT_X} y={HEAD_Y}>predicted</Tick>
    </>
  );
}

function RowName({ y, note, children }: { y: number; note?: string; children: ReactNode }) {
  return (
    <>
      <Note x={NAME_X} y={y}>{children}</Note>
      {note ? <Tick x={NAME_X} y={y + 19}>{note}</Tick> : null}
    </>
  );
}

function Arrow({ x1, y1, x2, y2, colour }: { x1: number; y1: number; x2: number; y2: number; colour: string }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const bx = x2 - 7 * Math.cos(angle);
  const by = y2 - 7 * Math.sin(angle);
  const nx = -Math.sin(angle) * 4;
  const ny = Math.cos(angle) * 4;
  const f = (n: number) => n.toFixed(2);
  return (
    <g>
      <line x1={x1} y1={y1} x2={f(bx)} y2={f(by)} stroke={colour} strokeWidth={CHART_STROKE.trace} strokeLinecap="round" />
      <path d={`M${f(x2)} ${f(y2)} L${f(bx + nx)} ${f(by + ny)} L${f(bx - nx)} ${f(by - ny)} Z`} fill={colour} />
    </g>
  );
}

/** The model's step from the current column to the predicted one. */
function StepArrow({ y }: { y: number }) {
  return (
    <g data-scene-structure="">
      <Arrow x1={STEP.from} y1={y} x2={STEP.to} y2={y} colour={CHART_STRUCTURE.labelSecondary} />
    </g>
  );
}

/**
 * An action the step is taken under: its label below the step, with an
 * arrow up into it and, when the same action drives a second row, one down.
 */
function ActionInput({ y, into, alsoInto, children }: { y: number; into: number; alsoInto?: number; children: ReactNode }) {
  const action = roleColour('action');
  return (
    <g data-chart-role="action">
      <Arrow x1={STEP.mid} y1={y - 15} x2={STEP.mid} y2={into + 7} colour={action} />
      {alsoInto ? <Arrow x1={STEP.mid} y1={y + 12} x2={STEP.mid} y2={alsoInto - 7} colour={action} /> : null}
      <Note x={STEP.mid} y={y} anchor="middle" colour={action}>{children}</Note>
    </g>
  );
}

/** A latent or embedding vector as a row of cells; `outline` draws a dashed goal. */
function Cells({ x, y, levels, role = 'state', outline = false }: { x: number; y: number; levels: readonly number[]; role?: ChartRole; outline?: boolean }) {
  return (
    <g data-chart-role={role}>
      {levels.map((level, i) => (
        <rect
          key={i}
          x={x + i * (CELL + CELL_GAP)}
          y={y - CELL / 2}
          width={CELL}
          height={CELL}
          fill={outline ? 'none' : roleColour(role)}
          fillOpacity={outline ? undefined : level}
          stroke={outline ? roleColour(role) : undefined}
          strokeWidth={outline ? CHART_STROKE.reference : undefined}
          strokeDasharray={outline ? CHART_STROKE.dash : undefined}
        />
      ))}
    </g>
  );
}

/** A coarse frame of pixels; `dashed` edges it as an uncertain reconstruction. */
function Frame({ x, y, levels, role, cell = 12, dashed = false }: { x: number; y: number; levels: readonly number[]; role: ChartRole; cell?: number; dashed?: boolean }) {
  const gap = 2;
  const pitch = cell + gap;
  return (
    <g data-chart-role={role}>
      {levels.map((level, i) => (
        <rect
          key={i}
          x={x + (i % FRAME_COLS) * pitch}
          y={y + Math.floor(i / FRAME_COLS) * pitch}
          width={cell}
          height={cell}
          fill={roleColour(role)}
          fillOpacity={level}
        />
      ))}
      {dashed ? (
        <rect
          x={x - gap}
          y={y - gap}
          width={FRAME_COLS * pitch + gap}
          height={FRAME_ROWS * pitch + gap}
          fill="none"
          stroke={roleColour(role)}
          strokeWidth={CHART_STROKE.reference}
          strokeDasharray={CHART_STROKE.dash}
        />
      ) : null}
    </g>
  );
}

/** A predicted scalar in the value role, its number beside the bar. */
function ValueBar({ y, value, children }: { y: number; value: number; children: ReactNode }) {
  const width = value * BAR_MAX;
  return (
    <>
      <Bar x={NEXT_X} y={y - 6} width={width} height={12} role="value" />
      <text
        data-scene-readout=""
        x={NEXT_X + width + 7}
        y={y}
        dominantBaseline="middle"
        fontSize={CHART_TYPE.readoutPx}
        fill={roleColour('value')}
      >
        {children}
      </text>
    </>
  );
}

const CANDIDATE_YS = [76, 92, 108, 124];
const CANDIDATE_REWARDS = [0.5, 0.65, 0.9, 0.35];
const CHOSEN_CANDIDATE = 2;
const FAN_Y = 100;

/** MPPI's sampled action sequences from the current latent; the best one is solid. */
function CandidateFan() {
  return (
    <g data-chart-role="action">
      {CANDIDATE_YS.map((y, i) => (
        <path
          key={y}
          d={`M${NOW_X} ${FAN_Y} Q${NOW_X + 40} ${FAN_Y + (y - FAN_Y) * 0.15} ${NOW_X + 78} ${y}`}
          fill="none"
          stroke={roleColour('action')}
          strokeWidth={i === CHOSEN_CANDIDATE ? CHART_STROKE.trace : CHART_STROKE.reference}
          strokeDasharray={i === CHOSEN_CANDIDATE ? undefined : CHART_STROKE.dash}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

/** The reward predicted for each candidate, the chosen one at full strength. */
function CandidateRewards() {
  return (
    <g data-chart-role="value">
      {CANDIDATE_YS.map((y, i) => (
        <rect
          key={y}
          data-chart-mark="bar"
          x={NEXT_X}
          y={y - 4.5}
          width={CANDIDATE_REWARDS[i] * BAR_MAX}
          height={9}
          fill={roleColour('value')}
          fillOpacity={i === CHOSEN_CANDIDATE ? 1 : 0.45}
        />
      ))}
      <Tick x={NEXT_X + 66} y={FAN_Y} colour={roleColour('value')}>reward</Tick>
    </g>
  );
}

const OCCUPANCY_COLS = 6;
const OCCUPANCY_ROWS = 3;
const OCCUPANCY_CELL = 11;

/** A 6 by 3 occupancy grid: the table row is occupied, and so is the cup's cell. */
function Occupancy({ x, y, cupRow }: { x: number; y: number; cupRow: number }) {
  const pitch = OCCUPANCY_CELL + 2;
  const top = y - (OCCUPANCY_ROWS * pitch - 2) / 2;
  const cells = Array.from({ length: OCCUPANCY_COLS * OCCUPANCY_ROWS }, (_, i) => ({
    col: i % OCCUPANCY_COLS,
    row: Math.floor(i / OCCUPANCY_COLS),
  }));
  const level = (col: number, row: number) =>
    row === OCCUPANCY_ROWS - 1 ? 0.5 : row === cupRow && col === 2 ? 0.95 : 0;
  return (
    <>
      <g data-scene-structure="" opacity={CHART_STRUCTURE.axesOpacity}>
        {cells
          .filter(({ col, row }) => level(col, row) === 0)
          .map(({ col, row }) => (
            <rect
              key={`${col}-${row}`}
              x={x + col * pitch + 0.5}
              y={top + row * pitch + 0.5}
              width={OCCUPANCY_CELL - 1}
              height={OCCUPANCY_CELL - 1}
              fill="none"
              stroke={CHART_STRUCTURE.axes}
              strokeWidth={CHART_STROKE.structure}
            />
          ))}
      </g>
      <g data-chart-role="state">
        {cells
          .filter(({ col, row }) => level(col, row) > 0)
          .map(({ col, row }) => (
            <rect
              key={`${col}-${row}`}
              x={x + col * pitch}
              y={top + row * pitch}
              width={OCCUPANCY_CELL}
              height={OCCUPANCY_CELL}
              fill={roleColour('state')}
              fillOpacity={level(col, row)}
            />
          ))}
      </g>
    </>
  );
}

/** Four predicted actions emitted as one chunk. */
const ACTION_CHUNK = [0.9, 0.65, 0.8, 0.55];

function LatentDynamicsArt() {
  return (
    <>
      <ColumnHeads />
      <RowName y={44}>latent</RowName>
      <Cells x={NOW_X} y={44} levels={LATENT_NOW} />
      <StepArrow y={44} />
      <Cells x={NEXT_X} y={44} levels={LATENT_NEXT} />
      <ActionInput y={82} into={44}>action</ActionInput>
      <RowName y={104}>reward</RowName>
      <ValueBar y={104} value={0.83}>0.83</ValueBar>
      <RowName y={130}>continue</RowName>
      <ValueBar y={130} value={1}>1</ValueBar>
      <RowName y={162} note="training only">decoded frame</RowName>
      <Frame x={NEXT_X} y={144} levels={FRAME_DECODED} role="state" cell={7} dashed />
    </>
  );
}

function DecoderFreeArt() {
  return (
    <>
      <ColumnHeads />
      <RowName y={44}>latent</RowName>
      <Cells x={NOW_X} y={44} levels={LATENT_NOW} />
      <StepArrow y={44} />
      <Cells x={NEXT_X} y={44} levels={LATENT_NEXT} />
      <RowName y={94} note="MPPI">candidates</RowName>
      <CandidateFan />
      <StepArrow y={FAN_Y} />
      <CandidateRewards />
      <RowName y={162}>decoded frame</RowName>
      <Note x={NEXT_X} y={162} colour={CHART_STRUCTURE.labelSecondary}>no decoder</Note>
    </>
  );
}

function GenerativeVideoArt() {
  return (
    <>
      <ColumnHeads />
      <RowName y={66}>frame</RowName>
      <Frame x={NOW_X} y={32} levels={FRAME_NOW} role="measurement" />
      <StepArrow y={66} />
      <Frame x={NEXT_X} y={32} levels={FRAME_NEXT} role="state" />
      <Tick x={NOW_X} y={116}>pixels in</Tick>
      <Tick x={NEXT_X} y={116}>pixels out</Tick>
      <ActionInput y={162} into={66}>
        <tspan fill={CHART_STRUCTURE.label}>conditioned on </tspan>action / text
      </ActionInput>
    </>
  );
}

function JepaArt() {
  return (
    <>
      <ColumnHeads />
      <RowName y={44}>embedding</RowName>
      <Cells x={NOW_X} y={44} levels={LATENT_NOW} />
      <StepArrow y={44} />
      <Cells x={NEXT_X} y={44} levels={LATENT_NEXT} />
      <RowName y={76}>goal</RowName>
      <Cells x={NEXT_X} y={76} levels={LATENT_NEXT} role="reference" outline />
      <RowName y={108}>distance</RowName>
      <ValueBar y={108} value={0.31}>0.31</ValueBar>
      <RowName y={162}>decoded frame</RowName>
      <Note x={NEXT_X} y={162} colour={CHART_STRUCTURE.labelSecondary}>no decoder</Note>
    </>
  );
}

function WorldActionArt() {
  const structure = CHART_STRUCTURE.labelSecondary;
  return (
    <>
      <ColumnHeads />
      <RowName y={66}>frame</RowName>
      <Frame x={NOW_X} y={32} levels={FRAME_NOW} role="measurement" />
      {/* One backbone forks into the frame head and the action head. */}
      <g data-scene-structure="">
        <Arrow x1={STEP.from} y1={66} x2={STEP.to} y2={66} colour={structure} />
        <line x1={STEP.mid} y1={66} x2={STEP.mid} y2={140} stroke={structure} strokeWidth={CHART_STROKE.trace} />
        <Arrow x1={STEP.mid} y1={140} x2={STEP.to} y2={140} colour={structure} />
      </g>
      <Frame x={NEXT_X} y={32} levels={FRAME_NEXT} role="state" />
      <RowName y={140}>action chunk</RowName>
      <Cells x={NEXT_X} y={140} levels={ACTION_CHUNK} role="action" />
      <Tick x={STEP.mid} y={182} anchor="middle">one backbone, two heads</Tick>
    </>
  );
}

function SymbolicArt() {
  const state = roleColour('state');
  return (
    <>
      <ColumnHeads />
      <RowName y={44}>predicates</RowName>
      <Note x={NOW_X} y={44} colour={state}>on(cup, table)</Note>
      <StepArrow y={44} />
      <Note x={NEXT_X} y={44} colour={state}>in(cup, gripper)</Note>
      <ActionInput y={97} into={44} alsoInto={150}>pick(cup)</ActionInput>
      <RowName y={150}>occupancy</RowName>
      <Occupancy x={NOW_X} y={150} cupRow={1} />
      <StepArrow y={150} />
      <Occupancy x={NEXT_X} y={150} cupRow={0} />
    </>
  );
}

const PANEL_ART: Record<WmParadigmId, () => ReactNode> = {
  'latent-dynamics': LatentDynamicsArt,
  'decoder-free-latent': DecoderFreeArt,
  'generative-video': GenerativeVideoArt,
  jepa: JepaArt,
  'world-action': WorldActionArt,
  symbolic: SymbolicArt,
};

const PANEL_ART_LABEL: Record<WmParadigmId, string> = {
  'latent-dynamics':
    'Latent-dynamics panel art: latent cells, reward scalar, fuzzy reconstruction',
  'decoder-free-latent':
    'Decoder-free panel art: latent cells and MPPI candidate fan',
  'generative-video':
    'Generative-video panel art: predicted frame plus action or text condition',
  jepa: 'JEPA panel art: embedding cells, goal marker, distance meter',
  'world-action':
    'World-action panel art: predicted frame beside an action chunk',
  symbolic: 'Symbolic panel art: predicate list and pick transition',
};

function paradigmTakeaway(p: WmParadigm): string {
  switch (p.id) {
    case 'latent-dynamics':
      return 'Latent-dynamics (Dreamer-style) predicts the next latent, a reward of 0.83 and a continue flag of 1, plus a fuzzy decoded frame used at training only; of the 4 uses, only policy learning is lit.';
    case 'decoder-free-latent':
      return 'Decoder-free latent (TD-MPC-style) predicts the next latent and a reward with no image: 4 MPPI candidates fan from the current latent, each with a predicted reward, and the decoded-frame row reads no decoder; of the 4 uses, policy learning and planning are lit.';
    case 'generative-video':
      return 'Generative video predicts future pixels: the current frame, conditioned on action or text, becomes a predicted frame, pixels in and pixels out; of the 4 uses, policy learning, evaluation, and data generation are lit.';
    case 'jepa':
      return 'JEPA predicts a future embedding, never pixels: the predicted embedding sits at dist 0.31 from the dashed goal embedding, and the decoded-frame row reads no decoder; of the 4 uses, only planning is lit.';
    case 'world-action':
      return 'World-action predicts future frames and an action chunk from one backbone: the current frame forks into a predicted frame and a chunk of 4 actions; of the 4 uses, only policy learning is lit.';
    case 'symbolic':
      return 'Symbolic predicts predicate transitions: on(cup, table) becomes in(cup, gripper) after pick(cup), and the same pick lifts the cup one row in a 6 by 3 occupancy grid; of the 4 uses, only planning is lit.';
  }
}

function PanelArt({
  id,
  hidden,
  describedBy,
}: {
  id: WmParadigmId;
  hidden: boolean;
  describedBy?: string;
}) {
  const Art = PANEL_ART[id];
  return (
    <PlotStage
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden={hidden ? true : undefined}
      role={hidden ? undefined : 'img'}
      aria-label={hidden ? undefined : PANEL_ART_LABEL[id]}
      aria-describedby={hidden ? undefined : describedBy}
      data-testid={`panel-art-${id}`}
    >
      <Art />
    </PlotStage>
  );
}

/** A use the selected group serves is outlined solid; the rest dashed and dim. */
const USE_LINE = {
  served: 'border-solid border-text text-text',
  unserved: 'border-dashed border-border-strong text-text-dim',
} as const;

export function WmDisambiguator({
  defaultParadigm = DEFAULT_PARADIGM,
  className,
}: {
  defaultParadigm?: WmParadigmId;
  className?: string;
}) {
  const descriptionId = `${useId()}-description`;
  const [selectedId, setSelectedId] = useState<WmParadigmId>(defaultParadigm);
  const selected = paradigmById(selectedId);
  const usedFor = selected.uses
    .map((u) => WM_USES.find((x) => x.id === u)?.label)
    .join(', ');

  const reset = () => setSelectedId(DEFAULT_PARADIGM);

  return (
    <InstrumentFigure
      figureId="wm-disambiguator"
      className={className}
      heading="What each world model predicts"
      controls={
        <>
          <div
            role="group"
            aria-label="World-model paradigms"
            className="grid w-full grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3"
          >
            {WM_PARADIGMS.map((p) => (
              <button
                data-brand-control-id="control:selection"
                key={p.id}
                type="button"
                aria-pressed={p.id === selectedId}
                aria-label={`${p.short}: predicts ${p.panelNote}`}
                onClick={() => setSelectedId(p.id)}
                className="group grid content-start justify-items-start gap-1 rounded-xs py-1 text-left font-sans active:translate-y-[1px]"
              >
                <span
                  data-brand-surface-id="surface:flat"
                  className="rounded-xs px-2 py-1 text-sm font-medium text-text underline decoration-border-strong decoration-1 underline-offset-4 transition-colors group-hover:decoration-text group-aria-pressed:bg-highlight group-aria-pressed:text-ink group-aria-pressed:no-underline">
                  {p.short}
                </span>
                <span
                  data-testid={`predicts-${p.id}`}
                  className="px-2 text-[13px] leading-snug text-text-dim group-hover:text-text group-aria-pressed:text-text"
                >
                  {p.predicts}
                </span>
              </button>
            ))}
          </div>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              {/* The pressed button already shows the selection and what it
                  predicts, so the announcement is for assistive technology. */}
              <InstrumentReadout data-testid="wm-live-summary" className="sr-only">
                {'Selected: '}
                <span data-testid="selected-readout">{selected.short}</span>
                {'. Predicts: '}
                <span data-testid="predicts-readout">{selected.predicts}</span>
                {`. ${selected.name}, used for ${usedFor}.`}
              </InstrumentReadout>
              <ChartDescription
                id={descriptionId}
                form="state"
                summary="Current world-model paradigm"
                description={paradigmTakeaway(selected)}
                states={[
                  { label: 'paradigm', value: selected.short },
                  { label: 'predicts', value: selected.predicts },
                  { label: 'space', value: selected.space },
                  { label: 'uses', value: selected.uses.length === 1 ? '1 of 4' : `${selected.uses.length} of 4` },
                ]}
              />
            </>
          }
        >
          {/* The uses sit beside the drawing when the stage is wide enough,
              which also keeps the drawing from scaling up past legibility.
              The drawing keeps its own container so its type scale follows
              the column it sits in, not the whole stage. */}
          <div className="@container">
            <div className="grid items-start gap-x-4 @min-[34rem]:grid-cols-[minmax(0,1fr)_11rem]">
              <div className="@container">
                <PanelArt id={selectedId} hidden={false} describedBy={descriptionId} />
              </div>
              <div
                data-figure-stage-band="aside"
                className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 pb-3 @min-[34rem]:grid @min-[34rem]:content-start @min-[34rem]:justify-items-start @min-[34rem]:pl-0 @min-[34rem]:pt-5"
              >
                <span className="font-sans text-[13px] text-text-dim">Used for</span>
                {/* A role list, not a ul: the article's prose list margins
                    are unlayered and would beat any utility class here. */}
                <div
                  role="list"
                  aria-label="What the selected paradigm is used for"
                  className="flex min-w-0 flex-1 flex-wrap gap-1.5 @min-[34rem]:grid @min-[34rem]:justify-items-start"
                >
                  {WM_USES.map((use) => {
                    const served = selected.uses.includes(use.id);
                    return (
                      <div
                        role="listitem"
                        key={use.id}
                        data-testid={`use-${use.id}`}
                        data-brand-surface-id="surface:flat"
                        data-active={served}
                        className={cx(
                          'rounded-xs border px-2 py-0.5 font-sans text-[13px] leading-snug',
                          served ? USE_LINE.served : USE_LINE.unserved,
                        )}
                      >
                        {use.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </FigureStage>
      }
      caption="Generative video and world-action models predict pixels; the other four groups predict latents, embeddings or symbolic state."
      source="Original schematic; the cells, frames and values drawn are illustrative."
    >
      {/* The unselected groups' drawings stay in the document, hidden and
          aria-hidden: VAL-EDU-037 checks that exactly the selected one is
          exposed as an image. */}
      <div hidden>
        {WM_PARADIGMS.filter((p) => p.id !== selectedId).map((p) => (
          <PanelArt key={p.id} id={p.id} hidden />
        ))}
      </div>
    </InstrumentFigure>
  );
}
