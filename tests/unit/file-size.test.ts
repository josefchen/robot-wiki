import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  budgetFor,
  checkMeasurement,
  countLines,
  extensionOf,
  findSizeViolations,
  KIB,
  looksBinary,
  measureContent,
  MIB,
  SIZE_BUDGETS,
  type FileMeasurement,
} from '@/lib/file-size';

// The budgets are a repo policy, so these tests cover both halves: the
// classification and reporting logic, and the real repo, which must sit inside
// its own budgets at all times. The second half is what makes the guard a gate
// in `npm run test`, not only in prebuild, the pre-commit hook, and CI.

describe('extensionOf', () => {
  it('lowercases the extension', () => {
    expect(extensionOf('public/images/atlas.JPG')).toBe('.jpg');
  });

  it('returns an empty extension for dotfiles and extensionless names', () => {
    expect(extensionOf('.gitignore')).toBe('');
    expect(extensionOf('LICENSE')).toBe('');
    expect(extensionOf('.githooks/pre-commit')).toBe('');
  });

  it('ignores dots in parent directories', () => {
    expect(extensionOf('.github/workflows/file-size.yml')).toBe('.yml');
  });
});

describe('countLines', () => {
  it('counts a trailing newline as the end of the last line, not a new one', () => {
    expect(countLines('a\nb\nc\n')).toBe(3);
  });

  it('counts a final unterminated line', () => {
    expect(countLines('a\nb\nc')).toBe(3);
  });

  it('reports zero lines for an empty file', () => {
    expect(countLines('')).toBe(0);
  });
});

describe('looksBinary', () => {
  it('treats a NUL byte as binary', () => {
    expect(looksBinary(Buffer.from([0x67, 0x6c, 0x54, 0x46, 0x00, 0x02]))).toBe(true);
  });

  it('treats UTF-8 source as text', () => {
    expect(looksBinary(Buffer.from('export const q = "π/2";\n', 'utf8'))).toBe(false);
  });
});

describe('budgetFor', () => {
  it('routes source files to the source budget', () => {
    expect(budgetFor('components/interactive/latency-comparison.tsx').label).toBe('source file');
    expect(budgetFor('lib/ik.ts').label).toBe('source file');
    expect(budgetFor('app/globals.css').label).toBe('source file');
  });

  it('routes each path-specific category ahead of the extension rules', () => {
    expect(budgetFor('data/citations.ts').label).toBe('data registry');
    expect(budgetFor('tests/e2e/playground-trajectory.spec.ts').label).toBe('test spec');
    expect(budgetFor('content/classical/kinematics.mdx').label).toBe('content article');
    expect(budgetFor('research/04-market-map.md').label).toBe('research report');
    expect(budgetFor('research/04-market-map-companies.json').label).toBe('research dataset');
    expect(budgetFor('package-lock.json').label).toBe('lockfile');
    expect(budgetFor('public/draco/draco_decoder.js', 'binary').label).toBe(
      'vendored runtime asset',
    );
  });

  it('routes assets by extension regardless of where they live', () => {
    expect(budgetFor('public/images/spot.jpg', 'binary').label).toBe('raster image');
    expect(budgetFor('public/models/so101/assets/base.glb', 'binary').label).toBe('3D asset');
  });

  it('falls back to a catch-all that depends on text or binary content', () => {
    expect(budgetFor('README.md').label).toBe('text file');
    expect(budgetFor('public/fonts/mono.woff2', 'binary').label).toBe('binary file');
  });

  it('gives every budget a stated reason, since a limit without one is unreviewable', () => {
    for (const budget of SIZE_BUDGETS) {
      expect(budget.reason.length, `${budget.label} needs a reason`).toBeGreaterThan(20);
      expect(budget.maxBytes).toBeGreaterThan(0);
    }
  });

  it('exempts nothing: the catch-alls cover every path', () => {
    for (const path of ['weird', 'a/b/c.xyz', '.gitattributes', 'x.', 'no-extension']) {
      expect(() => budgetFor(path)).not.toThrow();
      expect(() => budgetFor(path, 'binary')).not.toThrow();
    }
  });
});

