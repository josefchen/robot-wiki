import { publicMarketMapData, publicMarketMapText } from '@/lib/public-market-map';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/data-page/page-header';
import { PublicMarketMap } from '@/components/public-companies/public-market-map';
import {
  IpoWatchTable,
  LeftOutTable,
  ListedCompaniesTable,
  SinceListingTable,
} from '@/components/public-companies/tables';
import { PUBLIC_COMPANIES_AS_OF } from '@/data/public-companies';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import {
  PUBLIC_PAGE_PATH,
  PUBLIC_PAGE_SECTIONS,
  PUBLIC_PAGE_TITLE,
  ipoWatchLead,
  leftOutLead,
  listedLead,
  publicLeadSentence,
  publicPageDescription,
  sinceListingLead,
  type PublicPageSectionId,
} from '@/lib/public-companies-page';
import { routeSeoProfile } from '@/lib/seo-profiles';
import { MARKET_SECTION } from '@/lib/site-sections';
import { webPageJsonLd } from '@/lib/structured-data';

const description = publicPageDescription();

const profile = routeSeoProfile(PUBLIC_PAGE_PATH);

export const metadata: Metadata = {
  title: profile.title,
  description: profile.description,
  // og:title is the h1: the page has no entry in the social-title map.
  openGraph: routeOpenGraph(PUBLIC_PAGE_TITLE),
  twitter: routeTwitter(PUBLIC_PAGE_TITLE),
};

const LEAD = 'mt-2 max-w-[40rem] font-sans text-[15px] leading-[1.6] text-text-dim';
const SUBHEAD = 'mt-14 font-sans text-[16px] font-semibold leading-6 text-text';

function Section({ id, lead, children }: { id: PublicPageSectionId; lead: string; children: ReactNode }) {
  const section = PUBLIC_PAGE_SECTIONS.find((candidate) => candidate.id === id)!;
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="mt-20 scroll-mt-20">
      <h2 id={`${id}-heading`} className="section-h2">
        {section.label}
      </h2>
      <p className={LEAD}>{lead}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function PublicCompaniesPage() {
  const mapData = publicMarketMapData();
  return (
    <div
      data-page-frame="frame:map"
      className="mx-auto w-full max-w-[84rem] px-6 pt-8 pb-24 sm:pt-12 md:px-8 lg:px-12"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: webPageJsonLd({ path: PUBLIC_PAGE_PATH, name: PUBLIC_PAGE_TITLE, description }),
        }}
      />
      {/* Search indexes the header only, as on the market map; the tables
          would return this page for every company name. */}
      <div data-pagefind-body>
        <PageHeader
          title={PUBLIC_PAGE_TITLE}
          lead={publicLeadSentence()}
          asOf={PUBLIC_COMPANIES_AS_OF}
          section={{ ...MARKET_SECTION, current: PUBLIC_PAGE_PATH }}
          anchors={PUBLIC_PAGE_SECTIONS}
        />
      </div>

      <PublicMarketMap data={mapData} text={publicMarketMapText(mapData)} />

      <Section id="listed-companies" lead={listedLead()}>
        <ListedCompaniesTable />
        <h3 className={SUBHEAD}>Left out</h3>
        <p className={LEAD}>{leftOutLead()}</p>
        <div className="mt-4">
          <LeftOutTable />
        </div>
      </Section>

      <Section id="ipo-watch" lead={ipoWatchLead()}>
        <IpoWatchTable />
      </Section>

      <Section id="since-listing" lead={sinceListingLead()}>
        <SinceListingTable />
      </Section>
    </div>
  );
}
