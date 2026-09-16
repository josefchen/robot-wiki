import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
    expect(plans.filter((p) => p.ledgerPath === 'audit/data-hardware.md' && p.articleSlug === 'data-bottleneck')).toHaveLength(12);
    for (const id of PLAN_IDS) {
      expect(plans.some((p) => p.id === id)).toBe(true);
      expect(ledger.includes(id)).toBe(true);
    }
    expect(plans).toHaveLength(684);
  });

  it('held rows 3 (OXE) and 5 (DROID) stay byte-untouched in the evidence-column shape', () => {
    const ledger = readFileSync(LEDGER, 'utf8');
    expect(ledger).toContain(HELD_ROW_3);
    expect(ledger).toContain(HELD_ROW_5);
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
    expect(deltas.entries).toHaveLength(758);
    const mine = deltas.entries.filter((e) => /^db-r\d+-20260915-1$/.test(e.id));
    expect(mine).toHaveLength(12);
    for (const e of mine) expect(e.oldHash).toBe(e.newHash);
  });
});
