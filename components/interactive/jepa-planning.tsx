'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  ChartAxes,
  LegendSwatch,
  LineTrace,
  PointMarker,
  linearScale,
  roleColour,
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
 */
type JepaPlanningProps = {
  /** Initial search budget in candidate action sequences. Default 24. */
  defaultCandidates?: number;
  className?: string;
};

const W = CHART_VIEW_WIDTH;

/**
 * The plotted window of the synthetic plane. It holds every candidate
 * endpoint and executed state that lib/jepa-planning.ts produces for both
 * goals at every budget, so no mark leaves the frame.
 */
const DOMAIN = { x: [0.04, 0.92], y: [0.2, 1.1] } as const;
const PLANE_INSET = { left: 8, right: 8, top: 26, bottom: 8 } as const;
/** One plane unit in stage units, equal on both axes so distances read true. */
const UNIT = (W - PLANE_INSET.left - PLANE_INSET.right) / (DOMAIN.x[1] - DOMAIN.x[0]);
const PLANE_H = Math.round(
  PLANE_INSET.top + (DOMAIN.y[1] - DOMAIN.y[0]) * UNIT + PLANE_INSET.bottom,
);
const GRID = [0.2, 0.4, 0.6, 0.8, 1];
const GOAL_RING = 9;

const TRACE_H = 168;
const TRACE_PLOT = { left: 50, right: W - 12, top: 26, bottom: TRACE_H - 46 } as const;
const STEP_TICKS = [0, 4, 8, 12];

function px(x: number): number {
  return PLANE_INSET.left + (x - DOMAIN.x[0]) * UNIT;
}

function py(y: number): number {
  return PLANE_INSET.top + (DOMAIN.y[1] - y) * UNIT;
}

function formatDistance(value: number): string {
  return value.toFixed(3);
}

const f = (n: number) => n.toFixed(1);

function PlaneFrame() {
  const left = px(DOMAIN.x[0]);
  const right = px(DOMAIN.x[1]);
  const top = py(DOMAIN.y[1]);
  const bottom = py(DOMAIN.y[0]);
  return (
    <g data-scene-structure="">
      <text
        data-scene-tick=""
        x={left}
        y={13}
        dominantBaseline="middle"
        fontSize={CHART_TYPE.tickPx}
        fill={CHART_STRUCTURE.labelSecondary}
      >
        synthetic embedding plane
      </text>
      {GRID.map((g) => (
        <g key={g}>
          {g > DOMAIN.x[0] && g < DOMAIN.x[1] ? (
            <line data-chart-grid="" x1={f(px(g))} x2={f(px(g))} y1={f(top)} y2={f(bottom)} stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure} opacity={CHART_STRUCTURE.gridOpacity} />
          ) : null}
          {g > DOMAIN.y[0] && g < DOMAIN.y[1] ? (
            <line data-chart-grid="" x1={f(left)} x2={f(right)} y1={f(py(g))} y2={f(py(g))} stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure} opacity={CHART_STRUCTURE.gridOpacity} />
          ) : null}
        </g>
      ))}
      <rect
        x={f(left)}
        y={f(top)}
        width={f(right - left)}
        height={f(bottom - top)}
        fill="none"
        stroke={CHART_STRUCTURE.axes}
        strokeWidth={CHART_STROKE.structure}
        opacity={CHART_STRUCTURE.axesOpacity}
      />
    </g>
  );
}

/** The goal latent, the encoded goal image: a dashed reference ring around a cross. */
function GoalMarker({ point }: { point: LatentPoint }) {
  const x = px(point.x);
  const y = py(point.y);
  return (
    <g data-chart-role="reference">
      <circle
        cx={f(x)}
        cy={f(y)}
        r={GOAL_RING}
        fill="none"
        stroke={roleColour('reference')}
        strokeWidth={CHART_STROKE.reference}
        strokeDasharray={CHART_STROKE.dash}
      />
      <PointMarker x={x} y={y} role="reference" shape="cross" />
    </g>
  );
}

const ACTION = roleColour('action');

/** A candidate as a curve that bows off its chord by the prescribed bend. */
function candidatePath(origin: LatentPoint, c: CandidateSequence): string {
  const end = c.endpoint;
  const nx = -(end.y - origin.y);
  const ny = end.x - origin.x;
  const length = Math.hypot(nx, ny) || 1;
  const qx = (origin.x + end.x) / 2 + (nx / length) * c.bend;
  const qy = (origin.y + end.y) / 2 + (ny / length) * c.bend;
  return `M${f(px(origin.x))} ${f(py(origin.y))} Q${f(px(qx))} ${f(py(qy))} ${f(px(end.x))} ${f(py(end.y))}`;
}

