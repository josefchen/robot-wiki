import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs, breadcrumbJsonLd } from '@/components/article/breadcrumbs';
import { IntentLink } from '@/components/ui/intent-link';
import { glossaryTermsAlphabetical } from '@/data/glossary';
import { DOMAIN_META, publishedModules } from '@/data/modules';
import {
  buildAzIndex,
  letterAnchorId,
  type AzIndexSourceEntry,
} from '@/lib/az-index';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import {
  STANDALONE_SEO_DESCRIPTIONS,
  STANDALONE_SEO_TITLES,
} from '@/lib/seo';

const title = 'A-Z Index';

export const metadata: Metadata = {
  title: STANDALONE_SEO_TITLES.azIndex,
  description: STANDALONE_SEO_DESCRIPTIONS.azIndex,
  // Full card blocks restated: a route-level object replaces the
  // layout's for the same key (no deep merge). og:title is the plain
  // page title so the card matches the rendered h1 (VAL-DIST-004)
  // instead of the templated '| Robot Wiki' document title.
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
    <div className="sheet sheet-masthead pb-8">
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
        variant="eyebrow"
        items={[{ label: 'Home', href: '/' }, { label: 'A-Z Index' }]}
      />
      {/* data-pagefind-body: Pagefind excludes every page that declares no
          body region as soon as one page declares one, so this route was
          unreachable by the sidebar's own "A-Z Index" label
          (VAL-SEARCH-021, VAL-SEARCH-022). Scoped to the header rather
          than the whole page: the alphabetical run is made of article
          titles and term names that all live on their own routes, and
          indexing them here would put this page in front of the article a
          reader was looking for. */}
      <header data-pagefind-body>
        <h1 data-tektur-role="page-h1" className="display-h1 mt-6">
          A-Z Index
        </h1>
        <p className="page-lead mt-[30px]">
          Every article and glossary term, filed alphabetically. Articles
          carry their domain; terms link to the glossary.
        </p>
        <p className="meta-line mt-6">
          {articleCount} articles and {termCount} glossary terms
        </p>
      </header>

      <nav aria-label="Jump to letter" className="mt-14 border-y border-border py-3">
        <ul className="flex flex-wrap gap-x-3 gap-y-1.5 font-mono text-[14px]">
          {groups.map((group) => (
            <li key={group.letter}>
              <Link
                data-brand-control-id="control:link-focus"
                href={`/a-z/#${letterAnchorId(group.letter)}`}
                /* One letter is a small glyph, but the jump target a reader
                    points at is the whole chip: a 24px box keeps the letter
                    rail on the WCAG 2.2 minimum without inflating the type. */
                className="flex h-6 min-w-6 items-center justify-center text-text-dim transition-colors hover:text-text"
              >
                {group.letter}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6">
        {groups.map((group) => (
          <section
            key={group.letter}
            aria-labelledby={letterAnchorId(group.letter)}
            className="pt-10"
          >
            {/* The jump-link and deep-link target for this letter group.
                tabIndex={-1} makes fragment navigation move focus to the
                heading (VAL-B2-DISC-005), so a keyboard reader arriving at
                /a-z/#letter-m starts inside that group rather than on the
                body with no context. */}
            <h2
              id={letterAnchorId(group.letter)}
              tabIndex={-1}
              className="section-h2"
            >
              {group.letter}
            </h2>
            {/* The same rule rhythm the glossary and the domain landings
                use: one hairline above the run and one under every entry,
                so the alphabetical run reads as ruled index rows rather
                than an unbounded stack of links (VAL-B2-DISC-006). The
                section rule this replaces drew one line per letter group
                only; the entries inside carried no rhythm of their own. */}
            <ul className="mt-4 list-none border-t border-border">
              {group.entries.map((entry) => (
                <li
                  key={entry.href}
                  data-az-entry
                  data-az-group={entry.group}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 border-b border-border py-3"
                >
                  <IntentLink
                    data-brand-control-id="control:link-focus"
                    href={entry.href}
                    className="font-sans text-[15px] leading-snug text-text underline decoration-transparent decoration-1 underline-offset-[3px] transition-colors hover:decoration-text"
                  >
                    {entry.label}
                  </IntentLink>
                  <span className="eyebrow text-[12px]">
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
