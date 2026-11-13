import type { Metadata } from 'next';
import { EXPLAINER_ORDER, POSTER_SIZE } from '@/components/explainers/catalog';
import { EXPLAINER_WORDS } from '@/components/explainers/words';
import { ContentsIndex } from '@/components/home/contents-index';
import { DidYouKnow } from '@/components/home/did-you-know';
import { Explore } from '@/components/home/explore';
import { FeaturedExplainer } from '@/components/home/featured-explainer';
import { HomeSearch } from '@/components/home/home-search';
import { LatestChanges } from '@/components/home/latest-changes';
import { StartHere } from '@/components/home/start-here';
import { IntentLink } from '@/components/ui/intent-link';
import { HOME_FEATURED_SCENE } from '@/data/home-featured';
import { materialAttributes } from '@/lib/site-materials';
import { startHere } from '@/lib/featured-article';
import { homeCounts } from '@/lib/home-counts';
import { latestChanges } from '@/lib/home-updates';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '@/lib/identity';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import { HOME_META_DESCRIPTION, websiteJsonLd } from '@/lib/seo';
import { SITE_DISPLAY_NAME } from '@/lib/site';

/**
 * Home keeps the layout's title and cards but carries a description long
 * enough to state what the site answers. It opens with the locked
 * descriptor, so every descriptor field still carries it verbatim
 * (DI-ID-002). The card blocks are restated because a route-level
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
 * Home is an encyclopedia front page built around one robot. The first
 * screen sets the name, the descriptor, the search and the live counts
 * beside the humanoid explainer, which the reader can turn in 3D. Below it:
 * where to start, what changed lately, the full contents, three cited facts
 * and the three things on the site that are not articles. Scope, reading
 * guidance and the citation caveat live on /about/.
 *
 * Every section is a direct child of <main>, and each one carries
 * data-pagefind-body itself: once one page declares a body region Pagefind
 * skips pages that declare none.
 */
export default function Home() {
  const counts = homeCounts();
  const entries = startHere();
  const latest = latestChanges(5);
  const scene = HOME_FEATURED_SCENE;
  const explainer = EXPLAINER_ORDER.find(({ id }) => id === scene.explainer);
  if (!explainer) {
    throw new Error(`the featured scene names ${scene.explainer}, which the explainer catalog does not list`);
  }

  return (
    <>
      <section
        aria-label="Introduction"
        data-pagefind-body
        // The home representative surface declares its material: paper,
        // the one texture-free ground the site paints (DI-SURF-011).
        {...materialAttributes('paper')}
        className="home-frame home-hero material-paper"
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: websiteJsonLd() }}
        />
        {/* The lockup is the h1 and the descriptor alone in one container:
            any other text beside the wordmark would read as a descriptor
            surface (DI-ID-002). The two words stack as blocks with a
            real space between them, so the heading's text stays exactly
            the public identity. */}
        <div className="home-lockup">
          <h1 data-tektur-role="home-wordmark" className="home-wordmark">
            <span className="home-wordmark-line">
              <span>{PUBLIC_IDENTITY.split(' ')[0]}</span>
            </span>{' '}
            <span className="home-wordmark-line">
              <span>{PUBLIC_IDENTITY.split(' ').slice(1).join(' ')}</span>
            </span>
          </h1>
          {/* The locked string verbatim, in sentence case. */}
          <p className="home-descriptor">{PUBLIC_DESCRIPTOR}</p>
        </div>
        <div className="home-find">
          <HomeSearch />
          {/* Counted from the registries at build time. */}
          <p data-home-counts className="meta-line home-counts">
            <span>{counts.articles} articles</span>
            <span aria-hidden="true"> · </span>
            <span data-brand-highlight="home-source-count">{counts.sources} sources</span>
            <span aria-hidden="true"> · </span>
            <span>{counts.glossaryTerms} glossary terms</span>
          </p>
        </div>
        {/* One explainer from /how-robots-work/, on its poster until the
            reader starts it (components/home/featured-explainer.tsx). */}
        <div
          role="group"
          aria-label={`3D explainer: ${explainer.label}`}
          // The stepper caption describes the scene, step by step.
          aria-describedby="featured-scene-step"
          data-explainer-scene={explainer.id}
          className="home-scene home-explainer"
        >
          <FeaturedExplainer
            scene={explainer.id}
            firstStep={EXPLAINER_WORDS[explainer.id].steps[0]}
            posterWidth={POSTER_SIZE.width}
            posterHeight={POSTER_SIZE.height}
            startLabel={scene.startLabel}
          />
          <p className="home-scene-more">
            <IntentLink
              data-brand-control-id="control:link-focus"
              href="/how-robots-work/"
              className="ink-link"
            >
              All {EXPLAINER_ORDER.length} explainers in How robots work
            </IntentLink>
          </p>
        </div>
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

      {/* Dated by git (data/content-dates.json) or by the editor's note in
          data/updates.ts, whichever names the latest change. */}
      <section
        aria-labelledby="latest-heading"
        data-pagefind-body
        className="home-frame home-section home-aside"
      >
        <div className="home-aside-head">
          <h2 id="latest-heading" data-tektur-role="section-display" className="section-h2 home-h2">
            Latest
          </h2>
          <p className="home-aside-more">
            <IntentLink data-brand-control-id="control:link-focus" href="/a-z/" className="ink-link">
              All articles, A to Z
            </IntentLink>
          </p>
        </div>
        <LatestChanges changes={latest} />
      </section>

      <section
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
        aria-labelledby="did-you-know-heading"
        data-pagefind-body
        className="home-frame home-section home-aside home-facts"
      >
        <h2 id="did-you-know-heading" data-tektur-role="section-display" className="section-h2 home-h2">
          Did you know
        </h2>
        <DidYouKnow />
      </section>

      <section
        aria-labelledby="explore-heading"
        data-pagefind-body
        className="home-frame home-section home-explore"
      >
        <h2 id="explore-heading" data-tektur-role="section-display" className="section-h2 home-h2">
          Explore
        </h2>
        <Explore explainerCount={EXPLAINER_ORDER.length} />
      </section>
    </>
  );
}
