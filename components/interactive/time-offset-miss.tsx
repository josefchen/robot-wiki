'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  SliderRow,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid, Wire } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { useEasedValue } from '@/components/motion/use-eased-value';
import { HEIGHT, PARTS, PHONE_FIT, TRAVEL, WIDTH, beamTo, slideTo, type Group, type Part } from '@/components/iso/figures/time-offset-bench';

/**
 * TimeOffsetMiss: why time calibration matters, drawn as a tracking bench.
 *
 * A gripper rides a belt-driven rail over a ruler. A camera on a boom above
 * it tracks the gripper with a fine beam that lands where the camera's
 * latest photo shows the gripper. The photo is 55 milliseconds late (the
 * camera delay Realtime-VLA V2 measured on its RealSense D435 and Airbot
 * Play rig), so while the gripper moves, the beam's spot trails the
 * gripper's own pointer on the ruler by the speed times the delay.
 *
 * The one control is the gripper's speed. The bench stands still with the
 * gripper mid-stroke and the spot at the steady gap; "Run the bench" sweeps
 * the gripper along the rail, slowed down for the eye, with the spot
 * following the gripper's position 55 milliseconds earlier. Reduced motion
 * keeps the still pose. The palm is the one lit part.
 */

/** Camera delay in seconds: Realtime-VLA V2, t_camera on the DOS W1 rig. */
export const CAMERA_DELAY_S = 0.055;
export const SPEED_MAX_CM_S = 100;
export const DEFAULT_SPEED_CM_S = 50;

/** How far behind the photographed hand sits, in millimetres. */
export const gapMm = (speedCmS: number) => speedCmS * 10 * CAMERA_DELAY_S;

/** "27.5": millimetres to one decimal, dropping a trailing ".0". */
export const formatMm = (mm: number) => (Math.round(mm * 10) / 10).toString();

/** The bench runs this many times slower than real time, so the eye can follow it. */
export const SLOW = 12;
/** Where the gripper stands while the bench is still, in mm from the ruler's middle. */
export const REST_X = 40;

/**
 * The gripper's position, in mm, at bench time `t` seconds when it moves at
 * `speedMmS` back and forth across ±TRAVEL. Time 0 is the gripper at REST_X
 * moving to the right, so the still pose is the moving pose frozen.
 */
export function handAt(t: number, speedMmS: number): number {
  if (speedMmS <= 0) return REST_X;
  const span = 2 * TRAVEL;
  const period = (2 * span) / speedMmS;
  const start = (REST_X + TRAVEL) / speedMmS;
  const phase = ((((t + start) % period) + period) % period) * speedMmS;
  return phase < span ? -TRAVEL + phase : TRAVEL - (phase - span);
}

function describe(speed: number): string {
  if (speed === 0) {
    return `With the gripper standing still, the 55 ms camera delay measured on a RealSense D435 rig leaves no gap: the beam's spot sits under the gripper's pointer, 0 mm apart, at a speed of 0.`;
  }
  return `At a gripper speed of ${speed} cm a second, the 55 ms camera delay measured on a RealSense D435 rig puts the camera's beam ${formatMm(gapMm(speed))} mm behind the gripper's pointer on the ruler; the gap is speed times delay.`;
}

const SAMPLE_SPEEDS = [10, 25, 50, 100] as const;

const readoutText = (speed: number, gap: number) =>
  speed === 0 ? 'Standing still: no gap' : `${speed} cm a second · photo ${formatMm(gap)} mm behind`;

function PartView({ part }: { part: Part }) {
  if (part.kind === 'solid') return <Solid paths={part.paths} tone={part.tone} lit={part.lit} halo={part.halo} crease={part.crease} />;
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.kind === 'wire') return <Wire from={part.from} to={part.to} via={part.via} tone={part.tone} />;
  return null;
}

/** Consecutive parts of one group, so each moving group is one <g>. */
const RUNS: Array<{ group: Group; parts: Part[] }> = [];
for (const part of PARTS) {
  const last = RUNS[RUNS.length - 1];
  if (last && last.group === part.group) last.parts.push(part);
  else RUNS.push({ group: part.group, parts: [part] });
}

