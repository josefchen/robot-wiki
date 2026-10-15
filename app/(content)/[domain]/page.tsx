import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs, breadcrumbJsonLd } from '@/components/article/breadcrumbs';
import { IntentLink } from '@/components/ui/intent-link';
import { DOMAIN_META, DOMAINS, modulesByDomain } from '@/data/modules';
import type { Domain } from '@/data/modules';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import {
  domainCollectionJsonLd,
  domainSeoDescription,
  domainSeoTitle,
} from '@/lib/seo';

/**
 * Domain landing view: the entry point every home card and sidebar overview
 * link resolves to. Lists the domain's published modules in registry order,
 * each with its own summary. Drafts never appear in any form, and the page
 * carries no progress counters.
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
    title: domainSeoTitle(domain),
    description: domainSeoDescription(domain),
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
    <div className="sheet sheet-masthead pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: breadcrumbJsonLd([
            { label: 'Home', href: '/' },
            { label: meta.name, href: `/${domain}/` },
          ]),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: domainCollectionJsonLd(domain, published),
        }}
      />
      <Breadcrumbs
        variant="eyebrow"
        items={[{ label: 'Home', href: '/' }, { label: meta.name }]}
      />
      {/* data-pagefind-body: once any page in the export declares a body
          region, Pagefind drops every page that does not, so each
          non-article destination has to name its own or stay invisible to
          search (VAL-SEARCH-021). The region is the header and the module
          list, excluding the breadcrumb chrome above it. */}
      <div data-pagefind-body>
        <header className="mb-16">
          <h1 data-tektur-role="page-h1" className="display-h1">
            {meta.name}
          </h1>
          <p className="page-lead mt-[30px]">{meta.description}</p>
          <p className="meta-line mt-6 max-w-[960px]">
            {published.length} articles. {meta.readingOrder}
          </p>
        </header>
        <ol className="border-t border-border">
          {published.map((m, index) => (
            <li
              key={m.slug}
              data-domain-article={`${m.domain}/${m.slug}`}
              className="grid grid-cols-[44px_minmax(0,1fr)] border-b border-border pt-6 pb-4 sm:grid-cols-[74px_minmax(0,1fr)]"
            >
                {/* The registered sequence label (device:sequence-label).
                    The ordinal is the reading position the paragraph above
                    names, not ornament, and it is anchored to the left edge
                    of its own row so the index column reads as a column.
                    aria-hidden because the <ol> already conveys position in
                    set, and announcing "zero three" before "item 3 of 12"
                    is the same fact twice. */}
                <span
                  aria-hidden="true"
                  data-brand-device-id="device:sequence-label"
                  data-brand-anchor-selector={`[data-domain-article="${m.domain}/${m.slug}"]`}
                  data-brand-device-edge="left"
                  data-brand-anchor-edge="left"
                  data-brand-motif="sequence-label"
                  data-brand-purpose="real-order-or-state"
                  data-brand-owner="app/(content)/[domain]/page.tsx"
                  className="pointer-events-none pt-px font-mono text-[14px] font-medium tabular-nums text-text"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <IntentLink
                    data-brand-control-id="control:link-focus"
                    href={`/${m.domain}/${m.slug}/`}
                    className="font-display text-[16px] font-semibold leading-snug text-text underline decoration-transparent decoration-1 underline-offset-[3px] transition-colors hover:decoration-text"
                  >
                    {m.title}
                  </IntentLink>
                  <p className="mt-1.5 text-[15px] leading-[1.6] text-text-dim">
                    {m.summary}
                  </p>
                </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
