import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { accumulatedCost, simulateDeviation } from '@/lib/compounding-error';
import { CITATIONS } from '@/data/citations';
import { parseLedger } from '@/lib/audit-ledger';
import matter from 'gray-matter';

const article = readFileSync('content/manipulation/bc-foundations.mdx', 'utf8');
const component = readFileSync('components/interactive/compounding-error.tsx', 'utf8');

describe('BC source-backed corrections', () => {
  it('binds all fourteen original rows and the exact six-source P1 population', () => {
    const plans = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8'));
    const section = parseLedger(
      'audit/manipulation.md',
      readFileSync('audit/manipulation.md', 'utf8'),
      new Set(CITATIONS.map((c) => c.id)),
      { compoundPlans: plans, articleCitations: { 'bc-foundations': matter(article).data.citations } },
    ).find((s) => s.slug === 'bc-foundations')!;
    expect(section.claimRecords).toHaveLength(14);
    expect(section.unevidencedRows).toEqual([]);
    expect(section.unresolvedRows).toEqual([]);
    expect(section.claimRecords[13].compound?.evidence).toHaveLength(8);
    const blog = CITATIONS.find((c) => c.id === 'pistar06-blog-2025')!;
    expect(blog.authors).toHaveLength(55);
    expect(blog.authors).toContain('Gashon Hussein');
    expect(blog.authors).not.toContain('Gashun Hussein');
    expect(CITATIONS.find((c) => c.id === 'hg-dagger-2019')?.venue).toBe('arXiv v2 (11 March 2019)');
    expect(CITATIONS.find((c) => c.id === 'alvinn-1988')?.year).toBe(1988);
  });

  it('preserves the BC definition while distinguishing ALVINN simulation training', () => {
    expect(article).toContain('record what an expert did');
    expect(article).toContain('camera and laser-range inputs');
    expect(article).toContain('trained on simulated road images');
    expect(article).toContain('proposed future work');
  });

  it('states the conditional existential theorem with true and empirical losses distinct', () => {
    expect(article).toContain('\\varepsilon_N');
    expect(article).toContain('\\hat{\\varepsilon}_N');
    expect(article).toContain('infinite-sample');
    expect(article).toContain('strongly convex');
    expect(article).toContain('it promises no improvement for any particular iterate');
    expect(article).toContain('$u$ can be $O(T)$');
    expect(article).not.toContain('mismatch that drives compounding error shrinks each iteration');
  });

  it('narrows multimodality and HG-DAgger to their documented mechanisms', () => {
    expect(article).toContain('learns both modes');
    expect(article).not.toContain('heads were built to solve');
    expect(article).toContain('uninterrupted control');
    expect(article).not.toContain('variant that survives in practice');
  });

  it('labels the unchanged toy as an illustration, not analytic regret bounds', () => {
    expect(component).toContain('not a task-cost theorem');
    expect(component).not.toContain('analytic regret bounds');
    expect(component).toContain('illustrative reference curves');
    expect(article).toContain('neither a source benchmark nor a task-cost theorem');
    const params = { epsilon: 0.05, mode: 'per-step' as const, chunkSize: 25, dagger: false };
    const cost = (steps: number) => accumulatedCost(simulateDeviation({ ...params, steps }));
    expect(Math.round(cost(120))).toBe(370);
    expect(Math.round(cost(240))).toBe(1505);
    expect(cost(240) / cost(120)).toBeGreaterThan(4);
    expect(cost(240) / cost(120)).toBeLessThan(4.1);
  });
});
