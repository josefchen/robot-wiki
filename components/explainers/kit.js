// Robot Wiki 3D explainer kit.
// One stage (renderer, camera, light, floor) reused by every explainer, plus the shared teaching UI:
// step rail, predict-then-reveal, part card, anchored labels, controls, self-check.
//
// Colour has ONE meaning everywhere (use these, never ad-hoc colours):
//   focus  (blue)    the thing the current step is about
//   fail   (red)     failure, limits, collisions, unreachable
//   ok     (green)   success, safe, holds
//   sense  (yellow)  measurements and sensor readings
//   act    (purple)  forces, pushes, commands, thrust
//   ref    (grey)    references, ghosts, previous states (draw dashed or translucent)
//   clay / dark      neutral structure / motors and electronics
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { smooth } from '../motion/easing';
import { MOTION_LAG, MOTION_TIMING } from '../../lib/motion-tokens';
import { layoutLabels } from './label-layout.js';

export { THREE };
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Each label fades in over half a short beat.
const LABEL_FADE = MOTION_TIMING.beatShort / 2000;
export const css = (n, el = document.documentElement) => getComputedStyle(el).getPropertyValue(n).trim();
// The role tokens are scoped to the explainers root and may be defined through var() or color-mix(),
// which THREE.Color cannot parse, so each one is resolved by the browser on a probe element first.
function readColor(el, name) {
  const probe = document.createElement('span');
  probe.style.cssText = `position:absolute;visibility:hidden;color:var(${name}, rgb(136, 136, 136))`;
  el.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  const out = new THREE.Color();
  const fn = /^color\((srgb|srgb-linear)\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)/.exec(value);
  if (fn) return out.setRGB(+fn[2], +fn[3], +fn[4], fn[1] === 'srgb' ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace);
  const rgb = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/.exec(value);
  if (rgb) return out.setRGB(rgb[1] / 255, rgb[2] / 255, rgb[3] / 255, THREE.SRGBColorSpace);
  return out.setStyle(value);
}
// The vertices of a geometry that reach furthest along 26 directions (the axes, the face diagonals
// and the corners of a cube). They bound its projection far more tightly than the corners of its
// box, which stand well clear of a long part set at an angle. Cached until the positions change.
const SUPPORT_DIRS = [];
for (let x = -1; x <= 1; x += 1) for (let y = -1; y <= 1; y += 1) for (let z = -1; z <= 1; z += 1) if (x || y || z) SUPPORT_DIRS.push([x, y, z]);
function supportPoints(geo) {
  const pos = geo.attributes.position, cached = geo.userData.support;
  const version = pos.isInterleavedBufferAttribute ? pos.data.version : pos.version;
  if (cached && cached.version === version && cached.count === pos.count) return cached.points;
  if (!pos.count) return [];
  const n = SUPPORT_DIRS.length, top = new Float64Array(n).fill(-Infinity), at = new Uint32Array(n);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    for (let k = 0; k < n; k += 1) {
      const [a, b, c] = SUPPORT_DIRS[k], d = a * x + b * y + c * z;
      if (d > top[k]) { top[k] = d; at[k] = i; }
    }
  }
  const points = [...new Set(at)].map((i) => new THREE.Vector3().fromBufferAttribute(pos, i));
  geo.userData.support = { version, count: pos.count, points };
  return points;
}
// Brand annotation hooks supplied by the page (surface and control registry IDs); no-ops by default.
const NO_BRAND = new Proxy({}, { get: () => () => {} });
// Every eased transition uses the site's one motion curve, `smooth` in motion-tokens.json.
export const ease = smooth;
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
// Resolves in a later task, so long setup work can hand the page back between pieces.
export const nextTask = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
// For long setup work: `await breathe()` between pieces hands the page back once 10 ms have passed
// since the last hand-back, so a scene can build without holding the page. The margin leaves room
// for a piece that runs long on a slow device.
export const slicer = () => {
  let slice = performance.now();
  return async () => { if (performance.now() - slice > 10) { await nextTask(); slice = performance.now(); } };
};

const TOKENS = ['clay', 'dark', 'focus', 'fail', 'ok', 'sense', 'act', 'ref', 'ghost', 'ink', 'dim', 'paper'];
// The face each material side casts its shadow with, as three's shadow pass picks it.
const SHADOW_SIDE = { [THREE.FrontSide]: THREE.BackSide, [THREE.BackSide]: THREE.FrontSide, [THREE.DoubleSide]: THREE.DoubleSide };

