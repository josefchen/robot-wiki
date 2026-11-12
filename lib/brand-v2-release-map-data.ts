import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { COMPANIES } from '../data/companies.ts';
import { IMAGES, legalBasis, attributionText } from '../data/images.ts';
import type { AbsentField, Company } from '../data/schemas/company.ts';
import { absentState, companyStatusLabel, formatApproach, formatShortDate, formatSubSegment, formatUsd, roundSource, SEGMENT_LABELS } from './market-map.ts';
import { expectedCompanies, expectedRenderedIds, expectedTimelineEvents } from './brand-v2-market-map-states.ts';
import { MARK_PLACEMENT, WITHHELD_MARKS, BLOCK_FILL, markInk } from './market-map-marks.ts';
import { readReleaseBuildStamp } from './brand-v2-release-build.ts';
import { contrastRatio } from './brand-v2-token-evidence.ts';
import { decodePng } from './png-decode.ts';
export const RELEASE_MAP_DATA_PATH = 'evidence/brand-v2/release/map-data.json';
export const MAP_DATA_WIDTHS = ['1440x900', '375x812'] as const;
export const MAP_DATA_VIEWS = ['grid', 'bubble', 'timeline'] as const;
export const MAP_DATA_STATES = ['default', 'filtered', 'selected', 'focused'] as const;
export const MAP_DATA_SELECTED = 'figure-ai';
export function mapDataViewIds() {
  return MAP_DATA_WIDTHS.flatMap(width => MAP_DATA_VIEWS.flatMap(view => MAP_DATA_STATES.map(state => width + '|' + view + '|' + state)));
}
export function mapDataRecordIds() {
  return MAP_DATA_WIDTHS.flatMap(width => COMPANIES.map(company => width + '|' + company.id));
}
export function mapDataLogoIds() {
  return MAP_DATA_WIDTHS.flatMap(width => ['/market-map/', '/credits/'].flatMap(route => COMPANIES.filter(company => company.logo && !WITHHELD_MARKS[company.logo]).map(company => width + '|' + route + '|' + company.logo)));
}
const text = z.string(),
  num = z.number().finite(),
  box = z.object({
    left: num,
    top: num,
    right: num,
    bottom: num,
    width: num,
    height: num
  }).strict();
