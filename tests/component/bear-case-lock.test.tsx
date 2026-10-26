import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BearCaseLock, NONE_SUPPOSED, poseFor, readoutFor } from '@/components/interactive/bear-case-lock';
import { LIFT, PIN_X, PREMISES, SHEAR_Z, TURN, boltOut, liftFor, movingAt, opens, statusOf } from '@/components/iso/figures/bear-lock';
import { MILESTONES } from '@/lib/bear-case';

const ALL = { commercial: true, generalization: true, 'form-factor': true, plateau: true } as const;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the bear-case lock model', () => {
  it("takes each pin's status from the watchlist's milestone for that result, and none is met in September 2026", () => {
    expect(PREMISES.map(({ id }) => id)).toEqual(['commercial', 'generalization', 'form-factor', 'plateau']);
    for (const premise of PREMISES) {
      const milestone = MILESTONES.find(({ id }) => id === premise.milestone);
      expect(milestone, premise.milestone).toBeDefined();
      expect(statusOf(premise.id)).toBe(milestone!.status);
    }
    expect(PREMISES.map(({ id }) => statusOf(id))).toEqual(['not-met', 'partial', 'not-met', 'partial']);
    // The pins stand where the calls put them: not met highest, partial lower, met on the line.
    expect(LIFT['not-met']).toBeGreaterThan(LIFT.partial);
    expect(LIFT.partial).toBeGreaterThan(0);
    expect(LIFT.met).toBe(0);
  });

  it('turns the plug only when all four pins sit on the shear line', () => {
    const still = poseFor(NONE_SUPPOSED);
    expect(still.lifts).toEqual([10, 4.5, 10, 4.5]);
    expect(still.turn).toBe(0);
    // Every set of supposed results short of all four leaves the lock held.
    for (let mask = 0; mask < 16; mask++) {
      const supposed = Object.fromEntries(PREMISES.map(({ id }, index) => [id, Boolean(mask & (1 << index))])) as typeof ALL;
      const pose = poseFor(supposed);
      PREMISES.forEach(({ id }, index) => expect(pose.lifts[index]).toBe(liftFor(id, supposed[id])));
      expect(pose.turn).toBe(mask === 15 ? TURN : 0);
      expect(opens(pose.lifts)).toBe(mask === 15);
    }
  });

  it('draws each split where its lift puts it and draws the bolt back as the plug turns', () => {
    // A supposed pin's key pin lies flush in the plug: only the driver stands on the line.
    const held = movingAt([10, 4.5, 0, 0], 0);
    const solids = held.pins.filter((part) => part.kind === 'solid');
    // Two key pins above the line, four drivers.
    expect(solids).toHaveLength(6);
    expect(PIN_X).toHaveLength(4);
    expect(SHEAR_Z).toBeGreaterThan(0);
    expect(boltOut(0)).toBeGreaterThan(boltOut(TURN));
    expect(boltOut(TURN / 2)).toBeCloseTo((boltOut(0) + boltOut(TURN)) / 2, 9);
    // Turned, the four key pins' flush ends ride round on the plug.
    const open = movingAt([0, 0, 0, 0], TURN);
    expect(open.pins.filter((part) => part.kind === 'solid')).toHaveLength(8);
  });

  it('reads out in words', () => {
    expect(readoutFor(NONE_SUPPOSED, 0)).toBe('None of 4 in, 2 partly · locked');
    expect(readoutFor({ ...NONE_SUPPOSED, commercial: true, plateau: true }, 0)).toBe('Supposing 2 of 4 · still locked');
    expect(readoutFor(ALL, TURN / 2)).toBe('All 4 supposed · pins reach the line');
    expect(readoutFor(ALL, TURN)).toBe('All 4 supposed · the plug turns');
  });
});

