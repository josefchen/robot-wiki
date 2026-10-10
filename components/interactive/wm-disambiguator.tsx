'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PlotStage,
  PresetGroup,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import { ArmSketch, GRIPPER_SIZE, armIk } from '@/components/motion/arm-sketch';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
import {
  DEFAULT_PARADIGM,
  WM_PARADIGMS,
  WM_USES,
  paradigmById,
  useLabel,
  type WmParadigm,
  type WmParadigmId,
} from '@/lib/world-model-taxonomy';
import { cx } from '@/lib/utils';

/**
 * WmDisambiguator: what the article's six example groups of world model
 * imagine when a robot arm is about to pick up a cup. The scene now is on
 * the left; on the right are the three forms an imagined next moment can
 * take, a picture, a compressed summary or plain facts, with the selected
 * group's form marked. Every drawing is illustrative.
 */

type Form = 'pictures' | 'summary' | 'facts';

const FORMS: readonly Form[] = ['pictures', 'summary', 'facts'];

const FORM_OF: Record<WmParadigmId, Form> = {
  'latent-dynamics': 'summary',
  'decoder-free-latent': 'summary',
  'generative-video': 'pictures',
  jepa: 'summary',
  'world-action': 'pictures',
  symbolic: 'facts',
};

const FORM_PRESETS: ReadonlyArray<{ id: Form; label: string }> = [
  { id: 'pictures', label: 'Pictures' },
  { id: 'summary', label: 'Summary' },
  { id: 'facts', label: 'Plain facts' },
];

/** Each form as it completes "imagines …". */
const FORM_WORDS: Record<Form, string> = {
  pictures: 'the next picture',
  summary: 'a compressed summary',
  facts: 'plain facts',
};

/** Each form's label on the stage. */
const FORM_LABEL: Record<Form, string> = {
  pictures: 'The next picture',
  summary: 'A compressed summary',
  facts: 'Plain facts',
};

const TAKEAWAY_NAME: Record<WmParadigmId, string> = {
  'latent-dynamics': 'Latent dynamics (Dreamer-style)',
  'decoder-free-latent': 'Decoder-free latent (TD-MPC-style)',
  'generative-video': 'Generative video',
  jepa: 'JEPA',
  'world-action': 'World-action',
  symbolic: 'Symbolic',
};

/** What each group predicts, in the words the takeaway uses. */
const PREDICTS_PLAIN: Record<WmParadigmId, string> = {
  'latent-dynamics':
    'predicts the next latent, a reward and a continue signal, and draws pictures only during training',
  'decoder-free-latent':
    'predicts the next latent and a reward with no decoder, so it never draws a picture',
  'generative-video':
    'predicts future pixels, drawing the next picture from the current frames and an action or text prompt',
  jepa: 'predicts a future representation, never pixels, and plans by its distance to a goal representation',
  'world-action': 'predicts future frames and a chunk of next actions from one backbone',
  symbolic:
    'predicts how predicates, object relations or occupancy change, such as the cup moving into the gripper',
};

/**
 * What each group's button says it predicts. These plain-words notes live
 * here, not in `WM_PARADIGMS`, because an audit proof pins the bytes of
 * `lib/world-model-taxonomy.ts` as the calculation behind the six-group count.
 */
export const PREDICTS_NOTE: Record<WmParadigmId, string> = {
  'latent-dynamics':
    'a compressed summary of the next moment, a reward and a continue signal, drawing pictures only during training',
  'decoder-free-latent': 'a compressed summary and a reward, and never a picture',
  'generative-video': 'the whole next picture, from the picture now and the action',
  jepa: 'a compressed summary that it compares with the goal, and never a picture',
  'world-action': "the next picture and the arm's next few moves, from one backbone",
  symbolic: 'plain facts, such as the cup now being in the gripper',
};

/** The note on the stage for each group, two lines that fit the stage at 375px. */
const NOTE_LINES: Record<WmParadigmId, readonly [string, string]> = {
  'latent-dynamics': ['This model imagines only the summary;', 'it draws pictures only during training'],
  'decoder-free-latent': ['This model never draws the next picture;', 'it only predicts the summary'],
  'generative-video': ['This model draws the whole next picture,', 'shaped by the action it is given'],
  jepa: ['This model never draws the next picture;', "it compares its summary with the goal's"],
  'world-action': ['This model draws the next picture and', "outputs the arm's next few moves with it"],
  symbolic: ['This model writes the next moment as', 'plain facts about the objects'],
};

