'use client';

import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  SliderRow,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import {
  DEFAULT_SCALE,
  HEIGHT,
  PARTS,
  SCALES,
  STROKE_MM,
  UNITS_PER_MM,
  WIDTH,
  clampHand,
  handAt,
  linkageParts,
  plateAt,
  strokeUpTo,
  tipMm,
  tracesFor,
  type Part,
  type Scale,
} from '@/components/iso/figures/motion-pantograph';

/**
 * MotionPantograph: motion scaling, for the adjacent/surgical module, drawn
 * as a reducing pantograph (components/iso/figures/motion-pantograph.ts).
 *
 * A surgical robot like da Vinci divides the surgeon's hand movement before
 * it reaches the instrument, wobble included. The pantograph does the same
 * with four bars: the surgeon's stylus traces a stroke on the master plate,
 * and the instrument tip, pinned between the fixed pivot and the stylus at
 * 1/scale of the way out, traces the same stroke divided by the scale on the
 * patient pad. The two scale pins set 2 to 1 up to 5 to 1; the tip is the one
 * lit part. Both plates carry the same millimetre rule.
 *
 * The still pose shows the authored 30 mm stroke already traced. "Trace the
 * stroke" draws it again; dragging on the master plate moves the stylus by
 * hand. Reduced motion keeps every move a jump. The stroke and its wobble
 * are authored; the division is exact.
 */

/** How long the authored stroke takes to trace, in seconds. */
export const TRACE_S = 3.2;

export const readoutFor = (scale: number, handMm = STROKE_MM) =>
  `${scale} to 1 · ${formatMm(handMm)} mm at the hand, ${formatMm(tipMm(handMm, scale))} mm at the tip`;

/** "10" or "7.5": millimetres to one decimal, dropping a trailing ".0". */
export const formatMm = (mm: number) => (Math.round(mm * 10) / 10).toString();

const scaleOf = (value: number): Scale => SCALES.find((scale) => scale === value) ?? DEFAULT_SCALE;

function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }): ReactNode {
  if (part.kind === 'solid') {
    return <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined} />;
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  return <Dots points={part.points} size={part.size} tone={part.tone} />;
}

const STILL_HANDS = strokeUpTo(1);

