import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchInterface } from '@/components/search/search-interface';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import { webPageJsonLd } from '@/lib/structured-data';
import {
  STANDALONE_SEO_DESCRIPTIONS,
} from '@/lib/seo';

const title = 'Search';

export const metadata: Metadata = {
  title,
  description: STANDALONE_SEO_DESCRIPTIONS.search,
  // Internal search results are useful to readers but are not standalone
  // landing pages. Keep the route crawlable so noindex can be observed and
  // links can still be followed, while excluding it from search results.
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
  // Full card blocks restated: a route-level object replaces the
  // layout's for the same key (no deep merge). og:title is the plain
  // page title so the card matches the rendered h1 (VAL-DIST-004)
  // instead of the templated '| Robot Wiki' document title.
  openGraph: routeOpenGraph(title),
  twitter: routeTwitter(title),
};

/**
 * /search. One input over two build-time indexes: Pagefind for prose and
 * MiniSearch for structured entities (methods, companies, datasets).
 * data-pagefind-ignore keeps this page out of its own index. Suspense is
 * required because SearchInterface reads ?q= from the URL.
 */
export default function SearchPage() {
  return (
    <div data-pagefind-ignore className="sheet sheet-masthead pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: webPageJsonLd({
            path: '/search/',
            name: title,
            description: STANDALONE_SEO_DESCRIPTIONS.search,
            type: 'SearchResultsPage',
          }),
        }}
      />
      {/* No aria-current: the shell reaches /search through a form, not a
          nav link, and a route with no corresponding navigation item exposes
          none rather than moving the state onto a heading to keep a count. */}
      <h1 data-tektur-role="page-h1" className="display-h1">
        Search
      </h1>
      <p className="page-lead mt-[30px]">
        Search the articles, methods, companies and datasets. Queries run in
        your browser.
      </p>
      <Suspense fallback={null}>
        <SearchInterface />
      </Suspense>
    </div>
  );
}
