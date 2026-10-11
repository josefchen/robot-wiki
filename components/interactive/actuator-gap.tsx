'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage, PresetGroup, type Preset } from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  DirectLabel,
  LineTrace,
  StageAnnotation,
  roleColour,
  type ChartPoint,
} from '@/components/motion/chart';
import { RobotDog, robotDogFallen, type DogFeet } from '@/components/motion/robot-dog';
import { useEasedValue } from '@/components/motion/use-eased-value';

/**
 * ActuatorGap: why ANYmal's simulator had to learn how its real motors
 * respond. A policy asks a joint to move; the real series-elastic motor
 * follows late and springs past the target, while an ideal simulated motor
 * arrives at once. Hwangbo and colleagues found that policies trained with
 * ideal or analytical actuator models could not take a single step on the
 * real robot without falling; an actuator network trained on data from
 * the real legs stood in for the motors in simulation, and the policies
 * transferred.
 *
 * The one control is the simulator's motor model. Switching it morphs the
 * simulated response (the accent) from the instant step onto the real
 * curve on the motion curve, and the robot below shows the outcome
 * reported for policies trained each way. The response curves are
 * illustrative; the outcome is the paper's.
 */

type ModelId = 'ideal' | 'learned';
const MODELS: readonly Preset<ModelId>[] = [
  { id: 'ideal', label: 'Ideal, instant' },
  { id: 'learned', label: 'Learned from real legs' },
];
export const DEFAULT_MODEL: ModelId = 'ideal';

/** Time runs from 0 to 1 across the drawing; the command comes at 0.1. */
const COMMAND_AT = 0.1;
/** The illustrative real motor: a short delay, then a springy second-order rise. */
const DELAY = 0.04;
const OMEGA = 30;
const ZETA = 0.45;
export function realMotor(t: number): number {
  const u = t - COMMAND_AT - DELAY;
  if (u <= 0) return 0;
  const wd = OMEGA * Math.sqrt(1 - ZETA * ZETA);
  return 1 - Math.exp(-ZETA * OMEGA * u) * (Math.cos(wd * u) + (ZETA / Math.sqrt(1 - ZETA * ZETA)) * Math.sin(wd * u));
}
export const command = (t: number) => (t >= COMMAND_AT ? 1 : 0);
/** The learned model: the real response as the network predicts it, a hair late. */
const learnedMotor = (t: number) => realMotor(t - 0.006);
/** The simulated motor between the ideal (0) and learned (1) models. */
export const simulatedMotor = (t: number, learned: number) => command(t) + (learnedMotor(t) - command(t)) * learned;

const SAMPLES = Array.from({ length: 201 }, (_, k) => k / 200);
/** Mean gap between the simulated and real responses, as a percentage of the move. */
export function meanGapPercent(learned: number): number {
  const gap = SAMPLES.reduce((sum, t) => sum + Math.abs(simulatedMotor(t, learned) - realMotor(t)), 0) / SAMPLES.length;
  return Math.round(gap * 100);
}

export const OUTCOME: Record<ModelId, string> = {
  ideal: 'falls at its first step',
  learned: 'walks',
};

const WIDTH = 340;
const HEIGHT = 232;
const LEFT = 8;
const RIGHT = 332;
const TOP = 26;
const BASE_Y = 120;
const Y_MAX = 1.3;
const GROUND_Y = 214;
const sx = (t: number) => LEFT + t * (RIGHT - LEFT);
const sy = (v: number) => BASE_Y - (v / Y_MAX) * (BASE_Y - TOP);
const f = (v: number) => Number(v.toFixed(2));
const curve = (fn: (t: number) => number): ChartPoint[] => SAMPLES.map((t) => [f(sx(t)), f(sy(fn(t)))]);
const COMMAND_CURVE: ChartPoint[] = [
  [LEFT, f(sy(0))],
  [f(sx(COMMAND_AT)), f(sy(0))],
  [f(sx(COMMAND_AT)), f(sy(1))],
  [RIGHT, f(sy(1))],
];
const REAL_CURVE = curve(realMotor);

const DOG = { rear: -26, front: 26, hipY: -32, segment: 19 } as const;
const STANDING: DogFeet = [
  [DOG.rear + 3, 0],
  [DOG.rear, 0],
  [DOG.front + 3, 0],
  [DOG.front, 0],
];
const SPLAYED: DogFeet = [
  [DOG.rear - 4, -2],
  [DOG.rear - 12, 0],
  [DOG.front + 8, -4],
  [DOG.front + 16, 0],
];
const FALLEN = robotDogFallen(DOG.rear, DOG.front, DOG.hipY, 0);
/** The fallen drawing's outline estimate leaves its sensor head short of the ground; this rests it there. */
const FALLEN_DROP = 8;
const DOG_X = 62;

function describe(model: ModelId): string {
  const [mine, other] = model === 'ideal' ? [0, 1] : [1, 0];
  return `With the ${model === 'ideal' ? 'ideal, instant' : 'learned'} motor model, the simulated motor differs from the real one by ${meanGapPercent(mine)}% of the move on average in this illustrative response, against ${meanGapPercent(other)}% with the ${model === 'ideal' ? 'learned' : 'ideal'} model; Hwangbo and colleagues report that a policy trained ${model === 'ideal' ? 'with an ideal motor model fails to take a single step on the real ANYmal without falling' : 'with the actuator network learned from data on the real legs walks on the real ANYmal'}.`;
}

