import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
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
 * its defining module without making the barrel itself a mount.
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
  /** Modules reachable from the given entries through used imports. */
  reachableFrom: (entries: Iterable<string>) => Set<string>;
};

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

  const followReexport = (modulePath: string, imported: string): string => {
    let current = modulePath;
    let name = imported;
    for (let hop = 0; hop < 8; hop += 1) {
      const forwarded = reexports.get(current)?.get(name);
      if (!forwarded) return current;
      current = forwarded.module;
      name = forwarded.imported;
    }
    return current;
  };

  const edges = new Map<string, Set<string>>();
  const bindingsByModule = new Map<string, ImportBinding[]>();
  for (const [modulePath, text] of textByModule) {
    const used = text.replace(IMPORT_STATEMENT, ' ');
    const targets = new Set<string>();
    const moduleBindings: ImportBinding[] = [];
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
        const defining = followReexport(target, binding.imported);
        targets.add(defining);
        moduleBindings.push({ ...binding, module: defining });
      }
    }
    edges.set(modulePath, targets);
    bindingsByModule.set(modulePath, moduleBindings);
  }

  return {
    root,
    modules: [...known].sort(),
    textByModule,
    edges,
    bindingsByModule,
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
