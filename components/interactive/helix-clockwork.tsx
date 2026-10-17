'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
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
  HAND_POSTS,
  HEIGHT,
  PARTS,
  S0_HAND,
  S0_HZ,
  S1_HAND,
  S1_HZ,
  SPAN_MS,
  STEPS_PER_TARGET,
  WIDTH,
  movingAt,
  readingAt,
  s0HandDegrees,
  s1HandDegrees,
  type Part,
} from '@/components/iso/figures/helix-clockwork';

/**
 * HelixClockwork: the rate hierarchy inside Figure's Helix 02, for the
 * competing-theses module, drawn as a two-rate clockwork
 * (components/iso/figures/helix-clockwork.ts).
 *
 * S1 sets full-body joint targets 200 times a second and S0, the
 * whole-body controller, acts 1,000 times a second, so the controller takes
 * five steps for every target. In the clockwork the escape wheel (S0)
 * advances one tooth per control step; four pins on its arbor trip a lever
 * every fifth step, and the lever jumps the star wheel (S1) one point. The
 * S0 hand ticks five times for each jump of the S1 hand, the one lit part.
 *
 * The still pose is 7 milliseconds in. "Run the clock" plays the 20
 * milliseconds slowed down; the slider sets the moment by hand. Reduced
 * motion jumps to the end.
 */

/** How much slower than real time the run plays: 1 millisecond takes this many seconds' worth of milliseconds. */
export const SLOWDOWN = 450;
export const STILL_MS = 7;

/** The readout: words, not symbols. */
export function readoutFor(ms: number) {
  const { steps, targets } = readingAt(ms);
  // Whole milliseconds elapsed, so the time and the step count always agree.
  const whole = Math.floor(ms + 1e-9);
  return `${whole} milliseconds · ${steps} control ${steps === 1 ? 'step' : 'steps'} · ${targets} new joint ${targets === 1 ? 'target' : 'targets'}`;
}

function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }): ReactNode {
  if (part.kind === 'solid') {
    return <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined} />;
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  const rule = part.evenodd ? 'evenodd' : undefined;
  if (part.fill === 'paper') return <path className="iso-fill" fillRule={rule} d={part.d} />;
  return (
    <g>
      <path className="iso-fill" fillRule={rule} d={part.d} />
      {part.fill === 'top' ? <path className="iso-top" fillRule={rule} d={part.d} /> : <path className="iso-shade" data-shade={part.fill} fillRule={rule} d={part.d} />}
    </g>
  );
}

const r2 = (value: number) => Number(value.toFixed(2));

function Hand({ hand, degrees, lit, testId }: { hand: typeof S0_HAND; degrees: number; lit: boolean; testId: string }) {
  return (
    <g transform={hand.matrix} data-testid={testId} data-degrees={r2(degrees)}>
      <g transform={`rotate(${r2(degrees)})`}>
        <path d={hand.d} fill={lit ? 'var(--anatomy-lit)' : 'var(--anatomy-hi)'} />
        <Line d={hand.d} tone={lit ? 'lit' : 'hi'} />
      </g>
      <path className="iso-fill" d={hand.hub} />
      <Line d={hand.hub} tone="mid" />
    </g>
  );
}

