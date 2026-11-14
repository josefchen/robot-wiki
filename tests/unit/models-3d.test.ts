import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { MODELS_3D } from '@/data/models-3d';
import { model3dSchema } from '@/data/schemas/model-3d';

/**
 * Every maker-model record agrees with the files it describes: the files
 * exist, the licence is there, the URDF names only shipped meshes, and the
 * mesh count, triangles, bytes and position bound recount from the GLBs.
 */

const repoRoot = join(import.meta.dirname, '../..');
const QUANTIZE_POSITION = 14;

type Accessor = { count: number; min?: number[]; max?: number[] };
type Gltf = {
  extensionsUsed?: string[];
  accessors: Accessor[];
  meshes: {
    primitives: {
      mode?: number;
      indices?: number;
      attributes: { POSITION: number };
      extensions?: Record<string, unknown>;
    }[];
  }[];
};

/** The JSON chunk of a binary glTF. */
function readGltf(file: string): Gltf {
  const glb = readFileSync(file);
  expect(glb.toString('latin1', 0, 4), `${file} is not a GLB`).toBe('glTF');
  const length = glb.readUInt32LE(12);
  expect(glb.toString('latin1', 16, 20)).toBe('JSON');
  return JSON.parse(glb.toString('utf8', 20, 20 + length)) as Gltf;
}

function meshStats(file: string) {
  const gltf = readGltf(file);
  let triangles = 0;
  let longestSide = 0;
  let allDraco = true;
  for (const mesh of gltf.meshes) {
    for (const prim of mesh.primitives) {
      expect(prim.mode ?? 4, `${file} has a non-triangle primitive`).toBe(4);
      const position = gltf.accessors[prim.attributes.POSITION];
      const count =
        prim.indices === undefined
          ? position.count
          : gltf.accessors[prim.indices].count;
      triangles += count / 3;
      const { min, max } = position;
      if (!min || !max) throw new Error(`${file}: POSITION has no bounds`);
      longestSide = Math.max(longestSide, ...max.map((v, i) => v - min[i]));
      allDraco &&= Boolean(prim.extensions?.KHR_draco_mesh_compression);
    }
  }
  return {
    triangles,
    bytes: statSync(file).size,
    boundUm: (longestSide / (2 ** QUANTIZE_POSITION - 1) / 2) * 1e6,
    allDraco,
  };
}

function urdfMeshRefs(urdf: string): string[] {
  return [...new Set([...urdf.matchAll(/filename="([^"]+)"/g)].map((m) => m[1]))];
}

describe('MODELS_3D', () => {
  it('validates against the schema with unique ids', () => {
    expect(z.array(model3dSchema).safeParse(MODELS_3D).success).toBe(true);
    const ids = MODELS_3D.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lists every model folder under public/models', () => {
    const shipped = readdirSync(join(repoRoot, 'public/models'), {
      recursive: true,
      withFileTypes: true,
    })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.urdf'))
      .map((entry) => join(entry.parentPath, entry.name));
    const recorded = MODELS_3D.map((m) => join(repoRoot, m.dir, m.urdf));
    expect(shipped.sort()).toEqual(recorded.sort());
  });

  for (const model of MODELS_3D) {
    describe(model.id, () => {
      const dir = join(repoRoot, model.dir);
      const assets = join(dir, 'assets');
      const glbs = existsSync(assets)
        ? readdirSync(assets).filter((f) => f.endsWith('.glb')).sort()
        : [];

      it('ships its URDF and a non-empty licence', () => {
        expect(existsSync(join(dir, model.urdf))).toBe(true);
        const licence = join(repoRoot, model.licence.file);
        expect(existsSync(licence)).toBe(true);
        expect(readFileSync(licence, 'utf8').trim().length).toBeGreaterThan(0);
      });

      it('references only meshes that exist, and every mesh it ships', () => {
        const refs = urdfMeshRefs(readFileSync(join(dir, model.urdf), 'utf8'));
        for (const ref of refs) {
          expect(ref, `${model.urdf} names a non-GLB mesh`).toMatch(/^assets\/[\w.-]+\.glb$/);
          expect(existsSync(join(dir, ref)), `missing ${ref}`).toBe(true);
        }
        expect(refs.map((r) => r.slice('assets/'.length)).sort()).toEqual(glbs);
      });

      it('matches the recorded mesh count, triangles, bytes and bound', () => {
        const stats = glbs.map((f) => meshStats(join(assets, f)));
        expect(glbs.length).toBe(model.meshCount);
        expect(stats.every((s) => s.allDraco)).toBe(true);
        expect(stats.reduce((sum, s) => sum + s.bytes, 0)).toBe(model.shippedBytes);
        expect(stats.reduce((sum, s) => sum + s.triangles, 0)).toBe(
          model.shippedTriangles,
        );
        expect(Math.max(...stats.map((s) => s.boundUm))).toBeCloseTo(
          model.positionBoundUm,
          2,
        );
      });

      it('ships as many triangles as the maker published', () => {
        expect(model.shippedTriangles).toBe(model.sourceTriangles);
      });
    });
  }
});
