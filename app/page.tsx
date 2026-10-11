import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentsIndex } from '@/components/home/contents-index';
import { DidYouKnow, HOME_PROSE_LINK_CLASS } from '@/components/home/did-you-know';
import { HomeSearch } from '@/components/home/home-search';
import { SceneSource } from '@/components/motion/scene-chrome';
import { ReliabilityThreshold } from '@/components/motion/scenes/reliability-threshold';
import { getModule, publishedModules } from '@/data/modules';
import { recentlyUpdated } from '@/lib/content-dates';
import {
  HOME_ROTATING_WORDS,
  featuredArticleWithin,
  recentListWords,
} from '@/lib/featured-article';
import { homeCounts } from '@/lib/home-counts';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '@/lib/identity';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import { HOME_META_DESCRIPTION, websiteJsonLd } from '@/lib/seo';
import { SITE_DISPLAY_NAME } from '@/lib/site';

/**
 * Home keeps the layout's title and cards but carries a description long
 * enough to state what the site answers. It opens with the locked
 * descriptor, so every descriptor field still carries it verbatim
 * (VAL-B2-ID-002). The card blocks are restated because a route-level
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
 * Home is an encyclopedia front page: the identity line with live counts
 * and search, the contents of all seven domains, a featured article, one
 * featured scene, three cited facts, the latest article changes and a line
 * of tool links. Scope, reading guidance and the citation caveat live on
 * /about/.
 *
 * The sections are direct children of <main>, because the structural
 * signature checks in contract/design-integrity.md measure them there.
 */
const container = 'sheet';

const heading = 'section-h2';

/**
 * The registered structural signature of each section, as
 * `surface/heading/form`, checked against
 * contract/brand-v2-section-signature-registry.json.
 */
const SECTION_SIGNATURES = {
  identity: 'sheet/display-lockup/search-form',
  contents: 'ruled-plain/index-heading/row-links',
  featuredArticle: 'plain/module-heading/lead-excerpt',
  featuredScene: 'plain/module-heading/motion-scene',
  didYouKnow: 'plain/module-heading/cited-facts',
  recentlyUpdated: 'plain/module-heading/dated-links',
  tools: 'ruled-plain/inline-label/link-line',
} as const;

const SCENE_ARTICLE = { domain: 'frontier', slug: 'reliability-gap' } as const;

