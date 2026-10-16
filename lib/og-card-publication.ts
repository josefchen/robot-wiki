/**
 * Staged, journalled publication of the Open Graph corpus
 * (VAL-B2-OG-013, VAL-B2-OG-014, VAL-B2-OG-015).
 *
 * The corpus spans several trees — the tracked `public/og` and
 * `public/structured-images`, their copies in the `out/` export when one
 * exists, and the manifest under `evidence/brand-v2/og-cards`. A generator
 * that clears and rewrites them in place leaves a partial or mixed corpus
 * behind whenever it fails halfway. Publication therefore runs in phases:
 *
 * 1. **Recover.** A journal left by an interrupted run is repaired from its
 *    own records before anything else happens, or rejected if it cannot be
 *    read or its restored trees do not hash to what it recorded.
 * 2. **Stage.** The complete corpus is written to a clean staging tree.
 * 3. **Validate.** The staged corpus is checked in full. Nothing canonical
 *    has been touched yet, so a failure here leaves the prior corpus as is.
 * 4. **Swap.** Each tree is renamed aside and the staged tree renamed into
 *    its place, one tree at a time, with every step persisted to the
 *    journal before the next begins.
 * 5. **Verify.** Every swapped tree must hash to its staged digest.
 *
 * A caught failure in 4 or 5 restores every tree the journal shows as moved
 * and leaves the prior corpus complete. Each tree swap is a single rename,
 * but several trees cannot be replaced atomically together; this is
 * rollback-capable staging and makes no claim of crash-atomicity across
 * trees. A crash is handled by phase 1 of the next run.
 */
import { createHash } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

/** Git-ignored working area beside the trees, so every rename stays on one filesystem. */
export const OG_STAGING_DIR = '.og-staging';
export const OG_LIVE_JOURNAL = `${OG_STAGING_DIR}/journal.json`;

export type OgPublicationTree = {
  /** The tree's path relative to the repository root; also its ID. */
  path: string;
  /** `export` trees are published only when the export root exists. */
  kind: 'tracked' | 'export' | 'evidence';
};

export const OG_PUBLICATION_TREES: readonly OgPublicationTree[] = [
  { path: 'public/og', kind: 'tracked' },
  { path: 'public/structured-images', kind: 'tracked' },
  { path: 'out/og', kind: 'export' },
  { path: 'out/structured-images', kind: 'export' },
  { path: 'evidence/brand-v2/og-cards', kind: 'evidence' },
];

export type JournalTreeStatus = 'pending' | 'moved-aside' | 'swapped' | 'restored';

export type JournalTree = {
  path: string;
  staged: string;
  backup: string;
  hadPrior: boolean;
  /** Digest of the tree before publication, or null when it did not exist. */
  priorDigest: string | null;
  stagedDigest: string;
  status: JournalTreeStatus;
};

export type PublicationJournal = {
  schemaVersion: 1;
  state: 'swapping' | 'complete' | 'rolled-back';
  /** Digest over every staged tree's digest. */
  corpusDigest: string;
  trees: JournalTree[];
};

/**
 * Stands for the process dying between two journalled steps. The engine
 * never recovers from it in-process, which is what lets the recovery path
 * be exercised exactly as a real crash would leave the trees.
 */
export class PublicationCrash extends Error {}

export type PublicationHooks = {
  afterMoveAside?: (tree: string) => void;
  afterSwap?: (tree: string) => void;
};

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Every regular file under `directory`, relative and sorted; symlinks fail. */
export function treeFiles(directory: string, prefix = ''): string[] {
  const found: string[] = [];
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    const relativePath = prefix === '' ? name : `${prefix}/${name}`;
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`${path} is a symlink; the corpus ships regular files only`);
    if (stat.isDirectory()) found.push(...treeFiles(path, relativePath));
    else if (stat.isFile()) found.push(relativePath);
    else throw new Error(`${path} is neither a file nor a directory`);
  }
  return found.sort();
}

/** A content digest over the named files of a directory. */
export function filesDigest(directory: string, files: readonly string[]): string {
  return sha256(
    [...files]
      .sort()
      .map((file) => `${file} ${sha256(readFileSync(join(directory, file)))}`)
      .join('\n'),
  );
}

/** A content digest over a tree's relative paths and file bytes. */
export function treeDigest(directory: string): string {
  return filesDigest(directory, treeFiles(directory));
}

