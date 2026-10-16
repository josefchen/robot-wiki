// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TEKTUR_ASSIGNED_STRINGS } from '@/data/type-roles';
import { cardTextRuns } from '@/lib/og-card-artwork';
import { ogCardCorpus, openSealedCardTree, sealGlyphProbe } from '@/lib/og-card-corpus';
import { glyphProbePopulation, runGlyphProbes } from '@/lib/og-card-glyph-probes';
import { OG_CARD_MANIFEST_PATH, type OgCardManifest } from '@/lib/og-card-manifest';
import { renderCorpusCard } from '@/lib/og-card-render-boundary';
import { OG_DISPLAY_STACK, OG_MONO_STACK, ogRendererFaceForStack } from '@/lib/og-renderer-fonts';
import { sanitizeCardText } from '@/lib/og-cards';

/**
 * VAL-B2-OG-012 and VAL-B2-TYPE-017: every string the corpus assigns to a
 * renderer face is painted from that face alone. The probe compares an
 * own-face render with a production render, so a glyph borrowed from
 * another registered face, or requested from the network, fails it.
 */
const ROOT = process.cwd();
const corpus = ogCardCorpus(ROOT);
const recorded = JSON.parse(readFileSync(join(ROOT, OG_CARD_MANIFEST_PATH), 'utf8')) as OgCardManifest;

/** A one-string stand-in for the corpus, so a probe can be run on a chosen string. */
function probeCorpus(text: string, stack: string) {
  return [{ cardId: 'probe', cardPath: '/og/probe.png', card: sealGlyphProbe({ probeId: 'probe', text, stack, fontSize: 32 }).card }];
}

describe('Open Graph glyph probes', { timeout: 120_000 }, () => {
  it('cover every painted run of every card and every OG type-role string', () => {
    const population = glyphProbePopulation(corpus);
    const keys = new Set(population.map(({ face, text }) => `${face.faceId}|${text}`));
    for (const { cardId, card } of corpus) {
      for (const run of cardTextRuns(openSealedCardTree(card))) {
        const key = `${ogRendererFaceForStack(run.family)?.faceId}|${run.text}`;
        expect(keys.has(key), `${cardId}: ${key}`).toBe(true);
        expect(population.find(({ face, text }) => `${face.faceId}|${text}` === key)?.assignedBy).toContain(`card:${cardId}`);
      }
    }
    for (const assigned of TEKTUR_ASSIGNED_STRINGS.filter(({ targets }) => targets.includes('og'))) {
      expect(keys.has(`og-face:display|${sanitizeCardText(assigned.text)}`), assigned.id).toBe(true);
    }
    expect(keys.size).toBe(population.length);
  });

  it('were all run, fallback-free, for the published corpus', () => {
    const population = glyphProbePopulation(corpus);
    expect(recorded.glyphProbes.map(({ faceId, text }) => `${faceId}|${text}`)).toEqual(
      population.map(({ face, text }) => `${face.faceId}|${text}`),
    );
    for (const probe of recorded.glyphProbes) {
      expect(probe, probe.text).toMatchObject({ fallbackFree: true, cmapMissing: [] });
      expect(probe.ownFaceSha256).toBe(probe.productionSha256);
    }
  });

  it('fail a display string with a glyph Tektur lacks but IBM Plex Mono has', async () => {
    const { results, failures } = await runGlyphProbes({ root: ROOT, corpus: probeCorpus('PRICE \u20B9', OG_DISPLAY_STACK) });
    const probe = results.find(({ text }) => text === 'PRICE \u20B9');
    expect(probe).toMatchObject({ faceId: 'og-face:display', fallbackFree: false, cmapMissing: ['U+20B9'] });
    expect(failures).toEqual([expect.stringMatching(/og-face:display: cmap misses U\+20B9 in "PRICE \u20B9"/)]);
    // Every other probe in the run is a real OG string and stays clean.
    expect(results.filter(({ fallbackFree }) => !fallbackFree)).toHaveLength(1);
  });

  it('fail a glyph no registered face has, because the offline renderer refuses the remote font', async () => {
    const { results } = await runGlyphProbes({ root: ROOT, corpus: probeCorpus('SNOW \u2603', OG_MONO_STACK) });
    const probe = results.find(({ text }) => text === 'SNOW \u2603');
    expect(probe).toMatchObject({ faceId: 'og-face:data', fallbackFree: false, ownFaceSha256: null });
    // A symbol takes the renderer's emoji path, whose fetch is refused outright.
    expect(probe?.failure).toMatch(/could not be painted from IBM Plex Mono alone: .*offline; refused https:/);
    // A script glyph takes the font path: the renderer swallows the refusal, and
    // the boundary still fails the render because a request was attempted.
    await expect(renderCorpusCard(probeCorpus('KANJI \u6F22', OG_MONO_STACK)[0], ROOT)).rejects.toThrow(
      /requested \d+ remote asset\(s\).*missing from every registered face/,
    );
  });
});
