// Sense 9: Four ways to see a mug. Takeaway: a robot stores the world as dots, cubes, a skin or soft
// blobs, and each trades detail against speed and memory.
// One mug model, four forms, every count computed from what is drawn.
import { THREE, shapes, lerp, clamp, ease, reduceMotion, slicer } from '../kit.js';
import { mugGeometries, surfaceSampler } from '../models/mug.js';
import { EXPLAINER_WORDS } from '../words.ts';

const rng = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const fmt = (n) => n.toLocaleString('en-GB');
const VOXEL = 0.01;          // 1 centimetre cubes
const DEPTH_W = 120, DEPTH_H = 90, DEPTH_FOV = 26; // the simulated depth camera: pixels across, down, vertical view in degrees
const SPLATS = 5000;
const CAM_AT = new THREE.Vector3(0.17, 0.27, 0.16); // depth camera position; it looks at the mug's middle
const MUG_MID = new THREE.Vector3(0, 0.048, 0);
const FORMS = ['dots', 'cubes', 'skin', 'blobs'];

const STEP_TEXT = EXPLAINER_WORDS.mug.steps;

export default {
  id: 'mug',
  how: `<ul>
    <li>One mug, modelled as a turned body (a lathe shape) plus a curved handle: 8 centimetres across and 9.5 centimetres tall. Every count in the readout is computed from what is drawn.</li>
    <li>Dots: a simulated depth camera of ${DEPTH_W} by ${DEPTH_H} pixels. The mug's surface is sampled finely, only surface facing the camera is kept, and each pixel keeps its nearest hit, as a real depth image does. One dot per pixel that lands on the mug; the far side stays empty.</li>
    <li>Cubes: a 1-centimetre grid in which a cube is full if any part of the mug's surface falls inside it. Mapping tools such as OctoMap store space this way, keeping cells that are full, free or unknown in a compact tree (Hornung et al., <a href="https://link.springer.com/article/10.1007/s10514-012-9321-0" target="_blank" rel="noopener">Autonomous Robots, 2013</a>; <a href="https://octomap.github.io/" target="_blank" rel="noopener">octomap.github.io</a>).</li>
    <li>Skin: the triangle mesh the mug is drawn with, shown with its edges.</li>
    <li>Soft blobs: ${SPLATS.toLocaleString('en-GB')} flat, soft-edged Gaussian blobs lying on the surface, each with its own baked shade. They are drawn the way splatting draws them: each blob's 3D spread is projected to a 2D ellipse on screen, and the blobs are blended back to front. This is an approximation: real Gaussian splats are fitted to many photos, and each one's colour changes with the viewing angle, so new views look photographic in real time (Kerbl et al., "3D Gaussian Splatting for Real-Time Radiance Field Rendering", SIGGRAPH 2023, <a href="https://arxiv.org/abs/2308.04079" target="_blank" rel="noopener">arXiv:2308.04079</a>; <a href="https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/" target="_blank" rel="noopener">project page</a>).</li>
  </ul>`,

  async mount(stage, ui) {
    stage.setScale(0.32);
    const W = stage.world;
    const cam = stage.camera;
    // Frame a set of world points from a direction: find the distance and centre that just fit them all.
    const fitLook = (pts, dir, s = 1.0, margin = 0.8) => {
      const D = new THREE.Vector3(...dir).normalize(), c = cam.clone(), v = new THREE.Vector3();
      const T = new THREE.Box3().setFromPoints(pts).getCenter(new THREE.Vector3());
      const place = (d) => { c.position.copy(T).addScaledVector(D, d); c.lookAt(T); c.updateMatrixWorld(); };
      const extent = (d) => { place(d); let m = 0; for (const p of pts) { v.copy(p).project(c); if (v.z > 1) return Infinity; m = Math.max(m, Math.abs(v.x), Math.abs(v.y)); } return m; };
      let d = 1;
      for (let pass = 0; pass < 3; pass++) {
        let lo = 0.02, hi = 20;
        for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (extent(mid) > margin) lo = mid; else hi = mid; }
        d = hi; place(d);
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const p of pts) { v.copy(p).project(c); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
        const halfH = Math.tan((c.fov * Math.PI) / 360) * d, halfW = halfH * c.aspect;
        T.addScaledVector(new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 0), ((x0 + x1) / 2) * halfW).addScaledVector(new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 1), ((y0 + y1) / 2) * halfH);
      }
      return stage.view(T, T.clone().addScaledVector(D, d), s);
    };
    const boxPts = (min, max, off = new THREE.Vector3()) => { const out = []; for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) out.push(new THREE.Vector3(x, y, z).add(off)); return out; };
    const mugPts = (off) => boxPts([-0.042, 0, -0.042], [0.074, 0.096, 0.042], off);
    const rigPts = [...boxPts([-0.05, -0.02, -0.05], [0.05, 0.05, 0.05], CAM_AT), ...boxPts([-0.025, 0, -0.025], [0.025, 0.006, 0.025], new THREE.Vector3(CAM_AT.x, 0, CAM_AT.z))];
    const tall = () => cam.aspect < 1;

    // ----- The mug -----
    const { body, handle } = mugGeometries();
    const clayMat = stage.material('clay');
    clayMat.polygonOffset = true; clayMat.polygonOffsetFactor = 1; clayMat.polygonOffsetUnits = 1;
    const skin = new THREE.Group();
    const skinBody = shapes.mesh(body, clayMat), skinHandle = shapes.mesh(handle, clayMat);
    const wireMat = stage.lineMaterial('ref', { opacity: 0.5 });
    const wires = [new THREE.LineSegments(new THREE.WireframeGeometry(body), wireMat), new THREE.LineSegments(new THREE.WireframeGeometry(handle), wireMat)];
    skin.add(skinBody, skinHandle, ...wires);
    const triangles = (body.index.count + handle.index.count) / 3;
    // A faint ghost of the real mug, so the reader can see what the dots miss.
    const ghostMat = stage.material('ref', { opacity: 0.16 });
    const ghost = new THREE.Group();
    ghost.add(new THREE.Mesh(body, ghostMat), new THREE.Mesh(handle, ghostMat));
    ghost.children.forEach((m) => { m.renderOrder = 1; });

    // Fine surface samples, shared by the depth camera and the cube grid.
    const sampler = surfaceSampler([body, handle]);
    const NSAMP = 150000;
    const SP = new Float32Array(NSAMP * 3), SN = new Float32Array(NSAMP * 3);
    // The long loops below hand the page back as they go, so mounting never holds it for long.
    const breathe = slicer();
    { const r = rng(7), p = new THREE.Vector3(), n = new THREE.Vector3();
      for (let i = 0; i < NSAMP; i++) { sampler.sample(r, p, n); p.toArray(SP, i * 3); n.toArray(SN, i * 3); if ((i & 4095) === 4095) await breathe(); } }

    // ----- Dots: a simulated depth camera -----
    const dcam = new THREE.PerspectiveCamera(DEPTH_FOV, DEPTH_W / DEPTH_H, 0.02, 1.0);
    dcam.position.copy(CAM_AT); dcam.lookAt(MUG_MID); dcam.updateMatrixWorld(true);
    const depth = new Float32Array(DEPTH_W * DEPTH_H).fill(Infinity);
    {
      const inv = dcam.matrixWorldInverse.elements, pr = dcam.projectionMatrix.elements;
      for (let i = 0; i < NSAMP; i++) {
        if ((i & 4095) === 4095) await breathe();
        const x = SP[i * 3], y = SP[i * 3 + 1], z = SP[i * 3 + 2];
        // Only surface that faces the camera can be seen.
        if ((CAM_AT.x - x) * SN[i * 3] + (CAM_AT.y - y) * SN[i * 3 + 1] + (CAM_AT.z - z) * SN[i * 3 + 2] <= 0) continue;
        const cx = inv[0] * x + inv[4] * y + inv[8] * z + inv[12], cy = inv[1] * x + inv[5] * y + inv[9] * z + inv[13], cz = inv[2] * x + inv[6] * y + inv[10] * z + inv[14];
        const d = -cz; if (d <= 0) continue;
        const nx = (pr[0] * cx) / d, ny = (pr[5] * cy) / d;
        const px = Math.floor(((nx + 1) / 2) * DEPTH_W), py = Math.floor(((1 - ny) / 2) * DEPTH_H);
        if (px < 0 || py < 0 || px >= DEPTH_W || py >= DEPTH_H) continue;
        const k = py * DEPTH_W + px; if (d < depth[k]) depth[k] = d;
      }
    }
    // One dot per pixel that hit the mug, placed on that pixel's ray at the measured distance. Row by row, like a scan.
    const dotList = [];
    {
      const tanY = Math.tan(((DEPTH_FOV / 2) * Math.PI) / 180), tanX = tanY * (DEPTH_W / DEPTH_H), v = new THREE.Vector3();
      for (let py = 0; py < DEPTH_H; py++) for (let px = 0; px < DEPTH_W; px++) {
        const d = depth[py * DEPTH_W + px]; if (!isFinite(d)) continue;
        const nx = ((px + 0.5) / DEPTH_W) * 2 - 1, ny = 1 - ((py + 0.5) / DEPTH_H) * 2;
        v.set(nx * tanX * d, ny * tanY * d, -d).applyMatrix4(dcam.matrixWorld);
        dotList.push(v.x, v.y, v.z);
      }
    }
    const DOTS = dotList.length / 3;
    const dotsPts = shapes.points(stage, dotList, 'sense', 0.0027);
    dotsPts.material.transparent = true;
    const dots = new THREE.Group(); dots.add(dotsPts);

    // The depth camera itself, on a small stand, with its view drawn as reference lines.
    const rig = new THREE.Group();
    const camBody = new THREE.Group();
    const housing = shapes.mesh(shapes.box(0.09, 0.025, 0.026, 0.006), stage.mats.dark, { cast: false });
    camBody.add(housing);
    for (const x of [-0.026, 0, 0.026]) { const lens = shapes.mesh(shapes.cylinder(x === 0 ? 0.0035 : 0.0055, 0.003, 24), stage.mats.clay, { cast: false }); lens.rotation.x = Math.PI / 2; lens.position.set(x, 0, -0.0135); camBody.add(lens); }
    camBody.position.copy(CAM_AT); camBody.lookAt(MUG_MID); camBody.rotateY(Math.PI); // its lenses face the mug
    const pole = shapes.mesh(shapes.cylinder(0.004, CAM_AT.y - 0.016, 16), stage.mats.clay); pole.position.set(CAM_AT.x, (CAM_AT.y - 0.016) / 2, CAM_AT.z);
    const foot = shapes.mesh(shapes.cylinder(0.022, 0.006, 32), stage.mats.clay); foot.position.set(CAM_AT.x, 0.003, CAM_AT.z);
    rig.add(camBody, pole, foot);
    {
      // Its view: four edge rays out to the mug's distance.
      const tanY = Math.tan(((DEPTH_FOV / 2) * Math.PI) / 180), tanX = tanY * (DEPTH_W / DEPTH_H);
      const at = (d) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => new THREE.Vector3(sx * tanX * d, sy * tanY * d, -d).applyMatrix4(dcam.matrixWorld));
      const segs = [];
      at(CAM_AT.distanceTo(MUG_MID)).forEach((c) => segs.push(CAM_AT, c));
      const fr = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), stage.lineMaterial('ref', { opacity: 0.55 }));
      rig.add(fr);
    }
    dots.add(rig, ghost);

    // ----- Cubes: a 1 cm grid, a cube is full if any surface sample falls inside it -----
    const cells = new Map();
    for (let i = 0; i < NSAMP; i++) {
      if ((i & 4095) === 4095) await breathe();
      const ix = Math.floor((SP[i * 3] + 0.045) / VOXEL), iy = Math.floor(SP[i * 3 + 1] / VOXEL), iz = Math.floor((SP[i * 3 + 2] + 0.045) / VOXEL);
      const key = (ix + 64) * 16384 + (iy + 64) * 128 + (iz + 64);
      if (!cells.has(key)) cells.set(key, [ix, iy, iz]);
    }
    const cellList = [...cells.values()].sort((a, b) => a[1] - b[1] || a[0] - b[0] || a[2] - b[2]);
    const CUBES = cellList.length;
    const cubeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, metalness: 0 });
    const cubeMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(VOXEL * 0.9, VOXEL * 0.9, VOXEL * 0.9), cubeMat, CUBES);
    cubeMesh.castShadow = true; cubeMesh.receiveShadow = true;
    const cellCentre = (c) => new THREE.Vector3(-0.045 + (c[0] + 0.5) * VOXEL, (c[1] + 0.5) * VOXEL, -0.045 + (c[2] + 0.5) * VOXEL);
    const cellIndex = new Map(cellList.map((c, i) => [`${c[0]},${c[1]},${c[2]}`, i]));
    const hits = new Set();
    const paintCubes = () => { for (let i = 0; i < CUBES; i++) cubeMesh.setColorAt(i, stage.colors[hits.has(i) ? 'fail' : 'clay']); cubeMesh.instanceColor.needsUpdate = true; };
    const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), sv = new THREE.Vector3();
    const growCubes = (k) => {
      for (let i = 0; i < CUBES; i++) {
        const c = cellList[i], local = ease(clamp((k - (c[1] / 10) * 0.55) / 0.45, 0, 1));
        sv.setScalar(Math.max(local, 1e-4));
        cubeMesh.setMatrixAt(i, m4.compose(cellCentre(c), q0, sv));
      }
      cubeMesh.instanceMatrix.needsUpdate = true;
    };
    growCubes(1); paintCubes(); stage.onTheme(paintCubes);
    const cubes = new THREE.Group(); cubes.add(cubeMesh);

    // ----- Soft blobs: see-through sprites, sorted back to front -----
    // Each blob is a flat Gaussian lying on the surface (wide along it, thin across it), projected to the
    // screen the way Gaussian splatting renders: its 3D spread becomes a 2D ellipse.
    const splatPos = new Float32Array(SPLATS * 3), splatTint = new Float32Array(SPLATS * 3), splatSize = new Float32Array(SPLATS), splatNrm = new Float32Array(SPLATS * 3), splatJit = new Float32Array(SPLATS);
    {
      const r = rng(11), p = new THREE.Vector3(), n = new THREE.Vector3();
      const spacing = Math.sqrt(sampler.area / SPLATS);
      for (let i = 0; i < SPLATS; i++) {
        // A camera capture never sees the underside of a mug on a table, so no blobs there.
        do sampler.sample(r, p, n); while (n.y < -0.8 && p.y < 0.004);
        splatPos.set([p.x, p.y, p.z], i * 3); splatNrm.set([n.x, n.y, n.z], i * 3);
        splatSize[i] = spacing * (0.75 + r() * 0.2); splatJit[i] = r();
      }
    }
    // Bake a soft, photo-like shade into each blob: light from above, darker inside the cup, a hint of glaze.
    const L = new THREE.Vector3(0.45, 0.85, 0.35).normalize(), Hh = new THREE.Vector3(0.45, 0.85, 0.35).add(new THREE.Vector3(-0.3, 0.45, 1).normalize()).normalize();
    const tintSplats = () => {
      const base = stage.colors.clay, shadow = stage.colors.dark, c = new THREE.Color();
      for (let i = 0; i < SPLATS; i++) {
        const nx = splatNrm[i * 3], ny = splatNrm[i * 3 + 1], nz = splatNrm[i * 3 + 2];
        const x = splatPos[i * 3], z = splatPos[i * 3 + 2], inside = Math.hypot(x, z) < 0.0365 && splatPos[i * 3 + 1] > 0.007 && nx * x + nz * z < 0;
        const lam = Math.max(0, nx * L.x + ny * L.y + nz * L.z);
        let k = 0.58 + 0.42 * lam; if (inside) k *= 0.55 + 0.45 * (splatPos[i * 3 + 1] / 0.095);
        c.copy(shadow).lerp(base, clamp(k + (splatJit[i] - 0.5) * 0.03, 0, 1.1));
        const spec = Math.abs(ny) < 0.5 ? Math.pow(Math.max(0, nx * Hh.x + ny * Hh.y + nz * Hh.z), 40) * 0.45 : 0;
        c.r = Math.min(1, c.r + spec); c.g = Math.min(1, c.g + spec); c.b = Math.min(1, c.b + spec);
        splatTint.set([c.r, c.g, c.b], i * 3);
      }
      splatGeo.attributes.tint.needsUpdate = true;
    };
    const splatGeo = new THREE.BufferGeometry();
    splatGeo.setAttribute('position', new THREE.BufferAttribute(splatPos, 3));
    splatGeo.setAttribute('tint', new THREE.BufferAttribute(splatTint, 3));
    splatGeo.setAttribute('sigma', new THREE.BufferAttribute(splatSize, 1));
    splatGeo.setAttribute('nrm', new THREE.BufferAttribute(splatNrm, 3));
    const order = new Uint16Array(SPLATS).map((_, i) => i);
    splatGeo.setIndex(new THREE.BufferAttribute(order, 1));
    const maxPoint = stage.renderer.getContext().getParameter(stage.renderer.getContext().ALIASED_POINT_SIZE_RANGE)[1] || 256;
    const splatMat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 1 }, uGrow: { value: 1 }, uOpacity: { value: 1 }, uMax: { value: maxPoint } },
      vertexShader: `attribute float sigma; attribute vec3 tint; attribute vec3 nrm;
        uniform float uScale; uniform float uGrow; uniform float uMax;
        varying vec3 vTint; varying vec3 vConic; varying float vRadius;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          vec3 n = normalize(mat3(modelViewMatrix) * nrm);
          float s = sigma * uGrow, t = s * 0.12;
          mat3 nn = outerProduct(n, n);
          mat3 S = s * s * (mat3(1.0) - nn) + t * t * nn;
          float z = max(0.001, -mv.z), f = uScale;
          vec3 j1 = vec3(f / z, 0.0, f * mv.x / (z * z)), j2 = vec3(0.0, f / z, f * mv.y / (z * z));
          vec3 s1 = S * j1, s2 = S * j2;
          float a = dot(j1, s1) + 0.3, b = dot(j1, s2), c = dot(j2, s2) + 0.3;
          float det = a * c - b * b, mid = 0.5 * (a + c);
          float r = min(3.0 * sqrt(mid + sqrt(max(0.1, mid * mid - det))), 0.5 * uMax - 1.0);
          vConic = vec3(c, -b, a) / det; vRadius = ceil(r);
          gl_PointSize = 2.0 * vRadius;
          vTint = tint;
        }`,
      fragmentShader: `uniform float uOpacity; varying vec3 vTint; varying vec3 vConic; varying float vRadius;
        void main() {
          vec2 d = (gl_PointCoord - 0.5) * 2.0 * vRadius; d.y = -d.y;
          float power = -0.5 * (vConic.x * d.x * d.x + 2.0 * vConic.y * d.x * d.y + vConic.z * d.y * d.y);
          if (power > 0.0) discard;
          float alpha = min(0.99, uOpacity * exp(power));
          if (alpha < 0.004) discard;
          gl_FragColor = vec4(vTint, alpha);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false,
    });
    const splatPts = new THREE.Points(splatGeo, splatMat); splatPts.frustumCulled = false;
    tintSplats(); stage.onTheme(tintSplats);
    const blobs = new THREE.Group(); blobs.add(splatPts);
    const zs = new Float32Array(SPLATS), idx = Array.from({ length: SPLATS }, (_, i) => i), mv = new THREE.Matrix4(), dbuf = new THREE.Vector2();
    const offFrame = stage.onFrame(() => {
      if (!blobs.visible) return;
      stage.renderer.getDrawingBufferSize(dbuf);
      splatMat.uniforms.uScale.value = dbuf.y / (2 * Math.tan((cam.fov * Math.PI) / 360)); // focal length in pixels
      mv.multiplyMatrices(cam.matrixWorldInverse, splatPts.matrixWorld);
      const e = mv.elements;
      for (let i = 0; i < SPLATS; i++) zs[i] = e[2] * splatPos[i * 3] + e[6] * splatPos[i * 3 + 1] + e[10] * splatPos[i * 3 + 2];
      idx.sort((a, b) => zs[a] - zs[b]);
      for (let i = 0; i < SPLATS; i++) order[i] = idx[i];
      splatGeo.index.needsUpdate = true;
    });

    W.add(dots, cubes, skin, blobs);
    const groups = { dots, cubes, skin, blobs };
    const counts = { dots: DOTS, cubes: CUBES, skin: triangles, blobs: SPLATS };
    const words = { dots: 'dots', cubes: 'cubes', skin: 'triangles', blobs: 'soft blobs' };
    const detail = {
      dots: 'one for each point the camera measured on the mug',
      cubes: 'each 1 centimetre across, full or empty',
      skin: 'small flat pieces of surface',
      blobs: 'each a soft, see-through smudge',
    };

    // ----- Labels (at most three at once) -----
    const camLabel = stage.label('Depth camera', () => (rig.visible && dots.visible ? CAM_AT.clone().add(new THREE.Vector3(0, 0.03, 0)) : null)).show(false);
    const hiddenLabel = stage.label('Far side: no dots', () => new THREE.Vector3(-0.03, 0.1, -0.03).add(dots.position)).show(false);
    const cubeLabel = stage.label('One cube: 1 centimetre', () => cellCentre(cellList[cellList.length - 1]).add(cubes.position)).show(false);
    const skinLabel = stage.label('Each piece is a flat triangle', () => new THREE.Vector3(-0.028, 0.06, 0.03).add(skin.position)).show(false);
    const labels = [camLabel, hiddenLabel, cubeLabel, skinLabel];

    // ----- Showing one form at a time -----
    const amount = { dots: 0, cubes: 0, skin: 0, blobs: 0 };
    const setAmount = (f, k) => {
      amount[f] = k;
      const g = groups[f]; g.visible = k > 0.001;
      if (f === 'dots') { dotsPts.material.opacity = k; ghostMat.opacity = 0.16 * k; rig.visible = k > 0.5 && single; }
      if (f === 'cubes') growCubes(k);
      if (f === 'skin') { clayMat.opacity = k; clayMat.transparent = k < 1; clayMat.depthWrite = k >= 1; wireMat.opacity = 0.5 * k; skinBody.castShadow = skinHandle.castShadow = k > 0.5; }
      if (f === 'blobs') splatMat.uniforms.uOpacity.value = k;
    };
    let single = true, epoch = 0;
    const alive = (my) => my === epoch;
    // Eased animation on wall-clock time, so a slow frame rate drops frames instead of stretching the scene.
    // Resolves true if the step that started it is still showing. Instant when the reader prefers reduced motion.
    const anim = (s, fn, my) => new Promise((resolve) => {
      if (reduceMotion || s <= 0) { if (alive(my)) fn(1); resolve(alive(my)); return; }
      const t0 = performance.now();
      const off = stage.onFrame(() => {
        const k = Math.min(1, (performance.now() - t0) / (s * 1000));
        if (!alive(my)) { off(); resolve(false); return; }
        fn(ease(k));
        if (k >= 1) { off(); resolve(true); }
      });
    });
    const readCount = (f) => `<b>${fmt(counts[f])}</b> ${words[f]}, ${detail[f]}.`;
    const lineup = () => `${tall() ? 'Left to right, top row first' : 'Left to right'}: ${FORMS.map((f) => `<b>${fmt(counts[f])}</b> ${words[f]}`).join(' · ')}`;
    // Move a form in (or all four into a row) and the others out.
    const place = (layout) => {
      const row = tall() ? [[-0.072, -0.07], [0.072, -0.07], [-0.072, 0.075], [0.072, 0.075]] : [[-0.225, 0], [-0.075, 0], [0.075, 0], [0.225, 0]];
      FORMS.forEach((f, i) => { const g = groups[f]; if (layout === 'row') g.position.set(row[i][0], 0, row[i][1]); else g.position.set(0, 0, 0); });
    };
    const show = async (f, my, { fast = false } = {}) => {
      single = true; place('one');
      labels.forEach((l) => l.show(false));
      choice.set(f);
      const outs = FORMS.filter((x) => x !== f && amount[x] > 0);
      const from = Object.fromEntries(outs.map((x) => [x, amount[x]]));
      if (outs.length && !(await anim(fast ? 0.01 : 0.3, (k) => outs.forEach((x) => setAmount(x, from[x] * (1 - k))), my))) return false;
      outs.forEach((x) => setAmount(x, 0));
      ui.readout(readCount(f));
      return true;
    };
    const HERO = (s) => fitLook(mugPts(), tall() ? [-0.32, 0.6, 1] : [-0.32, 0.5, 1], s, 0.72);
    const reveal = {
      dots: async (my) => {
        rig.visible = true; dotsPts.geometry.setDrawRange(0, 0); setAmount('dots', 1);
        camLabel.show(true);
        // Include room for the two labels' pills, which sit above and either side of their anchors.
        fitLook([...mugPts(), ...rigPts, new THREE.Vector3(-0.08, 0.14, -0.08), new THREE.Vector3(0.02, 0.14, 0.02), CAM_AT.clone().add(new THREE.Vector3(0, 0.07, 0))], tall() ? [-0.72, 0.45, 0.69] : [-0.72, 0.4, 0.69], 1.0, 0.86);
        ghostMat.opacity = 0.16; clayMat.opacity = 1;
        // Scan the image row by row; the dots appear where pixels land on the mug.
        if (!(await anim(1.5, (k) => { const n = Math.round(DOTS * k); dotsPts.geometry.setDrawRange(0, n); ui.readout(`<b>${fmt(n)}</b> dots`); }, my))) return;
        dotsPts.geometry.setDrawRange(0, Infinity);
        hiddenLabel.show(true);
        ui.readout(`${readCount('dots')} The faint shape is the real mug.`);
      },
      cubes: async (my) => {
        HERO(0.9); cubeLabel.show(false);
        if (!(await anim(1.3, (k) => setAmount('cubes', k), my))) return;
        cubeLabel.show(true);
      },
      skin: async (my) => {
        HERO(0.9);
        if (!(await anim(0.8, (k) => setAmount('skin', k), my))) return;
        skinLabel.show(true);
      },
      blobs: async (my) => {
        HERO(0.9);
        // Blobs start small, so you can see them one by one, then swell until they blend.
        splatMat.uniforms.uGrow.value = 0.3; setAmount('blobs', 1);
        if (!(await anim(0.35, () => {}, my))) return;
        await anim(1.4, (k) => { splatMat.uniforms.uGrow.value = lerp(0.3, 1, k); }, my);
      },
    };
    const open = async (f, my) => { if (await show(f, my)) await reveal[f](my); };
    const choice = ui.choice({ label: 'Show as', value: 'dots',
      options: [{ id: 'dots', label: 'Dots' }, { id: 'cubes', label: 'Cubes' }, { id: 'skin', label: 'Skin' }, { id: 'blobs', label: 'Blobs' }],
      onChange: (f) => { const my = ++epoch; open(f, my); } });

    // ----- The collision check: a probe asks the cube grid "is this spot full?" -----
    // A fingertip moves toward the mug. At every moment it asks one question of the grid: is the cube I am in full?
    const probe = shapes.mesh(shapes.sphere(0.0045, 20), stage.material('focus'), { cast: false });
    const probeMat = probe.material;
    const asked = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL)), stage.lineMaterial('focus'));
    probe.visible = false; asked.visible = false; W.add(probe, asked);
    const tipLabel = stage.label('Fingertip', () => (probe.visible ? probe.position.clone().add(new THREE.Vector3(0, 0.012, 0)) : null)).show(false);
    labels.push(tipLabel);
    // Cubes already asked about stay as faint outlines, so the trail of look-ups is visible.
    const trailMat = stage.lineMaterial('ref', { opacity: 0.6 });
    const trail = Array.from({ length: 40 }, () => { const t = new THREE.LineSegments(asked.geometry, trailMat); t.visible = false; W.add(t); return t; });
    const cellOf = (p) => { const l = p.clone().sub(cubes.position); return [Math.floor((l.x + 0.045) / VOXEL), Math.floor(l.y / VOXEL), Math.floor((l.z + 0.045) / VOXEL)]; };
    const probeAt = (p) => {
      const c = cellOf(p), i = cellIndex.get(c.join(','));
      asked.position.copy(cellCentre(c)).add(cubes.position); asked.visible = true;
      if (i !== undefined && !hits.has(i)) { hits.add(i); paintCubes(); }
      probeMat.color.copy(stage.colors[i !== undefined ? 'fail' : 'focus']);
      asked.material.color.copy(stage.colors[i !== undefined ? 'fail' : 'focus']);
      return { key: c.join(','), full: i !== undefined };
    };

    const reset = () => {
      epoch++;
      labels.forEach((l) => l.show(false));
      probe.visible = false; asked.visible = false; hits.clear(); paintCubes(); trail.forEach((t) => { t.visible = false; });
      splatMat.uniforms.uGrow.value = 1; dotsPts.geometry.setDrawRange(0, Infinity);
      choice.show(true); ui.hint('');
      return epoch;
    };
    // Start with nothing on stage; each step brings its form in.
    FORMS.forEach((f) => setAmount(f, 0));
    stage.camera.position.set(-0.45, 0.35, 0.6); stage.controls.target.set(0.08, 0.07, 0.08);

    const stepFor = (f, text) => ({ text, enter: async () => {
      const my = reset(); stage.focus(() => (f === 'dots' ? [...mugPts(), ...rigPts] : mugPts())); await open(f, my);
    } });
    return {
      steps: [
        stepFor('dots', STEP_TEXT[0]),
        stepFor('cubes', STEP_TEXT[1]),
        stepFor('skin', STEP_TEXT[2]),
        stepFor('blobs', STEP_TEXT[3]),
        { text: STEP_TEXT[4],
          enter: async () => {
            const my = reset(); choice.show(false); single = false;
            stage.focus(() => FORMS.flatMap((f) => mugPts(groups[f].position)));
            labels.forEach((l) => l.show(false));
            place('row'); rig.visible = false; dotsPts.geometry.setDrawRange(0, Infinity);
            const from = { ...amount };
            const lookRow = () => fitLook(FORMS.flatMap((f) => mugPts(groups[f].position)), tall() ? [0, 1.0, 1] : [0, 0.42, 1], 1.0, 0.86);
            lookRow();
            anim(0.8, (k) => FORMS.forEach((f) => setAmount(f, lerp(from[f], 1, k))), my);
            ui.readout(lineup());
            await ui.predict({ question: 'Which one lets the robot check fastest that its arm won\'t bump into the mug?', answer: 'cubes',
              options: [{ id: 'dots', label: 'Dots' }, { id: 'cubes', label: 'Cubes' }, { id: 'skin', label: 'Skin' }, { id: 'blobs', label: 'Blobs' }],
              explain: 'Cubes. To ask "is this spot taken?", the robot looks up one box: full or empty. Dots leave gaps, a skin means searching through its triangles, and blobs have no hard edge.' });
            if (!alive(my)) return;
            // Reveal: a fingertip moves toward the cube mug, asking one cube at a time, and stops at the first full one.
            // The other three fade back so the cubes carry the answer.
            const fade = tall() ? { dots: 0, skin: 0, blobs: 0 } : { dots: 0.15, skin: 0.12, blobs: 0.04 }, was = { ...amount };
            anim(0.6, (k) => Object.keys(fade).forEach((f) => setAmount(f, lerp(was[f], fade[f], k))), my);
            const c = cubes.position.clone();
            stage.focus(() => [...mugPts(c), ...boxPts([0.03, 0.05, 0.14], [0.05, 0.07, 0.17], c)]);
            fitLook([...mugPts(c), ...boxPts([0.03, 0.05, 0.14], [0.05, 0.07, 0.17], c)], tall() ? [1, 0.8, 0.3] : [-0.3, 0.45, 1], 0.9, 0.8);
            const a = new THREE.Vector3(c.x + 0.045, 0.062, c.z + 0.16), b = new THREE.Vector3(c.x + 0.004, 0.062, c.z);
            let stopAt = 1;
            for (let k = 0; k <= 1; k += 0.002) { const q = cellOf(a.clone().lerp(b, k)); if (cellIndex.has(q.join(','))) { stopAt = k + 0.004; break; } }
            probe.position.copy(a); probe.visible = true; tipLabel.show(true);
            const seen = new Set(); let empty = 0;
            let lastK = 0;
            if (!(await anim(2.2, (k) => {
              // Ask about every cube passed since the last frame, so none is skipped on a slow screen.
              for (let kk = lastK; kk <= k; kk = Math.min(k, kk + 0.004)) {
                probe.position.lerpVectors(a, b, kk * stopAt);
                const r = probeAt(probe.position);
                if (!seen.has(r.key)) { seen.add(r.key); if (!r.full && trail[empty]) { trail[empty].position.copy(asked.position); trail[empty].visible = true; empty++; } }
                if (kk >= k) break;
              }
              lastK = k;
            }, my))) return;
            ui.readout(`${lineup()}<br>The fingertip checks one cube at a time. Outlined: the <b>${empty}</b> empty cubes it passed. Red: the first full one, so it stops before touching the mug.`);
          } },
      ],
      dispose() { offFrame(); },
    };
  },
};
