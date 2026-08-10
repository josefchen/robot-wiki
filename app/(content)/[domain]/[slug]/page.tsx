import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ComponentType } from 'react';
import { ArticleHeader } from '@/components/article/article-header';
import { LinkedFrom, SeeAlso } from '@/components/article/article-links';
import { References } from '@/components/article/references';
import { getCitation } from '@/data/citations';
import { getModule, modules, publishedModules } from '@/data/modules';
import type { ModuleFrontmatter } from '@/data/schemas/module';
import { publishedBacklinkGraph, resolveArticleEntries } from '@/lib/backlinks';
import { countWordsInMdxSource, readingTimeMinutes } from '@/lib/reading-time';
import { inlineCitationIds, moduleBody, resolveReferences } from '@/lib/references';

// Fully static: only published modules get routes. Drafts (and everything
// else) fall through to 404, which is what VAL-BUILD-001 requires.
export const dynamicParams = false;

export function generateStaticParams(): Array<{ domain: string; slug: string }> {
  return publishedModules().map((m) => ({ domain: m.domain, slug: m.slug }));
}

type Params = Promise<{ domain: string; slug: string }>;

type CompiledMdx = {
  default: ComponentType;
  frontmatter?: ModuleFrontmatter;
};

/**
 * Loads the compiled MDX for a published module. The template-literal import
 * is a build-time context over content/; only params emitted by
 * generateStaticParams ever reach it. The cast is required because
 * TypeScript cannot analyze dynamic template imports.
 */
async function loadModule(domain: string, slug: string): Promise<CompiledMdx | null> {
  const entry = getModule(domain, slug);
  if (!entry || entry.status !== 'published') return null;
  const mod = (await import(`@/content/${domain}/${slug}.mdx`)) as CompiledMdx;
  return mod;
}

/**
 * The article's raw MDX source. Reading it at prerender time is safe:
 * check 3 of the prebuild validator guarantees a content file exists for
 * every published module, and this template only runs for published
 * routes. The source feeds two derivations: the References entries (which
 * inline <Cite> ids the body uses) and the header's reading-time estimate
 * (the prose word count).
 */
function moduleSource(domain: string, slug: string): string {
  return readFileSync(
    join(process.cwd(), 'content', domain, `${slug}.mdx`),
    'utf8',
  );
}

/**
 * Reading times measured at build time against each article's rendered
 * `.prose` region (scripts/measure-reading-times.ts) and written to
 * data/reading-times.json. Storing the measured values in a data file is
 * what lets the exact rendered count reach the header at all: a Server
 * Component cannot render its own tree to markup (Next bans react-dom/
 * server here), and reading the value at render time means the HTML and
 * the RSC flight payload always agree, so hydration never reverts it.
 * Returns an empty map until the first measurement run; the template then
 * falls back to the MDX-source prose estimate (lib/reading-time.ts).
 */
type ReadingTimeRecord = Record<string, { words: number; minutes: number }>;
let cachedReadingTimes: ReadingTimeRecord | null = null;
function readingTimes(): ReadingTimeRecord {
  if (cachedReadingTimes) return cachedReadingTimes;
  try {
    cachedReadingTimes = JSON.parse(
      readFileSync(join(process.cwd(), 'data', 'reading-times.json'), 'utf8'),
    ) as ReadingTimeRecord;
  } catch {
    cachedReadingTimes = {};
  }
  return cachedReadingTimes;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { domain, slug } = await params;
  const entry = getModule(domain, slug);
  if (!entry || entry.status !== 'published') return {};
  return {
    title: entry.title,
    description: entry.summary,
  };
}

export default async function ModulePage({ params }: { params: Params }) {
  const { domain, slug } = await params;
  const entry = getModule(domain, slug);
  if (!entry || entry.status !== 'published') notFound();

  const mod = await loadModule(domain, slug);
  if (!mod) notFound();
  const Content = mod.default;

  // See also: the curated frontmatter list resolved against the registry.
  // Linked from: this article's inbound edges in the derived link graph
  // (in-prose internal links plus seeAlso edges from other articles).
  // Both render between the prose and the References bibliography; an
  // empty list renders no section at all (VAL-WIKI-012).
  const seeAlsoEntries = resolveArticleEntries(
    mod.frontmatter?.seeAlso ?? [],
    modules,
  );
  const linkedFromEntries = resolveArticleEntries(
    publishedBacklinkGraph().get(`${domain}/${slug}`) ?? [],
    modules,
  );

  const body = moduleBody(moduleSource(domain, slug));

  // One resolved References list (VAL-WIKI-001) is the single source for
  // both the rendered bibliography and the header's citation count
  // (VAL-WIKI-014): the two can never drift apart because they share the
  // array. The body scan marks entries declared but never cited inline so
  // they carry the explicit "Further reading" marker.
  const references = resolveReferences(
    mod.frontmatter?.citations ?? [],
    inlineCitationIds(body),
    getCitation,
  );

  // Reading time, at the documented WORDS_PER_MINUTE rate (lib/reading-time
  // .ts), never hardcoded per article (VAL-WIKI-015). The value comes from
  // data/reading-times.json: the exact rendered word count of this page's
  // own .prose region, measured at build time by scripts/measure-reading-
  // times.ts. Because it is read at render time, the HTML and the RSC
  // flight payload carry the same number, so hydration never reverts it.
  // Until the first measurement exists the template falls back to a prose
  // estimate counted from the MDX source, which keeps dev and any pre-
  // measure artifact proportional to article length.
  const measured = readingTimes()[`${domain}/${slug}`];
  const readingTime =
    measured?.minutes ?? readingTimeMinutes(countWordsInMdxSource(body));

  return (
    // data-pagefind-body scopes the prose search index to the module
    // content (header + body) and excludes the surrounding nav chrome and
    // the generated References bibliography.
    <article className="mx-auto w-full max-w-[65ch] px-6 py-12">
      <ArticleHeader
        entry={entry}
        lastReviewed={mod.frontmatter?.lastReviewed}
        readingTimeMinutes={readingTime}
        citationCount={references.length}
      />
      <div data-pagefind-body className="prose">
        <Content />
      </div>
      <SeeAlso entries={seeAlsoEntries} />
      <LinkedFrom entries={linkedFromEntries} />
      <References entries={references} />
    </article>
  );
}
