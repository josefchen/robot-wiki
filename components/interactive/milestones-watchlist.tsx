'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { CiteRef } from '@/components/article/citation-records';
import { TableScroll } from '@/components/ui';
import {
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PresetGroup,
} from '@/components/ui/instrument';
import { FigureStage, StageCallout } from '@/components/motion/figure-frame';
import {
  MILESTONES,
  filterMilestones,
  type Milestone,
  type MilestoneFilter,
  type MilestoneStatus,
} from '@/lib/bear-case';
import { cx } from '@/lib/utils';

/**
 * MilestonesWatchlist: the scoreboard for the bear-case module. Eight
 * results that would prove the skeptics wrong, drawn as tiles with a
 * small icon and a gauge that is empty (not yet), half full (partly
 * there) or full (done). The big number states the score. Tapping a tile
 * opens the published evidence behind its status call and the observation
 * that would flip it; the filter narrows the board by status.
 *
 * Interactive contract: deterministic render, keyboard-operable tiles
 * (Tab + Enter, plus arrow keys and Home/End between tiles), a readout of
 * what the board shows, a reset in "Adjust more". No animation, so the
 * component is reduced-motion safe. The "Done" filter renders an explicit
 * empty state: as of writing no milestone has been met, and that absence
 * is part of the module's argument.
 */

const STATUS_PLAIN: Record<MilestoneStatus, string> = {
  'not-met': 'Not yet',
  partial: 'Partly there',
  met: 'Done',
};

const STATUS_FILTER_LABEL: Record<MilestoneStatus, string> = {
  'not-met': 'not yet',
  partial: 'partly there',
  met: 'done',
};

const tally = (status: MilestoneStatus) =>
  MILESTONES.filter((milestone) => milestone.status === status).length;

const FILTERS: ReadonlyArray<{ id: MilestoneFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'not-met', label: 'Not yet' },
  { id: 'partial', label: 'Partly' },
  { id: 'met', label: `Done (${tally('met')})` },
];

/** Plain tile names, keyed by milestone id. */
const PLAIN_NAME: Record<string, string> = {
  'unseen-homes-policy': 'One robot brain succeeds in 9 of 10 new homes',
  'ten-thousand-unit-deployment': '10,000 humanoids doing documented work',
  'open-benchmark': 'Labs agree on one shared public test',
  'broad-rl-reliability': 'Practice gets robots to 99% on many tasks',
  'tactile-foundation-model': 'Touch sensing built into the robot’s brain',
  'sim-to-real-contact': 'Hand skills learned only in simulation work for real',
  'cost-per-task-parity': 'A humanoid matches a specialist machine’s cost per job',
  'data-scaling-law': '100 times more data brings matching gains',
};

/** The plain tile name a reader sees for a milestone. */
export function plainMilestoneName(id: string): string {
  return PLAIN_NAME[id] ?? MILESTONES.find((milestone) => milestone.id === id)?.name ?? id;
}

/** One line icon per milestone, drawn in a 40 × 32 box. */
const ICONS: Record<string, ReactNode> = {
  // A house.
  'unseen-homes-policy': <path d="M6 16 L20 5 L34 16 M10 13 V28 H30 V13 M17 28 V20 H23 V28" />,
  // A row of humanoids.
  'ten-thousand-unit-deployment': (
    <>
      {[6, 17, 28].map((x) => (
        <g key={x}>
          <circle cx={x + 3} cy={8} r={3} />
          <path d={`M${x + 3} 11 V21 M${x} 14 H${x + 6} M${x + 3} 21 L${x + 1} 28 M${x + 3} 21 L${x + 5} 28`} />
        </g>
      ))}
    </>
  ),
  // A shared checklist.
  'open-benchmark': (
    <>
      <rect x={10} y={4} width={20} height={25} rx={2} />
      <path d="M14 11 L16 13 L19 9 M22 11 H27 M14 18 L16 20 L19 16 M22 18 H27 M14 25 H27" />
    </>
  ),
  // A target.
  'broad-rl-reliability': (
    <>
      <circle cx={20} cy={16} r={12} />
      <circle cx={20} cy={16} r={7} />
      <circle cx={20} cy={16} r={2} />
    </>
  ),
  // A fingertip with touch waves.
  'tactile-foundation-model': (
    <>
      <path d="M12 30 V12 Q12 6 17 6 Q22 6 22 12 V30" />
      <path d="M26 10 Q29 14 26 18 M30 7 Q35 14 30 21" />
    </>
  ),
  // A screen with a cube, beside a cube for real.
  'sim-to-real-contact': (
    <>
      <rect x={3} y={6} width={20} height={15} rx={1.5} />
      <path d="M10 26 H16 M13 21 V26 M10 12 H16 V18 H10 Z M27 14 H31 M29 12 L31 14 L29 16" />
      <rect x={33} y={11} width={6} height={6} />
    </>
  ),
  // A price tag.
  'cost-per-task-parity': (
    <>
      <path d="M6 6 H20 L34 20 L22 32 L8 18 Z" transform="translate(0 -2)" />
      <circle cx={13} cy={11} r={2} />
    </>
  ),
  // Bars growing.
  'data-scaling-law': <path d="M5 29 H35 M8 29 V24 M15 29 V19 M22 29 V13 M29 29 V6" />,
};

