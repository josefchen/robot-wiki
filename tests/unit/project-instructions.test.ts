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
  it('accepts only an absent untracked guide or the exact generated Next scaffold', () => {
    const root = mkdtempSync(join(tmpdir(), 'project-instructions-'));
    try {
      writeAgentFiles(root);
      const scaffold = readFileSync(join(root, 'AGENTS.md'));
      expect(projectInstructionText(null, false)).toBeNull();
      expect(projectInstructionText(scaffold, false)).toBeNull();
      expect(() => projectInstructionText(null, true)).toThrow('Tracked project instructions are missing');
      expect(() => projectInstructionText(scaffold, true)).toThrow('lost their project rules');
      for (const tracked of [false, true]) {
        expect(() => projectInstructionText(Buffer.concat([scaffold, Buffer.from('\nChanged instructions.\n')]), tracked)).toThrow('unreviewed');
        expect(() => projectInstructionText(Buffer.from('## Robot Wiki research-page standard (current authority)\nInvented rules.'), tracked)).toThrow('unreviewed');
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
