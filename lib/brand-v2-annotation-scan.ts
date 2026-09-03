import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { isSyncConflictDuplicate } from './sync-duplicates.ts';

/**
 * The source half of the surface/control population (VAL-B2-SURF-010:
 * "source, registry, and rendered populations are equal") and the ownership
 * half of VAL-B2-COMP-013 ("A control/state registry assigns ... owner
 * route/mount").
 *
 * A rendered-DOM sweep alone cannot see an ID that only some unvisited route
 * paints, and a registry read alone cannot see an ID a component invents. So
 * the annotation literals are read straight out of first-party source and
 * reconciled against the registry independently of any browser run.
 *
 * Writing an ID is not owning it. `components/ui/action.tsx` defines the
 * shared primitive that writes `control:primary-action`, but nothing mounts
 * `<Action>`, so recording that definition file as the control's
 * `ownerRouteOrMount` claims a production mount that does not exist. The
 * mount graph below therefore resolves each module's imports and answers a
 * different question: is this module reachable from a route entry — an
 * `app/` segment file, an MDX article, or the MDX component registry — by a
 * chain of modules that actually use what they import? Only the reachable
 * writers are owners; the rest are recorded as defined-but-unmounted.
 */
export type AnnotationScan = {
  /** First-party modules scanned, repository-relative. */
  modules: readonly string[];
  /** Modules reachable from a route entry through used imports. */
  productionModules: readonly string[];
  /** Route-entry modules the reachability walk starts from. */
  routeEntries: readonly string[];
  surfaceIds: readonly string[];
  controlIds: readonly string[];
  deviceIds: readonly string[];
  /** Modules that write each annotation ID, by ID. */
  ownersById: Readonly<Record<string, readonly string[]>>;
  /** Production-reachable writers of each annotation ID, by ID. */
  productionOwnersById: Readonly<Record<string, readonly string[]>>;
  /** Writers of each annotation ID that no route entry reaches, by ID. */
  unmountedOwnersById: Readonly<Record<string, readonly string[]>>;
};

const SOURCE_ROOTS = ['app', 'components', 'lib'] as const;
const SOURCE_FILES = ['mdx-components.tsx'] as const;
const CONTENT_ROOT = 'content';
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const MODULE_EXTENSIONS = new Set(['.ts', '.tsx', '.mdx']);
const ID_PATTERN = /(?:'|")((?:surface|control|device):[a-z0-9-]+)(?:'|")/g;
/** Next.js App Router segment files; each is an entry into the rendered tree. */
const ROUTE_SEGMENT_FILES = new Set([
  'page.tsx',
  'layout.tsx',
  'template.tsx',
  'not-found.tsx',
  'error.tsx',
  'global-error.tsx',
  'loading.tsx',
  'default.tsx',
]);

function filesUnder(directory: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) files.push(...filesUnder(path));
    else files.push(path);
  }
  return files;
}

const IMPORT_STATEMENT =
  /import\s+(type\s+)?([^'";]*?)\s*from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g;
const REEXPORT_STATEMENT =
  /export\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;

type Binding = { local: string; imported: string };

function parseClause(clause: string): Binding[] {
  const bindings: Binding[] = [];
  const trimmed = clause.trim();
  if (trimmed.length === 0) return bindings;
  const braceStart = trimmed.indexOf('{');
  const braceEnd = trimmed.lastIndexOf('}');
  const head =
    braceStart === -1 ? trimmed : trimmed.slice(0, braceStart).replace(/,\s*$/, '');
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
      const [imported, alias] = entry.split(/\s+as\s+/).map((piece) => piece.trim());
      bindings.push({ local: alias ?? imported, imported });
    }
  }
  return bindings;
}

function stripImports(text: string): string {
  return text.replace(IMPORT_STATEMENT, ' ');
}

