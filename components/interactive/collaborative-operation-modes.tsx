'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui';
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
 * No existing interactive was reused, and the near misses are worth
 * naming. ThesisExplorer and MilestonesWatchlist are row-select-plus-
 * detail tables whose PATTERN would fit a standards matrix, but their
 * data models are theses and milestones; mounting either here would make
 * one component carry two unrelated schemas, which is the opposite of the
 * cross-mount consistency reuse exists to buy. What IS shared is the
 * thing that actually has to agree across pages: the contact-force limit
 * and its label come from lib/force-limits through lib/safety-modes, the
 * same module the impedance lab on /classical/control renders, so the two
 * pages cannot drift apart (VAL-FRONT-029).
 *
 * The teaching point of the geometry: the separation readout recomposes
 * from its four published terms as the sliders move, and the robot glyph
 * moves with the computed distance rather than with the slider, so a
 * reader can see the protective distance overrun the cell before the
 * verdict says so.
 *
 * Interactive contract: deterministic initial render (speed and
 * separation monitoring, 1.00 m/s robot, 1.60 m/s operator), native range
 * inputs and buttons (keyboard-operable), visible monospace readouts, a
 * reset control, fixed SVG viewport so nothing shifts, and no JS-driven
 * motion at all, which makes it reduced-motion safe by construction.
 */

const MONO = 'var(--font-mono)';
const DIM = 'var(--color-text-dim)';
const TEXT = 'var(--color-text)';
const ACCENT = 'var(--color-accent)';
const ERR = 'var(--color-err)';
const BORDER = 'var(--color-border)';
const BORDER_STRONG = 'var(--color-border-strong)';

const WIDTH = 640;
const HEIGHT = 200;
const CELL_LEFT = 40;
const CELL_RIGHT = 600;
const FLOOR_Y = 150;
/** Metres of workcell drawn across the plotted width. */
const CELL_SPAN_M = 2.6;

/** Round rendered geometry so server HTML and hydrated DOM agree. */
const f = (v: number) => Number(v.toFixed(2));

const pxPerM = (CELL_RIGHT - CELL_LEFT) / CELL_SPAN_M;
/** Robot base at the left wall; the operator stands at the drawn distance. */
const ROBOT_BASE_X = CELL_LEFT + 30;
const HUMAN_X = f(ROBOT_BASE_X + WORKCELL_SEPARATION_M * pxPerM);

function RobotGlyph({ x, stopped }: { x: number; stopped: boolean }) {
  const tone = stopped ? ERR : ACCENT;
  return (
    <g>
      <rect
        x={f(ROBOT_BASE_X - 14)}
        y={FLOOR_Y - 12}
        width={28}
        height={12}
        fill="none"
        stroke={BORDER_STRONG}
      />
      <line
        x1={ROBOT_BASE_X}
        y1={FLOOR_Y - 12}
        x2={f(ROBOT_BASE_X + (x - ROBOT_BASE_X) * 0.5)}
        y2={FLOOR_Y - 58}
        stroke={tone}
        strokeWidth={2}
      />
      <line
        x1={f(ROBOT_BASE_X + (x - ROBOT_BASE_X) * 0.5)}
        y1={FLOOR_Y - 58}
        x2={f(x)}
        y2={FLOOR_Y - 34}
        stroke={tone}
        strokeWidth={2}
      />
      <circle cx={f(x)} cy={FLOOR_Y - 34} r={4} fill={tone} />
    </g>
  );
}

function HumanGlyph({ x }: { x: number }) {
  return (
    <g>
      <circle cx={f(x)} cy={FLOOR_Y - 52} r={6} fill="none" stroke={TEXT} strokeWidth={1.5} />
      <line x1={f(x)} y1={FLOOR_Y - 46} x2={f(x)} y2={FLOOR_Y - 20} stroke={TEXT} strokeWidth={1.5} />
      <line x1={f(x - 8)} y1={FLOOR_Y - 38} x2={f(x + 8)} y2={FLOOR_Y - 38} stroke={TEXT} strokeWidth={1.5} />
      <line x1={f(x)} y1={FLOOR_Y - 20} x2={f(x - 7)} y2={FLOOR_Y} stroke={TEXT} strokeWidth={1.5} />
      <line x1={f(x)} y1={FLOOR_Y - 20} x2={f(x + 7)} y2={FLOOR_Y} stroke={TEXT} strokeWidth={1.5} />
    </g>
  );
}

