'use client';

import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import { speakWhenSettled } from '@/components/motion/settled-speech';

/**
 * The stage an isometric figure draws on, inside the site's figure frame.
 *
 * The kit's own card puts "Fig n" and a title in its top corners, the hint
 * and the live readout in its bottom corners. Here the frame owns the
 * number, the headline and the caption (Figure N. under the hairline rule),
 * so the stage keeps only the drawing and the band under it: the keys to
 * the drawing's marks and the interaction hint at the left and the live
 * readout at the right (on a phone, on its own line under the hint;
 * components/iso/iso.css), in the
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
/**
 * One key under the drawing: the words that say what a mark is ("Lit:
 * flown before the camera reports"), and the `data-series` id of the
 * plotted series it names, if it names one.
 */
export type AnatomyKey = { series?: string; words: string };

type AnatomyStageProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /**
   * The keys to the drawing's marks, first in the band under it. The
   * drawing carries no words, so a plotted series is named here, by an
   * unboxed legend entry tied to it by id (VAL-B2-VIZ-004).
   */
  keys?: readonly AnatomyKey[];
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

export {
  ACTION_REACH_MS,
  READOUT_CLEAR_MS,
  READOUT_SETTLE_MS,
  RUN_REACH_MS,
  valueTextCovers,
} from '@/components/motion/settled-speech';

function useSettledReadout(readoutRef: { current: HTMLSpanElement | null }, statusRef: { current: HTMLSpanElement | null }) {
  useEffect(() => {
    const readout = readoutRef.current;
    const status = statusRef.current;
    if (!readout || !status) return;
    return speakWhenSettled({
      watch: readout,
      // The figure's controls sit beside the stage, not in it.
      scope: readout.closest('[data-figure-frame]') ?? readout.closest('[data-anatomy-stage]') ?? readout,
      status,
      read: () => (readout.textContent ?? '').replace(/\s+/g, ' ').trim(),
    });
  }, [readoutRef, statusRef]);
}

export function AnatomyStage({ keys, story, hint, readout, status, viewWidth, className, style, children, ...props }: AnatomyStageProps) {
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
          {keys && keys.length > 0 ? (
            <span
              data-instrument-legend=""
              data-figure-legend=""
              data-anatomy-keys=""
              className="flex flex-wrap gap-x-4 font-sans text-[12px] leading-normal text-text-dim"
            >
              {keys.map((key) => (
                <span key={key.words} data-legend-item="" data-legend-series={key.series}>
                  {key.words}
                </span>
              ))}
            </span>
          ) : null}
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
