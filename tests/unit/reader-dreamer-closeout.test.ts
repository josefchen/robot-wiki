import { readFileSync } from 'node:fs';
import { showAt } from './helpers/continuation-merge-ledger';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { beforeAll, describe, expect, it } from 'vitest';
import { CITATIONS } from '@/data/citations';
import { originalClaimDigest, parseLedger } from '@/lib/audit-ledger';
import {
  BASELINE_KINDS, buildManifest, compareBaseline, sha256,
  type ApprovedDelta, type BaselineBundle,
} from '@/lib/brand-v2-baseline';
import { committedSource, preservedApprovalPacket } from '../helpers/continuation-integration';
import { READER_RELEASE_BASE } from '../helpers/reader-integration';
import { preservedPreIndustrialCitations } from '../helpers/industrial-integration';
import { currentAuditContext } from '../helpers/residual-integration';
import { preservedLegacySurvivors } from '../helpers/audit-plan-history';
import { committedText, committedJson } from '../helpers/editorial-current-context';

const root = resolve(import.meta.dirname, '../..');
const base = '90c8a0f4c958c42750711082bfb54960cac7d5e8';
const checkpoint = '280d8661a49feb16e45ef337e7cb46a794211004';
const readerCommit = '280d8661a49feb16e45ef337e7cb46a794211004';
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const before = (path: string) => showAt(base, path);
const atReader = (path: string) => committedText(readerCommit, path);
const paths = ['latent-dynamics', 'taxonomy'].map(slug => `content/world-models/${slug}.mdx`);
const [latent, taxonomy] = paths.map(read);
const dreamerParagraph = (text: string) => text.split('\n\n')
  .find(p => p.includes('150 tasks') && p.includes('hyperparameters'))!;
const members = [
  ['prose', 'article:world-models/latent-dynamics'],
  ['prose', 'article:world-models/taxonomy'],
  ['relationships', 'article:world-models/taxonomy'],
] as const;

