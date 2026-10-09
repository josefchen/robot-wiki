'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, InstrumentReset, PlotStage, PresetGroup } from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import { CHART_STRUCTURE, CHART_TYPE, CHART_VIEW_WIDTH, StageAnnotation } from '@/components/motion/chart';
import { RobotDog, robotDogFallen, type DogFeet } from '@/components/motion/robot-dog';
import {
  APPLY_STEP,
  CONTROLLERS,
  DEFAULT_PERTURBATION,
  PERTURBATIONS,
  TRACE_STEPS,
  type ControllerId,
  type ResponseStatus,
} from '@/lib/mpc-vs-rl';

/**
 * MpcVsRl: one quadruped, two controllers, four surprises. The robot that
 * plans ahead (model-based MPC) and the one that learned by practice (a
 * learned sim-RL policy) answer the same surprise differently, and each
 * falls where the other copes: the planner when its model is wrong, the
 * learned policy outside what it practised. The stage draws both robots as
 * each response ends, standing, low or on its back; the one the note talks
 * about is at full ink, the other faint. A verdict table under the stage
 * keeps all four surprises in view.
 *
 * The responses are scripted base-height traces in centimeters, an
 * illustrative teaching model rather than measured hardware data, labeled
 * as such; the traces themselves sit in "How this was made".
 *
 * Interactive contract: deterministic initial render (slippery patch),
 * native buttons (keyboard-accessible), reset control, fixed SVG viewport
 * (no layout shift), no JS-driven motion (selection-only, reduced-motion
 * safe by construction).
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 196;
const GROUND_Y = 144;
/** Each robot is drawn about its own origin on the ground, then scaled into its column. */
const SCALE = 0.9;
const COLUMN_X: Record<ControllerId, number> = { mpc: 88, rl: 250 };
const SEGMENT = 20;
const HIP_Y = -34;
const REAR = -28;
const FRONT = 28;
/** How far the hips sink when the body stays low under the extra weight. */
const SAG = 9;

const f = (v: number) => Number(v.toFixed(2));

type PerturbationId = (typeof PERTURBATIONS)[number]['id'];

/** Each surprise in plain words: what each robot ends up doing, the robot the note is about, and the note. */
const PLAIN: Record<
  string,
  { name: string; focus: ControllerId; degraded?: string; note: readonly string[] }
> = {
  push: {
    name: 'Sideways shove',
    focus: 'rl',
    note: ['Both stay up: a shove is easy', 'to plan for and to practise'],
  },
  'low-friction': {
    name: 'Slippery patch',
    focus: 'mpc',
    note: ['It plans for a grippy floor,', 'so it slips on the patch and falls'],
  },
  payload: {
    name: 'Heavy backpack',
    focus: 'mpc',
    degraded: 'stays up, body sags',
    note: ['It plans as if there is no', 'backpack, so its body sags'],
  },
  'torque-limit': {
    name: 'Weaker motors',
    focus: 'rl',
    degraded: 'stays up, but slower',
    note: ['It never practised with weaker', 'motors, so it falls'],
  },
};

/** What a robot ends up doing, in words: a degraded response is told the way it shows under that surprise. */
function verdict(perturbation: (typeof PERTURBATIONS)[number], id: ControllerId): string {
  const { status } = perturbation[id];
  if (status === 'degraded') return PLAIN[perturbation.id].degraded ?? 'stays up, copes poorly';
  return status === 'recovers' ? 'stays up' : status;
}

/** Each robot named by how it decides, in words a first-time reader already has. */
const NAME: Record<ControllerId, string> = { mpc: 'Plans ahead', rl: 'Learned by practice' };

/** Feet about the robot's own origin: standing square, or splayed when it lies on its back. */
const STANDING: DogFeet = [
  [REAR + 3, 0],
  [REAR, 0],
  [FRONT + 3, 0],
  [FRONT, 0],
];
const SPLAYED: DogFeet = [
  [REAR - 4, -2],
  [REAR - 12, 0],
  [FRONT + 8, -4],
  [FRONT + 16, 0],
];
const FALLEN = robotDogFallen(REAR, FRONT, HIP_Y, 0);
/** Where the arrow leaves the note: just under its last line. */
const ARROW_FROM_Y = 44;
/** The note sits over the robot it is about: from the left edge, or from the right edge. */
const NOTE_PLACE: Record<ControllerId, { x: number; anchor: 'start' | 'end' }> = {
  mpc: { x: 8, anchor: 'start' },
  rl: { x: WIDTH - 8, anchor: 'end' },
};

