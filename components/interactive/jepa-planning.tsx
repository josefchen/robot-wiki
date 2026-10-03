'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReset,
  LegendItem,
  PlotStage,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  ChartAxes,
  LegendSwatch,
  LineTrace,
  PointMarker,
  StageAnnotation,
  linearScale,
  roleColour,
  type ChartPoint,
} from '@/components/motion/chart';
import {
  DEFAULT_CANDIDATES,
  GOALS,
  GOAL_TOLERANCE,
  INITIAL_STATE,
  MAX_CANDIDATES,
  MAX_STEPS,
  MIN_CANDIDATES,
  type CandidateSequence,
  type LatentPoint,
  type PlanStepResult,
  goalDistance,
  planStep,
} from '@/lib/jepa-planning';

/**
 * Deterministic two-dimensional teaching model for goal-directed replanning.
 * Synthetic points and Euclidean distance are not learned V-JEPA 2 features.
 * Candidate directions, execution perturbation, and contraction are prescribed
 * by lib/jepa-planning.ts. The paper instead plans with L1 feature-map energy
 * and the Cross-Entropy Method (arXiv:2506.09985v1, Section 3.2).
 *
 * The plane is drawn turned so the goal sits straight to the right of the
 * start; a rotation keeps every distance, and the synthetic axes carry no
 * meaning of their own. The figure opens with a few planning steps already
 * taken, so the path, the moves the last step tried and the one it kept are
 * on screen at once.
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

const PLANE_H = 224;
/** Where the plan itself is drawn; the two pictures sit in the gutters either side. */
const GUTTER = 84;
const PLAN_BOX = { left: GUTTER, right: W - GUTTER, top: 60, bottom: 202 };
const PICTURE = { w: 64, h: 48, inset: 8 };
const NOTE = { x: 8, y: 18 };
/** Just under the note's second line, where its leader leaves for the kept move. */
const NOTE_FOOT = 44;
const GOAL_RING = 9;

const TRACE_H = 124;
const TRACE_PLOT = { left: 48, right: W - 14, top: 28, bottom: 78 } as const;
const STEP_TICKS = [0, 6, 12];
const GAP_TICKS = [0, 100];

/** Picture labels, two short lines each so they fit the gutter at 375px. */
const PICTURE_LABEL: Record<'now' | GoalId, readonly [string, string]> = {
  now: ['Now: cup', 'on table'],
  pick: ['Goal: cup', 'in hand'],
  place: ['Goal: cup', 'on shelf'],
};

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

/** The control point that bows a candidate off its chord by the prescribed bend. */
function bendPoint(origin: LatentPoint, c: CandidateSequence): LatentPoint {
  const end = c.endpoint;
  const nx = -(end.y - origin.y);
  const ny = end.x - origin.x;
  const length = Math.hypot(nx, ny) || 1;
  return { x: (origin.x + end.x) / 2 + (nx / length) * c.bend, y: (origin.y + end.y) / 2 + (ny / length) * c.bend };
}

const BUDGETS = Array.from(
  { length: (MAX_CANDIDATES - MIN_CANDIDATES) / BUDGET_STEP + 1 },
  (_, i) => MIN_CANDIDATES + i * BUDGET_STEP,
);

/**
 * One view per goal: turned so the goal is straight right of the start, and
 * scaled once so every state and every scored move at every budget and step
 * fits the plan box. Both axes share one scale, so distances read true.
 */
