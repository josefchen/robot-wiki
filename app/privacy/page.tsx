import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/article/breadcrumbs';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import { STANDALONE_SEO_TITLES } from '@/lib/seo';

const title = 'Privacy';

export const metadata: Metadata = {
  title: STANDALONE_SEO_TITLES.privacy,
  description:
    'What anonymous traffic information Robot Wiki measures, why it is collected, and what is deliberately excluded.',
  robots: { index: false, follow: true },
  openGraph: routeOpenGraph(title),
  twitter: routeTwitter(title),
};

const heading = 'font-sans text-xl font-semibold tracking-tight text-text';
const prose = 'mt-4 font-serif text-[1.0625rem] leading-relaxed text-text';

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-[65ch] px-6 py-12">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: title }]} />
      <header data-pagefind-body>
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-text">
          Privacy
        </h1>
        <p className="mt-5 font-serif text-[1.0625rem] leading-relaxed text-text">
          Robot Wiki uses Vercel Web Analytics to understand which pages are
          useful and how readers find them. The integration is limited to
          anonymous, aggregate traffic measurement. It does not use advertising
          identifiers or add a cross-site profile.
        </p>
        <p className="mt-3 font-mono text-xs text-text-dim">
          Last updated 24 August 2026
        </p>
      </header>

      <section aria-labelledby="collected-heading" className="mt-12">
        <h2 id="collected-heading" className={heading}>
          What is measured
        </h2>
        <p className={prose}>
          The service records page views, the page path, referral source,
          approximate region, browser, operating system, device category, and
          event time. Robot Wiki removes query strings and fragments before an
          event is sent. This means text entered into site search is not
          transmitted as analytics data.
        </p>
      </section>

      <section aria-labelledby="excluded-heading" className="mt-12">
        <h2 id="excluded-heading" className={heading}>
          What is excluded
        </h2>
        <p className={prose}>
          Robot Wiki does not send names, email addresses, account identifiers,
          internal search phrases, form contents, or full query-string URLs.
          There are no user accounts, advertising pixels, or Google Analytics
          tags on the site. Analytics is disabled on preview and local
          deployments.
        </p>
      </section>

      <section aria-labelledby="purpose-heading" className="mt-12">
        <h2 id="purpose-heading" className={heading}>
          Purpose and questions
        </h2>
        <p className={prose}>
          Aggregate data is used to find broken entry paths, prioritize article
          updates, and evaluate whether search and distribution work reaches the
          intended robotics audience. It is not sold or used for advertising.
          Vercel processes the measurements as the hosting and analytics
          provider.
        </p>
        <p className="mt-4 font-sans text-sm leading-relaxed text-text-dim">
          Questions or correction requests can be raised through the{' '}
          <Link
            href="/editorial-policy/"
            className="text-accent underline decoration-border-strong underline-offset-2 hover:decoration-accent"
          >
            editorial and corrections policy
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
