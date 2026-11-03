import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>;
};

describe('content gate placement', () => {
  it('runs the content gate before any export or public search mirror in the gated build', () => {
    const prebuild = pkg.scripts['prebuild'];
    const postbuild = pkg.scripts['postbuild'];
    expect(prebuild).toContain('npm run validate:content');
    expect(pkg.scripts['validate:content']).toContain('node scripts/check-audit-coverage.ts');
    expect(pkg.scripts['build']).toBe(
      'next build && node scripts/measure-reading-times.ts && next build',
    );
    expect(postbuild).toContain('node scripts/build-search.ts');
  });

  it('restores the full gated production build and retains its additional content checks', () => {
    // The completed mission retires the temporary audit bypass. npm runs
    // prebuild/build/postbuild in order; additional production checks remain.
    const command = pkg.scripts['vercel-build'];
    expect(command).toBe('npm run build && npm run check:teach-back && node scripts/check-article-boxes.ts && node scripts/check-article-sources.ts');
    const expanded = command.replace('npm run build', [pkg.scripts.prebuild, pkg.scripts.build, pkg.scripts.postbuild].join(' && '));
    expect(expanded).toContain('npm run validate:content');
    expect(pkg.scripts['validate:content']).toContain('node scripts/check-audit-coverage.ts');
    expect(expanded).toContain('&& next build && node scripts/measure-reading-times.ts && next build');
    expect(expanded).toContain('&& node scripts/build-search.ts');
    expect(expanded).toContain('&& node scripts/lint-no-slop.ts');
    expect(expanded).toContain('&& npm run check:brand-v2-registries');
    expect(expanded).toContain('&& npm run check:brand-v2-enforcement');
    expect(expanded.indexOf('npm run validate:content')).toBeLessThan(expanded.indexOf('next build'));
    expect(expanded.indexOf('scripts/build-search.ts')).toBeGreaterThan(expanded.lastIndexOf('next build'));
    expect(expanded).not.toContain('--ignore-scripts');
    expect(command).not.toContain('--ignore-scripts');
  });
});
