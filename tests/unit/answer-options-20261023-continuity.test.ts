import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ANSWER_OPTIONS_CONTINUITY_DIR, answerOptionsFrame, answerOptionsPredecessor, answerOptionsSuccessorPaths,
  keepsAnswerOptionsObligations, loadAnswerOptionsReview, verifyAnswerOptionsSource,
} from '../../lib/audit-answer-options-continuity';
import { createLocalArtifactReader } from '../../lib/audit-local-basis';
import { sceneCraftPredecessor } from '../../lib/audit-scene-craft-continuity';
import { seoPassPredecessor } from '../../lib/audit-seo-pass-continuity';
import { preAnswerOptions, preSceneCraft, preSeoPass } from '../helpers/seo-pass';

const root = resolve(import.meta.dirname, '../..');
// No newer layer precedes this one, so the live article is itself the successor.
const read = (path: string) => readFileSync(join(root, path));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /answer-options continuity drift/;
const blank = { bytes: 0, sha256: '' };
const ARTICLES = [
  'content/classical/calibration.mdx',
  'content/data-hardware/robot-learning-stack.mdx',
  'content/world-models/evaluation.mdx',
  'content/world-models/model-based-robot-learning.mdx',
  'content/world-models/world-models-vs-simulators.mdx',
];

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('answer options 2026-10-23 article successors', () => {
  const review = loadAnswerOptionsReview(root);

  it('reviews exactly the articles whose self-check options the rebalance changed', () => {
    expect([...answerOptionsSuccessorPaths()].sort()).toEqual(ARTICLES);
    expect(review.sources.map(({ after }) => after.path).sort()).toEqual(ARTICLES);
  });

  it('rebuilds every reviewed successor into the committed bytes the older layers and proofs still decide', () => {
    for (const source of review.sources) {
      const path = source.after.path;
      const live = read(path);
      const prior = answerOptionsPredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      // The rebuilt bytes are the article as committed before the rebalance.
      expect(prior).toEqual(execFileSync('git', ['show', `${source.archivedFrom}:${path}`], { cwd: root }));
      expect(answerOptionsPredecessor(root, source.after, live)).toBe(live);
      expect(keepsAnswerOptionsObligations(path, prior.toString(), live.toString())).toBe(true);
      // The artifact readers see this layer first, and every older layer
      // receives the rebuilt bytes instead of the live article.
      expect(preAnswerOptions(path)).toEqual(prior);
      expect(preSceneCraft(path)).toEqual(sceneCraftPredecessor(root, { path, ...blank }, prior));
      expect(seoPassPredecessor(root, source.before, live)).toEqual(prior);
      expect(preSeoPass(path)).not.toEqual(live);
    }
  });

  it('hands the local artifact reader the article bytes older proofs pinned', () => {
    for (const source of review.sources) {
      expect(createLocalArtifactReader(root)(source.before))
        .toEqual(answerOptionsPredecessor(root, source.before, read(source.after.path)));
      expect(() => createLocalArtifactReader(root)({ ...source.before, sha256: '0'.repeat(64) }))
        .toThrow(`artifact bytes/hash: ${source.after.path}`);
    }
  });

  it('passes other bytes through and rejects a successor whose edits no longer replay', () => {
    const source = review.sources.find(({ after }) => after.path === 'content/classical/calibration.mdx')!;
    const drifted = Buffer.concat([read(source.after.path), Buffer.from('\n')]);
    expect(answerOptionsPredecessor(root, source.before, drifted)).toBe(drifted);
    expect(answerOptionsPredecessor(root, { path: 'content/classical/control.mdx', ...blank }, drifted))
      .toBe(drifted);
    expect(() => verifyAnswerOptionsSource(source, drifted)).toThrow(drift);
    const replaced = { ...source, edits: [{ before: 'Collect more demonstrations', after: 'Fine-tune a larger' }] };
    expect(() => verifyAnswerOptionsSource(replaced, read(source.after.path))).toThrow(drift);
    // A recorded predecessor that the reversed edits do not rebuild.
    const misPinned = { ...source, before: { ...source.before, sha256: '0'.repeat(64) } };
    expect(() => verifyAnswerOptionsSource(misPinned, read(source.after.path))).toThrow(drift);
  });

  it('admits only a changed article that moves self-check prompt and label text and nothing else', () => {
    const prior = [
      '---', 'title: Demo', '---', '', 'Prose with 3 numbers, a <Cite id="demo-2024" /> and a [link](/x/).', '',
      '<SelfCheck',
      '  prompt="A grasp misses by a small offset. What do you check?"',
      '  options={[',
      '    {', "      value: 'right',", "      label: 'Check the hand-eye rotation',",
      "      why: 'A rotation error grows with distance.'", '    },',
      '    {', "      value: 'wrong',", "      label: 'Collect more data',",
      "      why: 'Data does not fix geometry.'", '    }',
      '  ]}', '  answer="right"', '/>', '',
    ].join('\n');
    const path = 'content/classical/demo.mdx';
    expect(answerOptionsFrame(prior).slots).toBe(3);
    const changed = prior
      .replace("label: 'Collect more data'", "label: 'Collect more demonstrations at longer distances'")
      .replace('A grasp misses by a small offset.', 'On many objects, a grasp misses by a small offset.');
    expect(keepsAnswerOptionsObligations(path, prior, changed)).toBe(true);
    expect(keepsAnswerOptionsObligations(path, prior, prior)).toBe(false);
    // Only content articles.
    for (const other of ['components/interactive/demo.tsx', 'content/demo.mdx', 'content/x/Demo.mdx']) {
      expect(keepsAnswerOptionsObligations(other, prior, changed), other).toBe(false);
    }
    // An article with no self-check has nothing a rebalance may change.
    const plain = prior.slice(0, prior.indexOf('<SelfCheck'));
    expect(keepsAnswerOptionsObligations(path, plain, `${plain}More prose.\n`)).toBe(false);
    // Prose, a value, an explanation, the answer, the option order or the
    // option count moved, or a number, citation, link or glossary term
    // added inside a label or prompt.
    const label = "      label: 'Collect more demonstrations at longer distances',\n";
    const right = changed.slice(changed.indexOf('    {\n'), changed.indexOf('    {\n', changed.indexOf('    },')));
    const wrong = changed.slice(changed.indexOf('    {\n', changed.indexOf('    },')), changed.indexOf('  ]}'));
    const swapped = `${wrong.replace(/\n$/, ',\n')}${right.replace(/,\n$/, '\n')}`;
    for (const [from, to] of [
      ['Prose with 3 numbers', 'Prose with three numbers'],
      ["value: 'wrong'", "value: 'more-data'"],
      ["why: 'Data does not fix geometry.'", "why: 'Data cannot fix geometry.'"],
      ['answer="right"', 'answer="wrong"'],
      [`${right}${wrong}`, swapped],
      [`${wrong}`, ''],
      [label, "      label: 'Collect 3x more demonstrations at longer distances',\n"],
      [label, "      label: 'Collect more demonstrations <Cite id=\"demo-2024\" />',\n"],
      [label, "      label: 'Collect more [demonstrations](/y/)',\n"],
      [label, "      label: 'Collect more <Term id=\"demonstration\">demonstrations</Term>',\n"],
      ['  prompt="On many objects, a grasp misses by a small offset. What do you check?"\n', ''],
    ] as const) {
      const mutated = changed.replace(from, to);
      expect(mutated, from).not.toBe(changed);
      expect(keepsAnswerOptionsObligations(path, prior, mutated), `${from} -> ${to}`).toBe(false);
    }
  });

  it('rejects a missing, corrupt or renamed review', () => {
    const [source] = review.sources;
    for (const mode of ['missing', 'corrupt', 'renamed'] as const) {
      const tmp = mkdtempSync(join(tmpdir(), 'answer-options-continuity-test-'));
      scratchRoots.push(tmp);
      cpSync(join(root, ANSWER_OPTIONS_CONTINUITY_DIR), join(tmp, ANSWER_OPTIONS_CONTINUITY_DIR), { recursive: true });
      const path = join(tmp, ANSWER_OPTIONS_CONTINUITY_DIR, 'source-transition.json');
      if (mode === 'missing') rmSync(path);
      else if (mode === 'corrupt') writeFileSync(path, mode);
      else writeFileSync(path, readFileSync(path, 'utf8').replace('"answer-options-20261023"', '"answer-options-drift"'));
      expect(() => loadAnswerOptionsReview(tmp)).toThrow(drift);
      expect(() => answerOptionsPredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
    }
  });
});
