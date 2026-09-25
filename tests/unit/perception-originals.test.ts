import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

/**
 * Pins the 2026-09-16g perception-originals integration: the two dispatched
 * classical/perception rows (originals 9 and 17, tsai-lenz-1989 IEEE public
 * abstract evidence completion) must bind to their compound plans and parse
 * complete (no evidence failures) with supported adjudications, from the
 * committed ledger and catalog exactly as check-audit-coverage reads them.
 * The six schema-held rows (1, 2, 3, 7, 19, 59) stay unbound and incomplete.
 */
const ROOT = join(import.meta.dirname, '../..');
const PACKET_SHA = 'a707a050bb4ec32d61d9436284360a2454cd9a64f9c3e6277d5d6fa9c97488cb';
const EXPECTED_20260916G: Readonly<Record<number, string>> = {
  9: 'perception-9-tsai-solve-20260916g',
  17: 'perception-17-tsai-protocol-20260916g',
};
const HELD_ORDINALS = [1, 2, 3, 7, 19, 59];

describe('perception originals integration (2026-09-16g evidence completions)', () => {
  it('binds the two applied perception rows to complete compound evidence', () => {
    const markdown = readFileSync(join(ROOT, 'audit/classical.md'), 'utf8');
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    const registryIds = new Set(CITATIONS.map(({ id }) => id));
    const sections = parseLedger('audit/classical.md', markdown, registryIds, { compoundPlans });
    const perception = sections.find((section) => section.slug === 'perception');
    expect(perception).toBeDefined();
    for (const [ordinal, planId] of Object.entries(EXPECTED_20260916G)) {
      const record = perception!.claimRecords[Number(ordinal) - 1];
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

  it('carries the tsai-lenz abstract evidence needles in the bound rows and plans', () => {
    const markdown = readFileSync(join(ROOT, 'audit/classical.md'), 'utf8');
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    const registryIds = new Set(CITATIONS.map(({ id }) => id));
    const sections = parseLedger('audit/classical.md', markdown, registryIds, { compoundPlans });
    const perception = sections.find((section) => section.slug === 'perception')!;

    // Row 9: evidence completion of the standing C verdict; the sourceChecked
    // cell records the fetch of record and the passage's own solve wording.
    const r9 = perception.claimRecords[8];
    expect(r9.sourceChecked).toContain('https://doi.org/10.1109/70.34770');
    expect(r9.sourceChecked).toContain('fetch of record 2026-09-16T11:48:21.322Z');
    expect(r9.sourceChecked).toContain(
      'computing position and orientation of a camera relative to the last joint',
    );
    expect(r9.verdict).toContain('Tsai and Lenz solve the camera-to-gripper transform');
    expect(r9.note).toContain('Evidence completion of the standing C verdict');

    // Row 17: protocol mechanics verified; the precision disclosure that the
    // abstract prints neither "static target" nor "AX = XB" stays in the note.
    const r17 = perception.claimRecords[16];
    expect(r17.sourceChecked).toContain('https://doi.org/10.1109/70.34770');
    expect(r17.note).toContain("does not print 'static target'");

    // Both plans carry the exact abstract passages against the registered URL.
    for (const planId of Object.values(EXPECTED_20260916G)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.evidence).toHaveLength(plan.parts.length);
      for (const item of plan.evidence) {
        expect(item.citationId).toBe('tsai-lenz-1989');
        expect(item.sourceUrl).toBe('https://doi.org/10.1109/70.34770');
      }
    }
    const p9 = compoundPlans.find((p) => p.id === EXPECTED_20260916G[9])!;
    expect(p9.evidence[0].supportingPassage).toBe(
      'The authors describe a novel technique for computing position and orientation of a camera relative to the last joint of a robot manipulator in an eye-on-hand configuration.',
    );
    const p17 = compoundPlans.find((p) => p.id === EXPECTED_20260916G[17])!;
    expect(p17.evidence[0].supportingPassage).toContain(
      'The robot makes a series of automatically planned movements with a camera rigidly mounted at the gripper.',
    );
    expect(p17.evidence[0].supportingPassage).toContain(
      'it takes a total of 90 ms to grab an image, extract image feature coordinates, and perform camera extrinsic calibration',
    );
  });

  it('uses the registered tsai-lenz-1989 citation with no new registration', () => {
    const registered = CITATIONS.filter(({ id }) => id === 'tsai-lenz-1989');
    expect(registered).toHaveLength(1);
    expect(registered[0].url).toBe('https://doi.org/10.1109/70.34770');
    expect(registered[0].year).toBe(1989);
    expect(registered[0].title).toBe(
      'A new technique for fully autonomous and efficient 3D robotics hand/eye calibration',
    );
  });

  it('keeps the six schema-held rows unbound and evidence-incomplete', () => {
    const markdown = readFileSync(join(ROOT, 'audit/classical.md'), 'utf8');
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    const registryIds = new Set(CITATIONS.map(({ id }) => id));
    const sections = parseLedger('audit/classical.md', markdown, registryIds, { compoundPlans });
    const perception = sections.find((section) => section.slug === 'perception')!;
    for (const ordinal of HELD_ORDINALS) {
      const record = perception.claimRecords[ordinal - 1];
      expect(record.compound?.planId ?? '').toBe('');
      expect(record.evidenceFailures.length).toBeGreaterThan(0);
    }
  });

  it('records integrator plan review on every 20260916g perception plan', () => {
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    for (const planId of Object.values(EXPECTED_20260916G)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toMatch(/^integrator (?:[0-9a-f]{8}|techwithdraw-20260924)\b/);
      expect(plan.planReview?.rationale).toContain(PACKET_SHA);
    }
  });
});
