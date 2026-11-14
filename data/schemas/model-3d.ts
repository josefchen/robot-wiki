import { z } from 'zod';
import { httpsUrlSchema, isoDateSchema, slugSchema } from './shared.ts';

/**
 * Provenance of one maker 3D model the site ships (data/models-3d.ts).
 *
 * Counts and byte totals describe the files under `dir`; the unit suite
 * recounts them from disk. Source triangle counts come from the maker's
 * binary STL headers at `commit`, read by the conversion script.
 */
export const model3dSchema = z.object({
  id: slugSchema,
  maker: z.string().min(1),
  product: z.string().min(1),
  /** The maker's URDF file name, as it appears in the repository. */
  urdfFile: z.string().regex(/^[\w.-]+\.urdf$/),
  /** What the maker's own README calls that file. */
  makerLabel: z.string().min(1),
  repository: httpsUrlSchema,
  commit: z.string().regex(/^[0-9a-f]{40}$/),
  /** Folder in the repository that holds the URDF. */
  sourcePath: z.string().min(1),
  licence: z.object({
    /** SPDX identifier. */
    name: z.string().min(1),
    /** Repository path of the licence text shipped beside the files. */
    file: z.string().startsWith('public/models/'),
  }),
  /** Repository folder of the shipped model. */
  dir: z.string().startsWith('public/models/'),
  /** Shipped URDF, relative to `dir`. */
  urdf: z.string().regex(/^[\w.-]+\.urdf$/),
  meshCount: z.number().int().positive(),
  /** Triangles in the maker's mesh files the URDF names. */
  sourceTriangles: z.number().int().positive(),
  /** Triangles in the shipped GLBs. */
  shippedTriangles: z.number().int().positive(),
  /** Bytes of shipped GLB. */
  shippedBytes: z.number().int().positive(),
  encoding: z.string().min(1),
  /**
   * Largest per-axis position error over the meshes, in micrometres: half a
   * quantization step of each mesh's longest bounding-box side. Computed,
   * not measured.
   */
  positionBoundUm: z.number().positive(),
  /** One plain sentence of what was changed from the maker's files. */
  change: z.string().min(1),
  checked: isoDateSchema,
});

export type Model3d = z.infer<typeof model3dSchema>;