export function ActuatorGap({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const source = citationFor('hwangbo-2019');
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const learned = useEasedValue(model === 'learned' ? 1 : 0);
  const accent = roleColour('highlight');
  const settled = model === 'learned' ? learned > 0.5 : learned < 0.5;
  const shownModel: ModelId = settled ? model : model === 'learned' ? 'ideal' : 'learned';
  const fallen = shownModel === 'ideal';

  return (
    <InstrumentFigure
      figureId="actuator-gap"
      className={className}
      kicker="Actuator network"
      heading="Simulated motors must respond like the real ones"
      controls={<PresetGroup label="The simulator's motor model" presets={MODELS} value={model} onChange={setModel} testId="actuator-model" />}
      stage={
        <FigureStage footer={<StageStatus>Illustrative curves; outcome cited</StageStatus>}>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`A joint is told to move. The real motor follows late and springs past the target; the simulated motor ${model === 'ideal' ? 'arrives at once' : 'follows the real curve'}. A robot dog trained this way ${OUTCOME[model]} on the real robot.`}
            aria-describedby={descriptionId}
            data-testid="actuator-stage"
          >
            <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
              <line x1={LEFT} y1={BASE_Y} x2={RIGHT} y2={BASE_Y} />
            </g>
            <text data-scene-axis="" x={RIGHT} y={BASE_Y + 6} dominantBaseline="hanging" textAnchor="end" fontSize={CHART_TYPE.axisPx} fill={CHART_STRUCTURE.labelSecondary}>
              time after the command
            </text>
            <g data-series="command">
              <LineTrace points={COMMAND_CURVE} role="reference" />
            </g>
            <text x={f(sx(0.42))} y={f(sy(1) - 8)} fontSize={CHART_TYPE.labelPx} fill="var(--role-reference-text)">
              commanded position
            </text>
            <g data-series="real">
              <LineTrace points={REAL_CURVE} role="state" />
            </g>
            <DirectLabel x={f(sx(0.36))} y={f(sy(realMotor(0.36)) + 18)}>
              real motor
            </DirectLabel>
            <g data-series="simulated" data-testid="actuator-simulated" data-model={model} data-chart-role="highlight">
              <path
                d={curve((t) => simulatedMotor(t, learned)).map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')}
                fill="none"
                stroke={accent}
                strokeWidth={CHART_STROKE.trace + 0.5}
                strokeLinejoin="round"
              />
            </g>
            <StageAnnotation
              x={f(sx(COMMAND_AT) + 8)}
              y={TOP - 8}
              lines={[model === 'ideal' ? 'Simulated motor: instant' : 'Simulated motor now follows the real one']}
            />
            <line x1={LEFT} y1={GROUND_Y} x2={RIGHT} y2={GROUND_Y} stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure} />
            <g data-testid="actuator-robot" data-outcome={model === 'ideal' ? 'falls' : 'walks'} data-drawn={fallen ? 'falls' : 'walks'} transform={`translate(${DOG_X} ${GROUND_Y})`}>
              <RobotDog
                rear={DOG.rear}
                front={DOG.front}
                hipY={DOG.hipY}
                feet={fallen ? SPLAYED : STANDING}
                segment={DOG.segment}
                farLegOpacity={1}
                joints={false}
                testId="actuator-dog"
                transform={fallen ? `translate(0 ${FALLEN_DROP}) ${FALLEN.transform}` : undefined}
              />
            </g>
            <DirectLabel x={DOG_X + 56} y={GROUND_Y - 22}>
              On the real robot:
            </DirectLabel>
            <DirectLabel x={DOG_X + 56} y={GROUND_Y - 6}>
              {OUTCOME[shownModel]}
            </DirectLabel>
          </PlotStage>
        </FigureStage>
      }
      caption="A policy trained with ideal simulated motors fell at ANYmal's first step; a learned motor model let it walk."
      method={
        <>
          <div>
            ANYmal&apos;s joints are series-elastic: a spring sits between the motor and the leg, so a commanded move
            arrives late and overshoots. Hwangbo and colleagues trained an actuator network that predicts each
            joint&apos;s torque from its recent position errors and velocities, using data from exciting the real
            legs and pushing the robot by hand, and used it in place of the motors in simulation. Policies trained
            with ideal or analytical actuator models failed to take a single step without falling.
          </div>
          <div>
            The response curves are illustrative, drawn to show the shape of a springy motor, not ANYmal&apos;s
            measured response. The robot shows the outcome the paper reports for each way of training.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="How far the simulated motor is from the real one"
            description={describe(model)}
            rowHeader="motor model in simulation"
            columns={[{ header: 'average gap to the real motor (% of the move)', numeric: true }, { header: 'on the real robot' }]}
            rows={MODELS.map((m) => ({
              label: m.label,
              values: [String(meanGapPercent(m.id === 'ideal' ? 0 : 1)), OUTCOME[m.id]],
            }))}
          />
        </>
      }
      source={
        <span data-testid="actuator-source">
          {source ? (
            <a data-brand-control-id="control:link-focus" href={source.url} target="_blank" rel="noopener" className="underline-offset-2">
              {source.label}
            </a>
          ) : (
            'Hwangbo and colleagues'
          )}
          .
        </span>
      }
    />
  );
}
