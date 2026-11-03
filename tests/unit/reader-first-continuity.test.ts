import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  READER_FIRST_CONTINUITY_DIR, loadReaderFirstRegistryReview, loadReaderFirstReview, readerFirstPredecessor,
  readerFirstRegistry, registryRecordHash, verifyReaderFirstSource,
} from '../../lib/audit-reader-first-continuity';
import { preKolBacklog } from '../helpers/seo-pass';
import { historicalGit } from '../helpers/historical-git';
import {
  loadReaderFirstProofReview, READER_FIRST_PROOF_PATHS, READER_FIRST_PROOF_REVIEW,
  readerFirstProofInput, replayReaderFirstProofInput,
} from '../helpers/reader-first-proof-inputs';

const root = resolve(import.meta.dirname, '../..');
// Product sources use the newer continuity chain. The finite proof-input
// selector verifies current raw bytes before replaying the original review.
const read = (path: string) => {
  const current = readFileSync(join(root, path));
  const selected = readerFirstProofInput(root, path, current);
  return selected === current ? preKolBacklog(path) : selected;
};
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const sourceDrift = /reader-first continuity drift/;
const registryDrift = /reader-first registry continuity drift/;

type Entry = { id: string } & Record<string, unknown>;
type Registry = { sources: Entry[]; mounts: Entry[] };
const liveRegistry = () => JSON.parse(read('contract/brand-v2-registries.json').toString()).interactive as Registry;
const records = (registry: Registry, id: string) => [...registry.sources, ...registry.mounts].filter((r) => r.id === id);

const scratchRoots: string[] = [];
function scratch(withReview: boolean): string {
  const tmp = mkdtempSync(join(tmpdir(), 'reader-first-continuity-test-'));
  scratchRoots.push(tmp);
  mkdirSync(join(tmp, READER_FIRST_CONTINUITY_DIR), { recursive: true });
  if (withReview) cpSync(join(root, READER_FIRST_CONTINUITY_DIR), join(tmp, READER_FIRST_CONTINUITY_DIR), { recursive: true });
  return tmp;
}
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('reader-first source successors', () => {
  const review = loadReaderFirstReview(root);

  // Each rebuild re-reads and re-verifies the whole review, so this walks
  // well over a hundred files' worth of edits.
  it('rebuilds every reviewed successor into its recorded predecessor', { timeout: 60_000 }, () => {
    expect(review.sources.length).toBeGreaterThan(0);
    for (const source of review.sources) {
      const prior = readerFirstPredecessor(root, source.before, read(source.after.path));
      expect.soft([prior.length, sha(prior)], source.before.path).toEqual([source.before.bytes, source.before.sha256]);
      expect.soft(readerFirstPredecessor(root, source.after, read(source.after.path)), source.after.path).toEqual(read(source.after.path));
    }
  });

  it('passes other bytes through and rejects a successor whose edits no longer replay', () => {
    const [source] = review.sources;
    const drifted = Buffer.concat([read(source.after.path), Buffer.from('\n')]);
    expect(readerFirstPredecessor(root, source.before, drifted)).toBe(drifted);
    expect(() => verifyReaderFirstSource(source, drifted)).toThrow(sourceDrift);
  });

  it('bounds historical proof input selection to twenty exact current successors with named current coverage', { timeout: 60_000 }, () => {
    const selected = loadReaderFirstProofReview(root);
    expect(selected.entries.map(({ current }) => current.path)).toEqual([...READER_FIRST_PROOF_PATHS]);
    for (const entry of selected.entries) {
      const current = readFileSync(join(root, entry.current.path));
      expect([current.length, sha(current)]).toEqual([entry.current.bytes, entry.current.sha256]);
      expect(() => readerFirstProofInput(root, entry.current.path, Buffer.concat([current, Buffer.from('\n')]))).toThrow(/current successor/);
      const source = review.sources.find(({ after }) => after.path === entry.current.path)!;
      const prior = historicalGit(['show', `${source.archivedFrom}:${source.before.path}`]);
      expect(() => replayReaderFirstProofInput(source, Buffer.concat([prior, Buffer.from('\n')]))).toThrow(/original input/);
      const edited = structuredClone(source);
      edited.edits[0].after += '\n';
      expect(() => replayReaderFirstProofInput(edited, prior)).toThrow(/drift/);
      expect(readerFirstProofInput(root, entry.current.path, current)).toEqual(replayReaderFirstProofInput(source, prior));
    }
    const other = Buffer.from('unreviewed source');
    expect(readerFirstProofInput(scratch(false), 'tests/unit/unreviewed.test.ts', other)).toBe(other);
  });

  it('rejects a changed proof selection review without rewriting the original review', () => {
    const tmp = scratch(true);
    const path = join(tmp, READER_FIRST_PROOF_REVIEW);
    mkdirSync(join(tmp, 'tests/fixtures/history'), { recursive: true });
    cpSync(join(root, READER_FIRST_PROOF_REVIEW), path);
    writeFileSync(path, `${readFileSync(path, 'utf8')} `);
    expect(() => loadReaderFirstProofReview(tmp)).toThrow(/historical proof input drift/);
  });
});

describe('reader-first registry successors', () => {
  const review = loadReaderFirstRegistryReview(root);

  it('hands each reviewed record its pre-pass record while the live record is the reviewed successor', () => {
    expect(review.records.length).toBeGreaterThan(0);
    const live = liveRegistry();
    const seen = readerFirstRegistry(root, live);
    for (const record of review.records) {
      const [current] = records(live, record.id);
      expect(registryRecordHash(current)).toBe(record.after);
      expect(records(seen, record.id)).toEqual([record.before]);
      expect(registryRecordHash(record.before)).toBe(record.beforeHash);
    }
    expect(seen.sources).toHaveLength(live.sources.length);
    expect(seen.mounts).toHaveLength(live.mounts.length);
  });

  it('leaves a reviewed record that drifted again live', () => {
    const live = liveRegistry();
    const [{ id }] = review.records;
    const list = id.startsWith('interactive:') ? live.sources : live.mounts;
    const index = list.findIndex((record) => record.id === id);
    list[index] = { ...list[index], drift: true };
    expect(records(readerFirstRegistry(root, live), id)).toEqual([list[index]]);
  });

  it('reads no review when no live record is a reviewed successor', () => {
    const live = liveRegistry();
    const ids = new Set(review.records.map(({ id }) => id));
    const unreviewed = { sources: live.sources.filter(({ id }) => !ids.has(id)), mounts: live.mounts.filter(({ id }) => !ids.has(id)) };
    expect(readerFirstRegistry(scratch(false), unreviewed)).toBe(unreviewed);
  });

  it('rejects a missing or corrupt review once a live record is a reviewed successor', () => {
    expect(() => readerFirstRegistry(scratch(false), liveRegistry())).toThrow(registryDrift);
    const tmp = scratch(true);
    const file = join(tmp, READER_FIRST_CONTINUITY_DIR, 'registry-transition.json');
    writeFileSync(file, `${readFileSync(file, 'utf8')} `);
    expect(() => readerFirstRegistry(tmp, liveRegistry())).toThrow(registryDrift);
  });
});
