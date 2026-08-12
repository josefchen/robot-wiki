'use client';

import { useRef, useState } from 'react';
import { CiteRef } from '@/components/mdx/cite-ref';
import { Badge } from '@/components/ui';
import {
  MILESTONES,
  filterMilestones,
  type Milestone,
  type MilestoneFilter,
  type MilestoneStatus,
} from '@/lib/bear-case';
import { cx } from '@/lib/utils';

/**
 * MilestonesWatchlist: the status board for the bear-case module. Eight
 * falsifiable milestones that would settle whether the field is in a bubble
 * or on schedule, each with the question it answers, a current-status call
 * (not met / partial / met), the published evidence behind the call, and
 * the observation that would flip it. Selecting a row (pointer or keyboard)
 * swaps the detail panel; the filter group narrows the board by status.
 *
 * Interactive contract: deterministic render, keyboard-operable rows
 * (Tab + Enter, plus ArrowUp/ArrowDown/Home/End between rows), a visible
 * readout with the status tally, a reset control, and horizontal scroll
 * inside its own container at 375px. No animation at all, so the component
 * is reduced-motion safe by construction. The "met" filter renders an
 * explicit empty state: as of writing, no milestone has been met, and that
 * absence is part of the module's argument. Column headers and section
 * labels are mono and dim but deliberately NOT uppercase: the page's
 * uppercase micro-label budget (VAL-DESIGN-010) is left unspent here.
 */

const FILTERS: Array<{ value: MilestoneFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'not-met', label: 'Not met' },
  { value: 'partial', label: 'Partial' },
  { value: 'met', label: 'Met' },
];

const STATUS_LABEL: Record<MilestoneStatus, string> = {
  'not-met': 'not met',
  partial: 'partial',
  met: 'met',
};

const STATUS_VARIANT: Record<MilestoneStatus, 'default' | 'warn' | 'ok'> = {
  'not-met': 'default',
  partial: 'warn',
  met: 'ok',
};

const HEADER_CELL =
  'px-3 py-2.5 text-left font-mono text-[11px] font-medium tracking-[0.14em] text-text-dim';

const CELL = 'px-3 py-2.5 align-top';

const SECTION_LABEL =
  'font-mono text-[11px] font-medium tracking-[0.14em] text-text-dim';

