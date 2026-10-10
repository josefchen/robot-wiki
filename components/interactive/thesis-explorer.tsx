'use client';

import { Fragment, useId, useRef, useState } from 'react';
import { CiteRef } from '@/components/article/citation-records';
import { TableScroll } from '@/components/ui';
import { InstrumentFigure, InstrumentReadout, InstrumentReset } from '@/components/ui/instrument';
import { FigureStage, StageCallout } from '@/components/motion/figure-frame';
import { THESES, type Thesis } from '@/lib/competing-theses';
import { cx } from '@/lib/utils';

/**
 * ThesisExplorer: six falsifiable bets on how robot intelligence gets
 * built, drawn as cards. Each card carries a small line drawing, a plain
 * name, the bet in one line and the result that would prove it wrong.
 * Tapping a card (the figure's one control) opens that bet's evidence for
 * and against, with citations, and its named proponents. The technical
 * thesis names, the original "Falsified if" wording and the full
 * falsification criteria are in "How this was made".
 *
 * Interactive contract: deterministic render, keyboard-operable cards
 * (Tab + Enter, plus ArrowUp/ArrowDown/ArrowLeft/ArrowRight/Home/End
 * between cards), a readout that names the open bet, a reset in "Adjust
 * more". No animation, so the component is reduced-motion safe.
 */

const SECTION_LABEL = 'font-sans text-sm font-medium text-text-dim';

/**
 * Important, because the unlayered `.prose ul` and `.prose li` rules
 * otherwise indent the stage's lists and space them like article prose.
 */
const STAGE_LIST = 'm-0! flex flex-col p-0!';
const STAGE_ITEM = 'm-0! text-sm leading-relaxed';

const TABLE_HEADER_CELL = 'px-3 py-2 text-left font-sans text-sm font-medium text-text-dim';
const TABLE_CELL = 'px-3 py-2 align-top';

/** Plain names, one-line bets and "wrong if" sentences for the main view. */
const PLAIN: Record<string, { name: string; bet: string; wrongIf: string }> = {
  'end-to-end-vla': {
    name: 'Just make it bigger',
    bet: 'More data and bigger models will make robots generally capable, as they did for chatbots.',
    wrongIf: 'We’d know it’s wrong if 10 times more data brings no improvement.',
  },
  'hierarchical-planner': {
    name: 'A planner directs simple skills',
    bet: 'A reasoning model breaks a goal into steps; learned skills carry each one out.',
    wrongIf: 'We’d know it’s wrong if one single model beats the planner-plus-skills setup.',
  },
  'world-model-training': {
    name: 'Let the robot imagine first',
    bet: 'A model that predicts what happens next lets robots practise in imagination.',
    wrongIf: 'We’d know it’s wrong if it adds nothing beyond simply scaling up.',
  },
  'rl-finetuning': {
    name: 'Copy first, then practise',
    bet: 'Robots copy people first, then practise on the real robot until they are reliable.',
    wrongIf: 'We’d know it’s wrong if practice only ever produces one-task specialists.',
  },
  'teleop-bridge': {
    name: 'Humans steer while robots learn',
    bet: 'People remote-control robots doing real work now, and step back as the robots learn.',
    wrongIf: 'We’d know it’s wrong if robots reach 99% without any human-steered data.',
  },
  'form-factor': {
    name: 'Human-shaped or built for the job',
    bet: 'Human-shaped robots fit a world built for people; machines built for one job are cheaper.',
    wrongIf: 'A cost-per-job comparison against purpose-built machines would show which side is wrong.',
  },
};

/** The plain card name a reader sees for a thesis. */
export function plainThesisName(id: string): string {
  return PLAIN[id]?.name ?? THESES.find((thesis) => thesis.id === id)?.name ?? id;
}

function plainFor(thesis: Thesis) {
  return PLAIN[thesis.id] ?? { name: thesis.name, bet: thesis.claim, wrongIf: thesis.falsificationSignal };
}

