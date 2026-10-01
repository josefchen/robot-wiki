import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  figureMigrationCheckerPredecessor, figureMigrationPredecessor, figureMigrationRegistry,
  verifyFigureMigrationSource, type FigureMigrationSource,
} from '../../lib/audit-figure-migration-continuity';

const root = resolve(import.meta.dirname, '../..');
const dir = 'audit/evidence/figure-migration-20261001/';
const read = (path: string) => readFileSync(join(root, path));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const review = JSON.parse(read(`${dir}source-transition.json`).toString()) as { sources: FigureMigrationSource[] };
const source = (path: string) => review.sources.find(({ after }) => after.path === path)!;
const control = source('content/classical/control.mdx');
const planning = source('content/classical/motion-planning.mdx');
const sourceDrift = /figure migration source continuity drift/;
const registryDrift = /figure migration registry continuity drift/;
const checkerDrift = /figure migration checker continuity drift/;
// A reference an earlier review holds: the path at its pre-migration bytes.
const pre = (s: FigureMigrationSource) => ({ path: s.after.path, bytes: s.before.bytes, sha256: s.before.sha256 });

const scratchRoots: string[] = [];
function scratch(): string {
  const tmp = mkdtempSync(join(tmpdir(), 'figure-migration-test-'));
  scratchRoots.push(tmp);
  cpSync(join(root, dir), join(tmp, dir), { recursive: true });
  for (const path of ['content/rl-sim2real/legged-locomotion.mdx', 'content/rl-sim2real/parallel-sim-rl.mdx']) {
    mkdirSync(dirname(join(tmp, path)), { recursive: true });
    writeFileSync(join(tmp, path), read(path));
  }
  return tmp;
}
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('figure migration source successors', () => {
  it('hands every reviewed successor exactly its archived pre-migration bytes', () => {
    expect(review.sources).toHaveLength(30);
    for (const s of review.sources) {
      const live = read(s.after.path);
      expect([live.length, sha(live)]).toEqual([s.after.bytes, s.after.sha256]);
      const archive = figureMigrationPredecessor(root, pre(s), live);
      expect([archive.length, sha(archive)]).toEqual([s.before.bytes, s.before.sha256]);
      expect(figureMigrationPredecessor(root, s.after, live)).toBe(live);
    }
  });

  it('passes through bytes that are not a reviewed successor', () => {
    const drifted = Buffer.concat([read(control.after.path), Buffer.from('\n')]);
    expect(figureMigrationPredecessor(root, pre(control), drifted)).toBe(drifted);
    const unreviewed = read('content/manipulation/vla-models.mdx');
    expect(figureMigrationPredecessor(root,
      { path: 'content/manipulation/vla-models.mdx', bytes: 1, sha256: '0'.repeat(64) }, unreviewed)).toBe(unreviewed);
  });

  it('rejects a missing pre-migration snapshot', () => {
    const tmp = scratch();
    unlinkSync(join(tmp, control.before.path));
    expect(() => figureMigrationPredecessor(tmp, pre(control), read(control.after.path)))
      .toThrow(/figure migration source continuity drift: ENOENT/);
  });

  it('rejects a corrupt pre-migration snapshot', () => {
    const tmp = scratch();
    writeFileSync(join(tmp, control.before.path), 'corrupt');
    expect(() => figureMigrationPredecessor(tmp, pre(control), read(control.after.path))).toThrow(sourceDrift);
  });

  it('rejects a source review that drifted from its pinned bytes', () => {
    const tmp = scratch();
    const path = join(tmp, dir, 'source-transition.json');
    const text = readFileSync(path, 'utf8');
    const drifted = text.replace('"name": "control"', '"name": "control-drift"');
    expect(drifted).not.toBe(text);
    writeFileSync(path, drifted);
    expect(() => figureMigrationPredecessor(tmp, pre(control), read(control.after.path))).toThrow(sourceDrift);
  });
});

describe('figure migration source obligations', () => {
  const archive = read(control.before.path);
  const live = read(control.after.path).toString();
  const survivor = '<PendulumController defaultKp={9.5} className="mt-3" />';

  it('admits the reviewed successors themselves', () => {
    expect(() => verifyFigureMigrationSource(control, archive, Buffer.from(live))).not.toThrow();
    expect(() => verifyFigureMigrationSource(planning, read(planning.before.path), read(planning.after.path))).not.toThrow();
  });

  it.each([
    ['a preserved phrase removed', () => live.split('<SelfCheck').join('<Removed')],
    ['a withdrawn phrase restored', () => `${live}\nastrom-murray-2008\n`],
    ['the retired mount reappearing', () => `${live}\n<PendulumController className="my-6" />\n`],
    ['the retired mount survivor missing', () => live.replace(survivor, survivor.replace('9.5', '9.0'))],
    ['frontmatter drift', () => live.replace(/^---\n/, '---\nreviewNote: drift\n')],
    ['citation order drift', () => `${live}\n<Cite id="ziegler-nichols-1942" />\n`],
  ])('rejects a successor with %s', (_, mutate) => {
    const mutated = mutate();
    expect(mutated).not.toBe(live);
    expect(() => verifyFigureMigrationSource(control, archive, Buffer.from(mutated))).toThrow(sourceDrift);
  });

  it('rejects a successor that restores or drops a replaced phrase', () => {
    const before = read(planning.before.path);
    const current = read(planning.after.path).toString();
    const [{ before: from, after: to }] = planning.replaced;
    for (const mutated of [current.replace(to, from), current.replace(to, 'The lab below is a scene.')]) {
      expect(mutated).not.toBe(current);
      expect(() => verifyFigureMigrationSource(planning, before, Buffer.from(mutated))).toThrow(sourceDrift);
    }
  });

  it('rejects a duplicated once-only line and a review with no obligations', () => {
    const once = review.sources.find((s) => s.preservedOnce.length > 0)!;
    const current = read(once.after.path);
    expect(() => verifyFigureMigrationSource(once, read(once.before.path), current)).not.toThrow();
    expect(() => verifyFigureMigrationSource(once, read(once.before.path),
      Buffer.from(`${current}\n${once.preservedOnce[0]}\n`))).toThrow(sourceDrift);
    expect(() => verifyFigureMigrationSource({ ...control, preserved: [], preservedOnce: [], replaced: [], retired: [] },
      archive, Buffer.from(live))).toThrow(sourceDrift);
  });
});

