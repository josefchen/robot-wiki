'use client';

import { useId, useState, type ReactNode } from 'react';
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
import { FigureStage } from '@/components/motion/figure-frame';
import {
  LegendSwatch,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_UNCERTAINTY,
  CHART_VIEW_WIDTH,
  roleColour,
} from '@/components/motion/chart';
import {
  ACTIONS,
  INITIAL_STATE,
  REALISM_SCORE,
  ROLLOUT_STEPS,
  SENSITIVITY_THRESHOLD,
  actionSensitivity,
  rollout,
  type ActionId,
  type Conditioning,
  type SceneState,
} from '@/lib/action-conditioning';

/**
 * Two rollouts from one initial frame under two actions. Strong
 * conditioning makes the futures diverge; weak conditioning collapses both
 * onto the same intention-consistent outcome. Visual realism stays fixed
 * in both modes on purpose: a weakly conditioned model still renders
 * plausible video, so only the action-sensitivity score separates them.
 * Every lane shares the start frame's scale so block positions compare
 * vertically.
 */
type ActionConditioningProps = {
  /** Action for rollout A. Default 'push-left'. */
  defaultActionA?: ActionId;
  /** Action for rollout B. Default 'lift'. */
  defaultActionB?: ActionId;
  /** Initial conditioning state. Default 'strong'. */
  defaultConditioning?: Conditioning;
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;
const LANE_HEIGHT = 64;
const LABEL_X = 16;
const LABEL_Y = 45;
const TABLE = { left: 134, right: WIDTH - 18, y: 56 };
const BLOCK_SIZE = 14;
// Units per normalized table position. The weak-conditioning futures end
// 0.012 apart, which must stay within a unit or two on screen.
const BLOCK_SPAN = 150;
const BLOCK_ORIGIN = 140;
const GRIPPER_RISE = 32;
const GOAL = { from: 0.04, to: 0.34, height: 18 };

const blockLeft = (blockX: number) => BLOCK_ORIGIN + blockX * BLOCK_SPAN;
const gripperBottom = (gripperY: number) => TABLE.y - BLOCK_SIZE - gripperY * GRIPPER_RISE;
const GRIPPER_X = blockLeft(INITIAL_STATE.blockX) + BLOCK_SIZE / 2;

function actionLabel(id: ActionId): string {
  return ACTIONS.find((a) => a.id === id)?.label ?? id;
}

/** The table, the dashed goal zone and, on the shared start, the goal label. */
function Tabletop({ labelGoal = false }: { labelGoal?: boolean }) {
  const left = blockLeft(GOAL.from);
  const width = blockLeft(GOAL.to) - left;
  return (
    <>
      <line
        data-scene-structure="table"
        x1={TABLE.left}
        x2={TABLE.right}
        y1={TABLE.y}
        y2={TABLE.y}
        stroke={CHART_STRUCTURE.axes}
        strokeWidth={CHART_STROKE.structure}
        opacity={CHART_STRUCTURE.axesOpacity}
      />
      <rect
        data-series="goal"
        data-chart-role="reference"
        x={left}
        y={TABLE.y - GOAL.height}
        width={width}
        height={GOAL.height}
        fill="none"
        stroke={roleColour('reference')}
        strokeWidth={CHART_STROKE.reference}
        strokeDasharray={CHART_STROKE.dash}
      />
      {labelGoal ? (
        <text
          data-scene-note=""
          x={left + width / 2}
          y={TABLE.y - GOAL.height - 6}
          textAnchor="middle"
          fontSize={CHART_TYPE.axisPx}
          fill={CHART_STRUCTURE.labelSecondary}
        >
          goal
        </text>
      ) : null}
    </>
  );
}

/** The gripper: a stem and two fingers, bottom edge at the given height. */
function Gripper({ gripperY }: { gripperY: number }) {
  const y = gripperBottom(gripperY);
  const action = roleColour('action');
  return (
    <g data-series="gripper" data-chart-role="action">
      <line
        x1={GRIPPER_X}
        x2={GRIPPER_X}
        y1={y - 13}
        y2={y - 4}
        stroke={action}
        strokeWidth={CHART_STROKE.trace + 0.5}
      />
      <path
        d={`M${GRIPPER_X - 6} ${y + 3}V${y - 4}H${GRIPPER_X + 6}V${y + 3}`}
        fill="none"
        stroke={action}
        strokeWidth={CHART_STROKE.trace - 0.5}
        strokeLinejoin="round"
      />
    </g>
  );
}

/** A predicted block: the last frame solid, earlier frames faint. */
function Block({ state, final, testId }: { state: SceneState; final: boolean; testId?: string }) {
  return (
    <rect
      data-testid={testId}
      data-series={final ? 'block' : 'block-earlier'}
      data-chart-role="state"
      x={blockLeft(state.blockX)}
      y={TABLE.y - BLOCK_SIZE}
      width={BLOCK_SIZE}
      height={BLOCK_SIZE}
      fill={roleColour('state')}
      fillOpacity={final ? 1 : CHART_UNCERTAINTY.fillAlpha}
    />
  );
}

function LaneLabel({ children }: { children: ReactNode }) {
  return (
    <text x={LABEL_X} y={LABEL_Y} fontSize={CHART_TYPE.labelPx} fill={CHART_STRUCTURE.label}>
      {children}
    </text>
  );
}

export function ActionConditioning({
  defaultActionA = 'push-left',
  defaultActionB = 'lift',
  defaultConditioning = 'strong',
  className,
}: ActionConditioningProps) {
  const descriptionId = `${useId()}-description`;
  const [actionA, setActionA] = useState<ActionId>(defaultActionA);
  const [actionB, setActionB] = useState<ActionId>(defaultActionB);
  const [conditioning, setConditioning] =
    useState<Conditioning>(defaultConditioning);

  const framesA = rollout({ action: actionA, conditioning });
  const framesB = rollout({ action: actionB, conditioning });
  const sensitivity = actionSensitivity({ actionA, actionB, conditioning });
  const realism = REALISM_SCORE;

  const sameAction = actionA === actionB;
  const diverged = sensitivity > SENSITIVITY_THRESHOLD;
  const verdict = sameAction
    ? 'Same action in both rollouts: identical futures by definition.'
    : diverged
      ? 'The futures diverge: the model responds to the action.'
      : 'The futures stay near-identical: the model follows task intent and ignores the action.';

  function reset() {
    setActionA(defaultActionA);
    setActionB(defaultActionB);
    setConditioning(defaultConditioning);
  }

  function actionGroup(
    panel: 'a' | 'b',
    current: ActionId,
    set: (a: ActionId) => void,
  ) {
    const name = panel.toUpperCase();
    return (
      <div
        role="group"
        aria-label={`Rollout ${name} action`}
        className="flex flex-wrap items-center gap-2"
      >
        <span aria-hidden="true" className="font-sans text-[13px] text-text-dim">
          {name}
        </span>
        {ACTIONS.map((a) => (
          <button
            data-brand-control-id="control:selection"
            key={a.id}
            type="button"
            aria-pressed={current === a.id}
            aria-label={`${a.label} for rollout ${name}`}
            title={a.description}
            onClick={() => set(a.id)}
            className={INSTRUMENT_TOGGLE_CLASS}
          >
            {a.label}
          </button>
        ))}
      </div>
    );
  }

  function lane(panel: 'a' | 'b', action: ActionId, frames: SceneState[]) {
    const name = panel.toUpperCase();
    return (
      <div data-testid={`rollout-panel-${panel}`} className="@container">
        <PlotStage
          viewBox={`0 0 ${WIDTH} ${LANE_HEIGHT}`}
          aria-label={`Rollout ${name}: predicted frames under the action ${actionLabel(action)}, ${conditioning} conditioning.`}
          aria-describedby={descriptionId}
        >
          <LaneLabel>
            {name}: {actionLabel(action).toLowerCase()}
          </LaneLabel>
          <Tabletop />
          {frames.slice(1).map((state, i) => (
            <Block
              key={i + 1}
              state={state}
              final={i + 1 === ROLLOUT_STEPS}
              testId={`block-${panel}-${i + 1}`}
            />
          ))}
          <Gripper gripperY={frames[frames.length - 1].gripperY} />
        </PlotStage>
      </div>
    );
  }

  const initialFrame = (
    <div
      data-testid="initial-frame"
      className="@container @min-[640px]:row-span-2 @min-[640px]:self-center"
    >
      <PlotStage
        viewBox={`0 0 ${WIDTH} ${LANE_HEIGHT}`}
        aria-label="Shared initial frame: a block centered on a table with a gripper above it and a goal zone marked on the left."
        aria-describedby={descriptionId}
      >
        <LaneLabel>start</LaneLabel>
        <Tabletop labelGoal />
        <Block state={INITIAL_STATE} final />
        <Gripper gripperY={INITIAL_STATE.gripperY} />
      </PlotStage>
    </div>
  );

  return (
    <InstrumentFigure
      figureId="action-conditioning"
      className={className}
      heading="Two actions fork one predicted future"
      controls={
        <>
          <div role="group" aria-label="Conditioning strength" className="flex flex-wrap gap-2">
            <button
              data-brand-control-id="control:selection"
              type="button"
              aria-pressed={conditioning === 'strong'}
              onClick={() => setConditioning('strong')}
              className={INSTRUMENT_TOGGLE_CLASS}
            >
              Strong conditioning
            </button>
            <button
              data-brand-control-id="control:selection"
              type="button"
              aria-pressed={conditioning === 'weak'}
              onClick={() => setConditioning('weak')}
              className={INSTRUMENT_TOGGLE_CLASS}
            >
              Weak conditioning
            </button>
          </div>
          {actionGroup('a', actionA, setActionA)}
          {actionGroup('b', actionB, setActionB)}
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="block" swatch={<LegendSwatch role="state" mark="bar" />}>
                  predicted block
                </LegendItem>
                <LegendItem series="block-earlier" swatch={<LegendSwatch role="state" mark="band" />}>
                  earlier frames
                </LegendItem>
                <LegendItem series="gripper" swatch={<LegendSwatch role="action" mark="line" />}>
                  commanded gripper
                </LegendItem>
                <LegendItem series="goal" swatch={<LegendSwatch role="reference" mark="dash" />}>
                  goal zone
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                action sensitivity S ={' '}
                <span data-testid="sensitivity-readout" style={{ color: roleColour('measurement') }}>
                  {sensitivity.toFixed(3)}
                </span>{' '}
                (threshold {SENSITIVITY_THRESHOLD.toFixed(2)}), visual realism R ={' '}
                <span data-testid="realism-readout">{realism.toFixed(2)}</span> in both modes.{' '}
                {verdict}
              </InstrumentReadout>
              <ChartDescription
                id={descriptionId}
                form="state"
                summary="Current action-conditioning pair"
                description={
                  diverged
                    ? `Under ${conditioning} conditioning, ${actionLabel(actionA).toLowerCase()} and ${actionLabel(actionB).toLowerCase()} diverge across ${ROLLOUT_STEPS} predicted frames from the shared initial pose; action sensitivity is ${sensitivity.toFixed(3)} against the ${SENSITIVITY_THRESHOLD.toFixed(2)} threshold while visual realism stays ${realism.toFixed(2)} in both modes.`
                    : `Under ${conditioning} conditioning, ${actionLabel(actionA).toLowerCase()} and ${actionLabel(actionB).toLowerCase()} stay near-identical across ${ROLLOUT_STEPS} predicted frames from the shared initial pose; action sensitivity is ${sensitivity.toFixed(3)} against the ${SENSITIVITY_THRESHOLD.toFixed(2)} threshold while visual realism stays ${realism.toFixed(2)} in both modes.`
                }
                states={[
                  { label: 'conditioning', value: conditioning },
                  { label: 'rollout A', value: actionLabel(actionA).toLowerCase() },
                  { label: 'rollout B', value: actionLabel(actionB).toLowerCase() },
                  { label: 'sensitivity', value: sensitivity.toFixed(3) },
                  { label: 'realism', value: realism.toFixed(2) },
                ]}
              />
            </>
          }
        >
          <div className="grid @min-[640px]:grid-cols-2">
            {initialFrame}
            {lane('a', actionA, framesA)}
            {lane('b', actionB, framesB)}
          </div>
        </FigureStage>
      }
      caption="Strong conditioning makes the two actions predict different futures; weak conditioning predicts the same future for both."
      source="Illustrative toy with hand-set futures. S is the mean per-frame distance between the two rollouts; realism R is fixed."
    />
  );
}
