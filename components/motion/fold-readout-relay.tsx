'use client';

import { useEffect, useRef } from 'react';
import { READOUT_SETTLE_MS, speakWhenSettled } from '@/components/motion/settled-speech';

const LIVE = '[aria-live], [role="status"], [role="log"], [role="alert"], output';

const politeness = (el: Element) =>
  el.getAttribute('aria-live') ?? (el.getAttribute('role') === 'alert' ? 'assertive' : 'polite');

const norm = (text: string | null) => (text ?? '').replace(/\s+/g, ' ').trim();

/**
 * Waits past the stage announcer's settle and its 50 ms write, so the relay
 * can see whether the stage already spoke for the same action.
 */
export const FOLD_RELAY_SETTLE_MS = READOUT_SETTLE_MS + 200;

/**
 * Speaks what a figure's closed folds would have announced.
 *
 * A live readout inside a closed "Adjust more" or "How this was made" fold
 * is out of the accessibility tree, so it says nothing when a visible
 * control changes it, though the drawing shows the result. While its fold
 * is closed, this relay speaks the readout once it holds still after the
 * reader's action. It stays quiet while the fold is open, where the readout
 * speaks for itself, and when a live region outside the folds (the stage's
 * announcer, a figure's own note) already spoke for that action.
 */
export function FoldReadoutRelay() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const status = ref.current;
    const frame = status?.closest('[data-figure-frame]');
    if (!status || !frame) return;
    const ownFrame = (el: Element) => el.closest('[data-figure-frame]') === frame;

    const read = () => {
      const texts: string[] = [];
      for (const fold of frame.querySelectorAll('details[data-figure-fold]:not([open])')) {
        if (!ownFrame(fold)) continue;
        for (const region of fold.querySelectorAll(LIVE)) {
          if (politeness(region) === 'off') continue;
          const outer = region.parentElement?.closest(LIVE);
          if (outer && fold.contains(outer) && politeness(outer) !== 'off') continue;
          const text = norm(region.textContent);
          if (text) texts.push(text);
        }
      }
      return texts.map((text, i) => (i < texts.length - 1 && !/[.!?:;]$/.test(text) ? `${text}.` : text)).join(' ');
    };

    let outsideSpokeAt = Number.NEGATIVE_INFINITY;
    const outside = new MutationObserver((records) => {
      for (const record of records) {
        const node = record.target instanceof Element ? record.target : record.target.parentElement;
        const region = node?.closest(LIVE);
        if (!region || region === status || !ownFrame(region) || region.closest('details')) continue;
        if (politeness(region) === 'off' || !norm(region.textContent)) continue;
        if ((region as HTMLElement).checkVisibility?.() === false) continue;
        outsideSpokeAt = performance.now();
      }
    });
    outside.observe(frame, { childList: true, characterData: true, subtree: true });

    const stop = speakWhenSettled({
      watch: frame,
      scope: frame,
      status,
      read,
      settleMs: FOLD_RELAY_SETTLE_MS,
      ignore: (record) => status.contains(record.target),
      allow: (actionStart) => outsideSpokeAt < actionStart,
    });
    return () => {
      outside.disconnect();
      stop();
    };
  }, []);
  return (
    <span
      ref={ref}
      aria-live="polite"
      aria-atomic="true"
      data-fold-readout-relay=""
      data-pagefind-ignore
      className="sr-only"
    />
  );
}
