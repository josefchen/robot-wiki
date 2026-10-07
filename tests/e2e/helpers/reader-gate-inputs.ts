import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const READER_INPUTS_SCHEMA = 'browser-current-attempt-inputs-v1';

const SELF = 'tests/e2e/helpers/reader-gate-inputs.ts';
const ORACLE = 'tests/e2e/helpers/keypoint-reader-oracle.ts';

/** Specs allowed in each offline reader lane and the helpers their evidence depends on. */
export const READER_LANES = {
  'motion-planning': {
    specs: [
      'tests/e2e/motion-planning.spec.ts',
      'tests/e2e/motion-planning-optimal-readers.spec.ts',
      'tests/e2e/motion-planning-trajectory-readers.spec.ts',
      'tests/e2e/motion-three-reader-closeout.spec.ts',
      'tests/e2e/rrt-date-readers.spec.ts',
    ],
    helpers: ['tests/e2e/helpers/motion-planning-offline-fixture.ts', ORACLE, SELF],
  },
  'state-smoothing': {
    specs: ['tests/e2e/state-estimation.spec.ts', 'tests/e2e/state-smoothing-readers.spec.ts'],
    helpers: ['tests/e2e/helpers/state-smoothing-fixture.ts', ORACLE, SELF],
  },
  keypoint: {
    specs: ['tests/e2e/perception-keypoint-readers.spec.ts'],
    helpers: ['tests/e2e/servo-apollo-fixture.ts', ORACLE, 'tests/e2e/helpers/term-consumer-inventory.ts', 'tests/e2e/slider.ts', 'tests/e2e/helpers/figure-fold.ts', SELF],
  },
  'servo-apollo': {
    specs: ['tests/e2e/servo-apollo-reader.spec.ts'],
    helpers: ['tests/e2e/servo-apollo-fixture.ts', SELF],
  },
} as const;

export type ReaderLane = keyof typeof READER_LANES;
export type ReaderGateInputs = { inputPath: string; inputSha256: string; root: string | undefined };
type Env = Readonly<Record<string, string | undefined>>;
type Read = (path: string) => Buffer;
type RunConfig = { configFile?: string; projects: readonly { outputDir: string }[] };
type RunTest = { file: string; project: { outputDir: string }; config: { configFile?: string } };

const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const repoRoot = (configFile: string | undefined) => (configFile ? dirname(configFile) : process.cwd());

/** Sits beside the per-test output folders, which Playwright clears before each run. */
export function runReaderInputsPath(outputDir: string): string {
  return join(outputDir, '.reader-inputs', 'current-run.inputs.json');
}

export function readerInputFiles(root: string): string[] {
  const files = Object.values(READER_LANES).flatMap(lane => [...lane.specs, ...lane.helpers]);
  return [...new Set(files)].map(file => resolve(root, file));
}

export function writeRunReaderInputs(path: string, files: readonly string[], read: Read = readFileSync, now = new Date()): void {
  const inputs = Object.fromEntries(files.map(file => [file, { sha256: digest(read(file)) }]));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({
    schema: READER_INPUTS_SCHEMA,
    purpose: 'Local run execution identity, not source certification',
    createdAt: now.toISOString(),
    sourceAuditPerformed: false,
    independentAcceptance: false,
    inputs,
  }, null, 2));
}

/** Returns the manifest digest, or throws when the manifest or any listed input is missing, malformed or stale. */
export function verifyReaderInputs(path: string, files: readonly string[], read: Read = readFileSync): string {
  let bytes: Buffer;
  let manifest: { schema?: unknown; inputs?: Record<string, { sha256?: unknown } | undefined> } | null;
  try {
    bytes = read(path);
    manifest = JSON.parse(bytes.toString());
  } catch {
    throw new Error(`Missing or unreadable reader input manifest: ${path}`);
  }
  if (manifest?.schema !== READER_INPUTS_SCHEMA || typeof manifest.inputs !== 'object' || manifest.inputs === null) {
    throw new Error(`Malformed reader input manifest: ${path}`);
  }
  for (const file of files) {
    const expected = manifest.inputs[file]?.sha256;
    if (typeof expected !== 'string' || digest(read(file)) !== expected) throw new Error(`Missing or stale reader input: ${file}`);
  }
  return digest(bytes);
}

/**
 * Program runs pass ROBOT_WIKI_GATE_INPUTS and ROBOT_WIKI_EVIDENCE_ROOT and keep
 * their own checks. A plain run binds to the manifest written by this module's
 * global setup and keeps evidence inside the project's output directory.
 */
export function readerGateInputs(info: RunTest, lane: ReaderLane, env: Env = process.env, read: Read = readFileSync): ReaderGateInputs {
  const programInputs = env.ROBOT_WIKI_GATE_INPUTS;
  if (programInputs) return { inputPath: programInputs, inputSha256: digest(read(programInputs)), root: env.ROBOT_WIKI_EVIDENCE_ROOT };
  if (env.ROBOT_WIKI_EVIDENCE_ROOT) throw new Error('ROBOT_WIKI_EVIDENCE_ROOT requires ROBOT_WIKI_GATE_INPUTS');
  const root = repoRoot(info.config.configFile);
  const { specs, helpers } = READER_LANES[lane];
  if (!specs.some(spec => resolve(root, spec) === info.file)) throw new Error(`${info.file} is not registered in the ${lane} reader lane`);
  const inputPath = runReaderInputsPath(info.project.outputDir);
  const inputSha256 = verifyReaderInputs(inputPath, [info.file, ...helpers.map(helper => resolve(root, helper))], read);
  return { inputPath, inputSha256, root: info.project.outputDir };
}

export function writeReaderInputsForRun(config: RunConfig, env: Env = process.env): void {
  if (env.ROBOT_WIKI_GATE_INPUTS) return;
  const files = readerInputFiles(repoRoot(config.configFile));
  for (const outputDir of new Set(config.projects.map(project => project.outputDir))) {
    writeRunReaderInputs(runReaderInputsPath(outputDir), files);
  }
}

export default function globalSetup(config: RunConfig): void {
  writeReaderInputsForRun(config);
}
