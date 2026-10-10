'use client';

import { AnimatedElement } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';

/**
 * Tactile slip: a two-finger robot hand holds a glass while a camera looks
 * on from the side. The fingers hide the contact points from the camera,
 * so when the glass slips only the fingertip sensors notice; they trigger
 * a firmer grip. The poster still is the caught slip: the glass sits below
 * its dashed starting outline, the fingertip sensors are lit and the note
 * points at the hidden contact. Status: schematic.
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

export function tactileSlipFrame(t: number) {
  return {
    slip: progress(t, 1),
    correction: smooth(progress(t, 2)),
    recap: smooth(progress(t, 3)),
  };
}

/** Round rendered geometry so server HTML and hydrated DOM agree. */
const r = (v: number) => Number(v.toFixed(2));

const GLASS_LEFT = 152;
const GLASS_WIDTH = 36;
const GLASS_HEIGHT = 72;
const GLASS_TOP = 70;
/** How far the glass slides, and how much of that the firmer grip wins back. */
const SLIP_PX = 22;
const RECOVER_PX = 10;
const CONTACT_Y = 112;
/** The finger is a thin line drawing set just outside the glass wall. */
const FINGER_STROKE = 1.75;
const FINGER_GAP = 2;
const SQUEEZE_PX = 1.5;

const glassTop = (t: number) => {
  const frame = tactileSlipFrame(t);
  return r(GLASS_TOP + frame.slip * SLIP_PX - frame.correction * RECOVER_PX);
};

/** Sensors idle faint, flicker while the glass slides, then light up. */
const touchOpacity = (t: number) => {
  const { slip, correction } = tactileSlipFrame(t);
  if (correction > 0) return r(0.6 + 0.4 * correction);
  if (slip > 0) return r(0.3 + 0.5 * Math.abs(Math.sin(slip * Math.PI * 3)));
  return 0.3;
};

const squeeze = (t: number) => r(tactileSlipFrame(t).correction * SQUEEZE_PX);

