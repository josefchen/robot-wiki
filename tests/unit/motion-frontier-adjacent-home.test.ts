import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import { TACTILE_SLIP_METHOD_NOTE, TACTILE_SLIP_SCENE, tactileSlipFrame } from '@/components/motion/scenes/tactile-slip';
import { SENSE_AVOID_METHOD_NOTE, SENSE_AVOID_SCENE, senseAvoidDistances, senseAvoidFrame } from '@/components/motion/scenes/sense-avoid';
import { DEFAULT_AGILITY, SENSORS, latencyOutcome } from '@/lib/aerial-latency';
import { NO_SLOP_EXCEPTIONS } from '@/data/no-slop-exceptions';
import { findStructuralTells, structuralTellReport, STRUCTURAL_TELL_LIMIT } from '@/lib/no-slop';

const root = process.cwd();
const articles = ['frontier', 'adjacent'].flatMap((domain) =>
  readdirSync(join(root, 'content', domain))
    .filter((name) => name.endsWith('.mdx'))
    .sort()
    .map((name) => `${domain}/${name}`));
const scenes = [TACTILE_SLIP_SCENE, SENSE_AVOID_SCENE];

describe('frontier and adjacent scene truth', () => {
  it('shows a toy slip and a distinct tactile correction, without a performance claim', () => {
    const spans = beatSpans(TACTILE_SLIP_SCENE.beats);
    expect(tactileSlipFrame(spans[0].end).slip).toBe(0);
    expect(tactileSlipFrame(spans[1].end).slip).toBeGreaterThan(0);
    expect(tactileSlipFrame(spans[2].end).correction).toBeGreaterThan(0);
    expect(spans[1].linear).toBe(true);
    // The no-claim statement moved from the captions to the method note.
    expect(TACTILE_SLIP_METHOD_NOTE).toMatch(/schematic/i);
    expect(TACTILE_SLIP_METHOD_NOTE).toMatch(/not a demonstrated recovery rate/i);
    expect(TACTILE_SLIP_SCENE.beats.map((beat) => beat.caption).join(' ')).not.toMatch(/\d+\s*%|rate/i);
    // The poster still is the caught slip: lower than the start, sensors lit.
    const end = tactileSlipFrame(spans[3].end);
    expect(end.slip).toBe(1);
    expect(end.correction).toBe(1);
  });

  it('uses the paper-model latency and agility without changing its constants', () => {
    const spans = beatSpans(SENSE_AVOID_SCENE.beats);
    const first = senseAvoidFrame(spans[0].end);
    const delayed = senseAvoidFrame(spans[2].end);
    expect(first.outcome).toEqual(latencyOutcome(SENSORS[0].latencyS, DEFAULT_AGILITY, SENSORS[0].rangeM));
    expect(delayed.outcome.maxSpeedMs).toBeLessThan(first.outcome.maxSpeedMs);
    expect(first.latency).toBeCloseTo(0.07);
    expect(delayed.latency).toBeCloseTo(0.2);
    expect(first.outcome.avoidanceTimeS).toBeCloseTo(delayed.outcome.avoidanceTimeS);
    const middle = senseAvoidFrame((spans[2].start + spans[2].end) / 2);
    expect(middle.latency).toBeCloseTo(0.135);
    expect(middle.outcome.avoidanceTimeS).toBeCloseTo(first.outcome.avoidanceTimeS);
    expect(middle.outcome.maxSpeedMs).toBeLessThan(first.outcome.maxSpeedMs);
    expect(middle.outcome.maxSpeedMs).toBeGreaterThan(delayed.outcome.maxSpeedMs);
    expect(spans[2].linear).toBe(true);
    // The stage draws distance: about 1.3 m flown blind at 70 ms, about 2.9 m at 200 ms,
    // and top speeds of about 69 and 53 km/h.
    const quick = senseAvoidDistances(first.latency);
    const slow = senseAvoidDistances(delayed.latency);
    expect(quick.blindM).toBeCloseTo(1.34, 1);
    expect(slow.blindM).toBeCloseTo(2.93, 1);
    expect(quick.blindM + quick.swerveM).toBeCloseTo(SENSORS[0].rangeM);
    expect([quick.speedKmh, slow.speedKmh]).toEqual([69, 53]);
    // 200 ms is the figure's own choice; the study's stereo camera is the
    // 70 ms datasheet bound it adopted, so nothing here was "measured".
    expect(SENSE_AVOID_METHOD_NOTE).toMatch(/slow camera's 200 ms is a delay chosen for this figure/);
    expect(SENSE_AVOID_METHOD_NOTE).not.toMatch(/measured/);
    expect(SENSE_AVOID_METHOD_NOTE).toMatch(/about 346 ms/);
  });

  it('ends every scene on a still recap with a standalone caption per beat', () => {
    for (const scene of scenes) {
      expect(scene.beats).toHaveLength(4);
      for (const beat of scene.beats) expect(beat.caption).toMatch(/[.!?]$/);
      expect(posterTime(beatSpans(scene.beats))).toBeGreaterThan(0);
    }
  });
});

describe('frontier and adjacent prose continuity', () => {

  it('keeps every article at or below two structural tells per thousand words', () => {
    for (const file of articles) {
      const body = readFileSync(join(root, 'content', file), 'utf8');
      const report = structuralTellReport(body, NO_SLOP_EXCEPTIONS);
      expect(report.measured, file).toBe(true);
      expect(report.tells, file).toBe(findStructuralTells(body, NO_SLOP_EXCEPTIONS).length);
      expect(report.density, file).toBeLessThanOrEqual(STRUCTURAL_TELL_LIMIT);
    }
  });
});
