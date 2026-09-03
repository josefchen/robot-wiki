import Link from 'next/link';
import { SITE_URL } from '@/lib/site';

/**
 * The breadcrumb trail (architecture.md section 6b): Home > Domain > Article
 * on every published article, Home > Domain on each domain landing page,
 * rendered by the shared templates, never hand-written in MDX
 *
 * The ancestor crumbs are real links; the current page is the non-linked
 * trailing crumb. The trail is its own labeled navigation landmark,
 * distinct from the taxonomy nav. The trailing crumb carries
 * no aria-current on purpose: the sidebar's active entry already holds the
 * document's single aria-current="page", and the non-link
 * final item in a breadcrumb list is the equivalent current-page marker
 * the W3C APG breadcrumb pattern prescribes.
 */

export type BreadcrumbItem = {
  label: string;
  /**
   * Route path ("/", "/manipulation"). Absent on the trailing crumb, which
   * renders as plain text instead of a link.
   */
  href?: string;
};

export function Breadcrumbs({ items }: { items: readonly BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" data-pagefind-ignore className="mb-8">
      <ol className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-sans text-[13px] leading-snug">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            // The separator TRAILS its crumb inside the same <li>: the
            // wrapping <ol> can only break between <li> units, so the "/"
            // can never be orphaned at the start of a continuation line
            // at 375px. The trailing crumb carries no separator and its
            // title text still wraps normally.
            <li
              key={`${item.label}-${index}`}
              className="flex items-baseline gap-2"
            >
              {item.href && !last ? (
                <Link
                  href={item.href}
                  data-brand-control-id="control:link-focus"
                  className="text-text-dim transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-text">{item.label}</span>
              )}
              {!last ? (
                <span aria-hidden="true" className="text-text-dim">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * BreadcrumbList structured data for the trail, as a JSON string ready for a
 * <script type="application/ld+json"> tag. Every crumb (the current page
 * included) carries an absolute item URL on the canonical origin.
 */
export function breadcrumbJsonLd(
  items: ReadonlyArray<{ label: string; href: string }>,
): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: `${SITE_URL}${item.href}`,
    })),
  });
}