export function MilestonesWatchlist({ className }: { className?: string }) {
  const [filter, setFilter] = useState<MilestoneFilter>('all');
  const [selectedId, setSelectedId] = useState<string>(MILESTONES[0].id);
  const rowButtons = useRef<Array<HTMLButtonElement | null>>([]);

  const visible = filterMilestones(MILESTONES, filter);
  // Selection is derived: if the filter hides the selected row, the detail
  // panel moves to the first visible milestone. No effect needed.
  const selected =
    visible.find((milestone) => milestone.id === selectedId) ??
    visible[0] ??
    null;

  function select(id: string, focus = false) {
    setSelectedId(id);
    if (focus) {
      const index = visible.findIndex((milestone) => milestone.id === id);
      rowButtons.current[index]?.focus();
    }
  }

  function handleRowKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let next = index;
    if (event.key === 'ArrowDown')
      next = Math.min(index + 1, visible.length - 1);
    else if (event.key === 'ArrowUp') next = Math.max(index - 1, 0);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = visible.length - 1;
    else return;
    event.preventDefault();
    select(visible[next].id, true);
  }

  function reset() {
    setFilter('all');
    setSelectedId(MILESTONES[0].id);
  }

  const tally = (status: MilestoneStatus) =>
    MILESTONES.filter((milestone) => milestone.status === status).length;

  const readout =
    filter === 'all'
      ? `${MILESTONES.length} milestones: ${tally('not-met')} not met, ${tally('partial')} partial, ${tally('met')} met`
      : `showing ${visible.length} of ${MILESTONES.length} milestones (${STATUS_LABEL[filter]})`;

  return (
    <div
      data-testid="milestones-watchlist"
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div
          role="group"
          aria-label="Filter by status"
          className="flex flex-wrap items-center gap-1.5"
        >
          <span className="font-sans text-xs text-text-dim">Status</span>
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={cx(
                'rounded-sm px-2.5 py-1 font-mono text-xs transition-colors active:translate-y-[1px]',
                filter === option.value
                  ? 'bg-surface-2 text-accent'
                  : 'text-text-dim hover:text-text',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p
          data-testid="watchlist-readout"
          aria-live="polite"
          className="ml-auto font-mono text-xs text-text-dim"
        >
          {readout}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-sm bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
      </div>

      {visible.length === 0 ? (
        <p
          data-testid="watchlist-empty"
          className="mt-4 border-t border-border pt-4 font-sans text-xs leading-relaxed text-text-dim"
        >
          None of the eight milestones has reached this status yet. That
          absence is the bear case in one line: the evidence that would
          settle the question does not exist.
        </p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left">
              <caption className="sr-only">
                Eight milestones that would settle the bear case. Select a row
                to read the evidence behind its status and the observation
                that would flip it.
              </caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className={HEADER_CELL}>
                    Milestone
                  </th>
                  <th scope="col" className={HEADER_CELL}>
                    Why it matters
                  </th>
                  <th scope="col" className={HEADER_CELL}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((milestone, index) => {
                  const isSelected = milestone.id === selected?.id;
                  return (
                    <tr
                      key={milestone.id}
                      data-testid={`milestone-row-${milestone.id}`}
                      data-selected={isSelected || undefined}
                      className={cx(
                        'border-b border-border transition-colors last:border-b-0',
                        isSelected && 'bg-surface-2/60',
                      )}
                    >
                      <th scope="row" className={cx(CELL, 'min-w-[170px]')}>
                        <button
                          ref={(el) => {
                            rowButtons.current[index] = el;
                          }}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => select(milestone.id)}
                          onKeyDown={(event) => handleRowKeyDown(event, index)}
                          className={cx(
                            'text-left font-mono text-xs font-medium transition-colors',
                            isSelected
                              ? 'text-accent'
                              : 'text-text hover:text-accent',
                          )}
                        >
                          {milestone.name}
                        </button>
                      </th>
                      <td
                        className={cx(
                          CELL,
                          'max-w-[40ch] font-sans text-[11px] leading-snug text-text-dim',
                        )}
                      >
                        {milestone.whyItMatters}
                      </td>
                      <td className={cx(CELL, 'whitespace-nowrap')}>
                        <Badge variant={STATUS_VARIANT[milestone.status]}>
                          {STATUS_LABEL[milestone.status]}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selected && (
            <div
              data-testid="milestone-detail"
              role="region"
              aria-label={`${selected.name} detail`}
              className="mt-4 border-t border-border pt-4"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="font-sans text-sm font-medium text-text">
                  {selected.name}
                </p>
                <Badge variant={STATUS_VARIANT[selected.status]}>
                  {STATUS_LABEL[selected.status]}
                </Badge>
              </div>

              <div className="mt-4">
                <p className={SECTION_LABEL}>Why it matters</p>
                <p className="mt-1.5 max-w-[65ch] font-sans text-xs leading-relaxed text-text">
                  {selected.whyItMatters}
                </p>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className={SECTION_LABEL}>Current status</p>
                  <p className="mt-1.5 font-sans text-xs leading-relaxed text-text-dim">
                    {selected.statusDetail}{' '}
                    {selected.citationIds.map((id) => (
                      <CiteRef key={id} id={id} />
                    ))}
                  </p>
                </div>
                <div>
                  <p className={SECTION_LABEL}>How we&rsquo;d know</p>
                  <p className="mt-1.5 font-sans text-xs leading-relaxed text-text-dim">
                    {selected.howWeKnow}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export type { Milestone };
