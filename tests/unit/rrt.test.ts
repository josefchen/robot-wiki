import { describe, expect, it } from 'vitest';
import {
  RRT_DEFAULTS,
  RRT_SCENE,
  buildRrt,
  edgesUpTo,
  formatLength,
  nodesUpTo,
  pathIfReached,
  playbackCadence,
  pointInObstacle,
  segmentFree,
  type Vec2,
} from '@/lib/rrt';

const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

describe('buildRrt', () => {
  it('is deterministic for a fixed seed and scene', () => {
    const a = buildRrt(RRT_SCENE);
    const b = buildRrt(RRT_SCENE);
    expect(a).toEqual(b);
  });

  it('differs under a different seed', () => {
    const a = buildRrt(RRT_SCENE, { seed: 1 });
    const b = buildRrt(RRT_SCENE, { seed: 2 });
    expect(a.nodes).not.toEqual(b.nodes);
  });

  it('roots the tree at the start configuration', () => {
    const { nodes } = buildRrt(RRT_SCENE);
    expect(nodes[0]).toMatchObject({
      id: 0,
      x: RRT_SCENE.start.x,
      y: RRT_SCENE.start.y,
      parent: -1,
    });
  });

  it('grows one node per iteration up to the cap', () => {
    const result = buildRrt(RRT_SCENE);
    expect(result.nodes.length - 1).toBeLessThanOrEqual(
      RRT_DEFAULTS.maxIterations,
    );
    // Every non-root node attaches to an earlier node.
    for (const node of result.nodes.slice(1)) {
      expect(node.parent).toBeGreaterThanOrEqual(0);
      expect(node.parent).toBeLessThan(node.id);
    }
  });

  it('keeps every tree edge clear of the obstacles', () => {
    const result = buildRrt(RRT_SCENE);
    for (const node of result.nodes.slice(1)) {
      const parent = result.nodes[node.parent];
      expect(
        segmentFree(RRT_SCENE, parent, node),
        `edge ${node.parent} -> ${node.id}`,
      ).toBe(true);
    }
  });

  it('keeps every node inside the world and out of the obstacles', () => {
    const result = buildRrt(RRT_SCENE);
    for (const node of result.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(RRT_SCENE.width);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(RRT_SCENE.height);
      for (const obstacle of RRT_SCENE.obstacles) {
        expect(pointInObstacle(obstacle, node)).toBe(false);
      }
    }
  });

  it('reaches the goal with the default scene and seed', () => {
    const result = buildRrt(RRT_SCENE);
    expect(result.goalNodeId).not.toBeNull();
    const goalNode = result.nodes[result.goalNodeId ?? -1];
    expect(dist(goalNode, RRT_SCENE.goal)).toBeLessThanOrEqual(
      RRT_SCENE.goalRadius + RRT_DEFAULTS.stepSize,
    );
  });

  it('extracts a collision-free start-to-goal path', () => {
    const result = buildRrt(RRT_SCENE);
    expect(result.path.length).toBeGreaterThanOrEqual(2);
    expect(result.path[0]).toEqual(RRT_SCENE.start);
    const last = result.path[result.path.length - 1];
    expect(dist(last, RRT_SCENE.goal)).toBeLessThanOrEqual(
      RRT_SCENE.goalRadius + RRT_DEFAULTS.stepSize,
    );
    for (let i = 1; i < result.path.length; i += 1) {
      expect(segmentFree(RRT_SCENE, result.path[i - 1], result.path[i])).toBe(
        true,
      );
    }
    // The reported length is the summed segment length.
    let total = 0;
    for (let i = 1; i < result.path.length; i += 1) {
      total += dist(result.path[i - 1], result.path[i]);
    }
    expect(result.pathLength).toBeCloseTo(total, 6);
  });
});

describe('segmentFree', () => {
  it('rejects a segment through a circle obstacle', () => {
    const through = segmentFree(RRT_SCENE, { x: 46, y: 42 }, { x: 58, y: 42 });
    expect(through).toBe(false);
  });

  it('accepts a segment through open space', () => {
    expect(segmentFree(RRT_SCENE, { x: 7, y: 32 }, { x: 20, y: 32 })).toBe(
      true,
    );
  });

  it('rejects a segment that leaves the world bounds', () => {
    expect(segmentFree(RRT_SCENE, { x: 7, y: 32 }, { x: -4, y: 32 })).toBe(
      false,
    );
  });
});

describe('pointInObstacle', () => {
  it('detects points inside circles and rects', () => {
    const circle = RRT_SCENE.obstacles.find((o) => o.kind === 'circle');
    const rect = RRT_SCENE.obstacles.find((o) => o.kind === 'rect');
    expect(
      circle && pointInObstacle(circle, { x: circle.x, y: circle.y }),
    ).toBe(true);
    expect(
      rect &&
        pointInObstacle(rect, {
          x: rect.x + rect.w / 2,
          y: rect.y + rect.h / 2,
        }),
    ).toBe(true);
    expect(
      circle && pointInObstacle(circle, { x: circle.x + 40, y: circle.y + 40 }),
    ).toBe(false);
  });
});

describe('iteration slicing', () => {
  it('nodesUpTo returns the root alone at iteration 0', () => {
    const result = buildRrt(RRT_SCENE);
    expect(nodesUpTo(result, 0)).toEqual([result.nodes[0]]);
  });

  it('nodesUpTo and edgesUpTo grow monotonically with the iteration', () => {
    const result = buildRrt(RRT_SCENE);
    const total = result.nodes.length - 1;
    expect(nodesUpTo(result, total).length).toBe(result.nodes.length);
    expect(edgesUpTo(result, 0).length).toBe(0);
    expect(edgesUpTo(result, 10).length).toBe(10);
    expect(edgesUpTo(result, total).length).toBe(total);
    // Every edge endpoint is inside the visible node set.
    for (const edge of edgesUpTo(result, 25)) {
      expect(edge.to.id).toBeLessThanOrEqual(25);
      expect(edge.from.id).toBeLessThan(edge.to.id);
    }
  });

  it('clamps out-of-range iterations', () => {
    const result = buildRrt(RRT_SCENE);
    const total = result.nodes.length - 1;
    expect(nodesUpTo(result, -5)).toEqual(nodesUpTo(result, 0));
    expect(nodesUpTo(result, total + 500).length).toBe(result.nodes.length);
  });

  it('pathIfReached is empty until the goal node is visible', () => {
    const result = buildRrt(RRT_SCENE);
    const goalIteration = result.goalNodeId ?? 0;
    expect(goalIteration).toBeGreaterThan(0);
    expect(pathIfReached(result, goalIteration - 1)).toEqual([]);
    expect(pathIfReached(result, goalIteration)).toEqual(result.path);
  });
});

describe('playbackCadence', () => {
  it('advances smoothly by default and discretely under reduced motion', () => {
    const smooth = playbackCadence(false);
    const reduced = playbackCadence(true);
    expect(smooth.nodesPerTick).toBeLessThan(reduced.nodesPerTick);
    expect(reduced.tickMs).toBeGreaterThan(smooth.tickMs);
    expect(Number.isInteger(reduced.nodesPerTick)).toBe(true);
  });
});

describe('formatLength', () => {
  it('formats path lengths with one decimal and a unit', () => {
    expect(formatLength(108.456)).toBe('108.5');
    expect(formatLength(0)).toBe('0.0');
  });
});
