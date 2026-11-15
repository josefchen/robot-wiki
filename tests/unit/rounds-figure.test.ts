import { describe, expect, it } from 'vitest';
import { LISTINGS, ROUNDS, ROUNDS_AS_OF, type FundingEvent } from '@/data/rounds';
import { SEGMENT_ORDER, formatUsd } from '@/lib/market-map';
import { CHART_DESCRIPTIONS } from '@/lib/chart-descriptions';
import { validateChartDescriptions } from '@/lib/chart-description-rules';
import { CAPTION_MAX_WORDS, HEADLINE_MAX_WORDS, words } from '@/lib/figure-system-paint';
import {
  amountUsd,
  closedRoundsInWindow,
  countsByStatus,
  monthUnconfirmedRounds,
  plotDate,
  reportedSourceCount,
  roundsInWindow,
  totalRaisedUsd,
} from '@/lib/rounds';
import {
  DOT_R,
  FLOOR_USD,
  LABEL_CAP,
  PHONE_MAX_WIDTH,
  RING_STROKE,
  amountIsCeiling,
  bySize,
  drawOrder,
  figurePlotDate,
  figureRounds,
  labelsText,
  leadingSegment,
  methodParagraphs,
  outrankingCeilings,
  roundsFigureCaption,
  roundsFigureDescription,
  roundsFigureFacts,
  roundsFigureHeadline,
  roundsFigureLayout,
  segmentTotals,
  textWidth,
  type Box,
  type RoundsFigureLayout,
  type Segment,
} from '@/lib/rounds-figure';

/*
 * The geometry below is written again here, independently of
 * lib/rounds-figure.ts, so a bug in the placement's own checks cannot
 * also hide in the test.
 */
const PAINTED = DOT_R + RING_STROKE / 2;

function overlap(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

function distanceToBox(x: number, y: number, b: Box): number {
  const dx = x < b.x0 ? b.x0 - x : x > b.x1 ? x - b.x1 : 0;
  const dy = y < b.y0 ? b.y0 - y : y > b.y1 ? y - b.y1 : 0;
  return Math.sqrt(dx * dx + dy * dy);
}

function distanceToSegment(x: number, y: number, s: Segment): number {
  const steps = 200;
  let best = Infinity;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    best = Math.min(best, Math.hypot(x - (s.x1 + t * (s.x2 - s.x1)), y - (s.y1 + t * (s.y2 - s.y1))));
  }
  return best;
}

