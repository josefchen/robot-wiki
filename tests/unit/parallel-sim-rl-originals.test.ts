import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

/**
 * Pins the 2026-09-16k parallel-sim-rl originals integration: the five
 * dispatched rl-sim2real/parallel-sim-rl rows (originals 1, 3, 5, 6 and 18)
 * must bind to their compound plans and parse complete (no evidence
 * failures) with supported adjudications, from the committed ledger and
 * catalog exactly as check-audit-coverage reads them. Row 1 additionally
 * applies the packet's article-span correction (the Isaac Gym primacy
 * sentence); rows 3, 5, 6 and 18 change no article prose. Every other row
 * keeps its pre-existing evidence state: rows 2 and 7-17 carry their
 * standing compound plans, row 4 carries complete scalar evidence.
 */
const ROOT = join(import.meta.dirname, '../..');
const PACKET_SHA = '7f22e287c2d47a7102b56f5a665ee25b5d661e252c67b67788daf0b2d7d5579a';
const EXPECTED_20260916K: Readonly<Record<number, string>> = {
  1: 'parallel-sim-rl-1-isaac-gym-20260916k',
  3: 'parallel-sim-rl-3-legged-gym-20260916k',
  5: 'parallel-sim-rl-5-brax-20260916k',
  6: 'parallel-sim-rl-6-mujoco-playground-20260916k',
  18: 'parallel-sim-rl-18-training-time-chart-20260916k',
};
const PRE_EXISTING_PLANS: Readonly<Record<number, string>> = {
  2: 'rudin-protocol-writer-parallel-sim-rl-2-20260909',
  7: 'source-newton-engine-20260908-parallel-sim-rl-7',
  8: 'isaac-v1-rl-sim2real-parallel-sim-rl-8-20260908',
  9: 'isaac-v1-rl-sim2real-parallel-sim-rl-9-20260908',
  10: 'isaac-v1-rl-sim2real-parallel-sim-rl-10-20260908',
  11: 'source-newton-engine-20260908-parallel-sim-rl-11',
  12: 'source-newton-engine-20260908-parallel-sim-rl-12',
  13: 'source-newton-engine-20260908-parallel-sim-rl-13',
  14: 'source-newton-engine-20260908-parallel-sim-rl-14',
  15: 'source-newton-engine-20260908-parallel-sim-rl-15',
  16: 'isaac-v1-rl-sim2real-parallel-sim-rl-16-20260908',
  17: 'source-newton-engine-20260908-parallel-sim-rl-17',
};

const loadSection = () => {
  const markdown = readFileSync(join(ROOT, 'audit/rl-sim2real.md'), 'utf8');
  const compoundPlans = parseCompoundPlans(
    JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
  );
  const registryIds = new Set(CITATIONS.map(({ id }) => id));
  const sections = parseLedger('audit/rl-sim2real.md', markdown, registryIds, {
    compoundPlans,
  });
  return { sections, compoundPlans, registryIds, markdown };
};

