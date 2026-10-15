'use client';

import { AnimatedElement, AnimatedGroup } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import { PartView } from '@/components/iso/part-view';
import type { SolidPaths, Tone } from '@/components/iso/iso-kit';
import {
  BELT_BAND,
  BODY_PARTS,
  FOOT_ORDER,
  PAPER_PER_STRIDE,
  PARTS,
  STRIDE,
  VIEW_BOX,
  beltSlats,
  blendPose,
  bodyShift,
  gaitPose,
  inkBars,
  legParts,
  needlePath,
  penParts,
  type FootPose,
  type Slot,
} from '@/components/iso/figures/gait-treadmill';
import {
  DEFAULT_GAIT, GAITS, GAIT_ORDER, minStanceCount, stanceLegs,
  type GaitId, type LegId,
} from '@/lib/gait';

/**
 * Gait support: one four-legged robot on a treadmill
 * (components/iso/figures/gait-treadmill.ts), wired to a four-pen gait
 * recorder. Each beat the robot changes gait and takes two strides: a pen
 * inks its lane on the moving paper while its foot is on the ground, and the
 * control box's counter shows how many feet are down. It walks with three
 * feet down, trots with two, and hops with at times none, and the paper
 * keeps all three side by side, so the recap holds the whole trade: which
 * feet move together decides how many stay on the ground. Each beat ends on
 * the moment that shows its gait best: three feet down in the walk, two in
 * the trot, none mid-leap in the hop. The bound sits between the trot and
 * the hop but also stops mid-leap with no feet down, so beside the hop it
 * hid the trend; its numbers stay in "How this was made".
 */
export const GAIT_SUPPORT_SCENE: SceneDefinition = {
  id: 'gait-support',
  title: 'Feet on the ground in three gaits of a robot dog',
  kicker: 'Gaits of a four-legged robot',
  headline: 'Walking to hopping: fewer feet down, less steady, more bounce',
  beats: [
    { id: 'walk', duration: 'long', linear: true, caption: 'Walking: the feet lift one at a time, so three always stay on the ground.' },
    { id: 'trot', duration: 'long', linear: true, caption: 'Trotting: diagonal feet move in pairs, so two are always on the ground.' },
    { id: 'pronk', duration: 'long', linear: true, caption: 'Hopping: all four feet push off and land together, so at times none touch the ground.' },
    {
      id: 'recap',
      caption: 'One robot can walk, trot or hop by changing which feet move together.',
    },
  ],
};

/** The gaits the robot runs through, one per beat, in order. */
export const LINE_UP: readonly GaitId[] = ['walk', 'trot', 'pronk'];

/** Four moments of the stride at which the method note lists the feet on the ground. */
export const GAIT_SUPPORT_SAMPLES = [0.10, 0.48, 0.60, 0.98] as const;

const SPANS = beatSpans(GAIT_SUPPORT_SCENE.beats);
/** Strides the robot takes in each gait's beat; whole strides end it where it started. */
export const STRIDES_PER_BEAT = 2;
/**
 * The moment of the stride each beat ends on: the walk with one back foot
 * up, the trot on a diagonal pair, the bound and the hop mid-leap.
 */
export const SETTLE_PHASE: Record<GaitId, number> = { walk: 0.875, trot: 0.25, bound: 0.475, pronk: 0.675 };
/**
 * Within each gait's beat the robot changes gait (and the paper feeds a
 * blank gap) by 10%, strides from 10% to 85%, and holds its settle moment
 * to the end.
 */
export const BEAT_TIMING = { change: 0.1, strideEnd: 0.85 } as const;
/** The blank paper fed between two gaits. */
export const PAPER_GAP = 4;
/** The recap follows the last gait: the robot holds still and the chart is complete. */
export const RECAP_INDEX = LINE_UP.length;

const wrap01 = (v: number) => ((v % 1) + 1) % 1;
const r3 = (v: number) => Number(v.toFixed(3));

/** Plain names for the four gaits, in order. */
export const GAIT_WORDS: Record<GaitId, string> = { walk: 'Walk', trot: 'Trot', bound: 'Bound', pronk: 'Hop' };

/** Plain names for the four feet. */
const FOOT_WORDS: Record<LegId, string> = { lf: 'front left', rf: 'front right', lh: 'back left', rh: 'back right' };