const W = CHART_VIEW_WIDTH;
const H = 252;
const INK = CHART_STRUCTURE.label;
const SOFT = CHART_STRUCTURE.labelSecondary;
const STATE = roleColour('state');
const ACTION = roleColour('action');
const ACCENT = roleColour('highlight');
/** How strongly a form the selected group does not predict is drawn. */
const FADED = 0.32;

/** The scene now, under its label, with the next action beneath it. */
const NOW = { x: 6, y: 26, w: 128, h: 126 } as const;
const ACTION_Y = 174;
/** Where the fan of arrows to the three forms leaves the scene now. */
const FAN_FROM = { x: NOW.x + NOW.w + 3, y: NOW.y + NOW.h / 2 } as const;
/** The left edge of the three forms. */
const OUT_X = 166;
/** Each form's label baseline, the line its arrow ends on, and its marked band. */
const ROW: Record<Form, { label: number; mid: number; top: number; bottom: number }> = {
  pictures: { label: 17, mid: 57, top: 1, bottom: 94 },
  summary: { label: 112, mid: 130, top: 96, bottom: 142 },
  facts: { label: 162, mid: 185, top: 146, bottom: 204 },
};
const NEXT = { x: OUT_X, y: 26, w: 100, h: 62 } as const;
/** Fixed bead strengths, so every render draws the same summary. */
const BEADS = [0.95, 0.5, 0.8, 0.3, 0.7, 0.45, 0.9];
const BEAD_R = 6.5;
const BEAD_PITCH = 17;
const TAG = { y: 172, h: 26, w: 118 } as const;
const NOTE_Y = 226;

const f = (n: number) => n.toFixed(1);

function Arrow({
  x1,
  y1,
  x2,
  y2,
  colour,
  width = CHART_STROKE.trace,
  dashed = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  colour: string;
  width?: number;
  dashed?: boolean;
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const bx = x2 - 6 * Math.cos(angle);
  const by = y2 - 6 * Math.sin(angle);
  const nx = -Math.sin(angle) * 3.5;
  const ny = Math.cos(angle) * 3.5;
  return (
    <g>
      <line
        x1={f(x1)}
        y1={f(y1)}
        x2={f(bx)}
        y2={f(by)}
        stroke={colour}
        strokeWidth={width}
        strokeDasharray={dashed ? CHART_STROKE.dash : undefined}
        strokeLinecap="round"
      />
      <path d={`M${f(x2)} ${f(y2)} L${f(bx + nx)} ${f(by + ny)} L${f(bx - nx)} ${f(by - ny)} Z`} fill={colour} />
    </g>
  );
}

function StageText({
  x,
  y,
  colour = INK,
  children,
}: {
  x: number;
  y: number;
  colour?: string;
  children: ReactNode;
}) {
  return (
    <text x={x} y={y} fontSize={CHART_TYPE.labelPx} fill={colour}>
      {children}
    </text>
  );
}

/** A cup in outline: a tapered body with a handle, `s` times its base size. */
function Cup({ cx, bottom, s }: { cx: number; bottom: number; s: number }) {
  const top = bottom - 13 * s;
  return (
    <g fill="none" stroke={INK} strokeWidth={CHART_STROKE.structure} strokeLinejoin="round">
      <path d={`M${f(cx - 6 * s)} ${f(top)} H${f(cx + 6 * s)} L${f(cx + 5 * s)} ${f(bottom)} H${f(cx - 5 * s)} Z`} />
      <path
        d={`M${f(cx + 5.6 * s)} ${f(top + 3 * s)} q${f(5 * s)} ${f(0.5 * s)} ${f(4.4 * s)} ${f(4.6 * s)} q${f(-0.6 * s)} ${f(3.2 * s)} ${f(-5.2 * s)} ${f(3.4 * s)}`}
      />
    </g>
  );
}

/**
 * A robot arm on a table beside a cup, drawn into a square hairline box as
 * a thin line drawing: the arm reaches over the cup with its gripper open,
 * or, `lifted`, holds the cup in the air. Sizes follow the box, so the
 * scene reads the same small and large.
 */
function Scene({ x, y, w, h, lifted }: { x: number; y: number; w: number; h: number; lifted: boolean }) {
  const s = Math.min(w / 100, h / 62);
  const table = y + h - 9 * s;
  const cx = x + w * 0.7;
  const cupBottom = lifted ? table - 14 * s : table;
  const cupTop = cupBottom - 13 * s;
  const tipBelowWrist = GRIPPER_SIZE * 1.15;
  const wrist = { x: cx, y: lifted ? cupTop + 5 * s - tipBelowWrist : cupTop - 7 * s - tipBelowWrist };
  const base = { x: x + 18 * s, y: table - 7 * s };
  const link = Math.hypot(wrist.x - base.x, wrist.y - base.y) * 0.66;
  const angles = armIk(base, link, link, wrist, 'up') ?? { shoulder: Math.PI / 3, elbow: -Math.PI / 2 };
  return (
    <g data-scene-structure="">
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure} />
      <g fill="none" strokeWidth={CHART_STROKE.structure}>
        <line x1={f(x + 4)} y1={f(table)} x2={f(x + w - 4)} y2={f(table)} stroke="var(--line-strong)" />
        <rect x={f(base.x - 5 * s)} y={f(base.y)} width={f(10 * s)} height={f(table - base.y)} stroke={INK} />
      </g>
      <Cup cx={cx} bottom={cupBottom} s={s} />
      <ArmSketch base={base} l1={link} l2={link} angles={angles} pointDown />
    </g>
  );
}

