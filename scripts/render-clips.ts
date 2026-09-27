/**
 * render-clips: the offline cinematic-clip pipeline (tier b).
 *
 * For every clip in motion-clips.json this script:
 *
 *   1. ensures the pinned renderer venv exists (idempotent setup script);
 *   2. renders the clip's Python scene to a 1280x720 30 fps master MP4 in
 *      the scratch dir scripts/motion/build/ (gitignored);
 *   3. derives, with ffmpeg, the shipped artifacts: a VP9 WebM and an
 *      H.264 MP4 (both silent, sized against the manifest budget), and a
 *      poster PNG taken from the final summarizing frame;
 *   4. writes the WebVTT caption track from the manifest beats and the
 *      plain-text alternative from the manifest transcript;
 *   5. copies everything into public/clips/ and fails if any video
 *      artifact exceeds the budget.
 *
 * This runs on the machine that renders clips, by hand. No build, deploy
 * or CI step ever invokes it (pinned by
 * tests/unit/motion-clip-build-isolation.test.ts).
 *
 *   npm run clips:render
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  clipBudgetViolations,
  loadManifest,
  type MotionClipManifestEntry,
} from './generate-motion-clips.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = join(ROOT, 'scripts', 'motion', 'build');
const PUBLIC_CLIPS = join(ROOT, 'public', 'clips');
const VENV_PYTHON = join(ROOT, '.motion-venv', 'bin', 'python');

function run(command: string, args: string[], label: string): void {
  console.log(`-> ${label}`);
  execFileSync(command, args, { cwd: ROOT, stdio: 'inherit' });
}

function videoDurationSeconds(file: string): number {
  const out = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      file,
    ],
    { encoding: 'utf8' },
  );
  return Number.parseFloat(out.trim());
}

function audioStreamCount(file: string): number {
  const out = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'a',
      '-show_entries',
      'stream=index',
      '-of',
      'csv=p=0',
      file,
    ],
    { encoding: 'utf8' },
  ).trim();
  return out === '' ? 0 : out.split('\n').length;
}

function formatTimestamp(totalSeconds: number): string {
  const ms = Math.round(totalSeconds * 1000);
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  const pad = (value: number, width = 2) =>
    String(value).padStart(width, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
}

/** 'kalman-episode' -> 'KalmanEpisode', the scene class name convention. */
export function sceneClassFor(id: string): string {
  return id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function buildVtt(clip: MotionClipManifestEntry): string {
  const lines = ['WEBVTT', ''];
  let cursor = 0;
  for (const beat of clip.beats) {
    const end = cursor + beat.durationMs / 1000;
    lines.push(`${formatTimestamp(cursor)} --> ${formatTimestamp(end)}`);
    lines.push(beat.caption);
    lines.push('');
    cursor = end;
  }
  return lines.join('\n');
}

export function buildTextAlternative(clip: MotionClipManifestEntry): string {
  const durationSeconds = Math.round(
    clip.beats.reduce((sum, beat) => sum + beat.durationMs, 0) / 1000,
  );
  return [
    `${clip.title} — ${clip.status} clip, ${durationSeconds} seconds.`,
    clip.teaches,
    'Transcript:',
    ...clip.beats.map((beat) => `- ${beat.caption}`),
    clip.statusNote,
    '',
  ].join('\n');
}

function renderClip(clip: MotionClipManifestEntry): void {
  const sceneModule = `scripts/motion/clips/${clip.id.replace(/-/g, '_')}.py`;
  const sceneClass = sceneClassFor(clip.id);
  const scratch = join(BUILD, clip.id);
  mkdirSync(scratch, { recursive: true });

  // 1. The master render, straight from the Python scene.
  run(
    VENV_PYTHON,
    [
      '-m',
      'manim',
      '-qm',
      '--disable_caching',
      '--media_dir',
      join(scratch, 'media'),
      sceneModule,
      sceneClass,
    ],
    `rendering ${clip.id} master (this is the slow step)`,
  );
  const produced = join(
    scratch,
    'media',
    'videos',
    clip.id.replace(/-/g, '_'),
    '720p30',
    `${sceneClass}.mp4`,
  );
  if (!existsSync(produced)) {
    throw new Error(`master render produced no file at ${produced}`);
  }
  const master = join(scratch, 'master.mp4');
  cpSync(produced, master);

  // The scene must honour the manifest timeline.
  const masterDuration = videoDurationSeconds(master);
  const manifestDuration =
    clip.beats.reduce((sum, beat) => sum + beat.durationMs, 0) / 1000;
  if (Math.abs(masterDuration - manifestDuration) > 0.25) {
    throw new Error(
      `${clip.id}: rendered ${masterDuration.toFixed(2)}s but the manifest declares ${manifestDuration.toFixed(2)}s`,
    );
  }
  if (audioStreamCount(master) !== 0) {
    throw new Error(`${clip.id}: master render unexpectedly carries audio`);
  }

  const webm = join(scratch, `${clip.id}.webm`);
  const mp4 = join(scratch, `${clip.id}.mp4`);
  const poster = join(scratch, `${clip.id}.png`);

  // 2. The two shipped encodings, silent by construction.
  run(
    'ffmpeg',
    [
      '-y',
      '-i',
      master,
      '-an',
      '-c:v',
      'libvpx-vp9',
      '-crf',
      '34',
      '-b:v',
      '0',
      '-row-mt',
      '1',
      webm,
    ],
    `encoding ${clip.id} webm`,
  );
  run(
    'ffmpeg',
    [
      '-y',
      '-i',
      master,
      '-an',
      '-c:v',
      'libx264',
      '-crf',
      '27',
      '-preset',
      'slow',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      mp4,
    ],
    `encoding ${clip.id} mp4`,
  );

  // 3. The poster: the final summarizing frame of the last beat.
  run(
    'ffmpeg',
    [
      '-y',
      '-sseof',
      '-0.05',
      '-i',
      master,
      '-update',
      '1',
      '-frames:v',
      '1',
      poster,
    ],
    `extracting ${clip.id} poster`,
  );

  // 4. Captions and the text alternative, from the manifest.
  const vtt = join(scratch, `${clip.id}.vtt`);
  const text = join(scratch, `${clip.id}.txt`);
  writeFileSync(vtt, buildVtt(clip));
  writeFileSync(text, buildTextAlternative(clip));

  // 5. Ship, then enforce the budget.
  mkdirSync(PUBLIC_CLIPS, { recursive: true });
  for (const file of [webm, mp4, poster, vtt, text]) {
    cpSync(file, join(PUBLIC_CLIPS, basename(file)));
  }
  const shipped = readdirSync(PUBLIC_CLIPS)
    .filter((name) => name.endsWith('.webm') || name.endsWith('.mp4'))
    .map((name) => ({
      path: `public/clips/${name}`,
      bytes: statSync(join(PUBLIC_CLIPS, name)).size,
    }));
  for (const file of shipped) {
    console.log(`   ${file.path}: ${(file.bytes / 1024).toFixed(0)} KiB`);
  }
  const violations = clipBudgetViolations(shipped);
  if (violations.length) {
    for (const violation of violations) {
      console.error(
        `BUDGET: ${violation.path} is ${violation.bytes} bytes (budget ${violation.budgetBytes})`,
      );
    }
    throw new Error(`${violations.length} clip artifact(s) over budget`);
  }
}

function main(): void {
  const manifest = loadManifest();
  for (const clip of manifest.clips) {
    console.log(`== clip ${clip.id} ==`);
    renderClip(clip);
  }
  console.log('render-clips: all clips rendered within budget');
}

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) main();
