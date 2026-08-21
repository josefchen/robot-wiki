import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AUTHORS_SHOWN, AuthorList } from '@/components/article/author-list';
import { getCitation } from '@/data/citations';

const worstCase = getCitation('pi07-2026');
if (!worstCase) throw new Error('registry fixture pi07-2026 missing');

/** The marker pattern VAL-WIKI-029 clause (a) requires. */
const ELISION = /\b(\+|and)\s*(\d+)\s+(more|others|authors)\b/i;

function names(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Author ${i + 1}`);
}

function renderedNames(): string {
  return document.querySelector('[data-author-names]')?.textContent ?? '';
}

describe('AuthorList', () => {
  it('renders every name and no marker at the bound', () => {
    render(<AuthorList authors={names(AUTHORS_SHOWN)} />);
    expect(renderedNames()).toBe(names(AUTHORS_SHOWN).join(', '));
    expect(renderedNames()).not.toMatch(ELISION);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('elides past the bound and states how many are not shown', () => {
    render(<AuthorList authors={worstCase.authors} />);
    const text = renderedNames();
    const match = ELISION.exec(text);
    expect(match).not.toBeNull();
    // The number the marker states is the registry count minus the rendered
    // count, so the reader can tell how much is missing.
    expect(Number(match?.[2])).toBe(worstCase.authors.length - AUTHORS_SHOWN);
  });

  it('never renders more than the bound in the truncated state', () => {
    render(<AuthorList authors={worstCase.authors} />);
    const shown = worstCase.authors.filter((a) => renderedNames().includes(a));
    expect(shown).toHaveLength(AUTHORS_SHOWN);
    expect(shown).toEqual(worstCase.authors.slice(0, AUTHORS_SHOWN));
  });

  it('reveals the full registry list in registry order on demand', async () => {
    const user = userEvent.setup();
    render(<AuthorList authors={worstCase.authors} />);
    const expand = screen.getByRole('button', {
      name: `Show all ${worstCase.authors.length} authors`,
    });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    await user.click(expand);
    expect(renderedNames()).toBe(worstCase.authors.join(', '));
    expect(
      screen.getByRole('button', { name: `Show ${AUTHORS_SHOWN} authors` }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapses back to the truncated line', async () => {
    const user = userEvent.setup();
    render(<AuthorList authors={worstCase.authors} />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('button'));
    expect(renderedNames()).toMatch(ELISION);
  });

  it('always keeps the first author, so the entry stays citable', () => {
    render(<AuthorList authors={worstCase.authors} />);
    expect(renderedNames().startsWith(worstCase.authors[0])).toBe(true);
  });

  it('invents no name in either state', async () => {
    const user = userEvent.setup();
    render(<AuthorList authors={worstCase.authors} />);
    const truncated = renderedNames().replace(
      /,\s*and\s*\d+\s+more authors$/i,
      '',
    );
    for (const part of truncated.split(', ').filter(Boolean)) {
      expect(worstCase.authors).toContain(part.trim());
    }
    await user.click(screen.getByRole('button'));
    for (const part of renderedNames().split(', ')) {
      expect(worstCase.authors).toContain(part.trim());
    }
  });
});
