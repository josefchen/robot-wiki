'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PlotStage,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import {
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  ChartAxes,
  LineTrace,
  PointMarker,
  linearScale,
} from '@/components/motion/chart';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid, Wire } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import {
  HEIGHT as TABLE_HEIGHT,
  PICTURE,
  WIDTH as TABLE_WIDTH,
  easelMatrix,
  tableParts,
  type Part,
} from '@/components/iso/figures/planning-table';
import {
  DEFAULT_CANDIDATES,
  GOALS,
  GOAL_TOLERANCE,
  INITIAL_STATE,
  MAX_CANDIDATES,
  MAX_STEPS,
  MIN_CANDIDATES,
  type LatentPoint,
  type PlanStepResult,
  goalDistance,
  planStep,
} from '@/lib/jepa-planning';

/**
 * Deterministic two-dimensional teaching model for goal-directed replanning,
 * drawn as a planning table. Synthetic points and Euclidean distance are not
 * learned V-JEPA 2 features. Candidate directions, execution perturbation,
 * and contraction are prescribed by lib/jepa-planning.ts. The paper instead
 * plans with L1 feature-map energy and the Cross-Entropy Method
 * (arXiv:2506.09985v1, Section 3.2).
 *
 * A summary is a point on the table: the "now" ring at the left, the goal
 * target at the right, their pictures on easels in front. A probe head,
 * carried on an arm from a gantry bridge, stands on the current summary and
 * sets out one feeler per candidate move, each ending on a pin. The kept
 * pin sits exactly where the model predicts the kept move lands; the other
 * pins keep their side of the goal direction, the common reach and their
 * order, but are spread evenly from 20 degrees past the kept move out to
 * 100 degrees so each stands clear (a display spread; see `fanOf`). The lit feeler and pin are the move the
 * robot keeps; "Plan next move" carries the head along it (eased), and a
 * prick mark records where it really ended up. The table is the toy plane
 * turned so the start-to-pick direction runs along it and scaled uniformly;
 * a rotation and a uniform scale keep every distance's proportion. The
 * figure opens with a few planning steps already taken, so the trail, the
 * fan and the kept move are on show at once.
 */
type JepaPlanningProps = {
  /** Initial search budget in candidate action sequences. Default 24. */
  defaultCandidates?: number;
  className?: string;
};

type GoalId = 'pick' | 'place';

const W = CHART_VIEW_WIDTH;
const BUDGET_STEP = 4;
/** Planning steps already taken when the figure opens, after a reset and after a goal change. */
export const OPENING_STEPS = 2;

const TRACE_H = 124;
const TRACE_PLOT = { left: 48, right: W - 14, top: 28, bottom: 78 } as const;
const STEP_TICKS = [0, 6, 12];
const GAP_TICKS = [0, 100];

const GOAL_PRESET: Record<GoalId, string> = {
  pick: 'Cup in hand',
  place: 'Cup on the shelf',
};

const GOAL_WORDS: Record<GoalId, string> = {
  pick: 'cup in hand',
  place: 'cup on the shelf',
};

const f = (n: number) => n.toFixed(1);

function formatDistance(value: number): string {
  return value.toFixed(3);
}

/** Every state and every scored move of a plan, run for up to `steps` steps. */
function runPlan(goal: LatentPoint, candidateCount: number, steps: number) {
  const history: LatentPoint[] = [INITIAL_STATE];
  const plans: PlanStepResult[] = [];
  for (let i = 0; i < steps; i += 1) {
    const state = history[history.length - 1];
    if (goalDistance(state, goal) <= GOAL_TOLERANCE) break;
    const result = planStep({ state, goal, stepIndex: i, candidateCount });
    history.push(result.next);
    plans.push(result);
  }
  return { history, plans };
}

