import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { BrandV2Registry } from './brand-v2-runners.ts';
import type { InteractiveLedgerEvidence } from './brand-v2-interactive-ledger.ts';
import { INTERACTIVE_DATA_CLASSIFICATION } from './brand-v2-interactive-data.ts';
import { RELEASE_FRAME_DATA_PATH, type RawFrameData, type ReleaseFrameArtifact } from './brand-v2-release-frame-data.ts';
import { SourceOracleContext, normalized, printedNumbers } from './brand-v2-source-oracle-core.ts';
import { SOURCE_ORACLES } from './brand-v2-source-oracles.ts';
import { getCitation } from '../data/citations.ts';

export type SourceParityVerdict = { failures: string[]; observed: unknown; evidencePaths: string[]; notApplicable?: { reason: string } };

/** Only RewardShaping's exact stride-preview clock is non-publication data.
 * Its arithmetic and native playback state still have an independent oracle. */
export function strideClockTransitionFailures(input: {
  name: string; keys: readonly string[]; beforeControl: string; afterControl: string;
  before: string; after: string; frame: string;
}): string[] {
  const failures: string[] = [], before = printedNumbers(input.before), after = printedNumbers(input.after), frame = printedNumbers(input.frame);
  for (const [where, text, values] of [['before', input.before, before], ['after', input.after, after], ['frame', input.frame, frame]] as const) {
    if (!/^Preview phase:/.test(text) || !/%$/.test(text) || values.length !== 1 || values[0] < 0 || values[0] > 100) failures.push(`stride clock ${where} lacks an exact bounded preview percentage`);
  }
  if (failures.length) return failures;
  if (after[0] !== frame[0]) failures.push('stride clock ledger and raw frame disagree');
  const activations = input.keys.filter(key => key === 'Space' || key === 'Enter').length;
  let expected = before[0];
  if (/reset/i.test(input.name)) expected = 0;
  else if (/Step the preview forward/.test(input.name)) expected = (before[0] + 5 * activations) % 100;
  else if (/rollout preview/.test(input.name)) {
    if (/label=Stop rollout preview/.test(input.beforeControl)) failures.push('stride Stop requires its separately observed playback-start phase');
    // This ledger runs under reduced motion: one complete stride ends where
    // Play began, with the real control again offering Play.
    if (!/label=Play rollout preview/.test(input.afterControl)) failures.push('stride playback did not return to its declared stopped state');
  }
  if (after[0] !== expected) failures.push(`stride clock expected ${expected}%, observed ${after[0]}%`);
  return failures;
}

/** Exact independent population: each production mount and each source with
 * zero production mounts. Unknown/missing oracle coverage is a hard failure. */