export class Stage {
  // `canvas` and `context` let the page probe for WebGL itself and hand over the one context it made.
  /** @param {HTMLElement} el @param {{ brand?: object, canvas?: HTMLCanvasElement, context?: WebGL2RenderingContext, paused?: boolean }} [options] */
  constructor(el, { brand = NO_BRAND, canvas, context, paused = false } = {}) {
    this.el = el;
    this.brand = brand;
    this.renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    const c = this.renderer.domElement;
    c.tabIndex = 0;
    c.setAttribute('aria-label', '3D scene. Drag or use the arrow keys to turn it, and + or - to zoom.');
    el.prepend(c);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 16 / 10, 0.01, 200);
    this.controls = new OrbitControls(this.camera, c);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, maxPolarAngle: Math.PI / 2 - 0.03 });
    this._bindKeys(c);
    this._bindTouch(c);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x9a958c, 1.55));
    this.key = new THREE.DirectionalLight(0xffffff, 2.1);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.radius = 5;
    this.key.shadow.bias = -0.0004;
    this.scene.add(this.key, this.key.target);
    const fill = new THREE.DirectionalLight(0xffffff, 0.65);
    fill.position.set(-0.8, 0.5, -0.7);
    this.scene.add(fill);
    this.floorMat = new THREE.ShadowMaterial({ opacity: 0.13 });
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), this.floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.mats = {};
    this.colors = {};
    this._themeFns = new Set();
    this._frameFns = new Set();
    this._labels = new Set();
    // An instance property, so the label check can plant a layout without the clamp and push-apart.
    this.layoutLabels = layoutLabels;
    this._drags = [];
    this._tweens = new Set();
    this.dragging = false;
    this.subject = null;
    // Set by the page while a scene mounts behind its poster: frame callbacks run but nothing draws.
    this.paused = paused;
    this.setScale(1);
    this._makeMats();

    const recolor = () => { this._makeMats(); this._themeFns.forEach((f) => f()); this._dirty = true; };
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    scheme.addEventListener('change', recolor);
    const themeObserver = new MutationObserver(recolor);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(el);
    this.visible = true;
    const viewObserver = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; if (!e.isIntersecting) this._touchOff(); });
    viewObserver.observe(el);
    this._teardown = () => {
      scheme.removeEventListener('change', recolor);
      themeObserver.disconnect(); resizeObserver.disconnect(); viewObserver.disconnect();
    };
    this._bindPointer();
    this.resize();
    this._last = performance.now();
    this.time = 0;
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this._last) / 1000); this._last = now;
      if (!this.visible) return;
      this.time += dt;
      for (const tw of [...this._tweens]) tw(dt);
      for (const f of [...this._frameFns]) f(dt, this.time);
      if (this.paused) return;
      const orbiting = this.controls.update();
      // Render on demand: draw only when something the reader can see has changed.
      const overlays = this._overlaySig();
      if (this._dirty || orbiting || this._changed()) {
        this._dirty = false;
        this.renderer.render(this.scene, this.camera);
        this._placeLabels();
      } else if (this._labelsDirty || overlays !== this._lastOverlays) this._placeLabels();
      this._labelsDirty = false; this._lastOverlays = overlays;
    };
    this._dirty = true;
    this._raf = requestAnimationFrame(loop);
  }
  // Draw on the next frame even if nothing the stage tracks has changed.
  invalidate() { this._dirty = true; }
  // Compiles every shader the scene will draw with before its first frame, without holding the page.
  // Without KHR_parallel_shader_compile, any call that reads GPU state waits until the queued shader
  // work is done, and a first frame that met every new program at once would stall for a long time.
  // So the compile commands are queued, a fence reports (between tasks) when the GPU has worked
  // through them, and each program's first use then runs in a task of its own. The shadow pass draws
  // with a depth material whose program depends on the object drawn; twins of the shadow casters,
  // compiled into a render target, ask for the same programs.
  async warm() {
    const r = this.renderer, gl = r.getContext();
    const twins = new THREE.Object3D();
    this._depthTwins ??= {};
    this.scene.traverse((o) => {
      if (!o.castShadow || !(o.isMesh || o.isLine || o.isPoints)) return;
      for (const m of [o.material].flat()) {
        const side = m.shadowSide ?? SHADOW_SIDE[m.side];
        const depth = this._depthTwins[side] ??= new THREE.MeshDepthMaterial({ side });
        const twin = o.isInstancedMesh ? new THREE.InstancedMesh(o.geometry, depth, o.count) : new o.constructor(o.geometry, depth);
        if (o.isInstancedMesh) twin.instanceColor = o.instanceColor;
        twins.children.push(twin);
      }
    });
    // Binding the target first keeps its one-time setup ahead of the queued compiles.
    this._warmTarget ??= new THREE.WebGLRenderTarget(1, 1);
    const target = r.getRenderTarget();
    r.setRenderTarget(this._warmTarget);
    r.compile(twins, this.camera, this.scene);
    r.setRenderTarget(target);
    r.compile(this.scene, this.camera);
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    for (let i = 0; sync && i < 300 && gl.getSyncParameter(sync, gl.SYNC_STATUS) !== gl.SIGNALED; i++) await nextTask(10);
    if (sync) gl.deleteSync(sync);
    for (const program of [...r.info.programs]) {
      const t = performance.now();
      program.getUniforms();
      if (performance.now() - t > 2) await nextTask();
    }
  }
  // Everything the renderer draws, as numbers: transforms, visibility, materials and their uniforms, and
  // geometry versions. Returns true when it differs from the last frame.
  _changed() {
    let cur = this._sigSpare ?? new Float64Array(4096), n = 0;
    const push = (x) => { if (n === cur.length) { const g = new Float64Array(n * 2); g.set(cur); cur = g; } cur[n++] = +x || 0; };
    const pushAll = (a) => { for (let i = 0; i < a.length; i++) push(a[i]); };
    const pushValue = (v) => { if (typeof v === 'number' || typeof v === 'boolean') push(v); else if (v?.isVector2 || v?.isVector3 || v?.isVector4 || v?.isColor || v?.isMatrix4) pushAll(v.toArray()); };
    this.scene.updateMatrixWorld();
    this.camera.updateMatrixWorld();
    pushAll(this.camera.matrixWorld.elements); pushAll(this.camera.projectionMatrix.elements);
    const visit = (o) => {
      push(o.id); push(o.visible);
      if (!o.visible) return;
      pushAll(o.matrixWorld.elements);
      if (o.isLight) { push(o.intensity); pushAll(o.color.toArray()); }
      const g = o.geometry;
      if (g) {
        push(g.id); push(g.drawRange.start); push(g.drawRange.count);
        for (const k in g.attributes) push(g.attributes[k].version);
        if (g.index) push(g.index.version);
      }
      if (o.isInstancedMesh) { push(o.count); push(o.instanceMatrix.version); if (o.instanceColor) push(o.instanceColor.version); }
      if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        push(m.id); push(m.version); push(m.opacity); push(m.visible);
        if (m.color) pushAll(m.color.toArray());
        const u = m.uniforms ?? m.userData.uniforms;
        if (u) for (const k in u) pushValue(u[k].value);
      }
      for (const c of o.children) visit(c);
    };
    visit(this.scene);
    const prev = this._sigLast;
    let same = !!prev && prev.n === n;
    for (let i = 0; same && i < n; i++) same = prev.a[i] === cur[i];
    this._sigSpare = prev?.a;
    this._sigLast = { a: cur, n };
    return !same;
  }
  _overlaySig() {
    let s = '';
    for (const o of (this.el.parentElement ?? this.el).querySelectorAll('[data-stage-overlay]')) s += `${o.hidden ? 0 : 1}${o.textContent.length},`;
    return s;
  }

  // Release the frame loop, observers and GPU context when the page unmounts the stage.
  dispose() {
    cancelAnimationFrame(this._raf);
    this._teardown();
    this.clear();
    this.controls.dispose();
    this._warmTarget?.dispose();
    for (const m of Object.values(this._depthTwins ?? {})) m.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  // Scenes are authored in metres. Call setScale(size) with the scene's rough size so lights and shadows fit.
  setScale(size) {
    this.size = size;
    this.key.position.set(0.9 * size, 2.0 * size, 0.8 * size);
    const s = this.key.shadow.camera;
    Object.assign(s, { left: -1.4 * size, right: 1.4 * size, top: 1.4 * size, bottom: -1.4 * size, near: 0.05 * size, far: 6 * size });
    s.updateProjectionMatrix();
    this.controls.minDistance = 0.25 * size;
    this.controls.maxDistance = 6 * size;
  }

  _makeMats() {
    for (const t of TOKENS) this.colors[t] = readColor(this.el, `--${t}`);
    const std = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c.clone(), roughness: 0.8, metalness: 0, ...extra });
    const m = this.mats;
    const set = (k, mat) => { if (m[k]) { m[k].color.copy(mat.color); m[k].opacity = mat.opacity; mat.dispose(); } else m[k] = mat; };
    set('clay', std(this.colors.clay));
    set('dark', std(this.colors.dark));
    for (const k of ['focus', 'fail', 'ok', 'sense', 'act']) set(k, std(this.colors[k], { roughness: 0.6 }));
    set('ref', std(this.colors.ref, { transparent: true, opacity: 0.35, depthWrite: false }));
    set('ghost', std(this.colors.ghost, { transparent: true, opacity: 0.18, depthWrite: false }));
    set('glass', std(this.colors.focus, { transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
    // Flat-shaded twins for simplified meshes that carry no normals (the SO-101 parts).
    m.flat = m.flat || {};
    for (const k of ['clay', 'dark', 'focus', 'fail', 'ok', 'sense', 'act', 'ref', 'ghost']) {
      const src = m[k];
      if (m.flat[k]) { m.flat[k].color.copy(src.color); m.flat[k].opacity = src.opacity; }
      else { m.flat[k] = src.clone(); m.flat[k].flatShading = true; }
    }
    this.floorMat.opacity = parseFloat(css('--shadow', this.el)) || 0.13;
  }
  // A translucent or solid material in a role colour, kept in sync with the theme.
  material(role, { opacity = 1, flat = false } = {}) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0, flatShading: flat, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, side: opacity < 1 ? THREE.DoubleSide : THREE.FrontSide });
    const apply = () => mat.color.copy(this.colors[role] || this.colors.clay);
    apply(); this._themeFns.add(apply);
    return mat;
  }
  lineMaterial(role, { dashed = false, opacity = 1 } = {}) {
    const mat = dashed ? new THREE.LineDashedMaterial({ dashSize: 0.012 * this.size, gapSize: 0.01 * this.size, transparent: opacity < 1, opacity })
      : new THREE.LineBasicMaterial({ transparent: opacity < 1, opacity });
    const apply = () => mat.color.copy(this.colors[role] || this.colors.ink);
    apply(); this._themeFns.add(apply);
    return mat;
  }
  onTheme(fn) { this._themeFns.add(fn); return () => this._themeFns.delete(fn); }
  onFrame(fn) { this._frameFns.add(fn); return () => this._frameFns.delete(fn); }

  resize() {
    const w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    this._dirty = true;
    this.renderer.setSize(w, h, false);
    // Keep the horizontal field of view of a 16:10 stage at 30° vertical, so scenes framed on desktop
    // stay fully in view on narrow (portrait) phone stages.
    const aspect = w / h, hHalf = Math.atan(Math.tan((15 * Math.PI) / 180) * 1.6);
    this.camera.fov = Math.max(30, (2 * Math.atan(Math.tan(hHalf) / aspect) * 180) / Math.PI);
    this.camera.aspect = aspect; this.camera.updateProjectionMatrix();
  }

  // True while a camera move or another eased transition is running.
  get moving() { return this._tweens.size > 0; }
  // Animate any value over time with the shared easing (or `curve`). Returns a promise.
  tween(duration, fn, curve = ease) {
    return new Promise((resolve) => {
      if (reduceMotion || duration <= 0) { fn(1); resolve(); return; }
      let t = 0;
      const step = (dt) => { t = Math.min(1, t + dt / duration); fn(curve(t)); if (t >= 1) { this._tweens.delete(step); resolve(); } };
      step.stop = () => { this._tweens.delete(step); resolve(); };
      this._tweens.add(step);
      this._lastTween = step;
    });
  }
  // A motion the scene drives frame by frame, such as a simulated flight, counts as moving until the
  // returned release is called, so the step settles on its end state.
  hold() {
    const step = () => {};
    this._tweens.add(step);
    return () => { this._tweens.delete(step); };
  }
  // Choreography: ease the camera to look at `target` from `position` (arrays or Vector3). A new
  // move, or a new step (stopCamera), ends the one before, so two moves never pull against each other.
  view(target, position, duration = 1.1) {
    const T = new THREE.Vector3(...(target.isVector3 ? target.toArray() : target));
    const P = new THREE.Vector3(...(position.isVector3 ? position.toArray() : position));
    const t0 = this.controls.target.clone(), p0 = this.camera.position.clone();
    this.stopCamera();
    this._lastTween = null;
    const move = this.tween(duration, (k) => { this.controls.target.lerpVectors(t0, T, k); this.camera.position.lerpVectors(p0, P, k); });
    this._cameraTween = this._lastTween;
    return move;
  }
  stopCamera() { this._cameraTween?.stop(); this._cameraTween = null; }
  // Name what the current step is about: objects, world points ([x, y, z] or Vector3), or functions
  // that return either, read when needed. The camera must land with it on the stage, and the test
  // hook reads its projected box (subjectBox).
  focus(...subject) { this.subject = subject; return this; }
  // World points that bound the subject: the outermost vertices of each visible mesh, or the points given.
  _subjectPoints(subject = this.subject ?? []) {
    const out = [];
    for (const s of subject) {
      if (typeof s === 'function') { out.push(...this._subjectPoints([s()].flat())); continue; }
      if (!s?.isObject3D) { out.push(s.isVector3 ? s.clone() : new THREE.Vector3(...s)); continue; }
      s.updateWorldMatrix(true, true);
      s.traverseVisible((o) => {
        if (!(o.isMesh || o.isLine || o.isPoints) || !o.geometry?.attributes.position) return;
        if (o.isInstancedMesh) {
          o.computeBoundingBox();
          const { min, max } = o.boundingBox;
          for (let i = 0; i < 8; i += 1) out.push(new THREE.Vector3(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).applyMatrix4(o.matrixWorld));
        } else for (const p of supportPoints(o.geometry)) out.push(p.clone().applyMatrix4(o.matrixWorld));
      });
    }
    return out;
  }
  // Choreography: ease the camera, looking along `dir`, until the subject (as for focus) spans
  // `margin` of the view from its centre and sits centred, and make it the step's subject.
  fit(subject, dir, { margin = 0.72, duration = 1.1 } = {}) {
    this.focus(...subject);
    const pts = this._subjectPoints();
    const D = new THREE.Vector3(...(dir.isVector3 ? dir.toArray() : dir)).normalize();
    const cam = this.camera.clone(), v = new THREE.Vector3();
    const T = new THREE.Box3().setFromPoints(pts).getCenter(new THREE.Vector3());
    const place = (d) => { cam.position.copy(T).addScaledVector(D, d); cam.lookAt(T); cam.updateMatrixWorld(); };
    const extent = (d) => {
      place(d); let m = 0;
      for (const p of pts) { v.copy(p).project(cam); if (v.z > 1) return Infinity; m = Math.max(m, Math.abs(v.x), Math.abs(v.y)); }
      return m;
    };
    let d = this.size;
    // Distance by bisection, then re-centre on the projected box; a few passes settle both.
    for (let pass = 0; pass < 3; pass += 1) {
      let lo = 0.01 * this.size, hi = 40 * this.size;
      for (let i = 0; i < 40; i += 1) { const mid = (lo + hi) / 2; if (extent(mid) > margin) lo = mid; else hi = mid; }
      d = hi; place(d);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of pts) { v.copy(p).project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      const halfH = Math.tan((cam.fov * Math.PI) / 360) * d, halfW = halfH * cam.aspect;
      T.addScaledVector(v.setFromMatrixColumn(cam.matrixWorld, 0), ((x0 + x1) / 2) * halfW);
      T.addScaledVector(v.setFromMatrixColumn(cam.matrixWorld, 1), ((y0 + y1) / 2) * halfH);
    }
    return this.view(T, T.clone().addScaledVector(D, d), duration);
  }
  // The step subject's projected box in stage pixels at the current camera, or null without one.
  subjectBox() {
    const pts = this._subjectPoints();
    if (!pts.length) return null;
    const w = this.el.clientWidth, h = this.el.clientHeight, v = new THREE.Vector3();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) {
      v.copy(p).project(this.camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  // Keep the current viewing direction, move to frame `target` at `distance`.
  focusOn(target, distance, duration = 0.9) {
    const T = target.isVector3 ? target.clone() : new THREE.Vector3(...target);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    return this.view(T, T.clone().addScaledVector(dir, distance), duration);
  }

  // Pointer: picking and dragging. Orbit is disabled while an object is dragged.
  // OrbitControls' own arrow keys pan, and panning is off, so the keys are bound here:
  // arrows turn the view and + or - zoom.
  _bindKeys(c) {
    const TURN = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const ZOOM = { '+': 0.85, '=': 0.85, '-': 1.18, _: 1.18 };
    c.addEventListener('keydown', (e) => {
      const turn = TURN[e.key], zoom = ZOOM[e.key];
      if ((!turn && !zoom) || !this.controls.enabled || e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      const { target, minDistance, maxDistance, minPolarAngle, maxPolarAngle } = this.controls;
      const off = this.camera.position.clone().sub(target), s = new THREE.Spherical().setFromVector3(off);
      if (turn) { s.theta -= turn[0] * 0.15; s.phi = clamp(s.phi + turn[1] * 0.1, Math.max(0.05, minPolarAngle), maxPolarAngle); }
      if (zoom) s.radius = clamp(s.radius * zoom, minDistance, maxDistance);
      this.camera.position.copy(target).add(off.setFromSpherical(s));
      this.controls.update();
    });
  }
  // On touch the page keeps its scrolling until the reader taps the stage. After that tap one finger
  // turns the view and two fingers zoom, until the stage leaves the screen.
  _bindTouch(c) {
    const set = (on) => {
      this.touchActive = on;
      c.style.touchAction = on ? 'none' : 'pan-y';
      this.controls.touches = on ? { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN } : { ONE: null, TWO: null };
      this.el.toggleAttribute('data-touch-active', on);
    };
    set(false);
    this._touchOff = () => { if (this.touchActive) set(false); };
    let start = null;
    c.addEventListener('pointerdown', (e) => { start = e.pointerType === 'touch' ? { x: e.clientX, y: e.clientY } : null; });
    c.addEventListener('pointerup', (e) => {
      if (start && e.pointerType === 'touch' && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 8) set(true);
      start = null;
    });
  }
  _bindPointer() {
    const c = this.renderer.domElement;
    this.ray = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    this._clickFns = new Set();
    let down = null, active = null;
    const toNdc = (e) => { const r = c.getBoundingClientRect(); this._ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); this.ray.setFromCamera(this._ndc, this.camera); };
    c.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY };
      toNdc(e);
      for (const d of this._drags) {
        if (!d.enabled) continue;
        const hit = this.ray.intersectObject(d.handle, true)[0];
        if (hit) {
          active = d; this.dragging = true; this.controls.enabled = false;
          const n = d.plane === 'vertical' ? this.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize().negate() : new THREE.Vector3(0, 1, 0);
          d._plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, d.object.getWorldPosition(new THREE.Vector3()));
          d._offset = d.object.getWorldPosition(new THREE.Vector3()).sub(this.ray.ray.intersectPlane(d._plane, new THREE.Vector3()) || hit.point);
          c.setPointerCapture(e.pointerId); d.onStart?.();
          break;
        }
      }
    });
    c.addEventListener('pointermove', (e) => {
      toNdc(e);
      if (active) {
        const p = this.ray.ray.intersectPlane(active._plane, new THREE.Vector3());
        if (p) { p.add(active._offset); const q = active.constrain ? active.constrain(p) : p; active.onMove(q); }
        return;
      }
      if (!e.buttons) {
        const over = this._drags.some((d) => d.enabled && this.ray.intersectObject(d.handle, true).length);
        c.style.cursor = over ? 'grab' : (this._hoverPick?.(this.ray) ? 'pointer' : 'default');
      }
    });
    const up = (e) => {
      if (active) { active.onEnd?.(); active = null; this.dragging = false; this.controls.enabled = true; return; }
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) { toNdc(e); this._clickFns.forEach((f) => f(this.ray)); }
      down = null;
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', () => { active = null; this.dragging = false; this.controls.enabled = true; });
  }
  // Make `object` draggable. `handle` is what the pointer must hit (defaults to object).
  // plane: 'horizontal' (move on the floor plane) or 'vertical' (move in the plane facing the camera).
  draggable(object, { handle = object, plane = 'horizontal', onMove, onStart, onEnd, constrain } = {}) {
    const d = { object, handle, plane, onMove: onMove || ((p) => object.position.copy(object.parent.worldToLocal(p))), onStart, onEnd, constrain, enabled: true };
    this._drags.push(d);
    return { enable: (v = true) => { d.enabled = v; }, remove: () => { this._drags = this._drags.filter((x) => x !== d); } };
  }
  onClick(fn) { this._clickFns.add(fn); return () => this._clickFns.delete(fn); }
  hoverPick(fn) { this._hoverPick = fn; }

  // Plain-language label anchored to a 3D point. tone: 'plain' | 'focus' | 'fail' | 'ok' | 'sense' | 'act'.
  // The stage places every label each frame (label-layout.js); scenes only say what to label and where.
  label(text, at, { tone = 'plain' } = {}) {
    const el = document.createElement('div');
    el.className = `tag tone-${tone}`;
    el.textContent = text;
    this.brand.surface(el);
    const leader = document.createElement('div');
    leader.className = 'tag-leader';
    leader.setAttribute('aria-hidden', 'true');
    this.el.append(leader, el);
    const dirty = () => { this._labelsDirty = true; return L; };
    const L = { el, leader, at, hidden: false,
      set: (t) => { el.textContent = t; return dirty(); },
      tone: (t) => { el.className = `tag tone-${t}`; return dirty(); },
      show: (v = true) => {
        if (v === !L.hidden) return dirty();
        L.hidden = !v;
        L.fading = null;
        if (v) this._fadeIn(L);
        else el.style.opacity = leader.style.opacity = '0';
        return dirty();
      },
      remove: () => { el.remove(); leader.remove(); this._labels.delete(L); dirty(); } };
    this._labels.add(L);
    return dirty();
  }
  // Labels shown in the same moment come in one after another, in the order the scene shows them,
  // so a step that adds several never reveals them all at once.
  _fadeIn(L) {
    if (!this._labelBatch) {
      this._labelBatch = { n: 0 };
      queueMicrotask(() => { this._labelBatch = null; });
    }
    const wait = this._labelBatch.n++ * LABEL_FADE, total = wait + LABEL_FADE, token = (L.fading = {});
    const set = (o) => { if (L.fading === token) L.el.style.opacity = L.leader.style.opacity = String(o); };
    set(0);
    return this.tween(total, (k) => set(ease(clamp((k * total - wait) / LABEL_FADE, 0, 1))), (t) => t);
  }
  // Overlays drawn over the stage (the interaction prompt, the part card) that labels keep clear of.
  _overlays() {
    const frame = this.el.getBoundingClientRect(), out = [];
    for (const o of (this.el.parentElement ?? this.el).querySelectorAll('[data-stage-overlay]')) {
      if (o.hidden || !o.textContent.trim()) continue;
      const r = o.getBoundingClientRect();
      if (!r.width || r.right <= frame.left || r.left >= frame.right || r.bottom <= frame.top || r.top >= frame.bottom) continue;
      out.push({ x: r.left - frame.left, y: r.top - frame.top, w: r.width, h: r.height });
    }
    return out;
  }
  _placeLabels() {
    const width = this.el.clientWidth, height = this.el.clientHeight;
    const v = new THREE.Vector3(), live = [], items = [];
    for (const L of this._labels) {
      const p = typeof L.at === 'function' ? L.at() : L.at;
      const off = !p || v.copy(p).project(this.camera).z > 1;
      L.el.style.display = L.leader.style.display = off ? 'none' : '';
      if (off || L.hidden) continue;
      live.push(L);
      items.push({ ax: (v.x * 0.5 + 0.5) * width, ay: (-v.y * 0.5 + 0.5) * height, w: L.el.offsetWidth, h: L.el.offsetHeight });
    }
    if (!live.length) return;
    const placed = this.layoutLabels(items, { width, height, obstacles: this._overlays() });
    live.forEach((L, i) => {
      const { box, leader } = placed[i];
      L.el.style.transform = `translate(${Math.round(box.x)}px, ${Math.round(box.y)}px)`;
      L.leader.style.visibility = leader ? '' : 'hidden';
      if (!leader) return;
      const dx = leader.x2 - leader.x1, dy = leader.y2 - leader.y1;
      L.leader.style.width = `${Math.hypot(dx, dy)}px`;
      L.leader.style.transform = `translate(${leader.x1}px, ${leader.y1}px) rotate(${Math.atan2(dy, dx)}rad)`;
    });
  }

  // Remove everything an explainer added. Called between explainers.
  clear() {
    for (const c of [...this.world.children]) { this.world.remove(c); c.traverse?.((o) => { o.geometry?.dispose?.(); }); }
    for (const L of [...this._labels]) L.remove();
    this._frameFns.clear(); this._tweens.clear(); this._drags = []; this._clickFns.clear(); this._hoverPick = null;
    this._themeFns.clear();
    this.controls.enabled = true; this.dragging = false; this.subject = null; this.exploded = null;
    this.setScale(1);
    this._dirty = true;
  }
  // Frames drawn so far: the test hook reads it to check that an idle stage stops drawing.
  get frames() { return this.renderer.info.render.frame; }
}

