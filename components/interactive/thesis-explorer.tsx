'use client';

import { Fragment, useId, useRef, useState } from 'react';
import { CiteRef } from '@/components/article/citation-records';
import { TableScroll } from '@/components/ui';
import {
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  DEFAULT_THESIS_ID,
  THESES,
  type Thesis,
} from '@/lib/competing-theses';
import { cx } from '@/lib/utils';

/**
 * ThesisExplorer: the comparison table for the competing-theses module. Six
 * falsifiable bets on how robot intelligence gets built, each with named
 * proponents, the strongest evidence on both sides, and the observation
 * that would kill it. Selecting a row (pointer or keyboard) swaps the
 * detail panel to that thesis.
 *
 * Interactive contract: deterministic render, keyboard-operable rows
 * (Tab + Enter, plus ArrowUp/ArrowDown/Home/End between rows), a visible
 * readout that names the selection, a reset control, and horizontal scroll
 * inside its own container at 375px. No animation at all, so the component
 * is reduced-motion safe by construction.
 */

const HEADER_CELL = 'px-3 py-2 text-left font-sans text-xs font-medium text-text-dim';

const CELL = 'px-3 py-2.5 align-top';

const SECTION_LABEL = 'font-sans text-xs font-medium text-text-dim';

/**
 * Important, because the unlayered `.prose ul` and `.prose li` rules
 * otherwise indent the stage's lists and space them like article prose.
 */
const STAGE_LIST = 'm-0! flex flex-col p-0!';
const STAGE_ITEM = 'm-0! text-[13px] leading-relaxed';

/** How many proponents the table cell names before collapsing to "+N". */
const TABLE_PROPONENT_LIMIT = 3;

function ProponentsCell({ thesis }: { thesis: Thesis }) {
  const shown = thesis.proponents.slice(0, TABLE_PROPONENT_LIMIT);
  const extra = thesis.proponents.length - shown.length;
  return (
    <span>
      {shown.join(', ')}
      {extra > 0 ? ` +${extra}` : ''}
    </span>
  );
}

function EvidenceList({
  items,
  headingId,
}: {
  items: Thesis['evidenceFor'];
  headingId: string;
}) {
  return (
    <ul aria-labelledby={headingId} className={cx(STAGE_LIST, 'gap-2')}>
      {items.map((item) => (
        <li key={item.text} className={cx(STAGE_ITEM, 'text-text-dim')}>
          {item.text}{' '}
          {item.citationIds.map((id) => {
            const chip = <CiteRef id={id} />;
            return id === 'vjepa2-2025' || id === 'cosmos-3-2026' ? (
              <span key={id} className="block" data-thesis-source-placement="line-start">
                {chip}
              </span>
            ) : (
              <Fragment key={id}>{chip}</Fragment>
            );
          })}
        </li>
      ))}
    </ul>
  );
}

