'use client';

import { useRef, type ReactNode } from 'react';
import { AnimatedElement, AnimatedGroup } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, locate, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import { Dots, Line, Solid, Wire } from '@/components/iso/react/draw';
import {
  DIAL_MM_PER_TURN,
  EXTRA_LOAD_N,
  FINGER_PARTS,
  GLASS_MOUTH,
  GLASS_OUTLINE,
  GLASS_PATHS,
  GLASS_SEAMS,
  GRIP_BEZEL,
  GRIP_DIAL_MATRIX,
  GRIP_DIAL_R,
  GRIP_FACE,
  GRIP_HOLD_N,
  GRIP_REGRIP_N,
  MU,
  PARTS,
  SIGHT,
  SLIP_DIAL_MATRIX,
  SLIP_DIAL_R,
  SLIP_FACE,
  SLIP_MM,
  TAXELS,
  TAXEL_FRAME,
  TAXEL_MATRIX,
  VIEW_BOX,
  catchGrip,
  fingerShift,
  glassShift,
  gripDialDegrees,
  holdingN,
  needlePath,
  padAt,
  plungerAt,
  slipDialDegrees,
  squeezeFor,
  threadsAt,
  weightN,
  type Part,
  type Slot,
} from '@/components/iso/figures/slip-test-stand';
import type { SolidPaths } from '@/components/iso/iso-kit';

/**
 * Tactile slip: a two-finger robot hand holds a glass while a camera looks
 * on from the side. The fingers hide the contact points from the camera,
 * so when the glass slips only the fingertip sensors notice; they trigger
 * a firmer grip. The poster still is the caught slip: the glass sits 3 mm
 * lower on the stand's dial, the fingertip pads are lit and the grip dial
 * reads the firmer squeeze. Status: schematic.
 *
 * The stage is a slip test stand (the isometric figure kit,
 * components/iso/figures/slip-test-stand.ts): a parallel gripper hangs from
 * a column and holds a glass tumbler between two fingertip pads; a camera
 * on a post looks along the line the fingers close on, so it sees only the
 * back of the near finger; a dial indicator rests its plunger on the rim
 * and reads the slide; each pad carries a grid of touch cells. The glass is
 * the held-object mark and the two grids are the touch marks, in their
 * reviewed roles; the part to watch in each beat is the one lit part.
 */
export const TACTILE_SLIP_SCENE: SceneDefinition = {
  id: 'tactile-slip',
  title: 'Touch catches a slipping glass',
  kicker: 'Tactile sensing',
  headline: 'Fingertips can feel a slip the camera can’t see',
  beats: [
    {
      id: 'grasp',
      caption: 'A robot hand holds a glass; from where the camera sits, the fingers hide where they touch the object.',
    },
    {
      id: 'slip',
      duration: 'long',
      linear: true,
      caption: 'The glass slips between the fingers, and the camera cannot see it happen.',
    },
    {
      id: 'touch',
      caption: 'The fingertip sensors feel the glass sliding and tell the hand to squeeze harder.',
    },
    {
      id: 'recap',
      caption:
        'When fingers hide an object from the camera, touch sensors can still notice it slipping and trigger a firmer grip.',
    },
  ],
};

/** The method note: what the scene is and what it does not claim. */
export const TACTILE_SLIP_METHOD_NOTE =
  'A schematic of contact feedback, drawn to show where the information is: not a sensor measurement, not a demonstrated recovery rate and not a dexterity claim for any hand. Source-scoped hardware claims, such as fingertip thresholds, are in the hand cards above and their table under "How this was made".';

const SPANS = beatSpans(TACTILE_SLIP_SCENE.beats);
const progress = (t: number, index: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);

/** The load on the grip once the slip starts: the glass's weight plus the authored extra load. */
const LOAD_N = weightN() + EXTRA_LOAD_N;

/**
 * When the rising grip catches the glass: the first moment in the third
 * beat at which two pads hold the load by friction (2 μ N ≥ load). Until
 * then the glass slides; it stops there, SLIP_MM lower.
 */
export const CATCH_T = (() => {
  const need = (catchGrip(LOAD_N) - GRIP_HOLD_N) / (GRIP_REGRIP_N - GRIP_HOLD_N);
  let lo = 0;
  let hi = 1;
  for (let step = 0; step < 40; step += 1) {
    const mid = (lo + hi) / 2;
    if (smooth(mid) < need) lo = mid;
    else hi = mid;
  }
  return SPANS[2].start + hi * SPANS[2].duration;
})();

