'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  PresetGroup,
  SliderRow,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid, Wire } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { HEIGHT, PARTS, PEN_LIFT_UNITS, WIDTH, movingAt, type LivePart, type Slot } from '@/components/iso/figures/turret-plotter';
import {
  ANGLE_RANGE,
  FRAMES,
  STILL_ANGLE,
  STILL_FRAME,
  endFor,
  gapCm,
  readoutFor,
  replayAt,
  settledPen,
  tenthCm,
  valueTextFor,
  wholeDegrees,
  type FrameId,
  type PenPose,
} from '@/lib/delta-frame';

/**
 * DeltaFrame: why an end-effector delta means nothing until its frame is
 * named, for the robot-learning roadmap's first stage, drawn as a turret
 * plotter (components/iso/figures/turret-plotter.ts).
 *
 * A demonstration recorded "5 cm forward" in the tool's frame, with the tool
 * turned, and left its stroke on the paper. A replay reads the same numbers
 * in the tool's frame (its ink runs down the stroke) or in the table's frame
 * (its ink runs along the rails and ends off the stroke by the chord between
 * the two moves, lib/delta-frame.ts). The ink is the one lit part. The slider
 * turns the tool; at 0 degrees both readings agree, which is why the mistake
 * hides there. A change of frame, or "Replay the move", replays it, and the
 * arm then parks at the end of its rail so neither stroke is hidden under it;
 * reduced motion jumps to the result.
 */

