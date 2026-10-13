import { fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MotionPantograph, formatMm, readoutFor } from '@/components/interactive/motion-pantograph';
import {
  BAR,
  SCALES,
  STROKE_MM,
  UNITS_PER_MM,
  WOBBLE_MM,
  clampHand,
  handAt,
  linkageAt,
  plateAt,
  strokeUpTo,
  tipFor,
  tipMm,
} from '@/components/iso/figures/motion-pantograph';
import { P } from '@/components/iso/figures/motion-pantograph';
import { iso } from '@/components/iso/iso-kit';

const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('motion pantograph model', () => {
  it('divides the hand motion by the scale: the tip is the hand point over the scale, about the fixed pivot', () => {
    for (const scale of SCALES) {
      for (let s = 0; s <= 1; s += 0.05) {
        const H = handAt(s);
        const L = linkageAt(H, scale);
        // The four bars keep their lengths and the pins sit on them.
        expect(dist(L.O, L.B)).toBeCloseTo(BAR, 6);
        expect(dist(L.B, L.H)).toBeCloseTo(BAR, 6);
        expect(dist(L.O, L.D)).toBeCloseTo(BAR / scale, 6);
        expect(dist(L.B, L.C)).toBeCloseTo(BAR / scale, 6);
        // D-T is parallel to B-H and C-T to O-B: the parallelogram D-B-C-T.
        expect(dist(L.D, L.T)).toBeCloseTo(dist(L.B, L.C), 6);
        expect(dist(L.C, L.T)).toBeCloseTo(dist(L.B, L.D), 6);
        // So the tip is the hand divided by the scale.
        const tip = tipFor(H, scale);
        expect(L.T[0]).toBeCloseTo(tip[0], 6);
        expect(L.T[1]).toBeCloseTo(tip[1], 6);
        // The elbow stays behind the plates.
        expect(L.B[1]).toBeLessThan(0);
      }
    }
  });

  it('traces a 30 mm stroke with a wobble that the tip carries divided too', () => {
    const start = handAt(0);
    const end = handAt(1);
    expect(dist(start, end) / UNITS_PER_MM).toBeCloseTo(STROKE_MM, 9);
    const wobble = Math.max(...strokeUpTo(1, 400).map(([, y]) => Math.abs(y))) / UNITS_PER_MM;
    expect(wobble).toBeLessThanOrEqual(WOBBLE_MM + 1e-9);
    expect(wobble).toBeGreaterThan(WOBBLE_MM * 0.95);
    for (const scale of SCALES) {
      const tipWobble = Math.max(...strokeUpTo(1, 400).map((h) => Math.abs(tipFor(h, scale)[1]))) / UNITS_PER_MM;
      expect(tipWobble).toBeCloseTo(wobble / scale, 9);
      expect(tipMm(STROKE_MM, scale)).toBeCloseTo(STROKE_MM / scale, 9);
    }
    expect(readoutFor(3)).toBe('3 to 1 · 30 mm at the hand, 10 mm at the tip');
    expect(readoutFor(4)).toBe('4 to 1 · 30 mm at the hand, 7.5 mm at the tip');
    expect(formatMm(10)).toBe('10');
  });

  it('maps a point under the pointer back onto the master plate, and keeps the stylus in reach', () => {
    const point: [number, number] = [260, 6];
    const back = plateAt(iso([point[0], point[1], 3], P));
    expect(back[0]).toBeCloseTo(point[0], 6);
    expect(back[1]).toBeCloseTo(point[1], 6);
    const far = clampHand([900, 0]);
    expect(Math.hypot(far[0], far[1])).toBeLessThanOrEqual(2 * BAR);
  });
});

describe('MotionPantograph', () => {
  it('opens at 3 to 1 with the authored stroke traced, the tip the one lit part, no words in the drawing', () => {
    const { container } = render(<MotionPantograph />);
    expect(screen.getByText("The robot shrinks the surgeon's hand motion, wobble and all")).toBeInTheDocument();
    expect(screen.getByTestId('pantograph-scale')).toHaveTextContent('3 to 1');
    expect(container.querySelector('[data-readout]')).toHaveTextContent('3 to 1 · 30 mm at the hand, 10 mm at the tip');
    const svg = screen.getByRole('img');
    expect(svg.querySelectorAll('text')).toHaveLength(0);
    expect(svg.getAttribute('aria-label')).toMatch(/a 30 millimetre stroke .* moves the tip 10 millimetres/);
    expect(container.querySelectorAll('.iso-solid[data-lit]')).toHaveLength(1);
    expect(screen.getByTestId('pantograph-hand-trace')).toHaveAttribute('data-mm', '30');
    expect(screen.getByTestId('pantograph-tip-trace')).toHaveAttribute('data-mm', '10');
    expect(screen.getByTestId('pantograph-hand-trace').querySelector('path')?.getAttribute('d')).toBeTruthy();
    expect(container.textContent).toMatch(/Illustrative/);
  });

  it('re-pins the scale: the tip trace shrinks with the scale while the hand trace stays', () => {
    render(<MotionPantograph />);
    const slider = screen.getByRole('slider');
    const hand = () => screen.getByTestId('pantograph-hand-trace').querySelector('path')?.getAttribute('d');
    const before = hand();
    fireEvent.change(slider, { target: { value: '5' } });
    expect(screen.getByTestId('pantograph-scale')).toHaveTextContent('5 to 1');
    expect(screen.getByTestId('pantograph-tip-trace')).toHaveAttribute('data-mm', '6');
    expect(screen.getByTestId('pantograph-linkage')).toHaveAttribute('data-scale', '5');
    expect(hand()).toBe(before);
    expect(slider).toHaveAttribute('aria-valuetext', '5 to 1: a 30 millimetre hand movement moves the tip 6 millimetres');
    fireEvent.change(slider, { target: { value: '2' } });
    expect(screen.getByTestId('pantograph-tip-trace')).toHaveAttribute('data-mm', '15');
  });

  it('traces the stroke on a reader control only', () => {
    render(<MotionPantograph />);
    const trace = screen.getByTestId('pantograph-trace');
    // A secondary action carries no pressed state: its label says what it does next.
    expect(trace).not.toHaveAttribute('aria-pressed');
    expect(trace).toHaveTextContent('Trace the stroke');
    fireEvent.click(trace);
    expect(trace).toHaveTextContent('Stop tracing');
    expect(trace).not.toHaveAttribute('aria-pressed');
  });

  it('server-renders the still pose it hydrates', () => {
    const html = renderToString(<MotionPantograph />);
    expect(html).toContain('data-figure-frame="motion-pantograph"');
    expect(html).toContain('30 mm at the hand, 10 mm at the tip');
    expect(html).not.toContain('<text');
  });
});
