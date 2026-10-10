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
  it('leads with Play and a two-way toggle; the execution view, slider, readouts and reset sit in Adjust more', () => {
    const { container } = render(<AdvantageScrubber />);
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'The robot learns its real mistake came 20 seconds earlier',
    );
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Advantage tags');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'Tagging each step as helping or hurting lets the robot trace a failure to a cause long before it.',
    );
    expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^the attempt$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^what it learns$/i })).toBeInTheDocument();
    const adjust = container.querySelector('details[data-figure-fold="adjust"]')!;
    expect(adjust).toContainElement(screen.getByRole('button', { name: /at execution/i }));
    const slider = screen.getByRole('slider', { name: /episode time/i });
    expect(adjust).toContainElement(slider);
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', String(EPISODE_LENGTH_S));
    // It settles at the end of the episode, with the whole line drawn.
    expect(screen.getByTestId('time-readout')).toHaveTextContent(`${EPISODE_LENGTH_S.toFixed(1)} s`);
    expect(screen.getByTestId('value-readout')).toBeInTheDocument();
    expect(adjust).toContainElement(screen.getByRole('button', { name: /reset/i }));
  });

  it('draws one numbered marker per step, worded ends on the value line and one note', () => {
    const { container } = render(<AdvantageScrubber />);
    const steps = container.querySelectorAll('[data-step]');
    expect(steps).toHaveLength(EPISODE_SEGMENTS.length);
    const stage = screen.getByRole('img');
    expect(stage).toHaveTextContent('Chance this ends well');
    expect(stage).toHaveTextContent('likely');
    expect(stage).toHaveTextContent('unlikely');
    expect(stage).toHaveTextContent('Crooked');
    expect(stage).not.toHaveTextContent(/V = /);
    const notes = container.querySelectorAll('[data-figure-annotation]');
    expect(notes).toHaveLength(1);
    expect(notes[0].textContent).toBe(
      'The failure shows up here, butthe cause was this crooked grip',
    );
  });

  it('lists one row per episode segment, with its score change, in How this was made', () => {
    const { container } = render(<AdvantageScrubber />);
    const method = container.querySelector('details[data-figure-fold="method"]')!;
    expect(method).toHaveTextContent('V = 30');
    expect(method).toHaveTextContent('-12.0');
    for (const segment of EPISODE_SEGMENTS) {
      expect(
        screen.getByTestId(`segment-row-${segment.id}`),
      ).toBeInTheDocument();
      expect(method).toContainElement(screen.getByTestId(`segment-row-${segment.id}`));
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

  it('shows the credit-assignment note once the failure has shown, and hides it before', () => {
    render(<AdvantageScrubber />);
    const credit = screen.getByTestId('credit-annotation');
    expect(credit).toHaveTextContent(/crooked grip/i);
    expect(credit).toHaveTextContent(/failure shows up here/i);
    scrubTo(20);
    expect(screen.queryByTestId('credit-annotation')).not.toBeInTheDocument();
  });

  it('the training-data view retains every transition with a binary tag', async () => {
    const user = userEvent.setup();
    render(<AdvantageScrubber />);
    await user.click(screen.getByRole('button', { name: /what it learns/i }));
    const view = screen.getByTestId('training-view');
    expect(view).toBeInTheDocument();
    const tagged = taggedSegments();
    for (const segment of tagged) {
      const row = screen.getByTestId(`training-row-${segment.id}`);
      expect(row).toHaveAttribute('data-tag', segment.tag);
      expect(row).toHaveTextContent(
        segment.tag === 'high' ? /helped: do more of this/i : /hurt: do less of this/i,
      );
    }
    expect(view).toHaveTextContent(`All ${tagged.length} steps stay in the training data`);
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

  it('reset restores the attempt view at the settled end of the episode', async () => {
    const user = userEvent.setup();
    render(<AdvantageScrubber />);
    scrubTo(20);
    await user.click(screen.getByRole('button', { name: /what it learns/i }));
    expect(screen.queryByTestId('training-view')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('time-readout')).toHaveTextContent(`${EPISODE_LENGTH_S.toFixed(1)} s`);
    expect(screen.queryByTestId('training-view')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^the attempt$/i }),
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
    await user.click(screen.getByRole('button', { name: /what it learns/i }));
    expect(read()).not.toMatch(/dashed arc/);
    expect(read()).not.toMatch(/tinted stage blocks/);
    expect(read()).not.toMatch(/^At t = /);
    expect(read()).toMatch(new RegExp(`\\b${tagged.length} transitions\\b`));
    expect(read()).toMatch(new RegExp(`\\b${high} tagged high advantage\\b`));
    // Execution view: describes conditioning, still no episode-only elements.
    await user.click(screen.getByRole('button', { name: /at execution/i }));
    expect(read()).not.toMatch(/dashed arc/);
    expect(read()).toMatch(new RegExp(`\\b${high} high-tag examples\\b`));
    expect(read()).toMatch(new RegExp(`\\b${low} low-tag examples\\b`));
    // Back to the episode view: the episode text returns.
    await user.click(screen.getByRole('button', { name: /^the attempt$/i }));
    expect(read()).toMatch(/dashed arc/);
  });
