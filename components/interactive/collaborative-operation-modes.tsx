'use client';

import { forwardRef, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChartDescription } from '@/components/ui';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, Line, Solid, Wire } from '@/components/iso/react/draw';
import { Stage, asksForStillness } from '@/components/iso/react/live';
import type { SolidPaths, Tone } from '@/components/iso/iso-kit';
import {
  FORCE_FACE,
  LAMPS,
  PARTS,
  RIGHT_ARM,
  SLED_PARTS,
  SLOW,
  SPEED_FACE,
  VIEW_BOX,
  WIDTH,
  armParts,
  cellRun,
  fieldAt,
  forceNeedle,
  forceNeedleDegrees,
  restPose,
  ridersAt,
  sledShift,
  speedNeedle,
  speedNeedleDegrees,
  ENTRANCE_M,
  type CellPose,
  type Part,
  type Phase,
} from '@/components/iso/figures/cobot-cell';
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

/**
 * CollaborativeOperationModes: a cobot cell, a robot arm on a pedestal and a
 * test mannequin on a floor track, shared four ways, once per collaborative
 * operation mode, with the mode's own constraint computed live rather than
 * described.
 *
 * Each mode hands the job of guarding the person to one part of the cell,
 * the lit one: the floor scanner's zone (as wide as the whole cell for a
 * monitored stop, as long as the protective separation distance for speed
 * and separation monitoring), the handle on the robot's wrist (hand
 * guiding), or the bump gauge's needle (power and force limiting). The
 * drawing and the run come from components/iso/figures/cobot-cell.ts; the
 * numbers come from lib/safety-modes, unchanged.
 *
 * The contact-force limit and its label come from lib/force-limits through
 * lib/safety-modes, the same module the impedance lab on /classical/control
 * renders, so the two pages cannot drift apart (VAL-FRONT-029).
 *
 * The main view speaks in words: the gap the robot must keep, laid on the
 * floor ruler as its four parts and named under the drawing, or how hard a
 * bump pushes against the safe limit. The formula, the exact readouts in
 * metres and newtons, the per-mode explanation and the teaching choices are
 * in "How this was made". Nothing moves until the reader runs the cell, and
 * under reduced motion a run jumps to its end.
 */

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
 * The four parts of the gap, in the order they lie on the floor ruler from
 * the tool: the robot's own travel before it stops, the margin, then the
 * person's walk. The swatch draws each rider's look.
 */
const GAP_PARTS = [
  { key: 'robotReactionM', label: 'It keeps moving', swatch: 'robot' },
  { key: 'brakingM', label: 'Braking', swatch: 'robot' },
  { key: 'marginM', label: 'Safety margin', swatch: 'margin' },
  { key: 'humanTravelM', label: 'You walk in while it reacts', swatch: 'walk' },
] as const;

const SWATCH_CLASS: Record<(typeof GAP_PARTS)[number]['swatch'], string> = {
  robot: 'border [border-color:var(--anatomy-mid)] [background:var(--anatomy-shade-1)]',
  margin: 'border [border-color:var(--anatomy-lo)] [background:var(--anatomy-paper)]',
  walk: 'border [border-color:var(--anatomy-hi)] [background:var(--anatomy-shade-0)]',
};

