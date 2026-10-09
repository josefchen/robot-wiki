'use client';

import type { CSSProperties } from 'react';
import { AnimatedElement, AnimatedGroup, AnimatedPath } from '@/components/motion/animated';
import { clamp01 } from '@/components/motion/easing';
import { AnimatedRobotDog, type DogFeet, type DogPose } from '@/components/motion/robot-dog';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import {
  DEFAULT_GAIT, GAITS, GAIT_ORDER, LEGS, legPhase, minStanceCount, stanceLegs,
  type GaitDef, type GaitId, type LegId,
} from '@/lib/gait';

/**
 * Gait support: one robot dog walks, trots, bounds and finally hops (the
 * pronk), one gait per beat, above a classic footfall strip with a row per
 * paw. A filled stretch is a paw on the ground; an empty stretch is a paw in
 * the air. The playhead sweeps the stride while the dog's paws follow the
 * same timing, so the strip and the drawing say the same thing: fewer paws
 * stay down as the gait speeds up, until the hop leaves all four in the air.
 */
export const GAIT_SUPPORT_SCENE: SceneDefinition = {
  id: 'gait-support',
  title: 'Foot support over an authored stride cycle',
  kicker: 'Quadruped gaits',
  headline: 'From walking to hopping, fewer feet stay on the ground',
  beats: [
    { id: 'walk', duration: 'long', linear: true, caption: 'Walking: the paws lift one at a time, so three always stay on the ground.' },
    { id: 'trot', duration: 'long', linear: true, caption: 'Trotting: diagonal paws move as pairs, so two are always on the ground.' },
    { id: 'bound', duration: 'long', linear: true, caption: 'Bounding: the front pair lands, then the back pair, with a short moment in the air.' },
    {
      id: 'pronk',
      duration: 'long',
      linear: true,
      caption: 'Hopping, or pronking, lifts all four paws at once; like animals, robots trade built-in stability for bounce as fewer feet stay down.',
    },
  ],
};

/** Four moments of the stride at which the method note lists the paws on the ground. */
export const GAIT_SUPPORT_SAMPLES = [0.10, 0.48, 0.60, 0.98] as const;

const SPANS = beatSpans(GAIT_SUPPORT_SCENE.beats);
/** Strides the dog takes in each beat; whole strides keep the phase continuous across beats. */
const STRIDES_PER_BEAT = 2;
/** Every beat ends here: three paws down in the walk, two in the trot, the back pair in the bound, none in the hop. */
const SETTLE_PHASE = 0.675;

const wrap01 = (v: number) => ((v % 1) + 1) % 1;
const r = (v: number) => Number(v.toFixed(2));

/** Plain names for the four gaits, in order. */
export const GAIT_WORDS: Record<GaitId, string> = {
  walk: 'Walk',
  trot: 'Trot',
  bound: 'Bound',
  pronk: 'Hop (pronk)',
};

/** Plain names for the four paws, in the strip's row order. */
const PAW_WORDS: Record<LegId, string> = {
  lf: 'front left',
  rf: 'front right',
  lh: 'back left',
  rh: 'back right',
};

/** Which gait the dog shows at scene time t, how far through its stride, and the gaits met so far. */
export function gaitSupportFrame(t: number) {
  let index = SPANS.findIndex((span) => t <= span.end);
  if (index < 0) index = SPANS.length - 1;
  const span = SPANS[index];
  const u = clamp01((t - span.start) / span.duration);
  return {
    gait: GAIT_ORDER[index],
    phase: r(wrap01(SETTLE_PHASE + STRIDES_PER_BEAT * (u - 1))),
    /** Strides walked since the scene began, for the passing ground marks. */
    travelled: index * STRIDES_PER_BEAT + STRIDES_PER_BEAT * u,
    visibleGaits: GAIT_ORDER.slice(0, index + 1),
    minimumSupport: Object.fromEntries(GAIT_ORDER.map((id) => [id, minStanceCount(GAITS[id])])) as Record<GaitId, number>,
    stanceAtQuarter: Object.fromEntries(GAIT_ORDER.map((id) => [id, stanceLegs(GAITS[id], 0.25)])) as Record<GaitId, LegId[]>,
  };
}

/** The ground-contact stretches of one paw over a stride, split where they wrap past its end. */
export function stanceSpans(gait: GaitDef, leg: LegId): [number, number][] {
  const start = gait.offsets[leg];
  const end = start + gait.dutyFactor;
  return end <= 1 ? [[start, end]] : [[start, 1], [0, end - 1]];
}

