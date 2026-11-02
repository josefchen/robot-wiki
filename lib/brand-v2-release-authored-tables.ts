import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import type { RootContent, PhrasingContent } from 'mdast';
import { moduleBody } from './references.ts';
import type { ReleaseInteractionDetails } from './brand-v2-release-interaction-details.ts';
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
/** A Markdown table is authored data. Compare its independent AST cells
 * with the browser's cells; citations are separate source bindings and do
 * not become a number in a factual cell. */
export function authoredArticleTables(root: string, route: string): Array<{
  headers: string[];
  rows: string[][];
}> {
  if (!/^\/[a-z-]+\/[a-z0-9-]+\/$/.test(route)) return [];
  let source: string;
  try {
    source = readFileSync(join(root, 'content', route.slice(1, -1) + '.mdx'), 'utf8');
  } catch {
    return [];
  }
  const tree = unified().use(remarkParse).use(remarkMdx).use(remarkGfm).parse(moduleBody(source));
  const visible = (node: PhrasingContent | RootContent): string => {
    if (node.type === 'mdxJsxTextElement' && node.name === 'Cite') return '';
    if ('children' in node) return node.children.map(child => visible(child as PhrasingContent)).join('');
    return 'value' in node && typeof node.value === 'string' ? node.value : '';
  };
  const found: Array<{
    headers: string[];
    rows: string[][];
  }> = [];
  const walk = (nodes: readonly RootContent[]) => {
    for (const node of nodes) {
      if (node.type === 'table') {
        const rows = node.children.map(row => row.children.map(cell => normalize(cell.children.map(visible).join(''))));
        found.push({
          headers: rows[0],
          rows: rows.slice(1)
        });
      } else if ('children' in node) walk(node.children as RootContent[]);
    }
  };
  walk(tree.children);
  return found;
}
export function authoredTableProblems(expected: ReturnType<typeof authoredArticleTables>[number], table: ReleaseInteractionDetails['tables'][number]): string[] {
  const errors: string[] = [];
  if (JSON.stringify(expected.headers) !== JSON.stringify(table.headers)) errors.push('authored table headers differ');
  const rows = new Map<number, typeof table.cells>();
  for (const cell of table.cells) {
    const row = rows.get(cell.rowIndex) ?? [];
    row.push(cell);
    rows.set(cell.rowIndex, row);
  }
  // Markdown first cells are TDs, so the raw browser rows include every
  // column. No renderer value is used as an expected fact.
  const actual = [...rows.values()].map(row => row.map(cell => normalize(cell.text)));
  if (JSON.stringify(actual) !== JSON.stringify(expected.rows)) errors.push('published/unknown/inapplicable Markdown table cells differ from authored source');
  return errors;
}
