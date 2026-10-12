'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { INSTRUMENT_SECONDARY_CONTROL_CLASS, InstrumentFigure, PresetGroup, type Preset } from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid, Wire } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { LiveSolid, writeSolid } from '@/components/iso/live-solid';
import {
  CART_CLIP,
  HEIGHT,
  WINDOW_CLIP,
  PARTS,
  SWEEP,
  WIDTH,
  cartridgeAt,
  crankAt,
  motorSideOf,
  pensAt,
  springAt,
  tracesTo,
  type Group,
  type LiveId,
  type Part,
  type Station,
} from '@/components/iso/figures/actuator-twin-bench';

/**
 * ActuatorGap: why ANYmal's simulator had to learn how its real motors
 * respond, drawn as a twin actuator bench.
 *
 * Two joint drives stand side by side, each a motor and gearbox turning a
 * crank over a protractor. The real series-elastic drive has a torsion
 * spring between its gearbox and its crank; the simulator's twin has a
 * rigid coupling there, and its crank is the one lit part. A chart
 * recorder at the back draws the command and both cranks over time. Sent
 * the same command, the real crank follows late and springs past the
 * target stop, while an ideal simulated motor is there at once. Hwangbo and
 * colleagues found that policies trained with ideal or analytical actuator
 * models could not take a single step on the real robot without falling;
 * an actuator network trained on data from the real legs stood in for the
 * motors in simulation, and the policies transferred. On the bench that
 * network is the cartridge in the twin's model bay: seated, the twin
 * follows the real swing.
 *
 * The one choice is the simulator's motor model. The bench stands still at
 * the moment the real crank swings furthest past the target; "Run the
 * bench" sends the command again and again, slowed for the eye. Reduced
 * motion keeps the still pose. The response curves are illustrative; the
 * outcome is the paper's.
 */

type ModelId = 'ideal' | 'learned';
const MODELS: readonly Preset<ModelId>[] = [
  { id: 'ideal', label: 'Ideal, instant' },
  { id: 'learned', label: 'Learned from real legs' },
];
export const DEFAULT_MODEL: ModelId = 'ideal';
/** The twin's share of the learned model: 0 ideal, 1 learned. */
const shareOf = (model: ModelId) => (model === 'learned' ? 1 : 0);

/** Time runs from 0 to 1 across the drawing; the command comes at 0.1. */
const COMMAND_AT = 0.1;
/** The illustrative real motor: a short delay, then a springy second-order rise. */
const DELAY = 0.04;
const OMEGA = 30;
const ZETA = 0.45;
export function realMotor(t: number): number {
  const u = t - COMMAND_AT - DELAY;
  if (u <= 0) return 0;
  const wd = OMEGA * Math.sqrt(1 - ZETA * ZETA);
  return 1 - Math.exp(-ZETA * OMEGA * u) * (Math.cos(wd * u) + (ZETA / Math.sqrt(1 - ZETA * ZETA)) * Math.sin(wd * u));
}
export const command = (t: number) => (t >= COMMAND_AT ? 1 : 0);
/** The learned model: the real response as the network predicts it, a hair late. */
const learnedMotor = (t: number) => realMotor(t - 0.006);
/** The simulated motor between the ideal (0) and learned (1) models. */
export const simulatedMotor = (t: number, learned: number) => command(t) + (learnedMotor(t) - command(t)) * learned;

const SAMPLES = Array.from({ length: 201 }, (_, k) => k / 200);
/** Mean gap between the simulated and real responses, as a percentage of the move. */
export function meanGapPercent(learned: number): number {
  const gap = SAMPLES.reduce((sum, t) => sum + Math.abs(simulatedMotor(t, learned) - realMotor(t)), 0) / SAMPLES.length;
  return Math.round(gap * 100);
}

export const OUTCOME: Record<ModelId, string> = {
  ideal: 'falls at its first step',
  learned: 'walks',
};

