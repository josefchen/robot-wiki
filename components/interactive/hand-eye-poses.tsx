'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  PlotStage,
  SliderRow,
} from '@/components/ui/instrument';
import { FigureStage, StageReadout, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  DirectLabel,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
import { ArmPost, ArmSketch, armIk, type ArmPoint } from '@/components/motion/arm-sketch';
import { useEasedValue } from '@/components/motion/use-eased-value';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * HandEyePoses: how many poses a hand-eye calibration needs. The arm
 * shows a calibration target to its wrist camera from one pose after
 * another; each pose is a small camera mark on an arc around the target.
 * With one or two poses the camera's place on the wrist cannot be solved,
 * because OpenCV needs at least two motions about non-parallel axes, so
 * three poses. From three on, a ring around the wrist camera shows how
 * uncertain its estimated place still is, and the ring stops shrinking
 * much after about 12 to 15 poses, where MoveIt reports the calibration
 * typically plateaus.
 *
 * The ring's size is illustrative: it shrinks with the square root of the
 * number of motions beyond the minimum, the usual least-squares behaviour.
 * The minimum and the plateau are the two cited numbers.
 *
 * Drawn as a technical line drawing: the arm in ink, each pose a small
 * open circle with a hairline sight line to the target, the current pose
 * in ink, and the uncertainty ring the one accent.
 */

/** OpenCV calibrateHandEye: two motions with non-parallel axes, so three poses. */
export const MIN_POSES = 3;
export const MAX_POSES = 20;
export const DEFAULT_POSES = 3;

/** How many times tighter the estimate is than with the minimum three poses. */
export const tighterThanMinimum = (poses: number) => (poses < MIN_POSES ? 0 : Math.sqrt(poses - MIN_POSES + 1));

const WIDTH = 640;
const HEIGHT = 300;
const FLOOR_Y = 286;
const TARGET: ArmPoint = { x: 440, y: 262 };
const BOARD_W = 96;
const ARC_R = 150;
const BASE: ArmPoint = { x: 110, y: 270 };
const L1 = 245;
const L2 = 215;
const RING_MIN = 9;
const RING_SPAN = 38;

const f = (v: number) => Number(v.toFixed(2));

/**
 * The order the poses are taken in: spread over the arc, each new one
 * landing in the widest gap left, so a few poses already span it.
 */
const POSE_ORDER = (() => {
  const order: number[] = [];
  for (let i = 0; i < MAX_POSES; i++) {
    let v = 0;
    let denom = 1;
    for (let k = i + 1; k > 0; k >>= 1) {
      denom *= 2;
      v += (k & 1) / denom;
    }
    order.push(v);
  }
  return order;
})();

/** Where the camera sits for pose i: on an arc above the target, from left to right. */
function posePoint(i: number): ArmPoint & { angle: number } {
  const t = POSE_ORDER[i];
  const angle = ((150 - t * 110) * Math.PI) / 180;
  return { x: TARGET.x + ARC_R * Math.cos(angle), y: TARGET.y - ARC_R * Math.sin(angle), angle };
}

/** One pose of the wrist camera: a small open circle and its sight line to the target. */
function CameraMark({ at, solid = false }: { at: ArmPoint & { angle: number }; solid?: boolean }) {
  const colour = solid ? CHART_STRUCTURE.label : roleColour('reference');
  return (
    <g data-camera-mark={solid ? 'current' : 'pose'}>
      <line
        x1={f(at.x)}
        y1={f(at.y)}
        x2={TARGET.x}
        y2={TARGET.y - 3}
        stroke={solid ? CHART_STRUCTURE.label : 'var(--line)'}
        strokeWidth={CHART_STROKE.structure}
        strokeDasharray={solid ? CHART_STROKE.dash : undefined}
      />
      <circle cx={f(at.x)} cy={f(at.y)} r={solid ? 3.5 : 2.5} fill={MOTION_STAGE.background} stroke={colour} strokeWidth={CHART_STROKE.structure} />
    </g>
  );
}

/** The calibration board on its stand: a thin checker strip, outlined. */
function Board() {
  const cells = 8;
  const size = BOARD_W / cells;
  const top = TARGET.y - 3;
  const ink = CHART_STRUCTURE.label;
  return (
    <g data-scene-part="target">
      <line x1={16} y1={FLOOR_Y} x2={WIDTH - 16} y2={FLOOR_Y} stroke="var(--line-strong)" strokeWidth={CHART_STROKE.structure} />
      <rect x={f(TARGET.x - 5)} y={top + 6} width={10} height={FLOOR_Y - top - 6} fill="none" stroke={ink} strokeWidth={CHART_STROKE.structure} />
      <rect x={f(TARGET.x - BOARD_W / 2)} y={top} width={BOARD_W} height={6} fill={MOTION_STAGE.background} stroke={ink} strokeWidth={CHART_STROKE.structure} />
      {Array.from({ length: cells }, (_, i) =>
        i % 2 === 0 ? (
          <rect key={i} x={f(TARGET.x - BOARD_W / 2 + i * size)} y={top} width={f(size)} height={6} fill={ink} />
        ) : null,
      )}
    </g>
  );
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
  const ring = useEasedValue(solvable ? RING_MIN + RING_SPAN / tighterThanMinimum(poses) : 0);

  const current = posePoint(poses - 1);
  const angles = armIk(BASE, L1, L2, current, 'up') ?? armIk(BASE, L1, L2, current, 'down')!;
  const accent = roleColour('highlight');

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
        <FigureStage
          footer={
            <>
              <StageReadout data-testid="hand-eye-readout">{readout(poses)}</StageReadout>
              <StageStatus>Illustrative ring; pose counts cited</StageStatus>
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`A robot arm shows a calibration target on the table to its wrist camera from ${poses} ${poses === 1 ? 'pose' : 'poses'}, marked as small circles on an arc. ${solvable ? 'A ring around the wrist camera shows how uncertain its place still is.' : 'Too few poses to solve where the camera sits.'}`}
            aria-describedby={descriptionId}
            data-testid="hand-eye-stage"
          >
            <Board />
            {Array.from({ length: poses - 1 }, (_, i) => (
              <CameraMark key={i} at={posePoint(i)} />
            ))}
            <ArmPost base={BASE} floorY={FLOOR_Y} floor={[16, 16]} />
            <ArmSketch base={BASE} l1={L1} l2={L2} angles={angles} testId="hand-eye-arm" />
            <CameraMark at={current} solid />
            {solvable ? (
              <circle
                data-testid="hand-eye-ring"
                data-chart-role="highlight"
                cx={f(current.x)}
                cy={f(current.y)}
                r={f(ring)}
                fill="none"
                stroke={accent}
                strokeWidth={CHART_STROKE.structure}
                strokeDasharray={CHART_STROKE.dash}
              />
            ) : null}
            <DirectLabel x={f(TARGET.x + BOARD_W / 2 + 8)} y={TARGET.y + 4} anchor="start">
              target
            </DirectLabel>
            <StageAnnotation
              x={WIDTH - 16}
              y={24}
              anchor="end"
              lines={
                solvable
                  ? poses >= 12
                    ? ['Past about 12 to 15 poses', 'the ring barely shrinks']
                    : ['Ring: doubt about', 'where the camera sits']
                  : ['Too few poses: needs turns', 'about two different axes']
              }
            />
          </PlotStage>
        </FigureStage>
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
            The ring&apos;s size is illustrative: it shrinks with the square root of the number of motions beyond
            the minimum, the usual behaviour of a least-squares fit, and is drawn relative to its size at three
            poses. Real accuracy also depends on how widely the poses spread and on noise. Validate the result
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
              .map((n) => ({ label: String(n), values: [n < MIN_POSES ? 'not solvable' : tighterThanMinimum(n).toFixed(1)] }))}
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
