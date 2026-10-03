'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PlotStage,
  PresetGroup,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import { usePrefersReducedMotion } from '@/components/motion/use-reduced-motion';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
import {
  HIERARCHY_SYSTEMS,
  HORIZON_MS,
  MAX_DISPLAY_TICKS,
  displayTicks,
  fastestLane,
  laneTickRatio,
  lastUpdateAt,
  plainRate,
  slowestPeriodicLane,
  updateRatePhrase,
  updateCountAt,
  type TimescaleSystem,
} from '@/lib/hierarchy-timescales';

/**
 * HierarchyTimescales: one wall-clock timeline per system, one lane per
 * level of its control hierarchy, slowest on top. The figure settles on
 * the end of the 2 seconds, so every lane has fired and the contrast is
 * the picture: a dense band of motor commands under a plan that changed
 * once or twice. "Play the 2 seconds" replays the clock on request; the
 * playhead slider and per-lane counters sit in "Adjust more". System
 * presets (π0.5, Gemini Robotics 1.5, Helix 02, GO-2) swap the lanes.
 *
 * The event schedule is schematic. Some output rates are source-reported;
 * other cadences, the instruction pulse, and additional drawing lanes are
 * local assumptions, not separately disclosed control modules.
 *
 * Interactive contract: deterministic render, native range slider (keyboard
 * arrows step the playhead), system selector + reset controls, a replay
 * that only runs when the reader asks and jumps to the end under reduced
 * motion. Every system has four lanes, so a system switch never changes the
 * stage height.
 */
