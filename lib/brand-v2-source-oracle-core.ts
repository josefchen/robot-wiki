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
  /** Exact UI clock with no source-publication meaning; still reconciled to the motion ledger. */
  previewClock?: { key: 'phase-readout'; purpose: 'stride-preview'; evidencePath: 'evidence/brand-v2/interactive-ledger.json' };
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
  private readonly zeroSeriesIds = new Set<string>();
  private readonly legendKeys = new Set<number>();
  private readonly legendEncodedIds = new Set<string>();
  private comparisonPopulationChecked = false;
  private readonly inactiveSeriesIds = new Set<string>();
  private readonly comparisonMembers = new Map<string, string>();
  private comparisonExpectedLabels: Readonly<Record<string, string>> = {};
  private expectedSeriesIds: readonly string[] | undefined;
  private readonly frame: RawFrameData;
  readonly oracle: SourceOracle;
  readonly state: string;
  constructor(frame: RawFrameData, oracle: SourceOracle, state: string) { this.frame = frame; this.oracle = oracle; this.state = state; this.expectedSeriesIds = oracle.seriesIds; }

  requireSeries(ids: readonly string[]): void { this.expectedSeriesIds = ids; }

  zeroSeries(id: string, reason: string): void {
    const observed = this.frame.series[id];
    const declared = this.frame.seriesDeclarations?.includes(id) ?? observed !== undefined;
    const passed = reason.trim().length > 0 && declared && (observed?.marks ?? 0) === 0;
    this.compare(`model-derived zero series ${id}`, { marks: 0, reason }, { declared, marks: observed?.marks ?? 0 }, passed);
    if (passed) this.zeroSeriesIds.add(id);
  }


  controlPresent(label: RegExp): boolean {
    const matches = this.frame.controls.filter(control => label.test(control.label));
    if (matches.length > 1) throw new Error(`ambiguous control ${label}`);
    return matches.length === 1;
  }

  inputs(label: RegExp): number[] {
    const matches = this.frame.controls.filter(control => control.value !== null && label.test(control.label));
    if (!matches.length || matches.some(control => !Number.isFinite(Number(control.value)))) throw new Error(`expected numeric inputs ${label}`);
    return matches.map(control => Number(control.value));
  }


  compare(binding: string, expected: unknown, actual: unknown, passed: boolean): void {
    this.checks.push({ binding, basis: this.oracle.basis.map(({ id }) => id), expected, actual, passed });
    if (!passed) this.failures.push(`${this.state} ${binding}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  }

  input(label: RegExp, scope?: { group: string }): number {
    const matches = this.frame.controls.filter((control) => control.value !== null && label.test(control.label) && (!scope || control.group !== undefined && normalized(control.group) === normalized(scope.group)));
    if (matches.length !== 1 || !Number.isFinite(Number(matches[0]?.value))) throw new Error(`expected one numeric input ${label}, found ${matches.length}`);
    return Number(matches[0].value);
  }

  textInput(label: RegExp, scope?: { group: string }): string {
    const matches = this.frame.controls.filter((control) => control.value !== null && label.test(control.label) && (!scope || control.group !== undefined && normalized(control.group) === normalized(scope.group)));
    if (matches.length !== 1) throw new Error(`expected one text input ${label}, found ${matches.length}`);
    return matches[0].value!;
  }

  selected(label: RegExp, scope?: { group: string }): boolean {
    const matches = this.frame.controls.filter((control) => label.test(control.label) && (!scope || control.group !== undefined && normalized(control.group) === normalized(scope.group)));
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

  tableSort(): { column: string; direction: string } {
    const states = this.frame.tables.flatMap(table => table.sortStates ?? []).filter(state => state.direction === 'ascending' || state.direction === 'descending');
    if (states.length !== 1) throw new Error(`expected one measured table sort state, found ${states.length}`);
    return states[0];
  }

  htmlMarkCount(expected: number): void {
    const actual = this.frame.htmlMarks?.length;
    this.compare('HTML mark population', expected, actual ?? 'missing raw HTML marks', actual === expected);
  }

  htmlBar(ownerTestId: string, expectedFraction: number, tolerance = 0.005): void {
    const matches = this.frame.htmlMarks?.filter(mark => mark.ownerTestId === ownerTestId) ?? [];
    const mark = matches[0], actual = mark && mark.parentBox.width > 0 ? mark.box.width / mark.parentBox.width : null;
    this.compare(`HTML bar ${ownerTestId}`, expectedFraction, { marks: matches, fraction: actual }, matches.length === 1 && actual !== null && mark.opacity > 0 && Math.abs(actual - expectedFraction) <= tolerance);
  }

  previewClock(): void {
    const definition = this.oracle.previewClock;
    if (!definition) throw new Error('undeclared preview clock');
    const matches = this.frame.readouts.flatMap((value, index) => value.key === definition.key ? [{ value, index }] : []);
    if (matches.length !== 1) throw new Error('missing or duplicate preview clock');
    const { value, index } = matches[0], values = printedNumbers(value.text); this.readouts.add(index);
    const isDefault = this.state.startsWith('default');
    this.compare('UI stride clock (publication parity inapplicable)', { range: [0, 100], default: isDefault ? 0 : null, purpose: definition.purpose, motionEvidence: definition.evidencePath }, value.text, /^Preview phase:/.test(value.text) && /%$/.test(value.text) && values.length === 1 && values[0] >= 0 && values[0] <= 100 && (!isDefault || values[0] === 0));
  }

  sourceState(attribute: string): string {
    if (!attribute.startsWith('data-source-')) throw new Error('sourceState requires a named data-source input');
    const matches = this.frame.declaredBindings.flatMap(binding => binding.attributes[attribute] === undefined ? [] : [binding.attributes[attribute]]);
    if (matches.length !== 1) throw new Error(`expected one source input ${attribute}, found ${matches.length}`);
    return matches[0];
  }

  tablePopulation(expected: readonly { headers: readonly string[]; rows: readonly string[] }[]): void {
    const heading = (value: string) => normalized(value).replace(/[↑↓]$/, '');
    const key = (table: { headers: readonly string[]; rows: readonly string[] }) => JSON.stringify({ headers: table.headers.map(heading), rows: table.rows.map(normalized).sort() });
    const actual = this.frame.tables.map(table => ({ headers: table.headers, rows: [...new Set(table.cells.map(cell => cell.row))] }));
    this.compare('table population', expected, actual, JSON.stringify(expected.map(key).sort()) === JSON.stringify(actual.map(key).sort()));
  }

  sourceLink(href: string): void {
    const matches = this.frame.sourceBindings.filter(binding => binding.href === href);
    this.compare(`source link ${href}`, href, matches, matches.length > 0);
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

  svgPlotPoints(seriesId: string, tag: string, ownerTestId: string, viewBox: string, points: readonly (readonly [number, number])[], tolerance = 0.05): void {
    const marks = this.frame.svgMarks.filter(mark => mark.seriesId === seriesId && mark.tag === tag && mark.ownerTestId === ownerTestId);
    const mark = marks[0], matrix = mark?.plotTransform;
    const projected = matrix && Object.values(matrix).every(Number.isFinite)
      ? points.map(([x, y]) => [matrix.a * x + matrix.c * y + matrix.e, matrix.b * x + matrix.d * y + matrix.f])
      : null;
    const valid = marks.length === 1 && mark.displayed === true && mark.effectiveOpacity !== undefined && mark.effectiveOpacity > 0 &&
      normalized(mark.viewBox) === normalized(viewBox) && mark.attrs.transform === undefined && projected !== null && points.length >= 3 &&
      projected.every((point, index) => point.every((value, axis) => Number.isFinite(value) && Math.abs(value - points[index][axis]) <= tolerance));
    this.compare(`SVG plot coordinates ${seriesId}`, { ownerTestId, viewBox, points }, { marks, projected }, valid);
  }

  rect(series: string, x: number, y: number, width: number, height: number, tolerance = 0.05): void {
    const matches = this.frame.seriesRects.filter((mark) => mark.seriesId === series && Math.abs(mark.x - x) <= tolerance && Math.abs(mark.y - y) <= tolerance);
    this.compare(`rectangle ${series}@${x},${y}`, { x, y, width, height }, matches, matches.length === 1 && Math.abs(matches[0].width - width) <= tolerance && Math.abs(matches[0].height - height) <= tolerance);
  }

  svgMarkCount(seriesId: string | null, tag: string, expected: number, scope?: { testId?: string; ownerTestId?: string; overviewCell?: string; expectedCount?: number; effectiveOpacity?: number }): void {
    const actual = this.frame.svgMarks.filter(mark => mark.seriesId === seriesId && mark.tag === tag && (!scope?.testId || mark.testId === scope.testId) && (!scope?.ownerTestId || mark.ownerTestId === scope.ownerTestId) && (!scope?.overviewCell || mark.overviewCell === scope.overviewCell) && (scope?.effectiveOpacity === undefined || mark.effectiveOpacity !== undefined && Math.abs(mark.effectiveOpacity - scope.effectiveOpacity) <= 0.000001)).length;
    this.compare(`SVG ${tag} population ${seriesId}`, expected, actual, actual === expected);
  }

  svgMark(seriesId: string | null, tag: string, expectedAttrs: Readonly<Record<string, string | number>>, tolerance = 0.05, scope?: { testId?: string; ownerTestId?: string; overviewCell?: string; expectedCount?: number; effectiveOpacity?: number }): void {
    const tokens = (value: string) => value.match(/[a-zA-Z]|[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][+-]?\d+)?/g) ?? [];
    const agrees = (expected: string | number, actual: string | undefined) => {
      if (actual === undefined) return false;
      if (typeof expected === 'number') return actual.trim() !== '' && Number.isFinite(Number(actual)) && Math.abs(Number(actual) - expected) <= tolerance;
      if (normalized(expected) === normalized(actual)) return true;
      const a = tokens(expected), b = tokens(actual);
      return a.length > 0 && a.length === b.length && a.every((token, index) => Number.isFinite(Number(token)) ? Number.isFinite(Number(b[index])) && Math.abs(Number(token) - Number(b[index])) <= tolerance : token === b[index]);
    };
    const matches = this.frame.svgMarks.filter(mark => mark.seriesId === seriesId && mark.tag === tag && (!scope?.testId || mark.testId === scope.testId) && (!scope?.ownerTestId || mark.ownerTestId === scope.ownerTestId) && (!scope?.overviewCell || mark.overviewCell === scope.overviewCell) && (scope?.effectiveOpacity === undefined || mark.effectiveOpacity !== undefined && Math.abs(mark.effectiveOpacity - scope.effectiveOpacity) <= 0.000001) && Object.entries(expectedAttrs).every(([key, value]) => agrees(value, mark.attrs[key])));
    this.compare(`SVG ${tag} ${seriesId}`, expectedAttrs, matches.map(mark => mark.attrs), matches.length === (scope?.expectedCount ?? 1));
  }

  legendEncoding(mapping: Readonly<Record<string, readonly string[]>>, shapes?: Readonly<Record<string, { tag: string; vertices?: number; fill?: string; stroke?: string | { seriesId: string }; strokeWidth?: string }>>): void {
    const actual = this.frame.legend.map(item => normalized(item.text)).sort(), expected = Object.keys(mapping).map(normalized).sort();
    const members = Object.values(mapping).flat(), painted = Object.entries(this.frame.series).filter(([, value]) => value.marks > 0).map(([id]) => id).sort();
    const shapesAgree = !shapes || Object.entries(shapes).every(([label, shape]) => {
      const matches = this.frame.legend.filter(item => normalized(item.text) === normalized(label));
      const swatch = matches[0]?.swatch;
      const fillAgrees = shape.fill === undefined || swatch?.fill === shape.fill;
      const strokeWidthAgrees = shape.strokeWidth === undefined || swatch?.strokeWidth === shape.strokeWidth;
      // A source-bound hollow series can keep its system-colour outline in forced colours.
      // Both resolved paints must match exactly; missing paint or a filled key cannot qualify.
      const strokeAgrees = shape.stroke === undefined || (typeof shape.stroke === 'string'
        ? swatch?.stroke === shape.stroke
        : shape.fill !== undefined && typeof swatch?.stroke === 'string' && swatch.stroke.length > 0 && swatch.stroke !== shape.fill
          && mapping[label]?.includes(shape.stroke.seriesId) === true
          && JSON.stringify([...new Set(this.frame.series[shape.stroke.seriesId]?.paints ?? [])].sort()) === JSON.stringify([shape.fill, swatch.stroke].sort()));
      return Object.hasOwn(mapping, label) && matches.length === 1 && swatch?.tag === shape.tag && fillAgrees && strokeAgrees && strokeWidthAgrees && (shape.vertices === undefined || swatch.points !== undefined && swatch.points !== null && swatch.points.trim().split(/[\s,]+/).length === shape.vertices * 2 && swatch.points.trim().split(/[\s,]+/).every(value => value !== '' && Number.isFinite(Number(value))));
    });
    const valid = shapesAgree && JSON.stringify(actual) === JSON.stringify(expected) && new Set(members).size === members.length && JSON.stringify([...members].sort()) === JSON.stringify(painted);
    this.compare('explicit legend encoding key', { mapping, shapes: shapes ?? null }, { labels: this.frame.legend, paintedSeries: painted }, valid);
    if (valid) { this.frame.legend.forEach((_, index) => this.legendKeys.add(index)); members.forEach(id => this.legendEncodedIds.add(id)); }
  }

  pendulumPartKeys(expected: readonly { id: string; words: string; points: readonly (readonly number[])[] }[]): void {
    if (!this.oracle.basis.some(basis => basis.id === 'assumption:PendulumController:input-replayed-pid')) throw new Error('physical needle keys are scoped to PendulumController');
    const parts = this.frame.physicalNeedles ?? [];
    this.compare('pendulum physical needle population', ['pendulum-gravity-arrow', 'pendulum-push-arrow'], parts.map(part => part.id).sort(),
      parts.length === 2 && new Set(parts.map(part => part.id)).size === 2);
    for (const needle of expected) {
      const keys = this.frame.legend.map((key, index) => ({ key, index })).filter(({ key }) => normalized(key.text) === needle.words);
      const matches = parts.filter(part => part.id === needle.id);
      const path = matches[0]?.topPaths[0] ?? '';
      const coordinates = printedNumbers(path);
      const values = needle.points.flat();
      const valid = keys.length === 1 && keys[0].key.seriesId === null && keys[0].key.swatch === null &&
        keys[0].key.paintFailures?.length === 0 && matches.length === 1 && matches[0].visible && matches[0].topPaths.length === 1 &&
        (path.match(/[MLZ]/g) ?? []).join('') === 'MLLLZ' && coordinates.length === 8 &&
        values.every((value, index) => Math.abs(value - coordinates[index]) <= 0.05);
      this.compare(`physical part annotation ${needle.id}`, needle, { keys, parts: matches }, valid);
      if (valid) this.legendKeys.add(keys[0].index);
    }
  }

  inactiveRetainedSeries(id: string, reason: string): void {
    if (!this.oracle.basis.some(basis => basis.id.startsWith('assumption:AdvantageScrubber:')) || !['low', 'value'].includes(id)) throw new Error('inactive-view label scope is limited to the retained AdvantageScrubber episode');
    const marks = this.frame.svgMarks.filter(mark => mark.seriesId === id);
    const passed = reason.trim().length > 0 && marks.length > 0 && marks.every(mark => mark.displayed === false);
    this.compare(`inactive retained episode series ${id}`, { visibleLabel: 'inapplicable while the native alternative view is selected', reason }, { marks }, passed);
    if (passed) this.inactiveSeriesIds.add(id);
  }

  comparisonCardPopulation(expectedIds: readonly string[], expectedSeriesLabels: Readonly<Record<string, string>> = {}): void {
    if (!this.oracle.basis.some(basis => basis.id.startsWith('assumption:ComparisonMatrix:'))) throw new Error('method-card alternative is scoped to ComparisonMatrix');
    const cards = this.frame.methodCards;
    const passed = cards !== undefined && cards.every(card => card.visible && (card.paintFailures?.length ?? 0) === 0) && new Set(cards.map(card => card.id)).size === cards.length && JSON.stringify(cards.map(card => card.id).sort()) === JSON.stringify([...expectedIds].sort());
    this.compare('ComparisonMatrix exact painted accessible card population', expectedIds, cards ?? 'missing measured cards', passed);
    this.comparisonPopulationChecked = passed;
    this.comparisonExpectedLabels = expectedSeriesLabels;
  }

  comparisonCardAlternative(seriesId: string, cardId: string, expectedFacts: string, selected: boolean, contextOpacity = 0.2): void {
    if (!this.oracle.basis.some(basis => basis.id.startsWith('assumption:ComparisonMatrix:'))) throw new Error('method-card alternative is scoped to ComparisonMatrix');
    const cards = this.frame.methodCards?.filter(card => card.id === cardId) ?? [];
    const dots = this.frame.svgMarks.filter(mark => mark.ownerTestId === 'method-year-strip' && mark.seriesId === seriesId && mark.attrs['data-method-dot'] === cardId);
    const opacity = selected ? 1 : contextOpacity;
    const cardPass = selected ? cards.length === 1 && cards[0].visible && (cards[0].paintFailures?.length ?? 0) === 0 && normalized(cards[0].text) === normalized(expectedFacts) : cards.length === 0;
    const passed = this.comparisonPopulationChecked && cardPass && dots.length === 1 && dots[0].effectiveOpacity !== undefined && Math.abs(dots[0].effectiveOpacity - opacity) <= 0.000001;
    this.compare(`ComparisonMatrix semantic alternative ${cardId}`, { seriesId, expectedFacts, disposition: selected ? 'included accessible card' : 'excluded faint context, not selected semantics', opacity }, { cards, dots }, passed);
    if (passed) this.comparisonMembers.set(cardId, seriesId);
  }

  private comparisonLabelAlternative(seriesId: string): boolean {
    if (!this.comparisonPopulationChecked) return false;
    const dots = this.frame.svgMarks.filter(mark => mark.ownerTestId === 'method-year-strip' && mark.seriesId === seriesId && mark.attrs['data-method-dot']);
    if (!dots.length || !dots.every(dot => this.comparisonMembers.get(dot.attrs['data-method-dot']) === seriesId)) return false;
    const expected = this.comparisonExpectedLabels[seriesId];
    if (!expected?.trim()) return false;
    return this.frame.labels.some(label => label.via === 'label-for' && label.seriesIds.includes(seriesId) && label.hidden.length > 0 && label.hidden.every(reason => reason === `"${expected}": aria-hidden`) && this.frame.svgTexts.some(text => text.ownerTestId === 'method-year-strip' && normalized(text.text) === normalized(expected) && text.painted === true && (text.paintFailures?.length ?? 0) === 0));
  }

  svgText(seriesId: string | null, expected: string, x?: number, y?: number, tolerance = 0.05, scope?: { ownerTestId?: string; overviewCell?: string; dy?: string | null; requirePaint?: boolean }): void {
    const matches = this.frame.svgTexts.filter((label) => label.seriesId === seriesId && (!scope?.ownerTestId || label.ownerTestId === scope.ownerTestId) && (!scope?.overviewCell || label.overviewCell === scope.overviewCell) && (!scope || !Object.hasOwn(scope, 'dy') || label.dy === scope.dy) && (x === undefined || label.x !== null && Math.abs(label.x - x) <= tolerance) && (y === undefined || label.y !== null && Math.abs(label.y - y) <= tolerance));
    this.compare(`SVG label ${seriesId}@${x ?? '*'},${y ?? '*'}`, expected, matches.map(({ text }) => text), matches.length === 1 && normalized(matches[0].text) === normalized(expected));
    if (scope?.requirePaint) this.compare(`SVG label paint ${seriesId}@${x ?? '*'},${y ?? '*'}`, { painted: true, failures: [] }, matches.map(label => ({ painted: label.painted, failures: label.paintFailures })), matches.length === 1 && matches[0].painted === true && matches[0].paintFailures?.length === 0);
  }

  finish(): void {
    if (this.checks.some(({ binding }) => binding.startsWith('point ')) && !this.circlePopulationChecked) this.failures.push(`${this.state}: plotted-circle population is not independently bounded`);
    for (const mark of this.frame.seriesRects) if (!this.oracle.nonQuantitative && !this.rectPopulations.has(mark.seriesId)) this.failures.push(`${this.state}: uncovered rectangular mark population ${mark.seriesId}`);
    const actualSeries = Object.entries(this.frame.series).filter(([, series]) => series.marks > 0).map(([id]) => id).sort();
    if (actualSeries.length && !this.expectedSeriesIds) this.failures.push(`${this.state}: uncovered plotted series ${actualSeries.join(', ')}`);
    if (this.expectedSeriesIds) this.compare('source series population', [...this.expectedSeriesIds].sort(), actualSeries, JSON.stringify([...this.expectedSeriesIds].sort()) === JSON.stringify(actualSeries));
    const legend = this.frame.legend.map(({ seriesId }) => seriesId);
    if (legend.some((id, index) => !this.legendKeys.has(index) && (id === null || !actualSeries.includes(id) && !this.zeroSeriesIds.has(id)))) this.failures.push(`${this.state}: a legend item has no attributed plotted series`);
    if (new Set(legend.map((id, index) => this.legendKeys.has(index) ? `encoding:${normalized(this.frame.legend[index].text)}` : id)).size !== legend.length) this.failures.push(`${this.state}: a plotted series has duplicate legend items`);
    for (const id of actualSeries) if (!legend.includes(id) && !this.legendEncodedIds.has(id) && !this.inactiveSeriesIds.has(id) && !this.comparisonLabelAlternative(id) && !this.frame.labels.some((label) => label.via === 'label-for' && label.seriesIds.includes(id) && label.visibleText.trim() && label.hidden.length === 0)) this.failures.push(`${this.state}: series ${id} lacks a legend or visible direct label`);
    this.frame.tables.forEach((table, t) => table.cells.forEach((cell, c) => {
      if (!this.cells.has(`${t}:${c}`) && (!this.oracle.nonQuantitative || printedNumbers(cell.text).length > 0 || /not disclosed|\bn\/a\b/i.test(cell.text))) this.failures.push(`${this.state}: uncovered table binding ${cell.row}/${cell.column} = ${cell.text}`);
    }));
    this.frame.readouts.forEach((readout, index) => {
      if (printedNumbers(readout.text).length > 0 && !this.readouts.has(index)) this.failures.push(`${this.state}: uncovered numeric readout ${readout.key} = ${readout.text}`);
    });
    if (!this.checks.some(({ binding }) => /^(cell |readout |point |rectangle |table population|HTML bar )/.test(binding)) && !this.oracle.nonQuantitative) this.failures.push(`${this.state}: quantitative source has no independent expected-value checks`);
  }
}
