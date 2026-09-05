import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, extname, join, relative } from 'node:path';
import { DOMAINS, DOMAIN_META, publishedModules } from '../data/modules.ts';
import { IMAGES } from '../data/images.ts';
import {
  FIRST_PARTY_TYPE_ROLES,
  TEKTUR_ASSIGNED_STRINGS,
  TEKTUR_OG_ROLE_ID,
  TEKTUR_ROLE_INSTANCES,
} from '../data/type-roles.ts';
import { referencedImageIds } from '../lib/images.ts';
import { scanAnnotationAssignments } from '../lib/brand-v2-annotation-scan.ts';
import {
  componentElementTree,
  declaredComponentNames,
  importedNames,
  maskScriptComments,
} from '../lib/brand-v2-jsx-elements.ts';
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
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '../lib/identity.ts';
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
    '/': [PUBLIC_IDENTITY, PUBLIC_DESCRIPTOR],
    '/a-z/': ['A-Z Index', `Every published ${PUBLIC_IDENTITY} article and glossary term in one alphabetical list.`],
    '/market-map/': ['Market Map', 'The embodied-AI industry as data: companies across six segments, filterable by approach, geography, stage, and funding.'],
    '/playground/': ['3D Kinematics Playground', 'A SO-101 robot arm rendered from its URDF in the browser: joint sliders for forward kinematics, click-to-reach inverse kinematics, and trajectory record/replay.'],
    '/glossary/': ['Glossary', `Cited definitions of the robotics and machine-learning terms used across ${PUBLIC_IDENTITY}.`],
    '/credits/': ['Credits', `Every photograph and diagram on ${PUBLIC_IDENTITY}, with its creator, source, and licence.`],
    '/search/': ['Search', `Search ${PUBLIC_IDENTITY}: full-text over article prose plus the structured data layer (methods, companies, datasets).`],
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

const MODULE_EXTENSIONS = ['.tsx', '.ts'];
const MDX_COMPONENTS_PATH = 'mdx-components.tsx';

/**
 * The state cases that need a user control to exist. `default`, `focus` and
 * `hover` are emitted for every source and so distinguish nothing; these two
 * are emitted only when the module's own markup declares a slider or a
 * discrete option, which is the codebase's existing definition of a
 * component a reader operates.
 */
const CONTROL_CASE_KINDS = new Set(['slider-boundaries', 'discrete-options']);

