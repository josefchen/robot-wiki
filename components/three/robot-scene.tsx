'use client';

import { Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { URDFRobot } from 'urdf-loader';
import { BRAND_COLORS } from '@/lib/brand-v2-tokens';
import type { Vec3 } from '@/lib/ik';
import type { LoadedRobot } from './load-robot';
import { RobotArm } from './robot-arm';

export type TargetState = 'solving' | 'reached' | 'unreachable';

interface RobotSceneProps {
  robot: LoadedRobot | null;
  /** Radians per joint name; applied to the URDF graph on every change. */
  angles: Record<string, number>;
  /** IK target in scene coordinates, or null when no target is set. */
  target: Vec3 | null;
  targetState: TargetState;
  onPlaceTarget: (targetScene: Vec3) => void;
  onRenderedFrame: (snapshot: RenderedFrameSnapshot) => void;
}

export interface RenderedFrameSnapshot {
  frame: number;
  ready: boolean;
  camera: [number, number, number];
}

/** Pushes the joint-angle state into the URDF graph and redraws on demand. */
function ApplyPose({
  robot,
  angles,
}: {
  robot: URDFRobot | null;
  angles: Record<string, number>;
}) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (!robot) return;
    for (const [name, value] of Object.entries(angles)) {
      robot.setJointValue(name, value);
    }
    invalidate();
  }, [robot, angles, invalidate]);
  return null;
}

/**
 * Publishes the camera state after each rendered frame. The canvas attributes
 * give browser tests a deterministic signal that an OrbitControls update was
 * actually rendered, instead of racing an immediate screenshot against
 * SwiftShader's demand frame loop.
 */
function SceneTelemetry({
  ready,
  onRenderedFrame,
}: {
  ready: boolean;
  onRenderedFrame: (snapshot: RenderedFrameSnapshot) => void;
}) {
  const camera = useThree((state) => state.camera);
  const frame = useRef(0);

  useFrame(() => {
    frame.current += 1;
    onRenderedFrame({
      frame: frame.current,
      ready,
      camera: camera.position.toArray(),
    });
  });

  return null;
}

/**
 * WebGL materials cannot read CSS custom properties, so the scene restates
 * the design tokens it needs as literals. These are the semantic state
 * colours from app/globals.css (--color-warn, --color-ok, --color-err),
 * not free choices, and the HUD names each state in text as well, so colour
 * is never the only channel carrying the solver's verdict.
 */
export const PLAYGROUND_RENDERER_COLORS = {
  paper: BRAND_COLORS.paper,
  concrete: BRAND_COLORS.concrete,
  graphite: BRAND_COLORS.graphite,
  ok: BRAND_COLORS.ok,
  warn: BRAND_COLORS.warn,
  error: BRAND_COLORS.error,
} as const;

const TARGET_COLORS: Record<TargetState, string> = {
  solving: PLAYGROUND_RENDERER_COLORS.warn,
  reached: PLAYGROUND_RENDERER_COLORS.ok,
  unreachable: PLAYGROUND_RENDERER_COLORS.error,
};

/** Marker for the IK target: a sphere at the target plus a ground ring. */
function TargetGizmo({
  target,
  state,
}: {
  target: Vec3;
  state: TargetState;
}) {
  const color = TARGET_COLORS[state];
  return (
    <group position={[target.x, target.y, target.z]}>
      <mesh>
        <sphereGeometry args={[0.006, 24, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          roughness={0.4}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -target.y + 0.001, 0]}>
        <ringGeometry args={[0.011, 0.015, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

/**
 * Invisible ground plane that catches click-to-reach input. A click only
 * counts when the pointer barely moved between press and release
 * (event.delta, pixels), so orbit and pan drags never place a target.
 */
function ClickPlane({
  onPlaceTarget,
}: {
  onPlaceTarget: (targetScene: Vec3) => void;
}) {
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 6) return;
    event.stopPropagation();
    onPlaceTarget({
      x: event.point.x,
      y: event.point.y,
      z: event.point.z,
    });
  };
  return (
    <mesh rotation-x={-Math.PI / 2} onClick={handleClick}>
      <planeGeometry args={[4, 4]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

/**
 * The playground scene: lighting, ground grid, a local (network-free)
 * environment map, orbit controls, the robot arm, the IK target gizmo, and
 * the click-to-reach ground plane. Rendered on demand; the controls and
 * state updates invalidate the frame loop.
 */
export default function RobotScene({
  robot,
  angles,
  target,
  targetState,
  onPlaceTarget,
  onRenderedFrame,
}: RobotSceneProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [0.46, 0.34, 0.46], fov: 40, near: 0.01, far: 20 }}
      // preserveDrawingBuffer lets e2e tests and validators read pixels and
      // screenshot the canvas reliably.
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={(state) => {
        // With frameloop="demand" a restored WebGL context repaints only
        // after an explicit invalidate; otherwise the canvas stays blank
        // until the next user interaction.
        state.gl.domElement.addEventListener('webglcontextrestored', () => {
          state.invalidate();
        });
      }}
    >
      {/* Runtime CSS cannot cross the WebGL boundary. These values come from
          the checked-in renderer mirror in lib/brand-v2-tokens.ts. */}
      <color attach="background" args={[PLAYGROUND_RENDERER_COLORS.paper]} />
      <ambientLight intensity={0.62} />
      <directionalLight position={[0.6, 0.9, 0.45]} intensity={1.4} />
      <directionalLight position={[-0.8, 0.5, -0.6]} intensity={0.45} />
      <Grid
        position={[0, 0, 0]}
        infiniteGrid
        cellSize={0.05}
        sectionSize={0.25}
        cellColor={PLAYGROUND_RENDERER_COLORS.concrete}
        sectionColor={PLAYGROUND_RENDERER_COLORS.graphite}
        fadeDistance={2.4}
        fadeStrength={1.5}
      />
      {robot ? <RobotArm robot={robot.robot} /> : null}
      <ApplyPose robot={robot?.robot ?? null} angles={angles} />
      <SceneTelemetry
        ready={robot !== null}
        onRenderedFrame={onRenderedFrame}
      />
      {target ? <TargetGizmo target={target} state={targetState} /> : null}
      <ClickPlane onPlaceTarget={onPlaceTarget} />
      {/* Lightformer-only environment: rendered locally, no network fetch. */}
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 1, 1]} scale={[2, 2, 1]} />
        <Lightformer intensity={1} position={[-1, 0.5, -1]} scale={[2, 2, 1]} />
      </Environment>
      <OrbitControls
        makeDefault
        target={[0.08, 0.1, 0]}
        enableDamping={false}
        minDistance={0.08}
        maxDistance={2.5}
      />
    </Canvas>
  );
}
