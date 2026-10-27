import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { convergenceProsePredecessor } from '../../lib/audit-convergence-prose-continuity';
import {
  OWED_FIGURES_CONTINUITY_DIR, keepsOwedFiguresObligations, loadOwedFiguresReview, owedFiguresPredecessor,
  owedFiguresSuccessorPaths, verifyOwedFiguresSource,
} from '../../lib/audit-owed-figures-continuity';
import { createLocalArtifactReader } from '../../lib/audit-local-basis';
import { seoPassPredecessor } from '../../lib/audit-seo-pass-continuity';
import { preConvergenceProse, preOwedFigures } from '../helpers/seo-pass';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(join(root, path));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /owed-figures continuity drift/;
const blank = { bytes: 0, sha256: '' };
const ARTICLES = [
  'content/data-hardware/datasets.mdx', 'content/data-hardware/hardware-taxonomy.mdx',
  'content/data-hardware/industrial-deployment.mdx', 'content/data-hardware/robot-learning-stack.mdx',
  'content/data-hardware/teleop-rigs.mdx',
];
const MOUNTS: Record<string, string[]> = {
  'content/data-hardware/datasets.mdx': ['DatasetRunsHours'],
  'content/data-hardware/hardware-taxonomy.mdx': ['HardwarePriceLadder'],
  'content/data-hardware/teleop-rigs.mdx': ['UmiCollectionRates'],
};
const blocks = (text: string) => [...text.replace(/^---\n[\s\S]*?\n---\n/, '').matchAll(/^<([A-Z][A-Za-z0-9.]*)/gm)]
  .map((match) => match[1]);

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('owed figures 2026-10-26 article successors', () => {
  const review = loadOwedFiguresReview(root);

  it('reviews exactly the five data-hardware articles the figures slice edits', () => {
    expect([...owedFiguresSuccessorPaths()].sort()).toEqual(ARTICLES);
    expect(review.sources.map(({ after }) => after.path).sort()).toEqual(ARTICLES);
  });

  it('adds one figure each to three articles and drops none', () => {
    for (const source of review.sources) {
      const path = source.after.path;
      const prior = owedFiguresPredecessor(root, source.before, read(path)).toString();
      const extra = [...blocks(read(path).toString())];
      for (const name of blocks(prior)) extra.splice(extra.indexOf(name), 1);
      expect(extra, path).toEqual(MOUNTS[path] ?? []);
    }
  });

  it('replaces no body citation and removes one front-matter citation with its reason', () => {
    expect(review.sources.flatMap(({ replacedCitations }) => replacedCitations ?? [])).toEqual([]);
    const removed = review.sources.flatMap(({ after, removedFrontMatterCitations }) =>
      (removedFrontMatterCitations ?? []).map(({ id }) => [after.path, id]));
    expect(removed).toEqual([['content/data-hardware/hardware-taxonomy.mdx', 'robozaps-humanoids-2026']]);
  });

  it('rebuilds every reviewed successor into the committed bytes the older layers and proofs still decide', () => {
    for (const source of review.sources) {
      const path = source.after.path;
      const live = read(path);
      const prior = owedFiguresPredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      expect(prior).toEqual(execFileSync('git', ['show', `${source.archivedFrom}:${path}`], { cwd: root }));
      expect(owedFiguresPredecessor(root, source.after, live)).toBe(live);
      expect(keepsOwedFiguresObligations(path, prior.toString(), live.toString(), source)).toBe(true);
      // The artifact readers see this layer first, and every older layer receives the rebuilt bytes.
      expect(preOwedFigures(path)).toEqual(prior);
      expect(preConvergenceProse(path)).toEqual(convergenceProsePredecessor(root, { path, ...blank }, prior));
      expect(seoPassPredecessor(root, source.before, live)).toEqual(prior);
      expect(createLocalArtifactReader(root)(source.before)).toEqual(prior);
    }
  });

  it('passes other bytes through and rejects a successor whose edits no longer replay', () => {
    const source = review.sources.find(({ after }) => after.path === 'content/data-hardware/hardware-taxonomy.mdx')!;
    const live = read(source.after.path);
    const drifted = Buffer.concat([live, Buffer.from('\n')]);
    expect(owedFiguresPredecessor(root, source.before, drifted)).toBe(drifted);
    expect(owedFiguresPredecessor(root, { path: 'content/data-hardware/data-bottleneck.mdx', ...blank }, drifted)).toBe(drifted);
    expect(() => verifyOwedFiguresSource(source, drifted)).toThrow(drift);
    const replaced = { ...source, edits: [{ before: 'humanoid', after: 'android' }] };
    expect(() => verifyOwedFiguresSource(replaced, live)).toThrow(drift);
    const misPinned = { ...source, before: { ...source.before, sha256: '0'.repeat(64) } };
    expect(() => verifyOwedFiguresSource(misPinned, live)).toThrow(drift);
    const unnamed = { ...source, removedFrontMatterCitations: [] };
    expect(() => verifyOwedFiguresSource(unnamed, live)).toThrow(drift);
  });

  it('admits an added figure, sentence and citation and rejects drops, moves and unnamed removals', () => {
    const path = 'content/data-hardware/demo.mdx';
    const prior = [
      '---', 'title: Demo', 'citations:', '  - old-2024', '  - guide-2026', 'seeAlso:', '  - "x/y"', '---', '',
      "import { Chart } from '@/components/interactive/chart';", '',
      'A fleet logged 1,000 hours <Cite id="old-2024" />.', '', '<Chart />', '', '<Stat value="4" />', '',
    ].join('\n');
    const edited = prior
      .replace("import { Chart } from '@/components/interactive/chart';",
        "import { Chart } from '@/components/interactive/chart';\n\nimport { Ladder } from '@/components/interactive/ladder';")
      .replace('<Stat value="4" />', '<Ladder className="my-6" />\n\n<Stat value="4" />\n\nA new hand <Cite id="new-2026" />.')
      .replace('  - guide-2026\n', '  - guide-2026\n  - new-2026\n');
    expect(keepsOwedFiguresObligations(path, prior, edited)).toBe(true);
    expect(keepsOwedFiguresObligations(path, prior, prior)).toBe(false);
    expect(keepsOwedFiguresObligations('components/interactive/chart.tsx', prior, edited)).toBe(false);
    const removedFront = edited.replace('  - guide-2026\n', '');
    expect(keepsOwedFiguresObligations(path, prior, removedFront), 'an unnamed front-matter removal').toBe(false);
    const reason = 'No sentence, figure or guide row cites this source any more, so the list drops it.';
    expect(keepsOwedFiguresObligations(path, prior, removedFront,
      { removedFrontMatterCitations: [{ id: 'guide-2026', reason }] })).toBe(true);
    expect(keepsOwedFiguresObligations(path, prior, removedFront,
      { removedFrontMatterCitations: [{ id: 'guide-2026', reason: 'too short' }] }), 'a removal without its reason').toBe(false);
    expect(keepsOwedFiguresObligations(path, prior, removedFront,
      { removedFrontMatterCitations: [{ id: 'guide-2026', reason }, { id: 'gone-2020', reason }] }),
    'a removal the predecessor never listed').toBe(false);
    expect(keepsOwedFiguresObligations(path, prior, edited.replace('  - old-2024\n', ''),
      { removedFrontMatterCitations: [{ id: 'old-2024', reason }] }), 'a removed source the body still cites').toBe(false);
    const moved = edited.replace('<Cite id="old-2024" />', '<Cite id="new-2026" />');
    expect(keepsOwedFiguresObligations(path, prior, moved), 'an unreplaced dropped source').toBe(false);
    const because = 'The dated release states the same hours with a date, so it replaces the undated page.';
    expect(keepsOwedFiguresObligations(path, prior, moved,
      { replacedCitations: [{ from: 'old-2024', to: 'new-2026', reason: because }] })).toBe(true);
    for (const [from, to] of [
      ["import { Ladder } from '@/components/interactive/ladder';", "import { Ladder } from '@/components/mdx/ladder';"],
      ['<Ladder className="my-6" />\n\n', ''],
      ['<Chart />\n', ''],
      ['<Chart />\n\n<Ladder className="my-6" />\n\n<Stat value="4" />', '<Stat value="4" />\n\n<Ladder className="my-6" />\n\n<Chart />'],
      ['<Ladder className="my-6" />', '<Ladder className="my-6" />\n\n<Ladder />'],
      ['<Ladder className="my-6" />', '<Ladder className="my-6" />\n\n<Note />'],
      ['title: Demo', 'title: Demo two'],
    ] as const) {
      const mutated = edited.replace(from, to);
      expect(mutated, from).not.toBe(edited);
      expect(keepsOwedFiguresObligations(path, prior, mutated), `${from} -> ${to}`).toBe(false);
    }
  });

  it('rejects a missing, corrupt or renamed review', () => {
    const [source] = review.sources;
    for (const mode of ['missing', 'corrupt', 'renamed'] as const) {
      const tmp = mkdtempSync(join(tmpdir(), 'owed-figures-continuity-test-'));
      scratchRoots.push(tmp);
      cpSync(join(root, OWED_FIGURES_CONTINUITY_DIR), join(tmp, OWED_FIGURES_CONTINUITY_DIR), { recursive: true });
      const file = join(tmp, OWED_FIGURES_CONTINUITY_DIR, 'source-transition.json');
      if (mode === 'missing') rmSync(file);
      else if (mode === 'corrupt') writeFileSync(file, mode);
      else writeFileSync(file, readFileSync(file, 'utf8').replace('"owed-figures-20261026"', '"owed-figures-drift"'));
      expect(() => loadOwedFiguresReview(tmp)).toThrow(drift);
      expect(() => owedFiguresPredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
    }
  });
});
