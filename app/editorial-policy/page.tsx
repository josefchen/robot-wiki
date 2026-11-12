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
          no products and says where evidence is thin or researchers
          disagree.
        </p>
      </header>

      <section aria-labelledby="sources-heading" className="mt-16">
        <h2 id="sources-heading" className={sectionHeading}>
          Sources and evidence
        </h2>
        <p className={prose}>
          Every number and non-obvious claim is cited to its primary source
          where one exists: the paper, standard, dataset card or company
          report. A secondary source is used only when it is clearer or the
          primary cannot be found, and the text says so. Unknown values are
          marked unknown.
        </p>
      </section>

      <section aria-labelledby="review-heading" className="mt-16">
        <h2 id="review-heading" className={sectionHeading}>
          Review and updates
        </h2>
        <p className={prose}>
          Each article shows the date it was last reviewed, and that date
          changes only when its facts have been checked again. Articles on
          fast-moving models, datasets and deployments are reviewed more
          often than those on mathematical foundations.
        </p>
      </section>

      <section aria-labelledby="expert-heading" className="mt-16">
        <h2 id="expert-heading" className={sectionHeading}>
          Expert review
        </h2>
        <p className={prose}>
          Researchers and engineers are welcome to review an article for
          errors or missing context. Reviewers are named only with their
          permission, and a reviewer&apos;s stake in the work under review is
          disclosed.
        </p>
      </section>

      <section aria-labelledby="corrections-heading" className="mt-16">
        <h2 id="corrections-heading" className={sectionHeading}>
          Corrections
        </h2>
        <p className={prose}>
          Corrections are welcome. Name the page, the disputed claim and a
          supporting source. A confirmed error is fixed everywhere it
          appears, charts included, and a substantial correction gets a new
          review date.
        </p>
        <p className="mt-4 font-sans text-sm leading-relaxed text-text-dim">
          <a
            data-brand-control-id="control:link-focus"
            href={CONTENT_CORRECTION_URL}
            target="_blank"
            rel="noopener"
            className={inlineLink}
          >
            Report a correction on GitHub
          </a>{' '}
          or see the{' '}
          <Link data-brand-control-id="control:link-focus" href="/credits/" className={inlineLink}>
            author and image credits
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
