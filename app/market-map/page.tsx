import type { Metadata } from 'next';
import { MarketMap } from '@/components/market-map/market-map';
import { COMPANIES } from '@/data/companies';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import { materialAttributes } from '@/lib/brand-v2-materials';
import { marketMapJsonLd } from '@/lib/structured-data';
import {
  STANDALONE_SEO_DESCRIPTIONS,
  STANDALONE_SEO_TITLES,
} from '@/lib/seo';

const title = 'Market Map';

export const metadata: Metadata = {
  title: STANDALONE_SEO_TITLES.marketMap,
  description: STANDALONE_SEO_DESCRIPTIONS.marketMap,
  // Full card blocks restated: a route-level object replaces the
  // layout's for the same key (no deep merge). og:title is the plain
  // page title so the card matches the rendered h1 (VAL-DIST-004)
  // instead of the templated '| Robot Wiki' document title.
  openGraph: routeOpenGraph(title),
  twitter: routeTwitter(title),
};

export default function MarketMapPage() {
  return (
    <div
      data-page-frame="frame:map"
      className="mx-auto w-full max-w-[84rem] px-6 pt-8 pb-24 sm:pt-12 md:px-8 lg:px-12"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: marketMapJsonLd(COMPANIES) }}
      />
      {/* data-pagefind-body scoped to the heading and the intro, not the
          map: Pagefind excludes every page that declares no body region
          once one page declares one, so this route needed its own to be
          searchable (VAL-SEARCH-021), but the 111 company tiles are
          already reachable through the structured index, and indexing
          their prose here would return this page for every company name
          instead of the entity row. */}
      {/* The market-map representative surface declares its material
          (VAL-B2-SURF-011). */}
      <div data-pagefind-body {...materialAttributes('paper')} className="material-paper">
        <h1
          data-tektur-role="page-h1"
          className="font-display-page display-h1"
        >
          Market Map
        </h1>
        <p className="mt-3 max-w-[40rem] font-sans text-[16px] leading-[1.6] text-text">
          {COMPANIES.length} companies in six segments. Select one for its
          latest round and the sources behind each figure.
        </p>
      </div>
      <div className="mt-8">
        <MarketMap companies={COMPANIES} />
      </div>
    </div>
  );
}
