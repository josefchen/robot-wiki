import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { CITATIONS, getCitation } from '@/data/citations';
import { parseLedger, originalClaimDigest } from '@/lib/audit-ledger';

const source = readFileSync('content/manipulation/diffusion-policy.mdx', 'utf8');
const ledger = readFileSync('audit/manipulation.md', 'utf8');
const canonical = ['diffusion-policy-2023', 'diffusion-policy-2023-v1', 'diffuser-2022',
  'act-aloha-2023', 'consistency-policy-2024', 'one-step-diffusion-2024',
  'octo-2024', 'pi0-2024', 'real-time-chunking-2025'];

describe('authorized Diffusion Policy current-claim corrections', () => {
  it('keeps one complete current record per original DP identity', () => {
    const section = parseLedger('audit/manipulation.md', ledger,
      new Set(CITATIONS.map(c => c.id)), {
        compoundPlans: JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')),
        articleCitations: { 'diffusion-policy': matter(source).data.citations },
      }).find(s => s.slug === 'diffusion-policy')!;
    expect(section.claimRows).toBe(25);
    expect(section.claimRecords.filter(r => r.evidenceFailures.length === 0)).toHaveLength(25);
    expect(section.claimRecords[2].verdict).toBe('cut');
    expect(section.claimRecords[2].note).toContain('not evidence of universal absence');
    const marker = /<!-- current-claim-history-20260907\n([\s\S]*?)\n-->/;
    const history = JSON.parse(marker.exec(ledger)![1]);
    expect(history).toHaveLength(12);
    for (const h of history) {
      expect(originalClaimDigest(h.original)).toBe(h.originalCellsDigest);
      const current = section.claimRecords[h.rowOrdinal - 1];
      expect(originalClaimDigest(current)).toBe(h.currentCellsDigest);
      expect(current.claim).toBe(h.current.claim);
    }
  });
  it('binds nine canonical works and preserves the review date', () => {
    expect(matter(source).data.citations).toEqual(canonical);
    expect(matter(source).data.lastReviewed).toBe('2026-08-17');
    expect(source).toContain('single- and multi-task benchmarks');
    expect(source).not.toContain('is exactly what Octo');
    expect(source).toContain('10 / 16');
    expect(source).toContain('$T_a$');
  });
  it('distinguishes original DP, extended DP and the explicit Octo byline', () => {
    expect(getCitation('diffusion-policy-2023-v1')?.authors).toHaveLength(7);
    expect(getCitation('diffusion-policy-2023-v1')?.url).toBe('https://arxiv.org/abs/2303.04137v1');
    expect(getCitation('diffusion-policy-2023')?.authors).toHaveLength(8);
    expect(getCitation('diffusion-policy-2023')?.venue).toBeUndefined();
    expect(getCitation('octo-2024')?.authors).toHaveLength(20);
    expect(getCitation('octo-2024')?.authors.slice(8, 11)).toEqual(['Tobias Kreiman', 'Ria Doshi', 'Charles Xu']);
    expect(getCitation('octo-2024')?.url).toBe('https://arxiv.org/html/2405.12213v2');
    expect(getCitation('diffuser-2022')?.venue).toBe('ICML 2022');
  });
});

it('TD3 states reduction rather than elimination and preserves its citation', () => {
  const rl = readFileSync('content/rl-sim2real/rl-for-robotics.mdx', 'utf8');
  expect(rl).toContain('TD3 identified overestimation bias in DDPG and reduced its effects with clipped double critics, delayed policy updates and target policy smoothing <Cite id="td3-2018" />');
  expect(rl).not.toContain('TD3 diagnosed the overestimation bias that made DDPG unstable and fixed it');
});
