// @vitest-environment node
import { execFileSync } from 'node:child_process';
import {
  appendFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { OG_CARD_JOURNAL_PATH, OG_CARD_MANIFEST_PATH } from '@/lib/og-card-manifest';
import { verifyOgCorpusParity } from '@/lib/og-card-parity';
import { OG_STAGING_DIR } from '@/lib/og-card-publication';

/**
 * VAL-B2-OG-014 and VAL-DIST-005: after publication the validated corpus,
 * the checked-in trees, the export copy and the committed blobs hold the
 * same bytes. Each case copies the published corpus into a temporary root
 * and breaks one thing.
 */
const ROOT = process.cwd();
const roots: string[] = [];

function corpusCopy(options: { withExport?: boolean } = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'og-parity-'));
  roots.push(root);
  for (const path of ['public/og', 'public/structured-images', OG_CARD_MANIFEST_PATH, OG_CARD_JOURNAL_PATH]) {
    cpSync(join(ROOT, path), join(root, path), { recursive: true });
  }
  if (options.withExport) {
    cpSync(join(root, 'public/og'), join(root, 'out/og'), { recursive: true });
    cpSync(join(root, 'public/structured-images'), join(root, 'out/structured-images'), { recursive: true });
  }
  return root;
}

function git(root: string, ...args: string[]): void {
  execFileSync('git', ['-c', 'user.name=parity', '-c', 'user.email=parity@example.invalid', ...args], {
    cwd: root,
    stdio: 'ignore',
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

// Each case copies and hashes the full ~8MB corpus at least once.
describe('Open Graph corpus parity', { timeout: 60_000 }, () => {
  it('holds for the published corpus: 58 cards and 114 structured images, in public/ and out/', () => {
    const local = verifyOgCorpusParity({ root: corpusCopy() });
    expect(local).toMatchObject({ ok: true, failures: [], ogCards: 58, structuredImages: 114 });
    expect(local.trees).toEqual(['public/og', 'public/structured-images']);

    const exported = verifyOgCorpusParity({ root: corpusCopy({ withExport: true }), requireExport: true });
    expect(exported.failures).toEqual([]);
    expect(exported.trees).toEqual(['public/og', 'public/structured-images', 'out/og', 'out/structured-images']);
  });

  it('fails when the export is required and absent', () => {
    expect(verifyOgCorpusParity({ root: corpusCopy(), requireExport: true }).failures).toEqual([
      'out/ does not exist, so the export copy cannot be compared',
    ]);
  });

  it('fails on an extra, a missing, a changed or a linked file in any tree', () => {
    const extra = corpusCopy({ withExport: true });
    writeFileSync(join(extra, 'out/og/legacy.png'), 'a card nobody validated');
    expect(verifyOgCorpusParity({ root: extra }).failures).toEqual([
      'out/og holds files the manifest does not record: legacy.png',
    ]);

    const missing = corpusCopy({ withExport: true });
    unlinkSync(join(missing, 'out/structured-images/classical/control-square.png'));
    expect(verifyOgCorpusParity({ root: missing }).failures).toEqual([
      'out/structured-images is missing classical/control-square.png',
    ]);

    const changed = corpusCopy();
    appendFileSync(join(changed, 'public/og/robot-wiki.png'), Buffer.from([0]));
    expect(verifyOgCorpusParity({ root: changed }).failures).toEqual([
      expect.stringMatching(/^public\/og\/robot-wiki\.png hashes to [0-9a-f]{64}; the validated corpus recorded/),
      expect.stringMatching(/^public\/og digests to .*; the journal validated/),
    ]);

    const linked = corpusCopy();
    const card = join(linked, 'public/og/classical/control.png');
    cpSync(card, join(linked, 'control.png'));
    unlinkSync(card);
    symlinkSync(join(linked, 'control.png'), card);
    expect(verifyOgCorpusParity({ root: linked }).failures).toEqual([
      expect.stringMatching(/public\/og\/classical\/control\.png is a symlink/),
    ]);
  });

  it('fails on an interrupted or unjournalled publication', () => {
    const staging = corpusCopy();
    mkdirSync(join(staging, OG_STAGING_DIR));
    expect(verifyOgCorpusParity({ root: staging }).failures).toEqual([
      expect.stringMatching(/^\.og-staging exists, so a publication is incomplete/),
    ]);

    const incomplete = corpusCopy();
    const journal = JSON.parse(readFileSync(join(incomplete, OG_CARD_JOURNAL_PATH), 'utf8'));
    journal.state = 'swapping';
    journal.trees[0].status = 'moved-aside';
    writeFileSync(join(incomplete, OG_CARD_JOURNAL_PATH), JSON.stringify(journal));
    expect(verifyOgCorpusParity({ root: incomplete }).failures).toEqual([
      'the publication journal is swapping, not complete',
      'journal trees not swapped: public/og (moved-aside)',
    ]);

    const unjournalled = corpusCopy();
    unlinkSync(join(unjournalled, OG_CARD_JOURNAL_PATH));
    expect(verifyOgCorpusParity({ root: unjournalled }).failures).toEqual([
      `${OG_CARD_JOURNAL_PATH} is missing, so the publication is not journalled`,
    ]);

    const unvalidated = corpusCopy();
    appendFileSync(join(unvalidated, OG_CARD_MANIFEST_PATH), '\n');
    expect(verifyOgCorpusParity({ root: unvalidated }).failures).toEqual([
      `${OG_CARD_MANIFEST_PATH} is not the manifest the journal validated`,
    ]);

    const unrecorded = corpusCopy();
    unlinkSync(join(unrecorded, OG_CARD_MANIFEST_PATH));
    expect(verifyOgCorpusParity({ root: unrecorded }).failures).toEqual([
      `${OG_CARD_MANIFEST_PATH} is missing, so no validated corpus is recorded`,
    ]);
  });

  it('compares the checked-in trees with the blobs committed at HEAD', () => {
    const root = corpusCopy();
    git(root, 'init', '-q');
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', 'corpus');
    const committed = verifyOgCorpusParity({ root, committed: true });
    expect(committed.failures).toEqual([]);
    expect(committed.committedFiles).toBe(58 + 114 + 1);

    // A stray card committed and then removed locally survives only in HEAD.
    writeFileSync(join(root, 'public/og/stray.png'), 'committed by mistake');
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', 'stray');
    unlinkSync(join(root, 'public/og/stray.png'));
    // A card the release commit left out.
    git(root, 'rm', '-q', '--cached', 'public/og/robot-wiki.png');
    git(root, 'commit', '-q', '-m', 'drop');
    expect(verifyOgCorpusParity({ root, committed: true }).failures).toEqual([
      'HEAD commits public/og/stray.png, which the manifest does not record',
      'HEAD does not commit public/og/robot-wiki.png',
    ]);
  });
});
