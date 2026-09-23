import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { DATASETS, type Dataset } from '../../data/datasets';
import { CITATIONS } from '../../data/citations';
import {
  compoundPartDigest, compoundPlanDigest, originalClaimDigest, parseLedger,
  type CompoundPlan,
} from '../../lib/audit-ledger';
import { sha256, type ApprovedDelta } from '../../lib/brand-v2-baseline';
import { collectArticleTruthManifests, valueStateRenderSites } from '../../scripts/brand-v2-baseline';

const root = resolve(import.meta.dirname, '../..');
const base = '358f5050333386606f041505613e4a65d90dc703';
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const before = (path: string) => execFileSync('git', ['show', `${base}:${path}`], {
  cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});
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
    expect(read(adjacentPath)).toBe(before(adjacentPath).replace(
      'Robot data is different. Every hour of it',
      'Real-world robot data is different. Every hour of it',
    ));
    expect(matter(article).data).toEqual(matter(before(articlePath)).data);
    expect(read('data/citations.ts')).toBe(before('data/citations.ts'));
  });

  it('preserves the complete licensing disclosure and unknown durations elsewhere', () => {
    const licensing = 'The inspected public card displays an Apache-2.0 license badge';
    expect(article.slice(article.indexOf(licensing))).toBe(
      before(articlePath).slice(before(articlePath).indexOf(licensing)),
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

  it('preserves the prior complete tuple and full plan/reviews as non-counted history', () => {
    const marker = '## RoboMIND hours correction: preserved prior complete state (2026-09-23)';
    const history = read(ledgerPath).split(marker)[1].split('```json\n')[1].split('\n```')[0];
    const saved = JSON.parse(history);
    const oldPlans: CompoundPlan[] = JSON.parse(before('audit/compound-evidence.json'));
    expect(saved.compoundPlan).toEqual(selected(oldPlans));
    expect(saved.currentTupleDigest).toBe('ff9aa17f614941b79f89d3e891450e886b7bd2d257bc64a579afc6157cc838b4');
    expect(originalClaimDigest(saved.currentCells)).toBe(saved.currentTupleDigest);
    expect(plans.filter(p => p.id !== planId)).toEqual(oldPlans.filter(p => p.id !== planId));
    expect(read('audit/local-basis.json')).toBe(before('audit/local-basis.json'));
  });

  it('preserves all other data-hardware rows, including data-bottleneck holds 3/5 and row6', () => {
    const oldPlans: CompoundPlan[] = JSON.parse(before('audit/compound-evidence.json'));
    const previous = parseLedger(ledgerPath, before(ledgerPath), ids, { compoundPlans: oldPlans });
    const current = parseLedger(ledgerPath, read(ledgerPath), ids, { compoundPlans: plans });
    expect(current.map(s => [s.slug, s.claimRows])).toEqual(previous.map(s => [s.slug, s.claimRows]));
    for (const section of current) {
      const old = previous.find(s => s.slug === section.slug)!;
      for (const [i, record] of section.claimRecords.entries()) {
        if (section.slug !== 'datasets' || i !== 9) expect(record).toEqual(old.claimRecords[i]);
      }
    }
  });

  it('appends only four exact native member approvals to the unchanged prefix', () => {
    const path = 'contract/brand-v2-approved-deltas.json';
    const approvals: ApprovedDelta[] = JSON.parse(read(path)).entries;
    const prior: ApprovedDelta[] = JSON.parse(before(path)).entries;
    const added = approvals.slice(prior.length);
    expect(approvals.slice(0, prior.length)).toEqual(prior);
    expect(added).toHaveLength(4);
    const truth = collectArticleTruthManifests();
    const endpoints = [
      ['prose', 'article:data-hardware/data-bottleneck', '432107f45cd127f2c98f89da3a0b0da915621410b957b61e41eda5e2b475ae0f'],
      ['prose', 'article:data-hardware/datasets', '5a1230749a17bbf0ece78558d70f3edc0d4ef319efdc8ea159771894d4bdacf6'],
      ['relationships', 'article:data-hardware/datasets', '8ea748667d9ecc23e4d178a9a1f9dcf5ec22aedf104d3bc16b4f4f4cccddbcaf'],
    ];
    for (const [kind, memberId, oldHash] of endpoints) {
      const manifest = Object.values(truth).find(m => m.kind === kind)!;
      expect(added.find(a => a.manifest === kind && a.memberId === memberId)).toMatchObject({
        oldHash, newHash: manifest.members.find(m => m.id === memberId)!.hash,
      });
    }
    const retired = 'state-site:content/data-hardware/datasets.mdx:not-disclosed:6';
    expect(valueStateRenderSites().some(s => s.id === retired)).toBe(false);
    expect(added.find(a => a.manifest === 'value-states')).toMatchObject({
      memberId: retired,
      oldHash: 'b968a22d24734d899622a6b9b4eb848ef084ffefd853cb6df81829ca8ed0e5f9',
      newHash: sha256('missing'),
    });
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