export function scanAnnotationLiterals(root: string): AnnotationScan {
  const paths = [
    ...SOURCE_ROOTS.flatMap((directory) => filesUnder(join(root, directory))),
    ...SOURCE_FILES.map((file) => join(root, file)),
  ]
    .filter((path) => SOURCE_EXTENSIONS.has(extname(path)))
    .filter(
      (path) =>
        !relative(root, path)
          .split('/')
          .some((name) => isSyncConflictDuplicate(name)),
    )
    .sort();
  const contentPaths = filesUnder(join(root, CONTENT_ROOT))
    .filter((path) => extname(path) === '.mdx')
    .filter(
      (path) =>
        !relative(root, path)
          .split('/')
          .some((name) => isSyncConflictDuplicate(name)),
    )
    .sort();

  const owners = new Map<string, string[]>();
  const modules: string[] = [];
  const textByModule = new Map<string, string>();
  for (const path of paths) {
    const modulePath = relative(root, path);
    modules.push(modulePath);
    const text = readFileSync(path, 'utf8');
    textByModule.set(modulePath, text);
    for (const match of text.matchAll(ID_PATTERN)) {
      const id = match[1];
      const seen = owners.get(id);
      if (seen === undefined) owners.set(id, [modulePath]);
      else if (seen.at(-1) !== modulePath) seen.push(modulePath);
    }
  }
  for (const path of contentPaths) {
    const modulePath = relative(root, path);
    textByModule.set(modulePath, readFileSync(path, 'utf8'));
  }

  const known = new Set(textByModule.keys());
  const resolve = (specifier: string, fromModule: string): string | null => {
    let base: string;
    if (specifier.startsWith('@/')) base = specifier.slice(2);
    else if (specifier.startsWith('.')) {
      base = relative(root, join(root, dirname(fromModule), specifier));
    } else return null;
    const candidates = MODULE_EXTENSIONS.has(extname(base))
      ? [base]
      : [
          `${base}.tsx`,
          `${base}.ts`,
          `${base}.mdx`,
          `${base}/index.tsx`,
          `${base}/index.ts`,
        ];
    return candidates.find((candidate) => known.has(candidate)) ?? null;
  };

  // Re-export tables let a barrel forward a name without using it: importing
  // `{ Surface }` from `components/ui` must resolve to `components/ui/surface`
  // without making the barrel itself a mount of every primitive it lists.
  const reexports = new Map<string, Map<string, { module: string; imported: string }>>();
  for (const [modulePath, text] of textByModule) {
    const table = new Map<string, { module: string; imported: string }>();
    for (const match of text.matchAll(REEXPORT_STATEMENT)) {
      if (match[1]) continue;
      const target = resolve(match[3], modulePath);
      if (target === null) continue;
      for (const binding of parseClause(`{${match[2]}}`)) {
        table.set(binding.local, { module: target, imported: binding.imported });
      }
    }
    reexports.set(modulePath, table);
  }

  const followReexport = (
    modulePath: string,
    imported: string,
  ): string => {
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
  for (const [modulePath, text] of textByModule) {
    const used = stripImports(text);
    const targets = new Set<string>();
    for (const match of text.matchAll(IMPORT_STATEMENT)) {
      if (match[1]) continue;
      const specifier = match[3] ?? match[4];
      if (specifier === undefined) continue;
      const target = resolve(specifier, modulePath);
      if (target === null) continue;
      for (const binding of parseClause(match[2] ?? '')) {
        // An imported name that the module never mentions again cannot mount
        // anything; counting it would make every barrel a production owner.
        if (!new RegExp(`\\b${binding.local}\\b`).test(used)) continue;
        targets.add(followReexport(target, binding.imported));
      }
    }
    edges.set(modulePath, targets);
  }

  const routeEntries = [...known]
    .filter(
      (modulePath) =>
        (modulePath.startsWith('app/') &&
          ROUTE_SEGMENT_FILES.has(modulePath.split('/').at(-1) ?? '')) ||
        modulePath.startsWith(`${CONTENT_ROOT}/`) ||
        modulePath === 'mdx-components.tsx',
    )
    .sort();

  const reachable = new Set<string>();
  const queue = [...routeEntries];
  while (queue.length > 0) {
    const current = queue.pop() as string;
    if (reachable.has(current)) continue;
    reachable.add(current);
    for (const next of edges.get(current) ?? []) queue.push(next);
  }

  const ids = [...owners.keys()].sort();
  const ownersById = Object.fromEntries(
    [...owners].map(([id, list]) => [id, [...list].sort()]),
  );
  const productionOwnersById = Object.fromEntries(
    [...owners].map(([id, list]) => [
      id,
      [...list].filter((modulePath) => reachable.has(modulePath)).sort(),
    ]),
  );
  const unmountedOwnersById = Object.fromEntries(
    [...owners].map(([id, list]) => [
      id,
      [...list].filter((modulePath) => !reachable.has(modulePath)).sort(),
    ]),
  );
  return {
    modules,
    productionModules: [...reachable]
      .filter((modulePath) => SOURCE_EXTENSIONS.has(extname(modulePath)))
      .sort(),
    routeEntries,
    surfaceIds: ids.filter((id) => id.startsWith('surface:')),
    controlIds: ids.filter((id) => id.startsWith('control:')),
    deviceIds: ids.filter((id) => id.startsWith('device:')),
    ownersById,
    productionOwnersById,
    unmountedOwnersById,
  };
}
