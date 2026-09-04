import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildModuleImportGraph,
  type ModuleImportGraph,
} from './module-import-graph.ts';

/**
 * The staleness fingerprint of a browser-sweep evidence artifact, derived
 * from the import closure of the things the sweep measures.
 *
 * Every one of these artifacts used to carry a hand-typed list of source
 * paths, and a hand-typed list is a guess about a closure rather than the
 * closure. It omits whatever nobody thought of — the mobile-shell list
 * omitted `lib/utils.ts`, which decides the class names the shell renders,
 * and the sweep that wrote the artifact — and it goes stale the moment
 * somebody adds an import, silently, in the direction that keeps evidence
 * looking fresh. That is precisely the failure these readers exist to
 * prevent: an artifact accepted as current over a tree that has moved.
 *
 * Deriving it from `lib/module-import-graph.ts` replaces four such lists
 * with the mechanism that already answers "what does this entry reach",
 * and it fails closed. A first-party specifier the graph cannot resolve to
 * a scanned module is not skipped, it stops the fingerprint: the whole
 * point is that nothing in the closure is allowed to go unrecorded, and a
 * silently dropped specifier is an omission wearing a resolver's clothes.
 *
 * A fingerprint is still only a drift detector. It says the bytes behind
 * the sweep have not moved since the sweep ran; it does not say the sweep
 * measured the right thing. Each reader carries its own predicates for
 * that, and the closure only makes sure they are reading current evidence.
 */
const EVIDENCE_CLOSURE_ROOTS = [
  'app',
  'components',
  'lib',
  'content',
  'data',
] as const;

/**
 * Modules outside those roots that the closure walk has to be able to see.
 *
 * The MDX registry is a route entry. The rest are the measurement side: the
 * five sweeps that write into `evidence/brand-v2/`, and the fixture and
 * probe modules they share. A sweep's own bytes decide what it recorded, so
 * an artifact whose writer changed is exactly as stale as one whose subject
 * changed, and leaving the spec out of its own fingerprint let a rewritten
 * measurement re-certify an old reading.
 */
const EVIDENCE_CLOSURE_FILES = [
  'mdx-components.tsx',
  'tests/e2e/brand-v2-static-fixture.ts',
  'tests/e2e/static-export-server.ts',
  'tests/e2e/rendered-text-probe.ts',
  'tests/e2e/brand-v2-home.spec.ts',
  'tests/e2e/brand-v2-home-tools.spec.ts',
  'tests/e2e/brand-v2-identity.spec.ts',
  'tests/e2e/brand-v2-mobile-shell.spec.ts',
  'tests/e2e/brand-v2-shell.spec.ts',
] as const;

/** Next.js App Router segment files; each is an entry into a rendered tree. */
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

const CONTENT_ROOT = 'content';
const MDX_REGISTRY_MODULE = 'mdx-components.tsx';

export type EvidenceClosure = {
  /** The measured entry points, sorted. */
  entries: string[];
  /** Every module reachable from them, sorted. */
  modules: string[];
  /**
   * Non-module files the closure imports: the stylesheet, the JSON
   * registries, the font metadata. They carry no imports to walk and their
   * bytes still decide what renders.
   */
  assets: string[];
  /** Everything hashed, sorted. */
  files: string[];
  fingerprint: string;
};

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

let cached: { key: string; graph: ModuleImportGraph } | null = null;

/**
 * The graph the evidence closures are read from.
 *
 * Cached per root because a single generator run derives five closures over
 * the same tree and each build reads several hundred files. The cache is
 * keyed by root and cleared by `clearEvidenceClosureGraph`, which the
 * staleness tests call between mutations of a fixture tree.
 */
export function evidenceClosureGraph(root: string): ModuleImportGraph {
  if (cached?.key === root) return cached.graph;
  const graph = buildModuleImportGraph(root, {
    roots: EVIDENCE_CLOSURE_ROOTS,
    files: EVIDENCE_CLOSURE_FILES,
  });
  cached = { key: root, graph };
  return graph;
}

export function clearEvidenceClosureGraph(): void {
  cached = null;
}

/**
 * Every module that renders a public route: each App Router segment file,
 * every MDX body, and the registry that supplies the MDX element mapping.
 *
 * Derived from the scanned tree rather than listed, so a new route or a new
 * article joins the closures that quantify over all of them instead of
 * escaping them. MDX bodies are entries in their own right because the
 * article template reaches them through a template-literal dynamic import
 * that the graph cannot resolve; that resolution gap is recorded against
 * `brand-v2-article-template-typography-and-primitives` and treating the
 * bodies as entries covers their bytes in the meantime.
 */
export function routeEntryModules(graph: ModuleImportGraph): string[] {
  const entries = graph.modules.filter(
    (modulePath) =>
      (modulePath.startsWith('app/') &&
        ROUTE_SEGMENT_FILES.has(modulePath.split('/').at(-1) ?? '')) ||
      modulePath.startsWith(`${CONTENT_ROOT}/`) ||
      modulePath === MDX_REGISTRY_MODULE,
  );
  if (entries.length === 0) {
    throw new Error(
      'the evidence closure graph found no route entry module, so a whole-site closure would cover nothing',
    );
  }
  return entries.sort();
}

/**
 * A computed specifier the closure may keep, and the reason it is not a
 * hole.
 *
 * `app/(content)/[domain]/[slug]/page.tsx` reaches every article body
 * through `import(`@/content/${domain}/${slug}.mdx`)`, which names a family
 * of modules rather than one. Resolving it properly belongs to
 * `brand-v2-article-template-typography-and-primitives`, which owns that
 * file. Until then a closure may accept it only by naming a directory whose
 * *every* scanned module it already contains, and the derivation checks
 * that claim: if one MDX body is outside the closure, the allowance does
 * not apply and the fingerprint refuses. An allowance that matches no
 * computed specifier is equally a failure, because a stale one would sit
 * there granting nothing and looking like coverage.
 */
