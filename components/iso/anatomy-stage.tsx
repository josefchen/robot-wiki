import type { HTMLAttributes, ReactNode } from 'react';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';

/**
 * The stage an isometric figure draws on, inside the site's figure frame.
 *
 * The kit's own card puts "Fig n" and a title in its top corners, the hint
 * and the live readout in its bottom corners. Here the frame owns the
 * number, the headline and the caption (Figure N. under the hairline rule),
 * so the stage keeps only the drawing and the band under it: the
 * interaction hint at the left and the live readout at the right, in the
 * mono face at 12 px, then the status line that says how the figure was
 * made. The readout carries `data-readout`, which the kit's `useReadout`
 * writes each frame without a re-render; it is not a live region, so a
 * screen reader hears the control's value text instead of every frame.
 *
 * `.iso` scopes the kit's tokens (components/iso/iso.css), which read the
 * site's paper, ink, chart tones and accent.
 */
type AnatomyStageProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
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

export function AnatomyStage({ hint, readout, status, viewWidth, className, style, children, ...props }: AnatomyStageProps) {
  return (
    <FigureStage
      data-anatomy-stage=""
      className={className}
      style={{ ['--anatomy-view-width' as string]: `${viewWidth}px`, ...style }}
      footer={
        <>
          <span data-anatomy-hint="" className="font-sans text-[12px] leading-normal text-text-dim">
            {hint}
          </span>
          <span
            data-figure-readout=""
            data-readout=""
            className="ml-auto text-right font-mono text-[12px] leading-normal tabular-nums text-text"
          >
            {readout}
          </span>
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
