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
  RUN_SECONDS,
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
 * "Trace the path" runs the arm along the whole path. Numbers and words come
 * from lib/excavator-practice.ts. Reduced motion jumps instead of moving.
 */

/** The readout, in words: what the paper reports at this point, or how far a run has got. */
export function readoutFor(practice: Practice, s: number, running: boolean) {
  if (!running) return practice.reads;
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

  // "Trace the path": the shovel runs the whole path from the start.
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const next = Math.min(1, (now - start) / (RUN_SECONDS * 1000));
      setS(next);
      if (next < 1) frame = requestAnimationFrame(tick);
      else setRunning(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

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
    setRunning(false);
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
      heading="An excavator learned its own arm in 20 minutes"
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
                setRunning(false);
                return;
              }
              // Reduced motion jumps to the end of the path instead of tracing it.
              if (typeof window.matchMedia === 'function' && asksForStillness()) setS(1);
              else {
                setS(0);
                setRunning(true);
              }
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
          hint="Faint: the five models' guesses. Blue: where the shovel went"
          readout={readoutFor(practice, s, running)}
          status="Checkpoints from the paper; the path and the guesses' spread are illustrative"
          data-testid="excavator-stage-frame"
        >
          <div
            data-testid="excavator-drawing"
            data-minutes={r2(shown.minutes)}
            data-settled={settledOn ? 'true' : 'false'}
            data-s={r2(s)}
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
      caption="Learning a model from its own moves, the excavator tracked paths after 20 minutes as well as earlier controllers trained for 100 to 150."
      method={
        <>
          <p>
            Canales, Nan, Hutter and Ruiz-del-Solar learned a model of an 11.5-ton Menzi Muck M445 walking
            excavator&apos;s arm from scratch on the machine itself, with no demonstrations and no simulator. Its
            sensors measure the joints but not the oil pressures or the valves&apos; inner state, so the model reads a short history
            of joint positions and valve commands. The model is an ensemble of five networks, refitted after every
            ten trajectories; a sampling-based planner tries thousands of command sequences through it every
            control cycle and sends the first command of the best one.
          </p>
          <p id={drawingId}>
            The drawing is that loop on a practice yard. A stylus on the shovel inks where the shovel really went
            (blue) against the path engraved on the board, and five faint lines ahead of it are the five models&apos;
            guesses of where it goes next. The trainer&apos;s dial counts minutes of practice; its band marks the
            100 to 150 minutes of machine data the earlier learned controllers were given. The paper&apos;s
            snapshots show large misses after 3 minutes, the path followed more closely after 10 and consistent
            tracking after 20. After 20 minutes the shovel tracked its timed path 2.7 cm off on average, against 2.8
            and 4.5 cm for the earlier controllers; after 40 minutes every objective kept it under a centimetre off
            the path on average.
          </p>
          <p>
            Illustrative: the path, the misses drawn at 3 and 10 minutes (shaped like the paper&apos;s snapshots,
            not measured) and how far the guesses fan out. At 20 and 40 minutes the misses are drawn at the
            paper&apos;s mean errors, too small to see at this scale. The machine is drawn with its arm in one
            plane, the telescopic extension sliding out as it reaches further.
          </p>
        </>
      }
      source="Canales, Nan, Hutter and Ruiz-del-Solar (2026), Fig. 5 and Table II."
    />
  );
}
