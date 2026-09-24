import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PiGenerationTimeline } from '@/components/interactive/pi-generation-timeline';
import { PI_GENERATIONS } from '@/lib/pi-generations';
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('PiGenerationTimeline');

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

  it('marks the pinned catalogue boundary', () => {
    render(<PiGenerationTimeline />);
    expect(screen.getByText(/pinned catalogue ends at π0\.5/i)).toBeInTheDocument();
  });

  it('reports non-listing without inferring closed licensing', () => {
    render(<PiGenerationTimeline />);
    expect(
      screen.getByText(/4 model entries not in the pinned catalogue/i),
    ).toBeInTheDocument();
  });

  it('distinguishes downloadable and unknown availability', () => {
    render(<PiGenerationTimeline />);
    const list = screen.getByTestId('generation-track');
    expect(list.querySelectorAll('[data-status="open"]').length).toBe(3);
    expect(list.querySelectorAll('[data-status="unknown"]').length).toBe(4);
    expect(list.querySelectorAll('[data-status="closed"]').length).toBe(0);
  });

  it('selecting a generation shows its detail readout with the lab PDF source', async () => {
    const user = userEvent.setup();
    render(<PiGenerationTimeline />);
    await user.click(screen.getByRole('button', { name: /π0\.7/i }));
    const detail = screen.getByTestId('generation-detail');
    expect(detail).toHaveTextContent('π0.7');
    expect(detail).toHaveTextContent('Apr 2026');
    expect(detail).toHaveTextContent(/weights unverified/i);
    const source = screen.getByRole('link', { name: /source/i });
    expect(source).toHaveAttribute(
      'href',
      'https://www.pi.website/download/pi07.pdf',
    );
  });

  it('keeps undated MEM selectable without placing it on the time axis', async () => {
    const user = userEvent.setup();
    render(<PiGenerationTimeline />);
    expect(screen.getByRole('img').querySelector('text')?.parentElement?.textContent)
      .not.toContain('π0.6-MEM');
    await user.click(screen.getByRole('button', { name: 'π0.6-MEM' }));
    expect(screen.getByTestId('generation-detail')).toHaveTextContent('Date unverified');
    expect(screen.getByRole('img')).toHaveAccessibleDescription(/MEM has no established month and is not plotted/);
    expect(screen.queryByText('Mar 2026')).not.toBeInTheDocument();
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