function PartView({ part }: { part: LivePart }): ReactNode {
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

/** The static drawing between the live slots, built once. */
const RUNS: Array<{ slot: Slot } | { parts: ReactNode }> = (() => {
  const runs: Array<{ slot: Slot } | { parts: ReactNode }> = [];
  let current: ReactNode[] = [];
  PARTS.forEach((part, index) => {
    if (part.kind === 'slot') {
      runs.push({ parts: <g key={`static-${index}`}>{current}</g> });
      runs.push({ slot: part.slot });
      current = [];
      return;
    }
    current.push(<PartView key={index} part={part} />);
  });
  runs.push({ parts: <g key="static-end">{current}</g> });
  return runs;
})();

const calm = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();
const r2 = (value: number) => Number(value.toFixed(2));

/** The readout for the pen's moment of a replay. */
function readoutNow(frame: FrameId, angle: number, pen: PenPose) {
  if (pen.phase === 'return') return 'Pen back to the start';
  if (pen.phase === 'move') return 'Replaying 5 cm forward';
  return readoutFor(frame, angle);
}

export function DeltaFrame({ className }: { className?: string }) {
  const angleId = useId();
  const drawingId = `${useId()}-drawing`;
  const [frame, setFrame] = useState<FrameId>(STILL_FRAME);
  const [angle, setAngle] = useState(STILL_ANGLE);
  const [pen, setPen] = useState<PenPose>(settledPen());
  const [replay, setReplay] = useState<{ frame: FrameId; angle: number; from: [number, number]; start: number } | null>(null);
  const penRef = useRef(pen);

  useEffect(() => {
    if (!replay) return;
    let frameId = 0;
    const tick = (now: number) => {
      const t = Math.max(0, (now - replay.start) / 1000);
      const next = replayAt(replay.frame, replay.angle, t, replay.from);
      penRef.current = next;
      setPen(next);
      if (next.phase !== 'done') frameId = requestAnimationFrame(tick);
      else setReplay(null);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [replay]);

  const settle = () => {
    penRef.current = settledPen();
    setPen(penRef.current);
    setReplay(null);
  };

  const play = (nextFrame: FrameId, nextAngle: number) => {
    // Reduced motion jumps to the replay's result instead of playing it.
    if (calm()) settle();
    else setReplay({ frame: nextFrame, angle: nextAngle, from: penRef.current.at, start: performance.now() });
  };

  const chooseFrame = (next: FrameId) => {
    setFrame(next);
    play(next, angle);
  };

  const turn = (value: number) => {
    const next = Math.min(ANGLE_RANGE[1], Math.max(ANGLE_RANGE[0], value));
    setAngle(next);
    // Turning the tool shows the result for the new angle at once: the stroke turns with it.
    settle();
  };

  const running = replay !== null;
  const end = endFor(frame, angle);
  const slots = useMemo<Record<Slot, ReactNode>>(() => {
    const live = movingAt({ angle, pen: pen.at, lift: pen.down ? 0 : PEN_LIFT_UNITS, inkTo: replay ? endFor(replay.frame, replay.angle) : end, inked: pen.inked });
    const group = (slot: Slot) => (
      <g key={slot} data-part={slot}>
        {live[slot].map((part, n) => (
          <PartView key={n} part={part} />
        ))}
      </g>
    );
    return { demo: group('demo'), ink: group('ink'), bridge: group('bridge') };
  }, [angle, pen, replay, end]);

  const gap = tenthCm(gapCm(frame, angle));
  const degrees = wholeDegrees(angle);

  return (
    <InstrumentFigure
      figureId="delta-frame"
      className={className}
      kicker="Expressed-in frame"
      heading="Read in the wrong frame, the same move misses"
      controls={
        <>
          <PresetGroup<FrameId> label="Read the move in" presets={FRAMES} value={frame} onChange={chooseFrame} testId="delta-frame" />
          <SliderRow htmlFor={angleId} label="Tool turned" value={<span data-testid="delta-frame-angle">{degrees} degrees</span>}>
            <input
              id={angleId}
              type="range"
              data-brand-control-id="control:input"
              min={ANGLE_RANGE[0]}
              max={ANGLE_RANGE[1]}
              step={5}
              value={degrees}
              onChange={(e) => turn(Number(e.target.value))}
              aria-valuetext={valueTextFor(frame, angle)}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </SliderRow>
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            onClick={() => {
              if (running) {
                settle();
                return;
              }
              play(frame, angle);
            }}
            data-testid="delta-frame-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop the replay' : 'Replay the move'}
          </button>
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Dark stroke: the demonstration. Blue ink: the replay"
          readout={readoutNow(frame, angle, pen)}
          status="The move and the angles are illustrative; the geometry is exact"
          data-testid="delta-frame-stage-frame"
        >
          <div data-testid="delta-frame-drawing" data-frame={frame} data-angle={degrees} data-pen={`${r2(pen.at[0])},${r2(pen.at[1])}`} data-phase={pen.phase} data-gap={gap}>
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              describedBy={drawingId}
              label={`A pen plotter whose tool is turned ${degrees} degrees on its turret. A dark stroke on the squared paper is the demonstration, 5 centimetres along the tool. The blue ink is the replay of the same move read in the ${
                frame === 'tool' ? "tool's frame, running down the stroke" : `table's frame, running along the rails and ending ${gap === 0 ? 'on the stroke' : `${gap} centimetres off it`}`
              }.`}
            >
              {RUNS.map((run) => ('slot' in run ? slots[run.slot] : run.parts))}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="A demonstration recorded 5 cm forward in the tool's frame. Read in the table's frame, the replay misses once the tool is turned."
      method={
        <>
          <p>
            An end-effector delta is a few numbers, and numbers alone do not say which way they point. Tedrake asks
            that every time a position is written as a vector of numbers, the frame it is expressed in be named; Lynch
            and Park write the same motion either in the fixed space frame or in the moving body frame. A dataset
            that stores deltas in the tool&apos;s frame and a controller that reads them in the table&apos;s frame
            disagree whenever the tool is turned, and the replay looks like a careless policy.
          </p>
          <p id={drawingId}>
            The drawing is a pen plotter. The rail along the back and the paper&apos;s squares are the table&apos;s
            frame. The tool hangs from a turret under the pen carriage, a gripper whose two fingers point along its
            own forward direction; the knob on the carriage reads how far it is turned. A demonstration moved 5 cm
            forward in the tool&apos;s frame and left the dark stroke along the fingers. The blue ink is a replay of
            the same two numbers: read in the tool&apos;s frame it runs down the stroke; read in the table&apos;s frame
            it runs along the rail and ends off the stroke. After each replay the pen lifts and the arm parks at the end
            of its rail, so both strokes stay in view. Square to the table, the two agree, so the mistake hides until
            the tool turns.
          </p>
          <p>
            The move&apos;s length and the angles are illustrative. The miss is exact: the chord between the two
            moves, twice 5 cm times the sine of half the angle.
          </p>
        </>
      }
      source="Tedrake, Robotic Manipulation (2026); Lynch and Park, Modern Robotics (2017)."
    />
  );
}
