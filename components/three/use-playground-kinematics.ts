'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildChainSpec,
  createIkSolver,
  forwardKinematics,
  mat3ToEulerZYX,
  revoluteJoints,
  robotToScene,
  robotToSceneRotation,
  sceneToRobot,
  type IkState,
  type UrdfLikeNode,
  type Vec3,
} from '@/lib/ik';
import type { LoadedRobot } from './load-robot';

export interface JointControl {
  name: string;
  /** Radians. */
  lower: number;
  /** Radians. */
  upper: number;
}

export interface EePose {
  /** Scene coordinates (three.js Y-up). */
  position: Vec3;
  /** ZYX Euler angles of the end-effector frame, radians, scene frame. */
  roll: number;
  pitch: number;
  yaw: number;
}

export interface PlaygroundKinematics {
  ready: boolean;
  joints: JointControl[];
  /** Radians per joint name; the single source of truth for FK and IK. */
  angles: Record<string, number>;
  eePose: EePose | null;
  targetScene: Vec3 | null;
  solving: boolean;
  /** Live end-effector distance to the target, millimeters. */
  residualMm: number | null;
  /** Iteration count of the last solve. */
  iterations: number | null;
  setJoint: (name: string, radians: number) => void;
  placeTarget: (targetScene: Vec3) => void;
  clearTarget: () => void;
  resetPose: () => void;
}

interface SolverHandle {
  step: (count?: number) => IkState;
  snapshot: () => IkState;
}

const TICK_MS = 40;
const ITERATIONS_PER_TICK = 4;
/** Wall-clock guard so a pathological solve never runs visibly forever. */
const MAX_SOLVE_MS = 2500;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function formatSceneTarget(v: Vec3): Vec3 {
  // Round to the millimeter grid so the HUD and form stay stable.
  return {
    x: Math.round(v.x * 1000) / 1000,
    y: Math.round(v.y * 1000) / 1000,
    z: Math.round(v.z * 1000) / 1000,
  };
}

/**
 * Owns the playground's kinematic state: the chain extracted from the
 * loaded URDF robot, the joint angles (single source of truth for the
 * sliders, the 3D pose, and the HUD), and the incremental IK solver.
 *
 * The solver steps a few DLS iterations per timer tick (not per animation
 * frame) so the residual and iteration count update live in the HUD even
 * in environments where requestAnimationFrame never fires. Under
 * prefers-reduced-motion the solve runs to completion synchronously.
 */
