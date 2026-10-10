'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PlotStage,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  Bar,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_VIEW_WIDTH,
  ConstraintHatch,
  DirectLabel,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
import {
  AGILITY_STEPS,
  DEFAULT_AGILITY,
  DEFAULT_LATENCY_MS,
  INTERACTIVE_MAX_LATENCY_MS,
  OBSTACLE_RADIUS_M,
  SENSORS,
  formatSeconds,
  formatSpeed,
  latencyOutcome,
} from '@/lib/aerial-latency';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * PerceptionLatency: how fast is too fast, for the adjacent/drones module.
 * Reproduces the sense-and-avoid analysis of Falanga, Kim, and Scaramuzza
 * (RA-L 2019), drawn as distance: a drone flying at the wall it can just
 * see, at the fastest speed that still lets it swerve in time.
 *
 * The track from the drone to the wall splits into the stretch flown
 * while the camera is still reporting (constraint role, the latency band)
 * and the swerve (action role, the avoidance band). At the maximum speed
 * the swerve ends exactly at the wall, so the dashed margin after it has
 * zero width by construction (lib/aerial-latency).
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 240;
const TRACK_LEFT = 66;
const WALL_X = 298;
const TRACK_Y = 108;
const TRACK_H = 4;
const DIM_Y = 132;
const DIAL_X = 40;
const DIAL_Y = 230;
const DIAL_R = 30;
/** Full scale in km/h: the model tops out near 236 at zero delay and the hardest swerve. */
const DIAL_MAX_KMH = 240;

const f = (v: number) => Number(v.toFixed(2));
const kmh = (ms: number) => Math.round(ms * 3.6);
const metres = (m: number) => `${m.toFixed(1)} metres`;
const G = 9.81;

type CameraId = 'stereo' | 'event' | 'custom';
type AgilityId = `${(typeof AGILITY_STEPS)[number]}`;

const STEREO = SENSORS[0];
const EVENT = SENSORS[1];

const CAMERA_PRESETS: { id: CameraId; label: string }[] = [
  { id: 'stereo', label: 'Ordinary camera (7 hundredths of a second)' },
  { id: 'event', label: 'Faster camera (about 1 hundredth)' },
];

const AGILITY_NAMES: Record<AgilityId, string> = {
  '10': 'Gentle',
  '25': 'Standard (the study’s)',
  '50': 'Hard',
  '200': 'Extreme',
};

const AGILITY_PRESETS = AGILITY_STEPS.map((u) => ({
  id: String(u) as AgilityId,
  label: AGILITY_NAMES[String(u) as AgilityId],
}));

const cameraFor = (latencyMs: number): CameraId =>
  latencyMs === Math.round(STEREO.latencyS * 1000)
    ? 'stereo'
    : latencyMs === Math.round(EVENT.latencyS * 1000)
      ? 'event'
      : 'custom';

function Drone({ x, y }: { x: number; y: number }) {
  const ink = CHART_STRUCTURE.label;
  return (
    <g data-testid="drone" fill="none" stroke={ink} strokeWidth={CHART_STROKE.trace} strokeLinecap="round">
      <rect x={x - 8} y={y - 5} width={16} height={10} rx={1.5} fill={MOTION_STAGE.background} />
      <line x1={x - 22} y1={y - 8} x2={x + 22} y2={y - 8} />
      <line x1={x - 16} y1={y - 8} x2={x - 6} y2={y - 5} />
      <line x1={x + 16} y1={y - 8} x2={x + 6} y2={y - 5} />
      <line x1={x - 30} y1={y - 12} x2={x - 14} y2={y - 12} />
      <line x1={x + 14} y1={y - 12} x2={x + 30} y2={y - 12} />
      <line x1={x - 22} y1={y - 12} x2={x - 22} y2={y - 8} />
      <line x1={x + 22} y1={y - 12} x2={x + 22} y2={y - 8} />
      {/* The camera on the nose, looking at the wall. */}
      <circle cx={x + 11} cy={y} r={2.5} fill={MOTION_STAGE.background} />
    </g>
  );
}

