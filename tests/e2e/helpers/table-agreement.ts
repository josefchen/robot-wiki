/**
 * Pure logic for the VAL-EDU-023 spec (tests/e2e/chart-table-agreement.
 * spec.ts). Everything here is data-in / verdict-out so the binding and
 * matching rules are unit-testable against fixtures captured from the
 * rendered export (tests/unit/table-agreement.test.ts).
 *
 * Contract text being implemented (contract/educational-ux.md):
 * "(a) The first and last row of the table carry the endpoint x-values of
 * the plotted range, matching the first and last x-axis tick labels
 * rendered in the SVG, or lying inside them with no rendered tick outside
 * the table's range. (b) Wherever the description and the table both name
 * a value at the same x-value, the two agree to the precision printed in
 * the table ... Prose citing a raw measured value where the table prints
 * the fitted one at the same x-value is such a disagreement ... A
 * digit-bearing token whose x-value the table does not sample is not a
 * divergence by itself ... record that token as unsampled and carry on.
 * (c) On every chart whose primary control sets the x-value, setting that
 * control to the x-value of at least two sampled rows makes the
 * interactive's readout show that row's value, to the precision printed
 * in the table."
 *
 * Known blind spots (deliberate, kept narrow so the rules stay mechanical):
 * - Clause (b) only grades values the description grammatically ATTACHES
 *   to a sampled x ("y at x", "from y1 ... to y2" against the clause's
 *   x-mentions). A value stated with no attachment ("scores 0.35") is
 *   recorded unattached, not graded; the attachment grammar is what makes
 *   the comparison per-quantity and per-x rather than any-cell-in-table.
 * - Clause (a) is only graded where tick labels and row labels measure
 *   the same quantity, detected by a shared non-zero exact value (or a
 *   cyclic 0%-100% phase axis). Charts whose SVG x-axis is a different
 *   quantity from the table's row axis (latency ticks against a
 *   model-size table) are recorded non-comparable.
 */

export interface TableRow {
  label: string;
  cells: string[];
}

export interface ChartSnapshot {
  route: string;
  desc: string;
  /** Column headers, in order; headers[0] is the row-header column. */
  headers: string[];
  rows: TableRow[];
  /** X-axis tick labels extracted from the described SVG. */
  ticks: string[];
}

export interface SliderInfo {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

const SUFFIX_MULT: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };

/**
 * Leading-number parser for labels and prose tokens: "1k h" -> 1000,
 * "4,096" -> 4096, "0.80" -> 0.8, "100-step" -> 100 (x-mention use),
 * "21.5%" -> 21.5. Returns null when the string does not start with a
 * number ("DROID", "T(T+1)/2").
 */
/**
 * Parse a numeric token that may trail a unit word: "44% peak" as an
 * x-phrase is not needed here; this parses "3.6" from "3.6 h" style
 * labels only. Kept for prose x-phrases like "at 64 envs" where the unit
 * word follows the number on the row label too.
 */
export function parseNumericToken(raw: string): number | null {
  const s = raw.trim().replace(/,/g, '');
  const m = s.match(/^(-?\d+(?:\.\d+)?)([kKmMbB])?/);
  if (!m) return null;
  const mult = m[2] ? SUFFIX_MULT[m[2].toLowerCase()] : 1;
  return parseFloat(m[1]) * mult;
}

/** Decimal places of a numeric token, for printed-precision tolerance. */
export function tokenDecimals(raw: string): number {
  const m = raw.match(/(\d+(?:\.(\d+))?)/);
  return m?.[2] ? m[2].length : 0;
}