// ---------- Shapes: consistent building blocks ----------
const BOXES = new Map();
export const shapes = {
  // Rounded boxes are slow to build, so each size is built once and every later one is a copy.
  box(w, h, d, r = Math.min(w, h, d) * 0.12) {
    const key = `${w},${h},${d},${r}`;
    if (!BOXES.has(key)) BOXES.set(key, new RoundedBoxGeometry(w, h, d, 3, r));
    return new THREE.BufferGeometry().copy(BOXES.get(key));
  },
  capsule(radius, length) { return new THREE.CapsuleGeometry(radius, length, 6, 16); },
  cylinder(r, h, seg = 32) { return new THREE.CylinderGeometry(r, r, h, seg); },
  sphere(r, seg = 32) { return new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)); },
  mesh(geo, mat, { cast = true, receive = true } = {}) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = receive; return m; },
  // An arrow from `from` along `dir` (Vector3), length in metres; returns a Group with set(from, dir, length).
  arrow(stage, role = 'act', radius = 0.006) {
    const g = new THREE.Group();
    const mat = stage.material(role);
    const shaft = shapes.mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), mat, { receive: false });
    const head = shapes.mesh(new THREE.ConeGeometry(radius * 2.6, radius * 6, 16), mat, { receive: false });
    g.add(shaft, head);
    g.set = (from, dir, length) => {
      const L = Math.max(length, radius * 7);
      g.position.copy(from);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      shaft.scale.set(1, L - radius * 6, 1); shaft.position.y = (L - radius * 6) / 2;
      head.position.y = L - radius * 3;
      g.visible = length > 1e-4;
      return g;
    };
    return g;
  },
  // A filled polygon lying on the floor (points: [[x,z],...]), slightly above y=0.
  floorPolygon(stage, points, role = 'focus', opacity = 0.22) {
    const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ShapeGeometry(shape);
    const m = new THREE.Mesh(geo, stage.material(role, { opacity }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.0015 * stage.size; m.renderOrder = 2;
    m.update = (pts) => { m.geometry.dispose(); m.geometry = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)))); };
    return m;
  },
  line(stage, points, role = 'ink', { dashed = false, opacity = 1 } = {}) {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const l = new THREE.Line(geo, stage.lineMaterial(role, { dashed, opacity }));
    if (dashed) l.computeLineDistances();
    l.update = (pts) => { l.geometry.dispose(); l.geometry = new THREE.BufferGeometry().setFromPoints(pts); if (dashed) l.computeLineDistances(); };
    return l;
  },
  points(stage, positions, role = 'sense', size = 0.006) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ size, sizeAttenuation: true });
    const apply = () => mat.color.copy(stage.colors[role]); apply(); stage.onTheme(apply);
    return new THREE.Points(geo, mat);
  },
};

