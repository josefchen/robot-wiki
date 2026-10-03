import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AppearancePhysicsPush } from '@/components/interactive/appearance-physics-push';

function movedCm(): number {
  const value = Number.parseFloat(screen.getByTestId('displacement-readout').textContent ?? '');
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

const scene = (name: RegExp) => screen.getByRole('button', { name });
const push = () => screen.getByRole('button', { name: /push the mug/i });
const strength = () => screen.getByRole('slider', { name: /push strength/i });

describe('AppearancePhysicsPush', () => {
  it('shows the scene presets and the push, with strength, layers and reset under "Adjust more"', () => {
    const { container } = render(<AppearancePhysicsPush />);
    expect(scene(/^picture only$/i)).toHaveAttribute('aria-pressed', 'true');
    expect(scene(/^picture plus physics$/i)).toHaveAttribute('aria-pressed', 'false');
    expect(push()).toBeInTheDocument();
    const fold = container.querySelector<HTMLElement>('[data-figure-fold="adjust"]')!;
    expect(within(fold).getByRole('slider', { name: /push strength/i })).toHaveValue('4');
    expect(within(fold).getByRole('button', { name: /^picture$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(fold).getByRole('button', { name: /^shape, weight and friction$/i }))
      .toHaveAttribute('aria-pressed', 'false');
    expect(within(fold).getByRole('button', { name: /^physics solver$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(fold).getByRole('button', { name: /^reset$/i })).toBeInTheDocument();
    expect(screen.getByTestId('displacement-readout')).toHaveTextContent('0 centimetres');
    expect(screen.getByTestId('push-note')).toHaveTextContent(/only a picture/i);
  });

  it('push does nothing when the scene is only a picture', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(push());
    expect(movedCm()).toBe(0);
    expect(screen.getByTestId('mug')).toHaveAttribute('transform', 'translate(80 0)');
    expect(screen.getByTestId('push-test-note')).toHaveTextContent(/renderer is not a simulator/i);
    expect(screen.queryAllByTestId('motion-ghost')).toHaveLength(0);
  });

  it('picture plus physics turns the same push into visible motion', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(scene(/^picture plus physics$/i));
    expect(screen.getByTestId('displacement-readout')).toHaveTextContent('18.1 centimetres');
    expect(screen.getByTestId('mug')).not.toHaveAttribute('transform', 'translate(80 0)');
    expect(screen.getAllByTestId('motion-ghost')).toHaveLength(1);
    expect(screen.getByTestId('collision-hull')).toBeInTheDocument();
    expect(screen.getByTestId('push-note')).toHaveTextContent(/same push slides the mug/i);
    // A second push accumulates more displacement.
    await user.click(push());
    expect(screen.getByTestId('displacement-readout')).toHaveTextContent('36.2 centimetres');
    expect(screen.getAllByTestId('motion-ghost')).toHaveLength(2);
  });

  it('a stronger push slides the mug further', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(scene(/^picture plus physics$/i));
    const gentle = movedCm();
    fireEvent.change(strength(), { target: { value: '8' } });
    await user.click(push());
    expect(movedCm() - gentle).toBeGreaterThan(gentle);
  });

  it('reset restores the picture-only scene and the default strength', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(scene(/^picture plus physics$/i));
    fireEvent.change(strength(), { target: { value: '8' } });
    await user.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(movedCm()).toBe(0);
    expect(scene(/^picture only$/i)).toHaveAttribute('aria-pressed', 'true');
    expect(strength()).toHaveValue('4');
    expect(screen.getByTestId('mug')).toHaveAttribute('transform', 'translate(80 0)');
  });

  it('is deterministic: the same inputs reproduce the same displacement', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(scene(/^picture plus physics$/i));
    await user.click(push());
    const firstRun = movedCm();
    await user.click(screen.getByRole('button', { name: /^reset$/i }));
    await user.click(scene(/^picture plus physics$/i));
    await user.click(push());
    expect(movedCm()).toBeCloseTo(firstRun, 10);
  });

  it('with the solver off, shape, weight and friction alone do not move the mug', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(screen.getByRole('button', { name: /^shape, weight and friction$/i }));
    await user.click(screen.getByRole('button', { name: /^physics solver$/i }));
    await user.click(push());
    expect(movedCm()).toBe(0);
    expect(screen.getByTestId('push-note')).toHaveTextContent(/no solver/i);
    expect(scene(/^picture only$/i)).toHaveAttribute('aria-pressed', 'false');
    expect(scene(/^picture plus physics$/i)).toHaveAttribute('aria-pressed', 'false');
  });

  it('hides the picture layer on toggle while motion state is preserved', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(scene(/^picture plus physics$/i));
    await user.click(screen.getByRole('button', { name: /^picture$/i }));
    expect(screen.queryByTestId('mug-appearance')).not.toBeInTheDocument();
    expect(movedCm()).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /^picture$/i }));
    expect(screen.getByTestId('mug-appearance')).toBeInTheDocument();
  });

  it('renders the scene with an accessible description', () => {
    render(<AppearancePhysicsPush />);
    expect(screen.getByRole('img', { name: /mug on a table/i })).toBeInTheDocument();
  });

  it('describes the picture-only push and tracks the strength slider', () => {
    const { container } = render(<AppearancePhysicsPush />);
    const img = screen.getByRole('img', { name: /mug on a table/i });
    const id = img.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    const desc = container.querySelector(`[id="${CSS.escape(id!)}"]`);
    expect(desc?.textContent).toMatch(/a push of 4 newtons/);
    expect(desc?.textContent).toMatch(/leaves the mug at 0 centimetres/);
    fireEvent.change(strength(), { target: { value: '8' } });
    const moved = container.querySelector('[data-chart-description]')?.textContent ?? '';
    expect(moved).toMatch(/a push of 8 newtons/);
  });
});
