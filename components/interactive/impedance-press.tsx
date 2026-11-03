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
  gapFor,
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
  return target > 0 ? `${text} past surface` : `${text} short of surface`;
}

/** What the slider's value means, for assistive technology. */
export function valueTextFor(spring: SpringId, target: number): string {
  const name = springOf(spring).label.toLowerCase();
  if (target <= 0) return `${targetWords(target)}: the tool rides on the target and pushes on nothing`;
  return `${targetWords(target)}: the tool stops on the surface and the ${name} spring pushes ${pushFor(spring, target)}`;
}

/** Keep the model's rounded dial and zero-state wording; gloss only the schematic marks. */
export function displayReadoutFor(spring: SpringId, target: number): string {
  return readoutFor(spring, target)
    .replace(' past ·', ' past surface ·')
    .replace(' short ·', ' short of surface ·')
    .replace(/(push [0-9.]+)$/, '$1 dial marks');
}

/** Use the same rounded target and one-decimal push as the canonical readout. */
export function displayHintFor(spring: SpringId, target: number): string {
  const displayedTarget = Math.round(target * 10) / 10;
  if (displayedTarget < 0) return 'Before contact, the tool follows the target and pushes on nothing.';
  if (displayedTarget === 0) return 'Target and tool meet the surface with no gap, so there is no push.';
  const push = pushFor(spring, displayedTarget);
  const pushWords = Number.isInteger(push) ? String(push) : push.toFixed(1);
  return `The surface stops the tool. Stiffness ${springOf(spring).rate} times a target gap of ${displayedTarget} ruler marks gives ${pushWords} dial marks of push.`;
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
  const displayedTarget = Math.round(now * 10) / 10;
  // The readout's words and numbers come from one value, rounded once, so the push always equals rate × gap shown.

  return (
    <InstrumentFigure
      figureId="impedance-press"
      className={className}
      kicker="Impedance action"
      heading={displayedTarget > 0 ? "Surface stops the tool; stiffness times target gap sets push" : displayedTarget < 0 ? "Before contact, the tool follows its target without pushing" : "At the surface, no target gap means no push"}
      controls={
        <>
          <p className="basis-full pb-2 font-sans text-[16px] font-semibold leading-normal text-text" data-testid="press-mechanism">
            An impedance action sends a target and stiffness.{' '}
            {displayedTarget > 0 ? (
              <>Past a surface the tool stops, and push equals stiffness times how far the target sits past it.</>
            ) : displayedTarget < 0 ? (
              <>The tool follows its target before contact. No contact means no push.</>
            ) : (
              <>The target meets the surface. Zero target gap means zero push.</>
            )}
          </p>
          <div className="[&_.figure-tab-row]:gap-x-1">
            <PresetGroup
              label="Spring set by the movement controller"
              presets={SPRINGS.map(({ id, label }) => ({ id, label }))}
              value={spring}
              onChange={(id) => setSpring(id)}
              testId="press-spring"
            />
          </div>
          <SliderRow
            htmlFor={sliderId}
            label="Target"
            value={<span data-testid="press-target">{targetValue(target)}</span>}
            className="max-[320px]:grid max-[320px]:grid-cols-1 max-[320px]:[&>div]:min-w-0 max-[320px]:[&_input]:min-w-0 max-[320px]:[&>span]:whitespace-normal"
          >
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
          hint={displayHintFor(spring, displayedTarget)}
          readout={displayReadoutFor(spring, displayedTarget)}
          status="Schematic ruler and dial marks, with no physical units: springs give 1, 2 or 4 dial marks per ruler mark."
          data-testid="press-stage-frame"
        >
          <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="grid gap-3 font-sans text-[14px] leading-normal text-text">
              <p className="grid grid-cols-1 items-baseline gap-x-3 gap-y-2 min-[320px]:grid-cols-[max-content_1fr]" data-testid="press-calculation">
                <span className="font-semibold">Target gap</span>{' '}
                <span><strong className="font-mono text-[24px]">{gapFor(displayedTarget)}</strong> ruler marks</span>{' '}
                <span className="font-semibold">times stiffness</span>{' '}
                <strong className="font-mono text-[24px]">{springOf(spring).rate}</strong>{' '}
                <span className="font-semibold">equals push</span>{' '}
                <span><strong className="font-mono text-[24px]">{Number(pushFor(spring, displayedTarget).toFixed(1))}</strong> dial marks.</span>
              </p>
            </div>
            <div
              className="mx-auto w-2/3 sm:w-full"
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
                    : now < 0
                      ? 'The target is short of the pan, so the tool hangs on the target and the dial reads nothing.'
                      : 'The target meets the pan, so the tool just touches it and the dial reads nothing.'
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
          </div>
        </AnatomyStage>
      }
      caption="The movement controller sends a target and stiffness; once the surface stops the tool, push equals stiffness times the remaining gap."
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
      source="Target-and-stiffness control from Hogan (1985): the controller makes the tool behave like a spring."
    />
  );
}
