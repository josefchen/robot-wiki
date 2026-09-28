import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import { ACTION_FORK_SCENE, actionForkFrame } from '@/components/motion/scenes/action-fork';
import { LATENT_DRIFT_SCENE, latentDriftFrame } from '@/components/motion/scenes/latent-drift';
import { PUSH_LAYERS_SCENE, pushLayersFrame } from '@/components/motion/scenes/push-layers';
import { actionSensitivity, rollout, REALISM_SCORE } from '@/lib/action-conditioning';
import { deviationAt, TYPICAL_HORIZON } from '@/lib/latent-imagination';
import { applyPush, DEFAULT_FORCE_N, INITIAL_LAYERS, INITIAL_MUG } from '@/lib/appearance-physics-push';
import { NO_SLOP_EXCEPTIONS } from '@/data/no-slop-exceptions';
import { findStructuralTells, structuralTellReport, STRUCTURAL_TELL_LIMIT } from '@/lib/no-slop';

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
const folder = join(root, 'content/world-models');
const articles = readdirSync(folder).filter((file) => file.endsWith('.mdx')).sort();
const inventory = JSON.parse(readFileSync(
  join(root, 'docs/design/motion-world-models-inventory.json'), 'utf8',
)) as Row[];
const figures = new Set([
  'WmDisambiguator', 'WmTaxonomyTable', 'LatentImagination',
  'ActionConditioning', 'JepaPlanning', 'AppearancePhysicsPush',
  'EvalShiftTable', 'SimVsModelTable', 'WorldModelCostTable',
  'Stat', 'SelfCheck',
]);

describe('world-models motion inventory', () => {
  it('accounts for every first-party figure and assessment, including repeated stats', () => {
    const mounts: string[] = [];
    for (const file of articles) {
      const article = file.slice(0, -4);
      const body = readFileSync(join(folder, file), 'utf8');
      const counts = new Map<string, number>();
      for (const match of body.matchAll(/<([A-Z]\w+)\b/g)) {
        const element = match[1];
        if (!figures.has(element)) continue;
        const occurrence = (counts.get(element) ?? 0) + 1;
        counts.set(element, occurrence);
        mounts.push(`${article}:${element}:${occurrence}`);
      }
    }
    const covered = inventory.filter((row) => row.decision !== 'add')
      .map((row) => `${row.article}:${row.element}:${row.occurrence ?? 1}`);
    expect(covered.sort()).toEqual(mounts.sort());
    expect(new Set(inventory.map((row) => `${row.article}:${row.element}:${row.occurrence ?? 1}`)).size)
      .toBe(inventory.length);
    for (const row of inventory) {
      expect(articles).toContain(`${row.article}.mdx`);
      expect(row.teachingGoal.length).toBeGreaterThan(25);
      expect(row.reason.length).toBeGreaterThan(25);
      if (row.decision === 'add') {
        expect(['action-fork', 'latent-drift', 'push-layers']).toContain(row.sceneId);
        expect(readFileSync(join(folder, `${row.article}.mdx`), 'utf8')).toContain(`<${row.element}`);
      }
    }
  });
});

