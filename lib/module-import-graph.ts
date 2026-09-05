import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { tokenizeSource } from './source-tokens.ts';
import { isSyncConflictDuplicate } from './sync-duplicates.ts';

/**
 * A first-party module graph over used imports, so a consumer can ask which
 * modules a given route entry actually reaches.
 *
 * The question this answers is "does this route render that component", and
 * the only honest answer comes from resolving imports: a route list typed
 * beside a registry cannot see that `app/layout.tsx` mounts the shell on
 * every route, or that the shared article template renders on all 47
 * articles. Two properties keep it from over-reporting: an imported binding
 * the module never mentions again is not an edge (otherwise every barrel
 * would reach everything it lists), and a re-export table forwards a name to
 * its defining module without making the barrel itself a mount. A star
 * re-export is the exception to the first property: it forwards names this
 * scan cannot enumerate, so its target is an unconditional dependency.
 */
export type ModuleImportGraph = {
  root: string;
  /** Every scanned module, repository-relative and sorted. */
  modules: readonly string[];
  textByModule: ReadonlyMap<string, string>;
  edges: ReadonlyMap<string, ReadonlySet<string>>;
  /**
   * The local name each used import binds, and the module that defines it
   * after re-export forwarding. A consumer asking "which modules can mount
   * `<Card>`" needs the binding, not just the edge.
   */
  bindingsByModule: ReadonlyMap<string, readonly ImportBinding[]>;
  /**
   * The barrels each module's used imports were forwarded through.
   *
   * A forwarded binding is attributed to its defining module, which is the
   * right answer for "which module mounts this component" and the wrong one
   * for "which modules are evaluated": the barrel runs too, and its own
   * dependencies are its own. A consumer that cares what a module can reach
   * rather than what it renders has to add these back.
   */
  reexportHopsByModule: ReadonlyMap<string, ReadonlySet<string>>;
  /** Modules reachable from the given entries through used imports. */
  reachableFrom: (entries: Iterable<string>) => Set<string>;
  /**
   * The modules each template-literal `import()` names, per writing module.
   *
   * Deliberately not folded into `edges`. `import(`@/content/${domain}/
   * ${slug}.mdx`)` names a family, and one member of it renders on one
   * route; a walk that added the whole family to `edges` would report that
   * every article route reaches every article body, which is a bigger lie
   * than reaching none. Consumers that resolve the family per route (the
   * Tektur route expectations pick one member by its segments) use this to
   * check that the member they picked is one the specifier can actually
   * name, and consumers that hold the whole family (the evidence closures)
   * use it to check that none of it escaped.
   */
  computedDependenciesByModule: ReadonlyMap<
    string,
    readonly ComputedDependency[]
  >;
  /**
   * The module a specifier resolves to, or null when it leaves the
   * first-party tree. Exposed because a consumer resolving a deferred mount
   * (`dynamic(() => import('./robot-scene'))`) has to answer the same
   * question the import walk answers, and a second resolver would drift.
   */
  resolveSpecifier: (specifier: string, fromModule: string) => string | null;
  /**
   * How every first-party specifier written by the given modules resolves.
   *
   * The edge walk above silently drops a specifier it cannot turn into a
   * scanned module, which is right for `next/font/local` and wrong for
   * everything first-party: a stylesheet the layout imports, a JSON registry
   * a data module reads, and a module living outside the scanned roots all
   * disappear the same way a third-party package does. A consumer building a
   * closure has to be able to tell those apart, because an omission is
   * exactly what a closure is supposed to prevent.
   *
   * Computed on demand rather than during the walk: it tokenizes source, and
   * the walk's existing consumers do not need it.
   */
  firstPartySpecifiersIn: (
    modules: Iterable<string>,
  ) => FirstPartySpecifierResolution[];
};

