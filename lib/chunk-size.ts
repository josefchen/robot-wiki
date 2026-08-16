/**
 * Chunk-size curve math for the ACT ablation interactive. Pure functions,
 * unit-tested in tests/unit/chunk-size.test.ts.
 *
 * Data honesty: only two points on this curve are measured. The ACT paper
 * (arXiv:2304.13705) reports 1% success at k=1 and 44% at k=100, with a
 * slight decline at k=200 and k=400 whose exact values are not published
 * (see research/01-learned-manipulation-lineage.md). Everything between and
 * beyond the anchors is an interpolation and is labeled as such in the UI.
 */

/** The two published ablation values. Do not add invented points here. */
export const ACT_CHUNK_ANCHORS: ReadonlyArray<{ k: number; success: number }> =
  [
    { k: 1, success: 0.01 },
    { k: 100, success: 0.44 },
  ];

export const MIN_CHUNK = 1;
export const MAX_CHUNK = 400;

/** Time constant of the illustrative taper past k=100 (gentle decline). */
const TAPER_TAU = 800;

function clampChunk(k: number): number {
  if (Number.isNaN(k)) return MIN_CHUNK;
  return Math.min(MAX_CHUNK, Math.max(MIN_CHUNK, k));
}

/**
 * Estimated success rate at chunk size k. Between the anchors: log-linear
 * interpolation, which gives the concave rise the ablation implies. Past
 * k=100: a gentle exponential decay standing in for the published but
 * unquantified taper.
 */
export function successAtChunkSize(k: number): number {
  const chunk = clampChunk(k);
  const [low, high] = ACT_CHUNK_ANCHORS;
  if (chunk <= high.k) {
    const t = Math.log(chunk / low.k) / Math.log(high.k / low.k);
    return low.success * Math.pow(high.success / low.success, t);
  }
  return high.success * Math.exp(-(chunk - high.k) / TAPER_TAU);
}

/**
 * Closed-loop decisions in an episode of `episodeSteps` control steps when
 * each inference commits `chunkSize` actions: steps / k, at least one.
 */
export function decisionsPerEpisode(
  episodeSteps: number,
  chunkSize: number,
): number {
  const steps = Math.max(1, Math.round(episodeSteps));
  const chunk = clampChunk(chunkSize);
  return Math.max(1, Math.ceil(steps / chunk));
}
