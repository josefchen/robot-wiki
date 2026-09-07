import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ComparisonMatrix } from '@/components/interactive/comparison-matrix';
import { METHODS } from '@/data/methods';
import { getCitation } from '@/data/citations';

const article = readFileSync('content/manipulation/comparison-matrix.mdx', 'utf8');
const parsed = matter(article);

describe('comparison current claim corrections', () => {
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

  it('does not invent a continuous pi0.7 execution interval', () => {
    expect(parsed.content).toContain('either 15 or 25');
    expect(parsed.content).not.toMatch(/15 to 25|15-25/);
  });

  it('replaces the universal regression-displacement and latency assertions', () => {
    expect(parsed.content).not.toMatch(/every row samples|Generative action heads displaced regression|twice the end-to-end latency|Fifty hertz became the standard claim|frontier rows all carry/);
    expect(parsed.content).toContain('deterministically');
    expect(parsed.content).toContain('not an inference-throughput comparison');
  });

  it('scopes DP horizons to a named configuration rather than all architectures', () => {
    expect(parsed.content).toContain('CNN Push-T configuration');
    expect(parsed.content).toContain('predicts 16 steps and executes 8');
  });

  it('does not call an unset scalar proof that a primary paper lacks rates', () => {
    render(<ComparisonMatrix />);
    expect(screen.getByRole('table')).toHaveAccessibleName(/Unset scalar rates do not prove/);
    expect(parsed.content).not.toContain('neither states a single');
    expect(parsed.content).not.toContain('rates, are omitted rather than repeated');
  });
});
