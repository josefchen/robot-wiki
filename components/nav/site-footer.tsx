import Link from 'next/link';
import { BrandDevice } from '@/components/ui/brand-device';
import { IntentLink } from '@/components/ui/intent-link';
import {
  AUTHOR_NAME,
  AUTHOR_PROFILE_URL,
  PUBLIC_IDENTITY,
  REPOSITORY_URL,
} from '@/lib/identity';

/**
 * Site footer (VAL-DIST-006/007/009): the closing identity lockup over one
 * quiet typographic line naming the author and linking the source
 * repository, rendered on every route by the shell, outside <main> and
 * <aside> so it resolves as a contentinfo landmark.
 *
 * The lockup is the same registered `shell-wordmark` role the header,
 * sidebar and drawer carry, at the chrome size rather than the home
 * display size: the reference board closes a sheet on the identity, and
 * VAL-DESIGN-022 requires the footer to render it. It is the navigation
 * item for "/", so it takes the shared focus control rather than a private
 * treatment. It carries no aria-current: the top bar lockup already marks
 * the current route, and a second marked "/" would put two current-route
 * nodes on the home page.
 *
 * Deliberately not a link farm. The "Articles" panel navigates the
 * taxonomy and the page above already says what the page is, so the
 * footer carries one quiet row of index routes and otherwise states only
 * what no other chrome does: whose site this is, who made it and where
 * the source lives. The author name is an anchor to the
 * external profile (VAL-DIST-009 clause c); the repository link's
 * accessible name reads as a source destination, not an icon.
 */

const externalLink =
  'text-text-dim underline decoration-border-strong decoration-1 underline-offset-[3px] transition-colors hover:text-text hover:decoration-text';

/**
 * The secondary destinations the top bar does not carry. With the taxonomy
 * moved into the "Articles" panel, these are the routes a reader would
 * otherwise reach only through that panel.
 */
const INDEX_LINKS = [
  { href: '/a-z/', label: 'A-Z index' },
  { href: '/glossary/', label: 'Glossary' },
  { href: '/search/', label: 'Search' },
  { href: '/market-map/', label: 'Market map' },
  { href: '/playground/', label: 'Playground' },
  { href: '/credits/', label: 'Credits' },
] as const;

export function SiteFooter({ inert = false }: { inert?: boolean }) {
  return (
    <footer
      inert={inert}
      data-pagefind-ignore
      data-site-footer
      className="relative mt-24 pt-px"
    >
      {/* The closing rail every route shares (VAL-B2-GRID-002): the same
          1px hairline the footer always drew, registered as the section
          rule it is and anchored to the footer's own top edge, so home,
          discovery, the market map and the playground each carry one
          purposeful, aligned, pointer-inert rail at every width. */}
      <BrandDevice
        device="section-rule"
        anchorSelector="[data-site-footer]"
        deviceEdge="top"
        anchorEdge="top"
        owner="components/nav/site-footer.tsx"
        className="inset-x-0 top-0"
      />
      <div className="mx-auto w-full max-w-[calc(960px+2*var(--article-gutter))] px-[var(--article-gutter)] pt-8 pb-14">
        {/* The lockup keeps its own block. The identity sweep reads a
            lockup's siblings as its descriptor surfaces, and the credit
            sentence below is a separate statement rather than a descriptor:
            design-system 3.5 omits the descriptor from every chrome
            lockup, and the home hero owns the only one. */}
        <div>
          <Link
            href="/"
            data-tektur-role="shell-wordmark"
            data-brand-control-id="control:link-focus"
            className="inline-block font-display-shell text-[15px] tracking-[-0.01em] text-text transition-colors hover:text-text-dim"
          >
            {PUBLIC_IDENTITY}
          </Link>
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-sans text-[13.5px] leading-snug">
          {INDEX_LINKS.map((entry) => (
            <li key={entry.href}>
              <IntentLink
                href={entry.href}
                data-brand-control-id="control:link-focus"
                className="quiet-link"
              >
                {entry.label}
              </IntentLink>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-sans text-[13px] leading-relaxed text-text-dim">
          Written and maintained by{' '}
          <a
            href={AUTHOR_PROFILE_URL}
            target="_blank"
            rel="noopener"
            data-brand-control-id="control:link-focus"
            className={externalLink}
          >
            {AUTHOR_NAME}
          </a>
          .{' '}
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener"
            data-brand-control-id="control:link-focus"
            className={externalLink}
          >
            Source on GitHub
          </a>
          .{' '}
          <IntentLink
            href="/about/"
            data-brand-control-id="control:link-focus"
            className={externalLink}
          >
            About
          </IntentLink>
          .{' '}
          <IntentLink
            href="/editorial-policy/"
            data-brand-control-id="control:link-focus"
            className={externalLink}
          >
            Editorial policy
          </IntentLink>
          .{' '}
          <IntentLink
            href="/privacy/"
            data-brand-control-id="control:link-focus"
            className={externalLink}
          >
            Privacy
          </IntentLink>
          .
        </p>
      </div>
    </footer>
  );
}