function slot(tree: string): string {
  return tree.replace(/\//g, '__');
}

function writeDurable(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  const handle = openSync(temporary, 'w');
  try {
    writeSync(handle, text);
    fsyncSync(handle);
  } finally {
    closeSync(handle);
  }
  renameSync(temporary, path);
}

function persist(root: string, journal: PublicationJournal): void {
  writeDurable(join(root, OG_LIVE_JOURNAL), `${JSON.stringify(journal, null, 2)}\n`);
}

/** The trees this run publishes: export trees only when `out/` exists. */
export function activeTrees(
  root: string,
  trees: readonly OgPublicationTree[] = OG_PUBLICATION_TREES,
): OgPublicationTree[] {
  return trees.filter(({ path, kind }) => kind !== 'export' || existsSync(join(root, path.split('/')[0])));
}

export function readLiveJournal(root: string): PublicationJournal | null {
  const path = join(root, OG_LIVE_JOURNAL);
  if (!existsSync(path)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(
      `${OG_LIVE_JOURNAL} is unreadable (${(error as Error).message}); refusing to guess which trees an interrupted publication moved`,
    );
  }
  const journal = parsed as PublicationJournal;
  if (
    journal?.schemaVersion !== 1 ||
    !['swapping', 'complete', 'rolled-back'].includes(journal.state) ||
    !Array.isArray(journal.trees)
  ) {
    throw new Error(`${OG_LIVE_JOURNAL} is not a publication journal; refusing to recover from it`);
  }
  return journal;
}

/**
 * Puts every tree back where it was, newest first, and checks each
 * restored tree against the digest recorded before publication began.
 *
 * The journal is written after each rename, so a crash can leave a tree
 * one step ahead of its recorded status: renamed aside while still marked
 * `pending`, or already holding the staged tree while marked
 * `moved-aside`. Both are recognised from the trees themselves — the
 * backup slot exists, or the target hashes to the staged digest — and
 * repaired the same way. A tree journalled as `swapped` was put in place
 * by this run, so it is removed even when it no longer hashes to the
 * staged digest — the case a failed verification reports. Anything else
 * that does not hash back to the recorded prior digest is rejected rather
 * than accepted as a corpus.
 */
function rollBack(root: string, journal: PublicationJournal): void {
  for (const tree of [...journal.trees].reverse()) {
    const target = join(root, tree.path);
    const backup = join(root, tree.backup);
    const targetDigest = (): string | null => (existsSync(target) ? treeDigest(target) : null);
    if (tree.status !== 'restored') {
      const current = targetDigest();
      const placedByThisRun = tree.status === 'swapped' || current === tree.stagedDigest;
      const restorable = !tree.hadPrior || existsSync(backup);
      if (current !== null && current !== tree.priorDigest && placedByThisRun && restorable) {
        rmSync(target, { recursive: true, force: true });
      }
      if (tree.hadPrior && !existsSync(target)) {
        if (!existsSync(backup)) {
          throw new Error(`${tree.path} is missing and its backup ${tree.backup} no longer exists; the prior corpus cannot be restored`);
        }
        mkdirSync(dirname(target), { recursive: true });
        renameSync(backup, target);
      }
      tree.status = 'restored';
      persist(root, journal);
    }
    const restored = targetDigest();
    if (restored !== tree.priorDigest) {
      throw new Error(
        `${tree.path} hashes to ${String(restored)} after rollback; the journal recorded ${String(tree.priorDigest)} before publication`,
      );
    }
  }
  journal.state = 'rolled-back';
  persist(root, journal);
}

export type RecoveryResult = 'none' | 'cleaned' | 'rolled-back';

/**
 * Phase 1. Repairs an interrupted publication from its journal, or throws
 * when the journal cannot be trusted. Always leaves no staging tree behind.
 */
export function recoverOgPublication(root: string): RecoveryResult {
  const journal = readLiveJournal(root);
  let result: RecoveryResult = existsSync(join(root, OG_STAGING_DIR)) ? 'cleaned' : 'none';
  if (journal?.state === 'swapping') {
    rollBack(root, journal);
    result = 'rolled-back';
  }
  rmSync(join(root, OG_STAGING_DIR), { recursive: true, force: true });
  return result;
}

export type PublishInput = {
  root: string;
  /** Writes the complete corpus under `stagingRoot/<tree path>`. */
  stage: (stagingRoot: string, trees: readonly OgPublicationTree[]) => Promise<void>;
  /** Throws when the staged corpus is not releasable. Runs before any canonical write. */
  validate: (stagingRoot: string, trees: readonly OgPublicationTree[]) => Promise<void>;
  trees?: readonly OgPublicationTree[];
  hooks?: PublicationHooks;
};

export type PublishResult = {
  recovery: RecoveryResult;
  journal: PublicationJournal;
};

export async function publishOgCorpus(input: PublishInput): Promise<PublishResult> {
  const { root, hooks = {} } = input;
  const recovery = recoverOgPublication(root);
  const trees = activeTrees(root, input.trees);
  const stagingRoot = join(root, OG_STAGING_DIR, 'stage');
  mkdirSync(stagingRoot, { recursive: true });

  try {
    await input.stage(stagingRoot, trees);
    for (const { path } of trees) {
      if (!existsSync(join(stagingRoot, path))) {
        throw new Error(`staging wrote no ${path} tree, so the corpus is partial`);
      }
      // Throws on a symlink or a special file before anything is moved.
      treeFiles(join(stagingRoot, path));
    }
    await input.validate(stagingRoot, trees);
  } catch (error) {
    rmSync(join(root, OG_STAGING_DIR), { recursive: true, force: true });
    throw error;
  }

  const journalTrees: JournalTree[] = trees.map(({ path }) => {
    const target = join(root, path);
    const hadPrior = existsSync(target);
    return {
      path,
      staged: `${OG_STAGING_DIR}/stage/${path}`,
      backup: `${OG_STAGING_DIR}/backup/${slot(path)}`,
      hadPrior,
      priorDigest: hadPrior ? treeDigest(target) : null,
      stagedDigest: treeDigest(join(stagingRoot, path)),
      status: 'pending',
    };
  });
  const journal: PublicationJournal = {
    schemaVersion: 1,
    state: 'swapping',
    corpusDigest: sha256(journalTrees.map(({ path, stagedDigest }) => `${path} ${stagedDigest}`).join('\n')),
    trees: journalTrees,
  };
  persist(root, journal);

  try {
    for (const tree of journal.trees) {
      const target = join(root, tree.path);
      if (tree.hadPrior) {
        mkdirSync(dirname(join(root, tree.backup)), { recursive: true });
        renameSync(target, join(root, tree.backup));
      }
      tree.status = 'moved-aside';
      persist(root, journal);
      hooks.afterMoveAside?.(tree.path);
      mkdirSync(dirname(target), { recursive: true });
      renameSync(join(root, tree.staged), target);
      tree.status = 'swapped';
      persist(root, journal);
      hooks.afterSwap?.(tree.path);
    }
    for (const tree of journal.trees) {
      const published = treeDigest(join(root, tree.path));
      if (published !== tree.stagedDigest) {
        throw new Error(`${tree.path} hashes to ${published} after the swap; staging validated ${tree.stagedDigest}`);
      }
    }
  } catch (error) {
    if (error instanceof PublicationCrash) throw error;
    rollBack(root, journal);
    rmSync(join(root, OG_STAGING_DIR), { recursive: true, force: true });
    throw new Error(
      `Open Graph publication failed and every moved tree was restored: ${(error as Error).message}`,
    );
  }

  journal.state = 'complete';
  persist(root, journal);
  rmSync(join(root, OG_STAGING_DIR), { recursive: true, force: true });
  return { recovery, journal };
}

/**
 * What a completed publication commits beside its manifest: the state, the
 * corpus digest and each tree's validated digest. The prior digests and
 * backup slots matter only to an interrupted run and stay in the live
 * journal; recording them here would change the committed record on every
 * regeneration even when the corpus does not change.
 */
export type PublicationRecord = {
  schemaVersion: 1;
  state: 'complete';
  corpusDigest: string;
  trees: Array<{ path: string; stagedDigest: string; status: 'swapped' }>;
};

export function publicationRecord(journal: PublicationJournal): PublicationRecord {
  if (journal.state !== 'complete' || journal.trees.some(({ status }) => status !== 'swapped')) {
    throw new Error(`a ${journal.state} publication has no completed record`);
  }
  return {
    schemaVersion: 1,
    state: 'complete',
    corpusDigest: journal.corpusDigest,
    trees: journal.trees.map(({ path, stagedDigest }) => ({ path, stagedDigest, status: 'swapped' })),
  };
}
