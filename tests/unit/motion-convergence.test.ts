import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCENE_TARGETS } from '@/lib/motion-scene-registry';
import { expectedSceneRole, registeredRoleScenes } from '@/lib/motion-scene-roles';
import { contactSheetPlan, sceneBundleBudget, verifySceneCaptures } from '../../scripts/motion-convergence';

const ROOT = join(__dirname, '../..');

describe('site-wide motion convergence', () => {
  it('registers every scene module exactly once with a real mount and complete beats', () => {
    const files = readdirSync(join(ROOT, 'components/motion/scenes'))
      .filter((name) => name.endsWith('.tsx'))
      .map((name) => name.slice(0, -4)).sort();
    const ids = SCENE_TARGETS.map((scene) => scene.id);
    // Eight scenes remained once every scene that repeated its page's lab
    // was deleted. The owner's front-page decision of 13 October 2026 put the
    // humanoid explainer in place of the reliability scene, whose only mount
    // was home, so it was retired; retiring another one is a reviewed change
    // to this floor.
    expect(ids.length).toBeGreaterThanOrEqual(7);
    expect(ids).not.toContain('reliability-threshold');
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(files);
    for (const scene of SCENE_TARGETS) {
      const source = readFileSync(join(ROOT, 'components/motion/scenes', `${scene.id}.tsx`), 'utf8');
      expect(source).toContain(`id: '${scene.id}'`);
      expect((source.match(/\bcaption:\s*['`\n]/g) ?? []).length, scene.id).toBe(scene.beats);
      expect(source).toContain('<SceneMount');
      expect(scene.route).toMatch(/^\/(?:[a-z0-9-/]+\/)?$/);
    }
  });

  it('registers role semantics for the whole scene census, with shared quantities aligned', () => {
    expect(registeredRoleScenes().sort()).toEqual(SCENE_TARGETS.map((scene) => scene.id).sort());
    // A retired scene keeps no role rules, so a mark it drew has no role.
    expect(() => expectedSceneRole('reliability-threshold', 'episode-0')).toThrow(/semantic roles/);
    // Time that produces work is a value and time spent on cost is a
    // constraint, in every scene that splits time.
    expect(expectedSceneRole('batch-scale', 'fixed-budget-time')).toBe('value');
    expect(expectedSceneRole('jam-overhead', 'productive-time')).toBe('value');
    expect(expectedSceneRole('batch-scale', 'cpu-cost-time')).toBe('constraint');
    expect(expectedSceneRole('jam-overhead', 'downtime')).toBe('constraint');
    expect(expectedSceneRole('tactile-slip', 'held-object')).toBe('state');
    expect(() => expectedSceneRole('jam-overhead', 'unclassified')).toThrow(/semantic roles/);
  });

  it('reconciles the six independently reviewed figure inventories with the scene registry', () => {
    const domains = [
      'classical', 'manipulation', 'rl-sim2real', 'world-models',
      'data-hardware', 'frontier-adjacent-home',
    ];
    const rows = domains.flatMap((domain) => JSON.parse(readFileSync(
      join(ROOT, 'docs/design', `motion-${domain}-inventory.json`), 'utf8',
    )) as { article: string; element: string; teachingGoal: string; sceneId?: string }[]);
    expect(rows.length).toBeGreaterThan(100);
    for (const row of rows) {
      expect(row.teachingGoal.length, `${row.article} ${row.element}`).toBeGreaterThan(25);
    }
    expect([...new Set(rows.flatMap((row) => row.sceneId ? [row.sceneId] : []))].sort())
      .toEqual(SCENE_TARGETS.map((scene) => scene.id).sort());
  });

  it('plans every beat of every registered scene at both widths, never a sample', () => {
    const expected = SCENE_TARGETS.reduce((sum, scene) => sum + scene.beats, 0);
    const plan = contactSheetPlan(SCENE_TARGETS);
    expect(plan.map((sheet) => sheet.viewport)).toEqual([375, 1440]);
    for (const sheet of plan) {
      expect(sheet.rows.map((row) => row.id)).toEqual(SCENE_TARGETS.map((scene) => scene.id));
      expect(sheet.rows.flatMap((row) => row.images)).toHaveLength(expected);
      for (const row of sheet.rows) {
        expect(row.images).toEqual(Array.from({ length: row.beats }, (_, index) =>
          `evidence/motion/scenes/${row.id}/${sheet.viewport}-beat-${index + 1}.png`));
      }
    }
  });

  it('rejects an absent beat or a scene without an individually attributable production chunk', () => {
    const root = mkdtempSync(join(tmpdir(), 'motion-convergence-'));
    try {
      const chunks = join(root, '.next/static/chunks');
      mkdirSync(chunks, { recursive: true });
      writeFileSync(join(chunks, 'sample.js'), 'const scene={id:"sample"};');
      expect(sceneBundleBudget(chunks, [{ id: 'sample', route: '/example/', beats: 1 }]))
        .toEqual([expect.objectContaining({ id: 'sample', withinBudget: true })]);
      expect(() => sceneBundleBudget(chunks, [{ id: 'missing', route: '/example/', beats: 1 }]))
        .toThrow(/missing.*production chunk/i);
      expect(() => contactSheetPlan([{ id: 'sample', route: '/example/', beats: 0 }]))
        .toThrow(/beat/i);
      expect(() => verifySceneCaptures(root, [{ id: 'sample', route: '/example/', beats: 1 }]))
        .toThrow(/missing audit/i);
      const evidence = join(root, 'evidence/motion/scenes/sample');
      mkdirSync(evidence, { recursive: true });
      const audit: Record<string, { intersections: string[]; overflow: string[]; lowContrast: string[] }> =
        Object.fromEntries([375, 1440].flatMap((viewport) =>
        ['reduced poster', 'poster', 'beat 1'].map((label) =>
          [`${viewport} ${label}`, { intersections: [], overflow: [], lowContrast: [] }])));
      writeFileSync(join(evidence, 'audit.json'), JSON.stringify(audit));
      expect(() => verifySceneCaptures(root, [{ id: 'sample', route: '/example/', beats: 1 }]))
        .toThrow(/missing scene capture/);
      for (const viewport of [375, 1440]) {
        for (const label of ['reduced-poster', 'poster', 'beat-1']) {
          writeFileSync(join(evidence, `${viewport}-${label}.png`), '');
        }
      }
      expect(verifySceneCaptures(root, [{ id: 'sample', route: '/example/', beats: 1 }]))
        .toHaveLength(2);
      audit['375 beat 1'].lowContrast.push('Play');
      writeFileSync(join(evidence, 'audit.json'), JSON.stringify(audit));
      expect(() => verifySceneCaptures(root, [{ id: 'sample', route: '/example/', beats: 1 }]))
        .toThrow(/visual audit failures/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects a gzip budget overflow instead of reporting an uncompressed source size', () => {
    const root = mkdtempSync(join(tmpdir(), 'motion-budget-'));
    try {
      const chunks = join(root, '.next/static/chunks');
      mkdirSync(chunks, { recursive: true });
      // Distinct bytes remain large after gzip. Keep the fixture off the tracked tree.
      const entropy = Array.from({ length: 1_000 }, (_, i) =>
        createHash('sha256').update(String(i)).digest('hex')).join('');
      writeFileSync(join(chunks, 'scene.js'), `const s={id:"oversize"};${entropy}`);
      expect(sceneBundleBudget(chunks, [{ id: 'oversize', route: '/example/', beats: 1 }])[0].withinBudget)
        .toBe(false);
      writeFileSync(join(chunks, 'shared.js'), `const sceneA={id:"oversize"},sceneB={id:"peer"};${entropy}`);
      writeFileSync(join(chunks, 'peer.js'), 'const peer={id:"peer"};');
      const sizes = sceneBundleBudget(chunks, [
        { id: 'oversize', route: '/example/', beats: 1 },
        { id: 'peer', route: '/other/', beats: 1 },
      ]);
      expect(sizes[0].chunks).toEqual(['scene.js', 'shared.js']);
      expect(() => sceneBundleBudget(chunks, [
        { id: 'peer', route: '/other/', beats: 1 },
        { id: 'oversize', route: '/example/', beats: 1 },
        { id: 'absent', route: '/third/', beats: 1 },
      ])).toThrow(/absent.*production chunk/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
