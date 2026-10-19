'use client';

import { Line, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Box3, PerspectiveCamera, Spherical, TOUCH, Vector3, type Mesh, type Object3D } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { URDFRobot } from 'urdf-loader';
import { smooth } from '@/components/motion/easing';
import type { Vec3 } from '@/lib/ik';
import type { LoadedRobot } from './load-robot';
import { RobotArm } from './robot-arm';
import {
  FLOOR,
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
 * The home view: the whole arm from the front right and a little above. The
 * camera is fitted to the arm at its zero pose so the arm spans most of the
 * stage's height, centred, with the stage's sides left for it to turn and
 * reach into. On a short stage (a phone's) the arm also keeps clear of the
 * hint line at the stage's top: it moves down, and gives up a little height
 * if it must, but never below minFill. Reset returns here. The position and
 * target below stand in only until the arm has loaded.
 */
export const HOME_VIEW = {
  target: [0.15, 0.14, 0.0] as const,
  position: [0.6, 0.48, 0.59] as const,
  /** The direction the camera looks from, toward the arm. */
  direction: [0.45, 0.34, 0.59] as const,
  /** The arm spans this share of the stage's height... */
  heightFill: 0.7,
  /** ...and at most this share of its width. */
  widthFill: 0.84,
  /**
   * The stage's top kept clear of the arm, in CSS px: the hint line's box
   * ends about 37 px down (12 px under the 1 px rule, one 13 px line at 1.5
   * with 2 px padding; playground.css) and its text about 31 px down, so the
   * arm starts about 20 px under the words.
   */
  topClearPx: 52,
  /** Moved down, the arm keeps at least this share of the height under it... */
  floorRoom: 0.06,
  /** ...and its band never spans less than this share of the height (the fit lands about 0.01 inside it). */
  minFill: 0.68,
};

/**
 * The vertical band of the frame the arm is fitted into, in normalised
 * device units (-1 is the stage's bottom, 1 its top), for a stage this many
 * CSS px tall. A tall stage keeps the centred band of heightFill; a short
 * one lowers its top below the hint line's clear room, as far as the floor
 * room and minFill allow.
 */
export function homeBand(stageHeightPx: number): { top: number; bottom: number } {
  const clear = stageHeightPx > 0 ? HOME_VIEW.topClearPx / stageHeightPx : 0;
  let top = Math.min(HOME_VIEW.heightFill, 1 - 2 * clear);
  let bottom = Math.max(-1 + 2 * HOME_VIEW.floorRoom, top - 2 * HOME_VIEW.heightFill);
  if (top - bottom < 2 * HOME_VIEW.minFill) {
    bottom = Math.max(-1, top - 2 * HOME_VIEW.minFill);
    top = bottom + 2 * HOME_VIEW.minFill;
  }
  return { top, bottom };
}

export interface HomeView {
  position: Vector3;
  target: Vector3;
}

/**
 * World-space points on the arm's visible surface, at the pose the arm holds
 * now: an even sample of every visible mesh's vertices, at most `budget` of
 * them. The fit then frames the arm the reader sees, not the looser boxes
 * around its parts.
 */
export function framePoints(subject: Object3D, budget = 4000): Vector3[] {
  subject.updateWorldMatrix(true, true);
  const meshes: Mesh[] = [];
  let total = 0;
  subject.traverseVisible((object) => {
    const mesh = object as Mesh;
    const position = mesh.isMesh ? mesh.geometry?.getAttribute('position') : undefined;
    if (!position) return;
    meshes.push(mesh);
    total += position.count;
  });
  const stride = Math.max(1, Math.ceil(total / budget));
  const points: Vector3[] = [];
  for (const mesh of meshes) {
    const position = mesh.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i += stride) {
      points.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
    }
  }
  return points;
}

/**
 * The home view for a stage of this shape: looking along HOME_VIEW.direction,
 * the distance at which the points span the height of the stage's band (or
 * widthFill of its width, whichever binds first), re-centred on their
 * projected box in that band. Bisection, then re-centring, three passes (the
 * explainer stage's fit). Without a stage height the band is the centred
 * heightFill.
 */
export function fitHome(points: Vector3[], aspect: number, stageHeightPx = 0): HomeView {
  const lens = new PerspectiveCamera(stageFov(aspect), aspect, 0.01, 50);
  const direction = new Vector3(...HOME_VIEW.direction).normalize();
  const target = new Box3().setFromPoints(points).getCenter(new Vector3());
  const band = homeBand(stageHeightPx);
  const middle = (band.top + band.bottom) / 2;
  const half = (band.top - band.bottom) / 2;
  const v = new Vector3();
  const place = (distance: number) => {
    lens.position.copy(target).addScaledVector(direction, distance);
    lens.lookAt(target);
    lens.updateMatrixWorld();
  };
  const overflow = (distance: number) => {
    place(distance);
    let worst = 0;
    for (const p of points) {
      v.copy(p).project(lens);
      if (v.z > 1) return Infinity;
      worst = Math.max(worst, Math.abs(v.y - middle) / half, Math.abs(v.x) / HOME_VIEW.widthFill);
    }
    return worst;
  };
  let distance = 1;
  for (let pass = 0; pass < 3; pass += 1) {
    let lo = 0.05;
    let hi = 20;
    for (let i = 0; i < 32; i += 1) {
      const mid = (lo + hi) / 2;
      if (overflow(mid) > 1) lo = mid;
      else hi = mid;
    }
    distance = hi;
    place(distance);
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of points) {
      v.copy(p).project(lens);
      x0 = Math.min(x0, v.x);
      x1 = Math.max(x1, v.x);
      y0 = Math.min(y0, v.y);
      y1 = Math.max(y1, v.y);
    }
    const halfHeight = Math.tan((lens.fov * Math.PI) / 360) * distance;
    const halfWidth = halfHeight * lens.aspect;
    target.addScaledVector(v.setFromMatrixColumn(lens.matrixWorld, 0), ((x0 + x1) / 2) * halfWidth);
    target.addScaledVector(v.setFromMatrixColumn(lens.matrixWorld, 1), ((y0 + y1) / 2 - middle) * halfHeight);
  }
  place(distance);
  return { position: lens.position.clone(), target: target.clone() };
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
  subject,
  viewResetToken,
  reducedMotion,
}: {
  /** The arm, framed by the home view once it has loaded. */
  subject: Object3D | null;
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
    toTarget: Vector3;
    timer: number;
  } | null>(null);

  // The arm's frame points at its zero pose, read once when it loads; the
  // home view is fitted to them for the stage's current shape.
  const framed = useRef<Vector3[] | null>(null);
  const aspectRef = useRef(width && height ? width / height : 1.6);
  const heightRef = useRef(height);
  const homeFor = useCallback((aspect: number): HomeView => (
    framed.current
      ? fitHome(framed.current, aspect, heightRef.current)
      : { position: new Vector3(...HOME_VIEW.position), target: new Vector3(...HOME_VIEW.target) }
  ), []);
  // Once the reader turns the view it is theirs: a resize no longer refits it
  // until Reset pose brings it home.
  const moved = useRef(false);

  // Field of view follows the stage's shape, so a phone sees the whole arm.
  useLayoutEffect(() => {
    if (!width || !height) return;
    const lens = getState().camera as PerspectiveCamera;
    lens.fov = stageFov(width / height);
    lens.updateProjectionMatrix();
    invalidate();
  }, [getState, width, height, invalidate]);

  // The home view when the arm arrives, and again on a resize while the
  // reader has not turned the view, so the arm stays framed whole.
  useLayoutEffect(() => {
    if (!controls || !width || !height) return;
    aspectRef.current = width / height;
    heightRef.current = height;
    if (subject && !framed.current) framed.current = framePoints(subject);
    if (moved.current || tween.current) return;
    const home = homeFor(aspectRef.current);
    camera.position.copy(home.position);
    controls.target.copy(home.target);
    controls.update();
    invalidate();
  }, [camera, controls, subject, width, height, homeFor, invalidate]);

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
    moved.current = true;
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
    const home = homeFor(aspectRef.current);
    if (reducedMotion) {
      cancelMove();
      moved.current = false;
      settleInertia();
      camera.position.copy(home.position);
      controls.target.copy(home.target);
      controls.update();
      restoreDamping();
      invalidate();
      return;
    }
    // Drop any drag inertia first, so the move ends exactly at home.
    cancelMove();
    moved.current = false;
    settleInertia();
    const move = {
      start: performance.now(),
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPosition: home.position,
      toTarget: home.target,
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
        target.copy(move.toTarget);
      } else {
        const k = smooth(t);
        lens.position.lerpVectors(move.fromPosition, move.toPosition, k);
        target.lerpVectors(move.fromTarget, move.toTarget, k);
        move.timer = window.setTimeout(step, 16);
      }
      (orbit as OrbitControlsImpl).update();
      if (t >= 1) restoreDamping();
      invalidate();
    };
    step();
  }, [viewResetToken, reducedMotion, camera, controls, invalidate, getState, settleInertia, restoreDamping, cancelMove, homeFor]);

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
 * The table: a flat disc around the base, one tone step darker than the
 * page, with faint rings every 10 cm. It shows where the floor is, so "click
 * the floor" has a place, and the rings give the hand readout a scale. The
 * key-light shadow falls on it from the shadow-only plane just above.
 */
