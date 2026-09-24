/**
 * recma plugin: load every client component an article mounts on demand.
 *
 * The article template imports its MDX through one template-literal
 * import (`@/content/${domain}/${slug}.mdx`), so every article sits under
 * one server entry, and the bundler groups the client components reachable
 * from that entry into one chunk: before this plugin, every article route
 * downloaded all 52 interactive widgets, plus the libraries and data they
 * pull in, to render the one or two it mounts.
 *
 * Authors keep writing the natural import:
 *
 *   import { PlanarFkArm } from '@/components/interactive/planar-fk-arm';
 *
 * and this plugin points the compiled module at the article mount registry
 * (components/mdx/article-mounts.tsx) instead, which exports the same names
 * as `next/dynamic` wrappers declared inside a Client Component. That is
 * the placement the Next.js lazy-loading guide requires for client-side
 * code splitting (a Server Component calling next/dynamic does not split),
 * so each widget becomes its own chunk, requested only by the pages that
 * render it. The wrappers keep `ssr: true` and no loading fallback, so the
 * exported HTML is the same markup as an eager import and nothing shifts
 * while the chunk arrives.
 *
 * The rewrite is keyed on the import specifier, so the MDX source, and
 * every source scan that reads it (the brand-v2 census mount registry, the
 * chart-description sweep, the audit coverage check), still sees the real
 * component module. A specifier the registry does not export fails the
 * build with a missing-export error rather than silently loading eagerly;
 * tests/unit/article-mounts.test.ts pins registry coverage.
 *
 * Plain ESM with no dependencies, like the rehype plugins beside it:
 * next.config.ts must reference every MDX plugin by string path (Turbopack
 * cannot serialize functions).
 */

/** Where rewritten imports resolve. */
export const ARTICLE_MOUNTS_MODULE = '@/components/mdx/article-mounts';

/** Every interactive widget module is a lazily loaded client component. */
const LAZY_PREFIX = '@/components/interactive/';

/**
 * Client components outside components/interactive/ that articles import
 * directly. The remaining components/mdx/ tables are Server Components and
 * render to static markup, so they have no client code to split.
 */
export const LAZY_MDX_CLIENT_MODULES = new Set([
  '@/components/mdx/policy-chunking-table',
  '@/components/mdx/rl-methods-table',
]);

export function isLazyMountSpecifier(specifier) {
  return (
    (specifier.startsWith(LAZY_PREFIX) && specifier.length > LAZY_PREFIX.length) ||
    LAZY_MDX_CLIENT_MODULES.has(specifier)
  );
}

export default function recmaLazyMounts() {
  return (tree) => {
    for (const node of tree.body) {
      if (
        node.type !== 'ImportDeclaration' ||
        typeof node.source?.value !== 'string' ||
        !isLazyMountSpecifier(node.source.value)
      ) {
        continue;
      }
      // Only named imports can be re-pointed: the registry is one module,
      // so a default or namespace import would change meaning. Fail loudly
      // instead of guessing.
      for (const specifier of node.specifiers) {
        if (specifier.type !== 'ImportSpecifier') {
          throw new Error(
            `recma-lazy-mounts: ${node.source.value} must be imported by name ` +
              `(import { Component } from '${node.source.value}')`,
          );
        }
      }
      node.source = {
        type: 'Literal',
        value: ARTICLE_MOUNTS_MODULE,
        raw: JSON.stringify(ARTICLE_MOUNTS_MODULE),
      };
    }
  };
}
