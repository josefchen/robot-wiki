// @vitest-environment node
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import matter from 'gray-matter';
import { afterAll, describe, expect, it } from 'vitest';
import { publishedModules } from '@/data/modules';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '@/lib/identity';
import { ogCardCorpus } from '@/lib/og-card-corpus';
import { OG_CARD_MANIFEST_PATH, buildOgCardManifest, type OgCardManifest } from '@/lib/og-card-manifest';
import { readOgMatrix } from '@/lib/og-card-matrix';

/**
 * VAL-B2-OG-011, VAL-B2-OG-012 and VAL-IMG-015: the renderer-input
 * manifest records every painted string with its source, the facts, the
 * route owners, the devices, the tokens and every written file, and it
 * fails when a painted string no longer equals its source. The manifest is
 * rebuilt here from the published files, without rendering.
 */
const ROOT = process.cwd();
const corpus = ogCardCorpus(ROOT);
const recorded = JSON.parse(readFileSync(join(ROOT, OG_CARD_MANIFEST_PATH), 'utf8')) as OgCardManifest;

function publishedFiles(): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  for (const card of recorded.cards) {
    for (const { path } of [card.asset, ...card.structuredVariants]) {
      files.set(path, readFileSync(join(ROOT, 'public', path)));
    }
  }
  return files;
}

const files = publishedFiles();
const built = buildOgCardManifest({ root: ROOT, corpus, files, glyphProbes: recorded.glyphProbes });
const temporaryRoots: string[] = [];

afterAll(() => {
  for (const root of temporaryRoots) rmSync(root, { recursive: true, force: true });
});

/** A root that mirrors this one through symlinks, with one article's frontmatter replaced. */
function rootWithArticle(domain: string, slug: string, edit: (source: string) => string): string {
  const root = mkdtempSync(join(tmpdir(), 'og-manifest-'));
  temporaryRoots.push(root);
  for (const name of readdirSync(ROOT)) {
    if (name !== 'content') symlinkSync(join(ROOT, name), join(root, name));
  }
  mkdirSync(join(root, 'content', domain), { recursive: true });
  for (const name of readdirSync(join(ROOT, 'content'))) {
    if (name !== domain) symlinkSync(join(ROOT, 'content', name), join(root, 'content', name));
  }
  for (const name of readdirSync(join(ROOT, 'content', domain))) {
    const source = join(ROOT, 'content', domain, name);
    if (name === `${slug}.mdx`) writeFileSync(join(root, 'content', domain, name), edit(readFileSync(source, 'utf8')));
    else symlinkSync(source, join(root, 'content', domain, name));
  }
  return root;
}