export function collectSourceParity(input: {
  root: string;
  registry: Pick<BrandV2Registry, 'interactive'>;
  frames: ReleaseFrameArtifact;
  ledger: InteractiveLedgerEvidence;
}): ReadonlyMap<string, SourceParityVerdict> {
  const { sources, mounts } = input.registry.interactive;
  if (!sources.length || !mounts.length) throw new Error('empty independent source-parity population');
  const oracles = SOURCE_ORACLES;
  const result = new Map<string, SourceParityVerdict>();
  for (const mount of mounts) {
    const failures: string[] = [], readings: Array<{ state: string; checks: unknown[]; controls?: RawFrameData['controls']; sourceInputs?: RawFrameData['declaredBindings'] }> = [];
    const source = sources.find(({ id }) => id === mount.sourceId);
    const oracle = oracles[mount.sourceId];
    const classification = INTERACTIVE_DATA_CLASSIFICATION[mount.sourceId];
    if (!source || !classification) failures.push('mount lacks a registered, classified source');
    if (!oracle) failures.push(`uncovered source/assumption bindings for ${mount.sourceId}`);
    const frames = input.frames.frames.filter(({ mountId }) => mountId === mount.id);
    if (frames.length !== 2 || new Set(frames.map(({ viewport }) => viewport)).size !== 2) failures.push('expected exactly one default frame at each declared width');
    const ledger = input.ledger.observations.filter(({ mountId }) => mountId === mount.id);
    if (ledger.length !== 1) failures.push('expected exactly one complete keyboard ledger for the mount');
    const states: Array<{ id: string; frame: RawFrameData }> = frames.map((frame) => ({ id: `default:${frame.viewport}`, frame }));
    for (const transition of ledger[0]?.transitions ?? []) {
      if (!transition.series?.frame) failures.push(`transition ${transition.caseId}:${transition.control}:${transition.keys.join('+')} lacks raw numerical frame evidence`);
      else states.push({ id: `${transition.caseId}:${transition.control}:${transition.keys.join('+')}`, frame: transition.series.frame });
    }
    if (oracle?.previewClock && ledger.length === 1) {
      const clock = oracle.previewClock;
      const clockChecks = [];
      for (const transition of ledger[0].transitions) {
        const changes = transition.readouts.filter(reading => reading.key === clock.key);
        const frames = transition.series?.frame?.readouts.filter(reading => reading.key === clock.key) ?? [];
        const control = ledger[0].controls.find(control => control.index === transition.control);
        if (changes.length !== 1 || frames.length !== 1 || !control) { failures.push(`${transition.caseId}: missing exact preview-clock transition population`); continue; }
        const input = { name: control.name, keys: transition.keys, beforeControl: transition.before.control, afterControl: transition.after.control, before: changes[0].before, after: changes[0].after, frame: frames[0].text };
        const problems = strideClockTransitionFailures(input); failures.push(...problems.map(problem => `${transition.caseId}: ${problem}`));
        clockChecks.push({ ...input, failures: problems, publicationParity: 'inapplicable: UI stride clock', motionEvidence: clock.evidencePath });
      }
      readings.push({ state: 'stride-clock-motion-ledger', checks: clockChecks });
    }
    if (oracle) {
      if (!oracle.basis.length) failures.push('oracle has no explicit source or assumption ID');
      for (const basis of oracle.basis) {
        if (!basis.reference.trim()) failures.push(`empty basis reference ${basis.id}`);
        if (basis.kind === 'citation' && !getCitation(basis.id)) failures.push(`unknown source citation ${basis.id}`);
        if (basis.kind === 'assumption' && !basis.id.startsWith(`assumption:${source?.component}:`)) failures.push(`unbound authored assumption ${basis.id}`);
      }
      for (const path of oracle.evidencePaths) if (!existsSync(join(input.root, path))) failures.push(`missing oracle basis file ${path}`);
      for (const state of states) {
        const context = new SourceOracleContext(state.frame, oracle, state.id);
        for (const basis of oracle.basis.filter(({ kind }) => kind === 'citation')) {
          const citation = getCitation(basis.id);
          const linked = state.frame.sourceBindings.some((binding) => binding.citationId === basis.id || binding.href === citation?.url || binding.href === `#ref-${basis.id}`);
          const credit = oracle.citationText?.[basis.id];
          const printed = credit !== undefined && normalized(state.frame.text).includes(normalized(credit));
          context.compare(`source binding ${basis.id}`, citation?.url ?? basis.id, linked ? 'linked' : printed ? credit : 'missing', linked || printed);
        }
        try { oracle.check(context); } catch (error) { context.failures.push(`${state.id}: ${error instanceof Error ? error.message : String(error)}`); }
        context.finish(); failures.push(...context.failures);
        readings.push({ state: state.id, controls: state.frame.controls, sourceInputs: state.frame.declaredBindings, checks: context.checks });
      }
    }
    result.set(mount.id, { failures, observed: { sourceId: mount.sourceId, classification: classification?.kind, basis: oracle?.basis ?? [], nonQuantitative: oracle?.nonQuantitative ?? null, readings }, evidencePaths: [RELEASE_FRAME_DATA_PATH, 'evidence/brand-v2/interactive-ledger.json', ...(oracle?.evidencePaths ?? [])] });
  }
  for (const source of sources.filter((source) => !mounts.some((mount) => mount.sourceId === source.id))) {
    result.set(source.id, { failures: [], observed: { sourcePath: source.sourcePath, productionMounts: 0 }, evidencePaths: ['contract/brand-v2-registries.json'], notApplicable: { reason: `${source.id} has zero production mounts in the independently reconciled registry, so no rendered source value exists to compare.` } });
  }
  if (result.size !== mounts.length + sources.filter((source) => !mounts.some((mount) => mount.sourceId === source.id)).length) throw new Error('duplicate independent source-parity member identity');
  return result;
}
