'use client';

import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { INSTRUMENT_SECONDARY_CONTROL_CLASS, InstrumentFigure, PresetGroup, type Preset } from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import {
  HEIGHT,
  PARTS,
  STILL_POSE,
  TASK_SECONDS,
  TIP_Z,
  WIDTH,
  clampTip,
  followAim,
  inView,
  lookAt,
  movingAt,
  planeAt,
  taskTipAt,
  type Part,
  type Pose,
} from '@/components/iso/figures/lap-trainer';

/**
 * ScopeFollow: Level 1 autonomy in surgery, for the adjacent/surgical module,
 * drawn as a laparoscopic box trainer (components/iso/figures/lap-trainer.ts).
 *
 * Moon Surgical's ScoPilot lets the laparoscope held by its Maestro arm follow
 * an instrument tip on demand, while the surgeon's hands stay on the
 * instruments. Two instruments, the surgeon's, enter the trainer through two
 * ports; a robot arm holds the scope in a third. The scope's pool of light on
 * the peg board, the one lit part, is what the camera sees. With following on,
 * the arm keeps the pool on the right instrument's tip; with it off, the scope
 * stays where it was put. The still pose shows following on, the pool round the
 * tip. "Run the drill" moves the tip to three pegs in turn; dragging on the board
 * moves it by hand. Reduced motion makes every move a jump.
 */

export type CameraMode = 'placed' | 'follow';

export const CAMERA_MODES: readonly Preset<CameraMode>[] = [
  { id: 'placed', label: 'Surgeon places it' },
  { id: 'follow', label: 'Follows the tip' },
];

/** How quickly a dragged tip follows the pointer (seconds). */
const DRAG_SECONDS = 0.12;

/** The readout, in words, for a mode and whether the tip is in the picture. */
export function readoutFor(mode: CameraMode, seen: boolean) {
  const view = seen ? 'tip in view' : 'tip out of view';
  return mode === 'follow' ? `Follows the tip · ${view} · Level 1` : `Held still · ${view} · Level 0`;
}

function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }): ReactNode {
  if (part.kind === 'solid') {
    return <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined} />;
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.fill === 'paper') return <path className="iso-fill" d={part.d} />;
  if (part.fill === 'top') return <path className="iso-top" d={part.d} />;
  return <path className="iso-shade" data-shade={part.fill} d={part.d} />;
}

const r1 = (value: number) => Number(value.toFixed(1));
const toward = (from: number, to: number, dt: number, seconds: number) => to + (from - to) * Math.exp(-dt / seconds);

