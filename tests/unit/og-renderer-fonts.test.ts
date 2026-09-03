import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openSync, type Font } from 'fontkit';
import { describe, expect, it } from 'vitest';
import { FIRST_PARTY_TYPE_ROLES } from '@/data/type-roles';
import { PLEX_MONO_FONT_METADATA } from '@/data/plex-mono-font-metadata';
import { TEKTUR_FONT_METADATA } from '@/data/tektur-font-metadata';
import {
  articleCardElement,
  cardTextRuns,
  siteCardElement,
} from '@/lib/og-card-artwork';
import {
  inspectOgRendererFonts,
  ogCardTextRuns,
} from '@/lib/og-renderer-font-inspection';
import {
  OG_DISPLAY_STACK,
  OG_MONO_STACK,
  OG_RENDERER_FACES,
  primaryFamily,
} from '@/lib/og-renderer-fonts';

const ROOT = process.cwd();
const source = (path: string): string =>
  readFileSync(join(ROOT, path), 'utf8');

describe('OG renderer font delivery contract', () => {
  it('registers only first-party role families (VAL-B2-TYPE-001)', () => {
    const roleFamilies = new Map(
      FIRST_PARTY_TYPE_ROLES.map(({ id, family }) => [id, family]),
    );
    expect(OG_RENDERER_FACES.length).toBeGreaterThan(0);
    for (const face of OG_RENDERER_FACES) {
      const family = roleFamilies.get(face.roleId);
      expect(family, `${face.faceId} claims role ${face.roleId}`).toBeDefined();
      // The registry's family for the claimed role has to be the face's own
      // family (the web display role names the variable file, so `Tektur`
      // and `Tektur Variable` are the same family). Comparing `family`
      // against an array that already contains `family` restated the input
      // and could not fail: swapping the two roleId values left it green.
      expect(
        [face.family, `${face.family} Variable`],
        `${face.faceId} serves role ${face.roleId}, whose registered family is ${String(family)}`,
      ).toContain(family);
      expect(face.family).not.toMatch(/^KaTeX/i);
    }
    expect(OG_RENDERER_FACES.map(({ family }) => family)).toEqual([
      'Tektur',
      'IBM Plex Mono',
    ]);
    expect(primaryFamily(OG_DISPLAY_STACK)).toBe('Tektur');
    expect(primaryFamily(OG_MONO_STACK)).toBe('IBM Plex Mono');
  });

  it('keeps the KaTeX exception out of the renderer and its artwork', () => {
    expect(source('lib/og-card-artwork.ts')).not.toMatch(/KaTeX/);
    expect(source('scripts/generate-og-cards.ts')).not.toMatch(/KaTeX/);
    expect(source('lib/og-card-render-boundary.ts')).not.toMatch(/KaTeX/);
    // The faces are registered where the cards are painted. The generator
    // no longer supplies them: it hands the render boundary a sealed corpus
    // entry and nothing else.
    expect(source('lib/og-card-render-boundary.ts')).toContain(
      'OG_RENDERER_FACES',
    );
  });

  it('vendors a static IBM Plex Mono face beside the static Tektur face', () => {
    expect(PLEX_MONO_FONT_METADATA.og.path).toBe(
      'assets/fonts/ibm-plex-mono/IBMPlexMono-Regular.ttf',
    );
    expect(TEKTUR_FONT_METADATA.og.path).toBe(
      'assets/fonts/tektur/Tektur-SemiBold.ttf',
    );
    expect(
      OG_RENDERER_FACES.map(({ path }) => path).sort(),
    ).toEqual([
      'assets/fonts/ibm-plex-mono/IBMPlexMono-Regular.ttf',
      'assets/fonts/tektur/Tektur-SemiBold.ttf',
    ]);
  });

  it('paints the data and registration labels in the mono role', () => {
    const runs = cardTextRuns(
      articleCardElement({
        entry: {
          domain: 'manipulation',
          slug: 'action-chunking',
          title: 'Action Chunking',
        },
        domainName: 'Manipulation & Learned Policies',
        referenceCount: 12,
        reviewYear: 2026,
      }),
    );
    const monoText = runs
      .filter((run) => primaryFamily(run.family) === 'IBM Plex Mono')
      .map(({ text }) => text);
    expect(monoText).toEqual([
      'MANIPULATION & LEARNED POLICIES',
      'REVIEWED 2026',
      '12 REFERENCES',
    ]);
    const siteMono = cardTextRuns(siteCardElement())
      .filter((run) => primaryFamily(run.family) === 'IBM Plex Mono')
      .map(({ text }) => text);
    expect(siteMono).toEqual(['PRIMARY SOURCES', 'ROBOT-WIKI.COM']);
  });

  it('walks every shipped card and covers each painted run (VAL-B2-TYPE-011 through 014)', () => {
    const report = inspectOgRendererFonts();
    expect(report.failures).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.faceCount).toBe(2);
    expect(report.textRunCount).toBe(ogCardTextRuns(ROOT).length);
    expect(report.textRunCount).toBeGreaterThan(0);
    expect(report.familiesPainted).toEqual(['IBM Plex Mono', 'Tektur']);
  });
});

