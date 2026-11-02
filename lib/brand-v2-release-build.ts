import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { releaseSourceFingerprint } from './brand-v2-release-evidence.ts';

export const RELEASE_BUILD_STAMP = 'evidence/brand-v2/release/build.json';
export const RELEASE_BUILD_COMMANDS = [
  ['npm', 'run', 'build:ungated'],
  ['node', 'scripts/prune-export-artifacts.ts'],
  ['node', 'scripts/patch-404-guard.ts'],
  ['node', 'scripts/build-search.ts'],
] as const;
const sha = z.string().regex(/^[a-f0-9]{64}$/);
export const releaseBuildSchema = z.object({
  version: z.literal(1), sourceBefore: sha, sourceAfter: sha, exportFingerprint: sha,
  commands: z.array(z.object({ argv: z.array(z.string()).min(1), exitCode: z.number().int() }).strict()).min(1),
}).strict();
export type ReleaseBuildStamp = z.infer<typeof releaseBuildSchema>;

export function releaseExportFingerprint(root: string): string {
  const hash = createHash('sha256'); let files = 0;
  const walk = (directory: string) => {
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = `${directory}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`release export contains a symlink: ${path}`);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) { hash.update(path).update('\0').update(readFileSync(join(root, path))).update('\0'); files += 1; }
    }
  };
  if (!existsSync(join(root, 'out/index.html'))) throw new Error('release export has no home page');
  walk('out');
  if (files < 2) throw new Error('release export has no nonempty asset population');
  return hash.digest('hex');
}

export function releaseBuildProblems(input: unknown, current: { source: string; exported: string }): string[] {
  const parsed = releaseBuildSchema.safeParse(input);
  if (!parsed.success) return [`invalid release build stamp: ${parsed.error.message}`];
  const stamp = parsed.data; const failures: string[] = [];
  if (stamp.sourceBefore !== stamp.sourceAfter) failures.push('source changed during production build; freeze derived files and rebuild');
  if (stamp.sourceAfter !== current.source) failures.push('production build has a stale source fingerprint');
  if (stamp.exportFingerprint !== current.exported) failures.push('production export bytes changed after the build');
  if (JSON.stringify(stamp.commands.map(({ argv }) => argv)) !== JSON.stringify(RELEASE_BUILD_COMMANDS)) failures.push('production build command sequence differs');
  if (stamp.commands.some(({ exitCode }) => exitCode !== 0)) failures.push('production build command failed');
  return failures;
}

export function readReleaseBuildStamp(root: string): ReleaseBuildStamp {
  const stamp: unknown = JSON.parse(readFileSync(join(root, RELEASE_BUILD_STAMP), 'utf8'));
  const failures = releaseBuildProblems(stamp, { source: releaseSourceFingerprint(root), exported: releaseExportFingerprint(root) });
  if (failures.length) throw new Error(failures.join('\n'));
  return releaseBuildSchema.parse(stamp);
}
