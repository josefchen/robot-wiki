import { describe, expect, it } from 'vitest';
import {
  checkClauseA,
  checkClauseB,
  extractXTicks,
  inferSliderTransform,
  parseNumericToken,
  splitClauses,
  type ChartSnapshot,
} from '../e2e/helpers/table-agreement';

/**
 * Unit fixtures for the VAL-EDU-023 matcher. The EgoScale fixture is the
 * PRE-FIX table (fit-only completion column): clause (b) must fail it,
 * which is the red phase for the table repair. The six carve-out family
 * fixtures encode the two-branch rule: values cited at unsampled x are
 * recorded, never failed.
 */

const egoscalePreFix: ChartSnapshot = {
  route: '/frontier/generalization/',
  desc: 'Validation loss falls from 0.0240 at 1k hours to 0.0150 at 20k hours, the end of the measured range, while task completion rises from 0.30 to 0.71; past that boundary the dashed extrapolation to the 100k h horizon reads 0.0144 if the law holds against 0.0150 at the plateau, the shaded scenario band between them is a scenario bracket and not a confidence interval, the completion fit stays below the 90 percent solved bar until 111k hours, and it exceeds 100 percent past 250k hours, which the chart flags instead of drawing.',
  headers: ['pretraining hours', 'loss (MSE)', 'task completion', 'region'],
  rows: [
    { label: '1k h', cells: ['0.0240', '0.32', 'measured'] },
    { label: '4k h', cells: ['0.0212', '0.43', 'measured'] },
    { label: '10k h', cells: ['0.0174', '0.55', 'measured'] },
    { label: '20k h', cells: ['0.0150', '0.69', 'measured range ends'] },
    { label: '100k h', cells: ['0.0117 holds / 0.0150 plateau', '0.90 holds / 0.71 plateau', 'extrapolated, dashed'] },
    { label: '1M h', cells: ['0.0033 holds / 0.0150 plateau', '1.33 holds / 0.71 plateau', 'extrapolated, dashed'] },
  ],
  ticks: ['1k', '10k', '100k', '1M', '20k'],
};

const egoscaleFixed: ChartSnapshot = {
  ...egoscalePreFix,
  rows: [
    { label: '1k h', cells: ['0.0240', '0.30', '0.32', 'measured'] },
    { label: '4k h', cells: ['0.0212', '0.48', '0.43', 'measured'] },
    { label: '10k h', cells: ['0.0174', '0.57', '0.55', 'measured'] },
    { label: '20k h', cells: ['0.0150', '0.71', '0.69', 'measured range ends'] },
    { label: '100k h', cells: ['0.0117 holds / 0.0150 plateau', '0.90 holds / 0.71 plateau', 'extrapolated, dashed'] },
    { label: '1M h', cells: ['0.0033 holds / 0.0150 plateau', '1.33 holds / 0.71 plateau', 'extrapolated, dashed'] },
  ],
  headers: ['pretraining hours', 'loss (MSE)', 'reported', 'fit', 'region'],
};

describe('parseNumericToken', () => {
  it('parses prefixed labels and prose tokens', () => {
    expect(parseNumericToken('1k h')).toBe(1000);
    expect(parseNumericToken('4,096')).toBe(4096);
    expect(parseNumericToken('0.80')).toBe(0.8);
    expect(parseNumericToken('100-step')).toBe(100);
    expect(parseNumericToken('21.5%')).toBe(21.5);
    expect(parseNumericToken('DROID')).toBeNull();
    expect(parseNumericToken('T(T+1)/2')).toBeNull();
  });
});

describe('splitClauses', () => {
  it('splits at semicolons and sentence ends, keeping decimals', () => {
    const out = splitClauses('loss is 0.0240 at 1k. it falls; completion rises.');
    expect(out).toHaveLength(3);
    expect(out[0]).toContain('0.0240');
  });
});

describe('extractXTicks', () => {
  it('keeps only bottom-cluster texts on vertical lines', () => {
    const texts = [
      { content: 'validation loss', x: 56, y: 12 },
      { content: '0.005', x: 48, y: 100 },
      { content: '1k', x: 56, y: 290 },
      { content: '10k', x: 254, y: 290 },
      { content: 'measured range ends', x: 350, y: 36 },
    ];
    const ticks = extractXTicks(texts, [56, 254, 452, 560]);
    expect(ticks).toEqual(['1k', '10k']);
  });
});

