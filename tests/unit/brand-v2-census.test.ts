import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { DOMAINS, publishedModules } from '@/data/modules';
import { scanAnnotationAssignments } from '@/lib/brand-v2-annotation-scan';
import {
  configurationFingerprint,
  reconcileNamedSets,
  validateExactRegistryParity,
  validateInteractiveRegistry,
  validateNoInventedSymbols,
  validatePrimitiveRegistries,
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
  gridDevices: Array<{
    id: string;
    ownerSurface: string;
    structuralPurpose: string;
    anchorGeometry: unknown;
    classification: string;
    pointerBehavior: string;
    ariaBehavior: string;
    allowedViewports: string[];
    definedIn: string[];
    ownerRouteOrMount: string[];
    mountState: string;
    fingerprint: string;
  }>;
  surfaces: Array<{
    id: string;
    definedIn: string[];
    ownerRouteOrMount: string[];
    mountState: string;
    level: string;
    stackingPurpose: string;
    allowedRadiusPx: number[];
    border: unknown;
    shadow: unknown;
    allowedOwners: string[];
    fingerprint: string;
  }>;
  pageFrames: Array<{ id: string; fingerprint: string }>;
  typeRoles: Array<{ id: string; family: string; fingerprint: string }>;
  controls: Array<{
    id: string;
    definedIn: string[];
    mountState: string;
    ownerRouteOrMount: string[];
    action: string;
    persistentAria: string[];
    disabledException: string | null;
    targetSize: {
      minimumPx: number;
      preferredPx: number;
      exceptions: Array<{ kind: string; criterion: string; reason: string }>;
    };
    pointerAlternative: string;
    supportedStates: string[];
    fingerprint: string;
  }>;
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

  it('registers complete grid, surface, and control primitive contracts', () => {
    for (const device of registry.gridDevices) {
      expect(device.ownerSurface).toBeTruthy();
      expect(device.structuralPurpose).toBeTruthy();
      expect(device.anchorGeometry).toBeTruthy();
      expect(['decorative', 'semantic', 'structural']).toContain(
        device.classification,
      );
      expect(device.pointerBehavior).toBe('none');
      expect(device.ariaBehavior).toBeTruthy();
      expect(device.allowedViewports.length).toBeGreaterThan(0);
    }

    for (const surface of registry.surfaces) {
      expect(['flat', 'raised', 'floating', 'bounded-dark']).toContain(
        surface.level,
      );
      expect(surface.stackingPurpose).toBeTruthy();
      expect(surface.allowedRadiusPx.length).toBeGreaterThan(0);
      expect(surface.border).toBeTruthy();
      expect(surface.shadow).toBeTruthy();
      expect(surface.allowedOwners.length).toBeGreaterThan(0);
    }

    // The owner field used to read "shared primitive; concrete owner
    // supplied at render" on every row, which is a sentence about owners
    // rather than owner data: it cannot go stale and it cannot be wrong. It
    // then named every module containing the ID literal, which made an
    // unmounted library definition look like a shipped mount. Owners are now
    // the writers that supply the ID on a production route, and `mountState`
    // records the rest.
    //
    // The definition set is compared with the resolved annotation
    // assignments rather than with a substring search, because a finite
    // dynamic writer never contains its own ID as a literal:
    // components/ui/card.tsx assigns `surface:${level}` and
    // components/ui/brand-device.tsx assigns `device:${device}`.
    const scan = scanAnnotationAssignments(ROOT);
    expect(scan.writes.length).toBeGreaterThan(0);
    for (const row of [
      ...registry.gridDevices,
      ...registry.surfaces,
      ...registry.controls,
    ]) {
      expect(['production', 'library-only', 'unwritten']).toContain(
        row.mountState,
      );
      expect(row.definedIn).toBeInstanceOf(Array);
      expect(row.ownerRouteOrMount).toBeInstanceOf(Array);
      expect(
        [...row.definedIn].sort(),
        `${row.id} definedIn must equal its resolved annotation writers`,
      ).toEqual([...(scan.ownersById[row.id] ?? [])].sort());
      expect(
        [...row.ownerRouteOrMount].sort(),
        `${row.id} owners must equal the writers that supply it in production`,
      ).toEqual([...(scan.productionOwnersById[row.id] ?? [])].sort());
      for (const owner of row.definedIn) {
        expect(owner).not.toMatch(/shared primitive|supplied at render/i);
        expect(existsSync(join(ROOT, owner))).toBe(true);
        const writes = scan.writes.filter(
          (write) => write.module === owner && write.ids.includes(row.id),
        );
        expect(
          writes.length,
          `${owner} must contain a resolved assignment of ${row.id}`,
        ).toBeGreaterThan(0);
      }
      for (const owner of row.ownerRouteOrMount) {
        expect(row.definedIn).toContain(owner);
      }
      if (row.mountState === 'production') {
        expect(row.ownerRouteOrMount.length).toBeGreaterThan(0);
      } else {
        expect(row.ownerRouteOrMount).toEqual([]);
      }
      if (row.mountState === 'unwritten') expect(row.definedIn).toEqual([]);
      else expect(row.definedIn.length).toBeGreaterThan(0);
    }

    for (const control of registry.controls) {
      expect(control.action).toBeTruthy();
      expect(control.persistentAria).toBeInstanceOf(Array);
      expect(control.targetSize.minimumPx).toBe(24);
      expect(control.targetSize.preferredPx).toBeGreaterThanOrEqual(24);
      expect(control.targetSize.exceptions).toBeInstanceOf(Array);
      for (const exception of control.targetSize.exceptions) {
        expect(['inline', 'spacing', 'equivalent']).toContain(exception.kind);
        expect(exception.criterion).toMatch(/WCAG 2\.2 SC 2\.5\.8/);
        expect(exception.reason.trim().length).toBeGreaterThan(20);
      }
      expect(control.pointerAlternative).toBeTruthy();
      expect(control.supportedStates.length).toBeGreaterThan(0);
    }
    expect(validatePrimitiveRegistries(registry)).toEqual([]);
  });

  it('rejects missing fields and empty primitive registries', () => {
    const valid = {
      id: 'surface:flat',
      fingerprint: configurationFingerprint({ id: 'surface:flat' }),
    };
    const failures = validatePrimitiveRegistries({
      gridDevices: [],
      surfaces: [valid],
      controls: [],
    });
    expect(failures.map(({ reason }) => reason)).toEqual(
      expect.arrayContaining([
        'empty-primitive-registry',
        'missing-primitive-registry-field',
      ]),
    );
  });

  it('rejects narrated control owners and blanket target-size claims', () => {
    // A production-mounted row: the mount-state cases below have to be able
    // to move it in both directions, so the base row cannot already be the
    // library-only one.
    const control = registry.controls.find(
      (row) => row.mountState === 'production',
    ) as (typeof registry.controls)[number];
    const libraryOnly = registry.controls.find(
      (row) => row.mountState === 'library-only',
    ) as (typeof registry.controls)[number];
    const reasonsFor = (patch: Record<string, unknown>) =>
      validatePrimitiveRegistries({
        gridDevices: registry.gridDevices,
        surfaces: registry.surfaces,
        controls: [{ ...control, ...patch }],
      }).map(({ reason }) => reason);
    const libraryReasonsFor = (patch: Record<string, unknown>) =>
      validatePrimitiveRegistries({
        gridDevices: registry.gridDevices,
        surfaces: registry.surfaces,
        controls: [{ ...libraryOnly, ...patch }],
      }).map(({ reason }) => reason);

    expect(
      reasonsFor({
        definedIn: ['shared primitive; concrete owner supplied at render'],
        ownerRouteOrMount: [
          'shared primitive; concrete owner supplied at render',
        ],
      }),
    ).toContain('placeholder-control-owner');
    expect(reasonsFor({ ownerRouteOrMount: [] })).toContain(
      'mount-state-contradicts-owners',
    );
    expect(
      reasonsFor({ ownerRouteOrMount: 'components/ui/cite.tsx' }),
    ).toContain('invalid-control-owner');
    expect(
      reasonsFor({
        definedIn: ['node_modules/react'],
        ownerRouteOrMount: ['node_modules/react'],
      }),
    ).toContain('unresolvable-control-owner');
    // A row cannot claim an owner it never defined, and it cannot record a
    // mount state its own owner list contradicts.
    expect(
      reasonsFor({ ownerRouteOrMount: ['components/ui/skip-link.tsx'] }),
    ).toContain('owner-outside-definition-set');
    expect(reasonsFor({ mountState: 'library-only' })).toContain(
      'mount-state-contradicts-owners',
    );
    expect(reasonsFor({ mountState: 'mounted' })).toContain(
      'unrecognised-primitive-mount-state',
    );
    // The reverse direction: an unmounted library definition cannot upgrade
    // itself to a production mount while its owner list stays empty.
    expect(libraryReasonsFor({ mountState: 'production' })).toContain(
      'unowned-control-registry-row',
    );
    expect(
      reasonsFor({ targetSize: { ...control.targetSize, minimumPx: 20 } }),
    ).toContain('wrong-target-size-minimum');
    expect(
      reasonsFor({ targetSize: { minimumPx: 24, preferredPx: 44 } }),
    ).toContain('missing-target-size-exceptions');
    expect(
      reasonsFor({
        targetSize: {
          ...control.targetSize,
          exceptions: [
            {
              kind: 'inlineException',
              criterion: 'WCAG 2.2 SC 2.5.8',
              reason: 'the control is small',
            },
          ],
        },
      }),
    ).toContain('unrecognised-target-size-exception');
    expect(
      reasonsFor({
        targetSize: {
          ...control.targetSize,
          exceptions: [
            { kind: 'inline', criterion: 'WCAG 2.2 SC 2.5.8', reason: '  ' },
          ],
        },
      }),
    ).toContain('undocumented-target-size-exception');
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
