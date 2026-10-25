import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DOMAINS } from '../../data/domains.ts';

/**
 * VAL-OPUS-122: the structural-tell floor binds every domain. The plant runs
 * the real lint CLI over a copy of content/ with a three-tells-per-1,000-words
 * fixture in each domain in turn; every plant must fail and name its fixture,
 * and the unplanted copy must pass.
 */
describe('structural-tell floor plant', () => {
  it('fails a planted fixture in each of the seven domains and passes the clean copy', () => {
    const run = spawnSync(process.execPath, ['scripts/plant-no-slop-structural.ts'], { encoding: 'utf8' });
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
    expect(run.stdout).toContain('clean copy: exit 0');
    expect(DOMAINS).toHaveLength(7);
    for (const domain of DOMAINS) {
      expect(run.stdout).toMatch(new RegExp(`^${domain}: exit 1, names the fixture`, 'm'));
    }
  }, 60_000);

  it('is registered as an npm script beside the lint it plants', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts['check:no-slop-structural:plant']).toBe('node scripts/plant-no-slop-structural.ts');
  });
});
