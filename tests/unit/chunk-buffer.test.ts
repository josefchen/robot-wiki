import { describe, expect, it } from 'vitest';
import {
  ANSWER_MS,
  CHUNK_MAX,
  CHUNK_MIN,
  ENOUGH,
  STILL_CHUNK,
  TICK_MS,
  TICKS_PER_ANSWER,
  actionOfTick,
  actionsLeft,
  filledPerSecond,
  firstTickOf,
  leftOver,
  readoutFor,
  tickFilled,
  ticksServed,
} from '@/lib/chunk-buffer';

describe('the chunk buffer model', () => {
  it('takes its two numbers from the source: about 250 ms an answer, 50 Hz control', () => {
    expect(ANSWER_MS).toBe(250);
    expect(TICK_MS).toBe(20);
    expect(TICKS_PER_ANSWER).toBe(12.5);
    expect(ENOUGH).toBe(13);
    expect(STILL_CHUNK).toBe(16);
  });

  it('serves 13 and 12 ticks in turn, so every 500 ms holds 25 ticks', () => {
    for (let answer = 0; answer < 8; answer++) {
      expect(ticksServed(answer)).toBe(answer % 2 === 0 ? 13 : 12);
      expect(firstTickOf(answer) * TICK_MS).toBeGreaterThanOrEqual(answer * ANSWER_MS);
      expect(firstTickOf(answer) * TICK_MS - answer * ANSWER_MS).toBeLessThan(TICK_MS);
    }
  });

  it('plays a fresh chunk from its first action at each answer, one action a tick, then waits', () => {
    for (let chunk = CHUNK_MIN; chunk <= CHUNK_MAX; chunk++) {
      for (let tick = 0; tick < 100; tick++) {
        const played = actionOfTick(chunk, tick);
        const answer = Math.floor((tick * TICK_MS) / ANSWER_MS);
        const index = tick - firstTickOf(answer);
        expect(played === null).toBe(index >= chunk);
        if (played) expect(played).toEqual({ answer, action: index });
      }
    }
  });

  it('never runs dry from 13 actions up, and fills 4 × the chunk of every 50 ticks below that', () => {
    for (let chunk = CHUNK_MIN; chunk <= CHUNK_MAX; chunk++) {
      const filled = filledPerSecond(chunk);
      expect(filled).toBe(Math.min(50, Math.round(4 * Math.min(chunk, TICKS_PER_ANSWER))));
      if (chunk >= ENOUGH) for (let tick = 0; tick < 200; tick++) expect(tickFilled(chunk, tick)).toBe(true);
    }
    expect(filledPerSecond(12)).toBe(48);
    expect(filledPerSecond(8)).toBe(32);
    expect(filledPerSecond(13)).toBe(50);
  });

  it('counts the actions left in the buffer and the ones a fresh chunk sets aside', () => {
    expect(actionsLeft(16, 0)).toBe(15);
    expect(actionsLeft(16, 240)).toBe(3);
    expect(actionsLeft(16, 260)).toBe(15);
    expect(actionsLeft(8, 200)).toBe(0);
    expect(leftOver(16, 0)).toBe(3);
    expect(leftOver(16, 1)).toBe(4);
    expect(leftOver(8, 0)).toBe(0);
  });

  it('reads out in words', () => {
    expect(readoutFor(16)).toBe('16 per chunk · the arm never waits');
    expect(readoutFor(8)).toBe('8 per chunk · arm waits 18 of 50 ticks');
    expect(readoutFor(12)).toBe('12 per chunk · arm waits 2 of 50 ticks');
    // One line on a phone: no readout runs past 40 characters.
    for (let chunk = CHUNK_MIN; chunk <= CHUNK_MAX; chunk++) expect(readoutFor(chunk).length).toBeLessThanOrEqual(40);
  });
});
