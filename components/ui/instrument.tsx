import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  Ref,
  SVGAttributes,
} from 'react';
import { useId } from 'react';
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
 * controls look like the rest of the site's quiet controls, its state is
 * announced as text, and its reset is a compact secondary action. The primitives keep
 * the control elements themselves caller-owned, so a component that mounts
 * them keeps its own inputs, buttons, and ARIA exactly as authored.
 */

const INSTRUMENT_SIGNATURE = 'instrument-frame';

/*
 * Figure controls are the site's quiet controls: a hairline button on the
 * white surface, sans labels with no underline, and no colour fill. The
 * selected option of a choice reads in weight and a tinted tile, which
 * survives forced colours as the bolder label; lime stays a data mark and
 * never fills a control.
 */
const INSTRUMENT_CONTROL_BASE =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xs border py-1.5 font-sans text-sm font-medium transition-colors active:translate-y-[1px]';
const QUIET_DISABLED =
  'disabled:cursor-not-allowed disabled:text-text-dim disabled:active:translate-y-0';
export const INSTRUMENT_PRIMARY_CONTROL_CLASS = `${INSTRUMENT_CONTROL_BASE} border-transparent bg-action px-3 text-on-action hover:bg-graphite`;
export const INSTRUMENT_SECONDARY_CONTROL_CLASS = `${INSTRUMENT_CONTROL_BASE} justify-self-start border-border-strong bg-surface px-3 text-text hover:bg-surface-2 ${QUIET_DISABLED}`;

/**
 * A toggle. At rest it is the quiet secondary button with a dim label; when
 * pressed the label turns ink and semibold on a tinted tile with an ink
 * hairline, so the state shows in weight and line as well as colour. Pair
 * it with `aria-pressed` (or `aria-checked` on a radio) so the paint and
 * the announced state never disagree.
 */
export const INSTRUMENT_TOGGLE_CLASS = `${INSTRUMENT_CONTROL_BASE} border-border-strong bg-surface px-3 text-text-dim hover:text-text aria-pressed:border-text aria-pressed:bg-surface-2 aria-pressed:font-semibold aria-pressed:text-ink aria-checked:border-text aria-checked:bg-surface-2 aria-checked:font-semibold aria-checked:text-ink ${QUIET_DISABLED}`;

/**
 * One option inside a segmented row: the row draws the single outer
 * hairline, so an option has no box of its own until it is selected.
 */
const SEGMENT_CLASS = `${INSTRUMENT_CONTROL_BASE} -my-px border-transparent px-3 text-text-dim hover:text-text aria-pressed:border-border-strong aria-pressed:bg-surface-2 aria-pressed:font-semibold aria-pressed:text-ink ${QUIET_DISABLED}`;

/**
 * A labelled slider among the figure controls: a thin native track in the
 * page's graphite, at a 44px touch-target height.
 */
export const INSTRUMENT_SLIDER_CLASS = 'block h-11 w-full min-w-40 cursor-pointer accent-graphite';

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
 * slider or select, sized so a slider keeps a usable track at 375px and two
 * fields stack there rather than squeeze their labels and values side by side.
 */
export function ControlField({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      data-figure-control-field=""
      className={cx('grid min-w-44 flex-1 gap-1 sm:max-w-72', className)}
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
        <span className="font-sans text-sm text-text-dim">
          {label}
        </span>
      ) : null}
      {children}
      {meta ? (
        <span
          data-instrument-meta
          className="ml-auto font-sans text-sm tabular-nums text-text-dim"
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
        'flex items-baseline justify-between gap-2 font-sans text-sm text-text-dim',
        className,
      )}
      {...props}
    >
      {children}
      {value ? (
        <span className="whitespace-nowrap font-sans text-sm tabular-nums text-text">
          {value}
        </span>
      ) : null}
    </label>
  );
}

export type Preset<T extends string> = { id: T; label: string };

type PresetGroupProps<T extends string> = {
  /** The visible group label, in plain words: what the presets change. */
  label: string;
  presets: readonly Preset<T>[];
  value: T | null;
  onChange: (id: T) => void;
  /** Prefix for each preset button's test id, `<prefix>-<preset id>`. */
  testId?: string;
};

/**
 * A named set of states the reader picks from, drawn as one quiet
 * segmented row like the site's own tab rows. The group counts as one
 * visible control. `value` is null when a control in "Adjust more" has
 * moved the figure off every preset.
 */
export function PresetGroup<T extends string>({ label, presets, value, onChange, testId }: PresetGroupProps<T>) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} data-preset-group="" className="grid justify-items-start gap-1">
      <span id={id} className="font-sans text-sm text-text-dim">{label}</span>
      <div
        data-brand-control-id="control:segmented"
        data-brand-surface-id="surface:flat"
        className="inline-flex max-w-full flex-wrap rounded-xs border border-border-strong bg-surface"
      >
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            data-brand-control-id="control:selection"
            aria-pressed={value === preset.id}
            onClick={() => onChange(preset.id)}
            data-testid={testId ? `${testId}-${preset.id}` : undefined}
            className={SEGMENT_CLASS}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The two ends of a slider in words, under its track. */
export function SliderEnds({ low, high }: { low: ReactNode; high: ReactNode }) {
  return (
    <div aria-hidden="true" data-slider-ends="" className="flex justify-between gap-3 font-sans text-sm text-text-dim">
      <span>{low}</span>
      <span>{high}</span>
    </div>
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
      className={cx('font-sans text-sm leading-snug tabular-nums text-text', className)}
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
        'flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-sm leading-snug text-text-dim',
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
 * (every role at 14 CSS px at every width), in the brand sans, against
 * the viewBox width passed through
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
