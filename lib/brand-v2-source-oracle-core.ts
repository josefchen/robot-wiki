import type { RawFrameData } from './brand-v2-release-frame-data.ts';

export type SourceBasis = { id: string; kind: 'citation' | 'assumption'; reference: string };
export type SourceOracle = {
  basis: readonly SourceBasis[];
  evidencePaths: readonly string[];
  seriesIds?: readonly string[];
  /** Exact human-readable source credit when a legacy figure prints it
   * without a link. The citation ID remains explicit in this catalog. */
  citationText?: Readonly<Record<string, string>>;
  /** A bounded reason for a mechanism with no quantitative output. */
  nonQuantitative?: string;
  check: (reading: SourceOracleContext) => void;
};
export type OracleCheck = { binding: string; basis: string[]; expected: unknown; actual: unknown; passed: boolean };
export const normalized = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ').replace(/[−–]/g, '-').replace(/\s+/g, ' ').trim();
export const printedNumbers = (text: string) => (normalized(text).replace(/(?<=\d),(?=\d)/g, '').match(/[+-]?(?:\d+(?:\.\d+)?|\.\d+)/g) ?? []).map(Number);

/** Expectations enter through source-specific checks, never through snapshots
 * of rendered output. Uncovered cells and result readouts remain failures. */
export class SourceOracleContext {
  readonly checks: OracleCheck[] = [];
  readonly failures: string[] = [];
  private readonly cells = new Set<string>();
  private readonly readouts = new Set<number>();
  private circlePopulationChecked = false;
  private readonly rectPopulations = new Set<string>();
  private expectedSeriesIds: readonly string[] | undefined;
  private readonly frame: RawFrameData;
  readonly oracle: SourceOracle;
  readonly state: string;
  constructor(frame: RawFrameData, oracle: SourceOracle, state: string) { this.frame = frame; this.oracle = oracle; this.state = state; this.expectedSeriesIds = oracle.seriesIds; }

  requireSeries(ids: readonly string[]): void { this.expectedSeriesIds = ids; }

