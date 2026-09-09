import { createProcessor } from '@mdx-js/mdx';
import matter from 'gray-matter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { publishedModules } from '../../../data/modules';

type MdxNode = {
  type: string;
  name?: string;
  value?: string;
  position?: { start: { line: number; offset?: number } };
  attributes?: { type: string; name?: string; value?: unknown }[];
  children?: MdxNode[];
};

export function parseTermConsumers(source: string) {
  const body = matter(source).content;
  const tree = createProcessor({ remarkPlugins: [remarkGfm, remarkMath] })
    .parse(body) as unknown as MdxNode;
  const occurrences: { termId: string; ordinal: number; occurrence: number; bodyLine: number }[] = [];
  const unresolved: { bodyLine: number; reason: string }[] = [];
  const walk = (node: MdxNode) => {
    if (node.name === 'Term' && node.type.startsWith('mdxJsx')) {
      const ids = node.attributes?.filter(a => a.name === 'id') ?? [];
      const bodyLine = node.position?.start.line ?? 0;
      if (ids.length !== 1 || typeof ids[0].value !== 'string' ||
          node.attributes?.some(a => a.type === 'mdxJsxExpressionAttribute')) {
        unresolved.push({ bodyLine, reason: 'Nonliteral, spread, missing, or duplicate Term id' });
      } else {
        const termId = ids[0].value;
        occurrences.push({ termId, ordinal: occurrences.length + 1,
          occurrence: occurrences.filter(o => o.termId === termId).length + 1, bodyLine });
      }
    }
    node.children?.forEach(walk);
  };
  walk(tree);
  return { occurrences, unresolved, rawOpeningTags: [...body.matchAll(/<Term\b/g)].length };
}

/** Published registry → actual MDX AST; duplicates retain separate occurrence identities. */
export function termConsumerInventory(root = process.cwd()) {
  return publishedModules().map(module => {
    const path = resolve(root, 'content', module.domain, `${module.slug}.mdx`);
    const source = readFileSync(path, 'utf8');
    return { path, route: `/${module.domain}/${module.slug}/`,
      sourceSha256: createHash('sha256').update(source).digest('hex'),
      ...parseTermConsumers(source) };
  }).sort((a, b) => a.route.localeCompare(b.route));
}
