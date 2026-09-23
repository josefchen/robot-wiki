import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { preservedApprovalPacket } from '../helpers/continuation-integration';
import { headReanchorFor } from './helpers/continuation-merge-ledger';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import {
  compoundPartDigest,
  compoundPlanDigest,
  originalClaimDigest,
  parseCompoundPlans,
  parseLedger,
  type CompoundPlan,
} from '../../lib/audit-ledger';
import {
  buildManifest,
  validateApprovedDeltas,
  type ApprovedDelta,
  type ManifestInput,
} from '../../lib/brand-v2-baseline';
import { relationshipManifestInputs } from '../../lib/relationship-manifest';

const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const read = (path: string) => readFileSync(path, 'utf8');
const scenePath = 'content/classical/scene-representation.mdx';
const scene = read(scenePath);
const glossary = read('data/glossary.ts');
const interactive = read('lib/scene-representation.ts');
const ledger = read('audit/classical.md');
const plans = parseCompoundPlans(JSON.parse(read('audit/compound-evidence.json')));
const planId = 'classical-scene-representation-10-kinectfusion-correction-20260922';
const ids = new Set(CITATIONS.map(({ id }) => id));
const citations = Object.fromEntries(['scene-representation', 'perception'].map((slug) => [
  slug, matter(read(`content/classical/${slug}.mdx`)).data.citations as string[],
]));
const records = (slug: string, catalog = plans) => parseLedger(
  'audit/classical.md', ledger, ids, { compoundPlans: catalog, articleCitations: citations },
).find((section) => section.slug === slug)!.claimRecords;
const selected = () => records('scene-representation')[9];
const plan = () => {
  const result = plans.find(({ id }) => id === planId);
  expect(result, 'reviewed four-part TSDF plan').toBeDefined();
  return result!;
};
const partIds = ['projective-distance', 'interface-normal', 'ray-marching', 'interpolated-intersection'];
const sourceUrl = 'https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/ismar2011.pdf';
const oldStores = 'Signed distance to the nearest surface plus a fusion weight, kept in a narrow band around the surface.';
const newStores = 'A truncated projective signed-distance estimate plus a fusion weight, used to reconstruct the observed surface.';
const oldNormal = 'the gradient of the field is the surface normal, which is what a collision query wants';
const newNormal = 'KinectFusion estimates a normal from numerical field derivatives near the surface, under an orthogonality assumption';

