import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RUN_SECONDS, STILL_PERCENT, SafetyFilterFence, readoutFor } from '@/components/interactive/safety-filter-fence';
import { READOUT_SETTLE_MS } from '@/components/motion/settled-speech';
import {
  DEEPEST_T,
  ENTER_T,
  KEEP_OUT,
  LEAVE_T,
  STROKE_POINTS,
  ZONE,
  elbowFor,
  filtered,
  fromZone,
  inkTo,
  movingAt,
  phaseAt,
  proposalAt,
  SHOULDER,
} from '@/components/iso/figures/guide-fence';

afterEach(() => {
  vi.unstubAllGlobals();
});

const distance = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('the safety filter model', () => {
  it('leaves a safe proposal unchanged and moves an unsafe one to the nearest safe point', () => {
    for (const { aim, pen } of STROKE_POINTS) {
      expect(fromZone(pen)).toBeGreaterThanOrEqual(KEEP_OUT - 1e-9);
      if (fromZone(aim) >= KEEP_OUT) {
        expect(pen).toEqual(aim);
      } else {
        // On the keep-out circle, on the ray from the zone's centre through the aim.
        expect(fromZone(pen)).toBeCloseTo(KEEP_OUT, 9);
        const cross = (aim[0] - ZONE.x) * (pen[1] - ZONE.y) - (aim[1] - ZONE.y) * (pen[0] - ZONE.x);
        expect(cross).toBeCloseTo(0, 6);
        // The least change: no safe point is nearer the aim.
        for (let k = 0; k < 360; k += 3) {
          const a = (k * Math.PI) / 180;
          for (const r of [KEEP_OUT, KEEP_OUT + 4, KEEP_OUT + 20]) {
            const safe: [number, number] = [ZONE.x + r * Math.cos(a), ZONE.y + r * Math.sin(a)];
            expect(distance(pen, aim)).toBeLessThanOrEqual(distance(safe, aim) + 1e-9);
          }
        }
      }
    }
  });

  it('has a stroke that cuts into the zone once, with the still pose at its deepest point', () => {
    expect(ENTER_T).toBeGreaterThan(0);
    expect(LEAVE_T).toBeLessThan(1);
    expect(ENTER_T).toBeLessThan(DEEPEST_T);
    expect(DEEPEST_T).toBeLessThan(LEAVE_T);
    const inside = STROKE_POINTS.filter(({ aim }) => fromZone(aim) < KEEP_OUT).map(({ t }) => t);
    // One run of samples, no gap: the aim enters once and leaves once.
    for (let k = 1; k < inside.length; k++) expect(inside[k]! - inside[k - 1]!).toBeCloseTo(1 / 360, 9);
    expect(fromZone(proposalAt(DEEPEST_T))).toBeLessThan(KEEP_OUT * 0.6);
    expect(STILL_PERCENT).toBe(Math.round(DEEPEST_T * 100));
    expect(phaseAt(0)).toBe('before');
    expect(phaseAt(DEEPEST_T)).toBe('inside');
    expect(phaseAt((LEAVE_T + 1) / 2)).toBe('after');
    expect(phaseAt(1)).toBe('done');
  });

  it('inks only filtered points, and reaches every aim with two equal links', () => {
    for (const t of [0.1, ENTER_T, DEEPEST_T, LEAVE_T, 0.95, 1]) {
      for (const point of inkTo(t)) expect(fromZone(point)).toBeGreaterThanOrEqual(KEEP_OUT - 1e-9);
      expect(inkTo(t).at(-1)).toEqual(filtered(proposalAt(t)));
      const aim = proposalAt(t);
      const elbow = elbowFor(aim);
      expect(distance(SHOULDER, elbow)).toBeCloseTo(distance(elbow, aim), 6);
    }
    // The elbow keeps to one side the whole stroke: it never flips.
    let lastSide = 0;
    for (const { aim } of STROKE_POINTS) {
      const elbow = elbowFor(aim);
      const side = Math.sign((aim[0] - SHOULDER[0]) * (elbow[1] - SHOULDER[1]) - (aim[1] - SHOULDER[1]) * (elbow[0] - SHOULDER[0]));
      if (lastSide) expect(side).toBe(lastSide);
      lastSide = side;
    }
    // The pen is drawn before the fence when it is behind the zone's centre, after it otherwise.
    const moving = movingAt(DEEPEST_T);
    expect(moving['pen-back'].length + moving['pen-front'].length).toBe(3);
  });

  it('reads out in words', () => {
    expect(readoutFor(0.05)).toBe('Aim outside · pen follows exactly');
    expect(readoutFor(DEEPEST_T)).toBe('Aim inside · pen held at the fence');
    expect(readoutFor((LEAVE_T + 1) / 2)).toBe('Aim outside again · pen follows exactly');
    expect(readoutFor(1)).toBe('Done at 100% · changed only at the fence');
  });
});

