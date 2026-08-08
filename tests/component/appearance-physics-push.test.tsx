import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AppearancePhysicsPush } from '@/components/interactive/appearance-physics-push';

function displacementCm(): number {
  const el = screen.getByTestId('displacement-readout');
  const value = Number.parseFloat(el.textContent ?? '');
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

describe('AppearancePhysicsPush', () => {
  it('renders the three layer toggles, force slider, push and reset controls', () => {
    render(<AppearancePhysicsPush />);
    expect(
      screen.getByRole('button', { name: /^appearance$/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: /^physics proxy$/i }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('button', { name: /^simulation$/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('slider', { name: /push force/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /push the mug/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getByTestId('displacement-readout')).toHaveTextContent(
      '0.0 cm',
    );
    expect(screen.getByTestId('push-test-note')).toBeInTheDocument();
  });

  it('push does nothing with only the appearance layer enabled', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(screen.getByRole('button', { name: /push the mug/i }));
    expect(displacementCm()).toBe(0);
    expect(screen.getByTestId('mug')).toHaveAttribute(
      'transform',
      'translate(80 0)',
    );
    expect(screen.getByTestId('push-test-note')).toHaveTextContent(
      /renderer is not a simulator/i,
    );
    expect(screen.getByTestId('push-count-readout')).toHaveTextContent('0');
  });

  it('enabling the physics proxy turns the same push into visible motion', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);

    // The push test: appearance alone first.
    const push = screen.getByRole('button', { name: /push the mug/i });
    await user.click(push);
    expect(displacementCm()).toBe(0);

    // Enable the physics proxy and push again.
    await user.click(screen.getByRole('button', { name: /^physics proxy$/i }));
    await user.click(push);
    const afterOne = displacementCm();
    expect(afterOne).toBeGreaterThan(1);
    expect(screen.getByTestId('push-count-readout')).toHaveTextContent('1');
    expect(screen.getByTestId('mug')).not.toHaveAttribute(
      'transform',
      'translate(80 0)',
    );
    expect(screen.getAllByTestId('motion-ghost').length).toBeGreaterThan(0);

    // A second push accumulates more displacement.
    await user.click(push);
    expect(displacementCm()).toBeGreaterThan(afterOne);
  });

  it('a larger force produces a larger displacement', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(screen.getByRole('button', { name: /^physics proxy$/i }));
    await user.click(screen.getByRole('button', { name: /push the mug/i }));
    const small = displacementCm();
    fireEvent.change(screen.getByRole('slider', { name: /push force/i }), {
      target: { value: '8' },
    });
    await user.click(screen.getByRole('button', { name: /push the mug/i }));
    expect(displacementCm()).toBeGreaterThan(small);
  });

  it('reset restores the initial state', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(screen.getByRole('button', { name: /^physics proxy$/i }));
    await user.click(screen.getByRole('button', { name: /push the mug/i }));
    expect(displacementCm()).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole('slider', { name: /push force/i }), {
      target: { value: '8' },
    });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(displacementCm()).toBe(0);
    expect(screen.getByTestId('push-count-readout')).toHaveTextContent('0');
    expect(screen.getByRole('slider', { name: /push force/i })).toHaveValue(
      '4',
    );
    expect(
      screen.getByRole('button', { name: /^physics proxy$/i }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('mug')).toHaveAttribute(
      'transform',
      'translate(80 0)',
    );
  });

  it('is deterministic: the same inputs reproduce the same displacement', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    const physics = screen.getByRole('button', { name: /^physics proxy$/i });
    const push = screen.getByRole('button', { name: /push the mug/i });
    await user.click(physics);
    await user.click(push);
    await user.click(push);
    const firstRun = displacementCm();
    await user.click(screen.getByRole('button', { name: /reset/i }));
    await user.click(physics);
    await user.click(push);
    await user.click(push);
    expect(displacementCm()).toBeCloseTo(firstRun, 10);
  });

  it('hides the appearance layer on toggle while motion state is preserved', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(screen.getByRole('button', { name: /^physics proxy$/i }));
    await user.click(screen.getByRole('button', { name: /push the mug/i }));
    await user.click(screen.getByRole('button', { name: /^appearance$/i }));
    expect(screen.queryByTestId('mug-appearance')).not.toBeInTheDocument();
    expect(displacementCm()).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /^appearance$/i }));
    expect(screen.getByTestId('mug-appearance')).toBeInTheDocument();
  });

  it('renders the scene with an accessible description', () => {
    render(<AppearancePhysicsPush />);
    expect(
      screen.getByRole('img', { name: /three-layer scene/i }),
    ).toBeInTheDocument();
  });
});
