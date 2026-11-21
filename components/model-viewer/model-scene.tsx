'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Box3,
  MeshStandardMaterial,
  Spherical,
  TOUCH,
  Vector3,
  type Group,
  type Mesh,
  type PerspectiveCamera,
} from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { URDFRobot } from 'urdf-loader';
import { fitHome, framePoints } from '@/components/three/robot-scene';
import { PLAYGROUND_COLORS, STAGE_LIGHTS, srgbColor, stageFov } from '@/components/three/stage-look';

/**
 * One neutral surface for every model: the maker's binary STL files carry
 * no colour, so the grey is the site's choice, the explainers' clay.
 */
const NEUTRAL = new MeshStandardMaterial({
  color: srgbColor(PLAYGROUND_COLORS.clay),
  roughness: STAGE_LIGHTS.material.roughness,
  metalness: STAGE_LIGHTS.material.metalness,
});
NEUTRAL.name = 'model-neutral';

/** The camera's reach, as multiples of the fitted distance. */
const ZOOM_RANGE = { min: 0.35, max: 2.5 } as const;
/**
 * The stage height the fit takes for its band, in CSS px. A square stage
 * (278 to 557 px tall) is fitted as the 390 px phone's 308 px stage, low
 * enough to clear the hint line; a 16:10 stage (329 to 569 px) takes the
 * centred band. The fit is then the same share of the stage at every width,
 * so one still per shape lands under the canvas without a shift.
 */
export const FIT_STAGE_PX = { square: 308, wide: 0 } as const;
export const fitStagePx = (aspect: number) => (aspect < 1.3 ? FIT_STAGE_PX.square : FIT_STAGE_PX.wide);

/** Never under the ground, never straight down. */
const POLAR = { min: 0.12, max: Math.PI / 2 - 0.03 } as const;

export interface ModelSceneProps {
  robot: URDFRobot;
  /** The canvas's text alternative. */
  label: string;
  /** Each change returns the camera to the fitted view. */
  resetToken: number;
  reducedMotion: boolean;
  /** Called once, after the first frame that shows the fitted model. */
  onDrawn: () => void;
}

/**
 * The model in the scene: URDF is Z-up, the scene Y-up; the outer group
 * lifts the model so its lowest point stands on the ground at y = 0. The
 * box it reports is the model's, in scene coordinates, as it stands.
 */
function StandingModel({ robot, onPlaced }: { robot: URDFRobot; onPlaced: (box: Box3) => void }) {
  const lift = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    const group = lift.current;
    if (!group) return;
    robot.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.material = NEUTRAL;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    group.position.set(0, 0, 0);
    group.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(group, true);
    group.position.y = -box.min.y;
    group.updateWorldMatrix(true, true);
    onPlaced(box.translate(new Vector3(0, -box.min.y, 0)));
    invalidate();
  }, [robot, onPlaced, invalidate]);
  return (
    <group ref={lift}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={robot} />
      </group>
    </group>
  );
}

/**
 * The ground: the playground's table disc around the model's footprint, and
 * the key light's soft shadow on a shadow-only plane.
 */
function Ground({ box }: { box: Box3 }) {
  const floor = useMemo(() => srgbColor(PLAYGROUND_COLORS.floor), []);
  const centre = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());
  // Wide enough to stand on, small enough to stay inside the frame: a long
  // arm gets a disc under its middle, a tall humanoid one around its feet.
  const radius = Math.max(0.6 * Math.max(size.x, size.z), 0.3 * size.y);
  return (
    <group position={[centre.x, 0, centre.z]} rotation-x={-Math.PI / 2}>
      <mesh position={[0, 0, -0.0004 * radius]}>
        <circleGeometry args={[radius, 96]} />
        <meshBasicMaterial color={floor} />
      </mesh>
      <mesh receiveShadow>
        <planeGeometry args={[radius * 40, radius * 40]} />
        <shadowMaterial opacity={STAGE_LIGHTS.floorShadowOpacity} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** The explainer stage's light rig, scaled to the model's size. */
function Lights({ box }: { box: Box3 }) {
  const { hemisphere, key, fill } = STAGE_LIGHTS;
  const size = Math.max(...box.getSize(new Vector3()).toArray());
  const reach = size * 1.2;
  // The key light aims at the origin, where both URDFs put their root
  // link; the shadow box is wide enough for a model standing off it.
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
      <directionalLight intensity={fill.intensity} position={[fill.position[0] * size, fill.position[1] * size, fill.position[2] * size]} />
    </>
  );
}

/**
 * The camera: fitted to the standing model for the stage's shape (the
 * playground's fit), refitted on a resize until the reader turns the view,
 * and back on each reset. Dragging turns the view; wheel and pinch zoom
 * only while the canvas has focus, so the page scrolls past it otherwise,
 * and a touch turns the view only after a tap has focused the canvas.
 */
