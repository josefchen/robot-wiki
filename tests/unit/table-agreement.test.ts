import { describe, expect, it } from 'vitest';
import {
  cellNumericToken,
  cellTokenInReadout,
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
  it('parses prefixed and suffixed tick labels', () => {
    // /manipulation/vla-models/ renders "t=0 t=5 t=10 t=15"; the old
    // leading-digit-only parser yielded zero ticks there.
    expect(parseNumericToken('t=0')).toBe(0);
    expect(parseNumericToken('t=15')).toBe(15);
    // /manipulation/rl-finetuning/ renders "0 s 10 s ..."; only "0 s"
    // parsed before, collapsing the tick set to one.
    expect(parseNumericToken('0 s')).toBe(0);
    expect(parseNumericToken('40 s')).toBe(40);
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
  it('extracts ticks without any gridlines (hand-rolled SVGs)', () => {
    // /manipulation/bc-foundations/ draws no <line> gridlines; the old
    // gate dropped every tick and skipped all of them.
    const texts = [
      { content: 'accumulated deviation vs step', x: 56, y: 10 },
      { content: '1139', x: 48, y: 115 },
      { content: '2277', x: 48, y: 82 },
      { content: '3416', x: 48, y: 49 },
      { content: '4555', x: 48, y: 16 },
      { content: '0', x: 56, y: 162 },
      { content: '120', x: 340, y: 162 },
      { content: '240', x: 624, y: 162 },
    ];
    expect(extractXTicks(texts, [])).toEqual(['0', '120', '240']);
  });
  it('never mistakes the axis title for ticks', () => {
    // /rl-sim2real/parallel-sim-rl/: ticks at y=330, title "parallel
    // environments (log2)" at y=352. The old lowest-text anchor admitted
    // only the title.
    const texts = [
      { content: '1 min', x: 56, y: 319 },
      { content: '10 min', x: 56, y: 198 },
      { content: '64', x: 64, y: 330 },
      { content: '256', x: 204, y: 330 },
      { content: '1,024', x: 344, y: 330 },
      { content: '4,096', x: 484, y: 330 },
      { content: '16,384', x: 624, y: 330 },
      { content: 'parallel environments (log2)', x: 344, y: 352 },
    ];
    expect(extractXTicks(texts, [])).toEqual(['64', '256', '1,024', '4,096', '16,384']);
  });
  it('keeps end-anchored ticks by attr x, not bbox center', () => {
    // "16,384" is anchored end at the plot edge: attr x=624, bbox center
    // ~606. Grading by bbox centers drops it (measured pass=4 skip=23);
    // attr x keeps it.
    const texts = [
      { content: '0', x: 48, y: 330 },
      { content: '50', x: 340, y: 330 },
      { content: '100', x: 624, y: 330 },
      { content: 'steps', x: 624, y: 350 },
    ];
    expect(extractXTicks(texts, [48, 340, 624])).toEqual(['0', '50', '100']);
  });
  it('extracts prefixed and suffixed tick labels', () => {
    const tPrefix = [
      { content: 'Δx', x: 48, y: 28 },
      { content: 't=0', x: 56, y: 238 },
      { content: 't=5', x: 245, y: 238 },
      { content: 't=10', x: 434, y: 238 },
      { content: 't=15', x: 624, y: 238 },
    ];
    expect(extractXTicks(tPrefix, [])).toEqual(['t=0', 't=5', 't=10', 't=15']);
    const tSuffix = [
      { content: '0 s', x: 44, y: 200 },
      { content: '10 s', x: 210, y: 200 },
      { content: '20 s', x: 376, y: 200 },
      { content: '30 s', x: 542, y: 200 },
      { content: '40 s', x: 708, y: 200 },
    ];
    expect(extractXTicks(tSuffix, [])).toEqual(['0 s', '10 s', '20 s', '30 s', '40 s']);
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
      headers: ['model size'],
      rows: [{ label: '0.5B', cells: ['9.8 ms'] }, { label: '9.1B', cells: ['178 ms'] }],
      ticks: ['0', '40', '80', '120', '160', '200', '240', '280'],
      axisNote: ['time (ms)'],
    };
    expect(checkClauseA(snap).status).toBe('skip');
  });
  it('skips when the axis unit differs from the row quantity (ms vs tick index)', () => {
    // /manipulation/realtime-execution/ panel-synchronous: axis in ms,
    // table x in ticks (TICK_MS=20). Same variable, different unit the
    // gate cannot convert: honest non-comparable.
    const snap: ChartSnapshot = {
      route: '/manipulation/realtime-execution/',
      desc: '',
      headers: ['tick'],
      rows: [{ label: '0', cells: ['a'] }, { label: '29', cells: ['b'] }],
      ticks: ['0', '200', '400', '580'],
      axisNote: ['ms'],
    };
    expect(checkClauseA(snap).status).toBe('skip');
  });
  it('skips categorical rows against numeric ticks', () => {
    // /data-hardware/data-bottleneck/: rows are dataset names, ticks are
    // log decades. Non-comparable by population, not by coincidence.
    const snap: ChartSnapshot = {
      route: '/data-hardware/data-bottleneck/',
      desc: '',
      headers: ['dataset'],
      rows: [{ label: 'DROID', cells: ['350 h'] }, { label: 'GPT-3', cells: ['300B tokens'] }],
      ticks: ['10⁰', '10¹', '10²', '10³'],
      axisNote: ['demonstration hours (log)'],
    };
    expect(checkClauseA(snap).status).toBe('skip');
  });
  it('grades an off-grid table whose range excludes every tick: FAIL, not skip', () => {
    // The planted-defect shape from the live DOM mutation against
    // /rl-sim2real/sim2real-transfer/ chart 0: rows moved off-grid to
    // 0.55..0.95 against a rendered axis of 0.20..1.50. The old
    // shared-non-zero-tick comparability predicate returned
    // "non-comparable axis"; the quantity-based one grades and fails,
    // because comparability is a property of the axis, not of the sample
    // points landing on tick marks.
    const snap: ChartSnapshot = {
      route: '/rl-sim2real/sim2real-transfer/',
      desc: '',
      headers: ['mu'],
      rows: [
        { label: '0.55', cells: ['a'] },
        { label: '0.65', cells: ['b'] },
        { label: '0.75', cells: ['c'] },
        { label: '0.85', cells: ['d'] },
        { label: '0.95', cells: ['e'] },
      ],
      ticks: ['0.20', '0.50', '0.80', '1.10', '1.50'],
      axisNote: ['ground friction coefficient mu'],
    };
    const a = checkClauseA(snap);
    expect(a.status).toBe('fail');
    expect(a.detail).toContain('ticks span [0.2, 1.5]');
  });
  it('passes a same-quantity axis even when no tick equals any row', () => {
    // Same quantity (seconds on both sides), rows between the ticks: the
    // endpoint rule (rows inside the tick range) is what grades it, not a
    // numeric coincidence.
    const snap: ChartSnapshot = {
      route: '/x/',
      desc: '',
      headers: ['time (s)'],
      rows: [{ label: '0 s', cells: ['1'] }, { label: '40 s', cells: ['2'] }],
      ticks: ['0 s', '10 s', '20 s', '30 s', '40 s'],
    };
    expect(checkClauseA(snap).status).toBe('pass');
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

describe('clause (c) per-column binding', () => {
  // The 1M EgoScale row as rendered at the unfixed cap: the completion-fit
  // cell prints 1.00 while the readout carries 1.17. This is the red-phase
  // fixture for the cap repair.
  const readout1M =
    'horizon: 1M h loss: 0.0033 holds / 0.0150 plateau completion fit: 1.17 holds / 0.71 plateau, past 100%, which is impossible';

  it('grades each numeric column, so one matching cell cannot pass a contradicted row', () => {
    const lossCell = '0.0033 holds / 0.0150 plateau';
    const cappedCell = '1.00 holds / 0.71 plateau';
    expect(cellTokenInReadout(lossCell, readout1M)).toBe(true);
    // The loss cell matching must not carry the row: the completion-fit
    // cell is graded on its own and fails (readout says 1.17, not 1.00).
    expect(cellTokenInReadout(cappedCell, readout1M)).toBe(false);
    expect(cellTokenInReadout('1.17 holds / 0.71 plateau', readout1M)).toBe(true);
  });

  it('rejects integer-vs-fractional shape mismatches, so axis and horizon labels cannot satisfy a score', () => {
    // "1M h" and the "1k10k100k1M" tick cluster scrape as bare 1s; a
    // 2-decimal score must not match them inside the tolerance.
    const withIntLabelsOnly = 'horizon: 1M h ticks 1k 10k 100k 1M';
    expect(cellTokenInReadout('1.00 holds / 0.71 plateau', withIntLabelsOnly)).toBe(false);
  });

  it('requires equal decimal counts, so the legend R-squared cannot satisfy a capped score', () => {
    // The panel legend prints "R² = 0.9983", which rounds to 1.00 inside
    // the 2-decimal tolerance; it is a different quantity at a different
    // precision and must not carry the completion-fit cell.
    const withLegend = 'completion fit: 1.17 holds / 0.71 plateau completion fit (robot-wiki, R² = 0.9983)';
    expect(cellTokenInReadout('1.00 holds / 0.71 plateau', withLegend)).toBe(false);
    expect(cellTokenInReadout('1.17 holds / 0.71 plateau', withLegend)).toBe(true);
  });

  it('skips non-numeric cells and grades every "/" part', () => {
    expect(cellNumericToken('n/a')).toBeNull();
    expect(cellNumericToken('extrapolated, dashed')).toBeNull();
    expect(cellNumericToken('0.89 holds / 0.71 plateau')).toBe('0.89');
    // Both scenario parts must appear: 0.89 alone is not the whole cell.
    const readoutMissingPlateau = 'completion fit: 0.89 holds';
    expect(cellTokenInReadout('0.89 holds / 0.71 plateau', readoutMissingPlateau)).toBe(false);
  });
});