function goalView(goal: LatentPoint) {
  const angle = Math.atan2(goal.y - INITIAL_STATE.y, goal.x - INITIAL_STATE.x);
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  const turn = (p: LatentPoint): [number, number] => {
    const dx = p.x - INITIAL_STATE.x;
    const dy = p.y - INITIAL_STATE.y;
    return [c * dx + s * dy, -s * dx + c * dy];
  };
  const seen: [number, number][] = [turn(goal)];
  for (const budget of BUDGETS) {
    const { history, plans } = runPlan(goal, budget, MAX_STEPS);
    history.forEach((p) => seen.push(turn(p)));
    // Only the fan of the last step taken is drawn, and the figure never
    // shows fewer than OPENING_STEPS steps, so earlier fans need no room.
    plans.forEach((plan, i) => {
      if (i < OPENING_STEPS - 1) return;
      plan.candidates.forEach((cand) => {
        seen.push(turn(cand.endpoint), turn(bendPoint(history[i], cand)));
      });
    });
  }
  const us = seen.map(([u]) => u);
  const vs = seen.map(([, v]) => v);
  const [uMin, uMax, vMin, vMax] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
  const boxW = PLAN_BOX.right - PLAN_BOX.left;
  const boxH = PLAN_BOX.bottom - PLAN_BOX.top;
  const unit = Math.min(boxW / (uMax - uMin), boxH / (vMax - vMin));
  const x0 = PLAN_BOX.left + (boxW - unit * (uMax - uMin)) / 2;
  const y0 = PLAN_BOX.top + (boxH - unit * (vMax - vMin)) / 2;
  return (p: LatentPoint): ChartPoint => {
    const [u, v] = turn(p);
    return [x0 + (u - uMin) * unit, y0 + (vMax - v) * unit];
  };
}

const VIEWS: Record<GoalId, (p: LatentPoint) => ChartPoint> = Object.fromEntries(
  GOALS.map((g) => [g.id, goalView(g.point)]),
) as Record<GoalId, (p: LatentPoint) => ChartPoint>;

const INK = CHART_STRUCTURE.label;
const SOFT = CHART_STRUCTURE.labelSecondary;
const ACTION = roleColour('action');

/** A cup: a tapered body with a handle, standing on `bottom` and centred on `cx`. */
function Cup({ cx, bottom }: { cx: number; bottom: number }) {
  const top = bottom - 13;
  return (
    <g>
      <path d={`M${f(cx - 6)} ${f(top)} H${f(cx + 6)} L${f(cx + 5)} ${f(bottom)} H${f(cx - 5)} Z`} fill={INK} />
      <path
        d={`M${f(cx + 5.6)} ${f(top + 3)} q5 0.5 4.4 4.6 q-0.6 3.2 -5.2 3.4`}
        fill="none"
        stroke={INK}
        strokeWidth={1.6}
      />
    </g>
  );
}

/** A two-finger gripper on its wrist; `tip` is where the fingertips end, `span` how wide it is open. */
function Hand({ cx, tip, span, top }: { cx: number; tip: number; span: number; top: number }) {
  const palm = tip - 10;
  return (
    <g fill={SOFT}>
      {palm - 3 > top ? <rect x={f(cx - 1.5)} y={f(top)} width={3} height={f(palm - 3 - top)} /> : null}
      <rect x={f(cx - span / 2)} y={f(palm - 3)} width={f(span)} height={3} rx={1} />
      <rect x={f(cx - span / 2)} y={f(palm)} width={3} height={10} rx={1} />
      <rect x={f(cx + span / 2 - 3)} y={f(palm)} width={3} height={10} rx={1} />
    </g>
  );
}

/** The camera picture the robot starts from, or the picture of its goal. */
function ScenePicture({ kind, x, y }: { kind: 'now' | GoalId; x: number; y: number }) {
  const table = y + PICTURE.h - 4;
  return (
    <g data-testid={`picture-${kind}`} data-scene-structure="">
      <rect x={f(x)} y={f(table)} width={PICTURE.w} height={2.5} fill={SOFT} opacity={0.7} />
      {kind === 'place' ? (
        <g fill={SOFT} opacity={0.7}>
          <rect x={f(x + 34)} y={f(table - 17)} width={30} height={2.5} />
          <rect x={f(x + 60)} y={f(table - 17)} width={2.5} height={17} />
        </g>
      ) : null}
      {kind === 'now' ? (
        <>
          <Cup cx={x + 26} bottom={table} />
          <Hand cx={x + 26} tip={y + 18} span={24} top={y} />
        </>
      ) : kind === 'pick' ? (
        <>
          <Cup cx={x + 26} bottom={table - 12} />
          <Hand cx={x + 26} tip={table - 17} span={18} top={y} />
        </>
      ) : (
        <>
          <Cup cx={x + 47} bottom={table - 17} />
          <Hand cx={x + 16} tip={y + 16} span={24} top={y} />
        </>
      )}
    </g>
  );
}

