/**
 * Seeded randomness for the scene kit.
 *
 * Determinism contract: tests and captures render named beats, not
 * wall-clock frames. Every stochastic element in a scene draws from a
 * seeded stream derived from the scene id plus a stream name, so the same
 * scene always renders the same world on reload, in captures, and in tests.
 */

/** mulberry32: tiny deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a: stable string hashing for scene and stream names. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface SceneRng {
  /** Uniform in [0, 1). */
  uniform: () => number;
  /** Standard normal via Box-Muller over the same stream. */
  gaussian: () => number;
}

/**
 * A named stream for one scene. Two stream names never share a sequence,
 * so reordering one animation does not reshuffle every other world.
 */
export function createSceneRng(sceneId: string, stream: string): SceneRng {
  const rand = mulberry32(hashString(`${sceneId}::${stream}`));
  let spare: number | null = null;
  const gaussian = (): number => {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }
    let u = 0;
    while (u === 0) u = rand();
    const r = Math.sqrt(-2 * Math.log(u));
    const theta = 2 * Math.PI * rand();
    spare = r * Math.sin(theta);
    return r * Math.cos(theta);
  };
  return { uniform: rand, gaussian };
}
