import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { ROUNDS, ReplayReuse, stillPose, usableBatches } from '@/components/interactive/replay-reuse';
import { CLEAR_S, HEAD_ANGLE, PLOW_ANGLE, STEP, TIMELINES, poseAt, readoutOf } from '@/components/iso/figures/replay-carousel';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('ReplayReuse');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<ReplayReuse />, { wrapper: Wrapper });
const originalMatchMedia = window.matchMedia;
function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

const angleOf = (u: [number, number, number]) => Math.atan2(u[1], u[0]);
const sameAngle = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 1e-6;
/** Which batches the head reads in round `k` (1-based), from the timeline: the cards under it at each dip. */
function readsInRound(learner: 'on' | 'off', k: number): number[] {
  const line = TIMELINES[learner];
  const feeds = line.segments.filter((s) => s.kind === 'feed');
  const from = feeds[k - 1]!.t0;
  const to = k < ROUNDS ? feeds[k]!.t0 : line.still + 1e-9;
  const reads = line.segments.filter((s) => s.kind === 'read' && s.t0 >= from && s.t0 < to);
  return reads.map((read) => {
    const mid = Math.min(line.still, (read.t0 + read.t1) / 2);
    const pose = poseAt(learner, mid);
    expect(pose.dip).toBeGreaterThan(0.6);
    const under = pose.cards.find((card) => !card.inBin && sameAngle(angleOf(card.place.u), HEAD_ANGLE) && Math.abs(card.place.o[2] - 20) < 1e-6);
    expect(under, `a card under the head at ${mid.toFixed(2)} s`).toBeDefined();
    return under!.k;
  });
}

describe('ReplayReuse model', () => {
  it('lets the on-policy update use only the newest batch and the off-policy update all of them', () => {
    expect(ROUNDS).toBe(6);
    expect([1, 3, 6].map((r) => usableBatches('on', r))).toEqual([1, 1, 1]);
    expect([1, 3, 6].map((r) => usableBatches('off', r))).toEqual([1, 3, 6]);
  });

  it('reads only the newest card each round with fresh experience, and every stored card again when reusing', () => {
    for (let k = 1; k <= ROUNDS; k++) {
      expect(readsInRound('on', k)).toEqual([k]);
      expect(readsInRound('off', k)).toEqual(Array.from({ length: k }, (_, i) => k - i));
    }
  });

  it('ends fresh-only with five cards in the bin and the sixth under the head', () => {
    const pose = stillPose('on');
    expect(pose.arrived).toBe(6);
    expect(pose.usable).toBe(1);
    expect(pose.dip).toBe(1);
    expect(pose.cards.filter((card) => card.inBin).map((card) => card.k)).toEqual([1, 2, 3, 4, 5]);
    const table = pose.cards.filter((card) => !card.inBin);
    expect(table.map((card) => card.k)).toEqual([6]);
    expect(sameAngle(angleOf(table[0]!.place.u), HEAD_ANGLE)).toBe(true);
    expect(readoutOf(pose)).toBe('Learns from 1 of 6 batches');
  });

  it('ends reusing with all six cards on the turntable, the oldest back under the head', () => {
    const pose = stillPose('off');
    expect(pose.usable).toBe(6);
    expect(pose.cards.every((card) => !card.inBin)).toBe(true);
    const angles = pose.cards.map((card) => angleOf(card.place.u));
    // Six cards in six different pockets, a sixth of a turn apart.
    for (let a = 0; a < angles.length; a++) for (let b = a + 1; b < angles.length; b++) expect(sameAngle(angles[a]!, angles[b]!)).toBe(false);
    for (const angle of angles) expect(sameAngle(Math.round((angle - HEAD_ANGLE) / STEP) * STEP + HEAD_ANGLE, angle)).toBe(true);
    expect(sameAngle(angleOf(pose.cards.find((card) => card.k === 1)!.place.u), HEAD_ANGLE)).toBe(true);
    expect(readoutOf(pose)).toBe('Learns from 6 of 6 batches');
  });

  it('sends a fresh-only card past the plow, down the chute and into the bin', () => {
    const line = TIMELINES.on;
    const eject = line.segments.find((s) => s.kind === 'eject')!;
    const at = poseAt('on', eject.t0);
    expect(sameAngle(angleOf(at.cards[0]!.place.u), PLOW_ANGLE)).toBe(true);
    const landed = poseAt('on', eject.t1);
    expect(landed.cards[0]!.inBin).toBe(true);
    expect(landed.cards[0]!.place.o[2]).toBeLessThan(5);
  });

  it('starts every run empty, while the run before is cleared away', () => {
    expect(poseAt('off', CLEAR_S / 2)).toEqual({ turn: 0, dip: 0, arrived: 0, usable: 0, cards: [] });
    expect(readoutOf({ arrived: 0, usable: 0 })).toBe('No batches collected yet');
  });
});

