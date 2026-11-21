import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/data-page/page-header';
import { ArgumentsTable, GapsTable, OpenQuestionsTable, WhatChangedTable } from '@/components/now/now-tables';
import { TrajectoryFigure } from '@/components/now/trajectory-figure';
import { DELIVERY_GAPS, NOW_AS_OF } from '@/data/now';
import { developmentsNewestFirst, resolvedTrajectories } from '@/lib/now';
import {
  NOW_PATH,
  NOW_SECTIONS,
  NOW_TITLE,
  nowPageCounts,
  questionsWithArguments,
  standaloneArguments,
} from '@/lib/now-page';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import { routeSeoProfile } from '@/lib/seo-profiles';
import { materialAttributes } from '@/lib/site-materials';
import { webPageJsonLd } from '@/lib/structured-data';

const profile = routeSeoProfile(NOW_PATH);

export const metadata: Metadata = {
  title: profile.title,
  description: profile.description,
  // Full card blocks restated: a route-level object replaces the layout's
  // for the same key. og:title is the rendered h1.
  openGraph: routeOpenGraph(NOW_TITLE),
  twitter: routeTwitter(NOW_TITLE),
};

type SectionId = (typeof NOW_SECTIONS)[number]['id'];

function Section({ id, lead, children }: { id: SectionId; lead?: string; children: ReactNode }) {
  const section = NOW_SECTIONS.find((candidate) => candidate.id === id)!;
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={id === 'where-it-is-heading' ? headingId : undefined}
      data-now-section={id}
      className="mt-16 scroll-mt-24 sm:mt-20"
    >
      <h2 id={headingId} className="section-h2">
        {section.title}
      </h2>
      {lead ? <p className="mt-3 max-w-[40rem] font-sans text-[16px] leading-[1.6] text-text">{lead}</p> : null}
      {children}
    </section>
  );
}

export default function NowPage() {
  const counts = nowPageCounts();
  const trajectories = resolvedTrajectories();
  const heading = (id: SectionId) => `${id}-heading`;
  return (
    <div data-page-frame="frame:map" className="mx-auto w-full max-w-[60rem] px-6 pt-8 pb-24 sm:pt-12 md:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: webPageJsonLd({ path: NOW_PATH, name: NOW_TITLE, description: profile.description }),
        }}
      />
      <div data-pagefind-body {...materialAttributes('paper')} className="material-paper">
        <PageHeader
          title={NOW_TITLE}
          lead="Where robotics stands and which way it is moving"
          asOf={NOW_AS_OF}
          anchors={NOW_SECTIONS.map((section) => ({ id: section.id, label: section.title }))}
        />
      </div>

      <Section id="where-it-is-heading">
        <TrajectoryFigure rows={trajectories} />
      </Section>

      <Section
        id="what-changed"
        lead={`The ${counts.developments} developments between ${counts.developmentSpan}, newest first, each with what it means and what it does not.`}
      >
        <WhatChangedTable rows={developmentsNewestFirst()} labelledBy={heading('what-changed')} />
      </Section>

      <Section
        id="open-questions"
        lead={`${counts.questions} questions the evidence has not settled, with the best published result each way; under ${counts.questionsWithArguments} of them, what named people said on the same point, in their own words.`}
      >
        <OpenQuestionsTable rows={questionsWithArguments()} labelledBy={heading('open-questions')} />
      </Section>

      <Section
        id="what-people-argue-about"
        lead={`${counts.standaloneArguments} further arguments, each in the words of the people making them and linked to where they said it.`}
      >
        <ArgumentsTable rows={standaloneArguments()} labelledBy={heading('what-people-argue-about')} />
      </Section>

      <Section
        id="announced-against-delivered"
        lead={`In each of the ${counts.gaps} rows, the left is what was announced, ordered, registered or produced, and the right is what the cited page shows so far, each number with what it counts; each side carries its own date.`}
      >
        <GapsTable rows={DELIVERY_GAPS} labelledBy={heading('announced-against-delivered')} />
      </Section>
    </div>
  );
}
