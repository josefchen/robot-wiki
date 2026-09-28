import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import { DEFAULT_ANGLES_DEG, LINK_LENGTHS, planarForwardKinematics } from '@/lib/planar-fk';
import { RRT_SCENE, buildRrt, edgesUpTo, pathIfReached } from '@/lib/rrt';
import { NO_SLOP_EXCEPTIONS } from '@/data/no-slop-exceptions';
import { findStructuralTells, structuralTellReport, STRUCTURAL_TELL_LIMIT } from '@/lib/no-slop';
import { FK_CHAIN_SCENE, fkChainFrame } from '@/components/motion/scenes/fk-chain';
import { RRT_GROWTH_SCENE, rrtGrowthFrame } from '@/components/motion/scenes/rrt-growth';

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
    expect(inventory.filter((row) => row.decision !== 'add')
      .map((row) => `${row.article}:${row.element}`).sort()).toEqual(mounts.sort());
    const keys = inventory.map((row) => `${row.article}:${row.element}:${row.occurrence ?? 1}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const row of inventory) {
      expect(articles).toContain(row.article);
      expect(row.teachingGoal.length).toBeGreaterThan(25);
      expect(row.reason.length).toBeGreaterThan(25);
      if (row.decision === 'add') {
        expect(['fk-chain', 'rrt-growth']).toContain(row.sceneId);
        expect(readFileSync(join(root, 'content/classical', `${row.article}.mdx`), 'utf8'))
          .toContain(`<${row.element}`);
      }
    }
  });
});

describe('classical scene models', () => {
  it('composes the existing three-link chain in order without changing its default pose', () => {
    const spans = beatSpans(FK_CHAIN_SCENE.beats);
    const expected = planarForwardKinematics(LINK_LENGTHS, DEFAULT_ANGLES_DEG);
    const first = fkChainFrame(spans[0].end);
    const second = fkChainFrame(spans[1].end);
    const final = fkChainFrame(posterTime(spans));
    expect(first.points[1]).toEqual(expected.pivots[1]);
    expect(second.points[2]).toEqual(expected.pivots[2]);
    expect(final.points[3]).toEqual(expected.effector);
    expect(fkChainFrame(posterTime(spans))).toEqual(final);
    expect(FK_CHAIN_SCENE.beats).toHaveLength(4);
  });

  it('reveals a seeded accepted-extension tree and only shows the path after connection', () => {
    const result = buildRrt(RRT_SCENE);
    const spans = beatSpans(RRT_GROWTH_SCENE.beats);
    const before = rrtGrowthFrame(spans[0].end);
    const after = rrtGrowthFrame(posterTime(spans));
    expect(before.iteration).toBeLessThan(result.goalNodeId!);
    expect(before.path).toEqual([]);
    expect(after.iteration).toBe(result.goalNodeId);
    expect(after.path).toEqual(pathIfReached(result, result.goalNodeId!));
    expect(rrtGrowthFrame(posterTime(spans))).toEqual(after);
    expect(RRT_GROWTH_SCENE.beats).toHaveLength(4);
    expect(RRT_GROWTH_SCENE.beats[1].linear).toBe(true);
  });

  it('reports connection only when the actual accepted tree reaches the goal', () => {
    const result = buildRrt(RRT_SCENE);
    const goal = result.goalNodeId!;
    const spans = beatSpans(RRT_GROWTH_SCENE.beats);
    const middle = rrtGrowthFrame(spans[2].start + spans[2].duration / 2);
    expect(goal).toBe(288);
    expect(middle.iteration).toBeLessThan(goal);
    expect(middle.edges.length).toBeLessThan(result.nodes.length - 1);
    expect(middle.goalReached).toBe(false);
    expect(middle.path).toEqual([]);
    const reached = rrtGrowthFrame(spans[2].end);
    expect(reached.iteration).toBe(goal);
    expect(reached.goalReached).toBe(true);
    expect(reached.edges).toEqual(edgesUpTo(result, goal));
    expect(reached.path).toEqual([]);
    expect(rrtGrowthFrame(spans[3].end).path).toEqual(pathIfReached(result, goal));
  });

  it('keeps every beat caption a sentence', () => {
    for (const scene of [FK_CHAIN_SCENE, RRT_GROWTH_SCENE]) {
      expect(scene.beats.map((beat) => beat.caption)).toEqual(
        scene.beats.map(() => expect.stringMatching(/[.!?]$/)),
      );
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
