/**
 * Converts Unitree's G1 URDF and STL meshes from unitreerobotics/unitree_ros
 * (BSD-3-Clause) into Draco GLBs, keeping every triangle.
 *
 * Usage:
 *   git clone https://github.com/unitreerobotics/unitree_ros.git /tmp/unitree_ros
 *   git -C /tmp/unitree_ros checkout 157ff950351e5f535e03c5d85a16b7d594b3dbcc
 *   node scripts/convert-unitree-meshes.ts /tmp/unitree_ros
 *
 * Output (committed to the repo):
 *   public/models/unitree/g1/g1_23dof_rev_1_0.urdf  URDF, mesh paths rewritten to assets/*.glb
 *   public/models/unitree/g1/assets/*.glb           one Draco GLB per STL the URDF names
 *   public/models/unitree/g1/LICENSE                the repository's BSD-3-Clause licence
 *
 * Every input file is checked against its git blob hash at the pinned commit,
 * so a clone at any other commit fails before anything is written. Each GLB
 * is read back and decoded; the script exits non-zero if its triangle count
 * differs from the STL's. The only loss is Draco's 14-bit position
 * quantization (the setting the SO-101 files use); the printed bound is the
 * largest per-axis error, half a quantization step of the mesh's longest
 * bounding-box side.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Mesh as ThreeMesh } from 'three';

// GLTFExporter's binary path reads Blobs through FileReader, which Node lacks.
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
const { GLTFExporter } = await import(
  'three/examples/jsm/exporters/GLTFExporter.js'
);
const { NodeIO } = await import('@gltf-transform/core');
const { KHRONOS_EXTENSIONS } = await import('@gltf-transform/extensions');
const { draco, prune, weld } = await import('@gltf-transform/functions');
const draco3d = (await import('draco3d')).default;

const COMMIT = '157ff950351e5f535e03c5d85a16b7d594b3dbcc';
const SOURCE_DIR = 'robots/g1_description';
const URDF = 'g1_23dof_rev_1_0.urdf';
const QUANTIZE_POSITION = 14;

/** Git blob SHA-1 of every input at the pinned commit. */
const SOURCE_BLOBS: Record<string, string> = {
  LICENSE: '6dfdadaa90baa4f7bea7400d3c4e8b9c784ae37f',
  'robots/g1_description/g1_23dof_rev_1_0.urdf': 'db07d4d2f7cf01fd52fe3e02d4932c5db3770762',
  'robots/g1_description/meshes/head_link.STL': '2ee5fba15de3ccd4c31774bc7a66de7aeefab770',
  'robots/g1_description/meshes/left_ankle_pitch_link.STL': '69de8490184afc698f633e34bb74e65351bd4689',
  'robots/g1_description/meshes/left_ankle_roll_link.STL': '8864e9f98103190883d1ba027aba5469925f2bca',
  'robots/g1_description/meshes/left_elbow_link.STL': '1a96d99ba469960173129084ab6dd3bf8a732a71',
  'robots/g1_description/meshes/left_hip_pitch_link.STL': '5b751c767ecf03b29c707b19f1faf5367e8d33d2',
  'robots/g1_description/meshes/left_hip_roll_link.STL': '778437ffe61731915fa4cb7cf2390e9cbe738c43',
  'robots/g1_description/meshes/left_hip_yaw_link.STL': '383093ab96ed3a099ab79f5d6ed144fc0b7067a9',
  'robots/g1_description/meshes/left_knee_link.STL': 'f2e98e54e8f1980eb62ad25c7a838044c23bbadf',
  'robots/g1_description/meshes/left_shoulder_pitch_link.STL': 'e698311fb12d3f22f018b668c40dab667c39b8d3',
  'robots/g1_description/meshes/left_shoulder_roll_link.STL': '80bca84aca41137f8270fb35e263dcc5d9658e43',
  'robots/g1_description/meshes/left_shoulder_yaw_link.STL': '281e699055ffafe094f52a440547eb4b64f83bfa',
  'robots/g1_description/meshes/left_wrist_roll_rubber_hand.STL': '8fa435b66cf9d81df34423c752452ea2c7d90479',
  'robots/g1_description/meshes/logo_link.STL': 'e9792098504b64b359fbffa983373e5e6fa1b50a',
  'robots/g1_description/meshes/pelvis.STL': '691a779b9c9f4c97f48eaa9edf9eb336ca3b4411',
  'robots/g1_description/meshes/pelvis_contour_link.STL': '42434339abf5a0a3816f890389e3e61af3b1e03c',
  'robots/g1_description/meshes/right_ankle_pitch_link.STL': 'e77d8a2fe1e5d56fac049833d254d6ffa4f6b350',
  'robots/g1_description/meshes/right_ankle_roll_link.STL': 'd4261dd7ccf39dd9c54cad37c1982f1d50e6fccc',
  'robots/g1_description/meshes/right_elbow_link.STL': 'f259e3812efb9985d6463c04d3e8a4b53793a699',
  'robots/g1_description/meshes/right_hip_pitch_link.STL': '998a0a0f5c248b217cf82c5088d6d365d9654ecd',
  'robots/g1_description/meshes/right_hip_roll_link.STL': '47b2eebdd36c7289679eebb9583c65a15514e194',
  'robots/g1_description/meshes/right_hip_yaw_link.STL': '371856427c7cc31ae7463c83f00ef6652c72d672',
  'robots/g1_description/meshes/right_knee_link.STL': '76d21a3d81e4e34520c5d6b3f28d7e43c1874364',
  'robots/g1_description/meshes/right_shoulder_pitch_link.STL': '3f5b4ed47ade68e83f617ef3fd65cb810e9b0e07',
  'robots/g1_description/meshes/right_shoulder_roll_link.STL': '179d61753d48b3a55165b81ded2c14e84deb81c2',
  'robots/g1_description/meshes/right_shoulder_yaw_link.STL': '2ba6076a8853edac5e3e17cffd2c256318e88d92',
  'robots/g1_description/meshes/right_wrist_roll_rubber_hand.STL': 'c365aa9d8cafb8a96d2f58fe53a83727bb7427c8',
  'robots/g1_description/meshes/torso_link_23dof_rev_1_0.STL': '079aa8124f279cd40a50d23c2f061dd82ccc16c6',
};

