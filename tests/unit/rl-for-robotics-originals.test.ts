import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

/**
 * Pins the 2026-09-16k rl-for-robotics-originals integration (rows 49 DROID/
 * OXE corpora and 50 frontmatter P1 sweep) and the 2026-09-16m equation-
 * fidelity completion of the two rows the k pass HELD: originals 1 and 5 now
 * bind compound plans whose evidence quotations were corrected to the
 * glyph-verified print of the retained RLbook2020.pdf - Eq. 3.2 in its t/t-1
 * convention (Pr{St = s', Rt = r | St-1 = s, At-1 = a}) and Eq. 6.8 WITH the
 * discount gamma between Rt+1 and max (Sarsa Eq. 6.7 prints the same gamma).
 * The article prints no equation, so its spans are untouched; these tests pin
 * the corrected ledger cells and the plan passages that carry them.
 */
const ROOT = join(import.meta.dirname, '../..');
const PACKET_SHA = '329a75d3be70438a7ea294116925ba2336e8f5295edb72e8c20d4613c6968129';
const PACKET_SHA_M = '03829c42774fcf7ea1e4e9c9572f94494af7882c49bc1652be357c909641cfdb';
const EXPECTED_20260916K: Readonly<Record<number, string>> = {
  49: 'rl-for-robotics-49-droid-oxe-corpora-20260916k',
  50: 'rl-for-robotics-50-frontmatter-p1-sweep-20260916k',
};
const EXPECTED_20260916M: Readonly<Record<number, string>> = {
  1: 'rl-for-robotics-1-mdp-formalization-20260916m',
  5: 'rl-for-robotics-5-qlearning-offpolicy-20260916m',
};

function loadLedger() {
  const markdown = readFileSync(join(ROOT, 'audit/rl-sim2real.md'), 'utf8');
  const compoundPlans = parseCompoundPlans(
    JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
  );
  const registryIds = new Set(CITATIONS.map(({ id }) => id));
  const sections = parseLedger('audit/rl-sim2real.md', markdown, registryIds, { compoundPlans });
  const section = sections.find((s) => s.slug === 'rl-for-robotics');
  expect(section).toBeDefined();
  return { compoundPlans, section: section! };
}

