import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('perception geometric-learning source boundaries', () => {
  it('describes local PointNet++ summaries without changing the preceding PointNet claim', () => {
    const article = read('content/classical/perception.mdx');
    const glossary = read('data/glossary.ts');
    expect(article).toContain('PointNet uses a shared per-point encoder and a symmetric pooling function');
    expect(article).toContain('building local features at growing scales');
    expect(article).toContain('small neighbourhoods hold too few samples');
    // Successor of 'not a guarantee that all geometry survives pooling' (2026-10-16): the
    // caveat is stated without the not-X construction the discovery sweep bans.
    expect(glossary).toContain('Pooling summarizes, so some geometry can be lost');
    expect(article).not.toContain('so local geometry survives the pooling');
  });

  it('binds DON timing to data collection, hardware and a new object', () => {
    const article = read('content/classical/perception.mdx');
    for (const phrase of [
      'moderately deformable',
      "the gripper's 6-DoF orientation needs further information",
    ]) expect(article).toContain(phrase);
    // The humanize pass of 2026-10-12 cut DON's per-object timing; restored, it must carry its conditions.
    if (article.includes('about 20 minutes')) {
      for (const phrase of ['including a handful of scenes', '3500 steps', 'about 13 minutes',
        'one 1080 Ti or Titan Xp', 'about 70 seconds']) expect(article).toContain(phrase);
    }
    expect(article).not.toContain('trained in about twenty minutes per object');
    expect(article).not.toContain('same descriptor across viewpoints and deformations');
  });

  it('separates Dex-Net synthetic examples, analytic labels and execution assumptions', () => {
    const article = read('content/classical/perception.mdx');
    // The humanize pass of 2026-10-12 left Dex-Net 2.0 to grasp planning, which states the same
    // synthetic data, label and execution assumptions; the pins moved there with the facts.
    const grasp = read('content/classical/grasp-planning.mdx');
    for (const phrase of [
      '6.7 million datapoints from 1,500 object models',
      'grasp-aligned depth crop', 'analytic metrics',
      'isolated rigid objects on a planar worksurface',
      'one depth camera with known intrinsics',
      'missing depth on thin parts and object collisions remained failure modes',
    ]) expect(grasp).toContain(phrase);
    if (article.includes('Dex-Net')) {
      for (const phrase of ['analytic robust-epsilon quality label', 'isolated object on a planar worksurface',
        'known camera intrinsics']) expect(article).toContain(phrase);
    }
    expect(article).not.toContain('no object model at all');
    expect(article).not.toContain('predicts grasp success directly from the depth image');
  });
});
