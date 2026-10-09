'use client';

import { AnimatedElement, AnimatedGroup, AnimatedPath } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { focusViewBox, laggedProgress } from '@/components/motion/primitives';
import { AnimatedRobotDog, type DogFeet, type DogPose } from '@/components/motion/robot-dog';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import {
  DEFAULT_GAIT, GAITS, GAIT_ORDER, legPhase, minStanceCount, stanceLegs,
  type GaitId, type LegId,
} from '@/lib/gait';
import { MOTION_CAMERA } from '@/lib/motion-tokens';

/**
 * Gait support: three robot dogs line up on one ground line, one per gait,
 * from the walk to the hop. Each beat brings in the next dog; the camera
 * closes in while it takes two strides, then pulls back as it stops at the
 * moment that shows its gait best: three feet down in the walk, two in the
 * trot, none mid-leap in the hop. A last, still beat draws the trade the
 * line-up teaches, from steadier to more bounce, over all three dogs; its
 * end is the poster. The bound sits between the trot and the hop but also
 * stops mid-leap with no feet down, so drawn beside the hop it hid the
 * trend; its numbers stay in "How this was made".
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

/** The gaits the line-up draws, left to right. */
export const LINE_UP: readonly GaitId[] = ['walk', 'trot', 'pronk'];

/** Four moments of the stride at which the method note lists the feet on the ground. */
export const GAIT_SUPPORT_SAMPLES = [0.10, 0.48, 0.60, 0.98] as const;

const SPANS = beatSpans(GAIT_SUPPORT_SCENE.beats);
/** Strides the newest dog takes in its beat; whole strides end it where it started. */
const STRIDES_PER_BEAT = 2;
/**
 * The moment of the stride each dog stops at: the walk with one back foot
 * up, the trot on a diagonal pair, the bound and the hop mid-leap.
 */
export const SETTLE_PHASE: Record<GaitId, number> = { walk: 0.875, trot: 0.25, bound: 0.475, pronk: 0.675 };
/**
 * Within each beat the camera is in by 30%, holds to 60% and is home by
 * 85%. The newest dog steps from 10% to 85%, and the labels come back after.
 */
const CAMERA = { inStart: 0.1, inEnd: 0.3, outStart: 0.6, outEnd: 0.85 } as const;
/** The recap follows the last gait: no dog steps and the camera stays home. */
export const RECAP_INDEX = LINE_UP.length;
/** The trade arrives left to right, the way the line-up reads: steadier, the arrow drawing on, more bounce. */
const TRADE_LABELS: readonly string[] = ['steadier', 'arrow', 'bounce'];
/** In the recap the trade arrives one lag apart by 60% of the beat, then the whole picture holds. */
export const RECAP_REVEAL = { start: 0.1, end: 0.6 } as const;

const wrap01 = (v: number) => ((v % 1) + 1) % 1;
const r = (v: number) => Number(v.toFixed(2));
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

/** How far the camera has closed in on the newest dog, 0 (home) to 1; home at every beat end and in the recap. */
function cameraShare(index: number, u: number): number {
  if (index >= RECAP_INDEX || u <= CAMERA.inStart || u >= CAMERA.outEnd) return 0;
  if (u < CAMERA.inEnd) return (u - CAMERA.inStart) / (CAMERA.inEnd - CAMERA.inStart);
  if (u < CAMERA.outStart) return 1;
  return (CAMERA.outEnd - u) / (CAMERA.outEnd - CAMERA.outStart);
}

/** Where the newest dog is in its stride: it steps, easing in and out, and stops where it began. */
function steppingPhase(gait: GaitId, u: number): number {
  const stepping = smooth(clamp01((u - CAMERA.inStart) / (CAMERA.outEnd - CAMERA.inStart)));
  return r3(wrap01(SETTLE_PHASE[gait] + STRIDES_PER_BEAT * (stepping - 1)));
}

/** The scene at time t: the newest dog, its stride, the camera, and the gaits met so far. */
export function gaitSupportFrame(t: number) {
  const { index, u } = beatAt(t);
  const recap = index >= RECAP_INDEX;
  const gait = LINE_UP[Math.min(index, RECAP_INDEX - 1)];
  return {
    gait,
    index,
    recap,
    phase: recap ? SETTLE_PHASE[gait] : steppingPhase(gait, u),
    camera: r3(cameraShare(index, u)),
    visibleGaits: LINE_UP.slice(0, index + 1),
    minimumSupport: Object.fromEntries(GAIT_ORDER.map((id) => [id, minStanceCount(GAITS[id])])) as Record<GaitId, number>,
    stanceAtQuarter: Object.fromEntries(GAIT_ORDER.map((id) => [id, stanceLegs(GAITS[id], 0.25)])) as Record<GaitId, LegId[]>,
  };
}

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

