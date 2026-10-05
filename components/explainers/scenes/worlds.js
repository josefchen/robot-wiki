// Learn 12: Practising in a thousand worlds. Takeaway: robots practise in thousands of slightly different
// simulated worlds at once, so the real world is just one more variation.
import { THREE, lerp, clamp, ease, reduceMotion } from '../kit.js';
import { Q, makeQuadruped, quadrupedLowPoly, GAIT_GLSL } from '../models/walker.js';
import { EXPLAINER_WORDS } from '../words.ts';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const N = 64, COUNT = N * N, TILE = 2.0, TILE_SIZE = 1.84;
const EP = 5.4, START = -0.56, WALK = 4.0, LEAD = 0.35, PUSH_EVERY = 10; // seconds; pushes every 10 s as in Rudin et al.
const REAL = [3, -2];                                                    // the tile that plays the real world
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fmt = (n) => n.toLocaleString('en-US');

// Frame a box from a direction so it fills, centred, the current viewport. Returns { target, position }.
function frameBox(stage, box, dir, pad = 1.08) {
  const c = box.getCenter(V()), cam = stage.camera.clone(), d0 = dir.clone().normalize();
  const corners = [];
  for (let i = 0; i < 8; i++) corners.push(V(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
  let d = box.getSize(V()).length() * 1.5;
  const vf = THREE.MathUtils.degToRad(cam.fov) / 2, right = V(), up = V();
  cam.near = 0.01; cam.far = 1e5;
  for (let k = 0; k < 10; k++) {
    cam.position.copy(c).addScaledVector(d0, d); cam.lookAt(c); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of corners) { const v = p.clone().project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
    right.setFromMatrixColumn(cam.matrixWorld, 0); up.setFromMatrixColumn(cam.matrixWorld, 1);
    const hh = d * Math.tan(vf), hw = hh * cam.aspect;
    c.addScaledVector(right, ((x0 + x1) / 2) * hw * 0.8).addScaledVector(up, ((y0 + y1) / 2) * hh * 0.8);
    d *= lerp(1, Math.max(x1 - x0, y1 - y0) / 2 * pad, 0.8);
  }
  const y = clamp(c.y, box.min.y, box.max.y);
  if (Math.abs(d0.y) > 1e-3) { const t = (y - c.y) / -d0.y; c.addScaledVector(d0, -t); d += t; }
  return { target: c, position: c.clone().addScaledVector(d0, d), dist: d, dir: d0 };
}

// ---------- shaders: every copy walks, falls, resets and gets shoved on the graphics chip ----------
const ROBOT_HEAD = /* glsl */`
uniform float uTime, uRand, uDim, uReveal, uOthers;
uniform vec3 uClay, uDark, uFail, uPaper;
attribute float aPart, aShade, aFall;
attribute vec2 aCell;
attribute vec4 aSeed, aWorld;
varying vec3 vTint;
${GAIT_GLSL}
const float EP = ${EP.toFixed(2)}, START = ${START.toFixed(2)}, WALK = ${WALK.toFixed(2)}, LEAD = ${LEAD.toFixed(2)};
const float SPEED = ${Q.SPEED.toFixed(3)}, FREQ = ${Q.FREQ.toFixed(3)};
`;
const ROBOT_MAIN = /* glsl */`
vec3 objectNormal = vec3(normal);
#ifdef USE_TANGENT
vec3 objectTangent = vec3(tangent.xyz);
#endif
vec3 qPos = position;
{
  float tl = mod(uTime + aSeed.x, EP);
  float fa = abs(aFall);
  float tw = clamp(min(tl, fa) - LEAD, 0.0, WALK);
  float fall = clamp((tl - fa) / 0.7, 0.0, 1.0);
  fall = fall * fall * (3.0 - 2.0 * fall);
  float xr = START + tw * SPEED;
  float ts = mod(uTime + aSeed.z, ${PUSH_EVERY.toFixed(1)});
  float alive = step(LEAD, tl) * step(tl, EP - 0.4) * (1.0 - step(0.001, fall));
  float push = uRand * smoothstep(0.5, 0.8, ts) * (1.0 - smoothstep(1.0, 2.2, ts)) * alive;
  float side = aFall < 0.0 ? -1.0 : 1.0;
  vec2 shove = vec2(cos(aSeed.w), sin(aSeed.w)) * push;
  float roll = side * fall * 1.45 + shove.y * 0.12;
  float drop = aWorld.y * uRand * 0.045;
  float walking = step(0.001, tw) * step(tw, WALK - 0.001) * (1.0 - step(0.001, fall));
  float ph = tw * FREQ + aSeed.y;
  if (aPart > 0.5) {
    float leg = mod(aPart - 1.0, 4.0);
    float shank = step(4.5, aPart);
    vec2 A = legAngles(leg, ph, Q_HIP_H - drop);
    float ang = mix(A.x, A.y, shank);
    float c = cos(ang), s = sin(ang);
    qPos.xy = vec2(c * qPos.x - s * qPos.y, s * qPos.x + c * qPos.y);
    objectNormal.xy = vec2(c * objectNormal.x - s * objectNormal.y, s * objectNormal.x + c * objectNormal.y);
    qPos.xy += shank * Q_L1 * vec2(sin(A.x), -cos(A.x));
    qPos += vec3(leg < 1.5 ? Q_HIP_X : -Q_HIP_X, Q_HIP_H, mod(leg, 2.0) < 0.5 ? Q_HIP_Z : -Q_HIP_Z);
  }
  qPos.y += walking * 0.01 * cos(ph * 12.5663706) - drop;
  float pz = side * 0.2, cr = cos(roll), sr = sin(roll);
  qPos.z -= pz;
  qPos.yz = vec2(cr * qPos.y - sr * qPos.z, sr * qPos.y + cr * qPos.z);
  qPos.z += pz;
  objectNormal.yz = vec2(cr * objectNormal.y - sr * objectNormal.z, sr * objectNormal.y + cr * objectNormal.z);
  float rev = 1.0 - smoothstep(uReveal, uReveal + 1.0, length(aCell));
  float life = smoothstep(0.0, 0.3, tl) * (1.0 - smoothstep(EP - 0.35, EP - 0.05, tl));
  qPos *= rev * (1.0 - aWorld.z) * life * uOthers;
  qPos.x += xr + shove.x * 0.22;
  qPos.z += shove.y * 0.22;
  vec3 tint = mix(uClay, uDark, aShade);
  tint = mix(tint, uDark, (1.0 - aShade) * aWorld.y * uRand * 0.6);
  tint = mix(tint, uFail, fall * 0.85);
  vTint = mix(tint, uPaper, uDim * 0.72);
}
`;
const TILE_HEAD = /* glsl */`
uniform float uRand, uDim, uReveal;
uniform vec2 uReal;
uniform vec3 uBase, uSlip, uGrip, uPaper;
attribute vec2 aCell;
attribute vec4 aWorld;
varying vec3 vTint;
`;
const TILE_MAIN = /* glsl */`
vec3 transformed = vec3(position);
{
  float rev = 1.0 - smoothstep(uReveal, uReveal + 1.0, length(aCell));
  transformed.xz *= rev;
  vec3 c = mix(uBase, mix(uSlip, uGrip, aWorld.x), uRand);
  float isReal = 1.0 - step(0.5, length(aCell - uReal));
  vTint = mix(c, uPaper, uDim * 0.72 * (1.0 - isReal));
}
`;
const tintFragment = (sh) => {
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', 'diffuseColor.rgb = vTint;');
};

const STEP_TEXT = EXPLAINER_WORDS.worlds.steps;

export default {
  id: 'worlds',
  how: `<ul>
    <li>Anchor: Rudin, Hoeller, Reist and Hutter, <a href="https://arxiv.org/abs/2109.11978" target="_blank" rel="noopener">Learning to Walk in Minutes Using Massively Parallel Deep Reinforcement Learning</a> (CoRL 2021): "The parallel approach allows training policies for flat terrain in under four minutes, and in twenty minutes for uneven terrain." The policy they took to the real ANYmal robot was "trained with 4096 robots", on a single workstation graphics card (an NVIDIA RTX A6000).</li>
    <li>The worlds vary the way that paper's do: "we randomize the friction of the ground, add noise to the observations and randomly push the robots", with ground friction drawn between 0.5 and 1.25 and pushes every 10 seconds. Heavier bodies follow RMA (Kumar et al., <a href="https://arxiv.org/abs/2107.04034" target="_blank" rel="noopener">arXiv 2107.04034</a>), which trains with 0 to 6 kg of extra load on a 12 kg robot.</li>
    <li>Why vary at all: in Peng et al. (<a href="https://arxiv.org/abs/1710.06537" target="_blank" rel="noopener">arXiv 1710.06537</a>), a pushing policy trained without randomised physics succeeded 0 times in 10 on the real robot; the same network trained with randomised physics succeeded 67% of the time (12 trials), and a version with memory 89% (28 trials). The side-by-side in step 4 illustrates that effect; it is not a recording.</li>
    <li>Method: the 4,096 copies are drawn with instancing, in two levels of detail. Each robot's trot, falls, resets and shoves are computed on the graphics chip from one shared clock, with no physics engine. Falls are drawn at random and grow rarer as the scene "trains"; those rates are illustrative. The robot is stylised, with proportions like ANYmal's.</li>
  </ul>`,

  async mount(stage, ui) {
    stage.setScale(2);
    const cam = stage.camera;

    // ---- shared uniforms, colours follow the theme ----
    const U = {
      uTime: { value: 0 }, uOthers: { value: 1 }, uRand: { value: 0 }, uDim: { value: 0 }, uReveal: { value: 0 }, uReal: { value: new THREE.Vector2(...REAL) },
      uClay: { value: new THREE.Color() }, uDark: { value: new THREE.Color() }, uFail: { value: new THREE.Color() }, uPaper: { value: new THREE.Color() },
      uBase: { value: new THREE.Color() }, uSlip: { value: new THREE.Color() }, uGrip: { value: new THREE.Color() },
    };
    const syncColors = () => {
      const C = stage.colors;
      U.uClay.value.copy(C.clay); U.uDark.value.copy(C.dark); U.uFail.value.copy(C.fail); U.uPaper.value.copy(C.paper);
      U.uBase.value.copy(C.paper).lerp(C.dark, 0.28); U.uSlip.value.copy(C.paper).lerp(C.focus, 0.16); U.uGrip.value.copy(C.paper).lerp(C.focus, 0.72);
    };
    syncColors(); stage.onTheme(syncColors);

    // ---- the 4,096 worlds, ordered outward from the first robot's tile ----
    const cells = [];
    for (let i = -32; i < 32; i++) for (let j = -32; j < 32; j++) cells.push([i, j, Math.hypot(i, j), Math.atan2(j, i)]);
    cells.sort((a, b) => a[2] - b[2] || a[3] - b[3]);
    const dists = cells.map((c) => c[2]);
    const within = (r) => { let lo = 0, hi = COUNT; while (lo < hi) { const m = (lo + hi) >> 1; if (dists[m] <= r) lo = m + 1; else hi = m; } return lo; };
    const realIdx = cells.findIndex((c) => c[0] === REAL[0] && c[1] === REAL[1]);
    const tileX = new Float32Array(COUNT), tileZ = new Float32Array(COUNT);
    const aCell = new Float32Array(COUNT * 2), aSeed = new Float32Array(COUNT * 4), aWorld = new Float32Array(COUNT * 4), aFall = new Float32Array(COUNT).fill(99);
    const lastEp = new Int32Array(COUNT).fill(-1);
    cells.forEach(([i, j], k) => {
      tileX[k] = i * TILE; tileZ[k] = j * TILE; aCell[k * 2] = i; aCell[k * 2 + 1] = j;
      aSeed[k * 4] = Math.random() * EP; aSeed[k * 4 + 1] = Math.random(); aSeed[k * 4 + 2] = Math.random() * PUSH_EVERY; aSeed[k * 4 + 3] = Math.random() * Math.PI * 2;
    });
    const shuffle = () => {
      for (let k = 0; k < COUNT; k++) {
        aWorld[k * 4] = Math.random(); aWorld[k * 4 + 1] = Math.random() < 0.55 ? Math.random() * 0.35 : 0.35 + Math.random() * 0.65;
        aSeed[k * 4 + 2] = Math.random() * PUSH_EVERY; aSeed[k * 4 + 3] = Math.random() * Math.PI * 2;
      }
      attrs.forEach((a) => { a.needsUpdate = true; });
    };
    aWorld[2] = 1; // the first robot's own tile is drawn by the detailed model

    // Robots: one instanced mesh, posed in the vertex shader.
    // Two levels of detail share the same per-robot data: the far one when each robot is a few pixels tall.
    const attrs = [];
    const inst = (name, arr, size, dynamic) => { const a = new THREE.InstancedBufferAttribute(arr, size); if (dynamic) a.setUsage(THREE.DynamicDrawUsage); attrs.push(a); return a; };
    const cellAttr = inst('aCell', aCell, 2), seedAttr = inst('aSeed', aSeed, 4), worldAttr = inst('aWorld', aWorld, 4), fallAttr = inst('aFall', aFall, 1, true);
    const robotGeos = [quadrupedLowPoly(), quadrupedLowPoly({ far: true })];
    for (const g of robotGeos) { g.setAttribute('aCell', cellAttr); g.setAttribute('aSeed', seedAttr); g.setAttribute('aWorld', worldAttr); g.setAttribute('aFall', fallAttr); }
    const robotMat = new THREE.MeshLambertMaterial();
    robotMat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${ROBOT_HEAD}`)
        .replace('#include <beginnormal_vertex>', ROBOT_MAIN).replace('#include <begin_vertex>', 'vec3 transformed = qPos;');
      tintFragment(sh);
    };
    robotMat.customProgramCacheKey = () => 'worlds-robot';
    const [robots, robotsFar] = robotGeos.map((g) => new THREE.InstancedMesh(g, robotMat, COUNT));
    const tileGeo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE).rotateX(-Math.PI / 2).translate(0, 0.003, 0);
    tileGeo.setAttribute('aCell', cellAttr); tileGeo.setAttribute('aWorld', worldAttr);
    const tileMat = new THREE.MeshLambertMaterial();
    tileMat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${TILE_HEAD}`).replace('#include <begin_vertex>', TILE_MAIN);
      tintFragment(sh);
    };
    tileMat.customProgramCacheKey = () => 'worlds-tile';
    // The stage redraws only when something it can see changes; these uniforms live outside the materials.
    robotMat.userData.uniforms = tileMat.userData.uniforms = U;
    const tiles = new THREE.InstancedMesh(tileGeo, tileMat, COUNT);
    const m4 = new THREE.Matrix4();
    for (let k = 0; k < COUNT; k++) { m4.makeTranslation(tileX[k], 0, tileZ[k]); robots.setMatrixAt(k, m4); tiles.setMatrixAt(k, m4); }
    robotsFar.instanceMatrix = robots.instanceMatrix;
    for (const m of [robots, robotsFar, tiles]) { m.frustumCulled = false; m.castShadow = false; m.count = 0; }
    tiles.receiveShadow = true; robotsFar.visible = false;
    stage.world.add(tiles, robots, robotsFar);
    shuffle();

    // Shoves: purple arrows, placed on the CPU for the few robots being pushed right now.
    const MAXA = 700;
    const arrowGeo = (() => {
      const shaft = new THREE.CylinderGeometry(0.045, 0.045, 0.45, 8).translate(0, 0.225, 0);
      const head = new THREE.ConeGeometry(0.11, 0.22, 12).translate(0, 0.56, 0);
      const g = new THREE.BufferGeometry();
      const parts = [shaft.toNonIndexed(), head.toNonIndexed()];
      const pos = [], nor = [];
      parts.forEach((p) => { pos.push(...p.attributes.position.array); nor.push(...p.attributes.normal.array); p.dispose(); });
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      shaft.dispose(); head.dispose();
      return g;
    })();
    const arrows = new THREE.InstancedMesh(arrowGeo, stage.material('act'), MAXA);
    arrows.count = 0; arrows.frustumCulled = false; arrows.castShadow = false;
    stage.world.add(arrows);

    // The first robot, in detail, and the two robots on the real-world tile.
    const hero = { q: makeQuadruped(stage), t: 0, ep: -1, fa: 99, side: 1, ph0: 0.15, script: null, tries: 0 };
    stage.world.add(hero.q.root);
    const realC = V(REAL[0] * TILE, 0, REAL[1] * TILE);
    const one = makeQuadruped(stage), many = makeQuadruped(stage);
    stage.world.add(one.root, many.root);
    one.root.visible = many.root.visible = false;
    const frame = new THREE.Group();
    { const mat = stage.material('focus'), s = TILE_SIZE / 2 + 0.03;
      for (const [x, z, w, d] of [[0, s, 2 * s + 0.06, 0.06], [0, -s, 2 * s + 0.06, 0.06], [s, 0, 0.06, 2 * s], [-s, 0, 0.06, 2 * s]]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), mat); b.position.set(x, 0.006, z); frame.add(b);
      } }
    frame.position.copy(realC); frame.visible = false; stage.world.add(frame);

    // Pose a detailed robot from its episode clock (same rules as the shader).
    const poseRobot = (q, base, tl, fa, side, ph0, { heavy = 0, slip = 0, lane = 0, ep = EP } = {}) => {
      const tw = clamp(Math.min(tl, fa) - LEAD, 0, WALK);
      const fall = smooth(0, 1, (tl - fa) / 0.7);
      const walking = tw > 0.001 && tw < WALK - 0.001 && fall === 0;
      const ph = tw * Q.FREQ + ph0;
      q.pose({ ph, drop: heavy * 0.045, bob: walking ? 0.01 * Math.cos(ph * Math.PI * 4) : 0, roll: side * fall * 1.45, side, heavy, fail: fall });
      const wob = slip * Math.sin(tl * 19) * smooth(fa - 0.6, fa, tl) * (1 - fall);
      q.root.position.set(base.x + START + tw * Q.SPEED, 0, base.z + lane + wob * 0.05);
      q.root.rotation.y = wob * 0.22;
      q.root.scale.setScalar(Math.max(1e-3, smooth(0, 0.3, tl) * (1 - smooth(ep - 0.35, ep - 0.05, tl))));
      return { tw, fall };
    };

    // ---- state ----
    let revealN = 0, drawN = 0;
    const ground = new THREE.Plane(V(0, 1, 0), 0), ray = new THREE.Raycaster(), hitP = V(), ndc = new THREE.Vector2();
    const visibleCount = () => {
      let rmax = 0;
      for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        ndc.set(x, y); ray.setFromCamera(ndc, cam);
        if (!ray.ray.intersectPlane(ground, hitP) || hitP.distanceTo(cam.position) > cam.far) return COUNT;
        rmax = Math.max(rmax, Math.hypot(hitP.x, hitP.z) / TILE);
      }
      return within(rmax + 1.5);
    };
    let heroShown = true;
    let T = 0, failRate = 0.5, gridOn = false, heroOn = true, contrast = null;
    let onHero = null;
    const heroBase = V(0, 0, 0);
    const heroStep = (dt) => {
      hero.t += dt;
      const ep = Math.floor(hero.t / EP), tl = hero.t - ep * EP;
      if (ep !== hero.ep) {
        hero.ep = ep; hero.tries++;
        hero.fa = hero.script ? hero.script(hero.tries) : (Math.random() < failRate ? 1.0 + Math.random() * 3.0 : 99);
        hero.side = hero.script ? -1 : (Math.random() < 0.5 ? -1 : 1);
      }
      const st = poseRobot(hero.q, heroBase, tl, hero.fa, hero.side, hero.ph0);
      onHero?.(st, tl);
    };

    const qa = new THREE.Quaternion(), up = V(0, 1, 0), sv = V(), pv = V(), dv = V();
    const gridStep = () => {
      const n = revealN, rand = U.uRand.value;
      let dirty = false, k = 0;
      for (let idx = 0; idx < n; idx++) {
        const tg = T + aSeed[idx * 4], ep = Math.floor(tg / EP);
        if (ep !== lastEp[idx]) {
          lastEp[idx] = ep;
          const slip = lerp(1, 1.7 - 1.3 * aWorld[idx * 4], rand); // slippery worlds trip it up more often
          aFall[idx] = Math.random() < failRate * slip ? (1.0 + Math.random() * 3.0) * (Math.random() < 0.5 ? -1 : 1) : 99;
          dirty = true;
        }
        if (rand < 0.5 || U.uOthers.value < 0.5 || k >= MAXA || idx >= drawN || aWorld[idx * 4 + 2] > 0.5) continue;
        const ts = (T + aSeed[idx * 4 + 2]) % PUSH_EVERY;
        if (ts > 1.5) continue;
        const tl = tg - ep * EP;
        if (tl < LEAD || tl > EP - 0.6 || tl > Math.abs(aFall[idx])) continue;
        // The arrow flies in, touches the body as the push starts, rides along with it, then fades.
        const th = aSeed[idx * 4 + 3], grow = smooth(0, 0.3, ts) * (1 - smooth(1.1, 1.5, ts)) * rand;
        const xr = START + clamp(tl - LEAD, 0, WALK) * Q.SPEED;
        const push = smooth(0.5, 0.8, ts) * (1 - smooth(1.0, 2.2, ts)) * rand * 0.22;
        dv.set(Math.cos(th), 0, Math.sin(th));
        const back = lerp(0.6, 0.2, smooth(0.3, 0.6, ts)) + 0.67 * grow - push;
        pv.set(tileX[idx] + xr - dv.x * back, 0.42, tileZ[idx] - dv.z * back);
        qa.setFromUnitVectors(up, dv);
        m4.compose(pv, qa, sv.setScalar(Math.max(grow, 1e-3)));
        arrows.setMatrixAt(k++, m4);
      }
      arrows.count = k; arrows.instanceMatrix.needsUpdate = true;
      if (dirty) fallAttr.needsUpdate = true;
    };

    // Under reduced motion the clock stands still: each step shows one moment of its worlds.
    const offFrame = stage.onFrame((frameDt) => {
      const dt = reduceMotion ? 0 : frameDt;
      T += dt;
      for (const tw of [...tweens]) tw(); U.uTime.value = T;
      // keep depth precision across a 2 m close-up and a 130 m overview
      const dist = cam.position.distanceTo(stage.controls.target);
      const near = clamp(dist * 0.02, 0.01, 4), far = Math.max(200, dist * 6);
      if (Math.abs(near - cam.near) > near * 0.1 || Math.abs(far - cam.far) > far * 0.1) { cam.near = near; cam.far = far; cam.updateProjectionMatrix(); }
      if (frame.visible) { const w = Math.max(1, dist / 18); frame.children.forEach((b, i) => { if (i < 2) b.scale.set(1, 1, w); else b.scale.set(w, 1, 1); }); }
      // Draw only the robots the camera can see (they are stored nearest-first), in the right level of detail.
      drawN = Math.min(revealN, visibleCount());
      robots.count = robotsFar.count = drawN;
      robotsFar.visible = dist > 45; robots.visible = !robotsFar.visible;
      const close = dist < 30;
      if (tiles.receiveShadow !== close) { tiles.receiveShadow = close; tileMat.needsUpdate = true; }
      stage.floor.visible = close;
      // Far away, the detailed robots hand over to their instanced copies (fewer draw calls).
      const heroDetail = heroShown && dist < 45, contrastDetail = !!contrast && dist < 45;
      if (heroDetail !== hero.q.root.visible) { hero.q.root.visible = heroDetail; setHidden(0, heroDetail ? 1 : 0); }
      if (contrastDetail !== one.root.visible) { one.root.visible = many.root.visible = contrastDetail; setHidden(realIdx, contrastDetail ? 1 : 0); }
      if (heroOn) heroStep(dt);
      if (gridOn) gridStep();
      if (contrast) contrast.step(dt);
    });

    // ---- camera choreography ----
    // Tweens run on the wall clock, so a slow device still lands each step on time (choppier, not later).
    const tweens = new Set();
    const tween = (duration, fn) => new Promise((resolve) => {
      if (reduceMotion || duration <= 0) { fn(1); resolve(); return; }
      const t0 = performance.now();
      const tw = () => { const k = clamp((performance.now() - t0) / (duration * 1000), 0, 1); fn(ease(k)); if (k >= 1) { tweens.delete(tw); resolve(); } };
      tweens.add(tw);
    });
    const view = (f, d) => {
      const t0 = stage.controls.target.clone(), p0 = cam.position.clone();
      return tween(d, (k) => { stage.controls.target.lerpVectors(t0, f.target, k); cam.position.lerpVectors(p0, f.position, k); });
    };
    const narrow = () => cam.aspect < 1;
    // Each step frames one region, and that region is the step's subject: the first robot's lane, the
    // whole grid, a patch of varied worlds, or the real ground with its two robots.
    const HERO_BOX = new THREE.Box3(V(-0.95, 0, -0.5), V(0.95, 0.6, 0.5)), GRID_BOX = new THREE.Box3(V(-65, 0, -65), V(63, 1, 63));
    const midBox = () => (narrow() ? new THREE.Box3(V(-4, 0, -5), V(4, 0.5, 5)) : new THREE.Box3(V(-7, 0, -5), V(7, 0.5, 5)));
    const realBox = () => new THREE.Box3(realC.clone().add(V(-0.95, 0, -0.95)), realC.clone().add(V(0.95, 0.65, 0.95)));
    const corners = (b) => () => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => V(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
    const heroView = () => frameBox(stage, HERO_BOX, narrow() ? V(1, 0.55, 0.8) : V(0.45, 0.38, 1), 1.04);
    const gridView = () => frameBox(stage, GRID_BOX, narrow() ? V(0.2, 2.2, 1) : V(0.25, 1.25, 1), 1.02);
    const midView = () => frameBox(stage, midBox(), V(0.3, 0.95, 1));
    const realView = () => frameBox(stage, realBox(), V(1, 0.62, 0.42));
    let lastScale = 2;
    const scaleFor = (d) => { const s = clamp(d / 2.5, 2, 140); if (Math.abs(s - lastScale) > lastScale * 0.15) { stage.setScale(s); lastScale = s; } stage.controls.minDistance = 0.5; stage.controls.maxDistance = 1500; };
    const go = (f, d = 1.2) => { scaleFor(Math.max(f.dist, cam.position.distanceTo(stage.controls.target))); return view(f, d).then(() => scaleFor(f.dist)); };
    const setReveal = (r) => { U.uReveal.value = r; revealN = Math.min(COUNT, within(r + 1)); tiles.count = Math.max(1, revealN); };

    // Zoom path for step 2: v = 0 is the first robot alone, v = 1 is all 4,096.
    let A = null, B = null;
    const applyV = (v) => {
      // Keep the first robot centred while the copies spread out; slide to the whole grid only at the end.
      const s = smooth(0.55, 1, v), dist = A.dist * Math.pow(B.dist / A.dist, v);
      const target = A.target.clone().lerp(B.target, s), dir = A.dir.clone().lerp(B.dir, s).normalize();
      scaleFor(dist);
      stage.controls.target.copy(target); cam.position.copy(target).addScaledVector(dir, dist);
      const r = lerp(0.2 + dist * 0.17, 46, smooth(0.8, 1, v));
      setReveal(v <= 0.001 ? 0 : r);
      const n = v <= 0.001 ? 1 : (v >= 0.999 ? COUNT : Math.max(1, within(r + 0.5)));
      ui.readout(`Robots practising at once: <b>${fmt(n)}</b>, on one computer. Trained like this, a four-legged robot learned to walk on flat ground in under <b>four minutes</b>, and on rough ground in twenty.`);
    };
    const zoom = ui.slider({ label: '', left: 'One robot', right: '4,096 robots', min: 0, max: 1, step: 0.001, value: 1, onInput: (v) => applyV(v) });
    const shuffleBtn = ui.button('Shuffle worlds', () => { shuffle(); const from = 0.25; tween(0.7, (k) => { U.uRand.value = lerp(from, 1, k); }); });
    zoom.show(false); shuffleBtn.show(false);

    const firstLabel = stage.label('The first robot', () => hero.q.root.position.clone().add(V(0, 0.75, 0)), { tone: 'plain' }).show(false);
    const fellLabel = stage.label('Fell, so it resets', () => hero.q.root.position.clone().add(V(0, 0.55, 0)), { tone: 'fail' }).show(false);
    const realLabel = stage.label('The real world', () => realC.clone().add(V(TILE_SIZE / 2, 0.02, -0.25)), { tone: 'focus' }).show(false);
    const oneLabel = stage.label('One world', () => one.root.position.clone().add(V(0, 0.62, 0)), { tone: 'plain' }).show(false);
    const manyLabel = stage.label('4,096 worlds', () => many.root.position.clone().add(V(0, 0.62, 0)), { tone: 'focus' }).show(false);

    // Step 4: the same real ground for both. One robot only ever met one world, so it slips; the other walks on.
    const runContrast = (play) => {
      // Under reduced motion a played contrast shows the moment the one-world robot is down and the other walks on.
      let t = play && reduceMotion ? 3.0 : LEAD, last = performance.now();
      contrast = {
        step: () => {
          const now = performance.now();
          if (play && !reduceMotion) t += Math.min(0.25, (now - last) / 1000);
          last = now;
          const tl = t % 8;  // a longer loop here, so the outcome stays on screen
          const a = poseRobot(one, realC, tl, 1.55, -1, 0.1, { slip: 1, lane: -0.45, ep: 8 });
          poseRobot(many, realC, tl, 99, 1, 0.6, { lane: 0.42, ep: 8 });
          oneLabel.tone(a.fall > 0.3 ? 'fail' : 'plain');
        },
      };
      contrast.step(0);
    };
    const stopContrast = () => { contrast = null; };
    const setHidden = (idx, v) => { aWorld[idx * 4 + 2] = v; worldAttr.needsUpdate = true; };

    let epoch = 0;
    const live = (e, fn) => (k) => { if (e === epoch) fn(k); };
    const reset = () => {
      epoch++; lastEp.fill(-1);
      zoom.show(false); shuffleBtn.show(false); ui.hint(''); ui.readout('');
      [firstLabel, fellLabel, realLabel, oneLabel, manyLabel].forEach((l) => l.show(false));
      onHero = null; hero.script = null; stopContrast(); frame.visible = false;
      U.uDim.value = 0; U.uOthers.value = 1; heroShown = true;
    };
    { const f = heroView(); cam.position.copy(f.position); stage.controls.target.copy(f.target); }
    setReveal(0);

    return {
      steps: [
        { text: STEP_TEXT[0],
          enter: async () => {
            reset(); stage.focus(corners(HERO_BOX)); gridOn = false; U.uRand.value = 0; setReveal(0); arrows.count = 0;
            // Under reduced motion the first try stands still just after the fall.
            hero.t = reduceMotion ? 2.6 : 0; hero.ep = -1; hero.tries = 0; hero.script = (n) => [1.7, 3.1, 99][(n - 1) % 3];
            let last = '';
            onHero = (st) => {
              const fell = st.fall > 0.2;
              fellLabel.show(fell);
              const n = ((hero.tries - 1) % 3) + 1;
              const msg = fell ? `Attempt <b>${n}</b>: it fell. It starts over and keeps what it learned.` : (st.tw >= WALK - 0.01 ? `Attempt <b>${n}</b>: it made it across.` : `Attempt <b>${n}</b>: walking…`);
              if (msg !== last) { ui.readout(msg); last = msg; }
            };
            await go(heroView());
          } },
        { text: STEP_TEXT[1],
          enter: async () => {
            reset(); stage.focus(corners(GRID_BOX)); U.uRand.value = 0; failRate = 0.6; gridOn = true;
            firstLabel.show(true);
            A = heroView(); B = gridView();
            await go(A, 0.6); applyV(0);
            zoom.show(true); zoom.set(0); ui.hint('Slide to zoom out');
            const e = epoch;
            await tween(2.6, live(e, (k) => { applyV(k); zoom.set(k); }));
            tween(7, live(e, (k) => { failRate = lerp(0.6, 0.1, k); }));
          } },
        { text: STEP_TEXT[2],
          enter: async () => {
            reset(); stage.focus(corners(midBox())); gridOn = true; failRate = 0.07; setReveal(46);
            heroShown = false; shuffleBtn.show(true);
            const swatch = (w, h, bg) => `<i style="display:inline-block;width:${w}px;height:${h}px;border-radius:3px;vertical-align:middle;margin-right:6px;background:${bg}"></i>`;
            ui.readout([
              `${swatch(52, 10, 'linear-gradient(90deg, color-mix(in srgb-linear, var(--focus) 16%, var(--paper)), color-mix(in srgb-linear, var(--focus) 72%, var(--paper)))')}slippery to grippy ground`,
              `${swatch(12, 10, 'color-mix(in srgb-linear, var(--clay) 40%, var(--dark))')}darker body: heavier`,
              `${swatch(18, 4, 'var(--act)')}arrow: a random shove, every 10 seconds`,
              `${swatch(12, 10, 'var(--fail)')}red: it fell and starts over`,
            ].map((s) => `<span style="white-space:nowrap">${s}</span>`).join(' · '));
            const from = U.uRand.value;
            tween(1.2, live(epoch, (k) => { U.uRand.value = lerp(from, 1, k); }));
            await go(midView(), 1.3);
          } },
        { text: STEP_TEXT[3],
          enter: async () => {
            reset(); stage.focus(corners(realBox())); gridOn = true; failRate = 0.03; setReveal(46); U.uRand.value = 1;
            frame.visible = true; runContrast(false);
            realLabel.show(true); oneLabel.show(true); manyLabel.show(true);
            heroShown = false;
            tween(1.0, live(epoch, (k) => { U.uDim.value = k; U.uOthers.value = 1 - k; }));
            const e = epoch;
            await go(realView(), 1.4);
            if (e !== epoch) return;
            await ui.predict({ question: 'Which robot keeps walking on the real ground?', answer: 'many',
              options: [{ id: 'one', label: 'The one-world robot' }, { id: 'many', label: 'The 4,096-world robot' }, { id: 'both', label: 'Both' }],
              explain: 'Its single world never quite matched real ground, so the one-world robot slips. The robot that met thousands of floors treats this one as one more.' });
            if (e === epoch) runContrast(true);
          } },
        { text: STEP_TEXT[4],
          enter: async () => {
            reset(); stage.focus(corners(GRID_BOX)); gridOn = true; failRate = 0.03; setReveal(46); U.uRand.value = 1;
            frame.visible = true; runContrast(true);
            realLabel.show(true);
            await go(gridView(), 1.8);
          } },
      ],
      dispose() { offFrame(); tweens.clear(); stage.floor.visible = true; cam.near = 0.01; cam.far = 200; cam.updateProjectionMatrix(); },
    };
  },
};
