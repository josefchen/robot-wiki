import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { originalClaimDigest, parseLedger, type CompoundPlan } from '../../lib/audit-ledger';
import {
  buildManifest, compareBaseline, sha256, validateApprovedDeltas,
  type ApprovedDelta, type BaselineBundle,
} from '../../lib/brand-v2-baseline';

const articlePath = 'content/manipulation/hierarchical.mdx';
const article = readFileSync(articlePath, 'utf8');
const ledger = readFileSync('audit/manipulation.md', 'utf8');
const plans: CompoundPlan[] = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8'));
const registry = new Set(CITATIONS.map(c => c.id));
const section = (text = ledger) => parseLedger('audit/manipulation.md', text, registry, {
  compoundPlans: plans,
}).find(s => s.slug === 'hierarchical')!;
const row = () => section().claimRecords[13];
const oldCells = {
  claim: '"π0.5 co-trains on bounding-box prediction and keypoint prediction as auxiliary objectives"',
  sourceChecked: 'π0.5 paper, arXiv 2504.16054 HTML (this session)',
  verdict: 'verified',
  note: "Bounding-box prediction co-training confirmed in the paper's data-mixture section (object detections in the hybrid examples).",
};
const oldSpan = 'π0.5 co-trains on bounding-box prediction and keypoint prediction as auxiliary objectives, which is the MOKA and RoboPoint idea absorbed into the mixture rather than running as a separate stage at inference <Cite id="pi05-2025" />.';
const newSpan = 'π0.5’s v1 paper describes training the model to predict relevant bounding boxes before subtask labels, and adding indoor-scene and household-object data with bounding-box annotations to its web-data mixture <Cite id="pi05-2025" />.';
const correctedVerdict = 'C (the article now describes bounding-box prediction before subtask labels and bounding-box-annotated web data; the unsupported keypoint-prediction and direct MOKA/RoboPoint inheritance attributions were removed)';
const oldHash = '0099fefeabfd63e0069bd671ffe7caee84c6c0398f90d8004a695cf4f9a61223';
const newHash = 'e0892dbb5fefa56957931bae74c3cd2c60640f122f8587e2365db852af2680a7';
const deltaId = 'hierarchy14-box-web-correction-20260921';
const approvals: ApprovedDelta[] = JSON.parse(
  readFileSync('contract/brand-v2-approved-deltas.json', 'utf8'),
).entries;
const prose = (source: string) => buildManifest('prose', [{
  id: 'article:manipulation/hierarchical',
  value: { path: articlePath, body: matter(source.replace(/\r\n/g, '\n')).content.trim() },
}]);
// These isolated bundles exercise the native comparison for this one member;
// they are not a replacement baseline or a full repository gate.
const bundle = (source: string) => ({
  manifests: { prose: prose(source) },
}) as BaselineBundle;

