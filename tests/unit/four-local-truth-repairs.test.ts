import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { originalClaimDigest, parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';
import {
  buildManifest, validateApprovedDeltas, type ApprovedDelta, type ManifestInput,
} from '../../lib/brand-v2-baseline';
import { computeEconomics, DEFAULT_INPUTS } from '../../lib/deployment-economics';
import { GENERALIST_RELEASES } from '../../lib/generalist-policies';
import {
  classifyVerdict, composeBudget, DEFAULT_PARAMS, handEyeErrorMm,
} from '../../lib/perception-error';
import { buildRrt, RRT_DEFAULTS, RRT_SCENE } from '../../lib/rrt';

const read = (path: string) => readFileSync(path, 'utf8');
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const generalist = read('content/manipulation/generalist-policies.mdx');
const motion = read('content/classical/motion-planning.mdx');
const perception = read('content/classical/perception.mdx');
const rrtComponent = read('components/interactive/rrt-explorer.tsx');
const plansText = read('audit/compound-evidence.json');
const plans = parseCompoundPlans(JSON.parse(plansText));
const registryIds = new Set(CITATIONS.map(({ id }) => id));
const row = (ledgerPath: string, slug: string, ordinal: number) => parseLedger(
  ledgerPath, read(ledgerPath), registryIds, { compoundPlans: plans },
).find((section) => section.slug === slug)!.claimRecords[ordinal - 1];
const selected = [
  ['audit/manipulation.md', 'generalist-policies', 19,
    '3e64bca94fb54e81c4aeb3a400fc37f7c51a87aea1934531a279d0defa21f36e'],
  ['audit/data-hardware.md', 'industrial-deployment', 9,
    '5b4a5dd9a12609375c98b63ba4e10c242f5cae5edae7ea20fe22f1765da7cb97'],
  ['audit/classical.md', 'motion-planning', 15,
    '7049772574aeca8ddf3b9e4d8f56849a29290353d81501e7cf5943ce052e94d6'],
  ['audit/classical.md', 'perception', 7,
    '3ce776f38111fa07a7ad67859a6c754304a6fe2662424062d0d281a66a1a1b6e'],
] as const;
const oldComment = ` * Provenance tiers record how much independent scrutiny a release carries:
 *   paper: a public arXiv report with methods and experiments
 *   docs:  repository release notes (code and weights exist, prose is thin)
 *   blog:  a detailed lab blog, vendor-reported, no external replication
 *   press: company announcement; technical disclosure varies by source`;
const newComment = ` * Provenance tiers record the source format selected for each timeline entry,
 * not a measure of independent scrutiny or an inventory of all available work:
 *   paper: a public arXiv report
 *   docs:  repository release notes
 *   blog:  a lab blog
 *   press: company announcement; technical disclosure varies by source`;

describe('four bounded local truth repairs without completion credit', () => {
  it('retains the authored inventory and does not turn unknown availability into false', () => {
    expect(GENERALIST_RELEASES).toHaveLength(13);
    expect(GENERALIST_RELEASES.filter(({ openWeights }) => openWeights === true)
      .map(({ id }) => id)).toEqual(['gr00t-n1', 'agibot-go1', 'pi05-context', 'gr00t-n17']);
    expect(GENERALIST_RELEASES.filter(({ openWeights }) => openWeights === null)).toHaveLength(6);
    expect(GENERALIST_RELEASES.filter(({ openWeights }) => openWeights === false)).toHaveLength(3);
    expect(['paper', 'docs', 'blog', 'press'].map(
      (tier) => GENERALIST_RELEASES.filter(({ provenance }) => provenance === tier).length,
    )).toEqual([5, 1, 5, 2]);
  });

  it('labels the count as timeline entries and the four markers as downloads, not licenses', () => {
    expect(generalist).toContain('<Stat label="timeline entries" value="13" note="report and announcement dates, Feb 2025 to Jul 2026" accent />');
    expect(generalist).toContain('<Stat label="marked downloadable" value="4" note="GR00T N1 and N1.7, GO-1, π0.5; not license classifications" />');
    expect(generalist).not.toContain('<Stat label="releases tracked"');
    expect(generalist).not.toContain('<Stat label="open weights"');
  });

  it('describes selected source formats without asserting a replication census', () => {
    expect(generalist).toContain('<Stat label="arXiv papers" value="5" note="selected sources in this timeline" />');
    expect(generalist).toContain('<Stat label="blog/press sources" value="7" note="selected formats, not a replication census" />');
    expect(generalist).toContain('both Helix generations, π0.6, π0.7, Gemini Robotics 2, GO-2, and Skild');
    expect(generalist).toContain('not whether later papers or independent replications exist');
    expect(generalist).toContain('an announcement is not independent verification');
    expect(generalist).not.toContain('blog or press, no external check');
    expect(generalist).not.toContain('releases above rest on lab blogs or press releases with no external replication');
  });

  it('changes only the authorized library comment, preserving dates, data and functions', () => {
    const library = read('lib/generalist-policies.ts');
    expect(library).toContain(newComment);
    expect(library).not.toContain(oldComment);
    expect(hash(library.replace(newComment, () => oldComment)))
      .toBe('6957faa28717d96fe5fd4635b931856a1ce74e059d4cbb2a83ada7ab424569eb');
  });

  it('rounds the default payback increase to 2.2%, not 2.3%', () => {
    const before = computeEconomics(DEFAULT_INPUTS).paybackMonths!;
    const after = computeEconomics({ ...DEFAULT_INPUTS, successRatePercent: 99 }).paybackMonths!;
    expect(before).toBeCloseTo(11.564527757750536, 12);
    expect(after).toBeCloseTo(11.824080749819759, 12);
    const percent = 100 * (after / before - 1);
    expect(percent).toBeCloseTo(2.2443890274314926, 10);
    expect(percent.toFixed(1)).toBe('2.2');
    expect(percent.toFixed(1)).not.toBe('2.3');
  });

  it('corrects only the active industrial percentage, retaining the old value as history', () => {
    const record = row('audit/data-hardware.md', 'industrial-deployment', 9);
    expect(record.sourceChecked).toContain('i.e. +2.2%');
    expect(record.sourceChecked).not.toContain('+2.3%');
    expect(record.note).toContain('i.e. +2.3%');
    expect(hash(read('lib/deployment-economics.ts')))
      .toBe('ddf25da06dd0a3b26230ea183aaccc9a2574679612fca2292e8cd8437e37113e');
    expect(hash(read('components/interactive/deployment-economics.tsx')))
      .toBe('0e982f1dde7f8be7fb5c1d70bda395dc80c403fbdda210b703a45d2870bf6756');
  });

  it('acknowledges the known goal and states the actual sampling probability', () => {
    expect(motion).toContain('Sampling is mostly uniform, with a small bias toward the known goal.');
    expect(motion).not.toContain('Nothing in it knows where the goal is.');
    expect(rrtComponent).toContain('Each step samples a random point (1.5% of');
    expect(rrtComponent).not.toContain('Each step samples a random point (2% of');
  });

  it('preserves RRT seed, scene, algorithm and the distinction between goal-biased and uniform sampling', () => {
    expect(RRT_DEFAULTS).toEqual({ seed: 19981001, stepSize: 2, goalBias: 0.015, maxIterations: 900 });
    expect(RRT_SCENE).toMatchObject({ width: 100, height: 64 });
    expect(RRT_SCENE.obstacles).toHaveLength(5);
    const biased = buildRrt(RRT_SCENE);
    expect(biased).toEqual(buildRrt(RRT_SCENE));
    expect(biased.nodes).not.toEqual(buildRrt(RRT_SCENE, { goalBias: 0 }).nodes);
    expect(hash(read('lib/rrt.ts')))
      .toBe('3b7f3ab7234c342e9762bd987306492b09e0c62b82a827b4b369b00d56ead4ad');
  });

  it('changes no RRT controls, styling, geometry or behavior', () => {
    expect(hash(rrtComponent.replace('Each step samples a random point (1.5% of',
      'Each step samples a random point (2% of')))
      .toBe('7ea71ca479e18a398417296a2723959a0c3f13df80eb6d43252b72025ca8f126');
  });

  it('evaluates the half-degree example as marginal at the far distance', () => {
    expect(handEyeErrorMm(0.5, 0.15)).toBeCloseTo(1.3090301686138184, 12);
    expect(handEyeErrorMm(0.5, 1.5)).toBeCloseTo(13.090301686138185, 12);
    const far = composeBudget({ ...DEFAULT_PARAMS, workingDistanceM: 1.5 });
    expect(far.totalMm).toBeCloseTo(16.74383463350353, 12);
    expect(far.verdict).toBe('marginal');
    expect(far.verdict).not.toBe('jam');
  });

  it('makes the walkthrough conditional on the default target and other settings', () => {
    expect(perception).toContain('With the default opaque target and depth and pose settings');
    expect(perception).toContain('the largest modeled contribution, while the far-end verdict is marginal, not will jam.');
    expect(perception).not.toContain('a term that was invisible at 15 cm becomes the one that jams the grasp');
  });

  it('retains the actual verdict thresholds and the preceding perception2/19 repairs', () => {
    expect(classifyVerdict(15)).toBe(classifyVerdict(0));
    expect(classifyVerdict(15.001)).toBe('marginal');
    expect(classifyVerdict(30)).toBe('marginal');
    expect(classifyVerdict(30.001)).not.toBe('marginal');
    expect(hash(read('lib/perception-error.ts')))
      .toBe('33241424af80e2790481d2836f30682dd35ffd942246d4df43a08238920209b5');
    expect(perception).toContain('does not establish that calibration, depth and pose errors are statistically independent');
    expect(perception).toContain('not a full three-dimensional hand-eye error model');
    expect(perception).toContain('\n$$\ne_\\theta(d) = d \\, \\tan \\theta\n$$\n');
  });

  for (const [ledgerPath, slug, ordinal, oldDigest] of selected) {
    it(`keeps ${slug}:${ordinal} unresolved with the exact old tuple and no invented evidence`, () => {
      const record = row(ledgerPath, slug, ordinal);
      expect(record.verdict).toBe('UNRESOLVED (bounded local-text correction only; external-passage requirement remains unmet)');
      expect(record.outcome).toBe('unresolved');
      expect(record.evidenceFailures).toHaveLength(3);
      expect(record.citationId).toBe('');
      expect(record.sourceUrl).toBe('');
      expect(record.supportingPassage).toBe('');
      expect(record.compound).toBeUndefined();
      const history = record.note.match(/^Historical four-cell record retained: (.+) Correction rationale:/);
      expect(history).not.toBeNull();
      expect(originalClaimDigest(JSON.parse(history![1]))).toBe(oldDigest);
      expect(record.note).toContain('not external source verification or whole-record completion');
      expect(record.note).toContain('No primary fetch was performed in preparation.');
    });
  }

  it('does not create synthetic local-code plans or modify the existing native catalog', () => {
    expect(plans).toHaveLength(863);
    expect(hash(plansText)).toBe('fdb5956ab68cfdd003b205134112f197131bc7f39d8c0426e81810e859709a49');
  });

  it('adds exactly the four necessary native member approvals, not a gate waiver', () => {
    const entries = (JSON.parse(read('contract/brand-v2-approved-deltas.json')) as {
      entries: ApprovedDelta[];
    }).entries;
    const mine = entries.filter(({ id }) => id.startsWith('four-local-truth-repairs-20260922-'));
    expect(mine.map(({ manifest, memberId }) => [manifest, memberId])).toEqual([
      ['prose', 'article:manipulation/generalist-policies'],
      ['prose', 'article:classical/motion-planning'],
      ['prose', 'article:classical/perception'],
      ['interactive-sources-mounts', 'source:components/interactive/rrt-explorer.tsx'],
    ]);
    expect(validateApprovedDeltas(mine)).toEqual([]);
    for (const delta of mine) {
      const path = delta.manifest === 'prose'
        ? `content/${delta.memberId.slice('article:'.length)}.mdx`
        : delta.memberId.slice('source:'.length);
      const source = read(path);
      // Match publishedMdx(): the native prose member trims the MDX body.
      const value: ManifestInput['value'] = delta.manifest === 'prose'
        ? { path, body: matter(source).content.trim() }
        : { path, source };
      expect(delta.newHash).toBe(buildManifest(delta.manifest, [
        { id: delta.memberId, value },
      ]).members[0].hash);
      const prior = entries.slice(0, entries.indexOf(delta)).reverse().find(
        (entry) => entry.manifest === delta.manifest && entry.memberId === delta.memberId,
      );
      expect(delta.oldHash).toBe(prior?.newHash);
      if (delta.manifest === 'prose') {
        expect(delta.newHash).not.toBe(buildManifest('prose', [{
          id: delta.memberId, value: { path, body: matter(source).content },
        }]).members[0].hash);
      }
      expect(delta.oldHash).not.toBe(delta.newHash);
      expect(delta.ownerApproval).toContain('zero completion credit');
      expect(delta.ownerApproval).toContain('No local-proof, P2, VAL-AUDIT-009');
    }
  });
});