function beatAt(t: number) {
  let index = SPANS.findIndex((span) => t <= span.end);
  if (index < 0) index = SPANS.length - 1;
  const span = SPANS[index];
  return { index, u: clamp01((t - span.start) / span.duration) };
}

/** How far through its two strides the robot is in a gait's beat, 0 to 1, eased in and out. */
const strided = (u: number) => smooth(clamp01((u - BEAT_TIMING.change) / (BEAT_TIMING.strideEnd - BEAT_TIMING.change)));
/** Where the robot is in its stride: it steps, easing in and out, and stops where it began. */
const steppingPhase = (gait: GaitId, u: number) => r3(wrap01(SETTLE_PHASE[gait] + STRIDES_PER_BEAT * (strided(u) - 1)));
/** Paper fed per gait's beat: the gap, then the two strides. */
const SECTION = PAPER_GAP + STRIDES_PER_BEAT * PAPER_PER_STRIDE;

/** The stretches of a stride range (from phase a, a stride count long) a foot spends on the ground, as stride offsets. */
function stanceStretches(gait: GaitId, leg: LegId, from: number, strides: number): Array<[number, number]> {
  const { dutyFactor, offsets } = GAITS[gait];
  const out: Array<[number, number]> = [];
  for (let k = Math.floor(from - offsets[leg]) - 1; k <= Math.ceil(from + strides - offsets[leg]) + 1; k++) {
    const start = offsets[leg] + k;
    const a = Math.max(start, from);
    const b = Math.min(start + dutyFactor, from + strides);
    if (b > a) out.push([a - from, b - from]);
  }
  return out;
}

/**
 * The ink each lane carries for a gait once its beat has run to `progress`
 * (0 to 1 of its strides), in paper positions: its section starts after the
 * earlier gaits' sections and a blank gap.
 */
function inkFor(gait: GaitId, leg: LegId, progress: number): Array<readonly [number, number]> {
  const index = LINE_UP.indexOf(gait);
  const start = index * SECTION + PAPER_GAP;
  const from = SETTLE_PHASE[gait] - STRIDES_PER_BEAT;
  const done = STRIDES_PER_BEAT * progress;
  return stanceStretches(gait, leg, from, STRIDES_PER_BEAT)
    .map(([a, b]) => [a, Math.min(b, done)] as const)
    .filter(([a, b]) => b > a)
    .map(([a, b]) => [start + a * PAPER_PER_STRIDE, start + b * PAPER_PER_STRIDE] as const);
}

/** The robot's pose at time t: a gait's moment, or a blend from the last gait's settle moment while it changes gait. */
function poseAt(t: number) {
  const { index, u } = beatAt(t);
  if (index >= RECAP_INDEX) return gaitPose('pronk', SETTLE_PHASE.pronk);
  const gait = LINE_UP[index];
  const here = gaitPose(gait, steppingPhase(gait, u));
  if (index === 0 || u >= BEAT_TIMING.change) return here;
  const before = LINE_UP[index - 1];
  return blendPose(gaitPose(before, SETTLE_PHASE[before]), here, smooth(u / BEAT_TIMING.change));
}

/** The feet on the ground at time t. */
const feetDownAt = (t: number) => poseAt(t).feet.filter((foot) => foot.down).length;