/** How a first-party specifier written in a module resolves. */
export type FirstPartySpecifierResolution = {
  module: string;
  specifier: string;
  kind: ModuleDependencyKind;
  /**
   * `module` — a scanned module, already an edge candidate above.
   * `asset` — an existing file whose extension is not a module extension:
   *   a stylesheet, a JSON registry, a font metadata file. Its bytes are a
   *   dependency even though there is nothing in it to walk.
   * `unscanned-module` — an existing file that *is* a module, outside the
   *   scanned roots. Reading it as an asset would hash it and never walk
   *   its own imports, so it is a hole rather than a leaf.
   * `computed` — a template literal with an interpolation, naming a set of
   *   modules rather than one. `import(`@/content/${domain}/${slug}.mdx`)`
   *   is the article template reaching every MDX body.
   * `missing` — resolves to nothing at all.
   */
  resolution:
    | 'module'
    | 'asset'
    | 'unscanned-module'
    | 'computed'
    | 'missing';
  /** The repository-relative path, when one exists. */
  path: string | null;
  /**
   * For a `computed` specifier, every scanned module the template literal
   * can name, sorted. Empty for every other resolution. A computed
   * specifier that names nothing is a hole, not a family, and a consumer
   * that treats the two alike cannot tell coverage from silence.
   */
  computedTargets: readonly string[];
};

/** A template-literal `import()` and the module family it names. */
export type ComputedDependency = {
  specifier: string;
  kind: ModuleDependencyKind;
  /** Every scanned module the specifier can name, sorted. */
  targets: readonly string[];
};

export type ModuleDependencyKind = 'import' | 'reexport' | 'dynamic';

export type ImportBinding = {
  /** The name the importing module refers to it by. */
  local: string;
  /** The exported name, `default`, or `*`. */
  imported: string;
  /** The module the name resolves to after re-export forwarding. */
  module: string;
};

export type ModuleImportGraphOptions = {
  /** Directories walked recursively for modules. */
  roots?: readonly string[];
  /** Individual module files outside those directories. */
  files?: readonly string[];
  /** Extensions that count as modules, including the leading dot. */
  extensions?: readonly string[];
};

const DEFAULT_ROOTS = ['app', 'components', 'lib', 'content'] as const;
const DEFAULT_FILES = ['mdx-components.tsx'] as const;
const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.mdx'] as const;

const IMPORT_STATEMENT =
  /import\s+(type\s+)?([^'";]*?)\s*from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g;
const REEXPORT_STATEMENT =
  /export\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
/**
 * `export * from './x'` and `export * as ns from './x'`.
 *
 * A named re-export forwards one name, so it becomes an edge only when an
 * importer uses that name. A star re-export forwards everything the target
 * exports under names this scan cannot enumerate, so the dependency is
 * unconditional — and treating it as no dependency at all left the target
 * outside every reachability walk while an importer of the barrel could
 * still get its values.
 */
const STAR_REEXPORT =
  /export\s+(type\s+)?\*(?:\s+as\s+[A-Za-z_$][\w$]*)?\s*from\s*['"]([^'"]+)['"]/g;
/**
 * A deferred import is still a dependency: `next/dynamic(() =>
 * import('./robot-scene'))` is how the playground mounts its WebGL scene,
 * and leaving it out made the module unreachable from any route entry.
 */
const DYNAMIC_IMPORT = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

type Binding = { local: string; imported: string };

function filesUnder(directory: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) files.push(...filesUnder(path));
    else files.push(path);
  }
  return files;
}

function parseClause(clause: string): Binding[] {
  const bindings: Binding[] = [];
  const trimmed = clause.trim();
  if (trimmed.length === 0) return bindings;
  const braceStart = trimmed.indexOf('{');
  const braceEnd = trimmed.lastIndexOf('}');
  const head =
    braceStart === -1
      ? trimmed
      : trimmed.slice(0, braceStart).replace(/,\s*$/, '');
  for (const part of head.split(',')) {
    const name = part.trim();
    if (name.length === 0) continue;
    if (name.startsWith('*')) {
      const alias = name.split(/\s+as\s+/)[1]?.trim();
      if (alias) bindings.push({ local: alias, imported: '*' });
      continue;
    }
    bindings.push({ local: name, imported: 'default' });
  }
  if (braceStart !== -1 && braceEnd > braceStart) {
    for (const part of trimmed.slice(braceStart + 1, braceEnd).split(',')) {
      const entry = part.trim();
      if (entry.length === 0 || entry.startsWith('type ')) continue;
      const [imported, alias] = entry
        .split(/\s+as\s+/)
        .map((piece) => piece.trim());
      bindings.push({ local: alias ?? imported, imported });
    }
  }
  return bindings;
}

