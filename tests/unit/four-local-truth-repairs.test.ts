import { createHash } from 'node:crypto';
import { committedSource, CONTINUATION_CHECKPOINT, preservedApprovalPacket, preservedCompoundPacket } from '../helpers/continuation-integration';
import { headReanchorFor } from './helpers/continuation-merge-ledger';
import { planPacket, preservedLegacySurvivors } from '../helpers/audit-plan-history';
import type { LocalPlan } from '../../lib/audit-local-basis';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { beforeAll, describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import { loadLocalBasisContext } from '../../lib/audit-local-basis';
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
// This regression pins the historical repair; crossdomain closure tests the later removal.
const generalist = read('audit/evidence/crossdomain-closure-20260923/before-content--manipulation--generalist-policies.mdx.txt');
const motion = read('content/classical/motion-planning.mdx');
const perception = read('content/classical/perception.mdx');
const rrtComponent = read('components/interactive/rrt-explorer.tsx');
const plansText = read('audit/compound-evidence.json');
const plans = parseCompoundPlans(JSON.parse(plansText));
const registryIds = new Set(CITATIONS.map(({ id }) => id));
const row = (ledgerPath: string, slug: string, ordinal: number) => parseLedger(
  ledgerPath, read(ledgerPath), registryIds, { compoundPlans: plans, localBasis: loadLocalBasisContext(process.cwd(), publishedModules().map(m => `/${m.domain}/${m.slug}/`)) },
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

  beforeAll(() => {
    // Warm the historical-render caches once; the first neutralized catalog
    // render is expensive and individual tests must stay under 5s.
    preservedCompoundPacket(CONTINUATION_CHECKPOINT);
  }, 120_000);
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
    const record = JSON.parse(read('audit/evidence/industrial-closure-20260923/row-history.json'))
      .find((r: { rowOrdinal: number }) => r.rowOrdinal === 9).currentCells;
    expect(record.sourceChecked).toContain('i.e. +2.2%');
    expect(record.sourceChecked).not.toContain('+2.3%');
    expect(record.note).toContain('i.e. +2.3%');
    expect(hash(read('lib/deployment-economics.ts')))
      .toBe('ddf25da06dd0a3b26230ea183aaccc9a2574679612fca2292e8cd8437e37113e');
    expect(hash(committedSource('d928b6b', 'components/interactive/deployment-economics.tsx')))
      .toBe('0e982f1dde7f8be7fb5c1d70bda395dc80c403fbdda210b703a45d2870bf6756');
    expect(read('components/interactive/deployment-economics.tsx'))
      .toBe(committedSource('358f505', 'components/interactive/deployment-economics.tsx'));
  });

  it('acknowledges the known goal and states the actual sampling probability', () => {
    expect(motion).toContain('1.5% goal-sampling probability');
    expect(motion).toContain('Sampling is otherwise uniform.');
    expect(motion).not.toContain('Nothing in it knows where the goal is.');
    expect(rrtComponent).toContain('Each sampling attempt selects the goal with probability 1.5%');
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
    const prior = read('audit/evidence/classical-closure-20260923/rrt-component-before.tsx.txt');
    const beforeDisclosure = (text: string) => text.slice(0, text.lastIndexOf('      <p className="mt-2 font-sans'));
    expect(beforeDisclosure(rrtComponent)).toBe(beforeDisclosure(prior));
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
    expect(perception).toContain('With the default opaque-target, depth and pose settings and a half-degree angle');
    expect(perception).toContain('The far-end readout falls in the marginal model band');
    expect(perception).toContain('not a prediction that a real grasp will succeed or jam');
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
    it(`preserves ${slug}:${ordinal} history and the current disposition`, () => {
      let record = row(ledgerPath, slug, ordinal);
      if (slug === 'generalist-policies') {
        expect(record.verdict).toBe('C');
        expect(record.evidenceFailures).toEqual([]);
        const history = JSON.parse(read('audit/evidence/crossdomain-closure-20260923/row-history.json')).rows[0];
        expect(history.originalHistory.originalTupleDigest).toBe(oldDigest);
        expect(history.currentCells.note).toContain('not external source verification or whole-record completion');
        return;
      }
      if (ledgerPath === 'audit/classical.md') {
        expect(record.verdict).toBe('C');
        expect(record.evidenceFailures).toEqual([]);
        expect(record.localBasis).toBeDefined();
        const histories = JSON.parse(read('audit/evidence/classical-closure-20260923/row-history.json')).rows;
        const binding = histories.find((h: { originalId: string }) => h.originalId === `${ledgerPath}:${slug}:${ordinal}`);
        expect(binding.currentCells.note).toContain('Historical four-cell record retained:');
        expect(binding.currentCells.note).toContain('not external source verification or whole-record completion');
        expect(binding).toBeDefined();
        return;
      }
      const historical = slug === 'industrial-deployment';
      record = historical ? parseLedger(ledgerPath,
        committedSource(CONTINUATION_CHECKPOINT, ledgerPath), registryIds,
        // Plans appended by the 2026-09-24 imported stack-classical packet bind
        // only to rows added after this checkpoint; historical parses exclude them.
        { compoundPlans: plans.filter(p => ![
          'stack-droid-oxe-20260924', 'stack-lerobot-20260924', 'stack-robomimic-20260924',
          'stack-openvla-20260924', 'stack-libero-plus-20260924', 'calib-handeye-axxb-20260924',
          'calib-hwangbo-actuator-20260924', 'ros2-lyrical-release-20260924',
        ].includes(p.id)) })
        .find(s => s.slug === slug)!.claimRecords[ordinal - 1] : row(ledgerPath, slug, ordinal);
      if (historical) {
        const archived = JSON.parse(read('audit/evidence/industrial-closure-20260923/row-history.json'))
          .find((r: { rowOrdinal: number }) => r.rowOrdinal === ordinal);
        expect(archived.currentTupleDigest).toBe(originalClaimDigest(record));
        expect(row(ledgerPath, slug, ordinal).verdict).toBe('C');
      }
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
    expect(preservedCompoundPacket(CONTINUATION_CHECKPOINT)).toHaveLength(863);
    expect(hash(committedSource(CONTINUATION_CHECKPOINT, 'audit/compound-evidence.json')))
      .toBe('6c1289de546d4bfc08fb66769da6ebb7ad809e92c950de1fdbaf2782bae75ee9');
  });

  it.each(['missing-survivor', 'changed-survivor', 'reordered-survivors', 'duplicate-survivor',
    'restored-legacy', 'missing-successor', 'wrong-successor', 'duplicate-successor', 'corrupt-archive'])(
    'rejects an unexplained migration/preservation defect: %s', mutation => {
      const prior = preservedCompoundPacket(CONTINUATION_CHECKPOINT);
      // RoboMIND has its own independently checked in-place successor.
      const before = prior.map(p => p.id === 'datasets-10-robomind-20260916c' ? plans.find(q => q.id === p.id)! : p);
      const current = structuredClone(plans);
      const typed: LocalPlan[] = JSON.parse(read('audit/local-basis.json')).plans;
      if (mutation === 'missing-survivor') current.shift();
      if (mutation === 'changed-survivor') current[0].parts[0].text += ' drift';
      if (mutation === 'reordered-survivors') [current[0], current[1]] = [current[1], current[0]];
      if (mutation === 'duplicate-survivor') current.push(current[0]);
      if (mutation === 'restored-legacy') current.push(prior.find(p => p.id === 'reward-design-mpc-original-4-20260916')!);
      if (mutation === 'missing-successor') typed.shift();
      if (mutation === 'wrong-successor') typed[0].originalId += '-wrong';
      if (mutation === 'duplicate-successor') typed.push(typed[0]);
      const archive = (path: string) => mutation === 'corrupt-archive'
        ? Buffer.from(read(path) + ' ') : Buffer.from(read(path));
      expect(() => preservedLegacySurvivors(before, current, typed, archive)).toThrow();
    },
  );
  it('rejects missing, duplicated, reordered or noncontiguous selected packet identities', () => {
    const packet = [{ id: 'one' }, { id: 'two' }];
    expect(planPacket(packet, ['one', 'two'])).toEqual(packet);
    for (const broken of [packet.slice(0, 1), [...packet, packet[0]], [...packet].reverse(),
      [packet[0], { id: 'unrelated' }, packet[1]]]) {
      expect(() => planPacket(broken, ['one', 'two'])).toThrow();
    }
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
    const missionEntries = preservedApprovalPacket(CONTINUATION_CHECKPOINT);
    for (const delta of mine) {
      const path = delta.manifest === 'prose'
        ? `content/${delta.memberId.slice('article:'.length)}.mdx`
        : delta.memberId.slice('source:'.length);
      const source = committedSource(CONTINUATION_CHECKPOINT, path);
      // Match publishedMdx(): the native prose member trims the MDX body.
      const value: ManifestInput['value'] = delta.manifest === 'prose'
        ? { path, body: matter(source).content.trim() }
        : { path, source };
      const currentDelta = [...missionEntries].reverse().find(e => e.manifest === delta.manifest && e.memberId === delta.memberId)!;
      expect(currentDelta.newHash).toBe(buildManifest(delta.manifest, [
        { id: delta.memberId, value },
      ]).members[0].hash);
      const prior = missionEntries.slice(0, missionEntries.findIndex(entry => entry.id === delta.id)).reverse().find(
        (entry) => entry.manifest === delta.manifest && entry.memberId === delta.memberId,
      );
      expect(delta.oldHash).toBe(prior?.newHash);
      const currentSource = read(path);
      const currentValue: ManifestInput['value'] = delta.manifest === 'prose'
        ? { path, body: matter(currentSource).content.trim() }
        : { path, source: currentSource };
      const merged = headReanchorFor(entries, delta.manifest, delta.memberId);
      expect(merged?.newHash ?? delta.newHash).toBe(buildManifest(delta.manifest, [
        { id: delta.memberId, value: currentValue },
      ]).members[0].hash);
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