/** The readout line: the fewest paws the gait keeps on the ground. */
export function supportWords(id: GaitId): string {
  const least = minStanceCount(GAITS[id]);
  return least > 0
    ? `${GAIT_WORDS[id]}: at least ${least} feet on the ground`
    : `${GAIT_WORDS[id]}: at times no feet on the ground`;
}

// Stage layout, in the 340 by 272 stage. The dog stands low enough that the
// top of its head stays clear of the current-gait bar at the height of the hop.
const GROUND_Y = 113;
const HIP_Y = 75;
const REAR_HIP = 150;
const FRONT_HIP = 212;
const SEGMENT = 22;
const STRIDE_PX = 22;
const STEP_LIFT = 7;
const HOP = 10;
const STRIP_LEFT = 100;
const STRIP_RIGHT = 330;
const STRIP_W = STRIP_RIGHT - STRIP_LEFT;
const ROW_TOP = 152;
const ROW_H = 14;
const ROW_GAP = 8;
const AXIS_Y = ROW_TOP + LEGS.length * (ROW_H + ROW_GAP) + 2;
const GAIT_NAME_X = [8, 66, 124, 196];
/**
 * Approximate drawn widths of the gait names at the stage's base scale, for
 * the bar under the current one. Stage text keeps its CSS pixel size as the
 * stage widens, so the bar shrinks by the same type scale (BAR_TYPE_SCALE).
 */
const GAIT_NAME_WIDTH = [31, 29, 41, 78];
const BAR_TYPE_SCALE: CSSProperties = {
  transformBox: 'fill-box',
  transformOrigin: 'left center',
  transform: 'scaleX(calc(1 / var(--motion-stage-type-scale, 1)))',
};
const HATCH_COUNT = 9;
const HATCH_SPACING = 24;
const stripX = (phase: number) => r(STRIP_LEFT + phase * STRIP_W);
const rowY = (row: number) => ROW_TOP + row * (ROW_H + ROW_GAP);

/** Where one paw is: on the ground sliding back under the body, or swinging forward through the air. */
function pawPose(gait: GaitDef, leg: LegId, phase: number) {
  const p = legPhase(gait, leg, phase);
  if (p < gait.dutyFactor) {
    return { down: true, dx: STRIDE_PX / 2 - STRIDE_PX * (p / gait.dutyFactor), lift: 0, swing: 0 };
  }
  const swing = (p - gait.dutyFactor) / (1 - gait.dutyFactor);
  return { down: false, dx: -STRIDE_PX / 2 + STRIDE_PX * swing, lift: STEP_LIFT * Math.sin(Math.PI * swing), swing };
}

/** The dog's paws and how high its body rides at one moment of a gait; `down` follows drawing order. */
export function dogPose(id: GaitId, phase: number) {
  const gait = GAITS[id];
  // Drawing order: back far (right), back near (left), front far (right), front near (left).
  const order: LegId[] = ['rh', 'lh', 'rf', 'lf'];
  const poses = order.map((leg) => pawPose(gait, leg, phase));
  // The body rises only while every paw is off the ground, highest midway through that flight.
  const airborne = poses.every((pose) => !pose.down);
  const bodyLift = airborne ? HOP * Math.min(...poses.map((pose) => Math.sin(Math.PI * pose.swing))) : 0;
  const hips = [REAR_HIP + 3, REAR_HIP, FRONT_HIP + 3, FRONT_HIP];
  const feet = poses.map((pose, i) => [
    r(hips[i] + pose.dx),
    r(GROUND_Y - pose.lift - bodyLift),
  ] as const) as unknown as DogFeet;
  return { feet, down: poses.map((pose) => pose.down), hipY: r(HIP_Y - bodyLift) };
}

const PAW_DOWN = 'var(--role-state-stage)';
const INK = 'var(--motion-stage-label)';
const DIM = 'var(--motion-stage-label-secondary)';

function scenePose(t: number): DogPose {
  const frame = gaitSupportFrame(t);
  const pose = dogPose(frame.gait, frame.phase);
  return { hipY: pose.hipY, feet: pose.feet, footFill: pose.down.map((down) => (down ? PAW_DOWN : undefined)) };
}

