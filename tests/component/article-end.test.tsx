import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArticleEnd } from '@/components/article/article-end';
import { domainSequence } from '@/lib/article-sequence';
import { REPOSITORY_URL } from '@/lib/identity';
import { SITE_URL } from '@/lib/site';

const sequence = domainSequence('manipulation');
const first = sequence[0];
const middle = sequence[2];
const last = sequence.at(-1)!;

/** next/link and jsdom disagree about trailing slashes; the path is what matters. */
const path = (href: string | null) => (href ?? '').replace(/\/$/, '');

function linkNames(container: HTMLElement): string[] {
  return [...container.querySelectorAll('a')].map((a) => a.textContent ?? '');
}

describe('ArticleEnd', () => {
  it('links the previous and the next article by title, in a labelled nav', () => {
    const { container } = render(<ArticleEnd entry={middle} />);
    const nav = screen.getByRole('navigation', { name: 'Previous and next article' });
    const items = within(nav).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      `Previous${sequence[1].title}`,
      `Next${sequence[3].title}`,
    ]);

    const previous = within(items[0]).getByRole('link', { name: sequence[1].title });
    expect(path(previous.getAttribute('href'))).toBe(`/manipulation/${sequence[1].slug}`);
    expect(previous).toHaveAttribute('rel', 'prev');
    const next = within(items[1]).getByRole('link', { name: sequence[3].title });
    expect(path(next.getAttribute('href'))).toBe(`/manipulation/${sequence[3].slug}`);
    expect(next).toHaveAttribute('rel', 'next');

    // Reading order: the neighbours, then the two ways to change the page.
    expect(linkNames(container)).toEqual([
      sequence[1].title,
      sequence[3].title,
      'Improve this page',
      'Report an error',
    ]);
  });

  it('gives the first article of a domain a next and no previous', () => {
    const { container } = render(<ArticleEnd entry={first} />);
    const nav = screen.getByRole('navigation', { name: 'Previous and next article' });
    expect(within(nav).getAllByRole('listitem')).toHaveLength(1);
    expect(nav.textContent).toBe(`Next${sequence[1].title}`);
    expect(container.querySelector('a[rel="prev"]')).toBeNull();
  });

  it('gives the last article of a domain a previous and no next', () => {
    const { container } = render(<ArticleEnd entry={last} />);
    const nav = screen.getByRole('navigation', { name: 'Previous and next article' });
    expect(within(nav).getAllByRole('listitem')).toHaveLength(1);
    expect(nav.textContent).toBe(`Previous${sequence.at(-2)!.title}`);
    expect(container.querySelector('a[rel="next"]')).toBeNull();
  });

  it('closes on one line of two text links to the source file and the correction form', () => {
    const { container } = render(<ArticleEnd entry={middle} />);
    const line = container.querySelector('[data-article-end] > p')!;
    expect(line.textContent).toBe('Improve this page · Report an error');
    expect(line.querySelector('button, svg, img')).toBeNull();

    const improve = within(line as HTMLElement).getByRole('link', {
      name: 'Improve this page',
    });
    expect(improve).toHaveAttribute(
      'href',
      `${REPOSITORY_URL}/edit/main/content/manipulation/${middle.slug}.mdx`,
    );

    const report = within(line as HTMLElement).getByRole('link', {
      name: 'Report an error',
    });
    const url = new URL(report.getAttribute('href')!);
    expect(`${url.origin}${url.pathname}`).toBe(`${REPOSITORY_URL}/issues/new`);
    expect(url.searchParams.get('template')).toBe('content-correction.yml');
    expect(url.searchParams.get('title')).toBe(`content correction: ${middle.title}`);
    expect(url.searchParams.get('page')).toBe(
      `${SITE_URL}/manipulation/${middle.slug}/`,
    );

    for (const link of [improve, report]) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener');
    }
  });

  it('says nothing beyond the four labels and the two titles', () => {
    const { container } = render(<ArticleEnd entry={middle} />);
    expect(container.textContent).toBe(
      `Previous${sequence[1].title}Next${sequence[3].title}Improve this page · Report an error`,
    );
  });
});
