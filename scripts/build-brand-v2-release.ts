import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { releaseSourceFingerprint } from '../lib/brand-v2-release-evidence.ts';
import { RELEASE_BUILD_COMMANDS, RELEASE_BUILD_STAMP, releaseBuildProblems, releaseExportFingerprint, releaseGeneratedSearchMirrorProblems,type ReleaseBuildStamp } from '../lib/brand-v2-release-build.ts';

const root = process.cwd();
const path = join(root, RELEASE_BUILD_STAMP);
// A failed rebuild cannot leave an earlier passing stamp behind.
rmSync(path, { force: true });
const sourceBefore = releaseSourceFingerprint(root);
const commands: ReleaseBuildStamp['commands'] = [];
for (const argv of RELEASE_BUILD_COMMANDS) {
  const run = spawnSync(argv[0], argv.slice(1), { cwd: root, stdio: 'inherit', env: process.env });
  commands.push({ argv: [...argv], exitCode: run.status ?? -1 });
  if (run.error || run.status !== 0) throw new Error(`release production build failed: ${argv.join(' ')}: ${run.error?.message ?? run.status}`);
}
const sourceAfter = releaseSourceFingerprint(root);
const exported = releaseExportFingerprint(root);
const stamp: ReleaseBuildStamp = { version: 1, sourceBefore, sourceAfter, exportFingerprint: exported, commands };
const failures = [...releaseBuildProblems(stamp, { source: sourceAfter, exported }),...releaseGeneratedSearchMirrorProblems(root)];
if (failures.length) throw new Error(failures.join('\n'));
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, JSON.stringify(stamp, null, 2) + '\n');
console.log(`Frozen production export: source=${sourceAfter} export=${exported}`);
