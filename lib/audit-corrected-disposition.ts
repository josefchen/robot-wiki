/**
 * Finite correction evidence for industrial37/47/48. Not a fourth local-truth
 * category: removal, withdrawal of a ledger-only certification, and the P4
 * conjunction have different obligations. Missing evidence always stays red.
 */
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { createLocalArtifactReader, parseOriginalLedgerSection } from './audit-local-basis.ts';
import { originalClaimDigest, type ClaimRecord } from './audit-ledger.ts';

const text = z.string().min(1);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const file = z.object({ path: text, bytes: z.number().int().positive(), sha256: hash }).strict();
const cells = z.object({ claim: text, sourceChecked: text, verdict: text, note: z.string() }).strict();
const schema = z.object({
  id: text, originalId: text, rowOrdinal: z.union([z.literal(37), z.literal(47), z.literal(48)]),
  kind: z.enum(['removed-assertion', 'withdrawn-audit-certification', 'p4-conjunction']),
  originalCells: cells, originalTupleDigest: hash, snapshot: file,
  currentCells: cells, currentTupleDigest: hash,
  article: file, dependencies: z.array(file).min(1),
  requiredPresent: z.array(text), requiredAbsent: z.array(text),
  execution: file,
  children: z.array(z.object({ rowOrdinal: z.number().int().positive(), digest: hash }).strict()),
  review: z.object({ reviewedBy: text, rationale: text, observedAt: z.string().datetime(),
    inputDigest: hash }).strict(),
}).strict();
export type CorrectedDisposition = z.infer<typeof schema>;
export type CorrectionContext = { root: string; records: CorrectedDisposition[] };
export const correctionDigest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const correctedInputDigest = (record: Omit<CorrectedDisposition, 'review'> | CorrectedDisposition) => {
  const { review: _review, ...input } = record as CorrectedDisposition;
  void _review;
  return correctionDigest(input);
};
export function correctedChildDigest(record: ClaimRecord): string {
  const { line: _line, legacyPointer: _pointer, ...input } = record;
  void _line; void _pointer;
  return correctionDigest(input);
}
export function parseCorrectedDispositions(input: unknown): CorrectedDisposition[] {
  const records = z.array(schema).max(3).parse(input);
  if (new Set(records.map(r => r.rowOrdinal)).size !== records.length ||
      new Set(records.map(r => r.id)).size !== records.length) throw Error('duplicate correction identity');
  return records;
}
export function validateCorrectedDisposition(value: CorrectedDisposition, current: ClaimRecord,
  binding: string, records: readonly ClaimRecord[], context: CorrectionContext): string[] {
  try {
    const r = schema.parse(value);
    const need = (condition: unknown, message: string) => { if (!condition) throw Error(message); };
    const read = createLocalArtifactReader(context.root);
    need(r.originalId === `audit/data-hardware.md:industrial-deployment:${r.rowOrdinal}`, 'correction target');
    need(binding === r.id && !current.citationId && !current.sourceUrl && !current.supportingPassage, 'correction binding/scalar conflict');
    need(originalClaimDigest(current) === r.currentTupleDigest &&
      originalClaimDigest(r.currentCells) === r.currentTupleDigest, 'correction current tuple drift');
    const original = parseOriginalLedgerSection('audit/data-hardware.md', 'industrial-deployment',
      read(r.snapshot).toString()).claimRecords[r.rowOrdinal - 1];
    need(original && originalClaimDigest(original) === r.originalTupleDigest &&
      originalClaimDigest(r.originalCells) === r.originalTupleDigest, 'correction original history drift');
    need(r.article.path === 'content/data-hardware/industrial-deployment.mdx', 'wrong correction article');
    const article = read(r.article).toString();
    for (const dependency of r.dependencies) read(dependency);
    for (const s of r.requiredPresent) need(article.includes(s), 'retained correction text missing');
    for (const s of r.requiredAbsent) need(!article.includes(s), 'withdrawn assertion still active');
    need(r.review.inputDigest === correctedInputDigest(r) &&
      Date.parse(r.review.observedAt) <= Date.now(), 'missing/stale correction semantic review');
    const run = JSON.parse(read(r.execution).toString());
    need(run.exitCode === 0 && run.runner === 'playwright' && run.environment.NODE_DISABLE_COMPILE_CACHE === '1' &&
      Date.parse(run.startedAt) <= Date.parse(run.endedAt) &&
      Date.parse(run.endedAt) <= Date.parse(r.review.observedAt), 'unexecuted/stale correction check');
    read(run.test);
    need(run.dependencies.some((d: z.infer<typeof file>) => correctionDigest(d) === correctionDigest(r.article)) &&
      r.dependencies.every(d => run.dependencies.some((bound: unknown) => correctionDigest(d) === correctionDigest(bound))),
    'correction run does not bind current dependencies');
    for (const observation of run.surfaceObservations) {
      const capture = JSON.parse(read(observation.dom).toString());
      const dom = `${capture.text}\n${capture.allText}`;
      const png = read(observation.capture);
      need(png.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) &&
        png.readUInt32BE(16) === observation.viewport.width, 'correction capture absent');
      need(observation.checkedText.every((s: string) => dom.includes(s)), 'correction DOM observation drift');
    }
    need(run.surfaceObservations.length === 2 &&
      run.surfaceObservations.some((s: { viewport: { width: number } }) => s.viewport.width === 375) &&
      run.surfaceObservations.some((s: { viewport: { width: number } }) => s.viewport.width === 1440), 'missing desktop/mobile observation');
    if (r.rowOrdinal === 37) {
      need(r.kind === 'removed-assertion' && r.children.length === 0 &&
        r.requiredAbsent.includes('six-row deployment dashboard') &&
        r.requiredPresent.includes('[The Reliability Gap](/frontier/reliability-gap)') &&
        run.dashboardLinkStatus === 200, 'incomplete dashboard correction');
    } else if (r.rowOrdinal === 47) {
      need(r.kind === 'withdrawn-audit-certification' && r.children.length === 0 &&
        r.requiredAbsent.length === 0 && run.glossary.length > 0 &&
        run.glossary.every((g: { resolves: boolean; tooltipObserved: boolean }) => g.resolves && g.tooltipObserved),
      'withdrawal is not an article removal or glossary check');
    } else {
      need(r.kind === 'p4-conjunction' && run.p4.checked === true &&
        run.p4.statCount === 4 && run.p4.authoredInputs === 7 &&
        run.p4.undatedIds.length === 2 && run.p4.absentNumericStandIns.length === 0,
      'P4 registry/render obligation missing');
      const expected = records.map((_, i) => i + 1).filter(n => n !== 48);
      need(r.children.length === expected.length &&
        new Set(r.children.map(c => c.rowOrdinal)).size === expected.length &&
        expected.every(n => r.children.some(c => c.rowOrdinal === n)), 'P4 full AND population mismatch');
      for (const child of r.children) {
        const bound = records[child.rowOrdinal - 1];
        need(bound && bound.evidenceFailures.length === 0 &&
          ['passing', 'recorded-inconsistency'].includes(bound.outcome) &&
          correctedChildDigest(bound) === child.digest, `P4 unresolved/stale child ${child.rowOrdinal}`);
      }
    }
    return [];
  } catch (error) {
    return [`corrected disposition: ${error instanceof Error ? error.message : String(error)}`];
  }
}
