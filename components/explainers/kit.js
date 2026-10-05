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
import { layoutLabels } from './label-layout.js';

export { THREE };
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
// Brand annotation hooks supplied by the page (surface and control registry IDs); no-ops by default.
const NO_BRAND = new Proxy({}, { get: () => () => {} });
// ManimGL-style smooth easing: slow start, slow finish.
export const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t * (t * (6 * t - 15) + 10));
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

const TOKENS = ['clay', 'dark', 'focus', 'fail', 'ok', 'sense', 'act', 'ref', 'ghost', 'ink', 'dim', 'paper'];

export class Stage {
  constructor(el, { brand = NO_BRAND } = {}) {
    this.el = el;
    this.brand = brand;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    const c = this.renderer.domElement;
    c.tabIndex = 0;
    c.setAttribute('aria-label', '3D scene. Drag or use the arrow keys to turn it.');
    el.prepend(c);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 16 / 10, 0.01, 200);
    this.controls = new OrbitControls(this.camera, c);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, maxPolarAngle: Math.PI / 2 - 0.03 });
    this.controls.listenToKeyEvents(c);

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
    this.setScale(1);
    this._makeMats();

    const recolor = () => { this._makeMats(); this._themeFns.forEach((f) => f()); };
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    scheme.addEventListener('change', recolor);
    const themeObserver = new MutationObserver(recolor);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(el);
    this.visible = true;
    const viewObserver = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; });
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
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this._placeLabels();
    };
    this._raf = requestAnimationFrame(loop);
  }

  // Release the frame loop, observers and GPU context when the page unmounts the stage.
  dispose() {
    cancelAnimationFrame(this._raf);
    this._teardown();
    this.clear();
    this.controls.dispose();
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
    this.renderer.setSize(w, h, false);
    // Keep the horizontal field of view of a 16:10 stage at 30° vertical, so scenes framed on desktop
    // stay fully in view on narrow (portrait) phone stages.
    const aspect = w / h, hHalf = Math.atan(Math.tan((15 * Math.PI) / 180) * 1.6);
    this.camera.fov = Math.max(30, (2 * Math.atan(Math.tan(hHalf) / aspect) * 180) / Math.PI);
    this.camera.aspect = aspect; this.camera.updateProjectionMatrix();
  }

  // True while a camera move or another eased transition is running.
  get moving() { return this._tweens.size > 0; }
  // Animate any value over time with the shared easing. Returns a promise.
  tween(duration, fn) {
    return new Promise((resolve) => {
      if (reduceMotion || duration <= 0) { fn(1); resolve(); return; }
      let t = 0;
      const step = (dt) => { t = Math.min(1, t + dt / duration); fn(ease(t)); if (t >= 1) { this._tweens.delete(step); resolve(); } };
      this._tweens.add(step);
    });
  }
  // Choreography: ease the camera to look at `target` from `position` (arrays or Vector3).
  view(target, position, duration = 1.1) {
    const T = new THREE.Vector3(...(target.isVector3 ? target.toArray() : target));
    const P = new THREE.Vector3(...(position.isVector3 ? position.toArray() : position));
    const t0 = this.controls.target.clone(), p0 = this.camera.position.clone();
    return this.tween(duration, (k) => { this.controls.target.lerpVectors(t0, T, k); this.camera.position.lerpVectors(p0, P, k); });
  }
  // Keep the current viewing direction, move to frame `target` at `distance`.
  focusOn(target, distance, duration = 0.9) {
    const T = target.isVector3 ? target.clone() : new THREE.Vector3(...target);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    return this.view(T, T.clone().addScaledVector(dir, distance), duration);
  }

  // Pointer: picking and dragging. Orbit is disabled while an object is dragged.
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
    const L = { el, leader, at, hidden: false,
      set: (t) => { el.textContent = t; return L; },
      tone: (t) => { el.className = `tag tone-${t}`; return L; },
      show: (v = true) => { L.hidden = !v; el.style.opacity = leader.style.opacity = v ? '1' : '0'; return L; },
      remove: () => { el.remove(); leader.remove(); this._labels.delete(L); } };
    this._labels.add(L);
    return L;
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
    this.controls.enabled = true; this.dragging = false;
    this.setScale(1);
  }
}

// ---------- Shapes: consistent building blocks ----------
export const shapes = {
  box(w, h, d, r = Math.min(w, h, d) * 0.12) { return new RoundedBoxGeometry(w, h, d, 3, r); },
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
    this.predictEl.replaceChildren(); this.predictEl.hidden = true; this.card(null); this.hint('');
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
      const finish = (id) => {
        opts.querySelectorAll('button').forEach((b) => {
          b.disabled = true;
          if (b.dataset.id === answer) { b.classList.add('right'); b.insertAdjacentHTML('afterbegin', '<span aria-hidden="true">✓ </span>'); }
          if (b.dataset.id === id && id !== answer) { b.classList.add('wrong'); b.insertAdjacentHTML('afterbegin', '<span aria-hidden="true">✗ </span>'); }
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
// parts: [{ id, kind, name, role, spec, src, objects: [Object3D], dir?: Vector3 (world), dist?: number }]
// Explode vectors default to radial from the model's centre. Call setExplode(0..1), select(part|null).
export class ExplodedModel {
  constructor(stage, root, parts, { radial = 0.9, flat = false } = {}) {
    this.stage = stage; this.root = root; this.parts = parts; this.selected = null;
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
  setExplode(t) { this.explode = t; for (const p of this.parts) for (const it of p.items) it.o.position.copy(it.base).addScaledVector(it.delta, t); }
  animateExplode(to, duration = 0.9) { const from = this.explode; return this.stage.tween(duration, (k) => this.setExplode(lerp(from, to, k))); }
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
