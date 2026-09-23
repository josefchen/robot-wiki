/**
 * Red-first coverage for the 2026-09-15 hardware-taxonomy integration
 * (frozen packet convergence-source-c-hardware-taxonomy-20260915, zero
 * retrieval): the 21 applied originals (ordinals 1-20 and 25) must bind
 * exact compound-evidence plans whose paired evidence items name
 * registered citation ids, complete uncredentialed HTTP(S) URLs and
 * substantive passages needle-verified against the retained sha-verified
 * fetches. Ordinal 25 is the local-AND arithmetic row: its plan pairs the
 * integrator-executed 314.4/19.0 proof with row 21's retained vla-perf
 * Table 3 endpoints. The two article endpoints (SO-101 BOM price span,
 * Figure 03 sale-model span) must be applied exactly, and the already
 * complete performance-worldmodels rows 21-24 plus the out-of-scope
 * teleop-rigs rows must be untouched.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCompoundPlans, originalClaimDigest } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

const root = join(__dirname, '..', '..');
const ledger = readFileSync(join(root, 'audit/data-hardware.md'), 'utf8');
const article = readFileSync(join(root, 'content/data-hardware/hardware-taxonomy.mdx'), 'utf8');
const plans = parseCompoundPlans(
  JSON.parse(readFileSync(join(root, 'audit/compound-evidence.json'), 'utf8')),
);
const registryIds = new Set(CITATIONS.map(({ id }) => id));

const APPLIED: ReadonlyArray<{
  readonly ordinal: number;
  readonly planId: string;
  readonly citations: readonly string[];
}> = [
  { ordinal: 1, planId: 'hardware-taxonomy-r1-tros-price-widowx-20260915', citations: ['trossen-ai-2026'] },
  { ordinal: 2, planId: 'hardware-taxonomy-r2-tros-canfd-20260915', citations: ['trossen-ai-2026'] },
  { ordinal: 3, planId: 'hardware-taxonomy-r3-widowx-spec-20260915', citations: ['trossen-ai-2026'] },
  { ordinal: 4, planId: 'hardware-taxonomy-r4-so101-follower-bom-20260915', citations: ['so-arm100-repo-2026'] },
  { ordinal: 5, planId: 'hardware-taxonomy-r5-seeed-price-row-20260915', citations: ['seeed-so-arm101-pro-2026'] },
  { ordinal: 6, planId: 'hardware-taxonomy-r6-issue-pricing-rows-20260915', citations: ['lerobot-pricing-2026'] },
  { ordinal: 7, planId: 'hardware-taxonomy-r7-robo-13k-20260915', citations: ['robozaps-humanoids-2026'] },
  { ordinal: 8, planId: 'hardware-taxonomy-r8-g1-price-hero-20260915', citations: ['unitree-g1-2026'] },
  { ordinal: 9, planId: 'hardware-taxonomy-r9-h2-price-table-20260915', citations: ['unitree-h2-2026'] },
  { ordinal: 10, planId: 'hardware-taxonomy-r10-robo-neo-price-20260915', citations: ['1x-neo-2026', 'robozaps-humanoids-2026'] },
  { ordinal: 11, planId: 'hardware-taxonomy-r11-neo-compute-20260915', citations: ['1x-neo-2026'] },
  { ordinal: 12, planId: 'hardware-taxonomy-r12-robo-shakeout-20260915', citations: ['robozaps-humanoids-2026'] },
  { ordinal: 13, planId: 'hardware-taxonomy-r13-atlas-spec-20260915', citations: ['bd-atlas-2026', 'robozaps-humanoids-2026'] },
  { ordinal: 14, planId: 'hardware-taxonomy-r14-fig-palm-20260915', citations: ['figure-03-2025'] },
  { ordinal: 15, planId: 'hardware-taxonomy-r15-leaabs-cost-20260915', citations: ['leap-hand-2023'] },
  { ordinal: 16, planId: 'hardware-taxonomy-r16-droid-rig-20260915', citations: ['agibot-world-2025', 'droid-2024'] },
  { ordinal: 17, planId: 'hardware-taxonomy-r17-tact-framework-20260915', citations: ['tactile-outlook-2025'] },
  { ordinal: 18, planId: 'hardware-taxonomy-r18-tact-prices-20260915', citations: ['tactile-outlook-2025'] },
  { ordinal: 19, planId: 'hardware-taxonomy-r19-meta-taxels-20260915', citations: ['meta-fair-touch-2024'] },
  { ordinal: 20, planId: 'hardware-taxonomy-r20-nvidia-summary-20260915', citations: ['jetson-thor-2026'] },
  { ordinal: 25, planId: 'hardware-taxonomy-r25-local-proof-20260915', citations: ['vla-perf-2026'] },
];

const byId = new Map(plans.map((plan) => [plan.id, plan]));

function ledgerRow(ordinal: number): string[] {
  const section = ledger.split(/^### hardware-taxonomy\.mdx$/m)[1]?.split(/^### /m)[0] ?? '';
  const rows = section
    .split('\n')
    .filter((line) => line.trim().startsWith('|') && !/^\|[\s:|-]+\|$/.test(line.trim()))
    .slice(1);
  const raw = rows[ordinal - 1].trim().slice(1, -1);
  return raw.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, '|').trim());
}

describe('hardware-taxonomy 2026-09-15 integration', () => {
  it('binds every applied original to its exact compound plan', () => {
    for (const { ordinal, planId } of APPLIED) {
      const plan = byId.get(planId);
      expect(plan, planId).toBeDefined();
      expect(plan!.ledgerPath).toBe('audit/data-hardware.md');
      expect(plan!.articleSlug).toBe('hardware-taxonomy');
      expect(plan!.rowOrdinal).toBe(ordinal);
      expect(plan!.kind).toBe('explicit-parts');
      const row = ledgerRow(ordinal);
      expect(row[7], `row ${ordinal} evidence-plan cell`).toBe(planId);
      expect(row[4]).toBe('');
      expect(row[5]).toBe('');
      expect(row[6]).toBe('');
      expect(originalClaimDigest({
        claim: row[0], sourceChecked: row[1], verdict: row[2], note: row[3],
      })).toBe(plan!.originalCellsDigest);
    }
  });

  it('carries registered citations, complete URLs and substantive passages in every plan', () => {
    for (const { planId, citations } of APPLIED) {
      const plan = byId.get(planId)!;
      expect(citations.every((id) => registryIds.has(id)), planId).toBe(true);
      const required = plan.parts.flatMap((part) =>
        part.requiredCitationIds.map((id) => JSON.stringify([part.id, id])));
      const supplied = plan.evidence.map((item) => JSON.stringify([item.partId, item.citationId]));
      expect(supplied.sort(), planId).toEqual([...new Set(supplied)].sort());
      for (const pair of required) expect(supplied, planId).toContain(pair);
      for (const item of plan.evidence) {
        expect(item.citationId, planId).not.toBe('');
        expect(registryIds.has(item.citationId), `${planId} ${item.citationId}`).toBe(true);
        expect(item.sourceUrl, planId).toMatch(/^https?:\/\/[^\s@]+$/);
        expect(item.supportingPassage.trim().length, planId).toBeGreaterThan(8);
      }
      expect(plan.planReview?.planDigest, planId).toBeTruthy();
      for (const review of plan.adjudications) {
        expect(review.outcome, `${planId} ${review.partId}`).toBe('supported');
      }
      expect(plan.adjudications.map((r) => r.partId).sort(), planId)
        .toEqual(plan.parts.map((p) => p.id).sort());
    }
  });

  it('keeps vendor prices exactly as the fetched pages print them', () => {
    const r1 = ledgerRow(1)[0];
    for (const price of ['\\$4,545.95', '\\$11,385.95', '\\$23,995.95', '\\$33,695.95']) {
      expect(r1).toContain(price);
    }
    const r5 = ledgerRow(5);
    expect(r5[0]).toContain('\\$295');
    expect(r5[0]).toContain('\\$299');
    const r9 = ledgerRow(9)[0];
    expect(r9).toContain('\\$29,900');
  });

  it('applies the two article endpoints exactly', () => {
    expect(article).toContain('totals \\$121.94 in the US column, \\$110.94 of that in core parts');
    expect(article).not.toContain('about \\$100 in core parts and \\$122 including the US accessory list');
    expect(article).toContain('Figure builds it for high-volume manufacturing at its BotQ facility');
    expect(article).not.toContain('not for individual sale');
  });

  it('F20: dates the NEO hand announcement without claiming a shipping configuration', () => {
    // The retained official related-post card says JUL 09 '26; its embedded
    // neos-hands post date is 2026-07-09T14:00:00.000Z. This is not the
    // World Model Lab announcement's own June date or a product-page date.
    expect(article).toContain('a 25-DoF revision was announced on July 9, 2026');
    expect(article).not.toContain('announced on July 9 <Cite');
    expect(article).toContain('the order page lists 22 DoF per hand');
    expect(article).toContain("The NEO's hands carry 22 DoF each, with the 25-DoF revision on the way");
  });

  it('F20: cites and declares the retained official announcement-bearing response', () => {
    expect(article).toContain(
      'July 9, 2026 <Cite id="1x-neo-2026" /> <Cite id="1x-world-model-lab-2026" />.',
    );
    expect(article.match(/^  - 1x-world-model-lab-2026$/gm)).toHaveLength(1);
    expect(article.match(/<Cite id="1x-world-model-lab-2026" \/>/g)).toHaveLength(1);
    expect(CITATIONS.find(({ id }) => id === '1x-world-model-lab-2026')?.url)
      .toBe('https://www.1x.tech/discover/1x-world-model-lab');
  });

  it('proves the local-AND row from local arithmetic over retained Table 3 endpoints', () => {
    const ratio = 314.4 / 19.0;
    expect(ratio).toBeCloseTo(16.54736842105263, 10);
    expect(Math.floor(ratio)).toBe(16);
    const row = ledgerRow(25);
    expect(row[0]).toContain('Sixteen times the throughput across the range');
    expect(row[1]).toContain('314.4 / 19.0');
    const plan = byId.get('hardware-taxonomy-r25-local-proof-20260915')!;
    const passage = plan.evidence.map((item) => item.supportingPassage).join(' ');
    expect(passage).toContain('19.0 Hz');
    expect(passage).toContain('314.4 Hz');
  });

  it('leaves the complete performance-worldmodels rows and teleop-rigs rows untouched', () => {
    for (const id of [
      'performance-worldmodels-hardware-taxonomy-21-20260908',
      'performance-worldmodels-hardware-taxonomy-22-20260908',
      'performance-worldmodels-hardware-taxonomy-23-20260908',
      'performance-worldmodels-hardware-taxonomy-24-20260908',
    ]) {
      expect(byId.has(id), id).toBe(true);
      const row = ledgerRow(byId.get(id)!.rowOrdinal);
      expect(row[7]).toBe(id);
    }
    const teleop = ledger.split(/^### teleop-rigs\.mdx$/m)[1]?.split(/^### /m)[0] ?? '';
    const trossenTeleop = teleop.split('\n').find((line) => line.includes('Trossen AI prices and 500 Hz'));
    // Untouched by the hardware-taxonomy lane itself: the verdict cell still
    // carries this lane's price-cut correction. The 2026-09-16 teleop-rigs
    // evidence completion later added the evidence columns and plan binding,
    // so the row now has 8 populated cells (+2 outer-pipe empties) bound to teleop-rigs-3-trossen-ai-20260916.
    expect(trossenTeleop, 'teleop Trossen row keeps its correction verdict').toBeDefined();
    expect(trossenTeleop).toContain('C (same price-cut correction as hardware-taxonomy)');
    expect(trossenTeleop!.split(/(?<!\\)\|/).length).toBe(10); // 8 cells + 2 outer-pipe empties
    expect(trossenTeleop).toContain('teleop-rigs-3-trossen-ai-20260916');
  });
});
