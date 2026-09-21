import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import {
  compoundPartDigest, compoundPlanDigest, originalClaimDigest, parseLedger,
  type CompoundPlan,
} from '../../lib/audit-ledger';
import {
  buildManifest, compareBaseline, sha256, validateApprovedDeltas,
  type ApprovedDelta, type BaselineBundle,
} from '../../lib/brand-v2-baseline';

const oldCells = {
  "claim": "Synthesis claims (separate-planner supersession; keypoints moved into training data) explicitly framed as the wiki's own reading with named systems",
  "sourceChecked": "The five systems' primary sources, each cited inline",
  "verdict": "verified",
  "note": "P5-conformant: the callout states the claim is this wiki's synthesis, not a quote, and the partial exception (GR-ER orchestrator) is named."
};
const corrections = [
  {
    "oldSpan": "First: **separate-planner architectures of the SayCan type have been superseded by internalized hierarchy in the 2026 frontier systems.** No single source states this. It is a synthesis, the consistent reading across π0.5, π0.6, π0.7, Gemini Robotics 1.5, and GO-2, every one of which generates its subtasks, thinking traces, or intents inside (or asynchronously alongside) the same learned stack that produces actions <Cite id=\"pi05-2025\" /> <Cite id=\"gemini-robotics-15-2025\" /> <Cite id=\"agibot-go2-2026\" />. The reasons are structural rather than ideological: a separate planner cannot share representations with the policy, re-planning through a dispatch loop is slow, and a fixed skill library caps what the system can express. Gemini Robotics is the partial exception: Google keeps ER as a separate orchestrator for multi-minute, multi-robot coordination while the per-robot hierarchy stays internal <Cite id=\"gemini-robotics-15-2025\" />.",
    "newSpan": "First: **the five cited examples place high-level guidance at different interfaces.** π0.5 uses the same model to infer a language subtask and actions conditioned on it <Cite id=\"pi05-2025\" />. The π0.6-MEM report describes a high-level policy that predicts the next subtask and updated language memory, with a low-level policy conditioned on that subtask and recent observations <Cite id=\"mem-2026\" />. π0.7 can use subgoal images from a BAGEL-initialized world model; when those images are used, subtask and image generation run asynchronously in separate threads <Cite id=\"pi07-2026\" />. With thinking enabled, Gemini Robotics 1.5 appends natural-language reasoning to the VLA context before actions, while its agentic system retains a separate GR-ER 1.5 orchestrator <Cite id=\"gemini-robotics-15-2025\" />. AgiBot describes GO-2 as a lower-frequency semantic planning module paired with a higher-frequency action-following module <Cite id=\"agibot-go2-2026\" />. This is a comparison of reported mechanisms, not evidence that separate planners have been superseded across the field."
  },
  {
    "oldSpan": "Second: **the keypoint and affordance methods did not die; they moved from runtime pipelines into training data.**",
    "newSpan": "Second: **geometric supervision in training does not establish the disappearance of geometric reasoning at runtime.**"
  },
  {
    "oldSpan": "The 2024 papers remain the clearest statement of why geometric intermediate representations help, and their runtime incarnations are still reasonable for a research prototype with a frozen VLM. But no 2026 frontier system routes its control loop through a runtime keypoint interface.",
    "newSpan": "Gemini Robotics-ER 1.5 also reports complex pointing, including point sequences that can represent motion trajectories and paths <Cite id=\"gemini-robotics-15-2025\" />. That is evidence of a geometric reasoning capability, not proof that a specific deployed controller uses a keypoint loop. The scope here is those reported mechanisms, not an exhaustive inventory of 2026 frontier systems; no field-wide absence of runtime keypoint interfaces is claimed."
  },
  {
    "oldSpan": "  The supersession claim in this section is this wiki's own reading across five systems, not a quote from any one of them. The per-system facts underneath it (subtask prediction in π0.5, interleaved thinking in Gemini Robotics 1.5, the asynchronous split in GO-2, the S0/S1/S2 rates in Helix 02) are each cited to their primary source. If a 2027 system ships a competitive separate planner, this section is where the retraction goes.",
    "newSpan": "  This comparison is the wiki's synthesis of the five cited examples: π0.5, π0.6-MEM, π0.7, Gemini Robotics 1.5 and GO-2. It distinguishes same-model inference, separate policies or models, and vendor-described modules; it does not assume shared weights, equate their intermediate representations, or establish a universal architecture. Claims about training data, model capabilities and deployed control loops require different evidence."
  }
];
const prior14Span = "π0.5’s v1 paper describes training the model to predict relevant bounding boxes before subtask labels, and adding indoor-scene and household-object data with bounding-box annotations to its web-data mixture <Cite id=\"pi05-2025\" />.";
const correctedVerdict = "C (the synthesis is narrowed to the five cited mechanisms, with π0.6 scoped to π0.6-MEM; universal separate-planner supersession and field-wide runtime-keypoint migration/absence claims were withdrawn)";
const expectedParts = [
  {
    "id": "pi05",
    "text": "π0.5 uses the same model for high-level semantic subtask inference and low-level actions conditioned on the subtask.",
    "requiredCitationIds": [
      "pi05-2025"
    ]
  },
  {
    "id": "mem",
    "text": "The bounded π0.6-MEM variant has high-level subtask and language-memory prediction and low-level short-history action conditioning; no generic π0.6-wide or shared-weight assertion.",
    "requiredCitationIds": [
      "mem-2026"
    ]
  },
  {
    "id": "pi07",
    "text": "π0.7 optionally uses subgoal images from a BAGEL-initialized world model; its subtask and visual-subgoal generation run asynchronously in separate threads.",
    "requiredCitationIds": [
      "pi07-2026"
    ]
  },
  {
    "id": "gr15",
    "text": "Gemini Robotics 1.5 thinking-enabled VLA appends natural-language traces to context before actions; its agentic architecture retains a separate GR-ER 1.5 orchestrator and action model.",
    "requiredCitationIds": [
      "gemini-robotics-15-2025"
    ]
  },
  {
    "id": "go2",
    "text": "AgiBot vendor reporting describes lower-frequency Semantic Planning and higher-frequency Action Following modules; no shared-weight, numerical-rate or independently validated performance assertion.",
    "requiredCitationIds": [
      "agibot-go2-2026"
    ]
  },
  {
    "id": "geometry",
    "text": "π0.5 documents bounding-box training, while GR-ER 1.5 documents point-based reasoning and trajectory/path representation. These differently scoped facts do not establish the disappearance of runtime geometry or any particular deployed keypoint loop.",
    "requiredCitationIds": [
      "pi05-2025",
      "gemini-robotics-15-2025"
    ]
  }
];
const expectedPairs = [
  {
    "partId": "pi05",
    "citationId": "pi05-2025",
    "sourceUrl": "https://arxiv.org/html/2504.16054v1",
    "passageSha256": "34ec0ffb26ffebf7a4870fe6f0cef2d4c874cf0dfc875fdecf4a8968acec65d6"
  },
  {
    "partId": "mem",
    "citationId": "mem-2026",
    "sourceUrl": "https://www.pi.website/download/Mem.pdf",
    "passageSha256": "415d17b3054bbab27f44fcf2574882ea0a1e866eb51ae9be0e6699d43e4fe6b4"
  },
  {
    "partId": "pi07",
    "citationId": "pi07-2026",
    "sourceUrl": "https://www.pi.website/download/pi07.pdf",
    "passageSha256": "5c2c27aafe942e6a65681d8c387c23ca087d84112e6c4ddcdf41505810b7e0e7"
  },
  {
    "partId": "gr15",
    "citationId": "gemini-robotics-15-2025",
    "sourceUrl": "https://arxiv.org/html/2510.03342",
    "passageSha256": "274af642c2d8afee600399d3b0f56153c953e4817cf76a8010a9ee87166db349"
  },
  {
    "partId": "go2",
    "citationId": "agibot-go2-2026",
    "sourceUrl": "https://www.agibot.com/article/231/detail/56.html",
    "passageSha256": "cff8902ca4b451d32c8574c586d03d9ad6bee34afcff95830d227c74f0a81c34"
  },
  {
    "partId": "geometry",
    "citationId": "pi05-2025",
    "sourceUrl": "https://arxiv.org/html/2504.16054v1",
    "passageSha256": "62ca9f36813bd395cd239a7eb197c7bccb777209a9fd6e63196d5a52587cef9a"
  },
  {
    "partId": "geometry",
    "citationId": "gemini-robotics-15-2025",
    "sourceUrl": "https://arxiv.org/html/2510.03342",
    "passageSha256": "39ba29e0a3016d216dbe7e3e0c448842c2da3f417f61253653785d47c377cb6c"
  }
];