/** Two short lines under a picture, set flush to the stage edge it sits on. */
function PictureLabel({ lines, x, y, anchor }: { lines: readonly string[]; x: number; y: number; anchor: 'start' | 'end' }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={CHART_TYPE.labelPx} fill={INK}>
      {lines.map((line, i) => (
        <tspan key={line} x={x} dy={i === 0 ? 0 : '1.25em'}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/** The quadratic path of one tried move, bowed off its chord by the prescribed bend. */
function movePath(view: (p: LatentPoint) => ChartPoint, origin: LatentPoint, c: CandidateSequence): string {
  const [x0, y0] = view(origin);
  const [qx, qy] = view(bendPoint(origin, c));
  const [x1, y1] = view(c.endpoint);
  return `M${f(x0)} ${f(y0)} Q${f(qx)} ${f(qy)} ${f(x1)} ${f(y1)}`;
}

/**
 * Every move the last planning step tried, drawn from where that step
 * started. The kept move is solid and drawn last, on top of the dashed
 * alternatives.
 */
function CandidateFan({
  view,
  origin,
  plan,
}: {
  view: (p: LatentPoint) => ChartPoint;
  origin: LatentPoint;
  plan: PlanStepResult;
}) {
  const kept = plan.candidates[plan.chosenIndex];
  return (
    <g data-testid="candidate-fan" data-chart-role="action">
      {plan.candidates.map((c, i) =>
        i === plan.chosenIndex ? null : (
          <path
            key={i}
            data-testid="candidate-sequence"
            d={movePath(view, origin, c)}
            fill="none"
            stroke={ACTION}
            strokeOpacity={0.55}
            strokeWidth={CHART_STROKE.reference}
            strokeDasharray={CHART_STROKE.dash}
            strokeLinecap="round"
          />
        ),
      )}
      <path
        data-testid="candidate-sequence"
        data-candidate="kept"
        d={movePath(view, origin, kept)}
        fill="none"
        stroke={ACTION}
        strokeWidth={CHART_STROKE.trace}
        strokeLinecap="round"
      />
    </g>
  );
}

/** The goal: a dashed reference ring around a cross. */
function GoalMarker({ at }: { at: ChartPoint }) {
  return (
    <g data-testid="goal-marker" data-chart-role="reference">
      <circle
        cx={f(at[0])}
        cy={f(at[1])}
        r={GOAL_RING}
        fill="none"
        stroke={roleColour('reference')}
        strokeWidth={CHART_STROKE.reference}
        strokeDasharray={CHART_STROKE.dash}
      />
      <PointMarker x={at[0]} y={at[1]} role="reference" shape="cross" />
    </g>
  );
}

const LEGEND = (
  <InstrumentLegend>
    <LegendItem series="path" swatch={<LegendSwatch role="state" mark="line" />}>path so far</LegendItem>
    <LegendItem series="tried" swatch={<LegendSwatch role="action" mark="dash" />}>moves tried</LegendItem>
    <LegendItem series="kept" swatch={<LegendSwatch role="action" mark="line" />}>move kept</LegendItem>
  </InstrumentLegend>
);

const traceX = linearScale([0, MAX_STEPS], [TRACE_PLOT.left, TRACE_PLOT.right]);
const traceY = linearScale([0, 100], [TRACE_PLOT.bottom, TRACE_PLOT.top]);

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

  const goal = GOALS.find((g) => g.id === goalId) ?? GOALS[0];
  const view = VIEWS[goalId];
  const { history, plans } = runPlan(goal.point, candidateCount, moves);
  const steps = history.length - 1;
  const distance = goalDistance(history[steps], goal.point);
  const initialDistance = goalDistance(INITIAL_STATE, goal.point);
  const reached = distance <= GOAL_TOLERANCE;
  const exhausted = steps >= MAX_STEPS;
  const lastPlan = plans[steps - 1] ?? null;
  const fanCount = lastPlan ? lastPlan.candidates.length : candidateCount;
  const gaps = history.map((p) => (100 * goalDistance(p, goal.point)) / initialDistance);
  const gapNow = Math.round(gaps[steps]);

  function planNext() {
    if (reached || exhausted) return;
    setMoves(steps + 1);
  }

  function selectGoal(id: GoalId) {
    setGoalId(id);
    setMoves(OPENING_STEPS);
  }

  function reset() {
    setCandidateCount(defaultCandidates);
    setGoalId('pick');
    setMoves(OPENING_STEPS);
  }

  const start = view(INITIAL_STATE);
  const target = view(goal.point);
  const pictureY = start[1] - PICTURE.h / 2;
  const goalPictureX = W - PICTURE.inset - PICTURE.w;
  const labelY = pictureY + PICTURE.h + CHART_TYPE.labelPx * 1.2;
  const kept = lastPlan ? view(lastPlan.candidates[lastPlan.chosenIndex].endpoint) : null;
  const walked = history.map(view);
  const current = walked[steps];
  const structure = {
    stroke: CHART_STRUCTURE.axes,
    strokeOpacity: CHART_STRUCTURE.axesOpacity,
    strokeWidth: CHART_STROKE.structure,
  };

  const plane = (
    <PlotStage
      viewBox={`0 0 ${W} ${PLANE_H}`}
      aria-label={`A robot plans by comparing compact summaries: the dot for now, cup on the table, moves step by step toward the ring for the goal, ${GOAL_WORDS[goalId]}. After ${steps} moves ${gapNow}% of the starting distance is left; the last step tried ${fanCount} moves and kept the one closest to the goal.`}
      aria-describedby={descriptionId}
    >
      <ScenePicture kind="now" x={PICTURE.inset} y={pictureY} />
      <ScenePicture kind={goalId} x={goalPictureX} y={pictureY} />
      <g data-scene-structure="">
        <line x1={f(PICTURE.inset + PICTURE.w + 2)} x2={f(start[0] - 6)} y1={f(start[1])} y2={f(start[1])} {...structure} />
        <line x1={f(target[0] + GOAL_RING + 2)} x2={f(goalPictureX - 2)} y1={f(target[1])} y2={f(target[1])} {...structure} />
      </g>
      <PictureLabel lines={PICTURE_LABEL.now} x={PICTURE.inset} y={labelY} anchor="start" />
      <PictureLabel lines={PICTURE_LABEL[goalId]} x={W - PICTURE.inset} y={labelY} anchor="end" />
      {lastPlan ? <CandidateFan view={view} origin={history[steps - 1]} plan={lastPlan} /> : null}
      <g data-testid="walked-path">
        <LineTrace points={walked} role="state" />
        {walked.slice(0, -1).map(([x, y], i) => (
          <circle key={i} cx={f(x)} cy={f(y)} r={2.5} fill={roleColour('state')} />
        ))}
      </g>
      <GoalMarker at={target} />
      <PointMarker x={current[0]} y={current[1]} role="state" />
      <StageAnnotation
        x={NOTE.x}
        y={NOTE.y}
        lines={[`Each step: try ${candidateCount} possible moves,`, 'keep the one closest to the goal']}
        target={kept ?? undefined}
        from={kept ? [kept[0], NOTE_FOOT] : undefined}
      />
    </PlotStage>
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

  const description = `With ${candidateCount} options tried each step, the current latent sits ${formatDistance(distance)} from the ${goalId} goal after ${steps} planning steps, ${gapNow}% of the starting distance of ${formatDistance(initialDistance)}; the plane shows the walked path and the fan of ${fanCount} tried moves, and the distance strip falls from 100% to ${gapNow}%.`;

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
            onClick={planNext}
            disabled={reached || exhausted}
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
      stage={
        <FigureStage>
          <div className="@container">
            <div className="grid gap-x-4 gap-y-2 @min-[34rem]:grid-cols-2 @min-[34rem]:items-center">
              <div className="@container">{plane}</div>
              <div className="grid gap-y-2 pb-3">
                <div className="@container">{strip}</div>
                <div data-figure-stage-band="aside" className="grid gap-y-1.5 px-3">
                  {LEGEND}
                  <StageStatus>Illustrative: a toy model, not learned robot features.</StageStatus>
                </div>
              </div>
            </div>
          </div>
        </FigureStage>
      }
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
            standing in for an encoded goal picture, and the plane is turned so the goal sits to the right
            of the start, which changes no distance.
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