/** Empty, half or full gauge: the status without relying on colour. */
function StatusGauge({ status }: { status: MilestoneStatus }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="h-4 w-4 shrink-0">
      <circle cx={8} cy={8} r={6.5} fill="none" stroke="currentColor" strokeWidth={1.5} />
      {status === 'partial' ? <path d="M8 1.5 A6.5 6.5 0 0 1 8 14.5 Z" fill="currentColor" /> : null}
      {status === 'met' ? <circle cx={8} cy={8} r={6.5} fill="currentColor" /> : null}
    </svg>
  );
}

const SECTION_LABEL = 'font-sans text-sm font-medium text-text-dim';
const TABLE_HEADER_CELL = 'px-3 py-2 text-left font-sans text-sm font-medium text-text-dim';
const TABLE_CELL = 'px-3 py-2 align-top';

function MilestoneDetail({ milestone }: { milestone: Milestone }) {
  const name = plainMilestoneName(milestone.id);
  return (
    <div
      data-testid="milestone-detail"
      role="region"
      aria-label={`${name} detail`}
      className="mt-3 border-t border-border-strong pt-3 font-sans text-sm"
    >
      <div className="flex flex-wrap items-center gap-2 font-medium text-text">
        {name}
        <span className="inline-flex items-center gap-1 font-normal text-text-dim">
          <StatusGauge status={milestone.status} />
          {STATUS_PLAIN[milestone.status]}
        </span>
      </div>
      <div className="mt-3">
        <div className={SECTION_LABEL}>Why it matters</div>
        <div className="mt-1 max-w-[65ch] leading-relaxed text-text">{milestone.whyItMatters}</div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <div className={SECTION_LABEL}>Current status</div>
          <div className="mt-1 leading-relaxed text-text-dim">
            {milestone.statusDetail}{' '}
            {milestone.citationIds.map((id) => (
              <CiteRef key={id} id={id} />
            ))}
          </div>
        </div>
        <div>
          <div className={SECTION_LABEL}>How we&rsquo;d know</div>
          <div className="mt-1 leading-relaxed text-text-dim">{milestone.howWeKnow}</div>
        </div>
      </div>
    </div>
  );
}

