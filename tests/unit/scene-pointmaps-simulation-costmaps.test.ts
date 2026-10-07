import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';
import {
  compoundPartDigest,
  compoundPlanDigest,
  parseCompoundPlans,
  parseLedger,
  type CompoundPlan,
} from '../../lib/audit-ledger';

const article = readFileSync('content/classical/scene-representation.mdx', 'utf8');
const ledger = readFileSync('audit/classical.md', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map((citation) => citation.id));
const selected = [17, 20, 21, 41] as const;
const records = (catalog = plans) =>
  parseLedger('audit/classical.md', ledger, ids, { compoundPlans: catalog })
    .find((section) => section.slug === 'scene-representation')!.claimRecords;

describe('pointmaps, simulation and layered-costmap source corrections', () => {
  it('separates DUSt3R pair inference, supervised pretraining and global alignment', () => {
    const block = article.split('\n\n').find((text) => text.startsWith('DUSt3R predicts dense pointmaps'));
    expect(block).toBeDefined();
    for (const text of [
      'without intrinsics or poses',
      "in the first image's frame",
      'unknown scale',
      'geometric supervision',
      'pretrained CroCo weights',
      'optimizes the alignment of pairwise pointmaps in 3D',
      '<Cite id="dust3r-2024" />',
    ]) expect(block).toContain(text);
    expect(article).not.toContain('The fourth step removed the per-scene optimisation');
    expect(article).not.toContain('A reconstruction you do not have to optimise per scene');
  });

  it('keeps SplatSim physics, preparation and the conflicting input descriptions', () => {
    const block = article.split('\n\n').find((text) => text.startsWith('Simulators pair splats for appearance with separate physics'));
    expect(block).toBeDefined();
    for (const text of [
      'SplatSim renders with splats',
      'PyBullet supplies physics',
      'four rigid-body tasks with a UR5 and Robotiq 2F-85 gripper',
      'manual robot segmentation and ICP alignment',
      '<Cite id="splatsim-2024" />',
    ]) expect(block).toContain(text);
  });

  it('distinguishes RoboGSim reconstruction and a closed-loop physics backend', () => {
    const block = article.split('\n\n').find((text) => text.startsWith('Simulators pair splats for appearance with separate physics'));
    expect(block).toBeDefined();
    for (const text of [
      "In RoboGSim's closed-loop evaluator",
      'a policy acts on splat-rendered images',
      'supplied MDH parameters and mesh assets',
      'Isaac Sim handles inverse kinematics and physical interaction',
      '<Cite id="robogsim-2024" />',
    ]) expect(block).toContain(text);
    expect(article).not.toContain('RoboGSim packages the same reconstruct-compose-evaluate loop');
  });

  it('corrects the article and glossary together without changing Nav2 attribution', () => {
    const definition = GLOSSARY.find((entry) => entry.id === 'costmap')!;
    for (const text of [
      "Lu, Hershberger and Smart's layered costmaps",
      'ordered list of semantically separate layers',
      'master 2D costmap',
      "Each update gathers the layers' bounds",
      'lets each layer write the master grid within them',
      'decides whether sensed obstacles overwrite static-map costs',
      'a configuration setting decides',
    ]) {
      expect(article).toContain(text);
    }
    for (const text of [
      'proposed and implemented layered costmaps in ROS Navigation',
      'ordered semantic layers update a master 2D costmap',
      'bounds first, then values',
      'may keep private grids or write directly to the master',
      'Sensed obstacles may overwrite static-map costs if configured',
    ]) expect(definition.definition).toContain(text);
    for (const [claim, id] of [
      ['DUSt3R predicts dense pointmaps', 'dust3r-2024'],
      ['SplatSim renders with splats', 'splatsim-2024'],
      ["In RoboGSim's closed-loop evaluator", 'robogsim-2024'],
      ["Lu, Hershberger and Smart's layered costmaps", 'layered-costmaps-2014'],
    ]) {
      const block = article.split('\n\n').find((text) => text.includes(claim));
      expect(block, claim).toBeDefined();
      expect(block, claim).toContain(`<Cite id="${id}" />.`);
      expect(block, claim).not.toMatch(/Source:|<br\b|className="block"/);
    }
    expect(definition.definition).not.toContain('introduced the layered form now standard');
    expect(definition.citations).toEqual(['layered-costmaps-2014', 'nav2-2020']);
    expect(article).toContain('Navigation2, built on ROS 2, uses a layered costmap.');
    expect(article).toContain('each a plugin in an asynchronous server <Cite id="nav2-2020" />.');
  });

  it('keeps the four selected source identities and citation multiplicity', () => {
    for (const [id, count] of [
      ['dust3r-2024', 1], ['splatsim-2024', 2], ['robogsim-2024', 1], ['layered-costmaps-2014', 1],
    ] as const) {
      expect(article.match(new RegExp(`<Cite id="${id}" />`, 'g'))).toHaveLength(count);
    }
    expect(CITATIONS.find((citation) => citation.id === 'splatsim-2024')?.url)
      .toBe('https://arxiv.org/abs/2409.10161');
    expect(CITATIONS.find((citation) => citation.id === 'robogsim-2024')?.url)
      .toBe('https://arxiv.org/abs/2411.11839');
    expect(article).toContain('lastReviewed: "2026-08-22"');
  });

  for (const ordinal of selected) {
    it(`binds original ${ordinal} to a reviewed complete conjunction and rejects omitted evidence`, () => {
      const row = records()[ordinal - 1];
      expect(row.evidenceFailures).toEqual([]);
      expect(row.note).toContain('Original four-cell tuple (JSON):');
      const plan = plans.find((candidate) => candidate.id === row.compound?.planId)!;
      expect(plan).toBeDefined();
      expect(plan.planReview?.reviewedBy).toContain('source-auditor');
      expect(plan.parts.length).toBeGreaterThanOrEqual(4);
      for (const part of plan.parts) {
        const changed = structuredClone(plan);
        changed.evidence = changed.evidence.filter((item) => item.partId !== part.id);
        // Fresh digest cannot compensate for a missing required source pair.
        changed.planReview!.planDigest = compoundPlanDigest(changed);
        changed.adjudications = changed.adjudications.map((item) => ({
          ...item, evidenceDigest: compoundPartDigest(changed, item.partId),
        }));
        const catalog = plans.map((candidate) => candidate.id === changed.id ? changed : candidate);
        expect(records(catalog)[ordinal - 1].evidenceFailures.length, part.id).toBeGreaterThan(0);
      }
      for (const mutate of [
        (p: CompoundPlan) => { p.planReview = null; },
        (p: CompoundPlan) => { p.adjudications = []; },
        (p: CompoundPlan) => { p.originalCellsDigest = '0'.repeat(64); },
        (p: CompoundPlan) => { p.evidence[0].sourceUrl = 'https://example.invalid/wrong-document'; },
      ]) {
        const changed = structuredClone(plan);
        mutate(changed);
        expect(records(plans.map((candidate) => candidate.id === changed.id ? changed : candidate))
          [ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      }
    });
  }

  it('keeps MASt3R, OccWorld and the authored illustration bound to their completed plans', () => {
    // Rows 18/24/45 were completed lawfully by the scene-representation
    // 20260916d integration (packet-anchored evidence, no promotion beyond it).
    for (const ordinal of [18, 24, 45]) {
      expect(records()[ordinal - 1].evidenceFailures).toEqual([]);
      expect(records()[ordinal - 1].compound?.planId).toMatch(/^scene-representation-\d+-[a-z0-9-]+-20260916d$/);
    }
    for (const ordinal of [12, 13, 14, 15, 16, 40, 42, 43, 44]) {
      expect(records()[ordinal - 1].evidenceFailures).toEqual([]);
    }
  });
});
