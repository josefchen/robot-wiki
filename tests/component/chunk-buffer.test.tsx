import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChunkBuffer, RUN_MS, valueTextFor } from '@/components/interactive/chunk-buffer';
import { CARD_W, PITCH, WELL_X, beltCards, indexShare, poseAt } from '@/components/iso/figures/card-feeder';
import { ANSWER_MS, SLOW, STILL_CHUNK, STILL_MS, TICK_MS, actionOfTick, actionsLeft, firstTickOf, leftOver } from '@/lib/chunk-buffer';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the card feeder drawing', () => {
  it('indexes the wheel and the belt a quarter turn and one slot a tick, smoothly, from the pin in its slot', () => {
    expect(indexShare(0)).toBe(0);
    expect(indexShare(TICK_MS - 0.001)).toBe(1);
    let last = 0;
    for (let u = 0; u < TICK_MS; u += 0.05) {
      const share = indexShare(u);
      expect(share).toBeGreaterThanOrEqual(last - 1e-12);
      expect(share - last).toBeLessThan(0.05);
      last = share;
    }
  });

  it('carries exactly the played actions on the belt, one slot a tick, and leaves a slot empty for a tick the arm waits', () => {
    for (const chunk of [4, 8, 12, 13, 16, 24]) {
      for (let ms = 0; ms < 1000; ms += 7) {
        const pose = poseAt({ chunk, ms });
        for (const card of beltCards({ chunk, ms })) {
          expect(actionOfTick(chunk, card.tick)).not.toBeNull();
          expect(card.x).toBeCloseTo(WELL_X + (pose.tick - card.tick + pose.share) * PITCH, 9);
        }
        // Between the eject and the index, the newest card sits on the slot at the well.
        if (pose.u >= 8 - 1e-9 && pose.u < 8 && actionOfTick(chunk, pose.tick)) {
          expect(beltCards({ chunk, ms }).some((card) => card.tick === pose.tick && card.x === WELL_X)).toBe(true);
        }
      }
    }
  });

  it('keeps the deck in the well at the model count, and lands each answer exactly at its first tick', () => {
    for (const chunk of [8, 16]) {
      for (let ms = 0; ms < 1000; ms += 3) {
        // Once the leaving card is out and the stack has settled, the deck holds exactly what the model has left.
        if (poseAt({ chunk, ms }).u >= 8) expect(poseAt({ chunk, ms }).left).toBe(actionsLeft(chunk, ms));
      }
      for (let answer = 1; answer < 4; answer++) {
        const load = answer * ANSWER_MS;
        expect(firstTickOf(answer) * TICK_MS).toBeGreaterThanOrEqual(load);
        expect(poseAt({ chunk, ms: load - 0.001 }).wellX).toBeCloseTo(WELL_X + CARD_W + 0.4, 1);
        const landed = poseAt({ chunk, ms: load + 0.001 });
        expect(landed.wellX).toBe(WELL_X);
        expect(landed.previous).toBe(leftOver(chunk, answer - 1));
      }
    }
  });
});

describe('ChunkBuffer', () => {
  it('draws the still pose: a deck of 16 just after an answer landed, every slot full, no words in the drawing', () => {
    render(<ChunkBuffer />);
    expect(screen.getByText('Each answer carries enough actions to last until the next')).toBeInTheDocument();
    const drawing = screen.getByTestId('chunk-drawing');
    expect(drawing).toHaveAttribute('data-chunk', String(STILL_CHUNK));
    expect(drawing).toHaveAttribute('data-ms', String(STILL_MS));
    expect(drawing).toHaveAttribute('data-left', String(actionsLeft(STILL_CHUNK, STILL_MS)));
    expect(drawing).toHaveAttribute('data-filled', '50');
    expect(screen.getByTestId('chunk-stage-frame').querySelector('[data-readout]')).toHaveTextContent('16 per chunk · the arm never waits');
    const svg = drawing.querySelector('svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    expect(svg.textContent).toBe('');
    // The one lit part is the deck being played.
    const lit = [...svg.querySelectorAll('[data-lit]')];
    expect(lit).toHaveLength(1);
    expect(lit[0]!.closest('[data-part]')).toHaveAttribute('data-part', 'decks');
  });

  it('describes the drawing with the method paragraph that explains the feeder', () => {
    render(<ChunkBuffer />);
    const svg = screen.getByTestId('chunk-drawing').querySelector('svg')!;
    expect(document.getElementById(svg.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      /^The feeder is that arithmetic made of parts\./,
    );
  });

  it('shows the empty slots of a chunk too small, in words for assistive technology', () => {
    render(<ChunkBuffer />);
    const slider = screen.getByRole('slider', { name: 'Actions per chunk' });
    const full = Number(screen.getByTestId('chunk-drawing').getAttribute('data-on-belt'));
    fireEvent.change(slider, { target: { value: '8' } });
    expect(slider).toHaveAttribute('aria-valuetext', '8 actions per chunk: 32 of 50 ticks a second have an action, and the arm waits at the other 18');
    expect(screen.getByTestId('chunk-size')).toHaveTextContent('8 actions');
    const drawing = screen.getByTestId('chunk-drawing');
    expect(Number(drawing.getAttribute('data-on-belt'))).toBeLessThan(full);
    expect(screen.getByTestId('chunk-stage-frame').querySelector('[data-readout]')).toHaveTextContent('8 per chunk · arm waits 18 of 50 ticks');
    expect(valueTextFor(13)).toBe('13 actions per chunk: 13 or more, so every tick has an action');
  });

  it('runs the clock only when asked, slowed, with no pressed state, and jumps to the end under reduced motion', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      render(<ChunkBuffer />);
      const run = screen.getByTestId('chunk-run');
      expect(run).not.toHaveAttribute('aria-pressed');
      expect(run).toHaveTextContent('Run the clock');
      fireEvent.click(run);
      expect(run).toHaveTextContent('Stop the clock');
      expect(run).not.toHaveAttribute('aria-pressed');
      await act(async () => {
        vi.advanceTimersByTime(100 * SLOW);
      });
      const drawing = screen.getByTestId('chunk-drawing');
      const between = Number(drawing.getAttribute('data-ms'));
      expect(between).toBeGreaterThan(STILL_MS + 90);
      expect(between).toBeLessThan(STILL_MS + 110);
      await act(async () => {
        vi.advanceTimersByTime(RUN_MS * SLOW);
      });
      expect(drawing).toHaveAttribute('data-ms', String(STILL_MS + RUN_MS));
      expect(run).toHaveTextContent('Run the clock');
    } finally {
      vi.useRealTimers();
    }
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));
    const { container } = render(<ChunkBuffer />);
    fireEvent.click(container.querySelector('[data-testid="chunk-run"]')!);
    expect(container.querySelector('[data-testid="chunk-drawing"]')).toHaveAttribute('data-ms', String(STILL_MS + RUN_MS));
  });

  it('server-renders the still pose it hydrates', () => {
    const html = renderToString(<ChunkBuffer />);
    expect(html).toContain('data-figure-frame="chunk-buffer"');
    expect(html).toContain('16 per chunk · the arm never waits');
  });
});