describe('rl-for-robotics originals integration (2026-09-16k evidence completions)', () => {
  it('binds the two applied rl-for-robotics rows to complete compound evidence', () => {
    const { compoundPlans, section } = loadLedger();
    for (const [ordinal, planId] of Object.entries(EXPECTED_20260916K)) {
      const record = section.claimRecords[Number(ordinal) - 1];
      expect(record.claim).toContain(' ');
      expect(record.compound?.planId ?? '').toBe(planId);
      expect(record.compound?.structuralFailures ?? ['missing']).toEqual([]);
      expect(record.compound?.adjudicationFailures ?? ['missing']).toEqual([]);
      expect(record.evidenceFailures).toEqual([]);
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.adjudications.map((a) => a.outcome)).toEqual(
        plan.parts.map(() => 'supported'),
      );
    }
  });

  it('carries the DROID/OXE abstract needles in row 49 and its plan', () => {
    const { compoundPlans, section } = loadLedger();
    const r49 = section.claimRecords[48];
    expect(r49.sourceChecked).toContain('droid-2024 @ https://arxiv.org/abs/2403.12945');
    expect(r49.sourceChecked).toContain('open-x-embodiment-2023 @ https://arxiv.org/abs/2310.08864');
    expect(r49.sourceChecked).toContain('2026-09-16T16:50:58Z');
    expect(r49.note).toContain("76k demonstration trajectories or 350 hours of interaction data");
    expect(r49.note).toContain('a dataset from 22 different robots');
    const droid = compoundPlans
      .find((p) => p.id === EXPECTED_20260916K[49])!
      .evidence.find((e) => e.citationId === 'droid-2024')!;
    expect(droid.sourceUrl).toBe('https://arxiv.org/abs/2403.12945');
    expect(droid.supportingPassage).toContain(
      'a diverse robot manipulation dataset with 76k demonstration trajectories or 350 hours of interaction data',
    );
    expect(droid.supportingPassage).toContain('564 scenes and 84 tasks by 50 data collectors');
    const oxe = compoundPlans
      .find((p) => p.id === EXPECTED_20260916K[49])!
      .evidence.find((e) => e.citationId === 'open-x-embodiment-2023')!;
    expect(oxe.sourceUrl).toBe('https://arxiv.org/abs/2310.08864');
    expect(oxe.supportingPassage).toContain(
      'We assemble a dataset from 22 different robots collected through a collaboration between 21 institutions, demonstrating 527 skills',
    );
  });

  it('covers all 27 frontmatter identities in the row 50 sweep plan', () => {
    const { compoundPlans, section } = loadLedger();
    const r50 = section.claimRecords[49];
    expect(r50.sourceChecked).toContain('All 27 registered URLs fetched fresh 2026-09-16');
    expect(r50.sourceChecked).toContain('25 arXiv abs pages, 1 arXiv PDF levine-hand-eye-2016, 1 web.archive capture sutton-barto-2018');
    const mdx = readFileSync(join(ROOT, 'content/rl-sim2real/rl-for-robotics.mdx'), 'utf8');
    const frontmatter = mdx.split('---')[1];
    const cites = /citations:\n((?:\s*-\s+\S+\n)+)/.exec(frontmatter)![1];
    const ids = cites.match(/-\s+(\S+)/g)!.map((x) => x.replace(/-\s+/, ''));
    expect(ids).toHaveLength(27);
    const plan = compoundPlans.find((p) => p.id === EXPECTED_20260916K[50])!;
    expect(plan.parts[0].requiredCitationIds).toEqual(ids);
    expect(plan.evidence.map((e) => e.citationId)).toEqual(ids);
    // The levine title-page passage binds the text the retained PDF prints:
    // Deirdre Quillen in the author block, not the packet's inverted sic.
    const levine = plan.evidence.find((e) => e.citationId === 'levine-hand-eye-2016')!;
    expect(levine.supportingPassage).toContain('Sergey Levine Peter Pastor Alex Krizhevsky Deirdre Quillen');
    expect(levine.supportingPassage).not.toContain('Deirdre Quinn');
  });

  it('reuses registered citations with no new registration', () => {
    for (const [id, url] of [
      ['droid-2024', 'https://arxiv.org/abs/2403.12945'],
      ['open-x-embodiment-2023', 'https://arxiv.org/abs/2310.08864'],
      ['sutton-barto-2018', 'https://web.archive.org/web/20260818231355/http://www.incompleteideas.net/book/the-book-2nd.html'],
    ] as const) {
      const registered = CITATIONS.filter((c) => c.id === id);
      expect(registered).toHaveLength(1);
      expect(registered[0].url).toBe(url);
    }
  });

  it('records integrator plan review on every 20260916k rl-for-robotics plan', () => {
    const { compoundPlans } = loadLedger();
    for (const planId of Object.values(EXPECTED_20260916K)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toMatch(/GLM-5\.3\/max integrator/);
      expect(plan.planReview?.rationale).toContain(PACKET_SHA);
    }
  });
});

