'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  SliderRow,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, Line, Solid } from '@/components/iso/react/draw';
import { Stage, asksForStillness } from '@/components/iso/react/live';
import { LiveSolid, writeSolid } from '@/components/iso/live-solid';
import {
  HEIGHT,
  IRIS_OPEN_GAP,
  PARTS,
  WIDTH,
  armDrawing,
  armFor,
  lookBetween,
  pegsFor,
  poseDirection,
  type ArmDrawing,
  type Part,
} from '@/components/iso/figures/hand-eye-bench';

/**
 * HandEyePoses: how many poses a hand-eye calibration needs, drawn as a
 * calibration bench (components/iso/figures/hand-eye-bench.ts). An arm
 * with a camera on its wrist shows a checkerboard on the bench to the
 * camera from one pose after another, and each pose taken drops a peg into
 * the pose rack along the front. With one or two poses the camera's place
 * on the wrist cannot be solved, because OpenCV needs at least two motions
 * about non-parallel axes, so three poses: the rack's groove after its
 * third hole. From three on, an iris of blades round the camera's neck
 * closes on it, showing how uncertain its estimated place still is, and it
 * barely closes further after about 12 to 15 poses (the rack's sunken
 * strip), where MoveIt reports the calibration typically plateaus.
 *
 * The iris's opening is illustrative: its gap round the camera's neck
 * shrinks with the square root of the number of motions beyond the
 * minimum, the usual least-squares behaviour. The minimum and the plateau
 * are the two cited numbers.
 *
 * The slider sets the pose count: the arm swings to that pose, a peg drops
 * into the rack and the iris closes, quickly at first and then barely.
 * Reduced motion jumps to each pose.
 */

/** OpenCV calibrateHandEye: two motions with non-parallel axes, so three poses. */
export const MIN_POSES = 3;
export const MAX_POSES = 20;
export const DEFAULT_POSES = 3;

/** How many times tighter the estimate is than with the minimum three poses. */
export const tighterThanMinimum = (poses: number) => (poses < MIN_POSES ? 0 : Math.sqrt(poses - MIN_POSES + 1));

/** The iris's gap round the camera's neck, in drawing units: wide open below the minimum, then the illustrative shrink. */
export const irisGap = (poses: number) => (poses < MIN_POSES ? IRIS_OPEN_GAP : 3.6 / tighterThanMinimum(poses));

/** What the stage says under the drawing, by how far the count has come. */
export function hintFor(poses: number): string {
  if (poses < MIN_POSES) return 'Too few poses: it needs turns about two axes';
  if (poses < 12) return 'Iris: the doubt about where the camera sits';
  return 'Past about 12 poses the iris barely closes';
}

/** Seconds the arm takes to swing from one pose to the next. */
const SWING_SECONDS = 0.55;

function BenchPart({ part }: { part: Part }) {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        crease={part.crease}
        inner={part.inner ? <Line d={part.inner} tone={part.innerTone ?? 'faint'} /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.kind === 'fill') {
    if (part.paint === 'dark') return <path className="iso-line" style={{ fill: 'var(--anatomy-lo)', stroke: 'none' }} d={part.d} />;
    return <path className="iso-shade" data-shade={part.paint} d={part.d} />;
  }
  return null;
}

type Piece = ArmDrawing['pieces'][number];
/** One live piece of the arm: its element is rewritten each frame. */
function PieceView({ piece, register }: { piece: Piece; register: (el: SVGGElement | SVGPathElement | null) => void }) {
  if (piece.kind === 'solid') return <LiveSolid ref={register} paths={piece.paths} tone={piece.tone} lit={piece.lit} />;
  if (piece.kind === 'line') return <path ref={register} className="iso-line" data-tone={piece.tone} d={piece.d} />;
  if (piece.kind === 'fill') {
    if (piece.paint === 'interior') return <path ref={register} className="iso-shade" data-shade={0} d={piece.d} />;
    if (piece.paint === 'top') return <path ref={register} className="iso-top" d={piece.d} />;
    return <path ref={register} data-testid="hand-eye-blades" style={{ fill: 'var(--anatomy-lo)', fillRule: 'evenodd', stroke: 'none' }} d={piece.d} />;
  }
  return (
    <g ref={register}>
      <path className="iso-shade" data-shade={2} d={piece.d} />
      <path className="iso-top" d={piece.shade} />
      <path className="iso-line iso-edge" data-tone="mid" d={piece.d} />
    </g>
  );
}

