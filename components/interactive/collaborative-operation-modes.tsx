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
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_VIEW_WIDTH,
  ConstraintHatch,
  DirectLabel,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
import {
  CONTACT_LIMIT_LABEL,
  CONTACT_LIMIT_N,
  DEFAULT_HUMAN_SPEED_M_S,
  DEFAULT_MODE,
  DEFAULT_ROBOT_SPEED_M_S,
  HUMAN_SPEED_RANGE,
  INTRUSION_MARGIN_M,
  POSITION_UNCERTAINTY_M,
  REACTION_TIME_S,
  ROBOT_DECELERATION_M_PER_S2,
  ROBOT_SPEED_RANGE,
  WORKCELL_SEPARATION_M,
  forceLimitedSpeedMs,
  formatForce,
  formatMetres,
  formatSpeed,
  modeById,
  peakContactForceN,
  protectiveSeparationM,
  separationTerms,
  verdict,
  type ModeId,
} from '@/lib/safety-modes';
import { cx } from '@/lib/utils';

/**
 * CollaborativeOperationModes: one robot arm beside one person, drawn four
 * ways, once per collaborative operation mode, with the mode's own
 * constraint computed live rather than described.
 *
 * The contact-force limit and its label come from lib/force-limits through
 * lib/safety-modes, the same module the impedance lab on /classical/control
 * renders, so the two pages cannot drift apart (VAL-FRONT-029).
 *
 * The main view speaks in words: the gap the robot must keep, split into
 * its four parts under the drawing, or how hard a bump would push against
 * the safe limit. The formula, the exact readouts in metres and newtons,
 * the per-mode explanation and the teaching choices are in "How this was
 * made". The arm is drawn at the computed reach rather than at the slider
 * value, so a reader sees the gap overrun the cell before the readout says
 * so. Nothing animates, so the figure is reduced-motion safe as drawn.
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 150;
const CELL_LEFT = 12;
const CELL_RIGHT = WIDTH - 12;
const BAND_TOP = 52;
const FLOOR_Y = 128;
const FLOOR_LABEL_Y = 145;
/** Metres of workcell drawn across the plotted width. */
const CELL_SPAN_M = 2.4;

/** Round rendered geometry so server HTML and hydrated DOM agree. */
const f = (v: number) => Number(v.toFixed(2));

const pxPerM = (CELL_RIGHT - CELL_LEFT) / CELL_SPAN_M;
/** Robot base at the left wall; the person stands at the drawn distance. */
const ROBOT_BASE_X = CELL_LEFT + 22;
const HUMAN_X = f(ROBOT_BASE_X + WORKCELL_SEPARATION_M * pxPerM);

const ROBOT = roleColour('state');
const PERSON = CHART_STRUCTURE.label;

const MODE_PRESETS: ReadonlyArray<{ id: ModeId; label: string }> = [
  { id: 'monitored-stop', label: 'Stops when you step in' },
  { id: 'hand-guiding', label: 'You guide it by hand' },
  { id: 'speed-separation', label: 'Keeps its distance' },
  { id: 'power-force', label: 'Gentle enough to bump' },
];

/** "1.4 metres" style: the main view's rounded distance in words. */
function metresWords(m: number): string {
  const rounded = Number(m.toFixed(1));
  return `${rounded} ${rounded === 1 ? 'metre' : 'metres'}`;
}

/** A speed in words, with the two defaults glossed as walking paces. */
function speedWords(v: number, defaultGloss?: { at: number; gloss: string }): string {
  if (v === 0) return 'standing still';
  const value = Number(v.toFixed(2));
  const words = `${value} ${value === 1 ? 'metre' : 'metres'} a second`;
  return defaultGloss && v === defaultGloss.at ? `${words}, ${defaultGloss.gloss}` : words;
}

/**
 * An industrial arm: a base, a shoulder, two links and a two-finger
 * gripper. A halted arm is drawn dashed as well as labelled, so a reader
 * who cannot see the hue can still tell a moving arm from a stopped one.
 */
