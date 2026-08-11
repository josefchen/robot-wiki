/**
 * rehype plugin: make display equations keyboard-scrollable.
 *
 * globals.css gives `.katex-display` `overflow-x: auto` so wide equations
 * (the MPC program, the whole-body QP) scroll instead of breaking the page
 * layout. A scrollable region that cannot receive keyboard focus is an axe
 * `scrollable-region-focusable` violation, so every display block gets
 * tabindex="0" here, at the source, right after rehype-katex runs.
 *
 * Plain ESM with no dependencies: next.config.ts must reference every MDX
 * plugin by string path (Turbopack cannot serialize functions), so this
 * file stays JavaScript and walks the tree by hand.
 */
export default function rehypeScrollableMath() {
  return (tree) => {
    const visit = (node) => {
      if (
        node.type === 'element' &&
        Array.isArray(node.properties?.className) &&
        node.properties.className.includes('katex-display')
      ) {
        node.properties.tabIndex = 0;
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) visit(child);
      }
    };
    visit(tree);
  };
}
