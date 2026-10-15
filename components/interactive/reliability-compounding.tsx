'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { compoundingCurve, compoundedSuccessRate } from '@/lib/reliability';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { roleColour } from '@/components/motion/chart';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import type { Flat } from '@/components/iso/iso-kit';
import {
  GATES,
  GATES_PER_RAIL,
  HEIGHT,
  HOPPER_SPOTS,
  MARBLE,
  MARBLE_R,
  MARBLES,
  PARTS,
  RAILS,
  WIDTH,
  finishCup,
  flapPath,
  gateHinge,
  gateHole,
  lockedGate,
  marbleRun,
  rejectCup,
  restCounts,
  screenOf,
  type Part,
  type Slot,
} from '@/components/iso/figures/marble-run';

/**
 * ReliabilityCompounding: the compounding cost of per-step error, drawn as a
 * marble run (components/iso/figures/marble-run.ts).
 *
 * A job of n steps finishes only if every step goes right, so its chance is
 * p^n. On the board each step is a trapdoor gate: the first n of its hundred
 * gates are armed, and a hundred marbles, one job each, roll down the zig-zag
 * rails. Each armed gate holds the share p of the marbles that reach it and
 * drops the rest into the reject tray; the ones that pass every armed gate
 * land in the finish tray, ten by ten, so the tray counts the jobs out of 100
 * that would finish. The still pose is the end of a run; "Roll the marbles"
 * plays it. The main view offers three per-step presets and the job length;
 * the full per-step slider and Reset sit in "Adjust more". A mount with a
 * preset set (reliability-gap) moves the job length into "Adjust more" after
 * the per-step slider. The evaluation-crisis and reliability-gap modules mount
 * it with different defaults, and the headline and caption follow the mount.
 */
type ReliabilityCompoundingPreset = {
  /** Per-step success probability in [0, 1]. */
  perStep: number;
  /** Episode length in steps. */
  steps: number;
};

/**
 * Named preset sets. `per-step-thresholds` is the reliability-gap bar: 95%,
 * 99% and 99.9% per step over one fixed 30-step episode, so pressing a
 * preset also sets the job to 30 steps.
 */
const PRESET_SETS = {
  'per-step-thresholds': [
    { perStep: 0.95, steps: 30 },
    { perStep: 0.99, steps: 30 },
    { perStep: 0.999, steps: 30 },
  ],
} as const satisfies Record<string, ReadonlyArray<ReliabilityCompoundingPreset>>;

/** The per-step presets every mount shows, in plain words. */
const PER_STEP_PRESETS = [
  { id: '95', percent: 95, label: '95 in 100' },
  { id: '99', percent: 99, label: '99 in 100' },
  { id: '99.9', percent: 99.9, label: '999 in 1,000' },
] as const;
type PerStepPresetId = (typeof PER_STEP_PRESETS)[number]['id'];

type Variant = 'home' | 'evaluation' | 'reliability' | 'prediction';

type ReliabilityCompoundingProps = {
  /** Initial per-step success probability in [0, 1]. Default 0.95. */
  defaultPerStep?: number;
  /** Initial episode length in steps. Default 30. */
  defaultSteps?: number;
  /** Longest episode the chart draws. Default 100. */
  maxSteps?: number;
  /**
   * Lowest selectable per-step success, in percent. Default 50; the
   * evaluation-crisis module passes 0 so the 0% boundary is reachable.
   */
  minPerStepPercent?: number;
  /**
   * Highest selectable per-step success, in percent. Default 99.9; the
   * evaluation-crisis module passes 100 so perfect reliability is reachable.
   */
  maxPerStepPercent?: number;
  /** A named set of settings the per-step presets jump to. */
  presets?: keyof typeof PRESET_SETS;
  /**
   * Distinguishes reused mounts so VAL-EDU-036 takeaways stay structurally
   * different after digit-run normalisation; also picks the headline.
   */
  descriptionVariant?: Variant;
  className?: string;
};

const HEADLINES: Record<Variant, string> = {
  evaluation: 'At 95% per step, half of 14-step jobs fail',
  prediction: 'At 95% per step, half of 14-step jobs fail',
  reliability: 'Get each step 95% right, and long jobs mostly fail',
  home: 'Get each step 95% right, and long jobs mostly fail',
};

const CAPTIONS: Record<Variant, string> = {
  evaluation:
    'A long job only works if every step works, so a robot that rarely slips still fails long tasks.',
  prediction:
    'A long job only works if every step works, so a robot that rarely slips still fails long tasks.',
  reliability:
    'Even a robot that rarely slips usually fails a long chore, which is why each step must be almost perfect.',
  home: 'Even a robot that rarely slips usually fails a long chore, which is why each step must be almost perfect.',
};

