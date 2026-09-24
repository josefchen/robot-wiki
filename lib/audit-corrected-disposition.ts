/**
 * Finite correction evidence for industrial37/47/48 and kinematics11/12. Not a fourth local-truth
 * category: removal, withdrawal of a ledger-only certification, and the P4
 * conjunction have different obligations. Missing evidence always stays red.
 */
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { createLocalArtifactReader, parseOriginalLedgerSection, verifyKrogerSourceBody } from './audit-local-basis.ts';
import { originalClaimDigest, type ClaimRecord } from './audit-ledger.ts';

const text = z.string().min(1);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const file = z.object({ path: text, bytes: z.number().int().positive(), sha256: hash }).strict();
const cells = z.object({ claim: text, sourceChecked: text, verdict: text, note: z.string() }).strict();
const schema = z.object({
  id: text, originalId: text, rowOrdinal: z.union([z.literal(1), z.literal(2), z.literal(11), z.literal(12), z.literal(37), z.literal(47), z.literal(48)]),
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
export const CORRECTION_TARGETS: Readonly<Record<string, { ledger: string; slug: string }>> = Object.freeze({
  'audit/data-hardware.md:industrial-deployment:37': { ledger: 'audit/data-hardware.md', slug: 'industrial-deployment' },
  'audit/data-hardware.md:industrial-deployment:47': { ledger: 'audit/data-hardware.md', slug: 'industrial-deployment' },
  'audit/data-hardware.md:industrial-deployment:48': { ledger: 'audit/data-hardware.md', slug: 'industrial-deployment' },
  'audit/classical.md:kinematics:11': { ledger: 'audit/classical.md', slug: 'kinematics' },
  'audit/classical.md:kinematics:12': { ledger: 'audit/classical.md', slug: 'kinematics' },
  'audit/classical.md:control:1': { ledger: 'audit/classical.md', slug: 'control' },
  'audit/classical.md:control:2': { ledger: 'audit/classical.md', slug: 'control' },
});
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
const KROGER_ARCHIVE = 'https://web.archive.org/web/20251118224554/https://www.thisismoney.co.uk/money/markets/article-15303311/Warehouse-closures-crush-Ocado-shares-US-partner-shuts-three-sites-devastating-blow-UK-firm.html';
const P4_KROGER_CURRENT = {
  path: 'audit/evidence/citation-closeout-20260924/p4-current-children.json',
  bytes: 2913, sha256: 'b26086c3b3aefe7a810bc80a489a7ebad82976c5a251f81f5836cf7c05619c51',
};
/** A mounted reader observation, not an inferred future outcome or copied article claim. */
export function verifyKrogerReaderObservation(capture: {
  width?: number; route?: string; httpStatus?: number; text?: string;
  tooltipText?: string; ariaDescribedBy?: string;
  chipHref?: string; referenceHref?: string;
}): boolean {
  const text = capture.text ?? '';
  return [375, 1440].includes(capture.width ?? -1) &&
    capture.route === '/data-hardware/industrial-deployment/' && capture.httpStatus === 200 &&
    text.includes('in November 2025') &&
    text.includes('would close three robotic warehouses in Wisconsin, Maryland and Florida the following January') &&
    text.includes('monitoring its five remaining warehouses') &&
    text.includes('Ocado said it expected compensation of around £190 million for the planned closures') &&
    !text.includes('Kroger closed three') && !text.includes('pays Ocado') &&
    capture.chipHref === KROGER_ARCHIVE && capture.referenceHref === KROGER_ARCHIVE &&
    Boolean(capture.ariaDescribedBy) &&
    capture.tooltipText?.includes('Warehouse closures crush Ocado shares') === true &&
    capture.tooltipText?.includes('Emily Hawkins, This is Money, 2025-11-18') === true;
}
export function parseCorrectedDispositions(input: unknown): CorrectedDisposition[] {
  const records = z.array(schema).max(7).parse(input);
  if (new Set(records.map(r => r.originalId)).size !== records.length ||
      new Set(records.map(r => r.id)).size !== records.length) throw Error('duplicate correction identity');
  for (const r of records) {
    const target = CORRECTION_TARGETS[r.originalId];
    if (!target || r.originalId !== `${target.ledger}:${target.slug}:${r.rowOrdinal}`) throw Error('ineligible correction identity');
  }
  return records;
}
export function validateCorrectedDisposition(value: CorrectedDisposition, current: ClaimRecord,
  binding: string, records: readonly ClaimRecord[], context: CorrectionContext): string[] {
  try {
    const r = schema.parse(value);
    const need = (condition: unknown, message: string) => { if (!condition) throw Error(message); };
    const read = createLocalArtifactReader(context.root);
    const target = CORRECTION_TARGETS[r.originalId];
    need(target && r.originalId === `${target.ledger}:${target.slug}:${r.rowOrdinal}`, 'correction target');
    need(binding === r.id && !current.citationId && !current.sourceUrl && !current.supportingPassage, 'correction binding/scalar conflict');
    need(originalClaimDigest(current) === r.currentTupleDigest &&
      originalClaimDigest(r.currentCells) === r.currentTupleDigest, 'correction current tuple drift');
    const original = parseOriginalLedgerSection(target.ledger, target.slug,
      read(r.snapshot).toString()).claimRecords[r.rowOrdinal - 1];
    need(original && originalClaimDigest(original) === r.originalTupleDigest &&
      originalClaimDigest(r.originalCells) === r.originalTupleDigest, 'correction original history drift');
    need(r.article.path === `content/${target.ledger.slice(6, -3)}/${target.slug}.mdx`, 'wrong correction article');
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
    if (target.slug === 'control') {
      const absent = ['astrom-murray-2008', 'kalman-1960', '>95%', 'more than 95%', "Kalman's 1960"];
      const present = ['<PendulumController', '<ImpedanceContactLab', '<SelfCheck', '<PredictThenReveal',
        '<Cite id="ziegler-nichols-1942" />', '<Cite id="tedrake-underactuated" />',
        'A^{\\top} P + P A - P B R^{-1} B^{\\top} P + Q = 0'];
      const registry = read(r.dependencies.find(d => d.path === 'data/citations.ts')!).toString();
      need(r.kind === 'removed-assertion' && r.children.length === 0 &&
        r.dependencies.some(d => d.path === 'data/citations.ts') &&
        absent.every(s => r.requiredAbsent.includes(s)) &&
        present.every(s => r.requiredPresent.includes(s)) &&
        !registry.includes("id: 'astrom-murray-2008'") &&
        article.split('<PendulumController').length === 3 &&
        run.removals.controlChecked === true &&
        run.removals.absentCitationIds.includes('astrom-murray-2008') &&
        run.removals.absentCitationIds.includes('kalman-1960') &&
        run.surfaceObservations.every((o: { dom: typeof file._type }) => {
          const capture = JSON.parse(read(o.dom).toString());
          return absent.every(s => !`${capture.text}\n${capture.allText}`.includes(s));
        }), 'incomplete control source withdrawal or reader absence');
    } else if (target.slug === 'kinematics') {
      const withdrawn = ['wampler-1986', 'levenberg-1944', 'marquardt-1963'];
      need(r.kind === 'removed-assertion' && r.children.length === 0 &&
        r.dependencies.some(d => d.path === 'lib/ik.ts') &&
        r.dependencies.some(d => d.path === 'data/glossary.ts') &&
        withdrawn.every(id => r.requiredAbsent.includes(id)) &&
        ['Wampler', 'Levenberg-Marquardt', '\\lambda^2 I', 'residual decreases monotonically']
          .every(s => r.requiredAbsent.includes(s)) &&
        ['<PlanarFkArm', '<DhParameterTable', '/playground', '±0.5mm']
          .every(s => r.requiredPresent.includes(s)) &&
        run.removals.checked === true && run.removals.glossaryChecked === true &&
        withdrawn.every(id => run.removals.absentCitationIds.includes(id)) &&
        run.removals.playgroundHref === '/playground',
      'incomplete kinematics removal');
    } else if (r.rowOrdinal === 37) {
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
      // Only the two Kroger children changed when their 2025 report was
      // corrected from realized to planned/expected. The other 49 retained
      // child digests must still match their immutable historical record.
      const review = JSON.parse(read(P4_KROGER_CURRENT).toString());
      need(review.schemaVersion === 'p4-kroger-current-children-v1' &&
        review.reviewedBy && review.rationale &&
        Date.parse(review.reviewedAt) <= Date.now() &&
        review.sourceBody.path === 'audit/evidence/citation-closeout-20260924/kroger-archive-fetchurl.txt' &&
        review.sourceBody.sha256 === '1d08cbc02e62c5f75816f3facfac80fd78735a3ebb83de6da3d5d6160c9263ae' &&
        review.article.path === r.article.path && review.citationRegistry.path === 'data/citations.ts',
      'missing finite current P4 review');
      const currentArticle = read(review.article).toString();
      const source = read(review.sourceBody).toString();
      const registry = read(review.citationRegistry).toString();
      need(currentArticle.includes('Kroger said it would close three robotic warehouses in Wisconsin, Maryland and Florida the following January') &&
        currentArticle.includes('Ocado said it expected compensation of around £190 million for the planned closures') &&
        verifyKrogerSourceBody(source) &&
        registry.includes(`url: '${KROGER_ARCHIVE}'`), 'current source/claim identity drift');
      const receipt = JSON.parse(read(review.readerReceipt).toString());
      need(receipt.schemaVersion === 'citation-kroger-reader-observation-v1' && receipt.runner === 'playwright' &&
        receipt.environment.NODE_DISABLE_COMPILE_CACHE === '1' &&
        correctionDigest(receipt.article) === correctionDigest(review.article) &&
        correctionDigest(receipt.citationRegistry) === correctionDigest(review.citationRegistry) &&
        correctionDigest(receipt.sourceBody) === correctionDigest(review.sourceBody) &&
        Date.parse(receipt.startedAt) <= Date.parse(receipt.endedAt) &&
        Date.parse(receipt.endedAt) <= Date.parse(review.reviewedAt) &&
        receipt.observations.length === 2 &&
        new Set(receipt.observations.map((o: { viewport: { width: number } }) => o.viewport.width)).size === 2,
      'missing current mounted reader observation');
      for (const observation of receipt.observations) {
        const dom = JSON.parse(read(observation.dom).toString());
        const png = read(observation.capture);
        need(verifyKrogerReaderObservation(dom) &&
          observation.viewport.width === dom.width &&
          [375, 1440].includes(dom.width) &&
          observation.viewport.height === dom.height &&
          observation.chipHref === dom.chipHref &&
          observation.tooltipText === dom.tooltipText &&
          observation.checkedText.every((s: string) => dom.text.includes(s)) &&
          png.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) &&
          png.readUInt32BE(16) === dom.width &&
          png.readUInt32BE(20) === dom.height, 'current Kroger DOM/capture drift');
      }
      need(Array.isArray(review.changedChildren) &&
        review.changedChildren.length === 2 &&
        new Set(review.changedChildren.map((c: { rowOrdinal: number }) => c.rowOrdinal)).size === 2 &&
        [22, 24].every(n => review.changedChildren.some((c: { rowOrdinal: number }) => c.rowOrdinal === n)),
      'P4 current child population drift');
      for (const child of r.children) {
        const bound = records[child.rowOrdinal - 1];
        const changed = review.changedChildren.find((c: { rowOrdinal: number }) => c.rowOrdinal === child.rowOrdinal);
        need(bound && bound.evidenceFailures.length === 0 &&
          ['passing', 'recorded-inconsistency'].includes(bound.outcome) &&
          (changed ? child.digest === changed.priorChildDigest &&
            source.includes(changed.sourcePassage) &&
            originalClaimDigest(bound) === changed.currentTupleDigest &&
            correctedChildDigest(bound) === changed.currentChildDigest &&
            bound.compound?.adjudicationFailures.length === 0 &&
            bound.compound?.structuralFailures.length === 0 :
            correctedChildDigest(bound) === child.digest),
        `P4 unresolved/stale child ${child.rowOrdinal}`);
      }
    }
    return [];
  } catch (error) {
    return [`corrected disposition: ${error instanceof Error ? error.message : String(error)}`];
  }
}