/** All numbers appearing anywhere in a cell string. */
export function numbersIn(text: string): number[] {
  return (text.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

/**
 * First numeric token (raw text) of a "/"-separated cell part. Clause (c)
 * grades a table column against the readout per part, because a cell of
 * the form "0.89 holds / 0.71 plateau" carries one number per scenario
 * and the readout must show both.
 */
function firstNumberToken(part: string): string | null {
  return part.match(/-?\d+(?:\.\d+)?/)?.[0] ?? null;
}

/**
 * The first numeric token of a cell, or null when the cell prints no
 * number ("n/a", "extrapolated, dashed"). Such columns are ungraded by
 * clause (c): there is no printed value to bind to the readout.
 */
export function cellNumericToken(cell: string): string | null {
  for (const part of cell.split('/')) {
    const t = firstNumberToken(part);
    if (t != null) return t;
  }
  return null;
}

/**
 * Clause (c) per-quantity match: every numeric token of the cell must
 * appear in the readout printed at the SAME precision as the cell. Two
 * shape guards, both learned from the capped EgoScale 1M cell, which
 * shipped green twice. First, integer-to-fractional pairs are rejected:
 * a dimensionless score ("1.00") can never match a bare integer ("1")
 * scraped from "1M h" or the "1k10k100k1M" tick cluster, which a pure
 * tolerance would accept inside 0.005. Second, the decimal COUNT must
 * match: "1.00" must not match "0.9983" (the legend's R-squared), which
 * rounds to 1.00 inside the 2-decimal tolerance but is a different
 * quantity printed at a different precision. A readout shows the row's
 * value to the precision printed in the table when it prints that value
 * at that precision.
 */
export function cellTokenInReadout(cell: string, readout: string): boolean {
  const decimalsOf = (t: string) => (t.split('.')[1] ?? '').length;
  const readoutTokens = readout.match(/-?\d+(?:\.\d+)?/g) ?? [];
  return cell.split('/').every((part) => {
    const raw = firstNumberToken(part);
    if (raw == null) return true; // non-numeric part: nothing to grade
    const value = Number(raw);
    const tol = 0.5 * 10 ** -decimalsOf(raw) + 1e-9;
    const places = decimalsOf(raw);
    return readoutTokens.some(
      (rt) =>
        decimalsOf(rt) === places && Math.abs(Number(rt) - value) <= tol,
    );
  });
}

/**
 * X-axis tick labels: digit-bearing SVG texts in the bottom label cluster
 * whose x coordinate matches a vertical gridline/tick line. The line match
 * is what excludes y-axis labels (they sit left of the plot, on no
 * vertical line) and in-plot annotations.
 */
export function extractXTicks(
  texts: Array<{ content: string; x: number; y: number }>,
  verticalLineXs: number[],
): string[] {
  const digit = texts.filter((t) => /\d/.test(t.content));
  if (digit.length === 0) return [];
  const maxY = Math.max(...digit.map((t) => t.y));
  const bottom = digit.filter((t) => t.y >= maxY - 14);
  return bottom
    .filter((t) => verticalLineXs.some((lx) => Math.abs(lx - t.x) <= 2.5))
    .map((t) => t.content);
}

/* ------------------------------------------------------------------ */
/* Clause (a): endpoint agreement with the rendered tick labels.       */
/* ------------------------------------------------------------------ */

export interface ClauseAResult {
  status: 'pass' | 'skip' | 'fail';
  detail: string;
}

export function checkClauseA(chart: ChartSnapshot): ClauseAResult {
  const rowXs = chart.rows.map((r) => parseNumericToken(r.label));
  const tickNums = chart.ticks
    .map((t) => parseNumericToken(t))
    .filter((n): n is number => n != null);
  const numericRows = chart.rows.filter((_, i) => rowXs[i] != null);
  const cyclic =
    chart.ticks.some((t) => t.trim() === '0%') &&
    chart.ticks.some((t) => t.trim() === '100%') &&
    chart.rows.every((r) => r.label.trim().endsWith('%'));
  const sharedNonZero = tickNums.some(
    (t) => t !== 0 && rowXs.some((r) => r != null && r === t),
  );
  void sharedNonZero;
  if (numericRows.length < 2 || tickNums.length < 2 || !(sharedNonZero || cyclic)) {
    return {
      status: 'skip',
      detail: `non-comparable axis (rows x=${rowXs.join(',')} ticks=${tickNums.join(',')})`,
    };
  }
  const xs = rowXs.filter((x): x is number => x != null);
  const first = xs[0];
  const last = xs[xs.length - 1];
  // On a cyclic phase axis the closing 100% tick labels the same phase as
  // the 0% first row, so it is wrapped to 0 for the range check.
  const ticks = cyclic ? tickNums.map((t) => (t === Math.max(...tickNums) && t > last ? first : t)) : tickNums;
  const tmin = Math.min(...ticks);
  const tmax = Math.max(...ticks);
  const eps = 1e-9;
  const exact = Math.abs(first - tmin) < eps && Math.abs(last - tmax) < eps;
  const inside = tmin >= first - eps && tmax <= last + eps;
  if (exact || inside) {
    return { status: 'pass', detail: `rows [${first},${last}] ticks [${tmin},${tmax}]` };
  }
  return {
    status: 'fail',
    detail: `table spans [${first}, ${last}] but ticks span [${tmin}, ${tmax}]`,
  };
}

/* ------------------------------------------------------------------ */
/* Clause (b): description tokens vs the table, per quantity, at       */
/* sampled x-values only (two-branch rule).                            */
/* ------------------------------------------------------------------ */

const SKIP_WORDS = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'from', 'by', 'and',
  'with', 'over', 'under', 'near', 'past', 'until', 'after', 'current',
  's', 'ms', 'hz', 'is', 'are', 'stays', 'sits', 'reads', 'falls',
  'rises', 'versus', 'vs', 'while', 'that', 'this', 'it', 'its',
]);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** A numeric word that can serve as a y-value: not a hyphenated modifier. */
function isYToken(word: string): boolean {
  return /^-?\d[\d.,%]*$/.test(word.replace(/^[-(]+|[-).,:;]+$/g, '')) ||
    (/^-?\d/.test(word) && !/^[-\d.,]+$/.test(word) && !/^ -?\d[\d.,]*-/.test(word) &&
      !/\d-/.test(word) && /-?\d+(\.\d+)?%?[.,;)]?$/.test(word));
}

