'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, InstrumentReset, PresetGroup, type Preset } from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { LiveSolid, writeSolid } from '@/components/iso/live-solid';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness, follow, useInView, useLoop } from '@/components/iso/react/live';
import type { SolidPaths } from '@/components/iso/iso-kit';
import {
  CLEAR_S,
  HEAD_PARTS,
  HEIGHT,
  NEEDLE_HUB,
  PARTS,
  PEGS,
  PLOW_PARTS,
  ROUNDS,
  STEP,
  TIMELINES,
  WIDTH,
  cardAt,
  headShift,
  needleAt,
  plowShift,
  pocketMarks,
  poseAt,
  readoutOf,
  usableBatches,
  type LearnerId,
  type Part,
  type Pose,
} from '@/components/iso/figures/replay-carousel';

/**
 * ReplayReuse: two ways to spend a batch of experience, drawn as a card
 * reader with a carousel (components/iso/figures/replay-carousel.ts).
 *
 * An on-policy learner such as PPO may only learn from data its current
 * policy produced, so each batch is used and discarded. An off-policy
 * learner keeps every batch, because Q-learning can improve one policy from
 * data another produced, so each update can draw on all of it.
 *
 * Each batch is a punched card that slides down the ramp under the reading
 * head (the one lit part). With fresh experience only, the plow is down:
 * after the read the turntable indexes and the card goes down the chute into
 * the waste bin. Reusing saved experience, the plow is raised: the card
 * stays in its pocket, and each round the turntable carries every stored
 * card back under the head. The counter dial raises a peg for every batch
 * collected and points its needle at how many the learner learns from.
 *
 * The one control picks the learner and plays the six rounds; an idle tour
 * replays them while nobody touches the figure and it is on screen. The
 * served HTML, reduced motion and the end of every run show the last read of
 * round six. The batches are illustrative; the two rules are PPO's and
 * Q-learning's.
 */

export { ROUNDS, usableBatches };
export type { LearnerId };

const LEARNERS: readonly Preset<LearnerId>[] = [
  { id: 'on', label: 'Use fresh experience' },
  { id: 'off', label: 'Reuse saved experience' },
];
export const DEFAULT_LEARNER: LearnerId = 'on';

/** Seconds the figure waits before its first tour, and after each run before it plays again. */
export const FIRST_IDLE_S = 1.4;
export const HOLD_S = 4.5;

/** The pose a run ends on, which the server draws. */
export const stillPose = (learner: LearnerId) => poseAt(learner, TIMELINES[learner].still);

function describe(learner: LearnerId): string {
  return learner === 'on'
    ? `After ${ROUNDS} rounds of collecting, an on-policy learner like PPO updates from only the newest batch, ${usableBatches('on', ROUNDS)} of ${ROUNDS}, and has discarded the other ${ROUNDS - 1} after a few passes each; an off-policy learner would still hold all ${ROUNDS}.`
    : `After ${ROUNDS} rounds of collecting, an off-policy learner like SAC keeps all ${usableBatches('off', ROUNDS)} batches in a replay buffer and every update can learn from any of them; an on-policy learner would use only the newest ${usableBatches('on', ROUNDS)}.`;
}

function drawingLabel(learner: LearnerId): string {
  return learner === 'on'
    ? `A card reader. Each of ${ROUNDS} batches of robot experience is a punched card that slides down a ramp under the reading head. With fresh experience only, the plow pushes each card off the turntable after one read and it drops down a chute into the waste bin: the bin holds ${ROUNDS - 1} cards, the head reads only the newest, and the counter dial points at 1 of ${ROUNDS}.`
    : `A card reader. Each of ${ROUNDS} batches of robot experience is a punched card that slides down a ramp under the reading head. Reusing saved experience, the plow is raised, every card stays on the turntable and the turntable carries each one back under the head: the head reads all ${ROUNDS}, and the counter dial points at ${ROUNDS} of ${ROUNDS}.`;
}

function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }): ReactNode {
  if (part.kind === 'solid') {
    return <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined} />;
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  return <Dots points={part.points} size={part.size} tone={part.tone} />;
}
const partsView = (parts: readonly Part[]) => parts.map((part, index) => (part.kind === 'slot' ? null : <PartView key={index} part={part} />));

const EMPTY: SolidPaths = { fill: '', outline: '', crease: '', top: '', shades: ['', '', '', ''] };
const r1 = (value: number) => Math.round(value * 10) / 10;