/** The gap's four parts in words, keyed to the riders on the floor ruler. */
function GapBar({ terms }: { terms: ReturnType<typeof separationTerms> }) {
  return (
    <div data-testid="gap-bar" className="pb-1 pt-3 font-sans text-[12px]">
      <ul className="m-0! grid list-none grid-cols-1 gap-x-4 gap-y-0.5 p-0! sm:grid-cols-2">
        {GAP_PARTS.map((part) => (
          <li key={part.key} className="m-0! flex items-center gap-1.5 text-text-dim">
            <span aria-hidden="true" className={`inline-block h-1.5 w-3 shrink-0 ${SWATCH_CLASS[part.swatch]}`} />
            {part.label}: <span className="text-text">{terms[part.key].toFixed(2)} metres</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** How hard a bump would push, against the safe limit. */
function ForceBar({ force }: { force: number }) {
  return (
    <div data-testid="force-bar" className="pb-1 pt-3 font-sans text-[12px]">
      <p className="m-0 text-text-dim">
        Bump: <span className="text-text">about {Math.round(force)} newtons</span>. Safe limit
        (the gauge&rsquo;s long mark): <span className="text-text">{CONTACT_LIMIT_N} newtons</span>.
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

/** One static part of the cell, as the kit draws it. */
function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }): ReactNode {
  if (part.kind === 'solid') {
    return <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined} />;
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.kind === 'wire') return <Wire from={part.from} to={part.to} via={part.via} tone={part.tone} />;
  if (part.fill === 'paper') return <path className="iso-fill" d={part.d} />;
  return (
    <g>
      <path className="iso-fill" d={part.d} />
      {part.fill === 'top' ? <path className="iso-top" d={part.d} /> : <path className="iso-shade" data-shade={part.fill} d={part.d} />}
    </g>
  );
}

/**
 * One solid of the arm, rebuilt each frame: it always renders every path
 * (fill, four shades, top, crease, bevel, its seam, outline), so the live
 * code can rewrite each `d` in place without a React render.
 */
const ArmSolid = forwardRef<SVGGElement, { paths: SolidPaths; inner?: string; tone: Tone; lit?: boolean }>(function ArmSolid(
  { paths, inner, tone, lit = false },
  ref,
) {
  return (
    <g ref={ref} className="iso-solid" data-lit={lit ? '' : undefined}>
      <path className="iso-fill" data-arm="fill" d={paths.fill} />
      {[0, 1, 2, 3].map((shade) => (
        <path key={shade} className="iso-shade" data-shade={shade} data-arm={`shade-${shade}`} d={paths.shades[shade] ?? ''} />
      ))}
      <path className="iso-top" data-arm="top" d={paths.top} />
      <path className="iso-line iso-crease" data-tone="faint" data-arm="crease" d={paths.crease} />
      <path className="iso-line iso-bevel" data-tone="faint" data-arm="bevel" d={paths.bevel ?? ''} />
      <path className="iso-line" data-tone="faint" data-arm="inner" d={inner ?? ''} />
      <path className="iso-line iso-edge" data-tone={tone} data-arm="edge" d={paths.outline} />
    </g>
  );
});

function writeArm(group: SVGGElement | null, paths: SolidPaths, inner: string | undefined) {
  if (!group) return;
  const set = (name: string, d: string) => group.querySelector(`[data-arm="${name}"]`)?.setAttribute('d', d);
  set('fill', paths.fill);
  for (let shade = 0; shade < 4; shade++) set(`shade-${shade}`, paths.shades[shade] ?? '');
  set('top', paths.top);
  set('crease', paths.crease);
  set('bevel', paths.bevel ?? '');
  set('inner', inner ?? '');
  set('edge', paths.outline);
}

/** Round rendered numbers so server HTML and hydrated DOM agree. */
const f = (v: number) => Number(v.toFixed(2));

type Lamp = 'stop' | 'wait' | 'run';
const lampOf = (pose: CellPose): Lamp => (pose.stopped ? 'stop' : pose.toolSpeed > 0.005 ? 'run' : 'wait');

/** The stage readout, in plain words, for a mode at a moment of the cell. */
function stageReadout(mode: ModeId, phase: Phase, pose: CellPose, robotSpeed: number, humanSpeed: number): string {
  const separation = protectiveSeparationM(robotSpeed, humanSpeed);
  const force = peakContactForceN(robotSpeed);
  if (mode === 'speed-separation') {
    if (phase === 'setup') return 'you step back out of its zone';
    if (phase === 'walk') return humanSpeed > 0 ? 'you walk in, it keeps working' : 'you stand still, it keeps working';
    if (phase === 'work') return 'you stand still, it keeps working';
    if (phase === 'react') return 'you cross the edge, it reacts';
    if (phase === 'brake') return 'it brakes, you keep walking';
    if (phase === 'stopped') {
      const run = cellRun(mode, robotSpeed, humanSpeed);
      return run.trigger ? `stopped, ${run.trigger.gapM.toFixed(2)} m left between you` : 'it stays stopped while you stand in its zone';
    }
    return `needs ${separation.toFixed(2)} m, you stand at ${WORKCELL_SEPARATION_M.toFixed(2)} m`;
  }
  if (mode === 'monitored-stop') {
    if (phase === 'out') return 'you walk out, it holds still';
    if (phase === 'work') return 'you are outside the cell, it works';
    if (phase === 'in') return 'you walk back in';
    if (phase === 'brake') return 'you step into the cell, it stops';
    return pose.stopped ? 'you are inside the cell, it holds still' : 'it works';
  }
  if (mode === 'hand-guiding') {
    if (phase === 'push') return 'you push its handle, it follows';
    if (phase === 'held') return 'you stop pushing, it holds still';
    return 'it moves only while you guide it';
  }
  if (phase === 'setup') return 'it backs off to its fixture';
  if (phase === 'approach') return `it moves toward you at ${speedWords(robotSpeed)}`;
  return `a bump pushes ${Math.round(force)} newtons, the limit is ${CONTACT_LIMIT_N}: ${force <= CONTACT_LIMIT_N ? 'gentle enough' : 'too hard'}`;
}

const HINTS: Record<ModeId, string> = {
  'monitored-stop': 'Lit: the scanner’s zone, the whole cell',
  'hand-guiding': 'Lit: the handle on the robot’s wrist',
  'speed-separation': 'Lit: the scanner’s zone',
  'power-force': 'Lit: the bump gauge’s needle',
};

type RunState = 'idle' | 'running' | 'done';

interface Refs {
  sled: SVGGElement | null;
  rightArm: SVGGElement | null;
  arm: Array<SVGGElement | null>;
  speedNeedle: SVGGElement | null;
  forceNeedle: SVGGElement | null;
}

export function CollaborativeOperationModes({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const [modeId, setModeId] = useState<ModeId>(DEFAULT_MODE);
  const [robotSpeed, setRobotSpeed] = useState(DEFAULT_ROBOT_SPEED_M_S);
  const [humanSpeed, setHumanSpeed] = useState(DEFAULT_HUMAN_SPEED_M_S);
  const [runState, setRunState] = useState<RunState>('idle');
  const [live, setLive] = useState<{ phase: Phase; lamp: Lamp }>({ phase: 'rest', lamp: 'run' });

  const mode = modeById(modeId);
  const terms = separationTerms(robotSpeed, humanSpeed);
  const separation = protectiveSeparationM(robotSpeed, humanSpeed);
  const force = peakContactForceN(robotSpeed);
  const outcome = verdict(robotSpeed, humanSpeed);
  const gentleSpeed = forceLimitedSpeedMs();

  // The still pose shows each mode's point; a finished run holds its last moment.
  const rest = restPose(modeId, robotSpeed, humanSpeed);
  const run = cellRun(modeId, robotSpeed, humanSpeed);
  const end = run.at(run.duration);
  const held = runState === 'done' ? end : rest;
  const phase: Phase = runState === 'running' ? live.phase : held.phase;
  const lamp: Lamp = runState === 'running' ? live.lamp : lampOf(held);

  const refs = useRef<Refs>({ sled: null, rightArm: null, arm: [], speedNeedle: null, forceNeedle: null });
  const pose = useRef<CellPose>(rest);

  useEffect(() => {
    const r = refs.current;
    const place = (p: CellPose) => {
      pose.current = p;
      const shift = sledShift(p.personX);
      r.sled?.setAttribute('transform', shift);
      r.rightArm?.setAttribute('transform', shift);
      armParts(p.toolX, p.toolZ, modeId, p.roll).forEach((part, index) => writeArm(r.arm[index] ?? null, part.paths, part.inner));
      r.speedNeedle?.setAttribute('transform', `rotate(${f(speedNeedleDegrees(p.toolSpeed))})`);
      r.forceNeedle?.setAttribute('transform', `rotate(${f(forceNeedleDegrees(p.forceN))})`);
    };
    const cell = cellRun(modeId, robotSpeed, humanSpeed);
    if (runState === 'done') {
      place(cell.at(cell.duration));
      return;
    }
    let frame = 0;
    let last = 0;
    if (runState === 'running') {
      let clock = 0;
      let shown = { phase: '' as Phase | '', lamp: '' as Lamp | '' };
      const tick = (now: number) => {
        const dt = last ? Math.min(now - last, 64) / 1000 : 1 / 60;
        last = now;
        clock = Math.min(cell.duration, clock + dt / SLOW);
        const p = cell.at(clock);
        place(p);
        const lampNow = lampOf(p);
        if (p.phase !== shown.phase || lampNow !== shown.lamp) {
          shown = { phase: p.phase, lamp: lampNow };
          setLive({ phase: p.phase, lamp: lampNow });
        }
        if (clock >= cell.duration) {
          setRunState('done');
          return;
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    }
    // Idle: ease from wherever the cell is to the still pose of the current settings.
    const target = restPose(modeId, robotSpeed, humanSpeed);
    if (asksForStillness()) {
      place(target);
      return;
    }
    const tick = (now: number) => {
      const dt = last ? Math.min(now - last, 64) / 1000 : 1 / 60;
      last = now;
      const k = 1 - Math.exp(-dt / 0.3);
      const c = pose.current;
      const next: CellPose = {
        toolX: c.toolX + (target.toolX - c.toolX) * k,
        toolZ: c.toolZ + (target.toolZ - c.toolZ) * k,
        toolSpeed: c.toolSpeed + (target.toolSpeed - c.toolSpeed) * k,
        personX: c.personX + (target.personX - c.personX) * k,
        forceN: c.forceN + (target.forceN - c.forceN) * k,
        stopped: target.stopped,
        roll: c.roll + (target.roll - c.roll) * k,
        phase: 'rest',
      };
      const settled =
        Math.abs(next.toolX - target.toolX) < 1e-4 &&
        Math.abs(next.toolZ - target.toolZ) < 1e-4 &&
        Math.abs(next.personX - target.personX) < 1e-4 &&
        Math.abs(next.toolSpeed - target.toolSpeed) < 1e-3 &&
        Math.abs(next.roll - target.roll) < 1e-3 &&
        Math.abs(next.forceN - target.forceN) < 0.05;
      place(settled ? target : next);
      if (!settled) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [runState, modeId, robotSpeed, humanSpeed]);

  /** Any choice ends a run and eases the cell to the new still pose. */
  const choose = (next: () => void) => {
    setRunState('idle');
    next();
  };

  const reset = () => {
    setRunState('idle');
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

  const zone = modeId === 'speed-separation' ? fieldAt(separation) : modeId === 'monitored-stop' ? fieldAt(ENTRANCE_M) : null;
  const riders = modeId === 'speed-separation' ? ridersAt(terms) : null;
  const limit = FORCE_FACE.bandOf(CONTACT_LIMIT_N);
  const armNow = armParts(held.toolX, held.toolZ, modeId, held.roll);
  const readout = stageReadout(modeId, phase, held, robotSpeed, humanSpeed);

  const slot = (name: string): ReactNode => {
    switch (name) {
      case 'field':
        return zone ? (
          <g data-testid="scanner-zone" data-metres={(zone.x / 100).toFixed(2)}>
            <path className="iso-fill" d={zone.fill} />
            <path className="iso-shade" data-shade={3} d={zone.fill} />
            <Line d={zone.outline} tone="lit" />
            <Solid paths={zone.edge} tone="hi" lit />
          </g>
        ) : null;
      case 'riders':
        return riders ? (
          <g data-testid="gap-riders" data-terms={[terms.robotReactionM, terms.brakingM, terms.marginM, terms.humanTravelM].map((m) => m.toFixed(2)).join(' ')}>
            {riders.reaction ? <Solid paths={riders.reaction} tone="mid" /> : null}
            {riders.braking ? <Solid paths={riders.braking} tone="mid" /> : null}
            {riders.margin ? <Solid paths={riders.margin} tone="lo" /> : null}
            {riders.walk ? <Solid paths={riders.walk} tone="hi" /> : null}
          </g>
        ) : null;
      case 'speed-needle':
        return (
          <g transform={SPEED_FACE.matrix} data-testid="speed-dial">
            <path className="iso-fill" d={SPEED_FACE.face} />
            <path className="iso-top" d={SPEED_FACE.face} />
            <Line d={SPEED_FACE.rim} tone="lo" />
            <Line d={SPEED_FACE.arc} tone="lo" />
            <Line d={SPEED_FACE.minor} tone="lo" />
            <Line d={SPEED_FACE.major} tone="mid" />
            <g ref={(el) => { refs.current.speedNeedle = el; }} transform={`rotate(${f(speedNeedleDegrees(held.toolSpeed))})`}>
              <Line d={speedNeedle()} tone="hi" free />
            </g>
            <path className="iso-fill" d={SPEED_FACE.hub} />
            <Line d={SPEED_FACE.hub} tone="lo" />
          </g>
        );
      case 'lamps':
        return (
          <g data-testid="stack-light" data-lamp={lamp}>
            {(['run', 'wait', 'stop'] as const).map((name) => (
              <Solid key={name} paths={LAMPS[name].paths} tone={lamp === name ? 'hi' : 'lo'} inner={<Line d={LAMPS[name].inner} tone="faint" />} />
            ))}
            <Solid paths={LAMPS.cap} tone="mid" />
          </g>
        );
      case 'sled':
        return (
          <g ref={(el) => { refs.current.sled = el; }} transform={sledShift(held.personX)} data-testid="mannequin-sled">
            {SLED_PARTS.map((part, index) =>
              part.kind === 'slot' ? (
                <g key="force-dial" transform={FORCE_FACE.matrix} data-testid="bump-gauge" data-newtons={Math.round(force)}>
                  <path className="iso-fill" d={FORCE_FACE.face} />
                  <path className="iso-top" d={FORCE_FACE.face} />
                  <Line d={FORCE_FACE.rim} tone="lo" />
                  <path className="iso-shade" data-shade={1} d={limit.band} />
                  <Line d={limit.band} tone="lo" />
                  <Line d={FORCE_FACE.arc} tone="lo" />
                  <Line d={FORCE_FACE.minor} tone="lo" />
                  <Line d={FORCE_FACE.major} tone="mid" />
                  <Line d={limit.mark} tone="hi" />
                  <g ref={(el) => { refs.current.forceNeedle = el; }} transform={`rotate(${f(forceNeedleDegrees(held.forceN))})`}>
                    <Line d={forceNeedle()} tone={modeId === 'power-force' ? 'lit' : 'hi'} free />
                  </g>
                  <path className="iso-fill" d={FORCE_FACE.hub} />
                  <Line d={FORCE_FACE.hub} tone="lo" />
                </g>
              ) : (
                <PartView key={index} part={part} />
              ),
            )}
          </g>
        );
      case 'arm':
        return (
          <g data-testid="cobot-arm">
            {armNow.map((part, index) => (
              <ArmSolid
                key={part.name}
                ref={(el) => { refs.current.arm[index] = el; }}
                paths={part.paths}
                inner={part.inner}
                tone={part.tone}
                lit={part.lit}
              />
            ))}
          </g>
        );
      case 'right-arm':
        return (
          <g ref={(el) => { refs.current.rightArm = el; }} transform={sledShift(held.personX)}>
            {(modeId === 'hand-guiding' ? RIGHT_ARM.reach : RIGHT_ARM.down).map((part, index) =>
              part.kind === 'slot' ? null : <PartView key={index} part={part} />,
            )}
          </g>
        );
      default:
        return null;
    }
  };

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
            onChange={(id) => choose(() => setModeId(id))}
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
              onChange={(e) => choose(() => setRobotSpeed(Number(e.target.value)))}
              aria-label={`Robot speed, currently ${speedWords(robotSpeed)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="slow" high="fast" />
          </ControlField>
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            onClick={() => {
              if (runState === 'running') {
                setRunState('idle');
                return;
              }
              // Reduced motion shows the run's last moment without the motion.
              setLive({ phase: run.at(0).phase, lamp: lampOf(run.at(0)) });
              setRunState(typeof window.matchMedia === 'function' && asksForStillness() ? 'done' : 'running');
            }}
            data-testid="cell-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {runState === 'running' ? 'Stop the run' : 'Run the cell'}
          </button>
          <InstrumentReadout data-testid="safety-plain-readout" className="basis-full">
            {plainReadout}
          </InstrumentReadout>
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
              onChange={(e) => choose(() => setHumanSpeed(Number(e.target.value)))}
              aria-label={`Your walking speed (operator approach speed), currently ${speedWords(humanSpeed)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="standing still" high="a jog" />
          </ControlField>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint={runState === 'running' ? `Played ${SLOW} times slower than real time` : HINTS[modeId]}
          readout={readout}
          status="illustrative"
          data-testid="cobot-cell-stage"
        >
          <Stage className="iso-stage">
            <svg
              className="iso-svg"
              viewBox={VIEW_BOX}
              role="img"
              focusable="false"
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
              {PARTS.map((part, index) =>
                part.kind === 'slot' ? <g key={part.slot}>{slot(part.slot)}</g> : <PartView key={index} part={part} />,
              )}
            </svg>
          </Stage>
          {mode.readout === 'separation' && <GapBar terms={terms} />}
          {mode.readout === 'force' && <ForceBar force={force} />}
        </AnatomyStage>
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
            <p data-testid="force-limit-label" className="text-text-dim">
              {CONTACT_LIMIT_LABEL}
            </p>
          )}
          <p>
            &ldquo;Stops when you step in&rdquo; is a safety-rated monitored stop; &ldquo;You guide
            it by hand&rdquo; is hand guiding; &ldquo;Keeps its distance&rdquo; is speed and
            separation monitoring; &ldquo;Gentle enough to bump&rdquo; is power and force limiting.
            In the drawing, a floor scanner guards a zone: the whole cell for a monitored stop, and
            for separation monitoring a zone as long as the protective separation distance, its four
            terms laid on the ruler from the tool. A run walks the mannequin in; when it crosses the
            zone&rsquo;s edge the arm keeps moving for the reaction time, brakes, and stops with the
            margin left between them. The bump gauge&rsquo;s pad stands in for a thigh, and its needle
            holds the peak force of a bump at the robot&rsquo;s speed. Runs play {SLOW} times slower
            than real time; where the walk starts, the tray and the fixture, and the guiding push
            (0.15 m at 0.4 m/s) are the drawing&rsquo;s own choices.
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