describe('BearCaseLock', () => {
  it('draws the still pose: four pins above the line, the plug held, no words in the drawing', () => {
    render(<BearCaseLock />);
    expect(screen.getByText('Four results together would falsify the bear case')).toBeInTheDocument();
    const drawing = screen.getByTestId('bear-lock-drawing');
    expect(drawing).toHaveAttribute('data-lifts', '10,4.5,10,4.5');
    expect(drawing).toHaveAttribute('data-on-line', '0');
    expect(drawing).toHaveAttribute('data-open', 'false');
    const stage = screen.getByTestId('bear-lock-stage-frame');
    expect(stage.querySelector('[data-readout]')).toHaveTextContent('None of 4 in, 2 partly · locked');
    expect(stage).toHaveTextContent(/illustrative/);
    const svg = drawing.querySelector('svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    expect(svg.textContent).toBe('');
    // The one lit part is the plug: its quarter in the window and its face at the key end.
    const lit = [...svg.querySelectorAll('[data-lit]')];
    expect(lit.length).toBeGreaterThan(0);
    for (const solid of lit) expect(['plug', 'face']).toContain(solid.closest('[data-part]')?.getAttribute('data-part'));
    expect(svg.getAttribute('aria-label')).toMatch(/0 of 4 pins sit on the shear line/);
  });

  it('describes the drawing with the method paragraph that explains the lock', () => {
    render(<BearCaseLock />);
    const svg = screen.getByTestId('bear-lock-drawing').querySelector('svg')!;
    expect(document.getElementById(svg.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      /^The drawing is a pin-tumbler lock cut open in front of its pins, one stack per premise\./,
    );
  });

  it('toggles each supposed result, and turns the plug at once under reduced motion when all four are in', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));
    render(<BearCaseLock />);
    const toggles = PREMISES.map(({ id }) => screen.getByTestId(`bear-lock-${id}`));
    for (const toggle of toggles) expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggles[0]!);
    expect(toggles[0]).toHaveAttribute('aria-pressed', 'true');
    const drawing = screen.getByTestId('bear-lock-drawing');
    expect(drawing).toHaveAttribute('data-lifts', '0,4.5,10,4.5');
    expect(drawing).toHaveAttribute('data-open', 'false');
    for (const toggle of toggles.slice(1)) fireEvent.click(toggle);
    expect(drawing).toHaveAttribute('data-lifts', '0,0,0,0');
    expect(drawing).toHaveAttribute('data-open', 'true');
    expect(screen.getByTestId('bear-lock-stage-frame').querySelector('[data-readout]')).toHaveTextContent('All 4 supposed · the plug turns');
    // Taking one result back holds the lock again.
    fireEvent.click(toggles[2]!);
    expect(drawing).toHaveAttribute('data-open', 'false');
    expect(drawing).toHaveAttribute('data-lifts', '0,0,10,0');
  });

  it('moves the pins first and turns the plug only once they are on the line', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      render(<BearCaseLock />);
      for (const { id } of PREMISES) fireEvent.click(screen.getByTestId(`bear-lock-${id}`));
      const drawing = screen.getByTestId('bear-lock-drawing');
      let sawPinsMovingWhileHeld = false;
      for (let frame = 0; frame < 240; frame++) {
        await act(async () => {
          vi.advanceTimersByTime(16);
        });
        const lifts = drawing.getAttribute('data-lifts')!.split(',').map(Number);
        const turn = Number(drawing.getAttribute('data-turn'));
        if (lifts.some((lift) => lift > 0)) {
          expect(turn).toBe(0);
          sawPinsMovingWhileHeld = true;
        }
      }
      expect(sawPinsMovingWhileHeld).toBe(true);
      expect(drawing).toHaveAttribute('data-open', 'true');
      expect(drawing).toHaveAttribute('data-turn', '75');
    } finally {
      vi.useRealTimers();
    }
  });

  it('server-renders the still pose it hydrates', () => {
    const html = renderToString(<BearCaseLock />);
    expect(html).toContain('data-figure-frame="bear-case-lock"');
    expect(html).toContain('None of 4 in, 2 partly · locked');
    expect(html).not.toContain('aria-pressed="true"');
  });
});
