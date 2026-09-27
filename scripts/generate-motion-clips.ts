/**
 * Generates the runtime registry of the motion language's cinematic
 * clips from motion-clips.json, the single source of truth:
 *
 *   lib/motion-clips.ts    TypeScript registry read by <Clip>
 *
 * Edit motion-clips.json, never the generated file. The committed bytes
 * must stay identical to a fresh run (tests/unit/motion-clips.test.ts).
 *
 *   npm run generate:motion-clips
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'motion-clips.json');

export type MotionClipStatus =
  | 'schematic'
  | 'authored'
  | 'toy'
  | 'illustrative'
  | 'not measured';

export interface MotionClipBeat {
  caption: string;
  durationMs: number;
}

export interface MotionClipManifestEntry {
  id: string;
  title: string;
  route: string;
  teaches: string;
  status: MotionClipStatus;
  statusNote: string;
  width: number;
  height: number;
  beats: MotionClipBeat[];
  textAlternative: string;
}

export interface MotionClipsManifest {
  version: number;
  description: string;
  budgetBytes: number;
  clips: MotionClipManifestEntry[];
}

export function loadManifest(): MotionClipsManifest {
  return JSON.parse(readFileSync(SOURCE, 'utf8')) as MotionClipsManifest;
}

/** The per-file ceiling for every shipped clip artifact, in bytes. */
export const MOTION_CLIP_BUDGET_BYTES: number = loadManifest().budgetBytes;

export interface ClipBudgetFile {
  path: string;
  bytes: number;
}

export interface ClipBudgetViolation {
  path: string;
  bytes: number;
  budgetBytes: number;
}

/** Every file over the budget, in the order given. At-budget passes. */
export function clipBudgetViolations(
  files: ReadonlyArray<ClipBudgetFile>,
): ClipBudgetViolation[] {
  return files
    .filter((file) => file.bytes > MOTION_CLIP_BUDGET_BYTES)
    .map((file) => ({
      path: file.path,
      bytes: file.bytes,
      budgetBytes: MOTION_CLIP_BUDGET_BYTES,
    }));
}

function clipFiles(id: string) {
  return {
    webm: `/clips/${id}.webm`,
    mp4: `/clips/${id}.mp4`,
    poster: `/clips/${id}.png`,
    vtt: `/clips/${id}.vtt`,
    text: `/clips/${id}.txt`,
  };
}

export function buildTypeScript(manifest: MotionClipsManifest): string {
  const entries = manifest.clips
    .map((clip) => {
      const durationMs = clip.beats.reduce(
        (sum, beat) => sum + beat.durationMs,
        0,
      );
      const beats = clip.beats
        .map(
          (beat) =>
            `    { caption: ${JSON.stringify(beat.caption)}, durationMs: ${beat.durationMs} },`,
        )
        .join('\n');
      return [
        `  '${clip.id}': {`,
        `    id: '${clip.id}',`,
        `    title: ${JSON.stringify(clip.title)},`,
        `    route: '${clip.route}',`,
        `    teaches: ${JSON.stringify(clip.teaches)},`,
        `    status: '${clip.status}',`,
        `    statusNote: ${JSON.stringify(clip.statusNote)},`,
        `    width: ${clip.width},`,
        `    height: ${clip.height},`,
        `    durationMs: ${durationMs},`,
        '    beats: [',
        beats,
        '    ],',
        `    textAlternative: ${JSON.stringify(clip.textAlternative)},`,
        `    files: ${JSON.stringify(clipFiles(clip.id), null, 2).replace(/\n/g, '\n    ')},`,
        '  },',
      ].join('\n');
    })
    .join('\n');

  return `/**
 * Generated from motion-clips.json by scripts/generate-motion-clips.ts.
 * Do not edit: change motion-clips.json and regenerate.
 */

export type MotionClipStatus =
  | 'schematic'
  | 'authored'
  | 'toy'
  | 'illustrative'
  | 'not measured';

export interface MotionClipBeat {
  caption: string;
  durationMs: number;
}

export interface MotionClipFiles {
  webm: string;
  mp4: string;
  poster: string;
  vtt: string;
  text: string;
}

export interface MotionClip {
  id: string;
  title: string;
  /** The article route the clip is mounted on. */
  route: string;
  /** One visible sentence under the stage naming what the clip teaches. */
  teaches: string;
  status: MotionClipStatus;
  statusNote: string;
  /** Intrinsic stage size; the mount keeps this aspect at every width. */
  width: number;
  height: number;
  durationMs: number;
  beats: MotionClipBeat[];
  textAlternative: string;
  files: MotionClipFiles;
}

/** The per-file ceiling for every shipped clip artifact, in bytes. */
export const MOTION_CLIP_BUDGET_BYTES = ${manifest.budgetBytes};

/** Every registered clip, keyed by id. */
export const MOTION_CLIPS: Record<string, MotionClip> = {
${entries}
};

export function getMotionClip(id: string): MotionClip {
  const clip = MOTION_CLIPS[id];
  if (!clip) {
    throw new Error(
      \`Unknown motion clip '\${id}'. Registered: \${Object.keys(MOTION_CLIPS).join(', ')}.\`,
    );
  }
  return clip;
}

/** Every file over the budget, in the order given. At-budget passes. */
export function clipBudgetViolations(
  files: ReadonlyArray<{ path: string; bytes: number }>,
): Array<{ path: string; bytes: number; budgetBytes: number }> {
  return files
    .filter((file) => file.bytes > MOTION_CLIP_BUDGET_BYTES)
    .map((file) => ({
      path: file.path,
      bytes: file.bytes,
      budgetBytes: MOTION_CLIP_BUDGET_BYTES,
    }));
}
`;
}

function main(): void {
  const manifest = loadManifest();
  const path = join(ROOT, 'lib/motion-clips.ts');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buildTypeScript(manifest));
  console.log(
    `motion clips: generated lib/motion-clips.ts for ${manifest.clips.length} clip(s)`,
  );
}

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) main();