/** What the server and the first render draw for each card and the marks, from a pose. */
function firstDraw(pose: Pose) {
  const cards = Array.from({ length: ROUNDS }, (_, index) => {
    const card = pose.cards.find((c) => c.k === index + 1);
    const parts = card ? cardAt(card.k, card.place) : { card: EMPTY, holes: '' };
    return { where: card ? (card.inBin ? 'bin' : 'table') : 'none', parts, opacity: card?.opacity ?? 0 };
  });
  return { cards, marks: pocketMarks(pose.turn) };
}

export function ReplayReuse({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const ppo = citationFor('ppo-2017');
  const suttonBarto = citationFor('sutton-barto-2018');
  const [learner, setLearner] = useState<LearnerId>(DEFAULT_LEARNER);
  const end = stillPose(learner);

  // The pose the server draws; the live loop moves everything from there on.
  const [first] = useState(() => firstDraw(stillPose(DEFAULT_LEARNER)));
  const rootRef = useRef<HTMLDivElement>(null);
  const tableRefs = useRef<Array<SVGGElement | null>>([]);
  const binRefs = useRef<Array<SVGGElement | null>>([]);
  const marksRef = useRef<SVGPathElement>(null);
  const pinsRef = useRef<SVGGElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const plowRef = useRef<SVGGElement>(null);
  const needleRef = useRef<SVGPathElement>(null);
  const pegRefs = useRef<Array<SVGGElement | null>>([]);
  const readoutRef = useRef<HTMLSpanElement | null>(null);

  const run = useRef({
    learner: DEFAULT_LEARNER as LearnerId,
    clock: TIMELINES[DEFAULT_LEARNER].still,
    playing: false,
    idle: 0,
    toured: false,
    held: false,
    plow: 0,
    needle: usableBatches(DEFAULT_LEARNER, ROUNDS),
    pegs: Array.from({ length: ROUNDS }, () => 1),
    shown: stillPose(DEFAULT_LEARNER),
    from: null as Pose | null,
    last: 0,
  });

  const draw = useCallback((pose: Pose) => {
    const s = run.current;
    const marks = pocketMarks(pose.turn);
    marksRef.current?.setAttribute('d', marks.outline);
    pinsRef.current?.querySelectorAll('circle').forEach((dot, index) => {
      const point = marks.pins[index];
      if (!point) return;
      dot.setAttribute('cx', String(r1(point[0])));
      dot.setAttribute('cy', String(r1(point[1])));
    });
    for (let index = 0; index < ROUNDS; index++) {
      const card = pose.cards.find((c) => c.k === index + 1);
      const table = tableRefs.current[index];
      const bin = binRefs.current[index];
      const target = card ? (card.inBin ? bin : table) : null;
      for (const group of [table, bin]) {
        if (!group) continue;
        if (group !== target) {
          group.setAttribute('display', 'none');
          continue;
        }
        const { card: paths, holes } = cardAt(card!.k, card!.place);
        group.removeAttribute('display');
        group.setAttribute('opacity', String(Math.round(card!.opacity * 1000) / 1000));
        writeSolid(group.querySelector<SVGGElement>('.iso-solid'), paths);
        group.querySelector('[data-holes]')?.setAttribute('d', holes);
      }
      table?.setAttribute('data-where', card ? (card.inBin ? 'bin' : 'table') : 'none');
    }
    headRef.current?.setAttribute('transform', headShift(pose.dip));
    plowRef.current?.setAttribute('transform', plowShift(s.plow));
    needleRef.current?.setAttribute('d', needleAt(s.needle));
    pegRefs.current.forEach((peg, index) => peg?.setAttribute('opacity', String(Math.round(s.pegs[index]! * 1000) / 1000)));
    const root = rootRef.current;
    if (root) {
      root.dataset.arrived = String(pose.arrived);
      root.dataset.usable = String(pose.usable);
    }
    if (readoutRef.current) readoutRef.current.textContent = readoutOf(pose);
    s.shown = pose;
  }, []);

  /** The pose at the run's clock: while the run clears, the cards drawn before fade away. */
  const poseNow = useCallback((): Pose => {
    const s = run.current;
    if (s.clock >= CLEAR_S || !s.from) return poseAt(s.learner, s.clock);
    const u = s.clock / CLEAR_S;
    const fade = 1 - u * u * (3 - 2 * u);
    const from = s.from;
    const square = Math.round(from.turn / STEP) * STEP;
    return {
      turn: from.turn + (square - from.turn) * (1 - fade),
      dip: from.dip * fade,
      arrived: 0,
      usable: 0,
      cards: from.cards.map((card) => ({ ...card, opacity: card.opacity * fade })),
    };
  }, []);

  const visible = useInView(rootRef);
  const kick = useLoop((dt, calm) => {
    const s = run.current;
    const line = TIMELINES[s.learner];
    if (calm) {
      s.playing = false;
      s.clock = line.still;
    } else if (s.playing) {
      // The run's clock follows the wall clock, so a slow device plays the rounds at their true pace.
      const now = performance.now();
      const step = s.last ? Math.min(0.25, (now - s.last) / 1000) : dt;
      s.last = now;
      s.clock = Math.min(line.still, s.clock + step);
      if (s.clock >= line.still) {
        s.playing = false;
        s.idle = 0;
        s.from = null;
      }
    } else if (!s.held) {
      // The idle tour: nobody is pointing at or working the figure, so it plays the six rounds again.
      s.idle += dt;
      if (s.idle >= (s.toured ? HOLD_S : FIRST_IDLE_S)) {
        s.toured = true;
        s.from = s.shown;
        s.clock = 0;
        s.playing = true;
      }
    }
    const pose = poseNow();
    s.plow = follow(s.plow, s.learner === 'off' ? 1 : 0, dt, 0.3, calm);
    s.needle = follow(s.needle, pose.usable, dt, 0.3, calm);
    s.pegs = s.pegs.map((value, index) => follow(value, pose.arrived > index ? 1 : 0, dt, 0.18, calm));
    draw(pose);
    if (!s.playing) s.last = 0;
    if (calm) return false;
    return true;
  }, visible);

  // Under reduced motion the loop stops once still; a change of learner draws the still pose at once.
  const choose = (next: LearnerId) => {
    setLearner(next);
    const s = run.current;
    s.from = s.shown;
    s.learner = next;
    s.clock = 0;
    s.playing = true;
    s.toured = true;
    if (typeof window.matchMedia === 'function' && asksForStillness()) {
      s.playing = false;
      s.clock = TIMELINES[next].still;
      s.plow = next === 'off' ? 1 : 0;
      const pose = stillPose(next);
      s.needle = pose.usable;
      s.pegs = s.pegs.map((_, index) => (pose.arrived > index ? 1 : 0));
      draw(pose);
    }
    kick();
  };

  const reset = () => {
    setLearner(DEFAULT_LEARNER);
    const s = run.current;
    s.learner = DEFAULT_LEARNER;
    s.playing = false;
    s.from = null;
    s.idle = 0;
    s.clock = TIMELINES[DEFAULT_LEARNER].still;
    s.plow = 0;
    s.needle = usableBatches(DEFAULT_LEARNER, ROUNDS);
    s.pegs = s.pegs.map(() => 1);
    draw(stillPose(DEFAULT_LEARNER));
    kick();
  };

  // Pointing at the figure, focusing it or pressing in it holds the idle tour back; it resumes a while after.
  const hold = (held: boolean) => {
    run.current.held = held;
    run.current.idle = 0;
  };
  const touched = () => {
    run.current.idle = 0;
  };

  useEffect(() => {
    readoutRef.current = rootRef.current?.closest('[data-figure-frame]')?.querySelector<HTMLSpanElement>('[data-readout]') ?? null;
  }, []);

  return (
    <InstrumentFigure
      figureId="replay-reuse"
      className={className}
      kicker="On-policy and off-policy"
      heading="Off-policy learners reuse experience; on-policy ones discard it"
      controls={<PresetGroup label="The learner" presets={LEARNERS} value={learner} onChange={choose} testId="replay-learner" />}
      adjust={<InstrumentReset onClick={reset} />}
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="The lit head reads each card; the plow sends it to the bin or leaves it on the turntable to come round again"
          readout={readoutOf(end)}
          status="Illustrative teaching model: six batches of experience; the two rules are PPO's and Q-learning's."
          data-testid="replay-stage-frame"
        >
          <div
            ref={rootRef}
            data-testid="replay-stage"
            data-learner={learner}
            data-arrived={ROUNDS}
            data-usable={usableBatches(DEFAULT_LEARNER, ROUNDS)}
            onPointerEnter={() => hold(true)}
            onPointerLeave={() => hold(false)}
            onPointerDown={touched}
            onFocus={() => hold(true)}
            onBlur={() => hold(false)}
          >
            <IsoFigure width={WIDTH} height={HEIGHT} label={drawingLabel(learner)} describedBy={descriptionId}>
              {PARTS.map((part, index) => {
                if (part.kind !== 'slot') return <PartView key={index} part={part} />;
                if (part.slot === 'marks') {
                  return (
                    <g key="marks">
                      <path ref={marksRef} className="iso-line" data-tone="faint" d={first.marks.outline} />
                      <g ref={pinsRef} className="iso-dots" data-tone="mid">
                        {first.marks.pins.map(([x, y], n) => (
                          <circle key={n} cx={r1(x)} cy={r1(y)} r={0.45} />
                        ))}
                      </g>
                    </g>
                  );
                }
                if (part.slot === 'tableCards' || part.slot === 'binCards') {
                  const inBin = part.slot === 'binCards';
                  return (
                    <g key={part.slot} data-testid={inBin ? 'replay-bin-cards' : 'replay-table-cards'}>
                      {first.cards.map((card, index) => {
                        const here = card.where === (inBin ? 'bin' : 'table');
                        return (
                          <g
                            key={index}
                            ref={(el) => {
                              (inBin ? binRefs : tableRefs).current[index] = el;
                            }}
                            data-card={index + 1}
                            data-where={inBin ? undefined : card.where}
                            display={here ? undefined : 'none'}
                            opacity={here ? card.opacity : 0}
                          >
                            <LiveSolid paths={here ? card.parts.card : EMPTY} tone="hi" />
                            <path className="iso-line" data-tone="lo" data-holes="" d={here ? card.parts.holes : ''} />
                          </g>
                        );
                      })}
                    </g>
                  );
                }
                if (part.slot === 'plow') {
                  return (
                    <g key="plow" ref={plowRef} data-testid="replay-plow" transform={plowShift(0)}>
                      {partsView(PLOW_PARTS)}
                    </g>
                  );
                }
                if (part.slot === 'head') {
                  return (
                    <g key="head" ref={headRef} transform={headShift(1)}>
                      {partsView(HEAD_PARTS)}
                    </g>
                  );
                }
                return (
                  <g key="dial" data-testid="replay-dial">
                    {PEGS.map((peg, index) => (
                      <g
                        key={index}
                        ref={(el) => {
                          pegRefs.current[index] = el;
                        }}
                        data-peg={index + 1}
                      >
                        <Solid paths={peg} tone="mid" />
                      </g>
                    ))}
                    <Solid paths={NEEDLE_HUB} tone="mid" />
                    <path ref={needleRef} className="iso-line" data-tone="hi" data-free="end" style={{ strokeWidth: 1.1 }} d={needleAt(usableBatches(DEFAULT_LEARNER, ROUNDS))} />
                  </g>
                );
              })}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="A policy is the robot's learned rule for acting; on-policy training discards each batch after use, off-policy training keeps and reuses it."
      method={
        <>
          <p data-testid="replay-method-names">
            The fresh-experience choice illustrates PPO (proximal policy optimization); the saved-experience choice illustrates SAC (soft actor-critic). These are names of methods for learning a robot&apos;s movement rule.
          </p>
          <div>
            An on-policy update is valid only for data the current policy produced, so each batch is collected,
            consumed and discarded; PPO makes several passes over each batch where plain policy gradient makes one.
            An off-policy method improves one policy from data another produced, so experience piles up in a replay
            buffer. Underneath is Q-learning, which fits the value of a state and action and can learn from any
            recorded step.
          </div>
          <div>
            The drawing is that rule made of parts. Each batch is a punched card, and a read is the lit head dropping
            its pins onto it. With fresh experience only, the plow is down and pushes each card off the turntable into
            the bin once it has been read. Reusing saved experience, the plow is raised, the cards stay in their
            pockets, and every round the turntable brings each stored card back under the head. The dial raises a peg
            for each batch collected and points at how many of them the learner learns from.
          </div>
          <div>
            The batches are illustrative. With thousands of simulated robots, steps are nearly free and PPO&apos;s
            stability wins; on a real robot every step costs time, which is why reuse matters there.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary={`What the update may learn from after ${ROUNDS} rounds`}
            description={describe(learner)}
            rowHeader="learner"
            columns={[{ header: `batches usable after ${ROUNDS} rounds`, numeric: true }, { header: 'older batches' }]}
            rows={LEARNERS.map((l) => ({
              label: l.label,
              values: [String(usableBatches(l.id, ROUNDS)), l.id === 'on' ? 'thrown away' : 'kept in the replay buffer'],
            }))}
          />
        </>
      }
      source={
        <span data-testid="replay-source">
          {ppo ? (
            <a data-brand-control-id="control:link-focus" href={ppo.url} target="_blank" rel="noopener" className="underline-offset-2">
              {ppo.label}
            </a>
          ) : (
            'Schulman and colleagues'
          )}
          ;{' '}
          {suttonBarto ? (
            <a data-brand-control-id="control:link-focus" href={suttonBarto.url} target="_blank" rel="noopener" className="underline-offset-2">
              {suttonBarto.label}
            </a>
          ) : (
            'Sutton and Barto'
          )}
          .
        </span>
      }
    />
  );
}