/** The still pose: the moment the real crank swings furthest past the target. */
export const STILL_AT = 0.25;
/** A run of the bench: the recorder sweeps its paper, then holds this long before the next command. */
const HOLD = 0.22;
/** Page seconds per unit of the model's time, so the eye can follow the swing. */
const SLOW = 4.2;

const percent = (share: number) => Math.round(share * 100);
const modelName = (model: ModelId) => (model === 'ideal' ? 'Ideal motor' : 'Learned motor');

/** The resting readout: the model, its average gap to the real motor and the reported outcome. */
export const stillReadout = (model: ModelId) => `${modelName(model)} · ${meanGapPercent(shareOf(model))}% average gap · ${OUTCOME[model]}`;
/** The running readout, from the same instant as the drawing: how far each crank has gone. */
export const runReadout = (real: number, twin: number) => `simulated ${percent(twin)}% · real ${percent(real)}% of the move`;

/** Both cranks and the command at model time `t`, with the twin's model share `learned`. */
export function benchAt(t: number, learned: number) {
  return { command: command(t), real: realMotor(t), twin: simulatedMotor(t, learned) };
}

function describe(model: ModelId): string {
  const [mine, other] = model === 'ideal' ? [0, 1] : [1, 0];
  return `With the ${model === 'ideal' ? 'ideal, instant' : 'learned'} motor model, the simulated motor differs from the real one by ${meanGapPercent(mine)}% of the move on average in this illustrative response, against ${meanGapPercent(other)}% with the ${model === 'ideal' ? 'learned' : 'ideal'} model; Hwangbo and colleagues report that a policy trained ${model === 'ideal' ? 'with an ideal motor model fails to take a single step on the real ANYmal without falling' : 'with the actuator network learned from data on the real legs walks on the real ANYmal'}.`;
}

/**
 * The still moment with the default model settled, drawn by the server and the first client render. Its
 * paths are module constants, so a later render never rewrites them under the live loop.
 */
const REST = benchAt(STILL_AT, shareOf(DEFAULT_MODEL));
const restSpring = springAt(REST.real, motorSideOf(REST.real, REST.command));
const restCranks = { real: crankAt('real', REST.real), twin: crankAt('twin', REST.twin) };
const restTraces = tracesTo(STILL_AT, command, realMotor, (u) => simulatedMotor(u, shareOf(DEFAULT_MODEL)));
const restPens = pensAt(STILL_AT, REST);
const REST_CARTRIDGE = cartridgeAt(1 - shareOf(DEFAULT_MODEL));

function PartView({ part }: { part: Part }) {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        crease={part.crease}
        inner={part.inner ? <Line d={part.inner} tone={part.innerTone ?? 'faint'} /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.kind === 'wire') return <Wire from={part.from} to={part.to} via={part.via} tone={part.tone} />;
  if (part.kind === 'fill') {
    if (part.shade === 'paper') return <path className="iso-fill" d={part.d} />;
    if (part.shade === 'top') return <path className="iso-top" d={part.d} />;
    return <path className="iso-shade" data-shade={part.shade} d={part.d} />;
  }
  return null;
}

/** Consecutive parts of one group, so the recorder's window and the moving cartridge are each one clipped <g>. */
const RUNS: Array<{ group: Group; parts: Part[] }> = [];
for (const part of PARTS) {
  const last = RUNS[RUNS.length - 1];
  if (last && last.group === part.group) last.parts.push(part);
  else RUNS.push({ group: part.group, parts: [part] });
}

/** The spring wire: a broad stroke with a pale core, so it reads as round wire. */
const WIRE_STYLE = { strokeWidth: 2.2 } as const;
const CORE_STYLE = { strokeWidth: 0.9, stroke: 'var(--anatomy-paper)' } as const;

