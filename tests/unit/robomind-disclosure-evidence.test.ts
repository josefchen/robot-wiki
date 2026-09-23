import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { DATASETS, type Dataset } from '../../data/datasets';
import { CITATIONS } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import {
  compoundPartDigest, compoundPlanDigest, originalClaimDigest, parseLedger,
  type CompoundPlan,
} from '../../lib/audit-ledger';
import {
  BASELINE_KINDS, buildManifest, compareBaseline, sha256,
  type ApprovedDelta, type BaselineBundle,
} from '../../lib/brand-v2-baseline';
import { collectArticleTruthManifests } from '../../scripts/brand-v2-baseline';

const root = resolve(import.meta.dirname, '../..');
const base = '1e07db26e614dd24e9f1c0c79a651df26cdec88b';
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const before = (path: string) => execFileSync('git', ['show', `${base}:${path}`], {
  cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});
const articlePath = 'content/data-hardware/datasets.mdx';
const ledgerPath = 'audit/data-hardware.md';
const article = read(articlePath);
const ledger = read(ledgerPath);
const plans: CompoundPlan[] = JSON.parse(read('audit/compound-evidence.json'));
const oldPlans: CompoundPlan[] = JSON.parse(before('audit/compound-evidence.json'));
const planId = 'datasets-10-robomind-20260916c';
const selected = (catalog = plans) => catalog.find(p => p.id === planId)!;
const ids = new Set(CITATIONS.map(c => c.id));
const citations = Object.fromEntries(publishedModules().map(m => [
  m.slug, matter(read(`content/${m.domain}/${m.slug}.mdx`)).data.citations,
]));
const parse = (catalog = plans, text = ledger) => parseLedger(ledgerPath, text, ids, {
  compoundPlans: catalog, articleCitations: citations,
});
const row = (catalog = plans, text = ledger) =>
  parse(catalog, text).find(s => s.slug === 'datasets')!.claimRecords[9];
const card = 'https://huggingface.co/datasets/x-humanoid-robomind/RoboMIND';
const parts = [
  'ds10-counts-and-robots', 'ds10-failures-and-twin', 'ds10-release-scope',
  'ds10-published-badge-and-access', 'ds10-license-disclosure',
];
const approvals: ApprovedDelta[] = JSON.parse(read('contract/brand-v2-approved-deltas.json')).entries;
const oldApprovals: ApprovedDelta[] = JSON.parse(before('contract/brand-v2-approved-deltas.json')).entries;
const ownApprovals = approvals.filter(a => a.id.startsWith('robomind-disclosure-20260923-'));
const truth = collectArticleTruthManifests();

function assertDisclosure(text: string, dataset: Dataset) {
  expect(dataset.license).toBeNull();
  expect(dataset.episodesNote).toContain('card versions 1.1/1.2');
  expect(text).toContain('retrieved on 21 September 2026');
  expect(text).toContain('Release-specific data terms for the 107k version are not disclosed in that inspected card');
  expect(text).toContain('The inspected public card displays an Apache-2.0 license badge');
  expect(text).toContain('gated access conditions were not reviewed');
  expect(text).toContain('does not explicitly bind the badge to the v1.1/v1.2 data files');
  expect(text).toContain('Those are paper dates, not established release dates');
  expect(text).not.toContain('The license is CC BY-NC-SA 4.0 on the 2026-08-09');
  expect(text).not.toContain('no currently reachable primary page prints it');
  expect(text).not.toContain('The 107k dataset is licensed under Apache-2.0.');
}

function scopedBundle(old: boolean): BaselineBundle {
  const members = [
    ['prose', 'article:data-hardware/datasets', '4d2f822a1df86e4a4a78b4fdc6bba8fd580bf78ee1ab98d5beaa45902041cf95'],
    ['relationships', 'article:data-hardware/datasets', '40bbf9cc032869ee25165c5d9b2ab3c88cc848bbdaa5f3063050409103f2cc39'],
  ];
  const manifests = Object.fromEntries(BASELINE_KINDS.map(kind => {
    const scaffold = buildManifest(kind, [{ id: 'fixture:unchanged', value: 'bounded comparison' }]);
    const relevant = members.filter(([k]) => k === kind).map(([, id, hash]) => old
      ? { id, hash }
      : Object.values(truth).find(m => m.kind === kind)!.members.find(m => m.id === id)!);
    return [kind, { ...scaffold, members: relevant, memberCount: relevant.length }];
  })) as BaselineBundle['manifests'];
  return {
    schemaVersion: 1, source: { commit: base, tree: '', trackedWorktreeClean: false },
    tools: { node: '', npm: '', playwright: '', next: '', typescript: '', vitest: '', lockfileSha256: '' },
    manifests,
    manifestRoots: Object.fromEntries(BASELINE_KINDS.map(k => [k, manifests[k].rootHash])) as BaselineBundle['manifestRoots'],
    rootHash: '',
  };
}

