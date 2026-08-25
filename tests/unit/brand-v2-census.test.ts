import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { DOMAINS, publishedModules } from '@/data/modules';
import {
  configurationFingerprint,
  reconcileNamedSets,
  validateExactRegistryParity,
  validateInteractiveRegistry,
  validateNoInventedSymbols,
  type StateCase,
} from '@/lib/brand-v2-census';
import { isSyncConflictDuplicate } from '@/lib/sync-duplicates';

type Registry = {
  rootFingerprint: string;
  routes: {
    public: Array<{ id: string; path: string; fingerprint: string }>;
    notFound: { id: string; publicContent: false; fingerprint: string };
  };
  metadata: Array<{
    id: string;
    routeId: string;
    ownerPath: string;
    ownerSourceFingerprint: string;
    canonical: string;
    title: string;
    description: string | null;
    openGraph: { image: string; width: number; height: number };
    twitter: { card: string; image: string };
    jsonLd: string[];
    manifest: null;
    icons: unknown[];
    themeColour: null;
    notFoundPolicy: null | { publicContent: false; index: false };
    fingerprint: string;
  }>;
  assets: Array<{
    id: string;
    path: string;
    byteHash: string;
    semanticHash: string | null;
    ownershipId: string;
    fingerprint: string;
  }>;
  assetExceptions: Array<{
    id: string;
    canonicalPath: string;
    reason: string;
    byteHash: string;
    fingerprint: string;
  }>;
  assetUses: string[];
  interactive: {
    sources: Array<{
      id: string;
      component: string;
      sourcePath: string;
      cases: StateCase[];
      expectedCaseCount: number;
      fingerprint: string;
    }>;
    mounts: Array<{
      id: string;
      sourceId: string;
      ownerPath: string;
      cases: StateCase[];
      expectedCaseCount: number;
      fingerprint: string;
    }>;
  };
  gridDevices: Array<{ id: string; fingerprint: string }>;
  surfaces: Array<{ id: string; fingerprint: string }>;
  pageFrames: Array<{ id: string; fingerprint: string }>;
  typeRoles: Array<{ id: string; family: string; fingerprint: string }>;
  controls: Array<{ id: string; fingerprint: string }>;
};

const ROOT = process.cwd();
const GENERATED_ASSET_PREFIXES = ['og/', 'pagefind/'];
const registry = JSON.parse(
  readFileSync(join(ROOT, 'contract', 'brand-v2-registries.json'), 'utf8'),
) as Registry;

function filesUnder(directory: string): string[] {
  return readdirSync(directory)
    .sort()
    .flatMap((name) => {
      const path = join(directory, name);
      return statSync(path).isDirectory() ? filesUnder(path) : [path];
    });
}

const ASSET_EXTENSIONS = new Set([
  '.avif',
  '.gif',
  '.glb',
  '.ico',
  '.jpeg',
  '.jpg',
  '.png',
  '.stl',
  '.svg',
  '.ttf',
  '.urdf',
  '.webp',
  '.woff',
  '.woff2',
]);

