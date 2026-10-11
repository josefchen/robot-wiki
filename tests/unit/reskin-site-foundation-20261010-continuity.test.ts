import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  RESKIN_SITE_FOUNDATION_DIR, isReskinPresentationPath, loadReskinReview, reskinPredecessor,
  reskinSuccessorPaths, verifyReskinSource,
} from '../../lib/audit-reskin-site-foundation-continuity';
import { seoPassPredecessor } from '../../lib/audit-seo-pass-continuity';
import { preReskin } from '../helpers/seo-pass';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(join(root, path));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /reskin site-foundation continuity drift/;
const blank = { bytes: 0, sha256: '' };

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('site-foundation re-skin 2026-10-10 presentation successors', () => {
  const review = loadReskinReview(root);

  it('reviews presentation sources only, and the two the older reviews pin', () => {
    expect(review.sources.map(({ after }) => after.path)).toEqual(reskinSuccessorPaths());
    expect(reskinSuccessorPaths().length).toBeGreaterThan(0);
    for (const path of reskinSuccessorPaths()) expect(isReskinPresentationPath(path), path).toBe(true);
    expect(reskinSuccessorPaths()).toEqual(expect.arrayContaining([
      'app/globals.css', 'components/article/commit-to-reveal.tsx', 'components/ui/cite.tsx',
    ]));
    for (const path of ['content/classical/calibration.mdx', 'data/citations.ts', 'tests/unit/x.test.ts',
      'contract/brand-v2-registries.json', 'lib/audit-local-basis.ts', 'components/interactive/calibration-chain.tsx',
      'components/motion/stage.css']) {
      expect(isReskinPresentationPath(path), path).toBe(false);
    }
  });

  it('rebuilds every reviewed successor into its recorded predecessor', () => {
    for (const source of review.sources) {
      const live = read(source.after.path);
      const prior = reskinPredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      expect(preReskin(source.after.path)).toEqual(prior);
      // A reference that names the live bytes gets the live bytes.
      expect(reskinPredecessor(root, source.after, live)).toBe(live);
    }
  });

  it('sits innermost in the artifact reader chain', () => {
    const path = 'components/ui/cite.tsx';
    const source = review.sources.find(({ after }) => after.path === path)!;
    const live = read(path);
    // The older layers decide the rebuilt bytes, exactly as they decided
    // them before the re-skin.
    expect(seoPassPredecessor(root, source.before, live))
      .toEqual(seoPassPredecessor(root, source.before, reskinPredecessor(root, source.before, live)));
  });

  it('passes other bytes through and rejects a successor whose edits no longer replay', () => {
    const [source] = review.sources;
    const drifted = Buffer.concat([read(source.after.path), Buffer.from('\n')]);
    expect(reskinPredecessor(root, source.before, drifted)).toBe(drifted);
    const other = read('content/classical/calibration.mdx');
    expect(reskinPredecessor(root, { path: 'content/classical/calibration.mdx', ...blank }, other)).toBe(other);
    expect(() => verifyReskinSource(source, drifted)).toThrow(drift);
    const replaced = { ...source, edits: [{ before: 'a never-present line\n', after: 'another\n' }] };
    expect(() => verifyReskinSource(replaced, read(source.after.path))).toThrow(drift);
    const content = { ...source, before: { ...source.before, path: 'content/x.mdx' },
      after: { ...source.after, path: 'content/x.mdx' } };
    expect(() => verifyReskinSource(content, read(source.after.path))).toThrow(drift);
  });

  it('rejects a missing, corrupt or renamed review', () => {
    const [source] = review.sources;
    for (const mode of ['missing', 'corrupt', 'renamed'] as const) {
      const tmp = mkdtempSync(join(tmpdir(), 'reskin-continuity-test-'));
      scratchRoots.push(tmp);
      cpSync(join(root, RESKIN_SITE_FOUNDATION_DIR), join(tmp, RESKIN_SITE_FOUNDATION_DIR), { recursive: true });
      const path = join(tmp, RESKIN_SITE_FOUNDATION_DIR, 'source-transition.json');
      if (mode === 'missing') rmSync(path);
      else if (mode === 'corrupt') writeFileSync(path, mode);
      else {
        writeFileSync(path, readFileSync(path, 'utf8')
          .replace('"reskin-site-foundation-20261010"', '"reskin-site-foundation-drift"'));
      }
      expect(() => loadReskinReview(tmp)).toThrow(drift);
      expect(() => reskinPredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
    }
  });
});
