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
  DEEPEST_T,
  HEIGHT,
  PARTS,
  WIDTH,
  filtered,
  movingAt,
  phaseAt,
  proposalAt,
  type Part,
} from '@/components/iso/figures/guide-fence';

/**
 * SafetyFilterFence: why a learned policy is wrapped rather than certified,
 * for the frontier safety-and-assurance module, drawn as a guide-fence
 * bench (components/iso/figures/guide-fence.ts).
 *
 * A sealed box (the policy) swings an arm; a pen hangs from the arm's
 * spindle on a spring and draws on a plate. A ring fence round a keep-out
 * zone, the one lit part, is the safety filter: where the policy aims
 * outside it the pen draws the aim unchanged, and where the aim goes inside
 * the fence holds the pen at the nearest point on its edge, the least
 * change that keeps it out. The still pose is the deepest moment of the
 * stroke. "Run the policy" plays the stroke; the slider sets the moment by
 * hand. Reduced motion jumps to the end.
 */

/** The stroke plays over this many seconds. */
export const RUN_SECONDS = 4.5;
export const STILL_PERCENT = Math.round(DEEPEST_T * 100);

/** The readout, in words, for a moment `t` along the stroke. */
export function readoutFor(t: number) {
  const phase = phaseAt(t);
  if (phase === 'inside') return 'Aim inside · pen held at the fence';
  if (phase === 'done') return 'Done · changed only at the fence';
  return phase === 'before' ? 'Aim outside · pen follows exactly' : 'Aim outside again · pen follows exactly';
}

function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }): ReactNode {
  if (part.kind === 'solid') {
    return <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined} />;
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.fill === 'paper') return <path className="iso-fill" d={part.d} />;
  if (part.fill === 'top') return <path className="iso-top" d={part.d} />;
  return <path className="iso-shade" data-shade={part.fill} d={part.d} />;
}

const r1 = (value: number) => Number(value.toFixed(1));

export function SafetyFilterFence({ className }: { className?: string }) {
  const sliderId = useId();
  const drawingId = `${useId()}-drawing`;
  const [t, setT] = useState(DEEPEST_T);
  const [running, setRunning] = useState(false);
  /** Where a run starts: set by the run button, read once by the effect. */
  const runFrom = useRef(0);
  const moving = useMemo(() => movingAt(t), [t]);
  const aim = proposalAt(t);
  const pen = filtered(aim);
  const phase = phaseAt(t);
  const percent = Math.round(t * 100);

  // "Run the policy": the stroke from where it stands (or from the start once it is done).
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const from = runFrom.current;
    const start = performance.now();
    const tick = (now: number) => {
      const next = Math.min(1, from + (now - start) / (RUN_SECONDS * 1000));
      setT(next);
      if (next < 1) frame = requestAnimationFrame(tick);
      else setRunning(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const valueText = `${percent}% along the stroke: ${
    phase === 'inside' ? 'the policy aims inside the fence, and the pen is held at its edge' : 'the policy aims outside the fence, and the pen follows it exactly'
  }`;

  return (
    <InstrumentFigure
      figureId="safety-filter-fence"
      className={className}
      kicker="Safety filter"
      heading="A safety filter changes the path only where it must"
      controls={
        <>
          <SliderRow htmlFor={sliderId} label="Along the stroke" value={<span data-testid="fence-percent">{percent}%</span>}>
            <input
              id={sliderId}
              type="range"
              data-brand-control-id="control:input"
              min={0}
              max={100}
              step={1}
              value={percent}
              onChange={(e) => {
                setRunning(false);
                setT(Number(e.target.value) / 100);
              }}
              aria-valuetext={valueText}
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
              // Reduced motion jumps to the end of the stroke instead of playing it.
              if (typeof window.matchMedia === 'function' && asksForStillness()) setT(1);
              else {
                runFrom.current = t >= 1 ? 0 : t;
                setRunning(true);
              }
            }}
            data-testid="fence-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop the policy' : 'Run the policy'}
          </button>
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Faint: the policy's path. Dark: what the pen drew"
          readout={readoutFor(t)}
          status="Schematic: the filter's rule on an illustrative stroke"
          data-testid="fence-stage-frame"
        >
          <div
            data-testid="fence-drawing"
            data-t={Number(t.toFixed(3))}
            data-phase={phase}
            data-aim={`${r1(aim[0])},${r1(aim[1])}`}
            data-pen={`${r1(pen[0])},${r1(pen[1])}`}
          >
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              label={`A sealed box swings an arm; a pen hangs from the arm on a spring and draws on a plate. A lit ring fence round a keep-out zone is the safety filter. ${
                phase === 'inside' ? 'The arm aims inside the fence, and the fence holds the pen at the nearest point on its edge.' : 'The arm aims outside the fence, and the pen draws exactly where it aims.'
              }`}
              describedBy={drawingId}
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
      caption="A sealed policy proposes the path. The fence, simple enough to check, moves the pen only where it would enter, and by the least amount."
      method={
        <>
          <p>
            A learned policy has no written specification to certify, so what ships puts something simple enough to
            verify between the policy and the actuators. A safety filter is the formal version: a control barrier
            function defines a set the system must stay inside and turns staying inside it into a constraint on
            each command, and Wabersich and colleagues describe a filter that takes a proposed input from any source
            and modifies it as little as necessary.
          </p>
          <p id={drawingId}>
            The drawing is that rule as a bench. The sealed box, with no window and a tamper seal, stands for the
            policy: it swings the arm, and the arm&apos;s spindle is where the policy aims. The pen hangs from the
            spindle on a spring. The ring fence round the darker keep-out zone, lit, is the filter. Outside the
            fence the pen sits under the spindle and draws the proposal unchanged. When the aim goes inside, the
            fence stops the pen and the spring pulls it along the fence to the point nearest the aim: the smallest
            change that keeps it out. The faint line is the proposal; the dark ink is what was drawn, and the two
            differ only round the fence.
          </p>
          <p>
            Schematic: the stroke, the zone and the bench are illustrative, and no number is claimed. A real filter
            acts on commanded velocities or torques at every control step, against a set worked out from the
            robot&apos;s dynamics; the least-change rule is the same.
          </p>
        </>
      }
      source="Rule from Ames and colleagues (2019) and Wabersich and colleagues (2023)."
    />
  );
}