describe('rl-for-robotics equation-fidelity completions (2026-09-16m)', () => {
  it('binds the two corrected-equation rows to complete compound evidence', () => {
    const { compoundPlans, section } = loadLedger();
    for (const [ordinal, planId] of Object.entries(EXPECTED_20260916M)) {
      const record = section.claimRecords[Number(ordinal) - 1];
      expect(record.compound?.planId ?? '').toBe(planId);
      expect(record.compound?.structuralFailures ?? ['missing']).toEqual([]);
      expect(record.compound?.adjudicationFailures ?? ['missing']).toEqual([]);
      expect(record.evidenceFailures).toEqual([]);
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.adjudications.map((a) => a.outcome)).toEqual(
        plan.parts.map(() => 'supported'),
      );
    }
  });

  it('row 1 carries the glyph-verified t/t-1 Eq. 3.2 quotation', () => {
    const { compoundPlans, section } = loadLedger();
    const r1 = section.claimRecords[0];
    expect(r1.claim).toBe('"formalized as a Markov decision process: states, actions, a transition rule, a reward"');
    expect(r1.sourceChecked).toContain('sutton-barto-2018 @ https://web.archive.org/web/20260818231355/http://www.incompleteideas.net/book/the-book-2nd.html');
    expect(r1.sourceChecked).toContain('http://www.incompleteideas.net/book/RLbook2020.pdf');
    expect(r1.sourceChecked).toContain('2026-09-16T19:47:57Z');
    // the corrected equation form: plain-t subscripts before the bar,
    // t-1 after it, exactly as the retained PDF prints Eq. 3.2
    expect(r1.note).toContain("Pr{St = s', Rt = r | St-1 = s, At-1 = a}");
    expect(r1.note).toContain("p(s', r | s, a)");
    expect(r1.note).toContain('The function p defines the dynamics of the MDP');
    // the held pass's wrong t+1/t quotation must not survive anywhere in the row
    expect(r1.note).not.toContain("Pr{St+1 = s'");
    const plan = compoundPlans.find((p) => p.id === EXPECTED_20260916M[1])!;
    const ch3 = plan.evidence.find((e) => e.partId === 'rfr1m-ch3-mdp-elements-glyph-verified')!;
    expect(ch3.sourceUrl).toBe('http://www.incompleteideas.net/book/RLbook2020.pdf');
    expect(ch3.supportingPassage).toContain("Pr{St = s', Rt = r | St−1 = s, At−1 = a}");
    expect(ch3.supportingPassage).toContain('(3.2)');
    expect(ch3.supportingPassage).toContain('The function p defines the dynamics of the MDP.');
    expect(ch3.supportingPassage).not.toContain('Pr{St+1');
    const registry = plan.evidence.find((e) => e.partId === 'rfr1m-registry-page-identity')!;
    expect(registry.sourceUrl).toBe('https://web.archive.org/web/20260818231355/http://www.incompleteideas.net/book/the-book-2nd.html');
    expect(registry.supportingPassage).toContain('Richard S. Sutton and Andrew G. Barto Second Edition');
    expect(registry.supportingPassage).toContain('MIT Press, Cambridge, MA, 2018');
  });

  it('row 5 carries the glyph-verified discount gamma in Eq. 6.8', () => {
    const { compoundPlans, section } = loadLedger();
    const r5 = section.claimRecords[4];
    expect(r5.sourceChecked).toContain("Ch. 6.5 'Q-learning: Off-policy TD Control'");
    expect(r5.sourceChecked).toContain('RLbook2020.pdf');
    // the corrected equation form: gamma between Rt+1 and max, in both the
    // row note (ASCII) and the plan passage (printed glyphs, U+2212 minus)
    expect(r5.note).toContain('alpha[Rt+1 + gamma max_a Q(St+1,a) - Q(St,At)]');
    expect(r5.note).toContain('Sarsa Eq. 6.7 prints the same gamma');
    const plan = compoundPlans.find((p) => p.id === EXPECTED_20260916M[5])!;
    const q = plan.evidence.find((e) => e.partId === 'rfr5m-qlearning-target-rule-glyph-verified')!;
    expect(q.sourceUrl).toBe('http://www.incompleteideas.net/book/RLbook2020.pdf');
    expect(q.supportingPassage).toContain('Rt+1 + γ max_a Q(St+1, a) − Q(St, At)');
    expect(q.supportingPassage).toContain('(6.8)');
    expect(q.supportingPassage).toContain('independent of the policy being followed');
    // the held pass's gamma-less quotation must not survive in the passage
    expect(q.supportingPassage).not.toMatch(/Rt\+1 \+ max/);
    const sarsa = plan.evidence.find((e) => e.partId === 'rfr5m-offpolicy-character-glyph-verified')!;
    expect(sarsa.supportingPassage).toContain('Rt+1 + γQ(St+1, At+1) − Q(St, At)');
    expect(sarsa.supportingPassage).toContain('(6.7) Sarsa');
  });

  it('records integrator plan review on every 20260916m plan', () => {
    const { compoundPlans } = loadLedger();
    for (const planId of Object.values(EXPECTED_20260916M)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toMatch(/GLM-5\.3\/max integrator/);
      expect(plan.planReview?.rationale).toContain(PACKET_SHA_M);
    }
  });
});
