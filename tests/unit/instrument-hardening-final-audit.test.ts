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
