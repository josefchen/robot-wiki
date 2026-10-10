'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  InstrumentFigure,
  InstrumentReset,
  PlotStage,
  PresetGroup,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  StageAnnotation,
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
 * One start frame splits into two imagined futures, one per command. A
 * video model that listens to the action imagines different futures; one
 * that ignores it imagines the same future for both. Visual realism is
 * the same for both models on purpose: only the difference between the
 * two futures tells them apart. All three frames share one scale.
 */
type ActionConditioningProps = {
  /** First command. Default 'push-left'. */
  defaultActionA?: ActionId;
  /** Second command. Default 'lift'. */
  defaultActionB?: ActionId;
  /** Initial video model. Default 'strong' (listens to the action). */
  defaultConditioning?: Conditioning;
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 262;
const FRAME = { w: 150, h: 80 };
const OUTCOME_X = WIDTH - 6 - FRAME.w;
const OUTCOME_Y = { a: 22, b: 130 } as const;
const START = { x: 6, y: (OUTCOME_Y.a + OUTCOME_Y.b + FRAME.h) / 2 - FRAME.h / 2 };
const LABEL_RISE = 7;
const NOTE = { x: 6, y: 234 };

/** Frame-local geometry: the table top, the block and the gripper's reach. */
const SLAB_Y = 58;
const SLAB = 4;
const BLOCK = 22;
const MARGIN = 6;
const SPAN = FRAME.w - 2 * MARGIN - BLOCK;
const RISE = 26;
const FINGER = 11;
const PALM = 4;
const GOAL = { from: 0.04, to: 0.26 };

const blockLeft = (blockX: number) => MARGIN + blockX * SPAN;
const GRIPPER_X = blockLeft(INITIAL_STATE.blockX) + BLOCK / 2;
const tipY = (gripperY: number) => SLAB_Y - BLOCK - 2 - gripperY * RISE;

const MODEL_LABEL: Record<Conditioning, string> = {
  strong: 'Listens to the action',
  weak: 'Ignores the action',
};

function actionLabel(id: ActionId): string {
  return ACTIONS.find((a) => a.id === id)?.label ?? id;
}

/** The frame outline and the table inside it: scenery, not data. */
function FrameScenery({ goalLabel = false }: { goalLabel?: boolean }) {
  const goalX = blockLeft(GOAL.from);
  const goalW = blockLeft(GOAL.to) + BLOCK - goalX;
  const goalH = BLOCK + 6;
  return (
    <>
      <g data-scene-structure="frame">
        <rect
          x={0}
          y={0}
          width={FRAME.w}
          height={FRAME.h}
          fill="none"
          stroke={CHART_STRUCTURE.axes}
          strokeOpacity={CHART_STRUCTURE.axesOpacity}
          strokeWidth={CHART_STROKE.structure}
        />
        <g fill="none" stroke={roleColour('reference')} strokeWidth={CHART_STROKE.structure}>
          <rect x={MARGIN} y={SLAB_Y} width={FRAME.w - 2 * MARGIN} height={SLAB} />
          <path d={`M${MARGIN + 14} ${SLAB_Y + SLAB}V${FRAME.h - 4}M${FRAME.w - MARGIN - 14} ${SLAB_Y + SLAB}V${FRAME.h - 4}`} />
        </g>
      </g>
      <rect
        data-series="goal"
        data-chart-role="reference"
        x={goalX}
        y={SLAB_Y - goalH}
        width={goalW}
        height={goalH}
        fill="none"
        stroke={roleColour('reference')}
        strokeWidth={CHART_STROKE.reference}
        strokeDasharray={CHART_STROKE.dash}
      />
      {goalLabel ? (
        <text
          data-scene-note=""
          x={goalX + goalW / 2}
          y={SLAB_Y - goalH / 2 + CHART_TYPE.axisPx * 0.3}
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

/** A two-finger gripper on a stem that reaches down from the frame top. */
function Gripper({ gripperY, ghost = false }: { gripperY: number; ghost?: boolean }) {
  const tip = tipY(gripperY);
  const palmY = tip - FINGER - PALM;
  const reach = BLOCK / 2 + 4;
  return (
    <g
      data-series={ghost ? 'gripper-earlier' : 'gripper'}
      data-chart-role="action"
      fill="none"
      stroke={roleColour(ghost ? 'reference' : 'action')}
      strokeWidth={ghost ? CHART_STROKE.reference : CHART_STROKE.trace}
      strokeDasharray={ghost ? CHART_STROKE.dash : undefined}
      strokeLinejoin="round"
    >
      {ghost ? null : <line x1={GRIPPER_X} y1={0} x2={GRIPPER_X} y2={palmY} />}
      <path d={`M${GRIPPER_X - reach} ${palmY + PALM + FINGER}V${palmY}H${GRIPPER_X + reach}V${palmY + PALM + FINGER}`} />
    </g>
  );
}

/** A block on the table: the last imagined frame solid, earlier frames faint. */
function Block({ state, final, testId }: { state: SceneState; final: boolean; testId?: string }) {
  return (
    <rect
      data-testid={testId}
      data-series={final ? 'block' : 'block-earlier'}
      data-chart-role="state"
      x={blockLeft(state.blockX)}
      y={SLAB_Y - BLOCK}
      width={BLOCK}
      height={BLOCK}
      fill={final ? roleColour('state') : 'none'}
      stroke={final ? undefined : roleColour('reference')}
      strokeWidth={final ? undefined : CHART_STROKE.reference}
      strokeDasharray={final ? undefined : CHART_STROKE.dash}
    />
  );
}

/** One frame's label, set just above the frame's top edge. */
function FrameLabel({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <text x={x} y={y - LABEL_RISE} fontSize={CHART_TYPE.labelPx} fill={CHART_STRUCTURE.label}>
      {children}
    </text>
  );
}

/** The fork: one stem out of the start frame, one arrowed branch per future. */
function Fork() {
  const fromX = START.x + FRAME.w;
  const fromY = START.y + FRAME.h / 2;
  const splitX = fromX + 8;
  const toX = OUTCOME_X - 3;
  const head = 5;
  return (
    <g data-scene-structure="fork" stroke={CHART_STRUCTURE.axes} strokeOpacity={CHART_STRUCTURE.axesOpacity} fill="none">
      {[OUTCOME_Y.a, OUTCOME_Y.b].map((top) => {
        const toY = top + FRAME.h / 2;
        const angle = Math.atan2(toY - fromY, toX - splitX);
        const left = [toX - head * Math.cos(angle - 0.5), toY - head * Math.sin(angle - 0.5)];
        const right = [toX - head * Math.cos(angle + 0.5), toY - head * Math.sin(angle + 0.5)];
        return (
          <g key={top} strokeWidth={CHART_STROKE.structure}>
            <path d={`M${fromX} ${fromY}H${splitX}L${toX} ${toY}`} />
            <path d={`M${left[0]} ${left[1]}L${toX} ${toY}L${right[0]} ${right[1]}`} strokeLinejoin="round" />
          </g>
        );
      })}
    </g>
  );
}

/** The note on the stage: what the reader should take from the two futures. */
function noteLines(sameAction: boolean, diverged: boolean): readonly [string, string] {
  if (sameAction) return ['Same command twice:', 'the same future, by definition'];
  return diverged
    ? ['Two commands, two different futures:', 'the model is listening']
    : ['Same future for both commands:', 'the model ignored the robot'];
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
  const [conditioning, setConditioning] = useState<Conditioning>(defaultConditioning);

  const framesA = rollout({ action: actionA, conditioning });
  const framesB = rollout({ action: actionB, conditioning });
  const sensitivity = actionSensitivity({ actionA, actionB, conditioning });
  const sameAction = actionA === actionB;
  const diverged = sensitivity > SENSITIVITY_THRESHOLD;
  const nameA = actionLabel(actionA);
  const nameB = actionLabel(actionB);
  const model = MODEL_LABEL[conditioning].toLowerCase();
  const score = sensitivity.toFixed(3);
  const threshold = SENSITIVITY_THRESHOLD.toFixed(2);
  const realism = REALISM_SCORE.toFixed(2);

  const description = sameAction
    ? `Both commands are ${nameA.toLowerCase()}, so the two imagined futures are the same by definition: action sensitivity is ${score} against the ${threshold} threshold, and visual realism stays ${realism} for both models.`
    : `With a model that ${model}, ${nameA.toLowerCase()} and ${nameB.toLowerCase()} lead to ${diverged ? 'different futures' : 'nearly the same future'} across ${ROLLOUT_STEPS} imagined frames: action sensitivity is ${score}, ${diverged ? 'above' : 'below'} the ${threshold} threshold, while visual realism stays ${realism} for both models.`;

  function reset() {
    setActionA(defaultActionA);
    setActionB(defaultActionB);
    setConditioning(defaultConditioning);
  }

  function outcome(panel: 'a' | 'b', frames: SceneState[], name: string) {
    const top = OUTCOME_Y[panel];
    return (
      <g data-testid={`rollout-panel-${panel}`}>
        <FrameLabel x={OUTCOME_X} y={top}>{name}</FrameLabel>
        <g transform={`translate(${OUTCOME_X} ${top})`}>
          <FrameScenery />
          {frames.slice(0, -1).map((state, k) => (
            <Gripper key={`g${k}`} gripperY={state.gripperY} ghost />
          ))}
          {frames.map((state, k) => (
            <Block
              key={k}
              state={state}
              final={k === ROLLOUT_STEPS}
              testId={k === 0 ? undefined : `block-${panel}-${k}`}
            />
          ))}
          <Gripper gripperY={frames[frames.length - 1].gripperY} />
        </g>
      </g>
    );
  }

  const stage = (
    <PlotStage
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-label={`One start frame splits into two imagined futures, ${nameA.toLowerCase()} and ${nameB.toLowerCase()}, from a video model that ${model}. ${noteLines(sameAction, diverged).join(' ')}.`}
      aria-describedby={descriptionId}
    >
      <Fork />
      <g data-testid="initial-frame">
        <FrameLabel x={START.x} y={START.y}>Now</FrameLabel>
        <g transform={`translate(${START.x} ${START.y})`}>
          <FrameScenery goalLabel />
          <Block state={INITIAL_STATE} final />
          <Gripper gripperY={INITIAL_STATE.gripperY} />
        </g>
      </g>
      {outcome('a', framesA, nameA)}
      {outcome('b', framesB, nameB)}
      <g data-testid="action-note">
        <StageAnnotation x={NOTE.x} y={NOTE.y} lines={noteLines(sameAction, diverged)} />
      </g>
    </PlotStage>
  );

  return (
    <InstrumentFigure
      figureId="action-conditioning"
      className={className}
      kicker="The action test"
      heading="A good video model shows different futures for different actions"
      controls={
        <PresetGroup<Conditioning>
          label="Video model"
          presets={[
            { id: 'strong', label: MODEL_LABEL.strong },
            { id: 'weak', label: MODEL_LABEL.weak },
          ]}
          value={conditioning}
          onChange={setConditioning}
          testId="video-model"
        />
      }
      adjust={
        <>
          <PresetGroup<ActionId>
            label="First command"
            presets={ACTIONS.map((a) => ({ id: a.id, label: a.label }))}
            value={actionA}
            onChange={setActionA}
            testId="command-a"
          />
          <PresetGroup<ActionId>
            label="Second command"
            presets={ACTIONS.map((a) => ({ id: a.id, label: a.label }))}
            value={actionB}
            onChange={setActionB}
            testId="command-b"
          />
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage footer={<StageStatus>Illustrative: a toy model, not a trained video model.</StageStatus>}>
          {stage}
        </FigureStage>
      }
      caption="AI video can look realistic yet ignore what the robot does; for planning, the imagined future must change when the action changes."
      method={
        <>
          <p>
            The frame on the left is the shared start: a block on a table, a gripper above it and a
            goal zone on the left. The two frames on the right are what a video model imagines after
            each command, with the {ROLLOUT_STEPS} imagined frames drawn on top of each other, earlier
            ones faint. A model that listens slides the block for a push and raises the gripper for a
            lift. A model that ignores the action imagines the block drifting toward the goal for every
            command, because that is what most successful task videos show.
          </p>
          <p>
            What tells the two models apart is action sensitivity: the average distance between the
            two imagined futures, frame by frame, with block position and gripper height each measured
            from 0 to 1. Above {threshold} the futures genuinely differ. For the current pair it is{' '}
            <span data-testid="sensitivity-readout">{score}</span>. Visual realism is held at{' '}
            <span data-testid="realism-readout">{realism}</span> for both models on purpose: both draw
            equally sharp video, so realism alone cannot show whether a model follows the action.
          </p>
          <p>
            The futures are hand-set for this toy, not produced by a trained video model.
          </p>
          <ChartDescription
            id={descriptionId}
            form="state"
            open
            summary="Current pair of imagined futures"
            description={description}
            states={[
              { label: 'video model', value: model },
              { label: 'first command', value: nameA.toLowerCase() },
              { label: 'second command', value: nameB.toLowerCase() },
              { label: 'action sensitivity', value: score },
              { label: 'visual realism', value: realism },
            ]}
          />
        </>
      }
    />
  );
}
