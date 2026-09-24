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

  it('keeps the production entry point ungated while the content audit is red', () => {
    // Owner decision 2026-09-24: production ships verified progress with only the
    // content-audit gate skipped; every other gate stays in vercel-build.
    const command = pkg.scripts['vercel-build'];
    expect(command).not.toContain('npm run validate:content');
    expect(command).not.toContain('scripts/check-audit-coverage.ts');
    expect(command).toContain('&& next build && node scripts/measure-reading-times.ts && next build');
    expect(command).toContain('&& node scripts/build-search.ts');
    expect(command).toContain('&& node scripts/lint-no-slop.ts');
    expect(command).toContain('&& npm run check:brand-v2-registries');
    expect(command).toContain('&& npm run check:brand-v2-enforcement');
    expect(command.indexOf('scripts/build-search.ts')).toBeGreaterThan(command.indexOf('next build'));
    expect(command).not.toContain('--ignore-scripts');
  });
});
