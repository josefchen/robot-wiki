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

const sectionHeading = 'section-h2';
const prose =
  'mt-4 font-serif text-base leading-[1.62] text-text';
const inlineLink =
  'ink-link';

export default function EditorialPolicyPage() {
  return (
    <article data-page-frame="frame:narrow" className="mx-auto w-full max-w-[calc(65ch+4rem)] px-6 py-12 md:px-8">
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
        <h1 className="display-h1">
          Editorial policy
        </h1>
        <p className="mt-5 font-serif text-base leading-[1.62] text-text">
          Robot Wiki is an independent reference on modern robotics. It ranks
          no products and states uncertainty, deployment constraints and
          disagreement.
        </p>
      </header>

      <section aria-labelledby="sources-heading" className="mt-16">
        <h2 id="sources-heading" className={sectionHeading}>
          Sources and evidence
        </h2>
        <p className={prose}>
          Every non-obvious claim is cited. Papers, official documentation,
          dataset cards, standards and first-party technical reports come
          first. A secondary source is used when it is the clearest record or
          the primary cannot be retrieved, and the text says so. Unknown
          values are reported as unknown.
        </p>
      </section>

      <section aria-labelledby="review-heading" className="mt-16">
        <h2 id="review-heading" className={sectionHeading}>
          Review and updates
        </h2>
        <p className={prose}>
          Every published article passes the content-schema,
          citation-resolution, internal-link, accessibility and
          production-build checks. Its review date changes only after a
          material factual or explanatory review. Fast-moving model, dataset,
          evaluation and deployment pages are checked more often than
          mathematical foundations.
        </p>
      </section>

      <section aria-labelledby="expert-heading" className="mt-16">
        <h2 id="expert-heading" className={sectionHeading}>
          Expert criticism
        </h2>
        <p className={prose}>
          Researchers, maintainers, engineers and educators may review an
          article for errors or missing context. A reviewer is named only with
          permission, and a conflict is disclosed when someone reviews coverage
          of their own work.
        </p>
      </section>

      <section aria-labelledby="corrections-heading" className="mt-16">
        <h2 id="corrections-heading" className={sectionHeading}>
          Corrections
        </h2>
        <p className={prose}>
          Correction requests name the page, the disputed claim and a
          supporting source. A confirmed error is fixed in the article and,
          where relevant, its structured data or interactive; a material
          correction gets a new review date.
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
