import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BODIES, FreeFloatingArm, readoutFor, valueTextFor } from '@/components/interactive/free-floating-arm';
import {
  ARM_MASS,
  BALLAST_BRICKS,
  ETS_VII_RATIO,
  LAB,
  SWING_DEGREES,
  bodyOf,
  poseAt,
  resultOf,
} from '@/components/iso/figures/air-bearing-table';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';

afterEach(() => {
  vi.unstubAllGlobals();
});

const still = () =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));
const readout = () => screen.getByTestId('floating-stage-frame').querySelector('[data-readout]');
const drawing = () => screen.getByTestId('floating-drawing');

/** The total angular momentum of a pose path, by finite differences: it must stay zero through a swing. */
function angularMomentum(id: 'lab' | 'ballast', s: number, ds = 1e-4) {
  const body = bodyOf(id);
  const a = poseAt(id, s);
  const b = poseAt(id, s + ds);
  const parts = (pose: ReturnType<typeof poseAt>) => {
    const u1: [number, number] = [(pose.j2[0] - pose.j1[0]) / 0.35, (pose.j2[1] - pose.j1[1]) / 0.35];
    const u2: [number, number] = [(pose.tip[0] - pose.j2[0]) / 0.35, (pose.tip[1] - pose.j2[1]) / 0.35];
    return {
      p: [
        pose.body,
        [pose.j1[0] + LAB.links[0].a * u1[0], pose.j1[1] + LAB.links[0].a * u1[1]],
        [pose.j2[0] + LAB.links[1].a * u2[0], pose.j2[1] + LAB.links[1].a * u2[1]],
      ] as Array<[number, number]>,
      angle: [pose.theta, Math.atan2(u1[1], u1[0]), Math.atan2(u2[1], u2[0])],
    };
  };
  const pa = parts(a);
  const pb = parts(b);
  const m = [body.mass!, LAB.links[0].mass, LAB.links[1].mass];
  const inertia = [body.inertia!, LAB.links[0].inertia, LAB.links[1].inertia];
  let L = 0;
  let scale = 0;
  for (let k = 0; k < 3; k++) {
    const v = [(pb.p[k]![0] - pa.p[k]![0]) / ds, (pb.p[k]![1] - pa.p[k]![1]) / ds];
    const w = (pb.angle[k]! - pa.angle[k]!) / ds;
    L += inertia[k]! * w + m[k]! * (pa.p[k]![0] * v[1]! - pa.p[k]![1] * v[0]!);
    scale += Math.abs(inertia[k]! * w);
  }
  return { L, scale };
}

describe('FreeFloatingArm model', () => {
  it('uses the 1989 test model: a 6.3 kg body and two 0.35 m links', () => {
    expect(LAB.body.mass).toBeCloseTo(6.256, 3);
    expect(LAB.links[0].a + LAB.links[0].b).toBeCloseTo(0.35, 6);
    expect(LAB.links[1].a + LAB.links[1].b).toBeCloseTo(0.35, 6);
    expect(ARM_MASS).toBeCloseTo(1.367, 3);
    expect(SWING_DEGREES).toBe(90);
  });

  it('keeps the center of mass still and the angular momentum zero through the swing', () => {
    for (const id of ['lab', 'ballast'] as const) {
      const body = bodyOf(id);
      for (const s of [0.1, 0.4, 0.8]) {
        const { L, scale } = angularMomentum(id, s);
        expect(Math.abs(L)).toBeLessThan(scale * 1e-3);
      }
      // Center of mass: the body's center plus the links', weighted, is where it was at the start.
      const com = (s: number) => {
        const pose = poseAt(id, s);
        const u1 = [(pose.j2[0] - pose.j1[0]) / 0.35, (pose.j2[1] - pose.j1[1]) / 0.35];
        const u2 = [(pose.tip[0] - pose.j2[0]) / 0.35, (pose.tip[1] - pose.j2[1]) / 0.35];
        const c1 = [pose.j1[0] + LAB.links[0].a * u1[0]!, pose.j1[1] + LAB.links[0].a * u1[1]!];
        const c2 = [pose.j2[0] + LAB.links[1].a * u2[0]!, pose.j2[1] + LAB.links[1].a * u2[1]!];
        const M = body.mass! + ARM_MASS;
        return [0, 1].map((i) => (body.mass! * pose.body[i]! + LAB.links[0].mass * c1[i]! + LAB.links[1].mass * c2[i]!) / M);
      };
      const [x0, y0] = com(0);
      const [x1, y1] = com(1);
      expect(Math.hypot(x1! - x0!, y1! - y0!)).toBeLessThan(1e-9);
    }
  });

  it('turns the body against the shoulder, less the heavier it is, and not at all when clamped', () => {
    const lab = resultOf('lab', 1);
    const ballast = resultOf('ballast', 1);
    const clamped = resultOf('clamped', 1);
    expect(lab.turn).toBeLessThan(-35);
    expect(lab.turn).toBeGreaterThan(-45);
    expect(Math.abs(ballast.turn)).toBeLessThan(Math.abs(lab.turn));
    expect(Math.abs(ballast.turn)).toBeGreaterThan(15);
    expect(lab.miss).toBeGreaterThan(ballast.miss);
    expect(clamped.turn).toBe(0);
    expect(clamped.miss).toBe(0);
    // The ballasted body outweighs its arm about as ETS-VII's did.
    expect(bodyOf('ballast').mass! / ARM_MASS).toBeGreaterThan(ETS_VII_RATIO * 0.9);
    expect(bodyOf('ballast').mass! / ARM_MASS).toBeLessThan(ETS_VII_RATIO * 1.3);
    expect(BALLAST_BRICKS).toBe(2);
  });
});

