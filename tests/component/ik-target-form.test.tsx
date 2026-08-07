import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IkTargetForm } from '@/components/three/ik-target-form';

describe('IkTargetForm', () => {
  it('prefills the inputs from the current end-effector position', () => {
    render(
      <IkTargetForm
        defaultTarget={{ x: 0.2, y: 0.15, z: -0.05 }}
        hasTarget={false}
        onSolve={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByLabelText(/target x/i)).toHaveValue(0.2);
    expect(screen.getByLabelText(/target y/i)).toHaveValue(0.15);
    expect(screen.getByLabelText(/target z/i)).toHaveValue(-0.05);
  });

  it('submits parsed scene coordinates as the IK target', () => {
    const onSolve = vi.fn();
    render(
      <IkTargetForm
        defaultTarget={{ x: 0.2, y: 0.15, z: 0 }}
        hasTarget={false}
        onSolve={onSolve}
        onClear={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/target x/i), {
      target: { value: '0.12' },
    });
    fireEvent.click(screen.getByRole('button', { name: /solve to target/i }));
    expect(onSolve).toHaveBeenCalledWith({ x: 0.12, y: 0.15, z: 0 });
  });

  it('rejects non-numeric input with an inline error and no solve', () => {
    const onSolve = vi.fn();
    render(
      <IkTargetForm
        defaultTarget={{ x: 0.2, y: 0.15, z: 0 }}
        hasTarget={false}
        onSolve={onSolve}
        onClear={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/target y/i), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: /solve to target/i }));
    expect(onSolve).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/finite number/i);
  });

  it('offers a clear-target action once a target exists', () => {
    const onClear = vi.fn();
    render(
      <IkTargetForm
        defaultTarget={{ x: 0.2, y: 0.15, z: 0 }}
        hasTarget={true}
        onSolve={() => {}}
        onClear={onClear}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /clear target/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
