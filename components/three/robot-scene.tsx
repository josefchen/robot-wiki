'use client';

import { Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import type { LoadedRobot } from './load-robot';
import { RobotArm } from './robot-arm';

/**
 * The playground scene: lighting, ground grid, a local (network-free)
 * environment map, orbit controls, and the robot arm. Rendered on demand;
 * the controls and model load invalidate the frame loop.
 */
export default function RobotScene({ robot }: { robot: LoadedRobot | null }) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [0.46, 0.34, 0.46], fov: 40, near: 0.01, far: 20 }}
      // preserveDrawingBuffer lets e2e tests and validators read pixels and
      // screenshot the canvas reliably.
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <color attach="background" args={['#0b0d0e']} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[0.6, 0.9, 0.45]} intensity={1.4} />
      <directionalLight position={[-0.8, 0.5, -0.6]} intensity={0.45} />
      <Grid
        position={[0, 0, 0]}
        infiniteGrid
        cellSize={0.05}
        sectionSize={0.25}
        cellColor="#272e33"
        sectionColor="#39424a"
        fadeDistance={2.4}
        fadeStrength={1.5}
      />
      {robot ? <RobotArm robot={robot.robot} /> : null}
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
