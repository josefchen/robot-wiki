import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { COMPANIES } from '../data/companies.ts';
import { configurationFingerprint, implementsState, stateCensusText, type StateCase } from './brand-v2-census.ts';
import { componentElementTree, importedNames } from './brand-v2-jsx-elements.ts';
import { buildInteractiveExecutionPlan, type BrandV2Registry } from './brand-v2-runners.ts';
import { interactiveCapturePlan, PLAIN_TABLE_SOURCES } from './brand-v2-interactive-captures.ts';
import { INTERACTIVE_DATA_CLASSIFICATION, NA_CELL_FAMILIES, STATUS_LABEL_EXCEPTIONS, STATUS_LABEL_VOCABULARY, classifyLegendText, classifyResolvedPaint, labelledSeriesIds } from './brand-v2-interactive-data.ts';
import type { InteractiveLedgerEvidence, InteractiveLedgerPlan } from './brand-v2-interactive-ledger.ts';
import { marketMapCaseVerdicts, type MarketMapStatePlan, type MarketMapStatesEvidence } from './brand-v2-market-map-states.ts';
import { TABLE_MATH_EVIDENCE_PATH, tableContainmentVerdicts, type TableMathEvidence } from './brand-v2-table-math-evidence.ts';
import type { FigureRuntimeEvidence } from './brand-v2-figure-evidence.ts';
import type { ControlStatesEvidence } from './brand-v2-control-states-evidence.ts';
import { readReleaseStateIndex, type ReleaseStateIndex } from './brand-v2-release-index.ts';
import { releaseStateArtifactSchema, releaseStateProblems, releaseArtifactHash, type ReleaseProfile } from './brand-v2-release-evidence.ts';
import { readReleaseFrameData, RELEASE_FRAME_DATA_PATH, type RawFrameData, type ReleaseFrameArtifact } from './brand-v2-release-frame-data.ts';
import { readReleaseMapKeyboard } from './brand-v2-release-map-keyboard.ts';
import { readReleaseMapData, mapCompanyRecordProblems, mapGeometryProblems, mapStateStyleProblems, mapLogoProblems, mapCompanyMarkProvenance, RELEASE_MAP_DATA_PATH, type ReleaseMapData } from './brand-v2-release-map-data.ts';
import { readReleasePlayground, playgroundReadingProblems, playgroundTransitionProblems, RELEASE_PLAYGROUND_PATH, type ReleasePlaygroundArtifact } from './brand-v2-release-playground.ts';
import { currentStateDescriptionProblems, persistentInputLabelProblems, segmentedControlProblems, targetSizeProblems, type ReleaseTargetRegistry, type ReleaseInteractionDetails } from './brand-v2-release-interaction-details.ts';
import { authoredArticleTables, authoredTableProblems } from './brand-v2-release-authored-tables.ts';
const PREFIX = 'lib/brand-v2-release-interaction-evidence.ts#';
const suffix = (family: string, n: number) => 'VAL-B2-' + family + '-' + String(n).padStart(3, '0');
export const ASSERTION_POPULATION_SOURCES: Readonly<Record<string, string>> = {
  ...Object.fromEntries(Array.from({
    length: 10
  }, (_, i) => [suffix('MAP', i + 1), PREFIX + 'map-' + String(i + 1).padStart(3, '0')])),
  ...Object.fromEntries(Array.from({
    length: 13
  }, (_, i) => [suffix('PLAY', i + 1), PREFIX + 'play-' + String(i + 1).padStart(3, '0')])),
  ...Object.fromEntries([1, 3, 4, 5, 6, 9, 10, 11, 13, 15].map(i => [suffix('VIZ', i), PREFIX + 'viz-' + String(i).padStart(3, '0')])),
  ...Object.fromEntries([3, 4, 9, 10, 14].map(i => [suffix('COMP', i), PREFIX + 'comp-' + String(i).padStart(3, '0')]))
};
export type SourceParityVerdict = {
  failures: string[];
  observed: unknown;
  evidencePaths: string[];
  notApplicable?: {
    reason: string;
  };
};
export type InteractionVerdict = {
  id: string;
  failures: string[];
  observed: unknown;
  evidencePaths: string[];
  mode: 'automated-machine' | 'browser-state' | 'autonomous-visual';
  notApplicable?: {
    reason: string;
  };
};
export type ReleaseInteractionInput = {
  root: string;
  registry: BrandV2Registry;
  mapPlan: MarketMapStatePlan;
  mapEvidence: MarketMapStatesEvidence;
  ledgerPlan: InteractiveLedgerPlan;
  ledgerEvidence: InteractiveLedgerEvidence;
  controls: ControlStatesEvidence;
  tableMath: TableMathEvidence;
  figures: FigureRuntimeEvidence;
  stateIndex?: ReleaseStateIndex;
  frameData?: unknown;
  mapData?: unknown;
  playground?: unknown;
  sourceParity: ReadonlyMap<string, SourceParityVerdict>;
  tableParity?: ReadonlyMap<string, SourceParityVerdict>;
};
const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && new Set(a).size === a.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
const tidy = (text: string) => text.replace(/[^a-z0-9]/gi, '').toLowerCase();
const row = (id: string, failures: string[], observed: unknown, evidencePaths: string[], mode: InteractionVerdict['mode'] = 'browser-state'): InteractionVerdict => ({
  id,
  failures,
  observed,
  evidencePaths,
  mode
});
function files(root: string, dir: string): string[] {
  return readdirSync(join(root, dir), {
    withFileTypes: true
  }).flatMap(entry => entry.isDirectory() ? files(root, dir + '/' + entry.name) : entry.isFile() ? [dir + '/' + entry.name] : []).sort();
}

