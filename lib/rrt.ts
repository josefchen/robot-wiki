/**
 * RRT (rapidly-exploring random tree) math for the motion-planning
 * interactive. Pure functions, unit-tested in tests/unit/rrt.test.ts.
 *
 * The planner grows a tree from the start configuration by repeating four
 * steps: sample a random point in the world (with goal bias), find the
 * nearest tree node, extend a fixed step toward the sample, and keep the
 * new node when the connecting segment is collision-free. One accepted
 * extension is one iteration, so "iteration" and "node count" move together
 * and the interactive can scrub the growth deterministically. Everything is
 * seeded, so the rendered tree is identical on every load.
 *
 * References: LaValle's 1998 technical report introduced the RRT
 * (https://lavalle.pl/papers/Lav98c.pdf); LaValle and Kuffner's IJRR 2001
 * paper is the canonical journal treatment.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export type Obstacle =
  | { kind: 'circle'; x: number; y: number; r: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number };

export interface RrtScene {
  /** World width and height in abstract planning units. */
  width: number;
  height: number;
  start: Vec2;
  goal: Vec2;
  /** A tree node inside this radius of the goal may connect to it. */
  goalRadius: number;
  obstacles: Obstacle[];
}

export interface RrtNode {
  id: number;
  x: number;
  y: number;
  /** Parent node id; -1 on the root. */
  parent: number;
}

export interface RrtEdge {
  from: RrtNode;
  to: RrtNode;
}

export interface RrtResult {
  /** nodes[0] is the start; node i was accepted at iteration i. */
  nodes: RrtNode[];
  /** Id of the node that connected to the goal, or null when unreached. */
  goalNodeId: number | null;
  /** Start-to-goal waypoints once reached, else empty. */
  path: Vec2[];
  /** Summed segment length of `path`; 0 until reached. */
  pathLength: number;
}

export interface RrtOptions {
  seed?: number;
  /** Fixed extension length per iteration. */
  stepSize?: number;
  /** Probability of sampling the goal instead of a uniform point. */
  goalBias?: number;
  /** Cap on accepted nodes; growth stops here when the goal stays unreached. */
  maxIterations?: number;
}

export interface PlaybackCadence {
  tickMs: number;
  nodesPerTick: number;
}

/**
 * The demo world: a 100x64 box with a partial wall that leaves a gap near
 * the top, two circles guarding the direct corridor, and one more circle
 * near the goal approach. Chosen so the tree visibly detours instead of
 * walking a straight line.
 */
export const RRT_SCENE: RrtScene = {
  width: 100,
  height: 64,
  start: { x: 7, y: 32 },
  goal: { x: 93, y: 32 },
  goalRadius: 3,
  obstacles: [
    { kind: 'circle', x: 26, y: 15, r: 7 },
    { kind: 'circle', x: 30, y: 47, r: 5 },
    { kind: 'rect', x: 47, y: 20, w: 6, h: 44 },
    { kind: 'circle', x: 71, y: 12, r: 6 },
    { kind: 'circle', x: 74, y: 48, r: 8 },
  ],
};

export const RRT_DEFAULTS = {
  seed: 19981001,
  stepSize: 2,
  goalBias: 0.015,
  maxIterations: 900,
} as const;

/** mulberry32: tiny deterministic PRNG so the render is identical on reload. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pointInObstacle(obstacle: Obstacle, p: Vec2): boolean {
  if (obstacle.kind === 'circle') {
    return Math.hypot(p.x - obstacle.x, p.y - obstacle.y) < obstacle.r;
  }
  return (
    p.x > obstacle.x &&
    p.x < obstacle.x + obstacle.w &&
    p.y > obstacle.y &&
    p.y < obstacle.y + obstacle.h
  );
}

/**
 * Collision check by dense sampling along the segment: points at half-step
 * spacing must stay inside the world and outside every obstacle. Exact
 * segment-geometry tests would be faster; at a 4-unit step in a 100x64
 * world this is a handful of comparisons and impossible to get subtly
 * wrong, which matters more for a teaching artifact.
 */
export function segmentFree(scene: RrtScene, a: Vec2, b: Vec2): boolean {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const samples = Math.max(2, Math.ceil(length / 1.5) + 1);
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    if (p.x < 0 || p.x > scene.width || p.y < 0 || p.y > scene.height) {
      return false;
    }
    for (const obstacle of scene.obstacles) {
      if (pointInObstacle(obstacle, p)) return false;
    }
  }
  return true;
}

/**
 * Grow the full tree eagerly. Each iteration samples until it finds one
 * collision-free extension (rejecting colliding samples silently), so an
 * iteration always adds exactly one node. Growth stops when a new node
 * lands within `goalRadius` of the goal with a clear final segment, or at
 * the iteration cap.
 */
