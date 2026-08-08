import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ContactGeometry } from '@/components/interactive/contact-geometry';

function scenarioButton(name: RegExp) {
  return screen.getByRole('button', { name });
}

describe('ContactGeometry', () => {
  it('renders the scenario controls, error slider, readouts, and reset', () => {
    render(<ContactGeometry />);
    expect(
      screen.getByRole('group', { name: /scenario/i }),
    ).toBeInTheDocument();
    expect(scenarioButton(/locomotion/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(scenarioButton(/manipulation/i)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(
      screen.getByRole('slider', { name: /contact-model error/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('contact-count-readout')).toBeInTheDocument();
    expect(screen.getByTestId('patch-readout')).toBeInTheDocument();
    expect(screen.getByTestId('tolerance-readout')).toBeInTheDocument();
    expect(screen.getByTestId('error-readout')).toBeInTheDocument();
    expect(screen.getByTestId('outcome-readout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('defaults to the locomotion scenario with a survivable 2 mm error', () => {
    render(<ContactGeometry />);
    expect(screen.getByTestId('contact-count-readout')).toHaveTextContent(
      '4',
    );
    expect(screen.getByTestId('error-readout')).toHaveTextContent('2.0 mm');
    expect(screen.getByTestId('outcome-readout')).toHaveTextContent(
      /stable/i,
    );
  });

  it('switching to manipulation raises the contact count and jams at the same error', async () => {
    const user = userEvent.setup();
    render(<ContactGeometry />);
    await user.click(scenarioButton(/manipulation/i));
    expect(scenarioButton(/manipulation/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const count = Number(
      screen.getByTestId('contact-count-readout').textContent,
    );
    expect(count).toBeGreaterThan(4);
    expect(screen.getByTestId('outcome-readout')).toHaveTextContent(
      /jammed/i,
    );
    expect(screen.getByTestId('tolerance-readout')).toHaveTextContent(
      '0.5 mm',
    );
  });

  it('the error slider flips locomotion past its tolerance', () => {
    render(<ContactGeometry />);
    fireEvent.change(
      screen.getByRole('slider', { name: /contact-model error/i }),
      { target: { value: '25' } },
    );
    expect(screen.getByTestId('error-readout')).toHaveTextContent('25.0 mm');
    expect(screen.getByTestId('outcome-readout')).not.toHaveTextContent(
      /stable/i,
    );
  });

  it('manipulation seats the peg when the error is below clearance', async () => {
    const user = userEvent.setup();
    render(<ContactGeometry />);
    await user.click(scenarioButton(/manipulation/i));
    fireEvent.change(
      screen.getByRole('slider', { name: /contact-model error/i }),
      { target: { value: '0.2' } },
    );
    expect(screen.getByTestId('outcome-readout')).toHaveTextContent(/seats/i);
  });

  it('reset restores the default scenario and error', async () => {
    const user = userEvent.setup();
    render(<ContactGeometry />);
    await user.click(scenarioButton(/manipulation/i));
    fireEvent.change(
      screen.getByRole('slider', { name: /contact-model error/i }),
      { target: { value: '12' } },
    );
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(scenarioButton(/locomotion/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('error-readout')).toHaveTextContent('2.0 mm');
    expect(screen.getByTestId('contact-count-readout')).toHaveTextContent(
      '4',
    );
  });

  it('renders one contact marker per scenario contact', async () => {
    const user = userEvent.setup();
    render(<ContactGeometry />);
    expect(screen.getAllByTestId(/^contact-marker-/).length).toBe(4);
    await user.click(scenarioButton(/manipulation/i));
    expect(
      screen.getAllByTestId(/^contact-marker-/).length,
    ).toBeGreaterThan(12);
  });
});
