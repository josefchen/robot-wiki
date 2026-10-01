'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_VIEW_WIDTH,
  ConstraintHatch,
  DirectLabel,
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
  MODES,
  POSITION_UNCERTAINTY_M,
  REACTION_TIME_S,
  ROBOT_DECELERATION_M_PER_S2,
  ROBOT_SPEED_RANGE,
  WORKCELL_SEPARATION_M,
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
 * CollaborativeOperationModes: one workcell drawn four ways, once per
 * collaborative operation mode, with the mode's own constraint computed
 * live rather than described.
 *
 * The contact-force limit and its label come from lib/force-limits through
 * lib/safety-modes, the same module the impedance lab on /classical/control
 * renders, so the two pages cannot drift apart (VAL-FRONT-029).
 *
 * The arm is drawn at the computed reach rather than at the slider value, so
 * a reader sees the protective distance overrun the cell before the verdict
 * says so. Nothing animates, so the figure is reduced-motion safe as drawn.
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 126;
const CELL_LEFT = 12;
const CELL_RIGHT = WIDTH - 12;
/** Baseline of the stage headline naming what the current mode constrains. */
const HEADLINE_Y = 20;
const BAND_TOP = 28;
const FLOOR_Y = 100;
const FLOOR_LABEL_Y = 117;
/** Metres of workcell drawn across the plotted width. */
const CELL_SPAN_M = 2.4;

/** Round rendered geometry so server HTML and hydrated DOM agree. */
const f = (v: number) => Number(v.toFixed(2));

const pxPerM = (CELL_RIGHT - CELL_LEFT) / CELL_SPAN_M;
/** Robot base at the left wall; the operator stands at the drawn distance. */
const ROBOT_BASE_X = CELL_LEFT + 22;
const HUMAN_X = f(ROBOT_BASE_X + WORKCELL_SEPARATION_M * pxPerM);

const ROBOT = roleColour('state');
const OPERATOR = CHART_STRUCTURE.label;

/**
 * A halted arm is drawn broken as well as labelled, so a reader who cannot
 * see the hue can still tell a moving arm from a stopped one.
 */
function RobotGlyph({ x, stopped }: { x: number; stopped: boolean }) {
  const elbowX = f(ROBOT_BASE_X + (x - ROBOT_BASE_X) * 0.5);
  return (
    <g data-chart-mark="robot" data-chart-role="state">
      <rect
        x={f(ROBOT_BASE_X - 14)}
        y={FLOOR_Y - 12}
        width={28}
        height={12}
        fill="none"
        stroke={ROBOT}
        strokeWidth={CHART_STROKE.reference}
      />
      <polyline
        points={`${ROBOT_BASE_X},${FLOOR_Y - 12} ${elbowX},${FLOOR_Y - 58} ${f(x)},${FLOOR_Y - 34}`}
        fill="none"
        stroke={ROBOT}
        strokeWidth={CHART_STROKE.trace}
        strokeDasharray={stopped ? CHART_STROKE.dash : undefined}
        strokeLinejoin="round"
      />
      <circle
        cx={f(x)}
        cy={FLOOR_Y - 34}
        r={stopped ? 5 : 4}
        fill={stopped ? 'none' : ROBOT}
        stroke={ROBOT}
        strokeWidth={CHART_STROKE.reference}
      />
    </g>
  );
}

function HumanGlyph({ x }: { x: number }) {
  const stroke = { stroke: OPERATOR, strokeWidth: CHART_STROKE.reference };
  return (
    <g data-chart-mark="operator">
      <circle cx={f(x)} cy={FLOOR_Y - 52} r={6} fill="none" {...stroke} />
      <line x1={f(x)} y1={FLOOR_Y - 46} x2={f(x)} y2={FLOOR_Y - 20} {...stroke} />
      <line x1={f(x - 8)} y1={FLOOR_Y - 38} x2={f(x + 8)} y2={FLOOR_Y - 38} {...stroke} />
      <line x1={f(x)} y1={FLOOR_Y - 20} x2={f(x - 7)} y2={FLOOR_Y} {...stroke} />
      <line x1={f(x)} y1={FLOOR_Y - 20} x2={f(x + 7)} y2={FLOOR_Y} {...stroke} />
    </g>
  );
}

