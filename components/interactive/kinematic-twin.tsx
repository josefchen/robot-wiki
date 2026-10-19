'use client';

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  SliderRow,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid, Wire } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import {
  HEIGHT,
  PARTS,
  WIDTH,
  leaderGrip,
  leaderParts,
  leaderWristAt,
  robotParts,
  type ArmPart,
} from '@/components/iso/figures/twin-arm-bench';
import {
  ELBOW_RANGE,
  LEADER_LINKS,
  REACH_POSE,
  RUN_SECONDS,
  SHOULDER_RANGE,
  STILL_POSE,
  clampPose,
  commandFor,
  degrees,
  poseFor,
  readoutFor,
  runAt,
  valueTextFor,
  type Pose,
} from '@/lib/kinematic-twin';

/**
 * KinematicTwin: why a leader arm that twins the robot records clean
 * demonstrations, for the teleop-rigs guide, drawn as a twin-arm bench
 * (components/iso/figures/twin-arm-bench.ts).
 *
 * GELLO, like ALOHA's leader arm, is a smaller replica of the robot it
 * drives, so each joint's reading is sent to the robot's same joint as it
 * is (lib/kinematic-twin.ts). On the bench the leader's handle is the one lit
 * part; each arm's shoulder and elbow carry the same dial. Drag the handle,
 * set the leader's joints with the sliders, or "Move the leader", and the
 * robot follows a moment later, joint for joint. The still pose shows the
 * point: two arms of different sizes in one pose, their dials reading the
 * same. Reduced motion makes every move a jump.
 */

/** How quickly the leader's joints follow the reader's hand, and the robot's follow the leader's (servo lag), in seconds. */
const HAND_SECONDS = 0.1;
const SERVO_SECONDS = 0.14;
/** How close to the handle, in viewBox units, a press must land to take hold of it. */
const GRIP_REACH = 30;

const tenth = (value: number) => Math.round(value * 10) / 10;
const near = (a: Pose, b: Pose) => Math.abs(a.shoulder - b.shoulder) < 0.02 && Math.abs(a.elbow - b.elbow) < 0.02;
const follow = (from: Pose, to: Pose, dt: number, seconds: number): Pose => {
  const k = 1 - Math.exp(-dt / seconds);
  return { shoulder: from.shoulder + (to.shoulder - from.shoulder) * k, elbow: from.elbow + (to.elbow - from.elbow) * k };
};
const calm = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();

function PartView({ part }: { part: ArmPart }): ReactNode {
  if (part.kind === 'solid') {
    return <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <g dangerouslySetInnerHTML={{ __html: part.inner }} /> : undefined} />;
  }
  if (part.kind === 'line') {
    const line = <Line d={part.d} tone={part.tone} free={part.free} />;
    return part.weight ? <g style={{ ['--anatomy-weight' as string]: `${part.weight}px` } as CSSProperties}>{line}</g> : line;
  }
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  return <Wire from={part.from} to={part.to} via={part.via} tone={part.tone} />;
}

