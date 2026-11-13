import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  SOURCES,
  TrialTally,
  chanceWords,
  landedAt,
  readoutFor,
  runSeconds,
  LEGEND,
  noteFor,
  tallyOf,
} from '@/components/interactive/trial-tally';
import {
  BETTER_RATE,
  MAX_TRIALS,
  WORSE_RATE,
  binomial,
  chanceApart,
  chanceWorseTies,
  clopperPearson,
  overlapOf,
  passesOf,
  trialsOf,
} from '@/components/iso/figures/trial-tally-board';
import { getCitation } from '@/data/citations';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';

const tail = (n: number, p: number, from: number, to: number) => binomial(n, p).slice(from, to + 1).reduce((a, b) => a + b, 0);

describe('TrialTally model', () => {
  it('draws the same seeded trials every time, a run of 300 per policy', () => {
    expect(trialsOf(0, 'worse')).toEqual(trialsOf(0, 'worse'));
    expect(trialsOf(0, 'worse')).toHaveLength(MAX_TRIALS);
    expect(trialsOf(1, 'better')).not.toEqual(trialsOf(0, 'better'));
    // Over many runs the share of passes sits at the true rates.
    let worse = 0;
    let better = 0;
    for (let run = 0; run < 40; run++) {
      worse += passesOf(trialsOf(run, 'worse'), MAX_TRIALS);
      better += passesOf(trialsOf(run, 'better'), MAX_TRIALS);
    }
    expect(worse / (40 * MAX_TRIALS)).toBeCloseTo(WORSE_RATE, 1);
    expect(better / (40 * MAX_TRIALS)).toBeCloseTo(BETTER_RATE, 1);
  });

  it('opens on a run where ten trials cannot tell the two policies apart: 9 passes each', () => {
    expect(tallyOf(10, 0).passes).toEqual({ worse: 9, better: 9 });
  });

  it('gives the exact Clopper-Pearson interval: each end leaves a 2.5% tail', () => {
    for (const [k, n] of [[9, 10], [35, 50], [213, 300], [1, 10]] as const) {
      const [lo, hi] = clopperPearson(k, n);
      expect(tail(n, lo, k, n)).toBeCloseTo(0.025, 6);
      expect(tail(n, hi, 0, k)).toBeCloseTo(0.025, 6);
    }
    const [lo, hi] = clopperPearson(9, 10);
    expect(lo).toBeCloseTo(0.555, 3);
    expect(hi).toBeCloseTo(0.9975, 4);
    expect(clopperPearson(0, 10)[0]).toBe(0);
    expect(clopperPearson(10, 10)[1]).toBe(1);
    expect(clopperPearson(0, 0)).toEqual([0, 1]);
  });

  it('narrows the ranges as trials grow: wide overlap at 10, apart at 300', () => {
    const spread = (n: number) => {
      const [lo, hi] = clopperPearson(Math.round(WORSE_RATE * n), n);
      return hi - lo;
    };
    expect(spread(10)).toBeGreaterThan(0.5);
    expect(spread(300)).toBeLessThan(0.11);
    expect(tallyOf(10, 0).overlap).toBeGreaterThan(0.3);
    expect(overlapOf([0.2, 0.4], [0.5, 0.9])).toBe(0);
  });

  it('computes the chance the 70% policy ties or beats the 85% one, and that the ranges stand apart', () => {
    expect(chanceWorseTies(10)).toBeCloseTo(0.2909, 4);
    expect(chanceWorseTies(50)).toBeCloseTo(0.0439, 4);
    expect(chanceWorseTies(300)).toBeLessThan(1e-5);
    // Brute force over every pair of tallies agrees at 10 trials.
    const a = binomial(10, WORSE_RATE);
    const b = binomial(10, BETTER_RATE);
    let brute = 0;
    for (let i = 0; i <= 10; i++) for (let j = 0; j <= i; j++) brute += a[i]! * b[j]!;
    expect(chanceWorseTies(10)).toBeCloseTo(brute, 12);
    expect(chanceApart(10)).toBeCloseTo(0.0021, 4);
    expect(chanceApart(50)).toBeCloseTo(0.1139, 4);
    expect(chanceApart(300)).toBeCloseTo(0.944, 3);
  });

  it('says chances in plain words', () => {
    expect(chanceWords(0.2909)).toBe('29 runs in 100');
    expect(chanceWords(0.0021)).toBe('2 runs in 1,000');
    expect(chanceWords(4.9e-6)).toBe('5 runs in a million');
    expect(noteFor(10)).toBe('At 10 trials the 70% policy ties or beats the 85% policy in 29 runs in 100. Illustrative teaching pair.');
    expect(noteFor(300)).toBe('At 300 trials the 70% policy ties or beats the 85% policy in 5 runs in a million. Illustrative teaching pair.');
  });

  it('lands every tile by the end of a run', () => {
    expect(landedAt(0, 50)).toBe(0);
    expect(landedAt(runSeconds(50), 50)).toBe(50);
    expect(landedAt(runSeconds(300) / 2, 300)).toBeGreaterThan(100);
    expect(runSeconds(300)).toBeLessThan(2.5);
  });

  it('links the sources the article cites', () => {
    expect(getCitation(SOURCES.tri.id)?.url).toBe(SOURCES.tri.url);
    expect(getCitation(SOURCES.snyder.id)?.url).toBe(SOURCES.snyder.url);
  });
});

