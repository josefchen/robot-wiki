import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stat } from '@/components/ui/stat';

describe('Stat', () => {
  it('renders value and label', () => {
    render(<Stat label="Chunk size at 44% success" value="k=100" />);
    expect(screen.getByText('k=100')).toBeInTheDocument();
    expect(screen.getByText('Chunk size at 44% success')).toBeInTheDocument();
  });

  it('renders an optional note', () => {
    render(<Stat label="Horizon" value="50 Hz" note="ALOHA control rate" />);
    expect(screen.getByText('ALOHA control rate')).toBeInTheDocument();
  });

  it('sets a T_a symbol in a label as an italic capital with its subscript', () => {
    // The Diffusion Policy horizons (T_o, T_p, T_a) are math in the prose; a
    // string prop showed them with a bare underscore.
    const { container } = render(<Stat label="execution T_a" value="8" />);
    const label = container.querySelector('i')?.parentElement?.parentElement;
    expect(label?.textContent).toBe('execution Ta');
    expect(container.querySelector('i')?.textContent).toBe('T');
    expect(container.querySelector('sub')?.textContent).toBe('a');
    expect(container.textContent).not.toContain('_');
  });

  it('leaves any other underscore in a label as written', () => {
    render(<Stat label="pi_RL revision" value="2026" />);
    expect(screen.getByText('pi_RL revision')).toBeInTheDocument();
  });

  it('marks a value whose word is too long for a narrow strip column, and only that', () => {
    // At 320px a phone strip column is about 128px and the 24px mono value
    // sets about 14px a character: "embodiments" (11) spilled 26px past it.
    const long = render(<Stat label="OXE v9 dataset" value="22 embodiments" />);
    expect(long.container.firstElementChild).toHaveAttribute('data-stat-long-word');
    long.unmount();
    for (const value of ['10K hours', 'about 2×', '300M params', 'Rotational']) {
      const { container, unmount } = render(<Stat label="probe" value={value} />);
      expect(
        container.firstElementChild?.hasAttribute('data-stat-long-word'),
        value,
      ).toBe(value === 'Rotational');
      unmount();
    }
  });
});
