'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { PartView } from '@/components/iso/part-view';
import { Dots, IsoFigure, Solid } from '@/components/iso/react/draw';
import { asksForStillness, follow, useInView, useLoop, useReadout } from '@/components/iso/react/live';
import { LiveSolid, writeSolid } from '@/components/iso/live-solid';
import {
  CARRIAGE,
  HEADS,
  HEIGHT,
  LOWER_PINS,
  PARK,
  PARTS,
  PHONE_FIT,
  WIDTH,
  carriageShift,
  follower,
  pinRest,
  pinShift,
  pinX,
  upperPin,
} from '@/components/iso/figures/contour-gauge-track';
import {
  DEFAULT_DEGRADATION,
  TERRAIN_CELLS,
  actionDivergence,
  formatDivergence,
  formatMeters,
  occludedCells,
  reconstructionMae,
} from '@/lib/sim2real';

/**
 * TeacherStudent: teacher-student training, drawn as a contour gauge on a
 * test track (components/iso/figures/contour-gauge-track.ts).
 *
 * In simulation the teacher is given the true ground. The student that
 * runs on the real robot never is: it has to work the ground out from what
 * its legs feel. On the gauge, a carriage walks the track with a wheel on
 * the ground, and each of 24 pins drops onto the ground as it passes; the
 * row of pin heads (the one lit part) is the student's guess, and the plate
 * behind them is cut to the truth the teacher had. Leg-reading noise makes
 * pins sit high or low, and a missing reading is a pin that did not drop.
 *
 * The numbers are the authored teaching model in lib/sim2real.ts: chosen
 * terrain, a constructed error field that grows with the noise and seeded
 * missing readings. No teacher or student is trained. Changing the noise
 * sends the carriage along the track once to read the ground again. Until
 * the reader touches it, an idle tour steps through the three presets; it
 * waits while the figure is off screen, never runs under reduced motion,
 * and stops for good at the reader's first touch.
 */

type NoiseId = 'clean' | 'some' | 'very';

export const NOISE_PRESETS: { id: NoiseId; label: string; degradation: number }[] = [
  { id: 'clean', label: 'Clean', degradation: 0 },
  { id: 'some', label: 'Some noise', degradation: DEFAULT_DEGRADATION },
  { id: 'very', label: 'Very noisy', degradation: 0.6 },
];

const presetFor = (degradation: number): NoiseId | null =>
  NOISE_PRESETS.find((p) => Math.abs(p.degradation - degradation) < 1e-9)?.id ?? null;

/** The average gap between the guess and the true ground, in centimeters with one decimal. */
export const gapCm = (degradation: number) => (reconstructionMae(degradation) * 100).toFixed(1);
const missingCount = (degradation: number) => occludedCells(degradation).filter(Boolean).length;

/** The live readout: how far the guess is from the real ground, and how many readings went missing. */
export function readoutFor(degradation: number): string {
  const missing = missingCount(degradation);
  const lost = missing === 0 ? 'no readings missing' : `${missing} of ${TERRAIN_CELLS} readings missing`;
  if (reconstructionMae(degradation) < 0.0005) return `Guess matches the real ground · ${lost}`;
  return `Guess off the real ground by ${gapCm(degradation)} cm on average · ${lost}`;
}
/** What the readout says while the carriage is reading the ground. */
export const WALKING = 'Reading the ground through its legs';

/** The one line under the drawing that says what to watch. */
export const HINT = 'The blue pin heads are the robot’s guess of the ground · the plate behind them is cut to the true ground';

/** The idle tour: clean readings, very noisy ones, then back to some noise. */
export const TOUR: readonly NoiseId[] = ['clean', 'very', 'some'];
const TOUR_START_MS = 1400;
const TOUR_HOLD_MS = 4600;
/** How fast the carriage walks the track, in drawing units a second. */
const WALK_SPEED = 190;