function cross(a: Segment, b: Segment): boolean {
  const d = (a.x2 - a.x1) * (b.y2 - b.y1) - (a.y2 - a.y1) * (b.x2 - b.x1);
  if (d === 0) return false;
  const t = ((b.x1 - a.x1) * (b.y2 - b.y1) - (b.y1 - a.y1) * (b.x2 - b.x1)) / d;
  const u = ((b.x1 - a.x1) * (a.y2 - a.y1) - (b.y1 - a.y1) * (a.x2 - a.x1)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function segmentEntersBox(s: Segment, b: Box): boolean {
  const steps = 200;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    if (distanceToBox(s.x1 + t * (s.x2 - s.x1), s.y1 + t * (s.y2 - s.y1), b) === 0) return true;
  }
  return false;
}

/** Every rule a label must keep, as a list of broken ones (empty when clean). */
function labelProblems(layout: RoundsFigureLayout, dots = layout.dots): string[] {
  const problems: string[] = [];
  const axisText = [layout.title, ...layout.yTicks, ...layout.months];
  layout.labels.forEach((label, i) => {
    const { box } = label;
    if (box.x0 < 0 || box.x1 > layout.width || box.y0 < 0 || box.y1 > layout.plot.axisY) {
      problems.push(`${label.text} leaves the plot`);
    }
    for (const dot of dots) {
      if (distanceToBox(dot.cx, dot.cy, box) < PAINTED) problems.push(`${label.text} covers the dot of ${dot.round.key}`);
    }
    for (const text of axisText) {
      if (overlap(box, text.box)) problems.push(`${label.text} covers the axis label ${text.text}`);
    }
    layout.labels.forEach((other, j) => {
      if (j <= i) return;
      if (overlap(box, other.box)) problems.push(`${label.text} overlaps ${other.text}`);
      if (label.leader && other.leader && cross(label.leader, other.leader)) {
        problems.push(`the leaders of ${label.text} and ${other.text} cross`);
      }
    });
    layout.labels.forEach((other, j) => {
      if (j !== i && label.leader && segmentEntersBox(label.leader, other.box)) {
        problems.push(`the leader of ${label.text} runs through ${other.text}`);
      }
    });
    if (!label.leader) {
      const own = dots.find((d) => d.round.key === label.key)!;
      const ownDistance = distanceToBox(own.cx, own.cy, box);
      for (const dot of dots) {
        if (dot !== own && distanceToBox(dot.cx, dot.cy, box) < 2 * ownDistance) {
          problems.push(`${label.text} also reads as the label of ${dot.round.key}`);
        }
      }
    }
    if (label.leader) {
      for (const dot of dots) {
        if (dot.round.key === label.key) continue;
        if (distanceToSegment(dot.cx, dot.cy, label.leader) < PAINTED) {
          problems.push(`the leader of ${label.text} passes through the dot of ${dot.round.key}`);
        }
      }
      for (const text of axisText) {
        if (segmentEntersBox(label.leader, text.box)) problems.push(`the leader of ${label.text} crosses ${text.text}`);
      }
    }
  });
  return problems;
}

const LAYOUTS = {
  /** A 390 px phone: 342 px of page, 16 px frame padding, the stage widened by 12 px a side. */
  phone390: 332,
  phone: 390,
  /** A 1440 px screen: the chart column beside the segment list. */
  desktop1440: 886,
  desktop: 1200,
} as const;

describe('rounds figure: what is drawn', () => {
  const { drawn, undisclosed, belowFloor } = figureRounds();
  const inWindow = roundsInWindow();

  it('draws every round of the window once, apart from those with no amount or under the floor', () => {
    expect(drawn.length + undisclosed.length + belowFloor.length).toBe(inWindow.length);
    expect(new Set(drawn.map((r) => r.key)).size).toBe(drawn.length);
    for (const event of undisclosed) expect(amountUsd(event)).toBeNull();
  });

  it('applies the floor: rounds under USD 1M stay in the totals and are not drawn', () => {
    expect(FLOOR_USD).toBe(1_000_000);
    for (const r of drawn) expect(r.usd).toBeGreaterThanOrEqual(FLOOR_USD);
    expect(belowFloor.length).toBeGreaterThan(0);
    for (const event of belowFloor) expect(amountUsd(event)!).toBeLessThan(FLOOR_USD);
    const closedBelow = belowFloor.filter((e) => e.status === 'closed');
    const closedDrawn = drawn.filter((r) => r.status === 'closed').reduce((s, r) => s + r.usd, 0);
    const closedBelowUsd = closedBelow.reduce((s, e) => s + amountUsd(e)!, 0);
    expect(totalRaisedUsd()).toBeCloseTo(closedDrawn + closedBelowUsd, 0);
    const layout = roundsFigureLayout(LAYOUTS.desktop);
    expect(layout.yTicks[0].value).toBe(FLOOR_USD);
    expect(layout.yTicks[0].text).toBe(formatUsd(FLOOR_USD));
    expect(layout.yTicks[0].gridY).toBeCloseTo(layout.plot.axisY, 6);
    for (const dot of layout.dots) expect(dot.cy).toBeLessThanOrEqual(layout.plot.axisY);
  });

  it('keeps the floor at the edge: USD 1M is drawn, a dollar less is not', () => {
    const base = inWindow.find((e) => e.currency === 'USD' && typeof e.amount === 'number')!;
    const at = { ...base, key: 'at-floor', amount: FLOOR_USD };
    const under = { ...base, key: 'under-floor', amount: FLOOR_USD - 1 };
    const split = figureRounds([at, under]);
    expect(split.drawn.map((r) => r.key)).toEqual(['at-floor']);
    expect(split.belowFloor.map((e) => e.key)).toEqual(['under-floor']);
  });

  it('clamps a month-only row whose 15th falls after the as-of date to the as-of date', () => {
    const month = (date: string): Pick<FundingEvent, 'date' | 'datePrecision'> => ({ date, datePrecision: 'month' });
    expect(figurePlotDate(month('2026-11'), '2026-11-14')).toBe('2026-11-14');
    expect(figurePlotDate(month('2026-11'), '2026-11-15')).toBe('2026-11-15');
    expect(figurePlotDate(month('2026-10'), '2026-11-14')).toBe('2026-10-15');
    expect(figurePlotDate({ date: '2026-11-12', datePrecision: 'day' }, '2026-11-14')).toBe('2026-11-12');
    for (const r of drawn) expect(r.plotted <= ROUNDS_AS_OF).toBe(true);
    const clamped = drawn.filter((r) => r.clamped);
    const expected = inWindow.filter(
      (e) => e.datePrecision === 'month' && `${e.date}-15` > ROUNDS_AS_OF && (amountUsd(e) ?? 0) >= FLOOR_USD,
    );
    expect(clamped.map((r) => r.key).sort()).toEqual(expected.map((e) => e.key).sort());
    for (const r of clamped) expect(plotDate(inWindow.find((e) => e.key === r.key)!)).toBe(r.plotted);
    for (const r of clamped) expect(r.plotted).toBe(ROUNDS_AS_OF);
  });

  it('draws closed rounds solid and every other status hollow', () => {
    for (const r of drawn) expect(r.hollow).toBe(r.status !== 'closed');
    expect(drawn.some((r) => r.hollow)).toBe(true);
  });

  it('leaves out listings and the July rows dated only to the month', () => {
    const keys = new Set(drawn.map((r) => r.key));
    for (const listing of LISTINGS) expect(keys.has(listing.key)).toBe(false);
    const july = monthUnconfirmedRounds();
    expect(july.length).toBeGreaterThan(0);
    for (const row of july) expect(keys.has(row.key)).toBe(false);
  });
});

describe('rounds figure: labels', () => {
  const order = figureRounds().drawn.filter((r) => !r.ceiling).sort(bySize);

  it('reads a ceiling from a note that opens "Up to" and the stored amount, in its currency', () => {
    const usd = { amount: 700_000_000, currency: 'USD' as const };
    expect(amountIsCeiling({ ...usd, note: 'Up to USD 700M, per a newspaper.' })).toBe(true);
    expect(amountIsCeiling({ amount: 5_300_000_000, currency: 'USD', note: 'Up to USD 5.3B: more.' })).toBe(true);
    expect(amountIsCeiling({ ...usd, note: 'Up to USD 600M, per a newspaper.' })).toBe(false);
    expect(amountIsCeiling({ ...usd, note: 'Up to EUR 700M.' })).toBe(false);
    expect(amountIsCeiling({ ...usd, note: 'Up to about USD 700M.' })).toBe(false);
    expect(amountIsCeiling({ ...usd, note: 'Plus up to USD 700M on milestones.' })).toBe(false);
    expect(amountIsCeiling(usd)).toBe(false);
    expect(amountIsCeiling({ amount: 'not disclosed', currency: 'USD', note: 'Up to USD 700M.' })).toBe(false);
  });

  it('draws a ceiling at its amount, labels it "up to" and never places that label', () => {
    const drawn = figureRounds().drawn;
    const largest = [...drawn].sort(bySize)[0];
    const event = roundsInWindow().find((e) => e.key === largest.key)!;
    // Whole millions at or above the largest amount, so it stays the largest round.
    const amount = Math.ceil(largest.usd / 1e6) * 1e6;
    const marked = figureRounds([{ ...event, note: `Up to USD ${amount / 1e6}M, as reported.`, currency: 'USD', amount }]).drawn[0];
    expect(marked).toMatchObject({ ceiling: true, usd: amount, label: `${largest.company} up to ${formatUsd(amount)}` });
    // The only ceiling, so the sentence names it alone.
    const rounds = drawn.map((r) => (r.key === largest.key ? marked : { ...r, ceiling: false }));
    const reason = marked.reported ? 'its amount is a reported ceiling' : 'its amount is a ceiling';
    for (const width of Object.values(LAYOUTS)) {
      const layout = roundsFigureLayout(width, rounds);
      expect(layout.dots.some((d) => d.round.key === largest.key)).toBe(true);
      expect(layout.labels.some((l) => l.key === largest.key), String(width)).toBe(false);
      expect(layout.labels.length).toBeGreaterThan(0);
      expect(layout.firstUnplaced?.key).not.toBe(largest.key);
      expect(outrankingCeilings(layout).map((r) => r.key)).toContain(largest.key);
      expect(labelsText(layout)).toContain(
        `rounds other than ceilings are labeled with company and amount`,
      );
      expect(labelsText(layout)).toContain(
        `${largest.company} (up to ${formatUsd(amount)}) would rank among them but carries no label, because ${reason}.`,
      );
    }
  });

  it('says nothing of ceilings when no drawn round is one', () => {
    const rounds = figureRounds().drawn.map((r) => ({ ...r, ceiling: false }));
    const text = labelsText(roundsFigureLayout(LAYOUTS.desktop, rounds));
    expect(text).not.toContain('ceiling');
    expect(text).toMatch(/^At this width the \d+ largest rounds are labeled with company and amount/);
  });

  for (const [name, width] of Object.entries(LAYOUTS)) {
    it(`${name} (${width} px): labels every round above the smallest label but the ceilings, and names each such ceiling`, () => {
      const layout = roundsFigureLayout(width);
      const labeled = new Set(layout.labels.map((l) => l.key));
      const rounds = layout.dots.map((d) => d.round);
      const smallest = rounds.filter((r) => labeled.has(r.key)).sort(bySize).at(-1)!;
      const above = rounds.filter((r) => bySize(r, smallest) < 0);
      for (const r of above.filter((d) => !d.ceiling)) expect(labeled.has(r.key), r.key).toBe(true);
      const ceilings = above.filter((d) => d.ceiling);
      expect(outrankingCeilings(layout).map((r) => r.key)).toEqual(ceilings.map((r) => r.key));
      const text = labelsText(layout);
      expect(text).toContain(`the ${layout.labels.length} largest rounds`);
      for (const r of ceilings) expect(text).toContain(`${r.company} (up to ${formatUsd(r.usd)})`);
      if (ceilings.length > 0) expect(text).toMatch(/would rank among them but carr(y|ies) no label, because/);
    });
  }

  it('leaves every ceiling in the data unlabeled and prints no label amount bare', () => {
    const drawn = figureRounds().drawn;
    for (const r of drawn) {
      const event = roundsInWindow().find((e) => e.key === r.key)!;
      if (/^Up to /.test(event.note ?? '') && !event.amountIsApproximate) expect(r.ceiling, r.key).toBe(true);
    }
    for (const width of Object.values(LAYOUTS)) {
      const keys = new Set(roundsFigureLayout(width).labels.map((l) => l.key));
      for (const r of drawn.filter((d) => d.ceiling)) expect(keys.has(r.key), `${r.key} at ${width}`).toBe(false);
    }
  });

  for (const [name, width] of Object.entries(LAYOUTS)) {
    const layout = roundsFigureLayout(width);
    for (const segment of SEGMENT_ORDER) {
      it(`${name} (${width} px), ${segment} chosen: no label overlaps a label, a dot or an axis label, and no leader crosses`, () => {
        const dots = drawOrder(layout.dots, segment);
        expect(dots.filter((d) => d.round.segment === segment).length).toBe(
          layout.dots.filter((d) => d.round.segment === segment).length,
        );
        // The chosen segment draws last, so nothing covers its dots.
        const firstChosen = dots.findIndex((d) => d.round.segment === segment);
        if (firstChosen >= 0) expect(dots.slice(firstChosen).every((d) => d.round.segment === segment)).toBe(true);
        expect(labelProblems(layout, dots)).toEqual([]);
      });
    }

    it(`${name} (${width} px): labels the largest rounds in order up to the cap and names the first that did not fit`, () => {
      const cap = width < PHONE_MAX_WIDTH ? LABEL_CAP.phone : LABEL_CAP.desktop;
      expect(layout.cap).toBe(cap);
      expect(layout.labels.length).toBeGreaterThan(0);
      expect(layout.labels.length).toBeLessThanOrEqual(cap);
      expect(layout.labels.map((l) => l.key)).toEqual(order.slice(0, layout.labels.length).map((r) => r.key));
      if (layout.labels.length < cap) expect(layout.firstUnplaced?.key).toBe(order[layout.labels.length].key);
      else expect(layout.firstUnplaced).toBeNull();
    });
  }

  it('the checks themselves catch a label on a dot, overlapping labels and crossed leaders', () => {
    const layout = roundsFigureLayout(LAYOUTS.desktop);
    const [a, b] = layout.labels;
    const dotA = layout.dots.find((d) => d.round.key === a.key)!;
    const w = a.box.x1 - a.box.x0;
    const h = a.box.y1 - a.box.y0;
    const onDot = { ...a, box: { x0: dotA.cx - 2, y0: dotA.cy - h / 2, x1: dotA.cx - 2 + w, y1: dotA.cy + h / 2 } };
    expect(labelProblems({ ...layout, labels: [onDot, ...layout.labels.slice(1)] }).join()).toContain('covers the dot');
    expect(labelProblems({ ...layout, labels: [a, { ...b, box: a.box }] }).join()).toContain('overlaps');
    // Above its dot and running on over a neighbour at the same height.
    const gap = PAINTED + 3;
    const aboveA = { ...a, leader: null, box: { x0: dotA.cx - PAINTED, y0: dotA.cy - gap - h, x1: dotA.cx - PAINTED + w, y1: dotA.cy - gap } };
    const neighbour = { ...dotA, round: { ...dotA.round, key: 'neighbour' }, cx: dotA.cx + w / 2 };
    expect(
      labelProblems({ ...layout, dots: [dotA, neighbour], labels: [aboveA] }).join(),
    ).toContain('also reads as the label of neighbour');
    const x: Segment = { x1: 500, y1: 300, x2: 540, y2: 340 };
    const crossing = [
      { ...a, box: { x0: 0, y0: 0, x1: 1, y1: 1 }, leader: x },
      { ...b, box: { x0: 2, y0: 0, x1: 3, y1: 1 }, leader: { x1: 500, y1: 340, x2: 540, y2: 300 } },
    ];
    expect(labelProblems({ ...layout, dots: [], labels: crossing }).join()).toContain('cross');
  });

  it('stays clean at every width from 300 to 1240 px', () => {
    for (let width = 300; width <= 1240; width += 20) {
      expect({ width, problems: labelProblems(roundsFigureLayout(width)) }).toEqual({ width, problems: [] });
    }
  });

  it('places the same labels on every run', () => {
    expect(roundsFigureLayout(LAYOUTS.desktop1440).labels).toEqual(roundsFigureLayout(LAYOUTS.desktop1440).labels);
  });

  it('measures text with Geist advance widths', () => {
    // Summed advances of "Mach Industries $600M" in Geist at weight 400: 11,117 thousandths of an em.
    expect(textWidth('Mach Industries $600M', 12)).toBeCloseTo(133.404, 3);
    expect(textWidth('智', 12)).toBe(12);
  });
});

describe('rounds figure: words computed from the rows', () => {
  const facts = roundsFigureFacts();

  it('counts the window, the statuses, the reported sources and the rows left off', () => {
    const inWindow = roundsInWindow();
    const counts = countsByStatus(inWindow);
    expect(facts.inWindow).toBe(inWindow.length);
    expect(facts.closed).toBe(closedRoundsInWindow().length);
    expect(facts.reported).toBe(reportedSourceCount());
    expect(facts.hollowCount).toBe(inWindow.length - counts.closed);
    expect(facts.drawn + facts.undisclosed + facts.belowFloor.length).toBe(inWindow.length);
    expect(facts.monthOnly).toBe(figureRounds().drawn.filter((r) => r.monthOnly).length);
  });

  it('totals the six segments to the closed total', () => {
    const totals = segmentTotals();
    expect(totals.map((t) => t.segment)).toEqual([...SEGMENT_ORDER]);
    expect(totals.reduce((s, t) => s + t.usd, 0)).toBeCloseTo(totalRaisedUsd(), 0);
    expect(totals.reduce((s, t) => s + t.rounds, 0)).toBe(closedRoundsInWindow().length);
    expect(leadingSegment(totals).usd).toBe(Math.max(...totals.map((t) => t.usd)));
  });

  it('keeps the headline and the caption inside the frame limits', () => {
    expect(words(roundsFigureHeadline())).toBeLessThanOrEqual(HEADLINE_MAX_WORDS);
    expect(words(roundsFigureCaption(facts))).toBeLessThanOrEqual(CAPTION_MAX_WORDS);
    expect(roundsFigureCaption(facts)).toContain(`${facts.inWindow} rounds`);
    expect(roundsFigureCaption(facts)).toContain(`${facts.hollowCount} `);
  });

  it('states the label count, the floor and the clamp in the fold', () => {
    const layout = roundsFigureLayout(LAYOUTS.phone390);
    const text = methodParagraphs(facts, layout).join(' ');
    expect(text).toContain(`${layout.labels.length} largest rounds other than ceilings are labeled`);
    expect(text).toContain(`${facts.belowFloor.length} rounds under the ${formatUsd(FLOOR_USD)} floor`);
    expect(text).toContain(`${facts.monthOnly} rounds dated only to a month`);
    if (layout.firstUnplaced) expect(text).toContain(layout.firstUnplaced.label);
    expect(text).toContain(`${facts.reported} of them`);
    expect(text).toContain(labelsText(layout));
  });

  it('registers the computed description, which passes the chart-description rules', () => {
    const entry = CHART_DESCRIPTIONS.find((e) => e.component === 'RoundsFigure');
    expect(entry?.file).toBe('components/rounds/rounds-figure.tsx');
    expect(entry?.text).toBe(roundsFigureDescription(facts));
    expect(validateChartDescriptions([entry!])).toEqual([]);
  });

  it('every row reaches the figure through the window only', () => {
    const keys = new Set(roundsInWindow().map((e) => e.key));
    for (const r of figureRounds().drawn) expect(keys.has(r.key)).toBe(true);
    expect(ROUNDS.length).toBeGreaterThanOrEqual(keys.size);
  });
});
