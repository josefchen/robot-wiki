'use client';

import { useId, useState } from 'react';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import { CHART_STRUCTURE, CHART_TYPE, CHART_VIEW_WIDTH, StageAnnotation, roleColour } from '@/components/motion/chart';
import { RobotDog, robotDogFallen, type DogFeet } from '@/components/motion/robot-dog';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PlotStage,
} from '@/components/ui/instrument';
import { EUREKA_GENERATIONS, EUREKA_TASK, diffLines } from '@/lib/eureka';
import { scrollRegionAttributes } from '@/lib/scroll-region.mjs';
import { cx } from '@/lib/utils';

/**
 * EurekaLoop: a scripted replay of Eureka's evolutionary reward-design
 * loop for a quadruped walking task, shown one round at a time. The stage
 * draws what the robot did under all three rounds' rewards, this round's
 * robot at full ink; under it sit the plain-words results and the note the
 * next reward follows from. The reward code, the statistics as the
 * language model saw them (time at the target speed among them), its full
 * reflection and the line diff sit in "How this was made".
 *
 * The generations are a scripted illustration of the mechanism, labeled
 * as such, not a recording of a real Eureka run.
 *
 * Interactive contract: deterministic initial render (generation 0),
 * native buttons (keyboard-accessible), reset control, no animation at all
 * (reduced-motion safe by construction), fixed SVG viewport.
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 176;
const GROUND_Y = 130;
/** Each round's robot is drawn about its own origin on the ground, then scaled into its column. */
const SCALE = 0.8;
const COLUMN_X = [56, 170, 284] as const;
const SEGMENT = 20;
const HIP_Y = -34;
const REAR = -28;
const FRONT = 28;

const f = (v: number) => Number(v.toFixed(2));

/** What the robot does under each generation's reward, drawn and said in plain words. */
type Outcome = 'falls' | 'stands' | 'walks';

/** Each generation's reward, results and reflection in plain words; the numbers are lib/eureka's. */
const PLAIN: readonly {
  outcome: Outcome;
  /** The outcome under the robot, in two words at most. */
  label: string;
  note: readonly string[];
  rules: string;
  results: readonly (readonly [string, string])[];
  next: string;
}[] = [
  {
    outcome: 'falls',
    label: 'falls',
    note: ['Points only for speed:', 'it runs too fast and falls'],
    rules: 'Points for speed, and nothing else.',
    results: [
      ['Speed', '2.8 metres a second (target: 1.0 metres a second)'],
      ['Falls', 'in every practice run, within half a second'],
    ],
    next: 'Only speed earns points, so it sprints into a fall. Next: points for staying up, and a fall costs points.',
  },
  {
    outcome: 'stands',
    label: 'never walks',
    note: ['Points for staying up too:', 'it stands still and never walks'],
    rules: 'Points for speed and for staying up; a fall costs 5 points.',
    results: [
      ['Speed', 'almost zero (target: 1.0 metres a second)'],
      ['Falls', 'none; every practice run lasts the full 20 seconds'],
    ],
    next: 'Standing still now scores best. Next: points for moving at the target speed, smoothly.',
  },
  {
    outcome: 'walks',
    label: 'walks',
    note: ['Points for the right speed:', 'it walks at the target speed'],
    rules:
      'Points for staying near the target speed and for staying up; a fall costs 5 points, and jerky moves cost a little.',
    results: [
      ['Speed', 'off the target by 0.12 metres a second on average'],
      ['Falls', 'in 2% of practice runs; the rest last the full 20 seconds'],
    ],
    next: 'Close to the target speed. Only small fixes are left.',
  },
];

/** Feet for each outcome, about the robot's own origin: splayed (it lies on its back), standing square, mid-trot. */
const FEET: Record<Outcome, DogFeet> = {
  falls: [
    [REAR - 4, -2],
    [REAR - 12, 0],
    [FRONT + 8, -4],
    [FRONT + 16, 0],
  ],
  stands: [
    [REAR + 3, 0],
    [REAR, 0],
    [FRONT + 3, 0],
    [FRONT, 0],
  ],
  walks: [
    [REAR + 13, -6],
    [REAR - 8, 0],
    [FRONT - 5, 0],
    [FRONT + 10, -6],
  ],
};

const FALLEN = robotDogFallen(REAR, FRONT, HIP_Y, 0);
/** Where the arrow leaves the note: just under its last line. */
const ARROW_FROM_Y = 44;

/**
 * Where the note's arrow lands: on the middle of the robot's back, or of
 * its upturned belly when it lies on its back, so it points at the whole
 * robot rather than at a leg or at the air between them.
 */
