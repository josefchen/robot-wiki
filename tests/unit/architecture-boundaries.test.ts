import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import pkg from '@/package.json';
import depcruiseConfig, { FEATURE_COMPONENTS } from '@/.dependency-cruiser.mjs';

// The layering rules in .dependency-cruiser.mjs are a build gate, so they need
// the same treatment as the content validator: tests that fail when the gate
// stops looking. Two ways it can go quiet without a single rule violation
// being reported are covered here - a source directory that the cruise command
// never visits, and dependency-cruiser falling back to a parser that cannot
// read TypeScript. Both leave `npm run lint:architecture` exiting 0.
// process.cwd() is the repo root, the way tests/unit/repo-docs.test.ts and the
// e2e specs resolve repo files.
const repoRoot = process.cwd();
const read = (rel: string): string => readFileSync(join(repoRoot, rel), 'utf8');

/** Root directories that hold no first-party modules. */
const NON_SOURCE_DIRS = new Set([
  'node_modules',
  'content', // MDX prose, reached through a build-time template import
  'public',
  'research',
  'out',
  'coverage',
  'playwright-report',
  'test-results',
]);

/** Recursively: does this directory hold a module the cruise should parse? */
function hasSourceModule(dir: string): boolean {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (hasSourceModule(path)) return true;
      continue;
    }
    // .d.ts files are ambient declarations with no runtime edges (types/), so
    // a directory holding only those is not part of the dependency graph.
    if (/\.(ts|tsx|mts|mjs)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      return true;
    }
  }
  return false;
}

describe('architecture rule set (.dependency-cruiser.mjs)', () => {
  const rules = depcruiseConfig.forbidden;

  it('enforces every rule as an error, not a warning', () => {
    // A rule at 'warn' still prints but exits 0, which is indistinguishable
    // from a passing gate in CI.
    for (const rule of rules) {
      expect(rule.severity, `rule ${rule.name} must be an error`).toBe('error');
    }
  });

  it('explains every rule, so a violation says what to do instead', () => {
    for (const rule of rules) {
      expect(rule.name, 'every rule needs a name').toBeTruthy();
      expect(
        (rule.comment ?? '').length,
        `rule ${rule.name} needs a comment explaining the boundary`,
      ).toBeGreaterThan(80);
    }
  });

  it('covers the layers the README documents', () => {
    const names = new Set(rules.map((rule) => rule.name));
    for (const name of [
      'no-circular',
      'app-is-the-composition-root',
      'lib-is-ui-agnostic',
      'data-is-a-leaf',
      'ui-primitives-stay-generic',
      'no-cross-feature-component-deps',
      'no-node-core-in-client-components',
      'build-scripts-are-not-imported',
    ]) {
      expect(names.has(name), `missing boundary rule: ${name}`).toBe(true);
    }
  });

  it('derives FEATURE_COMPONENTS from disk, excluding the shared ui and mdx layers', () => {
    const onDisk = readdirSync(join(repoRoot, 'components'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !['ui', 'mdx'].includes(entry.name))
      .map((entry) => entry.name)
      .sort()
      .join('|');
    expect(FEATURE_COMPONENTS).toBe(onDisk);
    expect(FEATURE_COMPONENTS.split('|')).not.toContain('ui');
    expect(FEATURE_COMPONENTS.split('|')).not.toContain('mdx');
  });

  it('treats mdx-components.tsx as shipped code', () => {
    for (const name of [
      'build-scripts-are-not-imported',
      'no-test-code-in-shipped-code',
      'no-dev-dependencies-in-shipped-code',
    ]) {
      const rule = rules.find((entry) => entry.name === name);
      expect(rule, `missing rule ${name}`).toBeDefined();
      expect(rule?.from.path, `${name} from.path must match mdx-components.tsx`).toMatch(
        /mdx-components/,
      );
    }
  });

  it('resolves the @/ alias through tsconfig and follows type-only imports', () => {
    // Without tsConfig every '@/lib/...' import is unresolvable, and
    // not-to-unresolvable would drown the real violations. Without
    // tsPreCompilationDeps the graph misses `import type` edges, which is
    // where a layering violation usually starts.
    expect(depcruiseConfig.options.tsConfig.fileName).toBe('tsconfig.json');
    expect(depcruiseConfig.options.tsPreCompilationDeps).toBe(true);
  });
});

describe('architecture gate wiring', () => {
  const command = pkg.scripts['lint:architecture'];

  it('cruises every root directory that holds first-party modules', () => {
    const roots = readdirSync(repoRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .filter((name) => !NON_SOURCE_DIRS.has(name))
      .filter((name) => hasSourceModule(join(repoRoot, name)));

    expect(roots.length).toBeGreaterThan(4);
    for (const root of roots) {
      expect(
        command.split(/\s+/).includes(root),
        `npm run lint:architecture does not cruise ${root}/`,
      ).toBe(true);
    }
  });

  it('gives dependency-cruiser a TypeScript compiler its parser accepts', () => {
    // dependency-cruiser needs `typescript >=2.0.0 <7.0.0`. The root compiler
    // is TS 7, and when the version check fails the cruise does not error: it
    // prints a warning, parses almost nothing (39 modules of ~500 here) and
    // exits 0, so every boundary rule "passes". scripts/postinstall.mjs links
    // the typescript6 alias into the package to keep that from happening.
    const manifest = 'node_modules/dependency-cruiser/node_modules/typescript/package.json';
    expect(
      existsSync(join(repoRoot, manifest)),
      'run npm install: the postinstall TypeScript 6 bridge is missing',
    ).toBe(true);
    const major = Number(JSON.parse(read(manifest)).version.split('.')[0]);
    expect(major).toBeGreaterThanOrEqual(2);
    expect(major).toBeLessThan(7);
  });
});
