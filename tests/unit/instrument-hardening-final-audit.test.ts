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
            /**
             * A mutation whose whole result is a measured quantity records
             * that quantity as a number, and the prose has to quote it. The
             * forced-reflow proof carried `<measured>` in its reason string
             * instead, so the record could satisfy a numeric marker from the
             * viewport it set up and prove no overflow at all.
             */
            measuredOverflowPx: z.number().int().positive().optional(),
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
 * record, with the identity they were run under. Each entry is the exact
 * invocation, so substituting a different spec, configuration, or worker count
 * for the focused mutation run — or recording a gate that did not end the way
 * the audit claims — has to fail.
 */
const REQUIRED_COMMANDS: ReadonlyArray<{
  id: string;
  command: string;
  exitCode: number;
  observation?: RegExp[];
}> = [
  { id: 'lint', command: 'npm run lint', exitCode: 0 },
  { id: 'typecheck', command: 'npm run typecheck', exitCode: 0 },
  { id: 'unit', command: 'npm test', exitCode: 0 },
  { id: 'build', command: 'npm run build', exitCode: 0 },
  { id: 'brand-v2', command: 'npm run test:brand-v2', exitCode: 0 },
  { id: 'full-e2e', command: 'npm run test:e2e', exitCode: 0 },
  {
    id: 'release-count',
    command: 'npm run check:brand-v2-enforcement:release:counts',
    // The sealed milestone-red shape: the release gate must still refuse the
    // pending corpus, so a zero exit code here would mean the audit recorded
    // a gate that had stopped enforcing.
    exitCode: 1,
  },
  {
    id: 'focused-mutation',
    command:
      'npx playwright test --config playwright.brand-v2.config.ts tests/e2e/brand-v2-route-flows.spec.ts -g "rejects a route profile" --workers=1',
    exitCode: 0,
    observation: [/empty-font-resource-population/, /320/, /reflow/i],
  },
];

/**
 * Naming a mutation and restoring the file proves only that a file was edited
 * and put back. Each required mutation is therefore bound to the subject it
 * ran against, the failure class it expected, and the observation markers the
 * real run produced. Each named failure class must also still be emitted by
 * the product source that emits it: a mutation proof whose failure class no
 * longer exists in the shipped code is stale evidence, not evidence.
 */
const REQUIRED_MUTATIONS: ReadonlyArray<{
  name: string;
  subject: RegExp[];
  expectedFailure: RegExp[];
  observed: RegExp[];
  /**
   * The mutation's result is a measured overflow: `measuredOverflowPx` must
   * be present and positive, the reason the run returned must quote exactly
   * that number, and the number must not be one of the dimensions the
   * subject set up, so restating the 320x800 viewport cannot pass for a
   * measurement.
   */
  measuredOverflow?: true;
  emittedFailures: Array<{
    record: RegExp;
    source: string;
    sourceMarker: RegExp;
  }>;
}> = [
  {
    name: 'font-empty-population',
    subject: [/font/i, /resource|timing/i],
    expectedFailure: [/\bresource-font\b/, /\bempty-font-resource-population\b/],
    observed: [/\bempty\b/i, /validateRouteProfile/, /clear|abort|block/i],
    emittedFailures: [
      {
        record: /empty-font-resource-population/,
        source: 'lib/brand-v2-route-profile.ts',
        sourceMarker: /reason: 'empty-font-resource-population'/,
      },
    ],
  },
  {
    name: 'forced-320-overflow',
    subject: [/320/, /viewport/i],
    expectedFailure: [/reflow/i, /positive/i, /overflow/i],
    observed: [/\b\d+px\b/, /positive/i, /overflow/i, /reflow/i],
    measuredOverflow: true,
    emittedFailures: [
      {
        record: /px-overflow/,
        source: 'lib/brand-v2-route-profile.ts',
        sourceMarker: /px-overflow/,
      },
    ],
  },
  {
    name: 'omitted-route-check-class',
    subject: [/executedChecks/, /brand-v2-route-flows\.spec\.ts/],
    expectedFailure: [/\baxe\b/, /missing|equality|reconcil/i],
    observed: [/\baxe\b/, /remov(?:ing|ed)/i, /fail/i],
    emittedFailures: [
      {
        record: /\baxe\b/,
        source: 'lib/brand-v2-runners.ts',
        sourceMarker: /'axe'/,
      },
    ],
  },
  {
    name: 'combined-value-state-and-manifest-drift',
    subject: [/baseline/i, /value/i],
    expectedFailure: [
      /empty-value-state-population/,
      /manifest/i,
      /ok:false|envelope/i,
    ],
    observed: [
      /empty-value-state-population/,
      /accessible-names/,
      /changed-member/,
    ],
    emittedFailures: [
      {
        record: /empty-value-state-population/,
        source: 'lib/brand-v2-baseline.ts',
        sourceMarker: /reason: 'empty-value-state-population'/,
      },
      {
        record: /accessible-names/,
        source: 'scripts/brand-v2-baseline.ts',
        sourceMarker: /'accessible-names'/,
      },
    ],
  },
];

