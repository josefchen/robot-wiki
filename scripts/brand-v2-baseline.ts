import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
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
import { CITATIONS, citationLabel, citationMeta } from '../data/citations.ts';
import {
  articleFactFrontmatterInputs,
  relationshipManifestInputs,
} from '../lib/relationship-manifest.ts';
import {
  ARTICLE_TRUTH_MANIFEST_KINDS,
  type ArticleTruthKind,
} from '../lib/brand-v2-baseline-truth.ts';

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

type ScanFrame =
  | { kind: 'code'; depth: number }
  | { kind: 'string'; quote: string }
  | { kind: 'template' };

/**
 * The `{...}` a JSX attribute is given, from its opening brace to the brace
 * that closes it, or null if the file ends first.
 *
 * A regex cannot do this: these names are template literals holding
 * `${...}` interpolations that themselves hold braces, quotes and nested
 * templates, and the first `}` is almost never the closing one.
 */
export function jsxExpressionAt(text: string, openBrace: number): string | null {
  const frames: ScanFrame[] = [{ kind: 'code', depth: 1 }];
  let index = openBrace + 1;
  while (index < text.length) {
    const frame = frames[frames.length - 1];
    const character = text[index];
    if (frame.kind === 'string') {
      if (character === '\\') index += 1;
      else if (character === frame.quote) frames.pop();
      index += 1;
      continue;
    }
    if (frame.kind === 'template') {
      if (character === '\\') index += 1;
      else if (character === '`') frames.pop();
      else if (character === '$' && text[index + 1] === '{') {
        frames.push({ kind: 'code', depth: 1 });
        index += 1;
      }
      index += 1;
      continue;
    }
    if (character === '/' && text[index + 1] === '/') {
      const newline = text.indexOf('\n', index);
      index = newline === -1 ? text.length : newline;
      continue;
    }
    if (character === '/' && text[index + 1] === '*') {
      const end = text.indexOf('*/', index);
      index = end === -1 ? text.length : end + 2;
      continue;
    }
    if (character === '`') frames.push({ kind: 'template' });
    else if (character === '"' || character === "'") {
      frames.push({ kind: 'string', quote: character });
    } else if (character === '{') frame.depth += 1;
    else if (character === '}') {
      frame.depth -= 1;
      if (frame.depth === 0) {
        frames.pop();
        if (frames.length === 0) return text.slice(openBrace, index + 1);
      }
    }
    index += 1;
  }
  return null;
}

/**
 * Indentation is stripped from continuation lines so that re-nesting a
 * component moves nothing here: a name assembled across several lines is
 * the same name at any indent, and JSX collapses the run of whitespace
 * before it reaches the accessibility tree anyway.
 */
function normalizeExpression(expression: string): string {
  return expression.replace(/\r\n/g, '\n').replace(/\n[ \t]+/g, '\n');
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
  // Most of this corpus names its charts, sliders and figures with a
  // template literal that interpolates the live reading, so the literal
  // pattern above sees only the minority of names that happen to be
  // constant. Sealing the expression that produces the name is the closest
  // a source-level manifest gets to sealing the name itself, and it is the
  // difference between 145 measured names and 145 unmeasured ones.
  const expressionPattern = /\b(aria-label|aria-labelledby|alt|title)=\{/g;
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
    let expressionOrdinal = 0;
    while ((match = expressionPattern.exec(text))) {
      const expression = jsxExpressionAt(text, match.index + match[0].length - 1);
      if (expression === null) {
        throw new Error(
          `${relativePath} opens a ${match[1]}={...} accessible name at index ${match.index} that never closes, so it cannot be sealed`,
        );
      }
      expressionOrdinal += 1;
      names.push({
        id: `expression:${relativePath}:${match[1]}:${expressionOrdinal}`,
        value: {
          attribute: match[1],
          expression: normalizeExpression(expression),
        },
      });
    }
  }
  return names;
}

/**
 * Delegated to `lib/relationship-manifest.ts`, which `VAL-B2-ART-010` also
 * reads: that row binds the rendered apparatus to these sealed hashes and
 * cannot import a script, so the collector lives where both can reach it.
 */
