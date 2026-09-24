import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

/**
 * Pins the 2026-09-16h taxonomy-originals integration: the five dispatched
 * world-models/taxonomy rows (originals 16-20, registered-citation evidence
 * completion against the frozen preparer packet) must bind to their compound
 * plans and parse complete (no evidence failures) with supported
 * adjudications, from the committed ledger and catalog exactly as
 * check-audit-coverage reads them. Held row 4 (internal WM_PARADIGMS
 * consistency row, standing owner question, one unresolved part in its
 * standing plan) stays untouched and incomplete.
 */
const ROOT = join(import.meta.dirname, '../..');
const PACKET_SHA = 'a1b7b09c54c183e71cdc6cd98e08be4d8172804fc924e0c1fcde36bd66d9b52d';
const EXPECTED_20260916H: Readonly<Record<number, string>> = {
  16: 'taxonomy-16-worldvla-20260916h',
  17: 'taxonomy-17-cosmos-policy-20260916h',
  18: 'taxonomy-18-occworld-20260916h',
  19: 'taxonomy-19-mujoco-20260916h',
  20: 'taxonomy-20-3dgs-20260916h',
};
const HELD_ORDINAL = 4;
const HELD_STANDING_PLAN = 'performance-worldmodels-taxonomy-4-20260908';

