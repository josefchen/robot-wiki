import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArticleHeader } from '@/components/article/article-header';
import type { ModuleRegistryEntry } from '@/data/schemas/module';

const entry: ModuleRegistryEntry = {
  domain: 'manipulation',
  slug: 'action-chunking',
  title: 'Action Chunking (ACT and ALOHA)',
  summary: 'Predicting action sequences instead of single steps.',
  order: 2,
  status: 'published',
};

function renderHeader(props?: {
  lastReviewed?: string;
  readingTimeMinutes?: number;
  citationCount?: number;
}) {
  return render(
    <ArticleHeader
      entry={entry}
      // `in` (not `??`) so callers can explicitly pass `undefined` and
      // exercise the absent-date branch.
      lastReviewed={props && 'lastReviewed' in props ? props.lastReviewed : '2026-08-08'}
      readingTimeMinutes={props?.readingTimeMinutes ?? 14}
      citationCount={props?.citationCount ?? 6}
    />,
  );
}

describe('ArticleHeader', () => {
  it('renders the title and summary, with the domain carried by the breadcrumb trail instead of an eyebrow', () => {
    renderHeader();
    expect(
      screen.getByRole('heading', { level: 1, name: entry.title }),
    ).toBeVisible();
    expect(screen.getByText(entry.summary)).toBeVisible();
    // The breadcrumb trail above the header names the domain, so the
    // header does not repeat it (the eyebrow was removed with the
    // breadcrumb feature).
    expect(
      screen.queryByText('Manipulation & Learned Policies'),
    ).not.toBeInTheDocument();
  });

  it('formats the last-reviewed date unambiguously and keeps the ISO value machine-readable', () => {
    const { container } = renderHeader({ lastReviewed: '2026-08-08' });
    expect(screen.getByText('8 August 2026')).toBeVisible();

    // The displayed form is never numeric-only.
    expect(container.textContent ?? '').not.toMatch(
      /\d{1,4}[\/.]\d{1,2}[\/.]\d{1,4}/,
    );

    // The raw ISO value stays attached for machine reconciliation, on a
    // semantic <time> element.
    const time = container.querySelector('header time');
    expect(time).not.toBeNull();
    expect(time?.getAttribute('datetime')).toBe('2026-08-08');
    const dateSlot = container.querySelector('[data-header-last-reviewed]');
    expect(dateSlot?.getAttribute('data-header-last-reviewed')).toBe(
      '2026-08-08',
    );
  });

  // Owner-approved successor (Josef, 2026-10-10, the Pantheon standard): the
  // monospace <dl> of labelled values became one muted meta line,
  // "Updated 8 August 2026 · 14 min read · 6 sources", with the source count
  // linked to the References list. The values and their data hooks are
  // unchanged.
  it('shows the derived reading time and citation count', () => {
    const { container } = renderHeader({
      readingTimeMinutes: 14,
      citationCount: 6,
    });
    expect(screen.getByText('14 min read')).toBeVisible();
    const sources = screen.getByRole('link', { name: '6 sources' });
    expect(sources).toBeVisible();
    expect(sources).toHaveAttribute('href', '#references-heading');
    expect(
      container.querySelector('[data-header-reading-minutes]')?.textContent,
    ).toContain('14');
    expect(
      container
        .querySelector('[data-header-citation-count]')
        ?.getAttribute('data-header-citation-count'),
    ).toBe('6');
  });

  it('names a single source in the singular', () => {
    renderHeader({ citationCount: 1 });
    expect(screen.getByRole('link', { name: '1 source' })).toBeVisible();
  });

  it('keeps the metadata quiet: one muted meta line, no badges', () => {
    const { container } = renderHeader();
    const meta = container.querySelector('header [data-article-meta]');
    expect(meta).not.toBeNull();
    expect(meta?.tagName).toBe('P');
    expect(meta?.className).toContain('meta-line');
    // Quiet metadata, not badges: no Badge primitives, no emoji, no images.
    expect(meta?.querySelectorAll('img, svg')).toHaveLength(0);
    expect(meta?.textContent ?? '').not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    expect(meta?.textContent).toBe('Updated 8 August 2026 · 14 min read · 6 sources');
  });

  it('omits only the date item when lastReviewed is absent', () => {
    const { container } = renderHeader({ lastReviewed: undefined });
    expect(container.querySelector('[data-header-last-reviewed]')).toBeNull();
    expect(screen.getByText('14 min read')).toBeVisible();
    expect(
      container.querySelector('header [data-article-meta]')?.textContent,
    ).toBe('14 min read · 6 sources');
  });
});