type WrittenSpecifier = { specifier: string; kind: ModuleDependencyKind };

/**
 * Every module specifier a source file writes, read from tokens rather than
 * from raw text.
 *
 * The edge walk above matches regexes against the whole file, which
 * over-reports: a doc comment showing `import('./robot-scene')` looks
 * exactly like the call it documents. That costs the walk nothing, because a
 * specifier naming no real module drops out. It costs a fail-closed consumer
 * everything, because the same comment becomes an unresolvable first-party
 * reference and refuses a tree that is fine. Tokenizing discards comments,
 * so what comes back is what the compiler sees.
 *
 * MDX is not TypeScript and tokenizing its prose would classify quoted
 * phrases as strings, so an MDX body keeps the regex reading. It has no
 * comment syntax for a specifier to hide in.
 */
function writtenSpecifiers(
  modulePath: string,
  text: string,
): WrittenSpecifier[] {
  if (extname(modulePath) === '.mdx') {
    const found: WrittenSpecifier[] = [];
    for (const match of text.matchAll(IMPORT_STATEMENT)) {
      const specifier = match[3] ?? match[4];
      if (specifier !== undefined) found.push({ specifier, kind: 'import' });
    }
    for (const match of text.matchAll(REEXPORT_STATEMENT)) {
      found.push({ specifier: match[3], kind: 'reexport' });
    }
    for (const match of text.matchAll(STAR_REEXPORT)) {
      found.push({ specifier: match[2], kind: 'reexport' });
    }
    for (const match of text.matchAll(DYNAMIC_IMPORT)) {
      found.push({ specifier: match[1], kind: 'dynamic' });
    }
    return found;
  }
  const tokens = tokenizeSource(text);
  const found: WrittenSpecifier[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    if (next === undefined) break;
    if (token.kind === 'identifier' && token.value === 'import') {
      // `import './globals.css'` and `import('./robot-scene')`.
      if (next.kind === 'string') {
        found.push({ specifier: next.value, kind: 'import' });
        continue;
      }
      if (
        next.kind === 'punctuation' &&
        next.value === '(' &&
        tokens[index + 2]?.kind === 'string'
      ) {
        found.push({
          specifier: tokens[index + 2].value,
          kind: 'dynamic',
        });
      }
      continue;
    }
    if (
      token.kind !== 'identifier' ||
      token.value !== 'from' ||
      next.kind !== 'string'
    ) {
      continue;
    }
    // Whether this is an import clause or a re-export table is decided by the
    // keyword that opened the statement, which is the nearest `import` or
    // `export` behind the clause.
    let kind: ModuleDependencyKind | null = null;
    for (let back = index - 1; back >= 0 && index - back < 400; back -= 1) {
      const previous = tokens[back];
      if (previous.kind === 'punctuation' && previous.value === ';') break;
      if (previous.kind !== 'identifier') continue;
      if (previous.value === 'import') {
        kind = 'import';
        break;
      }
      if (previous.value === 'export') {
        kind = 'reexport';
        break;
      }
    }
    if (kind !== null) found.push({ specifier: next.value, kind });
  }
  return found;
}

