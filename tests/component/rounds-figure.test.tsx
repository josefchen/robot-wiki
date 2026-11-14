import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { RoundsFigure } from '@/components/rounds/rounds-figure';
import { CHART_DESCRIPTIONS } from '@/lib/chart-descriptions';
import { SEGMENT_ORDER } from '@/lib/market-map';
import {
  CHART_WIDTH,
  figureRounds,
  leadingSegment,
  methodParagraphs,
  readoutText,
  roundsFigureCaption,
  roundsFigureFacts,
  roundsFigureHeadline,
  roundsFigureLayout,
  segmentTotals,
} from '@/lib/rounds-figure';

afterEach(cleanup);

const DRAWN = figureRounds().drawn;
const TOTALS = segmentTotals();

function segmentButtons(): HTMLButtonElement[] {
  return [...document.querySelectorAll<HTMLButtonElement>('button[data-segment]')];
}

function chosenKeys(container: HTMLElement): string[] {
  return [...container.querySelectorAll('circle[data-chosen]')].map((c) => c.getAttribute('data-round')!).sort();
}

describe('RoundsFigure', () => {
  it('draws one dot per drawn round, hollow for the rounds not closed', () => {
    const { container } = render(<RoundsFigure />);
    const dots = container.querySelectorAll('circle[data-round]');
    expect(dots).toHaveLength(DRAWN.length);
    expect(container.querySelectorAll('circle[data-hollow]')).toHaveLength(DRAWN.filter((r) => r.hollow).length);
  });

  it('opens on the segment that drew the most, with its dots in the accent', () => {
    const { container } = render(<RoundsFigure />);
    const lead = leadingSegment();
    const pressed = segmentButtons().filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(pressed.map((b) => b.dataset.segment)).toEqual([lead.segment]);
    expect(chosenKeys(container)).toEqual(DRAWN.filter((r) => r.segment === lead.segment).map((r) => r.key).sort());
    expect(screen.getByTestId('rounds-figure-readout').textContent).toBe(readoutText(lead));
  });

  it('marks the chosen segment for each of the six', async () => {
    const user = userEvent.setup();
    const { container } = render(<RoundsFigure />);
    for (const segment of SEGMENT_ORDER) {
      await user.click(segmentButtons().find((b) => b.dataset.segment === segment)!);
      expect(chosenKeys(container)).toEqual(DRAWN.filter((r) => r.segment === segment).map((r) => r.key).sort());
      const total = TOTALS.find((t) => t.segment === segment)!;
      expect(screen.getByTestId('rounds-figure-readout').textContent).toBe(readoutText(total));
      expect(segmentButtons().filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    }
  });

  it('reaches and operates the segment list from the keyboard', async () => {
    const user = userEvent.setup();
    render(<RoundsFigure />);
    const buttons = segmentButtons();
    expect(buttons).toHaveLength(SEGMENT_ORDER.length);
    buttons[0].focus();
    for (const button of buttons.slice(1)) {
      await user.tab();
      expect(document.activeElement).toBe(button);
    }
    await user.keyboard('{Enter}');
    expect(buttons[buttons.length - 1].getAttribute('aria-pressed')).toBe('true');
    await user.tab({ shift: true });
    await user.keyboard(' ');
    expect(buttons[buttons.length - 2].getAttribute('aria-pressed')).toBe('true');
  });

  it('prints the headline, caption, fold and description computed from the rows', () => {
    const { container } = render(<RoundsFigure />);
    const facts = roundsFigureFacts();
    const layout = roundsFigureLayout(CHART_WIDTH.fallback);
    expect(container.querySelector('[data-figure-title]')?.textContent).toBe(roundsFigureHeadline());
    expect(container.querySelector('[data-figure-caption]')?.textContent).toBe(roundsFigureCaption(facts));
    const fold = container.querySelector('[data-figure-fold="method"]') as HTMLElement;
    for (const paragraph of methodParagraphs(facts, layout)) expect(within(fold).getByText(paragraph)).toBeTruthy();
    const registered = CHART_DESCRIPTIONS.find((e) => e.component === 'RoundsFigure')!.text;
    expect(container.querySelector('[data-chart-description]')?.textContent).toBe(registered);
    expect(container.querySelectorAll('[data-round-label]')).toHaveLength(layout.labels.length);
  });

  it('paints only token colours: no colour literal on any mark', () => {
    const { container } = render(<RoundsFigure />);
    for (const el of container.querySelectorAll('svg *, [data-segment] *')) {
      for (const attr of ['fill', 'stroke']) {
        const value = el.getAttribute(attr);
        if (value) expect(value).toMatch(/^var\(--/);
      }
      const background = (el as HTMLElement).style?.background;
      if (background) expect(background).toMatch(/^var\(--/);
    }
  });
});
