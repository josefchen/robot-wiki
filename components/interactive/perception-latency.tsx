'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  Bar,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_VIEW_WIDTH,
  ChartAxes,
  ConstraintHatch,
  DirectLabel,
  LegendSwatch,
  roleColour,
} from '@/components/motion/chart';
import {
  AGILITY_STEPS,
  DEFAULT_AGILITY,
  DEFAULT_LATENCY_MS,
  INTERACTIVE_MAX_LATENCY_MS,
  SENSORS,
  formatSeconds,
  formatSpeed,
  latencyOutcome,
} from '@/lib/aerial-latency';

/**
 * PerceptionLatency: how fast is too fast, for the adjacent/drones
 * module. Reproduces the sense-and-avoid analysis of Falanga, Kim, and
 * Scaramuzza (RA-L 2019): a drone flying at the maximum speed its
 * perception pipeline can support, with the latency slider eating the
 * time to contact and the agility selector setting the avoidance
 * maneuver's lateral acceleration.
 *
 * One lane runs from the obstacle-detection moment to contact: the
 * latency interval (dead time before control acts), then the avoidance
 * maneuver. Latency and the obstacle take the constraint role and the
 * maneuver the action role, as in the paired sense-avoid scene. At the
 * maximum speed the maneuver ends exactly at contact, so the dashed
 * margin after it has zero width by construction (lib/aerial-latency).
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 111;
const LABEL_Y = 20;
const LANE_TOP = 30;
const LANE_H = 30;
const PLOT = {
  left: 24,
  right: WIDTH - 26,
  top: LANE_TOP,
  bottom: LANE_TOP + LANE_H + 6,
};
const PLOT_W = PLOT.right - PLOT.left;
const LANE_BOTTOM = LANE_TOP + LANE_H;
const TICK_FRACTIONS = [0, 0.25, 0.5, 0.75, 1];

const f = (v: number) => Number(v.toFixed(2));

export function PerceptionLatency({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const hatchId = `latency-hatch-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [latencyMs, setLatencyMs] = useState(DEFAULT_LATENCY_MS);
  const [agility, setAgility] = useState<number>(DEFAULT_AGILITY);

  const latencyS = latencyMs / 1000;
  const outcome = latencyOutcome(latencyS, agility, SENSORS[0].rangeM);
  const ttc = outcome.timeToContactS;
  const tAvoid = outcome.avoidanceTimeS;

  const xAt = (t: number) => f(PLOT.left + (t / ttc) * PLOT_W);
  const latencyX1 = xAt(latencyS);
  const avoidX1 = xAt(latencyS + tAvoid);
  const contactX = PLOT.right;
  const obstacle = roleColour('constraint');

  const reset = () => {
    setLatencyMs(DEFAULT_LATENCY_MS);
    setAgility(DEFAULT_AGILITY);
  };

  return (
    <InstrumentFigure
      figureId="perception-latency"
      className={className}
      heading="Sense-and-avoid budget at the maximum safe speed"
      controls={
        <>
          <div className="flex w-full basis-full">
            <ControlField className="content-start">
              <ControlLabel htmlFor="perception-latency" value={formatSeconds(latencyS)}>
                Perception latency
              </ControlLabel>
              <input
                id="perception-latency"
                type="range"
                data-brand-control-id="control:input"
                min={0}
                max={INTERACTIVE_MAX_LATENCY_MS}
                step={5}
                value={latencyMs}
                onChange={(e) => setLatencyMs(Number(e.target.value))}
                aria-label={`Perception latency, currently ${formatSeconds(latencyS)}`}
                className={INSTRUMENT_SLIDER_CLASS}
              />
            </ControlField>
          </div>
          <div
            role="group"
            aria-label="Maximum lateral acceleration"
            className="flex flex-wrap items-center gap-1"
          >
            <span className="font-sans text-[13px] text-text-dim">Lateral acceleration</span>
            {AGILITY_STEPS.map((u) => (
              <button
                data-brand-control-id="control:selection"
                key={u}
                type="button"
                aria-pressed={agility === u}
                onClick={() => setAgility(u)}
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {u} m/s²
              </button>
            ))}
          </div>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="perception-latency" swatch={<LegendSwatch role="constraint" mark="hatch" />}>
                  lost to latency <span data-testid="latency-readout">{formatSeconds(latencyS)}</span>
                </LegendItem>
                <LegendItem series="avoidance-maneuver" swatch={<LegendSwatch role="action" mark="bar" />}>
                  avoidance maneuver <span data-testid="avoid-readout">{formatSeconds(tAvoid)}</span>
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout className="grid basis-full grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                <span className="grid content-start gap-0.5">
                  <span className="text-xs text-text-dim">Maximum speed</span>
                  <span data-testid="max-speed-readout" className="text-text">
                    {formatSpeed(outcome.maxSpeedMs)}
                  </span>
                </span>
                <span className="grid content-start gap-0.5">
                  <span className="text-xs text-text-dim">Time to contact</span>
                  <span data-testid="ttc-readout" className="text-text">
                    {formatSeconds(ttc)}
                  </span>
                </span>
              </InstrumentReadout>
              <ChartDescription
                id={descriptionId}
                className="basis-full"
                form="state"
                summary="Current sense-and-avoid budget"
                description={`At ${formatSeconds(latencyS)} of perception latency and ${agility} m/s² lateral agility the sense-and-avoid timeline supports a maximum speed of ${formatSpeed(outcome.maxSpeedMs)}: ${formatSeconds(latencyS)} is lost before control acts, ${formatSeconds(tAvoid)} is the avoidance maneuver, and the remaining dashed margin still reaches the obstacle at ${formatSeconds(ttc)} time to contact.`}
                states={[
                  { label: 'latency', value: formatSeconds(latencyS) },
                  { label: 'agility', value: `${agility} m/s²` },
                  { label: 'max speed', value: formatSpeed(outcome.maxSpeedMs) },
                  { label: 'time to contact', value: formatSeconds(ttc) },
                  { label: 'avoidance', value: formatSeconds(tAvoid) },
                ]}
              />
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Sense-and-avoid timeline at the maximum speed of ${formatSpeed(
              outcome.maxSpeedMs,
            )}. Obstacle detected at the sensing range, ${formatSeconds(
              latencyS,
            )} of perception latency before control acts, then an avoidance maneuver of ${formatSeconds(
              tAvoid,
            )} at ${agility} meters per second squared of lateral acceleration. Time to contact ${formatSeconds(
              ttc,
            )}.`}
            aria-describedby={descriptionId}
          >
            <ChartAxes
              plot={PLOT}
              x={(t) => xAt(t)}
              y={() => PLOT.bottom}
              xTicks={TICK_FRACTIONS.map((frac) => ttc * frac)}
              formatX={formatSeconds}
              grid={false}
              yAxis={false}
              xLabel="time after detection"
            />
            <g data-testid="latency-band" data-series="perception-latency">
              <ConstraintHatch
                id={hatchId}
                x={PLOT.left}
                y={LANE_TOP}
                width={Math.max(0, latencyX1 - PLOT.left)}
                height={LANE_H}
              />
            </g>
            <g data-testid="avoid-band" data-series="avoidance-maneuver">
              <Bar
                x={latencyX1}
                y={LANE_TOP}
                width={Math.max(0, avoidX1 - latencyX1)}
                height={LANE_H}
                role="action"
              />
            </g>
            <rect
              data-testid="margin-band"
              x={avoidX1}
              y={LANE_TOP}
              width={Math.max(0, contactX - avoidX1)}
              height={LANE_H}
              fill="none"
              stroke={CHART_STRUCTURE.axes}
              strokeDasharray={CHART_STROKE.dash}
            />
            <line
              x1={PLOT.left}
              y1={LANE_TOP - 4}
              x2={PLOT.left}
              y2={LANE_BOTTOM + 4}
              stroke={CHART_STRUCTURE.label}
              strokeWidth={CHART_STROKE.reference}
            />
            {/* Terminator bars make the obstacle the hard end of the lane by
                shape as well as by colour. */}
            <path
              data-chart-role="constraint"
              d={`M ${contactX} ${LANE_TOP - 4} L ${contactX} ${LANE_BOTTOM + 4} M ${contactX - 4} ${LANE_TOP - 4} L ${contactX + 4} ${LANE_TOP - 4} M ${contactX - 4} ${LANE_BOTTOM + 4} L ${contactX + 4} ${LANE_BOTTOM + 4}`}
              fill="none"
              stroke={obstacle}
              strokeWidth={CHART_STROKE.trace}
              strokeLinecap="round"
            />
            <DirectLabel x={PLOT.left} y={LABEL_Y}>
              detected
            </DirectLabel>
            <DirectLabel x={contactX} y={LABEL_Y} anchor="end" role="constraint">
              obstacle
            </DirectLabel>
          </PlotStage>
        </FigureStage>
      }
      caption="At the maximum safe speed, latency and the avoidance maneuver fill the whole time to contact."
      source={
        <>
          Reference latencies from the study (8 m sensing range):{' '}
          {SENSORS.map((s, i) => (
            <span key={s.id}>
              {i > 0 && '; '}
              {s.name} {formatSeconds(s.latencyS)}
            </span>
          ))}
          . Model: maximum speed = range / (latency + 2 sqrt(r / u)), r = 0.75 m.
        </>
      }
    />
  );
}