export function TeacherStudent({
  defaultDegradation = DEFAULT_DEGRADATION,
  className,
}: {
  defaultDegradation?: number;
  className?: string;
}) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const lee = citationFor('lee-2020');
  const [degradation, setDegradation] = useState(defaultDegradation);

  const mae = reconstructionMae(degradation);
  const divergence = actionDivergence(degradation);
  const missing = missingCount(degradation);
  const percent = Math.round(degradation * 100);
  const rest = pinRest(degradation);

  // ------------------------------------------------------------ the gauge in motion
  const { anchor, say } = useReadout<SVGGElement>();
  /** What the server and the first render draw; the loop moves the parts from there on. */
  const [first] = useState(() => pinRest(defaultDegradation));
  const lowerRefs = useRef<(SVGGElement | null)[]>([]);
  const upperRefs = useRef<(SVGGElement | null)[]>([]);
  const headRefs = useRef<(SVGGElement | null)[]>([]);
  const carriageRef = useRef<SVGGElement | null>(null);
  const rodRef = useRef<SVGGElement | null>(null);
  const wheelRef = useRef<SVGGElement | null>(null);
  const hubRef = useRef<SVGPathElement | null>(null);
  const axleRef = useRef<SVGGElement | null>(null);
  const motion = useRef({
    tips: [...first.tip],
    goals: [...first.tip],
    target: [...first.tip],
    x: PARK.right as number,
    dest: PARK.right as number,
    walking: false,
    degradation: defaultDegradation,
  });
  const visible = useInView(anchor);

  const kick = useLoop((dt, calm) => {
    const m = motion.current;
    if (m.walking) {
      const step = WALK_SPEED * dt;
      m.x = calm || Math.abs(m.dest - m.x) <= step ? m.dest : m.x + Math.sign(m.dest - m.x) * step;
      const rightward = m.dest > PARK.left;
      for (let i = 0; i < TERRAIN_CELLS; i++) {
        if (rightward ? m.x >= pinX(i) : m.x <= pinX(i)) m.goals[i] = m.target[i]!;
      }
      if (m.x === m.dest) m.walking = false;
    }
    let moving = m.walking;
    for (let i = 0; i < TERRAIN_CELLS; i++) {
      const before = m.tips[i]!;
      const now = follow(before, m.goals[i]!, dt, 0.09, calm);
      m.tips[i] = now;
      if (now !== m.goals[i]) moving = true;
      if (now === before && !m.walking) continue;
      const shift = pinShift(now);
      lowerRefs.current[i]?.setAttribute('transform', shift);
      headRefs.current[i]?.setAttribute('transform', shift);
      writeSolid(upperRefs.current[i] ?? null, upperPin(i, now));
    }
    carriageRef.current?.setAttribute('transform', carriageShift(m.x));
    const feel = follower(m.x);
    writeSolid(rodRef.current, feel.rod);
    writeSolid(wheelRef.current, feel.wheel);
    hubRef.current?.setAttribute('d', feel.hub);
    axleRef.current?.querySelector('circle')?.setAttribute('cx', feel.axle[0].toFixed(1));
    axleRef.current?.querySelector('circle')?.setAttribute('cy', feel.axle[1].toFixed(1));
    say(moving ? WALKING : readoutFor(m.degradation));
    return moving;
  }, visible);

  useEffect(() => {
    const m = motion.current;
    if (m.degradation === degradation) return;
    m.degradation = degradation;
    m.target = pinRest(degradation).tip;
    // The carriage walks to the other end of the track, re-reading every pin as it passes.
    if (!m.walking) m.dest = m.x > 0 ? PARK.left : PARK.right;
    m.walking = true;
    kick();
  }, [degradation, kick]);

  // ------------------------------------------------------------ the idle tour
  const tourOver = useRef(false);
  const tourStep = useRef(0);
  const touched = () => {
    tourOver.current = true;
  };
  useEffect(() => {
    if (!visible || asksForStillness()) return;
    let timer = 0;
    const next = (delay: number) => {
      timer = window.setTimeout(() => {
        const focusInside = anchor.current?.closest('[data-figure-frame]')?.contains(document.activeElement) ?? false;
        if (tourOver.current || focusInside) {
          tourOver.current = true;
          return;
        }
        const id = TOUR[tourStep.current % TOUR.length];
        setDegradation(NOISE_PRESETS.find((p) => p.id === id)!.degradation);
        tourStep.current += 1;
        next(TOUR_HOLD_MS);
      }, delay);
    };
    if (!tourOver.current) next(TOUR_START_MS);
    return () => window.clearTimeout(timer);
  }, [visible, anchor]);

  const choose = (value: number) => {
    touched();
    setDegradation(value);
  };

  const lost = missing === 0 ? 'every pin dropped onto the ground' : `${missing} of ${TERRAIN_CELLS} pins did not drop`;
  const label = `A contour gauge over a test track. A comb of ${TERRAIN_CELLS} pins hangs from a bridge over a strip of bumpy ground; each pin dropped until it touched the ground, so the row of blue pin heads is the student's guess of the ground. Behind the heads stands the teacher's plate, its edge cut to the true ground. At ${percent} percent leg-reading noise ${lost}, and the guess is off by ${gapCm(degradation)} cm on average.`;
  const description = `At ${percent} percent proprioceptive degradation the student's guess of the teacher's terrain is off by ${formatMeters(mae)} on average, action divergence ${formatDivergence(divergence)}, with ${missing} of ${TERRAIN_CELLS} leg readings missing; on the contour gauge each pin head is one point of the guess, set against the teacher's plate cut to the true ground.`;

  const feel = follower(PARK.right);

  return (
    <InstrumentFigure
      figureId="teacher-student"
      className={className}
      kicker="Teacher-student training"
      heading="A blind robot feels the ground through its legs"
      controls={
        <PresetGroup<NoiseId>
          label="Sensor noise"
          presets={NOISE_PRESETS}
          value={presetFor(degradation)}
          onChange={(id) => choose(NOISE_PRESETS.find((p) => p.id === id)!.degradation)}
          testId="ts-noise"
        />
      }
      adjust={
        <>
          <ControlField className="w-full basis-full content-start sm:max-w-sm">
            <ControlLabel htmlFor={`${uid}-noise`} value={`${percent}%`}>
              Leg-reading noise
            </ControlLabel>
            <input
              id={`${uid}-noise`}
              type="range"
              data-brand-control-id="control:input"
              min={0}
              max={100}
              step={1}
              value={percent}
              onPointerDown={touched}
              onKeyDown={touched}
              onChange={(e) => choose(Number(e.target.value) / 100)}
              aria-label={`Leg-reading noise, the proprioceptive degradation, currently ${percent} percent`}
              aria-valuetext={`${percent} percent: ${readoutFor(degradation)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="clean" high="every reading lost" />
          </ControlField>
          <InstrumentReset onClick={() => choose(defaultDegradation)} />
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint={HINT}
          readout={readoutFor(degradation)}
          status="Illustrative teaching model, not measured robot data"
          data-testid="contour-gauge"
          data-missing={missing}
        >
          <IsoFigure width={WIDTH} height={HEIGHT} fit={PHONE_FIT} label={label} describedBy={descriptionId}>
            <g ref={anchor} onPointerDown={touched}>
              {PARTS.map((part, index) => {
                if (part.kind !== 'slot') return <PartView key={index} part={part} />;
                if (part.slot === 'lower-pins') {
                  return (
                    <g key="lower-pins" data-testid="lower-pins">
                      {LOWER_PINS.map((paths, i) => (
                        <g
                          key={i}
                          transform={pinShift(first.tip[i]!)}
                          ref={(el) => {
                            lowerRefs.current[i] = el;
                          }}
                        >
                          <Solid paths={paths} tone="mid" />
                        </g>
                      ))}
                    </g>
                  );
                }
                if (part.slot === 'follower') {
                  return (
                    <g key="follower" data-testid="follower">
                      <LiveSolid ref={rodRef} paths={feel.rod} tone="mid" />
                      <LiveSolid ref={wheelRef} paths={feel.wheel} tone="mid" />
                      <path ref={hubRef} className="iso-line" data-tone="lo" d={feel.hub} />
                      <g ref={axleRef}>
                        <Dots points={[feel.axle]} size={0.6} />
                      </g>
                    </g>
                  );
                }
                if (part.slot === 'upper-pins') {
                  return (
                    <g key="upper-pins" data-testid="pin-heads">
                      {HEADS.map((paths, i) => (
                        <g key={i} data-pin={i} data-missing={rest.missing[i] ? '' : undefined}>
                          <LiveSolid
                            ref={(el) => {
                              upperRefs.current[i] = el;
                            }}
                            paths={upperPin(i, first.tip[i]!)}
                            tone="mid"
                          />
                          <g
                            transform={pinShift(first.tip[i]!)}
                            ref={(el) => {
                              headRefs.current[i] = el;
                            }}
                          >
                            <Solid paths={paths} tone="hi" lit />
                          </g>
                        </g>
                      ))}
                    </g>
                  );
                }
                return (
                  <g key="carriage" ref={carriageRef} transform={carriageShift(PARK.right)} data-testid="carriage">
                    {CARRIAGE.map((piece, k) => (
                      <PartView key={k} part={piece} />
                    ))}
                  </g>
                );
              })}
            </g>
          </IsoFigure>
        </AnatomyStage>
      }
      caption="The robot cannot see the ground: it learns its shape from what its legs feel, even when those sensor readings are imperfect."
      method={
        <>
          <p>
            Teacher-student training: a teacher policy learns in simulation with privileged information, here the true
            shape of the ground under the robot. A student policy then learns to act like the teacher from what the
            real robot can sense, the joint angles and motor efforts its legs report, and has to work the ground out
            from them. The drawing is a contour gauge on a test track. A carriage walks along the beam with a wheel on
            the ground, the robot&apos;s leg; as it passes each of the {TERRAIN_CELLS} pins, the pin drops until it
            touches the ground, so the row of blue pin heads is the profile felt so far, the student&apos;s guess. The
            plate standing behind the heads is cut to the true ground the teacher was given, and every head should sit
            on its edge. Noisy leg readings make a pin sit a little high or low; a missing reading is a pin that did not
            drop and still hangs at the top of its travel. Heights are drawn far steeper than the track is long.
          </p>
          <p>
            The readout&apos;s gap is the mean absolute error of the guess: for each of the {TERRAIN_CELLS} stretches of
            ground, how far the guess sits from the true height, averaged. Where a reading is missing the model still
            guesses, worse, and that guess counts in the average too. At {percent}% leg-reading noise the gap is{' '}
            <span data-testid="mae-readout">{formatMeters(mae)}</span> ({gapCm(degradation)} cm), the made-up action
            divergence, 2.2 times that gap, is <span data-testid="divergence-readout">{formatDivergence(divergence)}</span>,
            and <span data-testid="occluded-readout">{missing}/{TERRAIN_CELLS}</span> readings are missing. The numbers
            are an authored teaching model, not a trained teacher or student: the ground is chosen terrain, and the
            guess is that terrain plus an error field that grows with the noise by construction.
          </p>
          <ChartDescription
            id={descriptionId}
            form="state"
            open
            summary="The gap at this noise level"
            description={description}
            states={[
              { label: 'leg-reading noise', value: `${percent}%` },
              { label: 'average gap', value: formatMeters(mae) },
              { label: 'difference in the moves chosen', value: formatDivergence(divergence) },
              { label: 'missing readings', value: `${missing}/${TERRAIN_CELLS}` },
            ]}
          />
        </>
      }
      source={
        <span data-testid="teacher-student-sources">
          The idea, not these numbers: in{' '}
          {lee ? (
            <a data-brand-control-id="control:link-focus" href={lee.url} target="_blank" rel="noopener" className="underline-offset-2">
              {lee.label}
            </a>
          ) : (
            'Lee and colleagues'
          )}
          , a teacher with the true terrain trained a student that walked ANYmal robots on what their legs sensed alone.
        </span>
      }
    />
  );
}
