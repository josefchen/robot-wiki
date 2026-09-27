'use client';

import { AnimatedElement } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import { DEFAULT_GAIT, GAITS, GAIT_ORDER, minStanceCount, stanceLegs } from '@/lib/gait';

export const GAIT_SUPPORT_SCENE: SceneDefinition = {
  id: 'gait-support',
  title: 'Foot support over an authored stride cycle',
  beats: [
    { id: 'walk', caption: 'The authored walk phases footfalls so at least three feet support the body throughout the cycle.' },
    { id: 'trot', caption: 'The authored trot moves support to diagonal pairs, leaving two feet down at each sampled phase.' },
    { id: 'bound', caption: 'The authored bound alternates front and hind pairs with a flight interval between them.' },
    { id: 'pronk', caption: 'The authored pronk puts all four feet down together and then leaves a longer flight interval.' },
  ],
};

const SPANS = beatSpans(GAIT_SUPPORT_SCENE.beats);
const progress = (t: number, index: number) =>
  smooth(clamp01((t - SPANS[index].start) / SPANS[index].duration));
// Include both bound suspension windows, as well as either side of the
// diagonal-pair switch. Even eighths miss the short bound flight entirely.
export const GAIT_SUPPORT_SAMPLES = [0.10, 0.48, 0.60, 0.98] as const;

/** Four sampled stills from the lab's chosen offsets and duty factors. */
export function gaitSupportFrame(t: number) {
  return {
    visibleGaits: GAIT_ORDER.filter((_, index) => progress(t, index) > 0),
    minimumSupport: Object.fromEntries(GAIT_ORDER.map((id) => [id, minStanceCount(GAITS[id])])) as Record<(typeof GAIT_ORDER)[number], number>,
    stanceAtQuarter: Object.fromEntries(GAIT_ORDER.map((id) => [id, stanceLegs(GAITS[id], 0.25)])) as Record<(typeof GAIT_ORDER)[number], ReturnType<typeof stanceLegs>>,
  };
}

function GaitSupportStage() {
  return (
    <StageSvg viewBox="0 0 340 240">
      <defs>
        <pattern id="gait-flight-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line data-scene-structure="hatch" x1="0" y1="0" x2="0" y2="6"
            stroke="var(--role-constraint-stage)" strokeWidth={2} />
        </pattern>
      </defs>
      <text x={26} y={25} fontSize={13} fill="var(--motion-stage-label)">feet on ground · sampled cycle</text>
      {GAIT_ORDER.map((id, row) => (
        <g key={id}>
          <AnimatedElement as="text" x={27} y={59 + row * 40}
            fontSize={13} fill="var(--motion-stage-label)"
            bindings={{ opacity: (t) => progress(t, row) }}>
            {GAITS[id].name}
          </AnimatedElement>
          {GAIT_SUPPORT_SAMPLES.map((phase, column) => {
            const stance = stanceLegs(GAITS[id], phase);
            const count = stance.length;
            const baseline = 64 + row * 40;
            return (
              <g key={phase}>
                <AnimatedElement as="rect"
                  data-scene-mark={`${id}-phase-${column}`}
                  x={115 + column * 51} y={baseline - Math.max(count, 1) * 5}
                  width={27} height={Math.max(count, 1) * 5}
                  fill={count ? 'var(--role-state-stage)' : 'url(#gait-flight-hatch)'}
                  stroke={count ? 'var(--role-state-stage)' : 'var(--role-constraint-stage)'}
                  strokeWidth={1}
                  bindings={{ opacity: (t) => progress(t, row) }}
                />
                {count === 2 && (
                  <AnimatedElement as="text" x={128.5 + column * 51} y={baseline + 16}
                    textAnchor="middle" fontSize={12} fill="var(--motion-stage-label-secondary)"
                    bindings={{ opacity: (t) => progress(t, row) }}>
                    {stance.map((leg) => leg.toUpperCase()).join('+')}
                  </AnimatedElement>
                )}
              </g>
            );
          })}
        </g>
      ))}
      <g data-scene-structure="phase-guides">
        <line x1={106} y1={191} x2={300} y2={191}
          stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
      </g>
      {['10%', '48%', '60%', '98%'].map((label, column) => (
        <text key={label} x={128 + column * 51} y={209} textAnchor="middle"
          fontSize={12} fill="var(--motion-stage-label-secondary)">{label}</text>
      ))}
      <text x={26} y={230} fontSize={13} fill="var(--motion-stage-label-secondary)">
        illustrative phases · no measured footfall data
      </text>
    </StageSvg>
  );
}

export function GaitSupport({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={GAIT_SUPPORT_SCENE}
      stage={<GaitSupportStage />}
      className={className}
      legend={<>
        <LegendItem series="gait-support" swatch={<span aria-hidden className="inline-block h-2.5 w-3" style={{ backgroundColor: 'var(--role-state-graphic)' }} />}>stance count, pair codes identify feet</LegendItem>
        <LegendItem series="gait-flight" swatch={<span aria-hidden className="inline-block h-2.5 w-3 border border-dashed" style={{ borderColor: 'var(--role-constraint-graphic)' }} />}>flight, no feet down</LegendItem>
      </>}
      readout={({ beatIndex }) => {
        const id = GAIT_ORDER[beatIndex] ?? DEFAULT_GAIT;
        return <><span className="text-text-dim">new pattern</span> {GAITS[id].name}{' '}
          <span className="text-text-dim">minimum support</span> {minStanceCount(GAITS[id])} feet</>;
      }}
      statusLine="Schematic, authored gait duty factors and phase offsets from the lab below. Bar height counts stance feet at four sample phases; LF/RF are front feet and LH/RH are hind feet. These are not measured robot footfalls."
      textAlternative={`${GAIT_SUPPORT_SCENE.title}. ${GAIT_SUPPORT_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')} The full gait lab below provides direct phase and pattern controls.`}
    />
  );
}

export default GaitSupport;
