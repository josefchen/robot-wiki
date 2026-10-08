import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { domainPassPredecessor, domainPassSuccessorPaths } from '../../lib/audit-domain-pass-continuity';
import {
  FIGURE_MOUNT_CONTINUITY_DIR, figureMountPredecessor, figureMountSuccessorPaths,
  keepsFigureMountObligations, loadFigureMountReview, verifyFigureMountSource, withoutFigureMounts,
} from '../../lib/audit-figure-mount-continuity';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(join(root, path));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /figure mount continuity drift/;
const blank = { bytes: 0, sha256: '' };

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('figure mounts 2026-10-07 article successors', () => {
  const review = loadFigureMountReview(root);

  it('reviews exactly the classical articles that gained their first figure', () => {
    expect(figureMountSuccessorPaths()).toEqual([
      'content/classical/calibration.mdx',
      'content/classical/ros2-for-ml-engineers.mdx',
    ]);
  });

  it('rebuilds every reviewed successor into its recorded predecessor', () => {
    expect(review.sources.map(({ after }) => after.path)).toEqual(figureMountSuccessorPaths());
    for (const source of review.sources) {
      const live = read(source.after.path);
      const prior = figureMountPredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      expect(withoutFigureMounts(live.toString())).toBe(prior.toString());
      expect(figureMountPredecessor(root, source.after, live)).toBe(live);
      // The rebuilt bytes are the domain-pass successor, which that layer still decides.
      expect(domainPassSuccessorPaths()).toContain(source.after.path);
      expect(domainPassPredecessor(root, { path: source.after.path, ...blank }, prior)).not.toEqual(prior);
      expect(domainPassPredecessor(root, { path: source.after.path, ...blank }, live)).toBe(live);
    }
  });

  it('passes other bytes through and rejects a successor whose edits no longer replay', () => {
    const [source] = review.sources;
    const drifted = Buffer.concat([read(source.after.path), Buffer.from('\n')]);
    expect(figureMountPredecessor(root, source.before, drifted)).toBe(drifted);
    expect(figureMountPredecessor(root, { path: 'content/classical/control.mdx', ...blank }, drifted)).toBe(drifted);
    expect(() => verifyFigureMountSource(source, drifted)).toThrow(drift);
    const replaced = { ...source, edits: [{ before: '---\n\n', after: '---\n\nimport { X } from \'x\';\n\n' }] };
    expect(() => verifyFigureMountSource(replaced, read(source.after.path))).toThrow(drift);
  });

  it('admits only the allowlisted import line and one-line mount', () => {
    const prior = [
      '---', 'title: "A"', 'citations:', '  - a-2020', '---', '',
      'Opening words.', '', 'A chain of links <Cite id="a-2020" />.', '', '## Next', '',
    ].join('\n');
    const mounted = prior
      .replace('---\n\nOpening', "---\n\nimport { CalibrationChain } from '@/components/interactive/calibration-chain';\n\nOpening")
      .replace('<Cite id="a-2020" />.\n', '<Cite id="a-2020" />.\n\n<CalibrationChain className="my-6" />\n');
    const path = 'content/x/y.mdx';
    expect(keepsFigureMountObligations(path, prior, mounted)).toBe(true);
    expect(keepsFigureMountObligations(path, prior, prior)).toBe(false);
    expect(keepsFigureMountObligations('components/x.tsx', prior, mounted)).toBe(false);
    // Prose, a citation or a frontmatter field changed beside the mount.
    expect(keepsFigureMountObligations(path, prior, mounted.replace('Opening words.', 'Opening.'))).toBe(false);
    expect(keepsFigureMountObligations(path, prior, mounted.replace('<Cite id="a-2020" />', ''))).toBe(false);
    expect(keepsFigureMountObligations(path, prior, mounted.replace('title: "A"', 'title: "B"'))).toBe(false);
    // A component outside the allowlist, or an allowlisted one with other attributes.
    expect(keepsFigureMountObligations(path, prior, mounted.replace('## Next', '<OtherFigure className="my-6" />\n\n## Next')))
      .toBe(false);
    expect(keepsFigureMountObligations(path, prior, mounted.replace('className="my-6"', 'className="my-8"'))).toBe(false);
    // The mount without its import, the import without its mount, or the mount twice.
    expect(keepsFigureMountObligations(path, prior, mounted.replace(/import [^\n]+\n\n/, ''))).toBe(false);
    expect(keepsFigureMountObligations(path, prior, mounted.replace('\n\n<CalibrationChain className="my-6" />', '')))
      .toBe(false);
    expect(keepsFigureMountObligations(path, prior,
      mounted.replace('## Next', '<CalibrationChain className="my-6" />\n\n## Next'))).toBe(false);
    // The mount must sit on its own line.
    expect(keepsFigureMountObligations(path, prior,
      mounted.replace('.\n\n<CalibrationChain className="my-6" />\n', '. <CalibrationChain className="my-6" />\n'))).toBe(false);
  });

  it('rejects a missing, corrupt or renamed review', () => {
    const [source] = review.sources;
    for (const mode of ['missing', 'corrupt', 'renamed'] as const) {
      const tmp = mkdtempSync(join(tmpdir(), 'figure-mount-continuity-test-'));
      scratchRoots.push(tmp);
      cpSync(join(root, FIGURE_MOUNT_CONTINUITY_DIR), join(tmp, FIGURE_MOUNT_CONTINUITY_DIR), { recursive: true });
      const path = join(tmp, FIGURE_MOUNT_CONTINUITY_DIR, 'source-transition.json');
      if (mode === 'missing') rmSync(path);
      else if (mode === 'corrupt') writeFileSync(path, mode);
      else writeFileSync(path, readFileSync(path, 'utf8').replace('"figure-mounts-20261007"', '"figure-mounts-drift"'));
      expect(() => loadFigureMountReview(tmp)).toThrow(drift);
      expect(() => figureMountPredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
    }
  });
});
