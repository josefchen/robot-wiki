import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { RoundsFigure } from '@/components/rounds/rounds-figure';
import { ContextLines, MonthRow, RoundsHeadline } from '@/components/rounds/rounds-summary';
import {
  CorporateEventsTable,
  EuropeInvestorsTable,
  InvestorsTable,
  ListingsTable,
  MonthUnconfirmedTable,
  RoundsTable,
  UkEuropeTable,
} from '@/components/rounds/rounds-tables';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import {
  ROUNDS_PAGE_PATH,
  ROUNDS_PAGE_SECTIONS,
  ROUNDS_PAGE_TITLE,
  investorsLead,
  monthUnconfirmedText,
  roundsLeadSentence,
  roundsTableLead,
  ukEuropeLead,
  type RoundsPageSectionId,
} from '@/lib/rounds-page';
import { routeSeoProfile } from '@/lib/seo-profiles';
import { webPageJsonLd } from '@/lib/structured-data';

const profile = routeSeoProfile(ROUNDS_PAGE_PATH);

export const metadata: Metadata = {
  title: profile.title,
  description: profile.description,
  // Not in the sitemap until the market section's shared header lands, so
  // not indexed until then either (scripts/check-seo.ts holds the two together).
  robots: { index: false, follow: true },
  // og:title is the h1: the page name has no entry in the social-title map.
  openGraph: routeOpenGraph(ROUNDS_PAGE_TITLE),
  twitter: routeTwitter(ROUNDS_PAGE_TITLE),
};

const LEAD = 'mt-2 max-w-[40rem] font-sans text-[15px] leading-[1.6] text-text-dim';
const SUBHEAD = 'mt-12 font-sans text-[16px] font-semibold leading-6 text-text';

function label(id: RoundsPageSectionId): string {
  return ROUNDS_PAGE_SECTIONS.find((s) => s.id === id)!.label;
}

function Section({
  id,
  lead,
  children,
}: {
  id: RoundsPageSectionId;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="mt-20 scroll-mt-20">
      <h2 id={`${id}-heading`} className="section-h2">
        {label(id)}
      </h2>
      {lead ? <p className={LEAD}>{lead}</p> : null}
      {children}
    </section>
  );
}

export default function RecentRoundsPage() {
  const july = monthUnconfirmedText();
  return (
    <div
      data-page-frame="frame:map"
      className="mx-auto w-full max-w-[84rem] px-6 pt-8 pb-24 sm:pt-12 md:px-8 lg:px-12"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: webPageJsonLd({
            path: ROUNDS_PAGE_PATH,
            name: ROUNDS_PAGE_TITLE,
            description: profile.description,
          }),
        }}
      />
      <header>
        <h1 data-tektur-role="page-h1" className="font-display-page display-h1">
          {ROUNDS_PAGE_TITLE}
        </h1>
        <p className="mt-3 max-w-[40rem] font-sans text-[16px] leading-[1.6] text-text">
          {roundsLeadSentence()}
        </p>
        <nav aria-label="On this page" className="mt-6">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 font-sans text-[14px] leading-6">
            {ROUNDS_PAGE_SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-text-dim underline decoration-1 underline-offset-4 hover:text-text"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <RoundsHeadline />

      <Section id="timeline">
        <RoundsFigure />
      </Section>

      <Section id="by-month" lead="Closed rounds by calendar month, borderline rows left out, as in the total above.">
        <MonthRow />
        <ContextLines />
      </Section>

      <Section id="rounds" lead={roundsTableLead()}>
        <div className="mt-6">
          <RoundsTable />
        </div>
        <h3 className={SUBHEAD}>{july.heading}</h3>
        <p className={LEAD}>{july.sentence}</p>
        <div className="mt-6">
          <MonthUnconfirmedTable />
        </div>
      </Section>

      <Section
        id="listings-and-exits"
        lead="Stock market listings and company sales are not venture rounds and stay out of every total."
      >
        <h3 className={SUBHEAD}>Listings</h3>
        <div className="mt-4">
          <ListingsTable />
        </div>
        <h3 className={SUBHEAD}>Acquisitions and shutdowns</h3>
        <div className="mt-4">
          <CorporateEventsTable />
        </div>
      </Section>

      <Section id="investors" lead={investorsLead()}>
        <div className="mt-6">
          <InvestorsTable />
        </div>
        <h3 className={SUBHEAD}>European investors</h3>
        <div className="mt-4">
          <EuropeInvestorsTable />
        </div>
      </Section>

      <Section id="uk-europe" lead={ukEuropeLead()}>
        <div className="mt-6">
          <UkEuropeTable />
        </div>
      </Section>
    </div>
  );
}