function RobotArm({ x, stopped }: { x: number; stopped: boolean }) {
  const shoulder: [number, number] = [ROBOT_BASE_X, FLOOR_Y - 22];
  const wrist: [number, number] = [f(x), FLOOR_Y - 44];
  const elbow: [number, number] = [f(ROBOT_BASE_X + (x - ROBOT_BASE_X) * 0.45), FLOOR_Y - 84];
  const dash = stopped ? CHART_STROKE.dash : undefined;
  return (
    <g data-chart-mark="robot" data-chart-role="state" fill="none" stroke={ROBOT} strokeLinejoin="round">
      <path
        d={`M${ROBOT_BASE_X - 15} ${FLOOR_Y} L${ROBOT_BASE_X - 10} ${FLOOR_Y - 14} H${ROBOT_BASE_X + 10} L${ROBOT_BASE_X + 15} ${FLOOR_Y} Z`}
        strokeWidth={CHART_STROKE.reference}
      />
      <line x1={ROBOT_BASE_X} y1={FLOOR_Y - 14} x2={shoulder[0]} y2={shoulder[1]} strokeWidth={CHART_STROKE.trace * 2} />
      <polyline
        points={`${shoulder[0]},${shoulder[1]} ${elbow[0]},${elbow[1]} ${wrist[0]},${wrist[1]}`}
        strokeWidth={CHART_STROKE.trace * 2.2}
        strokeDasharray={dash}
        strokeLinecap="round"
      />
      <circle cx={shoulder[0]} cy={shoulder[1]} r={4} strokeWidth={CHART_STROKE.reference} fill="var(--stage-surface, none)" />
      <circle cx={elbow[0]} cy={elbow[1]} r={4} strokeWidth={CHART_STROKE.reference} fill="var(--stage-surface, none)" />
      <path
        d={`M${wrist[0]} ${wrist[1]} V${wrist[1] + 6} M${wrist[0] - 6} ${wrist[1] + 6} H${wrist[0] + 6} M${wrist[0] - 6} ${wrist[1] + 6} V${wrist[1] + 15} M${wrist[0] + 6} ${wrist[1] + 6} V${wrist[1] + 15}`}
        strokeWidth={CHART_STROKE.reference}
        strokeDasharray={dash}
      />
    </g>
  );
}

/** A person mid-stride, walking toward the robot. */
function WalkingPerson({ x }: { x: number }) {
  const stroke = { stroke: PERSON, strokeWidth: CHART_STROKE.reference, fill: 'none' };
  const top = FLOOR_Y - 66;
  return (
    <g data-chart-mark="operator" strokeLinecap="round">
      <circle cx={f(x)} cy={top} r={7} {...stroke} />
      <line x1={f(x)} y1={top + 7} x2={f(x + 2)} y2={top + 36} {...stroke} />
      <path d={`M${f(x)} ${top + 14} L${f(x - 9)} ${top + 30} M${f(x)} ${top + 14} L${f(x + 9)} ${top + 28}`} {...stroke} />
      <path d={`M${f(x + 2)} ${top + 36} L${f(x - 9)} ${FLOOR_Y} M${f(x + 2)} ${top + 36} L${f(x + 12)} ${FLOOR_Y}`} {...stroke} />
    </g>
  );
}

const GAP_PARTS = [
  { key: 'humanTravelM', label: 'You walk in while it reacts', opacity: 1 },
  { key: 'robotReactionM', label: 'It keeps moving', opacity: 0.7 },
  { key: 'brakingM', label: 'Braking', opacity: 0.45 },
  { key: 'marginM', label: 'Safety margin', opacity: 0.25 },
] as const;