/**
 * Every sequence the last Plan step scored, drawn from the latent that step
 * planned from rather than the latent it reached. The energy minimizer is
 * solid and drawn last, on top of the dashed alternatives.
 */
function CandidateFan({ origin, plan }: { origin: LatentPoint; plan: PlanStepResult }) {
  const chosen = plan.candidates[plan.chosenIndex];
  return (
    <g data-testid="candidate-fan" data-chart-role="action">
      {plan.candidates.map((c, i) =>
        i === plan.chosenIndex ? null : (
          <path
            key={i}
            data-testid="candidate-sequence"
            d={candidatePath(origin, c)}
            fill="none"
            stroke={ACTION}
            strokeOpacity={0.6}
            strokeWidth={CHART_STROKE.reference}
            strokeDasharray={CHART_STROKE.dash}
            strokeLinecap="round"
          />
        ),
      )}
      <path
        data-testid="candidate-sequence"
        d={candidatePath(origin, chosen)}
        fill="none"
        stroke={ACTION}
        strokeWidth={CHART_STROKE.trace}
        strokeLinecap="round"
      />
    </g>
  );
}

const LEGEND = (
  <InstrumentLegend>
    <LegendItem swatch={<LegendSwatch role="reference" mark="cross" />}>goal latent z_goal</LegendItem>
    <LegendItem swatch={<LegendSwatch role="state" mark="dot" />}>current latent z_t</LegendItem>
    <LegendItem swatch={<LegendSwatch role="state" mark="line" />}>executed path</LegendItem>
    <LegendItem swatch={<LegendSwatch role="action" mark="dash" />}>candidate sequences</LegendItem>
    <LegendItem swatch={<LegendSwatch role="action" mark="line" />}>chosen sequence</LegendItem>
  </InstrumentLegend>
);

