'use client';

import { forwardRef, useId, useLayoutEffect, useRef, useState } from 'react';
import { roleColour } from '@/components/motion/chart';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Line } from '@/components/iso/react/draw';
import { PartView } from '@/components/iso/part-view';
import { LiveSolid, writeSolid } from '@/components/iso/live-solid';
import { asksForStillness } from '@/components/iso/react/live';
import type { Flat, SolidPaths, Tone } from '@/components/iso/iso-kit';
import type { RobotSolid } from '@/components/iso/figures/quadruped-rig';
import {
  BELT_BAND,
  CARD_CLIP,
  HEIGHT,
  PARTS,
  ROUND_SECONDS,
  WIDTH,
  beltSlats,
  cardPaths,
  cardShift,
  hatchAt,
  inkPaths,
  leverAt,
  loopFrame,
  penAt,
  pinsAt,
  restFrame,
  ribbonGrid,
  robotAt,
  type LoopFrame,
  type Outcome,
  type Part,
} from '@/components/iso/figures/reward-writing-loop';
import { EUREKA_GENERATIONS, EUREKA_TASK, diffLines } from '@/lib/eureka';
import { scrollRegionAttributes } from '@/lib/scroll-region.mjs';
import { cx } from '@/lib/utils';

/**
 * EurekaLoop: a scripted replay of Eureka's evolutionary reward-design
 * loop for a quadruped walking task, shown one round at a time and drawn
 * as a reward-writing loop (components/iso/figures/reward-writing-loop.ts).
 *
 * The writer at the left punches the round's rules into an edge-notched
 * card, one notch per rule, and slides it into the reader at the
 * treadmill's rear, whose pins drop into the notches. The robot runs under
 * those rules, and the logger at the front writes its speed on a paper
 * ribbon that feeds back into the writer, which reads it and punches the
 * next card. "Next round" plays that lap; under the drawing sit the
 * plain-words rules, results and the note the next reward follows from. The
 * reward code, the statistics as the language model saw them (time at the
 * target speed among them), its full reflection and the line diff sit in
 * "How this was made".
 *
 * The generations are a scripted illustration of the mechanism, labeled
 * as such, not a recording of a real Eureka run.
 *
 * Interactive contract: deterministic initial render (generation 0, the
 * first card read and its run written), native buttons
 * (keyboard-accessible), reset control, fixed SVG viewport. The lap plays
 * only on "Next round"; reduced motion shows each round's end at once.
 */