describe('checkMeasurement', () => {
  it('passes a file inside both halves of its budget', () => {
    expect(checkMeasurement({ path: 'lib/search.ts', lines: 200, bytes: 8 * KIB })).toEqual([]);
  });

  it('flags a source file over the line budget, naming the limit and the reason', () => {
    const [violation] = checkMeasurement({
      path: 'components/interactive/huge.tsx',
      lines: 1400,
      bytes: 40 * KIB,
    });
    expect(violation.measure).toBe('lines');
    expect(violation.actual).toBe(1400);
    expect(violation.limit).toBe(700);
    expect(violation.message).toContain('components/interactive/huge.tsx');
    expect(violation.message).toContain('1400 lines');
    expect(violation.message).toContain('one unit of work');
  });

  it('flags an uncompressed image over the byte budget in human units', () => {
    const [violation] = checkMeasurement({
      path: 'public/images/raw-capture.png',
      lines: null,
      bytes: 6 * MIB,
    });
    expect(violation.measure).toBe('bytes');
    expect(violation.limit).toBe(MIB);
    expect(violation.message).toContain('6.00 MiB');
    expect(violation.message).toContain('1.00 MiB');
  });

  it('reports both overages when a file breaks lines and bytes at once', () => {
    const violations = checkMeasurement({
      path: 'content/classical/everything.mdx',
      lines: 900,
      bytes: 400 * KIB,
    });
    expect(violations.map((v) => v.measure)).toEqual(['lines', 'bytes']);
  });

  it('applies no line budget to binary content, where lines are meaningless', () => {
    expect(
      checkMeasurement({ path: 'public/models/so101/assets/arm.glb', lines: null, bytes: 4 * KIB }),
    ).toEqual([]);
  });

  it('does not line-cap the lockfile, whose length tracks the dependency tree', () => {
    expect(
      checkMeasurement({ path: 'package-lock.json', lines: 40_000, bytes: 900 * KIB }),
    ).toEqual([]);
  });

  it('still byte-caps the lockfile', () => {
    const violations = checkMeasurement({
      path: 'package-lock.json',
      lines: 40_000,
      bytes: 5 * MIB,
    });
    expect(violations).toHaveLength(1);
    expect(violations[0].measure).toBe('bytes');
  });
});

describe('findSizeViolations', () => {
  it('reports every offender and keeps the input order', () => {
    const files: FileMeasurement[] = [
      { path: 'lib/ok.ts', lines: 100, bytes: 4 * KIB },
      { path: 'lib/long.ts', lines: 2000, bytes: 60 * KIB },
      { path: 'public/images/big.jpg', lines: null, bytes: 3 * MIB },
    ];
    expect(findSizeViolations(files).map((v) => v.path)).toEqual([
      'lib/long.ts',
      'public/images/big.jpg',
    ]);
  });

  it('passes an empty set', () => {
    expect(findSizeViolations([])).toEqual([]);
  });
});

describe('measureContent', () => {
  it('measures text bytes and lines from a buffer', () => {
    expect(measureContent('lib/x.ts', Buffer.from('a\nb\n', 'utf8'))).toEqual({
      path: 'lib/x.ts',
      bytes: 4,
      lines: 2,
    });
  });

  it('reports null lines for binary content', () => {
    const measurement = measureContent('a.glb', Buffer.from([0x67, 0x00, 0x01]));
    expect(measurement.lines).toBeNull();
    expect(measurement.bytes).toBe(3);
  });
});

describe('the repo itself', () => {
  const root = process.cwd();
  const tracked = execFileSync('git', ['ls-files', '-z'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
    .split('\0')
    .filter(Boolean);

  it('tracks a plausible number of files', () => {
    expect(tracked.length).toBeGreaterThan(100);
  });

  it('keeps every tracked file inside its size budget', () => {
    const measurements = tracked.map((path) =>
      measureContent(path, readFileSync(join(root, path))),
    );
    expect(findSizeViolations(measurements).map((v) => v.message)).toEqual([]);
  });

  it('wires the check into prebuild, so no build can ship an oversized file', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    expect(pkg.scripts['check:file-size']).toBe('node scripts/check-file-size.ts');
    expect(pkg.scripts.prebuild).toContain('check:file-size');
  });

  it('ships a tracked pre-commit hook that runs the staged check', () => {
    const hook = readFileSync(join(root, '.githooks/pre-commit'), 'utf8');
    expect(hook).toContain('scripts/check-file-size.ts');
    expect(hook).toContain('--staged');
  });

  it('caps code lines in ESLint below the raw-line budgets, per category', () => {
    const config = readFileSync(join(root, 'eslint.config.mjs'), 'utf8');
    const caps = [...config.matchAll(/'max-lines': \['error', \{ max: (\d+)/g)].map((m) =>
      Number(m[1]),
    );
    expect(caps.length).toBeGreaterThanOrEqual(3);
    const sourceBudget = SIZE_BUDGETS.find((b) => b.label === 'source file');
    expect(Math.min(...caps)).toBeLessThan(sourceBudget!.maxLines!);
  });
});