export function CollaborativeOperationModes({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
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
  const separationX = f(HUMAN_X - separation * pxPerM);

  const reset = () => {
    setModeId(DEFAULT_MODE);
    setRobotSpeed(DEFAULT_ROBOT_SPEED_M_S);
    setHumanSpeed(DEFAULT_HUMAN_SPEED_M_S);
  };

  const buttonBase =
    'rounded-sm border px-2.5 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]';
  const buttonIdle =
    'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text';
  const buttonActive = 'border-accent bg-surface-2 text-accent';

  const chartSummary =
    mode.readout === 'separation'
      ? `At ${formatSpeed(robotSpeed)} robot speed and ${formatSpeed(humanSpeed)} operator approach, the protective separation distance is ${formatMetres(separation)} against a ${formatMetres(WORKCELL_SEPARATION_M)} workcell: ${formatMetres(terms.humanTravelM)} of operator travel, ${formatMetres(terms.robotReactionM)} of robot travel before braking, ${formatMetres(terms.brakingM)} of braking, and ${formatMetres(terms.marginM)} of intrusion margin and position uncertainty.`
      : mode.readout === 'force'
        ? `At ${formatSpeed(robotSpeed)} robot speed the peak transient contact force is ${formatForce(force)} against the ${formatForce(CONTACT_LIMIT_N)} limit, so an impact with a 4 kg effective mass ${force <= CONTACT_LIMIT_N ? 'stays under' : 'exceeds'} the threshold while the ${formatMetres(separation)} separation distance the other continuous mode would need goes unused.`
        : `Under ${mode.name.toLowerCase()} the ${formatSpeed(robotSpeed)} robot speed and ${formatSpeed(humanSpeed)} operator approach set no distance and no force budget, because the mode permits no autonomous motion beside the operator: the ${formatMetres(separation)} separation and ${formatForce(force)} impact force are what the other two modes would have to hold.`;

  return (
    <div className={cx('rounded-md border border-border bg-surface p-4 sm:p-5', className)}>
      <div role="group" aria-label="Collaborative operation mode" className="flex flex-wrap gap-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={modeId === m.id}
            onClick={() => setModeId(m.id)}
            data-testid={`mode-${m.id}`}
            className={cx(buttonBase, modeId === m.id ? buttonActive : buttonIdle)}
          >
            {m.short}
          </button>
        ))}
        <button type="button" onClick={reset} className={cx(buttonBase, buttonIdle)}>
          Reset
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="safety-robot-speed"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Robot speed
            <span className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text">
              {formatSpeed(robotSpeed)}
            </span>
          </label>
          <input
            id="safety-robot-speed"
            type="range"
            min={ROBOT_SPEED_RANGE.min}
            max={ROBOT_SPEED_RANGE.max}
            step={ROBOT_SPEED_RANGE.step}
            value={robotSpeed}
            onChange={(e) => setRobotSpeed(Number(e.target.value))}
            aria-label={`Robot speed, currently ${formatSpeed(robotSpeed)}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <div>
          <label
            htmlFor="safety-human-speed"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Operator approach
            <span className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text">
              {formatSpeed(humanSpeed)}
            </span>
          </label>
          <input
            id="safety-human-speed"
            type="range"
            min={HUMAN_SPEED_RANGE.min}
            max={HUMAN_SPEED_RANGE.max}
            step={HUMAN_SPEED_RANGE.step}
            value={humanSpeed}
            onChange={(e) => setHumanSpeed(Number(e.target.value))}
            aria-label={`Operator approach speed, currently ${formatSpeed(humanSpeed)}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs" aria-live="polite">
        {mode.readout === 'separation' && (
          <>
            <span className="text-text-dim">
              protective separation:{' '}
              <span
                data-testid="separation-readout"
                className={outcome.separationSatisfied ? 'text-accent' : 'text-err'}
              >
                {formatMetres(separation)}
              </span>
            </span>
            <span className="text-text-dim">
              operator travel:{' '}
              <span data-testid="term-human" className="text-text">
                {formatMetres(terms.humanTravelM)}
              </span>
            </span>
            <span className="text-text-dim">
              robot travel before braking:{' '}
              <span data-testid="term-reaction" className="text-text">
                {formatMetres(terms.robotReactionM)}
              </span>
            </span>
            <span className="text-text-dim">
              braking:{' '}
              <span data-testid="term-braking" className="text-text">
                {formatMetres(terms.brakingM)}
              </span>
            </span>
            <span className="text-text-dim">
              margin and uncertainty:{' '}
              <span data-testid="term-margin" className="text-text">
                {formatMetres(terms.marginM)}
              </span>
            </span>
          </>
        )}
        {mode.readout === 'force' && (
          <>
            <span className="text-text-dim">
              peak transient contact force:{' '}
              <span
                data-testid="force-readout"
                className={outcome.forceSatisfied ? 'text-accent' : 'text-err'}
              >
                {formatForce(force)}
              </span>
            </span>
            <span className="text-text-dim">
              limit:{' '}
              <span data-testid="force-limit-readout" className="text-text">
                {formatForce(CONTACT_LIMIT_N)}
              </span>
            </span>
          </>
        )}
        {mode.readout === 'stated' && (
          <span className="text-text-dim">
            constraint:{' '}
            <span data-testid="stated-readout" className="text-text">
              no distance or force budget in this mode
            </span>
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
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
        className="mt-4 block w-full"
      >
        <line x1={CELL_LEFT} y1={FLOOR_Y} x2={CELL_RIGHT} y2={FLOOR_Y} stroke={BORDER_STRONG} />
        <line x1={CELL_LEFT} y1={30} x2={CELL_LEFT} y2={FLOOR_Y} stroke={BORDER} strokeDasharray="3 3" />
        <line x1={CELL_RIGHT} y1={30} x2={CELL_RIGHT} y2={FLOOR_Y} stroke={BORDER} strokeDasharray="3 3" />

        {mode.readout === 'separation' && (
          <g>
            <rect
              data-testid="separation-band"
              x={f(Math.max(CELL_LEFT, separationX))}
              y={FLOOR_Y - 74}
              width={f(Math.max(0, HUMAN_X - Math.max(CELL_LEFT, separationX)))}
              height={74}
              fill={
                outcome.separationSatisfied
                  ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                  : 'color-mix(in srgb, var(--color-err) 12%, transparent)'
              }
              stroke={outcome.separationSatisfied ? ACCENT : ERR}
              strokeOpacity={0.55}
            />
            <text
              x={f(HUMAN_X - 8)}
              y={FLOOR_Y - 80}
              fill={outcome.separationSatisfied ? ACCENT : ERR}
              fontSize={10}
              fontFamily={MONO}
              textAnchor="end"
            >
              protective separation {formatMetres(separation)}
            </text>
          </g>
        )}

        {mode.readout === 'force' && (
          <text
            data-testid="force-limit-label"
            x={CELL_LEFT + 4}
            y={FLOOR_Y - 88}
            fill={outcome.forceSatisfied ? ACCENT : ERR}
            fontSize={10}
            fontFamily={MONO}
          >
            {CONTACT_LIMIT_LABEL}
          </text>
        )}

        <RobotGlyph x={armX} stopped={stopped} />
        <HumanGlyph x={HUMAN_X} />

        <text x={ROBOT_BASE_X} y={FLOOR_Y + 16} fill={DIM} fontSize={10} fontFamily={MONO} textAnchor="middle">
          robot
        </text>
        <text x={HUMAN_X} y={FLOOR_Y + 16} fill={DIM} fontSize={10} fontFamily={MONO} textAnchor="middle">
          operator
        </text>
        {stopped && (
          <text
            data-testid="stopped-label"
            x={f(ROBOT_BASE_X + 20)}
            y={FLOOR_Y - 104}
            fill={ERR}
            fontSize={10}
            fontFamily={MONO}
          >
            safety-rated stop
          </text>
        )}
      </svg>

      <p
        data-testid="mode-constraint"
        className="mt-4 text-sm leading-relaxed text-text-dim"
      >
        <span className="font-mono text-xs text-text">{mode.name}.</span> {mode.constraint}
      </p>

      <p data-testid="mode-verdict" className="mt-2 font-mono text-xs leading-relaxed text-text-dim">
        verdict: {outcome.summary}
      </p>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
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

      <p className="mt-3 font-mono text-[11px] leading-relaxed text-text-dim">
        Separation model: S = v_H(T_R + T_S) + v_R T_R + B + (C + Z_R + Z_S), the
        linear form restated by Marvel and Norcross. Sourced terms: C ={' '}
        {formatMetres(INTRUSION_MARGIN_M)} for a normal approach on multiple beams,
        robot deceleration {ROBOT_DECELERATION_M_PER_S2} m/s², operator worst case{' '}
        {formatSpeed(DEFAULT_HUMAN_SPEED_M_S)}. Modelled: T_R = {REACTION_TIME_S} s,
        Z_R + Z_S = {formatMetres(POSITION_UNCERTAINTY_M)}, and the impact force,
        an energy balance for a 4 kg effective mass against a 25 kN/m body contact
        stiffness. The force limit is {CONTACT_LIMIT_LABEL}.
      </p>
    </div>
  );
}
