import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { committedSource } from '../helpers/continuation-integration';
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
const newSpan = 'π0.5’s paper describes training the model to predict relevant bounding boxes before subtask labels, and adding indoor-scene and household-object data with bounding-box annotations to its web-data mixture <Cite id="pi05-2025" />.';
const correctedVerdict = 'C (the article now describes bounding-box prediction before subtask labels and bounding-box-annotated web data; the unsupported keypoint-prediction and direct MOKA/RoboPoint inheritance attributions were removed)';
const oldHash = '0099fefeabfd63e0069bd671ffe7caee84c6c0398f90d8004a695cf4f9a61223';
const newHash = 'e0892dbb5fefa56957931bae74c3cd2c60640f122f8587e2365db852af2680a7';
const deltaId = 'hierarchy14-box-web-correction-20260921';
const currentHash = '50b49ee3f2e6b130c24367d5ed71b34bb07f2965e7a8154e9a59783ef14fc00c';
// The manipulation humanizer pass (owner decision 20260925) later rewrote
// the not-X disclaimers and paper-version locators; its endpoint is the
// humanizer-manipulation-v3-20260925 re-anchor in the approved-deltas ledger.
const passHash = '73bde0c3426f143ca86c66b27d5422609412bc50fae05d31e227a6c60a2a295b';
const synthesisDeltaId = 'hierarchy15-bounded-synthesis-correction-20260921';
// Exact separately approved row15 endpoints; rollback is in-memory only.
const synthesisCorrections = [
  {
    "oldSpan": "First: **separate-planner architectures of the SayCan type have been superseded by internalized hierarchy in the 2026 frontier systems.** No single source states this. It is a synthesis, the consistent reading across π0.5, π0.6, π0.7, Gemini Robotics 1.5, and GO-2, every one of which generates its subtasks, thinking traces, or intents inside (or asynchronously alongside) the same learned stack that produces actions <Cite id=\"pi05-2025\" /> <Cite id=\"gemini-robotics-15-2025\" /> <Cite id=\"agibot-go2-2026\" />. The reasons are structural rather than ideological: a separate planner cannot share representations with the policy, re-planning through a dispatch loop is slow, and a fixed skill library caps what the system can express. Gemini Robotics is the partial exception: Google keeps ER as a separate orchestrator for multi-minute, multi-robot coordination while the per-robot hierarchy stays internal <Cite id=\"gemini-robotics-15-2025\" />.",
    "newSpan": "First: **the five cited examples place high-level guidance at different interfaces.** π0.5 uses the same model to infer a language subtask and actions conditioned on it <Cite id=\"pi05-2025\" />. The π0.6-MEM report describes a high-level policy that predicts the next subtask and updated language memory, with a low-level policy conditioned on that subtask and recent observations <Cite id=\"mem-2026\" />. π0.7 can use subgoal images from a BAGEL-initialized world model; when those images are used, subtask and image generation run asynchronously in separate threads <Cite id=\"pi07-2026\" />. With thinking enabled, Gemini Robotics 1.5 appends natural-language reasoning to the VLA context before actions, while its agentic system retains a separate GR-ER 1.5 orchestrator <Cite id=\"gemini-robotics-15-2025\" />. AgiBot describes GO-2 as a lower-frequency semantic planning module paired with a higher-frequency action-following module <Cite id=\"agibot-go2-2026\" />. This is a comparison of reported mechanisms; it supplies no evidence that separate planners have been superseded across the field."
  },
  {
    "oldSpan": "Second: **the keypoint and affordance methods did not die; they moved from runtime pipelines into training data.**",
    "newSpan": "Second: **geometric supervision in training does not establish the disappearance of geometric reasoning at runtime.**"
  },
  {
    "oldSpan": "The 2024 papers remain the clearest statement of why geometric intermediate representations help, and their runtime incarnations are still reasonable for a research prototype with a frozen VLM. But no 2026 frontier system routes its control loop through a runtime keypoint interface.",
    "newSpan": "Gemini Robotics-ER 1.5 also reports complex pointing, including point sequences that can represent motion trajectories and paths <Cite id=\"gemini-robotics-15-2025\" />. That is evidence of a geometric reasoning capability; it proves nothing about a specific deployed controller using a keypoint loop. The scope here is those reported mechanisms, short of an exhaustive inventory of 2026 frontier systems; no field-wide absence of runtime keypoint interfaces is claimed."
  },
  {
    "oldSpan": "  The supersession claim in this section is this wiki's own reading across five systems, not a quote from any one of them. The per-system facts underneath it (subtask prediction in π0.5, interleaved thinking in Gemini Robotics 1.5, the asynchronous split in GO-2, the S0/S1/S2 rates in Helix 02) are each cited to their primary source. If a 2027 system ships a competitive separate planner, this section is where the retraction goes.",
    "newSpan": "  This comparison is the wiki's synthesis of the five cited examples: π0.5, π0.6-MEM, π0.7, Gemini Robotics 1.5 and GO-2. It distinguishes same-model inference, separate policies or models, and vendor-described modules; it does not assume shared weights, equate their intermediate representations, or establish a universal architecture. Claims about training data, model capabilities and deployed control loops require different evidence."
  }
];
const articleAfter14 = committedSource('79807c7', articlePath);

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
    expect(prose(article).members[0].hash).toBe(passHash);
    for (const correction of synthesisCorrections) {
      expect(article.split(correction.newSpan)).toHaveLength(2);
      expect(article).not.toContain(correction.oldSpan);
    }
    expect(prose(articleAfter14).members[0].hash).toBe(newHash);
    expect(prose(articleAfter14.replace(newSpan.replace('π0.5’s paper', 'π0.5’s v1 paper'), oldSpan)).members[0].hash).toBe(oldHash);
    expect(row().note).toContain(newSpan.replace('π0.5’s paper', 'π0.5’s v1 paper'));
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

  it('recognizes the separately approved synthesis and keeps original14 scalar', () => {
    expect(section().claimRecords).toHaveLength(16);
    expect(section().claimRecords[14].evidenceFailures).toEqual([]);
    const synthesis = plans.find(p => p.id === 'hierarchy15-bounded-five-system-20260921')!;
    expect(section().claimRecords[14].compound?.planId).toBe(synthesis.id);
    expect(synthesis.parts.map(p => p.id)).toEqual(['pi05', 'mem', 'pi07', 'gr15', 'go2', 'geometry']);
    expect(synthesis.evidence).toHaveLength(7);
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
    const before = bundle(articleAfter14.replace(newSpan.replace('π0.5’s paper', 'π0.5’s v1 paper'), oldSpan)), after = bundle(articleAfter14);
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
    const synthesis = approvals.filter(d => d.id === synthesisDeltaId);
    expect(synthesis).toHaveLength(1);
    expect(synthesis[0]).toMatchObject({
      manifest: 'prose', memberId: 'article:manipulation/hierarchical',
      oldHash: newHash, newHash: currentHash, disposition: 'permanent',
    });
    expect(validateApprovedDeltas(synthesis)).toEqual([]);
    const after15 = bundle(committedSource('e6232a2', articlePath));
    expect(compareBaseline(after, bundle(article), matches).ok).toBe(false);
    expect(compareBaseline(after, after15, synthesis)).toMatchObject({
      ok: true, failures: [], approvedDifferences: [synthesisDeltaId],
    });
    // The humanizer pass carries after15 to the current article; its ledger
    // entry is a sealed re-anchor, so bind the local step through the exact
    // endpoint hashes here.
    const pass = approvals.filter(d => d.id === 'humanizer-manipulation-v3-20260925-prose-hierarchical');
    expect(pass).toHaveLength(1);
    expect(pass[0].newHash).toBe(passHash);
    expect(compareBaseline(after15, bundle(article), [{ ...pass[0], oldHash: currentHash, reconciles: undefined }])).toMatchObject({
      ok: true, failures: [], approvedDifferences: [pass[0].id],
    });
    expect(compareBaseline(after15, bundle(article + '\nUnapproved extra assertion.'), synthesis).ok).toBe(false);
  });
});
