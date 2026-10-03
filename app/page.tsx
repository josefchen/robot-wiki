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
const container = 'mx-auto w-full max-w-5xl px-6';

const heading =
  'font-display-section text-xl tracking-tight text-text';

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
        className={`${container} pt-8`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: websiteJsonLd() }}
        />
        {/* VAL-DSHOME-009: below md the grid is an exact 80px band closing
            the sheet under the lockup; from md it is the right column. */}
        <div
          data-brand-surface-id="surface:flat"
          className="flex flex-col border border-border bg-bg md:grid md:grid-cols-[minmax(0,1fr)_13rem]"
        >
          <div className="px-6 pb-6 pt-7 sm:px-8 md:py-7">
            {/* VAL-B2-TYPE-006 / design-system 4.3 lock the wordmark to
                52-68px at 375 and 88-120px at 1440 with a 0.88-0.98 line
                height. Below xl the clamp cannot leave 56-68px and from xl
                it cannot leave 88-104px. The band switches at xl because
                the sidebar narrows the hero column to 416px at 1024, where
                the 88px floor would break the identity in half. */}
            <h1
              data-tektur-role="home-wordmark"
              className="font-display-home text-[length:clamp(3.5rem,6.4vw,4.25rem)] leading-[0.92] tracking-[-0.035em] text-text xl:text-[length:clamp(5.5rem,6.4vw,6.5rem)]"
            >
              {PUBLIC_IDENTITY}
            </h1>
            {/* The locked string verbatim, sentence case in mono
                (design-system 3.5). No text-transform: a rendered casing
                change would fail the byte comparison in VAL-B2-ID-002. */}
            <p className="mt-3 max-w-[56ch] font-mono text-xs leading-relaxed tracking-[0.01em] text-text-dim">
              {PUBLIC_DESCRIPTOR}
            </p>
          </div>
          <div
            id="home-engineering-grid"
            aria-hidden="true"
            data-registration-device
            data-brand-device-id="device:dot-grid"
            data-brand-anchor-selector="#home-engineering-grid"
            data-brand-device-edge="left"
            data-brand-anchor-edge="left"
            data-brand-motif="dot-grid"
            className="engineering-grid pointer-events-none relative h-20 w-full border-b border-border md:h-auto md:min-h-full md:border-b-0 md:border-l"
          >
            <span
              aria-hidden="true"
              data-registration-device
              data-brand-device-id="device:section-rule"
              data-brand-anchor-selector="#home-engineering-grid"
              data-brand-device-edge="center-x"
              data-brand-anchor-edge="center-x"
              data-brand-motif="registration-cross"
              className="pointer-events-none absolute left-1/2 top-0 h-full -translate-x-1/2 border-l border-border-strong"
            />
            <span
              aria-hidden="true"
              data-registration-device
              data-brand-device-id="device:section-rule"
              data-brand-anchor-selector="#home-engineering-grid"
              data-brand-device-edge="center-y"
              data-brand-anchor-edge="center-y"
              data-brand-motif="registration-cross"
              className="pointer-events-none absolute left-0 top-1/2 w-full -translate-y-1/2 border-t border-border-strong"
            />
            <span
              aria-hidden="true"
              data-registration-device
              data-brand-device-id="device:registration-cross"
              data-brand-anchor-selector="#home-engineering-grid"
              data-brand-device-edge="center-x"
              data-brand-anchor-edge="center-x"
              data-brand-motif="registration-cross"
              className="pointer-events-none absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 bg-accent"
            />
          </div>
        </div>
        {/* Counted from the registries at build time. The lime mark is the
            page's selection example (VAL-B2-SHELL-006); <mark> carries it
            without colour. */}
        <p
          data-home-counts
          className="mt-4 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[13px] text-text-dim"
        >
          <span>{counts.articles} articles</span>
          <mark
            data-brand-highlight="home-source-count"
            className="bg-selection px-1 text-ink"
          >
            {counts.sources} sources
          </mark>
          <span>{counts.glossaryTerms} glossary terms</span>
        </p>
        <HomeSearch className="mt-3" />
      </section>
      <section
        aria-labelledby="contents-heading"
        data-pagefind-body
        data-brand-module-signature={SECTION_SIGNATURES.contents}
        className={`${container} mt-8`}
      >
        <h2
          id="contents-heading"
          data-tektur-role="section-display"
          className="font-display-section text-2xl tracking-tight text-text"
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
        className={`${container} mt-10`}
      >
        <h2 id="featured-article-heading" data-tektur-role="section-display" className={heading}>
          Featured article
        </h2>
        <p className="mt-3 max-w-[65ch] font-medium text-text">
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
          className="mt-1 max-w-[65ch] font-serif text-[1.0625rem] leading-relaxed text-text"
        >
          {featured.excerpt}
        </p>
      </section>

      <section
        aria-labelledby="featured-scene-heading"
        data-pagefind-body
        data-brand-module-signature={SECTION_SIGNATURES.featuredScene}
        className={`${container} mt-10`}
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
        className={`${container} mt-10`}
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
        className={`${container} mt-10`}
      >
        <h2 id="recently-updated-heading" data-tektur-role="section-display" className={heading}>
          Recently updated
        </h2>
        <ol className="mt-3 space-y-1.5 text-[15px] leading-6">
          {recent.map((entry) => (
            <li
              key={`${entry.domain}/${entry.slug}`}
              className="flex items-baseline gap-x-4"
            >
              <time
                dateTime={entry.dateModified}
                className="w-24 shrink-0 font-mono text-[13px] text-text-dim"
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
        className={`${container} mt-10 pb-16`}
      >
        <div className="flex flex-wrap items-baseline gap-x-4 border-t border-border pt-3 text-[15px]">
          <span className="text-text-dim">Tools</span>
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
