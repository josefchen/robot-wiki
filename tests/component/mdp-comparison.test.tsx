import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MdpComparison } from '@/components/mdx/mdp-comparison';
import { MDP_ROWS } from '@/lib/contact-geometry';

describe('MdpComparison', () => {
  it('renders all six MDP property rows', () => {
    render(<MdpComparison />);
    for (const row of MDP_ROWS) {
      expect(screen.getByTestId(`mdp-row-${row.key}`)).toBeInTheDocument();
    }
    expect(MDP_ROWS).toHaveLength(6);
  });

  it('names the six properties from the research brief', () => {
    const keys = MDP_ROWS.map((r) => r.key);
    expect(keys).toEqual([
      'observation-sufficiency',
      'contact-structure',
      'contact-error-sensitivity',
      'reward-density',
      'environment-authoring',
      'episode-reset',
    ]);
  });

  it('gives every row distinct non-empty locomotion and manipulation cells', () => {
    render(<MdpComparison />);
    for (const row of MDP_ROWS) {
      const el = screen.getByTestId(`mdp-row-${row.key}`);
      const cells = el.querySelectorAll('td');
      expect(cells).toHaveLength(2);
      expect(cells[0].textContent?.trim().length).toBeGreaterThan(0);
      expect(cells[1].textContent?.trim().length).toBeGreaterThan(0);
      expect(cells[0].textContent).not.toBe(cells[1].textContent);
    }
  });

  it('renders the locomotion and manipulation column headers', () => {
    render(<MdpComparison />);
    expect(
      screen.getByRole('columnheader', { name: /locomotion/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /manipulation/i }),
    ).toBeInTheDocument();
  });
});