// ---------- Teaching UI ----------
// The page provides these elements; scenes only call the methods.
export class TeachUI {
  constructor(root, { brand = NO_BRAND } = {}) {
    this.root = root;
    this.brand = brand;
    this.$ = (s) => root.querySelector(s);
    this.controlsEl = this.$('[data-controls]');
    this.readoutEl = this.$('[data-readout]');
    this.predictEl = this.$('[data-predict]');
    this.cardEl = this.$('[data-card]');
    this.stepsEl = this.$('[data-steps]');
    this.stepTextEl = this.$('[data-step-text]');
    this.prevBtn = this.$('[data-prev]');
    this.nextBtn = this.$('[data-next]');
    this.hintEl = this.$('[data-hint]');
  }
  reset() {
    this.controlsEl.replaceChildren(); this.readoutEl.textContent = ''; this.readoutEl.hidden = true;
    this.predictEl.replaceChildren(); this.predictEl.hidden = true; this.card(null); this.hint(''); this.parts(null);
  }
  // The parts of an exploded model as a folded list of buttons: the keyboard and screen-reader way to
  // pick a part while the step lets the reader tap one. parts(null) removes it.
  parts(list, onPick, isPicked = () => false) {
    const el = this.$('[data-parts]');
    if (!el) return;
    el.replaceChildren();
    el.hidden = !list;
    if (!list) return;
    const fold = document.createElement('details'), summary = document.createElement('summary'), ol = document.createElement('ol');
    summary.textContent = 'List the parts';
    this.brand.secondary(summary);
    const buttons = list.map((p) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'part'; b.textContent = p.listName ?? p.name;
      this.brand.selection(b);
      b.addEventListener('click', () => { onPick(p); sync(); });
      const li = document.createElement('li'); li.append(b); ol.append(li);
      return b;
    });
    const sync = () => buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(isPicked(list[i]))));
    sync();
    fold.addEventListener('toggle', sync);
    fold.append(summary, ol); el.append(fold);
  }
  hint(text) { this.hintEl.textContent = text || ''; this.hintEl.hidden = !text; }
  readout(html) { this.readoutEl.innerHTML = html || ''; this.readoutEl.hidden = !html; }
  card(info) {
    if (!info) { this.cardEl.hidden = true; return; }
    this.cardEl.hidden = false;
    this.cardEl.innerHTML = `${info.kind ? `<span class="k">${info.kind}</span>` : ''}<span class="name">${info.name}</span>${info.role ? `<span class="role">${info.role}</span>` : ''}${info.spec ? `<span class="spec">${info.spec}</span>` : ''}${info.src ? `<span class="src">Source: ${info.src}</span>` : ''}`;
  }
  _group(label) {
    const g = document.createElement('div'); g.className = 'ctl';
    if (label) { const l = document.createElement('span'); l.className = 'ctl-label'; l.textContent = label; g.append(l); }
    this.controlsEl.append(g); return g;
  }
  // A plain slider with named ends.
  slider({ label, min = 0, max = 1, step = 0.01, value = 0, left = '', right = '', onInput }) {
    const g = this._group(label); g.classList.add('ctl-slider');
    const id = `s${Math.random().toString(36).slice(2, 8)}`;
    g.insertAdjacentHTML('beforeend', `<span class="end">${left}</span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${label || left + ' to ' + right}"><span class="end">${right}</span>`);
    const input = g.querySelector('input');
    this.brand.input(input);
    input.addEventListener('input', () => onInput?.(parseFloat(input.value)));
    return { el: g, input, set: (v) => { input.value = v; }, show: (v = true) => { g.hidden = !v; } };
  }
  // Segmented choice: options [{id, label}].
  choice({ label, options, value, onChange }) {
    const g = this._group(label); g.classList.add('ctl-choice');
    // One outer frame holds the segments; the label stays outside it.
    const frame = document.createElement('div'); frame.className = 'seg-frame'; frame.setAttribute('role', 'group');
    if (label) frame.setAttribute('aria-label', label.replace(/[,:]\s*$/, ''));
    this.brand.segmented(frame); g.append(frame);
    const btns = options.map((o) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'seg'; b.textContent = o.label; b.dataset.id = o.id;
      this.brand.selection(b);
      b.addEventListener('click', () => { set(o.id); onChange?.(o.id); }); frame.append(b); return b;
    });
    const set = (id) => btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    set(value);
    return { el: g, set, show: (v = true) => { g.hidden = !v; } };
  }
  button(label, onClick) {
    const g = this._group(); const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = label;
    this.brand.secondary(b);
    b.addEventListener('click', onClick); g.append(b);
    return { el: g, btn: b, set: (t) => { b.textContent = t; }, show: (v = true) => { g.hidden = !v; } };
  }
  // Predict, then reveal. Resolves with the chosen option id. options: [{id, label}], answer: id, explain: string.
  predict({ question, options, answer, explain }) {
    return new Promise((resolve) => {
      const el = this.predictEl; el.hidden = false;
      el.innerHTML = `<span class="k">Guess first</span><p class="q">${question}</p><div class="opts"></div><p class="explain" hidden></p>`;
      const opts = el.querySelector('.opts'), ex = el.querySelector('.explain');
      // Words rather than tick and cross marks, which first-time readers do not always read as right and wrong.
      const verdict = (b, text) => { const s = document.createElement('span'); s.className = 'verdict'; s.textContent = ` (${text})`; b.append(s); };
      const finish = (id) => {
        opts.querySelectorAll('button').forEach((b) => {
          b.disabled = true;
          if (b.dataset.id === answer) { b.classList.add('right'); verdict(b, id === answer ? 'your guess: right' : 'right answer'); }
          if (b.dataset.id === id && id !== answer) { b.classList.add('wrong'); verdict(b, 'your guess'); }
        });
        ex.hidden = false;
        ex.textContent = (id === answer ? 'Right. ' : id ? 'Not quite. ' : '') + explain;
        this._pending = null; resolve(id);
      };
      for (const o of options) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = o.label; b.dataset.id = o.id;
        this.brand.secondary(b);
        b.addEventListener('click', () => finish(o.id)); opts.append(b);
      }
      this._pending = () => finish(null); // Next without guessing reveals the answer.
    });
  }
}

