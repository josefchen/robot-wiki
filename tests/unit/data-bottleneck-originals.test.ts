import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLedger, originalClaimDigest } from '@/lib/audit-ledger';
import { CITATIONS } from '@/data/citations';
import { currentAuditContext, finalSevenBefore, finalSevenPriorPlans } from '../helpers/residual-integration';
import { planPacket } from '../helpers/audit-plan-history';

const ROOT = join(__dirname, '..', '..');
const ARTICLE = join(ROOT, 'content', 'data-hardware', 'data-bottleneck.mdx');
const LEDGER = join(ROOT, 'audit', 'data-hardware.md');
const PLANS = join(ROOT, 'audit', 'compound-evidence.json');
const DELTAS = join(ROOT, 'contract', 'brand-v2-approved-deltas.json');

const PLAN_IDS = ["data-bottleneck-db1-gpt3-300b-20260915", "data-bottleneck-db2-llama-fineweb-20260915", "data-bottleneck-db4-agibot-counts-20260915", "data-bottleneck-db6-tri-ramen-20260915", "data-bottleneck-db7-egoscale-20260915", "data-bottleneck-db8-ego4d-20260915", "data-bottleneck-db9-egodex-20260915", "data-bottleneck-db10-lin-scaling-20260915", "data-bottleneck-db11-diversity-20260915", "data-bottleneck-db12-gapdecades-20260915", "data-bottleneck-db13-umi-20260915", "data-bottleneck-db14-agibot-30pct-20260915"];

const HELD_ROW_3 = "| OXE holds over a million trajectories across 22 robot embodiments; ~10,000 h is an estimate, flagged as such | open-x-embodiment-2023 (arXiv 2310.08864 HTML: \"1M+ robot trajectories from 22 robot embodiments\"; no hour count published anywhere in the paper, so the ~10k h figure stays flagged `estimated` in lib/data-scaling.ts) | V |  |  |  |  |  |";
const HELD_ROW_5 = "| DROID: 76,000 trajectories, 350 hours, 50 operators, 13 institutions, a full year | droid-2024 (arXiv 2403.12945 abs + HTML) | V |  |  |  |  |  |";

