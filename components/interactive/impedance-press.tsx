'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  PresetGroup,
  SliderRow,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { HEIGHT, PARTS, WIDTH, movingAt, type Part } from '@/components/iso/figures/spring-press';
import {
  SPRINGS,
  STILL_SPRING,
  STILL_TARGET,
  TARGET_MAX,
  TARGET_MIN,
  TARGET_STEP,
  pushFor,
  readoutFor,
  springOf,
  targetWords,
  toolFor,
  type SpringId,
} from '@/lib/impedance-press';

/**
 * ImpedancePress: what an impedance action sends, for the action-spaces
 * guide, drawn as a spring press (components/iso/figures/spring-press.ts).
 *
 * The policy sends a target and a stiffness. A crosshead carries the target
 * down a column; the tool hangs from its arm on a spring, the one lit part.
 * In free space the tool rides on the target. Past the scale's pan the tool
 * stops, the arm keeps going, and the spring pushes by its rate times the
 * gap, which the dial reads. The model is lib/impedance-press.ts. The still
 * pose is the medium spring two marks past the surface; the slider and the
 * spring tabs move it, and "Run the press" lowers the target from free
 * space to the deepest press. Reduced motion jumps instead.
 */

/** The run lowers the target over this many seconds. */
export const RUN_SECONDS = 4;
/** How quickly the crosshead follows the slider. */
const FOLLOW_SECONDS = 0.22;

const r2 = (value: number) => Math.round(value * 100) / 100;

/** The slider's value, in words. */
export function targetValue(target: number): string {
  if (target === 0) return 'on the surface';
  const amount = Math.abs(target);
  const text = `${Number.isInteger(amount) ? amount : amount.toFixed(1)} ${amount === 1 ? 'mark' : 'marks'}`;
  return target > 0 ? `${text} past` : `${text} short`;
}

/** What the slider's value means, for assistive technology. */
export function valueTextFor(spring: SpringId, target: number): string {
  const name = springOf(spring).label.toLowerCase();
  if (target <= 0) return `${targetWords(target)}: the tool rides on the target and pushes on nothing`;
  return `${targetWords(target)}: the tool stops on the surface and the ${name} spring pushes ${pushFor(spring, target)}`;
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

const smooth = (x: number) => x * x * (3 - 2 * x);

export function ImpedancePress({ className }: { className?: string }) {
  const sliderId = useId();
  const drawingId = `${useId()}-drawing`;
  const [spring, setSpring] = useState<SpringId>(STILL_SPRING);
  const [target, setTarget] = useState(STILL_TARGET);
  /** Where the crosshead stands now: it follows the target, or the run. */
  const [shown, setShown] = useState(STILL_TARGET);
  const shownRef = useRef(STILL_TARGET);
  const [running, setRunning] = useState(false);
  const moving = useMemo(() => movingAt({ spring, target: shown }), [spring, shown]);

  const show = useCallback((value: number) => {
    shownRef.current = value;
    setShown(value);
  }, []);

  // The crosshead follows the slider, eased; under reduced motion it jumps.
  useEffect(() => {
    if (running) return;
    if (shownRef.current === target) return;
    const calm = typeof window.matchMedia === 'function' && asksForStillness();
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      let value = calm ? target : shownRef.current + (target - shownRef.current) * (1 - Math.exp(-dt / FOLLOW_SECONDS));
      if (Math.abs(target - value) < 0.004) value = target;
      show(value);
      if (value !== target) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, running, show]);

  // "Run the press": the target goes from free space down to the deepest press.
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const share = Math.min(1, (now - start) / (RUN_SECONDS * 1000));
      show(TARGET_MIN + (TARGET_MAX - TARGET_MIN) * smooth(share));
      if (share < 1) frame = requestAnimationFrame(tick);
      else {
        setTarget(TARGET_MAX);
        setRunning(false);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, show]);

  const now = r2(shown);
  const push = pushFor(spring, now);
  // The readout's words and numbers come from one value, rounded once, so the push always equals rate × gap shown.

  return (
    <InstrumentFigure
      figureId="impedance-press"
      className={className}
      kicker="Impedance action"
      heading="The same target pushes harder through a stiffer spring"
      controls={
        <>
          <PresetGroup
            label="Spring the policy sets"
            presets={SPRINGS.map(({ id, label }) => ({ id, label }))}
            value={spring}
            onChange={(id) => setSpring(id)}
            testId="press-spring"
          />
          <SliderRow htmlFor={sliderId} label="Target" value={<span data-testid="press-target">{targetValue(target)}</span>}>
            <input
              id={sliderId}
              type="range"
              data-brand-control-id="control:input"
              min={TARGET_MIN}
              max={TARGET_MAX}
              step={TARGET_STEP}
              value={target}
              onChange={(e) => {
                setRunning(false);
                setTarget(Number(e.target.value));
              }}
              aria-valuetext={valueTextFor(spring, target)}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </SliderRow>
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            onClick={() => {
              if (running) {
                setTarget(r2(Math.round(shownRef.current / TARGET_STEP) * TARGET_STEP));
                setRunning(false);
                return;
              }
              // Reduced motion jumps to the deepest press instead of playing the run.
              if (typeof window.matchMedia === 'function' && asksForStillness()) {
                setTarget(TARGET_MAX);
                show(TARGET_MAX);
              } else setRunning(true);
            }}
            data-testid="press-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop the press' : 'Run the press'}
          </button>
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="The lit spring takes up the gap between the target and the tool"
          readout={readoutFor(spring, Math.round(now * 10) / 10)}
          status="Illustrative springs: 1, 2 and 4 marks of push per mark of gap"
          data-testid="press-stage-frame"
        >
          <div
            data-testid="press-drawing"
            data-spring={spring}
            data-target={now}
            data-tool={r2(toolFor(now))}
            data-push={r2(push)}
          >
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              describedBy={drawingId}
              label={`A spring press. A crosshead carries the target down a column, read on its ruler; the tool hangs from the crosshead's arm on a lit spring over the pan of a scale with a dial. ${
                now > 0
                  ? `The target is past the pan, so the tool rests on it and the ${springOf(spring).label.toLowerCase()} spring is squeezed by the gap; the dial reads its push.`
                  : 'The target is short of the pan, so the tool hangs on the target and the dial reads nothing.'
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
      caption="The policy sends a target and a stiffness. Past the surface the tool stops, and the spring pushes by stiffness times the gap."
      method={
        <>
          <p>
            An impedance action is a target pose plus a stiffness and a damping, and a controller under the policy
            turns the gap between the target and the tool into a push. Hogan&apos;s impedance law says exactly that:
            at rest the push is the stiffness times the gap, and the damping only acts while the tool moves.
          </p>
          <p id={drawingId}>
            The press is that law made of parts. The crosshead and its depth rod carry the target; the rod&apos;s tip,
            read on the column&apos;s ruler, is where the policy asked the tool to be. The tool hangs from the arm on a
            spring. In free space nothing stops the tool, so it rides on the target and the scale reads nothing. Once
            the target passes the pan, the pan stops the tool, the arm keeps going, the nut lifts off the arm, and the
            spring is squeezed by the gap. The dial reads the push: the spring&apos;s rate times the gap. The same
            target pushes four times as hard through the stiff spring as through the soft one.
          </p>
          <p>
            Illustrative: the three springs push 1, 2 and 4 dial marks per ruler mark of gap, and no force in newtons
            is claimed. On a robot the spring is in the controller, and the policy can change it at every step.
          </p>
        </>
      }
      source="Impedance law from Hogan (1985)."
    />
  );
}