/** The names of the first `count` gaits, in the order they come back. */
const nameKeys = (count: number) => LINE_UP.slice(0, count).map((id) => `name-${id}`);

/** How far one part of the trade has arrived in the recap, 0 to 1, before easing. */
export function tradeProgress(key: string, t: number): number {
  const { index, u } = beatAt(t);
  const position = TRADE_LABELS.indexOf(key);
  if (index < RECAP_INDEX || position < 0) return 0;
  const reveal = clamp01((u - RECAP_REVEAL.start) / (RECAP_REVEAL.end - RECAP_REVEAL.start));
  return laggedProgress(reveal, position, TRADE_LABELS.length);
}

/**
 * A stage label's opacity. Labels sit at fixed stage positions, so they
 * step aside while the camera leaves home and return one after another,
 * a lag apart, once it is back. In the recap the names stay and the trade
 * arrives the same way.
 */
export function labelOpacity(key: string, t: number): number {
  const { index, u } = beatAt(t);
  if (index >= RECAP_INDEX) {
    if (TRADE_LABELS.includes(key)) return r3(smooth(tradeProgress(key, t)));
    return nameKeys(LINE_UP.length).includes(key) ? 1 : 0;
  }
  const order = nameKeys(index + 1);
  const position = order.indexOf(key);
  if (u >= CAMERA.outEnd) {
    if (position < 0) return 0;
    return r3(smooth(laggedProgress((u - CAMERA.outEnd) / (1 - CAMERA.outEnd), position, order.length)));
  }
  return nameKeys(index).includes(key) ? r3(1 - smooth(clamp01(u / CAMERA.inStart))) : 0;
}

/** A dog's opacity: the newest one fades in, the ones already lined up step back while the camera is away. */
export function dogOpacity(k: number, t: number): number {
  const { index, u } = beatAt(t);
  if (k > index) return 0;
  if (k === index) return r3(smooth(clamp01(u / CAMERA.inStart)));
  return r3(1 - 0.65 * smooth(cameraShare(index, u)));
}

// Stage geometry, in stage units. Stage text keeps 14 CSS px at every width
// while the drawing scales, so the trade words hang under the arrow by an
// em offset: they stay by the arrow on a wide stage and clear it at 320 px.
const WIDTH = 340;
const HEIGHT = 156;
const GROUND_Y = 106;
const COLUMN_X = [57, 170, 283] as const;
const STATUS_Y = 20;
/** Gait names sit just above the highest body, clear of a dog mid-leap. */
const NAME_Y = GROUND_Y - 60;
const ARROW_Y = GROUND_Y + 14;
const ARROW_HEAD = 5;
const ARROW_LEFT = 12;
const ARROW_RIGHT = WIDTH - 12;
const TRADE_Y = ARROW_Y + ARROW_HEAD + 1;
const TRADE_DY = '1.25em';
/**
 * Each dog is drawn about its own ground point, nose to the right, then
 * scaled into its column. The far legs hang just ahead of the near ones: a
 * pair moving in step reads as one leg, where a wider gap drew it as a
 * hollow outline.
 */
const DOG = { rear: -37, front: 25, hipY: -38, segment: 22, farOffset: 3 } as const;
const DOG_SCALE = 0.66;
const STRIDE = 22;
const STEP_LIFT = 10;
/** How high each gait's body rises at the middle of a leap. */
const LEAP: Record<GaitId, number> = { walk: 0, trot: 0, bound: 10, pronk: 18 };

/**
 * The dog's feet and how high its body rides at one moment of a gait, in
 * drawing order (back far, back near, front far, front near). A foot on the
 * ground slides back under the body; a foot in the air swings forward.
 */