function approvalBundle(old: boolean): BaselineBundle {
  const parsed = paths.map(path => ({ path, parsed: matter(old ? before(path) : atReader(path)) }));
  const tax = parsed[1].parsed;
  const matches = (pattern: RegExp) => [...tax.content.trim().matchAll(pattern)]
    .map(m => m[1]).sort();
  const sources = [
    buildManifest('prose', parsed.map(({ path, parsed: p }) => ({
      id: `article:${path.slice(8, -4)}`, value: { path, body: p.content.trim() },
    }))),
    buildManifest('relationships', [{
      id: 'article:world-models/taxonomy',
      value: {
        seeAlso: tax.data.seeAlso,
        citations: matches(/<Cite\s+id=["']([^"']+)["']/g),
        terms: matches(/<Term\s+id=["']([^"']+)["']/g),
        internalLinks: matches(/\]\((\/[^)#?]+\/?)(?:#[^)]+)?\)/g),
      },
    }]),
  ];
  const manifests = Object.fromEntries(BASELINE_KINDS.map(kind => {
    const scaffold = buildManifest(kind, [{ id: 'fixture:unchanged', value: 'bounded comparison' }]);
    const selected = sources.find(m => m.kind === kind)?.members
      .filter(m => members.some(([k, id]) => k === kind && id === m.id)) ?? [];
    return [kind, { ...scaffold, members: selected, memberCount: selected.length }];
  })) as BaselineBundle['manifests'];
  return {
    schemaVersion: 1, source: { commit: base, tree: '', trackedWorktreeClean: false },
    tools: { node: '', npm: '', playwright: '', next: '', typescript: '', vitest: '', lockfileSha256: '' },
    manifests,
    manifestRoots: Object.fromEntries(BASELINE_KINDS.map(k => [k, manifests[k].rootHash])) as BaselineBundle['manifestRoots'],
    rootHash: '',
  };
}

describe('bounded Dreamer reader closeout, zero original completions', () => {

  beforeAll(() => {
    // Warm the neutral history renders once; catalog renders are expensive
    // and individual tests must stay under 5s.
    void committedSource(checkpoint, 'audit/local-basis.json');
    void committedSource(checkpoint, 'audit/compound-evidence.json');
    void committedSource(checkpoint, 'audit/world-models.md');
    void committedJson(readerCommit, 'audit/local-basis.json');
    void before('audit/world-models.md');
  }, 120_000);
  it.each(paths)('uses reader wording instead of reconciliation process jargon in %s', path => {
    expect(read(path)).not.toMatch(/not reconciled(?: here)?/);
  });

  it('keeps both source-qualified horizons and the illustrative rather than measured range', () => {
    const horizon = latent.split('## The horizon problem\n\n')[1].split('\n\n')[0];
    for (const text of [latent.split('<LatentImagination')[0], horizon]) {
      expect(text).toContain('Table W.1 of the 2023 DreamerV3 preprint lists imagination horizon H = 15');
      expect(text).toContain("same document's actor-critic section uses prediction horizon T = 16");
      expect(text).toContain('The 2024 revision and 2025 Nature article also use T = 16');
      expect(text).toContain('<Cite id="dreamerv3-2023" />');
    }
    expect(latent).toContain('not a published reliable-horizon range');
    expect(latent).toContain('value="H=15 / T=16" note="2023 preprint: table / actor-critic"');
    expect(horizon).toContain('DayDreamer v1 likewise gives two labels');
    expect(horizon).toContain('planning horizon H = 16, while Appendix D lists imagination horizon H = 15');
    expect(horizon).toContain('<Cite id="daydreamer-2022" />');
    expect(horizon).toContain('In TD-MPC2 v2, Table 8 lists planning horizon H = 3');
    expect(horizon).toContain('step counts, not control frequencies or universal bounds on reliable prediction');
    expect(horizon).not.toMatch(/off.by.one|counting convention|equivalent horizons/i);
  });

  it('keeps full Dreamer internals and both incompatible reward descriptions in the detailed article', () => {
    const p = dreamerParagraph(latent);
    for (const phrase of [
      'more than 150 tasks across eight domains with fixed hyperparameters',
      'symlog transforms for vector observations', 'free bits with KL balancing',
      'percentile-based return normalization', 'detailed distribution section',
      'two-hot targets for reward and value prediction', 'earlier world-model paragraph',
      'symlog squared loss', '<Cite id="dreamerv3-2023" />',
    ]) expect(p).toContain(phrase);
  });

  it('makes the taxonomy summary self-contained and links to the detailed explanation without duplication', () => {
    const summary = dreamerParagraph(taxonomy);
    expect(summary).not.toBe(dreamerParagraph(latent));
    expect(summary.split(/\s+/).length).toBeLessThan(dreamerParagraph(before(paths[1])).split(/\s+/).length);
    expect(summary).toContain('more than 150 tasks in eight domains with fixed hyperparameters');
    expect(summary).toContain('distribution section (two-hot reward/value targets)');
    expect(summary).toContain('earlier world-model paragraph (symlog squared loss)');
    expect(summary).toContain('<Cite id="dreamerv3-2023" />');
    expect(summary).toContain('[latent-dynamics explanation](/world-models/latent-dynamics/)');
    expect(summary).not.toContain('free bits with KL balancing');
    expect(latent).toContain('## DreamerV3: one recipe across 150 tasks');
    expect(taxonomy).toContain('critic also receives a loss on replay-buffer trajectories');
  });

  it('preserves frontmatter, citation occurrences, source registry and untouched paragraphs', () => {
    for (const path of paths) {
      const previous = before(path);
      const historical = committedSource(checkpoint, path);
      expect(matter(historical).data).toEqual(matter(previous).data);
      expect(matter(read(path)).data).toEqual(matter(committedSource(READER_RELEASE_BASE, path)).data);
      expect(read(path).match(/<Cite\s+id="[^"]+"\s*\/>/g))
        .toEqual(previous.match(/<Cite\s+id="[^"]+"\s*\/>/g));
      const touched = path === paths[0] ? [28, 36, 47, 63] : [63];
      const omit = (text: string) => text.split('\n').filter((_line, i) => !touched.includes(i + 1));
      expect(omit(historical)).toEqual(omit(previous));
    }
    expect(committedSource(checkpoint, 'data/citations.ts')).toBe(before('data/citations.ts'));
    preservedPreIndustrialCitations(READER_RELEASE_BASE);
    for (const path of paths) {
      expect(atReader(path).match(/<Cite\s+id="[^"]+"\s*\/>/g))
        .toEqual(before(path).match(/<Cite\s+id="[^"]+"\s*\/>/g));
    }
    const latentHeading = "## Pick the model's role before its architecture";
    const releasedLatent = matter(committedSource(READER_RELEASE_BASE, paths[0])).content;
    expect(releasedLatent.split(latentHeading)).toHaveLength(2);
    expect(matter(read(paths[0])).content.trim()).toBe(
      `${matter(atReader(paths[0])).content.trim()}\n\n${latentHeading}${releasedLatent.split(latentHeading)[1]}`.trim(),
    );
    const taxonomyHeading = '## Three tests before believing a world-model claim';
    const releasedTaxonomy = matter(committedSource(READER_RELEASE_BASE, paths[1])).content;
    expect(releasedTaxonomy.split(taxonomyHeading)).toHaveLength(2);
    const taxonomyAddition = taxonomyHeading + releasedTaxonomy.split(taxonomyHeading)[1].split('<SelfCheck')[0];
    expect(matter(atReader(paths[1])).content.split('<SelfCheck')).toHaveLength(2);
    // The educational cue pass (2026-09-26) appended the first-screen
    // operating cue sentence to the panel paragraph; it is the only text
    // this closeout preserves beyond the released reconstruction.
    const taxonomyCue = ' Try each group in turn and the panel swaps what it predicts; the JEPA group carries an explicit no-decoder marker.';
    expect(matter(read(paths[1])).content).toBe(matter(atReader(paths[1])).content.replace(
      "The six example groups below are this article's selection",
      "The six example groups below are this article's authored selection",
    ).replace(
      'selecting a panel is not a benchmark comparison between the named systems.',
      `selecting a panel is not a benchmark comparison between the named systems.${taxonomyCue}`,
    ).replace('<SelfCheck', () => taxonomyAddition + '<SelfCheck'));
  });

  it('preserves native original four cells and every typed plan/proof dependency', { timeout: 60_000 }, () => {
    const ids = new Set(CITATIONS.map(c => c.id));
    const path = 'audit/world-models.md';
    const historical = parseLedger(path, committedSource(checkpoint, path), ids);
    const prior = parseLedger(path, before(path), ids);
    expect(historical).toEqual(prior);
    expect(historical.map(s => s.claimRecords.map(originalClaimDigest)))
      .toEqual(prior.map(s => s.claimRecords.map(originalClaimDigest)));
    const context = currentAuditContext();
    const current = parseLedger(path, read(path), ids, context);
    const archived = JSON.parse(read('audit/evidence/crossdomain-closure-20260923/row-history.json'))
      .rows.find((r: { originalId: string }) => r.originalId === 'audit/world-models.md:taxonomy:4');
    expect(current.slice(0, prior.length).map(s => [s.slug, s.claimRows]))
      .toEqual(prior.map(s => [s.slug, s.claimRows]));
    expect(current.slice(prior.length).map(s => [s.slug, s.claimRows]))
      .toEqual([['world-models-vs-simulators', 11], ['model-based-robot-learning', 8], ['evaluation', 7]]);
    for (const section of current) {
      const old = prior.find(s => s.slug === section.slug);
      if (!old) continue;
      expect(section.claimRows).toBe(old.claimRows);
      for (const [i, record] of section.claimRecords.entries()) {
        if (section.slug === 'taxonomy' && i === 3) {
          expect(originalClaimDigest(archived.currentCells)).toBe(originalClaimDigest(old.claimRecords[i]));
          expect(record.localBasis?.planId).toBe('crossdomain-taxonomy4-20260923');
          expect(record.evidenceFailures).toEqual([]);
          expect(record.outcome).toBe('passing');
        } else expect(originalClaimDigest(record)).toBe(originalClaimDigest(old.claimRecords[i]));
      }
    }
    expect(committedSource(checkpoint, 'audit/compound-evidence.json')).toBe(before('audit/compound-evidence.json'));
    preservedLegacySurvivors(JSON.parse(before('audit/compound-evidence.json')), context.compoundPlans);
    expect(committedSource(checkpoint, 'audit/local-basis.json')).toBe(before('audit/local-basis.json'));
    const catalog = JSON.parse(read('audit/local-basis.json'));
    const released = JSON.parse(committedSource('ac65cf4', 'audit/local-basis.json'));
    expect(released.plans).toHaveLength(7);
    expect(released.proofs).toHaveLength(56);
    const oldIds = new Set(released.plans.map((p: { id: string }) => p.id));
    expect(catalog.plans.filter((p: { id: string }) => oldIds.has(p.id))).toEqual(released.plans);
    expect(catalog.proofs.filter((p: { planId: string }) => oldIds.has(p.planId))).toEqual(released.proofs);
    const historicalCatalog = JSON.parse(committedSource(checkpoint, 'audit/local-basis.json'));
    for (const path of paths) expect(JSON.stringify(historicalCatalog)).not.toContain(path);
    expect(JSON.stringify(catalog.plans.filter((p: { id: string }) => p.id !== 'crossdomain-taxonomy4-20260923')))
      .not.toContain(paths[1]);
    expect(JSON.stringify(catalog)).not.toContain(paths[0]);
    const original = committedJson<typeof catalog>(readerCommit, 'audit/local-basis.json');
    expect(original.plans).toHaveLength(7);
    expect(original.proofs).toHaveLength(56);
    const economicsHistory = JSON.parse(read(
      'audit/evidence/economics-release-20260923/previous-economics-plan-and-proofs.json',
    ));
    for (const plan of original.plans) {
      if (plan.id === 'economics-local-i52-20260923') expect(economicsHistory.plan).toEqual(plan);
      else expect(catalog.plans).toContainEqual(plan);
    }
    for (const proof of original.proofs) {
      if (proof.planId === 'economics-local-i52-20260923') expect(economicsHistory.proofs).toContainEqual(proof);
      else expect(catalog.proofs).toContainEqual(proof);
    }
    for (const path of paths) expect(JSON.stringify(original)).not.toContain(path);
  });

  it('appends only three exact native member approvals without resetting the baseline', () => {
    const path = 'contract/brand-v2-approved-deltas.json';
    const current = preservedApprovalPacket(checkpoint);
    const prior: ApprovedDelta[] = JSON.parse(before(path)).entries;
    expect(current.slice(0, prior.length)).toEqual(prior);
    const reader: ApprovedDelta[] = committedJson<{ entries: ApprovedDelta[] }>(readerCommit, path).entries;
    expect(reader.slice(0, prior.length)).toEqual(prior);
    expect(reader.slice(prior.length).map(a => [a.manifest, a.memberId])).toEqual(members);
    expect(current.filter(a => a.id.startsWith('reader-dreamer-20260923-'))).toEqual(reader.slice(prior.length));
    expect(compareBaseline(approvalBundle(true), approvalBundle(false), reader.slice(prior.length)).ok).toBe(true);
  });

  it.each(members)('rejects missing and mutated current-native approval for %s / %s', (kind, memberId) => {
    const approvals: ApprovedDelta[] = JSON.parse(read('contract/brand-v2-approved-deltas.json')).entries
      .filter((a: ApprovedDelta) => a.id.startsWith('reader-dreamer-20260923-'));
    const previous = approvalBundle(true);
    const current = approvalBundle(false);
    expect(compareBaseline(previous, current, approvals).ok).toBe(true);
    const selected = approvals.filter(a => a.manifest === kind && a.memberId === memberId);
    expect(selected).toHaveLength(1);
    expect(compareBaseline(previous, current, approvals.filter(a => a.id !== selected[0].id)).ok).toBe(false);
    for (const endpoint of ['oldHash', 'newHash'] as const) {
      const mutated = approvals.map(a => a.id === selected[0].id
        ? { ...a, [endpoint]: sha256('wrong endpoint') } : a);
      expect(compareBaseline(previous, current, mutated).ok).toBe(false);
    }
  });
});