describe('FreeFloatingArm', () => {
  it('opens on the swung pose of the body as built: the insight in the first frame', () => {
    render(<FreeFloatingArm />);
    expect(screen.getByText('With nothing to push on, the arm turns the spacecraft')).toBeInTheDocument();
    expect(drawing()).toHaveAttribute('data-body', 'lab');
    expect(drawing()).toHaveAttribute('data-swing', '90');
    expect(readout()).toHaveTextContent(readoutFor('lab', 1));
    expect(readoutFor('lab', 1)).toMatch(/^Body turned 3\d degrees the other way · hand off by \d+ cm$/);
    const svg = drawing().querySelector('svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject, tspan')).toHaveLength(0);
    expect(svg.querySelectorAll('[data-lit], [data-tone="lit"]')).toHaveLength(1);
    expect(svg.getAttribute('aria-label')).toMatch(/floating on three air pads/);
  });

  it('describes the drawing with the method paragraph that explains the table', () => {
    render(<FreeFloatingArm />);
    const id = drawing().querySelector('svg')!.getAttribute('aria-describedby');
    expect(document.getElementById(id ?? '')).toHaveTextContent(/^The drawing is a laboratory air-bearing table/);
  });

  it('swings back and forth from the button, and the readout follows the model', () => {
    still();
    render(<FreeFloatingArm />);
    fireEvent.click(screen.getByTestId('floating-swing'));
    expect(drawing()).toHaveAttribute('data-swing', '0');
    expect(readout()).toHaveTextContent('Body turned 0 degrees the other way · hand off by 0 cm');
    expect(screen.getByTestId('floating-swing')).toHaveTextContent('Swing the arm');
    fireEvent.click(screen.getByTestId('floating-swing'));
    expect(drawing()).toHaveAttribute('data-swing', '90');
    expect(readout()).toHaveTextContent(readoutFor('lab', 1));
  });

  it('fits each body from the preset row: bricks turn it less, a clamp not at all', () => {
    still();
    render(<FreeFloatingArm />);
    expect(BODIES.map((body) => body.label)).toEqual(['Light body, 6.3 kg', 'Heavier body, 29 kg', 'Bolted to the table']);
    fireEvent.click(screen.getByTestId('floating-body-ballast'));
    expect(screen.getByTestId('floating-body-ballast')).toHaveAttribute('aria-pressed', 'true');
    expect(drawing()).toHaveAttribute('data-body', 'ballast');
    expect(readout()).toHaveTextContent(readoutFor('ballast', 1));
    expect(Number(drawing().getAttribute('data-turn'))).toBeCloseTo(resultOf('ballast', 1).turn, 1);
    fireEvent.click(screen.getByTestId('floating-body-clamped'));
    expect(readout()).toHaveTextContent('Body clamped, turned 0 degrees · hand on the grapple');
    expect(screen.getByRole('img', { name: /clamped to a granite air-bearing table/ })).toBeInTheDocument();
  });

  it('sets the swing by hand under "Adjust more" and resets to the body as built', () => {
    still();
    const { container } = render(<FreeFloatingArm />);
    fireEvent.click(screen.getByTestId('floating-body-clamped'));
    const fold = container.querySelector('details[data-figure-fold="adjust"]')!;
    expect(fold.querySelector('summary')).toHaveTextContent('Adjust more');
    const slider = fold.querySelector('input[type="range"]')!;
    fireEvent.change(slider, { target: { value: '45' } });
    expect(drawing()).toHaveAttribute('data-swing', '45');
    expect(slider).toHaveAttribute('aria-valuetext', valueTextFor('clamped', 0.5));
    const reset = [...fold.querySelectorAll('button')].filter((button) => button.textContent === 'Reset');
    expect(reset).toHaveLength(1);
    fireEvent.click(reset[0]!);
    expect(screen.getByTestId('floating-body-lab')).toHaveAttribute('aria-pressed', 'true');
    expect(drawing()).toHaveAttribute('data-body', 'lab');
    expect(drawing()).toHaveAttribute('data-swing', '90');
  });
});

describe('FreeFloatingArm served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<FreeFloatingArm />)}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/adjacent/space/');
    expect(figures).toEqual(['free-floating-arm']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
});
