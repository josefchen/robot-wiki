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
              aria-valuetext={`${scale} to 1: a ${formatMm(handMm)} millimeter hand movement moves the tip ${formatMm(tipMm(handMm, scale))} millimeters`}
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
          status="Illustrative stroke; exact division"
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
              label={`A reducing pantograph on a bench: four bars pinned to a fixed post carry the surgeon's stylus over the master plate and an instrument tip over a practice pad. Set to ${scale} to 1, a ${formatMm(handMm)} millimeter stroke of the stylus, wobble included, moves the tip ${formatMm(tipMm(handMm, scale))} millimeters.`}
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
      caption="At 3 to 1, a 30 mm hand stroke becomes 10 mm at the tip, every wobble divided too."
      method={
        <>
          <p id={drawingId}>
            The drawing is a reducing pantograph that divides motion with four bars: the tip sits 1/scale of the way
            from the fixed pivot O to the stylus H, so tip = hand ÷ scale. The 30 mm stroke, its 1.5 mm wobble and the
            2 to 1 up to 5 to 1 scale settings are authored.
          </p>
        </>
      }
      source="Level 0 means the surgeon controls every movement: Yang et al., Science Robotics (2017)."
    />
  );
}
