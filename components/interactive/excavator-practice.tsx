'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { INSTRUMENT_SECONDARY_CONTROL_CLASS, InstrumentFigure, PresetGroup } from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import {
  ENGRAVED_D,
  HEIGHT,
  PARTS,
  WIDTH,
  armParts,
  boardMarks,
  needleAt,
  type Part,
} from '@/components/iso/figures/practice-excavator';
import {
  EARLIER_MINUTES,
  ENSEMBLE_MEMBERS,
  PRACTICE,
  runAt,
  STILL_PRACTICE,
  STILL_S,
  practiceOf,
  tracedAt,
  type Practice,
  type PracticeId,
} from '@/lib/excavator-practice';

/**
 * ExcavatorPractice: a robot that learns a model of its own body from its
 * own moves, for the model-based robot learning module, drawn as a walking
 * excavator tracing a path on a board (components/iso/figures/practice-excavator.ts).
 *
 * The stylus on the shovel inks where the shovel really went (lit); five
 * faint lines ahead of it are the five learned models' guesses of where it
 * goes next. The trainer's dial counts the minutes of practice against the
 * 100 to 150 minutes earlier learned controllers were given. Picking the
 * minutes changes how far the guesses fan out and how far the ink wanders;
 * "Trace the path" runs the arm along the whole path and back to the still
 * pose; "Stop the arm" puts it back there at once. Numbers and words come
 * from lib/excavator-practice.ts. Reduced motion jumps instead of moving: the
 * run steps along the path.
 */

/** The readout, in words: what the paper reports at this point, or how far a run's trace has got. */
export function readoutFor(practice: Practice, s: number, tracing: boolean) {
  if (!tracing) return practice.reads;
  return `${practice.minutes} minutes · tracing, ${Math.round(s * 100)}% of the path`;
}

