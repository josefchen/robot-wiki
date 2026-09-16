import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';

const catalog = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ledger = readFileSync('audit/classical.md', 'utf8');
const ids = new Set(CITATIONS.map(c => c.id));
const selected = [12, 13, 14, 15, 16];
const partCounts = [5, 3, 3, 5, 3];
const records = (plans = catalog) => parseLedger('audit/classical.md', ledger, ids,
  { compoundPlans: plans }).find(s => s.slug === 'scene-representation')!.claimRecords;

describe('source-scoped neural scene originals 12 through 16', () => {
  it.each(selected)('binds corrected original %i with complete final-tuple reviews and immutable history', ordinal => {
    const plan = catalog.find(p => p.id === `neural-scene-${ordinal}-20260908`);
    expect(plan).toBeDefined();
    expect(plan!.rowOrdinal).toBe(ordinal);
    expect(plan!.parts).toHaveLength(partCounts[selected.indexOf(ordinal)]);
    expect(plan!.adjudications).toHaveLength(plan!.parts.length);
    const row = records()[ordinal - 1];
    expect(row.evidenceFailures).toEqual([]);
    expect(row.verdict).toBe('corrected');
    expect(row.note).toContain('Original four-cell tuple (JSON):');
    expect(row.note).toContain('not a new fetch');
    expect(row.compound?.planId).toBe(plan!.id);
  });

  it.each(selected)('rejects missing, wrong and stale evidence or review inputs for original %i', ordinal => {
    const original = catalog.find(p => p.id === `neural-scene-${ordinal}-20260908`);
    expect(original).toBeDefined();
    for (const mutation of ['missing', 'duplicate', 'passage', 'url', 'citation', 'review', 'unresolved', 'tuple', 'parts']) {
      const plan = structuredClone(original!);
      if (mutation === 'missing') plan.evidence.pop();
      if (mutation === 'duplicate') plan.evidence.push({ ...plan.evidence[0] });
      if (mutation === 'passage') plan.evidence[0].supportingPassage += ' changed';
      if (mutation === 'url') plan.evidence[0].sourceUrl = 'https://arxiv.org/abs/1011.0686';
      if (mutation === 'citation') plan.evidence[0].citationId = 'dagger-2011';
      if (mutation === 'review') plan.planReview = null;
      if (mutation === 'unresolved') plan.adjudications[0].outcome = 'unresolved';
      if (mutation === 'tuple') plan.originalCellsDigest = '0'.repeat(64);
      if (mutation === 'parts') plan.parts.pop();
      expect(records(catalog.map(p => p.id === plan.id ? plan : p))[ordinal - 1]
        .evidenceFailures.length, `${ordinal}/${mutation}`).toBeGreaterThan(0);
    }
  });

  it('keeps the static-scene, camera-input and two distinct rendering settings explicit', () => {
    const prose = readFileSync('content/classical/scene-representation.mdx', 'utf8');
    for (const text of ['separate radiance field to a static scene', 'camera poses, intrinsics and scene bounds',
      'smaller networks and fully fused CUDA kernels', '128 samples in 5 seconds at 1080p',
      'RTX 3090', 'separate large natural 360-degree scene', '10 frames per second',
      'not a robot reconstruction or control rate', "dataset's native image resolution",
      'not an explicit triangle surface carrying contact normals', 'surface extraction impossible'])
      expect(prose).toContain(text);
    expect(prose).not.toContain('collapsed training from hours to seconds');
    expect(prose).not.toContain('posed photographs alone suffice');
    expect(prose).toContain('lastReviewed: "2026-08-22"');
  });

  it('preserves audited URLs and binds only the inspected 3DGS venue edition', () => {
    for (const [id, arxiv] of [['nerf-2020', '2003.08934'], ['instant-ngp-2022', '2201.05989'],
      ['3dgs-2023', '2308.04079']])
      expect(CITATIONS.find(c => c.id === id)?.url).toBe(`https://arxiv.org/abs/${arxiv}`);
    expect(CITATIONS.find(c => c.id === '3dgs-2023')?.venue)
      .toBe('ACM Trans. Graph. 42(4), author manuscript (2023)');
    const library = readFileSync('lib/scene-representation.ts', 'utf8');
    expect(library).toContain('opacity controls alpha compositing rather than a calibrated');
    expect(library).toContain('deriving contact geometry is separate work');
    expect(library).toContain('bytesPerElement: 236');
    // Row 45 (demo unknown-vs-fill) was completed lawfully by the
    // scene-representation 20260916d integration; it must now stay complete.
    expect(records()[44].evidenceFailures).toEqual([]);
    expect(records()[44].compound?.planId).toBe('scene-representation-45-occluder-demo-20260916d');
  });
});
