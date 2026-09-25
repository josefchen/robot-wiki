import { readFileSync } from 'node:fs';
import { preservedPreIndustrialCitations } from '../helpers/industrial-integration';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { DATASETS, type Dataset } from '../../data/datasets';
import { CITATIONS } from '../../data/citations';
import {
  compoundPartDigest, compoundPlanDigest, originalClaimDigest, parseLedger,
  type CompoundPlan,
} from '../../lib/audit-ledger';
import {
  BASELINE_KINDS, buildManifest, compareBaseline, isRenderedValueStateTokenAt, sha256,
  type ApprovedDelta, type BaselineBundle,
} from '../../lib/brand-v2-baseline';
import { committedSource, preservedApprovalPacket } from '../helpers/continuation-integration';
import { readerTruthAt, READER_RELEASE_BASE } from '../helpers/reader-integration';
import { currentAuditContext, finalSevenBefore } from '../helpers/residual-integration';
import { preservedLegacySurvivors } from '../helpers/audit-plan-history';
import { committedText, committedJson } from '../helpers/editorial-current-context';

const root = resolve(import.meta.dirname, '../..');
const base = '358f5050333386606f041505613e4a65d90dc703';
const checkpoint = 'f2cae9e5983a2e4f686adec4f37c3b26e4b67e74';
const hoursCommit = 'f2cae9e5983a2e4f686adec4f37c3b26e4b67e74';
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const before = (path: string) => committedText(base, path);
const atHours = (path: string) => committedText(hoursCommit, path);
const articlePath = 'content/data-hardware/datasets.mdx';
const adjacentPath = 'content/data-hardware/data-bottleneck.mdx';
const article = read(articlePath);
const ledgerPath = 'audit/data-hardware.md';
const plans: CompoundPlan[] = JSON.parse(read('audit/compound-evidence.json'));
const planId = 'datasets-10-robomind-20260916c';
const selected = (catalog = plans) => catalog.find(p => p.id === planId)!;
const robomind = DATASETS.find(d => d.id === 'robomind')!;
const ids = new Set(CITATIONS.map(c => c.id));
const row = (catalog = plans) => parseLedger(ledgerPath, read(ledgerPath), ids, {
  compoundPlans: catalog, articleCitations: { datasets: matter(article).data.citations },
}).find(s => s.slug === 'datasets')!.claimRecords[9];
const approvalMembers = [
  ['prose', 'article:data-hardware/data-bottleneck'],
  ['prose', 'article:data-hardware/datasets'],
  ['relationships', 'article:data-hardware/datasets'],
  ['value-states', 'state-site:content/data-hardware/datasets.mdx:not-disclosed:6'],
] as const;

