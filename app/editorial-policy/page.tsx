import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs, breadcrumbJsonLd } from '@/components/article/breadcrumbs';
import { CONTENT_CORRECTION_URL } from '@/lib/identity';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import {
  STANDALONE_SEO_DESCRIPTIONS,
  STANDALONE_SEO_TITLES,
} from '@/lib/seo';

const title = 'Editorial policy';

export const metadata: Metadata = {
  title: STANDALONE_SEO_TITLES.editorialPolicy,
  description: STANDALONE_SEO_DESCRIPTIONS.editorialPolicy,
  openGraph: routeOpenGraph(title),
  twitter: routeTwitter(title),
};

const sectionHeading =
  'font-sans text-xl font-semibold tracking-tight text-text';
const prose =
  'mt-4 font-serif text-[1.0625rem] leading-relaxed text-text';
const inlineLink =
  'text-accent underline decoration-border-strong underline-offset-2 hover:decoration-accent';

export default function EditorialPolicyPage() {
  return (
    <article className="mx-auto w-full max-w-[65ch] px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: breadcrumbJsonLd([
            { label: 'Home', href: '/' },
            { label: title, href: '/editorial-policy/' },
          ]),
        }}
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: title }]} />

      <header data-pagefind-body>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text">
          Editorial policy
        </h1>
        <p className="mt-5 font-serif text-[1.0625rem] leading-relaxed text-text">
          Robot Wiki exists to make modern robotics legible without hiding
          uncertainty, deployment constraints, or disagreement. It is an
          independently maintained technical reference, not a product ranking
          service. Sources should let a reader verify a claim rather than ask
          them to trust the author.
        </p>
      </header>

      <section aria-labelledby="sources-heading" className="mt-12">
        <h2 id="sources-heading" className={sectionHeading}>
          Sources and evidence
        </h2>
        <p className={prose}>
          Non-obvious factual claims require a citation. Papers, official
          documentation, dataset cards, standards, and first-party technical
          reports are preferred. A secondary source is used when it is the
          clearest available record or when a primary source cannot be
          retrieved, and that limitation should remain visible. Unknown values
          are reported as unknown, not estimated.
        </p>
      </section>

      <section aria-labelledby="review-heading" className="mt-12">
        <h2 id="review-heading" className={sectionHeading}>
          Review and updates
        </h2>
        <p className={prose}>
          Every published article passes the content schema, citation
          resolution, internal-link, accessibility, and production-build
          checks. The visible review date changes only after a material factual
          or explanatory review. Fast-moving model, dataset, evaluation, and
          deployment pages are checked more often than evergreen mathematical
          foundations.
        </p>
      </section>

      <section aria-labelledby="expert-heading" className="mt-12">
        <h2 id="expert-heading" className={sectionHeading}>
          Expert criticism
        </h2>
        <p className={prose}>
          Researchers, maintainers, engineers, and educators may be asked to
          inspect a specific article for errors or missing context. Reviewing a
          page does not mean endorsing Robot Wiki or every claim on that page.
          A reviewer is named only with permission, and conflicts are disclosed
          when someone reviews coverage of their own work.
        </p>
      </section>

      <section aria-labelledby="corrections-heading" className="mt-12">
        <h2 id="corrections-heading" className={sectionHeading}>
          Corrections
        </h2>
        <p className={prose}>
          A correction should identify the page, the disputed claim, and a
          source that supports the proposed change. Confirmed errors are fixed
          in the article and its structured data or interactive where relevant.
          Material corrections receive a new review date; silent date bumps are
          not permitted.
        </p>
        <p className="mt-4 font-sans text-sm leading-relaxed text-text-dim">
          <a
            data-brand-control-id="control:link-focus"
            href={CONTENT_CORRECTION_URL}
            target="_blank"
            rel="noopener"
            className={inlineLink}
          >
            Open a content-correction report on GitHub
          </a>{' '}
          or review the repository&apos;s{' '}
          <Link data-brand-control-id="control:link-focus" href="/credits/" className={inlineLink}>
            authorship and image credits
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