/** Index of the brace matching `text[open]`, ignoring braces in strings. */
function matchingBrace(text: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    if (quote !== null) {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{' || char === '(' || char === '[') depth += 1;
    else if (char === '}' || char === ')' || char === ']') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

/** The comma-separated members of an object body, nesting respected. */
function topLevelMembers(body: string): string[] {
  const members: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = '';
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    current += char;
    if (quote !== null) {
      if (char === '\\') {
        current += body[index + 1] ?? '';
        index += 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{' || char === '(' || char === '[') depth += 1;
    else if (char === '}' || char === ')' || char === ']') depth -= 1;
    else if (char === ',' && depth === 0) {
      members.push(current.slice(0, -1));
      current = '';
    }
  }
  members.push(current);
  return members.map((member) => member.trim()).filter(Boolean);
}

/** The first-party module a specifier names, or null for a package. */
function resolveModuleFile(specifier: string, fromPath: string): string | null {
  const base = specifier.startsWith('@/')
    ? join(ROOT, specifier.slice(2))
    : specifier.startsWith('.')
      ? join(ROOT, dirname(fromPath), specifier)
      : null;
  if (base === null) return null;
  for (const candidate of [
    ...MODULE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...MODULE_EXTENSIONS.map((extension) => join(base, `index${extension}`)),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return relative(ROOT, candidate);
    }
  }
  return null;
}

/**
 * The module that declares one component, following the barrel re-exports
 * `components/ui/index.ts` puts between an author and the real file. Without
 * the hop every component reached through a barrel resolves to the barrel,
 * whose own source declares no control at all.
 */
function resolveComponentModule(
  name: string,
  specifier: string,
  fromPath: string,
  seen: Set<string> = new Set(),
): string | null {
  const modulePath = resolveModuleFile(specifier, fromPath);
  if (modulePath === null || seen.has(modulePath)) return modulePath;
  seen.add(modulePath);
  const reexport = new RegExp(
    `export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"]([^'"]+)['"]`,
  ).exec(source(modulePath));
  if (reexport === null) return modulePath;
  return (
    resolveComponentModule(name, reexport[1], modulePath, seen) ?? modulePath
  );
}

/**
 * The components every MDX module renders without importing them, as the
 * name an author writes mapped to the module that declares it.
 *
 * Read from `mdx-components.tsx` rather than listed here, because the names
 * MDX authors write (`Cite`, `Term`, `Image`) are the keys of that map and
 * not the identifiers it imports.
 */
function mdxGlobalComponentModules(): Map<string, string | null> {
  // Comments are masked first: an apostrophe in prose ("the block's title
  // bar") opens a string as far as any brace matcher is concerned.
  const text = maskScriptComments(source(MDX_COMPONENTS_PATH));
  const imports = importedNames(text);
  const signature = /export function useMDXComponents\b/.exec(text);
  if (signature === null) {
    throw new Error(
      `${MDX_COMPONENTS_PATH} exports no useMDXComponents, so the components every MDX module renders without importing cannot be read`,
    );
  }
  const returned = text.indexOf('return {', signature.index);
  if (returned === -1) {
    throw new Error(
      `${MDX_COMPONENTS_PATH} returns no component map from useMDXComponents`,
    );
  }
  const open = text.indexOf('{', returned);
  const close = matchingBrace(text, open);
  if (close === -1) {
    throw new Error(
      `${MDX_COMPONENTS_PATH} leaves the useMDXComponents map unterminated`,
    );
  }
  const map = new Map<string, string | null>();
  for (const member of topLevelMembers(text.slice(open + 1, close))) {
    const key = /^([A-Za-z_$][\w$]*)\s*(:|$)/.exec(member);
    if (key === null || !/^[A-Z]/.test(key[1])) continue;
    const value = key[2] === ':' ? member.slice(key[0].length).trim() : key[1];
    if (!/^[A-Za-z_$][\w$]*$/.test(value)) {
      map.set(key[1], null);
      continue;
    }
    const specifier = imports.get(value);
    map.set(
      key[1],
      specifier === undefined
        ? null
        : resolveComponentModule(value, specifier, MDX_COMPONENTS_PATH),
    );
  }
  if (map.size === 0) {
    throw new Error(
      `${MDX_COMPONENTS_PATH} supplies no component to MDX modules, so no mount could ever be read as nested`,
    );
  }
  return map;
}

/** The control kinds one module's own markup declares. */
function moduleControlKinds(modulePath: string): string[] {
  return [...new Set(stateCases(source(modulePath)).map(({ kind }) => kind))]
    .filter((kind) => CONTROL_CASE_KINDS.has(kind))
    .sort();
}

/**
 * One component element that encloses a mount, with what its own module
 * declares.
 *
 * The `controlKinds` are read from the container's source, never from the
 * mount: a mount cannot make itself the child of a quiz, and it cannot make
 * the quiz stop declaring controls either.
 */
function containerRecord(
  name: string,
  owner: { path: string; imports: Map<string, string>; declared: Set<string> },
  mdxGlobals: Map<string, string | null>,
) {
  const specifier = owner.imports.get(name);
  const sourcePath = specifier
    ? resolveComponentModule(name, specifier, owner.path)
    : owner.declared.has(name)
      ? owner.path
      : (mdxGlobals.get(name) ?? null);
  return {
    component: name,
    sourcePath,
    controlKinds:
      sourcePath === null || sourcePath.endsWith('.mdx')
        ? []
        : moduleControlKinds(sourcePath),
  };
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
  const mdxGlobals = mdxGlobalComponentModules();
  const importPattern =
    /import\s+\{\s*([A-Z][A-Za-z0-9]*)\s*\}\s+from\s+['"]@\/components\/interactive\/[^'"]+['"]/g;
  for (const path of mountFiles) {
    const text = readFileSync(path, 'utf8');
    const relativePath = relative(ROOT, path);
    const mounted = new Map<string, (typeof sources)[number]>();
    for (const importMatch of text.matchAll(importPattern)) {
      const component = importMatch[1];
      const registeredSource = sourceByComponent.get(component);
      if (!registeredSource) {
        throw new Error(`Mount imports unregistered interactive ${component}`);
      }
      mounted.set(component, registeredSource);
    }
    if (mounted.size === 0) continue;
    const owner = {
      path: relativePath,
      imports: importedNames(text),
      declared: declaredComponentNames(text),
    };
    // The mount's place in the document, not its attributes. Where an
    // element sits is a fact the markup states about the page; what it
    // declares is a fact it states about itself, and only the first can
    // decide which comparisons a mount is subject to.
    const componentNames = new Set([
      ...owner.imports.keys(),
      ...owner.declared,
      ...(relativePath.endsWith('.mdx') ? mdxGlobals.keys() : []),
    ]);
    const ordinals = new Map<string, number>();
    for (const occurrence of componentElementTree({
      text,
      path: relativePath,
      componentNames,
    })) {
      const registeredSource = mounted.get(occurrence.name);
      if (!registeredSource) continue;
      const ordinal = (ordinals.get(occurrence.name) ?? 0) + 1;
      ordinals.set(occurrence.name, ordinal);
      const props = occurrence.attributes.replace(/\s+/g, ' ').trim();
      const route = relativePath === 'app/page.tsx'
        ? '/'
        : `/${relativePath.replace(/^content\//, '').replace(/\.mdx$/, '/')}`;
      mounts.push(
        stableRecord({
          id: `mount:${route}:${occurrence.name}:${ordinal}`,
          sourceId: registeredSource.id,
          route,
          ownerPath: relativePath,
          ordinal,
          props,
          containers: occurrence.ancestors.map((name) =>
            containerRecord(name, owner, mdxGlobals),
          ),
          cases: registeredSource.cases,
          expectedCaseCount: registeredSource.expectedCaseCount,
        }),
      );
    }
  }
  mounts.sort((left, right) => left.id.localeCompare(right.id));
  return { sources, mounts };
}

const ANNOTATION_SCAN = scanAnnotationAssignments(ROOT);

/**
 * The modules that actually render a primitive ID in production, read out of
 * the source rather than described. Writing the ID is not owning it: the
 * shared `components/ui/action.tsx` primitive writes
 * `control:primary-action`, but nothing mounts `<Action>`, so recording that
 * definition file as the owner claims a production mount that does not
 * exist. Import reachability is not owning it either, in two separate ways.
 * A reachable module need not be mounted: `components/ui/code-block.tsx` is
 * registered on every MDX body and `components/ui/copy-button.tsx` is called
 * only by it, so both are importable from a route entry while nothing
 * renders either one. And a mounted module need not supply every variant it
 * can write: `components/ui/card.tsx` can assign `surface:raised`, but every
 * mounted `<Card>` omits `level`, so the only ID it supplies in production
 * is `surface:flat`. A primitive the library defines and no route mounts
 * records an empty owner list, which is the truth.
 */
function annotationOwnerModules(id: string): readonly string[] {
  return ANNOTATION_SCAN.productionOwnersById[id] ?? [];
}

/**
 * The mount half of every primitive row: where the ID is written at all, and
 * whether a route entry reaches one of those writers. `library-only` and
 * `unwritten` are recorded rather than hidden, because a row that silently
 * borrows its definition file as an owner reads as a shipped mount.
 */
function annotationMountRecord(id: string) {
  const ownerRouteOrMount = annotationOwnerModules(id);
  const definedIn = [
    ...ownerRouteOrMount,
    ...(ANNOTATION_SCAN.unmountedOwnersById[id] ?? []),
  ].sort();
  return {
    definedIn,
    ownerRouteOrMount,
    mountState:
      definedIn.length === 0
        ? 'unwritten'
        : ownerRouteOrMount.length > 0
          ? 'production'
          : 'library-only',
  };
}

/**
 * Recorded WCAG 2.2 SC 2.5.8 exceptions, per control class, for the
 * measured members that do not reach the 24px minimum. Each entry names the
 * exception route the SC actually provides, so the rendered-DOM gate can
 * re-derive it from geometry (tests/e2e/brand-v2-primitives.spec.ts) instead
 * of taking the registry's word for it.
 */
const CONTROL_TARGET_SIZE_EXCEPTIONS: Record<
  string,
  ReadonlyArray<{ kind: 'inline' | 'spacing'; criterion: string; reason: string }>
> = {
  'control:link-focus': [
    {
      kind: 'inline',
      criterion: 'WCAG 2.2 SC 2.5.8 inline exception',
      reason:
        'Citation chips, glossary term links and prose links sit inside a sentence, so their height is set by the prose line box; enlarging them would break the approved article reference.',
    },
    {
      kind: 'spacing',
      criterion: 'WCAG 2.2 SC 2.5.8 spacing exception',
      reason:
        'Reference-list, see-also, breadcrumb and index links are short text rows whose 24px undisturbed circles clear every neighbouring target.',
    },
  ],
  'control:input': [
    {
      kind: 'spacing',
      criterion: 'WCAG 2.2 SC 2.5.8 spacing exception',
      reason:
        'A native range track renders at the user agent thumb height; each slider owns a full-width row, so its 24px circle clears the readout and the reset control.',
    },
  ],
  'control:selection': [
    {
      kind: 'spacing',
      criterion: 'WCAG 2.2 SC 2.5.8 spacing exception',
      reason:
        'Native radio indicators render at the user agent size inside a full-width label row that keeps the 24px circles apart.',
    },
  ],
  'control:secondary-action': [
    {
      kind: 'spacing',
      criterion: 'WCAG 2.2 SC 2.5.8 spacing exception',
      reason:
        'Disclosure summaries are one text line high and occupy their own row, so the 24px circle clears the surrounding targets.',
    },
  ],
};

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
      id: 'device:active-interval-rail',
      ownerSurface: 'shared-shell',
      structuralPurpose: 'active-measured-interval',
      anchorGeometry: { kind: 'edge', allowedEdges: ['left'] },
      classification: 'structural',
      ariaBehavior:
        'aria-hidden; the link\u2019s aria-current="page" carries the state',
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
      // The geometry states the edge the rendered gate can actually
      // measure. `baseline` named an alignment no DOM rectangle exposes,
      // so it could never be checked; the label instead opens its own list
      // row, and that shared left edge is what makes the ordinals read as
      // an index column. `sequenceRequired` still forbids mounting the
      // device on anything but a real order.
      anchorGeometry: {
        kind: 'edge',
        allowedEdges: ['left'],
        sequenceRequired: true,
      },
      classification: 'semantic',
      ariaBehavior:
        'aria-hidden; the ordered list conveys position in set and the ordinal repeats it visually',
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
      ...annotationMountRecord(entry.id),
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
  ].map((entry) => stableRecord({ ...entry, ...annotationMountRecord(entry.id) }));
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
      // `aria-current` marks the current destination or item in a set, not a
      // pressed or selected state, and the browser gate restricts it to
      // truthful current links (control:link-focus). Listing it here as a
      // permitted persistent ARIA of a selection control contradicted that
      // rule and serialized an allowance no member may use.
      persistentAria: ['aria-pressed', 'aria-selected'],
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
      ...annotationMountRecord(entry.id),
      disabledException: entry.disabledException ?? null,
      targetSize: {
        minimumPx: 24,
        preferredPx: 44,
        exceptions: CONTROL_TARGET_SIZE_EXCEPTIONS[entry.id] ?? [],
      },
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
