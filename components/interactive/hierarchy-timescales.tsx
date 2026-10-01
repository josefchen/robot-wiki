'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  roleColour,
} from '@/components/motion/chart';
import {
  HIERARCHY_SYSTEMS,
  HORIZON_MS,
  displayTicks,
  fastestLane,
  laneTickRatio,
  lastUpdateAt,
  slowestPeriodicLane,
  updateRatePhrase,
  updateCountAt,
  type TimescaleSystem,
} from '@/lib/hierarchy-timescales';

/**
 * HierarchyTimescales: one horizontal wall-clock timeline per system, with
 * one lane per level of its control hierarchy. A scrub slider moves a
 * playhead across 2 seconds; each lane lights the updates that have fired
 * by then, so the reader sees how many times the selected system's own
 * fastest lane ticks per update of its slowest periodic lane. System
 * overlays (pi0.5, Gemini Robotics 1.5, Helix 02, GO-2) swap the lane
 * structure so the same pattern can be compared across four 2025-2026
 * stacks.
 *
 * The event schedule is schematic. Some output rates are source-reported;
 * other cadences, the instruction pulse, and additional drawing lanes are
 * local assumptions, not separately disclosed control modules.
 *
 * Interactive contract: deterministic render, native range slider (keyboard
 * arrows step the playhead), visible numeric readouts, system selector +
 * reset controls, no auto-playing motion. Every system has four lanes, so a
 * system switch never changes the stage height.
 */
