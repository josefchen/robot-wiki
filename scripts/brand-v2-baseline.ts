import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import matter from 'gray-matter';
import { DOMAINS, publishedModules } from '../data/modules.ts';
import { COMPANIES } from '../data/companies.ts';
import { IMAGES } from '../data/images.ts';
import {
  BASELINE_KINDS,
  assertAdditiveBaseline,
  buildManifest,
  compareBaseline,
  isRenderedValueStateTokenAt,
  sha256,
  stableJson,
  validateValueStateSeparation,
  type ApprovedDelta,
  type BaselineBundle,
  type BaselineFailure,
  type BaselineKind,
  type JsonValue,
  type ManifestInput,
  type ValueStateRecord,
} from '../lib/brand-v2-baseline.ts';

const ROOT = join(import.meta.dirname, '..');
const BASELINE_DIR = join(ROOT, 'evidence', 'brand-v2', 'baseline');
const BUNDLE_PATH = join(BASELINE_DIR, 'baseline.json');
const DELTAS_PATH = join(ROOT, 'contract', 'brand-v2-approved-deltas.json');
const PINNED_SOURCE_COMMIT = '4c113fe6e1c4a378341ad03d5a6927dcb9544b90';
const PINNED_SOURCE_TREE = 'c3d33f5677660f6e3b414a002256f588d050da56';
const FIXED_ROUTES = [
  '/',
  '/market-map/',
  '/playground/',
  '/search/',
  '/glossary/',
  '/credits/',
  '/a-z/',
  '/404/',
];