describe('hierarchy original 14 source-backed correction', () => {
  it('preserves the original AND and all four prior cells without certifying them', () => {
    expect(originalClaimDigest(oldCells)).toBe('c6ce08ccbaaf6a9e7f564f882ab5fdcee4a6cacea597b2cdc04e1a0a91327259');
    expect(row().claim).toBe(oldCells.claim);
    expect(row().sourceChecked).toBe(oldCells.sourceChecked);
    expect(row().verdict).toBe(correctedVerdict);
    expect(row().note).toContain(`Original four-cell history: ${JSON.stringify(oldCells)}`);
    expect(row().note).toContain('The original boxes AND keypoints attribution is not verified');
    expect(originalClaimDigest(row())).not.toBe(originalClaimDigest(oldCells));
  });

  it('changes exactly the authorized prose member and keeps the same citation', () => {
    expect(article.split(newSpan)).toHaveLength(2);
    expect(article).not.toContain(oldSpan);
    expect(prose(article).members[0].hash).toBe(newHash);
    expect(prose(article.replace(newSpan, oldSpan)).members[0].hash).toBe(oldHash);
    expect(row().note).toContain(newSpan);
  });

  it('requires both literal v1 excerpts as distinct passages, not a merged quotation', () => {
    const markers = [
      'Excerpt 1 (Section IV-C, High-Level subtask prediction):<br>',
      '<br><br>Excerpt 2 (Section IV-C, Multi-modal Web Data):<br>',
    ];
    expect(row().supportingPassage.startsWith(markers[0])).toBe(true);
    const excerpts = row().supportingPassage.slice(markers[0].length).split(markers[1]);
    expect(excerpts).toHaveLength(2);
    expect(excerpts.map(s => sha256(s.replaceAll('<br>', '\n')))).toEqual([
      'd62e50411394b3c60d75b95c01a70c73449445d2221d084e9825f404fe3a4a4c',
      '2ece42704c335786aadbcea3ddbd4c1661e4ef32d38a9e7953afa961d4e4c4d6',
    ]);
    expect(row().citationId).toBe('pi05-2025');
    expect(row().sourceUrl).toBe('https://arxiv.org/html/2504.16054v1');
    expect(row().evidenceFailures).toEqual([]);
  });

  it('discloses original retrieval provenance and the limit of the correction', () => {
    for (const text of [
      '2026-09-07T16:08:29.437Z', 'tool-reported 200',
      'eea20e6c28d9d0d28e671e7046009e5bd7a07475e63264b4f6c867b19e8fd778',
      'raw origin headers and redirect chain unavailable', 'zero new retrieval',
      'not a universal absence claim', 'original 15 remains excluded',
      'not independent acceptance',
    ]) expect(row().note).toContain(text);
  });

  it('fails closed when any required scalar source field is removed', () => {
    expect(row().evidenceFailures).toEqual([]);
    for (const index of [4, 5, 6]) {
      const lines = ledger.split('\n');
      const cells = lines[row().line - 1].slice(1, -1).split(/(?<!\\)\|/);
      expect(cells).toHaveLength(8);
      cells[index] = ' ';
      lines[row().line - 1] = `|${cells.join('|')}|`;
      expect(section(lines.join('\n')).claimRecords[13].evidenceFailures.length).toBeGreaterThan(0);
    }
  });

  it('does not earn the neighboring synthesis or introduce a partial compound plan', () => {
    expect(section().claimRecords).toHaveLength(16);
    expect(section().claimRecords[14].evidenceFailures.length).toBeGreaterThan(0);
    expect(section().claimRecords[14].claim).toBe(
      "Synthesis claims (separate-planner supersession; keypoints moved into training data) explicitly framed as the wiki's own reading with named systems",
    );
    expect(plans.filter(p => p.ledgerPath === 'audit/manipulation.md'
      && p.articleSlug === 'hierarchical' && p.rowOrdinal === 14)).toEqual([]);
  });

  it('binds one permanent native prose approval to actual correction authority', () => {
    const matches = approvals.filter(d => d.id === deltaId);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      manifest: 'prose', memberId: 'article:manipulation/hierarchical',
      oldHash, newHash, disposition: 'permanent',
    });
    expect(matches[0].ownerApproval).toContain('Josef');
    expect(matches[0].ownerApproval).toContain('authorization.json');
    expect(matches[0].ownerApproval).toContain('not a new human signature');
    expect(validateApprovedDeltas(matches)).toEqual([]);
  });

  it('rejects an unapproved or wrongly bound prose change and accepts only its exact delta', () => {
    const before = bundle(article.replace(newSpan, oldSpan)), after = bundle(article);
    const matches = approvals.filter(d => d.id === deltaId);
    expect(matches).toHaveLength(1);
    const missing = compareBaseline(before, after, []);
    expect(missing.ok).toBe(false);
    expect(missing.failures).toMatchObject([{
      assertionId: 'VAL-B2-BASE-012', manifest: 'prose',
      memberId: 'article:manipulation/hierarchical', reason: 'changed-member',
    }]);
    expect(compareBaseline(before, after, [{ ...matches[0], newHash: '0'.repeat(64) }]).ok).toBe(false);
    expect(compareBaseline(before, after, matches)).toMatchObject({
      ok: true, failures: [], approvedDifferences: [deltaId],
    });
  });
});