function onRobot(round: number): [number, number] {
  const [x, y] = PLAIN[round].outcome === 'falls' ? FALLEN.place([0, HIP_Y + 2]) : [0, HIP_Y - 17];
  return [f(COLUMN_X[round] + x * SCALE), f(GROUND_Y + y * SCALE)];
}

/** The note sits over this round's column: from the left edge, centred, or from the right edge. */
const NOTE_PLACE = [
  { x: 8, anchor: 'start' },
  { x: COLUMN_X[1], anchor: 'middle' },
  { x: WIDTH - 8, anchor: 'end' },
] as const;

const DIFF_STYLE: Record<'same' | 'add' | 'del', string> = {
  same: 'border-l-2 border-transparent pl-2 text-text-dim',
  add: 'border-l-2 border-ok bg-ok/10 pl-2 text-ok',
  del: 'border-l-2 border-err bg-err/10 pl-2 text-err line-through',
};

const DIFF_PREFIX: Record<'same' | 'add' | 'del', string> = { same: '  ', add: '+ ', del: '- ' };

/** The status words the statistics carried in the scripted run. */
const TONE_WORD: Record<'ok' | 'warn' | 'err', string> = { ok: 'ok', warn: 'watch', err: 'fail' };

const CODE_BLOCK_CLASS =
  'm-0! overflow-x-auto rounded-[7px] border-0 bg-[var(--paper-deep,var(--color-surface-2))] px-4 py-3.5 font-mono text-[13px] leading-relaxed text-text';

/**
 * All three rounds side by side, so the whole loop reads at once: this
 * round's robot at full ink, the others faint, and the note pointing at it.
 */
function RoundDrawing({ gen }: { gen: number }) {
  const target = onRobot(gen);
  // The arrow drops straight from under the note onto this round's robot.
  const from: [number, number] = [target[0], ARROW_FROM_Y];
  return (
    <>
      <line x1={8} x2={WIDTH - 8} y1={GROUND_Y} y2={GROUND_Y} stroke={CHART_STRUCTURE.axes} strokeWidth={1.5} strokeLinecap="round" />
      {PLAIN.map(({ outcome, label }, round) => {
        const current = round === gen;
        const x = COLUMN_X[round];
        return (
          <g key={outcome} data-series="robot" data-round={round + 1} data-outcome={current ? outcome : undefined}>
            {/* Only the drawing fades: faded words would fail their contrast. */}
            <g transform={`translate(${x} ${GROUND_Y}) scale(${SCALE})`} opacity={current ? undefined : 0.3}>
              <RobotDog
                rear={REAR}
                front={FRONT}
                hipY={HIP_Y}
                feet={FEET[outcome]}
                segment={SEGMENT}
                farLegOpacity={1}
                joints={false}
                testId={current ? 'eureka-robot' : `eureka-robot-round-${round + 1}`}
                transform={outcome === 'falls' ? FALLEN.transform : undefined}
              />
            </g>
            <text
              x={x}
              y={GROUND_Y + 20}
              textAnchor="middle"
              fontSize={CHART_TYPE.labelPx}
              fontWeight={current ? 600 : 400}
              fill={current ? CHART_STRUCTURE.label : CHART_STRUCTURE.labelSecondary}
            >
              <tspan x={x}>Round {round + 1}</tspan>
              <tspan x={x} dy="1.25em">
                {label}
              </tspan>
            </text>
          </g>
        );
      })}
      <StageAnnotation
        x={NOTE_PLACE[gen].x}
        y={18}
        anchor={NOTE_PLACE[gen].anchor}
        lines={PLAIN[gen].note}
        from={from}
        target={target}
        pointer="arrow"
      />
    </>
  );
}

