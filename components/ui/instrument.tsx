import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  Ref,
  SVGAttributes,
} from 'react';
import { CHART_TYPE } from '@/components/motion/chart/chart-tokens';
import { FigureFrame, type FigureFrameProps } from '@/components/motion/figure-frame';
import { cx } from '@/lib/utils';

/**
 * The shared instrument family for interactive figures: the frame, header
 * band, control label, live readout, legend, reset action, and plot stage
 * every explanatory instrument is composed from.
 *
 * An instrument is an explanatory device, not a card: the frame is a
 * squared technical surface (radius 0 with a hairline boundary), its
 * controls carry the mono registration style, its state is announced as
 * text, and its reset is a compact secondary action. The primitives keep
 * the control elements themselves caller-owned, so a component that mounts
 * them keeps its own inputs, buttons, and ARIA exactly as authored.
 */

const INSTRUMENT_SIGNATURE = 'instrument-frame';

/*
 * Instrument controls sit inside the frame's own hairline, so neither
 * treatment draws a four-sided box: a control framed inside the frame is
 * the redundant nested boxing the design contract counts as a defect. The
 * border stays in the box model but transparent, which keeps both
 * treatments the same height and still paints a boundary under forced
 * colours. The secondary control's ink hairline is its underline, which
 * hover strengthens; a disabled control drops it.
 */
const INSTRUMENT_CONTROL_BASE =
  'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xs border border-transparent py-1.5 font-sans text-sm font-medium transition-colors active:translate-y-[1px]';
export const INSTRUMENT_PRIMARY_CONTROL_CLASS = `${INSTRUMENT_CONTROL_BASE} bg-action px-3 text-on-action hover:bg-graphite`;
export const INSTRUMENT_SECONDARY_CONTROL_CLASS = `${INSTRUMENT_CONTROL_BASE} justify-self-start bg-transparent px-2 text-text underline decoration-border-strong decoration-1 underline-offset-4 hover:decoration-text disabled:cursor-not-allowed disabled:text-text-dim disabled:no-underline disabled:active:translate-y-0`;

/**
 * A toggle or one option of a segmented choice. It reads as the secondary
 * control at rest; the selected option takes the lime selection fill with
 * ink text and drops its underline, so the state shows in fill and line as
 * well as colour. Pair it with `aria-pressed` (or `aria-checked` on a
 * radio) so the selected paint and the announced state never disagree.
 */
export const INSTRUMENT_TOGGLE_CLASS = `${INSTRUMENT_CONTROL_BASE} bg-transparent px-2.5 text-text underline decoration-border-strong decoration-1 underline-offset-4 hover:decoration-text aria-pressed:bg-highlight aria-pressed:text-ink aria-pressed:no-underline aria-checked:bg-highlight aria-checked:text-ink aria-checked:no-underline disabled:cursor-not-allowed disabled:text-text-dim disabled:no-underline disabled:active:translate-y-0`;

/**
 * A labelled slider among the figure controls: the shared scrubber track in
 * the selection lime, at a 24px target height.
 */
export const INSTRUMENT_SLIDER_CLASS = 'block h-6 w-full min-w-40 cursor-pointer accent-highlight';

type InstrumentFrameProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/**
 * The instrument boundary. A technical frame is squared (radius 0) with a
 * one-pixel hairline, on the spacing ladder inside (16px, 24px from `sm`).
 * The bounded dark instrument surface keeps its single writer in
 * `components/ui/surface.tsx`; this frame is the flat explanatory surface.
 */
