import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlayback, useEasedValue } from '@/components/motion/use-eased-value';

const original = window.matchMedia;
function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

/** A hand-cranked animation clock: each tick advances performance.now and runs one frame. */
function manualFrames() {
  let now = 0;
  let queue: FrameRequestCallback[] = [];
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    queue.push(cb);
    return queue.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    queue = [];
  });
  return (ms: number) => {
    now += ms;
    const run = queue;
    queue = [];
    act(() => run.forEach((cb) => cb(now)));
  };
}

describe('useEasedValue', () => {
  afterEach(() => {
    window.matchMedia = original;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the target first, then glides to a new target on the smooth curve', () => {
    mockReducedMotion(false);
    const tick = manualFrames();
    const { result, rerender } = renderHook(({ target }) => useEasedValue(target, 1000), { initialProps: { target: 0 } });
    expect(result.current).toBe(0);
    rerender({ target: 10 });
    tick(0);
    tick(500);
    expect(result.current).toBeCloseTo(5);
    tick(250);
    expect(result.current).toBeGreaterThan(7.5);
    tick(250);
    expect(result.current).toBe(10);
  });

  it('jumps straight to the target under reduced motion', () => {
    mockReducedMotion(true);
    const { result, rerender } = renderHook(({ target }) => useEasedValue(target), { initialProps: { target: 0 } });
    rerender({ target: 4 });
    expect(result.current).toBe(4);
  });
});

describe('usePlayback', () => {
  beforeEach(() => mockReducedMotion(false));
  afterEach(() => {
    window.matchMedia = original;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rests at the finished state and replays from zero when asked', () => {
    const tick = manualFrames();
    const { result } = renderHook(() => usePlayback(1000));
    expect(result.current[0]).toBe(1);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(0);
    tick(500);
    expect(result.current[0]).toBeCloseTo(0.5);
    tick(500);
    expect(result.current[0]).toBe(1);
  });

  it('stays finished under reduced motion', () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => usePlayback());
    act(() => result.current[1]());
    expect(result.current[0]).toBe(1);
  });
});
