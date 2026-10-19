'use client';

import { Line, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Spherical, TOUCH, Vector3, type Mesh, type PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { URDFRobot } from 'urdf-loader';
import { smooth } from '@/components/motion/easing';
import type { Vec3 } from '@/lib/ik';
import type { LoadedRobot } from './load-robot';
import { RobotArm } from './robot-arm';
import {
  PLAYGROUND_COLORS,
  PLAYGROUND_MATERIALS,
  STAGE_LIGHTS,
  srgbColor,
  stageFov,
} from './stage-look';

export type TargetState = 'solving' | 'reached' | 'unreachable';

interface RobotSceneProps {
  robot: LoadedRobot | null;
  /** Radians per joint name; applied to the URDF graph on every change. */
  angles: Record<string, number>;
  /** IK target in scene coordinates, or null when no target is set. */
  target: Vec3 | null;
  targetState: TargetState;
  /** The hand (end effector) in scene coordinates, for the gap line. */
  hand: Vec3 | null;
  /** The joint whose slider the reader is on; its motor takes the accent. */
  activeJoint: string | null;
  /** Each change eases the camera back to the home view (instant under reduced motion). */
  viewResetToken: number;
  reducedMotion: boolean;
  onPlaceTarget: (targetScene: Vec3) => void;
  onRenderedFrame: (snapshot: RenderedFrameSnapshot) => void;
}

export interface RenderedFrameSnapshot {
  frame: number;
  ready: boolean;
  camera: [number, number, number];
  target: [number, number, number];
  /** The renderer's pixel ratio, clamped to [1, 2]. */
  dpr: number;
  /** Drawing-buffer size in device pixels. */
  buffer: [number, number];
  fov: number;
}

/**
 * The home view: the whole arm from the front right and a little above,
 * with room around it to turn the base and reach out. Reset returns here.
 */
export const HOME_VIEW = {
  target: [0.15, 0.14, 0.0] as const,
  position: [0.6, 0.48, 0.59] as const,
  /** A phone-sized stage starts this much closer, so the arm is not a speck. */
  narrowCloser: 0.86,
  narrowBelowPx: 600,
};

/** The home camera position for a stage of this width. */
export function homePosition(stageWidth: number): Vector3 {
  const target = new Vector3(...HOME_VIEW.target);
  const offset = new Vector3(...HOME_VIEW.position).sub(target);
  if (stageWidth > 0 && stageWidth < HOME_VIEW.narrowBelowPx) {
    offset.multiplyScalar(HOME_VIEW.narrowCloser);
  }
  return target.add(offset);
}

/** Where the camera may go: never under the table, never inside or far from the arm. */
const ORBIT_LIMITS = {
  minDistance: 0.3,
  maxDistance: 2.2,
  minPolarAngle: 0.12,
  maxPolarAngle: Math.PI / 2 - 0.03,
  /** The point the camera turns around stays near the arm. */
  targetMin: [-0.3, 0, -0.35] as const,
  targetMax: [0.45, 0.4, 0.35] as const,
};

const RESET_SECONDS = 0.9;

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

/** Paints the motor that turns the active joint in the accent, the rest in the motor grey. */
function MotorHighlight({
  motors,
  activeJoint,
}: {
  motors: Record<string, Mesh[]> | null;
  activeJoint: string | null;
}) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (!motors) return;
    for (const [joint, meshes] of Object.entries(motors)) {
      const material =
        joint === activeJoint ? PLAYGROUND_MATERIALS.accent : PLAYGROUND_MATERIALS.dark;
      for (const mesh of meshes) mesh.material = material;
    }
    invalidate();
  }, [motors, activeJoint, invalidate]);
  return null;
}

/**
 * Publishes the camera and canvas state after each rendered frame. The
 * attributes give browser tests a deterministic signal that an orbit, a
 * resize or a reset was actually rendered, instead of racing a screenshot
 * against the demand frame loop.
 */
function SceneTelemetry({
  ready,
  onRenderedFrame,
}: {
  ready: boolean;
  onRenderedFrame: (snapshot: RenderedFrameSnapshot) => void;
}) {
  const frame = useRef(0);
  useFrame((state) => {
    frame.current += 1;
    const camera = state.camera as PerspectiveCamera;
    const controls = state.controls as OrbitControlsImpl | null;
    const canvas = state.gl.domElement;
    onRenderedFrame({
      frame: frame.current,
      ready,
      camera: camera.position.toArray() as [number, number, number],
      target: (controls?.target.toArray() ?? [0, 0, 0]) as [number, number, number],
      dpr: state.gl.getPixelRatio(),
      buffer: [canvas.width, canvas.height],
      fov: camera.fov,
    });
  });
  return null;
}

