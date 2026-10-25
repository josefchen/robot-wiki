/**
 * Mutation proof for the structural-tell floor of scripts/lint-no-slop.ts
 * (VAL-OPUS-122): for every domain, plants a fixture article carrying three
 * not-X disclaimers per 1,000 words into a copy of content/, and requires the
 * lint (the same CLI, --report-structural) to exit non-zero naming that
 * fixture. The unplanted copy must pass. content/ itself is never written.
 *
 *   node scripts/plant-no-slop-structural.ts
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DOMAINS } from '../data/domains.ts';
import { STRUCTURAL_TELL_LIMIT, structuralTellReport } from '../lib/no-slop.ts';

const FIXTURE = 'zz-structural-floor-plant.mdx';
const CLEAN =
  'The arm reaches the cup in about two seconds and the camera records each pose for the next training run. ';
const TELLS = [
  'The result is a map of mechanisms, not a leaderboard.',
  'Treat the curve as a lab report, not a replication.',
  'The policy learns from failure rather than from success alone.',
];

function fixtureBody(): string {
  // About 1,000 masked words with exactly three counted not-X tells.
  const filler = Array(24).fill(CLEAN).join('');
  return `---\ntitle: "Structural floor plant"\n---\n\n${filler}\n\n${TELLS.join(' ')}\n\n${filler}\n`;
}

const body = fixtureBody();
const expected = structuralTellReport(body);
if (expected.notX !== 3 || expected.density <= STRUCTURAL_TELL_LIMIT || expected.density > 3.2) {
  throw new Error(`plant-no-slop-structural: fixture is ${expected.notX} not-X at ${expected.density.toFixed(2)}/1k, expected 3 near 3/1k`);
}

function lint(contentDir: string) {
  return spawnSync(process.execPath, ['scripts/lint-no-slop.ts', '--report-structural', '--content-dir', contentDir], {
    encoding: 'utf8',
  });
}

const dir = mkdtempSync(join(tmpdir(), 'no-slop-structural-'));
const failures: string[] = [];
try {
  const copy = join(dir, 'content');
  cpSync('content', copy, { recursive: true });
  const clean = lint(copy);
  console.log(`clean copy: exit ${clean.status}`);
  if (clean.status !== 0) failures.push(`clean copy exited ${clean.status}:\n${clean.stderr}`);
  for (const domain of DOMAINS) {
    const planted = join(copy, domain, FIXTURE);
    writeFileSync(planted, body);
    const run = lint(copy);
    rmSync(planted);
    const named = run.stderr.includes(`/${domain}/${FIXTURE}`);
    console.log(`${domain}: exit ${run.status}${named ? ', names the fixture' : ''} (${expected.density.toFixed(2)} tells/1k planted)`);
    if (run.status === 0 || !named) failures.push(`${domain}: the planted fixture passed or was not named`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
if (failures.length) {
  console.error(`plant-no-slop-structural: FAILED\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`plant-no-slop-structural: OK (${DOMAINS.length} planted domains fail, clean copy passes)`);
