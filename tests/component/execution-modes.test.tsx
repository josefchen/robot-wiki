import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ExecutionModes } from '@/components/interactive/execution-modes';

function slider() {
  return screen.getByRole('slider', { name: /inference delay/i });
}

describe('ExecutionModes', () => {
  it('separates teaching traces from the RTC solver and physical jerk', () => {
    render(<ExecutionModes />);
    const note = screen.getByTestId('execution-assumption-note');
    expect(note).toHaveTextContent(/not an RTC solver or measured robot data/i);
    expect(note).toHaveTextContent(/arbitrary units/i);
    expect(note).toHaveTextContent(/discontinuity proxy, not physical jerk/i);
    expect(note).toHaveTextContent(/five-tick linear blend/i);
    expect(note).toHaveTextContent(
      /sine-shaped plan, delay-dependent offset, four-tick ramps and five-tick linear blend are teaching assumptions/i,
    );
    expect(note).toHaveTextContent(/do not reproduce its experiments or guarantee safety/i);
    for (const image of screen.getAllByRole('img')) {
      expect(image).toHaveAccessibleName(/discontinuity-proxy limit, not physical jerk/i);
    }
  });

  it('renders the three execution modes, the delay slider, readouts, and reset', () => {
    render(<ExecutionModes />);
    expect(screen.getByTestId('panel-synchronous')).toBeInTheDocument();
    expect(screen.getByTestId('panel-naive')).toBeInTheDocument();
    expect(screen.getByTestId('panel-rtc')).toBeInTheDocument();
    expect(slider()).toBeInTheDocument();
    expect(slider()).toHaveAttribute('aria-label');
    expect(screen.getByTestId('dv-synchronous')).toBeInTheDocument();
    expect(screen.getByTestId('dv-naive')).toBeInTheDocument();
    expect(screen.getByTestId('dv-rtc')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getAllByText(/0.30/).length).toBeGreaterThan(0);
  });

  it('covers a delay range of 0 to 200 ms', () => {
    render(<ExecutionModes />);
    expect(slider()).toHaveAttribute('min', '0');
    expect(slider()).toHaveAttribute('max', '200');
  });

  it('opens on 0.2 second with the lurch note, in plain words', () => {
    const { container } = render(<ExecutionModes />);
    expect(slider()).toHaveValue('200');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Three ways to swap plans: pause, lurch, or blend',
    );
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Chunk hand-off');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'blending keeps it moving smoothly',
    );
    expect(screen.getByRole('button', { name: '0.2 second' })).toHaveAttribute('aria-pressed', 'true');
    const notes = container.querySelectorAll('[data-figure-annotation]');
    expect(notes).toHaveLength(1);
    expect(notes[0].textContent).toBe('Sudden jump: the arm lurcheswhen the new plan takes over');
    expect(container.querySelector('[data-em-stopped]')).not.toBeNull();
    const adjust = container.querySelector('details[data-figure-fold="adjust"]')!;
    expect(adjust).toContainElement(slider());
    expect(adjust).toContainElement(screen.getByTestId('dv-naive'));
    expect(adjust).toContainElement(screen.getByRole('button', { name: /reset/i }));
  });

  it('the None preset draws three matching lanes with no stop and no dip', async () => {
    const user = userEvent.setup();
    const { container } = render(<ExecutionModes />);
    await user.click(screen.getByRole('button', { name: 'None' }));
    expect(slider()).toHaveValue('0');
    // The sampled table holds the same numbers the lanes draw: each row's
    // three velocities agree.
    const rows = container.querySelectorAll('details[data-chart-data] tbody tr');
    expect(rows.length).toBe(6);
    for (const row of rows) {
      const cells = [...row.querySelectorAll('td')].map((td) => td.textContent);
      expect(new Set(cells).size).toBe(1);
    }
    expect(container.querySelector('[data-em-stopped]')).toBeNull();
    expect(container.querySelector('[data-figure-annotation]')?.textContent).toContain('all three match');
  });

  it('at zero delay all three toy modes stay within the proxy limit', () => {
    render(<ExecutionModes />);
    fireEvent.change(slider(), { target: { value: '0' } });
    expect(slider()).toHaveValue('0');
    expect(screen.getByTestId('verdict-synchronous')).toHaveTextContent(
      /within/i,
    );
    expect(screen.getByTestId('verdict-naive')).toHaveTextContent(/within/i);
    expect(screen.getByTestId('verdict-rtc')).toHaveTextContent(/within/i);
    expect(screen.getByTestId('pause-readout')).toHaveTextContent('0 ms');
  });

  it('at 100 ms the naive switch exceeds the proxy limit while the blended toy holds', () => {
    render(<ExecutionModes />);
    fireEvent.change(slider(), { target: { value: '100' } });
    const naiveDv = Number(
      screen.getByTestId('dv-naive').getAttribute('data-value'),
    );
    expect(naiveDv).toBeGreaterThan(0.3);
    expect(screen.getByTestId('verdict-naive')).toHaveTextContent(/exceeds/i);
    expect(screen.getByTestId('verdict-rtc')).toHaveTextContent(/within/i);
    expect(screen.getByTestId('verdict-synchronous')).toHaveTextContent(
      /within/i,
    );
  });

  it('at 200 ms the naive spike roughly doubles while the sync pause grows to 200 ms', () => {
    render(<ExecutionModes />);
    fireEvent.change(slider(), { target: { value: '200' } });
    const naiveDv = Number(
      screen.getByTestId('dv-naive').getAttribute('data-value'),
    );
    expect(naiveDv).toBeGreaterThan(1.0);
    const rtcDv = Number(
      screen.getByTestId('dv-rtc').getAttribute('data-value'),
    );
    expect(rtcDv).toBeLessThan(0.3);
    expect(screen.getByTestId('pause-readout')).toHaveTextContent('200 ms');
  });

  it('reset restores the 0.2 second opening state', async () => {
    const user = userEvent.setup();
    render(<ExecutionModes />);
    fireEvent.change(slider(), { target: { value: '0' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(slider()).toHaveValue('200');
    expect(screen.getByTestId('verdict-naive')).toHaveTextContent(/exceeds/i);
  });

  it('renders a table-form chart description that names the dashed guide', () => {
    const { container } = render(<ExecutionModes />);
    const desc = container.querySelector('[data-chart-description]');
    expect(desc?.textContent).toMatch(/dashed guide/i);
    expect(desc?.textContent).toMatch(/velocity/i);
    const details = container.querySelector('details[data-chart-data]');
    expect(details).toHaveAttribute('data-chart-form', 'table');
    expect(details?.querySelectorAll('tbody tr').length).toBe(6);
    const before = desc?.textContent ?? '';
    fireEvent.change(slider(), { target: { value: '0' } });
    expect(container.querySelector('[data-chart-description]')?.textContent).not.toBe(
      before,
    );
  });

  it('gives the plot group a short name and the shared takeaway as its description', () => {
    const { container } = render(<ExecutionModes />);
    const group = screen.getByRole('group', {
      name: 'Velocity traces for the three execution modes on one time axis',
    });
    const desc = container.querySelector('[data-chart-description]');
    expect(desc?.id).toBeTruthy();
    expect(group).toHaveAttribute('aria-describedby', desc?.id);
    expect(group.getAttribute('aria-label')!.length).toBeLessThan(
      (desc?.textContent ?? '').length,
    );
  });
});