export function HelixClockwork({ className }: { className?: string }) {
  const sliderId = useId();
  const drawingId = `${useId()}-drawing`;
  const [ms, setMs] = useState(STILL_MS);
  const [running, setRunning] = useState(false);
  /** Where a run starts: set by the run button when it starts one, so the effect reads it once. */
  const runFrom = useRef(0);
  const moving = useMemo(() => movingAt(ms), [ms]);
  const reading = readingAt(ms);

  // "Run the clock": the 20 milliseconds, slowed down, from where the clock stands (or from zero at the end).
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const from = runFrom.current;
    const start = performance.now();
    const tick = (now: number) => {
      const next = Math.min(SPAN_MS, from + (now - start) / SLOWDOWN);
      setMs(next);
      if (next < SPAN_MS) frame = requestAnimationFrame(tick);
      else setRunning(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const elapsed = Math.floor(ms + 1e-9);
  const valueText = `${elapsed} milliseconds: ${reading.steps} control steps and ${reading.targets} new joint ${reading.targets === 1 ? 'target' : 'targets'}`;

  return (
    <InstrumentFigure
      figureId="helix-clockwork"
      className={className}
      kicker="Hierarchical control"
      heading="Helix 02's controller takes five steps for every joint target"
      controls={
        <>
          <SliderRow
            htmlFor={sliderId}
            label="Time on the clock"
            value={<span data-testid="clockwork-time">{elapsed} milliseconds</span>}
          >
            <input
              id={sliderId}
              type="range"
              data-brand-control-id="control:input"
              min={0}
              max={SPAN_MS}
              step={1}
              value={elapsed}
              onChange={(e) => {
                setRunning(false);
                setMs(Number(e.target.value));
              }}
              aria-valuetext={valueText}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </SliderRow>
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            onClick={() => {
              if (running) {
                setRunning(false);
                return;
              }
              // Reduced motion jumps to the end of the 20 milliseconds instead of running the clock.
              if (typeof window.matchMedia === 'function' && asksForStillness()) setMs(SPAN_MS);
              else {
                runFrom.current = ms >= SPAN_MS ? 0 : ms;
                setRunning(true);
              }
            }}
            data-testid="clockwork-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop the clock' : 'Run the clock'}
          </button>
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint={running ? `Running ${SLOWDOWN} times slower than real time` : 'Lit: the joint-target hand, which moves once every five control steps'}
          readout={readoutFor(ms)}
          status={`Schematic: Figure's two rates on one clockwork, run ${SLOWDOWN} times slower`}
          data-testid="clockwork-stage-frame"
        >
          <div data-testid="clockwork-drawing" data-ms={r2(ms)} data-steps={reading.steps} data-targets={reading.targets}>
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              label={`A clock movement with two hands. The escape wheel's hand ticks once per control step, 1,000 times a second; every fifth tick a lever jumps the star wheel's hand, the joint target, 200 times a second. At ${elapsed} milliseconds: ${reading.steps} control steps, ${reading.targets} new joint ${reading.targets === 1 ? 'target' : 'targets'}.`}
              describedBy={drawingId}
            >
              {PARTS.map((part, index) => {
                if (part.kind !== 'slot') return <PartView key={index} part={part} />;
                if (part.slot === 's0-hand') {
                  return (
                    <g key="s0-hand">
                      <PartView part={HAND_POSTS[0] as Exclude<Part, { kind: 'slot' }>} />
                      <Hand hand={S0_HAND} degrees={s0HandDegrees(ms)} lit={false} testId="clockwork-s0-hand" />
                    </g>
                  );
                }
                if (part.slot === 's1-hand') {
                  return (
                    <g key="s1-hand">
                      <PartView part={HAND_POSTS[1] as Exclude<Part, { kind: 'slot' }>} />
                      <Hand hand={S1_HAND} degrees={s1HandDegrees(ms)} lit testId="clockwork-s1-hand" />
                    </g>
                  );
                }
                return (
                  <g key={part.slot} data-part={part.slot}>
                    {(moving[part.slot] ?? []).map((child, n) => (child.kind === 'slot' ? null : <PartView key={n} part={child} />))}
                  </g>
                );
              })}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption={`Figure's Helix 02 sets joint targets ${S1_HZ} times a second, and its whole-body controller acts ${S0_HZ.toLocaleString('en-US')} times a second: ${STEPS_PER_TARGET} steps per target.`}
      method={
        <>
          <p>
            Figure describes Helix 02 as three learned layers. S2 interprets the scene and the instruction and
            sequences behaviours; S1 turns what the robot senses into full-body joint targets at {S1_HZ} Hz; S0, the
            whole-body controller, runs at 1 kHz. A joint target therefore lasts 5 milliseconds, and in that time the
            controller acts {STEPS_PER_TARGET} times. Figure gives no rate for S2, so it is not drawn.
          </p>
          <p id={drawingId}>
            The drawing is a clock movement doing the same counting. The balance and the pallet fork let the escape
            wheel advance one tooth per control step, and its hand moves one division of the outer ring. Four pins on
            the escape wheel&apos;s arbor trip a lever once every fifth tooth, and the lever&apos;s pawl jumps the
            four-point star wheel by one point: its hand, the lit one, moves to the next of its four marks, a new
            joint target. The mainspring barrel and the third wheel power the train.
          </p>
          <p>
            Schematic: only the two rates come from Figure. The clockwork, the 20 milliseconds shown and the
            alignment of the two clocks (each target landing on a control step) are illustrative, and the clock runs{' '}
            {SLOWDOWN} times slower than real time so each tick can be seen. Figure does not say what S0 does with
            each target between updates; the figure shows only how often each layer acts.
          </p>
        </>
      }
      source="Rates from Figure's Helix 02 announcement (January 2026)."
    />
  );
}
