import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>;
};

/** vercel-build with npm's pre/post hooks spelled out, in run order. */
function expandedGate(): string {
  const { prebuild, build, postbuild } = pkg.scripts;
  return pkg.scripts['vercel-build'].replace('npm run build', [prebuild, build, postbuild].join(' && '));
}

describe('release gate placement', () => {
  it('validates content before the export and indexes search after it', () => {
    const gate = expandedGate();
    expect(gate).toContain('npm run validate:content');
    expect(pkg.scripts['validate:content']).toContain('node scripts/validate-content.ts');
    expect(pkg.scripts['validate:content']).toContain('node scripts/lint-prose.ts --source-only');
    expect(pkg.scripts['validate:content']).toContain('node scripts/check-chart-descriptions.ts');
    expect(gate.indexOf('npm run validate:content')).toBeLessThan(gate.indexOf('next build'));
    expect(gate.indexOf('scripts/build-search.ts')).toBeGreaterThan(gate.indexOf('next build'));
  });

  it('runs every reader-protecting check over the export', () => {
    const gate = expandedGate();
    for (const step of [
      'node scripts/measure-reading-times.ts --rebuild',
      'node scripts/patch-404-guard.ts',
      'node scripts/build-search.ts',
      'node scripts/lint-prose.ts &&',
      'npm run check:figure-system',
      'npm run check:seo',
      'npm run check:internal-links',
      'npm run generate:og-cards',
      'node scripts/check-article-boxes.ts',
      'node scripts/check-article-sources.ts',
    ]) {
      expect(gate).toContain(step);
    }
    expect(gate).not.toContain('--ignore-scripts');
  });
});
