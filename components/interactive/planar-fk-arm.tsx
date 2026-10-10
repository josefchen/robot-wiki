'use client';

import { useId, useRef, useState } from 'react';
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
  type Preset,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import { CHART_STROKE, CHART_TYPE, CHART_VIEW_WIDTH, DirectLabel, StageAnnotation, roleColour } from '@/components/motion/chart';
import { GripperGlyph } from '@/components/motion/gripper-glyph';
import { MOTION_STAGE } from '@/lib/motion-tokens';
import {
  DEFAULT_ANGLES_DEG,
  JOINT_LIMIT_DEG,
  LINK_LENGTHS,
  planarForwardKinematics,
  totalReach,
  type Point2,
} from '@/lib/planar-fk';

/**
 * PlanarFkArm: the 2D forward-kinematics figure for the classical
 * kinematics article. A three-joint arm stands on a pedestal; each joint
 * angle is measured from the link before it, so the hand's position is the
 * running sum of the three link vectors.
 *
 * The figure opens on its point: the same arm drawn faintly before a
 * 40-degree shoulder turn and solidly after it, with the hand's swing
 * traced around the shoulder. "Turn the shoulder" and three named poses
 * are the visible controls; the elbow and wrist sliders, the exact angles
 * and the hand's coordinates sit in "Adjust more". The faint arm always
 * shows the pose before the reader's last move.
 *
 * Interactive contract: deterministic render, native range inputs and
 * buttons (keyboard-accessible), reset, fixed SVG viewport (no layout
 * shift), no JS-driven motion.
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 256;
const ORIGIN_X = 170;
const ORIGIN_Y = 170;
const REACH = totalReach(LINK_LENGTHS);
/** Stage units per link unit, so full reach spans 143 units above the shoulder. */
const SCALE = 62;
/** The shoulder turns through the half-plane above its pedestal. */
export const SHOULDER_RANGE_DEG = [0, 180] as const;
/** The faint arm at load: the opening pose with the shoulder 40 degrees back. */
const OPENING_GHOST: readonly number[] = [DEFAULT_ANGLES_DEG[0] - 40, DEFAULT_ANGLES_DEG[1], DEFAULT_ANGLES_DEG[2]];
/** Moves on one control closer together than this are one gesture. */
const GESTURE_GAP_MS = 600;
/** Joint circle radii in stage units, shoulder first: small rings on thin links. */
const JOINT_RADII: readonly number[] = [4.5, 3.5, 3];

type PoseId = 'up' | 'out' | 'tuck';
const POSES: readonly (Preset<PoseId> & { angles: readonly number[] })[] = [
  { id: 'up', label: 'Reach up', angles: [95, -10, -5] },
  { id: 'out', label: 'Reach out', angles: [30, -20, -10] },
  { id: 'tuck', label: 'Tuck in', angles: [100, -140, -60] },
];

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

/** The note's arrow runs from under the note to the rim of the shoulder joint. */
const NOTE_FROM = [146, 195] as const;
const NOTE_TARGET = (() => {
  const [fx, fy] = NOTE_FROM;
  const rim = JOINT_RADII[0] + 3;
  const d = Math.hypot(ORIGIN_X - fx, ORIGIN_Y - fy);
  return [f(ORIGIN_X - ((ORIGIN_X - fx) / d) * rim), f(ORIGIN_Y - ((ORIGIN_Y - fy) / d) * rim)] as const;
})();

/** Signed fixed-point readout: "+0.42" / "-1.03". */
function formatSigned(v: number): string {
  const s = v.toFixed(2);
  return s.startsWith('-') ? s : `+${s}`;
}

const sx = (p: Point2) => f(ORIGIN_X + p.x * SCALE);
const sy = (p: Point2) => f(ORIGIN_Y - p.y * SCALE);
const samePose = (a: readonly number[], b: readonly number[]) => a.every((v, i) => v === b[i]);

/**
 * The arm in one pose as a line drawing: each link one thin stroke, small
 * paper-filled joint rings and a two-finger gripper outline. The arm before
 * the last move is the same drawing dashed in the reference grey.
 */
function ArmDrawing({ angles, ghost = false }: { angles: readonly number[]; ghost?: boolean }) {
  const { pivots, effector } = planarForwardKinematics(LINK_LENGTHS, angles);
  const points = [...pivots, effector];
  const role = ghost ? 'reference' : 'state';
  const colour = roleColour(role);
  const width = ghost ? CHART_STROKE.reference : CHART_STROKE.trace;
  return (
    <g data-testid={ghost ? 'fk-ghost' : undefined} data-chart-role={role}>
      <g data-series={ghost ? undefined : 'fk-links'}>
        {points.slice(0, -1).map((p, i) => (
          <line
            key={`link-${i}`}
            data-testid={ghost ? undefined : `fk-link-${i + 1}`}
            x1={sx(p)}
            y1={sy(p)}
            x2={sx(points[i + 1])}
            y2={sy(points[i + 1])}
            stroke={colour}
            strokeWidth={width}
            strokeDasharray={ghost ? CHART_STROKE.dash : undefined}
            strokeLinecap="round"
          />
        ))}
        {pivots.map((p, i) => (
          <circle
            key={`joint-${i}`}
            cx={sx(p)}
            cy={sy(p)}
            r={JOINT_RADII[i]}
            fill={MOTION_STAGE.background}
            stroke={colour}
            strokeWidth={width}
          />
        ))}
      </g>
      <GripperGlyph
        x={sx(effector)}
        y={sy(effector)}
        angle={-angles.reduce((sum, a) => sum + a, 0)}
        size={14}
        role={role}
        dashed={ghost}
        testId={ghost ? undefined : 'fk-effector-marker'}
      />
    </g>
  );
}

