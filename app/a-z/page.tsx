import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs, breadcrumbJsonLd } from '@/components/article/breadcrumbs';
import { glossaryTermsAlphabetical } from '@/data/glossary';
import { DOMAIN_META, publishedModules } from '@/data/modules';
import {
  buildAzIndex,
  letterAnchorId,
  type AzIndexSourceEntry,
} from '@/lib/az-index';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';

const title = 'A-Z Index';

export const metadata: Metadata = {
  title,
  description:
    'Every published robot-wiki article and glossary term in one alphabetical list.',
  // Full card blocks restated: a route-level object replaces the
  // layout's for the same key (no deep merge). og:title is the plain
  // page title so the card matches the rendered h1 (VAL-DIST-004)
  // instead of the templated ' - robot-wiki' document title.
  openGraph: routeOpenGraph(title),
  twitter: routeTwitter(title),
};

/**
 * The A-Z index (architecture.md section 6): the flat, complete view of the
 * wiki that the taxonomy sidebar cannot give. Every published article and
 * every glossary term in one alphabetical run, grouped by first letter with
 * jump links. Generated from the module registry and the glossary registry,
 * so a newly published article appears here with no hand editing;
 * drafts never render in any form. The count line reports what a reader
 * can read right now, never authoring progress.
 */
export default function AzIndexPage() {
  const entries: AzIndexSourceEntry[] = [
    ...publishedModules().map((m) => ({
      kind: 'article' as const,
      label: m.title,
      href: `/${m.domain}/${m.slug}/`,
      group: DOMAIN_META[m.domain].name,
    })),
    ...glossaryTermsAlphabetical().map((t) => ({
      kind: 'term' as const,
      label: t.term,
      href: `/glossary/#${t.id}`,
      group: 'Glossary',
    })),
  ];
  const { groups, articleCount, termCount } = buildAzIndex(entries);

  return (
    <div className="mx-auto w-full max-w-[65ch] px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: breadcrumbJsonLd([
            { label: 'Home', href: '/' },
            { label: 'A-Z Index', href: '/a-z/' },
          ]),
        }}
      />
      <Breadcrumbs
        items={[{ label: 'Home', href: '/' }, { label: 'A-Z Index' }]}
      />
      {/* data-pagefind-body: Pagefind excludes every page that declares no
          body region as soon as one page declares one, so this route was
          unreachable by the sidebar's own "A-Z Index" label
          (VAL-SEARCH-021, VAL-SEARCH-022). Scoped to the header rather
          than the whole page: the alphabetical run is 42 article titles
          and 73 term names that all live on their own routes, and
          indexing them here would put this page in front of the article a
          reader was looking for. */}
      <header data-pagefind-body>
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-text">
          A-Z Index
        </h1>
        <p className="mt-2 font-mono text-xs text-text-dim">
          {articleCount} articles and {termCount} glossary terms
        </p>
        <p className="mt-5 font-serif text-[1.0625rem] leading-relaxed text-text">
          Every article in the wiki and every glossary term, filed
          alphabetically. Articles are labelled with their domain; terms link
          to their entry in the glossary.
        </p>
      </header>

      <nav aria-label="Jump to letter" className="mt-10">
        <ul className="flex flex-wrap gap-x-3 gap-y-1.5 font-mono text-sm">
          {groups.map((group) => (
            <li key={group.letter}>
              <Link
                data-brand-control-id="control:link-focus"
                href={`/a-z/#${letterAnchorId(group.letter)}`}
                className="text-text-dim transition-colors hover:text-accent"
              >
                {group.letter}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10 border-t border-border">
        {groups.map((group) => (
          <section
            key={group.letter}
            aria-labelledby={letterAnchorId(group.letter)}
            className="border-b border-border py-6"
          >
            <h2
              id={letterAnchorId(group.letter)}
              className="scroll-mt-16 font-sans text-lg font-semibold tracking-tight text-text lg:scroll-mt-4"
            >
              {group.letter}
            </h2>
            <ul className="mt-4 list-none space-y-3">
              {group.entries.map((entry) => (
                <li
                  key={entry.href}
                  data-az-entry
                  data-az-group={entry.group}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5"
                >
                  <Link
                    data-brand-control-id="control:link-focus"
                    href={entry.href}
                    className="font-sans text-sm font-medium leading-snug text-text transition-colors hover:text-accent"
                  >
                    {entry.label}
                  </Link>
                  <span className="font-mono text-[11px] text-text-dim">
                    {entry.group}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
