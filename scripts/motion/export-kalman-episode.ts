/**
 * Exports the seeded constant-velocity Kalman episode the cinematic clip
 * renders. The TypeScript filter in lib/kalman.ts stays the single source
 * of truth for every number on screen: this script dumps its world and
 * its frames to scripts/motion/data/kalman-episode.json, which the
 * offline clip renderer reads. The dump is deterministic (fixed seed,
 * fixed settings), so re-running rewrites identical bytes; the motion
 * clip unit tests pin that.
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
  stepDetail,
} from '../../lib/kalman.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'scripts', 'motion', 'data', 'kalman-episode.json');

/** The clip runs the first 240 steps of the seeded episode. */
export const RUN_STEPS = 240;

export interface KalmanFocusExport {
  t: number;
  measurement: number | null;
  gain: number;
  predicted: { est: number; sigma: number };
  posterior: { est: number; sigma: number };
}

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
  focus: KalmanFocusExport;
}

/**
 * The fusion the clip zooms into: the first step from 120 on where a
 * reading lands after two consecutive dropouts (a reading preceded by
 * pure prediction reads clearly on screen), or the first reading from
 * 120 on if the seed never drops out twice in a row there.
 */
function findFocusStep(
  measurements: (number | null)[],
  from: number,
  upto: number,
): number {
  for (let t = Math.max(2, from); t <= upto; t += 1) {
    if (
      measurements[t] !== null &&
      measurements[t - 1] === null &&
      measurements[t - 2] === null
    ) {
      return t;
    }
  }
  for (let t = Math.max(1, from); t <= upto; t += 1) {
    if (measurements[t] !== null) return t;
  }
  return upto;
}

export function buildEpisodeJson(): string {
  const episode = generateEpisode(DEFAULT_SEED);
  const frames = runFilter(episode, DEFAULT_SETTINGS, episode.steps - 1);
  const focusT = findFocusStep(episode.measurements, 120, RUN_STEPS);
  const detail = stepDetail(episode, DEFAULT_SETTINGS, focusT);
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
    focus: {
      t: focusT,
      measurement: detail.measurement,
      gain: detail.gain,
      predicted: {
        est: detail.predicted.mean[0],
        sigma: Math.sqrt(detail.predicted.cov.p00),
      },
      posterior: {
        est: detail.posterior.mean[0],
        sigma: Math.sqrt(detail.posterior.cov.p00),
      },
    },
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