function GaitSupportStage() {
  const isGait = (id: GaitId) => (t: number) => (gaitSupportFrame(t).gait === id ? 1 : 0);
  return (
    <StageSvg viewBox="0 0 340 272">
      {/* The four gaits in order, the current one in full ink. */}
      {GAIT_ORDER.map((id, i) => (
        <AnimatedElement
          as="text"
          key={id}
          data-scene-stage-label="gait-name"
          x={GAIT_NAME_X[i]}
          y={20}
          fontSize={14}
          bindings={{
            fill: (t) => (gaitSupportFrame(t).gait === id ? INK : DIM),
          }}
        >
          {GAIT_WORDS[id]}
        </AnimatedElement>
      ))}
      <g data-scene-structure="current-gait">
        <AnimatedPath stroke={INK} strokeWidth={2} fill="none" style={BAR_TYPE_SCALE} bindings={{
          d: (t) => {
            const i = GAIT_ORDER.indexOf(gaitSupportFrame(t).gait);
            return `M${GAIT_NAME_X[i]} 27h${GAIT_NAME_WIDTH[i]}`;
          },
        }} />
      </g>

      <text x={8} y={64} fontSize={14} fill={DIM}>schematic,</text>
      <text x={8} y={86} fontSize={14} fill={DIM}>not measured</text>

      <g data-scene-structure="ground" stroke="var(--motion-stage-axes)" strokeLinecap="round">
        <line x1={96} x2={300} y1={GROUND_Y} y2={GROUND_Y} strokeWidth={1.5} />
        {Array.from({ length: HATCH_COUNT }, (_, k) => {
          // Short ground marks drift back under the dog so it reads as walking forward.
          const x = (t: number) => r(100 + ((k * HATCH_SPACING - (gaitSupportFrame(t).travelled * STRIDE_PX) % HATCH_SPACING
            + HATCH_COUNT * HATCH_SPACING) % (HATCH_COUNT * HATCH_SPACING)));
          return (
            <AnimatedElement
              as="line"
              key={k}
              y1={GROUND_Y + 4}
              y2={GROUND_Y + 8}
              strokeWidth={1}
              bindings={{ x1: x, x2: (t) => r(x(t) - 6) }}
            />
          );
        })}
      </g>
      <g data-scene-structure="robot-dog">
        <AnimatedRobotDog
          rear={REAR_HIP}
          front={FRONT_HIP}
          baseHipY={HIP_Y}
          segment={SEGMENT}
          ink={INK}
          pose={scenePose}
          testId="gait-dog"
        />
      </g>

      {/* The hop's note: the stretch of the stride with every paw in the air. */}
      <AnimatedGroup data-figure-annotation="" bindings={{ opacity: isGait('pronk') }}>
        <text
          data-scene-stage-label="annotation"
          x={STRIP_RIGHT}
          y={139}
          textAnchor="end"
          fontSize={14}
          fontWeight={600}
          fill="var(--role-highlight-stage)"
        >
          All four feet in the air
        </text>
        <g data-scene-structure="annotation-bracket" stroke="var(--role-highlight-stage)" strokeWidth={2} fill="none">
          <polyline
            points={`${stripX(GAITS.pronk.dutyFactor)},${ROW_TOP - 2} ${stripX(GAITS.pronk.dutyFactor)},${ROW_TOP - 7} ${STRIP_RIGHT},${ROW_TOP - 7} ${STRIP_RIGHT},${ROW_TOP - 2}`}
          />
        </g>
      </AnimatedGroup>

      {LEGS.map((leg, row) => (
        <g key={leg.id}>
          <text data-scene-stage-label="paw-row" x={8} y={rowY(row) + 12} fontSize={14} fill={INK}>
            {PAW_WORDS[leg.id]}
          </text>
          <rect
            data-scene-structure="paw-track"
            x={STRIP_LEFT}
            y={rowY(row)}
            width={STRIP_W}
            height={ROW_H}
            fill="none"
            stroke="var(--motion-stage-axes)"
            strokeWidth={1}
          />
        </g>
      ))}
      {/* One footfall strip per gait; only the gait the dog is doing shows. */}
      {GAIT_ORDER.map((id) => (
        <AnimatedGroup key={id} data-gait-strip={id} bindings={{ opacity: isGait(id) }}>
          {LEGS.flatMap((leg, row) => stanceSpans(GAITS[id], leg.id).map(([from, to], k) => (
            <rect
              key={`${leg.id}-${k}`}
              data-scene-mark={`${id}-phase-${row * 2 + k}`}
              x={stripX(from)}
              y={rowY(row)}
              width={r(stripX(to) - stripX(from))}
              height={ROW_H}
              fill={PAW_DOWN}
            />
          )))}
        </AnimatedGroup>
      ))}
      <g data-scene-structure="playhead">
        <AnimatedElement
          as="line"
          y1={ROW_TOP - 3}
          y2={AXIS_Y - 4}
          stroke={INK}
          strokeWidth={1.5}
          bindings={{ x1: (t) => stripX(gaitSupportFrame(t).phase), x2: (t) => stripX(gaitSupportFrame(t).phase) }}
        />
      </g>

      <g data-scene-structure="stride-axis" stroke="var(--motion-stage-axes)">
        <line x1={STRIP_LEFT} x2={STRIP_RIGHT} y1={AXIS_Y} y2={AXIS_Y} />
      </g>
      <text data-scene-stage-label="stride-start" x={STRIP_LEFT} y={AXIS_Y + 18} fontSize={14} fill={DIM}>start</text>
      <text data-scene-stage-label="stride" x={(STRIP_LEFT + STRIP_RIGHT) / 2} y={AXIS_Y + 18} textAnchor="middle" fontSize={14} fill={DIM}>one stride</text>
      <text data-scene-stage-label="stride-end" x={STRIP_RIGHT} y={AXIS_Y + 18} textAnchor="end" fontSize={14} fill={DIM}>end</text>
    </StageSvg>
  );
}

