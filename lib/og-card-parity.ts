/**
 * Release parity for the published Open Graph corpus (VAL-B2-OG-014,
 * VAL-DIST-005).
 *
 * After a publication the same bytes have to exist everywhere the corpus
 * lives: the validated staging corpus (recorded in the manifest and the
 * completed journal), the checked-in `public/` trees, the `out/` export
 * the static server serves, and — once committed — the blobs in `HEAD`.
 * This check reads all of them and fails on an extra file, a missing file,
 * a symlink, a duplicate hash, a byte difference, a leftover staging tree
 * or a journal that did not complete.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  OG_CARD_JOURNAL_PATH,
  OG_CARD_MANIFEST_PATH,
  OG_CARD_EVIDENCE_DIR,
  type OgCardManifest,
} from './og-card-manifest.ts';
import {
  OG_STAGING_DIR,
  filesDigest,
  treeFiles,
  type PublicationRecord,
} from './og-card-publication.ts';

export type OgParityReport = {
  ok: boolean;
  failures: string[];
  ogCards: number;
  structuredImages: number;
  /** Trees compared with the manifest, e.g. `public/og`. */
  trees: string[];
  committedFiles: number;
};

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** The object ID git gives a file's bytes. */
function gitBlobId(bytes: Uint8Array): string {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

export function verifyOgCorpusParity(input: {
  root: string;
  /** Fail when `out/` is absent instead of skipping the export trees. */
  requireExport?: boolean;
  /** Compare the checked-in trees with the blobs committed at HEAD. */
  committed?: boolean;
}): OgParityReport {
  const { root } = input;
  const failures: string[] = [];
  const report = (extra: Partial<OgParityReport> = {}): OgParityReport => ({
    ok: failures.length === 0,
    failures,
    ogCards: 0,
    structuredImages: 0,
    trees: [],
    committedFiles: 0,
    ...extra,
  });

  if (existsSync(join(root, OG_STAGING_DIR))) {
    failures.push(`${OG_STAGING_DIR} exists, so a publication is incomplete or was interrupted; rerun the generator to recover it`);
  }
  if (!existsSync(join(root, OG_CARD_MANIFEST_PATH))) {
    failures.push(`${OG_CARD_MANIFEST_PATH} is missing, so no validated corpus is recorded`);
    return report();
  }
  const manifest = JSON.parse(readFileSync(join(root, OG_CARD_MANIFEST_PATH), 'utf8')) as OgCardManifest;
  const journal = existsSync(join(root, OG_CARD_JOURNAL_PATH))
    ? (JSON.parse(readFileSync(join(root, OG_CARD_JOURNAL_PATH), 'utf8')) as PublicationRecord)
    : null;
  if (journal === null) failures.push(`${OG_CARD_JOURNAL_PATH} is missing, so the publication is not journalled`);
  else {
    if (journal.state !== 'complete') failures.push(`the publication journal is ${journal.state}, not complete`);
    const unswapped = journal.trees.filter(({ status }) => status !== 'swapped');
    if (unswapped.length > 0) {
      failures.push(`journal trees not swapped: ${unswapped.map(({ path, status }) => `${path} (${status})`).join(', ')}`);
    }
  }

  const expected = new Map<string, string>();
  for (const card of manifest.cards) {
    for (const asset of [card.asset, ...card.structuredVariants]) expected.set(asset.path, asset.sha256);
  }
  const ogCards = manifest.cards.length;
  const structuredImages = expected.size - ogCards;
  if (ogCards !== manifest.contract.ogCardCount) {
    failures.push(`the manifest records ${ogCards} OG/X cards; the contract seals ${manifest.contract.ogCardCount}`);
  }
  if (structuredImages !== manifest.contract.structuredImageCount) {
    failures.push(`the manifest records ${structuredImages} structured images; the contract seals ${manifest.contract.structuredImageCount}`);
  }
  if (new Set(expected.values()).size !== expected.size) failures.push('the manifest records two files with the same bytes');

  const exportExists = existsSync(join(root, 'out'));
  if (input.requireExport && !exportExists) failures.push('out/ does not exist, so the export copy cannot be compared');
  const prefixes = exportExists ? ['public', 'out'] : ['public'];
  const compared: string[] = [];
  for (const prefix of prefixes) {
    for (const directory of [...new Set([...expected.keys()].map((path) => path.split('/')[1]))].sort()) {
      const tree = `${prefix}/${directory}`;
      compared.push(tree);
      const absolute = join(root, tree);
      if (!existsSync(absolute)) {
        failures.push(`${tree} does not exist`);
        continue;
      }
      let found: string[];
      try {
        found = treeFiles(absolute);
      } catch (error) {
        failures.push((error as Error).message);
        continue;
      }
      const wanted = [...expected.keys()]
        .filter((path) => path.split('/')[1] === directory)
        .map((path) => path.split('/').slice(2).join('/'))
        .sort();
      const extra = found.filter((file) => !wanted.includes(file));
      const missing = wanted.filter((file) => !found.includes(file));
      if (extra.length > 0) failures.push(`${tree} holds files the manifest does not record: ${extra.join(', ')}`);
      if (missing.length > 0) failures.push(`${tree} is missing ${missing.join(', ')}`);
      for (const file of found.filter((name) => wanted.includes(name))) {
        const actual = sha256(readFileSync(join(absolute, file)));
        if (actual !== expected.get(`/${directory}/${file}`)) {
          failures.push(`${tree}/${file} hashes to ${actual}; the validated corpus recorded ${expected.get(`/${directory}/${file}`)}`);
        }
      }
      // The journal records the digest each tree was validated with; the
      // canonical tree has to still be exactly that staged tree.
      const journalled = journal?.trees.find(({ path }) => path === tree);
      if (journalled && extra.length === 0 && missing.length === 0) {
        const digest = filesDigest(absolute, found);
        if (digest !== journalled.stagedDigest) {
          failures.push(`${tree} digests to ${digest}; the journal validated ${journalled.stagedDigest}`);
        }
      }
    }
  }
  const evidenceTree = journal?.trees.find(({ path }) => path === OG_CARD_EVIDENCE_DIR);
  if (journal && !evidenceTree) failures.push(`the journal did not publish ${OG_CARD_EVIDENCE_DIR}`);
  if (evidenceTree && filesDigest(join(root, OG_CARD_EVIDENCE_DIR), ['manifest.json']) !== evidenceTree.stagedDigest) {
    failures.push(`${OG_CARD_MANIFEST_PATH} is not the manifest the journal validated`);
  }

  let committedFiles = 0;
  if (input.committed) {
    const tracked = [...new Set([...expected.keys()].map((path) => `public/${path.split('/')[1]}`)), OG_CARD_MANIFEST_PATH];
    const listing = execFileSync('git', ['ls-tree', '-r', 'HEAD', '--', ...tracked], {
      cwd: root,
      encoding: 'utf8',
    });
    const committed = new Map<string, string>();
    for (const line of listing.split('\n').filter(Boolean)) {
      const match = /^\d+ (\w+) ([0-9a-f]{40})\t(.+)$/.exec(line);
      if (!match) continue;
      if (match[1] !== 'blob') failures.push(`${match[3]} is committed as a ${match[1]}, not a file`);
      committed.set(match[3], match[2]);
    }
    const wantedPaths = [...[...expected.keys()].map((path) => `public${path}`), OG_CARD_MANIFEST_PATH].sort();
    for (const path of [...committed.keys()]) {
      if (!wantedPaths.includes(path)) failures.push(`HEAD commits ${path}, which the manifest does not record`);
    }
    for (const path of wantedPaths) {
      const blob = committed.get(path);
      if (blob === undefined) {
        failures.push(`HEAD does not commit ${path}`);
        continue;
      }
      const absolute = join(root, path);
      if (!existsSync(absolute) || gitBlobId(readFileSync(absolute)) !== blob) {
        failures.push(`${path} differs from the bytes committed at HEAD`);
      }
      committedFiles += 1;
    }
  }

  return report({ ogCards, structuredImages, trees: compared, committedFiles });
}
