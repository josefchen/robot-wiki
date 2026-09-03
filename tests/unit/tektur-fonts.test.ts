import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openSync, type Font } from 'fontkit';
import { describe, expect, it } from 'vitest';
import {
  FIRST_PARTY_TYPE_ROLES,
  TEKTUR_ASSIGNED_STRINGS,
  TEKTUR_OG_ROLE_ID,
  TEKTUR_ROLE_INSTANCES,
} from '@/data/type-roles';
import { TEKTUR_FONT_METADATA } from '@/data/tektur-font-metadata';
import { inspectTekturAssets } from '@/lib/tektur-font-inspection';
import { OG_RENDERER_FACES } from '@/lib/og-renderer-fonts';

const ROOT = process.cwd();
const source = (path: string): string =>
  readFileSync(join(ROOT, path), 'utf8');

describe('Tektur font delivery contract', () => {
  it('registers exactly four first-party families (VAL-B2-TYPE-001, VAL-A11Y-014)', () => {
    expect(FIRST_PARTY_TYPE_ROLES).toEqual([
      { id: 'display', family: 'Tektur Variable' },
      { id: 'interface', family: 'IBM Plex Sans' },
      { id: 'reading', family: 'Newsreader' },
      { id: 'data', family: 'IBM Plex Mono' },
    ]);
  });

  it('registers measurable Tektur role instances and the exact OG mapping (VAL-B2-TYPE-015, VAL-B2-TYPE-016)', () => {
    expect(TEKTUR_ROLE_INSTANCES).toEqual([
      expect.objectContaining({ id: 'home-wordmark', wght: 600, wdth: 100 }),
      expect.objectContaining({ id: 'shell-wordmark', wght: 600, wdth: 100 }),
      expect.objectContaining({ id: 'page-h1', wght: 600, wdth: 100 }),
      expect.objectContaining({ id: 'article-h1', wght: 600, wdth: 100 }),
      expect.objectContaining({ id: 'section-display', wght: 600, wdth: 100 }),
      expect.objectContaining({ id: 'display-numerals', wght: 600, wdth: 100 }),
    ]);
    expect(TEKTUR_OG_ROLE_ID).toBe('home-wordmark');
  });

  it('keeps assigned web and OG strings non-empty and code-point addressable (VAL-B2-TYPE-017)', () => {
    expect(TEKTUR_ASSIGNED_STRINGS.length).toBeGreaterThan(0);
    expect(
      TEKTUR_ASSIGNED_STRINGS.every(
        ({ id, text }) => id.length > 0 && [...text].length > 0,
      ),
    ).toBe(true);
    expect(
      TEKTUR_ASSIGNED_STRINGS.some(({ text }) => text === 'Robot Wiki'),
    ).toBe(true);
  });

  it('inspects checksums, formats, axes, static mapping, and cmap coverage (VAL-B2-TYPE-011 through 017)', () => {
    const report = inspectTekturAssets();
    expect(report.failures).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('loads web Tektur only through next/font/local and keeps the OG TTF offline-only', () => {
    const layout = source('app/layout.tsx');
    const globalCss = source('app/globals.css');
    const renderBoundary = source('lib/og-card-render-boundary.ts');
    expect(layout).toContain("from 'next/font/local'");
    expect(layout).toContain('Tektur-latin-wdth-wght.woff2');
    expect(layout).toContain("variable: '--font-tektur'");
    expect(globalCss).not.toContain('.ttf');
    expect(layout).not.toContain('Tektur-SemiBold.ttf');
    // The card renderer no longer names the binary: it registers whatever
    // the renderer face registry declares, which is where the static path
    // lives. The generator names neither, because it hands the render
    // boundary a sealed corpus entry and nothing else.
    expect(source('scripts/generate-og-cards.ts')).not.toContain('.ttf');
    expect(renderBoundary).toContain('OG_RENDERER_FACES');
    expect(OG_RENDERER_FACES.map(({ path }) => path)).toContain(
      TEKTUR_FONT_METADATA.og.path,
    );
    expect(TEKTUR_FONT_METADATA.og.path).toBe(
      'assets/fonts/tektur/Tektur-SemiBold.ttf',
    );
  });
});

describe('Tektur font delivery mutation gates', () => {
  const metadata = JSON.parse(
    source('assets/fonts/tektur/metadata.json'),
  ) as Record<string, unknown>;
  const roleRegistry = JSON.parse(
    source('data/type-roles.json'),
  ) as Record<string, unknown>;

  function temporaryJson(name: string, value: unknown): {
    directory: string;
    path: string;
  } {
    const directory = mkdtempSync(join(tmpdir(), 'tektur-font-test-'));
    const path = join(directory, name);
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
    return { directory, path };
  }

  function mutatedFont(
    font: Font,
    variationAxes: Font['variationAxes'],
  ): Font {
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

  it('rejects a wrong web checksum', () => {
    const changed = structuredClone(metadata) as {
      web: { sha256: string };
    };
    changed.web.sha256 = '0'.repeat(64);
    const fixture = temporaryJson('metadata.json', changed);
    try {
      const report = inspectTekturAssets({ metadataPath: fixture.path });
      expect(report.ok).toBe(false);
      expect(report.failures).toContain(
        'web WOFF2 SHA-256 does not match metadata',
      );
    } finally {
      rmSync(fixture.directory, { recursive: true });
    }
  });

  it('rejects an undocumented variable axis', () => {
    const report = inspectTekturAssets({
      openFont(path) {
        const font = openSync(path);
        if (!path.endsWith('.woff2')) return font;
        return mutatedFont(font, {
          ...font.variationAxes,
          opsz: { name: 'Optical size', min: 12, default: 14, max: 72 },
        });
      },
    });
    expect(report.ok).toBe(false);
    expect(report.failures).toContain(
      'web axes mismatch: expected wdth,wght, received opsz,wdth,wght',
    );
  });

  it('rejects a variable OG font', () => {
    const report = inspectTekturAssets({
      openFont(path) {
        const font = openSync(path);
        if (!path.endsWith('.ttf')) return font;
        return mutatedFont(font, {
          wght: { name: 'Weight', min: 400, default: 600, max: 900 },
        });
      },
    });
    expect(report.ok).toBe(false);
    expect(report.failures).toContain(
      'OG TTF must be static, received axes wght',
    );
  });

  it('rejects an assigned string missing from cmap', () => {
    const report = inspectTekturAssets({
      assignedStrings: [
        {
          id: 'mutation:missing-glyph',
          text: '\u{10ffff}',
          targets: ['web', 'og'],
        },
      ],
    });
    expect(report.ok).toBe(false);
    expect(report.failures).toEqual(
      expect.arrayContaining([
        expect.stringContaining('web cmap missing U+10FFFF'),
        expect.stringContaining('og cmap missing U+10FFFF'),
      ]),
    );
  });

  it('rejects a wrong OG role mapping', () => {
    const changed = structuredClone(roleRegistry) as {
      tekturRoleInstances: Array<{
        id: string;
        wght: number;
        wdth: number;
      }>;
    };
    const homeRole = changed.tekturRoleInstances.find(
      ({ id }) => id === 'home-wordmark',
    );
    if (!homeRole) throw new Error('home-wordmark fixture missing');
    homeRole.wght = 700;
    const fixture = temporaryJson('type-roles.json', changed);
    try {
      const report = inspectTekturAssets({ roleRegistryPath: fixture.path });
      expect(report.ok).toBe(false);
      expect(report.failures).toContain(
        'OG mapped role weight mismatch: 700 vs 600',
      );
    } finally {
      rmSync(fixture.directory, { recursive: true });
    }
  });
});
