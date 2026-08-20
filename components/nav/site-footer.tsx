import {
  AUTHOR_NAME,
  AUTHOR_PROFILE_URL,
  REPOSITORY_URL,
} from '@/lib/identity';

/**
 * Site footer (VAL-DIST-006/007/009): one quiet typographic line naming
 * the author and linking the source repository, rendered on every route
 * by the shell, outside <main> and <aside> so it resolves as a
 * contentinfo landmark.
 *
 * Deliberately not a link farm. The sidebar already navigates the
 * taxonomy and the page above already says what the page is, so the
 * footer states only what no other chrome does: who made this and where
 * the source lives. The author name is an anchor to the external profile
 * (VAL-DIST-009 clause c); the repository link's accessible name reads as
 * a source destination, not an icon.
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
      <p className="mx-auto w-full max-w-[65ch] px-6 py-8 font-sans text-sm leading-relaxed text-text-dim">
        Written and maintained by{' '}
        <a
          href={AUTHOR_PROFILE_URL}
          target="_blank"
          rel="noopener"
          className={externalLink}
        >
          {AUTHOR_NAME}
        </a>
        .{' '}
        <a
          href={REPOSITORY_URL}
          target="_blank"
          rel="noopener"
          className={externalLink}
        >
          Source on GitHub
        </a>
        .
      </p>
    </footer>
  );
}
