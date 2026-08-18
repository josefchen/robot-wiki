import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { COMPANIES } from '@/data/companies';
import { timelineEvents } from '@/lib/market-map';
import { FundingTimeline } from '@/components/market-map/funding-timeline';

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
    render(<FundingTimeline companies={COMPANIES} />);
    const all = rows();
    // 73 of the 111 companies have a 2023-2026 dated round; all render.
    expect(all.length).toBe(73) // 69 dated 2023-2026 rounds since the 2026-08-18 audit (Mytra Series C, Coco Series B, Encord Series B);
    const tabbable = all.filter((el) => el.tabIndex === 0);
    const roving = all.filter((el) => el.tabIndex === -1);
    expect(tabbable).toHaveLength(1);
    expect(roving).toHaveLength(72); // 69 dated rows minus the one tabbable
  }, TIMEOUT);

  it('moves down to the next event chronologically with ArrowDown', () => {
    render(<FundingTimeline companies={COMPANIES} />);
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
    render(<FundingTimeline companies={COMPANIES} />);
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
    render(<FundingTimeline companies={COMPANIES} />);
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
    render(<FundingTimeline companies={COMPANIES} highlightedId="nvidia-robotics" />);
    expect(
      document.querySelector('[data-company-id="nvidia-robotics"]'),
    ).toBeNull();
    const tabbable = rows().filter((el) => el.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
  }, TIMEOUT);

  it('puts the roving stop on the highlighted row when the hash names one with an event', () => {
    render(<FundingTimeline companies={COMPANIES} highlightedId="figure-ai" />);
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
    const view = render(<FundingTimeline companies={COMPANIES} />);
    const figure = buttonOf('figure-ai');
    fireEvent.focus(figure);
    expect(
      rows().filter((el) => el.tabIndex === 0),
    ).toHaveLength(1);
    const cnOnly = COMPANIES.filter((c) => c.hq.country === 'CN');
    view.rerender(<FundingTimeline companies={cnOnly} />);
    expect(
      document.querySelector('[data-company-id="figure-ai"]'),
    ).toBeNull();
    const tabbable = rows().filter((el) => el.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
  }, TIMEOUT);

  it('keeps click selection working and the native-button contract (VAL-MKT-016 regression)', () => {
    render(<FundingTimeline companies={COMPANIES} />);
    // The rows are native <button> elements: Enter/Space activation is
    // the browser's built-in behavior (jsdom does not synthesize the
    // click from keydown), so the component test pins the native-button
    // contract (real tag, real type) and click activation; e2e proves
    // the actual Enter/Space key path.
    const figure = buttonOf('figure-ai');
    expect(figure.tagName).toBe('BUTTON');
    expect(figure.getAttribute('type')).toBe('button');
    fireEvent.click(figure);
    const detail = document.querySelector('[data-timeline-detail]');
    expect(detail).not.toBeNull();
    // EventDetail renders the fields; the row itself carries the name.
    expect(detail).toHaveTextContent('$1B');
    expect(detail).toHaveTextContent('$39B');
    fireEvent.click(figure);
    expect(document.querySelector('[data-timeline-detail]')).toBeNull();
    expect(firstEventId()).toBeTruthy();
  }, TIMEOUT);
});
