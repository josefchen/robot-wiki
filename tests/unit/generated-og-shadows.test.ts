import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { pruneGeneratedOgShadows } from '@/lib/generated-og-shadows';

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

describe('pruneGeneratedOgShadows', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'generated-og-shadows-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('removes planted OG shadows while canonical cards stay byte-identical', async () => {
    const canonical = join(root, 'public/og/robot-wiki.png');
    const article = join(root, 'public/og/manipulation/action-chunking.png');
    await mkdir(join(root, 'public/og/manipulation'), { recursive: true });
    await writeFile(canonical, Buffer.from('canonical-site-card'));
    await writeFile(article, Buffer.from('canonical-article-card'));
    await writeFile(
      join(root, 'public/og/robot-wiki 2.png'),
      Buffer.from('generated-shadow'),
    );
    await mkdir(join(root, 'public/og/manipulation 2'), { recursive: true });

    const before = new Map([
      [canonical, sha256(await readFile(canonical))],
      [article, sha256(await readFile(article))],
    ]);

    const pruned = await pruneGeneratedOgShadows(root);

    expect(pruned.sort()).toEqual(['manipulation 2', 'robot-wiki 2.png']);
    expect(existsSync(join(root, 'public/og/robot-wiki 2.png'))).toBe(false);
    expect(existsSync(join(root, 'public/og/manipulation 2'))).toBe(false);
    for (const [path, digest] of before) {
      expect(sha256(await readFile(path)), path).toBe(digest);
    }
  });

  it('does not sweep similar names outside the generated OG directory', async () => {
    const lockedLogo = join(root, 'public/images/logos/vendor 2.png');
    const userFile = join(root, 'notes 2.txt');
    await mkdir(join(root, 'public/og'), { recursive: true });
    await mkdir(join(root, 'public/images/logos'), { recursive: true });
    await writeFile(lockedLogo, Buffer.from('locked-logo'));
    await writeFile(userFile, 'user-authored');

    expect(await pruneGeneratedOgShadows(root)).toEqual([]);
    expect(await readFile(lockedLogo, 'utf8')).toBe('locked-logo');
    expect(await readFile(userFile, 'utf8')).toBe('user-authored');
  });

  it('is a no-op when public/og has not been generated yet', async () => {
    expect(await pruneGeneratedOgShadows(root)).toEqual([]);
  });
});
