// @vitest-environment node
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  OG_LIVE_JOURNAL,
  OG_PUBLICATION_TREES,
  OG_STAGING_DIR,
  PublicationCrash,
  activeTrees,
  publicationRecord,
  publishOgCorpus,
  readLiveJournal,
  recoverOgPublication,
  treeDigest,
  type OgPublicationTree,
  type PublicationJournal,
} from '@/lib/og-card-publication';

/**
 * VAL-B2-OG-013..015: the corpus is staged and validated before anything
 * canonical moves, swapped tree by tree under a journal, rolled back on a
 * caught failure and recovered from the journal after a crash. Every case
 * runs on a temporary root with small fake trees, so the publication
 * engine is exercised without rendering.
 */

const TREES: OgPublicationTree[] = [
  { path: 'public/og', kind: 'tracked' },
  { path: 'public/structured-images', kind: 'tracked' },
  { path: 'evidence/og-cards', kind: 'evidence' },
];

const roots: string[] = [];

function write(root: string, path: string, text: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

/** A root holding a complete prior corpus. */
function priorRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'og-publication-'));
  roots.push(root);
  write(root, 'public/og/robot-wiki.png', 'prior site');
  write(root, 'public/og/classical/control.png', 'prior control');
  write(root, 'public/structured-images/classical/control-square.png', 'prior square');
  write(root, 'evidence/og-cards/manifest.json', '{"prior":true}');
  return root;
}

function digests(root: string): Record<string, string | null> {
  return Object.fromEntries(
    TREES.map(({ path }) => [path, existsSync(join(root, path)) ? treeDigest(join(root, path)) : null]),
  );
}

async function stageNext(stagingRoot: string, trees: readonly OgPublicationTree[]): Promise<void> {
  for (const { path } of trees) {
    write(stagingRoot, `${path}/next.txt`, `next ${path}`);
    write(stagingRoot, `${path}/nested/deeper.txt`, `nested ${path}`);
  }
}