/**
 * An unfilled token is not evidence, and a schema that only requires a
 * non-empty string accepts one. `reflow / <measured>px-overflow` satisfied
 * every marker the forced-reflow proof was asked for while recording no
 * result, so the whole record is swept rather than the one field that was
 * caught.
 */
const PLACEHOLDER_TOKEN =
  /<[A-Za-z][\w .-]*>|\bTBD\b|\bTODO\b|\bFIXME\b|\bXX+\b|\bplaceholder\b|\?\?\?|\bpending\s+measurement\b/i;

function recordedStrings(
  value: unknown,
  path = '$',
): Array<{ path: string; value: string }> {
  if (typeof value === 'string') return [{ path, value }];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      recordedStrings(entry, `${path}[${index}]`),
    );
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entry]) =>
      recordedStrings(entry, `${path}.${key}`),
    );
  }
  return [];
}

function integersIn(text: string): number[] {
  return [...text.matchAll(/\d+/g)].map(([digits]) => Number(digits));
}

/** Every `npm run`/`npm test` invocation inside a recorded command line. */
function npmScriptsIn(command: string): string[] {
  return command
    .split('&&')
    .map((segment) => segment.trim())
    .flatMap((segment) => {
      const run = /^npm\s+run\s+([^\s]+)/.exec(segment);
      if (run) return [run[1]];
      return /^npm\s+test\b/.test(segment) ? ['test'] : [];
    });
}

function git(...args: string[]): string {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
}

/**
 * The sealed release outcome, recounted from the audited commit's own
 * enforcement corpus rather than read back out of the audit's prose: a count a
 * record supplies about itself is not evidence for that count.
 */