export function TimeOffsetMiss({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const sliderId = `${uid}-speed`;
  const citationFor = useCitationLookup();
  const delaySource = citationFor('realtime-vla-v2-2026');
  const [speed, setSpeed] = useState(DEFAULT_SPEED_CM_S);
  const [running, setRunning] = useState(false);
  const gap = gapMm(speed);
  const shownGap = useEasedValue(gap);

  const handRef = useRef<SVGGElement>(null);
  const pointerRef = useRef<SVGGElement>(null);
  const spotRef = useRef<SVGGElement>(null);
  const beamRef = useRef<SVGPathElement>(null);
  const speedRef = useRef(speed);
  useLayoutEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // The still pose: the gripper mid-stroke, the spot at the steady gap behind it.
  const stillSpot = REST_X - shownGap;

  useEffect(() => {
    if (!running || asksForStillness()) return;
    let frame = 0;
    let last = performance.now();
    let t = 0;
    const readout = handRef.current?.closest('[data-anatomy-stage]')?.querySelector<HTMLElement>('[data-readout]');
    const tick = (now: number) => {
      t += Math.min(now - last, 64) / 1000 / SLOW;
      last = now;
      const v = speedRef.current * 10;
      const hand = handAt(t, v);
      const spot = handAt(t - CAMERA_DELAY_S, v);
      handRef.current?.setAttribute('transform', slideTo(hand));
      pointerRef.current?.setAttribute('transform', slideTo(hand));
      spotRef.current?.setAttribute('transform', slideTo(spot));
      beamRef.current?.setAttribute('d', beamTo(spot));
      if (readout) readout.textContent = readoutText(speedRef.current, Math.abs(hand - spot));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  // Stopping, or a new speed while still, returns the bench to the still pose.
  useEffect(() => {
    if (running) return;
    const readout = handRef.current?.closest('[data-anatomy-stage]')?.querySelector<HTMLElement>('[data-readout]');
    if (readout) readout.textContent = readoutText(speed, gap);
  }, [running, speed, gap]);

  const groupTransform = (group: Group) =>
    group === 'hand' || group === 'pointer' ? slideTo(REST_X) : group === 'spot' ? slideTo(stillSpot) : undefined;

  return (
      <InstrumentFigure
        figureId="time-offset-miss"
        className={className}
        kicker="Time calibration"
        heading="Fast arms turn camera delay into big misses"
        controls={
          <>
            <SliderRow
              htmlFor={sliderId}
              label="Hand speed"
              value={<span data-testid="time-offset-speed">{speed} cm a second</span>}
            >
              <input
                id={sliderId}
                type="range"
                data-brand-control-id="control:input"
                min={0}
                max={SPEED_MAX_CM_S}
                step={5}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                aria-label={`Hand speed, in centimetres a second, currently ${speed}`}
                aria-valuetext={`${speed} centimetres a second; the photo shows the hand ${formatMm(gap)} millimetres behind`}
                className={INSTRUMENT_SLIDER_CLASS}
              />
            </SliderRow>
            <button
              type="button"
              data-brand-control-id="control:secondary-action"
              onClick={() => setRunning((r) => !r)}
              data-testid="time-offset-run"
              className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
            >
              {running ? 'Stop the bench' : 'Run the bench'}
            </button>
          </>
        }
        stage={
          <AnatomyStage
            viewWidth={WIDTH}
            hint={running ? 'Running, slowed for the eye' : 'Set the speed, then run the bench'}
            readout={readoutText(speed, gap)}
            status="Illustrative bench; measured camera delay"
            data-testid="time-offset-stage-frame"
          >
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              fit={PHONE_FIT}
              label={`A gripper on a rail over a ruler, moving at ${speed} centimetres a second. A camera above it aims a beam at where its latest photo shows the gripper; the beam lands ${formatMm(gap)} millimetres behind the gripper's pointer.`}
              describedBy={descriptionId}
            >
              {RUNS.map((run, index) => {
                const body = run.parts.map((part, k) =>
                  part.kind === 'beam' ? (
                    <path key={k} ref={beamRef} className="iso-line" data-tone="mid" d={beamTo(stillSpot)} data-testid="time-offset-beam" />
                  ) : (
                    <PartView key={k} part={part} />
                  ),
                );
                if (run.group === 'static') return <g key={index}>{body}</g>;
                return (
                  <g
                    key={index}
                    ref={run.group === 'hand' ? handRef : run.group === 'pointer' ? pointerRef : spotRef}
                    transform={groupTransform(run.group)}
                    data-testid={`time-offset-${run.group}`}
                  >
                    {body}
                  </g>
                );
              })}
            </IsoFigure>
          </AnatomyStage>
        }
        caption="A late photo shows the hand where it was, so faster hands mean bigger misses."
        method={
          <>
            <div>
              A robot pairs each camera photo with the arm position it reads when the photo arrives. If the photo
              took 55 milliseconds to arrive, it shows the hand where it was 55 milliseconds earlier, so the gap is
              the hand&apos;s speed times that delay. Realtime-VLA V2 measured delays of 55 milliseconds for the
              camera, 50 for the joint readings and 150 for the motion on one RealSense D435 and Airbot Play rig; the
              figure uses the camera delay.
            </div>
            <div>
              The bench is illustrative: a gripper on a belt-driven rail, and a camera that aims a beam at where its
              latest photo shows the gripper. Running, it moves slowed down twelve times. Time calibration
              estimates the delay and subtracts it, so the photo is paired with the arm position at the moment it
              was taken.
            </div>
            <ChartDescription
              id={descriptionId}
              form="table"
              open
              summary="Gap between the photographed and the real hand"
              description={describe(speed)}
              rowHeader="hand speed (cm a second)"
              columns={[{ header: 'gap (mm)', numeric: true }]}
              rows={[...new Set([...SAMPLE_SPEEDS, speed])]
                .sort((a, b) => a - b)
                .map((s) => ({ label: String(s), values: [formatMm(gapMm(s))] }))}
            />
          </>
        }
        source={
          <span data-testid="time-offset-source">
            Camera delay:{' '}
            {delaySource ? (
              <a data-brand-control-id="control:link-focus" href={delaySource.url} target="_blank" rel="noopener" className="underline-offset-2">
                {delaySource.label}
              </a>
            ) : (
              'Realtime-VLA V2'
            )}
            .
          </span>
        }
      />
  );
}
