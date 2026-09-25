import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  verifyIndustrialArticleTransition,
  verifyControlCitationTransition,
  verifyKrogerCitationTransition,
  verifyKrogerSourceBody,
  verifyMergedCitationTransition,
  verifyTechnologyWithdrawalArticleTransition,
  verifyTechnologyWithdrawalRegistryTransition,
} from '../../lib/audit-local-basis';
import { verifyKrogerReaderObservation } from '../../lib/audit-corrected-disposition';
import {
  compoundPartDigest,
  compoundPlanDigest,
  originalClaimDigest,
  parseCompoundPlans,
  parseLedger,
} from '../../lib/audit-ledger';

const dir = 'audit/evidence/citation-closeout-20260924/';
const read = (path: string) => readFileSync(path, 'utf8');
const review = JSON.parse(read(`${dir}relevant-continuity.json`));
const current = JSON.parse(read(`${dir}p4-current-children.json`));
const receipt = JSON.parse(read(`${dir}reader-observations.json`));
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const mergeDir = 'audit/evidence/main-merge-integration-20260924/';
const snapshotFor = (path: string) => ({
  'data/citations.ts': `${mergeDir}local-citations.ts.txt`,
  'content/data-hardware/industrial-deployment.mdx': `${mergeDir}local-article.mdx.txt`,
  'lib/audit-local-basis.ts': `${mergeDir}local-checker.ts.txt`,
})[path] ?? path;

