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

  it('reset restores the default degradation', async () => {
    const user = userEvent.setup();
    render(<TeacherStudent />);
    const initial = screen.getByTestId('divergence-readout').textContent;
    fireEvent.change(slider(), { target: { value: '100' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('divergence-readout').textContent).toBe(initial);
  });
});