const DEFAULT_MIN_PER_STEP_PERCENT = 50;
const DEFAULT_MAX_PER_STEP_PERCENT = 99.9;

function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** A per-step percent as the stage writes it: 95%, 99%, 99.9%. */
function perStepWords(percent: number): string {
  return `${Number.isInteger(percent) ? percent.toFixed(0) : percent.toFixed(1)}%`;
}

function stepWord(n: number): string {
  return n === 1 ? 'step' : 'steps';
}

function reliabilityTakeaway(args: {
  variant: Variant;
  perStepPercent: number;
  steps: number;
  maxSteps: number;
  successPct: string;
  endPct: string;
  crossSteps: number;
}): string {
  const { variant, perStepPercent, steps, maxSteps, successPct, endPct, crossSteps } =
    args;
  if (variant === 'prediction') {
    return `The evaluation-crisis prediction panel is seeded at ${steps} steps so episode success sits at ${successPct} when per-step success is ${perStepPercent.toFixed(1)} percent, and the curve still ends at ${endPct} by step ${maxSteps} after crossing 50 percent near step ${crossSteps}.`;
  }
  if (variant === 'reliability') {
    return `On the reliability-gap calculator a ${perStepPercent.toFixed(1)} percent per-step policy yields ${successPct} episode success at ${steps} steps and only ${endPct} at the ${maxSteps}-step far end, with the 50 percent crossing near step ${crossSteps}.`;
  }
  if (variant === 'evaluation') {
    return `The evaluation calculator at ${perStepPercent.toFixed(1)} percent per-step success reports ${successPct} episode success after ${steps} decisions and ${endPct} at the ${maxSteps}-step end of the range, crossing half only around step ${crossSteps}.`;
  }
  return `At ${perStepPercent.toFixed(1)} percent per-step success, episode success is ${successPct} at ${steps} steps and ${endPct} at the ${maxSteps}-step end of the plotted range, crossing 50 percent at ${crossSteps} steps as the per-step odds compound over the episode length.`;
}

/** The board's static parts, as the kit draws them. */
function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }) {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        crease={part.crease}
        inner={part.inner ? <g dangerouslySetInnerHTML={{ __html: part.inner }} /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.fill === 'paper') return <path className="iso-fill" d={part.d} />;
  return (
    <g>
      <path className="iso-fill" d={part.d} />
      {part.fill === 'top' ? <path className="iso-top" d={part.d} /> : <path className="iso-shade" data-shade={part.fill} d={part.d} />}
    </g>
  );
}

/** A marble at a screen point: paper ball, its shaded side, a highlight and its rim; a finished one is lit. */
function Marble({ at, lit }: { at: Flat; lit: boolean }) {
  return (
    <g transform={`translate(${at[0].toFixed(2)} ${at[1].toFixed(2)})`} data-lit={lit ? '' : undefined}>
      <circle className="iso-fill" r={MARBLE.r} />
      {lit ? <circle r={MARBLE.r} fill="var(--anatomy-lit)" fillOpacity={0.2} /> : null}
      <path className="iso-shade" data-shade={1} d={MARBLE.shade} />
      <circle className="iso-top" cx={MARBLE.shine.cx} cy={MARBLE.shine.cy} r={MARBLE.shine.r} />
      <circle className="iso-line iso-edge" data-tone={lit ? 'lit' : 'mid'} r={MARBLE.r} />
    </g>
  );
}

const SVG_NS = 'http://www.w3.org/2000/svg';
/** The same marble, built for the run, which the live code moves without a React render. */
function marbleNode(): SVGGElement {
  const node = document.createElementNS(SVG_NS, 'g');
  const add = (tag: string, attrs: Record<string, string | number>) => {
    const child = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) child.setAttribute(key, String(value));
    node.append(child);
  };
  add('circle', { class: 'iso-fill', r: MARBLE.r });
  add('circle', { r: MARBLE.r, fill: 'var(--anatomy-lit)', 'fill-opacity': 0, 'data-tint': '' });
  add('path', { class: 'iso-shade', 'data-shade': 1, d: MARBLE.shade });
  add('circle', { class: 'iso-top', cx: MARBLE.shine.cx, cy: MARBLE.shine.cy, r: MARBLE.shine.r });
  add('circle', { class: 'iso-line iso-edge', 'data-tone': 'mid', r: MARBLE.r });
  return node;
}

