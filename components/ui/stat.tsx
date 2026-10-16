import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

type StatProps = {
  label: string;
  value: string;
  /** Small supporting line under the label. */
  note?: string;
  /** Renders the value in the accent; reserve for genuinely key data. */
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

export function Stat({ label, value, note, accent, className }: StatProps) {
  return (
    <div className={cx('min-w-0', className)}>
      <div
        className={cx(
          'font-mono text-2xl leading-tight tabular-nums',
          accent ? 'text-accent' : 'text-text',
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