describe('brand-v2 canonical census', () => {
  it('fingerprints configuration independent of object key order', () => {
    expect(configurationFingerprint({ b: 2, a: 1 })).toBe(
      configurationFingerprint({ a: 1, b: 2 }),
    );
  });

  it('fails when one route population omits a member', () => {
    expect(
      reconcileNamedSets({
        registry: ['/', '/search/'],
        sitemap: ['/'],
        export: ['/', '/search/'],
      }),
    ).toContainEqual(
      expect.objectContaining({
        assertionId: 'VAL-B2-CONT-007',
        memberId: '/search/',
        reason: 'set-mismatch',
      }),
    );
  });

  it('rejects missing, unregistered, orphaned, duplicate, and symlink assets', () => {
    expect(
      validateExactRegistryParity(
        ['image:a', 'image:b', 'symlink:image:c'],
        ['image:a', 'image:a', 'image:c'],
        ['image:a', 'image:d'],
      ).map((failure) => failure.reason),
    ).toEqual(
      expect.arrayContaining([
        'duplicate-registry-id',
        'unregistered-physical-asset',
        'registered-file-missing',
        'orphan-registered-asset',
        'unregistered-asset-use',
        'symlink-asset',
      ]),
    );
  });

  it('requires stable source and mount ids, fingerprints, and non-empty cases', () => {
    const failures = validateInteractiveRegistry(
      [
        { id: 'source:a', fingerprint: 'bad', cases: [] },
        { id: 'source:a', fingerprint: 'bad', cases: [] },
      ],
      [
        {
          id: 'mount:a',
          sourceId: 'source:missing',
          fingerprint: '',
          cases: [],
        },
      ],
    );
    expect(failures.map((failure) => failure.reason)).toEqual(
      expect.arrayContaining([
        'duplicate-source-id',
        'invalid-fingerprint',
        'empty-state-cases',
        'missing-mount-source',
      ]),
    );
  });

  it('rejects invented favicon, monogram, mascot, mask, and brand-symbol paths', () => {
    expect(
      validateNoInventedSymbols([
        'app/favicon.ico',
        'public/rw-monogram.svg',
        'public/robot-head-logo.svg',
        'app/manifest.ts:maskable',
      ]),
    ).toHaveLength(4);
  });

  it('reconciles fixed, domain, and article routes without counting 404 as public', () => {
    const expected = new Set([
      '/',
      '/a-z/',
      '/market-map/',
      '/playground/',
      '/glossary/',
      '/credits/',
      '/search/',
      ...DOMAINS.map((domain) => `/${domain}/`),
      ...publishedModules().map(
        ({ domain, slug }) => `/${domain}/${slug}/`,
      ),
    ]);
    expect(new Set(registry.routes.public.map(({ path }) => path))).toEqual(
      expected,
    );
    expect(registry.routes.notFound).toEqual(
      expect.objectContaining({
        id: 'route:/404/',
        publicContent: false,
      }),
    );
    expect(registry.routes.public.some(({ path }) => path === '/404/')).toBe(
      false,
    );
  });

  it('derives every interactive source and production mount from repository source', () => {
    const sourceFiles = filesUnder(join(ROOT, 'components', 'interactive'))
      .filter((path) => ['.ts', '.tsx'].includes(extname(path)))
      .map((path) => relative(ROOT, path))
      .sort();
    const mountFiles = [
      ...filesUnder(join(ROOT, 'content')).filter((path) =>
        path.endsWith('.mdx'),
      ),
      join(ROOT, 'app', 'page.tsx'),
    ];
    const importPattern =
      /import\s+\{\s*([A-Z][A-Za-z0-9]*)\s*\}\s+from\s+['"]@\/components\/interactive\/[^'"]+['"]/g;
    let mountCount = 0;
    for (const path of mountFiles) {
      const text = readFileSync(path, 'utf8');
      for (const match of text.matchAll(importPattern)) {
        mountCount += [...text.matchAll(new RegExp(`<${match[1]}\\b`, 'g'))]
          .length;
      }
    }

    expect(registry.interactive.sources.map(({ sourcePath }) => sourcePath))
      .toEqual(sourceFiles);
    expect(registry.interactive.mounts).toHaveLength(mountCount);
    expect(
      validateInteractiveRegistry(
        registry.interactive.sources,
        registry.interactive.mounts,
      ),
    ).toEqual([]);
    for (const entry of [
      ...registry.interactive.sources,
      ...registry.interactive.mounts,
    ]) {
      expect(entry.expectedCaseCount).toBe(entry.cases.length);
      expect(entry.expectedCaseCount).toBeGreaterThan(0);
    }
  });

  it('covers every metadata owner and field with stable fingerprints', () => {
    const expectedRouteIds = new Set([
      ...registry.routes.public.map(({ id }) => id),
      registry.routes.notFound.id,
    ]);
    expect(new Set(registry.metadata.map(({ routeId }) => routeId))).toEqual(
      expectedRouteIds,
    );
    for (const entry of registry.metadata) {
      expect(entry.ownerPath).toBeTruthy();
      expect(entry.ownerSourceFingerprint).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.canonical).toMatch(/^https:\/\/robot-wiki\.com\//);
      expect(entry.title).toBeTruthy();
      expect(entry.openGraph.image).toMatch(/^https:\/\/robot-wiki\.com\/og\//);
      expect(entry.openGraph).toEqual(
        expect.objectContaining({ width: 1200, height: 630 }),
      );
      expect(entry.twitter.card).toBe('summary_large_image');
      expect(entry.twitter.image).toBe(entry.openGraph.image);
      expect(entry.manifest).toBeNull();
      expect(entry.icons).toEqual([]);
      expect(entry.themeColour).toBeNull();
      expect(entry.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(
      registry.metadata.find(({ routeId }) => routeId === 'route:/404/')
        ?.notFoundPolicy,
    ).toEqual({ publicContent: false, index: false });
  });

  it(
    'accounts for every physical asset through a registry or narrow identical-byte exception',
    () => {
      const physicalIds = execFileSync(
        'git',
        ['ls-files', '-z', 'public'],
        { cwd: ROOT, encoding: 'utf8' },
      )
        .split('\0')
        .filter(Boolean)
        .map((path) => relative('public', path))
        .filter((path) => ASSET_EXTENSIONS.has(extname(path).toLowerCase()))
        .filter(
          (path) =>
            !path.split('/').some((name) => isSyncConflictDuplicate(name)),
        )
        .filter(
          (path) =>
            !GENERATED_ASSET_PREFIXES.some((prefix) => path.startsWith(prefix)),
        )
        .map((path) => `asset:${path}`)
        .sort();
      const accounted = new Set([
        ...registry.assets.map(({ path }) => path),
        ...registry.assetExceptions.map(({ id }) =>
          id.replace(/^asset-exception:/, ''),
        ),
      ]);
      expect(accounted).toEqual(
        new Set(physicalIds.map((id) => id.replace(/^asset:/, ''))),
      );
      expect(
        validateExactRegistryParity(
          physicalIds,
          registry.assets.map(({ id }) => id),
          registry.assetUses,
        ),
      ).toEqual([]);
      expect(
        validateExactRegistryParity(
          physicalIds.slice(1),
          registry.assets.map(({ id }) => id),
          registry.assetUses,
        ),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ reason: 'registered-file-missing' }),
        ]),
      );
      expect(
        validateExactRegistryParity(
          [...physicalIds, 'asset:fake-mutation-proof.png'],
          registry.assets.map(({ id }) => id),
          registry.assetUses,
        ),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ reason: 'unregistered-physical-asset' }),
        ]),
      );
      for (const asset of registry.assets) {
        expect(asset.ownershipId).toBeTruthy();
        expect(asset.byteHash).toMatch(/^[a-f0-9]{64}$/);
        if (asset.path.endsWith('.svg')) {
          expect(asset.semanticHash).toMatch(/^[a-f0-9]{64}$/);
        }
      }
      for (const exception of registry.assetExceptions) {
        expect(exception.reason).toMatch(/sync shadow/i);
        const duplicate = readFileSync(
          join(ROOT, 'public', exception.id.replace(/^asset-exception:/, '')),
        );
        const canonical = readFileSync(
          join(ROOT, 'public', exception.canonicalPath),
        );
        expect(duplicate).toEqual(canonical);
      }
    },
    15_000,
  );

  it('registers non-empty control, grid/device, surface, page-frame, and four type-role populations', () => {
    for (const population of [
      registry.controls,
      registry.gridDevices,
      registry.surfaces,
      registry.pageFrames,
      registry.typeRoles,
    ]) {
      expect(population.length).toBeGreaterThan(0);
      expect(new Set(population.map(({ id }) => id)).size).toBe(
        population.length,
      );
      expect(
        population.every(({ fingerprint }) =>
          /^[a-f0-9]{64}$/.test(fingerprint),
        ),
      ).toBe(true);
    }
    expect(new Set(registry.typeRoles.map(({ family }) => family))).toEqual(
      new Set([
        'Tektur Variable',
        'IBM Plex Sans',
        'Newsreader',
        'IBM Plex Mono',
      ]),
    );
    expect(registry.rootFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});
