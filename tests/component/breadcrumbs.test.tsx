import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Breadcrumbs,
  breadcrumbJsonLd,
  type BreadcrumbItem,
} from '@/components/article/breadcrumbs';

/**
 * The breadcrumb trail (components/article/breadcrumbs.tsx): Home > Domain >
 * Article on every published article, with BreadcrumbList structured data
 * (VAL-WIKI-016/017). The ancestor crumbs are real links; the current page
 * is the non-linked trailing crumb.
 */

// The visual trail uses the same trailing-slash hrefs as the BreadcrumbList
// structured data (consistency nit, rebrand-wiki scrutiny).
const ARTICLE_TRAIL: BreadcrumbItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Manipulation & Learned Policies', href: '/manipulation/' },
  { label: 'Action Chunking (ACT and ALOHA)' },
];

describe('Breadcrumbs', () => {
  it('renders a labeled navigation landmark with one item per crumb', () => {
    render(<Breadcrumbs items={ARTICLE_TRAIL} />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const list = within(nav).getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });

  it('links the ancestor crumbs and renders the current page as non-link text', () => {
    render(<Breadcrumbs items={ARTICLE_TRAIL} />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });

    const home = within(nav).getByRole('link', { name: 'Home' });
    expect(home).toHaveAttribute('href', '/');
    const domain = within(nav).getByRole('link', {
      name: 'Manipulation & Learned Policies',
    });
    // next/link strips the trailing slash when rendering the anchor in
    // dev/jsdom; the source href is '/manipulation/' (matching the
    // BreadcrumbList JSON-LD) and the static export keeps the slash, which
    // is what the e2e breadcrumb spec asserts.
    expect(domain).toHaveAttribute('href', '/manipulation');

    // The trailing crumb is plain text, never a link.
    expect(
      within(nav).queryByRole('link', {
        name: 'Action Chunking (ACT and ALOHA)',
      }),
    ).not.toBeInTheDocument();
    expect(within(nav).getByText('Action Chunking (ACT and ALOHA)')).toBeInTheDocument();
    expect(within(nav).getAllByRole('link')).toHaveLength(2);
  });

  it('keeps the separators decorative only', () => {
    const { container } = render(<Breadcrumbs items={ARTICLE_TRAIL} />);
    // Separators exist visually but are hidden from the accessibility tree,
    // so a screen reader hears the crumb labels only.
    const separators = container.querySelectorAll('[aria-hidden="true"]');
    expect(separators.length).toBeGreaterThanOrEqual(2);
    for (const sep of separators) {
      expect(sep.textContent).toBe('/');
    }
  });

  it('trails each separator after its crumb so a wrap never orphans it', () => {
    render(<Breadcrumbs items={ARTICLE_TRAIL} />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const items = within(nav).getAllByRole('listitem');
    // Each non-trailing <li> is "crumb /": the separator is the unit's LAST
    // element, so when the trail wraps at 375px the break can only fall
    // between units and the "/" can never begin a continuation line.
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe('Home/');
    expect(items[1].textContent).toBe('Manipulation & Learned Policies/');
    expect(items[2].textContent).toBe('Action Chunking (ACT and ALOHA)');
  });

  it('supports a two-level trail for the domain landing pages', () => {
    render(
      <Breadcrumbs
        items={[{ label: 'Home', href: '/' }, { label: 'World Models' }]}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getAllByRole('listitem')).toHaveLength(2);
    expect(
      within(nav).queryByRole('link', { name: 'World Models' }),
    ).not.toBeInTheDocument();
  });
});

describe('breadcrumbJsonLd', () => {
  it('emits a BreadcrumbList with absolute item URLs in trail order', () => {
    const json = JSON.parse(
      breadcrumbJsonLd([
        { label: 'Home', href: '/' },
        { label: 'Manipulation & Learned Policies', href: '/manipulation/' },
        {
          label: 'Action Chunking (ACT and ALOHA)',
          href: '/manipulation/action-chunking/',
        },
      ]),
    );
    expect(json['@context']).toBe('https://schema.org');
    expect(json['@type']).toBe('BreadcrumbList');
    expect(json.itemListElement).toHaveLength(3);
    expect(json.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://robot-wiki.com/',
    });
    expect(json.itemListElement[1].item).toBe(
      'https://robot-wiki.com/manipulation/',
    );
    expect(json.itemListElement[2].position).toBe(3);
    expect(json.itemListElement[2].name).toBe('Action Chunking (ACT and ALOHA)');
    expect(json.itemListElement[2].item).toBe(
      'https://robot-wiki.com/manipulation/action-chunking/',
    );
  });
});