const r2 = (value: number) => Number(value.toFixed(2));

export function tactileSlipFrame(t: number) {
  const correction = smooth(progress(t, 2));
  const grip = GRIP_HOLD_N + (GRIP_REGRIP_N - GRIP_HOLD_N) * correction;
  const start = SPANS[1].start;
  const sliding = t > start && t < CATCH_T;
  const slid = clamp01((t - start) / (CATCH_T - start));
  return {
    slip: progress(t, 1),
    correction,
    recap: smooth(progress(t, 3)),
    /** Newtons each pad presses with. */
    grip,
    /** Whether the glass is sliding at t, and how far it has gone (mm). */
    sliding,
    slipMm: SLIP_MM * slid,
    /** Whether the grip holds the load at t (it holds before the slip starts too). */
    holds: t <= start || holdingN(grip) >= LOAD_N,
  };
}

/** The touch cells: faint at rest, flickering while the glass slides, then lit as the hand squeezes. */
const touchOpacity = (t: number) => {
  const frame = tactileSlipFrame(t);
  if (t >= CATCH_T) return r2(0.6 + 0.4 * frame.correction);
  if (frame.sliding) {
    const u = (t - SPANS[1].start) / (CATCH_T - SPANS[1].start);
    return r2(0.45 + 0.3 * Math.abs(Math.sin(u * Math.PI * 3.5)));
  }
  return 0.3;
};

/** The one lit part, beat by beat: the camera's line of sight, the slip dial's needle, then the fingertip pads. */
const litIn = (part: 'sight' | 'needle' | 'pads', t: number) => {
  const beat = locate(SPANS, t).index;
  const which = beat === 0 ? 'sight' : beat === 1 ? 'needle' : 'pads';
  return which === part ? 'lit' : part === 'sight' ? 'lo' : 'hi';
};

const squeezeAt = (t: number) => squeezeFor(tactileSlipFrame(t).grip);

/** A solid whose shape changes with scene time (a pad pressed in), drawn like the kit's Solid. */
function LiveSolid({ build, edgeTone }: { build: (t: number) => SolidPaths; edgeTone: (t: number) => string }) {
  // The seven paths read one build per moment, so the shape is computed once a frame.
  const cache = useRef<{ t: number; paths: SolidPaths | null }>({ t: Number.NaN, paths: null });
  const at = (t: number): SolidPaths => {
    const memo = cache.current;
    if (t !== memo.t || !memo.paths) {
      memo.paths = build(t);
      memo.t = t;
    }
    return memo.paths;
  };
  return (
    <g className="iso-solid">
      <AnimatedElement as="path" className="iso-fill" bindings={{ d: (t) => at(t).fill }} />
      {[0, 1, 2, 3].map((shade) => (
        <AnimatedElement key={shade} as="path" className="iso-shade" data-shade={shade} bindings={{ d: (t) => at(t).shades[shade] || 'M0 0' }} />
      ))}
      <AnimatedElement as="path" className="iso-top" bindings={{ d: (t) => at(t).top }} />
      <AnimatedElement as="path" className="iso-line iso-crease" data-tone="faint" bindings={{ d: (t) => at(t).crease || 'M0 0' }} />
      <AnimatedElement as="path" className="iso-line iso-bevel" data-tone="faint" bindings={{ d: (t) => at(t).bevel || 'M0 0' }} />
      <AnimatedElement as="path" className="iso-line iso-edge" bindings={{ d: (t) => at(t).outline, 'data-tone': edgeTone }} />
    </g>
  );
}

function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }): ReactNode {
  if (part.kind === 'solid') {
    return <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined} />;
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.kind === 'wire') return <Wire from={part.from} to={part.to} via={part.via} tone={part.tone} />;
  if (part.fill === 'paper') return <path className="iso-fill" d={part.d} />;
  return (
    <g>
      <path className="iso-fill" d={part.d} />
      {part.fill === 'top' ? <path className="iso-top" d={part.d} /> : <path className="iso-shade" data-shade={part.fill} d={part.d} />}
    </g>
  );
}

