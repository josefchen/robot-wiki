'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PresetGroup,
  SliderRow,
  type Preset,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { PartView } from '@/components/iso/part-view';
import { IsoFigure } from '@/components/iso/react/draw';
import { asksForStillness, useInView } from '@/components/iso/react/live';
import {
  HEIGHT,
  PARTS,
  PHONE_FIT,
  SWING_DEGREES,
  WIDTH,
  bodyOf,
  resultOf,
  rigParts,
  type BodyId,
} from '@/components/iso/figures/air-bearing-table';

/**
 * FreeFloatingArm: why an arm on a floating spacecraft does not put its hand
 * where a ground-based arm would, drawn as a laboratory air-bearing table
 * (components/iso/figures/air-bearing-table.ts).
 *
 * Umetani and Yoshida's 1989 test model floats on three air pads over a flat
 * slab, so nothing in the slab's plane pushes on it. Swing its arm and its
 * body turns the other way, because the whole rig started at rest and its
 * angular momentum has to stay zero; the hand, the one lit part, ends off
 * the grapple fixture bolted where a held body's arm would put it. The
 * preset row sets the body: as built, ballasted with lead bricks, or clamped
 * to the slab like a ground-based arm. "Swing the arm" swings the shoulder
 * through its 90 degrees and back; the slider under "Adjust more" sets it
 * by hand. When nobody touches it, the figure swings the arm out and back on
 * its own; off screen it stops, and reduced motion holds the swung pose and
 * makes every move a jump.
 */

export const BODIES: readonly Preset<BodyId>[] = [
  { id: 'lab', label: 'Light body, 6.3 kg' },
  { id: 'ballast', label: `Heavier body, ${Math.round(bodyOf('ballast').mass!)} kg` },
  { id: 'clamped', label: 'Bolted to the table' },
];

const whole = (value: number) => Math.round(Math.abs(value));
export function readoutFor(id: BodyId, s: number): string {
  const { turn, miss } = resultOf(id, s);
  if (id === 'clamped') return s >= 1 - 1e-6 ? 'Body clamped, turned 0 degrees · hand on the grapple' : 'Body clamped, turned 0 degrees · hand off by 0 cm';
  return `Body turned ${whole(turn)} degrees the other way · hand off by ${Math.round(miss * 100)} cm`;
}
export function valueTextFor(id: BodyId, s: number): string {
  const swing = Math.round(SWING_DEGREES * s);
  return `Shoulder swung ${swing} degrees. ${readoutFor(id, s)}.`;
}

/** A full swing takes this long, a short step a little over a quarter of a second; each eases in and out. */
const SWING_S = 1.9;
const STEP_S = 0.25;
/** The idle tour waits this long before it starts, holds each end this long, and comes back this long after the reader's last touch. */
const TOUR_START_S = 1.4;
const TOUR_HOLD_S = 2.6;
const TOUR_RESUME_S = 6;