/** The compressed summary: a short strip of numbers, drawn as beads. */
function Beads({ marked }: { marked: boolean }) {
  return (
    <g data-chart-role="state" opacity={marked ? undefined : FADED}>
      {BEADS.map((level, i) => (
        <circle
          key={i}
          cx={f(OUT_X + BEAD_R + i * BEAD_PITCH)}
          cy={ROW.summary.mid}
          r={BEAD_R}
          fill={STATE}
          fillOpacity={level}
          stroke={STATE}
          strokeWidth={CHART_STROKE.structure}
        />
      ))}
    </g>
  );
}

/** Plain facts: the next moment written as a statement about the objects. */
function FactTag({ marked }: { marked: boolean }) {
  return (
    <g data-chart-role="state">
      <rect
        x={OUT_X}
        y={TAG.y}
        width={TAG.w}
        height={TAG.h}
        fill="none"
        stroke={STATE}
        strokeOpacity={marked ? undefined : FADED}
        strokeWidth={CHART_STROKE.reference}
      />
      <StageText x={OUT_X + 9} y={TAG.y + TAG.h / 2 + 5} colour={marked ? INK : SOFT}>
        cup in gripper
      </StageText>
    </g>
  );
}

/** The arm's next few moves, which a world-action model outputs with its picture. */
function NextMoves() {
  const x = NEXT.x + NEXT.w + 14;
  return (
    <g data-testid="next-moves" data-chart-role="action">
      {[84, 66, 48].map((y) => (
        <Arrow key={y} x1={x} y1={y} x2={x} y2={y - 12} colour={ACTION} />
      ))}
      <text x={x + 10} y={52} fontSize={CHART_TYPE.labelPx} fill={ACTION}>
        <tspan x={x + 10} dy={0}>next</tspan>
        <tspan x={x + 10} dy="1.25em">moves</tspan>
      </text>
    </g>
  );
}

/** One form's label: dark and bold when it is the selected group's form. */
function FormLabel({ form, marked }: { form: Form; marked: boolean }) {
  return (
    <StageText x={OUT_X} y={ROW[form].label} colour={marked ? INK : SOFT}>
      {FORM_LABEL[form]}
    </StageText>
  );
}

function stageLabel(p: WmParadigm): string {
  return `A robot arm above a cup on a table, about to pick it up, and three forms its imagined next moment can take: the next picture, a compressed summary or plain facts. ${p.short} imagines ${FORM_WORDS[FORM_OF[p.id]]}. ${NOTE_LINES[p.id].join(' ')}.`;
}

/**
 * The stage for one group. Only the selected group's stage is exposed as
 * an image; the others stay in the document, hidden, so each group's
 * drawing is there as text for assistive technology to compare.
 */
