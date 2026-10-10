'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  PlotStage,
  SliderRow,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import { CHART_STROKE, DirectLabel, StageAnnotation, roleColour } from '@/components/motion/chart';
import { ArmPost, ArmSketch, armPoints, type ArmPoint } from '@/components/motion/arm-sketch';
import { useEasedValue } from '@/components/motion/use-eased-value';

/**
 * TimeOffsetMiss: why time calibration matters. A robot pairs each camera
 * photo with the arm position it reads when the photo arrives, so a photo
 * that is late shows the hand where it was, behind where it is. The gap is
 * the hand's speed times the delay.
 *
 * The one control is the hand's speed. The delay is the 55 millisecond
 * camera delay Realtime-VLA V2 measured on its RealSense D435 and Airbot
 * Play rig; the arm and its swing about the shoulder are illustrative.
 * Moving the slider glides the photographed arm back along the hand's
 * path; reduced motion jumps there. The arm is a line drawing in ink, the
 * photographed arm a dashed grey trace, and the gap the one accent.
 */

/** Camera delay in seconds: Realtime-VLA V2, t_camera on the DOS W1 rig. */
export const CAMERA_DELAY_S = 0.055;
export const SPEED_MAX_CM_S = 100;
export const DEFAULT_SPEED_CM_S = 50;

/** How far behind the photographed hand sits, in millimetres. */
export const gapMm = (speedCmS: number) => speedCmS * 10 * CAMERA_DELAY_S;

/** "27.5": millimetres to one decimal, dropping a trailing ".0". */
export const formatMm = (mm: number) => (Math.round(mm * 10) / 10).toString();

const WIDTH = 640;
const HEIGHT = 310;
const FLOOR_Y = 290;
const BASE: ArmPoint = { x: 170, y: 280 };
const L1 = 168;
const L2 = 150;
/** The arm's pose now: shoulder angle and the elbow's bend, radians. */
const SHOULDER = 1.05;
const ELBOW = -1.15;
/** Stage units of hand travel per millimetre of gap, so the fastest speed draws a clear gap. */
const UNITS_PER_MM = 1.6;

const f = (v: number) => Number(v.toFixed(2));

function describe(speed: number): string {
  if (speed === 0) {
    return `With the hand standing still, the 55 ms camera delay measured on a RealSense D435 rig leaves no gap: the photographed hand and the real one sit 0 mm apart at a speed of 0.`;
  }
  return `At a hand speed of ${speed} cm a second, the 55 ms camera delay measured on a RealSense D435 rig puts the photographed hand ${formatMm(gapMm(speed))} mm behind the real one; the gap is speed times delay.`;
}

const SAMPLE_SPEEDS = [10, 25, 50, 100] as const;

const NOW = armPoints(BASE, L1, L2, { shoulder: SHOULDER, elbow: ELBOW }).hand;
/** The hand's distance from the shoulder and its angle above the floor. */
const REACH = Math.hypot(NOW.x - BASE.x, BASE.y - NOW.y);
const HAND_ANGLE = Math.atan2(BASE.y - NOW.y, NOW.x - BASE.x);
const onCircle = (angle: number, radius: number) => ({
  x: f(BASE.x + radius * Math.cos(angle)),
  y: f(BASE.y - radius * Math.sin(angle)),
});
const arc = (from: number, to: number, radius: number, steps = 24) =>
  Array.from({ length: steps + 1 }, (_, k) => {
    const { x, y } = onCircle(from + ((to - from) * k) / steps, radius);
    return `${k === 0 ? 'M' : 'L'}${x} ${y}`;
  }).join(' ');
/** The hand's path, dotted, a little either side of the two poses. */
const HAND_PATH = arc(HAND_ANGLE - 0.32, HAND_ANGLE + 0.48, REACH, 40);
const BRACKET_RADIUS = REACH + 30;

export function TimeOffsetMiss({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const sliderId = `${uid}-speed`;
  const citationFor = useCitationLookup();
  const delaySource = citationFor('realtime-vla-v2-2026');
  const [speed, setSpeed] = useState(DEFAULT_SPEED_CM_S);
  const gap = gapMm(speed);
  const shown = useEasedValue(gap);

  /** The photographed arm is the arm swung back by the hand's travel. */
  const swing = (shown * UNITS_PER_MM) / REACH;
  const ghost = { shoulder: SHOULDER + swing, elbow: ELBOW };
  const ghostHand = armPoints(BASE, L1, L2, ghost).hand;
  const showGhost = shown * UNITS_PER_MM > 1;
  const accent = roleColour('highlight');
  const tick = (angle: number) => {
    const a = onCircle(angle, BRACKET_RADIUS - 6);
    const b = onCircle(angle, BRACKET_RADIUS + 6);
    return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
  };
  const note = onCircle(HAND_ANGLE + swing / 2, BRACKET_RADIUS + 16);

  return (
    <InstrumentFigure
      figureId="time-offset-miss"
      className={className}
      kicker="Time calibration"
      heading="Fast arms turn camera delay into big misses"
      controls={
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
      }
      stage={
        <FigureStage footer={<StageStatus>Illustrative arm; measured delay</StageStatus>}>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`A robot arm moving its hand to the right at ${speed} centimetres a second. A dashed copy of the arm shows where the late camera photo puts the hand, ${formatMm(gap)} millimetres behind.`}
            aria-describedby={descriptionId}
            data-testid="time-offset-stage"
          >
            <ArmPost base={BASE} floorY={FLOOR_Y} floor={[20, 620]} />
            <path d={HAND_PATH} fill="none" stroke="var(--line-strong)" strokeWidth={CHART_STROKE.structure} strokeDasharray="2 4" />
            {showGhost ? (
              <ArmSketch base={BASE} l1={L1} l2={L2} angles={ghost} role="reference" ghost pointDown testId="time-offset-ghost" />
            ) : null}
            <ArmSketch base={BASE} l1={L1} l2={L2} angles={{ shoulder: SHOULDER, elbow: ELBOW }} pointDown testId="time-offset-arm" />
            <DirectLabel x={f(NOW.x + 20)} y={f(NOW.y + 22)}>
              hand now
            </DirectLabel>
            {showGhost ? (
              <g data-testid="time-offset-gap">
                {swing * REACH > 22 ? (
                  <text x={f(ghostHand.x - 10)} y={f(ghostHand.y - 14)} textAnchor="end" fontSize={12} fill="var(--role-reference-text)">
                    in the photo
                  </text>
                ) : null}
                <g fill="none" stroke={accent} strokeWidth={CHART_STROKE.structure}>
                  <path d={arc(HAND_ANGLE, HAND_ANGLE + swing, BRACKET_RADIUS, 16)} />
                  {tick(HAND_ANGLE)}
                  {tick(HAND_ANGLE + swing)}
                </g>
              </g>
            ) : null}
            <StageAnnotation
              x={speed === 0 ? f(NOW.x + 30) : note.x}
              y={speed === 0 ? f(NOW.y - 30) : note.y}
              anchor="start"
              lines={[speed === 0 ? 'Standing still: no gap' : `${formatMm(gap)} mm behind`]}
            />
          </PlotStage>
        </FigureStage>
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
            The arm and its straight-line motion are illustrative. Time calibration estimates the delay and
            subtracts it, so the photo is paired with the arm position at the moment it was taken.
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