/** Independent physical source exports and authored JSX mounts. The registry
 * cannot hide a missing source/mount by deleting the same entry twice. */
export function independentInteractionCensus(root: string) {
  const sources = files(root, 'components/interactive').filter(path => /\.tsx?$/.test(path)).map(path => {
    const text = readFileSync(join(root, path), 'utf8'),
      component = /^export function ([A-Z][A-Za-z0-9]*)/m.exec(text)?.[1];
    if (!component) throw Error('interactive source has no exported component ' + path);
    return {
      id: 'interactive:' + component,
      component,
      path
    };
  });
  const byComponent = new Map(sources.map(source => [source.component, source]));
  const mounts: Array<{
    id: string;
    sourceId: string;
    route: string;
    ownerPath: string;
    props: string;
    ordinal: number;
  }> = [];
  for (const ownerPath of [...files(root, 'content').filter(path => path.endsWith('.mdx')), 'app/page.tsx']) {
    const text = readFileSync(join(root, ownerPath), 'utf8'),
      imports = importedNames(text),
      names = new Set(imports.keys()),
      ordinals = new Map<string, number>();
    for (const node of componentElementTree({
      text,
      path: ownerPath,
      componentNames: names
    })) {
      const imported = imports.get(node.name);
      if (!imported?.startsWith('@/components/interactive/')) continue;
      const source = byComponent.get(node.name);
      if (!source) throw Error('authored interactive mount lacks physical export ' + node.name);
      const ordinal = (ordinals.get(node.name) ?? 0) + 1;
      ordinals.set(node.name, ordinal);
      const route = ownerPath === 'app/page.tsx' ? '/' : '/' + ownerPath.replace(/^content\//, '').replace(/\.mdx$/, '/');
      mounts.push({
        id: `mount:${route}:${node.name}:${ordinal}`,
        sourceId: source.id,
        route,
        ownerPath,
        props: node.attributes.replace(/\s+/g, ' ').trim(),
        ordinal
      });
    }
  }
  if (!sources.length || !mounts.length) throw Error('empty independent interactive census');
  return {
    sources,
    mounts
  };
}
export function frameAccentProblems(frame: RawFrameData, sourceId: string): string[] {
  const failures = frame.retiredMarks.map(mark => 'retired geometry paint ' + mark.paint + ' at ' + mark.at);
  failures.push(...frame.accentMarks.filter(mark => !mark.onRole).map(mark => 'accent bypasses highlight/lit role at ' + mark.at));
  const spec = INTERACTIVE_DATA_CLASSIFICATION[sourceId];
  if (!spec) return [...failures, 'source has no data/model/schematic classification'];
  const accent = [...new Set(frame.accentMarks.flatMap(mark => mark.seriesId ? [mark.seriesId] : []))],
    lead = spec.leadSeriesId;
  if (lead && accent.some(id => id !== lead) || !lead && accent.length > 1) failures.push('accent paints more than the single registered lead series');
  if (lead) {
    const series = frame.series[lead];
    if (!series) failures.push('registered lead series has no rendered marks');else for (const paint of series.paints) {
      const token = classifyResolvedPaint(paint);
      if (['accent', 'error', 'warn', 'ok', 'text', 'text-dim', 'retired'].includes(token) && !(spec.leadPaints ?? ['accent'] as readonly string[]).includes(token)) failures.push('lead series paints unregistered token ' + token);
    }
  }
  return failures;
}
export function frameLegendProblems(frame: RawFrameData): string[] {
  const failures: string[] = [],
    named = labelledSeriesIds(frame.labels);
  for (const item of frame.legend) {
    if (classifyLegendText(item.text) !== 'named') failures.push('legend relies on colour name or empty text: ' + item.text);
    const marks = item.seriesId ? frame.series[item.seriesId] : null;
    if (item.seriesId && !marks) failures.push('legend names a missing series ' + item.seriesId);
    if (item.swatch && marks) {
      for (const paint of [item.swatch.fill, item.swatch.stroke]) {
        if (!paint) continue;
        const token = classifyResolvedPaint(paint);
        if (['accent', 'error', 'warn', 'ok', 'text', 'text-dim', 'retired'].includes(token) && !marks.paints.some(value => classifyResolvedPaint(value) === token)) failures.push(item.seriesId + ': legend token differs from marks');
      }
      if (item.swatch.dash && !marks.geometries.some(geometry => geometry.includes('dashed'))) failures.push(item.seriesId + ': legend dash differs from marks');
    }
  }
  for (const seriesId of Object.keys(frame.series)) if (!named.has(seriesId)) failures.push('plotted series has no visible bound name ' + seriesId);
  return failures;
}
export function frameUnknownProblems(frame: RawFrameData, sourceId: string): string[] {
  const failures: string[] = [];
  for (const table of frame.tables) {
    if (table.blankCellCount > 0) failures.push('blank ambiguous table values');
    for (const cell of table.naCells) if (!NA_CELL_FAMILIES.some(family => family.sourceId === sourceId && family.column.toLowerCase() === cell.column.toLowerCase())) failures.push('unregistered n/a source state in ' + cell.column);
    if (table.approxCellCount > 0 && !/(estimate|not a published|interpolat|extrapolat|approximat|approx\.|about |roughly)/i.test(frame.text)) failures.push('estimated values lack adjacent qualification');
  }
  return failures;
}
export function tableSemanticProblems(table: ReleaseInteractionDetails['tables'][number]): string[] {
  const failures: string[] = [];
  if (!table.name.trim() || !table.headers.length || !table.cells.length) failures.push('table lacks a name, headers or actual cells');
  if (table.unassociated.length) failures.push('table headers lack associations: ' + table.unassociated.join(', '));
  if (table.sortButtons > 0 && table.ariaSort === 0) failures.push('sortable headers lack aria-sort');
  const groups = Map.groupBy(table.cells, cell => cell.column);
  for (const [column, cells] of groups) {
    const values = cells.filter(cell => !/^(not disclosed|n\/a)$/i.test(cell.text));
    if (values.length && values.every(cell => /^[$€£~]?[+−-]?[\d.,]+(?:%|\s*(?:ms|s|Hz|GB|MB|M|B))?$/.test(cell.text)) && values.some(cell => cell.align !== 'right')) failures.push('numeric column is not right-aligned: ' + column);
  }
  if (table.scroll && table.scroll.scrollWidth > table.scroll.width + 1 && (table.scroll.tabIndex !== 0 || !table.scroll.name.trim())) failures.push('overflowing table lacks a labelled focusable scroll region');
  return failures;
}
type ProfileRow = {
  id: string;
  route: string;
  state: string;
  profile: ReleaseProfile;
  path: string;
};
function profileRows(root: string, index: ReleaseStateIndex): ProfileRow[] {
  return index.groups.flatMap(group => {
    if (releaseArtifactHash(root, group.path) !== group.sha256) throw Error('state index group bytes changed while joining interactions');
    const artifact = releaseStateArtifactSchema.parse(JSON.parse(readFileSync(join(root, group.path), 'utf8')));
    const problems = releaseStateProblems(artifact, {
      fingerprint: index.sourceFingerprint,
      exportFingerprint: index.exportFingerprint,
      group: group.group,
      stateIds: group.stateIds
    });
    if (problems.length) throw Error('invalid indexed interaction states: ' + problems.join('; '));
    return artifact.cases.flatMap(state => state.profiles.map(profile => ({
      id: state.id + '|profile:' + profile.id,
      route: state.route,
      state: state.id,
      profile,
      path: group.path
    })));
  });
}
function caseSetProblems(cases: readonly StateCase[], expected: number, source: string): string[] {
  const failures: string[] = [];
  if (!cases.length || cases.length !== expected || new Set(cases.map(c => c.id)).size !== cases.length) failures.push('empty, duplicate or inexact bounded case set');
  for (const c of cases) if (c.kind === 'exception' && !c.notApplicableReason?.trim()) failures.push(c.id + ': untyped not-applicable state');
  for (const state of ['loading', 'error', 'empty', 'unavailable'] as const) {
    const implemented = implementsState(source, state),
      witness = cases.find(c => c.id === state + '-witness'),
      absent = cases.find(c => c.id === state + '-not-applicable');
    if (implemented && !witness || !implemented && !absent) failures.push(state + ': source implementation and typed witness differ');
  }
  return failures;
}
export function collectReleaseInteractionEvidence(input: ReleaseInteractionInput) {
  const {
      root,
      registry
    } = input,
    execution = buildInteractiveExecutionPlan(registry),
    census = independentInteractionCensus(root),
    capturePlan = interactiveCapturePlan(registry);
  const frameData: ReleaseFrameArtifact = readReleaseFrameData(root, execution.mounts, input.frameData),
    mapData: ReleaseMapData = readReleaseMapData(root, input.mapData),
    play: ReleasePlaygroundArtifact = readReleasePlayground(root, input.playground);
  const index = input.stateIndex ?? readReleaseStateIndex(root);
  if (index.sourceFingerprint !== frameData.sourceFingerprint || index.exportFingerprint !== frameData.exportFingerprint) throw Error('indexed states and current numerical/frame export differ');
  const profiles = profileRows(root, index),
    keyboard = readReleaseMapKeyboard(root, input.mapPlan);
  const sourceIds = [...execution.mounts.map(m => m.id), ...capturePlan.sources.filter(source => source.mountIds.length === 0).map(source => source.sourceId)];
  if (!same([...input.sourceParity.keys()], sourceIds)) throw Error('source parity does not cover exact mounts and unmounted sources');
  const populations: Record<string, string[]> = {},
    verdicts: Record<string, InteractionVerdict[]> = {};
  const emit = (assertion: string, rows: InteractionVerdict[]) => {
    if (!rows.length || new Set(rows.map(row => row.id)).size !== rows.length) throw Error(assertion + ': empty or duplicate measured population');
    const source = ASSERTION_POPULATION_SOURCES[assertion];
    if (!source) throw Error('unowned interaction assertion ' + assertion);
    populations[source] = rows.map(row => row.id);
    verdicts[assertion] = rows;
  };
  const parity = (id: string) => input.sourceParity.get(id)!;
  const unmountedSources = new Set(capturePlan.sources.filter(source => source.mountIds.length === 0).map(source => source.sourceId));
  emit(suffix('VIZ', 13), sourceIds.map(id => {
    const proof = parity(id),
      failures = [...proof.failures];
    if (proof.notApplicable && !unmountedSources.has(id)) failures.push('a production mount cannot bypass source/render parity through a not-applicable reason');
    if (unmountedSources.has(id) && !proof.notApplicable?.reason.trim()) failures.push('unmounted source lacks its explicit source-bound applicability reason');
    if (!proof.evidencePaths.length || proof.observed === null || proof.observed === undefined) failures.push('source/render parity has no inspectable observed evidence');
    return {
      ...row(id, failures, proof.observed, proof.evidencePaths),
      ...(proof.notApplicable && unmountedSources.has(id) ? {
        notApplicable: proof.notApplicable
      } : {})
    };
  }));
  const canonicalSourceIds = new Set(census.sources.map(source => source.id)),
    canonicalMounts = new Map(census.mounts.map(mount => [mount.id, mount]));
  const parityErrors = [...(!same(execution.sources.map(source => source.id), [...canonicalSourceIds]) ? ['physical source exports and registry differ'] : []), ...(!same(execution.mounts.map(mount => mount.id), [...canonicalMounts.keys()]) ? ['authored JSX mounts and registry differ'] : [])];
  emit(suffix('VIZ', 10), [...execution.sources, ...execution.mounts].map(member => {
    const failures = [...parityErrors];
    if ('sourceId' in member) {
      const expected = canonicalMounts.get(member.id);
      if (!expected || ['sourceId', 'route', 'ownerPath', 'props', 'ordinal'].some(key => member[key as keyof typeof member] !== expected[key as keyof typeof expected])) failures.push('mount identity/props/ordinal differs from authored JSX');
      if (frameData.frames.filter(frame => frame.mountId === member.id).length !== 2) failures.push('rendered mount lacks both widths');
    } else if (!canonicalSourceIds.has(member.id)) failures.push('source export missing');
    const {
      fingerprint,
      ...body
    } = member;
    if (configurationFingerprint(body) !== fingerprint) failures.push('registry configuration fingerprint differs');
    return row(member.id, failures, {
      source: 'sourceId' in member ? member.sourceId : member.id,
      renderedMounts: frameData.mountIds.filter(id => id === member.id).length
    }, ['contract/brand-v2-registries.json', RELEASE_FRAME_DATA_PATH], 'automated-machine');
  }));
  emit(suffix('VIZ', 11), [...execution.sources, ...execution.mounts].map(member => {
    const source = 'sourceId' in member ? execution.sources.find(source => source.id === member.sourceId)! : member;
    const text = readFileSync(join(root, source.sourcePath!), 'utf8'),
      failures = caseSetProblems(member.cases, member.expectedCaseCount, stateCensusText(text));
    if ('sourceId' in member) {
      const observation = input.ledgerEvidence.observations.find(row => row.mountId === member.id);
      if (!observation) failures.push('no exact executed keyboard case ledger');else {
        for (const c of observation.cases) if (c.status === 'missing' || c.status === 'observed' && c.records === 0) failures.push(c.caseId + ': missing actual case readings');
        if (!same(observation.cases.map(c => c.caseId), member.cases.map(c => c.id))) failures.push('executed case population differs');
      }
    }
    return row(member.id, failures, {
      cases: member.cases,
      expected: member.expectedCaseCount
    }, ['contract/brand-v2-registries.json', 'evidence/brand-v2/interactive-ledger.json'], 'automated-machine');
  }));
  const frames: Array<{
    id: string;
    mountId: string;
    sourceId: string;
    route: string;
    routeText: string;
    frame: RawFrameData | null;
    path: string;
  }> = frameData.frames.map(frame => ({
    id: frame.mountId + '|' + frame.viewport,
    mountId: frame.mountId,
    sourceId: frame.sourceId,
    route: frame.route,
    routeText: frame.routeText,
    frame,
    path: RELEASE_FRAME_DATA_PATH
  }));
  for (const observation of input.ledgerEvidence.observations) {
    const mount = execution.mounts.find(mount => mount.id === observation.mountId)!;
    frames.push({
      id: mount.id + '|ledger:default',
      mountId: mount.id,
      sourceId: mount.sourceId,
      route: mount.route,
      routeText: '',
      frame: observation.default.series?.frame ?? null,
      path: 'evidence/brand-v2/interactive-ledger.json'
    });
    observation.transitions.forEach((transition, i) => {
      if (transition.series !== null) frames.push({
        id: mount.id + '|ledger:transition:' + i,
        mountId: mount.id,
        sourceId: mount.sourceId,
        route: mount.route,
        routeText: '',
        frame: transition.series.frame ?? null,
        path: 'evidence/brand-v2/interactive-ledger.json'
      });
    });
  }
  emit(suffix('VIZ', 3), frames.map(f => row(f.id, f.frame ? frameAccentProblems(f.frame, f.sourceId) : ['raw frame discarded from an actual measured state'], {
    sourceId: f.sourceId,
    accentMarks: f.frame?.accentMarks,
    retiredMarks: f.frame?.retiredMarks
  }, [f.path])));
  emit(suffix('VIZ', 4), frames.map(f => row(f.id, f.frame ? frameLegendProblems(f.frame) : ['raw frame missing'], f.frame ? [f.frame.legend, f.frame.series, f.frame.labels] : null, [f.path])));
  emit(suffix('VIZ', 5), frames.map(f => row(f.id, [...(f.frame ? frameUnknownProblems(f.frame, f.sourceId) : ['raw source-value frame missing']), ...parity(f.mountId).failures], {
    frame: f.frame,
    sourceParity: parity(f.mountId).observed
  }, [f.path, ...parity(f.mountId).evidencePaths])));
  emit(suffix('VIZ', 6), frames.map(f => {
    const spec = INTERACTIVE_DATA_CLASSIFICATION[f.sourceId],
      failures: string[] = [];
    if (!f.frame || !spec) failures.push('raw frame or generation classification missing');else if (spec.kind !== 'source-data' && !STATUS_LABEL_VOCABULARY.source.test(f.frame.text)) {
      const exception = STATUS_LABEL_EXCEPTIONS[f.sourceId];
      if (!exception || exception.reason !== 'labelled-in-adjacent-prose' || !exception.routes?.includes(f.route) || !exception.adjacentProse?.test(f.routeText)) failures.push('generated/schematic state lacks its explicit classification label');
    }
    return row(f.id, failures, {
      kind: spec?.kind,
      text: f.frame?.text
    }, [f.path, 'lib/brand-v2-interactive-data.ts']);
  }));
  const interactiveProfiles = profiles.filter(p => execution.mounts.some(mount => p.state.startsWith(mount.id + '|')));
  // Group names encode the mount; the raw state IDs are owned by the exact
  // ledger state-index derivation, not selected by a screenshot subset.
  const allInstrumentProfiles = profiles.filter(p => execution.mounts.some(mount => mount.route === p.route) || p.route === '/playground/');
  const descriptionProblems = (p: ProfileRow) => {
    const failures = currentStateDescriptionProblems(p.profile.interaction),
      target = execution.mounts.find(mount => p.state.startsWith(mount.id + '|'));
    if (target) {
      if (PLAIN_TABLE_SOURCES.has(target.sourceId)) {
        if (!p.profile.interaction.tables.length) failures.push('registered table instrument disappeared from its actual state');
      } else {
        const component = execution.sources.find(source => source.id === target.sourceId)!.component;
        if (!p.profile.interaction.instruments.some(instrument => tidy(instrument.component) === tidy(component))) failures.push('registered instrument disappeared from its actual state: ' + target.id);
      }
    } else if (p.route === '/playground/' && !p.state.includes('fallback') && p.profile.interaction.instruments.length === 0) failures.push('playground current-state description disappeared');
    return failures;
  };
  emit(suffix('VIZ', 1), allInstrumentProfiles.map(p => row(p.id, descriptionProblems(p), p.profile.interaction.instruments, [p.path])));
  const reduced = allInstrumentProfiles.filter(p => p.profile.id === 'reduced-motion');
  emit(suffix('VIZ', 9), reduced.map(p => row(p.id, [...(!p.profile.reducedMotion || !p.profile.motion ? ['missing actual reduced-motion measurement'] : []), ...(p.profile.motion && p.profile.motion.geometryBefore !== p.profile.motion.geometryAfter ? ['drawing moved without input in reduced motion'] : []), ...p.profile.hiddenRequiredContent, ...descriptionProblems(p)], {
    motion: p.profile.motion,
    availability: p.profile.disclosures,
    instruments: p.profile.interaction.instruments
  }, [p.path])));
  emit(suffix('VIZ', 15), [...frames.map(f => row(f.id, f.frame && f.frame.canvasCount === 0 ? [] : ['interactive canvas requires an independent source/coordinate/DPR probe'], {
    canvasCount: f.frame?.canvasCount ?? null
  }, [f.path])), ...play.readings.filter(reading => reading.profile !== 'unavailable').map(reading => row('playground:' + reading.id, playgroundReadingProblems(root, reading)[suffix('PLAY', 12)], {
    buffer: reading.buffer,
    model: reading.model,
    hand: reading.hand,
    pixels: reading.pixels
  }, [RELEASE_PLAYGROUND_PATH]))]);
  const controls = registry.controls as unknown as ReleaseTargetRegistry;
  emit(suffix('COMP', 3), profiles.filter(p => p.profile.interaction.segmented.length > 0).map(p => row(p.id, segmentedControlProblems(p.profile.interaction), p.profile.interaction.segmented, [p.path])));
  emit(suffix('COMP', 4), profiles.filter(p => p.profile.interaction.inputs.length > 0).map(p => row(p.id, persistentInputLabelProblems(p.profile.interaction), p.profile.interaction.inputs, [p.path])));
  emit(suffix('COMP', 14), profiles.map(p => row(p.id, targetSizeProblems(p.profile.interaction, controls), p.profile.interaction.targets, [p.path, 'contract/brand-v2-registries.json'])));
  const tables = profiles.flatMap(p => p.profile.interaction.tables.map(table => ({
    p,
    table,
    id: p.id + '|' + table.id
  })));
  const containment = [...tableContainmentVerdicts(input.tableMath)].map(([id, verdict]) => row('containment:' + id, verdict.failures, verdict.observed, [TABLE_MATH_EVIDENCE_PATH]));
  emit(suffix('COMP', 9), [...tables.map(({
    p,
    table,
    id
  }) => row(id, tableSemanticProblems(table), table, [p.path])), ...containment]);
  const sourceTables = new Map<string, ReturnType<typeof authoredArticleTables>>();
  emit(suffix('COMP', 10), tables.map(({
    p,
    table,
    id
  }) => {
    const mount = execution.mounts.find(mount => mount.route === p.route && tidy(execution.sources.find(source => source.id === mount.sourceId)!.component) === tidy(table.frame));
    let proof: SourceParityVerdict | undefined = mount ? parity(mount.id) : input.tableParity?.get('table:' + p.route + ':' + table.name);
    if (!proof) {
      let authored = sourceTables.get(p.route);
      if (!authored) {
        authored = authoredArticleTables(root, p.route);
        sourceTables.set(p.route, authored);
      }
      const matching = authored.filter(source => JSON.stringify(source.headers) === JSON.stringify(table.headers));
      if (matching.length) {
        const comparisons = matching.map(source => authoredTableProblems(source, table));
        proof = {
          failures: comparisons.find(failures => !failures.length) ?? comparisons[0],
          observed: {
            sourceTables: matching,
            actual: table.cells
          },
          evidencePaths: ['content' + p.route.slice(0, -1) + '.mdx']
        };
      }
    }
    return row(id, proof?.failures ?? ['source-value oracle missing for this rendered table'], {
      table,
      sourceParity: proof?.observed ?? null
    }, [p.path, ...(proof?.evidencePaths ?? [])]);
  }));
  const mapCaseVerdicts = marketMapCaseVerdicts(input.mapEvidence, input.mapPlan),
    mapById = new Map(mapCaseVerdicts.map(v => [v.id, v]));
  emit(suffix('MAP', 1), [...mapData.records.map(record => row('record:' + record.id, mapCompanyRecordProblems(record), record, [RELEASE_MAP_DATA_PATH, 'data/companies.ts'])), ...mapCaseVerdicts.filter(v => ['filter', 'history'].includes(input.mapEvidence.cases.find(c => c.id === v.id)?.observed.kind ?? '')).map(v => row('state:' + v.id, v.failures, input.mapEvidence.cases.find(c => c.id === v.id)?.observed, ['evidence/brand-v2/market-map-states.json']))]);
  emit(suffix('MAP', 2), mapData.views.filter(view => view.view !== 'grid').map(view => row(view.id, mapGeometryProblems(view), view, [RELEASE_MAP_DATA_PATH, 'data/companies.ts'])));
  for (const id of [3, 4, 6, 8]) emit(suffix('MAP', id), mapData.views.filter(view => id !== 6 || view.state === 'selected').map(view => row(view.id, mapStateStyleProblems(view)[suffix('MAP', id)], view, [RELEASE_MAP_DATA_PATH])));
  emit(suffix('MAP', 5), input.mapPlan.cases.filter(c => c.group === 'tooltip-parity' || c.group === 'selection').map(c => {
    const measured = mapById.get(c.id);
    return row(c.id, measured?.failures ?? ['missing actual tooltip/keyboard/persistent-selection state'], input.mapEvidence.cases.find(record => record.id === c.id)?.observed, ['evidence/brand-v2/market-map-states.json']);
  }));
  for (const id of [7, 10]) emit(suffix('MAP', id), [...(id === 10 ? COMPANIES.map(company => {
    const proof = mapCompanyMarkProvenance(root, company);
    return {
      ...row('company:' + company.id, proof.failures, proof.observed, ['data/companies.ts', 'data/logo-images.ts', 'lib/market-map-marks.ts'], 'automated-machine'),
      ...('notApplicable' in proof ? {
        notApplicable: proof.notApplicable
      } : {})
    };
  }) : []), ...mapData.logos.map(logo => {
    const failures = mapLogoProblems(root, logo)[suffix('MAP', id)];
    if (id === 10) {
      const credits = input.figures.observations.filter(o => o.route === '/credits/' && o.viewport === logo.viewport).flatMap(o => o.figures.filter(f => f.imageId === logo.imageId));
      if (!credits.length || credits.some(credit => !credit.credit.trim() || !credit.creditLinks.length)) failures.push('official mark credit/provenance is absent from rendered credits');
    }
    return row(logo.id, failures, logo, [RELEASE_MAP_DATA_PATH, logo.screenshot, 'data/logo-images.ts']);
  })]);
  emit(suffix('MAP', 9), mapData.records.map(record => row(record.id, mapCompanyRecordProblems(record), {
    fields: record.fields,
    caveat: record.caveat,
    roundSource: record.roundSource,
    sources: record.sources
  }, [RELEASE_MAP_DATA_PATH, 'data/companies.ts'])));
  const playProblems = new Map(play.readings.map(reading => [reading.id, playgroundReadingProblems(root, reading)])),
    transitions = playgroundTransitionProblems(play.readings);
  for (let id = 1; id <= 13; id++) {
    const assertion = suffix('PLAY', id),
      applicable = id === 5 ? play.readings.filter(r => /reset$/.test(r.id)) : id === 7 ? play.readings.filter(r => r.profile === 'reduced-motion') : id === 13 ? play.readings.filter(r => r.id.includes(':trajectory-')) : id === 11 ? play.readings : play.readings.filter(r => r.profile !== 'unavailable');
    emit(assertion, applicable.map(reading => row(reading.id, [...(playProblems.get(reading.id)?.[assertion] ?? []), ...(transitions[assertion] ?? [])], reading, [RELEASE_PLAYGROUND_PATH, 'public/models/so101/so101.urdf', 'lib/playground-canonical-fixture.ts'])));
  }
  // Expose this measured join to A11Y012/EVID009 callers without pretending
  // it is an additional assertion in this module's 38-row ownership.
  return {
    populations,
    verdicts,
    mapKeyboard: keyboard,
    frameData,
    mapData,
    playground: play,
    stateIndex: index,
    interactiveProfileCount: interactiveProfiles.length,
    canonicalCompanies: COMPANIES.length
  };
}