export function dogPose(id: GaitId, phase: number) {
  const gait = GAITS[id];
  const order: LegId[] = ['rh', 'lh', 'rf', 'lf'];
  const legs = order.map((leg) => {
    const p = legPhase(gait, leg, phase);
    if (p < gait.dutyFactor) return { p, down: true, dx: STRIDE / 2 - STRIDE * (p / gait.dutyFactor), lift: 0 };
    const swing = (p - gait.dutyFactor) / (1 - gait.dutyFactor);
    return { p, down: false, dx: -STRIDE / 2 + STRIDE * swing, lift: STEP_LIFT * Math.sin(Math.PI * swing) };
  });
  let rise = 0;
  if (legs.every((leg) => !leg.down)) {
    // Mid-leap: from the last foot leaving the ground to the next one landing.
    const sinceLift = Math.min(...legs.map((leg) => leg.p - gait.dutyFactor));
    const untilLand = Math.min(...legs.map((leg) => 1 - leg.p));
    rise = LEAP[id] * Math.sin(Math.PI * (sinceLift / (sinceLift + untilLand)));
  }
  const hips = [DOG.rear + DOG.farOffset, DOG.rear, DOG.front + DOG.farOffset, DOG.front];
  const feet = legs.map((leg, i) => [r(hips[i] + leg.dx), r(-leg.lift - rise)] as const) as unknown as DogFeet;
  return { feet, down: legs.map((leg) => leg.down), hipY: r(DOG.hipY - rise) };
}

const PAW_DOWN = 'var(--role-state-stage)';
const INK = 'var(--motion-stage-label)';
const DIM = 'var(--motion-stage-label-secondary)';
const HIGHLIGHT = 'var(--role-highlight-stage)';

/** Dog k's pose at time t: stepping while it is the newest, still at its settle moment after. */
function scenePose(k: number) {
  const id = LINE_UP[k];
  return (t: number): DogPose => {
    const { index, u } = beatAt(t);
    const pose = dogPose(id, k === index ? steppingPhase(id, u) : SETTLE_PHASE[id]);
    return { hipY: pose.hipY, feet: pose.feet, footFill: pose.down.map((down) => (down ? PAW_DOWN : undefined)) };
  };
}

/** The camera window stays 6 units inside the stage, so a mark it cuts keeps the 4 px margin. */
export const CAMERA_WINDOW = { x: 6, y: 6, width: WIDTH - 12, height: HEIGHT - 12 } as const;
/**
 * What the camera closes in on: one dog, with room above the highest leap,
 * so a dimmed neighbour's head stays clear of the status label.
 */
export const focusBox = (k: number) => ({ x: COLUMN_X[k] - 44, y: GROUND_Y - 66, width: 88, height: 72 });
/** As close as the window still holds the whole dog, never past the token. */
export const FOCUS_ZOOM = Math.min(
  MOTION_CAMERA.focusMaxZoom,
  CAMERA_WINDOW.width / focusBox(0).width,
  CAMERA_WINDOW.height / focusBox(0).height,
);

/** The camera as a transform on the line-up, eased by focusViewBox. */
export function gaitCameraTransform(t: number): string {
  const { index, u } = beatAt(t);
  const share = cameraShare(index, u);
  if (share === 0) return 'translate(0 0) scale(1)';
  const [x, y, width] = focusViewBox({ x: 0, y: 0, width: WIDTH, height: HEIGHT }, focusBox(index), share, FOCUS_ZOOM)
    .split(' ')
    .map(Number);
  const scale = WIDTH / width;
  return `translate(${r(-x * scale)} ${r(-y * scale)}) scale(${r3(scale)})`;
}

const CAMERA_CLIP = 'gait-support-camera';
/**
 * The shaft grows from the steadier end as path geometry. The scene clock
 * writes each binding with setAttribute under its key, so a camelCase dash
 * binding would keep its poster value while playing.
 */
const arrowShaft = (t: number) =>
  `M${ARROW_LEFT} ${ARROW_Y} H${r(ARROW_LEFT + (ARROW_RIGHT - ARROW_LEFT) * smooth(tradeProgress('arrow', t)))}`;
const ARROW_LEFT_HEAD = `M${ARROW_LEFT + ARROW_HEAD} ${ARROW_Y - ARROW_HEAD} L${ARROW_LEFT} ${ARROW_Y} L${ARROW_LEFT + ARROW_HEAD} ${ARROW_Y + ARROW_HEAD}`;
const ARROW_RIGHT_HEAD = `M${ARROW_RIGHT - ARROW_HEAD} ${ARROW_Y - ARROW_HEAD} L${ARROW_RIGHT} ${ARROW_Y} L${ARROW_RIGHT - ARROW_HEAD} ${ARROW_Y + ARROW_HEAD}`;
const feetDownAt = (id: GaitId) => stanceLegs(GAITS[id], SETTLE_PHASE[id]).length;

