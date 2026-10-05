import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ContactGeometry } from '@/components/interactive/contact-geometry';
import { SCENARIOS } from '@/lib/contact-geometry';

function preset(name: RegExp) {
  return screen.getByRole('button', { name });
}

function errorSlider() {
  return screen.getByRole('slider', { name: /contact-model error/i });
}

describe('ContactGeometry', () => {
  it('renders the error presets, both scenes, the error slider, readouts, and reset', () => {
    const { container } = render(<ContactGeometry />);
    expect(
      screen.getByRole('group', { name: /how wrong the simulator/i }),
    ).toBeInTheDocument();
    // Walking and the peg sit side by side, so no scenario toggle is needed.
    expect(screen.getByTestId('dog-scene')).toBeInTheDocument();
    expect(screen.getByTestId('peg-scene')).toBeInTheDocument();
    expect(screen.getByTestId('robot-dog')).toBeInTheDocument();
    expect(screen.getByTestId('gripper')).toBeInTheDocument();
    expect(errorSlider()).toBeInTheDocument();
    for (const id of ['locomotion', 'manipulation']) {
      expect(screen.getByTestId(`contact-count-readout-${id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`patch-readout-${id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`tolerance-readout-${id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`outcome-readout-${id}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('error-readout')).toBeInTheDocument();
    const adjust = container.querySelector('details[data-figure-fold="adjust"]')!;
    expect(adjust).toContainElement(errorSlider());
    expect(adjust).toContainElement(screen.getByRole('button', { name: /reset/i }));
  });

  it('leads with the takeaway and shows the same 2 mm sparing the dog and jamming the peg', () => {
    const { container } = render(<ContactGeometry />);
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Legs forgive tiny surface errors; precise hand work does not',
    );
    expect(preset(/coin/i)).toHaveAttribute('aria-pressed', 'true');
    const note = container.querySelectorAll('[data-figure-annotation]');
    expect(note).toHaveLength(1);
    expect(note[0]).toHaveTextContent(/Same 2 mm error: the dog keeps walking,\s*the peg misses the hole/);
    expect(screen.getByTestId('dog-scene')).toHaveTextContent('keeps walking');
    expect(screen.getByTestId('peg-scene')).toHaveTextContent('jams on the edge');
  });

  it('defaults to a survivable 2 mm error for locomotion', () => {
    render(<ContactGeometry />);
    expect(screen.getByTestId('contact-count-readout-locomotion')).toHaveTextContent('4');
    expect(screen.getByTestId('error-readout')).toHaveTextContent('2.0 mm');
    expect(screen.getByTestId('outcome-readout-locomotion')).toHaveTextContent(/stable/i);
  });

  it('manipulation has more contacts and jams at the same error', () => {
    render(<ContactGeometry />);
    const count = Number(
      screen.getByTestId('contact-count-readout-manipulation').textContent,
    );
    expect(count).toBeGreaterThan(4);
    expect(screen.getByTestId('outcome-readout-manipulation')).toHaveTextContent(/jammed/i);
    expect(screen.getByTestId('tolerance-readout-manipulation')).toHaveTextContent('0.5 mm');
  });

  it('the error slider flips locomotion past its tolerance', () => {
    render(<ContactGeometry />);
    fireEvent.change(errorSlider(), { target: { value: '25' } });
    expect(screen.getByTestId('error-readout')).toHaveTextContent('25.0 mm');
    expect(screen.getByTestId('outcome-readout-locomotion')).not.toHaveTextContent(/stable/i);
  });

  it('the thumb preset makes even the dog lose its footing', async () => {
    const user = userEvent.setup();
    const { container } = render(<ContactGeometry />);
    await user.click(preset(/thumb/i));
    expect(screen.getByTestId('error-readout')).toHaveTextContent('25.0 mm');
    expect(screen.getByTestId('outcome-readout-locomotion')).not.toHaveTextContent(/stable/i);
    expect(screen.getByTestId('dog-scene')).toHaveTextContent('loses its footing');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent(/even the dog/);
  });

  it('manipulation seats the peg when the error is below clearance', async () => {
    const user = userEvent.setup();
    render(<ContactGeometry />);
    fireEvent.change(errorSlider(), { target: { value: '0.2' } });
    expect(screen.getByTestId('outcome-readout-manipulation')).toHaveTextContent(/seats/i);
    await user.click(preset(/card/i));
    expect(screen.getByTestId('error-readout')).toHaveTextContent('0.5 mm');
    expect(screen.getByTestId('outcome-readout-manipulation')).toHaveTextContent(/seats/i);
    expect(screen.getByTestId('peg-scene')).toHaveTextContent('slides into the hole');
  });

  it('reset restores the default error', async () => {
    const user = userEvent.setup();
    render(<ContactGeometry />);
    await user.click(preset(/thumb/i));
    fireEvent.change(errorSlider(), { target: { value: '12' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(preset(/coin/i)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('error-readout')).toHaveTextContent('2.0 mm');
    expect(screen.getByTestId('contact-count-readout-locomotion')).toHaveTextContent('4');
  });

  it('renders one contact marker per scenario contact, crossing only the ones that go wrong', async () => {
    const user = userEvent.setup();
    const { container } = render(<ContactGeometry />);
    const total = SCENARIOS.locomotion.contacts.length + SCENARIOS.manipulation.contacts.length;
    expect(screen.getAllByTestId(/^contact-marker-/).length).toBe(total);
    expect(screen.getAllByTestId(/^contact-marker-foot-/).length).toBe(4);
    expect(total - 4).toBeGreaterThan(12);
    // At 2 mm the peg binds at the rim and its leading corner; the feet hold.
    expect([...container.querySelectorAll('[data-contact="lost"]')].map((n) => n.getAttribute('data-testid')))
      .toEqual(['contact-marker-rim-r', 'contact-marker-chamfer-r']);
    await user.click(preset(/thumb/i));
    expect(container.querySelectorAll('[data-testid^="contact-marker-foot-"][data-contact="lost"]')).toHaveLength(4);
  });

  it('describes the stance and tracks the error slider (VAL-EDU-032/034)', () => {
    const { container } = render(<ContactGeometry />);
    const img = screen.getByRole('img');
    const id = img.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    const desc = container.querySelector(`[id="${CSS.escape(id!)}"]`);
    expect(desc?.textContent).toMatch(/Locomotion at 2\.0 mm/);
    expect(desc?.textContent).toMatch(/dashed simulated floor/);
    const details = container.querySelector(
      'details[data-chart-data][data-chart-form="state"]',
    );
    expect(details).toBeTruthy();
    expect(details?.querySelectorAll('dt').length).toBeGreaterThanOrEqual(3);
    fireEvent.change(errorSlider(), { target: { value: '25' } });
    const moved = container.querySelector('[data-chart-description]')
      ?.textContent ?? '';
    expect(moved).toMatch(/25\.0 mm/);
    expect(moved).not.toMatch(/stays stable/);
  });

  it('derives the margin qualifier from the gap between error and tolerance', () => {
    const { container } = render(<ContactGeometry />);
    const read = () =>
      container.querySelector('[data-chart-description]')?.textContent ?? '';
    const tolerance = SCENARIOS.locomotion.toleranceMm;
    // Default 2.0 mm of a 20 mm band: the margin is a number, not a hedge.
    expect(read()).toMatch(
      new RegExp(`${(tolerance - 2).toFixed(1)} mm of margin`),
    );
    // State 1: 19.9 mm is still inside the band, but only just; a
    // "well under" judgment would be false here.
    fireEvent.change(errorSlider(), { target: { value: '19.9' } });
    expect(read()).toMatch(/stays stable/);
    expect(read()).toMatch(/0\.1 mm of margin/);
    expect(read()).not.toMatch(/well under/);
    // State 2: past the band the ok branch, margin clause and all, is gone.
    fireEvent.change(errorSlider(), { target: { value: '25' } });
    expect(read()).not.toMatch(/of margin/);
  });
});