function PanelArt({ id, hidden, describedBy }: { id: WmParadigmId; hidden: boolean; describedBy?: string }) {
  const form = FORM_OF[id];
  const band = ROW[form];
  return (
    <PlotStage
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden={hidden ? true : undefined}
      role={hidden ? undefined : 'img'}
      aria-label={hidden ? undefined : stageLabel(paradigmById(id))}
      aria-describedby={hidden ? undefined : describedBy}
      data-testid={`panel-art-${id}`}
      data-form={form}
    >
      <line
        data-chart-role="highlight"
        x1={OUT_X - 8}
        y1={band.top + 4}
        x2={OUT_X - 8}
        y2={band.bottom - 4}
        stroke={ACCENT}
        strokeWidth={CHART_STROKE.trace}
      />
      <StageText x={NOW.x} y={ROW.pictures.label}>
        Now
      </StageText>
      <Scene {...NOW} lifted={false} />
      <text data-chart-role="action" x={NOW.x} y={ACTION_Y} fontSize={CHART_TYPE.labelPx} fill={ACTION}>
        <tspan x={NOW.x} dy={0}>Next action:</tspan>
        <tspan x={NOW.x} dy="1.25em">pick up the cup</tspan>
      </text>
      {FORMS.map((row) => (
        <g key={row} data-scene-structure="" opacity={row === form ? undefined : 0.55}>
          <Arrow
            x1={FAN_FROM.x}
            y1={FAN_FROM.y}
            x2={OUT_X - 5}
            y2={ROW[row].mid}
            colour={row === form ? ACCENT : SOFT}
            width={row === form ? CHART_STROKE.trace : CHART_STROKE.reference}
            dashed={row !== form}
          />
        </g>
      ))}
      <FormLabel form="pictures" marked={form === 'pictures'} />
      <g opacity={form === 'pictures' ? undefined : FADED}>
        <Scene {...NEXT} lifted />
      </g>
      {id === 'world-action' ? <NextMoves /> : null}
      <FormLabel form="summary" marked={form === 'summary'} />
      <Beads marked={form === 'summary'} />
      <FormLabel form="facts" marked={form === 'facts'} />
      <FactTag marked={form === 'facts'} />
      <StageAnnotation x={NOW.x} y={NOTE_Y} lines={NOTE_LINES[id]} />
    </PlotStage>
  );
}

/** "a", "a and b", "a, b and c". */
function inWords(items: readonly string[]): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function usesInWords(p: WmParadigm): string {
  return inWords(p.uses.map((u) => useLabel(u).toLowerCase()));
}

function takeaway(p: WmParadigm): string {
  const form = FORM_OF[p.id];
  const peers = WM_PARADIGMS.filter((q) => FORM_OF[q.id] === form).length;
  const total = WM_PARADIGMS.length;
  const share =
    peers === 1
      ? `the only group of the ${total} that imagines ${FORM_WORDS[form]}`
      : `one of ${peers} groups out of ${total} that imagine ${FORM_WORDS[form]}`;
  return `${TAKEAWAY_NAME[p.id]}, ${share}, ${PREDICTS_PLAIN[p.id]}; of the ${WM_USES.length} uses, it serves ${usesInWords(p)}.`;
}

const USE_LINE = {
  served: 'border-solid border-text text-text',
  unserved: 'border-dashed border-border-strong text-text-dim',
} as const;

