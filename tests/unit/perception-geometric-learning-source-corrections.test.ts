import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('perception geometric-learning source boundaries', () => {
  it('describes local PointNet++ summaries without changing the preceding PointNet claim', () => {
    const article = read('content/classical/perception.mdx');
    const glossary = read('data/glossary.ts');
    expect(article).toContain('PointNet solved that with a shared per-point encoder and a symmetric pooling function');
    expect(article).toContain('pooling summarizes these local features rather than preserving all geometry');
    expect(article).toContain('Small neighbourhoods can contain too few samples');
    expect(glossary).toContain('not a guarantee that all geometry survives pooling');
    expect(article).not.toContain('so local geometry survives the pooling');
  });

  it('binds DON timing to data collection, hardware and a new object', () => {
    const article = read('content/classical/perception.mdx');
    for (const phrase of [
      '20-minute estimate is for learning a new object',
      'including collection of a handful of scenes', '3500 optimization steps',
      'about 13 minutes', 'single Nvidia 1080 Ti or Titan Xp',
      'about 70 seconds for one static-scene scan', 'moderately deformable',
      'Humans often rearranged objects', "does not itself specify the gripper's 6-DoF orientation",
    ]) expect(article).toContain(phrase);
    expect(article).not.toContain('trained in about twenty minutes per object');
    expect(article).not.toContain('same descriptor across viewpoints and deformations');
  });

  it('separates Dex-Net synthetic examples, analytic labels and execution assumptions', () => {
    const article = read('content/classical/perception.mdx');
    for (const phrase of [
      '6.7 million synthetic training datapoints', '1500 object models',
      'grasp-aligned crops', 'thresholded robust epsilon quality',
      'physical grasp success is evaluated separately', 'single-view depth',
      'isolated object on a planar worksurface',
      'known camera intrinsics and gripper geometry',
      'Missing depth on thin parts and collisions remain failure modes',
    ]) expect(article).toContain(phrase);
    expect(article).not.toContain('no object model at all');
    expect(article).not.toContain('predicts grasp success directly from the depth image');
  });
});
