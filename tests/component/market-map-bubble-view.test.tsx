import { fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { COMPANIES } from '@/data/companies';
import { bubblePoints } from '@/lib/market-map';
import { BubbleView } from '@/components/market-map/bubble-view';

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

function detailEl() {
  return document.querySelector('[data-bubble-detail]');
}

function bubblePointsById() {
  return new Map(bubblePoints(COMPANIES).map((point) => [point.id, point]));
}

describe('BubbleView hover, focus, and roving keyboard access', () => {
  it('reveals name and plotted value on hover and clears on leave', async () => {
    const user = userEvent.setup();
    render(<BubbleView companies={COMPANIES} />);
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
    render(<BubbleView companies={COMPANIES} />);
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
    render(<BubbleView companies={COMPANIES} />);
    const focusable = COMPANIES.filter((company) =>
      points.has(company.id),
    ).map((company) => mark(company.id));
    // 38 of the 111 companies have both a founding year and a disclosed
    // valuation or total raised; all of them are plotted.
    expect(focusable.length).toBe(38); // 38 since the 2026-08-18 audit nulled unverifiable amounts/valuations that previously plotted
    const tabbable = focusable.filter((el) => el.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    const roving = focusable.filter((el) => el.tabIndex === -1);
    expect(roving).toHaveLength(focusable.length - 1);
  }, TIMEOUT);

  it('moves between marks spatially with the arrow keys', async () => {
    const user = userEvent.setup();
    const points = bubblePointsById();
    render(<BubbleView companies={COMPANIES} />);
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
    render(<BubbleView companies={COMPANIES} />);
    const figure = mark('figure-ai');
    // jsdom has no focus management, so key events are dispatched on the
    // mark itself; e2e proves the real keyboard path.
    fireEvent.keyDown(figure, { key: 'Enter' });
    expect(detailEl()).not.toBeNull();
    expect(detailEl()).toHaveTextContent('Figure AI');
    expect(detailEl()).toHaveTextContent('$39B');
    fireEvent.keyDown(figure, { key: 'Enter' });
    expect(detailEl()).toBeNull();

    const pi = mark('physical-intelligence');
    fireEvent.keyDown(pi, { key: ' ' });
    expect(detailEl()).not.toBeNull();
    expect(detailEl()).toHaveTextContent('Physical Intelligence');
  }, TIMEOUT);
});

describe('BubbleView deep-link highlight parity', () => {
  it('treats the hashed company as selected: accent mark plus detail panel', () => {
    render(<BubbleView companies={COMPANIES} highlightedId="figure-ai" />);
    const figure = mark('figure-ai');
    // The same treatment a click produces: accent fill, larger radius.
    expect(figure.getAttribute('class')).toContain('fill-accent');
    expect(figure.getAttribute('r')).toBe('6');
    const detail = detailEl();
    expect(detail).not.toBeNull();
    expect(detail).toHaveTextContent('Figure AI');
    expect(detail).toHaveTextContent('$39B');
    // Other marks are not highlighted.
    expect(mark('physical-intelligence').getAttribute('class')).not.toContain(
      'fill-accent',
    );
  }, TIMEOUT);

  it('keeps a manual selection after the highlight changes', () => {
    const { rerender } = render(
      <BubbleView companies={COMPANIES} highlightedId="figure-ai" />,
    );
    rerender(<BubbleView companies={COMPANIES} highlightedId={null} />);
    // The user selected Figure AI via the deep link; removing the hash id
    // must not silently deselect it.
    expect(detailEl()).not.toBeNull();
    expect(detailEl()).toHaveTextContent('Figure AI');
  }, TIMEOUT);

  it('keeps exactly one tab stop when the hash names an unplotted company', () => {
    // Covariant has no disclosed valuation or total raised, so it is
    // never plotted; the hash must not strand the chart with no tab stop.
    render(<BubbleView companies={COMPANIES} highlightedId="covariant" />);
    const tabbable = COMPANIES.filter(
      (company) => company.id !== 'covariant',
    )
      .map((company) => document.querySelector(`circle[data-company-id="${company.id}"]`))
      .filter((el) => el instanceof Element && (el as SVGElement).tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(document.querySelector('circle[data-company-id="covariant"]')).toBeNull();
  }, TIMEOUT);

  it('exposes the selected mark id on the chart root (plotted deep link)', () => {
    render(<BubbleView companies={COMPANIES} highlightedId="figure-ai" />);
    const svg = document.querySelector('svg[role="group"]');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('data-bubble-selected')).toBe('figure-ai');
  }, TIMEOUT);

  it('leaves selection unset when the hash names an unplotted company', () => {
    // A hash naming an unplotted company (covariant: no disclosed
    // valuation or total raised) must not leave an inert selectedId
    // pointing at a mark that does not exist. No attribute on the chart
    // root, no detail panel, and the roving fallback keeps exactly one
    // tab stop.
    render(<BubbleView companies={COMPANIES} highlightedId="covariant" />);
    const svg = document.querySelector('svg[role="group"]');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('data-bubble-selected')).toBeNull();
    expect(detailEl()).toBeNull();
    expect(
      document.querySelectorAll('circle[data-company-id][tabindex="0"]'),
    ).toHaveLength(1);
  }, TIMEOUT);
});

describe('BubbleView focus ring', () => {
  it('renders an explicit focus ring element around the focused mark', () => {
    render(<BubbleView companies={COMPANIES} />);
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
    render(<BubbleView companies={COMPANIES} />);
    const figure = mark('figure-ai');
    expect(figure.getAttribute('role')).toBe('button');
    expect(figure.getAttribute('aria-label')).toBe(
      'Figure AI, founded 2022, valuation $39B',
    );
  }, TIMEOUT);

  it('keeps the last-focused mark as the tab stop after blur (roving tabindex)', () => {
    render(<BubbleView companies={COMPANIES} />);
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
    render(<BubbleView companies={COMPANIES} />);
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
