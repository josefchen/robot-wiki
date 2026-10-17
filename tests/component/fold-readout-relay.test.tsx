import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { FOLD_RELAY_SETTLE_MS } from '@/components/motion/fold-readout-relay';
import { FigureFrame, FigureStage } from '@/components/motion/figure-frame';
import { READOUT_CLEAR_MS } from '@/components/motion/settled-speech';

let setFastFromOutside: (fast: boolean) => void = () => {};

type HarnessProps = {
  /** A live note beside the controls that speaks for the press itself. */
  note?: boolean;
  /** The fold's readout is aria-live="off". */
  off?: boolean;
  /** The readout sits in "How this was made" instead of "Adjust more". */
  inMethod?: boolean;
  /** The stage is an AnatomyStage whose own readout changes with the press. */
  anatomy?: boolean;
};

function Harness({ note = false, off = false, inMethod = false, anatomy = false }: HarnessProps) {
  const [fast, setFast] = useState(false);
  useEffect(() => {
    setFastFromOutside = setFast;
  }, []);
  const readout = (
    <p aria-live={off ? 'off' : 'polite'} data-figure-readout="">
      Verdict: <span>{fast ? 'closes at 50 Hz' : 'misses 2 beats'}</span>
    </p>
  );
  return (
    <FigureFrame
      figureId="relay-test"
      heading="The brain thinks slower than the arm"
      controls={
        <>
          <button type="button" aria-pressed={fast} onClick={() => setFast(true)}>
            Data-centre computer
          </button>
          {note ? <span aria-live="polite">{fast ? 'Now on the data-centre computer' : ''}</span> : null}
        </>
      }
      adjust={
        <>
          {inMethod ? null : readout}
          <button type="button">Reset</button>
        </>
      }
      stage={
        anatomy ? (
          <AnatomyStage viewWidth={100} readout={fast ? 'on time' : 'late'}>
            <svg />
          </AnatomyStage>
        ) : (
          <FigureStage>
            <svg />
          </FigureStage>
        )
      }
      caption="Speed matters because the arm will not wait."
      method={inMethod ? readout : <p>Illustrative timings.</p>}
    />
  );
}

const relay = () => document.querySelector('[data-fold-readout-relay]')!;

/**
 * Advances the clock the way a browser does: mutation observers run after
 * each timer, so the relay sees what the stage announcer wrote before it
 * settles.
 */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** Lets the mutation observers see the render, then runs the relay's settle and speak timers. */
async function settle() {
  await advance(FOLD_RELAY_SETTLE_MS + 60);
}

const press = () => fireEvent.click(screen.getByRole('button', { name: 'Data-centre computer' }));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FoldReadoutRelay', () => {
  it('adds one hidden polite region outside the folds, empty at rest', () => {
    render(<Harness />);
    expect(relay()).toHaveClass('sr-only');
    expect(relay()).toHaveAttribute('aria-live', 'polite');
    expect(relay()).toHaveAttribute('aria-atomic', 'true');
    expect(relay().closest('details')).toBeNull();
    expect(relay().closest('[data-figure-frame]')).not.toBeNull();
    expect(relay().textContent).toBe('');
  });

  it('speaks a closed fold readout once a visible control has changed it and it holds still, then clears it', async () => {
    render(<Harness />);
    press();
    await advance(FOLD_RELAY_SETTLE_MS - 100);
    expect(relay().textContent).toBe('');
    await advance(160);
    expect(relay().textContent).toBe('Verdict: closes at 50 Hz');
    await advance(READOUT_CLEAR_MS);
    expect(relay().textContent).toBe('');
  });

  it('speaks a readout in a closed "How this was made" fold as well', async () => {
    render(<Harness inMethod />);
    press();
    await settle();
    expect(relay().textContent).toBe('Verdict: closes at 50 Hz');
  });

  it('stays quiet while the fold is open, where the readout speaks for itself', async () => {
    render(<Harness />);
    const fold = document.querySelector<HTMLDetailsElement>('details[data-figure-fold="adjust"]')!;
    fold.open = true;
    press();
    await settle();
    expect(relay().textContent).toBe('');
  });

  it('stays quiet when a live region outside the folds already spoke for the action', async () => {
    render(<Harness note />);
    press();
    await settle();
    expect(screen.getByText('Now on the data-centre computer')).toBeInTheDocument();
    expect(relay().textContent).toBe('');
  });

  it('leaves the result to the stage announcer when the stage readout changed with it', async () => {
    render(<Harness anatomy />);
    press();
    // Past the relay's settle after the announcer's own write, inside the
    // announcer's clear: the relay has decided by now.
    await advance(750 + FOLD_RELAY_SETTLE_MS + 400);
    expect(document.querySelector('[data-anatomy-announcer]')!.textContent).toBe('on time');
    expect(relay().textContent).toBe('');
  });

  it('says nothing for a change the reader did not cause', async () => {
    render(<Harness />);
    act(() => setFastFromOutside(true));
    await settle();
    expect(screen.getByText('closes at 50 Hz')).toBeInTheDocument();
    expect(relay().textContent).toBe('');
  });

  it('skips a fold readout whose live region is off', async () => {
    render(<Harness off />);
    press();
    await settle();
    expect(relay().textContent).toBe('');
  });
});
