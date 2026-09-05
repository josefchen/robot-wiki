import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteFooter } from '@/components/nav/site-footer';
import {
  AUTHOR_NAME,
  AUTHOR_PROFILE_URL,
  PUBLIC_IDENTITY,
  REPOSITORY_URL,
} from '@/lib/identity';

/**
 * The site footer (components/nav/site-footer.tsx): one quiet typographic
 * line naming the author and linking the source repository on every route
 * (VAL-DIST-006, VAL-DIST-007, VAL-DIST-009).
 */

/** The contract's source-destination test for the repository link name. */
const SOURCE_NAME_RE = /source|repo|repositor|github|code/i;
/** Em dash and en dash, banned in footer text. */
const DASHES = /[\u2013\u2014]/;

describe('SiteFooter', () => {
  it('renders exactly one footer element resolving as the contentinfo landmark', () => {
    const { container } = render(<SiteFooter />);
    expect(container.querySelectorAll('footer')).toHaveLength(1);
    expect(screen.getByRole('contentinfo')).toBeDefined();
  });

  /**
   * VAL-DESIGN-022: the footer renders the identity. It is an annotated
   * `shell-wordmark`, not a loose display string, because the identity
   * sweep discovers footer brand slots structurally and holds each to both
   * the registered role and the exact identity text.
   */
  it('closes the page with the annotated identity lockup linking home', () => {
    render(<SiteFooter />);
    const wordmark = screen.getByRole('link', { name: PUBLIC_IDENTITY });
    expect(wordmark).toHaveAttribute('href', '/');
    expect(wordmark.textContent).toBe(PUBLIC_IDENTITY);
    expect(wordmark).toHaveAttribute('data-tektur-role', 'shell-wordmark');
    expect(wordmark.className).toContain('font-display-shell');
    // The shared focus control, not a private ring.
    expect(wordmark).toHaveAttribute(
      'data-brand-control-id',
      'control:link-focus',
    );
    // Two current-route nodes on "/" is one too many; the sidebar lockup
    // owns that marking.
    expect(wordmark.getAttribute('aria-current')).toBeNull();
  });

  it('links the author name, verbatim, to the external profile', () => {
    render(<SiteFooter />);
    const profile = screen.getByRole('link', { name: AUTHOR_NAME });
    expect(profile).toHaveAttribute('href', AUTHOR_PROFILE_URL);
    expect(profile).toHaveAttribute('rel', 'noopener');
  });

  it('links the repository under an accessible name that reads as a source destination', () => {
    render(<SiteFooter />);
    const repo = screen.getByRole('link', { name: SOURCE_NAME_RE });
    expect(repo).toHaveAttribute('href', REPOSITORY_URL);
    expect(repo.getAttribute('href')).not.toContain('robot-wiki.com');
  });

  it('carries at least 20 visible characters and no em or en dash', () => {
    const { container } = render(<SiteFooter />);
    const text = container.querySelector('footer')?.textContent ?? '';
    const collapsed = text.replace(/\s+/g, ' ').trim();
    expect(collapsed.length).toBeGreaterThanOrEqual(20);
    expect(text).not.toMatch(DASHES);
  });
});
