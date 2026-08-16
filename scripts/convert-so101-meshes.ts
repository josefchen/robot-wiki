/**
 * One-time asset pipeline: converts the SO-101 URDF + STL meshes from
 * TheRobotStudio/SO-ARM100 (Apache-2.0) into web-ready GLB+Draco assets.
 *
 * Usage:
 *   git clone --depth 1 https://github.com/TheRobotStudio/SO-ARM100.git /tmp/so-arm100
 *   node scripts/convert-so101-meshes.ts /tmp/so-arm100
 *
 * Output (committed to the repo):
 *   public/models/so101/so101.urdf        URDF with mesh paths rewritten .stl -> .glb
 *   public/models/so101/assets/*.glb      Draco-compressed GLB meshes
 *   public/models/so101/LICENSE           Apache-2.0 license from the source repo
 *
 * The STL -> GLB step runs through three.js (already a runtime dependency);
 * the Draco step runs through @gltf-transform + draco3d (dev-only tooling).
 */
import {
  mkdir,
  readFile,
  readdir,
  copyFile,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import type { Mesh as ThreeMesh } from 'three';

// --- Node shims for three.js GLTFExporter (browser APIs it touches) --------
// GLTFExporter's binary path reads Blobs through FileReader; Node 22 has Blob
// but not FileReader. Only the ArrayBuffer path is used here.
class FileReaderShim {
  result: ArrayBuffer | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(blob: Blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
}
(globalThis as Record<string, unknown>).FileReader ??= FileReaderShim;

const { Scene, Mesh, MeshStandardMaterial } = await import('three');
const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
const { GLTFExporter } =
  await import('three/examples/jsm/exporters/GLTFExporter.js');
const { NodeIO } = await import('@gltf-transform/core');
const { KHRONOS_EXTENSIONS } = await import('@gltf-transform/extensions');
const { draco, prune, weld } = await import('@gltf-transform/functions');
const draco3d = (await import('draco3d')).default;

// URDF materials from so101_new_calib.urdf, baked into the GLBs:
// "3d_printed" (amber PLA) and "sts3215" (dark servo casing). Every STL that
// is not a servo body is a 3D-printed part in this URDF.
const MATERIAL_BY_PREFIX: {
  match: (name: string) => boolean;
  color: number;
}[] = [
  { match: (name) => name.startsWith('sts3215'), color: 0x1a1a1a },
  { match: () => true, color: 0xffd11f },
];

function materialFor(stlName: string) {
  const entry = MATERIAL_BY_PREFIX.find((e) => e.match(stlName));
  return new MeshStandardMaterial({
    color: entry?.color ?? 0xffd11f,
    roughness: 0.65,
    metalness: 0.05,
  });
}

async function exportGlb(mesh: ThreeMesh): Promise<Uint8Array> {
  const scene = new Scene();
  scene.add(mesh);
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => resolve(new Uint8Array(result as ArrayBuffer)),
      (error) => reject(error),
      { binary: true },
    );
  });
}

async function main() {
  const repoRoot = process.argv[2];
  if (!repoRoot) {
    console.error(
      'usage: node scripts/convert-so101-meshes.ts <path-to-SO-ARM100-clone>',
    );
    process.exit(1);
  }
  const srcDir = path.join(repoRoot, 'Simulation', 'SO101');
  const outDir = path.join(process.cwd(), 'public', 'models', 'so101');
  const outAssets = path.join(outDir, 'assets');
  const tmpDir = path.join(outDir, '.tmp-glb');
  await mkdir(outAssets, { recursive: true });
  await mkdir(tmpDir, { recursive: true });

  // 1. URDF: rewrite mesh references .stl -> .glb.
  const urdf = await readFile(
    path.join(srcDir, 'so101_new_calib.urdf'),
    'utf8',
  );
  const rewritten = urdf.replace(/assets\/([\w.-]+)\.stl/g, 'assets/$1.glb');
  await writeFile(path.join(outDir, 'so101.urdf'), rewritten);

  // 2. License (Apache-2.0 attribution requirement).
  await copyFile(path.join(repoRoot, 'LICENSE'), path.join(outDir, 'LICENSE'));

  // 3. Meshes: STL -> GLB -> GLB+Draco.
  const io = new NodeIO()
    .registerExtensions(KHRONOS_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
    });

  const stlFiles = (await readdir(path.join(srcDir, 'assets')))
    .filter((f) => f.toLowerCase().endsWith('.stl'))
    .sort();

  const stlLoader = new STLLoader();
  let totalStl = 0;
  let totalGlb = 0;
  for (const file of stlFiles) {
    const srcPath = path.join(srcDir, 'assets', file);
    const raw = await readFile(srcPath);
    totalStl += raw.byteLength;
    const geometry = stlLoader.parse(
      raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
    );
    const mesh = new Mesh(geometry, materialFor(file));
    mesh.name = file.replace(/\.stl$/i, '');

    const glb = await exportGlb(mesh);
    const tmpPath = path.join(tmpDir, file.replace(/\.stl$/i, '.glb'));
    await writeFile(tmpPath, glb);

    const doc = await io.read(tmpPath);
    await doc.transform(weld(), prune(), draco());
    const outName = file.replace(/\.stl$/i, '.glb');
    const outPath = path.join(outAssets, outName);
    await io.write(outPath, doc);
    const { byteLength } = await readFile(outPath);
    totalGlb += byteLength;
    console.log(
      `${file}: ${(raw.byteLength / 1024).toFixed(1)} KB -> ${(byteLength / 1024).toFixed(1)} KB GLB+Draco`,
    );
  }

  console.log(
    `\n${stlFiles.length} meshes: ${(totalStl / 1024 / 1024).toFixed(2)} MB STL -> ${(totalGlb / 1024 / 1024).toFixed(2)} MB GLB+Draco`,
  );
  console.log(`Wrote ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
