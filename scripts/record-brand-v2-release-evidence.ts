import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectReleaseStateIndex, RELEASE_STATE_INDEX_PATH } from '../lib/brand-v2-release-index.ts';
import { RELEASE_EVIDENCE_DIRECTORY } from '../lib/brand-v2-release-evidence.ts';
export { collectReleaseStateIndex, RELEASE_STATE_INDEX_PATH } from '../lib/brand-v2-release-index.ts';

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const index = collectReleaseStateIndex(process.cwd());
  const path = join(process.cwd(), RELEASE_STATE_INDEX_PATH);
  if (process.argv.includes('--check')) {
    if (!existsSync(path) || JSON.stringify(JSON.parse(readFileSync(path, 'utf8'))) !== JSON.stringify(index)) throw new Error('release state index is missing or stale');
  } else if (process.argv.includes('--write')) {
    mkdirSync(join(process.cwd(), RELEASE_EVIDENCE_DIRECTORY), { recursive: true });
    writeFileSync(path, JSON.stringify(index, null, 2) + '\n');
  } else throw new Error('Usage: node scripts/record-brand-v2-release-evidence.ts --write|--check');
  console.log(`release state index: ${JSON.stringify(index.counts)}`);
}