export function MilestonesWatchlist({ className }: { className?: string }) {
  const [filter, setFilter] = useState<MilestoneFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tileButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const captionId = useId();

  const visible = filterMilestones(MILESTONES, filter);
  // Selection is derived: a tile the filter hides closes its detail.
  const selected = visible.find((milestone) => milestone.id === selectedId) ?? null;

  function handleTileKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      next = Math.min(index + 1, visible.length - 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      next = Math.max(index - 1, 0);
    } else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = visible.length - 1;
    else return;
    event.preventDefault();
    setSelectedId(visible[next].id);
    tileButtons.current[next]?.focus();
  }

  function reset() {
    setFilter('all');
    setSelectedId(null);
  }

  const shown =
    filter === 'all'
      ? `Showing all ${MILESTONES.length}`
      : `Showing ${visible.length} of ${MILESTONES.length}: ${STATUS_FILTER_LABEL[filter]}`;
  const readout = selected ? `${shown}, open: ${plainMilestoneName(selected.id)}` : shown;

  return (
    <InstrumentFigure
      figureId="milestones-watchlist"
      data-testid="milestones-watchlist"
      className={className}
      kicker="Bear-case milestones"
      heading="Eight results would prove skeptics wrong; none has happened yet"
      controls={
        <PresetGroup<MilestoneFilter>
          label="Show"
          presets={FILTERS}
          value={filter}
          onChange={setFilter}
          testId="watchlist-filter"
        />
      }
      adjust={<InstrumentReset onClick={reset} />}
      stage={
        <FigureStage
          footer={<InstrumentReadout data-testid="watchlist-readout">{readout}</InstrumentReadout>}
        >
          <div className="px-3 pt-3 pb-2 font-sans text-sm leading-snug">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <div data-testid="watchlist-score" className="m-0 text-2xl font-semibold text-text">
                {tally('met')} of {MILESTONES.length} done
              </div>
              <StageCallout data-testid="watchlist-tally">
                {tally('partial')} partly there, {tally('not-met')} not yet, {tally('met')} done
              </StageCallout>
            </div>
            {visible.length === 0 ? (
              <div data-testid="watchlist-empty" className="m-0 mt-3 leading-relaxed text-text-dim">
                None of the eight milestones has reached this status yet. That absence is the bear
                case in one line: the evidence that would settle the question does not exist.
              </div>
            ) : (
              <ul
                data-testid="watchlist-tiles"
                aria-label="Milestones. Tap one to read the evidence behind its status."
                className="m-0! mt-3 grid list-none grid-cols-1 gap-2 p-0! sm:grid-cols-2 md:grid-cols-4"
              >
                {visible.map((milestone, index) => {
                  const isSelected = milestone.id === selected?.id;
                  const nameId = `${captionId}-name-${milestone.id}`;
                  const statusId = `${captionId}-status-${milestone.id}`;
                  return (
                    <li
                      key={milestone.id}
                      data-testid={`milestone-tile-${milestone.id}`}
                      data-status={milestone.status}
                      data-selected={isSelected || undefined}
                      className="m-0!"
                    >
                      <button
                        data-brand-control-id="control:selection"
                        ref={(el) => {
                          tileButtons.current[index] = el;
                        }}
                        type="button"
                        aria-pressed={isSelected}
                        aria-labelledby={nameId}
                        aria-describedby={statusId}
                        onClick={() => setSelectedId(milestone.id)}
                        onKeyDown={(event) => handleTileKeyDown(event, index)}
                        className={cx(
                          'flex h-full min-h-11 w-full gap-3 rounded-xs border p-2.5 text-left transition-colors md:flex-col md:gap-1.5',
                          isSelected ? 'border-highlight' : 'border-border-strong hover:border-text-dim',
                        )}
                      >
                        <svg
                          viewBox="0 0 40 32"
                          aria-hidden="true"
                          focusable="false"
                          className="h-8 w-10 shrink-0 text-text-dim"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {ICONS[milestone.id]}
                        </svg>
                        <span className="flex min-w-0 flex-col gap-1">
                          <span id={nameId} className="text-text">
                            {plainMilestoneName(milestone.id)}
                          </span>
                          <span
                            id={statusId}
                            data-milestone-status={milestone.status}
                            className="inline-flex items-center gap-1.5 text-text-dim"
                          >
                            <StatusGauge status={milestone.status} />
                            {STATUS_PLAIN[milestone.status]}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {selected ? <MilestoneDetail milestone={selected} /> : null}
          </div>
        </FigureStage>
      }
      caption="Watch these eight: as of August 2026 four are partly there, and each one met would weaken the case that robotics is overhyped."
      method={
        <>
          <div>
            Each status is Robot Wiki&rsquo;s editorial call on published evidence, reviewed in
            August 2026: &ldquo;partly there&rdquo; means a published result moves toward the
            milestone without meeting its test; &ldquo;not yet&rdquo; means no inspected record does.
            The table gives each milestone&rsquo;s original name, why it matters, the evidence behind
            the call with its sources, and how we&rsquo;d know it had been met.
          </div>
          <TableScroll labelledBy={captionId} className="pt-1">
            <table className="w-full min-w-[640px] border-collapse text-left font-sans text-sm text-text">
              <caption id={captionId} className="text-left text-text-dim">
                Eight milestones that would settle the bear case, with the status call, the
                evidence behind it and the observation that would flip it to met.
              </caption>
              <thead>
                <tr className="border-b border-border-strong">
                  <th scope="col" className={TABLE_HEADER_CELL}>Milestone</th>
                  <th scope="col" className={TABLE_HEADER_CELL}>Why it matters</th>
                  <th scope="col" className={TABLE_HEADER_CELL}>Status</th>
                  <th scope="col" className={TABLE_HEADER_CELL}>Evidence</th>
                  <th scope="col" className={TABLE_HEADER_CELL}>How we&rsquo;d know</th>
                </tr>
              </thead>
              <tbody>
                {MILESTONES.map((milestone) => (
                  <tr
                    key={milestone.id}
                    data-testid={`milestone-row-${milestone.id}`}
                    className="border-b border-border-strong last:border-b-0"
                  >
                    <th scope="row" className={cx(TABLE_CELL, 'min-w-[150px] font-normal')}>
                      <span className="block font-medium">{milestone.name}</span>
                      <span className="block text-text-dim">{plainMilestoneName(milestone.id)}</span>
                    </th>
                    <td className={cx(TABLE_CELL, 'min-w-[180px] text-text-dim')}>{milestone.whyItMatters}</td>
                    <td className={cx(TABLE_CELL, 'whitespace-nowrap')}>{STATUS_PLAIN[milestone.status]}</td>
                    <td className={cx(TABLE_CELL, 'min-w-[200px] text-text-dim')}>
                      {milestone.statusDetail}{' '}
                      {milestone.citationIds.map((id) => (
                        <CiteRef key={id} id={id} />
                      ))}
                    </td>
                    <td className={cx(TABLE_CELL, 'min-w-[180px] text-text-dim')}>{milestone.howWeKnow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </>
      }
    />
  );
}

export type { Milestone };
