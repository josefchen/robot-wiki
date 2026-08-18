'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Table, type Column } from '@/components/ui';
import { TELEOP_RIGS } from '@/data/teleop-rigs';
import type { TeleopRig } from '@/data/schemas/teleop-rig';
import {
  RIG_FIELDS,
  rigDetail,
  rigSortValue,
  type TeleopRigField,
} from '@/lib/teleop-rigs';
import { cx } from '@/lib/utils';

/**
 * TeleopRigMatrix: the four reference teleop-rig families (ALOHA-class
 * workstations, GELLO, UMI, VR teleoperation) compared across cost, data
 * quality, throughput, and embodiment gap.
 *
 * Honesty rules: figures no source publishes render as "not disclosed"
 * (dim) and never as invented numbers (the VR family carries no published
 * system cost), null cells always sort last in both directions, and every
 * row links out to its primary sources.
 *
 * Interactive contract: deterministic render, keyboard-operable dimension
 * highlight buttons (aria-pressed) and sort headers (aria-sort), a visible
 * rig-count readout, a per-dimension detail panel, a reset control, and
 * horizontal scroll inside its own container at 375px.
 */

const NOT_DISCLOSED: ReactNode = (
  <span className="text-text-dim">not disclosed</span>
);

/** Fills the td padding so the highlight tint covers the whole cell. */
function cellWrap(
  highlighted: boolean,
  children: ReactNode,
  extra?: string,
): ReactNode {
  return (
    <div
      data-highlighted={highlighted || undefined}
      className={cx(
        'min-w-0',
        highlighted &&
          '-mx-3 -my-2 border-l-2 border-accent bg-surface-2 px-3 py-2',
        extra,
      )}
    >
      {children}
    </div>
  );
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

type TeleopRigMatrixProps = {
  className?: string;
};

export function TeleopRigMatrix({ className }: TeleopRigMatrixProps) {
  const [highlight, setHighlight] = useState<TeleopRigField | null>(null);
  // Remounting the table restores its initial cost sort on reset.
  const [resetCount, setResetCount] = useState(0);

  const activeField = useMemo(
    () => RIG_FIELDS.find((field) => field.id === highlight) ?? null,
    [highlight],
  );

  const columns = useMemo<Array<Column<TeleopRig>>>(() => {
    const nameColumn: Column<TeleopRig> = {
      key: 'name',
      header: 'Rig',
      sortable: true,
      render: (rig) =>
        cellWrap(false, (
          <span>
            <span className="text-text">{rig.name}</span>
            <span className="block text-xs text-text-dim">{rig.family}</span>
            <span className="block text-xs text-text-dim">
              {rig.representatives.join(', ')}
            </span>
          </span>
        )),
    };

    const costColumn: Column<TeleopRig> = {
      key: 'costUsd',
      header: 'Cost',
      sortable: true,
      numeric: true,
      sortValue: (rig) => rigSortValue(rig, 'cost'),
      render: (rig) =>
        cellWrap(
          highlight === 'cost',
          rig.costUsd === null ? (
            NOT_DISCLOSED
          ) : (
            <span className="font-mono tabular-nums">
              {formatUsd(rig.costUsd)}
              {rig.costNote ? (
                <span className="block font-sans text-xs text-text-dim">
                  {rig.costNote}
                </span>
              ) : null}
            </span>
          ),
        ),
    };

    function ratingColumn(
      field: Exclude<TeleopRigField, 'cost'>,
      header: string,
    ): Column<TeleopRig> {
      return {
        key: field,
        header,
        sortable: true,
        sortValue: (rig) => rigSortValue(rig, field),
        render: (rig) => {
          const rating = rig[field];
          const note =
            field === 'dataQuality'
              ? rig.dataQualityNote
              : field === 'throughput'
                ? rig.throughputNote
                : rig.embodimentGapNote;
          return cellWrap(
            highlight === field,
            <span>
              <span className="inline-flex items-center rounded-xs border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] leading-none tracking-wide text-text">
                {rating}
              </span>
              <span className="mt-1 block font-sans text-xs text-text-dim">
                {note}
              </span>
            </span>,
          );
        },
      };
    }

    const sourcesColumn: Column<TeleopRig> = {
      key: 'links',
      header: 'Sources',
      render: (rig) => (
        <span className="flex flex-col gap-0.5">
          {rig.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener"
              className="font-mono text-xs text-accent underline-offset-2 hover:underline"
            >
              {link.label}
            </a>
          ))}
        </span>
      ),
    };

    return [
      nameColumn,
      costColumn,
      ratingColumn('dataQuality', 'Data quality'),
      ratingColumn('throughput', 'Throughput'),
      ratingColumn('embodimentGap', 'Embodiment gap'),
      sourcesColumn,
    ];
  }, [highlight]);

  function toggleHighlight(field: TeleopRigField) {
    setHighlight((current) => (current === field ? null : field));
  }

  function reset() {
    setHighlight(null);
    setResetCount((count) => count + 1);
  }

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <div
          role="group"
          aria-label="Highlight a comparison dimension"
          className="flex flex-col gap-1"
        >
          <span className="font-sans text-xs text-text-dim">
            Highlight a dimension
          </span>
          <div className="flex flex-wrap gap-1.5">
            {RIG_FIELDS.map((field) => (
              <button
                key={field.id}
                type="button"
                aria-pressed={highlight === field.id}
                onClick={() => toggleHighlight(field.id)}
                className={cx(
                  'cursor-pointer rounded-sm border px-2.5 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
                  highlight === field.id
                    ? 'border-accent text-text'
                    : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
                )}
              >
                {field.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <p aria-live="polite" className="font-mono text-xs text-text-dim">
            {TELEOP_RIGS.length} of {TELEOP_RIGS.length} rigs
          </p>
          <button
            data-pagefind-ignore
            type="button"
            onClick={reset}
            className="cursor-pointer rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
          >
            Reset
          </button>
        </div>
      </div>

      {activeField ? (
        <section
          role="region"
          aria-label="Dimension detail"
          className="mt-4 rounded-sm border border-border bg-surface-2 p-4"
        >
          <p className="font-mono text-xs text-accent">
            {activeField.label} highlighted
          </p>
          <p className="mt-1 font-sans text-xs text-text-dim">
            {activeField.legend}
          </p>
          <ul className="mt-3 grid gap-3 lg:grid-cols-2">
            {TELEOP_RIGS.map((rig) => (
              <li key={rig.id}>
                <span className="font-mono text-xs text-text">{rig.name}</span>
                <p className="mt-1 font-sans text-xs leading-relaxed text-text-dim">
                  {rigDetail(rig, activeField.id)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Table
        key={resetCount}
        className="mt-4"
        caption={`${TELEOP_RIGS.length} teleoperation rig families compared across cost, data quality, throughput, and embodiment gap. Ratings are low, medium, or high as explained in each cell note. Unpublished figures are marked not disclosed and always sort last, in both directions.`}
        columns={columns}
        rows={TELEOP_RIGS}
        initialSort={{ key: 'costUsd', direction: 'asc' }}
      />
    </div>
  );
}
