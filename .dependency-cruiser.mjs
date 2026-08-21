/**
 * Architecture rules, enforced by `npm run lint:architecture`.
 *
 * The wiki is a single static Next.js app, so nothing stops a stray import
 * from turning the layering inside out: a `lib/` helper reaching into a React
 * component, a UI primitive reaching into the citation registry, or an
 * interactive pulling `node:fs` into the browser bundle. TypeScript accepts all
 * of those. These rules encode the layering the codebase already follows so a
 * regression fails the gate instead of being caught (or missed) in review.
 *
 * The stack, bottom to top. A layer may only depend on layers below it:
 *
 *   data/               Zod-validated structured data. Leaf: no internal deps.
 *   lib/                Content pipeline, search, IK solver, rehype plugins.
 *   components/ui/      Presentational primitives, content-agnostic.
 *   components/mdx/     Content-bound components used inside MDX prose.
 *   components/<feature> siblings under components/ except ui/ and mdx/.
 *   app/                App Router routes: the only composition root.
 *
 * `scripts/` is build tooling that sits beside the stack: it may read from any
 * layer, and nothing shipped to the browser may read from it. `tests/` sits on
 * top of everything and is depended on by nothing.
 *
 * Root `mdx-components.tsx` is first-party shipped code: Next loads it for
 * every MDX page. Feature folders are read from disk so a new sibling is
 * gated without editing this allowlist.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Shared layers that feature folders may import; everything else is a slice. */
const SHARED_COMPONENT_LAYERS = new Set(['ui', 'mdx']);

/** Feature component folders: siblings that must not import each other. */
export const FEATURE_COMPONENTS = readdirSync(join(import.meta.dirname, 'components'), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory() && !SHARED_COMPONENT_LAYERS.has(entry.name))
  .map((entry) => entry.name)
  .sort()
  .join('|');

/** First-party code that ships to the browser or the production server. */
const FROM_SHIPPED = '^(app|components|lib|data)/|^mdx-components\\.tsx$';