type HierarchyTimescalesProps = {
  /** Initially selected system id. Default 'pi05'. */
  defaultSystem?: string;
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;
const PLOT = { left: 8, right: 332 };
const TOP = 4;
const LANE_PITCH = 40;
/** Lane label baseline and lane line, measured from the top of each lane block. */
const LABEL_DY = 14;
const LINE_DY = 29;
const ICON = 14;
const LABEL_X = PLOT.left + ICON + 6;
const FIRED_HALF = 6;
const PLAYHEAD_HALF = 9;
/** A pending update is a short broken tick, so it differs from a fired one without its hue. */
const PENDING_HALF = 4;
const PENDING_DASH = '1.5 1';
const PLAY_MS = 2400;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function x(tMs: number): number {
  return f(PLOT.left + (tMs / HORIZON_MS) * (PLOT.right - PLOT.left));
}

const laneTop = (index: number) => TOP + index * LANE_PITCH;

const AXIS_TICKS: Array<[number, string]> = [
  [0, '0'],
  [1000, '1 second'],
  [HORIZON_MS, '2 seconds'],
];

/**
 * One small line icon per level, slowest first: the spoken task, the next
 * step as a checklist, a short plan of moves, and the motors as a gear.
 */
const LANE_ICONS: ReactNode[] = [
  <path key="task" d="M1.5 2.5h11v7h-6l-3 3v-3h-2z" />,
  <path key="step" d="M1.5 3l1.5 1.5 2.5-2.5M7.5 3.5h5M1.5 8l1.5 1.5 2.5-2.5M7.5 8.5h5" />,
  <path key="plan" d="M1.5 11c2-6 5-8 9-8M8 1.5l2.5 1.5-1.5 2.5" />,
  <g key="gear">
    <circle cx={7} cy={7} r={2.5} />
    <path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.8 2.8l1.4 1.4M9.8 9.8l1.4 1.4M2.8 11.2l1.4-1.4M9.8 4.2l1.4-1.4" />
  </g>,
];

const timesWord = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

export function HierarchyTimescales({
  defaultSystem = 'pi05',
  className,
}: HierarchyTimescalesProps) {
  const descriptionId = `${useId()}-description`;
  const [systemId, setSystemId] = useState(defaultSystem);
  const [playhead, setPlayhead] = useState(HORIZON_MS);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const frame = useRef<number | null>(null);

  const system: TimescaleSystem =
    HIERARCHY_SYSTEMS.find((s) => s.id === systemId) ?? HIERARCHY_SYSTEMS[0];
  const citationFor = useCitationLookup();
  const citation = citationFor(system.citationId);
  const axisY = TOP + system.lanes.length * LANE_PITCH + 6;
  const tickBaseline = axisY + CHART_STROKE.tickLength + CHART_TYPE.tickPx + 3;
  const noteY = tickBaseline + 20;
  const height = noteY + CHART_TYPE.labelPx * 1.3 + 8;
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
  const fastCount = updateCountAt(fastest, HORIZON_MS);
  const slowCount = updateCountAt(slowest, HORIZON_MS);
  const fired = roleColour('action');
  const highlight = roleColour('highlight');

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  function stop() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setPlaying(false);
  }

  function play() {
    stop();
    if (reducedMotion) {
      setPlayhead(HORIZON_MS);
      return;
    }
    setPlaying(true);
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / PLAY_MS);
      setPlayhead(Math.round((progress * HORIZON_MS) / 20) * 20);
      if (progress < 1) {
        frame.current = requestAnimationFrame(step);
      } else {
        frame.current = null;
        setPlaying(false);
      }
    };
    frame.current = requestAnimationFrame(step);
  }

  function reset() {
    stop();
    setSystemId(defaultSystem);
    setPlayhead(HORIZON_MS);
  }

  const note = [
    `About ${fastCount.toLocaleString('en-US')} ${fastest.plain.toLowerCase()} while`,
    `the plan above changes ${timesWord(slowCount)}`,
  ];

  return (
    <InstrumentFigure
      figureId="hierarchy-timescales"
      className={className}
      kicker="Hierarchical control"
      heading="Slow decisions on top, fast motor commands underneath"
      controls={
        <>
          <PresetGroup<string>
            label="Robot system"
            presets={HIERARCHY_SYSTEMS.map((s) => ({ id: s.id, label: s.name }))}
            value={system.id}
            onChange={(id) => {
              stop();
              setSystemId(id);
              setPlayhead(HORIZON_MS);
            }}
          />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-testid="hierarchy-play"
            onClick={() => (playing ? stop() : play())}
            className={`${INSTRUMENT_SECONDARY_CONTROL_CLASS} self-end`}
          >
            {playing ? 'Pause' : 'Play the 2 seconds'}
          </button>
        </>
      }
      adjust={
        <>
          <ControlField>
            <ControlLabel
              htmlFor="hierarchy-playhead"
              value={
                <span data-testid="playhead-readout" aria-live="polite">
                  t = {playhead} ms
                </span>
              }
            >
              Point in the 2 seconds
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
              onChange={(e) => {
                stop();
                setPlayhead(Number(e.target.value));
              }}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          <p data-hierarchy-key="" className="m-0! font-sans text-[13px] text-text-dim">
            A full tick is an update fired; a short broken tick is an update pending, still
            ahead of the playhead.
          </p>
          {/* Important margins and padding, because the unlayered `.prose`
              list rules otherwise indent the rows. */}
          <ul className="m-0! grid list-none gap-3 p-0! font-sans text-[13px]">
            {system.lanes.map((lane) => {
              const last = lastUpdateAt(lane, playhead);
              const count = updateCountAt(lane, playhead);
              return (
                <li key={lane.id} data-testid={`lane-row-${lane.id}`} className="my-0! p-0!">
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
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <div data-testid="system-detail" className="basis-full font-sans text-sm leading-snug">
                <p className="m-0! max-w-[65ch] text-text">
                  <span className="font-medium">{system.name}</span>{' '}
                  <span className="text-text-dim">({system.org})</span>: {system.plainPattern}
                </p>
                {citation && (
                  <a
                    data-brand-control-id="control:link-focus"
                    href={citation.url}
                    target="_blank"
                    rel="noopener"
                    className="underline-offset-2"
                  >
                    Source: {citation.label}
                  </a>
                )}
              </div>
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${f(height)}`}
            aria-label={`Schematic timescale lanes for ${system.name} by ${system.org}. Four drawn lanes combine reported output rates with illustrative cadences and a task-instruction initial condition. The playhead is at ${playhead} of ${HORIZON_MS} milliseconds; lanes light up only when their own update rate has elapsed.`}
            aria-describedby={descriptionId}
          >
            {/* At settle the clock has run out and every lane has fired, so
                the playhead only appears while the 2 seconds replay or the
                reader scrubs. It breaks at each lane-label row and sits under
                the ticks so an update firing at the playhead stays on top. */}
            {playhead < HORIZON_MS ? (
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
            ) : null}

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
            {AXIS_TICKS.map(([t, label]) => (
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
                  {label}
                </text>
              </g>
            ))}

            {/* Lane names sit above their lines, in the playhead's gaps. */}
            {system.lanes.map((lane, i) => {
              const baseline = laneTop(i) + LABEL_DY;
              return (
                <g key={lane.id}>
                  <g
                    aria-hidden="true"
                    transform={`translate(${PLOT.left} ${baseline - ICON + 2})`}
                    fill="none"
                    stroke={CHART_STRUCTURE.label}
                    strokeWidth={1.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {LANE_ICONS[i] ?? LANE_ICONS[LANE_ICONS.length - 1]}
                  </g>
                  <text
                    data-scene-axis=""
                    x={LABEL_X}
                    y={baseline}
                    fontSize={CHART_TYPE.axisPx}
                    fill={CHART_STRUCTURE.label}
                  >
                    {lane.plain}
                  </text>
                  <text
                    data-scene-tick=""
                    x={PLOT.right}
                    y={baseline}
                    textAnchor="end"
                    fontSize={CHART_TYPE.tickPx}
                    fill={CHART_STRUCTURE.labelSecondary}
                  >
                    {plainRate(lane)}
                  </text>
                </g>
              );
            })}

            {playhead === HORIZON_MS ? <StageAnnotation x={PLOT.left} y={noteY} lines={note} /> : null}
          </PlotStage>
        </FigureStage>
      }
      caption="Like a person, the robot keeps one goal in mind, updates its next step now and then, and adjusts its motors constantly."
      method={
        <>
          <p>
            Each row is one level of the robot&apos;s control hierarchy, slowest at the top, drawn on
            one 2-second clock. A tick marks an update: a new instruction, a new subtask, a new
            chunk of actions, a new motor command. {system.name} ({system.org}): {system.pattern}
          </p>
          <p>
            Some rates are stated by the source; the rest are drawn. A rate marked
            &ldquo;Schematic&rdquo; in &ldquo;Adjust more&rdquo; is a local drawing assumption, and
            so is the single task instruction at t = 0. The fastest lane, {fastest.label} at{' '}
            {fastest.rate}, ticks {ratioText} times during one {slowest.label} update{' '}
            {updateRatePhrase(slowest)}. A lane with more than {MAX_DISPLAY_TICKS} updates in the 2
            seconds is drawn with evenly spaced ticks so the marks stay apart; its counts in
            &ldquo;Adjust more&rdquo; are the full ones.
          </p>
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
      source="Illustrative schedule: rates as the sources report them where stated, drawn elsewhere; one task instruction at the start."
    />
  );
}