export interface ClauseBRecord {
  token: string;
  row: string;
  quantity: string | null;
  outcome: 'match' | 'mismatch' | 'unsampled' | 'unattached';
}

export interface ClauseBResult {
  violations: string[];
  records: ClauseBRecord[];
}

interface XMission {
  rowIdx: number;
  wordIdx: number;
  x: number;
}

/**
 * Split into clauses at semicolons and sentence ends (decimal points are
 * preserved: a period only ends a sentence when followed by whitespace).
 */
export function splitClauses(desc: string): string[] {
  return desc
    .split(/;|\.(?=\s)/)
    .map((c) => c.trim())
    .filter(Boolean);
}

export function checkClauseB(chart: ChartSnapshot): ClauseBResult {
  const violations: string[] = [];
  const records: ClauseBRecord[] = [];
  const rowXs = chart.rows.map((r) => parseNumericToken(r.label));

  for (const clause of splitClauses(chart.desc)) {
    const w = words(clause);

    // from-to y positions first: their tokens are VALUES, not x-mentions,
    // so they must not enter the x-mention set (otherwise "from 5.0 at
    // step 0" reads 5.0 as an x of a coincidental row).
    const fromToPairs: Array<{
      y1: { word: string; idx: number };
      y2: { word: string; idx: number };
    }> = [];
    const yWordIdx = new Set<number>();
    for (let i = 0; i < w.length; i += 1) {
      if (w[i] !== 'from') continue;
      let y1: { word: string; idx: number } | null = null;
      for (let j = i + 1; j <= Math.min(i + 4, w.length - 1) && !y1; j += 1) {
        if (isYToken(w[j])) y1 = { word: w[j], idx: j };
      }
      if (!y1) continue;
      let y2: { word: string; idx: number } | null = null;
      let toIdx = -1;
      for (let j = y1.idx + 1; j < w.length; j += 1) {
        if (w[j] === 'to') toIdx = j;
        if (toIdx >= 0 && j > toIdx && isYToken(w[j])) {
          if (parseNumericToken(w[j]) != null) y2 = { word: w[j], idx: j };
          break;
        }
      }
      if (!y2) continue;
      if (parseNumericToken(y1.word) == null || parseNumericToken(y2.word) == null) continue;
      fromToPairs.push({ y1, y2 });
      yWordIdx.add(y1.idx);
      yWordIdx.add(y2.idx);
    }

    // x-mentions: words parsing to a sampled row x (hyphenated forms like
    // "100-step" still locate the x), excluding from-to value tokens.
    const xs: XMission[] = [];
    w.forEach((word, i) => {
      if (yWordIdx.has(i)) return;
      const n = parseNumericToken(word);
      if (n == null) return;
      const idx = rowXs.findIndex((r) => r != null && r === n);
      if (idx >= 0 && !xs.some((m) => m.rowIdx === idx)) xs.push({ rowIdx: idx, wordIdx: i, x: n });
    });
    if (xs.length === 0) continue;
    const sampleSet = new Set(xs.map((m) => m.rowIdx));
    void sampleSet;

    const match = (
      yWord: string,
      y: number,
      rowIdx: number,
    ): { ok: boolean; quantity: string | null } => {
      // Per-quantity: look for the column whose header words appear in the
      // 8 words preceding the value; fall back to every column only when
      // no header word is found nearby.
      let pos = -1;
      for (let i = 0; i < w.length; i += 1) {
        if (new RegExp(`^${yWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(w[i])) {
          pos = i;
          break;
        }
      }
      const windowStart = Math.max(0, (pos >= 0 ? pos : 0) - 8);
      const window = w.slice(windowStart, pos >= 0 ? pos : 0).join(' ');
      const targetCols: number[] = [];
      chart.headers.forEach((h, ci) => {
        if (ci === 0) return; // row-header column is the x, not a quantity
        const key = words(h).filter((word) => word.length > 3 && !SKIP_WORDS.has(word));
        if (key.some((word) => window.includes(word))) targetCols.push(ci);
      });
      const cols = targetCols.length
        ? targetCols
        : chart.headers.map((_, ci) => ci).filter((ci) => ci > 0);
      const tol = 0.5 * 10 ** -tokenDecimals(yWord) + 1e-9;
      let ok = false;
      for (const ci of cols) {
        const cell = chart.rows[rowIdx].cells[ci - 1];
        if (cell != null && numbersIn(cell).some((n) => Math.abs(n - y) <= tol)) ok = true;
      }
      return { ok, quantity: targetCols.map((ci) => chart.headers[ci]).join('|') || null };
    };

    const grade = (yWord: string, y: number, rowIdx: number) => {
      const { ok, quantity } = match(yWord, y, rowIdx);
      records.push({
        token: yWord,
        row: chart.rows[rowIdx].label,
        quantity,
        outcome: ok ? 'match' : 'mismatch',
      });
      if (!ok) {
        violations.push(
          `description says ${yWord} at sampled row "${chart.rows[rowIdx].label}" (quantity ${quantity ?? 'any'}) but the row prints [${chart.rows[rowIdx].cells.join(' | ')}]`,
        );
      }
    };

    // Explicit attachment: "y ... at [the] [current] X". An x-phrase the
    // tokenizer cannot bind (unit words, "k =", superscript exponents)
    // makes the attachment UNBINDABLE, so the graded value above is
    // re-checked as if attached to every x-mention of the clause only
    // when it matches all of them, and otherwise not graded at all.
    for (let i = 0; i < w.length; i += 1) {
      if (w[i] !== 'at') continue;
      let xMis: XMission | null = null;
      let bindable = true;
      for (let j = i + 1; j <= Math.min(i + 4, w.length - 1); j += 1) {
        const n = parseNumericToken(w[j]);
        if (n == null) {
          if (SKIP_WORDS.has(w[j]) || /^[=+-]$/.test(w[j])) continue;
          bindable = false;
          break;
        }
        const idx = rowXs.findIndex((r) => r != null && r === n);
        if (idx >= 0) xMis = xs.find((m) => m.rowIdx === idx) ?? null;
        break;
      }
      if (!bindable) {
        // "44% peak at k = 100": the value's x-phrase could not be bound
        // to a row, so grade it only against x-mentions of the clause if
        // it agrees with ALL of them (a correct shared endpoint), never
        // partially (which would grade the wrong pair).
        const y = i >= 2 ? parseNumericToken(w[i - 2]) : null;
        if (y != null && xs.length > 0) {
          const results = xs.map((m) => numbersIn(chart.rows[m.rowIdx].cells.join(' ')).some((n) => Math.abs(n - y) <= 0.5 * 10 ** -tokenDecimals(w[i - 2]) + 1e-9));
          if (results.every(Boolean)) {
            records.push({ token: w[i - 2], row: xs.map((m) => chart.rows[m.rowIdx].label).join(','), quantity: null, outcome: 'match' });
          } else {
            records.push({ token: w[i - 2], row: '', quantity: null, outcome: 'unattached' });
          }
        }
        continue;
      }
      if (!xMis) continue;
      for (let j = i - 1; j >= Math.max(0, i - 3); j -= 1) {
        const raw = w[j];
        if (!isYToken(raw)) {
          if (SKIP_WORDS.has(raw)) continue;
          break;
        }
        const y = parseNumericToken(raw);
        if (y == null || y === xMis.x) break;
        grade(raw, y, xMis.rowIdx);
        break;
      }
    }

    // From-to pairing: "from y1 ... to y2". With exactly two x-mentions in
    // the clause the pair binds in order (y1 to the first x, y2 to the
    // second); with more, each y binds its nearest x-mention.
    // Local attachment wins: "from 3.6 h at 64 envs" binds 3.6 to the
    // 64 row by its own "at" phrase, not by clause-level pairing.
    const localRowAt = (yIdx: number): XMission | null => {
      for (let j = yIdx + 1; j <= Math.min(yIdx + 4, w.length - 1); j += 1) {
        if (w[j] !== 'at' && w[j] !== 'toward') continue;
        for (let k = j + 1; k <= Math.min(j + 4, w.length - 1); k += 1) {
          const n = parseNumericToken(w[k]);
          if (n == null) {
            if (SKIP_WORDS.has(w[k]) || /^[=+-]$/.test(w[k])) continue;
            break;
          }
          const idx = rowXs.findIndex((r) => r != null && r === n);
          return idx >= 0 ? (xs.find((m) => m.rowIdx === idx) ?? null) : null;
        }
      }
      return null;
    };
    for (const { y1, y2 } of fromToPairs) {
      const p1 = parseNumericToken(y1.word)!;
      const p2 = parseNumericToken(y2.word)!;
      // Binding precedence: (1) a local "at X" phrase after the value
      // (checked first, above); (2) with exactly two x-mentions in the
      // clause, in-order pairing (y1 to the first x, y2 to the second),
      // which covers "loss falls from A at 1k to B at 20k, while
      // completion rises from C to D" where both xs precede the second
      // pair; (3) otherwise the first x-mention after the value.
      const bind = (yWord: string, y: number, afterIdx: number, prefer: 'first' | 'last') => {
        let m: XMission | null = localRowAt(afterIdx === y1.idx ? y1.idx : y2.idx);
        if (!m) {
          if (xs.length === 2) m = prefer === 'first' ? xs[0] : xs[1];
          else m = xs.filter((c) => c.wordIdx > afterIdx)[0] ?? xs[xs.length - 1];
        }
        if (!m || y === m.x) return;
        grade(yWord, y, m.rowIdx);
      };
      const toWordIdx = w.indexOf('to', y1.idx + 1);
      bind(y1.word, p1, y1.idx, 'first');
      bind(y2.word, p2, toWordIdx >= 0 ? toWordIdx : y2.idx, 'last');
    }
  }

  // Unattached and unsampled evidence: tokens not part of any binding.
  const bound = new Set(records.map((r) => r.token));
  for (const clause of splitClauses(chart.desc)) {
    for (const word of words(clause)) {
      const n = parseNumericToken(word);
      if (n == null || bound.has(word)) continue;
      const sampled = chart.rows.some((r) => {
        const rx = parseNumericToken(r.label);
        return rx != null && rx === n;
      });
      records.push({
        token: word,
        row: '',
        quantity: null,
        outcome: sampled ? 'unattached' : 'unsampled',
      });
      bound.add(word);
    }
  }
  return { violations, records };
}

/* ------------------------------------------------------------------ */
/* Clause (c): slider-to-row mapping inference.                        */
/* ------------------------------------------------------------------ */

export type SliderTransform = 'direct' | 'scale100' | 'log2' | 'log10k';

/**
 * Infer how a slider's raw value maps to a table row x. Returns the
 * transform under which at least two rows land inside the slider range,
 * or null when this slider does not set the table's x.
 */
export function inferSliderTransform(
  rowXs: number[],
  slider: SliderInfo,
): { transform: SliderTransform; toSlider: (x: number) => number; rows: number[] } | null {
  const candidates: Array<{ transform: SliderTransform; toSlider: (x: number) => number }> = [
    { transform: 'direct', toSlider: (x) => x },
    { transform: 'scale100', toSlider: (x) => x * 100 },
    { transform: 'log2', toSlider: (x) => Math.log2(x) },
    { transform: 'log10k', toSlider: (x) => Math.log10(x) * 1000 },
  ];
  for (const cand of candidates) {
    const rows = rowXs.filter((x) => {
      if (!Number.isFinite(x) || x <= 0) {
        if (cand.transform === 'log2' || cand.transform === 'log10k') return false;
      }
      const sv = cand.toSlider(x);
      if (sv < slider.min - 1e-9 || sv > slider.max + 1e-9) return false;
      const steps = (sv - slider.min) / (slider.step || 1);
      return Math.abs(steps - Math.round(steps)) < 1e-6;
    });
    if (rows.length >= 2) return { ...cand, rows };
  }
  return null;
}

/** Words shared between a slider label and the table's row-header column. */
export function sliderMatchesRowAxis(sliderLabel: string, rowHeader: string): boolean {
  const stop = new Set([...SKIP_WORDS, 'currently', 'step', 'value', 'number', 'size', 'log', 'scale']);
  const norm = (s: string) =>
    words(s)
      .filter((w2) => w2.length > 3 && !stop.has(w2))
      .map((w2) => (w2.endsWith('s') ? w2.slice(0, -1) : w2));
  const a = norm(sliderLabel);
  const b = norm(rowHeader);
  return a.some((w2) => b.includes(w2));
}