function gitBlobSha(buffer: Buffer): string {
  return createHash('sha1')
    .update(`blob ${buffer.byteLength}\0`)
    .update(buffer)
    .digest('hex');
}

function stlTriangles(buffer: Buffer, name: string): number {
  const count = buffer.readUInt32LE(80);
  if (84 + 50 * count !== buffer.byteLength) {
    throw new Error(`${name} is not a binary STL of ${count} triangles`);
  }
  return count;
}

async function exportGlb(mesh: ThreeMesh): Promise<Uint8Array> {
  const scene = new Scene();
  scene.add(mesh);
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(
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
      'usage: node scripts/convert-unitree-meshes.ts <path-to-unitree_ros-at-157ff95>',
    );
    process.exit(1);
  }
  const outDir = path.join(process.cwd(), 'public', 'models', 'unitree', 'g1');
  const outAssets = path.join(outDir, 'assets');

  const read = async (rel: string) => {
    const buffer = await readFile(path.join(repoRoot, rel));
    const expected = SOURCE_BLOBS[rel];
    const actual = gitBlobSha(buffer);
    if (expected !== actual) {
      throw new Error(
        `${rel}: blob ${actual} is not the file at ${COMMIT} (${expected ?? 'unlisted'})`,
      );
    }
    return buffer;
  };

  // 1. URDF: point every mesh reference at its GLB.
  const urdf = (await read(`${SOURCE_DIR}/${URDF}`)).toString('utf8');
  const meshRefs = [...urdf.matchAll(/filename="meshes\/([\w.-]+)\.STL"/g)];
  const otherRefs = [...urdf.matchAll(/filename="([^"]+)"/g)].length;
  if (meshRefs.length !== otherRefs) {
    throw new Error(`${URDF} names a file outside meshes/*.STL`);
  }
  const meshNames = [...new Set(meshRefs.map((m) => m[1]))].sort();
  const colorByMesh = new Map<string, [number, number, number]>();
  const palette = new Map<string, [number, number, number]>();
  for (const m of urdf.matchAll(
    /<material name="(\w+)">\s*<color rgba="([\d.]+) ([\d.]+) ([\d.]+) 1"\s*\/>/g,
  )) {
    palette.set(m[1], [Number(m[2]), Number(m[3]), Number(m[4])]);
  }
  // Bake each visual's URDF material colour into its GLB.
  for (const [visual] of urdf.matchAll(/<visual>[\s\S]*?<\/visual>/g)) {
    const mesh = visual.match(/filename="meshes\/([\w.-]+)\.STL"/)?.[1];
    const material = visual.match(/<material name="(\w+)"\s*\/>/)?.[1];
    const color = material ? palette.get(material) : undefined;
    if (!mesh || !color) throw new Error(`visual without mesh or colour:\n${visual}`);
    colorByMesh.set(mesh, color);
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outAssets, { recursive: true });
  await writeFile(
    path.join(outDir, URDF),
    urdf.replace(/meshes\/([\w.-]+)\.STL/g, 'assets/$1.glb'),
  );

  // 2. Licence (BSD-3-Clause requires the notice with every copy).
  await writeFile(path.join(outDir, 'LICENSE'), await read('LICENSE'));

  // 3. Meshes: STL -> GLB -> Draco GLB, then decode and recount.
  const io = new NodeIO()
    .registerExtensions(KHRONOS_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
    });
  const stlLoader = new STLLoader();
  let sourceTriangles = 0;
  let shippedTriangles = 0;
  let shippedBytes = 0;
  let largestBound = 0;
  const mismatches: string[] = [];

  for (const name of meshNames) {
    const raw = await read(`${SOURCE_DIR}/meshes/${name}.STL`);
    const triangles = stlTriangles(raw, name);
    const geometry = stlLoader.parse(
      raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
    );
    const color = colorByMesh.get(name);
    if (!color) throw new Error(`${name} has no visual in ${URDF}`);
    const [r, g, b] = color;
    const material = new MeshStandardMaterial({ roughness: 0.65, metalness: 0.05 });
    material.color.setRGB(r, g, b);
    const mesh = new Mesh(geometry, material);
    mesh.name = name;

    const doc = await io.readBinary(await exportGlb(mesh));
    await doc.transform(
      weld(),
      prune(),
      draco({ quantizePosition: QUANTIZE_POSITION }),
    );
    const glb = await io.writeBinary(doc);
    const outPath = path.join(outAssets, `${name}.glb`);
    await writeFile(outPath, glb);

    // Read the written file back through the Draco decoder and recount.
    const check = await io.read(outPath);
    let decoded = 0;
    let longestSide = 0;
    for (const m of check.getRoot().listMeshes()) {
      for (const prim of m.listPrimitives()) {
        const indices = prim.getIndices();
        const position = prim.getAttribute('POSITION');
        if (!position) throw new Error(`${name}: primitive without positions`);
        decoded += (indices ? indices.getCount() : position.getCount()) / 3;
        const min = position.getMin([]);
        const max = position.getMax([]);
        longestSide = Math.max(longestSide, ...max.map((v, i) => v - min[i]));
      }
    }
    const bound = longestSide / (2 ** QUANTIZE_POSITION - 1) / 2;
    largestBound = Math.max(largestBound, bound);
    sourceTriangles += triangles;
    shippedTriangles += decoded;
    shippedBytes += glb.byteLength;
    if (decoded !== triangles) mismatches.push(`${name}: ${triangles} -> ${decoded}`);
    console.log(
      `${name}: ${triangles} triangles, ${(raw.byteLength / 1024).toFixed(1)} KB STL -> ${(glb.byteLength / 1024).toFixed(1)} KB GLB, bound ${(bound * 1e6).toFixed(2)} um`,
    );
  }

  console.log(
    `\n${meshNames.length} meshes: ${sourceTriangles} triangles in, ${shippedTriangles} out, ${shippedBytes} bytes of GLB, largest bound ${(largestBound * 1e6).toFixed(2)} um`,
  );
  if (mismatches.length > 0) {
    console.error(`Triangle counts changed:\n${mismatches.join('\n')}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
