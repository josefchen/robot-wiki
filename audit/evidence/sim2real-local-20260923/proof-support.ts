/**
 * Independent arithmetic for the two authored sim2real illustrations.
 * Deliberately imports no production model. Raw runs are NOT typed audit
 * proofs or review events until the native AND-plan integration is complete.
 */
export const frictionCases = [
  { id: 'ordinary', mu: 0.8, range: 0.35 },
  { id: 'wide', mu: 0.8, range: 0.65 },
  { id: 'tail', mu: 1.5, range: 0.35 },
] as const;

export function frictionOracle(mu: number, range: number) {
  const displacement = Math.abs(mu - 0.8);
  const point = 0.97 * Math.exp(-0.5 * ((mu - 0.8) / 0.09) ** 2);
  const peak = 0.93 - 0.55 * range;
  const dr = peak * Math.exp(-0.5 * (Math.max(0, displacement - range) / 0.1) ** 2);
  return { point, peak, dr, pointDisplay: `${Math.round(point * 100)}%`, drDisplay: `${Math.round(dr * 100)}%` };
}

const rounded = (value: number) => Number(value.toFixed(4));

function sequence(seed: number, noise: boolean) {
  const values: number[] = [];
  let state = seed;
  for (let index = 0; index < 24; index++) {
    state = (48271 * state) % 2147483647;
    const value = state / 2147483647;
    values.push(rounded(noise ? 2 * value - 1 : value));
  }
  return values;
}

export function teacherOracle(degradation: number) {
  const terrain = Array.from({ length: 24 }, (_, index) => rounded(
    0.08 * Math.sin(index / 2) + 0.045 * Math.sin(1.27 * index + 0.8)
    + (index >= 14 ? 0.05 : 0) - (index >= 5 && index <= 8 ? 0.04 : 0),
  ));
  const noise = sequence(123456789, true);
  const thresholds = sequence(987654321, false);
  // Sum neighboring cells directly rather than reuse production's cached kernel.
  const blurred = terrain.map((_, index) => {
    let numerator = 0;
    let denominator = 0;
    for (let neighbor = Math.max(0, index - 6); neighbor <= Math.min(23, index + 6); neighbor++) {
      const weight = Math.exp(-((neighbor - index) ** 2) / 18);
      numerator += terrain[neighbor] * weight;
      denominator += weight;
    }
    return numerator / denominator;
  });
  const occluded = thresholds.map(threshold => threshold < degradation);
  const errors = terrain.map((height, index) => {
    const base = blurred[index] - height + 0.06 * noise[index];
    const extra = occluded[index] ? (base < 0 ? -0.12 : 0.12) : 0;
    return degradation * (base + extra);
  });
  const reconstruction = terrain.map((height, index) => rounded(height + errors[index]));
  const mae = errors.reduce((sum, error) => sum + Math.abs(error), 0) / 24;
  const divergence = 2.2 * mae;
  const low = Math.min(...terrain);
  const span = Math.max(...terrain) - low;
  const readings = terrain.map((height, index) => rounded((height - low) / span + degradation * 0.45 * noise[index]));
  return {
    degradation, terrain, noise, thresholds, blurred, errors, reconstruction, readings, occluded,
    mae, divergence, maeDisplay: `${mae.toFixed(2)} m`,
    divergenceDisplay: divergence.toFixed(2), occludedDisplay: `${occluded.filter(Boolean).length}/24`,
  };
}
