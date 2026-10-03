import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PREDICTS_NOTE, WmDisambiguator } from '@/components/interactive/wm-disambiguator';
import { WM_PARADIGMS } from '@/lib/world-model-taxonomy';
import { symbolHits } from '@/lib/figure-main-view';

function panelButton(name: RegExp) {
  return within(screen.getByRole('group', { name: 'World-model paradigms' })).getByRole('button', { name });
}

const formButton = (name: string) => screen.getByRole('button', { name });

function chipFor(id: string) {
  return screen.getByTestId(`use-${id}`);
}

const describedText = (container: HTMLElement) =>
  container.querySelector('[data-chart-description]')?.textContent ?? '';

describe('WmDisambiguator', () => {
  it('shows one visible control and keeps the six groups, their uses and a reset under "Adjust more"', () => {
    const { container } = render(<WmDisambiguator />);
    for (const name of ['Pictures', 'Summary', 'Plain facts']) {
      expect(formButton(name)).toBeInTheDocument();
    }
    const adjust = container.querySelector('details[data-figure-fold="adjust"]') as HTMLElement;
    expect(adjust).not.toBeNull();
    for (const name of [/latent dynamics/i, /decoder-free/i, /generative video/i, /jepa/i, /world-action/i, /symbolic/i]) {
      expect(adjust).toContainElement(panelButton(name));
    }
    expect(adjust).toContainElement(screen.getByRole('button', { name: /reset/i }));
    for (const id of ['policy-learning', 'planning', 'evaluation', 'data-generation']) {
      expect(adjust).toContainElement(chipFor(id));
    }
  });

  it('opens on latent dynamics with the compressed summary marked and its own note', () => {
    render(<WmDisambiguator />);
    expect(formButton('Summary')).toHaveAttribute('aria-pressed', 'true');
    expect(panelButton(/latent dynamics/i)).toHaveAttribute('aria-pressed', 'true');
    const art = screen.getByTestId('panel-art-latent-dynamics');
    expect(art).toHaveAttribute('data-form', 'summary');
    expect(art).toHaveAttribute('role', 'img');
    expect(art).toHaveTextContent(/This model imagines only the summary;/);
    expect(art).toHaveTextContent(/it draws pictures only during training/);
    expect(chipFor('policy-learning')).toHaveAttribute('data-active', 'true');
    expect(chipFor('evaluation')).toHaveAttribute('data-active', 'false');
    expect(screen.getByTestId('selected-readout')).toHaveTextContent(/latent dynamics/i);
  });

  it("marks each group's own form on its drawing", () => {
    render(<WmDisambiguator />);
    const forms: Record<string, string> = {
      'latent-dynamics': 'summary',
      'decoder-free-latent': 'summary',
      'generative-video': 'pictures',
      jepa: 'summary',
      'world-action': 'pictures',
      symbolic: 'facts',
    };
    for (const p of WM_PARADIGMS) {
      const art = screen.getByTestId(`panel-art-${p.id}`);
      expect(art, p.id).toHaveAttribute('data-form', forms[p.id]);
      for (const label of ['Now', 'The next picture', 'A compressed summary', 'Plain facts', 'pick up the cup']) {
        expect(art, `${p.id} ${label}`).toHaveTextContent(label);
      }
    }
    expect(screen.getByTestId('panel-art-decoder-free-latent')).toHaveTextContent(
      /This model never draws the next picture;it only predicts the summary/,
    );
    expect(screen.getByTestId('panel-art-jepa')).toHaveTextContent(/compares its summary with the goal/);
    expect(within(screen.getByTestId('panel-art-world-action')).getByTestId('next-moves')).toHaveTextContent('nextmoves');
    expect(screen.getAllByTestId('next-moves')).toHaveLength(1);
  });

  it('picking a form selects its first group and keeps a group that already has that form', async () => {
    const user = userEvent.setup();
    render(<WmDisambiguator />);
    await user.click(formButton('Pictures'));
    expect(panelButton(/generative video/i)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('panel-art-generative-video')).toHaveAttribute('role', 'img');
    await user.click(panelButton(/jepa/i));
    expect(formButton('Summary')).toHaveAttribute('aria-pressed', 'true');
    await user.click(formButton('Summary'));
    expect(screen.getByTestId('selected-readout')).toHaveTextContent('JEPA');
    await user.click(formButton('Plain facts'));
    expect(screen.getByTestId('selected-readout')).toHaveTextContent('Symbolic');
    expect(chipFor('planning')).toHaveAttribute('data-active', 'true');
  });

  it("selecting a group highlights that group's uses", async () => {
    const user = userEvent.setup();
    render(<WmDisambiguator />);
    await user.click(panelButton(/generative video/i));
    expect(panelButton(/generative video/i)).toHaveAttribute('aria-pressed', 'true');
    expect(panelButton(/latent dynamics/i)).toHaveAttribute('aria-pressed', 'false');
    expect(chipFor('data-generation')).toHaveAttribute('data-active', 'true');
    expect(chipFor('evaluation')).toHaveAttribute('data-active', 'true');
    expect(chipFor('planning')).toHaveAttribute('data-active', 'false');
    expect(screen.getByText('Not used for')).toBeInTheDocument();
    expect(screen.getByTestId('selected-readout')).toHaveTextContent(/generative video/i);
  });

  it('JEPA selection highlights planning and not data generation', async () => {
    const user = userEvent.setup();
    render(<WmDisambiguator />);
    await user.click(panelButton(/jepa/i));
    expect(chipFor('planning')).toHaveAttribute('data-active', 'true');
    expect(chipFor('data-generation')).toHaveAttribute('data-active', 'false');
  });

  it('reset restores the default selection', async () => {
    const user = userEvent.setup();
    render(<WmDisambiguator />);
    await user.click(panelButton(/symbolic/i));
    expect(formButton('Plain facts')).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(panelButton(/latent dynamics/i)).toHaveAttribute('aria-pressed', 'true');
    expect(formButton('Summary')).toHaveAttribute('aria-pressed', 'true');
    expect(chipFor('policy-learning')).toHaveAttribute('data-active', 'true');
  });

  it('exposes what each paradigm predicts as real text (VAL-EDU-037)', () => {
    render(<WmDisambiguator />);
    for (const paradigm of WM_PARADIGMS) {
      const text = screen.getByTestId(`predicts-${paradigm.id}`);
      expect(text).toHaveTextContent(`Predicts ${PREDICTS_NOTE[paradigm.id]}`);
      expect(text.textContent).not.toMatch(/[+/]/);
      expect(text).not.toHaveAttribute('aria-hidden');
      expect(panelButton(new RegExp(`^${paradigm.short}: predicts `))).toBeInTheDocument();
    }
    expect(screen.getByTestId('panel-art-latent-dynamics')).not.toHaveAttribute('aria-hidden');
    expect(screen.getByTestId('panel-art-jepa')).toHaveAttribute('aria-hidden', 'true');
  });

  it('describes the selected stage and tracks the selected group', async () => {
    const user = userEvent.setup();
    const { container } = render(<WmDisambiguator />);
    const selected = screen.getByRole('img', { name: /robot arm above a cup/i });
    expect(selected).toHaveAccessibleName(/Latent dynamics imagines a compressed summary/);
    const id = selected.getAttribute('aria-describedby');
    const desc = container.querySelector(`[id="${CSS.escape(id!)}"]`);
    expect(desc?.textContent).toMatch(/Dreamer-style/);
    expect(desc?.textContent).toMatch(/one of 3 groups out of 6 that imagine a compressed summary/);
    await user.click(panelButton(/jepa/i));
    expect(describedText(container)).toMatch(/never pixels/);
    expect(describedText(container)).toMatch(/it serves planning\./);
    await user.click(panelButton(/symbolic/i));
    expect(describedText(container)).toMatch(/the only group of the 6 that imagines plain facts/);
    expect(screen.getByTestId('panel-art-symbolic')).not.toHaveAttribute('aria-hidden');
    expect(screen.getByTestId('panel-art-latent-dynamics')).toHaveAttribute('aria-hidden', 'true');
  });

  it('announces the selection and its uses in the live region', async () => {
    const user = userEvent.setup();
    render(<WmDisambiguator />);
    expect(screen.getByTestId('wm-live-summary')).toHaveTextContent(/policy learning/i);
    expect(screen.getByTestId('wm-live-summary')).toHaveTextContent(/Imagines a compressed summary/);
    await user.click(panelButton(/world-action/i));
    expect(screen.getByTestId('wm-live-summary')).toHaveTextContent(/world-action/i);
    expect(screen.getByTestId('wm-live-summary')).toHaveTextContent(/Imagines the next picture/);
  });

  it('keeps symbols and bare units out of the main view in every group', async () => {
    const user = userEvent.setup();
    const { container } = render(<WmDisambiguator />);
    const frame = container.querySelector('[data-figure-frame="wm-disambiguator"]') as HTMLElement;
    for (const p of WM_PARADIGMS) {
      await user.click(panelButton(new RegExp(`^${p.short}:`)));
      const art = screen.getByTestId(`panel-art-${p.id}`);
      const lines = [
        ...Array.from(frame.querySelectorAll('[data-figure-kicker], [data-figure-title], [data-figure-caption], [data-figure-source], [data-figure-status]')),
        ...Array.from(art.querySelectorAll('text')),
        ...Array.from(frame.querySelectorAll('[data-preset-group]')),
      ].map((el) => el.textContent ?? '');
      expect(lines.flatMap(symbolHits), p.id).toEqual([]);
    }
  });
});
