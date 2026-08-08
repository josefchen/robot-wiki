/**
 * Training-time model for the parallel-sim-rl interactive. Pure functions and
 * constants, unit-tested in tests/unit/parallel-sim.test.ts.
 *
 * The chart plots wall-clock time-to-target-reward against parallel
 * environment count. The model is deliberately simple and is labeled as
 * illustrative in the UI: total transitions to the target reward are held
 * fixed, and one training iteration is split into three cost buckets:
 * GPU simulation, the GPU learning update, and CPU-side work (host-device
 * transfer, the Python training loop, and CPU-resident physics APIs).
 *
 * Two anchors tie the curve to published numbers:
 * - Rudin et al. 2021 (arXiv:2109.11978): ANYmal flat-terrain walking in
 *   under four minutes and uneven terrain in twenty minutes on a single
 *   workstation GPU at 4,096 environments. The default curve is tuned to
 *   pass through the four-minute mark at 4,096 envs.
 * - Isaac Lab (arXiv:2511.04831): a single-GPU RTX 5090 workstation
 *   approaches a 2x RTX PRO 6000 server on the Franka task because parts of
 *   the PhysX pipeline and the main training loop are bound by single-core
 *   CPU performance. The CPU-bottleneck mode reproduces this by adding a
 *   per-environment CPU cost the GPU cannot absorb, which flattens the
 *   high end of the curve.
 *
 * Determinism: no Math.random anywhere; all rendered values are rounded so
 * SSR HTML and client hydration serialize identically.
 */

/** Slider bounds and default, in parallel environments (powers of two). */
export const MIN_ENVS = 64;
export const MAX_ENVS = 16384;
export const DEFAULT_ENVS = 4096;

/** Rollout steps collected per environment per iteration (legged_gym-style). */
export const ROLLOUT_STEPS = 24;

/**
 * Total environment transitions needed to reach the target reward. Tuned so
 * the default curve crosses four minutes at 4,096 environments, matching the
 * Rudin flat-terrain anchor. Held fixed across env counts: the whole point of
 * massive parallelism is that the experience requirement does not change.
 */
export const TARGET_TRANSITIONS = 2.2e8;

/* Per-iteration cost model, in seconds. */

/** Fixed GPU cost per iteration (kernel launches, pipeline setup). */
export const SIM_FIXED_SECONDS = 0.02;
/** Marginal GPU simulation cost per environment per iteration. */
export const SIM_PER_ENV_SECONDS = 4e-6;
/** GPU learning update (PPO epochs over a capped batch): env-independent. */
export const LEARN_SECONDS = 0.04;
/** Fixed CPU-side cost: host-device transfer plus the Python loop. */
export const TRANSFER_SECONDS = 0.03;
/**
 * Extra per-environment CPU cost in bottleneck mode: state readback,
 * parameter writes through the PhysX CPU API, and per-env bookkeeping that
 * run on a single core. Exceeds the GPU marginal cost, so it flattens the
 * high end of the curve.
 */
export const CPU_PER_ENV_SECONDS = 2.2e-5;

export interface IterationBreakdown {
  /** GPU physics stepping. */
  simSeconds: number;
  /** GPU learning update. */
  learnSeconds: number;
  /** CPU-side work: transfer, Python loop, CPU-resident physics APIs. */
  cpuSeconds: number;
  totalSeconds: number;
}

/** Time budget of one training iteration at a given environment count. */
export function iterationBreakdown(
  envs: number,
  cpuBound: boolean,
): IterationBreakdown {
  const simSeconds = SIM_FIXED_SECONDS + envs * SIM_PER_ENV_SECONDS;
  const cpuSeconds =
    TRANSFER_SECONDS + (cpuBound ? envs * CPU_PER_ENV_SECONDS : 0);
  const totalSeconds = simSeconds + LEARN_SECONDS + cpuSeconds;
  return {
    simSeconds,
    learnSeconds: LEARN_SECONDS,
    cpuSeconds,
    totalSeconds,
  };
}

/** Iterations needed to collect TARGET_TRANSITIONS at this env count. */
export function iterationsToTarget(envs: number): number {
  return TARGET_TRANSITIONS / (envs * ROLLOUT_STEPS);
}

/** Wall-clock seconds to the target reward. */
export function wallClockSeconds(envs: number, cpuBound: boolean): number {
  return iterationsToTarget(envs) * iterationBreakdown(envs, cpuBound).totalSeconds;
}

/** Aggregate simulation throughput in environment frames per second. */
export function throughputFps(envs: number, cpuBound: boolean): number {
  return (envs * ROLLOUT_STEPS) / iterationBreakdown(envs, cpuBound).totalSeconds;
}

/** Measured ground truth from Rudin et al. 2021 (4,096 envs, one GPU). */
export interface RudinMarker {
  id: 'flat' | 'uneven';
  envs: number;
  minutes: number;
  label: string;
}

export const RUDIN_MARKERS: RudinMarker[] = [
  { id: 'flat', envs: 4096, minutes: 4, label: 'flat terrain: under 4 min' },
  { id: 'uneven', envs: 4096, minutes: 20, label: 'uneven terrain: 20 min' },
];

/** Log-spaced (envs, minutes) samples for the chart polyline. */
export function curvePoints(
  cpuBound: boolean,
  samples = 49,
): Array<{ envs: number; minutes: number }> {
  const points: Array<{ envs: number; minutes: number }> = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const log2 = Math.log2(MIN_ENVS) + t * (Math.log2(MAX_ENVS) - Math.log2(MIN_ENVS));
    const envs = Math.round(2 ** log2);
    const minutes = Number((wallClockSeconds(envs, cpuBound) / 60).toFixed(2));
    points.push({ envs, minutes });
  }
  return points;
}

/** "45 s", "4.0 min", "3.6 h". */
export function formatWallClock(seconds: number): string {
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)} h`;
  if (seconds >= 60) return `${(seconds / 60).toFixed(1)} min`;
  return `${Math.round(seconds)} s`;
}

/** "17k FPS", "924k FPS", "2.5M FPS". */
export function formatFps(fps: number): string {
  if (fps >= 1e6) return `${(fps / 1e6).toFixed(1)}M FPS`;
  if (fps >= 1e3) return `${Math.round(fps / 1e3)}k FPS`;
  return `${Math.round(fps)} FPS`;
}

/** "4,096": thousands-grouped env count for readouts. */
export function formatEnvs(envs: number): string {
  return envs.toLocaleString('en-US');
}
