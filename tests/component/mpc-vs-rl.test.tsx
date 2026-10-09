import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MpcVsRl } from '@/components/interactive/mpc-vs-rl';
import { PERTURBATIONS } from '@/lib/mpc-vs-rl';

const SURPRISES = ['Sideways shove', 'Slippery patch', 'Heavy backpack', 'Weaker motors'];
const surprise = (name: string) => screen.getByRole('button', { name });

describe('MpcVsRl', () => {
  it('renders one plain-words surprise per scripted disturbance plus both drawn robots', () => {
    render(<MpcVsRl />);
    const group = screen.getByRole('group', { name: 'Surprise for the robot' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(SURPRISES);
    expect(SURPRISES).toHaveLength(PERTURBATIONS.length);
    expect(screen.getByTestId('perturbation-chart')).toBeInTheDocument();
    expect(screen.getByTestId('mpc-robot')).toBeInTheDocument();
    expect(screen.getByTestId('rl-robot')).toBeInTheDocument();
    expect(screen.getByTestId('mpc-status')).toBeInTheDocument();
    expect(screen.getByTestId('rl-status')).toBeInTheDocument();
    expect(screen.getByTestId('mpc-annotation')).toBeInTheDocument();
    expect(screen.getByTestId('rl-annotation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('compute-per-step readouts differ between the controllers', () => {
    render(<MpcVsRl />);
    const mpc = screen.getByTestId('mpc-compute').textContent;
    const rl = screen.getByTestId('rl-compute').textContent;
    expect(mpc).not.toBe(rl);
    expect(mpc).toMatch(/re-solve|optimiz/i);
    expect(rl).toMatch(/forward pass/i);
  });

  it('opens on the slippery patch, which trips the planner and not the randomized policy', () => {
    const { container } = render(<MpcVsRl />);
    expect(surprise('Slippery patch')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('mpc-status').textContent).toBe('falls');
    expect(screen.getByTestId('rl-status').textContent).toBe('stays up');
    expect(screen.getByTestId('mpc-annotation').textContent).toMatch(/friction|model/i);
    // Each robot is named by how it decides, on the stage and in the verdict table.
    const stage = screen.getByTestId('perturbation-chart');
    expect(stage).toHaveTextContent('Plans ahead');
    expect(stage).toHaveTextContent('Learned by practice');
    expect(stage).not.toHaveTextContent(/planner|reflex/i);
    expect(within(screen.getByTestId('mpc-verdicts')).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Surprise',
      'Plans ahead',
      'Learned by practice',
    ]);
    // The table has a name for a reader who lands on it (VAL-B2-ART-008).
    expect(screen.getByRole('table', { name: 'Which robot stays up after each surprise' })).toBe(screen.getByTestId('mpc-verdicts'));
    // The note says why the planning robot falls, and its robot is the one at full ink, lying on its back.
    const note = container.querySelector('[data-figure-annotation]');
    expect(note?.textContent).toMatch(/plans for a grippy floor/);
    // Its arrow drops straight down onto that robot, in the planning robot's column above the ground line.
    const [tipX, tipY] = (note?.querySelector('[data-annotation-pointer] polygon')?.getAttribute('points') ?? '')
      .split(' ')[0]
      .split(',')
      .map(Number);
    expect(Math.abs(tipX - 88)).toBeLessThan(3);
    expect(tipY).toBeGreaterThan(90);
    expect(tipY).toBeLessThan(144);
    expect(container.querySelector('[data-series="mpc"]')).toHaveAttribute('data-focus', '');
    expect(container.querySelector('[data-series="rl"]')).not.toHaveAttribute('data-focus');
    expect(screen.getByTestId('mpc-robot').getAttribute('transform')).toMatch(/scale\(1 -1\)/);
    expect(screen.getByTestId('rl-robot').getAttribute('transform')).toBeNull();
  });

  it('a sideways shove is rejected cleanly by the planner and absorbed with a wobble by the policy', async () => {
    const user = userEvent.setup();
    render(<MpcVsRl />);
    await user.click(surprise('Sideways shove'));
    expect(screen.getByTestId('mpc-status').textContent).toBe('stays up');
    expect(screen.getByTestId('rl-status').textContent).toBe('stays up');
    // The traces differ, a clean decay against a wobble: the sampled table in the fold shows both.
    const rows = within(document.querySelector('details[data-chart-data]') as HTMLElement).getAllByRole('row').slice(1);
    expect(rows.some((row) => {
      const [mpc, rl] = within(row).getAllByRole('cell').map((cell) => cell.textContent);
      return mpc !== rl;
    })).toBe(true);
  });

  it('weaker motors trip the policy, and the focus moves to its line', async () => {
    const user = userEvent.setup();
    render(<MpcVsRl />);
    await user.click(surprise('Weaker motors'));
    expect(screen.getByTestId('mpc-status').textContent).toBe('stays up, but slower');
    expect(screen.getByTestId('rl-status').textContent).toBe('falls');
    expect(screen.getByTestId('rl-robot').closest('[data-series]')).toHaveAttribute('data-focus', '');
    expect(screen.getByTestId('rl-robot').getAttribute('transform')).toMatch(/scale\(1 -1\)/);
  });

  it('switching surprises updates the annotations and the marked verdict row', async () => {
    const user = userEvent.setup();
    render(<MpcVsRl />);
    const before = screen.getByTestId('mpc-annotation').textContent;
    await user.click(surprise('Heavy backpack'));
    expect(screen.getByTestId('mpc-annotation').textContent).not.toBe(before);
    const rows = within(screen.getByTestId('mpc-verdicts')).getAllByRole('row').slice(1);
    expect(rows.map((r) => r.textContent)).toEqual([
      'Sideways shovestays upstays up',
      'Slippery patchfallsstays up',
      'Heavy backpackstays up, body sagsstays up',
      'Weaker motorsstays up, but slowerfalls',
    ]);
    expect(rows.map((r) => r.hasAttribute('data-selected'))).toEqual([false, false, true, false]);
    // The page's one aria-current belongs to the navigation's current route.
    expect(rows.some((r) => r.hasAttribute('aria-current'))).toBe(false);
    // The marked row is set in bold only: no coloured bar for a first-time reader to decode.
    expect(rows[2].querySelector('th')).toHaveClass('font-semibold');
    expect(rows[2].querySelector('th')?.getAttribute('style')).toBeNull();
  });

  it('reset returns to the default surprise', async () => {
    const user = userEvent.setup();
    render(<MpcVsRl />);
    await user.click(surprise('Sideways shove'));
    expect(screen.getByTestId('mpc-status').textContent).toBe('stays up');
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('mpc-status').textContent).toMatch(/falls/i);
  });

  it('renders a table-form chart description that names compute figures and the illustrative traces', async () => {
    const user = userEvent.setup();
    const { container } = render(<MpcVsRl />);
    const desc = container.querySelector('[data-chart-description]');
    expect(desc?.textContent).toMatch(/both traces are an illustrative teaching model/i);
    expect(desc?.textContent).toMatch(/re-solves iLQR/i);
    expect(desc?.textContent).toMatch(/forward pass/i);
    const details = container.querySelector('details[data-chart-data]');
    expect(details).toHaveAttribute('data-chart-form', 'table');
    expect(details?.querySelectorAll('tbody tr').length).toBe(6);
    const before = desc?.textContent ?? '';
    await user.click(surprise('Heavy backpack'));
    expect(container.querySelector('[data-chart-description]')?.textContent).not.toBe(before);
  });
});
