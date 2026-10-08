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
import { contactGridIndex } from '../helpers/grasp-contact-grid';

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
    const maxGridIndex = contactGridIndex(
      CONTACT_POSITION_MAX,
      CONTACT_POSITION_MIN,
      CONTACT_POSITION_STEP,
    );
    expect(maxGridIndex).toBe(199);
    for (let i = 0; i < DEFAULT_CONTACTS.length; i += 1) {
      const gridIndex = contactGridIndex(
        DEFAULT_CONTACTS[i],
        CONTACT_POSITION_MIN,
        CONTACT_POSITION_STEP,
      );
      const slider = screen.getByRole('slider', {
        name: new RegExp(`contact ${i + 1} position`, 'i'),
      });
      expect(gridIndex).toBeGreaterThanOrEqual(0);
      expect(gridIndex).toBeLessThanOrEqual(maxGridIndex);
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

describe('GraspWrenchLab main view', () => {
  const fold = (container: HTMLElement, kind: 'adjust' | 'method') =>
    container.querySelector(`details[data-figure-fold="${kind}"]`) as HTMLElement;

  it('leads with the takeaway and keeps two controls outside the folds', () => {
    const { container } = render(<GraspWrenchLab />);
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Three well-placed fingers hold firm against any push',
    );
    const surface = screen.getByRole('slider', { name: /^Surface: friction coefficient mu/ });
    expect(surface.closest('details')).toBeNull();
    expect(container.querySelector('label[for="grasp-mu"]')).toHaveTextContent(/^Surfacegrippy$/);
    const adjust = fold(container, 'adjust');
    for (const name of [/contact 1 position/i, /contact 3 position/i]) {
      expect(adjust).toContainElement(screen.getByRole('slider', { name }));
    }
    expect(adjust).toContainElement(screen.getByRole('button', { name: /add a contact/i }));
    expect(adjust).toContainElement(screen.getByRole('button', { name: /reset/i }));
    expect(adjust).toContainElement(screen.getByTestId('grasp-wrench-view'));
    const method = fold(container, 'method');
    for (const id of ['grasp-epsilon-readout', 'grasp-closure-readout', 'grasp-mu-value']) {
      expect(method).toContainElement(screen.getByTestId(id));
    }
    expect(method).toHaveTextContent('ε = 0.444');
  });

  it('draws eight resisted pushes and says the grip holds', () => {
    const { container } = render(<GraspWrenchLab />);
    expect(container.querySelectorAll('[data-push="resisted"]')).toHaveLength(8);
    expect(container.querySelectorAll('[data-push="slips"]')).toHaveLength(0);
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent(
      'Pushes from every direction areresisted: the grip holds',
    );
  });

  it('shows the pushes that slip once a finger is removed', () => {
    const { container } = render(<GraspWrenchLab />);
    fireEvent.click(screen.getByRole('button', { name: /remove the last contact/i }));
    expect(container.querySelectorAll('[data-push="resisted"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-push="slips"]')).toHaveLength(5);
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent(
      '5 of 8 pushes slip free:the grip fails',
    );
  });

  it('fills the grip-margin meter in proportion to epsilon', () => {
    render(<GraspWrenchLab />);
    const height = () => Number(screen.getByTestId('grasp-margin-fill').getAttribute('height'));
    const epsilon = () => Number.parseFloat(readout('grasp-epsilon-readout'));
    expect(height()).toBeCloseTo(epsilon() * 132, 1);
    fireEvent.change(screen.getByRole('slider', { name: /friction coefficient/i }), {
      target: { value: '1' },
    });
    expect(height()).toBeCloseTo(epsilon() * 132, 1);
    fireEvent.click(screen.getByRole('button', { name: /remove the last contact/i }));
    expect(height()).toBe(0);
  });

  it('moves a dragged fingertip to the edge under the pointer, on the slider grid', () => {
    const { container } = render(<GraspWrenchLab />);
    const stage = screen.getByTestId('grasp-object-view');
    stage.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 340, height: 266, right: 340, bottom: 266, x: 0, y: 0 }) as DOMRect;
    const grab = container.querySelector('[data-finger="1"] circle[pointer-events="all"]') as SVGElement;
    Object.assign(grab, { setPointerCapture: () => {} });
    fireEvent.pointerDown(grab, { pointerId: 1, clientX: 112, clientY: 108 });
    // Stage point (40, 154) is left of the box centre (112, 154): the left edge midpoint.
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 40, clientY: 154 });
    fireEvent.pointerUp(stage, { pointerId: 1 });
    expect(readout('grasp-contact-1-value')).toBe('0.375');
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 112, clientY: 20 });
    expect(readout('grasp-contact-1-value')).toBe('0.375');
  });
});