describe('scene original 10: source-scoped TSDF correction', () => {
  it('replaces universal collision promises with the four qualified paper operations', () => {
    for (const text of [
      'KinectFusion distinguishes its projective TSDF from a true discrete signed-distance field.',
      'correct exactly at the surface or for an isolated point measurement',
      'approximate pseudo-Euclidean distance metric',
      'Near the zero level set, the method assumes the field gradient is orthogonal',
      'Surface prediction marches along each ray to a zero crossing',
      'approximates the intersection using trilinearly interpolated field values <Cite id="kinectfusion-2011" />',
    ]) expect(scene).toContain(text);
    expect(scene).not.toContain('stored distance *is* the collision margin');
    expect(scene).not.toContain('a collision query is a lookup rather than a search');
    expect(scene).not.toContain('the quantity their cost function needs is already sitting in the voxel');
    expect(matter(scene).data.lastReviewed).toBe('2026-08-22');
  });

  it('corrects the shared definition without retaining an exact collision margin promise', () => {
    expect(glossary).toContain('Curless and Levoy fuse weighted signed distances measured along sensor lines of sight.');
    expect(glossary).toContain('KinectFusion uses a projective truncated field rather than a true discrete signed-distance field');
    expect(glossary).toContain('not by treating every stored value as an exact collision margin');
    expect(glossary).not.toContain('the distance value is itself the collision margin');
  });

  it('changes exactly two interactive strings, preserving all geometry, grades and calculations', () => {
    expect(interactive).toContain(newStores);
    expect(interactive).toContain(newNormal);
    expect(interactive).not.toContain(oldStores);
    expect(interactive).not.toContain(oldNormal);
    expect(hash(interactive.replace(newStores, oldStores).replace(newNormal, oldNormal)))
      .toBe('327adc4bd8e96fb552c4fc86ed9f47013f2e3efde66b068e5e625dd09943194d');
  });

  it('records C, not validation of the former claim, with exact original history', () => {
    const row = selected();
    expect(row.verdict).toBe('C');
    expect(row.evidenceFailures).toEqual([]);
    expect(row.compound?.planId).toBe(planId);
    expect(row.note).toContain('Original four-cell tuple (JSON):');
    expect(row.note).toContain('833a900270e11b09e5503e395d53c3365d1edfdb42f4fb33736077c8bcdf2f90');
    expect(ledger).toContain('Scene TSDF correction history, 2026-09-22');
    expect(row.sourceChecked).toContain('historical 2026-09-06 GET');
  });

  it('requires all four scientific parts and exact primary-document pairs', () => {
    const value = plan();
    expect(value.parts.map(({ id }) => id)).toEqual(partIds);
    expect(value.parts.every(({ requiredCitationIds }) =>
      JSON.stringify(requiredCitationIds) === '["kinectfusion-2011"]')).toBe(true);
    expect(value.evidence.map(({ partId, citationId, sourceUrl: url }) =>
      [partId, citationId, url])).toEqual(partIds.map((id) => [id, 'kinectfusion-2011', sourceUrl]));
    expect(value.originalCellsDigest).toBe(originalClaimDigest(selected()));
  });

  it('binds actual semantic reviews to the final tuple and literal evidence', () => {
    const value = plan();
    expect(value.planReview?.reviewedBy).toContain('source-auditor');
    expect(value.planReview?.planDigest).toBe(compoundPlanDigest(value));
    expect(value.adjudications.map(({ partId }) => partId)).toEqual(partIds);
    for (const review of value.adjudications) {
      expect(review.outcome).toBe('supported');
      expect(review.evidenceDigest).toBe(compoundPartDigest(value, review.partId));
    }
  });

  it('retains the primary approximation and orthogonality limitations rather than article text as proof', () => {
    const evidence = plan().evidence;
    expect(evidence[0].supportingPassage).toContain('Instead, we use a projective truncated signed');
    expect(evidence[0].supportingPassage).toContain('The projective TSDF measurement is only correct exactly at the');
    expect(evidence[0].supportingPassage).toContain('pseudo-Euclidean metric');
    expect(evidence[1].supportingPassage).toContain('is assumed that the gradient of the TSDF at p is orthogonal');
    expect(evidence[1].supportingPassage).toContain('numerical derivative of the SDF');
    expect(evidence[2].supportingPassage).toContain('Marching also stops');
    expect(evidence[3].supportingPassage).toContain('As this is expensive we use a simple approximation.');
    expect(evidence[3].supportingPassage).toContain('trilinearly interpolated SDF values');
  });

  it('rejects a missing required pair even after the remaining reviews are re-signed', () => {
    for (const id of partIds) {
      const changed = structuredClone(plan());
      changed.evidence = changed.evidence.filter(({ partId }) => partId !== id);
      changed.adjudications.forEach((review) => {
        review.evidenceDigest = compoundPartDigest(changed, review.partId);
      });
      expect(records('scene-representation', plans.map((p) => p.id === planId ? changed : p))[9]
        .evidenceFailures.length).toBeGreaterThan(0);
    }
  });

  it('fails closed on stale tuples, absent reviews, wrong pairs and unresolved adjudications', () => {
    const mutations: Array<(value: CompoundPlan) => void> = [
      (value) => { value.originalCellsDigest = '0'.repeat(64); },
      (value) => { value.planReview = null; },
      (value) => { value.adjudications = []; },
      (value) => { value.evidence[0].citationId = 'orb-slam-2015'; },
      (value) => { value.evidence[0].supportingPassage = ''; },
      (value) => { value.adjudications[0].outcome = 'unresolved'; },
      (value) => { value.parts[0].text += ' exact collision guarantee'; },
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(plan());
      mutate(changed);
      expect(records('scene-representation', plans.map((p) => p.id === planId ? changed : p))[9]
        .evidenceFailures.length).toBeGreaterThan(0);
    }
  });

  it('appends after the exact 862-plan prefix without reapplying prior records', () => {
    expect(hash(JSON.stringify(plans.slice(0, 862))))
      .toBe('51695cf441132d5df905968ce26d654b0b537b3df96a61d1eff4aeccfc54c81e');
    expect(plans[862]?.id).toBe(planId);
  });

  it('approves only the three actually changed native members with the prior prefix intact', () => {
    const entries = (JSON.parse(read('contract/brand-v2-approved-deltas.json')) as {
      entries: ApprovedDelta[];
    }).entries;
    expect(hash(JSON.stringify(preservedApprovalPacket('ca9cb43'))))
      .toBe('72ae640be3ebfcb61925bce105da674e79b8ce3e14fd50f18bf727d5223322df');
    const mine = entries.filter(({ id }) => id.startsWith('scene-tsdf-10-20260922-'));
    expect(mine.map(({ manifest, memberId }) => [manifest, memberId])).toEqual([
      ['prose', 'article:classical/scene-representation'],
      ['relationships', 'article:classical/scene-representation'],
      ['article-metadata', 'canonical-metadata-source:data/glossary.ts'],
    ]);
    expect(validateApprovedDeltas(mine)).toEqual([]);
    const inputs: ManifestInput[] = [
      { id: 'article:classical/scene-representation', value: { path: scenePath, body: matter(scene).content.trim() } },
      relationshipManifestInputs(process.cwd()).find(({ id }) => id === 'article:classical/scene-representation')!,
      { id: 'canonical-metadata-source:data/glossary.ts', value: { path: 'data/glossary.ts', sourceHash: hash(glossary) } },
    ];
    mine.forEach((delta, index) => {
      expect(delta.oldHash).not.toBe(delta.newHash);
      // A later authorized MTBF repair also changes the shared glossary.
      // Preserve this exact approval and require an unbroken member chain,
      // rather than pretending the scene checkpoint remains the latest one.
      let latestHash = delta.newHash;
      for (const later of entries.slice(entries.indexOf(delta) + 1).filter((entry) =>
        entry.manifest === delta.manifest && entry.memberId === delta.memberId &&
        !entry.id.startsWith('continuation-merge-'))) {
        expect(later.oldHash).toBe(latestHash);
        latestHash = later.newHash;
      }
      const merged = headReanchorFor(entries, delta.manifest, delta.memberId);
      expect(merged?.newHash ?? latestHash).toBe(buildManifest(delta.manifest, [inputs[index]]).members[0].hash);
    });
  });

  it('keeps both perception originals held with exact pre-repair tuple history', () => {
    const perception = records('perception');
    for (const [ordinal, digest] of [
      [2, 'ff0857820d7640fb63c0cdf7f8d3f78f63c79f9fed512e9ac45aac298be75221'],
      [19, 'f44359936c1c85d67c959bad349a60a7ed2f1db49d9832a703e056f11321ad1a'],
    ] as const) {
      expect(perception[ordinal - 1].verdict).toBe('UNRESOLVED');
      expect(perception[ordinal - 1].note).toContain('Original four-cell tuple (JSON):');
      expect(perception[ordinal - 1].note).toContain(digest);
      expect(perception[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    }
  });
});
