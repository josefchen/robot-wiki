import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KeypointString, RUN_SECONDS, shareValue, valueTextFor } from '@/components/interactive/keypoint-string';
import { PIXEL_POINT } from '@/components/iso/figures/perspective-frame';
import { PICKED, PIXEL, SHARE_MIN } from '@/lib/keypoint-lift';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('KeypointString', () => {
  it('draws the still pose: the bead on the handle at the depth reading, no words in the drawing', () => {
    render(<KeypointString />);
    expect(screen.getByText('An image point becomes a target only with its depth')).toBeInTheDocument();
    const drawing = screen.getByTestId('keypoint-drawing');
    expect(drawing).toHaveAttribute('data-place', 'on');
    expect(drawing.getAttribute('data-target')).toBe(PICKED.map((value) => value.toFixed(2)).join(','));
    expect(drawing.getAttribute('data-pixel')).toBe(`${PIXEL.y.toFixed(2)},${PIXEL.z.toFixed(2)}`);
    expect(PIXEL_POINT).toEqual([expect.any(Number), PIXEL.y, PIXEL.z]);
    expect(screen.getByTestId('keypoint-stage-frame').querySelector('[data-readout]')).toHaveTextContent('Depth read · target on the handle');
    const svg = drawing.querySelector('svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    expect(svg.textContent).toBe('');
    // The one lit part is the string: behind the frame and in front of it.
    const lit = [...svg.querySelectorAll('[data-tone="lit"], [data-lit]')];
    expect(lit).toHaveLength(2);
    expect(lit.map((node) => node.closest('[data-part]')!.getAttribute('data-part'))).toEqual(['string-back', 'string-front']);
  });

  it('describes the drawing with the method paragraph that explains the frame', () => {
    render(<KeypointString />);
    const svg = screen.getByTestId('keypoint-drawing').querySelector('svg')!;
    expect(document.getElementById(svg.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      /^The frame is that geometry made of parts, after Dürer's drawing machine\./,
    );
  });

  it('keeps the pixel while the depth moves the target along its line, in words for assistive technology', () => {
    render(<KeypointString />);
    const slider = screen.getByRole('slider', { name: 'Depth along the line' });
    const drawing = screen.getByTestId('keypoint-drawing');
    const pixel = drawing.getAttribute('data-pixel');
    fireEvent.change(slider, { target: { value: '0.7' } });
    expect(drawing).toHaveAttribute('data-place', 'short');
    expect(drawing.getAttribute('data-pixel')).toBe(pixel);
    expect(drawing.getAttribute('data-target')).not.toBe(PICKED.map((value) => value.toFixed(2)).join(','));
    expect(slider).toHaveAttribute('aria-valuetext', 'Depth 30% short of the reading: the target hangs in the air on the same line, short of the handle');
    expect(screen.getByTestId('keypoint-depth')).toHaveTextContent('70% of the reading');
    expect(screen.getByTestId('keypoint-stage-frame').querySelector('[data-readout]')).toHaveTextContent('Depth 30% short · target in the air');
    fireEvent.change(slider, { target: { value: String(SHARE_MIN) } });
    expect(drawing).toHaveAttribute('data-place', 'image');
    expect(shareValue(1)).toBe('the reading');
    expect(valueTextFor(1)).toBe("Depth from the depth camera: the target sits on the toolbox's handle");
  });

  it('lifts the point only when asked, with no pressed state, and jumps to the reading under reduced motion', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      render(<KeypointString />);
      fireEvent.change(screen.getByRole('slider', { name: 'Depth along the line' }), { target: { value: '0.5' } });
      const run = screen.getByTestId('keypoint-run');
      expect(run).not.toHaveAttribute('aria-pressed');
      expect(run).toHaveTextContent('Lift the point');
      fireEvent.click(run);
      expect(run).toHaveTextContent('Stop the lift');
      expect(run).not.toHaveAttribute('aria-pressed');
      await act(async () => {
        vi.advanceTimersByTime(RUN_SECONDS * 500);
      });
      const drawing = screen.getByTestId('keypoint-drawing');
      expect(drawing).toHaveAttribute('data-place', 'short');
      await act(async () => {
        vi.advanceTimersByTime(RUN_SECONDS * 1000);
      });
      expect(drawing).toHaveAttribute('data-place', 'on');
      expect(run).toHaveTextContent('Lift the point');
    } finally {
      vi.useRealTimers();
    }
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));
    const { container } = render(<KeypointString />);
    fireEvent.change(container.querySelector('input[type="range"]')!, { target: { value: '0.6' } });
    fireEvent.click(container.querySelector('[data-testid="keypoint-run"]')!);
    expect(container.querySelector('[data-testid="keypoint-drawing"]')).toHaveAttribute('data-place', 'on');
  });

  it('server-renders the still pose it hydrates', () => {
    const html = renderToString(<KeypointString />);
    expect(html).toContain('data-figure-frame="keypoint-string"');
    expect(html).toContain('Depth read · target on the handle');
  });
});