/**
 * The camera: the explainers' field of view for the stage's aspect, orbit
 * limits, the keyboard turn and zoom, the touch rule, and the eased return
 * to the home view.
 */
function CameraRig({
  viewResetToken,
  reducedMotion,
}: {
  viewResetToken: number;
  reducedMotion: boolean;
}) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null;
  const gl = useThree((state) => state.gl);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const invalidate = useThree((state) => state.invalidate);
  // Settings written straight onto three.js objects go through the store's
  // getter, inside effects, rather than onto values a hook returned.
  const getState = useThree((state) => state.get);
  // The move home runs on its own timer, not on the frame loop: the demand
  // loop draws when asked, and a busy device can stall it, but the move must
  // always end exactly at home unless the reader takes over.
  const tween = useRef<{
    start: number;
    fromPosition: Vector3;
    fromTarget: Vector3;
    toPosition: Vector3;
    timer: number;
  } | null>(null);

  // Only a new reset token starts a move home; the stage width it reads is
  // the latest, without a resize starting one.
  const widthRef = useRef(width);
  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  // Field of view follows the stage's shape, so a phone sees the whole arm.
  useLayoutEffect(() => {
    if (!width || !height) return;
    const lens = getState().camera as PerspectiveCamera;
    lens.fov = stageFov(width / height);
    lens.updateProjectionMatrix();
    invalidate();
  }, [getState, width, height, invalidate]);

  // The home view on mount, for the stage's first width.
  const homed = useRef(false);
  useLayoutEffect(() => {
    if (!controls || !width || homed.current) return;
    homed.current = true;
    camera.position.copy(homePosition(width));
    controls.target.set(...HOME_VIEW.target);
    controls.update();
    invalidate();
  }, [camera, controls, width, invalidate]);

  // OrbitControls keeps a drag's inertia privately; one update with damping
  // off spends it and zeroes it. Damping stays off for the move home.
  const settleInertia = useCallback(() => {
    const orbit = getState().controls as OrbitControlsImpl | null;
    if (!orbit) return;
    orbit.enableDamping = false;
    orbit.update();
  }, [getState]);
  const restoreDamping = useCallback(() => {
    const orbit = getState().controls as OrbitControlsImpl | null;
    if (orbit) orbit.enableDamping = !reducedMotion;
  }, [getState, reducedMotion]);

  // A reader who turns the view during the move home takes over from it.
  const cancelMove = useCallback(() => {
    if (!tween.current) return;
    window.clearTimeout(tween.current.timer);
    tween.current = null;
    restoreDamping();
  }, [restoreDamping]);
  useEffect(() => () => {
    if (tween.current) window.clearTimeout(tween.current.timer);
  }, []);

  // Reset: ease back home, or jump there under reduced motion.
  const handledToken = useRef(viewResetToken);
  useEffect(() => {
    if (!controls || viewResetToken === handledToken.current) return;
    handledToken.current = viewResetToken;
    if (reducedMotion) {
      cancelMove();
      settleInertia();
      camera.position.copy(homePosition(widthRef.current));
      controls.target.set(...HOME_VIEW.target);
      controls.update();
      restoreDamping();
      invalidate();
      return;
    }
    // Drop any drag inertia first, so the move ends exactly at home.
    cancelMove();
    settleInertia();
    const move = {
      start: performance.now(),
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPosition: homePosition(widthRef.current),
      timer: 0,
    };
    tween.current = move;
    // One step of the move, and its end: exactly the home view, damping on.
    const step = () => {
      if (tween.current !== move) return;
      const { camera: lens, controls: orbit } = getState();
      if (!orbit) return;
      const target = (orbit as OrbitControlsImpl).target;
      const t = Math.min(1, (performance.now() - move.start) / (RESET_SECONDS * 1000));
      if (t >= 1) {
        tween.current = null;
        lens.position.copy(move.toPosition);
        target.set(...HOME_VIEW.target);
      } else {
        const k = smooth(t);
        lens.position.lerpVectors(move.fromPosition, move.toPosition, k);
        target.lerpVectors(move.fromTarget, new Vector3(...HOME_VIEW.target), k);
        move.timer = window.setTimeout(step, 16);
      }
      (orbit as OrbitControlsImpl).update();
      if (t >= 1) restoreDamping();
      invalidate();
    };
    step();
  }, [viewResetToken, reducedMotion, camera, controls, invalidate, getState, settleInertia, restoreDamping, cancelMove]);

  // Keyboard: the arrow keys turn the view and + or - zoom, as in the explainers.
  useEffect(() => {
    if (!controls) return;
    const canvas = gl.domElement;
    const TURN: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const ZOOM: Record<string, number> = { '+': 0.85, '=': 0.85, '-': 1.18, _: 1.18 };
    const onKey = (event: KeyboardEvent) => {
      const turn = TURN[event.key];
      const zoom = ZOOM[event.key];
      if ((!turn && !zoom) || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      cancelMove();
      const offset = camera.position.clone().sub(controls.target);
      const s = new Spherical().setFromVector3(offset);
      if (turn) {
        s.theta -= turn[0] * 0.15;
        s.phi = Math.min(
          ORBIT_LIMITS.maxPolarAngle,
          Math.max(ORBIT_LIMITS.minPolarAngle, s.phi + turn[1] * 0.1),
        );
      }
      if (zoom) {
        s.radius = Math.min(
          ORBIT_LIMITS.maxDistance,
          Math.max(ORBIT_LIMITS.minDistance, s.radius * zoom),
        );
      }
      camera.position.copy(controls.target).add(offset.setFromSpherical(s));
      controls.update();
      invalidate();
    };
    canvas.addEventListener('keydown', onKey);
    return () => canvas.removeEventListener('keydown', onKey);
  }, [camera, controls, gl, invalidate, cancelMove]);

  // Touch: the page keeps scrolling over the stage until the reader taps it;
  // then one finger turns the view and two zoom, until the stage leaves the
  // screen (the explainers' rule).
  useEffect(() => {
    if (!controls) return;
    const { gl: renderer, controls: orbit } = getState();
    const canvas = renderer.domElement;
    // OrbitControls listens on the canvas's wrapper and marks it touch-action
    // none; both elements follow the rule.
    const surfaces = [canvas, (orbit as OrbitControlsImpl).domElement].filter(
      (element): element is HTMLElement => element instanceof HTMLElement,
    );
    const setTouch = (on: boolean) => {
      for (const surface of surfaces) surface.style.touchAction = on ? 'none' : 'pan-y';
      (orbit as OrbitControlsImpl).touches = on
        ? { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }
        : ({ ONE: undefined, TWO: undefined } as unknown as OrbitControlsImpl['touches']);
      canvas.toggleAttribute('data-touch-active', on);
    };
    setTouch(false);
    let start: { x: number; y: number } | null = null;
    const down = (event: PointerEvent) => {
      start = event.pointerType === 'touch' ? { x: event.clientX, y: event.clientY } : null;
    };
    const up = (event: PointerEvent) => {
      if (
        start &&
        event.pointerType === 'touch' &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8
      ) {
        setTouch(true);
      }
      start = null;
    };
    const seen = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setTouch(false);
    });
    seen.observe(canvas);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    return () => {
      seen.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
    };
  }, [controls, getState]);

  // Keep the orbit centre near the arm when the reader pans.
  const clampTarget = useMemo(
    () => () => {
      if (!controls) return;
      const t = controls.target;
      const clamped = new Vector3(
        Math.min(ORBIT_LIMITS.targetMax[0], Math.max(ORBIT_LIMITS.targetMin[0], t.x)),
        Math.min(ORBIT_LIMITS.targetMax[1], Math.max(ORBIT_LIMITS.targetMin[1], t.y)),
        Math.min(ORBIT_LIMITS.targetMax[2], Math.max(ORBIT_LIMITS.targetMin[2], t.z)),
      );
      if (!clamped.equals(t)) {
        camera.position.add(clamped.clone().sub(t));
        t.copy(clamped);
      }
    },
    [camera, controls],
  );

  return (
    <OrbitControls
      makeDefault
      enableDamping={!reducedMotion}
      dampingFactor={0.08}
      minDistance={ORBIT_LIMITS.minDistance}
      maxDistance={ORBIT_LIMITS.maxDistance}
      minPolarAngle={ORBIT_LIMITS.minPolarAngle}
      maxPolarAngle={ORBIT_LIMITS.maxPolarAngle}
      onStart={cancelMove}
      onChange={clampTarget}
    />
  );
}