const calm = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();
const ease = (u: number) => {
  const t = Math.min(Math.max(u, 0), 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

interface Live {
  s: number;
  from: number;
  target: number;
  /** Seconds into the current move, and its length. */
  t: number;
  length: number;
  body: BodyId;
  pending: BodyId | null;
  touring: boolean;
  held: number;
  idle: number;
  quietUntil: number;
}

/** Start a move from where the arm is now. */
function aim(st: Live, next: number) {
  st.from = st.s;
  st.target = next;
  st.t = 0;
  st.length = STEP_S + (SWING_S - STEP_S) * Math.abs(next - st.s);
  st.held = 0;
}

export function FreeFloatingArm({ className }: { className?: string }) {
  const sliderId = useId();
  const drawingId = `${useId()}-drawing`;
  const stageRef = useRef<HTMLDivElement>(null);
  /** The body as drawn, and the body the reader asked for (fitted once the arm is home). */
  const [body, setBody] = useState<BodyId>('lab');
  const [chosen, setChosen] = useState<BodyId>('lab');
  /** The swing as drawn (0 folded, 1 reached) and where it is heading. */
  const [s, setS] = useState(1);
  const [target, setTargetState] = useState(1);
  const live = useRef<Live>({ s: 1, from: 1, target: 1, t: 0, length: 0, body: 'lab', pending: null, touring: true, held: 0, idle: 0, quietUntil: 0 });
  const frame = useRef(0);
  const visible = useInView(stageRef);

  const tick = useCallback(function step(now: number, last: number) {
    const st = live.current;
    // Real time, so a slow device still finishes a swing on time; a long gap (a hidden tab) is cut short.
    const dt = Math.min((now - last) / 1000, 0.12);
    const still = calm();
    // The tour: hold at one end, then send the arm to the other.
    if (st.touring && !still) {
      st.idle += dt;
      const resting = st.s === st.target;
      if (resting) st.held += dt;
      if (st.idle > TOUR_START_S && resting && st.held > TOUR_HOLD_S) {
        aim(st, st.target > 0.5 ? 0 : 1);
        setTargetState(st.target);
      }
    } else if (!st.touring && !still && st.quietUntil > 0 && now > st.quietUntil && st.s === st.target && !st.pending) {
      st.touring = true;
      st.held = 0;
      st.idle = TOUR_START_S;
    }
    if (st.s !== st.target) {
      st.t += dt;
      const share = still || st.length <= 0 ? 1 : st.t / st.length;
      st.s = share >= 1 ? st.target : st.from + (st.target - st.from) * ease(share);
    }
    // A new body is fitted only with the arm folded home, where every body sits on its tape square.
    if (st.pending && st.s === 0 && st.target === 0) {
      st.body = st.pending;
      st.pending = null;
      setBody(st.body);
      aim(st, 1);
      setTargetState(1);
    }
    setS(st.s);
    const moving = st.s !== st.target || st.pending !== null || st.touring || st.quietUntil > now;
    frame.current = moving && !still ? requestAnimationFrame((t) => step(t, now)) : 0;
  }, []);

  const kick = useCallback(() => {
    if (frame.current) return;
    const start = performance.now();
    frame.current = requestAnimationFrame((t) => tick(t, start));
  }, [tick]);

  useEffect(() => {
    if (visible && !calm()) kick();
    else {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    return () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [visible, kick]);

  /** The reader took over: the tour stops, and comes back a while after their last touch. */
  const touch = () => {
    const st = live.current;
    st.touring = false;
    st.quietUntil = performance.now() + TOUR_RESUME_S * 1000;
  };

  /** Reduced motion: every move is a jump, and a new body is fitted at once. */
  const jump = (next: number) => {
    const st = live.current;
    if (st.pending) {
      st.body = st.pending;
      st.pending = null;
      setBody(st.body);
    }
    st.s = next;
    st.from = next;
    st.target = next;
    setTargetState(next);
    setS(next);
  };

  const sendTo = (next: number) => {
    const st = live.current;
    touch();
    if (calm()) {
      jump(next);
      return;
    }
    // While a new body waits to be fitted, the arm finishes folding home first.
    if (st.pending) return;
    aim(st, next);
    setTargetState(next);
    kick();
  };

  const choose = (next: BodyId) => {
    const st = live.current;
    setChosen(next);
    touch();
    st.pending = next === st.body ? null : next;
    if (calm()) {
      jump(1);
      return;
    }
    // Fold the arm home first; the new body is fitted there and the arm swings out again.
    aim(st, st.pending ? 0 : 1);
    setTargetState(st.target);
    kick();
  };

  const reset = () => choose('lab');

  const shown = resultOf(body, s);
  const swung = Math.round(SWING_DEGREES * target);
  const reached = target > 0.5;
  const parts = rigParts(body, s);
  const sources = {
    lab: 'https://ntrs.nasa.gov/citations/19900020580',
    paper: 'https://doi.org/10.1109/70.34766',
    ets: 'https://astro.mech.tohoku.ac.jp/~yoshida/ETS-VII/Yoshida.pdf',
  };

  return (
    <InstrumentFigure
      figureId="free-floating-arm"
      className={className}
      kicker="Free-floating arm"
      heading="With nothing to push on, the arm turns the spacecraft"
      controls={
        <div className="flex flex-wrap items-end gap-x-6 gap-y-1" onPointerDown={touch} onFocus={touch}>
          <PresetGroup label="The body" presets={BODIES} value={chosen} onChange={choose} testId="floating-body" />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            data-testid="floating-swing"
            onClick={() => sendTo(reached ? 0 : 1)}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {reached ? 'Swing it back' : 'Swing the arm'}
          </button>
        </div>
      }
      adjust={
        <div className="grid gap-3" onPointerDown={touch} onFocus={touch}>
          <SliderRow htmlFor={sliderId} label="Shoulder swing" value={<span data-testid="floating-swing-value">{Math.round(SWING_DEGREES * s)} degrees</span>}>
            <input
              id={sliderId}
              type="range"
              data-brand-control-id="control:input"
              min={0}
              max={SWING_DEGREES}
              step={1}
              value={swung}
              onChange={(event) => sendTo(Number(event.target.value) / SWING_DEGREES)}
              aria-valuetext={valueTextFor(body, target)}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </SliderRow>
          <InstrumentReset onClick={reset} />
        </div>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Watch the blue hand; the post marks where a held body would put it"
          readout={readoutFor(body, s)}
          status="1989 lab model; bricks illustrative"
          data-testid="floating-stage-frame"
        >
          <div
            ref={stageRef}
            data-testid="floating-drawing"
            data-body={body}
            data-swing={Math.round(SWING_DEGREES * s)}
            data-turn={shown.turn.toFixed(1)}
            data-miss={(shown.miss * 100).toFixed(1)}
          >
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              fit={PHONE_FIT}
              describedBy={drawingId}
              label={
                body === 'clamped'
                  ? `A robot body clamped to a granite air-bearing table, with a two-link arm. The shoulder has swung ${Math.round(SWING_DEGREES * s)} degrees; the body has not turned, and the hand ${s >= 1 - 1e-6 ? 'closes on the grapple fixture bolted to the table' : 'is on its way to the grapple fixture'}.`
                  : `A robot body floating on three air pads over a granite table, with a two-link arm. The shoulder has swung ${Math.round(SWING_DEGREES * s)} degrees and the body has turned ${whole(shown.turn)} degrees the other way off its tape square, so the hand is ${Math.round(shown.miss * 100)} cm from where a held body would put it, the grapple fixture.`
              }
            >
              {PARTS.map((part, index) => {
                if (part.kind !== 'slot') return <PartView key={index} part={part} />;
                return (
                  <g key="rig" data-part="rig">
                    {parts.map((child, n) => (
                      <PartView key={n} part={child} />
                    ))}
                  </g>
                );
              })}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="A floating body turns against its arm, so the hand misses; the heavier the body, the smaller the miss."
      method={
        <>
          <p id={drawingId}>
            The drawing is a laboratory air-bearing table: a mock-up spacecraft with a two-link arm floats on three air
            pads, free to slide and turn as in orbit. Masses and inertia are Umetani and Yoshida&apos;s 1989 test model,
            and the body turns to keep total angular momentum at zero.
          </p>
          <p>
            Sources:{' '}
            <a data-brand-control-id="control:link-focus" href={sources.lab} target="_blank" rel="noopener" className="underline-offset-2">
              Umetani and Yoshida, test model on air bearings (1989)
            </a>
            ;{' '}
            <a data-brand-control-id="control:link-focus" href={sources.paper} target="_blank" rel="noopener" className="underline-offset-2">
              Umetani and Yoshida, generalized Jacobian (1989)
            </a>
            ;{' '}
            <a data-brand-control-id="control:link-focus" href={sources.ets} target="_blank" rel="noopener" className="underline-offset-2">
              Yoshida, ETS-VII identified inertia
            </a>
            .
          </p>
        </>
      }
      source="Umetani and Yoshida (1989); Yoshida, ETS-VII flight experiments."
    />
  );
}
