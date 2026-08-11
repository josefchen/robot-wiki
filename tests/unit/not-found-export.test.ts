import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  INTERNAL_EXPORT_ARTIFACTS,
  isInternalExportArtifact,
  pruneInternalExportArtifacts,
} from '@/lib/not-found-export';

describe('isInternalExportArtifact', () => {
  it('flags the Next.js-internal _not-found artifact', () => {
    expect(isInternalExportArtifact('_not-found')).toBe(true);
    expect(INTERNAL_EXPORT_ARTIFACTS).toContain('_not-found');
  });

  it('does not flag real routes or conventional export files', () => {
    for (const name of [
      '404',
      '404.html',
      'index.html',
      '_next',
      'a-z',
      'glossary',
      'manipulation',
      'sitemap.xml',
      'robots.txt',
      'pagefind',
    ]) {
      expect(isInternalExportArtifact(name)).toBe(false);
    }
  });

  it('does not flag sync-tool ghost copies', () => {
    // The desktop sync tool duplicates entries with " N" suffixes
    // ('_not-found 2'). Those are local machine noise, not Next.js
    // artifacts, and are never the prune target of this predicate.
    expect(isInternalExportArtifact('_not-found 2')).toBe(false);
  });
});

describe('pruneInternalExportArtifacts', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'prune-not-found-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('removes only the _not-found artifact and reports it', async () => {
    await mkdir(join(dir, '_not-found'));
    await writeFile(join(dir, '_not-found', 'index.html'), '<html></html>');
    await mkdir(join(dir, '_next'));
    await writeFile(join(dir, '404.html'), '<html></html>');

    const pruned = await pruneInternalExportArtifacts(dir);

    expect(pruned).toEqual(['_not-found']);
    expect(existsSync(join(dir, '_not-found'))).toBe(false);
    expect(existsSync(join(dir, '404.html'))).toBe(true);
    expect(existsSync(join(dir, '_next'))).toBe(true);
    expect(await readdir(dir)).not.toContain('_not-found');
  });

  it('is a no-op when the artifact is absent', async () => {
    await writeFile(join(dir, 'index.html'), '<html></html>');

    const pruned = await pruneInternalExportArtifacts(dir);

    expect(pruned).toEqual([]);
    expect(existsSync(join(dir, 'index.html'))).toBe(true);
  });
});
