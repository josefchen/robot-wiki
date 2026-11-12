import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/article/breadcrumbs';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import { webPageJsonLd } from '@/lib/structured-data';
import {
  STANDALONE_SEO_DESCRIPTIONS,
  STANDALONE_SEO_TITLES,
} from '@/lib/seo';

const title = 'Privacy';

export const metadata: Metadata = {
  title: STANDALONE_SEO_TITLES.privacy,
  description: STANDALONE_SEO_DESCRIPTIONS.privacy,
  robots: { index: false, follow: true },
  openGraph: routeOpenGraph(title),
  twitter: routeTwitter(title),
};

const heading = 'section-h2';
const prose = 'mt-4 font-serif text-base leading-[1.62] text-text';

export default function PrivacyPage() {
  return (
    <article data-page-frame="frame:narrow" className="mx-auto w-full max-w-[calc(65ch+4rem)] px-6 py-12 md:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: webPageJsonLd({
            path: '/privacy/',
            name: title,
            description: STANDALONE_SEO_DESCRIPTIONS.privacy,
          }),
        }}
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: title }]} />
      <header data-pagefind-body>
        <h1 className="display-h1">
          Privacy
        </h1>
        <p className="mt-5 font-serif text-base leading-[1.62] text-text">
          Robot Wiki uses Vercel Web Analytics to see which pages are read
          and how readers find them. It measures anonymous, aggregate traffic
          only, with no advertising identifiers and no profile of you across
          sites.
        </p>
        <p className="mt-3 font-mono text-xs text-text-dim">
          Last updated August 24, 2026
        </p>
      </header>

      <section aria-labelledby="collected-heading" className="mt-16">
        <h2 id="collected-heading" className={heading}>
          What is measured
        </h2>
        <p className={prose}>
          Each page view records the page path, the referring site, an
          approximate region, the browser, operating system and device type,
          and the time. Query strings and fragments are removed before
          anything is sent, so what you type into site search is never
          recorded.
        </p>
      </section>

      <section aria-labelledby="excluded-heading" className="mt-16">
        <h2 id="excluded-heading" className={heading}>
          What is excluded
        </h2>
        <p className={prose}>
          No names, email addresses, account identifiers, search terms or
          form contents are sent. The site has no user accounts, advertising
          pixels or Google Analytics. Analytics is off on preview and local
          builds.
        </p>
      </section>

      <section aria-labelledby="purpose-heading" className="mt-16">
        <h2 id="purpose-heading" className={heading}>
          Purpose and questions
        </h2>
        <p className={prose}>
          The totals show which links into the site are broken and which
          articles to update first. They are never sold or used for
          advertising. Vercel processes them as the site&apos;s host and
          analytics provider.
        </p>
        <p className="mt-4 font-sans text-sm leading-relaxed text-text-dim">
          Questions go through the same channel as corrections; see the{' '}
          <Link
            data-brand-control-id="control:link-focus"
            href="/editorial-policy/"
            className="ink-link"
          >
            editorial policy
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
