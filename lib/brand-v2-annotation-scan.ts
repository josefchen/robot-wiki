import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { isSyncConflictDuplicate } from './sync-duplicates.ts';

/**
 * The source half of the surface/control population (VAL-B2-SURF-010:
 * "source, registry, and rendered populations are equal").
 *
 * A rendered-DOM sweep alone cannot see an ID that only some unvisited route
 * paints, and a registry read alone cannot see an ID a component invents. So
 * the annotation literals are read straight out of first-party source and
 * reconciled against the registry independently of any browser run.
 */
export type AnnotationScan = {
  /** First-party modules scanned, repository-relative. */
  modules: readonly string[];
  surfaceIds: readonly string[];
  controlIds: readonly string[];
  /** Modules that mention each annotation ID, by ID. */
  ownersById: Readonly<Record<string, readonly string[]>>;
};

const SOURCE_ROOTS = ['app', 'components', 'lib'] as const;
const SOURCE_FILES = ['mdx-components.tsx'] as const;
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const ID_PATTERN = /(?:'|")((?:surface|control):[a-z0-9-]+)(?:'|")/g;

function filesUnder(directory: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) files.push(...filesUnder(path));
    else files.push(path);
  }
  return files;
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

  const owners = new Map<string, string[]>();
  const modules: string[] = [];
  for (const path of paths) {
    const modulePath = relative(root, path);
    modules.push(modulePath);
    const text = readFileSync(path, 'utf8');
    for (const match of text.matchAll(ID_PATTERN)) {
      const id = match[1];
      const seen = owners.get(id);
      if (seen === undefined) owners.set(id, [modulePath]);
      else if (seen.at(-1) !== modulePath) seen.push(modulePath);
    }
  }

  const ids = [...owners.keys()].sort();
  return {
    modules,
    surfaceIds: ids.filter((id) => id.startsWith('surface:')),
    controlIds: ids.filter((id) => id.startsWith('control:')),
    ownersById: Object.fromEntries(
      [...owners].map(([id, list]) => [id, [...list].sort()]),
    ),
  };
}
