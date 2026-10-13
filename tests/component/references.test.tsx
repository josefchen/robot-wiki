import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { References } from '@/components/article/references';
import { getCitation } from '@/data/citations';
import { resolveReferences } from '@/lib/references';

const act = getCitation('act-aloha-2023');
const dagger = getCitation('dagger-2011');
const mobileAloha = getCitation('mobile-aloha-2024');

if (!act || !dagger || !mobileAloha) {
  throw new Error('registry fixtures missing');
}

function renderResolved(declared: string[], inline: string[]) {
  return render(
    <References entries={resolveReferences(declared, inline, getCitation)} />,
  );
}

describe('References', () => {
  it('renders a References heading and one entry per declared citation', () => {
    renderResolved(
      ['act-aloha-2023', 'dagger-2011', 'mobile-aloha-2024'],
      ['act-aloha-2023', 'dagger-2011', 'mobile-aloha-2024'],
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'References' }),
    ).toBeVisible();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });

  it('keeps the deterministic frontmatter declaration order', () => {
    renderResolved(
      ['mobile-aloha-2024', 'act-aloha-2023', 'dagger-2011'],
      ['mobile-aloha-2024', 'act-aloha-2023', 'dagger-2011'],
    );
    const ids = screen
      .getAllByRole('listitem')
      .map((li) => li.getAttribute('data-reference-id'));
    expect(ids).toEqual(['mobile-aloha-2024', 'act-aloha-2023', 'dagger-2011']);
  });

  it('shows title, full author list, year, venue and an external primary-source link', () => {
    renderResolved(['dagger-2011'], ['dagger-2011']);
    const item = screen.getByRole('listitem');

    const titleLink = within(item).getByRole('link', {
      name: dagger.title,
    });
    expect(titleLink).toHaveAttribute('href', dagger.url);
    expect(titleLink).toHaveAttribute('target', '_blank');
    expect(titleLink.getAttribute('rel') ?? '').toContain('noopener');

    // Full author list (long form), venue and year: the meta line is the
    // registry data verbatim, in full, with nothing added. dagger-2011's
    // venue ("AISTATS 2011") already states the year, so the year renders
    // once rather than as "AISTATS 2011, 2011.".
    const [meta, url] = within(item).getAllByRole('paragraph');
    expect(meta.textContent).toBe(
      `${dagger.authors.join(', ')}, ${dagger.venue}.`,
    );
    expect(url.textContent).toBe(dagger.url);
  });

  it('omits the venue when the registry has none, instead of inventing one', () => {
    // mobile-aloha-2024 carries no venue in the registry: the meta line
    // renders authors and year only, with no fabricated venue.
    renderResolved(['mobile-aloha-2024'], ['mobile-aloha-2024']);
    const item = screen.getByRole('listitem');
    const [meta] = within(item).getAllByRole('paragraph');
    expect(meta.textContent).toBe(
      `${mobileAloha.authors.join(', ')}, ${mobileAloha.year}.`,
    );
  });

  it('anchors each entry at #ref-<id> so chips can jump to it', () => {
    renderResolved(['act-aloha-2023'], ['act-aloha-2023']);
    expect(
      screen.getByRole('listitem').getAttribute('id'),
    ).toBe('ref-act-aloha-2023');
  });

  // Successor (2026-10-13, drift repair under library/design-system.md, "no
  // repeated eyebrow clutter"): the uncited entries sit under one
  // sentence-case "Further reading" heading instead of each carrying a
  // tracked-capitals badge. Same strength: every declared-but-not-inline
  // entry is still marked, and no cited entry is.
  it('lists declared-but-not-inline entries under one Further reading heading', () => {
    renderResolved(
      ['mobile-aloha-2024', 'act-aloha-2023', 'dagger-2011'],
      ['act-aloha-2023'],
    );
    const headings = screen.getAllByRole('heading', {
      level: 3,
      name: 'Further reading',
    });
    expect(headings).toHaveLength(1);
    const [heading] = headings;
    expect(heading).toBeVisible();
    expect(heading.textContent).toBe('Further reading');

    // Cited entries print first; the uncited ones follow the heading in
    // frontmatter order, in the list right after it.
    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.getAttribute('data-reference-id'))).toEqual([
      'act-aloha-2023',
      'mobile-aloha-2024',
      'dagger-2011',
    ]);
    const furtherList = heading.nextElementSibling;
    expect(furtherList?.tagName).toBe('OL');
    expect(
      within(furtherList as HTMLElement)
        .getAllByRole('listitem')
        .map((li) => li.getAttribute('data-reference-id')),
    ).toEqual(['mobile-aloha-2024', 'dagger-2011']);
    for (const item of items) {
      const further = item.getAttribute('data-reference-id') !== 'act-aloha-2023';
      expect(item.getAttribute('data-further-reading')).toBe(String(further));
      expect(
        item.compareDocumentPosition(heading) &
          Node.DOCUMENT_POSITION_PRECEDING,
        `${item.getAttribute('data-reference-id')} sits ${further ? 'after' : 'before'} the heading`,
      ).toBe(further ? Node.DOCUMENT_POSITION_PRECEDING : 0);
      // The marker is the heading, not a word repeated on each entry.
      expect(within(item).queryByText('Further reading')).toBeNull();
    }
  });

  it('numbers the further-reading entries on from the cited ones', () => {
    renderResolved(
      ['mobile-aloha-2024', 'act-aloha-2023', 'dagger-2011'],
      ['act-aloha-2023', 'dagger-2011'],
    );
    const numbers = screen
      .getAllByRole('listitem')
      .map((li) => li.querySelector('[aria-hidden="true"]')?.textContent);
    expect(numbers).toEqual(['1', '2', '3']);
    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(2);
    expect(lists[1]).toHaveAttribute('start', '3');
  });

  it('renders no Further reading heading when every entry is cited inline', () => {
    renderResolved(
      ['act-aloha-2023', 'mobile-aloha-2024'],
      ['mobile-aloha-2024', 'act-aloha-2023'],
    );
    expect(screen.queryByRole('heading', { name: 'Further reading' })).toBeNull();
    expect(screen.queryByText('Further reading')).toBeNull();
    expect(screen.getAllByRole('list')).toHaveLength(1);
  });

  it('renders nothing for an empty citation list', () => {
    const { container } = render(<References entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