/** A cup on a picture card: a tapered body with a handle, standing on `bottom` and centred on `cx`. */
function Cup({ cx, bottom }: { cx: number; bottom: number }) {
  const top = bottom - 13;
  return (
    <g>
      <path className="iso-shade" data-shade="0" d={`M${f(cx - 6)} ${f(top)} H${f(cx + 6)} L${f(cx + 5)} ${f(bottom)} H${f(cx - 5)} Z`} />
      <path className="iso-line" data-tone="hi" d={`M${f(cx - 6)} ${f(top)} H${f(cx + 6)} L${f(cx + 5)} ${f(bottom)} H${f(cx - 5)} Z`} />
      <path className="iso-line" data-tone="hi" d={`M${f(cx + 5.6)} ${f(top + 3)} q5 0.5 4.4 4.6 q-0.6 3.2 -5.2 3.4`} />
    </g>
  );
}

/** A two-finger gripper on its wrist; `tip` is where the fingertips end, `span` how wide it is open. Closed outlines. */
function Hand({ cx, tip, span }: { cx: number; tip: number; span: number }) {
  const palm = tip - 10;
  const rect = (x: number, y: number, w: number, h: number) => `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z`;
  return (
    <path
      className="iso-line"
      data-tone="mid"
      d={`M${f(cx)} 0V${f(palm - 3)}${rect(cx - span / 2, palm - 3, span, 3)}${rect(cx - span / 2, palm, 2.6, 10)}${rect(cx + span / 2 - 2.6, palm, 2.6, 10)}`}
    />
  );
}

/** The camera picture the robot starts from, or the picture of its goal, in the card's own units. */
function ScenePicture({ kind }: { kind: 'now' | GoalId }) {
  const table = PICTURE.h - 6;
  return (
    <g data-testid={`picture-${kind}`} data-scene-structure="">
      <path className="iso-shade" data-shade="3" d={`M0 0H${PICTURE.w}V${PICTURE.h}H0Z`} />
      <path className="iso-top" d={`M0 ${table}H${PICTURE.w}V${table + 2.5}H0Z`} />
      <path className="iso-line" data-tone="lo" d={`M0 ${table}H${PICTURE.w}M0 ${table + 2.5}H${PICTURE.w}`} />
      {kind === 'place' ? (
        <path className="iso-line" data-tone="lo" d={`M34 ${table - 17}H${PICTURE.w}M60 ${table - 17}V${table}`} />
      ) : null}
      {kind === 'now' ? (
        <>
          <Cup cx={26} bottom={table} />
          <Hand cx={26} tip={18} span={24} />
        </>
      ) : kind === 'pick' ? (
        <>
          <Cup cx={26} bottom={table - 12} />
          <Hand cx={26} tip={table - 17} span={18} />
        </>
      ) : (
        <>
          <Cup cx={47} bottom={table - 17} />
          <Hand cx={16} tip={16} span={24} />
        </>
      )}
      <path className="iso-line" data-tone="mid" d={`M0 0H${PICTURE.w}V${PICTURE.h}H0Z`} />
    </g>
  );
}

const GROUP_TEST_IDS: Record<string, string> = {
  'candidate-fan': 'candidate-fan',
  'walked-path': 'walked-path',
  'goal-marker': 'goal-marker',
  carriage: 'probe-head',
};

type ViewProps = {
  part: Part;
  slot: (id: Extract<Part, { kind: 'slot' }>['id']) => ReactNode;
  /** While the head glides to its next stand the new fan stays hidden. */
  hidden?: boolean;
  onArrive?: () => void;
};

