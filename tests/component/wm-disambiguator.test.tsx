import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { WmDisambiguator } from '@/components/interactive/wm-disambiguator';
import { WM_PARADIGMS } from '@/lib/world-model-taxonomy';

function panelButton(name: RegExp) {
  return screen.getByRole('button', { name });
}

function useChip(id: string) {
  return screen.getByTestId(`use-${id}`);
}

describe('WmDisambiguator', () => {
  it('renders six paradigm panels, the four use chips, and a reset control', () => {
    render(<WmDisambiguator />);
    expect(panelButton(/latent dynamics/i)).toBeInTheDocument();
    expect(panelButton(/decoder-free/i)).toBeInTheDocument();
    expect(panelButton(/generative video/i)).toBeInTheDocument();
    expect(panelButton(/jepa/i)).toBeInTheDocument();
    expect(panelButton(/world-action/i)).toBeInTheDocument();
    expect(panelButton(/symbolic/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(useChip('policy-learning')).toBeInTheDocument();
    expect(useChip('planning')).toBeInTheDocument();
    expect(useChip('evaluation')).toBeInTheDocument();
    expect(useChip('data-generation')).toBeInTheDocument();
  });

  it('each panel visualizes what its paradigm predicts', () => {
    render(<WmDisambiguator />);
    // Latent vector + reward scalar for Dreamer-style.
    expect(screen.getByTestId('panel-art-latent-dynamics')).toHaveTextContent(
      /r =/,
    );
    // MPPI fan and explicit no-image marker for TD-MPC-style.
    const decoderFree = screen.getByTestId('panel-art-decoder-free-latent');
    expect(decoderFree).toHaveTextContent(/no image/i);
    expect(decoderFree).toHaveTextContent(/MPPI/i);
    // Explicit no-decoder marker for JEPA.
    expect(screen.getByTestId('panel-art-jepa')).toHaveTextContent(
      /no decoder/i,
    );
    // Predicate list for the symbolic paradigm.
    expect(screen.getByTestId('panel-art-symbolic')).toHaveTextContent(
      /on\(cup, table\)/,
    );
  });

  it('defaults to latent dynamics with policy learning highlighted', () => {
    render(<WmDisambiguator />);
    expect(panelButton(/latent dynamics/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(useChip('policy-learning')).toHaveAttribute('data-active', 'true');
    expect(useChip('evaluation')).toHaveAttribute('data-active', 'false');
    expect(screen.getByTestId('selected-readout')).toHaveTextContent(
      /latent dynamics/i,
    );
  });

  it('selecting a panel highlights that paradigm’s uses', async () => {
    const user = userEvent.setup();
    render(<WmDisambiguator />);
    await user.click(panelButton(/generative video/i));
    expect(panelButton(/generative video/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(panelButton(/latent dynamics/i)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(useChip('data-generation')).toHaveAttribute('data-active', 'true');
    expect(useChip('evaluation')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('selected-readout')).toHaveTextContent(
      /generative video/i,
    );
  });

  it('JEPA selection highlights planning and not data generation', async () => {
    const user = userEvent.setup();
    render(<WmDisambiguator />);
    await user.click(panelButton(/jepa/i));
    expect(useChip('planning')).toHaveAttribute('data-active', 'true');
    expect(useChip('data-generation')).toHaveAttribute('data-active', 'false');
  });

  it('reset restores the default selection', async () => {
    const user = userEvent.setup();
    render(<WmDisambiguator />);
    await user.click(panelButton(/symbolic/i));
    expect(panelButton(/symbolic/i)).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(panelButton(/latent dynamics/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(useChip('policy-learning')).toHaveAttribute('data-active', 'true');
  });

  it('exposes what each paradigm predicts as real text (VAL-EDU-037)', () => {
    render(<WmDisambiguator />);
    for (const paradigm of WM_PARADIGMS) {
      const text = screen.getByTestId(`predicts-${paradigm.id}`);
      expect(text).toHaveTextContent(paradigm.predicts);
      expect(text).not.toHaveAttribute('aria-hidden');
    }
    expect(screen.getByTestId('panel-art-latent-dynamics')).not.toHaveAttribute(
      'aria-hidden',
    );
    expect(screen.getByTestId('panel-art-jepa')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('describes the selected panel and tracks paradigm buttons', async () => {
    const user = userEvent.setup();
    const { container } = render(<WmDisambiguator />);
    const selected = screen.getByRole('img', { name: /latent-dynamics panel art/i });
    const id = selected.getAttribute('aria-describedby');
    const desc = container.querySelector(`[id="${CSS.escape(id!)}"]`);
    expect(desc?.textContent).toMatch(/Dreamer-style/);
    expect(desc?.textContent).toMatch(/reward of 0\.83/);
    await user.click(panelButton(/jepa/i));
    expect(
      container.querySelector('[data-chart-description]')?.textContent,
    ).toMatch(/dist 0\.31/);
    expect(screen.getByTestId('panel-art-jepa')).not.toHaveAttribute(
      'aria-hidden',
    );
    expect(screen.getByTestId('panel-art-latent-dynamics')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('announces the selection and its uses in the live region', async () => {
    const user = userEvent.setup();
    render(<WmDisambiguator />);
    const live = screen.getByTestId('wm-live-summary');
    expect(live).toHaveTextContent(/policy learning/i);
    await user.click(panelButton(/world-action/i));
    expect(screen.getByTestId('wm-live-summary')).toHaveTextContent(
      /world-action/i,
    );
  });
});