/** The scene at time t: the gait, its stride, the paper and the ink, the counter and the belt. */
export function gaitSupportFrame(t: number) {
  const { index, u } = beatAt(t);
  const recap = index >= RECAP_INDEX;
  const gait = LINE_UP[Math.min(index, RECAP_INDEX - 1)];
  const pose = poseAt(t);
  // Paper: whole sections for the beats run, then this beat's gap and strides.
  const paper = recap
    ? LINE_UP.length * SECTION
    : index * SECTION + PAPER_GAP * smooth(Math.min(1, u / BEAT_TIMING.change)) + STRIDES_PER_BEAT * PAPER_PER_STRIDE * strided(u);
  // The belt carries a foot on the ground back a stride per stance: faster for a shorter stance.
  const belt = LINE_UP.slice(0, Math.min(index, RECAP_INDEX)).reduce((sum, id) => sum + (STRIDES_PER_BEAT * STRIDE) / GAITS[id].dutyFactor, 0) +
    (recap ? 0 : (STRIDES_PER_BEAT * STRIDE * strided(u)) / GAITS[gait].dutyFactor);
  // The counter's needle averages the last 100 ms, so it swings rather than snaps.
  const needle = [0, 25, 50, 75, 100].reduce((sum, back) => sum + feetDownAt(Math.max(0, t - back)), 0) / 5;
  const ink = Object.fromEntries(LINE_UP.map((id, k) => [id, Object.fromEntries(FOOT_ORDER.map((leg) => [leg,
    k < index || recap ? inkFor(id, leg, 1) : k === index ? inkFor(id, leg, strided(u)) : []]))])) as Record<GaitId, Record<LegId, Array<readonly [number, number]>>>;
  return {
    gait,
    index,
    recap,
    phase: recap ? SETTLE_PHASE[gait] : steppingPhase(gait, u),
    pose,
    paper: r3(paper),
    belt: r3(belt),
    needle: r3(needle),
    ink,
    /** The gaits the paper carries so far. */
    visibleGaits: LINE_UP.slice(0, recap ? RECAP_INDEX : index + 1),
    minimumSupport: Object.fromEntries(GAIT_ORDER.map((id) => [id, minStanceCount(GAITS[id])])) as Record<GaitId, number>,
    stanceAtQuarter: Object.fromEntries(GAIT_ORDER.map((id) => [id, stanceLegs(GAITS[id], 0.25)])) as Record<GaitId, LegId[]>,
  };
}

type Frame = ReturnType<typeof gaitSupportFrame>;
/** Every binding of a moment reads the same frame, so it is computed once per moment. */
const frameCache: { t: number; frame: Frame | null } = { t: Number.NaN, frame: null };
const frameAt = (t: number): Frame => {
  if (t !== frameCache.t || !frameCache.frame) {
    frameCache.frame = gaitSupportFrame(t);
    frameCache.t = t;
  }
  return frameCache.frame;
};

/** The readout line: the fewest feet the gait keeps on the ground. */
export function supportWords(id: GaitId): string {
  const least = minStanceCount(GAITS[id]);
  return least > 0
    ? `${GAIT_WORDS[id]}: at least ${least} feet on the ground`
    : `${GAIT_WORDS[id]}: at times no feet on the ground`;
}

/** Which feet leave the ground together in each gait, in plain words. */
const LIFTS: Record<GaitId, string> = {
  walk: 'lifts one foot at a time',
  trot: 'a diagonal pair',
  bound: 'the front pair then the back pair',
  pronk: 'all four at once',
};

/**
 * The recap's readout: what tells the four gaits apart, left to right. The
 * fewest feet each keeps down stays in "How this was made".
 */
export function recapWords(): string {
  return `${LINE_UP.map((id, k) => `${k === 0 ? GAIT_WORDS[id] : GAIT_WORDS[id].toLowerCase()} ${LIFTS[id]}`).join(', ')}.`;
}

/** The mark for one foot's ink in one gait's stretch of paper. */
export const footMark = (gait: GaitId, leg: LegId) => `${gait}-foot-${FOOT_ORDER.indexOf(leg)}`;

const STATE = 'var(--role-state-stage)';

/** A solid whose shape changes with scene time, drawn as the kit's Solid draws it. */
function LiveSolid({ build, tone, lit = false }: { build: (t: number) => SolidPaths; tone: Tone | ((t: number) => Tone); lit?: boolean }) {
  return (
    <g className="iso-solid" data-lit={lit ? '' : undefined}>
      <AnimatedElement as="path" className="iso-fill" bindings={{ d: (t) => build(t).fill }} />
      {[0, 1, 2, 3].map((shade) => (
        <AnimatedElement key={shade} as="path" className="iso-shade" data-shade={shade} bindings={{ d: (t) => build(t).shades[shade] || 'M0 0' }} />
      ))}
      <AnimatedElement as="path" className="iso-top" bindings={{ d: (t) => build(t).top || 'M0 0' }} />
      <AnimatedElement as="path" className="iso-line iso-crease" data-tone="faint" bindings={{ d: (t) => build(t).crease || 'M0 0' }} />
      <AnimatedElement as="path" className="iso-line iso-bevel" data-tone="faint" bindings={{ d: (t) => build(t).bevel || 'M0 0' }} />
      <AnimatedElement
        as="path"
        className="iso-line iso-edge"
        data-tone={typeof tone === 'string' ? tone : undefined}
        bindings={typeof tone === 'string' ? { d: (t) => build(t).outline } : { d: (t) => build(t).outline, 'data-tone': tone }}
      />
    </g>
  );
}

