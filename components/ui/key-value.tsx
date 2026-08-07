import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

type KeyValueItem = {
  key: string;
  value: ReactNode;
};

type KeyValueProps = {
  items: KeyValueItem[];
  className?: string;
};

/**
 * Dense spec sheet. Keys are mono dim labels, values are plain text. Rows are
 * separated by spacing, not hairlines (see library/design-system.md).
 */
export function KeyValue({ items, className }: KeyValueProps) {
  return (
    <dl
      className={cx(
        'grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-[12rem_1fr]',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.key} className="contents">
          <dt className="font-mono text-xs leading-6 text-text-dim">
            {item.key}
          </dt>
          <dd className="text-sm leading-6 text-text">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
