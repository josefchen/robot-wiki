import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImpedancePress, RUN_SECONDS, targetValue, valueTextFor } from '@/components/interactive/impedance-press';
import { MARK, PAN_TOP, SPRING_HANG, needleAngle, poseFor, tipFor } from '@/components/iso/figures/spring-press';
import { PUSH_MAX, TARGET_MAX, TARGET_MIN, pushFor } from '@/lib/impedance-press';

afterEach(() => {
  vi.unstubAllGlobals();
});

const still = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));

describe('the spring press drawing', () => {
  it('hangs the tool on the target in free space and squeezes the spring by the gap past the surface', () => {
    for (let target = TARGET_MIN; target <= TARGET_MAX; target += 0.5) {
      const pose = poseFor(target);
      if (target <= 0) {
        expect(pose.tip).toBeCloseTo(tipFor(target), 9);
        expect(pose.nutLift).toBeCloseTo(0, 9);
        expect(pose.springLength).toBeCloseTo(SPRING_HANG, 9);
      } else {
        expect(pose.tip).toBeCloseTo(PAN_TOP, 9);
        expect(pose.nutLift).toBeCloseTo(target * MARK, 9);
        expect(pose.springLength).toBeCloseTo(SPRING_HANG - target * MARK, 9);
      }
      expect(pose.springLength).toBeGreaterThan(8);
    }
  });

  it('turns the needle with the push, from the dial zero to its last mark', () => {
    expect(needleAngle(0)).toBeCloseTo((-135 * Math.PI) / 180, 9);
    expect(needleAngle(PUSH_MAX)).toBeCloseTo((135 * Math.PI) / 180, 9);
    let last = -Infinity;
    for (let push = 0; push <= PUSH_MAX; push += 0.5) {
      expect(needleAngle(push)).toBeGreaterThan(last);
      last = needleAngle(push);
    }
  });
});

describe('ImpedancePress', () => {
  it('draws the still pose: the medium spring two marks past the surface, no words in the drawing', () => {
    render(<ImpedancePress />);
    expect(screen.getByText('The same target pushes harder through a stiffer spring')).toBeInTheDocument();
    const drawing = screen.getByTestId('press-drawing');
    expect(drawing).toHaveAttribute('data-spring', 'medium');
    expect(drawing).toHaveAttribute('data-target', '2');
    expect(drawing).toHaveAttribute('data-tool', '0');
    expect(drawing).toHaveAttribute('data-push', '4');
    const stage = screen.getByTestId('press-stage-frame');
    expect(stage.querySelector('[data-readout]')).toHaveTextContent('Medium · 2 marks past · push 4');
    expect(stage).toHaveTextContent(/Illustrative springs/);
    const svg = drawing.querySelector('svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    expect(svg.textContent).toBe('');
    // The one lit part is the fitted spring: its back half, its seat and its front half.
    const lit = [...svg.querySelectorAll('[data-tone="lit"], [data-lit]')];
    expect(lit).toHaveLength(3);
    for (const node of lit) expect(node.closest('[data-part]')).toHaveAttribute('data-part', 'tool-low');
    expect(svg.getAttribute('aria-label')).toMatch(/medium spring is squeezed/);
  });

  it('describes the drawing with the method paragraph that explains the press', () => {
    render(<ImpedancePress />);
    const svg = screen.getByTestId('press-drawing').querySelector('svg')!;
    expect(document.getElementById(svg.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      /^The press is that law made of parts\./,
    );
  });

  it('swaps the spring and keeps the target: the stiff spring pushes four times the soft one', () => {
    render(<ImpedancePress />);
    fireEvent.click(screen.getByTestId('press-spring-stiff'));
    const drawing = screen.getByTestId('press-drawing');
    expect(drawing).toHaveAttribute('data-push', String(pushFor('stiff', 2)));
    expect(screen.getByTestId('press-spring-stiff')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('press-spring-soft'));
    expect(drawing).toHaveAttribute('data-push', String(pushFor('soft', 2)));
    expect(Number(drawing.getAttribute('data-push')) * 4).toBe(pushFor('stiff', 2));
  });

  it('moves the target from the slider, in words for assistive technology, at once under reduced motion', async () => {
    still();
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    render(<ImpedancePress />);
    const slider = screen.getByRole('slider', { name: 'Target' });
    expect(slider).toHaveValue('2');
    fireEvent.change(slider, { target: { value: '-1.5' } });
    // One frame later the crosshead stands at the new target: no easing under reduced motion.
    await act(async () => {
      vi.advanceTimersByTime(20);
    });
    vi.useRealTimers();
    expect(slider).toHaveAttribute('aria-valuetext', 'target 1.5 marks short of the surface: the tool rides on the target and pushes on nothing');
    expect(screen.getByTestId('press-target')).toHaveTextContent('1.5 marks short');
    const drawing = screen.getByTestId('press-drawing');
    expect(drawing).toHaveAttribute('data-target', '-1.5');
    expect(drawing).toHaveAttribute('data-push', '0');
    expect(screen.getByTestId('press-stage-frame').querySelector('[data-readout]')).toHaveTextContent('Medium · 1.5 marks short · no push');
    expect(targetValue(0)).toBe('on the surface');
    expect(targetValue(1)).toBe('1 mark past');
    expect(valueTextFor('stiff', 3)).toBe('target 3 marks past the surface: the tool stops on the surface and the stiff spring pushes 12');
  });

  it('eases the crosshead to a new target', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      render(<ImpedancePress />);
      fireEvent.change(screen.getByRole('slider', { name: 'Target' }), { target: { value: '0' } });
      const drawing = screen.getByTestId('press-drawing');
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      const between = Number(drawing.getAttribute('data-target'));
      expect(between).toBeGreaterThan(0);
      expect(between).toBeLessThan(2);
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      expect(drawing).toHaveAttribute('data-target', '0');
    } finally {
      vi.useRealTimers();
    }
  });

  it('runs the press only when asked, with no pressed state, and jumps to the end under reduced motion', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      render(<ImpedancePress />);
      const run = screen.getByTestId('press-run');
      expect(run).not.toHaveAttribute('aria-pressed');
      expect(run).toHaveTextContent('Run the press');
      fireEvent.click(run);
      expect(run).toHaveTextContent('Stop the press');
      expect(run).not.toHaveAttribute('aria-pressed');
      await act(async () => {
        vi.advanceTimersByTime(RUN_SECONDS * 500);
      });
      const drawing = screen.getByTestId('press-drawing');
      expect(Number(drawing.getAttribute('data-target'))).toBeLessThan(TARGET_MAX);
      await act(async () => {
        vi.advanceTimersByTime(RUN_SECONDS * 1000);
      });
      expect(drawing).toHaveAttribute('data-target', String(TARGET_MAX));
      expect(run).toHaveTextContent('Run the press');
    } finally {
      vi.useRealTimers();
    }
    still();
    const { container } = render(<ImpedancePress />);
    fireEvent.click(container.querySelector('[data-testid="press-run"]')!);
    expect(container.querySelector('[data-testid="press-drawing"]')).toHaveAttribute('data-target', String(TARGET_MAX));
  });

  it('server-renders the still pose it hydrates', () => {
    const html = renderToString(<ImpedancePress />);
    expect(html).toContain('data-figure-frame="impedance-press"');
    expect(html).toContain('Medium · 2 marks past · push 4');
  });
});
