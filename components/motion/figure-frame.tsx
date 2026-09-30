import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { Surface } from '@/components/ui/surface';
import { cx } from '@/lib/utils';

/**
 * The one frame every explanatory figure renders in, in this order: a
 * header with a short title and the shared controls, the bounded graphite
 * stage, one caption line, and at most one source line. Legends, readouts
 * and the scene timeline live on the stage, so nothing else sits between
 * the stage and the prose that follows it.
 *
 * The data-figure-* hooks are what scripts/check-figure-system.ts reads in
 * the static export, so a figure that drops out of this frame fails the
 * build instead of drifting quietly.
 */

/**
 * Frame text on the shared scale: 14px for the title and caption, 13px on
 * the stage, 12px for the source line. With the stage type roles (14, 13,
 * 12) that keeps every figure on three sizes.
 */
export const FIGURE_TEXT_CLASS = {
  title: 'font-sans text-sm font-semibold leading-snug text-text',
  caption: 'font-sans text-sm leading-snug text-text',
  source: 'font-sans text-xs leading-snug text-text-dim',
  stage: 'font-sans text-[13px] leading-snug text-on-instrument',
} as const;

type FrameElement = 'figure' | 'div';

export type FigureFrameProps = HTMLAttributes<HTMLElement> & {
  /** Stable id for the figure, written to data-figure-frame. */
  figureId: string;
  /** `figure` for a static figure; `div` when the root carries role="group". */
  as?: FrameElement;
  /** The title: a short noun phrase that fits on one line at 375px. */
  heading: ReactNode;
  /** The shared controls, right of the title and wrapping below it. */
  controls?: ReactNode;
  /** The FigureStage. */
  stage: ReactNode;
  /** One caption line, 20 words or fewer. */
  caption: ReactNode;
  /** Attributes for the caption element (live region, test id, ref). */
  captionProps?: HTMLAttributes<HTMLElement> & {
    ref?: Ref<HTMLDivElement>;
    [data: `data-${string}`]: string | undefined;
  };
  /** At most one source line. */
  source?: ReactNode;
  ref?: Ref<HTMLElement>;
  /** Non-visual companions such as the screen-reader alternative. */
  children?: ReactNode;
};

export function FigureFrame({
  figureId,
  as = 'figure',
  heading,
  controls,
  stage,
  caption,
  captionProps,
  source,
  className,
  children,
  ref,
  ...props
}: FigureFrameProps) {
  const captionClass = cx(FIGURE_TEXT_CLASS.caption, 'mt-2', captionProps?.className);
  const rootProps = {
    'data-figure-frame': figureId,
    className: cx('my-6 text-left', className),
    ...props,
  };
  // No frame text is a <p>: the article sheet measures every paragraph in
  // the reading column outside a registered surface as running prose, and
  // a figure title or caption is figure text in the sans, not body prose.
  const body = (
    <>
      <div
        data-figure-header=""
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
      >
        <div data-figure-title="" className={FIGURE_TEXT_CLASS.title}>
          {heading}
        </div>
        {controls ? (
          <div
            data-figure-controls=""
            className="flex flex-wrap items-center gap-2"
          >
            {controls}
          </div>
        ) : null}
      </div>
      {stage}
      {as === 'figure' ? (
        <figcaption
          data-figure-caption=""
          {...captionProps}
          ref={captionProps?.ref as Ref<HTMLElement> | undefined}
          className={captionClass}
        >
          {caption}
        </figcaption>
      ) : (
        <div data-figure-caption="" {...captionProps} className={captionClass}>
          {caption}
        </div>
      )}
      {source ? (
        <div
          data-figure-source=""
          className={cx(FIGURE_TEXT_CLASS.source, 'mt-1')}
        >
          {source}
        </div>
      ) : null}
      {children}
    </>
  );
  return as === 'figure' ? (
    <figure ref={ref} {...rootProps}>
      {body}
    </figure>
  ) : (
    <div ref={ref as Ref<HTMLDivElement>} {...rootProps}>
      {body}
    </div>
  );
}

type FigureStageProps = HTMLAttributes<HTMLDivElement> & {
  /** `figure` when the stage alone is the figure and the frame is a div. */
  as?: 'div' | 'figure';
  /** The drawing: one svg on the stage type scale. */
  children: ReactNode;
  /** Legend and readout band along the bottom of the stage. */
  footer?: ReactNode;
  /** The scene timeline band below the footer. */
  timeline?: ReactNode;
};

/**
 * The bounded graphite stage. stage.css maps the light-ground role and text
 * variants to their stage values inside it, so a legend swatch or readout
 * written for the page ground still paints the stage colour here.
 */
export function FigureStage({
  as = 'div',
  children,
  footer,
  timeline,
  className,
  ...props
}: FigureStageProps) {
  return (
    <Surface
      as={as}
      level="bounded-dark"
      data-figure-stage=""
      className={cx('mt-2 overflow-hidden', className)}
      {...props}
    >
      {children}
      {footer ? (
        <div
          data-figure-stage-band="footer"
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 pb-2.5"
        >
          {footer}
        </div>
      ) : null}
      {timeline ? (
        <div data-figure-stage-band="timeline" className="px-3 pb-3">
          {timeline}
        </div>
      ) : null}
    </Surface>
  );
}

/** The legend, on the stage beside the marks it names. */
export function StageLegend({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      data-instrument-legend=""
      data-figure-legend=""
      className={cx(
        'flex flex-wrap items-center gap-x-4 gap-y-1',
        FIGURE_TEXT_CLASS.stage,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * The current-state readout on the stage. Labels stay in the brand sans;
 * StageNumber marks the digits that may take the mono face.
 */
export function StageReadout({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { children: ReactNode }) {
  return (
    <p
      aria-live="polite"
      data-figure-readout=""
      className={cx(FIGURE_TEXT_CLASS.stage, 'tabular-nums', className)}
      {...props}
    >
      {children}
    </p>
  );
}

/** A numeric value inside a readout: digits, signs, units, separators. */
export function StageNumber({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return (
    <span
      data-figure-number=""
      className={cx('font-mono tabular-nums', className)}
      {...props}
    >
      {children}
    </span>
  );
}
