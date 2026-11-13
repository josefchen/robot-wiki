'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { INSTRUMENT_SECONDARY_CONTROL_CLASS, InstrumentFigure, PresetGroup } from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid, Wire } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { HEIGHT, PARTS, WIDTH, benchPose, movingAt, type LivePart, type Slot } from '@/components/iso/figures/two-easel-bench';
import {
  COPIES,
  STILL_COPY,
  doneState,
  drawAt,
  readoutAt,
  strayCm,
  tenthCm,
  type CopyId,
  type DrawState,
} from '@/lib/hand-motion-share';

/**
 * HandMotionShare: why people and robots can share actions written as the
 * hand's motion and not as joint angles, for the cross-embodiment article,
 * drawn as a two-easel bench (components/iso/figures/two-easel-bench.ts).
 *
 * A mannequin arm draws a check mark on its easel; a robot arm with shorter
 * links copies it on the other, through a copy box whose lever picks what is
 * sent (lib/hand-motion-share.ts). The person's joint angles, copied as they
 * are, put the robot's pen on a smaller, skewed stroke; the hand's motion
 * from the stroke's start, for which the robot finds its own angles, draws
 * the same check mark. The robot's ink is the one lit part; the faint check
 * mark on its sheet is the person's, placed at the robot's start. Changing
 * the lever, or "Draw the stroke", draws it again; reduced motion jumps to
 * the finished strokes.
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
const LEVER_SECONDS = 0.5;

type Drawing = { copy: CopyId; from: { human: DrawState['human']; robot: DrawState['robot'] }; lever: [number, number]; start: number } | null;

export function HandMotionShare({ className }: { className?: string }) {
  const drawingId = `${useId()}-drawing`;
  const [copy, setCopy] = useState<CopyId>(STILL_COPY);
  const [state, setState] = useState<DrawState>(doneState(STILL_COPY));
  const [lever, setLever] = useState(STILL_COPY === 'hand' ? 1 : 0);
  const [drawing, setDrawing] = useState<Drawing>(null);
  const stateRef = useRef(state);
  const leverRef = useRef(lever);

  useEffect(() => {
    if (!drawing) return;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.max(0, (now - drawing.start) / 1000);
      const next = drawAt(drawing.copy, t, drawing.from);
      const u = Math.min(1, t / LEVER_SECONDS);
      const leverAt = drawing.lever[0] + (drawing.lever[1] - drawing.lever[0]) * u * u * (3 - 2 * u);
      stateRef.current = next;
      leverRef.current = leverAt;
      setState(next);
      setLever(leverAt);
      if (next.phase !== 'done') frame = requestAnimationFrame(tick);
      else setDrawing(null);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [drawing]);

  const finish = (next: CopyId) => {
    stateRef.current = doneState(next);
    leverRef.current = next === 'hand' ? 1 : 0;
    setState(stateRef.current);
    setLever(leverRef.current);
    setDrawing(null);
  };

  const draw = (next: CopyId) => {
    // Reduced motion jumps to the finished strokes instead of drawing them.
    if (calm()) finish(next);
    else setDrawing({ copy: next, from: { human: stateRef.current.human, robot: stateRef.current.robot }, lever: [leverRef.current, next === 'hand' ? 1 : 0], start: performance.now() });
  };

  const choose = (next: CopyId) => {
    setCopy(next);
    draw(next);
  };

  const running = drawing !== null;
  const slots = useMemo<Record<Slot, ReactNode>>(() => {
    const strokes = benchPose(copy, state.share, state.lift, lever);
    const live = movingAt({ ...strokes, human: state.human, robot: state.robot });
    const group = (slot: Slot) => (
      <g key={slot} data-part={slot}>
        {live[slot].map((part, n) => (
          <PartView key={n} part={part} />
        ))}
      </g>
    );
    return { strokes: group('strokes'), human: group('human'), robot: group('robot'), lever: group('lever') };
  }, [copy, state, lever]);

  const stray = tenthCm(strayCm(copy));

  return (
    <InstrumentFigure
      figureId="hand-motion-share"
      className={className}
      kicker="Shared actions"
      heading="The hand's motion transfers between bodies; joint angles do not"
      controls={
        <>
          <PresetGroup<CopyId> label="The robot copies the person's" presets={COPIES} value={copy} onChange={choose} testId="hand-motion-share" />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            onClick={() => {
              if (running) {
                finish(copy);
                return;
              }
              draw(copy);
            }}
            data-testid="hand-motion-share-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop drawing' : 'Draw the stroke'}
          </button>
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Faint: the person's check mark, placed at the robot's start"
          readout={readoutAt(copy, state)}
          status="Illustrative arms; exact geometry"
          data-testid="hand-motion-share-stage-frame"
        >
          <div data-testid="hand-motion-share-drawing" data-copy={copy} data-phase={state.phase} data-share={r2(state.share)} data-stray={stray} data-lever={r2(lever)}>
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              describedBy={drawingId}
              label={`A mannequin arm draws a check mark on its easel while a robot arm with shorter links copies it on another, through a copy box set to send the person's ${
                copy === 'joints'
                  ? `joint angles. The robot's lit ink comes out smaller and skewed, straying up to ${stray} centimeters from the check mark placed at its start.`
                  : "hand motion. The robot finds its own joint angles, and its lit ink lies on the same check mark."
              }`}
            >
              {RUNS.map((run) => ('slot' in run ? slots[run.slot] : run.parts))}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="Relative hand motion keeps the same stroke across different arms; copied joint angles distort it."
      method={
        <>
          <p id={drawingId}>
            The drawing is two easels on one bench. A copy box sends the shorter robot arm either the
            person&apos;s joint angles, which skew its stroke, or the hand&apos;s motion, which lands on the faint check mark.
          </p>
        </>
      }
      source="NVIDIA, Isaac GR00T repository (2026); NVIDIA GEAR, GR00T N1.6 (2025); Zheng and colleagues, EgoScale (2026)."
    />
  );
}
