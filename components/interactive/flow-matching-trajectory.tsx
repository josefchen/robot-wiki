'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness, useInView } from '@/components/iso/react/live';
import { LiveSolid, writeSolid } from '@/components/iso/live-solid';
import { PartView } from '@/components/iso/part-view';
import {
  BEADS,
  BENCH_PARTS,
  CARRIAGE_PARTS,
  DRAW_EVERY,
  FAR_TRUCK_PARTS,
  FIELD_TAU,
  FOCUS,
  FOCUS_SAMPLE,
  FRONT_PARTS,
  HEIGHT,
  JUMP_END,
  NEAR_TRUCK_PARTS,
  NEEDLES,
  PER_ROD,
  PHONE_FIT,
  POCKETS,
  RODS,
  ROD_PATHS,
  U,
  WIDTH,
  beadAt,
  bladeAt,
  bridgeAt,
  carriageAt,
  engravedLine,
  guidesAt,
  hopsOf,
  inPocket,
  inkPath,
  knobPointer,
  landedMark,
  leverAt,
  missMark,
  onPlate,
  plateLine,
  readingsOf,
  startRing,
  stylusPoint,
  type Part,
} from '@/components/iso/figures/field-table';
import {
  MAX_STEPS,
  MIN_STEPS,
  PI06_STEPS,
  PI0_STEPS,
  endpointDispersion,
  generateFlowField,
  integrateFlow,
  type Vec2,
} from '@/lib/flow-matching';

/**
 * FlowMatchingTrajectory: why the π0 action expert refines a move in a few
 * small steps instead of one jump.
 *
 * The stage is a field table (components/iso/figures/field-table.ts): a
 * plate is the action space, two pockets on it are the two good moves, and
 * a groove is the slightly bent path the learned field carries one random
 * start along. A pen plotter's stylus starts on that start's pad and takes
 * as many straight hops as the reader picks; before each hop a vane beside
 * it turns to the field where it stands and stays standing. Its ink (the
 * lit part) is the Euler path: one hop follows its one vane straight past
 * the bend and lands outside the pocket, five or ten follow the turning
 * vanes into it. The one-hop path stays engraved as a ghost beside
 * them, the other drawn samples' paths are engraved faintly, and a bead
 * counter slides one bead per hop, one pass of the model each. The still
 * pose is the end of the run; "Run the stylus" plays the hops one by one.
 *
 * Main view: the step presets the shipped models use. "Adjust more" holds
 * the free slider, the 50-step setting, the learned-field needles and Reset.
 * "How this was made" holds the flow-matching and Euler-integration method,
 * the endpoint error and the sources. The model is illustrative: 48 seeded
 * samples in two of a chunk's dimensions, with a small deterministic bend
 * standing in for the learned field's imperfection (lib/flow-matching.ts).
 */
type FlowMatchingTrajectoryProps = {
  /** Initial integration steps. Default 10 (the π0 configuration). */
  defaultSteps?: number;
  className?: string;
};

type StepPreset = 'one' | 'five' | 'ten';
const STEP_PRESETS: ReadonlyArray<{ id: StepPreset; steps: number; label: string }> = [
  { id: 'one', steps: 1, label: '1 step' },
  { id: 'five', steps: PI06_STEPS, label: `${PI06_STEPS} steps (π0.6, π0.7)` },
  { id: 'ten', steps: PI0_STEPS, label: `${PI0_STEPS} steps (π0)` },
];

function regimeFor(steps: number): string {
  if (steps <= 2) return 'too few, cutting the corner';
  if (steps >= 50) return 'accurate but unaffordable';
  return 'on the modes';
}

/** The note at the landing point, in plain words for the current step count. */
function landingNote(steps: number): string[] {
  if (steps === 1) return ['One big jump cuts the', 'corner and misses'];
  if (steps === 2) return ['Two jumps still', 'miss the good move'];
  if (steps <= 4) return [`${steps} steps get close`, 'to the good move'];
  if (steps >= MAX_STEPS) return [`${steps} steps land too, at`, 'five times the cost of ten'];
  return [`${steps} small steps land`, 'on the good move'];
}