/** A marble lights up only once it lands in the finish tray: nobody knows a job finishes until it has. */
function lightMarble(node: SVGGElement) {
  node.setAttribute('data-lit', '');
  node.querySelector('[data-tint]')?.setAttribute('fill-opacity', '0.2');
  node.querySelector('.iso-edge')?.setAttribute('data-tone', 'lit');
}

/** A tray marble's resting point: on its cup. */
const inCup = (cup: [number, number, number]) => screenOf([cup[0], cup[1], cup[2] + MARBLE_R - 1]);

type RunState = 'idle' | 'running' | 'done';

export function ReliabilityCompounding({
  defaultPerStep = 0.95,
  defaultSteps = 30,
  maxSteps = 100,
  minPerStepPercent = DEFAULT_MIN_PER_STEP_PERCENT,
  maxPerStepPercent = DEFAULT_MAX_PER_STEP_PERCENT,
  presets,
  descriptionVariant = 'home',
  className,
}: ReliabilityCompoundingProps) {
  // useId-derived ids: this component can render twice on one page, and a
  // hardcoded id would duplicate and cross-bind the labels.
  const uid = useId();
  const perStepId = `${uid}-rc-per-step`;
  const stepsId = `${uid}-rc-steps`;
  const descriptionId = `${uid}-rc-description`;
  const [perStepPercent, setPerStepPercent] = useState(defaultPerStep * 100);
  const [steps, setSteps] = useState(defaultSteps);
  const [runState, setRunState] = useState<RunState>('idle');

  const perStep = perStepPercent / 100;
  const episodeSuccess = compoundedSuccessRate(perStep, steps);
  const presetSet: ReadonlyArray<ReliabilityCompoundingPreset> | null = presets
    ? PRESET_SETS[presets]
    : null;
  const activePreset =
    PER_STEP_PRESETS.find((preset) => Math.abs(perStepPercent - preset.percent) < 0.05)?.id ??
    null;

  function choosePreset(id: PerStepPresetId) {
    const preset = PER_STEP_PRESETS.find((p) => p.id === id)!;
    setPerStepPercent(preset.percent);
    const linked = presetSet?.find((p) => Math.abs(p.perStep * 100 - preset.percent) < 0.05);
    if (linked) setSteps(linked.steps);
  }

  const sampleRows = useMemo(() => {
    // The sampled table reads the same compounding curve as the board's
    // trays, so the two can never disagree (VAL-EDU-023), and the sample
    // moves with the per-step control (VAL-EDU-024).
    const curve = compoundingCurve(perStep, maxSteps);
    return [0, 10, 25, 50, 75, maxSteps].map((n) => ({
      label: `${n} step${n === 1 ? '' : 's'}`,
      values: [`${(curve[n] * 100).toFixed(1)}%`],
    }));
  }, [perStep, maxSteps]);

  const successPct = formatPercent(episodeSuccess);
  const finished = Math.round(episodeSuccess * 100);
  const value = roleColour('value');

  function reset() {
    setPerStepPercent(defaultPerStep * 100);
    setSteps(defaultSteps);
    setRunState('idle');
  }

  // The board carries a hundred gates, the longest job a mount offers.
  const armed = Math.min(GATES, steps);
  const rest = restCounts(perStep, armed);

  // The live layer: a run's marbles are built and moved here, outside React.
  // A setting changed mid-run starts the run again with the new board.
  const slots = useRef(new Map<Slot, SVGGElement | null>());
  const flaps = useRef<Array<SVGGElement | null>>([]);
  useEffect(() => {
    if (runState !== 'running') return;
    const run = marbleRun(perStep, armed);
    const nodes = Array.from({ length: MARBLES }, () => marbleNode());
    const held = HOPPER_SPOTS.map(() => marbleNode());
    const hopper = slots.current.get('hopper') ?? null;
    held.forEach((node, index) => {
      node.setAttribute('transform', `translate(${screenOf(HOPPER_SPOTS[index]!).map((v) => v.toFixed(2)).join(' ')})`);
      hopper?.append(node);
    });
    const shown: Array<string | null> = new Array(MARBLES).fill(null);
    const open: number[] = new Array(GATES).fill(0);
    let clock = 0;
    let last = 0;
    let frame = 0;
    const place = (t: number) => {
      const { released } = run.counts(t);
      held.forEach((node, index) => node.setAttribute('opacity', index < MARBLES - released ? '1' : '0'));
      for (let release = 0; release < MARBLES; release++) {
        const where = run.place(release, t);
        const node = nodes[release]!;
        const slot: Slot | null = where.where === 'hopper' ? null : where.where === 'rail' ? `rail-${where.rail}` : where.where;
        if (slot !== shown[release]) {
          shown[release] = slot;
          if (slot) slots.current.get(slot)?.append(node);
          else node.remove();
          if (slot === 'finish') lightMarble(node);
        }
        if (where.where === 'rail') {
          const [x, y] = screenOf(where.at);
          node.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
          node.setAttribute('opacity', where.fade.toFixed(2));
        } else if (where.where !== 'hopper') {
          const [x, y] = screenOf([where.at[0], where.at[1], where.at[2] + 3 * (1 - where.settle)]);
          node.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
          node.setAttribute('opacity', where.settle.toFixed(2));
        }
      }
      const now = run.flaps(t);
      for (let gate = 0; gate < armed; gate++) {
        const share = Math.round(now[gate]! * 40) / 40;
        if (share !== open[gate]) {
          open[gate] = share;
          const d = flapPath(gate, share);
          flaps.current[gate]?.querySelectorAll('path').forEach((path) => path.setAttribute('d', d));
        }
      }
    };
    const tick = (now: number) => {
      const dt = last ? Math.min(now - last, 64) / 1000 : 1 / 60;
      last = now;
      clock = Math.min(run.duration, clock + dt);
      place(clock);
      if (clock >= run.duration) {
        setRunState('done');
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    place(0);
    frame = requestAnimationFrame(tick);
    const gates = flaps.current;
    return () => {
      cancelAnimationFrame(frame);
      for (const node of [...nodes, ...held]) node.remove();
      for (let gate = 0; gate < armed; gate++) {
        const d = flapPath(gate, 0);
        gates[gate]?.querySelectorAll('path').forEach((path) => path.setAttribute('d', d));
      }
    };
  }, [runState, perStep, armed]);

  const running = runState === 'running';
  const slot = (name: Slot) => {
    if (name.startsWith('gates-')) {
      const rail = Number(name.slice(6));
      return Array.from({ length: GATES_PER_RAIL }, (_, index) => {
        const gate = rail * GATES_PER_RAIL + index;
        if (gate >= armed) {
          const locked = lockedGate(gate);
          return (
            <g key={gate} data-gate="pinned">
              <Line d={locked.outline} tone="lo" />
              <Dots points={[locked.pin]} size={0.45} tone="lo" />
            </g>
          );
        }
        const hinge = gateHinge(gate);
        return (
          <g key={gate} data-gate="armed">
            <path className="iso-shade" data-shade={0} d={gateHole(gate)} />
            <g ref={(el) => { flaps.current[gate] = el; }}>
              <path className="iso-fill" d={flapPath(gate)} />
              <path className="iso-top" d={flapPath(gate)} />
              <path className="iso-line" data-tone="mid" d={flapPath(gate)} />
            </g>
            <Solid paths={hinge.rod} tone="mid" />
            <Dots points={hinge.pins} size={0.35} tone="hi" />
          </g>
        );
      });
    }
    if (name === 'finish' || name === 'reject') {
      const count = name === 'finish' ? rest.finished : rest.rejected;
      return (
        <g data-testid={`${name}-tray`} data-marbles={running ? undefined : count}>
          {running
            ? null
            : Array.from({ length: count }, (_, cup) => (
                <Marble key={cup} at={inCup(name === 'finish' ? finishCup(cup) : rejectCup(cup))} lit={name === 'finish'} />
              ))}
        </g>
      );
    }
    return null;
  };

  // A mount with a preset set fixes the job length its presets name, so
  // the job-length slider joins the full per-step slider in "Adjust more"
  // and the per-step presets are the one main-view control.
  const stepsField = (
    <ControlField>
      <ControlLabel htmlFor={stepsId} value={`${steps} ${stepWord(steps)}`}>
        How many steps the job has
      </ControlLabel>
      <input
        id={stepsId}
        type="range"
        data-brand-control-id="control:input"
        min={1}
        max={maxSteps}
        step={1}
        value={steps}
        onChange={(e) => setSteps(Number(e.target.value))}
        aria-label={`How many steps the job has (episode length in steps), currently ${steps}`}
        className={INSTRUMENT_SLIDER_CLASS}
      />
      <SliderEnds low="1 step" high={`${maxSteps} steps`} />
    </ControlField>
  );

  const runButton = (
    <button
      type="button"
      data-brand-control-id="control:secondary-action"
      data-testid="marble-run"
      onClick={() => {
        if (running) {
          setRunState('idle');
          return;
        }
        // Reduced motion shows the run's end, which is the board's still pose.
        setRunState(asksForStillness() ? 'done' : 'running');
      }}
      className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
    >
      {running ? 'Stop the run' : 'Roll the marbles'}
    </button>
  );

  return (
    <InstrumentFigure
      figureId="reliability-compounding"
      className={className}
      kicker="Compounding error"
      heading={HEADLINES[descriptionVariant]}
      controls={
        <>
          <PresetGroup<PerStepPresetId>
            label="How often each step goes right"
            presets={PER_STEP_PRESETS.map(({ id, label }) => ({ id, label }))}
            value={activePreset}
            onChange={choosePreset}
            testId="per-step-preset"
          />
          {presetSet ? null : stepsField}
          {runButton}
        </>
      }
      adjust={
        <>
          <ControlField>
            <ControlLabel htmlFor={perStepId} value={`${perStepPercent.toFixed(1)}%`}>
              How often each step goes right
            </ControlLabel>
            <input
              id={perStepId}
              type="range"
              data-brand-control-id="control:input"
              min={minPerStepPercent}
              max={maxPerStepPercent}
              step={0.1}
              value={perStepPercent}
              onChange={(e) => setPerStepPercent(Number(e.target.value))}
              aria-label={`How often each step goes right (per-step success probability in percent), currently ${perStepPercent.toFixed(1)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds
              low={`${perStepWords(minPerStepPercent)} of the time`}
              high={`${perStepWords(maxPerStepPercent)} of the time`}
            />
          </ControlField>
          {presetSet ? stepsField : null}
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint={running ? 'A hundred marbles, one job each' : 'White trapdoors: the steps · blue marbles: jobs that finish'}
          readout={
            <>
              <span data-testid="per-step-readout">{perStepPercent.toFixed(1)}%</span> per step ·{' '}
              {steps} {stepWord(steps)} ·{' '}
              <span data-testid="episode-success-readout" style={{ color: value }}>
                {successPct}
              </span>{' '}
              of jobs finish
            </>
          }
          status="Illustrative: a simple model, not a measured robot."
          data-testid="marble-run-stage"
        >
          <IsoFigure
            width={WIDTH}
            height={HEIGHT}
            label={`A marble run with ${GATES} trapdoor gates on ${RAILS} rails. ${armed} ${stepWord(armed)} armed, each passing ${perStepWords(perStepPercent)} of the marbles that reach it: ${rest.finished} of ${MARBLES} marbles reach the finish tray and ${rest.rejected} drop into the reject tray.`}
            describedBy={descriptionId}
          >
            {PARTS.map((part, index) =>
              part.kind === 'slot' ? (
                <g key={part.slot} ref={(el) => { slots.current.set(part.slot, el); }} data-slot={part.slot}>
                  {slot(part.slot)}
                </g>
              ) : (
                <PartView key={index} part={part} />
              ),
            )}
          </IsoFigure>
        </AnatomyStage>
      }
      caption={CAPTIONS[descriptionVariant]}
      method={
        <>
          <p>
            This is an illustrative probability model, computed rather than measured on a robot. A
            job (an episode) is a chain of steps (decisions), and it finishes only if every step
            goes right. If each step succeeds with the same probability p, independently of the
            others, a job of n steps finishes with probability p^n. At the current setting that is
            ({perStep.toFixed(3)})^{steps} = {successPct}. Real failures are rarely independent,
            so treat the curve as a teaching model, not a forecast.
          </p>
          <p>
            The drawing is a marble run of {GATES} trapdoor gates, ten to a rail; the first {armed}{' '}
            are armed as the job&rsquo;s steps and the rest are pinned shut. A hundred marbles, one
            job each, roll from the hopper. Each armed gate passes the share p of the marbles that
            reach it, rounded to whole marbles, so after k gates round(100 p^k) are still rolling, and
            the finish tray holds the readout&rsquo;s share as whole jobs out of 100 (now{' '}
            <span data-testid="finished-marbles">{finished}</span>). Which marble drops at which
            gate is a fixed shuffle of the release order; the counts do not depend on it. A run plays
            in about ten seconds, not to scale. Working backwards, a job that must finish with
            probability q over n steps needs each step to succeed with probability q^(1/n).
          </p>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Sampled episode success by episode length"
            rowHeader="episode length"
            columns={[{ header: 'episode success', numeric: true }]}
            rows={sampleRows}
            description={reliabilityTakeaway({
              variant: descriptionVariant,
              perStepPercent,
              steps,
              maxSteps,
              successPct,
              endPct: formatPercent(compoundedSuccessRate(perStep, maxSteps)),
              crossSteps: Math.max(
                1,
                Math.round(Math.log(0.5) / Math.log(perStep)),
              ),
            })}
          />
        </>
      }
    />
  );
}
