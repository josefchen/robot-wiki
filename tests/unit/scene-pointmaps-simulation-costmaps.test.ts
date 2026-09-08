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
    const block = article.split('\n\n').find((text) => text.startsWith("DUSt3R's network"));
    expect(block).toBeDefined();
    for (const text of [
      'without camera intrinsics or poses supplied at inference',
      "first image's coordinate frame",
      'unknown scale',
      'geometric supervision',
      'pretrained CroCo weights',
      'optimises the alignment of pairwise pointmaps in 3D',
      'not an optimisation-free multiview reconstruction',
      '<Cite id="dust3r-2024" />',
    ]) expect(block).toContain(text);
    expect(article).not.toContain('The fourth step removed the per-scene optimisation');
    expect(article).not.toContain('A reconstruction you do not have to optimise per scene');
  });

  it('keeps SplatSim physics, preparation and the conflicting input descriptions', () => {
    const block = article.split('\n\n').find((text) => text.includes('SplatSim replaces'));
    expect(block).toBeDefined();
    for (const text of [
      'PyBullet still supplies the physics',
      'four tasks using a UR5 and Robotiq 2F-85 gripper',
      'manual robot segmentation',
      'CAD-derived link bounds and ICP alignment',
      'end-effector position and orientation',
      'solely RGB',
      'rigid-body manipulation',
      '<Cite id="splatsim-2024" />',
    ]) expect(block).toContain(text);
  });

  it('distinguishes RoboGSim reconstruction and a closed-loop physics backend', () => {
    const block = article.split('\n\n').find((text) => text.startsWith('RoboGSim combines'));
    expect(block).toBeDefined();
    for (const text of [
      'Gaussian Reconstructor, Digital Twins Builder, Scene Composer and Interactive Engine',
      'supplied robot MDH parameters',
      'mesh assets and measured layout alignment',
      'Isaac Sim handles inverse kinematics and physical interactions',
      'resulting state drives the next rendering',
      '<Cite id="robogsim-2024" />',
    ]) expect(block).toContain(text);
    expect(article).not.toContain('RoboGSim packages the same reconstruct-compose-evaluate loop');
  });

  it('corrects the article and glossary together without changing Nav2 attribution', () => {
    const definition = GLOSSARY.find((entry) => entry.id === 'costmap')!;
    for (const text of [
      'proposed and implemented layered costmaps in the ROS Navigation stack',
      'ordered list of semantically separate layers',
      'master 2D costmap',
      "first gathers the layers' update bounds",
      'Some layers keep private grids',
      'does not prohibit overwriting static-map costs',
      'remains configurable',
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
    for (const id of ['dust3r-2024', 'splatsim-2024', 'robogsim-2024', 'layered-costmaps-2014']) {
      expect(article).toContain(`<span className="block">Source: <Cite id="${id}" /></span>`);
    }
    expect(definition.definition).not.toContain('introduced the layered form now standard');
    expect(definition.citations).toEqual(['layered-costmaps-2014', 'nav2-2020']);
    expect(article).toContain('Navigation2 uses a layered costmap <Cite id="nav2-2020" />.');
  });

  it('keeps the four selected source identities and citation multiplicity', () => {
    for (const id of ['dust3r-2024', 'splatsim-2024', 'robogsim-2024', 'layered-costmaps-2014']) {
      expect(article.match(new RegExp(`<Cite id="${id}" />`, 'g'))).toHaveLength(1);
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

  it('does not promote MASt3R, OccWorld or the authored illustration', () => {
    for (const ordinal of [18, 24, 45]) {
      expect(records()[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    }
    for (const ordinal of [12, 13, 14, 15, 16, 40, 42, 43, 44]) {
      expect(records()[ordinal - 1].evidenceFailures).toEqual([]);
    }
  });
});
