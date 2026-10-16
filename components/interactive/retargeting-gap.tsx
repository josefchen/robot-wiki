'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { INSTRUMENT_SLIDER_CLASS, InstrumentFigure, SliderRow } from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { LiveSolid, writeSolid } from '@/components/iso/live-solid';
import {
  FLOOR,
  GAUGE_AHEAD,
  HEIGHT,
  HIPS,
  PARTS,
  PHONE_FIT,
  WIDTH,
  gaugeAt,
  gaugeOf,
  jointsOf,
  mannequinLeg,
  robotLeg,
  unitsPerCm,
  type Group,
  type LiveId,
  type Part,
  type RobotLeg,
} from '@/components/iso/figures/retarget-frame';

/**
 * RetargetingGap: why human motion copied onto a robot needs fixing
 * before a tracking policy learns from it, drawn as a retargeting frame.
 *
 * A mannequin's legs and a robot's legs hang from one hip beam at the
 * mannequin's hip height, in the same walking pose: coupling rods hold the
 * robot's thighs parallel to the mannequin's, and its knees take the same
 * angles. The mannequin stands on the floor plate. The robot's legs
 * telescope; shorter than the mannequin's, its feet float above the floor,
 * longer, they sink through the bay, an opening in the plate, and a height
 * gauge reads the gap under the robot's planted foot, the one lit part. Retargeting
 * studies report such artifacts (foot sliding, penetration) and find that
 * they reduce tracking-policy robustness; H2O filters out motions a
 * privileged imitator cannot track.
 *
 * The one control is the robot's leg length compared with the person's.
 * The legs telescope to it and the gauge follows on the motion curve;
 * reduced motion jumps. The bodies and the 90 centimetre hip height are
 * illustrative.
 */

export const RATIO_MIN = 70;
export const RATIO_MAX = 130;
export const DEFAULT_RATIO = 75;
/** Illustrative hip height of the person, in centimetres. */
export const PERSON_HIP_CM = 90;

/** How far the robot's lower foot sits from the floor, in cm: positive floats, negative sinks. */
export const footGapCm = (ratioPercent: number) => Math.round(PERSON_HIP_CM * (1 - ratioPercent / 100));

/** On the frame: the robot's planted sole above the floor plate, in the drawing's units, for legs `scale` times the person's. */
export const soleGapUnits = (scale: number) => jointsOf(HIPS.robot, scale, 'near').sole[2] - FLOOR;

/** The readout's words for a leg length (the slider shows the length): the model's gap under the feet. */
export function readoutFor(ratioPercent: number): string {
  const gap = footGapCm(ratioPercent);
  return gap > 0 ? `feet float ${gap} cm` : gap < 0 ? `feet sink ${-gap} cm` : 'feet land';
}

function describe(ratio: number): string {
  const gap = footGapCm(ratio);
  const where = gap > 0 ? `float ${gap} cm above the floor` : gap < 0 ? `sink ${-gap} cm into the floor` : 'land on the floor';
  return `Copying a person's walking pose joint for joint, with the person's 90 cm hip height, onto a robot whose legs are ${ratio}% as long makes its feet ${where}; only at 100% do they land exactly.`;
}

const SAMPLE_RATIOS = [70, 85, 100, 115, 130] as const;

/** The mannequin's legs never change: built once from the pose. */
const MANNEQUIN = {
  far: mannequinLeg(jointsOf(HIPS.mannequin, 1, 'far'), -1),
  near: mannequinLeg(jointsOf(HIPS.mannequin, 1, 'near'), 1),
};

/** The robot's legs and the gauge for legs `scale` times the person's. */
function frameAt(scale: number) {
  const near = jointsOf(HIPS.robot, scale, 'near');
  return {
    near: robotLeg(near, 1),
    far: robotLeg(jointsOf(HIPS.robot, scale, 'far'), -1),
    gauge: gaugeOf(PERSON_HIP_CM, near.sole[2] - FLOOR),
    gaugeX: gaugeAt(near.sole[0] + GAUGE_AHEAD),
  };
}


