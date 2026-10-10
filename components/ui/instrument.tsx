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
 * Figure controls (owner-approved figure standard, 10 October 2026) are
 * text: a small muted text action for Replay, Step and Reset, the one
 * action that starts a figure in ink, and text tabs for choices, muted at
 * rest and ink over a 1 px underline when chosen, separated by hairlines.
 * No fills, pills or boxes; stage.css paints the figure-action and
 * figure-tab classes and the 1 px keyboard focus outline.
 */
const INSTRUMENT_CONTROL_BASE = 'figure-action font-sans text-[13px]';
export const INSTRUMENT_PRIMARY_CONTROL_CLASS = `${INSTRUMENT_CONTROL_BASE} figure-action-primary`;
export const INSTRUMENT_SECONDARY_CONTROL_CLASS = `${INSTRUMENT_CONTROL_BASE} justify-self-start`;

/**
 * A toggle: a text tab. Pair it with `aria-pressed` (or `aria-checked` on a
 * radio) so the paint, which reads ink and underlined when pressed, and the
 * announced state never disagree.
 */
export const INSTRUMENT_TOGGLE_CLASS = 'figure-tab font-sans text-[13px]';

/** One option inside a segmented row: the same text tab. */
const SEGMENT_CLASS = 'figure-tab font-sans text-[13px]';

/**
 * A labelled slider among the figure controls: a 1 px ink track and a
 * 12 px ink thumb (stage.css), at a 32px target height.
 */
export const INSTRUMENT_SLIDER_CLASS = 'figure-range block h-8 w-full min-w-40 cursor-pointer';

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
        'rounded-none border p-4 text-left text-text [border-color:var(--line)] sm:p-6',
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
      className={cx('grid min-w-44 flex-1 gap-0.5 sm:max-w-80', className)}
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
          className="ml-auto font-mono text-[12px] tabular-nums text-text-dim"
        >
          {meta}
        </span>
      ) : null}
    </div>
  );
}

/**
 * One slider on one line: the label in muted 13 px, the 1 px ink track,
 * and the current value in the mono face at its right. The caller keeps
 * its own input (id, range, ARIA); `value` is a node so test ids and live
 * regions stay with the caller. The row wraps on a phone, the label first.
 */
export function SliderRow({
  htmlFor,
  label,
  value,
  className,
  children,
}: {
  htmlFor: string;
  label: ReactNode;
  value: ReactNode;
  className?: string;
  /** The range input. */
  children: ReactNode;
}) {
  return (
    <div
      data-figure-control-field=""
      data-figure-control-row=""
      className={cx('flex basis-full flex-wrap items-center gap-x-4 gap-y-0.5', className)}
    >
      <label htmlFor={htmlFor} className="basis-full font-sans text-[13px] leading-snug text-text-dim sm:basis-auto sm:max-w-48 sm:shrink-0">
        {label}
      </label>
      <div className="min-w-24 max-w-[340px] flex-1">{children}</div>
      <span data-figure-control-value="" className="shrink-0 whitespace-nowrap font-mono text-[13px] tabular-nums text-text">
        {value}
      </span>
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
        'flex items-baseline justify-between gap-3 font-sans text-[13px] text-text-dim',
        className,
      )}
      {...props}
    >
      {children}
      {value ? (
        <span data-figure-control-value="" className="whitespace-nowrap font-mono text-[13px] tabular-nums text-text">
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
      <span id={id} className="font-sans text-[13px] text-text-dim">{label}</span>
      <div
        data-brand-control-id="control:segmented"
        data-brand-surface-id="surface:flat"
        className="figure-tab-row inline-flex max-w-full flex-wrap"
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
    <div aria-hidden="true" data-slider-ends="" className="flex justify-between gap-3 font-sans text-[12px] text-text-dim">
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
      className={cx('font-sans text-[12px] leading-normal tabular-nums text-text', className)}
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
        'flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-[12px] leading-normal text-text-dim',
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
 * (12 CSS px labels, 11 px ticks, at every width), in the sans, against
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