export function usePlaygroundKinematics(
  loaded: LoadedRobot | null,
): PlaygroundKinematics {
  const [angles, setAngles] = useState<Record<string, number>>({});
  const [targetScene, setTargetScene] = useState<Vec3 | null>(null);
  const [solving, setSolving] = useState(false);
  const [iterations, setIterations] = useState<number | null>(null);

  const solverRef = useRef<SolverHandle | null>(null);

  // The chain and the ordered slider list are pure derivations of the
  // loaded robot: chain joints first (base to tip), then any revolute
  // joint outside the end-effector chain (the SO-101 gripper jaw) so it
  // still gets a slider.
  const derived = useMemo(() => {
    if (!loaded) return null;
    const spec = buildChainSpec(
      loaded.robot as unknown as UrdfLikeNode,
      loaded.info.eeLink,
    );
    if (!spec) return null;
    const chainRevolute = revoluteJoints(spec);
    const chainNames = new Set(chainRevolute.map((j) => j.name));
    const extras: JointControl[] = Object.values(loaded.robot.joints)
      .filter((j) => j.jointType === 'revolute' && !chainNames.has(j.name))
      .map((j) => ({
        name: j.name,
        lower: j.limit.lower,
        upper: j.limit.upper,
      }));
    const ordered: JointControl[] = [
      ...chainRevolute.map((j) => ({
        name: j.name,
        lower: j.lower,
        upper: j.upper,
      })),
      ...extras,
    ];
    return { spec, ordered };
  }, [loaded]);

  const chain = derived?.spec ?? null;
  const joints = useMemo(() => derived?.ordered ?? [], [derived]);

  // Reset pose and target state when a different robot arrives. This is the
  // sanctioned "adjust state during render" pattern, not an effect. The
  // solver ref needs no clearing here: it is only read while solving, and
  // solving is reset to false.
  const [previousLoaded, setPreviousLoaded] = useState<LoadedRobot | null>(
    null,
  );
  if (previousLoaded !== loaded) {
    setPreviousLoaded(loaded);
    const zeroAngles: Record<string, number> = {};
    for (const joint of joints) zeroAngles[joint.name] = 0;
    setAngles(zeroAngles);
    setTargetScene(null);
    setSolving(false);
    setIterations(null);
  }

  const chainRevolute = useMemo(
    () => (chain ? revoluteJoints(chain) : []),
    [chain],
  );

  const eePose = useMemo<EePose | null>(() => {
    if (!chain) return null;
    const fk = forwardKinematics(
      chain,
      chainRevolute.map((j) => angles[j.name] ?? 0),
    );
    const euler = mat3ToEulerZYX(robotToSceneRotation(fk.rotation));
    return {
      position: robotToScene(fk.position),
      roll: euler.roll,
      pitch: euler.pitch,
      yaw: euler.yaw,
    };
  }, [chain, chainRevolute, angles]);

  const residualMm = useMemo(() => {
    if (!eePose || !targetScene) return null;
    const dx = eePose.position.x - targetScene.x;
    const dy = eePose.position.y - targetScene.y;
    const dz = eePose.position.z - targetScene.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) * 1000;
  }, [eePose, targetScene]);

  const applySolveState = useCallback(
    (state: IkState) => {
      setAngles((previous) => {
        const next = { ...previous };
        chainRevolute.forEach((joint, i) => {
          next[joint.name] = state.angles[i];
        });
        return next;
      });
      setIterations(state.iterations);
      return state;
    },
    [chainRevolute],
  );

  const cancelSolve = useCallback(() => {
    solverRef.current = null;
    setSolving(false);
  }, []);

  // Incremental solver loop: a few iterations per timer tick so the HUD
  // shows the residual shrinking and the iteration count growing live.
  useEffect(() => {
    if (!solving || !solverRef.current) return;
    const solver = solverRef.current;

    if (prefersReducedMotion()) {
      let state = solver.snapshot();
      while (!state.done) state = solver.step(10);
      applySolveState(state);
      cancelSolve();
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      let state = solver.step(ITERATIONS_PER_TICK);
      if (!state.done && Date.now() - startedAt > MAX_SOLVE_MS) {
        // Wall-clock guard: stop and report the honest residual so far.
        state = { ...solver.snapshot(), done: true };
      }
      applySolveState(state);
      if (state.done) {
        window.clearInterval(timer);
        solverRef.current = null;
        setSolving(false);
      }
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [solving, applySolveState, cancelSolve]);

  const setJoint = useCallback(
    (name: string, radians: number) => {
      const joint = joints.find((j) => j.name === name);
      if (!joint || !Number.isFinite(radians)) return;
      // Manual input wins over an in-progress solve: the solver keeps its
      // target but stops overwriting the pose.
      cancelSolve();
      setAngles((previous) => ({
        ...previous,
        [name]: clamp(radians, joint.lower, joint.upper),
      }));
    },
    [joints, cancelSolve],
  );

  const placeTarget = useCallback(
    (scenePoint: Vec3) => {
      if (!chain) return;
      cancelSolve();
      const target = formatSceneTarget(scenePoint);
      solverRef.current = createIkSolver(
        chain,
        chainRevolute.map((j) => angles[j.name] ?? 0),
        sceneToRobot(target),
      );
      setTargetScene(target);
      setIterations(0);
      setSolving(true);
    },
    [chain, chainRevolute, angles, cancelSolve],
  );

  const clearTarget = useCallback(() => {
    cancelSolve();
    setTargetScene(null);
    setIterations(null);
  }, [cancelSolve]);

  const resetPose = useCallback(() => {
    cancelSolve();
    setTargetScene(null);
    setIterations(null);
    setAngles((previous) => {
      const next = { ...previous };
      for (const joint of joints) next[joint.name] = 0;
      return next;
    });
  }, [joints, cancelSolve]);

  return {
    ready: chain !== null && joints.length > 0,
    joints,
    angles,
    eePose,
    targetScene,
    solving,
    residualMm,
    iterations,
    setJoint,
    placeTarget,
    clearTarget,
    resetPose,
  };
}
