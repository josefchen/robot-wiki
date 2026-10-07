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
    expect(glossary).toContain('not a guarantee that all geometry survives pooling');
    expect(article).not.toContain('so local geometry survives the pooling');
  });

  it('binds DON timing to data collection, hardware and a new object', () => {
    const article = read('content/classical/perception.mdx');
    for (const phrase of [
      'Learning a new object takes about 20 minutes',
      'including a handful of scenes', '3500 steps',
      'about 13 minutes', 'one 1080 Ti or Titan Xp',
      'about 70 seconds', 'moderately deformable',
      "the gripper's 6-DoF orientation needs further information",
    ]) expect(article).toContain(phrase);
    expect(article).not.toContain('trained in about twenty minutes per object');
    expect(article).not.toContain('same descriptor across viewpoints and deformations');
  });

  it('separates Dex-Net synthetic examples, analytic labels and execution assumptions', () => {
    const article = read('content/classical/perception.mdx');
    for (const phrase of [
      '6.7 million synthetic datapoints', '1500 object models',
      'grasp-aligned depth crop', 'analytic robust-epsilon quality label',
      'single-view depth',
      'isolated object on a planar worksurface',
      'known camera intrinsics',
      'Missing depth on thin parts and collisions remain failure modes',
    ]) expect(article).toContain(phrase);
    expect(article).not.toContain('no object model at all');
    expect(article).not.toContain('predicts grasp success directly from the depth image');
  });
});
