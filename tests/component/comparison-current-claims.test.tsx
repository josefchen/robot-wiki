import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ComparisonMatrix } from '@/components/interactive/comparison-matrix';
import { METHODS } from '@/data/methods';
import { getCitation } from '@/data/citations';
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('ComparisonMatrix');

const article = readFileSync('content/manipulation/comparison-matrix.mdx', 'utf8');
const parsed = matter(article);

describe('comparison current claim corrections', () => {
  it('renders FAST DROID execution as a discrete set with its measured setting', () => {
    render(<ComparisonMatrix />);
    const row = screen.getByRole('row', { name: /^π0-FAST / });
    expect(row).toHaveTextContent('15 / {8, 15}');
    expect(row).toHaveTextContent('15 Hz');
    expect(row).toHaveTextContent('DROID setup');
    expect(row).toHaveTextContent('750 ms');
    expect(within(row).getAllByRole('link')).toHaveLength(2);
  });
  it('mounts the exact registered sources for every method without substituting another model', () => {
    render(<ComparisonMatrix />);
    expect(screen.getByRole('columnheader', { name: 'Sources' })).toBeInTheDocument();
    for (const method of METHODS) {
      const row = screen.getByRole('row', { name: new RegExp(`^${method.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `) });
      const links = within(row).getAllByRole('link');
      expect(links.map(link => link.getAttribute('href'))).toEqual(
        method.sources.map(id => getCitation(id)!.url),
      );
      for (const link of links) {
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        expect(link.textContent!.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('declares the exact mounted-method and own-prose citation union', () => {
    const own = [...parsed.content.matchAll(/<Cite\s+id="([^"]+)"/g)].map(match => match[1]);
    const actual = [...new Set([...METHODS.flatMap(method => method.sources), ...own])].sort();
    expect([...parsed.data.citations].sort()).toEqual(actual);
    expect(new Set(parsed.data.citations).size).toBe(parsed.data.citations.length);
  });

  it('names the table so an unset rate is not read as proof that a paper lacks one', () => {
    render(<ComparisonMatrix />);
    expect(screen.getByRole('table')).toHaveAccessibleName(/An empty rate cell does not mean a source reports no rate/);
  });
});
