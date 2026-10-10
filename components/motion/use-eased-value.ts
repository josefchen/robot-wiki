'use client';

import { useEffect, useRef, useState } from 'react';
import { smooth } from './easing';
import { usePrefersReducedMotion } from './use-reduced-motion';
import { MOTION_TIMING } from '@/lib/motion-tokens';

/**
 * A number that glides to its target on the one motion curve, smooth(),
 * whenever the target changes: the cause-and-effect motion of a simple
 * figure, where the reader moves a control and watches the result move.
 *
 * The first render returns the target itself, so server HTML, hydration
 * and the reduced-motion end state agree. Under reduced motion every
 * change jumps straight to the target. Nothing moves while the target
 * stands still, so a figure carries no idle motion.
 */
export function useEasedValue(target: number, durationMs: number = MOTION_TIMING.beat): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(target);
  const current = useRef(target);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    const from = current.current;
    if (reduced || from === target || typeof requestAnimationFrame !== 'function') {
      current.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const next = from + (target - from) * smooth(progress);
      current.current = next;
      setValue(next);
      frame.current = progress < 1 ? requestAnimationFrame(step) : null;
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [target, durationMs, reduced]);

  return value;
}

/**
 * A replayable progress from 0 to 1 on the motion curve, for a figure that
 * draws its answer in step by step after the reader picks something. It
 * rests at 1, the finished drawing, so server HTML and reduced motion show
 * the end state; `play()` runs it again from 0, and under reduced motion
 * `play()` leaves it at 1.
 */
export function usePlayback(durationMs: number = MOTION_TIMING.beatLong): [number, () => void] {
  const reduced = usePrefersReducedMotion();
  const [progress, setProgress] = useState(1);
  const frame = useRef<number | null>(null);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  function play() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    if (reduced || typeof requestAnimationFrame !== 'function') {
      setProgress(1);
      return;
    }
    setProgress(0);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setProgress(smooth(t));
      frame.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    frame.current = requestAnimationFrame(step);
  }

  return [progress, play];
}
