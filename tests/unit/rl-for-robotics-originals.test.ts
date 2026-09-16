import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

/**
 * Pins the 2026-09-16k rl-for-robotics-originals integration: the two applied
 * rl-sim2real/rl-for-robotics rows (originals 49 DROID/OXE corpora and 50
 * frontmatter P1 sweep) must bind to their compound plans and parse complete
 * (no evidence failures) with supported adjudications, from the committed
 * ledger and catalog exactly as check-audit-coverage reads them. Originals 1
 * and 5 are HELD by this integrator on glyph-verified equation differences
 * against the retained RLbook2020.pdf (Eq. 3.2 printed subscripts t/t-1 vs the
 * packet's t+1/t; Eq. 6.8 and the algorithm box print a discount gamma the
 * packet's quotations omit) and stay unbound and incomplete.
 */
const ROOT = join(import.meta.dirname, '../..');
const PACKET_SHA = '329a75d3be70438a7ea294116925ba2336e8f5295edb72e8c20d4613c6968129';
const EXPECTED_20260916K: Readonly<Record<number, string>> = {
  49: 'rl-for-robotics-49-droid-oxe-corpora-20260916k',
  50: 'rl-for-robotics-50-frontmatter-p1-sweep-20260916k',
};
const HELD_ORDINALS = [1, 5];

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

  it('keeps the two glyph-held rows unbound and evidence-incomplete', () => {
    const { section } = loadLedger();
    for (const ordinal of HELD_ORDINALS) {
      const record = section.claimRecords[ordinal - 1];
      expect(record.compound?.planId ?? '').toBe('');
      expect(record.evidenceFailures.length).toBeGreaterThan(0);
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