function PartView({ part, slot, hidden = false, onArrive }: ViewProps) {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        crease={part.crease}
        inner={part.inner ? <Line d={part.inner} tone={part.innerTone ?? 'faint'} /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.kind === 'wire') return <Wire from={part.from} to={part.to} via={part.via} tone={part.tone} />;
  if (part.kind === 'fill') {
    if (part.shade === 'paper') return <path className="iso-fill" d={part.d} />;
    if (part.shade === 'top') return <path className="iso-top" d={part.d} />;
    return <path className="iso-shade" data-shade={part.shade} d={part.d} />;
  }
  if (part.kind === 'slot') return <>{slot(part.id)}</>;
  const { move, ...data } = part.data ?? {};
  const attributes = Object.fromEntries(Object.entries(data).map(([key, value]) => [`data-${key}`, value]));
  const role = part.role === 'feeler' || part.role === 'feeler-kept' ? { 'data-testid': 'candidate-sequence', 'data-candidate': part.role === 'feeler-kept' ? 'kept' : undefined } : { 'data-testid': GROUP_TEST_IDS[part.role] };
  return (
    <g
      {...role}
      data-part={part.role}
      {...attributes}
      style={
        move
          ? {
              transform: move,
              transitionProperty: 'transform, opacity',
              transitionDuration: 'var(--motion-indicate)',
              transitionTimingFunction: 'var(--motion-ease-smooth)',
              opacity: part.role === 'candidate-fan' && hidden ? 0 : undefined,
            }
          : undefined
      }
      className={move ? 'motion-reduce:transition-none' : undefined}
      onTransitionEnd={part.role === 'carriage' ? onArrive : undefined}
    >
      {part.parts.map((child, index) => (
        <PartView key={index} part={child} slot={slot} hidden={hidden} onArrive={onArrive} />
      ))}
    </g>
  );
}

const traceX = linearScale([0, MAX_STEPS], [TRACE_PLOT.left, TRACE_PLOT.right]);
const traceY = linearScale([0, 100], [TRACE_PLOT.bottom, TRACE_PLOT.top]);
const INK = CHART_STRUCTURE.label;
const calm = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();

