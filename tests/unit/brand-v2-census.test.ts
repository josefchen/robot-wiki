import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { DOMAINS, publishedModules } from '@/data/modules';
import { scanAnnotationAssignments } from '@/lib/brand-v2-annotation-scan';
import {
  APPROVED_TAB_ICONS,
  IMPLEMENTED_STATES,
  configurationFingerprint,
  implementsState,
  isApprovedTabIconDeclaration,
  stateCensusText,
  reconcileNamedSets,
  validateApprovedTabIcons,
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
const GENERATED_ASSET_PREFIXES = ['og/', 'pagefind/', 'structured-images/'];
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
    const invented = [
      'public/favicon.ico',
      'public/rw-monogram.svg',
      'public/robot-head-logo.svg',
      'app/manifest.ts:maskable',
      'public/apple-touch-icon.png',
      'public/images/apple-icon.png',
      'app/icon.png',
      'app/icon1.svg',
      'app/about/apple-icon.png',
      'app/(content)/[domain]/icon.tsx',
      'app/glossary/favicon.ico',
    ];
    expect(
      validateNoInventedSymbols(invented).map(({ memberId, reason }) => [memberId, reason]),
    ).toEqual(invented.map((path) => [path, 'invented-brand-symbol']));
    expect(
      validateNoInventedSymbols([
        'app/layout.tsx',
        'app/opengraph-image.tsx',
        'components/ui/icon-button.tsx',
        'public/images/diagram.svg',
      ]),
    ).toEqual([]);
  });

  // Josef, 2026-10-12: "ensure we fix the favicon". The one exception to the
  // sealed identity's empty icon slots is this set, with these bytes.
  it('admits exactly the owner-approved tab icon set and its bytes', () => {
    expect(APPROVED_TAB_ICONS.map(({ path, rel, href }) => [path, rel, href])).toEqual([
      ['app/favicon.ico', 'icon', '/favicon.ico'],
      ['app/icon.svg', 'icon', '/icon.svg'],
      ['app/apple-icon.png', 'apple-touch-icon', '/apple-icon.png'],
    ]);
    expect(validateNoInventedSymbols(APPROVED_TAB_ICONS.map(({ path }) => path))).toEqual([]);
    const read = (path: string) =>
      existsSync(join(ROOT, path)) ? readFileSync(join(ROOT, path)) : null;
    expect(validateApprovedTabIcons(read)).toEqual([]);
    for (const icon of APPROVED_TAB_ICONS) {
      expect(configurationFingerprint(readFileSync(join(ROOT, icon.path))), icon.path).toBe(icon.sha256);
    }
    expect(
      validateApprovedTabIcons((path) =>
        path === 'app/icon.svg' ? Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') : read(path),
      ).map(({ memberId, reason }) => [memberId, reason]),
    ).toEqual([['app/icon.svg', 'unapproved-tab-icon-bytes']]);
    expect(validateApprovedTabIcons(() => null).map(({ reason }) => reason)).toEqual(
      Array(3).fill('missing-approved-tab-icon'),
    );

    expect(isApprovedTabIconDeclaration('icon=/favicon.ico')).toBe(true);
    expect(isApprovedTabIconDeclaration('icon=/icon.svg?icon.0a1b2c3d.svg')).toBe(true);
    expect(isApprovedTabIconDeclaration('apple-touch-icon=/apple-icon.png?5e6f7a8b')).toBe(true);
    expect(isApprovedTabIconDeclaration('icon=/apple-icon.png')).toBe(false);
    expect(isApprovedTabIconDeclaration('shortcut icon=/favicon.ico')).toBe(false);
    expect(isApprovedTabIconDeclaration('mask-icon=/icon.svg')).toBe(false);
    expect(isApprovedTabIconDeclaration('manifest=/manifest.webmanifest')).toBe(false);
    expect(isApprovedTabIconDeclaration('icon=/images/logos/robot-wiki.svg')).toBe(false);
    expect(isApprovedTabIconDeclaration('icon=/favicon.ico.svg')).toBe(false);
  });

  it('draws the approved icons as the wordmark R in the paper and ink tokens', () => {
    const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const css = readFileSync(join(ROOT, 'app/globals.css'), 'utf8');
    const token = (name: string) =>
      css.match(new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1]?.toUpperCase();
    const ink = token('ink');
    const paper = token('paper');
    expect([ink, paper]).toEqual(['#1C1C1A', '#FAFAF8']);

    // The vector mark: a square viewBox, an ink rounded square and one
    // paper outline. The glyph is a path, so no font has to load, and the
    // file references nothing outside itself.
    const svg = readFileSync(join(ROOT, 'app/icon.svg'), 'utf8');
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 64 64">/);
    expect(svg).toContain(`<rect width="64" height="64" rx="14" fill="${ink}"/>`);
    expect(svg.match(/<path fill="([^"]+)" d="M[^"]+Z"\/>/)?.[1]).toBe(paper);
    expect(svg).not.toMatch(/<text|<image|<use|<style|<script|href=|url\(|@import|font/i);

    // favicon.ico: PNG entries at 16, 32 and 48 px.
    const ico = readFileSync(join(ROOT, 'app/favicon.ico'));
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2)]).toEqual([0, 1]);
    const entries = Array.from({ length: ico.readUInt16LE(4) }, (_, index) => {
      const entry = 6 + 16 * index;
      const offset = ico.readUInt32LE(entry + 12);
      const png = ico.subarray(offset, offset + ico.readUInt32LE(entry + 8));
      expect(png.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([ico[entry], ico[entry + 1]]);
      return ico[entry];
    });
    expect(entries).toEqual([16, 32, 48]);

    // apple-icon.png: 180 x 180 and opaque (colour type 2, RGB), so iOS
    // rounds full-bleed ink rather than transparent corners.
    const apple = readFileSync(join(ROOT, 'app/apple-icon.png'));
    expect(apple.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
    expect([apple.readUInt32BE(16), apple.readUInt32BE(20), apple[25]]).toEqual([180, 180, 2]);
  });

  it('reconciles fixed, domain, and article routes without counting 404 as public', () => {
    const expected = new Set([
      '/',
      '/a-z/',
      '/market-map/',
      '/playground/',
      '/how-robots-work/',
      '/glossary/',
      '/credits/',
      '/editorial-policy/',
      '/about/',
      '/privacy/',
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

  it('registers a reset case exactly where a source renders a reset action', () => {
    // "Preset" and "PresetGroup" contain the letters r-e-s-e-t and reset
    // nothing; only the shared reset action, a reset handler or a control
    // labelled Reset implements the case.
    const implementsReset = (text: string) =>
      /<InstrumentReset\b/.test(text) ||
      /\bonReset\b/.test(text) ||
      />\s*Reset\s*</.test(text);
    const withReset = registry.interactive.sources.filter(({ cases }) =>
      cases.some(({ kind }) => kind === 'reset'),
    );
    const renderingReset = registry.interactive.sources.filter(({ sourcePath }) =>
      implementsReset(stateCensusText(readFileSync(join(ROOT, sourcePath), 'utf8'))),
    );
    expect(renderingReset.length).toBeGreaterThan(0);
    expect(withReset.map(({ id }) => id)).toEqual(
      renderingReset.map(({ id }) => id),
    );
    const presetOnly = registry.interactive.sources.filter(({ sourcePath }) => {
      const text = stateCensusText(readFileSync(join(ROOT, sourcePath), 'utf8'));
      return /Preset/.test(text) && !implementsReset(text);
    });
    expect(presetOnly.length).toBeGreaterThan(0);
    for (const source of presetOnly) {
      expect(
        source.cases.some(({ kind }) => kind === 'reset'),
        `${source.id} only names presets, so it has no reset case`,
      ).toBe(false);
    }
    const sourceById = new Map(
      registry.interactive.sources.map((source) => [source.id, source]),
    );
    for (const mount of registry.interactive.mounts) {
      expect(mount.cases.some(({ kind }) => kind === 'reset')).toBe(
        sourceById.get(mount.sourceId)!.cases.some(({ kind }) => kind === 'reset'),
      );
    }
  });

  it('reads implemented states from code, never from a comment that names one', () => {
    const lines = (...text: string[]) => text.join('\n');
    expect(implementsState(lines('// The list is never empty.', 'export const rows = [1];'), 'empty')).toBe(false);
    expect(implementsState(lines('/**', ' * An explicit empty state with a clear-filter action.', ' */'), 'empty')).toBe(false);
    expect(implementsState('<div>{/* loading spinner removed */}<p>Ready</p></div>', 'loading')).toBe(false);
    expect(implementsState('<div data-state="empty">No rows match.</div>', 'empty')).toBe(true);
    expect(implementsState("const status = 'error';", 'error')).toBe(true);
    // JSX text apostrophes are not string quotes: the comment after them is still a comment.
    expect(
      implementsState(lines("<p>The robot's hand and the tool's grip.</p>", '{/* shown when unavailable */}'), 'unavailable'),
    ).toBe(false);
    // A URL's slashes inside a string are not a comment, so code after them still counts.
    expect(implementsState("const href = 'https://example.org'; const state = 'loading';", 'loading')).toBe(true);
  });

  it('registers a state witness exactly where the source code implements the state', () => {
    for (const source of registry.interactive.sources) {
      const text = readFileSync(join(ROOT, source.sourcePath), 'utf8');
      for (const state of IMPLEMENTED_STATES) {
        const ids = source.cases.map(({ id }) => id);
        expect(ids, `${source.id} ${state}`).toContain(
          implementsState(text, state) ? `${state}-witness` : `${state}-not-applicable`,
        );
      }
    }
    // RobotsPerGpu names "empty" only in its doc comment (tiles "fill or empty"); it renders no empty state.
    const robots = registry.interactive.sources.find(({ component }) => component === 'RobotsPerGpu')!;
    expect(robots.cases.map(({ id }) => id)).toContain('empty-not-applicable');
    expect(new RegExp('\\bempty\\b', 'i').test(readFileSync(join(ROOT, robots.sourcePath), 'utf8'))).toBe(true);
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
      // Every route, and the 404, declares the approved tab icon set.
      expect(entry.icons).toEqual(
        APPROVED_TAB_ICONS.map(({ path, rel, href, sha256 }) => ({
          rel,
          href,
          source: path,
          byteHash: sha256,
        })),
      );
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
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the web type roles are DM Sans, Geist and Geist Mono.
    expect(new Set(registry.typeRoles.map(({ family }) => family))).toEqual(
      new Set([
        'DM Sans',
        'Geist',
        'Geist Mono',
      ]),
    );
    expect(registry.rootFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});