/**
 * The reach target in the accent: a dot where it is and a ring on the table
 * under it, joined by a line when it floats. When the arm cannot get there,
 * a dashed line in the error token shows the gap the hand stops short by, so
 * the verdict is a shape and a colour as well as the words under the stage.
 */
function TargetGizmo({
  target,
  state,
  hand,
}: {
  target: Vec3;
  state: TargetState;
  hand: Vec3 | null;
}) {
  const accent = useMemo(() => srgbColor(PLAYGROUND_COLORS.accent), []);
  const miss = useMemo(() => srgbColor(PLAYGROUND_COLORS.miss), []);
  const floating = target.y > 0.004;
  return (
    <group>
      <mesh position={[target.x, target.y, target.z]}>
        <sphereGeometry args={[0.007, 24, 16]} />
        <meshStandardMaterial
          color={accent}
          roughness={STAGE_LIGHTS.accentRoughness}
          transparent={state === 'solving'}
          opacity={state === 'solving' ? 0.55 : 1}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[target.x, 0.0008, target.z]}>
        <ringGeometry args={[0.013, 0.016, 48]} />
        <meshBasicMaterial color={accent} />
      </mesh>
      {floating ? (
        <Line
          points={[
            [target.x, 0.0008, target.z],
            [target.x, target.y, target.z],
          ]}
          color={accent}
          lineWidth={1}
        />
      ) : null}
      {state === 'unreachable' && hand ? (
        <Line
          points={[
            [hand.x, hand.y, hand.z],
            [target.x, target.y, target.z],
          ]}
          color={miss}
          lineWidth={1.5}
          dashed
          dashSize={0.012}
          gapSize={0.008}
        />
      ) : null}
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

/** The explainer stage's lights and its shadow-only floor. */
function StageLights() {
  const { size, hemisphere, key, fill, floorShadowOpacity } = STAGE_LIGHTS;
  const reach = key.extent * size;
  return (
    <>
      <hemisphereLight args={[hemisphere.sky, hemisphere.ground, hemisphere.intensity]} />
      <directionalLight
        castShadow
        intensity={key.intensity}
        position={[key.direction[0] * size, key.direction[1] * size, key.direction[2] * size]}
        shadow-mapSize={[key.mapSize, key.mapSize]}
        shadow-radius={key.radius}
        shadow-bias={key.bias}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-camera-bottom={-reach}
        shadow-camera-near={0.05 * size}
        shadow-camera-far={6 * size}
      />
      <directionalLight intensity={fill.intensity} position={[...fill.position]} />
      {/* The shadow catcher writes no depth, as on the explainer stage. */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <shadowMaterial opacity={floorShadowOpacity} depthWrite={false} />
      </mesh>
    </>
  );
}

/**
 * The playground scene in the explainers' look: the page's paper as the
 * clear colour, the clay arm with its soft key-light shadow, orbit controls
 * with limits, the reach target, and the click-to-reach ground plane.
 * Rendered on demand; controls and state updates invalidate the frame loop.
 */
export default function RobotScene({
  robot,
  angles,
  target,
  targetState,
  hand,
  activeJoint,
  viewResetToken,
  reducedMotion,
  onPlaceTarget,
  onRenderedFrame,
}: RobotSceneProps) {
  const paper = useMemo(() => srgbColor(PLAYGROUND_COLORS.paper), []);
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      // No tone mapping and percentage-closer shadows, as the explainer
      // renderer draws: the paper clears to exactly the page colour.
      flat
      shadows="percentage"
      camera={{ position: [...HOME_VIEW.position], fov: 30, near: 0.01, far: 20 }}
      // The camera rig moves it to the home view for the stage's width.
      // preserveDrawingBuffer lets e2e tests and validators read pixels and
      // screenshot the canvas reliably.
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={(state) => {
        const canvas = state.gl.domElement;
        canvas.tabIndex = 0;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute(
          'aria-label',
          '3D view of the SO-101 robot arm. Drag or use the arrow keys to turn it, + or - to zoom. Click the floor to set a target for the hand.',
        );
        // With frameloop="demand" a restored WebGL context repaints only
        // after an explicit invalidate; otherwise the canvas stays blank
        // until the next user interaction.
        canvas.addEventListener('webglcontextrestored', () => {
          state.invalidate();
        });
      }}
    >
      <primitive attach="background" object={paper} />
      <StageLights />
      {robot ? <RobotArm robot={robot.robot} /> : null}
      <ApplyPose robot={robot?.robot ?? null} angles={angles} />
      <MotorHighlight motors={robot?.motors ?? null} activeJoint={activeJoint} />
      <SceneTelemetry ready={robot !== null} onRenderedFrame={onRenderedFrame} />
      {target ? <TargetGizmo target={target} state={targetState} hand={hand} /> : null}
      <ClickPlane onPlaceTarget={onPlaceTarget} />
      <CameraRig viewResetToken={viewResetToken} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
