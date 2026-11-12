import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectInstructionText } from '../helpers/project-instructions';

const { writeAgentFiles } = createRequire(import.meta.url)('next/dist/server/lib/generate-agent-files.js') as {
  writeAgentFiles: (root: string) => void;
};

describe('project instruction applicability in a public release', () => {
  it('accepts an absent untracked guide or the generated Next scaffold, and rejects a tracked guide without project rules', () => {
    const root = mkdtempSync(join(tmpdir(), 'project-instructions-'));
    try {
      writeAgentFiles(root);
      const scaffold = readFileSync(join(root, 'AGENTS.md'));
      expect(projectInstructionText(null, false)).toBeNull();
      expect(projectInstructionText(scaffold, false)).toBeNull();
      expect(() => projectInstructionText(null, true)).toThrow('Tracked project instructions are missing');
      expect(() => projectInstructionText(scaffold, true)).toThrow('lost their project rules');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
