import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROSE_LINT_EXCEPTIONS } from '@/data/prose-lint-exceptions';
import { findStructuralTells, structuralTellReport, STRUCTURAL_TELL_LIMIT } from '@/lib/prose-lint';

const root = process.cwd();

describe('classical prose', () => {
  it('reports and enforces the structural-tell floor for all nine articles', () => {
    const articles = readdirSync(join(root, 'content/classical')).filter((file) => file.endsWith('.mdx'));
    expect(articles.length).toBeGreaterThan(0);
    for (const article of articles) {
      const body = readFileSync(join(root, 'content/classical', article), 'utf8');
      const report = structuralTellReport(body, PROSE_LINT_EXCEPTIONS);
      expect(report.measured, article).toBe(true);
      expect(report.tells, article).toBe(findStructuralTells(body, PROSE_LINT_EXCEPTIONS).length);
      expect(report.density, article).toBeLessThanOrEqual(STRUCTURAL_TELL_LIMIT);
    }
  });
});
