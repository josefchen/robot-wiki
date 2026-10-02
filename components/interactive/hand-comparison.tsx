'use client';

import { useId, useMemo, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { TableScroll } from '@/components/ui';
import {
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PresetGroup,
} from '@/components/ui/instrument';
import { FigureStage, StageCallout } from '@/components/motion/figure-frame';
import {
  DEFAULT_HAND_SORT,
  DEXTEROUS_HANDS,
  TRAINING_BET_LABEL,
  defaultDirectionFor,
  sortHands,
  type DexterousHand,
  type HandSortKey,
  type SortDirection,
} from '@/lib/dexterous-hands';
import { cx } from '@/lib/utils';

/**
 * HandComparison: five dexterous hands from the dexterity module, drawn as
 * cards with three plain-words specs each: how many ways the hand can move
 * (degrees of freedom), the lightest touch it can feel (tactile
 * threshold) and its price. A spec the maker has not published shows as a
 * grey "not disclosed" stamp, so the pattern the module argues from is
 * visible at a glance: no hand publishes both touch and price.
 *
 * Unitree's $29,900 is the price of the whole H2 robot, not of a hand. Its
 * card shows the hand price as not disclosed with the whole-robot figure
 * labelled beneath, and the "Lowest price" order compares hand prices only,
 * so the whole robot never ranks as the cheapest hand. The full spec table
 * with actuation, training bet, sources and dates is in "How this was made".
 */

/** Rows whose listed price covers more than the hand. */
const isWholeRobotPrice = (hand: DexterousHand) => hand.costNote === 'whole robot';

/**
 * Glosses for the touch thresholds, derived from the displayed figures:
 * 5 mN is about 0.5 gram-force; 3 g is the maker's own unit.
 */
const TOUCH_GLOSS: Record<string, string> = {
  'sanctuary-phoenix': 'about half a gram',
  'figure-02-03': '3 grams',
};

const SORT_PRESETS: ReadonlyArray<{ id: HandSortKey; label: string }> = [
  { id: 'dof', label: 'Most joints' },
  { id: 'tactile', label: 'Lightest touch felt' },
  { id: 'cost', label: 'Lowest price' },
];

const SORT_DESCRIPTION: Record<HandSortKey, Record<SortDirection, string>> = {
  dof: {
    desc: 'most ways to move first',
    asc: 'fewest ways to move first',
  },
  tactile: {
    asc: 'lightest touch felt first',
    desc: 'lightest touch felt last',
  },
  cost: { asc: 'lowest hand price first', desc: 'highest hand price first' },
};

const TABLE_HEADER_CELL = 'px-3 py-2 text-left font-sans text-sm font-medium text-text-dim';
const TABLE_CELL = 'px-3 py-2 align-top';

/** Rows in display order. Price order compares hand prices only. */
function orderedHands(key: HandSortKey, direction: SortDirection): DexterousHand[] {
  if (key !== 'cost') return sortHands(DEXTEROUS_HANDS, key, direction);
  const handOnly = DEXTEROUS_HANDS.map((hand) =>
    isWholeRobotPrice(hand) ? { ...hand, costSort: null } : hand,
  );
  return sortHands(handOnly, key, direction).map(
    (row) => DEXTEROUS_HANDS.find((hand) => hand.id === row.id) as DexterousHand,
  );
}

function waysToMove(display: string): string {
  return display.replace('-', ' to ');
}

/**
 * Dim italic text for a spec the maker has not published. No border: an
 * outlined chip would be a surface plane the registry does not own.
 */
function NotDisclosed() {
  return (
    <span data-hand-gap="" className="whitespace-nowrap italic text-text-dim">
      not disclosed
    </span>
  );
}

/** A five-fingered hand drawn in line: palm, jointed fingers, thumb. */
function HandDrawing() {
  const finger = (x: number, top: number) => (
    <g key={x}>
      <line x1={x} y1={30} x2={x} y2={top + 9} />
      <line x1={x} y1={top + 7} x2={x} y2={top} />
    </g>
  );
  return (
    <svg
      viewBox="0 0 48 60"
      aria-hidden="true"
      focusable="false"
      className="h-14 w-11 shrink-0 text-text-dim"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 30 Q12 54 24 56 Q36 54 38 30 Z" strokeWidth={2} />
      <g strokeWidth={5}>
        {finger(15, 10)}
        {finger(22, 4)}
        {finger(29, 5)}
        {finger(36, 12)}
        <line x1={12} y1={40} x2={6} y2={30} />
        <line x1={5} y1={28} x2={3} y2={22} />
      </g>
    </svg>
  );
}

function SourceLink({ id, label }: { id: string; label: string }) {
  const citationFor = useCitationLookup();
  const citation = citationFor(id);
  if (!citation) {
    return <span className="text-text-dim">{label}</span>;
  }
  return (
    <a
      data-brand-control-id="control:link-focus"
      href={citation.url}
      target="_blank"
      rel="noopener"
      className="inline-flex min-h-6 items-center whitespace-nowrap underline-offset-2"
    >
      {label}
    </a>
  );
}

function HandCard({ hand, selected }: { hand: DexterousHand; selected: boolean }) {
  const touch = hand.tactileDisplay ? (TOUCH_GLOSS[hand.id] ?? hand.tactileDisplay) : null;
  const wholeRobot = isWholeRobotPrice(hand);
  return (
    <li
      data-testid={`hand-card-${hand.id}`}
      data-selected={selected || undefined}
      className={cx(
        'm-0! flex gap-3 border-t border-border-strong pt-3',
        selected && 'outline-2 outline-offset-2 outline-highlight',
      )}
    >
      <HandDrawing />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-text">{hand.name}</div>
        <div className="text-text-dim">{hand.maker}</div>
        <dl className="m-0 mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 sm:grid-cols-1">
          <div className="contents sm:block">
            <dt className="text-text-dim">Ways it can move</dt>
            <dd className="m-0 text-text">{waysToMove(hand.dofDisplay)}</dd>
          </div>
          <div className="contents sm:block">
            <dt className="text-text-dim">Lightest touch felt</dt>
            <dd className="m-0 text-text">{touch ?? <NotDisclosed />}</dd>
          </div>
          <div className="contents sm:block">
            <dt className="text-text-dim">Price of the hand</dt>
            <dd className="m-0 text-text">
              {hand.costDisplay && !wholeRobot ? (
                hand.costDisplay
              ) : (
                <NotDisclosed />
              )}
              {wholeRobot ? (
                <span data-testid="whole-robot-price" className="block text-text-dim">
                  Whole robot: {hand.costDisplay}
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
      </div>
    </li>
  );
}

export function HandComparison({ className }: { className?: string }) {
  const [sort, setSort] = useState<{
    key: HandSortKey;
    direction: SortDirection;
  }>(DEFAULT_HAND_SORT);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const captionId = useId();
  const rows = useMemo(() => orderedHands(sort.key, sort.direction), [sort]);
  const selected = DEXTEROUS_HANDS.filter((hand) => selectedIds.has(hand.id));
  const onDefaultDirection = sort.direction === defaultDirectionFor(sort.key);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function reset() {
    setSort(DEFAULT_HAND_SORT);
    setSelectedIds(new Set());
  }

  const readout = `${rows.length} hands, ${SORT_DESCRIPTION[sort.key][sort.direction]}${
    selected.length > 0 ? `, ${selected.length} selected` : ''
  }`;

  return (
    <InstrumentFigure
      figureId="hand-comparison"
      data-testid="hand-comparison"
      className={className}
      kicker="Dexterous hands"
      heading="No hand here publishes both touch sensitivity and price"
      controls={
        <PresetGroup<HandSortKey>
          label="Sort by"
          presets={SORT_PRESETS}
          value={onDefaultDirection ? sort.key : null}
          onChange={(key) => setSort({ key, direction: defaultDirectionFor(key) })}
          testId="hand-sort"
        />
      }
      adjust={
        <>
          <button
            data-brand-control-id="control:secondary-action"
            type="button"
            onClick={() =>
              setSort((prev) => ({
                key: prev.key,
                direction: prev.direction === 'asc' ? 'desc' : 'asc',
              }))
            }
            className={INSTRUMENT_TOGGLE_CLASS}
          >
            Reverse the order
          </button>
          <div role="group" aria-label="Compare hands" className="grid basis-full gap-1">
            <span className="text-text-dim">Compare hands</span>
            <div className="flex flex-wrap gap-1.5">
              {DEXTEROUS_HANDS.map((hand) => (
                <button
                  key={hand.id}
                  data-brand-control-id="control:selection"
                  type="button"
                  aria-pressed={selectedIds.has(hand.id)}
                  aria-label={`Select ${hand.name} for comparison`}
                  onClick={() => toggleSelect(hand.id)}
                  className={INSTRUMENT_TOGGLE_CLASS}
                >
                  {hand.name}
                </button>
              ))}
            </div>
          </div>
          <div data-testid="hand-comparison-selection" className="basis-full">
            {selected.length === 0 ? (
              <p className="m-0 text-text-dim">Select hands to compare their trade-offs.</p>
            ) : (
              <ul className="m-0! flex flex-col gap-2 p-0!">
                {selected.map((hand) => (
                  <li key={hand.id} className="m-0! max-w-[65ch] text-text-dim">
                    <span className="font-medium text-text">{hand.name}.</span> {hand.tradeoff}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <InstrumentReadout data-testid="hand-comparison-readout">{readout}</InstrumentReadout>
          }
        >
          <div className="px-3 pt-3 pb-2 font-sans text-sm leading-snug">
            <StageCallout data-testid="hand-gap-note">
              Grey means the maker hasn&rsquo;t published it. No hand shows both.
            </StageCallout>
            <ul
              data-testid="hand-cards"
              className="m-0! mt-2 grid list-none grid-cols-1 gap-x-4 gap-y-3 p-0! sm:grid-cols-2 md:grid-cols-3"
            >
              {rows.map((hand) => (
                <HandCard key={hand.id} hand={hand} selected={selectedIds.has(hand.id)} />
              ))}
            </ul>
          </div>
        </FigureStage>
      }
      caption="Two numbers buyers need, touch sensitivity and price, are never published together for these five robot hands."
      method={
        <>
          <p>
            &ldquo;Ways it can move&rdquo; is the hand&rsquo;s degrees of freedom (DoF), the number
            of independently driven motions. &ldquo;Lightest touch felt&rdquo; is the tactile
            threshold, the smallest force a fingertip sensor registers: Sanctuary reports about
            5 mN for the Phoenix fingerpads (about 0.5 gram-force), Figure reports 3 g (about
            29 mN) for its fingertips. Every other value is one the maker has not published, shown
            as not disclosed; no number is guessed.
          </p>
          <p>
            Unitree&rsquo;s $29,900 is the list price of the whole H2 robot; the base model ships
            with placeholder hands and the five-finger Dex5-1 hand is a paid option with no
            published price, so the card shows the hand price as not disclosed and the
            &ldquo;Lowest price&rdquo; order leaves the whole robot out. Shadow&rsquo;s
            &euro;110,000 is its 2022 price including support.
          </p>
          <TableScroll labelledBy={captionId} className="pt-1">
            <table className="w-full min-w-[560px] border-collapse text-left font-sans text-sm text-text">
              <caption id={captionId} className="text-left text-text-dim">
                Five dexterous hands with their degrees of freedom, tactile threshold, cost,
                actuation, training bet and sources, in the order the cards show.
              </caption>
              <thead>
                <tr className="border-b border-border-strong">
                  <th scope="col" className={TABLE_HEADER_CELL}>Hand</th>
                  <th
                    scope="col"
                    aria-sort={sort.key === 'dof' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={TABLE_HEADER_CELL}
                  >
                    DoF
                  </th>
                  <th
                    scope="col"
                    aria-sort={sort.key === 'tactile' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={TABLE_HEADER_CELL}
                  >
                    Tactile threshold
                  </th>
                  <th
                    scope="col"
                    aria-sort={sort.key === 'cost' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={TABLE_HEADER_CELL}
                  >
                    Cost
                  </th>
                  <th scope="col" className={TABLE_HEADER_CELL}>Training bet</th>
                  <th scope="col" className={TABLE_HEADER_CELL}>Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((hand) => (
                  <tr
                    key={hand.id}
                    data-testid={`hand-row-${hand.id}`}
                    data-selected={selectedIds.has(hand.id) || undefined}
                    className="border-b border-border-strong last:border-b-0"
                  >
                    <th scope="row" className={cx(TABLE_CELL, 'min-w-[150px] font-normal')}>
                      <span className="block font-medium">{hand.name}</span>
                      <span className="block text-text-dim">
                        {hand.maker} · {hand.actuation}
                      </span>
                    </th>
                    <td className={cx(TABLE_CELL, 'whitespace-nowrap tabular-nums')}>{hand.dofDisplay}</td>
                    <td className={cx(TABLE_CELL, 'whitespace-nowrap tabular-nums')}>
                      {hand.tactileDisplay ? (
                        <>
                          {hand.tactileDisplay}
                          {hand.tactileNote ? (
                            <span className="block text-text-dim">{hand.tactileNote}</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-text-dim">not disclosed</span>
                      )}
                    </td>
                    <td className={cx(TABLE_CELL, 'whitespace-nowrap tabular-nums')}>
                      {hand.costDisplay ? (
                        <>
                          {hand.costDisplay}
                          {hand.costNote ? (
                            <span className="block text-text-dim">{hand.costNote}</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-text-dim">not disclosed</span>
                      )}
                    </td>
                    <td className={cx(TABLE_CELL, 'text-text-dim')}>{TRAINING_BET_LABEL[hand.bet]}</td>
                    <td className={TABLE_CELL}>
                      <span className="block">
                        <SourceLink id={hand.sourceId} label={hand.sourceLabel} />
                      </span>
                      {hand.secondarySourceId && hand.secondarySourceLabel ? (
                        <span className="block">
                          <SourceLink id={hand.secondarySourceId} label={hand.secondarySourceLabel} />
                        </span>
                      ) : null}
                      <span className="block whitespace-nowrap text-text-dim">{hand.asOf}</span>
                    </td>
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
