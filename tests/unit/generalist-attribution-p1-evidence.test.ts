import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import { GENERALIST_RELEASES } from '../../lib/generalist-policies';
import { compoundPartDigest, compoundPlanDigest, originalClaimDigest, parseLedger, type CompoundPlan } from '../../lib/audit-ledger';
import { BASELINE_KINDS, buildManifest, compareBaseline, sha256, type ApprovedDelta, type BaselineBundle, type BaselineKind, type ManifestMember } from '../../lib/brand-v2-baseline';
import { collectArticleTruthManifests } from '../../scripts/brand-v2-baseline';
import { headReanchorFor, integratedHash, laneWindow, reanchorFor, sealedHash } from './helpers/continuation-merge-ledger';

const root = resolve(import.meta.dirname, '../..');
const base = '9ea4a171131e45deacfbd1b54921940162f3afbf';
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const before = (path: string) => execFileSync('git', ['show', `${base}:${path}`], { cwd: root, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
const articlePath = 'content/manipulation/generalist-policies.mdx';
const article = read(articlePath);
const ledger = read('audit/manipulation.md');
const plans: CompoundPlan[] = JSON.parse(read('audit/compound-evidence.json'));
const oldPlans: CompoundPlan[] = JSON.parse(before('audit/compound-evidence.json'));
const registry = new Set(CITATIONS.map(c => c.id));
const citations = Object.fromEntries(publishedModules().map(m => [m.slug, matter(read(`content/${m.domain}/${m.slug}.mdx`)).data.citations]));
const parse = (catalog = plans, markdown = ledger, declared = citations) => parseLedger('audit/manipulation.md', markdown, registry, { compoundPlans: catalog, articleCitations: declared }).find(s => s.slug === 'generalist-policies')!.claimRecords;
const plan = (ordinal: number, catalog = plans) => catalog.find(p => p.ledgerPath === 'audit/manipulation.md' && p.articleSlug === 'generalist-policies' && p.rowOrdinal === ordinal)!;
const oldSpan = 'GO-1 (March 2025) is built on ViLLA, vision-language-latent-action. A latent action token sits between the VLM and the low-level action head, and because latent actions can be inferred from unlabeled video, human or robot, the model absorbs video that carries no action labels. GO-1 was open-sourced alongside the AgiBot World Colosseo platform <Cite id="agibot-world-2025" />.';
const newSpan = 'The AgiBot World report, first submitted in March 2025, introduces GO-1. Its inspected v4 methods describe a hierarchical vision-language-latent-action (ViLLA) framework: a latent action model learns from consecutive video frames, a VLM-conditioned latent planner predicts latent action tokens, and an action expert generates low-level actions conditioned on the preceding modules. The paper explicitly includes human video without action labels and cross-embodiment robot data in training. It describes Colosseo as an open-sourced platform of data, models, benchmarks, and an ecosystem; that description does not establish that GO-1 checkpoints and the dataset were released together <Cite id="agibot-world-2025" />. AgiBot\'s later GO-2 announcement also names ViLLA when describing GO-1 <Cite id="agibot-go2-2026" />.';
const expectedAuthors = 'AgiBot-World-Contributors;Qingwen Bu;Jisong Cai;Li Chen;Xiuqi Cui;Yan Ding;Siyuan Feng;Shenyuan Gao;Xindong He;Xuan Hu;Xu Huang;Shu Jiang;Yuxin Jiang;Cheng Jing;Hongyang Li;Jialu Li;Chiming Liu;Yi Liu;Yuxiang Lu;Jianlan Luo;Ping Luo;Yao Mu;Yuehan Niu;Yixuan Pan;Jiangmiao Pang;Yu Qiao;Guanghui Ren;Cheng Ruan;Jiaqi Shan;Yongjian Shen;Chengshi Shi;Mingkang Shi;Modi Shi;Chonghao Sima;Jianheng Song;Huijie Wang;Wenhao Wang;Dafeng Wei;Chengen Xie;Guo Xu;Junchi Yan;Cunbiao Yang;Lei Yang;Shukai Yang;Maoqing Yao;Jia Zeng;Chi Zhang;Qinglin Zhang;Bin Zhao;Chengyue Zhao;Jiaqi Zhao;Jianchao Zhu'.split(';');
const oldHashes: Array<[BaselineKind, string, string]> = [
  ['prose', 'article:manipulation/generalist-policies', '94cc9a639c8e66f97c327f9ff916f40f6bfc558a2177a6f8a9f42cdeed08bf8e'],
  ['relationships', 'article:manipulation/generalist-policies', '175d565634723d9122f43bbf7a82f17a310b7fce5c85f36fdbc44620b25c0613'],
  ['article-metadata', 'citation:agibot-world-2025', '68d060d391d0cca49c824f96d2bc226add599dd915d28d8a9410b159ec6cb425'],
  ['article-metadata', 'citation-rendering:label-and-meta', '525d7e43d59c75f31cb2dee4e5c449bc583f757b95b475c146155764c342fc7b'],
];
const approvals: ApprovedDelta[] = JSON.parse(read('contract/brand-v2-approved-deltas.json')).entries;
const selectedApprovals = approvals.filter(a => a.id.startsWith('generalist-attribution-p1-20260922-'));
const truth = collectArticleTruthManifests();
const currentHash = (kind: BaselineKind, memberId: string) => Object.values(truth).find(m => m.kind === kind)?.members.find(m => m.id === memberId)?.hash;
// The production line also changed the citation label/meta digest (its own
// citation additions). On the integrated line the lane endpoint is no longer
// HEAD for that member; it carries the integration re-anchor from its sealed
// hash to the merged hash instead, and, once later registry additions move the
// digest again, a later re-anchor from the same seal to HEAD.
const productionTouched = new Set(['article-metadata|citation-rendering:label-and-meta']);
const touched = ([kind, id]: [BaselineKind, string, string]) => productionTouched.has(`${kind}|${id}`);
function bundle(old: boolean, selected: Array<[BaselineKind, string, string]> = oldHashes): BaselineBundle {
  const manifests = Object.fromEntries(BASELINE_KINDS.map(kind => {
    const manifest = buildManifest(kind, [{ id: 'fixture:unchanged', value: 'bounded comparison' }]);
    const members: ManifestMember[] = selected.filter(([k]) => k === kind).flatMap(([, id, hash]) => old
      ? (hash === sha256('missing') ? [] : [{ id, hash }])
      : Object.values(truth).flatMap(m => m.kind === kind ? m.members.filter(v => v.id === id) : []));
    return [kind, { ...manifest, members, memberCount: members.length }];
  })) as BaselineBundle['manifests'];
  return { schemaVersion: 1, source: { commit: base, tree: '', trackedWorktreeClean: false }, tools: { node: '', npm: '', playwright: '', next: '', typescript: '', vitest: '', lockfileSha256: '' }, manifests, manifestRoots: Object.fromEntries(BASELINE_KINDS.map(k => [k, manifests[k].rootHash])) as BaselineBundle['manifestRoots'], rootHash: '' };
}

describe('generalist originals 15 and 21, exact attribution and metadata correction', () => {
  it('changes exactly the authorized paragraph without changing frontmatter or other claims', () => {
    expect(before(articlePath).split(oldSpan)).toHaveLength(2);
    expect(article).toBe(before(articlePath).replace(oldSpan, newSpan));
    expect(matter(article).data).toEqual(matter(before(articlePath)).data);
    expect(article).not.toContain('GO-1 was open-sourced alongside');
  });
  it('qualifies the GO-1 timeline date without changing sorting or availability', () => {
    const go1 = GENERALIST_RELEASES.find(r => r.id === 'agibot-go1')!;
    expect(go1.dateLabel).toBe('Mar 2025 report');
    expect(go1.capability).toContain('not a checkpoint release date');
    expect(go1.capability).toContain('inspected v4');
    expect(go1.released).toBe('2025-03');
    expect(go1.openWeights).toBe(true);
    expect(go1.citationId).toBe('agibot-world-2025');
  });
  it('retains the complete ordered collective plus 51-person AgiBot byline', () => {
    const c = CITATIONS.find(c => c.id === 'agibot-world-2025')!;
    expect(c.authors).toEqual(expectedAuthors);
    expect(c.authors).toHaveLength(52);
    expect(c.year).toBe(2025);
    expect(c.arxiv).toBe('2503.06669');
    expect(c.url).toBe('https://arxiv.org/abs/2503.06669');
  });
  it.each([15, 21])('requires a current reviewed correction for original %i', ordinal => {
    const row = parse()[ordinal - 1];
    const p = plan(ordinal);
    expect(row.verdict).toMatch(/^C(?: |$)/);
    expect(row.evidenceFailures).toEqual([]);
    expect(p.originalCellsDigest).toBe(originalClaimDigest(row));
    expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
    expect(p.planReview?.reviewedBy).toContain('43c1134d-d536-47b9-9e71-dcb03dff8271');
    expect(p.parts).toHaveLength(ordinal === 15 ? 4 : 15);
    expect(p.adjudications).toHaveLength(p.parts.length);
    for (const part of p.parts) {
      const review = p.adjudications.find(a => a.partId === part.id)!;
      expect(review.outcome).toBe('supported');
      expect(review.evidenceDigest).toBe(compoundPartDigest(p, part.id));
      expect(new Set(p.evidence.filter(e => e.partId === part.id).map(e => e.citationId))).toEqual(new Set(part.requiredCitationIds));
    }
  });
  it('keeps all four attribution obligations and contradictory release context', () => {
    const p = plan(15);
    expect(p.parts.map(p => p.id)).toEqual(['report-date', 'villa-attribution', 'latent-mechanism', 'release-scope']);
    const text = p.evidence.map(e => e.supportingPassage).join('\n');
    expect(text).toContain('We plan to release all resources');
    expect(text).toContain('[2025/09/19]');
    expect(text).toContain('ViLLA');
    expect(text).toContain('human videos lacking action labels');
    expect(parse()[14].note).toContain('unseen edition');
  });
  it('requires all fifteen identities and retains version and date distinctions', () => {
    const p = plan(21);
    expect(new Set(p.parts.flatMap(p => p.requiredCitationIds))).toEqual(new Set(matter(article).data.citations));
    expect(p.parts).toHaveLength(15);
    expect(p.evidence.find(e => e.citationId === 'pi05-2025')?.sourceUrl).toBe('https://arxiv.org/html/2504.16054v1');
    expect(p.evidence.find(e => e.citationId === 'pi06-model-card-2025')?.supportingPassage).toContain('November 17, 2025');
    expect(p.parts.find(p => p.id === 'identity-pi06-model-card-2025')?.text).toContain('not the separate π*0.6 paper');
    expect(p.evidence.find(e => e.citationId === 'agibot-go2-2026')?.supportingPassage).toContain('<!--<span>发布时间：2026-04-09 09:16:14</span>-->');
    expect(p.parts.find(p => p.id === 'identity-agibot-go2-2026')?.text).toContain('not a visible release date');
    expect(p.parts.find(p => p.id === 'identity-egoscale-2026')?.text).toContain('February 18, 2026');
    expect(p.evidence.find(e => e.citationId === 'isaac-gr00t-repo-2026')?.supportingPassage).toContain('/releases/tag/n1.7-release');
  });
  it.each([15, 21])('fails closed on missing evidence, review and changed tuple for %i', ordinal => {
    const missing = structuredClone(plans);
    plan(ordinal, missing).evidence.pop();
    expect(parse(missing)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    const stale = structuredClone(plans);
    plan(ordinal, stale).planReview = null;
    expect(parse(stale)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    const changed = ledger.replace(`| ${parse()[ordinal - 1].claim} |`, `| ${parse()[ordinal - 1].claim} CHANGED |`);
    expect(parse(plans, changed)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
  });
  it('rejects a fourteen-source P1 population', () => {
    const declared = { ...citations, 'generalist-policies': citations['generalist-policies'].slice(0, -1) };
    expect(parse(plans, ledger, declared)[20].evidenceFailures.length).toBeGreaterThan(0);
  });
  it('preserves all prior plans and all unselected article rows including held original19', () => {
    expect(plans.slice(0, oldPlans.length)).toEqual(oldPlans);
    const old = parse(oldPlans, before('audit/manipulation.md'));
    expect(parse()).toHaveLength(21);
    for (let i = 0; i < old.length; i++) if (![14, 20].includes(i)) expect(parse()[i]).toEqual(old[i]);
    expect(parse()[18].evidenceFailures.length).toBeGreaterThan(0);
    expect(ledger).toContain('Historical: generalist attribution and P1 correction 2026-09-22');
    const historyText = ledger.split('## Historical: generalist attribution and P1 correction 2026-09-22')[1];
    const history = JSON.parse(historyText.split('```json\n')[1].split('\n```')[0]) as {
      records: Array<{ rowOrdinal: number; previousCells: Record<string, string>; previousTupleDigest: string; currentTupleDigest: string }>;
    };
    expect(history.records).toHaveLength(2);
    for (const i of [14, 20]) {
      const { claim, sourceChecked, verdict, note } = old[i];
      const entry = history.records.find(r => r.rowOrdinal === i + 1)!;
      expect(entry.previousCells).toEqual({ claim, sourceChecked, verdict, note });
      expect(entry.previousTupleDigest).toBe(originalClaimDigest(old[i]));
      expect(entry.currentTupleDigest).toBe(originalClaimDigest(parse()[i]));
    }
  });
  it('appends only the four exact current-HEAD approvals with the old prefix intact', () => {
    const old: ApprovedDelta[] = JSON.parse(before('contract/brand-v2-approved-deltas.json')).entries;
    expect(old).toHaveLength(1004);
    // Integrated line: the production ledger is an exact prefix, entries it
    // shares with the lane keep their identity, and the lane-only block
    // follows unchanged in lane order with these four appended right after it.
    const { production, shared, laneOnly, start } = laneWindow(old);
    expect(approvals.slice(0, production.length)).toEqual(production);
    for (const entry of shared) {
      expect(production.find(p => p.id === entry.id)).toMatchObject({ manifest: entry.manifest, memberId: entry.memberId });
    }
    expect(approvals.slice(production.length, start)).toEqual(laneOnly);
    expect(approvals.slice(start, start + 4)).toEqual(selectedApprovals);
    expect(selectedApprovals).toHaveLength(4);
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
  it('rejects missing or mutated exact approvals in native comparison', () => {
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
    expect(compareBaseline(bundle(true, mergedMembers), bundle(false, mergedMembers), reanchors).ok).toBe(true);
    for (const approval of reanchors) {
      expect(compareBaseline(bundle(true, mergedMembers), bundle(false, mergedMembers), reanchors.filter(a => a.id !== approval.id)).ok).toBe(false);
      expect(compareBaseline(bundle(true, mergedMembers), bundle(false, mergedMembers), reanchors.map(a => a.id === approval.id ? { ...a, newHash: '0'.repeat(64) } : a)).ok).toBe(false);
    }
  });
});