/** The round in plain words: the rules the AI wrote, what the robot did, and the AI's note. */
function RoundStory({ gen }: { gen: number }) {
  const { rules, results, next } = PLAIN[gen];
  return (
    <div className="grid basis-full gap-x-6 gap-y-3 font-sans text-sm leading-snug text-text sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)]">
      <div>
        <div className="text-text-dim">Rules the AI wrote</div>
        <p data-testid="eureka-rules" className="m-0 mt-1">{rules}</p>
      </div>
      <div>
        <div className="text-text-dim">What the robot did</div>
        <dl data-testid="eureka-results" className="m-0 mt-1 grid gap-0.5">
          {results.map(([label, value]) => (
            <div key={label}>
              <dt className="inline text-text-dim">{label}: </dt>
              <dd className="m-0 inline">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <div className="text-text-dim">The AI&apos;s note</div>
        <p data-testid="eureka-note" className="m-0 mt-1">{next}</p>
      </div>
    </div>
  );
}

export function EurekaLoop({ className }: { className?: string }) {
  // Both code blocks scroll horizontally, so each one is a region named by the label above it.
  const codeLabelId = `${useId()}-code`;
  const diffLabelId = `${useId()}-diff`;
  const [gen, setGen] = useState(0);
  const current = EUREKA_GENERATIONS[gen];
  const rounds = EUREKA_GENERATIONS.length;
  const isLast = gen === rounds - 1;
  const diff = gen > 0 ? diffLines(EUREKA_GENERATIONS[gen - 1].code, current.code) : null;

  return (
    <InstrumentFigure
      figureId="eureka-loop"
      className={className}
      kicker="Teaching a robot to walk"
      heading="An AI fixes a robot's scoring rules until it walks"
      controls={
        <>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={() => setGen((g) => Math.min(g + 1, rounds - 1))}
            disabled={isLast}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Next round
          </button>
          <InstrumentReset onClick={() => setGen(0)} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <RoundStory gen={gen} />
              <InstrumentReadout>
                <span data-testid="round-readout">Round {gen + 1} of {rounds}</span>
              </InstrumentReadout>
              <StageStatus>Illustrative example, not a recorded run</StageStatus>
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            data-testid="eureka-stage"
            aria-label={`Round ${gen + 1} of ${rounds}: ${PLAIN[gen].note.join(' ')}.`}
          >
            <RoundDrawing gen={gen} />
          </PlotStage>
        </FigureStage>
      }
      caption="A robot in training repeats whatever earns it points, so an AI reads each result and fixes rules that reward the wrong thing."
      method={
        <>
          <div className="text-text-dim">Eureka loop, scripted replay</div>
          <p>
            Scripted replay of the Eureka loop (propose reward code, train, select on fitness, reflect, mutate)
            with authored teaching data, not a recording of a real Eureka run.
            In Eureka a language model writes reward code for the task, a policy trains on each candidate, a
            task-fitness score picks the best, and the model reflects on per-term training statistics before writing
            the next generation. Task: {EUREKA_TASK}.
          </p>
          <InstrumentReadout className="flex flex-wrap gap-x-4 gap-y-1">
            <span data-testid="generation-readout">
              Generation {current.index} of {rounds - 1}
            </span>
            <span>
              Fitness:{' '}
              <span data-testid="fitness-readout" style={{ color: roleColour('value') }}>
                {current.fitness.toFixed(2)}
              </span>
            </span>
          </InstrumentReadout>
          <p>Fitness is the task score after training with this reward, from 0 to 1; the scores here are authored.</p>
          <div className="text-text-dim">Scripted reward statistics</div>
          {/* Capped below the column width: wider, its dividers count as full-width
              rules against the article's two-rule bound (VAL-EDU-031). */}
          <dl data-testid="eureka-stats" className="m-0 max-w-md divide-y divide-border-strong border-y border-border-strong">
            {current.stats.map((s) => (
              <div key={s.label} className="flex items-baseline gap-3 py-1.5">
                <dt className="min-w-0 flex-1 text-text-dim">{s.label}</dt>
                <dd className="m-0 flex items-baseline gap-2 tabular-nums">
                  <span>{s.value}</span>
                  {s.tone ? <span data-tone={s.tone}>{TONE_WORD[s.tone]}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
          <div className="text-text-dim">Scripted reflection on the statistics</div>
          <p data-testid="eureka-reflection">{current.reflection}</p>
          <div id={codeLabelId} className="text-text-dim">
            Proposed reward code, generation {current.index}
          </div>
          <pre data-testid="eureka-code" data-brand-surface-id="surface:flat" {...scrollRegionAttributes({ labelledBy: codeLabelId })} className={CODE_BLOCK_CLASS}>
            <code>{current.code.join('\n')}</code>
          </pre>
          {diff ? (
            <>
              <div id={diffLabelId} className="text-text-dim">
                Mutation diff, generation {gen - 1} to {gen}
              </div>
              <pre data-testid="eureka-diff" data-brand-surface-id="surface:flat" {...scrollRegionAttributes({ labelledBy: diffLabelId })} className={CODE_BLOCK_CLASS}>
                <code>
                  {diff.map((line, i) => (
                    <span key={i} data-diff={line.type} className={cx('block', DIFF_STYLE[line.type])}>
                      {DIFF_PREFIX[line.type]}
                      {line.text}
                    </span>
                  ))}
                </code>
              </pre>
            </>
          ) : null}
        </>
      }
    />
  );
}