describe('OG renderer font mutation gates', () => {
  function mutatedFont(font: Font, variationAxes: Font['variationAxes']): Font {
    return {
      type: font.type,
      familyName: font.familyName,
      subfamilyName: font.subfamilyName,
      fullName: font.fullName,
      postscriptName: font.postscriptName,
      variationAxes,
      characterSet: font.characterSet,
      hasGlyphForCodePoint: font.hasGlyphForCodePoint.bind(font),
      'OS/2': font['OS/2'],
    };
  }

  it('rejects a card family the renderer never registered', () => {
    const report = inspectOgRendererFonts({
      textRuns: [
        { family: 'KaTeX_Typewriter, monospace', text: '12 REFERENCES' },
      ],
    });
    expect(report.ok).toBe(false);
    expect(report.failures).toContain(
      'unregistered renderer family KaTeX_Typewriter paints "12 REFERENCES"',
    );
  });

  it('rejects a scoped exception family registered as a first-party role', () => {
    const [display] = OG_RENDERER_FACES;
    const report = inspectOgRendererFonts({
      faces: [
        display,
        {
          faceId: 'og-face:data',
          family: 'KaTeX_Typewriter',
          roleId: 'data',
          stack: 'KaTeX_Typewriter, monospace',
          path: 'node_modules/katex/dist/fonts/KaTeX_Typewriter-Regular.ttf',
          sha256: '0'.repeat(64),
          weight: 400,
          style: 'normal',
          licensePath: 'assets/fonts/ibm-plex-mono/OFL.txt',
          metadataPath: 'assets/fonts/ibm-plex-mono/metadata.json',
        },
      ],
    });
    expect(report.ok).toBe(false);
    expect(report.failures).toContain(
      'og-face:data: KaTeX_Typewriter is a scoped exception family and must never serve a first-party role',
    );
    expect(report.failures).toContain(
      'og-face:data: family KaTeX_Typewriter does not serve the data role family IBM Plex Mono',
    );
  });

  it('rejects a wrong renderer face checksum', () => {
    const [display, data] = OG_RENDERER_FACES;
    const report = inspectOgRendererFonts({
      faces: [display, { ...data, sha256: '0'.repeat(64) }],
    });
    expect(report.ok).toBe(false);
    expect(report.failures).toContain(
      'og-face:data: SHA-256 does not match metadata',
    );
  });

  it('rejects a variable renderer face', () => {
    const report = inspectOgRendererFonts({
      openFont(path) {
        const font = openSync(path);
        if (!path.includes('IBMPlexMono')) return font;
        return mutatedFont(font, {
          wght: { name: 'Weight', min: 100, default: 400, max: 700 },
        });
      },
    });
    expect(report.ok).toBe(false);
    expect(report.failures).toContain(
      'og-face:data: renderer face must be static, received axes wght',
    );
  });

  it('rejects a registered face that paints nothing', () => {
    const report = inspectOgRendererFonts({
      textRuns: [{ family: OG_DISPLAY_STACK, text: 'Robot Wiki' }],
    });
    expect(report.ok).toBe(false);
    expect(report.failures).toContain(
      'og-face:data: registered but paints no card text',
    );
  });

  it('rejects a painted code point outside the face cmap', () => {
    const report = inspectOgRendererFonts({
      textRuns: [
        { family: OG_DISPLAY_STACK, text: 'Robot Wiki' },
        { family: OG_MONO_STACK, text: '\u{10ffff}' },
      ],
    });
    expect(report.ok).toBe(false);
    expect(report.failures).toEqual(
      expect.arrayContaining([
        expect.stringContaining('og-face:data: cmap missing U+10FFFF'),
      ]),
    );
  });
});