type HierarchyTimescalesProps = {
  /** Initially selected system id. Default 'pi05'. */
  defaultSystem?: string;
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;
const PLOT = { left: 8, right: 330 };
const TOP = 4;
const LANE_PITCH = 40;
/** Lane label baseline and lane line, measured from the top of each lane block. */
const LABEL_DY = 14;
const LINE_DY = 29;
const FIRED_HALF = 6;
const PLAYHEAD_HALF = 9;
/** A pending update is a short broken tick, so it differs from a fired one without its hue. */
const PENDING_HALF = 4;
const PENDING_DASH = '1.5 1';

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function x(tMs: number): number {
  return f(PLOT.left + (tMs / HORIZON_MS) * (PLOT.right - PLOT.left));
}

const laneTop = (index: number) => TOP + index * LANE_PITCH;

const AXIS_TICKS = [0, 500, 1000, 1500, HORIZON_MS];

/** A legend swatch drawn as the stage's own vertical tick. */
function TickSwatch({
  stroke,
  width,
  half,
  opacity,
  dash,
}: {
  stroke: string;
  width: number;
  half: number;
  opacity?: number;
  dash?: string;
}) {
  const h = CHART_TYPE.tickPx;
  return (
    <svg aria-hidden="true" focusable="false" width={h} height={h} viewBox={`0 0 ${h} ${h}`} className="shrink-0">
      <line
        x1={h / 2}
        x2={h / 2}
        y1={h / 2 - half}
        y2={h / 2 + half}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeOpacity={opacity}
        strokeDasharray={dash}
      />
    </svg>
  );
}

const STAGE_LINK = 'underline-offset-2';

export function HierarchyTimescales({
  defaultSystem = 'pi05',
  className,
}: HierarchyTimescalesProps) {
  const descriptionId = `${useId()}-description`;
  const [systemId, setSystemId] = useState(defaultSystem);
  const [playhead, setPlayhead] = useState(0);

  const system: TimescaleSystem =
    HIERARCHY_SYSTEMS.find((s) => s.id === systemId) ?? HIERARCHY_SYSTEMS[0];
  const citationFor = useCitationLookup();
  const citation = citationFor(system.citationId);
  const axisY = TOP + system.lanes.length * LANE_PITCH + 6;
  const tickBaseline = axisY + CHART_STROKE.tickLength + CHART_TYPE.tickPx + 3;
  const height = tickBaseline + 9;
  const updatesFired = system.lanes.reduce(
    (n, lane) => n + updateCountAt(lane, playhead),
    0,
  );
  // The trailing clause is derived from the selected system's own lanes:
  // its real fastest lane, its real slowest periodic lane, and the ratio
  // between them. Never a fixed sentence, which is how the old copy
  // claimed a 1 kHz lane on systems that have none.
  const fastest = fastestLane(system);
  const slowest = slowestPeriodicLane(system);
  const ratio = laneTickRatio(system);
  const ratioText = Number.isInteger(ratio) ? String(ratio) : ratio.toFixed(1);
  const fired = roleColour('action');
  const highlight = roleColour('highlight');

  function reset() {
    setSystemId(defaultSystem);
    setPlayhead(0);
  }

  return (
    <InstrumentFigure
      figureId="hierarchy-timescales"
      className={className}
      heading="Control loops on one clock"
      controls={
        <>
          <div
            role="group"
            aria-label="Select a system overlay"
            className="flex flex-wrap items-center gap-1"
          >
            {HIERARCHY_SYSTEMS.map((s) => (
              <button
                data-brand-control-id="control:selection"
                key={s.id}
                type="button"
                aria-pressed={s.id === system.id}
                onClick={() => setSystemId(s.id)}
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {s.name}
              </button>
            ))}
            <InstrumentReset onClick={reset} />
          </div>
          <ControlField>
            <ControlLabel
              htmlFor="hierarchy-playhead"
              value={
                <span data-testid="playhead-readout" aria-live="polite">
                  t = {playhead} ms
                </span>
              }
            >
              Playhead
            </ControlLabel>
            <input
              id="hierarchy-playhead"
              type="range"
              data-brand-control-id="control:input"
              min={0}
              max={HORIZON_MS}
              step={20}
              value={playhead}
              aria-label={`Playhead position in milliseconds, currently ${playhead}`}
              aria-valuetext={`${playhead} milliseconds`}
              onChange={(e) => setPlayhead(Number(e.target.value))}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem
                  series="fired"
                  swatch={<TickSwatch stroke={fired} width={CHART_STROKE.trace} half={FIRED_HALF} />}
                >
                  update fired
                </LegendItem>
                <LegendItem
                  series="pending"
                  swatch={
                    <TickSwatch
                      stroke={CHART_STRUCTURE.axes}
                      width={CHART_STROKE.structure}
                      half={PENDING_HALF}
                      opacity={CHART_STRUCTURE.axesOpacity}
                      dash={PENDING_DASH}
                    />
                  }
                >
                  update pending
                </LegendItem>
                <LegendItem swatch={<TickSwatch stroke={highlight} width={CHART_STROKE.trace} half={FIRED_HALF} />}>
                  playhead, current time
                </LegendItem>
              </InstrumentLegend>
              {/* Important margins and padding, because the unlayered `.prose`
                  list rules otherwise indent the rows inside the stage. */}
              <ul className="m-0! basis-full list-none divide-y divide-border-strong border-t border-border-strong p-0! font-sans text-[13px]">
                {system.lanes.map((lane) => {
                  const last = lastUpdateAt(lane, playhead);
                  const count = updateCountAt(lane, playhead);
                  return (
                    <li key={lane.id} data-testid={`lane-row-${lane.id}`} className="my-0! py-2">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        <span className="font-medium text-text">{lane.label}</span>
                        <span className="text-text-dim">{lane.rate}</span>
                        {!lane.disclosed && <span className="text-text-dim">Schematic</span>}
                        <span className="ml-auto text-text-dim">
                          {last === null ? (
                            'waiting for first update'
                          ) : (
                            <>
                              <span className="text-text">{count}</span>
                              {count === 1 ? ' update' : ' updates'}, last update:{' '}
                              <span className="text-text">{last} ms</span>
                            </>
                          )}
                        </span>
                      </div>
                      <p className="mt-0.5 max-w-[65ch] leading-relaxed text-text-dim">{lane.note}</p>
                    </li>
                  );
                })}
              </ul>
              <div
                data-testid="system-detail"
                className="basis-full border-t border-border-strong pt-3 font-sans text-[13px]"
              >
                <div className="flex flex-wrap items-baseline gap-x-2.5">
                  <span className="text-sm font-medium text-text">{system.name}</span>
                  <span className="text-text-dim">{system.org}</span>
                </div>
                <p className="mt-1.5 max-w-[65ch] leading-relaxed text-text">{system.pattern}</p>
                {citation && (
                  <div className="mt-1.5">
                    <a
                      data-brand-control-id="control:link-focus"
                      href={citation.url}
                      target="_blank"
                      rel="noopener"
                      className={STAGE_LINK}
                    >
                      Source: {citation.label}
                    </a>
                  </div>
                )}
              </div>
              <ChartDescription
                id={descriptionId}
                form="state"
                summary="Current timescale playhead"
                description={`${system.name} by ${system.org} at playhead ${playhead} ms of ${HORIZON_MS} ms has ${system.lanes.length} timescale lanes with ${updatesFired} ${updatesFired === 1 ? 'update' : 'updates'} fired; the ${fastest.rate}${fastest.disclosed ? '' : ' (schematic)'} ${fastest.label} lane ticks ${ratioText} times${fastest.disclosed && slowest.disclosed ? '' : ' (schematic)'} during one ${slowest.label} update ${updateRatePhrase(slowest)}${slowest.disclosed ? '' : ' (schematic)'}.`}
                states={[
                  { label: 'system', value: system.name },
                  { label: 'playhead', value: `${playhead} ms` },
                  { label: 'lanes', value: String(system.lanes.length) },
                  { label: 'updates fired', value: String(updatesFired) },
                ]}
              />
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${height}`}
            aria-label={`Schematic timescale lanes for ${system.name} by ${system.org}. Four drawn lanes combine reported output rates with illustrative cadences and a task-instruction initial condition. The playhead is at ${playhead} of ${HORIZON_MS} milliseconds; lanes light up only when their own update rate has elapsed.`}
            aria-describedby={descriptionId}
          >
            {/* The playhead breaks at each lane-label row so it never runs
                through a label, and sits under the ticks so an update
                firing at the playhead stays visible on top of it. */}
            <g data-chart-mark="playhead" data-chart-role="highlight">
              {system.lanes.map((lane, i) => {
                const cy = laneTop(i) + LINE_DY;
                const last = i === system.lanes.length - 1;
                return (
                  <line
                    key={lane.id}
                    x1={x(playhead)}
                    x2={x(playhead)}
                    y1={cy - PLAYHEAD_HALF}
                    y2={last ? axisY + CHART_STROKE.tickLength : cy + PLAYHEAD_HALF}
                    stroke={highlight}
                    strokeWidth={CHART_STROKE.trace}
                  />
                );
              })}
            </g>

            {/* Lane baselines and update ticks. */}
            {system.lanes.map((lane, i) => {
              const cy = laneTop(i) + LINE_DY;
              const ticks = displayTicks(lane);
              const firedTicks = ticks.filter((t) => t <= playhead);
              const pendingTicks = ticks.filter((t) => t > playhead);
              return (
                <g key={lane.id} data-lane={lane.id}>
                  <line
                    x1={PLOT.left}
                    x2={PLOT.right}
                    y1={cy}
                    y2={cy}
                    stroke={CHART_STRUCTURE.axes}
                    strokeOpacity={CHART_STRUCTURE.axesOpacity}
                    strokeWidth={CHART_STROKE.structure}
                  />
                  <g data-series="pending">
                    {pendingTicks.map((t) => (
                      <line
                        key={t}
                        x1={x(t)}
                        x2={x(t)}
                        y1={cy - PENDING_HALF}
                        y2={cy + PENDING_HALF}
                        fill="none"
                        stroke={CHART_STRUCTURE.axes}
                        strokeOpacity={CHART_STRUCTURE.axesOpacity}
                        strokeWidth={CHART_STROKE.structure}
                        strokeDasharray={PENDING_DASH}
                      />
                    ))}
                  </g>
                  <g data-series="fired">
                    {firedTicks.map((t) => (
                      <line
                        key={t}
                        x1={x(t)}
                        x2={x(t)}
                        y1={cy - FIRED_HALF}
                        y2={cy + FIRED_HALF}
                        fill="none"
                        stroke={fired}
                        strokeWidth={CHART_STROKE.trace}
                      />
                    ))}
                  </g>
                </g>
              );
            })}

            {/* Time axis. The end labels anchor inward so the viewBox never clips them. */}
            <line
              x1={PLOT.left}
              x2={PLOT.right}
              y1={axisY}
              y2={axisY}
              stroke={CHART_STRUCTURE.axes}
              strokeOpacity={CHART_STRUCTURE.axesOpacity}
              strokeWidth={CHART_STROKE.structure}
            />
            {AXIS_TICKS.map((t) => (
              <g key={t}>
                <line
                  x1={x(t)}
                  x2={x(t)}
                  y1={axisY}
                  y2={axisY + CHART_STROKE.tickLength}
                  stroke={CHART_STRUCTURE.axes}
                  strokeOpacity={CHART_STRUCTURE.axesOpacity}
                  strokeWidth={CHART_STROKE.structure}
                />
                <text
                  data-scene-tick=""
                  x={x(t)}
                  y={tickBaseline}
                  textAnchor={t === HORIZON_MS ? 'end' : t === 0 ? 'start' : 'middle'}
                  fontSize={CHART_TYPE.tickPx}
                  fill={CHART_STRUCTURE.labelSecondary}
                >
                  {t === HORIZON_MS ? `${t} ms` : String(t)}
                </text>
              </g>
            ))}

            {/* Lane labels sit above their lines, in the playhead's gaps. */}
            {system.lanes.map((lane, i) => {
              const baseline = laneTop(i) + LABEL_DY;
              return (
                <g key={lane.id}>
                  <text
                    data-scene-axis=""
                    x={PLOT.left}
                    y={baseline}
                    fontSize={CHART_TYPE.axisPx}
                    fill={CHART_STRUCTURE.label}
                  >
                    {lane.label}
                  </text>
                  <text
                    data-scene-tick=""
                    x={PLOT.right}
                    y={baseline}
                    textAnchor="end"
                    fontSize={CHART_TYPE.tickPx}
                    fill={CHART_STRUCTURE.labelSecondary}
                  >
                    {lane.disclosed ? lane.rate : `${lane.rate}, schematic`}
                  </text>
                </g>
              );
            })}
          </PlotStage>
        </FigureStage>
      }
      caption="Fast control lanes fire many updates while slower planning lanes hold a single decision."
      source="Illustrative schedule: rates as reported where disclosed, assumed cadences elsewhere, one task instruction at t = 0."
    />
  );
}
