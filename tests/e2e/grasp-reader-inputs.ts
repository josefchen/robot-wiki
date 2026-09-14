import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ownedReaderBase } from './owned-reader-base';

export const GRASP_READER_INPUTS = [
  'tests/e2e/grasp-reader-inputs.ts',
  'tests/e2e/grasp-reader-fixture.ts',
  'tests/e2e/grasp-reader-capture.ts',
  'tests/e2e/grasp-source-readers.spec.ts',
  'tests/e2e/grasp-planning.spec.ts',
  'tests/e2e/slider.ts',
  'tests/helpers/grasp-contact-grid.ts',
  'lib/grasp.ts',
  'components/interactive/grasp-wrench-lab.tsx',
  'content/classical/grasp-planning.mdx',
  'data/citations.ts',
  'data/glossary.ts',
] as const;

export function graspReaderBase(
  env: Readonly<Record<string, string | undefined>> = process.env,
  read: (path: string) => Buffer = readFileSync,
  root = process.cwd(),
): string | undefined {
  const url = ownedReaderBase(env, read, root);
  if (!url) return undefined;
  const manifest = JSON.parse(read(env.ROBOT_WIKI_GATE_INPUTS!).toString());
  for (const name of GRASP_READER_INPUTS) {
    const path = resolve(root, name);
    const bytes = read(path);
    const identity = { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    if (JSON.stringify(manifest.requiredInputs?.[path]) !== JSON.stringify(identity) ||
        JSON.stringify(manifest.inputs?.[path]) !== JSON.stringify(identity)) {
      throw new Error(`Missing or stale grasp reader input: ${name}`);
    }
  }
  return url;
}
