import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AdvantageScrubber } from '@/components/interactive/advantage-scrubber';
import {
  EPISODE_LENGTH_S,
  EPISODE_SEGMENTS,
  taggedSegments,
  valueAt,
} from '@/lib/advantage-episode';

function scrubTo(value: number) {
  fireEvent.change(screen.getByRole('slider', { name: /episode time/i }), {
    target: { value: String(value) },
  });
}

describe('AdvantageScrubber', () => {
  it('renders the view switcher, the scrub slider, readouts, and reset', () => {
    render(<AdvantageScrubber />);
    expect(
      screen.getByRole('button', { name: /^episode$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /training data/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /at execution/i }),
    ).toBeInTheDocument();
    const slider = screen.getByRole('slider', { name: /episode time/i });
    expect(slider).toHaveAttribute('aria-label');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', String(EPISODE_LENGTH_S));
    expect(screen.getByTestId('time-readout')).toHaveTextContent('0.0 s');
    expect(screen.getByTestId('value-readout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('lists one timeline row per episode segment', () => {
    render(<AdvantageScrubber />);
    for (const segment of EPISODE_SEGMENTS) {
      expect(
        screen.getByTestId(`segment-row-${segment.id}`),
      ).toBeInTheDocument();
    }
  });

  it('scrubbing updates the time and value readouts', () => {
    render(<AdvantageScrubber />);
    scrubTo(12);
    expect(screen.getByTestId('time-readout')).toHaveTextContent('12.0 s');
    expect(screen.getByTestId('value-readout')).toHaveTextContent(
      valueAt(12).toFixed(1),
    );
  });

  it('marks rising segments as high advantage and falling ones as low', () => {
    render(<AdvantageScrubber />);
    scrubTo(4);
    expect(screen.getByTestId('segment-readout')).toHaveTextContent(
      /high advantage/i,
    );
    scrubTo(12);
    expect(screen.getByTestId('segment-readout')).toHaveTextContent(
      /low advantage/i,
    );
    expect(screen.getByTestId('segment-readout')).toHaveTextContent(/grasp/i);
  });

  it('shows the credit-assignment link from the insertion failure to the grasp', () => {
    render(<AdvantageScrubber />);
    const credit = screen.getByTestId('credit-annotation');
    expect(credit).toHaveTextContent(/20 s earlier/i);
    expect(credit).toHaveTextContent(/grasp/i);
  });

  it('the training-data view retains every transition with a binary tag', async () => {
    const user = userEvent.setup();
    render(<AdvantageScrubber />);
    await user.click(screen.getByRole('button', { name: /training data/i }));
    const view = screen.getByTestId('training-view');
    expect(view).toBeInTheDocument();
    const tagged = taggedSegments();
    for (const segment of tagged) {
      expect(
        screen.getByTestId(`training-row-${segment.id}`),
      ).toHaveTextContent(
        segment.tag === 'high' ? /high advantage/i : /low advantage/i,
      );
    }
    const high = tagged.filter((s) => s.tag === 'high').length;
    const low = tagged.filter((s) => s.tag === 'low').length;
    expect(view).toHaveTextContent(
      `${tagged.length} transitions kept`,
    );
    expect(view).toHaveTextContent(`${high} high`);
    expect(view).toHaveTextContent(`${low} low`);
  });

  it('the execution view depicts conditioning on high advantage', async () => {
    const user = userEvent.setup();
    render(<AdvantageScrubber />);
    await user.click(screen.getByRole('button', { name: /at execution/i }));
    const view = screen.getByTestId('execution-view');
    expect(view).toHaveTextContent(/advantage:\s*high/i);
    // High-advantage segments stay active; low ones are demoted.
    expect(screen.getByTestId('execution-row-reach')).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByTestId('execution-row-grasp')).toHaveAttribute(
      'data-active',
      'false',
    );
  });

  it('reset restores the episode view and the initial playhead', async () => {
    const user = userEvent.setup();
    render(<AdvantageScrubber />);
    scrubTo(20);
    await user.click(screen.getByRole('button', { name: /training data/i }));
    expect(screen.queryByTestId('training-view')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('time-readout')).toHaveTextContent('0.0 s');
    expect(screen.queryByTestId('training-view')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^episode$/i }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders a table-form chart description that names the dashed credit-assignment arc', () => {
    const { container } = render(<AdvantageScrubber />);
    const desc = container.querySelector('[data-chart-description]');
    expect(desc?.textContent).toMatch(/dashed arc/i);
    expect(desc?.textContent).toMatch(/advantage/i);
    const details = container.querySelector('details[data-chart-data]');
    expect(details).toHaveAttribute('data-chart-form', 'table');
    const rows = details?.querySelectorAll('tbody tr').length ?? 0;
    expect(rows).toBeGreaterThanOrEqual(5);
    expect(rows).toBeLessThanOrEqual(10);
    const before = desc?.textContent ?? '';
    scrubTo(12);
    expect(container.querySelector('[data-chart-description]')?.textContent).not.toBe(
      before,
    );
  });
});

  it('branches the chart description per view, naming only rendered elements', async () => {
    const user = userEvent.setup();
    const { container } = render(<AdvantageScrubber />);
    const read = () =>
      container.querySelector('[data-chart-description]')?.textContent ?? '';
    // Episode view (default): the arc and the stage blocks are on the page.
    expect(read()).toMatch(/dashed arc/);
    expect(read()).toMatch(/tinted stage blocks/);
    const tagged = taggedSegments();
    const high = tagged.filter((s) => s.tag === 'high').length;
    const low = tagged.length - high;
    // Training view: no arc, no stage blocks, no playhead leading clause.
    await user.click(screen.getByRole('button', { name: /training data/i }));
    expect(read()).not.toMatch(/dashed arc/);
    expect(read()).not.toMatch(/tinted stage blocks/);
    expect(read()).not.toMatch(/^At t = /);
    expect(read()).toMatch(new RegExp(`\\b${tagged.length} transitions\\b`));
    expect(read()).toMatch(new RegExp(`\\b${high} tagged high advantage\\b`));
    // Execution view: describes conditioning, still no episode-only elements.
    await user.click(screen.getByRole('button', { name: /at execution/i }));
    expect(read()).not.toMatch(/dashed arc/);
    expect(read()).toMatch(new RegExp(`\\b${high} are reproduced\\b`));
    expect(read()).toMatch(new RegExp(`\\b${low} suppressed\\b`));
    // Back to the episode view: the episode text returns.
    await user.click(screen.getByRole('button', { name: /^episode$/i }));
    expect(read()).toMatch(/dashed arc/);
  });
