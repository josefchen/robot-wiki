import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getImage } from '../../data/images';
import { adjacentCutPredecessor, adjacentCutSuccessorPaths } from '../../lib/audit-length-cut-adjacent-continuity';
import { lengthCutPredecessor, lengthCutSuccessorPaths } from '../../lib/audit-length-cut-continuity';
import {
  dataHardwareCutPredecessor, dataHardwareCutSuccessorPaths,
} from '../../lib/audit-length-cut-data-hardware-continuity';
import {
  frontierLengthCutPredecessor, frontierLengthCutSuccessorPaths,
} from '../../lib/audit-length-cut-frontier-continuity';
import {
  worldModelsLengthCutPredecessor, worldModelsLengthCutSuccessorPaths,
} from '../../lib/audit-length-cut-world-models-continuity';
import {
  IMAGE_MOUNT_CONTINUITY_DIR, imageMountIds, imageMountPredecessor, imageMountSuccessorPaths, imageMountsIn,
  keepsImageMountObligations, loadImageMountReview, verifyImageMountSource, withoutImageMounts,
} from '../../lib/audit-image-mount-continuity';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(join(root, path));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /image mount continuity drift/;
const blank = { bytes: 0, sha256: '' };
/** The blocks of an article body between blank lines, after the frontmatter. */
const blocks = (text: string) => text.replace(/^---\n[\s\S]*?\n---\n/, '').split(/\n[ \t]*\n/)
  .map((block) => block.trim()).filter(Boolean);

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('image mounts 2026-10-13 article successors', () => {
  const review = loadImageMountReview(root);

  it('reviews exactly the articles of images bundle A, the frontier images, adjacent bundle B and the data-hardware images', () => {
    expect(imageMountSuccessorPaths()).toEqual([
      'content/adjacent/autonomous-vehicles.mdx',
      'content/adjacent/drones.mdx',
      'content/adjacent/space.mdx',
      'content/adjacent/surgical.mdx',
      'content/classical/calibration.mdx',
      'content/classical/control.mdx',
      'content/classical/grasp-planning.mdx',
      'content/classical/kinematics.mdx',
      'content/classical/motion-planning.mdx',
      'content/classical/perception.mdx',
      'content/classical/ros2-for-ml-engineers.mdx',
      'content/classical/scene-representation.mdx',
      'content/classical/state-estimation.mdx',
      'content/data-hardware/data-bottleneck.mdx',
      'content/data-hardware/datasets.mdx',
      'content/data-hardware/evaluation-crisis.mdx',
      'content/data-hardware/hardware-taxonomy.mdx',
      'content/data-hardware/industrial-deployment.mdx',
      'content/data-hardware/robot-learning-stack.mdx',
      'content/data-hardware/teleop-rigs.mdx',
      'content/frontier/bear-case.mdx',
      'content/frontier/competing-theses.mdx',
      'content/frontier/dexterity.mdx',
      'content/frontier/generalization.mdx',
      'content/frontier/reliability-gap.mdx',
      'content/frontier/safety-and-assurance.mdx',
      'content/manipulation/action-chunking.mdx',
      'content/manipulation/action-spaces.mdx',
      'content/manipulation/bc-foundations.mdx',
      'content/manipulation/comparison-matrix.mdx',
      'content/manipulation/cross-embodiment.mdx',
      'content/manipulation/diffusion-policy.mdx',
      'content/manipulation/foundation-models.mdx',
      'content/manipulation/generalist-policies.mdx',
      'content/manipulation/hierarchical.mdx',
      'content/manipulation/knowledge-insulation.mdx',
      'content/manipulation/pi-line.mdx',
      'content/manipulation/realtime-execution.mdx',
      'content/manipulation/rl-finetuning.mdx',
      'content/manipulation/robot-learning-roadmap.mdx',
      'content/manipulation/vla-models.mdx',
      'content/rl-sim2real/humanoid-wbc.mdx',
      'content/rl-sim2real/legged-locomotion.mdx',
      'content/rl-sim2real/offline-rl.mdx',
      'content/rl-sim2real/parallel-sim-rl.mdx',
      'content/rl-sim2real/reward-design-mpc.mdx',
      'content/rl-sim2real/rl-for-robotics.mdx',
      'content/rl-sim2real/sim2real-transfer.mdx',
      'content/rl-sim2real/why-rl-locomotion.mdx',
      'content/world-models/evaluation.mdx',
      'content/world-models/generative-sim.mdx',
      'content/world-models/generative-video.mdx',
      'content/world-models/jepa.mdx',
      'content/world-models/latent-dynamics.mdx',
      'content/world-models/model-based-robot-learning.mdx',
      'content/world-models/taxonomy.mdx',
      'content/world-models/world-models-vs-simulators.mdx',
    ]);
  });

  it('admits only registered images with an external source and a recorded licence', () => {
    expect(imageMountIds()).toEqual([...new Set(review.sources.flatMap(({ mounts }) => mounts))].sort());
    for (const id of imageMountIds()) {
      const image = getImage(id);
      expect(image, id).toBeDefined();
      expect(['photograph', 'paper-figure'], id).toContain(image!.figureKind);
      expect(image!.sourceUrl, id).toMatch(/^https:\/\//);
      expect(image!.file, id).toBe(`/images/${id}.jpg`);
    }
  });

  it('gives every reviewed article 2 to 4 images, the first right after the lead paragraph', () => {
    for (const path of imageMountSuccessorPaths()) {
      const text = read(path).toString();
      const all = [...text.matchAll(/^<Image id="([^"]+)" \/>$/gm)].map((match) => match[1]);
      expect(all.length, path).toBeGreaterThanOrEqual(2);
      expect(all.length, path).toBeLessThanOrEqual(4);
      expect(new Set(all).size, path).toBe(all.length);
      const body = blocks(text);
      const lead = body.findIndex((block) => !block.startsWith('import '));
      // The lead paragraph is prose: it may open with a glossary term or citation, never a heading or component.
      expect(body[lead], path).toMatch(/^(?!#|<(?!Term\b|Cite\b))/);
      expect(body[lead + 1], path).toBe(`<Image id="${all[0]}" />`);
    }
  });

  it('rebuilds every reviewed successor into its recorded predecessor', () => {
    expect(review.sources.map(({ after }) => after.path)).toEqual(imageMountSuccessorPaths());
    for (const source of review.sources) {
      const live = read(source.after.path);
      const prior = imageMountPredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      expect(withoutImageMounts(live.toString())).toBe(prior.toString());
      expect(imageMountsIn(live.toString())).toEqual(source.mounts);
      expect(imageMountPredecessor(root, source.after, live)).toBe(live);
      // The rebuilt bytes are the successor of the length cut that last changed the article, which that layer
      // still decides: the world-models cut for world-models, the 2026-10-13 frontier cut (dexterity's later cut
      // included) for frontier, the adjacent cut for the adjacent articles of bundle B, the 2026-10-13
      // data-hardware cut for the data-hardware images of 2026-10-15, and the 2026-10-12 cut for the other
      // three domains.
      const domain = source.after.path.split('/')[1];
      const [olderPaths, olderPredecessor] = domain === 'world-models'
        ? [worldModelsLengthCutSuccessorPaths(), worldModelsLengthCutPredecessor]
        : domain === 'frontier'
          ? [frontierLengthCutSuccessorPaths(), frontierLengthCutPredecessor]
          : domain === 'adjacent'
            ? [adjacentCutSuccessorPaths(), adjacentCutPredecessor]
            : domain === 'data-hardware'
              ? [dataHardwareCutSuccessorPaths(), dataHardwareCutPredecessor]
              : [lengthCutSuccessorPaths(), lengthCutPredecessor];
      expect(olderPaths).toContain(source.after.path);
      expect(olderPredecessor(root, { path: source.after.path, ...blank }, prior)).not.toEqual(prior);
      expect(olderPredecessor(root, { path: source.after.path, ...blank }, live)).toBe(live);
    }
  });

  it('passes other bytes through and rejects a successor whose edits or mounts no longer hold', () => {
    const [source] = review.sources;
    const drifted = Buffer.concat([read(source.after.path), Buffer.from('\n')]);
    expect(imageMountPredecessor(root, source.before, drifted)).toBe(drifted);
    expect(imageMountPredecessor(root, { path: 'content/frontier/index.mdx', ...blank }, drifted)).toBe(drifted);
    expect(() => verifyImageMountSource(source, drifted)).toThrow(drift);
    const replaced = { ...source, edits: [{ before: '---\n\n', after: '---\n\nimport { X } from \'x\';\n\n' }] };
    expect(() => verifyImageMountSource(replaced, read(source.after.path))).toThrow(drift);
    expect(() => verifyImageMountSource({ ...source, mounts: source.mounts.slice(1) }, read(source.after.path)))
      .toThrow(drift);
  });

  it('admits only the listed image ids, each once, as a one-line mount and nothing else', () => {
    const prior = [
      '---', 'title: "A"', 'citations:', '  - a-2020', '---', '',
      'Opening words.', '', '## Next', '', 'A chain of links <Cite id="a-2020" />.', '', 'Closing words.', '',
    ].join('\n');
    const ids = new Set(['lead-photo', 'section-photo']);
    const mounted = prior
      .replace('Opening words.\n', 'Opening words.\n\n<Image id="lead-photo" />\n')
      .replace('<Cite id="a-2020" />.\n', '<Cite id="a-2020" />.\n\n<Image id="section-photo" />\n');
    const mounts = ['lead-photo', 'section-photo'];
    const path = 'content/x/y.mdx';
    const keeps = (current: string, list: readonly string[] = mounts) =>
      keepsImageMountObligations(path, prior, current, list, ids);
    expect(keeps(mounted)).toBe(true);
    expect(keeps(prior)).toBe(false);
    expect(keepsImageMountObligations('components/x.tsx', prior, mounted, mounts, ids)).toBe(false);
    // The recorded mounts are exactly the ones gained, in document order.
    expect(keeps(mounted, ['section-photo', 'lead-photo'])).toBe(false);
    expect(keeps(mounted, ['lead-photo'])).toBe(false);
    expect(keeps(mounted, [])).toBe(false);
    // Prose, a citation or a frontmatter field changed beside the mount.
    expect(keeps(mounted.replace('Opening words.', 'Opening.'))).toBe(false);
    expect(keeps(mounted.replace('<Cite id="a-2020" />', ''))).toBe(false);
    expect(keeps(mounted.replace('title: "A"', 'title: "B"'))).toBe(false);
    // An id outside the list, the same id twice, or a mount with other attributes.
    expect(keeps(mounted.replace('section-photo', 'other-photo'), ['lead-photo', 'other-photo'])).toBe(false);
    expect(keeps(mounted.replace('Closing words.', '<Image id="lead-photo" />\n\nClosing words.'))).toBe(false);
    expect(keeps(mounted.replace('<Image id="lead-photo" />', '<Image id="lead-photo" className="x" />')))
      .toBe(false);
    // The mount sits on its own line between blank lines.
    expect(keeps(mounted.replace('words.\n\n<Image id="lead-photo" />', 'words. <Image id="lead-photo" />')))
      .toBe(false);
  });

  it('rejects a missing, corrupt or renamed review', () => {
    const [source] = review.sources;
    for (const mode of ['missing', 'corrupt', 'renamed'] as const) {
      const tmp = mkdtempSync(join(tmpdir(), 'image-mount-continuity-test-'));
      scratchRoots.push(tmp);
      cpSync(join(root, IMAGE_MOUNT_CONTINUITY_DIR), join(tmp, IMAGE_MOUNT_CONTINUITY_DIR), { recursive: true });
      const path = join(tmp, IMAGE_MOUNT_CONTINUITY_DIR, 'source-transition.json');
      if (mode === 'missing') rmSync(path);
      else if (mode === 'corrupt') writeFileSync(path, mode);
      else writeFileSync(path, readFileSync(path, 'utf8').replace('"image-mounts-20261013"', '"image-mounts-drift"'));
      expect(() => loadImageMountReview(tmp)).toThrow(drift);
      expect(() => imageMountPredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
    }
  });
});
