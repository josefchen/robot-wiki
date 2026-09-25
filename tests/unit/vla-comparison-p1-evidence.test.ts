import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { beforeAll, describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { METHODS } from '../../data/methods';
import { publishedModules } from '../../data/modules';
import { compoundPartDigest, compoundPlanDigest, originalClaimDigest, parseLedger, type CompoundPlan } from '../../lib/audit-ledger';
import { collectArticleTruthManifests } from '../../scripts/brand-v2-baseline';
import { committedSource, preservedApprovalPacket, preservedCompoundPacket, RELEASE_BASE } from '../helpers/continuation-integration';
import { headReanchorFor, showAt } from './helpers/continuation-merge-ledger';
import { currentAuditContext, finalSevenPriorPlans } from '../helpers/residual-integration';
import { preservedLegacySurvivors } from '../helpers/audit-plan-history';
import { committedJson, committedText } from '../helpers/editorial-current-context';

const root = resolve(import.meta.dirname, '../..');
const base = 'afeeb058097ed5720ca11b03e41d3d2167573f5d';
const transaction = '89cda670f72443e321f3282b256974b4376da0f1';
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const before = (path: string) => showAt(base, path);
const articlePath = 'content/manipulation/comparison-matrix.mdx';
const article = read(articlePath);
const ledger = read('audit/manipulation.md');
const plans: CompoundPlan[] = JSON.parse(read('audit/compound-evidence.json'));
const oldPlans: CompoundPlan[] = JSON.parse(before('audit/compound-evidence.json'));
const ids = new Set(CITATIONS.map(c => c.id));
const declared = Object.fromEntries(publishedModules().map(m => [m.slug, matter(read(`content/${m.domain}/${m.slug}.mdx`)).data.citations as string[]]));
const selected = [['vla-models', 21, 9], ['comparison-matrix', 1, 23]] as const;
const parse = (catalog = plans, md = ledger, citations = declared) => parseLedger('audit/manipulation.md', md, ids, { compoundPlans: catalog, articleCitations: citations });
const row = (slug: string, ordinal: number, catalog = plans, md = ledger, citations = declared) => parse(catalog, md, citations).find(s => s.slug === slug)!.claimRecords[ordinal - 1];
const plan = (slug: string, ordinal: number, catalog = plans) => catalog.find(p => p.articleSlug === slug && p.rowOrdinal === ordinal && p.ledgerPath === 'audit/manipulation.md')!;
const intro = 'RT-2’s reported rates depend on the model and serving setup. Its 55B PaLI-X variant runs at 1 to 3 Hz, while the 5B variant runs at around 5 Hz, using a multi-TPU cloud service queried over the network. <Cite id="rt2-2023" />\n\nOpenVLA v3 reports approximately 6 Hz inference on one NVIDIA RTX 4090 in bfloat16, without compilation, speculative decoding, or other inference speed-up tricks. <Cite id="openvla-2024" />';
// The manipulation humanizer pass (owner decision 20260925) later moved the
// paper-edition locator out of the prose; the facts are unchanged.
const currentIntro = intro.replace('OpenVLA v3 reports', 'OpenVLA reports');
const oldIntro = before(articlePath).split("import { ComparisonMatrix } from '@/components/interactive/comparison-matrix';\n\n")[1].split('\n\n<ComparisonMatrix')[0];

describe('VLA21 and comparison1 current identity and scoped introduction', () => {

  beforeAll(() => {
    // Warm the neutral history renders once; each catalog render is expensive
    // and individual tests must stay under 5s.
    preservedCompoundPacket('89cda670f72443e321f3282b256974b4376da0f1');
    void before('audit/manipulation.md');
    void oldPlans.length;
  }, 120_000);
  it('changes only the authorized introduction, leaving VLA, registry and metadata unchanged', () => {
    const mainArticle = committedSource(RELEASE_BASE, articlePath);
    expect(mainArticle.split(oldIntro)).toHaveLength(2);
    // The release-base article with only the authorized introduction is the
    // transaction endpoint; the humanizer pass carries it to the current
    // article through its approved-deltas re-anchor.
    const truthManifests = collectArticleTruthManifests();
    const passEntry = JSON.parse(read('contract/brand-v2-approved-deltas.json')).entries
      .find((a: { id: string }) => a.id === 'humanizer-manipulation-v3-20260925-prose-comparison-matrix');
    expect(passEntry).toBeDefined();
    expect(truthManifests['prose'].members.find(m => m.id === 'article:manipulation/comparison-matrix')?.hash)
      .toBe(passEntry.newHash);
    expect(article).toContain(currentIntro);
    expect(article).not.toContain(oldIntro);
    expect(matter(article).data).toEqual(matter(mainArticle).data);
    // The VLA article is likewise carried forward by the humanizer pass;
    // its endpoint is the head re-anchor for the member.
    const vlaPass = JSON.parse(read('contract/brand-v2-approved-deltas.json')).entries
      .find((a: { id: string }) => a.id === 'humanizer-manipulation-v3-20260925-prose-vla-models');
    expect(vlaPass).toBeDefined();
    expect(truthManifests['prose'].members.find(m => m.id === 'article:manipulation/vla-models')?.hash)
      .toBe(vlaPass.newHash);
    // The original VLA packet did not alter the registry. NASA was added by
    // the later industrial packet, whose complete record has its own test.
    expect(committedSource('89cda67', 'data/citations.ts')).toBe(before('data/citations.ts'));
    expect(committedText(transaction, articlePath)).toBe(before(articlePath).replace(oldIntro, intro));
    expect(matter(committedText(transaction, articlePath)).data).toEqual(matter(before(articlePath)).data);
    expect(committedText(transaction, 'content/manipulation/vla-models.mdx')).toBe(before('content/manipulation/vla-models.mdx'));
    expect(committedText(transaction, 'data/citations.ts')).toBe(before('data/citations.ts'));
    expect(CITATIONS.filter(c => ['rt2-2023', 'openvla-2024'].includes(c.id))).toHaveLength(2);
  });

  it.each(selected)('requires a current C review for %s original %i', (slug, ordinal, count) => {
    const r = row(slug, ordinal);
    const p = plan(slug, ordinal);
    expect(r.verdict).toBe('C');
    expect(r.evidenceFailures).toEqual([]);
    expect(p.parts).toHaveLength(count);
    expect(p.originalCellsDigest).toBe(originalClaimDigest(r));
    expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
    expect(p.planReview?.reviewedBy).toContain('1b2baeef');
    expect(p.adjudications).toHaveLength(count);
    for (const part of p.parts) {
      const review = p.adjudications.find(a => a.partId === part.id)!;
      expect(review.outcome).toBe('supported');
      expect(review.evidenceDigest).toBe(compoundPartDigest(p, part.id));
    }
  });

  it('requires the VLA nine-source population rather than another article’s references', () => {
    const p = plan('vla-models', 21);
    expect(p.kind).toBe('frontmatter-p1');
    expect(p.parts.flatMap(p => p.requiredCitationIds).sort()).toEqual([...declared['vla-models']].sort());
    expect(p.parts).toHaveLength(9);
    expect(row('vla-models', 21).sourceChecked).toContain('no new retrieval');
    expect(row('vla-models', 21).note).toContain('294');
    const fewer = { ...declared, 'vla-models': declared['vla-models'].slice(0, -1) };
    expect(row('vla-models', 21, plans, ledger, fewer).evidenceFailures.length).toBeGreaterThan(0);
  });

  it('requires all 21 comparison identities independently of both scientific parts', () => {
    const p = plan('comparison-matrix', 1);
    const actual = new Set([...METHODS.flatMap(m => m.sources), ...[...article.matchAll(/<Cite\s+id="([^"]+)"/g)].map(m => m[1])]);
    expect(actual.size).toBe(21);
    expect(actual).toEqual(new Set(declared['comparison-matrix']));
    expect(new Set(p.parts.filter(p => p.id.startsWith('identity-')).flatMap(p => p.requiredCitationIds))).toEqual(actual);
    expect(p.parts.filter(p => p.id.startsWith('identity-'))).toHaveLength(21);
    expect(p.parts.filter(p => p.id.startsWith('intro-')).map(p => p.id)).toEqual(['intro-rt2-serving', 'intro-openvla-inference']);
    expect(p.parts.some(p => p.id === 'intro-scopes')).toBe(false);
  });

  it('keeps rate, model, precision, hardware and serving qualifications together', () => {
    const p = plan('comparison-matrix', 1);
    const rt = p.evidence.find(e => e.partId === 'intro-rt2-serving')!;
    const ov = p.evidence.find(e => e.partId === 'intro-openvla-inference')!;
    for (const text of ['55B', '5B', '1-3 Hz', 'around 5 Hz', 'multi-TPU cloud service', 'over the network']) expect(rt.supportingPassage).toContain(text);
    for (const text of ['bfloat16', 'approximately 6Hz', '4090', 'without compilation, speculative decoding']) expect(ov.supportingPassage).toContain(text);
    expect(rt.sourceUrl).toBe('https://arxiv.org/html/2307.15818v1');
    expect(ov.sourceUrl).toBe('https://arxiv.org/html/2406.09246v3');
    expect(article).toContain(currentIntro);
  });

  it.each(selected)('fails on every missing part, absent review or changed tuple for %s', (slug, ordinal) => {
    const p = plan(slug, ordinal);
    expect(p).toBeDefined();
    for (const part of p.parts) {
      const changed = structuredClone(plans);
      plan(slug, ordinal, changed).evidence = p.evidence.filter(e => e.partId !== part.id);
      expect(row(slug, ordinal, changed).evidenceFailures.length).toBeGreaterThan(0);
    }
    const unreviewed = structuredClone(plans);
    plan(slug, ordinal, unreviewed).planReview = null;
    expect(row(slug, ordinal, unreviewed).evidenceFailures.length).toBeGreaterThan(0);
    const changed = ledger.replace(`| ${row(slug, ordinal).claim} |`, `| ${row(slug, ordinal).claim} UNIVERSAL |`);
    expect(row(slug, ordinal, plans, changed).evidenceFailures.length).toBeGreaterThan(0);
  });

  it('does not certify the old local table/filter claim with the new evidence', () => {
    expect(article).not.toContain(oldIntro);
    const old = row('comparison-matrix', 1, oldPlans, before('audit/manipulation.md'));
    expect(old.verdict).toBe('unresolved');
    const restored = ledger.replace(`| ${row('comparison-matrix', 1).claim} |`, `| ${old.claim} |`);
    expect(row('comparison-matrix', 1, plans, restored).evidenceFailures).toContain('compound original-cell digest is stale');
  });

  it('preserves unselected rows/plans and archives the exact old selected objects', { timeout: 60_000 }, () => {
    const chosen = (p: CompoundPlan) => selected.some(([slug, n]) => p.articleSlug === slug && p.rowOrdinal === n && p.ledgerPath === 'audit/manipulation.md');
    const packetPlans = preservedCompoundPacket('89cda67');
    expect(packetPlans).toHaveLength(oldPlans.length + 1);
    expect(packetPlans.filter(p => !chosen(p))).toEqual(oldPlans.filter(p => !chosen(p)));
    const laterIds = finalSevenPriorPlans().filter(p => !packetPlans.some(old => old.id === p.id)).map(p => [p.articleSlug, p.rowOrdinal]);
    expect(laterIds).toEqual([['data-bottleneck', 3], ['data-bottleneck', 5], ['scene-representation', 10]]);
    preservedLegacySurvivors(finalSevenPriorPlans(), plans);
    const old = parse(oldPlans, before('audit/manipulation.md'));
    const current = parse();
    for (const section of old) section.claimRecords.forEach((record, i) => {
      if (section.slug === 'generalist-policies' && i === 18) {
        const archived = JSON.parse(read('audit/evidence/crossdomain-closure-20260923/row-history.json')).rows[0].currentCells;
        const now = parseLedger('audit/manipulation.md', ledger, ids, currentAuditContext())
          .find(s => s.slug === section.slug)!.claimRecords[i];
        expect(archived.verdict).toBe('UNRESOLVED (bounded local-text correction only; external-passage requirement remains unmet)');
        const history = archived.note.match(/^Historical four-cell record retained: (.+) Correction rationale:/);
        expect(history).not.toBeNull();
        expect(originalClaimDigest(JSON.parse(history![1]))).toBe(originalClaimDigest(record));
        expect(parse(oldPlans, read('audit/evidence/crossdomain-closure-20260923/before-audit--manipulation.md.txt'))
          .find(s => s.slug === section.slug)!.claimRecords[i].evidenceFailures.length).toBeGreaterThan(0);
        expect(now.verdict).toBe('C');
        expect(now.evidenceFailures).toEqual([]);
      } else if (!selected.some(([slug, n]) => slug === section.slug && n === i + 1)) {
        expect(current.find(s => s.slug === section.slug)!.claimRecords[i]).toEqual(record);
      }
    });
    const history = JSON.parse(ledger.split('## Historical: VLA and comparison P1 correction 2026-09-22')[1].split('```json\n')[1].split('\n```')[0]) as {
      records: Array<{ rowOrdinal: number; articleSlug: string; previousCells: Record<string, string>; previousPlan: CompoundPlan | null }>;
    };
    for (const [slug, n] of selected) {
      const h = history.records.find(r => r.articleSlug === slug && r.rowOrdinal === n)!;
      const oldRow = row(slug, n, oldPlans, before('audit/manipulation.md'));
      expect(h.previousCells).toEqual(Object.fromEntries(['claim', 'sourceChecked', 'verdict', 'note'].map(k => [k, oldRow[k as keyof typeof oldRow]])));
      expect(h.previousPlan).toEqual(plan(slug, n, oldPlans) ?? null);
    }
  });

  it('appends exactly the changed native article members, retaining the approval prefix', () => {
    const prior = JSON.parse(before('contract/brand-v2-approved-deltas.json')).entries;
    const current = JSON.parse(read('contract/brand-v2-approved-deltas.json')).entries;
    const atTransaction = committedJson<{ entries: typeof current }>(transaction, 'contract/brand-v2-approved-deltas.json').entries;
    expect(prior).toHaveLength(1008);
    expect(preservedApprovalPacket(base)).toEqual(prior);
    preservedApprovalPacket('89cda67');
    const added = current.filter((entry: { id: string }) => entry.id.startsWith('vla-comparison-p1-20260922-')) as Array<{ manifest: string; memberId: string; oldHash: string; newHash: string; ownerApproval: string }>;
    expect(atTransaction.slice(0, prior.length)).toEqual(prior);
    expect(added).toEqual(atTransaction.slice(prior.length));
    const expected = [
      ['prose', 'article:manipulation/comparison-matrix', 'fa7b5f5bce9692dbfa6ada8526a7d3930b6dc43e43de8c83c9157e7e9d434178'],
      ['relationships', 'article:manipulation/comparison-matrix', '179a093b41ad6ac10221f56590165292c7d160665b1b9bc17b49bd7e8a7565fa'],
    ];
    expect(added).toHaveLength(expected.length);
    const truth = collectArticleTruthManifests();
    expect(headReanchorFor(current, 'article-metadata', 'citation-rendering:label-and-meta')?.newHash)
      .toBe(truth['article-metadata'].members.find(m => m.id === 'citation-rendering:label-and-meta')?.hash);
    expect(atTransaction.find((a: { id: string }) => a.id === 'generalist-attribution-p1-20260922-4')?.newHash)
      .toBe('40f4007276443c40512e8a7ad8ab461aec51eacf8f9a372f99c0e2a36563d3ef');
    for (const [manifest, memberId, oldHash] of expected) {
      const a = added.find(a => a.manifest === manifest && a.memberId === memberId)!;
      expect(a.oldHash).toBe(oldHash);
      const merged = current.findLast((entry: { id: string; manifest: string; memberId: string }) =>
        entry.id.startsWith('continuation-merge-2026-09-23-') && entry.manifest === manifest && entry.memberId === memberId);
      expect(merged).toBeDefined();
      // Later approved work (the 20260925 humanizer pass among others) may
      // re-anchor this member; the head re-anchor must hold the live hash.
      const head = headReanchorFor(current, manifest as 'prose', memberId);
      expect(head?.newHash).toBe(Object.values(truth).find(m => m.kind === manifest)?.members.find(m => m.id === memberId)?.hash);
      expect(a.ownerApproval).toContain('convergence-vla-comparison-p1-integration-20260922/authorization.json');
    }
  });
});
