import { expect, test as base } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BrandV2Registry } from '../../lib/brand-v2-runners';
import { startStaticExportServer } from './static-export-server';

const OUT = join(process.cwd(), 'out');

export const brandV2Registry = JSON.parse(
  readFileSync(
    join(process.cwd(), 'contract', 'brand-v2-registries.json'),
    'utf8',
  ),
) as BrandV2Registry;

type ExpectedRedArchive = {
  failures: Array<{
    suite: string;
    assertionId: string;
    expected: string;
    actual: string;
    failedAnchors?: string[];
    rolloutMilestone: string;
  }>;
};

const expectedRedArchive = JSON.parse(
  readFileSync(
    join(process.cwd(), 'evidence', 'brand-v2', 'expected-red-v1.json'),
    'utf8',
  ),
) as ExpectedRedArchive;

export function archivedExpectedRed(
  suite: string,
  assertionId: string,
): string {
  const entry = expectedRedArchive.failures.find(
    (failure) =>
      failure.suite === suite && failure.assertionId === assertionId,
  );
  if (!entry) {
    throw new Error(
      `Missing expected-red archive entry for ${suite} ${assertionId}.`,
    );
  }
  return `Expected-red v1 drift until ${entry.rolloutMilestone}: ${entry.actual} → ${entry.expected}`;
}

export function archivedExpectedRedAnchors(
  suite: string,
  assertionId: string,
): string[] {
  const entry = expectedRedArchive.failures.find(
    (failure) =>
      failure.suite === suite && failure.assertionId === assertionId,
  );
  if (!entry || !Object.hasOwn(entry, 'failedAnchors')) {
    throw new Error(
      `Missing expected-red anchor list for ${suite} ${assertionId}.`,
    );
  }
  return entry.failedAnchors ?? [];
}

type WorkerFixtures = {
  staticBase: string;
};

export const test = base.extend<Record<never, never>, WorkerFixtures>({
  staticBase: [
    async ({}, run) => {
      expect(
        existsSync(join(OUT, 'index.html')),
        'out/ is missing: run `npm run build` before brand-v2 static suites',
      ).toBe(true);
      const server = await startStaticExportServer(OUT, 0, {
        notFoundFallback: true,
      });
      try {
        await run(`http://localhost:${server.port}`);
      } finally {
        await server.stop();
      }
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