describe('data-bottleneck originals integration (packet b57e9e0d, 2026-09-15)', () => {
  it('gapDecades arithmetic holds from the article chart module\'s own operands', () => {
    // components/interactive/data-scale-chart.tsx:162, operands from
    // lib/data-scaling.ts (llama3 1.5e13, egoscale 20_854).
    expect(Math.log10(1.5e13 / 20854)).toBeCloseTo(8.85690188985079, 10);
    expect(Math.round(Math.log10(1.5e13 / 20854))).toBe(9);
    expect(readFileSync(ARTICLE, 'utf8')).toContain('nine orders of magnitude apart');
  });

  it('AgiBot derived per-trajectory duration matches the published operands', () => {
    expect((2976.4 * 3600) / 1001552).toBeCloseTo(10.698436027285652, 10);
    expect(Math.round(((2976.4 * 3600) / 1001552) * 10) / 10).toBe(10.7);
  });

  it('all 12 evidence plans are registered and referenced by the ledger', () => {
    const ledger = readFileSync(LEDGER, 'utf8');
    const plans = JSON.parse(readFileSync(PLANS, 'utf8')) as Array<{ id: string; ledgerPath: string; articleSlug: string }>;
    expect(plans.filter((p) => p.ledgerPath === 'audit/data-hardware.md' && p.articleSlug === 'data-bottleneck').map(p => p.id)).toEqual(PLAN_IDS);
    expect(finalSevenPriorPlans().filter(p => p.ledgerPath === 'audit/data-hardware.md' && p.articleSlug === 'data-bottleneck')).toHaveLength(14);
    const selected = plans.filter((p) => p.ledgerPath === 'audit/data-hardware.md' && p.articleSlug === 'data-bottleneck');
    // Originals 3/5 now use typed local proof, not invented compound plans.
    expect(selected.map((p) => p.id).sort()).toEqual([...PLAN_IDS].sort());
    for (const id of PLAN_IDS) {
      expect(plans.some((p) => p.id === id)).toBe(true);
      expect(ledger.includes(id)).toBe(true);
    }
    // Earlier plans migrated to typed local evidence; this packet stays contiguous.
    expect(planPacket(plans, PLAN_IDS).map(p => p.id)).toEqual(PLAN_IDS);
    expect(new Set(plans.map((plan) => plan.id)).size).toBe(plans.length);
  });

  it('preserves both unresolved corrections and verifies their later typed closures', () => {
    const ledger = readFileSync(LEDGER, 'utf8');
    const plans = finalSevenPriorPlans();
    const ids = new Set(CITATIONS.map(c => c.id));
    const section = parseLedger('audit/data-hardware.md', finalSevenBefore('audit/data-hardware.md'), ids, { compoundPlans: plans })
      .find((entry) => entry.slug === 'data-bottleneck')!;
    const current = parseLedger('audit/data-hardware.md', ledger, ids, currentAuditContext())
      .find(entry => entry.slug === 'data-bottleneck')!;
    expect(section.claimRecords).toHaveLength(14);
    const local = JSON.parse(readFileSync('audit/local-basis.json', 'utf8')) as {
      plans: Array<{ id: string; originalId: string; originalBinding: { originalTupleDigest: string };
        currentTupleDigest: string; evidence: Array<{ citationId: string; sourceUrl: string; supportingPassage: string }> }>;
    };
    for (const ordinal of [3, 5]) {
      const record = section.claimRecords[ordinal - 1];
      expect(record.verdict).toMatch(/^UNRESOLVED/);
      expect(record.outcome).toBe('unresolved');
      expect(record.compound?.adjudicationFailures.length).toBeGreaterThan(0);
      const plan = plans.find((p) => p.id === record.compound?.planId)!;
      expect(plan.planReview).toBeNull();
      expect(plan.adjudications).toEqual([]);
      expect(plan.originalCellsDigest).toBe(originalClaimDigest(record));
      const now = current.claimRecords[ordinal - 1];
      expect(now.localBasis?.planId).toBe(`final-seven-data-hardware-data-bottleneck-${ordinal}-20260923`);
      expect(now.outcome).toBe('passing');
      expect(now.evidenceFailures).toEqual([]);
    {
      const record = parseLedger('audit/data-hardware.md', ledger, ids)
        .find(s => s.slug === 'data-bottleneck')!.claimRecords[ordinal - 1];
      const plan = local.plans.find(p => p.originalId === `audit/data-hardware.md:data-bottleneck:${ordinal}`)!;
      expect(plan.id).toBe(`final-seven-data-hardware-data-bottleneck-${ordinal}-20260923`);
      expect(plan.currentTupleDigest).toBe(originalClaimDigest(record));
      expect(plan.evidence.some(e => e.sourceUrl.startsWith('https://') && e.supportingPassage.length > 60)).toBe(true);
      expect(record.verdict).toBe('C');
      // This deliberately context-free parser cannot certify a typed plan;
      // it must not silently grant scalar completion credit.
      expect(record.evidenceFailures).toContain('compound Evidence plan is missing; scalar evidence cannot certify this batch');
    }
    }
    const historyBody = ledger.split('<!-- data-bottleneck-zero-credit-truth-repair-20260922 -->')[1];
    const history = JSON.parse(historyBody.match(/```json\n([\s\S]*?)\n```/)![1]) as Array<{
      originalId: string; beforeLedgerLine: string; beforeTupleDigest: string; completed: boolean;
    }>;
    expect(history.map((h) => h.beforeLedgerLine)).toEqual([HELD_ROW_3, HELD_ROW_5]);
    expect(history.map((h) => h.beforeTupleDigest)).toEqual([
      '358421f161ca94df1ae8b8c62a926894fb409aeb79bf2e9479b74e5f61ec7647',
      '20650ba68698303275a092afd6efb029284517d375afca1727b0e5740a857527',
    ]);
    expect(history.every((h) => h.completed === false)).toBe(true);
    for (const ordinal of [3, 5]) {
      const originalId = `audit/data-hardware.md:data-bottleneck:${ordinal}`;
      const plan = local.plans.find(p => p.originalId === originalId)!;
      expect(plan.originalBinding.originalTupleDigest).toBe(history.find(h => h.originalId === originalId)!.beforeTupleDigest);
    }
  });

  it('the 12 bound plans carry integrator plan review and all-supported per-part adjudications', () => {
    const plans = JSON.parse(readFileSync(PLANS, 'utf8')) as Array<{
      id: string; parts: Array<{ id: string }>; planReview: unknown;
      adjudications: Array<{ partId: string; outcome: string }>;
    }>;
    const mine = plans.filter((p) => PLAN_IDS.includes(p.id));
    expect(mine).toHaveLength(12);
    for (const plan of mine) {
      expect(plan.planReview).toBeTruthy();
      const partIds = plan.parts.map((part) => part.id);
      expect(plan.adjudications.map((a) => a.partId).sort()).toEqual([...partIds].sort());
      for (const a of plan.adjudications) expect(a.outcome).toBe('supported');
    }
  });

  it('approved deltas carry the 12 new approval entries against the unchanged prose hash', () => {
    const deltas = JSON.parse(readFileSync(DELTAS, 'utf8')) as { entries: Array<{ id: string; oldHash: string; newHash: string }> };
    // Append-only ledger: pin the packet's slot at 691..702, not the total.
    expect(
      deltas.entries.slice(691, 703).map((e) => e.id),
    ).toEqual(
      [1, 2, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((row) => `db-r${row}-20260915-1`),
    );
    expect(new Set(deltas.entries.map((entry) => entry.id)).size).toBe(deltas.entries.length);
    const mine = deltas.entries.filter((e) => /^db-r\d+-20260915-1$/.test(e.id));
    expect(mine).toHaveLength(12);
    for (const e of mine) expect(e.oldHash).toBe(e.newHash);
  });
});


it('keeps the prediction exercise while separating source facts from assumptions', () => {
  const article = readFileSync(ARTICLE, 'utf8');
  expect(article).toContain('<PredictThenReveal');
  expect(article).toContain('answer="century-plus"');
  expect(article).toContain('defaultRigs={10} defaultRate="droid-measured"');
  expect(article).toContain('76,000 successful trajectories totaling 350 interaction hours');
  expect(article).toContain('Fifty data collectors used 18 robots across 13 institutions over 12 months');
  expect(article).toContain('roughly 16,000 unsuccessful trajectories');
  expect(article).toContain('authored hypothetical');
  expect(article).not.toMatch(/measured DROID rate|OXE-scale readout|Open X-Embodiment at an estimated 10,000/);
});
