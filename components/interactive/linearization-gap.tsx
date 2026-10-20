'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  SliderRow,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { HEIGHT, PARTS, WIDTH, movingAt, type StandPart } from '@/components/iso/figures/tangent-rule-table';
import {
  ARM_CM,
  OPENING_SPREAD,
  SPREAD_RANGE,
  SPREAD_STEP,
  SWING_SECONDS,
  clampSpread,
  edgeMiss,
  readoutFor,
  swingAt,
  valueTextFor,
} from '@/lib/linearization-gap';

/**
 * LinearizationGap: why an extended Kalman filter's straight-line model holds
 * only near its estimate, for the state-estimation article, drawn as a
 * tangent-rule stand (components/iso/figures/tangent-rule-table.ts).
 *
 * A one-joint arm swings over an upright protractor, its stylus riding in a
 * groove engraved in the face: the hand's true path. A steel rule across the
 * top touches the groove at the estimate: the tangent the filter puts in the
 * curve's place. A cursor on the rule goes where the straight line puts the
 * hand for the arm's angle, and the dial gauge it carries reaches its
 * plunger down to the arm's tip: the plunger's length is the miss and the
 * gauge reads it, one turn for 15 cm. Plunger and needle are the one lit
 * assembly. The spread slider sets the filter's uncertainty either side of
 * the estimate, and moves the two pairs of stops; "Swing the arm" sweeps it
 * across the spread and back. The still pose shows the point: at the edge of
 * the spread the groove has fallen away below the rule. Reduced motion jumps.
 */

/** How quickly the stops and the arm follow the slider, seconds. */
const FOLLOW_SECONDS = 0.16;

const calm = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();

function PartView({ part }: { part: StandPart }): ReactNode {
  if (part.kind === 'solid') {
    return <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <g dangerouslySetInnerHTML={{ __html: part.inner }} /> : undefined} />;
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  // The groove engraved in the protractor's face: a shade, not a part.
  if (part.kind === 'face') return <path className="iso-shade" data-shade={part.fill} d={part.d} />;
  return <Dots points={part.points} size={part.size} tone={part.tone} />;
}

const tenth = (value: number) => Math.round(value * 10) / 10;

