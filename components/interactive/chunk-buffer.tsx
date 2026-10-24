'use client';

import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { INSTRUMENT_SECONDARY_CONTROL_CLASS, INSTRUMENT_SLIDER_CLASS, InstrumentFigure, SliderRow } from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { HEIGHT, PARTS, WIDTH, beltCards, movingAt, poseAt, type Part } from '@/components/iso/figures/card-feeder';
import { CHUNK_MAX, CHUNK_MIN, ENOUGH, SLOW, STILL_CHUNK, STILL_MS, TICKS_PER_SECOND, filledPerSecond, readoutFor } from '@/lib/chunk-buffer';

/**
 * ChunkBuffer: how a model that answers slowly drives a fast control clock,
 * for the comparison matrix's Gemini Robotics sentence, drawn as a card
 * feeder (components/iso/figures/card-feeder.ts).
 *
 * Each answer is a deck of cards, one card per action; the deck in flight
 * slides down the channel for the whole 250 ms. A Geneva wheel indexes the
 * belt every 20 ms and the bottom card of the deck in the well slides onto
 * the empty slot. A deck of 13 or more lasts until the next lands; a smaller
 * one leaves slots empty, ticks the arm waits. The model is
 * lib/chunk-buffer.ts. The still pose is a deck of 16 just after an answer
 * landed. The slider sets the deck; "Run the clock" plays half a second of
 * robot time, slowed twenty times, and ends back on the still pose; "Stop the
 * clock" goes back there at once. Reduced motion steps through the run in
 * four jumps instead of playing it.
 */

/** A run plays this much robot time: two answers. */
export const RUN_MS = 500;

/**
 * Where a run under reduced motion stops, in robot milliseconds after the
 * still pose, each held for an equal share of the run. Whole ticks apart, so
 * every stop shows the belt at rest, just as the still pose does.
 */
export const RUN_STOPS = [100, 200, 300, 400] as const;

/**
 * How far into its robot time a run is `elapsed` wall milliseconds after it
 * started, or null once it has ended and the figure is back on the still pose.
 * Under reduced motion (`calm`) it jumps from stop to stop.
 */
export function runOffset(elapsed: number, calm: boolean): number | null {
  const clock = Math.max(0, elapsed);
  if (calm) {
    const index = Math.floor(clock / ((RUN_MS * SLOW) / RUN_STOPS.length));
    return index < RUN_STOPS.length ? RUN_STOPS[index] : null;
  }
  const offset = clock / SLOW;
  return offset < RUN_MS ? offset : null;
}

/** What the slider's value means, for assistive technology. */
export function valueTextFor(chunk: number): string {
  const filled = filledPerSecond(chunk);
  if (filled === TICKS_PER_SECOND) return `${chunk} actions per chunk: ${ENOUGH} or more, so every tick has an action`;
  return `${chunk} actions per chunk: ${filled} of 50 ticks a second have an action, and the arm waits at the other ${TICKS_PER_SECOND - filled}`;
}

function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }): ReactNode {
  if (part.kind === 'solid') {
    const view = <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined} />;
    return part.opacity !== undefined && part.opacity < 1 ? <g opacity={Number(part.opacity.toFixed(3))}>{view}</g> : view;
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

export function ChunkBuffer({ className }: { className?: string }) {
  const sliderId = useId();
  const drawingId = `${useId()}-drawing`;
  const [chunk, setChunk] = useState(STILL_CHUNK);
  const [ms, setMs] = useState(STILL_MS);
  const [running, setRunning] = useState(false);
  const moving = useMemo(() => movingAt({ chunk, ms }), [chunk, ms]);
  const pose = poseAt({ chunk, ms });
  const onBelt = beltCards({ chunk, ms }).length;

  // "Run the clock": two answers of robot time, slowed twenty times, then back to the still pose.
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const offset = runOffset(now - start, typeof window.matchMedia === 'function' && asksForStillness());
      if (offset === null) {
        setMs(STILL_MS);
        setRunning(false);
        return;
      }
      setMs(Number((STILL_MS + offset).toFixed(3)));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return (
    <InstrumentFigure
      figureId="chunk-buffer"
      className={className}
      kicker="Action chunks"
      heading="Each answer carries enough actions to last until the next"
      controls={
        <>
          <SliderRow htmlFor={sliderId} label="Actions per chunk" value={<span data-testid="chunk-size">{chunk} actions</span>}>
            <input
              id={sliderId}
              type="range"
              data-brand-control-id="control:input"
              min={CHUNK_MIN}
              max={CHUNK_MAX}
              step={1}
              value={chunk}
              onChange={(e) => setChunk(Number(e.target.value))}
              aria-valuetext={valueTextFor(chunk)}
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
                setMs(STILL_MS);
                return;
              }
              setRunning(true);
            }}
            data-testid="chunk-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop the clock' : 'Run the clock'}
          </button>
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="The deck on its way is the next answer; the lit deck is being played"
          readout={readoutFor(chunk)}
          status="250 ms and 50 Hz from Gemini Robotics; chunk sizes illustrative; slowed twenty times"
          data-testid="chunk-stage-frame"
        >
          <div
            data-testid="chunk-drawing"
            data-chunk={chunk}
            data-ms={Number(ms.toFixed(1))}
            data-tick={pose.tick}
            data-left={pose.left}
            data-on-belt={onBelt}
            data-filled={filledPerSecond(chunk)}
          >
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              describedBy={drawingId}
              label={`A card feeder. A sealed box sends a deck of ${chunk} cards down a channel for every answer, one card per action; the next deck is on its way while the lit deck in the well is played. A Geneva wheel moves a belt one slot every tick, and the bottom card of the deck slides onto the empty slot. ${
                chunk >= ENOUGH ? 'Each deck lasts until the next one lands, so every slot carries a card.' : 'Each deck runs out before the next one lands, so some slots go by empty: ticks the arm waits.'
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
      caption="Gemini Robotics takes about 250 ms to answer yet acts at 50 Hz: 13 actions per chunk cover the wait; fewer leave the arm idle."
      method={
        <>
          <p>
            Gemini Robotics runs about 250 ms from camera to action, yet reaches a 50 Hz effective control frequency
            because each answer is a chunk of several actions. At 50 Hz the controller needs an action every 20 ms,
            so one 250 ms wait spans 12.5 ticks: a chunk of 13 or more lasts until the next answer lands.
          </p>
          <p id={drawingId}>
            The feeder is that arithmetic made of parts. Each answer is a deck of cards, one card per action, and the
            deck on its way slides down the channel for the whole 250 ms. When it lands it shoves out what is left of
            the deck before, because the fresher plan wins. The Geneva wheel indexes once every 20 ms; the belt moves
            one slot, and the bottom card of the deck slides onto it. A deck that runs out early leaves slots empty,
            and each empty slot is a tick the arm waits. The line on the ruler beside the deck marks 12.5 cards.
          </p>
          <p>
            Assumed: one request at a time, the next sent when an answer lands. Gemini Robotics does not publish its
            chunk length, so the deck size is the reader&apos;s; 16 is the chunk GR00T N1 samples. Robot time is slowed
            twenty times.
          </p>
        </>
      }
      source="Latency and control rate from the Gemini Robotics report (2025)."
    />
  );
}