const articlePath = 'content/manipulation/hierarchical.mdx';
const article = readFileSync(articlePath, 'utf8');
const ledger = readFileSync('audit/manipulation.md', 'utf8');
const plans: CompoundPlan[] = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8'));
const registry = new Set(CITATIONS.map(c => c.id));
const planId = 'hierarchy15-bounded-five-system-20260921';
const deltaId = 'hierarchy15-bounded-synthesis-correction-20260921';
const oldHash = 'e0892dbb5fefa56957931bae74c3cd2c60640f122f8587e2365db852af2680a7';
const newHash = '50b49ee3f2e6b130c24367d5ed71b34bb07f2965e7a8154e9a59783ef14fc00c';
const selectedPlan = () => plans.find(p => p.id === planId)!;
const section = (catalog = plans) => parseLedger('audit/manipulation.md', ledger, registry, {
  compoundPlans: catalog,
  articleCitations: { hierarchical: matter(article).data.citations },
}).find(s => s.slug === 'hierarchical')!;
const row = (catalog = plans) => section(catalog).claimRecords[14];
const approvals: ApprovedDelta[] = JSON.parse(
  readFileSync('contract/brand-v2-approved-deltas.json', 'utf8'),
).entries;
const prose = (source: string) => buildManifest('prose', [{
  id: 'article:manipulation/hierarchical',
  value: { path: articlePath, body: matter(source.replace(/\r\n/g, '\n')).content.trim() },
}]);
// Isolated native member comparison, never a replacement migration baseline.
const bundle = (source: string) => ({ manifests: { prose: prose(source) } }) as BaselineBundle;
const before = () => corrections.reduce((text, c) => text.replace(c.newSpan, c.oldSpan), article);
const mutatedCatalog = (mutate: (p: CompoundPlan) => void) => {
  const copy = structuredClone(plans);
  const p = copy.find(p => p.id === planId)!;
  expect(p).toBeDefined();
  mutate(p);
  return copy;
};