describe('RoboMIND original10 truthful release licensing disclosure', () => {
  it('states the badge and release-specific uncertainty without granting permission', () => {
    assertDisclosure(article, DATASETS.find(d => d.id === 'robomind')!);
    expect(matter(article).data).toEqual(matter(before(articlePath)).data);
    expect(read('data/citations.ts')).toBe(before('data/citations.ts'));
    expect(article).toContain(`[public RoboMIND dataset card](${card})`);
  });

  it.each(['CC BY-NC-SA 4.0', 'Apache-2.0', 'n/a'])('rejects a settled or inapplicable table license %s', license => {
    expect(() => assertDisclosure(article, { ...DATASETS.find(d => d.id === 'robomind')!, license })).toThrow();
  });

  it.each([
    'The inspected public card displays an Apache-2.0 license badge',
    'gated access conditions were not reviewed',
    'does not explicitly bind the badge to the v1.1/v1.2 data files',
  ])('rejects lost reader qualification: %s', phrase => {
    assertDisclosure(article, DATASETS.find(d => d.id === 'robomind')!);
    expect(() => assertDisclosure(article.replace(phrase, ''), DATASETS.find(d => d.id === 'robomind')!)).toThrow();
  });

  it('keeps the scientific inventory and requires every external disclosure part', () => {
    const p = selected();
    expect(p.parts.map(part => part.id)).toEqual(parts);
    expect(p.kind).toBe('explicit-parts');
    expect(row().verdict).toMatch(/^C /);
    expect(row().outcome).toBe('passing');
    expect(row().evidenceFailures).toEqual([]);
    expect(p.originalCellsDigest).toBe(originalClaimDigest(row()));
    expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
    expect(p.planReview?.reviewedBy).toContain('custom:droidproxy:gpt-6-astra/max');
    for (const part of p.parts) {
      expect(part.requiredCitationIds).toEqual(['robomind-2024']);
      const review = p.adjudications.find(a => a.partId === part.id)!;
      expect(review.outcome).toBe('supported');
      expect(review.evidenceDigest).toBe(compoundPartDigest(p, part.id));
      expect(review.rationale.length).toBeGreaterThan(80);
    }
    const text = p.evidence.map(e => e.supportingPassage).join('\n');
    for (const phrase of ['107k demonstration trajectories', '479 diverse tasks', '96 object classes',
      'Franka Emika Panda', 'UR5e', 'AgileX dual-arm', 'Tien Kung', 'standardized protocol',
      '5k real-world failure demonstrations', 'detailed causes', 'Isaac Sim']) expect(text).toContain(phrase);
    expect(text).not.toContain('NO PASSAGE FETCHABLE');
  });

  it('retains real card passages, paper version, and honest historical retrieval provenance', () => {
    const p = selected();
    const cardText = p.evidence.filter(e => e.sourceUrl === card).map(e => e.supportingPassage).join('\n');
    expect(cardText).toContain('License-Apache_2.0-yellow.svg');
    expect(cardText).toContain('Version 1.1 & 1.2');
    expect(cardText).toContain('55K trajectories');
    expect(cardText).toContain('RoboMIND V2.0');
    expect(cardText).toContain('accept the conditions');
    expect(cardText).toContain('share your contact information');
    expect(row().sourceChecked).toContain('2026-09-21T22:59:14.750Z');
    expect(row().sourceChecked).toContain('2026-09-16T04:12:19Z');
    expect(row().sourceChecked).toContain('no origin HTTP status exposed');
    expect(row().note).toContain('Paper dates are not data-release dates');
    expect(row().note).toContain('never n/a');
  });

  it.each(parts)('fails closed without evidence for %s', partId => {
    const changed = structuredClone(plans);
    selected(changed).evidence = selected(changed).evidence.filter(e => e.partId !== partId);
    expect(row(changed).evidenceFailures.length).toBeGreaterThan(0);
  });

  it('fails closed on stale tuple, changed passage, missing review and unresolved adjudication', () => {
    expect(row(plans, ledger.replace(`| ${row().claim} |`, `| ${row().claim} changed |`)).evidenceFailures.length).toBeGreaterThan(0);
    for (const change of ['passage', 'review', 'unresolved']) {
      const catalog = structuredClone(plans);
      const p = selected(catalog);
      if (change === 'passage') p.evidence[0].supportingPassage += ' changed';
      if (change === 'review') p.planReview = null;
      if (change === 'unresolved') p.adjudications[0].outcome = 'unresolved';
      expect(row(catalog).evidenceFailures.length).toBeGreaterThan(0);
    }
  });

  it('preserves the exact old four cells and held plan as non-counted history', () => {
    const old = row(oldPlans, before(ledgerPath));
    expect(originalClaimDigest(old)).toBe('66ef45e82775c5a3fe0f5f87391a6d6bf4b450b8917a26859ee7251403f11c0e');
    expect(ledger).toContain('## Historical: RoboMIND release licensing disclosure 2026-09-23');
    const oldCells = Object.fromEntries(['claim', 'sourceChecked', 'verdict', 'note'].map(k => [k, old[k as keyof typeof old]]));
    expect(ledger).toContain(JSON.stringify(oldCells, null, 2));
    expect(ledger).toContain(JSON.stringify(selected(oldPlans), null, 2));
    expect(parse().find(s => s.slug === 'datasets')!.claimRecords).toHaveLength(11);
    expect(plans.map(p => p.id)).toEqual(oldPlans.map(p => p.id));
    expect(plans.filter(p => p.id !== planId)).toEqual(oldPlans.filter(p => p.id !== planId));
  });

  it('preserves every other native data-hardware record and completed license pair', () => {
    const old = parse(oldPlans, before(ledgerPath));
    for (const section of parse()) {
      const previous = old.find(s => s.slug === section.slug)!;
      for (const [i, record] of section.claimRecords.entries()) {
        if (section.slug !== 'datasets' || i !== 9) expect(record).toEqual(previous.claimRecords[i]);
      }
    }
    for (const ordinal of [5, 6]) {
      const find = (catalog: CompoundPlan[]) => catalog.find(p => p.ledgerPath === ledgerPath && p.articleSlug === 'datasets' && p.rowOrdinal === ordinal);
      expect(find(plans)).toEqual(find(oldPlans));
    }
  });

  it('does not silently change hours, other datasets, catalog kind or prior approvals', () => {
    const robot = DATASETS.find(d => d.id === 'robomind')!;
    expect(robot.hours).toBeNull();
    expect(robot.episodes).toBe(107000);
    expect(robot.tasks).toBe(479);
    expect(robot.embodimentCount).toBe(4);
    expect(robot.year).toBe(2024);
    expect(approvals.slice(0, oldApprovals.length)).toEqual(oldApprovals);
    expect(approvals.length).toBe(oldApprovals.length + ownApprovals.length);
  });

  it('binds exact native member approvals and rejects missing or mutated approvals', () => {
    expect(ownApprovals.length).toBeGreaterThanOrEqual(2);
    for (const kind of ['prose', 'relationships']) {
      const approval = ownApprovals.find(a => a.manifest === kind && a.memberId === 'article:data-hardware/datasets')!;
      expect(approval.newHash).toBe(Object.values(truth).find(m => m.kind === kind)!.members.find(m => m.id === approval.memberId)!.hash);
      expect(approval.ownerApproval).toContain('convergence-robomind-disclosure-integration-20260923/authorization.md');
      expect(approval.disposition).toBe('permanent');
    }
    const relevant = ownApprovals.filter(a => ['prose', 'relationships'].includes(a.manifest));
    expect(compareBaseline(scopedBundle(true), scopedBundle(false), relevant).ok).toBe(true);
    for (const a of relevant) {
      expect(compareBaseline(scopedBundle(true), scopedBundle(false), relevant.filter(v => v.id !== a.id)).ok).toBe(false);
      expect(compareBaseline(scopedBundle(true), scopedBundle(false), relevant.map(v => v.id === a.id ? { ...v, newHash: sha256('wrong') } : v)).ok).toBe(false);
    }
  });
});
