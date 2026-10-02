import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { Surface } from '@/components/ui/surface';
import { cx } from '@/lib/utils';

/**
 * The one frame every explanatory figure renders in, in this order: a
 * header (an optional kicker, the takeaway headline, at most two visible
 * controls and the "Adjust more" fold), the bounded graphite stage, one
 * caption sentence, the "How this was made" fold, and at most one source
 * line. Legends, readouts and the scene timeline live on the stage, so
 * nothing else sits between the stage and the prose that follows it.
 *
 * The data-figure-* hooks are what scripts/check-figure-system.ts reads in
 * the static export, so a figure that drops out of this frame fails the
 * build instead of drifting quietly.
 */

/**
 * Frame text on three sizes: 16px for the headline, 14px for the caption,
 * the controls and everything on the stage, 12px for the kicker and the
 * source line.
 */
export const FIGURE_TEXT_CLASS = {
  kicker: 'font-sans text-xs font-medium leading-snug text-text-dim',
  title: 'font-sans text-base font-semibold leading-snug text-text',
  caption: 'font-sans text-sm leading-snug text-text',
  source: 'font-sans text-xs leading-snug text-text-dim',
  stage: 'font-sans text-sm leading-snug text-on-instrument',
  fold: 'font-sans text-sm leading-snug text-text',
} as const;

/** The exact summaries of the two folds the frame owns. */
export const FIGURE_FOLD_LABEL = {
  adjust: 'Adjust more',
  method: 'How this was made',
} as const;

const FOLD_SUMMARY_CLASS =
  'inline-flex min-h-11 cursor-pointer select-none list-none items-center gap-1.5 font-sans text-sm text-text-dim underline decoration-border-strong decoration-1 underline-offset-4 transition-colors hover:text-text [&::-webkit-details-marker]:hidden';

/** A border-drawn chevron: no glyph, so the summary's text is its label alone. */
function FoldMarker() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-1.5 -rotate-45 border-b-[1.5px] border-r-[1.5px] border-current transition-transform group-open/fold:rotate-45"
    />
  );
}

/**
 * One of the frame's two folds: collapsed in the served HTML, opened by
 * the native disclosure, so keyboard, pointer and no-script readers all
 * reach the same content.
 */
function FigureFold({
  kind,
  defaultOpen = false,
  className,
  children,
}: {
  kind: keyof typeof FIGURE_FOLD_LABEL;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details
      data-figure-fold={kind}
      open={defaultOpen || undefined}
      className={cx('group/fold', className)}
    >
      <summary
        data-brand-control-id="control:secondary-action"
        data-pagefind-ignore
        className={FOLD_SUMMARY_CLASS}
      >
        <FoldMarker />
        {FIGURE_FOLD_LABEL[kind]}
      </summary>
      <div
        data-figure-fold-body=""
        className={cx(
          FIGURE_TEXT_CLASS.fold,
          kind === 'adjust'
            ? 'flex flex-wrap items-end gap-x-3 gap-y-2 pb-1 pt-1'
            : 'space-y-2 pb-1 pt-1',
        )}
      >
        {children}
      </div>
    </details>
  );
}

type FrameElement = 'figure' | 'div';

export type FigureFrameProps = HTMLAttributes<HTMLElement> & {
  /** Stable id for the figure, written to data-figure-frame. */
  figureId: string;
  /** `figure` for a static figure; `div` when the root carries role="group". */
  as?: FrameElement;
  /** Optional technical name above the headline, six words or fewer. */
  kicker?: ReactNode;
  /** The headline: the figure's takeaway in plain words, ten or fewer. */
  heading: ReactNode;
  /** At most two visible controls, under the headline. */
  controls?: ReactNode;
  /** Every further control, inside the "Adjust more" fold. */
  adjust?: ReactNode;
  /**
   * Render "Adjust more" open. Only for a frame that replaces another
   * after the reader acted inside the fold, so the fold stays where the
   * reader left it; every frame is served with both folds closed.
   */
  adjustOpen?: boolean;
  /** The FigureStage. */
  stage: ReactNode;
  /** One sentence on why the point matters, 25 words or fewer. */
  caption: ReactNode;
  /** Method, data, sources and caveats, inside "How this was made". */
  method?: ReactNode;
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
  kicker,
  heading,
  controls,
  adjust,
  adjustOpen = false,
  stage,
  caption,
  captionProps,
  method,
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
      <div data-figure-header="" className="flex flex-col gap-y-2">
        <div data-figure-heading="" className="flex flex-col gap-y-0.5">
          {kicker ? (
            <div data-figure-kicker="" className={FIGURE_TEXT_CLASS.kicker}>
              {kicker}
            </div>
          ) : null}
          <div data-figure-title="" className={FIGURE_TEXT_CLASS.title}>
            {heading}
          </div>
        </div>
        {controls || adjust ? (
          <div
            data-figure-controls=""
            className="flex flex-wrap items-end gap-x-3 gap-y-2"
          >
            {controls}
            {adjust ? (
              <FigureFold kind="adjust" defaultOpen={adjustOpen} className="open:basis-full">
                {adjust}
              </FigureFold>
            ) : null}
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
      {method ? (
        <FigureFold kind="method" className="mt-1">
          {method}
        </FigureFold>
      ) : null}
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

/**
 * The status label a toy, authored or illustrative figure keeps on its
 * stage, in the VAL-MOTION-016 vocabulary ("Illustrative, not measured").
 * Only the label: the method and caveats behind it belong in "How this
 * was made".
 */
export function StageStatus({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { children: ReactNode }) {
  return (
    <p
      data-figure-status=""
      className={cx('basis-full font-sans text-sm leading-snug text-text-dim', className)}
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

/**
 * The plain-words note on an HTML stage (a table, cards, a list): the
 * highlight-role text that names what the reader should see. One per
 * figure, two at most, visible at settle.
 */
export function StageCallout({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { children: ReactNode }) {
  return (
    <p
      data-figure-annotation=""
      className={cx('font-sans text-sm font-semibold leading-snug', className)}
      style={{ color: 'var(--role-highlight-stage)' }}
      {...props}
    >
      {children}
    </p>
  );
}