function relationships(): ManifestInput[] {
  return relationshipManifestInputs(ROOT);
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

function valueStates(validationRecords?: readonly ValueStateRecord[]): {
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
  const validation = validateValueStateSeparation(
    validationRecords ?? renderSites,
  );

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
    'lib/references.ts',
    'app/layout.tsx',
    'components/article/article-header.tsx',
  ];

  /**
   * The facts the frontmatter states and the title sheet and References
   * print: the review date the reader is shown, and the declared source
   * list the bibliography is built from.
   *
   * `prose` hashes `matter().content`, which is the body with the
   * frontmatter already removed, and `relationships` hashes the `<Cite>`
   * markers the body writes. Neither reaches a declared-but-not-inlined
   * source or a review date, so before these members a rollout could have
   * restated when an article was last reviewed, or dropped a source from
   * its bibliography, and every article-truth member would still have
   * matched the seal.
   */
  const factFrontmatter = articleFactFrontmatterInputs(ROOT);

  /**
   * One member per registered source, holding the record itself rather
   * than the file that carries it.
   *
   * `VAL-B2-BASE-002` names "citation targets/source labels/dates" among
   * the things that must be identical to the migration baseline, and the
   * only place any of those three exist is this registry. Hashing
   * `data/citations.ts` as a file would tie the row to its comment prose
   * as well, so an audit note would read as a fact change and a fact
   * change could hide inside a re-worded note; hashing the parsed records
   * grades exactly the url, title, authors, year and venue a reader is
   * shown.
   */
  const citations = CITATIONS.map((citation) => ({
    id: `citation:${citation.id}`,
    value: jsonValue(citation),
  }));

  /**
   * The chip and tooltip strings the reader is actually shown, resolved
   * through the derivation that produces them.
   *
   * The members above seal the RECORD - url, title, authors, year, venue -
   * and `VAL-B2-BASE-002` names "source labels" among the things that must
   * be identical to the migration baseline. A label is not a field: it is
   * `citationLabel()` applied to the byline, through `SURNAME_OVERRIDES`,
   * `ORG_TOKENS` and `BYLINE_OVERRIDES`, and the tooltip is
   * `citationMeta()` through `venueStatesYear()`. Every one of those could
   * be rewritten - a surname override removed, the author cut-off moved
   * from three to two, the year suppressed - and every sealed member above
   * would still have matched while every chip on the site changed.
   *
   * Sealing the resolved strings rather than the functions binds the row to
   * what a reader sees: a refactor that leaves every label identical is not
   * a change to the labels, and a one-word edit to an override table is.
   */
  const rendered = CITATIONS.map(
    (citation) =>
      `${citation.id}\t${citationLabel(citation)}\t${citationMeta(citation)}`,
  ).sort();
  if (rendered.length !== CITATIONS.length || CITATIONS.length === 0) {
    throw new Error(
      'the citation rendering seal resolved no label at all, so it would seal an empty derivation',
    );
  }

  return [
    ...articles,
    ...factFrontmatter,
    ...citations,
    {
      id: 'citation-rendering:label-and-meta',
      value: {
        count: rendered.length,
        digest: sha256(rendered.join('\n')),
      },
    },
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

/**
 * The four article-truth manifests, rebuilt from the current tree.
 *
 * `collectBundle` builds all eleven, and three of them are expensive in ways
 * this caller has no use for: value states walk every render site, and the
 * source manifests hash every interactive module. `VAL-B2-BASE-002` is a
 * claim about article text, accessible names, per-article metadata and the
 * relationship graph, so the enforcement generator rebuilds exactly those,
 * from the same collectors the sealed baseline was built with.
 */
export function collectArticleTruthManifests(): Record<
  ArticleTruthKind,
  ReturnType<typeof buildManifest>
> {
  const mdx = publishedMdx();
  const inputs: Record<ArticleTruthKind, ManifestInput[]> = {
    'accessible-names': accessibleNames(),
    'article-metadata': articleMetadata(mdx),
    prose: prose(mdx),
    relationships: relationships(),
  };
  return Object.fromEntries(
    ARTICLE_TRUTH_MANIFEST_KINDS.map((kind) => [
      kind,
      buildManifest(kind, inputs[kind]),
    ]),
  ) as Record<ArticleTruthKind, ReturnType<typeof buildManifest>>;
}

export function collectBundle(options?: {
  sourceCommit?: string;
  sourceTree?: string;
  trackedWorktreeClean?: boolean;
  valueStateValidationRecords?: readonly ValueStateRecord[];
}):
  | {
      ok: true;
      failures: [];
      bundle: BaselineBundle;
      legacyRawValueStateIds: Set<string>;
    }
  | {
      ok: false;
      failures: BaselineFailure[];
      bundle: BaselineBundle;
      legacyRawValueStateIds: Set<string>;
    } {
  const valueStateCollection = valueStates(
    options?.valueStateValidationRecords,
  );
  const mdx = publishedMdx();
  const inputs: Record<BaselineKind, ManifestInput[]> = {
    routes: routes(),
    prose: prose(mdx),
    'accessible-names': accessibleNames(),
    relationships: relationships(),
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
  const bundle: BaselineBundle = {
    schemaVersion: 1,
    source: sourceIdentity,
    tools,
    manifests,
    manifestRoots,
    rootHash: sha256(
      stableJson({ source: sourceIdentity, tools, manifestRoots }),
    ),
  };
  const common = {
    legacyRawValueStateIds: valueStateCollection.legacyRawRenderSiteIds,
    bundle,
  };
  return valueStateCollection.validation.ok
    ? { ok: true, failures: [], ...common }
    : {
        ok: false,
        failures: valueStateCollection.validation.failures,
        ...common,
      };
}

export function collectBaselineCheckResult(
  baseline: BaselineBundle,
  collection: ReturnType<typeof collectBundle>,
  deltas: readonly ApprovedDelta[],
): {
  ok: boolean;
  failures: BaselineFailure[];
  approvedDifferences: string[];
} {
  const comparison = compareBaseline(baseline, collection.bundle, deltas);
  const failures = [...collection.failures, ...comparison.failures];
  return {
    ok: failures.length === 0,
    failures,
    approvedDifferences: comparison.approvedDifferences,
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
    const result = collectBaselineCheckResult(
      baseline,
      collection,
      loadDeltas(),
    );
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

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main();
}