/** The gap drawn as one bar split into its four parts, labelled in words. */
function GapBar({ terms }: { terms: ReturnType<typeof separationTerms> }) {
  const constraint = roleColour('constraint');
  return (
    <div data-testid="gap-bar" className="px-3 pb-2 font-sans text-sm">
      <div className="flex h-3 w-full overflow-hidden rounded-xs" aria-hidden="true">
        {GAP_PARTS.map((part) => (
          <span
            key={part.key}
            style={{
              width: `${(terms[part.key] / terms.totalM) * 100}%`,
              backgroundColor: constraint,
              opacity: part.opacity,
            }}
            className="border-r border-[var(--stage-surface,transparent)] last:border-r-0"
          />
        ))}
      </div>
      <ul className="m-0! mt-1.5 grid list-none grid-cols-1 gap-x-4 gap-y-0.5 p-0! sm:grid-cols-2">
        {GAP_PARTS.map((part) => (
          <li key={part.key} className="m-0! flex items-center gap-1.5 text-text-dim">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-xs"
              style={{ backgroundColor: constraint, opacity: part.opacity }}
            />
            {part.label}: <span className="text-text">{terms[part.key].toFixed(2)} metres</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** How hard a bump would push, against the safe limit. */
function ForceBar({ force }: { force: number }) {
  const scale = Math.max(force, CONTACT_LIMIT_N) * 1.15;
  const over = force > CONTACT_LIMIT_N;
  return (
    <div data-testid="force-bar" className="px-3 pb-2 font-sans text-sm">
      <div className="relative h-3 w-full rounded-xs border border-border-strong" aria-hidden="true">
        <span
          className="absolute inset-y-0 left-0 rounded-xs"
          style={{
            width: `${(force / scale) * 100}%`,
            backgroundColor: over ? roleColour('constraint') : ROBOT,
          }}
        />
        <span
          className="absolute -inset-y-1 w-0.5 bg-text"
          style={{ left: `${(CONTACT_LIMIT_N / scale) * 100}%` }}
        />
      </div>
      <p className="m-0 mt-1.5 text-text-dim">
        Bump: <span className="text-text">about {Math.round(force)} newtons</span>. Safe limit
        (the line): <span className="text-text">{CONTACT_LIMIT_N} newtons</span>.
      </p>
    </div>
  );
}

/** The teaching choices behind every number the figure computes. */
function ModelAssumptions() {
  return (
    <p data-testid="model-assumptions">
      Separation model: S = v_H(T_R + T_S) + v_R T_R + B + (C + Z_R + Z_S), the rough
      early-draft approximation restated by Marvel and Norcross. Teaching choices: C ={' '}
      {formatMetres(INTRUSION_MARGIN_M)}, selected at the normal-multibeam minimum, not a
      universal margin (the paper also gives 1200 mm for a single-height beam and a conditional
      two-handed-control reduction to 250 mm); constant robot deceleration{' '}
      {ROBOT_DECELERATION_M_PER_S2} m/s², reusing an acceleration example rather than a measured
      braking profile; robot default {formatSpeed(DEFAULT_ROBOT_SPEED_M_S)} and operator default{' '}
      {formatSpeed(DEFAULT_HUMAN_SPEED_M_S)}, with both sliders choosing 0 to 2 m/s in 0.05 m/s
      steps. The paper records both 1600 and 2000 mm/s, qualifies the 1600 option by separation
      greater than 500 mm, allows direct measurement, and later urges considering 2000 mm/s; this
      choice does not resolve that context. Also chosen: T_R = {REACTION_TIME_S} s (a 100 Hz period
      is 0.01 s, not this delay), Z_R + Z_S = {formatMetres(POSITION_UNCERTAINTY_M)}, workcell
      separation {formatMetres(WORKCELL_SEPARATION_M)}, and an energy-balance contact model with 4
      kg effective mass and 25 kN/m stiffness. The existing force-limit label is{' '}
      {CONTACT_LIMIT_LABEL}. These calculations are illustrative, not measurements or safety
      certification.
    </p>
  );
}

/** One named value in the method's numbers list; the value carries the test id. */
function Reading({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <li className="m-0!">
      {label}: <span data-testid={testId}>{value}</span>
    </li>
  );
}

export function CollaborativeOperationModes({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const hatchId = `safety-separation-hatch-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [modeId, setModeId] = useState<ModeId>(DEFAULT_MODE);
  const [robotSpeed, setRobotSpeed] = useState(DEFAULT_ROBOT_SPEED_M_S);
  const [humanSpeed, setHumanSpeed] = useState(DEFAULT_HUMAN_SPEED_M_S);

  const mode = modeById(modeId);
  const terms = separationTerms(robotSpeed, humanSpeed);
  const separation = protectiveSeparationM(robotSpeed, humanSpeed);
  const force = peakContactForceN(robotSpeed);
  const outcome = verdict(robotSpeed, humanSpeed);
  const gentleSpeed = forceLimitedSpeedMs();

  /**
   * Where the arm may reach. Under separation monitoring the arm is held
   * back to the protective distance and stops outright when that distance
   * has already overrun the person's position. A monitored stop holds the
   * arm still while the person is in the cell. The other modes have no
   * distance rule, so the arm reaches its natural extent.
   */
  const stopped =
    (modeId === 'speed-separation' && !outcome.separationSatisfied) || modeId === 'monitored-stop';
  const reachM =
    modeId === 'speed-separation'
      ? Math.max(0, WORKCELL_SEPARATION_M - separation)
      : modeId === 'monitored-stop'
        ? WORKCELL_SEPARATION_M * 0.45
        : WORKCELL_SEPARATION_M - 0.35;
  const armX = f(ROBOT_BASE_X + Math.max(0.15, reachM) * pxPerM);
  const bandLeft = f(Math.max(CELL_LEFT, HUMAN_X - separation * pxPerM));

  const reset = () => {
    setModeId(DEFAULT_MODE);
    setRobotSpeed(DEFAULT_ROBOT_SPEED_M_S);
    setHumanSpeed(DEFAULT_HUMAN_SPEED_M_S);
  };

  const chartSummary =
    mode.readout === 'separation'
      ? `At ${formatSpeed(robotSpeed)} robot speed and ${formatSpeed(humanSpeed)} operator approach, the protective separation distance is ${formatMetres(separation)} against a ${formatMetres(WORKCELL_SEPARATION_M)} workcell: ${formatMetres(terms.humanTravelM)} of operator travel, ${formatMetres(terms.robotReactionM)} of robot travel before braking, ${formatMetres(terms.brakingM)} of braking, and ${formatMetres(terms.marginM)} of intrusion margin and position uncertainty.`
      : mode.readout === 'force'
        ? `At ${formatSpeed(robotSpeed)} robot speed the peak transient contact force is ${formatForce(force)} against the ${formatForce(CONTACT_LIMIT_N)} limit, so an impact with a 4 kg effective mass ${force <= CONTACT_LIMIT_N ? 'stays under' : 'exceeds'} the threshold while the ${formatMetres(separation)} separation distance the other continuous mode would need goes unused.`
        : `Under ${mode.name.toLowerCase()} the ${formatSpeed(robotSpeed)} robot speed and ${formatSpeed(humanSpeed)} operator approach set no distance and no force budget, because the mode permits no autonomous motion beside the operator: the ${formatMetres(separation)} separation and ${formatForce(force)} impact force are what the other two modes would have to hold.`;

  /** The one highlight note on the stage, naming what binds in this mode. */
  const note: { lines: string[]; target: [number, number]; x: number; anchor: 'start' | 'end' } =
    mode.readout === 'separation'
      ? outcome.separationSatisfied
        ? {
            lines: ['The robot must stay out of this zone,', `about ${metresWords(separation)} from you`],
            target: [bandLeft, BAND_TOP + 8],
            x: CELL_RIGHT,
            anchor: 'end',
          }
        : {
            lines: [`The gap needed, ${metresWords(separation)},`, 'is wider than the cell: it stops'],
            target: [bandLeft, BAND_TOP + 8],
            x: CELL_RIGHT,
            anchor: 'end',
          }
      : mode.readout === 'force'
        ? {
            lines: force <= CONTACT_LIMIT_N
              ? ['A bump here stays under', 'the safe limit, so touching is allowed']
              : ['A bump here would push too hard;', `below ${speedWords(Number(gentleSpeed.toFixed(1)))} it would not`],
            target: [armX, FLOOR_Y - 29],
            x: CELL_RIGHT,
            anchor: 'end',
          }
        : modeId === 'monitored-stop'
          ? {
              lines: ['It stands still while', 'you are inside the cell'],
              target: [armX, FLOOR_Y - 44],
              x: CELL_RIGHT,
              anchor: 'end',
            }
          : {
              lines: ['It moves only while', 'you push it by hand'],
              target: [armX, FLOOR_Y - 29],
              x: CELL_RIGHT,
              anchor: 'end',
            };

  const plainReadout =
    mode.readout === 'separation'
      ? outcome.separationSatisfied
        ? `At this speed the robot needs a gap of about ${metresWords(separation)}; you are ${metresWords(WORKCELL_SEPARATION_M)} away, so it keeps working.`
        : `At this speed the robot needs a gap of about ${metresWords(separation)}, more than the ${metresWords(WORKCELL_SEPARATION_M)} to you, so it stops.`
      : mode.readout === 'force'
        ? force <= CONTACT_LIMIT_N
          ? 'A bump at this speed stays under the safe limit, so the robot may touch you.'
          : 'A bump at this speed would push harder than the safe limit, so this mode is not allowed until the robot slows down.'
        : modeId === 'monitored-stop'
          ? 'The robot stands still while you are in the cell, so no gap or force limit applies.'
          : 'The robot moves only while you guide it, so no gap or force limit applies.';

  return (
    <InstrumentFigure
      figureId="collaborative-operation-modes"
      className={className}
      kicker="Collaborative robot safety"
      heading="A faster robot needs a bigger gap from people"
      controls={
        <>
          <PresetGroup<ModeId>
            label="How it keeps you safe"
            presets={MODE_PRESETS}
            value={modeId}
            onChange={setModeId}
            testId="mode"
          />
          <ControlField className="w-full basis-full content-start sm:max-w-sm">
            <ControlLabel
              htmlFor="safety-robot-speed"
              value={speedWords(robotSpeed, { at: DEFAULT_ROBOT_SPEED_M_S, gloss: 'a slow walk' })}
            >
              Robot speed
            </ControlLabel>
            <input
              id="safety-robot-speed"
              type="range"
              data-brand-control-id="control:input"
              min={ROBOT_SPEED_RANGE.min}
              max={ROBOT_SPEED_RANGE.max}
              step={ROBOT_SPEED_RANGE.step}
              value={robotSpeed}
              onChange={(e) => setRobotSpeed(Number(e.target.value))}
              aria-label={`Robot speed, currently ${speedWords(robotSpeed)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="slow" high="fast" />
          </ControlField>
        </>
      }
      adjust={
        <>
          <ControlField className="w-full basis-full content-start sm:max-w-sm">
            <ControlLabel
              htmlFor="safety-human-speed"
              value={speedWords(humanSpeed, { at: DEFAULT_HUMAN_SPEED_M_S, gloss: 'a brisk walk' })}
            >
              Your walking speed
            </ControlLabel>
            <input
              id="safety-human-speed"
              type="range"
              data-brand-control-id="control:input"
              min={HUMAN_SPEED_RANGE.min}
              max={HUMAN_SPEED_RANGE.max}
              step={HUMAN_SPEED_RANGE.step}
              value={humanSpeed}
              onChange={(e) => setHumanSpeed(Number(e.target.value))}
              aria-label={`Your walking speed (operator approach speed), currently ${speedWords(humanSpeed)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="standing still" high="a jog" />
          </ControlField>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentReadout data-testid="safety-plain-readout">{plainReadout}</InstrumentReadout>
              <StageStatus>illustrative</StageStatus>
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`A robot arm at the left and a person ${formatMetres(
              WORKCELL_SEPARATION_M,
            )} away, under ${mode.name.toLowerCase()}. Robot speed ${formatSpeed(
              robotSpeed,
            )}, operator approach ${formatSpeed(humanSpeed)}. ${
              mode.readout === 'separation'
                ? `Protective separation distance ${formatMetres(separation)}, ${
                    outcome.separationSatisfied ? 'inside' : 'overrunning'
                  } the cell.`
                : mode.readout === 'force'
                  ? `Peak transient contact force ${formatForce(force)} against a ${formatForce(
                      CONTACT_LIMIT_N,
                    )} limit.`
                  : 'No separation distance or contact force applies in this mode.'
            }`}
            aria-describedby={descriptionId}
          >
            <g
              stroke={CHART_STRUCTURE.axes}
              strokeOpacity={CHART_STRUCTURE.axesOpacity}
              strokeWidth={CHART_STROKE.structure}
            >
              <line x1={CELL_LEFT} y1={FLOOR_Y} x2={CELL_RIGHT} y2={FLOOR_Y} />
            </g>

            {mode.readout === 'separation' && (
              <g data-testid="separation-band">
                <ConstraintHatch
                  id={hatchId}
                  x={bandLeft}
                  y={BAND_TOP}
                  width={f(Math.max(0, HUMAN_X - bandLeft))}
                  height={FLOOR_Y - BAND_TOP}
                />
                <line
                  x1={bandLeft}
                  y1={BAND_TOP}
                  x2={bandLeft}
                  y2={FLOOR_Y}
                  stroke={roleColour('constraint')}
                  strokeWidth={CHART_STROKE.reference}
                />
              </g>
            )}

            <RobotArm x={armX} stopped={stopped} />
            <WalkingPerson x={HUMAN_X} />

            <StageAnnotation
              x={note.x}
              y={16}
              anchor={note.anchor}
              lines={note.lines}
              target={note.target}
              from={[note.target[0], 36]}
            />
            <DirectLabel x={ROBOT_BASE_X} y={FLOOR_LABEL_Y} anchor="middle">
              robot
            </DirectLabel>
            {stopped && (
              <g data-testid="stopped-label">
                <DirectLabel x={ROBOT_BASE_X + 22} y={FLOOR_LABEL_Y} role="constraint">
                  stopped
                </DirectLabel>
              </g>
            )}
            <DirectLabel x={HUMAN_X} y={FLOOR_LABEL_Y} anchor="middle">
              you
            </DirectLabel>
          </PlotStage>
          {mode.readout === 'separation' && <GapBar terms={terms} />}
          {mode.readout === 'force' && <ForceBar force={force} />}
        </FigureStage>
      }
      caption="Robots working beside people must either keep their distance or move gently enough that a bump stays under a safe force limit."
      method={
        <>
          <p data-testid="mode-constraint">
            <span className="font-medium text-text">{mode.name}.</span> {mode.constraint}
          </p>
          <p data-testid="mode-verdict">{outcome.summary}</p>
          <ul className="m-0! grid list-none gap-0.5 p-0!">
            {mode.readout === 'separation' && (
              <>
                <Reading label="Protective separation" testId="separation-readout" value={formatMetres(separation)} />
                <Reading label="Operator travel, v_H(T_R + T_S)" testId="term-human" value={formatMetres(terms.humanTravelM)} />
                <Reading label="Robot travel before braking, v_R T_R" testId="term-reaction" value={formatMetres(terms.robotReactionM)} />
                <Reading label="Braking, B" testId="term-braking" value={formatMetres(terms.brakingM)} />
                <Reading label="Margin and uncertainty, C + Z_R + Z_S" testId="term-margin" value={formatMetres(terms.marginM)} />
              </>
            )}
            {mode.readout === 'force' && (
              <>
                <Reading label="Peak transient contact force" testId="force-readout" value={formatForce(force)} />
                <Reading label="Limit" testId="force-limit-readout" value={formatForce(CONTACT_LIMIT_N)} />
                <Reading
                  label="Fastest speed that stays under the limit"
                  testId="force-limited-speed"
                  value={formatSpeed(gentleSpeed)}
                />
              </>
            )}
            {mode.readout === 'stated' && (
              <Reading label="Constraint" testId="stated-readout" value="no distance or force budget in this mode" />
            )}
          </ul>
          {mode.readout === 'force' && (
            <p data-testid="force-limit-label" className={cx('text-text-dim')}>
              {CONTACT_LIMIT_LABEL}
            </p>
          )}
          <p>
            &ldquo;Stops when you step in&rdquo; is a safety-rated monitored stop; &ldquo;You guide
            it by hand&rdquo; is hand guiding; &ldquo;Keeps its distance&rdquo; is speed and
            separation monitoring; &ldquo;Gentle enough to bump&rdquo; is power and force limiting.
            The hatched zone is the protective separation distance measured back from the person;
            the gap bar splits it into the formula&rsquo;s four terms. A safety-rated stop halts the
            arm when the zone reaches it.
          </p>
          <ModelAssumptions />
          <ChartDescription
            id={descriptionId}
            form="state"
            open
            summary="Current workcell settings"
            description={chartSummary}
            states={[
              { label: 'mode', value: mode.name },
              { label: 'robot speed', value: formatSpeed(robotSpeed) },
              { label: 'operator approach', value: formatSpeed(humanSpeed) },
              { label: 'protective separation', value: formatMetres(separation) },
              { label: 'peak contact force', value: formatForce(force) },
              { label: 'workcell separation', value: formatMetres(WORKCELL_SEPARATION_M) },
            ]}
          />
        </>
      }
      source="Separation formula as restated by Marvel and Norcross; margins, speeds and the contact model are illustrative teaching choices."
    />
  );
}