export function JepaPlanning({
  defaultCandidates = DEFAULT_CANDIDATES,
  className,
}: JepaPlanningProps) {
  const descriptionId = `${useId()}-description`;
  const [candidateCount, setCandidateCount] = useState(defaultCandidates);
  const [goalIndex, setGoalIndex] = useState(0);
  const [history, setHistory] = useState<LatentPoint[]>([INITIAL_STATE]);
  const [lastPlan, setLastPlan] = useState<PlanStepResult | null>(null);

  const goal = GOALS[goalIndex];
  const state = history[history.length - 1];
  const steps = history.length - 1;
  const distance = goalDistance(state, goal.point);
  const initialDistance = goalDistance(INITIAL_STATE, goal.point);
  const reached = distance <= GOAL_TOLERANCE;
  const exhausted = steps >= MAX_STEPS;

  function plan() {
    if (reached || exhausted) return;
    const result = planStep({
      state,
      goal: goal.point,
      stepIndex: steps,
      candidateCount,
    });
    setHistory((h) => [...h, result.next]);
    setLastPlan(result);
  }

  function selectGoal(index: number) {
    setGoalIndex(index);
    setHistory([INITIAL_STATE]);
    setLastPlan(null);
  }

  function reset() {
    setCandidateCount(defaultCandidates);
    setGoalIndex(0);
    setHistory([INITIAL_STATE]);
    setLastPlan(null);
  }

  const distances = history.map((p) => goalDistance(p, goal.point));
  const trace = {
    yTicks: [0, distances[0]],
    yMax: initialDistance * 1.08,
  };
  const traceX = linearScale([0, MAX_STEPS], [TRACE_PLOT.left, TRACE_PLOT.right]);
  const traceY = linearScale([0, trace.yMax], [TRACE_PLOT.bottom, TRACE_PLOT.top]);

  // The plane clause follows what the plane actually renders. At step 0 no
  // search has run, so the fan is empty and the plane holds only the start
  // and the goal; from the first Plan step on it adds the executed path and
  // the scored fan. lastPlan is set by the same click that grows history,
  // so steps >= 1 always has a fan to count.
  const fanCount = lastPlan ? lastPlan.candidates.length : candidateCount;
  const planeClause =
    steps === 0
      ? 'shows the start and goal as two points'
      : `shows the executed path and the candidate fan of ${fanCount} scored sequences`;

  const controls = (
    <>
      <ControlField>
        <ControlLabel htmlFor="jp-budget" value={`${candidateCount} sequences`}>
          Search budget
        </ControlLabel>
        <input
          id="jp-budget"
          type="range"
          data-brand-control-id="control:input"
          min={MIN_CANDIDATES}
          max={MAX_CANDIDATES}
          step={4}
          value={candidateCount}
          onChange={(e) => setCandidateCount(Number(e.target.value))}
          aria-label={`Search budget in candidate action sequences, currently ${candidateCount}`}
          className={INSTRUMENT_SLIDER_CLASS}
        />
      </ControlField>
      <div role="group" aria-label="Goal" className="flex flex-wrap gap-2">
        {GOALS.map((g, i) => (
          <button
            data-brand-control-id="control:selection"
            key={g.id}
            type="button"
            aria-pressed={goalIndex === i}
            onClick={() => selectGoal(i)}
            className={INSTRUMENT_TOGGLE_CLASS}
          >
            {g.label}
          </button>
        ))}
      </div>
      <button
        data-brand-control-id="control:secondary-action"
        data-pagefind-ignore
        type="button"
        onClick={plan}
        disabled={reached || exhausted}
        className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
      >
        Plan step
      </button>
      <InstrumentReset onClick={reset} />
    </>
  );

  // The trace and its readings sit beside the plane once the stage is wide
  // enough, which also keeps the plane from scaling up past legibility. Each
  // drawing keeps its own container so its type scale follows its column.
  const stageBody = (
    <div className="@container">
      <div className="grid gap-x-3 @min-[34rem]:grid-cols-2 @min-[34rem]:items-center">
        <div className="@container">
          <PlotStage
            viewBox={`0 0 ${W} ${PLANE_H}`}
            aria-label={`Latent space planning view. The current latent is at distance ${formatDistance(distance)} from the goal latent after ${steps} planning steps toward ${goal.label}.`}
            aria-describedby={descriptionId}
          >
            <PlaneFrame />
            {lastPlan ? <CandidateFan origin={history[steps - 1]} plan={lastPlan} /> : null}
            {steps > 0 ? (
              <LineTrace points={history.map((p) => [px(p.x), py(p.y)] as const)} role="state" />
            ) : null}
            <GoalMarker point={goal.point} />
            <PointMarker x={px(state.x)} y={py(state.y)} role="state" />
          </PlotStage>
        </div>
        <div className="grid gap-y-2 pb-3">
          <div className="@container">
            <PlotStage
              viewBox={`0 0 ${W} ${TRACE_H}`}
              aria-label={`Goal-embedding distance per planning step. The distance falls from ${formatDistance(initialDistance)} at step 0 to ${formatDistance(distance)} at step ${steps}.`}
              aria-describedby={descriptionId}
            >
              <ChartAxes
                plot={TRACE_PLOT}
                x={traceX}
                y={traceY}
                xTicks={STEP_TICKS}
                yTicks={trace.yTicks}
                formatY={(v) => (v === 0 ? '0' : formatDistance(v))}
                xLabel="planning step"
                yLabel="goal distance"
              />
              {steps > 0 ? (
                <g data-testid="distance-trace">
                  <LineTrace points={distances.map((d, i) => [traceX(i), traceY(d)] as const)} role="value" />
                </g>
              ) : null}
              <PointMarker x={traceX(steps)} y={traceY(distance)} role="value" />
            </PlotStage>
          </div>
          <div data-figure-stage-band="aside" className="grid gap-y-1.5 px-3">
            {LEGEND}
            <InstrumentReadout>
              <span className="text-text-dim">d(z_t, z_goal) =</span>{' '}
              <span data-testid="distance-readout" style={{ color: roleColour('value') }}>
                {formatDistance(distance)}
              </span>{' '}
              <span className="text-text-dim">after planning step</span>{' '}
              <span data-testid="step-readout">{steps}</span>
              {reached ? (
                <>
                  {', '}
                  <span data-testid="goal-reached" className="whitespace-nowrap">
                    goal reached
                  </span>
                </>
              ) : null}
            </InstrumentReadout>
            <ChartDescription
              id={descriptionId}
              form="state"
              summary="Current JEPA planning state"
              description={`At a search budget of ${candidateCount} sequences the current latent sits ${formatDistance(distance)} away from the ${goal.id} goal after ${steps} planning steps; the embedding-space plane ${planeClause}, and the distance strip is ${steps === 0 ? 'a single sample at step 0' : `a falling trace from ${formatDistance(initialDistance)} to ${formatDistance(distance)}`}.`}
              states={[
                { label: 'search budget', value: `${candidateCount} sequences` },
                { label: 'goal', value: goal.label },
                { label: 'steps', value: String(steps) },
                { label: 'distance', value: formatDistance(distance) },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <InstrumentFigure
      figureId="jepa-planning"
      className={className}
      heading="Replanning toward a goal latent"
      controls={controls}
      stage={<FigureStage>{stageBody}</FigureStage>}
      caption="Each Plan step scores every candidate sequence by its predicted distance to the goal latent and executes the closest."
      source={
        <span data-testid="no-decoder-note">
          No pixel decoder is used to select V-JEPA 2-AC control actions; this toy plans over
          synthetic two-dimensional points and loads no trained encoder or predictor.
        </span>
      }
    />
  );
}
