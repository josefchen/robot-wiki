import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs, breadcrumbJsonLd } from '@/components/article/breadcrumbs';
import { DOMAIN_META, DOMAINS, modulesByDomain } from '@/data/modules';
import type { Domain } from '@/data/modules';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';

/**
 * Domain landing view: the entry point every home card and sidebar overview
 * link resolves to. Lists the domain's published modules in registry order,
 * each with its own summary. Drafts never appear in any form, and the page carries no progress counters: a reader sees
 * what exists to read, not the state of the authoring pipeline
 */
export const dynamicParams = false;

export function generateStaticParams(): Array<{ domain: string }> {
  return DOMAINS.map((domain) => ({ domain }));
}

function asDomain(value: string): Domain | null {
  return (DOMAINS as readonly string[]).includes(value)
    ? (value as Domain)
    : null;
}

type Params = Promise<{ domain: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { domain: raw } = await params;
  const domain = asDomain(raw);
  if (!domain) return {};
  const meta = DOMAIN_META[domain];
  return {
    title: meta.name,
    description: meta.description,
    // Full openGraph and twitter blocks, restated because a route-level
    // object replaces the layout's for the same key (no deep merge).
    // og:title is the plain domain name: the card title must equal the
    // page's rendered h1 (VAL-DIST-004), not the templated document
    // title. Non-article destinations share the site-level card
    // (VAL-DIST-003). og:url './' resolves against this route's own
    // pathname, keeping canonical and og:url route-correct
    // (VAL-BRAND-003).
    openGraph: routeOpenGraph(meta.name),
    twitter: routeTwitter(meta.name),
  };
}

export default async function DomainLandingPage({
  params,
}: {
  params: Params;
}) {
  const { domain: raw } = await params;
  const domain = asDomain(raw);
  if (!domain) notFound();

  const meta = DOMAIN_META[domain];
  const published = (modulesByDomain()[domain] ?? []).filter(
    (m) => m.status === 'published',
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: breadcrumbJsonLd([
            { label: 'Home', href: '/' },
            { label: meta.name, href: `/${domain}/` },
          ]),
        }}
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: meta.name }]} />
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-text">
          {meta.name}
        </h1>
        <p className="mt-3 leading-relaxed text-text-dim">{meta.description}</p>
      </header>
      <ol>
        {published.map((m, index) => (
          <li
            key={m.slug}
            data-domain-article={`${m.domain}/${m.slug}`}
            className="border-t border-border py-4 first:border-t-0"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-xs text-text-dim">
                {String(index + 1).padStart(2, '0')}
              </span>
              <Link
                href={`/${m.domain}/${m.slug}`}
                className="font-sans text-base font-medium text-text transition-colors hover:text-accent"
              >
                {m.title}
              </Link>
            </div>
            <p className="mt-1 pl-7 text-sm leading-relaxed text-text-dim">
              {m.summary}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
