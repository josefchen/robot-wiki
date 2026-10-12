import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EPSILON_FULL, GraspWrenchLab, NUDGE, PULL_S, TEST_S, TRAVEL_S, testAt } from '@/components/interactive/grasp-wrench-lab';
import { iso } from '@/components/iso/iso-kit';
import { CONTACT_Z, HEIGHT, P, SCALE, WEDGE_LEN, WIDTH, cordStart, eyeOf, needleDegrees, pullDirection, restStationFor, toWorld, wedgeOf } from '@/components/iso/figures/grasp-test-table';
import {
  CONTACT_POSITION_MAX,
  CONTACT_POSITION_MIN,
  CONTACT_POSITION_STEP,
  DEFAULT_CONTACTS,
  DEFAULT_MU,
  PUSH_COUNT,
  contactGeometry,
  pushAngle,
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
    const surface = screen.getByRole('slider', { name: /^How rough the surface is: friction coefficient mu/ });
    expect(surface.closest('details')).toBeNull();
    expect(container.querySelector('label[for="grasp-mu"]')).toHaveTextContent(/^How rough the surface isfairly rough$/);
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

  it('stands a telltale up for every resisted pull and says the grip holds', () => {
    const { container } = render(<GraspWrenchLab />);
    expect(container.querySelectorAll('[data-push="resisted"]')).toHaveLength(8);
    expect(container.querySelectorAll('[data-push="slips"]')).toHaveLength(0);
    expect(container.querySelector('[data-readout]')).toHaveTextContent(
      'Pulls from every direction are resisted: the grip holds',
    );
  });

  it('shows the pulls that slip once a finger is removed', () => {
    const { container } = render(<GraspWrenchLab />);
    fireEvent.click(screen.getByRole('button', { name: /remove the last contact/i }));
    expect(container.querySelectorAll('[data-push="resisted"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-push="slips"]')).toHaveLength(5);
    expect(container.querySelector('[data-readout]')).toHaveTextContent(
      '5 of 8 pulls slip free: the grip fails',
    );
  });

  it('turns the margin dial in proportion to epsilon', () => {
    render(<GraspWrenchLab />);
    const needle = () => screen.getByTestId('grasp-margin-needle');
    const epsilon = () => Number.parseFloat(readout('grasp-epsilon-readout'));
    const degrees = () => Number(needle().getAttribute('data-degrees'));
    const at = (e: number) => -135 + 270 * Math.min(1, e / EPSILON_FULL);
    expect(needle()).toHaveAttribute('data-epsilon', readout('grasp-epsilon-readout'));
    expect(degrees()).toBeCloseTo(at(epsilon()), 0);
    fireEvent.change(screen.getByRole('slider', { name: /friction coefficient/i }), {
      target: { value: '1' },
    });
    expect(degrees()).toBeCloseTo(at(epsilon()), 0);
    fireEvent.click(screen.getByRole('button', { name: /remove the last contact/i }));
    expect(degrees()).toBe(-135);
    expect(needleDegrees(0)).toBe(-135);
    expect(needleDegrees(5)).toBe(135);
  });

  it('rests the dial on its zero stop exactly when the grip fails', () => {
    render(<GraspWrenchLab />);
    const moved = () => Number(screen.getByTestId('grasp-margin-needle').getAttribute('data-degrees')) > -135;
    const holds = () => readout('grasp-closure-readout') === 'yes';
    expect([moved(), holds()]).toEqual([true, true]);
    fireEvent.change(screen.getByRole('slider', { name: /friction coefficient/i }), { target: { value: '0.05' } });
    expect(moved()).toBe(holds());
    fireEvent.click(screen.getByRole('button', { name: /remove the last contact/i }));
    expect([moved(), holds()]).toEqual([false, false]);
  });

  it('draws one friction-cone wedge per fingertip, of half-angle arctan mu, and no words in the drawing', () => {
    const { container } = render(<GraspWrenchLab />);
    expect(container.querySelectorAll('[data-part="cone"] path.iso-line')).toHaveLength(DEFAULT_CONTACTS.length);
    for (const mu of [0.2, 0.7, 1]) {
      const g = contactGeometry(0.125);
      const wedge = wedgeOf(g, mu);
      const [ax, ay] = wedge[0];
      expect([ax, ay]).toEqual(toWorld(g.point.x, g.point.y));
      const [ex, ey] = wedge[wedge.length - 1];
      const [mx, my] = toWorld(g.point.x + g.normal.x, g.point.y + g.normal.y);
      const angle = Math.acos(((ex - ax) * (mx - ax) + (ey - ay) * (my - ay)) / (Math.hypot(ex - ax, ey - ay) * Math.hypot(mx - ax, my - ay)));
      expect(angle).toBeCloseTo(Math.atan(mu), 6);
    }
    // The wedge sits at its contact: its apex on the contact, its far arc inside the block, at most WEDGE_LEN away.
    for (const s of [0.05, 0.125, 0.3, 0.875]) {
      const g = contactGeometry(s);
      const wedge = wedgeOf(g, 0.7);
      expect(wedge[0]).toEqual(toWorld(g.point.x, g.point.y));
      for (const [x, y] of wedge) {
        expect(Math.max(Math.abs(x), Math.abs(y))).toBeLessThanOrEqual(SCALE + 1e-9);
        expect(Math.hypot(x - wedge[0][0], y - wedge[0][1])).toBeLessThanOrEqual(WEDGE_LEN * SCALE + 1e-9);
      }
    }
    // The hint says what a wedge means, and the drawing itself carries no text.
    expect(container.querySelector('[data-anatomy-hint]')).toHaveTextContent('inside its wedge a finger can push without slipping');
    expect(screen.getByTestId('grasp-object-view').querySelectorAll('text')).toHaveLength(0);
    for (const finger of container.querySelectorAll('[data-finger]')) {
      expect(finger.querySelectorAll('circle[pointer-events="all"]')).toHaveLength(1);
      expect(finger.querySelector('circle[pointer-events="all"]')).toHaveAttribute('fill', 'none');
    }
  });

  it('lights only the standing telltale pins, the directions the grip held', () => {
    const { container } = render(<GraspWrenchLab />);
    const view = screen.getByTestId('grasp-object-view');
    const litCount = () => view.querySelectorAll('[data-lit]').length;
    expect(litCount()).toBe(8);
    for (const lit of view.querySelectorAll('[data-lit]')) expect(lit.closest('[data-push]')).toHaveAttribute('data-push', 'resisted');
    expect(screen.getByTestId('grasp-block').querySelectorAll('[data-lit]')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /remove the last contact/i }));
    expect(litCount()).toBe(container.querySelectorAll('[data-push="resisted"]').length);
    expect(litCount()).toBe(3);
  });

  it('ties the cord to an eye bolt on the block edge, on the line through the centre, never across the block', () => {
    for (let k = 0; k < PUSH_COUNT; k++) {
      const [ux, uy] = pullDirection(k);
      const [ex, ey] = eyeOf(k);
      // On the ray from the centre toward station k...
      expect(Math.abs(ex * uy - ey * ux)).toBeLessThan(1e-9);
      expect(ex * ux + ey * uy).toBeGreaterThan(0);
      // ...just inside the block's edge, so the cord starts there and runs outward.
      const reach = Math.max(Math.abs(ex), Math.abs(ey));
      expect(reach).toBeLessThan(SCALE);
      expect(reach).toBeGreaterThan(SCALE - 5);
      expect(cordStart(k).slice(0, 2)).toEqual([ex, ey]);
    }
    // At rest the carriage waits at the first pull that slips, or else at a station clear of every finger.
    expect(restStationFor([0.125, 0.875], [true, true, true, false, false, false, false, false])).toBe(3);
    const rest = restStationFor(DEFAULT_CONTACTS, Array(8).fill(true));
    for (const s of DEFAULT_CONTACTS) {
      const g = contactGeometry(s);
      const [ux, uy] = pullDirection(rest);
      expect(ux * -g.normal.x + uy * g.normal.y).toBeLessThan(Math.cos(Math.PI / 6));
    }
    const { container } = render(<GraspWrenchLab />);
    const cord = screen.getByTestId('grasp-cord');
    // One cord line, besides the eye bolt's own solids, and it ends on the eye's dot.
    expect(Array.from(cord.querySelectorAll('path.iso-line')).filter((path) => !path.closest('.iso-solid'))).toHaveLength(1);
    expect(cord.querySelectorAll('.iso-dots circle')).toHaveLength(1);
    expect(cord.querySelectorAll('.iso-solid').length).toBeGreaterThan(0);
    expect(container.querySelector('[data-station]')).not.toBeNull();
  });

  it('pulls toward the eight stations in turn, each along its own test direction', () => {
    for (let k = 0; k < PUSH_COUNT; k++) {
      const [x, y] = pullDirection(k);
      // The world is the model mirrored in y, so a pull keeps the model's push direction.
      expect(x).toBeCloseTo(Math.cos(pushAngle(k)));
      expect(-y).toBeCloseTo(Math.sin(pushAngle(k)));
      const pulling = testAt(k * (TRAVEL_S + PULL_S) + TRAVEL_S + PULL_S / 2);
      expect(pulling.station).toBe(k);
      expect(pulling.pull).toBeCloseTo(1);
      expect(Math.cos(pulling.angle)).toBeCloseTo(x);
      expect(Math.sin(pulling.angle)).toBeCloseTo(y);
    }
    expect(testAt(TEST_S).done).toBe(true);
    expect(NUDGE).toBeLessThan(SCALE / 4);
  });

  it('starts and stops the pull test from a reader control', () => {
    render(<GraspWrenchLab />);
    const run = screen.getByTestId('grasp-run');
    // A secondary action carries no pressed state: its label says what it does next.
    expect(run).not.toHaveAttribute('aria-pressed');
    expect(run).toHaveTextContent('Run the pull test');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Stop the pull test');
    expect(run).not.toHaveAttribute('aria-pressed');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Run the pull test');
  });

  it('moves a dragged fingertip to the edge under the pointer, on the slider grid', () => {
    const { container } = render(<GraspWrenchLab />);
    const stage = screen.getByTestId('grasp-object-view');
    stage.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: WIDTH, height: HEIGHT, right: WIDTH, bottom: HEIGHT, x: 0, y: 0 }) as DOMRect;
    const grab = container.querySelector('[data-finger="1"] circle[pointer-events="all"]') as SVGElement;
    Object.assign(grab, { setPointerCapture: () => {} });
    fireEvent.pointerDown(grab, { pointerId: 1, clientX: 10, clientY: 10 });
    // The screen point over the block's left edge midpoint, in the plane the fingertips press at.
    const [lx, ly] = toWorld(-1.4, 0);
    const [sx, sy] = iso([lx, ly, CONTACT_Z], P);
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: sx, clientY: sy });
    fireEvent.pointerUp(stage, { pointerId: 1 });
    expect(readout('grasp-contact-1-value')).toBe('0.375');
    const [fx, fy] = iso([...toWorld(0, 1.5), CONTACT_Z] as [number, number, number], P);
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: fx, clientY: fy });
    expect(readout('grasp-contact-1-value')).toBe('0.375');
  });
});