type Entry = { id: string } & Record<string, unknown>;
type Registry = { sources: Entry[]; mounts: Entry[] };
const registryReview = JSON.parse(read(`${dir}registry-transition.json`).toString()) as
  { records: { id: string; change: 'changed' | 'retired' }[] };
const archived = JSON.parse(read(`${dir}registry-before.json`).toString()) as Registry;
const liveRegistry = () => JSON.parse(read('contract/brand-v2-registries.json').toString()).interactive as Registry;
const records = (registry: Registry, id: string) => [...registry.sources, ...registry.mounts].filter((r) => r.id === id);
const retiredIds = registryReview.records.filter(({ change }) => change === 'retired').map(({ id }) => id);

describe('figure migration registry successors', () => {
  it('restores each reviewed record and retired mount from its archive', () => {
    expect(registryReview.records).toHaveLength(12);
    expect(retiredIds).toHaveLength(5);
    const live = liveRegistry();
    for (const id of retiredIds) expect(records(live, id)).toEqual([]);
    const seen = figureMigrationRegistry(root, live);
    for (const { id } of registryReview.records) expect(records(seen, id)).toEqual(records(archived, id));
    expect(seen.mounts).toHaveLength(live.mounts.length + retiredIds.length);
  });

  it('leaves a drifted reviewed record and a reappearing retired mount live', () => {
    const live = liveRegistry();
    const index = live.sources.findIndex(({ id }) => id === 'interactive:RewardShaping');
    live.sources[index] = { ...live.sources[index], drift: true };
    const [reappeared] = records(archived, 'mount:/data-hardware/data-bottleneck/:DataScaleChart:2');
    live.mounts.push({ ...reappeared, props: 'className="mt-9" /' });
    const seen = figureMigrationRegistry(root, live);
    expect(seen.sources[index]).toEqual(live.sources[index]);
    expect(records(seen, reappeared.id)).toEqual([live.mounts[live.mounts.length - 1]]);
  });

  it('keeps a retired mount absent once its survivor is gone', () => {
    const tmp = scratch();
    const legged = join(tmp, 'content/rl-sim2real/legged-locomotion.mdx');
    writeFileSync(legged, readFileSync(legged, 'utf8').replace('<GaitSupport className="my-6" />', ''));
    unlinkSync(join(tmp, 'content/rl-sim2real/parallel-sim-rl.mdx'));
    const live = liveRegistry();
    live.mounts = live.mounts.filter(({ id }) => id !== 'mount:/data-hardware/data-bottleneck/:DataScaleChart:1');
    const seen = figureMigrationRegistry(tmp, live);
    for (const id of ['mount:/rl-sim2real/legged-locomotion/:GaitDiagram:1',
      'mount:/rl-sim2real/parallel-sim-rl/:TrainingTimeChart:1',
      'mount:/data-hardware/data-bottleneck/:DataScaleChart:2']) expect(records(seen, id)).toEqual([]);
    expect(records(seen, 'mount:/rl-sim2real/sim2real-transfer/:FrictionTransfer:2'))
      .toEqual(records(archived, 'mount:/rl-sim2real/sim2real-transfer/:FrictionTransfer:2'));
  });

  it.each(['registry-before.json', 'registry-transition.json'])('rejects a missing or corrupt %s', (name) => {
    for (const mode of ['missing', 'corrupt'] as const) {
      const tmp = scratch();
      if (mode === 'missing') unlinkSync(join(tmp, dir, name));
      else writeFileSync(join(tmp, dir, name), `${readFileSync(join(tmp, dir, name), 'utf8')} `);
      expect(() => figureMigrationRegistry(tmp, liveRegistry())).toThrow(registryDrift);
    }
  });
});

describe('figure migration checker revision', () => {
  const checker = read('lib/audit-local-basis.ts');

  it('hands the reviewed checker its archived predecessor and passes older checkers through', () => {
    const before = figureMigrationCheckerPredecessor(root, checker);
    expect([before.length, sha(before)])
      .toEqual([114006, 'a5bce56232d1ac63ce3f94add1bdc7d2a7964bf1f40bb6bd431b746ccb510a1a']);
    expect(figureMigrationCheckerPredecessor(root, before)).toBe(before);
  });

  it('rejects any other checker bytes', () => {
    const drifted = Buffer.concat([checker, Buffer.from('\n')]);
    expect(() => figureMigrationCheckerPredecessor(root, drifted)).toThrow(checkerDrift);
  });

  it.each(['audit-local-basis-before.ts.txt', 'checker-transition.json'])('rejects a missing or corrupt %s', (name) => {
    for (const mode of ['missing', 'corrupt'] as const) {
      const tmp = scratch();
      if (mode === 'missing') unlinkSync(join(tmp, dir, name));
      else writeFileSync(join(tmp, dir, name), mode);
      expect(() => figureMigrationCheckerPredecessor(tmp, checker)).toThrow(checkerDrift);
    }
  });
});