describe('the Open Graph renderer-input manifest', () => {
  it('builds from the published corpus without a failure and matches the recorded manifest', () => {
    expect(built.failures).toEqual([]);
    expect(built.manifest.corpusSha256).toBe(recorded.corpusSha256);
    const withoutPixels = recorded.cards.map((card) => {
      const copy = { ...card };
      delete copy.pixels;
      return copy;
    });
    expect(built.manifest.cards).toEqual(withoutPixels);
    expect(recorded.cards.every(({ pixels }) => pixels !== undefined && pixels.anchorsFailed.length === 0)).toBe(true);
  });

  it('records the sealed matrix: 58 cards, 18 site destinations, 114 structured images', () => {
    const { contract, cards } = built.manifest;
    expect(contract).toMatchObject({ ogCardCount: 58, articleCount: 57, structuredImageCount: 114 });
    expect(contract.siteDestinations).toHaveLength(18);
    expect(cards.map(({ cardId }) => cardId).sort()).toEqual(readOgMatrix(ROOT).rows.map(({ cardId }) => cardId).sort());
    const site = cards.find(({ cardId }) => cardId === 'site');
    expect(site?.routeOwners).toEqual([...contract.siteDestinations].sort());
    for (const card of cards.filter(({ kind }) => kind === 'article')) {
      expect(card.routeOwners).toEqual([`/${card.cardId}/`]);
      expect(card.structuredVariants.map(({ width, height }) => `${width}x${height}`).sort()).toEqual(['1200x1200', '1200x900']);
    }
  });

  it('records each painted string with a source that independently yields it', () => {
    for (const card of built.manifest.cards) {
      for (const { sourceId } of card.strings) {
        expect(existsSync(join(ROOT, sourceId.split('#')[0])), sourceId).toBe(true);
      }
      const byField = Object.fromEntries(card.strings.map(({ field, text }) => [field, text]));
      expect(byField.identity).toBe(PUBLIC_IDENTITY);
      if (card.kind === 'site') {
        expect(byField).toEqual({ identity: PUBLIC_IDENTITY, descriptor: PUBLIC_DESCRIPTOR });
        continue;
      }
      // Facts limited to the canonical fields (VAL-IMG-015): domain, title,
      // review year, reference count and the public identity.
      expect(Object.keys(byField).sort()).toEqual(['domain', 'identity', 'referenceCount', 'reviewYear', 'title']);
      const [domain, slug] = card.cardId.split('/');
      const frontmatter = matter(readFileSync(join(ROOT, 'content', domain, `${slug}.mdx`), 'utf8')).data;
      expect(byField.title).toBe(frontmatter.title);
      expect(byField.reviewYear).toBe(`REVIEWED ${String(frontmatter.lastReviewed).slice(0, 4)}`);
      expect(byField.referenceCount).toBe(`${frontmatter.citations.length} REFERENCES`);
      expect(card.facts).toMatchObject({ title: frontmatter.title, referenceCount: frontmatter.citations.length });
    }
    expect(built.manifest.cards.filter(({ kind }) => kind === 'article')).toHaveLength(publishedModules().length);
  });

  it('records painted devices from the website registry and palette tokens equal to their runtime values', () => {
    for (const card of built.manifest.cards) {
      expect(card.devices.map((id) => id.split('#')[0]).every((id) => id.startsWith('device:'))).toBe(true);
      expect(card.paintedTokens).not.toContain('highlight');
    }
    for (const { renderer, runtime } of built.manifest.styleTokens) expect(runtime).toBe(renderer);
    const display = built.manifest.fonts.find(({ faceId }) => faceId === 'og-face:display');
    expect(display).toMatchObject({ family: 'Tektur', binary: { variationAxes: [] } });
    expect(display?.mappedRoleInstance).not.toBeNull();
    expect(built.manifest.toolchain.pngDecoderSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('fails when an article frontmatter no longer yields what its card paints', () => {
    const root = rootWithArticle('classical', 'control', (source) =>
      source.replace(/^lastReviewed: "\d{4}-/m, 'lastReviewed: "2019-'),
    );
    const { failures } = buildOgCardManifest({ root, corpus, files, glyphProbes: recorded.glyphProbes });
    expect(failures).toEqual([
      expect.stringMatching(/^classical\/control: paints \[.*REVIEWED 20\d\d.*\]; its sources derive \[.*REVIEWED 2019.*\]$/),
    ]);
  });

  it('fails on a staged file of the wrong shape, a duplicate file, a stray file and a failed glyph probe', () => {
    const staged = new Map(files);
    staged.set('/og/robot-wiki.png', files.get('/structured-images/classical/control-square.png') as Buffer);
    staged.set('/og/stray.png', Buffer.from('stray'));
    const failedProbe = { ...recorded.glyphProbes[0], fallbackFree: false, failure: 'a glyph falls back' };
    const { failures } = buildOgCardManifest({ root: ROOT, corpus, files: staged, glyphProbes: [failedProbe] });
    expect(failures).toEqual(
      expect.arrayContaining([
        '/og/robot-wiki.png: 1200x1200, not 1200x630',
        expect.stringMatching(/byte-identical/),
        '173 files were staged; the corpus accounts for 172',
        `${failedProbe.probeId}: a glyph falls back`,
      ]),
    );
    expect(buildOgCardManifest({ root: ROOT, corpus, files, glyphProbes: [] }).failures).toEqual(['no glyph probe was run']);
  });
});