describe('finite Kroger source and historical correction continuation', () => {
  it('preserves actual source and old registry bytes; permits only one exact member transition', () => {
    const old = read(review.citationBefore.path);
    const active = read(snapshotFor(review.citationAfter.path));
    const source = read(review.sourceBody.path);
    for (const artifact of [review.citationBefore, review.citationAfter, review.sourceBody]) {
      expect(readFileSync(snapshotFor(artifact.path)).length).toBe(artifact.bytes);
      expect(sha(snapshotFor(artifact.path))).toBe(artifact.sha256);
    }
    const main = read(`${mergeDir}main-citations.ts.txt`);
    // The live registry now carries the 2026-09-24 Technology.org withdrawal;
    // the sealed parent equations hold against the archived checkpoint, and
    // the live file must equal that checkpoint plus the exact withdrawal runs.
    const merged = read('audit/evidence/technology-withdrawal-20260924/pre-citations.ts.txt');
    expect(sha(`${mergeDir}main-citations.ts.txt`))
      .toBe('66751a2a33aa5a11736be65e271582ce62e14381920ca12b726e21ea7197a079');
    expect(verifyMergedCitationTransition(main, active, merged, old)).toBe(true);
    expect(verifyMergedCitationTransition(main, active, merged + '\n// unrelated entry', old)).toBe(false);
    expect(verifyMergedCitationTransition(main, active,
      merged.replace('20251118224554', '20251127101227'), old)).toBe(false);
    // The live registry now also carries the 2026-09-25 EXPO-FT intake
    // additions (five citations after act-reference-2023 plus the RoboPoint
    // Table 2 note); strip them before the exact-withdrawal comparison.
    const intakeAdditions = /  \{\n    \/\/ arXiv abs page and HTML v2 full text both fetched 2026-09-25;[\s\S]*?id: 'perry-dong-post-training-2026',[\s\S]*?type: 'blog',\n  \},\n/;
    const robopointNote = /    \/\/ Where2Place point-in-mask accuracies[\s\S]*?\n(?=    id: 'robopoint-2024',)/;
    const withoutIntake = read('data/citations.ts')
      .replace(intakeAdditions, '').replace(robopointNote, '');
    expect(verifyTechnologyWithdrawalRegistryTransition(merged, withoutIntake)).toBe(true);
    expect(verifyTechnologyWithdrawalRegistryTransition(merged, read('data/citations.ts'))).toBe(false);
    expect(verifyKrogerCitationTransition(old, active)).toBe(true);
    expect(verifyKrogerSourceBody(source)).toBe(true);
    expect(verifyKrogerCitationTransition(old, active.replace('type: \'press\'', 'type: \'docs\''))).toBe(false);
    expect(verifyKrogerCitationTransition(old, active.replace('20251118224554', '20251127101227'))).toBe(false);
    const checkpoint = read('audit/evidence/control-citation-closeout-20260924/before-citations.ts.txt');
    expect(sha('audit/evidence/control-citation-closeout-20260924/before-citations.ts.txt'))
      .toBe('1299890987e8dc1c49c50d773ab96dd00a8a89e1a0469560835fac79fafb3362');
    expect(verifyControlCitationTransition(checkpoint, active)).toBe(true);
    expect(verifyControlCitationTransition(checkpoint, active.replace("id: 'kalman-1960',", "id: 'kalman-1961',"))).toBe(false);
    expect(verifyControlCitationTransition(checkpoint, active + '\n// unrelated entry')).toBe(false);
    expect(verifyControlCitationTransition(checkpoint.replace("id: 'astrom-murray-2008',", "id: 'other',"), active)).toBe(false);
    expect(verifyKrogerSourceBody(source.replace('will shut sites', 'has shut sites'))).toBe(false);
    expect(verifyKrogerSourceBody(source.replace('By EMILY HAWKINS', 'By UNKNOWN'))).toBe(false);
  });

  it('allows exactly the dated article clause while protecting the authored disclosure', () => {
    const before = read(review.articleBefore.path);
    const after = read(snapshotFor(review.articleAfter.path));
    for (const artifact of [review.articleBefore, review.articleAfter, review.checkerBefore, review.checkerAfter]) {
      expect(readFileSync(snapshotFor(artifact.path)).length).toBe(artifact.bytes);
      expect(sha(snapshotFor(artifact.path))).toBe(artifact.sha256);
    }
    const main = read(`${mergeDir}main-article.mdx.txt`);
    expect(sha(`${mergeDir}main-article.mdx.txt`))
      .toBe('799451487a3f7a2a3fb1309f3cf9b9ca1ac2991f487a0bfa7e5b91ac548a6f61');
    // The live article now carries the withdrawal; both parent equations are
    // checked against the archived checkpoint, which the live article must
    // equal plus the exact six withdrawal runs.
    const withdrawalBefore = read('audit/evidence/technology-withdrawal-20260924/pre-article.mdx');
    expect(verifyIndustrialArticleTransition(main, withdrawalBefore,
      review.beforeClause, review.afterClause, review.preservedDisclosure)).toBe(true);
    expect(after.replace('2021–2024 each above 500k', '2021-2024 each above 500k'))
      .toBe(withdrawalBefore);
    expect(verifyTechnologyWithdrawalArticleTransition(withdrawalBefore, read(review.articleAfter.path)))
      .toBe(true);
    expect(verifyIndustrialArticleTransition(before, after,
      review.beforeClause, review.afterClause, review.preservedDisclosure)).toBe(true);
    expect(verifyIndustrialArticleTransition(before, after.replace('would close three', 'closed three'),
      review.beforeClause, review.afterClause, review.preservedDisclosure)).toBe(false);
    expect(verifyIndustrialArticleTransition(before, after.replace(review.preservedDisclosure, 'unproved forecast'),
      review.beforeClause, review.afterClause, review.preservedDisclosure)).toBe(false);
    expect(review.affectedProofIds).toHaveLength(21);
    expect(review.checkerCheckpointProofIds).toHaveLength(33);
  });

  it('rebases precisely two compound plans on their current four-cell tuples and real source passages', () => {
    const plans = parseCompoundPlans(JSON.parse(read('audit/compound-evidence.json')));
    const rows = parseLedger('audit/data-hardware.md', read('audit/data-hardware.md'))
      .find(s => s.slug === 'industrial-deployment')!.claimRecords;
    const source = read(review.sourceBody.path);
    for (const child of current.changedChildren) {
      const plan = plans.find(p => p.articleSlug === 'industrial-deployment' && p.rowOrdinal === child.rowOrdinal)!;
      expect([22, 24]).toContain(child.rowOrdinal);
      expect(plan.originalCellsDigest).toBe(originalClaimDigest(rows[child.rowOrdinal - 1]));
      expect(plan.planReview?.planDigest).toBe(compoundPlanDigest(plan));
      expect(plan.evidence.every(e => source.includes(e.supportingPassage))).toBe(true);
      expect(plan.adjudications.every(a => a.evidenceDigest === compoundPartDigest(plan, a.partId))).toBe(true);
      expect(child.currentTupleDigest).toBe(plan.originalCellsDigest);
      expect(source).toContain(child.sourcePassage);
    }
    expect(rows[22].verdict.toLowerCase()).toContain('cut');
  });

  it('binds two real viewport DOM and PNG observations and rejects altered claims, links or tooltips', () => {
    expect(receipt.runner).toBe('playwright');
    expect(receipt.observations.map((o: { viewport: { width: number } }) => o.viewport.width)).toEqual([1440, 375]);
    for (const observation of receipt.observations) {
      const capture = JSON.parse(read(observation.dom.path));
      for (const artifact of [observation.dom, observation.capture]) {
        expect(readFileSync(artifact.path).length).toBe(artifact.bytes);
        expect(sha(artifact.path)).toBe(artifact.sha256);
      }
      expect(verifyKrogerReaderObservation(capture)).toBe(true);
      expect(verifyKrogerReaderObservation({ ...capture, text: capture.text.replace('would close', 'closed') })).toBe(false);
      expect(verifyKrogerReaderObservation({ ...capture, chipHref: 'https://example.org/unrelated' })).toBe(false);
      expect(verifyKrogerReaderObservation({ ...capture, tooltipText: 'unverified' })).toBe(false);
      expect(verifyKrogerReaderObservation({ ...capture, referenceHref: 'https://example.org/unrelated' })).toBe(false);
    }
  });
});
