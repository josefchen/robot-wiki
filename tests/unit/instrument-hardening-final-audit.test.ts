import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const AUDITED_COMMIT = '49b6fd71dc98e0c02ea529ae71a228fef00ac321';
const AUDIT_PATH = join(
  process.cwd(),
  'evidence',
  'brand-v2',
  'instrument-hardening-final-audit.json',
);

const assertionSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().min(1),
    result: z.enum(['pass', 'fail']),
    evidence: z.array(z.string().min(1)).min(1),
  })
  .strict();

const auditSchema = z
  .object({
    version: z.literal(1),
    auditedCommit: z.string().regex(/^[a-f0-9]{40}$/),
    auditorCommit: z.string().regex(/^[a-f0-9]{40}$/).nullable(),
    sourceTree: z.string().regex(/^[a-f0-9]{40}$/),
    verdict: z.enum(['pass', 'fail']),
    reviewedFiles: z.array(z.string().min(1)).min(1),
    assertions: z.array(assertionSchema).min(1),
    commands: z
      .array(
        z
          .object({
            command: z.string().min(1),
            exitCode: z.number().int(),
            observation: z.string().min(1),
            /**
             * The release-count gate is the one required command whose value
             * is the failure population rather than the exit code, so the
             * number it reported is recorded structurally instead of being
             * left readable only in the prose.
             */
            releaseFailureCounts: z
              .object({
                pendingResultBlocksRelease: z.number().int().positive(),
                populationWideCoverageBlocksRelease: z.number().int().positive(),
                total: z.number().int().positive(),
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .min(1),
    mutations: z
      .array(
        z
          .object({
            name: z.string().min(1),
            subject: z.string().min(1),
            expectedFailure: z.string().min(1),
            observed: z.string().min(1),
            restoredByteIdentical: z.boolean(),
          })
          .strict(),
      )
      .min(1),
    knownBoundaries: z.array(z.string().min(1)).min(1),
  })
  .strict();

const REQUIRED_ASSERTIONS = [
  'R1-derived-populations',
  'R2-independent-inputs',
  'R3-expected-red-separation',
  'R4-machine-local-exclusion',
  'R5-no-acceptance-literal',
  'R6-independent-enforcement',
  'R7-filtered-collection-floors',
  'expected-red-six-anchor-equality',
  'font-empty-population',
  'reflow-320-upper-bound',
  'route-check-reconciliation',
  'collect-bundle-aggregation',
  'dot-grid-zero-baseline',
  'structural-detection-boundary',
] as const;

/**
 * The audit is only a proof if the commands that produced it are still in the
 * record. A `.min(1)` array accepts a lone `git show`, so the mandatory gate
 * set and each gate's expected outcome are named here: deleting an entry, or
 * recording a gate that did not end the way the audit claims, has to fail.
 */
const REQUIRED_COMMANDS = [
  { id: 'lint', pattern: /^npm run lint$/, exitCode: 0 },
  { id: 'typecheck', pattern: /^npm run typecheck$/, exitCode: 0 },
  { id: 'unit', pattern: /^npm(?: run)? test$/, exitCode: 0 },
  { id: 'build', pattern: /^npm run build$/, exitCode: 0 },
  { id: 'brand-v2', pattern: /^npm run test:brand-v2$/, exitCode: 0 },
  { id: 'full-e2e', pattern: /^npm run test:e2e$/, exitCode: 0 },
  {
    id: 'release-count',
    pattern: /^npm run check:brand-v2-enforcement:release:counts$/,
    // The sealed milestone-red shape: the release gate must still refuse the
    // pending corpus, so a zero exit code here would mean the audit recorded
    // a gate that had stopped enforcing.
    exitCode: 1,
  },
  {
    id: 'focused-mutation',
    pattern: /^npx playwright test .*-g "rejects a route profile".*$/,
    exitCode: 0,
  },
] as const;

const REQUIRED_MUTATIONS = [
  'font-empty-population',
  'forced-320-overflow',
  'omitted-route-check-class',
  'combined-value-state-and-manifest-drift',
] as const;

function git(...args: string[]): string {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim();
}

describe('instrument hardening final audit evidence', () => {
  it('is complete, pinned to the audited commit, and regenerated with its diff', () => {
    const audit = auditSchema.parse(
      JSON.parse(readFileSync(AUDIT_PATH, 'utf8')) as unknown,
    );

    expect(audit.auditedCommit).toBe(AUDITED_COMMIT);
    expect(audit.sourceTree).toBe(git('rev-parse', `${AUDITED_COMMIT}^{tree}`));
    expect(new Set(audit.reviewedFiles).size).toBe(audit.reviewedFiles.length);

    const changedFiles = git(
      'diff-tree',
      '--no-commit-id',
      '--name-only',
      '-r',
      AUDITED_COMMIT,
    )
      .split('\n')
      .filter(Boolean);
    for (const file of changedFiles) {
      expect(audit.reviewedFiles, `missing reviewed commit file ${file}`).toContain(
        file,
      );
    }

    const assertions = new Map(
      audit.assertions.map((assertion) => [assertion.id, assertion]),
    );
    for (const id of REQUIRED_ASSERTIONS) {
      expect(assertions.has(id), `missing audit assertion ${id}`).toBe(true);
    }
    expect(new Set(assertions).size).toBe(audit.assertions.length);

    for (const required of REQUIRED_COMMANDS) {
      const matching = audit.commands.filter(({ command }) =>
        required.pattern.test(command),
      );
      expect(
        matching.length,
        `missing required audit command ${required.id} (${required.pattern.source})`,
      ).toBeGreaterThan(0);
      for (const entry of matching) {
        expect(
          entry.exitCode,
          `audit command ${required.id} recorded the wrong outcome: ${entry.command}`,
        ).toBe(required.exitCode);
      }
      if (required.id !== 'release-count') continue;
      for (const entry of matching) {
        const counts = entry.releaseFailureCounts;
        expect(
          counts,
          'the release-count gate must record the failure population it reported',
        ).toBeDefined();
        if (counts === undefined) continue;
        expect(counts.total).toBe(
          counts.pendingResultBlocksRelease +
            counts.populationWideCoverageBlocksRelease,
        );
        // Recorded and asserted, so the prose and the structured counts
        // cannot drift apart: a number changed in one place fails here.
        for (const value of [
          counts.total,
          counts.pendingResultBlocksRelease,
          counts.populationWideCoverageBlocksRelease,
        ]) {
          expect(
            entry.observation,
            `release-count observation must state ${value}`,
          ).toContain(String(value));
        }
      }
    }

    const mutations = new Map(
      audit.mutations.map((mutation) => [mutation.name, mutation]),
    );
    for (const name of REQUIRED_MUTATIONS) {
      expect(mutations.has(name), `missing audit mutation ${name}`).toBe(true);
      expect(mutations.get(name)?.restoredByteIdentical).toBe(true);
    }
    expect(new Set(mutations).size).toBe(audit.mutations.length);

    expect(
      audit.knownBoundaries.some((boundary) =>
        /does not detect box-shadow, SVG, or canvas devices/i.test(boundary),
      ),
    ).toBe(true);

    if (audit.verdict === 'pass') {
      expect(audit.assertions.every(({ result }) => result === 'pass')).toBe(
        true,
      );
    } else {
      expect(audit.assertions.some(({ result }) => result === 'fail')).toBe(
        true,
      );
    }
  });
});
