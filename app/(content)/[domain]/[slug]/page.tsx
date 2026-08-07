import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ComponentType } from 'react';
import { DOMAIN_META, getModule, publishedModules } from '@/data/modules';
import type { ModuleFrontmatter } from '@/data/schemas/module';

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

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { domain, slug } = await params;
  const entry = getModule(domain, slug);
  if (!entry || entry.status !== 'published') return {};
  return {
    title: `${entry.title} - robot-atlas`,
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
    <article className="mx-auto w-full max-w-[65ch] px-6 py-12">
      <header className="mb-10 border-b border-border pb-6">
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
      <div className="prose">
        <Content />
      </div>
    </article>
  );
}