function FloorDisc() {
  const disc = useMemo(() => srgbColor(PLAYGROUND_COLORS.floor), []);
  const ring = useMemo(() => srgbColor(PLAYGROUND_COLORS.floorRing), []);
  const rings = useMemo(() => {
    const out: number[] = [];
    for (let r = FLOOR.ringStep; r < FLOOR.radius - 0.001; r += FLOOR.ringStep) out.push(r);
    return out;
  }, []);
  return (
    <group rotation-x={-Math.PI / 2}>
      <mesh position={[0, 0, -0.0004]}>
        <circleGeometry args={[FLOOR.radius, 96]} />
        <meshBasicMaterial color={disc} />
      </mesh>
      {rings.map((r) => (
        <mesh key={r} position={[0, 0, -0.0002]}>
          <ringGeometry args={[r - 0.0009, r + 0.0009, 128]} />
          <meshBasicMaterial color={ring} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Invisible ground plane that catches click-to-reach input. A click only
 * counts when the pointer barely moved between press and release
 * (event.delta, pixels), so orbit and pan drags never place a target. Over
 * the floor the pointer becomes a crosshair, so the floor reads as a place
 * to click.
 */
function ClickPlane({
  onPlaceTarget,
}: {
  onPlaceTarget: (targetScene: Vec3) => void;
}) {
  const getState = useThree((state) => state.get);
  const cursor = (value: string) => {
    getState().gl.domElement.style.cursor = value;
  };
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
    <mesh
      rotation-x={-Math.PI / 2}
      onClick={handleClick}
      onPointerOver={() => cursor('crosshair')}
      onPointerOut={() => cursor('')}
    >
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
      <FloorDisc />
      <StageLights />
      {robot ? <RobotArm robot={robot.robot} /> : null}
      <ApplyPose robot={robot?.robot ?? null} angles={angles} />
      <MotorHighlight motors={robot?.motors ?? null} activeJoint={activeJoint} />
      <SceneTelemetry ready={robot !== null} onRenderedFrame={onRenderedFrame} />
      {target ? <TargetGizmo target={target} state={targetState} hand={hand} /> : null}
      <ClickPlane onPlaceTarget={onPlaceTarget} />
      <CameraRig
        subject={robot?.robot ?? null}
        viewResetToken={viewResetToken}
        reducedMotion={reducedMotion}
      />
    </Canvas>
  );
}
