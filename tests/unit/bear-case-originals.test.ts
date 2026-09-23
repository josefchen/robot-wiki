import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { MILESTONES } from '@/lib/bear-case';

/**
 * Red-first coverage for the 2026-09-15 bear-case originals integration
 * (packet convergence-source-d-bear-case-20260915, applied by the
 * brand-v2-editorial integrator). These assertions failed on the pre-application
 * tree and pin the three article spans plus the lib statusDetail rewording.
 */
describe('bear-case originals integration (2026-09-15)', () => {
  const article = readFileSync('content/frontier/bear-case.mdx', 'utf8');

  it("B8: drops the unsupported 'from her Waymo experience' attribution", () => {
    // The fetched Bessemer essay introduces Lisa Yan as Founder of Argus
    // Systems and never ties her 99%->99.9% quote to Waymo experience.
    expect(article).not.toContain('from her Waymo experience');
    expect(article).toContain(
      "Lisa Yan, quoted in Bessemer's own analysis, describes the climb from 99% to 99.9% as steep",
    );
  });

  it("B9: rescopes the funding tally from 'first five months' to the source's own framing", () => {
    // briefs.com scopes >$23B as raised 'in 2026 ... with weeks still
    // remaining' at its Jun 2, 2026 publication, never 'first five months'.
    expect(article).not.toContain('in the first five months of 2026');
    expect(article).toContain('by early June 2026 by PitchBook');
    expect(article).toContain(
      '<Stat label="raised by early June 2026" value=">$23B" note="PitchBook tally, by early June" accent />',
    );
    expect(article).not.toContain('label="raised in H1 2026"');
    expect(article.match(/<Cite id="robotics-funding-23b-2026" \/>/g)).toHaveLength(1);
    expect(article).toContain('  - robotics-funding-23b-2026');
  });

  it("B16: the closing line agrees with the corrected scoping", () => {
    expect(article).not.toContain('raised in five months against that scoreboard');
    expect(article).toContain('by early June against that scoreboard');
  });

  it('B14: the open-benchmark statusDetail no longer claims RoboArena standardized tasks', () => {
    // RoboArena's abstract: 'Instead of standardizing evaluations around fixed
    // tasks, environments, or locations, we propose to crowd-source
    // evaluations across a distributed network of evaluators.'
    const openBenchmark = MILESTONES.find((m) => m.id === 'open-benchmark');
    expect(openBenchmark).toBeDefined();
    expect(openBenchmark!.statusDetail).not.toContain(
      'all launched with standardized tasks or hardware kits',
    );
    expect(openBenchmark!.statusDetail).toContain('crowd-sources');
    expect(openBenchmark!.statusDetail).toContain(
      'standardized hardware kits',
    );
  });

  it('B15 local-AND basis: the board reads four not met, four partial, zero met', () => {
    const counts = MILESTONES.reduce<Record<string, number>>((acc, m) => {
      acc[m.status] = (acc[m.status] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ partial: 4, 'not-met': 4, met: undefined });
    expect(MILESTONES).toHaveLength(8);
    expect(article).toContain('four not met, four partial, zero met');
  });
});
