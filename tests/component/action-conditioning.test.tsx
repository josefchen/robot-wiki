import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ActionConditioning } from '@/components/interactive/action-conditioning';

function sensitivity(): number {
  const value = Number.parseFloat(screen.getByTestId('sensitivity-readout').textContent ?? '');
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

function finalBlockX(panel: 'a' | 'b'): number {
  return Number(screen.getByTestId(`block-${panel}-4`).getAttribute('x'));
}

const model = (name: RegExp) => screen.getByRole('button', { name });
const listens = () => model(/^listens to the action$/i);
const ignores = () => model(/^ignores the action$/i);

function adjustFold(container: HTMLElement): HTMLElement {
  return container.querySelector<HTMLElement>('[data-figure-fold="adjust"]')!;
}

function command(container: HTMLElement, group: 'First command' | 'Second command', name: RegExp) {
  const fold = adjustFold(container);
  return within(within(fold).getByRole('group', { name: group })).getByRole('button', { name });
}

describe('ActionConditioning', () => {
  it('shows the video-model choice, with both command pickers and reset under "Adjust more"', () => {
    const { container } = render(<ActionConditioning />);
    expect(listens()).toHaveAttribute('aria-pressed', 'true');
    expect(ignores()).toHaveAttribute('aria-pressed', 'false');
    const fold = adjustFold(container);
    expect(within(fold).getByRole('group', { name: 'First command' })).toBeInTheDocument();
    expect(within(fold).getByRole('group', { name: 'Second command' })).toBeInTheDocument();
    expect(command(container, 'First command', /^push left$/i)).toHaveAttribute('aria-pressed', 'true');
    expect(command(container, 'Second command', /^lift gripper$/i)).toHaveAttribute('aria-pressed', 'true');
    expect(within(fold).getByRole('button', { name: /^reset$/i })).toBeInTheDocument();
  });

  it('draws one start frame and two labelled futures, and the first frame states the insight', () => {
    render(<ActionConditioning />);
    expect(screen.getByTestId('initial-frame')).toHaveTextContent(/now/i);
    expect(screen.getByTestId('rollout-panel-a')).toHaveTextContent(/push left/i);
    expect(screen.getByTestId('rollout-panel-b')).toHaveTextContent(/lift gripper/i);
    expect(screen.getByTestId('action-note')).toHaveTextContent(/two different futures/i);
    expect(screen.getByTestId('action-note')).toHaveTextContent(/the model is listening/i);
    expect(sensitivity()).toBeCloseTo(0.419, 3);
    expect(finalBlockX('a')).not.toBe(finalBlockX('b'));
  });

  it('collapses both futures when the model ignores the action, while realism stays the same', async () => {
    const user = userEvent.setup();
    render(<ActionConditioning />);
    expect(screen.getByTestId('realism-readout')).toHaveTextContent('0.91');
    await user.click(ignores());
    expect(ignores()).toHaveAttribute('aria-pressed', 'true');
    expect(sensitivity()).toBeLessThan(0.3);
    expect(Math.abs(finalBlockX('a') - finalBlockX('b'))).toBeLessThan(5);
    expect(screen.getByTestId('action-note')).toHaveTextContent(/same future for both commands/i);
    expect(screen.getByTestId('action-note')).toHaveTextContent(/ignored the robot/i);
    expect(screen.getByTestId('realism-readout')).toHaveTextContent('0.91');
  });

  it('reproduces the same score when the same commands are chosen again', async () => {
    const user = userEvent.setup();
    const { container } = render(<ActionConditioning />);
    const first = sensitivity();
    await user.click(command(container, 'Second command', /^push right$/i));
    expect(sensitivity()).not.toBe(first);
    await user.click(command(container, 'Second command', /^lift gripper$/i));
    expect(sensitivity()).toBe(first);
  });

  it('says the futures match by definition when both commands are the same', async () => {
    const user = userEvent.setup();
    const { container } = render(<ActionConditioning />);
    await user.click(command(container, 'Second command', /^push left$/i));
    expect(sensitivity()).toBe(0);
    expect(screen.getByTestId('action-note')).toHaveTextContent(/same command twice/i);
    expect(container.querySelector('[data-chart-description]')?.textContent).toMatch(/same by definition/);
  });

  it('reset restores the default commands and the listening model', async () => {
    const user = userEvent.setup();
    const { container } = render(<ActionConditioning />);
    await user.click(ignores());
    await user.click(command(container, 'First command', /^push right$/i));
    await user.click(within(adjustFold(container)).getByRole('button', { name: /^reset$/i }));
    expect(listens()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('rollout-panel-a')).toHaveTextContent(/push left/i);
    expect(screen.getByTestId('rollout-panel-b')).toHaveTextContent(/lift gripper/i);
    expect(sensitivity()).toBeCloseTo(0.419, 3);
  });

  it('keeps the method, the scores and the open state description in "How this was made"', () => {
    const { container } = render(<ActionConditioning />);
    const method = container.querySelector<HTMLElement>('[data-figure-fold="method"]')!;
    expect(method).toHaveTextContent(/average distance between the two imagined futures/i);
    expect(within(method).getByTestId('sensitivity-readout')).toHaveTextContent('0.419');
    expect(within(method).getByTestId('realism-readout')).toHaveTextContent('0.91');
    expect(method).toHaveTextContent(/hand-set/i);
    const details = method.querySelector<HTMLDetailsElement>('details[data-chart-form="state"]');
    expect(details?.open).toBe(true);
  });

  it('describes the current pair through one stage and tracks the model choice', async () => {
    const user = userEvent.setup();
    const { container } = render(<ActionConditioning />);
    const stage = screen.getByRole('img', { name: /one start frame splits into two imagined futures/i });
    const desc = container.querySelector(`[id="${stage.getAttribute('aria-describedby')}"]`);
    expect(desc?.textContent).toMatch(/lead to different futures across 4 imagined frames/);
    expect(desc?.textContent).toMatch(/action sensitivity is 0\.419, above the 0\.30 threshold/);
    await user.click(ignores());
    expect(container.querySelector(`[id="${stage.getAttribute('aria-describedby')}"]`)?.textContent)
      .toMatch(/lead to nearly the same future across 4 imagined frames: action sensitivity is 0\.017/);
  });
});