export function MotionPantograph({ className }: { className?: string }) {
  const sliderId = useId();
  const drawingId = `${useId()}-drawing`;
  const [scale, setScale] = useState<Scale>(DEFAULT_SCALE);
  const [tracing, setTracing] = useState(false);
  /** The hand's path drawn so far, and where the stylus is. */
  const [hands, setHands] = useState<[number, number][]>(STILL_HANDS);
  const [dragged, setDragged] = useState(false);
  const drawing = useRef<{ id: number; start: [number, number] } | null>(null);
  const svgHost = useRef<HTMLDivElement>(null);

  const stylus = hands[hands.length - 1] ?? handAt(1);
  const traces = tracesFor(hands, scale);
  const linkage = linkageParts(stylus, scale);
  const handMm = dragged && hands.length > 1
    ? Math.hypot(stylus[0] - hands[0][0], stylus[1] - hands[0][1]) / UNITS_PER_MM
    : STROKE_MM;

  // "Trace the stroke": the stylus runs the authored stroke again and both pens draw it.
  useEffect(() => {
    if (!tracing) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const share = Math.min(1, (now - start) / 1000 / TRACE_S);
      setHands(strokeUpTo(share));
      if (share < 1) frame = requestAnimationFrame(tick);
      else setTracing(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [tracing]);

  const pointOf = (event: ReactPointerEvent): [number, number] | null => {
    const svg = svgHost.current?.querySelector('svg');
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return clampHand(plateAt([point.x, point.y]));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = pointOf(event);
    if (!point) return;
    setTracing(false);
    drawing.current = { id: event.pointerId, start: point };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragged(true);
    setHands([point]);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drawing.current || drawing.current.id !== event.pointerId) return;
    const point = pointOf(event);
    if (!point) return;
    setHands((list) => (list.length > 400 ? [...list.slice(1), point] : [...list, point]));
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drawing.current?.id === event.pointerId) drawing.current = null;
  };

  return (
    <InstrumentFigure
      figureId="motion-pantograph"
      className={className}
      kicker="Motion scaling"
      heading="The robot shrinks the surgeon's hand motion, wobble and all"
      controls={
        <>
          <SliderRow
            htmlFor={sliderId}
            label="Motion scale"
            value={<span data-testid="pantograph-scale">{scale} to 1</span>}
          >
            <input
              id={sliderId}
              type="range"
              data-brand-control-id="control:input"
              min={SCALES[0]}
              max={SCALES[SCALES.length - 1]}
              step={1}
              value={scale}
              onChange={(e) => setScale(scaleOf(Number(e.target.value)))}
              aria-valuetext={`${scale} to 1: a ${formatMm(handMm)} millimetre hand movement moves the tip ${formatMm(tipMm(handMm, scale))} millimetres`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </SliderRow>
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            onClick={() => {
              if (tracing) {
                setTracing(false);
                return;
              }
              setDragged(false);
              // Reduced motion jumps to the traced stroke instead of drawing it.
              if (typeof window.matchMedia === 'function' && asksForStillness()) setHands(STILL_HANDS);
              else setTracing(true);
            }}
            data-testid="pantograph-trace"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {tracing ? 'Stop tracing' : 'Trace the stroke'}
          </button>
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint={tracing ? 'Tracing the stroke' : 'Drag on the right-hand plate to move the stylus'}
          readout={readoutFor(scale, handMm)}
          status="Illustrative: an authored stroke and scale settings; the division is exact"
          data-testid="pantograph-stage-frame"
        >
          <div
            ref={svgHost}
            data-testid="pantograph-drawing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="cursor-crosshair"
          >
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              label={`A reducing pantograph on a bench: four bars pinned to a fixed post carry the surgeon's stylus over the master plate and an instrument tip over a practice pad. Set to ${scale} to 1, a ${formatMm(handMm)} millimetre stroke of the stylus, wobble included, moves the tip ${formatMm(tipMm(handMm, scale))} millimetres.`}
              describedBy={drawingId}
            >
              {PARTS.map((part, index) => {
                if (part.kind !== 'slot') return <PartView key={index} part={part} />;
                if (part.slot === 'traces') {
                  return (
                    <g key="traces">
                      <g data-testid="pantograph-hand-trace" data-mm={formatMm(handMm)}>
                        <Line d={traces.hand} tone="mid" />
                      </g>
                      <g data-testid="pantograph-tip-trace" data-mm={formatMm(tipMm(handMm, scale))}>
                        <Line d={traces.tip} tone="mid" />
                      </g>
                      <Dots points={traces.dots} size={0.9} tone="hi" />
                    </g>
                  );
                }
                return (
                  <g key="linkage" data-testid="pantograph-linkage" data-scale={scale}>
                    {linkage.map((child, n) => (child.kind === 'slot' ? null : <PartView key={n} part={child} />))}
                  </g>
                );
              })}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="A surgical robot divides the surgeon's hand movement, tremor included, so the instrument moves less than the hand."
      method={
        <>
          <p>
            Motion scaling is one of the things a teleoperated surgical robot adds to the surgeon&apos;s hand: the
            console divides each hand movement before it reaches the instrument, so a large, comfortable movement
            becomes a fine one inside the patient, and any wobble in the hand is divided too. Yang and colleagues
            count it as Level 0, no autonomy, because the instrument still follows the surgeon&apos;s own motion.
          </p>
          <p id={drawingId}>
            The drawing is a reducing pantograph doing the same thing with four bars. With the stylus at H and the
            fixed pivot at O, the tip sits on the line between them at 1/scale of the way out, so tip = hand ÷ scale
            for every point of the stroke. The two knurled scale pins move along the bars&apos; hole rows to set 2 to 1
            up to 5 to 1; the pips beside each hole count the scale it sets.
          </p>
          <p>
            Illustrative: the 30 mm stroke and its wobble of 1.5 mm either side are authored, and so are the scale
            settings; a real system also filters tremor, which this pantograph only divides. The millimetre rules on
            both plates are the same scale, so the two traces can be compared directly.
          </p>
        </>
      }
      source="Motion scaling as Level 0 autonomy: Yang et al., Science Robotics (2017)."
    />
  );
}