/** The wall: a solid part, drawn as one ink outline with a light hatch inside. */
function Wall({ x }: { x: number }) {
  const ink = CHART_STRUCTURE.label;
  const top = TRACK_Y - 44;
  const bottom = TRACK_Y + 44;
  const lines = Array.from({ length: Math.floor((bottom - top) / 6) }, (_, i) => top + 6 + i * 6);
  return (
    <g data-testid="wall" data-chart-role="obstacle" fill="none" stroke={ink} strokeWidth={CHART_STROKE.trace}>
      <g stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure}>
        {lines.map((ly) => (
          <line key={ly} x1={x} y1={f(Math.min(bottom, ly))} x2={x + 18} y2={f(Math.max(top, ly - 18))} />
        ))}
      </g>
      <rect x={x} y={top} width={18} height={bottom - top} />
    </g>
  );
}

function Speedometer({ speedKmh }: { speedKmh: number }) {
  const ink = CHART_STRUCTURE.label;
  const angle = Math.PI * (1 - Math.min(1, speedKmh / DIAL_MAX_KMH));
  const nx = f(DIAL_X + Math.cos(angle) * (DIAL_R - 6));
  const ny = f(DIAL_Y - Math.sin(angle) * (DIAL_R - 6));
  return (
    <g data-testid="speedometer">
      <path
        d={`M ${DIAL_X - DIAL_R} ${DIAL_Y} A ${DIAL_R} ${DIAL_R} 0 0 1 ${DIAL_X + DIAL_R} ${DIAL_Y}`}
        fill="none"
        stroke={ink}
        strokeWidth={CHART_STROKE.structure}
      />
      <line x1={DIAL_X} y1={DIAL_Y} x2={nx} y2={ny} stroke={ink} strokeWidth={CHART_STROKE.trace} strokeLinecap="round" />
      <circle cx={DIAL_X} cy={DIAL_Y} r={2} fill={ink} />
      <DirectLabel x={DIAL_X + DIAL_R + 14} y={DIAL_Y - 4}>
        top safe speed: <tspan data-testid="speedometer-reading">{`about ${speedKmh} km/h`}</tspan>
      </DirectLabel>
    </g>
  );
}

function Reading({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <li>
      {label}: <span data-testid={testId} className="text-text">{value}</span>
    </li>
  );
}