export function JepaPlanning({
  defaultCandidates = DEFAULT_CANDIDATES,
  className,
}: JepaPlanningProps) {
  const baseId = useId();
  const descriptionId = `${baseId}-description`;
  const budgetId = `${baseId}-budget`;
  const [candidateCount, setCandidateCount] = useState(defaultCandidates);
  const [goalId, setGoalId] = useState<GoalId>('pick');
  const [moves, setMoves] = useState(OPENING_STEPS);
  // True while the carriage glides to the kept move's landing; the next fan opens when it arrives.
  const [gliding, setGliding] = useState(false);

  const goal = GOALS.find((g) => g.id === goalId) ?? GOALS[0];
  const { history } = runPlan(goal.point, candidateCount, moves);
  const steps = history.length - 1;
  const current = history[steps];
  const distance = goalDistance(current, goal.point);
  const initialDistance = goalDistance(INITIAL_STATE, goal.point);
  const reached = distance <= GOAL_TOLERANCE;
  const exhausted = steps >= MAX_STEPS;
  // The fan on the table: the moves the head tries now, from where it stands; none once it has stopped.
  const next = reached || exhausted ? null : planStep({ state: current, goal: goal.point, stepIndex: steps, candidateCount });
  const fanCount = next ? next.candidates.length : 0;
  const gaps = history.map((p) => (100 * goalDistance(p, goal.point)) / initialDistance);
  const gapNow = Math.round(gaps[steps]);

  // If the glide's end is never reported (a tab in the background), the fan still opens.
  useEffect(() => {
    if (!gliding) return;
    const timer = window.setTimeout(() => setGliding(false), 1600);
    return () => window.clearTimeout(timer);
  }, [gliding]);

  function planNext() {
    if (reached || exhausted) return;
    setGliding(!calm());
    setMoves(steps + 1);
  }

  function selectGoal(id: GoalId) {
    setGliding(false);
    setGoalId(id);
    setMoves(OPENING_STEPS);
  }

  function reset() {
    setGliding(false);
    setCandidateCount(defaultCandidates);
    setGoalId('pick');
    setMoves(OPENING_STEPS);
  }

  const parts = tableParts({
    history,
    goal: goal.point,
    candidates: next ? next.candidates.map((c) => c.endpoint) : [],
    kept: next ? next.chosenIndex : -1,
    count: candidateCount,
    minCount: MIN_CANDIDATES,
    maxCount: MAX_CANDIDATES,
    left: distance / initialDistance,
  });

  const slot = (id: Extract<Part, { kind: 'slot' }>['id']) => (
    <g key={id} transform={easelMatrix(id === 'card-now' ? 'now' : 'goal')}>
      <ScenePicture kind={id === 'card-now' ? 'now' : goalId} />
    </g>
  );

  const note = `Each step: try ${candidateCount} possible moves, keep the one closest to the goal`;
  const plane = (
    <AnatomyStage
      viewWidth={TABLE_WIDTH}
      hint={
        <span data-testid="plan-note" data-figure-annotation="">
          {note}
        </span>
      }
      readout={reached ? `goal reached after ${steps} moves` : `move ${steps} · ${gapNow}% of the distance left · ${candidateCount} tried`}
      status="Illustrative: a toy model, not learned robot features."
      data-testid="jepa-planning-stage"
    >
      <IsoFigure
        width={TABLE_WIDTH}
        height={TABLE_HEIGHT}
        label={`A robot plans by comparing compact summaries, drawn as a planning table: the ring for now, cup on the table, and the target for the goal, ${GOAL_WORDS[goalId]}. A probe head on a gantry has made ${steps} moves and ${gapNow}% of the starting distance is left; ${next ? `its ${fanCount} feelers try ${fanCount} moves, and the lit one, closest to the goal, is the move it keeps` : 'it has stopped'}.`}
        describedBy={descriptionId}
      >
        {parts.map((part, index) => (
          <PartView key={index} part={part} slot={slot} hidden={gliding} onArrive={() => setGliding(false)} />
        ))}
      </IsoFigure>
    </AnatomyStage>
  );

  const gapLabelLeft = traceX(steps) > TRACE_PLOT.right - 80;
  const strip = (
    <PlotStage
      viewBox={`0 0 ${W} ${TRACE_H}`}
      aria-label={`Distance left to the goal after each move: it falls from 100% at the start to ${gapNow}% after ${steps} moves.`}
      aria-describedby={descriptionId}
    >
      <ChartAxes
        plot={TRACE_PLOT}
        x={traceX}
        y={traceY}
        xTicks={STEP_TICKS}
        yTicks={GAP_TICKS}
        formatY={(v) => `${v}%`}
        xLabel="moves made"
        yLabel="distance left to the goal"
        grid={false}
      />
      <g data-testid="distance-trace">
        <LineTrace points={gaps.map((g, i) => [traceX(i), traceY(g)] as const)} role="value" />
      </g>
      <PointMarker x={traceX(steps)} y={traceY(gaps[steps])} role="value" />
      <text
        data-testid={reached ? 'goal-reached' : 'gap-label'}
        x={f(traceX(steps) + (gapLabelLeft ? -10 : 10))}
        y={f(traceY(gaps[steps]) - 2)}
        textAnchor={gapLabelLeft ? 'end' : 'start'}
        dominantBaseline="middle"
        fontSize={CHART_TYPE.labelPx}
        fontWeight={600}
        fill={INK}
      >
        {reached ? 'goal reached' : `${gapNow}% left`}
      </text>
    </PlotStage>
  );

  const description = `With ${candidateCount} options tried each step, the current latent sits ${formatDistance(distance)} from the ${goalId} goal after ${steps} planning steps, ${gapNow}% of the starting distance of ${formatDistance(initialDistance)}; the plane shows the walked path ${next ? `and the fan of ${fanCount} tried moves` : 'and the head stopped at the goal'}, and the distance strip falls from 100% to ${gapNow}%.`;

  return (
    <InstrumentFigure
      figureId="jepa-planning"
      className={className}
      kicker="Planning by comparing summaries"
      heading="Robot plans by steering its mental summary toward the goal"
      controls={
        <>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={reached || exhausted ? undefined : planNext}
            aria-disabled={reached || exhausted || undefined}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Plan next move
          </button>
          <ControlField>
            <ControlLabel htmlFor={budgetId} value={`${candidateCount} options`}>
              Options tried each step
            </ControlLabel>
            <input
              id={budgetId}
              type="range"
              data-brand-control-id="control:input"
              min={MIN_CANDIDATES}
              max={MAX_CANDIDATES}
              step={BUDGET_STEP}
              value={candidateCount}
              onChange={(e) => setCandidateCount(Number(e.target.value))}
              aria-label={`Options tried each step, currently ${candidateCount}`}
              aria-valuetext={`${candidateCount} options`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="few" high="many" />
          </ControlField>
        </>
      }
      adjust={
        <>
          <PresetGroup<GoalId>
            label="Goal picture"
            presets={[
              { id: 'pick', label: GOAL_PRESET.pick },
              { id: 'place', label: GOAL_PRESET.place },
            ]}
            value={goalId}
            onChange={selectGoal}
            testId="goal"
          />
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={plane}
      caption="Instead of imagining full video, this robot compares compact summaries of now and the goal, and picks whichever move closes the gap."
      method={
        <>
          <p>
            JEPA, short for joint-embedding predictive architecture, does not predict the next picture
            pixel by pixel. It turns each camera picture into a compact summary, a short list of numbers
            called a latent or embedding, and learns to predict how that summary changes when the robot
            acts. V-JEPA 2-AC plans this way: it compares the summary of what the camera sees now with the
            summary of a goal picture and picks the actions that shrink the difference.
          </p>
          <p data-testid="no-decoder-note">
            No pixel decoder is used to select V-JEPA 2-AC control actions; this toy plans over synthetic
            two-dimensional points and loads no trained encoder or predictor. Each goal is a fixed point
            standing in for an encoded goal picture, and the table is the plane turned so the start-to-pick
            direction runs along it, which changes no distance.
          </p>
          <p>
            On the planning table, the ring at the left is the summary of the picture the camera sees now and
            the target at the right is the summary of the goal picture; both pictures stand on the easels in
            front. The table is the toy plane at one uniform scale, so every distance on it keeps its
            proportion.
          </p>
          <p>
            The probe head stands on the current summary and sets out one feeler for each move it
            tries, each ending on a pin. The lit pin sits exactly where the model predicts the kept move lands,
            closest to the target, and &ldquo;Plan next move&rdquo; carries the head along its feeler.
            Prick marks show where the head really ended up, and the dial on the controller reads the
            distance left.
          </p>
          <p>
            The model&rsquo;s other moves bunch into narrow wings, so for display their pins are spread
            evenly from 20 degrees past the kept move to 100 degrees either side of the goal direction.
            Each pin keeps its side, the common reach and its order, so the spread changes no pin&rsquo;s
            rank and the lit one stays the closest.
          </p>
          <p>
            Each planning step tries {candidateCount} moves, scores each by the straight-line distance
            from where it is predicted to land to the goal, d = &radic;((x &minus; x<sub>goal</sub>)&sup2;
            + (y &minus; y<sub>goal</sub>)&sup2;), keeps the closest and carries it out. The real move lands
            slightly off the predicted one, by a fixed 5% of the distance left, so the robot plans again
            from where it actually is. The distance is now{' '}
            <span data-testid="distance-readout">{formatDistance(distance)}</span> after{' '}
            <span data-testid="step-readout">{steps}</span> planning steps, against{' '}
            {formatDistance(initialDistance)} at the start.
          </p>
          <p>
            With few options even the best one points well away from the goal, so the path zig-zags; with
            many it heads almost straight there. The toy prescribes this by construction, so it measures
            nothing about a real robot. The paper scores moves by the L1 distance between predicted and
            goal feature maps and searches with the Cross-Entropy Method, using 800 samples and ten
            refinement iterations a step (arXiv:2506.09985, Section 3.2).
          </p>
          {strip}
          <ChartDescription
            id={descriptionId}
            form="state"
            open
            summary="Current plan toward the goal"
            description={description}
            states={[
              { label: 'options tried each step', value: String(candidateCount) },
              { label: 'goal', value: GOAL_WORDS[goalId] },
              { label: 'moves made', value: String(steps) },
              { label: 'distance left', value: `${formatDistance(distance)} (${gapNow}% of the start)` },
            ]}
          />
        </>
      }
    />
  );
}
