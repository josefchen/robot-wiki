import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/data-page/page-header';
import {
  HoldersTable,
  LinesTable,
  ListingTable,
  ProductsTable,
  RegionsTable,
  ResultsTable,
  SecurityTable,
  SoftwareTable,
  TimelineTable,
} from '@/components/company-profile/profile-tables';
import { SubHeading } from '@/components/company-profile/profile-parts';
import {
  COMPANY_PROFILES,
  PROFILE_SECTIONS,
  companyProfile,
  companyProfilePath,
  holdersLead,
  profileLead,
  sectionLeads,
  securityRecords,
  timelineEvents,
  type ProfileSectionId,
} from '@/lib/company-profile-page';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import { routeSeoProfile } from '@/lib/seo-profiles';
import { materialAttributes } from '@/lib/site-materials';
import { MARKET_SECTION } from '@/lib/site-sections';
import { webPageJsonLd } from '@/lib/structured-data';

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string }> {
  return COMPANY_PROFILES.map((profile) => ({ slug: profile.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const profile = companyProfile(slug);
  const seo = routeSeoProfile(companyProfilePath(slug));
  return {
    title: seo.title,
    description: seo.description,
    // Full card blocks restated: a route-level object replaces the layout's
    // for the same key. og:title is the rendered h1.
    openGraph: routeOpenGraph(profile.company.name),
    twitter: routeTwitter(profile.company.name),
  };
}

function Section({
  id,
  lead,
  children,
}: {
  id: ProfileSectionId;
  lead: string;
  children: ReactNode;
}) {
  const section = PROFILE_SECTIONS.find((candidate) => candidate.id === id)!;
  return (
    <section id={id} aria-labelledby={`${id}-heading`} data-profile-section={id} className="mt-16 scroll-mt-24 sm:mt-20">
      <h2 id={`${id}-heading`} className="section-h2">
        {section.title}
      </h2>
      <p className="mt-3 max-w-[44rem] font-sans text-[16px] leading-[1.6] text-text">{lead}</p>
      {children}
    </section>
  );
}

export default async function CompanyProfilePage({ params }: { params: Params }) {
  const { slug } = await params;
  const profile = companyProfile(slug);
  const path = companyProfilePath(slug);
  const seo = routeSeoProfile(path);
  const leads = sectionLeads(profile);
  return (
    <div
      data-page-frame="frame:map"
      className="mx-auto w-full max-w-[84rem] px-6 pt-8 pb-24 sm:pt-12 md:px-8 lg:px-12"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: webPageJsonLd({ path, name: profile.company.name, description: seo.description }),
        }}
      />
      <div data-pagefind-body {...materialAttributes('paper')} className="material-paper">
        <PageHeader
          title={profile.company.name}
          lead={profileLead(profile)}
          asOf={profile.asOf}
          section={MARKET_SECTION}
          anchors={PROFILE_SECTIONS.map((section) => ({ id: section.id, label: section.title }))}
        />

        <Section id="products" lead={leads.products}>
          <ProductsTable profile={profile} labelledBy="products-heading" />
        </Section>

        <Section id="money" lead={leads.money}>
          <SubHeading id="results-heading">Results</SubHeading>
          <ResultsTable profile={profile} labelledBy="results-heading" />
          <SubHeading id="lines-heading">Units and revenue by product line</SubHeading>
          <LinesTable profile={profile} labelledBy="lines-heading" />
          <SubHeading id="regions-heading">Share of revenue by market</SubHeading>
          <RegionsTable profile={profile} labelledBy="regions-heading" />
          <SubHeading id="listing-heading">Listing</SubHeading>
          <ListingTable profile={profile} labelledBy="listing-heading" />
          <SubHeading id="holders-heading">Shareholders</SubHeading>
          <p className="mt-2 max-w-[44rem] font-sans text-[14px] leading-[1.55] text-text-dim">{holdersLead(profile)}</p>
          <HoldersTable profile={profile} labelledBy="holders-heading" />
        </Section>

        <Section id="timeline" lead={leads.timeline}>
          <TimelineTable profile={profile} rows={timelineEvents(profile)} labelledBy="timeline-heading" />
        </Section>

        <Section id="software-and-data" lead={leads['software-and-data']}>
          <SoftwareTable profile={profile} labelledBy="software-and-data-heading" />
        </Section>

        <Section id="security" lead={leads.security}>
          <SecurityTable profile={profile} rows={securityRecords(profile)} labelledBy="security-heading" />
        </Section>
      </div>
    </div>
  );
}