/** The fixed post the shoulder sits on: an outlined column, a foot plate and the floor hairline. */
function Pedestal() {
  const [x, y] = [ORIGIN_X, ORIGIN_Y];
  return (
    <g data-scene-structure="pedestal" fill="none" stroke={roleColour('state')} strokeWidth={CHART_STROKE.structure}>
      <line x1={x - 70} y1={y + 43} x2={x + 70} y2={y + 43} stroke="var(--line-strong)" />
      <rect x={x - 6} y={y + JOINT_RADII[0]} width={12} height={f(38 - JOINT_RADII[0])} />
      <rect x={x - 18} y={y + 38} width={36} height={5} />
    </g>
  );
}

/**
 * The hand's path around the shoulder when only the shoulder turned: an
 * arc just outside the hand's circle, from the faint hand to the solid one.
 */
function SwingArc({ from, turnDeg }: { from: Point2; turnDeg: number }) {
  const colour = roleColour('highlight');
  const r = Math.hypot(from.x, from.y) * SCALE + 16;
  const a0 = Math.atan2(from.y, from.x);
  const a1 = a0 + (turnDeg * Math.PI) / 180;
  const at = (a: number) => [f(ORIGIN_X + r * Math.cos(a)), f(ORIGIN_Y - r * Math.sin(a))] as const;
  const [x0, y0] = at(a0);
  const [x1, y1] = at(a1);
  const turn = Math.sign(turnDeg);
  // Screen tangent of the motion at the arc's end (y grows downward).
  const [dx, dy] = [-turn * Math.sin(a1), -turn * Math.cos(a1)];
  const head = [
    [x1 + dx * 4, y1 + dy * 4],
    [x1 - dx * 6 - dy * 4.5, y1 - dy * 6 + dx * 4.5],
    [x1 - dx * 6 + dy * 4.5, y1 - dy * 6 - dx * 4.5],
  ].map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
  return (
    <g data-testid="fk-swing" data-chart-role="highlight">
      <path
        d={`M ${x0} ${y0} A ${f(r)} ${f(r)} 0 0 ${turn > 0 ? 0 : 1} ${x1} ${y1}`}
        fill="none"
        stroke={colour}
        strokeWidth={CHART_STROKE.trace}
        strokeLinecap="round"
      />
      <polygon points={head} fill={colour} />
    </g>
  );
}

/** "before the turn" under (or over) the faint hand, kept inside the stage. */
function GhostLabel({ tip, text }: { tip: Point2; text: string }) {
  const half = (text.length * CHART_TYPE.labelPx * 0.52) / 2;
  const x = Math.min(Math.max(sx(tip), half + 6), WIDTH - half - 6);
  const y = sy(tip) < HEIGHT / 2 ? sy(tip) + 28 : sy(tip) - 18;
  return (
    <DirectLabel x={f(x)} y={f(y)} anchor="middle">
      {text}
    </DirectLabel>
  );
}

