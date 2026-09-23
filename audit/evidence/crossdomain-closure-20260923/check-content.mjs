import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { compile } from '@mdx-js/mdx';
import matter from 'gray-matter';
import { CITATIONS } from '../../../data/citations.ts';
import { getTerm } from '../../../data/glossary.ts';
import { findBannedVocabulary, dashLines, ruleOfThreeResult, RULE_OF_THREE_LIMIT } from '../../../lib/no-slop.ts';
import { NO_SLOP_EXCEPTIONS } from '../../../data/no-slop-exceptions.ts';

const plugin = async name => (await import(name.startsWith('./')
  ? pathToFileURL(`${process.cwd()}/${name.slice(2)}`).href : name)).default;
const remarkPlugins = [await plugin('remark-frontmatter'),
  [await plugin('remark-mdx-frontmatter'), { name: 'frontmatter' }],
  await plugin('remark-gfm'), await plugin('remark-math')];
const rehypePlugins = [await plugin('rehype-slug'),
  [await plugin('rehype-autolink-headings'), { behavior: 'wrap' }],
  [await plugin('rehype-katex'), { strict: false }],
  await plugin('./lib/rehype-pagefind-math.mjs'), await plugin('./lib/rehype-cite-punctuation.mjs'),
  [await plugin('rehype-pretty-code'), { theme: 'github-light-high-contrast', keepBackground: false }],
  await plugin('./lib/rehype-scroll-regions.mjs')];
const ids = new Set(CITATIONS.map(c => c.id));
for (const slug of ['manipulation/generalist-policies', 'world-models/taxonomy']) {
  const path = `content/${slug}.mdx`, text = fs.readFileSync(path, 'utf8'), fm = matter(text);
  const result = await compile(text, { remarkPlugins, rehypePlugins });
  if (result.messages.length) throw Error(JSON.stringify(result.messages));
  const citations = [...text.matchAll(/<Cite\s+id="([^"]+)"/g)].map(m => m[1]);
  const terms = [...text.matchAll(/<Term\s+id="([^"]+)"/g)].map(m => m[1]);
  for (const id of citations) if (!ids.has(id) || !fm.data.citations.includes(id)) throw Error(`citation union ${id}`);
  for (const id of terms) if (!getTerm(id)) throw Error(`Unregistered unchanged Term ${id}`);
  const markers = findBannedVocabulary(fm.content, NO_SLOP_EXCEPTIONS);
  const dashes = dashLines(fm.content, NO_SLOP_EXCEPTIONS), triads = ruleOfThreeResult(fm.content);
  if (markers.length || dashes.length || triads.density > RULE_OF_THREE_LIMIT) {
    throw Error(JSON.stringify({ path, markers, dashes, triads }));
  }
  console.log(JSON.stringify({ path, compilerMessages: result.messages.length,
    declaredSources: fm.data.citations.length, inlineCitations: citations.length,
    terms: terms.length, lastReviewed: fm.data.lastReviewed, markers: markers.length,
    dashes: dashes.length, triads }));
}
