import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SurgicalSystemsTable } from '@/components/mdx/surgical-systems-table';

describe('SurgicalSystemsTable', () => {
  it('renders one row per system with the required names', () => {
    const { container } = render(<SurgicalSystemsTable />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
    for (const name of [
      'Intuitive da Vinci',
      'CMR Versius',
      'Moon Surgical Maestro',
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it('exposes an accessible name via caption, matched at the tail', () => {
    render(<SurgicalSystemsTable />);
    // Anchor the assertion on the caption TAIL: the possessive after
    // "each system" must be a real \u2019 character, and the match must
    // run through the closing words ("autonomy scale of Yang et al."),
    // not stop at a prefix. A literal backslash-u escape in the JSX text
    // (inert in JSX children) reads as "system backslash u two zero one
    // nine s" to screen-reader users and previously passed a prefix-only
    // regex; the tail anchor makes that regression fail here.
    const name = screen.getByRole('table').getAttribute('aria-label') ?? '';
    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(1);
    const accessibleName =
      name || (tables[0].querySelector('caption')?.textContent ?? '');
    expect(accessibleName).toMatch(
      /system\u2019s position on the six-level autonomy scale of Yang et al\./,
    );
  });

  it('populates every cell of every row', () => {
    const { container } = render(<SurgicalSystemsTable />);
    const rows = container.querySelectorAll('tbody tr');
    for (const row of rows) {
      // system name lives in the row th; focus, differentiator, and the
      // regulatory path (with the autonomy note folded beneath it) in td.
      const cells = row.querySelectorAll('td');
      expect(cells.length).toBe(3);
      for (const cell of [...cells, row.querySelector('th')]) {
        expect(cell?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it('carries the autonomy level as a compact mono chip, not prose', () => {
    const { container } = render(<SurgicalSystemsTable />);
    const chips = container.querySelectorAll('[data-testid^="surgical-level-"]');
    expect(chips).toHaveLength(3);
    // da Vinci and Versius are both Level 0; Maestro is Level 1.
    expect(screen.getAllByText('L0')).toHaveLength(2);
    expect(screen.getByText('L1')).toBeInTheDocument();
    for (const chip of chips) {
      expect(chip.tagName).toBe('SPAN');
    }
  });
});