const selection = z.object({
  id: text,
  tag: text,
  semantic: text.nullable(),
  expanded: text.nullable(),
  controls: text.nullable(),
  foreground: text,
  background: text,
  weight: num,
  underline: z.boolean(),
  borders: z.array(num),
  borderColours: z.array(text),
  radius: num,
  markRadius: num.nullable(),
  selectedMark: z.boolean()
}).strict();
export const mapDataRecordSchema = z.object({
  id: text,
  companyId: text,
  viewport: z.enum(MAP_DATA_WIDTHS),
  hash: text,
  heading: text,
  context: text,
  description: text,
  fields: z.record(text, text),
  sources: z.array(z.object({
    url: text,
    title: text,
    date: text
  }).strict()),
  caveat: text,
  roundSource: text,
  detailWidth: num,
  overflowPx: num,
  minimumTextPx: num
}).strict();
export const mapDataViewSchema = z.object({
  id: text,
  viewport: z.enum(MAP_DATA_WIDTHS),
  view: z.enum(MAP_DATA_VIEWS),
  state: z.enum(MAP_DATA_STATES),
  countText: text,
  renderedIds: z.array(text),
  legendText: text,
  legendSwatches: z.array(z.object({
    label: text,
    fill: text,
    stroke: text,
    r: num,
    strokeWidth: num
  }).strict()),
  plotViewBox: z.array(num),
  plotText: text,
  marks: z.array(z.object({
    companyId: text,
    cx: num,
    cy: num,
    r: num,
    fill: text,
    stroke: text,
    strokeWidth: num,
    kind: text,
    label: text
  }).strict()),
  timelineRows: z.array(z.object({
    companyId: text,
    text
  }).strict()),
  selections: z.array(selection),
  accents: z.array(z.object({
    element: text,
    properties: z.array(text),
    role: z.enum(['focus-ring', 'selected-mark', 'selected-round', 'legend-key']).nullable()
  }).strict()),
  retired: z.array(text),
  sheet: z.object({
    modal: z.boolean(),
    box,
    closeName: text,
    controlGeometry: z.array(z.object({
      id: text,
      box,
      overlaps: z.boolean()
    }).strict()),
    tabEscaped: z.boolean(),
    closeWorked: z.boolean(),
    focusRestored: z.boolean()
  }).strict().nullable(),
  links: z.array(z.object({
    text,
    colour: text,
    underline: z.boolean()
  }).strict()),
  documentOverflow: num
}).strict();
export const mapDataLogoSchema = z.object({
  id: text,
  imageId: text,
  route: z.enum(['/market-map/', '/credits/']),
  viewport: z.enum(MAP_DATA_WIDTHS),
  file: text,
  ink: text,
  mask: text,
  mode: text,
  filter: text,
  inkFilter: text,
  background: text,
  shadow: text,
  borders: z.array(num),
  padding: z.array(num),
  width: num,
  height: num,
  fill: num,
  screenshot: text,
  screenshotSha256: text.regex(/^[a-f0-9]{64}$/)
}).strict();
export const releaseMapDataSchema = z.object({
  version: z.literal(1),
  sourceFingerprint: text.regex(/^[a-f0-9]{64}$/),
  exportFingerprint: text.regex(/^[a-f0-9]{64}$/),
  records: z.array(mapDataRecordSchema).min(1),
  views: z.array(mapDataViewSchema).min(1),
  logos: z.array(mapDataLogoSchema).min(1)
}).strict();
export type ReleaseMapData = z.infer<typeof releaseMapDataSchema>;
export type MapDataRecord = z.infer<typeof mapDataRecordSchema>;
export type MapDataView = z.infer<typeof mapDataViewSchema>;
export type MapDataLogo = z.infer<typeof mapDataLogoSchema>;
const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && new Set(a).size === a.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
export function validateReleaseMapData(input: unknown, expected: {
  source: string;
  exported: string;
}) {
  const data = releaseMapDataSchema.parse(input);
  if (data.sourceFingerprint !== expected.source || data.exportFingerprint !== expected.exported) throw Error('stale canonical map data proof');
  if (!same(data.records.map(row => row.id), mapDataRecordIds()) || !same(data.views.map(row => row.id), mapDataViewIds()) || !same(data.logos.map(row => row.id), mapDataLogoIds())) throw Error('missing, extra or duplicate map record/view/logo reading');
  for (const row of data.records) if (row.id !== row.viewport + '|' + row.companyId) throw Error('misbound map record');
  for (const row of data.views) if (row.id !== row.viewport + '|' + row.view + '|' + row.state) throw Error('misbound map state');
  for (const row of data.logos) if (row.id !== row.viewport + '|' + row.route + '|' + row.imageId) throw Error('misbound map mark');
  return data;
}
export function readReleaseMapData(root: string, artifact?: unknown) {
  const build = readReleaseBuildStamp(root);
  const data = validateReleaseMapData(artifact ?? JSON.parse(readFileSync(join(root, RELEASE_MAP_DATA_PATH), 'utf8')), {
    source: build.sourceAfter,
    exported: build.exportFingerprint
  });
  for (const logo of data.logos) {
    if (!logo.screenshot.startsWith('evidence/brand-v2/release/') || logo.screenshot.includes('..')) throw Error('unsafe map mark screenshot path');
    const bytes = readFileSync(join(root, logo.screenshot));
    if (createHash('sha256').update(bytes).digest('hex') !== logo.screenshotSha256) throw Error('stale rendered mark screenshot ' + logo.id);
    const png = decodePng(bytes);
    let ink = 0;
    for (let i = 0; i < png.rgba.length; i += 4) ink += Math.min(1, Math.max(0, (250 - png.rgba[i + 1]) / (250 - 107)));
    if (Math.abs(logo.fill - ink / (png.width * png.height)) > 1e-10) throw Error('recorded mark fill differs from actual screenshot pixels ' + logo.id);
    if (Math.abs(png.width - logo.width) > 2 || Math.abs(png.height - logo.height) > 2) throw Error('rendered mark screenshot dimensions differ ' + logo.id);
  }
  return data;
}
export function expectedMapCompanyFields(company: Company): Record<string, string> {
  const absent = (field: AbsentField) => absentState(company, field) === 'not-applicable' ? 'n/a' : 'not disclosed';
  const money = (value: number | null | undefined, field: AbsentField) => value == null ? absent(field) : formatUsd(value);
  const list = (values: readonly string[], field: AbsentField) => values.length ? values.join(', ') : absent(field);
  const source = roundSource(company),
    round = company.latestRound;
  const websiteSource = company.website ? company.sources.findIndex(source => new URL(source.url).href === new URL(company.website!).href) + 1 : 0;
  const website = company.website ? company.website.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '') + (websiteSource ? ' ,source ' + websiteSource + ' below' : '') : absent('website');
  return {
    status: companyStatusLabel(company),
    'round-type': round?.type ?? absent('round.type'),
    amount: money(round?.amountUsd, 'round.amountUsd'),
    date: round?.date ? formatShortDate(round.date) : absent('round.date'),
    valuation: money(round?.valuationUsd, 'round.valuationUsd'),
    leads: list(round?.leadInvestors ?? [], 'round.leadInvestors'),
    ...(source ? {
      'as-of': formatShortDate(source.asOf)
    } : {}),
    'total-raised': money(company.totalRaisedUsd, 'totalRaisedUsd'),
    founded: company.founded === null ? absent('founded') : String(company.founded),
    hq: company.hq.city === null ? company.hq.country + ', city ' + absent('hq.city') : [company.hq.city, company.hq.country].join(', '),
    approach: company.approach.map(formatApproach).join(', '),
    deployments: list(company.deployments, 'deployments'),
    'open-source': list(company.openSource, 'openSource'),
    aka: list(company.aka, 'aka'),
    website: website.replace(' ,source', ', source'),
    confidence: company.confidence
  };
}
export function mapCompanyRecordProblems(row: MapDataRecord): string[] {
  const company = COMPANIES.find(company => company.id === row.companyId);
  if (!company) throw Error('unregistered company record');
  const errors: string[] = [];
  const expected = expectedMapCompanyFields(company),
    clean = (value: string) => value.replace(/\s+/g, ' ').trim();
  if (row.heading !== company.name || row.description !== company.description || row.hash !== '#company-' + company.id) errors.push('company identity, description or deep-link differs');
  const context = [SEGMENT_LABELS[company.segment], company.subSegment ? formatSubSegment(company.subSegment) : null, [company.hq.city, company.hq.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
  if (row.context !== context) errors.push('category/headquarters context differs');
  if (!same(Object.keys(row.fields), Object.keys(expected))) errors.push('company detail field population differs');
  for (const [field, value] of Object.entries(expected)) if (clean(row.fields[field] ?? '') !== clean(value)) errors.push(field + ': rendered ' + JSON.stringify(row.fields[field]) + ' differs from ' + JSON.stringify(value));
  if (row.sources.length !== company.sources.length || row.sources.some((source, index) => source.url !== company.sources[index]?.url || source.title !== company.sources[index]?.title || source.date !== 'As of ' + formatShortDate(company.sources[index].asOf))) errors.push('source URL/title/date population differs');
  const caveat = company.latestRound?.caveat;
  if (caveat && !row.caveat.includes(caveat.text) || !caveat && row.caveat) errors.push('contradictory/qualified source caveat was lost or invented');
  if (caveat) for (const url of caveat.sourceUrls) {
    const at = company.sources.findIndex(source => source.url === url);
    if (at < 0 || !row.caveat.includes(company.sources[at].title) || !row.caveat.includes('source ' + (at + 1) + ' below')) errors.push('caveat source pointer differs');
  }
  const source = roundSource(company);
  if (source && (!row.roundSource.includes(source.title) || !row.roundSource.includes(formatShortDate(source.asOf)))) errors.push('round source/date pointer differs');
  if (row.overflowPx > .5 || row.detailWidth <= 0 || row.minimumTextPx < 12) errors.push('company detail is clipped or unreadably small');
  return errors;
}
export function mapGeometryProblems(row: MapDataView): string[] {
  if (row.view === 'grid') return [];
  const errors: string[] = [],
    filtered = expectedCompanies(row.state === 'filtered' ? {
      segment: 'humanoids'
    } : {}),
    near = (a: number, b: number) => Math.abs(a - b) <= .6,
    width = row.plotViewBox[2];
  if (!width || row.plotViewBox.length !== 4) errors.push('plot has no deterministic viewBox');
  const paint = (mark: MapDataView['marks'][number], open: boolean, selected: boolean, strokeWidth: number) => {
    const fill = selected ? 'rgb(59, 110, 168)' : open ? 'rgb(250, 250, 248)' : 'rgb(63, 63, 59)';
    if (mark.fill !== fill || open && !selected && (mark.stroke !== 'rgb(63, 63, 59)' || Math.abs(mark.strokeWidth - strokeWidth) > .01)) errors.push(mark.companyId + ': mark colour/outline contradicts its disclosed/unknown/selected encoding');
  };
  const swatch = (label: string, open: boolean, radius: number, strokeWidth: number, selected = false) => {
    const matching = row.legendSwatches.filter(item => item.label === label);
    if (matching.length !== 1) {
      errors.push('missing or duplicate legend swatch ' + label);
      return;
    }
    const item = matching[0];
    if (item.fill !== (selected ? 'rgb(59, 110, 168)' : open ? 'rgb(250, 250, 248)' : 'rgb(63, 63, 59)') || Math.abs(item.r - radius) > .01 || open && (item.stroke !== 'rgb(63, 63, 59)' || Math.abs(item.strokeWidth - strokeWidth) > .01)) errors.push(label + ': actual legend paint/shape differs from its mark encoding');
  };
  if (row.view === 'bubble') {
    const points = filtered.filter(company => company.founded !== null && (company.latestRound?.valuationUsd ?? company.totalRaisedUsd) !== null).map(company => ({
      company,
      founded: company.founded!,
      value: (company.latestRound?.valuationUsd ?? company.totalRaisedUsd)!
    }));
    if (!same(row.marks.map(mark => mark.companyId), points.map(point => point.company.id))) errors.push('bubble mark population differs from disclosed canonical values');
    const years = points.map(point => point.founded),
      values = points.map(point => point.value),
      loX = Math.min(...years) - 1,
      hiX = Math.max(...years) + 1,
      loY = Math.max(1, Math.min(...values) / 1.4),
      hiY = Math.max(...values) * 1.4;
    for (const point of points) {
      const mark = row.marks.find(mark => mark.companyId === point.company.id);
      if (!mark) continue;
      const x = 64 + (point.founded - loX) / (hiX - loX) * (width - 88),
        y = 24 + (1 - (Math.log10(point.value) - Math.log10(loY)) / (Math.log10(hiY) - Math.log10(loY))) * 348;
      const kind = point.company.latestRound?.valuationUsd != null ? 'valuation' : 'totalRaised';
      const selected = row.state === 'selected' && point.company.id === MAP_DATA_SELECTED;
      const r = selected ? 6 : kind === 'valuation' ? 4.5 : 3.75;
      if (!near(mark.cx, x) || !near(mark.cy, y) || !near(mark.r, r) || mark.kind !== kind) errors.push(point.company.id + ': bubble coordinate/size/type differs from canonical data');
      paint(mark, kind === 'totalRaised', selected, 1.5);
      if (!mark.label.includes(point.company.name) || !mark.label.includes(String(point.founded)) || !mark.label.includes(formatUsd(point.value))) errors.push(point.company.id + ': bubble lacks equivalent named year/value');
    }
    if (!/Latest valuation/.test(row.legendText) || !/Total raised, where no valuation is disclosed/.test(row.legendText) || !/Selected company/.test(row.legendText) || !/US\$, log scale/.test(row.plotText) || !/Founding year/.test(row.plotText)) errors.push('bubble legend omits an encoding');
    swatch('Latest valuation', false, 4.5, 0);
    swatch('Total raised, where no valuation is disclosed', true, 3.75, 1.5);
    swatch('Selected company', false, 6, 0, true);
  } else {
    const events = expectedTimelineEvents(filtered).map(event => ({
      ...event,
      company: filtered.find(company => company.id === event.companyId)!
    }));
    if (!same(row.marks.map(mark => mark.companyId), events.map(event => event.companyId)) || !same(row.timelineRows.map(item => item.companyId), events.map(event => event.companyId))) errors.push('timeline plot/list population differs');
    const dates = events.map(event => event.date).sort(),
      day = (date: string) => Date.parse(date) / 86400000,
      loX = day(dates[0].slice(0, 4) + '-01-01'),
      hiX = day(String(Number(dates.at(-1)!.slice(0, 4)) + 1) + '-01-01');
    const amounts = events.flatMap(event => event.company.latestRound?.amountUsd == null ? [] : [event.company.latestRound.amountUsd]);
    const lo = amounts.length ? Math.floor(Math.log10(Math.min(...amounts))) : 6,
      hi = amounts.length ? Math.ceil(Math.log10(Math.max(...amounts))) : 9;
    for (const event of events) {
      const mark = row.marks.find(mark => mark.companyId === event.companyId),
        list = row.timelineRows.find(item => item.companyId === event.companyId);
      if (!mark || !list) continue;
      const amount = event.company.latestRound?.amountUsd ?? null,
        x = 72 + (day(event.date) - loX) / (hiX - loX) * (width - 88),
        y = amount === null ? 214 : 174 - (Math.log10(amount) - lo) / Math.max(1, hi - lo) * 152;
      const r = row.state === 'selected' && event.companyId === MAP_DATA_SELECTED ? 5.5 : amount === null ? 3 : 3.5;
      if (!near(mark.cx, x) || !near(mark.cy, y) || !near(mark.r, r)) errors.push(event.companyId + ': timeline coordinate/size differs');
      paint(mark, amount === null, row.state === 'selected' && event.companyId === MAP_DATA_SELECTED, 1.25);
      if (!list.text.includes(event.companyName) || !list.text.includes(formatShortDate(event.date)) || !list.text.includes(amount === null ? absentState(event.company, 'round.amountUsd') === 'not-applicable' ? 'n/a' : 'not disclosed' : formatUsd(amount))) errors.push(event.companyId + ': timeline list loses a plotted fact');
    }
    if (!/Disclosed amount/.test(row.legendText) || !/Amount undisclosed/.test(row.legendText) || !/Selected company/.test(row.legendText) || !/Undisclosed/.test(row.plotText)) errors.push('timeline legend omits a value/unknown/highlight encoding');
    swatch('Disclosed amount', false, 3.5, 0);
    swatch('Amount undisclosed', true, 3, 1.25);
    swatch('Selected company', false, 5.5, 0, true);
  }
  return errors;
}
export function mapStateStyleProblems(row: MapDataView): Record<string, string[]> {
  const errors: Record<string, string[]> = {
    'VAL-B2-MAP-003': [],
    'VAL-B2-MAP-004': [],
    'VAL-B2-MAP-006': [],
    'VAL-B2-MAP-008': []
  };
  for (const control of row.selections) {
    if (control.semantic === null) errors['VAL-B2-MAP-003'].push(control.id + ': selected state has no semantic attribute');
    if (control.selectedMark) {
      if (control.markRadius === null || control.markRadius < 5.5) errors['VAL-B2-MAP-003'].push(control.id + ': selected plot mark has no size cue');
    } else if (control.foreground !== 'rgb(28, 28, 26)' || control.background !== 'rgba(0, 0, 0, 0)' || control.radius !== 0 || !control.underline && !control.borders.some((width, index) => width === 1 && control.borderColours[index] === 'rgb(28, 28, 26)')) errors['VAL-B2-MAP-003'].push(control.id + ': selected control lacks unfilled ink plus an ink rule/underline');
    if (control.expanded === 'true' && !control.controls) errors['VAL-B2-MAP-003'].push(control.id + ': open company does not name its detail');
  }
  if (row.state === 'selected' && !row.selections.some(control => control.expanded === 'true')) errors['VAL-B2-MAP-003'].push('selected company lacks an expanded native/control equivalent');
  errors['VAL-B2-MAP-004'].push(...row.accents.filter(paint => paint.role === null).map(paint => 'unregistered accent ' + paint.element), ...row.retired.map(paint => 'retired paint ' + paint));
  for (const link of row.links) if (link.colour !== 'rgb(28, 28, 26)' || !link.underline) errors['VAL-B2-MAP-004'].push('detail link is not underlined ink: ' + link.text);
  if (row.state === 'selected') {
    if (!row.sheet) errors['VAL-B2-MAP-006'].push('selected company has no measured detail surface');else {
      if (!row.sheet.closeName || !row.sheet.closeWorked || !row.sheet.focusRestored) errors['VAL-B2-MAP-006'].push('details are not dismissible with retained focus');
      if (row.sheet.modal) {
        if (row.sheet.tabEscaped) errors['VAL-B2-MAP-006'].push('modal detail lets focus escape');
      } else {
        if (row.sheet.controlGeometry.some(control => control.overlaps)) errors['VAL-B2-MAP-006'].push('nonmodal detail obscures required controls');
        if (!row.sheet.tabEscaped) errors['VAL-B2-MAP-006'].push('nonmodal detail traps keyboard focus');
      }
    }
  }
  if (row.countText !== (row.state === 'filtered' ? expectedCompanies({
    segment: 'humanoids'
  }).length : COMPANIES.length) + ' of ' + COMPANIES.length + ' companies') errors['VAL-B2-MAP-008'].push('map count differs from canonical filtered records');
  if (row.documentOverflow > .5 || !same(row.renderedIds, expectedRenderedIds(row.state === 'filtered' ? {
    segment: 'humanoids'
  } : {}, row.view))) errors['VAL-B2-MAP-008'].push('responsive map loses records or overflows');
  return errors;
}
export function mapLogoProblems(root: string, row: MapDataLogo): Record<string, string[]> {
  const treatment: string[] = [],
    provenance: string[] = [],
    image = IMAGES.find(image => image.id === row.imageId);
  if (!image) throw Error('unregistered map mark ' + row.imageId);
  const hash = createHash('sha256').update(readFileSync(join(root, 'public', image.file))).digest('hex');
  if (legalBasis(image) !== 'official-identification-use' || !image.sourceUrl || !image.creator || !image.retrieved || !attributionText(image)) provenance.push('official mark provenance is incomplete');
  if (!MARK_PLACEMENT[image.id] || !hash.startsWith(MARK_PLACEMENT[image.id].sha256)) provenance.push('source mark bytes differ from measured preservation hash');
  if (row.file !== image.file || !row.mask.includes(image.file) || row.mode !== markInk(image.id)) provenance.push('rendered mask is not its exact registered source treatment');
  if (row.filter !== 'none' || row.inkFilter !== 'none' || row.shadow !== 'none' || row.borders.some(width => width !== 0) || row.padding.some(width => width !== 0) || row.background !== 'rgba(0, 0, 0, 0)') treatment.push('company mark paints an unapproved plate/effect');
  if (row.ink !== 'rgb(108, 107, 102)' || contrastRatio('#6C6B66', '#FAFAF8') < 3 || row.width <= 0 || row.height < 10 || row.fill < .02 || row.fill >= BLOCK_FILL) treatment.push('company mark is wrong-ink, too small, blank or block-filled');
  return {
    'VAL-B2-MAP-007': treatment,
    'VAL-B2-MAP-010': provenance
  };
}

/** Company inventory includes a documented withheld file. It is retained
 * explicitly, with its exact bytes/reason, rather than disappearing from
 * the canonical company population when no mark is painted. */
export function mapCompanyMarkProvenance(root: string, company: Company) {
  const failures: string[] = [];
  const image = IMAGES.find(image => image.id === company.logo);
  if (!company.logo || !image) return {
    failures: ['company has no registered mark or typed withholding'],
    observed: {
      companyId: company.id,
      imageId: company.logo
    }
  };
  const hash = createHash('sha256').update(readFileSync(join(root, 'public', image.file))).digest('hex'),
    withheld = WITHHELD_MARKS[image.id];
  if (withheld) {
    if (hash !== withheld.sha256 || !withheld.reason.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(withheld.recorded)) failures.push('withheld mark bytes or reason differ from the reviewed exception');
    return {
      failures,
      observed: {
        companyId: company.id,
        imageId: image.id,
        hash,
        withheld
      },
      notApplicable: {
        reason: 'The registered source file is withheld and is rendered on neither surface: ' + withheld.reason
      }
    };
  }
  if (legalBasis(image) !== 'official-identification-use' || !image.sourceUrl || !image.creator || !/^\d{4}-\d{2}-\d{2}$/.test(image.retrieved) || !attributionText(image)) failures.push('official mark source/owner/retrieval/attribution is incomplete');
  if (!MARK_PLACEMENT[image.id] || !hash.startsWith(MARK_PLACEMENT[image.id].sha256)) failures.push('company mark bytes differ from measured source hash');
  return {
    failures,
    observed: {
      companyId: company.id,
      imageId: image.id,
      sourceUrl: image.sourceUrl,
      owner: image.creator,
      retrieved: image.retrieved,
      legalBasis: legalBasis(image),
      hash
    }
  };
}
