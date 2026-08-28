import {
  lstatSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extname, join, relative } from 'node:path';
import { DOMAINS, DOMAIN_META, publishedModules } from '../data/modules.ts';
import { IMAGES } from '../data/images.ts';
import {
  FIRST_PARTY_TYPE_ROLES,
  TEKTUR_ASSIGNED_STRINGS,
  TEKTUR_OG_ROLE_ID,
  TEKTUR_ROLE_INSTANCES,
} from '../data/type-roles.ts';
import { referencedImageIds } from '../lib/images.ts';
import {
  configurationFingerprint,
  reconcileNamedSets,
  validateExactRegistryParity,
  validateInteractiveRegistry,
  validateNoInventedSymbols,
  validatePrimitiveRegistries,
  type JsonValue,
  type StateCase,
} from '../lib/brand-v2-census.ts';
import {
  articleCardPath,
  OG_CARD_HEIGHT,
  OG_CARD_WIDTH,
  SITE_CARD_PATH,
  SITE_URL_ORIGIN,
} from '../lib/og-cards.ts';
import { SITE_URL } from '../lib/site.ts';
import { isSyncConflictDuplicate } from '../lib/sync-duplicates.ts';

const ROOT = join(import.meta.dirname, '..');
const OUTPUT = join(ROOT, 'contract', 'brand-v2-registries.json');
const PUBLIC_FIXED_ROUTES = [
  '/',
  '/a-z/',
  '/market-map/',
  '/playground/',
  '/glossary/',
  '/credits/',
  '/search/',
] as const;
const GENERATED_ASSET_PREFIXES = ['og/', 'pagefind/'];
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

function source(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8').replace(/\r\n/g, '\n');
}

function filesUnder(directory: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...filesUnder(path));
    else files.push(path);
  }
  return files;
}

function isSyncShadowPath(path: string, root: string): boolean {
  return relative(root, path)
    .split('/')
    .some((name) => isSyncConflictDuplicate(name));
}

function gitTrackedPublicFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z', 'public'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((path) => join(ROOT, path))
    .sort();
}

