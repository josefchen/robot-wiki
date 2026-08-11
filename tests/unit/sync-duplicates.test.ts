import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  isSyncConflictDuplicate,
  pruneSyncConflictDuplicates,
} from '@/lib/sync-duplicates';

describe('isSyncConflictDuplicate', () => {
  it('flags Finder-conflict duplicate files and directories', () => {
    for (const name of [
      'visual-glossary-batch3 2.mts',
      '404 2',
      '_next 2',
      'cache-life.d 3.ts',
      'notes 10.txt',
    ]) {
      expect(isSyncConflictDuplicate(name), name).toBe(true);
    }
  });

  it('does not flag real routes, export files, or versioned names', () => {
    for (const name of [
      '404',
      '404.html',
      'index.html',
      '_next',
      'manipulation',
      'sitemap.xml',
      'pagefind',
      'visual-check.mts',
      'es2024',
      'v2',
    ]) {
      expect(isSyncConflictDuplicate(name), name).toBe(false);
    }
  });
});

describe('pruneSyncConflictDuplicates', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'prune-sync-duplicates-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('removes " N"-suffixed duplicates at any depth and reports them', async () => {
    // The observed ghost shape: empty Finder-conflict directories at the
    // export root and a duplicate file nested inside a real route.
    await mkdir(join(dir, '404 2'));
    await mkdir(join(dir, '_next 2'));
    await mkdir(join(dir, 'manipulation'));
    await writeFile(join(dir, 'manipulation', 'index 2.html'), '<html></html>');
    await writeFile(join(dir, 'manipulation', 'index.html'), '<html></html>');
    await writeFile(join(dir, '404.html'), '<html></html>');

    const pruned = await pruneSyncConflictDuplicates(dir);

    expect(pruned.sort()).toEqual([
      '404 2',
      '_next 2',
      'manipulation/index 2.html',
    ]);
    expect(existsSync(join(dir, '404 2'))).toBe(false);
    expect(existsSync(join(dir, '_next 2'))).toBe(false);
    expect(existsSync(join(dir, 'manipulation', 'index 2.html'))).toBe(false);
    expect(existsSync(join(dir, 'manipulation', 'index.html'))).toBe(true);
    expect(existsSync(join(dir, '404.html'))).toBe(true);
    expect(await readdir(dir)).not.toContain('404 2');
  });

  it('is a no-op on a clean export', async () => {
    await writeFile(join(dir, 'index.html'), '<html></html>');

    const pruned = await pruneSyncConflictDuplicates(dir);

    expect(pruned).toEqual([]);
    expect(existsSync(join(dir, 'index.html'))).toBe(true);
  });
});
