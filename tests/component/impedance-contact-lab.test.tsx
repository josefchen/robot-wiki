import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImpedanceContactLab } from '@/components/interactive/impedance-contact-lab';
import { DEFAULT_PARAMS, SLIDER_SPECS } from '@/lib/impedance';

/** The rendered numeric peak-force readout, parsed, when numeric. */
function parsePeak(): number | null {
  const text =
    screen.getByTestId('impedance-peak-readout').textContent ?? '';
  const value = Number.parseFloat(text.replace(' N', ''));
  return Number.isFinite(value) ? value : null;
}

describe('ImpedanceContactLab', () => {
  it('renders on first paint with readouts, defaulting to torque control', () => {
    render(<ImpedanceContactLab />);
    expect(
      screen.getByTestId('impedance-hardware-torque'),
    ).toBeChecked();
    expect(screen.getByTestId('impedance-force-trace')).toBeTruthy();
    const peak = screen.getByTestId('impedance-peak-readout').textContent;
    expect(peak ?? '').toMatch(/\d/);
    expect(peak).not.toContain('NaN');
    expect(screen.getByTestId('impedance-steady-readout').textContent).toMatch(
      /\d/,
    );
  });

  it('stiffness slider moves the peak-force readout upward across its range', () => {
    render(<ImpedanceContactLab />);
    const slider = screen.getByTestId(
      'impedance-stiffness-slider',
    ) as HTMLInputElement;
    fireEventChange(slider, String(SLIDER_SPECS.stiffness.min));
    const soft = parsePeak();
    fireEventChange(slider, String(SLIDER_SPECS.stiffness.max));
    const hard = parsePeak();
    expect(soft).not.toBeNull();
    expect(hard).not.toBeNull();
    expect(soft!).toBeLessThan(hard!);
  });

  it('position mode disables K and D natively and reads unbounded; torque restores both', async () => {
    const user = userEvent.setup();
    render(<ImpedanceContactLab />);
    // torque -> position
    await user.click(screen.getByTestId('impedance-hardware-position'));
    const kPos = screen.getByTestId('impedance-stiffness-slider') as HTMLInputElement;
    const dPos = screen.getByTestId('impedance-damping-slider') as HTMLInputElement;
    expect(kPos.disabled).toBe(true);
    expect(dPos.disabled).toBe(true);
    expect(
      screen.getByTestId('impedance-peak-readout').textContent,
    ).not.toMatch(/\d/);
    expect(
      screen.getByTestId('impedance-peak-readout').textContent,
    ).toContain('unbounded');
    // position -> torque, same page load
    await user.click(screen.getByTestId('impedance-hardware-torque'));
    const kTor = screen.getByTestId('impedance-stiffness-slider') as HTMLInputElement;
    const dTor = screen.getByTestId('impedance-damping-slider') as HTMLInputElement;
    expect(kTor.disabled).toBe(false);
    expect(dTor.disabled).toBe(false);
    expect(
      screen.getByTestId('impedance-peak-readout').textContent,
    ).toMatch(/\d/);
  });

  it('reset restores the default hardware, gains and depth', async () => {
    const user = userEvent.setup();
    render(<ImpedanceContactLab />);
    await user.click(screen.getByTestId('impedance-hardware-position'));
    const depth = screen.getByTestId('impedance-depth-slider') as HTMLInputElement;
    fireEventChange(depth, '0.006');
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('impedance-hardware-torque')).toBeChecked();
    expect(
      (
        screen.getByTestId('impedance-depth-slider') as HTMLInputElement
      ).value,
    ).toBe(String(DEFAULT_PARAMS.depthM));
    expect(
      (
        screen.getByTestId('impedance-stiffness-slider') as HTMLInputElement
      ).value,
    ).toBe(String(DEFAULT_PARAMS.stiffnessKNPerM));
    expect(
      (
        screen.getByTestId('impedance-damping-slider') as HTMLInputElement
      ).value,
    ).toBe(String(DEFAULT_PARAMS.dampingNPerM));
  });

  it('native slider contract: range inputs with labels and accessible names', () => {
    render(<ImpedanceContactLab />);
    for (const id of ['depth', 'stiffness', 'damping']) {
      const input = screen.getByTestId(`impedance-${id}-slider`);
      expect(input.getAttribute('type')).toBe('range');
      expect(input.getAttribute('min')).toBeTruthy();
      expect(input.getAttribute('max')).toBeTruthy();
      expect(input.getAttribute('aria-label')).toMatch(/\d/);
    }
    // Hardware options all present in one radio group.
    for (const hw of ['position', 'torque', 'sea']) {
      expect(screen.getByTestId(`impedance-hardware-${hw}`).getAttribute('type')).toBe('radio');
    }
  });

  it('the force-limit reference line label names its research basis', () => {
    render(<ImpedanceContactLab />);
    const label =
      screen.getByTestId('impedance-limit-label').textContent ?? '';

    expect(label).toContain('contact-force limit');
    expect(label).toMatch(/research basis/i);
    // The caption carries a resolving citation chip for the basis.
    const chip = screen
      .getByTestId('impedance-lab')
      .querySelector('[data-cite-id="han-force-pain-2024"]');
    expect(chip).toBeTruthy();
  });
});

// jsdom does not fire real change events from userEvent.type on range
// inputs the way browsers do; set value + dispatch directly.
function fireEventChange(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
}
