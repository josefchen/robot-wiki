import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ChunkSizeCurve, chunkScaleX, chunkScaleY } from '@/components/interactive/chunk-size-curve';
import { CHART_STROKE } from '@/components/motion/chart/chart-tokens';
import { STATUS_LABEL_VOCABULARY } from '@/lib/brand-v2-interactive-data';
import { ACT_CHUNK_ANCHORS } from '@/lib/chunk-size';

describe('ChunkSizeCurve', () => {
  it('renders the slider, chart, readouts, and reset control', () => {
    render(<ChunkSizeCurve />);
    const slider = screen.getByRole('slider', { name: /chunk size/i });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-label');
    expect(screen.getByRole('img', { name: /success rate/i })).toBeInTheDocument();
    expect(screen.getByTestId('chunk-success-readout')).toBeInTheDocument();
    expect(screen.getByTestId('chunk-decisions-readout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('defaults to k=100 and the published 44% anchor', () => {
    render(<ChunkSizeCurve />);
    expect(screen.getByRole('slider', { name: /chunk size/i })).toHaveValue(
      '100',
    );
    expect(screen.getByTestId('chunk-success-readout')).toHaveTextContent(
      '44%',
    );
    expect(
      screen.getByTestId('chunk-decisions-readout'),
    ).toHaveTextContent('4');
  });

  it('updates both readouts when the slider moves', () => {
    render(<ChunkSizeCurve />);
    fireEvent.change(screen.getByRole('slider', { name: /chunk size/i }), {
      target: { value: '1' },
    });
    expect(screen.getByTestId('chunk-success-readout')).toHaveTextContent(
      '1%',
    );
    expect(
      screen.getByTestId('chunk-decisions-readout'),
    ).toHaveTextContent('400');
  });

  it('shows the taper past k=100', () => {
    render(<ChunkSizeCurve />);
    fireEvent.change(screen.getByRole('slider', { name: /chunk size/i }), {
      target: { value: '400' },
    });
    const readout = screen.getByTestId('chunk-success-readout').textContent;
    const value = Number(readout?.replace(/[^0-9.]/g, ''));
    expect(value).toBeGreaterThan(15);
    expect(value).toBeLessThan(44);
  });

  it('labels its own status on the stage: only the two dots are published', () => {
    const { container } = render(<ChunkSizeCurve />);
    const status = container.querySelector('[data-figure-status]');
    expect(status?.textContent).toMatch(STATUS_LABEL_VOCABULARY.source);
    expect(status?.textContent).toMatch(/only the two dots have published numbers/i);
  });

  it('places the two measured anchors at the published chunk sizes, a marker-radius dot each', () => {
    const { container } = render(<ChunkSizeCurve />);
    const dots = [...container.querySelectorAll('circle[data-chart-mark="dot"]')];
    expect(dots.map((dot) => Number(dot.getAttribute('cx')))).toEqual(
      ACT_CHUNK_ANCHORS.map((anchor) => chunkScaleX(anchor.k)),
    );
    expect(dots.map((dot) => Number(dot.getAttribute('cy')))).toEqual(
      ACT_CHUNK_ANCHORS.map((anchor) => chunkScaleY(anchor.success)),
    );
    for (const dot of dots) {
      expect(Number(dot.getAttribute('r'))).toBe(CHART_STROKE.markerRadius);
    }
    const playhead = container.querySelector('circle[data-chart-mark="playhead"]');
    expect(Number(playhead?.getAttribute('r'))).toBe(CHART_STROKE.markerRadius + 2);
    expect(Number(playhead?.getAttribute('cx'))).toBe(chunkScaleX(100));
  });

  it('marks the interpolated region as not measured', () => {
    render(<ChunkSizeCurve />);
    expect(screen.getAllByText(/interpolat/i).length).toBeGreaterThan(0);
    expect(screen.getByText('estimate')).toBeInTheDocument();
    expect(screen.getByText('44%, measured')).toBeInTheDocument();
    expect(screen.getByText('1%, measured')).toBeInTheDocument();
  });

  it('the presets jump between the two measured settings and redraw the decision ticks', async () => {
    const user = userEvent.setup();
    render(<ChunkSizeCurve />);
    expect(screen.getByTestId('chunk-preset-hundred')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('decision-ticks-current')).toHaveAttribute('data-count', '4');
    expect(screen.getByTestId('decision-ticks-single')).toHaveAttribute('data-count', '400');
    expect(screen.getByText('4 decisions per task instead of 400:')).toBeInTheDocument();
    expect(screen.getByText('44 successes in 100 tries')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'One move at a time' }));
    expect(screen.getByRole('slider', { name: /chunk size/i })).toHaveValue('1');
    expect(screen.getByTestId('chunk-success-readout')).toHaveTextContent('1%');
    expect(screen.getByTestId('decision-ticks-current')).toHaveAttribute('data-count', '400');
    expect(screen.getByText('1 success in 100 tries')).toBeInTheDocument();
  });

  it('reset restores the default state', async () => {
    const user = userEvent.setup();
    render(<ChunkSizeCurve />);
    fireEvent.change(screen.getByRole('slider', { name: /chunk size/i }), {
      target: { value: '1' },
    });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByRole('slider', { name: /chunk size/i })).toHaveValue(
      '100',
    );
    expect(screen.getByTestId('chunk-success-readout')).toHaveTextContent(
      '44%',
    );
  });

  it('honors custom defaults', () => {
    render(<ChunkSizeCurve defaultChunkSize={50} />);
    expect(screen.getByRole('slider', { name: /chunk size/i })).toHaveValue(
      '50',
    );
    expect(
      screen.getByTestId('chunk-decisions-readout'),
    ).toHaveTextContent('8');
  });

  it('renders a table-form chart description that names the dashed region', () => {
    const { container } = render(<ChunkSizeCurve />);
    const desc = container.querySelector('[data-chart-description]');
    expect(desc?.textContent).toMatch(/dashed estimate line past k = 100/i);
    const details = container.querySelector('details[data-chart-data]');
    expect(details).toHaveAttribute('data-chart-form', 'table');
    expect(details?.querySelectorAll('tbody tr').length).toBeGreaterThanOrEqual(5);
    const before = desc?.textContent ?? '';
    fireEvent.change(screen.getByRole('slider', { name: /chunk size/i }), {
      target: { value: '1' },
    });
    expect(container.querySelector('[data-chart-description]')?.textContent).not.toBe(
      before,
    );
  });
});