export function ScopeFollow({ className }: { className?: string }) {
  const drawingId = `${useId()}-drawing`;
  const [mode, setMode] = useState<CameraMode>('follow');
  const [pose, setPose] = useState<Pose>(STILL_POSE);
  const [running, setRunning] = useState(false);
  const [moving, setMoving] = useState(false);
  /** The live state the frame loop reads: the mode, the drill's clock, and where a drag wants the tip. */
  const live = useRef({ mode: 'follow' as CameraMode, pose: STILL_POSE, runAt: -1, runFrom: STILL_POSE.tip, drag: null as null | { id: number; target: [number, number, number] } });
  const host = useRef<HTMLDivElement>(null);
  const seen = inView(pose.aim, pose.tip);

  // One frame loop while the drill runs, a drag moves the tip, or the scope is still turning toward it.
  useEffect(() => {
    if (!moving) return;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      const state = live.current;
      let tip = state.pose.tip;
      if (state.runAt >= 0) {
        state.runAt += dt;
        tip = taskTipAt(state.runAt, state.runFrom);
      } else if (state.drag) {
        const goal = state.drag.target;
        tip = [toward(tip[0], goal[0], dt, DRAG_SECONDS), toward(tip[1], goal[1], dt, DRAG_SECONDS), TIP_Z];
      }
      let aim = state.pose.aim;
      if (state.mode === 'follow') aim = followAim(aim, tip, dt);
      state.pose = { tip, aim };
      setPose(state.pose);
      const runDone = state.runAt >= TASK_SECONDS;
      if (runDone) {
        state.runAt = -1;
        setRunning(false);
      }
      const goal = state.mode === 'follow' ? lookAt(tip) : aim;
      const settled = Math.hypot(aim[0] - goal[0], aim[1] - goal[1]) < 0.02;
      const dragSettled = !state.drag || Math.hypot(tip[0] - state.drag.target[0], tip[1] - state.drag.target[1]) < 0.02;
      if (state.runAt < 0 && settled && dragSettled) {
        setMoving(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [moving]);

  /** Jump the whole figure to a pose (reduced motion), or let the loop ease toward it. */
  const settleTo = (next: Pose) => {
    live.current.pose = next;
    setPose(next);
  };
  const still = () => typeof window.matchMedia === 'function' && asksForStillness();

  const chooseMode = (next: CameraMode) => {
    setMode(next);
    live.current.mode = next;
    if (next === 'follow') {
      if (still()) settleTo({ tip: live.current.pose.tip, aim: lookAt(live.current.pose.tip) });
      else setMoving(true);
    }
  };

  const pointOf = (event: ReactPointerEvent): [number, number, number] | null => {
    const svg = host.current?.querySelector('svg');
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return clampTip(planeAt([point.x, point.y], TIP_Z));
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = pointOf(event);
    if (!target) return;
    live.current.runAt = -1;
    setRunning(false);
    live.current.drag = { id: event.pointerId, target };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (still()) {
      const tip = target;
      settleTo({ tip, aim: live.current.mode === 'follow' ? lookAt(tip) : live.current.pose.aim });
    } else setMoving(true);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = live.current.drag;
    if (!drag || drag.id !== event.pointerId) return;
    const target = pointOf(event);
    if (!target) return;
    drag.target = target;
    if (still()) settleTo({ tip: target, aim: live.current.mode === 'follow' ? lookAt(target) : live.current.pose.aim });
    else setMoving(true);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (live.current.drag?.id === event.pointerId) live.current.drag = null;
  };

  const parts = movingAt(pose);

  return (
    <InstrumentFigure
      figureId="scope-follow"
      className={className}
      kicker="Camera following"
      heading="At Level 1 the robot takes over only the camera"
      controls={
        <>
          <PresetGroup label="Camera" presets={CAMERA_MODES} value={mode} onChange={chooseMode} testId="scope-mode" />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            onClick={() => {
              if (running) {
                live.current.runAt = -1;
                setRunning(false);
                return;
              }
              live.current.drag = null;
              live.current.runFrom = live.current.pose.tip;
              if (still()) {
                const tip = taskTipAt(TASK_SECONDS, live.current.runFrom);
                settleTo({ tip, aim: live.current.mode === 'follow' ? lookAt(tip) : live.current.pose.aim });
                return;
              }
              live.current.runAt = 0;
              setRunning(true);
              setMoving(true);
            }}
            data-testid="scope-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop the drill' : 'Run the drill'}
          </button>
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Drag on the board to move the right instrument"
          readout={readoutFor(mode, seen)}
          status="Schematic: an illustrative trainer and drill"
          data-testid="scope-stage-frame"
        >
          <div
            ref={host}
            data-testid="scope-drawing"
            data-mode={mode}
            data-seen={seen ? 'yes' : 'no'}
            data-tip={`${r1(pose.tip[0])},${r1(pose.tip[1])}`}
            data-aim={`${r1(pose.aim[0])},${r1(pose.aim[1])}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="cursor-crosshair touch-pan-y"
          >
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              label={`A laparoscopic box trainer on a bench: two instruments enter through ports over a peg board, and a robot arm holds the laparoscope in a third port; its lit pool of light on the board is what the camera sees. ${
                mode === 'follow' ? 'The arm keeps the scope aimed at the right instrument tip.' : 'The scope stays where the surgeon put it.'
              } The tip is ${seen ? 'in' : 'out of'} view.`}
              describedBy={drawingId}
            >
              {PARTS.map((part, index) => {
                if (part.kind !== 'slot') return <PartView key={index} part={part} />;
                return (
                  <g key={part.slot} data-part={part.slot}>
                    {parts[part.slot].map((child, n) => (child.kind === 'slot' ? null : <PartView key={n} part={child} />))}
                  </g>
                );
              })}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="ScoPilot lets the robot keep the laparoscope on the instrument tip. The surgeon still moves every instrument."
      method={
        <>
          <p>
            Yang and colleagues place a robot that assists under the surgeon&apos;s continuous control at Level 1, one
            step above a teleoperated system that only follows the surgeon&apos;s hands. Moon Surgical&apos;s ScoPilot,
            cleared in March 2025, is such a step: on demand, the laparoscope held by its Maestro arm follows a chosen
            instrument tip, and the surgeon steers the view without letting go of the instruments.
          </p>
          <p id={drawingId}>
            The drawing is a box trainer on a bench. Two instruments, the surgeon&apos;s hands, enter through ports in
            the soft pad over the peg board, and a laparoscope enters through a third, clamped to a two-link robot arm
            on a column. The pale pool on the board, lit, is what the scope sees. Every port is a fixed pivot, so each
            outside end swings opposite its tip. With following on, the arm turns the scope about its port to keep the
            pool on the right instrument&apos;s tip; with it off, the scope stays where it was put, and the tip can
            leave the picture.
          </p>
          <p>
            Schematic: the trainer, the drill and the arm are illustrative, and no number is claimed. How ScoPilot
            finds the tip is not drawn; the arm here simply aims the scope at it.
          </p>
        </>
      }
      source="Camera following: Moon Surgical's ScoPilot clearance (2025). Level 1 assistance: Yang et al., Science Robotics (2017)."
    />
  );
}