export function buildModuleImportGraph(
  root: string,
  options: ModuleImportGraphOptions = {},
): ModuleImportGraph {
  const roots = options.roots ?? DEFAULT_ROOTS;
  const files = options.files ?? DEFAULT_FILES;
  const extensions = new Set(options.extensions ?? DEFAULT_EXTENSIONS);

  const paths = [
    ...roots.flatMap((directory) => filesUnder(join(root, directory))),
    ...files.map((file) => join(root, file)),
  ]
    .filter((path) => extensions.has(extname(path)))
    .filter(
      (path) =>
        !relative(root, path)
          .split('/')
          .some((name) => isSyncConflictDuplicate(name)),
    )
    .sort();

  const textByModule = new Map<string, string>();
  for (const path of paths) {
    textByModule.set(relative(root, path), readFileSync(path, 'utf8'));
  }
  const known = new Set(textByModule.keys());

  const resolve = (specifier: string, fromModule: string): string | null => {
    let base: string;
    if (specifier.startsWith('@/')) base = specifier.slice(2);
    else if (specifier.startsWith('.')) {
      base = relative(root, join(root, dirname(fromModule), specifier));
    } else return null;
    const candidates = extensions.has(extname(base))
      ? [base]
      : [
          ...[...extensions].map((extension) => `${base}${extension}`),
          ...[...extensions].map((extension) => `${base}/index${extension}`),
        ];
    return candidates.find((candidate) => known.has(candidate)) ?? null;
  };

  /**
   * Every scanned module a template-literal specifier can name.
   *
   * Each interpolation stands for one path segment, so it matches `[^/]+`
   * rather than `.*`: `@/content/${domain}/${slug}.mdx` names the article
   * bodies two levels under `content/` and nothing nested deeper. The
   * literal parts around the interpolations are matched as written, which
   * is what keeps the family from widening to every module with the same
   * extension.
   */
  const resolveComputed = (specifier: string, fromModule: string): string[] => {
    let base: string;
    if (specifier.startsWith('@/')) base = specifier.slice(2);
    else if (specifier.startsWith('.')) {
      // Only the literal head can be resolved relatively; an interpolation
      // never introduces a `..` hop, so resolving the head and keeping the
      // rest verbatim is exact rather than approximate.
      const head = specifier.slice(0, specifier.indexOf('${'));
      base =
        relative(root, join(root, dirname(fromModule), head)) +
        specifier.slice(head.length);
    } else return [];
    const pattern = new RegExp(
      `^${base
        .split(/\$\{[^}]*\}/)
        .map((literal) => literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^/]+')}$`,
    );
    return [...known].filter((candidate) => pattern.test(candidate)).sort();
  };

  const reexports = new Map<
    string,
    Map<string, { module: string; imported: string }>
  >();
  for (const [modulePath, text] of textByModule) {
    const table = new Map<string, { module: string; imported: string }>();
    for (const match of text.matchAll(REEXPORT_STATEMENT)) {
      if (match[1]) continue;
      const target = resolve(match[3], modulePath);
      if (target === null) continue;
      for (const binding of parseClause(`{${match[2]}}`)) {
        table.set(binding.local, {
          module: target,
          imported: binding.imported,
        });
      }
    }
    reexports.set(modulePath, table);
  }

  const followReexport = (
    modulePath: string,
    imported: string,
    hops?: Set<string>,
  ): string => {
    let current = modulePath;
    let name = imported;
    for (let hop = 0; hop < 8; hop += 1) {
      const forwarded = reexports.get(current)?.get(name);
      if (!forwarded) return current;
      hops?.add(current);
      current = forwarded.module;
      name = forwarded.imported;
    }
    return current;
  };

  const edges = new Map<string, Set<string>>();
  const bindingsByModule = new Map<string, ImportBinding[]>();
  const reexportHopsByModule = new Map<string, Set<string>>();
  for (const [modulePath, text] of textByModule) {
    const used = text.replace(IMPORT_STATEMENT, ' ');
    const targets = new Set<string>();
    const moduleBindings: ImportBinding[] = [];
    const hops = new Set<string>();
    for (const match of text.matchAll(IMPORT_STATEMENT)) {
      if (match[1]) continue;
      const specifier = match[3] ?? match[4];
      if (specifier === undefined) continue;
      const target = resolve(specifier, modulePath);
      if (target === null) continue;
      const bindings = parseClause(match[2] ?? '');
      if (bindings.length === 0) {
        // A side-effect import (`import './globals.css'`) has no binding to
        // look for; the dependency is unconditional.
        targets.add(target);
        continue;
      }
      for (const binding of bindings) {
        if (!new RegExp(`\\b${binding.local}\\b`).test(used)) continue;
        const defining = followReexport(target, binding.imported, hops);
        targets.add(defining);
        moduleBindings.push({ ...binding, module: defining });
      }
    }
    for (const match of text.matchAll(DYNAMIC_IMPORT)) {
      const target = resolve(match[1], modulePath);
      if (target !== null) targets.add(target);
    }
    for (const match of text.matchAll(STAR_REEXPORT)) {
      if (match[1]) continue;
      const target = resolve(match[2], modulePath);
      if (target !== null) targets.add(target);
    }
    edges.set(modulePath, targets);
    bindingsByModule.set(modulePath, moduleBindings);
    reexportHopsByModule.set(modulePath, hops);
  }

  // Only a module that writes a backtick `import(` can have a computed
  // dependency, so the expensive tokenizing scan runs on those alone. The
  // prefilter is deliberately looser than the thing it looks for: it may
  // admit a module whose only match is inside a comment, and the tokenizer
  // then reports no computed specifier for it.
  const computedDependenciesByModule = new Map<string, ComputedDependency[]>();
  for (const [modulePath, text] of textByModule) {
    if (!/\bimport\s*\(\s*`/.test(text)) continue;
    const found = writtenSpecifiers(modulePath, text)
      .filter(
        ({ specifier }) =>
          specifier.includes('${') &&
          (specifier.startsWith('@/') || specifier.startsWith('.')),
      )
      .map(({ specifier, kind }) => ({
        specifier,
        kind,
        targets: resolveComputed(specifier, modulePath),
      }));
    if (found.length > 0) computedDependenciesByModule.set(modulePath, found);
  }

  const classify = (
    specifier: string,
    fromModule: string,
  ): {
    resolution: FirstPartySpecifierResolution['resolution'];
    path: string | null;
    computedTargets: readonly string[];
  } => {
    // A template literal with an interpolation names a family of modules
    // rather than one, so it stays its own resolution with a null path: no
    // single member of the family is the answer. What it does carry is the
    // family itself, which is what lets a consumer check the members instead
    // of taking a prefix claim on trust.
    if (specifier.includes('${')) {
      return {
        resolution: 'computed',
        path: null,
        computedTargets: resolveComputed(specifier, fromModule),
      };
    }
    const asModule = resolve(specifier, fromModule);
    if (asModule !== null) {
      return { resolution: 'module', path: asModule, computedTargets: [] };
    }
    const base = specifier.startsWith('@/')
      ? specifier.slice(2)
      : relative(root, join(root, dirname(fromModule), specifier));
    const candidates = [
      base,
      ...[...extensions].map((extension) => `${base}${extension}`),
      ...[...extensions].map((extension) => `${base}/index${extension}`),
    ];
    for (const candidate of candidates) {
      const absolute = join(root, candidate);
      if (!existsSync(absolute) || !statSync(absolute).isFile()) continue;
      return {
        resolution: extensions.has(extname(candidate))
          ? 'unscanned-module'
          : 'asset',
        path: candidate,
        computedTargets: [],
      };
    }
    return { resolution: 'missing', path: null, computedTargets: [] };
  };

  return {
    root,
    modules: [...known].sort(),
    textByModule,
    edges,
    bindingsByModule,
    reexportHopsByModule,
    computedDependenciesByModule,
    resolveSpecifier: resolve,
    firstPartySpecifiersIn(modules) {
      const found: FirstPartySpecifierResolution[] = [];
      for (const modulePath of modules) {
        const text = textByModule.get(modulePath);
        if (text === undefined) {
          throw new Error(
            `Unknown module in specifier scan: ${modulePath}`,
          );
        }
        for (const { specifier, kind } of writtenSpecifiers(modulePath, text)) {
          if (!specifier.startsWith('@/') && !specifier.startsWith('.')) {
            continue;
          }
          found.push({
            module: modulePath,
            specifier,
            kind,
            ...classify(specifier, modulePath),
          });
        }
      }
      return found.sort(
        (left, right) =>
          left.module.localeCompare(right.module) ||
          left.specifier.localeCompare(right.specifier),
      );
    },
    reachableFrom(entries) {
      const reachable = new Set<string>();
      const queue = [...entries];
      while (queue.length > 0) {
        const current = queue.pop() as string;
        if (reachable.has(current)) continue;
        if (!known.has(current)) {
          throw new Error(`Unknown module in reachability walk: ${current}`);
        }
        reachable.add(current);
        for (const next of edges.get(current) ?? []) queue.push(next);
      }
      return reachable;
    },
  };
}
