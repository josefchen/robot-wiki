import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ActionConditioning } from '@/components/interactive/action-conditioning';
import { leverCss, leverOffset, plugTransform } from '@/components/iso/figures/twin-screen-console';

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

  it('draws one start frame and two futures fed by their own command levers, and states the insight', () => {
    render(<ActionConditioning />);
    // The start photo on top: the starting scene, block and gripper, with no words in the drawing.
    expect(screen.getByTestId('initial-frame')).toHaveAttribute('data-frame', 'now');
    expect(screen.getByTestId('initial-frame').querySelector('[data-part="block-earlier"]')).not.toBeNull();
    expect(screen.getByTestId('initial-frame').querySelector('[data-part="gripper"]')).not.toBeNull();
    expect(screen.getByTestId('initial-frame').textContent).toBe('');
    // Each screen plays its own command's future; the hint under the drawing names both screens.
    expect(screen.getByTestId('screen-a')).toHaveAttribute('data-command', 'push-left');
    expect(screen.getByTestId('screen-b')).toHaveAttribute('data-command', 'lift');
    expect(screen.getByTestId('screen-a').textContent).toBe('');
    expect(screen.getByTestId('screen-b').textContent).toBe('');
    expect(screen.getByTestId('rollout-panel-a')).toHaveTextContent(/^left screen: push left$/i);
    expect(screen.getByTestId('rollout-panel-b')).toHaveTextContent(/^right screen: lift gripper$/i);
    expect(screen.getByTestId('rollout-panel-a')).toHaveAttribute('data-command', 'push-left');
    expect(screen.getByTestId('rollout-panel-b')).toHaveAttribute('data-command', 'lift');
    expect(screen.getByTestId('rollout-panel-a').closest('[data-anatomy-hint]')).not.toBeNull();
    expect(screen.getByTestId('lever-a').style.transform).toBe(leverCss('push-left'));
    expect(screen.getByTestId('lever-b').style.transform).toBe(leverCss('lift'));
    expect(screen.getByRole('img', { name: /push left and lift gripper, from a video model that listens to the action/i })).toBeInTheDocument();
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
    // The ignoring model is the console with both plugs pulled; the meters read the same scores the method names.
    expect(screen.getByTestId('plug-a')).not.toHaveAttribute('data-seated');
    expect(screen.getByTestId('plug-b')).not.toHaveAttribute('data-seated');
    expect(screen.getByTestId('score-meters')).toHaveAttribute('data-sensitivity', '0.017');
    expect(screen.getByTestId('score-meters')).toHaveAttribute('data-realism', '0.91');
  });

  it('seats both plugs for the listening model, and the lever gate positions follow the commands', () => {
    const { container } = render(<ActionConditioning />);
    expect(screen.getByTestId('plug-a')).toHaveAttribute('data-seated');
    expect(screen.getByTestId('plug-a')).toHaveAttribute('transform', plugTransform(0));
    expect(screen.getByTestId('score-meters')).toHaveAttribute('data-sensitivity', '0.419');
    expect(leverOffset('push-left')[0]).toBeLessThan(0);
    expect(leverOffset('push-right')[0]).toBeGreaterThan(0);
    expect(leverOffset('lift')[1]).toBeLessThan(0);
    expect(container.querySelector('[data-readout]')).toHaveTextContent('action sensitivity 0.419 · realism 0.91');
  });

  it('plays the imagined frames from a reader control, never on its own', async () => {
    const user = userEvent.setup();
    const { container } = render(<ActionConditioning />);
    const play = screen.getByRole('button', { name: /play the futures/i });
    // A secondary action carries no pressed state: its label says what it does next.
    expect(play).not.toHaveAttribute('aria-pressed');
    expect(play).toHaveAttribute('data-brand-control-id', 'control:secondary-action');
    expect(screen.getByTestId('block-a-4')).toBeInTheDocument();
    await user.click(play);
    expect(screen.getByRole('button', { name: /^stop$/i })).toBe(play);
    expect(play).not.toHaveAttribute('aria-pressed');
    expect(container.querySelector('[data-readout]')).toHaveTextContent('start frame · realism 0.91');
    expect(screen.queryByTestId('block-a-4')).toBeNull();
    expect(screen.getByTestId('lever-a').style.transform).toBe(leverCss('neutral'));
    await user.click(screen.getByRole('button', { name: /^stop$/i }));
    expect(screen.getByTestId('block-a-4')).toBeInTheDocument();
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
    expect(screen.getByTestId('screen-a')).toHaveAttribute('data-command', 'push-left');
    expect(screen.getByTestId('screen-b')).toHaveAttribute('data-command', 'lift');
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
