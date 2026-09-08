import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS, getCitation } from '../../data/citations';
import { parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';
const read = (p: string) => readFileSync(p, 'utf8');
const video = read('content/world-models/generative-video.mdx');
const plans = parseCompoundPlans(JSON.parse(read('audit/compound-evidence.json')));
const sections = parseLedger('audit/world-models.md', read('audit/world-models.md'), new Set(CITATIONS.map(c => c.id)), { compoundPlans: plans });
describe('Cosmos exact-body closeouts', () => {
  it.each([['taxonomy', 12], ['generative-video', 1], ['generative-video', 5], ['generative-video', 7], ['generative-video', 8], ['generative-video', 9], ['generative-video', 10]] as const)('retains whole source support for %s:%i', (slug, ordinal) => {
    expect(sections.find(s => s.slug === slug)!.claimRecords[ordinal - 1].evidenceFailures).toEqual([]);
  });
  it('preserves asymmetric attention, specialization, loss disagreement and model-scale scope', () => {
    for (const phrase of ['the reasoning stream is not updated from diffusion tokens', 'one unchanged checkpoint', 'freshly initializes the action encoder', 'Policy mode jointly denoises future video and actions', 'Section 2.5 reports Cosmos 3 Nano at 16B', 'Cosmos 3 Super at 64B', 'rectified flow matching', 'EDM loss']) expect(video).toContain(phrase);
    expect(video).not.toContain('Two sizes are public at launch');
  });
  it('preserves the full observed corporate-plus-contributor population', () => {
    const c = getCitation('cosmos-3-2026')!;
    expect(c.authors).toHaveLength(295);
    expect(new Set(c.authors).size).toBe(295);
    expect(c.authors.slice(0, 3)).toEqual(['NVIDIA', 'Aditi', 'Niket Agarwal']);
    expect(c.authors.at(-1)).toBe('Artur Zolkowski');
    expect(c.url).toBe('https://research.nvidia.com/labs/cosmos-lab/cosmos3/technical-report.pdf');
  });
  it.each(['jepa', 'taxonomy', 'generative-video'])('keeps punctuation attached to the local citation in %s', slug => {
    const prose = read(`content/world-models/${slug}.mdx`);
    const wrappers = [...prose.matchAll(/<span className="block" data-[^>]*source-placement[^>]*>[\s\S]*?<\/span>[.,;]/g)];
    expect(wrappers.map(m => m[0])).toEqual([]);
  });
});
