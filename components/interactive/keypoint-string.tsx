'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { INSTRUMENT_SECONDARY_CONTROL_CLASS, INSTRUMENT_SLIDER_CLASS, InstrumentFigure, SliderRow } from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { HEIGHT, PARTS, WIDTH, movingAt, type Part } from '@/components/iso/figures/perspective-frame';
import { READING, SHARE_MIN, STILL_SHARE, liftTo, percentShort, pixelOf, placeOf, readoutFor } from '@/lib/keypoint-lift';

/**
 * KeypointString: how a point a vision-language model picks in an image
 * becomes a target an arm can reach, for the hierarchical guide's keypoint
 * section, drawn as a perspective frame after Dürer
 * (components/iso/figures/perspective-frame.ts).
 *
 * The model's point is a ring on the framed grid, the camera's image. The
 * string from the lens through the ring, the one lit part, is every point
 * that shows up there. The depth camera's beam meets the first surface on
 * that line, the toolbox's handle, and paying the string out to that depth
 * puts its bead, the target, on the handle. The model is
 * lib/keypoint-lift.ts. The slider sets the depth; "Lift the point" plays it
 * from the image out to the reading. Reduced motion jumps instead.
 */

/** The lift plays over this many seconds. */
export const RUN_SECONDS = 3;
const STEP = 0.01;

const r3 = (value: number) => Math.round(value * 1000) / 1000;
const smooth = (x: number) => x * x * (3 - 2 * x);

/** The slider's value, in words. */
export function shareValue(share: number): string {
  const place = placeOf(share);
  if (place === 'on') return '100% of the reading';
  if (place === 'image') return 'at the image';
  return `${100 - percentShort(share)}% of the reading`;
}

/**
 * What the slider's value means, for assistive technology. It repeats the
 * percentage the visible value prints, so the readout states what the slider says.
 */
export function valueTextFor(share: number): string {
  const place = placeOf(share);
  if (place === 'on') return "Depth 100% of the reading, from the depth camera: the target sits on the toolbox's handle";
  if (place === 'image') return 'No depth: the target is still the point in the image, which could be anywhere on its line';
  return `Depth ${100 - percentShort(share)}% of the reading, ${percentShort(share)}% short: the target hangs in the air on the same line, short of the handle`;
}

function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }): ReactNode {
  if (part.kind === 'solid') {
    return <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined} />;
  }
  if (part.kind === 'line') {
    const line = <Line d={part.d} tone={part.tone} free={part.free} />;
    return part.weight ? <g style={{ ['--anatomy-weight' as string]: part.weight } as CSSProperties}>{line}</g> : line;
  }
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.fill === 'paper') return <path className="iso-fill" d={part.d} />;
  if (part.fill === 'top') return <path className="iso-top" d={part.d} />;
  return <path className="iso-shade" data-shade={part.fill} d={part.d} />;
}

export function KeypointString({ className }: { className?: string }) {
  const sliderId = useId();
  const drawingId = `${useId()}-drawing`;
  const [share, setShare] = useState(STILL_SHARE);
  const shareRef = useRef(STILL_SHARE);
  const [running, setRunning] = useState(false);
  const moving = useMemo(() => movingAt({ share }), [share]);
  const target = liftTo(share * READING);
  const pixel = pixelOf(target);

  const show = useCallback((value: number) => {
    shareRef.current = value;
    setShare(value);
  }, []);

  // "Lift the point": the target leaves the image and runs out along its line to the depth reading.
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (RUN_SECONDS * 1000));
      show(t >= 1 ? 1 : r3(SHARE_MIN + (1 - SHARE_MIN) * smooth(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
      else setRunning(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, show]);

  const place = placeOf(share);

  return (
    <InstrumentFigure
      figureId="keypoint-string"
      className={className}
      kicker="Keypoints"
      heading="An image point becomes a target only with its depth"
      controls={
        <>
          <SliderRow htmlFor={sliderId} label="Depth along the line" value={<span data-testid="keypoint-depth">{shareValue(share)}</span>}>
            <input
              id={sliderId}
              type="range"
              data-brand-control-id="control:input"
              min={SHARE_MIN}
              max={1}
              step={STEP}
              value={share}
              onChange={(e) => {
                setRunning(false);
                show(Number(e.target.value));
              }}
              aria-valuetext={valueTextFor(share)}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </SliderRow>
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            onClick={() => {
              if (running) {
                setRunning(false);
                return;
              }
              // Reduced motion jumps to the reading instead of playing the lift.
              if (typeof window.matchMedia === 'function' && asksForStillness()) show(1);
              else setRunning(true);
            }}
            data-testid="keypoint-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop the lift' : 'Lift the point'}
          </button>
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Every point on the lit string shows up at the ring in the image"
          readout={readoutFor(share)}
          status="Schematic: an illustrative camera, image and toolbox"
          data-testid="keypoint-stage-frame"
        >
          <div
            data-testid="keypoint-drawing"
            data-share={r3(share)}
            data-place={place}
            data-target={target.map((value) => value.toFixed(2)).join(',')}
            data-pixel={`${pixel.y.toFixed(2)},${pixel.z.toFixed(2)}`}
          >
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              describedBy={drawingId}
              label={`A camera on a post looks through a framed grid, its image, at a toolbox. A ring on the grid is the point the model picked; a lit string runs from the lens through the ring, and a depth camera's beam meets the toolbox's handle on the same line. ${
                place === 'on'
                  ? "Paid out to the depth reading, the string's bead, the arm's target, sits on the handle."
                  : place === 'image'
                    ? "The string's bead still sits at the ring: without a depth it could be anywhere on the line."
                    : "Paid out short of the reading, the bead hangs in the air on the same line, short of the handle."
              }`}
            >
              {PARTS.map((part, index) => {
                if (part.kind !== 'slot') return <PartView key={index} part={part} />;
                return (
                  <g key={part.slot} data-part={part.slot}>
                    {moving[part.slot].map((child, n) => (child.kind === 'slot' ? null : <PartView key={n} part={child} />))}
                  </g>
                );
              })}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="A pixel fixes only a line from the camera; the depth reading picks the point on it. Read short, the target hangs in the air."
      method={
        <>
          <p>
            A vision-language model that points answers in the image: MOKA has it pick marked grasp and target
            points, and RoboPoint predicts image points directly. A point in an image is not yet a place in the room.
            Every point on the line from the camera&apos;s centre through that pixel shows up at the same pixel, so the
            pixel alone fixes only the line. A calibrated depth reading picks the point on it: the target is the
            camera&apos;s centre plus the depth times the line&apos;s direction.
          </p>
          <p id={drawingId}>
            The frame is that geometry made of parts, after Dürer&apos;s drawing machine. The grid is the image; the
            ring is the model&apos;s point; the lit string runs from the lens through the ring. The depth camera beside
            the lens casts a faint beam to the first surface on that line, the toolbox&apos;s handle. Paid out to that
            depth, the string&apos;s bead, the arm&apos;s target, sits on the handle; paid out short, it hangs in the air,
            and the arm would close on nothing.
          </p>
          <p>Schematic: the camera, the frame and the toolbox are illustrative, and no distance is claimed.</p>
        </>
      }
      source="Point lifting as in MOKA (2024) and RoboPoint (2024)."
    />
  );
}
