import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ComponentType } from 'react';
import { References } from '@/components/article/references';
import { getCitation } from '@/data/citations';
import { DOMAIN_META, getModule, publishedModules } from '@/data/modules';
import type { ModuleFrontmatter } from '@/data/schemas/module';
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
 * The article's References entries (VAL-WIKI-001): the frontmatter
 * `citations` list resolved against the citation registry, in declaration
 * order. The raw MDX source is scanned for inline <Cite> usage so entries
 * that are declared but never cited inline can carry the explicit
 * "Further reading" marker. Reading the source at prerender time is safe:
 * check 3 of the prebuild validator guarantees a content file exists for
 * every published module, and this template only runs for published routes.
 */
function articleReferences(
  domain: string,
  slug: string,
  frontmatter: ModuleFrontmatter | undefined,
) {
  const source = readFileSync(
    join(process.cwd(), 'content', domain, `${slug}.mdx`),
    'utf8',
  );
  return resolveReferences(
    frontmatter?.citations ?? [],
    inlineCitationIds(moduleBody(source)),
    getCitation,
  );
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

  return (
    // data-pagefind-body scopes the prose search index to the module
    // content (header + body) and excludes the surrounding nav chrome and
    // the generated References bibliography.
    <article className="mx-auto w-full max-w-[65ch] px-6 py-12">
      <header data-pagefind-body className="mb-10 border-b border-border pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-text-dim">
          {DOMAIN_META[entry.domain].name}
        </p>
        <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-text">
          {entry.title}
        </h1>
        <p className="mt-3 leading-relaxed text-text-dim">{entry.summary}</p>
        {mod.frontmatter?.lastReviewed ? (
          <p className="mt-3 font-mono text-xs text-text-dim">
            Last reviewed {mod.frontmatter.lastReviewed}
          </p>
        ) : null}
      </header>
      <div data-pagefind-body className="prose">
        <Content />
      </div>
      <References entries={articleReferences(domain, slug, mod.frontmatter)} />
    </article>
  );
}
