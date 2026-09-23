import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import { GENERALIST_RELEASES } from '../../lib/generalist-policies';
import { compoundPartDigest, compoundPlanDigest, originalClaimDigest, parseLedger, type CompoundPlan } from '../../lib/audit-ledger';
import { BASELINE_KINDS, buildManifest, compareBaseline, type ApprovedDelta, type BaselineBundle, type BaselineKind, type ManifestMember } from '../../lib/brand-v2-baseline';
import { collectArticleTruthManifests } from '../../scripts/brand-v2-baseline';

const root = resolve(import.meta.dirname, '../..');
const base = '9ea4a171131e45deacfbd1b54921940162f3afbf';
const attributionCommit = 'afeeb058097ed5720ca11b03e41d3d2167573f5d';
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const at = (commit: string, path: string) => execFileSync('git', ['show', `${commit}:${path}`], { cwd: root, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
const before = (path: string) => at(base, path);
const articlePath = 'content/manipulation/generalist-policies.mdx';
const article = read(articlePath);
const attributionArticle = at(attributionCommit, articlePath);
const ledger = read('audit/manipulation.md');
const attributionLedger = at(attributionCommit, 'audit/manipulation.md');
const plans: CompoundPlan[] = JSON.parse(read('audit/compound-evidence.json'));
const oldPlans: CompoundPlan[] = JSON.parse(before('audit/compound-evidence.json'));
const attributionPlans: CompoundPlan[] = JSON.parse(at(attributionCommit, 'audit/compound-evidence.json'));
const isGeneralistPlan = (p: CompoundPlan) => p.ledgerPath === 'audit/manipulation.md' && p.articleSlug === 'generalist-policies';
const registry = new Set(CITATIONS.map(c => c.id));
const citations = Object.fromEntries(publishedModules().map(m => [m.slug, matter(read(`content/${m.domain}/${m.slug}.mdx`)).data.citations]));
const parse = (catalog = plans, markdown = ledger, declared = citations) => parseLedger('audit/manipulation.md', markdown, registry, { compoundPlans: catalog, articleCitations: declared }).find(s => s.slug === 'generalist-policies')!.claimRecords;
const plan = (ordinal: number, catalog = plans) => catalog.find(p => p.ledgerPath === 'audit/manipulation.md' && p.articleSlug === 'generalist-policies' && p.rowOrdinal === ordinal)!;
const oldSpan = 'GO-1 (March 2025) is built on ViLLA, vision-language-latent-action. A latent action token sits between the VLM and the low-level action head, and because latent actions can be inferred from unlabeled video, human or robot, the model absorbs video that carries no action labels. GO-1 was open-sourced alongside the AgiBot World Colosseo platform <Cite id="agibot-world-2025" />.';
const newSpan = 'The AgiBot World report, first submitted in March 2025, introduces GO-1. Its inspected v4 methods describe a hierarchical vision-language-latent-action (ViLLA) framework: a latent action model learns from consecutive video frames, a VLM-conditioned latent planner predicts latent action tokens, and an action expert generates low-level actions conditioned on the preceding modules. The paper explicitly includes human video without action labels and cross-embodiment robot data in training. It describes Colosseo as an open-sourced platform of data, models, benchmarks, and an ecosystem; that description does not establish that GO-1 checkpoints and the dataset were released together <Cite id="agibot-world-2025" />. AgiBot\'s later GO-2 announcement also names ViLLA when describing GO-1 <Cite id="agibot-go2-2026" />.';
// The only later article edits approved by generalist19 at d928b6b.
const generalist19Spans = [
  ['<Stat label="releases tracked" value="13" note="Feb 2025 to Jul 2026" accent />',
    '<Stat label="timeline entries" value="13" note="report and announcement dates, Feb 2025 to Jul 2026" accent />'],
  ['<Stat label="open weights" value="4" note="GR00T N1 and N1.7, GO-1, π0.5" />',
    '<Stat label="marked downloadable" value="4" note="GR00T N1 and N1.7, GO-1, π0.5; not license classifications" />'],
  ['<Stat label="arXiv papers" value="5" note="full methods and experiments" />',
    '<Stat label="arXiv papers" value="5" note="selected sources in this timeline" />'],
  ['<Stat label="vendor-only" value="7" note="blog or press, no external check" />',
    '<Stat label="blog/press sources" value="7" note="selected formats, not a replication census" />'],
  ['Seven of the thirteen releases above rest on lab blogs or press releases with no external replication: both Helix generations, both closed π generations, Gemini Robotics 2, GO-2, and Skild. Some of those claims will hold up. The point is that a triangle or diamond on the timeline is a company describing itself, and the honest way to cite those numbers is with the vendor\'s name attached, never as independent results.',
    'Seven of the thirteen timeline entries use a lab blog or press release as their selected source: both Helix generations, π0.6, π0.7, Gemini Robotics 2, GO-2, and Skild. This describes the sources selected here, not whether later papers or independent replications exist. Attribute numerical claims in those sources to their vendors; an announcement is not independent verification.'],
] as const;
const expectedAuthors = 'AgiBot-World-Contributors;Qingwen Bu;Jisong Cai;Li Chen;Xiuqi Cui;Yan Ding;Siyuan Feng;Shenyuan Gao;Xindong He;Xuan Hu;Xu Huang;Shu Jiang;Yuxin Jiang;Cheng Jing;Hongyang Li;Jialu Li;Chiming Liu;Yi Liu;Yuxiang Lu;Jianlan Luo;Ping Luo;Yao Mu;Yuehan Niu;Yixuan Pan;Jiangmiao Pang;Yu Qiao;Guanghui Ren;Cheng Ruan;Jiaqi Shan;Yongjian Shen;Chengshi Shi;Mingkang Shi;Modi Shi;Chonghao Sima;Jianheng Song;Huijie Wang;Wenhao Wang;Dafeng Wei;Chengen Xie;Guo Xu;Junchi Yan;Cunbiao Yang;Lei Yang;Shukai Yang;Maoqing Yao;Jia Zeng;Chi Zhang;Qinglin Zhang;Bin Zhao;Chengyue Zhao;Jiaqi Zhao;Jianchao Zhu'.split(';');
const oldHashes: Array<[BaselineKind, string, string]> = [
  ['prose', 'article:manipulation/generalist-policies', '94cc9a639c8e66f97c327f9ff916f40f6bfc558a2177a6f8a9f42cdeed08bf8e'],
  ['relationships', 'article:manipulation/generalist-policies', '175d565634723d9122f43bbf7a82f17a310b7fce5c85f36fdbc44620b25c0613'],
  ['article-metadata', 'citation:agibot-world-2025', '68d060d391d0cca49c824f96d2bc226add599dd915d28d8a9410b159ec6cb425'],
  ['article-metadata', 'citation-rendering:label-and-meta', '525d7e43d59c75f31cb2dee4e5c449bc583f757b95b475c146155764c342fc7b'],
];
const attributionHashes: Array<[BaselineKind, string, string]> = [
  ['prose', 'article:manipulation/generalist-policies', 'a38e7023403782407cace0c918dc1f149234149748e62e9c57fe9d03d3166951'],
  ['relationships', 'article:manipulation/generalist-policies', '785ab5aee7ea2c1cafabb9e2ea3c1420c7d3564bad6527769bda1f6ab00b94e6'],
  ['article-metadata', 'citation:agibot-world-2025', '3a8411c2d1287ed2e89b8ab0ac7fcdb3f3830b1d0b3981afdd1109c330dab1c2'],
  ['article-metadata', 'citation-rendering:label-and-meta', '40f4007276443c40512e8a7ad8ab461aec51eacf8f9a372f99c0e2a36563d3ef'],
];
// Exact subsequent edges affecting these four members, not blanket permission
// for the other source corrections or their unselected ledger records.
const successorEndpoints = [
  ['industrial-perception-zero-credit-20260922-6', 'article-metadata', 'citation-rendering:label-and-meta',
    '40f4007276443c40512e8a7ad8ab461aec51eacf8f9a372f99c0e2a36563d3ef',
    'f00819fcdb746cca4f9aa4cc25e3b0d56e10202fc6f8ab83f1f85a0bb963c450'],
  ['four-local-truth-repairs-20260922-1', 'prose', 'article:manipulation/generalist-policies',
    'a38e7023403782407cace0c918dc1f149234149748e62e9c57fe9d03d3166951',
    'bd4a5abdc213e0ef0102c1a3427a1eb6ad49db0f784dfdbe582d70ee0f1a1df4'],
] as const;
const approvals: ApprovedDelta[] = JSON.parse(read('contract/brand-v2-approved-deltas.json')).entries;
const attributionApprovals: ApprovedDelta[] = JSON.parse(at(attributionCommit, 'contract/brand-v2-approved-deltas.json')).entries;
const selectedApprovals = approvals.filter(a => a.id.startsWith('generalist-attribution-p1-20260922-'));
const successorApprovals = approvals.filter(a => successorEndpoints.some(([id]) => a.id === id));
const truth = collectArticleTruthManifests();
function bundle(stage: 'before' | 'attribution' | 'current'): BaselineBundle {
  const manifests = Object.fromEntries(BASELINE_KINDS.map(kind => {
    const manifest = buildManifest(kind, [{ id: 'fixture:unchanged', value: 'bounded comparison' }]);
    const hashes = stage === 'before' ? oldHashes : attributionHashes;
    const members: ManifestMember[] = hashes.filter(([k]) => k === kind).flatMap(([, id, hash]) => stage === 'current'
      ? Object.values(truth).flatMap(m => m.kind === kind ? m.members.filter(v => v.id === id) : [])
      : [{ id, hash }]);
    return [kind, { ...manifest, members, memberCount: members.length }];
  })) as BaselineBundle['manifests'];
  return { schemaVersion: 1, source: { commit: base, tree: '', trackedWorktreeClean: false }, tools: { node: '', npm: '', playwright: '', next: '', typescript: '', vitest: '', lockfileSha256: '' }, manifests, manifestRoots: Object.fromEntries(BASELINE_KINDS.map(k => [k, manifests[k].rootHash])) as BaselineBundle['manifestRoots'], rootHash: '' };
}

describe('generalist originals 15 and 21, exact attribution and metadata correction', () => {
  it('preserves the attribution paragraph through only the five approved original19 copy changes', () => {
    expect(before(articlePath).split(oldSpan)).toHaveLength(2);
    expect(attributionArticle).toBe(before(articlePath).replace(oldSpan, () => newSpan));
    let expected = attributionArticle;
    for (const [previous, corrected] of generalist19Spans) {
      expect(expected.split(previous)).toHaveLength(2);
      expected = expected.replace(previous, () => corrected);
    }
    expect(article).toBe(expected);
    expect(article.split(newSpan)).toHaveLength(2);
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
  it('preserves the historical plan prefix and current generalist records except the exact original19 correction', () => {
    // Preserve the original integration's global prefix at its own endpoint.
    // Later corrections elsewhere do not authorize changing generalist plans.
    expect(attributionPlans.slice(0, oldPlans.length)).toEqual(oldPlans);
    expect(attributionPlans.slice(oldPlans.length)).toEqual([plan(15), plan(21)]);
    expect(plans.filter(isGeneralistPlan)).toEqual(attributionPlans.filter(isGeneralistPlan));
    const old = parse(oldPlans, before('audit/manipulation.md'));
    const historical = parse(attributionPlans, attributionLedger);
    const current = parse();
    expect(historical).toHaveLength(21);
    expect(current).toHaveLength(21);
    for (let i = 0; i < old.length; i++) {
      if (![14, 20].includes(i)) expect(historical[i]).toEqual(old[i]);
      if (i !== 18) expect(current[i]).toEqual(historical[i]);
    }
    const held = current[18];
    expect(held.claim).toBe('Local timeline inventory: 13 entries with report/announcement dates from Feb 2025 to Jul 2026; 4 marked downloadable (GR00T N1 and N1.7, GO-1, π0.5), not a license classification; 5 selected arXiv sources, 1 repository source and 7 selected blog/press sources. The seven-entry enumeration is not a census of external replication.');
    expect(held.sourceChecked).toBe(historical[18].sourceChecked);
    expect(held.verdict).toBe('UNRESOLVED (bounded local-text correction only; external-passage requirement remains unmet)');
    expect(held.evidenceFailures).toHaveLength(3);
    expect([held.citationId, held.sourceUrl, held.supportingPassage]).toEqual(['', '', '']);
    expect(held.compound).toBeUndefined();
    const prior19 = JSON.parse(held.note.match(/^Historical four-cell record retained: (.+) Correction rationale:/)![1]);
    const { claim, sourceChecked, verdict, note } = historical[18];
    expect(prior19).toEqual({ claim, sourceChecked, verdict, note });
    expect(originalClaimDigest(prior19)).toBe('3e64bca94fb54e81c4aeb3a400fc37f7c51a87aea1934531a279d0defa21f36e');
    expect(held.note).toContain('not external source verification or whole-record completion');
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
  it('retains four exact historical approvals and only the two named successor edges for these members', () => {
    const old = JSON.parse(before('contract/brand-v2-approved-deltas.json')).entries;
    expect(old).toHaveLength(1004);
    expect(attributionApprovals).toHaveLength(1008);
    expect(attributionApprovals.slice(0, old.length)).toEqual(old);
    expect(approvals.slice(0, attributionApprovals.length)).toEqual(attributionApprovals);
    expect(selectedApprovals).toHaveLength(4);
    expect(selectedApprovals).toEqual(attributionApprovals.slice(old.length));
    for (const [manifest, memberId, oldHash] of oldHashes) {
      const a = selectedApprovals.find(a => a.manifest === manifest && a.memberId === memberId)!;
      expect(a?.oldHash).toBe(oldHash);
      expect(a?.newHash).toBe(attributionHashes.find(([kind, id]) => kind === manifest && id === memberId)?.[2]);
      expect(a?.disposition).toBe('permanent');
    }
    expect(successorApprovals.map(a => [a.id, a.manifest, a.memberId, a.oldHash, a.newHash])).toEqual(successorEndpoints);
    expect(approvals.slice(attributionApprovals.length).filter(a =>
      oldHashes.some(([kind, id]) => a.manifest === kind && a.memberId === id),
    )).toEqual(successorApprovals);
    for (const a of successorApprovals) {
      expect(a.disposition).toBe('permanent');
      expect(a.oldHash).toBe(attributionHashes.find(([kind, id]) => kind === a.manifest && id === a.memberId)?.[2]);
    }
  });
  it('rejects missing or mutated approvals at both bounded native transitions', () => {
    const beforeAttribution = bundle('before');
    const attributed = bundle('attribution');
    const current = bundle('current');
    expect(compareBaseline(beforeAttribution, current, selectedApprovals).ok).toBe(false);
    for (const [previous, next, edges] of [
      [beforeAttribution, attributed, selectedApprovals],
      [attributed, current, successorApprovals],
    ] as const) {
      expect(compareBaseline(previous, next, edges).ok).toBe(true);
      for (const approval of edges) {
        expect(compareBaseline(previous, next, edges.filter(a => a.id !== approval.id)).ok).toBe(false);
        expect(compareBaseline(previous, next, edges.map(a => a.id === approval.id ? { ...a, newHash: '0'.repeat(64) } : a)).ok).toBe(false);
      }
    }
  });
});