describe('world-models scene truth', () => {
  it('uses the original rollout model and keeps weak and strong scores distinct', () => {
    const spans = beatSpans(ACTION_FORK_SCENE.beats);
    const first = actionForkFrame(spans[0].end);
    const strong = actionForkFrame(spans[1].end);
    const weak = actionForkFrame(spans[2].end);
    expect(first.rolloutA).toEqual(rollout({ action: 'push-left', conditioning: 'strong' })[0]);
    expect(strong.rolloutB).toEqual(rollout({ action: 'lift', conditioning: 'strong' }).at(-1));
    expect(weak.rolloutB).toEqual(rollout({ action: 'lift', conditioning: 'weak' }).at(-1));
    expect(strong.sensitivity).toBe(actionSensitivity({ actionA: 'push-left', actionB: 'lift', conditioning: 'strong' }));
    expect(weak.sensitivity).toBe(actionSensitivity({ actionA: 'push-left', actionB: 'lift', conditioning: 'weak' }));
    expect(strong.realism).toBe(REALISM_SCORE);
    expect(weak.realism).toBe(REALISM_SCORE);
    expect(spans[1].linear).toBe(true);
  });

  it('derives imagined deviation from the existing recurrence in linear model time', () => {
    const spans = beatSpans(LATENT_DRIFT_SCENE.beats);
    const atHorizon = latentDriftFrame(spans[2].end);
    expect(atHorizon.horizon).toBe(TYPICAL_HORIZON[1]);
    expect(atHorizon.deviation).toBe(deviationAt({ epsilon: 0.02, horizon: TYPICAL_HORIZON[1] }));
    expect(spans[2].linear).toBe(true);
    expect(latentDriftFrame(posterTime(spans))).toEqual(latentDriftFrame(posterTime(spans)));
  });

  it('replays the same push under appearance-only and physics-enabled layers', () => {
    const spans = beatSpans(PUSH_LAYERS_SCENE.beats);
    const noSolver = pushLayersFrame(spans[1].end);
    const solver = pushLayersFrame(spans[2].end);
    expect(noSolver.position).toBe(applyPush(INITIAL_MUG, INITIAL_LAYERS, DEFAULT_FORCE_N).state.position);
    expect(solver.position).toBe(applyPush(INITIAL_MUG, { ...INITIAL_LAYERS, physics: true }, DEFAULT_FORCE_N).state.position);
    expect(noSolver.position).toBe(0);
    expect(solver.position).toBeGreaterThan(0);
    expect(spans[2].linear).toBe(true);
  });

  it('writes one standalone caption per beat and keeps the recap still', () => {
    for (const scene of [ACTION_FORK_SCENE, LATENT_DRIFT_SCENE, PUSH_LAYERS_SCENE]) {
      expect(scene.beats).toHaveLength(4);
      for (const beat of scene.beats) expect(beat.caption).toMatch(/[.!?]$/);
      expect(posterTime(beatSpans(scene.beats))).toBeGreaterThan(0);
    }
  });
});

describe('world-models prose truth', () => {
  it('attaches each RoboCasa release to its own primary document', () => {
    const prose = readFileSync(join(folder, 'generative-sim.mdx'), 'utf8');
    expect(prose).toMatch(/120-scene, 100-task, and 2,500-plus-object figures above belong to the RSS 2024 RoboCasa release <Cite id="robocasa-2024" \/>\. RoboCasa365 reports a separate, larger set <Cite id="robocasa365-2026" \/>/);
    expect(prose).not.toMatch(/RoboCasa365 reports a separate, larger set <Cite id="robocasa-2024" \/>/);
  });

  it('preserves prior numeric and citation tokens in every article', () => {
    for (const file of articles) {
      const current = readFileSync(join(folder, file), 'utf8');
      const before = execFileSync('git', ['show', `68fd2b8:content/world-models/${file}`], {
        cwd: root, encoding: 'utf8',
      });
      const numbers = (text: string) => text
        .replace(/\b(?:Tables?|Tab\.|Figures?|Fig\.|Equation|Eq\.|Algorithm|Sections?)\s*\(?\s*(?:\d+(?:\.\d+)*[a-z]?|[IVXL]+)\b|\bAppendix\s+[A-Z]\d*(?:\.\d+)?\b|\bv\d+\b/g, '')
        .match(/(?<![\w-])\d(?:[\d,]*\d)?(?:\.\d+)?(?:%|x|Hz|ms|s|m|M|k)?/g)
        ?.sort() ?? [];
      const citations = (text: string) => [...text.matchAll(/<Cite id="([^"]+)"/g)].map((match) => match[1]);
      expect(numbers(current), `${file} numeric tokens`).toEqual(numbers(before));
      const prior = citations(before);
      if (file === 'generative-sim.mdx') {
        const preRepair = execFileSync('git', ['show', 'a6298625:content/world-models/generative-sim.mdx'], {
          cwd: root, encoding: 'utf8',
        });
        const target = preRepair.indexOf('RoboCasa365 reports a separate, larger set');
        expect(target).toBeGreaterThan(0);
        const insertion = citations(preRepair.slice(0, target)).length + 1;
        // The existing v1 citation moves within the sentence; the new 365
        // citation follows it. All other occurrences keep their order.
        const expected = [...prior];
        expected.splice(insertion, 0, 'robocasa365-2026');
        expect(citations(current), `${file} citations`).toEqual(expected);
      } else {
        expect(citations(current), `${file} citations`).toEqual(prior);
      }
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
