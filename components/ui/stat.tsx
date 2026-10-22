import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

type StatProps = {
  label: string;
  value: string;
  /** Small supporting line under the label. */
  note?: string;
  /**
   * Marks the strip's key value, set in ink at weight 600: highlight is ink
   * weight, and the muted blue stays with a figure's one highlighted series.
   */
  accent?: boolean;
  className?: string;
};

/**
 * A label can name a symbol the article sets in math, written in the prop as
 * `T_a`: one capital, an underscore and a short subscript. Props carry no
 * math, so the label sets the symbol as the prose does, an italic capital
 * with its subscript, instead of showing the underscore. Any other
 * underscore stays as written (`pi_RL`).
 */
const SYMBOL = /\b([A-Z])_([a-z0-9]{1,3})\b/g;

function labelText(label: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of label.matchAll(SYMBOL)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(label.slice(last, index));
    parts.push(
      <span key={index} className="whitespace-nowrap">
        <i>{match[1]}</i>
        <sub>{match[2]}</sub>
      </span>,
    );
    last = index + match[0].length;
  }
  if (parts.length === 0) return label;
  if (last < label.length) parts.push(label.slice(last));
  return parts;
}

/**
 * The longest word a strip column sets at its narrowest. A stat strip is
 * authored two columns wide on a phone and four from `sm`, so its column is
 * about 128px at 320px and 132px at 640px, and the 24px mono value sets
 * about 14px a character: nine characters fit, ten do not. A value with a
 * longer word marks its stat, and globals.css reflows that strip at those
 * widths instead of letting the word run past its column.
 */
const STRIP_COLUMN_CHARACTERS = 9;

export function Stat({ label, value, note, accent, className }: StatProps) {
  const longWord = value.split(/\s+/).some((word) => word.length > STRIP_COLUMN_CHARACTERS);
  return (
    <div data-stat-long-word={longWord ? '' : undefined} className={cx('min-w-0', className)}>
      <div
        className={cx(
          'font-mono text-2xl leading-tight tabular-nums',
          accent ? 'font-semibold text-text' : 'text-text',
        )}
      >
        {value}
      </div>
      <div className="mt-1 font-sans text-xs text-text-dim">
        {labelText(label)}
      </div>
      {/* The note is the dim token at full strength, not a fainter step off
          it. An 80% wash of dim measured 4.0:1 at 11px, and the third tier
          of hierarchy here is already carried by the size drop. */}
      {note ? (
        <div className="mt-0.5 font-sans text-[11px] text-text-dim">
          {note}
        </div>
      ) : null}
    </div>
  );
}
