import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WmTaxonomyTable } from '@/components/mdx/wm-taxonomy-table';
import { WM_PARADIGMS } from '@/lib/world-model-taxonomy';

describe('WmTaxonomyTable', () => {
  it('renders exactly six paradigm rows', () => {
    const { container } = render(<WmTaxonomyTable />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(6);
  });

  it('names each paradigm identifiably', () => {
    render(<WmTaxonomyTable />);
    expect(screen.getByText(/Dreamer-style/)).toBeInTheDocument();
    expect(screen.getByText(/TD-MPC-style/)).toBeInTheDocument();
    expect(
      screen.getByText(/Action-conditioned generative video/),
    ).toBeInTheDocument();
    expect(screen.getByText(/joint-embedding/)).toBeInTheDocument();
    expect(screen.getByText(/Unified world-action/)).toBeInTheDocument();
    expect(screen.getByText(/Symbolic/)).toBeInTheDocument();
  });

  it('populates the required cells for every row', () => {
    const { container } = render(<WmTaxonomyTable />);
    for (const p of WM_PARADIGMS) {
      const row = container.querySelector(
        `[data-testid="wm-row-${p.id}"]`,
      ) as HTMLElement;
      expect(row).not.toBeNull();
      const cells = row.querySelectorAll('td');
      // predicts, space, trainedOn, primaryUse, systems (name lives in th)
      expect(cells.length).toBe(5);
      for (const cell of cells) {
        expect(cell.textContent?.trim().length).toBeGreaterThan(0);
      }
      expect(row.textContent).toContain(p.predicts);
      expect(row.textContent).toContain(p.space);
      expect(row.textContent).toContain(p.primaryUse);
      expect(row.textContent).toContain(p.systems);
    }
  });

  it('spot-checks contract cell content', () => {
    const { container } = render(<WmTaxonomyTable />);
    const row = (id: string) =>
      container.querySelector(`[data-testid="wm-row-${id}"]`)!.textContent ??
      '';
    expect(row('latent-dynamics')).toMatch(/continuation/i);
    expect(row('decoder-free-latent')).toMatch(/no reconstruction/i);
    expect(row('generative-video')).toMatch(/future pixels/i);
    expect(row('jepa')).toMatch(/never pixels/i);
    expect(row('world-action')).toMatch(/action chunks/i);
    expect(row('symbolic')).toMatch(/predicates/i);
  });
});
