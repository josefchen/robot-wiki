import { readFileSync } from 'node:fs';
import path from 'node:path';
import { compile } from '@mdx-js/mdx';
import matter from 'gray-matter';
import { CITATIONS } from '../../../data/citations.ts';
import { GLOSSARY } from '../../../data/glossary.ts';
const source = readFileSync('content/data-hardware/industrial-deployment.mdx', 'utf8');
const plugins = async names => Promise.all(names.map(async item => {
  const [name, options] = Array.isArray(item) ? item : [item];
  const plugin = (await import(name)).default;
  return options === undefined ? plugin : [plugin, options];
}));
const result = await compile(source, {
  remarkPlugins: await plugins(['remark-frontmatter', ['remark-mdx-frontmatter', { name: 'frontmatter' }], 'remark-gfm', 'remark-math']),
  rehypePlugins: await plugins([
    'rehype-slug', ['rehype-autolink-headings', { behavior: 'wrap' }],
    ['rehype-katex', { strict: false }],
    path.join(process.cwd(), 'lib/rehype-pagefind-math.mjs'),
    path.join(process.cwd(), 'lib/rehype-cite-punctuation.mjs'),
    ['rehype-pretty-code', { theme: 'github-light-high-contrast', keepBackground: false }],
    path.join(process.cwd(), 'lib/rehype-scroll-regions.mjs'),
  ]),
});
if (result.messages.length) throw Error(JSON.stringify(result.messages));
const frontmatter = matter(source).data;
const citations = [...source.matchAll(/<Cite id="([^"]+)"/g)].map(m => m[1]);
const terms = [...source.matchAll(/<Term id="([^"]+)"/g)].map(m => m[1]);
for (const id of frontmatter.citations) if (!CITATIONS.some(c => c.id === id) || !citations.includes(id)) throw Error(`Missing declared source ${id}`);
for (const id of citations) if (!frontmatter.citations.includes(id)) throw Error(`Undeclared source ${id}`);
for (const id of terms) if (!GLOSSARY.some(g => g.id === id)) throw Error(`Missing glossary ID ${id}`);
console.log(JSON.stringify({ article: 'content/data-hardware/industrial-deployment.mdx',
  configuredMdxMessages: result.messages.length, declaredSources: frontmatter.citations.length,
  citeOccurrences: citations.length, termOccurrences: terms.length, distinctTerms: new Set(terms).size }));