export function ThesisExplorer({ className }: { className?: string }) {
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_THESIS_ID);
  const rowButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const captionId = useId();

  const selected =
    THESES.find((thesis) => thesis.id === selectedId) ?? THESES[0];

  function select(id: string, focus = false) {
    setSelectedId(id);
    if (focus) {
      const index = THESES.findIndex((thesis) => thesis.id === id);
      rowButtons.current[index]?.focus();
    }
  }

  function handleRowKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let next = index;
    if (event.key === 'ArrowDown') next = Math.min(index + 1, THESES.length - 1);
    else if (event.key === 'ArrowUp') next = Math.max(index - 1, 0);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = THESES.length - 1;
    else return;
    event.preventDefault();
    select(THESES[next].id, true);
  }

  const readout = `${THESES.length} theses, showing: ${selected.name}`;

  return (
    <InstrumentFigure
      figureId="thesis-explorer"
      data-testid="thesis-explorer"
      className={className}
      heading="Competing theses for robot intelligence"
      controls={<InstrumentReset onClick={() => select(DEFAULT_THESIS_ID)} />}
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentReadout data-testid="thesis-readout">{readout}</InstrumentReadout>
              <div
                data-testid="thesis-detail"
                role="region"
                aria-label={`${selected.name} detail`}
                className="mt-1 basis-full border-t border-border-strong pt-3 font-sans"
              >
                <div className="text-sm font-medium text-text">{selected.name}</div>
                <div className="mt-1 max-w-[65ch] text-[13px] leading-relaxed text-text-dim">
                  {selected.claim}
                </div>
                <div className="mt-3">
                  <div className={SECTION_LABEL}>Proponents</div>
                  <div className="mt-1">
                    <ul className={cx(STAGE_LIST, 'gap-1')}>
                      {selected.proponents.map((proponent) => (
                        <li key={proponent} className={cx(STAGE_ITEM, 'text-text')}>
                          {proponent}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div id={`${selected.id}-for`} className={SECTION_LABEL}>
                      Evidence for
                    </div>
                    <div className="mt-1">
                      <EvidenceList
                        items={selected.evidenceFor}
                        headingId={`${selected.id}-for`}
                      />
                    </div>
                  </div>
                  <div>
                    <div id={`${selected.id}-against`} className={SECTION_LABEL}>
                      Evidence against
                    </div>
                    <div className="mt-1">
                      <EvidenceList
                        items={selected.evidenceAgainst}
                        headingId={`${selected.id}-against`}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className={SECTION_LABEL}>Falsification criterion</div>
                  <div className="mt-1 max-w-[65ch] text-[13px] leading-relaxed text-text">
                    {selected.falsification}
                  </div>
                </div>
              </div>
            </>
          }
        >
          <TableScroll labelledBy={captionId} className="px-1 pt-1.5 pb-1">
            <table className="w-full min-w-[480px] border-collapse text-left font-sans text-[13px] text-text">
              <caption id={captionId} className="sr-only">
                Six competing theses for robot intelligence. Select a row to read
                its proponents, the evidence on both sides, and its falsification
                criterion.
              </caption>
              <thead>
                <tr className="border-b border-border-strong">
                  <th scope="col" className={HEADER_CELL}>
                    Thesis
                  </th>
                  <th scope="col" className={HEADER_CELL}>
                    Proponents
                  </th>
                  <th scope="col" className={HEADER_CELL}>
                    Falsified if
                  </th>
                </tr>
              </thead>
              <tbody>
                {THESES.map((thesis, index) => {
                  const isSelected = thesis.id === selected.id;
                  return (
                    <tr
                      key={thesis.id}
                      data-testid={`thesis-row-${thesis.id}`}
                      data-selected={isSelected || undefined}
                      className="border-b border-border-strong last:border-b-0"
                    >
                      {/* Selection is the lime bar on the row's edge. */}
                      <th
                        scope="row"
                        className={cx(
                          CELL,
                          'min-w-[170px] border-l-[3px] font-normal',
                          isSelected ? 'border-l-highlight' : 'border-l-transparent',
                        )}
                      >
                        <button
                          data-brand-control-id="control:selection"
                          ref={(el) => {
                            rowButtons.current[index] = el;
                          }}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => select(thesis.id)}
                          onKeyDown={(event) => handleRowKeyDown(event, index)}
                          className="min-h-6 text-left font-medium text-text underline decoration-border-strong decoration-1 underline-offset-4 transition-colors hover:decoration-text aria-pressed:no-underline"
                        >
                          {thesis.name}
                        </button>
                        <span className="mt-1 block max-w-[30ch] text-xs leading-snug text-text-dim">
                          {thesis.claim}
                        </span>
                      </th>
                      <td className={cx(CELL, 'text-xs leading-snug text-text-dim')}>
                        <ProponentsCell thesis={thesis} />
                      </td>
                      <td className={cx(CELL, 'min-w-[120px] text-xs leading-snug text-text-dim')}>
                        {thesis.falsificationSignal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
        </FigureStage>
      }
      caption="Each thesis is a falsifiable bet; the detail panel cites evidence on both sides and names its falsification test."
    />
  );
}