/** One leg, rebuilt each moment from the pose. */
function Leg({ leg }: { leg: LegId }) {
  const index = FOOT_ORDER.indexOf(leg);
  const cache: { t: number; parts: ReturnType<typeof legParts> | null } = { t: Number.NaN, parts: null };
  const parts = (t: number) => {
    if (t !== cache.t || !cache.parts) {
      const { pose } = frameAt(t);
      cache.parts = legParts(pose.feet[index] as FootPose, pose.rise);
      cache.t = t;
    }
    return cache.parts;
  };
  return (
    <g data-scene-part={`leg-${leg}`}>
      {[0, 1, 2, 3, 4].map((piece) => (
        <LiveSolid key={piece} build={(t) => parts(t)[piece]!.paths} tone={(t) => parts(t)[piece]!.tone} />
      ))}
    </g>
  );
}

/** One pen, lowered onto its lane while its foot is on the ground. */
function Pen({ leg }: { leg: LegId }) {
  const index = FOOT_ORDER.indexOf(leg);
  const down = (t: number) => [0, 15, 30].reduce((sum, back) => sum + (poseAt(Math.max(0, t - back)).feet[index]!.down ? 1 : 0), 0) / 3;
  return (
    <g data-scene-part={`pen-${leg}`}>
      {[0, 1].map((piece) => (
        <LiveSolid key={piece} build={(t) => penParts(leg, down(t))[piece]!.paths} tone={piece === 1 ? 'hi' : 'mid'} />
      ))}
    </g>
  );
}

function SlotView({ slot }: { slot: Slot }) {
  switch (slot) {
    case 'belt':
      return (
        <g data-scene-part="belt">
          <path className="iso-fill" d={BELT_BAND} />
          <path className="iso-shade" data-shade={1} d={BELT_BAND} />
          <AnimatedElement as="path" className="iso-line" data-tone="lo" bindings={{ d: (t) => beltSlats(frameAt(t).belt) || 'M0 0' }} />
        </g>
      );
    case 'legs-far':
      return <>{(['rh', 'rf'] as const).map((leg) => <Leg key={leg} leg={leg} />)}</>;
    case 'legs-near':
      return <>{(['lh', 'lf'] as const).map((leg) => <Leg key={leg} leg={leg} />)}</>;
    case 'body':
      return (
        <AnimatedGroup data-scene-part="body" bindings={{ transform: (t) => bodyShift(frameAt(t).pose.rise) }}>
          {BODY_PARTS.map((part, index) => <PartView key={index} part={part} />)}
        </AnimatedGroup>
      );
    case 'needle':
      // The stance counter's needle: the one lit part.
      return <AnimatedElement as="path" className="iso-line" data-tone="lit" data-free="end" style={{ strokeWidth: 1.4 }} bindings={{ d: (t) => needlePath(frameAt(t).needle) }} />;
    case 'chart':
      // The ink: each foot's lane, one mark per gait, painted as a foot on the ground.
      return (
        <g data-scene-part="chart">
          {LINE_UP.flatMap((gait) =>
            FOOT_ORDER.map((leg) => (
              <AnimatedElement
                key={`${gait}-${leg}`}
                as="path"
                data-scene-mark={footMark(gait, leg)}
                data-legend-series="gait-support"
                fill={STATE}
                stroke="none"
                bindings={{
                  d: (t) => inkBars(leg, frameAt(t).ink[gait][leg], frameAt(t).paper) || 'M0 0',
                  opacity: (t) => (frameAt(t).visibleGaits.includes(gait) ? 1 : 0),
                }}
              />
            )),
          )}
        </g>
      );
    case 'pens':
      return <>{(['lf', 'rf', 'lh', 'rh'] as const).map((leg) => <Pen key={leg} leg={leg} />)}</>;
    default:
      return null;
  }
}