/** A dial drawn in its face plane, its needle turned by `degrees`. */
function DialFace({ face, matrix, r, degrees, tone }: {
  face: { rim: string; minor: string; major: string; arc: string; hub: string };
  matrix: string;
  r: number;
  degrees: (t: number) => number;
  tone: (t: number) => string;
}) {
  return (
    <g transform={matrix}>
      <path className="iso-fill" d={face.rim} />
      <path className="iso-top" d={face.rim} />
      <Line d={face.rim} tone="lo" />
      <Line d={face.arc} tone="faint" />
      <Line d={face.minor} tone="lo" />
      <Line d={face.major} tone="mid" />
      <AnimatedGroup bindings={{ transform: (t) => `rotate(${r2(degrees(t))})` }}>
        {/* The needle's tip stops on the bare face by design. */}
        <AnimatedElement as="path" className="iso-line" data-free="" d={needlePath(r)} bindings={{ 'data-tone': tone }} />
      </AnimatedGroup>
      <path className="iso-fill" d={face.hub} />
      <Line d={face.hub} tone="lo" />
    </g>
  );
}

function SlotView({ slot }: { slot: Slot }): ReactNode {
  switch (slot) {
    case 'finger-far':
    case 'finger-near': {
      const side = slot === 'finger-far' ? -1 : 1;
      return (
        <AnimatedGroup data-scene-part={`${slot === 'finger-far' ? 'far' : 'near'}-finger`} bindings={{ transform: (t) => fingerShift(side, squeezeAt(t)) }}>
          {(side < 0 ? FINGER_PARTS.far : FINGER_PARTS.near).map((part, index) => (part.kind === 'slot' ? null : <PartView key={index} part={part} />))}
          {side > 0 ? (
            // The camera's line of sight lands on the back of the near finger, which hides the contact.
            <g data-scene-part="camera-sight">
              <AnimatedElement as="path" className="iso-line" d={`M${SIGHT.from[0].toFixed(1)} ${SIGHT.from[1].toFixed(1)}L${SIGHT.to[0].toFixed(1)} ${SIGHT.to[1].toFixed(1)}`} bindings={{ 'data-tone': (t) => litIn('sight', t) }} />
              <circle className="iso-wire-end" cx={SIGHT.to[0].toFixed(1)} cy={SIGHT.to[1].toFixed(1)} r={1.2} />
            </g>
          ) : null}
        </AnimatedGroup>
      );
    }
    case 'pad-far':
    case 'pad-near': {
      const side = slot === 'pad-far' ? -1 : 1;
      return (
        <g data-scene-part={`${side < 0 ? 'far' : 'near'}-pad`}>
          <LiveSolid build={(t) => padAt(side, squeezeAt(t))} edgeTone={(t) => litIn('pads', t)} />
        </g>
      );
    }
    case 'taxels-far':
    case 'taxels-near': {
      const far = slot === 'taxels-far';
      return (
        <g transform={far ? TAXEL_MATRIX.far : TAXEL_MATRIX.near}>
          <Line d={TAXEL_FRAME} tone="faint" />
          <AnimatedElement
            as="path"
            data-scene-mark={far ? 'left-touch' : 'right-touch'}
            data-legend-series="contact-signal"
            d={TAXELS}
            fill="var(--role-measurement-stage)"
            bindings={{ opacity: touchOpacity }}
          />
        </g>
      );
    }
    case 'glass':
      return (
        <AnimatedGroup data-scene-part="glass" bindings={{ transform: (t) => glassShift(tactileSlipFrame(t).slipMm) }}>
          <Solid paths={GLASS_PATHS} tone="hi" inner={<Line d={GLASS_SEAMS.foot + GLASS_SEAMS.glint} tone="faint" />} />
          <path className="iso-fill" d={GLASS_MOUTH} />
          <path className="iso-shade" data-shade={1} d={GLASS_MOUTH} />
          <Line d={GLASS_MOUTH} tone="lo" />
          <path
            data-scene-mark="held-object"
            data-legend-series="held-object"
            d={GLASS_OUTLINE}
            fill="none"
            stroke="var(--role-state-stage)"
            strokeWidth={0.9}
            strokeLinejoin="round"
          />
        </AnimatedGroup>
      );
    case 'plunger':
      return (
        <g data-scene-part="plunger">
          <LiveSolid build={(t) => plungerAt(tactileSlipFrame(t).slipMm).rod} edgeTone={() => 'mid'} />
          <LiveSolid build={(t) => plungerAt(tactileSlipFrame(t).slipMm).foot} edgeTone={() => 'lo'} />
        </g>
      );
    case 'slip-dial':
      return (
        <g data-scene-part="slip-dial">
          <DialFace face={SLIP_FACE} matrix={SLIP_DIAL_MATRIX} r={SLIP_DIAL_R} degrees={(t) => slipDialDegrees(tactileSlipFrame(t).slipMm)} tone={(t) => litIn('needle', t)} />
        </g>
      );
    case 'grip-dial':
      return (
        <g data-scene-part="grip-dial">
          <Solid paths={GRIP_BEZEL} tone="mid" />
          <AnimatedElement as="path" className="iso-line" data-tone="lo" bindings={{ d: (t) => threadsAt(squeezeAt(t) * 2) }} />
          <DialFace face={GRIP_FACE} matrix={GRIP_DIAL_MATRIX} r={GRIP_DIAL_R} degrees={(t) => gripDialDegrees(tactileSlipFrame(t).grip)} tone={() => 'hi'} />
        </g>
      );
    default:
      return null;
  }
}