export default function Home() {
  const counts = homeCounts();
  const recent = recentlyUpdated(publishedModules(), 5);
  const featured = featuredArticleWithin(
    new Date(),
    HOME_ROTATING_WORDS - recentListWords(recent),
  );
  const sceneArticle = getModule(SCENE_ARTICLE.domain, SCENE_ARTICLE.slug);
  if (!sceneArticle || sceneArticle.status !== 'published') {
    throw new Error('the featured scene credits an article that is not published');
  }

  return (
    <>
      {/* data-pagefind-body sits on each section rather than a wrapper:
          once one page declares a body region Pagefind skips pages that
          declare none, so home needs its own (VAL-SEARCH-021), and a
          wrapper would stop the sections being children of <main>. */}
      <section
        aria-label="Introduction"
        data-pagefind-body
        data-brand-module-signature={SECTION_SIGNATURES.identity}
        className={`${container} sheet-masthead home-masthead`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: websiteJsonLd() }}
        />
        {/* The masthead of the Pantheon standard: one DM Sans display H1,
            the locked descriptor as the lead, and the live counts as the
            muted meta line. */}
        {/* The lockup is the h1 and the descriptor alone in one container:
            every other text beside the wordmark would read as a descriptor
            surface (VAL-B2-ID-002), so the counts and the search sit
            outside it. */}
        <div className="home-lockup">
          <h1 data-tektur-role="home-wordmark" className="display-h1">
            {PUBLIC_IDENTITY}
          </h1>
          {/* The locked string verbatim, in sentence case. No
              text-transform: a rendered casing change would fail the byte
              comparison in VAL-B2-ID-002. */}
          <p className="page-lead">{PUBLIC_DESCRIPTOR}</p>
        </div>
        {/* Counted from the registries at build time. */}
        <p data-home-counts className="meta-line">
          <span>{counts.articles} articles</span>
          <span aria-hidden="true"> · </span>
          <span data-brand-highlight="home-source-count">
            {counts.sources} sources
          </span>
          <span aria-hidden="true"> · </span>
          <span>{counts.glossaryTerms} glossary terms</span>
        </p>
        <HomeSearch className="home-masthead-search mt-8" />
      </section>
      <section
        aria-labelledby="contents-heading"
        data-pagefind-body
        data-brand-module-signature={SECTION_SIGNATURES.contents}
        className={`${container} sheet-section home-section`}
      >
        <h2
          id="contents-heading"
          data-tektur-role="section-display"
          className={heading}
        >
          Contents
        </h2>
        <ContentsIndex />
      </section>

      {/* A verbatim lead, chosen by the build date among those that fit
          beside "Recently updated" (lib/featured-article.ts). */}
      <section
        aria-labelledby="featured-article-heading"
        data-pagefind-body
        data-brand-module-signature={SECTION_SIGNATURES.featuredArticle}
        className={`${container} sheet-section home-section`}
      >
        <h2 id="featured-article-heading" data-tektur-role="section-display" className={heading}>
          Featured article
        </h2>
        <p className="font-display text-[16px] font-semibold text-text">
          <Link
            data-brand-control-id="control:link-focus"
            href={featured.href}
            className={HOME_PROSE_LINK_CLASS}
          >
            {featured.title}
          </Link>
        </p>
        <p
          data-featured-excerpt
          className="mt-2 text-[16px] leading-[1.62] text-text"
        >
          {featured.excerpt}
        </p>
      </section>

      <section
        aria-labelledby="featured-scene-heading"
        data-pagefind-body
        data-brand-module-signature={SECTION_SIGNATURES.featuredScene}
        className={`${container} sheet-section home-section`}
      >
        <h2 id="featured-scene-heading" data-tektur-role="section-display" className={heading}>
          Featured scene
        </h2>
        <SceneSource
          source={
            <>
              From{' '}
              <Link
                data-brand-control-id="control:link-focus"
                href={`/${SCENE_ARTICLE.domain}/${SCENE_ARTICLE.slug}/`}
                className={HOME_PROSE_LINK_CLASS}
              >
                {sceneArticle.title}
              </Link>
            </>
          }
        >
          <ReliabilityThreshold className="mt-3" />
        </SceneSource>
      </section>

      <section
        aria-labelledby="did-you-know-heading"
        data-pagefind-body
        data-brand-module-signature={SECTION_SIGNATURES.didYouKnow}
        className={`${container} sheet-section home-section`}
      >
        <h2 id="did-you-know-heading" data-tektur-role="section-display" className={heading}>
          Did you know
        </h2>
        <DidYouKnow />
      </section>

      {/* Dated by git (data/content-dates.json), the same date each
          article's JSON-LD states as dateModified, and printed in that
          form: one word per date keeps the list inside the home word
          budget of VAL-OPUS-021. */}
      <section
        aria-labelledby="recently-updated-heading"
        data-pagefind-body
        data-brand-module-signature={SECTION_SIGNATURES.recentlyUpdated}
        className={`${container} sheet-section home-section`}
      >
        <h2 id="recently-updated-heading" data-tektur-role="section-display" className={heading}>
          Recently updated
        </h2>
        <ol className="border-t border-border text-[15px] leading-6">
          {recent.map((entry) => (
            <li
              key={`${entry.domain}/${entry.slug}`}
              className="flex items-baseline gap-x-6 border-b border-border py-3"
            >
              <time
                dateTime={entry.dateModified}
                className="w-24 shrink-0 font-mono text-[13px] tabular-nums text-text-dim"
              >
                {entry.dateModified}
              </time>
              <Link
                data-brand-control-id="control:link-focus"
                href={`/${entry.domain}/${entry.slug}/`}
                className={`min-w-0 ${HOME_PROSE_LINK_CLASS}`}
              >
                {entry.title}
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-label="Tools"
        data-pagefind-body
        data-brand-module-signature={SECTION_SIGNATURES.tools}
        className={`${container} sheet-section home-section`}
      >
        <div className="flex flex-wrap items-baseline gap-x-4 border-t border-border pt-4 text-[15px]">
          <span className="eyebrow">Tools</span>
          <ul className="home-run">
            <li>
              <Link
                data-brand-control-id="control:link-focus"
                href="/playground/"
                className={HOME_PROSE_LINK_CLASS}
              >
                Playground
              </Link>
            </li>
            <li>
              {' '}
              <Link
                data-brand-control-id="control:link-focus"
                href="/how-robots-work/"
                className={HOME_PROSE_LINK_CLASS}
              >
                How robots work
              </Link>
            </li>
            <li>
              {' '}
              <Link
                data-brand-control-id="control:link-focus"
                href="/market-map/"
                className={HOME_PROSE_LINK_CLASS}
              >
                Market Map
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
