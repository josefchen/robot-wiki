import { fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMPANIES } from '@/data/companies';
import { bubblePoints } from '@/lib/market-map';
import { BubbleView } from '@/components/market-map/bubble-view';

/**
 * The chart is controlled: the open company is the URL hash, owned by
 * MarketMap. This harness stands in for it, toggling like MarketMap does
 * (choosing the open company again closes it).
 */
function Chart({ initial = null }: { initial?: string | null }) {
  const [selectedId, setSelectedId] = useState<string | null>(initial);
  return (
    <BubbleView
      companies={COMPANIES}
      selectedId={selectedId}
      onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
    />
  );
}

function selectedOnChart() {
  return document.querySelector('svg[role="group"]')?.getAttribute('data-bubble-selected') ?? null;
}

function inkOf(id: string) {
  return document
    .querySelector(`circle[data-company-id="${id}"]`)
    ?.parentElement?.querySelector('[data-mark-ink]');
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

const TIMEOUT = 15_000;

function mark(id: string) {
  const el = document.querySelector(`circle[data-company-id="${id}"]`);
  if (!el) {
    throw new Error(`no mark for ${id}`);
  }
  return el as SVGElement & {
    focus: () => void;
    blur: () => void;
    tabIndex: number;
  };
}

function labelEl() {
  return document.querySelector('[data-bubble-label]');
}

function bubblePointsById() {
  return new Map(bubblePoints(COMPANIES).map((point) => [point.id, point]));
}

describe('BubbleView hover, focus, and roving keyboard access', () => {
  it('reveals name and plotted value on hover and clears on leave', async () => {
    const user = userEvent.setup();
    render(<Chart />);
    const figure = mark('figure-ai');
    await user.hover(figure);
    const label = labelEl();
    expect(label).not.toBeNull();
    expect(label).toHaveTextContent('Figure AI');
    expect(label).toHaveTextContent('$39B');
    await user.unhover(figure);
    expect(labelEl()).toBeNull();
  }, TIMEOUT);

  it('reveals the same label on keyboard focus (hover/focus parity)', () => {
    render(<Chart />);
    // Focus a mark directly: focus reveal must not depend on the tab order.
    fireEvent.focus(mark('physical-intelligence'));
    const label = labelEl();
    expect(label).not.toBeNull();
    expect(label).toHaveTextContent('Physical Intelligence');
    expect(label).toHaveTextContent('$5.6B');
    fireEvent.blur(mark('physical-intelligence'));
    expect(labelEl()).toBeNull();
  }, TIMEOUT);

  it('marks the chart a single tab stop with a roving tabindex', () => {
    const points = bubblePointsById();
    render(<Chart />);
    const focusable = COMPANIES.filter((company) =>
      points.has(company.id),
    ).map((company) => mark(company.id));
    // 36 of the 111 companies have both a founding year and a disclosed
    // valuation or total raised; all of them are plotted.
    // 38 -> 37 when the 2026-08-18 audit nulled unverifiable
    // amounts/valuations that previously plotted; 37 -> 36 when the
    // reconciliation sweep the same day nulled the-bot-company's founded
    // year (no fetched source states it; dyna-robotics precedent), which
    // removes the record from the founded-vs-funding plot. 36 -> 32 when
    // the 2026-08-18 figure-corrections pass nulled clone-robotics,
    // booster-robotics (totals; rounds carry no plottable figure),
    // leju-robotics and hanson-robotics (aggregator conflicts).
    // 32 -> 31 when the 2026-08-18 Mentee acquisition-status correction
    // nulled totalRaisedUsd (the $900M acquisition is not a funding
    // total; the March ~$21M round is snippet-grade only), so the row no
    // longer plots on founded-vs-totalRaised.
    // 31 -> 28 when the 2026-08-18 batch-3 re-verification nulled the
    // aggregator-only valuations on spirit-ai ($1.5B rests on no fetched
    // source; the company's own Feb 2026 release states $280M raised
    // across two rounds at >¥10B, no USD valuation), tars-robotics
    // ($1.9B appears in no fetched body; the real round is a $455M
    // Pre-A), galaxea-ai (Yicai's "$29B" is uncorroborated and the
    // $1.4B belonged to the February round) and agibot (the $1B/Series
    // B figure is humanoidindex-derived; the fetched round record is an
    // Aug 2025 strategic round with terms undisclosed). mind-robotics
    // entered the plotted set the same day (founded 2025 confirmed by
    // TechCrunch/TRR, so its fetched $3.4B valuation now plots).
    expect(focusable.length).toBe(28);
    const tabbable = focusable.filter((el) => el.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    const roving = focusable.filter((el) => el.tabIndex === -1);
    expect(roving).toHaveLength(focusable.length - 1);
  }, TIMEOUT);

  it('moves between marks spatially with the arrow keys', async () => {
    const user = userEvent.setup();
    const points = bubblePointsById();
    render(<Chart />);
    await user.tab();
    const active = () => document.activeElement?.getAttribute('data-company-id');
    expect(typeof active()).toBe('string');
    const from = active() as string;
    await user.keyboard('[ArrowRight]');
    const next = active();
    expect(typeof next).toBe('string');
    expect(next).not.toBe(from);

    // Arrow movement is spatial: the next mark's founded year is greater
    // (x maps founding year) or equal with a different id.
    const a = points.get(from)!;
    const b = points.get(next!)!;
    expect(b.founded).toBeGreaterThanOrEqual(a.founded);

    // Roving focus stays inside the chart: the label tracks the focused mark.
    const label = labelEl();
    expect(label).not.toBeNull();
    expect(label).toHaveTextContent(b.name);
  }, TIMEOUT);

  it('keeps Enter and Space selection working (VAL-MKT-023 regression)', () => {
    render(<Chart />);
    const figure = mark('figure-ai');
    // jsdom has no focus management, so key events are dispatched on the
    // mark itself; e2e proves the real keyboard path.
    fireEvent.keyDown(figure, { key: 'Enter' });
    expect(selectedOnChart()).toBe('figure-ai');
    expect(figure.getAttribute('aria-expanded')).toBe('true');
    expect(figure.getAttribute('aria-controls')).toBe('market-map-company');
    expect(inkOf('figure-ai')!.getAttribute('class')).toContain('fill-accent');
    fireEvent.keyDown(figure, { key: 'Enter' });
    expect(selectedOnChart()).toBeNull();
    expect(figure.getAttribute('aria-expanded')).toBe('false');

    const pi = mark('physical-intelligence');
    fireEvent.keyDown(pi, { key: ' ' });
    expect(selectedOnChart()).toBe('physical-intelligence');
  }, TIMEOUT);

  it('hands the opening mark to the selection callback', () => {
    const onSelect = vi.fn();
    render(<BubbleView companies={COMPANIES} selectedId={null} onSelect={onSelect} />);
    fireEvent.click(mark('skild-ai'));
    expect(onSelect).toHaveBeenCalledWith('skild-ai', mark('skild-ai'));
  }, TIMEOUT);

  it('draws a valuation filled and a total raised open, and says how many of each', () => {
    render(<Chart />);
    const inks = Array.from(document.querySelectorAll('[data-mark-ink]'));
    const filled = inks.filter((el) => el.getAttribute('data-mark-kind') === 'valuation');
    const open = inks.filter((el) => el.getAttribute('data-mark-kind') === 'totalRaised');
    expect(filled.length + open.length).toBe(28);
    expect(open.length).toBeGreaterThan(0);
    expect(filled.every((el) => el.getAttribute('class') === 'fill-graphite')).toBe(true);
    expect(open.every((el) => el.getAttribute('class') === 'fill-paper stroke-graphite')).toBe(true);
    expect(document.querySelector('figcaption')).toHaveTextContent(
      `28 of 111 companies plotted, ${filled.length} by valuation and ${open.length} by total raised.`,
    );
  }, TIMEOUT);
});

describe('BubbleView deep-link highlight parity', () => {
  it('marks the open company: accent mark and its label', () => {
    render(<Chart initial="figure-ai" />);
    const figure = mark('figure-ai');
    // The same treatment a click produces: the selected mark's decorative
    // dot grows to r=6 and takes the accent fill. The control circle
    // itself stays transparent — its geometry is the pointer target, the
    // dot is the chart ink.
    const figureInk = figure.parentElement?.querySelector('[data-mark-ink]');
    expect(figureInk).not.toBeNull();
    expect(figureInk!.getAttribute('class')).toContain('fill-accent');
    expect(figureInk!.getAttribute('r')).toBe('6');
    // With nothing hovered or focused, the label names the open company.
    expect(labelEl()).toHaveTextContent('Figure AI');
    expect(labelEl()).toHaveTextContent('$39B');
    // Other marks are not highlighted.
    const piInk = mark('physical-intelligence').parentElement?.querySelector(
      '[data-mark-ink]',
    );
    expect(piInk!.getAttribute('class')).not.toContain('fill-accent');
  }, TIMEOUT);

  it('puts the tab stop on the open company and follows a new selection', () => {
    const { rerender } = render(
      <BubbleView companies={COMPANIES} selectedId="figure-ai" onSelect={() => {}} />,
    );
    expect(mark('figure-ai').tabIndex).toBe(0);
    rerender(<BubbleView companies={COMPANIES} selectedId="skild-ai" onSelect={() => {}} />);
    expect(selectedOnChart()).toBe('skild-ai');
    expect(mark('skild-ai').tabIndex).toBe(0);
    expect(mark('figure-ai').tabIndex).toBe(-1);
  }, TIMEOUT);

  it('keeps exactly one tab stop when the hash names an unplotted company', () => {
    // Covariant has no disclosed valuation or total raised, so it is
    // never plotted; the hash must not strand the chart with no tab stop.
    render(<Chart initial="covariant" />);
    const tabbable = COMPANIES.filter(
      (company) => company.id !== 'covariant',
    )
      .map((company) => document.querySelector(`circle[data-company-id="${company.id}"]`))
      .filter((el) => el instanceof Element && (el as SVGElement).tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(document.querySelector('circle[data-company-id="covariant"]')).toBeNull();
  }, TIMEOUT);

  it('exposes the selected mark id on the chart root (plotted deep link)', () => {
    render(<Chart initial="figure-ai" />);
    const svg = document.querySelector('svg[role="group"]');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('data-bubble-selected')).toBe('figure-ai');
  }, TIMEOUT);

  it('leaves selection unset when the hash names an unplotted company', () => {
    // A hash naming an unplotted company (covariant: no disclosed
    // valuation or total raised) must not leave an inert selectedId
    // pointing at a mark that does not exist. No attribute on the chart
    // root, no label, and the roving fallback keeps exactly one tab stop.
    render(<Chart initial="covariant" />);
    const svg = document.querySelector('svg[role="group"]');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('data-bubble-selected')).toBeNull();
    expect(labelEl()).toBeNull();
    expect(
      document.querySelectorAll('circle[data-company-id][tabindex="0"]'),
    ).toHaveLength(1);
  }, TIMEOUT);
});

describe('BubbleView focus ring', () => {
  it('renders an explicit focus ring element around the focused mark', () => {
    render(<Chart />);
    const figure = mark('figure-ai');
    fireEvent.focus(figure);
    const svg = document.querySelector('svg[role="group"]');
    expect(svg).not.toBeNull();
    const ring = svg!.querySelector('circle[data-focus-ring]');
    expect(ring).not.toBeNull();
    expect(ring!.getAttribute('stroke')).toBe('var(--color-accent)');
    expect(figure.tabIndex).toBe(0);
  }, TIMEOUT);

  it('keeps the aria-label contract of the marks unchanged', () => {
    render(<Chart />);
    const figure = mark('figure-ai');
    expect(figure.getAttribute('role')).toBe('button');
    expect(figure.getAttribute('aria-label')).toBe(
      'Figure AI, founded 2022, valuation $39B',
    );
  }, TIMEOUT);

  it('keeps the last-focused mark as the tab stop after blur (roving tabindex)', () => {
    render(<Chart />);
    // physical-intelligence is the first plotted mark, so it holds the
    // tab stop before any interaction. Arrow right moves focus to a
    // different mark; blurring the chart must keep the stop there
    // (WAI-ARIA roving tabindex keeps the position on blur), not reset
    // to the highlighted/first mark.
    const first = mark('physical-intelligence');
    fireEvent.focus(first);
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    const activeId = document.activeElement?.getAttribute('data-company-id');
    expect(typeof activeId).toBe('string');
    expect(activeId).not.toBe('physical-intelligence');
    fireEvent.blur(document.activeElement as SVGElement);
    expect(first.tabIndex).toBe(-1);
    expect((document.activeElement ?? { tabIndex: -1 }) !== first).toBe(true);
    expect(mark(activeId as string).tabIndex).toBe(0);
    // The label clears with focus (hover/focus parity) even though the
    // roving stop stays put.
    expect(labelEl()).toBeNull();
  }, TIMEOUT);

  it('renders the focus ring outside the clip group so extreme marks are never clipped', () => {
    render(<Chart />);
    const svg = document.querySelector('svg[role="group"]');
    expect(svg).not.toBeNull();
    fireEvent.focus(mark('figure-ai'));
    const ring = svg!.querySelector('circle[data-focus-ring]');
    expect(ring).not.toBeNull();
    // The ring must not be a descendant of the clipped group: a mark at
    // the extreme top/bottom of the plot has its ring cut by the clip
    // rect there (measured baseline: anduril ring top 22.3 vs
    // clip top 24; k-scale-labs ring bottom 373.7 vs clip bottom 372 on
    // the full dataset).
    expect(ring!.closest('g[clip-path]')).toBeNull();
  }, TIMEOUT);
});