function stepWords(steps: number): string {
  return `${steps} ${steps === 1 ? 'step' : 'steps'}`;
}

/** A geometry module's part list, with its slots filled by the live component. */
function partsOf(parts: readonly Part[], slot: (name: string) => ReactNode): ReactNode[] {
  return parts.map((part, index) => (part.kind === 'slot' ? slot(part.name) : <PartView key={index} part={part} />));
}

/** The ink's hop marks paint in the lit accent, as the ink does. */
const HOP_MARKS: CSSProperties = { ['--anatomy-dot' as string]: 'var(--anatomy-lit)' };
const INK_STYLE: CSSProperties = { strokeWidth: 1.15 };

/** How long the finished run holds before the figure settles back to rest. */
const HOLD_S = 0.6;

/** A critically damped settle toward `target`, `seconds` its time constant; true while still moving. */
type Settle = { x: number; v: number };
function settle(state: Settle, target: number, dt: number, seconds: number): boolean {
  const w = 1 / seconds;
  const slice = dt / 4;
  for (let step = 0; step < 4; step++) {
    state.v += (w * w * (target - state.x) - 2 * w * state.v) * slice;
    state.x += state.v * slice;
  }
  if (Math.abs(target - state.x) < 1e-3 && Math.abs(state.v) < 0.02) {
    state.x = target;
    state.v = 0;
    return false;
  }
  return true;
}

/** The angle nearest `from` that points the same way as `to`. */
const nearestTurn = (from: number, to: number) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from));

type Run = { hop: number; phase: 'read' | 'move' | 'hold'; angle: Settle; along: Settle; press: Settle; held: number };