export function buildRrt(scene: RrtScene, opts: RrtOptions = {}): RrtResult {
  const seed = opts.seed ?? RRT_DEFAULTS.seed;
  const stepSize = opts.stepSize ?? RRT_DEFAULTS.stepSize;
  const goalBias = opts.goalBias ?? RRT_DEFAULTS.goalBias;
  const maxIterations = opts.maxIterations ?? RRT_DEFAULTS.maxIterations;
  const rand = mulberry32(seed);

  const nodes: RrtNode[] = [
    { id: 0, x: scene.start.x, y: scene.start.y, parent: -1 },
  ];
  let goalNodeId: number | null = null;

  const samplePoint = (): Vec2 => {
    if (rand() < goalBias) return { ...scene.goal };
    return { x: rand() * scene.width, y: rand() * scene.height };
  };

  const nearest = (p: Vec2): RrtNode => {
    let best = nodes[0];
    let bestDist = Infinity;
    for (const node of nodes) {
      const d = Math.hypot(node.x - p.x, node.y - p.y);
      if (d < bestDist) {
        bestDist = d;
        best = node;
      }
    }
    return best;
  };

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    // Rejection-sample until one extension is collision-free. The loop is
    // bounded in practice by the open free space of the demo scene; a path
    //ological scene would just hit the iteration cap with a sparse tree.
    let accepted: RrtNode | null = null;
    for (let attempt = 0; attempt < 200 && accepted === null; attempt += 1) {
      const sample = samplePoint();
      const from = nearest(sample);
      const d = Math.hypot(sample.x - from.x, sample.y - from.y);
      if (d < 1e-6) continue;
      const scale = Math.min(stepSize, d) / d;
      const candidate = {
        x: from.x + (sample.x - from.x) * scale,
        y: from.y + (sample.y - from.y) * scale,
      };
      if (segmentFree(scene, from, candidate)) {
        accepted = {
          id: nodes.length,
          x: candidate.x,
          y: candidate.y,
          parent: from.id,
        };
      }
    }
    if (accepted === null) break;
    nodes.push(accepted);
    const goalDistance = Math.hypot(
      accepted.x - scene.goal.x,
      accepted.y - scene.goal.y,
    );
    if (
      goalDistance <= scene.goalRadius + stepSize &&
      segmentFree(scene, accepted, scene.goal)
    ) {
      goalNodeId = accepted.id;
      break;
    }
  }

  // Walk parent pointers back from the goal-connected node to the root.
  const path: Vec2[] = [];
  if (goalNodeId !== null) {
    const chain: RrtNode[] = [];
    for (let node = nodes[goalNodeId]; node.parent !== -1; ) {
      chain.push(node);
      node = nodes[node.parent];
    }
    chain.push(nodes[0]);
    chain.reverse();
    for (const node of chain) path.push({ x: node.x, y: node.y });
    path.push({ ...scene.goal });
  }
  let pathLength = 0;
  for (let i = 1; i < path.length; i += 1) {
    pathLength += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  }

  return { nodes, goalNodeId, path, pathLength };
}

/** Nodes visible at `iteration` (clamped): the root plus one per iteration. */
export function nodesUpTo(result: RrtResult, iteration: number): RrtNode[] {
  const total = result.nodes.length - 1;
  const k = Math.min(total, Math.max(0, Math.round(iteration) || 0));
  return result.nodes.slice(0, k + 1);
}

/** Edges visible at `iteration`: one per accepted node. */
export function edgesUpTo(result: RrtResult, iteration: number): RrtEdge[] {
  const visible = nodesUpTo(result, iteration);
  const edges: RrtEdge[] = [];
  for (const node of visible) {
    if (node.parent >= 0) {
      edges.push({ from: result.nodes[node.parent], to: node });
    }
  }
  return edges;
}

/** The highlighted path, but only once the goal node is on screen. */
export function pathIfReached(result: RrtResult, iteration: number): Vec2[] {
  if (result.goalNodeId === null) return [];
  return iteration >= result.goalNodeId ? result.path : [];
}

/**
 * Playback cadence. Normal playback grows the tree in small steps so the
 * expansion reads as continuous; under prefers-reduced-motion the tree
 * advances in coarse discrete jumps, so the same information is reachable
 * without sustained animation.
 */
export function playbackCadence(reducedMotion: boolean): PlaybackCadence {
  return reducedMotion
    ? { tickMs: 340, nodesPerTick: 25 }
    : { tickMs: 50, nodesPerTick: 3 };
}

/** Path length display: one decimal, abstract world units. */
export function formatLength(value: number): string {
  return value.toFixed(1);
}
