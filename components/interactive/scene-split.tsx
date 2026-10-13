'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  InstrumentFigure,
  PresetGroup,
  type Preset,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import {
  CARDS,
  DRAWS_HOLDING_A_SCENE_OUT,
  EPISODES,
  HEIGHT,
  PARTS,
  PER_SCENE,
  PIN_CLIP,
  RANDOM_DRAWS,
  SCENES,
  TEST_SIZE,
  WIDTH,
  knobParts,
  leakOf,
  liftShift,
  sceneOf,
  stripHoles,
  testSetOf,
  type Part,
  type SplitMode,
} from '@/components/iso/figures/split-card-rack';

/**
 * SceneSplit: why a test set must hold out whole scenes, drawn as a split
 * card rack (components/iso/figures/split-card-rack.ts).
 *
 * Twenty episode cards stand in a channel, five recorded in each of four
 * scenes, each printed with its scene's shape. A punched program strip is
 * the split definition: under every hole a lift pin raises that card
 * against the test rail (the one lit part). A random split of episodes
 * raises cards from several scenes, and each of those scenes still has
 * cards down in training, so the test checks scenes the model has seen.
 * Holding out scene 4 raises its whole group and leaves no card of its
 * shape in training. Picking a split, or "Run the split", drops the cards
 * and raises the new test set one card at a time; reduced motion jumps.
 *
 * Schematic: twenty illustrative episodes and one seeded random draw. The
 * rule is the article's: split by the factor you claim to generalize across.
 */

export const SPLITS: readonly Preset<SplitMode>[] = [
  { id: 'random', label: 'Random episodes' },
  { id: 'holdout', label: 'Hold out scene 4' },
];

const scenesWord = (count: number) => (count === 1 ? '1 scene' : `${count} scenes`);
export function readoutFor(mode: SplitMode): string {
  const { testScenes, leaked } = leakOf(testSetOf(mode));
  return mode === 'random'
    ? `Random episodes · test cards from ${scenesWord(testScenes.length)} · ${leaked.length === testScenes.length ? `all ${leaked.length}` : leaked.length} also in training`
    : `Scene 4 held out · test cards from ${scenesWord(testScenes.length)} · ${leaked.length === 0 ? 'none of it' : leaked.length} in training`;
}

/** How long the run takes to drop every card, then the gap before and between each test card's lift, in seconds. */
const DROP_S = 0.35;
const RAISE_AT_S = 0.5;
const RAISE_GAP_S = 0.18;
const RAISE_S = 0.4;
const smooth = (u: number) => {
  const t = Math.min(Math.max(u, 0), 1);
  return t * t * (3 - 2 * t);
};
/**
 * Card `k`'s lift `t` seconds into a run that drops the cards from `from`
 * and raises the test set of `mode` one card after another, left to right.
 */
export function liftAt(k: number, t: number, mode: SplitMode, from: number): number {
  const test = testSetOf(mode);
  const down = from * (1 - smooth(t / DROP_S));
  const rank = test.indexOf(k);
  if (rank < 0) return down;
  return Math.max(down, smooth((t - RAISE_AT_S - rank * RAISE_GAP_S) / RAISE_S));
}
export const RUN_S = RAISE_AT_S + (TEST_SIZE - 1) * RAISE_GAP_S + RAISE_S;

function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }): ReactNode {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        crease={part.crease}
        inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  return <Dots points={part.points} size={part.size} tone={part.tone} />;
}

const restLifts = (mode: SplitMode) => {
  const test = testSetOf(mode);
  return Array.from({ length: EPISODES }, (_, k) => (test.includes(k) ? 1 : 0));
};

