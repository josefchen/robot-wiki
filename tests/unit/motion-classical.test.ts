import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NO_SLOP_EXCEPTIONS } from '@/data/no-slop-exceptions';
import { findStructuralTells, structuralTellReport, STRUCTURAL_TELL_LIMIT } from '@/lib/no-slop';

const root = process.cwd();

describe('classical prose', () => {
  it('reports and enforces the structural-tell floor for all nine articles', () => {
    const articles = readdirSync(join(root, 'content/classical')).filter((file) => file.endsWith('.mdx'));
    expect(articles.length).toBeGreaterThan(0);
    for (const article of articles) {
      const body = readFileSync(join(root, 'content/classical', article), 'utf8');
      const report = structuralTellReport(body, NO_SLOP_EXCEPTIONS);
      expect(report.measured, article).toBe(true);
      expect(report.tells, article).toBe(findStructuralTells(body, NO_SLOP_EXCEPTIONS).length);
      expect(report.density, article).toBeLessThanOrEqual(STRUCTURAL_TELL_LIMIT);
    }
  });
});