function Rig({
  robot,
  resetToken,
  reducedMotion,
  onDrawn,
}: {
  robot: URDFRobot;
  resetToken: number;
  reducedMotion: boolean;
  onDrawn: () => void;
}) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null;
  const gl = useThree((state) => state.gl);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const invalidate = useThree((state) => state.invalidate);
  // Settings written onto three.js objects go through the store's getter,
  // inside effects, as on the playground.
  const getState = useThree((state) => state.get);
  const [focused, setFocused] = useState(false);
  const moved = useRef(false);
  const fitted = useRef(false);
  const drawn = useRef(false);
  const handledReset = useRef(resetToken);
  // Read once the model stands on the ground (the box arrives after the lift).
  const points = useMemo(() => framePoints(robot), [robot]);

  // The fitted view for this stage, on arrival, on a resize the reader has
  // not overridden, and on reset.
  useLayoutEffect(() => {
    if (!controls || !width || !height) return;
    const reset = handledReset.current !== resetToken;
    handledReset.current = resetToken;
    if (reset) moved.current = false;
    if (moved.current) return;
    const lens = getState().camera as PerspectiveCamera;
    const orbit = getState().controls as OrbitControlsImpl;
    const aspect = width / height;
    lens.fov = stageFov(aspect);
    const view = fitHome(points, aspect, fitStagePx(aspect));
    const distance = view.position.distanceTo(view.target);
    orbit.minDistance = distance * ZOOM_RANGE.min;
    orbit.maxDistance = distance * ZOOM_RANGE.max;
    lens.near = distance / 100;
    lens.far = distance * 20;
    lens.updateProjectionMatrix();
    lens.position.copy(view.position);
    orbit.target.copy(view.target);
    // A reset drops any drag inertia, so the view lands exactly.
    const damping = orbit.enableDamping;
    orbit.enableDamping = false;
    orbit.update();
    orbit.enableDamping = damping;
    fitted.current = true;
    invalidate();
  }, [getState, controls, points, width, height, resetToken, invalidate]);

  useFrame(() => {
    if (drawn.current || !fitted.current) return;
    drawn.current = true;
    onDrawn();
  });

  // Focus decides zoom and touch: the canvas takes focus from the keyboard,
  // a click or a tap; the page keeps scrolling over it until then.
  useEffect(() => {
    if (!controls) return;
    const state = getState();
    const orbit = state.controls as unknown as OrbitControlsImpl;
    const canvas = state.gl.domElement;
    const surfaces = [canvas, orbit.domElement].filter(
      (element): element is HTMLElement => element instanceof HTMLElement,
    );
    const apply = (on: boolean) => {
      for (const surface of surfaces) surface.style.touchAction = on ? 'none' : 'pan-y';
      orbit.touches = on
        ? { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE }
        : ({ ONE: undefined, TWO: undefined } as unknown as OrbitControlsImpl['touches']);
      setFocused(on);
    };
    apply(document.activeElement === canvas);
    let start: { x: number; y: number } | null = null;
    const down = (event: PointerEvent) => {
      start = event.pointerType === 'touch' ? { x: event.clientX, y: event.clientY } : null;
      if (event.pointerType !== 'touch') canvas.focus({ preventScroll: true });
    };
    const up = (event: PointerEvent) => {
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8) {
        canvas.focus({ preventScroll: true });
      }
      start = null;
    };
    const onFocus = () => apply(true);
    const onBlur = () => apply(false);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('focus', onFocus);
    canvas.addEventListener('blur', onBlur);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('focus', onFocus);
      canvas.removeEventListener('blur', onBlur);
    };
  }, [controls, getState]);

  // Keyboard: the arrow keys turn the view, + and - zoom, as on the playground.
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
      moved.current = true;
      const offset = camera.position.clone().sub(controls.target);
      const s = new Spherical().setFromVector3(offset);
      if (turn) {
        s.theta -= turn[0] * 0.15;
        s.phi = Math.min(POLAR.max, Math.max(POLAR.min, s.phi + turn[1] * 0.1));
      }
      if (zoom) s.radius = Math.min(controls.maxDistance, Math.max(controls.minDistance, s.radius * zoom));
      camera.position.copy(controls.target).add(offset.setFromSpherical(s));
      controls.update();
      invalidate();
    };
    canvas.addEventListener('keydown', onKey);
    return () => canvas.removeEventListener('keydown', onKey);
  }, [camera, controls, gl, invalidate]);

  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      enableZoom={focused}
      enableDamping={!reducedMotion}
      dampingFactor={0.08}
      minPolarAngle={POLAR.min}
      maxPolarAngle={POLAR.max}
      onStart={() => {
        moved.current = true;
      }}
    />
  );
}

/**
 * A maker's model on the page's paper, in the explainers' light, standing on
 * the ground. Rendered on demand: nothing redraws until the reader moves
 * the view.
 */
export default function ModelScene({ robot, label, resetToken, reducedMotion, onDrawn }: ModelSceneProps) {
  const paper = useMemo(() => srgbColor(PLAYGROUND_COLORS.paper), []);
  const [box, setBox] = useState<Box3 | null>(null);
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      flat
      shadows="percentage"
      camera={{ position: [3, 2, 3], fov: 30, near: 0.01, far: 50 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={(state) => {
        const canvas = state.gl.domElement;
        canvas.tabIndex = 0;
        canvas.dataset.brandControlId = 'control:keyboard-region';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', label);
        canvas.addEventListener('webglcontextrestored', () => state.invalidate());
      }}
    >
      <primitive attach="background" object={paper} />
      <StandingModel robot={robot} onPlaced={setBox} />
      {box ? (
        <>
          <Ground box={box} />
          <Lights box={box} />
          <Rig robot={robot} resetToken={resetToken} reducedMotion={reducedMotion} onDrawn={onDrawn} />
        </>
      ) : null}
    </Canvas>
  );
}
