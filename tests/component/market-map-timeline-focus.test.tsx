import { fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMPANIES } from '@/data/companies';
import type { Company } from '@/data/schemas/company';
import { timelineEvents } from '@/lib/market-map';
import { FundingTimeline } from '@/components/market-map/funding-timeline';

/**
 * The timeline is controlled: the open company is the URL hash, owned by
 * MarketMap. This harness stands in for it, toggling like MarketMap does.
 */
function Timeline({
  companies = COMPANIES,
  initial = null,
}: {
  companies?: readonly Company[];
  initial?: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(initial);
  return (
    <FundingTimeline
      companies={companies}
      selectedId={selectedId}
      onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
    />
  );
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

const TIMEOUT = 15_000;

/**
 * Roving-tabindex keyboard access for the funding timeline (parity with
 * the bubble view): the rows are ONE tab stop, ArrowUp/ArrowDown move
 * between rows in the order they are rendered (chronological). Pure
 * roving logic is in lib/market-map.ts (stepTimeline, unit-tested);
 * these pin the DOM contract. e2e proves the real keyboard path.
 */

function rows(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-timeline-id] > button'),
  );
}

function buttonOf(companyId: string): HTMLElement {
  const el = document.querySelector(
    `[data-timeline-id][data-company-id="${companyId}"] > button`,
  );
  if (!el) throw new Error(`no timeline row for ${companyId}`);
  return el as HTMLElement;
}

function firstEventId(): string {
  const events = timelineEvents(COMPANIES);
  return events[0].id;
}