export type ComputedSpecifierAllowance = {
  module: string;
  /** Directory prefix, with its trailing slash. */
  coveredByPrefix: string;
  reason: string;
};

export type EvidenceClosureInput = {
  root: string;
  /** The production and measurement modules the artifact is evidence about. */
  entries: readonly string[];
  /**
   * Values that are part of the artifact's identity without being a file:
   * the locked identity strings, a registered device geometry, the swept
   * route ids. Hashed alongside the closure.
   */
  facts?: readonly string[];
  computedSpecifiers?: readonly ComputedSpecifierAllowance[];
};

/**
 * The article template's runtime import of an MDX body, which the whole-site
 * closures cover by holding every module under `content/`.
 */
export const ARTICLE_BODY_COMPUTED_IMPORT: ComputedSpecifierAllowance = {
  module: 'app/(content)/[domain]/[slug]/page.tsx',
  coveredByPrefix: `${CONTENT_ROOT}/`,
  reason:
    'the article template names its body with a template literal the module graph cannot resolve; this closure holds every content module as an entry, so no body escapes it. Resolving the specifier is owned by brand-v2-article-template-typography-and-primitives.',
};

/**
 * The closure of the given entries, and the fingerprint over its bytes.
 *
 * Refuses rather than under-report, in five ways. An empty entry list, an
 * entry the graph never scanned, and a closure that reaches nothing beyond
 * its own entries all mean the resolver did not do its job. A first-party
 * specifier that resolves to no file at all, and one that resolves to a
 * module outside the scanned roots, both mean a real dependency would be
 * hashed as nothing or hashed without being walked. Each of those is the
 * silent omission the derivation exists to remove, so none of them is
 * allowed to produce a fingerprint.
 */
export function deriveEvidenceClosure(
  input: EvidenceClosureInput,
): EvidenceClosure {
  const entries = [...new Set(input.entries)].sort();
  if (entries.length === 0) {
    throw new Error(
      'an evidence closure needs at least one entry point: an empty closure would fingerprint nothing and accept any artifact',
    );
  }
  const graph = evidenceClosureGraph(input.root);
  for (const entry of entries) {
    if (!graph.textByModule.has(entry)) {
      throw new Error(
        `${entry} is not a scanned module, so its closure cannot be derived`,
      );
    }
  }

  const modules = new Set(graph.reachableFrom(entries));
  // A barrel a closure module imports through is evaluated when the closure
  // runs, and the walk attributes the forwarded binding to the module that
  // defines it — right for "which module renders this", wrong here, because
  // the barrel's own bytes decide what it forwards.
  const pending = [...modules];
  while (pending.length > 0) {
    const current = pending.pop() as string;
    for (const hop of graph.reexportHopsByModule.get(current) ?? []) {
      if (modules.has(hop)) continue;
      for (const reached of graph.reachableFrom([hop])) {
        if (modules.has(reached)) continue;
        modules.add(reached);
        pending.push(reached);
      }
    }
  }
  if (modules.size <= entries.length) {
    throw new Error(
      `the closure of ${entries.join(', ')} reaches ${modules.size} module(s), no more than the entries themselves, so no import was resolved`,
    );
  }

  const allowances = new Map(
    (input.computedSpecifiers ?? []).map((allowance) => [
      allowance.module,
      allowance,
    ]),
  );
  const usedAllowances = new Set<string>();
  const assets = new Set<string>();
  for (const resolved of graph.firstPartySpecifiersIn(modules)) {
    if (resolved.resolution === 'module') continue;
    if (resolved.resolution === 'asset') {
      assets.add(resolved.path as string);
      continue;
    }
    if (resolved.resolution === 'computed') {
      const allowance = allowances.get(resolved.module);
      if (!allowance) {
        throw new Error(
          `${resolved.module} imports ${resolved.specifier}, a computed specifier this closure does not account for, so the modules it names would go unrecorded`,
        );
      }
      const uncovered = graph.modules.filter(
        (modulePath) =>
          modulePath.startsWith(allowance.coveredByPrefix) &&
          !modules.has(modulePath),
      );
      if (uncovered.length > 0) {
        throw new Error(
          `${resolved.module} imports ${resolved.specifier} and this closure claims ${allowance.coveredByPrefix} covers it, but ${uncovered.length} module(s) under that prefix are outside the closure, starting with ${uncovered[0]}`,
        );
      }
      usedAllowances.add(resolved.module);
      continue;
    }
    throw new Error(
      resolved.resolution === 'unscanned-module'
        ? `${resolved.module} imports ${resolved.specifier}, which is the module ${resolved.path} outside the scanned closure roots: hashing it as a leaf would leave its own imports unrecorded`
        : `${resolved.module} imports ${resolved.specifier}, which resolves to no file, so the closure cannot record what it depends on`,
    );
  }
  for (const allowance of allowances.keys()) {
    if (usedAllowances.has(allowance)) continue;
    throw new Error(
      `this closure allows a computed specifier in ${allowance}, which writes none: a stale allowance reads as coverage it does not provide`,
    );
  }

  const files = [...modules, ...assets].sort();
  const parts = files.map(
    (path) => `${path}:${sha256(readFileSync(join(input.root, path)))}`,
  );
  return {
    entries,
    modules: [...modules].sort(),
    assets: [...assets].sort(),
    files,
    fingerprint: sha256([...parts, ...(input.facts ?? [])].join('\n')),
  };
}
