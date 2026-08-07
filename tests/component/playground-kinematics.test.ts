import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoadedRobot } from '@/components/three/load-robot';
import { createProceduralArm } from '@/components/three/procedural-arm';
import { usePlaygroundKinematics } from '@/components/three/use-playground-kinematics';

function fallbackLoaded(): LoadedRobot {
  return {
    robot: createProceduralArm(),
    info: {
      kind: 'fallback',
      name: 'procedural-fallback',
      jointCount: 3,
      eeLink: 'tool_tip',
    },
  };
}

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe('usePlaygroundKinematics', () => {
  beforeEach(() => {
    mockReducedMotion(true); // synchronous IK solves in tests
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts empty when no robot is loaded', () => {
    const { result } = renderHook(() => usePlaygroundKinematics(null));
    expect(result.current.ready).toBe(false);
    expect(result.current.joints).toEqual([]);
    expect(result.current.eePose).toBeNull();
  });

  it('builds ordered joint controls with radian limits from the loaded robot', () => {
    const loaded = fallbackLoaded();
    const { result } = renderHook(() => usePlaygroundKinematics(loaded));
    expect(result.current.ready).toBe(true);
    expect(result.current.joints.map((j) => j.name)).toEqual([
      'shoulder_pan',
      'shoulder_lift',
      'elbow_flex',
    ]);
    expect(result.current.joints[0].lower).toBeCloseTo(-1.92, 5);
    expect(result.current.joints[0].upper).toBeCloseTo(1.92, 5);
    expect(result.current.angles.shoulder_pan).toBe(0);
  });

  it('derives the end-effector pose in scene coordinates (y up)', () => {
    const loaded = fallbackLoaded();
    const { result } = renderHook(() => usePlaygroundKinematics(loaded));
    const pose = result.current.eePose;
    expect(pose).not.toBeNull();
    expect(pose!.position.x).toBeCloseTo(0, 4);
    expect(pose!.position.y).toBeCloseTo(0.33, 4);
    expect(pose!.position.z).toBeCloseTo(0, 4);
  });

  it('clamps manual joint input to the joint limits', () => {
    const loaded = fallbackLoaded();
    const { result } = renderHook(() => usePlaygroundKinematics(loaded));
    act(() => result.current.setJoint('shoulder_lift', 99));
    expect(result.current.angles.shoulder_lift).toBeCloseTo(1.745, 5);
    act(() => result.current.setJoint('shoulder_lift', -99));
    expect(result.current.angles.shoulder_lift).toBeCloseTo(-1.745, 5);
  });

  it('solves a reachable target and syncs the joint angles to the solution', () => {
    const loaded = fallbackLoaded();
    const { result } = renderHook(() => usePlaygroundKinematics(loaded));
    act(() => result.current.placeTarget({ x: 0.1, y: 0.25, z: 0 }));
    expect(result.current.solving).toBe(false);
    expect(result.current.targetScene).toEqual({ x: 0.1, y: 0.25, z: 0 });
    expect(result.current.iterations).not.toBeNull();
    expect(result.current.iterations!).toBeGreaterThan(0);
    expect(result.current.iterations!).toBeLessThan(100);
    expect(result.current.residualMm).not.toBeNull();
    expect(result.current.residualMm!).toBeLessThan(1);
    const pose = result.current.eePose!;
    expect(pose.position.x).toBeCloseTo(0.1, 3);
    expect(pose.position.y).toBeCloseTo(0.25, 3);
    // Solved angles land in the angle state, so sliders would track them.
    expect(result.current.angles.shoulder_lift).not.toBe(0);
  });

  it('reports an honest non-zero residual for unreachable targets', () => {
    const loaded = fallbackLoaded();
    const { result } = renderHook(() => usePlaygroundKinematics(loaded));
    act(() => result.current.placeTarget({ x: 1, y: 0.14, z: 0 }));
    expect(result.current.solving).toBe(false);
    expect(result.current.residualMm!).toBeGreaterThan(100);
    for (const [i, name] of ['shoulder_pan', 'shoulder_lift', 'elbow_flex'].entries()) {
      const joint = result.current.joints[i];
      const angle = result.current.angles[name];
      expect(angle).toBeGreaterThanOrEqual(joint.lower - 1e-9);
      expect(angle).toBeLessThanOrEqual(joint.upper + 1e-9);
      expect(Number.isFinite(angle)).toBe(true);
    }
  });

  it('cancels an active target and returns to home pose on reset', () => {
    const loaded = fallbackLoaded();
    const { result } = renderHook(() => usePlaygroundKinematics(loaded));
    act(() => result.current.placeTarget({ x: 0.1, y: 0.25, z: 0 }));
    act(() => result.current.resetPose());
    expect(result.current.targetScene).toBeNull();
    expect(result.current.residualMm).toBeNull();
    expect(result.current.iterations).toBeNull();
    for (const joint of result.current.joints) {
      expect(result.current.angles[joint.name]).toBe(0);
    }
  });

  it('clears the target without touching the pose', () => {
    const loaded = fallbackLoaded();
    const { result } = renderHook(() => usePlaygroundKinematics(loaded));
    act(() => result.current.placeTarget({ x: 0.1, y: 0.25, z: 0 }));
    const solvedLift = result.current.angles.shoulder_lift;
    act(() => result.current.clearTarget());
    expect(result.current.targetScene).toBeNull();
    expect(result.current.angles.shoulder_lift).toBe(solvedLift);
  });
});