export function PerceptionLatency({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const hatchId = `latency-hatch-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [latencyMs, setLatencyMs] = useState(DEFAULT_LATENCY_MS);
  const [agility, setAgility] = useState<number>(DEFAULT_AGILITY);

  const rangeM = STEREO.rangeM;
  const latencyS = latencyMs / 1000;
  const outcome = latencyOutcome(latencyS, agility, rangeM);
  const ttc = outcome.timeToContactS;
  const tAvoid = outcome.avoidanceTimeS;
  const speed = outcome.maxSpeedMs;
  const blindM = speed * latencyS;
  const swerveM = Math.min(rangeM - blindM, speed * tAvoid);
  const speedKmh = kmh(speed);

  const xAtM = (m: number) => f(TRACK_LEFT + (m / rangeM) * (WALL_X - TRACK_LEFT));
  const blindX1 = xAtM(blindM);
  const swerveX1 = xAtM(blindM + swerveM);
  const blindMid = f((TRACK_LEFT + blindX1) / 2);
  const swerveMid = f((blindX1 + swerveX1) / 2);
  const camera = cameraFor(latencyMs);
  const agilityName = AGILITY_NAMES[String(agility) as AgilityId] ?? `${agility}`;

  const reset = () => {
    setLatencyMs(DEFAULT_LATENCY_MS);
    setAgility(DEFAULT_AGILITY);
  };

  const plainReadout = `At about ${speedKmh} kilometres an hour the drone flies about ${metres(
    blindM,
  )} before its camera reports the wall, then swerves for about ${metres(swerveM)}.`;

  return (
    <InstrumentFigure
      figureId="perception-latency"
      className={className}
      kicker="Drone obstacle avoidance"
      heading="A drone that sees faster can safely fly faster"
      controls={
        <>
          <PresetGroup<CameraId>
            label="Camera"
            presets={CAMERA_PRESETS}
            value={camera}
            onChange={(id) => {
              if (id === 'stereo') setLatencyMs(Math.round(STEREO.latencyS * 1000));
              if (id === 'event') setLatencyMs(Math.round(EVENT.latencyS * 1000));
            }}
            testId="camera"
          />
          <PresetGroup<AgilityId>
            label="How hard it can swerve"
            presets={AGILITY_PRESETS}
            value={String(agility) as AgilityId}
            onChange={(id) => setAgility(Number(id))}
            testId="agility"
          />
        </>
      }
      adjust={
        <>
          <ControlField className="w-full basis-full content-start sm:max-w-sm">
            <ControlLabel htmlFor="perception-latency" value={formatSeconds(latencyS)}>
              Camera delay
            </ControlLabel>
            <input
              id="perception-latency"
              type="range"
              data-brand-control-id="control:input"
              min={0}
              max={INTERACTIVE_MAX_LATENCY_MS}
              step={1}
              value={latencyMs}
              onChange={(e) => setLatencyMs(Number(e.target.value))}
              aria-label={`Camera delay (perception latency), currently ${formatSeconds(latencyS)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="instant" high="a fifth of a second" />
          </ControlField>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentReadout data-testid="latency-plain-readout">{plainReadout}</InstrumentReadout>
              <StageStatus>not measured</StageStatus>
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`A drone flying at a wall it can see ${rangeM} metres ahead, at a top safe speed of about ${speedKmh} kilometres an hour. It flies about ${metres(
              blindM,
            )} before its camera reports the wall, then swerves for about ${metres(swerveM)}, finishing at the wall.`}
            aria-describedby={descriptionId}
          >
            <StageAnnotation
              x={8}
              y={16}
              lines={['The drone covers this stretch before', 'its camera has even reported the wall']}
              target={[blindMid, TRACK_Y - 8]}
              from={[blindMid, 44]}
            />

            <g data-testid="latency-band" data-series="perception-latency">
              <ConstraintHatch
                id={hatchId}
                x={TRACK_LEFT}
                y={TRACK_Y}
                width={Math.max(0, blindX1 - TRACK_LEFT)}
                height={TRACK_H}
              />
            </g>
            <g data-testid="avoid-band" data-series="avoidance-maneuver">
              <Bar
                x={blindX1}
                y={TRACK_Y}
                width={Math.max(0, swerveX1 - blindX1)}
                height={TRACK_H}
                role="action"
              />
              {/* The swerve itself: the path bends away from the wall. */}
              <path
                d={`M ${blindX1} ${TRACK_Y - 4} Q ${f(blindX1 + (swerveX1 - blindX1) * 0.7)} ${TRACK_Y - 6} ${swerveX1} ${TRACK_Y - 52}`}
                fill="none"
                stroke={roleColour('action')}
                strokeWidth={CHART_STROKE.trace}
                strokeDasharray={CHART_STROKE.dash}
              />
            </g>
            <rect
              data-testid="margin-band"
              x={swerveX1}
              y={TRACK_Y}
              width={Math.max(0, WALL_X - swerveX1)}
              height={TRACK_H}
              fill="none"
              stroke={CHART_STRUCTURE.axes}
              strokeDasharray={CHART_STROKE.dash}
            />
            <DirectLabel x={swerveMid} y={TRACK_Y + 32} anchor="middle" role="action">
              swerving
            </DirectLabel>

            <Drone x={TRACK_LEFT - 33} y={TRACK_Y + TRACK_H / 2} />
            <Wall x={WALL_X} />
            <DirectLabel x={WALL_X + 9} y={TRACK_Y + 62} anchor="middle">
              wall
            </DirectLabel>

            <g stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
              <line x1={TRACK_LEFT} y1={DIM_Y + 18} x2={WALL_X} y2={DIM_Y + 18} />
              <line x1={TRACK_LEFT} y1={DIM_Y + 13} x2={TRACK_LEFT} y2={DIM_Y + 23} />
              <line x1={WALL_X} y1={DIM_Y + 13} x2={WALL_X} y2={DIM_Y + 23} />
            </g>
            <DirectLabel x={f((TRACK_LEFT + WALL_X) / 2)} y={DIM_Y + 38} anchor="middle">
              it can see {rangeM} metres ahead
            </DirectLabel>

            <Speedometer speedKmh={speedKmh} />
          </PlotStage>
        </FigureStage>
      }
      caption="A drone only sees so far ahead; every split-second its vision takes is distance flown blind, which caps how fast it can safely go."
      method={
        <>
          <p>
            Model, from Falanga, Kim and Scaramuzza: maximum speed = range / (latency + 2 sqrt(r / u)),
            where the range is the {rangeM} m the camera can see, r = {OBSTACLE_RADIUS_M} m is how far
            the drone must move sideways to clear the obstacle, and u is how hard it can accelerate
            sideways. The fastest safe speed is the one at which the swerve ends exactly at the wall,
            so the dashed margin after the swerve is always zero.
          </p>
          <p>
            Swerve settings, as sideways acceleration: Gentle 10 m/s² (about {(10 / G).toFixed(1)} g),
            Standard, the study&rsquo;s value, 25 m/s² (about {(25 / G).toFixed(1)} g), Hard 50 m/s²
            (about {(50 / G).toFixed(1)} g), Extreme 200 m/s² (about {(200 / G).toFixed(1)} g).
          </p>
          <p data-testid="reference-latencies">
            Reference latencies from the study ({rangeM} m sensing range):{' '}
            {SENSORS.map((s, i) => (
              <span key={s.id}>
                {i > 0 && '; '}
                {s.name} {formatSeconds(s.latencyS)}
              </span>
            ))}
            . &ldquo;Ordinary camera&rdquo; is the stereo frame camera and &ldquo;Faster camera&rdquo; is the event camera; the camera-delay slider under
            &ldquo;Adjust more&rdquo; sets any latency from 0 to {INTERACTIVE_MAX_LATENCY_MS} ms.
          </p>
          <p>
            The same budget on a time axis, at the current settings ({agilityName} swerve):
          </p>
          <ul className="m-0! grid list-none gap-0.5 p-0!">
            <Reading label="Lost to latency, before control acts" testId="latency-readout" value={formatSeconds(latencyS)} />
            <Reading label="Avoidance maneuver" testId="avoid-readout" value={formatSeconds(tAvoid)} />
            <Reading label="Time to contact" testId="ttc-readout" value={formatSeconds(ttc)} />
            <Reading label="Maximum speed" testId="max-speed-readout" value={formatSpeed(speed)} />
          </ul>
          <ChartDescription
            id={descriptionId}
            form="state"
            open
            summary="Current sense-and-avoid budget"
            description={`At ${formatSeconds(latencyS)} of perception latency and ${agility} m/s² lateral agility the sense-and-avoid timeline supports a maximum speed of ${formatSpeed(speed)}: ${formatSeconds(latencyS)} is lost before control acts, ${formatSeconds(tAvoid)} is the avoidance maneuver, and the remaining dashed margin still reaches the obstacle at ${formatSeconds(ttc)} time to contact.`}
            states={[
              { label: 'latency', value: formatSeconds(latencyS) },
              { label: 'agility', value: `${agility} m/s²` },
              { label: 'max speed', value: formatSpeed(speed) },
              { label: 'time to contact', value: formatSeconds(ttc) },
              { label: 'avoidance', value: formatSeconds(tAvoid) },
            ]}
          />
        </>
      }
      source="Model and reference latencies from Falanga, Kim and Scaramuzza (2019)."
    />
  );
}
