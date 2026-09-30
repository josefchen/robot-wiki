import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs, breadcrumbJsonLd } from '@/components/article/breadcrumbs';
import { IntentLink } from '@/components/ui/intent-link';
import { DOMAIN_META } from '@/data/modules';
import { learningPaths } from '@/lib/learning-paths';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import {
  STANDALONE_SEO_DESCRIPTIONS,
  STANDALONE_SEO_TITLES,
} from '@/lib/seo';

const title = 'About';

export const metadata: Metadata = {
  title: STANDALONE_SEO_TITLES.about,
  description: STANDALONE_SEO_DESCRIPTIONS.about,
  openGraph: routeOpenGraph(title),
  twitter: routeTwitter(title),
};

const sectionHeading =
  'font-sans text-xl font-semibold tracking-tight text-text';
const prose = 'mt-4 font-serif text-[1.0625rem] leading-relaxed text-text';
const inlineLink =
  'text-accent underline decoration-border-strong underline-offset-2 hover:decoration-accent';

/**
 * Scope, reading guidance and citation conventions: the text the home page
 * carried before it became a front page. The scope statement names domains
 * by their sidebar display names and states its exclusions as plain fact
 * (VAL-WIKI-028).
 */
export default function AboutPage() {
  const paths = learningPaths();
  return (
    <article className="mx-auto w-full max-w-[65ch] px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: breadcrumbJsonLd([
            { label: 'Home', href: '/' },
            { label: title, href: '/about/' },
          ]),
        }}
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: title }]} />
      <header data-pagefind-body>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text">
          About
        </h1>
        <p
          data-about-scope
          className="mt-5 font-serif text-[1.0625rem] leading-relaxed text-text"
        >
          Robot Wiki covers modern robot learning for engineers who already
          know machine learning, from {DOMAIN_META.manipulation.name} and{' '}
          {DOMAIN_META['world-models'].name} to the{' '}
          {DOMAIN_META.classical.name} underneath. The industry appears as
          data in the Market Map. Company news and investment advice are out
          of scope.
        </p>
      </header>

      <section aria-labelledby="reading-heading" data-pagefind-body className="mt-12">
        <h2 id="reading-heading" className={sectionHeading}>
          Reading the wiki
        </h2>
        <p className={prose}>
          Articles stand alone, but inside a domain the reading order is the
          contents order: later articles assume the earlier ones. If you come
          to robotics from machine learning, start with{' '}
          <IntentLink
            data-brand-control-id="control:link-focus"
            href="/manipulation/action-chunking/"
            className={inlineLink}
          >
            Action Chunking (ACT and ALOHA)
          </IntentLink>
          , which shows the format every article follows.
        </p>
        <p className={prose}>
          The one prerequisite is fluency in machine learning; no robotics
          background is assumed. When an article needs a classical result, it
          links to the article that derives it, so you can read forward and
          fill gaps as you go. Terms are defined where they first appear and
          collected in the{' '}
          <IntentLink
            data-brand-control-id="control:link-focus"
            href="/glossary/"
            className={inlineLink}
          >
            glossary
          </IntentLink>
          .
        </p>
        <p className={prose}>
          Technical claims trace to cited evidence. A citation chip links
          each claim to its named source, and every article ends with its
          full bibliography. Sources range from research papers to
          first-party documentation and labelled community estimates, so a
          citation tells you where a claim comes from, and the kind of source
          tells you how far to trust it. Where researchers disagree, the text
          names who holds which position.
        </p>
      </section>

      <section aria-labelledby="paths-heading" data-pagefind-body className="mt-12">
        <h2 id="paths-heading" className={sectionHeading}>
          Reading paths
        </h2>
        {paths.map((path) => (
          <section
            key={path.id}
            aria-labelledby={`reading-path-${path.id}`}
            className="mt-6"
          >
            <h3
              id={`reading-path-${path.id}`}
              className="font-sans text-base font-semibold tracking-tight text-text"
            >
              <IntentLink
                data-brand-control-id="control:link-focus"
                href={path.hub}
                className="transition-colors hover:text-accent"
              >
                {path.title}
              </IntentLink>
            </h3>
            <p className="mt-1 font-sans text-sm leading-relaxed text-text-dim">
              {path.description}
            </p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 font-sans text-sm text-text marker:font-mono marker:text-[11px] marker:text-text-dim">
              {path.entries.map((entry) => (
                <li key={`${entry.domain}/${entry.slug}`}>
                  <IntentLink
                    data-brand-control-id="control:link-focus"
                    href={`/${entry.domain}/${entry.slug}/`}
                    className="underline decoration-border-strong underline-offset-2 transition-colors hover:text-accent hover:decoration-accent"
                  >
                    {entry.title}
                  </IntentLink>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </section>

      <p className="mt-12 font-sans text-sm leading-relaxed text-text-dim">
        Corrections follow the{' '}
        <Link
          data-brand-control-id="control:link-focus"
          href="/editorial-policy/"
          className={inlineLink}
        >
          editorial policy
        </Link>
        . The author and every image licence are listed under{' '}
        <Link
          data-brand-control-id="control:link-focus"
          href="/credits/"
          className={inlineLink}
        >
          credits
        </Link>
        .
      </p>
    </article>
  );
}
