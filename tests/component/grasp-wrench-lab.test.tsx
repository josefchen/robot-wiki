import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GraspWrenchLab } from '@/components/interactive/grasp-wrench-lab';
import {
  CONTACT_POSITION_MAX,
  CONTACT_POSITION_MIN,
  CONTACT_POSITION_STEP,
  DEFAULT_CONTACTS,
  DEFAULT_MU,
} from '@/lib/grasp';

function readout(id: string) {
  return screen.getByTestId(id).textContent ?? '';
}

describe('GraspWrenchLab', () => {
  it('renders both views, the controls, and the readouts', () => {
    render(<GraspWrenchLab />);
    expect(screen.getByTestId('grasp-object-view')).toBeInTheDocument();
    expect(screen.getByTestId('grasp-wrench-view')).toBeInTheDocument();
    expect(
      screen.getByRole('slider', { name: /friction coefficient/i }),
    ).toBeInTheDocument();
    for (let i = 1; i <= DEFAULT_CONTACTS.length; i += 1) {
      expect(
        screen.getByRole('slider', { name: new RegExp(`contact ${i} position`, 'i') }),
      ).toBeInTheDocument();
    }
    expect(
      screen.getByRole('button', { name: /add a contact/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /remove the last contact/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(readout('grasp-contacts-readout')).toBe('3');
    expect(readout('grasp-mu-value')).toBe(DEFAULT_MU.toFixed(2));
    expect(readout('grasp-closure-readout')).toBe('yes');
    expect(Number.parseFloat(readout('grasp-epsilon-readout'))).toBeGreaterThan(0);
  });

  it('authors every default on the declared contact step grid', () => {
    render(<GraspWrenchLab />);
    for (let i = 0; i < DEFAULT_CONTACTS.length; i += 1) {
      const slider = screen.getByRole('slider', {
        name: new RegExp(`contact ${i + 1} position`, 'i'),
      });
      expect(slider).toHaveAttribute('min', String(CONTACT_POSITION_MIN));
      expect(slider).toHaveAttribute('max', String(CONTACT_POSITION_MAX));
      expect(slider).toHaveAttribute('step', String(CONTACT_POSITION_STEP));
      expect(slider).toHaveValue(DEFAULT_CONTACTS[i].toString());
      expect(readout(`grasp-contact-${i + 1}-value`)).toBe(
        DEFAULT_CONTACTS[i].toFixed(3),
      );
    }
  });

  it('shrinks the wrench hull readout as friction drops', () => {
    render(<GraspWrenchLab />);
    const before = Number.parseFloat(readout('grasp-epsilon-readout'));
    fireEvent.change(
      screen.getByRole('slider', { name: /friction coefficient/i }),
      { target: { value: '0.2' } },
    );
    expect(readout('grasp-mu-value')).toBe('0.20');
    const after = Number.parseFloat(readout('grasp-epsilon-readout'));
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
    expect(readout('grasp-closure-readout')).toBe('yes');
  });

  it('breaks force closure when the third contact is removed', () => {
    render(<GraspWrenchLab />);
    fireEvent.click(
      screen.getByRole('button', { name: /remove the last contact/i }),
    );
    expect(readout('grasp-contacts-readout')).toBe('2');
    expect(readout('grasp-closure-readout')).toBe('no');
    expect(readout('grasp-epsilon-readout')).toBe('0.000');
  });

  it('restores force closure when the pair is made antipodal again', () => {
    render(<GraspWrenchLab />);
    fireEvent.click(
      screen.getByRole('button', { name: /remove the last contact/i }),
    );
    expect(readout('grasp-closure-readout')).toBe('no');
    // Slide contact 2 from the right edge onto the bottom edge midpoint:
    // the pair is antipodal and the shared normal lies inside both cones.
    fireEvent.change(
      screen.getByRole('slider', { name: /contact 2 position/i }),
      { target: { value: '0.625' } },
    );
    expect(readout('grasp-closure-readout')).toBe('yes');
    expect(Number.parseFloat(readout('grasp-epsilon-readout'))).toBeGreaterThan(0);
  });

  it('adds a fourth contact and grows the hull', () => {
    render(<GraspWrenchLab />);
    const before = Number.parseFloat(readout('grasp-epsilon-readout'));
    fireEvent.click(screen.getByRole('button', { name: /add a contact/i }));
    expect(readout('grasp-contacts-readout')).toBe('4');
    expect(
      screen.getByRole('slider', { name: /contact 4 position/i }),
    ).toBeInTheDocument();
    expect(
      Number.parseFloat(readout('grasp-epsilon-readout')),
    ).toBeGreaterThan(before);
  });

  it('never removes below two contacts', () => {
    render(<GraspWrenchLab />);
    const remove = screen.getByRole('button', {
      name: /remove the last contact/i,
    });
    fireEvent.click(remove);
    fireEvent.click(remove);
    expect(readout('grasp-contacts-readout')).toBe('2');
  });

  it('reset restores the default grasp, friction, and readouts', () => {
    render(<GraspWrenchLab />);
    fireEvent.change(
      screen.getByRole('slider', { name: /friction coefficient/i }),
      { target: { value: '0.2' } },
    );
    // Park contact 1 on top of contact 2 (right edge midpoint): a duplicate
    // position, robustly non-closure once the third contact is gone.
    fireEvent.change(
      screen.getByRole('slider', { name: /contact 1 position/i }),
      { target: { value: '0.875' } },
    );
    fireEvent.click(
      screen.getByRole('button', { name: /remove the last contact/i }),
    );
    expect(readout('grasp-closure-readout')).toBe('no');
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(readout('grasp-contacts-readout')).toBe('3');
    expect(readout('grasp-mu-value')).toBe(DEFAULT_MU.toFixed(2));
    expect(readout('grasp-closure-readout')).toBe('yes');
    for (let i = 0; i < DEFAULT_CONTACTS.length; i += 1) {
      expect(readout(`grasp-contact-${i + 1}-value`)).toBe(
        DEFAULT_CONTACTS[i].toFixed(3),
      );
    }
  });

  it('labels every control for assistive technology', () => {
    render(<GraspWrenchLab />);
    expect(
      screen.getByRole('slider', { name: /friction coefficient/i }),
    ).toHaveAccessibleName();
    expect(screen.getByTestId('grasp-object-view')).toHaveAttribute(
      'role',
      'img',
    );
    expect(screen.getByTestId('grasp-wrench-view')).toHaveAttribute(
      'role',
      'img',
    );
  });
});
