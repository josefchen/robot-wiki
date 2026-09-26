import type {
  HTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  Ref,
  SVGAttributes,
} from 'react';
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
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
          {label}
        </span>
      ) : null}
      {children}
      {meta ? (
        <span
          data-instrument-meta
          className="ml-auto font-mono text-[10px] text-text-dim"
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
        'flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim',
        className,
      )}
      {...props}
    >
      {children}
      {value ? (
        <span className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text">
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
      className={cx('mt-3 font-mono text-sm text-text', className)}
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
 * forced colours.
 */
export function InstrumentLegend({
  className,
  children,
  ...props
}: InstrumentLegendProps) {
  return (
    <div
      className={cx(
        'flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] text-text-dim',
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
  children: ReactNode;
};

/** One legend entry: the swatch followed by the series or state name. */
export function LegendItem({ swatch, children }: LegendItemProps) {
  return (
    <span className="flex items-center gap-2">
      {swatch}
      {children}
    </span>
  );
}

type InstrumentResetProps = {
  onClick: () => void;
  /** Accessible name of the reset action. */
  label?: string;
  className?: string;
};

/**
 * The instrument reset: a compact secondary action that restores the
 * deterministic default. It stays out of the search index; the instrument
 * itself is the content.
 */
export function InstrumentReset({
  onClick,
  label = 'Reset',
  className,
}: InstrumentResetProps) {
  return (
    <button
      data-brand-control-id="control:secondary-action"
      data-pagefind-ignore
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-xs border border-border bg-surface-2 px-3 py-2 font-sans text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]',
        className,
      )}
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
 * The plot stage: the SVG surface a chart or diagram draws on. It carries
 * the accessible image role; the caller's `aria-label` and
 * `aria-describedby` pass through in their native spelling, so the source
 * keeps the accessible-name expression the sealed baseline records.
 * The geometry inside stays caller-authored next to the data it plots.
 */
export function PlotStage({
  viewBox,
  className,
  children,
  ...props
}: PlotStageProps) {
  return (
    <svg
      viewBox={viewBox}
      role="img"
      className={cx('block w-full', className)}
      {...props}
    >
      {children}
    </svg>
  );
}
