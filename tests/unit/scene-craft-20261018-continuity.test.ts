import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createLocalArtifactReader } from '../../lib/audit-local-basis';
import { readerFirstPredecessor, readerFirstSuccessorPaths } from '../../lib/audit-reader-first-continuity';
import {
  SCENE_CRAFT_CONTINUITY_DIR, keepsSceneCraftObligations, loadSceneCraftReview, sceneCraftPredecessor,
  sceneCraftSuccessorPaths, sceneHandles, verifySceneCraftSource,
} from '../../lib/audit-scene-craft-continuity';
import { seoPassPredecessor } from '../../lib/audit-seo-pass-continuity';
import { preReaderFirst } from '../helpers/seo-pass';

const root = resolve(import.meta.dirname, '../..');
// No newer layer precedes this one, so the live scene is itself the successor.
const read = (path: string) => readFileSync(join(root, path));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /scene-craft continuity drift/;
const blank = { bytes: 0, sha256: '' };
const BATCH_SCALE = 'components/motion/scenes/batch-scale.tsx';

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('scene craft 2026-10-18 scene successors', () => {
  const review = loadSceneCraftReview(root);

  it('reviews exactly the scenes the pass changed after older proofs pinned them', () => {
    expect(sceneCraftSuccessorPaths()).toEqual([BATCH_SCALE]);
  });

  it('rebuilds every reviewed successor into the bytes the older layers and proofs still decide', () => {
    expect(review.sources.map(({ after }) => after.path)).toEqual(sceneCraftSuccessorPaths());
    for (const source of review.sources) {
      const live = read(source.after.path);
      const prior = sceneCraftPredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      expect(sceneCraftPredecessor(root, source.after, live)).toBe(live);
      // The rebuilt bytes are the reader-first successor, which that layer still decides.
      expect(readerFirstSuccessorPaths()).toContain(source.after.path);
      expect(readerFirstPredecessor(root, { path: source.after.path, ...blank }, prior)).not.toEqual(prior);
      expect(readerFirstPredecessor(root, { path: source.after.path, ...blank }, live)).toBe(live);
      // The artifact readers see this layer first.
      expect(seoPassPredecessor(root, source.before, live)).toEqual(prior);
      expect(preReaderFirst(source.after.path)).toEqual(readerFirstPredecessor(root, { path: source.after.path, ...blank }, prior));
    }
  });

  it('hands the parallel-local proofs the scene bytes they pinned', () => {
    const [source] = review.sources;
    expect(createLocalArtifactReader(root)(source.before)).toEqual(sceneCraftPredecessor(root, source.before, read(BATCH_SCALE)));
    expect(() => createLocalArtifactReader(root)({ ...source.before, sha256: '0'.repeat(64) }))
      .toThrow(`artifact bytes/hash: ${BATCH_SCALE}`);
  });

  it('passes other bytes through and rejects a successor whose edits no longer replay', () => {
    const [source] = review.sources;
    const drifted = Buffer.concat([read(source.after.path), Buffer.from('\n')]);
    expect(sceneCraftPredecessor(root, source.before, drifted)).toBe(drifted);
    expect(sceneCraftPredecessor(root, { path: 'components/motion/scenes/sense-avoid.tsx', ...blank }, drifted))
      .toBe(drifted);
    expect(() => verifySceneCraftSource(source, drifted)).toThrow(drift);
    const replaced = { ...source, edits: [{ before: 'overheadLift', after: 'cpuVisible' }] };
    expect(() => verifySceneCraftSource(replaced, read(source.after.path))).toThrow(drift);
  });

  it('admits only a changed scene source that keeps every handle its predecessor had', () => {
    const prior = [
      "export const SCENE = { id: 'demo', beats: [{ id: 'one', caption: 'One robot.' }] };",
      'export function demoFrame(t: number) { return { lift: t }; }',
      '<g data-scene-mark="curve" data-testid="curve" opacity={0} />',
    ].join('\n');
    const changed = prior.replace('{ lift: t }', '{ lift: t * t }');
    const path = 'components/motion/scenes/demo-scene.tsx';
    expect([...sceneHandles(prior)].sort()).toEqual([
      "caption: 'One robot.'", 'data-scene-mark="curve"', 'data-testid="curve"', 'export const SCENE',
      'export function demoFrame', "id: 'demo'", "id: 'one'",
    ]);
    expect(keepsSceneCraftObligations(path, prior, changed)).toBe(true);
    expect(keepsSceneCraftObligations(path, prior, changed.replace(' />', ' data-scene-stage-label="new" />'))).toBe(true);
    expect(keepsSceneCraftObligations(path, prior, prior)).toBe(false);
    // Only motion scene sources.
    for (const other of ['components/interactive/demo.tsx', 'components/motion/scenes/demo.ts', 'content/x/demo.mdx']) {
      expect(keepsSceneCraftObligations(other, prior, changed)).toBe(false);
    }
    // A mark, test id, beat id, caption or exported name dropped or renamed.
    for (const [from, to] of [
      ['data-scene-mark="curve"', 'data-scene-mark="line"'], [' data-testid="curve"', ''], ["id: 'one'", "id: 'first'"],
      ["'One robot.'", "'A robot.'"], ['export function demoFrame', 'function demoFrame'],
    ] as const) {
      expect(keepsSceneCraftObligations(path, prior, changed.replace(from, to)), from).toBe(false);
    }
  });

  it('rejects a missing, corrupt or renamed review', () => {
    const [source] = review.sources;
    for (const mode of ['missing', 'corrupt', 'renamed'] as const) {
      const tmp = mkdtempSync(join(tmpdir(), 'scene-craft-continuity-test-'));
      scratchRoots.push(tmp);
      cpSync(join(root, SCENE_CRAFT_CONTINUITY_DIR), join(tmp, SCENE_CRAFT_CONTINUITY_DIR), { recursive: true });
      const path = join(tmp, SCENE_CRAFT_CONTINUITY_DIR, 'source-transition.json');
      if (mode === 'missing') rmSync(path);
      else if (mode === 'corrupt') writeFileSync(path, mode);
      else writeFileSync(path, readFileSync(path, 'utf8').replace('"scene-craft-20261018"', '"scene-craft-drift"'));
      expect(() => loadSceneCraftReview(tmp)).toThrow(drift);
      expect(() => sceneCraftPredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
    }
  });
});
