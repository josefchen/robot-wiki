import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import { compoundPartDigest, compoundPlanDigest, originalClaimDigest, parseLedger, type CompoundPlan } from '../../lib/audit-ledger';
import { BASELINE_KINDS, buildManifest, compareBaseline, sha256, type ApprovedDelta, type BaselineBundle, type BaselineKind, type ManifestMember } from '../../lib/brand-v2-baseline';
import { collectArticleTruthManifests } from '../../scripts/brand-v2-baseline';
import { PRODUCTION_BASE, TRUE_MERGE_BASE, headReanchorFor, integratedHash, laneWindow, reanchorFor, sealedHash, showAt } from './helpers/continuation-merge-ledger';

const root = resolve(import.meta.dirname, '../..');
const base = 'e687718cd3c2d1c35d3f63b6e296712a5892a9f0';
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const before = (path: string) => execFileSync('git', ['show', `${base}:${path}`], { cwd: root, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
const articlePath = 'content/data-hardware/datasets.mdx';
// Preserve the first production integration at its actual endpoint. The
// RoboMIND successor suite checks current rows; re-anchor tests below still
// compare the current merged article against the immutable baseline.
const integrated = (path: string) => showAt('f1d03a919f70a336326e1c044e1cc338a8cb6abe', path);
const article = integrated(articlePath);
const ledger = integrated('audit/data-hardware.md');
const plans: CompoundPlan[] = JSON.parse(integrated('audit/compound-evidence.json'));
const oldPlans: CompoundPlan[] = JSON.parse(before('audit/compound-evidence.json'));
const ids = new Set(CITATIONS.map(c => c.id));
const citations = Object.fromEntries(publishedModules().map(m => [m.slug, matter(read(`content/${m.domain}/${m.slug}.mdx`)).data.citations]));
const parse = (catalog = plans, markdown = ledger, registry = ids) => parseLedger('audit/data-hardware.md', markdown, registry, { compoundPlans: catalog, articleCitations: citations }).find(s => s.slug === 'datasets')!.claimRecords;
const row = (ordinal: number) => parse()[ordinal - 1];
const plan = (ordinal: number, catalog = plans) => catalog.find(p => p.ledgerPath === 'audit/data-hardware.md' && p.articleSlug === 'datasets' && p.rowOrdinal === ordinal)!;
const edits = [
  {
    "before": "The license is CC BY 4.0, which permits commercial training runs with attribution.",
    "after": "The paper releases the full dataset under CC BY 4.0 <Cite id=\"droid-2024\" />. Its deed allows sharing and adaptation, including commercial purposes, subject to attribution, a license link, change notices and the other license terms. The deed also warns that other rights may limit a particular use <Cite id=\"cc-by-4-0-deed\" />."
  },
  {
    "before": "DROID ships CC BY 4.0, which permits commercial training with attribution,",
    "after": "DROID ships CC BY 4.0; its deed describes commercial sharing and adaptation subject to its terms, not a guarantee of every permission needed for a use <Cite id=\"cc-by-4-0-deed\" />;"
  },
  {
    "before": "The project site put the average trajectory at 38 timesteps, which at 5 Hz is about eight seconds; the site is offline as of September 2026 and the paper prints no timestep average <Cite id=\"bridgedata-v2-2023\" />.",
    "after": "The official project page reports an average trajectory length of 38 timesteps and a control frequency of 5 Hz <Cite id=\"bridgedata-v2-2023\" />."
  },
  {
    "before": "The license is CC BY 4.0, last verifiable on the project site in August 2026 (offline as of September 2026; the paper prints no data license), which permits commercial use with attribution, as DROID's does.",
    "after": "The official project page states that all data is provided under CC BY 4.0 <Cite id=\"bridgedata-v2-2023\" />."
  },
  {
    "before": "BridgeData V2's CC BY 4.0 and RoboMIND's non-commercial terms rest on project pages that no longer print them,",
    "after": "BridgeData V2's official project page states CC BY 4.0 <Cite id=\"bridgedata-v2-2023\" />; RoboMIND's previously recorded non-commercial terms remain unverified,"
  }
];
const oldHashes: Array<[BaselineKind, string, string]> = [
  ['prose', 'article:data-hardware/datasets', 'b3ff49da0ad2736cacb9ec26636e3fa2364b17df86e1feafcadcb940cffcd596'],
  ['relationships', 'article:data-hardware/datasets', '2a518a54e5d7c35d271a6c0f52c3fa6c21912f4348259cf7cea76c45677db8b8'],
  ['article-metadata', 'article-fact-frontmatter:data-hardware/datasets', 'fac69ffb34f419e71205fe3f92eab53e6627c308ba7dd1efe4dbac89820f4b22'],
  ['article-metadata', 'citation-rendering:label-and-meta', '8c97b4c2c2475caf673e5e25f0a654784734716a434c4f3f41c3249248d80507'],
  ['article-metadata', 'citation:cc-by-4-0-deed', sha256('missing')],
];
const approvals: ApprovedDelta[] = JSON.parse(read('contract/brand-v2-approved-deltas.json')).entries;
const selectedApprovals = approvals.filter(a => a.id.startsWith('dataset-license-pair-20260921-'));
const truth = collectArticleTruthManifests();
const currentHash = (kind: BaselineKind, memberId: string) => Object.values(truth).find(m => m.kind === kind)?.members.find(m => m.id === memberId)?.hash;
// Members the production line also changed (SEO training-contract section,
// related links, and its own citation additions). On the integrated line the
// lane endpoint is no longer HEAD for these; each carries the integration
// re-anchor from its sealed hash to the merged hash instead. A member moved
// again after the integration (the label/meta digest, by later registry
// additions) also carries a later re-anchor from the same seal to HEAD.
const productionTouched = new Set([
  'prose|article:data-hardware/datasets',
  'relationships|article:data-hardware/datasets',
  'article-metadata|citation-rendering:label-and-meta',
]);
const touched = ([kind, id]: [BaselineKind, string, string]) => productionTouched.has(`${kind}|${id}`);
function bundle(old: boolean, selected: Array<[BaselineKind, string, string]> = oldHashes): BaselineBundle {
  const manifests = Object.fromEntries(BASELINE_KINDS.map(kind => {
    const manifest = buildManifest(kind, [{ id: 'fixture:unchanged', value: 'bounded comparison' }]);
    const members: ManifestMember[] = selected.filter(([k]) => k === kind).flatMap(([, id, hash]) => {
      if (old) return hash === sha256('missing') ? [] : [{ id, hash }];
      return Object.values(truth).flatMap(m => m.kind === kind ? m.members.filter(v => v.id === id) : []);
    });
    return [kind, { ...manifest, members, memberCount: members.length }];
  })) as BaselineBundle['manifests'];
  return { schemaVersion: 1, source: { commit: base, tree: '', trackedWorktreeClean: false }, tools: { node: '', npm: '', playwright: '', next: '', typescript: '', vitest: '', lockfileSha256: '' }, manifests, manifestRoots: Object.fromEntries(BASELINE_KINDS.map(k => [k, manifests[k].rootHash])) as BaselineBundle['manifestRoots'], rootHash: '' };
}

describe('DROID and BridgeData license pair, exact bounded correction', () => {
  it('applies only the five approved prose replacements and one frontmatter citation', () => {
    // The lane's pre-correction article is the true merge base's article, so
    // the lane changed nothing else. The integrated article is the production
    // line's article (SEO training-contract section and related links) with
    // exactly these edits applied.
    expect(before(articlePath)).toBe(showAt(TRUE_MERGE_BASE, articlePath));
    let expected = showAt(PRODUCTION_BASE, articlePath);
    for (const edit of edits) {
      expect(before(articlePath).split(edit.before)).toHaveLength(2);
      expect(expected.split(edit.before)).toHaveLength(2);
      expected = expected.replace(edit.before, edit.after);
    }
    expected = expected.replace('  - droid-2024\n', '  - droid-2024\n  - cc-by-4-0-deed\n');
    expect(article).toBe(expected);
    expect(matter(article).data.lastReviewed).toBe('2026-08-17');
  });
  it('registers the license version year rather than a dataset or webpage year', () => {
    expect(CITATIONS.find(c => c.id === 'cc-by-4-0-deed')).toEqual({ id: 'cc-by-4-0-deed', title: 'Attribution 4.0 International', authors: ['Creative Commons'], year: 2013, url: 'https://creativecommons.org/licenses/by/4.0/', type: 'docs' });
    expect(CITATIONS.find(c => c.id === 'droid-2024')?.year).toBe(2024);
    expect(read('data/citations.ts')).toContain('license-version publication year, not the undated deed webpage');
    // The license fix left the dataset rows alone. Compared as the ROWS
    // literal, not the whole file: the module's validation wiring later
    // moved to lib/registry-validation.ts (zod out of client bundles)
    // without touching a row.
    const rows = (source: string) =>
      source.slice(source.indexOf('const ROWS: Dataset[] = ['), source.indexOf('\n];\n') + 4);
    expect(rows(integrated('data/datasets.ts'))).toBe(rows(before('data/datasets.ts')));
    expect(rows(read('data/datasets.ts'))).toContain("sources: ['robomind-2024']");
  });
  it('narrows commercial permission to published terms and limitations', () => {
    expect(row(5).claim).toContain('a license link, change notices');
    expect(row(5).claim).toContain('does not guarantee every permission');
    expect(article).not.toContain('permits commercial training');
    expect(article).toContain('other rights may limit a particular use');
  });
  it('uses the actual official endpoint and omits the derived seconds gloss', () => {
    expect(row(6).sourceChecked).toContain('https://rail-berkeley.github.io/bridgedata/');
    expect(row(6).claim).toContain('38-timestep average');
    expect(row(6).claim).not.toContain('~8 s');
    expect(article).not.toContain('the site is offline');
    expect(plan(6).evidence.some(e => e.supportingPassage.includes('All data is provided under'))).toBe(true);
  });
  it.each([5, 6])('completes every part of row %i with new digest-bound reviews', ordinal => {
    const p = plan(ordinal);
    expect(row(ordinal).outcome).toBe('passing');
    expect(row(ordinal).verdict).toMatch(/^C(?: |$)/);
    expect(row(ordinal).evidenceFailures).toEqual([]);
    expect(p.originalCellsDigest).toBe(originalClaimDigest(row(ordinal)));
    expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
    expect(p.planReview?.reviewedBy).toContain('2026-09-21');
    expect(p.parts.map(part => part.id)).toEqual(ordinal === 5
      ? ['ds5-paper-license', 'ds5-deed-commercial-attribution', 'ds5-license-version-date']
      : ['ds6-total-and-robot', 'ds6-split-and-rate', 'ds6-project-average', 'ds6-project-data-license']);
    if (ordinal === 5) {
      const terms = p.evidence.find(e => e.partId === 'ds5-deed-commercial-attribution')!;
      expect(terms.sourceUrl).toBe('https://creativecommons.org/licenses/by/4.0/');
      expect(terms.supportingPassage).toContain('provide a link to the license');
      expect(terms.supportingPassage).toContain('indicate if changes were made');
      expect(terms.supportingPassage).toContain('publicity, privacy, or moral rights');
      const version = p.evidence.find(e => e.partId === 'ds5-license-version-date')!;
      expect(version.sourceUrl).toBe('https://wiki.creativecommons.org/wiki/License_Versions');
      expect(version.supportingPassage).toContain('2013 Nov 25');
    }
    expect(p.adjudications).toHaveLength(p.parts.length);
    for (const part of p.parts) {
      const review = p.adjudications.find(a => a.partId === part.id)!;
      expect(review.outcome).toBe('supported');
      expect(review.evidenceDigest).toBe(compoundPartDigest(p, part.id));
      expect(new Set(p.evidence.filter(e => e.partId === part.id).map(e => e.citationId))).toEqual(new Set(part.requiredCitationIds));
    }
  });
  it.each([5, 6])('rejects missing evidence, missing review, and changed tuple for row %i', ordinal => {
    const missingEvidence = structuredClone(plans);
    plan(ordinal, missingEvidence).evidence.pop();
    expect(parse(missingEvidence)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    const missingReview = structuredClone(plans);
    plan(ordinal, missingReview).planReview = null;
    expect(parse(missingReview)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    const changed = ledger.replace(`| ${row(ordinal).claim} |`, `| ${row(ordinal).claim} CHANGED |`);
    expect(parse(plans, changed)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
  });
  it('rejects unregistered deed and retains real setup cost evidence rather than a heading', () => {
    expect(parse(plans, ledger, new Set([...ids].filter(id => id !== 'cc-by-4-0-deed')))[4].evidenceFailures.length).toBeGreaterThan(0);
    expect(plan(6).evidence.find(e => e.partId === 'ds6-total-and-robot' && e.sourceUrl.includes('arxiv'))?.supportingPassage).toContain('costs approximately $4,000');
  });
  it('preserves row10 and its held plan exactly, with no new license credit', () => {
    expect(plan(10)).toEqual(plan(10, oldPlans));
    const old = parseLedger('audit/data-hardware.md', before('audit/data-hardware.md'), new Set([...ids].filter(id => id !== 'cc-by-4-0-deed')), { compoundPlans: oldPlans, articleCitations: citations }).find(s => s.slug === 'datasets')!.claimRecords[9];
    expect(row(10)).toEqual(old);
    expect(row(10).evidenceFailures.length).toBeGreaterThan(0);
  });
  it('retains exact former cells and selected plans as non-counted history', () => {
    expect(ledger).toContain('Historical: dataset license pair correction 2026-09-21');
    for (const ordinal of [5, 6]) expect(ledger).toContain(JSON.stringify(plan(ordinal, oldPlans), null, 2));
    expect(parse()).toHaveLength(11);
    // The correction replaced the row 5/6 plans in place: the lane catalog's
    // 857 identities keep their order, and later lanes append no datasets plan.
    expect(oldPlans).toHaveLength(857);
    expect(plans.slice(0, oldPlans.length).map(p => p.id)).toEqual(oldPlans.map(p => p.id));
    expect(plans.slice(oldPlans.length).filter(p => p.articleSlug === 'datasets')).toEqual([]);
  });
  it('appends exactly five native member approvals with the complete old prefix intact', () => {
    const old: ApprovedDelta[] = JSON.parse(before('contract/brand-v2-approved-deltas.json')).entries;
    expect(old).toHaveLength(999);
    // Integrated line: the production ledger is an exact prefix, entries it
    // shares with the lane keep their identity, and the lane-only block
    // follows unchanged in lane order with these five appended right after it.
    const { production, shared, laneOnly, start } = laneWindow(old);
    expect(approvals.slice(0, production.length)).toEqual(production);
    for (const entry of shared) {
      expect(production.find(p => p.id === entry.id)).toMatchObject({ manifest: entry.manifest, memberId: entry.memberId });
    }
    expect(approvals.slice(production.length, start)).toEqual(laneOnly);
    expect(approvals.slice(start, start + 5)).toEqual(selectedApprovals);
    expect(selectedApprovals).toHaveLength(5);
    for (const entry of oldHashes) {
      const [manifest, memberId, oldHash] = entry;
      const a = selectedApprovals.find(a => a.manifest === manifest && a.memberId === memberId)!;
      expect(a?.oldHash).toBe(oldHash);
      expect(a?.disposition).toBe('permanent');
      const reanchor = reanchorFor(approvals, manifest, memberId);
      if (touched(entry)) {
        expect(a?.newHash).not.toBe(currentHash(manifest, memberId));
        // The integration re-anchor keeps the merged value that the
        // integration commit's own evidence observed; HEAD is bracketed from
        // the same seal by the latest re-anchor, which never precedes it.
        expect(integratedHash(manifest, memberId)).toMatch(/^[0-9a-f]{64}$/);
        expect(reanchor).toMatchObject({ oldHash: sealedHash(manifest, memberId), newHash: integratedHash(manifest, memberId), disposition: 'permanent' });
        const head = headReanchorFor(approvals, manifest, memberId)!;
        expect(head).toMatchObject({ oldHash: sealedHash(manifest, memberId), newHash: currentHash(manifest, memberId), disposition: 'permanent' });
        expect(approvals.indexOf(head)).toBeGreaterThanOrEqual(approvals.indexOf(reanchor!));
      } else {
        expect(a?.newHash).toBe(currentHash(manifest, memberId));
        // A lane-only member needs no integration re-anchor; if one exists it must be exact.
        if (reanchor) expect(reanchor).toMatchObject({ oldHash: sealedHash(manifest, memberId), newHash: currentHash(manifest, memberId) });
      }
    }
  });
  it('native comparison accepts only the exact approvals, never missing or mutated hashes', () => {
    // Members only the lane changed: lane start -> HEAD through the lane approvals.
    const laneMembers = oldHashes.filter(entry => !touched(entry));
    const laneApprovals = selectedApprovals.filter(a => laneMembers.some(([k, id]) => a.manifest === k && a.memberId === id));
    expect(laneApprovals.length).toBeGreaterThan(0);
    expect(compareBaseline(bundle(true, laneMembers), bundle(false, laneMembers), laneApprovals).ok).toBe(true);
    for (const approval of laneApprovals) {
      expect(compareBaseline(bundle(true, laneMembers), bundle(false, laneMembers), laneApprovals.filter(a => a.id !== approval.id)).ok).toBe(false);
      expect(compareBaseline(bundle(true, laneMembers), bundle(false, laneMembers), laneApprovals.map(a => a.id === approval.id ? { ...a, newHash: '0'.repeat(64) } : a)).ok).toBe(false);
    }
    // Members the production line also changed: seal -> HEAD through the latest integration re-anchors.
    const mergedMembers = oldHashes.filter(touched).map(([k, id]) => [k, id, sealedHash(k, id)] as [BaselineKind, string, string]);
    const reanchors = mergedMembers.map(([k, id]) => headReanchorFor(approvals, k, id)!);
    expect(reanchors).toHaveLength(productionTouched.size);
    const graph = approvals.filter(a => mergedMembers.some(([k, id]) => a.manifest === k && a.memberId === id));
    expect(compareBaseline(bundle(true, mergedMembers), bundle(false, mergedMembers), graph).ok).toBe(true);
    for (const approval of reanchors) {
      expect(compareBaseline(bundle(true, mergedMembers), bundle(false, mergedMembers), graph.filter(a => a.id !== approval.id)).ok).toBe(false);
      expect(compareBaseline(bundle(true, mergedMembers), bundle(false, mergedMembers), graph.map(a => a.id === approval.id ? { ...a, newHash: '0'.repeat(64) } : a)).ok).toBe(false);
    }
  });
});