/** One end of the trade-off arrow, hanging under it in the highlight role. */
function TradeWord({ x, anchor, word, opacity }: {
  x: number; anchor: 'start' | 'end'; word: string; opacity: (t: number) => number;
}) {
  return (
    <AnimatedElement
      as="text"
      data-scene-stage-label="annotation"
      x={x}
      y={TRADE_Y}
      dy={TRADE_DY}
      textAnchor={anchor}
      fontSize={14}
      fontWeight={600}
      fill={HIGHLIGHT}
      bindings={{ opacity }}
    >
      {word}
    </AnimatedElement>
  );
}

function GaitSupportStage() {
  return (
    <StageSvg viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <text x={8} y={STATUS_Y} fontSize={14} fill={DIM}>schematic, not measured</text>

      <defs data-scene-structure="camera-clip">
        <clipPath id={CAMERA_CLIP}>
          <rect {...CAMERA_WINDOW} />
        </clipPath>
      </defs>
      {/* The camera: the ground and the dogs move with it; the labels stay on the stage. */}
      <g clipPath={`url(#${CAMERA_CLIP})`}>
        <AnimatedGroup data-scene-camera="" bindings={{ transform: gaitCameraTransform }}>
          {/* The ground runs past the stage so a close-up never shows its end; the window clips it. */}
          <g data-scene-structure="ground" stroke="var(--motion-stage-axes)" strokeWidth={1.5} strokeLinecap="round">
            <line x1={-WIDTH} x2={2 * WIDTH} y1={GROUND_Y} y2={GROUND_Y} />
          </g>
          {LINE_UP.map((id, k) => (
            <AnimatedGroup key={id} data-gait-dog={id} bindings={{ opacity: (t) => dogOpacity(k, t) }}>
              <g transform={`translate(${COLUMN_X[k]} ${GROUND_Y}) scale(${DOG_SCALE})`}>
                <AnimatedRobotDog
                  rear={DOG.rear}
                  front={DOG.front}
                  baseHipY={DOG.hipY}
                  segment={DOG.segment}
                  farOffset={DOG.farOffset}
                  ink={INK}
                  farLegOpacity={1}
                  joints={false}
                  pose={scenePose(k)}
                  footMarks={[`${id}-foot-0`, `${id}-foot-1`, `${id}-foot-2`, `${id}-foot-3`]}
                  testId={`gait-dog-${id}`}
                />
              </g>
            </AnimatedGroup>
          ))}
        </AnimatedGroup>
      </g>

      {LINE_UP.map((id, k) => (
        <AnimatedElement
          as="text"
          key={id}
          data-scene-stage-label="gait-name"
          x={COLUMN_X[k]}
          y={NAME_Y}
          textAnchor="middle"
          fontSize={14}
          fontWeight={600}
          fill={INK}
          bindings={{ opacity: (t) => labelOpacity(`name-${id}`, t) }}
        >
          {GAIT_WORDS[id]}
        </AnimatedElement>
      ))}

      {/* The recap's note: the line-up runs from steadier to more bounce, and the arrow draws on that way. */}
      <AnimatedGroup data-figure-annotation="" bindings={{ opacity: (t) => (tradeProgress('steadier', t) > 0 ? 1 : 0) }}>
        <g data-scene-structure="annotation-arrow" fill="none" stroke={HIGHLIGHT} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <AnimatedPath d={ARROW_LEFT_HEAD} bindings={{ opacity: (t) => labelOpacity('steadier', t) }} />
          <AnimatedPath strokeLinecap="butt" bindings={{ d: arrowShaft }} />
          <AnimatedPath d={ARROW_RIGHT_HEAD} bindings={{ opacity: (t) => labelOpacity('bounce', t) }} />
        </g>
        <TradeWord x={ARROW_LEFT} anchor="start" word="steadier" opacity={(t) => labelOpacity('steadier', t)} />
        <TradeWord x={ARROW_RIGHT} anchor="end" word="more bounce" opacity={(t) => labelOpacity('bounce', t)} />
      </AnimatedGroup>
    </StageSvg>
  );
}

const pct = (phase: number) => `${Math.round(phase * 100)}%`;
const footList = (legs: LegId[]) => (legs.length ? legs.map((leg) => FOOT_WORDS[leg]).join(', ') : 'none');

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
          The line-up stops each dog at one moment of its stride, {LINE_UP.map((id) => `${GAIT_WORDS[id].toLowerCase()} at ${pct(SETTLE_PHASE[id])} with ${feetDownAt(id)} feet down`).join(', ')}.
          The camera closes in on each dog while it steps and is back at the whole line-up at the end of every step.
          The last step holds the line-up still and draws the arrow from steadier to more bounce.
        </p>
        <p>
          The line-up leaves out the bound, which sits between the trot and the hop: the front pair lands, then the
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
