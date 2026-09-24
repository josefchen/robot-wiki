/**
 * rehype plugin: export `usesMath` from every MDX module that typesets math.
 *
 * KaTeX's stylesheet is loaded per page, not site-wide
 * (components/article/math-stylesheet.tsx), so the article template has to
 * know whether the page it renders contains math. The only reliable answer
 * is the compiled tree itself: remark-math's syntax is `$...$`, which a
 * source scan cannot tell apart from a price, and whether a formula renders
 * is decided by rehype-katex, which runs before this plugin. When the tree
 * holds any `.katex` element (or the `.katex-error` span a failed parse
 * renders, which KaTeX's stylesheet also styles), the module gains
 *
 *   export const usesMath = true;
 *
 * and the template reads it off the imported module, beside `frontmatter`.
 * Modules without math export nothing, so `usesMath` is simply undefined.
 *
 * Plain ESM with no dependencies, like lib/rehype-pagefind-math.mjs: the
 * export is built directly as the ESTree the MDX compiler consumes.
 */
function hasMath(node) {
  if (
    node.type === 'element' &&
    Array.isArray(node.properties?.className) &&
    (node.properties.className.includes('katex') ||
      node.properties.className.includes('katex-error'))
  ) {
    return true;
  }
  return Array.isArray(node.children) && node.children.some(hasMath);
}

export default function rehypeMathFlag() {
  return (tree) => {
    if (!hasMath(tree)) return;
    tree.children.push({
      type: 'mdxjsEsm',
      value: 'export const usesMath = true;',
      data: {
        estree: {
          type: 'Program',
          sourceType: 'module',
          body: [
            {
              type: 'ExportNamedDeclaration',
              declaration: {
                type: 'VariableDeclaration',
                kind: 'const',
                declarations: [
                  {
                    type: 'VariableDeclarator',
                    id: { type: 'Identifier', name: 'usesMath' },
                    init: { type: 'Literal', value: true, raw: 'true' },
                  },
                ],
              },
              specifiers: [],
              source: null,
            },
          ],
        },
      },
    });
  };
}