function auditedReleaseFailureCounts(): {
  pendingResultBlocksRelease: number;
  populationWideCoverageBlocksRelease: number;
  total: number;
} {
  const corpus = JSON.parse(
    git('show', `${AUDITED_COMMIT}:evidence/brand-v2/results.json`),
  ) as {
    results: Array<{ status: string; coverageKind: string }>;
  };
  if (corpus.results.length === 0) {
    throw new Error('The audited enforcement corpus is empty.');
  }
  const pendingResultBlocksRelease = corpus.results.filter(
    ({ status }) => status === 'pending',
  ).length;
  const populationWideCoverageBlocksRelease = corpus.results.filter(
    ({ coverageKind }) => coverageKind === 'population-wide',
  ).length;
  if (
    pendingResultBlocksRelease === 0 ||
    populationWideCoverageBlocksRelease === 0
  ) {
    throw new Error(
      'The audited corpus no longer produces both release-blocking failure classes.',
    );
  }
  return {
    pendingResultBlocksRelease,
    populationWideCoverageBlocksRelease,
    total:
      pendingResultBlocksRelease + populationWideCoverageBlocksRelease,
  };
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

    const sealedCounts = auditedReleaseFailureCounts();
    for (const required of REQUIRED_COMMANDS) {
      const matching = audit.commands.filter(
        ({ command }) => command === required.command,
      );
      expect(
        matching.length,
        `missing required audit command ${required.id}: ${required.command}`,
      ).toBeGreaterThan(0);
      for (const entry of matching) {
        expect(
          entry.exitCode,
          `audit command ${required.id} recorded the wrong outcome: ${entry.command}`,
        ).toBe(required.exitCode);
        for (const marker of required.observation ?? []) {
          expect(
            entry.observation,
            `audit command ${required.id} observation must record ${marker.source}`,
          ).toMatch(marker);
        }
      }
      if (required.id === 'focused-mutation') {
        // The command that ran the reflow plant has to report the same
        // overflow the mutation record stores, so the two halves of the
        // proof cannot drift into agreeing with nothing.
        const measured = mutations.get('forced-320-overflow')
          ?.measuredOverflowPx;
        expect(
          measured,
          'the focused mutation run measures the forced-reflow overflow',
        ).toBeDefined();
        for (const entry of matching) {
          expect(
            entry.observation,
            `the focused mutation observation must state the ${String(measured)}px overflow it measured`,
          ).toContain(`${String(measured)}px`);
        }
      }
      if (required.id !== 'release-count') continue;
      for (const entry of matching) {
        const counts = entry.releaseFailureCounts;
        expect(
          counts,
          'the release-count gate must record the failure population it reported',
        ).toBeDefined();
        if (counts === undefined) continue;
        expect(
          counts,
          'the recorded release-count outcome must equal the audited enforcement corpus',
        ).toEqual(sealedCounts);
        // Recorded and asserted, so the prose and the structured counts
        // cannot drift apart: a number changed in one place fails here.
        for (const value of [
          sealedCounts.total,
          sealedCounts.pendingResultBlocksRelease,
          sealedCounts.populationWideCoverageBlocksRelease,
        ]) {
          expect(
            entry.observation,
            `release-count observation must state ${value}`,
          ).toContain(String(value));
        }
      }
    }

    for (const required of REQUIRED_MUTATIONS) {
      const mutation = mutations.get(required.name);
      expect(mutation, `missing audit mutation ${required.name}`).toBeDefined();
      if (mutation === undefined) continue;
      expect(mutation.restoredByteIdentical).toBe(true);
      for (const [field, markers] of [
        ['subject', required.subject],
        ['expectedFailure', required.expectedFailure],
        ['observed', required.observed],
      ] as const) {
        for (const marker of markers) {
          expect(
            mutation[field],
            `audit mutation ${required.name} ${field} must record ${marker.source}`,
          ).toMatch(marker);
        }
      }
      for (const emitted of required.emittedFailures) {
        expect(
          `${mutation.expectedFailure}\n${mutation.observed}`,
          `audit mutation ${required.name} must name the ${emitted.source} failure class`,
        ).toMatch(emitted.record);
        expect(
          readFileSync(join(process.cwd(), emitted.source), 'utf8'),
          `${emitted.source} no longer emits the failure class ${required.name} claims`,
        ).toMatch(emitted.sourceMarker);
      }
      if (!required.measuredOverflow) continue;
      const measured = mutation.measuredOverflowPx;
      expect(
        measured,
        `audit mutation ${required.name} must record the overflow it measured`,
      ).toBeDefined();
      if (measured === undefined) continue;
      expect(
        mutation.observed,
        `audit mutation ${required.name} must report the ${measured}px-overflow reason the run returned`,
      ).toContain(`${measured}px-overflow`);
      // The measurement is the result; the viewport and the plant are the
      // setup. A number that only restates the setup is not an observation,
      // which is how a `320x800` subject could satisfy a bare `\d+px` marker.
      expect(
        integersIn(mutation.subject),
        `audit mutation ${required.name} measured overflow must not restate a setup dimension`,
      ).not.toContain(measured);
    }
    expect(new Set(mutations).size).toBe(audit.mutations.length);
    // Restoration is asserted for every recorded mutation, not only the
    // required ones: a plant left in the tree is not a proof.
    for (const mutation of audit.mutations) {
      expect(
        mutation.restoredByteIdentical,
        `audit mutation ${mutation.name} was not restored byte-identically`,
      ).toBe(true);
    }

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

  it('records no placeholder token in any evidence string', () => {
    const audit = auditSchema.parse(
      JSON.parse(readFileSync(AUDIT_PATH, 'utf8')) as unknown,
    );
    const recorded = recordedStrings(audit);
    expect(recorded.length).toBeGreaterThan(0);
    expect(
      recorded
        .filter(({ value }) => PLACEHOLDER_TOKEN.test(value))
        .map(({ path, value }) => `${path}: ${value}`),
    ).toEqual([]);
  });

  it('records commands and an auditor commit that exist outside the record', () => {
    const audit = auditSchema.parse(
      JSON.parse(readFileSync(AUDIT_PATH, 'utf8')) as unknown,
    );
    const scripts = Object.keys(
      (
        JSON.parse(
          readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
        ) as { scripts: Record<string, string> }
      ).scripts,
    );
    // Every recorded gate has to be a gate this repository can run. A
    // command naming a script that does not exist records a run that could
    // not have happened.
    const referenced = audit.commands.flatMap(({ command }) =>
      npmScriptsIn(command),
    );
    expect(referenced.length).toBeGreaterThan(0);
    expect(
      referenced.filter((script) => !scripts.includes(script)),
      'recorded npm scripts must exist in package.json',
    ).toEqual([]);
    if (audit.auditorCommit !== null) {
      expect(
        git('cat-file', '-t', audit.auditorCommit),
        'the recorded auditor commit must resolve in this repository',
      ).toBe('commit');
    }
  });

  it('cites only source and artifact files that exist', () => {
    const audit = auditSchema.parse(
      JSON.parse(readFileSync(AUDIT_PATH, 'utf8')) as unknown,
    );
    const tracked = new Set(git('ls-files').split('\n').filter(Boolean));
    expect(tracked.size).toBeGreaterThan(0);
    // Only code and artifact citations are resolved here: the audit also
    // cites mission guidance, which lives outside this repository.
    const CITATION = /\b(?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_.-]+\.(?:ts|tsx|json|css|mdx)\b/g;
    const cited = [
      ...new Set(
        recordedStrings(audit).flatMap(({ value }) =>
          [...value.matchAll(CITATION)].map(([path]) => path),
        ),
      ),
    ].sort();
    expect(cited.length).toBeGreaterThan(0);
    expect(
      cited.filter((path) => !tracked.has(path)),
      'every cited source or artifact file must be tracked in this repository',
    ).toEqual([]);
  });
});