export function InstrumentFrame({
  className,
  children,
  ...props
}: InstrumentFrameProps) {
  return (
    <div
      data-brand-surface-id="surface:flat"
      data-brand-module-signature={INSTRUMENT_SIGNATURE}
      data-brand-frame-depth="1"
      className={cx(
        'rounded-none border border-border bg-surface p-4 text-left text-text sm:p-6',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * An instrument in the shared figure frame: FigureFrame carrying the
 * instrument module signature, so the route and state sweeps that select
 * instruments by it keep finding the same mounts. Header, graphite stage,
 * one caption and at most one source line; see FigureFrame.
 */
export function InstrumentFigure(props: FigureFrameProps) {
  return (
    <FigureFrame
      data-brand-module-signature={INSTRUMENT_SIGNATURE}
      {...props}
    />
  );
}

/**
 * One labelled control among the figure controls: a ControlLabel over its
 * slider or select, sized so a slider keeps a usable track at 375px.
 */
export function ControlField({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      data-figure-control-field=""
      className={cx('grid min-w-40 flex-1 gap-1 sm:max-w-72', className)}
      {...props}
    >
      {children}
    </div>
  );
}

type InstrumentHeaderProps = HTMLAttributes<HTMLDivElement> & {
  /** Optional registration label naming what the instrument measures. */
  label?: string;
  /** Trailing instrument metadata (source, scope, current mode). */
  meta?: ReactNode;
  children?: ReactNode;
};

/**
 * The control band across the top of an instrument: buttons and selects on
 * the left, a registration label when the band needs one, and trailing
 * metadata pushed to the right edge. Callers pass `role="group"` and an
 * `aria-label` when the band groups labelled controls.
 */
export function InstrumentHeader({
  label,
  meta,
  className,
  children,
  ...props
}: InstrumentHeaderProps) {
  return (
    <div
      className={cx(
        'flex flex-wrap items-center gap-x-3 gap-y-2',
        className,
      )}
      {...props}
    >
      {label ? (
        <span className="font-sans text-[13px] text-text-dim">
          {label}
        </span>
      ) : null}
      {children}
      {meta ? (
        <span
          data-instrument-meta
          className="ml-auto font-sans text-[13px] tabular-nums text-text-dim"
        >
          {meta}
        </span>
      ) : null}
    </div>
  );
}

type ControlLabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  /** Inline value readout shown at the label's right edge. */
  value?: ReactNode;
  children: ReactNode;
};

/**
 * A persistent control label in the registration style, with room for the
 * control's current value inline. The value is a node so callers keep
 * their own test ids and live regions on it.
 */
export function ControlLabel({
  value,
  className,
  children,
  ...props
}: ControlLabelProps) {
  return (
    <label
      className={cx(
        'flex items-baseline justify-between gap-2 font-sans text-[13px] text-text-dim',
        className,
      )}
      {...props}
    >
      {children}
      {value ? (
        <span className="whitespace-nowrap font-sans text-[13px] tabular-nums text-text">
          {value}
        </span>
      ) : null}
    </label>
  );
}

type InstrumentReadoutProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
};

/**
 * The current-state readout: the numeric or textual statement of what the
 * instrument shows right now, announced politely so the value reaches
 * assistive technology when a control moves it.
 */
export function InstrumentReadout({
  className,
  children,
  ...props
}: InstrumentReadoutProps) {
  return (
    <p
      aria-live="polite"
      data-figure-readout=""
      className={cx('font-sans text-[13px] leading-snug tabular-nums text-text', className)}
      {...props}
    >
      {children}
    </p>
  );
}

type InstrumentLegendProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/**
 * The legend band. Entries name the series or state they mark; the swatch
 * repeats the exact rendered mark so the mapping survives desaturation and
 * forced colours. The band carries `data-instrument-legend` so the
 * data/legend gates can find every legend without a class-name selector.
 */
export function InstrumentLegend({
  className,
  children,
  ...props
}: InstrumentLegendProps) {
  return (
    <div
      data-instrument-legend
      data-figure-legend=""
      className={cx(
        'flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-[13px] leading-snug text-text-dim',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type LegendItemProps = {
  /** The swatch node repeating the rendered mark for this entry. */
  swatch: ReactNode;
  /**
   * Stable series id when this entry names a plotted series; the mark
   * group in the plot carries the same id on `data-series` so the
   * legend-to-mark mapping is checkable (VAL-B2-VIZ-004).
   */
  series?: string;
  children: ReactNode;
};

/** One legend entry: the swatch followed by the series or state name. */
export function LegendItem({ swatch, series, children }: LegendItemProps) {
  return (
    <span
      data-legend-item
      {...(series ? { 'data-legend-series': series } : {})}
      className="flex items-center gap-2"
    >
      {swatch}
      {children}
    </span>
  );
}

type InstrumentResetProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  onClick: () => void;
  /** Visible label of the reset action. */
  label?: string;
};

/**
 * The instrument reset: a compact secondary action that restores the
 * deterministic default. It stays out of the search index; the instrument
 * itself is the content. A reset whose accessible name is more specific
 * than the visible label passes `aria-label` (or any other button
 * attribute) through in its native spelling, so the source keeps the
 * accessible name the sealed baseline records.
 */
export function InstrumentReset({
  onClick,
  label = 'Reset',
  className,
  ...rest
}: InstrumentResetProps) {
  return (
    <button
      data-brand-control-id="control:secondary-action"
      data-pagefind-ignore
      type="button"
      onClick={onClick}
      className={cx(
        INSTRUMENT_SECONDARY_CONTROL_CLASS,
        className,
      )}
      {...rest}
    >
      {label}
    </button>
  );
}

type PlotStageProps = SVGAttributes<SVGSVGElement> & {
  viewBox: string;
  /** Ref onto the underlying svg, for stages the caller manipulates. */
  ref?: Ref<SVGSVGElement>;
  children: ReactNode;
};

/**
 * The plot stage: the SVG surface a chart or diagram draws on, on the
 * graphite figure stage. It carries the accessible image role; the caller's
 * `aria-label` and `aria-describedby` pass through in their native
 * spelling, so the source keeps the accessible-name expression the sealed
 * baseline records. The geometry inside stays caller-authored next to the
 * data it plots.
 *
 * It is a stage svg: stage.css paints its text on the shared type scale
 * (label 14, axis and note 13, tick 12 CSS px at every width), in the
 * brand sans, against the viewBox width passed through
 * `--motion-stage-view-width`. Mark text with `data-scene-tick`,
 * `data-scene-axis`, `data-scene-note` or `data-scene-readout` to take a
 * role other than the label.
 */
export function PlotStage({
  viewBox,
  className,
  style,
  children,
  ...props
}: PlotStageProps) {
  const width = Number(viewBox.trim().split(/[\s,]+/)[2]);
  return (
    <svg
      viewBox={viewBox}
      role="img"
      data-chart=""
      className={cx('motion-stage-svg block h-auto w-full', className)}
      fontFamily={CHART_TYPE.font}
      style={{ '--motion-stage-view-width': `${width}px`, ...style } as CSSProperties}
      {...props}
    >
      {children}
    </svg>
  );
}
