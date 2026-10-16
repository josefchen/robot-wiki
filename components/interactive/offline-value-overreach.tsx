'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { INSTRUMENT_SLIDER_CLASS, InstrumentFigure, SliderRow } from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { LiveSolid, writeSolid } from '@/components/iso/live-solid';
import {
  HEIGHT,
  PARTS,
  PHONE_FIT,
  WIDTH,
  armOf,
  engraved,
  pinsAt,
  plumbOf,
  riderAt,
  screwOf,
  splineOf,
  triedInlay,
  type Group,
  type LiveId,
  type Part,
} from '@/components/iso/figures/spline-bench';

/**
 * OfflineValueOverreach: why offline reinforcement learning needs caution
 * about actions its data never tried, drawn as a draughtsman's spline
 * board.
 *
 * Across the board runs grip strength, from gentle to hard; up it, how well
 * a grip works. The real result is engraved on the chart paper. The
 * learner's guess is a flexible spline held between pins at the recorded
 * tries, so inside the range the data covers it follows the real results;
 * past the last pin nothing holds it, and here it springs up, so a learner
 * that picks the best-looking grip picks one nobody tried, which really
 * works badly. A rider on the top rail always sits over the spline's
 * highest point, and its plumb bob, the one lit part, hangs down to what
 * that grip really earns.
 *
 * The one control is how strongly the learner marks down actions far from
 * the data, the idea behind Conservative Q-Learning: on the board, the
 * screws that press the spline's free ends down. Raising it pulls the guess
 * down outside the data, and the rider glides back to the best tried grip;
 * reduced motion jumps there. Every curve is illustrative: the shape of the
 * problem is Levine and colleagues', the penalty CQL's.
 */

export const CAUTION_MAX = 10;
export const DEFAULT_CAUTION = 0;

/** The grip strengths the recorded tries used, from gentle (0) to hard (1). */
export const TRIED = [0.18, 0.23, 0.28, 0.33, 0.38, 0.43, 0.48, 0.53, 0.57] as const;
const TRIED_LOW = TRIED[0];
const TRIED_HIGH = TRIED[TRIED.length - 1];

/** How well a squeeze really works: best near the middle, poor when too hard. */
export const realResult = (x: number) => 0.15 + 0.7 * Math.exp(-(((x - 0.45) / 0.22) ** 2));
/** How far a squeeze lies outside the tried range. */
const outside = (x: number) => Math.max(0, TRIED_LOW - x, x - TRIED_HIGH);
/** The learner's guess: right where the data is, drifting up where it is not. */
const rawGuess = (x: number) => realResult(x) + 2.4 * outside(x) ** 1.1;
/** The guess after marking down untried actions, caution from 0 to 1. */
export const guess = (x: number, caution: number) => rawGuess(x) - 1.2 * caution * outside(x);

const GRID = Array.from({ length: 101 }, (_, k) => k / 100);

/** The squeeze the learner picks: the best-looking one under its guess. */
export function chosen(caution: number): number {
  let best = GRID[0];
  for (const x of GRID) if (guess(x, caution) > guess(best, caution)) best = x;
  return best;
}

export const isTried = (x: number) => x >= TRIED_LOW && x <= TRIED_HIGH;

/** The least caution, on the slider's scale, at which the choice is a tried squeeze. */
export const RETURN_AT = Array.from({ length: CAUTION_MAX + 1 }, (_, c) => c).find((c) =>
  isTried(chosen(c / CAUTION_MAX)),
) ?? CAUTION_MAX;

/** The top of the board's value scale: the guess at its highest stays on the chart. */
export const Y_MAX = 1.15;
const percent = (v: number) => Math.round(v * 100);
/** A value on a 0 to 100 score, the top of the drawing being 100. */
export const score = (v: number) => Math.round((v / Y_MAX) * 100);

function describe(caution: number): string {
  const c = caution / CAUTION_MAX;
  const x = chosen(c);
  return `With caution at ${caution} of ${CAUTION_MAX}, the learner picks a squeeze ${percent(x)}% of the way from gentle to hard, ${isTried(x) ? 'inside' : 'outside'} the tried range of ${percent(TRIED_LOW)}% to ${percent(TRIED_HIGH)}%; it expects a score of ${score(guess(x, c))} out of 100 and really gets ${score(realResult(x))}.`;
}