const accept = async (): Promise<void> => {};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('staged Open Graph publication', () => {
  it('publishes the export trees only when out/ exists', () => {
    const root = priorRoot();
    expect(activeTrees(root).map(({ path }) => path)).toEqual([
      'public/og',
      'public/structured-images',
      'evidence/brand-v2/og-cards',
    ]);
    mkdirSync(join(root, 'out'));
    expect(activeTrees(root).map(({ path }) => path)).toEqual(OG_PUBLICATION_TREES.map(({ path }) => path));
  });

  it('swaps every staged tree into place, completes the journal and leaves no staging behind', async () => {
    const root = priorRoot();
    const { recovery, journal } = await publishOgCorpus({ root, stage: stageNext, validate: accept, trees: TREES });
    expect(recovery).toBe('none');
    expect(journal.state).toBe('complete');
    expect(journal.trees.map(({ status }) => status)).toEqual(['swapped', 'swapped', 'swapped']);
    for (const tree of journal.trees) {
      expect(treeDigest(join(root, tree.path))).toBe(tree.stagedDigest);
      expect(readFileSync(join(root, tree.path, 'next.txt'), 'utf8')).toBe(`next ${tree.path}`);
      expect(existsSync(join(root, tree.path, 'robot-wiki.png'))).toBe(false);
    }
    expect(existsSync(join(root, OG_STAGING_DIR))).toBe(false);
  });

  it('publishes a tree that did not exist before', async () => {
    const root = priorRoot();
    rmSync(join(root, 'evidence'), { recursive: true });
    const { journal } = await publishOgCorpus({ root, stage: stageNext, validate: accept, trees: TREES });
    const evidence = journal.trees.find(({ path }) => path === 'evidence/og-cards');
    expect(evidence).toMatchObject({ hadPrior: false, priorDigest: null, status: 'swapped' });
    expect(existsSync(join(root, 'evidence/og-cards/next.txt'))).toBe(true);
  });

  it('commits a record that is identical across regenerations of the same corpus', async () => {
    const root = priorRoot();
    const first = publicationRecord((await publishOgCorpus({ root, stage: stageNext, validate: accept, trees: TREES })).journal);
    const second = publicationRecord((await publishOgCorpus({ root, stage: stageNext, validate: accept, trees: TREES })).journal);
    expect(second).toEqual(first);
    expect(JSON.stringify(first)).not.toMatch(/prior|backup/i);
    const swapping: PublicationJournal = { schemaVersion: 1, state: 'swapping', corpusDigest: 'x', trees: [] };
    expect(() => publicationRecord(swapping)).toThrow(/swapping publication has no completed record/);
  });

  it('leaves the prior corpus untouched when validation fails', async () => {
    const root = priorRoot();
    const before = digests(root);
    const validate = async (): Promise<void> => {
      throw new Error('a staged card failed its pixel check');
    };
    await expect(publishOgCorpus({ root, stage: stageNext, validate, trees: TREES })).rejects.toThrow(/pixel check/);
    expect(digests(root)).toEqual(before);
    expect(existsSync(join(root, OG_STAGING_DIR))).toBe(false);
  });

  it('refuses a partial staging tree and a staged symlink before anything moves', async () => {
    const root = priorRoot();
    const before = digests(root);
    const partial = async (stagingRoot: string): Promise<void> => {
      write(stagingRoot, 'public/og/next.txt', 'only one tree');
    };
    await expect(publishOgCorpus({ root, stage: partial, validate: accept, trees: TREES })).rejects.toThrow(
      /staging wrote no public\/structured-images tree, so the corpus is partial/,
    );
    const linked = async (stagingRoot: string, trees: readonly OgPublicationTree[]): Promise<void> => {
      await stageNext(stagingRoot, trees);
      symlinkSync(join(root, 'public/og/robot-wiki.png'), join(stagingRoot, 'public/og/linked.png'));
    };
    await expect(publishOgCorpus({ root, stage: linked, validate: accept, trees: TREES })).rejects.toThrow(/is a symlink/);
    expect(digests(root)).toEqual(before);
    expect(existsSync(join(root, OG_STAGING_DIR))).toBe(false);
  });

  it('restores every moved tree when a swap fails part-way', async () => {
    const root = priorRoot();
    const before = digests(root);
    const hooks = {
      afterMoveAside: (tree: string): void => {
        if (tree === 'public/structured-images') throw new Error('disk full');
      },
    };
    await expect(publishOgCorpus({ root, stage: stageNext, validate: accept, trees: TREES, hooks })).rejects.toThrow(
      /publication failed and every moved tree was restored: disk full/,
    );
    expect(digests(root)).toEqual(before);
    expect(existsSync(join(root, OG_STAGING_DIR))).toBe(false);
  });

  it('restores the prior corpus when a swapped tree fails verification', async () => {
    const root = priorRoot();
    const before = digests(root);
    const hooks = {
      afterSwap: (tree: string): void => {
        if (tree === 'public/og') write(root, 'public/og/stray.png', 'written by someone else');
      },
    };
    await expect(publishOgCorpus({ root, stage: stageNext, validate: accept, trees: TREES, hooks })).rejects.toThrow(
      /every moved tree was restored: public\/og hashes to .* after the swap/,
    );
    expect(digests(root)).toEqual(before);
  });

  it('recovers a crash mid-swap from the journal on the next run', async () => {
    const root = priorRoot();
    const before = digests(root);
    const hooks = {
      afterMoveAside: (tree: string): void => {
        if (tree === 'public/structured-images') throw new PublicationCrash('killed');
      },
    };
    await expect(publishOgCorpus({ root, stage: stageNext, validate: accept, trees: TREES, hooks })).rejects.toThrow(
      PublicationCrash,
    );
    // The crash left one tree swapped and one renamed aside.
    expect(readLiveJournal(root)?.state).toBe('swapping');
    expect(existsSync(join(root, 'public/structured-images'))).toBe(false);
    expect(recoverOgPublication(root)).toBe('rolled-back');
    expect(digests(root)).toEqual(before);
    expect(existsSync(join(root, OG_STAGING_DIR))).toBe(false);

    // The next full run recovers first, then publishes.
    const crashOnEvidence = {
      afterMoveAside: (tree: string): void => {
        if (tree === 'evidence/og-cards') throw new PublicationCrash('killed again');
      },
    };
    await expect(
      publishOgCorpus({ root, stage: stageNext, validate: accept, trees: TREES, hooks: crashOnEvidence }),
    ).rejects.toThrow(PublicationCrash);
    const { recovery, journal } = await publishOgCorpus({ root, stage: stageNext, validate: accept, trees: TREES });
    expect(recovery).toBe('rolled-back');
    expect(journal.state).toBe('complete');
  });

  it('recognises a rename the journal had not yet recorded when the process died', async () => {
    const root = priorRoot();
    const before = digests(root);
    const hooks = {
      afterSwap: (tree: string): void => {
        if (tree === 'public/structured-images') throw new PublicationCrash('killed');
      },
    };
    await expect(publishOgCorpus({ root, stage: stageNext, validate: accept, trees: TREES, hooks })).rejects.toThrow(
      PublicationCrash,
    );
    // Rewind the journal one step, as if the crash came before it was written.
    const journal = readLiveJournal(root) as PublicationJournal;
    journal.trees[1].status = 'moved-aside';
    writeFileSync(join(root, OG_LIVE_JOURNAL), JSON.stringify(journal));
    expect(recoverOgPublication(root)).toBe('rolled-back');
    expect(digests(root)).toEqual(before);
  });

  it('refuses to recover from a journal it cannot trust', async () => {
    const crash = async (root: string): Promise<void> => {
      const hooks = {
        afterMoveAside: (tree: string): void => {
          if (tree === 'public/structured-images') throw new PublicationCrash('killed');
        },
      };
      await publishOgCorpus({ root, stage: stageNext, validate: accept, trees: TREES, hooks }).catch(() => {});
    };

    const unreadable = priorRoot();
    await crash(unreadable);
    writeFileSync(join(unreadable, OG_LIVE_JOURNAL), '{"schemaVersion": 1, "state": "swap');
    expect(() => recoverOgPublication(unreadable)).toThrow(/is unreadable .* refusing to guess/);
    await expect(publishOgCorpus({ root: unreadable, stage: stageNext, validate: accept, trees: TREES })).rejects.toThrow(
      /unreadable/,
    );
    // Nothing was cleaned up, so the evidence for a manual repair survives.
    expect(existsSync(join(unreadable, OG_STAGING_DIR, 'backup'))).toBe(true);

    const foreign = priorRoot();
    await crash(foreign);
    writeFileSync(join(foreign, OG_LIVE_JOURNAL), JSON.stringify({ trees: 'all of them' }));
    expect(() => recoverOgPublication(foreign)).toThrow(/is not a publication journal/);

    const tampered = priorRoot();
    await crash(tampered);
    writeFileSync(join(tampered, OG_STAGING_DIR, 'backup/public__structured-images/classical/control-square.png'), 'edited');
    expect(() => recoverOgPublication(tampered)).toThrow(
      /public\/structured-images hashes to .* after rollback; the journal recorded/,
    );
  });

  it('clears a staging tree left without a journal', () => {
    const root = priorRoot();
    write(root, `${OG_STAGING_DIR}/stage/public/og/half.png`, 'half-written');
    expect(recoverOgPublication(root)).toBe('cleaned');
    expect(existsSync(join(root, OG_STAGING_DIR))).toBe(false);
    expect(recoverOgPublication(root)).toBe('none');
  });
});