describe('clause (a)', () => {
  it('passes exact endpoint match', () => {
    expect(checkClauseA(egoscalePreFix).status).toBe('pass');
  });
  it('skips non-comparable axes', () => {
    const snap: ChartSnapshot = {
      route: '/manipulation/realtime-execution/',
      desc: '',
      headers: ['model size', 'inference'],
      rows: [{ label: '0.5B', cells: ['9.8 ms'] }, { label: '9.1B', cells: ['178 ms'] }],
      ticks: ['0', '40', '80', '120', '160', '200', '240', '280'],
    };
    expect(checkClauseA(snap).status).toBe('skip');
  });
  it('wraps the cyclic 100% phase tick', () => {
    const snap: ChartSnapshot = {
      route: '/rl-sim2real/legged-locomotion/',
      desc: '',
      headers: ['cycle phase', 'feet down'],
      rows: [
        { label: '0%', cells: ['a'] },
        { label: '20%', cells: ['b'] },
        { label: '80%', cells: ['c'] },
      ],
      ticks: ['0%', '25%', '50%', '75%', '100%'],
    };
    expect(checkClauseA(snap).status).toBe('pass');
  });
  it('fails when a rendered tick lies outside the table range', () => {
    const snap: ChartSnapshot = {
      route: '/x/',
      desc: '',
      headers: ['t', 'v'],
      rows: [{ label: '0', cells: ['1'] }, { label: '10', cells: ['2'] }],
      ticks: ['0', '10', '20'],
    };
    expect(checkClauseA(snap).status).toBe('fail');
  });
});

describe('clause (b)', () => {
  it('fails the pre-fix EgoScale table: 0.30 at the sampled 1k row', () => {
    const { violations, records } = checkClauseB(egoscalePreFix);
    const hit = violations.filter((v) => v.includes('0.30') && v.includes('1k'));
    expect(hit.length).toBeGreaterThan(0);
    expect(records.some((r) => r.token === '0.71' && r.outcome.startsWith('mism'))).toBe(true);
  });
  it('passes the fixed EgoScale table with a reported column', () => {
    const { violations } = checkClauseB(egoscaleFixed);
    expect(violations).toEqual([]);
  });
  it('records unsampled tokens instead of failing them (two-branch rule)', () => {
    const snap: ChartSnapshot = {
      route: '/',
      desc: 'episode success is 21.5% at 30 steps and 0.6% at the 100-step end',
      headers: ['episode length', 'episode success'],
      rows: [
        { label: '0 steps', cells: ['100%'] },
        { label: '10 steps', cells: ['59.9%'] },
        { label: '25 steps', cells: ['27.7%'] },
        { label: '50 steps', cells: ['7.7%'] },
        { label: '75 steps', cells: ['2.1%'] },
        { label: '100 steps', cells: ['0.6%'] },
      ],
      ticks: ['0', '50', '100'],
    };
    const { violations, records } = checkClauseB(snap);
    expect(violations).toEqual([]);
    expect(records.some((r) => r.token === '21.5%' && r.outcome === 'unsampled')).toBe(true);
  });
  it('grades same-quantity comparisons, not any cell in the row', () => {
    // "0.0240 at 1k" must match the loss column, not some other column.
    const { records } = checkClauseB(egoscalePreFix);
    const lossRecord = records.find((r) => r.token === '0.0240');
    expect(lossRecord?.quantity).toContain('loss');
  });
  it('binds from-to pairs across clause x-mentions', () => {
    const snap: ChartSnapshot = {
      route: '/x/',
      desc: 'loss falls from 5.0 at step 0 to 1.0 at step 10',
      headers: ['t', 'loss'],
      rows: [{ label: '0', cells: ['5.0'] }, { label: '5', cells: ['2.2'] }, { label: '10', cells: ['1.5'] }],
      ticks: ['0', '5', '10'],
    };
    // 1.0 at the sampled t=10 row prints 1.5: a genuine divergence.
    const { violations } = checkClauseB(snap);
    expect(violations.some((v) => v.includes('1.0') && v.includes('10'))).toBe(true);
  });
});

describe('clause (c) slider inference', () => {
  it('infers the direct, percent-scale and log2 transforms', () => {
    expect(inferSliderTransform([0, 5, 10, 15], { label: 'step', min: 0, max: 15, step: 1, value: 7 })?.transform).toBe('direct');
    expect(inferSliderTransform([0.1, 0.35, 0.8], { label: 'phase', min: 10, max: 80, step: 5, value: 35 })?.transform).toBe('scale100');
    expect(inferSliderTransform([64, 256, 1024, 4096, 16384], { label: 'envs', min: 6, max: 14, step: 1, value: 12 })?.transform).toBe('log2');
    expect(inferSliderTransform([20000, 100000, 1000000], { label: 'h', min: 4301, max: 6000, step: 1, value: 5000 })?.transform).toBe('log10k');
  });
  it('returns null for a slider that does not set the table x', () => {
    expect(inferSliderTransform([0, 10, 15, 20, 30, 40, 50], { label: 'one-step error', min: 0.5, max: 6, step: 0.5, value: 2 })).toBeNull();
  });
});