  compare(binding: string, expected: unknown, actual: unknown, passed: boolean): void {
    this.checks.push({ binding, basis: this.oracle.basis.map(({ id }) => id), expected, actual, passed });
    if (!passed) this.failures.push(`${this.state} ${binding}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  }

  input(label: RegExp): number {
    const matches = this.frame.controls.filter((control) => control.value !== null && label.test(control.label));
    if (matches.length !== 1 || !Number.isFinite(Number(matches[0]?.value))) throw new Error(`expected one numeric input ${label}, found ${matches.length}`);
    return Number(matches[0].value);
  }

  textInput(label: RegExp): string {
    const matches = this.frame.controls.filter((control) => control.value !== null && label.test(control.label));
    if (matches.length !== 1) throw new Error(`expected one text input ${label}, found ${matches.length}`);
    return matches[0].value!;
  }

  selected(label: RegExp): boolean {
    const matches = this.frame.controls.filter((control) => label.test(control.label));
    if (matches.length !== 1) throw new Error(`expected one discrete input ${label}, found ${matches.length}`);
    return matches[0].checked === true || matches[0].pressed === 'true' || matches[0].selected === 'true';
  }

  cell(row: string, column: string, expected: string | number, scope?: { tableHeaders: readonly string[] }): void {
    const heading = (text: string) => normalized(text).replace(/[↑↓]$/, '');
    const matches = this.frame.tables.flatMap((table, t) => scope && JSON.stringify(table.headers.map(heading)) !== JSON.stringify(scope.tableHeaders.map(heading)) ? [] : table.cells.flatMap((cell, c) => normalized(cell.row) === normalized(row) && heading(cell.column) === heading(column) ? [{ cell, key: `${t}:${c}` }] : []));
    if (matches.length !== 1) { this.compare(`cell ${row}/${column}`, 'exactly one source-bound cell', matches.length, false); return; }
    const { cell, key } = matches[0]; this.cells.add(key);
    const actual = typeof expected === 'number' ? printedNumbers(cell.text) : normalized(cell.text);
    this.compare(`cell ${row}/${column}`, expected, actual, typeof expected === 'number' ? Array.isArray(actual) && actual.length === 1 && actual[0] === expected : actual === normalized(expected));
  }

  row(row: string, columns: Record<string, string | number>, scope?: { tableHeaders: readonly string[] }): void {
    for (const [column, value] of Object.entries(columns)) this.cell(row, column, value, scope);
  }

  readoutNumbers(index: number, expected: readonly number[], tolerance = 0.00001): void {
    const reading = this.frame.readouts[index];
    if (!reading) { this.compare(`readout ${index}`, expected, 'missing', false); return; }
    this.readouts.add(index);
    const actual = printedNumbers(reading.text);
    this.compare(`readout ${reading.key}`, expected, actual, actual.length === expected.length && actual.every((value, n) => Math.abs(value - expected[n]) <= tolerance));
  }

  readoutWhere(match: { key?: RegExp; text?: RegExp }, expected: readonly number[]): void {
    const matches = this.frame.readouts.flatMap((reading, index) => (!match.key || match.key.test(reading.key)) && (!match.text || match.text.test(reading.text)) ? [index] : []);
    if (matches.length !== 1) { this.compare(`readout ${match.key ?? ''} ${match.text ?? ''}`, 'one semantically bound readout', matches.length, false); return; }
    this.readoutNumbers(matches[0], expected);
  }

  readoutText(index: number, expected: string): void {
    const reading = this.frame.readouts[index]; this.readouts.add(index);
    this.compare(`readout ${reading?.key ?? index}`, expected, reading?.text ?? 'missing', reading !== undefined && normalized(reading.text) === normalized(expected));
  }

  contains(expected: string): void {
    const actual = normalized(this.frame.text), needle = normalized(expected), at = actual.indexOf(needle);
    this.compare(`source label ${expected}`, expected, at < 0 ? '(missing)' : actual.slice(at, at + needle.length), at >= 0);
  }

  circleCount(expected: number): void {
    this.circlePopulationChecked = true;
    this.compare('circle population', expected, this.frame.circles.length, this.frame.circles.length === expected);
  }

  rectCount(series: string, expected: number): void {
    this.rectPopulations.add(series);
    const actual = this.frame.seriesRects.filter((mark) => mark.seriesId === series).length;
    this.compare(`rectangle population ${series}`, expected, actual, actual === expected);
  }

  point(binding: string, x: number, y: number, radius?: number, tolerance = 0.05): void {
    const matches = this.frame.circles.filter((point) => Math.abs(point.cx - x) <= tolerance && Math.abs(point.cy - y) <= tolerance && (radius === undefined || Math.abs(point.r - radius) <= 0.1));
    this.compare(`point ${binding}`, { x, y, radius }, matches, matches.length === 1);
  }

  rect(series: string, x: number, y: number, width: number, height: number, tolerance = 0.05): void {
    const matches = this.frame.seriesRects.filter((mark) => mark.seriesId === series && Math.abs(mark.x - x) <= tolerance && Math.abs(mark.y - y) <= tolerance);
    this.compare(`rectangle ${series}@${x},${y}`, { x, y, width, height }, matches, matches.length === 1 && Math.abs(matches[0].width - width) <= tolerance && Math.abs(matches[0].height - height) <= tolerance);
  }

  svgMarkCount(seriesId: string, tag: string, expected: number): void {
    const actual = this.frame.svgMarks.filter(mark => mark.seriesId === seriesId && mark.tag === tag).length;
    this.compare(`SVG ${tag} population ${seriesId}`, expected, actual, actual === expected);
  }

  svgMark(seriesId: string, tag: string, expectedAttrs: Readonly<Record<string, string | number>>, tolerance = 0.05): void {
    const tokens = (value: string) => value.match(/[a-zA-Z]|[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][+-]?\d+)?/g) ?? [];
    const agrees = (expected: string | number, actual: string | undefined) => {
      if (actual === undefined) return false;
      if (typeof expected === 'number') return actual.trim() !== '' && Number.isFinite(Number(actual)) && Math.abs(Number(actual) - expected) <= tolerance;
      if (normalized(expected) === normalized(actual)) return true;
      const a = tokens(expected), b = tokens(actual);
      return a.length > 0 && a.length === b.length && a.every((token, index) => Number.isFinite(Number(token)) ? Number.isFinite(Number(b[index])) && Math.abs(Number(token) - Number(b[index])) <= tolerance : token === b[index]);
    };
    const matches = this.frame.svgMarks.filter(mark => mark.seriesId === seriesId && mark.tag === tag && Object.entries(expectedAttrs).every(([key, value]) => agrees(value, mark.attrs[key])));
    this.compare(`SVG ${tag} ${seriesId}`, expectedAttrs, matches.map(mark => mark.attrs), matches.length === 1);
  }

  svgText(seriesId: string, expected: string, x?: number, y?: number, tolerance = 0.05): void {
    const matches = this.frame.svgTexts.filter((label) => label.seriesId === seriesId && (x === undefined || label.x !== null && Math.abs(label.x - x) <= tolerance) && (y === undefined || label.y !== null && Math.abs(label.y - y) <= tolerance));
    this.compare(`SVG label ${seriesId}@${x ?? '*'},${y ?? '*'}`, expected, matches.map(({ text }) => text), matches.length === 1 && normalized(matches[0].text) === normalized(expected));
  }

  finish(): void {
    if (this.checks.some(({ binding }) => binding.startsWith('point ')) && !this.circlePopulationChecked) this.failures.push(`${this.state}: plotted-circle population is not independently bounded`);
    for (const mark of this.frame.seriesRects) if (!this.oracle.nonQuantitative && !this.rectPopulations.has(mark.seriesId)) this.failures.push(`${this.state}: uncovered rectangular mark population ${mark.seriesId}`);
    const actualSeries = Object.entries(this.frame.series).filter(([, series]) => series.marks > 0).map(([id]) => id).sort();
    if (actualSeries.length && !this.expectedSeriesIds) this.failures.push(`${this.state}: uncovered plotted series ${actualSeries.join(', ')}`);
    if (this.expectedSeriesIds) this.compare('source series population', [...this.expectedSeriesIds].sort(), actualSeries, JSON.stringify([...this.expectedSeriesIds].sort()) === JSON.stringify(actualSeries));
    const legend = this.frame.legend.map(({ seriesId }) => seriesId);
    if (legend.some((id) => id === null || !actualSeries.includes(id))) this.failures.push(`${this.state}: a legend item has no attributed plotted series`);
    if (new Set(legend).size !== legend.length) this.failures.push(`${this.state}: a plotted series has duplicate legend items`);
    for (const id of actualSeries) if (!legend.includes(id) && !this.frame.labels.some((label) => label.via === 'label-for' && label.seriesIds.includes(id) && label.visibleText.trim() && label.hidden.length === 0)) this.failures.push(`${this.state}: series ${id} lacks a legend or visible direct label`);
    this.frame.tables.forEach((table, t) => table.cells.forEach((cell, c) => {
      if (!this.cells.has(`${t}:${c}`) && (!this.oracle.nonQuantitative || printedNumbers(cell.text).length > 0 || /not disclosed|\bn\/a\b/i.test(cell.text))) this.failures.push(`${this.state}: uncovered table binding ${cell.row}/${cell.column} = ${cell.text}`);
    }));
    this.frame.readouts.forEach((readout, index) => {
      if (printedNumbers(readout.text).length > 0 && !this.readouts.has(index)) this.failures.push(`${this.state}: uncovered numeric readout ${readout.key} = ${readout.text}`);
    });
    if (!this.checks.some(({ binding }) => /^(cell |readout |point |rectangle )/.test(binding)) && !this.oracle.nonQuantitative) this.failures.push(`${this.state}: quantitative source has no independent expected-value checks`);
  }
}