/** The four uses, split into the ones the selected group serves and the rest. */
function UsedFor({ selected }: { selected: WmParadigm }) {
  return (
    <div className="grid w-full gap-1.5">
      {[true, false].map((served) => {
        const uses = WM_USES.filter((use) => selected.uses.includes(use.id) === served);
        if (uses.length === 0) return null;
        return (
          <div key={String(served)} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-sans text-sm text-text-dim">{served ? 'Used for' : 'Not used for'}</span>
            {/* A role list, not a ul: the article's prose list margins
                are unlayered and would beat any utility class here. */}
            <div
              role="list"
              aria-label={served ? 'What the selected group is used for' : 'What the selected group is not used for'}
              className="flex min-w-0 flex-1 flex-wrap gap-1.5"
            >
              {uses.map((use) => (
                <div
                  role="listitem"
                  key={use.id}
                  data-testid={`use-${use.id}`}
                  data-brand-surface-id="surface:flat"
                  data-active={served}
                  className={cx(
                    'rounded-none border px-2 py-0.5 font-sans text-[13px] leading-snug',
                    served ? USE_LINE.served : USE_LINE.unserved,
                  )}
                >
                  {use.label}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Method({ selected, descriptionId }: { selected: WmParadigm; descriptionId: string }) {
  const form = FORM_OF[selected.id];
  return (
    <>
      <p>
        On the left is what the robot sees now: an arm above a cup on a table, about to pick the cup
        up. On the right are the three forms an imagined next moment can take: the next picture
        itself, a compressed summary (a short list of numbers, drawn as beads), or plain facts about
        the objects. The marked form is the one the selected group predicts; &ldquo;Adjust
        more&rdquo; lists the six groups and their uses.
      </p>
      <p>What each group predicts and what it is used for:</p>
      {/* A role list, not a ul: the article's prose list margins are
          unlayered and would beat any utility class here. */}
      <div role="list" aria-label="What each example group predicts" className="grid gap-1">
        {WM_PARADIGMS.map((p) => (
          <div role="listitem" key={p.id}>
            <span className="font-medium text-text">{p.name}:</span> {p.predicts}. Used for{' '}
            {usesInWords(p)}.
          </div>
        ))}
      </div>
      <p>
        Dreamer-style models also learn a decoder that turns a summary back into a picture, but they
        use it only as a training signal; TD-MPC-style and JEPA models have no decoder at all. The
        uses are this article&apos;s reading of each group against the survey&apos;s four: policy
        learning, planning, evaluation and data generation.
      </p>
      <p>
        The six groups are this article&apos;s selection, not an exhaustive taxonomy. The arm, the
        cup, the beads and the facts are drawn by hand to show the form each prediction takes; none
        of them is a model&apos;s output.
      </p>
      <ChartDescription
        id={descriptionId}
        form="state"
        open
        summary="Current world-model group"
        description={takeaway(selected)}
        states={[
          { label: 'group', value: selected.short },
          { label: 'imagines', value: FORM_WORDS[form] },
          { label: 'predicts', value: selected.predicts },
          { label: 'used for', value: `${selected.uses.length} of ${WM_USES.length}: ${usesInWords(selected)}` },
        ]}
      />
    </>
  );
}

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
  const form = FORM_OF[selectedId];
  const usedFor = usesInWords(selected);

  // A form picks its first group, unless the selected group already has it.
  const pickForm = (next: Form) => {
    if (next === form) return;
    const first = WM_PARADIGMS.find((p) => FORM_OF[p.id] === next);
    if (first) setSelectedId(first.id);
  };

  return (
    <InstrumentFigure
      figureId="wm-disambiguator"
      className={className}
      kicker="Six kinds of world model"
      heading="Robot imaginations: some predict pictures, others compact summaries"
      controls={
        <PresetGroup<Form>
          label="What it imagines"
          presets={FORM_PRESETS}
          value={form}
          onChange={pickForm}
          testId="imagines"
        />
      }
      adjust={
        <>
          <div
            role="group"
            aria-label="World-model paradigms"
            className="grid w-full grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2"
          >
            {WM_PARADIGMS.map((p) => (
              <button
                data-brand-control-id="control:selection"
                key={p.id}
                type="button"
                aria-pressed={p.id === selectedId}
                aria-label={`${p.short}: predicts ${PREDICTS_NOTE[p.id]}`}
                onClick={() => setSelectedId(p.id)}
                className="group grid content-start justify-items-start gap-1 rounded-none py-1 text-left font-sans"
              >
                <span
                  data-brand-surface-id="surface:flat"
                  className="py-1 text-[13px] text-text-dim underline decoration-transparent decoration-1 underline-offset-4 transition-colors group-hover:text-text group-aria-pressed:text-text group-aria-pressed:decoration-current"
                >
                  {p.short}
                </span>
                <span
                  data-testid={`predicts-${p.id}`}
                  className="text-[13px] leading-snug text-text-dim group-hover:text-text group-aria-pressed:text-text"
                >
                  {`Predicts ${PREDICTS_NOTE[p.id]}`}
                </span>
              </button>
            ))}
          </div>
          <UsedFor selected={selected} />
          <InstrumentReset onClick={() => setSelectedId(defaultParadigm)} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <StageStatus>Illustrative schematic: drawn by hand, not a model&apos;s output.</StageStatus>
              {/* The pressed control already shows the selection, so the
                  announcement is for assistive technology. */}
              <InstrumentReadout data-testid="wm-live-summary" className="sr-only">
                {'Selected: '}
                <span data-testid="selected-readout">{selected.short}</span>
                {`. Imagines ${FORM_WORDS[form]}. Predicts: `}
                <span data-testid="predicts-readout">{selected.predicts}</span>
                {`. ${selected.name}, used for ${usedFor}.`}
              </InstrumentReadout>
            </>
          }
        >
          <PanelArt id={selectedId} hidden={false} describedBy={descriptionId} />
        </FigureStage>
      }
      caption="To plan, a robot imagines what happens next; models differ in whether they imagine full pictures, a compressed summary, or plain facts."
      method={<Method selected={selected} descriptionId={descriptionId} />}
      source="Original schematic; the drawings are illustrative."
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
