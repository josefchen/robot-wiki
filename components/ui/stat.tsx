import { cx } from '@/lib/utils';

type StatProps = {
  label: string;
  value: string;
  /** Small supporting line under the label. */
  note?: string;
  /** Renders the value in the amber accent; reserve for genuinely key data. */
  accent?: boolean;
  className?: string;
};

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
      <div className="mt-1 font-sans text-xs text-text-dim">{label}</div>
      {note ? (
        <div className="mt-0.5 font-sans text-[11px] text-text-dim/80">
          {note}
        </div>
      ) : null}
    </div>
  );
}
