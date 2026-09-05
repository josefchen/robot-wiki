import Link from 'next/link';
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
 * treatment. It carries no aria-current: the sidebar lockup already marks
 * the current route, and a second marked "/" would put two current-route
 * nodes on the home page.
 *
 * Deliberately not a link farm. The sidebar already navigates the
 * taxonomy and the page above already says what the page is, so the
 * footer states only what no other chrome does: whose site this is, who
 * made it and where the source lives. The author name is an anchor to the
 * external profile (VAL-DIST-009 clause c); the repository link's
 * accessible name reads as a source destination, not an icon.
 */

const externalLink =
  'text-text underline decoration-border-strong underline-offset-2 transition-colors hover:text-accent hover:decoration-accent';

export function SiteFooter({ inert = false }: { inert?: boolean }) {
  return (
    <footer
      inert={inert}
      data-pagefind-ignore
      className="border-t border-border"
    >
      <div className="mx-auto w-full max-w-[65ch] px-6 py-8">
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
            className="inline-block rounded-sm font-display-shell text-[15px] tracking-[-0.02em] text-text"
          >
            {PUBLIC_IDENTITY}
          </Link>
        </div>
        <p className="mt-2 font-sans text-sm leading-relaxed text-text-dim">
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
          .
        </p>
      </div>
    </footer>
  );
}