const architectureRules = {
  forbidden: [
    {
      name: 'no-circular',
      comment:
        'A cycle means the two modules are really one module with an arbitrary ' +
        'split, and it makes the initialization order of the module-level ' +
        'registries in data/ depend on which file the bundler reaches first. ' +
        'Extract the shared part into its own module instead.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'not-to-unresolvable',
      comment:
        'An import that does not resolve is a build failure waiting for the ' +
        'route that exercises it. Fix the specifier or the path alias.',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'app-is-the-composition-root',
      comment:
        'Route files own metadata, static params and data fetching for one URL. ' +
        'Importing them from anywhere else drags that route wiring into an ' +
        'unrelated bundle. Move the shared part into lib/ or components/.',
      severity: 'error',
      from: { path: '^(components|lib|data|scripts)/' },
      to: { path: '^app/' },
    },
    {
      name: 'lib-is-ui-agnostic',
      comment:
        'lib/ is the pure layer: it runs in the content validator, the search ' +
        'index build and the unit tests, none of which have a DOM. Importing a ' +
        'component from it makes those callers depend on React rendering. ' +
        'Invert the dependency: let the component call lib/.',
      severity: 'error',
      from: { path: '^lib/' },
      to: { path: '^components/' },
    },
    {
      name: 'data-is-a-leaf',
      comment:
        'data/ is the bottom of the stack: registries of citations, modules, ' +
        'companies and glossary terms that lib/, components/ and the build ' +
        'scripts all read. Giving it a runtime dependency of its own creates ' +
        'import cycles through the registries. Type-only imports are allowed ' +
        'because they carry no runtime coupling.',
      severity: 'error',
      from: { path: '^data/' },
      to: {
        path: '^(lib|components|app|scripts)/',
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'ui-primitives-stay-generic',
      comment:
        'components/ui/ is the primitive layer (card, callout, table, figure, ' +
        'badge). Reaching into a registry in data/ or into a feature folder ' +
        'makes a primitive unusable outside the one page that motivated the ' +
        'change. Pass the content in as props.',
      severity: 'error',
      from: { path: '^components/ui/' },
      to: { path: `^(data/|content/|components/(mdx|${FEATURE_COMPONENTS})/)` },
    },
    {
      name: 'shared-ui-does-not-depend-on-features',
      comment:
        'components/mdx/ holds the components MDX prose can use, so every ' +
        'article pays for whatever it imports. Depending on a feature folder ' +
        'pulls that feature (and, for three/, the whole 3D stack) into the ' +
        'article bundle.',
      severity: 'error',
      from: { path: '^components/mdx/' },
      to: { path: `^components/(${FEATURE_COMPONENTS})/` },
    },
    {
      name: 'no-cross-feature-component-deps',
      comment:
        'Feature folders are independent slices of the UI. Sharing between two ' +
        'of them belongs in components/ui/ (presentational) or lib/ (logic), ' +
        'not in a sideways import that couples the market map to the ' +
        'playground. components/ui/ and components/mdx/ are the shared layers ' +
        'and stay importable.',
      severity: 'error',
      from: { path: `^components/(${FEATURE_COMPONENTS})/` },
      to: {
        path: '^components/([^/]+)/',
        pathNot: ['^components/$1/', '^components/(ui|mdx)/'],
      },
    },
    {
      name: 'no-node-core-in-client-components',
      comment:
        'Everything under components/ can end up in a client bundle, where ' +
        'node core modules do not exist. Filesystem and process access belongs ' +
        'in a server component under app/ or in a build script, which read at ' +
        'prerender time and pass plain data down as props.',
      severity: 'error',
      from: { path: '^components/' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'no-build-time-lib-in-client-components',
      comment:
        'These lib/ modules read the repository off disk at build time, so ' +
        'importing them from a component drops node:fs into the browser bundle ' +
        '(indirectly, which no bundler error will point at). Call them from a ' +
        'server component under app/ and pass the result down. An explicit ' +
        '`import type` is allowed - it is erased before the bundler sees it - ' +
        'which is how the article template shares its view-model types.',
      severity: 'error',
      from: { path: '^components/' },
      to: {
        path: '^lib/(backlinks|validate-content|sync-duplicates|not-found-export)\\.ts$',
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'build-scripts-are-not-imported',
      comment:
        'scripts/ are npm-script entry points with top-level side effects ' +
        '(they read content/, write data/reading-times.json, patch out/). ' +
        'Importing one runs it. Shared logic goes in lib/ - the pattern ' +
        'lib/citation-links.ts + scripts/check-citation-links.ts already uses.',
      severity: 'error',
      from: { path: FROM_SHIPPED },
      to: { path: '^scripts/' },
    },
    {
      name: 'no-test-code-in-shipped-code',
      comment:
        'Nothing that ships may import from tests/: fixtures and helpers pull ' +
        'in the Vitest and Playwright runtimes, which are devDependencies and ' +
        'absent from a production install.',
      severity: 'error',
      from: { path: '^(app|components|lib|data|scripts)/|^mdx-components\\.tsx$' },
      to: { path: '^tests/' },
    },
    {
      name: 'no-dev-dependencies-in-shipped-code',
      comment:
        'A devDependency imported for its runtime value breaks a production ' +
        'install even though the local build is green. Type-only imports ' +
        '(@types/*) are fine: they disappear at compile time.',
      severity: 'error',
      from: { path: FROM_SHIPPED },
      to: {
        dependencyTypes: ['npm-dev'],
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'no-undeclared-dependencies',
      comment:
        'The package is imported but not in package.json, so it only resolves ' +
        'because something else happens to hoist it. Declare it directly.',
      severity: 'error',
      from: { path: '^(app|components|lib|data|scripts|tests)/' },
      to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'] },
    },
    {
      name: 'no-deprecated-core',
      comment:
        'This node core module is deprecated and can disappear in a major ' +
        'release, which would break the build scripts silently on a runner ' +
        'with a newer node. Replacements: punycode -> the WHATWG URL API, ' +
        'domain -> AsyncLocalStorage from node:async_hooks, constants -> the ' +
        'constants exported by node:os / node:fs, sys -> node:util.',
      severity: 'error',
      from: {},
      to: {
        dependencyTypes: ['core'],
        path: '^(punycode|domain|constants|sys|_linklist|_stream_wrap)$',
      },
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },

    /**
     * The .mdx articles are reached through a build-time template import
     * (`import(\`@/content/${domain}/${slug}.mdx\`)`), which no static analysis
     * can resolve to a file. The content tree carries no code, so leaving it
     * out of the graph costs nothing.
     */
    exclude: { path: '^content/' },

    /** Resolves the `@/*` path alias the same way Next and Vitest do. */
    tsConfig: { fileName: 'tsconfig.json' },

    /**
     * Include type-only imports in the graph. Without this the layering rules
     * would miss `import type` edges, which is where boundary violations tend
     * to start.
     */
    tsPreCompilationDeps: true,

    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs', '.cjs', '.json'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },

    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};

export default architectureRules;