describe('ReplayReuse', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('On-policy and off-policy');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('Off-policy learners reuse experience; on-policy ones discard it');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      "A policy is the robot's learned rule for acting; on-policy training discards each batch after use, off-policy training keeps and reuses it.",
    );
  });

  it('opens on fresh experience after six rounds: five cards in the bin, one under the lit head', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('replay-stage')).toHaveAttribute('data-learner', 'on');
    expect(container.querySelector('[data-readout]')).toHaveTextContent('Learns from 1 of 6 batches');
    const shown = (slot: string) =>
      [...screen.getByTestId(slot).querySelectorAll('[data-card]')].filter((card) => card.getAttribute('display') !== 'none').map((card) => Number(card.getAttribute('data-card')));
    expect(shown('replay-bin-cards')).toEqual([1, 2, 3, 4, 5]);
    expect(shown('replay-table-cards')).toEqual([6]);
    expect(container.querySelectorAll('.iso-solid[data-lit]')).toHaveLength(1);
    expect(container.querySelectorAll('svg text')).toHaveLength(0);
  });

  it('jumps to the end of the six rounds under reduced motion, and raises the plow to keep every card', () => {
    mockReducedMotion(true);
    const { container } = renderFigure();
    const off = screen.getByTestId('replay-learner-off');
    fireEvent.click(off);
    expect(off).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('replay-stage')).toHaveAttribute('data-learner', 'off');
    expect(screen.getByTestId('replay-stage')).toHaveAttribute('data-usable', '6');
    expect(container.querySelector('[data-readout]')).toHaveTextContent('Learns from 6 of 6 batches');
    const onTable = [...screen.getByTestId('replay-table-cards').querySelectorAll('[data-card]')].filter((card) => card.getAttribute('display') !== 'none');
    expect(onTable).toHaveLength(6);
    expect(screen.getByTestId('replay-plow').getAttribute('transform')).not.toBe(stillPlow());
    fireEvent.click(screen.getByTestId('replay-learner-on'));
    expect(container.querySelector('[data-readout]')).toHaveTextContent('Learns from 1 of 6 batches');
    expect(screen.getByTestId('replay-plow').getAttribute('transform')).toBe(stillPlow());
  });

  it('resets from "Adjust more" to fresh experience', () => {
    mockReducedMotion(true);
    const { container } = renderFigure();
    fireEvent.click(screen.getByTestId('replay-learner-off'));
    const fold = container.querySelector('details[data-figure-fold="adjust"]')!;
    expect(fold.querySelector('summary')).toHaveTextContent('Adjust more');
    fireEvent.click([...fold.querySelectorAll('button')].find((button) => button.textContent === 'Reset')!);
    expect(screen.getByTestId('replay-learner-on')).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('[data-readout]')).toHaveTextContent('Learns from 1 of 6 batches');
  });

  it('describes the drawing and links both sources', () => {
    renderFigure();
    const drawing = screen.getByRole('img', { name: /A card reader/ });
    expect(document.getElementById(drawing.getAttribute('aria-describedby') ?? '')).toHaveTextContent('only the newest batch, 1 of 6');
    const links = [...screen.getByTestId('replay-source').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(records.map((r) => r.url));
  });
});

/** The plow's transform when it is down on the turntable. */
function stillPlow() {
  const { container } = render(<ReplayReuse />, { wrapper: Wrapper });
  const value = container.querySelector('[data-testid="replay-plow"]')!.getAttribute('transform');
  container.remove();
  return value;
}

describe('ReplayReuse served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<Wrapper><ReplayReuse /></Wrapper>)}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/rl-for-robotics/');
    expect(figures).toEqual(['replay-reuse']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
});