// Rehash deliberately corrupted fixture evidence to isolate citation-pair coverage
// from stale-review rejection. These are test fixtures, not source adjudications.
const rehashFixtureReviews = (p: CompoundPlan) => {
  p.planReview!.planDigest = compoundPlanDigest(p);
  p.adjudications.forEach(a => { a.evidenceDigest = compoundPartDigest(p, a.partId); });
};

describe('hierarchy original 15 bounded synthesis correction', () => {
  it('applies all four exact authorized endpoints and no other article changes', () => {
    for (const c of corrections) {
      expect(article.split(c.newSpan)).toHaveLength(2);
      expect(article).not.toContain(c.oldSpan);
    }
    expect(prose(article).members[0].hash).toBe(newHash);
    expect(prose(before()).members[0].hash).toBe(oldHash);
    expect(matter(article).data).toEqual(matter(before()).data);
  });

  it('names exactly five variants and withdraws both historical universals', () => {
    const verdict = article.split('## The verdict')[1];
    expect(verdict).toContain('π0.5, π0.6-MEM, π0.7, Gemini Robotics 1.5 and GO-2');
    for (const phrase of [
      'same model', 'high-level policy', 'low-level policy', 'BAGEL-initialized world model',
      'separate threads', 'With thinking enabled', 'separate GR-ER 1.5 orchestrator',
      'AgiBot describes GO-2', 'lower-frequency', 'higher-frequency',
      "wiki's synthesis", 'does not assume shared weights',
      'not evidence that separate planners have been superseded across the field',
      'no field-wide absence of runtime keypoint interfaces is claimed',
      'not proof that a specific deployed controller uses a keypoint loop',
      'training data, model capabilities and deployed control loops require different evidence',
    ]) expect(verdict).toContain(phrase);
    expect(verdict).not.toMatch(/Helix|π0\.6,/);
  });

  it('preserves all original cells as history and earns only a conditional C correction', () => {
    expect(originalClaimDigest(oldCells)).toBe('332cbc99d6db8793fc088a0b54ef1c8cec29a29f34d70f77a91ed98ba589cdf4');
    expect(row().claim).toBe(oldCells.claim);
    expect(row().sourceChecked).toBe(oldCells.sourceChecked);
    expect(row().verdict).toBe(correctedVerdict);
    expect(row().note).toContain(`Original four-cell history: ${JSON.stringify(oldCells)}`);
    expect(row().note).toContain('The original supersession AND keypoint-migration universals are not verified');
    expect(row().evidenceFailures).toEqual([]);
    expect(row().outcome).toBe('passing');
  });

  it('retains all six AND parts and exactly seven citation/source pairs', () => {
    const p = selectedPlan();
    expect(p).toBeDefined();
    expect(p.parts).toEqual(expectedParts);
    expect(p.evidence.map(e => ({
      partId: e.partId, citationId: e.citationId, sourceUrl: e.sourceUrl,
      passageSha256: sha256(e.supportingPassage),
    }))).toEqual(expectedPairs);
    expect(p.parts).toHaveLength(6);
    expect(p.evidence).toHaveLength(7);
    expect(row().compound?.structuralFailures).toEqual([]);
    expect(row().compound?.adjudicationFailures).toEqual([]);
    expect(row().citationId).toBe('');
    expect(row().sourceUrl).toBe('');
    expect(row().supportingPassage).toBe('');
  });

  it('binds genuine current worker reviews to the changed tuple and evidence', () => {
    const p = selectedPlan();
    expect(p).toBeDefined();
    expect(p.originalCellsDigest).toBe(originalClaimDigest(row()));
    expect(p.originalCellsDigest).not.toBe(originalClaimDigest(oldCells));
    expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
    expect(p.planReview?.reviewedBy).toContain('cabba322-3087-4e1a-a633-ae4022af946c');
    expect(p.planReview?.reviewedBy).toContain('custom:droidproxy:gpt-6-astra');
    expect(p.planReview?.reviewedBy).toContain('max');
    expect(p.adjudications.map(a => a.partId)).toEqual(expectedParts.map(p => p.id));
    for (const a of p.adjudications) {
      expect(a.outcome).toBe('supported');
      expect(a.evidenceDigest).toBe(compoundPartDigest(p, a.partId));
      expect(a.reviewedBy).toBe(p.planReview?.reviewedBy);
      expect(a.rationale.length).toBeGreaterThan(100);
    }
    for (const text of ['zero new source requests', 'tool-reported 200',
      'GR1.5 retrieval time unavailable', 'not independent acceptance']) expect(row().note).toContain(text);
  });

  it.each(expectedParts.map(p => p.id))('rejects missing required evidence for AND part %s', id => {
    const broken = mutatedCatalog(p => {
      p.evidence = p.evidence.filter(e => e.partId !== id);
      rehashFixtureReviews(p);
    });
    expect(row(broken).compound?.structuralFailures).toContain(
      'compound item coverage must equal every required (part, citation) pair; duplicate source items and extras fail',
    );
    expect(row(broken).evidenceFailures.length).toBeGreaterThan(0);
  });

  it('rejects dropping a complete part instead of fulfilling its obligation', () => {
    const broken = mutatedCatalog(p => {
      p.parts = p.parts.filter(x => x.id !== 'geometry');
      p.evidence = p.evidence.filter(x => x.partId !== 'geometry');
      p.adjudications = p.adjudications.filter(x => x.partId !== 'geometry');
    });
    expect(row(broken).compound?.adjudicationFailures).toContain(
      'compound plan review is missing or stale; changed/reduced plans need source-auditor review',
    );
  });

  it('rejects a real registered-but-wrong citation pair despite fresh fixture hashes', () => {
    const broken = mutatedCatalog(p => {
      const e = p.evidence.find(e => e.partId === 'geometry' && e.citationId === 'pi05-2025')!;
      e.citationId = 'pi07-2026';
      e.sourceUrl = 'https://www.pi.website/download/pi07.pdf';
      rehashFixtureReviews(p);
    });
    expect(row(broken).compound?.structuralFailures).toContain(
      'compound item coverage must equal every required (part, citation) pair; duplicate source items and extras fail',
    );
    expect(row(broken).compound?.adjudicationFailures).toEqual([]);
  });

  it('preserves prior original14 and every preceding/following article byte', () => {
    expect(article.split(prior14Span)).toHaveLength(2);
    expect(originalClaimDigest(section().claimRecords[13])).toBe(
      '1ffddfee218f90234e2704b81ccbaabc74f2f001d03ec5135a6cc4e73d96ede0',
    );
    expect(section().claimRecords).toHaveLength(16);
    expect(section().claimRecords[13].evidenceFailures).toEqual([]);
    expect(prose(before()).members[0].hash).toBe(oldHash);
  });

  it('appends one exact permanent native approval under real dispatch authority', () => {
    const matches = approvals.filter(d => d.id === deltaId);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      manifest: 'prose', memberId: 'article:manipulation/hierarchical', oldHash, newHash,
      responsibleMilestone: 'brand-v2-editorial', disposition: 'permanent',
    });
    for (const text of ['Josef', 'convergence-hierarchy15-integration-20260921/authorization.json',
      'not a new human signature']) expect(matches[0].ownerApproval).toContain(text);
    expect(validateApprovedDeltas(matches)).toEqual([]);
  });

  it('passes exact approval and rejects missing, wrong-hash and broadened corrections', () => {
    const matches = approvals.filter(d => d.id === deltaId);
    expect(matches).toHaveLength(1);
    expect(compareBaseline(bundle(before()), bundle(article), matches)).toMatchObject({
      ok: true, failures: [], approvedDifferences: [deltaId],
    });
    expect(compareBaseline(bundle(before()), bundle(article), []).ok).toBe(false);
    expect(compareBaseline(bundle(before()), bundle(article), [{ ...matches[0], newHash: '0'.repeat(64) }]).ok).toBe(false);
    expect(compareBaseline(bundle(before()), bundle(article + '\nUnapproved extra assertion.'), matches).ok).toBe(false);
  });
});