function PartView({ part }: { part: Part }) {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        crease={part.crease}
        inner={part.inner ? <Line d={part.inner} tone={part.innerTone ?? 'faint'} /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  return null;
}

/** Consecutive parts of one group, so the gauge is one translated <g>. */
const RUNS: Array<{ group: Group; parts: Part[] }> = [];
for (const part of PARTS) {
  const last = RUNS[RUNS.length - 1];
  if (last && last.group === part.group) last.parts.push(part);
  else RUNS.push({ group: part.group, parts: [part] });
}

/** A robot leg's parts in painter's order; the near leg's foot is the one lit part. */
const LEG_ORDER: Array<keyof RobotLeg> = ['foot', 'shinRod', 'shinSleeve', 'shinCollar', 'ankle', 'thighRod', 'thighSleeve', 'thighCollar', 'knee', 'kneeCap', 'hip'];
const GAUGE_PARTS = ['slider', 'knob', 'scriber', 'tip'] as const;

type Refs = {
  legs: Record<'near' | 'far', Partial<Record<keyof RobotLeg, SVGGElement | null>>>;
  gauge: SVGGElement | null;
  gaugeParts: Partial<Record<(typeof GAUGE_PARTS)[number], SVGGElement | null>>;
};

function drawFrame(refs: Refs, scale: number) {
  const frame = frameAt(scale);
  for (const leg of ['near', 'far'] as const) for (const key of LEG_ORDER) writeSolid(refs.legs[leg][key] ?? null, frame[leg][key]);
  refs.gauge?.setAttribute('transform', frame.gaugeX);
  for (const key of GAUGE_PARTS) writeSolid(refs.gaugeParts[key] ?? null, frame.gauge[key]);
}

export function RetargetingGap({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const sliderId = `${uid}-ratio`;
  const citationFor = useCitationLookup();
  const artifacts = citationFor('gmr-retargeting-2025');
  const filtering = citationFor('h2o-2024');
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  // The opening pose, fixed for the life of the figure: the live loop moves the parts from here.
  const [rest] = useState(() => ({ scale: ratio / 100, frame: frameAt(ratio / 100), readout: readoutFor(ratio) }));
  const gap = footGapCm(ratio);
  const note = gap > 0 ? `Feet float ${gap} cm above the floor` : gap < 0 ? `Feet sink ${-gap} cm into the floor` : 'Same proportions: the feet land';

  const refs = useRef<Refs>({ legs: { near: {}, far: {} }, gauge: null, gaugeParts: {} });
  const stageRef = useRef<HTMLDivElement>(null);
  const shown = useRef({ scale: rest.scale });
  const readoutEl = useCallback(() => stageRef.current?.closest('[data-anatomy-stage]')?.querySelector<HTMLElement>('[data-readout]') ?? null, []);

  // The robot's legs telescope to the chosen length and the gauge follows the planted foot. The readout
  // names the length the legs are at this frame and the model's gap for it. Reduced motion jumps.
  useEffect(() => {
    const calm = asksForStillness();
    const goal = ratio / 100;
    const readout = readoutEl();
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      const s = shown.current;
      s.scale = calm || Math.abs(goal - s.scale) < 0.0008 ? goal : s.scale + (goal - s.scale) * (1 - Math.exp(-dt / 0.22));
      drawFrame(refs.current, s.scale);
      if (readout) readout.textContent = readoutFor(Math.round(s.scale * 100));
      frame = s.scale === goal ? 0 : requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ratio, readoutEl]);

  const r = refs.current;
  const liveView = (id: LiveId) => {
    if (id === 'mannequin-far' || id === 'mannequin-near') {
      return (
        <g key={id} data-part={id}>
          {MANNEQUIN[id === 'mannequin-far' ? 'far' : 'near'].map((paths, index) => (
            <Solid key={index} paths={paths} tone="hi" />
          ))}
        </g>
      );
    }
    if (id === 'robot-far' || id === 'robot-near') {
      const leg = id === 'robot-far' ? 'far' : 'near';
      return (
        <g key={id} data-part={id} data-testid={leg === 'near' ? 'retargeting-robot' : undefined}>
          {LEG_ORDER.map((key) => (
            <LiveSolid
              key={key}
              ref={(el) => void (r.legs[leg][key] = el)}
              paths={rest.frame[leg][key]}
              tone={key === 'kneeCap' ? 'hi' : 'mid'}
              lit={leg === 'near' && key === 'foot'}
            />
          ))}
        </g>
      );
    }
    return (
      <g key={id}>
        <Solid paths={rest.frame.gauge.base} tone="mid" inner={<Line d={rest.frame.gauge.baseSeam} tone="faint" />} />
        <Solid paths={rest.frame.gauge.column} tone="mid" />
        <Line d={rest.frame.gauge.minor} tone="lo" />
        <Line d={rest.frame.gauge.major} tone="mid" />
        <Solid paths={rest.frame.gauge.cap} tone="mid" />
        <LiveSolid ref={(el) => void (r.gaugeParts.scriber = el)} paths={rest.frame.gauge.scriber} tone="mid" />
        <LiveSolid ref={(el) => void (r.gaugeParts.tip = el)} paths={rest.frame.gauge.tip} tone="hi" />
        <LiveSolid ref={(el) => void (r.gaugeParts.slider = el)} paths={rest.frame.gauge.slider} tone="hi" />
        <LiveSolid ref={(el) => void (r.gaugeParts.knob = el)} paths={rest.frame.gauge.knob} tone="mid" />
      </g>
    );
  };

  return (
    <InstrumentFigure
      figureId="retargeting-gap"
      className={className}
      kicker="Motion retargeting"
      heading="Copied human poses misplace a robot's feet"
      controls={
        <SliderRow
          htmlFor={sliderId}
          label="Robot's leg length"
          value={<span data-testid="retargeting-ratio">{ratio}% as long</span>}
        >
          <input
            id={sliderId}
            type="range"
            data-brand-control-id="control:input"
            min={RATIO_MIN}
            max={RATIO_MAX}
            step={5}
            value={ratio}
            onChange={(e) => setRatio(Number(e.target.value))}
            aria-label={`Robot's leg length as a percentage of the person's, currently ${ratio}`}
            aria-valuetext={`${ratio}%; ${note.toLowerCase()}`}
            className={INSTRUMENT_SLIDER_CLASS}
          />
        </SliderRow>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Lit: the robot's planted foot"
          readout={rest.readout}
          status="Illustrative bodies"
          data-testid="retargeting-stage"
        >
          <div ref={stageRef}>
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              fit={PHONE_FIT}
              label={`A person walking, and a robot given the same joint angles and hip height with legs ${ratio}% as long, hung from one beam on a test frame. ${note}.`}
              describedBy={descriptionId}
            >
              {RUNS.map((run, index) => {
                const body = run.parts.map((part, k) => (part.kind === 'live' ? liveView(part.id) : <PartView key={k} part={part} />));
                if (run.group === 'static') return <g key={index}>{body}</g>;
                return (
                  <g key={index} ref={(el) => void (r.gauge = el)} transform={rest.frame.gaugeX} data-testid="retargeting-gap" data-gap={gap} data-part="height-gauge">
                    {body}
                  </g>
                );
              })}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="Joint-for-joint copies onto other proportions leave robot feet floating or sunk, which hurts tracking policies."
      method={
        <>
          <div>
            Motion data from people is retargeted to a robot before a whole-body policy learns to track it. The
            simplest copy keeps the person&apos;s joint angles and hip height; on a robot with shorter legs the feet
            then float, and with longer legs they sink into the floor. Retargeting studies report artifacts such as
            foot sliding and self-penetration that significantly reduce tracking-policy robustness, particularly for
            dynamic or long sequences. H2O filters out retargeted motions that a privileged imitator cannot track.
          </div>
          <div>
            The bodies, the walking pose and the 90 cm hip height are illustrative; no robot&apos;s measurements are
            drawn. On the frame, the gauge&apos;s scale reads centimetres at that hip height.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Where the robot's feet end up"
            description={describe(ratio)}
            rowHeader="robot legs (% of the person's)"
            columns={[{ header: 'lower foot above the floor (cm)', numeric: true }]}
            rows={[...new Set([...SAMPLE_RATIOS, ratio])]
              .sort((a, b) => a - b)
              .map((value) => ({ label: String(value), values: [String(footGapCm(value))] }))}
          />
        </>
      }
      source={
        <span data-testid="retargeting-source">
          {artifacts ? (
            <a data-brand-control-id="control:link-focus" href={artifacts.url} target="_blank" rel="noopener" className="underline-offset-2">
              {artifacts.label}
            </a>
          ) : (
            'motion retargeting study'
          )}
          ;{' '}
          {filtering ? (
            <a data-brand-control-id="control:link-focus" href={filtering.url} target="_blank" rel="noopener" className="underline-offset-2">
              {filtering.label}
            </a>
          ) : (
            'H2O'
          )}
          .
        </span>
      }
    />
  );
}

/** Drawing units per centimetre of the person's hip height, for the model test. */
export const UNITS_PER_CM = unitsPerCm(PERSON_HIP_CM);