describe('taxonomy originals integration (2026-09-16h evidence completions)', () => {
  it('binds the five applied taxonomy rows to complete compound evidence', () => {
    const markdown = readFileSync(join(ROOT, 'audit/world-models.md'), 'utf8');
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    const registryIds = new Set(CITATIONS.map(({ id }) => id));
    const sections = parseLedger('audit/world-models.md', markdown, registryIds, { compoundPlans });
    const taxonomy = sections.find((section) => section.slug === 'taxonomy');
    expect(taxonomy).toBeDefined();
    for (const [ordinal, planId] of Object.entries(EXPECTED_20260916H)) {
      const record = taxonomy!.claimRecords[Number(ordinal) - 1];
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

  it('carries the five registered citations against their registered URLs in the bound rows', () => {
    const markdown = readFileSync(join(ROOT, 'audit/world-models.md'), 'utf8');
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    const registryIds = new Set(CITATIONS.map(({ id }) => id));
    const sections = parseLedger('audit/world-models.md', markdown, registryIds, { compoundPlans });
    const taxonomy = sections.find((section) => section.slug === 'taxonomy')!;

    // Row 16: WorldVLA abstract + full body fetch of record in the source cell;
    // the mutual-enhancement and unification sentences are the paper's own.
    const r16 = taxonomy.claimRecords[15];
    expect(r16.sourceChecked).toContain('worldvla-2025');
    expect(r16.sourceChecked).toContain('https://arxiv.org/abs/2506.21539');
    expect(r16.sourceChecked).toContain('2026-09-16T13:26:11Z');
    expect(r16.note).toContain('an autoregressive action world model that unifies action and image understanding and generation');
    expect(r16.note).toContain('mutual enhancement between the world model and the action model');
    expect(r16.note).toContain("'interleaves' is the article's word, not the paper's");

    // Row 17: Cosmos Policy abstract-page tier only; the editorial comparison
    // clause stays disclosed as the article's own.
    const r17 = taxonomy.claimRecords[16];
    expect(r17.sourceChecked).toContain('cosmos-policy-2026');
    expect(r17.sourceChecked).toContain('https://arxiv.org/abs/2601.16163');
    expect(r17.note).toContain('a single stage of post-training');
    expect(r17.note).toContain('no architectural modifications');
    expect(r17.note).toContain('encoded as latent frames');
    expect(r17.note).toContain("is the article's editorial comparison");

    // Row 18: OccWorld reused registered citation; the planning sentence and
    // the '3D Occupancy space' wording precision both live in the note.
    const r18 = taxonomy.claimRecords[17];
    expect(r18.sourceChecked).toContain('occworld-2023');
    expect(r18.sourceChecked).toContain('https://arxiv.org/abs/2311.16038');
    expect(r18.sourceChecked).toContain('scene-representation-24-occworld-20260916d');
    expect(r18.note).toContain('3D Occupancy space');
    expect(r18.note).toContain('without using instance and map supervision');
    expect(r18.note).toContain("'occupancy grid' is the article's term");

    // Row 19: MuJoCo DOI via the FetchUrl-rendered IEEE public abstract page;
    // boundary verdict stays the article's argument, no 'not learned' clause claimed.
    const r19 = taxonomy.claimRecords[18];
    expect(r19.sourceChecked).toContain('mujoco-2012');
    expect(r19.sourceChecked).toContain('https://doi.org/10.1109/IROS.2012.6386109');
    expect(r19.note).toContain('a new physics engine tailored to model-based control');
    expect(r19.note).toContain('forward and inverse dynamics');
    expect(r19.note).toContain('no \'not learned\' clause');

    // Row 20: 3DGS abstract tier; the not-a-world-model verdict stays the
    // article's argument under the survey's functional cut.
    const r20 = taxonomy.claimRecords[19];
    expect(r20.sourceChecked).toContain('3dgs-2023');
    expect(r20.sourceChecked).toContain('https://arxiv.org/abs/2308.04079');
    expect(r20.note).toContain('novel-view synthesis');
    expect(r20.note).toContain('visibility-aware rendering algorithm');
    expect(r20.note).toContain("'world model' and 'action' appear nowhere in the abstract");
  });

  it('pairs every plan part with registered-citation evidence at the registered URLs', () => {
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    const expected: Readonly<Record<string, { citation: string; url: string; needle: string }[]>> = {
      'taxonomy-16-worldvla-20260916h': [
        { citation: 'worldvla-2025', url: 'https://arxiv.org/html/2506.21539', needle: 'three separate tokenizers to encode images, text, and actions' },
        { citation: 'worldvla-2025', url: 'https://arxiv.org/abs/2506.21539', needle: 'autoregressive action world model that unifies action and image understanding and generation' },
      ],
      'taxonomy-17-cosmos-policy-20260916h': [
        { citation: 'cosmos-policy-2026', url: 'https://arxiv.org/abs/2601.16163', needle: 'a single stage of post-training' },
        { citation: 'cosmos-policy-2026', url: 'https://arxiv.org/abs/2601.16163', needle: 'encoded as latent frames' },
      ],
      'taxonomy-18-occworld-20260916h': [
        { citation: 'occworld-2023', url: 'https://arxiv.org/abs/2311.16038', needle: '3D Occupancy space' },
        { citation: 'occworld-2023', url: 'https://arxiv.org/abs/2311.16038', needle: 'without using instance and map supervision' },
      ],
      'taxonomy-19-mujoco-20260916h': [
        { citation: 'mujoco-2012', url: 'https://doi.org/10.1109/IROS.2012.6386109', needle: 'a new physics engine tailored to model-based control' },
        { citation: 'mujoco-2012', url: 'https://doi.org/10.1109/IROS.2012.6386109', needle: 'forward and inverse dynamics' },
      ],
      'taxonomy-20-3dgs-20260916h': [
        { citation: '3dgs-2023', url: 'https://arxiv.org/abs/2308.04079', needle: 'novel-view synthesis' },
        { citation: '3dgs-2023', url: 'https://arxiv.org/abs/2308.04079', needle: 'visibility-aware rendering algorithm' },
      ],
    };
    for (const [planId, items] of Object.entries(expected)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.evidence).toHaveLength(items.length);
      plan.evidence.forEach((item, i) => {
        expect(item.citationId).toBe(items[i]!.citation);
        expect(item.sourceUrl).toBe(items[i]!.url);
        expect(item.supportingPassage).toContain(items[i]!.needle);
      });
    }
  });

  it('uses the five registered citations with no new registration', () => {
    const registered = new Map(CITATIONS.map((c) => [c.id, c]));
    for (const [id, url, year] of [
      ['worldvla-2025', 'https://arxiv.org/abs/2506.21539', 2025],
      ['cosmos-policy-2026', 'https://arxiv.org/abs/2601.16163', 2026],
      ['occworld-2023', 'https://arxiv.org/abs/2311.16038', 2023],
      ['mujoco-2012', 'https://doi.org/10.1109/IROS.2012.6386109', 2012],
      ['3dgs-2023', 'https://arxiv.org/abs/2308.04079', 2023],
    ] as const) {
      expect(registered.get(id)?.url).toBe(url);
      expect(registered.get(id)?.year).toBe(year);
    }
    expect(CITATIONS.filter(({ id }) => id === 'occworld-2023')).toHaveLength(1);
    expect(CITATIONS.filter(({ id }) => id === '3dgs-2023')).toHaveLength(1);
  });

  it('preserves row 4’s historical incomplete standing plan before typed count closure', () => {
    const markdown = readFileSync(join(ROOT, 'audit/evidence/crossdomain-closure-20260923/before-audit--world-models.md.txt'), 'utf8');
    const compoundPlans = parseCompoundPlans([
      ...JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
      ...JSON.parse(readFileSync(join(ROOT, 'audit/evidence/crossdomain-closure-20260923/superseded-plans.json'), 'utf8')),
    ]).filter((plan) => !plan.id.startsWith('world-rl-'));
    const registryIds = new Set(CITATIONS.map(({ id }) => id));
    const sections = parseLedger('audit/world-models.md', markdown, registryIds, { compoundPlans });
    const taxonomy = sections.find((section) => section.slug === 'taxonomy')!;
    const record = taxonomy.claimRecords[HELD_ORDINAL - 1];
    expect(record.compound?.planId ?? '').toBe(HELD_STANDING_PLAN);
    expect(record.verdict).toBe('unresolved');
    expect(record.evidenceFailures.length).toBeGreaterThan(0);
  });

  it('records integrator plan review on every 20260916h taxonomy plan', () => {
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    for (const planId of Object.values(EXPECTED_20260916H)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toMatch(/GLM-5\.3\/max integrator/);
      expect(plan.planReview?.rationale).toContain(PACKET_SHA);
    }
  });
});
