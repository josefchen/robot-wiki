import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const MODEL_DIR = path.join(process.cwd(), 'public', 'models', 'so101');
const DRACO_DIR = path.join(process.cwd(), 'public', 'draco');

function glbExtensionsUsed(file: string): string[] {
  const buf = readFileSync(file);
  // GLB container: 12-byte header, then chunk 0 (uint32 length, 'JSON' type).
  expect(buf.readUInt32LE(0)).toBe(0x46546c67); // 'glTF' magic
  const jsonLength = buf.readUInt32LE(12);
  const json = buf.subarray(20, 20 + jsonLength).toString('utf8');
  const parsed = JSON.parse(json) as { extensionsUsed?: string[] };
  return parsed.extensionsUsed ?? [];
}

describe('SO-101 model assets', () => {
  it('ships the URDF with GLB-only mesh references', () => {
    const urdfPath = path.join(MODEL_DIR, 'so101.urdf');
    expect(existsSync(urdfPath)).toBe(true);
    const urdf = readFileSync(urdfPath, 'utf8');
    expect(urdf).not.toMatch(/\.stl/i);
    expect(urdf).toMatch(/assets\/[\w.-]+\.glb/);
  });

  it('ships every referenced mesh as a Draco-compressed GLB on disk', () => {
    const urdf = readFileSync(path.join(MODEL_DIR, 'so101.urdf'), 'utf8');
    const refs = [
      ...new Set(
        [...urdf.matchAll(/filename="(assets\/[\w.-]+\.glb)"/g)].map(
          (m) => m[1],
        ),
      ),
    ];
    // 13 unique meshes across the SO-101 visual/collision geometry.
    expect(refs.length).toBe(13);
    for (const ref of refs) {
      const file = path.join(MODEL_DIR, ref);
      expect(existsSync(file), `${ref} missing`).toBe(true);
      expect(glbExtensionsUsed(file), `${ref} not Draco-compressed`).toContain(
        'KHR_draco_mesh_compression',
      );
    }
  });

  it('keeps the total model payload small enough for web delivery', () => {
    const urdf = readFileSync(path.join(MODEL_DIR, 'so101.urdf'), 'utf8');
    const refs = [
      ...new Set(
        [...urdf.matchAll(/filename="(assets\/[\w.-]+\.glb)"/g)].map(
          (m) => m[1],
        ),
      ),
    ];
    let total = 0;
    for (const ref of refs) {
      total += readFileSync(path.join(MODEL_DIR, ref)).byteLength;
    }
    // Research/06 projected ~1.2 MB for all 13 meshes; allow headroom.
    expect(total).toBeLessThan(2 * 1024 * 1024);
  });

  it('ships the Apache-2.0 license for the redistributed SO-ARM100 assets', () => {
    const licensePath = path.join(MODEL_DIR, 'LICENSE');
    expect(existsSync(licensePath)).toBe(true);
    expect(readFileSync(licensePath, 'utf8')).toMatch(/Apache License/);
  });

  it('ships the Draco decoder used by GLTFLoader at runtime', () => {
    for (const file of [
      'draco_decoder.wasm',
      'draco_wasm_wrapper.js',
      'draco_decoder.js',
    ]) {
      expect(existsSync(path.join(DRACO_DIR, file)), `${file} missing`).toBe(
        true,
      );
    }
  });
});
