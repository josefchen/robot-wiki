import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LinkedFrom, SeeAlso } from '@/components/article/article-links';
import type { ArticleLinkEntry } from '@/lib/backlinks';

const entries: ArticleLinkEntry[] = [
  {
    key: 'manipulation/bc-foundations',
    href: '/manipulation/bc-foundations',
    title: 'Behavior Cloning Foundations',
    summary: 'Covariate shift, compounding error, and the DAgger fix.',
  },
  {
    key: 'manipulation/diffusion-policy',
    href: '/manipulation/diffusion-policy',
    title: 'Diffusion Policy',
    summary: 'Visuomotor control as conditional denoising over action sequences.',
  },
];

describe('SeeAlso', () => {
  it('renders a See also heading and one linked entry per target', () => {
    render(<SeeAlso entries={entries} />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'See also' }),
    ).toBeVisible();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    for (let i = 0; i < entries.length; i += 1) {
      const item = items[i];
      expect(item.getAttribute('data-article-key')).toBe(entries[i].key);
      const link = within(item).getByRole('link', { name: entries[i].title });
      expect(link).toHaveAttribute('href', entries[i].href);
      // The entry shows the target's summary too, not just the title.
      expect(within(item).getByText(entries[i].summary)).toBeVisible();
    }
  });

  it('renders nothing when the article declares no seeAlso', () => {
    const { container } = render(<SeeAlso entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('LinkedFrom', () => {
  it('renders a Linked from heading and one linked entry per source', () => {
    render(<LinkedFrom entries={entries} />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Linked from' }),
    ).toBeVisible();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    for (let i = 0; i < entries.length; i += 1) {
      const link = within(items[i]).getByRole('link', {
        name: entries[i].title,
      });
      expect(link).toHaveAttribute('href', entries[i].href);
    }
  });

  it('renders nothing for an article with no inbound links', () => {
    // The honest state for zero backlinks is no section at all: no bare
    // heading, no empty list, no apologetic placeholder (VAL-WIKI-012).
    const { container } = render(<LinkedFrom entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
