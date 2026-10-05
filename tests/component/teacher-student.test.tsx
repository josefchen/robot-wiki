import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TeacherStudent } from '@/components/interactive/teacher-student';

function slider() {
  return screen.getByRole('slider', { name: /proprioceptive degradation/i });
}

function num(id: string) {
  const raw = screen.getByTestId(id).textContent ?? '0';
  return Number(raw.replace(/[^0-9.]/g, ''));
}

describe('TeacherStudent', () => {
  it('renders the teacher, student-input, and reconstruction panels with controls', () => {
    render(<TeacherStudent />);
    expect(screen.getByTestId('teacher-panel')).toBeInTheDocument();
    expect(screen.getByTestId('student-panel')).toBeInTheDocument();
    expect(screen.getByTestId('recon-panel')).toBeInTheDocument();
    expect(slider()).toBeInTheDocument();
    expect(screen.getByTestId('mae-readout')).toBeInTheDocument();
    expect(screen.getByTestId('divergence-readout')).toBeInTheDocument();
    expect(screen.getByTestId('occluded-readout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('divergence and reconstruction error rise as degradation increases', () => {
    render(<TeacherStudent />);
    fireEvent.change(slider(), { target: { value: '0' } });
    expect(num('mae-readout')).toBe(0);
    expect(num('divergence-readout')).toBe(0);
    fireEvent.change(slider(), { target: { value: '40' } });
    const midMae = num('mae-readout');
    const midDiv = num('divergence-readout');
    expect(midMae).toBeGreaterThan(0);
    expect(midDiv).toBeGreaterThan(0);
    fireEvent.change(slider(), { target: { value: '90' } });
    expect(num('mae-readout')).toBeGreaterThan(midMae);
    expect(num('divergence-readout')).toBeGreaterThan(midDiv);
  });

  it('more channels occlude at high degradation', () => {
    render(<TeacherStudent />);
    fireEvent.change(slider(), { target: { value: '10' } });
    const low = screen.getByTestId('occluded-readout').textContent ?? '';
    fireEvent.change(slider(), { target: { value: '95' } });
    const high = screen.getByTestId('occluded-readout').textContent ?? '';
    expect(high).not.toBe(low);
  });

  it('describes the three stacked panels and tracks degradation', () => {
    const { container } = render(<TeacherStudent />);
    const img = screen.getByRole('img');
    const id = img.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    const desc = container.querySelector(`[id="${CSS.escape(id!)}"]`);
    expect(desc?.textContent).toMatch(/15 percent proprioceptive degradation/);
    expect(desc?.textContent).toMatch(/already lost as gaps/);
    fireEvent.change(slider(), { target: { value: '90' } });
    const moved = container.querySelector('[data-chart-description]')
      ?.textContent ?? '';
    expect(moved).toMatch(/90 percent/);
    expect(moved).not.toMatch(/15 percent/);
  });

  it('reset restores the default degradation', async () => {
    const user = userEvent.setup();
    render(<TeacherStudent />);
    const initial = screen.getByTestId('divergence-readout').textContent;
    fireEvent.change(slider(), { target: { value: '100' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('divergence-readout').textContent).toBe(initial);
  });

  it('leads with the takeaway, three noise presets and the guess drawn on the real ground', async () => {
    const user = userEvent.setup();
    const { container } = render(<TeacherStudent />);
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'A blind robot feels the ground through its legs',
    );
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Teacher-student training');
    expect(screen.getByRole('button', { name: 'Some noise' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('robot-dog')).toBeInTheDocument();
    const note = container.querySelectorAll('[data-figure-annotation]');
    expect(note).toHaveLength(1);
    expect(note[0]).toHaveTextContent(/almost.*matches the real ground/);
    // The slider and Reset sit in Adjust more; the readouts in How this was made.
    expect(container.querySelector('details[data-figure-fold="adjust"]')).toContainElement(slider());
    expect(container.querySelector('details[data-figure-fold="method"]')).toContainElement(
      screen.getByTestId('mae-readout'),
    );
    // Height reads as height, and the shade agrees: the highest cell is the darkest.
    expect(container.querySelector('details[data-figure-fold="method"]')).toHaveTextContent(
      'Higher ground is drawn higher',
    );
    expect(container.querySelector('details[data-figure-fold="method"]')).toHaveTextContent(
      'Darker cells are higher terrain',
    );
    const cells = [...container.querySelectorAll('[data-terrain-cell]')];
    expect(cells).toHaveLength(24);
    const shade = (n: Element) => Number(n.getAttribute('fill-opacity'));
    const top = (n: Element) => Number(n.getAttribute('y'));
    const highest = cells.reduce((a, b) => (top(b) < top(a) ? b : a));
    const lowest = cells.reduce((a, b) => (top(b) > top(a) ? b : a));
    expect(shade(highest)).toBeGreaterThan(shade(lowest));
    expect(Math.max(...cells.map(shade))).toBe(shade(highest));
    await user.click(screen.getByRole('button', { name: 'Clean' }));
    expect(num('mae-readout')).toBe(0);
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent(/right on the real ground/);
    await user.click(screen.getByRole('button', { name: 'Very noisy' }));
    expect(slider()).toHaveValue('60');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent(/drifts from the real ground/);
  });
});
