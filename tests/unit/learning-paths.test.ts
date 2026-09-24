import { describe, expect, it } from 'vitest';
import { publishedModules } from '@/data/modules';
import { learningPaths } from '@/lib/learning-paths';

describe('learning paths', () => {
  it('ships three ordered paths backed only by published articles', () => {
    const paths = learningPaths();
    const published = new Set(
      publishedModules().map((entry) => `${entry.domain}/${entry.slug}`),
    );
    expect(paths).toHaveLength(3);
    expect(new Set(paths.map((path) => path.id)).size).toBe(paths.length);
    for (const path of paths) {
      expect(path.entries.length).toBeGreaterThanOrEqual(5);
      expect(path.hub).toMatch(/^\/[a-z0-9-]+\/$/);
      for (const entry of path.entries) {
        expect(published).toContain(`${entry.domain}/${entry.slug}`);
      }
    }
  });

  it('starts the classical path with kinematics', () => {
    const path = learningPaths().find(
      (candidate) => candidate.id === 'classical-robotics',
    );
    expect(path?.entries[0]?.slug).toBe('kinematics');
  });
});
