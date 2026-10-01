import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCENE_TARGETS } from '@/lib/motion-scene-registry';
import { expectedSceneRole, registeredRoleScenes } from '@/lib/motion-scene-roles';
import {
  contactSheetPlan, sceneBundleBudget, sceneSheetDomains, verifySceneCaptures,
} from '../../scripts/motion-convergence';

const ROOT = join(__dirname, '../..');

describe('site-wide motion convergence', () => {
  it('registers every scene module exactly once with a real mount and complete beats', () => {
    const files = readdirSync(join(ROOT, 'components/motion/scenes'))
      .filter((name) => name.endsWith('.tsx'))
      .map((name) => name.slice(0, -4)).sort();
    const ids = SCENE_TARGETS.map((scene) => scene.id);
    // Eight scenes remain once every scene that repeated its page's lab was
    // deleted; retiring another one is a reviewed change to this floor.
    expect(ids.length).toBeGreaterThanOrEqual(8);
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
    expect(expectedSceneRole('reliability-threshold', 'episode-0')).toBe('value');
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

  it('finds every captured beat and poster with a clean geometry/contrast audit', () => {
    const plans = verifySceneCaptures(ROOT, SCENE_TARGETS);
    expect(plans).toHaveLength(2);
    const beats = SCENE_TARGETS.reduce((sum, scene) => sum + scene.beats, 0);
    expect(plans.map((plan) => plan.rows.reduce((sum, row) => sum + row.beats, 0)))
      .toEqual([beats, beats]);
    const evidence = JSON.parse(readFileSync(
      join(ROOT, 'evidence/motion/scenes/site-wide/manifest.json'), 'utf8',
    )) as {
      scenes: number; beatImagesPerViewport: number; budgetBytes: number;
      chunks: { id: string; gzipBytes: number; withinBudget: boolean }[];
      sheets: string[]; images: { path: string; sha256: string }[];
    };
    expect(evidence.scenes).toBe(SCENE_TARGETS.length);
    expect(evidence.beatImagesPerViewport).toBe(beats);
    expect(evidence.images.map(({ path }) => path))
      .toEqual(plans.flatMap((plan) => plan.rows.flatMap((row) => row.images)));
    for (const image of evidence.images) {
      expect(image.sha256, image.path).toBe(createHash('sha256')
        .update(readFileSync(join(ROOT, image.path))).digest('hex'));
    }
    // One site-wide sheet per width, plus one per domain that still has a
    // scene; a domain whose scenes all repeated a lab gets no sheet.
    expect([...evidence.sheets].sort()).toEqual(['375', '1440'].flatMap((width) => [
      `${width}-contact-sheet.png`,
      ...sceneSheetDomains(SCENE_TARGETS).map((domain) => `${width}-${domain}.png`),
    ]).sort());
    for (const sheet of evidence.sheets) {
      expect(readFileSync(join(ROOT, 'evidence/motion/scenes/site-wide', sheet)).length)
        .toBeGreaterThan(10_000);
    }
    expect(evidence.chunks.map(({ id }) => id)).toEqual(SCENE_TARGETS.map(({ id }) => id));
    for (const chunk of evidence.chunks) {
      expect(chunk.withinBudget).toBe(true);
      expect(chunk.gzipBytes, chunk.id).toBeLessThanOrEqual(evidence.budgetBytes);
    }
  });

  it('keeps observed mark-to-hex evidence current for every scene source and token', () => {
    const evidence = JSON.parse(readFileSync(
      join(ROOT, 'evidence/motion/scenes/site-wide/roles.json'), 'utf8',
    )) as {
      motionSpecSha256: string;
      palette: Record<string, string>;
      scenes: { id: string; route: string; sourceSha256: string;
        marks: { mark: string; role: string; hex: string; beats: number[] }[] }[];
    };
    const hash = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
    expect(evidence.motionSpecSha256).toBe(hash(join(ROOT, 'motion-tokens.json')));
    expect(evidence.scenes.map(({ id }) => id)).toEqual(SCENE_TARGETS.map(({ id }) => id));
    for (const [index, scene] of evidence.scenes.entries()) {
      expect(scene.route).toBe(SCENE_TARGETS[index].route);
      expect(scene.sourceSha256).toBe(hash(join(ROOT, 'components/motion/scenes', `${scene.id}.tsx`)));
      expect(scene.marks.length, scene.id).toBeGreaterThan(0);
      for (const mark of scene.marks) {
        const expected = expectedSceneRole(scene.id, mark.mark);
        expect(expected === 'gait-phase' ? ['state', 'constraint'] : [expected])
          .toContain(mark.role);
        expect(mark.hex).toBe(evidence.palette[mark.role]);
        expect(mark.beats.every((beat) => beat >= 1 && beat <= SCENE_TARGETS[index].beats))
          .toBe(true);
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
