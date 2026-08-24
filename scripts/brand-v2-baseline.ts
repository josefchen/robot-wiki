import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import matter from 'gray-matter';
import { DOMAINS, publishedModules } from '../data/modules.ts';
import { COMPANIES } from '../data/companies.ts';
import { IMAGES } from '../data/images.ts';
import {
  BASELINE_KINDS,
  buildManifest,
  compareBaseline,
  sha256,
  stableJson,
  validateValueStateSeparation,
  type ApprovedDelta,
  type BaselineBundle,
  type BaselineKind,
  type JsonValue,
  type ManifestInput,
  type ValueStateRecord,
} from '../lib/brand-v2-baseline.ts';

const ROOT = join(import.meta.dirname, '..');
const BASELINE_DIR = join(ROOT, 'evidence', 'brand-v2', 'baseline');
const BUNDLE_PATH = join(BASELINE_DIR, 'baseline.json');
const DELTAS_PATH = join(ROOT, 'contract', 'brand-v2-approved-deltas.json');
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
}> {
  return publishedModules().map(({ domain, slug }) => {
    const path = `content/${domain}/${slug}.mdx`;
    const parsed = matter(source(path));
    return {
      id: `${domain}/${slug}`,
      path,
      body: parsed.content.trim(),
      data: parsed.data as Record<string, unknown>,
    };
  });
}

function prose(): ManifestInput[] {
  return publishedMdx().map(({ id, path, body }) => ({
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

function relationships(): ManifestInput[] {
  return publishedMdx().map(({ id, data, body }) => {
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

function valueStates(): ManifestInput[] {
  const records: ValueStateRecord[] = [
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
  const separationFailures = validateValueStateSeparation(records);
  if (separationFailures.length > 0) {
    throw new Error(JSON.stringify(separationFailures, null, 2));
  }

  const renderFiles = [
    'lib/entity-cells.ts',
    'components/mdx/policy-chunking-table.tsx',
    'components/interactive/data-scale-chart.tsx',
    'components/market-map/company-card.tsx',
  ];
  return [
    ...records.map((record) => ({
      id: `state:${record.id}`,
      value: jsonValue(record),
    })),
    ...renderFiles.map((path) => ({
      id: `state-source:${path}`,
      value: { path, source: source(path) },
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
}): BaselineBundle {
  const inputs: Record<BaselineKind, ManifestInput[]> = {
    routes: routes(),
    prose: prose(),
    'accessible-names': accessibleNames(),
    relationships: relationships(),
    navigation: navigation(),
    'market-playground': marketPlayground(),
    'assets-svg': assetsSvg(),
    'interactive-sources-mounts': interactiveSourcesMounts(),
    'behavioral-defaults': behavioralDefaults(),
    'value-states': valueStates(),
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
    schemaVersion: 1,
    source: sourceIdentity,
    tools,
    manifests,
    manifestRoots,
    rootHash: sha256(stableJson({ source: sourceIdentity, tools, manifestRoots })),
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
    writeBundle(
      collectBundle({
        sourceCommit: command('git', 'rev-parse', 'HEAD'),
        sourceTree: actualTree,
        trackedWorktreeClean: true,
      }),
    );
    console.log(`brand-v2 baseline: created ${BUNDLE_PATH}`);
    return;
  }

  if (args.has('--check')) {
    const baseline = JSON.parse(
      readFileSync(BUNDLE_PATH, 'utf8'),
    ) as BaselineBundle;
    const current = collectBundle();
    const result = compareBaseline(baseline, current, loadDeltas());
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
    return;
  }

  throw new Error('Usage: --create or --check');
}

function statSafe(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

main();