function EvidenceList({ items, headingId }: { items: Thesis['evidenceFor']; headingId: string }) {
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

function ThesisDetail({ thesis }: { thesis: Thesis }) {
  const plain = plainFor(thesis);
  return (
    <div
      data-testid="thesis-detail"
      role="region"
      aria-label={`${plain.name} detail`}
      className="mt-3 border-t border-border-strong pt-3 font-sans text-sm"
    >
      <div className="font-medium text-text">{plain.name}</div>
      <div className="mt-1 max-w-[65ch] leading-relaxed text-text-dim">{thesis.claim}</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <div id={`${thesis.id}-for`} className={SECTION_LABEL}>
            Evidence for
          </div>
          <div className="mt-1">
            <EvidenceList items={thesis.evidenceFor} headingId={`${thesis.id}-for`} />
          </div>
        </div>
        <div>
          <div id={`${thesis.id}-against`} className={SECTION_LABEL}>
            Evidence against
          </div>
          <div className="mt-1">
            <EvidenceList items={thesis.evidenceAgainst} headingId={`${thesis.id}-against`} />
          </div>
        </div>
      </div>
      <div className="mt-3">
        <div className={SECTION_LABEL}>Who backs it</div>
        <ul className={cx(STAGE_LIST, 'mt-1 gap-1')}>
          {thesis.proponents.map((proponent) => (
            <li key={proponent} className={cx(STAGE_ITEM, 'text-text')}>
              {proponent}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-3">
        <div className={SECTION_LABEL}>We&rsquo;d know it&rsquo;s wrong if</div>
        <div className="mt-1 max-w-[65ch] leading-relaxed text-text">{thesis.falsification}</div>
      </div>
    </div>
  );
}

export function ThesisExplorer({ className }: { className?: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cardButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const captionId = useId();

  const selected = THESES.find((thesis) => thesis.id === selectedId) ?? null;


  function handleCardKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      next = Math.min(index + 1, THESES.length - 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      next = Math.max(index - 1, 0);
    } else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = THESES.length - 1;
    else return;
    event.preventDefault();
    setSelectedId(THESES[next].id);
    cardButtons.current[next]?.focus();
  }

  const readout = selected
    ? `6 bets, showing: ${plainFor(selected).name}`
    : '6 bets. Tap one to read the evidence for and against.';

  return (
    <InstrumentFigure
      figureId="thesis-explorer"
      data-testid="thesis-explorer"
      className={className}
      kicker="Competing theses"
      heading="Six competing bets on how robots will get smart"
      adjust={<InstrumentReset onClick={() => setSelectedId(null)} />}
      stage={
        <FigureStage
          footer={<InstrumentReadout data-testid="thesis-readout">{readout}</InstrumentReadout>}
        >
          <div className="px-3 pt-3 pb-2 font-sans text-sm leading-snug">
            <StageCallout data-testid="thesis-wrong-if-note">
              Each bet names the result that would prove it wrong
            </StageCallout>
            <ul
              data-testid="thesis-cards"
              aria-label="Six bets. Tap one to read its evidence."
              className="m-0! mt-2 grid list-none grid-cols-1 gap-3 p-0! sm:grid-cols-2 md:grid-cols-3"
            >
              {THESES.map((thesis, index) => {
                const plain = plainFor(thesis);
                const isSelected = thesis.id === selectedId;
                return (
                  <li
                    key={thesis.id}
                    data-testid={`thesis-card-${thesis.id}`}
                    data-selected={isSelected || undefined}
                    className="m-0!"
                  >
                    <button
                      data-brand-control-id="control:selection"
                      ref={(el) => {
                        cardButtons.current[index] = el;
                      }}
                      type="button"
                      aria-pressed={isSelected}
                      aria-labelledby={`${captionId}-name-${thesis.id}`}
                      aria-describedby={`${captionId}-bet-${thesis.id} ${captionId}-wrong-${thesis.id}`}
                      onClick={() => setSelectedId(thesis.id)}
                      onKeyDown={(event) => handleCardKeyDown(event, index)}
                      className={cx(
                        'flex h-full min-h-11 w-full flex-col gap-1.5 border-t pt-3 pb-1 text-left transition-colors',
                        isSelected
                          ? 'border-text'
                          : 'border-border-strong hover:border-text-dim',
                      )}
                    >
                      <span aria-hidden="true" className="font-mono text-[12px] tabular-nums text-text-dim">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span
                        id={`${captionId}-name-${thesis.id}`}
                        className="font-semibold text-text">
                        {plain.name}
                      </span>
                      <span id={`${captionId}-bet-${thesis.id}`} className="text-text-dim">
                        {plain.bet}
                      </span>
                      <span
                        id={`${captionId}-wrong-${thesis.id}`}
                        data-thesis-wrong-if=""
                        className="mt-auto text-text"
                      >
                        {plain.wrongIf}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {selected ? <ThesisDetail thesis={selected} /> : null}
          </div>
        </FigureStage>
      }
      caption="Experts disagree on how to make robots generally capable; each bet here names the result that would prove it wrong."
      method={
        <>
          <div>
            The grouping into six theses is Robot Wiki&rsquo;s editorial reading of the field, not
            a published taxonomy. Each card&rsquo;s plain name stands for the technical thesis in
            the table below; the evidence for and against, with its citations, opens when you tap a
            card. The table gives the original short &ldquo;Falsified if&rdquo; signal and the full
            falsification criterion.
          </div>
          <TableScroll labelledBy={captionId} className="pt-1">
            <table className="w-full min-w-[560px] border-collapse text-left font-sans text-sm text-text">
              <caption id={captionId} className="text-left text-text-dim">
                The six theses by their technical names, with the core claim, the named
                proponents, the short falsification signal and the full criterion.
              </caption>
              <thead>
                <tr className="border-b border-border-strong">
                  <th scope="col" className={TABLE_HEADER_CELL}>Thesis</th>
                  <th scope="col" className={TABLE_HEADER_CELL}>Proponents</th>
                  <th scope="col" className={TABLE_HEADER_CELL}>Falsified if</th>
                  <th scope="col" className={TABLE_HEADER_CELL}>Full criterion</th>
                </tr>
              </thead>
              <tbody>
                {THESES.map((thesis) => (
                  <tr
                    key={thesis.id}
                    data-testid={`thesis-row-${thesis.id}`}
                    className="border-b border-border-strong last:border-b-0"
                  >
                    <th scope="row" className={cx(TABLE_CELL, 'min-w-[170px] font-normal')}>
                      <span className="block font-medium">{thesis.name}</span>
                      <span className="block text-text-dim">{plainFor(thesis).name}</span>
                      <span className="mt-1 block text-text-dim">{thesis.claim}</span>
                    </th>
                    <td className={cx(TABLE_CELL, 'text-text-dim')}>
                      {thesis.proponents.join('; ')}
                    </td>
                    <td className={cx(TABLE_CELL, 'min-w-[120px] text-text-dim')}>
                      {thesis.falsificationSignal}
                    </td>
                    <td className={cx(TABLE_CELL, 'min-w-[200px] text-text-dim')}>
                      {thesis.falsification}
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
