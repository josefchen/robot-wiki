import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  actionSensitivity,
  INITIAL_STATE,
  realismScore,
  rollout,
  SENSITIVITY_THRESHOLD,
} from '@/lib/action-conditioning';
import { deviationAt, TYPICAL_HORIZON } from '@/lib/latent-imagination';
import { applyPush, DEFAULT_FORCE_N, INITIAL_LAYERS, INITIAL_MUG } from '@/lib/appearance-physics-push';
import { SCENE_TARGETS } from '@/lib/motion-scene-registry';
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
    const covered = inventory.filter((row) => row.decision !== 'add' && row.decision !== 'remove')
      .map((row) => `${row.article}:${row.element}:${row.occurrence ?? 1}`);
    expect(covered.sort()).toEqual(mounts.sort());
    expect(new Set(inventory.map((row) => `${row.article}:${row.element}:${row.occurrence ?? 1}`)).size)
      .toBe(inventory.length);
    for (const row of inventory) {
      expect(articles).toContain(`${row.article}.mdx`);
      expect(row.teachingGoal.length).toBeGreaterThan(25);
      expect(row.reason.length).toBeGreaterThan(25);
      const body = readFileSync(join(folder, `${row.article}.mdx`), 'utf8');
      if (row.decision === 'add') {
        expect(row.sceneId).toBeTruthy();
        expect(body).toContain(`<${row.element}`);
      }
      if (row.decision === 'remove') {
        expect(row.sceneId).toBeUndefined();
        expect(body).not.toMatch(new RegExp(`<${row.element}\\b`));
      }
    }
  });
});

describe('world-models merged figures', () => {
  const merged = [
    ['latent-dynamics', 'LatentImagination', 'LatentDrift'],
    ['generative-video', 'ActionConditioning', 'ActionFork'],
    ['generative-sim', 'AppearancePhysicsPush', 'PushLayers'],
  ] as const;

  it('mounts one figure per concept, with the lab in place of its scene', () => {
    for (const [article, lab, scene] of merged) {
      const body = readFileSync(join(folder, `${article}.mdx`), 'utf8');
      expect(body.match(new RegExp(`<${lab}\\b`, 'g')), article).toHaveLength(1);
      expect(body, article).not.toContain(`<${scene}`);
      expect(inventory.find((row) => row.article === article && row.element === scene)?.decision)
        .toBe('remove');
    }
    expect(SCENE_TARGETS.filter((target) => target.route.startsWith('/world-models/'))).toEqual([]);
  });

  it('reaches every former beat state from the lab models', () => {
    // Action fork: one shared frame, a strong fork, a weak collapse, fixed realism.
    const strongA = rollout({ action: 'push-left', conditioning: 'strong' });
    const weakB = rollout({ action: 'lift', conditioning: 'weak' });
    expect(strongA[0]).toEqual(INITIAL_STATE);
    expect(weakB[0]).toEqual(INITIAL_STATE);
    const strong = actionSensitivity({ actionA: 'push-left', actionB: 'lift', conditioning: 'strong' });
    const weak = actionSensitivity({ actionA: 'push-left', actionB: 'lift', conditioning: 'weak' });
    expect(strong).toBeGreaterThan(SENSITIVITY_THRESHOLD);
    expect(weak).toBeLessThan(SENSITIVITY_THRESHOLD);
    expect(realismScore('strong')).toBe(realismScore('weak'));
    // Latent drift: the deviation keeps growing across the typical band.
    expect(deviationAt({ epsilon: 0.02, horizon: TYPICAL_HORIZON[1] }))
      .toBeGreaterThan(deviationAt({ epsilon: 0.02, horizon: TYPICAL_HORIZON[0] }));
    // Push layers: the appearance-only push is unanswered; the proxy answers it.
    expect(applyPush(INITIAL_MUG, INITIAL_LAYERS, DEFAULT_FORCE_N).state.position).toBe(0);
    expect(applyPush(INITIAL_MUG, { ...INITIAL_LAYERS, physics: true }, DEFAULT_FORCE_N).state.position)
      .toBeGreaterThan(0);
  });
});

describe('world-models prose truth', () => {
  it('attaches each RoboCasa release to its own primary document', () => {
    const prose = readFileSync(join(folder, 'generative-sim.mdx'), 'utf8');
    expect(prose).toMatch(/120-scene, 100-task, and 2,500-plus-object figures above belong to the RSS 2024 RoboCasa release <Cite id="robocasa-2024" \/>\. RoboCasa365 reports a separate, larger set <Cite id="robocasa365-2026" \/>/);
    expect(prose).not.toMatch(/RoboCasa365 reports a separate, larger set <Cite id="robocasa-2024" \/>/);
  });

  it('preserves prior numeric and citation tokens in every article', () => {
    // The shortened taxonomy search description names the V-JEPA 2 model; its
    // version number is the one token it adds, and only this exact text may add it.
    const approvedDescriptions: Record<string, { description: string; tokens: string[] }> = {
      'taxonomy.mdx': {
        description: "A world model predicts how an environment evolves in a form useful for a robot's decisions. Six example groups compared, from DreamerV3 to V-JEPA 2.",
        tokens: ['2'],
      },
    };
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
      const descriptionLine = (text: string) => text.match(/^description: "(.*)"$/m)?.[1];
      const approved = approvedDescriptions[file];
      if (approved) {
        expect(descriptionLine(current), `${file} description`).toBe(approved.description);
        expect(numbers(approved.description), `${file} description tokens`).toEqual(approved.tokens);
        expect(numbers(descriptionLine(before) ?? ''), `${file} prior description tokens`).toEqual([]);
      }
      expect(numbers(current), `${file} numeric tokens`)
        .toEqual([...numbers(before), ...(approved?.tokens ?? [])].sort());
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
