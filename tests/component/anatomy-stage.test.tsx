import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACTION_REACH_MS,
  AnatomyStage,
  READOUT_CLEAR_MS,
  READOUT_SETTLE_MS,
  RUN_REACH_MS,
  alreadySaid,
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
      {/* A run with a lead-in: the press itself leaves the readout alone. */}
      <button type="button">Start</button>
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

/** A figure with its own live readout beside the stage, as an instrument figure has. */
function LiveReadoutHarness({ sentence }: { sentence: (km: number) => string }) {
  const [km, setKm] = useState(70);
  return (
    <figure data-figure-frame="">
      <button type="button" onClick={() => setKm(80)}>
        Faster camera
      </button>
      <p aria-live="polite" data-figure-readout="">
        {sentence(km)}
      </p>
      <AnatomyStage viewWidth={100} readout={`top safe speed about ${km} km/h`}>
        <svg />
      </AnatomyStage>
    </figure>
  );
}

/** A slider figure whose live readout re-renders on the slider's input event, before its change event. */
function LiveSliderHarness() {
  const [km, setKm] = useState(70);
  return (
    <figure data-figure-frame="">
      <input
        type="range"
        aria-label="Camera speed"
        min={60}
        max={90}
        value={km}
        onChange={(e) => setKm(Number(e.target.value))}
      />
      <p aria-live="polite" data-figure-readout="">
        At about {km} kilometres an hour the drone flies about 0.3 metres blind.
      </p>
      <AnatomyStage viewWidth={100} readout={`top safe speed about ${km} km/h`}>
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

  it('speaks a run whose readout first moves more than a second after the press', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    act(() => setReadoutFromOutside('aim outside again'));
    await settle();
    expect(announcer().textContent).toBe('aim outside again');
  });

  it('speaks each held phase of a slow run and where it ends', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    act(() => setReadoutFromOutside('aim outside again'));
    await settle();
    expect(announcer().textContent).toBe('aim outside again');
    // The last phase comes later than the reach from the press, but soon after the spoken pause.
    act(() => {
      vi.advanceTimersByTime(ACTION_REACH_MS - 500);
    });
    act(() => setReadoutFromOutside('done'));
    await settle();
    expect(announcer().textContent).toBe('done');
  });

  it('stops treating a run as the reader’s once it outlasts the run reach', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    let elapsed = 0;
    let phase = 0;
    while (elapsed + ACTION_REACH_MS < RUN_REACH_MS) {
      act(() => {
        vi.advanceTimersByTime(ACTION_REACH_MS - 1000);
      });
      act(() => setReadoutFromOutside(`phase ${++phase}`));
      await settle();
      expect(announcer().textContent).toBe(`phase ${phase}`);
      elapsed += ACTION_REACH_MS - 1000 + READOUT_SETTLE_MS + 60;
    }
    act(() => {
      vi.advanceTimersByTime(RUN_REACH_MS - elapsed + 100);
    });
    act(() => setReadoutFromOutside('ambient'));
    await settle();
    expect(announcer().textContent).not.toBe('ambient');
  });

  it('stays silent when the readout first moves long after the press', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => {
      vi.advanceTimersByTime(ACTION_REACH_MS + 500);
    });
    act(() => setReadoutFromOutside('drifting'));
    await settle();
    expect(announcer().textContent).toBe('');
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

describe('AnatomyStage beside a live readout', () => {
  it('stays quiet when the figure’s live readout already said the stage’s numbers for the action', async () => {
    render(<LiveReadoutHarness sentence={(km) => `At about ${km} kilometres an hour the drone flies about 0.3 metres blind.`} />);
    fireEvent.click(screen.getByRole('button', { name: 'Faster camera' }));
    await settle();
    expect(screen.getByText(/At about 80 kilometres/)).toBeInTheDocument();
    expect(announcer().textContent).toBe('');
  });

  it('stays quiet after a slider key press whose change event follows the live readout’s render', async () => {
    render(<LiveSliderHarness />);
    const slider = screen.getByRole('slider', { name: 'Camera speed' });
    slider.focus();
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.input(slider, { target: { value: '71' } });
    await act(async () => {
      await Promise.resolve();
    });
    // A heavy figure's render takes a while before the browser fires change for the same press.
    act(() => {
      vi.advanceTimersByTime(30);
    });
    fireEvent.change(slider);
    await settle();
    expect(screen.getByText(/At about 71 kilometres/)).toBeInTheDocument();
    expect(announcer().textContent).toBe('');
  });

  it('speaks when the live readout said something else', async () => {
    render(<LiveReadoutHarness sentence={() => 'The camera is faster.'} />);
    fireEvent.click(screen.getByRole('button', { name: 'Faster camera' }));
    await settle();
    expect(announcer().textContent).toBe('top safe speed about 80 km/h');
  });
});

describe('alreadySaid', () => {
  it('reads an announcement as said when the words or every printed number were spoken', () => {
    expect(alreadySaid('At about 80 kilometres an hour the drone flies 0.3 m blind', 'top safe speed about 80 km/h')).toBe(true);
    expect(alreadySaid('At about 83 kilometres an hour it flies about 0.0 metres blind', 'Camera 0 ms late · about 83 km/h')).toBe(true);
    expect(alreadySaid('Grip holds.', 'grip holds')).toBe(true);
    expect(alreadySaid('shoulder 110°; hand at x -0.23, y -0.30', 'Shoulder 110 degrees · hand 0.23 left, 0.30 back')).toBe(true);
    expect(alreadySaid('At about 80 kilometres an hour', 'top safe speed about 80 km/h · 12 cm margin')).toBe(false);
    expect(alreadySaid('The camera is faster.', 'Grip holds')).toBe(false);
    expect(alreadySaid('', 'top safe speed about 80 km/h')).toBe(false);
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
