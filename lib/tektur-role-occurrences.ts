import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildModuleImportGraph,
  type ModuleImportGraph,
} from './module-import-graph.ts';

/**
 * Where the registered Tektur display roles actually occur, derived from
 * source rather than declared beside the registry.
 *
 * `data/type-roles.json` used to carry a hand-typed `routes` array per role,
 * and the browser gate visited exactly those routes. That let the registry
 * choose the pages it is checked on: `SiteShell` is mounted by
 * `app/layout.tsx` on every route while the array named three, and the
 * shared `ArticleHeader` renders `article-h1` on all 47 published articles
 * while the array named one. A width-specific or route-specific axis
 * override on any unlisted page was therefore invisible rather than wrong.
 *
 * So the occurrence population is computed here: the roles each module
 * writes come from the annotation assignments in first-party source, and the
 * routes each module reaches come from the used-import graph starting at that
 * route's own Next.js segment files. The rendered sweep then has to equal
 * this set exactly, on every public route and at every declared width.
 */
export type TekturRoleWriter = {
  role: string;
  /** Repository-relative module that writes the annotation. */
  module: string;
  /** Static assignments of this role in that module. */
  occurrences: number;
};

export type TekturRouteExpectation = {
  route: string;
  /** The Next.js segment files that compose this route. */
  entryModules: string[];
  /** Roles a module reachable from those entries writes. */
  roles: string[];
};

export type TekturRoleOccurrences = {
  writers: TekturRoleWriter[];
  writerModulesByRole: Record<string, string[]>;
  routes: TekturRouteExpectation[];
  rolesByRoute: Record<string, string[]>;
  routesByRole: Record<string, string[]>;
  /** Every role written anywhere in first-party source. */
  writtenRoles: string[];
};

/** Route-composing files, in the App Router sense. */
const SEGMENT_FILES = {
  page: 'page.tsx',
  layout: 'layout.tsx',
  notFound: 'not-found.tsx',
} as const;

