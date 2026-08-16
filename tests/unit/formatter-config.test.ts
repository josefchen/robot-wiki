import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import pkg from '@/package.json';

// Guards the formatter contract. Prettier is the single source of truth for
// layout in this repo, which only holds if three things stay true: the config
// exists and keeps the settings the committed code was formatted with, the
// npm scripts that write and verify formatting exist, and the ignore list
// still shields the two directories whose line breaks are authored by hand
// (content/ MDX prose and the research/ reports). Drift in any of them shows
// up as a whitespace-only diff war in review instead of a failing check, so
// it is asserted here rather than left to convention.
const read = (rel: string): string =>
  readFileSync(join(process.cwd(), rel), 'utf8');

describe('Prettier configuration', () => {
  const config = JSON.parse(read('.prettierrc.json')) as Record<
    string,
    unknown
  >;

  it('pins the settings the committed code is formatted with', () => {
    expect(config).toMatchObject({
      printWidth: 80,
      tabWidth: 2,
      semi: true,
      singleQuote: true,
      trailingComma: 'all',
      arrowParens: 'always',
      endOfLine: 'lf',
    });
  });

  it('is declared as an exactly pinned devDependency', () => {
    expect(pkg.devDependencies.prettier).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('exposes a write script and a read-only check script', () => {
    expect(pkg.scripts.format).toBe('prettier --write .');
    expect(pkg.scripts['format:check']).toBe('prettier --check .');
  });
});

describe('.prettierignore', () => {
  const entries = read('.prettierignore')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  it('excludes the hand-authored prose Prettier would reflow', () => {
    // Both are ESLint-ignored too (eslint.config.mjs): research/ is a verbatim
    // trail, and MDX bodies carry inline <Cite />/<Term /> whose position next
    // to punctuation is read by lib/rehype-cite-punctuation.mjs.
    expect(entries).toContain('content/');
    expect(entries).toContain('research/');
  });

  it('excludes build output, dependencies and the lockfile', () => {
    for (const path of [
      '.next/',
      'out/',
      'node_modules/',
      'package-lock.json',
    ]) {
      expect(entries).toContain(path);
    }
  });

  it('excludes the vendored Draco decoder so it stays byte-identical', () => {
    expect(entries).toContain('public/draco/');
  });
});

describe('formatter and linter agree on scope', () => {
  const eslintConfig = read('eslint.config.mjs');

  it('keeps the vendored and generated paths ignored by both tools', () => {
    const prettierIgnore = read('.prettierignore');
    for (const path of ['public/draco', 'research', 'out', '.next']) {
      expect(
        eslintConfig.includes(path),
        `eslint.config.mjs must ignore ${path}`,
      ).toBe(true);
      expect(
        prettierIgnore.includes(path),
        `.prettierignore must ignore ${path}`,
      ).toBe(true);
    }
  });
});
