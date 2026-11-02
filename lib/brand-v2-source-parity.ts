import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { BrandV2Registry } from './brand-v2-runners.ts';
import type { InteractiveLedgerEvidence } from './brand-v2-interactive-ledger.ts';
import { INTERACTIVE_DATA_CLASSIFICATION } from './brand-v2-interactive-data.ts';
import { RELEASE_FRAME_DATA_PATH, type RawFrameData, type ReleaseFrameArtifact } from './brand-v2-release-frame-data.ts';
import { SourceOracleContext, normalized } from './brand-v2-source-oracle-core.ts';
import { SOURCE_ORACLES } from './brand-v2-source-oracles.ts';
import { getCitation } from '../data/citations.ts';

export type SourceParityVerdict = { failures: string[]; observed: unknown; evidencePaths: string[]; notApplicable?: { reason: string } };

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
    const failures: string[] = [], readings: Array<{ state: string; checks: unknown[] }> = [];
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
        readings.push({ state: state.id, checks: context.checks });
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
