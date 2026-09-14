import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';
import { compoundPartDigest, compoundPlanDigest, parseCompoundPlans, parseLedger, type CompoundPlan } from '../../lib/audit-ledger';
const article = readFileSync('content/classical/scene-representation.mdx', 'utf8');
const ledger = readFileSync('audit/classical.md', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map(c => c.id));
const parseRecords = (catalog = plans) => parseLedger('audit/classical.md', ledger, ids, { compoundPlans: catalog })
  .find(s => s.slug === 'scene-representation')!.claimRecords;
const currentRecords = parseRecords();
const records = (catalog = plans) => catalog === plans ? currentRecords : parseRecords(catalog);

describe('ORB scene source fidelity', () => {
  it('keeps monocular feature roles and recognition validation separate', () => {
    for (const text of ['2015 monocular ORB-SLAM', 'tracking, local mapping, relocalisation and loop closing',
      'mapping triangulates matched ORB features', 'local bundle adjustment', 'DBoW2 vocabulary',
      'candidates, which require geometric validation']) expect(article).toContain(text);
  });
  it('keeps modalities, recovery, merging and failure qualifications together', () => {
    for (const text of ['monocular-inertial and stereo-inertial', 'IMU initialization uses MAP',
      'Tracking loss first triggers recovery attempts', 'discard an immature map',
      'geometric and covisibility checks', 'gravity-direction checks',
      'Low texture remains a failure case', 'slow motion can leave inertial initialization poorly constrained'])
      expect(article).toContain(text);
    expect(article).not.toContain('seamlessly merged');
  });
  it('attributes graph error distribution to ORB and avoids universal error claims', () => {
    expect(article).toContain('reduce and possibly correct trajectory drift');
    expect(article).toContain('Essential Graph optimization');
    expect(article).toContain('This is not a guarantee that every revisit removes all error');
    expect(article).toContain('This is not a universal ranking of the cost of every false match');
    expect(article).not.toContain('error grows without bound');
    expect(article).not.toContain('A false match is worse than a missed one');
  });
  it('uses exact IEEE title/bylines while preserving both canonical DOI URLs', () => {
    expect(CITATIONS.find(c => c.id === 'orb-slam-2015')).toMatchObject({
      title: 'ORB-SLAM: A Versatile and Accurate Monocular SLAM System',
      authors: ['Raúl Mur-Artal', 'J. M. M. Montiel', 'Juan D. Tardós'],
      year: 2015, venue: 'IEEE Transactions on Robotics', url: 'https://doi.org/10.1109/TRO.2015.2463671',
    });
    expect(CITATIONS.find(c => c.id === 'orb-slam3-2021')).toMatchObject({
      title: 'ORB-SLAM3: An Accurate Open-Source Library for Visual, Visual–Inertial, and Multimap SLAM',
      authors: ['Carlos Campos', 'Richard Elvira', 'Juan J. Gómez Rodríguez', 'José M. M. Montiel', 'Juan D. Tardós'],
      year: 2021, venue: 'IEEE Transactions on Robotics', url: 'https://doi.org/10.1109/TRO.2021.3075644',
    });
    for (const id of ['orb-slam-2015', 'orb-slam3-2021']) expect(CITATIONS.find(c => c.id === id)?.arxiv).toBeUndefined();
  });
  it('aligns both glossary caveats without sensor-only or universal guarantees', () => {
    const loop = GLOSSARY.find(t => t.id === 'loop-closure')!;
    const place = GLOSSARY.find(t => t.id === 'place-recognition')!;
    expect(loop.definition).toContain('Essential Graph optimization');
    expect(loop.definition).toContain('not a guarantee that every revisit removes all error');
    expect(loop.citations).toEqual(['cadena-2016', 'orb-slam-2015']);
    expect(place.definition).toContain('For visual navigation');
    expect(place.definition).toContain('Motion information can also inform that belief');
    expect(place.definition).toContain('do not establish a universal ranking');
    expect(place.definition).not.toContain('sensor data alone');
    expect(place.citations).toContain('cadena-2016');
    expect(place.citations).toContain('lowry-2016-place-recognition');
  });
  for (const [ordinal, count] of [[26, 3], [27, 5], [31, 2], [33, 3]] as const) {
    it(`original ${ordinal} binds every reviewed part and required source`, () => {
      const row = records()[ordinal - 1];
      expect(row.evidenceFailures).toEqual([]);
      expect(row.verdict).toBe('C');
      const plan = plans.find(p => p.id === row.compound?.planId)!;
      expect(plan.parts).toHaveLength(count);
      expect(plan.evidence).toHaveLength(count);
      expect(plan.adjudications).toHaveLength(count);
      expect(plan.planReview?.reviewedBy).toContain('source-auditor');
      if (ordinal === 31) expect(plan.parts.map(p => p.requiredCitationIds)).toEqual([['cadena-2016'], ['orb-slam-2015']]);
      if (ordinal === 33) expect(plan.parts.every(p => p.requiredCitationIds.join() === 'cadena-2016')).toBe(true);
    });
    it(`original ${ordinal} rejects missing AND items, duplicate, wrong URL and stale reviews`, () => {
      const plan = plans.find(p => p.id === records()[ordinal - 1].compound?.planId);
      expect(plan).toBeDefined();
      const rejected = (p: CompoundPlan) => expect(records(plans.map(x => x.id === p.id ? p : x))[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      for (const part of plan!.parts) {
        const p = structuredClone(plan!);
        p.evidence = p.evidence.filter(e => e.partId !== part.id);
        p.planReview!.planDigest = compoundPlanDigest(p);
        p.adjudications = p.adjudications.map(a => ({ ...a, evidenceDigest: compoundPartDigest(p, a.partId) }));
        rejected(p);
      }
      const mutations: Array<(p: CompoundPlan) => void> = [
        p => { p.planReview = null; }, p => { p.adjudications = []; },
        p => { p.originalCellsDigest = '0'.repeat(64); },
        p => { p.evidence[0].sourceUrl = 'https://example.invalid/wrong'; },
        p => { p.evidence[0].supportingPassage = ''; },
        p => { p.evidence.push(p.evidence[0]); },
        p => { p.adjudications[0].outcome = 'unresolved'; },
      ];
      for (const mutate of mutations) { const p = structuredClone(plan!); mutate(p); rejected(p); }
    });
  }
  it('preserves Lowry, DSO, dates and unselected incomplete originals', () => {
    expect(article).toContain('motion information can also inform this belief');
    expect(article).toContain("Direct Sparse Odometry's formulation");
    expect(article).toContain('lastReviewed: "2026-08-22"');
    for (const ordinal of [25, 32, 34, 35, 38, 39]) expect(records()[ordinal - 1].evidenceFailures).toEqual([]);
    for (const ordinal of [18, 24, 45, 49]) expect(records()[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
  });
});