/** Write a drawing into the pieces' elements, in the same order. */
function writePieces(elements: Array<SVGGElement | SVGPathElement | null>, drawing: ArmDrawing) {
  drawing.pieces.forEach((piece, index) => {
    const el = elements[index];
    if (!el) return;
    if (piece.kind === 'solid') writeSolid(el as SVGGElement, piece.paths);
    else if (piece.kind === 'ball') {
      const paths = el.querySelectorAll('path');
      paths[0]?.setAttribute('d', piece.d);
      paths[1]?.setAttribute('d', piece.shade);
      paths[2]?.setAttribute('d', piece.d);
    } else el.setAttribute('d', piece.d);
  });
}

function readout(poses: number): string {
  if (poses < MIN_POSES) return `${poses} ${poses === 1 ? 'pose' : 'poses'}: too few to solve`;
  if (poses === MIN_POSES) return '3 poses: just enough to solve';
  return `${poses} poses: ${tighterThanMinimum(poses).toFixed(1)} times tighter than with 3`;
}

function describe(poses: number): string {
  if (poses < MIN_POSES) {
    return `With ${poses} ${poses === 1 ? 'pose' : 'poses'} the camera's place on the wrist cannot be solved: OpenCV needs at least 2 motions about non-parallel axes, so 3 poses, and MoveIt reports the result plateaus after about 12 or 15 samples.`;
  }
  if (poses === MIN_POSES) {
    return `With 3 poses, the minimum OpenCV requires, the camera's place on the wrist can just be solved; the illustrative uncertainty ring then tightens with more poses, and MoveIt reports the calibration typically plateaus after about 12 or 15 samples.`;
  }
  return `With ${poses} poses the illustrative uncertainty ring around the wrist camera is ${tighterThanMinimum(poses).toFixed(1)} times tighter than at the minimum of 3 poses OpenCV requires; MoveIt reports the calibration typically plateaus after about 12 or 15 samples.`;
}

const SAMPLE_POSES = [3, 6, 12, 15, 20] as const;