export function PlanarFkArm({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const [angles, setAngles] = useState<readonly number[]>([...DEFAULT_ANGLES_DEG]);
  const [ghost, setGhost] = useState<readonly number[]>(OPENING_GHOST);
  const lastMove = useRef({ control: '', at: -Infinity });

  const { effector } = planarForwardKinematics(LINK_LENGTHS, angles);
  const ghostTip = planarForwardKinematics(LINK_LENGTHS, ghost).effector;
  const turnDeg = angles[0] - ghost[0];
  const onlyShoulderTurned = turnDeg !== 0 && angles[1] === ghost[1] && angles[2] === ghost[2];
  const pose = POSES.find((p) => samePose(p.angles, angles))?.id ?? null;

  /** Moves the arm; the faint arm keeps the pose from before this gesture. */
  function move(control: string, next: readonly number[]): void {
    const now = typeof performance === 'undefined' ? 0 : performance.now();
    const previous = lastMove.current;
    if (control !== previous.control || now - previous.at > GESTURE_GAP_MS) setGhost(angles);
    lastMove.current = { control, at: now };
    setAngles(next);
  }

  function setJoint(index: number, value: number): void {
    move(`joint-${index}`, angles.map((a, i) => (i === index ? value : a)));
  }

  function choosePose(id: PoseId): void {
    lastMove.current = { control: '', at: -Infinity };
    move(`pose-${id}`, POSES.find((p) => p.id === id)!.angles);
  }

  function reset(): void {
    lastMove.current = { control: '', at: -Infinity };
    setAngles([...DEFAULT_ANGLES_DEG]);
    setGhost(OPENING_GHOST);
  }

  const x = formatSigned(effector.x);
  const y = formatSigned(effector.y);

  return (
    <InstrumentFigure
      figureId="planar-fk-arm"
      className={className}
      kicker="Forward kinematics"
      heading="Turn the shoulder and everything beyond it swings along"
      controls={
        <>
          <PresetGroup label="Pose the whole arm" presets={POSES} value={pose} onChange={choosePose} testId="fk-pose" />
          <ControlField>
            <ControlLabel htmlFor="fk-joint-1">Turn the shoulder</ControlLabel>
            <input
              id="fk-joint-1"
              type="range"
              data-brand-control-id="control:input"
              min={SHOULDER_RANGE_DEG[0]}
              max={SHOULDER_RANGE_DEG[1]}
              step={1}
              value={angles[0]}
              onChange={(e) => setJoint(0, Number(e.target.value))}
              aria-label={`Turn the shoulder: shoulder joint angle in degrees, currently ${angles[0]}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="arm leans right" high="arm leans left" />
          </ControlField>
        </>
      }
      adjust={
        <>
          {(['elbow', 'wrist'] as const).map((joint, k) => (
            <ControlField key={joint}>
              <ControlLabel
                htmlFor={`fk-joint-${k + 2}`}
                value={<span data-testid={`fk-theta-${k + 2}`}>{angles[k + 1]}°</span>}
              >
                Bend the {joint}
              </ControlLabel>
              <input
                id={`fk-joint-${k + 2}`}
                type="range"
                data-brand-control-id="control:input"
                min={-JOINT_LIMIT_DEG}
                max={JOINT_LIMIT_DEG}
                step={1}
                value={angles[k + 1]}
                onChange={(e) => setJoint(k + 1, Number(e.target.value))}
                aria-label={`Bend the ${joint}: ${joint} joint angle in degrees, currently ${angles[k + 1]}`}
                className={INSTRUMENT_SLIDER_CLASS}
              />
            </ControlField>
          ))}
          <InstrumentReset onClick={reset} />
          <InstrumentReadout className="basis-full">
            shoulder <span data-testid="fk-theta-1">{angles[0]}°</span>; hand at x{' '}
            <span data-testid="fk-ee-x">{x}</span>, y <span data-testid="fk-ee-y">{y}</span> link units from the
            shoulder
          </InstrumentReadout>
        </>
      }
      stage={
        <FigureStage>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Robot arm with three joints on a post. Shoulder ${angles[0]} degrees, elbow ${angles[1]} degrees, wrist ${angles[2]} degrees; the hand is at x ${x}, y ${y} link units from the shoulder.`}
            aria-describedby={descriptionId}
          >
            <Pedestal />
            {samePose(ghost, angles) ? null : <ArmDrawing angles={ghost} ghost />}
            {onlyShoulderTurned && Math.abs(turnDeg) >= 3 ? <SwingArc from={ghostTip} turnDeg={turnDeg} /> : null}
            <ArmDrawing angles={angles} />
            {samePose(ghost, angles) ? null : (
              <GhostLabel tip={ghostTip} text={onlyShoulderTurned ? 'before the turn' : 'before'} />
            )}
            <StageAnnotation
              x={8}
              y={200}
              lines={['Turn here: elbow,', 'wrist and hand', 'all ride along']}
              target={NOTE_TARGET}
              from={NOTE_FROM}
              pointer="arrow"
            />
          </PlotStage>
        </FigureStage>
      }
      caption="A robot works out where its hand is by adding up each joint's turn, from shoulder to fingertip."
      method={
        <>
          <p>
            Computed on chosen link lengths of 1.00, 0.75 and 0.55 link units, so the hand reaches at most{' '}
            {REACH.toFixed(2)} from the shoulder. Each angle is measured from the link before it, anticlockwise
            positive, and the hand&apos;s position is the running sum of the three link vectors. The shoulder turns
            from 0 degrees (pointing right) to 180 (pointing left); the elbow and wrist turn up to 180 degrees either
            way. The faint arm is the pose before the last move; at load it is the opening pose with the shoulder 40
            degrees back.
          </p>
          <ChartDescription
            id={descriptionId}
            form="state"
            summary="Current arm pose"
            description={`With the shoulder at ${angles[0]} degrees, the elbow at ${angles[1]} degrees and the wrist at ${angles[2]} degrees, the hand sits at x ${x}, y ${y} link units from the shoulder; the three links are 1.00, 0.75 and 0.55 long.`}
            states={[
              { label: 'shoulder', value: `${angles[0]}°` },
              { label: 'elbow', value: `${angles[1]}°` },
              { label: 'wrist', value: `${angles[2]}°` },
              { label: 'hand x', value: x },
              { label: 'hand y', value: y },
            ]}
          />
        </>
      }
    />
  );
}