// Reconstruct only this transaction's four members from both committed states.
// Historical TypeScript is never imported or executed.
function hoursApprovalBundle(old: boolean): BaselineBundle {
  const articles = [articlePath, adjacentPath].map(path => ({
    path, parsed: matter(old ? before(path) : atHours(path)),
  }));
  const datasetArticle = articles.find(a => a.path === articlePath)!.parsed;
  const matches = (pattern: RegExp) =>
    [...datasetArticle.content.trim().matchAll(pattern)].map(m => m[1]).sort();
  const historicalStates = [];
  const source = old ? before(articlePath) : atHours(articlePath);
  const rendered = 'not disclosed';
  let offset = 0;
  let ordinal = 0;
  while ((offset = source.indexOf(rendered, offset)) !== -1) {
    ordinal += 1;
    if (isRenderedValueStateTokenAt(source, rendered, offset)) {
      const value = {
        id: `state-site:${articlePath}:not-disclosed:${ordinal}`,
        state: 'not-disclosed', rendered,
      };
      historicalStates.push({ id: value.id, value });
    }
    offset += rendered.length;
  }
  const sources = [
    buildManifest('prose', articles.map(({ path, parsed }) => ({
      id: `article:${path.slice(8, -4)}`, value: { path, body: parsed.content.trim() },
    }))),
    buildManifest('relationships', [{
      id: 'article:data-hardware/datasets',
      value: {
        seeAlso: datasetArticle.data.seeAlso,
        citations: matches(/<Cite\s+id=["']([^"']+)["']/g),
        terms: matches(/<Term\s+id=["']([^"']+)["']/g),
        internalLinks: matches(/\]\((\/[^)#?]+\/?)(?:#[^)]+)?\)/g),
      },
    }]),
    buildManifest('value-states', historicalStates),
  ];
  const manifests = Object.fromEntries(BASELINE_KINDS.map(kind => {
    const scaffold = buildManifest(kind, [{ id: 'fixture:unchanged', value: 'bounded comparison' }]);
    const members = sources.find(m => m.kind === kind)?.members.filter(m =>
      approvalMembers.some(([k, id]) => k === kind && id === m.id)) ?? [];
    return [kind, { ...scaffold, members, memberCount: members.length }];
  })) as BaselineBundle['manifests'];
  return {
    schemaVersion: 1, source: { commit: base, tree: '', trackedWorktreeClean: false },
    tools: { node: '', npm: '', playwright: '', next: '', typescript: '', vitest: '', lockfileSha256: '' },
    manifests,
    manifestRoots: Object.fromEntries(BASELINE_KINDS.map(k => [k, manifests[k].rootHash])) as BaselineBundle['manifestRoots'],
    rootHash: '',
  };
}

const beforeApprovalBundle = hoursApprovalBundle(true);
const currentApprovalBundle = hoursApprovalBundle(false);
const hoursApprovals: ApprovedDelta[] = JSON.parse(read('contract/brand-v2-approved-deltas.json'))
  .entries.filter((a: ApprovedDelta) => a.id.startsWith('robomind-hours-20260923-'));

function assertScope(dataset: Dataset, text: string) {
  expect(dataset.hours).toBe(305.5);
  expect(dataset.episodes).toBe(107000);
  expect(dataset.license).toBeNull();
  expect(dataset.hoursNote).toContain('real + simulated');
  expect(dataset.hoursNote).toContain('real-only and failure-set durations not separately reported');
  expect(dataset.episodesNote).toContain('107k successful');
  expect(dataset.episodesNote).toContain('5k additional real-world failures');
  expect(dataset.episodesNote).not.toContain('incl. 5k');
  expect(text).toContain('107,000 successful trajectories totaling 305.5 interaction hours');
  expect(text).toContain('The cohort mixes real-world and simulated demonstrations');
  expect(text).toContain('In addition to the 107k successful trajectories');
  expect(text).toContain('Real-only, additional-failure-set and per-release durations are not separately reported');
}

describe('RoboMIND paper-v3 hours correction, zero completion credit', () => {
  it('binds the exact decimal to the successful mixed cohort, not the additional failures', () => {
    assertScope(robomind, article);
    expect(article).not.toContain('only DROID and AgiBot World publish an hour count');
    expect(article).not.toContain('most cells read "not disclosed."');
    expect(article).toContain('then sort by Hours to compare the published durations and their scope notes.');
    expect(DATASETS.filter(d => d.hours !== null)).toHaveLength(3);
  });

  it.each([
    ['missing duration', { hours: null }],
    ['rounded duration', { hours: 306 }],
    ['invented duration', { hours: 5000 }],
    ['real-only scope', { hoursNote: '305.5 real-world hours' }],
    ['failures included', { episodesNote: '107k successful; incl. 5k failures' }],
    ['invented license', { license: 'Apache-2.0' }],
  ] satisfies [string, Partial<Dataset>][])('rejects %s', (_name, mutation) => {
    assertScope(robomind, article);
    expect(() => assertScope({ ...robomind, ...mutation }, article)).toThrow();
  });

  it.each([
    'successful trajectories totaling 305.5 interaction hours',
    'The cohort mixes real-world and simulated demonstrations',
    'In addition to the 107k successful trajectories',
    'Real-only, additional-failure-set and per-release durations are not separately reported',
  ])('rejects lost prose qualification: %s', phrase => {
    assertScope(robomind, article);
    expect(() => assertScope(robomind, article.replace(phrase, ''))).toThrow();
  });

  it('changes only the real-world qualifier in the adjacent article', () => {
    expect(committedSource(checkpoint, adjacentPath)).toBe(before(adjacentPath).replace(
      'Robot data is different. Every hour of it',
      'Real-world robot data is different. Every hour of it',
    ));
    expect(finalSevenBefore(adjacentPath)).toBe(committedSource(READER_RELEASE_BASE, adjacentPath).replace(
      'Robot data is different. Every hour of it',
      'Real-world robot data is different. Every hour of it',
    ));
    expect(read(adjacentPath)).toBe(committedSource('ba934e6', adjacentPath));
    expect(read(adjacentPath)).toContain('Real-world robot data is different. Every hour of it');
    expect(matter(article).data).toEqual(matter(committedSource(READER_RELEASE_BASE, articlePath)).data);
    expect(committedSource(checkpoint, 'data/citations.ts')).toBe(before('data/citations.ts'));
    preservedPreIndustrialCitations(READER_RELEASE_BASE);
    expect(atHours(adjacentPath)).toBe(before(adjacentPath).replace(
      'Robot data is different. Every hour of it',
      'Real-world robot data is different. Every hour of it',
    ));
    expect(read(adjacentPath)).toContain('Real-world robot data is different. Every hour of it');
    expect(matter(atHours(articlePath)).data).toEqual(matter(before(articlePath)).data);
    expect(atHours('data/citations.ts')).toBe(before('data/citations.ts'));
  });

  it('preserves the complete licensing disclosure and unknown durations elsewhere', () => {
    const licensing = 'The inspected public card displays an Apache-2.0 license badge';
    expect(article.slice(article.indexOf(licensing))).toBe(
      committedSource(READER_RELEASE_BASE, articlePath).slice(committedSource(READER_RELEASE_BASE, articlePath).indexOf(licensing)),
    );
    for (const id of ['open-x-embodiment', 'bridgedata-v2', 'agibot-world-2026']) {
      expect(DATASETS.find(d => d.id === id)!.hours).toBeNull();
    }
  });

  it('keeps all five external obligations and current digest-bound reviews', () => {
    const plan = selected();
    expect(plan.parts.map(p => p.id)).toEqual([
      'ds10-counts-and-robots', 'ds10-failures-and-twin', 'ds10-release-scope',
      'ds10-published-badge-and-access', 'ds10-license-disclosure',
    ]);
    expect(plan.originalCellsDigest).toBe(originalClaimDigest(row()));
    expect(row().outcome).toBe('passing');
    expect(row().evidenceFailures).toEqual([]);
    expect(plan.parts[0].text).toContain('305.5');
    expect(plan.parts[0].text).toContain('successful');
    expect(plan.parts[1].text).toContain('additional');
    expect(plan.planReview?.planDigest).toBe(compoundPlanDigest(plan));
    for (const part of plan.parts) {
      expect(plan.adjudications.find(a => a.partId === part.id)?.evidenceDigest)
        .toBe(compoundPartDigest(plan, part.id));
    }
    expect(plan.evidence.some(e => e.supportingPassage.includes('305.5 hours'))).toBe(true);
    expect(plan.evidence.some(e => e.supportingPassage.includes('107k successful trajectories'))).toBe(true);
    expect(plan.evidence.some(e => e.supportingPassage === '(a)')).toBe(false);
  });

  it('preserves the prior complete tuple and full plan/reviews as non-counted history', { timeout: 60_000 }, () => {
    const marker = '## RoboMIND hours correction: preserved prior complete state (2026-09-23)';
    const history = read(ledgerPath).split(marker)[1].split('```json\n')[1].split('\n```')[0];
    const saved = JSON.parse(history);
    const oldPlans: CompoundPlan[] = JSON.parse(before('audit/compound-evidence.json'));
    expect(saved.compoundPlan).toEqual(selected(oldPlans));
    expect(saved.currentTupleDigest).toBe('ff9aa17f614941b79f89d3e891450e886b7bd2d257bc64a579afc6157cc838b4');
    expect(originalClaimDigest(saved.currentCells)).toBe(saved.currentTupleDigest);
    preservedLegacySurvivors(oldPlans.filter(p => p.id !== planId), plans.filter(p => p.id !== planId));
    expect(committedSource(checkpoint, 'audit/local-basis.json')).toBe(before('audit/local-basis.json'));
    const hoursPlans = committedJson<CompoundPlan[]>(hoursCommit, 'audit/compound-evidence.json');
    expect(hoursPlans.filter(p => p.id !== planId)).toEqual(oldPlans.filter(p => p.id !== planId));
    expect(selected()).toEqual(selected(hoursPlans));
    expect(atHours('audit/local-basis.json')).toBe(before('audit/local-basis.json'));
  });

  it('preserves other rows and the later closure history for data-bottleneck 3/5 and evaluation1', { timeout: 60_000 }, () => {
    const oldPlans: CompoundPlan[] = JSON.parse(before('audit/compound-evidence.json'));
    const previous = parseLedger(ledgerPath, before(ledgerPath), ids, { compoundPlans: oldPlans });
    const atTransaction = parseLedger(ledgerPath, atHours(ledgerPath), ids, {
      compoundPlans: committedJson<CompoundPlan[]>(hoursCommit, 'audit/compound-evidence.json'),
    });
    const current = parseLedger(ledgerPath, read(ledgerPath), ids, { compoundPlans: plans });
    expect(atTransaction.map(s => [s.slug, s.claimRows])).toEqual(previous.map(s => [s.slug, s.claimRows]));
    for (const section of atTransaction) {
      const old = previous.find(s => s.slug === section.slug)!;
      for (const [i, record] of section.claimRecords.entries()) {
        if (section.slug !== 'datasets' || i !== 9) expect(record).toEqual(old.claimRecords[i]);
        if (section.slug === 'industrial-deployment' && [9, 10, 31, 32, 33, 37, 47, 48].includes(i + 1)) {
          const history = JSON.parse(read('audit/evidence/industrial-closure-20260923/row-history.json'));
          const archived = history.find((r: { rowOrdinal: number }) => r.rowOrdinal === i + 1);
          expect(archived.currentCells).toEqual(Object.fromEntries(
            ['claim', 'sourceChecked', 'verdict', 'note'].map(key => [key, old.claimRecords[i][key as 'claim']]),
          ));
          expect(current.find(s => s.slug === section.slug)!.claimRecords[i].verdict).toBe(i === 46
            ? 'Cut (historical ledger certification withdrawn)'
            : 'C');
        } else if ((section.slug === 'data-bottleneck' && [3, 5].includes(i + 1))
          || (section.slug === 'evaluation-crisis' && i === 0)) {
          const archived = parseLedger(ledgerPath, finalSevenBefore(ledgerPath), ids, { compoundPlans: oldPlans })
            .find(s => s.slug === section.slug)!.claimRecords[i];
          const cells = (r: typeof record) => Object.fromEntries(
            ['claim', 'sourceChecked', 'verdict', 'note'].map(key => [key, r[key as 'claim']]),
          );
          expect(cells(archived)).toEqual(cells(old.claimRecords[i]));
          const now = parseLedger(ledgerPath, read(ledgerPath), ids, currentAuditContext())
            .find(s => s.slug === section.slug)!.claimRecords[i];
          expect(now.localBasis?.planId).toBe(`final-seven-data-hardware-${section.slug}-${i + 1}-20260923`);
          expect(now.outcome).toBe('passing');
          expect(now.evidenceFailures).toEqual([]);
        } else if (section.slug !== 'datasets' || i !== 9) expect(record).toEqual(old.claimRecords[i]);
      }
    }
    for (const ordinal of [3, 5]) {
      expect(atTransaction.find(s => s.slug === 'data-bottleneck')!.claimRecords[ordinal - 1].outcome).toBe('unresolved');
      expect(current.find(s => s.slug === 'data-bottleneck')!.claimRecords[ordinal - 1].verdict).toBe('C');
    }
    expect(current.find(s => s.slug === 'data-bottleneck')!.claimRecords[5].claim)
      .toBe(atTransaction.find(s => s.slug === 'data-bottleneck')!.claimRecords[5].claim);
  });

  it('appends only four exact native member approvals to the unchanged prefix', () => {
    const path = 'contract/brand-v2-approved-deltas.json';
    const approvals = preservedApprovalPacket(checkpoint);
    const prior: ApprovedDelta[] = JSON.parse(before(path)).entries;
    const atCheckpoint = committedJson<{ entries: ApprovedDelta[] }>(hoursCommit, path).entries;
    const added = atCheckpoint.slice(prior.length);
    expect(approvals.slice(0, prior.length)).toEqual(prior);
    expect(atCheckpoint.slice(0, prior.length)).toEqual(prior);
    expect(added).toHaveLength(4);
    const truth = readerTruthAt(checkpoint, [articlePath, adjacentPath]);
    expect(hoursApprovals).toEqual(added);
    const endpoints = [
      ['prose', 'article:data-hardware/data-bottleneck', '432107f45cd127f2c98f89da3a0b0da915621410b957b61e41eda5e2b475ae0f'],
      ['prose', 'article:data-hardware/datasets', '5a1230749a17bbf0ece78558d70f3edc0d4ef319efdc8ea159771894d4bdacf6'],
      ['relationships', 'article:data-hardware/datasets', '8ea748667d9ecc23e4d178a9a1f9dcf5ec22aedf104d3bc16b4f4f4cccddbcaf'],
    ];
    for (const [kind, memberId, oldHash] of endpoints) {
      const manifest = Object.values(currentApprovalBundle.manifests).find(m => m.kind === kind)!;
      expect(manifest.members).toEqual(truth.find(m => m.kind === kind)!.members
        .filter(m => approvalMembers.some(([k, id]) => k === kind && id === m.id)));
      expect(added.find(a => a.manifest === kind && a.memberId === memberId)).toMatchObject({
        oldHash, newHash: manifest.members.find(m => m.id === memberId)!.hash,
      });
    }
    const retired = 'state-site:content/data-hardware/datasets.mdx:not-disclosed:6';
    expect(currentApprovalBundle.manifests['value-states'].members.some(s => s.id === retired)).toBe(false);
    expect(added.find(a => a.manifest === 'value-states')).toMatchObject({
      memberId: retired,
      oldHash: 'b968a22d24734d899622a6b9b4eb848ef084ffefd853cb6df81829ca8ed0e5f9',
      newHash: sha256('missing'),
    });
    expect(compareBaseline(beforeApprovalBundle, currentApprovalBundle, hoursApprovals).ok).toBe(true);
  });

  it.each(approvalMembers)('rejects missing or mutated hours approval for %s / %s', (kind, memberId) => {
    expect(compareBaseline(beforeApprovalBundle, currentApprovalBundle, hoursApprovals).ok).toBe(true);
    const matching = hoursApprovals.filter(a => a.manifest === kind && a.memberId === memberId);
    expect(matching).toHaveLength(1);
    const approval = matching[0];
    expect(compareBaseline(beforeApprovalBundle, currentApprovalBundle,
      hoursApprovals.filter(a => a.id !== approval.id)).ok).toBe(false);
    for (const endpoint of ['oldHash', 'newHash'] as const) {
      const mutated = hoursApprovals.map(a => a.id === approval.id
        ? { ...a, [endpoint]: sha256('wrong endpoint') } : a);
      expect(compareBaseline(beforeApprovalBundle, currentApprovalBundle, mutated).ok).toBe(false);
    }
  });

  it.each([
    'ds10-counts-and-robots', 'ds10-failures-and-twin', 'ds10-release-scope',
    'ds10-published-badge-and-access', 'ds10-license-disclosure',
  ])('rejects missing external support for %s even after digest refresh', partId => {
    expect(row().evidenceFailures).toEqual([]);
    const changed = structuredClone(plans);
    const plan = selected(changed);
    plan.evidence = plan.evidence.filter(e => e.partId !== partId);
    for (const review of plan.adjudications) {
      review.evidenceDigest = compoundPartDigest(plan, review.partId);
    }
    expect(row(changed).evidenceFailures.length).toBeGreaterThan(0);
  });
});