describe('SafetyFilterFence', () => {
  it('draws the still pose: the aim inside the fence, the pen held at its edge, no words in the drawing', () => {
    render(<SafetyFilterFence />);
    expect(screen.getByText('A safety filter changes the path only where it must')).toBeInTheDocument();
    const drawing = screen.getByTestId('fence-drawing');
    expect(drawing).toHaveAttribute('data-phase', 'inside');
    const pen = drawing.getAttribute('data-pen')!.split(',').map(Number) as [number, number];
    expect(fromZone(pen)).toBeCloseTo(KEEP_OUT, 0);
    const stage = screen.getByTestId('fence-stage-frame');
    expect(stage.querySelector('[data-readout]')).toHaveTextContent('Aim inside · pen held at the fence');
    expect(stage).toHaveTextContent(/Schematic/);
    const svg = drawing.querySelector('svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    expect(svg.textContent).toBe('');
    // The one lit part is the fence, drawn as its far and near halves.
    expect(svg.querySelectorAll('[data-lit]')).toHaveLength(2);
    expect(svg.getAttribute('aria-label')).toMatch(/nearest point on its edge/);
  });

  it('describes the drawing with the method paragraph that explains the bench', () => {
    render(<SafetyFilterFence />);
    const svg = screen.getByTestId('fence-drawing').querySelector('svg')!;
    expect(document.getElementById(svg.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      /^The drawing is that rule as a bench\. The sealed box, with no window and a tamper seal, stands for the policy/,
    );
  });

  it('moves along the stroke from the slider, in words for assistive technology', () => {
    render(<SafetyFilterFence />);
    const slider = screen.getByRole('slider', { name: /along the stroke/i });
    expect(slider).toHaveValue(String(STILL_PERCENT));
    fireEvent.change(slider, { target: { value: '5' } });
    expect(slider).toHaveAttribute('aria-valuetext', '5% along the stroke: the policy aims outside the fence, and the pen follows it exactly');
    const drawing = screen.getByTestId('fence-drawing');
    expect(drawing).toHaveAttribute('data-phase', 'before');
    expect(drawing.getAttribute('data-pen')).toBe(drawing.getAttribute('data-aim'));
  });

  it('runs the policy only when asked, with no pressed state, and jumps to the end under reduced motion', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      render(<SafetyFilterFence />);
      const run = screen.getByTestId('fence-run');
      expect(run).not.toHaveAttribute('aria-pressed');
      expect(run).toHaveTextContent('Run the policy');
      fireEvent.click(run);
      expect(run).toHaveTextContent('Stop the policy');
      expect(run).not.toHaveAttribute('aria-pressed');
      await act(async () => {
        vi.advanceTimersByTime(RUN_SECONDS * 1000 + 200);
      });
      expect(screen.getByTestId('fence-drawing')).toHaveAttribute('data-phase', 'done');
      expect(run).toHaveTextContent('Run the policy');
    } finally {
      vi.useRealTimers();
    }
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));
    const { container } = render(<SafetyFilterFence />);
    fireEvent.click(container.querySelector('[data-testid="fence-run"]')!);
    expect(container.querySelector('[data-testid="fence-drawing"]')).toHaveAttribute('data-phase', 'done');
  });

  it('ends a run by saying, once, the percentage the slider moved to', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));
    vi.useFakeTimers();
    try {
      const { container } = render(<SafetyFilterFence />);
      fireEvent.click(screen.getByTestId('fence-run'));
      const percent = screen.getByTestId('fence-percent').textContent!;
      expect(percent).toBe('100%');
      const readout = container.querySelector('[data-readout]')!;
      expect(readout.textContent).toBe(`Done at ${percent} · changed only at the fence`);
      await act(async () => {
        await Promise.resolve();
      });
      act(() => {
        vi.advanceTimersByTime(READOUT_SETTLE_MS + 60);
      });
      const spoken = [...container.querySelectorAll('[role="status"], [aria-live]:not([aria-live="off"])')]
        .map((region) => region.textContent ?? '')
        .filter(Boolean);
      expect(spoken).toEqual([readout.textContent]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('server-renders the still pose it hydrates', () => {
    const html = renderToString(<SafetyFilterFence />);
    expect(html).toContain('data-figure-frame="safety-filter-fence"');
    expect(html).toContain('Aim inside · pen held at the fence');
  });
});
