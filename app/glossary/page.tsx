import type { Metadata } from 'next';
import { Fragment } from 'react';
import { citationLabel, getCitation } from '@/data/citations';
import { glossaryTermsAlphabetical } from '@/data/glossary';
import { definitionParagraphs } from '@/lib/discovery-prose';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import { glossaryJsonLd } from '@/lib/structured-data';
import {
  STANDALONE_SEO_DESCRIPTIONS,
  STANDALONE_SEO_TITLES,
} from '@/lib/seo';

const title = 'Glossary';

export const metadata: Metadata = {
  title: STANDALONE_SEO_TITLES.glossary,
  description: STANDALONE_SEO_DESCRIPTIONS.glossary,
  // Full card blocks restated: a route-level object replaces the
  // layout's for the same key (no deep merge). og:title is the plain
  // page title so the card matches the rendered h1 (VAL-DIST-004)
  // instead of the templated '| Robot Wiki' document title.
  openGraph: routeOpenGraph(title),
  twitter: routeTwitter(title),
};

/**
 * The glossary index: every registered term, alphabetically, with its
 * definition and a link to each cited primary source. The same registry
 * records feed the inline <Term> tooltips, so this page and the inline
 * definitions are one source of truth. Each entry is
 * anchored at #<id>, which is where inline terms link.
 */
export default function GlossaryPage() {
  const terms = glossaryTermsAlphabetical();

  return (
    <div className="sheet sheet-masthead pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: glossaryJsonLd(terms) }}
      />
      {/* data-pagefind-body: Pagefind excludes every page that declares no
          body region as soon as one page declares one, which left this
          route unreachable by the query "Glossary" that the sidebar itself
          invites (VAL-SEARCH-021, VAL-SEARCH-022). */}
      <header data-pagefind-body>
        <h1 data-tektur-role="page-h1" className="display-h1">
          Glossary
        </h1>
        <p className="page-lead mt-[30px]">
          Each definition is written from a cited primary source. In an
          article, hover over or focus a marked term to see it.
        </p>
        <p className="meta-line mt-6">
          <span className="font-mono tabular-nums">{terms.length}</span> terms
        </p>
      </header>

      <ol className="mt-16 list-none border-t border-border">
        {terms.map((term) => {
          const sources = term.citations
            .map((id) => getCitation(id))
            .filter((c) => c !== undefined);
          return (
            <li
              key={term.id}
              id={term.id}
              data-glossary-term={term.id}
              // The deep-link target for every inline <Term> and every A-Z
              // glossary entry. tabIndex={-1} makes the fragment navigation
              // move focus here (VAL-B2-DISC-005): without it, following
              // /glossary/#<id> leaves focus on <body>, so a keyboard
              // reader lands mid-page with no focus context and a screen
              // reader announces nothing about the term it arrived at.
              tabIndex={-1}
              className="grid gap-x-8 gap-y-2 border-b border-border py-6 md:grid-cols-[15rem_minmax(0,1fr)]"
            >
              <h2 className="font-display text-[16px] font-semibold leading-snug text-text">
                {term.term}
              </h2>
              <div className="min-w-0">
              {/* The first paragraph is the definition itself, within 60
                  words; the specifics follow. The space between the two
                  keeps the entry's text equal to the registry definition. */}
              <div data-glossary-definition>
                {definitionParagraphs(term.definition).map((text, index) => (
                  <Fragment key={index}>
                    {index > 0 ? ' ' : null}
                    <p
                      className={`${index > 0 ? 'mt-3 ' : ''}text-[16px] leading-[1.62] text-text`}
                    >
                      {text}
                    </p>
                  </Fragment>
                ))}
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {sources.map((source) => (
                  <li key={source.id} className="flex flex-wrap items-baseline gap-x-2">
                    <a
                      data-brand-control-id="control:link-focus"
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-words font-sans text-[13px] leading-snug text-text-dim underline decoration-border-strong decoration-1 underline-offset-[3px] transition-colors hover:text-text hover:decoration-text"
                    >
                      {source.title}
                    </a>
                    {/* The byline wraps: a long author list held on one
                        line overflowed the page at 320 px. */}
                    <span className="min-w-0 break-words font-sans text-[12px] text-text-dim">
                      {citationLabel(source)}
                    </span>
                  </li>
                ))}
              </ul>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
