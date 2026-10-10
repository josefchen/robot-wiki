import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { figureMountPredecessor, figureMountSuccessorPaths } from '../../lib/audit-figure-mount-continuity';
import {
  WORD_BUDGET_TRIM_CONTINUITY_DIR, keepsWordBudgetTrimObligations, loadWordBudgetTrimReview,
  verifyWordBudgetTrimSource, wordBudgetTrimPredecessor, wordBudgetTrimSuccessorPaths,
} from '../../lib/audit-word-budget-trim-continuity';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(join(root, path));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /word budget trim continuity drift/;
const blank = { bytes: 0, sha256: '' };

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('word-budget trim 2026-10-10 article successors', () => {
  const review = loadWordBudgetTrimReview(root);

  it('reviews exactly the two classical articles the new figures took past their budgets', () => {
    expect(wordBudgetTrimSuccessorPaths()).toEqual([
      'content/classical/calibration.mdx',
      'content/classical/ros2-for-ml-engineers.mdx',
    ]);
  });

  it('rebuilds every reviewed successor into its recorded predecessor', () => {
    expect(review.sources.map(({ after }) => after.path)).toEqual(wordBudgetTrimSuccessorPaths());
    for (const source of review.sources) {
      const live = read(source.after.path);
      const prior = wordBudgetTrimPredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      expect(wordBudgetTrimPredecessor(root, source.after, live)).toBe(live);
      // The rebuilt bytes are the figure-mount successor, which that layer still decides.
      expect(figureMountSuccessorPaths()).toContain(source.after.path);
      expect(figureMountPredecessor(root, { path: source.after.path, ...blank }, prior)).not.toEqual(prior);
      expect(figureMountPredecessor(root, { path: source.after.path, ...blank }, live)).toBe(live);
    }
  });

  it('passes other bytes through and rejects a successor whose edits no longer replay', () => {
    const [source] = review.sources;
    const drifted = Buffer.concat([read(source.after.path), Buffer.from('\n')]);
    expect(wordBudgetTrimPredecessor(root, source.before, drifted)).toBe(drifted);
    expect(wordBudgetTrimPredecessor(root, { path: 'content/classical/control.mdx', ...blank }, drifted)).toBe(drifted);
    expect(() => verifyWordBudgetTrimSource(source, drifted)).toThrow(drift);
  });

  it('admits only shorter prose with every id, mount, heading, link and number kept in order', () => {
    const prior = [
      '---', 'title: "A"', 'citations:', '  - a-2020', '---', '',
      "import { CalibrationChain } from '@/components/interactive/calibration-chain';", '',
      'Opening words that say very little. A chain of 12 links <Cite id="a-2020" /> in the [guide](/x/z).', '',
      '<CalibrationChain className="my-6" />', '', '## Next', '', 'A <Term id="t">term</Term> here.', '',
    ].join('\n');
    const trimmed = prior.replace('Opening words that say very little. ', '');
    const path = 'content/x/y.mdx';
    expect(keepsWordBudgetTrimObligations(path, prior, trimmed)).toBe(true);
    expect(keepsWordBudgetTrimObligations(path, prior, prior)).toBe(false);
    expect(keepsWordBudgetTrimObligations('components/x.tsx', prior, trimmed)).toBe(false);
    // Longer prose, a dropped number, citation, glossary id or link, or a moved heading.
    expect(keepsWordBudgetTrimObligations(path, prior, prior.replace('Opening', 'Opening and more'))).toBe(false);
    expect(keepsWordBudgetTrimObligations(path, prior, trimmed.replace('of 12 links', 'of links'))).toBe(false);
    expect(keepsWordBudgetTrimObligations(path, prior, trimmed.replace(' <Cite id="a-2020" />', ''))).toBe(false);
    expect(keepsWordBudgetTrimObligations(path, prior, trimmed.replace('<Term id="t">term</Term>', 'term'))).toBe(false);
    expect(keepsWordBudgetTrimObligations(path, prior, trimmed.replace('[guide](/x/z)', 'guide'))).toBe(false);
    expect(keepsWordBudgetTrimObligations(path, prior, trimmed.replace('## Next', '## Later'))).toBe(false);
    // The frontmatter, an import or a mount changed beside the trim.
    expect(keepsWordBudgetTrimObligations(path, prior, trimmed.replace('title: "A"', 'title: "B"'))).toBe(false);
    expect(keepsWordBudgetTrimObligations(path, prior, trimmed.replace(/import [^\n]+\n\n/, ''))).toBe(false);
    expect(keepsWordBudgetTrimObligations(path, prior, trimmed.replace('className="my-6"', 'className="my-8"'))).toBe(false);
  });

  it('rejects a missing, corrupt or renamed review', () => {
    const [source] = review.sources;
    for (const mode of ['missing', 'corrupt', 'renamed'] as const) {
      const tmp = mkdtempSync(join(tmpdir(), 'word-budget-trim-continuity-test-'));
      scratchRoots.push(tmp);
      cpSync(join(root, WORD_BUDGET_TRIM_CONTINUITY_DIR), join(tmp, WORD_BUDGET_TRIM_CONTINUITY_DIR), { recursive: true });
      const path = join(tmp, WORD_BUDGET_TRIM_CONTINUITY_DIR, 'source-transition.json');
      if (mode === 'missing') rmSync(path);
      else if (mode === 'corrupt') writeFileSync(path, mode);
      else writeFileSync(path, readFileSync(path, 'utf8').replace('"word-budget-trim-20261010"', '"word-budget-trim-drift"'));
      expect(() => loadWordBudgetTrimReview(tmp)).toThrow(drift);
      expect(() => wordBudgetTrimPredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
    }
  });
});
