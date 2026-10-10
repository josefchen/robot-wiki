import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cx } from '@/lib/utils';

/**
 * The one frame every explanatory figure renders in, in this DOM order: a
 * header (an optional kicker, the takeaway headline, at most two visible
 * controls and the "Adjust more" fold), the stage, one caption sentence,
 * the "How this was made" fold, and at most one source line. Legends,
 * readouts and the scene timeline live on the stage, so nothing else sits
 * between the stage and the prose that follows it.
 *
 * On the page (owner-approved figure standard, 10 October 2026) the frame
 * is a 1 px hairline box with no fill: the controls, then the drawing,
 * then a hairline rule and the caption block. The caption block opens
 * with "Figure N." in ink, numbered per page by a CSS counter, followed by
 * the headline, the caption sentence, the method fold and the source line
 * in muted 13 px sans. stage.css owns that layout: the header keeps its
 * place in the DOM and flex order moves the headline under the rule.
 *
 * The data-figure-* hooks are what scripts/check-figure-system.ts reads in
 * the static export, so a figure that drops out of this frame fails the
 * build instead of drifting quietly.
 */

/**
 * Frame text on three sizes: 13px for the caption block (headline, caption,
 * folds, source), 12px on the stage (legend, readout, status line) and
 * for the hidden kicker. The caption block is muted; only its "Figure N."
 * label reads in ink.
 */
export const FIGURE_TEXT_CLASS = {
  kicker: 'font-sans text-[12px] leading-normal text-text-dim',
  title: 'font-sans text-[13px] leading-normal text-text-dim',
  caption: 'font-sans text-[13px] leading-normal text-text-dim',
  source: 'font-sans text-[13px] leading-normal text-text-dim',
  stage: 'font-sans text-[12px] leading-normal text-text',
  fold: 'font-sans text-[13px] leading-normal text-text-dim',
} as const;

/** The exact summaries of the two folds the frame owns. */
export const FIGURE_FOLD_LABEL = {
  adjust: 'Adjust more',
  method: 'How this was made',
} as const;

const FOLD_SUMMARY_CLASS =
  'inline-flex min-h-8 cursor-pointer select-none list-none items-center gap-2 font-sans text-[13px] text-text-dim transition-colors hover:text-text [&::-webkit-details-marker]:hidden';

/** A hairline chevron: no glyph, so the summary's text is its label alone. */
function FoldMarker() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-1.5 -rotate-45 border-b border-r border-current transition-transform group-open/fold:rotate-45"
    />
  );
}

/**
 * One of the frame's two folds: collapsed in the served HTML, opened by
 * the native disclosure, so keyboard, pointer and no-script readers all
 * reach the same content.
 *
 * The body is a flat surface on the page ground. Its notes, lists and
 * tables are figure text, and Chromium lays out a closed disclosure's
 * content, so without the surface the article sheet would grade them as
 * running prose and unregistered rules. For the same reason a closed body
 * clips: the sliders of a closed "Adjust more" fold are laid out from the
 * summary's left edge and would otherwise reach past a narrow viewport.
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
        data-brand-surface-id="surface:flat"
        data-brand-surface-level="flat"
        className={cx(
          FIGURE_TEXT_CLASS.fold,
          'group-not-open/fold:overflow-hidden',
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
  const captionClass = cx(FIGURE_TEXT_CLASS.caption, captionProps?.className);
  const rootProps = {
    'data-figure-frame': figureId,
    className: cx('my-9 text-left', className),
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
    <figure
      ref={ref}
      data-brand-surface-id="surface:flat"
      data-brand-surface-level="flat"
      {...rootProps}
    >
      {body}
    </figure>
  ) : (
    <div
      ref={ref as Ref<HTMLDivElement>}
      data-brand-surface-id="surface:flat"
      data-brand-surface-level="flat"
      {...rootProps}
    >
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
 * The stage: the drawing on the page ground. It is the flat content plane
 * with no fill of its own, so the paper shows through; the drawing paints
 * in ink and greys with the one accent.
 */
export function FigureStage({
  as: Component = 'div',
  children,
  footer,
  timeline,
  className,
  ...props
}: FigureStageProps) {
  return (
    <Component
      data-brand-surface-id="surface:flat"
      data-brand-surface-level="flat"
      data-figure-stage=""
      className={cx('overflow-hidden text-text', className)}
      {...props}
    >
      {children}
      {footer ? (
        <div
          data-figure-stage-band="footer"
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-3"
        >
          {footer}
        </div>
      ) : null}
      {timeline ? (
        <div data-figure-stage-band="timeline" className="pt-2">
          {timeline}
        </div>
      ) : null}
    </Component>
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
 * The current-state readout on the stage, in the brand sans with tabular
 * figures; StageNumber marks the digits.
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
      className={cx('basis-full font-sans text-[12px] leading-normal text-text-dim', className)}
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
 * accent text that names what the reader should see, at the stage size and
 * the regular weight. One per figure, two at most, visible at settle.
 */
export function StageCallout({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { children: ReactNode }) {
  return (
    <p
      data-figure-annotation=""
      className={cx('font-sans text-[12px] leading-normal', className)}
      style={{ color: 'var(--role-highlight-text)' }}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * The outcome mark after a sub-panel label, "(a) Joint space ✓": a small
 * green check or red cross in text, never a fill or a series colour.
 */
export function OutcomeMark({ outcome }: { outcome: 'ok' | 'fail' }) {
  return (
    <span
      data-figure-outcome={outcome}
      aria-label={outcome === 'ok' ? 'succeeds' : 'fails'}
      role="img"
      style={{ color: outcome === 'ok' ? 'var(--ok)' : 'var(--fail)' }}
    >
      {outcome === 'ok' ? '\u2713' : '\u00d7'}
    </span>
  );
}

/** A sub-panel label under small multiples: "(a) RP-1 ✓" in 12 px. */
export function PanelLabel({
  letter,
  outcome,
  className,
  children,
}: {
  letter: string;
  outcome?: 'ok' | 'fail';
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-figure-panel-label="" className={cx('text-center font-sans text-[12px] leading-normal text-text', className)}>
      ({letter})&nbsp;&nbsp;{children}
      {outcome ? <OutcomeMark outcome={outcome} /> : null}
    </div>
  );
}
