import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
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
const inventory = JSON.parse(readFileSync(join(root, 'docs/design/motion-classical-inventory.json'), 'utf8')) as Row[];

describe('classical teaching inventory', () => {
  it('accounts for every mounted figure and teaching interaction, including repeated mounts', () => {
    const articles = readdirSync(join(root, 'content/classical'))
      .filter((file) => file.endsWith('.mdx')).map((file) => file.slice(0, -4));
    // Teaching components supplied globally through mdx-components.tsx are
    // part of the population even though no article imports them.
    const globalTeachingTags = new Set(['SelfCheck', 'PredictThenReveal']);
    const mounts: string[] = [];
    for (const article of articles) {
      const body = readFileSync(join(root, 'content/classical', `${article}.mdx`), 'utf8');
      const imported = [...body.matchAll(
        /import\s*\{([^}]+)\}\s*from\s*'@\/components\/(?:interactive|motion\/scenes|motion\/clip|mdx)\//g,
      )].flatMap((match) => match[1].split(',').map((name) => name.trim()).filter(Boolean));
      const widgets = new Set([...imported, ...globalTeachingTags]);
      for (const tag of imported) {
        expect(body, `${article}:${tag} is imported but not mounted`).toContain(`<${tag}`);
      }
      for (const match of body.matchAll(/<([A-Z]\w+)\b[^>]*>/g)) {
        const tag = match[1];
        const id = match[0].match(/\bid="([^"]+)"/)?.[1];
        if (tag === 'Image' || tag === 'Clip') {
          expect(id, `${article} mounts ${tag} without a registered id`).toBeTruthy();
          mounts.push(`${article}:${tag}:${id}`);
          continue;
        }
        if (!widgets.has(tag)) continue;
        if (inventory.some((row) => row.article === article && row.element === tag && row.decision === 'add')) continue;
        mounts.push(`${article}:${tag}`);
      }
    }
    expect(inventory.filter((row) => row.decision !== 'add' && row.decision !== 'remove')
      .map((row) => `${row.article}:${row.element}`).sort()).toEqual(mounts.sort());
    const keys = inventory.map((row) => `${row.article}:${row.element}:${row.occurrence ?? 1}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const row of inventory) {
      expect(articles).toContain(row.article);
      expect(row.teachingGoal.length).toBeGreaterThan(25);
      expect(row.reason.length).toBeGreaterThan(25);
      if (row.decision === 'remove') expect(row.sceneId).toBeUndefined();
      if (row.decision === 'add') {
        expect(SCENE_TARGETS.filter((scene) => scene.route.startsWith('/classical/'))
          .map((scene) => scene.id)).toContain(row.sceneId);
        expect(readFileSync(join(root, 'content/classical', `${row.article}.mdx`), 'utf8'))
          .toContain(`<${row.element}`);
      }
    }
  });
});

describe('classical prose', () => {
  it('reports and enforces the structural-tell floor for all nine articles', () => {
    const articles = readdirSync(join(root, 'content/classical')).filter((file) => file.endsWith('.mdx'));
    expect(articles).toHaveLength(9);
    for (const article of articles) {
      const body = readFileSync(join(root, 'content/classical', article), 'utf8');
      const report = structuralTellReport(body, NO_SLOP_EXCEPTIONS);
      expect(report.measured, article).toBe(true);
      expect(report.tells, article).toBe(findStructuralTells(body, NO_SLOP_EXCEPTIONS).length);
      expect(report.density, article).toBeLessThanOrEqual(STRUCTURAL_TELL_LIMIT);
    }
  });
});