function command(...args: string[]): string {
  return execFileSync(args[0], args.slice(1), {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
}

function filesUnder(directory: string, extensions: readonly string[]): string[] {
  const output: string[] = [];
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    const stat = statSync(path);
    if (stat.isDirectory()) output.push(...filesUnder(path, extensions));
    else if (extensions.includes(extname(name))) output.push(path);
  }
  return output;
}

function source(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8').replace(/\r\n/g, '\n');
}

function jsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function routes(): ManifestInput[] {
  const paths = [
    ...FIXED_ROUTES,
    ...DOMAINS.map((domain) => `/${domain}/`),
    ...publishedModules().map(
      ({ domain, slug }) => `/${domain}/${slug}/`,
    ),
  ];
  return [...new Set(paths)].sort().map((path) => ({
    id: `route:${path}`,
    value: { path, trailingSlash: true },
  }));
}

function publishedMdx(): Array<{
  id: string;
  path: string;
  body: string;
  data: Record<string, unknown>;
  registryTitle: string;
  registrySummary: string;
}> {
  return publishedModules().map(({ domain, slug, title, summary }) => {
    const path = `content/${domain}/${slug}.mdx`;
    const parsed = matter(source(path));
    return {
      id: `${domain}/${slug}`,
      path,
      body: parsed.content.trim(),
      data: parsed.data as Record<string, unknown>,
      registryTitle: title,
      registrySummary: summary,
    };
  });
}

type PublishedMdx = ReturnType<typeof publishedMdx>;

function prose(mdx: PublishedMdx): ManifestInput[] {
  return mdx.map(({ id, path, body }) => ({
    id: `article:${id}`,
    value: { path, body },
  }));
}

function accessibleNames(): ManifestInput[] {
  const names: ManifestInput[] = [];
  const fixture = JSON.parse(
    source('tests/fixtures/nav-accessible-names.json'),
  ) as { links: Array<{ href: string; name: string }> };
  for (const entry of fixture.links) {
    names.push({
      id: `nav:${entry.href}`,
      value: jsonValue(entry),
    });
  }

  const files = [
    ...filesUnder(join(ROOT, 'app'), ['.tsx']),
    ...filesUnder(join(ROOT, 'components'), ['.tsx']),
    ...filesUnder(join(ROOT, 'content'), ['.mdx']),
  ];
  const pattern = /\b(aria-label|aria-labelledby|alt|title)=["']([^"']+)["']/g;
  for (const path of files) {
    const relativePath = relative(ROOT, path);
    const text = readFileSync(path, 'utf8');
    let match: RegExpExecArray | null;
    let ordinal = 0;
    while ((match = pattern.exec(text))) {
      ordinal += 1;
      names.push({
        id: `literal:${relativePath}:${match[1]}:${ordinal}`,
        value: { attribute: match[1], text: match[2] },
      });
    }
  }
  return names;
}

function relationships(mdx: PublishedMdx): ManifestInput[] {
  return mdx.map(({ id, data, body }) => {
    const internalLinks = [...body.matchAll(/\]\((\/[^)#?]+\/?)(?:#[^)]+)?\)/g)]
      .map((match) => match[1])
      .sort();
    const citations = [...body.matchAll(/<Cite\s+id=["']([^"']+)["']/g)]
      .map((match) => match[1])
      .sort();
    const terms = [...body.matchAll(/<Term\s+id=["']([^"']+)["']/g)]
      .map((match) => match[1])
      .sort();
    return {
      id: `article:${id}`,
      value: {
        seeAlso: jsonValue(data.seeAlso ?? []),
        citations,
        terms,
        internalLinks,
      },
    };
  });
}

function navigation(): ManifestInput[] {
  const fixture = JSON.parse(
    source('tests/fixtures/nav-accessible-names.json'),
  ) as { links: Array<{ href: string; name: string }> };
  return fixture.links.map((entry, index) => ({
    id: `nav:${entry.href}`,
    value: { index, href: entry.href, name: entry.name },
  }));
}

function marketPlayground(): ManifestInput[] {
  const market = COMPANIES.map((company) => ({
    id: `company:${company.id}`,
    value: jsonValue(company),
  }));
  const playgroundFiles = [
    'lib/ik.ts',
    'lib/trajectory.ts',
    'components/three/load-robot.ts',
    'components/three/playground-canvas.tsx',
    'components/three/playground-hud.tsx',
    'components/three/trajectory-panel.tsx',
  ];
  return [
    ...market,
    ...playgroundFiles.map((path) => ({
      id: `playground-source:${path}`,
      value: { path, source: source(path) },
    })),
  ];
}

function normalizeSvgSemantics(svg: string): string {
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s(?:class|style|fill|stroke|stroke-width|opacity)=["'][^"']*["']/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
}

function assetsSvg(): ManifestInput[] {
  const entries: ManifestInput[] = IMAGES.map((image) => {
    const diskPath = join(ROOT, 'public', image.file.replace(/^\//, ''));
    const bytes = readFileSync(diskPath);
    const value: Record<string, JsonValue> = {
      registry: jsonValue(image),
      byteHash: sha256(bytes),
    };
    if (extname(diskPath).toLowerCase() === '.svg') {
      value.semanticHash = sha256(
        normalizeSvgSemantics(bytes.toString('utf8')),
      );
    }
    return { id: `registered-image:${image.id}`, value };
  });

  const publicSvgs = filesUnder(join(ROOT, 'public'), ['.svg']);
  for (const path of publicSvgs) {
    const relativePath = relative(join(ROOT, 'public'), path);
    entries.push({
      id: `public-svg:${relativePath}`,
      value: {
        path: relativePath,
        semanticHash: sha256(
          normalizeSvgSemantics(readFileSync(path, 'utf8')),
        ),
      },
    });
  }
  return entries;
}

function interactiveSourcesMounts(): ManifestInput[] {
  const entries: ManifestInput[] = [];
  for (const directory of ['components/interactive', 'components/three']) {
    for (const path of filesUnder(join(ROOT, directory), ['.ts', '.tsx'])) {
      const relativePath = relative(ROOT, path);
      entries.push({
        id: `source:${relativePath}`,
        value: { path: relativePath, source: readFileSync(path, 'utf8') },
      });
    }
  }

  const mountFiles = [
    ...filesUnder(join(ROOT, 'content'), ['.mdx']),
    ...filesUnder(join(ROOT, 'app'), ['.tsx']),
  ];
  const importPattern =
    /import\s+\{\s*([A-Z][A-Za-z0-9]*)\s*\}\s+from\s+['"]@\/components\/(?:interactive|three)\/[^'"]+['"]/g;
  for (const path of mountFiles) {
    const text = readFileSync(path, 'utf8');
    const relativePath = relative(ROOT, path);
    const imported = [...text.matchAll(importPattern)].map((match) => match[1]);
    for (const component of imported) {
      const mountPattern = new RegExp(`<${component}\\b([^>]*)>`, 'g');
      let match: RegExpExecArray | null;
      let ordinal = 0;
      while ((match = mountPattern.exec(text))) {
        ordinal += 1;
        entries.push({
          id: `mount:${relativePath}:${component}:${ordinal}`,
          value: {
            path: relativePath,
            component,
            props: match[1].replace(/\s+/g, ' ').trim(),
          },
        });
      }
    }
  }
  return entries;
}

function behavioralDefaults(): ManifestInput[] {
  const entries: ManifestInput[] = [];
  const files = [
    ...filesUnder(join(ROOT, 'components', 'interactive'), ['.ts', '.tsx']),
    ...filesUnder(join(ROOT, 'components', 'three'), ['.ts', '.tsx']),
    join(ROOT, 'lib', 'trajectory.ts'),
    join(ROOT, 'lib', 'ik.ts'),
  ];
  const pattern =
    /\b(?:DEFAULT_[A-Z0-9_]+|INITIAL_[A-Z0-9_]+|default[A-Z][A-Za-z0-9]*|initial[A-Z][A-Za-z0-9]*)\b[^\n]{0,180}/g;
  for (const path of files) {
    const text = readFileSync(path, 'utf8');
    const relativePath = relative(ROOT, path);
    let match: RegExpExecArray | null;
    let ordinal = 0;
    while ((match = pattern.exec(text))) {
      ordinal += 1;
      entries.push({
        id: `default:${relativePath}:${ordinal}`,
        value: { expression: match[0].replace(/\s+/g, ' ').trim() },
      });
    }
  }
  return entries;
}

function collectValueStateRenderSites(): {
  raw: ValueStateRecord[];
  bounded: ValueStateRecord[];
} {
  const raw: ValueStateRecord[] = [];
  const bounded: ValueStateRecord[] = [];
  const paths = command(
    'git',
    'ls-files',
    '--',
    'lib',
    'data',
    'components',
    'app',
    'content',
  )
    .split('\n')
    .filter(Boolean)
    .sort();
  const renderings = [
    ['not-disclosed', 'not disclosed'],
    ['not-applicable', 'n/a'],
  ] as const;

  for (const path of paths) {
    const text = source(path);
    for (const [state, rendered] of renderings) {
      let offset = 0;
      let ordinal = 0;
      while ((offset = text.indexOf(rendered, offset)) !== -1) {
        ordinal += 1;
        const record = {
          id: `state-site:${path}:${state}:${ordinal}`,
          state,
          rendered,
        };
        raw.push(record);
        if (isRenderedValueStateTokenAt(text, rendered, offset)) {
          bounded.push(record);
        }
        offset += rendered.length;
      }
    }
  }

  return { raw, bounded };
}

export function valueStateRenderSites(options?: {
  tokenBoundaryAware?: boolean;
}): ValueStateRecord[] {
  const collection = collectValueStateRenderSites();
  return options?.tokenBoundaryAware === false
    ? collection.raw
    : collection.bounded;
}

function valueStates(): {
  validation: ReturnType<typeof validateValueStateSeparation>;
  inputs: ManifestInput[];
  legacyRawRenderSiteIds: Set<string>;
} {
  const canonicalRecords: ValueStateRecord[] = [
    { id: 'published-witness', state: 'published', rendered: '42' },
    {
      id: 'undisclosed-canonical',
      state: 'not-disclosed',
      rendered: 'not disclosed',
    },
    {
      id: 'inapplicable-canonical',
      state: 'not-applicable',
      rendered: 'n/a',
    },
  ];
  const renderSiteCollection = collectValueStateRenderSites();
  const renderSites = renderSiteCollection.bounded;
  const validation = validateValueStateSeparation(renderSites);

  const renderFiles = [
    'lib/entity-cells.ts',
    'components/mdx/policy-chunking-table.tsx',
    'components/interactive/data-scale-chart.tsx',
    'components/market-map/company-card.tsx',
  ];
  return {
    validation,
    legacyRawRenderSiteIds: new Set(
      renderSiteCollection.raw.map((record) => record.id),
    ),
    inputs: [
      ...canonicalRecords.map((record) => ({
        id: `state:${record.id}`,
        value: jsonValue(record),
      })),
      ...renderSites.map((record) => ({
        id: record.id,
        value: jsonValue(record),
      })),
      ...renderFiles.map((path) => ({
        id: `state-source:${path}`,
        value: { path, source: source(path) },
      })),
    ],
  };
}

function articleMetadata(mdx: PublishedMdx): ManifestInput[] {
  const articles = mdx.map(
    ({ id, path, data, registryTitle, registrySummary }) => ({
      id: `article-metadata:${id}`,
      value: {
        path,
        registryTitle,
        registrySummary,
        frontmatterTitle: String(data.title ?? ''),
        frontmatterDescription: String(data.description ?? ''),
      },
    }),
  );
  const ownerPaths = [
    'data/modules.ts',
    'data/domains.ts',
    'data/glossary.ts',
    'lib/site.ts',
    'lib/og-cards.ts',
    'app/layout.tsx',
    'components/article/article-header.tsx',
  ];

  return [
    ...articles,
    ...ownerPaths.map((path) => ({
      id: `canonical-metadata-source:${path}`,
      value: { path, sourceHash: sha256(source(path)) },
    })),
  ];
}

function toolVersions(): BaselineBundle['tools'] {
  const pkg = JSON.parse(source('package.json')) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  return {
    node: process.version,
    npm: command('npm', '--version'),
    playwright: pkg.devDependencies['@playwright/test'],
    next: pkg.dependencies.next,
    typescript: pkg.devDependencies.typescript,
    vitest: pkg.devDependencies.vitest,
    lockfileSha256: sha256(readFileSync(join(ROOT, 'package-lock.json'))),
  };
}

export function collectBundle(options?: {
  sourceCommit?: string;
  sourceTree?: string;
  trackedWorktreeClean?: boolean;
}):
  | {
      ok: true;
      failures: [];
      bundle: BaselineBundle;
      legacyRawValueStateIds: Set<string>;
    }
  | { ok: false; failures: BaselineFailure[] } {
  const valueStateCollection = valueStates();
  if (!valueStateCollection.validation.ok) {
    return valueStateCollection.validation;
  }
  const mdx = publishedMdx();
  const inputs: Record<BaselineKind, ManifestInput[]> = {
    routes: routes(),
    prose: prose(mdx),
    'accessible-names': accessibleNames(),
    relationships: relationships(mdx),
    navigation: navigation(),
    'market-playground': marketPlayground(),
    'assets-svg': assetsSvg(),
    'interactive-sources-mounts': interactiveSourcesMounts(),
    'behavioral-defaults': behavioralDefaults(),
    'value-states': valueStateCollection.inputs,
    'article-metadata': articleMetadata(mdx),
  };
  const manifests = Object.fromEntries(
    BASELINE_KINDS.map((kind) => [kind, buildManifest(kind, inputs[kind])]),
  ) as BaselineBundle['manifests'];
  const manifestRoots = Object.fromEntries(
    BASELINE_KINDS.map((kind) => [kind, manifests[kind].rootHash]),
  ) as BaselineBundle['manifestRoots'];
  const sourceIdentity = {
    commit: options?.sourceCommit ?? command('git', 'rev-parse', 'HEAD'),
    tree: options?.sourceTree ?? command('git', 'rev-parse', 'HEAD^{tree}'),
    trackedWorktreeClean: options?.trackedWorktreeClean ?? false,
  };
  const tools = toolVersions();
  return {
    ok: true,
    failures: [],
    legacyRawValueStateIds: valueStateCollection.legacyRawRenderSiteIds,
    bundle: {
      schemaVersion: 1,
      source: sourceIdentity,
      tools,
      manifests,
      manifestRoots,
      rootHash: sha256(
        stableJson({ source: sourceIdentity, tools, manifestRoots }),
      ),
    },
  };
}

function loadDeltas(): ApprovedDelta[] {
  const document = JSON.parse(readFileSync(DELTAS_PATH, 'utf8')) as {
    entries: ApprovedDelta[];
  };
  return document.entries;
}

function writeBundle(bundle: BaselineBundle): void {
  mkdirSync(BASELINE_DIR, { recursive: true });
  const hashedManifests = Object.fromEntries(
    BASELINE_KINDS.map((kind) => [
      kind,
      {
        ...bundle.manifests[kind],
        members: bundle.manifests[kind].members.map(({ id, hash }) => ({
          id,
          hash,
        })),
      },
    ]),
  ) as BaselineBundle['manifests'];
  const hashedBundle = { ...bundle, manifests: hashedManifests };
  for (const kind of BASELINE_KINDS) {
    writeFileSync(
      join(BASELINE_DIR, `${kind}.json`),
      `${JSON.stringify(hashedManifests[kind], null, 2)}\n`,
    );
  }
  writeFileSync(BUNDLE_PATH, `${JSON.stringify(hashedBundle, null, 2)}\n`);
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  if (args.has('--create')) {
    if (statSafe(BUNDLE_PATH)) {
      throw new Error('Immutable baseline already exists; use --check');
    }
    const expectedTree = process.env.BRAND_V2_BASELINE_TREE;
    const actualTree = command('git', 'rev-parse', 'HEAD^{tree}');
    if (!expectedTree || expectedTree !== actualTree) {
      throw new Error(
        'BRAND_V2_BASELINE_TREE must equal the exact recorded source tree',
      );
    }
    const collection = collectBundle({
      sourceCommit: command('git', 'rev-parse', 'HEAD'),
      sourceTree: actualTree,
      trackedWorktreeClean: true,
    });
    if (!collection.ok) {
      console.log(JSON.stringify(collection, null, 2));
      process.exitCode = 1;
      return;
    }
    writeBundle(collection.bundle);
    console.log(`brand-v2 baseline: created ${BUNDLE_PATH}`);
    return;
  }

  if (args.has('--check')) {
    const baseline = JSON.parse(
      readFileSync(BUNDLE_PATH, 'utf8'),
    ) as BaselineBundle;
    const collection = collectBundle();
    if (!collection.ok) {
      console.log(JSON.stringify(collection, null, 2));
      process.exitCode = 1;
      return;
    }
    const result = compareBaseline(baseline, collection.bundle, loadDeltas());
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
    return;
  }

  if (args.has('--recreate')) {
    const previous = JSON.parse(
      readFileSync(BUNDLE_PATH, 'utf8'),
    ) as BaselineBundle;
    const collection = collectBundle({
      sourceCommit: PINNED_SOURCE_COMMIT,
      sourceTree: PINNED_SOURCE_TREE,
      trackedWorktreeClean: true,
    });
    if (!collection.ok) {
      console.log(JSON.stringify(collection, null, 2));
      process.exitCode = 1;
      return;
    }
    const recreated = collection.bundle;
    const recreatedValueStateIds = new Set(
      recreated.manifests['value-states'].members.map((member) => member.id),
    );
    const legacyRawValueStateIds = collection.legacyRawValueStateIds;
    const correctedRemovedMembers = new Set(
      previous.manifests['value-states'].members
        .map((member) => member.id)
        .filter(
          (memberId) =>
            legacyRawValueStateIds.has(memberId) &&
            !recreatedValueStateIds.has(memberId),
        )
        .map((memberId) => `value-states:${memberId}`),
    );
    const additions = assertAdditiveBaseline(previous, recreated, {
      correctedRemovedMembers,
    });
    writeBundle(recreated);
    console.log(
      `brand-v2 baseline: recreated with ${additions.addedMembers} additive members across ${additions.addedKinds.length} added kinds and ${additions.correctedRemovedMembers} derived false-positive removals`,
    );
    return;
  }

  throw new Error('Usage: --create, --recreate, or --check');
}

function statSafe(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

main();