describe('FundingTimeline roving keyboard access', () => {
  it('is a single tab stop: one row tabbable, the rest not', () => {
    render(<Timeline />);
    const all = rows();
    // 71 of the 111 companies have a 2023-2026 dated round; all render.
    // 73 -> 72 when the 2026-08-18 figure-corrections pass nulled the
    // clone-robotics and hanson-robotics rounds (aggregator conflicts).
    // 72 -> 71 when the batch-3 re-verification pass (2026-08-18) nulled
    // robot-era's round date: every fetched body says "over $200 million
    // led by SF Group" with no day stated, so the bound-shaped round lost
    // its aggregator-only 2026-04-01 date and its timeline row.
    // 71 -> 72 when the 2026-10-19 data pass recorded Farm-ng's acquisition
    // by Bonsai Robotics (24 July 2025, terms undisclosed, first-party
    // release), which is a dated 2023-2026 event.
    // 72 -> 71 when the 2026-10-19 field audit cut Physical Intelligence's
    // round date: The Robot Report says only that it raised "last week".
    // 71 -> 72 when the 2026-10-20 field audit gave Symbotic its latest
    // raise, the public offering it priced on 4 December 2025.
    // 72 -> 73 when the same audit gave Locus Robotics its latest raise, the
    // still-open Series G reported on 1 September 2026.
    // 73 -> 75 when the same audit gave CMR Surgical Stryker's investment
    // of 12 October 2026 and Moon Surgical its Series B of 17 May 2023.
    // 75 -> 76 when the same audit gave XELA Robotics Plug and Play's
    // strategic investment of 29 April 2026.
    expect(all.length).toBe(76); // 69 dated 2023-2026 rounds since the 2026-08-18 audit (Mytra Series C, Coco Series B, Encord Series B);
    const tabbable = all.filter((el) => el.tabIndex === 0);
    const roving = all.filter((el) => el.tabIndex === -1);
    expect(tabbable).toHaveLength(1);
    expect(roving).toHaveLength(75); // 76 dated rows minus the one tabbable
  }, TIMEOUT);

  it('moves down to the next event chronologically with ArrowDown', () => {
    render(<Timeline />);
    const events = timelineEvents(COMPANIES);
    const first = buttonOf(events[0].companyId);
    fireEvent.focus(first);
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    const activeId = document.activeElement
      ?.closest('[data-timeline-id]')
      ?.getAttribute('data-timeline-id');
    expect(activeId).toBe(events[1].id);
    // Focus moved for real (jsdom does run the .focus() call).
    expect(document.activeElement).toBe(buttonOf(events[1].companyId));
  }, TIMEOUT);

  it('moves up with ArrowUp and wraps at both ends', () => {
    render(<Timeline />);
    const events = timelineEvents(COMPANIES);
    const second = buttonOf(events[1].companyId);
    fireEvent.focus(second);
    fireEvent.keyDown(second, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(buttonOf(events[0].companyId));

    // Wrap: last + Down -> first, first + Up -> last.
    const last = buttonOf(events[events.length - 1].companyId);
    fireEvent.focus(last);
    fireEvent.keyDown(last, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(buttonOf(events[0].companyId));

    const first = buttonOf(events[0].companyId);
    fireEvent.focus(first);
    fireEvent.keyDown(first, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(buttonOf(events[events.length - 1].companyId));
  }, TIMEOUT);

  it('keeps the last-focused row as the tab stop after blur (roving tabindex)', () => {
    render(<Timeline />);
    const events = timelineEvents(COMPANIES);
    const first = buttonOf(events[0].companyId);
    fireEvent.focus(first);
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowDown' });
    const moved = document.activeElement?.closest('[data-timeline-id]');
    expect(moved?.getAttribute('data-timeline-id')).toBe(events[2].id);
    (document.activeElement as HTMLElement).blur();
    const stop = rows().find((el) => el.tabIndex === 0);
    expect(stop?.closest('[data-timeline-id]')?.getAttribute('data-timeline-id')).toBe(
      events[2].id,
    );
  }, TIMEOUT);

  it('keeps exactly one tab stop when the hash names a company without an event', () => {
    // nvidia-robotics has no 2023-2026 dated round, so no row carries
    // its id: the hash must not strand the timeline with no tab stop.
    render(<Timeline initial="nvidia-robotics" />);
    expect(
      document.querySelector('[data-company-id="nvidia-robotics"]'),
    ).toBeNull();
    const tabbable = rows().filter((el) => el.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
  }, TIMEOUT);

  it('puts the roving stop on the highlighted row when the hash names one with an event', () => {
    render(<Timeline initial="figure-ai" />);
    const stop = rows().find((el) => el.tabIndex === 0);
    expect(
      stop?.closest('[data-timeline-id]')?.getAttribute('data-company-id'),
    ).toBe('figure-ai');
  }, TIMEOUT);

  it('recovers one tab stop when a filter removes the last-focused row', () => {
    // A reader focuses a row (the roving stop moves there), then a
    // filter change removes that company: the stale rovingStopId must
    // not win the fallback chain and strand the list with zero tab
    // stops. The stop falls back to the first rendered row, the same
    // guarantee the deep-link path already has.
    const view = render(<Timeline />);
    const figure = buttonOf('figure-ai');
    fireEvent.focus(figure);
    expect(
      rows().filter((el) => el.tabIndex === 0),
    ).toHaveLength(1);
    const cnOnly = COMPANIES.filter((c) => c.hq.country === 'CN');
    view.rerender(<Timeline companies={cnOnly} />);
    expect(
      document.querySelector('[data-company-id="figure-ai"]'),
    ).toBeNull();
    const tabbable = rows().filter((el) => el.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
  }, TIMEOUT);

  it('keeps click selection working and the native-button contract (VAL-MKT-016 regression)', () => {
    render(<Timeline />);
    // The rows are native <button> elements: Enter/Space activation is
    // the browser's built-in behavior (jsdom does not synthesize the
    // click from keydown), so the component test pins the native-button
    // contract (real tag, real type) and click activation; e2e proves
    // the actual Enter/Space key path.
    const figure = buttonOf('figure-ai');
    expect(figure.tagName).toBe('BUTTON');
    expect(figure.getAttribute('type')).toBe('button');
    // The row reads as the table row it is: date, company, round and
    // "amount at valuation".
    expect(figure).toHaveTextContent('16 Sep 2025');
    expect(figure).toHaveTextContent('Series C');
    // "$1B at $39B" until 2026-10-19: Figure's source says the round
    // "exceeds $1B", a floor, so the amount reads as not disclosed.
    expect(figure).toHaveTextContent('not disclosed at $39B');
    expect(figure.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(figure);
    // The row opens the company's details (MarketMap's sheet) and is marked.
    expect(figure.getAttribute('aria-expanded')).toBe('true');
    expect(figure.getAttribute('aria-controls')).toBe('market-map-company');
    expect(figure.closest('li')).toHaveClass('border-l-accent');
    fireEvent.click(figure);
    expect(figure.getAttribute('aria-expanded')).toBe('false');
    expect(firstEventId()).toBeTruthy();
  }, TIMEOUT);

  it('hands the company and the row to the selection callback', () => {
    const onSelect = vi.fn();
    render(<FundingTimeline companies={COMPANIES} selectedId={null} onSelect={onSelect} />);
    fireEvent.click(buttonOf('skild-ai'));
    expect(onSelect).toHaveBeenCalledWith('skild-ai', buttonOf('skild-ai'));
  }, TIMEOUT);

  it('plots every round, undisclosed amounts on their own lane', () => {
    // The open company takes the accent fill whatever its lane, so the
    // hollow-mark count below holds only when its own amount is disclosed.
    // Skild's $1.4B is; Figure's amount has not been since 2026-10-19.
    render(<Timeline initial="skild-ai" />);
    const plot = document.querySelector('svg[data-timeline-plot]');
    expect(plot).not.toBeNull();
    // The plot is for the eye; the list is its accessible equivalent.
    expect(plot!.getAttribute('aria-hidden')).toBe('true');
    const events = timelineEvents(COMPANIES);
    expect(events.find((event) => event.companyId === 'skild-ai')?.amountUsd).not.toBeNull();
    const marks = plot!.querySelectorAll('circle[pointer-events="none"]');
    expect(marks).toHaveLength(events.length);
    const undisclosed = events.filter((event) => event.amountUsd === null).length;
    expect(plot!.querySelectorAll('circle.fill-paper')).toHaveLength(undisclosed);
    expect(plot!.querySelectorAll('circle.fill-accent')).toHaveLength(1);
    expect(plot).toHaveTextContent('Undisclosed');
  }, TIMEOUT);
});
