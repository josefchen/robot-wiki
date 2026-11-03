import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalReleaseSourceBytes } from '../../lib/brand-v2-release-source';

/** Public release trees omit private agent instructions; Next may regenerate
 * its exact scaffold. A tracked project guide cannot disappear or degrade
 * to that scaffold, and unfamiliar instruction bytes never gain an exemption. */
export function projectInstructionText(bytes: Buffer | null, tracked: boolean): string | null {
  if (bytes === null) {
    if (tracked) throw new Error('Tracked project instructions are missing');
    return null;
  }
  canonicalReleaseSourceBytes('AGENTS.md', bytes);
  const text = bytes.toString('utf8');
  const projectGuide = text.includes('## Robot Wiki research-page standard (current authority)');
  if (tracked && !projectGuide) throw new Error('Tracked project instructions lost their project rules');
  return projectGuide ? text : null;
}

export function readProjectInstructionText(root: string): string | null {
  const tracked = execFileSync('git', ['ls-files', '--', 'AGENTS.md'], {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim() === 'AGENTS.md';
  const path = join(root, 'AGENTS.md');
  return projectInstructionText(existsSync(path) ? readFileSync(path) : null, tracked);
}
