import type { Metadata } from 'next';
import { AlsoHere } from '@/components/home/also-here';
import { ContentsIndex } from '@/components/home/contents-index';
import { HomeSearch } from '@/components/home/home-search';
import { HowMade } from '@/components/home/how-made';
import { LatestChanges } from '@/components/home/latest-changes';
import { StartHere } from '@/components/home/start-here';
import { materialAttributes } from '@/lib/site-materials';
import { startHere } from '@/lib/featured-article';
import { formatCount, homeCounts } from '@/lib/home-counts';
import { latestChanges } from '@/lib/home-updates';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '@/lib/identity';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import { HOME_META_DESCRIPTION, websiteJsonLd } from '@/lib/seo';
import { SITE_DISPLAY_NAME } from '@/lib/site';

/**
 * Home keeps the layout's title and cards but carries a description long
 * enough to state what the site answers. It opens with the locked
 * descriptor, so every descriptor field still carries it verbatim.
 * The card blocks are restated because a route-level
 * object replaces the layout's (no deep merge).
 */
export const metadata: Metadata = {
  description: HOME_META_DESCRIPTION,
  openGraph: {
    ...routeOpenGraph(SITE_DISPLAY_NAME),
    description: HOME_META_DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    ...routeTwitter(SITE_DISPLAY_NAME),
    description: HOME_META_DESCRIPTION,
  },
};

/**
 * Home is the front page of a reference work: it shows what the wiki holds
 * and the way to each part of it. The first screen sets the name, the
 * descriptor, the search and the counts above the contents, every article
 * under its field. Below: where to start, the parts of the site that are
 * not articles, what changed lately and how the wiki is kept. Scope,
 * reading guidance and the citation caveat live on /about/.
 *
 * Every section is a direct child of <main>, and each one carries
 * data-pagefind-body itself: once one page declares a body region Pagefind
 * skips pages that declare none.
 */
export default function Home() {
  const counts = homeCounts();
  const entries = startHere();
  const latest = latestChanges(5);

  return (
    <>
      <section
        aria-label="Introduction"
        data-pagefind-body
        // The home representative surface declares its material: paper,
        // the one texture-free ground the site paints.
        {...materialAttributes('paper')}
        className="home-frame home-hero material-paper"
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: websiteJsonLd() }}
        />
        {/* The lockup is the h1 and the descriptor alone in one container:
            any other text beside the wordmark would read as a descriptor
            surface. */}
        <div className="home-lockup">
          <h1 data-tektur-role="home-wordmark" className="home-wordmark">
            {PUBLIC_IDENTITY}
          </h1>
          {/* The locked string verbatim, in sentence case. */}
          <p className="home-descriptor">{PUBLIC_DESCRIPTOR}</p>
        </div>
        <div className="home-find">
          <HomeSearch />
          {/* Counted from the registries at build time. */}
          <p data-home-counts className="meta-line home-counts">
            <span>{formatCount(counts.articles)} articles</span>
            <span aria-hidden="true"> · </span>
            <span data-brand-highlight="home-source-count">{formatCount(counts.sources)} sources</span>
            <span aria-hidden="true"> · </span>
            <span>{formatCount(counts.glossaryTerms)} glossary terms</span>
          </p>
        </div>
      </section>

      <section
        id="contents"
        aria-labelledby="contents-heading"
        data-pagefind-body
        className="home-frame home-section home-contents"
      >
        <h2 id="contents-heading" data-tektur-role="section-display" className="section-h2 home-h2">
          Contents
        </h2>
        <ContentsIndex />
      </section>

      <section
        aria-labelledby="start-here-heading"
        data-pagefind-body
        className="home-frame home-section home-start"
      >
        <h2 id="start-here-heading" data-tektur-role="section-display" className="section-h2 home-h2">
          Start here
        </h2>
        <StartHere entries={entries} />
      </section>

      <section
        aria-labelledby="also-heading"
        data-pagefind-body
        className="home-frame home-section home-rail"
      >
        <h2 id="also-heading" data-tektur-role="section-display" className="section-h2 home-h2">
          Also in the wiki
        </h2>
        <AlsoHere counts={counts} />
      </section>

      {/* Dated by git (data/content-dates.json) or by the editor's note in
          data/updates.ts, whichever names the latest change. */}
      <section
        aria-labelledby="latest-heading"
        data-pagefind-body
        className="home-frame home-section home-rail"
      >
        <h2 id="latest-heading" data-tektur-role="section-display" className="section-h2 home-h2">
          Latest
        </h2>
        <LatestChanges changes={latest} />
      </section>

      <section
        aria-labelledby="made-heading"
        data-pagefind-body
        className="home-frame home-section home-rail"
      >
        <h2 id="made-heading" data-tektur-role="section-display" className="section-h2 home-h2">
          How this wiki is made
        </h2>
        <HowMade />
      </section>
    </>
  );
}
