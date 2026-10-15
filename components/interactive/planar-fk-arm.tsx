'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChartDescription } from '@/components/ui';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PresetGroup,
  SliderEnds,
  type Preset,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { PartView } from '@/components/iso/part-view';
import { Dots, Line } from '@/components/iso/react/draw';
import { Stage, asksForStillness } from '@/components/iso/react/live';
import { PARTS, VIEW_BOX, WIDTH, armParts, ghostFor, inkFor, type Part } from '@/components/iso/figures/arm-plotting-table';
import {
  DEFAULT_ANGLES_DEG,
  JOINT_LIMIT_DEG,
  LINK_LENGTHS,
  planarForwardKinematics,
  totalReach,
} from '@/lib/planar-fk';

/**
 * PlanarFkArm: the 2D forward-kinematics figure for the classical
 * kinematics article, drawn as a three-joint arm over a plotting table
 * (components/iso/figures/arm-plotting-table.ts).
 *
 * The arm stands on a column at the back of the table and a pen on a quill
 * at its hand touches the paper. Each joint's dial rides on the link before
 * it, so every angle is measured from the link before it, and the hand's
 * place is the running sum of the three link vectors, read off the paper's
 * grid (half a link length a square). The figure opens on its point: the
 * pose before a 40-degree shoulder turn is sketched faintly on the paper,
 * and the pen has inked the arc its hand swept round the shoulder while the
 * elbow and wrist rode along.
 *
 * "Turn the shoulder" and three named poses are the visible controls; the
 * elbow and wrist sliders, the exact angles and the hand's coordinates sit
 * in "Adjust more". The arm eases to each new pose and the pen inks as it
 * goes; reduced motion jumps. The faint sketch always shows the pose before
 * the reader's last move.
 */

/** The shoulder turns through the half of the table in front of its column. */
export const SHOULDER_RANGE_DEG = [0, 180] as const;
/** The sketch at load: the opening pose with the shoulder 40 degrees back. */
const OPENING_GHOST: readonly number[] = [DEFAULT_ANGLES_DEG[0] - 40, DEFAULT_ANGLES_DEG[1], DEFAULT_ANGLES_DEG[2]];
/** Moves on one control closer together than this are one gesture. */
const GESTURE_GAP_MS = 600;
/** How quickly the arm eases to a new pose, in seconds. */
const EASE_S = 0.32;
const REACH = totalReach(LINK_LENGTHS);

type PoseId = 'up' | 'out' | 'tuck';
const POSES: readonly (Preset<PoseId> & { angles: readonly number[] })[] = [
  { id: 'up', label: 'Reach up', angles: [95, -10, -5] },
  { id: 'out', label: 'Reach out', angles: [30, -20, -10] },
  { id: 'tuck', label: 'Tuck in', angles: [100, -140, -60] },
];

/** Signed fixed-point readout: "+0.42" / "-1.03". */
function formatSigned(v: number): string {
  const s = v.toFixed(2);
  return s.startsWith('-') ? s : `+${s}`;
}

const samePose = (a: readonly number[], b: readonly number[]) => a.every((v, i) => v === b[i]);

/** The stage readout in plain words, for the pose the arm is drawn in. */
export function readoutFor(angles: readonly number[]): string {
  const { x, y } = planarForwardKinematics(LINK_LENGTHS, angles).effector;
  const across = Math.abs(x) < 0.005 ? 'level with the shoulder' : `${Math.abs(x).toFixed(2)} ${x < 0 ? 'left' : 'right'}`;
  const out = Math.abs(y) < 0.005 ? 'level' : `${Math.abs(y).toFixed(2)} ${y < 0 ? 'back' : 'out'}`;
  return `Shoulder ${Math.round(angles[0])} degrees · hand ${across}, ${out}`;
}

/** The figure's moving parts, grouped so the arm's links and pen keep their test ids. */
function ArmView({ parts }: { parts: Part[] }): ReactNode {
  const groups: { id?: string; parts: Part[] }[] = [];
  for (const part of parts) {
    const last = groups[groups.length - 1];
    if (last && last.id === part.id) last.parts.push(part);
    else groups.push({ id: part.id, parts: [part] });
  }
  return groups.map((group, g) => (
    <g key={`${group.id ?? 'part'}-${g}`} data-testid={group.id ? `fk-${group.id}` : undefined}>
      {group.parts.map((part, n) => (part.kind === 'slot' ? null : <PartView key={n} part={part} />))}
    </g>
  ));
}