function Finger({ side }: { side: 'left' | 'right' }) {
  const sign = side === 'left' ? 1 : -1;
  const x = side === 'left' ? GLASS_LEFT - FINGER_GAP : GLASS_LEFT + GLASS_WIDTH + FINGER_GAP;
  return (
    <AnimatedElement
      as="path"
      data-scene-structure={`${side}-finger`}
      fill="none"
      stroke="var(--role-action-stage)"
      strokeWidth={FINGER_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      bindings={{
        d: (t) => {
          const fx = r(x + sign * squeeze(t));
          return `M${r(x - sign * 8)} 50 L${fx} 64 L${fx} 128`;
        },
      }}
    />
  );
}

function TactileSlipStage() {
  return (
    <StageSvg viewBox="0 0 340 240">
      {/* The wrist and palm the fingers hang from. */}
      <g data-scene-structure="hand" fill="none" stroke="var(--role-action-stage)" strokeLinejoin="round">
        <rect x={160} y={0} width={20} height={30} strokeWidth={1.5} />
        <rect x={134} y={30} width={72} height={20} rx={1} strokeWidth={1.5} />
      </g>
      <Finger side="left" />
      <Finger side="right" />

      {/* Where the glass started, shown once the slip has happened. */}
      <AnimatedElement
        as="rect"
        data-scene-structure="glass-start"
        x={GLASS_LEFT}
        y={GLASS_TOP}
        width={GLASS_WIDTH}
        height={GLASS_HEIGHT}
        rx={1.5}
        fill="none"
        stroke="var(--motion-stage-label-secondary)"
        strokeDasharray="4 3"
        bindings={{ opacity: (t) => r(tactileSlipFrame(t).slip * 0.8) }}
      />
      <AnimatedElement
        as="g"
        data-scene-structure="glass"
        bindings={{ transform: (t) => `translate(0 ${r(glassTop(t) - GLASS_TOP)})` }}
      >
        <rect
          data-scene-mark="held-object"
          x={GLASS_LEFT}
          y={GLASS_TOP}
          width={GLASS_WIDTH}
          height={GLASS_HEIGHT}
          rx={1.5}
          fill="var(--role-state-stage)"
          fillOpacity={0.12}
          stroke="var(--role-state-stage)"
          strokeWidth={1.5}
        />
        <line
          x1={GLASS_LEFT + 3}
          x2={GLASS_LEFT + GLASS_WIDTH - 3}
          y1={GLASS_TOP + 26}
          y2={GLASS_TOP + 26}
          stroke="var(--role-state-stage)"
          strokeWidth={1}
        />
      </AnimatedElement>
      <AnimatedElement
        as="g"
        data-scene-structure="slip-arrow"
        fill="none"
        stroke="var(--motion-stage-label-secondary)"
        strokeWidth={1.5}
        strokeLinecap="round"
        bindings={{ opacity: (t) => r(tactileSlipFrame(t).slip) }}
      >
        <path d="M214 74 V96 M209 90 L214 96 L219 90" />
      </AnimatedElement>
      <AnimatedElement
        as="text"
        x={224}
        y={90}
        fontSize={14}
        fill="var(--motion-stage-label-secondary)"
        bindings={{ opacity: (t) => r(tactileSlipFrame(t).slip) }}
      >
        slipped
      </AnimatedElement>

      {/* The camera, whose line of sight the left finger blocks. */}
      <g data-scene-structure="camera" fill="none" stroke="var(--motion-stage-label)" strokeWidth={1.5} strokeLinejoin="round">
        <rect x={22} y={100} width={34} height={24} rx={1} />
        <path d="M56 106 L68 101 V123 L56 118" />
        <rect x={28} y={95} width={10} height={5} />
      </g>
      <line
        data-scene-structure="camera-sight"
        x1={72}
        y1={CONTACT_Y}
        x2={GLASS_LEFT - FINGER_GAP - 3}
        y2={CONTACT_Y}
        stroke="var(--motion-stage-label-secondary)"
        strokeDasharray="3 4"
      />
      <text x={22} y={146} fontSize={14} fill="var(--motion-stage-label)">
        camera
      </text>

      <AnimatedElement
        as="circle"
        data-scene-mark="left-touch"
        cx={GLASS_LEFT}
        cy={CONTACT_Y}
        r={3.5}
        fill="var(--role-measurement-stage)"
        bindings={{ opacity: touchOpacity }}
      />
      <AnimatedElement
        as="circle"
        data-scene-mark="right-touch"
        cx={GLASS_LEFT + GLASS_WIDTH}
        cy={CONTACT_Y}
        r={3.5}
        fill="var(--role-measurement-stage)"
        bindings={{ opacity: touchOpacity }}
      />

      {/* The one highlight note, pointing at the hidden contact. */}
      <AnimatedElement
        as="g"
        data-figure-annotation=""
        bindings={{ opacity: (t) => r(tactileSlipFrame(t).correction) }}
      >
        <line
          x1={300}
          y1={170}
          x2={GLASS_LEFT + GLASS_WIDTH + 6}
          y2={CONTACT_Y + 4}
          stroke="var(--role-highlight-stage)"
          strokeWidth={1}
        />
        <text x={330} y={188} textAnchor="end" fontSize={14} fill="var(--role-highlight-stage)">
          <tspan x={330} dy={0}>The camera&rsquo;s view is blocked here,</tspan>
          <tspan x={330} dy={17.5}>but the fingertips feel</tspan>
          <tspan x={330} dy={17.5}>the glass sliding</tspan>
        </text>
      </AnimatedElement>
    </StageSvg>
  );
}

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
          style={{ backgroundColor: 'var(--role-action-graphic)' }} />}>robot fingers</LegendItem>
        <LegendItem series="contact-signal" swatch={<span aria-hidden className="inline-block size-1.5 rounded-full"
          style={{ backgroundColor: 'var(--role-measurement-graphic)' }} />}>fingertip sensor</LegendItem>
      </>}
      statusLine="schematic"
      method={<>
        <p>{TACTILE_SLIP_METHOD_NOTE}</p>
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
