import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import { BatchScale, BATCH_SCALE_SCENE, batchScaleFrame, overheadCurve } from '@/components/motion/scenes/batch-scale';
import {
  GaitSupport,
  GAIT_SUPPORT_SAMPLES,
  GAIT_SUPPORT_SCENE,
  LINE_UP,
  gaitSupportFrame,
} from '@/components/motion/scenes/gait-support';
import { DEFAULT_GAIT, GAITS, GAIT_ORDER, minStanceCount, stanceLegs } from '@/lib/gait';
import { DEFAULT_ENVS, MAX_ENVS, MIN_ENVS, wallClockSeconds } from '@/lib/parallel-sim';
import { NO_SLOP_EXCEPTIONS } from '@/data/no-slop-exceptions';
import { findStructuralTells, structuralTellReport, STRUCTURAL_TELL_LIMIT } from '@/lib/no-slop';
import { preDomainPass } from '../helpers/seo-pass';

type Decision = 'keep' | 'restyle' | 'rethink' | 'replace' | 'remove' | 'add';
interface Row {
  article: string;
  element: string;
  occurrence?: number;
  decision: Decision;
  sceneId?: string;
  teachingGoal: string;
  reason: string;
}

const root = process.cwd();
const folder = join(root, 'content/rl-sim2real');
const articles = readdirSync(folder).filter((file) => file.endsWith('.mdx'));
const inventory = JSON.parse(
  readFileSync(join(root, 'docs/design/motion-rl-sim2real-inventory.json'), 'utf8'),
) as Row[];