export function LinearizationGap({ className }: { className?: string }) {
  const spreadId = useId();
  const drawingId = `${useId()}-drawing`;
  /** The spread the reader has set, and the stand as drawn: the stops' spread and the arm's angle. */
  const [spread, setSpread] = useState(OPENING_SPREAD);
  const [stand, setStand] = useState({ spread: OPENING_SPREAD, angle: OPENING_SPREAD });
  const [swinging, setSwinging] = useState(false);
  const live = useRef({ target: OPENING_SPREAD, spread: OPENING_SPREAD, angle: OPENING_SPREAD, swingStart: 0, swinging: false });
  const frame = useRef(0);

  const tick = useCallback(function step(now: number, last: number) {
    const s = live.current;
    const dt = Math.min((now - last) / 1000, 1 / 30);
    const k = 1 - Math.exp(-dt / FOLLOW_SECONDS);
    s.spread += (s.target - s.spread) * k;
    if (Math.abs(s.target - s.spread) < 0.02) s.spread = s.target;
    if (s.swinging) {
      const t = (now - s.swingStart) / 1000;
      s.angle = swingAt(s.spread, t);
      if (t >= SWING_SECONDS) {
        s.swinging = false;
        s.angle = s.spread;
        setSwinging(false);
      }
    } else {
      // At rest the arm leans on the + stop.
      s.angle += (s.spread - s.angle) * k;
      if (Math.abs(s.spread - s.angle) < 0.02) s.angle = s.spread;
    }
    setStand({ spread: s.spread, angle: s.angle });
    const moving = s.swinging || s.spread !== s.target || s.angle !== s.spread;
    frame.current = moving ? requestAnimationFrame((t) => step(t, now)) : 0;
  }, []);

  const kick = useCallback(() => {
    if (frame.current) return;
    const start = performance.now();
    frame.current = requestAnimationFrame((t) => tick(t, start));
  }, [tick]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const setTo = (value: number) => {
    const next = clampSpread(value);
    const s = live.current;
    s.target = next;
    s.swinging = false;
    setSwinging(false);
    setSpread(next);
    if (calm()) {
      s.spread = next;
      s.angle = next;
      setStand({ spread: next, angle: next });
      return;
    }
    kick();
  };

  const swing = () => {
    const s = live.current;
    if (s.swinging) {
      s.swinging = false;
      setSwinging(false);
      kick();
      return;
    }
    // Reduced motion: the swing ends where it started, at the + stop, so there is nothing to show but the result.
    if (calm()) return;
    s.swingStart = performance.now();
    s.swinging = true;
    setSwinging(true);
    kick();
  };

  const moving = movingAt(stand);
  const miss = edgeMiss(spread);

  return (
    <InstrumentFigure
      figureId="linearization-gap"
      className={className}
      kicker="Linearization"
      heading="A straight line fits the curve only near the guess"
      controls={
        <>
          <SliderRow htmlFor={spreadId} label="How uncertain the guess is" value={<span data-testid="lg-spread">{spread} degrees</span>}>
            <input
              id={spreadId}
              type="range"
              data-brand-control-id="control:input"
              min={SPREAD_RANGE[0]}
              max={SPREAD_RANGE[1]}
              step={SPREAD_STEP}
              value={spread}
              onChange={(e) => setTo(Number(e.target.value))}
              aria-valuetext={valueTextFor(spread)}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </SliderRow>
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            onClick={swing}
            data-testid="lg-swing"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {swinging ? 'Stop the arm' : 'Swing the arm'}
          </button>
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="The dial on the cursor reads the miss: the lit plunger’s length"
          readout={readoutFor(spread)}
          status="Illustrative arm and spread; the miss is that arm's exact geometry"
          data-testid="lg-stage"
        >
          <div data-testid="lg-drawing" data-spread={tenth(stand.spread)} data-angle={tenth(stand.angle)}>
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              describedBy={drawingId}
              label={`An arm swinging over an upright protractor, with a straight rule touching its arc at the guess. At ${spread} degrees either side of the guess, a dial gauge on the rule reads ${miss.toFixed(1)} centimetres between the rule and the arc.`}
            >
              {PARTS.map((part, index) => {
                if (part.kind !== 'slot') return <PartView key={index} part={part} />;
                return (
                  <g key={part.slot} data-part={part.slot}>
                    {moving[part.slot].map((child, n) => (
                      <PartView key={n} part={child} />
                    ))}
                  </g>
                );
              })}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="An extended Kalman filter swaps a robot's curved model for its tangent at the current guess; the wider the uncertainty, the further they part."
      method={
        <>
          <p>
            Joint angles enter a robot&apos;s models through sines and cosines, so where a one-joint arm puts its hand
            is a curve. The extended Kalman filter keeps a Gaussian belief and moves its spread through the models&apos;
            tangents at the current estimate, the Jacobians. Near the estimate the tangent and the curve agree; away
            from it they part, and the farther the belief spreads, the more the straight line misses: about four
            times as much for twice the spread. Where the curve bends strongly over the spread the filter&apos;s
            covariance stops describing its real error, and it can grow overconfident and diverge.
          </p>
          <p id={drawingId}>
            The drawing is a tangent-rule stand. A one-joint arm swings over an upright protractor, its stylus riding
            in a groove engraved in the face: the hand&apos;s true path. A steel rule across the top touches the groove
            at the guess: the straight line the filter uses in its place. A cursor on the rule goes where the straight
            line puts the hand for the arm&apos;s angle, the same arc length along the rule as the stylus goes along
            the groove. The dial gauge on the cursor reaches its lit plunger down to the arm&apos;s tip, so the
            plunger&apos;s length is the miss; its dial turns once for 15 cm, and the plunger is marked every
            centimetre. Groove and rule carry the same graduations, five degrees of arc apart. Two pairs of stops, on
            the rim and on the rule, mark the spread either side of the guess.
          </p>
          <p>
            Illustrative: a {ARM_CM} cm arm and spreads from {SPREAD_RANGE[0]} to {SPREAD_RANGE[1]} degrees. The miss
            is that arm&apos;s exact geometry, the distance between the hand and the tangent&apos;s point for the same
            angle.
          </p>
        </>
      }
      source="Thrun, Burgard and Fox, Probabilistic Robotics (2005); McGee and Schmidt (1985); Dellaert and Kaess (2006)."
    />
  );
}
