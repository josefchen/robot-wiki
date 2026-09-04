// @vitest-environment node
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { publishedModules } from '@/data/modules';
import {
  OG_CARD_OUTPUT_ROOTS,
  OG_CARD_TRACKED_OUTPUT_ROOT,
  verifyShippedCardBytes,
} from '@/lib/og-card-emitted-bytes';

/**
 * The last write, checked on the artefact rather than read out of the
 * generator's source.
 *
 * What this replaced followed the generator's `writeFileSync` arguments
 * through its tokens. That established those writes shipped the render
 * boundary's return value, and nothing about whether they were the final
 * ones: a helper the generator calls could let the checked writes happen and
 * then overwrite the same files. No source reading closes that, because the
 * ways to reach a file are open-ended — a re-exported writer, a destructured
 * dynamic import, a stream. Re-rendering the corpus and comparing the bytes
 * does, whichever module wrote last and through whichever API.
 *
 * The renderer runs in the `node` environment because the bundled
 * @vercel/og hands its rasterizer a Buffer, and under jsdom that arrives as
 * a plain array the encoder rejects.
 */
const ROOT = process.cwd();
const CARD_COUNT = publishedModules().length + 1;

describe('the shipped Open Graph card bytes', () => {
  it('re-renders every corpus card and finds the tracked files byte-identical', async () => {
    const verified = await verifyShippedCardBytes({
      root: ROOT,
      destinationRoots: [OG_CARD_TRACKED_OUTPUT_ROOT],
    });
    expect(
      verified.cards.length,
      'corpus cards compared with the render boundary output',
    ).toBe(CARD_COUNT);
    expect(verified.files, 'shipped files compared').toBe(CARD_COUNT);
    expect(
      new Set(verified.cards.map(({ sha256 }) => sha256)).size,
      'each shipped card must be byte-distinct',
    ).toBe(CARD_COUNT);
    // The tracked destination is one of the two the build writes; the other
    // is the git-ignored export tree, which postbuild compares as well.
    expect(OG_CARD_OUTPUT_ROOTS).toContain(OG_CARD_TRACKED_OUTPUT_ROOT);
  });

  /**
   * Falsified against a staging copy of the shipped tree rather than by
   * editing the repository, so a crash cannot leave a corrupted card behind.
   */
  it('rejects a card that is not the bytes the boundary produced', async () => {
    const staging = mkdtempSync(join(tmpdir(), 'og-card-shipped-bytes-'));
    try {
      cpSync(
        join(ROOT, OG_CARD_TRACKED_OUTPUT_ROOT, 'og'),
        join(staging, 'og'),
        { recursive: true },
      );
      await expect(
        verifyShippedCardBytes({ root: ROOT, destinationRoots: [staging] }),
      ).resolves.toBeTruthy();

      // An overwrite after the generator's own writes: the file is the right
      // size and shape, and is not what the boundary paints.
      const overwritten = join(staging, 'og', 'robot-wiki.png');
      const original = readFileSync(overwritten);
      const tampered = Buffer.from(original);
      tampered[tampered.length - 1] ^= 0xff;
      writeFileSync(overwritten, tampered);
      await expect(
        verifyShippedCardBytes({ root: ROOT, destinationRoots: [staging] }),
      ).rejects.toThrow(/so the shipped card is not what was painted/);
      writeFileSync(overwritten, original);

      // An extra card alongside the accounted-for ones.
      const extra = join(staging, 'og', 'unaccounted.png');
      writeFileSync(extra, original);
      await expect(
        verifyShippedCardBytes({ root: ROOT, destinationRoots: [staging] }),
      ).rejects.toThrow(/the corpus ships/);
      rmSync(extra);

      // And a card the corpus names that never reached disk.
      rmSync(overwritten);
      await expect(
        verifyShippedCardBytes({ root: ROOT, destinationRoots: [staging] }),
      ).rejects.toThrow(/the corpus ships/);
    } finally {
      rmSync(staging, { recursive: true, force: true });
    }
  });

  it('refuses to conclude anything when there is no destination to compare', async () => {
    await expect(
      verifyShippedCardBytes({ root: ROOT, destinationRoots: [] }),
    ).rejects.toThrow(/no shipped byte was compared/);
    await expect(
      verifyShippedCardBytes({
        root: ROOT,
        destinationRoots: [join(tmpdir(), 'og-cards-absent')],
      }),
    ).rejects.toThrow(/does not exist/);
  });
});
