import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { committedJson } from '../helpers/editorial-current-context';

test('ACT reference example uses already-selected oldest-to-newest predictions', () => {
  const article = readFileSync(join(process.cwd(), 'content/manipulation/action-chunking.mdx'), 'utf8');
  expect(article).toContain('selected and ordered oldest-to-newest');
  expect(article).toContain('m: float = 0.01');
  expect(article).toContain('weights = np.exp(-m * np.arange(len(preds)))');
  // Independent closed-form oracle, not a production helper called twice.
  const q = Math.exp(-0.01);
  const expected = (10 * q + 20 * q * q) / (1 + q + q * q);
  const raw = [0, 1, 2].map((index) => Math.exp(-0.01 * index));
  const denominator = raw.reduce((sum, value) => sum + value, 0);
  const actual = raw.reduce((sum, value, index) => sum + value * [0, 10, 20][index], 0) / denominator;
  expect(actual).toBeCloseTo(9.933334444420371, 12);
  expect(actual).toBeCloseTo(expected, 12);
  expect(raw[0]).toBeGreaterThan(raw[2]);
  expect(article).toContain('nonzero occupancy filter');
});

test('the ACT SVG labels a separate illustrative m and oldest-first weights', () => {
  const svg = readFileSync(join(process.cwd(), 'public/images/temporal-ensembling.svg'), 'utf8');
  const weights = [...svg.matchAll(/<text[^>]*y="(68|96|124)"[^>]*>([^<]+)<\/text>/g)]
    .sort((a, b) => Number(a[1]) - Number(b[1])).map((match) => Number(match[2]));
  expect(weights).toEqual([1, 0.61, 0.37]);
  expect(svg).toContain('illustration m=0.5');
  expect(svg).toContain('reference m=0.01');
  expect(svg).toContain('divide by sum');
});


test('reversing the selected prediction order is a numeric counterexample', () => {
  const q = Math.exp(-0.01);
  const correct = (10 * q + 20 * q ** 2) / (1 + q + q ** 2);
  const reversed = (20 + 10 * q) / (1 + q + q ** 2);
  expect(correct).toBeCloseTo(9.933334444420371, 12);
  expect(reversed).toBeCloseTo(10.066665555579629, 12);
  expect(correct).toBeLessThan(10);
  expect(reversed).toBeGreaterThan(10);
  expect(reversed).not.toBeCloseTo(correct, 6);
});

test('prose, glossary, image metadata and source identity agree', async () => {
  const { getTerm } = await import('@/data/glossary');
  const { getImage } = await import('@/data/images');
  const { getCitation } = await import('@/data/citations');
  const article = readFileSync('content/manipulation/action-chunking.mdx', 'utf8');
  const term = getTerm('temporal-ensembling')!;
  const image = getImage('temporal-ensembling')!;
  expect(article).toContain('<Term id="temporal-ensembling">');
  expect(article).toContain('<Cite id="act-reference-2023" />');
  expect(article).toContain('**after selection**');
  expect(article).toContain('9.93333444');
  expect(article).not.toContain('older predictions are discounted');
  expect(article).not.toContain('issued i chunks ago');
  expect(term.definition).toContain('oldest retained prediction has the largest weight');
  expect(term.citations).toContain('act-reference-2023');
  expect(image.alt).toContain('1.00, 0.61, and 0.37');
  expect(image.caption).toContain('oldest gets the largest weight');
  expect(image.caption).toContain('divide by their sum');
  expect(image.alt).toContain('illustrative m=0.5');
  expect(image.caption).toContain('m=0.01, not 0.5');
  expect(getCitation('act-reference-2023')?.url).toBe('https://github.com/tonyzhaozh/act/blob/76cf30b4fed1d72dafbc3e1c270c0839d57e8bcf/imitate_episodes.py');
  expect(getCitation('act-reference-2023')?.authors).toEqual(['tonyzhaozh']);
  expect(article).toContain('lastReviewed: "2026-08-18"');
});

