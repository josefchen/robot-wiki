import type { Metadata } from 'next';
import { PageHeader } from '@/components/data-page/page-header';
import { IntentLink } from '@/components/ui/intent-link';
import { CHANGES_PATH, CHANGES_TITLE, changeRows, changesAreIndexable } from '@/lib/changes-page';
import { readableDate } from '@/lib/home-updates';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import { routeSeoProfile } from '@/lib/seo-profiles';
import { materialAttributes } from '@/lib/site-materials';
import { webPageJsonLd } from '@/lib/structured-data';

const profile = routeSeoProfile(CHANGES_PATH);

const indexable = changesAreIndexable();

export const metadata: Metadata = {
  title: profile.title,
  description: profile.description,
  robots: {
    index: indexable,
    follow: true,
    googleBot: { index: indexable, follow: true },
  },
  // Full card blocks restated: a route-level object replaces the layout's
  // for the same key. og:title is the rendered h1.
  openGraph: routeOpenGraph(CHANGES_TITLE),
  twitter: routeTwitter(CHANGES_TITLE),
};

/**
 * Every editor's note on what changed in an article, newest first: the day,
 * the article as a link, the note.
 */
export default function ChangesPage() {
  const rows = changeRows();
  return (
    <div className="sheet sheet-masthead pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: webPageJsonLd({ path: CHANGES_PATH, name: CHANGES_TITLE, description: profile.description }),
        }}
      />
      {/* Search indexes the header only: a query for an article's title
          should return the article, not this list. */}
      <div data-pagefind-body {...materialAttributes('paper')} className="material-paper">
        <PageHeader
          title={CHANGES_TITLE}
          lead="What changed in the wiki, newest first, with a link to each page"
        />
      </div>

      <ol data-changes className="mt-16 list-none border-t border-text">
        {rows.map((row) => (
          <li
            key={row.id}
            data-change={row.id}
            className="grid grid-cols-1 gap-y-0.5 border-b border-border py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-baseline"
          >
            <time dateTime={row.date} className="whitespace-nowrap font-mono text-[13px] tabular-nums text-text-dim">
              {readableDate(row.date)}
            </time>
            <p className="font-sans text-[16px] leading-[1.5] text-text">
              <IntentLink
                href={row.href}
                data-brand-control-id="control:link-focus"
                className="ink-link font-medium"
              >
                {row.title}
              </IntentLink>
              {row.titleEnd} {row.note}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