function TactileSlipStage() {
  return (
    <div className="iso" data-anatomy-drawing="">
      <StageSvg viewBox={VIEW_BOX} className="iso-svg">
        {PARTS.map((part, index) =>
          part.kind === 'slot' ? <SlotView key={part.slot} slot={part.slot} /> : <PartView key={index} part={part} />,
        )}
      </StageSvg>
    </div>
  );
}

const READOUTS = [
  `Holding · each pad presses ${GRIP_HOLD_N} newtons · the camera sees the finger`,
  'Slipping · the camera’s view does not change',
  `Slip ${SLIP_MM} mm · felt at the fingertips · grip raised from ${GRIP_HOLD_N} to ${GRIP_REGRIP_N} newtons`,
  `Slip ${SLIP_MM} mm · felt at the fingertips · grip raised from ${GRIP_HOLD_N} to ${GRIP_REGRIP_N} newtons`,
];

export function TactileSlip({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={TACTILE_SLIP_SCENE}
      stage={<TactileSlipStage />}
      className={className}
      legend={<>
        <LegendItem series="held-object" swatch={<span aria-hidden className="inline-block h-2.5 w-3 border"
          style={{ borderColor: 'var(--role-state-graphic)' }} />}>glass</LegendItem>
        <LegendItem series="contact-action" swatch={<span aria-hidden className="inline-block h-3 w-0.5"
          style={{ backgroundColor: 'var(--role-action-graphic)' }} />}>robot fingers, with the camera aimed at one</LegendItem>
        <LegendItem series="contact-signal" swatch={<span aria-hidden className="inline-block size-1.5 rounded-full"
          style={{ backgroundColor: 'var(--role-measurement-graphic)' }} />}>fingertip sensor</LegendItem>
      </>}
      readout={({ beatIndex }) => READOUTS[beatIndex] ?? READOUTS[3]}
      statusLine="schematic"
      method={<>
        <p>{TACTILE_SLIP_METHOD_NOTE}</p>
        <p>
          The drawing is a slip test stand. A parallel gripper hangs from a column and holds a glass between two
          rubber fingertip pads, each with a grid of touch cells on its face. A camera on a post looks along the
          line the fingers close on, so all it sees is the back of the near finger. A dial indicator rests its
          plunger on the rim and reads how far the glass slides, one turn for {DIAL_MM_PER_TURN} mm; the dial on the
          gripper reads how hard each pad presses.
        </p>
        <p>
          The numbers are authored for the schematic. Two pads hold a glass by friction as long as twice the
          friction coefficient ({MU}) times the grip is at least the glass&apos;s load. A {weightN().toFixed(2)} newton
          glass held at {GRIP_HOLD_N} newtons a pad gets {holdingN(GRIP_HOLD_N).toFixed(1)} newtons of friction, just
          enough. An extra {EXTRA_LOAD_N} newtons, as if the glass were knocked or topped up, is more than the grip can
          hold, so the glass slides. The grip rises to {GRIP_REGRIP_N} newtons, and the glass stops where the friction
          passes the load, at {catchGrip(LOAD_N).toFixed(2)} newtons a pad, {SLIP_MM} mm lower.
        </p>
        <p>The four steps, in order:</p>
        <ol>
          {TACTILE_SLIP_SCENE.beats.map((beat) => <li key={beat.id}>{beat.caption}</li>)}
        </ol>
      </>}
      textAlternative={`${TACTILE_SLIP_SCENE.title}. ${TACTILE_SLIP_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')} ${TACTILE_SLIP_METHOD_NOTE}`}
    />
  );
}

export default TactileSlip;