// ---------- Exploded model: the anatomy pattern ----------
// parts: [{ id, kind, name, listName?, role, spec, src, objects: [Object3D], dir?: Vector3 (world), dist?: number }],
// listed in the order they come apart; animateExplode puts them back together in reverse.
// Explode vectors default to radial from the model's centre. Call setExplode(0..1), select(part|null).
export class ExplodedModel {
  constructor(stage, root, parts, { radial = 0.9, flat = false } = {}) {
    this.stage = stage; this.root = root; this.parts = parts; this.selected = null;
    stage.exploded = this;
    this.mats = flat ? stage.mats.flat : stage.mats;
    stage.world.updateMatrixWorld(true);
    const centre = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
    for (const p of parts) {
      p.objects.forEach((o) => { o.userData.part = p; o.traverse((m) => { if (m.isMesh) { m.userData.part = p; m.userData.base = m.userData.base || m.material; } }); });
      p.items = p.objects.map((o) => {
        const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
        const world = p.dir ? p.dir.clone().normalize().multiplyScalar(p.dist ?? 0.1) : c.clone().sub(centre).multiplyScalar(radial);
        const inv = o.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
        return { o, base: o.position.clone(), delta: world.applyQuaternion(inv) };
      });
    }
    this.explode = 0;
    stage.hoverPick((ray) => this.pick(ray));
  }
  _place(p, t) { p.t = t; for (const it of p.items) it.o.position.copy(it.base).addScaledVector(it.delta, t); }
  setExplode(t) { this.explode = t; for (const p of this.parts) this._place(p, t); }
  // A lagged start (the lag token): each moving part eases over `duration`, a fixed lag after the one before.
  animateExplode(to, duration = 0.9) {
    const from = this.explode;
    const moving = this.parts.filter((p) => p.items.some((it) => it.delta.lengthSq() > 1e-12));
    if (to < from) moving.reverse();
    const n = moving.length, lag = n >= MOTION_LAG.denseThreshold ? MOTION_LAG.dense : MOTION_LAG.default;
    const total = duration * (1 + lag * Math.max(n - 1, 0));
    return this.stage.tween(total, (k) => {
      moving.forEach((p, i) => this._place(p, lerp(from, to, ease(clamp((k * total - i * lag * duration) / duration, 0, 1)))));
      this.explode = lerp(from, to, k);
      if (k >= 1) this.setExplode(to);
    }, (t) => t);
  }
  // What the test hook reads: each part's explode amount, in list order.
  state() { return this.parts.map((p) => ({ id: p.id, name: p.listName ?? p.name, explode: Number((p.t ?? this.explode).toFixed(3)) })); }
  center(p) { const b = new THREE.Box3(); p.objects.forEach((o) => b.expandByObject(o)); return b.getCenter(new THREE.Vector3()); }
  pick(ray) { const hit = ray.intersectObject(this.root, true).find((h) => h.object.userData.part); return hit?.object.userData.part || null; }
  // Highlight one part (focus) and fade the rest (ghost). Pass null to restore.
  select(p, role = 'focus') {
    this.selected = p;
    this.root.traverse((m) => {
      if (!m.isMesh || !m.userData.part) return;
      m.material = !p ? m.userData.base : (m.userData.part === p ? this.mats[role] : this.mats.ghost);
      m.castShadow = !p || m.userData.part === p;
    });
  }
  // Highlight several parts at once with a role colour. rest: 'ghost' fades the others, 'base' keeps them as they are.
  highlight(list, role = 'focus', { rest = 'base' } = {}) {
    const set = new Set(list);
    this.root.traverse((m) => {
      if (!m.isMesh || !m.userData.part) return;
      m.material = set.has(m.userData.part) ? this.mats[role] : (rest === 'ghost' ? this.mats.ghost : m.userData.base);
    });
  }
}