const pct = (phase: number) => `${Math.round(phase * 100)}%`;
const pawList = (legs: LegId[]) => (legs.length ? legs.map((leg) => PAW_WORDS[leg]).join(', ') : 'none');

const GAIT_METHOD_NOTE = `Each gait is an authored timing pattern, not measured robot footfalls. A paw stays on the ground for a fixed share of the stride, its duty factor: walk ${GAITS.walk.dutyFactor}, trot ${GAITS.trot.dutyFactor}, bound ${GAITS.bound.dutyFactor} and pronk ${GAITS.pronk.dutyFactor}. Each paw lands at its own point in the stride, its phase offset: the walk lands back left, front left, back right, front right a quarter stride apart; the trot pairs front left with back right and front right with back left half a stride apart; the bound lands the front pair, then the back pair half a stride later; the pronk lands all four together.`;

export function GaitSupport({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={GAIT_SUPPORT_SCENE}
      stage={<GaitSupportStage />}
      className={className}
      legend={<>
        <LegendItem series="gait-support" swatch={<span aria-hidden className="inline-block h-2.5 w-4" style={{ backgroundColor: 'var(--role-state-graphic)' }} />}>paw on the ground</LegendItem>
        <LegendItem series="gait-flight" swatch={<span aria-hidden className="inline-block h-2.5 w-4 border border-text-dim" />}>paw in the air</LegendItem>
      </>}
      readout={({ beatIndex }) => supportWords(GAIT_ORDER[beatIndex] ?? DEFAULT_GAIT)}
      statusLine="Schematic, not measured robot footfalls"
      method={<>
        <p data-testid="gait-method">{GAIT_METHOD_NOTE}</p>
        <p>
          In robotics papers the paws are written LF, RF, LH and RH: left front, right front, left hind and right
          hind. The fewest paws down at any moment of the stride: walk {minStanceCount(GAITS.walk)}, trot{' '}
          {minStanceCount(GAITS.trot)}, bound {minStanceCount(GAITS.bound)}, pronk {minStanceCount(GAITS.pronk)}.
        </p>
        <p>Paws on the ground at four moments of the stride:</p>
        <ul>
          {GAIT_ORDER.map((id) => (
            <li key={id}>
              {GAIT_WORDS[id]}: {GAIT_SUPPORT_SAMPLES.map((phase) => `${pct(phase)} ${pawList(stanceLegs(GAITS[id], phase))}`).join('; ')}.
            </li>
          ))}
        </ul>
        <p>The four steps, in order:</p>
        <ol>
          {GAIT_SUPPORT_SCENE.beats.map((beat) => <li key={beat.id}>{beat.caption}</li>)}
        </ol>
      </>}
      textAlternative={`${GAIT_SUPPORT_SCENE.title}. ${GAIT_SUPPORT_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')} ${GAIT_METHOD_NOTE}`}
    />
  );
}

export default GaitSupport;