export function FlowMatchingTrajectory({
  defaultSteps = PI0_STEPS,
  className,
}: FlowMatchingTrajectoryProps) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const sliderId = `${uid}-fm-steps`;
  const [steps, setSteps] = useState(defaultSteps);
  const [showField, setShowField] = useState(false);
  const field = useMemo(() => generateFlowField(), []);
  const drawn = useMemo(
    () => field.samples.filter((_, i) => i % DRAW_EVERY === 0),
    [field],
  );
  const paths = useMemo(() => drawn.map((s) => integrateFlow(s, steps)), [drawn, steps]);
  const dispersion = endpointDispersion(field, steps);
  const oneJump = endpointDispersion(field, 1);
  const preset = STEP_PRESETS.find((p) => p.steps === steps)?.id ?? null;

  // The stylus's hops are the Euler polyline of the followed sample, the same function the paths above come from.
  const hops = useMemo(() => hopsOf(steps), [steps]);
  const hopCount = hops.length - 1;
  const landing = hops[hopCount]!;
  const landed = inPocket(landing);
  const readings = useMemo(() => readingsOf(steps), [steps]);
  const [running, setRunning] = useState(false);
  // While the stylus runs React draws the start; the loop writes every frame after it.
  const shownHops = running ? 0 : hopCount;
  const shownPoint = running ? hops[0]! : landing;

  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef);
  const bridgeRef = useRef<SVGGElement>(null);
  const carriageRef = useRef<SVGGElement>(null);
  const farGuideRefs = useRef<Array<SVGGElement | null>>([]);
  const nearGuideRefs = useRef<Array<SVGGElement | null>>([]);
  const readingRefs = useRef<Array<SVGGElement | null>>([]);
  const bladeRefs = useRef<Array<SVGGElement | null>>([]);
  const inkRef = useRef<SVGPathElement>(null);
  const marksRef = useRef<SVGGElement>(null);
  const outcomeRef = useRef<SVGGElement>(null);
  const beadRefs = useRef<Array<SVGGElement | null>>([]);
  const leverBarRef = useRef<SVGGElement>(null);
  const leverBallRef = useRef<SVGGElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const runRef = useRef<Run | null>(null);

  useEffect(() => {
    if (!running || !inView || typeof requestAnimationFrame !== 'function') return;
    const run = runRef.current;
    if (!run) return;
    // Fewer, longer hops play at the same pace; many hops play a little quicker, so fifty stay watchable.
    const pace = Math.min(1, Math.sqrt(PI0_STEPS / hopCount));
    const place = (point: Vec2) => {
      bridgeRef.current?.setAttribute('transform', bridgeAt(point));
      carriageRef.current?.setAttribute('transform', carriageAt(point));
      const guides = guidesAt(point.y * U);
      guides.far.forEach((paths, index) => writeSolid(farGuideRefs.current[index] ?? null, paths));
      guides.near.forEach((paths, index) => writeSolid(nearGuideRefs.current[index] ?? null, paths));
    };
    const draw = () => {
      const progress = run.hop + (run.phase === 'move' ? run.along.x : 0);
      place(stylusPoint(hops, progress));
      const reading = readings[run.hop];
      if (reading && run.phase !== 'hold') {
        readingRefs.current[run.hop]?.setAttribute('display', 'inline');
        writeSolid(bladeRefs.current[run.hop] ?? null, bladeAt(reading, run.angle.x));
      }
      inkRef.current?.setAttribute('d', inkPath(hops, progress));
      marksRef.current?.querySelectorAll<SVGCircleElement>('[data-hop]').forEach((mark) => {
        mark.setAttribute('display', Number(mark.dataset.hop) <= run.hop ? 'inline' : 'none');
      });
      const bead = beadRefs.current[run.hop];
      if (bead && run.phase === 'move') bead.setAttribute('transform', beadAt(run.along.x));
      const lever = leverAt(run.press.x);
      writeSolid(leverBarRef.current, lever.bar);
      writeSolid(leverBallRef.current, lever.ball);
      outcomeRef.current?.setAttribute('display', run.phase === 'hold' ? 'inline' : 'none');
      if (phaseRef.current) {
        phaseRef.current.textContent =
          run.phase === 'hold' ? `landed after ${stepWords(hopCount)} · ` : `hop ${run.hop + 1} of ${hopCount} · `;
      }
    };
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(now - last, 64)) / 1000;
      last = now;
      if (run.phase === 'read') {
        // Read the field where the stylus stands: the needle turns, the lever counts the pass.
        const turning = settle(run.angle, nearestTurn(run.angle.x, readings[run.hop]!.angle), dt, 0.04 * pace);
        settle(run.press, 1, dt, 0.03 * pace);
        if (!turning) run.phase = 'move';
      } else if (run.phase === 'move') {
        // Go straight along the reading for one step's share of the trip; the pass's bead slides over.
        const moving = settle(run.along, 1, dt, 0.05 * pace);
        settle(run.press, 0, dt, 0.04 * pace);
        if (!moving) {
          beadRefs.current[run.hop]?.setAttribute('data-spent', '');
          run.hop += 1;
          run.along = { x: 0, v: 0 };
          // The next vane rises turned the way the last one read, then swings to the field where it stands.
          if (run.hop >= hopCount) run.phase = 'hold';
          else run.phase = 'read';
        }
      } else {
        settle(run.press, 0, dt, 0.04);
        run.held += dt;
      }
      draw();
      if (run.phase === 'hold' && run.held >= HOLD_S) {
        setRunning(false);
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    draw();
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running, inView, hops, hopCount, readings]);

  // At rest the readout carries no phase; a run that stops early leaves none behind.
  useEffect(() => {
    if (!running && phaseRef.current) phaseRef.current.textContent = '';
  }, [running]);

  // The stylus runs from the reader's control; under reduced motion it stays at the end of the run.
  const toggleRun = () => {
    if (running) {
      setRunning(false);
      return;
    }
    if (asksForStillness()) return;
    // The first vane rises turned a little off its reading, so the reader sees it find the field.
    runRef.current = { hop: 0, phase: 'read', angle: { x: readings[0]!.angle + 0.9, v: 0 }, along: { x: 0, v: 0 }, press: { x: 0, v: 0 }, held: 0 };
    setRunning(true);
  };

  function chooseSteps(next: number) {
    setRunning(false);
    setSteps(next);
  }

  function reset() {
    chooseSteps(defaultSteps);
    setShowField(false);
  }

  const restLever = leverAt(0);
  const restGuides = guidesAt(shownPoint.y * U);

  const slotOf = (name: string): ReactNode => {
    if (name === 'pockets') {
      // The two good moves: turned pockets in the plate, both in the plain structure ink.
      return (
        <g key="pockets" data-part="fm-pockets">
          {POCKETS.map((pocket, mode) => (
            <g key={mode} data-flow-mode={mode}>
              <path className="iso-shade" data-shade="1" d={pocket.wall} />
              <Line d={pocket.rim} tone="mid" />
              <Line d={pocket.floor} tone="faint" />
            </g>
          ))}
        </g>
      );
    }
    if (name === 'engraved') {
      return (
        <g key="engraved" data-part="fm-engraved">
          {paths.map((points, i) => {
            if (i === FOCUS / DRAW_EVERY) return null;
            return (
              <g key={i} data-flow-sample={i * DRAW_EVERY}>
                <Line d={engravedLine(points)} tone="lo" />
                <Line d={startRing(drawn[i]!.noise)} tone="lo" />
                <Dots points={[onPlate(points[points.length - 1]!)]} size={0.8} tone="mid" />
              </g>
            );
          })}
        </g>
      );
    }
    if (name === 'ghost') {
      // The followed sample's one big jump, engraved beside the ink, with a miss mark where it lands.
      return steps === 1 ? null : (
        <g key="ghost" data-flow-ghost="">
          <Line d={plateLine([FOCUS_SAMPLE.noise, JUMP_END])} tone="mid" />
          <Line d={missMark(JUMP_END)} tone="red" />
        </g>
      );
    }
    if (name === 'ink') {
      return (
        <g key="ink" data-flow-focus="" data-hops={hopCount} data-testid="fm-ink">
          <path ref={inkRef} className="iso-line" data-tone="lit" style={INK_STYLE} d={inkPath(hops, shownHops)} />
          <g ref={marksRef} className="iso-dots" data-tone="hi" style={HOP_MARKS}>
            {hops.map((point, hop) => {
              const [cx, cy] = onPlate(point);
              return (
                <circle
                  key={hop}
                  data-hop={hop}
                  cx={Math.round(cx * 10) / 10}
                  cy={Math.round(cy * 10) / 10}
                  r={hop === 0 || hop === hopCount ? 1.1 : 0.85}
                  display={hop <= shownHops ? undefined : 'none'}
                />
              );
            })}
          </g>
        </g>
      );
    }
    if (name === 'outcome') {
      // A green ring where the stylus lands in its pocket, a red miss mark where it lands outside.
      return (
        <g key="outcome" ref={outcomeRef} data-flow-outcome={landed ? 'in-pocket' : 'missed'} display={running ? 'none' : undefined}>
          {landed ? <Line d={landedMark(landing)} tone="green" /> : <Line d={missMark(landing)} tone="red" />}
        </g>
      );
    }
    if (name === 'readings') {
      // The vanes the stylus read, one beside the start of every hop, each turned to the field it found there.
      return (
        <g key="readings" data-part="fm-readings">
          {readings.map((reading, hop) => (
            <g
              key={hop}
              ref={(el) => void (readingRefs.current[hop] = el)}
              data-flow-reading={hop}
              data-angle={reading.angle.toFixed(4)}
              display={running ? 'none' : undefined}
            >
              <Solid paths={reading.post} tone="mid" />
              <LiveSolid ref={(el) => void (bladeRefs.current[hop] = el)} paths={bladeAt(reading, reading.angle)} tone="hi" />
              <Dots points={[reading.pivot]} size={0.45} tone="mid" />
            </g>
          ))}
        </g>
      );
    }
    if (name === 'needles') {
      return showField ? (
        <g key="needles" data-part="fm-field">
          {NEEDLES.map((needle, i) => (
            <g key={i} data-flow-field="">
              <Solid paths={needle.pin} tone="lo" />
              <Solid paths={needle.needle} tone="mid" />
              <Dots points={[needle.pivot]} size={0.4} tone="mid" />
            </g>
          ))}
        </g>
      ) : null;
    }
    if (name === 'gantry') {
      return (
        <g key="gantry" ref={bridgeRef} transform={bridgeAt(shownPoint)} data-testid="fm-gantry">
          {partsOf(FAR_TRUCK_PARTS, slotOf)}
          {restGuides.far.map((paths, index) => (
            <LiveSolid key={`far-${index}`} ref={(el) => void (farGuideRefs.current[index] = el)} paths={paths} tone="mid" />
          ))}
          <g ref={carriageRef} transform={carriageAt(shownPoint)} data-testid="fm-stylus">
            {partsOf(CARRIAGE_PARTS, slotOf)}
          </g>
          {restGuides.near.map((paths, index) => (
            <LiveSolid key={`near-${index}`} ref={(el) => void (nearGuideRefs.current[index] = el)} paths={paths} tone="mid" />
          ))}
          {partsOf(NEAR_TRUCK_PARTS, slotOf)}
        </g>
      );
    }
    if (name === 'beads') {
      return (
        <g key="beads" data-part="fm-counter" data-spent={shownHops}>
          {Array.from({ length: RODS }, (_, rod) => (
            <g key={rod}>
              <Solid paths={ROD_PATHS[rod]!} tone="mid" crease="none" />
              {BEADS.slice(rod * PER_ROD, (rod + 1) * PER_ROD).map((bead) => (
                <g
                  key={bead.index}
                  ref={(el) => void (beadRefs.current[bead.index] = el)}
                  data-bead={bead.index}
                  data-spent={bead.index < shownHops ? '' : undefined}
                  transform={bead.index < shownHops ? beadAt(1) : undefined}
                >
                  <Solid paths={bead.paths} tone="hi" crease="none" />
                </g>
              ))}
            </g>
          ))}
        </g>
      );
    }
    if (name === 'lever') {
      return (
        <g key="lever">
          <LiveSolid ref={leverBarRef} paths={restLever.bar} tone="mid" />
          <LiveSolid ref={leverBallRef} paths={restLever.ball} tone="hi" />
        </g>
      );
    }
    if (name === 'pointer') return <Line key="pointer" d={knobPointer(steps)} tone="hi" free="end" />;
    return null;
  };

  return (
    <InstrumentFigure
      figureId="flow-matching-trajectory"
      className={className}
      kicker="Flow matching: refining steps"
      heading="Five small steps land where one big jump misses"
      controls={
        <>
          <PresetGroup<StepPreset>
            label="Refining steps per move"
            presets={STEP_PRESETS.map(({ id, label }) => ({ id, label }))}
            value={preset}
            onChange={(id) => chooseSteps(STEP_PRESETS.find((p) => p.id === id)?.steps ?? defaultSteps)}
            testId="fm-preset"
          />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            onClick={toggleRun}
            data-testid="fm-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop the stylus' : 'Run the stylus'}
          </button>
        </>
      }
      adjust={
        <>
          <ControlField>
            <ControlLabel htmlFor={sliderId} value={stepWords(steps)}>
              Refining steps, any number
            </ControlLabel>
            <input
              id={sliderId}
              type="range"
              data-brand-control-id="control:input"
              min={MIN_STEPS}
              max={MAX_STEPS}
              step={1}
              value={steps}
              onChange={(e) => chooseSteps(Number(e.target.value))}
              aria-label={`Refining steps, any number: integration steps, currently ${steps} of ${MAX_STEPS}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="one jump" high={`${MAX_STEPS} steps`} />
          </ControlField>
          <button
            type="button"
            data-brand-control-id="control:selection"
            aria-pressed={steps === MAX_STEPS}
            onClick={() => chooseSteps(MAX_STEPS)}
            className={INSTRUMENT_TOGGLE_CLASS}
          >
            {MAX_STEPS} steps
          </button>
          <button
            type="button"
            data-brand-control-id="control:selection"
            aria-pressed={showField}
            onClick={() => setShowField((on) => !on)}
            className={INSTRUMENT_TOGGLE_CLASS}
          >
            Show the learned field
          </button>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint={
            running ? (
              'Each hop reads the field, then goes straight'
            ) : (
              <>
                <span data-figure-annotation="">{landingNote(steps).join(' ')}</span>. Run the stylus.
              </>
            )
          }
          readout={
            <>
              <span ref={phaseRef} data-fm-phase="" />
              <span data-testid="fm-step-readout">{stepWords(steps)}</span> · on average lands{' '}
              <span data-testid="fm-dispersion-readout">{dispersion.toFixed(2)}</span> from a good move
              {steps === 1 ? null : <> · one big jump misses by {oneJump.toFixed(2)}</>}
            </>
          }
          status="Illustrative model, not measured."
        >
          <div ref={stageRef}>
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              fit={PHONE_FIT}
              label={`2D action-space view where ${drawn.length} of ${field.samples.length} noise samples reach two good moves at mean endpoint error ${dispersion.toFixed(2)} after ${stepWords(steps)}`}
              describedBy={descriptionId}
            >
              <g key={running ? 'running' : 'rest'}>
                <g key="bench">{partsOf(BENCH_PARTS, slotOf)}</g>
                <g key="front">{partsOf(FRONT_PARTS, slotOf)}</g>
              </g>
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="Getting a precise move takes several small refining steps, each costing time; π0 used ten, π0.6 and π0.7 use five."
      method={
        <>
          <p>
            Flow matching turns a random guess into a move by following a learned field for a set
            number of Euler integration steps. Each step samples the field once and goes straight,
            so with one or two steps the path cuts the corner and lands short of the good move;
            with five to ten it lands on it. On the field table a vane beside the stylus turns to
            the field before every hop and the hop runs straight along it; the groove is the path
            the field itself would trace, and each pocket is two spreads of the good moves wide.
            The vanes in &ldquo;Adjust more&rdquo; show the learned field at τ = {FIELD_TAU},
            halfway through the trip. Every
            step costs one forward pass through the action expert, one bead on the counter, which
            is why more steps are not free at a 50 Hz control rate.
          </p>
          <p>
            Illustrative model, not a reimplementation: {field.samples.length} seeded noise samples
            in 2 of the chunk&apos;s dimensions (action dimension 1 and action dimension 2) are carried
            to two action modes along slightly bent, near-straight paths. The stage draws {drawn.length}{' '}
            of them. The mean endpoint error is{' '}
            <span data-testid="fm-step-method">k = {steps} Euler {steps === 1 ? 'step' : 'steps'}</span>
            : {dispersion.toFixed(2)}, {regimeFor(steps)}; one step gives {oneJump.toFixed(2)}, ten
            give {endpointDispersion(field, PI0_STEPS).toFixed(2)} and {MAX_STEPS} give{' '}
            {endpointDispersion(field, MAX_STEPS).toFixed(2)}. π0 ran {PI0_STEPS} integration
            steps; π0.6 and π0.7 run {PI06_STEPS}.
          </p>
          <ChartDescription
            id={descriptionId}
            form="state"
            summary="Current flow-matching transport"
            description={`With ${steps} Euler steps the ${field.samples.length} samples travel near-straight from Gaussian noise toward the two action modes and finish at mean endpoint error ${dispersion.toFixed(2)}; one step would cut the corner, 50 steps is more compute than a 50 Hz loop can spend.`}
            states={[
              { label: 'Euler steps', value: String(steps) },
              { label: 'samples', value: String(field.samples.length) },
              { label: 'endpoint error', value: dispersion.toFixed(2) },
              { label: 'regime', value: regimeFor(steps) },
            ]}
          />
        </>
      }
      source="Illustrative model; step counts from the π0, π0.6 and π0.7 papers."
    />
  );
}