type Refs = {
  crank: Record<Station, { pin: SVGGElement | null; arm: SVGGElement | null; rule: SVGPathElement | null; screws: SVGGElement | null }>;
  spring: { back: SVGPathElement | null; backCore: SVGPathElement | null; front: SVGPathElement | null; frontCore: SVGPathElement | null };
  traces: { command: SVGPathElement | null; real: SVGPathElement | null; twin: SVGPathElement | null };
  pens: { bar: SVGGElement | null; command: SVGGElement | null; real: SVGGElement | null; twin: SVGGElement | null };
  cartridge: SVGGElement | null;
};

/** Draw the whole live state of the bench at model time `t`. */
function drawBench(refs: Refs, t: number, learned: number, cartridge: number) {
  const now = benchAt(t, learned);
  const spring = springAt(now.real, motorSideOf(now.real, now.command));
  refs.spring.back?.setAttribute('d', spring.back);
  refs.spring.backCore?.setAttribute('d', spring.back);
  refs.spring.front?.setAttribute('d', spring.front);
  refs.spring.frontCore?.setAttribute('d', spring.front);
  for (const station of ['real', 'twin'] as const) {
    const crank = crankAt(station, now[station]);
    const own = refs.crank[station];
    writeSolid(own.pin, crank.pin);
    writeSolid(own.arm, crank.arm);
    own.rule?.setAttribute('d', crank.rule);
    own.screws?.querySelectorAll('circle').forEach((dot, index) => {
      const point = crank.screws[index];
      if (!point) return;
      dot.setAttribute('cx', String(Math.round(point[0] * 10) / 10));
      dot.setAttribute('cy', String(Math.round(point[1] * 10) / 10));
    });
  }
  const traces = tracesTo(t, command, realMotor, (u) => simulatedMotor(u, learned));
  refs.traces.command?.setAttribute('d', traces.command);
  refs.traces.real?.setAttribute('d', traces.real);
  refs.traces.twin?.setAttribute('d', traces.twin);
  const pens = pensAt(t, now);
  writeSolid(refs.pens.bar, pens.bar);
  writeSolid(refs.pens.command, pens.command);
  writeSolid(refs.pens.real, pens.real);
  writeSolid(refs.pens.twin, pens.twin);
  refs.cartridge?.setAttribute('transform', cartridgeAt(1 - cartridge));
  return now;
}

