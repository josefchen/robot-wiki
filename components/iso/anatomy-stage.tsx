'use client';

import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';

/**
 * The stage an isometric figure draws on, inside the site's figure frame.
 *
 * The kit's own card puts "Fig n" and a title in its top corners, the hint
 * and the live readout in its bottom corners. Here the frame owns the
 * number, the headline and the caption (Figure N. under the hairline rule),
 * so the stage keeps only the drawing and the band under it: the
 * interaction hint at the left and the live readout at the right (on a
 * phone, on its own line under the hint; components/iso/iso.css), in the
 * mono face at 12 px, then the status line that says how the figure was
 * made. The readout carries `data-readout`, which the kit's `useReadout`
 * writes each frame without a re-render.
 *
 * The readout itself is not a live region, because a running figure
 * rewrites it every frame. A hidden status region speaks it instead, once,
 * when it has held still for READOUT_SETTLE_MS after something the reader
 * did in this figure: the result of a Run, a preset or a step. A slider
 * whose value text already carries the readout's numbers speaks for itself,
 * so the readout is not said twice.
 *
 * `.iso` scopes the kit's tokens (components/iso/iso.css), which read the
 * site's paper, ink, chart tones and accent.
 */
type AnatomyStageProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Words the figure tells under its drawing before the hint (a step told in full), across the band. */
  story?: ReactNode;
  /** The plain-words interaction hint, under the drawing at the left. */
  hint?: ReactNode;
  /** The resting readout text, written live by the figure afterwards. */
  readout: ReactNode;
  /** The status line: what is measured and what is illustrative. */
  status?: ReactNode;
  /** The viewBox width of the drawing, which caps how far it grows. */
  viewWidth: number;
  /** The drawing (an IsoFigure). */
  children: ReactNode;
};

/** How long the readout must hold still after an action before it is spoken. */
export const READOUT_SETTLE_MS = 700;
/** How long a spoken readout stays in the status region before it is cleared. */
export const READOUT_CLEAR_MS = 4000;
/** A change that starts this soon after an action still counts as its result. */
const ACTION_REACH_MS = 1000;
const ACTION_EVENTS = ['click', 'keydown', 'input', 'change'] as const;

const numbersIn = (text: string) =>
  (text.replace(/[\u2212\u2013]/g, '-').match(/-?\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ''));

/** Whether a slider's value text already says every number the readout prints. */
export function valueTextCovers(valueText: string | null, readout: string): boolean {
  if (!valueText) return false;
  const spoken = new Set(numbersIn(valueText));
  return numbersIn(readout).every((n) => spoken.has(n));
}

function useSettledReadout(readoutRef: { current: HTMLSpanElement | null }, statusRef: { current: HTMLSpanElement | null }) {
  useEffect(() => {
    const readout = readoutRef.current;
    const status = statusRef.current;
    if (!readout || !status) return;
    // The figure's controls sit beside the stage, not in it.
    const scope: Element = readout.closest('[data-figure-frame]') ?? readout.closest('[data-anatomy-stage]') ?? readout;
    const textOf = () => (readout.textContent ?? '').replace(/\s+/g, ' ').trim();
    let settledText = textOf();
    let changed = false;
    let activityStart = 0;
    let lastAction = Number.NEGATIVE_INFINITY;
    let settleTimer: number | undefined;
    let speakTimer: number | undefined;
    let clearTimer: number | undefined;

    const speak = (text: string) => {
      window.clearTimeout(speakTimer);
      window.clearTimeout(clearTimer);
      // Emptied first, so a run that ends where the last one did is spoken again.
      status.textContent = '';
      speakTimer = window.setTimeout(() => {
        status.textContent = text;
        clearTimer = window.setTimeout(() => {
          status.textContent = '';
        }, READOUT_CLEAR_MS);
      }, 50);
    };

    const settle = () => {
      const text = textOf();
      const caused = lastAction >= activityStart - ACTION_REACH_MS;
      const wasChanged = changed;
      changed = false;
      activityStart = 0;
      settledText = text;
      if (!wasChanged || !caused || !text) return;
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement &&
        active.type === 'range' &&
        scope.contains(active) &&
        valueTextCovers(active.getAttribute('aria-valuetext'), text)
      ) {
        return;
      }
      speak(text);
    };

    const observer = new MutationObserver(() => {
      if (!activityStart) activityStart = performance.now();
      if (textOf() !== settledText) changed = true;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, READOUT_SETTLE_MS);
    });
    observer.observe(readout, { childList: true, characterData: true, subtree: true });
    const acted = () => {
      lastAction = performance.now();
    };
    for (const type of ACTION_EVENTS) scope.addEventListener(type, acted, true);
    return () => {
      observer.disconnect();
      for (const type of ACTION_EVENTS) scope.removeEventListener(type, acted, true);
      window.clearTimeout(settleTimer);
      window.clearTimeout(speakTimer);
      window.clearTimeout(clearTimer);
    };
  }, [readoutRef, statusRef]);
}

export function AnatomyStage({ story, hint, readout, status, viewWidth, className, style, children, ...props }: AnatomyStageProps) {
  const readoutRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  useSettledReadout(readoutRef, statusRef);
  return (
    <FigureStage
      data-anatomy-stage=""
      className={className}
      style={{ ['--anatomy-view-width' as string]: `${viewWidth}px`, ...style }}
      footer={
        <>
          {story}
          <span data-anatomy-hint="" className="font-sans text-[12px] leading-normal text-text-dim">
            {hint}
          </span>
          <span
            ref={readoutRef}
            data-figure-readout=""
            data-readout=""
            className="ml-auto text-right font-mono text-[12px] leading-normal tabular-nums text-text"
          >
            {readout}
          </span>
          <span ref={statusRef} role="status" data-anatomy-announcer="" data-pagefind-ignore className="sr-only" />
          {status ? <StageStatus>{status}</StageStatus> : null}
        </>
      }
      {...props}
    >
      <div className="iso" data-anatomy-drawing="">
        {children}
      </div>
    </FigureStage>
  );
}