describe('RL and sim-to-real motion inventory', () => {
  it('accounts for every figure, assessment, and repeated mount in the domain', () => {
    const mounts: string[] = [];
    const globalTags = new Set(['SelfCheck', 'PredictThenReveal']);
    for (const file of articles) {
      const article = file.slice(0, -4);
      const body = readFileSync(join(folder, file), 'utf8');
      const imported = [...body.matchAll(
        /import\s*\{([^}]+)\}\s*from\s*'@\/components\/(?:interactive|motion\/scenes|motion\/clip|mdx)\//g,
      )].flatMap((match) => match[1].split(',').map((name) => name.trim()).filter(Boolean));
      const widgets = new Set([...imported, ...globalTags]);
      for (const tag of imported) expect(body, `${article}:${tag} is imported but not mounted`).toContain(`<${tag}`);
      for (const match of body.matchAll(/<([A-Z]\w+)\b[^>]*>/g)) {
        const tag = match[1];
        if (tag === 'Image' || tag === 'Clip') {
          const id = match[0].match(/\bid="([^"]+)"/)?.[1];
          expect(id, `${article}:${tag} needs an id`).toBeTruthy();
          mounts.push(`${article}:${tag}:${id}`);
          continue;
        }
        if (!widgets.has(tag)) continue;
        if (inventory.some((row) => row.article === article && row.element === tag && row.decision === 'add')) continue;
        mounts.push(`${article}:${tag}`);
      }
    }
    // Removed rows keep their record but no longer mount; a removed second
    // occurrence still leaves its first occurrence in the mount count.
    expect(inventory.filter((row) => row.decision !== 'add' && row.decision !== 'remove')
      .map((row) => `${row.article}:${row.element}`).sort()).toEqual(mounts.sort());
    const keys = inventory.map((row) => `${row.article}:${row.element}:${row.occurrence ?? 1}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const row of inventory) {
      expect(articles).toContain(`${row.article}.mdx`);
      expect(row.teachingGoal.length).toBeGreaterThan(25);
      expect(row.reason.length).toBeGreaterThan(25);
      if (row.decision === 'add') {
        expect(['batch-scale', 'gait-support']).toContain(row.sceneId);
        expect(readFileSync(join(folder, `${row.article}.mdx`), 'utf8')).toContain(`<${row.element}`);
      }
    }
  });
});

describe('RL and sim-to-real scene models', () => {
  it('keeps the original fixed-transition time arithmetic and linear model-time reveal', () => {
    const spans = beatSpans(BATCH_SCALE_SCENE.beats);
    const first = batchScaleFrame(spans[0].end);
    const second = batchScaleFrame(spans[1].end);
    const final = batchScaleFrame(posterTime(spans));
    expect(first.environments).toBe(MIN_ENVS);
    expect(second.environments).toBe(DEFAULT_ENVS);
    expect(final.environments).toBe(MAX_ENVS);
    expect(first.wallSeconds).toBe(wallClockSeconds(MIN_ENVS, false));
    expect(second.wallSeconds).toBe(wallClockSeconds(DEFAULT_ENVS, false));
    expect(final.wallSeconds).toBe(wallClockSeconds(MAX_ENVS, false));
    expect(spans[1].linear).toBe(true);
    expect(batchScaleFrame(posterTime(spans))).toEqual(final);
  });

  it('morphs the dashed overhead curve out of the solid curve across the cpu beat', () => {
    const spans = beatSpans(BATCH_SCALE_SCENE.beats);
    const numbers = (d: string) => d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const vertices = (lift: number) => overheadCurve(lift).map(({ d }) => numbers(d));
    // The stage's log time axis, recomputed: one minute at y 160 up to four hours at y 36.
    const y = (seconds: number) => Number((160 - (Math.log10(seconds / 60) / Math.log10(240)) * 124).toFixed(2));
    const solid = vertices(0);
    const bound = vertices(1);
    const solidFrom = (envs: number) => y(wallClockSeconds(envs, false));
    expect(solid).toHaveLength(32);
    // At lift 0 the copy is the solid curve; at lift 1 it is the CPU-bound curve.
    expect(solid[0].slice(0, 2)).toEqual([62, solidFrom(MIN_ENVS)]);
    expect(solid[31].slice(2)).toEqual([234, solidFrom(MAX_ENVS)]);
    expect(bound[31].slice(2)).toEqual([234, y(wallClockSeconds(MAX_ENVS, true))]);
    // The overhead lifts the right end most, which is what flattens the curve.
    expect(solid[31][3] - bound[31][3]).toBeGreaterThan(20);
    expect(solid[0][1] - bound[0][1]).toBeLessThan(1);

    // Hidden on the solid curve through beat 2; on the CPU-bound curve, label shown, from beat 3 into the recap.
    expect(batchScaleFrame(spans[1].end)).toMatchObject({ overheadLift: 0, overheadOpacity: 0, overheadLabel: 0 });
    for (const t of [spans[2].end, spans[3].end, posterTime(spans)]) {
      expect(batchScaleFrame(t)).toMatchObject({ overheadLift: 1, overheadOpacity: 1, overheadLabel: 1 });
    }
    // The label lands with the curve: still hidden halfway through the lift.
    expect(batchScaleFrame(spans[2].start + spans[2].duration / 2).overheadLabel).toBe(0);

    // At 60 frames a second every vertex rises in small steps and never passes the CPU-bound curve.
    let previous = solid;
    let frames = 0;
    for (let t = spans[2].start; t <= spans[2].end; t += 1000 / 60, frames += 1) {
      const now = vertices(batchScaleFrame(t).overheadLift);
      for (const [i, segment] of now.entries()) {
        for (const k of [1, 3]) {
          expect(segment[k]).toBeLessThanOrEqual(previous[i][k]);
          expect(previous[i][k] - segment[k]).toBeLessThan(2);
          expect(segment[k]).toBeGreaterThanOrEqual(bound[i][k]);
        }
      }
      previous = now;
    }
    expect(frames).toBeGreaterThan(60);

    // Each segment's dash offset is the curve length before it, so the dashes run on across the joins.
    for (const lift of [0, 0.37, 1]) {
      let travelled = 0;
      for (const { d, offset } of overheadCurve(lift)) {
        expect(offset).toBeCloseTo(travelled, 1);
        const [x0, y0, x1, y1] = numbers(d);
        travelled += Math.hypot(x1 - x0, y1 - y0);
      }
    }
  });

  it('uses the authored gait definitions without presenting a measured footfall trace', () => {
    const spans = beatSpans(GAIT_SUPPORT_SCENE.beats);
    // One beat per gait in the line-up, then the recap; the method note keeps every authored gait.
    expect(GAIT_SUPPORT_SCENE.beats).toHaveLength(LINE_UP.length + 1);
    expect(gaitSupportFrame(spans[0].end).visibleGaits).toEqual([DEFAULT_GAIT]);
    expect(gaitSupportFrame(posterTime(spans)).visibleGaits).toEqual(LINE_UP);
    for (const id of GAIT_ORDER) {
      expect(gaitSupportFrame(posterTime(spans)).minimumSupport[id])
        .toBe(minStanceCount(GAITS[id]));
      expect(gaitSupportFrame(posterTime(spans)).stanceAtQuarter[id])
        .toEqual(stanceLegs(GAITS[id], 0.25));
    }
    const pair = (id: 'trot' | 'bound') =>
      GAIT_SUPPORT_SAMPLES.map((phase) => stanceLegs(GAITS[id], phase));
    expect(pair('trot')).toEqual([
      ['lf', 'rh'], ['lf', 'rh'], ['rf', 'lh'], ['rf', 'lh'],
    ]);
    expect(pair('bound')).toEqual([
      ['lf', 'rf'], [], ['lh', 'rh'], [],
    ]);
  });

  it('gives every beat a standalone sentence and a still final overview', () => {
    expect(BATCH_SCALE_SCENE.beats).toHaveLength(4);
    expect(GAIT_SUPPORT_SCENE.beats).toHaveLength(4);
    for (const scene of [BATCH_SCALE_SCENE, GAIT_SUPPORT_SCENE]) {
      expect(scene.beats.at(-1)?.id).toBe('recap');
      for (const beat of scene.beats) expect(beat.caption).toMatch(/[.!?]$/);
    }
  });

  it('marks the batch axis labels for rendered-size checks and keeps every word out of the gait drawing', () => {
    const gait = renderToStaticMarkup(createElement(GaitSupport));
    const batch = renderToStaticMarkup(createElement(BatchScale));
    const count = (html: string) => [...html.matchAll(/data-scene-stage-label=/g)].length;
    // The gait scene is a treadmill and a gait recorder: its stage carries no
    // text at all, so there is nothing to size; its words are the readout,
    // the legend and the captions under the stage.
    const stage = gait.match(/<svg[^>]*motion-stage-svg[\s\S]*?<\/svg>/)?.[0] ?? '';
    expect(stage).not.toBe('');
    expect(count(stage)).toBe(0);
    expect(stage).not.toMatch(/<(text|title|desc|foreignObject)\b/);
    // One ink mark per gait and foot.
    expect([...stage.matchAll(/data-scene-mark="[a-z]+-foot-\d"/g)]).toHaveLength(LINE_UP.length * 4);
    expect(count(batch)).toBeGreaterThanOrEqual(4);
  });
});

// Authored toy values that left the prose together with a retired figure
// block (the sim2real-transfer prediction exercise and its second friction
// panel). None is a sourced measurement; every other token must still match.
const RETIRED_WITH_FIGURES: Record<string, string[]> = {
  'sim2real-transfer.mdx': [
    '0.35', '0.55', '0.5725', '0.65', '0.65', '0.65', '0.65',
    '0.7375', '0.80', '0.93', '57%', '57%', '74%',
  ],
};

describe('RL and sim-to-real prose truth', () => {
  it('preserves the original numeric tokens and citation mounts per article', () => {
    for (const file of articles) {
      // The 2026-10-06 domain pass rewrote these articles from the owner's
      // drafts; its reviewed successor hands this check the pre-pass bytes.
      const current = preDomainPass(`content/rl-sim2real/${file}`).toString('utf8');
      const before = execFileSync('git', ['show', `8368034:content/rl-sim2real/${file}`], {
        cwd: root, encoding: 'utf8',
      });
      // Paper-internal locators are moved out of reader prose by the
      // humanizer pass. Compare the exact remaining quantity strings as a
      // multiset: moving a sentence does not change a sourced measurement.
      const numbers = (text: string) => text
        .replace(/\b(?:Tables?|Tab\.|Figures?|Fig\.|Equation|Eq\.|Algorithm|Sections?)\s*\(?\s*(?:\d+(?:\.\d+)*[a-z]?|[IVXL]+)\b|\bAppendix\s+[A-Z]\d*(?:\.\d+)?\b|\bv\d+\b/g, '')
        .match(/(?<![\w-])\d(?:[\d,]*\d)?(?:\.\d+)?(?:%|x|Hz|ms|s|m|M|k)?/g)
        ?.sort() ?? [];
      const citations = (text: string) => [...text.matchAll(/<Cite id="([^"]+)"/g)].map((match) => match[1]);
      const expected: string[] = [...numbers(before)];
      for (const token of RETIRED_WITH_FIGURES[file] ?? []) {
        const index = expected.indexOf(token);
        expect(index, `${file} retired token ${token}`).toBeGreaterThanOrEqual(0);
        expected.splice(index, 1);
      }
      expect(numbers(current), `${file} numeric tokens`).toEqual(expected);
      expect(citations(current), `${file} citations`).toEqual(citations(before));
    }
  });

  it('measures all eight articles at no more than two structural tells per thousand words', () => {
    expect(articles).toHaveLength(8);
    for (const file of articles) {
      const body = readFileSync(join(folder, file), 'utf8');
      const report = structuralTellReport(body, NO_SLOP_EXCEPTIONS);
      expect(report.measured, file).toBe(true);
      expect(report.tells, file).toBe(findStructuralTells(body, NO_SLOP_EXCEPTIONS).length);
      expect(report.density, file).toBeLessThanOrEqual(STRUCTURAL_TELL_LIMIT);
    }
  });
});