describe('TrialTally', () => {
  it('opens on 10 trials: the tallies, the overlap and one lit part', () => {
    const { container } = render(<TrialTally />);
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('Ten trials cannot rank a 70% and an 85% policy');
    expect(container.querySelector('[data-readout]')).toHaveTextContent(readoutFor(10, 0));
    expect(readoutFor(10, 0)).toMatch(/^70% policy: 9 of 10 pass · 85% policy: 9 of 10 pass · ranges overlap by \d+ points$/);
    expect(screen.getByTestId('tally-count-10')).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelectorAll('.iso-solid[data-lit]')).toHaveLength(1);
    expect(container.querySelectorAll('svg text')).toHaveLength(0);
    expect(container.querySelectorAll('[data-jaw]')).toHaveLength(4);
    expect(screen.getByTestId('tally-note')).toHaveTextContent(noteFor(10));
    expect(container.querySelector('[data-anatomy-keys]')).toHaveTextContent(LEGEND);
    // Three lines under the drawing: the legend, the readout and the note; no hint or story.
    const band = container.querySelector('[data-anatomy-stage]')!;
    expect(band.querySelector('[data-anatomy-hint]')?.textContent ?? '').toBe('');
    expect(band.textContent).not.toMatch(/boss/i);
  });

  it('sets 300 trials from the preset row: the ranges stand apart', () => {
    const { container } = render(<TrialTally />);
    fireEvent.click(screen.getByTestId('tally-count-300'));
    expect(screen.getByTestId('tally-count-300')).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('[data-readout]')).toHaveTextContent(readoutFor(300, 0));
    expect(readoutFor(300, 0)).toMatch(/of 300 pass/);
    expect(screen.getByTestId('tally-knob')).toHaveAttribute('data-count', '300');
    expect(screen.getByTestId('tally-note')).toHaveTextContent(noteFor(300));
  });

  it('runs the trials again: a new run with a new tally', () => {
    const { container } = render(<TrialTally />);
    const button = screen.getByTestId('tally-rerun');
    expect(button).toHaveTextContent('Run the trials again');
    fireEvent.click(button);
    expect(container.querySelector('[data-readout]')).toHaveTextContent(readoutFor(10, 1));
    expect(button).not.toHaveAttribute('aria-pressed');
  });

  it('resets from "Adjust more" to run 0 at 10 trials', () => {
    const { container } = render(<TrialTally />);
    fireEvent.click(screen.getByTestId('tally-count-50'));
    fireEvent.click(screen.getByTestId('tally-rerun'));
    const fold = container.querySelector('details[data-figure-fold="adjust"]')!;
    const reset = [...fold.querySelectorAll('button')].filter((button) => button.textContent === 'Reset');
    expect(reset).toHaveLength(1);
    fireEvent.click(reset[0]!);
    expect(screen.getByTestId('tally-count-10')).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('[data-readout]')).toHaveTextContent(readoutFor(10, 0));
  });

  it('describes the drawing with the method paragraph that names the interval', () => {
    render(<TrialTally />);
    const id = screen.getByRole('img', { name: /A trial tally board/ }).getAttribute('aria-describedby');
    const description = document.getElementById(id ?? '');
    expect(description).toHaveTextContent(/^The back row of tiles and the rule in front of it belong to the 70% policy/);
    expect(description).toHaveTextContent(/exact Clopper-Pearson 95% interval/);
    expect(description).toHaveTextContent(/stand apart in 2 runs in 1,000/);
  });
});

describe('TrialTally served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<TrialTally />)}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/data-hardware/evaluation-crisis/');
    expect(figures).toEqual(['trial-tally']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
});