/** The stage alone, so tests can render any moment inside a static-time provider. */
export function GaitSupportStage() {
  return (
    <div className="iso" data-anatomy-drawing="">
      <StageSvg viewBox={VIEW_BOX} className="iso-svg">
        {PARTS.map((part, index) => (part.kind === 'slot' ? <SlotView key={part.slot} slot={part.slot} /> : <PartView key={index} part={part} />))}
      </StageSvg>
    </div>
  );
}

const pct = (phase: number) => `${Math.round(phase * 100)}%`;
const footList = (legs: LegId[]) => (legs.length ? legs.map((leg) => FOOT_WORDS[leg]).join(', ') : 'none');
const feetDownAtSettle = (id: GaitId) => stanceLegs(GAITS[id], SETTLE_PHASE[id]).length;

const GAIT_METHOD_NOTE = `Each gait is an authored timing pattern, not measured robot footfalls. A foot stays on the ground for a fixed share of the stride, its duty factor: walk ${GAITS.walk.dutyFactor}, trot ${GAITS.trot.dutyFactor}, bound ${GAITS.bound.dutyFactor} and hop ${GAITS.pronk.dutyFactor}. Each foot lands at its own point in the stride, its phase offset: the walk lands back left, front left, back right, front right a quarter stride apart; the trot pairs front left with back right and front right with back left half a stride apart; the bound lands the front pair, then the back pair half a stride later; the hop, which robotics papers call a pronk, lands all four together.`;

export function GaitSupport({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={GAIT_SUPPORT_SCENE}
      stage={<GaitSupportStage />}
      anchorId="gait-support"
      className={className}
      legend={
        <LegendItem series="gait-support" swatch={<span aria-hidden className="inline-block h-2.5 w-4" style={{ backgroundColor: 'var(--role-state-graphic)' }} />}>
          foot on the ground
        </LegendItem>
      }
      readout={({ beatIndex }) => (beatIndex >= RECAP_INDEX ? recapWords() : supportWords(LINE_UP[beatIndex] ?? DEFAULT_GAIT))}
      statusLine="Schematic, not measured: authored gait timings."
      method={<>
        <p data-testid="gait-method">{GAIT_METHOD_NOTE}</p>
        <p>
          In robotics papers the feet are written LF, RF, LH and RH: left front, right front, left hind and right
          hind. The fewest feet down at any moment of the stride: walk {minStanceCount(GAITS.walk)}, trot{' '}
          {minStanceCount(GAITS.trot)}, bound {minStanceCount(GAITS.bound)}, hop {minStanceCount(GAITS.pronk)}.
        </p>
        <p>Feet on the ground at four moments of the stride:</p>
        <ul>
          {GAIT_ORDER.map((id) => (
            <li key={id}>
              {GAIT_WORDS[id]}: {GAIT_SUPPORT_SAMPLES.map((phase) => `${pct(phase)} ${footList(stanceLegs(GAITS[id], phase))}`).join('; ')}.
            </li>
          ))}
        </ul>
        <p>
          The drawing is a robot on a treadmill wired to a gait recorder. While a foot is on the ground its pen inks
          its lane on the moving paper, front left at the back of the strip and back right at the front, so the strip
          is a footfall chart: a long bar is a foot that stays down most of the stride. The counter on the control box
          shows how many feet are down. Each step the robot takes {STRIDES_PER_BEAT} strides in one gait and stops at
          one moment of its stride, {LINE_UP.map((id) => `${GAIT_WORDS[id].toLowerCase()} at ${pct(SETTLE_PHASE[id])} with ${feetDownAtSettle(id)} feet down`).join(', ')};
          the paper keeps all three gaits side by side for the last step. The treadmill and recorder are an
          illustration, not a test rig.
        </p>
        <p>
          The robot leaves out the bound, which sits between the trot and the hop: the front pair lands, then the
          back pair, so two feet are down for most of the stride, with a short leap in between.
        </p>
        <p>The steps, in order:</p>
        <ol>
          {GAIT_SUPPORT_SCENE.beats.map((beat) => <li key={beat.id}>{beat.caption}</li>)}
        </ol>
      </>}
      textAlternative={`${GAIT_SUPPORT_SCENE.title}. ${GAIT_SUPPORT_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')} ${GAIT_METHOD_NOTE}`}
    />
  );
}

export default GaitSupport;
