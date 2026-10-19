/**
 * The chunk buffer behind ChunkBuffer (manipulation/comparison-matrix): how a
 * model that answers slowly can still drive a fast control clock.
 *
 * Gemini Robotics runs about 250 ms end to end, yet reaches a 50 Hz
 * effective control frequency because each answer is a chunk of several
 * actions (gemini-robotics-2025). The two numbers are the source's; the
 * rest is the plain arithmetic of a buffer:
 *
 * - an answer arrives every 250 ms, and its chunk replaces whatever is left
 *   of the one before (the fresher plan wins);
 * - the controller plays one action at every 20 ms tick (50 Hz), the first
 *   tick at or after the answer's arrival using its first action;
 * - a tick with no action left is a tick the arm waits.
 *
 * 250 ms holds 12.5 ticks, so a chunk of 13 or more actions never runs dry,
 * and a chunk of H < 13 fills 4·H of the 50 ticks in each second. The chunk
 * size is the reader's; the source gives none.
 *
 * Times are robot milliseconds. The figure plays them slowed (SLOW).
 */

/** About 250 ms end to end, one answer after another (gemini-robotics-2025). */
export const ANSWER_MS = 250;
/** 50 Hz control: one tick every 20 ms (gemini-robotics-2025). */
export const TICK_MS = 20;
export const TICKS_PER_SECOND = 1000 / TICK_MS;
/** Ticks between two answers: 12.5. */
export const TICKS_PER_ANSWER = ANSWER_MS / TICK_MS;
/** The smallest chunk that never runs dry. */
export const ENOUGH = Math.ceil(TICKS_PER_ANSWER);

export const CHUNK_MIN = 4;
export const CHUNK_MAX = 24;
/** The still pose's chunk: 16 actions, the size GR00T N1 samples in the same paragraph. */
export const STILL_CHUNK = 16;
/** The figure plays robot time this many times slower. */
export const SLOW = 20;
/** The still pose's moment: just after the second answer's second action, when a chunk too small has left its gap on the belt. */
export const STILL_MS = 14 * TICK_MS + 16;

/** Which answer is in the buffer at a moment: the last to arrive at or before it. */
export const answerAt = (ms: number) => Math.floor(ms / ANSWER_MS + 1e-9);
/** The first tick at or after an answer's arrival. */
export const firstTickOf = (answer: number) => Math.ceil((answer * ANSWER_MS) / TICK_MS - 1e-9);
/** How many ticks an answer serves before the next one arrives: 13 or 12, in turn. */
export const ticksServed = (answer: number) => firstTickOf(answer + 1) - firstTickOf(answer);

/** Which action of its chunk tick k plays, or null when the chunk has run out and the arm waits. */
export function actionOfTick(chunk: number, tick: number): { answer: number; action: number } | null {
  const answer = answerAt(tick * TICK_MS);
  const action = tick - firstTickOf(answer);
  return action < chunk ? { answer, action } : null;
}

export const tickFilled = (chunk: number, tick: number) => actionOfTick(chunk, tick) !== null;

/** Actions left in the buffer just after the tick at or before `ms` has played. */
export function actionsLeft(chunk: number, ms: number): number {
  const answer = answerAt(ms);
  const played = Math.floor(ms / TICK_MS + 1e-9) - firstTickOf(answer) + 1;
  return Math.max(0, chunk - played);
}

/** Actions set aside unplayed when the next answer arrives. */
export const leftOver = (chunk: number, answer: number) => Math.max(0, chunk - ticksServed(answer));

/** Ticks in one second of robot time that move the arm: all 50 for a chunk of 13 or more, 4 × the chunk below that. */
export function filledPerSecond(chunk: number): number {
  let filled = 0;
  for (let tick = 0; tick < TICKS_PER_SECOND; tick++) if (tickFilled(chunk, tick)) filled++;
  return filled;
}

/** The readout, in words: short enough for one line on a phone. */
export function readoutFor(chunk: number): string {
  const filled = filledPerSecond(chunk);
  const lead = `${chunk} per chunk`;
  return filled === TICKS_PER_SECOND ? `${lead} · the arm never waits` : `${lead} · arm waits ${TICKS_PER_SECOND - filled} of 50 ticks`;
}