const SAMPLE_CAUTIONS = [0, RETURN_AT - 1, RETURN_AT, CAUTION_MAX] as const;

/**
 * The board at a caution (0 to 1) and a rider position (a grip): the readout's words and numbers come
 * from this one instant, the same one the drawing shows.
 */
export function boardAt(caution: number, grip: number) {
  return { caution, grip, expected: score(guess(grip, caution)), real: score(realResult(grip)), tried: isTried(grip) };
}
export const readoutOf = (board: ReturnType<typeof boardAt>) =>
  `${board.tried ? 'tried' : 'untried'} grip · expects ${board.expected}, gets ${board.real}`;

/** The presser screws turn three times over the whole caution range. */
const TURNS = 3;

function armsAt(caution: number) {
  return ([-1, 1] as const).map((side) => {
    const pin = side > 0 ? TRIED_HIGH : TRIED_LOW;
    return armOf(side, pin, realResult(pin), guess(side > 0 ? 1 : 0, caution));
  });
}

// Drawn once from the model: the engraved result, the tried range and the pins at the recorded tries.
const CURVE = engraved(realResult);
const TRIED_RANGE = triedInlay(TRIED_LOW, TRIED_HIGH);
const PINS = pinsAt(TRIED, realResult);

/** The board at a caution (0 to 1), settled: what the server and the first client render draw. */
function restOf(caution: number) {
  const pick = chosen(caution);
  const arms = armsAt(caution);
  return {
    caution,
    pick,
    spline: splineOf((x) => guess(x, caution)),
    arms,
    screws: ([-1, 1] as const).map((side, index) => screwOf(side, arms[index]!.screwFoot, caution * TURNS)),
    plumb: plumbOf(pick, realResult(pick)),
    rider: riderAt(pick),
    readout: readoutOf(boardAt(caution, pick)),
  };
}

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
  if (part.kind === 'fill') return part.shade === 'top' ? <path className="iso-top" d={part.d} /> : <path className="iso-shade" data-shade={part.shade} d={part.d} />;
  return null;
}

/** Consecutive parts of one group, so the rider is one translated <g>. */
const RUNS: Array<{ group: Group; parts: Part[] }> = [];
for (const part of PARTS) {
  const last = RUNS[RUNS.length - 1];
  if (last && last.group === part.group) last.parts.push(part);
  else RUNS.push({ group: part.group, parts: [part] });
}

/** The plumb line: a little heavier than the drawing's lines, in the accent. */
const PLUMB_STYLE = { strokeWidth: 1 } as const;

type Refs = {
  spline: SVGGElement | null;
  arms: (SVGGElement | null)[];
  shanks: (SVGGElement | null)[];
  pointers: (SVGPathElement | null)[];
  rider: SVGGElement | null;
  plumb: { line: SVGPathElement | null; knot: SVGGElement | null; body: SVGGElement | null; neck: SVGGElement | null; point: SVGGElement | null };
};

/** Draw the moving parts at a caution (0 to 1) and with the rider over `grip`. */
function drawBoard(refs: Refs, caution: number, grip: number) {
  writeSolid(refs.spline, splineOf((x) => guess(x, caution)));
  const arms = armsAt(caution);
  arms.forEach((arm, index) => writeSolid(refs.arms[index] ?? null, arm.bar));
  ([-1, 1] as const).forEach((side, index) => {
    const screw = screwOf(side, arms[index]!.screwFoot, caution * TURNS);
    writeSolid(refs.shanks[index] ?? null, screw.shank);
    refs.pointers[index]?.setAttribute('d', screw.pointer);
  });
  refs.rider?.setAttribute('transform', riderAt(grip));
  const plumb = plumbOf(grip, realResult(grip));
  refs.plumb.line?.setAttribute('d', plumb.line);
  writeSolid(refs.plumb.knot, plumb.knot);
  writeSolid(refs.plumb.body, plumb.body);
  writeSolid(refs.plumb.neck, plumb.neck);
  writeSolid(refs.plumb.point, plumb.point);
}