const ROLE_ASSIGNMENT =
  /data-tektur-role\s*=\s*(?:"([A-Za-z0-9-]+)"|'([A-Za-z0-9-]+)'|(\{))/g;

function urlSegments(modulePath: string, fileName: string): string[] {
  return modulePath
    .replace(/^app\//, '')
    .replace(new RegExp(`(?:^|/)${fileName}$`), '')
    .split('/')
    .filter((segment) => segment.length > 0 && !segment.startsWith('('));
}

function isDynamic(segment: string): boolean {
  return segment.startsWith('[') && segment.endsWith(']');
}

export type TekturRoleOccurrenceOptions = {
  root?: string;
  /** Public destination paths, plus the separate not-found path. */
  routes?: readonly string[];
  notFoundRoute?: string;
  graph?: ModuleImportGraph;
};

function registryRoutes(root: string): { routes: string[]; notFound: string } {
  const registry = JSON.parse(
    readFileSync(join(root, 'contract', 'brand-v2-registries.json'), 'utf8'),
  ) as {
    routes: {
      public: Array<{ path: string }>;
      notFound: { path: string };
    };
  };
  return {
    routes: registry.routes.public.map(({ path }) => path),
    notFound: registry.routes.notFound.path,
  };
}

export function deriveTekturRoleOccurrences(
  options: TekturRoleOccurrenceOptions = {},
): TekturRoleOccurrences {
  const root = options.root ?? process.cwd();
  const graph = options.graph ?? buildModuleImportGraph(root);
  const declared = registryRoutes(root);
  const notFoundRoute = options.notFoundRoute ?? declared.notFound;
  const routePaths = [...(options.routes ?? declared.routes), notFoundRoute];
  if (routePaths.length === 0) {
    throw new Error('No routes to derive Tektur role occurrences for.');
  }

  const rolesByModule = new Map<string, Map<string, number>>();
  for (const modulePath of graph.modules) {
    const text = graph.textByModule.get(modulePath) ?? '';
    for (const match of text.matchAll(ROLE_ASSIGNMENT)) {
      if (match[3] !== undefined) {
        // A computed annotation cannot be attributed to a role from source,
        // so the derivation refuses it rather than silently under-reporting
        // the population it is supposed to be complete over.
        throw new Error(
          `${modulePath} assigns data-tektur-role from an expression; the occurrence derivation requires a literal role.`,
        );
      }
      const role = (match[1] ?? match[2]) as string;
      const counts = rolesByModule.get(modulePath) ?? new Map<string, number>();
      counts.set(role, (counts.get(role) ?? 0) + 1);
      rolesByModule.set(modulePath, counts);
    }
  }

  const writers: TekturRoleWriter[] = [...rolesByModule]
    .flatMap(([module, counts]) =>
      [...counts].map(([role, occurrences]) => ({ role, module, occurrences })),
    )
    .sort((left, right) =>
      left.role === right.role
        ? left.module.localeCompare(right.module)
        : left.role.localeCompare(right.role),
    );
  if (writers.length === 0) {
    throw new Error('No module writes a data-tektur-role annotation.');
  }

  const segmentModules = (fileName: string): string[] =>
    graph.modules.filter(
      (modulePath) =>
        modulePath.startsWith('app/') &&
        modulePath.split('/').at(-1) === fileName,
    );
  const pages = segmentModules(SEGMENT_FILES.page).map((modulePath) => ({
    modulePath,
    segments: urlSegments(modulePath, SEGMENT_FILES.page),
  }));
  const layouts = segmentModules(SEGMENT_FILES.layout).map((modulePath) => ({
    modulePath,
    segments: urlSegments(modulePath, SEGMENT_FILES.layout),
  }));
  const notFoundModules = segmentModules(SEGMENT_FILES.notFound);
  if (pages.length === 0 || layouts.length === 0) {
    throw new Error('The App Router segment population is empty.');
  }
  for (const { modulePath, segments } of pages) {
    for (const segment of segments) {
      if (segment.startsWith('[...') || segment.startsWith('[[')) {
        throw new Error(
          `${modulePath} declares the catch-all segment ${segment}, which this derivation does not resolve.`,
        );
      }
    }
  }

  const articleContentModule = (segments: string[]): string[] => {
    const candidate = `content/${segments.join('/')}.mdx`;
    return graph.modules.includes(candidate) ? [candidate] : [];
  };
  const mdxRegistry = graph.modules.filter(
    (modulePath) => modulePath === 'mdx-components.tsx',
  );

  const entriesFor = (route: string): string[] => {
    const segments = route.split('/').filter(Boolean);
    if (route === notFoundRoute) {
      if (notFoundModules.length !== 1) {
        throw new Error(
          `Expected exactly one not-found segment file, found ${notFoundModules.length}.`,
        );
      }
      return [
        ...notFoundModules,
        ...layouts
          .filter(({ segments: own }) => own.length === 0)
          .map(({ modulePath }) => modulePath),
      ];
    }
    const matches = pages.filter(
      ({ segments: own }) =>
        own.length === segments.length &&
        own.every(
          (segment, index) => isDynamic(segment) || segment === segments[index],
        ),
    );
    if (matches.length === 0) {
      throw new Error(`No App Router page module renders ${route}.`);
    }
    const literalScore = ({ segments: own }: { segments: string[] }): number =>
      own.filter((segment) => !isDynamic(segment)).length;
    const best = Math.max(...matches.map(literalScore));
    const selected = matches.filter((page) => literalScore(page) === best);
    if (selected.length !== 1) {
      throw new Error(
        `Route ${route} resolves ambiguously to ${selected
          .map(({ modulePath }) => modulePath)
          .join(', ')}.`,
      );
    }
    const content = articleContentModule(segments);
    return [
      selected[0].modulePath,
      ...layouts
        .filter(
          ({ segments: own }) =>
            own.length <= segments.length &&
            own.every((segment, index) => segment === segments[index]),
        )
        .map(({ modulePath }) => modulePath),
      ...content,
      // The MDX component registry is reachable from every article body, so
      // a role written by a module it maps would occur on every article.
      ...(content.length > 0 ? mdxRegistry : []),
    ];
  };

  const routes: TekturRouteExpectation[] = routePaths.map((route) => {
    const entryModules = [...new Set(entriesFor(route))].sort();
    const reachable = graph.reachableFrom(entryModules);
    const roles = new Set<string>();
    for (const modulePath of reachable) {
      for (const role of rolesByModule.get(modulePath)?.keys() ?? []) {
        roles.add(role);
      }
    }
    return { route, entryModules, roles: [...roles].sort() };
  });

  const rolesByRoute = Object.fromEntries(
    routes.map(({ route, roles }) => [route, roles]),
  );
  const writtenRoles = [...new Set(writers.map(({ role }) => role))].sort();
  const routesByRole = Object.fromEntries(
    writtenRoles.map((role) => [
      role,
      routes
        .filter(({ roles }) => roles.includes(role))
        .map(({ route }) => route),
    ]),
  );
  const writerModulesByRole = Object.fromEntries(
    writtenRoles.map((role) => [
      role,
      writers
        .filter((writer) => writer.role === role)
        .map(({ module }) => module)
        .sort(),
    ]),
  );

  return {
    writers,
    writerModulesByRole,
    routes,
    rolesByRoute,
    routesByRole,
    writtenRoles,
  };
}
