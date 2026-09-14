import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Explicit scoped dev-reader opt-in; absent opt-in preserves the export fixture. */
export function ownedReaderBase(
  env: Readonly<Record<string, string | undefined>> = process.env,
  read: (path: string) => Buffer = readFileSync,
  root: string = process.cwd(),
): string | undefined {
  const url = env.ROBOT_WIKI_SCOPED_READER_URL;
  if (!url) return undefined;
  if (!/^http:\/\/127\.0\.0\.1:\d{4,5}$/.test(url) || !env.ROBOT_WIKI_GATE_INPUTS) {
    throw new Error('Scoped reader requires an explicit loopback target and input manifest');
  }
  const manifest = JSON.parse(read(env.ROBOT_WIKI_GATE_INPUTS).toString());
  if (manifest.requiredStage !== 'orb-reader-closeout-v1:readers' || manifest.readerBaseURL !== url) {
    throw new Error('Scoped reader target does not match its bound run');
  }
  for (const name of ['data/glossary.ts', 'data/citations.ts', 'tests/e2e/glossary.spec.ts', 'tests/e2e/owned-reader-base.ts']) {
    const path = resolve(root, name);
    const bytes = read(path);
    const identity = { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    if (JSON.stringify(manifest.requiredInputs?.[path]) !== JSON.stringify(identity) ||
        JSON.stringify(manifest.inputs?.[path]) !== JSON.stringify(identity)) {
      throw new Error(`Missing or stale scoped reader input: ${name}`);
    }
  }
  return url;
}