/** Each generation's reward, results and reflection in plain words; the numbers are lib/eureka's. */
const PLAIN: readonly {
  outcome: Outcome;
  note: readonly string[];
  rules: string;
  results: readonly (readonly [string, string])[];
  next: string;
}[] = [
  {
    outcome: 'falls',
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

// ---------------------------------------------------------------- the drawing at one moment of the loop
/** Every live path for a moment of the loop. */
function drawingOf(frame: LoopFrame) {
  const robot = robotAt(frame.pose);
  return {
    far: robot.far,
    body: robot.body,
    near: robot.near,
    hatch: hatchAt(frame.pose),
    slats: beltSlats(frame.travel),
    card: cardPaths(frame.cardGen),
    cardShift: cardShift(frame.cardX),
    pins: pinsAt(frame.cardGen, frame.pinDrop),
    lever: leverAt(frame.stroke),
    grid: ribbonGrid(frame.fed),
    ink: inkPaths(frame.fed, frame.latest, frame.inked),
    pen: penAt(frame.penSpeed, frame.penLift),
  };
}
type Drawing = ReturnType<typeof drawingOf>;

/** A solid the loop rewrites, with a seam under its outline (the robot's body parts). */
const SeamSolid = forwardRef<SVGGElement, { solid: RobotSolid }>(function SeamSolid({ solid }, ref) {
  const { paths, tone, seam = '' } = solid;
  return (
    <g ref={ref} className="iso-solid">
      <path className="iso-fill" data-live-part="fill" d={paths.fill} />
      {[0, 1, 2, 3].map((shade) => (
        <path key={shade} className="iso-shade" data-shade={shade} data-live-part={`shade-${shade}`} d={paths.shades[shade] ?? ''} />
      ))}
      <path className="iso-top" data-live-part="top" d={paths.top} />
      <path className="iso-line iso-crease" data-tone="faint" data-live-part="crease" d={paths.crease} />
      <path className="iso-line iso-bevel" data-tone="faint" data-live-part="bevel" d={paths.bevel ?? ''} />
      <path className="iso-line" data-tone="faint" data-live-part="seam" d={seam} />
      <path className="iso-line iso-edge" data-tone={tone} data-live-part="edge" d={paths.outline} />
    </g>
  );
});

function writeTone(group: SVGGElement | null, tone: Tone) {
  const edge = group?.querySelector('[data-live-part="edge"]');
  if (edge && edge.getAttribute('data-tone') !== tone) edge.setAttribute('data-tone', tone);
}

function writeRobotSolid(group: SVGGElement | null, solid: RobotSolid) {
  writeSolid(group, solid.paths);
  writeTone(group, solid.tone);
  const seam = group?.querySelector('[data-live-part="seam"]');
  if (seam) seam.setAttribute('d', solid.seam ?? '');
}

type Refs = {
  far: (SVGGElement | null)[];
  body: (SVGGElement | null)[];
  near: (SVGGElement | null)[];
  hatch: SVGPathElement | null;
  screws: (SVGCircleElement | null)[];
  slats: SVGPathElement | null;
  card: SVGGElement | null;
  cardFace: (SVGPathElement | null)[];
  cardEdges: SVGPathElement | null;
  pins: (SVGGElement | null)[];
  lever: (SVGGElement | null)[];
  grid: SVGPathElement | null;
  ink: SVGPathElement | null;
  pen: (SVGGElement | null)[];
};

const tenth = (value: number) => String(Math.round(value * 10) / 10);

function writeDrawing(refs: Refs, drawing: Drawing) {
  drawing.far.forEach((solid, index) => writeRobotSolid(refs.far[index] ?? null, solid));
  drawing.body.forEach((solid, index) => writeRobotSolid(refs.body[index] ?? null, solid));
  drawing.near.forEach((solid, index) => writeRobotSolid(refs.near[index] ?? null, solid));
  refs.hatch?.setAttribute('d', drawing.hatch.outline);
  refs.screws.forEach((circle, index) => {
    const point: Flat | undefined = drawing.hatch.screws[index];
    circle?.setAttribute('cx', point ? tenth(point[0]) : '0');
    circle?.setAttribute('cy', point ? tenth(point[1]) : '0');
    circle?.setAttribute('r', point ? '0.4' : '0');
  });
  refs.slats?.setAttribute('d', drawing.slats);
  refs.card?.setAttribute('transform', drawing.cardShift);
  refs.cardFace.forEach((path) => path?.setAttribute('d', drawing.card.face));
  refs.cardEdges?.setAttribute('d', drawing.card.edges);
  drawing.pins.forEach((paths, index) => writeSolid(refs.pins[index] ?? null, paths));
  drawing.lever.forEach((paths, index) => writeSolid(refs.lever[index] ?? null, paths));
  refs.grid?.setAttribute('d', drawing.grid);
  refs.ink?.setAttribute('d', drawing.ink);
  drawing.pen.forEach((paths, index) => writeSolid(refs.pen[index] ?? null, paths));
}

const RUNS: Array<{ live: boolean; parts: Part[] }> = [];
for (const part of PARTS) {
  const last = RUNS[RUNS.length - 1];
  const live = part.kind === 'slot';
  if (last && !last.live && !live) last.parts.push(part);
  else RUNS.push({ live, parts: [part] });
}

function StaticPart({ part }: { part: Part }) {
  if (part.kind === 'fill') return <path className="iso-shade" data-shade={part.shade} d={part.d} />;
  if (part.kind === 'slot') return null;
  return <PartView part={part} />;
}

/** The ink's weight: a little heavier than the drawing's own lines. */
const INK_STYLE = { strokeWidth: 1.15 } as const;

export function EurekaLoop({ className }: { className?: string }) {
  // Both code blocks scroll horizontally, so each one is a region named by the label above it.
  const codeLabelId = `${useId()}-code`;
  const diffLabelId = `${useId()}-diff`;
  // An id the clip-path url can carry as it is.
  const clipId = `${useId().replace(/[^A-Za-z0-9_-]/g, '')}-card-clip`;
  const [gen, setGen] = useState(0);
  // How the drawing reaches the round: by the lap ("Next round") or at once (Reset).
  const [lap, setLap] = useState({ gen: 0, play: false });
  // The opening drawing, fixed for the life of the figure: the live code moves the parts from here.
  const [rest] = useState(() => drawingOf(restFrame(0)));
  const current = EUREKA_GENERATIONS[gen];
  const rounds = EUREKA_GENERATIONS.length;
  const isLast = gen === rounds - 1;
  const diff = gen > 0 ? diffLines(EUREKA_GENERATIONS[gen - 1].code, current.code) : null;
  const refs = useRef<Refs>({
    far: [], body: [], near: [], hatch: null, screws: [], slats: null, card: null, cardFace: [], cardEdges: null,
    pins: [], lever: [], grid: null, ink: null, pen: [],
  });

  // "Next round" plays the lap: the card goes back to the writer, comes out punched with the new rules and is read,
  // and the robot runs while the logger writes. Reset, and reduced motion, draw the round's end at once.
  useLayoutEffect(() => {
    const r = refs.current;
    if (!lap.play || asksForStillness()) {
      writeDrawing(r, drawingOf(restFrame(lap.gen)));
      return;
    }
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = (now - start) / 1000;
      writeDrawing(r, drawingOf(loopFrame(lap.gen, t)));
      frame = t < ROUND_SECONDS ? requestAnimationFrame(tick) : 0;
    };
    writeDrawing(r, drawingOf(loopFrame(lap.gen, 0)));
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [lap]);

  const next = () => {
    const to = Math.min(gen + 1, rounds - 1);
    setGen(to);
    setLap({ gen: to, play: true });
  };
  const reset = () => {
    setGen(0);
    setLap({ gen: 0, play: false });
  };

  const r = refs.current;
  const liveView = (slot: Extract<Part, { kind: 'slot' }>['slot']) => {
    switch (slot) {
      case 'belt':
        return (
          <g key={slot} data-part="belt">
            <Line d={BELT_BAND} tone="faint" />
            <path ref={(el) => void (r.slats = el)} className="iso-line" data-tone="faint" d={rest.slats} />
          </g>
        );
      case 'legs-far':
        return (
          <g key={slot} data-part="legs-far">
            {rest.far.map((solid, index) => <SeamSolid key={index} ref={(el) => void (r.far[index] = el)} solid={solid} />)}
          </g>
        );
      case 'body':
        return (
          <g key={slot} data-part="robot-body">
            {rest.body.map((solid, index) => <SeamSolid key={index} ref={(el) => void (r.body[index] = el)} solid={solid} />)}
            <path ref={(el) => void (r.hatch = el)} className="iso-line" data-tone="faint" d={rest.hatch.outline} />
            <g className="iso-dots" data-tone="mid">
              {[0, 1, 2, 3].map((index) => {
                const point = rest.hatch.screws[index];
                return <circle key={index} ref={(el) => void (r.screws[index] = el)} cx={point ? tenth(point[0]) : '0'} cy={point ? tenth(point[1]) : '0'} r={point ? '0.4' : '0'} />;
              })}
            </g>
          </g>
        );
      case 'legs-near':
        return (
          <g key={slot} data-part="legs-near">
            {rest.near.map((solid, index) => <SeamSolid key={index} ref={(el) => void (r.near[index] = el)} solid={solid} />)}
          </g>
        );
      case 'card':
        return (
          <g key={slot} data-part="card" data-rules={gen} clipPath={`url(#${clipId})`}>
            <clipPath id={clipId}>
              <path d={CARD_CLIP} />
            </clipPath>
            <g ref={(el) => void (r.card = el)} transform={rest.cardShift}>
              <g className="iso-solid" data-lit="">
                <path ref={(el) => void (r.cardFace[0] = el)} className="iso-fill" d={rest.card.face} />
                <path ref={(el) => void (r.cardFace[1] = el)} className="iso-top" d={rest.card.face} />
                <path ref={(el) => void (r.cardEdges = el)} className="iso-shade" data-shade={3} d={rest.card.edges} />
                <path ref={(el) => void (r.cardFace[2] = el)} className="iso-line iso-edge" data-tone="hi" d={rest.card.face} />
              </g>
            </g>
          </g>
        );
      case 'pins':
        return (
          <g key={slot} data-part="pins">
            {rest.pins.map((paths, index) => <LiveSolid key={index} ref={(el) => void (r.pins[index] = el)} paths={paths} tone="mid" />)}
          </g>
        );
      case 'lever':
        return (
          <g key={slot} data-part="lever">
            {rest.lever.map((paths, index) => <LiveSolid key={index} ref={(el) => void (r.lever[index] = el)} paths={paths} tone="mid" />)}
          </g>
        );
      case 'ink':
        return (
          <g key={slot}>
            <path ref={(el) => void (r.grid = el)} className="iso-line" data-tone="faint" data-part="ribbon-grid" d={rest.grid} />
            <path ref={(el) => void (r.ink = el)} className="iso-line" data-tone="hi" data-part="ink" style={INK_STYLE} d={rest.ink} />
          </g>
        );
      case 'pen':
        return (
          <g key={slot} data-part="pen">
            {rest.pen.map((paths: SolidPaths, index) => <LiveSolid key={index} ref={(el) => void (r.pen[index] = el)} paths={paths} tone={index === 1 ? 'hi' : 'mid'} />)}
          </g>
        );
    }
  };

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
            onClick={isLast ? undefined : next}
            aria-disabled={isLast || undefined}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Next round
          </button>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          story={<RoundStory gen={gen} />}
          hint="Lit card: the rules · the ribbon carries each run's speed back"
          readout={<span data-testid="round-readout">Round {gen + 1} of {rounds}</span>}
          status="Illustrative example, not a recorded run"
          data-outcome={PLAIN[gen].outcome}
        >
          <div className="iso-stage">
            <svg
              className="iso-svg"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              focusable="false"
              data-testid="eureka-stage"
              aria-label={`Round ${gen + 1} of ${rounds}: ${PLAIN[gen].note.join(' ')}.`}
            >
              {RUNS.map((run, index) =>
                run.live ? (
                  liveView((run.parts[0] as Extract<Part, { kind: 'slot' }>).slot)
                ) : (
                  <g key={index}>
                    {run.parts.map((part, k) => (
                      <StaticPart key={k} part={part} />
                    ))}
                  </g>
                ),
              )}
            </svg>
          </div>
        </AnatomyStage>
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
          <p>
            The drawing is that loop as a bench. Each round&apos;s rules are punched into a card, one notch on its top
            edge for each rule the reward code pays or charges for: raw speed, being near the target speed, staying
            up, a fall, jerky moves. The reader&apos;s pins drop into the notches, the robot runs, and the logger writes
            its speed on a ribbon that feeds back into the writer: a spike that ends in a fall within half a second,
            a flat line at almost zero for the full 20 seconds, then a line along the 1.0 metres a second target.
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
