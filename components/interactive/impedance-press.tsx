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
import { HEIGHT, P, PARTS, TOOL, WIDTH, movingAt, needleAngle, tipFor, type Part } from '@/components/iso/figures/spring-press';
import { iso } from '@/components/iso/iso-kit';
import {
  PUSH_MAX,
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

/** The target's height is a virtual reference on the tool's line, not another physical part. */
export function targetGapGuide(target: number) {
  return {
    tool: iso([...TOOL, tipFor(toolFor(target))], P),
    target: iso([...TOOL, tipFor(target)], P),
    gap: gapFor(target),
  };
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
  const gapGuide = targetGapGuide(shown);

  return (
    <InstrumentFigure
      figureId="impedance-press"
      className={className}
      kicker="Impedance action"
      heading={displayedTarget > 0 ? "This action sends target and stiffness for contact" : displayedTarget < 0 ? "This action sends target and stiffness before contact" : "This action sends target and stiffness at the surface"}
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint={displayHintFor(spring, displayedTarget)}
          readout={displayReadoutFor(spring, displayedTarget)}
          status="Schematic ruler and dial marks, with no physical units: springs give 1, 2 or 4 dial marks per ruler mark."
          className="@container/press"
          style={{ overflow: 'visible' }}
          data-testid="press-stage-frame"
        >
          <div className="grid min-w-0 basis-full gap-1 font-sans leading-normal text-text max-[320px]:px-2!" data-testid="press-action-packet">
            <div className="@container/press-primary grid min-w-0 gap-2 font-sans leading-normal text-text" data-testid="press-relationship">
              <p className="min-w-0 text-[20px] font-semibold leading-[1.3]" data-testid="press-primary-takeaway">
                <span className="inline" data-testid="press-action-clause">
                  <span id={`${sliderId}-settings`} data-testid="press-action-label">An action sends target and stiffness;</span>
                </span>{' '}
                <span className="inline" data-testid="press-product-rule">
                  <span className="inline" data-testid="press-general-rule">once the surface stops the tool, push equals stiffness times target gap.</span>
                </span>
              </p>{' '}
            <div data-figure-controls="" data-testid="press-native-controls" className="grid min-w-0 gap-1">
            <p className="text-[16px] font-normal leading-normal" data-testid="press-chosen-settings">
                Action:{' '}
                    <span className="inline border-b border-current" data-testid="press-action-message">
                      <span data-action-field="target" className="inline-block min-w-min">target{' '}<span className="font-mono" data-action-value="target">{displayedTarget > 0 ? '+' : ''}{displayedTarget}</span></span>{' '}
                      and{' '}
                      <span data-action-field="stiffness" className="inline-block min-w-min">stiffness{' '}<span className="font-mono" data-action-value="stiffness">{springOf(spring).rate}</span>.</span>
                    </span>
            </p>
          <div
            role="group"
            aria-label="An action sends two settings: target and stiffness"
            aria-describedby={`${sliderId}-definitions`}
            data-testid="press-settings"
            className="flex min-w-0 basis-full flex-wrap items-end gap-x-3 gap-y-2"
          >
            <div className="[&_.figure-tab-row]:gap-x-1">
              <PresetGroup
                label="Action stiffness"
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
              className="gap-y-1 max-[320px]:grid max-[320px]:grid-cols-1 max-[320px]:[&>div]:min-w-0 max-[320px]:[&_input]:min-w-0 max-[320px]:[&>span]:whitespace-normal"
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
          </div>
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
            </div>{' '}
              <div
                role="group"
                aria-labelledby={`${sliderId}-controller`}
                aria-describedby={`${sliderId}-controller-role`}
                className="grid min-w-0 gap-2"
                data-testid="press-controller-output"
              >
                <div className="flex min-w-0 items-start gap-2" data-testid="press-send-path">
                  <svg aria-hidden="true" className="pointer-events-none h-8 w-5 shrink-0 text-text forced-colors:text-[CanvasText]!" viewBox="0 0 20 32" fill="none" stroke="currentColor" data-testid="press-send-connector" data-from="press-action-message" data-to="press-controller-output">
                    <path d="M10 0V28m-5-5 5 5 5-5" />
                  </svg>
                <div className="flex min-w-0 items-start gap-2" data-testid="press-controller-heading">
                  <p className="min-w-0 text-[14px]">
                    <span id={`${sliderId}-controller`} className="font-semibold">Controller</span>:{' '}
                    <span id={`${sliderId}-controller-role`} data-testid="press-controller-role">uses these settings to make the tool act like a spring.</span>
                  </p>
                </div>
                </div>{' '}
                <div className="grid min-w-0 gap-1" data-testid="press-contact-product">
                  <p className="text-[14px]" data-testid="press-response-label">Shown response</p>{' '}
                    <p className="text-[14px]" data-testid="press-position-condition">
                      <span aria-hidden="true" className="mr-2 inline-block h-3 w-3 align-middle bg-current forced-colors:bg-[CanvasText]!" data-testid="press-position-tool-key" />
                      <span data-testid="press-contact-clause">{displayedTarget > 0 ? 'The surface stops the tool.' : displayedTarget < 0
                        ? 'Before contact, the tool follows its target without pushing.'
                        : 'Tool and target meet the surface without pushing.'}</span>
                    </p>{' '}
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2" data-testid="press-response-diagram">
                <div
                  className="flex min-w-[min(100%,10rem)] flex-1 flex-wrap items-center gap-x-2 gap-y-2"
                  data-testid="press-position-diagram"
                  data-target={displayedTarget}
                  data-tool={toolFor(displayedTarget)}
                  data-gap={gapFor(displayedTarget)}
                  data-push={Number(pushFor(spring, displayedTarget).toFixed(1))}
                >
                  <div aria-hidden="true" className="pointer-events-none relative my-3 h-28 w-16 shrink-0" data-testid="press-position-marks">
                    <span className="absolute inset-y-0 left-0 border-l border-current" data-testid="press-ruler" />
                    {Array.from({ length: TARGET_MAX - TARGET_MIN + 1 }, (_, index) => TARGET_MIN + index).map(mark => <span key={mark} className="absolute left-0 w-1 border-t border-current" style={{ top: `${40 + mark * 20}%` }} data-ruler-mark={mark} />)}
                    <span className="absolute inset-x-0 border-t border-current" style={{ top: '40%' }} data-testid="press-position-surface" />
                    <span className="absolute left-2 w-6 border-t border-dashed border-current" style={{ top: `${40 + displayedTarget * 20}%` }} data-testid="press-position-target" />
                    <span className="absolute left-5 h-3 w-3 -translate-x-1/2 -translate-y-1/2 bg-current forced-colors:bg-[CanvasText]!" style={{ top: `${40 + toolFor(displayedTarget) * 20}%` }} data-testid="press-position-tool" />
                    <span className={`absolute left-12 w-2 border-current${gapFor(displayedTarget) > 0 ? ' border-y border-r' : ' border-0'}`} style={{ top: `${40 + toolFor(displayedTarget) * 20}%`, height: `${gapFor(displayedTarget) * 20}%` }} data-testid="press-position-gap" />
                  </div>
                  <div className="grid min-w-min flex-1 gap-2 text-[14px]" data-testid="press-position-labels">
                    <p className="flex min-w-min items-center gap-2"><span aria-hidden="true" className="w-4 shrink-0 border-t border-current" />Surface stops tool</p>{' '}
                    <p className="min-w-0" data-testid="press-shown-target">
                      <span aria-hidden="true" className="mr-2 inline-block w-4 align-middle border-t border-dashed border-current" />
                      Shown target: {targetValue(displayedTarget)}
                    </p>
                  </div>
                </div>
                    <svg
                      role="img"
                      aria-label="Push dial"
                      aria-describedby={`${sliderId}-push-description ${sliderId}-dial-scale`}
                      style={{ ['--motion-stage-view-width' as string]: '112px', ['--motion-stage-type-min-width' as string]: '112px', ['--motion-stage-max-scale' as string]: 1, ['--motion-stage-readout-size' as string]: '14px' } as CSSProperties}
                      className="motion-stage-svg h-28 w-28 shrink-0 overflow-visible text-text forced-colors:text-[CanvasText]!"
                      viewBox="0 0 112 112"
                      data-testid="press-push-dial"
                      data-push={Number(pushFor(spring, displayedTarget).toFixed(1))}
                      data-min="0"
                      data-max={PUSH_MAX}
                    >
                      <desc id={`${sliderId}-dial-scale`}>Schematic push scale from 0 to {PUSH_MAX} dial marks, without physical units.</desc>
                      <circle cx="56" cy="50" r="34" fill="none" stroke="currentColor" />
                      {Array.from({ length: PUSH_MAX + 1 }, (_, mark) => {
                        const angle = needleAngle(mark);
                        const major = mark % 4 === 0;
                        return <g key={mark} data-dial-mark={mark}>
                          <line x1={56 + Math.sin(angle) * (major ? 27 : 30)} y1={50 - Math.cos(angle) * (major ? 27 : 30)} x2={56 + Math.sin(angle) * 34} y2={50 - Math.cos(angle) * 34} stroke="currentColor" />
                          {major ? <text x={56 + Math.sin(angle) * 46} y={50 - Math.cos(angle) * 46} textAnchor="middle" dominantBaseline="central" fill="currentColor" className="font-mono text-[14px]" data-scene-readout="" data-dial-label={mark}>{mark}</text> : null}
                        </g>;
                      })}
                      <line x1="56" y1="50" x2={56 + Math.sin(needleAngle(Number(pushFor(spring, displayedTarget).toFixed(1)))) * 25} y2={50 - Math.cos(needleAngle(Number(pushFor(spring, displayedTarget).toFixed(1)))) * 25} stroke="currentColor" strokeWidth="2" data-testid="press-dial-needle" />
                      <circle cx="56" cy="50" r="2" fill="currentColor" />
                    </svg>
                  </div>{' '}
                  <p className="flex min-w-0 items-start gap-2 text-[16px] leading-normal" data-testid="press-sent-rule">
                    <span aria-hidden="true" className="pointer-events-none shrink-0" data-testid="press-gap-output-connector" data-from="press-position-gap" data-to="press-calculation">↓</span>{' '}
                    <span className="min-w-0">Shown calculation</span>
                  </p>{' '}
                  <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2" data-testid="press-result-with-dial">
                <div
                  role="group"
                  aria-label="Stiffness times target gap equals push"
                  className="grid min-w-0 max-w-[36rem] gap-1"
                  data-testid="press-calculation"
                >
                  <div className="grid min-w-0 gap-1 font-sans text-[16px] leading-normal" data-testid="press-value-descriptions">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1" data-testid="press-stiffness-product-row">
                    <p id={`${sliderId}-stiffness-description`} className="min-w-0" data-testid="press-stiffness-description">
                      <span className="font-semibold" data-operation-label="stiffness">sent stiffness</span>:{' '}
                      <span className="whitespace-nowrap font-mono" data-description-value="stiffness">{springOf(spring).rate}</span>
                    </p>
                    </div>{' '}
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1" data-testid="press-gap-product-row">
                      <p className="inline-flex shrink-0 items-baseline gap-1 font-semibold" data-testid="press-gap-product-operator"><span aria-hidden="true">×</span>{' '}<span>times</span></p>{' '}
                    <p id={`${sliderId}-gap-description`} className="min-w-0" data-testid="press-gap-description">
                      <span aria-hidden="true" className="mr-2 inline-block h-3 w-2 align-middle border-y border-r border-current" data-testid="press-position-gap-key" />
                      <span id={`${sliderId}-gap-label`} className="whitespace-nowrap font-semibold" data-operation-label="gap">target gap</span>:{' '}
                      <span className="whitespace-nowrap font-mono" data-description-value="gap">{gapFor(displayedTarget)}</span>{' '}
                      ruler marks
                    </p>
                    </div>{' '}
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1" data-testid="press-push-product-row">
                      <p className="inline-flex shrink-0 items-baseline gap-1 font-semibold" data-testid="press-push-product-operator"><span aria-hidden="true">=</span>{' '}<span>equals</span></p>{' '}
                    <p id={`${sliderId}-push-description`} className="min-w-0" data-testid="press-push-description">
                      <span className="font-semibold" data-operation-label="push">push</span>:{' '}
                      <span className="whitespace-nowrap font-mono" data-description-value="push">{Number(pushFor(spring, displayedTarget).toFixed(1))}</span>{' '}
                      dial marks
                    </p>
                    </div>
                  </div>{' '}
                  <div
                    className="flex min-w-0 flex-nowrap items-baseline gap-0.5 font-mono text-[clamp(1rem,8cqi,1.5rem)] font-semibold"
                    data-testid="press-equation"
                  >
                    <div className="shrink-0" data-testid="press-stiffness-operand">
                      <p className="whitespace-nowrap font-mono" data-operation-value="stiffness" aria-describedby={`${sliderId}-stiffness-description`}>{springOf(spring).rate}</p>
                    </div>{' '}
                    <div className="flex shrink-0 items-baseline gap-0.5" data-testid="press-gap-term">
                      <p className="shrink-0 font-sans" data-operation-symbol="multiply">×</p>{' '}
                      <div
                        className="shrink-0"
                        data-testid="press-gap-operand"
                        aria-describedby={`${sliderId}-gap-evidence`}
                      >
                        <p className="whitespace-nowrap font-mono" data-operation-value="gap" aria-describedby={`${sliderId}-gap-description`}>{gapFor(displayedTarget)}</p>
                      </div>
                    </div>{' '}
                    <div className="flex shrink-0 items-baseline gap-0.5" data-testid="press-result-term">
                      <p className="shrink-0 font-sans" data-operation-symbol="equals">=</p>{' '}
                      <div className="shrink-0" data-testid="press-push-result">
                        <p className="whitespace-nowrap font-mono" data-operation-value="push" aria-describedby={`${sliderId}-push-description`}>{Number(pushFor(spring, displayedTarget).toFixed(1))}</p>
                      </div>
                    </div>
                  </div>
                </div>{' '}

                  </div>{' '}
                  <p className="font-sans text-[14px] leading-normal text-text-dim" data-testid="press-scale-definitions">Ruler: target gap. Dial: push.</p>
                </div>
              </div>
            </div>{' '}
          </div>
        </AnatomyStage>
      }
      caption="Once the surface stops the tool, push equals stiffness times how far the target sits past it."
      method={
        <>
          <div className="iso @container/press" style={{ ['--anatomy-view-width' as string]: `${WIDTH}px` } as CSSProperties} data-testid="press-method-analogy" data-anatomy-drawing="">
          <div
            className="grid min-w-0 gap-6 font-sans leading-normal text-text @min-[38em]/press:grid-cols-2 @min-[38em]/press:items-start"
            data-testid="press-proof"
          >
              <p id={`${sliderId}-definitions`} className="font-sans text-[14px] leading-normal text-text">
                Target is where to aim. Stiffness sets how strongly the tool behaves like a spring.
              </p>
            <div className="grid min-w-0 gap-3" data-testid="press-analogy">
              <p className="text-center text-[14px]" data-testid="press-analogy-label">Spring analogy: target gap</p>
            <div
              className="grid min-w-0 gap-3"
              data-testid="press-drawing"
              role="group"
              id={`${sliderId}-gap-evidence`}
              aria-labelledby={`${sliderId}-gap-label`}
              data-spring={spring}
              data-target={now}
              data-tool={r2(toolFor(now))}
              data-push={r2(push)}
            >
              <p className="text-[18px]" data-testid="press-mechanism">
                {displayedTarget > 0 ? 'The surface stops the tool.' : displayedTarget < 0
                  ? 'Before contact, the tool follows its target without pushing.'
                  : 'No target gap means no push.'}
              </p>
              <div className="relative mx-auto w-3/5 max-w-[14rem] @min-[38em]/press:w-full" data-testid="press-gap-canvas">
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
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 inset-x-0 text-text max-sm:-inset-x-[12px]"
                  style={{ backgroundColor: 'transparent' }}
                  data-testid="press-gap-guide"
                  data-target-reference="virtual"
                  data-guide-target={shown}
                  data-gap={gapGuide.gap}
                  data-tool-x={gapGuide.tool[0]}
                  data-tool-y={gapGuide.tool[1]}
                  data-target-x={gapGuide.target[0]}
                  data-target-y={gapGuide.target[1]}
                >
                  <span
                    data-testid="press-gap-tool-line"
                    className="absolute h-0 border-t border-current forced-colors:outline forced-colors:outline-1 forced-colors:outline-[Canvas]"
                    style={{ left: `${(gapGuide.tool[0] / WIDTH) * 100}%`, top: `${(gapGuide.tool[1] / HEIGHT) * 100}%`, width: `${94 - (gapGuide.tool[0] / WIDTH) * 100}%` }}
                  />
                  {gapGuide.gap > 0 ? (
                    <span
                      data-testid="press-gap-target-line"
                      className="absolute h-0 border-t border-dashed border-current forced-colors:outline forced-colors:outline-1 forced-colors:outline-[Canvas]"
                      style={{ left: `${(gapGuide.target[0] / WIDTH) * 100}%`, top: `${(gapGuide.target[1] / HEIGHT) * 100}%`, width: `${94 - (gapGuide.target[0] / WIDTH) * 100}%` }}
                    />
                  ) : null}
                  <span
                    data-testid="press-gap-bracket"
                    className={`absolute w-0 border-l border-current${gapGuide.gap > 0 ? ' forced-colors:outline forced-colors:outline-1 forced-colors:outline-[Canvas]' : ''}`}
                    style={{ left: '94%', top: `${(gapGuide.tool[1] / HEIGHT) * 100}%`, height: `${((gapGuide.target[1] - gapGuide.tool[1]) / HEIGHT) * 100}%` }}
                  />
                </div>
              </div>
              <div className="grid min-w-0 gap-2 text-[14px]" data-testid="press-gap-key">
                <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1">
                  <p className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true" className="w-4 shrink-0 border-t border-current" />
                    {gapGuide.gap > 0 ? 'Stopped tool' : 'Tool and target'}
                  </p>{' '}
                  {gapGuide.gap > 0 ? (
                    <p className="flex min-w-0 items-center gap-2">
                      <span aria-hidden="true" className="w-4 shrink-0 border-t border-dashed border-current" />
                      Target level
                    </p>
                  ) : null}
                </div>{' '}
                <p data-testid="press-gap-statement">
                  {shown < 0 ? 'Tool follows target. Marked target gap: 0 ruler marks.' : shown === 0
                    ? 'Tool and target meet at the surface. Marked target gap: 0 ruler marks.'
                    : <>Marked target gap: <span className="font-mono">{gapFor(displayedTarget)}</span> ruler {gapFor(displayedTarget) === 1 ? 'mark' : 'marks'} from the stopped tool to the target level.</>}
                </p>
              </div>
            </div>
            </div>
          </div>
          </div>
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