/** One named value in the readout band; the value carries the test id. */
function Reading({
  label,
  value,
  testId,
  wide = false,
}: {
  label: string;
  value: string;
  testId: string;
  wide?: boolean;
}) {
  return (
    <span className={cx('grid content-start gap-0.5', wide && 'col-span-full')}>
      <span className="text-xs text-text-dim">{label}</span>
      <span data-testid={testId} className="text-text">
        {value}
      </span>
    </span>
  );
}

/**
 * The teaching choices behind every number the figure computes. They render
 * after the frame, as prose, because the frame allows nothing after the stage
 * except the caption and one source line.
 */
function ModelAssumptions() {
  return (
    <details className="mb-5">
      <summary
        data-brand-control-id="control:secondary-action"
        className="inline-flex min-h-6 cursor-pointer select-none items-center font-sans text-sm text-text-dim underline decoration-border-strong decoration-1 underline-offset-4 transition-colors hover:text-text">
        Model assumptions
      </summary>
      <p className="mt-2 mb-0!">
        Separation model: S = v_H(T_R + T_S) + v_R T_R + B + (C + Z_R + Z_S),
        the rough early-draft approximation restated by Marvel and Norcross.
        Teaching choices: C = {formatMetres(INTRUSION_MARGIN_M)}, selected at the
        normal-multibeam minimum, not a universal margin (the paper also gives
        1200 mm for a single-height beam and a conditional two-handed-control
        reduction to 250 mm); constant robot deceleration{' '}
        {ROBOT_DECELERATION_M_PER_S2} m/s², reusing an acceleration example rather
        than a measured braking profile; robot default{' '}
        {formatSpeed(DEFAULT_ROBOT_SPEED_M_S)} and operator default{' '}
        {formatSpeed(DEFAULT_HUMAN_SPEED_M_S)}, with both sliders choosing 0 to 2 m/s
        in 0.05 m/s steps. The paper records both 1600 and 2000 mm/s, qualifies
        the 1600 option by separation greater than 500 mm, allows direct
        measurement, and later urges considering 2000 mm/s; this choice does
        not resolve that context. Also chosen: T_R = {REACTION_TIME_S} s (a
        100 Hz period is 0.01 s, not this delay), Z_R + Z_S ={' '}
        {formatMetres(POSITION_UNCERTAINTY_M)}, workcell separation{' '}
        {formatMetres(WORKCELL_SEPARATION_M)}, and an energy-balance contact
        model with 4 kg effective mass and 25 kN/m stiffness. The existing
        force-limit label is {CONTACT_LIMIT_LABEL}. These calculations are
        illustrative, not measurements or safety certification.
      </p>
    </details>
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

  /**
   * Where the arm may reach. Under separation monitoring the arm is held
   * back to the protective distance and stops outright when that distance
   * has already overrun the operator's position; the other modes have no
   * distance rule, so the arm reaches its natural extent.
   */
  const stopped = modeId === 'speed-separation' && !outcome.separationSatisfied;
  const reachM =
    modeId === 'speed-separation'
      ? Math.max(0, WORKCELL_SEPARATION_M - separation)
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

  /**
   * The one stage line naming what binds under the current mode. It takes
   * the constraint colour when it names the hatched band or an overrun limit.
   */
  const headline =
    mode.readout === 'separation'
      ? { text: `protective separation ${formatMetres(separation)}`, constraint: true }
      : mode.readout === 'force'
        ? { text: `peak contact force ${formatForce(force)}`, constraint: !outcome.forceSatisfied }
        : { text: 'no autonomous motion beside the operator', constraint: false };

  const figure = (
    <InstrumentFigure
      figureId="collaborative-operation-modes"
      className={className}
      heading="One workcell under four collaborative modes"
      controls={
        <>
          <div
            role="group"
            aria-label="Collaborative operation mode"
            className="flex flex-wrap items-center gap-1"
          >
            <span className="font-sans text-[13px] text-text-dim">Mode</span>
            {MODES.map((m) => (
              <button
                data-brand-control-id="control:selection"
                key={m.id}
                type="button"
                aria-pressed={modeId === m.id}
                onClick={() => setModeId(m.id)}
                data-testid={`mode-${m.id}`}
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {m.short}
              </button>
            ))}
          </div>
          <InstrumentReset onClick={reset} />
          <div className="grid w-full basis-full gap-x-6 gap-y-3 sm:grid-cols-2">
            <ControlField className="content-start">
              <ControlLabel htmlFor="safety-robot-speed" value={formatSpeed(robotSpeed)}>
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
                aria-label={`Robot speed, currently ${formatSpeed(robotSpeed)}`}
                className={INSTRUMENT_SLIDER_CLASS}
              />
            </ControlField>
            <ControlField className="content-start">
              <ControlLabel htmlFor="safety-human-speed" value={formatSpeed(humanSpeed)}>
                Operator approach
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
                aria-label={`Operator approach speed, currently ${formatSpeed(humanSpeed)}`}
                className={INSTRUMENT_SLIDER_CLASS}
              />
            </ControlField>
          </div>
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentReadout className="grid basis-full grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
                {mode.readout === 'separation' && (
                  <>
                    <Reading label="Protective separation" testId="separation-readout" value={formatMetres(separation)} />
                    <Reading label="Operator travel" testId="term-human" value={formatMetres(terms.humanTravelM)} />
                    <Reading label="Robot travel before braking" testId="term-reaction" value={formatMetres(terms.robotReactionM)} />
                    <Reading label="Braking" testId="term-braking" value={formatMetres(terms.brakingM)} />
                    <Reading label="Margin and uncertainty" testId="term-margin" value={formatMetres(terms.marginM)} />
                  </>
                )}
                {mode.readout === 'force' && (
                  <>
                    <Reading label="Peak transient contact force" testId="force-readout" value={formatForce(force)} />
                    <Reading label="Limit" testId="force-limit-readout" value={formatForce(CONTACT_LIMIT_N)} />
                  </>
                )}
                {mode.readout === 'stated' && (
                  <Reading label="Constraint" testId="stated-readout" value="no distance or force budget in this mode" wide />
                )}
              </InstrumentReadout>
              {mode.readout === 'force' && (
                <div data-testid="force-limit-label" className="basis-full font-sans text-xs leading-snug text-text-dim">
                  {CONTACT_LIMIT_LABEL}
                </div>
              )}
              <div data-testid="mode-constraint" className="basis-full font-sans text-[13px] leading-snug text-text-dim">
                <span className="font-medium text-text">{mode.name}.</span> {mode.constraint}
              </div>
              <div data-testid="mode-verdict" className="basis-full font-sans text-[13px] leading-snug text-text">
                {outcome.summary}
              </div>
              <ChartDescription
                id={descriptionId}
                className="basis-full"
                form="state"
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
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Workcell with a robot at the left wall and an operator ${formatMetres(
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
              <line x1={CELL_LEFT} y1={BAND_TOP} x2={CELL_LEFT} y2={FLOOR_Y} strokeDasharray={CHART_STROKE.dash} />
              <line x1={CELL_RIGHT} y1={BAND_TOP} x2={CELL_RIGHT} y2={FLOOR_Y} strokeDasharray={CHART_STROKE.dash} />
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
              </g>
            )}

            <RobotGlyph x={armX} stopped={stopped} />
            <HumanGlyph x={HUMAN_X} />

            <DirectLabel
              x={mode.readout === 'stated' ? CELL_LEFT + 4 : HUMAN_X}
              y={HEADLINE_Y}
              anchor={mode.readout === 'stated' ? 'start' : 'end'}
              role={headline.constraint ? 'constraint' : undefined}
            >
              {headline.text}
            </DirectLabel>
            <DirectLabel x={ROBOT_BASE_X} y={FLOOR_LABEL_Y} anchor="middle">
              robot
            </DirectLabel>
            {stopped && (
              <g data-testid="stopped-label">
                <DirectLabel x={ROBOT_BASE_X + 26} y={FLOOR_LABEL_Y} role="constraint">
                  safety-rated stop
                </DirectLabel>
              </g>
            )}
            <DirectLabel x={HUMAN_X} y={FLOOR_LABEL_Y} anchor="middle">
              operator
            </DirectLabel>
          </PlotStage>
        </FigureStage>
      }
      caption="Separation monitoring needs more room as the robot speeds up; force limiting allows contact below a force cap."
      source="Separation formula as restated by Marvel and Norcross; margins, speeds and the contact model are illustrative teaching choices."
    />
  );

  return (
    <>
      {figure}
      <ModelAssumptions />
    </>
  );
}
