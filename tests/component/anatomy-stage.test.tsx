import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AnatomyStage,
  READOUT_CLEAR_MS,
  READOUT_SETTLE_MS,
  valueTextCovers,
} from '@/components/iso/anatomy-stage';

let setReadoutFromOutside: (text: string) => void = () => {};

function Harness({ valueText }: { valueText?: (value: number) => string }) {
  const [readout, setReadout] = useState('resting');
  const [value, setValue] = useState(0);
  useEffect(() => {
    setReadoutFromOutside = setReadout;
  }, []);
  return (
    <figure data-figure-frame="">
      <button type="button" onClick={() => setReadout('step one')}>
        Step
      </button>
      <button type="button" onClick={() => setReadout('phase 1')}>
        Run
      </button>
      <input
        type="range"
        aria-label="Speed"
        min={0}
        max={10}
        value={value}
        aria-valuetext={valueText?.(value)}
        onChange={(e) => {
          const next = Number(e.target.value);
          setValue(next);
          setReadout(`speed ${next} · stops in ${next * 2} cm`);
        }}
      />
      <AnatomyStage viewWidth={100} readout={readout}>
        <svg />
      </AnatomyStage>
    </figure>
  );
}

const announcer = () => document.querySelector('[data-anatomy-announcer]')!;

/** Lets the mutation observer see the render, then runs the settle and speak timers. */
async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
  act(() => {
    vi.advanceTimersByTime(READOUT_SETTLE_MS + 60);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AnatomyStage readout announcements', () => {
  it('keeps the visible readout out of live regions and adds one hidden status region', () => {
    render(<Harness />);
    const readout = screen.getByText('resting');
    expect(readout.closest('[aria-live], [role=status]')).toBeNull();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(announcer()).toHaveClass('sr-only');
    expect(announcer().textContent).toBe('');
  });

  it('speaks the result of a button once it holds still, then clears it', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Step' }));
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      vi.advanceTimersByTime(READOUT_SETTLE_MS - 100);
    });
    expect(announcer().textContent).toBe('');
    await settle();
    expect(announcer().textContent).toBe('step one');
    act(() => {
      vi.advanceTimersByTime(READOUT_CLEAR_MS);
    });
    expect(announcer().textContent).toBe('');
  });

  it('speaks only where a run ends, not each value it passes through', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    for (const phase of ['phase 2', 'phase 3', 'done']) {
      await act(async () => {
        await Promise.resolve();
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(announcer().textContent).toBe('');
      act(() => setReadoutFromOutside(phase));
    }
    await settle();
    expect(announcer().textContent).toBe('done');
  });

  it('speaks a second run that ends where the first did', async () => {
    render(<Harness />);
    for (let run = 0; run < 2; run++) {
      fireEvent.click(screen.getByRole('button', { name: 'Run' }));
      await act(async () => {
        await Promise.resolve();
      });
      act(() => setReadoutFromOutside('done'));
      await settle();
      expect(announcer().textContent).toBe('done');
      act(() => {
        vi.advanceTimersByTime(READOUT_CLEAR_MS);
      });
      expect(announcer().textContent).toBe('');
    }
  });

  it('stays silent when the readout changes without anything the reader did', async () => {
    render(<Harness />);
    act(() => setReadoutFromOutside('drifting'));
    await settle();
    expect(announcer().textContent).toBe('');
  });

  it('leaves a slider whose value text carries the readout to speak for itself', async () => {
    render(<Harness valueText={(v) => `${v} of 10; stops in ${v * 2} centimetres`} />);
    const slider = screen.getByRole('slider', { name: 'Speed' });
    slider.focus();
    fireEvent.change(slider, { target: { value: '3' } });
    await settle();
    expect(announcer().textContent).toBe('');
  });

  it('speaks the readout after a slider that has no value text of its own', async () => {
    render(<Harness />);
    const slider = screen.getByRole('slider', { name: 'Speed' });
    slider.focus();
    fireEvent.change(slider, { target: { value: '3' } });
    await settle();
    expect(announcer().textContent).toBe('speed 3 · stops in 6 cm');
  });
});

describe('valueTextCovers', () => {
  it('reads coverage as every printed number being in the value text', () => {
    expect(valueTextCovers('75%; feet float 23 cm above the floor', 'feet float 23 cm')).toBe(true);
    expect(valueTextCovers('15 steps', '15 steps ahead · 0.301 off the route')).toBe(false);
    expect(valueTextCovers('4 newtons', 'mug moved 0 centimetres')).toBe(false);
    expect(valueTextCovers('a nudge of \u22120.056', 'nudge -0.056 lands in slot 120')).toBe(false);
    expect(valueTextCovers('1,505 units at slot 120, nudge \u22120.056', 'nudge -0.056 · 1505 units · slot 120')).toBe(true);
    expect(valueTextCovers(null, 'Aim inside')).toBe(false);
    expect(valueTextCovers('50% along the stroke: the pen is held', 'Aim inside · pen held at the fence')).toBe(true);
  });
});
