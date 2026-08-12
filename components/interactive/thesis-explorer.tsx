'use client';

import { useRef, useState } from 'react';
import { CiteRef } from '@/components/mdx/cite-ref';
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
 * is reduced-motion safe by construction. Column headers and section
 * labels are mono and dim but deliberately NOT uppercase: the page's
 * uppercase micro-label budget (VAL-DESIGN-010) is left unspent here.
 */

const HEADER_CELL =
  'px-3 py-2.5 text-left font-mono text-[11px] font-medium tracking-[0.14em] text-text-dim';

const CELL = 'px-3 py-2.5 align-top';

const SECTION_LABEL =
  'font-mono text-[11px] font-medium tracking-[0.14em] text-text-dim';

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
    <ul aria-labelledby={headingId} className="space-y-2">
      {items.map((item) => (
        <li
          key={item.text}
          className="font-sans text-xs leading-relaxed text-text-dim"
        >
          {item.text}{' '}
          {item.citationIds.map((id) => (
            <CiteRef key={id} id={id} />
          ))}
        </li>
      ))}
    </ul>
  );
}

export function ThesisExplorer({ className }: { className?: string }) {
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_THESIS_ID);
  const rowButtons = useRef<Array<HTMLButtonElement | null>>([]);

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
    <div
      data-testid="thesis-explorer"
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <p
          data-testid="thesis-readout"
          aria-live="polite"
          className="font-mono text-xs text-text-dim"
        >
          {readout}
        </p>
        <button
          type="button"
          onClick={() => select(DEFAULT_THESIS_ID)}
          className="ml-auto rounded-sm bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left">
          <caption className="sr-only">
            Six competing theses for robot intelligence. Select a row to read
            its proponents, the evidence on both sides, and its falsification
            criterion.
          </caption>
          <thead>
            <tr className="border-b border-border">
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
                      onClick={() => select(thesis.id)}
                      onKeyDown={(event) => handleRowKeyDown(event, index)}
                      className={cx(
                        'text-left font-mono text-xs font-medium transition-colors',
                        isSelected
                          ? 'text-accent'
                          : 'text-text hover:text-accent',
                      )}
                    >
                      {thesis.name}
                    </button>
                    <p className="mt-1 max-w-[30ch] font-sans text-[11px] leading-snug text-text-dim">
                      {thesis.claim}
                    </p>
                  </th>
                  <td
                    className={cx(CELL, 'font-sans text-[11px] text-text-dim')}
                  >
                    <ProponentsCell thesis={thesis} />
                  </td>
                  <td
                    className={cx(
                      CELL,
                      'min-w-[120px] font-sans text-[11px] text-text-dim',
                    )}
                  >
                    {thesis.falsificationSignal}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        data-testid="thesis-detail"
        role="region"
        aria-label={`${selected.name} detail`}
        className="mt-4 border-t border-border pt-4"
      >
        <p className="font-sans text-sm font-medium text-text">
          {selected.name}
        </p>
        <p className="mt-1 max-w-[65ch] font-sans text-xs leading-relaxed text-text-dim">
          {selected.claim}
        </p>

        <div className="mt-4">
          <h4 className={SECTION_LABEL}>Proponents</h4>
          <ul className="mt-1.5 space-y-1">
            {selected.proponents.map((proponent) => (
              <li
                key={proponent}
                className="font-sans text-xs leading-relaxed text-text"
              >
                {proponent}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <h4 id={`${selected.id}-for`} className={SECTION_LABEL}>
              Evidence for
            </h4>
            <div className="mt-1.5">
              <EvidenceList
                items={selected.evidenceFor}
                headingId={`${selected.id}-for`}
              />
            </div>
          </div>
          <div>
            <h4 id={`${selected.id}-against`} className={SECTION_LABEL}>
              Evidence against
            </h4>
            <div className="mt-1.5">
              <EvidenceList
                items={selected.evidenceAgainst}
                headingId={`${selected.id}-against`}
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h4 className={SECTION_LABEL}>Falsification criterion</h4>
          <p className="mt-1.5 max-w-[65ch] font-sans text-xs leading-relaxed text-text">
            {selected.falsification}
          </p>
        </div>
      </div>
    </div>
  );
}
