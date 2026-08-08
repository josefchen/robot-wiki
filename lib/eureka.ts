/**
 * Scripted Eureka loop for the reward-design-mpc module.
 *
 * Eureka (Ma et al., ICLR 2024) treats reward design as evolutionary
 * search over code: an LLM writes a reward function in Python with the
 * environment source as context, candidate rewards train policies in a
 * parallel simulator, the fittest candidates survive, and the LLM
 * reflects on per-component reward statistics before mutating the next
 * generation. This file holds a scripted three-generation replay of that
 * loop for a quadruped walking task, plus the line diff the panel
 * renders between generations.
 *
 * The generations are a scripted illustration of the mechanism (the
 * reflection step is the point), not a recording of a real Eureka run;
 * the UI labels it as such. Pure functions only.
 */

export interface RewardStat {
  label: string;
  value: string;
  tone?: 'ok' | 'warn' | 'err';
}

export interface EurekaGeneration {
  index: number;
  /** Candidate reward source, one element per line. */
  code: string[];
  /** Task fitness after training with this reward (0 to 1, illustrative). */
  fitness: number;
  /** Per-component training statistics the LLM is shown. */
  stats: RewardStat[];
  /** The LLM's reflection on those statistics. */
  reflection: string;
}

export const EUREKA_TASK = 'quadruped forward walking at 1.0 m/s';

export const EUREKA_GENERATIONS: EurekaGeneration[] = [
  {
    index: 0,
    code: [
      'def reward(obs, act):',
      '    # task: walk forward at 1.0 m/s',
      '    return obs.base_lin_vel_x',
    ],
    fitness: 0.31,
    stats: [
      { label: 'episode length', value: '0.4 s', tone: 'err' },
      { label: 'base_vel_x (mean)', value: '2.8 m/s', tone: 'warn' },
      { label: 'episodes ending in a fall', value: '100%', tone: 'err' },
      { label: 'time at target speed', value: '3%', tone: 'err' },
    ],
    reflection:
      'Fitness is low. base_lin_vel_x spikes to 2.8 m/s, nearly three times the command, then every episode terminates in under half a second. The reward pays for speed and never for survival, so sprinting into a fall is the optimal policy. Next generation: add a survival bonus and make falls expensive.',
  },
  {
    index: 1,
    code: [
      'def reward(obs, act):',
      '    # task: walk forward at 1.0 m/s',
      '    alive = 1.0',
      '    fall = -5.0 if obs.terminated else 0.0',
      '    return obs.base_lin_vel_x + alive + fall',
    ],
    fitness: 0.58,
    stats: [
      { label: 'episode length', value: '20.0 s (max)', tone: 'ok' },
      { label: 'base_vel_x (mean)', value: '0.02 m/s', tone: 'err' },
      { label: 'episodes ending in a fall', value: '0%', tone: 'ok' },
      { label: 'time at target speed', value: '1%', tone: 'err' },
    ],
    reflection:
      'The fall penalty worked too well. Episodes now run to the time limit with zero falls, but mean velocity collapsed to 0.02 m/s: standing still collects the alive bonus with no risk. The statistics show survival saturated and the task term starved. Next generation: replace raw speed with tracking the 1.0 m/s command, and price action rate so the gait is smooth enough to matter on hardware.',
  },
  {
    index: 2,
    code: [
      'def reward(obs, act):',
      '    # task: walk forward at 1.0 m/s',
      '    alive = 1.0',
      '    fall = -5.0 if obs.terminated else 0.0',
      '    err = obs.base_lin_vel_x - 1.0',
      '    track = exp(-4.0 * err * err)',
      '    smooth = -0.01 * sum((act - act_prev) ** 2)',
      '    return track + alive + fall + smooth',
    ],
    fitness: 0.86,
    stats: [
      { label: 'episode length', value: '20.0 s (max)', tone: 'ok' },
      { label: 'velocity tracking error', value: '0.12 m/s', tone: 'ok' },
      { label: 'episodes ending in a fall', value: '2%', tone: 'warn' },
      { label: 'time at target speed', value: '81%', tone: 'ok' },
    ],
    reflection:
      'Tracking error is down to 0.12 m/s with full-length episodes and the policy spends 81% of its time at the commanded speed. Residual ankle chatter remains in the joint-velocity trace, so further gains likely come from tuning the action-rate weight rather than adding new terms.',
  },
];

export interface DiffLine {
  type: 'same' | 'add' | 'del';
  text: string;
}

/**
 * Minimal line diff via longest common subsequence. Deleted lines appear
 * before the added lines that replace them. Inputs are a handful of
 * lines, so the quadratic table is fine.
 */
export function diffLines(prev: string[], next: string[]): DiffLine[] {
  const m = prev.length;
  const n = next.length;
  // lcs[i][j] = length of the common subsequence of prev[i:] and next[j:].
  const lcs: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      lcs[i][j] =
        prev[i] === next[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (prev[i] === next[j]) {
      out.push({ type: 'same', text: prev[i] });
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ type: 'del', text: prev[i] });
      i += 1;
    } else {
      out.push({ type: 'add', text: next[j] });
      j += 1;
    }
  }
  while (i < m) {
    out.push({ type: 'del', text: prev[i] });
    i += 1;
  }
  while (j < n) {
    out.push({ type: 'add', text: next[j] });
    j += 1;
  }
  return out;
}
