import type { Metadata } from 'next';
import { PageHeader } from '@/components/data-page/page-header';
import { MarketMap } from '@/components/market-map/market-map';
import { COMPANIES } from '@/data/companies';
import { MARKET_MAP_AS_OF } from '@/lib/market-map';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import { materialAttributes } from '@/lib/site-materials';
import { MARKET_SECTION } from '@/lib/site-sections';
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
  // page title so the card matches the rendered h1
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
          searchable, but the company tiles are
          already reachable through the structured index, and indexing
          their prose here would return this page for every company name
          instead of the entity row. */}
      {/* The market-map representative surface declares its material. */}
      <div data-pagefind-body {...materialAttributes('paper')} className="material-paper">
        <PageHeader
          title={title}
          lead={`${COMPANIES.length} companies in six segments, each with its latest disclosed round or status and the sources behind it`}
          asOf={MARKET_MAP_AS_OF}
          section={{ ...MARKET_SECTION, current: '/market-map/' }}
        />
        <p className="mt-3 max-w-prose text-base leading-relaxed text-text">
          For agricultural and other service robots, the International Federation of Robotics publishes a{' '}
          <a
            className="ink-link whitespace-nowrap"
            data-brand-control-id="control:link-focus"
            href="https://ifr.org/img/worldrobotics/Executive_Summary_WR_2026_-_Service_Robots.pdf#page=4"
          >
            unit sales chart (PDF)
          </a>
          {' '}for 2024 and 2025 and explains its{' '}
          <a
            className="ink-link whitespace-nowrap"
            data-brand-control-id="control:link-focus"
            href="https://ifr.org/img/worldrobotics/Sources___Methods_WR_2026_-_Service_Robots.pdf#page=17"
          >
            survey coverage (PDF)
          </a>
          .
        </p>
      </div>
      <div className="mt-8">
        <MarketMap companies={COMPANIES} />
      </div>
    </div>
  );
}
