import { fireEvent, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FrictionTransfer, HINT, OPENING_REAL_MU, TOUR, floorWords, readoutFor } from '@/components/interactive/friction-transfer';
import {
  ONE_FLOOR,
  SLOTS,
  carriageShift,
  crankTurns,
  gritGap,
  needleDegrees,
  practiceFloors,
  standsAt,
  xOf,
} from '@/components/iso/figures/floor-test-bed';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { DEFAULT_DR_RANGE, DR_RANGE_MAX, MU_MAX, MU_MIN, MU_TRAIN, drSuccess, pointSuccess } from '@/lib/sim2real';
import { widgetCitationRecords } from '@/lib/widget-citations';
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('FrictionTransfer');

const realFloor = () => screen.getByRole('slider', { name: /^Real floor/ });
const practiceRange = () => screen.getByRole('slider', { name: /^Range of practice floors/ });

describe('floor test bed model', () => {
  it('has a slot for every 0.05 of friction across the scale, the practice floor at the middle of the bed', () => {
    expect(SLOTS[0]).toBe(MU_MIN);
    expect(SLOTS[SLOTS.length - 1]).toBe(MU_MAX);
    expect(SLOTS).toHaveLength(27);
    expect(xOf(MU_TRAIN)).toBe(0);
    expect(xOf(MU_MAX)).toBeGreaterThan(xOf(MU_MIN));
  });

  it('racks one strip for the one-floor robot and a run either side of it for the many-floor robot', () => {
    expect(ONE_FLOOR).toEqual([MU_TRAIN]);
    const run = practiceFloors(DEFAULT_DR_RANGE);
    expect(run[0]).toBe(0.45);
    expect(run[run.length - 1]).toBe(1.15);
    expect(run).toHaveLength(15);
    expect(practiceFloors(0.1)).toEqual([0.7, 0.75, 0.8, 0.85, 0.9]);
    expect(practiceFloors(DR_RANGE_MAX)).toHaveLength(26);
  });

  it('packs grit closer on grippier floors', () => {
    expect(gritGap(MU_MAX)).toBeLessThan(gritGap(MU_TRAIN));
    expect(gritGap(MU_TRAIN)).toBeLessThan(gritGap(MU_MIN));
  });

  it('turns each dial from its left stop at no tries to its right stop at every try', () => {
    expect(needleDegrees(0)).toBe(-120);
    expect(needleDegrees(1)).toBe(120);
    expect(needleDegrees(0.5)).toBe(0);
  });

  it('opens a little more slippery than the practice floor, where the one-floor robot already falls', () => {
    expect(OPENING_REAL_MU).toBeLessThan(MU_TRAIN);
    expect(floorWords(OPENING_REAL_MU)).toBe('a bit more slippery');
    expect(Math.round(pointSuccess(OPENING_REAL_MU) * 100)).toBe(24);
    expect(Math.round(drSuccess(OPENING_REAL_MU, DEFAULT_DR_RANGE) * 100)).toBe(74);
  });

  it('stands a robot while at least half its tries end without a fall, and topples it below that', () => {
    expect(standsAt(0.5)).toBe(true);
    expect(standsAt(0.49)).toBe(false);
    const poses = (mu: number) => [standsAt(pointSuccess(mu)), standsAt(drSuccess(mu, DEFAULT_DR_RANGE))];
    expect(poses(0.8)).toEqual([true, true]);
    expect(poses(OPENING_REAL_MU)).toEqual([false, true]);
    expect(poses(1.1)).toEqual([false, true]);
    expect(poses(1.5)).toEqual([false, false]);
    expect(poses(0.2)).toEqual([false, false]);
  });

  it('tours the practice floor first, then floors on both sides, ending where it opened', () => {
    expect(TOUR[0]).toBe(MU_TRAIN);
    expect(TOUR.some((mu) => mu < MU_TRAIN - DEFAULT_DR_RANGE)).toBe(true);
    expect(TOUR.some((mu) => mu > MU_TRAIN + DEFAULT_DR_RANGE)).toBe(true);
    expect(TOUR[TOUR.length - 1]).toBe(OPENING_REAL_MU);
  });
});

