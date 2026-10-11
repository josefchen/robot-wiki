import { IntentLink } from '@/components/ui/intent-link';
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

/**
 * The trail as the masthead eyebrow: the uppercase, tracked, muted line
 * above the title. The top bar already names the site and the H1 already
 * names the page, so the eyebrow carries the ancestors in between, as
 * links; the full trail stays in the BreadcrumbList structured data.
 */
function EyebrowTrail({ items }: { items: readonly BreadcrumbItem[] }) {
  const linked = items.filter((item, index) => item.href && index < items.length - 1);
  // Past the site root where the trail has more to say; the root alone
  // (a top-level page) when it does not.
  const deeper = linked.filter((item) => item.href !== '/');
  const ancestors = deeper.length > 0 ? deeper : linked;
  if (ancestors.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" data-pagefind-ignore className="eyebrow">
      <ol className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {ancestors.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-baseline gap-2">
            <IntentLink href={item.href!} data-brand-control-id="control:link-focus">
              {item.label}
            </IntentLink>
            {index < ancestors.length - 1 ? <span aria-hidden="true">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Breadcrumbs({
  items,
  variant = 'trail',
}: {
  items: readonly BreadcrumbItem[];
  variant?: 'trail' | 'eyebrow';
}) {
  if (variant === 'eyebrow') return <EyebrowTrail items={items} />;
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
                <IntentLink
                  href={item.href}
                  data-brand-control-id="control:link-focus"
                  // The underline is the non-colour cue design-system 4.4
                  // requires: without it an ancestor crumb differs from the
                  // non-link current crumb by hue alone.
                  className="text-text-dim underline decoration-border-strong decoration-1 underline-offset-[3px] transition-colors hover:text-text hover:decoration-text"
                >
                  {item.label}
                </IntentLink>
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
