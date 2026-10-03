import { fireEvent, screen, within } from '@testing-library/react';
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

  it('opens on its takeaway with no symbols in the headline', () => {
    const { container } = render(<PiGenerationTimeline />);
    expect(
      container.querySelector('[data-figure-title]'),
    ).toHaveTextContent('A new robot model every few months; first three downloadable');
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent(
      "Physical Intelligence's models",
    );
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'only the first three are confirmed downloadable',
    );
  });

  it('draws year bands that change at January, so November 2025 sits in 2025', () => {
    const { container } = render(<PiGenerationTimeline />);
    const band = (year: string) => {
      const label = container.querySelector(`[data-year-band="${year}"] text`);
      return Number(label?.getAttribute('x'));
    };
    const dotX = (month: string) =>
      Number(container.querySelector(`[data-generation-dot="${month}"] circle`)?.getAttribute('cx'));
    const jan2026 = Number(container.querySelector('[data-year-band="2025"] rect')?.getAttribute('x'))
      + Number(container.querySelector('[data-year-band="2025"] rect')?.getAttribute('width'));
    expect(dotX('2025-11')).toBeLessThan(jan2026);
    expect(dotX('2026-04')).toBeGreaterThan(jan2026);
    expect(band('2025')).toBeLessThan(jan2026);
    expect(band('2026')).toBeGreaterThan(jan2026);
    // One mark per dated month and no unlabelled axis ticks.
    expect(container.querySelectorAll('[data-generation-dot]')).toHaveLength(5);
    expect(container.querySelectorAll('svg line')).toHaveLength(1);
  });

  it('brackets the downloadable models and shows a plain sentence for the selection', async () => {
    const user = userEvent.setup();
    const { container } = render(<PiGenerationTimeline />);
    expect(container.querySelector('[data-series="downloadable"]')).toHaveTextContent('downloadable');
    const detail = screen.getByTestId('generation-detail');
    expect(detail).toHaveTextContent(PI_GENERATIONS[0].plain);
    expect(detail).not.toHaveTextContent('PaliGemma');
    await user.click(screen.getByRole('button', { name: 'π*0.6' }));
    expect(detail).toHaveTextContent(/espressos/);
    expect(screen.getByTestId('generation-row-pi0')).toHaveTextContent('PaliGemma 3B + 300M action expert');
  });

  it('keeps Reset in Adjust more', () => {
    const { container } = render(<PiGenerationTimeline />);
    const adjust = container.querySelector('details[data-figure-fold="adjust"]');
    expect(adjust).not.toBeNull();
    expect(within(adjust as HTMLElement).getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(within(screen.getByTestId('generation-track')).queryByRole('button', { name: /reset/i })).toBeNull();
  });

  it('selecting a generation shows its detail readout with the lab PDF source', async () => {
    const user = userEvent.setup();
    render(<PiGenerationTimeline />);
    await user.click(screen.getByRole('button', { name: /π0\.7/i }));
    const detail = screen.getByTestId('generation-detail');
    expect(detail).toHaveTextContent('π0.7');
    expect(detail).toHaveTextContent('Apr 2026');
    expect(detail).toHaveTextContent(/weights unverified/i);
    const sourceLine = screen.getByTestId('generation-source');
    expect(sourceLine).toHaveTextContent(/^Source for π0\.7:/);
    const source = within(sourceLine).getByRole('link');
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
