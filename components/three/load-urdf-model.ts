import { LoadingManager } from 'three';
import URDFLoader from 'urdf-loader';
import type { URDFRobot } from 'urdf-loader';
import { createGlbMeshLoader } from './glb-mesh-loader';

/** A URDF assembled from its Draco GLB meshes, every mesh in place. */
export interface LoadedUrdfModel {
  robot: URDFRobot;
  /** Mesh files the URDF's visuals named, each loaded. */
  meshes: number;
}

/**
 * Why a model did not assemble: the URDF itself failed (`meshes` 0), or
 * `failed` of its `meshes` files did not load.
 */
export class UrdfModelError extends Error {
  constructor(
    readonly failed: number,
    readonly meshes: number,
  ) {
    super(meshes === 0 ? 'the URDF did not load' : `${failed} of ${meshes} meshes did not load`);
    this.name = 'UrdfModelError';
  }
}

/**
 * Loads any URDF whose visuals name GLB+Draco meshes beside it and resolves
 * once every mesh has settled, with the joints at the URDF's zero pose.
 * Unlike loadSo101Robot there is no stand-in: a URDF or mesh that fails
 * rejects with UrdfModelError, so a viewer of a maker's files never shows
 * a partial or substitute model. `onProgress` gets the meshes settled and
 * the meshes the URDF has named so far.
 */
export function loadUrdfModel(
  url: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<LoadedUrdfModel> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let meshes = 0;
    let failed = 0;
    let robot: URDFRobot | null = null;

    const manager = new LoadingManager();
    const loader = new URDFLoader(manager);
    const loadGlb = createGlbMeshLoader(() => {
      failed += 1;
    });
    let settledMeshes = 0;
    loader.loadMeshCb = (meshUrl, meshManager, material, onComplete) => {
      meshes += 1;
      onProgress?.(settledMeshes, meshes);
      loadGlb(meshUrl, meshManager, material, (mesh, error) => {
        settledMeshes += 1;
        onProgress?.(settledMeshes, meshes);
        onComplete(mesh, error);
      });
    };

    // As in loadSo101Robot: urdf-loader's onLoad fires once the URDF parses,
    // the manager's once every mesh has settled.
    manager.onLoad = () => {
      if (settled) return;
      settled = true;
      if (robot && failed === 0) resolve({ robot, meshes });
      else reject(new UrdfModelError(failed, robot ? meshes : 0));
    };

    loader.load(
      url,
      (loaded) => {
        robot = loaded;
      },
      undefined,
      () => {
        if (settled) return;
        settled = true;
        reject(new UrdfModelError(0, 0));
      },
    );
  });
}