/** A practice between two presets, for easing from one to the next. */
function blend(a: Practice, b: Practice, k: number): Practice {
  if (k >= 1) return b;
  const mix = (x: number, y: number) => x + (y - x) * k;
  return { ...b, minutes: mix(a.minutes, b.minutes), missM: mix(a.missM, b.missM), spreadM: mix(a.spreadM, b.spreadM) };
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

/** The static drawing between the live slots, built once. */
const RUNS: Array<{ slot: Extract<Part, { kind: 'slot' }>['slot'] } | { parts: ReactNode }> = (() => {
  const runs: Array<{ slot: Extract<Part, { kind: 'slot' }>['slot'] } | { parts: ReactNode }> = [];
  let current: ReactNode[] = [];
  PARTS.forEach((part, index) => {
    if (part.kind === 'slot') {
      runs.push({ parts: <g key={`static-${index}`}>{current}</g> });
      runs.push({ slot: part.slot });
      current = [];
      return;
    }
    current.push(<PartView key={index} part={part} />);
  });
  runs.push({ parts: <g key="static-end">{current}</g> });
  return runs;
})();

const r2 = (value: number) => Number(value.toFixed(2));

export function ExcavatorPractice({ className }: { className?: string }) {
  const drawingId = `${useId()}-drawing`;
  const [practiceId, setPracticeId] = useState<PracticeId>(STILL_PRACTICE);
  const [s, setS] = useState(STILL_S);
  const [running, setRunning] = useState(false);
  /** Whether a run is still on its way along the path (not yet gliding back). */
  const [tracing, setTracing] = useState(false);
  /** The practice the drawing shows, eased toward the chosen one. */
  const [shown, setShown] = useState<Practice>(practiceOf(STILL_PRACTICE));
  const shownRef = useRef(shown);
  const practice = practiceOf(practiceId);

  // Ease the needle, the misses and the guesses from the old preset to the new one.
  useEffect(() => {
    const from = shownRef.current;
    if (from.id === practice.id && from.minutes === practice.minutes) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 600);
      const eased = blend(from, practice, k * k * (3 - 2 * k));
      shownRef.current = eased;
      setShown(eased);
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [practice]);

  // "Trace the path": the shovel runs the whole path from the start and glides back to the still pose.
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const calm = typeof window.matchMedia === 'function' && asksForStillness();
      const { s: next, phase } = runAt((now - start) / 1000, calm);
      setS(next);
      setTracing(phase === 'tracing');
      if (phase === 'done') setRunning(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  /** Ends a run where the figure rests: the still pose. */
  const stop = () => {
    setRunning(false);
    setTracing(false);
    setS(STILL_S);
  };

  const arm = useMemo(() => armParts(tracedAt(shown, s)), [shown, s]);
  const marks = useMemo(() => boardMarks(shown, s), [shown, s]);
  const settledOn = shown.id === practice.id && shown.minutes === practice.minutes;

  const slots: Record<Extract<Part, { kind: 'slot' }>['slot'], ReactNode> = {
    board: (
      <g key="board" data-part="board">
        <path className="iso-line" data-tone="mid" data-path="" d={ENGRAVED_D} style={{ strokeWidth: 1.1 }} />
        {marks.guesses.map((d, index) => (
          <path key={index} className="iso-line" data-tone="lo" data-guess="" d={d} style={{ strokeWidth: 0.8 }} />
        ))}
        <Dots points={marks.ends} size={0.9} tone="mid" />
        {marks.ink ? <path className="iso-line" data-tone="lit" data-ink="" d={marks.ink} style={{ strokeWidth: 1.6 }} /> : null}
        <Dots points={[marks.contact]} size={1.1} tone="hi" />
      </g>
    ),
    arm: (
      <g key="arm" data-part="arm">
        {arm.map((part) => (
          <Solid key={part.name} paths={part.paths} tone={part.tone} lit={part.lit} inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined} />
        ))}
      </g>
    ),
    needle: <path key="needle" className="iso-line" data-tone="hi" data-needle="" d={needleAt(shown.minutes)} style={{ strokeWidth: 1.2 }} />,
  };

  const choose = (id: PracticeId) => {
    stop();
    // Reduced motion jumps straight to the new preset instead of easing to it.
    if (typeof window.matchMedia === 'function' && asksForStillness()) {
      shownRef.current = practiceOf(id);
      setShown(shownRef.current);
    }
    setPracticeId(id);
  };

  return (
    <InstrumentFigure
      figureId="excavator-practice"
      className={className}
      kicker="Learning on the machine"
      heading={practice.id === 'twenty' ? '20 minutes matched controllers trained on 100 to 150 minutes' : practice.reads.replace(' · ', ': ')}
      controls={
        <>
          <PresetGroup<PracticeId>
            label="Minutes of practice on the machine"
            presets={PRACTICE.map(({ id, label }) => ({ id, label }))}
            value={practiceId}
            onChange={choose}
            testId="excavator-practice"
          />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            onClick={() => {
              if (running) {
                stop();
                return;
              }
              setS(0);
              setTracing(true);
              setRunning(true);
            }}
            data-testid="excavator-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop the arm' : 'Trace the path'}
          </button>
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Pick minutes of practice. Blue ink: the shovel's path. Faint lines: five models' guesses."
          readout={readoutFor(practice, s, tracing)}
          status="Paper checkpoints; illustrative path"
          data-testid="excavator-stage-frame"
        >
          <div
            data-testid="excavator-drawing"
            data-minutes={r2(shown.minutes)}
            data-settled={settledOn ? 'true' : 'false'}
            data-s={r2(s)}
            data-source-progress={s}
            data-source-tracing={tracing}
            data-guesses={marks.guesses.length}
          >
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              describedBy={drawingId}
              label={`A walking excavator traces a path engraved on a board beside it; a stylus on its shovel inks where the shovel went, and ${ENSEMBLE_MEMBERS} faint lines ahead of it are its learned models' guesses. The trainer's dial reads ${practice.minutes} minutes of practice, against a band at the ${EARLIER_MINUTES.from} to ${EARLIER_MINUTES.to} minutes earlier controllers were given. ${practice.reads}.`}
            >
              {RUNS.map((run) => ('slot' in run ? slots[run.slot] : run.parts))}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="Learning a model of its own arm, the excavator needed 20 minutes to match controllers trained on 100 to 150."
      method={
        <>
          <p id={drawingId}>
            The drawing shows the learning loop on a practice yard: five learned models guess the shovel&apos;s next move,
            and a sampling-based planner picks commands through them. After 20 minutes the mean path error was
            2.7 cm, against 2.8 and 4.5 cm for earlier controllers; the 3- and 10-minute misses are drawn, not
            measured.
          </p>
        </>
      }
      source="Canales, Nan, Hutter and Ruiz-del-Solar (2026), Fig. 5 and Table II."
    />
  );
}
