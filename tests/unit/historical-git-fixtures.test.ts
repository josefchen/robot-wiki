import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { historicalCatalog, historicalGit, HISTORY_DIRECTORY } from '../helpers/historical-git';

const root = process.cwd();
const hash = (algorithm: string, value: Buffer) => createHash(algorithm).update(value).digest('hex');

describe('portable historical test inputs', () => {
  it('validates every retained request and original identity without a Git object database', () => {
    const scratch = mkdtempSync(join(tmpdir(), 'historical-inputs-'));
    try {
      cpSync(join(root, HISTORY_DIRECTORY), join(scratch, HISTORY_DIRECTORY), { recursive: true });
      mkdirSync(join(scratch, 'lib'));
      cpSync(join(root, 'lib/neutral-tooling.ts'), join(scratch, 'lib/neutral-tooling.ts'));
      expect(existsSync(join(scratch, '.git'))).toBe(false);
      const catalog = historicalCatalog(scratch);
      expect(catalog.size).toBe(1118);
      const expectedBlobs = new Set<string>();
      for (const entry of catalog.values()) {
        expectedBlobs.add(entry.blob.path.slice('blobs/'.length));
        const bytes = historicalGit(entry.args, { cwd: scratch, neutralVocabulary: true });
        expect(bytes.length).toBe(entry.rendered.bytes);
        expect(hash('sha256', bytes)).toBe(entry.rendered.sha256);
        if (!entry.rendered.vocabularyApplied && entry.original.gitBlob) {
          expect(hash('sha1', Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))).toBe(entry.original.gitBlob);
        }
      }
      expect(readdirSync(join(scratch, HISTORY_DIRECTORY, 'blobs')).sort()).toEqual([...expectedBlobs].sort());
    } finally { rmSync(scratch, { recursive: true, force: true }); }
  }, 60_000);

  it('rejects unknown inputs and prevents a vocabulary-rendered snapshot being used as raw bytes', () => {
    expect(() => historicalGit(['show', `${'0'.repeat(40)}:content/missing.mdx`])).toThrow(/Unarchived historical input/);
    const entry = [...historicalCatalog().values()].find((row) => row.rendered.vocabularyApplied)!;
    expect(entry).toBeDefined();
    expect(() => historicalGit(entry.args)).toThrow(/recorded vocabulary/);
  });

  it('rejects a modified catalog, compressed input and vocabulary even after earlier successful reads', () => {
    const entry = [...historicalCatalog().values()].find((row) => !row.rendered.vocabularyApplied)!;
    for (const target of ['catalog.json', entry.blob.path, 'vocabulary']) {
      const scratch = mkdtempSync(join(tmpdir(), 'historical-input-mutation-'));
      try {
        for (const path of [join(HISTORY_DIRECTORY, 'catalog.json'), join(HISTORY_DIRECTORY, entry.blob.path), 'lib/neutral-tooling.ts']) {
          mkdirSync(dirname(join(scratch, path)), { recursive: true });
          cpSync(join(root, path), join(scratch, path));
        }
        expect(historicalGit(entry.args, { cwd: scratch })).toEqual(historicalGit(entry.args));
        const path = target === 'vocabulary' ? join(scratch, 'lib/neutral-tooling.ts') : join(scratch, HISTORY_DIRECTORY, target);
        writeFileSync(path, Buffer.concat([readFileSync(path), Buffer.from('\n')]));
        expect(() => historicalGit(entry.args, { cwd: scratch })).toThrow(/drift/);
      } finally { rmSync(scratch, { recursive: true, force: true }); }
    }
  });
});
