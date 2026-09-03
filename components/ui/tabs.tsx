'use client';

import type { KeyboardEvent } from 'react';
import { cx } from '@/lib/utils';

type TabItem = {
  value: string;
  label: string;
  disabled?: boolean;
};

type TabsProps = {
  ariaLabel: string;
  value: string;
  items: TabItem[];
  onValueChange: (value: string) => void;
  className?: string;
};

export function Tabs({
  ariaLabel,
  value,
  items,
  onValueChange,
  className,
}: TabsProps) {
  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]:not(:disabled)',
      ),
    ];
    if (tabs.length === 0) return;
    event.preventDefault();
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : event.key === 'ArrowRight'
            ? (Math.max(current, 0) + 1) % tabs.length
            : (Math.max(current, 0) - 1 + tabs.length) % tabs.length;
    tabs[next]?.focus();
  }

  // The roving tab stop must land on a focusable tab. A controlled value
  // naming a disabled item would otherwise give that unfocusable tab
  // tabIndex 0 and every enabled tab -1, leaving the tablist with no
  // Tab-key entry point at all.
  const enabled = items.filter((item) => !item.disabled);
  const tabStopValue = (
    enabled.find((item) => item.value === value) ?? enabled[0]
  )?.value;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      data-brand-control-id="control:segmented"
      data-brand-surface-id="surface:flat"
      onKeyDown={moveFocus}
      className={cx(
        'inline-flex overflow-hidden rounded-xs border border-border-strong bg-surface',
        className,
      )}
    >
      {items.map((item, index) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={item.disabled}
            tabIndex={item.value === tabStopValue ? 0 : -1}
            onClick={() => onValueChange(item.value)}
            data-brand-control-id={
              item.disabled ? 'control:disabled' : 'control:selection'
            }
            className={cx(
              'min-h-8 border-l border-border px-3 py-1.5 font-sans text-sm first:border-l-0',
              selected
                ? 'bg-selection font-semibold text-ink'
                : 'bg-surface text-text hover:bg-surface-2',
              item.disabled && 'cursor-not-allowed text-text-dim',
              index === 0 && 'border-l-0',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