describe('FrictionTransfer', () => {
  it('opens on a slightly slippery real floor: the one-floor robot at 24%, the many-floor robot at 74%', () => {
    const { container } = render(<FrictionTransfer />);
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('One-floor robot wins on its floor; many-floor robot copes widely');
    expect(container.querySelector('[data-readout]')).toHaveTextContent('Tries without a fall: one-floor robot 24%, many-floor robot 74%');
    expect(realFloor()).toHaveValue('65');
    expect(screen.getByTestId('real-floor-carriage').getAttribute('transform')).toBe(carriageShift(OPENING_REAL_MU));
    expect(screen.getByTestId('rack-one-floor')).toHaveAttribute('data-strips', '1');
    expect(screen.getByTestId('rack-many-floors')).toHaveAttribute('data-strips', '15');
    // The real floor plate is the one lit part, and the drawing carries no words.
    expect(container.querySelectorAll('.iso-solid[data-lit]')).toHaveLength(1);
    expect(container.querySelectorAll('svg text')).toHaveLength(0);
    // The back robot opens toppled and the front robot standing; only the shown pose is opaque.
    expect(screen.getByTestId('walker-back')).toHaveAttribute('data-pose', 'toppled');
    expect(screen.getByTestId('walker-front')).toHaveAttribute('data-pose', 'standing');
    expect(screen.getByTestId('walker-back').querySelector('[data-walker-pose="standing"]')).toHaveAttribute('opacity', '0');
    expect(screen.getByTestId('walker-back').querySelector('[data-walker-pose="toppled"]')).toHaveAttribute('opacity', '1');
    expect(screen.getByTestId('walker-front').querySelector('[data-walker-pose="standing"]')).toHaveAttribute('opacity', '1');
    // Both poses carry a dial reading the same share.
    expect(screen.getByTestId('dial-back-toppled').querySelector('[data-needle]')).toHaveAttribute('transform', `rotate(${needleDegrees(pointSuccess(OPENING_REAL_MU)).toFixed(1)})`);
    // Three lines under the drawing: the hint, the readout and the status note.
    expect(container.querySelector('[data-anatomy-hint]')).toHaveTextContent(HINT);
    expect(container.querySelector('[data-anatomy-keys]')).toBeNull();
    // Each dial's needle opens at its robot's share.
    expect(container.querySelector('[data-needle="back"]')).toHaveAttribute('transform', `rotate(${needleDegrees(pointSuccess(OPENING_REAL_MU)).toFixed(1)})`);
    expect(container.querySelector('[data-needle="front"]')).toHaveAttribute('transform', `rotate(${needleDegrees(drSuccess(OPENING_REAL_MU, DEFAULT_DR_RANGE)).toFixed(1)})`);
  });

  it('puts the one-floor robot ahead on its own practice floor', () => {
    const { container } = render(<FrictionTransfer />);
    fireEvent.change(realFloor(), { target: { value: '80' } });
    expect(screen.getByText('Real floor:').parentElement).toHaveTextContent('Real floor: same as the practice floor');
    expect(container.querySelector('[data-readout]')).toHaveTextContent(readoutFor(0.8, DEFAULT_DR_RANGE));
    expect(readoutFor(0.8, DEFAULT_DR_RANGE)).toBe('Tries without a fall: one-floor robot 97%, many-floor robot 74%');
    expect(screen.getByTestId('friction-note')).toHaveTextContent('On its own practice floor the one-floor robot does best');
    expect(screen.getByTestId('walker-back')).toHaveAttribute('data-pose', 'standing');
    expect(screen.getByTestId('walker-front')).toHaveAttribute('data-pose', 'standing');
    expect(screen.getByTestId('point-readout')).toHaveTextContent('97%');
    expect(screen.getByTestId('dr-readout')).toHaveTextContent('74%');
  });

  it('keeps the many-floor robot going off the practice floor until the plate leaves its strips', () => {
    const { container } = render(<FrictionTransfer />);
    fireEvent.change(realFloor(), { target: { value: '110' } });
    expect(container.querySelector('[data-readout]')).toHaveTextContent('one-floor robot 0%, many-floor robot 74%');
    expect(realFloor()).toHaveAttribute('aria-valuetext', expect.stringMatching(/^much grippier, friction 1\.10/));
    fireEvent.change(realFloor(), { target: { value: '150' } });
    expect(container.querySelector('[data-readout]')).toHaveTextContent('one-floor robot 0%, many-floor robot 0%');
    expect(screen.getByTestId('friction-note')).toHaveTextContent('Past every practice strip, both robots mostly fall');
    expect(screen.getByTestId('walker-front')).toHaveAttribute('data-pose', 'toppled');
  });

  it('widens the front rack from "Adjust more", and resets to the opening floor and rack', () => {
    const { container } = render(<FrictionTransfer />);
    fireEvent.change(practiceRange(), { target: { value: '65' } });
    expect(screen.getByTestId('rack-many-floors')).toHaveAttribute('data-strips', '26');
    expect(screen.getByTestId('dr-peak-label')).toHaveTextContent('57%');
    expect(container.querySelector('[data-readout]')).toHaveTextContent('many-floor robot 57%');
    fireEvent.change(realFloor(), { target: { value: '30' } });
    const fold = container.querySelector('details[data-figure-fold="adjust"]')!;
    const reset = [...fold.querySelectorAll('button')].filter((button) => button.textContent === 'Reset');
    expect(reset).toHaveLength(1);
    fireEvent.click(reset[0]);
    expect(realFloor()).toHaveValue('65');
    expect(practiceRange()).toHaveValue('35');
    expect(screen.getByTestId('rack-many-floors')).toHaveAttribute('data-strips', '15');
    expect(container.querySelector('[data-readout]')).toHaveTextContent(readoutFor(OPENING_REAL_MU, DEFAULT_DR_RANGE));
  });

  it('describes the drawing and the model in words, and links both sources', () => {
    render(<FrictionTransfer />);
    const img = screen.getByRole('img', { name: /A floor test bed/ });
    expect(img).toHaveAccessibleName(/back walker practiced on one floor strip, at 0\.80, lies toppled/);
    expect(img).toHaveAccessibleName(/front walker practiced on 15 strips, from 0\.45 to 1\.15, stands and its dial reads 74%/);
    const description = document.getElementById(img.getAttribute('aria-describedby') ?? '');
    expect(description).toHaveTextContent(/^Illustrative, not measured robot data\. With the real floor plate at friction 0\.65/);
    const links = screen.getByTestId('friction-sources').querySelectorAll('a');
    expect(links).toHaveLength(2);
    expect(crankTurns(MU_TRAIN)).toBe(0);
  });
});

describe('FrictionTransfer served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <CitationRecordsProvider records={widgetCitationRecords('FrictionTransfer')}>
      <FrictionTransfer />
    </CitationRecordsProvider>,
  )}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/sim2real-transfer/');
    expect(figures).toEqual(['friction-transfer']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
});