export function SceneSplit({ className }: { className?: string }) {
  const clipId = `scene-split-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-floor`;
  const [mode, setMode] = useState<SplitMode>('random');
  const test = testSetOf(mode);
  const { testScenes, leaked } = leakOf(test);
  const knob = knobParts(mode);

  const lifts = useRef<number[]>(restLifts('random'));
  /** The lifts the server and the first render draw; the run moves the cards from there on. */
  const [initial] = useState<number[]>(() => restLifts('random'));
  const cardRefs = useRef<Array<SVGGElement | null>>([]);
  const pinRefs = useRef<Array<SVGGElement | null>>([]);
  const frame = useRef(0);

  const place = (values: number[]) => {
    values.forEach((share, k) => {
      const shift = liftShift(share);
      cardRefs.current[k]?.setAttribute('transform', shift);
      pinRefs.current[k]?.setAttribute('transform', shift);
    });
  };

  const start = (next: SplitMode) => {
    cancelAnimationFrame(frame.current);
    const from = [...lifts.current];
    if (typeof window.matchMedia === 'function' && asksForStillness()) {
      lifts.current = restLifts(next);
      place(lifts.current);
      return;
    }
    let begin = 0;
    const tick = (now: number) => {
      if (!begin) begin = now;
      const t = (now - begin) / 1000;
      lifts.current = from.map((share, k) => liftAt(k, t, next, share));
      place(lifts.current);
      if (t < RUN_S) frame.current = requestAnimationFrame(tick);
      else frame.current = 0;
    };
    frame.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const choose = (next: SplitMode) => {
    setMode(next);
    start(next);
  };

  return (
    <InstrumentFigure
      figureId="scene-split"
      className={className}
      kicker="Splitting by scene"
      heading="Test on scenes the model never trained on"
      controls={
        <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
          <PresetGroup label="The split" presets={SPLITS} value={mode} onChange={choose} testId="split-mode" />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            data-testid="split-run"
            onClick={() => start(mode)}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Run the split
          </button>
        </div>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Raised against the lit rail: the test set; a card's shape is its scene"
          readout={readoutFor(mode)}
          status="Schematic: 20 illustrative episodes and one random draw"
          data-testid="split-stage-frame"
        >
          <IsoFigure
            width={WIDTH}
            height={HEIGHT}
            label={
              mode === 'random'
                ? `Twenty episode cards stand in a channel, five from each of four scenes, each printed with its scene's shape. A random split raises ${TEST_SIZE} cards, from ${scenesWord(testScenes.length)}, against the test rail; each of those scenes still has cards down in training.`
                : `Twenty episode cards stand in a channel, five from each of four scenes, each printed with its scene's shape. Holding out scene 4 raises all ${PER_SCENE} of its cards against the test rail and leaves none of its shape in training.`
            }
          >
            <defs>
              <clipPath id={clipId}>
                <path d={PIN_CLIP} />
              </clipPath>
            </defs>
            {PARTS.map((part, index) => {
              if (part.kind !== 'slot') return <PartView key={index} part={part} />;
              if (part.slot === 'strip') return <Line key="strip" d={stripHoles(test)} tone="mid" />;
              if (part.slot === 'knob') {
                return (
                  <g key="knob" data-testid="split-knob" data-mode={mode}>
                    <Solid paths={knob.knob} tone="mid" />
                    <Line d={knob.pointer} tone="hi" free="end" />
                  </g>
                );
              }
              return (
                <g key="cards" data-testid="split-cards">
                  {CARDS.map((card, k) => (
                    <g key={k} data-episode={k} data-scene={sceneOf(k)} data-test={test.includes(k) ? '' : undefined}>
                      <g clipPath={`url(#${clipId})`}>
                        <g ref={(el) => { pinRefs.current[k] = el; }} transform={liftShift(initial[k])}>
                          <Solid paths={card.pin} tone="mid" />
                        </g>
                      </g>
                      <g ref={(el) => { cardRefs.current[k] = el; }} transform={liftShift(initial[k])}>
                        <Solid paths={card.card} tone="hi" />
                        <Line d={card.print} tone="hi" />
                        <Line d={card.rules} tone="faint" free />
                      </g>
                    </g>
                  ))}
                </g>
              );
            })}
          </IsoFigure>
        </AnatomyStage>
      }
      caption="Split by the factor you claim to generalize across: a random split lets every test scene into training."
      method={
        <>
          <p>
            The article&apos;s rule for the training schema: split by the factor you claim to generalize across,
            because random episode splits can leak near-identical scenes and operators. Hold out environments for
            environment generalization, tasks for task generalization and embodiments for cross-embodiment claims.
          </p>
          <p>
            The rack is schematic: {EPISODES} episodes, {PER_SCENE} recorded in each of {SCENES} scenes, and a test set
            of {TEST_SIZE}. The random split is one seeded draw: it takes test episodes from{' '}
            {scenesWord(leakOf(testSetOf('random')).testScenes.length)}, and each of them keeps episodes in training. That
            is not luck. Of the {RANDOM_DRAWS.toLocaleString('en-US')} ways to draw {TEST_SIZE} test episodes from{' '}
            {EPISODES}, only {DRAWS_HOLDING_A_SCENE_OUT} take a whole scene, so nearly every random split tests on scenes
            the model also trained on. Holding out scene 4 is one of those {DRAWS_HOLDING_A_SCENE_OUT}, chosen on
            purpose.
          </p>
          <p data-testid="split-summary">
            {mode === 'random'
              ? `This split: test scenes ${testScenes.join(', ')}; also in training: ${leaked.join(', ')}.`
              : `This split: test scene ${testScenes.join(', ')}; also in training: none.`}
          </p>
        </>
      }
    />
  );
}
