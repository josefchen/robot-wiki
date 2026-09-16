import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const ARTICLE = join(ROOT, 'content', 'data-hardware', 'teleop-rigs.mdx');
const DATA = join(ROOT, 'data', 'teleop-rigs.ts');
const CITATIONS = join(ROOT, 'data', 'citations.ts');
const LEDGER = join(ROOT, 'audit', 'data-hardware.md');
const PLANS = join(ROOT, 'audit', 'compound-evidence.json');
const DELTAS = join(ROOT, 'contract', 'brand-v2-approved-deltas.json');

const PLAN_IDS = [
  'teleop-rigs-1-act-6tasks-20260916',
  'teleop-rigs-2-maloha-50demos-20260916',
  'teleop-rigs-3-trossen-ai-20260916',
  'teleop-rigs-5-gello-bom-20260916',
  'teleop-rigs-6-gello-userstudy-20260916',
  'teleop-rigs-7-gello-twin-20260916',
  'teleop-rigs-8-umi-rig-20260916',
  'teleop-rigs-9-umi-throughput-20260916',
  'teleop-rigs-10-umi-2min-20260916',
  'teleop-rigs-11-droid-fleet-20260916',
  'teleop-rigs-12-television-20260916',
  'teleop-rigs-13-bunny-visionpro-20260916',
];

// Row 4 (lerobot community estimate) was already complete and is excluded
// from the batch; its seven cells must survive the header change byte-exact.
const PROTECTED_ROW_4_HEAD =
  'The community issue in alpibrusl/lex-robot self-describes research in June 2026';

describe('teleop-rigs originals integration (packet 60d405ba, 2026-09-16)', () => {
  it('UMI local-AND conjunct arithmetic holds from the printed addends', () => {
    expect(73 + 298).toBe(371);
    // The paper prints the two addends, never the total.
    const article = readFileSync(ARTICLE, 'utf8');
    expect(article).toContain('bills the printed gripper at \\$73 and the GoPro plus accessories at \\$298');
    expect(article).toContain('for a \\$371 collection rig');
  });

  it('all 12 evidence plans are registered and referenced by the ledger', () => {
    const ledger = readFileSync(LEDGER, 'utf8');
    const plans = JSON.parse(readFileSync(PLANS, 'utf8')) as Array<{
      id: string;
      ledgerPath: string;
      articleSlug: string;
    }>;
    expect(
      plans.filter(
        (p) => p.ledgerPath === 'audit/data-hardware.md' && p.articleSlug === 'teleop-rigs',
      ),
    ).toHaveLength(12);
    for (const id of PLAN_IDS) {
      expect(plans.some((p) => p.id === id)).toBe(true);
      expect(ledger.includes(id)).toBe(true);
    }
    // The merged ledger keeps appending later packets; this packet's block
    // keeps its append slot at 672..683, so pin the slot, not a moving total.
    expect(plans.slice(672, 684).map((p) => p.id)).toEqual(PLAN_IDS);
  });

  it('the excluded row 4 stays byte-preserved in the section', () => {
    const ledger = readFileSync(LEDGER, 'utf8');
    expect(ledger).toContain(PROTECTED_ROW_4_HEAD);
    expect(ledger).toContain('~$17k–32k');
  });

  it('the 12 bound plans carry integrator review and all-supported adjudications', () => {
    const plans = JSON.parse(readFileSync(PLANS, 'utf8')) as Array<{
      id: string;
      parts: Array<{ id: string }>;
      planReview: unknown;
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

  it('12 approved-delta entries record the teleop prose member change', () => {
    const deltas = JSON.parse(readFileSync(DELTAS, 'utf8')) as {
      entries: Array<{ id: string; manifest: string; memberId: string }>;
    };
    // Append-only ledger: pin the packet's slot at 743..754, not the total.
    expect(
      deltas.entries.slice(743, 755).map((e) => e.id),
    ).toEqual(
      [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((row) => `tr-r${row}-20260916-1`),
    );
    const mine = deltas.entries.filter((e) => e.id.startsWith('tr-r') && e.id.endsWith('-20260916-1'));
    expect(mine).toHaveLength(12);
    for (const e of mine) {
      expect(e.manifest).toBe('prose');
      expect(e.memberId).toBe('article:data-hardware/teleop-rigs');
    }
  });

  it('the two packet-proposed citations are registered exactly once each', () => {
    const cit = readFileSync(CITATIONS, 'utf8');
    expect((cit.match(/id: 'umi-gripper-site-2024'/g) ?? []).length).toBe(1);
    expect((cit.match(/id: 'apple-visionpro-price-2024'/g) ?? []).length).toBe(1);
  });

  it('the corrected GELLO user-study wording replaces the overclaiming span', () => {
    const article = readFileSync(ARTICLE, 'utf8');
    expect(article).toContain('12 participants ran five tasks on a bimanual pair of UR5 arms');
    expect(article).not.toContain('five bimanual UR5 tasks');
    const data = readFileSync(DATA, 'utf8');
    expect(data).toContain('5 tasks on a bimanual pair of UR5 arms');
    expect(data).not.toContain('5 bimanual UR5 tasks');
  });

  it('site-sourced rates and the Apple price carry their own citations', () => {
    const article = readFileSync(ARTICLE, 'utf8');
    expect(article).toContain(
      '231 per hour for the unassisted human hand <Cite id="umi-gripper-site-2024" />',
    );
    expect(article).toContain(
      '(launch price \\$3,499 <Cite id="apple-visionpro-price-2024" />)',
    );
    expect(article).toContain('  - umi-gripper-site-2024\n');
    expect(article).toContain('  - apple-visionpro-price-2024\n');
    const data = readFileSync(DATA, 'utf8');
    expect(data).toContain("sources: ['umi-2024', 'umi-gripper-site-2024'],");
    expect(data).toContain(
      "sources: ['droid-2024', 'open-television-2024', 'bunny-visionpro-2024', 'apple-visionpro-price-2024'],",
    );
  });
});