test('illustrative SVG geometry follows independently calculated raw weights', () => {
  const svg = readFileSync('public/images/temporal-ensembling.svg', 'utf8');
  const bars = [...svg.matchAll(/<rect x="490" y="(58|86|114)" width="(\d+)"[^>]*opacity="([\d.]+)"/g)]
    .sort((a, b) => Number(a[1]) - Number(b[1]));
  expect(bars).toHaveLength(3);
  expect(bars.map(b => Number(b[2]))).toEqual([0, 1, 2].map(i => Math.round(120 * Math.exp(-0.5 * i))));
  expect(bars.map(b => Number(b[3]))).toEqual([0.95, 0.65, 0.45]);
});

test('ACT preserves original row histories and requires all sixteen P1 identities', async () => {
  const { parseLedger, originalClaimDigest } = await import('@/lib/audit-ledger');
  const { CITATIONS } = await import('@/data/citations');
  const { default: matter } = await import('gray-matter');
  const ledger = readFileSync('audit/manipulation.md', 'utf8');
  const source = readFileSync('content/manipulation/action-chunking.mdx', 'utf8');
  const plans = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8'));
  const act = parseLedger('audit/manipulation.md', ledger, new Set(CITATIONS.map(c => c.id)), {
    compoundPlans: plans, articleCitations: { 'action-chunking': matter(source).data.citations },
  }).find(s => s.slug === 'action-chunking')!;
  expect(act.claimRows).toBe(32);
  // Later action-chunking packets completed the remaining originals; all 32
  // claim records now carry no evidence failures.
  expect(act.claimRecords.filter(r => !r.evidenceFailures.length)).toHaveLength(32);
  expect(act.claimRecords[13].citationId).toBe('act-reference-2023');
  expect(act.claimRecords[13].verdict).toBe('corrected');
  expect(act.claimRecords[31].verdict).toBe('corrected');
  expect(act.claimRecords[31].evidenceFailures).toEqual([]);
  const history = JSON.parse(/<!-- act-current-claim-history-20260907\n([\s\S]*?)\n-->/.exec(ledger)![1]);
  const closeout = JSON.parse(/## ACT current-claim correction history[\s\S]*?```json\n([\s\S]*?)\n```/.exec(ledger)![1]);
  expect(history).toHaveLength(2);
  for (const h of history) {
    expect(originalClaimDigest(h.original)).toBe(h.originalCellsDigest);
    if (h.rowOrdinal === 32) {
      expect(closeout.find((r: { rowOrdinal: number }) => r.rowOrdinal === 32).originalCellsDigest).toBe(h.currentCellsDigest);
    } else {
      expect(originalClaimDigest(act.claimRecords[h.rowOrdinal - 1])).toBe(h.currentCellsDigest);
    }
  }
  const p1 = plans.find((p: { id: string }) => p.id === 'action-chunking-frontmatter-p1');
  const historical = committedJson<Array<{ id: string; parts: Array<{ id: string; requiredCitationIds: string[] }> }>>(
    'a550e92bd394e0817c8aad0d9612b4e494e30aba', 'audit/compound-evidence.json',
  ).find(p => p.id === p1.id)!;
  expect(historical.parts).toHaveLength(7);
  expect(p1.parts.slice(0, 7)).toEqual(historical.parts);
  expect(p1.parts.flatMap((p: { requiredCitationIds: string[] }) => p.requiredCitationIds)).toEqual(matter(source).data.citations);
  expect(p1.planReview).not.toBeNull();
  // The frontmatter identity union grew to sixteen parts; adjudications
  // must cover every part.
  expect(p1.adjudications).toHaveLength(16);
  expect(p1.adjudications).toHaveLength(p1.parts.length);
  expect(closeout.find((r: { rowOrdinal: number }) => r.rowOrdinal === 32).originalPlan.evidence).toEqual([]);
  for (const part of p1.parts) {
    const mutated = structuredClone(plans);
    const target = mutated.find((p: { id: string }) => p.id === p1.id);
    target.evidence = target.evidence.filter((e: { partId: string }) => e.partId !== part.id);
    const broken = parseLedger('audit/manipulation.md', ledger, new Set(CITATIONS.map(c => c.id)), {
      compoundPlans: mutated, articleCitations: { 'action-chunking': matter(source).data.citations },
    }).find(s => s.slug === 'action-chunking')!;
    expect(broken.claimRecords[31].evidenceFailures.length).toBeGreaterThan(0);
  }
});