export function ActuatorGap({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const clipId = `${uid.replace(/[^a-zA-Z0-9_-]/g, '')}-cartridge`;
  const windowId = `${uid.replace(/[^a-zA-Z0-9_-]/g, '')}-window`;
  const citationFor = useCitationLookup();
  const source = citationFor('hwangbo-2019');
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const [running, setRunning] = useState(false);
  const learnedTarget = shareOf(model);

  const refs = useRef<Refs>({
    crank: { real: { pin: null, arm: null, rule: null, screws: null }, twin: { pin: null, arm: null, rule: null, screws: null } },
    spring: { back: null, backCore: null, front: null, frontCore: null },
    traces: { command: null, real: null, twin: null },
    pens: { bar: null, command: null, real: null, twin: null },
    cartridge: null,
  });
  const stageRef = useRef<HTMLDivElement>(null);
  const shown = useRef({ learned: learnedTarget, cartridge: learnedTarget, t: STILL_AT });

  // One loop: the twin's model and its cartridge ease to the chosen model, and while the bench runs the
  // command repeats. Resting, the bench returns to the still moment and the readout says the model's result.
  useEffect(() => {
    const calm = asksForStillness();
    const readout = stageRef.current?.closest('[data-anatomy-stage]')?.querySelector<HTMLElement>('[data-readout]');
    // The loop restarts whenever the chosen model or the run state changes, so its goal is fixed for this run.
    const goal = { learned: learnedTarget, running };
    let frame = 0;
    let last = performance.now();
    let clock = 0;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      const s = shown.current;
      const ease = (value: number, to: number, seconds: number) => (calm ? to : value + (to - value) * (1 - Math.exp(-dt / seconds)));
      s.learned = Math.abs(goal.learned - s.learned) < 0.002 ? goal.learned : ease(s.learned, goal.learned, 0.22);
      s.cartridge = Math.abs(goal.learned - s.cartridge) < 0.002 ? goal.learned : ease(s.cartridge, goal.learned, 0.28);
      const live = goal.running && !calm;
      if (live) {
        clock = (clock + dt / SLOW) % (SWEEP + HOLD);
        s.t = Math.min(clock, SWEEP);
      } else {
        s.t = STILL_AT;
      }
      const state = drawBench(refs.current, s.t, s.learned, s.cartridge);
      if (live && readout) readout.textContent = runReadout(state.real, state.twin);
      const settled = s.learned === goal.learned && s.cartridge === goal.learned;
      frame = live || !settled ? requestAnimationFrame(tick) : 0;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [learnedTarget, running]);

  // At rest the readout is the chosen model's result.
  useEffect(() => {
    if (running) return;
    const readout = stageRef.current?.closest('[data-anatomy-stage]')?.querySelector<HTMLElement>('[data-readout]');
    if (readout) readout.textContent = stillReadout(model);
  }, [running, model]);

  const r = refs.current;

  const crankView = (station: Station) => {
    const crank = restCranks[station];
    const lit = station === 'twin';
    return (
      <g key={`${station}-crank`} data-testid={lit ? 'actuator-simulated' : 'actuator-real'} data-model={lit ? model : undefined}>
        <LiveSolid ref={(el) => void (r.crank[station].pin = el)} paths={crank.pin} lit={lit} />
        <LiveSolid ref={(el) => void (r.crank[station].arm = el)} paths={crank.arm} lit={lit} />
        <path ref={(el) => void (r.crank[station].rule = el)} className="iso-line" data-tone="faint" d={crank.rule} />
        <g ref={(el) => void (r.crank[station].screws = el)} className="iso-dots" data-tone="mid">
          {crank.screws.map(([x, y], index) => (
            <circle key={index} cx={Math.round(x * 10) / 10} cy={Math.round(y * 10) / 10} r={0.5} />
          ))}
        </g>
      </g>
    );
  };

  const liveView = (id: LiveId) => {
    if (id === 'real-spring-back') {
      return (
        <g key={id}>
          <path ref={(el) => void (r.spring.back = el)} className="iso-line" data-tone="mid" style={WIRE_STYLE} d={restSpring.back} />
          <path ref={(el) => void (r.spring.backCore = el)} className="iso-line" style={{ ...CORE_STYLE, stroke: 'var(--anatomy-shade-1)' }} d={restSpring.back} />
        </g>
      );
    }
    if (id === 'real-spring-front') {
      return (
        <g key={id} data-testid="actuator-spring">
          <path ref={(el) => void (r.spring.front = el)} className="iso-line" data-tone="hi" style={WIRE_STYLE} d={restSpring.front} />
          <path ref={(el) => void (r.spring.frontCore = el)} className="iso-line" style={{ ...CORE_STYLE, stroke: 'var(--anatomy-top)' }} d={restSpring.front} />
        </g>
      );
    }
    if (id === 'real-crank') return crankView('real');
    if (id === 'twin-crank') return crankView('twin');
    if (id === 'traces') {
      return (
        <g key={id} data-testid="actuator-traces">
          <path ref={(el) => void (r.traces.command = el)} className="iso-line" data-tone="lo" data-free="" d={restTraces.command} />
          <path ref={(el) => void (r.traces.real = el)} className="iso-line" data-tone="hi" data-free="" d={restTraces.real} />
          <path ref={(el) => void (r.traces.twin = el)} className="iso-line" data-tone="lit" data-free="" d={restTraces.twin} />
        </g>
      );
    }
    return (
      <g key={id}>
        <LiveSolid ref={(el) => void (r.pens.bar = el)} paths={restPens.bar} tone="mid" />
        <LiveSolid ref={(el) => void (r.pens.command = el)} paths={restPens.command} tone="mid" />
        <LiveSolid ref={(el) => void (r.pens.real = el)} paths={restPens.real} />
        <LiveSolid ref={(el) => void (r.pens.twin = el)} paths={restPens.twin} lit />
      </g>
    );
  };

  return (
    <InstrumentFigure
      figureId="actuator-gap"
      className={className}
      kicker="Actuator network"
      heading="Simulated motors must respond like the real ones"
      controls={
        <>
          <PresetGroup label="The simulator's motor model" presets={MODELS} value={model} onChange={setModel} testId="actuator-model" />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            onClick={() => setRunning((on) => !on)}
            data-testid="actuator-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop the bench' : 'Run the bench'}
          </button>
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint={running ? 'Running, slowed for the eye' : 'Lit crank: the simulated motor'}
          readout={stillReadout(model)}
          status="Illustrative response; outcome cited"
          data-testid="actuator-stage"
          data-outcome={model === 'ideal' ? 'falls' : 'walks'}
        >
          <div ref={stageRef}>
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              label={`A joint is told to move on a test bench: two drives get the same command. The real drive's crank, turned through a spring, arrives late and swings past the target stop; the simulated twin ${model === 'ideal' ? 'arrives at once' : 'follows the real curve'}, and a chart recorder draws both. A walking policy trained this way ${OUTCOME[model]} on the real robot.`}
              describedBy={descriptionId}
            >
              <defs>
                <clipPath id={clipId}>
                  <path d={CART_CLIP} />
                </clipPath>
                <clipPath id={windowId}>
                  <path d={WINDOW_CLIP} />
                </clipPath>
              </defs>
              {RUNS.map((run, index) => {
                const body = run.parts.map((part, k) => (part.kind === 'live' ? liveView(part.id) : <PartView key={k} part={part} />));
                if (run.group === 'static') return <g key={index}>{body}</g>;
                if (run.group === 'window') return <g key={index} clipPath={`url(#${windowId})`}>{body}</g>;
                return (
                  <g key={index} clipPath={`url(#${clipId})`}>
                    <g ref={(el) => void (r.cartridge = el)} transform={REST_CARTRIDGE} data-testid="actuator-cartridge" data-seated={model === 'learned' ? '' : undefined}>
                      {body}
                    </g>
                  </g>
                );
              })}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="A policy trained with ideal simulated motors fell at ANYmal's first step; a learned motor model let it walk."
      method={
        <>
          <div>
            ANYmal&apos;s joints are series-elastic: a spring sits between the motor and the leg, so a commanded move
            arrives late and overshoots. Hwangbo and colleagues trained an actuator network that predicts each
            joint&apos;s torque from its recent position errors and velocities, using data from exciting the real
            legs and pushing the robot by hand, and used it in place of the motors in simulation. Policies trained
            with ideal or analytical actuator models failed to take a single step without falling.
          </div>
          <div>
            The bench is illustrative. The left drive turns its crank through a spring, like the real joint; the
            right one is the simulator&apos;s twin, with a rigid coupling and the learned model as a cartridge in its
            bay. The response curves on the recorder show the shape of a springy motor, not ANYmal&apos;s measured
            response; running, the bench is slowed for the eye. The outcome under each model is the paper&apos;s.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="How far the simulated motor is from the real one"
            description={describe(model)}
            rowHeader="motor model in simulation"
            columns={[{ header: 'average gap to the real motor (% of the move)', numeric: true }, { header: 'on the real robot' }]}
            rows={MODELS.map((m) => ({
              label: m.label,
              values: [String(meanGapPercent(m.id === 'ideal' ? 0 : 1)), OUTCOME[m.id]],
            }))}
          />
        </>
      }
      source={
        <span data-testid="actuator-source">
          {source ? (
            <a data-brand-control-id="control:link-focus" href={source.url} target="_blank" rel="noopener" className="underline-offset-2">
              {source.label}
            </a>
          ) : (
            'Hwangbo and colleagues'
          )}
          .
        </span>
      }
    />
  );
}