export function OfflineValueOverreach({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const sliderId = `${uid}-caution`;
  const citationFor = useCitationLookup();
  const tutorial = citationFor('offline-rl-tutorial-2020');
  const cql = citationFor('cql-2020');
  const [caution, setCaution] = useState(DEFAULT_CAUTION);
  // The opening pose, fixed for the life of the figure: the live loop moves the parts from here.
  const [rest] = useState(() => restOf(caution / CAUTION_MAX));
  const target = caution / CAUTION_MAX;
  const pick = chosen(target);
  const tried = isTried(pick);
  const valueText = caution === 0 ? 'none' : caution === CAUTION_MAX ? 'strong' : `${caution} of ${CAUTION_MAX}`;

  const refs = useRef<Refs>({
    spline: null,
    arms: [],
    shanks: [],
    pointers: [],
    rider: null,
    plumb: { line: null, knot: null, body: null, neck: null, point: null },
  });
  const stageRef = useRef<HTMLDivElement>(null);
  const shown = useRef({ caution: rest.caution, grip: rest.pick });
  const readoutEl = useCallback(() => stageRef.current?.closest('[data-anatomy-stage]')?.querySelector<HTMLElement>('[data-readout]') ?? null, []);

  // One loop: the screws turn to the caution and the spline follows; the rider glides over the new highest
  // point. The readout reads both from the frame being drawn. Reduced motion jumps to the new setting.
  useEffect(() => {
    const calm = asksForStillness();
    const goal = { caution: target, grip: chosen(target) };
    const readout = readoutEl();
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      const s = shown.current;
      const ease = (value: number, to: number, seconds: number) =>
        calm || Math.abs(to - value) < 0.0015 ? to : value + (to - value) * (1 - Math.exp(-dt / seconds));
      s.caution = ease(s.caution, goal.caution, 0.24);
      s.grip = ease(s.grip, goal.grip, 0.32);
      drawBoard(refs.current, s.caution, s.grip);
      if (readout) readout.textContent = readoutOf(boardAt(s.caution, s.grip));
      frame = s.caution === goal.caution && s.grip === goal.grip ? 0 : requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, readoutEl]);

  const r = refs.current;
  const liveView = (id: LiveId) => {
    if (id === 'curve') {
      return (
        <g key={id} data-part="engraved-result">
          <Solid paths={TRIED_RANGE} tone="lo" crease="none" />
          <Line d={CURVE} tone="mid" />
        </g>
      );
    }
    if (id === 'spline') {
      return (
        <g key={id} data-testid="overreach-guess" data-part="spline">
          <LiveSolid ref={(el) => void (r.spline = el)} paths={rest.spline} />
        </g>
      );
    }
    if (id === 'pins') {
      return (
        <g key={id} data-part="pins">
          {PINS.map((paths, index) => (
            <Solid key={index} paths={paths} tone="mid" />
          ))}
        </g>
      );
    }
    if (id === 'arms') {
      return (
        <g key={id} data-part="presser-arms">
          {rest.arms.map((arm, index) => (
            <g key={index}>
              <Solid paths={arm.boss} tone="mid" />
              <LiveSolid ref={(el) => void (r.arms[index] = el)} paths={arm.bar} tone="mid" />
              <Solid paths={arm.cap} tone="mid" />
            </g>
          ))}
        </g>
      );
    }
    if (id === 'shanks') {
      return (
        <g key={id} data-part="presser-screws">
          {rest.screws.map((screw, index) => (
            <LiveSolid key={index} ref={(el) => void (r.shanks[index] = el)} paths={screw.shank} tone="mid" />
          ))}
        </g>
      );
    }
    if (id === 'knobs') {
      return (
        <g key={id} data-part="caution-knobs">
          {rest.screws.map((screw, index) => (
            <g key={index}>
              <Solid paths={screw.collar} tone="mid" />
              <Solid paths={screw.knob} tone="mid" />
              <Line d={screw.ribs} tone="lo" />
              <path ref={(el) => void (r.pointers[index] = el)} className="iso-line" data-tone="hi" data-free="end" d={screw.pointer} />
            </g>
          ))}
        </g>
      );
    }
    return (
      <g key={id} data-testid="overreach-choice" data-tried={tried ? 'yes' : 'no'} data-part="plumb">
        <path ref={(el) => void (r.plumb.line = el)} className="iso-line" data-tone="lit" style={PLUMB_STYLE} d={rest.plumb.line} />
        <LiveSolid ref={(el) => void (r.plumb.knot = el)} paths={rest.plumb.knot} tone="mid" />
        <LiveSolid ref={(el) => void (r.plumb.body = el)} paths={rest.plumb.body} lit />
        <LiveSolid ref={(el) => void (r.plumb.neck = el)} paths={rest.plumb.neck} lit />
        <LiveSolid ref={(el) => void (r.plumb.point = el)} paths={rest.plumb.point} lit />
      </g>
    );
  };

  return (
    <InstrumentFigure
      figureId="offline-value-overreach"
      className={className}
      kicker="Distributional shift"
      heading="Recorded data alone overrates untried actions"
      controls={
        <SliderRow
          htmlFor={sliderId}
          label="Caution about untried actions"
          value={<span data-testid="overreach-caution">{valueText}</span>}
        >
          <input
            id={sliderId}
            type="range"
            data-brand-control-id="control:input"
            min={0}
            max={CAUTION_MAX}
            step={1}
            value={caution}
            onChange={(e) => setCaution(Number(e.target.value))}
            aria-label={`Caution about untried actions, from 0 to ${CAUTION_MAX}, currently ${caution}`}
            aria-valuetext={`${caution} of ${CAUTION_MAX}; the learner picks ${tried ? 'the best squeeze it tried' : 'a squeeze nobody tried, which really works badly'}`}
            className={INSTRUMENT_SLIDER_CLASS}
          />
        </SliderRow>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Lit bob: what the picked grip really earns"
          readout={rest.readout}
          status="Illustrative curves"
          data-testid="overreach-stage"
        >
          <div ref={stageRef}>
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              fit={PHONE_FIT}
              label={`A spline board: a learner's guess of how well each grip works, held by pins at the recorded tries, against the real results engraved behind it. ${tried ? 'With enough caution the free ends are pressed down and the rider sits over the best grip it tried.' : 'Past the last pin the guess springs up, and the rider sits over a hard grip nobody tried, which really works badly.'}`}
              describedBy={descriptionId}
            >
              {RUNS.map((run, index) => {
                const body = run.parts.map((part, k) => (part.kind === 'live' ? liveView(part.id) : <PartView key={k} part={part} />));
                if (run.group === 'static') return <g key={index}>{body}</g>;
                return (
                  <g key={index} ref={(el) => void (r.rider = el)} transform={rest.rider} data-part="rider">
                    {body}
                  </g>
                );
              })}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="Marking down untried actions keeps an offline learner's choice where its data can vouch for it."
      method={
        <>
          <div>
            The pins hold the learner&apos;s guess at the recorded tries of one grip at different strengths, where it
            matches how well each worked. Between the pins the guess follows the real results; beyond the last pin
            nothing checks it, and here it springs up. A learner that picks the best-looking strength then picks one
            nobody tried, and the real result there is poor. Levine and colleagues name this the central difficulty
            of offline reinforcement learning: the value function overrates actions the data never tested, and no
            live trial corrects it.
          </div>
          <div>
            Conservative Q-Learning marks down the value of actions outside the data while keeping the values of
            the tried ones: on the board, the screws that press the free ends down. The slider sets how strongly;
            here the choice returns to the tried range from {RETURN_AT} of {CAUTION_MAX}. Every curve is
            illustrative, drawn to show the shape of the problem, not taken from a trained robot.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Which squeeze the learner picks at each caution"
            description={describe(caution)}
            rowHeader="caution (of 10)"
            columns={[
              { header: 'squeeze picked (% of the way to hard)', numeric: true },
              { header: 'expected score (of 100)', numeric: true },
              { header: 'real score (of 100)', numeric: true },
            ]}
            rows={[...new Set([...SAMPLE_CAUTIONS, caution])]
              .sort((a, b) => a - b)
              .map((c) => {
                const x = chosen(c / CAUTION_MAX);
                return {
                  label: String(c),
                  values: [String(percent(x)), String(score(guess(x, c / CAUTION_MAX))), String(score(realResult(x)))],
                };
              })}
          />
        </>
      }
      source={
        <span data-testid="overreach-source">
          {tutorial ? (
            <a data-brand-control-id="control:link-focus" href={tutorial.url} target="_blank" rel="noopener" className="underline-offset-2">
              {tutorial.label}
            </a>
          ) : (
            'Levine and colleagues'
          )}
          ;{' '}
          {cql ? (
            <a data-brand-control-id="control:link-focus" href={cql.url} target="_blank" rel="noopener" className="underline-offset-2">
              {cql.label}
            </a>
          ) : (
            'Conservative Q-Learning'
          )}
          .
        </span>
      }
    />
  );
}