/**
 * The robot's pose from its scripted response: on its back, sagging under
 * the weight, or standing. `pointAt` is where the note's arrow lands, the
 * middle of its back or of its upturned belly, so the arrow points at the
 * whole robot rather than at a leg or at the air between them.
 */
function poseFor(status: ResponseStatus, perturbation: PerturbationId) {
  if (status === 'falls') {
    return { hipY: HIP_Y, feet: SPLAYED, transform: FALLEN.transform, pointAt: FALLEN.place([0, HIP_Y + 2]) };
  }
  const hipY = status === 'degraded' && perturbation === 'payload' ? HIP_Y + SAG : HIP_Y;
  return { hipY, feet: STANDING, transform: undefined, pointAt: [0, hipY - 17] as const };
}

/** Every surprise with both verdicts, the selected one marked. */
function VerdictTable({ selected }: { selected: PerturbationId }) {
  // Named by aria-label, not a caption: caption words would count against the article's word budget.
  return (
    <table
      data-testid="mpc-verdicts"
      aria-label="Which robot stays up after each surprise"
      className="basis-full border-collapse font-sans text-sm leading-snug text-text"
    >
      <thead>
        <tr className="text-left text-text-dim">
          <th scope="col" className="py-1 pr-3 pl-2 font-normal">Surprise</th>
          <th scope="col" className="py-1 pr-3 font-normal">{NAME.mpc}</th>
          <th scope="col" className="py-1 font-normal">{NAME.rl}</th>
        </tr>
      </thead>
      <tbody>
        {PERTURBATIONS.map((p) => {
          const current = p.id === selected;
          const weight = current ? 'font-semibold' : 'font-normal';
          // Not aria-current: each route exposes exactly one, the navigation's current page.
          // The surprise buttons above already announce the selection.
          return (
            <tr key={p.id} data-selected={current ? '' : undefined}>
              <th scope="row" className={`py-0.5 pr-3 pl-2 text-left ${weight}`}>
                {PLAIN[p.id].name}
              </th>
              <td className={`py-0.5 pr-3 ${weight}`}>{verdict(p, 'mpc')}</td>
              <td className={`py-0.5 ${weight}`}>{verdict(p, 'rl')}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function MpcVsRl({ className }: { className?: string }) {
  const descriptionId = `${useId()}-mpc-description`;
  const [selected, setSelected] = useState<PerturbationId>(DEFAULT_PERTURBATION);
  const perturbation = PERTURBATIONS.find((p) => p.id === selected) ?? PERTURBATIONS[0];
  const plain = PLAIN[perturbation.id];
  const sampleRows = useMemo(
    () =>
      [0, APPLY_STEP, 10, 20, 30, TRACE_STEPS - 1].map((step) => ({
        label: `${step}`,
        values: [perturbation.mpc.trace[step].toFixed(2), perturbation.rl.trace[step].toFixed(2)],
      })),
    [perturbation],
  );

  const mpcEnd = perturbation.mpc.trace[TRACE_STEPS - 1];
  const rlEnd = perturbation.rl.trace[TRACE_STEPS - 1];
  const mpcPeak = Math.max(...perturbation.mpc.trace);
  const rlPeak = Math.max(...perturbation.rl.trace);
  const descriptionText = `After a ${perturbation.label} at step ${APPLY_STEP} the MPC base-height deviation peaks at ${mpcPeak.toFixed(2)} cm and ends at ${mpcEnd.toFixed(2)} cm while the RL policy peaks at ${rlPeak.toFixed(2)} cm and ends at ${rlEnd.toFixed(2)} cm; MPC compute per step ${CONTROLLERS.mpc.compute}, the RL policy is ${CONTROLLERS.rl.compute}, and both traces are an illustrative teaching model rather than measured hardware data.`;

  const [pointX, pointY] = poseFor(perturbation[plain.focus].status, perturbation.id).pointAt;
  const target: [number, number] = [f(COLUMN_X[plain.focus] + pointX * SCALE), f(GROUND_Y + pointY * SCALE)];
  // The arrow drops straight from under the note onto the robot it is about.
  const from: [number, number] = [target[0], ARROW_FROM_Y];

  return (
    <InstrumentFigure
      figureId="mpc-vs-rl"
      className={className}
      kicker="Two ways to stay upright"
      heading="Planning ahead fails on wrong guesses, practice on new surprises"
      controls={
        <PresetGroup
          label="Surprise for the robot"
          presets={PERTURBATIONS.map((p) => ({ id: p.id, label: PLAIN[p.id].name }))}
          value={selected}
          onChange={setSelected}
        />
      }
      adjust={<InstrumentReset onClick={() => setSelected(DEFAULT_PERTURBATION)} />}
      stage={
        <FigureStage
          footer={
            <>
              <VerdictTable selected={perturbation.id} />
              <StageStatus>Illustrative, not measured</StageStatus>
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            data-testid="perturbation-chart"
            aria-label={`${plain.name}: the robot that plans ahead ${verdict(perturbation, 'mpc')}, the robot that learned by practice ${verdict(perturbation, 'rl')}.`}
            aria-describedby={descriptionId}
          >
            <line x1={8} x2={WIDTH - 8} y1={GROUND_Y} y2={GROUND_Y} stroke={CHART_STRUCTURE.axes} strokeWidth={1.5} strokeLinecap="round" />
            {(['mpc', 'rl'] as const).map((id) => {
              const pose = poseFor(perturbation[id].status, perturbation.id);
              const focus = id === plain.focus;
              const x = COLUMN_X[id];
              return (
                <g key={id} data-series={id} data-focus={focus ? '' : undefined}>
                  {/* The robot the note is not about steps back; its words keep their contrast. */}
                  <g transform={`translate(${x} ${GROUND_Y}) scale(${SCALE})`} opacity={focus ? undefined : 0.4}>
                    <RobotDog
                      rear={REAR}
                      front={FRONT}
                      hipY={pose.hipY}
                      feet={pose.feet}
                      segment={SEGMENT}
                      farLegOpacity={1}
                      joints={false}
                      testId={`${id}-robot`}
                      transform={pose.transform}
                    />
                  </g>
                  <text
                    x={x}
                    y={GROUND_Y + 20}
                    textAnchor="middle"
                    fontSize={CHART_TYPE.labelPx}
                    fill={focus ? CHART_STRUCTURE.label : CHART_STRUCTURE.labelSecondary}
                  >
                    <tspan x={x}>{NAME[id]}</tspan>
                    <tspan x={x} dy="1.25em" fontWeight={600} data-testid={`${id}-status`} data-status={perturbation[id].status}>
                      {verdict(perturbation, id)}
                    </tspan>
                  </text>
                </g>
              );
            })}
            <StageAnnotation
              x={NOTE_PLACE[plain.focus].x}
              y={18}
              anchor={NOTE_PLACE[plain.focus].anchor}
              lines={plain.note}
              from={from}
              target={target}
              pointer="arrow"
            />
          </PlotStage>
        </FigureStage>
      }
      caption="Planning ahead relies on guesses about the world, and practice only covers the surprises a robot has already met."
      method={
        <>
          <p>
            {NAME.mpc}: {CONTROLLERS.mpc.name}. Compute per step:{' '}
            <span data-testid="mpc-compute">{CONTROLLERS.mpc.compute}</span>.
          </p>
          <p>
            {NAME.rl}: {CONTROLLERS.rl.name}. Compute per step:{' '}
            <span data-testid="rl-compute">{CONTROLLERS.rl.compute}</span>.
          </p>
          <p>
            Each surprise in the literature&apos;s terms:{' '}
            {PERTURBATIONS.map((p) => `${PLAIN[p.id].name}, ${p.label}`).join('; ')}. The traces are an illustrative
            model of the failure modes the literature reports, not measured hardware data: base-height deviation in
            centimetres over {TRACE_STEPS} control steps, with the surprise at step {APPLY_STEP}. The drawing shows how
            each response ends: standing for &quot;stays up&quot;, on its back for a fall, and sagging or slower
            for a degraded response.
          </p>
          <p data-testid="mpc-annotation">{perturbation.mpc.annotation}</p>
          <p data-testid="rl-annotation">{perturbation.rl.annotation}</p>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Sampled base-height deviation for both controllers"
            rowHeader="step"
            columns={[
              { header: 'MPC (cm)', numeric: true },
              { header: 'RL (cm)', numeric: true },
            ]}
            rows={sampleRows}
            description={descriptionText}
          />
        </>
      }
    />
  );
}