describe('parallel-sim-rl originals integration (2026-09-16k evidence completions)', () => {
  it('binds the five applied rows to complete compound evidence', () => {
    const { sections, compoundPlans } = loadSection();
    const article = sections.find((section) => section.slug === 'parallel-sim-rl');
    expect(article).toBeDefined();
    for (const [ordinal, planId] of Object.entries(EXPECTED_20260916K)) {
      const record = article!.claimRecords[Number(ordinal) - 1];
      expect(record.compound?.planId ?? '').toBe(planId);
      expect(record.compound?.structuralFailures ?? ['missing']).toEqual([]);
      expect(record.compound?.adjudicationFailures ?? ['missing']).toEqual([]);
      expect(record.evidenceFailures).toEqual([]);
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.adjudications.map((a) => a.outcome)).toEqual(
        plan.parts.map(() => 'supported'),
      );
      // compound rows must not mix scalar evidence cells with paired items
      for (const item of plan.evidence) {
        expect(item.citationId).not.toBe('');
        expect(item.sourceUrl).toMatch(/^https?:\/\//);
        expect(item.supportingPassage.length).toBeGreaterThan(20);
      }
    }
  });

  it('keeps every undispatched row in its pre-existing evidence state', () => {
    const { sections } = loadSection();
    const article = sections.find((section) => section.slug === 'parallel-sim-rl')!;
    // rows 2, 7-17: pre-existing compound plans, untouched and complete
    for (const [ordinal, planId] of Object.entries(PRE_EXISTING_PLANS)) {
      const record = article.claimRecords[Number(ordinal) - 1];
      expect(record.compound?.planId ?? '').toBe(planId);
      expect(record.evidenceFailures).toEqual([]);
    }
    // row 4 keeps its complete scalar evidence (Rudin PPO table passage)
    const r4 = article.claimRecords[3];
    expect(r4.compound?.planId ?? '').toBe('');
    expect(r4.citationId).toBe('rudin-2021');
    expect(r4.evidenceFailures).toEqual([]);
  });

  it('carries the packet passages in the bound rows and plans', () => {
    const { sections, compoundPlans } = loadSection();
    const article = sections.find((section) => section.slug === 'parallel-sim-rl')!;

    // Row 1: primacy cut. The corrected claim records the unsupported
    // 'first demonstration' framing as removed, with the paper's own
    // end-to-end wording and the concurrent-work acknowledgment retained.
    const r1 = article.claimRecords[0];
    expect(r1.verdict).toContain('corrected');
    expect(r1.sourceChecked).toContain('isaac-gym-2021 @ https://arxiv.org/abs/2108.10470');
    expect(r1.note).toContain('without ever going through any CPU bottlenecks');
    expect(r1.note).toContain("'first demonstration' 0 anywhere");
    expect(r1.note).toContain('others [14] have recently begun attempting an approach similar to Isaac Gym');
    const p1 = compoundPlans.find((p) => p.id === EXPECTED_20260916K[1])!;
    expect(p1.evidence.some((e) => e.supportingPassage.includes('Both physics simulation and the neural network policy training reside on GPU and communicate by directly passing data from physics buffers to PyTorch tensors'))).toBe(true);
    expect(p1.evidence.some((e) => e.supportingPassage.includes('It runs an end-to-end GPU accelerated training pipeline'))).toBe(true);
    expect(p1.evidence.some((e) => e.supportingPassage.includes('have recently begun attempting an approach similar to Isaac Gym'))).toBe(true);
    expect(p1.adjudications.map((a) => a.partId)).toEqual([
      'y1-gpu-pipeline-tensors', 'y1-primacy-cut',
    ]);

    // Row 3: the stale 'still the reference lineage' framing is corrected;
    // every conjunct of the already-applied article span is evidenced.
    const r3 = article.claimRecords[2];
    expect(r3.verdict).toContain('corrected');
    expect(r3.sourceChecked).toContain('legged-gym-repo-2021 @ https://github.com/leggedrobotics/legged_gym');
    expect(r3.note).toContain('we have migrated all the environments from this work to Isaac Lab');
    expect(r3.note).toContain('Maintainer: Nikita Rudin');
    expect(r3.note).toContain("is the paper byline; the repo prints Rudin as maintainer");
    const p3 = compoundPlans.find((p) => p.id === EXPECTED_20260916K[3])!;
    expect(p3.evidence.some((e) => e.supportingPassage.includes("This repository provides the environment used to train ANYmal (and other robots) to walk on rough terrain using NVIDIA's Isaac Gym"))).toBe(true);
    expect(p3.evidence.some((e) => e.supportingPassage.includes('this repository will receive limited updates and support'))).toBe(true);
    expect(p3.evidence.some((e) => e.supportingPassage.includes('We open-source our training code to help accelerate further research in the field of learned legged locomotion'))).toBe(true);

    // Row 5: every conjunct verified; the 'from Google' affiliation rests on
    // the PDF title page and is disclosed as beyond the abs page.
    const r5 = article.claimRecords[4];
    expect(r5.verdict).toBe('verified');
    expect(r5.sourceChecked).toContain('brax-2021 @ https://arxiv.org/abs/2106.13281');
    expect(r5.note).toContain('written in JAX');
    expect(r5.note).toContain('MuJoCo-like tasks in minutes');
    expect(r5.note).toContain("abs page prints no affiliations");
    const p5 = compoundPlans.find((p) => p.id === EXPECTED_20260916K[5])!;
    expect(p5.evidence.some((e) => e.sourceUrl === 'https://arxiv.org/abs/2106.13281' && e.supportingPassage.includes('reimplementations of PPO, SAC, ES, and direct policy optimization in JAX that compile alongside our environments'))).toBe(true);
    expect(p5.evidence.some((e) => e.sourceUrl === 'https://arxiv.org/pdf/2106.13281' && e.supportingPassage.includes('Google Research'))).toBe(true);

    // Row 6: verdict verified stands; the note's quotation is corrected to
    // the abstract's exact printed wording with the negative needle-check.
    const r6 = article.claimRecords[5];
    expect(r6.verdict).toBe('verified');
    expect(r6.sourceChecked).toContain('mujoco-playground-2025 @ https://arxiv.org/abs/2502.08844');
    expect(r6.note).toContain('a fully open-source framework for robot learning built with MJX');
    expect(r6.note).toContain("'unified' 0, 'built on MJX' 0, 'locomotion' 0, 'manipulation' 0");
    const p6 = compoundPlans.find((p) => p.id === EXPECTED_20260916K[6])!;
    expect(p6.evidence.some((e) => e.supportingPassage.includes('with the express goal of streamlining simulation, training, and sim-to-real transfer onto robots'))).toBe(true);
    expect(p6.evidence.some((e) => e.supportingPassage.includes('quadrupeds, humanoids, dexterous hands, and robotic arms'))).toBe(true);

    // Row 18: local-AND. The measured-anchor conjunct reuses the registered
    // rudin-2021 surface of the row-2 plan read-only; the illustrative-model
    // conjunct is the integrator's in-repo local proof.
    const r18 = article.claimRecords[17];
    expect(r18.verdict).toBe('verified');
    expect(r18.sourceChecked).toContain('rudin-2021 @ https://ar5iv.labs.arxiv.org/html/2109.11978');
    expect(r18.sourceChecked).toContain('local proof');
    expect(r18.note).toContain('illustrative fixed-transitions model');
    expect(r18.note).toContain('flat terrain in under four minutes, and in twenty minutes for uneven terrain');
    expect(r18.note).toContain('4096 robots and a batch size of 98304');
    const p18 = compoundPlans.find((p) => p.id === EXPECTED_20260916K[18])!;
    expect(p18.evidence).toHaveLength(1);
    expect(p18.evidence[0].citationId).toBe('rudin-2021');
    expect(p18.evidence[0].sourceUrl).toBe('https://ar5iv.labs.arxiv.org/html/2109.11978');
    expect(p18.evidence[0].supportingPassage).toContain('under four minutes');
    expect(p18.evidence[0].supportingPassage).toContain('under 20 minutes');
    expect(p18.evidence[0].supportingPassage).toContain('i9-11900k CPU, NVIDIA RTX A6000 GPU');
  });

  it('applied the row 1 article-span correction and left the rest of the prose intact', () => {
    const mdx = readFileSync(join(ROOT, 'content/rl-sim2real/parallel-sim-rl.mdx'), 'utf8');
    expect(mdx).not.toContain('Isaac Gym was the first demonstration of end-to-end RL');
    expect(mdx).toContain(
      'Isaac Gym ran an end-to-end GPU accelerated training pipeline for complex robot tasks on a single GPU.',
    );
    // the following two sentences and the citation placement are unchanged
    expect(mdx).toContain('exposed the simulation state directly as PyTorch tensors');
    expect(mdx).toContain('The authors report two to three orders of magnitude improvement over the conventional split of a CPU simulator feeding a GPU network <Cite id="isaac-gym-2021" />');
    // rows 3, 5, 6, 18 spans stay byte-identical
    expect(mdx).toContain('The paper links its released training code, `legged_gym`; the pinned October 2021 repository identifies itself as the Isaac Gym environment used to train ANYmal on rough terrain');
    expect(mdx).toContain('Brax, from Google in 2021, wrote the physics and the learning algorithms in JAX so both compile onto the same accelerator, training performant policies on MuJoCo-like tasks in minutes <Cite id="brax-2021" />');
    expect(mdx).toContain('The curve is an illustrative fixed-transitions model, not a benchmark.');
  });

  it('reuses registered citations with no new registrations', () => {
    const ids = ['isaac-gym-2021', 'legged-gym-repo-2021', 'brax-2021',
      'mujoco-playground-2025', 'rudin-2021'];
    for (const id of ids) {
      expect(CITATIONS.filter((c) => c.id === id)).toHaveLength(1);
    }
    const byId = Object.fromEntries(CITATIONS.map((c) => [c.id, c]));
    expect(byId['isaac-gym-2021'].url).toBe('https://arxiv.org/abs/2108.10470');
    expect(byId['legged-gym-repo-2021'].url).toBe('https://github.com/leggedrobotics/legged_gym');
    expect(byId['brax-2021'].url).toBe('https://arxiv.org/abs/2106.13281');
    expect(byId['mujoco-playground-2025'].url).toBe('https://arxiv.org/abs/2502.08844');
    expect(byId['rudin-2021'].url).toBe('https://arxiv.org/abs/2109.11978');
  });

  it('records integrator plan review on every 20260916k parallel-sim-rl plan', () => {
    const { compoundPlans } = loadSection();
    for (const planId of Object.values(EXPECTED_20260916K)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toMatch(/GLM-5\.3\/max integrator/);
      expect(plan.planReview?.rationale).toContain(PACKET_SHA);
    }
  });
});