export function PlanarFkArm({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const [angles, setAngles] = useState<readonly number[]>([...DEFAULT_ANGLES_DEG]);
  const [ghost, setGhost] = useState<readonly number[]>(OPENING_GHOST);
  /** The pose the arm is drawn in: it eases toward `angles`. */
  const [shown, setShown] = useState<readonly number[]>(angles);
  const lastMove = useRef({ control: '', at: -Infinity });
  /** The drawn pose as the loop last wrote it (only touched in handlers and the loop). */
  const drawn = useRef<readonly number[]>(angles);

  // Ease the drawn arm toward the chosen pose; under reduced motion the first frame jumps there.
  useEffect(() => {
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      const share = typeof window.matchMedia === 'function' && asksForStillness() ? 1 : 1 - Math.exp(-dt / EASE_S);
      let moving = false;
      const next = drawn.current.map((value, i) => {
        const target = angles[i];
        const eased = value + (target - value) * share;
        if (Math.abs(target - eased) < 0.05) return target;
        moving = true;
        return eased;
      });
      if (!samePose(next, drawn.current)) {
        drawn.current = next;
        setShown(next);
      }
      if (moving) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [angles]);


  const { effector } = planarForwardKinematics(LINK_LENGTHS, angles);
  const turnDeg = angles[0] - ghost[0];
  const onlyShoulderTurned = turnDeg !== 0 && angles[1] === ghost[1] && angles[2] === ghost[2];
  const pose = POSES.find((p) => samePose(p.angles, angles))?.id ?? null;
  const sketch = samePose(ghost, angles) ? null : ghostFor(ghost);
  const ink = onlyShoulderTurned && Math.abs(turnDeg) >= 3 ? inkFor(ghost, [shown[0], ghost[1], ghost[2]]) : null;

  /** Moves the arm; the faint sketch keeps the pose from before this gesture. */
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
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Turn the shoulder: the elbow, wrist and pen ride along"
          readout={readoutFor(shown)}
          status="Schematic: one grid square is half a link"
          data-testid="fk-stage-frame"
        >
          <Stage className="iso-stage">
            <svg
              className="iso-svg"
              viewBox={VIEW_BOX}
              role="img"
              focusable="false"
              aria-label={`Robot arm with three joints on a post. Shoulder ${angles[0]} degrees, elbow ${angles[1]} degrees, wrist ${angles[2]} degrees; the hand is at x ${x}, y ${y} link units from the shoulder.`}
              aria-describedby={descriptionId}
            >
              {PARTS.map((part, index) => {
                if (part.kind !== 'slot') return <PartView key={index} part={part} />;
                if (part.slot === 'ghost') {
                  return sketch ? (
                    <g key="ghost" data-testid="fk-ghost" data-pose={ghost.join(' ')}>
                      <Line d={sketch.links} tone="lo" />
                      <Line d={sketch.rings} tone="lo" />
                    </g>
                  ) : null;
                }
                if (part.slot === 'ink') {
                  return ink ? (
                    <g key="ink" data-testid="fk-swing" data-radius={ink.radius.toFixed(3)}>
                      <Line d={ink.arc} tone="hi" />
                      <Dots points={[ink.start]} size={1.3} tone="hi" />
                    </g>
                  ) : null;
                }
                return (
                  <g key="arm" data-testid="fk-arm" data-pose={shown.map((a) => a.toFixed(1)).join(' ')}>
                    <ArmView parts={armParts(shown)} />
                  </g>
                );
              })}
            </svg>
          </Stage>
        </AnatomyStage>
      }
      caption="A robot works out where its hand is by adding up each joint's turn, from shoulder to fingertip."
      method={
        <>
          <p>
            Computed on chosen link lengths of 1.00, 0.75 and 0.55 link units, so the hand reaches at most{' '}
            {REACH.toFixed(2)} from the shoulder. Each angle is measured from the link before it, anticlockwise
            positive, and the hand&apos;s position is the running sum of the three link vectors. The shoulder turns
            from 0 degrees (pointing right) to 180 (pointing left); the elbow and wrist turn up to 180 degrees either
            way. In the drawing each joint&apos;s dial rides on the link before it and the next link is its pointer;
            the shoulder&apos;s dial is the protractor on the paper, and one grid square is half a link unit. The
            faint sketch on the paper is the pose before the last move; at load it is the opening pose with the
            shoulder 40 degrees back, and the inked arc is the path the pen swept while only the shoulder turned.
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
