/**
 * Action-tokenization math for the VLA interactive. Pure functions,
 * unit-tested in tests/unit/action-tokenization.test.ts.
 *
 * RT-1 and OpenVLA serialize continuous actions as discrete vocabulary
 * tokens: each action dimension is clamped to a normalized range and split
 * into 256 uniform bins, and each bin index is emitted as one token from a
 * shared 256-token vocabulary (OpenVLA reuses the 256 least-frequent tokens
 * of the LLaMA tokenizer; RT-2 does the same inside its VLM). Emitting a
 * 7-dim action therefore costs 7 sequential autoregressive decode passes,
 * which is the throughput problem the module covers (arXiv:2212.06817,
 * arXiv:2406.09246, arXiv:2502.19645).
 */

/** Uniform bins per action dimension (RT-1, RT-2, OpenVLA all use 256). */
export const BIN_COUNT = 256;

/** Normalized action range. Dimensions are min-max normalized to [-1, 1]. */
export const VALUE_MIN = -1;
export const VALUE_MAX = 1;

/** Width of one bin in normalized units. */
export const binWidth = (): number => (VALUE_MAX - VALUE_MIN) / BIN_COUNT;

export interface ActionDim {
  id: string;
  /** Short axis label used in the UI. */
  label: string;
  /** What the dimension commands. */
  description: string;
}

/**
 * The OpenVLA action vector: 6-DoF end-effector delta plus a gripper
 * command. RT-1 uses 11 dims (7 arm, 3 base, 1 mode switch); the 7-dim
 * arm-only form is the one the throughput discussion centers on.
 */
export const ACTION_DIMS: ReadonlyArray<ActionDim> = [
  { id: 'x', label: 'Δx', description: 'end-effector translation' },
  { id: 'y', label: 'Δy', description: 'end-effector translation' },
  { id: 'z', label: 'Δz', description: 'end-effector translation' },
  { id: 'roll', label: 'Δroll', description: 'end-effector rotation' },
  { id: 'pitch', label: 'Δpitch', description: 'end-effector rotation' },
  { id: 'yaw', label: 'Δyaw', description: 'end-effector rotation' },
  { id: 'gripper', label: 'grip', description: 'gripper open/close' },
];

/** Timesteps in the illustrative action chunk. */
export const CHUNK_STEPS = 16;

/**
 * Autoregressive decode passes needed to emit one action vector: one token
 * per dimension, produced strictly in sequence. This is the concrete form of
 * the discrete-token throughput problem (7 sequential passes through a 7B
 * model per control step for OpenVLA).
 */
export const SEQUENTIAL_DECODES = ACTION_DIMS.length;

/** Clamp a continuous value to the normalized range, then bin it. */
export function binIndex(value: number): number {
  if (Number.isNaN(value)) return 0;
  const v = Math.min(VALUE_MAX, Math.max(VALUE_MIN, value));
  const u = (v - VALUE_MIN) / (VALUE_MAX - VALUE_MIN);
  return Math.min(BIN_COUNT - 1, Math.floor(u * BIN_COUNT));
}

/** Center of a bin: the value the controller reconstructs from the token. */
export function binCenter(index: number): number {
  const clamped = Math.min(BIN_COUNT - 1, Math.max(0, Math.round(index)));
  return VALUE_MIN + (clamped + 0.5) * binWidth();
}

/**
 * Stylized text token for a bin. The real mapping points at rarely-used
 * tokenizer entries; the pedagogically load-bearing facts are that the token
 * is a vocabulary item (emitted like a word, not a number) and that one
 * shared 256-token vocabulary serves every dimension, with sequence position
 * carrying the dimension identity.
 */
export function tokenForBin(bin: number): string {
  const clamped = Math.min(BIN_COUNT - 1, Math.max(0, Math.round(bin)));
  return `<a${clamped}>`;
}

/** One bin index per dimension for a full action vector. */
export function quantize(values: number[]): number[] {
  return values.map(binIndex);
}

/**
 * Deterministic illustrative action chunk: 7 dimensions x 16 timesteps of
 * smooth normalized trajectories. Sinusoids with fixed phases (no PRNG, so
 * SSR and hydration render identically). The gripper channel is near-binary,
 * matching how real gripper commands behave.
 */
export function generateActionChunk(): number[][] {
  const wave = (freq: number, phase: number, amp: number, t: number) =>
    amp * Math.sin(2 * Math.PI * freq * (t / (CHUNK_STEPS - 1)) + phase);
  const rows: number[][] = [];
  const defs: Array<(t: number) => number> = [
    (t) => wave(1.0, 0.3, 0.62, t),
    (t) => wave(1.5, 2.1, 0.48, t),
    (t) => wave(0.75, 4.0, 0.35, t) - 0.12,
    (t) => wave(2.0, 1.2, 0.22, t),
    (t) => wave(1.25, 5.1, 0.28, t),
    (t) => wave(0.5, 0.8, 0.55, t),
    // Gripper: closed for the approach, opens near the end (near-binary).
    (t) => (t < 11 ? -0.85 : 0.85),
  ];
  for (const dimValue of defs) {
    const row: number[] = [];
    for (let t = 0; t < CHUNK_STEPS; t += 1) {
      row.push(Number(dimValue(t).toFixed(4)));
    }
    rows.push(row);
  }
  return rows;
}
