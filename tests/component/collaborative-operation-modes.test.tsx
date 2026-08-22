import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CollaborativeOperationModes } from '@/components/interactive/collaborative-operation-modes';
import { TRANSIENT_CONTACT_LIMIT_LABEL } from '@/lib/force-limits';
import { MODES } from '@/lib/safety-modes';

const readout = (id: string) => screen.getByTestId(id).textContent?.trim() ?? '';

function robotSlider() {
  return screen.getByRole('slider', { name: /robot speed/i });
}

function humanSlider() {
  return screen.getByRole('slider', { name: /operator approach speed/i });
}

describe('CollaborativeOperationModes', () => {
  it('renders a button per mode, both sliders and a reset control', () => {
    render(<CollaborativeOperationModes />);
    for (const mode of MODES) {
      expect(screen.getByTestId(`mode-${mode.id}`)).toBeInTheDocument();
    }
    expect(robotSlider()).toBeInTheDocument();
    expect(humanSlider()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('opens on speed and separation monitoring with a live separation readout', () => {
    render(<CollaborativeOperationModes />);
    expect(screen.getByTestId('mode-speed-separation')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(readout('separation-readout')).toBe('1.42 m');
    expect(screen.queryByTestId('force-readout')).not.toBeInTheDocument();
  });

  it('shows the four composed terms of the separation equation', () => {
    render(<CollaborativeOperationModes />);
    expect(readout('term-human')).toBe('0.32 m');
    expect(readout('term-reaction')).toBe('0.10 m');
    expect(readout('term-braking')).toBe('0.05 m');
    expect(readout('term-margin')).toBe('0.95 m');
  });

  it('increases the separation readout strictly as the robot speed rises', () => {
    render(<CollaborativeOperationModes />);
    const seen: number[] = [];
    for (const v of ['0.25', '0.75', '1.25', '1.75']) {
      fireEvent.change(robotSlider(), { target: { value: v } });
      seen.push(Number.parseFloat(readout('separation-readout')));
    }
    for (let i = 1; i < seen.length; i += 1) {
      expect(seen[i]!).toBeGreaterThan(seen[i - 1]!);
    }
  });

  it('increases the separation readout as the operator approaches faster', () => {
    render(<CollaborativeOperationModes />);
    fireEvent.change(humanSlider(), { target: { value: '0.5' } });
    const slow = Number.parseFloat(readout('separation-readout'));
    fireEvent.change(humanSlider(), { target: { value: '2' } });
    expect(Number.parseFloat(readout('separation-readout'))).toBeGreaterThan(slow);
  });

  it('replaces the separation readout with a force readout and a labelled limit', async () => {
    const user = userEvent.setup();
    render(<CollaborativeOperationModes />);
    await user.click(screen.getByTestId('mode-power-force'));
    expect(screen.queryByTestId('separation-readout')).not.toBeInTheDocument();
    expect(screen.getByTestId('force-readout')).toBeInTheDocument();
    expect(readout('force-limit-readout')).toBe('255 N');
  });

  it('renders the force limit label from the shared module verbatim', async () => {
    const user = userEvent.setup();
    render(<CollaborativeOperationModes />);
    await user.click(screen.getByTestId('mode-power-force'));
    expect(readout('force-limit-label')).toBe(TRANSIENT_CONTACT_LIMIT_LABEL);
  });

  it('states a constraint rather than a number for the two procedural modes', async () => {
    const user = userEvent.setup();
    render(<CollaborativeOperationModes />);
    for (const id of ['monitored-stop', 'hand-guiding'] as const) {
      await user.click(screen.getByTestId(`mode-${id}`));
      expect(screen.queryByTestId('separation-readout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('force-readout')).not.toBeInTheDocument();
      expect(readout('stated-readout')).toMatch(/no distance or force budget/i);
    }
  });

  it('gives each mode its own explanatory constraint sentence', async () => {
    const user = userEvent.setup();
    render(<CollaborativeOperationModes />);
    const seen = new Set<string>();
    for (const mode of MODES) {
      await user.click(screen.getByTestId(`mode-${mode.id}`));
      const text = readout('mode-constraint');
      expect(text).toContain(mode.name);
      seen.add(text);
    }
    expect(seen.size).toBe(MODES.length);
  });

  it('flags a safety-rated stop once the separation distance overruns the cell', () => {
    render(<CollaborativeOperationModes />);
    expect(screen.queryByTestId('stopped-label')).not.toBeInTheDocument();
    fireEvent.change(robotSlider(), { target: { value: '2' } });
    expect(screen.getByTestId('stopped-label')).toBeInTheDocument();
  });

  it('names which modes the current settings satisfy', () => {
    render(<CollaborativeOperationModes />);
    const atDefault = readout('mode-verdict');
    expect(atDefault).toMatch(/contact-force limit/i);
    fireEvent.change(robotSlider(), { target: { value: '2' } });
    fireEvent.change(humanSlider(), { target: { value: '2' } });
    expect(readout('mode-verdict')).toMatch(/Neither continuous-motion mode/i);
  });

  it('restores the default mode and both speeds on reset', async () => {
    const user = userEvent.setup();
    render(<CollaborativeOperationModes />);
    await user.click(screen.getByTestId('mode-power-force'));
    fireEvent.change(robotSlider(), { target: { value: '1.75' } });
    fireEvent.change(humanSlider(), { target: { value: '0.5' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('mode-speed-separation')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(robotSlider()).toHaveValue('1');
    expect(humanSlider()).toHaveValue('1.6');
    expect(readout('separation-readout')).toBe('1.42 m');
  });

  it('exposes the chart description and a described SVG root', () => {
    const { container } = render(<CollaborativeOperationModes />);
    const svg = container.querySelector('svg[role="img"][aria-describedby]');
    expect(svg).not.toBeNull();
    const describedBy = svg!.getAttribute('aria-describedby')!;
    expect(document.getElementById(describedBy)?.textContent ?? '').toMatch(
      /protective separation distance/i,
    );
  });
});