function isGeneratedAsset(path: string): boolean {
  const rel = relative(join(ROOT, 'public'), path);
  return GENERATED_ASSET_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

function trackedAssetFiles(): string[] {
  return gitTrackedPublicFiles()
    .filter((path) => ASSET_EXTENSIONS.has(extname(path).toLowerCase()))
    .filter((path) => !isGeneratedAsset(path));
}

const TRACKED_ASSET_FILES = trackedAssetFiles();

function stableRecord<T extends Record<string, unknown>>(record: T): T & {
  fingerprint: string;
} {
  return {
    ...record,
    fingerprint: configurationFingerprint(record),
  };
}

function routePath(domain: string, slug?: string): string {
  return `/${domain}/${slug ? `${slug}/` : ''}`;
}

function publicRoutes(): string[] {
  return [
    ...PUBLIC_FIXED_ROUTES,
    ...DOMAINS.map((domain) => routePath(domain)),
    ...publishedModules().map(({ domain, slug }) => routePath(domain, slug)),
  ].sort();
}

function appInventory(): string[] {
  const staticPages = filesUnder(join(ROOT, 'app'))
    .filter((path) => path.endsWith('/page.tsx'))
    .map((path) =>
      relative(join(ROOT, 'app'), path).replace(/(?:^|\/)page\.tsx$/, ''),
    )
    .filter((path) => !path.startsWith('(content)/['))
    .map((path) => (path ? `/${path}/` : '/'));
  return [
    ...staticPages,
    ...DOMAINS.map((domain) => routePath(domain)),
    ...publishedModules().map(({ domain, slug }) => routePath(domain, slug)),
  ].sort();
}

function sitemapInventory(): string[] {
  const sitemapSource = source('app/sitemap.ts');
  const literalPaths = [
    ...sitemapSource.matchAll(/'((?:\/[a-z-]+)+\/)'/g),
  ].map((match) => match[1]);
  return [
    '/',
    ...literalPaths,
    ...DOMAINS.map((domain) => routePath(domain)),
    ...publishedModules().map(({ domain, slug }) => routePath(domain, slug)),
  ].sort();
}

function exportInventory(): string[] | null {
  try {
    const outputRoot = join(ROOT, 'out');
    const html = filesUnder(outputRoot)
      .filter((path) => !isSyncShadowPath(path, outputRoot))
      .filter((path) => path.endsWith('.html'));
    return html
      .map((path) => {
        const rel = relative(join(ROOT, 'out'), path);
        if (rel === 'index.html') return '/';
        if (rel === '404.html' || rel === '404/index.html') return null;
        return `/${rel.replace(/\/index\.html$/, '/').replace(/\.html$/, '/')}`;
      })
      .filter((path): path is string => path !== null)
      .sort();
  } catch {
    return null;
  }
}

function titleAndDescription(path: string): {
  title: string;
  description: string;
  kind: 'article' | 'destination';
} {
  const article = publishedModules().find(
    ({ domain, slug }) => routePath(domain, slug) === path,
  );
  if (article) {
    return {
      title: article.title,
      description: article.summary,
      kind: 'article',
    };
  }
  const domain = DOMAINS.find((value) => routePath(value) === path);
  if (domain) {
    return {
      title: DOMAIN_META[domain].name,
      description: DOMAIN_META[domain].description,
      kind: 'destination',
    };
  }
  const fixed: Record<string, [string, string]> = {
    '/': ['robot-wiki', 'An encyclopedic interactive guide to modern robotics for ML engineers.'],
    '/a-z/': ['A-Z Index', 'Every published robot-wiki article and glossary term in one alphabetical list.'],
    '/market-map/': ['Market Map', 'The embodied-AI industry as data: companies across six segments, filterable by approach, geography, stage, and funding.'],
    '/playground/': ['3D Kinematics Playground', 'A SO-101 robot arm rendered from its URDF in the browser: joint sliders for forward kinematics, click-to-reach inverse kinematics, and trajectory record/replay.'],
    '/glossary/': ['Glossary', 'Cited definitions of the robotics and machine-learning terms used across robot-wiki.'],
    '/credits/': ['Credits', 'Every photograph and diagram on robot-wiki, with its creator, source, and licence.'],
    '/search/': ['Search', 'Search robot-wiki: full-text over article prose plus the structured data layer (methods, companies, datasets).'],
  };
  const value = fixed[path];
  if (!value) throw new Error(`Missing fixed-route metadata owner for ${path}`);
  return { title: value[0], description: value[1], kind: 'destination' };
}

function metadataLedger() {
  const fixedOwners: Record<string, string> = {
    '/': 'app/layout.tsx',
    '/a-z/': 'app/a-z/page.tsx',
    '/market-map/': 'app/market-map/page.tsx',
    '/playground/': 'app/playground/page.tsx',
    '/glossary/': 'app/glossary/page.tsx',
    '/credits/': 'app/credits/page.tsx',
    '/search/': 'app/search/page.tsx',
  };
  return [
    ...publicRoutes().map((path) => {
      const value = titleAndDescription(path);
      const article = publishedModules().find(
        ({ domain, slug }) => routePath(domain, slug) === path,
      );
      const imagePath = article
        ? articleCardPath(article.domain, article.slug)
        : SITE_CARD_PATH;
      const ownerPath = article
        ? 'app/(content)/[domain]/[slug]/page.tsx'
        : DOMAINS.some((domain) => routePath(domain) === path)
          ? 'app/(content)/[domain]/page.tsx'
          : fixedOwners[path];
      return stableRecord({
        id: `metadata:${path}`,
        routeId: `route:${path}`,
        owner: article ? `module:${article.domain}/${article.slug}` : `route:${path}`,
        ownerPath,
        ownerSourceFingerprint: configurationFingerprint(source(ownerPath)),
        canonical: `${SITE_URL}${path}`,
        title: value.title,
        description: value.description,
        openGraph: {
          type: value.kind === 'article' ? 'article' : 'website',
          url: `${SITE_URL}${path}`,
          image: `${SITE_URL_ORIGIN}${imagePath}`,
          width: OG_CARD_WIDTH,
          height: OG_CARD_HEIGHT,
        },
        twitter: {
          card: 'summary_large_image',
          image: `${SITE_URL_ORIGIN}${imagePath}`,
        },
        jsonLd:
          article ||
          path === '/a-z/' ||
          DOMAINS.some((domain) => routePath(domain) === path)
            ? ['BreadcrumbList']
            : [],
        manifest: null,
        icons: [],
        themeColour: null,
        notFoundPolicy: null,
      });
    }),
    stableRecord({
      id: 'metadata:/404/',
      routeId: 'route:/404/',
      owner: 'app/not-found.tsx',
      ownerPath: 'app/not-found.tsx',
      ownerSourceFingerprint: configurationFingerprint(source('app/not-found.tsx')),
      canonical: `${SITE_URL}/404/`,
      title: 'Page not found',
      description: null,
      openGraph: {
        type: 'website',
        url: `${SITE_URL}/404/`,
        image: `${SITE_URL_ORIGIN}${SITE_CARD_PATH}`,
        width: OG_CARD_WIDTH,
        height: OG_CARD_HEIGHT,
      },
      twitter: {
        card: 'summary_large_image',
        image: `${SITE_URL_ORIGIN}${SITE_CARD_PATH}`,
      },
      jsonLd: [],
      manifest: null,
      icons: [],
      themeColour: null,
      notFoundPolicy: { publicContent: false, index: false },
    }),
  ];
}

function sourceComponentName(text: string, path: string): string {
  const match = text.match(/^export function ([A-Z][A-Za-z0-9]*)/m);
  if (!match) throw new Error(`No exported interactive component in ${path}`);
  return match[1];
}

function stateCases(text: string): StateCase[] {
  const cases: StateCase[] = [
    { id: 'default', kind: 'default' },
    {
      id: 'focus-each-control',
      kind: 'focus',
      selector: 'button, input, select, summary, [tabindex]',
      expectedEnumeration: 'every rendered enabled control independently',
    },
  ];
  if (/<button\b/.test(text)) {
    cases.push({
      id: 'meaningful-hover',
      kind: 'hover',
      selector: 'button:not(:disabled)',
      expectedEnumeration: 'every rendered button with a hover treatment',
    });
  } else {
    cases.push({
      id: 'hover-not-applicable',
      kind: 'exception',
      notApplicableReason: 'No button or registered hover target is implemented.',
    });
  }
  if (/type=["']range["']/.test(text)) {
    cases.push({
      id: 'slider-boundaries-and-anchors',
      kind: 'slider-boundaries',
      selector: 'input[type="range"]',
      expectedEnumeration:
        'each slider at min, documented default, max, source anchors, and registered discontinuities',
    });
  }
  if (/aria-(?:pressed|selected)|type=["'](?:radio|checkbox)["']|<select\b|<details\b/.test(text)) {
    cases.push({
      id: 'discrete-options',
      kind: 'discrete-options',
      selector:
        '[aria-pressed], [aria-selected], input[type="radio"], input[type="checkbox"], select, details',
      expectedEnumeration: 'every rendered discrete option independently',
    });
  }
  if (/reset/i.test(text)) cases.push({ id: 'reset', kind: 'reset' });
  const independentControlKinds = [
    /type=["']range["']/.test(text),
    /aria-(?:pressed|selected)|type=["'](?:radio|checkbox)["']|<select\b/.test(text),
  ].filter(Boolean).length;
  if (independentControlKinds > 1) {
    cases.push({
      id: 'pairwise-independent-controls',
      kind: 'pairwise',
      expectedEnumeration:
        'deterministic IPOG pairwise combinations, seed brand-v2-state-v1',
    });
  }
  for (const state of ['loading', 'error', 'empty', 'unavailable'] as const) {
    if (new RegExp(`\\b${state}\\b`, 'i').test(text)) {
      cases.push({
        id: `${state}-witness`,
        kind: 'discrete-options',
        expectedEnumeration: `one deterministic implemented ${state} witness`,
      });
    } else {
      cases.push({
        id: `${state}-not-applicable`,
        kind: 'exception',
        notApplicableReason: `Source does not implement a ${state} state.`,
      });
    }
  }
  return cases;
}

function interactiveRegistry() {
  const sources = filesUnder(join(ROOT, 'components', 'interactive'))
    .filter((path) => ['.ts', '.tsx'].includes(extname(path)))
    .map((path) => {
      const relativePath = relative(ROOT, path);
      const text = readFileSync(path, 'utf8');
      const component = sourceComponentName(text, relativePath);
      const cases = stateCases(text);
      return stableRecord({
        id: `interactive:${component}`,
        component,
        sourcePath: relativePath,
        cases,
        expectedCaseCount: cases.length,
      });
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  const sourceByComponent = new Map(
    sources.map((entry) => [entry.component, entry]),
  );
  const mountFiles = [
    ...filesUnder(join(ROOT, 'content')).filter((path) => path.endsWith('.mdx')),
    join(ROOT, 'app', 'page.tsx'),
  ];
  const mounts = [];
  const importPattern =
    /import\s+\{\s*([A-Z][A-Za-z0-9]*)\s*\}\s+from\s+['"]@\/components\/interactive\/[^'"]+['"]/g;
  for (const path of mountFiles) {
    const text = readFileSync(path, 'utf8');
    const relativePath = relative(ROOT, path);
    for (const importMatch of text.matchAll(importPattern)) {
      const component = importMatch[1];
      const registeredSource = sourceByComponent.get(component);
      if (!registeredSource) {
        throw new Error(`Mount imports unregistered interactive ${component}`);
      }
      const mountPattern = new RegExp(`<${component}\\b([^>]*)\\/?\\s*>`, 'g');
      let match: RegExpExecArray | null;
      let ordinal = 0;
      while ((match = mountPattern.exec(text))) {
        ordinal += 1;
        const props = match[1].replace(/\s+/g, ' ').trim();
        const route = relativePath === 'app/page.tsx'
          ? '/'
          : `/${relativePath.replace(/^content\//, '').replace(/\.mdx$/, '/')}`;
        mounts.push(
          stableRecord({
            id: `mount:${route}:${component}:${ordinal}`,
            sourceId: registeredSource.id,
            route,
            ownerPath: relativePath,
            ordinal,
            props,
            cases: registeredSource.cases,
            expectedCaseCount: registeredSource.expectedCaseCount,
          }),
        );
      }
    }
  }
  mounts.sort((left, right) => left.id.localeCompare(right.id));
  return { sources, mounts };
}

function staticRegistries() {
  const gridDevices = [
    {
      id: 'device:outer-rail',
      ownerSurface: 'shared-shell',
      structuralPurpose: 'content-frame-boundary',
      anchorGeometry: { kind: 'edge', allowedEdges: ['left', 'right'] },
      classification: 'structural',
      ariaBehavior: 'aria-hidden when decorative; owner landmark carries meaning',
    },
    {
      id: 'device:section-rule',
      ownerSurface: 'shared-section',
      structuralPurpose: 'section-start-or-apparatus-boundary',
      anchorGeometry: { kind: 'edge', allowedEdges: ['top', 'bottom'] },
      classification: 'structural',
      ariaBehavior: 'aria-hidden; adjacent heading carries meaning',
    },
    {
      id: 'device:registration-cross',
      ownerSurface: 'registered-surface',
      structuralPurpose: 'real-layout-anchor',
      anchorGeometry: { kind: 'intersection', axes: ['center-x', 'center-y'] },
      classification: 'decorative',
      ariaBehavior: 'aria-hidden',
    },
    {
      id: 'device:axis-tick',
      ownerSurface: 'visualization',
      structuralPurpose: 'source-backed-axis-or-state',
      anchorGeometry: { kind: 'axis', sourceRequired: true },
      classification: 'semantic',
      ariaBehavior: 'named by the bound chart description or table equivalent',
    },
    {
      id: 'device:sequence-label',
      ownerSurface: 'indexed-content',
      structuralPurpose: 'real-order-or-state',
      anchorGeometry: { kind: 'baseline', sequenceRequired: true },
      classification: 'semantic',
      ariaBehavior: 'visible text remains in the accessibility tree',
    },
    {
      id: 'device:dot-grid',
      ownerSurface: 'instrument-or-index',
      structuralPurpose: 'registered-grid-boundary',
      anchorGeometry: { kind: 'surface-bounds', pitchPx: 32 },
      classification: 'decorative',
      ariaBehavior: 'aria-hidden',
    },
  ].map((entry) =>
    stableRecord({
      ...entry,
      pointerBehavior: 'none',
      allowedViewports: ['mobile', 'tablet', 'desktop'],
      alignmentTolerancePx: 2,
    }),
  );
  const surfaces = [
    {
      id: 'surface:flat',
      level: 'flat',
      stackingPurpose: 'content-plane',
      allowedRadiusPx: [0, 2, 4, 8],
      border: { allowedWidthsPx: [0, 1], styles: ['solid', 'dashed'] },
      shadow: { neutralOnly: true, maxBlurPx: 0, maxAlpha: 0 },
      allowedOwners: ['article', 'card', 'callout', 'table', 'input', 'code'],
    },
    {
      id: 'surface:raised',
      level: 'raised',
      stackingPurpose: 'actionable-or-selected',
      allowedRadiusPx: [4, 8, 16],
      border: { allowedWidthsPx: [0, 1, 2], styles: ['solid'] },
      shadow: { neutralOnly: true, maxBlurPx: 8, maxAlpha: 0.12 },
      allowedOwners: ['actionable-card', 'calculator', 'active-module'],
    },
    {
      id: 'surface:floating',
      level: 'floating',
      stackingPurpose: 'temporary-overlay',
      allowedRadiusPx: [4, 8, 16],
      border: { allowedWidthsPx: [0, 1], styles: ['solid'] },
      shadow: { neutralOnly: true, maxBlurPx: 20, maxAlpha: 0.18 },
      allowedOwners: ['tooltip', 'menu', 'drawer', 'modal', 'dragged-object'],
    },
    {
      id: 'surface:bounded-dark-instrument',
      level: 'bounded-dark',
      stackingPurpose: 'technical-instrument',
      allowedRadiusPx: [0, 2, 4, 8],
      border: { allowedWidthsPx: [1], styles: ['solid'] },
      shadow: { neutralOnly: true, maxBlurPx: 0, maxAlpha: 0 },
      allowedOwners: ['chart', 'diagram', 'simulation', 'code', 'media', 'playground'],
    },
  ].map(stableRecord);
  const pageFrames = [
    ['frame:mobile', 4, 20],
    ['frame:tablet', 8, 32],
    ['frame:desktop', 12, 48],
  ].map(([id, columns, minimumPaddingPx]) =>
    stableRecord({
      id,
      columns,
      minimumPaddingPx,
      baseRhythmPx: 8,
      fineAlignmentPx: 4,
    }),
  );
  const typeRoles = FIRST_PARTY_TYPE_ROLES.map((role) =>
    stableRecord(
      role.id === 'display'
        ? {
            id: `type:${role.id}`,
            family: role.family,
            variableAxes: ['wdth', 'wght'],
            instances: TEKTUR_ROLE_INSTANCES,
            ogRoleId: TEKTUR_OG_ROLE_ID,
            assignedStringCount: TEKTUR_ASSIGNED_STRINGS.length,
          }
        : { id: `type:${role.id}`, family: role.family },
    ),
  );
  const controls = [
    {
      id: 'control:primary-action',
      treatment: 'ink-filled',
      statePurpose: 'action',
      action: 'activate the page or tool primary action',
      persistentAria: [],
      supportedStates: ['default', 'hover', 'active', 'focus-visible', 'disabled'],
    },
    {
      id: 'control:secondary-action',
      treatment: 'outlined-or-transparent',
      statePurpose: 'action',
      action: 'activate a supporting action',
      persistentAria: [],
      supportedStates: ['default', 'hover', 'active', 'focus-visible', 'disabled'],
    },
    {
      id: 'control:selection',
      treatment: 'lime-plus-non-colour-marker',
      statePurpose: 'persistent-selection',
      action: 'select or toggle one persistent state',
      persistentAria: ['aria-pressed', 'aria-selected', 'aria-current'],
      supportedStates: ['unselected', 'selected', 'hover', 'focus-visible', 'disabled'],
    },
    {
      id: 'control:link-focus',
      treatment: 'signal-plus-non-colour-affordance',
      statePurpose: 'information-path',
      action: 'navigate to a truthful destination',
      persistentAria: ['aria-current when the destination is current'],
      supportedStates: ['default', 'hover', 'focus-visible', 'visited'],
    },
    {
      id: 'control:segmented',
      treatment: 'one-outer-frame',
      statePurpose: 'discrete-selection',
      action: 'select one option from a compact group',
      persistentAria: ['aria-selected or aria-pressed on the active option'],
      supportedStates: ['unselected', 'selected', 'hover', 'focus-visible', 'disabled'],
    },
    {
      id: 'control:input',
      treatment: 'persistent-visible-label',
      statePurpose: 'input',
      action: 'enter or adjust a labelled value',
      persistentAria: ['aria-invalid', 'aria-describedby'],
      supportedStates: ['default', 'focus-visible', 'filled', 'invalid', 'disabled'],
    },
    {
      id: 'control:disabled',
      treatment: 'documented-neutral',
      statePurpose: 'unavailable-action',
      action: 'expose an unavailable action without activation',
      persistentAria: ['disabled or aria-disabled'],
      supportedStates: ['disabled'],
      disabledException: 'neutral treatment; excluded from active-action colour requirements',
    },
  ].map((entry) =>
    stableRecord({
      ...entry,
      ownerRouteOrMount: 'shared primitive; concrete owner supplied at render',
      disabledException: entry.disabledException ?? null,
      targetSize: { minimumPx: 24, preferredPx: 44, inlineException: false },
      pointerAlternative: 'native pointer activation matching keyboard activation',
    }),
  );
  const materials = [
    {
      id: 'material:paper',
      treatment: 'texture-free reading ground',
      deterministic: true,
      ownership: 'owned',
    },
    {
      id: 'material:concrete',
      treatment: 'owned monochrome SVG micro-texture',
      deterministic: true,
      ownership: 'owned',
    },
    {
      id: 'material:halftone',
      treatment: 'owned monochrome SVG dot field',
      deterministic: true,
      ownership: 'owned',
    },
  ].map(stableRecord);
  return {
    gridDevices,
    surfaces,
    pageFrames,
    typeRoles,
    controls,
    materials,
  };
}

function syncShadowException(path: string): null | {
  id: string;
  canonicalPath: string;
  reason: string;
  byteHash: string;
} {
  const publicRoot = join(ROOT, 'public');
  if (!isSyncShadowPath(path, publicRoot)) return null;
  const rel = relative(publicRoot, path);
  const match = rel.match(/^(.*) [0-9]+(\.[^.]+)$/);
  if (!match) return null;
  const canonicalPath = `${match[1]}${match[2]}`;
  try {
    const bytes = readFileSync(path);
    const canonicalBytes = readFileSync(join(ROOT, 'public', canonicalPath));
    const byteHash = configurationFingerprint(bytes);
    if (byteHash !== configurationFingerprint(canonicalBytes)) return null;
    return {
      id: `asset-exception:${rel}`,
      canonicalPath,
      reason:
        'Ignored Finder/iCloud sync shadow with bytes identical to the registered canonical asset.',
      byteHash,
    };
  } catch {
    return null;
  }
}

function assetExceptions() {
  return TRACKED_ASSET_FILES
    .map(syncShadowException)
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .map(stableRecord)
    .sort((left, right) => left.id.localeCompare(right.id));
}

function physicalAssets(): string[] {
  const publicRoot = join(ROOT, 'public');
  return TRACKED_ASSET_FILES.flatMap((path) => {
    if (syncShadowException(path) !== null) return [];
    try {
      const rel = relative(publicRoot, path);
      return [
        `${lstatSync(path).isSymbolicLink() ? 'symlink:' : ''}asset:${rel}`,
      ];
    } catch {
      return [];
    }
    })
    .sort();
}

function assetRegistry() {
  const imageByFile = new Map(
    IMAGES.map((image) => [image.file.replace(/^\//, ''), image]),
  );
  return physicalAssets()
    .map((physicalId) => physicalId.replace(/^symlink:/, ''))
    .map((id) => {
      const path = id.replace(/^asset:/, '');
      const image = imageByFile.get(path);
      const category = path.startsWith('images/logos/')
        ? 'official-mark'
        : path.startsWith('images/')
          ? 'editorial-image'
          : path.startsWith('models/')
            ? 'playground-model'
            : path.startsWith('fonts/')
              ? 'font'
              : 'static-asset';
      return stableRecord({
        id,
        path,
        category,
        ownershipId: image ? `image:${image.id}` : `owner:${category}`,
        sourceRegistryId: image?.id ?? null,
        byteHash: configurationFingerprint(readFileSync(join(ROOT, 'public', path))),
        semanticHash:
          extname(path).toLowerCase() === '.svg'
            ? configurationFingerprint(
                readFileSync(join(ROOT, 'public', path), 'utf8')
                  .replace(/<!--[\s\S]*?-->/g, '')
                  .replace(
                    /\s(?:class|style|fill|stroke|stroke-width|opacity)=["'][^"']*["']/g,
                    '',
                  )
                  .replace(/>\s+</g, '><')
                  .replace(/\s+/g, ' ')
                  .trim(),
              )
            : null,
      });
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

function assetUses(assets: ReturnType<typeof assetRegistry>): string[] {
  const used = new Set<string>();
  const imageById = new Map(IMAGES.map((image) => [image.id, image.file]));
  const sourceFiles = [
    ...filesUnder(join(ROOT, 'app')),
    ...filesUnder(join(ROOT, 'components')),
    ...filesUnder(join(ROOT, 'content')),
    ...filesUnder(join(ROOT, 'lib')),
    ...filesUnder(join(ROOT, 'data')),
  ].filter((path) => ['.css', '.mdx', '.ts', '.tsx'].includes(extname(path)));
  for (const path of sourceFiles) {
    const text = readFileSync(path, 'utf8');
    for (const imageId of referencedImageIds(text)) {
      const file = imageById.get(imageId);
      if (file) used.add(`asset:${file.replace(/^\//, '')}`);
    }
    for (const asset of assets) {
      if (
        text.includes(`/${asset.path}`) ||
        text.includes(asset.path) ||
        (asset.sourceRegistryId && text.includes(asset.sourceRegistryId))
      ) {
        used.add(asset.id);
      }
    }
  }
  // Registry-backed official marks are rendered through data/logos.ts.
  for (const asset of assets.filter(({ category }) => category === 'official-mark')) {
    used.add(asset.id);
  }
  // All SO-101 assets are dependencies of the registered URDF/model loader.
  for (const asset of assets.filter(({ category }) => category === 'playground-model')) {
    used.add(asset.id);
  }
  // Checked-in fonts are owned delivery assets even before v2 runtime wiring.
  for (const asset of assets.filter(({ category }) => category === 'font')) {
    used.add(asset.id);
  }
  return [...used].sort();
}

function collect() {
  const routes = publicRoutes();
  const metadata = metadataLedger();
  const interactive = interactiveRegistry();
  const staticEntries = staticRegistries();
  const assets = assetRegistry();
  const exceptions = assetExceptions();
  const exportRoutes = exportInventory();

  const failures = [
    ...reconcileNamedSets({
      fixedAndModuleRegistry: routes,
      appInventory: appInventory(),
      sitemap: sitemapInventory(),
      metadataLedger: metadata
        .filter(({ routeId }) => routeId !== 'route:/404/')
        .map(({ routeId }) => routeId.replace(/^route:/, '')),
      ...(exportRoutes ? { exportFiles: exportRoutes } : {}),
    }),
    ...validateInteractiveRegistry(interactive.sources, interactive.mounts),
    ...validatePrimitiveRegistries(staticEntries),
    ...validateExactRegistryParity(
      physicalAssets(),
      assets.map(({ id }) => id),
      assetUses(assets),
    ),
    ...validateNoInventedSymbols([
      ...assets.map(({ path }) => path),
      ...filesUnder(join(ROOT, 'app')).map((path) => relative(ROOT, path)),
      source('app/layout.tsx'),
      source('app/not-found.tsx'),
    ]),
  ];
  if (failures.length > 0) {
    throw new Error(JSON.stringify(failures, null, 2));
  }

  const registry = {
    schemaVersion: 1,
    generatedBy: 'scripts/brand-v2-census.ts',
    routes: {
      public: routes.map((path) =>
        stableRecord({
          id: `route:${path}`,
          path,
          publicContent: true,
          routeKind: publishedModules().some(
            ({ domain, slug }) => routePath(domain, slug) === path,
          )
            ? 'article'
            : 'destination',
        }),
      ),
      notFound: stableRecord({
        id: 'route:/404/',
        path: '/404/',
        publicContent: false,
        routeKind: 'not-found',
      }),
    },
    metadata,
    assets,
    assetExceptions: exceptions,
    assetUses: assetUses(assets),
    interactive,
    ...staticEntries,
  };
  return {
    ...registry,
    rootFingerprint: configurationFingerprint(registry as unknown as JsonValue),
  };
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const registry = collect();
  const serialized = `${JSON.stringify(registry, null, 2)}\n`;
  if (args.has('--write')) {
    writeFileSync(OUTPUT, serialized);
    console.log(
      `brand-v2 census: wrote ${relative(ROOT, OUTPUT)} (${registry.routes.public.length} public routes, ${registry.interactive.sources.length} sources, ${registry.interactive.mounts.length} mounts, ${registry.assets.length} assets)`,
    );
    return;
  }
  if (args.has('--check')) {
    const committed = readFileSync(OUTPUT, 'utf8');
    const committedRegistry = JSON.parse(committed) as {
      assets: Array<{ id: string }>;
      assetUses: string[];
    };
    const parityFailures = validateExactRegistryParity(
      physicalAssets(),
      committedRegistry.assets.map(({ id }) => id),
      committedRegistry.assetUses,
    );
    if (parityFailures.length > 0) {
      throw new Error(JSON.stringify(parityFailures, null, 2));
    }
    if (committed !== serialized) {
      throw new Error(
        'brand-v2 registry drift: run npm run generate:brand-v2-registries',
      );
    }
    console.log(
      `brand-v2 census: OK (${registry.routes.public.length} public routes + separate 404, ${registry.interactive.sources.length} sources, ${registry.interactive.mounts.length} mounts, ${registry.assets.length} assets)`,
    );
    return;
  }
  throw new Error('Usage: --write or --check');
}

main();