export function HandEyePoses({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const sliderId = `${uid}-poses`;
  const citationFor = useCitationLookup();
  const minimumSource = citationFor('opencv-hand-eye-docs-2026');
  const plateauSource = citationFor('moveit-hand-eye-tutorial-2026');
  const [poses, setPoses] = useState(DEFAULT_POSES);
  const solvable = poses >= MIN_POSES;

  // The arm swings to the chosen pose along the great circle round the board (so the camera keeps looking at
  // its centre) and the iris eases to its gap. The first render draws the pose itself, so it hydrates as is.
  const pieces = useRef<Array<SVGGElement | SVGPathElement | null>>([]);
  const shown = useRef<{ look: ReturnType<typeof poseDirection>; gap: number } | null>(null);
  const rest = armDrawing(armFor(poseDirection(poses - 1)), irisGap(poses));
  // A layout effect, so the arm is redrawn where it was before the browser paints the new count's props.
  useLayoutEffect(() => {
    const target = poseDirection(poses - 1);
    const gap = irisGap(poses);
    const from = shown.current ?? { look: target, gap };
    if (!shown.current || asksForStillness()) {
      shown.current = { look: target, gap };
      writePieces(pieces.current, armDrawing(armFor(target), gap));
      return;
    }
    writePieces(pieces.current, armDrawing(armFor(from.look), from.gap));
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / 1000 / SWING_SECONDS);
      const s = t * t * (3 - 2 * t);
      const look = lookBetween(from.look, target, s);
      const g = from.gap + (gap - from.gap) * s;
      shown.current = { look, gap: g };
      writePieces(pieces.current, armDrawing(armFor(look), g));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [poses]);

  return (
    <InstrumentFigure
      figureId="hand-eye-poses"
      className={className}
      kicker="Hand-eye calibration"
      heading="Three poses solve it; twelve pin it down"
      controls={
        <SliderRow
          htmlFor={sliderId}
          label="Camera poses"
          value={<span data-testid="hand-eye-count">{poses} of {MAX_POSES}</span>}
        >
          <input
            id={sliderId}
            type="range"
            data-brand-control-id="control:input"
            min={1}
            max={MAX_POSES}
            step={1}
            value={poses}
            onChange={(e) => setPoses(Number(e.target.value))}
            aria-label={`Camera poses, currently ${poses}`}
            aria-valuetext={readout(poses)}
            className={INSTRUMENT_SLIDER_CLASS}
          />
        </SliderRow>
      }
      stage={
        <AnatomyStage
          viewWidth={480}
          hint={hintFor(poses)}
          readout={<span data-testid="hand-eye-readout">{readout(poses)}</span>}
          status="Illustrative iris; pose counts cited"
          data-testid="hand-eye-bench"
          data-poses={poses}
        >
          <Stage className="iso-stage">
            <svg
              className="iso-svg"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              focusable="false"
              aria-label={`A robot arm shows a checkerboard on the bench to its wrist camera from ${poses} ${poses === 1 ? 'pose' : 'poses'}, one peg in the rack for each. ${solvable ? 'An iris round the camera closes on it as the doubt about where it sits on the wrist shrinks.' : 'Too few poses to solve where the camera sits: its iris stays wide open.'}`}
              aria-describedby={descriptionId}
              data-testid="hand-eye-stage"
            >
              {PARTS.map((part, index) => {
                if (part.kind !== 'live') return <BenchPart key={index} part={part} />;
                if (part.id === 'pegs') {
                  return (
                    <g key="pegs" data-testid="hand-eye-pegs">
                      {pegsFor(poses).map((peg, k) => (
                        <g key={k} data-peg="">
                          <Solid paths={peg.paths} tone={peg.newest ? 'hi' : 'mid'} />
                        </g>
                      ))}
                    </g>
                  );
                }
                return (
                  <g key="arm" data-testid="hand-eye-ring" data-open={solvable ? undefined : ''} data-gap={irisGap(poses).toFixed(3)}>
                    {rest.pieces.map((piece, k) => (
                      <PieceView key={k} piece={piece} register={(el) => void (pieces.current[k] = el)} />
                    ))}
                  </g>
                );
              })}
            </svg>
          </Stage>
        </AnatomyStage>
      }
      caption="More poses shrink the doubt about where the wrist camera sits, until about 12."
      method={
        <>
          <div>
            Hand-eye calibration finds where the camera sits on the wrist by comparing how the arm moved with how
            the target appeared to move. OpenCV needs at least two motions about non-parallel axes, so at least
            three poses, and strongly recommends many more. MoveIt&apos;s tutorial reports that the calibration
            improves significantly with a few more samples and typically plateaus after about 12 or 15.
          </div>
          <div>
            The iris is illustrative: its gap round the camera shrinks with the square root of the number of motions
            beyond the minimum, the usual behaviour of a least-squares fit, drawn relative to its gap at three
            poses. The rack&apos;s groove after the third hole marks the minimum, and its sunken strip under holes 12 to
            15 marks where MoveIt reports the calibration levels off. Real accuracy also depends on how widely the poses spread and on noise. Validate the result
            in robot coordinates, because image reprojection error alone does not close that loop.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Poses and how much tighter the estimate gets"
            description={describe(poses)}
            rowHeader="poses"
            columns={[{ header: 'times tighter than with 3 (illustrative)', numeric: true }]}
            rows={[...new Set([...SAMPLE_POSES, poses])]
              .sort((a, b) => a - b)
              .map((n) => ({
                label: String(n),
                values: [n < MIN_POSES ? 'not solvable' : n === MIN_POSES ? 'the baseline' : tighterThanMinimum(n).toFixed(1)],
              }))}
          />
        </>
      }
      source={
        <span data-testid="hand-eye-source">
          {minimumSource ? (
            <a data-brand-control-id="control:link-focus" href={minimumSource.url} target="_blank" rel="noopener" className="underline-offset-2">
              {minimumSource.label}
            </a>
          ) : (
            'OpenCV'
          )}
          ;{' '}
          {plateauSource ? (
            <a data-brand-control-id="control:link-focus" href={plateauSource.url} target="_blank" rel="noopener" className="underline-offset-2">
              {plateauSource.label}
            </a>
          ) : (
            'MoveIt'
          )}
          .
        </span>
      }
    />
  );
}
