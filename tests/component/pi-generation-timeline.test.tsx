import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PiGenerationTimeline } from '@/components/interactive/pi-generation-timeline';
import { PI_GENERATIONS } from '@/lib/pi-generations';

describe('PiGenerationTimeline', () => {
  it('renders a selectable node for every generation', () => {
    render(<PiGenerationTimeline />);
    for (const g of PI_GENERATIONS) {
      const escaped = g.name.replace(/[.*]/g, '\\$&');
      expect(
        screen.getByRole('button', { name: new RegExp(`^${escaped}$`, 'i') }),
      ).toBeInTheDocument();
    }
  });

  it('marks where open weights stop', () => {
    render(<PiGenerationTimeline />);
    expect(screen.getByText(/open weights stop at π0\.5/i)).toBeInTheDocument();
  });

  it('shows how far the closed line has run past the open weights', () => {
    render(<PiGenerationTimeline />);
    expect(
      screen.getByText(/4 closed generations/i),
    ).toBeInTheDocument();
  });

  it('labels each generation open or closed', () => {
    render(<PiGenerationTimeline />);
    const list = screen.getByTestId('generation-track');
    expect(list.querySelectorAll('[data-status="open"]').length).toBe(3);
    expect(list.querySelectorAll('[data-status="closed"]').length).toBe(4);
  });

  it('selecting a generation shows its detail readout with the lab PDF source', async () => {
    const user = userEvent.setup();
    render(<PiGenerationTimeline />);
    await user.click(screen.getByRole('button', { name: /π0\.7/i }));
    const detail = screen.getByTestId('generation-detail');
    expect(detail).toHaveTextContent('π0.7');
    expect(detail).toHaveTextContent('Apr 2026');
    expect(detail).toHaveTextContent(/closed/i);
    const source = screen.getByRole('link', { name: /source/i });
    expect(source).toHaveAttribute(
      'href',
      'https://www.pi.website/download/pi07.pdf',
    );
  });

  it('arrow keys move the selection between generations', async () => {
    const user = userEvent.setup();
    render(<PiGenerationTimeline />);
    const first = screen.getByRole('button', { name: /^π0$/i });
    await user.click(first);
    expect(first).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{ArrowRight}');
    expect(
      screen.getByRole('button', { name: /π0-FAST/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{ArrowLeft}');
    expect(first).toHaveAttribute('aria-pressed', 'true');
  });

  it('describes the π line and tracks the selected generation', () => {
    const { container } = render(<PiGenerationTimeline />);
    const img = screen.getByRole('img');
    const id = img.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    const desc = container.querySelector(`[id="${CSS.escape(id!)}"]`);
    expect(desc?.textContent).toMatch(/7 generations/);
    expect(desc?.textContent).toMatch(/selected now is π0/);
    fireEvent.click(screen.getByRole('button', { name: /^π0\.7$/i }));
    const moved = container.querySelector('[data-chart-description]')
      ?.textContent ?? '';
    expect(moved).toMatch(/selected now is π0\.7/);
  });

  it('reset restores the default selection', async () => {
    const user = userEvent.setup();
    render(<PiGenerationTimeline />);
    await user.click(screen.getByRole('button', { name: /π0\.7/i }));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByRole('button', { name: /^π0$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
