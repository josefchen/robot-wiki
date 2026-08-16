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
    expect(screen.getByRole('listitem').getAttribute('id')).toBe(
      'ref-act-aloha-2023',
    );
  });

  it('marks declared-but-not-inline entries as further reading', () => {
    renderResolved(['act-aloha-2023', 'mobile-aloha-2024'], ['act-aloha-2023']);
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).queryByText('Further reading')).toBeNull();
    expect(within(items[1]).getByText('Further reading')).toBeVisible();
  });

  it('renders nothing for an empty citation list', () => {
    const { container } = render(<References entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