export function KinematicTwin({ className }: { className?: string }) {
  const shoulderId = useId();
  const elbowId = useId();
  const drawingId = `${useId()}-drawing`;
  /** Where the reader has set the leader (sliders, drag, the run's end). */
  const [target, setTarget] = useState<Pose>(STILL_POSE);
  /** The two arms as drawn now: the leader eases toward the target, the robot toward the leader's readings. */
  const [arms, setArms] = useState<{ leader: Pose; robot: Pose }>({ leader: STILL_POSE, robot: STILL_POSE });
  const [running, setRunning] = useState(false);
  const live = useRef({ target: STILL_POSE, leader: STILL_POSE, robot: STILL_POSE, runFrom: STILL_POSE, runStart: 0, running: false });
  const frame = useRef(0);
  const grab = useRef<{ id: number; offset: [number, number] } | null>(null);
  const svgHost = useRef<HTMLDivElement>(null);

  const tick = useCallback(function step(now: number, last: number) {
    const s = live.current;
    const dt = Math.min((now - last) / 1000, 1 / 30);
    const still = calm();
    if (s.running) {
      const share = Math.min(1, (now - s.runStart) / (RUN_SECONDS * 1000));
      s.leader = runAt(s.runFrom, share);
      if (share >= 1) {
        s.running = false;
        s.target = s.leader;
        setTarget(s.leader);
        setRunning(false);
      }
    } else {
      s.leader = still ? s.target : follow(s.leader, s.target, dt, HAND_SECONDS);
      if (near(s.leader, s.target)) s.leader = s.target;
    }
    // The robot is sent the leader's readings as they are, and its servos follow them.
    const command = commandFor(s.leader);
    s.robot = still ? command : follow(s.robot, command, dt, SERVO_SECONDS);
    if (near(s.robot, command)) s.robot = command;
    setArms({ leader: s.leader, robot: s.robot });
    // near() snaps each arm onto its target, so the loop stops once both have arrived.
    const moving = s.running || s.leader !== s.target || s.robot !== command;
    frame.current = moving ? requestAnimationFrame((t) => step(t, now)) : 0;
  }, []);

  const kick = useCallback(() => {
    if (frame.current) return;
    const start = performance.now();
    frame.current = requestAnimationFrame((t) => tick(t, start));
  }, [tick]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const setLeader = (pose: Pose) => {
    const next = clampPose(pose);
    const s = live.current;
    s.running = false;
    s.target = next;
    setRunning(false);
    setTarget(next);
    // Reduced motion: both arms jump, the robot with no lag.
    if (calm()) {
      s.leader = next;
      s.robot = commandFor(next);
      setArms({ leader: s.leader, robot: s.robot });
      return;
    }
    kick();
  };

  const viewPoint = (event: ReactPointerEvent): [number, number] | null => {
    const svg = svgHost.current?.querySelector('svg');
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return [point.x, point.y];
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = viewPoint(event);
    if (!point) return;
    const grip = leaderGrip(live.current.leader);
    if (Math.hypot(point[0] - grip[0], point[1] - grip[1]) > GRIP_REACH) return;
    const at = leaderWristAt(point);
    const wrist = leaderWristAt(grip);
    grab.current = { id: event.pointerId, offset: [wrist[0] - at[0], wrist[1] - at[1]] };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!grab.current || grab.current.id !== event.pointerId) return;
    const point = viewPoint(event);
    if (!point) return;
    const at = leaderWristAt(point);
    setLeader(poseFor(LEADER_LINKS, [at[0] + grab.current.offset[0], at[1] + grab.current.offset[1]]));
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (grab.current?.id === event.pointerId) grab.current = null;
  };

  const reading = degrees(arms.leader);
  const sent = degrees(commandFor(target));
  const valueText = valueTextFor(target);

  return (
    <InstrumentFigure
      figureId="kinematic-twin"
      className={className}
      kicker="Kinematic twin"
      heading="The robot copies the leader arm joint for joint"
      controls={
        <>
          <SliderRow htmlFor={shoulderId} label="Leader's shoulder" value={<span data-testid="twin-shoulder">{sent.shoulder} degrees</span>}>
            <input
              id={shoulderId}
              type="range"
              data-brand-control-id="control:input"
              min={SHOULDER_RANGE[0]}
              max={SHOULDER_RANGE[1]}
              step={1}
              value={sent.shoulder}
              onChange={(e) => setLeader({ ...target, shoulder: Number(e.target.value) })}
              aria-valuetext={valueText}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </SliderRow>
          <SliderRow htmlFor={elbowId} label="Leader's elbow" value={<span data-testid="twin-elbow">{sent.elbow} degrees</span>}>
            <input
              id={elbowId}
              type="range"
              data-brand-control-id="control:input"
              min={ELBOW_RANGE[0]}
              max={ELBOW_RANGE[1]}
              step={1}
              value={sent.elbow}
              onChange={(e) => setLeader({ ...target, elbow: Number(e.target.value) })}
              aria-valuetext={valueText}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </SliderRow>
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            onClick={() => {
              const s = live.current;
              if (s.running) {
                setLeader(degrees(s.leader));
                return;
              }
              // Reduced motion jumps to where the run ends instead of playing it.
              if (calm()) {
                setLeader(REACH_POSE);
                return;
              }
              s.runFrom = s.leader;
              s.runStart = performance.now();
              s.running = true;
              setRunning(true);
              kick();
            }}
            data-testid="twin-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop the leader' : 'Move the leader'}
          </button>
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Drag the lit handle; the robot copies each joint"
          readout={readoutFor(arms.leader)}
          status="Schematic: the copy is exact; sizes, stops and the run are illustrative"
          data-testid="twin-stage-frame"
        >
          <div
            ref={svgHost}
            data-testid="twin-drawing"
            data-leader={`${tenth(arms.leader.shoulder)},${tenth(arms.leader.elbow)}`}
            data-robot={`${tenth(arms.robot.shoulder)},${tenth(arms.robot.elbow)}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ touchAction: 'pan-y' }}
          >
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              describedBy={drawingId}
              label={`A small printed leader arm clamped to a bench beside the robot arm it drives, with the same joints. Each arm's shoulder and elbow carries a dial. The leader's shoulder reads ${reading.shoulder} degrees and its elbow ${reading.elbow} degrees, and the robot's dials read the same.`}
            >
              {PARTS.map((part, index) => {
                if (part.kind !== 'slot') return <PartView key={index} part={part} />;
                const list = part.slot === 'robot' ? robotParts(arms.robot) : leaderParts(arms.leader);
                return (
                  <g key={part.slot} data-part={part.slot}>
                    {list.map((child, n) => (
                      <PartView key={n} part={child} />
                    ))}
                  </g>
                );
              })}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="A leader arm built as a smaller twin of the robot sends its joint readings straight through, so the robot copies every joint."
      method={
        <>
          <p>
            GELLO is a scaled replica of the arm it drives, built from 3D-printed links and off-the-shelf motors, so
            each joint&apos;s reading maps one to one onto the robot&apos;s command for the same joint, with no
            translation in between. ALOHA&apos;s leader arm twins its follower the same way, which is why its
            demonstrations arrive already in the robot&apos;s joint space. The price of the match is that every new
            arm needs its own replica: GELLO&apos;s published designs cover Franka, UR5 and xArm.
          </p>
          <p id={drawingId}>
            The drawing is a leader and its robot on one bench. Both have a shoulder, an elbow and a wrist that keeps
            the hand pointing down, in the same order, and every link of the small printed leader is the same share of
            the robot&apos;s. Each shoulder and elbow faces you with a dial zeroed the same way on both arms: the
            shoulder&apos;s reads up from level, the elbow&apos;s reads the bend down from the upper arm. The lit
            handle is what the operator holds. The controller at the back passes the leader&apos;s readings to the
            robot unchanged, so the robot&apos;s dials always settle on the leader&apos;s, and its hand traces the
            leader&apos;s path at the robot&apos;s size.
          </p>
          <p>
            Schematic: a real arm has six or seven joints, and the drawing shows three. The leader&apos;s size, the
            joint stops, the run and the robot&apos;s short lag behind the leader are illustrative; the copy from
            leader to robot is exact.
          </p>
        </>
      }
      source="Wu and colleagues, GELLO (2023); Zhao and colleagues, ALOHA (2023)."
    />
  );
}
