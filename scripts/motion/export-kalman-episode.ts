/**
 * Exports the seeded constant-velocity Kalman episode the cinematic clip
 * renders. The TypeScript filter in lib/kalman.ts stays the single source
 * of truth for every number on screen: this script dumps its world and
 * its frames to scripts/motion/data/kalman-episode.json, which the
 * offline clip renderer reads. The dump is deterministic (fixed seed,
 * fixed settings), so re-running rewrites identical bytes.
 *
 *   node scripts/motion/export-kalman-episode.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_SEED,
  DEFAULT_SETTINGS,
  generateEpisode,
  runFilter,
} from '../../lib/kalman.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'scripts', 'motion', 'data', 'kalman-episode.json');

export interface KalmanEpisodeExport {
  seed: number;
  steps: number;
  sigmaQ: number;
  sigmaR: number;
  truth: number[];
  measurements: (number | null)[];
  frames: Array<{
    t: number;
    est: number;
    sigma: number;
    gain: number;
    hasMeasurement: boolean;
  }>;
}

export function buildEpisodeJson(): string {
  const episode = generateEpisode(DEFAULT_SEED);
  const frames = runFilter(episode, DEFAULT_SETTINGS, episode.steps - 1);
  const payload: KalmanEpisodeExport = {
    seed: episode.seed,
    steps: episode.steps,
    sigmaQ: DEFAULT_SETTINGS.sigmaQ,
    sigmaR: DEFAULT_SETTINGS.sigmaR,
    truth: episode.truth,
    measurements: episode.measurements,
    frames: frames.map((frame) => ({
      t: frame.t,
      est: frame.est,
      sigma: frame.sigma,
      gain: frame.gain,
      hasMeasurement: frame.hasMeasurement,
    })),
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, buildEpisodeJson());
  console.log(`kalman episode: wrote ${OUT}`);
}
